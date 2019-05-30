'use strict';

const multiEntry = require('rollup-plugin-multi-entry');
const alias = require('rollup-plugin-alias');
const sourcemaps = require('rollup-plugin-sourcemaps');
const sourcemapRoot = require('@cdp/tasks/rollup-plugin-sourcemap-root');
const { config } = require('@cdp/tasks');

const {
    packageName: PACKAGE,
    outName: OUTNAME,
    global: GLOBAL,
    namespace: NAMESPACE,
    built: BUILT,
    test: TEST,
    unit: UNIT,
    temp: TEMP,
    relativePath,
} = config.build;

function getDefault(testeeConfig) {
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
                sourcemaps(),
                sourcemapRoot({ relativePath: relativePath(`${TEST}/${UNIT}`), sourceRoot: `${NAMESPACE}:///specs/` }),
                alias({
                    './_testee': `${PACKAGE}`,
                }),
            ],
            external: [
                `${PACKAGE}`,
            ],
            output: [
                {
                    file: `${TEMP}/${OUTNAME}-specs.js`,
                    format: 'umd',
                    name: 'Test',
                    globals: {
                        [PACKAGE]: `${GLOBAL}`,
                    },
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
