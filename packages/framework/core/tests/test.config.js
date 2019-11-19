'use strict';

const { join } = require('path');
const { packageName, src } = require('@cdp/tasks/config').build;
const config = require('../../../../config/bundle/rollup-test-testem');
const testee = require('../build.config').default;

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
            '@cdp/event-publisher': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/observable': 'CDP',
            '@cdp/core-storage': 'CDP',
            '@cdp/result': 'CDP',
        },
        // for result tests
        replace: {
            delimiters: ['', ''],
            values: {
                'var CDP_DECLARE;': 'globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;',
                '(CDP_DECLARE)': '()',
                '(CDP_DECLARE || (CDP_DECLARE = {}))': '()',
                'let RESULT_CODE;': 'let RESULT_CODE = CDP_DECLARE.RESULT_CODE;',
                '(RESULT_CODE)': '()',
                '(RESULT_CODE = CDP_DECLARE.RESULT_CODE || (CDP_DECLARE.RESULT_CODE = {}))': '()',
            },
        },
    }),
    testem: config.testem({
        requirejs: {
            map: {
                'specs': {
                    '@cdp/core-utils': '@cdp/framework-core',
                    '@cdp/event-publisher': '@cdp/framework-core',
                    '@cdp/promise': '@cdp/framework-core',
                    '@cdp/observable': '@cdp/framework-core',
                    '@cdp/core-storage': '@cdp/framework-core',
                    '@cdp/result': '@cdp/framework-core',
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
