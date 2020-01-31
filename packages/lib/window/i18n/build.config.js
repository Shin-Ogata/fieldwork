'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports.default = config({
    external: {
        '@cdp/extension-i18n': 'CDP.Extension',
        '@cdp/core-utils': 'CDP',
        '@cdp/promise': 'CDP',
        '@cdp/result': 'CDP',
        '@cdp/ajax': 'CDP',
        '@cdp/environment': 'CDP',
        '@cdp/dom': 'CDP',
    },
});
