import { JST, TemplateDelimiters, ITemplateEngine, TemplateWriter, TemplateEscaper } from './interfaces';
/**
 * @en {@link TemplateEngine} global settng options
 * @ja {@link TemplateEngine} グローバル設定オプション
 */
export interface TemplateGlobalSettings {
    writer?: TemplateWriter;
    tags?: TemplateDelimiters;
    escape?: TemplateEscaper;
}
/**
 * @en {@link TemplateEngine} compile options
 * @ja {@link TemplateEngine} コンパイルオプション
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
     * @en Get {@link JST} from template source.
     * @ja テンプレート文字列から {@link JST} を取得
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
     * @en Clears all cached templates in the default {@link TemplateWriter}.
     * @ja 既定の {@link TemplateWriter} のすべてのキャッシュを削除
     */
    static clearCache(): void;
    /**
     * @en Change {@link TemplateEngine} global settings.
     * @ja {@link TemplateEngine} グローバル設定の更新
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
