'use strict';

const config = require('../../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/i18n': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/extension-template': 'node_modules/@cdp/extension-template/dist/extension-template',
            '@cdp/extension-template-bridge': 'node_modules/@cdp/extension-template-bridge/dist/extension-template-bridge',
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/core-template': 'node_modules/@cdp/core-template/dist/core-template',
            '@cdp/web-utils': 'node_modules/@cdp/web-utils/dist/web-utils',
            '@cdp/dom': 'node_modules/@cdp/dom/dist/dom',
            '@cdp/i18n': 'node_modules/@cdp/i18n/dist/i18n',
            // web-utils
            '@cdp/ajax': 'node_modules/@cdp/web-utils/node_modules/@cdp/ajax/dist/ajax',
            // ajax
            '@cdp/promise': 'node_modules/@cdp/web-utils/node_modules/@cdp/ajax/node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/web-utils/node_modules/@cdp/ajax/node_modules/@cdp/result/dist/result',
            '@cdp/binary': 'node_modules/@cdp/web-utils/node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
            // promise
            '@cdp/events': 'node_modules/@cdp/web-utils/node_modules/@cdp/ajax/node_modules/@cdp/promise/node_modules/@cdp/events/dist/events',
            // i18n
            '@cdp/extension-i18n': 'node_modules/@cdp/i18n/node_modules/@cdp/extension-i18n/dist/extension-i18n',
        },
    }),
};
