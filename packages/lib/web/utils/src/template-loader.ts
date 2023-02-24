import { AjaxGetRequestShortcutOptions, request } from '@cdp/ajax';
import { document } from './ssr';

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
function queryTemplateSource(selector: string, provider: TemplateProvider | null, noCache: boolean): string | HTMLTemplateElement | undefined {
    const { fragment, html } = provider || {};
    const key = `${selector}${html ? `::${html}` : ''}`;
    if (_mapSource[key]) {
        return _mapSource[key];
    }
    const context = fragment || document;
    const target = context.querySelector(selector);
    const source = target instanceof HTMLTemplateElement ? target : target?.innerHTML;
    !noCache && source && (_mapSource[key] = source);
    return source;
}

/** @internal */
async function queryTemplateProvider(url: string | undefined, noCache: boolean): Promise<TemplateProvider | null> {
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
        !noCache && fragment && (_mapProvider[url] = provider);
        return provider;
    }
}

//__________________________________________________________________________________________________//

/**
 * @en Load template options.
 * @ja ロードテンプレートオプション
 */
export interface LoadTemplateOptions extends AjaxGetRequestShortcutOptions {
    /**
     * @en The template acquisition URL. if not specified the template will be searched from `document`.
     * @ja テンプレート取得先 URL. 指定がない場合は `document` から検索
     */
    url?: string;
    /**
     * @en If you don't want to cache the template in memory, given `true`.
     * @ja テンプレートをメモリにキャッシュしない場合は `true` を指定
     */
    noCache?: boolean;
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
 * @en Load template source.
 * @ja テンプレートソースのロード
 *
 * @param selector
 *  - `en` The selector string of DOM.
 *  - `ja` DOM セレクタ文字列
 * @param options
 *  - `en` load options
 *  - `ja` ロードオプション
 */
export async function loadTemplateSource(selector: string, options?: LoadTemplateOptions): Promise<string | HTMLTemplateElement | undefined> {
    const { url, noCache } = Object.assign({ noCache: false }, options);
    const provider = await queryTemplateProvider(url, noCache);
    return queryTemplateSource(selector, provider, noCache);
}

//__________________________________________________________________________________________________//

/**
 * @en Forced conversion to HTML string.
 * @ja HTML 文字列に強制変換
 *
 * @param src
 *  - `en` `HTMLTemplateElement` instance or HTML string
 *  - `ja` `HTMLTemplateElement` インスタンスまたは HTML 文字列
 */
export function toTemplateString(src: string | HTMLTemplateElement | undefined): string | undefined {
    return src instanceof HTMLTemplateElement ? src.innerHTML : src;
}

/**
 * @en Forced conversion to `HTMLTemplateElement`. (If it is a Node, create a clone with `cloneNode(true)`)
 * @ja `HTMLTemplateElement` に強制変換 (Nodeである場合には `cloneNode(true)` による複製を作成)
 *
 * @param src
 *  - `en` `HTMLTemplateElement` instance or HTML string
 *  - `ja` `HTMLTemplateElement` インスタンスまたは HTML 文字列
 */
export function toTemplateElement(src: string | HTMLTemplateElement | undefined): HTMLTemplateElement | undefined {
    const from = (str: string): HTMLTemplateElement => {
        const template = document.createElement('template');
        template.innerHTML = str;
        return template;
    };
    return 'string' === typeof src ? from(src) : src?.cloneNode(true) as HTMLTemplateElement;
}
