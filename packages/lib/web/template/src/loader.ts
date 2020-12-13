import { JST, TemplateEngine } from '@cdp/core-template';
import { request } from '@cdp/ajax';
import { document } from './ssr';
import { CompiledTemplate, TemplateBridge } from './bridge';

/** @internal */
interface TemplateElementMap {
    [url: string]: Element;
}

/** @internal */
interface TemplateSourceMap {
    [key: string]: string;
}

/** @internal */ let _mapElement: TemplateElementMap = {};
/** @internal */ let _mapSource: TemplateSourceMap = {};

/** @internal */
function queryTemplateSource(selector: string, el: Element | null, cache: boolean): string | undefined {
    const key = `${selector}${el ? `::${el.innerHTML.replace(/\s/gm, '')}` : ''}`;
    if (_mapSource[key]) {
        return _mapSource[key];
    }
    const context = el || document;
    const target = context.querySelector(selector);
    const source = target?.innerHTML;
    cache && source && (_mapSource[key] = source);
    return source;
}

/** @internal */
async function queryTemplateElement(url: string | undefined, cache: boolean): Promise<Element | null> {
    if (!url) {
        return null;
    }
    if (_mapElement[url]) {
        return _mapElement[url];
    } else {
        const html = await request.text(url);
        const template = document.createElement('template');
        template.innerHTML = html;
        const el = template.content.firstElementChild;
        cache && el && (_mapElement[url] = el);
        return el;
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
export interface TemplateQueryOptions<T extends TemplateQueryTypes> {
    type?: T;
    url?: string;
    cache?: boolean;
}

/**
 * @en Clear template's resources.
 * @ja テンプレートリソースキャッシュの削除
 */
export function clearTemplateCache(): void {
    _mapElement = {};
    _mapSource  = {};
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
    const el  = await queryTemplateElement(url, cache);
    const src = queryTemplateSource(selector, el, cache);
    if (!src) {
        throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
    }
    switch (type) {
        case 'engine':
            return TemplateEngine.compile(src) as TemplateQueryTypeList[T];
        case 'bridge':
            return TemplateBridge.compile(src) as TemplateQueryTypeList[T];
        default:
            throw new TypeError(`[type: ${type}] is unknown.`);
    }
}
