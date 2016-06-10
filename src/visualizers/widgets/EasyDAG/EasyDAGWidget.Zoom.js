/* globals define*/
define([
], function(
) {

    var EasyDAGZoom = function() {
        this._zoomValue = 1;

        // Add ctrl+scroll listeners
        this.$el.on('mousewheel', this._scrollWheelZoom.bind(this));
        this.$el.on('DOMMouseScroll', this._scrollWheelZoom.bind(this));
    };

    EasyDAGZoom.prototype.SCROLL_ZOOM_RATIO = 1/120*1/8;
    EasyDAGZoom.prototype.MIN_ZOOM = 1/120*1/8;
    EasyDAGZoom.prototype.MAX_ZOOM = 10;
    EasyDAGZoom.prototype.MIN_ZOOM = 0.10;

    EasyDAGZoom.prototype._scrollWheelZoom = function(event) {
        var org = event.originalEvent;

        if (org && (org.ctrlKey || org.metaKey || org.altKey)) {
            this.updateZoom(org.wheelDelta*this.SCROLL_ZOOM_RATIO);
            event.stopPropagation();
            event.preventDefault();
        }
    };

    EasyDAGZoom.prototype.updateZoom = function(delta) {
        this._zoomValue += delta;
        this._zoomValue = Math.min(this.MAX_ZOOM, this._zoomValue);
        this._zoomValue = Math.max(this.MIN_ZOOM, this._zoomValue);
        this.refreshUI();
    };

    return EasyDAGZoom;
});
