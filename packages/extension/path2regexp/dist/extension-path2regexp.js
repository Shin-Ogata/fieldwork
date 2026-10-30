/*!
 * @cdp/extension-path2regexp 0.9.22
 *   extension for conversion path to regexp library
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.CDP = global.CDP || {}, global.CDP.Exension = global.CDP.Exension || {})));
})(this, (function (exports) { 'use strict';

    const DEFAULT_DELIMITER = "/";
    const NOOP_VALUE = (value) => value;
    const ID_START = /^[$_\p{ID_Start}]$/u;
    const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
    const ID = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u;
    /**
     * Escape text for stringify to path.
     */
    function escapeText(str) {
        return str.replace(/[{}()\[\]+?!:*\\]/g, "\\$&");
    }
    /**
     * Escape a regular expression string.
     */
    function escape(str) {
        return str.replace(/[.+*?^${}()[\]|/\\]/g, "\\$&");
    }
    /**
     * ParseError is thrown when there is an error processing the path.
     */
    class PathError extends TypeError {
        originalPath;
        constructor(message, originalPath) {
            super(message +
                (originalPath ? `: ${originalPath}` : "") +
                "; visit https://git.new/pathToRegexpError for info");
            this.originalPath = originalPath;
        }
    }
    /**
     * Parse a string for the raw tokens.
     */
    function parse(str, options = {}) {
        const { encodePath = NOOP_VALUE } = options;
        const chars = [...str];
        let index = 0;
        function consumeUntil(end) {
            const output = [];
            let path = "";
            function writePath() {
                if (!path)
                    return;
                output.push({
                    type: "text",
                    value: encodePath(path),
                });
                path = "";
            }
            while (index < chars.length) {
                const char = chars[index++];
                if (char === end) {
                    writePath();
                    return output;
                }
                if (char === "\\") {
                    if (index === chars.length) {
                        throw new PathError(`Unexpected end after \\ at index ${index}`, str);
                    }
                    path += chars[index++];
                    continue;
                }
                if (char === ":" || char === "*") {
                    const type = char === ":" ? "param" : "wildcard";
                    let name = "";
                    if (ID_START.test(chars[index])) {
                        do {
                            name += chars[index++];
                        } while (ID_CONTINUE.test(chars[index]));
                    }
                    else if (chars[index] === '"') {
                        let quoteStart = index;
                        while (index < chars.length) {
                            if (chars[++index] === '"') {
                                index++;
                                quoteStart = 0;
                                break;
                            }
                            // Increment over escape characters.
                            if (chars[index] === "\\")
                                index++;
                            name += chars[index];
                        }
                        if (quoteStart) {
                            throw new PathError(`Unterminated quote at index ${quoteStart}`, str);
                        }
                    }
                    if (!name) {
                        throw new PathError(`Missing parameter name at index ${index}`, str);
                    }
                    writePath();
                    output.push({ type, name });
                    continue;
                }
                if (char === "{") {
                    writePath();
                    output.push({
                        type: "group",
                        tokens: consumeUntil("}"),
                    });
                    continue;
                }
                if ("}()[]+?!".includes(char)) {
                    throw new PathError(`Unexpected ${char} at index ${index - 1}`, str);
                }
                path += char;
            }
            if (end) {
                throw new PathError(`Unexpected end at index ${index}, expected ${end}`, str);
            }
            writePath();
            return output;
        }
        return {
            tokens: consumeUntil(""),
            originalPath: str,
        };
    }
    /**
     * Compile a string to a template function for the path.
     */
    function compile(path, options = {}) {
        const { encode = encodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
        const data = typeof path === "object" ? path : parse(path, options);
        const fn = tokensToFunction(data.tokens, delimiter, encode);
        return function path(params = {}) {
            const missing = [];
            const path = fn(params, missing);
            if (missing.length) {
                throw new TypeError(`Missing parameters: ${missing.join(", ")}`);
            }
            return path;
        };
    }
    function tokensToFunction(tokens, delimiter, encode) {
        const encoders = tokens.map((token) => tokenToFunction(token, delimiter, encode));
        return (data, missing) => {
            let result = "";
            for (const encoder of encoders) {
                result += encoder(data, missing);
            }
            return result;
        };
    }
    /**
     * Convert a single token into a path building function.
     */
    function tokenToFunction(token, delimiter, encode) {
        if (token.type === "text")
            return () => token.value;
        if (token.type === "group") {
            const fn = tokensToFunction(token.tokens, delimiter, encode);
            return (data, missing) => {
                const len = missing.length;
                const value = fn(data, missing);
                if (missing.length === len)
                    return value;
                missing.length = len; // Reset optional group.
                return "";
            };
        }
        const encodeValue = encode || NOOP_VALUE;
        if (token.type === "wildcard" && encode !== false) {
            return (data, missing) => {
                const value = data[token.name];
                if (value == null) {
                    missing.push(token.name);
                    return "";
                }
                if (!Array.isArray(value) || value.length === 0) {
                    throw new TypeError(`Expected "${token.name}" to be a non-empty array`);
                }
                let result = "";
                for (let i = 0; i < value.length; i++) {
                    if (typeof value[i] !== "string") {
                        throw new TypeError(`Expected "${token.name}/${i}" to be a string`);
                    }
                    if (i > 0)
                        result += delimiter;
                    result += encodeValue(value[i]);
                }
                if (!result) {
                    throw new TypeError(`Expected "${token.name}" to be a non-empty array`);
                }
                return result;
            };
        }
        return (data, missing) => {
            const value = data[token.name];
            if (value == null) {
                missing.push(token.name);
                return "";
            }
            if (typeof value !== "string" || value.length === 0) {
                throw new TypeError(`Expected "${token.name}" to be a non-empty string`);
            }
            return encodeValue(value);
        };
    }
    /**
     * Transform a path into a match function.
     */
    function match(path, options = {}) {
        const { decode = decodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
        const { regexp, keys } = pathToRegexp(path, options);
        const decoders = keys.map((key) => {
            if (decode === false)
                return NOOP_VALUE;
            if (key.type === "param")
                return decode;
            return (value) => value.split(delimiter).map(decode);
        });
        return function match(input) {
            const m = regexp.exec(input);
            if (!m)
                return false;
            const path = m[0];
            const params = Object.create(null);
            for (let i = 1; i < m.length; i++) {
                if (m[i] === undefined)
                    continue;
                const key = keys[i - 1];
                const decoder = decoders[i - 1];
                params[key.name] = decoder(m[i]);
            }
            return { path, params };
        };
    }
    /**
     * Transform a path into a regular expression and capture keys.
     */
    function pathToRegexp(path, options = {}) {
        const { delimiter = DEFAULT_DELIMITER, end = true, sensitive = false, trailing = true, } = options;
        const keys = [];
        let source = "";
        let combinations = 0;
        function process(path) {
            if (Array.isArray(path)) {
                for (const p of path)
                    process(p);
                return;
            }
            const data = typeof path === "object" ? path : parse(path, options);
            flatten(data.tokens, 0, [], (tokens) => {
                if (combinations >= 256) {
                    throw new PathError("Too many path combinations", data.originalPath);
                }
                if (combinations > 0)
                    source += "|";
                source += toRegExpSource(tokens, delimiter, keys, data.originalPath, trailing);
                combinations++;
            });
        }
        process(path);
        let pattern = `^(?:${source})`;
        pattern += end ? "$" : "(?=" + escape(delimiter) + "|$)";
        return { regexp: new RegExp(pattern, sensitive ? "" : "i"), keys };
    }
    /**
     * Generate a flat list of sequence tokens from the given tokens.
     */
    function flatten(tokens, index, result, callback) {
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type === "group") {
                const len = result.length;
                flatten(token.tokens, 0, result, (seq) => flatten(tokens, index, seq, callback));
                result.length = len;
                continue;
            }
            result.push(token);
        }
        callback(result);
    }
    /**
     * Transform a flat sequence of tokens into a regular expression.
     */
    function toRegExpSource(tokens, delimiter, keys, originalPath, trailing) {
        let result = "";
        let prefix = "";
        let hasWildcardAhead = false;
        let hasSegmentWildcard = false;
        let wildcardBacktrack = "";
        let index = 0;
        function seekWildcard(index) {
            while (index < tokens.length) {
                const token = tokens[index++];
                if (token.type === "wildcard")
                    return true;
            }
            return false;
        }
        function textRemaining(index) {
            let result = "";
            while (index < tokens.length) {
                const token = tokens[index++];
                if (token.type !== "text")
                    return result;
                if (token.value.includes(delimiter))
                    break;
                result += token.value;
            }
        }
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type === "text") {
                const value = escape(token.value);
                result += value;
                wildcardBacktrack += value;
                prefix += token.value;
                if (token.value.includes(delimiter))
                    hasSegmentWildcard = false;
                continue;
            }
            if (token.type === "param" || token.type === "wildcard") {
                if (result && !prefix) {
                    throw new PathError(`Missing text before "${token.name}" ${token.type}`, originalPath);
                }
                keys.push(token);
                if (token.type === "param") {
                    if (hasSegmentWildcard) {
                        const value = negate(delimiter, prefix);
                        result += `(${value}+?|${value}*${escape(prefix)})`;
                    }
                    else {
                        const text = textRemaining(index);
                        if (text) {
                            result += `(?=(${negate(delimiter, "")}+?)${escape(text)})(?:\\${keys.length})`;
                        }
                        else {
                            result += `(${negate(delimiter, "")}+)`;
                        }
                    }
                }
                else {
                    // If we had a wildcard, close lookahead and reset.
                    if (hasWildcardAhead)
                        result += `)${wildcardBacktrack}`;
                    hasWildcardAhead = seekWildcard(index);
                    // Lock earlier wildcards; leave the last one greedy.
                    result += hasWildcardAhead ? "(?=([^]+?)" : "([^]+)";
                    hasSegmentWildcard = true;
                    wildcardBacktrack = "";
                }
                wildcardBacktrack += `(?:\\${keys.length})`;
                prefix = "";
                continue;
            }
            throw new TypeError(`Unknown token type: ${token.type}`);
        }
        if (trailing && !prefix.endsWith(delimiter)) {
            result += "(?:" + escape(delimiter) + "$)?";
        }
        return result;
    }
    /**
     * Block backtracking on previous text/delimiter.
     */
    function negate(a, b) {
        if (b.length > a.length)
            return negate(b, a); // Longest string first.
        if (a === b)
            b = ""; // Cleaner regex strings, no duplication.
        if (b.length > 1)
            return `(?:(?!${escape(a)}|${escape(b)})[^])`;
        if (a.length > 1)
            return `(?:(?!${escape(a)})[^${escape(b)}])`;
        return `[^${escape(a + b)}]`;
    }
    /**
     * Stringify token data into a path string.
     */
    function stringify(data) {
        const { tokens } = data;
        let index = 0;
        let value = "";
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type === "text") {
                value += escapeText(token.value);
                continue;
            }
            if (token.type === "group") {
                value += "{" + stringify(token) + "}";
                continue;
            }
            if (token.type === "param") {
                value += ":" + stringifyName(token.name, tokens, index);
                continue;
            }
            if (token.type === "wildcard") {
                value += "*" + stringifyName(token.name, tokens, index);
                continue;
            }
            throw new TypeError(`Unknown token type: ${token.type}`);
        }
        return value;
    }
    /**
     * Wrap a parameter name in quotes, escaping only the characters the parser
     * treats specially inside a quoted name (`"` and `\`). `JSON.stringify` can't
     * be used here because it emits escapes like `\n` that the parser reads back as
     * the literal character `n`, so names with control characters wouldn't survive
     * a `parse` -> `stringify` -> `parse` round trip.
     */
    function quoteName(name) {
        return `"${name.replace(/["\\]/g, "\\$&")}"`;
    }
    /**
     * Stringify a parameter name, escaping when it cannot be emitted directly.
     */
    function stringifyName(name, tokens, index) {
        if (!ID.test(name))
            return quoteName(name);
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type === "text") {
                if (!token.value)
                    continue;
                // Destructuring reads the first *code point*, matching `parse`, which
                // iterates the path with `[...str]`. Indexing with `[0]` would read only the
                // leading surrogate of an astral character, missing that the parser treats
                // the whole character as `ID_Continue` and absorbs it into the name.
                const [first] = token.value;
                if (ID_CONTINUE.test(first))
                    return quoteName(name);
            }
            break;
        }
        return name;
    }

    /* eslint-disable
        @typescript-eslint/no-namespace,
     */
    const path2regexp = {
        PathError: PathError,
        parse,
        compile,
        match,
        stringify,
        pathToRegexp,
    };

    exports.path2regexp = path2regexp;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX1NUQVJUID0gL15bJF9cXHB7SURfU3RhcnR9XSQvdTtcbmNvbnN0IElEX0NPTlRJTlVFID0gL15bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0kL3U7XG5jb25zdCBJRCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV1bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0qJC91O1xuXG4vKipcbiAqIEVuY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBFbmNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG4vKipcbiAqIERlY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBEZWNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzLlxuICAgKi9cbiAgZW5jb2RlUGF0aD86IEVuY29kZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIE1hdGNoZXMgdGhlIHBhdGggY29tcGxldGVseSB3aXRob3V0IHRyYWlsaW5nIGNoYXJhY3RlcnMuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3dzIG9wdGlvbmFsIHRyYWlsaW5nIGRlbGltaXRlciB0byBtYXRjaC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHRyYWlsaW5nPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE1hdGNoIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaE9wdGlvbnMgZXh0ZW5kcyBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBkZWNvZGluZyBzdHJpbmdzIGZvciBwYXJhbXMsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBkZWNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZGVjb2RlPzogRGVjb2RlIHwgZmFsc2U7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZU9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEVzY2FwZSB0ZXh0IGZvciBzdHJpbmdpZnkgdG8gcGF0aC5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlVGV4dChzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1t7fSgpXFxbXFxdKz8hOipcXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGUoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bLisqP14ke30oKVtcXF18L1xcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuXG4vKipcbiAqIFBsYWluIHRleHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGV4dCB7XG4gIHR5cGU6IFwidGV4dFwiO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIGFyYml0cmFyeSB0ZXh0IHdpdGhpbiBhIHNlZ21lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyIHtcbiAgdHlwZTogXCJwYXJhbVwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB3aWxkY2FyZCBwYXJhbWV0ZXIgZGVzaWduZWQgdG8gbWF0Y2ggbXVsdGlwbGUgc2VnbWVudHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgV2lsZGNhcmQge1xuICB0eXBlOiBcIndpbGRjYXJkXCI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHNldCBvZiBwb3NzaWJsZSB0b2tlbnMgdG8gZXhwYW5kIHdoZW4gbWF0Y2hpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JvdXAge1xuICB0eXBlOiBcImdyb3VwXCI7XG4gIHRva2VuczogcmVhZG9ubHkgVG9rZW5bXTtcbn1cblxuLyoqXG4gKiBUb2tlbnMgdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgcmVnZXhwIGNhcHR1cmUuXG4gKi9cbmV4cG9ydCB0eXBlIEtleSA9IFBhcmFtZXRlciB8IFdpbGRjYXJkO1xuXG4vKipcbiAqIEEgc2VxdWVuY2Ugb2YgcGF0aCBtYXRjaCBjaGFyYWN0ZXJzLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IFRleHQgfCBQYXJhbWV0ZXIgfCBXaWxkY2FyZCB8IEdyb3VwO1xuXG4vKipcbiAqIFRva2VuaXplZCBwYXRoIGluc3RhbmNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRva2VuRGF0YSB7XG4gIHRva2VuczogcmVhZG9ubHkgVG9rZW5bXTtcbiAgb3JpZ2luYWxQYXRoPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFBhcnNlRXJyb3IgaXMgdGhyb3duIHdoZW4gdGhlcmUgaXMgYW4gZXJyb3IgcHJvY2Vzc2luZyB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdGhFcnJvciBleHRlbmRzIFR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3JpZ2luYWxQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICkge1xuICAgIHN1cGVyKFxuICAgICAgbWVzc2FnZSArXG4gICAgICAgIChvcmlnaW5hbFBhdGggPyBgOiAke29yaWdpbmFsUGF0aH1gIDogXCJcIikgK1xuICAgICAgICBcIjsgdmlzaXQgaHR0cHM6Ly9naXQubmV3L3BhdGhUb1JlZ2V4cEVycm9yIGZvciBpbmZvXCIsXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cjogc3RyaW5nLCBvcHRpb25zOiBQYXJzZU9wdGlvbnMgPSB7fSk6IFRva2VuRGF0YSB7XG4gIGNvbnN0IHsgZW5jb2RlUGF0aCA9IE5PT1BfVkFMVUUgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGNoYXJzID0gWy4uLnN0cl07XG4gIGxldCBpbmRleCA9IDA7XG5cbiAgZnVuY3Rpb24gY29uc3VtZVVudGlsKGVuZDogc3RyaW5nKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgb3V0cHV0OiBUb2tlbltdID0gW107XG4gICAgbGV0IHBhdGggPSBcIlwiO1xuXG4gICAgZnVuY3Rpb24gd3JpdGVQYXRoKCkge1xuICAgICAgaWYgKCFwYXRoKSByZXR1cm47XG4gICAgICBvdXRwdXQucHVzaCh7XG4gICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICB2YWx1ZTogZW5jb2RlUGF0aChwYXRoKSxcbiAgICAgIH0pO1xuICAgICAgcGF0aCA9IFwiXCI7XG4gICAgfVxuXG4gICAgd2hpbGUgKGluZGV4IDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjaGFyID0gY2hhcnNbaW5kZXgrK107XG5cbiAgICAgIGlmIChjaGFyID09PSBlbmQpIHtcbiAgICAgICAgd3JpdGVQYXRoKCk7XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFyID09PSBcIlxcXFxcIikge1xuICAgICAgICBpZiAoaW5kZXggPT09IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoYFVuZXhwZWN0ZWQgZW5kIGFmdGVyIFxcXFwgYXQgaW5kZXggJHtpbmRleH1gLCBzdHIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGF0aCArPSBjaGFyc1tpbmRleCsrXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFyID09PSBcIjpcIiB8fCBjaGFyID09PSBcIipcIikge1xuICAgICAgICBjb25zdCB0eXBlID0gY2hhciA9PT0gXCI6XCIgPyBcInBhcmFtXCIgOiBcIndpbGRjYXJkXCI7XG4gICAgICAgIGxldCBuYW1lID0gXCJcIjtcblxuICAgICAgICBpZiAoSURfU1RBUlQudGVzdChjaGFyc1tpbmRleF0pKSB7XG4gICAgICAgICAgZG8ge1xuICAgICAgICAgICAgbmFtZSArPSBjaGFyc1tpbmRleCsrXTtcbiAgICAgICAgICB9IHdoaWxlIChJRF9DT05USU5VRS50ZXN0KGNoYXJzW2luZGV4XSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYXJzW2luZGV4XSA9PT0gJ1wiJykge1xuICAgICAgICAgIGxldCBxdW90ZVN0YXJ0ID0gaW5kZXg7XG5cbiAgICAgICAgICB3aGlsZSAoaW5kZXggPCBjaGFycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChjaGFyc1srK2luZGV4XSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICBxdW90ZVN0YXJ0ID0gMDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluY3JlbWVudCBvdmVyIGVzY2FwZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgaWYgKGNoYXJzW2luZGV4XSA9PT0gXCJcXFxcXCIpIGluZGV4Kys7XG5cbiAgICAgICAgICAgIG5hbWUgKz0gY2hhcnNbaW5kZXhdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChxdW90ZVN0YXJ0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFxuICAgICAgICAgICAgICBgVW50ZXJtaW5hdGVkIHF1b3RlIGF0IGluZGV4ICR7cXVvdGVTdGFydH1gLFxuICAgICAgICAgICAgICBzdHIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyIG5hbWUgYXQgaW5kZXggJHtpbmRleH1gLCBzdHIpO1xuICAgICAgICB9XG5cbiAgICAgICAgd3JpdGVQYXRoKCk7XG4gICAgICAgIG91dHB1dC5wdXNoKHsgdHlwZSwgbmFtZSB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFyID09PSBcIntcIikge1xuICAgICAgICB3cml0ZVBhdGgoKTtcbiAgICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICB0b2tlbnM6IGNvbnN1bWVVbnRpbChcIn1cIiksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKFwifSgpW10rPyFcIi5pbmNsdWRlcyhjaGFyKSkge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBVbmV4cGVjdGVkICR7Y2hhcn0gYXQgaW5kZXggJHtpbmRleCAtIDF9YCwgc3RyKTtcbiAgICAgIH1cblxuICAgICAgcGF0aCArPSBjaGFyO1xuICAgIH1cblxuICAgIGlmIChlbmQpIHtcbiAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoXG4gICAgICAgIGBVbmV4cGVjdGVkIGVuZCBhdCBpbmRleCAke2luZGV4fSwgZXhwZWN0ZWQgJHtlbmR9YCxcbiAgICAgICAgc3RyLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICB3cml0ZVBhdGgoKTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0b2tlbnM6IGNvbnN1bWVVbnRpbChcIlwiKSxcbiAgICBvcmlnaW5hbFBhdGg6IHN0cixcbiAgfTtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgUGFyYW1EYXRhID0gUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7IGVuY29kZSA9IGVuY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgZGF0YSA9IHR5cGVvZiBwYXRoID09PSBcIm9iamVjdFwiID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24oZGF0YS50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICByZXR1cm4gZnVuY3Rpb24gcGF0aChwYXJhbXM6IFAgPSB7fSBhcyBQKSB7XG4gICAgY29uc3QgbWlzc2luZzogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBwYXRoID0gZm4ocGFyYW1zLCBtaXNzaW5nKTtcblxuICAgIGlmIChtaXNzaW5nLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXJzOiAke21pc3Npbmcuam9pbihcIiwgXCIpfWApO1xuICAgIH1cblxuICAgIHJldHVybiBwYXRoO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBQYXJhbURhdGEgPSBQYXJ0aWFsPFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdPj47XG5leHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAoZGF0YT86IFApID0+IHN0cmluZztcblxuLyoqXG4gKiBJbnRlcm5hbCBwYXRoIGJ1aWxkZXIgZnVuY3Rpb24uXG4gKi9cbnR5cGUgVG9rZW5FbmNvZGVyID0gKGRhdGE6IFBhcmFtRGF0YSwgbWlzc2luZzogc3RyaW5nW10pID0+IHN0cmluZztcblxuZnVuY3Rpb24gdG9rZW5zVG9GdW5jdGlvbihcbiAgdG9rZW5zOiByZWFkb25seSBUb2tlbltdLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbik6IFRva2VuRW5jb2RlciB7XG4gIGNvbnN0IGVuY29kZXJzID0gdG9rZW5zLm1hcCgodG9rZW4pID0+XG4gICAgdG9rZW5Ub0Z1bmN0aW9uKHRva2VuLCBkZWxpbWl0ZXIsIGVuY29kZSksXG4gICk7XG5cbiAgcmV0dXJuIChkYXRhOiBQYXJhbURhdGEsIG1pc3Npbmc6IHN0cmluZ1tdKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IFwiXCI7XG5cbiAgICBmb3IgKGNvbnN0IGVuY29kZXIgb2YgZW5jb2RlcnMpIHtcbiAgICAgIHJlc3VsdCArPSBlbmNvZGVyKGRhdGEsIG1pc3NpbmcpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydCBhIHNpbmdsZSB0b2tlbiBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gdG9rZW5Ub0Z1bmN0aW9uKFxuICB0b2tlbjogVG9rZW4sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogVG9rZW5FbmNvZGVyIHtcbiAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSByZXR1cm4gKCkgPT4gdG9rZW4udmFsdWU7XG5cbiAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgIGNvbnN0IGZuID0gdG9rZW5zVG9GdW5jdGlvbih0b2tlbi50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICAgIHJldHVybiAoZGF0YSwgbWlzc2luZykgPT4ge1xuICAgICAgY29uc3QgbGVuID0gbWlzc2luZy5sZW5ndGg7XG4gICAgICBjb25zdCB2YWx1ZSA9IGZuKGRhdGEsIG1pc3NpbmcpO1xuICAgICAgaWYgKG1pc3NpbmcubGVuZ3RoID09PSBsZW4pIHJldHVybiB2YWx1ZTtcblxuICAgICAgbWlzc2luZy5sZW5ndGggPSBsZW47IC8vIFJlc2V0IG9wdGlvbmFsIGdyb3VwLlxuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGVuY29kZVZhbHVlID0gZW5jb2RlIHx8IE5PT1BfVkFMVUU7XG5cbiAgaWYgKHRva2VuLnR5cGUgPT09IFwid2lsZGNhcmRcIiAmJiBlbmNvZGUgIT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIChkYXRhLCBtaXNzaW5nKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICBtaXNzaW5nLnB1c2godG9rZW4ubmFtZSk7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIG5vbi1lbXB0eSBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICBsZXQgcmVzdWx0ID0gXCJcIjtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlW2ldICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9LyR7aX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGkgPiAwKSByZXN1bHQgKz0gZGVsaW1pdGVyO1xuICAgICAgICByZXN1bHQgKz0gZW5jb2RlVmFsdWUodmFsdWVbaV0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIG5vbi1lbXB0eSBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gKGRhdGEsIG1pc3NpbmcpID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgIG1pc3NpbmcucHVzaCh0b2tlbi5uYW1lKTtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIG5vbi1lbXB0eSBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW5jb2RlVmFsdWUodmFsdWUpO1xuICB9O1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggcmVzdWx0IGNvbnRhaW5zIGRhdGEgYWJvdXQgdGhlIHBhdGggbWF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4ge1xuICBwYXRoOiBzdHJpbmc7XG4gIHBhcmFtczogUDtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIGlzIGVpdGhlciBgZmFsc2VgIChubyBtYXRjaCkgb3IgYSBtYXRjaCByZXN1bHQuXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gZmFsc2UgfCBNYXRjaFJlc3VsdDxQPjtcblxuLyoqXG4gKiBUaGUgbWF0Y2ggZnVuY3Rpb24gdGFrZXMgYSBzdHJpbmcgYW5kIHJldHVybnMgd2hldGhlciBpdCBtYXRjaGVkIHRoZSBwYXRoLlxuICovXG5leHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKHBhdGg6IHN0cmluZykgPT4gTWF0Y2g8UD47XG5cbi8qKlxuICogU3VwcG9ydGVkIHBhdGggaW5wdXRzLlxuICovXG5leHBvcnQgdHlwZSBQYXRoID0gc3RyaW5nIHwgVG9rZW5EYXRhO1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHBhdGggaW50byBhIG1hdGNoIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IE1hdGNoT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKTogTWF0Y2hGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHsgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50LCBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUiB9ID1cbiAgICBvcHRpb25zO1xuICBjb25zdCB7IHJlZ2V4cCwga2V5cyB9ID0gcGF0aFRvUmVnZXhwKHBhdGgsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGRlY29kZXJzID0ga2V5cy5tYXAoKGtleSkgPT4ge1xuICAgIGlmIChkZWNvZGUgPT09IGZhbHNlKSByZXR1cm4gTk9PUF9WQUxVRTtcbiAgICBpZiAoa2V5LnR5cGUgPT09IFwicGFyYW1cIikgcmV0dXJuIGRlY29kZTtcbiAgICByZXR1cm4gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnNwbGl0KGRlbGltaXRlcikubWFwKGRlY29kZSk7XG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiBtYXRjaChpbnB1dDogc3RyaW5nKSB7XG4gICAgY29uc3QgbSA9IHJlZ2V4cC5leGVjKGlucHV0KTtcbiAgICBpZiAoIW0pIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHBhdGggPSBtWzBdO1xuICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtW2ldID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIGNvbnN0IGRlY29kZXIgPSBkZWNvZGVyc1tpIC0gMV07XG4gICAgICBwYXJhbXNba2V5Lm5hbWVdID0gZGVjb2RlcihtW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXRoLCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBwYXRoIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24gYW5kIGNhcHR1cmUga2V5cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1JlZ2V4cChcbiAgcGF0aDogUGF0aCB8IFBhdGhbXSxcbiAgb3B0aW9uczogUGF0aFRvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKSB7XG4gIGNvbnN0IHtcbiAgICBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUixcbiAgICBlbmQgPSB0cnVlLFxuICAgIHNlbnNpdGl2ZSA9IGZhbHNlLFxuICAgIHRyYWlsaW5nID0gdHJ1ZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGtleXM6IEtleVtdID0gW107XG4gIGxldCBzb3VyY2UgPSBcIlwiO1xuICBsZXQgY29tYmluYXRpb25zID0gMDtcblxuICBmdW5jdGlvbiBwcm9jZXNzKHBhdGg6IFBhdGggfCBQYXRoW10pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgICAgZm9yIChjb25zdCBwIG9mIHBhdGgpIHByb2Nlc3MocCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHR5cGVvZiBwYXRoID09PSBcIm9iamVjdFwiID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICAgIGZsYXR0ZW4oZGF0YS50b2tlbnMsIDAsIFtdLCAodG9rZW5zKSA9PiB7XG4gICAgICBpZiAoY29tYmluYXRpb25zID49IDI1Nikge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFwiVG9vIG1hbnkgcGF0aCBjb21iaW5hdGlvbnNcIiwgZGF0YS5vcmlnaW5hbFBhdGgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tYmluYXRpb25zID4gMCkgc291cmNlICs9IFwifFwiO1xuICAgICAgc291cmNlICs9IHRvUmVnRXhwU291cmNlKFxuICAgICAgICB0b2tlbnMsXG4gICAgICAgIGRlbGltaXRlcixcbiAgICAgICAga2V5cyxcbiAgICAgICAgZGF0YS5vcmlnaW5hbFBhdGgsXG4gICAgICAgIHRyYWlsaW5nLFxuICAgICAgKTtcbiAgICAgIGNvbWJpbmF0aW9ucysrO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvY2VzcyhwYXRoKTtcblxuICBsZXQgcGF0dGVybiA9IGBeKD86JHtzb3VyY2V9KWA7XG4gIHBhdHRlcm4gKz0gZW5kID8gXCIkXCIgOiBcIig/PVwiICsgZXNjYXBlKGRlbGltaXRlcikgKyBcInwkKVwiO1xuXG4gIHJldHVybiB7IHJlZ2V4cDogbmV3IFJlZ0V4cChwYXR0ZXJuLCBzZW5zaXRpdmUgPyBcIlwiIDogXCJpXCIpLCBrZXlzIH07XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBmbGF0IGxpc3Qgb2Ygc2VxdWVuY2UgdG9rZW5zIGZyb20gdGhlIGdpdmVuIHRva2Vucy5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbihcbiAgdG9rZW5zOiByZWFkb25seSBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuICByZXN1bHQ6IEV4Y2x1ZGU8VG9rZW4sIEdyb3VwPltdLFxuICBjYWxsYmFjazogKHJlc3VsdDogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10pID0+IHZvaWQsXG4pOiB2b2lkIHtcbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgICAgY29uc3QgbGVuID0gcmVzdWx0Lmxlbmd0aDtcbiAgICAgIGZsYXR0ZW4odG9rZW4udG9rZW5zLCAwLCByZXN1bHQsIChzZXEpID0+XG4gICAgICAgIGZsYXR0ZW4odG9rZW5zLCBpbmRleCwgc2VxLCBjYWxsYmFjayksXG4gICAgICApO1xuICAgICAgcmVzdWx0Lmxlbmd0aCA9IGxlbjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKHRva2VuKTtcbiAgfVxuXG4gIGNhbGxiYWNrKHJlc3VsdCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgZmxhdCBzZXF1ZW5jZSBvZiB0b2tlbnMgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqL1xuZnVuY3Rpb24gdG9SZWdFeHBTb3VyY2UoXG4gIHRva2VuczogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBrZXlzOiBLZXlbXSxcbiAgb3JpZ2luYWxQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHRyYWlsaW5nOiBib29sZWFuLFxuKTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gIGxldCBwcmVmaXggPSBcIlwiO1xuICBsZXQgaGFzV2lsZGNhcmRBaGVhZCA9IGZhbHNlO1xuICBsZXQgaGFzU2VnbWVudFdpbGRjYXJkID0gZmFsc2U7XG4gIGxldCB3aWxkY2FyZEJhY2t0cmFjayA9IFwiXCI7XG4gIGxldCBpbmRleCA9IDA7XG5cbiAgZnVuY3Rpb24gc2Vla1dpbGRjYXJkKGluZGV4OiBudW1iZXIpIHtcbiAgICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB0ZXh0UmVtYWluaW5nKGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcbiAgICAgIGlmICh0b2tlbi50eXBlICE9PSBcInRleHRcIikgcmV0dXJuIHJlc3VsdDtcbiAgICAgIGlmICh0b2tlbi52YWx1ZS5pbmNsdWRlcyhkZWxpbWl0ZXIpKSBicmVhaztcbiAgICAgIHJlc3VsdCArPSB0b2tlbi52YWx1ZTtcbiAgICB9XG4gIH1cblxuICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZXNjYXBlKHRva2VuLnZhbHVlKTtcbiAgICAgIHJlc3VsdCArPSB2YWx1ZTtcbiAgICAgIHdpbGRjYXJkQmFja3RyYWNrICs9IHZhbHVlO1xuICAgICAgcHJlZml4ICs9IHRva2VuLnZhbHVlO1xuICAgICAgaWYgKHRva2VuLnZhbHVlLmluY2x1ZGVzKGRlbGltaXRlcikpIGhhc1NlZ21lbnRXaWxkY2FyZCA9IGZhbHNlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIiB8fCB0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIGlmIChyZXN1bHQgJiYgIXByZWZpeCkge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFxuICAgICAgICAgIGBNaXNzaW5nIHRleHQgYmVmb3JlIFwiJHt0b2tlbi5uYW1lfVwiICR7dG9rZW4udHlwZX1gLFxuICAgICAgICAgIG9yaWdpbmFsUGF0aCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAga2V5cy5wdXNoKHRva2VuKTtcblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikge1xuICAgICAgICBpZiAoaGFzU2VnbWVudFdpbGRjYXJkKSB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBuZWdhdGUoZGVsaW1pdGVyLCBwcmVmaXgpO1xuICAgICAgICAgIHJlc3VsdCArPSBgKCR7dmFsdWV9Kz98JHt2YWx1ZX0qJHtlc2NhcGUocHJlZml4KX0pYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB0ZXh0ID0gdGV4dFJlbWFpbmluZyhpbmRleCk7XG5cbiAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IGAoPz0oJHtuZWdhdGUoZGVsaW1pdGVyLCBcIlwiKX0rPykke2VzY2FwZSh0ZXh0KX0pKD86XFxcXCR7a2V5cy5sZW5ndGh9KWA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBgKCR7bmVnYXRlKGRlbGltaXRlciwgXCJcIil9KylgO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgd2UgaGFkIGEgd2lsZGNhcmQsIGNsb3NlIGxvb2thaGVhZCBhbmQgcmVzZXQuXG4gICAgICAgIGlmIChoYXNXaWxkY2FyZEFoZWFkKSByZXN1bHQgKz0gYCkke3dpbGRjYXJkQmFja3RyYWNrfWA7XG5cbiAgICAgICAgaGFzV2lsZGNhcmRBaGVhZCA9IHNlZWtXaWxkY2FyZChpbmRleCk7XG5cbiAgICAgICAgLy8gTG9jayBlYXJsaWVyIHdpbGRjYXJkczsgbGVhdmUgdGhlIGxhc3Qgb25lIGdyZWVkeS5cbiAgICAgICAgcmVzdWx0ICs9IGhhc1dpbGRjYXJkQWhlYWQgPyBcIig/PShbXl0rPylcIiA6IFwiKFteXSspXCI7XG5cbiAgICAgICAgaGFzU2VnbWVudFdpbGRjYXJkID0gdHJ1ZTtcbiAgICAgICAgd2lsZGNhcmRCYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgfVxuXG4gICAgICB3aWxkY2FyZEJhY2t0cmFjayArPSBgKD86XFxcXCR7a2V5cy5sZW5ndGh9KWA7XG4gICAgICBwcmVmaXggPSBcIlwiO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5rbm93biB0b2tlbiB0eXBlOiAkeyh0b2tlbiBhcyBhbnkpLnR5cGV9YCk7XG4gIH1cblxuICBpZiAodHJhaWxpbmcgJiYgIXByZWZpeC5lbmRzV2l0aChkZWxpbWl0ZXIpKSB7XG4gICAgcmVzdWx0ICs9IFwiKD86XCIgKyBlc2NhcGUoZGVsaW1pdGVyKSArIFwiJCk/XCI7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEJsb2NrIGJhY2t0cmFja2luZyBvbiBwcmV2aW91cyB0ZXh0L2RlbGltaXRlci5cbiAqL1xuZnVuY3Rpb24gbmVnYXRlKGE6IHN0cmluZywgYjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGIubGVuZ3RoID4gYS5sZW5ndGgpIHJldHVybiBuZWdhdGUoYiwgYSk7IC8vIExvbmdlc3Qgc3RyaW5nIGZpcnN0LlxuXG4gIGlmIChhID09PSBiKSBiID0gXCJcIjsgLy8gQ2xlYW5lciByZWdleCBzdHJpbmdzLCBubyBkdXBsaWNhdGlvbi5cbiAgaWYgKGIubGVuZ3RoID4gMSkgcmV0dXJuIGAoPzooPyEke2VzY2FwZShhKX18JHtlc2NhcGUoYil9KVteXSlgO1xuICBpZiAoYS5sZW5ndGggPiAxKSByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGEpfSlbXiR7ZXNjYXBlKGIpfV0pYDtcbiAgcmV0dXJuIGBbXiR7ZXNjYXBlKGEgKyBiKX1dYDtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgdG9rZW4gZGF0YSBpbnRvIGEgcGF0aCBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkoZGF0YTogVG9rZW5EYXRhKTogc3RyaW5nIHtcbiAgY29uc3QgeyB0b2tlbnMgfSA9IGRhdGE7XG4gIGxldCBpbmRleCA9IDA7XG4gIGxldCB2YWx1ZSA9IFwiXCI7XG5cbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICB2YWx1ZSArPSBlc2NhcGVUZXh0KHRva2VuLnZhbHVlKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgIHZhbHVlICs9IFwie1wiICsgc3RyaW5naWZ5KHRva2VuKSArIFwifVwiO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikge1xuICAgICAgdmFsdWUgKz0gXCI6XCIgKyBzdHJpbmdpZnlOYW1lKHRva2VuLm5hbWUsIHRva2VucywgaW5kZXgpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwid2lsZGNhcmRcIikge1xuICAgICAgdmFsdWUgKz0gXCIqXCIgKyBzdHJpbmdpZnlOYW1lKHRva2VuLm5hbWUsIHRva2VucywgaW5kZXgpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5rbm93biB0b2tlbiB0eXBlOiAkeyh0b2tlbiBhcyBhbnkpLnR5cGV9YCk7XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogV3JhcCBhIHBhcmFtZXRlciBuYW1lIGluIHF1b3RlcywgZXNjYXBpbmcgb25seSB0aGUgY2hhcmFjdGVycyB0aGUgcGFyc2VyXG4gKiB0cmVhdHMgc3BlY2lhbGx5IGluc2lkZSBhIHF1b3RlZCBuYW1lIChgXCJgIGFuZCBgXFxgKS4gYEpTT04uc3RyaW5naWZ5YCBjYW4ndFxuICogYmUgdXNlZCBoZXJlIGJlY2F1c2UgaXQgZW1pdHMgZXNjYXBlcyBsaWtlIGBcXG5gIHRoYXQgdGhlIHBhcnNlciByZWFkcyBiYWNrIGFzXG4gKiB0aGUgbGl0ZXJhbCBjaGFyYWN0ZXIgYG5gLCBzbyBuYW1lcyB3aXRoIGNvbnRyb2wgY2hhcmFjdGVycyB3b3VsZG4ndCBzdXJ2aXZlXG4gKiBhIGBwYXJzZWAgLT4gYHN0cmluZ2lmeWAgLT4gYHBhcnNlYCByb3VuZCB0cmlwLlxuICovXG5mdW5jdGlvbiBxdW90ZU5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBcIiR7bmFtZS5yZXBsYWNlKC9bXCJcXFxcXS9nLCBcIlxcXFwkJlwiKX1cImA7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IGEgcGFyYW1ldGVyIG5hbWUsIGVzY2FwaW5nIHdoZW4gaXQgY2Fubm90IGJlIGVtaXR0ZWQgZGlyZWN0bHkuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeU5hbWUoXG4gIG5hbWU6IHN0cmluZyxcbiAgdG9rZW5zOiByZWFkb25seSBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuKTogc3RyaW5nIHtcbiAgaWYgKCFJRC50ZXN0KG5hbWUpKSByZXR1cm4gcXVvdGVOYW1lKG5hbWUpO1xuXG4gIHdoaWxlIChpbmRleCA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgIGlmICghdG9rZW4udmFsdWUpIGNvbnRpbnVlO1xuXG4gICAgICAvLyBEZXN0cnVjdHVyaW5nIHJlYWRzIHRoZSBmaXJzdCAqY29kZSBwb2ludCosIG1hdGNoaW5nIGBwYXJzZWAsIHdoaWNoXG4gICAgICAvLyBpdGVyYXRlcyB0aGUgcGF0aCB3aXRoIGBbLi4uc3RyXWAuIEluZGV4aW5nIHdpdGggYFswXWAgd291bGQgcmVhZCBvbmx5IHRoZVxuICAgICAgLy8gbGVhZGluZyBzdXJyb2dhdGUgb2YgYW4gYXN0cmFsIGNoYXJhY3RlciwgbWlzc2luZyB0aGF0IHRoZSBwYXJzZXIgdHJlYXRzXG4gICAgICAvLyB0aGUgd2hvbGUgY2hhcmFjdGVyIGFzIGBJRF9Db250aW51ZWAgYW5kIGFic29yYnMgaXQgaW50byB0aGUgbmFtZS5cbiAgICAgIGNvbnN0IFtmaXJzdF0gPSB0b2tlbi52YWx1ZTtcbiAgICAgIGlmIChJRF9DT05USU5VRS50ZXN0KGZpcnN0KSkgcmV0dXJuIHF1b3RlTmFtZShuYW1lKTtcbiAgICB9XG5cbiAgICBicmVhaztcbiAgfVxuXG4gIHJldHVybiBuYW1lO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBFbmNvZGUgYXMgcDJyRW5jb2RlLFxuICAgIHR5cGUgRGVjb2RlIGFzIHAyckRlY29kZSxcbiAgICB0eXBlIFBhcnNlT3B0aW9ucyBhcyBwMnJQYXJzZU9wdGlvbnMsXG4gICAgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zIGFzIHAyclBhdGhUb1JlZ2V4cE9wdGlvbnMsXG4gICAgdHlwZSBNYXRjaE9wdGlvbnMgYXMgcDJyTWF0Y2hPcHRpb25zLFxuICAgIHR5cGUgQ29tcGlsZU9wdGlvbnMgYXMgcDJyQ29tcGlsZU9wdGlvbnMsXG4gICAgdHlwZSBQYXJhbURhdGEgYXMgcDJyUGFyYW1EYXRhLFxuICAgIHR5cGUgUGF0aEZ1bmN0aW9uIGFzIHAyclBhdGhGdW5jdGlvbixcbiAgICB0eXBlIE1hdGNoUmVzdWx0IGFzIHAyck1hdGNoUmVzdWx0LFxuICAgIHR5cGUgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgdHlwZSBNYXRjaEZ1bmN0aW9uIGFzIHAyck1hdGNoRnVuY3Rpb24sXG4gICAgdHlwZSBLZXkgYXMgcDJyS2V5LFxuICAgIHR5cGUgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgdHlwZSBQYXRoIGFzIHAyclBhdGgsXG4gICAgdHlwZSBUb2tlbkRhdGEgYXMgcDJyVG9rZW5EYXRhLFxuICAgIFBhdGhFcnJvciBhcyBwMnJQYXRoRXJyb3IsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICBtYXRjaCxcbiAgICBzdHJpbmdpZnksXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBFbmNvZGUgPSBwMnJFbmNvZGU7XG4gICAgZXhwb3J0IHR5cGUgRGVjb2RlID0gcDJyRGVjb2RlO1xuICAgIGV4cG9ydCB0eXBlIFBhcnNlT3B0aW9ucyA9IHAyclBhcnNlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zID0gcDJyUGF0aFRvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaE9wdGlvbnMgPSBwMnJNYXRjaE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgQ29tcGlsZU9wdGlvbnMgPSBwMnJDb21waWxlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUb2tlbkRhdGEgPSBwMnJUb2tlbkRhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gcDJyUGFyYW1EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyclBhdGhGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoUmVzdWx0PFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2g8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgUGF0aCA9IHAyclBhdGg7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIFBhdGhFcnJvcjogcDJyUGF0aEVycm9yLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOlsicDJyUGF0aEVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBLE1BQU0saUJBQWlCLEdBQUcsR0FBRztJQUM3QixNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWEsS0FBSyxLQUFLO0lBQzNDLE1BQU0sUUFBUSxHQUFHLHFCQUFxQjtJQUN0QyxNQUFNLFdBQVcsR0FBRyxtQ0FBbUM7SUFDdkQsTUFBTSxFQUFFLEdBQUcsb0RBQW9EO0lBd0QvRDs7SUFFRztJQUNILFNBQVMsVUFBVSxDQUFDLEdBQVcsRUFBQTtRQUM3QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxDQUFDO0lBQ2xEO0lBRUE7O0lBRUc7SUFDSCxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUE7UUFDekIsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFF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QUssR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDN0IsUUFBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO2dCQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUs7b0JBQUU7Ozs7O0lBTWxCLFlBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLO0lBQzNCLFlBQUEsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztJQUFFLGdCQUFBLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQztZQUNyRDtZQUVBO1FBQ0Y7SUFFQSxJQUFBLE9BQU8sSUFBSTtJQUNiOztJQ3ZyQkE7O0lBRUc7QUE0Q0gsVUFBTSxXQUFXLEdBQUc7SUFDaEIsSUFBQSxTQUFTLEVBQUVBLFNBQVk7UUFDdkIsS0FBSztRQUNMLE9BQU87UUFDUCxLQUFLO1FBQ0wsU0FBUztRQUNULFlBQVk7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9