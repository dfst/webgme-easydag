/*globals define, _*/

define([
    './lib/dagre.min',
    'common/util/assert'
], function(
    dagre,
    assert
) {

    'use strict';
    
    var TOP_LEFT_MIN_MARGIN = 20;
    var EasyDAGWidgetRefresher = function() {
    };

    // This function redraws the UI based off the in memory DAG
    // TODO: Replace this with a virtual DOM implementation
    EasyDAGWidgetRefresher.prototype.refreshScreen = function () {
        if (!this.active) {
            return;
        }

        // WRITE UPDATES
        // Update the locations of all the nodes
        this.calculatePositions();
        this.updateTranslation();

        this.refreshItems();
        this.refreshConnections();

        this.selectionManager.redraw();
        this.updateContainerWidth();
        this.refreshExtras();

        // READ UPDATES
        //nodeIds = Object.keys(this.items);
        //nodeIds.forEach(nodeId => {
            //this.graph.node(nodeId).updateDimensions();
        //});

    };

    EasyDAGWidgetRefresher.prototype.calculatePositions = function () {
        dagre.layout(this.graph);
    };

    EasyDAGWidgetRefresher.prototype.refreshExtras = function () {
        this.updateCreateButtons();
        this.updateEmptyMsg();
    };

    EasyDAGWidgetRefresher.prototype.refreshConnections = function () {
        var connIds = this.graph.edges();
        for (var i = connIds.length; i--;) {
            this.graph.edge(connIds[i]).redraw();
        }
    };

    EasyDAGWidgetRefresher.prototype.refreshItems = function () {
        // Remove old items
        var nodeIds = _.difference(this.graph.nodes(), Object.keys(this.items));
        nodeIds.forEach(nodeId => {
            this.graph.node(nodeId).remove();
            this.graph.removeNode(nodeId);
        });

        // Redraw items
        nodeIds = Object.keys(this.items);
        for (var i = nodeIds.length; i--;) {
            this.items[nodeIds[i]].redraw(this._zoomValue);
        }

    };

    EasyDAGWidgetRefresher.prototype.updateTranslation = function () {
        var zoom = this._zoomValue || 1,
            shift = {
                x: this._getTranslation('x'),
                y: this._getTranslation('y')
            };

        // Make sure it is shifted at least 20 px in each direction
        shift.x = Math.max(TOP_LEFT_MIN_MARGIN, shift.x);
        shift.y = Math.max(TOP_LEFT_MIN_MARGIN, shift.y);

        // Divide actual width by zoom value
        this.$svg
            .attr('transform', `translate(${shift.x},${shift.y}) scale(${zoom})`);
    };

    EasyDAGWidgetRefresher.prototype._getTranslation = function (axis) {
        var max = this._getMaxAlongAxis(axis),
            axisSizeName = axis === 'x' ? 'width' : 'height',
            size,
            shift;

        size = this.$el[axisSizeName]();
        shift = Math.max(0, (size - max)/2);
        return shift < Infinity ? shift : 0;
    };

    EasyDAGWidgetRefresher.prototype._getMaxAlongAxis = function (axis) {
        var self = this,
            zoom = this._zoomValue || 1,
            axisSizeName = axis === 'x' ? 'width' : 'height',
            MARGIN = 25,
            nodes;

        nodes = this.graph.nodes().map(function(id) {
            return self.graph.node(id);
        });
        return Math.max.apply(null, nodes.map(function(node) {
            return node[axis] + zoom*node[axisSizeName] + MARGIN;
        }));
    };

    EasyDAGWidgetRefresher.prototype.updateContainerWidth = function () {
        this.width = Math.max(this.$el.width(), this._getMaxAlongAxis('x'));
        this.height = Math.max(this.$el.height(), this._getMaxAlongAxis('y'));

        this._$svg.attr('width', this.width);
        this._$svg.attr('height', this.height);
    };

    return EasyDAGWidgetRefresher;
});
