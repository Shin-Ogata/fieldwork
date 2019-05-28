'use strict';

const multiEntry = require('rollup-plugin-multi-entry');
const alias = require('rollup-plugin-alias');
const sourcemaps = require('rollup-plugin-sourcemaps');
const sourcemapRoot = require('@cdp/tasks/rollup-plugin-sourcemap-root');
const { config } = require('@cdp/tasks');
const testeeConfig = require('../rollup.config');

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

exports.default = [
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

exports.testem = {
    require_config: {
        paths: {
            [PACKAGE]: `${TEMP}/${OUTNAME}`,
            'specs': `${TEMP}/${OUTNAME}-specs`,
            '@cdp/core-utils': 'node_modules/@cdp/core-utils/dist/core-utils',
        }
    },
    src_files: [
        `${TEMP}/${OUTNAME}.js`,
        `${TEMP}/${OUTNAME}-specs.js`,
    ],
};
