import { JST, TemplateDelimiters, ITemplateEngine, TemplateWriter, TemplateEscaper } from './interfaces';
/**
 * @en [[TemplateEngine]] global settng options
 * @ja [[TemplateEngine]] グローバル設定オプション
 */
export interface TemplateGlobalSettings {
    writer?: TemplateWriter;
    tags?: TemplateDelimiters;
    escape?: TemplateEscaper;
}
/**
 * @en [[TemplateEngine]] compile options
 * @ja [[TemplateEngine]] コンパイルオプション
 */
export interface TemplateCompileOptions {
    tags?: TemplateDelimiters;
}
/**
 * @en TemplateEngine utility class.
 * @ja TemplateEngine ユーティリティクラス
 */
export declare class TemplateEngine implements ITemplateEngine {
    /**
     * @en Get [[JST]] from template source.
     * @ja テンプレート文字列から [[JST]] を取得
     *
     * @param template
     *  - `en` template source string
     *  - `ja` テンプレート文字列
     * @param options
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
     * @en Change [[TemplateEngine]] global settings.
     * @ja [[TemplateEngine]] グローバル設定の更新
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
