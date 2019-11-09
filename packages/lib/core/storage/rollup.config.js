'use strict';

const config = require('../../../../config/rollup/core');

module.exports = config({
    globals: {
        '@cdp/core-utils': 'CDP.Utils',
        '@cdp/event-publisher': 'CDP',
        '@cdp/promise': 'CDP',
    },
});
