/*globals define, _, WebGMEGlobal */
/*jshint browser: true, camelcase: false*/

/**
 * @author brollb / https://github.com/brollb
 */

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
            this._node.color || '#2196f3';
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
    EllipseDecorator.prototype.initialize = function() {
        this.width = this.dense.width;
        this.height = this.dense.height;

        this.$body = this.$el
            .append('path')
            .attr('opacity', 0)
            .attr('class', 'layer-decorator');

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

    EllipseDecorator.prototype.expand = function() {
        var height,
            width,
            rx,
            attrNames = Object.keys(this._attributes),
            field,
            attr,
            ptr,
            path,
            textHeight = 15,

            // Attributes
            initialY = 25,
            nameCount = (this.ptrNames.length + attrNames.length),
            isAnUpdate = this.expanded,
            y = 5,
            i;

        // Only expand if the node has attributes to show
        if (nameCount > 0) {

            // Get the height from the number of attributes
            height = y + this.dense.height + textHeight*nameCount;
            width = Math.max(
                this.nameWidth + 2 * NAME_MARGIN,
                this.size.width,
                this.fieldsWidth + 3 * NAME_MARGIN
            );
            rx = width/2;

            path = [
                `M${-rx},0`,
                `l ${width} 0`,
                `l 0 ${height}`,
                `l -${width} 0`,
                `l 0 -${height}`
            ].join(' ');

            this.$body
                .attr('d', path);

            // Shift name down
            this.$name.attr('y', '20');

            // Add the attribute fields
            y += initialY;
            this.$attributes.remove();
            this.$attributes = this.$el.append('g')
                .attr('fill', '#222222');

            for (i = attrNames.length; i--;) {
                // Create attribute field
                y += textHeight;
                attr = this._attributes[attrNames[i]];
                field = new AttributeField(
                    this.logger,
                    this.$attributes,
                    attr,
                    y,
                    width
                );
                field.saveAttribute = this.saveAttribute.bind(this, attrNames[i]);
                this.fields.push(field);
            }

            // Add the pointer fields
            for (i = this.ptrNames.length; i--;) {
                y += textHeight;
                ptr = this._node.pointers[this.ptrNames[i]];
                field = new PointerField(
                    this.$attributes,
                    this.ptrNames[i],
                    this.nameFor[ptr] || ptr,
                    width,
                    y
                );
                // add event handlers
                field.savePointer = this.savePointer.bind(this, this.ptrNames[i]);
                field.selectTarget = this.selectTargetFor.bind(this, this.ptrNames[i]);
                this.pointers[this.ptrNames[i]] = field;

                if (!this.pointersByTgt[ptr]) {
                    this.pointersByTgt[ptr] = [];
                }
                this.pointersByTgt[ptr].push(field);

                this.fields.push(field);
            }


            // Update width, height
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

    EllipseDecorator.prototype.condense = function() {
        var path,
            width,
            rx,
            ry;

        width = Math.max(this.nameWidth + 2 * NAME_MARGIN, this.dense.width);
        rx = width/2;
        ry = this.dense.height/2;

        path = [
            `M${-rx},0`,
            `a${rx},${ry} 0 1,0 ${width},0`,
            `a${rx},${ry} 0 1,0 -${width},0`
        ].join(' ');

        this.$body
            .attr('d', path);

        // Clear the attributes
        this.fields.forEach(field => field.destroy());
        this.$attributes.remove();
        this.$attributes = this.$el.append('g')
            .attr('fill', '#222222');

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
        this.fieldsWidth = null;

        // Update pointers
        this.ptrNames = this._node.pointers ? Object.keys(this._node.pointers) : [];
        this.updateTerritory();
    };

    // Reads the name width if it is currently unknown
    EllipseDecorator.prototype.updateDenseWidth = function() {
        if (!this.nameWidth) {
            this.nameWidth = this.$name.node().getBoundingClientRect().width;

            // Update the condensed width
            if (this.nameWidth > this.dense.width && !this.expanded) {
                // Fix the condensed size
                this.condense();
            }
        }
    };

    EllipseDecorator.prototype.updateExpandedWidth = function(zoom) {
        zoom = zoom || 1;
        if (!this.fieldsWidth && this.expanded) {
            this.fieldsWidth = Math.max.apply(null,
                this.fields.map(field => field.width())
            )/zoom;
            this.expand();
        }
    };

    EllipseDecorator.prototype.render = function(zoom) {
        var transition = this.$body.transition()
            .delay(200)
            .attr('opacity', 1)
            .attr('stroke', this.color)
            .attr('fill', this.color);

        this.$name
            .text(this.name)
            .transition()
            .delay(200)
            .attr('opacity', 1);

        if (this.expanded) {
            transition.each('end', () =>
                this.fields.forEach(field => field.render(zoom)));
        } else {
            this.fields.forEach(field => field.render(zoom));
        }

        this.updateDenseWidth();
        this.updateExpandedWidth(zoom);
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
            this.client.makePointer(this._node.id, name, to, msg);
        }
    };

    EllipseDecorator.prototype.getTargetFilterFnFor = function() {
        // Override in subclasses
        return null;
    };

    return EllipseDecorator;
});
