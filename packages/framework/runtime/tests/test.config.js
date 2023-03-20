'use strict';

const { join }             = require('node:path');
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
        // for result tests
        replace,
    }),
    testem: config.testem({
        random: false,
        requirejs: {
            map: {
                specs: {
                    '@cdp/extension-template': '@cdp/runtime',
                    '@cdp/core-utils': '@cdp/runtime',
                    '@cdp/events': '@cdp/runtime',
                    '@cdp/promise': '@cdp/runtime',
                    '@cdp/observable': '@cdp/runtime',
                    '@cdp/result': '@cdp/runtime',
                    '@cdp/core-storage': '@cdp/runtime',
                    '@cdp/core-template': '@cdp/runtime',
                    '@cdp/ajax': '@cdp/runtime',
                    '@cdp/binary': '@cdp/runtime',
                    '@cdp/inline-worker': '@cdp/runtime',
                    '@cdp/web-utils': '@cdp/runtime',
                    '@cdp/dom': '@cdp/runtime',
                    '@cdp/environment': '@cdp/runtime',
                    '@cdp/i18n': '@cdp/runtime',
                    '@cdp/web-storage': '@cdp/runtime',
                    '@cdp/data-sync': '@cdp/runtime',
                    '@cdp/model': '@cdp/runtime',
                    '@cdp/collection': '@cdp/runtime',
                    '@cdp/view': '@cdp/runtime',
                    '@cdp/template': '@cdp/runtime',
                    '@cdp/router': '@cdp/runtime',
                    '@cdp/app': '@cdp/runtime',
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
        { module: '../../../lib/web/utils', resource: 'res' },
        { module: '../../../lib/web/i18n', resource: 'res' },
        { module: '../../../lib/web/data-sync', server: 'server' },
        { module: '../../../lib/web/template', resource: 'res' },
        { module: '../../../lib/web/router', resource: 'res' },
        { module: '../../../lib/web/app', resource: 'res' },
    ],
};
