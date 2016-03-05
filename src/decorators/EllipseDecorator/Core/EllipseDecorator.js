/*globals define, _, $*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'text!./EllipseDecorator.html',
    'css!./EllipseDecorator.css',
    'd3'
], function (
    CONSTANTS,
    nodePropertyNames,
    ExpandingDecoratorTemplate
) {

    'use strict';

    var EllipseDecorator,
        DECORATOR_ID = 'EllipseDecorator';

    EllipseDecorator = function (options) {
        var opts = _.extend({}, options);

        this.name = '';

        this.logger.debug('EllipseDecorator ctor');
    };

    EllipseDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    // TODO: Create the svg ellipse using d3
    EllipseDecorator.prototype.$DOMBase = $(ExpandingDecoratorTemplate);

    EllipseDecorator.prototype.on_addTo = function () {
        var self = this;

        this._renderName();

        // set title editable on double-click
        this.skinParts.$name.on('dblclick.editOnDblClick', null, function (event) {
            if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                $(this).editInPlace({
                    class: '',
                    onChange: function (oldValue, newValue) {
                        self._onNodeTitleChanged(oldValue, newValue);
                    }
                });
            }
            event.stopPropagation();
            event.preventDefault();
        });

        //let the parent decorator class do its job first
        __parent_proto__.on_addTo.apply(this, arguments);
    };

    EllipseDecorator.prototype._renderName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '';
        }

        //find name placeholder
        this.skinParts.$name = this.$el.find('.name');
        this.skinParts.$name.text(this.name);
    };

    EllipseDecorator.prototype.update = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            newName = '';

        if (nodeObj) {
            newName = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '';

            if (this.name !== newName) {
                this.name = newName;
                this.skinParts.$name.text(this.name);
            }
        }
    };

    /**************** EDIT NODE TITLE ************************/

    EllipseDecorator.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/

    EllipseDecorator.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString();
        if (this.name && this.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
            return true;
        }

        return false;
    };

    return EllipseDecorator;
});
