/*globals define, _, $*/
/*jshint browser: true, camelcase: false*/

/**
 * @author brollb / https://github.com/brollb
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'widgets/EasyDAG/EasyDAGWidget.DecoratorBase',
    './Attribute',
    'css!./EllipseDecorator.EasyDAGWidget.css',
    'd3'
], function (
    CONSTANTS,
    nodePropertyNames,
    DecoratorBase,
    AttributeField
) {

    'use strict';

    var EllipseDecorator,
        DECORATOR_ID = 'EllipseDecorator',
        NAME_MARGIN = 15;

    EllipseDecorator = function (options) {
        var opts = _.extend({}, options);

        this._node = opts.node;
        this.attributeFields = [];
        this.nameWidth = null;
        this.fieldsWidth = null;
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

    _.extend(EllipseDecorator.prototype, DecoratorBase.prototype);

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

    EllipseDecorator.prototype.expand = function() {
        var height,
            width,
            rx,
            attrNames = Object.keys(this._attributes),
            attrField,
            attr,
            path,
            textHeight = 15,

            // Attributes
            initialY = 25,
            y = 5;

        // Only expand if the node has attributes to show
        if (attrNames.length > 0) {

            // Get the height from the number of attributes
            height = y + this.dense.height + textHeight*attrNames.length;
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
            for (var i = attrNames.length; i--;) {
                // Create two text boxes (2nd is editable)
                y += textHeight;
                attr = this._attributes[attrNames[i]];
                attrField = new AttributeField(
                    this.logger,
                    this.$attributes,
                    attr,
                    y,
                    width
                );
                this.attributeFields.push(attrField);
                attrField.saveAttribute = this.saveAttribute.bind(this, attrNames[i]);
            }

            // Update width, height
            this.height = height;
            this.width = width;
            this.expanded = true;
            this.$el
                .attr('transform', `translate(${this.width/2}, 0)`);
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
        this.attributeFields.forEach(field => field.destroy());
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
        this.expand();
    };

    EllipseDecorator.prototype.onDeselect = function() {
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

    EllipseDecorator.prototype.updateExpandedWidth = function() {
        if (!this.fieldsWidth && this.expanded) {
            this.fieldsWidth = Math.max.apply(null,
                this.attributeFields.map(field => field.width())
            );
            this.expand();
        }
    };

    EllipseDecorator.prototype.render = function() {
        this.$body
            .transition()
            .delay(200)
            .attr('opacity', 1)
            .attr('stroke', this.color)
            .attr('fill', this.color);

        this.$name
            .text(this.name)
            .transition()
            .delay(200)
            .attr('opacity', 1);

        this.attributeFields.forEach(field => field.render());
        this.updateDenseWidth();
        this.updateExpandedWidth();
    };

    EllipseDecorator.prototype.update = function(node) {
        this._node = node;
        // Update the attributes
        this.setAttributes();
        if (this.expanded) {
            this.expand();
        } else {
            this.condense();
        }
    };

    EllipseDecorator.prototype.destroy = function() {
        this.attributeFields.forEach(field => field.destroy());
    };

    EllipseDecorator.prototype.DECORATORID = DECORATOR_ID;

    return EllipseDecorator;
});
