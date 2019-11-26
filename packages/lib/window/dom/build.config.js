'use strict';

const config     = require('../../../../config/bundle/rollup-core');
const bundle_dts = require('../../../../config/bundle/dts-bundle');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    // 'export declare namespace dom' → 'declare namespace dom'
    code = code.replace(/^export declare namespace dom/gm, 'declare namespace dom');
    // 'export { dom };'
    code += 'export { dom };';

    return code;
}

module.exports = {
    default: config({
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
        },
        // default export と同名の named export を許可
        exports: 'named',
    }),
    dts: bundle_dts({ postProcess: patch }),
};
