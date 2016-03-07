/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author brollb / https://github.com/brollb
 */

define([
    'js/Decorators/DecoratorBase',
    './EasyDAG/EllipseDecorator.EasyDAGWidget'
], function (
    DecoratorBase,
    EllipseDecoratorEasyDAGWidget
) {

    'use strict';

    var EllipseDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = 'EllipseDecorator';

    EllipseDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug('EllipseDecorator ctor');
    };

    _.extend(EllipseDecorator.prototype, __parent_proto__);
    EllipseDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    EllipseDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            EasyDAG: EllipseDecoratorEasyDAGWidget
        };
    };

    return EllipseDecorator;
});
