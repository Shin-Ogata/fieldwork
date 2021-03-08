'use strict';

const config = require('../../../../../../config/bundle/dev-env');
const base   = require('../test.config');

const { default: rollup, testem } = base;

module.exports = config(rollup[1], {
    requirejs: {
        paths: testem.external,
    },
});
