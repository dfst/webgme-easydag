/* globals define*/
// This contains all the functionality required of decorators used in EasyDAG
define([
    'js/Decorators/WidgetDecoratorBase',
    'd3',
    './lib/opentip-native.min'
], function(
    DecoratorBase
) {
    'use strict';
    var nop = function() {};
    var EasyDAGDecoratorBase = function(params) {
        var classes = 'centering-offset';

        this.width = this.width || 100;  // Override with width/height
        this.height = this.height || 100;
        DecoratorBase.call(this, params);
        this.$parent = params.parentEl;

        if (params.node.class) {
            classes += ' ' + params.node.class;
        }
        this.$el = this.$parent.append('g')
            .attr('class', classes);

        // highlighting
        this.$body = null;  // template used for the highlight
        this.$shape = null;
        this._highlighted = false;
        this.$highlight = this.$el.append('g')
            .attr('class', 'highlight');

        // tooltip
        this.$tooltip = null;
    };

    EasyDAGDecoratorBase.prototype.update = nop;

    // Callback for triggering size change in parent
    EasyDAGDecoratorBase.prototype.onResize = nop;
    EasyDAGDecoratorBase.prototype.saveAttribute = nop;
    EasyDAGDecoratorBase.prototype.setPointer = nop;
    EasyDAGDecoratorBase.prototype.getEnumValues = nop;

    EasyDAGDecoratorBase.prototype.onSelect = function() {
        this.onResize();
    };

    EasyDAGDecoratorBase.prototype.onDeselect = function() {
        this.onResize();
    };

    // Highlight support /////////////////////////////////

    EasyDAGDecoratorBase.prototype.highlight = function(color) {
        this._highlighted = true;
        if (this.$body) {
            if (!this.$shape) {
                // copy the $body
                this.updateHighlightShape();
            }

            this.$highlight
                // change the color
                .attr('fill', color || '#ff0000');
        } else {
            this.logger.info('highlighting is not supported');
        }
    };

    EasyDAGDecoratorBase.prototype.updateHighlightShape = function() {
        if (this.$shape) {
            this.$shape.remove();
        }

        if (this._highlighted) {
            var body = this.$body[0][0].cloneNode();  // retrieve the node
            this.$shape = body;
            this.$highlight[0][0].appendChild(this.$shape);  // FIXME: This is ugly
            this.$shape.setAttribute('filter', 'url(#highlight)');
        }
    };

    EasyDAGDecoratorBase.prototype.unHighlight = function() {
        this._highlighted = false;
        if (this.$shape) {
            this.$shape.removeAttribute('filter');
            this.$shape.remove();
        }
    };

    EasyDAGDecoratorBase.prototype.enableTooltip = function(content, style) {
        this.$tooltip = new Opentip(this.$el[0][0], {
            tipJoint: 'left',
            style: style || 'standard'
        });
        this.$tooltip.setContent(content || 'this is a message!');
        this.$el.on('mouseenter', () => this.$tooltip.show());
        this.$el.on('mouseout', () => this.$tooltip.hide());
    };

    EasyDAGDecoratorBase.prototype.destroy = function() {
    };

    EasyDAGDecoratorBase.prototype.disableTooltip = function() {
        if (this.$tooltip) {
            this.$tooltip.deactivate();
        }
    };

    return EasyDAGDecoratorBase;
});
