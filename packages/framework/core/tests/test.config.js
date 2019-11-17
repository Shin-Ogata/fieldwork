'use strict';

const config = require('../../../../config/rollup/test.testem');
const testee = require('../rollup.config');
const { outName, temp } = require('@cdp/tasks').config.build;

module.exports = {
    default: config.default(testee, {
        globals: {
            '@cdp/core-utils': 'CDP',
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
};
