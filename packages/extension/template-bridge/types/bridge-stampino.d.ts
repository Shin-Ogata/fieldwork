import type { TemplateBridgeArg, TemplateTransformer } from '@bridge/interfaces';
import { TemplateHandler, TemplateHandlers, TemplateRenderers, EvaluateTemplateResult, prepareTemplate, evaluateTemplate } from 'stampino';
export interface CreateStampinoTemplateOptions {
    handlers?: TemplateHandlers;
    renderers?: TemplateRenderers;
    superTemplate?: HTMLTemplateElement | undefined;
}
declare function createStampinoTransformer(options?: CreateStampinoTemplateOptions): TemplateTransformer;
export { TemplateBridgeArg, TemplateHandler, TemplateHandlers, TemplateRenderers, EvaluateTemplateResult, createStampinoTransformer, prepareTemplate, evaluateTemplate, };
