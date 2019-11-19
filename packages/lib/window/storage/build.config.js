'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports.default = config({
    globals: {
        '@cdp/core-utils': 'CDP.Utils',
        '@cdp/event-publisher': 'CDP',
        '@cdp/promise': 'CDP',
        '@cdp/core-storage': 'CDP',
        '@cdp/binary': 'CDP',
    },
    // default export と同名の named export を許可
    exports: 'named',
});
