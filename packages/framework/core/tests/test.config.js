'use strict';

const { join } = require('path');
const { packageName, src } = require('@cdp/tasks/config').build;
const { replace } = require('@cdp/result/build.config');
const config = require('../../../../config/bundle/rollup-test-testem');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
            '@cdp/events': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/observable': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/core-storage': 'CDP',
            '@cdp/template': 'CDP',
        },
        // for result tests
        replace,
    }),
    testem: config.testem({
        requirejs: {
            map: {
                'specs': {
                    '@cdp/core-utils': '@cdp/framework-core',
                    '@cdp/events': '@cdp/framework-core',
                    '@cdp/promise': '@cdp/framework-core',
                    '@cdp/observable': '@cdp/framework-core',
                    '@cdp/result': '@cdp/framework-core',
                    '@cdp/core-storage': '@cdp/framework-core',
                    '@cdp/template': '@cdp/framework-core',
                },
            },
        },
    }),
    remap: {
        resolve(name) {
            const [lib, ...paths] = name.split(`${packageName}/`)[1].split('/');
            return join('node_modules/@cdp', lib, src, ...paths);
        }
    },
};
