'use strict';

const config = require('../../../../config/bundle/rollup-core');

module.exports.default = config({
    globals: {
        'path': null,
        'fs-extra': null,
    },
    format: 'cjs',
    // default export と同名の named export を許可
//    exports: 'named',
});
