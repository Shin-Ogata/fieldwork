'use strict';

const {
    resolve,
    join,
    basename,
    dirname,
    sep,
} = require('path');
const { copySync, writeFileSync } = require('fs-extra');
const config = require('../config');

const DIR_TESTEM     = 'testem';
const DIR_PLUGINS    = 'plugins';
const DIR_RUNNER     = 'res/test';

function queryFrameWorkDir(name) {
    const dirs = dirname(require.resolve(name)).split(sep);
    dirs.splice(dirs.lastIndexOf(name) + 1);
    return join(...dirs);
}

function setup(options) {
    const { cwd, mode, runner, res } = options;
    const dstRoot = resolve(cwd, config.dir.temp, DIR_TESTEM);
    const srcFrameworkRoot = resolve(queryFrameWorkDir('jasmine-core'), 'lib/jasmine-core');

    { // jasmine-core
        copySync(resolve(srcFrameworkRoot, 'jasmine.css'), resolve(dstRoot, 'framework/jasmine.css'));
        copySync(resolve(srcFrameworkRoot, 'jasmine.js'), resolve(dstRoot, 'framework/jasmine.js'));
        copySync(resolve(srcFrameworkRoot, 'jasmine-html.js'), resolve(dstRoot, 'framework/jasmine-html.js'));
        copySync(resolve(srcFrameworkRoot, 'boot.js'), resolve(dstRoot, 'framework/boot.js'));
    }

    // requirejs
    copySync(resolve(queryFrameWorkDir('requirejs'), 'require.js'), resolve(dstRoot, 'framework/require.js'));

    { // testem runner settings
        copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem.index.mustache'), resolve(dstRoot, 'testem.index.mustache'));

        const testConfig = (() => {
            const tc = require(resolve(cwd, options.config));
            return tc.testem || tc;
        })();
        writeFileSync(resolve(dstRoot, 'testem.json'), JSON.stringify(testConfig, null, 2));

        copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem-amd.js'), resolve(dstRoot, 'testem-amd.js'));
        if ('ci' === mode) {
            copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem-ci.js'), resolve(dstRoot, 'testem-ci.js'));
        }

        copySync(resolve(__dirname, '..', DIR_RUNNER, 'testem-main.js'), resolve(dstRoot, 'testem-main.js'));

        // override
        if (runner) {
            copySync(resolve(cwd, runner), resolve(dstRoot, DIR_PLUGINS));
        }
    }

    // resource
    if (res) {
        copySync(resolve(cwd, res), resolve(cwd, config.dir.temp, basename(res)));
    }

    // depends
    const depends = require(resolve(cwd, options.config)).depends;
    if (depends) {
        for (const depend of depends) {
            const { module, resource, server } = depend;
            const moduleTestRoot = resolve(cwd, 'node_modules', module, config.dir.test);
            if (resource) {
                copySync(resolve(moduleTestRoot, resource), resolve(cwd, config.dir.temp, resource));
            }
            if (server) {
                copySync(resolve(moduleTestRoot, server), resolve(dstRoot, DIR_PLUGINS));
            }
        }
    }
}

// project configuration
module.exports = setup;
