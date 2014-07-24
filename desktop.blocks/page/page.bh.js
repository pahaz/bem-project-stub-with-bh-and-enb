module.exports = function(bh) {
    bh.match('page', function(ctx, json) {
/*        ctx
            .tag('body')
            .content([
                ctx.content(),
                json.scripts
            ], true);*/
    });
};
