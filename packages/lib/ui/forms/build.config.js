'use strict';

const { resolve } = require('node:path');
const config = require('../../../../config/bundle/rollup-core');

module.exports = {
    __esModule: true,
    default: config({
        alias: {
            entries: [
                {
                    find: '@css/structure.css',
                    replacement: resolve('built/@css/structure.css'),
                },
                {
                    find: '@css/structure-button.css',
                    replacement: resolve('built/@css/structure-button.css'),
                },
            ],
        },
        external: {
            '@cdp/runtime': 'CDP',
        },
    }),
};
