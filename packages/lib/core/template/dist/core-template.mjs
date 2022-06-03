/*!
 * @cdp/core-template 0.9.13
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
    const namespace = getGlobalNamespace("CDP_DECLARE" /* CacheLocation.NAMESPACE */);
    namespace["TEMPLATE_CACHE" /* CacheLocation.ROOT */] = {};
}
/** @internal global cache pool */
const cache = ensureObject(null, "CDP_DECLARE" /* CacheLocation.NAMESPACE */, "TEMPLATE_CACHE" /* CacheLocation.ROOT */);

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
    _source;
    _tail;
    _pos;
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
    _view;
    _parent;
    _cache;
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
            if ('text' === token[0 /* $.TYPE */] && lastToken && 'text' === lastToken[0 /* $.TYPE */]) {
                lastToken[1 /* $.VALUE */] += token[1 /* $.VALUE */];
                lastToken[3 /* $.END */] = token[3 /* $.END */];
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
        switch (token[0 /* $.TYPE */]) {
            case '#':
            case '^':
                collector.push(token);
                sections.push(token);
                collector = token[4 /* $.TOKEN_LIST */] = [];
                break;
            case '/':
                section = sections.pop();
                section[5 /* $.TAG_INDEX */] = token[2 /* $.START */];
                collector = sections.length > 0 ? sections[sections.length - 1][4 /* $.TOKEN_LIST */] : nestedTokens;
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
            openingTag: new RegExp(`${escapeTemplateExp(tagsToCompile[0 /* Tag.OPEN */])}\\s*`),
            closingTag: new RegExp(`\\s*${escapeTemplateExp(tagsToCompile[1 /* Tag.CLOSE */])}`),
            closingCurly: new RegExp(`\\s*${escapeTemplateExp(`}${tagsToCompile[1 /* Tag.CLOSE */]}`)}`),
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
                throw new Error(`Unclosed section "${openSection[1 /* $.VALUE */]}" at ${start}`);
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
        throw new Error(`Unclosed section "${openSection[1 /* $.VALUE */]}" at ${scanner.pos}`);
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
            switch (token[0 /* $.TYPE */]) {
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
        let value = context.lookup(token[1 /* $.VALUE */]);
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
                buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context.push(v), partials, originalTemplate);
            }
        }
        else if ('object' === typeof value || 'string' === typeof value || 'number' === typeof value) {
            buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context.push(value), partials, originalTemplate);
        }
        else if (isFunction(value)) {
            if ('string' !== typeof originalTemplate) {
                throw new Error('Cannot use higher-order sections without the original template');
            }
            // Extract the portion of the original template that the section contains.
            value = value.call(context.view, originalTemplate.slice(token[3 /* $.END */], token[5 /* $.TAG_INDEX */]), subRender);
            if (null != value) {
                buffer += value;
            }
        }
        else {
            buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context, partials, originalTemplate);
        }
        return buffer;
    }
    /** @internal */
    renderInverted(token, context, partials, originalTemplate) {
        const value = context.lookup(token[1 /* $.VALUE */]);
        if (!value || (isArray(value) && 0 === value.length)) {
            return this.renderTokens(token[4 /* $.TOKEN_LIST */], context, partials, originalTemplate);
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
        const value = (isFunction(partials) ? partials(token[1 /* $.VALUE */]) : partials[token[1 /* $.VALUE */]]);
        if (null != value) {
            const lineHasNonSpace = token[6 /* $.HAS_NO_SPACE */];
            const tagIndex = token[5 /* $.TAG_INDEX */];
            const indentation = token[4 /* $.TOKEN_LIST */];
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
        const value = context.lookup(token[1 /* $.VALUE */]);
        if (null != value) {
            return value;
        }
    }
    /** @internal */
    escapedValue(token, context) {
        const value = context.lookup(token[1 /* $.VALUE */]);
        if (null != value) {
            return globalSettings.escape(value);
        }
    }
    /** @internal */
    rawValue(token) {
        return token[1 /* $.VALUE */];
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
        jst.cacheLocation = ["CDP_DECLARE" /* CacheLocation.NAMESPACE */, "TEMPLATE_CACHE" /* CacheLocation.ROOT */];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS10ZW1wbGF0ZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY2FjaGUudHMiLCJ1dGlscy50cyIsInNjYW5uZXIudHMiLCJjb250ZXh0LnRzIiwicGFyc2UudHMiLCJ3cml0ZXIudHMiLCJjbGFzcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2NhcGVIVE1MIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIChzdHJpbmcgfCBUb2tlbltdKSAqL1xuZXhwb3J0IHR5cGUgVG9rZW5MaXN0ID0gdW5rbm93bjtcblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUVuZ2luZV1dIHRva2VuIHN0cnVjdHVyZS5cbiAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0gdG9rZW4g5Z6LXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gW3N0cmluZywgc3RyaW5nLCBudW1iZXIsIG51bWJlciwgVG9rZW5MaXN0PywgbnVtYmVyPywgYm9vbGVhbj9dO1xuXG4vKipcbiAqIEBlbiBbW1Rva2VuXV0gYWRkcmVzcyBpZC5cbiAqIEBqYSBbW1Rva2VuXV0g44Ki44OJ44Os44K56K2Y5Yil5a2QXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFRva2VuQWRkcmVzcyB7XG4gICAgVFlQRSA9IDAsXG4gICAgVkFMVUUsXG4gICAgU1RBUlQsXG4gICAgRU5ELFxuICAgIFRPS0VOX0xJU1QsXG4gICAgVEFHX0lOREVYLFxuICAgIEhBU19OT19TUEFDRSxcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgZGVsaW1pdGVycyBkZWZpbml0aW9uIGZvciBbW1RlbXBsYXRlRW5naW5lXV0uIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKiBAamEgW1tUZW1wbGF0ZUVuZ2luZV1dIOOBruWGhemDqOOBp+S9v+eUqOOBmeOCi+WMuuWIh+OCiuaWh+WtlyBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICovXG5leHBvcnQgdHlwZSBEZWxpbWl0ZXJzID0gc3RyaW5nIHwgVGVtcGxhdGVEZWxpbWl0ZXJzO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZ2xvYmFsU2V0dGluZ3MgPSB7XG4gICAgdGFnczogWyd7eycsICd9fSddLFxuICAgIGVzY2FwZTogZXNjYXBlSFRNTCxcbn0gYXMge1xuICAgIHRhZ3M6IFRlbXBsYXRlRGVsaW1pdGVycztcbiAgICBlc2NhcGU6IFRlbXBsYXRlRXNjYXBlcjtcbiAgICB3cml0ZXI6IFRlbXBsYXRlV3JpdGVyO1xufTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgZW5zdXJlT2JqZWN0LFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFRlbXBsYXRlRGVsaW1pdGVycyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIENhY2hlIGxvY2F0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIOOCreODo+ODg+OCt+ODpeODreOCseODvOOCt+ODp+ODs+aDheWgsVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYWNoZUxvY2F0aW9uIHtcbiAgICBOQU1FU1BBQ0UgPSAnQ0RQX0RFQ0xBUkUnLFxuICAgIFJPT1QgICAgICA9ICdURU1QTEFURV9DQUNIRScsXG59XG5cbi8qKlxuICogQGVuIEJ1aWxkIGNhY2hlIGtleS5cbiAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjgq3jg7zjga7nlJ/miJBcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGU6IHN0cmluZywgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGVtcGxhdGV9OiR7dGFncy5qb2luKCc6Jyl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIGNhY2hlIHBvb2wuXG4gKiBAamEg44GZ44G544Gm44Gu44OG44Oz44OX44Os44O844OI44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGdldEdsb2JhbE5hbWVzcGFjZShDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSk7XG4gICAgbmFtZXNwYWNlW0NhY2hlTG9jYXRpb24uUk9PVF0gPSB7fTtcbn1cblxuLyoqIEBpbnRlcm5hbCBnbG9iYWwgY2FjaGUgcG9vbCAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZW5zdXJlT2JqZWN0PFBsYWluT2JqZWN0PihudWxsLCBDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSwgQ2FjaGVMb2NhdGlvbi5ST09UKTtcbiIsImltcG9ydCB7IGlzQXJyYXksIGlzUHJpbWl0aXZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmV4cG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhcyxcbiAgICBlc2NhcGVIVE1MLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKipcbiAqIE1vcmUgY29ycmVjdCB0eXBlb2Ygc3RyaW5nIGhhbmRsaW5nIGFycmF5XG4gKiB3aGljaCBub3JtYWxseSByZXR1cm5zIHR5cGVvZiAnb2JqZWN0J1xuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVN0cmluZyhzcmM6IHVua25vd24pOiBzdHJpbmcge1xuICAgIHJldHVybiBpc0FycmF5KHNyYykgPyAnYXJyYXknIDogdHlwZW9mIHNyYztcbn1cblxuLyoqXG4gKiBFc2NhcGUgZm9yIHRlbXBsYXRlJ3MgZXhwcmVzc2lvbiBjaGFyYWN0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlVGVtcGxhdGVFeHAoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvWy1cXFtcXF17fSgpKis/LixcXFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG59XG5cbi8qKlxuICogU2FmZSB3YXkgb2YgZGV0ZWN0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiB0aGluZyBpcyBhIHByaW1pdGl2ZSBhbmRcbiAqIHdoZXRoZXIgaXQgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzUHJpbWl0aXZlKHNyYykgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNyYywgcHJvcE5hbWUpO1xufVxuXG4vKipcbiAqIENoZWNrIHdoaXRlc3BhY2UgY2hhcmFjdG9yIGV4aXN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2hpdGVzcGFjZShzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhL1xcUy8udGVzdChzcmMpO1xufVxuIiwiaW1wb3J0IHsgVGVtcGxhdGVTY2FubmVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBBIHNpbXBsZSBzdHJpbmcgc2Nhbm5lciB0aGF0IGlzIHVzZWQgYnkgdGhlIHRlbXBsYXRlIHBhcnNlciB0byBmaW5kXG4gKiB0b2tlbnMgaW4gdGVtcGxhdGUgc3RyaW5ncy5cbiAqL1xuZXhwb3J0IGNsYXNzIFNjYW5uZXIgaW1wbGVtZW50cyBUZW1wbGF0ZVNjYW5uZXIge1xuICAgIHByaXZhdGUgX3NvdXJjZTogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RhaWw6IHN0cmluZztcbiAgICBwcml2YXRlIF9wb3M6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gdGhpcy5fdGFpbCA9IHNyYztcbiAgICAgICAgdGhpcy5fcG9zID0gMDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgY3VycmVudCBzY2FubmluZyBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBnZXQgcG9zKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBzdHJpbmcgIHNvdXJjZS5cbiAgICAgKi9cbiAgICBnZXQgc291cmNlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHRhaWwgaXMgZW1wdHkgKGVuZCBvZiBzdHJpbmcpLlxuICAgICAqL1xuICAgIGdldCBlb3MoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAnJyA9PT0gdGhpcy5fdGFpbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBtYXRjaCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGF0IHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAqIFJldHVybnMgdGhlIG1hdGNoZWQgdGV4dCBpZiBpdCBjYW4gbWF0Y2gsIHRoZSBlbXB0eSBzdHJpbmcgb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNjYW4ocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBtYXRjaCA9IHJlZ2V4cC5leGVjKHRoaXMuX3RhaWwpO1xuXG4gICAgICAgIGlmICghbWF0Y2ggfHwgMCAhPT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmluZyA9IG1hdGNoWzBdO1xuXG4gICAgICAgIHRoaXMuX3RhaWwgPSB0aGlzLl90YWlsLnN1YnN0cmluZyhzdHJpbmcubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5fcG9zICs9IHN0cmluZy5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTa2lwcyBhbGwgdGV4dCB1bnRpbCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGNhbiBiZSBtYXRjaGVkLiBSZXR1cm5zXG4gICAgICogdGhlIHNraXBwZWQgc3RyaW5nLCB3aGljaCBpcyB0aGUgZW50aXJlIHRhaWwgaWYgbm8gbWF0Y2ggY2FuIGJlIG1hZGUuXG4gICAgICovXG4gICAgc2NhblVudGlsKHJlZ2V4cDogUmVnRXhwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLl90YWlsLnNlYXJjaChyZWdleHApO1xuICAgICAgICBsZXQgbWF0Y2g6IHN0cmluZztcblxuICAgICAgICBzd2l0Y2ggKGluZGV4KSB7XG4gICAgICAgICAgICBjYXNlIC0xOlxuICAgICAgICAgICAgICAgIG1hdGNoID0gdGhpcy5fdGFpbDtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BvcyArPSBtYXRjaC5sZW5ndGg7XG5cbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFRlbXBsYXRlQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5LFxufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIGNvbnRleHQgYnkgd3JhcHBpbmcgYSB2aWV3IG9iamVjdCBhbmRcbiAqIG1haW50YWluaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgY29udGV4dC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQgaW1wbGVtZW50cyBUZW1wbGF0ZUNvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3ZpZXc6IFBsYWluT2JqZWN0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhcmVudD86IENvbnRleHQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2FjaGU6IFBsYWluT2JqZWN0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX3ZpZXcgICA9IHZpZXc7XG4gICAgICAgIHRoaXMuX2NhY2hlICA9IHsgJy4nOiB0aGlzLl92aWV3IH07XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudENvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBWaWV3IHBhcmFtZXRlciBnZXR0ZXIuXG4gICAgICovXG4gICAgZ2V0IHZpZXcoKTogUGxhaW5PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmlldztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICAgKiBhcyB0aGUgcGFyZW50LlxuICAgICAqL1xuICAgIHB1c2godmlldzogUGxhaW5PYmplY3QpOiBDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBnaXZlbiBuYW1lIGluIHRoaXMgY29udGV4dCwgdHJhdmVyc2luZ1xuICAgICAqIHVwIHRoZSBjb250ZXh0IGhpZXJhcmNoeSBpZiB0aGUgdmFsdWUgaXMgYWJzZW50IGluIHRoaXMgY29udGV4dCdzIHZpZXcuXG4gICAgICovXG4gICAgbG9va3VwKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuX2NhY2hlO1xuXG4gICAgICAgIGxldCB2YWx1ZTogdW5rbm93bjtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjYWNoZSwgbmFtZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gY2FjaGVbbmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgY29udGV4dDogQ29udGV4dCB8IHVuZGVmaW5lZCA9IHRoaXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGxldCBpbnRlcm1lZGlhdGVWYWx1ZTogb2JqZWN0IHwgdW5kZWZpbmVkIHwgbnVsbDtcbiAgICAgICAgICAgIGxldCBuYW1lczogc3RyaW5nW107XG4gICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlcjtcbiAgICAgICAgICAgIGxldCBsb29rdXBIaXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgd2hpbGUgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoMCA8IG5hbWUuaW5kZXhPZignLicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlldztcbiAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogVXNpbmcgdGhlIGRvdCBub3Rpb24gcGF0aCBpbiBgbmFtZWAsIHdlIGRlc2NlbmQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICogbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRvIGJlIGNlcnRhaW4gdGhhdCB0aGUgbG9va3VwIGhhcyBiZWVuIHN1Y2Nlc3NmdWwsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgICogY2hlY2sgaWYgdGhlIGxhc3Qgb2JqZWN0IGluIHRoZSBwYXRoIGFjdHVhbGx5IGhhcyB0aGUgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogd2UgYXJlIGxvb2tpbmcgZm9yLiBXZSBzdG9yZSB0aGUgcmVzdWx0IGluIGBsb29rdXBIaXRgLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBUaGlzIGlzIHNwZWNpYWxseSBuZWNlc3NhcnkgZm9yIHdoZW4gdGhlIHZhbHVlIGhhcyBiZWVuIHNldCB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBgdW5kZWZpbmVkYCBhbmQgd2Ugd2FudCB0byBhdm9pZCBsb29raW5nIHVwIHBhcmVudCBjb250ZXh0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSW4gdGhlIGNhc2Ugd2hlcmUgZG90IG5vdGF0aW9uIGlzIHVzZWQsIHdlIGNvbnNpZGVyIHRoZSBsb29rdXBcbiAgICAgICAgICAgICAgICAgICAgICogdG8gYmUgc3VjY2Vzc2Z1bCBldmVuIGlmIHRoZSBsYXN0IFwib2JqZWN0XCIgaW4gdGhlIHBhdGggaXNcbiAgICAgICAgICAgICAgICAgICAgICogbm90IGFjdHVhbGx5IGFuIG9iamVjdCBidXQgYSBwcmltaXRpdmUgKGUuZy4sIGEgc3RyaW5nLCBvciBhblxuICAgICAgICAgICAgICAgICAgICAgKiBpbnRlZ2VyKSwgYmVjYXVzZSBpdCBpcyBzb21ldGltZXMgdXNlZnVsIHRvIGFjY2VzcyBhIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAqIG9mIGFuIGF1dG9ib3hlZCBwcmltaXRpdmUsIHN1Y2ggYXMgdGhlIGxlbmd0aCBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAobnVsbCAhPSBpbnRlcm1lZGlhdGVWYWx1ZSAmJiBpbmRleCA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBuYW1lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXMoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZVtuYW1lc1tpbmRleCsrXV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGNvbnRleHQuX3ZpZXdbbmFtZV07XG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIE9ubHkgY2hlY2tpbmcgYWdhaW5zdCBgaGFzUHJvcGVydHlgLCB3aGljaCBhbHdheXMgcmV0dXJucyBgZmFsc2VgIGlmXG4gICAgICAgICAgICAgICAgICAgICAqIGBjb250ZXh0LnZpZXdgIGlzIG5vdCBhbiBvYmplY3QuIERlbGliZXJhdGVseSBvbWl0dGluZyB0aGUgY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICogYWdhaW5zdCBgcHJpbWl0aXZlSGFzT3duUHJvcGVydHlgIGlmIGRvdCBub3RhdGlvbiBpcyBub3QgdXNlZC5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogQ29uc2lkZXIgdGhpcyBleGFtcGxlOlxuICAgICAgICAgICAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgICAgICAgICAgICogTXVzdGFjaGUucmVuZGVyKFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIHt7I2xlbmd0aH19e3tsZW5ndGh9fXt7L2xlbmd0aH19LlwiLCB7bGVuZ3RoOiBcIjEwMCB5YXJkc1wifSlcbiAgICAgICAgICAgICAgICAgICAgICogYGBgXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIElmIHdlIHdlcmUgdG8gY2hlY2sgYWxzbyBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAsIGFzIHdlIGRvXG4gICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBkb3Qgbm90YXRpb24gY2FzZSwgdGhlbiByZW5kZXIgY2FsbCB3b3VsZCByZXR1cm46XG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDkuXCJcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogcmF0aGVyIHRoYW4gdGhlIGV4cGVjdGVkOlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyAxMDAgeWFyZHMuXCJcbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICBsb29rdXBIaXQgPSBoYXMoY29udGV4dC5fdmlldywgbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvb2t1cEhpdCkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dC5fcGFyZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWNoZVtuYW1lXSA9IHZhbHVlIGFzIG9iamVjdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5jYWxsKHRoaXMuX3ZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgRGVsaW1pdGVycyxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNXaGl0ZXNwYWNlLFxuICAgIGVzY2FwZVRlbXBsYXRlRXhwLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNjYW5uZXIgfSBmcm9tICcuL3NjYW5uZXInO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVnZXhwID0ge1xuICAgIHdoaXRlOiAvXFxzKi8sXG4gICAgc3BhY2U6IC9cXHMrLyxcbiAgICBlcXVhbHM6IC9cXHMqPS8sXG4gICAgY3VybHk6IC9cXHMqXFx9LyxcbiAgICB0YWc6IC8jfFxcXnxcXC98PnxcXHt8Jnw9fCEvLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIENvbWJpbmVzIHRoZSB2YWx1ZXMgb2YgY29uc2VjdXRpdmUgdGV4dCB0b2tlbnMgaW4gdGhlIGdpdmVuIGB0b2tlbnNgIGFycmF5IHRvIGEgc2luZ2xlIHRva2VuLlxuICovXG5mdW5jdGlvbiBzcXVhc2hUb2tlbnModG9rZW5zOiBUb2tlbltdKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgc3F1YXNoZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBsYXN0VG9rZW4hOiBUb2tlbjtcbiAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgIGlmICgndGV4dCcgPT09IHRva2VuWyQuVFlQRV0gJiYgbGFzdFRva2VuICYmICd0ZXh0JyA9PT0gbGFzdFRva2VuWyQuVFlQRV0pIHtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5WQUxVRV0gKz0gdG9rZW5bJC5WQUxVRV07XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuWyQuRU5EXSA9IHRva2VuWyQuRU5EXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3F1YXNoZWRUb2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3F1YXNoZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICogdG9rZW5zIHRoYXQgcmVwcmVzZW50IGEgc2VjdGlvbiBoYXZlIHR3byBhZGRpdGlvbmFsIGl0ZW1zOiAxKSBhbiBhcnJheSBvZlxuICogYWxsIHRva2VucyB0aGF0IGFwcGVhciBpbiB0aGF0IHNlY3Rpb24gYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWxcbiAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAqL1xuZnVuY3Rpb24gbmVzdFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBuZXN0ZWRUb2tlbnM6IFRva2VuW10gPSBbXTtcbiAgICBsZXQgY29sbGVjdG9yID0gbmVzdGVkVG9rZW5zO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107XG5cbiAgICBsZXQgc2VjdGlvbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gdG9rZW5bJC5UT0tFTl9MSVNUXSA9IFtdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLyc6XG4gICAgICAgICAgICAgICAgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpIGFzIFRva2VuO1xuICAgICAgICAgICAgICAgIHNlY3Rpb25bJC5UQUdfSU5ERVhdID0gdG9rZW5bJC5TVEFSVF07XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSA6IG5lc3RlZFRva2VucztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXN0ZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQnJlYWtzIHVwIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHN0cmluZyBpbnRvIGEgdHJlZSBvZiB0b2tlbnMuIElmIHRoZSBgdGFnc2BcbiAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAqIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBPZlxuICogY291cnNlLCB0aGUgZGVmYXVsdCBpcyB0byB1c2UgbXVzdGFjaGVzIChpLmUuIG11c3RhY2hlLnRhZ3MpLlxuICpcbiAqIEEgdG9rZW4gaXMgYW4gYXJyYXkgd2l0aCBhdCBsZWFzdCA0IGVsZW1lbnRzLiBUaGUgZmlyc3QgZWxlbWVudCBpcyB0aGVcbiAqIG11c3RhY2hlIHN5bWJvbCB0aGF0IHdhcyB1c2VkIGluc2lkZSB0aGUgdGFnLCBlLmcuIFwiI1wiIG9yIFwiJlwiLiBJZiB0aGUgdGFnXG4gKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gKiBhbGwgdGV4dCB0aGF0IGFwcGVhcnMgb3V0c2lkZSBhIHN5bWJvbCB0aGlzIGVsZW1lbnQgaXMgXCJ0ZXh0XCIuXG4gKlxuICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICogd2hhdGV2ZXIgZWxzZSB3YXMgaW5zaWRlIHRoZSB0YWcgYmVzaWRlcyB0aGUgb3BlbmluZyBzeW1ib2wuIEZvciB0ZXh0IHRva2Vuc1xuICogdGhpcyBpcyB0aGUgdGV4dCBpdHNlbGYuXG4gKlxuICogVGhlIHRoaXJkIGFuZCBmb3VydGggZWxlbWVudHMgb2YgdGhlIHRva2VuIGFyZSB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2VzLFxuICogcmVzcGVjdGl2ZWx5LCBvZiB0aGUgdG9rZW4gaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLlxuICpcbiAqIFRva2VucyB0aGF0IGFyZSB0aGUgcm9vdCBub2RlIG9mIGEgc3VidHJlZSBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhblxuICogYXJyYXkgb2YgdG9rZW5zIGluIHRoZSBzdWJ0cmVlIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlIGF0XG4gKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gKlxuICogVG9rZW5zIGZvciBwYXJ0aWFscyBhbHNvIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGEgc3RyaW5nIHZhbHVlIG9mXG4gKiBpbmRlbmRhdGlvbiBwcmlvciB0byB0aGF0IHRhZyBhbmQgMikgdGhlIGluZGV4IG9mIHRoYXQgdGFnIG9uIHRoYXQgbGluZSAtXG4gKiBlZyBhIHZhbHVlIG9mIDIgaW5kaWNhdGVzIHRoZSBwYXJ0aWFsIGlzIHRoZSB0aGlyZCB0YWcgb24gdGhpcyBsaW5lLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSBzdHJpbmdcbiAqIEBwYXJhbSB0YWdzIGRlbGltaXRlcnMgZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZywgdGFncz86IERlbGltaXRlcnMpOiBUb2tlbltdIHtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgbGluZUhhc05vblNwYWNlICAgICA9IGZhbHNlO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107ICAgICAgIC8vIFN0YWNrIHRvIGhvbGQgc2VjdGlvbiB0b2tlbnNcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gICA9IFtdOyAgICAgICAvLyBCdWZmZXIgdG8gaG9sZCB0aGUgdG9rZW5zXG4gICAgY29uc3Qgc3BhY2VzOiBudW1iZXJbXSAgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgbGV0IGhhc1RhZyAgICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSB7e3RhZ319IG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IG5vblNwYWNlICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSBub24tc3BhY2UgY2hhciBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBpbmRlbnRhdGlvbiAgICAgICAgID0gJyc7ICAgICAgIC8vIFRyYWNrcyBpbmRlbnRhdGlvbiBmb3IgdGFncyB0aGF0IHVzZSBpdFxuICAgIGxldCB0YWdJbmRleCAgICAgICAgICAgID0gMDsgICAgICAgIC8vIFN0b3JlcyBhIGNvdW50IG9mIG51bWJlciBvZiB0YWdzIGVuY291bnRlcmVkIG9uIGEgbGluZVxuXG4gICAgLy8gU3RyaXBzIGFsbCB3aGl0ZXNwYWNlIHRva2VucyBhcnJheSBmb3IgdGhlIGN1cnJlbnQgbGluZVxuICAgIC8vIGlmIHRoZXJlIHdhcyBhIHt7I3RhZ319IG9uIGl0IGFuZCBvdGhlcndpc2Ugb25seSBzcGFjZS5cbiAgICBjb25zdCBzdHJpcFNwYWNlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoaGFzVGFnICYmICFub25TcGFjZSkge1xuICAgICAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG9rZW5zW3NwYWNlcy5wb3AoKSBhcyBudW1iZXJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BhY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICAgIG5vblNwYWNlID0gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbXBpbGVUYWdzID0gKHRhZ3NUb0NvbXBpbGU6IHN0cmluZyB8IHN0cmluZ1tdKTogeyBvcGVuaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ0N1cmx5OiBSZWdFeHA7IH0gPT4ge1xuICAgICAgICBjb25zdCBlbnVtIFRhZyB7XG4gICAgICAgICAgICBPUEVOID0gMCxcbiAgICAgICAgICAgIENMT1NFLFxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1N0cmluZyh0YWdzVG9Db21waWxlKSkge1xuICAgICAgICAgICAgdGFnc1RvQ29tcGlsZSA9IHRhZ3NUb0NvbXBpbGUuc3BsaXQoX3JlZ2V4cC5zcGFjZSwgMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkodGFnc1RvQ29tcGlsZSkgfHwgMiAhPT0gdGFnc1RvQ29tcGlsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0YWdzOiAke0pTT04uc3RyaW5naWZ5KHRhZ3NUb0NvbXBpbGUpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcGVuaW5nVGFnOiAgIG5ldyBSZWdFeHAoYCR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuT1BFTl0pfVxcXFxzKmApLFxuICAgICAgICAgICAgY2xvc2luZ1RhZzogICBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXSl9YCksXG4gICAgICAgICAgICBjbG9zaW5nQ3VybHk6IG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAoYH0ke3RhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXX1gKX1gKSxcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyB0YWc6IHJlVGFnLCB3aGl0ZTogcmVXaGl0ZSwgZXF1YWxzOiByZUVxdWFscywgY3VybHk6IHJlQ3VybHkgfSA9IF9yZWdleHA7XG4gICAgbGV0IF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuXG4gICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIGxldCBvcGVuU2VjdGlvbjogVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgd2hpbGUgKCFzY2FubmVyLmVvcykge1xuICAgICAgICBjb25zdCB7IG9wZW5pbmdUYWc6IHJlT3BlbmluZ1RhZywgY2xvc2luZ1RhZzogcmVDbG9zaW5nVGFnLCBjbG9zaW5nQ3VybHk6IHJlQ2xvc2luZ0N1cmx5IH0gPSBfcmVneHBUYWdzO1xuICAgICAgICBsZXQgdG9rZW46IFRva2VuO1xuICAgICAgICBsZXQgc3RhcnQgPSBzY2FubmVyLnBvcztcbiAgICAgICAgLy8gTWF0Y2ggYW55IHRleHQgYmV0d2VlbiB0YWdzLlxuICAgICAgICBsZXQgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZU9wZW5pbmdUYWcpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VzLnB1c2godG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9IGNocjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChbJ3RleHQnLCBjaHIsIHN0YXJ0LCBzdGFydCArIDFdKTtcbiAgICAgICAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHdoaXRlc3BhY2Ugb24gdGhlIGN1cnJlbnQgbGluZS5cbiAgICAgICAgICAgICAgICBpZiAoJ1xcbicgPT09IGNocikge1xuICAgICAgICAgICAgICAgICAgICBzdHJpcFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRhZ0luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIG9wZW5pbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZU9wZW5pbmdUYWcpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGhhc1RhZyA9IHRydWU7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdHlwZS5cbiAgICAgICAgbGV0IHR5cGUgPSBzY2FubmVyLnNjYW4ocmVUYWcpIHx8ICduYW1lJztcbiAgICAgICAgc2Nhbm5lci5zY2FuKHJlV2hpdGUpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHZhbHVlLlxuICAgICAgICBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9IGVsc2UgaWYgKCd7JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICAgICAgdHlwZSA9ICcmJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBjbG9zaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVDbG9zaW5nVGFnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCB0YWcgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnPicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3MsIGluZGVudGF0aW9uLCB0YWdJbmRleCwgbGluZUhhc05vblNwYWNlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3NdO1xuICAgICAgICB9XG4gICAgICAgIHRhZ0luZGV4Kys7XG4gICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgICBpZiAoJyMnID09PSB0eXBlIHx8ICdeJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSBpZiAoJy8nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICAgICAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgaWYgKCFvcGVuU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5vcGVuZWQgc2VjdGlvbiBcIiR7dmFsdWV9XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ25hbWUnID09PSB0eXBlIHx8ICd7JyA9PT0gdHlwZSB8fCAnJicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgICAgICBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RyaXBTcGFjZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuXG4gICAgaWYgKG9wZW5TZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdFRva2VucyhzcXVhc2hUb2tlbnModG9rZW5zKSk7XG59XG4iLCJpbXBvcnQge1xuICAgIFRlbXBsYXRlRGVsaW1pdGVycyxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZVZpZXdQYXJhbSxcbiAgICBUZW1wbGF0ZVBhcnRpYWxQYXJhbSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgZ2xvYmFsU2V0dGluZ3MsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgY2FjaGUsIGJ1aWxkQ2FjaGVLZXkgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHBhcnNlVGVtcGxhdGUgfSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuXG4vKipcbiAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICogc3RyaW5nLCBnaXZlbiBhIGNvbnRleHQuIEl0IGFsc28gbWFpbnRhaW5zIGEgY2FjaGUgb2YgdGVtcGxhdGVzIHRvXG4gKiBhdm9pZCB0aGUgbmVlZCB0byBwYXJzZSB0aGUgc2FtZSB0ZW1wbGF0ZSB0d2ljZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFdyaXRlciBpbXBsZW1lbnRzIFRlbXBsYXRlV3JpdGVyIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBgdGFnc2Agb3JcbiAgICAgKiBgbXVzdGFjaGUudGFnc2AgaWYgYHRhZ3NgIGlzIG9taXR0ZWQsICBhbmQgcmV0dXJucyB0aGUgYXJyYXkgb2YgdG9rZW5zXG4gICAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAgICovXG4gICAgcGFyc2UodGVtcGxhdGU6IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHsgdG9rZW5zOiBUb2tlbltdOyBjYWNoZUtleTogc3RyaW5nOyB9IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBidWlsZENhY2hlS2V5KHRlbXBsYXRlLCB0YWdzIHx8IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuICAgICAgICBsZXQgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldIGFzIFRva2VuW107XG4gICAgICAgIGlmIChudWxsID09IHRva2Vucykge1xuICAgICAgICAgICAgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgdG9rZW5zLCBjYWNoZUtleSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhpZ2gtbGV2ZWwgbWV0aG9kIHRoYXQgaXMgdXNlZCB0byByZW5kZXIgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgd2l0aFxuICAgICAqIHRoZSBnaXZlbiBgdmlld2AuXG4gICAgICpcbiAgICAgKiBUaGUgb3B0aW9uYWwgYHBhcnRpYWxzYCBhcmd1bWVudCBtYXkgYmUgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlXG4gICAgICogbmFtZXMgYW5kIHRlbXBsYXRlcyBvZiBwYXJ0aWFscyB0aGF0IGFyZSB1c2VkIGluIHRoZSB0ZW1wbGF0ZS4gSXQgbWF5XG4gICAgICogYWxzbyBiZSBhIGZ1bmN0aW9uIHRoYXQgaXMgdXNlZCB0byBsb2FkIHBhcnRpYWwgdGVtcGxhdGVzIG9uIHRoZSBmbHlcbiAgICAgKiB0aGF0IHRha2VzIGEgc2luZ2xlIGFyZ3VtZW50OiB0aGUgbmFtZSBvZiB0aGUgcGFydGlhbC5cbiAgICAgKlxuICAgICAqIElmIHRoZSBvcHRpb25hbCBgdGFnc2AgYXJndW1lbnQgaXMgZ2l2ZW4gaGVyZSBpdCBtdXN0IGJlIGFuIGFycmF5IHdpdGggdHdvXG4gICAgICogc3RyaW5nIHZhbHVlczogdGhlIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLlxuICAgICAqIFsgXCI8JVwiLCBcIiU+XCIgXSkuIFRoZSBkZWZhdWx0IGlzIHRvIG11c3RhY2hlLnRhZ3MuXG4gICAgICovXG4gICAgcmVuZGVyKHRlbXBsYXRlOiBzdHJpbmcsIHZpZXc6IFRlbXBsYXRlVmlld1BhcmFtLCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyB0b2tlbnMgfSA9IHRoaXMucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCB2aWV3LCBwYXJ0aWFscywgdGVtcGxhdGUsIHRhZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvdy1sZXZlbCBtZXRob2QgdGhhdCByZW5kZXJzIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCB1c2luZ1xuICAgICAqIHRoZSBnaXZlbiBgY29udGV4dGAgYW5kIGBwYXJ0aWFsc2AuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGUgYG9yaWdpbmFsVGVtcGxhdGVgIGlzIG9ubHkgZXZlciB1c2VkIHRvIGV4dHJhY3QgdGhlIHBvcnRpb25cbiAgICAgKiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB3YXMgY29udGFpbmVkIGluIGEgaGlnaGVyLW9yZGVyIHNlY3Rpb24uXG4gICAgICogSWYgdGhlIHRlbXBsYXRlIGRvZXNuJ3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucywgdGhpcyBhcmd1bWVudCBtYXlcbiAgICAgKiBiZSBvbWl0dGVkLlxuICAgICAqL1xuICAgIHJlbmRlclRva2Vucyh0b2tlbnM6IFRva2VuW10sIHZpZXc6IFRlbXBsYXRlVmlld1BhcmFtLCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nLCB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9ICh2aWV3IGluc3RhbmNlb2YgQ29udGV4dCkgPyB2aWV3IDogbmV3IENvbnRleHQodmlldyBhcyBQbGFpbk9iamVjdCk7XG4gICAgICAgIGxldCBidWZmZXIgPSAnJztcblxuICAgICAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB2b2lkO1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJTZWN0aW9uKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVySW52ZXJ0ZWQodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnPic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJQYXJ0aWFsKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJyYnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMudW5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICduYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVzY2FwZWRWYWx1ZSh0b2tlbiwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3RleHQnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmF3VmFsdWUodG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclNlY3Rpb24odG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG4gICAgICAgIGxldCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcblxuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gcmVuZGVyIGFuIGFyYml0cmFyeSB0ZW1wbGF0ZVxuICAgICAgICAvLyBpbiB0aGUgY3VycmVudCBjb250ZXh0IGJ5IGhpZ2hlci1vcmRlciBzZWN0aW9ucy5cbiAgICAgICAgY29uc3Qgc3ViUmVuZGVyID0gKHRlbXBsYXRlOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyKHRlbXBsYXRlLCBjb250ZXh0LCBwYXJ0aWFscyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LnB1c2godiksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09PSB0eXBlb2YgdmFsdWUgfHwgJ251bWJlcicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHZhbHVlIGFzIFBsYWluT2JqZWN0KSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBvcmlnaW5hbFRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucyB3aXRob3V0IHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXh0cmFjdCB0aGUgcG9ydGlvbiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB0aGUgc2VjdGlvbiBjb250YWlucy5cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuY2FsbChjb250ZXh0LnZpZXcsIG9yaWdpbmFsVGVtcGxhdGUuc2xpY2UodG9rZW5bJC5FTkRdLCB0b2tlblskLlRBR19JTkRFWF0pLCBzdWJSZW5kZXIpO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJJbnZlcnRlZCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzPzogVGVtcGxhdGVQYXJ0aWFsUGFyYW0sIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgKGlzQXJyYXkodmFsdWUpICYmIDAgPT09IHZhbHVlLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGluZGVudFBhcnRpYWwocGFydGlhbDogc3RyaW5nLCBpbmRlbnRhdGlvbjogc3RyaW5nLCBsaW5lSGFzTm9uU3BhY2U6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZEluZGVudGF0aW9uID0gaW5kZW50YXRpb24ucmVwbGFjZSgvW14gXFx0XS9nLCAnJyk7XG4gICAgICAgIGNvbnN0IHBhcnRpYWxCeU5sID0gcGFydGlhbC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydGlhbEJ5TmwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWFsQnlObFtpXS5sZW5ndGggJiYgKGkgPiAwIHx8ICFsaW5lSGFzTm9uU3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgcGFydGlhbEJ5TmxbaV0gPSBmaWx0ZXJlZEluZGVudGF0aW9uICsgcGFydGlhbEJ5TmxbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcnRpYWxCeU5sLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclBhcnRpYWwodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFsczogVGVtcGxhdGVQYXJ0aWFsUGFyYW0gfCB1bmRlZmluZWQsIHRhZ3M6IFRlbXBsYXRlRGVsaW1pdGVycyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBpZiAoIXBhcnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2YWx1ZSA9IChpc0Z1bmN0aW9uKHBhcnRpYWxzKSA/IHBhcnRpYWxzKHRva2VuWyQuVkFMVUVdKSA6IHBhcnRpYWxzW3Rva2VuWyQuVkFMVUVdXSkgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgbGluZUhhc05vblNwYWNlID0gdG9rZW5bJC5IQVNfTk9fU1BBQ0VdO1xuICAgICAgICAgICAgY29uc3QgdGFnSW5kZXggICAgICAgID0gdG9rZW5bJC5UQUdfSU5ERVhdO1xuICAgICAgICAgICAgY29uc3QgaW5kZW50YXRpb24gICAgID0gdG9rZW5bJC5UT0tFTl9MSVNUXTtcbiAgICAgICAgICAgIGxldCBpbmRlbnRlZFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICBpZiAoMCA9PT0gdGFnSW5kZXggJiYgaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICBpbmRlbnRlZFZhbHVlID0gdGhpcy5pbmRlbnRQYXJ0aWFsKHZhbHVlLCBpbmRlbnRhdGlvbiBhcyBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZSBhcyBib29sZWFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKGluZGVudGVkVmFsdWUsIHRhZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgY29udGV4dCwgcGFydGlhbHMsIGluZGVudGVkVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdW5lc2NhcGVkVmFsdWUodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlIGFzIHN0cmluZztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGVzY2FwZWRWYWx1ZSh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsU2V0dGluZ3MuZXNjYXBlKHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByYXdWYWx1ZSh0b2tlbjogVG9rZW4pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9rZW5bJC5WQUxVRV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBKU1QsXG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIElUZW1wbGF0ZUVuZ2luZSxcbiAgICBUZW1wbGF0ZVNjYW5uZXIsXG4gICAgVGVtcGxhdGVDb250ZXh0LFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGdsb2JhbFNldHRpbmdzIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBDYWNoZUxvY2F0aW9uLCBjbGVhckNhY2hlIH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIHR5cGVTdHJpbmcsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7IFdyaXRlciB9IGZyb20gJy4vd3JpdGVyJztcblxuLyoqIFtbVGVtcGxhdGVFbmdpbmVdXSBjb21tb24gc2V0dGluZ3MgKi9cbmdsb2JhbFNldHRpbmdzLndyaXRlciA9IG5ldyBXcml0ZXIoKTtcblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUVuZ2luZV1dIGdsb2JhbCBzZXR0bmcgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSDjgrDjg63jg7zjg5Djg6voqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzIHtcbiAgICB3cml0ZXI/OiBUZW1wbGF0ZVdyaXRlcjtcbiAgICB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzO1xuICAgIGVzY2FwZT86IFRlbXBsYXRlRXNjYXBlcjtcbn1cblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUVuZ2luZV1dIGNvbXBpbGUgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZUVuZ2luZSB1dGlsaXR5IGNsYXNzLlxuICogQGphIFRlbXBsYXRlRW5naW5lIOODpuODvOODhuOCo+ODquODhuOCo+OCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVFbmdpbmUgaW1wbGVtZW50cyBJVGVtcGxhdGVFbmdpbmUge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW0pTVF1dIGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokgW1tKU1RdXSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zKTogSlNUIHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyh0ZW1wbGF0ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgdGVtcGxhdGUhIHRoZSBmaXJzdCBhcmd1bWVudCBzaG91bGQgYmUgYSBcInN0cmluZ1wiIGJ1dCBcIiR7dHlwZVN0cmluZyh0ZW1wbGF0ZSl9XCIgd2FzIGdpdmVuIGZvciBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKHRlbXBsYXRlLCBvcHRpb25zKWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0YWdzIH0gPSBvcHRpb25zIHx8IGdsb2JhbFNldHRpbmdzO1xuICAgICAgICBjb25zdCB7IHdyaXRlciB9ID0gZ2xvYmFsU2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyLnJlbmRlcih0ZW1wbGF0ZSwgdmlldyB8fCB7fSwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHsgdG9rZW5zLCBjYWNoZUtleSB9ID0gd3JpdGVyLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAganN0LnRva2VucyAgICAgICAgPSB0b2tlbnM7XG4gICAgICAgIGpzdC5jYWNoZUtleSAgICAgID0gY2FjaGVLZXk7XG4gICAgICAgIGpzdC5jYWNoZUxvY2F0aW9uID0gW0NhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1RdO1xuXG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFycyBhbGwgY2FjaGVkIHRlbXBsYXRlcyBpbiB0aGUgZGVmYXVsdCBbW1RlbXBsYXRlV3JpdGVyXV0uXG4gICAgICogQGphIOaXouWumuOBriBbW1RlbXBsYXRlV3JpdGVyXV0g44Gu44GZ44G544Gm44Gu44Kt44Oj44OD44K344Ol44KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBjbGVhckNhY2hlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSBbW1RlbXBsYXRlRW5naW5lXV0gZ2xvYmFsIHNldHRpbmdzLlxuICAgICAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0g44Kw44Ot44O844OQ44Or6Kit5a6a44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2V0dGluZ3NcbiAgICAgKiAgLSBgZW5gIG5ldyBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5paw44GX44GE6Kit5a6a5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCBzZXR0aW5nc1xuICAgICAqICAtIGBqYWAg5Y+k44GE6Kit5a6a5YCkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRHbG9iYWxTZXR0aW5ncyhzZXRpaW5nczogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyk6IFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4uZ2xvYmFsU2V0dGluZ3MgfTtcbiAgICAgICAgY29uc3QgeyB3cml0ZXIsIHRhZ3MsIGVzY2FwZSB9ID0gc2V0aWluZ3M7XG4gICAgICAgIHdyaXRlciAmJiAoZ2xvYmFsU2V0dGluZ3Mud3JpdGVyID0gd3JpdGVyKTtcbiAgICAgICAgdGFncyAgICYmIChnbG9iYWxTZXR0aW5ncy50YWdzICAgPSB0YWdzKTtcbiAgICAgICAgZXNjYXBlICYmIChnbG9iYWxTZXR0aW5ncy5lc2NhcGUgPSBlc2NhcGUpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOiBmb3IgZGVidWdcblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVTY2FubmVyXV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVNjYW5uZXIoc3JjOiBzdHJpbmcpOiBUZW1wbGF0ZVNjYW5uZXIge1xuICAgICAgICByZXR1cm4gbmV3IFNjYW5uZXIoc3JjKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSBbW1RlbXBsYXRlQ29udGV4dF1dIGluc3RhbmNlICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVDb250ZXh0KHZpZXc6IFBsYWluT2JqZWN0LCBwYXJlbnRDb250ZXh0PzogQ29udGV4dCk6IFRlbXBsYXRlQ29udGV4dCB7XG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh2aWV3LCBwYXJlbnRDb250ZXh0KTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSBbW1RlbXBsYXRlV3JpdGVyXV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVdyaXRlcigpOiBUZW1wbGF0ZVdyaXRlciB7XG4gICAgICAgIHJldHVybiBuZXcgV3JpdGVyKCk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFzQ0E7QUFDTyxNQUFNLGNBQWMsR0FBRztBQUMxQixJQUFBLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7QUFDbEIsSUFBQSxNQUFNLEVBQUUsVUFBVTtDQUtyQjs7QUM1QkQ7Ozs7O0FBS0c7QUFDYSxTQUFBLGFBQWEsQ0FBQyxRQUFnQixFQUFFLElBQXdCLEVBQUE7SUFDcEUsT0FBTyxDQUFBLEVBQUcsUUFBUSxDQUFBLENBQUEsRUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUUsQ0FBQztBQUMzQyxDQUFDO0FBRUQ7Ozs7O0FBS0c7U0FDYSxVQUFVLEdBQUE7QUFDdEIsSUFBQSxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQSxhQUFBLCtCQUF5QixDQUFDO0lBQzlELFNBQVMsQ0FBQSxnQkFBQSwwQkFBb0IsR0FBRyxFQUFFLENBQUM7QUFDdkMsQ0FBQztBQUVEO0FBQ08sTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFjLElBQUkseUZBQThDOztBQzlCakc7OztBQUdHO0FBQ0csU0FBVSxVQUFVLENBQUMsR0FBWSxFQUFBO0FBQ25DLElBQUEsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxHQUFHLE9BQU8sR0FBRyxDQUFDO0FBQy9DLENBQUM7QUFFRDs7QUFFRztBQUNHLFNBQVUsaUJBQWlCLENBQUMsR0FBVyxFQUFBOztJQUV6QyxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDN0QsQ0FBQztBQUVEOzs7QUFHRztBQUNhLFNBQUEsdUJBQXVCLENBQUMsR0FBWSxFQUFFLFFBQWdCLEVBQUE7QUFDbEUsSUFBQSxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FB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QU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLElBQUksY0FBYyxDQUFDO0FBQzNDLFFBQUEsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLGNBQWMsQ0FBQztBQUVsQyxRQUFBLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBa0IsRUFBRSxRQUFzQixLQUFZO0FBQy9ELFlBQUEsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvRCxTQUFDLENBQUM7QUFFRixRQUFBLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDMUQsUUFBQSxHQUFHLENBQUMsTUFBTSxHQUFVLE1BQU0sQ0FBQztBQUMzQixRQUFBLEdBQUcsQ0FBQyxRQUFRLEdBQVEsUUFBUSxDQUFDO0FBQzdCLFFBQUEsR0FBRyxDQUFDLGFBQWEsR0FBRyxDQUFBLGFBQUEsZ0NBQUEsZ0JBQUEsMEJBQTZDLENBQUM7QUFFbEUsUUFBQSxPQUFPLEdBQUcsQ0FBQztLQUNkO0FBRUQ7OztBQUdHO0FBQ0ksSUFBQSxPQUFPLFVBQVUsR0FBQTtBQUNwQixRQUFBLFVBQVUsRUFBRSxDQUFDO0tBQ2hCO0FBRUQ7Ozs7Ozs7Ozs7QUFVRztJQUNJLE9BQU8saUJBQWlCLENBQUMsUUFBZ0MsRUFBQTtBQUM1RCxRQUFBLE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxjQUFjLEVBQUUsQ0FBQztRQUMxQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUM7UUFDMUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDM0MsSUFBSSxLQUFPLGNBQWMsQ0FBQyxJQUFJLEdBQUssSUFBSSxDQUFDLENBQUM7UUFDekMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUM7QUFDM0MsUUFBQSxPQUFPLFdBQVcsQ0FBQztLQUN0Qjs7OztJQU1NLE9BQU8sYUFBYSxDQUFDLEdBQVcsRUFBQTtBQUNuQyxRQUFBLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDM0I7O0FBR00sSUFBQSxPQUFPLGFBQWEsQ0FBQyxJQUFpQixFQUFFLGFBQXVCLEVBQUE7QUFDbEUsUUFBQSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztLQUMzQzs7QUFHTSxJQUFBLE9BQU8sWUFBWSxHQUFBO1FBQ3RCLE9BQU8sSUFBSSxNQUFNLEVBQUUsQ0FBQztLQUN2QjtBQUNKOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9jb3JlLXRlbXBsYXRlLyJ9
