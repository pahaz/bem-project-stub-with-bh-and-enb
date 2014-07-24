module.exports = function(config) {
    console.log('my make!');
    config.nodes('*.bundles/*', function(nodeConfig) {
        nodeConfig.addTechs([
            [ require('enb/techs/file-provider'), { target: '?.bemjson.js' } ],
            [ require('enb/techs/bemdecl-from-bemjson'), { sourceTarget: '?.bemjson.js', destTarget: "?.bemdecl.js" } ],
            [ require('enb/techs/bemdecl-from-deps-by-tech'), { sourceTech: 'js', destTech: 'bemhtml', target: "?.bemhtml.bemdecl.js"} ],
            //[ require('enb-modules/techs/deps-with-modules') ],
            [ require('enb/techs/deps'), { bemdeclTarget: '?.bemdecl.js', depsTarget: '?.deps-new.js' } ],
            [ require('enb/techs/deps-old'), { bemdeclTarget: '?.bemdecl.js', depsTarget: '?.deps.js' } ],
            [ require('enb/techs/files'), {depsTarget:'?.deps.js', filesTarget:'?.files', dirsTarget: '?.dirs'} ],            
            [ require('enb-roole/techs/css-roole'), { target: '?.noprefix.css' } ],
            [ require('enb-bh/techs/bh-server') ],
            [ require('enb-bh/techs/bh-client') ],
            [ require('enb-bh/techs/html-from-bemjson') ],
            [ require('enb/techs/js-includes'), { target: '?.includes.js', sourceSuffixes: ['js', 'vanilla.js', 'browser.js'] } ],
            [ require('enb/techs/js-expand-includes'), { sourceTarget: '?.includes.js', destTarget: '?.includes.all.js' } ],
            [ require("enb/techs/js"), { sourceSuffixes: ['js', 'vanilla.js'/*, 'browser.js'*/], target:'?.js', filesTarget:'?.files' } ]
        ]);
        //nodeConfig.addTech(require('enb-diverse-js/techs/vanilla-js'));
        //nodeConfig.addTech(require('enb-diverse-js/techs/browser-js'));
        /*nodeConfig.addTech();*/
        nodeConfig.addTargets([
            '?.css',
            '?.js',
            '?.includes.all.js',
            '?.deps-new.js',
            '?.bemhtml.bemdecl.js',
            //'?.vanilla.js',
            //'?.browser.js',
            '?.bh.js',
            '?.bh.client.js',
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
        /*{ path: 'libs/bem-components/common.blocks', check: false },
        { path: 'libs/bem-components/design/common.blocks', check: false },
        { path: 'libs/bem-components/desktop.blocks', check: false },
        { path: 'libs/bem-components/design/desktop.blocks', check: false },*/
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
