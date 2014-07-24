modules.define('i-bem__dom', function(provide, DOM) {

console.log('my-block!');
DOM.decl('my-block', {
    onSetMod: {
        'js' : {
            'inited' : function() {
                console.log('my-block! js.inited event!');
                console.log(this.domElem[0].outerHTML);
            }
        }
    }
});

provide(DOM);

});