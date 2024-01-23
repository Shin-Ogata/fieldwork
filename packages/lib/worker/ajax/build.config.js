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
            '@cdp/binary': 'CDP',
        },
        replace,
    }),
};
