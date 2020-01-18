'use strict';

const { resolveNodeTesteeValue } = require('@cdp/tasks/utils');
const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        external: {
            'path': null,
            'fs-extra': null,
            '@cdp/core-utils': null,
            '@cdp/events': null,
            '@cdp/promise': null,
        },
        postproc: {
            replacees: [resolveNodeTesteeValue()],
        },
    }),
};
