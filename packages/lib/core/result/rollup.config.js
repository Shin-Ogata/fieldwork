'use strict';

const config = require('../../../../config/rollup/core');

module.exports = {
    default: config({
        globals: {
            '@cdp/core-utils': 'CDP.Utils',
        },
        replace: {
            delimiters: ['', ''],
            values: {
                'var CDP_DECLARE;': 'globalThis.CDP_DECLARE = globalThis.CDP_DECLARE || {};',
                '(CDP_DECLARE)': '()',
                '(CDP_DECLARE || (CDP_DECLARE = {}))': '()',
            },
        },
    }),
    // for client settings
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
};
