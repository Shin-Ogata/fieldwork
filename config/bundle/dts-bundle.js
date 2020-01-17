'use strict';

const { resolve }       = require('path');
const { config, merge } = require('@cdp/tasks');
const {
    outName: OUTNAME,
    base: BASE,
    dist: DIST,
    type: TYPE,
} = config.build;
const { devDependencies } = config.pkg;
const cwd = process.cwd();

// default dts-bundle-generator options
// https://github.com/timocov/dts-bundle-generator/blob/master/src/config-file/README.md
const bundle = {
    compilationOptions: {
        /**
         * EXPERIMENTAL!
         * Allows disable resolving of symlinks to the original path.
         * By default following is enabled.
         * @see https://github.com/timocov/dts-bundle-generator/issues/39
         * Optional. Default value is `true`.
         */
        followSymlinks: false,
        preferredConfigPath: resolve(cwd, 'tsconfig.json'),
    },
    // non-empty array of entries
    entries: [
        {
            /**
             * Path to input file (absolute or relative to config file).
             * Required.
             */
            filePath: resolve(cwd, `${TYPE}/${BASE}.d.ts`),

            /**
             * Path of generated d.ts.
             * If not specified - the path will be input file with replaced extension to `.d.ts`.
             */
            outFile: resolve(cwd, `${DIST}/${OUTNAME}.d.ts`),

            /**
             * Fail if generated dts contains class declaration.
             * Optional. Default value is `false`.
             */
            failOnClass: false,

            /**
             * Skip validation of generated d.ts file.
             * Optional. Default value is `false`.
             */
            noCheck: true,

            libraries: {
                /**
                 * Array of package names from @types to import typings from via the triple-slash reference directive.
                 * By default all packages are allowed and will be used according to their usages.
                 * Optional. Default value is `undefined`.
                 */
                allowedTypesLibraries: ['jquery', 'react'],

                /**
                 * Array of package names from node_modules to import typings from.
                 * Used types will be imported using `import { First, Second } from 'library-name';`.
                 * By default all libraries will be imported (except inlined libraries and libraries from @types).
                 * Optional. Default value is `undefined`.
                 */
//              importedLibraries: ['rxjs', 'typescript'],

                /**
                 * Array of package names from node_modules to inline typings from.
                 * Used types will be inlined into the output file.
                 * Optional. Default value is `[]`.
                 */
                inlinedLibraries: devDependencies ? Object.keys(devDependencies).filter(key => /^file:/.test(devDependencies[key])) : [],
            },

            output: {
                /**
                 * Enables inlining of `declare global` statements contained in files which should be inlined (all local files and packages from inlined libraries).
                 * Optional. Default value is `false`.
                 */
                inlineDeclareGlobals: false,

                /**
                 * Sort output nodes in ascendant order.
                 * Optional. Default value is `false`.
                 */
                sortNodes: false,

                /**
                 * Name of the UMD module.
                 * If specified then `export as namespace ModuleName;` will be emitted.
                 * Optional. Default value is `undefined`.
                 */
//              umdModuleName: 'MyModuleName',
            },
        },
    ],
};

const bundleOptions = {
    // dts-bundle-generator スキーマ
    // https://github.com/timocov/dts-bundle-generator/blob/master/src/config-file/README.md
    //  bundle: {},

    // 処理前に呼ばれる関数: () => Promise<void>
    preProcess: undefined,

    // 各 d.ts に対して呼ばれる後処理関数: (index: number, code: string) => string
    postProcess: undefined,

    // カスタム入力: `.d.ts`
    src: undefined,

    // カスタム出力: `.d.ts`
    out: undefined,

    // entries.noCheck true or `npm run bundle:dts -- --validate`
    validate: false,

    // tab indent default: '    ' (4)
    //  indent: '    '

    // 明示的に含めるライブラリ: ['module']
    inlinedLibraries: [],

    // devDependencies 内の含めないライブラリ
    excludeLibraries: [],

    // other `banner` options
};

function getConfig(options = bundleOptions) {
    const settings = merge({ bundle, indent: '    ' }, options);
    const { src, out, validate, inlinedLibraries, excludeLibraries } = settings;
    const main = settings.bundle.entries[0];
    src && (main.filePath = resolve(cwd, src));
    out && (main.outFile = resolve(cwd, out));
    validate && (main.noCheck = false);
    inlinedLibraries && (main.libraries.inlinedLibraries.push(...inlinedLibraries));
    excludeLibraries && (main.libraries.inlinedLibraries = main.libraries.inlinedLibraries.filter(l => !excludeLibraries.includes(l)));
    return settings;
}

module.exports = getConfig;
