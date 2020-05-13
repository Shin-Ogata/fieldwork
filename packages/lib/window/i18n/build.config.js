'use strict';

const config = require('../../../../config/bundle/rollup-core');
const { replace } = require('@cdp/result/build.config');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/extension-i18n': 'CDP.Extension',
            '@cdp/core-utils': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/ajax': 'CDP',
            '@cdp/environment': 'CDP',
            '@cdp/dom': 'CDP',
        },
        replace,
    }),
};
