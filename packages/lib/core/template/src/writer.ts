import { TemplateTags, TemplateWriter } from './interfaces';
import { Token, globalSettings } from './internal';
import {
    PlainObject,
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
    private _cache: PlainObject = {}

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * Clears all cached templates in this writer.
     */
    clearCache(): void {
        this._cache = {};
    }

    /**
     * Parses and caches the given `template` according to the given `tags` or
     * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
     * that is generated from the parse.
     */
    parse(template: string, tags?: TemplateTags): Token[] {
        const cache = this._cache;
        const delimters = (tags || globalSettings.tags);
        const cacheKey = `${template}:${delimters.join(':')}`;
        let tokens = cache[cacheKey];

        if (null == tokens) {
            tokens = cache[cacheKey] = parseTemplate(template, tags);
        }

        return tokens;
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
    render(template: string, view: PlainObject, partials?: PlainObject, tags?: TemplateTags): string {
        const tokens = this.parse(template, tags);
        const context = (view instanceof Context) ? view : new Context(view);
        return this.renderTokens(tokens, context, partials, template, tags);
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
    renderTokens(tokens: Token[], context: Context, partials?: PlainObject, originalTemplate?: string, tags?: TemplateTags): string {
        let buffer = '';

        for (const token of tokens) {
            const symbol = token[0];
            let value: string | void;

            switch (symbol) {
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
    private renderSection(token: Token, context: Context, partials?: PlainObject, originalTemplate?: string): string | void {
        const self = this;
        let buffer = '';
        let value = context.lookup(token[1]);

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
                buffer += this.renderTokens(token[4] as Token[], context.push(v), partials, originalTemplate);
            }
        } else if ('object' === typeof value || 'string' === typeof value || 'number' === typeof value) {
            buffer += this.renderTokens(token[4] as Token[], context.push(value), partials, originalTemplate);
        } else if (isFunction(value)) {
            if ('string' !== typeof originalTemplate) {
                throw new Error('Cannot use higher-order sections without the original template');
            }
            // Extract the portion of the original template that the section contains.
            value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);
            if (null != value) {
                buffer += value;
            }
        } else {
            buffer += this.renderTokens(token[4] as Token[], context, partials, originalTemplate);
        }
        return buffer;
    }

    /** @internal */
    private renderInverted(token: Token, context: Context, partials?: PlainObject, originalTemplate?: string): string | void {
        const value = context.lookup(token[1]);
        if (!value || (isArray(value) && 0 === value.length)) {
            return this.renderTokens(token[4] as Token[], context, partials, originalTemplate);
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
    private renderPartial(token: Token, context: Context, partials: PlainObject | undefined, tags: TemplateTags | undefined): string | void {
        if (!partials) {
            return;
        }

        const value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
        if (null != value) {
            const lineHasNonSpace = token[6];
            const tagIndex = token[5];
            const indentation = token[4];
            let indentedValue = value;
            if (0 === tagIndex && indentation) {
                indentedValue = this.indentPartial(value, indentation as string, lineHasNonSpace as boolean);
            }
            return this.renderTokens(this.parse(indentedValue, tags), context, partials, indentedValue);
        }
    }

    /** @internal */
    private unescapedValue(token: Token, context: Context): string | void {
        const value = context.lookup(token[1]);
        if (null != value) {
            return value;
        }
    }

    /** @internal */
    private escapedValue(token: Token, context: Context): string | void {
        const value = context.lookup(token[1]);
        if (null != value) {
            return globalSettings.escape(value);
        }
    }

    /** @internal */
    private rawValue(token: Token): string {
        return token[1];
    }
}
