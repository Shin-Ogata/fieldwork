'use strict';

const config = require('../../../../config/bundle/rollup-core');
const { replace } = require('@cdp/result/build.config');

module.exports.default = config({
    globals: {
        '@cdp/core-utils': 'CDP.Utils',
        '@cdp/promise': 'CDP',
        '@cdp/result': 'CDP',
        '@cdp/binary': 'CDP',
    },
    replace,
});
