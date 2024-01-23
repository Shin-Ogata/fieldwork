'use strict';

const config = require('../../../../config/bundle/rollup-core');
const { makeEnumReplacer } = require('@cdp/tasks/lib/bundle-utils');
const replace = makeEnumReplacer();

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/extension-i18n': 'CDP.Extension',
            '@cdp/core-utils': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/ajax': 'CDP',
            '@cdp/web-utils': 'CDP',
            '@cdp/dom': 'CDP',
        },
        replace,
    }),
};
