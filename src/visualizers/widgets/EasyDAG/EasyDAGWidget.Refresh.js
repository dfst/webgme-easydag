/*globals define, _*/

define([
    './lib/dagre.min'
], function(
    dagre
) {

    'use strict';
    
    var TOP_LEFT_MIN_MARGIN = 20,
        MARGIN = 25;

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

        this.queueFns([
            this.calculatePositions.bind(this),
            this.updateTranslation.bind(this),
            this.refreshItems.bind(this),
            this.refreshConnections.bind(this),
            this.selectionManager.redraw.bind(this.selectionManager),
            this.updateContainerWidth.bind(this),
            this.refreshExtras.bind(this)
        ]);
    };

    EasyDAGWidgetRefresher.prototype.queueFns = function (fns) {
        for (var i = 0; i < fns.length; i++) {
            setTimeout(fns[i], 0);
        }
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
        this._logger.debug(`Refreshing ${connIds.length} connections`);
        for (var i = connIds.length; i--;) {
            this.graph.edge(connIds[i]).redraw();
        }
    };

    EasyDAGWidgetRefresher.prototype.refreshItems = function () {
        // Remove old items
        var nodeIds = _.difference(this.graph.nodes(), Object.keys(this.items));
        this._logger.info(`Removing ${nodeIds.length} nodes`);
        nodeIds.forEach(nodeId => {
            this.graph.node(nodeId).remove();
            this.graph.removeNode(nodeId);
        });

        // Redraw items
        nodeIds = Object.keys(this.items);
        this._logger.info(`Redrawing ${nodeIds.length} nodes`);
        for (var i = nodeIds.length; i--;) {
            this.items[nodeIds[i]].redraw(this._zoomValue);
        }

    };

    EasyDAGWidgetRefresher.prototype.updateTranslation = function () {
        var zoom = this._zoomValue || 1,
            shift = {};

        if (!this.centerContent) {
            return;
        }

        // Make sure it is shifted at least 20 px in each direction
        shift.x = Math.max(TOP_LEFT_MIN_MARGIN, this._getTranslation('x'));
        shift.y = Math.max(TOP_LEFT_MIN_MARGIN, this._getTranslation('y'));

        // Divide actual width by zoom value
        this._logger.debug(`Updating translation: ${shift.x}, ${shift.y}`);
        this.$svg
            .attr('transform', `translate(${shift.x},${shift.y}) scale(${zoom})`);
    };

    EasyDAGWidgetRefresher.prototype._getTranslation = function (axis) {
        var max = this.getMaxAlongAxis(axis) + MARGIN,
            axisSizeName = axis === 'x' ? 'width' : 'height',
            size,
            shift;

        if (this.isPureSvg) {
            size = this.$el.node().getBBox()[axisSizeName];
        } else {
            size = this.$el[axisSizeName]();
        }
        shift = Math.max(0, (size - max)/2);
        return shift < Infinity ? shift : 0;
    };

    EasyDAGWidgetRefresher.prototype._getMaxAlongAxis =
    EasyDAGWidgetRefresher.prototype.getMaxAlongAxis = function (axis) {
        var self = this,
            zoom = this._zoomValue || 1,
            axisSizeName = axis === 'x' ? 'width' : 'height',
            rightEdges;  // if axis === 'y', these are the bottom edges

        rightEdges = this.graph.nodes()
            .map(function(id) {  // get each node from the id
                return self.graph.node(id);
            })
            .map(function(node) {  // get the right edge (left + width)
                return (node[axis] + zoom*node[axisSizeName]) || 0;
            });

        if (rightEdges.length) {
            return Math.max.apply(null, rightEdges);
        } else {
            return 0;
        }
    };

    EasyDAGWidgetRefresher.prototype._getMinAlongAxis = function (axis) {
        var self = this,
            nodes;

        nodes = this.graph.nodes().map(function(id) {
            return self.graph.node(id);
        });
        return Math.min.apply(null, nodes.map(node => node[axis]));
    };

    EasyDAGWidgetRefresher.prototype.updateContainerWidth = function () {
        this.width = this.getMaxAlongAxis('x') + MARGIN;
        this.height = this.getMaxAlongAxis('y') + MARGIN;

        this._logger.debug(`Updating width, height to ${this.width}, ${this.height}`);
        this._$svg.attr('width', this.width);
        this._$svg.attr('height', this.height);
    };

    return EasyDAGWidgetRefresher;
});
