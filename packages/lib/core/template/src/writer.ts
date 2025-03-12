import type {
    TemplateDelimiters,
    TemplateWriter,
    TemplateViewParam,
    TemplatePartialParam,
} from './interfaces';
import {
    type Token,
    TokenAddress as $,
    globalSettings,
} from './internal';
import { cache, buildCacheKey } from './cache';
import {
    type PlainObject,
    isArray,
    isFunction,
} from './utils';
import { parseTemplate } from './parse';
import { Context } from './context';

/**
 * A Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
export class Writer implements TemplateWriter {

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * Parses and caches the given `template` according to the given `tags` or
     * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
     * that is generated from the parse.
     */
    parse(template: string, tags?: TemplateDelimiters): { tokens: Token[]; cacheKey: string; } {
        const cacheKey = buildCacheKey(template, tags ?? globalSettings.tags);
        let tokens = cache[cacheKey] as Token[];
        if (null == tokens) {
            tokens = cache[cacheKey] = parseTemplate(template, tags);
        }
        return { tokens, cacheKey };
    }

    /**
     * High-level method that is used to render the given `template` with
     * the given `view`.
     *
     * The optional `partials` argument may be an object that contains the
     * names and templates of partials that are used in the template. It may
     * also be a function that is used to load partial templates on the fly
     * that takes a single argument: the name of the partial.
     *
     * If the optional `tags` argument is given here it must be an array with two
     * string values: the opening and closing tags used in the template (e.g.
     * [ "<%", "%>" ]). The default is to mustache.tags.
     */
    render(template: string, view: TemplateViewParam, partials?: TemplatePartialParam, tags?: TemplateDelimiters): string {
        const { tokens } = this.parse(template, tags);
        return this.renderTokens(tokens, view, partials, template, tags);
    }

    /**
     * Low-level method that renders the given array of `tokens` using
     * the given `context` and `partials`.
     *
     * Note: The `originalTemplate` is only ever used to extract the portion
     * of the original template that was contained in a higher-order section.
     * If the template doesn't use higher-order sections, this argument may
     * be omitted.
     */
    renderTokens(tokens: Token[], view: TemplateViewParam, partials?: TemplatePartialParam, originalTemplate?: string, tags?: TemplateDelimiters): string {
        const context = (view instanceof Context) ? view : new Context(view as PlainObject);
        let buffer = '';

        for (const token of tokens) {
            let value: string | void | undefined;
            switch (token[$.TYPE]) {
                case '#':
                    value = this.renderSection(token, context, partials, originalTemplate);
                    break;
                case '^':
                    value = this.renderInverted(token, context, partials, originalTemplate);
                    break;
                case '>':
                    value = this.renderPartial(token, context, partials, tags);
                    break;
                case '&':
                    value = this.unescapedValue(token, context);
                    break;
                case 'name':
                    value = this.escapedValue(token, context);
                    break;
                case 'text':
                    value = this.rawValue(token);
                    break;
                default:
                    break;
            }

            if (null != value) {
                buffer += value;
            }
        }

        return buffer;
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /** @internal */
    private renderSection(token: Token, context: Context, partials?: TemplatePartialParam, originalTemplate?: string): string | void {
        const self = this;
        let buffer = '';
        let value = context.lookup(token[$.VALUE]);

        // This function is used to render an arbitrary template
        // in the current context by higher-order sections.
        const subRender = (template: string): string => {
            return self.render(template, context, partials);
        };

        if (!value) {
            return;
        }

        if (isArray(value)) {
            for (const v of value) {
                buffer += this.renderTokens(token[$.TOKEN_LIST] as Token[], context.push(v), partials, originalTemplate);
            }
        } else if ('object' === typeof value || 'string' === typeof value || 'number' === typeof value) {
            buffer += this.renderTokens(token[$.TOKEN_LIST] as Token[], context.push(value as PlainObject), partials, originalTemplate);
        } else if (isFunction(value)) {
            if ('string' !== typeof originalTemplate) {
                throw new Error('Cannot use higher-order sections without the original template');
            }
            // Extract the portion of the original template that the section contains.
            value = value.call(context.view, originalTemplate.slice(token[$.END], token[$.TAG_INDEX]), subRender);
            if (null != value) {
                buffer += value as number;
            }
        } else {
            buffer += this.renderTokens(token[$.TOKEN_LIST] as Token[], context, partials, originalTemplate);
        }
        return buffer;
    }

    /** @internal */
    private renderInverted(token: Token, context: Context, partials?: TemplatePartialParam, originalTemplate?: string): string | void {
        const value = context.lookup(token[$.VALUE]);
        if (!value || (isArray(value) && 0 === value.length)) {
            return this.renderTokens(token[$.TOKEN_LIST] as Token[], context, partials, originalTemplate);
        }
    }

    /** @internal */
    private indentPartial(partial: string, indentation: string, lineHasNonSpace: boolean): string {
        const filteredIndentation = indentation.replace(/[^ \t]/g, '');
        const partialByNl = partial.split('\n');
        for (let i = 0; i < partialByNl.length; i++) {
            if (partialByNl[i].length && (i > 0 || !lineHasNonSpace)) {
                partialByNl[i] = filteredIndentation + partialByNl[i];
            }
        }
        return partialByNl.join('\n');
    }

    /** @internal */
    private renderPartial(token: Token, context: Context, partials: TemplatePartialParam | undefined, tags: TemplateDelimiters | undefined): string | void {
        if (!partials) {
            return;
        }

        const value = (isFunction(partials) ? partials(token[$.VALUE]) : partials[token[$.VALUE]]) as string | undefined;
        if (null != value) {
            const lineHasNonSpace = token[$.HAS_NO_SPACE];
            const tagIndex        = token[$.TAG_INDEX];
            const indentation     = token[$.TOKEN_LIST];
            let indentedValue = value;
            if (0 === tagIndex && indentation) {
                indentedValue = this.indentPartial(value, indentation as string, lineHasNonSpace!);
            }
            const { tokens } = this.parse(indentedValue, tags);
            return this.renderTokens(tokens, context, partials, indentedValue);
        }
    }

    /** @internal */
    private unescapedValue(token: Token, context: Context): string | void {
        const value = context.lookup(token[$.VALUE]);
        if (null != value) {
            return value as string;
        }
    }

    /** @internal */
    private escapedValue(token: Token, context: Context): string | void {
        const value = context.lookup(token[$.VALUE]);
        if (null != value) {
            return globalSettings.escape(value as string);
        }
    }

    /** @internal */
    private rawValue(token: Token): string {
        return token[$.VALUE];
    }
}
