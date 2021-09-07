'use strict';

const { join }             = require('path');
const { includes }         = require('@cdp/tasks');
const { packageName, src } = require('@cdp/tasks/config').build;
const config               = require('../../../../config/bundle/rollup-test');
const { replace }          = require('../../../lib/core/result/build.config');
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
            '@cdp/router': 'CDP',
        },
        // for result tests
        replace,
    }),
    testem: config.testem({
        requirejs: {
            map: {
                specs: {
                    '@cdp/extension-template': '@cdp/essentials',
                    '@cdp/core-utils': '@cdp/essentials',
                    '@cdp/events': '@cdp/essentials',
                    '@cdp/promise': '@cdp/essentials',
                    '@cdp/observable': '@cdp/essentials',
                    '@cdp/result': '@cdp/essentials',
                    '@cdp/core-storage': '@cdp/essentials',
                    '@cdp/core-template': '@cdp/essentials',
                    '@cdp/ajax': '@cdp/essentials',
                    '@cdp/binary': '@cdp/essentials',
                    '@cdp/inline-worker': '@cdp/essentials',
                    '@cdp/dom': '@cdp/essentials',
                    '@cdp/environment': '@cdp/essentials',
                    '@cdp/i18n': '@cdp/essentials',
                    '@cdp/web-storage': '@cdp/essentials',
                    '@cdp/data-sync': '@cdp/essentials',
                    '@cdp/model': '@cdp/essentials',
                    '@cdp/collection': '@cdp/essentials',
                    '@cdp/view': '@cdp/essentials',
                    '@cdp/template': '@cdp/essentials',
                    '@cdp/router': '@cdp/essentials',
                },
            },
        },
    }),
    remap: {
        resolve(name, options) {
            const { info: includeExternal } = options;
            if (!includes(name, externals) || includeExternal) {
                const [collection, lib, ...paths] = name.split(`${packageName}/`)[1].split('/');
                return join('node_modules/@cdp', collection, 'node_modules/@cdp', lib, src, ...paths);
            }
        }
    },
    depends: [
        { module: '../../../lib/worker/ajax', resource: 'res', server: 'server' },
        { module: '../../../lib/web/i18n', resource: 'res' },
        { module: '../../../lib/web/data-sync', server: 'server' },
        { module: '../../../lib/web/template', resource: 'res' },
        { module: '../../../lib/web/router', resource: 'res' },
    ],
};
