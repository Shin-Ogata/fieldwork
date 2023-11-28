'use strict';

const { resolve }      = require('node:path');
const { readFileSync } = require('node:fs');
const resolveDepends   = require('@cdp/tasks/lib/resolve-dependency');
const { dropAlias } = require('@cdp/tasks/lib/misc');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

// '@cdp/lib-core' modules
const coreModules = Object.keys(require('../lib-core/package.json').devDependencies);
// '@cdp/lib-worker' modules
const workerModules = Object.keys(require('../lib-worker/package.json').devDependencies);

function patch(index, code, includes) {
    if (0 !== index) {
        return code;
    }

    const manualEditModules = [
        '@cdp/extension-i18n',
        '@cdp/extension-template',
        '@cdp/extension-template-bridge',
        '@cdp/extension-path2regexp',
        '@cdp/dom',
        '@cdp/view',
    ];

    {// includes info
        // dependencies info
        const packages = resolveDepends({
            layer: ['lib'],
            cwd: resolve(__dirname, '../../../'),
            dev: false,
        });

        const modules = includes.slice();
        includes.length = 0;
        includes.push(...manualEditModules);
        includes.push(...packages.filter(pkg => modules.includes(pkg.name)).map(pkg => pkg.name));
    }

    const read = (dts) => {
        // trim banner
        return readFileSync(dts).toString().replace(/\/\*\![\s\S]*?\*\/\n/, '');
    };

    {// prepend
        let prepend = '\n';
        prepend += read(resolve('../../extension/i18n/dist/extension-i18n.d.ts'));
        prepend += read(resolve('../../extension/template/dist/extension-template.d.ts'));
        prepend += read(resolve('../../extension/template-bridge/dist/extension-template-bridge.d.ts'));
        prepend += read(resolve('../../extension/path2regexp/dist/extension-path2regexp.d.ts'));

        const enumerate = (stuff) => {
            return stuff.split(',').map(s => s.trim()).filter(s => !!s).sort().join(', ');
        };

        const coreStuff = `
            Nullish,
            UnknownObject,
            UnknownFunction,
            Accessible,
            PlainObject,
            AnyObject,
            Constructor,
            Class,
            TypedData,
            Types,
            Keys,
            KeyToType,
            NonFunctionPropertyNames,
            Arguments,
            Subscribable,
            Subscription,
            Silenceable,
            EventAll,
            EventBroker,
            EventReceiver,
            EventSource,
            Cancelable,
            CancelToken,
            ObservableObject,
            ObservableArray,
            ArrayChangeRecord,
            Result,
            JST,
            TemplateCompileOptions,
            IStorage,
            IStorageOptions,
            IStorageDataOptions,
            IStorageDataReturnType,
            IStorageEventCallback,
            StorageDataTypeList,
            StorageInputDataTypeList,
            $cdp,
        `;

        const workerStuff = `
            AjaxOptions,
            AjaxRequestOptions,
            AjaxGetRequestShortcutOptions,
            Serializable,
        `;

        prepend += `import { ${enumerate(coreStuff)} } from '@cdp/lib-core';\n`;
        prepend += `import { ${enumerate(workerStuff)} } from '@cdp/lib-worker';\n`;

        prepend += read(resolve('../../lib/web/dom/dist/dom.d.ts'));
        prepend += read(resolve('../../lib/web/view/dist/view.d.ts'));

        code = prepend + code;
    }

    {// trim
        const regexImport = (moduleName) => {
            return new RegExp(`^(import {)([^\n]*?)(} from '${moduleName}';\n)`, 'gm');
        };

        // workaround
        const patchModules = [
            '@cdp/i18n',    // import { i18n } from '@cdp/i18n';
        ];

        const dropModules = manualEditModules.slice();
        dropModules.push(...coreModules, ...workerModules, ...patchModules);

        for (const drop of dropModules) {
            code = code.replace(regexImport(drop), '');
        }

        code = code
            // drop 'export * from '@cdp/dom';'
            .replace(`export * from '@cdp/dom';\n`, '')
            // drop 'export * from '@cdp/view';'
            .replace(`export * from '@cdp/view';\n`, '')
            // dynamic import: import('@cdp/core-utils') → import('@cdp/lib-core')
            .replace(/import\('@cdp\/core-utils'\)/g, `import('@cdp/lib-core')`)
            // 'declare const directives' → 'export declare const directives'
            .replace(/^declare const directives/gm, 'export declare const directives')
        ;

        // directives$1 → directives
        code = dropAlias(code, 'directives');
    }

    {// module-extends
        const i18n = read(resolve('../../lib/web/i18n/types/plugin/module-extends.d.ts'));
        // namespace i18n { ～ } を検出. 対象の `}` の分だけ `([^}]+})` を追加
        const pluginI18N = i18n.match(/( {4}namespace i18n {)([^}]+})([^}]+})([^}]+})([^}]+})([^}]+})([^}]+})([^}]+})/)[0].replace('namespace', 'declare namespace');
        code += pluginI18N.split('\n').map(s => s.replace('    ', '')).join('\n');
        const pluginDOM = i18n.match(/( {4}interface DOMPlugin {)[\s\S]*?(}\n)/)[0].replace('interface', 'export interface');
        code += pluginDOM.split('\n').map(s => s.replace('    ', '')).join('\n');
    }

    {// result-code-defs.d.ts
        code += read(resolve('../../lib/web/i18n/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/data-sync/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/model/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/collection/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/router/types/result-code-defs.d.ts'));
        code += read(resolve('../../lib/web/app/types/result-code-defs.d.ts'));
    }

    return code;
}

function replaceModuleValues(modules, target) {
    const values = {};
    for (const key of modules) {
        values[key] = target;
    }
    return values;
}

module.exports = {
    __esModule: true,
    default: bundle_src({
        external: {
            '@cdp/lib-core': 'CDP',
            '@cdp/lib-worker': 'CDP',
        },
        replace: {
            preventAssignment: true,
            delimiters: ['', ''],
            values: Object.assign(
                replaceModuleValues(coreModules, '@cdp/lib-core'),
                replaceModuleValues(workerModules, '@cdp/lib-worker'),
            ),
        },
    }),
    dts: bundle_dts({
        excludeLibraries: ['@cdp/dom', '@cdp/view'], // special treat
        postProcess: patch,
        verbose: false,
    }),
    minify: {
        js: minify_js(),
    },
};
