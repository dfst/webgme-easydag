define([], function() {
    'use strict';
    
    var EasyDAGInitial = function() {
        this._empty = true;
        this._emptyMsg = this.CREATE_MSG;
        this.$emptyMsg = null;
    };

    EasyDAGInitial.prototype.CREATE_MSG = 'Click to create a new node';
    EasyDAGInitial.prototype.EMPTY_MSG = ' has no valid children';

    EasyDAGInitial.prototype.onActiveNodeChanged = function(name, isEmpty) {
        this._canHaveChildren = !isEmpty || this.getValidInitialNodes().length > 0;
        if (this._canHaveChildren) {
            this._emptyMsg = this.CREATE_MSG;
        } else {
            this._emptyMsg = `${name} has no valid children`;
        }
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
            .attr('fill', '#9e9e9e');  // FIXME: Move this to css

        if (this._canHaveChildren) {
            this.$emptyMsg
                .text(this.CREATE_MSG)
                .on('click', () => {
                    d3.event.stopPropagation();
                    d3.event.preventDefault();
                    this.onCreateInitialNode();
                });
        } else {
            this.$emptyMsg.text(this.EMPTY_MSG);
        }
    };

    return EasyDAGInitial;
});
