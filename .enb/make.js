module.exports = function(config) {
    console.log('my make!');
    config.nodes('*.bundles/*', function(nodeConfig) {
        nodeConfig.addTechs([
            [ require('enb/techs/file-provider'), { target: '?.bemjson.js' } ],
            [ require('enb/techs/files') ],
            [ require('enb/techs/deps') ],
            [ require('enb/techs/bemdecl-from-bemjson') ],
            [ require('enb-roole/techs/css-roole'), { target: '?.noprefix.css' } ],
            [ require('enb-bh/techs/bh-server') ],
            [ require('enb-bh/techs/html-from-bemjson') ]
        ]);

        nodeConfig.addTargets([
            '?.css',
            '?.bh.js',
            '?.html'
        ]);
    });

    config.nodes('*desktop.bundles/*', function(nodeConfig) {
        nodeConfig.addTechs([
            [ require('enb/techs/levels'), { levels: getDesktops(config) } ],
            [ require('enb-autoprefixer/techs/css-autoprefixer'), {
                browserSupport: [ 'last 2 versions', 'ie 10', 'ff 24', 'opera 12.16' ],
                sourceTarget: '?.noprefix.css'
            }]
        ]);
    });

    /*config.nodes('*touch-pad.bundles/*', function(nodeConfig) {
        nodeConfig.addTechs([
            [ require('enb/techs/levels'), { levels: getTouchPads(config) } ],
            [ require('enb-autoprefixer/techs/css-autoprefixer'), {
                browserSupport: [ 'android 4', 'ios 5' ],
                sourceTarget: '?.noprefix.css'
            }]
        ]);
    });

    config.nodes('*touch-phone.bundles/*', function(nodeConfig) {
        nodeConfig.addTechs([
            [ require('enb/techs/levels'), { levels: getTouchPhones(config) } ],
            [ require('enb-autoprefixer/techs/css-autoprefixer'), {
                browserSupport: [ 'android 4', 'ios 6', 'ie 10' ],
                sourceTarget: '?.noprefix.css'
            }]
        ]);
    });*/

};

function getDesktops(config) {
    return [
        { path: 'libs/bem-core/common.blocks', check: false },
        { path: 'libs/bem-core/desktop.blocks', check: false },
        { path: 'libs/bem-components/common.blocks', check: false },
        { path: 'libs/bem-components/design/common.blocks', check: false },
        { path: 'libs/bem-components/desktop.blocks', check: false },
        { path: 'libs/bem-components/design/desktop.blocks', check: false },
        'common.blocks',
        'desktop.blocks'
    ].map(function(level) {
        return config.resolvePath(level);
    });
}

function getTouchPads(config) {
    return [
        { path: 'libs/bem-core/common.blocks', check: false },
        { path: 'libs/bem-core/touch.blocks', check: false },
        { path: 'libs/bem-components/common.blocks', check: false },
        { path: 'libs/bem-components/design/common.blocks', check: false },
        { path: 'libs/bem-components/touch.blocks', check: false },
        { path: 'libs/bem-components/design/touch.blocks', check: false },
        { path: 'libs/bem-components/design/touch-pad.blocks', check: false },
        'common.blocks',
        'touch-pad.blocks'
    ].map(function(level) {
        return config.resolvePath(level);
    });
}

function getTouchPhones(config) {
    return [
        { path: 'libs/bem-core/common.blocks', check: false },
        { path: 'libs/bem-core/touch.blocks', check: false },
        { path: 'libs/bem-components/common.blocks', check: false },
        { path: 'libs/bem-components/design/common.blocks', check: false },
        { path: 'libs/bem-components/touch.blocks', check: false },
        { path: 'libs/bem-components/design/touch.blocks', check: false },
        { path: 'libs/bem-components/design/touch-phone.blocks', check: false },
        'common.blocks',
        'touch.blocks',
        'touch-phone.blocks'
    ].map(function(level) {
        return config.resolvePath(level);
    });
}
