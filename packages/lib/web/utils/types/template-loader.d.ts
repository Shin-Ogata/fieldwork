/**
 * @en Load template options.
 * @ja ロードテンプレートオプション
 */
export interface LoadTemplateOptions {
    url?: string;
    cache?: boolean;
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
