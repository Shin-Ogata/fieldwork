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

    code = code
        // rename `EventSourceBase` → `EventSource`
        .replace(/EventSourceBase/gm, 'EventSource')
        // 'declare type EventSource' → 'export declare type EventSource'
        .replace(/^declare type EventSource/gm, 'export declare type EventSource')
        // 'declare const EventSource' → 'export declare const EventSource'
        .replace(/^declare const EventSource/gm, 'export declare const EventSource')
    ;

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
    dts: bundle_dts({ postProcess: patch }),
    minify: {
        js: minify_js(),
    },
};
