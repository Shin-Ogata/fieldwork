'use strict';

const { resolve, join } = require('path');
const { includes } = require('@cdp/tasks');
const { packageName, src } = require('@cdp/tasks/config').build;
const config = require('../../../../config/bundle/rollup-test');
const testee = require('../build.config').default;
const cwd = process.cwd();

const externals = ['lit-transformer', 'stampino/', 'jexpr'];

module.exports = {
    __esModule: true,
    default: config.default(testee, {
        external: {
            '@cdp/extension-template': 'CDP.Exension',
            '@cdp/core-utils': 'CDP',
            '@cdp/core-template': 'CDP',
            '@cdp/dom': 'CDP',
        },
    }),
    testem: config.testem({
        external: {
            '@cdp/extension-template': 'node_modules/@cdp/extension-template/dist/extension-template',
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
            '@cdp/core-template': 'node_modules/@cdp/core-template/dist/core-template',
            '@cdp/dom': 'node_modules/@cdp/dom/dist/dom',
        },
    }),
    remap: {
        resolve(name, options) {
            const { info: includeExternal } = options;
            if (includes(name, externals)) {
                if (includeExternal) {
                    const [lib, ...paths] = name.split(`${packageName}/`)[1].split('/');
                    return join('node_modules', lib, ...paths);
                }
            } else {
                return resolve(cwd, name.replace(packageName, src));
            }
        }
    },
};
