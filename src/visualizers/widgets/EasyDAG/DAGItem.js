/* globals define */
define([
    './Icons'
], function(
    Icons
) {
    'use strict';
    
    var DAGItem = function(parentEl, desc) {
        this.id = desc.id;
        this.name = desc.name;
        this.desc = desc;
        this.isConnection = false;


        this.$container = parentEl
            .append('g');

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

        this.decorator.selectTargetFor = ptr => {
            var filter = this.decorator.getTargetFilterFnFor(ptr);
            return this.selectTargetFor(this.id, ptr, filter);
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

    DAGItem.prototype.redraw = function(zoom) {
        // Apply all the updates
        var left = this.x - this.width/2,
            top = this.y - this.height/2;

        // All nodes are centered on the x value (not the y)
        this.$el
            .transition()
            .attr('transform', `translate(${left}, ${top})`)
            .each('end', () => {
                this.decorator.render(zoom);
                this.decorator.updateHighlightShape();
            });

        // Correct the icon location
        if (this.$icon) {
            left = this.$iconPos[0]*this.width;
            top = this.$iconPos[1]*this.height;
            this.$icon
                .attr('transform', `translate(${left}, ${top})`);
        }
    };

    DAGItem.prototype.onSelect = function() {
        this.decorator.onSelect();
    };

    DAGItem.prototype.onDeselect = function() {
        this.decorator.onDeselect();
    };

    DAGItem.prototype.destroy = function() {
        this.decorator.destroy();
    };

    /* * * * * * * * CONNECTION INDICATORS * * * * * * * */
    DAGItem.prototype.showIcon = function(params) {
        var x = params.x || 0,
            y = params.y || 0,
            iconClass = params.class || '',
            icon = params.icon,
            size = params.size || 20,
            radius = size/2,
            border = 2,
            lineRadius = radius - border,
            iconOpts = params.iconOpts || {};

        this.$icon = this.$el.append('g')
            .attr('class', `item-icon ${iconClass}`)
            .attr('transform', `translate(${x*this.width}, ${y*this.height})`);

        this.$icon.append('circle')
            .attr('r', radius);

        // Add the icon
        if (icon) {
            // I should move this into something that just creates icons/buttons
            // Buttons is similar but not quite the same...
            // It might be nice to have something like:
            //     icons -> buttons -> <rest of easdag>
            iconOpts.radius = lineRadius;
            Icons.addIcon(icon, this.$icon, iconOpts);
        }
        this.$iconPos = [x, y];
        return this.$icon;
    };

    DAGItem.prototype._setIcon = function(icon) {
        if (this.$icon) {
        }
    };

    DAGItem.prototype.hideIcon = function() {
        if (this.$icon) {
            this.$icon.remove();
        }
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

    // Selection using keybindings
    DAGItem.prototype.highlight = function() {
        this.decorator.highlight('#8888ff');
    };

    DAGItem.prototype.clear = function() {
        this.decorator.unHighlight();
        this.decorator.disableTooltip();
    };

    return DAGItem;
});
