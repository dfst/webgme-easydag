/*globals define*/
define([
    './AddNodeDialog'
], function(
    AddNodeDialog
) {
    'use strict';

    var EasyDAGWidgetActions = function() {
    };

    EasyDAGWidgetActions.prototype.onCreateInitialNode = function() {
        var initialNodes = this.getValidInitialNodes().map(node => {
            return {node};
        });
                
        this.promptNodeSelect(initialNodes, selected => {
            this.createNode(selected.node.id);
        });
    };

    EasyDAGWidgetActions.prototype.onAddButtonClicked = function(item) {
        var successorPairs = this.getValidSuccessorNodes(item.id);

        this.promptNodeSelect(successorPairs, node => {
            this.onAddItemSelected(item, node);
        });
    };

    EasyDAGWidgetActions.prototype.promptNodeSelect = function(nodes, callback) {
        // If only one, don't prompt
        if (nodes.length > 1) {
            // Create the modal view with all possible subsequent nodes
            var dialog = new AddNodeDialog();
            dialog.show(null, nodes);
            dialog.onSelect = pair => {
                if (pair) {
                    callback(pair);
                }
            };
        } else if (nodes[0]) {
            callback(nodes[0]);
        }
    };

    EasyDAGWidgetActions.prototype.selectTargetFor = function(itemId, ptr) {
        // Get valid targets for itemId, ptr
        var validTargets = this.getValidTargetsFor(itemId, ptr);

        // Show them to the user
        this.promptNodeSelect(validTargets, selected => {
            this.setPointerForNode(itemId, ptr, selected.node.id);
        });
    };

    EasyDAGWidgetActions.prototype.onAddItemSelected = function(item, selected) {
        this.createConnectedNode(item.id, selected.conn.id, selected.node.id);
    };

    EasyDAGWidgetActions.prototype._getAddSuccessorTitle = function(item) {
        return 'Select node to create after "' + item.name + '"';
    };

    // Move the given item to another item
    EasyDAGWidgetActions.prototype.showMoves = function(item) {
        var itemId = item.id,
            itemIds = Object.keys(this.items),
            targetIds = this.filterNodesForMove(itemId, itemIds);

        // Create the icons showing valid moves for the given item
        for (var i = targetIds.length; i--;) {
            this.items[targetIds[i]].showMoveReceiveBtn(this.moveItem.bind(this, item));
        }
    };

    EasyDAGWidgetActions.prototype.moveItem = function(/*item, dstItem*/) {
        this._hideMoveButtons();
        // Remove all incoming connections to "item" and add connection from dst to item
        // TODO
        // FIXME: Should I allow multiple incoming?
    };

    EasyDAGWidgetActions.prototype._hideMoveButtons = function() {
        var ids = Object.keys(this.items);
        for (var i = ids.length; i--;) {
            this.items[ids[i]].hideMoveReceiveBtn();
        }
    };

    EasyDAGWidgetActions.prototype.removeWithSuccessors =
    EasyDAGWidgetActions.prototype.removeItem = function(item) {
        // Remove the given item and all subsequent items
        this.removeSubtreeAt(item.id);
    };

    return EasyDAGWidgetActions;
});
