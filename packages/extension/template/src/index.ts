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

import { asyncAppend } from 'lit-html/directives/async-append';
import { asyncReplace } from 'lit-html/directives/async-replace';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { guard } from 'lit-html/directives/guard';
import { ifDefined } from 'lit-html/directives/if-defined';
import { live } from 'lit-html/directives/live';
import { ref } from 'lit-html/directives/ref';
export { Ref, createRef } from 'lit-html/directives/ref';
import { repeat } from 'lit-html/directives/repeat';
import { styleMap } from 'lit-html/directives/style-map';
import { templateContent } from 'lit-html/directives/template-content';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { unsafeSVG } from 'lit-html/directives/unsafe-svg';
import { until } from 'lit-html/directives/until';

export interface TemplateDirectives {
    asyncAppend: typeof asyncAppend;
    asyncReplace: typeof asyncReplace;
    cache: typeof cache;
    classMap: typeof classMap;
    guard: typeof guard;
    ifDefined: typeof ifDefined;
    live: typeof live;
    ref: typeof ref;
    repeat: typeof repeat;
    styleMap: typeof styleMap;
    templateContent: typeof templateContent;
    unsafeHTML: typeof unsafeHTML;
    unsafeSVG: typeof unsafeSVG;
    until: typeof until;
}

export const directives: TemplateDirectives = {
    asyncAppend,
    asyncReplace,
    cache,
    classMap,
    guard,
    ifDefined,
    live,
    ref,
    repeat,
    styleMap,
    templateContent,
    unsafeHTML,
    unsafeSVG,
    until,
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
