define([
    './vim'
], function(
    vim
) {
    'use strict';

    var REGEX = /[a-zA-Z0-9]/;
    var KeyBindings = function() {
        this.HOTKEYS = {
            vimish: vim
        };
        this.hotkeys = null;
        // TODO: look up the key map in the component config
        this._loadKeyMapping();
    };

    KeyBindings.prototype.enableKeyBindings = function() {
        // Probably should attach this listener to the container not the body
        if (this.hotkeys) {
            document.body.onkeydown = this.onKeyPress.bind(this);
        }
    };

    KeyBindings.prototype.disableKeyBindings = function() {
        // TODO: change the focus when dialogs pop up
        if (this.hotkeys) {
            document.body.onkeydown = null;
        }
    };

    KeyBindings.prototype._loadKeyMapping = function() {
        // load key mapping from component settings
        var Hotkeys = this.HOTKEYS[this._config.hotkeys];
        if (Hotkeys) {
            this.hotkeys = new Hotkeys({
                logger: this._logger,
                widget: this,
                items: this.items,
                connections: this.connections});

            this.hotkeys.createAddDialog = this.onAddButtonClicked.bind(this);
            this.hotkeys.removeSubtree = this.removeItem.bind(this);
        }
    };

    KeyBindings.prototype.onKeyPress = function(event) {
        var key = String.fromCharCode(event.keyCode);

        if (event.keyCode === 27) {
            key = 'esc';
        }

        // add special keys
        key =
            (event.altKey ? 'alt ' : '') +
            (event.ctrlKey ? 'ctrl ' : '') +
            (event.shiftKey ? key : key.toLowerCase());

        if (REGEX.test(key)) {
            this.hotkeys.handleKey(key);
        }
    };

    return KeyBindings;
});
