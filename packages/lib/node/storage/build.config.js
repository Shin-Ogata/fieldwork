'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports.default = config({
    external: {
        'util': null,
        'path': null,
        'fs': null,
        '@cdp/core-utils': null,
        '@cdp/events': null,
        '@cdp/promise': null,
        '@cdp/core-storage': null,
    },
    format: 'cjs',
    // default export と同名の named export を許可
//    exports: 'named',
});
