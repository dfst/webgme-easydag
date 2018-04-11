define([
], function(
) {
    // Special adjustments
    var yFor = {
        'chevron-bottom': -4.5
    };

    var addIcon = function (icon, container, opts) {
        var radius = opts.radius,
            parent = container[0][0];

        requirejs([`text!widgets/EasyDAG/lib/open-iconic/${icon}.svg`], svgTxt => {
            var svg = $(svgTxt),
                border = opts.border || 3,
                size = opts.size || 2*(radius - border),
                iconRadius = size/2,
                x = opts.x || -iconRadius,
                y = opts.y || yFor[icon] || -iconRadius;

            // Correct the size
            svg.attr('class', 'icon ' + icon)
                .attr('x', x)
                .attr('y', y)
                .attr('width', 2*iconRadius)
                .attr('height', 2*iconRadius);

            parent.appendChild(svg[0]);
        });
    };

    return {
        addIcon: addIcon
    };
});
