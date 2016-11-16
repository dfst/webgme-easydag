/* globals d3, define */
define([
    'js/Loader/LoaderCircles'
], function(
    LoaderCircles
) {
    'use strict';
    
    var EasyDAGInitial = function() {
        this._empty = true;
        this._emptyMsg = 'Click to create a new node';
        this.$emptyMsg = null;
        if (!this.isPureSvg) {
            this.loader = new LoaderCircles({
                containerElement: this.$el
            });
        } else {
            // loading circles not supported in pure svg yet...
            this.loader = null;
        }
    };

    EasyDAGInitial.prototype.updateEmptyMsg = function() {
        this._logger.debug(`updating empty message. Empty? ${this._empty}`);
        if (this.$emptyMsg) {
            this.$emptyMsg.remove();
            this.$emptyMsg = null;
        }

        if (this._empty && !this._loading) {
            this._renderEmpty();
        }
    };

    EasyDAGInitial.prototype._renderEmpty = function() {
        this.$emptyMsg = this.$svg.append('text')
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

    EasyDAGInitial.prototype.onLoadStart = function() {
        this._loading = true;
        if (!this.isPureSvg) {
            this.loader.start();
        }
    };

    EasyDAGInitial.prototype.onLoadFinished = function() {
        var hasRendered = this.width !== undefined;

        if (!this.isPureSvg) {
            this.loader.stop();
        }
        this._loading = false;
        if (hasRendered) {
            this.updateEmptyMsg();
        }
    };

    return EasyDAGInitial;
});
