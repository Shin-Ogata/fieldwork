import {
    TemplateTag,
    TemplateTransformer,
    TransformDirective,
} from 'lit-transformer/src/interfaces';

declare const createDefault: (html: TemplateTag, unsafeHTML: TransformDirective) => TemplateTransformer;
export default createDefault;
