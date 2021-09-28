'use strict';

const { resolve }      = require('path');
const { readFileSync } = require('fs-extra');

const bundle_src = require('../../../config/bundle/rollup-core');
const bundle_dts = require('../../../config/bundle/dts-bundle');
const minify_js  = require('../../../config/minify/terser');

function patch(index, code, includes) {
    if (0 !== index) {
        return code;
    }

    includes.push('@cdp/extension-i18n');
    includes.push('@cdp/extension-template');
    includes.push('@cdp/extension-template-bridge');
    includes.push('@cdp/dom');
    includes.sort();

    const read = (dts) => {
        // trim banner
        return readFileSync(dts).toString().replace(/\/\*\![\s\S]*?\*\/\n/, '');
    };

    const regexImport = (moduleName) => {
        return new RegExp(`^(import {)([^\\n]*?)(} from '${moduleName}';\\n)`, 'gm');
    };

    {// prepend
        let prepend = '';
        prepend += read(resolve('../../extension/i18n/dist/extension-i18n.d.ts'));
        prepend += read(resolve('../../extension/template/dist/extension-template.d.ts'));
        prepend += read(resolve('../../extension/template-bridge/dist/extension-template-bridge.d.ts'));

        const enumerate = (stuff) => {
            return stuff.split(',').map(s => s.trim()).filter(s => !!s).sort().join(', ');
        };

        const coreStuff = `
            Nil,
            UnknownObject,
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
            IStorage,
            IStorageOptions,
            IStorageDataOptions,
            IStorageDataReturnType,
            IStorageEventCallback,
            StorageDataTypeList,
            StorageInputDataTypeList,
            $cdp,
        `;

        const coreReExportStuff = `
            TemplateToken,
            TemplateDelimiters,
            TemplateScanner,
            TemplateContext,
            TemplateWriter,
            JST,
            TemplateEscaper,
            ITemplateEngine,
            TemplateAccessor,
            TemplateGlobalSettings,
            TemplateCompileOptions,
            TemplateEngine,
        `;

        const workerStuff = `
            AjaxOptions,
            AjaxRequestOptions,
            Serializable,
        `;

        prepend += `import { ${enumerate(coreStuff + coreReExportStuff)} } from '@cdp/lib-core';\n`;
        prepend += `export { ${enumerate(coreReExportStuff)} };\n`;
        prepend += `import { ${enumerate(workerStuff)} } from '@cdp/lib-worker';\n`;

        prepend += read(resolve('../../lib/web/dom/dist/dom.d.ts'));

        code = prepend + code;
    }

    {// trim
        code = code
            .replace(regexImport('@cdp/core-utils'), '')
            .replace(regexImport('@cdp/extension-template'), '')
            // drop 'export * from '@cdp/dom';'
            .replace(`export * from '@cdp/dom';\n`, '')
            // dynamic import: import('@cdp/core-utils') → import('@cdp/lib-core')
            .replace(/import\('@cdp\/core-utils'\)/g, `import('@cdp/lib-core')`)
        ;

    }

    {// module-extends
        const i18n = read(resolve('../../lib/web/i18n/types/plugin/module-extends.d.ts'));
        const pluginI18N = i18n.match(/( {4}namespace i18n {)([^}]+})([^}]+})([\s]+}\n)/)[0].replace('namespace', 'declare namespace');
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
    }

    return code;
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
            values: {
                '@cdp/core-utils': '@cdp/lib-core',
                '@cdp/events': '@cdp/lib-core',
                '@cdp/promise': '@cdp/lib-core',
                '@cdp/observable': '@cdp/lib-core',
                '@cdp/result': '@cdp/lib-core',
                '@cdp/core-storage': '@cdp/lib-core',
                '@cdp/core-template': '@cdp/lib-core',
                '@cdp/ajax': '@cdp/lib-worker',
                '@cdp/binary': '@cdp/lib-worker',
                '@cdp/inline-worker': '@cdp/lib-worker',
            },
        },
    }),
    dts: bundle_dts({
        excludeLibraries: ['@cdp/dom'],
        postProcess: patch,
    }),
    minify: {
        js: minify_js(),
    },
};
