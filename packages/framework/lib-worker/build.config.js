'use strict';

const { resolve }      = require('path');
const { readFileSync } = require('fs-extra');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    // import type from '@cdp/lib-core'
    const importTypes = `import { Cancelable, Keys, PlainObject, Types, TypeToKey } from '@cdp/lib-core';`;
    code = `${importTypes}\n${code}`;

    // global namespace: `@cdp/ajax result-code-defs.d.ts`
    code += readFileSync(resolve(__dirname, 'node_modules/@cdp/ajax/types/result-code-defs.d.ts')).toString();

    return code;
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
            values: {
                '@cdp/core-utils': '@cdp/lib-core',
                '@cdp/promise': '@cdp/lib-core',
                '@cdp/result': '@cdp/lib-core',
            },
        },
    }),
    dts: bundle_dts({
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
