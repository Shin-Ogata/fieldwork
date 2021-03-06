'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/binary': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/events': 'node_modules/@cdp/promise/node_modules/@cdp/events/dist/events',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/binary': 'node_modules/@cdp/binary/dist/binary',
        },
    }),
};
