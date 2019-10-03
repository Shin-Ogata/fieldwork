'use strict';

const config = require('../../../../../config/rollup/test.testem');
const { default: testee } = require('../rollup.config');

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
        },
        replace: {
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
