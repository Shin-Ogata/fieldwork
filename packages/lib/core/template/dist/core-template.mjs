/*!
 * @cdp/core-template 0.9.19
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
                delete tokens[spaces.pop()]; // eslint-disable-line @typescript-eslint/no-array-delete
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
    let _regxpTags = compileTags(tags ?? globalSettings.tags);
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
        const cacheKey = buildCacheKey(template, tags ?? globalSettings.tags);
        let tokens = cache[cacheKey];
        tokens ??= cache[cacheKey] = parseTemplate(template, tags);
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

/** {@link TemplateEngine} common settings */
globalSettings.writer = new Writer();
/**
 * @en TemplateEngine utility class.
 * @ja TemplateEngine ユーティリティクラス
 */
class TemplateEngine {
    ///////////////////////////////////////////////////////////////////////
    // public static methods:
    /**
     * @en Get {@link JST} from template source.
     * @ja テンプレート文字列から {@link JST} を取得
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
        const { tags } = options ?? globalSettings;
        const { writer } = globalSettings;
        const jst = (view, partials) => {
            return writer.render(template, view ?? {}, partials, tags);
        };
        const { tokens, cacheKey } = writer.parse(template, tags);
        jst.tokens = tokens;
        jst.cacheKey = cacheKey;
        jst.cacheLocation = ["CDP_DECLARE" /* CacheLocation.NAMESPACE */, "TEMPLATE_CACHE" /* CacheLocation.ROOT */];
        return jst;
    }
    /**
     * @en Clears all cached templates in the default {@link TemplateWriter}.
     * @ja 既定の {@link TemplateWriter} のすべてのキャッシュを削除
     */
    static clearCache() {
        clearCache();
    }
    /**
     * @en Change {@link TemplateEngine} global settings.
     * @ja {@link TemplateEngine} グローバル設定の更新
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
    /** @internal Create {@link TemplateScanner} instance */
    static createScanner(src) {
        return new Scanner(src);
    }
    /** @internal Create {@link TemplateContext} instance */
    static createContext(view, parentContext) {
        return new Context(view, parentContext);
    }
    /** @internal Create {@link TemplateWriter} instance */
    static createWriter() {
        return new Writer();
    }
}

export { TemplateEngine };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS10ZW1wbGF0ZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY2FjaGUudHMiLCJ1dGlscy50cyIsInNjYW5uZXIudHMiLCJjb250ZXh0LnRzIiwicGFyc2UudHMiLCJ3cml0ZXIudHMiLCJjbGFzcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2NhcGVIVE1MIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHtcbiAgICBUZW1wbGF0ZURlbGltaXRlcnMsXG4gICAgVGVtcGxhdGVXcml0ZXIsXG4gICAgVGVtcGxhdGVFc2NhcGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogKHN0cmluZyB8IFRva2VuW10pICovXG5leHBvcnQgdHlwZSBUb2tlbkxpc3QgPSB1bmtub3duO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IHRva2VuIHN0cnVjdHVyZS5cbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IHRva2VuIOWei1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IFtzdHJpbmcsIHN0cmluZywgbnVtYmVyLCBudW1iZXIsIFRva2VuTGlzdD8sIG51bWJlcj8sIGJvb2xlYW4/XTtcblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRva2VufSBhZGRyZXNzIGlkLlxuICogQGphIHtAbGluayBUb2tlbn0g44Ki44OJ44Os44K56K2Y5Yil5a2QXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFRva2VuQWRkcmVzcyB7XG4gICAgVFlQRSA9IDAsXG4gICAgVkFMVUUsXG4gICAgU1RBUlQsXG4gICAgRU5ELFxuICAgIFRPS0VOX0xJU1QsXG4gICAgVEFHX0lOREVYLFxuICAgIEhBU19OT19TUEFDRSxcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgZGVsaW1pdGVycyBkZWZpbml0aW9uIGZvciB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9LiBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICogQGphIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0g44Gu5YaF6YOo44Gn5L2/55So44GZ44KL5Yy65YiH44KK5paH5a2XIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKi9cbmV4cG9ydCB0eXBlIERlbGltaXRlcnMgPSBzdHJpbmcgfCBUZW1wbGF0ZURlbGltaXRlcnM7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBnbG9iYWxTZXR0aW5ncyA9IHtcbiAgICB0YWdzOiBbJ3t7JywgJ319J10sXG4gICAgZXNjYXBlOiBlc2NhcGVIVE1MLFxufSBhcyB7XG4gICAgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzO1xuICAgIGVzY2FwZTogVGVtcGxhdGVFc2NhcGVyO1xuICAgIHdyaXRlcjogVGVtcGxhdGVXcml0ZXI7XG59O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFBsYWluT2JqZWN0LFxuICAgIGVuc3VyZU9iamVjdCxcbiAgICBnZXRHbG9iYWxOYW1lc3BhY2UsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IFRlbXBsYXRlRGVsaW1pdGVycyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIENhY2hlIGxvY2F0aW9uIGluZm9ybWF0aW9uLlxuICogQGphIOOCreODo+ODg+OCt+ODpeODreOCseODvOOCt+ODp+ODs+aDheWgsVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDYWNoZUxvY2F0aW9uIHtcbiAgICBOQU1FU1BBQ0UgPSAnQ0RQX0RFQ0xBUkUnLFxuICAgIFJPT1QgICAgICA9ICdURU1QTEFURV9DQUNIRScsXG59XG5cbi8qKlxuICogQGVuIEJ1aWxkIGNhY2hlIGtleS5cbiAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjgq3jg7zjga7nlJ/miJBcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGU6IHN0cmluZywgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGVtcGxhdGV9OiR7dGFncy5qb2luKCc6Jyl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIGNhY2hlIHBvb2wuXG4gKiBAamEg44GZ44G544Gm44Gu44OG44Oz44OX44Os44O844OI44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IGdldEdsb2JhbE5hbWVzcGFjZShDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSk7XG4gICAgbmFtZXNwYWNlW0NhY2hlTG9jYXRpb24uUk9PVF0gPSB7fTtcbn1cblxuLyoqIEBpbnRlcm5hbCBnbG9iYWwgY2FjaGUgcG9vbCAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZW5zdXJlT2JqZWN0PFBsYWluT2JqZWN0PihudWxsLCBDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSwgQ2FjaGVMb2NhdGlvbi5ST09UKTtcbiIsImltcG9ydCB7IGlzQXJyYXksIGlzUHJpbWl0aXZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmV4cG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFVua25vd25PYmplY3QsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhcyxcbiAgICBlc2NhcGVIVE1MLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKipcbiAqIE1vcmUgY29ycmVjdCB0eXBlb2Ygc3RyaW5nIGhhbmRsaW5nIGFycmF5XG4gKiB3aGljaCBub3JtYWxseSByZXR1cm5zIHR5cGVvZiAnb2JqZWN0J1xuICovXG5leHBvcnQgZnVuY3Rpb24gdHlwZVN0cmluZyhzcmM6IHVua25vd24pOiBzdHJpbmcge1xuICAgIHJldHVybiBpc0FycmF5KHNyYykgPyAnYXJyYXknIDogdHlwZW9mIHNyYztcbn1cblxuLyoqXG4gKiBFc2NhcGUgZm9yIHRlbXBsYXRlJ3MgZXhwcmVzc2lvbiBjaGFyYWN0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlVGVtcGxhdGVFeHAoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvWy1cXFtcXF17fSgpKis/LixcXFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG59XG5cbi8qKlxuICogU2FmZSB3YXkgb2YgZGV0ZWN0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiB0aGluZyBpcyBhIHByaW1pdGl2ZSBhbmRcbiAqIHdoZXRoZXIgaXQgaGFzIHRoZSBnaXZlbiBwcm9wZXJ0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoc3JjOiB1bmtub3duLCBwcm9wTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzUHJpbWl0aXZlKHNyYykgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNyYywgcHJvcE5hbWUpO1xufVxuXG4vKipcbiAqIENoZWNrIHdoaXRlc3BhY2UgY2hhcmFjdG9yIGV4aXN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2hpdGVzcGFjZShzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhL1xcUy8udGVzdChzcmMpO1xufVxuIiwiaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZVNjYW5uZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEEgc2ltcGxlIHN0cmluZyBzY2FubmVyIHRoYXQgaXMgdXNlZCBieSB0aGUgdGVtcGxhdGUgcGFyc2VyIHRvIGZpbmRcbiAqIHRva2VucyBpbiB0ZW1wbGF0ZSBzdHJpbmdzLlxuICovXG5leHBvcnQgY2xhc3MgU2Nhbm5lciBpbXBsZW1lbnRzIFRlbXBsYXRlU2Nhbm5lciB7XG4gICAgcHJpdmF0ZSBfc291cmNlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdGFpbDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3BvczogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzcmM6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSB0aGlzLl90YWlsID0gc3JjO1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBjdXJyZW50IHNjYW5uaW5nIHBvc2l0aW9uLlxuICAgICAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BvcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHN0cmluZyAgc291cmNlLlxuICAgICAqL1xuICAgIGdldCBzb3VyY2UoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdGFpbCBpcyBlbXB0eSAoZW5kIG9mIHN0cmluZykuXG4gICAgICovXG4gICAgZ2V0IGVvcygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICcnID09PSB0aGlzLl90YWlsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIG1hdGNoIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gYXQgdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICogUmV0dXJucyB0aGUgbWF0Y2hlZCB0ZXh0IGlmIGl0IGNhbiBtYXRjaCwgdGhlIGVtcHR5IHN0cmluZyBvdGhlcndpc2UuXG4gICAgICovXG4gICAgc2NhbihyZWdleHA6IFJlZ0V4cCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcmVnZXhwLmV4ZWModGhpcy5fdGFpbCk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCB8fCAwICE9PSBtYXRjaC5pbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyaW5nID0gbWF0Y2hbMF07XG5cbiAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKHN0cmluZy5sZW5ndGgpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gc3RyaW5nLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNraXBzIGFsbCB0ZXh0IHVudGlsIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gY2FuIGJlIG1hdGNoZWQuIFJldHVybnNcbiAgICAgKiB0aGUgc2tpcHBlZCBzdHJpbmcsIHdoaWNoIGlzIHRoZSBlbnRpcmUgdGFpbCBpZiBubyBtYXRjaCBjYW4gYmUgbWFkZS5cbiAgICAgKi9cbiAgICBzY2FuVW50aWwocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX3RhaWwuc2VhcmNoKHJlZ2V4cCk7XG4gICAgICAgIGxldCBtYXRjaDogc3RyaW5nO1xuXG4gICAgICAgIHN3aXRjaCAoaW5kZXgpIHtcbiAgICAgICAgICAgIGNhc2UgLTE6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsO1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhaWwgPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKDAsIGluZGV4KTtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcG9zICs9IG1hdGNoLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZUNvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGhhcyxcbiAgICBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eSxcbn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHJlbmRlcmluZyBjb250ZXh0IGJ5IHdyYXBwaW5nIGEgdmlldyBvYmplY3QgYW5kXG4gKiBtYWludGFpbmluZyBhIHJlZmVyZW5jZSB0byB0aGUgcGFyZW50IGNvbnRleHQuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb250ZXh0IGltcGxlbWVudHMgVGVtcGxhdGVDb250ZXh0IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF92aWV3OiBQbGFpbk9iamVjdDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wYXJlbnQ/OiBDb250ZXh0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2NhY2hlOiBQbGFpbk9iamVjdDtcblxuICAgIC8qKiBjb25zdHJ1Y3RvciAqL1xuICAgIGNvbnN0cnVjdG9yKHZpZXc6IFBsYWluT2JqZWN0LCBwYXJlbnRDb250ZXh0PzogQ29udGV4dCkge1xuICAgICAgICB0aGlzLl92aWV3ICAgPSB2aWV3O1xuICAgICAgICB0aGlzLl9jYWNoZSAgPSB7ICcuJzogdGhpcy5fdmlldyB9O1xuICAgICAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnRDb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogVmlldyBwYXJhbWV0ZXIgZ2V0dGVyLlxuICAgICAqL1xuICAgIGdldCB2aWV3KCk6IFBsYWluT2JqZWN0IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZpZXc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBjb250ZXh0IHVzaW5nIHRoZSBnaXZlbiB2aWV3IHdpdGggdGhpcyBjb250ZXh0XG4gICAgICogYXMgdGhlIHBhcmVudC5cbiAgICAgKi9cbiAgICBwdXNoKHZpZXc6IFBsYWluT2JqZWN0KTogQ29udGV4dCB7XG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh2aWV3LCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGUgZ2l2ZW4gbmFtZSBpbiB0aGlzIGNvbnRleHQsIHRyYXZlcnNpbmdcbiAgICAgKiB1cCB0aGUgY29udGV4dCBoaWVyYXJjaHkgaWYgdGhlIHZhbHVlIGlzIGFic2VudCBpbiB0aGlzIGNvbnRleHQncyB2aWV3LlxuICAgICAqL1xuICAgIGxvb2t1cChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLl9jYWNoZTtcblxuICAgICAgICBsZXQgdmFsdWU6IHVua25vd247XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIG5hbWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNhY2hlW25hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGNvbnRleHQ6IENvbnRleHQgfCB1bmRlZmluZWQgPSB0aGlzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICBsZXQgaW50ZXJtZWRpYXRlVmFsdWU6IFVua25vd25PYmplY3QgfCB1bmRlZmluZWQgfCBudWxsO1xuICAgICAgICAgICAgbGV0IG5hbWVzOiBzdHJpbmdbXTtcbiAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IGxvb2t1cEhpdCA9IGZhbHNlO1xuXG4gICAgICAgICAgICB3aGlsZSAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGlmICgwIDwgbmFtZS5pbmRleE9mKCcuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBjb250ZXh0Ll92aWV3O1xuICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IG5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBVc2luZyB0aGUgZG90IG5vdGlvbiBwYXRoIGluIGBuYW1lYCwgd2UgZGVzY2VuZCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAgICAgICAgICAgKiBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogVG8gYmUgY2VydGFpbiB0aGF0IHRoZSBsb29rdXAgaGFzIGJlZW4gc3VjY2Vzc2Z1bCwgd2UgaGF2ZSB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBjaGVjayBpZiB0aGUgbGFzdCBvYmplY3QgaW4gdGhlIHBhdGggYWN0dWFsbHkgaGFzIHRoZSBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgKiB3ZSBhcmUgbG9va2luZyBmb3IuIFdlIHN0b3JlIHRoZSByZXN1bHQgaW4gYGxvb2t1cEhpdGAuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRoaXMgaXMgc3BlY2lhbGx5IG5lY2Vzc2FyeSBmb3Igd2hlbiB0aGUgdmFsdWUgaGFzIGJlZW4gc2V0IHRvXG4gICAgICAgICAgICAgICAgICAgICAqIGB1bmRlZmluZWRgIGFuZCB3ZSB3YW50IHRvIGF2b2lkIGxvb2tpbmcgdXAgcGFyZW50IGNvbnRleHRzLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBJbiB0aGUgY2FzZSB3aGVyZSBkb3Qgbm90YXRpb24gaXMgdXNlZCwgd2UgY29uc2lkZXIgdGhlIGxvb2t1cFxuICAgICAgICAgICAgICAgICAgICAgKiB0byBiZSBzdWNjZXNzZnVsIGV2ZW4gaWYgdGhlIGxhc3QgXCJvYmplY3RcIiBpbiB0aGUgcGF0aCBpc1xuICAgICAgICAgICAgICAgICAgICAgKiBub3QgYWN0dWFsbHkgYW4gb2JqZWN0IGJ1dCBhIHByaW1pdGl2ZSAoZS5nLiwgYSBzdHJpbmcsIG9yIGFuXG4gICAgICAgICAgICAgICAgICAgICAqIGludGVnZXIpLCBiZWNhdXNlIGl0IGlzIHNvbWV0aW1lcyB1c2VmdWwgdG8gYWNjZXNzIGEgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogb2YgYW4gYXV0b2JveGVkIHByaW1pdGl2ZSwgc3VjaCBhcyB0aGUgbGVuZ3RoIG9mIGEgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgKiovXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChudWxsICE9IGludGVybWVkaWF0ZVZhbHVlICYmIGluZGV4IDwgbmFtZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IG5hbWVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29rdXBIaXQgPSAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhcyhpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eShpbnRlcm1lZGlhdGVWYWx1ZSwgbmFtZXNbaW5kZXhdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlW25hbWVzW2luZGV4KytdXSBhcyBVbmtub3duT2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBjb250ZXh0Ll92aWV3W25hbWVdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiBPbmx5IGNoZWNraW5nIGFnYWluc3QgYGhhc1Byb3BlcnR5YCwgd2hpY2ggYWx3YXlzIHJldHVybnMgYGZhbHNlYCBpZlxuICAgICAgICAgICAgICAgICAgICAgKiBgY29udGV4dC52aWV3YCBpcyBub3QgYW4gb2JqZWN0LiBEZWxpYmVyYXRlbHkgb21pdHRpbmcgdGhlIGNoZWNrXG4gICAgICAgICAgICAgICAgICAgICAqIGFnYWluc3QgYHByaW1pdGl2ZUhhc093blByb3BlcnR5YCBpZiBkb3Qgbm90YXRpb24gaXMgbm90IHVzZWQuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIENvbnNpZGVyIHRoaXMgZXhhbXBsZTpcbiAgICAgICAgICAgICAgICAgICAgICogYGBgXG4gICAgICAgICAgICAgICAgICAgICAqIE11c3RhY2hlLnJlbmRlcihcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyB7eyNsZW5ndGh9fXt7bGVuZ3RofX17ey9sZW5ndGh9fS5cIiwge2xlbmd0aDogXCIxMDAgeWFyZHNcIn0pXG4gICAgICAgICAgICAgICAgICAgICAqIGBgYFxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBJZiB3ZSB3ZXJlIHRvIGNoZWNrIGFsc28gYWdhaW5zdCBgcHJpbWl0aXZlSGFzT3duUHJvcGVydHlgLCBhcyB3ZSBkb1xuICAgICAgICAgICAgICAgICAgICAgKiBpbiB0aGUgZG90IG5vdGF0aW9uIGNhc2UsIHRoZW4gcmVuZGVyIGNhbGwgd291bGQgcmV0dXJuOlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyA5LlwiXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIHJhdGhlciB0aGFuIHRoZSBleHBlY3RlZDpcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMgMTAwIHlhcmRzLlwiXG4gICAgICAgICAgICAgICAgICAgICAqKi9cbiAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gaGFzKGNvbnRleHQuX3ZpZXcsIG5hbWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb29rdXBIaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHQuX3BhcmVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FjaGVbbmFtZV0gPSB2YWx1ZSBhcyBvYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gKHZhbHVlIGFzIFVua25vd25GdW5jdGlvbikuY2FsbCh0aGlzLl92aWV3KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgdHlwZSBEZWxpbWl0ZXJzLFxuICAgIGdsb2JhbFNldHRpbmdzLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1doaXRlc3BhY2UsXG4gICAgZXNjYXBlVGVtcGxhdGVFeHAsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZWdleHAgPSB7XG4gICAgd2hpdGU6IC9cXHMqLyxcbiAgICBzcGFjZTogL1xccysvLFxuICAgIGVxdWFsczogL1xccyo9LyxcbiAgICBjdXJseTogL1xccypcXH0vLFxuICAgIHRhZzogLyN8XFxefFxcL3w+fFxce3wmfD18IS8sXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQ29tYmluZXMgdGhlIHZhbHVlcyBvZiBjb25zZWN1dGl2ZSB0ZXh0IHRva2VucyBpbiB0aGUgZ2l2ZW4gYHRva2Vuc2AgYXJyYXkgdG8gYSBzaW5nbGUgdG9rZW4uXG4gKi9cbmZ1bmN0aW9uIHNxdWFzaFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBzcXVhc2hlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuXG4gICAgbGV0IGxhc3RUb2tlbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgaWYgKCd0ZXh0JyA9PT0gdG9rZW5bJC5UWVBFXSAmJiBsYXN0VG9rZW4gJiYgJ3RleHQnID09PSBsYXN0VG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGxhc3RUb2tlblskLlZBTFVFXSArPSB0b2tlblskLlZBTFVFXTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5FTkRdID0gdG9rZW5bJC5FTkRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcXVhc2hlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcXVhc2hlZFRva2Vucztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEZvcm1zIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCBpbnRvIGEgbmVzdGVkIHRyZWUgc3RydWN0dXJlIHdoZXJlXG4gKiB0b2tlbnMgdGhhdCByZXByZXNlbnQgYSBzZWN0aW9uIGhhdmUgdHdvIGFkZGl0aW9uYWwgaXRlbXM6IDEpIGFuIGFycmF5IG9mXG4gKiBhbGwgdG9rZW5zIHRoYXQgYXBwZWFyIGluIHRoYXQgc2VjdGlvbiBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbFxuICogdGVtcGxhdGUgdGhhdCByZXByZXNlbnRzIHRoZSBlbmQgb2YgdGhhdCBzZWN0aW9uLlxuICovXG5mdW5jdGlvbiBuZXN0VG9rZW5zKHRva2VuczogVG9rZW5bXSk6IFRva2VuW10ge1xuICAgIGNvbnN0IG5lc3RlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuICAgIGxldCBjb2xsZWN0b3IgPSBuZXN0ZWRUb2tlbnM7XG4gICAgY29uc3Qgc2VjdGlvbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBzZWN0aW9uITogVG9rZW47XG4gICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICBjYXNlICcjJzpcbiAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgIGNvbGxlY3Rvci5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IgPSB0b2tlblskLlRPS0VOX0xJU1RdID0gW107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICcvJzpcbiAgICAgICAgICAgICAgICBzZWN0aW9uID0gc2VjdGlvbnMucG9wKCkhO1xuICAgICAgICAgICAgICAgIHNlY3Rpb25bJC5UQUdfSU5ERVhdID0gdG9rZW5bJC5TVEFSVF07XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSA6IG5lc3RlZFRva2VucztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXN0ZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQnJlYWtzIHVwIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHN0cmluZyBpbnRvIGEgdHJlZSBvZiB0b2tlbnMuIElmIHRoZSBgdGFnc2BcbiAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAqIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBPZlxuICogY291cnNlLCB0aGUgZGVmYXVsdCBpcyB0byB1c2UgbXVzdGFjaGVzIChpLmUuIG11c3RhY2hlLnRhZ3MpLlxuICpcbiAqIEEgdG9rZW4gaXMgYW4gYXJyYXkgd2l0aCBhdCBsZWFzdCA0IGVsZW1lbnRzLiBUaGUgZmlyc3QgZWxlbWVudCBpcyB0aGVcbiAqIG11c3RhY2hlIHN5bWJvbCB0aGF0IHdhcyB1c2VkIGluc2lkZSB0aGUgdGFnLCBlLmcuIFwiI1wiIG9yIFwiJlwiLiBJZiB0aGUgdGFnXG4gKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gKiBhbGwgdGV4dCB0aGF0IGFwcGVhcnMgb3V0c2lkZSBhIHN5bWJvbCB0aGlzIGVsZW1lbnQgaXMgXCJ0ZXh0XCIuXG4gKlxuICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICogd2hhdGV2ZXIgZWxzZSB3YXMgaW5zaWRlIHRoZSB0YWcgYmVzaWRlcyB0aGUgb3BlbmluZyBzeW1ib2wuIEZvciB0ZXh0IHRva2Vuc1xuICogdGhpcyBpcyB0aGUgdGV4dCBpdHNlbGYuXG4gKlxuICogVGhlIHRoaXJkIGFuZCBmb3VydGggZWxlbWVudHMgb2YgdGhlIHRva2VuIGFyZSB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2VzLFxuICogcmVzcGVjdGl2ZWx5LCBvZiB0aGUgdG9rZW4gaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLlxuICpcbiAqIFRva2VucyB0aGF0IGFyZSB0aGUgcm9vdCBub2RlIG9mIGEgc3VidHJlZSBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhblxuICogYXJyYXkgb2YgdG9rZW5zIGluIHRoZSBzdWJ0cmVlIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlIGF0XG4gKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gKlxuICogVG9rZW5zIGZvciBwYXJ0aWFscyBhbHNvIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGEgc3RyaW5nIHZhbHVlIG9mXG4gKiBpbmRlbmRhdGlvbiBwcmlvciB0byB0aGF0IHRhZyBhbmQgMikgdGhlIGluZGV4IG9mIHRoYXQgdGFnIG9uIHRoYXQgbGluZSAtXG4gKiBlZyBhIHZhbHVlIG9mIDIgaW5kaWNhdGVzIHRoZSBwYXJ0aWFsIGlzIHRoZSB0aGlyZCB0YWcgb24gdGhpcyBsaW5lLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSBzdHJpbmdcbiAqIEBwYXJhbSB0YWdzIGRlbGltaXRlcnMgZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZywgdGFncz86IERlbGltaXRlcnMpOiBUb2tlbltdIHtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgbGluZUhhc05vblNwYWNlICAgICA9IGZhbHNlO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107ICAgICAgIC8vIFN0YWNrIHRvIGhvbGQgc2VjdGlvbiB0b2tlbnNcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gICA9IFtdOyAgICAgICAvLyBCdWZmZXIgdG8gaG9sZCB0aGUgdG9rZW5zXG4gICAgY29uc3Qgc3BhY2VzOiBudW1iZXJbXSAgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgbGV0IGhhc1RhZyAgICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSB7e3RhZ319IG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IG5vblNwYWNlICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSBub24tc3BhY2UgY2hhciBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBpbmRlbnRhdGlvbiAgICAgICAgID0gJyc7ICAgICAgIC8vIFRyYWNrcyBpbmRlbnRhdGlvbiBmb3IgdGFncyB0aGF0IHVzZSBpdFxuICAgIGxldCB0YWdJbmRleCAgICAgICAgICAgID0gMDsgICAgICAgIC8vIFN0b3JlcyBhIGNvdW50IG9mIG51bWJlciBvZiB0YWdzIGVuY291bnRlcmVkIG9uIGEgbGluZVxuXG4gICAgLy8gU3RyaXBzIGFsbCB3aGl0ZXNwYWNlIHRva2VucyBhcnJheSBmb3IgdGhlIGN1cnJlbnQgbGluZVxuICAgIC8vIGlmIHRoZXJlIHdhcyBhIHt7I3RhZ319IG9uIGl0IGFuZCBvdGhlcndpc2Ugb25seSBzcGFjZS5cbiAgICBjb25zdCBzdHJpcFNwYWNlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoaGFzVGFnICYmICFub25TcGFjZSkge1xuICAgICAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG9rZW5zW3NwYWNlcy5wb3AoKSFdOyAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWFycmF5LWRlbGV0ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BhY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICAgIG5vblNwYWNlID0gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbXBpbGVUYWdzID0gKHRhZ3NUb0NvbXBpbGU6IHN0cmluZyB8IHN0cmluZ1tdKTogeyBvcGVuaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ0N1cmx5OiBSZWdFeHA7IH0gPT4ge1xuICAgICAgICBjb25zdCBlbnVtIFRhZyB7XG4gICAgICAgICAgICBPUEVOID0gMCxcbiAgICAgICAgICAgIENMT1NFLFxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1N0cmluZyh0YWdzVG9Db21waWxlKSkge1xuICAgICAgICAgICAgdGFnc1RvQ29tcGlsZSA9IHRhZ3NUb0NvbXBpbGUuc3BsaXQoX3JlZ2V4cC5zcGFjZSwgMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkodGFnc1RvQ29tcGlsZSkgfHwgMiAhPT0gdGFnc1RvQ29tcGlsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0YWdzOiAke0pTT04uc3RyaW5naWZ5KHRhZ3NUb0NvbXBpbGUpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcGVuaW5nVGFnOiAgIG5ldyBSZWdFeHAoYCR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuT1BFTl0pfVxcXFxzKmApLFxuICAgICAgICAgICAgY2xvc2luZ1RhZzogICBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXSl9YCksXG4gICAgICAgICAgICBjbG9zaW5nQ3VybHk6IG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAoYH0ke3RhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXX1gKX1gKSxcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyB0YWc6IHJlVGFnLCB3aGl0ZTogcmVXaGl0ZSwgZXF1YWxzOiByZUVxdWFscywgY3VybHk6IHJlQ3VybHkgfSA9IF9yZWdleHA7XG4gICAgbGV0IF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh0YWdzID8/IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuXG4gICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIGxldCBvcGVuU2VjdGlvbjogVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgd2hpbGUgKCFzY2FubmVyLmVvcykge1xuICAgICAgICBjb25zdCB7IG9wZW5pbmdUYWc6IHJlT3BlbmluZ1RhZywgY2xvc2luZ1RhZzogcmVDbG9zaW5nVGFnLCBjbG9zaW5nQ3VybHk6IHJlQ2xvc2luZ0N1cmx5IH0gPSBfcmVneHBUYWdzO1xuICAgICAgICBsZXQgdG9rZW46IFRva2VuO1xuICAgICAgICBsZXQgc3RhcnQgPSBzY2FubmVyLnBvcztcbiAgICAgICAgLy8gTWF0Y2ggYW55IHRleHQgYmV0d2VlbiB0YWdzLlxuICAgICAgICBsZXQgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZU9wZW5pbmdUYWcpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VzLnB1c2godG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9IGNocjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChbJ3RleHQnLCBjaHIsIHN0YXJ0LCBzdGFydCArIDFdKTtcbiAgICAgICAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHdoaXRlc3BhY2Ugb24gdGhlIGN1cnJlbnQgbGluZS5cbiAgICAgICAgICAgICAgICBpZiAoJ1xcbicgPT09IGNocikge1xuICAgICAgICAgICAgICAgICAgICBzdHJpcFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRhZ0luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIG9wZW5pbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZU9wZW5pbmdUYWcpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGhhc1RhZyA9IHRydWU7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdHlwZS5cbiAgICAgICAgbGV0IHR5cGUgPSBzY2FubmVyLnNjYW4ocmVUYWcpIHx8ICduYW1lJztcbiAgICAgICAgc2Nhbm5lci5zY2FuKHJlV2hpdGUpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHZhbHVlLlxuICAgICAgICBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9IGVsc2UgaWYgKCd7JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICAgICAgdHlwZSA9ICcmJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBjbG9zaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVDbG9zaW5nVGFnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCB0YWcgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnPicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3MsIGluZGVudGF0aW9uLCB0YWdJbmRleCwgbGluZUhhc05vblNwYWNlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3NdO1xuICAgICAgICB9XG4gICAgICAgIHRhZ0luZGV4Kys7XG4gICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgICBpZiAoJyMnID09PSB0eXBlIHx8ICdeJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSBpZiAoJy8nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICAgICAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgaWYgKCFvcGVuU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5vcGVuZWQgc2VjdGlvbiBcIiR7dmFsdWV9XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ25hbWUnID09PSB0eXBlIHx8ICd7JyA9PT0gdHlwZSB8fCAnJicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgICAgICBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RyaXBTcGFjZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuXG4gICAgaWYgKG9wZW5TZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdFRva2VucyhzcXVhc2hUb2tlbnModG9rZW5zKSk7XG59XG4iLCJpbXBvcnQgdHlwZSB7XG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlVmlld1BhcmFtLFxuICAgIFRlbXBsYXRlUGFydGlhbFBhcmFtLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFRva2VuLFxuICAgIFRva2VuQWRkcmVzcyBhcyAkLFxuICAgIGdsb2JhbFNldHRpbmdzLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IGNhY2hlLCBidWlsZENhY2hlS2V5IH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQge1xuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHBhcnNlVGVtcGxhdGUgfSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuXG4vKipcbiAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICogc3RyaW5nLCBnaXZlbiBhIGNvbnRleHQuIEl0IGFsc28gbWFpbnRhaW5zIGEgY2FjaGUgb2YgdGVtcGxhdGVzIHRvXG4gKiBhdm9pZCB0aGUgbmVlZCB0byBwYXJzZSB0aGUgc2FtZSB0ZW1wbGF0ZSB0d2ljZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFdyaXRlciBpbXBsZW1lbnRzIFRlbXBsYXRlV3JpdGVyIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBgdGFnc2Agb3JcbiAgICAgKiBgbXVzdGFjaGUudGFnc2AgaWYgYHRhZ3NgIGlzIG9taXR0ZWQsICBhbmQgcmV0dXJucyB0aGUgYXJyYXkgb2YgdG9rZW5zXG4gICAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAgICovXG4gICAgcGFyc2UodGVtcGxhdGU6IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHsgdG9rZW5zOiBUb2tlbltdOyBjYWNoZUtleTogc3RyaW5nOyB9IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBidWlsZENhY2hlS2V5KHRlbXBsYXRlLCB0YWdzID8/IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuICAgICAgICBsZXQgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldIGFzIFRva2VuW107XG4gICAgICAgIHRva2VucyA/Pz0gY2FjaGVbY2FjaGVLZXldID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIHJldHVybiB7IHRva2VucywgY2FjaGVLZXkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIaWdoLWxldmVsIG1ldGhvZCB0aGF0IGlzIHVzZWQgdG8gcmVuZGVyIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHdpdGhcbiAgICAgKiB0aGUgZ2l2ZW4gYHZpZXdgLlxuICAgICAqXG4gICAgICogVGhlIG9wdGlvbmFsIGBwYXJ0aWFsc2AgYXJndW1lbnQgbWF5IGJlIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZVxuICAgICAqIG5hbWVzIGFuZCB0ZW1wbGF0ZXMgb2YgcGFydGlhbHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgdGVtcGxhdGUuIEl0IG1heVxuICAgICAqIGFsc28gYmUgYSBmdW5jdGlvbiB0aGF0IGlzIHVzZWQgdG8gbG9hZCBwYXJ0aWFsIHRlbXBsYXRlcyBvbiB0aGUgZmx5XG4gICAgICogdGhhdCB0YWtlcyBhIHNpbmdsZSBhcmd1bWVudDogdGhlIG5hbWUgb2YgdGhlIHBhcnRpYWwuXG4gICAgICpcbiAgICAgKiBJZiB0aGUgb3B0aW9uYWwgYHRhZ3NgIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3b1xuICAgICAqIHN0cmluZyB2YWx1ZXM6IHRoZSBvcGVuaW5nIGFuZCBjbG9zaW5nIHRhZ3MgdXNlZCBpbiB0aGUgdGVtcGxhdGUgKGUuZy5cbiAgICAgKiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBUaGUgZGVmYXVsdCBpcyB0byBtdXN0YWNoZS50YWdzLlxuICAgICAqL1xuICAgIHJlbmRlcih0ZW1wbGF0ZTogc3RyaW5nLCB2aWV3OiBUZW1wbGF0ZVZpZXdQYXJhbSwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgdmlldywgcGFydGlhbHMsIHRlbXBsYXRlLCB0YWdzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb3ctbGV2ZWwgbWV0aG9kIHRoYXQgcmVuZGVycyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgdXNpbmdcbiAgICAgKiB0aGUgZ2l2ZW4gYGNvbnRleHRgIGFuZCBgcGFydGlhbHNgLlxuICAgICAqXG4gICAgICogTm90ZTogVGhlIGBvcmlnaW5hbFRlbXBsYXRlYCBpcyBvbmx5IGV2ZXIgdXNlZCB0byBleHRyYWN0IHRoZSBwb3J0aW9uXG4gICAgICogb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgd2FzIGNvbnRhaW5lZCBpbiBhIGhpZ2hlci1vcmRlciBzZWN0aW9uLlxuICAgICAqIElmIHRoZSB0ZW1wbGF0ZSBkb2Vzbid0IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMsIHRoaXMgYXJndW1lbnQgbWF5XG4gICAgICogYmUgb21pdHRlZC5cbiAgICAgKi9cbiAgICByZW5kZXJUb2tlbnModG9rZW5zOiBUb2tlbltdLCB2aWV3OiBUZW1wbGF0ZVZpZXdQYXJhbSwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSAodmlldyBpbnN0YW5jZW9mIENvbnRleHQpID8gdmlldyA6IG5ldyBDb250ZXh0KHZpZXcgYXMgUGxhaW5PYmplY3QpO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG5cbiAgICAgICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdm9pZCB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJyMnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyU2VjdGlvbih0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdeJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJlbmRlckludmVydGVkKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJz4nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVyUGFydGlhbCh0b2tlbiwgY29udGV4dCwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICcmJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnVuZXNjYXBlZFZhbHVlKHRva2VuLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0ZXh0JzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhd1ZhbHVlKHRva2VuKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJTZWN0aW9uKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuICAgICAgICBsZXQgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG5cbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIHJlbmRlciBhbiBhcmJpdHJhcnkgdGVtcGxhdGVcbiAgICAgICAgLy8gaW4gdGhlIGN1cnJlbnQgY29udGV4dCBieSBoaWdoZXItb3JkZXIgc2VjdGlvbnMuXG4gICAgICAgIGNvbnN0IHN1YlJlbmRlciA9ICh0ZW1wbGF0ZTogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLnJlbmRlcih0ZW1wbGF0ZSwgY29udGV4dCwgcGFydGlhbHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB2IG9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHYpLCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZiB2YWx1ZSB8fCAnc3RyaW5nJyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdudW1iZXInID09PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQucHVzaCh2YWx1ZSBhcyBQbGFpbk9iamVjdCksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2Ygb3JpZ2luYWxUZW1wbGF0ZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHVzZSBoaWdoZXItb3JkZXIgc2VjdGlvbnMgd2l0aG91dCB0aGUgb3JpZ2luYWwgdGVtcGxhdGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgdGhlIHBvcnRpb24gb2YgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHRoYXQgdGhlIHNlY3Rpb24gY29udGFpbnMuXG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwoY29udGV4dC52aWV3LCBvcmlnaW5hbFRlbXBsYXRlLnNsaWNlKHRva2VuWyQuRU5EXSwgdG9rZW5bJC5UQUdfSU5ERVhdKSwgc3ViUmVuZGVyKTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyICs9IHZhbHVlIGFzIG51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlckludmVydGVkKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM/OiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSwgb3JpZ2luYWxUZW1wbGF0ZT86IHN0cmluZyk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCAoaXNBcnJheSh2YWx1ZSkgJiYgMCA9PT0gdmFsdWUubGVuZ3RoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgaW5kZW50UGFydGlhbChwYXJ0aWFsOiBzdHJpbmcsIGluZGVudGF0aW9uOiBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZTogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkSW5kZW50YXRpb24gPSBpbmRlbnRhdGlvbi5yZXBsYWNlKC9bXiBcXHRdL2csICcnKTtcbiAgICAgICAgY29uc3QgcGFydGlhbEJ5TmwgPSBwYXJ0aWFsLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0aWFsQnlObC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHBhcnRpYWxCeU5sW2ldLmxlbmd0aCAmJiAoaSA+IDAgfHwgIWxpbmVIYXNOb25TcGFjZSkpIHtcbiAgICAgICAgICAgICAgICBwYXJ0aWFsQnlObFtpXSA9IGZpbHRlcmVkSW5kZW50YXRpb24gKyBwYXJ0aWFsQnlObFtpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFydGlhbEJ5Tmwuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVyUGFydGlhbCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzOiBUZW1wbGF0ZVBhcnRpYWxQYXJhbSB8IHVuZGVmaW5lZCwgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGlmICghcGFydGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHZhbHVlID0gKGlzRnVuY3Rpb24ocGFydGlhbHMpID8gcGFydGlhbHModG9rZW5bJC5WQUxVRV0pIDogcGFydGlhbHNbdG9rZW5bJC5WQUxVRV1dKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lSGFzTm9uU3BhY2UgPSB0b2tlblskLkhBU19OT19TUEFDRV07XG4gICAgICAgICAgICBjb25zdCB0YWdJbmRleCAgICAgICAgPSB0b2tlblskLlRBR19JTkRFWF07XG4gICAgICAgICAgICBjb25zdCBpbmRlbnRhdGlvbiAgICAgPSB0b2tlblskLlRPS0VOX0xJU1RdO1xuICAgICAgICAgICAgbGV0IGluZGVudGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmICgwID09PSB0YWdJbmRleCAmJiBpbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgIGluZGVudGVkVmFsdWUgPSB0aGlzLmluZGVudFBhcnRpYWwodmFsdWUsIGluZGVudGF0aW9uIGFzIHN0cmluZywgbGluZUhhc05vblNwYWNlISk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB7IHRva2VucyB9ID0gdGhpcy5wYXJzZShpbmRlbnRlZFZhbHVlLCB0YWdzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlbnMsIGNvbnRleHQsIHBhcnRpYWxzLCBpbmRlbnRlZFZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVuZXNjYXBlZFZhbHVlKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBlc2NhcGVkVmFsdWUodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFNldHRpbmdzLmVzY2FwZSh2YWx1ZSBhcyBzdHJpbmcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmF3VmFsdWUodG9rZW46IFRva2VuKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRva2VuWyQuVkFMVUVdO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHtcbiAgICBKU1QsXG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIElUZW1wbGF0ZUVuZ2luZSxcbiAgICBUZW1wbGF0ZVNjYW5uZXIsXG4gICAgVGVtcGxhdGVDb250ZXh0LFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGdsb2JhbFNldHRpbmdzIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBDYWNoZUxvY2F0aW9uLCBjbGVhckNhY2hlIH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQge1xuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgdHlwZVN0cmluZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBTY2FubmVyIH0gZnJvbSAnLi9zY2FubmVyJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHsgV3JpdGVyIH0gZnJvbSAnLi93cml0ZXInO1xuXG4vKioge0BsaW5rIFRlbXBsYXRlRW5naW5lfSBjb21tb24gc2V0dGluZ3MgKi9cbmdsb2JhbFNldHRpbmdzLndyaXRlciA9IG5ldyBXcml0ZXIoKTtcblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRlbXBsYXRlRW5naW5lfSBnbG9iYWwgc2V0dG5nIG9wdGlvbnNcbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IOOCsOODreODvOODkOODq+ioreWumuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlR2xvYmFsU2V0dGluZ3Mge1xuICAgIHdyaXRlcj86IFRlbXBsYXRlV3JpdGVyO1xuICAgIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnM7XG4gICAgZXNjYXBlPzogVGVtcGxhdGVFc2NhcGVyO1xufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IGNvbXBpbGUgb3B0aW9uc1xuICogQGphIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0g44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVDb21waWxlT3B0aW9ucyB7XG4gICAgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycztcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGVFbmdpbmUgdXRpbGl0eSBjbGFzcy5cbiAqIEBqYSBUZW1wbGF0ZUVuZ2luZSDjg6bjg7zjg4bjgqPjg6rjg4bjgqPjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlRW5naW5lIGltcGxlbWVudHMgSVRlbXBsYXRlRW5naW5lIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIEpTVH0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSB7QGxpbmsgSlNUfSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zKTogSlNUIHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyh0ZW1wbGF0ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEludmFsaWQgdGVtcGxhdGUhIHRoZSBmaXJzdCBhcmd1bWVudCBzaG91bGQgYmUgYSBcInN0cmluZ1wiIGJ1dCBcIiR7dHlwZVN0cmluZyh0ZW1wbGF0ZSl9XCIgd2FzIGdpdmVuIGZvciBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKHRlbXBsYXRlLCBvcHRpb25zKWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0YWdzIH0gPSBvcHRpb25zID8/IGdsb2JhbFNldHRpbmdzO1xuICAgICAgICBjb25zdCB7IHdyaXRlciB9ID0gZ2xvYmFsU2V0dGluZ3M7XG5cbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCwgcGFydGlhbHM/OiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyLnJlbmRlcih0ZW1wbGF0ZSwgdmlldyA/PyB7fSwgcGFydGlhbHMsIHRhZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHsgdG9rZW5zLCBjYWNoZUtleSB9ID0gd3JpdGVyLnBhcnNlKHRlbXBsYXRlLCB0YWdzKTtcbiAgICAgICAganN0LnRva2VucyAgICAgICAgPSB0b2tlbnM7XG4gICAgICAgIGpzdC5jYWNoZUtleSAgICAgID0gY2FjaGVLZXk7XG4gICAgICAgIGpzdC5jYWNoZUxvY2F0aW9uID0gW0NhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1RdO1xuXG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFycyBhbGwgY2FjaGVkIHRlbXBsYXRlcyBpbiB0aGUgZGVmYXVsdCB7QGxpbmsgVGVtcGxhdGVXcml0ZXJ9LlxuICAgICAqIEBqYSDml6Llrprjga4ge0BsaW5rIFRlbXBsYXRlV3JpdGVyfSDjga7jgZnjgbnjgabjga7jgq3jg6Pjg4Pjgrfjg6XjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGNsZWFyQ2FjaGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gZ2xvYmFsIHNldHRpbmdzLlxuICAgICAqIEBqYSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IOOCsOODreODvOODkOODq+ioreWumuOBruabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIHNldHRpbmdzXG4gICAgICogIC0gYGVuYCBuZXcgc2V0dGluZ3NcbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOioreWumuWApFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgc2V0dGluZ3NcbiAgICAgKiAgLSBgamFgIOWPpOOBhOioreWumuWApFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0R2xvYmFsU2V0dGluZ3Moc2V0aWluZ3M6IFRlbXBsYXRlR2xvYmFsU2V0dGluZ3MpOiBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLmdsb2JhbFNldHRpbmdzIH07XG4gICAgICAgIGNvbnN0IHsgd3JpdGVyLCB0YWdzLCBlc2NhcGUgfSA9IHNldGlpbmdzO1xuICAgICAgICB3cml0ZXIgJiYgKGdsb2JhbFNldHRpbmdzLndyaXRlciA9IHdyaXRlcik7XG4gICAgICAgIHRhZ3MgICAmJiAoZ2xvYmFsU2V0dGluZ3MudGFncyAgID0gdGFncyk7XG4gICAgICAgIGVzY2FwZSAmJiAoZ2xvYmFsU2V0dGluZ3MuZXNjYXBlID0gZXNjYXBlKTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBzdGF0aWMgbWV0aG9kczogZm9yIGRlYnVnXG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSB7QGxpbmsgVGVtcGxhdGVTY2FubmVyfSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlU2Nhbm5lcihzcmM6IHN0cmluZyk6IFRlbXBsYXRlU2Nhbm5lciB7XG4gICAgICAgIHJldHVybiBuZXcgU2Nhbm5lcihzcmMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIHtAbGluayBUZW1wbGF0ZUNvbnRleHR9IGluc3RhbmNlICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVDb250ZXh0KHZpZXc6IFBsYWluT2JqZWN0LCBwYXJlbnRDb250ZXh0PzogQ29udGV4dCk6IFRlbXBsYXRlQ29udGV4dCB7XG4gICAgICAgIHJldHVybiBuZXcgQ29udGV4dCh2aWV3LCBwYXJlbnRDb250ZXh0KTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSB7QGxpbmsgVGVtcGxhdGVXcml0ZXJ9IGluc3RhbmNlICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVXcml0ZXIoKTogVGVtcGxhdGVXcml0ZXIge1xuICAgICAgICByZXR1cm4gbmV3IFdyaXRlcigpO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBc0NBO0FBQ08sTUFBTSxjQUFjLEdBQUc7QUFDMUIsSUFBQSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0FBQ2xCLElBQUEsTUFBTSxFQUFFLFVBQVU7Q0FLckI7O0FDNUJEOzs7OztBQUtHO0FBQ2EsU0FBQSxhQUFhLENBQUMsUUFBZ0IsRUFBRSxJQUF3QixFQUFBO0lBQ3BFLE9BQU8sQ0FBQSxFQUFHLFFBQVEsQ0FBQSxDQUFBLEVBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQSxDQUFFO0FBQzFDO0FBRUE7Ozs7O0FBS0c7U0FDYSxVQUFVLEdBQUE7QUFDdEIsSUFBQSxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQSxhQUFBLCtCQUF5QjtJQUM3RCxTQUFTLENBQUEsZ0JBQUEsMEJBQW9CLEdBQUcsRUFBRTtBQUN0QztBQUVBO0FBQ08sTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFjLElBQUkseUZBQThDOztBQzVCakc7OztBQUdHO0FBQ0csU0FBVSxVQUFVLENBQUMsR0FBWSxFQUFBO0FBQ25DLElBQUEsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxHQUFHLE9BQU8sR0FB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