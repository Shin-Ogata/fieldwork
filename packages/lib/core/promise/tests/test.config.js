'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/events': 'node_modules/@cdp/events/dist/events',
        },
    }),
};
