/*!
 * @cdp/extension-template 0.9.18
 *   Generated by 'cdp-task bundle dts' task.
 *   - built with TypeScript 5.4.2
 *   - includes:
 *     - lit-html
 */
export interface DirectiveClass {
    new (part: PartInfo): Directive;
}
/**
 * This utility type extracts the signature of a directive class's render()
 * method so we can use it for the type of the generated directive function.
 */
export type DirectiveParameters<C extends Directive> = Parameters<C['render']>;
/**
 * A generated directive function doesn't evaluate the directive, but just
 * returns a DirectiveResult object that captures the arguments.
 */
export interface DirectiveResult<C extends DirectiveClass = DirectiveClass> {
}
export declare const PartType: {
    readonly ATTRIBUTE: 1;
    readonly CHILD: 2;
    readonly PROPERTY: 3;
    readonly BOOLEAN_ATTRIBUTE: 4;
    readonly EVENT: 5;
    readonly ELEMENT: 6;
};
export type PartType = (typeof PartType)[keyof typeof PartType];
export interface ChildPartInfo {
    readonly type: typeof PartType.CHILD;
}
export interface AttributePartInfo {
    readonly type: typeof PartType.ATTRIBUTE | typeof PartType.PROPERTY | typeof PartType.BOOLEAN_ATTRIBUTE | typeof PartType.EVENT;
    readonly strings?: ReadonlyArray<string>;
    readonly name: string;
    readonly tagName: string;
}
export interface ElementPartInfo {
    readonly type: typeof PartType.ELEMENT;
}
/**
 * Information about the part a directive is bound to.
 *
 * This is useful for checking that a directive is attached to a valid part,
 * such as with directive that can only be used on attribute bindings.
 */
export type PartInfo = ChildPartInfo | AttributePartInfo | ElementPartInfo;
/**
 * Creates a user-facing directive function from a Directive class. This
 * function has the same parameters as the directive's render() method.
 */
export declare const directive: <C extends DirectiveClass>(c: C) => (...values: Parameters<InstanceType<C>['render']>) => DirectiveResult<C>;
/**
 * Base class for creating custom directives. Users should extend this class,
 * implement `render` and/or `update`, and then pass their subclass to
 * `directive`.
 */
export declare abstract class Directive implements Disconnectable {
    constructor(_partInfo: PartInfo);
    get _$isConnected(): boolean;
    abstract render(...props: Array<unknown>): unknown;
    update(_part: Part, props: Array<unknown>): unknown;
}
/**
 * Used to sanitize any value before it is written into the DOM. This can be
 * used to implement a security policy of allowed and disallowed values in
 * order to prevent XSS attacks.
 *
 * One way of using this callback would be to check attributes and properties
 * against a list of high risk fields, and require that values written to such
 * fields be instances of a class which is safe by construction. Closure's Safe
 * HTML Types is one implementation of this technique (
 * https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md).
 * The TrustedTypes polyfill in API-only mode could also be used as a basis
 * for this technique (https://github.com/WICG/trusted-types).
 *
 * @param node The HTML node (usually either a #text node or an Element) that
 *     is being written to. Note that this is just an exemplar node, the write
 *     may take place against another instance of the same class of node.
 * @param name The name of an attribute or property (for example, 'href').
 * @param type Indicates whether the write that's about to be performed will
 *     be to a property or a node.
 * @return A function that will sanitize this class of writes.
 */
export type SanitizerFactory = (node: Node, name: string, type: 'property' | 'attribute') => ValueSanitizer;
/**
 * A function which can sanitize values that will be written to a specific kind
 * of DOM sink.
 *
 * See SanitizerFactory.
 *
 * @param value The value to sanitize. Will be the actual value passed into
 *     the lit-html template literal, so this could be of any type.
 * @return The value to write to the DOM. Usually the same as the input value,
 *     unless sanitization is needed.
 */
export type ValueSanitizer = (value: unknown) => unknown;
declare const HTML_RESULT = 1;
declare const SVG_RESULT = 2;
export type ResultType = typeof HTML_RESULT | typeof SVG_RESULT;
declare const ATTRIBUTE_PART = 1;
declare const CHILD_PART = 2;
declare const ELEMENT_PART = 6;
declare const COMMENT_PART = 7;
/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg} when it hasn't been compiled by @lit-labs/compiler.
 *
 * A `TemplateResult` object holds all the information about a template
 * expression required to render it: the template strings, expression values,
 * and type of template (html or svg).
 *
 * `TemplateResult` objects do not create any DOM on their own. To create or
 * update DOM you need to render the `TemplateResult`. See
 * [Rendering](https://lit.dev/docs/components/rendering) for more information.
 *
 */
export type UncompiledTemplateResult<T extends ResultType = ResultType> = {
    ['_$litType$']: T;
    strings: TemplateStringsArray;
    values: unknown[];
};
/**
 * The return type of the template tag functions, {@linkcode html} and
 * {@linkcode svg}.
 *
 * A `TemplateResult` object holds all the information about a template
 * expression required to render it: the template strings, expression values,
 * and type of template (html or svg).
 *
 * `TemplateResult` objects do not create any DOM on their own. To create or
 * update DOM you need to render the `TemplateResult`. See
 * [Rendering](https://lit.dev/docs/components/rendering) for more information.
 *
 * In Lit 4, this type will be an alias of
 * MaybeCompiledTemplateResult, so that code will get type errors if it assumes
 * that Lit templates are not compiled. When deliberately working with only
 * one, use either {@linkcode CompiledTemplateResult} or
 * {@linkcode UncompiledTemplateResult} explicitly.
 */
export type TemplateResult<T extends ResultType = ResultType> = UncompiledTemplateResult<T>;
export type HTMLTemplateResult = TemplateResult<typeof HTML_RESULT>;
export type SVGTemplateResult = TemplateResult<typeof SVG_RESULT>;
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const header = (title: string) => html`<h1>${title}</h1>`;
 * ```
 *
 * The `html` tag returns a description of the DOM to render as a value. It is
 * lazy, meaning no work is done until the template is rendered. When rendering,
 * if a template comes from the same expression as a previously rendered result,
 * it's efficiently updated instead of replaced.
 */
export declare const html: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult<1>;
/**
 * Interprets a template literal as an SVG fragment that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const rect = svg`<rect width='10' height='10'></rect>`;
 *
 * const myImage = html`
 *   <svg viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'>
 *     ${rect}
 *   </svg>`;
 * ```
 *
 * The `svg` *tag function* should only be used for SVG fragments, or elements
 * that would be contained **inside** an `<svg>` HTML element. A common error is
 * placing an `<svg>` *element* in a template tagged with the `svg` tag
 * function. The `<svg>` element is an HTML element and should be used within a
 * template tagged with the {@linkcode html} tag function.
 *
 * In LitElement usage, it's invalid to return an SVG fragment from the
 * `render()` method, as the SVG fragment will be contained within the element's
 * shadow root and thus cannot be used within an `<svg>` HTML element.
 */
export declare const svg: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult<2>;
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
export declare const noChange: unique symbol;
/**
 * A sentinel value that signals a ChildPart to fully clear its content.
 *
 * ```ts
 * const button = html`${
 *  user.isAdmin
 *    ? html`<button>DELETE</button>`
 *    : nothing
 * }`;
 * ```
 *
 * Prefer using `nothing` over other falsy values as it provides a consistent
 * behavior between various expression binding contexts.
 *
 * In child expressions, `undefined`, `null`, `''`, and `nothing` all behave the
 * same and render no nodes. In attribute expressions, `nothing` _removes_ the
 * attribute, while `undefined` and `null` will render an empty string. In
 * property expressions `nothing` becomes `undefined`.
 */
export declare const nothing: unique symbol;
/**
 * Object specifying options for controlling lit-html rendering. Note that
 * while `render` may be called multiple times on the same `container` (and
 * `renderBefore` reference node) to efficiently update the rendered content,
 * only the options passed in during the first render are respected during
 * the lifetime of renders to that unique `container` + `renderBefore`
 * combination.
 */
export interface RenderOptions {
    /**
     * An object to use as the `this` value for event listeners. It's often
     * useful to set this to the host component rendering a template.
     */
    host?: object;
    /**
     * A DOM node before which to render content in the container.
     */
    renderBefore?: ChildNode | null;
    /**
     * Node used for cloning the template (`importNode` will be called on this
     * node). This controls the `ownerDocument` of the rendered DOM, along with
     * any inherited context. Defaults to the global `document`.
     */
    creationScope?: {
        importNode(node: Node, deep?: boolean): Node;
    };
    /**
     * The initial connected state for the top-level part being rendered. If no
     * `isConnected` option is set, `AsyncDirective`s will be connected by
     * default. Set to `false` if the initial render occurs in a disconnected tree
     * and `AsyncDirective`s should see `isConnected === false` for their initial
     * render. The `part.setConnected()` method must be used subsequent to initial
     * render to change the connected state of the part.
     */
    isConnected?: boolean;
}
export interface DirectiveParent {
    _$parent?: DirectiveParent;
    _$isConnected: boolean;
    __directive?: Directive;
    __directives?: Array<Directive | undefined>;
}
declare class Template {
    parts: Array<TemplatePart>;
    constructor({ strings, ['_$litType$']: type }: UncompiledTemplateResult, options?: RenderOptions);
    /** @nocollapse */
    static createElement(html: HTMLElement, _options?: RenderOptions): HTMLTemplateElement;
}
export interface Disconnectable {
    _$parent?: Disconnectable;
    _$disconnectableChildren?: Set<Disconnectable>;
    _$isConnected: boolean;
}
declare class TemplateInstance implements Disconnectable {
    _$template: Template;
    _$parts: Array<Part | undefined>;
    constructor(template: Template, parent: ChildPart);
    get parentNode(): Node;
    get _$isConnected(): boolean;
    _clone(options: RenderOptions | undefined): Node;
    _update(values: Array<unknown>): void;
}
export type AttributeTemplatePart = {
    readonly type: typeof ATTRIBUTE_PART;
    readonly index: number;
    readonly name: string;
    readonly ctor: typeof AttributePart;
    readonly strings: ReadonlyArray<string>;
};
export type ChildTemplatePart = {
    readonly type: typeof CHILD_PART;
    readonly index: number;
};
export type ElementTemplatePart = {
    readonly type: typeof ELEMENT_PART;
    readonly index: number;
};
export type CommentTemplatePart = {
    readonly type: typeof COMMENT_PART;
    readonly index: number;
};
/**
 * A TemplatePart represents a dynamic part in a template, before the template
 * is instantiated. When a template is instantiated Parts are created from
 * TemplateParts.
 */
export type TemplatePart = ChildTemplatePart | AttributeTemplatePart | ElementTemplatePart | CommentTemplatePart;
export type Part = ChildPart | AttributePart | PropertyPart | BooleanAttributePart | ElementPart | EventPart;
declare class ChildPart implements Disconnectable {
    readonly type = 2;
    readonly options: RenderOptions | undefined;
    _$committedValue: unknown;
    private _textSanitizer;
    get _$isConnected(): boolean;
    constructor(startNode: ChildNode, endNode: ChildNode | null, parent: TemplateInstance | ChildPart | undefined, options: RenderOptions | undefined);
    /**
     * The parent node into which the part renders its content.
     *
     * A ChildPart's content consists of a range of adjacent child nodes of
     * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
     * `.endNode`).
     *
     * - If both `.startNode` and `.endNode` are non-null, then the part's content
     * consists of all siblings between `.startNode` and `.endNode`, exclusively.
     *
     * - If `.startNode` is non-null but `.endNode` is null, then the part's
     * content consists of all siblings following `.startNode`, up to and
     * including the last child of `.parentNode`. If `.endNode` is non-null, then
     * `.startNode` will always be non-null.
     *
     * - If both `.endNode` and `.startNode` are null, then the part's content
     * consists of all child nodes of `.parentNode`.
     */
    get parentNode(): Node;
    /**
     * The part's leading marker node, if any. See `.parentNode` for more
     * information.
     */
    get startNode(): Node | null;
    /**
     * The part's trailing marker node, if any. See `.parentNode` for more
     * information.
     */
    get endNode(): Node | null;
    _$setValue(value: unknown, directiveParent?: DirectiveParent): void;
    private _insert;
    private _commitNode;
    private _commitText;
    private _commitTemplateResult;
    private _commitIterable;
}
/**
 * A top-level `ChildPart` returned from `render` that manages the connected
 * state of `AsyncDirective`s created throughout the tree below it.
 */
export interface RootPart extends ChildPart {
    /**
     * Sets the connection state for `AsyncDirective`s contained within this root
     * ChildPart.
     *
     * lit-html does not automatically monitor the connectedness of DOM rendered;
     * as such, it is the responsibility of the caller to `render` to ensure that
     * `part.setConnected(false)` is called before the part object is potentially
     * discarded, to ensure that `AsyncDirective`s have a chance to dispose of
     * any resources being held. If a `RootPart` that was previously
     * disconnected is subsequently re-connected (and its `AsyncDirective`s should
     * re-connect), `setConnected(true)` should be called.
     *
     * @param isConnected Whether directives within this tree should be connected
     * or not
     */
    setConnected(isConnected: boolean): void;
}
declare class AttributePart implements Disconnectable {
    readonly type: 1 | 3 | 4 | 5;
    readonly element: HTMLElement;
    readonly name: string;
    readonly options: RenderOptions | undefined;
    /**
     * If this attribute part represents an interpolation, this contains the
     * static strings of the interpolation. For single-value, complete bindings,
     * this is undefined.
     */
    readonly strings?: ReadonlyArray<string>;
    protected _sanitizer: ValueSanitizer | undefined;
    get tagName(): string;
    get _$isConnected(): boolean;
    constructor(element: HTMLElement, name: string, strings: ReadonlyArray<string>, parent: Disconnectable, options: RenderOptions | undefined);
}
declare class PropertyPart extends AttributePart {
    readonly type = 3;
}
declare class BooleanAttributePart extends AttributePart {
    readonly type = 4;
}
declare class EventPart extends AttributePart {
    readonly type = 5;
    constructor(element: HTMLElement, name: string, strings: ReadonlyArray<string>, parent: Disconnectable, options: RenderOptions | undefined);
    handleEvent(event: Event): void;
}
declare class ElementPart implements Disconnectable {
    element: Element;
    readonly type = 6;
    _$committedValue: undefined;
    options: RenderOptions | undefined;
    constructor(element: Element, parent: Disconnectable, options: RenderOptions | undefined);
    get _$isConnected(): boolean;
    _$setValue(value: unknown): void;
}
/**
 * Renders a value, usually a lit-html TemplateResult, to the container.
 *
 * This example renders the text 'Hello, Zoe!' inside a paragraph tag, appending
 * it to the container `document.body`.
 *
 * ```js
 * import {html, render} from 'lit';
 *
 * const name = 'Zoe';
 * render(html`<p>Hello, ${name}!</p>`, document.body);
 * ```
 *
 * @param value Any [renderable
 *   value](https://lit.dev/docs/templates/expressions/#child-expressions),
 *   typically a {@linkcode TemplateResult} created by evaluating a template tag
 *   like {@linkcode html} or {@linkcode svg}.
 * @param container A DOM container to render to. The first render will append
 *   the rendered value to the container, and subsequent renders will
 *   efficiently update the rendered value if the same result type was
 *   previously rendered there.
 * @param options See {@linkcode RenderOptions} for options documentation.
 * @see
 * {@link https://lit.dev/docs/libraries/standalone-templates/#rendering-lit-html-templates| Rendering Lit HTML Templates}
 */
export declare const render: {
    (value: unknown, container: HTMLElement | DocumentFragment, options?: RenderOptions): RootPart;
    setSanitizer: (newSanitizer: SanitizerFactory) => void;
    createSanitizer: SanitizerFactory;
    _testOnlyClearSanitizerFactoryDoNotCallOrElse: () => void;
};
/**
 * An abstract `Directive` base class whose `disconnected` method will be
 * called when the part containing the directive is cleared as a result of
 * re-rendering, or when the user calls `part.setConnected(false)` on
 * a part that was previously rendered containing the directive (as happens
 * when e.g. a LitElement disconnects from the DOM).
 *
 * If `part.setConnected(true)` is subsequently called on a
 * containing part, the directive's `reconnected` method will be called prior
 * to its next `update`/`render` callbacks. When implementing `disconnected`,
 * `reconnected` should also be implemented to be compatible with reconnection.
 *
 * Note that updates may occur while the directive is disconnected. As such,
 * directives should generally check the `this.isConnected` flag during
 * render/update to determine whether it is safe to subscribe to resources
 * that may prevent garbage collection.
 */
export declare abstract class AsyncDirective extends Directive {
    /**
     * The connection state for this Directive.
     */
    isConnected: boolean;
    /**
     * Initialize the part with internal fields
     * @param part
     * @param parent
     * @param attributeIndex
     */
    _$initialize(part: Part, parent: Disconnectable, attributeIndex: number | undefined): void;
    /**
     * Sets the value of the directive's Part outside the normal `update`/`render`
     * lifecycle of a directive.
     *
     * This method should not be called synchronously from a directive's `update`
     * or `render`.
     *
     * @param directive The directive to update
     * @param value The value to set
     */
    setValue(value: unknown): void;
    /**
     * User callbacks for implementing logic to release any resources/subscriptions
     * that may have been retained by this directive. Since directives may also be
     * re-connected, `reconnected` should also be implemented to restore the
     * working state of the directive prior to the next render.
     */
    protected disconnected(): void;
    protected reconnected(): void;
}
/**
 * Creates a new Ref object, which is container for a reference to an element.
 */
export declare const createRef: <T = Element>() => Ref<T>;
/**
 * An object that holds a ref value.
 */
export declare class Ref<T = Element> {
    /**
     * The current Element value of the ref, or else `undefined` if the ref is no
     * longer rendered.
     */
    readonly value?: T;
}
export type RefOrCallback<T = Element> = Ref<T> | ((el: T | undefined) => void);
declare class RefDirective extends AsyncDirective {
    private _element?;
    private _ref?;
    private _context?;
    render(_ref?: RefOrCallback): symbol;
    update(part: ElementPart, [ref]: Parameters<this['render']>): symbol;
    private _updateRefValue;
    private get _lastElementForRef();
    disconnected(): void;
    reconnected(): void;
}
declare const _directive_ref: (_ref?: RefOrCallback<Element> | undefined) => DirectiveResult<typeof RefDirective>;
export type Mapper<T> = (v: T, index?: number) => unknown;
declare class AsyncReplaceDirective extends AsyncDirective {
    private __value?;
    private __weakThis;
    private __pauser;
    render<T>(value: AsyncIterable<T>, _mapper?: Mapper<T>): symbol;
    update(_part: ChildPart, [value, mapper]: DirectiveParameters<this>): symbol;
    protected commitValue(value: unknown, _index: number): void;
    disconnected(): void;
    reconnected(): void;
}
declare const asyncReplace: (value: AsyncIterable<unknown>, _mapper?: Mapper<unknown> | undefined) => DirectiveResult<typeof AsyncReplaceDirective>;
declare class AsyncAppendDirective extends AsyncReplaceDirective {
    private __childPart;
    constructor(partInfo: PartInfo);
    update(part: ChildPart, params: DirectiveParameters<this>): symbol;
    protected commitValue(value: unknown, index: number): void;
}
declare const asyncAppend: (value: AsyncIterable<unknown>, _mapper?: ((v: unknown, index?: number | undefined) => unknown) | undefined) => DirectiveResult<typeof AsyncAppendDirective>;
declare class CacheDirective extends Directive {
    private _templateCache;
    private _value?;
    constructor(partInfo: PartInfo);
    render(v: unknown): unknown[];
    update(containerPart: ChildPart, [v]: DirectiveParameters<this>): unknown[];
}
declare const _directive_cache: (v: unknown) => DirectiveResult<typeof CacheDirective>;
declare const _directive_choose: <T, V, K extends T = T>(value: T, cases: [
    K,
    () => V
][], defaultCase?: (() => V) | undefined) => V | undefined;
/**
 * A key-value set of class names to truthy values.
 */
export interface ClassInfo {
    readonly [name: string]: string | boolean | number;
}
declare class ClassMapDirective extends Directive {
    /**
     * Stores the ClassInfo object applied to a given AttributePart.
     * Used to unset existing values when a new ClassInfo object is applied.
     */
    private _previousClasses?;
    private _staticClasses?;
    constructor(partInfo: PartInfo);
    render(classInfo: ClassInfo): string;
    update(part: AttributePart, [classInfo]: DirectiveParameters<this>): string | typeof noChange;
}
declare const classMap: (classInfo: ClassInfo) => DirectiveResult<typeof ClassMapDirective>;
declare class GuardDirective extends Directive {
    private _previousValue;
    render(_value: unknown, f: () => unknown): unknown;
    update(_part: Part, [value, f]: DirectiveParameters<this>): unknown;
}
declare const _directive_guard: (_value: unknown, f: () => unknown) => DirectiveResult<typeof GuardDirective>;
declare const ifDefined: <T>(value: T) => typeof nothing | NonNullable<T>;
declare function _directive_join<I, J>(items: Iterable<I> | undefined, joiner: (index: number) => J): Iterable<I | J>;
declare function _directive_join<I, J>(items: Iterable<I> | undefined, joiner: J): Iterable<I | J>;
declare class Keyed extends Directive {
    key: unknown;
    render(k: unknown, v: unknown): unknown;
    update(part: ChildPart, [k, v]: DirectiveParameters<this>): unknown;
}
declare const keyed: (k: unknown, v: unknown) => DirectiveResult<typeof Keyed>;
declare class LiveDirective extends Directive {
    constructor(partInfo: PartInfo);
    render(value: unknown): unknown;
    update(part: AttributePart, [value]: DirectiveParameters<this>): unknown;
}
declare const _directive_live: (value: unknown) => DirectiveResult<typeof LiveDirective>;
declare function _directive_map<T>(items: Iterable<T> | undefined, f: (value: T, index: number) => unknown): Generator<unknown, void, unknown>;
declare function _directive_range(end: number): Iterable<number>;
declare function _directive_range(start: number, end: number, step?: number): Iterable<number>;
export type KeyFn<T> = (item: T, index: number) => unknown;
export type ItemTemplate<T> = (item: T, index: number) => unknown;
export interface RepeatDirectiveFn {
    <T>(items: Iterable<T>, keyFnOrTemplate: KeyFn<T> | ItemTemplate<T>, template?: ItemTemplate<T>): unknown;
    <T>(items: Iterable<T>, template: ItemTemplate<T>): unknown;
    <T>(items: Iterable<T>, keyFn: KeyFn<T> | ItemTemplate<T>, template: ItemTemplate<T>): unknown;
}
declare const _directive_repeat: RepeatDirectiveFn;
/**
 * A key-value set of CSS properties and values.
 *
 * The key should be either a valid CSS property name string, like
 * `'background-color'`, or a valid JavaScript camel case property name
 * for CSSStyleDeclaration like `backgroundColor`.
 */
export interface StyleInfo {
    [name: string]: string | number | undefined | null;
}
declare class StyleMapDirective extends Directive {
    private _previousStyleProperties?;
    constructor(partInfo: PartInfo);
    render(styleInfo: Readonly<StyleInfo>): string;
    update(part: AttributePart, [styleInfo]: DirectiveParameters<this>): string | typeof noChange;
}
declare const styleMap: (styleInfo: Readonly<StyleInfo>) => DirectiveResult<typeof StyleMapDirective>;
declare class TemplateContentDirective extends Directive {
    private _previousTemplate?;
    constructor(partInfo: PartInfo);
    render(template: HTMLTemplateElement): DocumentFragment | typeof noChange;
}
declare const templateContent: (template: HTMLTemplateElement) => DirectiveResult<typeof TemplateContentDirective>;
declare class UnsafeHTMLDirective extends Directive {
    static directiveName: string;
    static resultType: number;
    private _value;
    private _templateResult?;
    constructor(partInfo: PartInfo);
    render(value: string | typeof nothing | typeof noChange | undefined | null): typeof noChange | typeof nothing | TemplateResult | null | undefined;
}
declare const unsafeHTML: (value: string | typeof noChange | typeof nothing | null | undefined) => DirectiveResult<typeof UnsafeHTMLDirective>;
declare class UnsafeSVGDirective extends UnsafeHTMLDirective {
    static directiveName: string;
    static resultType: number;
}
declare const unsafeSVG: (value: string | typeof noChange | typeof nothing | null | undefined) => DirectiveResult<typeof UnsafeSVGDirective>;
declare class UntilDirective extends AsyncDirective {
    private __lastRenderedIndex;
    private __values;
    private __weakThis;
    private __pauser;
    render(...args: Array<unknown>): unknown;
    update(_part: Part, args: Array<unknown>): unknown;
    disconnected(): void;
    reconnected(): void;
}
declare const _directive_until: (...values: unknown[]) => DirectiveResult<typeof UntilDirective>;
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
export type Falsy = null | undefined | false | 0 | -0 | 0n | '';
declare function _directive_when<C extends Falsy, T, F = undefined>(condition: C, trueCase: (c: C) => T, falseCase?: (c: C) => F): F;
declare function _directive_when<C, T, F>(condition: C extends Falsy ? never : C, trueCase: (c: C) => T, falseCase?: (c: C) => F): T;
declare function _directive_when<C, T, F = undefined>(condition: C, trueCase: (c: Exclude<C, Falsy>) => T, falseCase?: (c: Extract<C, Falsy>) => F): C extends Falsy ? F : T;
export declare const _Σ: {
    AttributePart: AttributePart;
    PropertyPart: PropertyPart;
    BooleanAttributePart: BooleanAttributePart;
    EventPart: EventPart;
    ElementPart: ElementPart;
};
declare namespace directives {
    type asyncAppend = typeof asyncAppend;
    type asyncReplace = typeof asyncReplace;
    type cache = typeof _directive_cache;
    type choose = typeof _directive_choose;
    type classMap = typeof classMap;
    type guard = typeof _directive_guard;
    type ifDefined = typeof ifDefined;
    type join = typeof _directive_join;
    type keyed = typeof keyed;
    type live = typeof _directive_live;
    type map = typeof _directive_map;
    type range = typeof _directive_range;
    type ref = typeof _directive_ref;
    type repeat = typeof _directive_repeat;
    type styleMap = typeof styleMap;
    type templateContent = typeof templateContent;
    type unsafeHTML = typeof unsafeHTML;
    type unsafeSVG = typeof unsafeSVG;
    type until = typeof _directive_until;
    type when = typeof _directive_when;
}
export interface TemplateDirectives {
    asyncAppend: directives.asyncAppend;
    asyncReplace: directives.asyncReplace;
    cache: directives.cache;
    choose: directives.choose;
    classMap: directives.classMap;
    guard: directives.guard;
    ifDefined: directives.ifDefined;
    join: directives.join;
    keyed: directives.keyed;
    live: directives.live;
    map: directives.map;
    range: directives.range;
    ref: directives.ref;
    repeat: directives.repeat;
    styleMap: directives.styleMap;
    templateContent: directives.templateContent;
    unsafeHTML: directives.unsafeHTML;
    unsafeSVG: directives.unsafeSVG;
    until: directives.until;
    when: directives.when;
}
declare const directives$1: TemplateDirectives;
/**
 * @en Convert from `string` to `TemplateStringsArray`. <br>
 *     This method is helper brigdge for the {@link html} or the {@link svg} are able to received plain string.
 * @ja `string` を `TemplateStringsArray`に変換. <br>
 *     {@link html} や {@link svg} が文字列を受け付けるためのブリッジメソッド
 *
 * @example <br>
 *
 * ```ts
 * import { toTemplateStringsArray as bridge } from '@cdp/runtime';
 *
 * const raw = '<p>Hello Raw String</p>';
 * render(html(bridge(raw)), document.body);
 * ```
 *
 * @param src
 *  - `en` plain string / string array. ex) {@link JST} returned value.
 *  - `ja` プレーン文字列 / 文字列配列. ex) {@link JST} の戻り値などを想定
 */
export declare const toTemplateStringsArray: (src: string | string[] | TemplateStringsArray) => TemplateStringsArray;
export {
    directives$1 as directives,
};
