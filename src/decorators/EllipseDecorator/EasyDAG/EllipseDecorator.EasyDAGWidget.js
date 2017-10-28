/*globals define, _, WebGMEGlobal */
/*jshint browser: true, camelcase: false*/

define([
    'js/Constants',
    'js/NodePropertyNames',
    'widgets/EasyDAG/EasyDAGWidget.DecoratorBase',
    './AttributeField',
    './PointerField',
    'css!./EllipseDecorator.EasyDAGWidget.css',
    'd3'
], function (
    CONSTANTS,
    nodePropertyNames,
    DecoratorBase,
    AttributeField,
    PointerField
) {

    'use strict';

    var EllipseDecorator,
        DECORATOR_ID = 'EllipseDecorator',
        NAME_MARGIN = 15;

    EllipseDecorator = function (options) {
        var opts = _.extend({}, options);

        this.client = WebGMEGlobal.Client;
        this._node = opts.node;
        this.fields = [];
        this.nameWidth = null;
        this.fieldsWidth = null;
        this.className = this.className || options.className || 'layer-decorator';

        // Pointers
        this.pointers = {};
        this.pointersByTgt = {};
        this.nameFor = {};

        this.skipAttributes = this.skipAttributes || options.skipAttributes ||
            {name: true};
        this.setAttributes();

        // Precedence for coloring:
        //  - set in subclass
        //  - set in DAGItem (as argument)
        //  - set in Control
        this.color = this.color || opts.color ||
            this._node.color || '#90caf9';
        this.usingNodeColor = !(this.color || opts.color);
        // Set width, height values
        if (!this.size) {
            this.size = {
                width: 100,
                height: 50
            };
        }

        if (!this.dense) {  // condensed size
            this.dense = {};
            this.dense.width = this.size.width;  // Not initialized
            this.dense.height = this.size.height;
        }

        this.width = this.dense.width;
        this.height = this.dense.height;

        DecoratorBase.call(this, options);
        this.initialize();
        this.condense();
        this.logger.debug('EllipseDecorator ctor'); 
    };

    // Pointer support
    //   - Get all pointer paths of the given node
    //   - For each path, add a territory rule
    //   - onLoad, set the name for the given pointer field

    _.extend(EllipseDecorator.prototype, DecoratorBase.prototype);

    EllipseDecorator.prototype.AttributeField = AttributeField;
    EllipseDecorator.prototype.PointerField = PointerField;
    EllipseDecorator.prototype.initialize = function() {
        this.width = this.dense.width;
        this.height = this.dense.height;

        this.$body = this.$el
            .append('rect')
            .attr('opacity', 0)
            .attr('class', this.className);

        this.$name = this.$el.append('text')
            .attr('opacity', 0)
            .attr('class', 'name')
            .style('font-size', '16px')  // FIXME: Move this to css
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'black');

        this.$attributes = this.$el.append('g')
            .attr('fill', '#222222');
    };

    EllipseDecorator.prototype.updateTerritory = function() {
        var ids,
            types;

        types = this.ptrNames
            .map(ptr =>  this.client.getPointerMeta(this._node.id, ptr))
            .filter(meta => meta)
            .map(meta => meta.items.map(item => item.id))
            .reduce((l1, l2) => l1.concat(l2), []);

        ids = this.ptrNames
            .map(ptr => this._node.pointers[ptr])
            .filter(id => id).concat(types);

        if (this._territoryId) {
            this.client.removeUI(this._territoryId);
        }

        this._territoryId = this.client.addUI(this, this._eventCallback.bind(this));
        this._territory = {};
        ids.forEach(id => this._territory[id] = {children: 0});
        this.client.updateTerritory(this._territoryId, this._territory);
    };

    EllipseDecorator.prototype._eventCallback = function(events) {
        // Update the names of all the pointers
        // Load => set the new name
        // unLoad => set the new name
        var node,
            id;

        for (var i = events.length; i--;) {
            switch(events[i].etype) {
            case CONSTANTS.TERRITORY_EVENT_LOAD:
            case CONSTANTS.TERRITORY_EVENT_UPDATE:
                id = events[i].eid;
                node = this.client.getNode(id);
                this.updateTargetName(id, node.getAttribute('name'));
                break;

            case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                // Set name to null
                this.updateTargetName(events[i].eid, null);
                break;
            }
        }
    };

    EllipseDecorator.prototype.updateTargetName = function(id, name) {
        this.nameFor[id] = name;
        if (this.pointersByTgt[id]) {
            this.pointersByTgt[id].forEach(field => field.setValue(name));
        }
    };

    EllipseDecorator.prototype.ROW_HEIGHT = 15;
    EllipseDecorator.prototype.createAttributeFields = function(y, width) {
        var attrNames = Object.keys(this._attributes),
            field,
            attr;

        for (var i = attrNames.length; i--;) {
            // Create attribute field
            y += this.ROW_HEIGHT;
            attr = this._attributes[attrNames[i]];
            field = new this.AttributeField(
                this.logger,
                this.$attributes,
                attr,
                y,
                width
            );
            field.saveAttribute = this.saveAttribute.bind(this, attrNames[i]);
            this.fields.push(field);
        }
        return y;
    };

    EllipseDecorator.prototype.createPointerFields = function(y, width, hidden) {
        var field,
            ptr;

        // Add the pointer fields
        for (var i = this.ptrNames.length; i--;) {
            y += this.ROW_HEIGHT;
            ptr = this._node.pointers[this.ptrNames[i]];
            field = new this.PointerField(
                this.$attributes,
                this.ptrNames[i],
                this.nameFor[ptr] || ptr,
                width,
                y,
                hidden
            );
            // add event handlers
            if (!hidden) {
                field.savePointer = this.savePointer.bind(this, this.ptrNames[i]);
                field.selectTarget = this.selectTargetFor.bind(this, this.ptrNames[i]);
            }
            this.pointers[this.ptrNames[i]] = field;

            if (!this.pointersByTgt[ptr]) {
                this.pointersByTgt[ptr] = [];
            }
            this.pointersByTgt[ptr].push(field);

            this.fields.push(field);
        }
        return y;
    };

    EllipseDecorator.prototype.expand = function(force) {
        var height,
            width,
            rx,
            ptr,

            // Attributes
            initialY = 25,
            attrNames = Object.keys(this._attributes),
            nameCount = (this.ptrNames.length + attrNames.length),
            isAnUpdate = this.expanded,
            margin = 5,
            y = margin + initialY,
            dy,
            i;

        // Only expand if the node has attributes to show
        if (force || nameCount > 0) {

            // Get the height from the number of attributes
            width = Math.max(
                this.nameWidth + 2 * NAME_MARGIN,
                this.size.width,
                this.fieldsWidth + 3 * NAME_MARGIN
            );

            // Shift name down
            this.$name.attr('y', '20');

            // Add the attribute fields
            this.clearFields();
            this.$attributes = this.$el.append('g')
                .attr('fill', '#222222');

            if (!isAnUpdate) {
                this.$attributes.attr('opacity', 0);
            }

            y = this.createAttributeFields(y, width);
            y = this.createPointerFields(y, width);


            // Update width, height
            rx = width/2;
            dy = y - margin - initialY;
            height = margin + this.dense.height + dy;
            this.updateShape({
                x: -rx,
                y: 0,
                rx: 0,
                ry: 0,
                width: width,
                height: height
            }).each('end', (a1, a2) => {
                if (!isAnUpdate) {
                    this.$attributes.attr('opacity', 1);
                }
            });

            this.height = height;
            this.width = width;
            this.expanded = true;
            this.$el
                .attr('transform', `translate(${this.width/2}, 0)`);
        } else if (isAnUpdate) {
            this.condense();
        }

        this.onResize();
    };

    EllipseDecorator.prototype.clearFields = function() {
        this.fields.forEach(field => field.destroy());
        this.fields = [];
        this.$attributes.remove();
    };

    EllipseDecorator.prototype.updateShape = function(params) {
        var keys = Object.keys(params),
            value,
            shapes = [this.$body],
            transitions;

        if (this.$shape) {
            shapes.push(d3.select(this.$shape));
        }

        transitions = shapes.map(shape => shape.transition());
        for (var i = keys.length; i--;) {
            value = params[keys[i]];
            for (var t = transitions.length; t--;) {
                transitions[t].attr(keys[i], value);
            }
        }
        return transitions[0];
    };

    EllipseDecorator.prototype.condense = function() {
        var width,
            rx,
            ry,
            y = 0;

        width = Math.max(this.nameWidth + 2 * NAME_MARGIN, this.dense.width);
        rx = width/2;
        ry = this.dense.height/2;

        // Clear the attributes
        this.clearFields();

        this.updateShape({
            x: -rx,
            y: -ry,
            width: width,
            height: 2*ry,
            ry: ry,
            rx: width/2
        });

        this.$attributes = this.$el.append('g')
            .attr('opacity', 0)
            .attr('fill', 'none');

        // Create an invisible attributes field container for calculating width
        y = this.createAttributeFields(y, width);
        y = this.createPointerFields(y, width, true);

        this.height = this.dense.height;
        this.width = width;

        this.$name.attr('y', '0');

        this.$el
            .attr('transform', `translate(${this.width/2}, ${this.height/2})`);
        this.expanded = false;
        this.onResize();
    };

    EllipseDecorator.prototype.onSelect = function() {
        this._selected = true;
        this.expand();
    };

    EllipseDecorator.prototype.onDeselect = function() {
        this._selected = false;
        this.condense();
    };

    EllipseDecorator.prototype.getDisplayName = function() {
        return this._node.baseName;  // Using the base node name for title
    };

    EllipseDecorator.prototype.setAttributes = function() {
        var attrNames = Object.keys(this._node.attributes),
            name;

        if (this.name !== this.getDisplayName()) {
            this.name = this.getDisplayName();
            this.nameWidth = null;
        }

        this._attributes = {};
        for (var i = attrNames.length; i--;) {
            name = attrNames[i];
            if (!this.skipAttributes[name]) {
                this._attributes[attrNames[i]] = this._node.attributes[attrNames[i]];
            }
        }

        if (this.usingNodeColor) {
            this.color = this._node.color || this.color;
        }

        // Update pointers
        this.ptrNames = this._node.pointers ? Object.keys(this._node.pointers) : [];
        this.updateTerritory();
    };

    // Reads the name width if it is currently unknown
    EllipseDecorator.prototype.updateWidth = function(zoom) {
        var needsUpdate = false;

        zoom = zoom || 1;
        if (!this.nameWidth) {
            this.nameWidth = this.$name.node().getBoundingClientRect().width;
            needsUpdate = !this.expanded && this.nameWidth > this.dense.width;
        }

        if (!this.fieldsWidth) {
            this.fieldsWidth = Math.max.apply(null,
                this.fields.map(field => field.width())
            )/zoom;
            needsUpdate = needsUpdate || this.expanded;
        }

        // Update the ui, if needed
        if (needsUpdate) {
            if (this.expanded) {
                this.expand();
            } else {
                this.condense();
            }
        }
    };

    EllipseDecorator.prototype.render = function(zoom) {
        this.$body
            .attr('opacity', 1)
            .attr('stroke', this.color)
            .attr('fill', this.color);

        this.$name.text(this.name)
            .transition()
            .attr('opacity', 1);

        this.fields.forEach(field => field.render(zoom));
        this.updateWidth(zoom);
    };

    EllipseDecorator.prototype.update = function(node) {
        this._node = node;
        // Update the attributes
        this.setAttributes();
        if (this._selected) {
            this.expand();
        } else {
            this.condense();
        }
        this.fieldsWidth = null;
    };

    EllipseDecorator.prototype.destroy = function() {
        this.fields.forEach(field => field.destroy());

        if (this._territoryId) {
            this.client.removeUI(this._territoryId);
        }

    };

    EllipseDecorator.prototype.DECORATORID = DECORATOR_ID;

    ///////////////// Pointer Support /////////////////

    EllipseDecorator.prototype.savePointer = function(name, to) {
        var msg = `Set ref "${name}" of "${this.name}" to "${to}"`;
        if (to === null) {  // delete pointer!
            this.client.delPointer(this._node.id, name,
                `Clearing ptr "${name}" of "${this.name}"`);
        } else {
            this.client.setPointer(this._node.id, name, to, msg);
        }
    };

    EllipseDecorator.prototype.getTargetFilterFnFor = function() {
        // Override in subclasses
        return null;
    };

    return EllipseDecorator;
});
