/*globals define, _, $*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'widgets/EasyDAG/EasyDAGWidget.DecoratorBase',
    'text!./EllipseDecorator.EasyDAGWidget.html',
    'd3',
    'css!./EllipseDecorator.EasyDAGWidget.css'
], function (
    CONSTANTS,
    nodePropertyNames,
    DecoratorBase,
    EllipseDecoratorTemplate
) {

    'use strict';

    var EllipseDecorator,
        DECORATOR_ID = 'EllipseDecorator',
        FILL_COLOR = '#2196f3',
        WIDTH = 100,
        HEIGHT = 50;

    EllipseDecorator = function (options) {
        var opts = _.extend({}, options);

        this._node = options.node;
        this.setAttributes();

        DecoratorBase.call(this, options);
        this.width = WIDTH;
        this.height = HEIGHT;

        this.initialize();
        this.logger.debug('EllipseDecorator ctor');
    };

    EllipseDecorator.prototype.initialize = function() {
        this.$body = this.$el.append('ellipse')
            .attr('fill', 'white')

        this.$name = this.$el.append('text')
            .attr('fill', 'black');
    };

    EllipseDecorator.prototype.setAttributes = function() {
        this.name = this._node.name;
    };

    // Only method to touch the DOM
    EllipseDecorator.prototype.render = function() {
        this.$el
            .attr('transform', `translate(${WIDTH/2}, ${HEIGHT/2})`);

        this.$body
            .transition()
            .attr('rx', WIDTH/2)
            .attr('ry', HEIGHT/2)
            .attr('fill', FILL_COLOR);

        this.$name
            .attr('text-anchor', 'middle')
            .text(this.name);
    };

    EllipseDecorator.prototype.update = function(node) {
        this._node = node;
        // Update the attributes
        this.setAttributes();
    };

    _.extend(EllipseDecorator.prototype, DecoratorBase.prototype);
    EllipseDecorator.prototype.DECORATORID = DECORATOR_ID;

    return EllipseDecorator;
});
