import type { TemplateTransformer } from '@bridge/interfaces';
import type { TemplateTag, TransformDirective, TransformTester, TransformExecutor, TransformeContext, TransformConfig } from 'lit-transformer/src/interfaces';
declare function createMustacheTransformer(html: TemplateTag, unsafeHTML: TransformDirective): TemplateTransformer;
declare function createMustacheTransformer(config: TransformConfig): TemplateTransformer;
declare const transformer: {
    variable: TransformExecutor;
    unsafeVariable: (unsafeHTML: TransformDirective) => TransformeContext;
    section: () => TransformeContext;
    invertedSection: () => TransformeContext;
    comment: () => TransformeContext;
    customDelimiter: () => TransformeContext;
};
export { TemplateTag, TransformDirective, TemplateTransformer, TransformTester, TransformExecutor, TransformeContext, TransformConfig, createMustacheTransformer, transformer, };
