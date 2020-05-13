'use strict';

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    code = code
        // index.ts definition
        .replace(/export declare const i18n([\s\S]+)}\n/g, '')
        // i18next `declare class ResourceStore` → `export interface ResourceStore`
        .replace(/declare/gm, 'export')
        .replace(/class/gm, 'interface')
        .replace(/^([ ]+)constructor([^\n]+)/gm, '')
        .replace(/public/gm, '')
        // i18next `BackendModule#create` patch
        .replace(/^([ ]+)(create)(\([^\n]+\): void;)/gm, '$1create?$3');
    ;
    // set indent
    code = code.split('\n').map(line => `    ${line}`).join('\n');
    // trim empty indent & final line feed
    code = code.replace(/^ {4}\n/gm, '').replace(/[\n\s]*$/, '');

    const PREFIX =`
declare const i18n: i18n.i18n;

declare namespace i18n {
`;
    const SUFFIX =
`
}

export { i18n };
`;

    return `${PREFIX}${code}${SUFFIX}`;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        alias: {
            entries: [
                {
                    find: 'i18next',
                    replacement: 'node_modules/i18next/src/index.js',

                },
            ],
        },
        replace: {
            delimiters: ['', ''],
            values: {
                'EventEmitter.call(this);': '/* EventEmitter.call(this) */',
            },
        },
    }),
    dts: bundle_dts({
        excludeLibraries: [/^@cdp/],
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
