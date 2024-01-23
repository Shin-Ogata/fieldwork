'use strict';

const config = require('../../../../config/bundle/rollup-core');
const { makeSharedNamespaceReplacer } = require('@cdp/tasks/lib/bundle-utils');
const replace = makeSharedNamespaceReplacer();

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
        },
        replace,
    }),
};
