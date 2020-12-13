'use strict';

const { join }             = require('path');
const { includes }         = require('@cdp/tasks');
const { packageName, src } = require('@cdp/tasks/config').build;
const config               = require('../../../../config/bundle/rollup-test');
const testee               = require('../build.config').default;

const externals = ['extension'];

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/extension-template': 'CDP.Exension',
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/observable': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/core-storage': 'CDP',
            '@cdp/core-template': 'CDP',
            '@cdp/ajax': 'CDP',
            '@cdp/binary': 'CDP',
            '@cdp/inline-worker': 'CDP',
            '@cdp/dom': 'CDP',
            '@cdp/environment': 'CDP',
            '@cdp/i18n': 'CDP',
            '@cdp/web-storage': 'CDP',
            '@cdp/data-sync': 'CDP',
            '@cdp/model': 'CDP',
            '@cdp/collection': 'CDP',
            '@cdp/view': 'CDP',
            '@cdp/template': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/framework-core': 'node_modules/@cdp/framework-core/dist/framework-core',
            '@cdp/framework-worker': 'node_modules/@cdp/framework-worker/dist/framework-worker',
        },
        requirejs: {
            map: {
                specs: {
                    '@cdp/extension-template': '@cdp/framework-window',
                    '@cdp/core-utils': '@cdp/framework-core',
                    '@cdp/events': '@cdp/framework-core',
                    '@cdp/promise': '@cdp/framework-core',
                    '@cdp/observable': '@cdp/framework-core',
                    '@cdp/result': '@cdp/framework-core',
                    '@cdp/core-storage': '@cdp/framework-core',
                    '@cdp/core-template': '@cdp/framework-core',
                    '@cdp/ajax': '@cdp/framework-worker',
                    '@cdp/binary': '@cdp/framework-worker',
                    '@cdp/inline-worker': '@cdp/framework-worker',
                    '@cdp/dom': '@cdp/framework-window',
                    '@cdp/environment': '@cdp/framework-window',
                    '@cdp/i18n': '@cdp/framework-window',
                    '@cdp/web-storage': '@cdp/framework-window',
                    '@cdp/data-sync': '@cdp/framework-window',
                    '@cdp/model': '@cdp/framework-window',
                    '@cdp/collection': '@cdp/framework-window',
                    '@cdp/view': '@cdp/framework-window',
                    '@cdp/template': '@cdp/framework-window',
                },
            },
        },
    }),
    remap: {
        resolve(name, options) {
            const { info: includeExternal } = options;
            if (!includes(name, externals) || includeExternal) {
                const [lib, ...paths] = name.split(`${packageName}/`)[1].split('/');
                return join('node_modules/@cdp', lib, src, ...paths);
            }
        }
    },
    depends: [
        { module: '@cdp/i18n', resource: 'res' },
        { module: '@cdp/data-sync', server: 'server' },
        { module: '@cdp/template', resource: 'res' },
    ],
};
