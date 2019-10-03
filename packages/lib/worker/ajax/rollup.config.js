'use strict';

const config = require('../../../../config/rollup/core');
const { replace } = require('@cdp/result/rollup.config');

module.exports = config({
    globals: {
        '@cdp/core-utils': 'CDP.Utils',
        '@cdp/promise': 'CDP',
        '@cdp/result': 'CDP',
        '@cdp/binary': 'CDP',
    },
    replace,
});
