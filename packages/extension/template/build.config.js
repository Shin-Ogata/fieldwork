'use strict';

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    // 一般的すぎる directive 名は宣言個所でリネーム
    const renames = [
        'cache',
        'choose',
        'guard',
        'join',
        'live',
        'map',
        'range',
        'ref',
        'repeat',
        'until',
        'when'
    ];

    const regex_declare = new RegExp(`(declare) (const|function) (${renames.join('|')})([^\n]+)\n`, 'g');
    const regex_typeof  = new RegExp(`(typeof) (${renames.join('|')});`, 'g');

    code = code
        // trim `import("xxx").`
        .replace(/import\('[\S]+'\)\./g, '')
        // replace `TrustedHTML` -> `HTMLElement`
        .replace(/TrustedHTML/g, 'HTMLElement')
        // rename list
        .replace(regex_declare, '$1 $2 _directive_$3$4\n')
        .replace(regex_typeof, '$1 _directive_$2;')
    ;

    return code;
}

// 内部の相対パス指定も置換対象に含めることで重複コードを避ける
function resolveEntries(list) {
    const { resolve } = require('node:path');
    const SOURCE_ROOT = 'node_modules/lit-html/development';

    const relativeModuleName = (module) => {
        const paths = module.split('/');
        if (1 === paths.length) {
            return `${paths[0]}.js`;
        } else {
            paths.shift();
            return `${paths.join('/')}.js`;
        }
    };

    const moduleFileName = (moduleName) => {
        const paths = moduleName.split('/');
        return paths[paths.length - 1];
    };

    const entries = [];
    for (const module of list) {
        const moduleName  = relativeModuleName(module);
        const fileName    = moduleFileName(moduleName);
        const replacement = resolve(SOURCE_ROOT, moduleName);
        entries.push({
            find: module,
            replacement,
        },{
            find: `./${fileName}`,
            replacement,
        },{
            find: `../${fileName}`,
            replacement,
        });
    }
    return entries;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        // ES モジュールの top-level の `this` は常に `undefined`.
        // https://github.com/rollup/rollup/issues/1518
        onwarn(warning, warn) {
            if ('THIS_IS_UNDEFINED' === warning.code) {
                return;
            }
            warn(warning);
        },
        replace: {
            // https://github.com/lit/lit/blob/main/rollup-common.js#L373
            values: {
                'const DEV_MODE = true': 'const DEV_MODE = false',
                'const ENABLE_EXTRA_SECURITY_HOOKS = true': 'const ENABLE_EXTRA_SECURITY_HOOKS = false',
                'const ENABLE_SHADYDOM_NOPATCH = true': 'const ENABLE_SHADYDOM_NOPATCH = false',
                'export const INTERNAL = true': 'const INTERNAL = false',
            },
            preventAssignment: true,
        },
        alias: {
            entries: resolveEntries([
                'lit-html/directives/async-append',
                'lit-html/directives/async-replace',
                'lit-html/directives/cache',
                'lit-html/directives/choose',
                'lit-html/directives/class-map',
                'lit-html/directives/guard',
                'lit-html/directives/if-defined',
                'lit-html/directives/join',
                'lit-html/directives/keyed',
                'lit-html/directives/live',
                'lit-html/directives/map',
                'lit-html/directives/range',
                'lit-html/directives/ref',
                'lit-html/directives/repeat',
                'lit-html/directives/style-map',
                'lit-html/directives/template-content',
                'lit-html/directives/unsafe-html',
                'lit-html/directives/unsafe-svg',
                'lit-html/directives/until',
                'lit-html/directives/when',
                'lit-html/private-ssr-support',
                'lit-html/directive',
                'lit-html/async-directive',
                'lit-html/directive-helpers',
                'lit-html',
            ]),
        },
    }),
    dts: bundle_dts({
        inlinedLibraries: ['lit-html'],
        excludeLibraries: [/^@cdp/],
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
