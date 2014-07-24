[![Build Status](https://travis-ci.org/pahaz/bem-project-stub-with-bh-and-enb.svg?branch=master)](https://travis-ci.org/pahaz/bem-project-stub-with-bh-and-enb)

# HowTo #

    git clone https://github.com/pahaz/bem-tests-bh.git project-stub
    cd project-stub
    bower install
    npm install
    ./node_modules/.bin/enb make

# old HowTo #

    git clone ....
    bower install
    npm install
    mkdir common.blocks
    mkdir desktop.blocks
    
    git clone https://github.com/enb-make/enb
    cd enb
    git checkout 18571c0d61a6b861f675352b8bb1d02166cdf59a # https://github.com/enb-make/enb/tree/18571c0d61a6b861f675352b8bb1d02166cdf59a
    npm install
    cd ..
    
    node enb\bin\enb make
    node enb\bin\enb server
    
