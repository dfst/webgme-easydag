define([
    './AddNodeDialog'
], function(
    AddNodeDialog
) {
    'use strict';

    var EasyDAGWidgetActions = function() {
    };

    EasyDAGWidgetActions.prototype.onCreateInitialNode = function() {
        var initialNodes = this.getValidInitialNodes(),
            initialNode = initialNodes[0];

        if (initialNodes.length > 1) {
            // Create the modal view with all possible subsequent nodes
            var dialog = new AddNodeDialog(),
                title = 'Which node would you like to create?';

            dialog.show(title, initialNodes.map(node => {
                return {node};
            }));
            dialog.onSelect = nodeInfo => {
                if (nodeInfo) {
                    this.createNode(nodeInfo.node.id);
                }
            };
        } else {
            this.createNode(initialNode.id);
        }
    };

    EasyDAGWidgetActions.prototype.onAddButtonClicked = function(item) {
        var successorPairs = this.getValidSuccessorNodes(item.id),
            successor = successorPairs[0];

        if (successorPairs.length > 1) {
            // Create the modal view with all possible subsequent nodes
            var dialog = new AddNodeDialog(),
                title = this._getAddSuccessorTitle(item);

            dialog.show(title, successorPairs);
            dialog.onSelect = pair => {
                if (pair) {
                    this.createConnectedNode(item.id, pair.conn.id, pair.node.id);
                }
            };
        } else {
            this.createConnectedNode(item.id, successor.conn.id, successor.node.id);
        }
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

    EasyDAGWidgetActions.prototype.moveItem = function(item, dstItem) {
        console.log('Moving ' + item.name + ' to ' + dstItem.name);
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

    EasyDAGWidgetActions.prototype.removeItem = function(item) {
        // Remove the given item and all subsequent items
        this.removeSubtreeAt(item.id);
    };

    return EasyDAGWidgetActions;
});
