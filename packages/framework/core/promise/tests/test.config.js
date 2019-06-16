'use strict';

const config = require('../../../../../config/rollup/test.testem');
const testee = require('../rollup.config');

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/event-publisher': 'node_modules/@cdp/event-publisher/dist/event-publisher',
        },
    }),
};
