/* globals define, d3 */
define(['d3'], function() {

    var lineFn = d3.svg.line()
        .x(d => d.x)
        .y(d => d.y)
        .interpolate('linear');

    var Connection = function(pEl, desc) {
        this.desc = desc;
        this.id = desc.id;
        this.src = desc.src;
        this.dst = desc.dst;
        this.isConnection = true;

        this.x = 10;
        this.y = 10;
        this._width = 0;
        this._height = 0;

        this.$pEl = pEl;
        this.$el = this.$pEl.append('path')
            .attr('fill', 'white');
    };

    Connection.prototype.redraw = function() {
        this.$el.attr('d', lineFn(this.points))
            .transition()
            .attr('stroke-width', 2)
            .attr('stroke', 'black')
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrowhead)');

        // Update the x,y,width, height from the points
        this.updateBounds();
    };

    Connection.prototype.updateBounds = function() {
        var minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        for (var i = this.points.length; i--;) {
            minX = Math.min(this.points[i].x, minX);
            minY = Math.min(this.points[i].y, minY);
            maxX = Math.max(this.points[i].x, maxX);
            maxY = Math.max(this.points[i].y, maxY);
        }

        this._width = maxX - minX;
        this._height = maxY - minY;
        this.x = minX + this._width/2;
        this.y = minY + this._height/2;
    };

    Connection.prototype.getWidth = function() {
        return this._width;
    };

    Connection.prototype.getHeight = function() {
        return this._height;
    };

    Connection.prototype.remove = function() {
        this.$el.remove();
    };

    Connection.prototype.onSelect =
    Connection.prototype.onDeselect = function() {
    };

    return Connection;
});
