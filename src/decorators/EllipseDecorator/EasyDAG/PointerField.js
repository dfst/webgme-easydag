/* globals define, _*/
// Interface:
//   - width
//   - destroy
//   - render
define([
    './Field'
], function(
    Field
) {
    var PointerField = function(parentEl, name, value, width, y) {
        Field.call(this, parentEl, name, value, width, y);
    };
    _.extend(PointerField.prototype, Field.prototype);
    
    PointerField.prototype.hasIcon = function() {
        return typeof this.value === 'string';
    };

    PointerField.prototype.onClick = function() {
        this.selectTargetFor(this.name);
    };

    PointerField.prototype.render = function() {
        if (this.hasIcon()) {
            Field.prototype.render.call(this);
            this.$icon.on('click', this.savePointer.bind(this, null));
        }
    };

    return PointerField;
});
