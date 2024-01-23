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
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/data-sync': 'CDP',
        },
        replace,
    }),
};
