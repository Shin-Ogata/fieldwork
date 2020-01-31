'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        external: {
            '@cdp/extension-i18n': 'CDP.Extension',
            '@cdp/core-utils': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/ajax': 'CDP',
            '@cdp/environment': 'CDP',
            '@cdp/dom': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/binary': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/extension-i18n': 'node_modules/@cdp/extension-i18n/dist/extension-i18n',
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/ajax': 'node_modules/@cdp/ajax/dist/ajax',
            '@cdp/environment': 'node_modules/@cdp/environment/dist/environment',
            '@cdp/dom': 'node_modules/@cdp/dom/dist/dom',
            '@cdp/events': 'node_modules/@cdp/promise/node_modules/@cdp/events/dist/events',
            '@cdp/binary': 'node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
        },
    }),
};
