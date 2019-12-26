'use strict';

const config = require('../../../../config/bundle/rollup-core');
const { replace } = require('@cdp/result/build.config');

module.exports.default = config({
    external: {
        '@cdp/core-utils': 'CDP.Utils',
        '@cdp/events': 'CDP',
        '@cdp/promise': 'CDP',
        '@cdp/core-storage': 'CDP',
        '@cdp/result': 'CDP',
        '@cdp/ajax': 'CDP',
    },
    replace,
});
