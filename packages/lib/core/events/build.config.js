'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
        },
        // 内部シンボル $cdp.
        onwarn(warning, warn) {
            const { code, names } = warning;
            if ('UNUSED_EXTERNAL_IMPORT' === code && names.includes('$cdp')) {
                return;
            }
            warn(warning);
        }
    }),
};
