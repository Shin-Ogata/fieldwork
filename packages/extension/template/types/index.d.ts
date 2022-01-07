export { TemplateResult, HTMLTemplateResult, SVGTemplateResult, RenderOptions, html, svg, render, noChange, nothing, } from 'lit-html';
import { AttributePart, PropertyPart, BooleanAttributePart, EventPart, ElementPart } from 'lit-html';
export declare const _Σ: {
    AttributePart: AttributePart;
    PropertyPart: PropertyPart;
    BooleanAttributePart: BooleanAttributePart;
    EventPart: EventPart;
    ElementPart: ElementPart;
};
export { Directive, DirectiveParameters, Part, PartInfo, PartType, directive, } from 'lit-html/directive';
export { AsyncDirective } from 'lit-html/async-directive';
export { Ref, createRef } from 'lit-html/directives/ref';
import { asyncAppend } from 'lit-html/directives/async-append';
import { asyncReplace } from 'lit-html/directives/async-replace';
import { cache } from 'lit-html/directives/cache';
import { choose } from 'lit-html/directives/choose';
import { classMap } from 'lit-html/directives/class-map';
import { guard } from 'lit-html/directives/guard';
import { ifDefined } from 'lit-html/directives/if-defined';
import { join } from 'lit-html/directives/join';
import { keyed } from 'lit-html/directives/keyed';
import { live } from 'lit-html/directives/live';
import { map } from 'lit-html/directives/map';
import { range } from 'lit-html/directives/range';
import { ref } from 'lit-html/directives/ref';
import { repeat } from 'lit-html/directives/repeat';
import { styleMap } from 'lit-html/directives/style-map';
import { templateContent } from 'lit-html/directives/template-content';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { unsafeSVG } from 'lit-html/directives/unsafe-svg';
import { until } from 'lit-html/directives/until';
import { when } from 'lit-html/directives/when';
declare namespace directives {
    type asyncAppend = typeof asyncAppend;
    type asyncReplace = typeof asyncReplace;
    type cache = typeof cache;
    type choose = typeof choose;
    type classMap = typeof classMap;
    type guard = typeof guard;
    type ifDefined = typeof ifDefined;
    type join = typeof join;
    type keyed = typeof keyed;
    type live = typeof live;
    type map = typeof map;
    type range = typeof range;
    type ref = typeof ref;
    type repeat = typeof repeat;
    type styleMap = typeof styleMap;
    type templateContent = typeof templateContent;
    type unsafeHTML = typeof unsafeHTML;
    type unsafeSVG = typeof unsafeSVG;
    type until = typeof until;
    type when = typeof when;
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
 *  - `en` plain string / string array. ex) [[JST]] returned value.
 *  - `ja` プレーン文字列 / 文字列配列. ex) [[JST]] の戻り値などを想定
 */
export declare const toTemplateStringsArray: (src: string | string[] | TemplateStringsArray) => TemplateStringsArray;
