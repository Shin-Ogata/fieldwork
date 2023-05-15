'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/ajax': 'node_modules/@cdp/ajax/dist/ajax',
            // ajax
            '@cdp/promise': 'node_modules/@cdp/ajax/node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/ajax/node_modules/@cdp/result/dist/result',
            '@cdp/binary': 'node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
            // promise
            '@cdp/events': 'node_modules/@cdp/ajax/node_modules/@cdp/promise/node_modules/@cdp/events/dist/events',
        },
    }),
};
