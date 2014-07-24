/* begin: ../../libs/bem-core/common.blocks/i-bem/i-bem.vanilla.js */
/**
 * @module i-bem
 */

modules.define(
    'i-bem',
    [
        'i-bem__internal',
        'inherit',
        'identify',
        'next-tick',
        'objects',
        'functions',
        'events'
    ],
    function(
        provide,
        INTERNAL,
        inherit,
        identify,
        nextTick,
        objects,
        functions,
        events) {

var undef,

    MOD_DELIM = INTERNAL.MOD_DELIM,
    ELEM_DELIM = INTERNAL.ELEM_DELIM,

    /**
     * Storage for block init functions
     * @private
     * @type Array
     */
    initFns = [],

    /**
     * Storage for block declarations (hash by block name)
     * @private
     * @type Object
     */
    blocks = {};

/**
 * Builds the name of the handler method for setting a modifier
 * @param {String} prefix
 * @param {String} modName Modifier name
 * @param {String} modVal Modifier value
 * @param {String} [elemName] Element name
 * @returns {String}
 */
function buildModFnName(prefix, modName, modVal, elemName) {
    return '__' + prefix +
        (elemName? '__elem_' + elemName : '') +
       '__mod' +
       (modName? '_' + modName : '') +
       (modVal? '_' + modVal : '');
}

/**
 * Transforms a hash of modifier handlers to methods
 * @param {String} prefix
 * @param {Object} modFns
 * @param {Object} props
 * @param {String} [elemName]
 */
function modFnsToProps(prefix, modFns, props, elemName) {
    if(functions.isFunction(modFns)) {
        props[buildModFnName(prefix, '*', '*', elemName)] = modFns;
    } else {
        var modName, modVal, modFn;
        for(modName in modFns) {
            if(modFns.hasOwnProperty(modName)) {
                modFn = modFns[modName];
                if(functions.isFunction(modFn)) {
                    props[buildModFnName(prefix, modName, '*', elemName)] = modFn;
                } else {
                    for(modVal in modFn) {
                        if(modFn.hasOwnProperty(modVal)) {
                            props[buildModFnName(prefix, modName, modVal, elemName)] = modFn[modVal];
                        }
                    }
                }
            }
        }
    }
}

function buildCheckMod(modName, modVal) {
    return modVal?
        Array.isArray(modVal)?
            function(block) {
                var i = 0, len = modVal.length;
                while(i < len)
                    if(block.hasMod(modName, modVal[i++]))
                        return true;
                return false;
            } :
            function(block) {
                return block.hasMod(modName, modVal);
            } :
        function(block) {
            return block.hasMod(modName);
        };
}

function convertModHandlersToMethods(props) {
    if(props.beforeSetMod) {
        modFnsToProps('before', props.beforeSetMod, props);
        delete props.beforeSetMod;
    }

    if(props.onSetMod) {
        modFnsToProps('after', props.onSetMod, props);
        delete props.onSetMod;
    }

    var elemName;
    if(props.beforeElemSetMod) {
        for(elemName in props.beforeElemSetMod) {
            if(props.beforeElemSetMod.hasOwnProperty(elemName)) {
                modFnsToProps('before', props.beforeElemSetMod[elemName], props, elemName);
            }
        }
        delete props.beforeElemSetMod;
    }

    if(props.onElemSetMod) {
        for(elemName in props.onElemSetMod) {
            if(props.onElemSetMod.hasOwnProperty(elemName)) {
                modFnsToProps('after', props.onElemSetMod[elemName], props, elemName);
            }
        }
        delete props.onElemSetMod;
    }
}

/**
 * @class BEM
 * @description Base block for creating BEM blocks
 * @augments events:Emitter
 * @exports
 */
var BEM = inherit(events.Emitter, /** @lends BEM.prototype */ {
    /**
     * @constructor
     * @private
     * @param {Object} mods Block modifiers
     * @param {Object} params Block parameters
     * @param {Boolean} [initImmediately=true]
     */
    __constructor : function(mods, params, initImmediately) {
        /**
         * Cache of block modifiers
         * @member {Object}
         * @private
         */
        this._modCache = mods || {};

        /**
         * Current modifiers in the stack
         * @member {Object}
         * @private
         */
        this._processingMods = {};

        /**
         * Block parameters, taking into account the defaults
         * @member {Object}
         * @readonly
         */
        this.params = objects.extend(this.getDefaultParams(), params);

        initImmediately !== false?
            this._init() :
            initFns.push(this._init, this);
    },

    /**
     * Initializes the block
     * @private
     */
    _init : function() {
        return this.setMod('js', 'inited');
    },

    /**
     * Adds an event handler
     * @param {String|Object} e Event type
     * @param {Object} [data] Additional data that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [ctx] Handler context
     * @returns {this}
     */
    on : function(e, data, fn, ctx) {
        if(typeof e === 'object' && (functions.isFunction(data) || functions.isFunction(fn))) { // mod change event
            e = this.__self._buildModEventName(e);
        }

        return this.__base.apply(this, arguments);
    },

    /**
     * Removes event handler or handlers
     * @param {String|Object} [e] Event type
     * @param {Function} [fn] Handler
     * @param {Object} [ctx] Handler context
     * @returns {this}
     */
    un : function(e, fn, ctx) {
        if(typeof e === 'object' && functions.isFunction(fn)) { // mod change event
            e = this.__self._buildModEventName(e);
        }

        return this.__base.apply(this, arguments);
    },

    /**
     * Executes the block's event handlers and live event handlers
     * @protected
     * @param {String} e Event name
     * @param {Object} [data] Additional information
     * @returns {this}
     */
    emit : function(e, data) {
        var isModJsEvent = false;
        if(typeof e === 'object' && !(e instanceof events.Event)) {
            isModJsEvent = e.modName === 'js';
            e = this.__self._buildModEventName(e);
        }

        if(isModJsEvent || this.hasMod('js', 'inited')) {
            this.__base(e = this._buildEvent(e), data);
            this._ctxEmit(e, data);
        }

        return this;
    },

    _ctxEmit : function(e, data) {
        this.__self.emit(e, data);
    },

    /**
     * Builds event
     * @private
     * @param {String|events:Event} e
     * @returns {events:Event}
     */
    _buildEvent : function(e) {
        typeof e === 'string'?
            e = new events.Event(e, this) :
            e.target || (e.target = this);

        return e;
    },

    /**
     * Checks whether a block or nested element has a modifier
     * @param {Object} [elem] Nested element
     * @param {String} modName Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {Boolean}
     */
    hasMod : function(elem, modName, modVal) {
        var len = arguments.length,
            invert = false;

        if(len === 1) {
            modVal = '';
            modName = elem;
            elem = undef;
            invert = true;
        } else if(len === 2) {
            if(typeof elem === 'string') {
                modVal = modName;
                modName = elem;
                elem = undef;
            } else {
                modVal = '';
                invert = true;
            }
        }

        var res = this.getMod(elem, modName) === modVal;
        return invert? !res : res;
    },

    /**
     * Returns the value of the modifier of the block/nested element
     * @param {Object} [elem] Nested element
     * @param {String} modName Modifier name
     * @returns {String} Modifier value
     */
    getMod : function(elem, modName) {
        var type = typeof elem;
        if(type === 'string' || type === 'undefined') { // elem either omitted or undefined
            modName = elem || modName;
            var modCache = this._modCache;
            return modName in modCache?
                modCache[modName] || '' :
                modCache[modName] = this._extractModVal(modName);
        }

        return this._getElemMod(modName, elem);
    },

    /**
     * Returns the value of the modifier of the nested element
     * @private
     * @param {String} modName Modifier name
     * @param {Object} elem Nested element
     * @param {Object} [elemName] Nested element name
     * @returns {String} Modifier value
     */
    _getElemMod : function(modName, elem, elemName) {
        return this._extractModVal(modName, elem, elemName);
    },

    /**
     * Returns values of modifiers of the block/nested element
     * @param {Object} [elem] Nested element
     * @param {String} [...modNames] Modifier names
     * @returns {Object} Hash of modifier values
     */
    getMods : function(elem) {
        var hasElem = elem && typeof elem !== 'string',
            modNames = [].slice.call(arguments, hasElem? 1 : 0),
            res = this._extractMods(modNames, hasElem? elem : undef);

        if(!hasElem) { // caching
            modNames.length?
                modNames.forEach(function(name) {
                    this._modCache[name] = res[name];
                }, this) :
                this._modCache = res;
        }

        return res;
    },

    /**
     * Sets the modifier for a block/nested element
     * @param {Object} [elem] Nested element
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @returns {this}
     */
    setMod : function(elem, modName, modVal) {
        if(typeof modVal === 'undefined') {
            if(typeof elem === 'string') { // if no elem
                modVal = typeof modName === 'undefined'?
                    true :  // e.g. setMod('focused')
                    modName; // e.g. setMod('js', 'inited')
                modName = elem;
                elem = undef;
            } else { // if elem
                modVal = true; // e.g. setMod(elem, 'focused')
            }
        }

        if(!elem || elem[0]) {
            modVal === false && (modVal = '');

            var modId = (elem && elem[0]? identify(elem[0]) : '') + '_' + modName;

            if(this._processingMods[modId])
                return this;

            var elemName,
                curModVal = elem?
                    this._getElemMod(modName, elem, elemName = this.__self._extractElemNameFrom(elem)) :
                    this.getMod(modName);

            if(curModVal === modVal)
                return this;

            this._processingMods[modId] = true;

            var needSetMod = true,
                modFnParams = [modName, modVal, curModVal];

            elem && modFnParams.unshift(elem);

            var modVars = [['*', '*'], [modName, '*'], [modName, modVal]],
                prefixes = ['before', 'after'],
                i = 0, prefix, j, modVar;

            while(prefix = prefixes[i++]) {
                j = 0;
                while(modVar = modVars[j++]) {
                    if(this._callModFn(prefix, elemName, modVar[0], modVar[1], modFnParams) === false) {
                        needSetMod = false;
                        break;
                    }
                }

                if(!needSetMod) break;

                if(prefix === 'before') {
                    elem || (this._modCache[modName] = modVal); // cache only block mods
                    this._onSetMod(modName, modVal, curModVal, elem, elemName);
                }
            }

            this._processingMods[modId] = null;
            this._emitModChangeEvents(modName, modVal, curModVal, elem, elemName);
        }

        return this;
    },

    /**
     * Function after successfully changing the modifier of the block/nested element
     * @protected
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {String} oldModVal Old modifier value
     * @param {Object} [elem] Nested element
     * @param {String} [elemName] Element name
     */
    _onSetMod : function(modName, modVal, oldModVal, elem, elemName) {},

    _emitModChangeEvents : function(modName, modVal, oldModVal, elem, elemName) {
        var eventData = { modName : modName, modVal : modVal, oldModVal : oldModVal };
        elem && (eventData.elem = elem);
        this
            .emit({ modName : modName, modVal : '*', elem : elemName }, eventData)
            .emit({ modName : modName, modVal : modVal, elem : elemName }, eventData);
    },

    /**
     * Sets a modifier for a block/nested element, depending on conditions.
     * If the condition parameter is passed: when true, modVal1 is set; when false, modVal2 is set.
     * If the condition parameter is not passed: modVal1 is set if modVal2 was set, or vice versa.
     * @param {Object} [elem] Nested element
     * @param {String} modName Modifier name
     * @param {String} modVal1 First modifier value
     * @param {String} [modVal2] Second modifier value
     * @param {Boolean} [condition] Condition
     * @returns {this}
     */
    toggleMod : function(elem, modName, modVal1, modVal2, condition) {
        if(typeof elem === 'string') { // if this is a block
            condition = modVal2;
            modVal2 = modVal1;
            modVal1 = modName;
            modName = elem;
            elem = undef;
        }

        if(typeof modVal1 === 'undefined') { // boolean mod
            modVal1 = true;
        }

        if(typeof modVal2 === 'undefined') {
            modVal2 = '';
        } else if(typeof modVal2 === 'boolean') {
            condition = modVal2;
            modVal2 = '';
        }

        var modVal = this.getMod(elem, modName);
        (modVal === modVal1 || modVal === modVal2) &&
            this.setMod(
                elem,
                modName,
                typeof condition === 'boolean'?
                    (condition? modVal1 : modVal2) :
                    this.hasMod(elem, modName, modVal1)? modVal2 : modVal1);

        return this;
    },

    /**
     * Removes a modifier from a block/nested element
     * @protected
     * @param {Object} [elem] Nested element
     * @param {String} modName Modifier name
     * @returns {this}
     */
    delMod : function(elem, modName) {
        if(!modName) {
            modName = elem;
            elem = undef;
        }

        return this.setMod(elem, modName, '');
    },

    /**
     * Executes handlers for setting modifiers
     * @private
     * @param {String} prefix
     * @param {String} elemName Element name
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {Array} modFnParams Handler parameters
     */
    _callModFn : function(prefix, elemName, modName, modVal, modFnParams) {
        var modFnName = buildModFnName(prefix, modName, modVal, elemName);
        return this[modFnName]?
           this[modFnName].apply(this, modFnParams) :
           undef;
    },

    /**
     * Retrieves the value of the modifier
     * @private
     * @param {String} modName Modifier name
     * @param {Object} [elem] Element
     * @returns {String} Modifier value
     */
    _extractModVal : function(modName, elem) {
        return '';
    },

    /**
     * Retrieves name/value for a list of modifiers
     * @private
     * @param {Array} modNames Names of modifiers
     * @param {Object} [elem] Element
     * @returns {Object} Hash of modifier values by name
     */
    _extractMods : function(modNames, elem) {
        return {};
    },

    /**
     * Returns a block's default parameters
     * @protected
     * @returns {Object}
     */
    getDefaultParams : function() {
        return {};
    },

    /**
     * Deletes a block
     * @private
     */
    _destruct : function() {
        this.delMod('js');
    },

    /**
     * Executes given callback on next turn eventloop in block's context
     * @protected
     * @param {Function} fn callback
     * @returns {this}
     */
    nextTick : function(fn) {
        var _this = this;
        nextTick(function() {
            _this.hasMod('js', 'inited') && fn.call(_this);
        });
        return this;
    }
}, /** @lends BEM */{

    _name : 'i-bem',

    /**
     * Storage for block declarations (hash by block name)
     * @type Object
     */
    blocks : blocks,

    /**
     * Declares blocks and creates a block class
     * @param {String|Object} decl Block name (simple syntax) or description
     * @param {String} decl.block|decl.name Block name
     * @param {String} [decl.baseBlock] Name of the parent block
     * @param {Array} [decl.baseMix] Mixed block names
     * @param {String} [decl.modName] Modifier name
     * @param {String|Array} [decl.modVal] Modifier value
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function}
     */
    decl : function(decl, props, staticProps) {
        // string as block
        typeof decl === 'string' && (decl = { block : decl });
        // inherit from itself
        if(arguments.length <= 2 &&
                typeof decl === 'object' &&
                (!decl || (typeof decl.block !== 'string' && typeof decl.modName !== 'string'))) {
            staticProps = props;
            props = decl;
            decl = {};
        }
        typeof decl.block === 'undefined' && (decl.block = this.getName());

        var baseBlock;
        if(typeof decl.baseBlock === 'undefined')
            baseBlock = blocks[decl.block] || this;
        else if(typeof decl.baseBlock === 'string') {
            baseBlock = blocks[decl.baseBlock];
            if(!baseBlock)
                throw('baseBlock "' + decl.baseBlock + '" for "' + decl.block + '" is undefined');
        } else {
            baseBlock = decl.baseBlock;
        }

        convertModHandlersToMethods(props || (props = {}));

        if(decl.modName) {
            var checkMod = buildCheckMod(decl.modName, decl.modVal);
            objects.each(props, function(prop, name) {
                functions.isFunction(prop) &&
                    (props[name] = function() {
                        var method;
                        if(checkMod(this)) {
                            method = prop;
                        } else {
                            var baseMethod = baseBlock.prototype[name];
                            baseMethod && baseMethod !== prop &&
                                (method = this.__base);
                        }
                        return method?
                            method.apply(this, arguments) :
                            undef;
                    });
            });
        }

        if(staticProps && typeof staticProps.live === 'boolean') {
            var live = staticProps.live;
            staticProps.live = function() {
                return live;
            };
        }

        var block, baseBlocks = baseBlock;
        if(decl.baseMix) {
            baseBlocks = [baseBlocks];
            decl.baseMix.forEach(function(mixedBlock) {
                if(!blocks[mixedBlock]) {
                    throw('mix block "' + mixedBlock + '" for "' + decl.block + '" is undefined');
                }
                baseBlocks.push(blocks[mixedBlock]);
            });
        }

        decl.block === baseBlock.getName()?
            // makes a new "live" if the old one was already executed
            (block = inherit.self(baseBlocks, props, staticProps))._processLive(true) :
            (block = blocks[decl.block] = inherit(baseBlocks, props, staticProps))._name = decl.block;

        return block;
    },

    declMix : function(block, props, staticProps) {
        convertModHandlersToMethods(props || (props = {}));
        return blocks[block] = inherit(props, staticProps);
    },

    /**
     * Processes a block's live properties
     * @private
     * @param {Boolean} [heedLive=false] Whether to take into account that the block already processed its live properties
     * @returns {Boolean} Whether the block is a live block
     */
    _processLive : function(heedLive) {
        return false;
    },

    /**
     * Factory method for creating an instance of the block named
     * @param {String|Object} block Block name or description
     * @param {Object} [params] Block parameters
     * @returns {BEM}
     */
    create : function(block, params) {
        typeof block === 'string' && (block = { block : block });

        return new blocks[block.block](block.mods, params);
    },

    /**
     * Returns the name of the current block
     * @returns {String}
     */
    getName : function() {
        return this._name;
    },

    /**
     * Adds an event handler
     * @param {String|Object} e Event type
     * @param {Object} [data] Additional data that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [ctx] Handler context
     * @returns {this}
     */
    on : function(e, data, fn, ctx) {
        if(typeof e === 'object' && (functions.isFunction(data) || functions.isFunction(fn))) { // mod change event
            e = this._buildModEventName(e);
        }

        return this.__base.apply(this, arguments);
    },

    /**
     * Removes event handler or handlers
     * @param {String|Object} [e] Event type
     * @param {Function} [fn] Handler
     * @param {Object} [ctx] Handler context
     * @returns {this}
     */
    un : function(e, fn, ctx) {
        if(typeof e === 'object' && functions.isFunction(fn)) { // mod change event
            e = this._buildModEventName(e);
        }

        return this.__base.apply(this, arguments);
    },

    _buildModEventName : function(modEvent) {
        var res = MOD_DELIM + modEvent.modName + MOD_DELIM + (modEvent.modVal === false? '' : modEvent.modVal);
        modEvent.elem && (res = ELEM_DELIM + modEvent.elem + res);
        return res;
    },

    /**
     * Retrieves the name of an element nested in a block
     * @private
     * @param {Object} elem Nested element
     * @returns {String|undefined}
     */
    _extractElemNameFrom : function(elem) {},

    /**
     * Executes the block init functions
     * @private
     */
    _runInitFns : function() {
        if(initFns.length) {
            var fns = initFns,
                fn, i = 0;

            initFns = [];
            while(fn = fns[i]) {
                fn.call(fns[i + 1]);
                i += 2;
            }
        }
    }
});

provide(BEM);

});

/* end: ../../libs/bem-core/common.blocks/i-bem/i-bem.vanilla.js */
/* begin: ../../libs/bem-core/common.blocks/i-bem/__internal/i-bem__internal.vanilla.js */
/**
 * @module i-bem__internal
 */

modules.define('i-bem__internal', function(provide) {

var undef,
    /**
     * Separator for modifiers and their values
     * @const
     * @type String
     */
    MOD_DELIM = '_',

    /**
     * Separator between names of a block and a nested element
     * @const
     * @type String
     */
    ELEM_DELIM = '__',

    /**
     * Pattern for acceptable element and modifier names
     * @const
     * @type String
     */
    NAME_PATTERN = '[a-zA-Z0-9-]+';

function isSimple(obj) {
    var typeOf = typeof obj;
    return typeOf === 'string' || typeOf === 'number' || typeOf === 'boolean';
}

function buildModPostfix(modName, modVal) {
    var res = '';
    /* jshint eqnull: true */
    if(modVal != null && modVal !== false) {
        res += MOD_DELIM + modName;
        modVal !== true && (res += MOD_DELIM + modVal);
    }
    return res;
}

function buildBlockClass(name, modName, modVal) {
    return name + buildModPostfix(modName, modVal);
}

function buildElemClass(block, name, modName, modVal) {
    return buildBlockClass(block, undef, undef) +
        ELEM_DELIM + name +
        buildModPostfix(modName, modVal);
}

provide(/** @exports */{
    NAME_PATTERN : NAME_PATTERN,

    MOD_DELIM : MOD_DELIM,
    ELEM_DELIM : ELEM_DELIM,

    buildModPostfix : buildModPostfix,

    /**
     * Builds the class of a block or element with a modifier
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String|Number} [modVal] Modifier value
     * @returns {String} Class
     */
    buildClass : function(block, elem, modName, modVal) {
        if(isSimple(modName)) {
            if(!isSimple(modVal)) {
                modVal = modName;
                modName = elem;
                elem = undef;
            }
        } else if(typeof modName !== 'undefined') {
            modName = undef;
        } else if(elem && typeof elem !== 'string') {
            elem = undef;
        }

        if(!(elem || modName)) { // optimization for simple case
            return block;
        }

        return elem?
            buildElemClass(block, elem, modName, modVal) :
            buildBlockClass(block, modName, modVal);
    },

    /**
     * Builds full classes for a buffer or element with modifiers
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {Object} [mods] Modifiers
     * @returns {String} Class
     */
    buildClasses : function(block, elem, mods) {
        if(elem && typeof elem !== 'string') {
            mods = elem;
            elem = undef;
        }

        var res = elem?
            buildElemClass(block, elem, undef, undef) :
            buildBlockClass(block, undef, undef);

        if(mods) {
            for(var modName in mods) {
                if(mods.hasOwnProperty(modName) && mods[modName]) {
                    res += ' ' + (elem?
                        buildElemClass(block, elem, modName, mods[modName]) :
                        buildBlockClass(block, modName, mods[modName]));
                }
            }
        }

        return res;
    }
});

});
/* end: ../../libs/bem-core/common.blocks/i-bem/__internal/i-bem__internal.vanilla.js */
/* begin: ../../libs/bem-core/common.blocks/inherit/inherit.vanilla.js */
/**
 * @module inherit
 * @version 2.2.1
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @description This module provides some syntax sugar for "class" declarations, constructors, mixins, "super" calls and static members.
 */

(function(global) {

var hasIntrospection = (function(){'_';}).toString().indexOf('_') > -1,
    emptyBase = function() {},
    hasOwnProperty = Object.prototype.hasOwnProperty,
    objCreate = Object.create || function(ptp) {
        var inheritance = function() {};
        inheritance.prototype = ptp;
        return new inheritance();
    },
    objKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            hasOwnProperty.call(obj, i) && res.push(i);
        }
        return res;
    },
    extend = function(o1, o2) {
        for(var i in o2) {
            hasOwnProperty.call(o2, i) && (o1[i] = o2[i]);
        }

        return o1;
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    isFunction = function(obj) {
        return toStr.call(obj) === '[object Function]';
    },
    noOp = function() {},
    needCheckProps = true,
    testPropObj = { toString : '' };

for(var i in testPropObj) { // fucking ie hasn't toString, valueOf in for
    testPropObj.hasOwnProperty(i) && (needCheckProps = false);
}

var specProps = needCheckProps? ['toString', 'valueOf'] : null;

function getPropList(obj) {
    var res = objKeys(obj);
    if(needCheckProps) {
        var specProp, i = 0;
        while(specProp = specProps[i++]) {
            obj.hasOwnProperty(specProp) && res.push(specProp);
        }
    }

    return res;
}

function override(base, res, add) {
    var addList = getPropList(add),
        j = 0, len = addList.length,
        name, prop;
    while(j < len) {
        if((name = addList[j++]) === '__self') {
            continue;
        }
        prop = add[name];
        if(isFunction(prop) &&
                (!hasIntrospection || prop.toString().indexOf('.__base') > -1)) {
            res[name] = (function(name, prop) {
                var baseMethod = base[name]?
                        base[name] :
                        name === '__constructor'? // case of inheritance from plane function
                            res.__self.__parent :
                            noOp;
                return function() {
                    var baseSaved = this.__base;
                    this.__base = baseMethod;
                    var res = prop.apply(this, arguments);
                    this.__base = baseSaved;
                    return res;
                };
            })(name, prop);
        } else {
            res[name] = prop;
        }
    }
}

function applyMixins(mixins, res) {
    var i = 1, mixin;
    while(mixin = mixins[i++]) {
        res?
            isFunction(mixin)?
                inherit.self(res, mixin.prototype, mixin) :
                inherit.self(res, mixin) :
            res = isFunction(mixin)?
                inherit(mixins[0], mixin.prototype, mixin) :
                inherit(mixins[0], mixin);
    }
    return res || mixins[0];
}

/**
* Creates class
* @exports
* @param {Function|Array} [baseClass|baseClassAndMixins] class (or class and mixins) to inherit from
* @param {Object} prototypeFields
* @param {Object} [staticFields]
* @returns {Function} class
*/
function inherit() {
    var args = arguments,
        withMixins = isArray(args[0]),
        hasBase = withMixins || isFunction(args[0]),
        base = hasBase? withMixins? applyMixins(args[0]) : args[0] : emptyBase,
        props = args[hasBase? 1 : 0] || {},
        staticProps = args[hasBase? 2 : 1],
        res = props.__constructor || (hasBase && base.prototype.__constructor)?
            function() {
                return this.__constructor.apply(this, arguments);
            } :
            hasBase?
                function() {
                    return base.apply(this, arguments);
                } :
                function() {};

    if(!hasBase) {
        res.prototype = props;
        res.prototype.__self = res.prototype.constructor = res;
        return extend(res, staticProps);
    }

    extend(res, base);

    res.__parent = base;

    var basePtp = base.prototype,
        resPtp = res.prototype = objCreate(basePtp);

    resPtp.__self = resPtp.constructor = res;

    props && override(basePtp, resPtp, props);
    staticProps && override(base, res, staticProps);

    return res;
}

inherit.self = function() {
    var args = arguments,
        withMixins = isArray(args[0]),
        base = withMixins? applyMixins(args[0], args[0][0]) : args[0],
        props = args[1],
        staticProps = args[2],
        basePtp = base.prototype;

    props && override(basePtp, basePtp, props);
    staticProps && override(base, base, staticProps);

    return base;
};

var defineAsGlobal = true;
if(typeof exports === 'object') {
    module.exports = inherit;
    defineAsGlobal = false;
}

if(typeof modules === 'object') {
    modules.define('inherit', function(provide) {
        provide(inherit);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = inherit;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.inherit = inherit);

})(this);

/* end: ../../libs/bem-core/common.blocks/inherit/inherit.vanilla.js */
/* begin: ../../libs/bem-core/common.blocks/identify/identify.vanilla.js */
/**
 * @module identify
 */

modules.define('identify', function(provide) {

var counter = 0,
    expando = '__' + (+new Date),
    get = function() {
        return 'uniq' + (++counter);
    };

provide(
    /**
     * Makes unique ID
     * @exports
     * @param {Object} obj Object that needs to be identified
     * @param {Boolean} [onlyGet=false] Return a unique value only if it had already been assigned before
     * @returns {String} ID
     */
    function(obj, onlyGet) {
        if(!obj) return get();

        var key = 'uniqueID' in obj? 'uniqueID' : expando; // Use when possible native uniqueID for elements in IE

        return onlyGet || key in obj?
            obj[key] :
            obj[key] = get();
    }
);

});

/* end: ../../libs/bem-core/common.blocks/identify/identify.vanilla.js */
/* begin: ../../libs/bem-core/common.blocks/next-tick/next-tick.vanilla.js */
/**
 * @module next-tick
 */

modules.define('next-tick', function(provide) {

/**
 * Executes given function on next tick.
 * @exports
 * @type Function
 * @param {Function} fn
 */

var global = this.global,
    fns = [],
    enqueueFn = function(fn) {
        return fns.push(fn) === 1;
    },
    callFns = function() {
        var fnsToCall = fns, i = 0, len = fns.length;
        fns = [];
        while(i < len) {
            fnsToCall[i++]();
        }
    };

    /* global process */
    if(typeof process === 'object' && process.nextTick) { // nodejs
        return provide(function(fn) {
            enqueueFn(fn) && process.nextTick(callFns);
        });
    }

    if(global.setImmediate) { // ie10
        return provide(function(fn) {
            enqueueFn(fn) && global.setImmediate(callFns);
        });
    }

    if(global.postMessage) { // modern browsers
        var isPostMessageAsync = true;
        if(global.attachEvent) {
            var checkAsync = function() {
                    isPostMessageAsync = false;
                };
            global.attachEvent('onmessage', checkAsync);
            global.postMessage('__checkAsync', '*');
            global.detachEvent('onmessage', checkAsync);
        }

        if(isPostMessageAsync) {
            var msg = '__nextTick' + (+new Date),
                onMessage = function(e) {
                    if(e.data === msg) {
                        e.stopPropagation && e.stopPropagation();
                        callFns();
                    }
                };

            global.addEventListener?
                global.addEventListener('message', onMessage, true) :
                global.attachEvent('onmessage', onMessage);

            return provide(function(fn) {
                enqueueFn(fn) && global.postMessage(msg, '*');
            });
        }
    }

    var doc = global.document;
    if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
        var head = doc.getElementsByTagName('head')[0],
            createScript = function() {
                var script = doc.createElement('script');
                script.onreadystatechange = function() {
                    script.parentNode.removeChild(script);
                    script = script.onreadystatechange = null;
                    callFns();
                };
                head.appendChild(script);
            };

        return provide(function(fn) {
            enqueueFn(fn) && createScript();
        });
    }

    provide(function(fn) { // old browsers
        enqueueFn(fn) && global.setTimeout(callFns, 0);
    });
});

/* end: ../../libs/bem-core/common.blocks/next-tick/next-tick.vanilla.js */
/* begin: ../../libs/bem-core/common.blocks/objects/objects.vanilla.js */
/**
 * @module objects
 * @description A set of helpers to work with JavaScript objects
 */

modules.define('objects', function(provide) {

var hasOwnProp = Object.prototype.hasOwnProperty;

provide(/** @exports */{
    /**
     * Extends a given target by
     * @param {Object} target object to extend
     * @param {...Object} source
     * @returns {Object}
     */
    extend : function(target, source) {
        typeof target !== 'object' && (target = {});

        for(var i = 1, len = arguments.length; i < len; i++) {
            var obj = arguments[i];
            if(obj) {
                for(var key in obj) {
                    hasOwnProp.call(obj, key) && (target[key] = obj[key]);
                }
            }
        }

        return target;
    },

    /**
     * Check whether a given object is empty (contains no enumerable properties)
     * @param {Object} obj
     * @returns {Boolean}
     */
    isEmpty : function(obj) {
        for(var key in obj) {
            if(hasOwnProp.call(obj, key)) {
                return false;
            }
        }

        return true;
    },

    /**
     * Generic iterator function over object
     * @param {Object} obj object to iterate
     * @param {Function} fn callback
     * @param {Object} [ctx] callbacks's context
     */
    each : function(obj, fn, ctx) {
        for(var key in obj) {
            if(hasOwnProp.call(obj, key)) {
                ctx? fn.call(ctx, obj[key], key) : fn(obj[key], key);
            }
        }
    }
});

});

/* end: ../../libs/bem-core/common.blocks/objects/objects.vanilla.js */
/* begin: ../../libs/bem-core/common.blocks/functions/functions.vanilla.js */
/**
 * @module functions
 * @description A set of helpers to work with JavaScript functions
 */

modules.define('functions', function(provide) {

var toStr = Object.prototype.toString;

provide(/** @exports */{
    /**
     * Checks whether a given object is function
     * @param {*} obj
     * @returns {Boolean}
     */
    isFunction : function(obj) {
        return toStr.call(obj) === '[object Function]';
    },

    /**
     * Empty function
     */
    noop : function() {}
});

});

/* end: ../../libs/bem-core/common.blocks/functions/functions.vanilla.js */
/* begin: ../../libs/bem-core/common.blocks/events/events.vanilla.js */
/**
 * @module events
 */

modules.define(
    'events',
    ['identify', 'inherit', 'functions'],
    function(provide, identify, inherit, functions) {

var undef,
    storageExpando = '__' + (+new Date) + 'storage',
    getFnId = function(fn, ctx) {
        return identify(fn) + (ctx? identify(ctx) : '');
    },

    /**
     * @class Event
     * @exports events:Event
     */
    Event = inherit(/** @lends Event.prototype */{
        /**
         * @constructor
         * @param {String} type
         * @param {Object} target
         */
        __constructor : function(type, target) {
            /**
             * Type
             * @member {String} Event
             */
            this.type = type;

            /**
             * Target
             * @member {String} Event
             */
            this.target = target;

            /**
             * Result
             * @member {*}
             */
            this.result = undef;

            /**
             * Data
             * @member {*}
             */
            this.data = undef;

            this._isDefaultPrevented = false;
            this._isPropagationStopped = false;
        },

        /**
         * Prevents default action
         */
        preventDefault : function() {
            this._isDefaultPrevented = true;
        },

        /**
         * Returns whether is default action prevented
         * @returns {Boolean}
         */
        isDefaultPrevented : function() {
            return this._isDefaultPrevented;
        },

        /**
         * Stops propagation
         */
        stopPropagation : function() {
            this._isPropagationStopped = true;
        },

        /**
         * Returns whether is propagation stopped
         * @returns {Boolean}
         */
        isPropagationStopped : function() {
            return this._isPropagationStopped;
        }
    }),

    /**
     * @lends Emitter
     * @lends Emitter.prototype
     */
    EmitterProps = {
        /**
         * Adds an event handler
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @param {Object} [ctx] Handler context
         * @returns {this}
         */
        on : function(e, data, fn, ctx, _special) {
            if(typeof e === 'string') {
                if(functions.isFunction(data)) {
                    ctx = fn;
                    fn = data;
                    data = undef;
                }

                var id = getFnId(fn, ctx),
                    storage = this[storageExpando] || (this[storageExpando] = {}),
                    eventTypes = e.split(' '), eventType,
                    i = 0, list, item,
                    eventStorage;

                while(eventType = eventTypes[i++]) {
                    eventStorage = storage[eventType] || (storage[eventType] = { ids : {}, list : {} });
                    if(!(id in eventStorage.ids)) {
                        list = eventStorage.list;
                        item = { fn : fn, data : data, ctx : ctx, special : _special };
                        if(list.last) {
                            list.last.next = item;
                            item.prev = list.last;
                        } else {
                            list.first = item;
                        }
                        eventStorage.ids[id] = list.last = item;
                    }
                }
            } else {
                for(var key in e) {
                    e.hasOwnProperty(key) && this.on(key, e[key], data, _special);
                }
            }

            return this;
        },

        /**
         * Adds a one time handler for the event.
         * Handler is executed only the next time the event is fired, after which it is removed.
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @param {Object} [ctx] Handler context
         * @returns {this}
         */
        once : function(e, data, fn, ctx) {
            return this.on(e, data, fn, ctx, { once : true });
        },

        /**
         * Removes event handler or handlers
         * @param {String} [e] Event type
         * @param {Function} [fn] Handler
         * @param {Object} [ctx] Handler context
         * @returns {this}
         */
        un : function(e, fn, ctx) {
            if(typeof e === 'string' || typeof e === 'undefined') {
                var storage = this[storageExpando];
                if(storage) {
                    if(e) { // if event type was passed
                        var eventTypes = e.split(' '),
                            i = 0, eventStorage;
                        while(e = eventTypes[i++]) {
                            if(eventStorage = storage[e]) {
                                if(fn) {  // if specific handler was passed
                                    var id = getFnId(fn, ctx),
                                        ids = eventStorage.ids;
                                    if(id in ids) {
                                        var list = eventStorage.list,
                                            item = ids[id],
                                            prev = item.prev,
                                            next = item.next;

                                        if(prev) {
                                            prev.next = next;
                                        } else if(item === list.first) {
                                            list.first = next;
                                        }

                                        if(next) {
                                            next.prev = prev;
                                        } else if(item === list.last) {
                                            list.last = prev;
                                        }

                                        delete ids[id];
                                    }
                                } else {
                                    delete this[storageExpando][e];
                                }
                            }
                        }
                    } else {
                        delete this[storageExpando];
                    }
                }
            } else {
                for(var key in e) {
                    e.hasOwnProperty(key) && this.un(key, e[key], fn);
                }
            }

            return this;
        },

        /**
         * Fires event handlers
         * @param {String|events:Event} e Event
         * @param {Object} [data] Additional data
         * @returns {this}
         */
        emit : function(e, data) {
            var storage = this[storageExpando],
                eventInstantiated = false;

            if(storage) {
                var eventTypes = [typeof e === 'string'? e : e.type, '*'],
                    i = 0, eventType, eventStorage;
                while(eventType = eventTypes[i++]) {
                    if(eventStorage = storage[eventType]) {
                        var item = eventStorage.list.first,
                            lastItem = eventStorage.list.last,
                            res;
                        while(item) {
                            if(!eventInstantiated) { // instantiate Event only on demand
                                eventInstantiated = true;
                                typeof e === 'string' && (e = new Event(e));
                                e.target || (e.target = this);
                            }

                            e.data = item.data;
                            res = item.fn.apply(item.ctx || this, arguments);
                            if(typeof res !== 'undefined') {
                                e.result = res;
                                if(res === false) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }

                            item.special && item.special.once &&
                                this.un(e.type, item.fn, item.ctx);

                            if(item === lastItem) {
                                break;
                            }

                            item = item.next;
                        }
                    }
                }
            }

            return this;
        }
    },
    /**
     * @class Emitter
     * @exports events:Emitter
     */
    Emitter = inherit(
        EmitterProps,
        EmitterProps);

provide({
    Emitter : Emitter,
    Event : Event
});

});

/* end: ../../libs/bem-core/common.blocks/events/events.vanilla.js */