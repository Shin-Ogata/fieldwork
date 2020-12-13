'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/observable': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/data-sync': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/events': 'node_modules/@cdp/events/dist/events',
            '@cdp/observable': 'node_modules/@cdp/observable/dist/observable',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/data-sync': 'node_modules/@cdp/data-sync/dist/data-sync',
            '@cdp/core-storage': 'node_modules/@cdp/data-sync/node_modules/@cdp/core-storage/dist/core-storage',
            '@cdp/ajax': 'node_modules/@cdp/data-sync/node_modules/@cdp/ajax/dist/ajax',
            '@cdp/binary': 'node_modules/@cdp/data-sync/node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
            '@cdp/web-storage': 'node_modules/@cdp/data-sync/node_modules/@cdp/web-storage/dist/web-storage',
        },
    }),
};
