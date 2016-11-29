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

        this.isAltPressed = false;
        this.hasAltButtons = !!this.createAltActionButtons;
        this.selectionChanged = false;
    };

    SelectionManager.prototype.onKeyPress = function(key, event) {
        if (this.hasAltButtons && (event.altKey || (event.ctrlKey && event.shiftKey))) {
            this.isAltPressed = true;
            this._widget.refreshUI();
        }
    };

    SelectionManager.prototype.onKeyRelease = function(key, event) {
        if (this.hasAltButtons && !event.altKey &&
            (!event.ctrlKey || !event.shiftKey)) {
            this.isAltPressed = false;
            this._widget.refreshUI();
        }
    };

    SelectionManager.prototype.select = function(item) {
        if (item !== this.selectedItem) {
            this.selectionChanged = true;
            this.deselect();
            this.selectedItem = item;
            item.onSelect();
        }
        this._widget.onSelect(item);
    };

    SelectionManager.prototype.deselect = function() {
        var item = this.selectedItem;
        if (this.selectedItem) {
            this.selectionChanged = false;
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

            if (this.$selection) {
                this.$selection.remove();
            }

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

            // Check if this is the initial click/render
            if (this.isAltPressed) {
                this.createAltActionButtons(width, height, this.selectionChanged);
            } else {
                this.createActionButtons(width, height, this.selectionChanged);
            }
            this.selectionChanged = false;
        }
    };

    SelectionManager.prototype.createActionButtons = function(width, height, transition) {
        // Check if the selected item can have successors
        var cx = width/2,
            btn;

        if (!this.selectedItem.isConnection) {
            btn = new Buttons.Connect.From({
                context: this._widget,
                $pEl: this.$selection,
                item: this.selectedItem,
                transition: transition,
                x: cx,
                y: height
            });

            btn = new Buttons.Connect.To({
                context: this._widget,
                $pEl: this.$selection,
                item: this.selectedItem,
                transition: transition,
                x: cx,
                y: 0
            });
        }

        // Remove button
        btn = new Buttons.DeleteOne({
            context: this._widget,
            $pEl: this.$selection,
            item: this.selectedItem,
            transition: transition,
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
