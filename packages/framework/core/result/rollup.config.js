'use strict';

const config = require('../../../../config/rollup/core');

module.exports = config({
    globals: {
        '@cdp/promise': 'CDP',
    },
    replace: {
        values: {
            'var CDP': 'var CDP = exports',
        },
    },
});
