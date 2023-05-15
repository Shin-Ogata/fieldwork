'use strict';

const { resolve }    = require('node:path');
const resolveDepends = require('@cdp/tasks/lib/resolve-dependency');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');
const minify_css = require('../../../config/minify/csso');

function patch(index, code, includes) {
    if (0 !== index) {
        return code;
    }

    {// includes info
        // dependencies info
        const packages = resolveDepends({
            layer: ['lib'],
            cwd: resolve(__dirname, '../../../'),
            dev: false,
        });

        const modules = includes.slice();
        includes.length = 0;
        includes.push(...packages.filter(pkg => modules.includes(pkg.name)).map(pkg => pkg.name));
    }

    return code;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        external: {
            '@cdp/runtime': 'CDP',
        },
    }),
    dts: bundle_dts({
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
        css: minify_css(),
    },
};
