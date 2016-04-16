define([
], function(
) {
    'use strict';
    var INITIAL = '__initial__';
    var StateMachine = function(validPaths) {
        this.states = {};
        // Construct the state machine from the validPaths
        this.states[INITIAL] = new State();
        this.initialize(validPaths);
    };

    StateMachine.prototype.initialize = function(paths) {
        //var actions = Object.keys(schema),
            //paths = [];

        //actions.forEach(action => paths = schema[name].concat(paths));

        // schema is of the form:
        //   - name: [p1, p2, p3]
        paths.forEach(path => this._addPath(path));
    };

    StateMachine.prototype._addPath = function(nodes) {
        var current = this.states[INITIAL],
            len = nodes.length - 1,
            node,
            nId;

        // detect duplicate states
        nodes.forEach((id, i) => {
            nId = id;

            if (current.id === nId) {
                nId += '.2';
            }

            node = this.states[nId];
            if (!node) {  // create the node
                if (nId.indexOf('%') !== 0) {  // Not hierarchical
                    node = new State({
                        id: nId,
                        terminal: i === len
                    });
                    this.states[nId] = node;
                } else {
                    node = new HState({
                        id: nId,
                        terminal: i === len
                    });
                    this.states[nId] = node;
                    // Add all the states
                    Object.keys(node.nodes)
                        .forEach(id => this.states[id] = node.nodes[id]);
                }
            }

            // Add the connection
            current.trans(id, node);
            current = node;
        });
    };

    StateMachine.prototype.initial = function() {
        return this.states[INITIAL];
    };

    var State = function(opts) {
        opts = opts || {};
        this.id = opts.id;
        this.isTerminal = opts.terminal || false;
        this.edges = {};
    };

    State.prototype.trans = function(id, node) {
        if (!node) {
            return this.edges[id] || null;
        }
        
        // setting
        if (node instanceof HState) {
            node.ids.forEach(id => {
                this.edges[id] = node.nodes[id];
            });
        } else if (node instanceof State) {
            this.edges[id] = node;
        }
    };

    var HState = function(opts) {
        opts = opts || {};
        this.id = opts.id;
        this.nodes = {};
        this.ids = HState.types[opts.id];

        this.ids.forEach(id => this.nodes[id] = new State({id}));

        var id1, id2;

        if (HState.clique[this.id]) {
            // Connect all nodes
            for (var i = this.ids.length; i--;) {
                id1 = this.ids[i];
                for (var j = this.ids.length; j--;) {
                    id2 = this.ids[j];
                    this.nodes[id2].trans(id1, this.nodes[id1]);
                }
            }
        }
    };

    HState.types = {
        '%number': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => n.toString()),
        '%dir': ['h', 'j', 'k', 'l']
    };

    HState.clique = {
        '%number': true
    };

    HState.prototype.trans = function(id, node) {
        var nodes;

        nodes = Object.keys(this.nodes)
            .map(id => this.nodes[id])
            .forEach(n => n.trans(id, node));
    };

    return StateMachine;
});
