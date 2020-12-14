'use strict';

const { resolve }      = require('path');
const { readFileSync } = require('fs-extra');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

function patch(index, code, includes) {
    if (0 !== index) {
        return code;
    }

    includes.length = 0;
    includes.push('@cdp/extension-i18n');
    includes.push('@cdp/extension-template');
    includes.push('@cdp/extension-template-transformer');
    includes.push('@cdp/core-utils');
    includes.push('@cdp/result');
    includes.push('@cdp/events');
    includes.push('@cdp/promise');
    includes.push('@cdp/observable');
    includes.push('@cdp/core-storage');
    includes.push('@cdp/core-template');
    includes.push('@cdp/ajax');
    includes.push('@cdp/binary');
    includes.push('@cdp/inline-worker');
    includes.push('@cdp/dom');
    includes.push('@cdp/environment');
    includes.push('@cdp/i18n');
    includes.push('@cdp/web-storage');
    includes.push('@cdp/data-sync');
    includes.push('@cdp/model');
    includes.push('@cdp/collection');
    includes.push('@cdp/view');
    includes.push('@cdp/template');

    const read = (dts) => {
        // trim banner
        return readFileSync(dts).toString().replace(/\/\*\![\s\S]*?\*\/\n/, '');
    };

    {// trim
        code = code
            // dynamic import: 'import('@cdp/lib-core').' → ''
            .replace(/import\('@cdp\/lib-core'\)\./g, '')
        ;

    }

    {// result-code-defs.d.ts
        // global namespace: `@cdp/result result-code-defs.d.ts`
        code += read(resolve('../../lib/core/result/types/result-code-defs.d.ts'));

        code += read(resolve('../../lib/worker/ajax/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/i18n/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/data-sync/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/model/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/collection/types/result-code-defs.d.ts'));

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
