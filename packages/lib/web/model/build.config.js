'use strict';

const config      = require('../../../../config/bundle/rollup-core');
const { replace } = require('@cdp/result/build.config');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/observable': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/data-sync': 'CDP',
        },
        replace,
    }),
};
