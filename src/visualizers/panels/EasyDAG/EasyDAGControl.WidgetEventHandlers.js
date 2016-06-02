/*globals define*/
define([
    './AttributeValidators'
], function(
    VALIDATORS
) {
    'use strict';
    
    var CONN_PTR = {
        START: 'src',
        END: 'dst'
    };

    var EasyDAGControlEventHandlers = function() {};

    EasyDAGControlEventHandlers.prototype._initWidgetEventHandlers = function() {
        this._widget.getValidSuccessorNodes = this._getValidSuccessorNodes.bind(this);
        this._widget.getValidInitialNodes = this._getValidInitialNodes.bind(this);
        this._widget.filterNodesForMove = this._filterNodesForMove.bind(this);
        this._widget.createConnectedNode = this._createConnectedNode.bind(this);
        this._widget.createNode = this._createNode.bind(this);
        this._widget.deleteNode = this._deleteNode.bind(this);
        this._widget.removeSubtreeAt = this._removeSubtreeAt.bind(this);
        this._widget.isValidTerminalNode = this._isValidTerminalNode.bind(this);

        // Decorator callbacks
        this._widget.setPointerForNode = this._setPointerForNode.bind(this);
        this._widget.getChildrenOf = this._getChildrenOf.bind(this);
        this._widget.getEnumValues = this._getEnumValues.bind(this);

        // Editing attributes
        this._widget.saveAttributeForNode = this._saveAttributeForNode.bind(this);

        // Additional Helpers
        this._widget.undo = this._undo.bind(this);
        this._widget.redo = this._redo.bind(this);
    };

    EasyDAGControlEventHandlers.prototype._undo = function() {
        this._client.undo(this._client.getActiveBranchName(), function(err) {
            if (err) {
                this._logger.error('Could not redo!: ', err);
            }
        });
    };

    EasyDAGControlEventHandlers.prototype._redo = function() {
        this._client.redo(this._client.getActiveBranchName(), function(err) {
            if (err) {
                this._logger.error('Could not redo!: ', err);
            }
        });
    };

    EasyDAGControlEventHandlers.prototype._getEnumValues = function(nodeId, attr) {
        return this._client.getAttributeSchema(nodeId, attr).enum || null;
    };

    EasyDAGControlEventHandlers.prototype._setPointerForNode = function(nodeId, ptr, tgt) {
        this._client.makePointer(nodeId, ptr, tgt);
    };

    EasyDAGControlEventHandlers.prototype._getChildrenOf = function(nodeId) {
        var parent = this._client.getNode(nodeId || '');

        // Get the children
        return parent.getChildrenIds().map(this._getObjectDescriptor.bind(this));
    };

    EasyDAGControlEventHandlers.prototype._saveAttributeForNode = function(nodeId, attr, value) {
        var schema = this._client.getAttributeSchema(nodeId, attr);

        // Check that the attribute is valid
        if (!VALIDATORS[schema.type] || VALIDATORS[schema.type](schema, value)) {
            this._client.setAttributes(nodeId, attr, value);
        } else {
            this._logger.error('Cannot set attribute "' + attr + '" to "' + value +'".');
        }
    };

    EasyDAGControlEventHandlers.prototype._createConnectedNode = function(srcId, connBaseId, dstBaseId) {
        var dstId,
            connId,
            parentId = this._currentNodeId;

        this._client.startTransaction();

        // create the nodes
        dstId = this._client.createChild({parentId, baseId: dstBaseId});
        this.onAddItem(dstId);
        connId = this._client.createChild({parentId, baseId: connBaseId});

        // connect the connection to the node
        this._client.makePointer(connId, CONN_PTR.START, srcId);
        this._client.makePointer(connId, CONN_PTR.END, dstId);

        this._client.completeTransaction();
        
    };

    EasyDAGControlEventHandlers.prototype._deleteNode = function(nodeId) {
        var node = this._client.getNode(nodeId),
            children = this._client.getNode(this._currentNodeId).getChildrenIds(),
            msg = `Deleting ${node}`,
            nodeIds,
            ptr;

        // Also remove any incoming/outgoing connections
        nodeIds = children.filter(id => {
            node = this._client.getNode(id);

            // Return true if it has either a src or dst to nodeId
            return ['src', 'dst']
                .reduce((has, ptrName) => {
                    ptr = node.getPointer(ptrName);
                    return has || (ptr.to && this._getSiblingContaining(ptr.to) === nodeId);
                }, false);
        });
        nodeIds.push(nodeId);

        this._client.startTransaction(msg);
        this._client.delMoreNodes(nodeIds);
        this._client.completeTransaction();
    };

    EasyDAGControlEventHandlers.prototype._createNode = function(baseId) {
        var parentId = this._currentNodeId,
            newNodeId = this._client.createChild({parentId, baseId});

        this.onAddItem(newNodeId);
        return newNodeId;
    };

    EasyDAGControlEventHandlers.prototype.onAddItem = function(/*baseId*/) {
        // nop
    };

    EasyDAGControlEventHandlers.prototype._getValidInitialNodes = function() {
        // Find nodes that only have outgoing connections
        var allIds = [],
            allConnIds,
            validInitialNodes,
            dsts,
            i;

        this._client.getChildrenMeta(this._currentNodeId).items
            // Get all descendents
            .map(info => this._getAllDescendentIds(info.id))
            .reduce((prev, curr) => prev.concat(curr))

            // Add the child to the validChildren dictionary
            .forEach(id => allIds.push(id));

        validInitialNodes = {};
        allConnIds = [];

        for (i = allIds.length; i--;) {
            if (this._client.getNode(allIds[i]).isConnection()) {
                allConnIds.push(allIds[i]);
            } else {
                validInitialNodes[allIds[i]] = true;
            }
        }

        // For each connection, get the destination nodes and remove
        // them from the potential initial nodes
        for (i = allConnIds.length; i--;) {
            dsts = this._client.getPointerMeta(allConnIds[i], CONN_PTR.END).items
                .map(item => item.id)
                // Get the descendents
                .map(id => this._getAllDescendentIds(id))
                .reduce((prev, curr) => prev.concat(curr));

            for (var j = dsts.length; j--;) {
                delete validInitialNodes[dsts[j]];
            }
        }

        return Object.keys(validInitialNodes)
            // Remove abstract nodes
            .filter(nodeId => !this._client.getNode(nodeId).isAbstract())
            .map(nodeId => this._getObjectDescriptor(nodeId));
    };

    EasyDAGControlEventHandlers.prototype._getAllValidChildren = function(nodeId) {
        return this._client.getChildrenMeta(nodeId).items
            // Get all descendents
            .map(info => this._getAllDescendentIds(info.id))
            .reduce((prev, curr) => prev.concat(curr));
    };

    // Get the valid nodes that can follow the given node
    EasyDAGControlEventHandlers.prototype._getValidSuccessorNodes = function(nodeId) {
        // Get all connections that can be contained in the parent node
        var self = this,
            node = this._client.getNode(nodeId),
            ancestors = this._getAncestorNodeIds(nodeId),
            dstIds,
            items,
            dstDict,
            validChildren,
            allConnIds,
            connIds,
            descs;

        validChildren = {};
        this._getAllValidChildren(node.getParentId())
            // Add the child to the validChildren dictionary
            .forEach(id => validChildren[id] = true);

        allConnIds = Object.keys(validChildren)
            .filter(id => self._client.getNode(id).isConnection());

        // Get the connections that have this nodeId as a valid source
        connIds = allConnIds.filter(connId => {
            // Check if the connection can start at the given node
            return self._client.getPointerMeta(connId, CONN_PTR.START).items
                .map(item => item.id)
                .reduce((startsAtNode, id) => {
                    return startsAtNode || ancestors[id];
                }, false);
        });

        // Get all (unique) valid destinations of these connections
        dstDict = {};
        for (var i = connIds.length; i--;) {
            items = self._client.getPointerMeta(connIds[i], CONN_PTR.END).items;
            for (var j = items.length; j--;) {
                // Get all descendents
                descs = this._getAllDescendentIds(items[j].id);
                dstDict[items[j].id] = connIds[i];
                for (var k = descs.length; k--;) {
                    dstDict[descs[k]] = connIds[i];
                }
            }
        }

        // Remove all possibilities that cannot be contained in the parent
        dstIds = Object.keys(dstDict)
            .map(dstId => {
                return {nodeId: dstId, connId: dstDict[dstId]};
            })
            // Remove nodes that can't be created in the activeNode
            .filter(pair => validChildren[pair.nodeId])
            // Remove abstract nodes
            .filter(pair => !this._client.getNode(pair.nodeId).isAbstract());

        return dstIds.map(pair => {
            return {
                node: this._getObjectDescriptor(pair.nodeId),
                conn: this._getObjectDescriptor(pair.connId)
            };
        });
    };

    EasyDAGControlEventHandlers.prototype._getAllDescendentIds = function(nodeId) {
        var metaNodes = this._client.getAllMetaNodes(),
            results = {},
            nodeIds = [nodeId],
            next;

        //results[nodeId] = true;
        while (nodeIds.length) {
            next = [];
            for (var i = nodeIds.length; i--;) {
                // Add the nodeId to the list of results
                results[nodeIds[i]] = true;

                // Get all children of the given node
                next = next.concat(metaNodes
                    .filter(node => node.getBaseId() === nodeIds[i])
                    .map(node => node.getId())
                );
            }
            nodeIds = next;
        }

        return Object.keys(results);
    };

    EasyDAGControlEventHandlers.prototype._getAncestorNodeIds = function(nodeId) {
        var ancestors = {},
            node;

        while (nodeId) {
            ancestors[nodeId] = true;
            node = this._client.getNode(nodeId);
            nodeId = node.getBaseId();
        }
        return ancestors;
    };

    EasyDAGControlEventHandlers.prototype._filterNodesForMove = function(node, nodes) {
        // Remove nodes that the given node cannot move to
        // TODO
        return nodes.filter(n => n !== node);
    };

    EasyDAGControlEventHandlers.prototype._removeSubtreeAt = function(nodeId) {
        var currentNode = this._client.getNode(this._currentNodeId),
            children = currentNode.getChildrenIds().map(child => this._client.getNode(child)),
            nodeIds = this.getSuccessors(children, nodeId),
            connIds;

        // Add all connections to the nodeId (or contained children)
        connIds = children.filter(child => child.isConnection())
            .filter(child => child.getPointer('dst').to.indexOf(nodeId) === 0)
            .map(conn => conn.getId());

        // Remove all of the nodeIds
        this._client.delMoreNodes(nodeIds.concat(connIds));

    };

    EasyDAGControlEventHandlers.prototype._getSiblingContaining = function(id) {
        var node = this._client.getNode(id);

        while (node.getParentId() !== this._currentNodeId) {
            id = node.getParentId();
            node = this._client.getNode(id);
        }

        return id;
    };

    // FIXME: Don't return nodes that have connections from other
    // parts of the graph
    EasyDAGControlEventHandlers.prototype.getSuccessors = function(nodes, nodeId) {
        return this._getSomeCessor(true, nodes, nodeId);
    };

    EasyDAGControlEventHandlers.prototype.getPredecessors = function(nodes, nodeId) {
        return this._getSomeCessor(false, nodes, nodeId);
    };

    EasyDAGControlEventHandlers.prototype._getSomeCessor = function(fwrd, nodes, nodeId) {
        // Get connections with this item as a 'src'
        var conns = [],
            connIds,
            dstIds,
            remainingNodes = [],
            getMoreCessors,
            ptr;

        ptr = fwrd ? 'src' : 'dst';
        for (var i = nodes.length; i--;) {
            if (nodes[i].isConnection() && (nodes[i].getPointer(ptr).to.indexOf(nodeId) === 0)) {
                conns.push(nodes[i]);
            } else {
                remainingNodes.push(nodes[i]);
            }
        }

        getMoreCessors = this._getSomeCessor.bind(this, fwrd, remainingNodes);
        connIds = conns.map(conn => conn.getId());

        // Get the dst of each connection
        // Make sure it is the sibling container
        ptr = fwrd ? 'dst' : 'src';
        dstIds = conns
            .map(conn => conn.getPointer(ptr).to)
            .map(dstId => this._getSiblingContaining(dstId));

        // Return the nodeId, connectionIds and the subtrees at the dstIds
        connIds.push(nodeId);
        return connIds
            .concat(dstIds.map(getMoreCessors)
            .reduce((l1, l2) => l1.concat(l2), []));
    };

    EasyDAGControlEventHandlers.prototype._isValidTerminalNode = function(nodeId) {
        // Check if the node can have outgoing connections
        return this._getValidSuccessorNodes(nodeId).length === 0;
    };

    return EasyDAGControlEventHandlers;
});
