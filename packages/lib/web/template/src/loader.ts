import { unescapeHTML, isFunction } from '@cdp/core-utils';
import {
    type JST,
    type TemplateCompileOptions,
    TemplateEngine,
} from '@cdp/core-template';
import { type LoadTemplateOptions, loadTemplateSource } from '@cdp/web-utils';
export { clearTemplateCache } from '@cdp/web-utils';
import {
    type CompiledTemplate,
    type TemplateBridgeCompileOptions,
    TemplateBridge,
} from './bridge';

/**
 * @en Template query type list.
 * @ja テンプレート取得時に指定可能な型一覧
 */
export interface TemplateQueryTypeList {
    engine: JST;
    bridge: CompiledTemplate;
}

/**
 * @en Template query type definitions.
 * @ja テンプレート取得時に指定可能な型指定子
 */
export type TemplateQueryTypes = keyof TemplateQueryTypeList;

/**
 * @en Template query options.
 * @ja テンプレート取得オプション
 */
export interface TemplateQueryOptions<T extends TemplateQueryTypes> extends LoadTemplateOptions, TemplateCompileOptions, TemplateBridgeCompileOptions {
    /**
     * `engine` / 'bridge'
     */
    type?: T;
    /**
     * @en template load callback. `bridge` mode allows localization here.
     * @ja テンプレート読み込みコールバック. `bridge` モードではここでローカライズが可能
     */
    callback?: (src: string | HTMLTemplateElement) => string | HTMLTemplateElement | Promise<string | HTMLTemplateElement>;
}

/**
 * @en Get compiled JavaScript template.
 * @ja コンパイル済み JavaScript テンプレート取得
 *
 * @param selector
 *  - `en` The selector string of DOM.
 *  - `ja` DOM セレクタ文字列
 * @param options
 *  - `en` query options
 *  - `ja` クエリオプション
 */
export async function getTemplate<T extends TemplateQueryTypes = 'engine'>(
    selector: string, options?: TemplateQueryOptions<T>
): Promise<TemplateQueryTypeList[T]> {
    const { type, url, noCache, callback } = Object.assign({ type: 'engine', noCache: false }, options);
    let src = await loadTemplateSource(selector, { url, noCache });
    if (!src) {
        throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
    }

    if (isFunction(callback)) {
        src = await callback(src);
    }

    switch (type) {
        case 'engine':
            return TemplateEngine.compile(src instanceof HTMLTemplateElement ? unescapeHTML(src.innerHTML) : src, options) as TemplateQueryTypeList[T];
        case 'bridge':
            return TemplateBridge.compile(src, options) as TemplateQueryTypeList[T];
        default:
            throw new TypeError(`[type: ${type}] is unknown.`);
    }
}
