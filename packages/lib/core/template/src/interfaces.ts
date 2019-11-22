/* eslint-disable @typescript-eslint/no-explicit-any */

import { PlainObject, escapeHTML } from '@cdp/core-utils';

/**
 * @en [[Template]] token structure.
 * @ja [[Template]] token 型
 */
export type TemplateToken = any;

/**
 * @en Delimiters definition for [[Template]]. ex) ['{{','}}']
 * @ja [[Template]] に使用する区切り文字 ex) ['{{','}}']
 */
export type TemplateTags = [string, string];

/**
 * @en Scanner interface.
 * @ja スキャナーインターフェイス
 */
export interface TemplateScanner {
    /**
     * Returns current scanning position.
     */
    readonly pos: number;

    /**
     * Returns string  source.
     */
    readonly source: string;

    /**
     * Returns `true` if the tail is empty (end of string).
     */
    readonly eos: boolean;

    /**
     * Tries to match the given regular expression at the current position.
     * Returns the matched text if it can match, the empty string otherwise.
     */
    scan(regexp: RegExp): string;

    /**
     * Skips all text until the given regular expression can be matched. Returns
     * the skipped string, which is the entire tail if no match can be made.
     */
    scanUntil(regexp: RegExp): string;
}

/**
 * @en Context interface.
 * @ja コンテキストインターフェイス
 */
export interface TemplateContext {
    /**
     * View parameter getter.
     */
    readonly view: PlainObject;

    /**
     * Creates a new context using the given view with this context
     * as the parent.
     */
    push(view: PlainObject): TemplateContext;

    /**
     * Returns the value of the given name in this context, traversing
     * up the context hierarchy if the value is absent in this context's view.
     */
    lookup(name: string): any;
}

/**
 * @en Writer interface.
 * @ja ライターインターフェイス
 */
export interface TemplateWriter {
    /**
     * Clears all cached templates in this writer.
     */
    clearCache(): void;

    /**
     * Parses and caches the given `template` according to the given `tags` or
     * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
     * that is generated from the parse.
     */
    parse(template: string, tags?: TemplateTags): TemplateToken[];

    /**
     * High-level method that is used to render the given `template` with
     * the given `view`.
     *
     * The optional `partials` argument may be an object that contains the
     * names and templates of partials that are used in the template. It may
     * also be a function that is used to load partial templates on the fly
     * that takes a single argument: the name of the partial.
     *
     * If the optional `tags` argument is given here it must be an array with two
     * string values: the opening and closing tags used in the template (e.g.
     * [ "<%", "%>" ]). The default is to mustache.tags.
     */
    render(template: string, view: PlainObject, partials?: PlainObject, tags?: TemplateTags): string;

    /**
     * Low-level method that renders the given array of `tokens` using
     * the given `context` and `partials`.
     *
     * Note: The `originalTemplate` is only ever used to extract the portion
     * of the original template that was contained in a higher-order section.
     * If the template doesn't use higher-order sections, this argument may
     * be omitted.
     */
    renderTokens(tokens: TemplateToken[], context: TemplateContext, partials?: PlainObject, originalTemplate?: string, tags?: TemplateTags): string;
}

/**
 * @en Compiled JavaScript template interface
 * @ja コンパイル済み テンプレート格納インターフェイス
 */
export interface JST {
    /**
     * @en Get compiled template's tokens.
     * @ja コンパイルされたテンプレートトークンの取得
     */
    readonly tokens: TemplateToken[];

    /**
     * @en Get result string that applied given parameter(s).
     * @ja パラメータを適用した結果を文字列として取得
     */
    (view?: PlainObject, partials?: PlainObject): string;
}

/**
 * @en Value escaper definition.
 * @ja エスケーパーの定義
 */
export type TemplateEscaper = typeof escapeHTML;

/**
 * @en [[Template]] base type definition.
 * @ja [[Template]] 基底型
 */
export interface ITemplate { } // eslint-disable-line @typescript-eslint/no-empty-interface

/**
 * @en [[Template]] internal I/F accssor.
 * @ja [[Template]] 内部インターフェイスのアクセッサ
 */
export interface TemplateAccessor extends ITemplate {
    /** Create [[TemplateScanner]] instance */
    createScanner(src: string): TemplateScanner;
    /** Create [[TemplateContext]] instance */
    createContext(view: PlainObject, parentContext?: TemplateContext): TemplateContext;
    /** Create [[TemplateWriter]] instance */
    createWriter(): TemplateWriter;
}
