'use strict';

const config     = require('../../../../config/bundle/rollup-core');
const bundle_dts = require('../../../../config/bundle/dts-bundle');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
        },
        // default export と同名の named export を許可
        exports: 'named',
    }),
    dts: bundle_dts(),
};
