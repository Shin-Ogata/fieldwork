'use strict';

const { resolve } = require('node:path');
const resolveDepends = require('@cdp/tasks/lib/resolve-dependency');
const { dropAlias, makeResultCodeDefs } = require('@cdp/tasks/lib/bundle-utils');

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
            layer: ['extension', 'lib'],
            cwd: resolve(__dirname, '../../../'),
            dev: false,
        });

        const corePkg   = require('../lib-core/package.json');
        const workerPkg = require('../lib-worker/package.json');
        const webPkg    = require('../lib-web/package.json');

        // '@cdp/extension-*' modules
        const extModules = [];
        corePkg.optionalDependencies   && extModules.push(...Object.keys(corePkg.optionalDependencies));
        workerPkg.optionalDependencies && extModules.push(...Object.keys(workerPkg.optionalDependencies));
        webPkg.optionalDependencies    && extModules.push(...Object.keys(webPkg.optionalDependencies));
        // '@cdp/lib-core' modules
        const coreModules = Object.keys(corePkg.devDependencies);
        // '@cdp/lib-worker' modules
        const workerModules = Object.keys(workerPkg.devDependencies);
        // '@cdp/lib-web' modules
        const webModules = Object.keys(webPkg.devDependencies);

        const sortDeps = (targets) => {
            return packages.filter(pkg => targets.includes(pkg.name)).map(pkg => pkg.name);
        };

        includes.length = 0;
        includes.push(...sortDeps(extModules));
        includes.push(...sortDeps(coreModules));
        includes.push(...sortDeps(workerModules));
        includes.push(...sortDeps(webModules));
    }

    {// remove
        code = code
            // dynamic import: 'import('@cdp/lib-core').' → ''
            .replace(/import\('@cdp\/lib-core'\)\./g, '')
            // export declare namespace CDP_DECLARE { {...}' → ''
            .replace(/^export declare namespace CDP_DECLARE {[\s\S]*?^\}\n/gm, '')
            // 'declare const directives' → 'export declare const directives'
            .replace(/^declare const directives/gm, 'export declare const directives')
            //'/*!...*/ → ''
            .replace(/^\/\*\![\s\S]*?\*\/\n/gm, '')
        ;

        // directives$1 → directives
        code = dropAlias(code, 'directives');
    }

    {// adjust stuffs of same name as global
        // add 'export' key word
        code = code
            .replace(/^declare const setTimeout/gm, 'export declare const setTimeout')
            .replace(/^declare const clearTimeout/gm, 'export declare const clearTimeout')
            .replace(/^declare const setInterval/gm, 'export declare const setInterval')
            .replace(/^declare const clearInterval/gm, 'export declare const clearInterval')
            .replace(/^type EventSource/gm, 'export type EventSource')
            .replace(/^declare const EventSource/gm, 'export declare const EventSource')
        ;

        code = dropAlias(code, 'clearInterval');
        code = dropAlias(code, 'clearTimeout');
        code = dropAlias(code, 'setInterval');
        code = dropAlias(code, 'setTimeout');
        code = dropAlias(code, 'EventSource');
    }

    {// result-code-defs.d.ts
        const { imports, exports } = await makeResultCodeDefs(
            './dist/result-code-defs.d.ts',
            [
                {
                    name: '@cdp/result/result-code-defs',
                    path: '../../lib/core/result/types/result-code-defs.d.ts',
                },
                {
                    name: '@cdp/ajax/result-code-defs',
                    path: '../../lib/worker/ajax/types/result-code-defs.d.ts',
                },
                {
                    name: '@cdp/i18n/result-code-defs',
                    path: '../../lib/web/i18n/types/result-code-defs.d.ts',
                },
                {
                    name: '@cdp/data-sync/result-code-defs',
                    path: '../../lib/web/data-sync/types/result-code-defs.d.ts',
                },
                {
                    name: '@cdp/model/result-code-defs',
                    path: '../../lib/web/model/types/result-code-defs.d.ts',
                },
                {
                    name: '@cdp/collection/result-code-defs',
                    path: '../../lib/web/collection/types/result-code-defs.d.ts',
                },
                {
                    name: '@cdp/router/result-code-defs',
                    path: '../../lib/web/router/types/result-code-defs.d.ts',
                },
                {
                    name: '@cdp/app/result-code-defs',
                    path: '../../lib/web/app/types/result-code-defs.d.ts',
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
