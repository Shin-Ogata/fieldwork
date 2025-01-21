/*!
 * @cdp/core-template 0.9.19
 *   template engine
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, coreUtils) { 'use strict';

    /** @internal */
    const globalSettings = {
        tags: ['{{', '}}'],
        escape: coreUtils.escapeHTML,
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
        const namespace = coreUtils.getGlobalNamespace("CDP_DECLARE" /* CacheLocation.NAMESPACE */);
        namespace["TEMPLATE_CACHE" /* CacheLocation.ROOT */] = {};
    }
    /** @internal global cache pool */
    const cache = coreUtils.ensureObject(null, "CDP_DECLARE" /* CacheLocation.NAMESPACE */, "TEMPLATE_CACHE" /* CacheLocation.ROOT */);

    /**
     * More correct typeof string handling array
     * which normally returns typeof 'object'
     */
    function typeString(src) {
        return coreUtils.isArray(src) ? 'array' : typeof src;
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
        return coreUtils.isPrimitive(src) && Object.prototype.hasOwnProperty.call(src, propName);
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
                                lookupHit = (coreUtils.has(intermediateValue, names[index]) ||
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
                        lookupHit = coreUtils.has(context._view, name);
                    }
                    if (lookupHit) {
                        value = intermediateValue;
                        break;
                    }
                    context = context._parent;
                }
                cache[name] = value;
            }
            if (coreUtils.isFunction(value)) {
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
            if (coreUtils.isString(tagsToCompile)) {
                tagsToCompile = tagsToCompile.split(_regexp.space, 2);
            }
            if (!coreUtils.isArray(tagsToCompile) || 2 !== tagsToCompile.length) {
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
            if (coreUtils.isArray(value)) {
                for (const v of value) {
                    buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context.push(v), partials, originalTemplate);
                }
            }
            else if ('object' === typeof value || 'string' === typeof value || 'number' === typeof value) {
                buffer += this.renderTokens(token[4 /* $.TOKEN_LIST */], context.push(value), partials, originalTemplate);
            }
            else if (coreUtils.isFunction(value)) {
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
            if (!value || (coreUtils.isArray(value) && 0 === value.length)) {
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
            const value = (coreUtils.isFunction(partials) ? partials(token[1 /* $.VALUE */]) : partials[token[1 /* $.VALUE */]]);
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
            if (!coreUtils.isString(template)) {
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

    exports.TemplateEngine = TemplateEngine;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS10ZW1wbGF0ZS5qcyIsInNvdXJjZXMiOlsiaW50ZXJuYWwudHMiLCJjYWNoZS50cyIsInV0aWxzLnRzIiwic2Nhbm5lci50cyIsImNvbnRleHQudHMiLCJwYXJzZS50cyIsIndyaXRlci50cyIsImNsYXNzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGVzY2FwZUhUTUwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZURlbGltaXRlcnMsXG4gICAgVGVtcGxhdGVXcml0ZXIsXG4gICAgVGVtcGxhdGVFc2NhcGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogKHN0cmluZyB8IFRva2VuW10pICovXG5leHBvcnQgdHlwZSBUb2tlbkxpc3QgPSB1bmtub3duO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IHRva2VuIHN0cnVjdHVyZS5cbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IHRva2VuIOWei1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IFtzdHJpbmcsIHN0cmluZywgbnVtYmVyLCBudW1iZXIsIFRva2VuTGlzdD8sIG51bWJlcj8sIGJvb2xlYW4/XTtcblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRva2VufSBhZGRyZXNzIGlkLlxuICogQGphIHtAbGluayBUb2tlbn0g44Ki44OJ44Os44K56K2Y5Yil5a2QXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFRva2VuQWRkcmVzcyB7XG4gICAgVFlQRSA9IDAsXG4gICAgVkFMVUUsXG4gICAgU1RBUlQsXG4gICAgRU5ELFxuICAgIFRPS0VOX0xJU1QsXG4gICAgVEFHX0lOREVYLFxuICAgIEhBU19OT19TUEFDRSxcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJuYWwgZGVsaW1pdGVycyBkZWZpbml0aW9uIGZvciB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9LiBleCkgWyd7eycsJ319J10gb3IgJ3t7IH19J1xuICogQGphIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0g44Gu5YaF6YOo44Gn5L2/55So44GZ44KL5Yy65YiH44KK5paH5a2XIGV4KSBbJ3t7JywnfX0nXSBvciAne3sgfX0nXG4gKi9cbmV4cG9ydCB0eXBlIERlbGltaXRlcnMgPSBzdHJpbmcgfCBUZW1wbGF0ZURlbGltaXRlcnM7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBnbG9iYWxTZXR0aW5ncyA9IHtcbiAgICB0YWdzOiBbJ3t7JywgJ319J10sXG4gICAgZXNjYXBlOiBlc2NhcGVIVE1MLFxufSBhcyB7XG4gICAgdGFnczogVGVtcGxhdGVEZWxpbWl0ZXJzO1xuICAgIGVzY2FwZTogVGVtcGxhdGVFc2NhcGVyO1xuICAgIHdyaXRlcjogVGVtcGxhdGVXcml0ZXI7XG59O1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBlbnN1cmVPYmplY3QsXG4gICAgZ2V0R2xvYmFsTmFtZXNwYWNlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgVGVtcGxhdGVEZWxpbWl0ZXJzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gQ2FjaGUgbG9jYXRpb24gaW5mb3JtYXRpb24uXG4gKiBAamEg44Kt44Oj44OD44K344Ol44Ot44Kx44O844K344On44Oz5oOF5aCxXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIENhY2hlTG9jYXRpb24ge1xuICAgIE5BTUVTUEFDRSA9ICdDRFBfREVDTEFSRScsXG4gICAgUk9PVCAgICAgID0gJ1RFTVBMQVRFX0NBQ0hFJyxcbn1cblxuLyoqXG4gKiBAZW4gQnVpbGQgY2FjaGUga2V5LlxuICogQGphIOOCreODo+ODg+OCt+ODpeOCreODvOOBrueUn+aIkFxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYWNoZUtleSh0ZW1wbGF0ZTogc3RyaW5nLCB0YWdzOiBUZW1wbGF0ZURlbGltaXRlcnMpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0ZW1wbGF0ZX06JHt0YWdzLmpvaW4oJzonKX1gO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gY2FjaGUgcG9vbC5cbiAqIEBqYSDjgZnjgbnjgabjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4RcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gZ2V0R2xvYmFsTmFtZXNwYWNlKENhY2hlTG9jYXRpb24uTkFNRVNQQUNFKTtcbiAgICBuYW1lc3BhY2VbQ2FjaGVMb2NhdGlvbi5ST09UXSA9IHt9O1xufVxuXG4vKiogQGludGVybmFsIGdsb2JhbCBjYWNoZSBwb29sICovXG5leHBvcnQgY29uc3QgY2FjaGUgPSBlbnN1cmVPYmplY3Q8UGxhaW5PYmplY3Q+KG51bGwsIENhY2hlTG9jYXRpb24uTkFNRVNQQUNFLCBDYWNoZUxvY2F0aW9uLlJPT1QpO1xuIiwiaW1wb3J0IHsgaXNBcnJheSwgaXNQcmltaXRpdmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuZXhwb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaGFzLFxuICAgIGVzY2FwZUhUTUwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKlxuICogTW9yZSBjb3JyZWN0IHR5cGVvZiBzdHJpbmcgaGFuZGxpbmcgYXJyYXlcbiAqIHdoaWNoIG5vcm1hbGx5IHJldHVybnMgdHlwZW9mICdvYmplY3QnXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0eXBlU3RyaW5nKHNyYzogdW5rbm93bik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGlzQXJyYXkoc3JjKSA/ICdhcnJheScgOiB0eXBlb2Ygc3JjO1xufVxuXG4vKipcbiAqIEVzY2FwZSBmb3IgdGVtcGxhdGUncyBleHByZXNzaW9uIGNoYXJhY3RvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVUZW1wbGF0ZUV4cChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9bLVxcW1xcXXt9KCkqKz8uLFxcXFxcXF4kfCNcXHNdL2csICdcXFxcJCYnKTtcbn1cblxuLyoqXG4gKiBTYWZlIHdheSBvZiBkZXRlY3Rpbmcgd2hldGhlciBvciBub3QgdGhlIGdpdmVuIHRoaW5nIGlzIGEgcHJpbWl0aXZlIGFuZFxuICogd2hldGhlciBpdCBoYXMgdGhlIGdpdmVuIHByb3BlcnR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eShzcmM6IHVua25vd24sIHByb3BOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gaXNQcmltaXRpdmUoc3JjKSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3JjLCBwcm9wTmFtZSk7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hpdGVzcGFjZSBjaGFyYWN0b3IgZXhpc3RzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaGl0ZXNwYWNlKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEvXFxTLy50ZXN0KHNyYyk7XG59XG4iLCJpbXBvcnQgeyBUZW1wbGF0ZVNjYW5uZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEEgc2ltcGxlIHN0cmluZyBzY2FubmVyIHRoYXQgaXMgdXNlZCBieSB0aGUgdGVtcGxhdGUgcGFyc2VyIHRvIGZpbmRcbiAqIHRva2VucyBpbiB0ZW1wbGF0ZSBzdHJpbmdzLlxuICovXG5leHBvcnQgY2xhc3MgU2Nhbm5lciBpbXBsZW1lbnRzIFRlbXBsYXRlU2Nhbm5lciB7XG4gICAgcHJpdmF0ZSBfc291cmNlOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdGFpbDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3BvczogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzcmM6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSB0aGlzLl90YWlsID0gc3JjO1xuICAgICAgICB0aGlzLl9wb3MgPSAwO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBjdXJyZW50IHNjYW5uaW5nIHBvc2l0aW9uLlxuICAgICAqL1xuICAgIGdldCBwb3MoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BvcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHN0cmluZyAgc291cmNlLlxuICAgICAqL1xuICAgIGdldCBzb3VyY2UoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdGFpbCBpcyBlbXB0eSAoZW5kIG9mIHN0cmluZykuXG4gICAgICovXG4gICAgZ2V0IGVvcygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICcnID09PSB0aGlzLl90YWlsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIG1hdGNoIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gYXQgdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICogUmV0dXJucyB0aGUgbWF0Y2hlZCB0ZXh0IGlmIGl0IGNhbiBtYXRjaCwgdGhlIGVtcHR5IHN0cmluZyBvdGhlcndpc2UuXG4gICAgICovXG4gICAgc2NhbihyZWdleHA6IFJlZ0V4cCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcmVnZXhwLmV4ZWModGhpcy5fdGFpbCk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCB8fCAwICE9PSBtYXRjaC5pbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyaW5nID0gbWF0Y2hbMF07XG5cbiAgICAgICAgdGhpcy5fdGFpbCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKHN0cmluZy5sZW5ndGgpO1xuICAgICAgICB0aGlzLl9wb3MgKz0gc3RyaW5nLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNraXBzIGFsbCB0ZXh0IHVudGlsIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb24gY2FuIGJlIG1hdGNoZWQuIFJldHVybnNcbiAgICAgKiB0aGUgc2tpcHBlZCBzdHJpbmcsIHdoaWNoIGlzIHRoZSBlbnRpcmUgdGFpbCBpZiBubyBtYXRjaCBjYW4gYmUgbWFkZS5cbiAgICAgKi9cbiAgICBzY2FuVW50aWwocmVnZXhwOiBSZWdFeHApOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuX3RhaWwuc2VhcmNoKHJlZ2V4cCk7XG4gICAgICAgIGxldCBtYXRjaDogc3RyaW5nO1xuXG4gICAgICAgIHN3aXRjaCAoaW5kZXgpIHtcbiAgICAgICAgICAgIGNhc2UgLTE6XG4gICAgICAgICAgICAgICAgbWF0Y2ggPSB0aGlzLl90YWlsO1xuICAgICAgICAgICAgICAgIHRoaXMuX3RhaWwgPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBtYXRjaCA9IHRoaXMuX3RhaWwuc3Vic3RyaW5nKDAsIGluZGV4KTtcbiAgICAgICAgICAgICAgICB0aGlzLl90YWlsID0gdGhpcy5fdGFpbC5zdWJzdHJpbmcoaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcG9zICs9IG1hdGNoLmxlbmd0aDtcblxuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVGVtcGxhdGVDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIFVua25vd25PYmplY3QsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBoYXMsXG4gICAgcHJpbWl0aXZlSGFzT3duUHJvcGVydHksXG59IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSByZW5kZXJpbmcgY29udGV4dCBieSB3cmFwcGluZyBhIHZpZXcgb2JqZWN0IGFuZFxuICogbWFpbnRhaW5pbmcgYSByZWZlcmVuY2UgdG8gdGhlIHBhcmVudCBjb250ZXh0LlxuICovXG5leHBvcnQgY2xhc3MgQ29udGV4dCBpbXBsZW1lbnRzIFRlbXBsYXRlQ29udGV4dCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfdmlldzogUGxhaW5PYmplY3Q7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcGFyZW50PzogQ29udGV4dDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9jYWNoZTogUGxhaW5PYmplY3Q7XG5cbiAgICAvKiogY29uc3RydWN0b3IgKi9cbiAgICBjb25zdHJ1Y3Rvcih2aWV3OiBQbGFpbk9iamVjdCwgcGFyZW50Q29udGV4dD86IENvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fdmlldyAgID0gdmlldztcbiAgICAgICAgdGhpcy5fY2FjaGUgID0geyAnLic6IHRoaXMuX3ZpZXcgfTtcbiAgICAgICAgdGhpcy5fcGFyZW50ID0gcGFyZW50Q29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIFZpZXcgcGFyYW1ldGVyIGdldHRlci5cbiAgICAgKi9cbiAgICBnZXQgdmlldygpOiBQbGFpbk9iamVjdCB7XG4gICAgICAgIHJldHVybiB0aGlzLl92aWV3O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgY29udGV4dCB1c2luZyB0aGUgZ2l2ZW4gdmlldyB3aXRoIHRoaXMgY29udGV4dFxuICAgICAqIGFzIHRoZSBwYXJlbnQuXG4gICAgICovXG4gICAgcHVzaCh2aWV3OiBQbGFpbk9iamVjdCk6IENvbnRleHQge1xuICAgICAgICByZXR1cm4gbmV3IENvbnRleHQodmlldywgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgdmFsdWUgb2YgdGhlIGdpdmVuIG5hbWUgaW4gdGhpcyBjb250ZXh0LCB0cmF2ZXJzaW5nXG4gICAgICogdXAgdGhlIGNvbnRleHQgaGllcmFyY2h5IGlmIHRoZSB2YWx1ZSBpcyBhYnNlbnQgaW4gdGhpcyBjb250ZXh0J3Mgdmlldy5cbiAgICAgKi9cbiAgICBsb29rdXAobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fY2FjaGU7XG5cbiAgICAgICAgbGV0IHZhbHVlOiB1bmtub3duO1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNhY2hlLCBuYW1lKSkge1xuICAgICAgICAgICAgdmFsdWUgPSBjYWNoZVtuYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBjb250ZXh0OiBDb250ZXh0IHwgdW5kZWZpbmVkID0gdGhpczsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICAgICAgbGV0IGludGVybWVkaWF0ZVZhbHVlOiBVbmtub3duT2JqZWN0IHwgdW5kZWZpbmVkIHwgbnVsbDtcbiAgICAgICAgICAgIGxldCBuYW1lczogc3RyaW5nW107XG4gICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlcjtcbiAgICAgICAgICAgIGxldCBsb29rdXBIaXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgd2hpbGUgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoMCA8IG5hbWUuaW5kZXhPZignLicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlldztcbiAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBuYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogVXNpbmcgdGhlIGRvdCBub3Rpb24gcGF0aCBpbiBgbmFtZWAsIHdlIGRlc2NlbmQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICogbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFRvIGJlIGNlcnRhaW4gdGhhdCB0aGUgbG9va3VwIGhhcyBiZWVuIHN1Y2Nlc3NmdWwsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgICogY2hlY2sgaWYgdGhlIGxhc3Qgb2JqZWN0IGluIHRoZSBwYXRoIGFjdHVhbGx5IGhhcyB0aGUgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICogd2UgYXJlIGxvb2tpbmcgZm9yLiBXZSBzdG9yZSB0aGUgcmVzdWx0IGluIGBsb29rdXBIaXRgLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBUaGlzIGlzIHNwZWNpYWxseSBuZWNlc3NhcnkgZm9yIHdoZW4gdGhlIHZhbHVlIGhhcyBiZWVuIHNldCB0b1xuICAgICAgICAgICAgICAgICAgICAgKiBgdW5kZWZpbmVkYCBhbmQgd2Ugd2FudCB0byBhdm9pZCBsb29raW5nIHVwIHBhcmVudCBjb250ZXh0cy5cbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSW4gdGhlIGNhc2Ugd2hlcmUgZG90IG5vdGF0aW9uIGlzIHVzZWQsIHdlIGNvbnNpZGVyIHRoZSBsb29rdXBcbiAgICAgICAgICAgICAgICAgICAgICogdG8gYmUgc3VjY2Vzc2Z1bCBldmVuIGlmIHRoZSBsYXN0IFwib2JqZWN0XCIgaW4gdGhlIHBhdGggaXNcbiAgICAgICAgICAgICAgICAgICAgICogbm90IGFjdHVhbGx5IGFuIG9iamVjdCBidXQgYSBwcmltaXRpdmUgKGUuZy4sIGEgc3RyaW5nLCBvciBhblxuICAgICAgICAgICAgICAgICAgICAgKiBpbnRlZ2VyKSwgYmVjYXVzZSBpdCBpcyBzb21ldGltZXMgdXNlZnVsIHRvIGFjY2VzcyBhIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAqIG9mIGFuIGF1dG9ib3hlZCBwcmltaXRpdmUsIHN1Y2ggYXMgdGhlIGxlbmd0aCBvZiBhIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICoqL1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAobnVsbCAhPSBpbnRlcm1lZGlhdGVWYWx1ZSAmJiBpbmRleCA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBuYW1lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9va3VwSGl0ID0gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXMoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbWl0aXZlSGFzT3duUHJvcGVydHkoaW50ZXJtZWRpYXRlVmFsdWUsIG5hbWVzW2luZGV4XSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBpbnRlcm1lZGlhdGVWYWx1ZVtuYW1lc1tpbmRleCsrXV0gYXMgVW5rbm93bk9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gY29udGV4dC5fdmlld1tuYW1lXTtcblxuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogT25seSBjaGVja2luZyBhZ2FpbnN0IGBoYXNQcm9wZXJ0eWAsIHdoaWNoIGFsd2F5cyByZXR1cm5zIGBmYWxzZWAgaWZcbiAgICAgICAgICAgICAgICAgICAgICogYGNvbnRleHQudmlld2AgaXMgbm90IGFuIG9iamVjdC4gRGVsaWJlcmF0ZWx5IG9taXR0aW5nIHRoZSBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgKiBhZ2FpbnN0IGBwcmltaXRpdmVIYXNPd25Qcm9wZXJ0eWAgaWYgZG90IG5vdGF0aW9uIGlzIG5vdCB1c2VkLlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiBDb25zaWRlciB0aGlzIGV4YW1wbGU6XG4gICAgICAgICAgICAgICAgICAgICAqIGBgYFxuICAgICAgICAgICAgICAgICAgICAgKiBNdXN0YWNoZS5yZW5kZXIoXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMge3sjbGVuZ3RofX17e2xlbmd0aH19e3svbGVuZ3RofX0uXCIsIHtsZW5ndGg6IFwiMTAwIHlhcmRzXCJ9KVxuICAgICAgICAgICAgICAgICAgICAgKiBgYGBcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogSWYgd2Ugd2VyZSB0byBjaGVjayBhbHNvIGFnYWluc3QgYHByaW1pdGl2ZUhhc093blByb3BlcnR5YCwgYXMgd2UgZG9cbiAgICAgICAgICAgICAgICAgICAgICogaW4gdGhlIGRvdCBub3RhdGlvbiBjYXNlLCB0aGVuIHJlbmRlciBjYWxsIHdvdWxkIHJldHVybjpcbiAgICAgICAgICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAgICAgICAgICogXCJUaGUgbGVuZ3RoIG9mIGEgZm9vdGJhbGwgZmllbGQgaXMgOS5cIlxuICAgICAgICAgICAgICAgICAgICAgKlxuICAgICAgICAgICAgICAgICAgICAgKiByYXRoZXIgdGhhbiB0aGUgZXhwZWN0ZWQ6XG4gICAgICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICAgICAqIFwiVGhlIGxlbmd0aCBvZiBhIGZvb3RiYWxsIGZpZWxkIGlzIDEwMCB5YXJkcy5cIlxuICAgICAgICAgICAgICAgICAgICAgKiovXG4gICAgICAgICAgICAgICAgICAgIGxvb2t1cEhpdCA9IGhhcyhjb250ZXh0Ll92aWV3LCBuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobG9va3VwSGl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaW50ZXJtZWRpYXRlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnRleHQgPSBjb250ZXh0Ll9wYXJlbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhY2hlW25hbWVdID0gdmFsdWUgYXMgb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICh2YWx1ZSBhcyBVbmtub3duRnVuY3Rpb24pLmNhbGwodGhpcy5fdmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBUb2tlbixcbiAgICBUb2tlbkFkZHJlc3MgYXMgJCxcbiAgICBEZWxpbWl0ZXJzLFxuICAgIGdsb2JhbFNldHRpbmdzLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc1doaXRlc3BhY2UsXG4gICAgZXNjYXBlVGVtcGxhdGVFeHAsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZWdleHAgPSB7XG4gICAgd2hpdGU6IC9cXHMqLyxcbiAgICBzcGFjZTogL1xccysvLFxuICAgIGVxdWFsczogL1xccyo9LyxcbiAgICBjdXJseTogL1xccypcXH0vLFxuICAgIHRhZzogLyN8XFxefFxcL3w+fFxce3wmfD18IS8sXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQ29tYmluZXMgdGhlIHZhbHVlcyBvZiBjb25zZWN1dGl2ZSB0ZXh0IHRva2VucyBpbiB0aGUgZ2l2ZW4gYHRva2Vuc2AgYXJyYXkgdG8gYSBzaW5nbGUgdG9rZW4uXG4gKi9cbmZ1bmN0aW9uIHNxdWFzaFRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBUb2tlbltdIHtcbiAgICBjb25zdCBzcXVhc2hlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuXG4gICAgbGV0IGxhc3RUb2tlbiE6IFRva2VuO1xuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgIGlmICh0b2tlbikge1xuICAgICAgICAgICAgaWYgKCd0ZXh0JyA9PT0gdG9rZW5bJC5UWVBFXSAmJiBsYXN0VG9rZW4gJiYgJ3RleHQnID09PSBsYXN0VG9rZW5bJC5UWVBFXSkge1xuICAgICAgICAgICAgICAgIGxhc3RUb2tlblskLlZBTFVFXSArPSB0b2tlblskLlZBTFVFXTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5bJC5FTkRdID0gdG9rZW5bJC5FTkRdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcXVhc2hlZFRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW4gPSB0b2tlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcXVhc2hlZFRva2Vucztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEZvcm1zIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCBpbnRvIGEgbmVzdGVkIHRyZWUgc3RydWN0dXJlIHdoZXJlXG4gKiB0b2tlbnMgdGhhdCByZXByZXNlbnQgYSBzZWN0aW9uIGhhdmUgdHdvIGFkZGl0aW9uYWwgaXRlbXM6IDEpIGFuIGFycmF5IG9mXG4gKiBhbGwgdG9rZW5zIHRoYXQgYXBwZWFyIGluIHRoYXQgc2VjdGlvbiBhbmQgMikgdGhlIGluZGV4IGluIHRoZSBvcmlnaW5hbFxuICogdGVtcGxhdGUgdGhhdCByZXByZXNlbnRzIHRoZSBlbmQgb2YgdGhhdCBzZWN0aW9uLlxuICovXG5mdW5jdGlvbiBuZXN0VG9rZW5zKHRva2VuczogVG9rZW5bXSk6IFRva2VuW10ge1xuICAgIGNvbnN0IG5lc3RlZFRva2VuczogVG9rZW5bXSA9IFtdO1xuICAgIGxldCBjb2xsZWN0b3IgPSBuZXN0ZWRUb2tlbnM7XG4gICAgY29uc3Qgc2VjdGlvbnM6IFRva2VuW10gPSBbXTtcblxuICAgIGxldCBzZWN0aW9uITogVG9rZW47XG4gICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICBjYXNlICcjJzpcbiAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgIGNvbGxlY3Rvci5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBzZWN0aW9ucy5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0b3IgPSB0b2tlblskLlRPS0VOX0xJU1RdID0gW107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICcvJzpcbiAgICAgICAgICAgICAgICBzZWN0aW9uID0gc2VjdGlvbnMucG9wKCkhO1xuICAgICAgICAgICAgICAgIHNlY3Rpb25bJC5UQUdfSU5ERVhdID0gdG9rZW5bJC5TVEFSVF07XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSA6IG5lc3RlZFRva2VucztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29sbGVjdG9yLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXN0ZWRUb2tlbnM7XG59XG5cbi8qKlxuICogQnJlYWtzIHVwIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHN0cmluZyBpbnRvIGEgdHJlZSBvZiB0b2tlbnMuIElmIHRoZSBgdGFnc2BcbiAqIGFyZ3VtZW50IGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAqIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLiBbIFwiPCVcIiwgXCIlPlwiIF0pLiBPZlxuICogY291cnNlLCB0aGUgZGVmYXVsdCBpcyB0byB1c2UgbXVzdGFjaGVzIChpLmUuIG11c3RhY2hlLnRhZ3MpLlxuICpcbiAqIEEgdG9rZW4gaXMgYW4gYXJyYXkgd2l0aCBhdCBsZWFzdCA0IGVsZW1lbnRzLiBUaGUgZmlyc3QgZWxlbWVudCBpcyB0aGVcbiAqIG11c3RhY2hlIHN5bWJvbCB0aGF0IHdhcyB1c2VkIGluc2lkZSB0aGUgdGFnLCBlLmcuIFwiI1wiIG9yIFwiJlwiLiBJZiB0aGUgdGFnXG4gKiBkaWQgbm90IGNvbnRhaW4gYSBzeW1ib2wgKGkuZS4ge3tteVZhbHVlfX0pIHRoaXMgZWxlbWVudCBpcyBcIm5hbWVcIi4gRm9yXG4gKiBhbGwgdGV4dCB0aGF0IGFwcGVhcnMgb3V0c2lkZSBhIHN5bWJvbCB0aGlzIGVsZW1lbnQgaXMgXCJ0ZXh0XCIuXG4gKlxuICogVGhlIHNlY29uZCBlbGVtZW50IG9mIGEgdG9rZW4gaXMgaXRzIFwidmFsdWVcIi4gRm9yIG11c3RhY2hlIHRhZ3MgdGhpcyBpc1xuICogd2hhdGV2ZXIgZWxzZSB3YXMgaW5zaWRlIHRoZSB0YWcgYmVzaWRlcyB0aGUgb3BlbmluZyBzeW1ib2wuIEZvciB0ZXh0IHRva2Vuc1xuICogdGhpcyBpcyB0aGUgdGV4dCBpdHNlbGYuXG4gKlxuICogVGhlIHRoaXJkIGFuZCBmb3VydGggZWxlbWVudHMgb2YgdGhlIHRva2VuIGFyZSB0aGUgc3RhcnQgYW5kIGVuZCBpbmRpY2VzLFxuICogcmVzcGVjdGl2ZWx5LCBvZiB0aGUgdG9rZW4gaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLlxuICpcbiAqIFRva2VucyB0aGF0IGFyZSB0aGUgcm9vdCBub2RlIG9mIGEgc3VidHJlZSBjb250YWluIHR3byBtb3JlIGVsZW1lbnRzOiAxKSBhblxuICogYXJyYXkgb2YgdG9rZW5zIGluIHRoZSBzdWJ0cmVlIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsIHRlbXBsYXRlIGF0XG4gKiB3aGljaCB0aGUgY2xvc2luZyB0YWcgZm9yIHRoYXQgc2VjdGlvbiBiZWdpbnMuXG4gKlxuICogVG9rZW5zIGZvciBwYXJ0aWFscyBhbHNvIGNvbnRhaW4gdHdvIG1vcmUgZWxlbWVudHM6IDEpIGEgc3RyaW5nIHZhbHVlIG9mXG4gKiBpbmRlbmRhdGlvbiBwcmlvciB0byB0aGF0IHRhZyBhbmQgMikgdGhlIGluZGV4IG9mIHRoYXQgdGFnIG9uIHRoYXQgbGluZSAtXG4gKiBlZyBhIHZhbHVlIG9mIDIgaW5kaWNhdGVzIHRoZSBwYXJ0aWFsIGlzIHRoZSB0aGlyZCB0YWcgb24gdGhpcyBsaW5lLlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZSB0ZW1wbGF0ZSBzdHJpbmdcbiAqIEBwYXJhbSB0YWdzIGRlbGltaXRlcnMgZXgpIFsne3snLCd9fSddIG9yICd7eyB9fSdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGVtcGxhdGUodGVtcGxhdGU6IHN0cmluZywgdGFncz86IERlbGltaXRlcnMpOiBUb2tlbltdIHtcbiAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgbGluZUhhc05vblNwYWNlICAgICA9IGZhbHNlO1xuICAgIGNvbnN0IHNlY3Rpb25zOiBUb2tlbltdID0gW107ICAgICAgIC8vIFN0YWNrIHRvIGhvbGQgc2VjdGlvbiB0b2tlbnNcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gICA9IFtdOyAgICAgICAvLyBCdWZmZXIgdG8gaG9sZCB0aGUgdG9rZW5zXG4gICAgY29uc3Qgc3BhY2VzOiBudW1iZXJbXSAgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgbGV0IGhhc1RhZyAgICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSB7e3RhZ319IG9uIHRoZSBjdXJyZW50IGxpbmU/XG4gICAgbGV0IG5vblNwYWNlICAgICAgICAgICAgPSBmYWxzZTsgICAgLy8gSXMgdGhlcmUgYSBub24tc3BhY2UgY2hhciBvbiB0aGUgY3VycmVudCBsaW5lP1xuICAgIGxldCBpbmRlbnRhdGlvbiAgICAgICAgID0gJyc7ICAgICAgIC8vIFRyYWNrcyBpbmRlbnRhdGlvbiBmb3IgdGFncyB0aGF0IHVzZSBpdFxuICAgIGxldCB0YWdJbmRleCAgICAgICAgICAgID0gMDsgICAgICAgIC8vIFN0b3JlcyBhIGNvdW50IG9mIG51bWJlciBvZiB0YWdzIGVuY291bnRlcmVkIG9uIGEgbGluZVxuXG4gICAgLy8gU3RyaXBzIGFsbCB3aGl0ZXNwYWNlIHRva2VucyBhcnJheSBmb3IgdGhlIGN1cnJlbnQgbGluZVxuICAgIC8vIGlmIHRoZXJlIHdhcyBhIHt7I3RhZ319IG9uIGl0IGFuZCBvdGhlcndpc2Ugb25seSBzcGFjZS5cbiAgICBjb25zdCBzdHJpcFNwYWNlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoaGFzVGFnICYmICFub25TcGFjZSkge1xuICAgICAgICAgICAgd2hpbGUgKHNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdG9rZW5zW3NwYWNlcy5wb3AoKSFdOyAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWFycmF5LWRlbGV0ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BhY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICAgIG5vblNwYWNlID0gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbXBpbGVUYWdzID0gKHRhZ3NUb0NvbXBpbGU6IHN0cmluZyB8IHN0cmluZ1tdKTogeyBvcGVuaW5nVGFnOiBSZWdFeHA7IGNsb3NpbmdUYWc6IFJlZ0V4cDsgY2xvc2luZ0N1cmx5OiBSZWdFeHA7IH0gPT4ge1xuICAgICAgICBjb25zdCBlbnVtIFRhZyB7XG4gICAgICAgICAgICBPUEVOID0gMCxcbiAgICAgICAgICAgIENMT1NFLFxuICAgICAgICB9XG4gICAgICAgIGlmIChpc1N0cmluZyh0YWdzVG9Db21waWxlKSkge1xuICAgICAgICAgICAgdGFnc1RvQ29tcGlsZSA9IHRhZ3NUb0NvbXBpbGUuc3BsaXQoX3JlZ2V4cC5zcGFjZSwgMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQXJyYXkodGFnc1RvQ29tcGlsZSkgfHwgMiAhPT0gdGFnc1RvQ29tcGlsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0YWdzOiAke0pTT04uc3RyaW5naWZ5KHRhZ3NUb0NvbXBpbGUpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcGVuaW5nVGFnOiAgIG5ldyBSZWdFeHAoYCR7ZXNjYXBlVGVtcGxhdGVFeHAodGFnc1RvQ29tcGlsZVtUYWcuT1BFTl0pfVxcXFxzKmApLFxuICAgICAgICAgICAgY2xvc2luZ1RhZzogICBuZXcgUmVnRXhwKGBcXFxccyoke2VzY2FwZVRlbXBsYXRlRXhwKHRhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXSl9YCksXG4gICAgICAgICAgICBjbG9zaW5nQ3VybHk6IG5ldyBSZWdFeHAoYFxcXFxzKiR7ZXNjYXBlVGVtcGxhdGVFeHAoYH0ke3RhZ3NUb0NvbXBpbGVbVGFnLkNMT1NFXX1gKX1gKSxcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyB0YWc6IHJlVGFnLCB3aGl0ZTogcmVXaGl0ZSwgZXF1YWxzOiByZUVxdWFscywgY3VybHk6IHJlQ3VybHkgfSA9IF9yZWdleHA7XG4gICAgbGV0IF9yZWd4cFRhZ3MgPSBjb21waWxlVGFncyh0YWdzID8/IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuXG4gICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIGxldCBvcGVuU2VjdGlvbjogVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgd2hpbGUgKCFzY2FubmVyLmVvcykge1xuICAgICAgICBjb25zdCB7IG9wZW5pbmdUYWc6IHJlT3BlbmluZ1RhZywgY2xvc2luZ1RhZzogcmVDbG9zaW5nVGFnLCBjbG9zaW5nQ3VybHk6IHJlQ2xvc2luZ0N1cmx5IH0gPSBfcmVneHBUYWdzO1xuICAgICAgICBsZXQgdG9rZW46IFRva2VuO1xuICAgICAgICBsZXQgc3RhcnQgPSBzY2FubmVyLnBvcztcbiAgICAgICAgLy8gTWF0Y2ggYW55IHRleHQgYmV0d2VlbiB0YWdzLlxuICAgICAgICBsZXQgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZU9wZW5pbmdUYWcpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCB2YWx1ZUxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IHZhbHVlTGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VzLnB1c2godG9rZW5zLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9IGNocjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVIYXNOb25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uICs9ICcgJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChbJ3RleHQnLCBjaHIsIHN0YXJ0LCBzdGFydCArIDFdKTtcbiAgICAgICAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHdoaXRlc3BhY2Ugb24gdGhlIGN1cnJlbnQgbGluZS5cbiAgICAgICAgICAgICAgICBpZiAoJ1xcbicgPT09IGNocikge1xuICAgICAgICAgICAgICAgICAgICBzdHJpcFNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudGF0aW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHRhZ0luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGluZUhhc05vblNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWF0Y2ggdGhlIG9wZW5pbmcgdGFnLlxuICAgICAgICBpZiAoIXNjYW5uZXIuc2NhbihyZU9wZW5pbmdUYWcpKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGhhc1RhZyA9IHRydWU7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB0YWcgdHlwZS5cbiAgICAgICAgbGV0IHR5cGUgPSBzY2FubmVyLnNjYW4ocmVUYWcpIHx8ICduYW1lJztcbiAgICAgICAgc2Nhbm5lci5zY2FuKHJlV2hpdGUpO1xuXG4gICAgICAgIC8vIEdldCB0aGUgdGFnIHZhbHVlLlxuICAgICAgICBpZiAoJz0nID09PSB0eXBlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHJlRXF1YWxzKTtcbiAgICAgICAgICAgIHNjYW5uZXIuc2NhbihyZUVxdWFscyk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICB9IGVsc2UgaWYgKCd7JyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW4ocmVDdXJseSk7XG4gICAgICAgICAgICBzY2FubmVyLnNjYW5VbnRpbChyZUNsb3NpbmdUYWcpO1xuICAgICAgICAgICAgdHlwZSA9ICcmJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwocmVDbG9zaW5nVGFnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hdGNoIHRoZSBjbG9zaW5nIHRhZy5cbiAgICAgICAgaWYgKCFzY2FubmVyLnNjYW4ocmVDbG9zaW5nVGFnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmNsb3NlZCB0YWcgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgnPicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3MsIGluZGVudGF0aW9uLCB0YWdJbmRleCwgbGluZUhhc05vblNwYWNlXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRva2VuID0gW3R5cGUsIHZhbHVlLCBzdGFydCwgc2Nhbm5lci5wb3NdO1xuICAgICAgICB9XG4gICAgICAgIHRhZ0luZGV4Kys7XG4gICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgICBpZiAoJyMnID09PSB0eXBlIHx8ICdeJyA9PT0gdHlwZSkge1xuICAgICAgICAgICAgc2VjdGlvbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSBpZiAoJy8nID09PSB0eXBlKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICAgICAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgaWYgKCFvcGVuU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5vcGVuZWQgc2VjdGlvbiBcIiR7dmFsdWV9XCIgYXQgJHtzdGFydH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcGVuU2VjdGlvblsxXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuY2xvc2VkIHNlY3Rpb24gXCIke29wZW5TZWN0aW9uWyQuVkFMVUVdfVwiIGF0ICR7c3RhcnR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ25hbWUnID09PSB0eXBlIHx8ICd7JyA9PT0gdHlwZSB8fCAnJicgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIG5vblNwYWNlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICgnPScgPT09IHR5cGUpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgICAgICBfcmVneHBUYWdzID0gY29tcGlsZVRhZ3ModmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RyaXBTcGFjZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICBvcGVuU2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuXG4gICAgaWYgKG9wZW5TZWN0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5jbG9zZWQgc2VjdGlvbiBcIiR7b3BlblNlY3Rpb25bJC5WQUxVRV19XCIgYXQgJHtzY2FubmVyLnBvc31gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVzdFRva2VucyhzcXVhc2hUb2tlbnModG9rZW5zKSk7XG59XG4iLCJpbXBvcnQge1xuICAgIFRlbXBsYXRlRGVsaW1pdGVycyxcbiAgICBUZW1wbGF0ZVdyaXRlcixcbiAgICBUZW1wbGF0ZVZpZXdQYXJhbSxcbiAgICBUZW1wbGF0ZVBhcnRpYWxQYXJhbSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVG9rZW4sXG4gICAgVG9rZW5BZGRyZXNzIGFzICQsXG4gICAgZ2xvYmFsU2V0dGluZ3MsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgY2FjaGUsIGJ1aWxkQ2FjaGVLZXkgfSBmcm9tICcuL2NhY2hlJztcbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHBhcnNlVGVtcGxhdGUgfSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCB7IENvbnRleHQgfSBmcm9tICcuL2NvbnRleHQnO1xuXG4vKipcbiAqIEEgV3JpdGVyIGtub3dzIGhvdyB0byB0YWtlIGEgc3RyZWFtIG9mIHRva2VucyBhbmQgcmVuZGVyIHRoZW0gdG8gYVxuICogc3RyaW5nLCBnaXZlbiBhIGNvbnRleHQuIEl0IGFsc28gbWFpbnRhaW5zIGEgY2FjaGUgb2YgdGVtcGxhdGVzIHRvXG4gKiBhdm9pZCB0aGUgbmVlZCB0byBwYXJzZSB0aGUgc2FtZSB0ZW1wbGF0ZSB0d2ljZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFdyaXRlciBpbXBsZW1lbnRzIFRlbXBsYXRlV3JpdGVyIHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuZCBjYWNoZXMgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBgdGFnc2Agb3JcbiAgICAgKiBgbXVzdGFjaGUudGFnc2AgaWYgYHRhZ3NgIGlzIG9taXR0ZWQsICBhbmQgcmV0dXJucyB0aGUgYXJyYXkgb2YgdG9rZW5zXG4gICAgICogdGhhdCBpcyBnZW5lcmF0ZWQgZnJvbSB0aGUgcGFyc2UuXG4gICAgICovXG4gICAgcGFyc2UodGVtcGxhdGU6IHN0cmluZywgdGFncz86IFRlbXBsYXRlRGVsaW1pdGVycyk6IHsgdG9rZW5zOiBUb2tlbltdOyBjYWNoZUtleTogc3RyaW5nOyB9IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBidWlsZENhY2hlS2V5KHRlbXBsYXRlLCB0YWdzID8/IGdsb2JhbFNldHRpbmdzLnRhZ3MpO1xuICAgICAgICBsZXQgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldIGFzIFRva2VuW107XG4gICAgICAgIGlmIChudWxsID09IHRva2Vucykge1xuICAgICAgICAgICAgdG9rZW5zID0gY2FjaGVbY2FjaGVLZXldID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgdG9rZW5zLCBjYWNoZUtleSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhpZ2gtbGV2ZWwgbWV0aG9kIHRoYXQgaXMgdXNlZCB0byByZW5kZXIgdGhlIGdpdmVuIGB0ZW1wbGF0ZWAgd2l0aFxuICAgICAqIHRoZSBnaXZlbiBgdmlld2AuXG4gICAgICpcbiAgICAgKiBUaGUgb3B0aW9uYWwgYHBhcnRpYWxzYCBhcmd1bWVudCBtYXkgYmUgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlXG4gICAgICogbmFtZXMgYW5kIHRlbXBsYXRlcyBvZiBwYXJ0aWFscyB0aGF0IGFyZSB1c2VkIGluIHRoZSB0ZW1wbGF0ZS4gSXQgbWF5XG4gICAgICogYWxzbyBiZSBhIGZ1bmN0aW9uIHRoYXQgaXMgdXNlZCB0byBsb2FkIHBhcnRpYWwgdGVtcGxhdGVzIG9uIHRoZSBmbHlcbiAgICAgKiB0aGF0IHRha2VzIGEgc2luZ2xlIGFyZ3VtZW50OiB0aGUgbmFtZSBvZiB0aGUgcGFydGlhbC5cbiAgICAgKlxuICAgICAqIElmIHRoZSBvcHRpb25hbCBgdGFnc2AgYXJndW1lbnQgaXMgZ2l2ZW4gaGVyZSBpdCBtdXN0IGJlIGFuIGFycmF5IHdpdGggdHdvXG4gICAgICogc3RyaW5nIHZhbHVlczogdGhlIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGFncyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSAoZS5nLlxuICAgICAqIFsgXCI8JVwiLCBcIiU+XCIgXSkuIFRoZSBkZWZhdWx0IGlzIHRvIG11c3RhY2hlLnRhZ3MuXG4gICAgICovXG4gICAgcmVuZGVyKHRlbXBsYXRlOiBzdHJpbmcsIHZpZXc6IFRlbXBsYXRlVmlld1BhcmFtLCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgeyB0b2tlbnMgfSA9IHRoaXMucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5zLCB2aWV3LCBwYXJ0aWFscywgdGVtcGxhdGUsIHRhZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExvdy1sZXZlbCBtZXRob2QgdGhhdCByZW5kZXJzIHRoZSBnaXZlbiBhcnJheSBvZiBgdG9rZW5zYCB1c2luZ1xuICAgICAqIHRoZSBnaXZlbiBgY29udGV4dGAgYW5kIGBwYXJ0aWFsc2AuXG4gICAgICpcbiAgICAgKiBOb3RlOiBUaGUgYG9yaWdpbmFsVGVtcGxhdGVgIGlzIG9ubHkgZXZlciB1c2VkIHRvIGV4dHJhY3QgdGhlIHBvcnRpb25cbiAgICAgKiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB3YXMgY29udGFpbmVkIGluIGEgaGlnaGVyLW9yZGVyIHNlY3Rpb24uXG4gICAgICogSWYgdGhlIHRlbXBsYXRlIGRvZXNuJ3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucywgdGhpcyBhcmd1bWVudCBtYXlcbiAgICAgKiBiZSBvbWl0dGVkLlxuICAgICAqL1xuICAgIHJlbmRlclRva2Vucyh0b2tlbnM6IFRva2VuW10sIHZpZXc6IFRlbXBsYXRlVmlld1BhcmFtLCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nLCB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9ICh2aWV3IGluc3RhbmNlb2YgQ29udGV4dCkgPyB2aWV3IDogbmV3IENvbnRleHQodmlldyBhcyBQbGFpbk9iamVjdCk7XG4gICAgICAgIGxldCBidWZmZXIgPSAnJztcblxuICAgICAgICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgICAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB2b2lkIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlblskLlRZUEVdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnIyc6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJTZWN0aW9uKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ14nOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmVuZGVySW52ZXJ0ZWQodG9rZW4sIGNvbnRleHQsIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnPic6XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yZW5kZXJQYXJ0aWFsKHRva2VuLCBjb250ZXh0LCBwYXJ0aWFscywgdGFncyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJyYnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMudW5lc2NhcGVkVmFsdWUodG9rZW4sIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICduYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVzY2FwZWRWYWx1ZSh0b2tlbiwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3RleHQnOlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmF3VmFsdWUodG9rZW4pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlbmRlclNlY3Rpb24odG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBsZXQgYnVmZmVyID0gJyc7XG4gICAgICAgIGxldCB2YWx1ZSA9IGNvbnRleHQubG9va3VwKHRva2VuWyQuVkFMVUVdKTtcblxuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gcmVuZGVyIGFuIGFyYml0cmFyeSB0ZW1wbGF0ZVxuICAgICAgICAvLyBpbiB0aGUgY3VycmVudCBjb250ZXh0IGJ5IGhpZ2hlci1vcmRlciBzZWN0aW9ucy5cbiAgICAgICAgY29uc3Qgc3ViUmVuZGVyID0gKHRlbXBsYXRlOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyKHRlbXBsYXRlLCBjb250ZXh0LCBwYXJ0aWFscyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LnB1c2godiksIHBhcnRpYWxzLCBvcmlnaW5hbFRlbXBsYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09PSB0eXBlb2YgdmFsdWUgfHwgJ251bWJlcicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dC5wdXNoKHZhbHVlIGFzIFBsYWluT2JqZWN0KSwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBvcmlnaW5hbFRlbXBsYXRlKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgdXNlIGhpZ2hlci1vcmRlciBzZWN0aW9ucyB3aXRob3V0IHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRXh0cmFjdCB0aGUgcG9ydGlvbiBvZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgdGhhdCB0aGUgc2VjdGlvbiBjb250YWlucy5cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuY2FsbChjb250ZXh0LnZpZXcsIG9yaWdpbmFsVGVtcGxhdGUuc2xpY2UodG9rZW5bJC5FTkRdLCB0b2tlblskLlRBR19JTkRFWF0pLCBzdWJSZW5kZXIpO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgKz0gdmFsdWUgYXMgbnVtYmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVmZmVyICs9IHRoaXMucmVuZGVyVG9rZW5zKHRva2VuWyQuVE9LRU5fTElTVF0gYXMgVG9rZW5bXSwgY29udGV4dCwgcGFydGlhbHMsIG9yaWdpbmFsVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVuZGVySW52ZXJ0ZWQodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0LCBwYXJ0aWFscz86IFRlbXBsYXRlUGFydGlhbFBhcmFtLCBvcmlnaW5hbFRlbXBsYXRlPzogc3RyaW5nKTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAoIXZhbHVlIHx8IChpc0FycmF5KHZhbHVlKSAmJiAwID09PSB2YWx1ZS5sZW5ndGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW5kZXJUb2tlbnModG9rZW5bJC5UT0tFTl9MSVNUXSBhcyBUb2tlbltdLCBjb250ZXh0LCBwYXJ0aWFscywgb3JpZ2luYWxUZW1wbGF0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBpbmRlbnRQYXJ0aWFsKHBhcnRpYWw6IHN0cmluZywgaW5kZW50YXRpb246IHN0cmluZywgbGluZUhhc05vblNwYWNlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgZmlsdGVyZWRJbmRlbnRhdGlvbiA9IGluZGVudGF0aW9uLnJlcGxhY2UoL1teIFxcdF0vZywgJycpO1xuICAgICAgICBjb25zdCBwYXJ0aWFsQnlObCA9IHBhcnRpYWwuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnRpYWxCeU5sLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocGFydGlhbEJ5TmxbaV0ubGVuZ3RoICYmIChpID4gMCB8fCAhbGluZUhhc05vblNwYWNlKSkge1xuICAgICAgICAgICAgICAgIHBhcnRpYWxCeU5sW2ldID0gZmlsdGVyZWRJbmRlbnRhdGlvbiArIHBhcnRpYWxCeU5sW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJ0aWFsQnlObC5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZW5kZXJQYXJ0aWFsKHRva2VuOiBUb2tlbiwgY29udGV4dDogQ29udGV4dCwgcGFydGlhbHM6IFRlbXBsYXRlUGFydGlhbFBhcmFtIHwgdW5kZWZpbmVkLCB0YWdzOiBUZW1wbGF0ZURlbGltaXRlcnMgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgaWYgKCFwYXJ0aWFscykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdmFsdWUgPSAoaXNGdW5jdGlvbihwYXJ0aWFscykgPyBwYXJ0aWFscyh0b2tlblskLlZBTFVFXSkgOiBwYXJ0aWFsc1t0b2tlblskLlZBTFVFXV0pIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmVIYXNOb25TcGFjZSA9IHRva2VuWyQuSEFTX05PX1NQQUNFXTtcbiAgICAgICAgICAgIGNvbnN0IHRhZ0luZGV4ICAgICAgICA9IHRva2VuWyQuVEFHX0lOREVYXTtcbiAgICAgICAgICAgIGNvbnN0IGluZGVudGF0aW9uICAgICA9IHRva2VuWyQuVE9LRU5fTElTVF07XG4gICAgICAgICAgICBsZXQgaW5kZW50ZWRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYgKDAgPT09IHRhZ0luZGV4ICYmIGluZGVudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaW5kZW50ZWRWYWx1ZSA9IHRoaXMuaW5kZW50UGFydGlhbCh2YWx1ZSwgaW5kZW50YXRpb24gYXMgc3RyaW5nLCBsaW5lSGFzTm9uU3BhY2UhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSB0aGlzLnBhcnNlKGluZGVudGVkVmFsdWUsIHRhZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVuZGVyVG9rZW5zKHRva2VucywgY29udGV4dCwgcGFydGlhbHMsIGluZGVudGVkVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdW5lc2NhcGVkVmFsdWUodG9rZW46IFRva2VuLCBjb250ZXh0OiBDb250ZXh0KTogc3RyaW5nIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29udGV4dC5sb29rdXAodG9rZW5bJC5WQUxVRV0pO1xuICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlIGFzIHN0cmluZztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGVzY2FwZWRWYWx1ZSh0b2tlbjogVG9rZW4sIGNvbnRleHQ6IENvbnRleHQpOiBzdHJpbmcgfCB2b2lkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cCh0b2tlblskLlZBTFVFXSk7XG4gICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsU2V0dGluZ3MuZXNjYXBlKHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByYXdWYWx1ZSh0b2tlbjogVG9rZW4pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdG9rZW5bJC5WQUxVRV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBKU1QsXG4gICAgVGVtcGxhdGVEZWxpbWl0ZXJzLFxuICAgIElUZW1wbGF0ZUVuZ2luZSxcbiAgICBUZW1wbGF0ZVNjYW5uZXIsXG4gICAgVGVtcGxhdGVDb250ZXh0LFxuICAgIFRlbXBsYXRlV3JpdGVyLFxuICAgIFRlbXBsYXRlRXNjYXBlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGdsb2JhbFNldHRpbmdzIH0gZnJvbSAnLi9pbnRlcm5hbCc7XG5pbXBvcnQgeyBDYWNoZUxvY2F0aW9uLCBjbGVhckNhY2hlIH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIHR5cGVTdHJpbmcsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2Nhbm5lciB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7IFdyaXRlciB9IGZyb20gJy4vd3JpdGVyJztcblxuLyoqIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gY29tbW9uIHNldHRpbmdzICovXG5nbG9iYWxTZXR0aW5ncy53cml0ZXIgPSBuZXcgV3JpdGVyKCk7XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUVuZ2luZX0gZ2xvYmFsIHNldHRuZyBvcHRpb25zXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlRW5naW5lfSDjgrDjg63jg7zjg5Djg6voqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzIHtcbiAgICB3cml0ZXI/OiBUZW1wbGF0ZVdyaXRlcjtcbiAgICB0YWdzPzogVGVtcGxhdGVEZWxpbWl0ZXJzO1xuICAgIGVzY2FwZT86IFRlbXBsYXRlRXNjYXBlcjtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRlbXBsYXRlRW5naW5lfSBjb21waWxlIG9wdGlvbnNcbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRhZ3M/OiBUZW1wbGF0ZURlbGltaXRlcnM7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlRW5naW5lIHV0aWxpdHkgY2xhc3MuXG4gKiBAamEgVGVtcGxhdGVFbmdpbmUg44Om44O844OG44Kj44Oq44OG44Kj44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUVuZ2luZSBpbXBsZW1lbnRzIElUZW1wbGF0ZUVuZ2luZSB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBKU1R9IGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokge0BsaW5rIEpTVH0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb21waWxlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY29tcGlsZSh0ZW1wbGF0ZTogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVDb21waWxlT3B0aW9ucyk6IEpTVCB7XG4gICAgICAgIGlmICghaXNTdHJpbmcodGVtcGxhdGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIHRlbXBsYXRlISB0aGUgZmlyc3QgYXJndW1lbnQgc2hvdWxkIGJlIGEgXCJzdHJpbmdcIiBidXQgXCIke3R5cGVTdHJpbmcodGVtcGxhdGUpfVwiIHdhcyBnaXZlbiBmb3IgVGVtcGxhdGVFbmdpbmUuY29tcGlsZSh0ZW1wbGF0ZSwgb3B0aW9ucylgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgdGFncyB9ID0gb3B0aW9ucyA/PyBnbG9iYWxTZXR0aW5ncztcbiAgICAgICAgY29uc3QgeyB3cml0ZXIgfSA9IGdsb2JhbFNldHRpbmdzO1xuXG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QsIHBhcnRpYWxzPzogUGxhaW5PYmplY3QpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlci5yZW5kZXIodGVtcGxhdGUsIHZpZXcgPz8ge30sIHBhcnRpYWxzLCB0YWdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB7IHRva2VucywgY2FjaGVLZXkgfSA9IHdyaXRlci5wYXJzZSh0ZW1wbGF0ZSwgdGFncyk7XG4gICAgICAgIGpzdC50b2tlbnMgICAgICAgID0gdG9rZW5zO1xuICAgICAgICBqc3QuY2FjaGVLZXkgICAgICA9IGNhY2hlS2V5O1xuICAgICAgICBqc3QuY2FjaGVMb2NhdGlvbiA9IFtDYWNoZUxvY2F0aW9uLk5BTUVTUEFDRSwgQ2FjaGVMb2NhdGlvbi5ST09UXTtcblxuICAgICAgICByZXR1cm4ganN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgaW4gdGhlIGRlZmF1bHQge0BsaW5rIFRlbXBsYXRlV3JpdGVyfS5cbiAgICAgKiBAamEg5pei5a6a44GuIHtAbGluayBUZW1wbGF0ZVdyaXRlcn0g44Gu44GZ44G544Gm44Gu44Kt44Oj44OD44K344Ol44KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBjbGVhckNhY2hlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoYW5nZSB7QGxpbmsgVGVtcGxhdGVFbmdpbmV9IGdsb2JhbCBzZXR0aW5ncy5cbiAgICAgKiBAamEge0BsaW5rIFRlbXBsYXRlRW5naW5lfSDjgrDjg63jg7zjg5Djg6voqK3lrprjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZXR0aW5nc1xuICAgICAqICAtIGBlbmAgbmV3IHNldHRpbmdzXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYToqK3lrprlgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHNldHRpbmdzXG4gICAgICogIC0gYGphYCDlj6TjgYToqK3lrprlgKRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldEdsb2JhbFNldHRpbmdzKHNldGlpbmdzOiBUZW1wbGF0ZUdsb2JhbFNldHRpbmdzKTogVGVtcGxhdGVHbG9iYWxTZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi5nbG9iYWxTZXR0aW5ncyB9O1xuICAgICAgICBjb25zdCB7IHdyaXRlciwgdGFncywgZXNjYXBlIH0gPSBzZXRpaW5ncztcbiAgICAgICAgd3JpdGVyICYmIChnbG9iYWxTZXR0aW5ncy53cml0ZXIgPSB3cml0ZXIpO1xuICAgICAgICB0YWdzICAgJiYgKGdsb2JhbFNldHRpbmdzLnRhZ3MgICA9IHRhZ3MpO1xuICAgICAgICBlc2NhcGUgJiYgKGdsb2JhbFNldHRpbmdzLmVzY2FwZSA9IGVzY2FwZSk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6IGZvciBkZWJ1Z1xuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUge0BsaW5rIFRlbXBsYXRlU2Nhbm5lcn0gaW5zdGFuY2UgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZVNjYW5uZXIoc3JjOiBzdHJpbmcpOiBUZW1wbGF0ZVNjYW5uZXIge1xuICAgICAgICByZXR1cm4gbmV3IFNjYW5uZXIoc3JjKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIENyZWF0ZSB7QGxpbmsgVGVtcGxhdGVDb250ZXh0fSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlQ29udGV4dCh2aWV3OiBQbGFpbk9iamVjdCwgcGFyZW50Q29udGV4dD86IENvbnRleHQpOiBUZW1wbGF0ZUNvbnRleHQge1xuICAgICAgICByZXR1cm4gbmV3IENvbnRleHQodmlldywgcGFyZW50Q29udGV4dCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBDcmVhdGUge0BsaW5rIFRlbXBsYXRlV3JpdGVyfSBpbnN0YW5jZSAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlV3JpdGVyKCk6IFRlbXBsYXRlV3JpdGVyIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXcml0ZXIoKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiZXNjYXBlSFRNTCIsImdldEdsb2JhbE5hbWVzcGFjZSIsImVuc3VyZU9iamVjdCIsImlzQXJyYXkiLCJpc1ByaW1pdGl2ZSIsImhhcyIsImlzRnVuY3Rpb24iLCJpc1N0cmluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFzQ0E7SUFDTyxNQUFNLGNBQWMsR0FBRztJQUMxQixJQUFBLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDbEIsSUFBQSxNQUFNLEVBQUVBLG9CQUFVO0tBS3JCOztJQzVCRDs7Ozs7SUFLRztJQUNhLFNBQUEsYUFBYSxDQUFDLFFBQWdCLEVBQUUsSUFBd0IsRUFBQTtRQUNwRSxPQUFPLENBQUEsRUFBRyxRQUFRLENBQUEsQ0FBQSxFQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBRTtJQUMxQztJQUVBOzs7OztJQUtHO2FBQ2EsVUFBVSxHQUFBO0lBQ3RCLElBQUEsTUFBTSxTQUFTLEdBQUdDLDRCQUFrQixDQUFBLGFBQUEsK0JBQXlCO1FBQzdELFNBQVMsQ0FBQSxnQkFBQSwwQkFBb0IsR0FBRyxFQUFFO0lBQ3RDO0lBRUE7SUFDTyxNQUFNLEtBQUssR0FBR0Msc0JBQVksQ0FBYyxJQUFJLHlGQUE4Qzs7SUM1QmpHOzs7SUFHRztJQUNHLFNBQVUs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