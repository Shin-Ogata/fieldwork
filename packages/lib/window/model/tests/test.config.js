'use strict';

const config = require('../../../../../config/bundle/rollup-test-testem');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
            '@cdp/result': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/event-publisher': 'node_modules/@cdp/event-publisher/dist/event-publisher',
            '@cdp/observable': 'node_modules/@cdp/observable/dist/observable',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
        },
    }),
};
