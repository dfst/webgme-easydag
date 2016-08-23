/*globals define, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Thu Nov 26 2015 06:07:08 GMT-0600 (CST).
 */

define([
    'js/Constants',
    'js/Utils/GMEConcepts',
    './EasyDAGControl.WidgetEventHandlers',
    'js/NodePropertyNames',
    'js/RegistryKeys'
], function (
    CONSTANTS,
    GMEConcepts,
    EasyDAGControlEventHandlers,
    nodePropertyNames,
    REGISTRY_KEYS
) {

    'use strict';

    var WIDGET_NAME = 'EasyDAG';
    var EasyDAGControl = function (options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._selfPatterns = {};
        this._currentNodeId = null;
        this._currentNodeParentId = undefined;
        this._embedded = !!options.embedded;

        this._initWidgetEventHandlers();

        this._logger.debug('ctor finished');
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    EasyDAGControl.prototype.DEFAULT_DECORATOR = 'EllipseDecorator';
    EasyDAGControl.prototype.TERRITORY_RULE = {children: 1};
    EasyDAGControl.prototype.selectedObjectChanged = function (nodeId) {
        var parentId,
            node,
            name,
            self = this;

        self._logger.debug('activeObject nodeId \'' + nodeId + '\'');

        // Remove current territory patterns
        if (self._currentNodeId) {
            self._client.removeUI(self._territoryId);
            self._territoryId = null;
            delete self._selfPatterns[self._currentNodeId];
        }

        self._currentNodeId = nodeId;
        self._currentNodeParentId = undefined;

        if (self._currentNodeId || self._currentNodeId === CONSTANTS.PROJECT_ROOT_ID) {
            node = self._client.getNode(nodeId);
            parentId = node.getParentId();
            name = node.getAttribute('name');

            // Put new node's info into territory rules
            self._selfPatterns[nodeId] = {children: 0};

            self._widget.setTitle(name.toUpperCase());

            if (parentId || parentId === CONSTANTS.PROJECT_ROOT_ID) {
                self.$btnModelHierarchyUp.show();
            } else {
                self.$btnModelHierarchyUp.hide();
            }

            self._currentNodeParentId = parentId;

            self._territoryId = self._client.addUI(self, function (events) {
                setTimeout(self._eventCallback.bind(self), 0, events);
            });

            // Update the territory
            self._client.updateTerritory(self._territoryId, self._selfPatterns);

            self._selfPatterns[nodeId] = self.TERRITORY_RULE;
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
        }
    };

    EasyDAGControl.prototype._getNodeDecorator = function (nodeObj) {
        var decoratorManager = this._client.decoratorManager,
            decorator,
            decoratorClass;

        decorator = nodeObj.getRegistry(REGISTRY_KEYS.DECORATOR);
        decoratorClass = decoratorManager.getDecoratorForWidget(decorator, WIDGET_NAME);
        if (!decoratorClass) {
            decoratorClass = decoratorManager.getDecoratorForWidget(this.DEFAULT_DECORATOR, WIDGET_NAME);
        }
        return decoratorClass;
    };

    // This next function retrieves the relevant node information for the widget
    EasyDAGControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor,
            baseNode;

        if (nodeObj) {
            objDescriptor = {
                id: nodeObj.getId(),
                name: undefined,
                parentId: nodeObj.getParentId(),
                isConnection: GMEConcepts.isConnection(nodeId),
                attributes: {},
                pointers: {},
                baseName: null
            };

            objDescriptor.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            baseNode = this._client.getNode(nodeObj.getBaseId());
            if (baseNode) {
                objDescriptor.baseName = baseNode.getAttribute(nodePropertyNames.Attributes.name);
            }

            // Add the attributes
            nodeObj.getValidAttributeNames()
                .forEach((name) => {
                    var meta = this._client.getAttributeSchema(nodeId, name),
                        type;

                    if (meta) {  // skip meta-invalid properties
                        type = meta.type;
                        objDescriptor.attributes[name] = {
                            name: name,
                            type: type,
                            values: meta.enum,
                            value: nodeObj.getAttribute(name)
                        };
                    }
                });

            // Add the pointers
            nodeObj.getValidPointerNames()
                .filter(name => name !== 'base')
                .forEach(name => objDescriptor.pointers[name] = nodeObj.getPointerId(name));

            // If it is a connection, store the src, dst pointer
            if (objDescriptor.isConnection) {
                ['src', 'dst'].forEach(function(ptr) {
                    objDescriptor[ptr] = nodeObj.getPointer(ptr).to;
                });
            } else {  // Otherwise, store the decorator info
                objDescriptor.Decorator = this._getNodeDecorator(nodeObj);
                objDescriptor.control = this;
            }
        }

        return objDescriptor;
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    EasyDAGControl.prototype._eventCallback = function (events) {
        var event;

        // Remove any events about the current node
        this._logger.debug('_eventCallback \'' + i + '\' items');

        for (var i = 0; i < events.length; i++) {
            event = events[i];
            switch (event.etype) {

            case CONSTANTS.TERRITORY_EVENT_LOAD:
                if (event.eid === this._currentNodeId) {
                    this.onActiveNodeLoad(event.eid);
                } else {
                    this._onLoad(event.eid);
                }
                break;
            case CONSTANTS.TERRITORY_EVENT_UPDATE:
                if (event.eid === this._currentNodeId) {
                    this.onActiveNodeUpdate(event.eid);
                } else {
                    this._onUpdate(event.eid);
                }
                break;
            case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                if (event.eid === this._currentNodeId) {
                    this.onActiveNodeUnload(event.eid);
                } else {
                    this._onUnload(event.eid);
                }
                break;
            default:
                break;
            }
        }

        this._logger.debug('_eventCallback \'' + events.length + '\' items - DONE');
    };

    EasyDAGControl.prototype.onActiveNodeLoad =
    EasyDAGControl.prototype.onActiveNodeUnload =
    EasyDAGControl.prototype.onActiveNodeUpdate = function () {};

    // PUBLIC METHODS
    EasyDAGControl.prototype._onLoad = function (gmeId) {
        var description = this._getObjectDescriptor(gmeId);
        if (description.isConnection) {
            this._widget.addConnection(description);
        } else {
            this._widget.addNode(description);
        }
    };

    EasyDAGControl.prototype._onUpdate = function (gmeId) {
        var description = this._getObjectDescriptor(gmeId);
        if (description.isConnection) {
            this._widget.updateConnection(description);
        } else {
            this._widget.updateNode(description);
        }
    };

    EasyDAGControl.prototype._onUnload = function (gmeId) {
        this._widget.removeNode(gmeId);
    };

    EasyDAGControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (activeObjectId !== this._currentNodeId) {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    EasyDAGControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._territoryId = null;
        }
    };

    EasyDAGControl.prototype._attachClientEventListeners = function () {
        if (!this._embedded) {
            this._detachClientEventListeners();
            WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
        }
    };

    EasyDAGControl.prototype._detachClientEventListeners = function () {
        if (!this._embedded) {
            WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
        }
    };

    EasyDAGControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();
    };

    EasyDAGControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    EasyDAGControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    EasyDAGControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    EasyDAGControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    EasyDAGControl.prototype._initializeToolbar = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        this._toolbarItems.push(toolBar.addSeparator());

        /************** Go to hierarchical parent button ****************/
        this.$btnModelHierarchyUp = toolBar.addButton({
            title: 'Go to parent',
            icon: 'glyphicon glyphicon-circle-arrow-up',
            clickFn: function (/*data*/) {
                WebGMEGlobal.State.registerActiveObject(self._currentNodeParentId);
            }
        });
        this._toolbarItems.push(this.$btnModelHierarchyUp);
        this.$btnModelHierarchyUp.hide();

        /************** Checkbox example *******************/

        this._toolbarInitialized = true;
    };

    _.extend(
        EasyDAGControl.prototype,
        EasyDAGControlEventHandlers.prototype
    );

    return EasyDAGControl;
});
