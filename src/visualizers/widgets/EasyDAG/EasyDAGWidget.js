/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Thu Nov 26 2015 06:07:08 GMT-0600 (CST).
 */

define([
    './lib/dagre.min',
    'common/util/assert',
    './EasyDAGWidget.Items',
    './EasyDAGWidget.Actions',
    './EasyDAGWidget.Refresh',
    './EasyDAGWidget.Initial',
    './KeyBindings',
    './DAGItem',
    './Connection',
    './SelectionManager',
    'js/Utils/ComponentSettings',
    'd3',
    'css!./styles/EasyDAGWidget.css',
    'css!./lib/opentip.css'
], function (
    dagre,
    assert,
    EasyDAGWidgetItems,
    EasyDAGWidgetActions,
    EasyDAGWidgetRefresher,
    EasyDAGWidgetInitial,
    KeyBindings,
    DAGItem,
    Connection,
    SelectionManager,
    ComponentSettings
) {
    'use strict';

    var EasyDAGWidget,
        WIDGET_CLASS = 'easy-dag',
        DEFAULT_SETTINGS = {
            hotkeys: 'none'
        };

    EasyDAGWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this.$el = container;
        this.$el.css({
            height: '100%',
            width: '100%'
        });
        this._config = DEFAULT_SETTINGS;
        ComponentSettings.resolveWithWebGMEGlobal(this._config, this.getComponentId());

        // Items
        this.items = {};
        this.itemCount = 0;

        this.connections = {};
        this.graph = new dagre.graphlib.Graph({
            multigraph: true
        });

        this.active = false;  // TODO: may be able to merge these
        this.needsUpdate = false;
        this._initialize();
        this.resetGraph();

        EasyDAGWidgetInitial.call(this);
        EasyDAGWidgetItems.call(this);
        KeyBindings.call(this);

        // Selection manager
        this.selectionManager = new this.SelectionManager(this);
        this._logger.debug('ctor finished');
    };

    EasyDAGWidget.prototype.ItemClass = DAGItem;
    EasyDAGWidget.prototype.Connection = Connection;
    EasyDAGWidget.prototype.SelectionManager = SelectionManager;
    EasyDAGWidget.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.$el.addClass(WIDGET_CLASS);
        this._$svg = d3.select(this.$el[0])
            .append('svg');

        this.$svg = this._$svg.append('g');
        this.$connContainer = this.$svg.append('g')
            .attr('id', 'connection-container');

        this.initSvgDefs();

        this.$el[0].style.position = 'absolute';
        this._$svg.style('position', 'relative');

        // Selection
        this.$el.on('click', event => {
            event.stopPropagation();
            event.preventDefault();
            this.selectionManager.deselect();
            this.refreshUI();
        });
        this.setupItemCallbacks();

        this.refreshUI();
    };

    EasyDAGWidget.prototype.getComponentId = function () {
        return 'EasyDAG';
    };

    EasyDAGWidget.prototype.initSvgDefs = function () {
        var defs = this._$svg.append("defs"),
            filter;

        // Connection markers
        defs.append("marker")
            .attr("id", "arrowhead")
            .attr("refX", 5.25)
            .attr("refY", 2)
            .attr("markerWidth", 6)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append("path")
                    .attr("d", "M 0,0 V 4 L6,2 Z");

        // highlighting
        filter = defs.append('filter')
            .attr('id', 'highlight')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');

        filter.append('feGaussianBlur')
            .attr('result', 'blurOut')
            .attr('in', 'SourceGraphic')
            .attr('stdDeviation', '9');

        filter.append('feBlend')
            .attr('in', 'SourceGraphic')
            .attr('in2', 'blurOut')
            .attr('mode', 'normal');
    };

    EasyDAGWidget.prototype.setupItemCallbacks = function () {
        var self = this,
            ItemClass = this.ItemClass;

        ItemClass.prototype.onUpdate = this.refreshUI.bind(this);
        ItemClass.prototype.selectTargetFor = function(itemId, ptr) {
            self.selectTargetFor(itemId, ptr);
        };

        ItemClass.prototype.saveAttribute = function(attr, value) {
            self.saveAttributeForNode(this.id, attr, value);
        };

        ItemClass.prototype.setPointer = function(ptr, nodeId) {
            return self.setPointerForNode(this.id, ptr, nodeId);
        };

        ItemClass.prototype.getChildrenOf = function(nodeId) {
            return self.getChildrenOf(nodeId);
        };

        ItemClass.prototype.getEnumValues = function(attr) {
            return self.getEnumValues(this.id, attr);
        };
    };

    EasyDAGWidget.prototype.resetGraph = function () {
        this.graph.setGraph({});
        assert(this.graph.nodes().indexOf('undefined') === -1);
        this.graph.setDefaultEdgeLabel(function() { return 'asdfas'; });
    };


    /* * * * * * * * Updating the In Memory DAG * * * * * * * */

    // Adding/Removing/Updating items
    EasyDAGWidget.prototype.addNode = function (desc) {
        var item;
        if (desc) {
            // Record the node info
            item = new this.ItemClass(this.$svg, desc);
            item.$el
                .on('click', event => {
                    d3.event.stopPropagation();
                    d3.event.preventDefault();
                    this.selectionManager.select(item);
                    this.refreshUI();
                });

            this.items[desc.id] = item;
            this.graph.setNode(item.id, item);
            this.itemCount++;
            this._empty = false;
            // TODO: Move this to EasyDAGWidget.Items onNodeAdded
            if (!this.successors[desc.id]) {
                this.successors[desc.id] = [];
            }
            this.refreshUI();
        }
    };

    EasyDAGWidget.prototype.addConnection = function (desc) {
        if (!desc.src || !desc.dst) {
            this._logger.warn(`Connection ${desc.id} will not be rendered - needs both src and dst!`);
            return;
        }
        var conn = new this.Connection(this.$connContainer, desc);
        this.graph.setEdge(desc.src, desc.dst, conn, desc.id);

        if (!this.successors[desc.src]) {
            this.successors[desc.src] = [];
        }
        this.successors[desc.src].push(desc.dst);

        this.connections[desc.id] = conn;
        this.itemCount++;
        this.refreshUI();
    };

    EasyDAGWidget.prototype.removeNode = function (gmeId) {
        if (this.items[gmeId]) {
            this._removeNode(gmeId);
        } else {
            this._removeConnection(gmeId);
        }
        this.itemCount--;
        this._empty = this.itemCount === 0;
    };

    EasyDAGWidget.prototype._removeNode = function (gmeId) {
        var desc = this.items[gmeId];
        delete this.items[gmeId];
        delete this.successors[gmeId];
        this.refreshUI();
    };

    EasyDAGWidget.prototype._removeConnection = function (gmeId) {
        // Delete the subtree rooted at the dst node
        var conn = this.connections[gmeId];
        if (!conn) {
            this._logger.warn(`Connection ${gmeId} doesn't exist. Perhaps it was malformed and not created`);
            return;
        }
        this.graph.removeEdge(conn.src, conn.dst, conn.id);

        // Update the successors list
        // (if the src node hasn't already been removed)
        if (this.successors[conn.src]) {
            var k = this.successors[conn.src].indexOf(conn.dst);
            this.successors[conn.src].splice(k, 1);
        }

        // FIXME: Move this to the refresh mixin
        this.connections[gmeId].remove();
        delete this.connections[gmeId];
        this.refreshUI();
    };

    EasyDAGWidget.prototype.updateNode = function (desc) {
        if (desc) {
            // Update the attributes displayed on the node
            this.items[desc.id].update(desc);
        }
        this.refreshUI();
    };

    EasyDAGWidget.prototype.updateConnection = function (desc) {
        // Change the tree structure
        var oldSrc = this.connections[desc.id].src,
            oldDst = this.connections[desc.id].dst;
        if (oldSrc !== desc.src || oldDst !== desc.dst) {
            // Remove a connection from oldSrc to oldDst
            // TODO
            //this.addConnection(desc);
            console.warn('Connection updates are not yet supported (', desc, ')');
            assert(this.graph.nodes().indexOf('undefined') === -1);
            this.refreshUI();
        }
        // FIXME
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    EasyDAGWidget.prototype.destroy = function () {
        // Call destroy on every item!
        var ids = Object.keys(this.items);
        for (var i = ids.length; i--;) {
            this.items[ids[i]].destroy();
        }
    };

    EasyDAGWidget.prototype.onActivate = function () {
        // Set focus
        this.$el.focus();
        this.active = true;
        this.enableKeyBindings();
        //this.refreshScreen();
    };

    EasyDAGWidget.prototype.onDeactivate = function () {
        // Set focus
        this.$el.blur();
        this.disableKeyBindings();
        this.active = false;
    };

    // Set up inheritance
    _.extend(
        EasyDAGWidget.prototype,
        EasyDAGWidgetItems.prototype,
        EasyDAGWidgetActions.prototype,
        EasyDAGWidgetRefresher.prototype,
        EasyDAGWidgetInitial.prototype,
        KeyBindings.prototype
    );

    EasyDAGWidget.prototype.onWidgetContainerResize =
    EasyDAGWidget.prototype.refreshUI = 
        _.debounce(EasyDAGWidget.prototype.refreshScreen, 50);


    return EasyDAGWidget;
});
