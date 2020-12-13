'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/core-storage': 'CDP',
            '@cdp/binary': 'CDP',
        },
        // default export と同名の named export を許可
        exports: 'named',
    }),
};
