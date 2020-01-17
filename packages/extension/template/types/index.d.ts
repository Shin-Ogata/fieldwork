export { TemplateResult, SVGTemplateResult, RenderOptions, html, svg, render, parts, directive, isDirective, } from 'lit-html';
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
};
