'use strict';

const { resolveNodeTesteeValue } = require('@cdp/tasks/utils');
const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
        },
        postproc: {
            replaces: [resolveNodeTesteeValue()],
        },
    }),
};
