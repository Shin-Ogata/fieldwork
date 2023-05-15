'use strict';

const { join } = require('node:path');
const { packageName, src } = require('@cdp/tasks/config').build;
const config = require('../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/ui-core': 'CDP',
            '@cdp/ui-forms': 'CDP',
            '@cdp/ui-listview': 'CDP',
        },
    }),
    testem: config.testem({
        requirejs: {
            map: {
                specs: {
                    '@cdp/ui-core': '@cdp/ui-components',
                    '@cdp/ui-forms': '@cdp/ui-components',
                    '@cdp/ui-listview': '@cdp/ui-components',
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
    ],
};
