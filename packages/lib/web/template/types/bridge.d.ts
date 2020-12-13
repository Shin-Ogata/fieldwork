import { TemplateResult, SVGTemplateResult } from '@cdp/extension-template';
import { TemplateTransformer } from '@cdp/extension-template-transformer';
import { PlainObject } from '@cdp/core-utils';
/**
 * @en Compiled JavaScript template interface
 * @ja コンパイル済みテンプレート格納インターフェイス
 */
export interface CompiledTemplate {
    /**
     * @en Source template string
     * @ja テンプレート文字列
     */
    source: string;
    /**
     * @en Get [[TemplateResult]] that applied given parameter(s).
     * @ja パラメータを適用し [[TemplateResult]] へ変換
     *
     * @param view
     *  - `en` template parameters for source.
     *  - `ja` テンプレートパラメータ
     */
    (view?: PlainObject): TemplateResult | SVGTemplateResult;
}
/**
 * @en [[TemplateBridge]] compile options
 * @ja [[TemplateBridge]] コンパイルオプション
 */
export interface TemplateBridgeCompileOptions {
    transformer?: TemplateTransformer;
}
/**
 * @en Template bridge for other template engine source.
 * @ja 他のテンプレートエンジンの入力を変換するテンプレートブリッジクラス
 */
export declare class TemplateBridge {
    /**
     * @en Get [[CompiledTemplate]] from template source.
     * @ja テンプレート文字列から [[CompiledTemplate]] を取得
     *
     * @param template
     *  - `en` template source string
     *  - `ja` テンプレート文字列
     * @param options
     *  - `en` compile options
     *  - `ja` コンパイルオプション
     */
    static compile(template: string, options?: TemplateBridgeCompileOptions): CompiledTemplate;
    /**
     * @en Update default transformer object.
     * @ja 既定の変換オブジェクトの更新
     *
     * @param newTransformer
     *  - `en` new transformer object.
     *  - `ja` 新しい変換オブジェクトを指定.
     * @returns
     *  - `en` old transformer object.
     *  - `ja` 以前の変換オブジェクトを返却
     */
    static setTransformer(newTransformer: TemplateTransformer): TemplateTransformer;
}
