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
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/events': 'node_modules/@cdp/events/dist/events',
            '@cdp/promise': 'node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/result/dist/result',
            '@cdp/dom': 'node_modules/@cdp/dom/dist/dom',
            '@cdp/i18n': 'node_modules/@cdp/i18n/dist/i18n',
            '@cdp/router': 'node_modules/@cdp/router/dist/router',
            '@cdp/view': 'node_modules/@cdp/view/dist/view',
            '@cdp/web-utils': 'node_modules/@cdp/web-utils/dist/web-utils',

            // i18n
            '@cdp/extension-i18n': 'node_modules/@cdp/i18n/node_modules/@cdp/extension-i18n/dist/extension-i18n',
            '@cdp/ajax': 'node_modules/@cdp/i18n/node_modules/@cdp/ajax/dist/ajax',
        
            // router
            '@cdp/extension-path2regexp': 'node_modules/@cdp/router/node_modules/@cdp/extension-path2regexp/dist/extension-path2regexp',

            // ajax
            '@cdp/binary': 'node_modules/@cdp/i18n/node_modules/@cdp/ajax/node_modules/@cdp/binary/dist/binary',
        },
    }),
};
