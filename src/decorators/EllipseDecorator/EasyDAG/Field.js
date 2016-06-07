/*globals $, define */

// This is for displaying and editing attributes of different types
// They will be able to:
//  - render
//  - edit
define([
], function(
) {
    var Field = function(parentEl, name, value, width, y) {
        this.$parent = parentEl;
        this.name = name;
        this.value = value;
        this.createLabel(width, y);
        this.createContent(width, y, this.value);
    };

    Field.PADDING = 12,
    Field.BUTTON_MARGIN = 12,
    Field.prototype.EMPTY_MSG = '<none>';
    Field.prototype.createLabel = function(width, y) {
        // Attribute name
        var leftCol = -width/2 + Field.PADDING;

        this.$label = this.$parent.append('text')
            .attr('y', y)
            .attr('x', leftCol)
            .attr('font-style', 'italic')  // FIXME: move this to css
            .attr('class', 'attr-title')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .text(`${this.name}: `);
    };

    Field.prototype.isEmpty = function() {
        return !this.value;
    };

    Field.prototype.createContent = function(width, y, content) {
        var x = width/2 - Field.PADDING;
        if (this.hasIcon()) {
            x -= Field.BUTTON_MARGIN;
        }
        content = content || this.EMPTY_MSG;
        this.$content = this.$parent.append('text')
            .attr('y', y)
            .attr('x', x)
            .attr('text-anchor', 'end')  // FIXME: move this to css
            .attr('dominant-baseline', 'middle')
            .text(content)
            .on('click', this.onClick.bind(this));

        if (this.isEmpty()) {
            this.$content.attr('font-style', 'italic');
        }
    };

    Field.prototype.setValue = function(value) {
        this.value = value;
        this.$content.text(value);
    };

    Field.prototype.hasIcon = function() {
        return !!this.$icon;
    };

    Field.prototype.onClick = function() {
        // Override in subclass
    };

    Field.prototype.width = function() {
        var elements = [this.$label[0][0]];

        if (this.$content) {  // may not be loaded in async setters
            elements.push(this.$content[0][0]);
        }

        if (this.$icon) {
            elements.push(this.$icon[0]);
        }

        return elements.map(el => el.getBoundingClientRect().width)
            .reduce((a, b) => a+b, 0);
    };

    Field.prototype.destroy = function() {
        if (this.$icon) {
            this.$icon.remove();
        }
    };

    Field.prototype.createIcon = function(glyphicon, container, url) {
        var html = this.$content[0][0],
            position = html.getBoundingClientRect(),
            parentHtml = $('body'),
            icon = $('<span/>');

        container = container || $('<div/>');
        container.css('top', position.top);
        container.css('left', position.right + 5);
        container.css('position', 'absolute');
        container.attr('id', 'download-file-icon');
        if (url) {
            container.attr('href', url);
        }

        icon.attr('class', 'glyphicon ' + glyphicon);
        container.append(icon);
        $(parentHtml).append(container);

        this.$icon = container;
        return container;
    };

    Field.prototype.render = function() {
        if (this.$icon) {
            this.$icon.remove();
        }
        this.createIcon('glyphicon-remove');
    };

    return Field;
});
