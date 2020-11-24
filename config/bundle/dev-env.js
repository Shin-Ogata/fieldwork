'use strict';

const { config, merge } = require('@cdp/tasks');
const sourcemapRoot = require('@cdp/tasks/rollup-plugin/source-map-root');
const {
    packageName: PACKAGE,
    dist: DIST,
    outName: OUTNAME,
    base: BASE,
    domain: DOMAIN,
    built: BUILT,
    test: TEST,
    dev: DEV,
    temp: TEMP,
    script: SCRIPT,
} = config.build;

const override = require('./rollup-override');

function getConfig(base, options) {
    const { requirejs } = options || {};
    override(base, Object.assign({
        input: `${BUILT}/${TEST}/${DEV}/${SCRIPT}/${BASE}.js`,
        outputFile: `${TEMP}/${DEV}/${SCRIPT}/${BASE}.js`,
        sourcemapRoot: sourcemapRoot({ relativePath: `../../../${TEST}/${DEV}/${SCRIPT}`, sourceRoot: `${DOMAIN}:///${DEV}/` })
    }, options));

    const requirejs_config = merge({
        baseUrl: '../../../',
        urlArgs: `bust=${Date.now()}`,
        paths: {
            [PACKAGE]: `${DIST}/${OUTNAME}`,
        },
    }, requirejs);

    return {
        __esModule: true,
        default: base,
        html: {
            input: `${TEST}/${DEV}/${BASE}.html`,
            output: `${TEMP}/${DEV}/${BASE}.html`,
            replaces: [
                ['{{{require_config}}})', JSON.stringify(requirejs_config)],
            ],
        },
    };
}

module.exports = getConfig;
