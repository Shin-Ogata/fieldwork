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
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/web-utils': 'CDP',
            '@cdp/dom': 'CDP',
            '@cdp/i18n': 'CDP',
            '@cdp/router': 'CDP',
            '@cdp/view': 'CDP',
        },
        replace,
    }),
};
