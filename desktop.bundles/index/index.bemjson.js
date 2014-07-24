({
    block : 'page',
    title : 'Hello, World!',
    mods : { theme : 'normal' },
    head : [
	    { elem: 'meta', attrs: { name: 'description', content: 'Some description' }},
        { elem : 'css', url : 'index.css' },
        { elem : 'js', url : '../../node_modules/ym/modules.js' }
    ],
    content : [
    	{
    		block: "my-block",
            content: ["aaa"],
    		js: true
    	},
        "Hi!",
        { elem : 'js', url : 'index.js' }
    ]
})
