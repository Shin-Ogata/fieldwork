import {
    TemplateResult,
    SVGTemplateResult,
    html,
    directives,
} from '@cdp/extension-template';
import { TemplateTransformer, createTransformFactory } from '@cdp/extension-template-transformer';
import { PlainObject } from '@cdp/core-utils';

/** @internal default transformer for mustache. */
const mustache = createTransformFactory(html, directives.unsafeHTML);

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
export class TemplateBridge {
    /** @internal */
    private static _transformer = mustache;

///////////////////////////////////////////////////////////////////////
// public static methods:

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
    public static compile(template: string, options?: TemplateBridgeCompileOptions): CompiledTemplate {
        const { transformer } = Object.assign({ transformer: TemplateBridge._transformer }, options);
        const engine = transformer(template);
        const jst = (view?: PlainObject): TemplateResult | SVGTemplateResult => {
            return engine(view);
        };
        jst.source = template;
        return jst;
    }

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
    public static setTransformer(newTransformer: TemplateTransformer): TemplateTransformer {
        const oldTransformer = TemplateBridge._transformer;
        TemplateBridge._transformer = newTransformer;
        return oldTransformer;
    }
}
