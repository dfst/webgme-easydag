define([
    './state-machine'
], function(
    StateMachine
) {
    'use strict';
    var LATERAL_MARGIN = 50,
        NUMBER_REGEX = /[0-9]/;

    var vim = function(opts) {
        // TODO: Add the window info
        this._logger = opts.logger.fork('vimish');
        this._items = opts.items;
        this._conns = opts.connections;
        this._widget = opts.widget;

        this._selected = null;
        this._prev = null;
        this._command = [];
        this.state = null;
        this.initialize();
    };

    vim.prototype.initialize = function() {
        this.startCmds = {  // by start key
            'esc': this.deselect.bind(this),

            'a': this.addSuccessor.bind(this),
            'd': this.remove.bind(this),
            'u': this.undo.bind(this),
            'R': this.redo.bind(this)
        };

        this.endCmds = {  // by end key
        };

        var keyMap = {
            'add': [['a']],
            'delete': [
                ['d', 'd']//,
                //['d', '%number', '%dir']
            ],
            'exit': [['esc']],
            'undo': [['u']],
            'redo': [['R']]
        };

        // Add movement keys
        var movement = {
                'j': 'Down',
                'k': 'Up',
                'h': 'Left',
                'l': 'Right'
            },
            keys = Object.keys(movement);

        keys.forEach(key => {
            var dir = movement[key];
            this.startCmds[key] = this.move.bind(this, dir, 1);
            this.endCmds[key] = this.move.bind(this, dir);

            // Create the keyMap
            keyMap['move'+dir] = [
                [key],
                ['%number', key]
            ];
        });

        var paths = Object.keys(keyMap).map(id => keyMap[id])
            .reduce((l1, l2) => l1.concat(l2));
        this.validCommands = new StateMachine(paths);
        this.state = this.validCommands.initial();
    };

    vim.prototype.handleKey = function(key) {
        // Add to the current command
        this._command.push(key);

        // Check if it is a valid command/cmd fragment
        this.state = this.state.trans(key);

        this._logger.debug('current command is:', this._command);
        if (this.state) {
            // If so, check if it is complete
            if (this.state.isTerminal) {
                // Execute the command
                this.executeCmd(this._command);
                this._command = [];
                this.state = this.validCommands.initial();
            }
        } else {  // Else, terminate the given command
            this._logger.debug('invalid command. resetting...');
            this._command = [];
            this.state = this.validCommands.initial();
        }
    };

    vim.prototype.executeCmd = function(keys) {
        this._logger.debug('executing command:', keys);
        var start = keys[0],
            last = keys[keys.length-1],
            args = this.mergeNumbers(keys);

        if (this.startCmds[start]) {
            this.startCmds[start].apply(this, args.slice(1));
        } else if (this.endCmds[last]) {
            this.endCmds[last].apply(this, args.slice(args.length-1));
        }
    };

    vim.prototype.mergeNumbers = function(keys) {
        var num = '',
            result = [];

        for (var i = keys.length; i--;) {
            if (NUMBER_REGEX.test(keys[i])) {
                num += keys[i];
            } else {
                if (num.length) {
                    result.push(+num);
                    num = '';
                }
                result.push(keys[i]);
            }
        }

        if (num.length) {
            result.push(+num);
        }

        return result;
    };

    vim.prototype.select = function(id) {
        this.deselect();
        this._selected = this._items[id];
        this._selected.highlight();
    };

    vim.prototype.deselect = function() {
        if (this._selected) {
            this._selected.clear();
            this._prev = this._selected;
            this._selected = null;
        }
    };

    vim.prototype._getParents = function(id) {
        return Object.keys(this._conns).map(id => this._conns[id])
            .filter(conn => conn.dst === id)
            .map(conn => conn.src);
    };

    vim.prototype._getSuccessors = function(id) {
        return Object.keys(this._conns).map(id => this._conns[id])
            .filter(conn => conn.src === id)
            .map(conn => conn.dst);
    };

    vim.prototype._getClosestX = function(x, ids) {
        return ids
            .map(id => this._items[id])
            .sort((n1, n2) => Math.abs(x-n1.x) >= Math.abs(x-n2.x))
            .shift();
    };

    vim.withinLatMargin = function(n1, n2) {
        // compare 
        var margin = Math.abs(n1.y - n2.y) - n1.height/2 - n2.height/2;
        return margin < LATERAL_MARGIN;
    };

////////////////// movement //////////////////

    vim.prototype.move = function(dir, distance) {
        if (!this._selected) {
            this.initMovement();
        } else {
            while (distance--) {
                this['move' + dir]();
            }
        }
    };

    vim.prototype.moveDown = function() {
        // Get the successors of the current node
        var successors = this._getSuccessors(this._selected.id);

        // Move to the one with the closest x value
        var x = this._selected.x,
            next = this._getClosestX(x, successors);

        if (next) {
            this.select(next.id);
        }
    };

    vim.prototype.moveUp = function() {
        // Get the parents of the current node
        var parents = this._getParents(this._selected.id);

        // Move to the one with the closest x value
        var x = this._selected.x,
            next = this._getClosestX(x, parents);

        if (next) {
            this.select(next.id);
        }
    };

    vim.prototype.moveRight = function() {
        // Get the node closest to the right
        var items = Object.keys(this._items).map(id => this._items[id]),
            x = this._selected.x,
            y = this._selected.y,
            next;

        next = items
            .filter(node => node.x > x)
            .filter(vim.withinLatMargin.bind(null, this._selected))
            .sort((n1, n2) => n1.x > n2.x)
            .shift();

        if (next) {
            this.select(next.id);
        }
    };

    vim.prototype.moveLeft = function() {
        // Get the node closest to the right
        var items = Object.keys(this._items).map(id => this._items[id]),
            x = this._selected.x,
            y = this._selected.y,
            next;

        next = items
            .filter(node => node.x < x)
            .filter(vim.withinLatMargin.bind(null, this._selected))
            .sort((n1, n2) => n1.x < n2.x)
            .shift();

        if (next) {
            this.select(next.id);
        }
    };

    vim.prototype.initMovement = function() {
        if (!this._selected) {
            var id;

            if (this._prev) {
                id = this._prev.id;
            }

            // for now, choose randomly
            id = this._items[id] ? id : Object.keys(this._items).shift();

            if (id) {
                this.select(id);
            }
        }
    };

////////////////// create/delete //////////////////

    vim.prototype.addSuccessor = function() {
        if (this._selected) {
            this.createAddDialog(this._selected);
            // TODO: Check if a success can be added and give feedback if not
        }
    };

    vim.prototype.remove = function(distance, dir) {
        if (distance === 'd') {  // default behavior
            this.hardRemoveNode();
        } else {
            this._logger.warn('complex delete commands are currently unsupported');
        }

        // add support for directional deletion!
        // TODO
        //var n = this._selected,
            //move = this.startCmds[dir].bind(this, 1);

        //distance--;
        //while (distance--) {
            //move();
            //this.hardRemoveNode(n);
            //n = this._selected;
        //}
    };

    vim.prototype.hardRemoveNode = function(node) {
        node = node || this._selected;
        if (this._selected) {
            // check for parent to fall back on
            var parents = this._getParents(this._selected.id),
                nextId = parents ? parents.shift() : null;

            this.removeSubtree(this._selected);

            if (nextId) {
                this.select(nextId);
            } else {
                this.selected = null;
            }
        }
    };

////////////////// undo/redo //////////////////
    vim.prototype.undo = function() {
        this._widget.undo();
    };

    vim.prototype.redo = function() {
        this._widget.redo();
    };
// TODO

    return vim;
});
