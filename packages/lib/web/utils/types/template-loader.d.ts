import { AjaxGetRequestShortcutOptions } from '@cdp/ajax';
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
export declare function clearTemplateCache(): void;
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
export declare function loadTemplateSource(selector: string, options?: LoadTemplateOptions): Promise<string | HTMLTemplateElement | undefined>;
