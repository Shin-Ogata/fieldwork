export { TemplateResult, SVGTemplateResult, RenderOptions, Part, html, svg, render, parts, directive, } from 'lit-html';
export declare const directives: {
    asyncAppend: (value: AsyncIterable<unknown>, mapper?: ((v: unknown, index?: number | undefined) => unknown) | undefined) => (part: import("lit-html").Part) => Promise<void>;
    asyncReplace: (value: AsyncIterable<unknown>, mapper?: ((v: unknown, index?: number | undefined) => unknown) | undefined) => (part: import("lit-html").Part) => Promise<void>;
    cache: (value: unknown) => (part: import("lit-html").Part) => void;
    classMap: (classInfo: import("lit-html/directives/class-map").ClassInfo) => (part: import("lit-html").Part) => void;
    guard: (value: unknown, f: () => unknown) => (part: import("lit-html").Part) => void;
    ifDefined: (value: unknown) => (part: import("lit-html").Part) => void;
    repeat: <T>(items: Iterable<T>, keyFnOrTemplate: import("lit-html/directives/repeat").KeyFn<T> | import("lit-html/directives/repeat").ItemTemplate<T>, template?: import("lit-html/directives/repeat").ItemTemplate<T> | undefined) => import("lit-html").DirectiveFn;
    styleMap: (styleInfo: import("lit-html/directives/style-map").StyleInfo) => (part: import("lit-html").Part) => void;
    unsafeHTML: (value: unknown) => (part: import("lit-html").Part) => void;
    until: (...args: unknown[]) => (part: import("lit-html").Part) => void;
};
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
