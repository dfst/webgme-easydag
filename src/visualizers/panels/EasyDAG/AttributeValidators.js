define([], function() {
    var REGEX = {
        integer: /^\d+$/,
        float: /^\d*\.?\d*$/
    };

    var validEnum = function(schema, value) {
        return !schema.enum || schema.enum.indexOf(value) !== -1;
    };
    var validators = {};
    return {
        integer: function(schema, value) {
            return REGEX.integer.test(value) && validEnum(schema, value);
        },
        float: function(schema, value) {
            return REGEX.float.test(value) && validEnum(schema, value);
        },
        string: validEnum,
    };
});
