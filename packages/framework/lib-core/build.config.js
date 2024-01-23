'use strict';

const { resolve } = require('node:path');
const resolveDepends = require('@cdp/tasks/lib/resolve-dependency');
const { makeResultCodeDefs } = require('@cdp/tasks/lib/bundle-utils');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

async function patch(index, code, includes) {
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

    {// result-code-defs.d.ts
        const { imports, exports } = await makeResultCodeDefs(
            './dist/result-code-defs.d.ts',
            [
                {
                    name: '@cdp/result/result-code-defs',
                    path: '../../lib/core/result/types/result-code-defs.d.ts',
                },
            ],
            '../../lib/core/result/types/result-code.d.ts',
        );
        code += `${imports}\n${exports}`;
    }

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
