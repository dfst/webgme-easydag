define([
    './Buttons',
    'd3'
], function(
    Buttons
) {
    'use strict';
    
    var MARGIN = 10,
        DOTTED_COLOR = '#0099ff',
        BUTTON_SIZE = 20,
        BUTTON_COLOR = '#aeaeae',
        BUTTON_COLOR_INACTIVE = '#333333',  // TODO: on mouse over
        nop = function(){};

    var SelectionManager = function(widget) {
        this._widget = widget;  // This is used for the action callbacks
        this.$parent = widget.$svg;
        this.$el = this.$parent
            .append('g')
            .attr('class', 'selection-container');
        this.$selection = null;
        this.selectedItem = null;

        this.initActions();
    };

    SelectionManager.prototype.initActions = function() {
        this.ACTIONS = {
            add: this._widget.onAddButtonClicked.bind(this._widget),
            remove: (item) => {
                this._widget.removeItem(item);
                this.deselect();
            },
            move: this._widget.showMoves.bind(this._widget)
        };

        // Logic for drawing the buttons
        this.BUTTONS = {
            remove: (container, x1, x2, y1, y2) => {
                var ratio = 0.70,
                    width = x2-x1,
                    height = y2-y1,
                    color = '#404040';

                container.append('line')
                    .attr('x1', x1 + (width * ratio))
                    .attr('x2', x2 - (width * ratio))
                    .attr('y1', y1 + (height * ratio))
                    .attr('y2', y2 - (height * ratio))
                    .attr('stroke-width', 2)
                    .attr('stroke', color);

                container.append('line')
                    .attr('x1', x2 - (width * ratio))
                    .attr('x2', x1 + (width * ratio))
                    .attr('y1', y1 + (height * ratio))
                    .attr('y2', y2 - (height * ratio))
                    .attr('stroke-width', 2)
                    .attr('stroke', color);
            },
            add: (container, x1, x2, y1, y2) => {
                var ratio = 0.75,
                    width = x2-x1,
                    height = y2-y1,
                    cx = (x1 + x2)/2,
                    cy = (y1 + y2)/2,
                    color = '#404040';

                container.append('line')
                    .attr('x1', cx)
                    .attr('x2', cx)
                    .attr('y1', y1 + (height * ratio))
                    .attr('y2', y2 - (height * ratio))
                    .attr('stroke-width', 2)
                    .attr('stroke', color);

                container.append('line')
                    .attr('x1', x2 - (width * ratio))
                    .attr('x2', x1 + (width * ratio))
                    .attr('y1', cy)
                    .attr('y2', cy)
                    .attr('stroke-width', 2)
                    .attr('stroke', color);
            }
        };
    };

    SelectionManager.prototype.select = function(item) {
        var x,
            y;

        if (item !== this.selectedItem) {
            this.deselect();
            this.selectedItem = item;
            item.onSelect();
        }
    };

    SelectionManager.prototype.deselect = function() {
        if (this.selectedItem) {
            this.selectedItem.onDeselect();
            this.selectedItem = null;
        }
        this._deselect();
    };

    SelectionManager.prototype._deselect = function() {
        // Remove the action buttons
        if (this.$selection) {
            this.$selection.remove();
        }
    };

    // Private
    SelectionManager.prototype.redraw = function() {
        var item = this.selectedItem,
            left,
            top,
            width,
            height;

        this._deselect();
        if (item) {
            left = item.x - item.width/2 - MARGIN;
            top = item.y - (item.height/2) - MARGIN;
            width = item.width + 2*MARGIN;
            height = item.height + 2*MARGIN;

            this.$selection = this.$el
                .append('g')
                .attr('transform', `translate(${left},${top})`);

            // Selection outline
            this.$selection.append('path')
                .attr('d', `M 0 0 l ${width} 0 l 0 ${height}` +
                    ` l ${-width} 0 l 0 ${-height}`)
                .attr('class', 'selection-outline')
                .attr('stroke-dasharray', '4,4')
                .attr('stroke', DOTTED_COLOR)
                .attr('fill', 'none')
                .attr('opacity', 1)

            this._createActionButtons(width, height);
        }
    };

    SelectionManager.prototype._createActionButtons = function(width, height) {
        // Check if the selected item can have successors
        var successorNodes,
            cx = width/2,
            btn;

        successorNodes = this._widget.getValidSuccessorNodes(this.selectedItem.id);

        btn = new Buttons.Add({
            context: this._widget,
            $pEl: this.$selection,
            item: this.selectedItem,
            x: cx,
            y: height,
            disabled: successorNodes.length === 0
        });
        //this._createActionButton('add', width/2, height, successorNodes.length === 0);

        // Remove button
        btn = new Buttons.Delete({
            context: this._widget,
            $pEl: this.$selection,
            item: this.selectedItem,
            x: cx,
            y: 0
        });
        //this._createActionButton('remove', width/2, 0);

        // Move button
        // TODO: Add this later
        //this._createActionButton('move', width, 0);

    };

    SelectionManager.prototype.isSelected = function(id) {
        if (this.selectedItem) {
            return this.selectedItem.id === id;
        }
        return false;
    };

    SelectionManager.prototype._createActionButton = function(action, cx, cy, inactive) {
        var button,
            color = inactive ? BUTTON_COLOR_INACTIVE : BUTTON_COLOR,  // FIXME: This would be better as css
            x = cx - BUTTON_SIZE/2,
            y = cy - BUTTON_SIZE/2,
            drawFn = this.BUTTONS[action] || nop;

        button = this.$selection
            .append('g')
            .attr('class', 'buttons action ' + action);

        button.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', BUTTON_SIZE)
            .attr('height', BUTTON_SIZE)
            .attr('fill', color);

        drawFn(button, x, x+BUTTON_SIZE, y, y+BUTTON_SIZE);

        if (!inactive) {
            button.on('click', this._onBtnPressed.bind(this, action))
        }

        return button;
    };

    SelectionManager.prototype._onBtnPressed = function(action) {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        this.ACTIONS[action].call(this, this.selectedItem);
    };

    return SelectionManager;
});
