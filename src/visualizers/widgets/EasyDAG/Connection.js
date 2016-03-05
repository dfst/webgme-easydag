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

        this.$pEl = pEl;
        this.$el = this.$pEl.append('path')
            .attr('fill', 'white');
    };

    Connection.prototype.redraw = function() {
        this.$el.attr('d', lineFn(this.points))
            .transition()
            .attr('stroke-width', 2)
            .attr('stroke', 'black')
            .attr("marker-end", "url(#arrowhead)");
    };

    Connection.prototype.remove = function() {
        this.$el.remove();
    };

    return Connection;
});
