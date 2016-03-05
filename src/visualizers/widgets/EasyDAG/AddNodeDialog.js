define([
    'text!./templates/AddNodeDialog.html.ejs',
    'text!./templates/NodeRow.html'
], function(
    AddNodeTemplate,
    NODE_ROW
) {
    'use strict';

    var COL_CLASS = 'col-md-2',
        ADD_NODE_CLASS = 'add-node';
    var AddNodeDialog = function() {
        this._template = _.template(AddNodeTemplate);
        this._dialog = null;
    };

    AddNodeDialog.prototype.show = function(title, pairs) {
        // Populate the template
        var self = this,
            content = this._template({title}),
            nodes = pairs.map(this.pairToHtml.bind(this)),
            container,
            row;

        // Create the dialog and add the nodes
        this._dialog = $(content);
        container = this._dialog.find('#node-container');
        nodes.forEach((html, i) => {
            if (i % 6 === 0) {
                row = $(NODE_ROW);
                container.append(row);
            }
            row.append(html);
        });
        this._dialog.modal('show');
    };

    AddNodeDialog.prototype.pairToHtml = function(pair) {
        var container = document.createElement('div'),
            decorator,
            svg = d3.select(container).append('svg'),
            x,
            y;

        decorator = new pair.node.Decorator({
            node: pair.node,
            parentEl: svg.append('g')
        });

        // Adjust the decorator position
        x = decorator.width/2;
        y = decorator.height/2;
        svg
            .attr('width', decorator.width)
            .attr('height', decorator.height)
            .on('click', this.onNodeClicked.bind(this, pair));

        decorator.render();

        container.className = COL_CLASS;

        return container;
    };

    AddNodeDialog.prototype.onNodeClicked = function(pair, event) {
        d3.event.stopPropagation();
        d3.event.preventDefault();
        this.onSelect(pair);
        this._dialog.modal('hide');
    };

    AddNodeDialog.prototype.onSelect = function() {
        // nop
        console.log('onSelect is not overridden!');
    };

    return AddNodeDialog;
});
