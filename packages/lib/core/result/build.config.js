'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
        },
        replace: {
            preventAssignment: true,
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
        preventAssignment: true,
        delimiters: ['', ''],
        values: {
            'var CDP_DECLARE;\n': '',
            '(CDP_DECLARE)': '()',
            '(CDP_DECLARE || (CDP_DECLARE = {}))': '()',
            'let RESULT_CODE;': 'let RESULT_CODE = CDP_DECLARE.RESULT_CODE;',
            '(RESULT_CODE)': '()',
            '(RESULT_CODE = CDP_DECLARE.RESULT_CODE || (CDP_DECLARE.RESULT_CODE = {}))': '()',
        },
    },
};
