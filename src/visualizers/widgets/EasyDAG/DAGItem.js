/* globals define */
define([
    './Icons',
    './lib/opentip-native.min'
], function(
    Icons
) {
    'use strict';
    
    var DAGItem = function(parentEl, desc, decoratorOpts) {
        this.id = desc.id;
        this.name = desc.name;
        this.desc = desc;
        this.isConnection = false;
        this.destroyed = false;
        this._selected = false;


        this.$container = parentEl
            .append('g');

        this.$el = this.$container
            .append('g')
            .attr('id', this.id)
            .attr('class', 'position-offset');

        decoratorOpts = decoratorOpts || {};
        decoratorOpts.node = desc;
        decoratorOpts.parentEl = this.$el;

        this.decorator = new this.desc.Decorator(decoratorOpts);

        this.width = this.decorator.width;
        this.height = this.decorator.height;
        this.initializeTooltips();

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

    DAGItem.prototype.initializeTooltips = function() {
        var hovered = false;
        this.tooltips = [];
        this.tooltipConds = {};

        this.$el.on('mouseover', () => {
            var id;
            if (hovered) {
                return;
            }
            hovered = true;
            for (var i = this.tooltips.length; i--;) {
                id = this.tooltips[i].id;
                if (!this.tooltipConds[id] || this.tooltipConds[id]()) {
                    this.tooltips[i].prepareToShow();
                }
            }
        });

        this.$el.on('mouseout', () => {
            hovered = false;
            this.tooltips.forEach(tooltip => tooltip.prepareToHide());
        });
        this.createHtml();

        // Icon support
        this.$icons = this.$el.append('g')
            .attr('class', `item-icons`);
        this.$iconPos = [];
    };

    DAGItem.prototype.remove = function() {
        this.$container.remove();
    };

    DAGItem.prototype.update = function(desc) {
        this.desc = desc;
        this.name = this.desc.name;
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
                if (!this.destroyed) {
                    this.decorator.render(zoom);
                    this.decorator.updateHighlightShape();
                    this.updateHtml();
                }
            });

        // Correct the icon location
        if (this.$iconPos.length) {
            const icons = this.getCurrentIcons();
            this.$iconPos.forEach((pos, i) => {
                left = pos[0]*this.width;
                top = pos[1]*this.height;
                d3.select(icons[i])
                    .attr('transform', `translate(${left}, ${top})`);
            });
        }
    };

    DAGItem.prototype.isSelected = function() {
        return this._selected;
    };

    DAGItem.prototype.onSelect = function() {
        this.decorator.onSelect();
        this._selected = true;
    };

    DAGItem.prototype.onDeselect = function() {
        this.decorator.onDeselect();
        this._selected = false;
    };

    DAGItem.prototype.expand = function() {
        this.decorator.expand();
    };

    DAGItem.prototype.condense = function() {
        this.decorator.condense();
    };

    DAGItem.prototype.destroy = function() {
        this.decorator.destroy();
        if (this.$tooltipAnchor) {
            this.$tooltipAnchor.remove();
        }
        this.destroyed = true;
    };

    DAGItem.prototype.createHtml = function() {
        this.$tooltipAnchor = document.createElement('div');
        this.$tooltipAnchor.style.position = 'absolute';
        this.$tooltipAnchor.style.visibility = 'hidden';

        this.$tooltipAnchor.setAttribute('class', 'tooltip-anchor');
        document.body.appendChild(this.$tooltipAnchor);
    };

    DAGItem.prototype.updateHtml = function() {
        var d3El = this.decorator.$body || this.$el,
            item = d3El[0][0],
            size = item.getBoundingClientRect();

        this.$tooltipAnchor.style.left = size.left + 'px';
        this.$tooltipAnchor.style.top = size.top + 'px';
        this.$tooltipAnchor.style.width = size.width + 'px';
        this.$tooltipAnchor.style.height = size.height + 'px';
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

        const element = this.$icons.append('g')
            .attr('class', `item-icon ${iconClass}`)
            .attr('transform', `translate(${x*this.width}, ${y*this.height})`);

        element.append('circle')
            .attr('r', radius);

        // Add the icon
        if (icon) {
            // I should move this into something that just creates icons/buttons
            // Buttons is similar but not quite the same...
            // It might be nice to have something like:
            //     icons -> buttons -> <rest of easdag>
            iconOpts.radius = lineRadius;
            Icons.addIcon(icon, element, iconOpts);
        }
        this.$iconPos.push([x, y]);

        const icons = this.getCurrentIcons();
        return d3.select(icons[icons.length-1]);
    };

    DAGItem.prototype.getCurrentIcons = function() {
        return this.$icons[0][0].childNodes;
    };

    DAGItem.prototype.hideIcon = function(icon) {
        this.getCurrentIcons().forEach((element, i) => {
            if (element === icon[0][0]) {
                element.remove();
                this.$iconPos.splice(i, 1);
            }
        });
    };

    DAGItem.prototype.hideIcons = function() {
        this.$icons.empty();
        this.$iconPos = [];
    };

    DAGItem.prototype.destroyTooltip = function(tooltip) {
        var i = this.tooltips.indexOf(tooltip);
        if (i !== -1) {
            this.tooltips.splice(i, 1);
            i = Opentip.tips.indexOf(tooltip);
            if (i !== -1) {
                Opentip.tips.splice(i, 1);
            }
        }
        delete this.tooltipConds[tooltip.id];
    };

    DAGItem.prototype.createTooltip = function(message, opts) {
        var tooltip,
            defaultOpts = {
                target: this.$tooltipAnchor,
                fixed: true,
                showOn: null
            };

        opts = _.extend(opts || {}, defaultOpts);
        tooltip = new Opentip(this.$tooltipAnchor, message, opts);
        this.tooltips.push(tooltip);

        if (opts.showIf) {
            this.tooltipConds[tooltip.id] = opts.showIf;
        }
        return tooltip;
    };

    /* * * * * * * * ERRORS/WARNINGS * * * * * * * */

    DAGItem.prototype.error = function(message) {
        this.decorator.highlight('red');
        this.createTooltip(message, {
            style: 'alert'
        });
    };

    DAGItem.prototype.warn = function(message) {
        this.decorator.highlight('#ffa500');
        this.createTooltip(message, {
            style: 'standard'
        });
    };

    // Selection using keybindings
    DAGItem.prototype.highlight = function() {
        this.decorator.highlight('#8888ff');
    };

    DAGItem.prototype.clear = function() {
        this.decorator.unHighlight();

        // Destroy all tooltips
        this.tooltips.forEach(tooltip => tooltip.deactivate());
        this.tooltips = [];
        this.tooltipConds = {};
    };

    return DAGItem;
});
