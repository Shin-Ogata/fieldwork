import {
    Part,
    TemplateResult,
    SVGTemplateResult,
} from '@cdp/extension-template';

export type TemplateTag = (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult | SVGTemplateResult;
export type UnsafeHTMLDirective = (value: unknown) => (part: Part) => void;
export type TemplateTransformer = (mustache: string) => (view?: Record<string, unknown>) => TemplateResult | SVGTemplateResult;

export type TransformTester = (input: string, config: TransformConfig) => boolean;
export type TransformExecutor = (input: string, config: TransformConfig) => TemplateResult | SVGTemplateResult | undefined;
export type TransformeContext = { test: TransformTester; transform: TransformExecutor; };

export interface TransformConfig {
    html: TemplateTag;
    transformVariable: TransformExecutor;
    delimiter?: { start: string; end: string; };
    transformers?: Record<string, TransformeContext>;
}
