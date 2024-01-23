'use strict';

const config = require('../../../../config/bundle/rollup-core');
const { makeEnumReplacer } = require('@cdp/tasks/lib/bundle-utils');
const replace = makeEnumReplacer();

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/observable': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/i18n': 'CDP',
            '@cdp/data-sync': 'CDP',
            '@cdp/model': 'CDP',
        },
        replace,
    }),
};
