'use strict';

const { resolve } = require('node:path');
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
        .replace(/^([ ]+)(create)(\([^\n]+\): void;)/gm, '$1create?$3')
        // drop tslint comment
        .replace(/^.*\/\/ tslint:.*$/gm, '')
        // drop `export namespace i18n$1`
        .replace(/export namespace i18n\$1([\s\S]+)}\n/g, '')
        // drop definition from `i18n$1`
        .replace(/^.*i18n\$1.*$/gm, '')
        // drop export {}
        .replace(/export {\s*};/g, '')
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
                    replacement: resolve('node_modules/i18next/src/index.js'),
                },
            ],
        },
        replace: {
            preventAssignment: true,
            delimiters: ['', ''],
            values: {
                'EventEmitter.call(this);': '/* EventEmitter.call(this) */',
            },
        },
    }),
    dts: bundle_dts({
        inlinedLibraries: ['i18next'],
        excludeLibraries: [/^@cdp/],
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
