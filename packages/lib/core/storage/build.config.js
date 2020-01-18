'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports.default = config({
    external: {
        '@cdp/core-utils': 'CDP',
        '@cdp/events': 'CDP',
        '@cdp/promise': 'CDP',
    },
    // default export と同名の named export を許可
    exports: 'named',
});
