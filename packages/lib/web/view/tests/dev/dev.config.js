'use strict';

const config = require('../../../../../../config/bundle/dev-env');
const base   = require('../test.config');

const { default: rollup, testem } = base;

module.exports = config(rollup[1], {
    external: {
        '@cdp/core-template': 'CDP',
        '@cdp/data-sync': 'CDP',
        '@cdp/model': 'CDP',
        '@cdp/collection': 'CDP',
    },
    requirejs: {
        paths: Object.assign({}, testem.external, {
            '@cdp/core-template': 'node_modules/@cdp/core-template/dist/core-template',
            '@cdp/data-sync': 'node_modules/@cdp/data-sync/dist/data-sync',
            '@cdp/model': 'node_modules/@cdp/model/dist/model',
            '@cdp/collection': 'node_modules/@cdp/collection/dist/collection',
            // data-sync
            '@cdp/ajax': 'node_modules/@cdp/data-sync/node_modules/@cdp/ajax/dist/ajax',
            '@cdp/core-storage': 'node_modules/@cdp/data-sync/node_modules/@cdp/core-storage/dist/core-storage',
            '@cdp/promise': 'node_modules/@cdp/data-sync/node_modules/@cdp/promise/dist/promise',
            '@cdp/result': 'node_modules/@cdp/data-sync/node_modules/@cdp/result/dist/result',
            '@cdp/web-storage': 'node_modules/@cdp/data-sync/node_modules/@cdp/web-storage/dist/web-storage',
            // web-strage
            '@cdp/binary': 'node_modules/@cdp/data-sync/node_modules/@cdp/web-storage/node_modules/@cdp/binary/dist/binary',
            // model
            '@cdp/observable': 'node_modules/@cdp/model/node_modules/@cdp/observable/dist/observable',
            // collection
            '@cdp/i18n': 'node_modules/@cdp/collection/node_modules/@cdp/i18n/dist/i18n',
            // i18n
            '@cdp/extension-i18n': 'node_modules/@cdp/collection/node_modules/@cdp/i18n/node_modules/@cdp/extension-i18n/dist/extension-i18n',
            '@cdp/environment': 'node_modules/@cdp/collection/node_modules/@cdp/i18n/node_modules/@cdp/environment/dist/environment',
        }),
    },
});
