'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/core-utils': 'CDP',
        },
        replace: {
            preventAssignment: true,
            delimiters: ['', ''],
            values: {
                'var CDP_DECLARE;': 'globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;',
            },
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
        },
    }),
};
