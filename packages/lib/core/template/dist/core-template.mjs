/*!
 * @cdp/core-template 0.9.6
 *   template engine
 */

import { escapeHTML, ensureObject, getGlobalNamespace, isArray, isPrimitive, has, isFunction, isString } from '@cdp/core-utils';

/** @internal */
const globalSettings = {
    tags: ['{{', '}}'],
    escape: escapeHTML,
};

/**
 * @en Build cache key.
 * @ja キャッシュキーの生成
 *
 * @internal
 */
function buildCacheKey(template, tags) {
    return `${template}:${tags.join(':')}`;
}
/**
 * @en Clears all cached templates in cache pool.
 * @ja すべてのテンプレートキャッシュを破棄
 *
 * @internal
 */
function clearCache() {
    const namespace = getGlobalNamespace("CDP_DECLARE" /* NAMESPACE */);
    namespace["TEMPLATE_CACHE" /* ROOT */] = {};
}
/** @internal global cache pool */
const cache = ensureObject(null, "CDP_DECLARE" /* NAMESPACE */, "TEMPLATE_CACHE" /* ROOT */);

/**
 * More correct typeof string handling array
 * which normally returns typeof 'object'
 */
function typeString(src) {
    return isArray(src) ? 'array' : typeof src;
}
/**
 * Escape for template's expression charactors.
 */
function escapeTemplateExp(src) {
    // eslint-disable-next-line
    return src.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
}
/**
 * Safe way of detecting whether or not the given thing is a primitive and
 * whether it has the given property
 */
function primitiveHasOwnProperty(src, propName) {
    return isPrimitive(src) && Object.prototype.hasOwnProperty.call(src, propName);
}
/**
 * Check whitespace charactor exists.
 */
function isWhitespace(src) {
    return !/\S/.test(src);
}

/**
 * A simple string scanner that is used by the template parser to find
 * tokens in template strings.
 */
class Scanner {
    /**
     * constructor
     */
    constructor(src) {
        this._source = this._tail = src;
        this._pos = 0;
    }
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /**
     * Returns current scanning position.
     */
    get pos() {
        return this._pos;
    }
    /**
     * Returns string  source.
     */
    get source() {
        return this._source;
    }
    /**
     * Returns `true` if the tail is empty (end of string).
     */
    get eos() {
        return '' === this._tail;
    }
    /**
     * Tries to match the given regular expression at the current position.
     * Returns the matched text if it can match, the empty string otherwise.
     */
    scan(regexp) {
        const match = regexp.exec(this._tail);
        if (!match || 0 !== match.index) {
            return '';
        }
        const string = match[0];
        this._tail = this._tail.substring(string.length);
        this._pos += string.length;
        return string;
    }
    /**
     * Skips all text until the given regular expression can be matched. Returns
     * the skipped string, which is the entire tail if no match can be made.
     */
    scanUntil(regexp) {
        const index = this._tail.search(regexp);
        let match;
        switch (index) {
            case -1:
                match = this._tail;
                this._tail = '';
                break;
            case 0:
                match = '';
                break;
            default:
                match = this._tail.substring(0, index);
                this._tail = this._tail.substring(index);
        }
        this._pos += match.length;
        return match;
    }
}

/**
 * Represents a rendering context by wrapping a view object and
 * maintaining a reference to the parent context.
 */
class Context {
    /** constructor */
    constructor(view, parentContext) {
        this._view = view;
        this._cache = { '.': this._view };
        this._parent = parentContext;
    }
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /**
     * View parameter getter.
     */
    get view() {
        return this._view;
    }
    /**
     * Creates a new context using the given view with this context
     * as the parent.
     */
    push(view) {
        return new Context(view, this);
    }
    /**
     * Returns the value of the given name in this context, traversing
     * up the context hierarchy if the value is absent in this context's view.
     */
    lookup(name) {
        const cache = this._cache;
        let value;
        if (Object.prototype.hasOwnProperty.call(cache, name)) {
            value = cache[name];
        }
        else {
            let context = this; // eslint-disable-line @typescript-eslint/no-this-alias
            let intermediateValue;
            let names;
            let index;
            let lookupHit = false;
            while (context) {
                if (0 < name.indexOf('.')) {
                    intermediateValue = context._view;
                    names = name.split('.');
                    index = 0;
                    /**
                     * Using the dot notion path in `name`, we descend through the
                     * nested objects.
                     *
                     * To be certain that the lookup has been successful, we have to
                     * check if the last object in the path actually has the property
                     * we are looking for. We store the result in `lookupHit`.
                     *
                     * This is specially necessary for when the value has been set to
                     * `undefined` and we want to avoid looking up parent contexts.
                     *
                     * In the case where dot notation is used, we consider the lookup
                     * to be successful even if the last "object" in the path is
                     * not actually an object but a primitive (e.g., a string, or an
                     * integer), because it is sometimes useful to access a property
                     * of an autoboxed primitive, such as the length of a string.
                     **/
                    while (null != intermediateValue && index < names.length) {
                        if (index === names.length - 1) {
                            lookupHit = (has(intermediateValue, names[index]) ||
                                primitiveHasOwnProperty(intermediateValue, names[index]));
                        }
                        intermediateValue = intermediateValue[names[index++]];
                    }
                }
                else {
                    intermediateValue = context._view[name];
                    /**
                     * Only checking against `hasProperty`, which always returns `false` if
                     * `context.view` is not an object. Deliberately omitting the check
                     * against `primitiveHasOwnProperty` if dot notation is not used.
                     *
                     * Consider this example:
                     * ```
                     * Mustache.render("The length of a football field is {{#length}}{{length}}{{/length}}.", {length: "100 yards"})
                     * ```
                     *
                     * If we were to check also against `primitiveHasOwnProperty`, as we do
                     * in the dot notation case, then render call would return:
                     *
                     * "The length of a football field is 9."
                     *
                     * rather than the expected:
                     *
                     * "The length of a football field is 100 yards."
                     **/
                    lookupHit = has(context._view, name);
                }
                if (lookupHit) {
                    value = intermediateValue;
                    break;
                }
                context = context._parent;
            }
            cache[name] = value;
        }
        if (isFunction(value)) {
            value = value.call(this._view);
        }
        return value;
    }
}

/** @internal */
const _regexp = {
    white: /\s*/,
    space: /\s+/,
    equals: /\s*=/,
    curly: /\s*\}/,
    tag: /#|\^|\/|>|\{|&|=|!/,
};
/**
 * @internal
 * Combines the values of consecutive text tokens in the given `tokens` array to a single token.
 */
function squashTokens(tokens) {
    const squashedTokens = [];
    let lastToken;
    for (const token of tokens) {
        if (token) {
            if ('text' === token[0 /* TYPE */] && lastToken && 'text' === lastToken[0 /* TYPE */]) {
                lastToken[1 /* VALUE */] += token[1 /* VALUE */];
                lastToken[3 /* END */] = token[3 /* END */];
            }
            else {
                squashedTokens.push(token);
                lastToken = token;
            }
        }
    }
    return squashedTokens;
}
/**
 * @internal
 * Forms the given array of `tokens` into a nested tree structure where
 * tokens that represent a section have two additional items: 1) an array of
 * all tokens that appear in that section and 2) the index in the original
 * template that represents the end of that section.
 */
function nestTokens(tokens) {
    const nestedTokens = [];
    let collector = nestedTokens;
    const sections = [];
    let section;
    for (const token of tokens) {
        switch (token[0 /* TYPE */]) {
            case '#':
            case '^':
                collector.push(token);
                sections.push(token);
                collector = token[4 /* TOKEN_LIST */] = [];
                break;
            case '/':
                section = sections.pop();
                section[5 /* TAG_INDEX */] = token[2 /* START */];
                collector = sections.length > 0 ? sections[sections.length - 1][4 /* TOKEN_LIST */] : nestedTokens;
                break;
            default:
                collector.push(token);
                break;
        }
    }
    return nestedTokens;
}
/**
 * Breaks up the given `template` string into a tree of tokens. If the `tags`
 * argument is given here it must be an array with two string values: the
 * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
 * course, the default is to use mustaches (i.e. mustache.tags).
 *
 * A token is an array with at least 4 elements. The first element is the
 * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
 * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
 * all text that appears outside a symbol this element is "text".
 *
 * The second element of a token is its "value". For mustache tags this is
 * whatever else was inside the tag besides the opening symbol. For text tokens
 * this is the text itself.
 *
 * The third and fourth elements of the token are the start and end indices,
 * respectively, of the token in the original template.
 *
 * Tokens that are the root node of a subtree contain two more elements: 1) an
 * array of tokens in the subtree and 2) the index in the original template at
 * which the closing tag for that section begins.
 *
 * Tokens for partials also contain two more elements: 1) a string value of
 * indendation prior to that tag and 2) the index of that tag on that line -
 * eg a value of 2 indicates the partial is the third tag on this line.
 *
 * @param template template string
 * @param tags delimiters ex) ['{{','}}'] or '{{ }}'
 */
function parseTemplate(template, tags) {
    if (!template) {
        return [];
    }
    let lineHasNonSpace = false;
    const sections = []; // Stack to hold section tokens
    const tokens = []; // Buffer to hold the tokens
    const spaces = []; // Indices of whitespace tokens on the current line
    let hasTag = false; // Is there a {{tag}} on the current line?
    let nonSpace = false; // Is there a non-space char on the current line?
    let indentation = ''; // Tracks indentation for tags that use it
    let tagIndex = 0; // Stores a count of number of tags encountered on a line
    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    const stripSpace = () => {
        if (hasTag && !nonSpace) {
            while (spaces.length) {
                delete tokens[spaces.pop()];
            }
        }
        else {
            spaces.length = 0;
        }
        hasTag = false;
        nonSpace = false;
    };
    const compileTags = (tagsToCompile) => {
        if (isString(tagsToCompile)) {
            tagsToCompile = tagsToCompile.split(_regexp.space, 2);
        }
        if (!isArray(tagsToCompile) || 2 !== tagsToCompile.length) {
            throw new Error(`Invalid tags: ${JSON.stringify(tagsToCompile)}`);
        }
        return {
            openingTag: new RegExp(`${escapeTemplateExp(tagsToCompile[0 /* OPEN */])}\\s*`),
            closingTag: new RegExp(`\\s*${escapeTemplateExp(tagsToCompile[1 /* CLOSE */])}`),
            closingCurly: new RegExp(`\\s*${escapeTemplateExp(`}${tagsToCompile[1 /* CLOSE */]}`)}`),
        };
    };
    const { tag: reTag, white: reWhite, equals: reEquals, curly: reCurly } = _regexp;
    let _regxpTags = compileTags(tags || globalSettings.tags);
    const scanner = new Scanner(template);
    let openSection;
    while (!scanner.eos) {
        const { openingTag: reOpeningTag, closingTag: reClosingTag, closingCurly: reClosingCurly } = _regxpTags;
        let token;
        let start = scanner.pos;
        // Match any text between tags.
        let value = scanner.scanUntil(reOpeningTag);
        if (value) {
            for (let i = 0, valueLength = value.length; i < valueLength; ++i) {
                const chr = value.charAt(i);
                if (isWhitespace(chr)) {
                    spaces.push(tokens.length);
                    indentation += chr;
                }
                else {
                    nonSpace = true;
                    lineHasNonSpace = true;
                    indentation += ' ';
                }
                tokens.push(['text', chr, start, start + 1]);
                start += 1;
                // Check for whitespace on the current line.
                if ('\n' === chr) {
                    stripSpace();
                    indentation = '';
                    tagIndex = 0;
                    lineHasNonSpace = false;
                }
            }
        }
        // Match the opening tag.
        if (!scanner.scan(reOpeningTag)) {
            break;
        }
        hasTag = true;
        // Get the tag type.
        let type = scanner.scan(reTag) || 'name';
        scanner.scan(reWhite);
        // Get the tag value.
        if ('=' === type) {
            value = scanner.scanUntil(reEquals);
            scanner.scan(reEquals);
            scanner.scanUntil(reClosingTag);
        }
        else if ('{' === type) {
            value = scanner.scanUntil(reClosingCurly);
            scanner.scan(reCurly);
            scanner.scanUntil(reClosingTag);
            type = '&';
        }
        else {
            value = scanner.scanUntil(reClosingTag);
        }
        // Match the closing tag.
        if (!scanner.scan(reClosingTag)) {
            throw new Error(`Unclosed tag at ${scanner.pos}`);
        }
        if ('>' === type) {
            token = [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace];
        }
        else {
            token = [type, value, start, scanner.pos];
        }
        tagIndex++;
        tokens.push(token);
        if ('#' === type || '^' === type) {
            sections.push(token);
        }
        else if ('/' === type) {
            // Check section nesting.
            openSection = sections.pop();
            if (!openSection) {
                throw new Error(`Unopened section "${value}" at ${start}`);
            }
            if (openSection[1] !== value) {
                throw new Error(`Unclosed section "${openSection[1 /* VALUE */]}" at ${start}`);
            }
        }
        else if ('name' === type || '{' === type || '&' === type) {
            nonSpace = true;
        }
        else if ('=' === type) {
            // Set the tags for the next time around.
            _regxpTags = compileTags(value);
        }
    }
    stripSpace();
    // Make sure there are no open sections when we're done.
    openSection = sections.pop();
    if (openSection) {
        throw new Error(`Unclosed section "${openSection[1 /* VALUE */]}" at ${scanner.pos}`);
    }
    return nestTokens(squashTokens(tokens));
}

/**
 * A Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
class Writer {
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /**
     * Parses and caches the given `template` according to the given `tags` or
     * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
     * that is generated from the parse.
     */
    parse(template, tags) {
        const cacheKey = buildCacheKey(template, tags || globalSettings.tags);
        let tokens = cache[cacheKey];
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
    render(template, view, partials, tags) {
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
    renderTokens(tokens, view, partials, originalTemplate, tags) {
        const context = (view instanceof Context) ? view : new Context(view);
        let buffer = '';
        for (const token of tokens) {
            let value;
            switch (token[0 /* TYPE */]) {
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
    renderSection(token, context, partials, originalTemplate) {
        const self = this;
        let buffer = '';
        let value = context.lookup(token[1 /* VALUE */]);
        // This function is used to render an arbitrary template
        // in the current context by higher-order sections.
        const subRender = (template) => {
            return self.render(template, context, partials);
        };
        if (!value) {
            return;
        }
        if (isArray(value)) {
            for (const v of value) {
                buffer += this.renderTokens(token[4 /* TOKEN_LIST */], context.push(v), partials, originalTemplate);
            }
        }
        else if ('object' === typeof value || 'string' === typeof value || 'number' === typeof value) {
            buffer += this.renderTokens(token[4 /* TOKEN_LIST */], context.push(value), partials, originalTemplate);
        }
        else if (isFunction(value)) {
            if ('string' !== typeof originalTemplate) {
                throw new Error('Cannot use higher-order sections without the original template');
            }
            // Extract the portion of the original template that the section contains.
            value = value.call(context.view, originalTemplate.slice(token[3 /* END */], token[5 /* TAG_INDEX */]), subRender);
            if (null != value) {
                buffer += value;
            }
        }
        else {
            buffer += this.renderTokens(token[4 /* TOKEN_LIST */], context, partials, originalTemplate);
        }
        return buffer;
    }
    /** @internal */
    renderInverted(token, context, partials, originalTemplate) {
        const value = context.lookup(token[1 /* VALUE */]);
        if (!value || (isArray(value) && 0 === value.length)) {
            return this.renderTokens(token[4 /* TOKEN_LIST */], context, partials, originalTemplate);
        }
    }
    /** @internal */
    indentPartial(partial, indentation, lineHasNonSpace) {
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
    renderPartial(token, context, partials, tags) {
        if (!partials) {
            return;
        }
        const value = isFunction(partials) ? partials(token[1 /* VALUE */]) : partials[token[1 /* VALUE */]];
        if (null != value) {
            const lineHasNonSpace = token[6 /* HAS_NO_SPACE */];
            const tagIndex = token[5 /* TAG_INDEX */];
            const indentation = token[4 /* TOKEN_LIST */];
            let indentedValue = value;
            if (0 === tagIndex && indentation) {
                indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
            }
            const { tokens } = this.parse(indentedValue, tags);
            return this.renderTokens(tokens, context, partials, indentedValue);
        }
    }
    /** @internal */
    unescapedValue(token, context) {
        const value = context.lookup(token[1 /* VALUE */]);
        if (null != value) {
            return value;
        }
    }
    /** @internal */
    escapedValue(token, context) {
        const value = context.lookup(token[1 /* VALUE */]);
        if (null != value) {
            return globalSettings.escape(value);
        }
    }
    /** @internal */
    rawValue(token) {
        return token[1 /* VALUE */];
    }
}

/** [[TemplateEngine]] common settings */
globalSettings.writer = new Writer();
/**
 * @en TemplateEngine utility class.
 * @ja TemplateEngine ユーティリティクラス
 */
class TemplateEngine {
    ///////////////////////////////////////////////////////////////////////
    // public static methods:
    /**
     * @en Get [[JST]] from template source.
     * @ja テンプレート文字列から [[JST]] を取得
     *
     * @param template
     *  - `en` template source string
     *  - `ja` テンプレート文字列
     * @param options
     *  - `en` compile options
     *  - `ja` コンパイルオプション
     */
    static compile(template, options) {
        if (!isString(template)) {
            throw new TypeError(`Invalid template! the first argument should be a "string" but "${typeString(template)}" was given for TemplateEngine.compile(template, options)`);
        }
        const { tags } = options || globalSettings;
        const { writer } = globalSettings;
        const jst = (view, partials) => {
            return writer.render(template, view || {}, partials, tags);
        };
        const { tokens, cacheKey } = writer.parse(template, tags);
        jst.tokens = tokens;
        jst.cacheKey = cacheKey;
        jst.cacheLocation = ["CDP_DECLARE" /* NAMESPACE */, "TEMPLATE_CACHE" /* ROOT */];
        return jst;
    }
    /**
     * @en Clears all cached templates in the default [[TemplateWriter]].
     * @ja 既定の [[TemplateWriter]] のすべてのキャッシュを削除
     */
    static clearCache() {
        clearCache();
    }
    /**
     * @en Change [[TemplateEngine]] global settings.
     * @ja [[TemplateEngine]] グローバル設定の更新
     *
     * @param settings
     *  - `en` new settings
     *  - `ja` 新しい設定値
     * @returns
     *  - `en` old settings
     *  - `ja` 古い設定値
     */
    static setGlobalSettings(setiings) {
        const oldSettings = { ...globalSettings };
        const { writer, tags, escape } = setiings;
        writer && (globalSettings.writer = writer);
        tags && (globalSettings.tags = tags);
        escape && (globalSettings.escape = escape);
        return oldSettings;
    }
    ///////////////////////////////////////////////////////////////////////
    // public static methods: for debug
    /** @internal Create [[TemplateScanner]] instance */
    static createScanner(src) {
        return new Scanner(src);
    }
    /** @internal Create [[TemplateContext]] instance */
    static createContext(view, parentContext) {
        return new Context(view, parentContext);
    }
    /** @internal Create [[TemplateWriter]] instance */
    static createWriter() {
        return new Writer();
    }
}

export { TemplateEngine };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS10ZW1wbGF0ZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY2FjaGUudHMiLCJ1dGlscy50cyIsInNjYW5uZXIudHMiLCJjb250ZXh0LnRzIiwicGFyc2UudHMiLCJ3cml0ZXIudHMiLCJjbGFzcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2NhcGVIVE1MIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIChzdHJpbmcgfCBUb2tlbltdKSAqL1xuZXhwb3J0IHR5cGUgVG9rZW5MaXN0ID0gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUVuZ2luZV1dIHRva2VuIHN0cnVjdHVyZS5cbiAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0gdG9rZW4g5Z6LXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gW3N0cmluZywgc3RyaW5nLCBudW1iZXIsIG51bWJlciwgVG9rZW5MaXN0PywgbnVtYmVyPywgYm9vbGVhbj9dO1xuXG4vKipcbiAqIEBlbiBbW1Rva2VuXV0gYWRkcmVzcyBpZC5cbiAqIEBqYSBbW1Rva2VuXV0g44Ki44OJ44Os44K56K2Y5Yil5a2QXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFRva2VuQWRkcmVzcyB7XG4gICAgVFlQRSA9IDAsXG4gICAgVkFMVUUsXG4gICAgU1RBUlQsXG4gICAgRU5ELFxuICAgIFRPS0VOX0xJU1QsXG4gICAgVEFHX0lOREVYLFxuICAgIEhBU19OT19TUEFDRSxcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgZGVsaW1pdGVycyBkZWZpbml0aW9uIGZvciBbW1RlbXBsYXRlRW5naW5lXV0uIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKiBAamEgW1tUZW1wbGF0ZUVuZ2luZV1dIOOBruWGhemDqOOBp+S9v+eUqOOBmeOCi+WMuuWIh+OCiuaWh+WtlyBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICovXG5leHBvcnQgdHlwZSBEZWxpbWl0ZXJzID0gc3RyaW5nIHwgVGVtcGxhdGVEZWxpbWl0ZXJzO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZ2xvYmFsU2V0dGluZ3MgPSB7XG4gICAgdGFnczogWyd7eycsICd9fSddLFxuICAgIGVzY2FwZTogZXNjYXBlSFRNTCxcbn0gYXMge1xuICAgIHRhZ3M6IFRlbXBsYXRlRGVsaW1pdGVycztcbiAgICBlc2NhcGU6IFRlbXBsYXRlRXNjYXBlcjtcbiAgICB3cml0ZXI6IFRlbXBsYXRlV3JpdGVyO1xufTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgZW5zdXJlT2JqZWN0LFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFRlbXBsYXRlRGVsaW1pdGVycyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIENhY2hlIGxvY2F0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIOOCreODo+ODg+OCt+ODpeODreOCseODvOOCt+ODp+ODs+aDheWgsVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYWNoZUxvY2F0aW9uIHtcbiAgICBOQU1FU1BBQ0UgPSAnQ0RQX0RFQ0xBUkUnLFxuICAgIFJPT1QgICAgICA9ICdURU1QTEFURV9DQUNIRScsXG59XG5cbi8qKlxuICogQGVuIEJ1aWxkIGNhY2hlIGtleS5cbiAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjgq3jg7zjga7nlJ/miJBcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGU6IHN0cmluZywgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGVtcGxhdGV9OiR7dGFncy5qb2luKCc6Jyl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIGNhY2hlIHBvb2wuXG4gKiBAamEg44GZ44G544Gm44Gu44OG44Oz44OX44Os44O844OI44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGdldEdsb2JhbE5hbWVzcGFjZShDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSk7XG4gICAgbmFtZXNwYWNlW0NhY2hlTG9jYXRpb24uUk9PVF0gPSB7fTtcbn1cblxuLyoqIEBpbnRlcm5hbCBnbG9iYWwgY2FjaGUgcG9vbCAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZW5zdXJlT2JqZWN0PFBsYWluT2JqZWN0PihudWxsLCBDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSwgQ2FjaGVMb2NhdGlvbi5ST09UKTtcbiIsImltcG9ydCB7IGlzQXJyYXksIGlzUHJpbWl0aXZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmV4cG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhcyxcbiAgICBlc2NhcGVIVE1MLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKipcbiAqIE1vcmUgY29ycmVjdCB0eXBlb2Ygc3RyaW5nIGhhbmRsaW5nIGFycmF5XG4gKiB3aGljaCBub3JtYWxseSByZXR1cm5zIHR5cGVvZiAnb2JqZWN0J1xuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVN0cmluZyhzcmM6IHVua25vd24pOiBzdHJpbmcge1xuICAgIHJldHVybiBpc0FycmF5KHNyYykgPyAnYXJyYXknIDogdHlwZW9mIHNyYztcbn1cblxuLyoqXG4gKiBFc2NhcGUgZm9yIHRlbXBsYXRlJ3MgZXhwcmVzc2lvbiBjaGFyYWN0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlVGVtcGxhdGVFeHAoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvWy1cXFtcXF17fSgpKis/LixcXFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG59XG5cbi8qKlxuICogU2FmZSB3YXkgb2YgZGV0ZWN0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiB0aGluZyBpcyBhIHByaW1pdGl2ZSBhbmRcbiAqIHdoZXRoZXIgaXQgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzUHJpbWl0aXZlKHNyYykgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNyYywgcHJvcE5hbWUpO1xufVxuXG4vKipcbiAqIENoZWNrIHdoaXRlc3BhY2UgY2hhcmFjdG9yIGV4aXN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2hpdGVzcGFjZShzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhL1xcUy8udGVzdChzcmMpO1xufVxuIiwiaW1wb3J0IHsgVGVtcGxhdGVTY2FubmVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBBIHNpbXBsZSBzdHJpbmcgc2Nhbm5lciB0aGF0IGlzIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHBhcnNlciB0byBmaW5kXG4gKiB0b2tlbnMgaW4gdGVtcGxhdGUgc3RyaW5ncy5cbiAqL1xuZXhwb3J0IGNsYXNzIFNjYW5uZXIgaW1wbGVtZW50cyBUZW1wbGF0ZVNjYW5uZXIge1xuICAgIHByaXZhdGUgX3NvdXJjZTogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RhaWw6IHN0cmluZztcbiAgICBwcml2YXRlIF9wb3M6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gdGhpcy5fdGFpbCA9IHNyYztcbiAgICAgICAgdGhpcy5fcG9zID0gMDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgY3VycmVudCBzY2FubmluZyBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBzdHJpbmcgIHNvdXJjZS5cbiAgICAgKi9cbiAgICBnZXQgc291cmNlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHRhaWwgaXMgZW1wdHkgKGVuZCBvZiBzdHJpbmcpLlxuICAgICAqL1xuICAgIGdldCBlb3MoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAnJyA9PT0gdGhpcy5fdGFpbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBtYXRjaCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGF0IHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAqIFJldHVybnMgdGhlIG1hdGNoZWQgdGV4dCBpZiBpdCBjYW4gbWF0Y2gsIHRoZSBlbXB0eSBzdHJpbmcgb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNjYW4ocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBtYXRjaCA9IHJlZ2V4cC5leGVjKHRoaXMuX3RhaWwpO1xuXG4gICAgICAgIGlmICghbWF0Y2ggfHwgMCAhPT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmluZyA9IG1hdGNoWzBdO1xuXG4gICAgICAgIHRoaXMuX3RhaWwgPSB0aGlzLl90YWlsLnN1YnN0cmluZyhzdHJpbmcubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fcG9zICs9IHN0cmluZy5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTa2lwcyBhbGwgdGV4dCB1bnRpbCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGNhbiBiZSBtYXRjaGVkLiBSZXR1cm5zXG4gICAgICogdGhlIHNraXBwZWQgc3RyaW5nLCB3aGljaCBpcyB0aGUgZW50aXJlIHRhaWwgaWYgbm8gbWF0Y2ggY2FuIGJlIG1hZGUuXG4gICAgICovXG4gICAgc2NhblVudGlsKHJlZ2V4cDogUmVnRXhwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLl90YWlsLnNlYXJjaChyZWdleHApO1xuICAgICAgICBsZXQgbWF0Y2g6IHN0cmluZztcblxuICAgICAgICBzd2l0Y2ggKGluZGV4KSB7XG4gICAgICAgICAgICBjYXNlIC0xOlxuICAgICAgICAgICAgICAgIG1hdGNoID0gdGhpcy5fdGFpbDtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BvcyArPSBtYXRjaC5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFRlbXBsYXRlQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5LFxufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIGNvbnRleHQgYnkgd3JhcHBpbmcgYSB2aWV3IG9iamVjdCBhbmRcbiAqIG1haW50YWluaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgY29udGV4dC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQgaW1wbGVtZW50cyBUZW1wbGF0ZUNvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3ZpZXc6IFBsYWluT2JqZWN0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhcmVudD86IENvbnRleHQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2FjaGU6IFBsYWluT2JqZWN0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX3ZpZXcgICA9IHZpZXc7XG4gICAgICAgIHRoaXMuX2NhY2hlICA9IHsgJy4nOiB0aGlzLl92aWV3IH07XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudENvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBWaWV3IHBhcmFtZXRlciBnZXR0ZXIuXG4gICAgICovXG4gICAgZ2V0IHZpZXcoKTogUGxhaW5PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmlldztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICAgKiBhcyB0aGUgcGFyZW50LlxuICAgICAqL1xuICAgIHB1c2godmlldzogUGxhaW5PYmplY3QpOiBDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBnaXZlbiBuYW1lIGluIHRoaXMgY29udGV4dCwgdHJhdmVyc2luZ1xuICAgICAqIHVwIHRoZSBjb250ZXh0IGhpZXJhcmNoeSBpZiB0aGUgdmFsdWUgaXMgYWJzZW50IGluIHRoaXMgY29udGV4dCdzIHZpZXcuXG4gICAgICovXG4gICAgbG9va3VwKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuX2NhY2hlO1xuXG4gICAgICAgIGxldCB2YWx1ZTogdW5rbm93bjtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgbmFtZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FjaGVbbmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgY29udGV4dDogQ29udGV4dCB8IHVuZGVmaW5lZCA9IHRoaXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGxldCBpbnRlcm1lZGlhdGVWYWx1ZTogUGxhaW5PYmplY3Q7XG4gICAgICAgICAgICBsZXQgbmFtZXM6IHN0cmluZ1tdO1xuICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgbG9va3VwSGl0ID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHdoaWxlIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgaWYgKDAgPCBuYW1lLmluZGV4T2YoJy4nKSkge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGNvbnRleHQuX3ZpZXc7XG4gICAgICAgICAgICAgICAgICAgIG5hbWVzID0gbmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIFVzaW5nIHRoZSBkb3Qgbm90aW9uIHBhdGggaW4gYG5hbWVgLCB3ZSBkZXNjZW5kIHRocm91Z2ggdGhlXG4gICAgICAgICAgICAgICAgICAgICAqIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBUbyBiZSBjZXJ0YWluIHRoYXQgdGhlIGxvb2t1cCBoYXMgYmVlbiBzdWNjZXNzZnVsLCB3ZSBoYXZlIHRvXG4gICAgICAgICAgICAgICAgICAgICAqIGNoZWNrIGlmIHRoZSBsYXN0IG9iamVjdCBpbiB0aGUgcGF0aCBhY3R1YWxseSBoYXMgdGhlIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAqIHdlIGFyZSBsb29raW5nIGZvci4gV2Ugc3RvcmUgdGhlIHJlc3VsdCBpbiBgbG9va3VwSGl0YC5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogVGhpcyBpcyBzcGVjaWFsbHkgbmVjZXNzYXJ5IGZvciB3aGVuIHRoZSB2YWx1ZSBoYXMgYmVlbiBzZXQgdG9cbiAgICAgICAgICAgICAgICAgICAgICogYHVuZGVmaW5lZGAgYW5kIHdlIHdhbnQgdG8gYXZvaWQgbG9va2luZyB1cCBwYXJlbnQgY29udGV4dHMuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIEluIHRoZSBjYXNlIHdoZXJlIGRvdCBub3RhdGlvbiBpcyB1c2VkLCB3ZSBjb25zaWRlciB0aGUgbG9va3VwXG4gICAgICAgICAgICAgICAgICAgICAqIHRvIGJlIHN1Y2Nlc3NmdWwgZXZlbiBpZiB0aGUgbGFzdCBcIm9iamVjdFwiIGluIHRoZSBwYXRoIGlzXG4gICAgICAgICAgICAgICAgICAgICAqIG5vdCBhY3R1YWxseSBhbiBvYmplY3QgYnV0IGEgcHJpbWl0aXZlIChlLmcuLCBhIHN0cmluZywgb3IgYW5cbiAgICAgICAgICAgICAgICAgICAgICogaW50ZWdlciksIGJlY2F1c2UgaXQgaXMgc29tZXRpbWVzIHVzZWZ1bCB0byBhY2Nlc3MgYSBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgKiBvZiBhbiBhdXRvYm94ZWQgcHJpbWl0aXZlLCBzdWNoIGFzIHRoZSBsZW5ndGggb2YgYSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICAgICAqKi9cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKG51bGwgIT0gaW50ZXJtZWRpYXRlVmFsdWUgJiYgaW5kZXggPCBuYW1lcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gbmFtZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb2t1cEhpdCA9IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzKGludGVybWVkaWF0ZVZhbHVlLCBuYW1lc1tpbmRleF0pIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5KGludGVybWVkaWF0ZVZhbHVlLCBuYW1lc1tpbmRleF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gaW50ZXJtZWRpYXRlVmFsdWVbbmFtZXNbaW5kZXgrK11dO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBjb250ZXh0Ll92aWV3W25hbWVdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBPbmx5IGNoZWNraW5nIGFnYWluc3QgYGhhc1Byb3BlcnR5YCwgd2hpY2ggYWx3YXlzIHJldHVybnMgYGZhbHNlYCBpZlxuICAgICAgICAgICAgICAgICAgICAgKiBgY29udGV4dC52aWV3YCBpcyBub3QgYW4gb2JqZWN0LiBEZWxpYmVyYXRlbHkgb21pdHRpbmcgdGhlIGNoZWNrXG4gICAgICAgICAgICAgICAgICAgICAqIGFnYWluc3QgYHByaW1pdGl2ZUhhc093blByb3BlcnR5YCBpZiBkb3Qgbm90YXRpb24gaXMgbm90IHVzZWQuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIENvbnNpZGVyIHRoaXMgZXhhbXBsZTpcbiAgICAgICAgICAgICAgICAgICAgICogYGBgXG4gICAgICAgICAgICAgICAgICAgICAqIE11c3RhY2hlLnJlbmRlcihcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyB7eyNsZW5ndGh9fXt7bGVuZ3RofX17ey9sZW5ndGh9fS5cIiwge2xlbmd0aDogXCIxMDAgeWFyZHNcIn0pXG4gICAgICAgICAgICAgICAgICAgICAqIGBgYFxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBJZiB3ZSB3ZXJlIHRvIGNoZWNrIGFsc28gYWdhaW5zdCBgcHJpbWl0aXZlSGFzT3duUHJvcGVydHlgLCBhcyB3ZSBkb1xuICAgICAgICAgICAgICAgICAgICAgKiBpbiB0aGUgZG90IG5vdGF0aW9uIGNhc2UsIHRoZW4gcmVuZGVyIGNhbGwgd291bGQgcmV0dXJuOlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyA5LlwiXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIHJhdGhlciB0aGFuIHRoZSBleHBlY3RlZDpcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMgMTAwIHlhcmRzLlwiXG4gICAgICAgICAgICAgICAgICAgICAqKi9cbiAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gaGFzKGNvbnRleHQuX3ZpZXcsIG5hbWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb29rdXBIaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHQuX3BhcmVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FjaGVbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKHRoaXMuX3ZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgRGVsaW1pdGVycyxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNXaGl0ZXNwYWNlLFxuICAgIGVzY2FwZVRlbXBsYXRlRXhwLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNjYW5uZXIgfSBmcm9tICcuL3NjYW5uZXInO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVnZXhwID0ge1xuICAgIHdoaXRlOiAvXFxzKi8sXG4gICAgc3BhY2U6IC9cXHMrLyxcbiAgICBlcXVhbHM6IC9cXHMqPS8sXG4gICAgY3VybHk6IC9cXHMqXFx9LyxcbiAgICB0YWc6IC8jfFxcXnxcXC98PnxcXHt8Jnw9fCEvLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIENvbWJpbmVzIHRoZSB2YWx1ZXMgb2YgY29uc2VjdXRpdmUgdGV4dCB0b2tlbnMgaW4gdGhlIGdpdmVuIGB0b2tlbnNgIGFycmF5IHRvIGEgc2luZ2xlIHRva2VuLlxuICovXG5mdW5jdGlvbiBzcXVhc2hUb2tlbnModG9rZW5zOiBUb2tlbltdKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgc3F1YXNoZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBsYXN0VG9rZW4hOiBUb2tlbjtcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGlmICgndGV4dCcgPT09IHRva2VuWyQuVFlQRV0gJiYgbGFzdFRva2VuICYmICd0ZXh0JyA9PT0gbGFzdFRva2VuWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5WQUxVRV0gKz0gdG9rZW5bJC5WQUxVRV07XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuWyQuRU5EXSA9IHRva2VuWyQuRU5EXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3F1YXNoZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3F1YXNoZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICogdG9rZW5zIHRoYXQgcmVwcmVzZW50IGEgc2VjdGlvbiBoYXZlIHR3byBhZGRpdGlvbmFsIGl0ZW1zOiAxKSBhbiBhcnJheSBvZlxuICogYWxsIHRva2VucyB0aGF0IGFwcGVhciBpbiB0aGF0IHNlY3Rpb24gYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWxcbiAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAqL1xuZnVuY3Rpb24gbmVzdFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBuZXN0ZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcbiAgICBsZXQgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107XG5cbiAgICBsZXQgc2VjdGlvbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bJC5UT0tFTl9MSVNUXSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpIGFzIFRva2VuO1xuICAgICAgICAgICAgICAgIHNlY3Rpb25bJC5UQUdfSU5ERVhdID0gdG9rZW5bJC5TVEFSVF07XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSA6IG5lc3RlZFRva2VucztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXN0ZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQnJlYWtzIHVwIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHN0cmluZyBpbnRvIGEgdHJlZSBvZiB0b2tlbnMuIElmIHRoZSBgdGFnc2BcbiAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAqIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBPZlxuICogY291cnNlLCB0aGUgZGVmYXVsdCBpcyB0byB1c2UgbXVzdGFjaGVzIChpLmUuIG11c3RhY2hlLnRhZ3MpLlxuICpcbiAqIEEgdG9rZW4gaXMgYW4gYXJyYXkgd2l0aCBhdCBsZWFzdCA0IGVsZW1lbnRzLiBUaGUgZmlyc3QgZWxlbWVudCBpcyB0aGVcbiAqIG11c3RhY2hlIHN5bWJvbCB0aGF0IHdhcyB1c2VkIGluc2lkZSB0aGUgdGFnLCBlLmcuIFwiI1wiIG9yIFwiJlwiLiBJZiB0aGUgdGFnXG4gKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gKiBhbGwgdGV4dCB0aGF0IGFwcGVhcnMgb3V0c2lkZSBhIHN5bWJvbCB0aGlzIGVsZW1lbnQgaXMgXCJ0ZXh0XCIuXG4gKlxuICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICogd2hhdGV2ZXIgZWxzZSB3YXMgaW5zaWRlIHRoZSB0YWcgYmVzaWRlcyB0aGUgb3BlbmluZyBzeW1ib2wuIEZvciB0ZXh0IHRva2Vuc1xuICogdGhpcyBpcyB0aGUgdGV4dCBpdHNlbGYuXG4gKlxuICogVGhlIHRoaXJkIGFuZCBmb3VydGggZWxlbWVudHMgb2YgdGhlIHRva2VuIGFyZSB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2VzLFxuICogcmVzcGVjdGl2ZWx5LCBvZiB0aGUgdG9rZW4gaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLlxuICpcbiAqIFRva2VucyB0aGF0IGFyZSB0aGUgcm9vdCBub2RlIG9mIGEgc3VidHJlZSBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhblxuICogYXJyYXkgb2YgdG9rZW5zIGluIHRoZSBzdWJ0cmVlIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlIGF0XG4gKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gKlxuICogVG9rZW5zIGZvciBwYXJ0aWFscyBhbHNvIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGEgc3RyaW5nIHZhbHVlIG9mXG4gKiBpbmRlbmRhdGlvbiBwcmlvciB0byB0aGF0IHRhZyBhbmQgMikgdGhlIGluZGV4IG9mIHRoYXQgdGFnIG9uIHRoYXQgbGluZSAtXG4gKiBlZyBhIHZhbHVlIG9mIDIgaW5kaWNhdGVzIHRoZSBwYXJ0aWFsIGlzIHRoZSB0aGlyZCB0YWcgb24gdGhpcyBsaW5lLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSBzdHJpbmdcbiAqIEBwYXJhbSB0YWdzIGRlbGltaXRlcnMgZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZywgdGFncz86IERlbGltaXRlcnMpOiBUb2tlbltdIHtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgbGluZUhhc05vblNwYWNlICAgICA9IGZhbHNlO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107ICAgICAgIC8vIFN0YWNrIHRvIGhvbGQgc2VjdGlvbiB0b2tlbnNcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gICA9IFtdOyAgICAgICAvLyBCdWZmZXIgdG8gaG9sZCB0aGUgdG9rZW5zXG4gICAgY29uc3Qgc3BhY2VzOiBudW1iZXJbXSAgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgbGV0IGhhc1RhZyAgICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSB7e3RhZ319IG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IG5vblNwYWNlICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSBub24tc3BhY2UgY2hhciBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBpbmRlbnRhdGlvbiAgICAgICAgID0gJyc7ICAgICAgIC8vIFRyYWNrcyBpbmRlbnRhdGlvbiBmb3IgdGFncyB0aGF0IHVzZSBpdFxuICAgIGxldCB0YWdJbmRleCAgICAgICAgICAgID0gMDsgICAgICAgIC8vIFN0b3JlcyBhIGNvdW50IG9mIG51bWJlciBvZiB0YWdzIGVuY291bnRlcmVkIG9uIGEgbGluZVxuXG4gICAgLy8gU3RyaXBzIGFsbCB3aGl0ZXNwYWNlIHRva2VucyBhcnJheSBmb3IgdGhlIGN1cnJlbnQgbGluZVxuICAgIC8vIGlmIHRoZXJlIHdhcyBhIHt7I3RhZ319IG9uIGl0IGFuZCBvdGhlcndpc2Ugb25seSBzcGFjZS5cbiAgICBjb25zdCBzdHJpcFNwYWNlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoaGFzVGFnICYmICFub25TcGFjZSkge1xuICAgICAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG9rZW5zW3NwYWNlcy5wb3AoKSBhcyBudW1iZXJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BhY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICAgIG5vblNwYWNlID0gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbXBpbGVUYWdzID0gKHRhZ3NUb0NvbXBpbGU6IHN0cmluZyB8IHN0cmluZ1tdKTogeyBvcGVuaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ0N1cmx5OiBSZWdFeHA7IH0gPT4ge1xuICAgICAgICBjb25zdCBlbnVtIFRhZyB7XG4gICAgICAgICAgICBPUEVOID0gMCxcbiAgICAgICAgICAgIENMT1NFLFxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1N0cmluZyh0YWdzVG9Db21waWxlKSkge1xuICAgICAgICAgICAgdGFnc1RvQ29tcGlsZSA9IHRhZ3NUb0NvbXBpbGUuc3BsaXQoX3JlZ2V4cC5zcGFjZSwgMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkodGFnc1RvQ29tcGlsZSkgfHwgMiAhPT0gdGFnc1RvQ29tcGlsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0YWdzOiAke0pTT04uc3RyaW5naWZ5KHRhZ3NUb0NvbXBpbGUpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcGVuaW5nVGFnOiAgIG5ldyBSZWdFeHAoYCR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuT1BFTl0pfVxcXFxzKmApLFxuICAgICAgICAgICAgY2xvc2luZ1RhZzogICBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXSl9YCksXG4gICAgICAgICAgICBjbG9zaW5nQ3VybHk6IG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAoYH0ke3RhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXX1gKX1gKSxcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyB0YWc6IHJlVGFnLCB3aGl0ZTogcmVXaGl0ZSwgZXF1YWxzOiByZUVxdWFscywgY3VybHk6IHJlQ3VybHkgfSA9IF9yZWdleHA7XG4gICAgbGV0IF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuXG4gICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIGxldCBvcGVuU2VjdGlvbjogVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgd2hpbGUgKCFzY2FubmVyLmVvcykge1xuICAgICAgICBjb25zdCB7IG9wZW5pbmdUYWc6IHJlT3BlbmluZ1RhZywgY2xvc2luZ1RhZzogcmVDbG9zaW5nVGFnLCBjbG9zaW5nQ3VybHk6IHJlQ2xvc2luZ0N1cmx5IH0gPSBfcmVneHBUYWdzO1xuICAgICAgICBsZXQgdG9rZW46IFRva2VuO1xuICAgICAgICBsZXQgc3RhcnQgPSBzY2FubmVyLnBvcztcbiAgICAgICAgLy8gTWF0Y2ggYW55IHRleHQgYmV0d2VlbiB0YWdzLlxuICAgICAgICBsZXQgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZU9wZW5pbmdUYWcpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VzLnB1c2godG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9IGNocjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChbJ3RleHQnLCBjaHIsIHN0YXJ0LCBzdGFydCArIDFdKTtcbiAgICAgICAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHdoaXRlc3BhY2Ugb24gdGhlIGN1cnJlbnQgbGluZS5cbiAgICAgICAgICAgICAgICBpZiAoJ1xcbicgPT09IGNocikge1xuICAgICAgICAgICAgICAgICAgICBzdHJpcFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRhZ0luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIG9wZW5pbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZU9wZW5pbmdUYWcpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGhhc1RhZyA9IHRydWU7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdHlwZS5cbiAgICAgICAgbGV0IHR5cGUgPSBzY2FubmVyLnNjYW4ocmVUYWcpIHx8ICduYW1lJztcbiAgICAgICAgc2Nhbm5lci5zY2FuKHJlV2hpdGUpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHZhbHVlLlxuICAgICAgICBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9IGVsc2UgaWYgKCd7JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICAgICAgdHlwZSA9ICcmJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBjbG9zaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVDbG9zaW5nVGFnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCB0YWcgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnPicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3MsIGluZGVudGF0aW9uLCB0YWdJbmRleCwgbGluZUhhc05vblNwYWNlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3NdO1xuICAgICAgICB9XG4gICAgICAgIHRhZ0luZGV4Kys7XG4gICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgICBpZiAoJyMnID09PSB0eXBlIHx8ICdeJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSBpZiAoJy8nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICAgICAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgaWYgKCFvcGVuU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5vcGVuZWQgc2VjdGlvbiBcIiR7dmFsdWV9XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ25hbWUnID09PSB0eXBlIHx8ICd7JyA9PT0gdHlwZSB8fCAnJicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgICAgICBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RyaXBTcGFjZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuXG4gICAgaWYgKG9wZW5TZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdFRva2VucyhzcXVhc2hUb2tlbnModG9rZW5zKSk7XG59XG4iLCJpbXBvcnQgeyBUZW1wbGF0ZURlbGltaXRlcnMsIFRlbXBsYXRlV3JpdGVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgZ2xvYmFsU2V0dGluZ3MsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgY2FjaGUsIGJ1aWxkQ2FjaGVLZXkgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHBhcnNlVGVtcGxhdGUgfSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuXG4vKipcbiAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICogc3RyaW5nLCBnaXZlbiBhIGNvbnRleHQuIEl0IGFsc28gbWFpbnRhaW5zIGEgY2FjaGUgb2YgdGVtcGxhdGVzIHRvXG4gKiBhdm9pZCB0aGUgbmVlZCB0byBwYXJzZSB0aGUgc2FtZSB0ZW1wbGF0ZSB0d2ljZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFdyaXRlciBpbXBsZW1lbnRzIFRlbXBsYXRlV3JpdGVyIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBgdGFnc2Agb3JcbiAgICAgKiBgbXVzdGFjaGUudGFnc2AgaWYgYHRhZ3NgIGlzIG9taXR0ZWQsICBhbmQgcmV0dXJucyB0aGUgYXJyYXkgb2YgdG9rZW5zXG4gICAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAgICovXG4gICAgcGFyc2UodGVtcGxhdGU6IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHsgdG9rZW5zOiBUb2tlbltdOyBjYWNoZUtleTogc3RyaW5nOyB9IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBidWlsZENhY2hlS2V5KHRlbXBsYXRlLCB0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuICAgICAgICBsZXQgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldO1xuICAgICAgICBpZiAobnVsbCA9PSB0b2tlbnMpIHtcbiAgICAgICAgICAgIHRva2VucyA9IGNhY2hlW2NhY2hlS2V5XSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHRva2VucywgY2FjaGVLZXkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIaWdoLWxldmVsIG1ldGhvZCB0aGF0IGlzIHVzZWQgdG8gcmVuZGVyIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHdpdGhcbiAgICAgKiB0aGUgZ2l2ZW4gYHZpZXdgLlxuICAgICAqXG4gICAgICogVGhlIG9wdGlvbmFsIGBwYXJ0aWFsc2AgYXJndW1lbnQgbWF5IGJlIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZVxuICAgICAqIG5hbWVzIGFuZCB0ZW1wbGF0ZXMgb2YgcGFydGlhbHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgdGVtcGxhdGUuIEl0IG1heVxuICAgICAqIGFsc28gYmUgYSBmdW5jdGlvbiB0aGF0IGlzIHVzZWQgdG8gbG9hZCBwYXJ0aWFsIHRlbXBsYXRlcyBvbiB0aGUgZmx5XG4gICAgICogdGhhdCB0YWtlcyBhIHNpbmdsZSBhcmd1bWVudDogdGhlIG5hbWUgb2YgdGhlIHBhcnRpYWwuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgb3B0aW9uYWwgYHRhZ3NgIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3b1xuICAgICAqIHN0cmluZyB2YWx1ZXM6IHRoZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHRhZ3MgdXNlZCBpbiB0aGUgdGVtcGxhdGUgKGUuZy5cbiAgICAgKiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBUaGUgZGVmYXVsdCBpcyB0byBtdXN0YWNoZS50YWdzLlxuICAgICAqL1xuICAgIHJlbmRlcih0ZW1wbGF0ZTogc3RyaW5nLCB2aWV3OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCwgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgdmlldywgcGFydGlhbHMsIHRlbXBsYXRlLCB0YWdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb3ctbGV2ZWwgbWV0aG9kIHRoYXQgcmVuZGVycyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgdXNpbmdcbiAgICAgKiB0aGUgZ2l2ZW4gYGNvbnRleHRgIGFuZCBgcGFydGlhbHNgLlxuICAgICAqXG4gICAgICogTm90ZTogVGhlIGBvcmlnaW5hbFRlbXBsYXRlYCBpcyBvbmx5IGV2ZXIgdXNlZCB0byBleHRyYWN0IHRoZSBwb3J0aW9uXG4gICAgICogb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgd2FzIGNvbnRhaW5lZCBpbiBhIGhpZ2hlci1vcmRlciBzZWN0aW9uLlxuICAgICAqIElmIHRoZSB0ZW1wbGF0ZSBkb2Vzbid0IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMsIHRoaXMgYXJndW1lbnQgbWF5XG4gICAgICogYmUgb21pdHRlZC5cbiAgICAgKi9cbiAgICByZW5kZXJUb2tlbnModG9rZW5zOiBUb2tlbltdLCB2aWV3OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSAodmlldyBpbnN0YW5jZW9mIENvbnRleHQpID8gdmlldyA6IG5ldyBDb250ZXh0KHZpZXcpO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG5cbiAgICAgICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdm9pZDtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJyMnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyU2VjdGlvbih0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlckludmVydGVkKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJz4nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyUGFydGlhbCh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICcmJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnVuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0ZXh0JzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhd1ZhbHVlKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJTZWN0aW9uKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuICAgICAgICBsZXQgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG5cbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHJlbmRlciBhbiBhcmJpdHJhcnkgdGVtcGxhdGVcbiAgICAgICAgLy8gaW4gdGhlIGN1cnJlbnQgY29udGV4dCBieSBoaWdoZXItb3JkZXIgc2VjdGlvbnMuXG4gICAgICAgIGNvbnN0IHN1YlJlbmRlciA9ICh0ZW1wbGF0ZTogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLnJlbmRlcih0ZW1wbGF0ZSwgY29udGV4dCwgcGFydGlhbHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB2IG9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHYpLCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZiB2YWx1ZSB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdudW1iZXInID09PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQucHVzaCh2YWx1ZSBhcyBvYmplY3QpLCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlmICgnc3RyaW5nJyAhPT0gdHlwZW9mIG9yaWdpbmFsVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCB1c2UgaGlnaGVyLW9yZGVyIHNlY3Rpb25zIHdpdGhvdXQgdGhlIG9yaWdpbmFsIHRlbXBsYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFeHRyYWN0IHRoZSBwb3J0aW9uIG9mIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSB0aGF0IHRoZSBzZWN0aW9uIGNvbnRhaW5zLlxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKGNvbnRleHQudmlldywgb3JpZ2luYWxUZW1wbGF0ZS5zbGljZSh0b2tlblskLkVORF0sIHRva2VuWyQuVEFHX0lOREVYXSksIHN1YlJlbmRlcik7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciArPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlckludmVydGVkKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgMCA9PT0gdmFsdWUubGVuZ3RoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgaW5kZW50UGFydGlhbChwYXJ0aWFsOiBzdHJpbmcsIGluZGVudGF0aW9uOiBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZTogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkSW5kZW50YXRpb24gPSBpbmRlbnRhdGlvbi5yZXBsYWNlKC9bXiBcXHRdL2csICcnKTtcbiAgICAgICAgY29uc3QgcGFydGlhbEJ5TmwgPSBwYXJ0aWFsLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0aWFsQnlObC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHBhcnRpYWxCeU5sW2ldLmxlbmd0aCAmJiAoaSA+IDAgfHwgIWxpbmVIYXNOb25TcGFjZSkpIHtcbiAgICAgICAgICAgICAgICBwYXJ0aWFsQnlObFtpXSA9IGZpbHRlcmVkSW5kZW50YXRpb24gKyBwYXJ0aWFsQnlObFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFydGlhbEJ5Tmwuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVyUGFydGlhbCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzOiBQbGFpbk9iamVjdCB8IHVuZGVmaW5lZCwgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGlmICghcGFydGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbHVlID0gaXNGdW5jdGlvbihwYXJ0aWFscykgPyBwYXJ0aWFscyh0b2tlblskLlZBTFVFXSkgOiBwYXJ0aWFsc1t0b2tlblskLlZBTFVFXV07XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lSGFzTm9uU3BhY2UgPSB0b2tlblskLkhBU19OT19TUEFDRV07XG4gICAgICAgICAgICBjb25zdCB0YWdJbmRleCAgICAgICAgPSB0b2tlblskLlRBR19JTkRFWF07XG4gICAgICAgICAgICBjb25zdCBpbmRlbnRhdGlvbiAgICAgPSB0b2tlblskLlRPS0VOX0xJU1RdO1xuICAgICAgICAgICAgbGV0IGluZGVudGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmICgwID09PSB0YWdJbmRleCAmJiBpbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgIGluZGVudGVkVmFsdWUgPSB0aGlzLmluZGVudFBhcnRpYWwodmFsdWUsIGluZGVudGF0aW9uIGFzIHN0cmluZywgbGluZUhhc05vblNwYWNlIGFzIGJvb2xlYW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgeyB0b2tlbnMgfSA9IHRoaXMucGFyc2UoaW5kZW50ZWRWYWx1ZSwgdGFncyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCBjb250ZXh0LCBwYXJ0aWFscywgaW5kZW50ZWRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1bmVzY2FwZWRWYWx1ZSh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgYXMgc3RyaW5nO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZXNjYXBlZFZhbHVlKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnbG9iYWxTZXR0aW5ncy5lc2NhcGUodmFsdWUgYXMgc3RyaW5nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJhd1ZhbHVlKHRva2VuOiBUb2tlbik6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0b2tlblskLlZBTFVFXTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIEpTVCxcbiAgICBUZW1wbGF0ZURlbGltaXRlcnMsXG4gICAgSVRlbXBsYXRlRW5naW5lLFxuICAgIFRlbXBsYXRlU2Nhbm5lcixcbiAgICBUZW1wbGF0ZUNvbnRleHQsXG4gICAgVGVtcGxhdGVXcml0ZXIsXG4gICAgVGVtcGxhdGVFc2NhcGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZ2xvYmFsU2V0dGluZ3MgfSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IENhY2hlTG9jYXRpb24sIGNsZWFyQ2FjaGUgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgdHlwZVN0cmluZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBTY2FubmVyIH0gZnJvbSAnLi9zY2FubmVyJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHsgV3JpdGVyIH0gZnJvbSAnLi93cml0ZXInO1xuXG4vKiogW1tUZW1wbGF0ZUVuZ2luZV1dIGNvbW1vbiBzZXR0aW5ncyAqL1xuZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gbmV3IFdyaXRlcigpO1xuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlRW5naW5lXV0gZ2xvYmFsIHNldHRuZyBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZUVuZ2luZV1dIOOCsOODreODvOODkOODq+ioreWumuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgIHdyaXRlcj86IFRlbXBsYXRlV3JpdGVyO1xuICAgIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnM7XG4gICAgZXNjYXBlPzogVGVtcGxhdGVFc2NhcGVyO1xufVxuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlRW5naW5lXV0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZUVuZ2luZV1dIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnM7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlRW5naW5lIHV0aWxpdHkgY2xhc3MuXG4gKiBAamEgVGVtcGxhdGVFbmdpbmUg44Om44O844OG44Kj44Oq44OG44Kj44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUVuZ2luZSBpbXBsZW1lbnRzIElUZW1wbGF0ZUVuZ2luZSB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbSlNUXV0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSBbW0pTVF1dIOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBzb3VyY2Ugc3RyaW5nXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJdcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMpOiBKU1Qge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHRlbXBsYXRlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCB0ZW1wbGF0ZSEgdGhlIGZpcnN0IGFyZ3VtZW50IHNob3VsZCBiZSBhIFwic3RyaW5nXCIgYnV0IFwiJHt0eXBlU3RyaW5nKHRlbXBsYXRlKX1cIiB3YXMgZ2l2ZW4gZm9yIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUodGVtcGxhdGUsIG9wdGlvbnMpYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRhZ3MgfSA9IG9wdGlvbnMgfHwgZ2xvYmFsU2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IHsgd3JpdGVyIH0gPSBnbG9iYWxTZXR0aW5ncztcblxuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0KTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZXIucmVuZGVyKHRlbXBsYXRlLCB2aWV3IHx8IHt9LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgeyB0b2tlbnMsIGNhY2hlS2V5IH0gPSB3cml0ZXIucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICBqc3QudG9rZW5zICAgICAgICA9IHRva2VucztcbiAgICAgICAganN0LmNhY2hlS2V5ICAgICAgPSBjYWNoZUtleTtcbiAgICAgICAganN0LmNhY2hlTG9jYXRpb24gPSBbQ2FjaGVMb2NhdGlvbi5OQU1FU1BBQ0UsIENhY2hlTG9jYXRpb24uUk9PVF07XG5cbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIHRoZSBkZWZhdWx0IFtbVGVtcGxhdGVXcml0ZXJdXS5cbiAgICAgKiBAamEg5pei5a6a44GuIFtbVGVtcGxhdGVXcml0ZXJdXSDjga7jgZnjgbnjgabjga7jgq3jg6Pjg4Pjgrfjg6XjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGNsZWFyQ2FjaGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlIFtbVGVtcGxhdGVFbmdpbmVdXSBnbG9iYWwgc2V0dGluZ3MuXG4gICAgICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSDjgrDjg63jg7zjg5Djg6voqK3lrprjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZXR0aW5nc1xuICAgICAqICAtIGBlbmAgbmV3IHNldHRpbmdzXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYToqK3lrprlgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNldHRpbmdzXG4gICAgICogIC0gYGphYCDlj6TjgYToqK3lrprlgKRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldEdsb2JhbFNldHRpbmdzKHNldGlpbmdzOiBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzKTogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi5nbG9iYWxTZXR0aW5ncyB9O1xuICAgICAgICBjb25zdCB7IHdyaXRlciwgdGFncywgZXNjYXBlIH0gPSBzZXRpaW5ncztcbiAgICAgICAgd3JpdGVyICYmIChnbG9iYWxTZXR0aW5ncy53cml0ZXIgPSB3cml0ZXIpO1xuICAgICAgICB0YWdzICAgJiYgKGdsb2JhbFNldHRpbmdzLnRhZ3MgICA9IHRhZ3MpO1xuICAgICAgICBlc2NhcGUgJiYgKGdsb2JhbFNldHRpbmdzLmVzY2FwZSA9IGVzY2FwZSk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6IGZvciBkZWJ1Z1xuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUgW1tUZW1wbGF0ZVNjYW5uZXJdXSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlU2Nhbm5lcihzcmM6IHN0cmluZyk6IFRlbXBsYXRlU2Nhbm5lciB7XG4gICAgICAgIHJldHVybiBuZXcgU2Nhbm5lcihzcmMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVDb250ZXh0XV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZUNvbnRleHQodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KTogVGVtcGxhdGVDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHBhcmVudENvbnRleHQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVXcml0ZXJdXSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlV3JpdGVyKCk6IFRlbXBsYXRlV3JpdGVyIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXcml0ZXIoKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQXNDQTtBQUNPLE1BQU0sY0FBYyxHQUFHO0lBQzFCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDbEIsTUFBTSxFQUFFLFVBQVU7Q0FLckI7O0FDNUJEOzs7Ozs7U0FNZ0IsYUFBYSxD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QUFJLE1BQU0sRUFBRSxDQUFDO0FBb0JyQzs7OztNQUlhLGNBQWM7Ozs7Ozs7Ozs7Ozs7O0lBZ0JoQixPQUFPLE9BQU8sQ0FBQyxRQUFnQixFQUFFLE9BQWdDO1FBQ3BFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxrRUFBa0UsVUFBVSxDQUFDLFFBQVEsQ0FBQywyREFBMkQsQ0FBQyxDQUFDO1NBQzFLO1FBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sSUFBSSxjQUFjLENBQUM7UUFDM0MsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLGNBQWMsQ0FBQztRQUVsQyxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQWtCLEVBQUUsUUFBc0I7WUFDbkQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM5RCxDQUFDO1FBRUYsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRCxHQUFHLENBQUMsTUFBTSxHQUFVLE1BQU0sQ0FBQztRQUMzQixHQUFHLENBQUMsUUFBUSxHQUFRLFFBQVEsQ0FBQztRQUM3QixHQUFHLENBQUMsYUFBYSxHQUFHLDREQUE2QyxDQUFDO1FBRWxFLE9BQU8sR0FBRyxDQUFDO0tBQ2Q7Ozs7O0lBTU0sT0FBTyxVQUFVO1FBQ3BCLFVBQVUsRUFBRSxDQUFDO0tBQ2hCOzs7Ozs7Ozs7Ozs7SUFhTSxPQUFPLGlCQUFpQixDQUFDLFFBQWdDO1FBQzVELE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxjQUFjLEVBQUUsQ0FBQztRQUMxQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUM7UUFDMUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDM0MsSUFBSSxLQUFPLGNBQWMsQ0FBQyxJQUFJLEdBQUssSUFBSSxDQUFDLENBQUM7UUFDekMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDM0MsT0FBTyxXQUFXLENBQUM7S0FDdEI7Ozs7SUFNTSxPQUFPLGFBQWEsQ0FBQyxHQUFXO1FBQ25DLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDM0I7O0lBR00sT0FBTyxhQUFhLENBQUMsSUFBaUIsRUFBRSxhQUF1QjtRQUNsRSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztLQUMzQzs7SUFHTSxPQUFPLFlBQVk7UUFDdEIsT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO0tBQ3ZCOzs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvY29yZS10ZW1wbGF0ZS8ifQ==
