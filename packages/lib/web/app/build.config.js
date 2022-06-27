'use strict';

const config      = require('../../../../config/bundle/rollup-core');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/i18n': 'CDP',
            '@cdp/router': 'CDP',
            '@cdp/view': 'CDP',
        },
    }),
};
