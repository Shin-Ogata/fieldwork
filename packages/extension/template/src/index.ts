export {
    TemplateResult,
    SVGTemplateResult,
    RenderOptions,
    html,
    svg,
    render,
    parts,
    directive,
    isDirective,
} from 'lit-html';

import { asyncAppend } from 'lit-html/directives/async-append';
import { asyncReplace } from 'lit-html/directives/async-replace';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { guard } from 'lit-html/directives/guard';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { styleMap } from 'lit-html/directives/style-map';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';

export const directives = {
    asyncAppend,
    asyncReplace,
    cache,
    classMap,
    guard,
    ifDefined,
    repeat,
    styleMap,
    unsafeHTML,
};
