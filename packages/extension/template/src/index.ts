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

export { _$LH } from 'lit-html/private-ssr-support.js';

export {
    Directive,
    DirectiveParameters,
    Part,
    PartInfo,
    PartType,
    directive,
} from 'lit-html/directive.js';

export { AsyncDirective } from 'lit-html/async-directive.js';
export { Ref, createRef } from 'lit-html/directives/ref.js';

import { asyncAppend } from 'lit-html/directives/async-append.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { cache } from 'lit-html/directives/cache.js';
import { choose } from 'lit-html/directives/choose.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { guard } from 'lit-html/directives/guard.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { join } from 'lit-html/directives/join.js';
import { keyed } from 'lit-html/directives/keyed.js';
import { live } from 'lit-html/directives/live.js';
import { map } from 'lit-html/directives/map.js';
import { range } from 'lit-html/directives/range.js';
import { ref } from 'lit-html/directives/ref.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { templateContent } from 'lit-html/directives/template-content.js';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { unsafeSVG } from 'lit-html/directives/unsafe-svg.js';
import { until } from 'lit-html/directives/until.js';
import { when } from 'lit-html/directives/when.js';

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
export const toTemplateStringsArray = (src: string | string[] | TemplateStringsArray): TemplateStringsArray => {
    const strings = Array.isArray(src) ? src : [src];
    if (!Object.prototype.hasOwnProperty.call(strings, 'raw')) {
        Object.defineProperty(strings, 'raw', { value: strings });
    }
    return strings as unknown as TemplateStringsArray;
};
