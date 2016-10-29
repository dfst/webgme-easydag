/*globals define*/
define([
    'js/Constants',
    'underscore',
    './AttributeValidators'
], function(
    CONSTANTS,
    _,
    VALIDATORS
) {
    'use strict';
    
    var CONN_PTR = {
        START: 'src',
        END: 'dst'
    };

    var EasyDAGControlEventHandlers = function() {};

    EasyDAGControlEventHandlers.prototype._initWidgetEventHandlers = function() {
        this._widget.getValidInitialNodes = this._getValidInitialNodes.bind(this);
        this._widget.filterNodesForMove = this._filterNodesForMove.bind(this);
        this._widget.createConnectedNode = this._createConnectedNode.bind(this);
        this._widget.createNode = this._createNode.bind(this);
        this._widget.deleteNode = this._deleteNode.bind(this);
        this._widget.removeSubtreeAt = this._removeSubtreeAt.bind(this);
        this._widget.isValidTerminalNode = this._isValidTerminalNode.bind(this);
        this._widget.getValidTargetsFor = this._getValidTargetsFor.bind(this);

        // Decorator callbacks
        this._widget.setPointerForNode = this._setPointerForNode.bind(this);
        this._widget.getChildrenOf = this._getChildrenOf.bind(this);
        this._widget.getEnumValues = this._getEnumValues.bind(this);

        // Editing attributes
        this._widget.saveAttributeForNode = this._saveAttributeForNode.bind(this);

        // Additional Helpers
        this._widget.undo = this._undo.bind(this);
        this._widget.redo = this._redo.bind(this);

        // Connecting
        this._widget.getValidSuccessorNodes =
        this._widget.getValidSuccessors = this.getValidSuccessors.bind(this);
        this._widget.getValidPredecessors = this.getValidPredecessors.bind(this);
        this._widget.getValidExistingSuccessors = this.getValidExistingSuccessors.bind(this);
        this._widget.getValidExistingPredecessors = this.getValidExistingPredecessors.bind(this);
        this._widget.connectNodes = this._connectNodes.bind(this);
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
        var node = this._client.getNode(nodeId);
        return node.getAttributeMeta(attr).enum || null;
    };

    EasyDAGControlEventHandlers.prototype._setPointerForNode = function(nodeId, ptr, tgt) {
        this._client.setPointer(nodeId, ptr, tgt);
    };

    EasyDAGControlEventHandlers.prototype._getChildrenOf = function(nodeId) {
        var parent = this._client.getNode(nodeId || '');

        // Get the children
        return parent.getChildrenIds().map(this._getObjectDescriptor.bind(this));
    };

    EasyDAGControlEventHandlers.prototype._saveAttributeForNode = function(nodeId, attr, value) {
        var node = this._client.getNode(nodeId),
            schema = node.getAttributeMeta(attr);

        // Check that the attribute is valid
        if (!VALIDATORS[schema.type] || VALIDATORS[schema.type](schema, value)) {
            this._client.setAttribute(nodeId, attr, value);
        } else {
            this._logger.error('Cannot set attribute "' + attr + '" to "' + value +'".');
        }
    };

    EasyDAGControlEventHandlers.prototype._createConnectedNode = function(srcId, connBaseId, dstBaseId, reverse) {
        var dstId,
            connId,
            parentId = this._currentNodeId,
            tmp;

        this._client.startTransaction();

        // create the nodes
        dstId = this._client.createNode({parentId, baseId: dstBaseId});
        this.onAddItem(dstId, dstBaseId, parentId);
        connId = this._client.createNode({parentId, baseId: connBaseId});

        // connect the connection to the node
        if (reverse) {
            tmp = srcId;
            srcId = dstId;
            dstId = tmp;
        }

        this._client.setPointer(connId, CONN_PTR.START, srcId);
        this._client.setPointer(connId, CONN_PTR.END, dstId);

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
        this._client.deleteNodes(nodeIds);
        this._client.completeTransaction();
    };

    EasyDAGControlEventHandlers.prototype._connectNodes = function(src, dst, baseId) {
        var srcName = this._client.getNode(src),
            dstName = this._client.getNode(dst),
            connId,
            msg = `Connecting ${srcName} (${src}) -> ${dstName} (${dst})`;

        this._client.startTransaction(msg);
        connId = this._client.createNode({
            parentId: this._currentNodeId,
            baseId: baseId
        });
        this._client.setPointer(connId, CONN_PTR.START, src);
        this._client.setPointer(connId, CONN_PTR.END, dst);
        this._client.completeTransaction();
    };

    EasyDAGControlEventHandlers.prototype._createNode = function(baseId) {
        var parentId = this._currentNodeId,
            newNodeId = this._client.createNode({parentId, baseId});

        this.onAddItem(newNodeId, baseId, parentId);
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
        var meta = this._client.getChildrenMeta(nodeId);
        return !meta ? [] : meta.items
            // Get all descendents
            .map(info => this._getAllDescendentIds(info.id))
            .reduce((prev, curr) => prev.concat(curr), []);
    };

    /* * * * * * * * Connecting Node Handlers * * * * * * * */
    // Get the valid nodes that can follow the given node
    EasyDAGControlEventHandlers.prototype.getValidExistingSuccessors = function(nodeId) {
        return this.getValidExistingCessors(nodeId, false);
    };

    EasyDAGControlEventHandlers.prototype.getValidExistingPredecessors = function(nodeId) {
        return this.getValidExistingCessors(nodeId, true);
    };

    EasyDAGControlEventHandlers.prototype.getValidExistingCessors = function(nodeId, reverse) {
        var node = this._client.getNode(this._currentNodeId),
            childrenIds = node.getChildrenIds(),
            children = childrenIds.map(id => this._client.getNode(id)),
            conns = children.filter(node => node.isConnection()),
            ptrName = !reverse ? 'src' : 'dst',
            otherPtr = !reverse ? 'dst' : 'src',
            alreadyConnected = [],
            nonCyclic,  // children that won't create a cycle
            ptr;

        if (reverse) {
            nonCyclic = _.difference(childrenIds, this.getSuccessors(children, nodeId));
        } else {
            nonCyclic = _.difference(childrenIds, this.getPredecessors(children, nodeId));
        }

        // Remove nodes that are already connected
        for (var i = conns.length; i--;) {
            if (conns[i].getPointer(ptrName).to === nodeId) {
                alreadyConnected.push(conns[i].getPointer(otherPtr).to);
            }
        }
        nonCyclic = _.difference(nonCyclic, alreadyConnected);

        // Remove children that can't be connected to
        return this.getConnectableNodes(nodeId, nonCyclic, reverse);
    };


    EasyDAGControlEventHandlers.prototype.getConnectableNodes = function(src, dsts, reverse) {
        var children = this._getAllValidChildren(this._currentNodeId),
            connIds = [],
            tgts = [],
            validDsts,
            typeId,
            node,
            i;

        for (i = children.length; i--;) {
            node = this._client.getNode(children[i]);
            if (node.isConnection()) {

                // If the conn can start at src, record it
                if (this.connCanStartAt(src, children[i], reverse)) {
                    connIds.push(children[i]);
                }
            }
        }

        // Store the valid target types for each connection
        validDsts = this.getDstToConnId(connIds);
        for (i = dsts.length; i--;) {
            node = this._client.getNode(dsts[i]);
            typeId = node.getMetaTypeId();
            if (src !== dsts[i] && validDsts[typeId]) {
                tgts.push({
                    node: this._getObjectDescriptor(dsts[i]),
                    conn: this._getObjectDescriptor(validDsts[typeId])
                });
            }
        }

        return tgts;
    };

    EasyDAGControlEventHandlers.prototype.connCanStartAt = function(src, connId, reverse) {
        var ptr = !reverse ? CONN_PTR.START : CONN_PTR.END,
            ancestors = this._getAncestorNodeIds(src);

        return this._client.getPointerMeta(connId, ptr).items
            .map(item => item.id)
            .reduce((startsAtNode, id) => {
                return startsAtNode || ancestors[id];
            }, false);
    };

    EasyDAGControlEventHandlers.prototype.getDstToConnId = function(connIds, reverse) {
        var dstDict = {},
            descs,
            items,
            ptr = reverse ? CONN_PTR.START : CONN_PTR.END;

        for (var i = connIds.length; i--;) {
            items = this._client.getPointerMeta(connIds[i], ptr).items;
            for (var j = items.length; j--;) {
                // Get all descendents
                descs = this._getAllDescendentIds(items[j].id);
                dstDict[items[j].id] = connIds[i];
                for (var k = descs.length; k--;) {
                    dstDict[descs[k]] = connIds[i];
                }
            }
        }
        return dstDict;
    };

    EasyDAGControlEventHandlers.prototype.getValidPredecessors = function(nodeId) {
        return this.getValidCessorNodes(nodeId, true);
    };

    EasyDAGControlEventHandlers.prototype.getValidSuccessors =
    EasyDAGControlEventHandlers.prototype._getValidSuccessorNodes = function(nodeId) {
        return this.getValidCessorNodes(nodeId);
    };

    EasyDAGControlEventHandlers.prototype.getValidCessorNodes = function(nodeId, rev) {
        // Get all connections that can be contained in the parent node
        var self = this,
            node = this._client.getNode(nodeId),
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
        connIds = allConnIds.filter(connId => this.connCanStartAt(nodeId, connId, rev));

        // Get all (unique) valid destinations of these connections
        dstDict = this.getDstToConnId(connIds, rev);

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

    /* * * * * * * * Connecting Node Handlers END * * * * * * * */

    EasyDAGControlEventHandlers.prototype._getAllDescendentIds = function(nodeId) {
        var metaNodes = this._client.getAllMetaNodes(),
            results = {},
            nodeIds = [nodeId],
            next;

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
            nodeId = node && node.getBaseId();
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
        this._client.deleteNodes(nodeIds.concat(connIds));

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
        var adjMatrix = {},
            succs = {},
            toPtr = fwrd ? 'dst' : 'src',
            fromPtr = !fwrd ? 'dst' : 'src',
            to,
            from,
            i,j;

        // For each connection, record it's src, target in the adjacency matrix/list
        for (i = nodes.length; i--;) {
            if (nodes[i].isConnection()) {
                to = this._getSiblingContaining(nodes[i].getPointer(toPtr).to);
                from = this._getSiblingContaining(nodes[i].getPointer(fromPtr).to);
                if (!adjMatrix[from]) {
                    adjMatrix[from] = {};
                }
                adjMatrix[from][to] = true;  // make sure there are no dups (use dict)
            }
        }

        // From the adjacency matrix, we will start w/ the given nodeId and get all the
        // "to" nodes from there...
        var current = [nodeId],
            neighbors,
            next;

        while (current.length) {
            next = [];
            for (i = current.length; i--;) {
                neighbors = Object.keys(adjMatrix[current[i]] || {});
                for (j = neighbors.length; j--;) {
                    if (!succs[neighbors[j]]) {
                        succs[neighbors[j]] = true;
                        next.push(neighbors[j]);
                    }
                }
            }
            current = next;
        }

        return Object.keys(succs);
    };

    EasyDAGControlEventHandlers.prototype._isValidTerminalNode = function(nodeId) {
        // Check if the node can have outgoing connections
        return this.getValidSuccessors(nodeId).length === 0;
    };

    EasyDAGControlEventHandlers.prototype._getTargetDirs = function(/*typeIds*/) {
        return [CONSTANTS.PROJECT_ROOT_ID];
    };

    EasyDAGControlEventHandlers.prototype._getValidTargetsFor = function(id, ptr, filter) {
        var typeIds = this._client.getPointerMeta(id, ptr).items.map(item => item.id),
            dirs = this._getTargetDirs(typeIds),
            items,
            validTargets = [];

        items = dirs.map(dir => this._client.getNode(dir).getChildrenIds())
            .reduce((l1, l2) => l1.concat(l2), [])
            .map(id => this._client.getNode(id));

        for (var i = items.length; i--;) {
            for (var t = typeIds.length; t--;) {
                if (items[i].isTypeOf(typeIds[t])) {
                    validTargets.push(items[i].getId());
                    break;
                }
            }
        }

        if (typeof filter === 'function') {
            validTargets = validTargets.filter(filter);
        }

        return validTargets.map(id => {
            return {
                node: this._getObjectDescriptor(id)
            };
        });
    };

    return EasyDAGControlEventHandlers;
});
