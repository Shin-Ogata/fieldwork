'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/core-storage': 'CDP',
            '@cdp/binary': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/events': 'node_modules/@cdp/events/dist/events',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/core-storage': 'node_modules/@cdp/core-storage/dist/core-storage',
            '@cdp/binary': 'node_modules/@cdp/binary/dist/binary',
        },
    }),
};
