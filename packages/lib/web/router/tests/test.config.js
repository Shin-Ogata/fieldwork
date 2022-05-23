'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
        },
    }),
    testem: config.testem({
        random: false,
        external: {
            '@cdp/extension-path2regexp': 'node_modules/@cdp/extension-path2regexp/dist/extension-path2regexp',
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/events': 'node_modules/@cdp/events/dist/events',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/web-utils': 'node_modules/@cdp/web-utils/dist/web-utils',
            '@cdp/dom': 'node_modules/@cdp/dom/dist/dom',
            // web-utils
            '@cdp/ajax': 'node_modules/@cdp/web-utils/node_modules/@cdp/ajax/dist/ajax',
            // ajax
            '@cdp/binary': 'node_modules/@cdp/web-utils/node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
        },
    }),
};
