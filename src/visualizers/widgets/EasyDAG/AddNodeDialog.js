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

    var COL_CLASS = 'easydag-node col-md-2 col-xs-4',
        DEFAULT_OPTS = {
            cols: 6,
            emptyMsg: 'No valid nodes'

        };

    var AddNodeDialog = function(opts) {
        this.opts = _.extend({}, DEFAULT_OPTS, opts);
        this._template = _.template(this.opts.html || AddNodeTemplate);
        this._dialog = null;
        this.containers = [];
    };

    AddNodeDialog.prototype.show = function(title, pairs) {
        // Populate the template
        var container,
            content,
            noNodeMsg;

        // Create the dialog and add the nodes
        this.containers = pairs.map(p => new Container(p));
        content = this._template({
            options: this.opts,
            title
        });

        this._dialog = $(content);
        container = this._dialog.find('#node-container');

        if (this.containers.length) {
            if (this.opts.tabs) {
                this._addTabbed(container);
            } else {
                this._addBasic(container);
            }

            this.containers
                .forEach(node => {
                    node.html.onclick = this.onNodeClicked.bind(this, node.pair);
                });
        } else {
            noNodeMsg = $('<div>', {class: 'empty-msg'});
            noNodeMsg.text(this.opts.emptyMsg);
            container.append(noNodeMsg);
        }
        this._dialog.modal('show');
    };

    AddNodeDialog.prototype._addBasic = function(container) {
        var row;
        this.containers
            .forEach((node, i) => {
                if (i % 6 === 0) {
                    row = $(NODE_ROW);
                    container.append(row);
                }
                row.append(node.html);

                node.html.onclick = this.onNodeClicked.bind(this, node.pair);
            });

        this._dialog.on('shown.bs.modal',
            () => this.containers.forEach(d => d.updateSize()));

        this._dialog.on('hide.bs.modal', () => this.empty());
        this._dialog.on('hidden.bs.modal', () => this._dialog.remove());
    };

    AddNodeDialog.prototype._addTabbed = function(container) {
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
            containersByTab[tab] = this.containers
                .filter(cntr => this.opts.tabFilter(tab, cntr.pair));

            containersByTab[tab].forEach(cntr => pane.append(cntr.html));

            container.append(pane);
        });

        // Update the sizes of nodes in the first tab
        this._dialog.on('shown.bs.modal', () =>
            containersByTab[this.opts.tabs[0]].forEach(cntr => cntr.updateSize())
        );

        this._dialog.on('hide.bs.modal', () => this.empty());
        this._dialog.on('hidden.bs.modal', () => this._dialog.remove());
        

        this._dialog.on('shown.bs.tab', 'a[data-toggle="tab"]', (event) => {
            var tabName = event.target.getAttribute('href').substring(1);
            containersByTab[tabName].forEach(cntr => cntr.updateSize());
        });
    };

    AddNodeDialog.prototype.empty = function() {
        this.containers.forEach(container => container.destroy());
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

    Container.prototype.destroy = function() {
        if (this.decorator.destroy) {
            this.decorator.destroy();
        }
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
