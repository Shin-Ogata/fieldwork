'use strict';

const config = require('../../../../config/bundle/rollup-core');
const { replace } = require('@cdp/result/build.config');

module.exports.default = config({
    external: {
        '@cdp/core-utils': 'CDP',
        '@cdp/promise': 'CDP',
        '@cdp/result': 'CDP',
        '@cdp/binary': 'CDP',
    },
    replace,
});
