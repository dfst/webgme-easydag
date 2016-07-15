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
    var PointerField = function(parentEl, name, value, width, y, hidden) {
        this.hidden = hidden;
        Field.call(this, parentEl, name, value, width, y);
    };
    _.extend(PointerField.prototype, Field.prototype);
    
    PointerField.prototype.hasIcon = function() {
        return typeof this.value === 'string';
    };

    PointerField.prototype.onClick = function() {
        this.selectTarget();
    };

    PointerField.prototype.render = function() {
        if (this.hasIcon() && !this.hidden) {
            Field.prototype.render.apply(this, arguments);
            this.$icon.on('click', this.savePointer.bind(this, null));
        }
    };

    return PointerField;
});
