'use strict';

const config = require('../../../../../config/rollup/test.testem');
const testee = require('../rollup.config');

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
            '@cdp/promise': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/event-publisher': 'node_modules/@cdp/promise/node_modules/@cdp/event-publisher/dist/event-publisher',
        },
    }),
};
