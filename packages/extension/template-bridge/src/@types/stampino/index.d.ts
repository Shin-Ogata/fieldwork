import type { TemplateBridgeArg, TemplateBridgeEndine } from '@bridge/interfaces';

/**
 * A TemplateRenderer is responsible for rendering a block call, like
 * <template name="foo">
 */
export interface TemplateRenderer {
    (view: TemplateBridgeArg, handlers: TemplateHandlers, renderers: TemplateRenderers): unknown;
}

export interface TemplateRenderers {
    [name: string]: TemplateRenderer;
}
/**
 * A TemplateHandlers is responsible for rendering control flow like
 * <template type="if" if="{{x}}">
 */
export declare type TemplateHandler = (template: HTMLTemplateElement, view: TemplateBridgeArg, handlers: TemplateHandlers, renderers: TemplateRenderers) => unknown;

export interface TemplateHandlers {
    [name: string]: TemplateHandler;
}

export declare const ifHandler: TemplateHandler;
export declare const repeatHandler: TemplateHandler;

/**
 * @returns {Function} a template function of the form (view) => TemplateResult
 */
export declare const prepareTemplate: (
    template: HTMLTemplateElement,
    handlers?: TemplateHandlers,
    renderers?: TemplateRenderers,
    superTemplate?: HTMLTemplateElement | undefined
) => TemplateBridgeEndine;

export interface EvaluateTemplateResult {
    values: unknown[];
}

/**
 * Evaluates the given template and returns its result
 *
 * @param template
 * @param view
 * @param handlers
 * @param renderers
 * @returns
 */
export declare const evaluateTemplate: (
    template: HTMLTemplateElement,
    view: object,
    handlers?: TemplateHandlers,
    renderers?: TemplateRenderers
) => EvaluateTemplateResult;
