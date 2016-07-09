/* globals define, WebGMEGlobal*/
// This contains all action buttons for this widget
define([
    './Icons',
    'underscore'
], function(
    Icons,
    _
) {
    'use strict';

    var DURATION = 400;
    var ButtonBase = function(params) {
        if (!params) {
            return;
        }

        this.context = params.context;  // caller of _onClick
        this.item = params.item;
        this.x = params.x;
        this.y = params.y;
        this.disabled = !!params.disabled;
        this.icon = params.icon;
        this.class = params.class || this.BTN_CLASS;

        this.$el = params.$pEl.append('g')
            .attr('class', 'button ' + this.class)
            .attr('transform', `translate(${this.x}, ${this.y})`);

        // Create the button
        this.$el.attr('opacity', 0);
        this._render();
        this.$el
            .transition()
            .duration(DURATION)
            .attr('opacity', 1);

        // TODO: Add tooltip helper
        if (!this.disabled) {
            this.$el.on('click',
                this._onClick.bind(this.context, this.item));
        }
    };
    ButtonBase.prototype.BTN_CLASS = 'basic';
    ButtonBase.prototype._render = function() {
        // TODO: Override this in the children
        console.warn('No button render info specified!');
    };

    ButtonBase.prototype.remove = function() {
        this.$el
            .transition()
            .duration(DURATION)
            .attr('opacity', '0');

        setTimeout(() => this.$el.remove(), DURATION);
    };

    var Add = function(params) {
        ButtonBase.call(this, params);
    };

    Add.SIZE = 10;
    Add.BORDER = 2;
    Add.prototype.BTN_CLASS = 'add';
    Add.prototype = new ButtonBase();

    Add.prototype._render = function() {
        var lineRadius = Add.SIZE - Add.BORDER,
            btnColor = '#90caf9';

        if (this.disabled) {
            this.$el.attr('class', 'disabled');
            btnColor = '#e0e0e0';
        }

        this.$el
            .append('circle')
            .attr('r', Add.SIZE)
            .attr('fill', btnColor);

        Icons.addIcon(this.icon || 'plus', this.$el, {radius: lineRadius});
    };

    Add.prototype._onClick = function(item) {
        this.onAddButtonClicked(item);
    };

    ////////////////////////// Deletion //////////////////////////
    var DeleteBtn = function(params) {
        ButtonBase.call(this, params);
    };

    DeleteBtn.prototype.BTN_CLASS = 'delete';
    DeleteBtn.prototype = new ButtonBase();

    DeleteBtn.BORDER = 2;
    DeleteBtn.prototype._render = function() {
        var lineRadius = Add.SIZE - DeleteBtn.BORDER,
            btnColor = '#e57373',
            lineColor = '#616161';

        if (this.disabled) {
            btnColor = '#e0e0e0';
            lineColor = '#9e9e9e';
        }

        this.$el
            .append('circle')
            .attr('r', Add.SIZE)
            .attr('fill', btnColor);

        Icons.addIcon(this.icon || 'x', this.$el, {radius: lineRadius});
    };

    DeleteBtn.prototype._onClick = function(item) {
        this.removeWithSuccessors(item);
        this.selectionManager.deselect();
    };

    var DeleteOne = function(params) {
        ButtonBase.call(this, params);
    };

    _.extend(DeleteOne.prototype, DeleteBtn.prototype);

    DeleteOne.prototype._onClick = function(item) {
        this.deleteNode(item.id);
        this.selectionManager.deselect();
    };

    // Enter node button
    var Enter = function(params) {
        ButtonBase.call(this, params);
    };

    Enter.SIZE = 10;
    Enter.BORDER = 2;
    Enter.prototype.BTN_CLASS = 'enter';
    Enter.prototype = new ButtonBase();

    Enter.prototype._render = function() {
        var lineRadius = Enter.SIZE - Enter.BORDER,
            btnColor = this.color || '#90caf9',
            lineColor = this.lineColor || '#7986cb',
            iconCntr;

        if (this.disabled) {
            btnColor = '#e0e0e0';
            lineColor = '#9e9e9e';
        }

        this.$el
            .append('circle')
            .attr('r', Enter.SIZE)
            .attr('fill', btnColor);

        Icons.addIcon(this.icon || 'fullscreen-enter', this.$el,
            {radius: lineRadius});
    };

    Enter.prototype._onClick = function(item) {
        // Change to the given node
        WebGMEGlobal.State.registerActiveObject(item.id);
    };

    // Connection buttons (incoming, outgoing)
    var Connect = {};

    Connect.From = function(params) {
        params.class = params.class || 'connect';
        ButtonBase.call(this, params);
    };

    Connect.From.prototype._onClick = function(item) {
        // Create a connection from the current node to another
        this.startConnectionFrom(item);
    };

    Connect.SIZE = Enter.SIZE;
    Connect.BORDER = 2;
    Connect.From.prototype._render = function() {
        var lineRadius = Connect.SIZE - Connect.BORDER,
            btnColor = this.color || '#90caf9',
            lineColor = this.lineColor || '#7986cb',
            iconCntr;

        if (this.disabled) {
            btnColor = '#e0e0e0';
            lineColor = '#9e9e9e';
        }

        this.$el
            .append('circle')
            .attr('r', Connect.SIZE)
            .attr('fill', btnColor);

        Icons.addIcon(this.icon || 'chevron-bottom', this.$el,
            {radius: lineRadius});
    };

    Connect.To = function(params) {
        params.class = params.class || 'connect';
        ButtonBase.call(this, params);
    };

    Connect.To.prototype._onClick = function(item) {
        // Create a connection from the current node to another
        this.startConnectionTo(item);
    };

    Connect.To.prototype._render = Connect.From.prototype._render;

    return {
        Add: Add,
        Delete: DeleteBtn,
        ButtonBase: ButtonBase,  // For extension in subclasses
        Enter: Enter,
        Connect: Connect,
        DeleteOne: DeleteOne
    };
});
