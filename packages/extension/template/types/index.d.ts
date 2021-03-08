export { TemplateResult, SVGTemplateResult, RenderOptions, Part, html, svg, render, parts, directive, } from 'lit-html';
import { Part, DirectiveFn } from 'lit-html';
import { ClassInfo } from 'lit-html/directives/class-map';
import { KeyFn, ItemTemplate } from 'lit-html/directives/repeat';
import { StyleInfo } from 'lit-html/directives/style-map';
export interface TemplateDirectives {
    asyncAppend: (value: AsyncIterable<unknown>, mapper?: ((v: unknown, index?: number | undefined) => unknown) | undefined) => (part: Part) => Promise<void>;
    asyncReplace: (value: AsyncIterable<unknown>, mapper?: ((v: unknown, index?: number | undefined) => unknown) | undefined) => (part: Part) => Promise<void>;
    cache: (value: unknown) => (part: Part) => void;
    classMap: (classInfo: ClassInfo) => (part: Part) => void;
    guard: (value: unknown, f: () => unknown) => (part: Part) => void;
    ifDefined: (value: unknown) => (part: Part) => void;
    repeat: <T>(items: Iterable<T>, keyFnOrTemplate: KeyFn<T> | ItemTemplate<T>, template?: ItemTemplate<T> | undefined) => DirectiveFn;
    styleMap: (styleInfo: StyleInfo) => (part: Part) => void;
    unsafeHTML: (value: unknown) => (part: Part) => void;
    until: (...args: unknown[]) => (part: Part) => void;
}
export declare const directives: TemplateDirectives;
/**
 * @en Convert from `string` to `TemplateStringsArray`. <br>
 *     This method is helper brigdge for the [[html]] or the [[svg]] are able to received plain string.
 * @ja `string` を `TemplateStringsArray`に変換. <br>
 *     [[html]] や [[svg]] が文字列を受け付けるためのブリッジメソッド
 *
 * @example <br>
 *
 * ```ts
 * import { toTemplateStringsArray as bridge } from '@cdp/extension-template';
 *
 * const raw = '<p>Hello Raw String</p>';
 * render(html(bridge(raw)), document.body);
 * ```
 *
 * @param src
 *  - `en` plain string. ex) [[JST]] returned value.
 *  - `ja` プレーン文字列. ex) [[JST]] の戻り値などを想定
 */
export declare const toTemplateStringsArray: (src: string) => TemplateStringsArray;
