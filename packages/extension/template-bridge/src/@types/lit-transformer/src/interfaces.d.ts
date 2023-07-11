import {
    TemplateResult,
    SVGTemplateResult,
    DirectiveResult,
    noChange,
    nothing,
} from '@cdp/extension-template';

export type MustacheTransformer = (mustache: string) => (view?: Record<string, unknown>) => TemplateResult | SVGTemplateResult;
export type TemplateTag = (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult | SVGTemplateResult;

export type TransformDirective = (value: string | typeof noChange | typeof nothing | null | undefined) => DirectiveResult;

export type TransformTester = (input: string, config: TransformConfig) => boolean;
export type TransformExecutor = (input: string, config: TransformConfig) => TemplateResult | SVGTemplateResult | undefined;

export interface TransformeContext {
    test: TransformTester;
    transform: TransformExecutor;
}

export interface TransformConfig {
    html: TemplateTag;
    transformVariable: TransformExecutor;
    delimiter?: { start: string; end: string; };
    transformers?: Record<string, TransformeContext>;
}
