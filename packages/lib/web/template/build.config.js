'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/extension-template': 'CDP.Exension',
            '@cdp/extension-template-bridge': 'CDP.Exension',
            '@cdp/core-utils': 'CDP',
            '@cdp/core-template': 'CDP',
            '@cdp/ajax': 'CDP',
        },
    }),
};
