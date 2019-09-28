'use strict';

const config = require('../../../../config/rollup/core');

module.exports = config({
    globals: {
        '@cdp/core-utils': 'CDP.Utils',
        '@cdp/promise': 'CDP',
        '@cdp/result': 'CDP',
        '@cdp/binary': 'CDP',
    },
});
