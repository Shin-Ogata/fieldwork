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

    // import type from '@cdp/framework-core'
    const importTypes = `import { Cancelable, Keys, PlainObject, Types, TypeToKey } from '@cdp/framework-core';`;
    code = `${importTypes}\n${code}`;

    // global namespace: `@cdp/ajax result-code-defs.d.ts`
    code += readFileSync(resolve(__dirname, 'node_modules/@cdp/ajax/types/result-code-defs.d.ts')).toString();

    return code;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        external: {
            '@cdp/framework-core': 'CDP',
        },
        replace: {
            delimiters: ['', ''],
            values: {
                '@cdp/core-utils': '@cdp/framework-core',
                '@cdp/promise': '@cdp/framework-core',
                '@cdp/result': '@cdp/framework-core',
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
