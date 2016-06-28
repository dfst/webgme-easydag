/*globals define, $, d3, _*/
define([
    'q',
    'text!./templates/AddNodeDialog.html.ejs',
    'text!./templates/NodeRow.html'
], function(
    Q,
    AddNodeTemplate,
    NODE_ROW
) {
    'use strict';

    var COL_CLASS = 'col-md-2 col-xs-4',
        ADD_NODE_CLASS = 'add-node',
        DEFAULT_OPTS = {
            cols: 6
        };

    var AddNodeDialog = function(opts) {
        this.opts = opts || DEFAULT_OPTS;
        this._template = _.template(this.opts.html || AddNodeTemplate);
        this._dialog = null;
    };

    AddNodeDialog.prototype.show = function(title, pairs) {
        // Populate the template
        var containers = pairs.map(p => new Container(p)),
            container,
            content,
            row;

        // Create the dialog and add the nodes
        content = this._template({
            options: this.opts,
            title
        });

        this._dialog = $(content);
        container = this._dialog.find('#node-container');
        if (this.opts.tabs) {
            this._addTabbed(container, containers);
        } else {
            this._addBasic(container, containers);
        }

        containers
            .forEach(node => {
                node.html.onclick = this.onNodeClicked.bind(this, node.pair);
            });

        this._dialog.modal('show');
    };

    AddNodeDialog.prototype._addBasic = function(container, containers) {
        var row;
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
    };

    AddNodeDialog.prototype._addTabbed = function(container, containers) {
        var pane,
            containersByTab = {},
            className;

        this.opts.tabs.forEach((tab, i) => {
            className = 'tab-pane';
            if (i === 0) {
                className += ' active';
            }

            pane = $('<div>', {
                id: tab,
                class: className
            });

            // Add the nodes to the pane
            containersByTab[tab] = containers
                .filter(cntr => this.opts.tabFilter(tab, cntr.pair));

            containersByTab[tab].forEach(cntr => pane.append(cntr.html));

            container.append(pane);
        });

        // Update the sizes of nodes in the first tab
        this._dialog.on('shown.bs.modal', () =>
            containersByTab[this.opts.tabs[0]].forEach(cntr => cntr.updateSize())
        );

        this._dialog.on('shown.bs.tab', 'a[data-toggle="tab"]', (event) => {
            var tabName = event.target.getAttribute('href').substring(1);
            containersByTab[tabName].forEach(cntr => cntr.updateSize());
        });
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

    AddNodeDialog.prompt = function(nodes, opts) {
        var deferred = Q.defer();

        // Create the modal view with all possible subsequent nodes
        var dialog = new AddNodeDialog(opts);
        dialog.show(null, nodes);
        dialog.onSelect = pair => {
            if (pair) {
                deferred.resolve(pair);
            }
        };
        return deferred.promise;
    };

    return AddNodeDialog;
});
