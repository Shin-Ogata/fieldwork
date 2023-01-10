'use strict';

const config = require('../../../../../../config/bundle/dev-env');
const base   = require('../test.config');

const { default: rollup, testem } = base;

module.exports = config(rollup[1], {
    external: {
    },
    requirejs: {
        paths: Object.assign({}, testem.external, {
        }),
    },
});
