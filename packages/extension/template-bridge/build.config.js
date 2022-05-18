'use strict';

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    code = code
        // trim `import("xxx").`
        .replace(/import\("[\S]+"\)\./g, '')
        // stampino comments
        .replace(`<template name='foo'>`, "`<template name='foo'>`")
        .replace(`<template type='if' if='{{x}}'>`, "`<template type='if' if='{{x}}'>`")
    ;

    return code;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        external: {
            '@cdp/extension-template': 'CDP.Exension',
        },
        alias: {
            entries: [
                {
                    find: 'lit-html/private-ssr-support.js',
                    replacement : '@cdp/extension-template',
                },
                {
                    find: 'lit-html',
                    replacement : '@cdp/extension-template',
                },
            ],
        },
        postproc: {
            replaces: [{ find: /\r\n/gm, replacement: '\n' }],
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
