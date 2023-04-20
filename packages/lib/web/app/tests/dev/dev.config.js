'use strict';

const config = require('../../../../../../config/bundle/dev-env');
const base   = require('../test.config');

const { default: rollup, testem } = base;

module.exports = config(rollup[1], {
    external: {
        '@cdp/observable': 'CDP',
        '@cdp/template': 'CDP',
    },
    requirejs: {
        paths: Object.assign({}, testem.external, {
            '@cdp/observable': 'node_modules/@cdp/observable/dist/observable',
            '@cdp/template': 'node_modules/@cdp/template/dist/template',
            // template
            '@cdp/extension-template': 'node_modules/@cdp/template/node_modules/@cdp/extension-template/dist/extension-template',
            '@cdp/extension-template-bridge': 'node_modules/@cdp/template/node_modules/@cdp/extension-template-bridge/dist/extension-template-bridge',
            '@cdp/core-template': 'node_modules/@cdp/template/node_modules/@cdp/core-template/dist/core-template',
        }),
    },
});
