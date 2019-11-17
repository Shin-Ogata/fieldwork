'use strict';

const { resolve } = require('path');
const config = require('../config');
const {
    outName: OUTNAME,
    base: BASE,
    dist: DIST,
    type: TYPE,
} = config.build;
const { merge } = require('./misc');

function getDefault(cwd, inlinedLibraries, validate) {
    // https://github.com/timocov/dts-bundle-generator/blob/master/src/config-file/README.md
    return {
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
                noCheck: !validate,

                libraries: {
                    /**
                     * Array of package names from @types to import typings from via the triple-slash reference directive.
                     * By default all packages are allowed and will be used according to their usages.
                     * Optional. Default value is `undefined`.
                     */
//                  allowedTypesLibraries: ['jquery', 'react'],

                    /**
                     * Array of package names from node_modules to import typings from.
                     * Used types will be imported using `import { First, Second } from 'library-name';`.
                     * By default all libraries will be imported (except inlined libraries and libraries from @types).
                     * Optional. Default value is `undefined`.
                     */
//                  importedLibraries: ['rxjs', 'typescript'],

                    /**
                     * Array of package names from node_modules to inline typings from.
                     * Used types will be inlined into the output file.
                     * Optional. Default value is `[]`.
                     */
                    inlinedLibraries,
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
//                  umdModuleName: 'MyModuleName',
                },
            },
        ],
    };
}

function getConfig(cwd, targets, configFile, validate) {
    const dtsConfig = { bundle: getDefault(cwd, targets.map(t => t.module), validate), indent: '    ' };
    if (configFile) {
        const bundleConfig = require(resolve(cwd, configFile));
        merge(dtsConfig, bundleConfig);
        const { src, out, validate, excludeLibraries } = bundleConfig;
        const main = dtsConfig.bundle.entries[0];
        src && (main.filePath = resolve(cwd, src));
        out && (main.outFile = resolve(cwd, out));
        validate && (main.noCheck = false);
        excludeLibraries && (main.libraries.inlinedLibraries = main.libraries.inlinedLibraries.filter(l => !excludeLibraries.includes(l)));
    }
    return dtsConfig;
}

module.exports = getConfig;
