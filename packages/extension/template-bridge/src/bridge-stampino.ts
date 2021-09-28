import type {
    TemplateBridgeArg,
    TemplateTransformer,
} from '@bridge/interfaces';
import {
    TemplateHandler,
    TemplateHandlers,
    TemplateRenderers,
    EvaluateTemplateResult,
    prepareTemplate,
    evaluateTemplate,
} from 'stampino';

export interface CreateStampinoTemplateOptions {
    handlers?: TemplateHandlers;
    renderers?: TemplateRenderers;
    superTemplate?: HTMLTemplateElement | undefined;
}

function ensure(template: HTMLTemplateElement | string): HTMLTemplateElement {
    if (template instanceof HTMLTemplateElement) {
        return template;
    } else if ('string' === typeof template) {
        const element = document.createElement('template');
        element.innerHTML = template;
        return element;
    } else {
        throw new TypeError(`Type of template is not a valid. [typeof: ${typeof template}]`);
    }
}

function createStampinoTransformer(options?: CreateStampinoTemplateOptions): TemplateTransformer {
    const { handlers, renderers, superTemplate } = options || {};
    return (template: HTMLTemplateElement | string) => {
        return prepareTemplate(ensure(template), handlers, renderers, superTemplate);
    };
}

export {
    TemplateBridgeArg,
    TemplateHandler,
    TemplateHandlers,
    TemplateRenderers,
    EvaluateTemplateResult,
    createStampinoTransformer,
    prepareTemplate,
    evaluateTemplate,
};
