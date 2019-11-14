'use strict';

const nodeResolve        = require('rollup-plugin-node-resolve');
const sourcemapDetect    = require('@cdp/tasks/rollup-plugin-source-map-detect');
const sourcemapRoot      = require('@cdp/tasks/rollup-plugin-source-map-root');
const replacer           = require('rollup-plugin-replace');
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
            sourcemapDetect(),
            sourcemapRoot({ relativePath: relativePath(), sourceRoot: `${DOMAIN}:///${PACKAGE}/` }),
            replace && replacer(replace),
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
