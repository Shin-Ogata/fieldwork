'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
        },
    }),
};
