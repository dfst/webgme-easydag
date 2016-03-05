define([
    'js/Constants'
], function(
    CONSTANTS
) {
    'use strict';
    
    var COLORS = [
        //'#f44336',
        //'#9e9e9e'//,
        //'#ffeb3b',
        '#2196f3'
    ];

    var DAGItem = function(parentEl, desc) {
        this.id = desc.id;
        this.name = desc.name;
        this.desc = desc;


        this.$container = parentEl
            .append('svg');

        this.$el = this.$container
            .append('g')
            .attr('id', this.id)
            .attr('class', 'position-offset');

        this.decorator = new this.desc.Decorator({
            node: desc,
            parentEl: this.$el
        });

        this.width = this.decorator.width;
        this.height = this.decorator.height;

        // Set up decorator callbacks
        this.setupDecoratorCallbacks();

        // REMOVE (used for tested)
        //var r = Math.random();
        //if (r < .3) this.error('erroring!')
        //else if (r < .6) this.warn('this is a warning');

    };

    DAGItem.prototype.setupDecoratorCallbacks = function() {
        this.decorator.onResize = this.updateDimensions.bind(this);
        this.decorator.saveAttribute = (attrId, value) => {
            this.saveAttribute(attrId, value);
        };

        this.decorator.setPointer = (ptr, nodeId) => {
            this.setPointer(ptr, nodeId);
        };

        this.decorator.getChildrenOf = (nodeId) => {
            return this.getChildrenOf(nodeId);
        };

        this.decorator.getEnumValues = attr => {
            return this.getEnumValues(attr);
        };
    };

    DAGItem.prototype.remove = function() {
        this.$container.remove();
    };

    DAGItem.prototype.update = function(desc) {
        this.desc = desc;
        this.decorator.update(desc);
    };

    DAGItem.prototype.updateDimensions = function() {
        // Get the width, height from the rendered content
        this.width = this.decorator.width;
        this.height = this.decorator.height;
        this.onUpdate();
    };

    DAGItem.prototype.redraw = function() {
        // Apply all the updates
        var left = this.x - this.width/2,
            top = this.y - this.height/2;

        // All nodes are centered on the x value (not the y)
        this.$el
            .transition()
            .attr('transform', `translate(${left}, ${top})`);

        this.decorator.render();

        // Draw the button

    };

    DAGItem.prototype.getColor = function() {
        var index = Math.floor(Math.random()*COLORS.length)
        return COLORS[index];
    };

    DAGItem.prototype.onSelect = function() {
        this.decorator.onSelect();
    };

    DAGItem.prototype.onDeselect = function() {
        this.decorator.onDeselect();
    };

    /* * * * * * * * ERRORS/WARNINGS * * * * * * * */

    DAGItem.prototype.error = function(message) {
        this.decorator.highlight('red', message);
        this.decorator.enableTooltip(message, 'alert');
    };

    DAGItem.prototype.warn = function(message) {
        this.decorator.highlight('#ffa500', message);
        this.decorator.enableTooltip(message, 'standard');
    };

    DAGItem.prototype.clear = function() {
        this.decorator.unHighlight();
        this.decorator.disableTooltip();
    };

    /* * * * * * * * ADD BUTTON * * * * * * * */
    // Check if there is a subsequent node
    // TODO

    // Check if this node can be terminal
    // TODO

    // If it can't be terminal and it has no subsequent node, show add icon
    // TODO

    // Otherwise, show icon on mouseover (if it can have a successor)
    // TODO
    return DAGItem;
});
