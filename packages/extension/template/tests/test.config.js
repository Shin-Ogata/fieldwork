'use strict';

const { resolve, join } = require('path');
const { packageName, src } = require('@cdp/tasks/config').build;
const config = require('../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;
const cwd = process.cwd();

module.exports = {
    default: config.default(testee, {
        external: {
            '@cdp/core-utils': 'CDP.Utils',
            '@cdp/core-template': 'CDP',
            '@cdp/dom': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/core-template': 'node_modules/@cdp/core-template/dist/core-template',
            '@cdp/dom': 'node_modules/@cdp/dom/dist/dom',
        },
    }),
    remap: {
        resolve(name, options) {
            const { info: includeExternal } = options;
            if (name.startsWith(packageName)) {
                return resolve(cwd, name.replace(packageName, src));
            } else if (includeExternal) {
                const [lib, ...paths] = name.split('@cdp/node_modules/')[1].split('/');
                return join('node_modules', lib, ...paths);
            }
        }
    },
};
