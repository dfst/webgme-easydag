/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Decorators/DecoratorBase',
    './DiagramDesigner/EllipseDecorator.DiagramDesignerWidget',
    './PartBrowser/EllipseDecorator.PartBrowserWidget',
    './EasyDAG/EllipseDecorator.EasyDAGWidget'
], function (
    DecoratorBase,
    EllipseDecoratorDiagramDesignerWidget,
    EllipseDecoratorPartBrowserWidget,
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
            DiagramDesigner: EllipseDecoratorDiagramDesignerWidget,
            PartBrowser: EllipseDecoratorPartBrowserWidget,
            EasyDAG: EllipseDecoratorEasyDAGWidget
        };
    };

    return EllipseDecorator;
});
