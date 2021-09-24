import type { TemplateTag, TransformDirective, TemplateTransformer, TransformTester, TransformExecutor, TransformeContext, TransformConfig } from 'lit-transformer/src/interfaces';
declare function createTransformFactory(html: TemplateTag, unsafeHTML: TransformDirective): TemplateTransformer;
declare function createTransformFactory(config: TransformConfig): TemplateTransformer;
declare const transformer: {
    variable: TransformExecutor;
    unsafeVariable: (unsafeHTML: TransformDirective) => TransformeContext;
    section: () => TransformeContext;
    invertedSection: () => TransformeContext;
    comment: () => TransformeContext;
    customDelimiter: () => TransformeContext;
};
export { TemplateTag, TransformDirective, TemplateTransformer, TransformTester, TransformExecutor, TransformeContext, TransformConfig, createTransformFactory, transformer, };
