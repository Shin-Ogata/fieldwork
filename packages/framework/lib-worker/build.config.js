'use strict';

const { resolve } = require('node:path');
const resolveDepends = require('@cdp/tasks/lib/resolve-dependency');
const { makeResultCodeDefs } = require('@cdp/tasks/lib/bundle-utils');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

// '@cdp/lib-core' modules
const coreModules = Object.keys(require('../lib-core/package.json').devDependencies);

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

    // '@cdp/lib-core' modules
    const regexCoreModules = new RegExp(`(${coreModules.join('|')})`, 'gm');

    code = code
        // from '@cdp/lib-core'
        .replace(regexCoreModules, '@cdp/lib-core')
    ;

    {// result-code-defs.d.ts
        const { imports } = await makeResultCodeDefs(
            './dist/result-code-defs.d.ts',
            [
                {
                    name: '@cdp/ajax/result-code-defs',
                    path: '../../lib/worker/ajax/types/result-code-defs.d.ts',
                },
            ],
        );
        code += `${imports}\n`;
    }

    return code;
}

function replaceModuleValues(modules, target) {
    const values = {};
    for (const key of modules) {
        values[key] = target;
    }
    return values;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        external: {
            '@cdp/lib-core': 'CDP',
        },
        replace: {
            preventAssignment: true,
            delimiters: ['', ''],
            values: replaceModuleValues(coreModules, '@cdp/lib-core'),
        },
    }),
    dts: bundle_dts({
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
