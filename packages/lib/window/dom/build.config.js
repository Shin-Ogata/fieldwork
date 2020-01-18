'use strict';

const config     = require('../../../../config/bundle/rollup-core');
const bundle_dts = require('../../../../config/bundle/dts-bundle');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    code = code
        // 'export declare namespace dom' → 'declare namespace dom'
        .replace(/^export declare namespace dom/gm, 'declare namespace dom')
        // trim `import("xxx").`
        .replace(/import\("[\S]+"\)\./g, '')
    ;

    // 'export { dom };'
    code += 'export { dom };';

    return code;
}

module.exports = {
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
        },
        // default export と同名の named export を許可
        exports: 'named',
    }),
    dts: bundle_dts({ postProcess: patch }),
};
