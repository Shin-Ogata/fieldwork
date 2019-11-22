import { JST, TemplateTags, ITemplate, TemplateWriter, TemplateEscaper } from './interfaces';
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
     */
    static compile(template: string, options?: TemplateCompileOptions): JST;
    /**
     * @en Clears all cached templates in the default [[TemplateWriter]].
     * @ja 既定の [[TemplateWriter]] のすべてのキャッシュを削除
     */
    static clearCache(): void;
    /**
     * @en Change default [[TemplateWriter]].
     * @ja 既定の [[TemplateWriter]] の変更
     */
    static setDefaultWriter(newWriter: TemplateWriter): TemplateWriter;
    /**
     * @en Change default [[TemplateTags]].
     * @ja 既定の [[TemplateTags]] の変更
     */
    static setDefaultTags(newTags: TemplateTags): TemplateTags;
    /**
     * @en Change default `escape` method.
     * @ja 既定の `escape` の変更
     */
    static setDefaultEscape(newEscaper: TemplateEscaper): TemplateEscaper;
}
