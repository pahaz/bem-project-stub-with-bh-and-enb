module.exports = function(bh) {
    bh.match('page', function(ctx, json) {
        ctx
            .tag('body')
            .content([
                ctx.content(),
                json.scripts
            ], true);
        return [
            json.doctype || '<!DOCTYPE html>',
            {
                tag : 'html',
                content : [
                    {
                        elem : 'head',
                        content : [
                            { tag : 'meta', attrs : { charset : 'utf-8' } },
                            { tag : 'title', content : json.title },
                            { block : 'ua' },
                            json.head,
                            json.styles,
                            json.favicon? { elem : 'favicon', url : json.favicon } : '',
                        ]
                    },
                    json.content
                ]
            }
        ];
    });
};
