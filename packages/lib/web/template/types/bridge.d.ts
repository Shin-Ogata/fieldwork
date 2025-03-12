import { type TemplateResult, type SVGTemplateResult } from '@cdp/extension-template';
import { type TemplateTransformer } from '@cdp/extension-template-bridge';
import type { PlainObject } from '@cdp/core-utils';
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
     * @en Get {@link TemplateResult} that applied given parameter(s).
     * @ja パラメータを適用し {@link TemplateResult} へ変換
     *
     * @param view
     *  - `en` template parameters for source.
     *  - `ja` テンプレートパラメータ
     */
    (view?: PlainObject): TemplateResult | SVGTemplateResult;
}
/**
 * @en {@link TemplateBridge} compile options
 * @ja {@link TemplateBridge} コンパイルオプション
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
     * @en Get {@link CompiledTemplate} from template source.
     * @ja テンプレート文字列から {@link CompiledTemplate} を取得
     *
     * @param template
     *  - `en` template source string / template element
     *  - `ja` テンプレート文字列 / テンプレートエレメント
     * @param options
     *  - `en` compile options
     *  - `ja` コンパイルオプション
     */
    static compile(template: HTMLTemplateElement | string, options?: TemplateBridgeCompileOptions): CompiledTemplate;
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
    /**
     * @en Get built-in transformer name list.
     * @ja 組み込みの変換オブジェクトの名称一覧を取得
     *
     * @returns
     *  - `en` name list.
     *  - `ja` 名称一覧を返却
     */
    static get builtins(): string[];
    /**
     * @en Get built-in transformer object.
     * @ja 組み込みの変換オブジェクトを取得
     *
     * @param name
     *  - `en` transformer object name.
     *  - `ja` 変換オブジェクトの名前を指定.
     * @returns
     *  - `en` transformer object.
     *  - `ja` 変換オブジェクトを返却
     */
    static getBuitinTransformer(name: string): TemplateTransformer | undefined;
}
