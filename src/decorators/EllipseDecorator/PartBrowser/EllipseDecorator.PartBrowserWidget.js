/*globals define, _, DEBUG, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../DiagramDesigner/EllipseDecorator.DiagramDesignerWidget.html',
    'css!../DiagramDesigner/EllipseDecorator.DiagramDesignerWidget.css',
    'css!./EllipseDecorator.PartBrowserWidget.css'
], function (CONSTANTS,
             nodePropertyNames,
             PartBrowserWidgetDecoratorBase,
             DiagramDesignerWidgetConstants,
             EllipseDecoratorDiagramDesignerWidgetTemplate) {

    'use strict';

    var EllipseDecoratorPartBrowserWidget,
        __parent__ = PartBrowserWidgetDecoratorBase,
        DECORATOR_ID = 'EllipseDecoratorPartBrowserWidget';

    EllipseDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend({}, options);

        __parent__.apply(this, [opts]);

        this.logger.debug('EllipseDecoratorPartBrowserWidget ctor');
    };

    _.extend(EllipseDecoratorPartBrowserWidget.prototype, __parent__.prototype);
    EllipseDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    EllipseDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(EllipseDecoratorDiagramDesignerWidgetTemplate);
        //use the same HTML template as the EllipseDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();

    EllipseDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        //find name placeholder
        this.skinParts.$name = this.$el.find('.name');

        this._renderContent();
    };

    EllipseDecoratorPartBrowserWidget.prototype.afterAppend = function () {
    };

    EllipseDecoratorPartBrowserWidget.prototype._renderContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        if (DEBUG) {
            this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});
        }

        if (nodeObj) {
            this.skinParts.$name.text(nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '');
        }
    };

    EllipseDecoratorPartBrowserWidget.prototype.update = function () {
        this._renderContent();
    };

    return EllipseDecoratorPartBrowserWidget;
});