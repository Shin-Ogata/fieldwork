'use strict';

const config = require('../../../../../config/rollup/test.testem');
const testee = require('../rollup.config');

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/promise': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
        },
    }),
};
