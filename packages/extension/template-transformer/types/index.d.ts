import type { TemplateTag, UnsafeHTMLDirective, TemplateTransformer, TransformTester, TransformExecutor, TransformeContext, TransformConfig } from 'lit-transformer/src/interfaces';
declare function create(html: TemplateTag, unsafeHTML: UnsafeHTMLDirective): TemplateTransformer;
declare function create(config: TransformConfig): TemplateTransformer;
declare const transformer: {
    variable: TransformExecutor;
    unsafeVariable: (unsafeHTML: UnsafeHTMLDirective) => TransformeContext;
    section: () => TransformeContext;
    invertedSection: () => TransformeContext;
    comment: () => TransformeContext;
    customDelimiter: () => TransformeContext;
};
export { TemplateTag, UnsafeHTMLDirective, TemplateTransformer, TransformTester, TransformExecutor, TransformeContext, TransformConfig, create, transformer, };
