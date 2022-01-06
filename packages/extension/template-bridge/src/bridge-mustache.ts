import { toTemplateStringsArray } from '@cdp/extension-template';
import type { TemplateBridgeEndine, TemplateTransformer } from '@bridge/interfaces';
import type {
    MustacheTransformer,
    TemplateTag,
    TransformDirective,
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

const xform = (mustache: MustacheTransformer): TemplateTransformer => {
    return (template: HTMLTemplateElement | string): TemplateBridgeEndine => {
        return mustache(template instanceof HTMLTemplateElement ? template.innerHTML : template);
    };
};

/*
 * lit-html v2.1.0+
 * TemplateStringsArray を厳密にチェックするようになったため patch をあてる
 * https://github.com/lit/lit/pull/2307
 *
 * 将来 `Array.isTemplateObject()` を使用される場合, 本対応も見直す必要あり
 * https://tc39.es/proposal-array-is-template-object/
 */
const patch = (html: TemplateTag): TemplateTag => {
    return (template: TemplateStringsArray, ...values: unknown[]) => {
        return html(toTemplateStringsArray(template), ...values);
    };
};

function createMustacheTransformer(html: TemplateTag, unsafeHTML: TransformDirective): TemplateTransformer;
function createMustacheTransformer(config: TransformConfig): TemplateTransformer;
function createMustacheTransformer(arg1: unknown, arg2?: unknown): TemplateTransformer {
    if ('function' === typeof arg1) {
        return xform(createDefault(patch(arg1 as TemplateTag), arg2 as TransformDirective));
    } else {
        const { html } = arg1 as { html: TemplateTag; };
        return xform(
            createCustom(Object.assign({
                delimiter: { start: '{{', end: '}}' },
                transformers: {},
            }, arg1, { html: patch(html) }) as TransformConfig)
        );
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
    createMustacheTransformer,
    transformer,
};
