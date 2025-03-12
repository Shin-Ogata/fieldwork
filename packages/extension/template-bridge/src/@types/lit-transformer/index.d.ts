import type {
    MustacheTransformer,
    TemplateTag,
    TransformDirective,
} from 'lit-transformer/src/interfaces';

declare const createDefault: (html: TemplateTag, unsafeHTML: TransformDirective) => MustacheTransformer;
export default createDefault;
