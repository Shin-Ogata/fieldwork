'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports.default = config({
    external: {
        '@cdp/core-utils': 'CDP',
        '@cdp/ajax': 'CDP',
        '@cdp/dom': 'CDP',
        '@cdp/extension-i18n': 'CDP.Extension',
    },
});
