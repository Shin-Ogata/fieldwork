'use strict';

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    code = code
        // trim user index.ts definition
        .replace(/export declare const i18n([\s\S]+)}\n/g, '')
        // i18next `declare` → `export`
        .replace(/declare/gm, 'export')
    ;
    // set indent
    code = code.split('\n').map(line => `    ${line}`).join('\n');
    // trim empty indent & final line feed
    code = code.replace(/^ {4}\n/gm, '').replace(/[\n\s]*$/, '');

    const PREFIX =
`declare namespace i18n {
    export const context: i18n;
`;
    const SUFFIX =
`
}

export { i18n };
`;

    return `${PREFIX}${code}${SUFFIX}`;
}

module.exports = {
    default: bundle_src(),
    dts: bundle_dts({
        inlinedLibraries: ['i18next'],
        excludeLibraries: [/^@cdp/],
        postProcess: patch,
    }),
};
