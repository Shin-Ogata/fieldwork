'use strict';

const { join } = require('path');
const { packageName, src } = require('@cdp/tasks/config').build;
const config = require('../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/ajax': 'CDP',
            '@cdp/binary': 'CDP',
            '@cdp/inline-worker': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/lib-core': 'node_modules/@cdp/lib-core/dist/lib-core',
        },
        requirejs: {
            map: {
                specs: {
                    '@cdp/core-utils': '@cdp/lib-core',
                    '@cdp/promise': '@cdp/lib-core',
                    '@cdp/result': '@cdp/lib-core',
                    '@cdp/ajax': '@cdp/lib-worker',
                    '@cdp/binary': '@cdp/lib-worker',
                    '@cdp/inline-worker': '@cdp/lib-worker',
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
    depends: [
        { module: '@cdp/ajax', resource: 'res', server: 'server' },
    ],
};
