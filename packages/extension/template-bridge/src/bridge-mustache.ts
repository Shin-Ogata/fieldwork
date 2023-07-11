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

/** @internal */
type MustacheTransformerContext = MustacheTransformer & { delimiter: { start: string; end: string; }; };

const xform = (mustache: MustacheTransformerContext): TemplateTransformer => {
    return (template: HTMLTemplateElement | string): TemplateBridgeEndine => {
        const { start, end } = mustache.delimiter;

        // コメントブロック内の delimiter 抽出
        const regCommentRemoveStart = new RegExp(`<!--\\s*${start}`, 'g');
        const regCommentRemoveEnd   = new RegExp(`${end}\\s*-->`, 'g');
        // delimiter 前後の trim 用正規表現
        const regTrim = new RegExp(`(${start}[#^/]?)\\s*([\\w\\.]+)\\s*(${end})`, 'g');

        const body = (template instanceof HTMLTemplateElement ? template.innerHTML : template)
            .replace(regCommentRemoveStart, start)
            .replace(regCommentRemoveEnd, end)
            .replace(regTrim, '$1$2$3')
        ;

        return mustache(body);
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
    const delimiter = { start: '{{', end: '}}' };
    let transformer: MustacheTransformerContext;
    if ('function' === typeof arg1) {
        transformer = createDefault(patch(arg1 as TemplateTag), arg2 as TransformDirective) as MustacheTransformerContext;
        transformer.delimiter = delimiter;
    } else {
        const { html } = arg1 as { html: TemplateTag; };
        const config = Object.assign({
            delimiter,
            transformers: {},
        }, arg1, { html: patch(html) }) as TransformConfig;
        transformer = createCustom(config) as MustacheTransformerContext;
        transformer.delimiter = config.delimiter!;
    }
    return xform(transformer);
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
