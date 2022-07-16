'use strict';

const { resolve }      = require('path');
const { readFileSync } = require('fs-extra');
const resolveDepends   = require('@cdp/tasks/lib/resolve-dependency');

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
        ;
    }

    {// result-code-defs.d.ts
        const read = (dts) => {
            // trim banner
            return readFileSync(dts).toString().replace(/\/\*\![\s\S]*?\*\/\n/, '');
        };
    
        // global namespace: `@cdp/result result-code-defs.d.ts`
        code += read(resolve('../../lib/core/result/types/result-code-defs.d.ts'));

        code += read(resolve('../../lib/worker/ajax/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/i18n/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/data-sync/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/model/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/collection/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/router/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/app/types/result-code-defs.d.ts'));

        // re-export global constant
        const globalConstant = read(resolve('../../lib/core/result/types/result-code.d.ts'));
        // 先頭の import から 最初の export
        code += globalConstant.match(/^import[\s\S]+export {[\s\S]+};/)[0];
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
