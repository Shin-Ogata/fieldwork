import { unescapeHTML } from '@cdp/core-utils';
import {
    JST,
    TemplateCompileOptions,
    TemplateEngine,
} from '@cdp/core-template';
import { request } from '@cdp/ajax';
import { document } from './ssr';
import {
    CompiledTemplate,
    TemplateBridgeCompileOptions,
    TemplateBridge,
} from './bridge';

/** @internal */
interface TemplateProvider {
    fragment: DocumentFragment;
    html: string;
}

/** @internal */
interface TemplateProviderMap {
    [url: string]: TemplateProvider;
}

/** @internal */
interface TemplateSourceMap {
    [key: string]: string | HTMLTemplateElement;
}

/** @internal */ let _mapProvider: TemplateProviderMap = {};
/** @internal */ let _mapSource: TemplateSourceMap = {};

/** @internal */
function queryTemplateSource(selector: string, provider: TemplateProvider | null, cache: boolean): string | HTMLTemplateElement | undefined {
    const { fragment, html } = provider || {};
    const key = `${selector}${html ? `::${html}` : ''}`;
    if (_mapSource[key]) {
        return _mapSource[key];
    }
    const context = fragment || document;
    const target = context.querySelector(selector);
    const source = target instanceof HTMLTemplateElement ? target : target?.innerHTML;
    cache && source && (_mapSource[key] = source);
    return source;
}

/** @internal */
async function queryTemplateProvider(url: string | undefined, cache: boolean): Promise<TemplateProvider | null> {
    if (!url) {
        return null;
    }
    if (_mapProvider[url]) {
        return _mapProvider[url];
    } else {
        const html = await request.text(url);
        const template = document.createElement('template');
        template.innerHTML = html;
        const fragment = template.content;
        const provider = { fragment, html: html.replace(/\s/gm, '') };
        cache && fragment && (_mapProvider[url] = provider);
        return provider;
    }
}

//__________________________________________________________________________________________________//

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
export interface TemplateQueryOptions<T extends TemplateQueryTypes> extends TemplateCompileOptions, TemplateBridgeCompileOptions {
    type?: T;
    url?: string;
    cache?: boolean;
}

/**
 * @en Clear template's resources.
 * @ja テンプレートリソースキャッシュの削除
 */
export function clearTemplateCache(): void {
    _mapProvider = {};
    _mapSource   = {};
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
    const { type, url, cache } = Object.assign({ type: 'engine', cache: true }, options);
    const provider = await queryTemplateProvider(url, cache);
    const src = queryTemplateSource(selector, provider, cache);
    if (!src) {
        throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
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
