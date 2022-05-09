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
