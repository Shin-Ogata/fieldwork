'use strict';

const { resolve }       = require('path');
const { config, merge } = require('@cdp/tasks');
const {
    packageName: PACKAGE,
    outName: OUTNAME,
    dist: DIST,
} = config.build;
const cwd = process.cwd();

// default terser options
// https://github.com/terser/terser#minify-options-structure
const terser = {
    ecma: 8,
    warnings: true,
    compress: {
        collapse_vars: false,
        drop_console: true,
        keep_classnames: true,
        keep_fnames: true,
        keep_infinity: true,
        side_effects: false
    },
    output: {
        comments: `/^![\\w\\W]+${PACKAGE.replace('/', '\\/')}[\\w\\W]+/`,
    },
    sourceMap: {
        content: 'inline',
        url: `${OUTNAME}.min.map`,
    },
};

function getConfig(options) {
    return merge({
        src: resolve(cwd, `${DIST}/${OUTNAME}.js`),
        out: resolve(cwd, `${DIST}/${OUTNAME}.min.js`),
        map: resolve(cwd, `${DIST}/${OUTNAME}.min.map`),
        terser,
    }, options);
}

module.exports = getConfig;
