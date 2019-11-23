import { JST, TemplateTags, ITemplate, TemplateWriter, TemplateEscaper } from './interfaces';
/**
 * @en [[Template]] global settng options
 * @ja [[Template]] グローバル設定オプション
 */
export interface TemplateGlobalSettings {
    writer?: TemplateWriter;
    tags?: TemplateTags;
    escape?: TemplateEscaper;
}
/**
 * @en [[Template]] compile options
 * @ja [[Template]] コンパイルオプション
 */
export interface TemplateCompileOptions {
    tags?: TemplateTags;
}
/**
 * @en Template utility class.
 * @ja Template ユーティリティクラス
 */
export declare class Template implements ITemplate {
    /**
     * @en Get [[JST]] from template source.
     * @ja テンプレート文字列から [[JST]] を取得
     *
     * @package template
     *  - `en` template source string
     *  - `ja` テンプレート文字列
     * @package options
     *  - `en` compile options
     *  - `ja` コンパイルオプション
     */
    static compile(template: string, options?: TemplateCompileOptions): JST;
    /**
     * @en Clears all cached templates in the default [[TemplateWriter]].
     * @ja 既定の [[TemplateWriter]] のすべてのキャッシュを削除
     */
    static clearCache(): void;
    /**
     * @en Change [[Template]] global settings.
     * @ja [[Template]] グローバル設定の更新
     *
     * @param settings
     *  - `en` new settings
     *  - `ja` 新しい設定値
     * @returns
     *  - `en` old settings
     *  - `ja` 古い設定値
     */
    static setGlobalSettings(setiings: TemplateGlobalSettings): TemplateGlobalSettings;
}
