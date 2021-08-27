'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/dom': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/extension-template': 'node_modules/@cdp/extension-template/dist/extension-template',
            '@cdp/extension-template-transformer': 'node_modules/@cdp/extension-template-transformer/dist/extension-template-transformer',
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/core-template': 'node_modules/@cdp/core-template/dist/core-template',
            '@cdp/ajax': 'node_modules/@cdp/ajax/dist/ajax',
            '@cdp/dom': 'node_modules/@cdp/dom/dist/dom',
            // ajax
            '@cdp/promise': 'node_modules/@cdp/ajax/node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/ajax/node_modules/@cdp/result/dist/result',
            '@cdp/binary': 'node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
            // promise
            '@cdp/events': 'node_modules/@cdp/ajax/node_modules/@cdp/promise/node_modules/@cdp/events/dist/events',
        },
    }),
};
