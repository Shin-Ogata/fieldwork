'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports.default = config({
    globals: {
        '@cdp/core-utils': 'CDP.Utils',
    },
    // default export と同名の named export を許可
    exports: 'named',
});
