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
        // trim index.ts definition
        .replace(/export declare namespace path2regexp([\s\S]+)}\n/g, '')
        .replace(/export declare const path2regexp([\s\S]+)};\n/g, '')
        // path2regexp `declare class ResourceStore` → `export interface ResourceStore`
        .replace(/export declare/gm, 'export')
        .replace(/declare/gm, 'export')
        .replace(/class/gm, 'interface')
        .replace(/^([ ]+)constructor([^\n]+)/gm, '')
        .replace(/public/gm, '')
    ;

    const PREFIX =`
declare namespace path2regexp {

`;
    const SUFFIX =
`
}

export { path2regexp };
`;

    return `${PREFIX}${code}${SUFFIX}`;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        alias: {
            entries: [
                {
                    find: 'path-to-regexp',
                    replacement: resolve('node_modules/path-to-regexp/dist.es2015/index.js'),
                },
            ],
        },
    }),
    dts: bundle_dts({
        inlinedLibraries: ['path-to-regexp'],
        excludeLibraries: [/^@cdp/],
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
