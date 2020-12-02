import {
    TemplateTag,
    UnsafeHTMLDirective,
    TemplateTransformer,
} from 'lit-transformer/src/interfaces';

declare const createDefault: (html: TemplateTag, unsafeHTML: UnsafeHTMLDirective) => TemplateTransformer;
export default createDefault;
