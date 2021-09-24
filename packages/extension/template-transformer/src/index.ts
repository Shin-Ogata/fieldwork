import type {
    TemplateTag,
    TransformDirective,
    TemplateTransformer,
    TransformTester,
    TransformExecutor,
    TransformeContext,
    TransformConfig,
} from 'lit-transformer/src/interfaces';

import createDefault from 'lit-transformer';
import createCustom from 'lit-transformer/src/lit-transformer';

import variable from 'lit-transformer/src/transformers/variableTransformer';
import unsafeVariable from 'lit-transformer/src/transformers/unsafeVariable';
import section from 'lit-transformer/src/transformers/section';
import invertedSection from 'lit-transformer/src/transformers/invertedSection';
import comment from 'lit-transformer/src/transformers/comment';
import customDelimiter from 'lit-transformer/src/transformers/customDelimiter';

function createTransformFactory(html: TemplateTag, unsafeHTML: TransformDirective): TemplateTransformer;
function createTransformFactory(config: TransformConfig): TemplateTransformer;
function createTransformFactory(arg1: unknown, arg2?: unknown): TemplateTransformer {
    if ('function' === typeof arg1) {
        return createDefault(arg1 as TemplateTag, arg2 as TransformDirective);
    } else {
        return createCustom(Object.assign({
            delimiter: { start: '{{', end: '}}' },
            transformers: {},
        }, arg1) as TransformConfig);
    }
}

const transformer: {
    variable: TransformExecutor;
    unsafeVariable: (unsafeHTML: TransformDirective) => TransformeContext;
    section: () => TransformeContext;
    invertedSection: () => TransformeContext;
    comment: () => TransformeContext;
    customDelimiter: () => TransformeContext;
} = {
    variable,
    unsafeVariable,
    section,
    invertedSection,
    comment,
    customDelimiter,
};

export {
    TemplateTag,
    TransformDirective,
    TemplateTransformer,
    TransformTester,
    TransformExecutor,
    TransformeContext,
    TransformConfig,
    createTransformFactory,
    transformer,
};
