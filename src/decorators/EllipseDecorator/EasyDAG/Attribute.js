/*globals $, define */

// This is for displaying and editing attributes of different types
// They will be able to:
//  - render
//  - edit
define([
], function(
) {
    'use strict';
    var AttributeField = function(parentEl, attr, y, width) {
        this._name = attr.name;
        this.name = this._name.replace(/_/g, ' ');  // Display name
        this.attr = attr;
        this.isEmpty = !this.attr.value && this.attr.value !== 0;

        // Attribute name
        var leftCol = -width/2 + AttributeField.PADDING,
            rightCol = width/2 - AttributeField.PADDING;

        this.label = parentEl.append('text')
            .attr('y', y)
            .attr('x', leftCol)
            .attr('font-style', 'italic')  // FIXME: move this to css
            .attr('class', 'attr-title')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .text(`${this.name}: `);

        // Attribute value
        this.content = parentEl.append('text')
            .attr('y', y)
            .attr('x', rightCol)
            .attr('text-anchor', 'end')  // FIXME: move this to css
            .attr('dominant-baseline', 'middle')
            .text(`${this.isEmpty ? this.EMPTY_MSG : this.attr.value}`)
            .on('click', this.edit.bind(this));

        if (this.isEmpty) {
            this.content.attr('font-style', 'italic');
        }
    };

    AttributeField.PADDING = 10,
    AttributeField.prototype.EMPTY_MSG = '<none>';
    AttributeField.prototype.edit = function() {
        // Edit the node's attribute
        var html = this.content[0][0],
            position = html.getBoundingClientRect(),

            width = Math.max(position.right-position.left, 15),
            container = $('<div>'),
            parentHtml = $('body'),
            type = this.attr.type,
            values = this.attr.values;

        // Using a temp container for the editing
        container.css('top', position.top);
        container.css('left', position.left);
        container.css('position', 'absolute');
        container.css('width', width);
        container.attr('id', 'CONTAINER-TMP');

        $(parentHtml).append(container);

        if (values) {  // Check if enum
            var dropdown = document.createElement('select'),
                option,
                self = this,
                arrowMargin = 30;

            for (var i = values.length; i--;) {
                option = document.createElement('option');
                option.setAttribute('value', values[i]);
                option.innerHTML = values[i];
                // set the default
                if (this.attr.value === values[i]) {
                    option.setAttribute('selected', 'selected');
                }
                dropdown.appendChild(option);
            }
            dropdown.style.width = (width + arrowMargin)+ 'px';
            container.append(dropdown);
            dropdown.focus();
            // on select
            dropdown.onblur = function() {
                if (this.value !== self.attr.value) {
                    self.saveAttribute(this.value);
                }
                container.remove();
            };

        } else if (type === 'asset') {  // Check if it is a boolean type TODO
            console.log(`${this.name} is an asset!`);
            // TODO
        } else {  // assuming just text
            container.editInPlace({
                enableEmpty: true,
                value: this.attr.value,
                css: {
                    'z-index': 10000,
                    'id': 'asdf',
                    'width': width,
                    'xmlns': 'http://www.w3.org/1999/xhtml'
                },
                onChange: (oldValue, newValue) => {
                    this.saveAttribute(newValue);
                },
                onFinish: function () {
                    $(this).remove();
                }
            });
        }
    };

    return AttributeField;
});
