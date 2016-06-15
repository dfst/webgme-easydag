/* globals define, WebGMEGlobal*/
// This contains all action buttons for this widget
define([
    'underscore'
], function(
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

        this.$el = params.$pEl.append('g')
            .attr('class', 'button-' + this.BTN_CLASS)
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
    ButtonBase.BTN_CLASS = 'basic';
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
    Add.BORDER = 5;
    Add.prototype.BTN_CLASS = 'add';
    Add.prototype = new ButtonBase();

    Add.prototype._render = function() {
        var lineRadius = Add.SIZE - Add.BORDER,
            btnColor = '#90caf9',
            lineColor = '#7986cb';

        if (this.disabled) {
            btnColor = '#e0e0e0';
            lineColor = '#9e9e9e';
        }

        this.$el
            .append('circle')
            .attr('r', Add.SIZE)
            .attr('fill', btnColor);

        this.$el
            .append('line')
                .attr('x1', 0)
                .attr('x2', 0)
                .attr('y1', -lineRadius)
                .attr('y2', lineRadius)
                .attr('stroke-width', 3)
                .attr('stroke', lineColor);

        this.$el
            .append('line')
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('x1', -lineRadius)
                .attr('x2', lineRadius)
                .attr('stroke-width', 3)
                .attr('stroke', lineColor);

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

    DeleteBtn.prototype._render = function() {
        var lineRadius = Add.SIZE - Add.BORDER - 1,
            lineWidth = 2.5,
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

        this.$el
            .append('line')
                .attr('x1', -lineRadius)
                .attr('x2', lineRadius)
                .attr('y1', -lineRadius)
                .attr('y2', lineRadius)
                .attr('stroke-width', lineWidth)
                .attr('stroke', lineColor);

        this.$el
            .append('line')
                .attr('x1', -lineRadius)
                .attr('x2', lineRadius)
                .attr('y1', lineRadius)
                .attr('y2', -lineRadius)
                .attr('stroke-width', lineWidth)
                .attr('stroke', lineColor);

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
    var drawSquare = function(svg, size) {
        svg.append('line')
            .attr('x1', -size)
            .attr('x2', -size)
            .attr('y1', -size)
            .attr('y2', size);

        svg.append('line')
            .attr('x1', size)
            .attr('x2', size)
            .attr('y1', -size)
            .attr('y2', size);

        svg.append('line')
            .attr('x1', size)
            .attr('x2', -size)
            .attr('y1', -size)
            .attr('y2', -size);

        svg.append('line')
            .attr('x1', size)
            .attr('x2', -size)
            .attr('y1', size)
            .attr('y2', size);

    };

    var Enter = function(params) {
        ButtonBase.call(this, params);
    };

    Enter.SIZE = 10;
    Enter.BORDER = 5;
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

        iconCntr = this.$el.append('g')
                .attr('stroke-width', 2)
                .attr('stroke', lineColor);

        drawSquare(iconCntr, lineRadius);
    };

    Enter.prototype._onClick = function(item) {
        // Change to the given node
        WebGMEGlobal.State.registerActiveObject(item.id);
    };

    return {
        Add: Add,
        Delete: DeleteBtn,
        ButtonBase: ButtonBase,  // For extension in subclasses
        Enter: Enter,
        DeleteOne: DeleteOne
    };
});
