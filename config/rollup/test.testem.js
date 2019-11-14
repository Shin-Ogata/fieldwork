'use strict';

const multiEntry        = require('rollup-plugin-multi-entry');
const alias             = require('rollup-plugin-alias');
const sourcemapDetect   = require('@cdp/tasks/rollup-plugin-source-map-detect');
const sourcemapRoot     = require('@cdp/tasks/rollup-plugin-source-map-root');
const replacer          = require('rollup-plugin-replace');
const { config }        = require('@cdp/tasks');

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
    const globals = options && options.globals;
    const external = globals && Object.keys(options.globals) || [];
    const replace = options && options.replace;

    testeeConfig.output = testeeConfig.output.filter(elem => elem.format === 'umd').map((elem) => {
        elem.file = `${TEMP}/${OUTNAME}.js`;
        return elem;
    });

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
            input: `${BUILT}/${TEST}/${UNIT}/*.js`,
            plugins: [
                multiEntry(),
                sourcemapDetect(),
                sourcemapRoot({ relativePath: relativePath(`${TEST}/${UNIT}`), sourceRoot: `${DOMAIN}:///specs/` }),
                replace && replacer(replace),
                alias({
                    './_testee': `${PACKAGE}`,
                }),
            ],
            external: [
                ...[
                    `${PACKAGE}`,
                ],
                ...external,
            ],
            output: [
                {
                    file: `${TEMP}/${OUTNAME}-specs.js`,
                    format: 'umd',
                    name: 'Test',
                    globals: Object.assign(
                        {},
                        { [PACKAGE]: `${GLOBAL}` },
                        globals,
                    ),
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
    const external = (options && options.external) || {};
    return {
        require_config: {
            paths: Object.assign({
                [PACKAGE]: `${TEMP}/${OUTNAME}`,
                'specs': `${TEMP}/${OUTNAME}-specs`,
            }, external),
        },
        src_files: [
            `${TEMP}/${OUTNAME}.js`,
            `${TEMP}/${OUTNAME}-specs.js`,
        ],
    };
}

module.exports = {
    default: getDefault,
    testem: getTestem,
};
