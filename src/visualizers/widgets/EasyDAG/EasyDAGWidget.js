/*globals define, _, d3, WebGMEGlobal*/
/*jshint browser: true*/

define([
    './lib/dagre.min',
    'common/util/assert',
    './EasyDAGWidget.Items',
    './EasyDAGWidget.Zoom',
    './EasyDAGWidget.Actions',
    './EasyDAGWidget.Refresh',
    './EasyDAGWidget.Initial',
    './KeyBindings',
    './DAGItem',
    './Connection',
    './SelectionManager',
    'js/Utils/ComponentSettings',
    'd3',
    'jquery-contextMenu',
    'css!./styles/EasyDAGWidget.css',
    'css!./lib/opentip.css'
], function (
    dagre,
    assert,
    EasyDAGWidgetItems,
    EasyDAGWidgetZoom,
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
        var opts, svg;

        this.centerContent = true;
        if (arguments.length === 1) {  // then passed an 'options' object
            opts = logger;
            logger = opts.logger;
            container = opts.container;
            svg = opts.svg;
            this.centerContent = opts.autoCenter !== undefined ? opts.autoCenter : true;
        }
        this._logger = logger.fork('Widget');
        this.isPureSvg = false;
        this._allExpanded = false;

        if (container) {
            this.$el = container;
            this._$svg = d3.select(this.$el[0])
                .append('svg');

            this.className = '.' + this.$el.attr('class').replace(/ /g, '.');
        } else if (svg) {  // svg
            this.isPureSvg = true;
            this.$el = svg;
            this._$svg = this.$el;
        } else {
            throw Error('Cannot create widget - no parent container (or svg)!');
        }
        var clazz = this.$el.attr('class');
        this.$el.attr('class', clazz + ' ' + WIDGET_CLASS);

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
        this.uuid = 'EasyDAG_' + Date.now();
        this.needsUpdate = false;
        this._connectionOptions = [];
        this._connecting = false;
        this._initialize();
        this.resetGraph();

        EasyDAGWidgetInitial.call(this);
        EasyDAGWidgetItems.call(this);
        EasyDAGWidgetZoom.call(this);
        KeyBindings.call(this);

        // Selection manager
        this.selectionManager = new this.SelectionManager(this);
        this._logger.debug('ctor finished (' + this.uuid + ')');
    };

    EasyDAGWidget.prototype.ItemClass = DAGItem;
    EasyDAGWidget.prototype.Connection = Connection;
    EasyDAGWidget.prototype.SelectionManager = SelectionManager;
    EasyDAGWidget.prototype._initialize = function () {
        this.refreshUI = _.debounce(() => this.refreshScreen(), 50);

        //set Widget title
        this.$svg = this._$svg.append('g');
        this.$connContainer = this.$svg.append('g')
            .attr('id', 'connection-container');

        this.$itemContainer = this.$svg.append('g')
            .attr('class', 'item-container');

        this.initSvgDefs();

        this._$svg.style('position', 'relative');

        // Selection
        this.$el.on('click', event => {
            event = event || d3.event;
            event.stopPropagation();
            event.preventDefault();
            this.onBackgroundClick(event);
        });
        this.setupItemCallbacks();

        this.refreshUI();
    };

    EasyDAGWidget.prototype.onBackgroundClick = function () {
        this.selectionManager.deselect();
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

        ItemClass.prototype.onUpdate = function() {
            this._widget.refreshUI();
        };
        ItemClass.prototype.selectTargetFor = function(itemId, ptr, filter) {
            this._widget.selectTargetFor(itemId, ptr, filter);
        };

        ItemClass.prototype.saveAttribute = function(attr, value) {
            this._widget.saveAttributeForNode(this.id, attr, value);
        };

        ItemClass.prototype.setPointer = function(ptr, nodeId) {
            return this._widget.setPointerForNode(this.id, ptr, nodeId);
        };

        ItemClass.prototype.getChildrenOf = function(nodeId) {
            return this._widget.getChildrenOf(nodeId);
        };

        ItemClass.prototype.getEnumValues = function(attr) {
            return this._widget.getEnumValues(this.id, attr);
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
            item = new this.ItemClass(this.$itemContainer, desc);
            item._widget = this;
            item.$el.on('click', () => {
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
            this._logger.debug(`Added node ${desc.id}. Refreshing UI`);
            this.refreshUI();
        }
    };

    EasyDAGWidget.prototype.addConnection = function (desc) {
        if (!desc.src || !desc.dst) {
            this._logger.warn(`Connection ${desc.id} will not be rendered - needs both src and dst!`);
            return;
        }
        var conn = new this.Connection(this.$connContainer, desc);
        conn.$el.on('click', () => {
            d3.event.stopPropagation();
            d3.event.preventDefault();
            this.selectionManager.select(conn);
            this.refreshUI();
        });

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
        this.refreshUI();
    };

    EasyDAGWidget.prototype._removeNode = function (gmeId) {
        var item = this.items[gmeId];
        delete this.items[gmeId];
        delete this.successors[gmeId];
        item.destroy();
        item.remove();
        this.graph.removeNode(gmeId);
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
    };

    EasyDAGWidget.prototype.updateNode = function (desc) {
        var item;
        if (desc) {
            item = this.items[desc.id];
            // Update the attributes displayed on the node
            // Check if the nodes have any changes
            if (!_.isEqual(item.desc, desc)) {
                item.update(desc);
                this.refreshUI();
            }
        }
    };

    EasyDAGWidget.prototype.updateConnection = function (desc) {
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
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    EasyDAGWidget.prototype.destroy = function () {
        // Call destroy on every item!
        var ids = Object.keys(this.items);
        for (var i = ids.length; i--;) {
            this.items[ids[i]].destroy();
        }
        $.contextMenu('destroy', this.className);
    };

    EasyDAGWidget.prototype.onActivate = function () {
        // Set focus
        if (this.$el.focus) {
            this.$el.focus();
        }
        this.active = true;
        this.enableKeyBindings();

        $.contextMenu('destroy', this.className);
        $.contextMenu({
            selector: this.className,
            build: $trigger => {
                return {
                    items: this.getMenuItemsFor($trigger)
                };
            }
        });
    };

    EasyDAGWidget.prototype.onDeactivate = function () {
        // Set focus
        if (this.$el.blur) {
            this.$el.blur();
        }
        this.disableKeyBindings();
        this.active = false;
        $.contextMenu('destroy', this.className);
    };

    // Set up inheritance
    _.extend(
        EasyDAGWidget.prototype,
        EasyDAGWidgetItems.prototype,
        EasyDAGWidgetActions.prototype,
        EasyDAGWidgetRefresher.prototype,
        EasyDAGWidgetInitial.prototype,
        EasyDAGWidgetZoom.prototype,
        KeyBindings.prototype
    );

    EasyDAGWidget.prototype.onWidgetContainerResize = function() {
        this.refreshUI();
    };

    /* * * * * * * * Connecting Nodes * * * * * * * */
    EasyDAGWidget.prototype.startConnectionFrom = function (item) {
        var targets = this.getValidExistingSuccessors(item.id);

        this.startConnection(item, targets);
    };

    EasyDAGWidget.prototype.startConnectionTo = function (item) {
        var targets = this.getValidExistingPredecessors(item.id);

        this.startConnection(item, targets, true);
    };

    EasyDAGWidget.prototype.startConnection = function (src, dsts, reverse) {
        var onClick = (clicked, connId) => {
                var srcId = !reverse ? src.id : clicked.id,
                    dstId = !reverse ? clicked.id : src.id;

                d3.event.stopPropagation();
                this.resetConnectingState();
                this.connectNodes(srcId, dstId, connId);
            },
            pairs = dsts.map(pair => [this.items[pair.node.id], pair.conn.id]);

        this.resetConnectingState();
        this._connectionOptions = pairs.map(pair => pair[0]);
        this._connectionSrc = src;
        pairs.map(pair => {
            var item = pair[0],
                connId = pair[1];

            return [
                item,
                connId,
                item.showIcon({
                    x: 0.5,
                    y: !reverse ? 0 : 1,
                    icon: 'chevron-bottom'
                })
            ];
        })
        .forEach(pair => pair[2].on('click', () => onClick(pair[0], pair[1])));

        // Create the 'create-new' icon for the src
        src.showIcon({
            x: 0.5,
            y: !reverse ? 1 : 0,
            icon: 'plus'
        }).on('click', () => {
            d3.event.stopPropagation();
            this.resetConnectingState();
            this.onAddButtonClicked(src, reverse);
        });

        this._connecting = true;
    };

    EasyDAGWidget.prototype.onDeselect = function(item) {
        if (item !== this._connectionSrc) {
            this.resetConnectingState();
        }

        if (this._allExpanded) {
            this.toggleAllExpanded();
        }
    };

    EasyDAGWidget.prototype.isConnecting = function() {
        return this._connecting;
    };

    EasyDAGWidget.prototype.onSelect =
    EasyDAGWidget.prototype.resetConnectingState = function () {
        this._connectionOptions.forEach(item => item.hideIcon());
        this._connectionOptions = [];

        if (this._connectionSrc) {
            this._connectionSrc.hideIcon();
            this._connectionSrc = null;
        }
        this._connecting = false;
    };

    EasyDAGWidget.prototype.getMenuItemsFor = function () {
        var menuItems = {
            toggleExpand: {
                name: this._allExpanded ? 'Condense all nodes' : 'Expand all nodes',
                callback: () => this.toggleAllExpanded()
            }
        };

        return menuItems;
    };

    EasyDAGWidget.prototype.toggleAllExpanded = function() {
        this.expandAllNodes(this._allExpanded);
        this._allExpanded = !this._allExpanded;
    };

    EasyDAGWidget.prototype.expandAllNodes = function(reverse) {
        var itemIds = Object.keys(this.items),
            method = reverse ? 'condense' : 'expand';

        for (var i = itemIds.length; i--;) {
            this.items[itemIds[i]][method]();
        }
        this.refreshUI();
    };
    return EasyDAGWidget;
});
