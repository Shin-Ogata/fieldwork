'use strict';

const config = require('../../../../../config/bundle/rollup-test-testem');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/binary': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/event-publisher': 'node_modules/@cdp/promise/node_modules/@cdp/event-publisher/dist/event-publisher',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/binary': 'node_modules/@cdp/binary/dist/binary',
        },
    }),
};
