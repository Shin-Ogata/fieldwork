'use strict';

const multiEntry        = require('@rollup/plugin-multi-entry');
const { nodeResolve }   = require('@rollup/plugin-node-resolve');
const commonjs          = require('@rollup/plugin-commonjs');
const alias             = require('@rollup/plugin-alias');
const replacer          = require('@rollup/plugin-replace');
const sourcemapDetect   = require('@cdp/tasks/rollup-plugin/source-map-detect');
const sourcemapRoot     = require('@cdp/tasks/rollup-plugin/source-map-root');
const postProcesser     = require('@cdp/tasks/rollup-plugin/post-process');
const { config, merge } = require('@cdp/tasks');

const {
    packageName: PACKAGE,
    outName: OUTNAME,
    global: GLOBAL,
    domain: DOMAIN,
    built: BUILT,
    test: TEST,
    unit: UNIT,
    temp: TEMP,
    relativePath,
} = config.build;

function getDefault(testeeConfig, options) {
    const opts = merge({
        commonjs: {
            include: 'node_modules/**',
        },
    }, options);
    const { external: globals, commonjs: cjsOptions, alias: aliasOptions, replace, postproc, domain } = opts;
    const external = (globals && Object.keys(globals)) || [];

    testeeConfig.output = testeeConfig.output.filter(elem => elem.format !== 'es').map((elem) => {
        elem.file = `${TEMP}/${OUTNAME}.js`;
        return elem;
    });

    const format = testeeConfig.output[0].format;
    const umd = 'umd' === format;
    const cjs = 'cjs' === format;

    testeeConfig.watch = {
        include: [
            `${BUILT}/**/*.js`,
        ],
        exclude: [
            `${BUILT}/${TEST}/**/*.js`,
        ],
    };

    return [
        testeeConfig,
        {
            input: `${BUILT}/${TEST}/${UNIT}/**/*.js`,
            plugins: [
                multiEntry(),
                nodeResolve({
                    mainFields: ['module', 'main', 'jsnext:main'],
                    preferBuiltins: true,
                }),
                cjs && commonjs(cjsOptions),
                aliasOptions && alias(aliasOptions),
                sourcemapDetect(),
                sourcemapRoot({ relativePath: relativePath(`${TEST}/${UNIT}`), sourceRoot: `${domain || DOMAIN}:///specs/` }),
                replace && replacer(replace),
                postproc && postProcesser(postproc),
            ],
            external: [
                ...[
                    `${PACKAGE}`,
                ],
                ...external,
            ],
            output: [
                {
                    file: `${TEMP}/${OUTNAME}-spec.js`,
                    format,
                    name: umd ? 'Test' : undefined,
                    globals: umd ? Object.assign(
                        {},
                        { [PACKAGE]: `${GLOBAL}` },
                        globals,
                    ) : undefined,
                    preferConst: true,
                    sourcemap: 'inline',
                },
            ],
            watch: {
                include: [
                    `${BUILT}/${TEST}/**/*.js`,
                ],
            },
        }
    ];
}

function getTestem(options) {
    const { external, requirejs } = options || {};
    const requirejs_config = Object.assign({}, requirejs, {
        baseUrl: '../../',
        paths: Object.assign({
            'boot': `${TEMP}/testem/framework/boot`,
            'testem': '../../../testem',
            [PACKAGE]: `${TEMP}/${OUTNAME}`,
            'specs': `${TEMP}/${OUTNAME}-spec`,
        }, external),
    });
    return {
        requirejs_config,
        src_files: [
            `${TEMP}/${OUTNAME}.js`,
            `${TEMP}/${OUTNAME}-spec.js`,
        ],
    };
}

module.exports = {
    default: getDefault,
    testem: getTestem,
};
