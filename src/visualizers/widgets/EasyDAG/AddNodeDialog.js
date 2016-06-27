/*globals define, $, d3, _*/
define([
    'text!./templates/AddNodeDialog.html.ejs',
    'text!./templates/NodeRow.html'
], function(
    AddNodeTemplate,
    NODE_ROW
) {
    'use strict';

    var COL_CLASS = 'col-md-2 col-xs-4',
        ADD_NODE_CLASS = 'add-node';

    var AddNodeDialog = function(html) {
        this._template = _.template(html || AddNodeTemplate);
        this._dialog = null;
    };

    AddNodeDialog.prototype.show = function(title, pairs) {
        // Populate the template
        var content = this._template({title}),
            containers = pairs.map(p => new Container(p)),
            container,
            row;

        // Create the dialog and add the nodes
        this._dialog = $(content);
        container = this._dialog.find('#node-container');
        containers
            .forEach((node, i) => {
                if (i % 6 === 0) {
                    row = $(NODE_ROW);
                    container.append(row);
                }
                row.append(node.html);
                node.html.onclick = this.onNodeClicked.bind(this, node.pair);
            });
        this._dialog.on('shown.bs.modal',
            () => containers.forEach(d => d.updateSize()));
        this._dialog.modal('show');
    };

    AddNodeDialog.prototype.onNodeClicked = function(pair, event) {
        event.stopPropagation();
        event.preventDefault();
        this.onSelect(pair);
        this._dialog.modal('hide');
    };

    AddNodeDialog.prototype.onSelect = function() {
        // nop
        console.log('onSelect is not overridden!');
    };

    var Container = function(pair) {
        this.pair = pair;
        this.html = document.createElement('div');
        this.svg = d3.select(this.html).append('svg');
        this.decorator = new pair.node.Decorator({
            node: pair.node,
            parentEl: this.svg
        });

        this.html.className = COL_CLASS;
    };

    Container.prototype.updateSize = function() {
        this.decorator.render();
        this.html.style.width = this.decorator.width + 'px';
        this.html.style.height = this.decorator.height + 'px';
        this.svg.attr('width', this.decorator.width);
        this.svg.attr('height', this.decorator.height);
    };

    AddNodeDialog.prompt = function(nodes, callback) {
        // If only one, don't prompt
        if (nodes.length > 1) {
            // Create the modal view with all possible subsequent nodes
            var dialog = new AddNodeDialog();
            dialog.show(null, nodes);
            dialog.onSelect = pair => {
                if (pair) {
                    callback(pair);
                }
            };
        } else if (nodes[0]) {
            callback(nodes[0]);
        }
    };

    return AddNodeDialog;
});
