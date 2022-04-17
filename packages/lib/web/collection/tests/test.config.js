'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/events': 'node_modules/@cdp/events/dist/events',
            '@cdp/observable': 'node_modules/@cdp/observable/dist/observable',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/i18n': 'node_modules/@cdp/i18n/dist/i18n',
            '@cdp/data-sync': 'node_modules/@cdp/data-sync/dist/data-sync',
            '@cdp/model': 'node_modules/@cdp/model/dist/model',
            '@cdp/extension-i18n': 'node_modules/@cdp/i18n/node_modules/@cdp/extension-i18n/dist/extension-i18n',
            '@cdp/ajax': 'node_modules/@cdp/i18n/node_modules/@cdp/ajax/dist/ajax',
            '@cdp/binary': 'node_modules/@cdp/i18n/node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
            '@cdp/environment': 'node_modules/@cdp/i18n/node_modules/@cdp/environment/dist/environment',
            '@cdp/dom': 'node_modules/@cdp/i18n/node_modules/@cdp/dom/dist/dom',
            '@cdp/core-storage': 'node_modules/@cdp/data-sync/node_modules/@cdp/core-storage/dist/core-storage',
            '@cdp/web-storage': 'node_modules/@cdp/data-sync/node_modules/@cdp/web-storage/dist/web-storage',
            // i18n
            '@cdp/web-utils': 'node_modules/@cdp/i18n/node_modules/@cdp/web-utils/dist/web-utils',
        },
    }),
};
