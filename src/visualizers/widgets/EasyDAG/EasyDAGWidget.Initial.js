define([], function() {
    'use strict';
    
    var EasyDAGInitial = function() {
        this._empty = true;
        this._emptyMsg = 'Click to create a new node';
        this.$emptyMsg = null;
    };

    EasyDAGInitial.prototype.updateEmptyMsg = function() {
        if (this._empty) {
            this._renderEmpty();
        } else if (this.$emptyMsg) {
            this.$emptyMsg.remove();
            this.$emptyMsg = null;
        }
    };

    EasyDAGInitial.prototype._renderEmpty = function() {
        this.$emptyMsg = this._$svg.append('text')
            .attr('x', this.width/2)
            .attr('y', this.height/2)
            .attr('class', 'background-text')
            .attr('text-anchor', 'middle')  // FIXME: Move this to css
            .attr('fill', '#9e9e9e')  // FIXME: Move this to css
            .text(this._emptyMsg)
            .on('click', () => {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                this.onCreateInitialNode();
            });
    };

    return EasyDAGInitial;
});
