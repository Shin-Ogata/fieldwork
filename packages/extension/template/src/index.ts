export {
    TemplateResult,
    HTMLTemplateResult,
    SVGTemplateResult,
    RenderOptions,
    html,
    svg,
    render,
    noChange,
    nothing,
} from 'lit-html';

import {
    _$LH,
    AttributePart,
    PropertyPart,
    BooleanAttributePart,
    EventPart,
    ElementPart,
} from 'lit-html';
export const _Σ = {
    AttributePart: _$LH._AttributePart as unknown as AttributePart,
    PropertyPart: _$LH._PropertyPart as unknown as PropertyPart,
    BooleanAttributePart: _$LH._BooleanAttributePart as unknown as BooleanAttributePart,
    EventPart: _$LH._EventPart as unknown as EventPart,
    ElementPart: _$LH._ElementPart as unknown as ElementPart,
};

export {
    Directive,
    DirectiveParameters,
    Part,
    PartInfo,
    PartType,
    directive,
} from 'lit-html/directive';

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

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace directives {
    export type asyncAppend = typeof asyncAppend;
    export type asyncReplace = typeof asyncReplace;
    export type cache = typeof cache;
    export type choose = typeof choose;
    export type classMap = typeof classMap;
    export type guard = typeof guard;
    export type ifDefined = typeof ifDefined;
    export type join = typeof join;
    export type keyed = typeof keyed;
    export type live = typeof live;
    export type map = typeof map;
    export type range = typeof range;
    export type ref = typeof ref;
    export type repeat = typeof repeat;
    export type styleMap = typeof styleMap;
    export type templateContent = typeof templateContent;
    export type unsafeHTML = typeof unsafeHTML;
    export type unsafeSVG = typeof unsafeSVG;
    export type until = typeof until;
    export type when = typeof when;
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

export const directives: TemplateDirectives = {
    asyncAppend,
    asyncReplace,
    cache,
    choose,
    classMap,
    guard,
    ifDefined,
    join,
    keyed,
    live,
    map,
    range,
    ref,
    repeat,
    styleMap,
    templateContent,
    unsafeHTML,
    unsafeSVG,
    until,
    when,
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
 *  - `en` plain string / string array. ex) [[JST]] returned value.
 *  - `ja` プレーン文字列 / 文字列配列. ex) [[JST]] の戻り値などを想定
 */
export const toTemplateStringsArray = (src: string | string[] | TemplateStringsArray): TemplateStringsArray => {
    const strings = Array.isArray(src) ? src : [src];
    if (!Object.prototype.hasOwnProperty.call(strings, 'raw')) {
        Object.defineProperty(strings, 'raw', { value: strings });
    }
    return strings as unknown as TemplateStringsArray;
};
