
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
        var connIds,
            nodeIds,
            conn,
            i;

        if (!this.active) {
            return;
        }

        // WRITE UPDATES
        // Update the locations of all the nodes
        assert(this.graph.nodes().indexOf('undefined') === -1);
        dagre.layout(this.graph);
        this.updateTranslation();

        // Remove old items
        nodeIds = _.difference(this.graph.nodes(), Object.keys(this.items));
        nodeIds.forEach(nodeId => {
            this.graph.node(nodeId).remove();
            this.graph.removeNode(nodeId);
        });

        // Remove old connections
        //connIds = _.difference(Object.keys(this.connections), this.graph.edges());
        //connIds.forEach(connId => {
            //this.connections[connId].remove();
            //delete this.connections[connId];
        //});

        // Redraw items
        nodeIds = Object.keys(this.items);
        for (i = nodeIds.length; i--;) {
            this.items[nodeIds[i]].redraw();
        }

        // Draw new connections
        connIds = this.graph.edges();
        for (i = connIds.length; i--;) {
            conn = this.graph.edge(connIds[i]);
            conn.redraw();
        }

        this.selectionManager.redraw();
        this.updateCreateButtons();
        this.updateContainerWidth();
        this.updateEmptyMsg();

        // READ UPDATES
        //nodeIds = Object.keys(this.items);
        //nodeIds.forEach(nodeId => {
            //this.graph.node(nodeId).updateDimensions();
        //});

    };

    EasyDAGWidgetRefresher.prototype.updateTranslation = function () {
        var self = this,
            shift = {
                x: this._getTranslation('x'),
                y: this._getTranslation('y')
            };

        // Make sure it is shifted at least 20 px in each direction
        shift.x = Math.max(TOP_LEFT_MIN_MARGIN, shift.x);
        shift.y = Math.max(TOP_LEFT_MIN_MARGIN, shift.y);

        this.$svg
            .attr('transform', `translate(${shift.x},${shift.y})`);
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
            axisSizeName = axis === 'x' ? 'width' : 'height',
            MARGIN = 25,
            nodes;

        nodes = this.graph.nodes().map(function(id) {
            return self.graph.node(id);
        });
        return Math.max.apply(null, nodes.map(function(node) {
            return node[axis] + node[axisSizeName] + MARGIN;
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
