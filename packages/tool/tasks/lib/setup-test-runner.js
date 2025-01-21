'use strict';

const {
    resolve,
    join,
    basename,
    dirname,
    sep,
} = require('node:path');
const { cpSync, writeFileSync } = require('node:fs');
const config = require('../config');

const DIR_TESTEM     = 'testem';
const DIR_PLUGINS    = 'plugins';
const DIR_RUNNER     = 'res/test';

function queryFrameWorkDir(name) {
    const dirs = dirname(require.resolve(name)).split(sep);
    dirs.splice(dirs.lastIndexOf(name) + 1);
    // absolute path
    if ('' === dirs[0]) {
        dirs[0] = sep;
    }
    return join(...dirs);
}

function setup(options) {
    const { cwd, mode, runner, res } = options;
    const dstRoot = resolve(cwd, config.dir.temp, DIR_TESTEM);
    const srcFrameworkRoot = resolve(queryFrameWorkDir('jasmine-core'), 'lib/jasmine-core');

    { // jasmine-core
        cpSync(resolve(srcFrameworkRoot, 'jasmine.css'), resolve(dstRoot, 'framework/jasmine.css'), { force: true, recursive: true });
        cpSync(resolve(srcFrameworkRoot, 'jasmine.js'), resolve(dstRoot, 'framework/jasmine.js'), { force: true, recursive: true });
        cpSync(resolve(srcFrameworkRoot, 'jasmine-html.js'), resolve(dstRoot, 'framework/jasmine-html.js'), { force: true, recursive: true });
        cpSync(resolve(srcFrameworkRoot, 'boot0.js'), resolve(dstRoot, 'framework/boot0.js'), { force: true, recursive: true });
        cpSync(resolve(srcFrameworkRoot, 'boot1.js'), resolve(dstRoot, 'framework/boot1.js'), { force: true, recursive: true });
    }

    // requirejs
    cpSync(resolve(queryFrameWorkDir('requirejs'), 'require.js'), resolve(dstRoot, 'framework/require.js'), { force: true, recursive: true });

    { // testem runner settings
        cpSync(resolve(__dirname, '..', DIR_RUNNER, 'testem.index.mustache'), resolve(dstRoot, 'testem.index.mustache'), { force: true, recursive: true });

        const testConfig = (() => {
            const tc = require(resolve(cwd, options.config));
            return tc.testem || tc;
        })();
        writeFileSync(resolve(dstRoot, 'testem.json'), JSON.stringify(testConfig, null, 2));

        cpSync(resolve(__dirname, '..', DIR_RUNNER, 'testem-amd.js'), resolve(dstRoot, 'testem-amd.js'), { force: true, recursive: true });
        if ('ci' === mode) {
            cpSync(resolve(__dirname, '..', DIR_RUNNER, 'testem-ci.js'), resolve(dstRoot, 'testem-ci.js'), { force: true, recursive: true });
        }

        cpSync(resolve(__dirname, '..', DIR_RUNNER, 'testem-main.js'), resolve(dstRoot, 'testem-main.js'), { force: true, recursive: true });

        // override
        if (runner) {
            cpSync(resolve(cwd, runner), resolve(dstRoot, DIR_PLUGINS), { force: true, recursive: true });
        }
    }

    // resource
    if (res) {
        cpSync(resolve(cwd, res), resolve(cwd, config.dir.temp, basename(res)), { force: true, recursive: true });
    }

    // depends
    const depends = require(resolve(cwd, options.config)).depends;
    if (depends) {
        for (const depend of depends) {
            const { module, resource, server } = depend;
            const moduleTestRoot = resolve(cwd, 'node_modules', module, config.dir.test);
            if (resource) {
                cpSync(resolve(moduleTestRoot, resource), resolve(cwd, config.dir.temp, resource), { force: true, recursive: true });
            }
            if (server) {
                cpSync(resolve(moduleTestRoot, server), resolve(dstRoot, DIR_PLUGINS), { force: true, recursive: true });
            }
        }
    }
}

// project configuration
module.exports = setup;
