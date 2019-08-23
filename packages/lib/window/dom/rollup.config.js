'use strict';

const config = require('../../../../config/rollup/core');

module.exports = config({
    globals: {
        '@cdp/core-utils': 'CDP.Utils',
    },
    // default export と同名の named export を許可
    exports: 'named',
});
