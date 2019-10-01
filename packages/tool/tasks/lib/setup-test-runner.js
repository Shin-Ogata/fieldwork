'use strict';

const { resolve, basename } = require('path');
const { copySync, writeFileSync } = require('fs-extra');
const config = require('../config');

const DIR_TESTEM     = 'testem';
const DIR_RUNNER     = 'res/test';
const DIR_FRAMEWORK  = 'node_modules/jasmine-core/lib/jasmine-core';

function setup(options) {
    const dstRoot = resolve(options.cwd, config.dir.temp, DIR_TESTEM);
    const srcFrameworkRoot = resolve(__dirname, '..', DIR_FRAMEWORK);

    { // jasmine-core
        copySync(resolve(srcFrameworkRoot, 'jasmine.css'), resolve(dstRoot, 'framework/jasmine.css'));
        copySync(resolve(srcFrameworkRoot, 'jasmine.js'), resolve(dstRoot, 'framework/jasmine.js'));
        copySync(resolve(srcFrameworkRoot, 'jasmine-html.js'), resolve(dstRoot, 'framework/jasmine-html.js'));
        copySync(resolve(srcFrameworkRoot, 'boot.js'), resolve(dstRoot, 'framework/boot.js'));
    }

    // requirejs
    copySync(resolve(__dirname, '..', 'node_modules/requirejs/require.js'), resolve(dstRoot, 'framework/require.js'));

    { // testem runner settings
        copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem.index.mustache'), resolve(dstRoot, 'testem.index.mustache'));

        const testConfig = (() => {
            const tc = require(resolve(options.cwd, options.config));
            return tc.testem || tc;
        })();
        writeFileSync(resolve(dstRoot, 'testem.json'), JSON.stringify(testConfig, null, 2));

        copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem-amd.js'), resolve(dstRoot, 'testem-amd.js'));
        if ('ci' === options.mode) {
            copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem-ci.js'), resolve(dstRoot, 'testem-ci.js'));
        }

        copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem-main.js'), resolve(dstRoot, 'testem-main.js'));

        // override
        if (options.runner) {
            copySync(resolve(options.cwd, options.runner), dstRoot);
        }
    }

    // resource
    if (options.res) {
        copySync(resolve(options.cwd, options.res), resolve(options.cwd, config.dir.temp, basename(options.res)));
    }
}

// project configuration
module.exports = setup;
