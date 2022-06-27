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
            '@cdp/web-utils': 'CDP',
            '@cdp/dom': 'CDP',
            '@cdp/environment': 'CDP',
            '@cdp/i18n': 'CDP',
            '@cdp/web-storage': 'CDP',
            '@cdp/data-sync': 'CDP',
            '@cdp/model': 'CDP',
            '@cdp/collection': 'CDP',
            '@cdp/view': 'CDP',
            '@cdp/template': 'CDP',
            '@cdp/router': 'CDP',
            '@cdp/app': 'CDP',
        },
    }),
    testem: config.testem({
        random: false,
        external: {
            '@cdp/lib-core': 'node_modules/@cdp/lib-core/dist/lib-core',
            '@cdp/lib-worker': 'node_modules/@cdp/lib-worker/dist/lib-worker',
        },
        requirejs: {
            map: {
                specs: {
                    '@cdp/extension-template': '@cdp/lib-web',
                    '@cdp/core-utils': '@cdp/lib-core',
                    '@cdp/events': '@cdp/lib-core',
                    '@cdp/promise': '@cdp/lib-core',
                    '@cdp/observable': '@cdp/lib-core',
                    '@cdp/result': '@cdp/lib-core',
                    '@cdp/core-storage': '@cdp/lib-core',
                    '@cdp/core-template': '@cdp/lib-core',
                    '@cdp/ajax': '@cdp/lib-worker',
                    '@cdp/binary': '@cdp/lib-worker',
                    '@cdp/inline-worker': '@cdp/lib-worker',
                    '@cdp/web-utils': '@cdp/lib-web',
                    '@cdp/dom': '@cdp/lib-web',
                    '@cdp/environment': '@cdp/lib-web',
                    '@cdp/i18n': '@cdp/lib-web',
                    '@cdp/web-storage': '@cdp/lib-web',
                    '@cdp/data-sync': '@cdp/lib-web',
                    '@cdp/model': '@cdp/lib-web',
                    '@cdp/collection': '@cdp/lib-web',
                    '@cdp/view': '@cdp/lib-web',
                    '@cdp/template': '@cdp/lib-web',
                    '@cdp/router': '@cdp/lib-web',
                    '@cdp/app': '@cdp/lib-web',
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
        { module: '@cdp/web-utils', resource: 'res' },
        { module: '@cdp/i18n', resource: 'res' },
        { module: '@cdp/data-sync', server: 'server' },
        { module: '@cdp/template', resource: 'res' },
        { module: '@cdp/router', resource: 'res' },
        { module: '@cdp/app', resource: 'res' },
    ],
};
