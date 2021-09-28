/* eslint-disable
    @typescript-eslint/ban-types,
 */

import { TemplateResult, SVGTemplateResult } from '@cdp/extension-template';
export type TemplateBridgeArg    = Record<string, {} | null | undefined>;
export type TemplateBridgeEndine = (view?: TemplateBridgeArg) => TemplateResult | SVGTemplateResult;
export type TemplateTransformer  = (template: HTMLTemplateElement | string) => TemplateBridgeEndine;
