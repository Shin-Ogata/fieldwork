'use strict';

const { resolve }      = require('node:path');
const { readFileSync } = require('node:fs');
const resolveDepends   = require('@cdp/tasks/lib/resolve-dependency');
const { dropAlias } = require('@cdp/tasks/lib/misc');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

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

    // global namespace: `@cdp/result result-code-defs.d.ts`
    code += readFileSync(resolve(__dirname, 'node_modules/@cdp/result/types/result-code-defs.d.ts')).toString();

    // re-export global constant
    const globalConstant = readFileSync(resolve(__dirname, 'node_modules/@cdp/result/types/result-code.d.ts')).toString();
    // 先頭の import から 最初の export
    code += globalConstant.match(/^import[\s\S]+export {[\s\S]+};/)[0];

    return code;
}

module.exports = {
    __esModule: true,
    default: bundle_src(),
    dts: bundle_dts({
        followSymlinks: true,
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
