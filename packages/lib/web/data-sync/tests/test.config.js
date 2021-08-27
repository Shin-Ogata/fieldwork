'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/events': 'node_modules/@cdp/events/dist/events',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/core-storage': 'node_modules/@cdp/core-storage/dist/core-storage',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/ajax': 'node_modules/@cdp/ajax/dist/ajax',
            '@cdp/binary': 'node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
            '@cdp/web-storage': 'node_modules/@cdp/web-storage/dist/web-storage',
        },
    }),
};
