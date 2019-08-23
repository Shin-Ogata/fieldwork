'use strict';

const nodeResolve = require('rollup-plugin-node-resolve');
const sourcemaps = require('rollup-plugin-sourcemaps');
const sourcemapRoot = require('@cdp/tasks/rollup-plugin-sourcemap-root');
const replacer = require('rollup-plugin-replace');
const replaceValues = require('./default-replace-values');
const { config, banner } = require('@cdp/tasks');

const {
    packageName: PACKAGE,
    outName: OUTNAME,
    base: BASE,
    global: GLOBAL,
    domain: DOMAIN,
    dist: DIST,
    built: BUILT,
    relativePath,
} = config.build;

function getConfig(options) {
    const globals = options && options.globals;
    const external = globals && Object.keys(globals);
    const replace = options && options.replace;
    const exports = options && options.exports;

    return {
        input: `${BUILT}/${BASE}.js`,
        external,
        plugins: [
            nodeResolve({ mainFields: ['module', 'main', 'jsnext:main'] }),
            sourcemaps(),
            sourcemapRoot({ relativePath: relativePath(), sourceRoot: `${DOMAIN}:///${PACKAGE}/` }),
            replacer(Object.assign(replaceValues, replace)),
        ],
        output: [
            {
                banner: banner(),
                file: `${DIST}/${OUTNAME}.mjs`,
                format: 'es',
                preferconst: true,
                sourcemap: 'inline',
            },
            {
                banner: banner(),
                file: `${DIST}/${OUTNAME}.js`,
                format: 'umd',
                name: `${GLOBAL}`,
                extend: true,
                preferConst: true,
                sourcemap: 'inline',
                globals,
                exports,
            },
        ],
    };
}

module.exports = getConfig;
