/*!
 * @cdp/core-template 0.9.0
 *   template engine
 */

import { escapeHTML, ensureObject, getGlobalNamespace, isArray, isPrimitive, has, isFunction, isString } from '@cdp/core-utils';

const globalSettings = {
    tags: ['{{', '}}'],
    escape: escapeHTML,
};

/**
 * @en Build cache key.
 * @ja キャッシュキーの生成
 */
function buildCacheKey(template, tags) {
    return `${template}:${tags.join(':')}`;
}
/**
 * @en Clears all cached templates in cache pool.
 * @ja すべてのテンプレートキャッシュを破棄
 */
function clearCache() {
    const namespace = getGlobalNamespace("CDP_DECLARE" /* NAMESPACE */);
    namespace["TEMPLATE_CACHE" /* ROOT */] = {};
}
/** global cache pool */
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

/* eslint-disable
    @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/no-this-alias
 */
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
            let context = this;
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
     * @package template
     *  - `en` template source string
     *  - `ja` テンプレート文字列
     * @package options
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS10ZW1wbGF0ZS5tanMiLCJzb3VyY2VzIjpbImludGVybmFsLnRzIiwiY2FjaGUudHMiLCJ1dGlscy50cyIsInNjYW5uZXIudHMiLCJjb250ZXh0LnRzIiwicGFyc2UudHMiLCJ3cml0ZXIudHMiLCJjbGFzcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2NhcGVIVE1MIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVUYWdzLFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIChzdHJpbmcgfCBUb2tlbltdKSAqL1xudHlwZSBUb2tlbkxpc3QgPSB1bmtub3duO1xuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlRW5naW5lXV0gdG9rZW4gc3RydWN0dXJlLlxuICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSB0b2tlbiDlnotcbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBbc3RyaW5nLCBzdHJpbmcsIG51bWJlciwgbnVtYmVyLCBUb2tlbkxpc3Q/LCBudW1iZXI/LCBib29sZWFuP107XG5cbi8qKlxuICogQGVuIFtbVG9rZW5dXSBhZGRyZXNzIGlkLlxuICogQGphIFtbVG9rZW5dXSDjgqLjg4njg6zjgrnorZjliKXlrZBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gVG9rZW5BZGRyZXNzIHtcbiAgICBUWVBFID0gMCxcbiAgICBWQUxVRSxcbiAgICBTVEFSVCxcbiAgICBFTkQsXG4gICAgVE9LRU5fTElTVCxcbiAgICBUQUdfSU5ERVgsXG4gICAgSEFTX05PX1NQQUNFLFxufVxuXG4vKipcbiAqIEBlbiBJbnRlcm5hbCBkZWxpbWl0ZXJzIGRlZmluaXRpb24gZm9yIFtbVGVtcGxhdGVFbmdpbmVdXS4gZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0g44Gu5YaF6YOo44Gn5L2/55So44GZ44KL5Yy65YiH44KK5paH5a2XIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKi9cbmV4cG9ydCB0eXBlIERlbGltaXRlcnMgPSBzdHJpbmcgfCBUZW1wbGF0ZVRhZ3M7XG5cbmV4cG9ydCBjb25zdCBnbG9iYWxTZXR0aW5ncyA9IHtcbiAgICB0YWdzOiBbJ3t7JywgJ319J10sXG4gICAgZXNjYXBlOiBlc2NhcGVIVE1MLFxufSBhcyB7XG4gICAgdGFnczogVGVtcGxhdGVUYWdzO1xuICAgIGVzY2FwZTogVGVtcGxhdGVFc2NhcGVyO1xuICAgIHdyaXRlcjogVGVtcGxhdGVXcml0ZXI7XG59O1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBlbnN1cmVPYmplY3QsXG4gICAgZ2V0R2xvYmFsTmFtZXNwYWNlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgVGVtcGxhdGVUYWdzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gQ2FjaGUgbG9jYXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEg44Kt44Oj44OD44K344Ol44Ot44Kx44O844K344On44Oz5oOF5aCxXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhY2hlTG9jYXRpb24ge1xuICAgIE5BTUVTUEFDRSA9ICdDRFBfREVDTEFSRScsXG4gICAgUk9PVCAgICAgID0gJ1RFTVBMQVRFX0NBQ0hFJyxcbn1cblxuLyoqXG4gKiBAZW4gQnVpbGQgY2FjaGUga2V5LlxuICogQGphIOOCreODo+ODg+OCt+ODpeOCreODvOOBrueUn+aIkFxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYWNoZUtleSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzOiBUZW1wbGF0ZVRhZ3MpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0ZW1wbGF0ZX06JHt0YWdzLmpvaW4oJzonKX1gO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gY2FjaGUgcG9vbC5cbiAqIEBqYSDjgZnjgbnjgabjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gZ2V0R2xvYmFsTmFtZXNwYWNlKENhY2hlTG9jYXRpb24uTkFNRVNQQUNFKTtcbiAgICBuYW1lc3BhY2VbQ2FjaGVMb2NhdGlvbi5ST09UXSA9IHt9O1xufVxuXG4vKiogZ2xvYmFsIGNhY2hlIHBvb2wgKi9cbmV4cG9ydCBjb25zdCBjYWNoZSA9IGVuc3VyZU9iamVjdDxQbGFpbk9iamVjdD4obnVsbCwgQ2FjaGVMb2NhdGlvbi5OQU1FU1BBQ0UsIENhY2hlTG9jYXRpb24uUk9PVCk7XG4iLCJpbXBvcnQgeyBpc0FycmF5LCBpc1ByaW1pdGl2ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5leHBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBoYXMsXG4gICAgZXNjYXBlSFRNTCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBNb3JlIGNvcnJlY3QgdHlwZW9mIHN0cmluZyBoYW5kbGluZyBhcnJheVxuICogd2hpY2ggbm9ybWFsbHkgcmV0dXJucyB0eXBlb2YgJ29iamVjdCdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHR5cGVTdHJpbmcoc3JjOiB1bmtub3duKTogc3RyaW5nIHtcbiAgICByZXR1cm4gaXNBcnJheShzcmMpID8gJ2FycmF5JyA6IHR5cGVvZiBzcmM7XG59XG5cbi8qKlxuICogRXNjYXBlIGZvciB0ZW1wbGF0ZSdzIGV4cHJlc3Npb24gY2hhcmFjdG9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZVRlbXBsYXRlRXhwKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICByZXR1cm4gc3JjLnJlcGxhY2UoL1stXFxbXFxde30oKSorPy4sXFxcXFxcXiR8I1xcc10vZywgJ1xcXFwkJicpO1xufVxuXG4vKipcbiAqIFNhZmUgd2F5IG9mIGRldGVjdGluZyB3aGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gdGhpbmcgaXMgYSBwcmltaXRpdmUgYW5kXG4gKiB3aGV0aGVyIGl0IGhhcyB0aGUgZ2l2ZW4gcHJvcGVydHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByaW1pdGl2ZUhhc093blByb3BlcnR5KHNyYzogdW5rbm93biwgcHJvcE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBpc1ByaW1pdGl2ZShzcmMpICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzcmMsIHByb3BOYW1lKTtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGl0ZXNwYWNlIGNoYXJhY3RvciBleGlzdHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1doaXRlc3BhY2Uoc3JjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIS9cXFMvLnRlc3Qoc3JjKTtcbn1cbiIsImltcG9ydCB7IFRlbXBsYXRlU2Nhbm5lciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQSBzaW1wbGUgc3RyaW5nIHNjYW5uZXIgdGhhdCBpcyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBwYXJzZXIgdG8gZmluZFxuICogdG9rZW5zIGluIHRlbXBsYXRlIHN0cmluZ3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY2FubmVyIGltcGxlbWVudHMgVGVtcGxhdGVTY2FubmVyIHtcbiAgICBwcml2YXRlIF9zb3VyY2U6IHN0cmluZztcbiAgICBwcml2YXRlIF90YWlsOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfcG9zOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNyYzogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IHRoaXMuX3RhaWwgPSBzcmM7XG4gICAgICAgIHRoaXMuX3BvcyA9IDA7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGN1cnJlbnQgc2Nhbm5pbmcgcG9zaXRpb24uXG4gICAgICovXG4gICAgZ2V0IHBvcygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fcG9zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgc3RyaW5nICBzb3VyY2UuXG4gICAgICovXG4gICAgZ2V0IHNvdXJjZSgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIHRoZSB0YWlsIGlzIGVtcHR5IChlbmQgb2Ygc3RyaW5nKS5cbiAgICAgKi9cbiAgICBnZXQgZW9zKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gJycgPT09IHRoaXMuX3RhaWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gbWF0Y2ggdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBhdCB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICAgKiBSZXR1cm5zIHRoZSBtYXRjaGVkIHRleHQgaWYgaXQgY2FuIG1hdGNoLCB0aGUgZW1wdHkgc3RyaW5nIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzY2FuKHJlZ2V4cDogUmVnRXhwKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSByZWdleHAuZXhlYyh0aGlzLl90YWlsKTtcblxuICAgICAgICBpZiAoIW1hdGNoIHx8IDAgIT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdHJpbmcgPSBtYXRjaFswXTtcblxuICAgICAgICB0aGlzLl90YWlsID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoc3RyaW5nLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuX3BvcyArPSBzdHJpbmcubGVuZ3RoO1xuXG4gICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2tpcHMgYWxsIHRleHQgdW50aWwgdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBjYW4gYmUgbWF0Y2hlZC4gUmV0dXJuc1xuICAgICAqIHRoZSBza2lwcGVkIHN0cmluZywgd2hpY2ggaXMgdGhlIGVudGlyZSB0YWlsIGlmIG5vIG1hdGNoIGNhbiBiZSBtYWRlLlxuICAgICAqL1xuICAgIHNjYW5VbnRpbChyZWdleHA6IFJlZ0V4cCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fdGFpbC5zZWFyY2gocmVnZXhwKTtcbiAgICAgICAgbGV0IG1hdGNoOiBzdHJpbmc7XG5cbiAgICAgICAgc3dpdGNoIChpbmRleCkge1xuICAgICAgICAgICAgY2FzZSAtMTpcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRoaXMuX3RhaWw7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGFpbCA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIG1hdGNoID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIG1hdGNoID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoMCwgaW5kZXgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhaWwgPSB0aGlzLl90YWlsLnN1YnN0cmluZyhpbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wb3MgKz0gbWF0Y2gubGVuZ3RoO1xuXG4gICAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICovXG5cbmltcG9ydCB7IFRlbXBsYXRlQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIHByaW1pdGl2ZUhhc093blByb3BlcnR5LFxufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyaW5nIGNvbnRleHQgYnkgd3JhcHBpbmcgYSB2aWV3IG9iamVjdCBhbmRcbiAqIG1haW50YWluaW5nIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgY29udGV4dC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQgaW1wbGVtZW50cyBUZW1wbGF0ZUNvbnRleHQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3ZpZXc6IFBsYWluT2JqZWN0O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BhcmVudD86IENvbnRleHQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY2FjaGU6IFBsYWluT2JqZWN0O1xuXG4gICAgLyoqIGNvbnN0cnVjdG9yICovXG4gICAgY29uc3RydWN0b3IodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX3ZpZXcgICA9IHZpZXc7XG4gICAgICAgIHRoaXMuX2NhY2hlICA9IHsgJy4nOiB0aGlzLl92aWV3IH07XG4gICAgICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudENvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBWaWV3IHBhcmFtZXRlciBnZXR0ZXIuXG4gICAgICovXG4gICAgZ2V0IHZpZXcoKTogUGxhaW5PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmlldztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRleHQgdXNpbmcgdGhlIGdpdmVuIHZpZXcgd2l0aCB0aGlzIGNvbnRleHRcbiAgICAgKiBhcyB0aGUgcGFyZW50LlxuICAgICAqL1xuICAgIHB1c2godmlldzogUGxhaW5PYmplY3QpOiBDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBnaXZlbiBuYW1lIGluIHRoaXMgY29udGV4dCwgdHJhdmVyc2luZ1xuICAgICAqIHVwIHRoZSBjb250ZXh0IGhpZXJhcmNoeSBpZiB0aGUgdmFsdWUgaXMgYWJzZW50IGluIHRoaXMgY29udGV4dCdzIHZpZXcuXG4gICAgICovXG4gICAgbG9va3VwKG5hbWU6IHN0cmluZyk6IGFueSB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fY2FjaGU7XG5cbiAgICAgICAgbGV0IHZhbHVlOiBhbnk7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY2FjaGUsIG5hbWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNhY2hlW25hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGNvbnRleHQ6IENvbnRleHQgfCB1bmRlZmluZWQgPSB0aGlzO1xuICAgICAgICAgICAgbGV0IGludGVybWVkaWF0ZVZhbHVlOiBQbGFpbk9iamVjdDtcbiAgICAgICAgICAgIGxldCBuYW1lczogc3RyaW5nW107XG4gICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlcjtcbiAgICAgICAgICAgIGxldCBsb29rdXBIaXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgd2hpbGUgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoMCA8IG5hbWUuaW5kZXhPZignLicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlldztcbiAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogVXNpbmcgdGhlIGRvdCBub3Rpb24gcGF0aCBpbiBgbmFtZWAsIHdlIGRlc2NlbmQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICogbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRvIGJlIGNlcnRhaW4gdGhhdCB0aGUgbG9va3VwIGhhcyBiZWVuIHN1Y2Nlc3NmdWwsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgICogY2hlY2sgaWYgdGhlIGxhc3Qgb2JqZWN0IGluIHRoZSBwYXRoIGFjdHVhbGx5IGhhcyB0aGUgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogd2UgYXJlIGxvb2tpbmcgZm9yLiBXZSBzdG9yZSB0aGUgcmVzdWx0IGluIGBsb29rdXBIaXRgLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBUaGlzIGlzIHNwZWNpYWxseSBuZWNlc3NhcnkgZm9yIHdoZW4gdGhlIHZhbHVlIGhhcyBiZWVuIHNldCB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBgdW5kZWZpbmVkYCBhbmQgd2Ugd2FudCB0byBhdm9pZCBsb29raW5nIHVwIHBhcmVudCBjb250ZXh0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSW4gdGhlIGNhc2Ugd2hlcmUgZG90IG5vdGF0aW9uIGlzIHVzZWQsIHdlIGNvbnNpZGVyIHRoZSBsb29rdXBcbiAgICAgICAgICAgICAgICAgICAgICogdG8gYmUgc3VjY2Vzc2Z1bCBldmVuIGlmIHRoZSBsYXN0IFwib2JqZWN0XCIgaW4gdGhlIHBhdGggaXNcbiAgICAgICAgICAgICAgICAgICAgICogbm90IGFjdHVhbGx5IGFuIG9iamVjdCBidXQgYSBwcmltaXRpdmUgKGUuZy4sIGEgc3RyaW5nLCBvciBhblxuICAgICAgICAgICAgICAgICAgICAgKiBpbnRlZ2VyKSwgYmVjYXVzZSBpdCBpcyBzb21ldGltZXMgdXNlZnVsIHRvIGFjY2VzcyBhIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAqIG9mIGFuIGF1dG9ib3hlZCBwcmltaXRpdmUsIHN1Y2ggYXMgdGhlIGxlbmd0aCBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAobnVsbCAhPSBpbnRlcm1lZGlhdGVWYWx1ZSAmJiBpbmRleCA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBuYW1lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXMoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZVtuYW1lc1tpbmRleCsrXV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcm1lZGlhdGVWYWx1ZSA9IGNvbnRleHQuX3ZpZXdbbmFtZV07XG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIE9ubHkgY2hlY2tpbmcgYWdhaW5zdCBgaGFzUHJvcGVydHlgLCB3aGljaCBhbHdheXMgcmV0dXJucyBgZmFsc2VgIGlmXG4gICAgICAgICAgICAgICAgICAgICAqIGBjb250ZXh0LnZpZXdgIGlzIG5vdCBhbiBvYmplY3QuIERlbGliZXJhdGVseSBvbWl0dGluZyB0aGUgY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICogYWdhaW5zdCBgcHJpbWl0aXZlSGFzT3duUHJvcGVydHlgIGlmIGRvdCBub3RhdGlvbiBpcyBub3QgdXNlZC5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogQ29uc2lkZXIgdGhpcyBleGFtcGxlOlxuICAgICAgICAgICAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgICAgICAgICAgICogTXVzdGFjaGUucmVuZGVyKFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIHt7I2xlbmd0aH19e3tsZW5ndGh9fXt7L2xlbmd0aH19LlwiLCB7bGVuZ3RoOiBcIjEwMCB5YXJkc1wifSlcbiAgICAgICAgICAgICAgICAgICAgICogYGBgXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIElmIHdlIHdlcmUgdG8gY2hlY2sgYWxzbyBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAsIGFzIHdlIGRvXG4gICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBkb3Qgbm90YXRpb24gY2FzZSwgdGhlbiByZW5kZXIgY2FsbCB3b3VsZCByZXR1cm46XG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDkuXCJcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogcmF0aGVyIHRoYW4gdGhlIGV4cGVjdGVkOlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBcIlRoZSBsZW5ndGggb2YgYSBmb290YmFsbCBmaWVsZCBpcyAxMDAgeWFyZHMuXCJcbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICBsb29rdXBIaXQgPSBoYXMoY29udGV4dC5fdmlldywgbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvb2t1cEhpdCkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGludGVybWVkaWF0ZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dC5fcGFyZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWNoZVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwodGhpcy5fdmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBUb2tlbixcbiAgICBUb2tlbkFkZHJlc3MgYXMgJCxcbiAgICBEZWxpbWl0ZXJzLFxuICAgIGdsb2JhbFNldHRpbmdzLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1doaXRlc3BhY2UsXG4gICAgZXNjYXBlVGVtcGxhdGVFeHAsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZWdleHAgPSB7XG4gICAgd2hpdGU6IC9cXHMqLyxcbiAgICBzcGFjZTogL1xccysvLFxuICAgIGVxdWFsczogL1xccyo9LyxcbiAgICBjdXJseTogL1xccypcXH0vLFxuICAgIHRhZzogLyN8XFxefFxcL3w+fFxce3wmfD18IS8sXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQ29tYmluZXMgdGhlIHZhbHVlcyBvZiBjb25zZWN1dGl2ZSB0ZXh0IHRva2VucyBpbiB0aGUgZ2l2ZW4gYHRva2Vuc2AgYXJyYXkgdG8gYSBzaW5nbGUgdG9rZW4uXG4gKi9cbmZ1bmN0aW9uIHNxdWFzaFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBzcXVhc2hlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuXG4gICAgbGV0IGxhc3RUb2tlbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgaWYgKCd0ZXh0JyA9PT0gdG9rZW5bJC5UWVBFXSAmJiBsYXN0VG9rZW4gJiYgJ3RleHQnID09PSBsYXN0VG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGxhc3RUb2tlblskLlZBTFVFXSArPSB0b2tlblskLlZBTFVFXTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5FTkRdID0gdG9rZW5bJC5FTkRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcXVhc2hlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcXVhc2hlZFRva2Vucztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEZvcm1zIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCBpbnRvIGEgbmVzdGVkIHRyZWUgc3RydWN0dXJlIHdoZXJlXG4gKiB0b2tlbnMgdGhhdCByZXByZXNlbnQgYSBzZWN0aW9uIGhhdmUgdHdvIGFkZGl0aW9uYWwgaXRlbXM6IDEpIGFuIGFycmF5IG9mXG4gKiBhbGwgdG9rZW5zIHRoYXQgYXBwZWFyIGluIHRoYXQgc2VjdGlvbiBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbFxuICogdGVtcGxhdGUgdGhhdCByZXByZXNlbnRzIHRoZSBlbmQgb2YgdGhhdCBzZWN0aW9uLlxuICovXG5mdW5jdGlvbiBuZXN0VG9rZW5zKHRva2VuczogVG9rZW5bXSk6IFRva2VuW10ge1xuICAgIGNvbnN0IG5lc3RlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuICAgIGxldCBjb2xsZWN0b3IgPSBuZXN0ZWRUb2tlbnM7XG4gICAgY29uc3Qgc2VjdGlvbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBzZWN0aW9uITogVG9rZW47XG4gICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICBjYXNlICcjJzpcbiAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgIGNvbGxlY3Rvci5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IgPSB0b2tlblskLlRPS0VOX0xJU1RdID0gW107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICcvJzpcbiAgICAgICAgICAgICAgICBzZWN0aW9uID0gc2VjdGlvbnMucG9wKCkgYXMgVG9rZW47XG4gICAgICAgICAgICAgICAgc2VjdGlvblskLlRBR19JTkRFWF0gPSB0b2tlblskLlNUQVJUXTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IgPSBzZWN0aW9ucy5sZW5ndGggPiAwID8gc2VjdGlvbnNbc2VjdGlvbnMubGVuZ3RoIC0gMV1bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdIDogbmVzdGVkVG9rZW5zO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5lc3RlZFRva2Vucztcbn1cblxuLyoqXG4gKiBCcmVha3MgdXAgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgc3RyaW5nIGludG8gYSB0cmVlIG9mIHRva2Vucy4gSWYgdGhlIGB0YWdzYFxuICogYXJndW1lbnQgaXMgZ2l2ZW4gaGVyZSBpdCBtdXN0IGJlIGFuIGFycmF5IHdpdGggdHdvIHN0cmluZyB2YWx1ZXM6IHRoZVxuICogb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuIFsgXCI8JVwiLCBcIiU+XCIgXSkuIE9mXG4gKiBjb3Vyc2UsIHRoZSBkZWZhdWx0IGlzIHRvIHVzZSBtdXN0YWNoZXMgKGkuZS4gbXVzdGFjaGUudGFncykuXG4gKlxuICogQSB0b2tlbiBpcyBhbiBhcnJheSB3aXRoIGF0IGxlYXN0IDQgZWxlbWVudHMuIFRoZSBmaXJzdCBlbGVtZW50IGlzIHRoZVxuICogbXVzdGFjaGUgc3ltYm9sIHRoYXQgd2FzIHVzZWQgaW5zaWRlIHRoZSB0YWcsIGUuZy4gXCIjXCIgb3IgXCImXCIuIElmIHRoZSB0YWdcbiAqIGRpZCBub3QgY29udGFpbiBhIHN5bWJvbCAoaS5lLiB7e215VmFsdWV9fSkgdGhpcyBlbGVtZW50IGlzIFwibmFtZVwiLiBGb3JcbiAqIGFsbCB0ZXh0IHRoYXQgYXBwZWFycyBvdXRzaWRlIGEgc3ltYm9sIHRoaXMgZWxlbWVudCBpcyBcInRleHRcIi5cbiAqXG4gKiBUaGUgc2Vjb25kIGVsZW1lbnQgb2YgYSB0b2tlbiBpcyBpdHMgXCJ2YWx1ZVwiLiBGb3IgbXVzdGFjaGUgdGFncyB0aGlzIGlzXG4gKiB3aGF0ZXZlciBlbHNlIHdhcyBpbnNpZGUgdGhlIHRhZyBiZXNpZGVzIHRoZSBvcGVuaW5nIHN5bWJvbC4gRm9yIHRleHQgdG9rZW5zXG4gKiB0aGlzIGlzIHRoZSB0ZXh0IGl0c2VsZi5cbiAqXG4gKiBUaGUgdGhpcmQgYW5kIGZvdXJ0aCBlbGVtZW50cyBvZiB0aGUgdG9rZW4gYXJlIHRoZSBzdGFydCBhbmQgZW5kIGluZGljZXMsXG4gKiByZXNwZWN0aXZlbHksIG9mIHRoZSB0b2tlbiBpbiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUuXG4gKlxuICogVG9rZW5zIHRoYXQgYXJlIHRoZSByb290IG5vZGUgb2YgYSBzdWJ0cmVlIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGFuXG4gKiBhcnJheSBvZiB0b2tlbnMgaW4gdGhlIHN1YnRyZWUgYW5kIDIpIHRoZSBpbmRleCBpbiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgYXRcbiAqIHdoaWNoIHRoZSBjbG9zaW5nIHRhZyBmb3IgdGhhdCBzZWN0aW9uIGJlZ2lucy5cbiAqXG4gKiBUb2tlbnMgZm9yIHBhcnRpYWxzIGFsc28gY29udGFpbiB0d28gbW9yZSBlbGVtZW50czogMSkgYSBzdHJpbmcgdmFsdWUgb2ZcbiAqIGluZGVuZGF0aW9uIHByaW9yIHRvIHRoYXQgdGFnIGFuZCAyKSB0aGUgaW5kZXggb2YgdGhhdCB0YWcgb24gdGhhdCBsaW5lIC1cbiAqIGVnIGEgdmFsdWUgb2YgMiBpbmRpY2F0ZXMgdGhlIHBhcnRpYWwgaXMgdGhlIHRoaXJkIHRhZyBvbiB0aGlzIGxpbmUuXG4gKlxuICogQHBhcmFtIHRlbXBsYXRlIHRlbXBsYXRlIHN0cmluZ1xuICogQHBhcmFtIHRhZ3MgZGVsaW1pdGVycyBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzPzogRGVsaW1pdGVycyk6IFRva2VuW10ge1xuICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGxldCBsaW5lSGFzTm9uU3BhY2UgICAgID0gZmFsc2U7XG4gICAgY29uc3Qgc2VjdGlvbnM6IFRva2VuW10gPSBbXTsgICAgICAgLy8gU3RhY2sgdG8gaG9sZCBzZWN0aW9uIHRva2Vuc1xuICAgIGNvbnN0IHRva2VuczogVG9rZW5bXSAgID0gW107ICAgICAgIC8vIEJ1ZmZlciB0byBob2xkIHRoZSB0b2tlbnNcbiAgICBjb25zdCBzcGFjZXM6IG51bWJlcltdICA9IFtdOyAgICAgICAvLyBJbmRpY2VzIG9mIHdoaXRlc3BhY2UgdG9rZW5zIG9uIHRoZSBjdXJyZW50IGxpbmVcbiAgICBsZXQgaGFzVGFnICAgICAgICAgICAgICA9IGZhbHNlOyAgICAvLyBJcyB0aGVyZSBhIHt7dGFnfX0gb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICBsZXQgbm9uU3BhY2UgICAgICAgICAgICA9IGZhbHNlOyAgICAvLyBJcyB0aGVyZSBhIG5vbi1zcGFjZSBjaGFyIG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IGluZGVudGF0aW9uICAgICAgICAgPSAnJzsgICAgICAgLy8gVHJhY2tzIGluZGVudGF0aW9uIGZvciB0YWdzIHRoYXQgdXNlIGl0XG4gICAgbGV0IHRhZ0luZGV4ICAgICAgICAgICAgPSAwOyAgICAgICAgLy8gU3RvcmVzIGEgY291bnQgb2YgbnVtYmVyIG9mIHRhZ3MgZW5jb3VudGVyZWQgb24gYSBsaW5lXG5cbiAgICAvLyBTdHJpcHMgYWxsIHdoaXRlc3BhY2UgdG9rZW5zIGFycmF5IGZvciB0aGUgY3VycmVudCBsaW5lXG4gICAgLy8gaWYgdGhlcmUgd2FzIGEge3sjdGFnfX0gb24gaXQgYW5kIG90aGVyd2lzZSBvbmx5IHNwYWNlLlxuICAgIGNvbnN0IHN0cmlwU3BhY2UgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGlmIChoYXNUYWcgJiYgIW5vblNwYWNlKSB7XG4gICAgICAgICAgICB3aGlsZSAoc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0b2tlbnNbc3BhY2VzLnBvcCgpIGFzIG51bWJlcl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzcGFjZXMubGVuZ3RoID0gMDtcbiAgICAgICAgfVxuICAgICAgICBoYXNUYWcgPSBmYWxzZTtcbiAgICAgICAgbm9uU3BhY2UgPSBmYWxzZTtcbiAgICB9O1xuXG4gICAgY29uc3QgY29tcGlsZVRhZ3MgPSAodGFnc1RvQ29tcGlsZTogc3RyaW5nIHwgc3RyaW5nW10pOiB7IG9wZW5pbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ1RhZzogUmVnRXhwOyBjbG9zaW5nQ3VybHk6IFJlZ0V4cDsgfSA9PiB7XG4gICAgICAgIGNvbnN0IGVudW0gVGFnIHtcbiAgICAgICAgICAgIE9QRU4gPSAwLFxuICAgICAgICAgICAgQ0xPU0UsXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzU3RyaW5nKHRhZ3NUb0NvbXBpbGUpKSB7XG4gICAgICAgICAgICB0YWdzVG9Db21waWxlID0gdGFnc1RvQ29tcGlsZS5zcGxpdChfcmVnZXhwLnNwYWNlLCAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNBcnJheSh0YWdzVG9Db21waWxlKSB8fCAyICE9PSB0YWdzVG9Db21waWxlLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHRhZ3M6ICR7SlNPTi5zdHJpbmdpZnkodGFnc1RvQ29tcGlsZSl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9wZW5pbmdUYWc6ICAgbmV3IFJlZ0V4cChgJHtlc2NhcGVUZW1wbGF0ZUV4cCh0YWdzVG9Db21waWxlW1RhZy5PUEVOXSl9XFxcXHMqYCksXG4gICAgICAgICAgICBjbG9zaW5nVGFnOiAgIG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuQ0xPU0VdKX1gKSxcbiAgICAgICAgICAgIGNsb3NpbmdDdXJseTogbmV3IFJlZ0V4cChgXFxcXHMqJHtlc2NhcGVUZW1wbGF0ZUV4cChgfSR7dGFnc1RvQ29tcGlsZVtUYWcuQ0xPU0VdfWApfWApLFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBjb25zdCB7IHRhZzogcmVUYWcsIHdoaXRlOiByZVdoaXRlLCBlcXVhbHM6IHJlRXF1YWxzLCBjdXJseTogcmVDdXJseSB9ID0gX3JlZ2V4cDtcbiAgICBsZXQgX3JlZ3hwVGFncyA9IGNvbXBpbGVUYWdzKHRhZ3MgfHwgZ2xvYmFsU2V0dGluZ3MudGFncyk7XG5cbiAgICBjb25zdCBzY2FubmVyID0gbmV3IFNjYW5uZXIodGVtcGxhdGUpO1xuXG4gICAgbGV0IG9wZW5TZWN0aW9uOiBUb2tlbiB8IHVuZGVmaW5lZDtcbiAgICB3aGlsZSAoIXNjYW5uZXIuZW9zKSB7XG4gICAgICAgIGNvbnN0IHsgb3BlbmluZ1RhZzogcmVPcGVuaW5nVGFnLCBjbG9zaW5nVGFnOiByZUNsb3NpbmdUYWcsIGNsb3NpbmdDdXJseTogcmVDbG9zaW5nQ3VybHkgfSA9IF9yZWd4cFRhZ3M7XG4gICAgICAgIGxldCB0b2tlbjogVG9rZW47XG4gICAgICAgIGxldCBzdGFydCA9IHNjYW5uZXIucG9zO1xuICAgICAgICAvLyBNYXRjaCBhbnkgdGV4dCBiZXR3ZWVuIHRhZ3MuXG4gICAgICAgIGxldCB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlT3BlbmluZ1RhZyk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIHZhbHVlTGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpIDwgdmFsdWVMZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNociA9IHZhbHVlLmNoYXJBdChpKTtcblxuICAgICAgICAgICAgICAgIGlmIChpc1doaXRlc3BhY2UoY2hyKSkge1xuICAgICAgICAgICAgICAgICAgICBzcGFjZXMucHVzaCh0b2tlbnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gY2hyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gJyAnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKFsndGV4dCcsIGNociwgc3RhcnQsIHN0YXJ0ICsgMV0pO1xuICAgICAgICAgICAgICAgIHN0YXJ0ICs9IDE7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3Igd2hpdGVzcGFjZSBvbiB0aGUgY3VycmVudCBsaW5lLlxuICAgICAgICAgICAgICAgIGlmICgnXFxuJyA9PT0gY2hyKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmlwU3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50YXRpb24gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgdGFnSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICBsaW5lSGFzTm9uU3BhY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXRjaCB0aGUgb3BlbmluZyB0YWcuXG4gICAgICAgIGlmICghc2Nhbm5lci5zY2FuKHJlT3BlbmluZ1RhZykpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaGFzVGFnID0gdHJ1ZTtcblxuICAgICAgICAvLyBHZXQgdGhlIHRhZyB0eXBlLlxuICAgICAgICBsZXQgdHlwZSA9IHNjYW5uZXIuc2NhbihyZVRhZykgfHwgJ25hbWUnO1xuICAgICAgICBzY2FubmVyLnNjYW4ocmVXaGl0ZSk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdmFsdWUuXG4gICAgICAgIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVFcXVhbHMpO1xuICAgICAgICAgICAgc2Nhbm5lci5zY2FuKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ1RhZyk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ3snID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ0N1cmx5KTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUN1cmx5KTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhblVudGlsKHJlQ2xvc2luZ1RhZyk7XG4gICAgICAgICAgICB0eXBlID0gJyYnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIGNsb3NpbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZUNsb3NpbmdUYWcpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHRhZyBhdCAke3NjYW5uZXIucG9zfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCc+JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdG9rZW4gPSBbdHlwZSwgdmFsdWUsIHN0YXJ0LCBzY2FubmVyLnBvcywgaW5kZW50YXRpb24sIHRhZ0luZGV4LCBsaW5lSGFzTm9uU3BhY2VdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdG9rZW4gPSBbdHlwZSwgdmFsdWUsIHN0YXJ0LCBzY2FubmVyLnBvc107XG4gICAgICAgIH1cbiAgICAgICAgdGFnSW5kZXgrKztcbiAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuXG4gICAgICAgIGlmICgnIycgPT09IHR5cGUgfHwgJ14nID09PSB0eXBlKSB7XG4gICAgICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgICAgfSBlbHNlIGlmICgnLycgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIHNlY3Rpb24gbmVzdGluZy5cbiAgICAgICAgICAgIG9wZW5TZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG4gICAgICAgICAgICBpZiAoIW9wZW5TZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbm9wZW5lZCBzZWN0aW9uIFwiJHt2YWx1ZX1cIiBhdCAke3N0YXJ0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9wZW5TZWN0aW9uWzFdICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgnbmFtZScgPT09IHR5cGUgfHwgJ3snID09PSB0eXBlIHx8ICcmJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgbm9uU3BhY2UgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKCc9JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSB0YWdzIGZvciB0aGUgbmV4dCB0aW1lIGFyb3VuZC5cbiAgICAgICAgICAgIF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdHJpcFNwYWNlKCk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIG5vIG9wZW4gc2VjdGlvbnMgd2hlbiB3ZSdyZSBkb25lLlxuICAgIG9wZW5TZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG5cbiAgICBpZiAob3BlblNlY3Rpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCBzZWN0aW9uIFwiJHtvcGVuU2VjdGlvblskLlZBTFVFXX1cIiBhdCAke3NjYW5uZXIucG9zfWApO1xuICAgIH1cblxuICAgIHJldHVybiBuZXN0VG9rZW5zKHNxdWFzaFRva2Vucyh0b2tlbnMpKTtcbn1cbiIsImltcG9ydCB7IFRlbXBsYXRlVGFncywgVGVtcGxhdGVXcml0ZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBUb2tlbixcbiAgICBUb2tlbkFkZHJlc3MgYXMgJCxcbiAgICBnbG9iYWxTZXR0aW5ncyxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBjYWNoZSwgYnVpbGRDYWNoZUtleSB9IGZyb20gJy4vY2FjaGUnO1xuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgcGFyc2VUZW1wbGF0ZSB9IGZyb20gJy4vcGFyc2UnO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gJy4vY29udGV4dCc7XG5cbi8qKlxuICogQSBXcml0ZXIga25vd3MgaG93IHRvIHRha2UgYSBzdHJlYW0gb2YgdG9rZW5zIGFuZCByZW5kZXIgdGhlbSB0byBhXG4gKiBzdHJpbmcsIGdpdmVuIGEgY29udGV4dC4gSXQgYWxzbyBtYWludGFpbnMgYSBjYWNoZSBvZiB0ZW1wbGF0ZXMgdG9cbiAqIGF2b2lkIHRoZSBuZWVkIHRvIHBhcnNlIHRoZSBzYW1lIHRlbXBsYXRlIHR3aWNlLlxuICovXG5leHBvcnQgY2xhc3MgV3JpdGVyIGltcGxlbWVudHMgVGVtcGxhdGVXcml0ZXIge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgYW5kIGNhY2hlcyB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIGB0YWdzYCBvclxuICAgICAqIGBtdXN0YWNoZS50YWdzYCBpZiBgdGFnc2AgaXMgb21pdHRlZCwgIGFuZCByZXR1cm5zIHRoZSBhcnJheSBvZiB0b2tlbnNcbiAgICAgKiB0aGF0IGlzIGdlbmVyYXRlZCBmcm9tIHRoZSBwYXJzZS5cbiAgICAgKi9cbiAgICBwYXJzZSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzPzogVGVtcGxhdGVUYWdzKTogeyB0b2tlbnM6IFRva2VuW107IGNhY2hlS2V5OiBzdHJpbmc7IH0ge1xuICAgICAgICBjb25zdCBjYWNoZUtleSA9IGJ1aWxkQ2FjaGVLZXkodGVtcGxhdGUsIHRhZ3MgfHwgZ2xvYmFsU2V0dGluZ3MudGFncyk7XG4gICAgICAgIGxldCB0b2tlbnMgPSBjYWNoZVtjYWNoZUtleV07XG4gICAgICAgIGlmIChudWxsID09IHRva2Vucykge1xuICAgICAgICAgICAgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgdG9rZW5zLCBjYWNoZUtleSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhpZ2gtbGV2ZWwgbWV0aG9kIHRoYXQgaXMgdXNlZCB0byByZW5kZXIgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgd2l0aFxuICAgICAqIHRoZSBnaXZlbiBgdmlld2AuXG4gICAgICpcbiAgICAgKiBUaGUgb3B0aW9uYWwgYHBhcnRpYWxzYCBhcmd1bWVudCBtYXkgYmUgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlXG4gICAgICogbmFtZXMgYW5kIHRlbXBsYXRlcyBvZiBwYXJ0aWFscyB0aGF0IGFyZSB1c2VkIGluIHRoZSB0ZW1wbGF0ZS4gSXQgbWF5XG4gICAgICogYWxzbyBiZSBhIGZ1bmN0aW9uIHRoYXQgaXMgdXNlZCB0byBsb2FkIHBhcnRpYWwgdGVtcGxhdGVzIG9uIHRoZSBmbHlcbiAgICAgKiB0aGF0IHRha2VzIGEgc2luZ2xlIGFyZ3VtZW50OiB0aGUgbmFtZSBvZiB0aGUgcGFydGlhbC5cbiAgICAgKlxuICAgICAqIElmIHRoZSBvcHRpb25hbCBgdGFnc2AgYXJndW1lbnQgaXMgZ2l2ZW4gaGVyZSBpdCBtdXN0IGJlIGFuIGFycmF5IHdpdGggdHdvXG4gICAgICogc3RyaW5nIHZhbHVlczogdGhlIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLlxuICAgICAqIFsgXCI8JVwiLCBcIiU+XCIgXSkuIFRoZSBkZWZhdWx0IGlzIHRvIG11c3RhY2hlLnRhZ3MuXG4gICAgICovXG4gICAgcmVuZGVyKHRlbXBsYXRlOiBzdHJpbmcsIHZpZXc6IFBsYWluT2JqZWN0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0LCB0YWdzPzogVGVtcGxhdGVUYWdzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyB0b2tlbnMgfSA9IHRoaXMucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCB2aWV3LCBwYXJ0aWFscywgdGVtcGxhdGUsIHRhZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvdy1sZXZlbCBtZXRob2QgdGhhdCByZW5kZXJzIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCB1c2luZ1xuICAgICAqIHRoZSBnaXZlbiBgY29udGV4dGAgYW5kIGBwYXJ0aWFsc2AuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGUgYG9yaWdpbmFsVGVtcGxhdGVgIGlzIG9ubHkgZXZlciB1c2VkIHRvIGV4dHJhY3QgdGhlIHBvcnRpb25cbiAgICAgKiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB3YXMgY29udGFpbmVkIGluIGEgaGlnaGVyLW9yZGVyIHNlY3Rpb24uXG4gICAgICogSWYgdGhlIHRlbXBsYXRlIGRvZXNuJ3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucywgdGhpcyBhcmd1bWVudCBtYXlcbiAgICAgKiBiZSBvbWl0dGVkLlxuICAgICAqL1xuICAgIHJlbmRlclRva2Vucyh0b2tlbnM6IFRva2VuW10sIHZpZXc6IFBsYWluT2JqZWN0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0LCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nLCB0YWdzPzogVGVtcGxhdGVUYWdzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9ICh2aWV3IGluc3RhbmNlb2YgQ29udGV4dCkgPyB2aWV3IDogbmV3IENvbnRleHQodmlldyk7XG4gICAgICAgIGxldCBidWZmZXIgPSAnJztcblxuICAgICAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB2b2lkO1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJTZWN0aW9uKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVySW52ZXJ0ZWQodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnPic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJQYXJ0aWFsKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJyYnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMudW5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICduYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVzY2FwZWRWYWx1ZSh0b2tlbiwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3RleHQnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmF3VmFsdWUodG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclNlY3Rpb24odG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0LCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG4gICAgICAgIGxldCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcblxuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gcmVuZGVyIGFuIGFyYml0cmFyeSB0ZW1wbGF0ZVxuICAgICAgICAvLyBpbiB0aGUgY3VycmVudCBjb250ZXh0IGJ5IGhpZ2hlci1vcmRlciBzZWN0aW9ucy5cbiAgICAgICAgY29uc3Qgc3ViUmVuZGVyID0gKHRlbXBsYXRlOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyKHRlbXBsYXRlLCBjb250ZXh0LCBwYXJ0aWFscyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LnB1c2godiksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09PSB0eXBlb2YgdmFsdWUgfHwgJ251bWJlcicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHZhbHVlKSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBvcmlnaW5hbFRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucyB3aXRob3V0IHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXh0cmFjdCB0aGUgcG9ydGlvbiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB0aGUgc2VjdGlvbiBjb250YWlucy5cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuY2FsbChjb250ZXh0LnZpZXcsIG9yaWdpbmFsVGVtcGxhdGUuc2xpY2UodG9rZW5bJC5FTkRdLCB0b2tlblskLlRBR19JTkRFWF0pLCBzdWJSZW5kZXIpO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJJbnZlcnRlZCh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQsIHBhcnRpYWxzPzogUGxhaW5PYmplY3QsIG9yaWdpbmFsVGVtcGxhdGU/OiBzdHJpbmcpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgKGlzQXJyYXkodmFsdWUpICYmIDAgPT09IHZhbHVlLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbmRlclRva2Vucyh0b2tlblskLlRPS0VOX0xJU1RdIGFzIFRva2VuW10sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGluZGVudFBhcnRpYWwocGFydGlhbDogc3RyaW5nLCBpbmRlbnRhdGlvbjogc3RyaW5nLCBsaW5lSGFzTm9uU3BhY2U6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZEluZGVudGF0aW9uID0gaW5kZW50YXRpb24ucmVwbGFjZSgvW14gXFx0XS9nLCAnJyk7XG4gICAgICAgIGNvbnN0IHBhcnRpYWxCeU5sID0gcGFydGlhbC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydGlhbEJ5TmwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJ0aWFsQnlObFtpXS5sZW5ndGggJiYgKGkgPiAwIHx8ICFsaW5lSGFzTm9uU3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgcGFydGlhbEJ5TmxbaV0gPSBmaWx0ZXJlZEluZGVudGF0aW9uICsgcGFydGlhbEJ5TmxbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcnRpYWxCeU5sLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclBhcnRpYWwodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFsczogUGxhaW5PYmplY3QgfCB1bmRlZmluZWQsIHRhZ3M6IFRlbXBsYXRlVGFncyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBpZiAoIXBhcnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2YWx1ZSA9IGlzRnVuY3Rpb24ocGFydGlhbHMpID8gcGFydGlhbHModG9rZW5bJC5WQUxVRV0pIDogcGFydGlhbHNbdG9rZW5bJC5WQUxVRV1dO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgbGluZUhhc05vblNwYWNlID0gdG9rZW5bJC5IQVNfTk9fU1BBQ0VdO1xuICAgICAgICAgICAgY29uc3QgdGFnSW5kZXggICAgICAgID0gdG9rZW5bJC5UQUdfSU5ERVhdO1xuICAgICAgICAgICAgY29uc3QgaW5kZW50YXRpb24gICAgID0gdG9rZW5bJC5UT0tFTl9MSVNUXTtcbiAgICAgICAgICAgIGxldCBpbmRlbnRlZFZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICBpZiAoMCA9PT0gdGFnSW5kZXggJiYgaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICBpbmRlbnRlZFZhbHVlID0gdGhpcy5pbmRlbnRQYXJ0aWFsKHZhbHVlLCBpbmRlbnRhdGlvbiBhcyBzdHJpbmcsIGxpbmVIYXNOb25TcGFjZSBhcyBib29sZWFuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKGluZGVudGVkVmFsdWUsIHRhZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgY29udGV4dCwgcGFydGlhbHMsIGluZGVudGVkVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdW5lc2NhcGVkVmFsdWUodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgZXNjYXBlZFZhbHVlKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCk6IHN0cmluZyB8IHZvaWQge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBnbG9iYWxTZXR0aW5ncy5lc2NhcGUodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmF3VmFsdWUodG9rZW46IFRva2VuKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRva2VuWyQuVkFMVUVdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgSlNULFxuICAgIFRlbXBsYXRlVGFncyxcbiAgICBJVGVtcGxhdGVFbmdpbmUsXG4gICAgVGVtcGxhdGVTY2FubmVyLFxuICAgIFRlbXBsYXRlQ29udGV4dCxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZUVzY2FwZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBnbG9iYWxTZXR0aW5ncyB9IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgQ2FjaGVMb2NhdGlvbiwgY2xlYXJDYWNoZSB9IGZyb20gJy4vY2FjaGUnO1xuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICB0eXBlU3RyaW5nLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IFNjYW5uZXIgfSBmcm9tICcuL3NjYW5uZXInO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQgeyBXcml0ZXIgfSBmcm9tICcuL3dyaXRlcic7XG5cbi8qKiBbW1RlbXBsYXRlRW5naW5lXV0gY29tbW9uIHNldHRpbmdzICovXG5nbG9iYWxTZXR0aW5ncy53cml0ZXIgPSBuZXcgV3JpdGVyKCk7XG5cbi8qKlxuICogQGVuIFtbVGVtcGxhdGVFbmdpbmVdXSBnbG9iYWwgc2V0dG5nIG9wdGlvbnNcbiAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0g44Kw44Ot44O844OQ44Or6Kit5a6a44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyB7XG4gICAgd3JpdGVyPzogVGVtcGxhdGVXcml0ZXI7XG4gICAgdGFncz86IFRlbXBsYXRlVGFncztcbiAgICBlc2NhcGU/OiBUZW1wbGF0ZUVzY2FwZXI7XG59XG5cbi8qKlxuICogQGVuIFtbVGVtcGxhdGVFbmdpbmVdXSBjb21waWxlIG9wdGlvbnNcbiAqIEBqYSBbW1RlbXBsYXRlRW5naW5lXV0g44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVDb21waWxlT3B0aW9ucyB7XG4gICAgdGFncz86IFRlbXBsYXRlVGFncztcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGVFbmdpbmUgdXRpbGl0eSBjbGFzcy5cbiAqIEBqYSBUZW1wbGF0ZUVuZ2luZSDjg6bjg7zjg4bjgqPjg6rjg4bjgqPjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlRW5naW5lIGltcGxlbWVudHMgSVRlbXBsYXRlRW5naW5lIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tKU1RdXSBmcm9tIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiX44GL44KJIFtbSlNUXV0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFja2FnZSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZ1xuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICogQHBhY2thZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMpOiBKU1Qge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHRlbXBsYXRlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCB0ZW1wbGF0ZSEgdGhlIGZpcnN0IGFyZ3VtZW50IHNob3VsZCBiZSBhIFwic3RyaW5nXCIgYnV0IFwiJHt0eXBlU3RyaW5nKHRlbXBsYXRlKX1cIiB3YXMgZ2l2ZW4gZm9yIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUodGVtcGxhdGUsIG9wdGlvbnMpYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRhZ3MgfSA9IG9wdGlvbnMgfHwgZ2xvYmFsU2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IHsgd3JpdGVyIH0gPSBnbG9iYWxTZXR0aW5ncztcblxuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0LCBwYXJ0aWFscz86IFBsYWluT2JqZWN0KTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZXIucmVuZGVyKHRlbXBsYXRlLCB2aWV3IHx8IHt9LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgeyB0b2tlbnMsIGNhY2hlS2V5IH0gPSB3cml0ZXIucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICBqc3QudG9rZW5zICAgICAgICA9IHRva2VucztcbiAgICAgICAganN0LmNhY2hlS2V5ICAgICAgPSBjYWNoZUtleTtcbiAgICAgICAganN0LmNhY2hlTG9jYXRpb24gPSBbQ2FjaGVMb2NhdGlvbi5OQU1FU1BBQ0UsIENhY2hlTG9jYXRpb24uUk9PVF07XG5cbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXJzIGFsbCBjYWNoZWQgdGVtcGxhdGVzIGluIHRoZSBkZWZhdWx0IFtbVGVtcGxhdGVXcml0ZXJdXS5cbiAgICAgKiBAamEg5pei5a6a44GuIFtbVGVtcGxhdGVXcml0ZXJdXSDjga7jgZnjgbnjgabjga7jgq3jg6Pjg4Pjgrfjg6XjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGNsZWFyQ2FjaGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hhbmdlIFtbVGVtcGxhdGVFbmdpbmVdXSBnbG9iYWwgc2V0dGluZ3MuXG4gICAgICogQGphIFtbVGVtcGxhdGVFbmdpbmVdXSDjgrDjg63jg7zjg5Djg6voqK3lrprjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZXR0aW5nc1xuICAgICAqICAtIGBlbmAgbmV3IHNldHRpbmdzXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYToqK3lrprlgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNldHRpbmdzXG4gICAgICogIC0gYGphYCDlj6TjgYToqK3lrprlgKRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldEdsb2JhbFNldHRpbmdzKHNldGlpbmdzOiBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzKTogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi5nbG9iYWxTZXR0aW5ncyB9O1xuICAgICAgICBjb25zdCB7IHdyaXRlciwgdGFncywgZXNjYXBlIH0gPSBzZXRpaW5ncztcbiAgICAgICAgd3JpdGVyICYmIChnbG9iYWxTZXR0aW5ncy53cml0ZXIgPSB3cml0ZXIpO1xuICAgICAgICB0YWdzICAgJiYgKGdsb2JhbFNldHRpbmdzLnRhZ3MgICA9IHRhZ3MpO1xuICAgICAgICBlc2NhcGUgJiYgKGdsb2JhbFNldHRpbmdzLmVzY2FwZSA9IGVzY2FwZSk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6IGZvciBkZWJ1Z1xuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUgW1tUZW1wbGF0ZVNjYW5uZXJdXSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlU2Nhbm5lcihzcmM6IHN0cmluZyk6IFRlbXBsYXRlU2Nhbm5lciB7XG4gICAgICAgIHJldHVybiBuZXcgU2Nhbm5lcihzcmMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVDb250ZXh0XV0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZUNvbnRleHQodmlldzogUGxhaW5PYmplY3QsIHBhcmVudENvbnRleHQ/OiBDb250ZXh0KTogVGVtcGxhdGVDb250ZXh0IHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb250ZXh0KHZpZXcsIHBhcmVudENvbnRleHQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgQ3JlYXRlIFtbVGVtcGxhdGVXcml0ZXJdXSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlV3JpdGVyKCk6IFRlbXBsYXRlV3JpdGVyIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXcml0ZXIoKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQW9DTyxNQUFNLGNBQWMsR0FBRztJQUMxQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ2xCLE1BQU0sRUFBRSxVQUFVO0NBS3JCOztBQzNCRDs7OztTQUlnQixhQUFhLENBQUMsUUFBZ0IsRUFBRSxJQUFrQjtJQUM5RCxPQUFPLEdBQUcsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUMzQyxDQUFDO0FBRUQ7Ozs7U0FJZ0IsVUFBVTtJQUN0QixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsK0JBQXlCLENBQUM7SUFDOUQsU0FBUyw2QkFBb0IsR0FB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QyxRQUFRLENBQUMsMkRBQTJELENBQUMsQ0FBQztTQUMxSztRQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLElBQUksY0FBYyxDQUFDO1FBQzNDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxjQUFjLENBQUM7UUFFbEMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFrQixFQUFFLFFBQXNCO1lBQ25ELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDOUQsQ0FBQztRQUVGLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUQsR0FBRyxDQUFDLE1BQU0sR0FBVSxNQUFNLENBQUM7UUFDM0IsR0FBRyxDQUFDLFFBQVEsR0FBUSxRQUFRLENBQUM7UUFDN0IsR0FBRyxDQUFDLGFBQWEsR0FBRyw0REFBNkMsQ0FBQztRQUVsRSxPQUFPLEdBQUcsQ0FBQztLQUNkOzs7OztJQU1NLE9BQU8sVUFBVTtRQUNwQixVQUFVLEVBQUUsQ0FBQztLQUNoQjs7Ozs7Ozs7Ozs7O0lBYU0sT0FBTyxpQkFBaUIsQ0FBQyxRQUFnQztRQUM1RCxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsY0FBYyxFQUFFLENBQUM7UUFDMUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDO1FBQzFDLE1BQU0sS0FBSyxjQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLElBQUksS0FBTyxjQUFjLENBQUMsSUFBSSxHQUFLLElBQUksQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sS0FBSyxjQUFjLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE9BQU8sV0FBVyxDQUFDO0tBQ3RCOzs7O0lBTU0sT0FBTyxhQUFhLENBQUMsR0FBVztRQUNuQyxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQzNCOztJQUdNLE9BQU8sYUFBYSxDQUFDLElBQWlCLEVBQUUsYUFBdUI7UUFDbEUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7S0FDM0M7O0lBR00sT0FBTyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxNQUFNLEVBQUUsQ0FBQztLQUN2Qjs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2NvcmUtdGVtcGxhdGUvIn0=
