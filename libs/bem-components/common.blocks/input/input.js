/**
 * @module input
 */

modules.define('input', ['i-bem__dom', 'base-control'], function(provide, BEMDOM, BaseControl) {

/**
 * @exports
 * @class input
 * @augments base-control
 * @bem
 */
provide(BEMDOM.decl({ block : this.name, baseBlock : BaseControl }, /** @lends input.prototype */{
    onSetMod : {
        'js' : {
            'inited' : function() {
                this.__base.apply(this, arguments);
                this._val = this.elem('control').val();
            }
        }
    },

    /**
     * Returns control value
     * @returns {String}
     * @override
     */
    getVal : function() {
        return this._val;
    },

    /**
     * Sets control value
     * @param {String} val value
     * @param {Object} [data] additional data
     * @returns {this}
     */
    setVal : function(val, data) {
        val = String(val);

        if(this._val !== val) {
            this._val = val;

            var control = this.elem('control');
            control.val() !== val && control.val(val);

            this.emit('change', data);
        }

        return this;
    }
}, {
    live : function() {
        this.__base.apply(this, arguments);
        return false;
    }
}));

});
