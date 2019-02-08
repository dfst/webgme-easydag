/*globals $, define */

// This is for displaying and editing attributes of different types
// They will be able to:
//  - render
//  - edit
define([
    'webgme-easydag/Icons'
], function(
    Icons
) {
    var Field = function(parentEl, name, value, width, y) {
        this.$parent = parentEl;
        this.name = name;
        this.value = value;
        this.createLabel(width, y);
        this.createContent(width, y, this.value);
    };

    Field.PADDING = 12;
    Field.BUTTON_MARGIN = 12;
    Field.prototype.EMPTY_MSG = '<none>';
    Field.prototype.createLabel = function(width, y) {
        // Attribute name
        var leftCol = -width/2 + Field.PADDING;

        this.$el = this.$parent.append('g');
        this.$label = this.$el.append('text')
            .attr('y', y)
            .attr('x', leftCol)
            .attr('font-style', 'italic')  // FIXME: move this to css
            .attr('class', 'attr-title')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .text(`${this.name}: `)
            .on('click', () => this.onLabelClick());
        this.$hint = this.$el.append('title');
    };

    Field.prototype.setHint = function(hintText) {
        this.$hint.text(hintText);
    };

    Field.prototype.isEmpty = function() {
        return this.value === undefined || this.value === null || this.value === '';
    };

    Field.prototype.createContent = function(width, y, content) {
        var x = width/2 - Field.PADDING;

        if (this.hasIcon()) {
            x -= Field.BUTTON_MARGIN;
        }

        content = !this.isEmpty() ? content.toString() : this.EMPTY_MSG;
        this.$content = this.$parent.append('text')
            .attr('y', y)
            .attr('x', x)
            .attr('class', 'attr-content')
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

    Field.prototype.onLabelClick =
    Field.prototype.onClick = function() {
        // Override in subclass
    };

    Field.prototype.width = function() {
        var elements = [this.$label[0][0]];

        if (this.$content) {  // may not be loaded in async setters
            elements.push(this.$content[0][0]);
        }

        if (this.$icon) {
            elements.push(this.$icon[0][0]);
        }

        return elements.map(el => el.getBoundingClientRect().width)
            .reduce((a, b) => a+b, 0);
    };

    Field.prototype.destroy = function() {
        if (this.$icon) {
            this.$icon.remove();
        }
    };

    Field.prototype.createIcon = function(iconName, opts) {
        const size = this.$content.node().getBBox();

        this.$icon = this.$parent.append('g');

        opts = opts || {};

        let iconOpts = {
            x: size.x + size.width + 5,
            y: size.y + 2,
            size: size.height * .7
        };
        _.extend(iconOpts, opts);

        Icons.addIcon(iconName, this.$icon, iconOpts);

        return this.$icon;
    };

    Field.prototype.render = function(zoom) {
        // Do I need to change this each time?
        if (this.$icon) {
            this.$icon.remove();
        }
        this.createIcon('x', {zoom: zoom});
    };

    return Field;
});
