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
        this.width = this.width || 100;  // Override with width/height
        this.height = this.height || 100;
        DecoratorBase.call(this, params);
        //this.$el = d3.select(document.createElement('g'));
        this.$parent = params.parentEl;
        this.$el = this.$parent.append('g')
            .attr('class', 'centering-offset');

        // highlighting
        this.$body = null;  // template used for the highlight
        this.$shape = null;
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
        if (this.$body && !this.$shape) {
            // copy the $body
            var body = this.$body[0][0].cloneNode();  // retrieve the node
            this.$shape = body;
            this.$highlight
                // change the color
                .attr('fill', color || '#ff0000')

            this.$shape.setAttribute('filter', 'url(#highlight)');
            this.$highlight[0][0].appendChild(this.$shape);  // FIXME: This is ugly
        } else {
            this.logger.info('highlighting is not supported');
        }
    };

    EasyDAGDecoratorBase.prototype.unHighlight = function() {
        if (this.$shape) {
            this.$shape.attr('filter', null);
        }
    };

    EasyDAGDecoratorBase.prototype.enableTooltip = function(content, style) {
        this.$tooltip = new Opentip(this.$el[0][0], {
            //target: this.$el[0][0],
            tipJoint: 'left',
            style: style || 'standard'
        });
        this.$tooltip.setContent(content || 'this is a message!');
        this.$el.on('mouseenter', () => this.$tooltip.show());
        this.$el.on('mouseout', () => this.$tooltip.hide());
    };

    EasyDAGDecoratorBase.prototype.disableTooltip = function() {
        this.$tooltip.deactivate();
    };

    return EasyDAGDecoratorBase;
});
