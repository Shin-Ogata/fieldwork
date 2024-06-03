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
            '@cdp/runtime': 'node_modules/@cdp/runtime/dist/runtime',
            '@cdp/ui-utils': 'node_modules/@cdp/ui-utils/dist/ui-utils',
        },
    }),
};
