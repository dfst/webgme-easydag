/*globals define, _, $*/
/*jshint browser: true, camelcase: false*/

/**
 * @author brollb / https://github.com/brollb
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'widgets/EasyDAG/EasyDAGWidget.DecoratorBase',
    'css!./EllipseDecorator.EasyDAGWidget.css',
    'd3'
], function (
    CONSTANTS,
    nodePropertyNames,
    DecoratorBase
) {

    'use strict';

    var EllipseDecorator,
        DECORATOR_ID = 'EllipseDecorator',
        NAME_MARGIN = 15;

    EllipseDecorator = function (options) {
        var opts = _.extend({}, options);

        this._node = options.node;
        this._attrToDisplayName = {};
        this.attributeFields = {};
        this.nameWidth = null;
        this.setAttributes();

        this.color = opts.color || this.color || '#2196f3';
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
            .attr('class', 'layer-decorator');

        this.$name = this.$el.append('text')
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
            displayName,
            path,
            textHeight = 15,

            // Attributes
            initialY = 25,
            attributeMargin = 10,
            leftCol,
            rightCol,
            y = 5;

        // Only expand if the node has attributes to show
        if (attrNames.length > 0) {

            // Get the height from the number of attributes
            height = y + this.dense.height + textHeight*attrNames.length;
            width = Math.max(this.nameWidth + 2 * NAME_MARGIN, this.size.width);
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
            leftCol = -rx + attributeMargin;
            rightCol = rx - attributeMargin;
            this.$attributes.remove();
            this.$attributes = this.$el.append('g')
                .attr('fill', '#222222');
            for (var i = attrNames.length; i--;) {
                // Create two text boxes (2nd is editable)
                y += textHeight;
                displayName = this._attrToDisplayName[attrNames[i]];
                // Attribute name
                this.$attributes.append('text')
                    .attr('y', y)
                    .attr('x', leftCol)
                    .attr('font-style', 'italic')  // FIXME: move this to css
                    .attr('class', 'attr-title')
                    .attr('text-anchor', 'start')
                    .attr('dominant-baseline', 'middle')
                    .text(`${displayName}: `);

                // Attribute value
                this.attributeFields[attrNames[i]] = this.$attributes.append('text')
                    .attr('y', y)
                    .attr('x', rightCol)
                    .attr('text-anchor', 'end')  // FIXME: move this to css
                    .attr('dominant-baseline', 'middle')
                    .text(`${this._attributes[attrNames[i]]}`)
                    .on('click', this.editAttribute.bind(this, attrNames[i], rightCol, y));
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
            name = this.getAttributeDisplayName(attrNames[i]);
            if (name !== null) {
                this._attrToDisplayName[attrNames[i]] = name;
                this._attributes[attrNames[i]] = this._node.attributes[attrNames[i]];
            }
        }
    };

    EllipseDecorator.prototype.getAttributeDisplayName = function(name) {
        if (name === 'name') {
            return null;
        }
        return name.replace(/_/g, ' ');
    };

    EllipseDecorator.prototype.editAttribute = function(attr) {
        // Edit the node's attribute
        var html = this.attributeFields[attr][0][0],
            position = html.getBoundingClientRect(),

            width = Math.max(position.right-position.left, 15),
            container = $('<div>'),
            parentHtml = $('body'),
            values = this.getEnumValues(attr);

        // foreignObject was not working so we are using a tmp container
        // instead
        container.css('top', position.top);
        container.css('left', position.left);
        container.css('position', 'absolute');
        container.css('width', width);
        container.attr('id', 'CONTAINER-TMP');

        $(parentHtml).append(container);

        // Get the attribute schema
        if (values) {
            var dropdown = document.createElement('select'),
                option,
                self = this,
                arrowMargin = 30;

            for (var i = values.length; i--;) {
                option = document.createElement('option');
                option.setAttribute('value', values[i]);
                option.innerHTML = values[i];
                // set the default
                if (this._attributes[attr] === values[i]) {
                    option.setAttribute('selected', 'selected');
                }
                dropdown.appendChild(option);
            }
            dropdown.style.width = (width + arrowMargin)+ 'px';
            container.append(dropdown);
            dropdown.focus();
            // on select
            dropdown.onblur = function() {
                if (this.value !== self._attributes[attr]) {
                    self.saveAttribute(attr, this.value);
                }
                container.remove();
            };

        } else {  // Check if it is a boolean type TODO
            container.editInPlace({
                enableEmpty: true,
                value: this._attributes[attr],
                css: {
                    'z-index': 10000,
                    'id': 'asdf',
                    'width': width,
                    'xmlns': 'http://www.w3.org/1999/xhtml'
                },
                onChange: (oldValue, newValue) => {
                    this.saveAttribute(attr, newValue);
                },
                onFinish: function () {
                    $(this).remove();
                }
            });
        }
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

    EllipseDecorator.prototype.render = function() {
        this.$body
            .transition()
            .attr('stroke', this.color)
            .attr('fill', this.color);

        this.$name
            .text(this.name);

        this.updateDenseWidth();
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

    EllipseDecorator.prototype.DECORATORID = DECORATOR_ID;

    return EllipseDecorator;
});
