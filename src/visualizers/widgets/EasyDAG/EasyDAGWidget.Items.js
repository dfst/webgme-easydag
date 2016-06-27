define([
    './Buttons',
    'd3'
], function(
    Buttons
) {

    var EasyDAGWidgetItems = function() {
        this.$updateButtons = this.$svg.append('g')
            .attr('id', 'update-buttons');
        this.items = {};
        this.successors = {};
        this._buttons = [];
    };

    EasyDAGWidgetItems.prototype.moveItem = function(desc) {
        this.items[desc.id].transition()
            .duration(200)
            .attr('cx', desc.x)
            .attr('cy', desc.y);
    };

    EasyDAGWidgetItems.prototype.updateCreateButtons = function () {
        var nodeIds = Object.keys(this.items);

        // FIXME: Should the buttons move, too?
        // Or only refresh the ones that have changed?
        this._clearButtons();

        // Add the buttons for creating a new layer (similar to the selection)
        for (var i = nodeIds.length; i--;) {
            // Check if it is currently a terminal node
            if (!this.successors[nodeIds[i]].length && 
                !this.isValidTerminalNode(nodeIds[i]) &&
                !this.selectionManager.isSelected(nodeIds[i])) {

                // Add create button
                this._addCreateButton(nodeIds[i]);
            }
        }
    };

    EasyDAGWidgetItems.prototype._clearButtons = function() {
        this._buttons.forEach(btn => btn.remove());
        this._buttons = [];
    };

    EasyDAGWidgetItems.prototype._addCreateButton = function (id) {
        var item = this.items[id],
            padding = 5,
            btn;

        btn = new Buttons.Add({
            context: this,
            $pEl: this.$updateButtons,
            item: item,
            x: item.x,
            y: item.y + item.height/2 + padding + Buttons.Add.SIZE
        });
        this._buttons.push(btn);
    };

    return EasyDAGWidgetItems;
});
