/*globals define*/
define([
    './Buttons',
    'd3'
], function(
    Buttons
) {
    'use strict';
    
    var MARGIN = 10,
        DOTTED_COLOR = '#0099ff';

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
            remove: item => {
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
        if (item !== this.selectedItem) {
            this.deselect();
            this.selectedItem = item;
            item.onSelect();
        }
        this._widget.onSelect(item);
    };

    SelectionManager.prototype.deselect = function() {
        var item = this.selectedItem;
        if (this.selectedItem) {
            this.selectedItem.onDeselect();
            this.selectedItem = null;
        }
        this._deselect();
        this._widget.onDeselect(item);
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
            itemWidth,
            itemHeight,
            width,
            height;

        this._deselect();
        if (item) {
            itemWidth = item.width || item.getWidth();
            itemHeight = item.height || item.getHeight();
            left = item.x - itemWidth/2 - MARGIN;
            top = item.y - itemHeight/2 - MARGIN;
            width = itemWidth + 2*MARGIN;
            height = itemHeight + 2*MARGIN;

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
                .attr('opacity', 1);

            this.createActionButtons(width, height);
        }
    };

    SelectionManager.prototype.createActionButtons = function(width, height) {
        // Check if the selected item can have successors
        var cx = width/2,
            btn;

        if (!this.selectedItem.isConnection) {
            btn = new Buttons.Connect.From({
                context: this._widget,
                $pEl: this.$selection,
                item: this.selectedItem,
                x: cx,
                y: height
            });

            btn = new Buttons.Connect.To({
                context: this._widget,
                $pEl: this.$selection,
                item: this.selectedItem,
                x: cx,
                y: 0
            });
        }

        // Remove button
        btn = new Buttons.DeleteOne({
            context: this._widget,
            $pEl: this.$selection,
            item: this.selectedItem,
            x: 0,
            y: 0
        });
    };

    SelectionManager.prototype.isSelected = function(id) {
        if (this.selectedItem) {
            return this.selectedItem.id === id;
        }
        return false;
    };

    return SelectionManager;
});
