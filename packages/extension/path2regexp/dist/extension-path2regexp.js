/*!
 * @cdp/extension-path2regexp 0.9.18
 *   extension for conversion path to regexp library
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.CDP = global.CDP || {}, global.CDP.Exension = global.CDP.Exension || {})));
})(this, (function (exports) { 'use strict';

    var dist = {};

    Object.defineProperty(dist, "__esModule", { value: true });
    var pathToRegexp_1 = dist.pathToRegexp = match_1 = dist.match = compile_1 = dist.compile = parse_1 = dist.parse = dist.TokenData = void 0;
    const DEFAULT_DELIMITER = "/";
    const NOOP_VALUE = (value) => value;
    const ID_CHAR = /^\p{XID_Continue}$/u;
    const SIMPLE_TOKENS = {
        "!": "!",
        "@": "@",
        ";": ";",
        ",": ",",
        "*": "*",
        "+": "+",
        "?": "?",
        "{": "{",
        "}": "}",
    };
    /**
     * Tokenize input string.
     */
    function lexer(str) {
        const chars = [...str];
        const tokens = [];
        let i = 0;
        while (i < chars.length) {
            const value = chars[i];
            const type = SIMPLE_TOKENS[value];
            if (type) {
                tokens.push({ type, index: i++, value });
                continue;
            }
            if (value === "\\") {
                tokens.push({ type: "ESCAPED", index: i++, value: chars[i++] });
                continue;
            }
            if (value === ":") {
                let name = "";
                while (ID_CHAR.test(chars[++i])) {
                    name += chars[i];
                }
                if (!name) {
                    throw new TypeError(`Missing parameter name at ${i}`);
                }
                tokens.push({ type: "NAME", index: i, value: name });
                continue;
            }
            if (value === "(") {
                const pos = i++;
                let count = 1;
                let pattern = "";
                if (chars[i] === "?") {
                    throw new TypeError(`Pattern cannot start with "?" at ${i}`);
                }
                while (i < chars.length) {
                    if (chars[i] === "\\") {
                        pattern += chars[i++] + chars[i++];
                        continue;
                    }
                    if (chars[i] === ")") {
                        count--;
                        if (count === 0) {
                            i++;
                            break;
                        }
                    }
                    else if (chars[i] === "(") {
                        count++;
                        if (chars[i + 1] !== "?") {
                            throw new TypeError(`Capturing groups are not allowed at ${i}`);
                        }
                    }
                    pattern += chars[i++];
                }
                if (count)
                    throw new TypeError(`Unbalanced pattern at ${pos}`);
                if (!pattern)
                    throw new TypeError(`Missing pattern at ${pos}`);
                tokens.push({ type: "PATTERN", index: i, value: pattern });
                continue;
            }
            tokens.push({ type: "CHAR", index: i, value: chars[i++] });
        }
        tokens.push({ type: "END", index: i, value: "" });
        return new Iter(tokens);
    }
    class Iter {
        constructor(tokens) {
            this.tokens = tokens;
            this.index = 0;
        }
        peek() {
            return this.tokens[this.index];
        }
        tryConsume(type) {
            const token = this.peek();
            if (token.type !== type)
                return;
            this.index++;
            return token.value;
        }
        consume(type) {
            const value = this.tryConsume(type);
            if (value !== undefined)
                return value;
            const { type: nextType, index } = this.peek();
            throw new TypeError(`Unexpected ${nextType} at ${index}, expected ${type}: https://git.new/pathToRegexpError`);
        }
        text() {
            let result = "";
            let value;
            while ((value = this.tryConsume("CHAR") || this.tryConsume("ESCAPED"))) {
                result += value;
            }
            return result;
        }
        modifier() {
            return (this.tryConsume("?") || this.tryConsume("*") || this.tryConsume("+") || "");
        }
    }
    /**
     * Tokenized path instance. Can we passed around instead of string.
     */
    class TokenData {
        constructor(tokens, delimiter) {
            this.tokens = tokens;
            this.delimiter = delimiter;
        }
    }
    dist.TokenData = TokenData;
    /**
     * Parse a string for the raw tokens.
     */
    function parse(str, options = {}) {
        const { delimiter = DEFAULT_DELIMITER, encodePath = NOOP_VALUE } = options;
        const tokens = [];
        const it = lexer(str);
        let key = 0;
        do {
            const path = it.text();
            if (path)
                tokens.push(encodePath(path));
            const name = it.tryConsume("NAME");
            const pattern = it.tryConsume("PATTERN");
            if (name || pattern) {
                tokens.push({
                    name: name || String(key++),
                    pattern,
                });
                const next = it.peek();
                if (next.type === "*") {
                    throw new TypeError(`Unexpected * at ${next.index}, you probably want \`/*\` or \`{/:foo}*\`: https://git.new/pathToRegexpError`);
                }
                continue;
            }
            const asterisk = it.tryConsume("*");
            if (asterisk) {
                tokens.push({
                    name: String(key++),
                    pattern: `[^${escape(delimiter)}]*`,
                    modifier: "*",
                    separator: delimiter,
                });
                continue;
            }
            const open = it.tryConsume("{");
            if (open) {
                const prefix = it.text();
                const name = it.tryConsume("NAME");
                const pattern = it.tryConsume("PATTERN");
                const suffix = it.text();
                const separator = it.tryConsume(";") ? it.text() : prefix + suffix;
                it.consume("}");
                const modifier = it.modifier();
                tokens.push({
                    name: name || (pattern ? String(key++) : ""),
                    prefix: encodePath(prefix),
                    suffix: encodePath(suffix),
                    pattern,
                    modifier,
                    separator,
                });
                continue;
            }
            it.consume("END");
            break;
        } while (true);
        return new TokenData(tokens, delimiter);
    }
    var parse_1 = dist.parse = parse;
    /**
     * Compile a string to a template function for the path.
     */
    function compile(path, options = {}) {
        const data = path instanceof TokenData ? path : parse(path, options);
        return compileTokens(data, options);
    }
    var compile_1 = dist.compile = compile;
    /**
     * Convert a single token into a path building function.
     */
    function tokenToFunction(token, encode) {
        if (typeof token === "string") {
            return () => token;
        }
        const encodeValue = encode || NOOP_VALUE;
        const repeated = token.modifier === "+" || token.modifier === "*";
        const optional = token.modifier === "?" || token.modifier === "*";
        const { prefix = "", suffix = "", separator = "" } = token;
        if (encode && repeated) {
            const stringify = (value, index) => {
                if (typeof value !== "string") {
                    throw new TypeError(`Expected "${token.name}/${index}" to be a string`);
                }
                return encodeValue(value);
            };
            const compile = (value) => {
                if (!Array.isArray(value)) {
                    throw new TypeError(`Expected "${token.name}" to be an array`);
                }
                if (value.length === 0)
                    return "";
                return prefix + value.map(stringify).join(separator) + suffix;
            };
            if (optional) {
                return (data) => {
                    const value = data[token.name];
                    if (value == null)
                        return "";
                    return value.length ? compile(value) : "";
                };
            }
            return (data) => {
                const value = data[token.name];
                return compile(value);
            };
        }
        const stringify = (value) => {
            if (typeof value !== "string") {
                throw new TypeError(`Expected "${token.name}" to be a string`);
            }
            return prefix + encodeValue(value) + suffix;
        };
        if (optional) {
            return (data) => {
                const value = data[token.name];
                if (value == null)
                    return "";
                return stringify(value);
            };
        }
        return (data) => {
            const value = data[token.name];
            return stringify(value);
        };
    }
    /**
     * Transform tokens into a path building function.
     */
    function compileTokens(data, options) {
        const { encode = encodeURIComponent, loose = true, validate = true, } = options;
        const reFlags = flags(options);
        const stringify = toStringify(loose, data.delimiter);
        const keyToRegexp = toKeyRegexp(stringify, data.delimiter);
        // Compile all the tokens into regexps.
        const encoders = data.tokens.map((token) => {
            const fn = tokenToFunction(token, encode);
            if (!validate || typeof token === "string")
                return fn;
            const pattern = keyToRegexp(token);
            const validRe = new RegExp(`^${pattern}$`, reFlags);
            return (data) => {
                const value = fn(data);
                if (!validRe.test(value)) {
                    throw new TypeError(`Invalid value for "${token.name}": ${JSON.stringify(value)}`);
                }
                return value;
            };
        });
        return function path(data = {}) {
            let path = "";
            for (const encoder of encoders)
                path += encoder(data);
            return path;
        };
    }
    /**
     * Create path match function from `path-to-regexp` spec.
     */
    function match(path, options = {}) {
        const { decode = decodeURIComponent, loose = true } = options;
        const data = path instanceof TokenData ? path : parse(path, options);
        const stringify = toStringify(loose, data.delimiter);
        const keys = [];
        const re = tokensToRegexp(data, keys, options);
        const decoders = keys.map((key) => {
            if (decode && (key.modifier === "+" || key.modifier === "*")) {
                const re = new RegExp(stringify(key.separator || ""), "g");
                return (value) => value.split(re).map(decode);
            }
            return decode || NOOP_VALUE;
        });
        return function match(pathname) {
            const m = re.exec(pathname);
            if (!m)
                return false;
            const { 0: path, index } = m;
            const params = Object.create(null);
            for (let i = 1; i < m.length; i++) {
                if (m[i] === undefined)
                    continue;
                const key = keys[i - 1];
                const decoder = decoders[i - 1];
                params[key.name] = decoder(m[i]);
            }
            return { path, index, params };
        };
    }
    var match_1 = dist.match = match;
    /**
     * Escape a regular expression string.
     */
    function escape(str) {
        return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
    }
    /**
     * Escape and repeat loose characters for regular expressions.
     */
    function looseReplacer(value, loose) {
        return loose ? `${escape(value)}+` : escape(value);
    }
    /**
     * Encode all non-delimiter characters using the encode function.
     */
    function toStringify(loose, delimiter) {
        if (!loose)
            return escape;
        const re = new RegExp(`[^${escape(delimiter)}]+|(.)`, "g");
        return (value) => value.replace(re, looseReplacer);
    }
    /**
     * Get the flags for a regexp from the options.
     */
    function flags(options) {
        return options.sensitive ? "" : "i";
    }
    /**
     * Expose a function for taking tokens and returning a RegExp.
     */
    function tokensToRegexp(data, keys, options) {
        const { trailing = true, start = true, end = true, loose = true } = options;
        const stringify = toStringify(loose, data.delimiter);
        const keyToRegexp = toKeyRegexp(stringify, data.delimiter);
        let pattern = start ? "^" : "";
        for (const token of data.tokens) {
            if (typeof token === "string") {
                pattern += stringify(token);
            }
            else {
                if (token.name)
                    keys.push(token);
                pattern += keyToRegexp(token);
            }
        }
        if (trailing)
            pattern += `(?:${stringify(data.delimiter)})?`;
        pattern += end ? "$" : `(?=${escape(data.delimiter)}|$)`;
        return new RegExp(pattern, flags(options));
    }
    /**
     * Convert a token into a regexp string (re-used for path validation).
     */
    function toKeyRegexp(stringify, delimiter) {
        const segmentPattern = `[^${escape(delimiter)}]+?`;
        return (key) => {
            const prefix = key.prefix ? stringify(key.prefix) : "";
            const suffix = key.suffix ? stringify(key.suffix) : "";
            const modifier = key.modifier || "";
            if (key.name) {
                const pattern = key.pattern || segmentPattern;
                if (key.modifier === "+" || key.modifier === "*") {
                    const mod = key.modifier === "*" ? "?" : "";
                    const split = key.separator ? stringify(key.separator) : "";
                    return `(?:${prefix}((?:${pattern})(?:${split}(?:${pattern}))*)${suffix})${mod}`;
                }
                return `(?:${prefix}(${pattern})${suffix})${modifier}`;
            }
            return `(?:${prefix}${suffix})${modifier}`;
        };
    }
    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     */
    function pathToRegexp(path, options = {}) {
        const data = path instanceof TokenData ? path : parse(path, options);
        const keys = [];
        const regexp = tokensToRegexp(data, keys, options);
        return Object.assign(regexp, { keys });
    }
    pathToRegexp_1 = dist.pathToRegexp = pathToRegexp;

    /* eslint-disable
        @typescript-eslint/no-namespace,
     */
    const path2regexp = {
        parse: parse_1,
        compile: compile_1,
        match: match_1,
        pathToRegexp: pathToRegexp_1,
    };

    exports.path2regexp = path2regexp;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX0NIQVIgPSAvXlxccHtYSURfQ29udGludWV9JC91O1xuXG4vKipcbiAqIEVuY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBFbmNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG4vKipcbiAqIERlY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBEZWNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTZXQgdGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciByZXBlYXQgcGFyYW1ldGVycy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHBhdGguXG4gICAqL1xuICBlbmNvZGVQYXRoPzogRW5jb2RlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgZXh0ZW5kcyBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBBbGxvdyBkZWxpbWl0ZXIgdG8gYmUgYXJiaXRyYXJpbHkgcmVwZWF0ZWQuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBsb29zZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdpbGwgbWF0Y2ggdG8gdGhlIGVuZCBvZiB0aGUgc3RyaW5nLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5kPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBtYXRjaCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHN0YXJ0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgYWxsb3dzIGFuIG9wdGlvbmFsIHRyYWlsaW5nIGRlbGltaXRlciB0byBtYXRjaC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHRyYWlsaW5nPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaE9wdGlvbnMgZXh0ZW5kcyBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBkZWNvZGluZyBzdHJpbmdzIGZvciBwYXJhbXMsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBkZWNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZGVjb2RlPzogRGVjb2RlIHwgZmFsc2U7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZU9wdGlvbnMgZXh0ZW5kcyBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHZhbGlkYXRpb24gd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3cgZGVsaW1pdGVyIHRvIGJlIGFyYml0cmFyaWx5IHJlcGVhdGVkLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgbG9vc2U/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgZmFsc2VgIHRoZSBmdW5jdGlvbiBjYW4gcHJvZHVjZSBhbiBpbnZhbGlkICh1bm1hdGNoZWQpIHBhdGguIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB2YWxpZGF0ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncyBmb3Igb3V0cHV0IGludG8gdGhlIHBhdGgsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBlbmNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZW5jb2RlPzogRW5jb2RlIHwgZmFsc2U7XG59XG5cbnR5cGUgVG9rZW5UeXBlID1cbiAgfCBcIntcIlxuICB8IFwifVwiXG4gIHwgXCIqXCJcbiAgfCBcIitcIlxuICB8IFwiP1wiXG4gIHwgXCJOQU1FXCJcbiAgfCBcIlBBVFRFUk5cIlxuICB8IFwiQ0hBUlwiXG4gIHwgXCJFU0NBUEVEXCJcbiAgfCBcIkVORFwiXG4gIC8vIFJlc2VydmVkIGZvciB1c2UuXG4gIHwgXCIhXCJcbiAgfCBcIkBcIlxuICB8IFwiLFwiXG4gIHwgXCI7XCI7XG5cbi8qKlxuICogVG9rZW5pemVyIHJlc3VsdHMuXG4gKi9cbmludGVyZmFjZSBMZXhUb2tlbiB7XG4gIHR5cGU6IFRva2VuVHlwZTtcbiAgaW5kZXg6IG51bWJlcjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuY29uc3QgU0lNUExFX1RPS0VOUzogUmVjb3JkPHN0cmluZywgVG9rZW5UeXBlPiA9IHtcbiAgXCIhXCI6IFwiIVwiLFxuICBcIkBcIjogXCJAXCIsXG4gIFwiO1wiOiBcIjtcIixcbiAgXCIsXCI6IFwiLFwiLFxuICBcIipcIjogXCIqXCIsXG4gIFwiK1wiOiBcIitcIixcbiAgXCI/XCI6IFwiP1wiLFxuICBcIntcIjogXCJ7XCIsXG4gIFwifVwiOiBcIn1cIixcbn07XG5cbi8qKlxuICogVG9rZW5pemUgaW5wdXQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBsZXhlcihzdHI6IHN0cmluZykge1xuICBjb25zdCBjaGFycyA9IFsuLi5zdHJdO1xuICBjb25zdCB0b2tlbnM6IExleFRva2VuW10gPSBbXTtcbiAgbGV0IGkgPSAwO1xuXG4gIHdoaWxlIChpIDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjaGFyc1tpXTtcbiAgICBjb25zdCB0eXBlID0gU0lNUExFX1RPS0VOU1t2YWx1ZV07XG5cbiAgICBpZiAodHlwZSkge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlLCBpbmRleDogaSsrLCB2YWx1ZSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJFU0NBUEVEXCIsIGluZGV4OiBpKyssIHZhbHVlOiBjaGFyc1tpKytdIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSBcIjpcIikge1xuICAgICAgbGV0IG5hbWUgPSBcIlwiO1xuXG4gICAgICB3aGlsZSAoSURfQ0hBUi50ZXN0KGNoYXJzWysraV0pKSB7XG4gICAgICAgIG5hbWUgKz0gY2hhcnNbaV07XG4gICAgICB9XG5cbiAgICAgIGlmICghbmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0ICR7aX1gKTtcbiAgICAgIH1cblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIk5BTUVcIiwgaW5kZXg6IGksIHZhbHVlOiBuYW1lIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSBcIihcIikge1xuICAgICAgY29uc3QgcG9zID0gaSsrO1xuICAgICAgbGV0IGNvdW50ID0gMTtcbiAgICAgIGxldCBwYXR0ZXJuID0gXCJcIjtcblxuICAgICAgaWYgKGNoYXJzW2ldID09PSBcIj9cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBQYXR0ZXJuIGNhbm5vdCBzdGFydCB3aXRoIFwiP1wiIGF0ICR7aX1gKTtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGkgPCBjaGFycy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGNoYXJzW2ldID09PSBcIlxcXFxcIikge1xuICAgICAgICAgIHBhdHRlcm4gKz0gY2hhcnNbaSsrXSArIGNoYXJzW2krK107XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhcnNbaV0gPT09IFwiKVwiKSB7XG4gICAgICAgICAgY291bnQtLTtcbiAgICAgICAgICBpZiAoY291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjaGFyc1tpXSA9PT0gXCIoXCIpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgIGlmIChjaGFyc1tpICsgMV0gIT09IFwiP1wiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBDYXB0dXJpbmcgZ3JvdXBzIGFyZSBub3QgYWxsb3dlZCBhdCAke2l9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0dGVybiArPSBjaGFyc1tpKytdO1xuICAgICAgfVxuXG4gICAgICBpZiAoY291bnQpIHRocm93IG5ldyBUeXBlRXJyb3IoYFVuYmFsYW5jZWQgcGF0dGVybiBhdCAke3Bvc31gKTtcbiAgICAgIGlmICghcGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXR0ZXJuIGF0ICR7cG9zfWApO1xuXG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiUEFUVEVSTlwiLCBpbmRleDogaSwgdmFsdWU6IHBhdHRlcm4gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiQ0hBUlwiLCBpbmRleDogaSwgdmFsdWU6IGNoYXJzW2krK10gfSk7XG4gIH1cblxuICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiRU5EXCIsIGluZGV4OiBpLCB2YWx1ZTogXCJcIiB9KTtcblxuICByZXR1cm4gbmV3IEl0ZXIodG9rZW5zKTtcbn1cblxuY2xhc3MgSXRlciB7XG4gIGluZGV4ID0gMDtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHRva2VuczogTGV4VG9rZW5bXSkge31cblxuICBwZWVrKCk6IExleFRva2VuIHtcbiAgICByZXR1cm4gdGhpcy50b2tlbnNbdGhpcy5pbmRleF07XG4gIH1cblxuICB0cnlDb25zdW1lKHR5cGU6IExleFRva2VuW1widHlwZVwiXSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdG9rZW4gPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodG9rZW4udHlwZSAhPT0gdHlwZSkgcmV0dXJuO1xuICAgIHRoaXMuaW5kZXgrKztcbiAgICByZXR1cm4gdG9rZW4udmFsdWU7XG4gIH1cblxuICBjb25zdW1lKHR5cGU6IExleFRva2VuW1widHlwZVwiXSk6IHN0cmluZyB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLnRyeUNvbnN1bWUodHlwZSk7XG4gICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHJldHVybiB2YWx1ZTtcbiAgICBjb25zdCB7IHR5cGU6IG5leHRUeXBlLCBpbmRleCB9ID0gdGhpcy5wZWVrKCk7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgIGBVbmV4cGVjdGVkICR7bmV4dFR5cGV9IGF0ICR7aW5kZXh9LCBleHBlY3RlZCAke3R5cGV9OiBodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3JgLFxuICAgICk7XG4gIH1cblxuICB0ZXh0KCk6IHN0cmluZyB7XG4gICAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgd2hpbGUgKCh2YWx1ZSA9IHRoaXMudHJ5Q29uc3VtZShcIkNIQVJcIikgfHwgdGhpcy50cnlDb25zdW1lKFwiRVNDQVBFRFwiKSkpIHtcbiAgICAgIHJlc3VsdCArPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIG1vZGlmaWVyKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMudHJ5Q29uc3VtZShcIj9cIikgfHwgdGhpcy50cnlDb25zdW1lKFwiKlwiKSB8fCB0aGlzLnRyeUNvbnN1bWUoXCIrXCIpIHx8IFwiXCJcbiAgICApO1xuICB9XG59XG5cbi8qKlxuICogVG9rZW5pemVkIHBhdGggaW5zdGFuY2UuIENhbiB3ZSBwYXNzZWQgYXJvdW5kIGluc3RlYWQgb2Ygc3RyaW5nLlxuICovXG5leHBvcnQgY2xhc3MgVG9rZW5EYXRhIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHRva2VuczogVG9rZW5bXSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgZGVsaW1pdGVyOiBzdHJpbmcsXG4gICkge31cbn1cblxuLyoqXG4gKiBQYXJzZSBhIHN0cmluZyBmb3IgdGhlIHJhdyB0b2tlbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShzdHI6IHN0cmluZywgb3B0aW9uczogUGFyc2VPcHRpb25zID0ge30pOiBUb2tlbkRhdGEge1xuICBjb25zdCB7IGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSLCBlbmNvZGVQYXRoID0gTk9PUF9WQUxVRSB9ID0gb3B0aW9ucztcbiAgY29uc3QgdG9rZW5zOiBUb2tlbltdID0gW107XG4gIGNvbnN0IGl0ID0gbGV4ZXIoc3RyKTtcbiAgbGV0IGtleSA9IDA7XG5cbiAgZG8ge1xuICAgIGNvbnN0IHBhdGggPSBpdC50ZXh0KCk7XG4gICAgaWYgKHBhdGgpIHRva2Vucy5wdXNoKGVuY29kZVBhdGgocGF0aCkpO1xuXG4gICAgY29uc3QgbmFtZSA9IGl0LnRyeUNvbnN1bWUoXCJOQU1FXCIpO1xuICAgIGNvbnN0IHBhdHRlcm4gPSBpdC50cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcblxuICAgIGlmIChuYW1lIHx8IHBhdHRlcm4pIHtcbiAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCBTdHJpbmcoa2V5KyspLFxuICAgICAgICBwYXR0ZXJuLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IG5leHQgPSBpdC5wZWVrKCk7XG4gICAgICBpZiAobmV4dC50eXBlID09PSBcIipcIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGBVbmV4cGVjdGVkICogYXQgJHtuZXh0LmluZGV4fSwgeW91IHByb2JhYmx5IHdhbnQgXFxgLypcXGAgb3IgXFxgey86Zm9vfSpcXGA6IGh0dHBzOi8vZ2l0Lm5ldy9wYXRoVG9SZWdleHBFcnJvcmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGFzdGVyaXNrID0gaXQudHJ5Q29uc3VtZShcIipcIik7XG4gICAgaWYgKGFzdGVyaXNrKSB7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIG5hbWU6IFN0cmluZyhrZXkrKyksXG4gICAgICAgIHBhdHRlcm46IGBbXiR7ZXNjYXBlKGRlbGltaXRlcil9XSpgLFxuICAgICAgICBtb2RpZmllcjogXCIqXCIsXG4gICAgICAgIHNlcGFyYXRvcjogZGVsaW1pdGVyLFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBvcGVuID0gaXQudHJ5Q29uc3VtZShcIntcIik7XG4gICAgaWYgKG9wZW4pIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGl0LnRleHQoKTtcbiAgICAgIGNvbnN0IG5hbWUgPSBpdC50cnlDb25zdW1lKFwiTkFNRVwiKTtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBpdC50cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IGl0LnRleHQoKTtcbiAgICAgIGNvbnN0IHNlcGFyYXRvciA9IGl0LnRyeUNvbnN1bWUoXCI7XCIpID8gaXQudGV4dCgpIDogcHJlZml4ICsgc3VmZml4O1xuXG4gICAgICBpdC5jb25zdW1lKFwifVwiKTtcblxuICAgICAgY29uc3QgbW9kaWZpZXIgPSBpdC5tb2RpZmllcigpO1xuXG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIG5hbWU6IG5hbWUgfHwgKHBhdHRlcm4gPyBTdHJpbmcoa2V5KyspIDogXCJcIiksXG4gICAgICAgIHByZWZpeDogZW5jb2RlUGF0aChwcmVmaXgpLFxuICAgICAgICBzdWZmaXg6IGVuY29kZVBhdGgoc3VmZml4KSxcbiAgICAgICAgcGF0dGVybixcbiAgICAgICAgbW9kaWZpZXIsXG4gICAgICAgIHNlcGFyYXRvcixcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaXQuY29uc3VtZShcIkVORFwiKTtcbiAgICBicmVhaztcbiAgfSB3aGlsZSAodHJ1ZSk7XG5cbiAgcmV0dXJuIG5ldyBUb2tlbkRhdGEodG9rZW5zLCBkZWxpbWl0ZXIpO1xufVxuXG4vKipcbiAqIENvbXBpbGUgYSBzdHJpbmcgdG8gYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmb3IgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KFxuICBwYXRoOiBQYXRoLFxuICBvcHRpb25zOiBDb21waWxlT3B0aW9ucyA9IHt9LFxuKSB7XG4gIGNvbnN0IGRhdGEgPSBwYXRoIGluc3RhbmNlb2YgVG9rZW5EYXRhID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICByZXR1cm4gY29tcGlsZVRva2VuczxQPihkYXRhLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXT4+O1xuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogQ29udmVydCBhIHNpbmdsZSB0b2tlbiBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gdG9rZW5Ub0Z1bmN0aW9uKFxuICB0b2tlbjogVG9rZW4sXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pOiAoZGF0YTogUGFyYW1EYXRhKSA9PiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuICgpID0+IHRva2VuO1xuICB9XG5cbiAgY29uc3QgZW5jb2RlVmFsdWUgPSBlbmNvZGUgfHwgTk9PUF9WQUxVRTtcbiAgY29uc3QgcmVwZWF0ZWQgPSB0b2tlbi5tb2RpZmllciA9PT0gXCIrXCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiO1xuICBjb25zdCBvcHRpb25hbCA9IHRva2VuLm1vZGlmaWVyID09PSBcIj9cIiB8fCB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCI7XG4gIGNvbnN0IHsgcHJlZml4ID0gXCJcIiwgc3VmZml4ID0gXCJcIiwgc2VwYXJhdG9yID0gXCJcIiB9ID0gdG9rZW47XG5cbiAgaWYgKGVuY29kZSAmJiByZXBlYXRlZCkge1xuICAgIGNvbnN0IHN0cmluZ2lmeSA9ICh2YWx1ZTogc3RyaW5nLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2luZGV4fVwiIHRvIGJlIGEgc3RyaW5nYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW5jb2RlVmFsdWUodmFsdWUpO1xuICAgIH07XG5cbiAgICBjb25zdCBjb21waWxlID0gKHZhbHVlOiB1bmtub3duKSA9PiB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGFuIGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHJldHVybiBcIlwiO1xuXG4gICAgICByZXR1cm4gcHJlZml4ICsgdmFsdWUubWFwKHN0cmluZ2lmeSkuam9pbihzZXBhcmF0b3IpICsgc3VmZml4O1xuICAgIH07XG5cbiAgICBpZiAob3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgICAgICByZXR1cm4gdmFsdWUubGVuZ3RoID8gY29tcGlsZSh2YWx1ZSkgOiBcIlwiO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gKGRhdGEpOiBzdHJpbmcgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgcmV0dXJuIGNvbXBpbGUodmFsdWUpO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBzdHJpbmdpZnkgPSAodmFsdWU6IHVua25vd24pID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICByZXR1cm4gcHJlZml4ICsgZW5jb2RlVmFsdWUodmFsdWUpICsgc3VmZml4O1xuICB9O1xuXG4gIGlmIChvcHRpb25hbCkge1xuICAgIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgICByZXR1cm4gc3RyaW5naWZ5KHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgcmV0dXJuIHN0cmluZ2lmeSh2YWx1ZSk7XG4gIH07XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIHRva2VucyBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY29tcGlsZVRva2VuczxQIGV4dGVuZHMgUGFyYW1EYXRhPihcbiAgZGF0YTogVG9rZW5EYXRhLFxuICBvcHRpb25zOiBDb21waWxlT3B0aW9ucyxcbik6IFBhdGhGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHtcbiAgICBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsXG4gICAgbG9vc2UgPSB0cnVlLFxuICAgIHZhbGlkYXRlID0gdHJ1ZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHJlRmxhZ3MgPSBmbGFncyhvcHRpb25zKTtcbiAgY29uc3Qgc3RyaW5naWZ5ID0gdG9TdHJpbmdpZnkobG9vc2UsIGRhdGEuZGVsaW1pdGVyKTtcbiAgY29uc3Qga2V5VG9SZWdleHAgPSB0b0tleVJlZ2V4cChzdHJpbmdpZnksIGRhdGEuZGVsaW1pdGVyKTtcblxuICAvLyBDb21waWxlIGFsbCB0aGUgdG9rZW5zIGludG8gcmVnZXhwcy5cbiAgY29uc3QgZW5jb2RlcnM6IEFycmF5PChkYXRhOiBQYXJhbURhdGEpID0+IHN0cmluZz4gPSBkYXRhLnRva2Vucy5tYXAoXG4gICAgKHRva2VuKSA9PiB7XG4gICAgICBjb25zdCBmbiA9IHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZW5jb2RlKTtcbiAgICAgIGlmICghdmFsaWRhdGUgfHwgdHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSByZXR1cm4gZm47XG5cbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBrZXlUb1JlZ2V4cCh0b2tlbik7XG4gICAgICBjb25zdCB2YWxpZFJlID0gbmV3IFJlZ0V4cChgXiR7cGF0dGVybn0kYCwgcmVGbGFncyk7XG5cbiAgICAgIHJldHVybiAoZGF0YSkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGZuKGRhdGEpO1xuICAgICAgICBpZiAoIXZhbGlkUmUudGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYEludmFsaWQgdmFsdWUgZm9yIFwiJHt0b2tlbi5uYW1lfVwiOiAke0pTT04uc3RyaW5naWZ5KHZhbHVlKX1gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfTtcbiAgICB9LFxuICApO1xuXG4gIHJldHVybiBmdW5jdGlvbiBwYXRoKGRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fSkge1xuICAgIGxldCBwYXRoID0gXCJcIjtcbiAgICBmb3IgKGNvbnN0IGVuY29kZXIgb2YgZW5jb2RlcnMpIHBhdGggKz0gZW5jb2RlcihkYXRhKTtcbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIHJlc3VsdCBjb250YWlucyBkYXRhIGFib3V0IHRoZSBwYXRoIG1hdGNoLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+IHtcbiAgcGF0aDogc3RyaW5nO1xuICBpbmRleDogbnVtYmVyO1xuICBwYXJhbXM6IFA7XG59XG5cbi8qKlxuICogQSBtYXRjaCBpcyBlaXRoZXIgYGZhbHNlYCAobm8gbWF0Y2gpIG9yIGEgbWF0Y2ggcmVzdWx0LlxuICovXG5leHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IGZhbHNlIHwgTWF0Y2hSZXN1bHQ8UD47XG5cbi8qKlxuICogVGhlIG1hdGNoIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgbWF0Y2hlZCB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChwYXRoOiBzdHJpbmcpID0+IE1hdGNoPFA+O1xuXG4vKipcbiAqIENyZWF0ZSBwYXRoIG1hdGNoIGZ1bmN0aW9uIGZyb20gYHBhdGgtdG8tcmVnZXhwYCBzcGVjLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IE1hdGNoT3B0aW9ucyA9IHt9LFxuKTogTWF0Y2hGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHsgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50LCBsb29zZSA9IHRydWUgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGRhdGEgPSBwYXRoIGluc3RhbmNlb2YgVG9rZW5EYXRhID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICBjb25zdCBzdHJpbmdpZnkgPSB0b1N0cmluZ2lmeShsb29zZSwgZGF0YS5kZWxpbWl0ZXIpO1xuICBjb25zdCBrZXlzOiBLZXlbXSA9IFtdO1xuICBjb25zdCByZSA9IHRva2Vuc1RvUmVnZXhwKGRhdGEsIGtleXMsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGRlY29kZXJzID0ga2V5cy5tYXAoKGtleSkgPT4ge1xuICAgIGlmIChkZWNvZGUgJiYgKGtleS5tb2RpZmllciA9PT0gXCIrXCIgfHwga2V5Lm1vZGlmaWVyID09PSBcIipcIikpIHtcbiAgICAgIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChzdHJpbmdpZnkoa2V5LnNlcGFyYXRvciB8fCBcIlwiKSwgXCJnXCIpO1xuICAgICAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5zcGxpdChyZSkubWFwKGRlY29kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY29kZSB8fCBOT09QX1ZBTFVFO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2gocGF0aG5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZS5leGVjKHBhdGhuYW1lKTtcbiAgICBpZiAoIW0pIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHsgMDogcGF0aCwgaW5kZXggfSA9IG07XG4gICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG1baV0gPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGtleSA9IGtleXNbaSAtIDFdO1xuICAgICAgY29uc3QgZGVjb2RlciA9IGRlY29kZXJzW2kgLSAxXTtcbiAgICAgIHBhcmFtc1trZXkubmFtZV0gPSBkZWNvZGVyKG1baV0pO1xuICAgIH1cblxuICAgIHJldHVybiB7IHBhdGgsIGluZGV4LCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGUoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oWy4rKj89XiE6JHt9KClbXFxdfC9cXFxcXSkvZywgXCJcXFxcJDFcIik7XG59XG5cbi8qKlxuICogRXNjYXBlIGFuZCByZXBlYXQgbG9vc2UgY2hhcmFjdGVycyBmb3IgcmVndWxhciBleHByZXNzaW9ucy5cbiAqL1xuZnVuY3Rpb24gbG9vc2VSZXBsYWNlcih2YWx1ZTogc3RyaW5nLCBsb29zZTogc3RyaW5nKSB7XG4gIHJldHVybiBsb29zZSA/IGAke2VzY2FwZSh2YWx1ZSl9K2AgOiBlc2NhcGUodmFsdWUpO1xufVxuXG4vKipcbiAqIEVuY29kZSBhbGwgbm9uLWRlbGltaXRlciBjaGFyYWN0ZXJzIHVzaW5nIHRoZSBlbmNvZGUgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5naWZ5KGxvb3NlOiBib29sZWFuLCBkZWxpbWl0ZXI6IHN0cmluZykge1xuICBpZiAoIWxvb3NlKSByZXR1cm4gZXNjYXBlO1xuXG4gIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgW14ke2VzY2FwZShkZWxpbWl0ZXIpfV0rfCguKWAsIFwiZ1wiKTtcbiAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5yZXBsYWNlKHJlLCBsb29zZVJlcGxhY2VyKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZsYWdzIGZvciBhIHJlZ2V4cCBmcm9tIHRoZSBvcHRpb25zLlxuICovXG5mdW5jdGlvbiBmbGFncyhvcHRpb25zOiB7IHNlbnNpdGl2ZT86IGJvb2xlYW4gfSkge1xuICByZXR1cm4gb3B0aW9ucy5zZW5zaXRpdmUgPyBcIlwiIDogXCJpXCI7XG59XG5cbi8qKlxuICogQSBrZXkgaXMgYSBjYXB0dXJlIGdyb3VwIGluIHRoZSByZWdleC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBLZXkge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByZWZpeD86IHN0cmluZztcbiAgc3VmZml4Pzogc3RyaW5nO1xuICBwYXR0ZXJuPzogc3RyaW5nO1xuICBtb2RpZmllcj86IHN0cmluZztcbiAgc2VwYXJhdG9yPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgdG9rZW4gaXMgYSBzdHJpbmcgKG5vdGhpbmcgc3BlY2lhbCkgb3Iga2V5IG1ldGFkYXRhIChjYXB0dXJlIGdyb3VwKS5cbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBzdHJpbmcgfCBLZXk7XG5cbi8qKlxuICogRXhwb3NlIGEgZnVuY3Rpb24gZm9yIHRha2luZyB0b2tlbnMgYW5kIHJldHVybmluZyBhIFJlZ0V4cC5cbiAqL1xuZnVuY3Rpb24gdG9rZW5zVG9SZWdleHAoXG4gIGRhdGE6IFRva2VuRGF0YSxcbiAga2V5czogS2V5W10sXG4gIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMsXG4pOiBSZWdFeHAge1xuICBjb25zdCB7IHRyYWlsaW5nID0gdHJ1ZSwgc3RhcnQgPSB0cnVlLCBlbmQgPSB0cnVlLCBsb29zZSA9IHRydWUgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHN0cmluZ2lmeSA9IHRvU3RyaW5naWZ5KGxvb3NlLCBkYXRhLmRlbGltaXRlcik7XG4gIGNvbnN0IGtleVRvUmVnZXhwID0gdG9LZXlSZWdleHAoc3RyaW5naWZ5LCBkYXRhLmRlbGltaXRlcik7XG4gIGxldCBwYXR0ZXJuID0gc3RhcnQgPyBcIl5cIiA6IFwiXCI7XG5cbiAgZm9yIChjb25zdCB0b2tlbiBvZiBkYXRhLnRva2Vucykge1xuICAgIGlmICh0eXBlb2YgdG9rZW4gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHBhdHRlcm4gKz0gc3RyaW5naWZ5KHRva2VuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRva2VuLm5hbWUpIGtleXMucHVzaCh0b2tlbik7XG4gICAgICBwYXR0ZXJuICs9IGtleVRvUmVnZXhwKHRva2VuKTtcbiAgICB9XG4gIH1cblxuICBpZiAodHJhaWxpbmcpIHBhdHRlcm4gKz0gYCg/OiR7c3RyaW5naWZ5KGRhdGEuZGVsaW1pdGVyKX0pP2A7XG4gIHBhdHRlcm4gKz0gZW5kID8gXCIkXCIgOiBgKD89JHtlc2NhcGUoZGF0YS5kZWxpbWl0ZXIpfXwkKWA7XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3Mob3B0aW9ucykpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSB0b2tlbiBpbnRvIGEgcmVnZXhwIHN0cmluZyAocmUtdXNlZCBmb3IgcGF0aCB2YWxpZGF0aW9uKS5cbiAqL1xuZnVuY3Rpb24gdG9LZXlSZWdleHAoc3RyaW5naWZ5OiBFbmNvZGUsIGRlbGltaXRlcjogc3RyaW5nKSB7XG4gIGNvbnN0IHNlZ21lbnRQYXR0ZXJuID0gYFteJHtlc2NhcGUoZGVsaW1pdGVyKX1dKz9gO1xuXG4gIHJldHVybiAoa2V5OiBLZXkpID0+IHtcbiAgICBjb25zdCBwcmVmaXggPSBrZXkucHJlZml4ID8gc3RyaW5naWZ5KGtleS5wcmVmaXgpIDogXCJcIjtcbiAgICBjb25zdCBzdWZmaXggPSBrZXkuc3VmZml4ID8gc3RyaW5naWZ5KGtleS5zdWZmaXgpIDogXCJcIjtcbiAgICBjb25zdCBtb2RpZmllciA9IGtleS5tb2RpZmllciB8fCBcIlwiO1xuXG4gICAgaWYgKGtleS5uYW1lKSB7XG4gICAgICBjb25zdCBwYXR0ZXJuID0ga2V5LnBhdHRlcm4gfHwgc2VnbWVudFBhdHRlcm47XG4gICAgICBpZiAoa2V5Lm1vZGlmaWVyID09PSBcIitcIiB8fCBrZXkubW9kaWZpZXIgPT09IFwiKlwiKSB7XG4gICAgICAgIGNvbnN0IG1vZCA9IGtleS5tb2RpZmllciA9PT0gXCIqXCIgPyBcIj9cIiA6IFwiXCI7XG4gICAgICAgIGNvbnN0IHNwbGl0ID0ga2V5LnNlcGFyYXRvciA/IHN0cmluZ2lmeShrZXkuc2VwYXJhdG9yKSA6IFwiXCI7XG4gICAgICAgIHJldHVybiBgKD86JHtwcmVmaXh9KCg/OiR7cGF0dGVybn0pKD86JHtzcGxpdH0oPzoke3BhdHRlcm59KSkqKSR7c3VmZml4fSkke21vZH1gO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGAoPzoke3ByZWZpeH0oJHtwYXR0ZXJufSkke3N1ZmZpeH0pJHttb2RpZmllcn1gO1xuICAgIH1cblxuICAgIHJldHVybiBgKD86JHtwcmVmaXh9JHtzdWZmaXh9KSR7bW9kaWZpZXJ9YDtcbiAgfTtcbn1cblxuLyoqXG4gKiBSZXBlYXRlZCBhbmQgc2ltcGxlIGlucHV0IHR5cGVzLlxuICovXG5leHBvcnQgdHlwZSBQYXRoID0gc3RyaW5nIHwgVG9rZW5EYXRhO1xuXG5leHBvcnQgdHlwZSBQYXRoUmVnRXhwID0gUmVnRXhwICYgeyBrZXlzOiBLZXlbXSB9O1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsIHJldHVybmluZyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBBbiBlbXB0eSBhcnJheSBjYW4gYmUgcGFzc2VkIGluIGZvciB0aGUga2V5cywgd2hpY2ggd2lsbCBob2xkIHRoZVxuICogcGxhY2Vob2xkZXIga2V5IGRlc2NyaXB0aW9ucy4gRm9yIGV4YW1wbGUsIHVzaW5nIGAvdXNlci86aWRgLCBga2V5c2Agd2lsbFxuICogY29udGFpbiBgW3sgbmFtZTogJ2lkJywgZGVsaW1pdGVyOiAnLycsIG9wdGlvbmFsOiBmYWxzZSwgcmVwZWF0OiBmYWxzZSB9XWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9SZWdleHAocGF0aDogUGF0aCwgb3B0aW9uczogUGF0aFRvUmVnZXhwT3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IGRhdGEgPSBwYXRoIGluc3RhbmNlb2YgVG9rZW5EYXRhID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICBjb25zdCBrZXlzOiBLZXlbXSA9IFtdO1xuICBjb25zdCByZWdleHAgPSB0b2tlbnNUb1JlZ2V4cChkYXRhLCBrZXlzLCBvcHRpb25zKTtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVnZXhwLCB7IGtleXMgfSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBFbmNvZGUgYXMgcDJyRW5jb2RlLFxuICAgIERlY29kZSBhcyBwMnJEZWNvZGUsXG4gICAgUGFyc2VPcHRpb25zIGFzIHAyclBhcnNlT3B0aW9ucyxcbiAgICBQYXRoVG9SZWdleHBPcHRpb25zIGFzIHAyclBhdGhUb1JlZ2V4cE9wdGlvbnMsXG4gICAgTWF0Y2hPcHRpb25zIGFzIHAyck1hdGNoT3B0aW9ucyxcbiAgICBDb21waWxlT3B0aW9ucyBhcyBwMnJDb21waWxlT3B0aW9ucyxcbiAgICBUb2tlbkRhdGEgYXMgcDJyVG9rZW5EYXRhLFxuICAgIFBhcmFtRGF0YSBhcyBwMnJQYXJhbURhdGEsXG4gICAgUGF0aEZ1bmN0aW9uIGFzIHAyclBhdGhGdW5jdGlvbixcbiAgICBNYXRjaFJlc3VsdCBhcyBwMnJNYXRjaFJlc3VsdCxcbiAgICBNYXRjaCBhcyBwMnJNYXRjaCxcbiAgICBNYXRjaEZ1bmN0aW9uIGFzIHAyck1hdGNoRnVuY3Rpb24sXG4gICAgS2V5IGFzIHAycktleSxcbiAgICBUb2tlbiBhcyBwMnJUb2tlbixcbiAgICBQYXRoIGFzIHAyclBhdGgsXG4gICAgUGF0aFJlZ0V4cCBhcyBwMnJQYXRoUmVnRXhwLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBFbmNvZGUgPSBwMnJFbmNvZGU7XG4gICAgZXhwb3J0IHR5cGUgRGVjb2RlID0gcDJyRGVjb2RlO1xuICAgIGV4cG9ydCB0eXBlIFBhcnNlT3B0aW9ucyA9IHAyclBhcnNlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zID0gcDJyUGF0aFRvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaE9wdGlvbnMgPSBwMnJNYXRjaE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgQ29tcGlsZU9wdGlvbnMgPSBwMnJDb21waWxlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUb2tlbkRhdGEgPSBwMnJUb2tlbkRhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gcDJyUGFyYW1EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyclBhdGhGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoUmVzdWx0PFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2g8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgUGF0aCA9IHAyclBhdGg7XG4gICAgZXhwb3J0IHR5cGUgUGF0aFJlZ0V4cCA9IHAyclBhdGhSZWdFeHA7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgcGF0aFRvUmVnZXhwLFxufTtcblxuZXhwb3J0IHsgcGF0aDJyZWdleHAgfTtcbiJdLCJuYW1lcyI6WyJwYXJzZSIsImNvbXBpbGUiLCJtYXRjaCIsInBhdGhUb1JlZ2V4cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0lBQUEsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUM7SUFDOUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEtBQUssS0FBSyxDQUFDO0lBQzVDLE1BQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDO0lBa0d0QyxNQUFNLGFBQWEsR0FBOEI7SUFDL0MsSUFBQSxHQUFHLEVBQUUsR0FBRztJQUNSLElBQUEsR0FBRyxFQUFFLEdBQUc7SUFDUixJQUFBLEdBQUcsRUFBRSxHQUFHO0lBQ1IsSUFBQSxHQUFHLEVBQUUsR0FBRztJQUNSLElBQUEsR0FBRyxFQUFFLEdBQUc7SUFDUixJQUFBLEdBQUcsRUFBRSxHQUFHO0lBQ1IsSUFBQSxHQUFHLEVBQUUsR0FBRztJQUNSLElBQUEsR0FBRyxFQUFFLEdBQUc7SUFDUixJQUFBLEdBQUcsRUFBRSxHQUFHO0tBQ1QsQ0FBQztJQUVGOztJQUVHO0lBQ0gsU0FBUyxLQUFLLENBQUMsR0FBVyxFQUFBO0lBQ3hCLElBQUEsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFVixJQUFBLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7SUFDdkIsUUFBQSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkIsUUFBQSxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFbEMsUUFBQSxJQUFJLElBQUksRUFBRTtJQUNSLFlBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDekMsU0FBUztJQUNWLFNBQUE7WUFFRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRSxTQUFTO0lBQ1YsU0FBQTtZQUVELElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRTtnQkFDakIsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUVkLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQy9CLGdCQUFBLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsYUFBQTtnQkFFRCxJQUFJLENBQUMsSUFBSSxFQUFFO0lBQ1QsZ0JBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDO0lBQ3ZELGFBQUE7SUFFRCxZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ3JELFNBQVM7SUFDVixTQUFBO1lBRUQsSUFBSSxLQUFLLEtBQUssR0FBRyxFQUFFO0lBQ2pCLFlBQUEsTUFBTSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztnQkFDZCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFFakIsWUFBQSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7SUFDcEIsZ0JBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDO0lBQzlELGFBQUE7SUFFRCxZQUFBLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7SUFDdkIsZ0JBQUEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFO0lBQ3JCLG9CQUFBLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDbkMsU0FBUztJQUNWLGlCQUFBO0lBRUQsZ0JBQUEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0lBQ3BCLG9CQUFBLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtJQUNmLHdCQUFBLENBQUMsRUFBRSxDQUFDOzRCQUNKLE1BQU07SUFDUCxxQkFBQTtJQUNGLGlCQUFBO0lBQU0scUJBQUEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO0lBQzNCLG9CQUFBLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7SUFDeEIsd0JBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDO0lBQ2pFLHFCQUFBO0lBQ0YsaUJBQUE7SUFFRCxnQkFBQSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdkIsYUFBQTtJQUVELFlBQUEsSUFBSSxLQUFLO0lBQUUsZ0JBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsR0FBRyxDQUFBLENBQUUsQ0FBQyxDQUFDO0lBQy9ELFlBQUEsSUFBSSxDQUFDLE9BQU87SUFBRSxnQkFBQSxNQUFNLElBQUksU0FBUyxDQUFDLHNCQUFzQixHQUFHLENBQUEsQ0FBRSxDQUFDLENBQUM7SUFFL0QsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRCxTQUFTO0lBQ1YsU0FBQTtZQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RCxLQUFBO0lBRUQsSUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRWxELElBQUEsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQsTUFBTSxJQUFJLENBQUE7SUFHUixJQUFBLFdBQUEsQ0FBb0IsTUFBa0IsRUFBQTtZQUFsQixJQUFNLENBQUEsTUFBQSxHQUFOLE1BQU0sQ0FBWTtZQUZ0QyxJQUFLLENBQUEsS0FBQSxHQUFHLENBQUMsQ0FBQztTQUVnQztRQUUxQyxJQUFJLEdBQUE7WUFDRixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2hDO0lBRUQsSUFBQSxVQUFVLENBQUMsSUFBc0IsRUFBQTtJQUMvQixRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixRQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJO2dCQUFFLE9BQU87WUFDaEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDO1NBQ3BCO0lBRUQsSUFBQSxPQUFPLENBQUMsSUFBc0IsRUFBQTtZQUM1QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLElBQUksS0FBSyxLQUFLLFNBQVM7SUFBRSxZQUFBLE9BQU8sS0FBSyxDQUFDO0lBQ3RDLFFBQUEsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlDLE1BQU0sSUFBSSxTQUFTLENBQ2pCLENBQWMsV0FBQSxFQUFBLFFBQVEsQ0FBTyxJQUFBLEVBQUEsS0FBSyxDQUFjLFdBQUEsRUFBQSxJQUFJLENBQXFDLG1DQUFBLENBQUEsQ0FDMUYsQ0FBQztTQUNIO1FBRUQsSUFBSSxHQUFBO1lBQ0YsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLFFBQUEsSUFBSSxLQUF5QixDQUFDO0lBQzlCLFFBQUEsUUFBUSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHO2dCQUN0RSxNQUFNLElBQUksS0FBSyxDQUFDO0lBQ2pCLFNBQUE7SUFDRCxRQUFBLE9BQU8sTUFBTSxDQUFDO1NBQ2Y7UUFFRCxRQUFRLEdBQUE7WUFDTixRQUNFLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFDMUU7U0FDSDtJQUNGLENBQUE7SUFFRDs7SUFFRztJQUNILE1BQWEsU0FBUyxDQUFBO1FBQ3BCLFdBQ2tCLENBQUEsTUFBZSxFQUNmLFNBQWlCLEVBQUE7WUFEakIsSUFBTSxDQUFBLE1BQUEsR0FBTixNQUFNLENBQVM7WUFDZixJQUFTLENBQUEsU0FBQSxHQUFULFNBQVMsQ0FBUTtTQUMvQjtJQUNMLENBQUE7SUFBQSxJQUFBLENBQUEsU0FBQSxHQUFBLFVBQUE7SUFFRDs7SUFFRztJQUNILFNBQWdCLEtBQUssQ0FBQyxHQUFXLEVBQUUsVUFBd0IsRUFBRSxFQUFBO1FBQzNELE1BQU0sRUFBRSxTQUFTLEdBQUcsaUJBQWlCLEVBQUUsVUFBVSxHQUFHLFVBQVUsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUMzRSxNQUFNLE1BQU0sR0FBWSxFQUFFLENBQUM7SUFDM0IsSUFBQSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBRVosR0FBRztJQUNELFFBQUEsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZCLFFBQUEsSUFBSSxJQUFJO2dCQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFeEMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXpDLElBQUksSUFBSSxJQUFJLE9BQU8sRUFBRTtnQkFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNWLGdCQUFBLElBQUksRUFBRSxJQUFJLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUMzQixPQUFPO0lBQ1IsYUFBQSxDQUFDLENBQUM7SUFFSCxZQUFBLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixZQUFBLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7b0JBQ3JCLE1BQU0sSUFBSSxTQUFTLENBQ2pCLENBQUEsZ0JBQUEsRUFBbUIsSUFBSSxDQUFDLEtBQUssQ0FBK0UsNkVBQUEsQ0FBQSxDQUM3RyxDQUFDO0lBQ0gsYUFBQTtnQkFFRCxTQUFTO0lBQ1YsU0FBQTtZQUVELE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEMsUUFBQSxJQUFJLFFBQVEsRUFBRTtnQkFDWixNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ1YsZ0JBQUEsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNuQixnQkFBQSxPQUFPLEVBQUUsQ0FBSyxFQUFBLEVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFJLEVBQUEsQ0FBQTtJQUNuQyxnQkFBQSxRQUFRLEVBQUUsR0FBRztJQUNiLGdCQUFBLFNBQVMsRUFBRSxTQUFTO0lBQ3JCLGFBQUEsQ0FBQyxDQUFDO2dCQUNILFNBQVM7SUFDVixTQUFBO1lBRUQsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQyxRQUFBLElBQUksSUFBSSxFQUFFO0lBQ1IsWUFBQSxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekMsWUFBQSxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFFbkUsWUFBQSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRWhCLFlBQUEsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUUvQixNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ1YsZ0JBQUEsSUFBSSxFQUFFLElBQUksS0FBSyxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzVDLGdCQUFBLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDO0lBQzFCLGdCQUFBLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUMxQixPQUFPO29CQUNQLFFBQVE7b0JBQ1IsU0FBUztJQUNWLGFBQUEsQ0FBQyxDQUFDO2dCQUNILFNBQVM7SUFDVixTQUFBO0lBRUQsUUFBQSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2xCLE1BQU07SUFDUCxLQUFBLFFBQVEsSUFBSSxFQUFFO0lBRWYsSUFBQSxPQUFPLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBcEVELElBb0VDLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtJQUVEOztJQUVHO0lBQ0gsU0FBZ0IsT0FBTyxDQUNyQixJQUFVLEVBQ1YsVUFBMEIsRUFBRSxFQUFBO0lBRTVCLElBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxZQUFZLFNBQVMsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNyRSxJQUFBLE9BQU8sYUFBYSxDQUFJLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBTkQsSUFNQyxTQUFBLEdBQUEsSUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBLENBQUE7SUFLRDs7SUFFRztJQUNILFNBQVMsZUFBZSxDQUN0QixLQUFZLEVBQ1osTUFBc0IsRUFBQTtJQUV0QixJQUFBLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO0lBQzdCLFFBQUEsT0FBTyxNQUFNLEtBQUssQ0FBQztJQUNwQixLQUFBO0lBRUQsSUFBQSxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksVUFBVSxDQUFDO0lBQ3pDLElBQUEsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsS0FBSyxHQUFHLENBQUM7SUFDbEUsSUFBQSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLEdBQUcsQ0FBQztJQUNsRSxJQUFBLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsU0FBUyxHQUFHLEVBQUUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUUzRCxJQUFJLE1BQU0sSUFBSSxRQUFRLEVBQUU7SUFDdEIsUUFBQSxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQWEsRUFBRSxLQUFhLEtBQUk7SUFDakQsWUFBQSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtvQkFDN0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFhLFVBQUEsRUFBQSxLQUFLLENBQUMsSUFBSSxDQUFJLENBQUEsRUFBQSxLQUFLLENBQWtCLGdCQUFBLENBQUEsQ0FBQyxDQUFDO0lBQ3pFLGFBQUE7SUFDRCxZQUFBLE9BQU8sV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVCLFNBQUMsQ0FBQztJQUVGLFFBQUEsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFjLEtBQUk7SUFDakMsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDekIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLFVBQUEsRUFBYSxLQUFLLENBQUMsSUFBSSxDQUFrQixnQkFBQSxDQUFBLENBQUMsQ0FBQztJQUNoRSxhQUFBO0lBRUQsWUFBQSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztJQUFFLGdCQUFBLE9BQU8sRUFBRSxDQUFDO0lBRWxDLFlBQUEsT0FBTyxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDO0lBQ2hFLFNBQUMsQ0FBQztJQUVGLFFBQUEsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osT0FBTyxDQUFDLElBQUksS0FBWTtvQkFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDL0IsSUFBSSxLQUFLLElBQUksSUFBSTtJQUFFLG9CQUFBLE9BQU8sRUFBRSxDQUFDO0lBQzdCLGdCQUFBLE9BQU8sS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzVDLGFBQUMsQ0FBQztJQUNILFNBQUE7WUFFRCxPQUFPLENBQUMsSUFBSSxLQUFZO2dCQUN0QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLFlBQUEsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsU0FBQyxDQUFDO0lBQ0gsS0FBQTtJQUVELElBQUEsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFjLEtBQUk7SUFDbkMsUUFBQSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtnQkFDN0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLFVBQUEsRUFBYSxLQUFLLENBQUMsSUFBSSxDQUFrQixnQkFBQSxDQUFBLENBQUMsQ0FBQztJQUNoRSxTQUFBO1lBQ0QsT0FBTyxNQUFNLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQztJQUM5QyxLQUFDLENBQUM7SUFFRixJQUFBLElBQUksUUFBUSxFQUFFO1lBQ1osT0FBTyxDQUFDLElBQUksS0FBWTtnQkFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxLQUFLLElBQUksSUFBSTtJQUFFLGdCQUFBLE9BQU8sRUFBRSxDQUFDO0lBQzdCLFlBQUEsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUIsU0FBQyxDQUFDO0lBQ0gsS0FBQTtRQUVELE9BQU8sQ0FBQyxJQUFJLEtBQVk7WUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixRQUFBLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLEtBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7SUFFRztJQUNILFNBQVMsYUFBYSxDQUNwQixJQUFlLEVBQ2YsT0FBdUIsRUFBQTtJQUV2QixJQUFBLE1BQU0sRUFDSixNQUFNLEdBQUcsa0JBQWtCLEVBQzNCLEtBQUssR0FBRyxJQUFJLEVBQ1osUUFBUSxHQUFHLElBQUksR0FDaEIsR0FBRyxPQUFPLENBQUM7SUFDWixJQUFBLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQixNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzs7UUFHM0QsTUFBTSxRQUFRLEdBQXVDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNsRSxDQUFDLEtBQUssS0FBSTtZQUNSLE1BQU0sRUFBRSxHQUFHLGVBQWUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUMsUUFBQSxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVE7SUFBRSxZQUFBLE9BQU8sRUFBRSxDQUFDO0lBRXRELFFBQUEsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLENBQUksQ0FBQSxFQUFBLE9BQU8sQ0FBRyxDQUFBLENBQUEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUVwRCxPQUFPLENBQUMsSUFBSSxLQUFJO0lBQ2QsWUFBQSxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkIsWUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUN4QixnQkFBQSxNQUFNLElBQUksU0FBUyxDQUNqQixDQUFzQixtQkFBQSxFQUFBLEtBQUssQ0FBQyxJQUFJLENBQUEsR0FBQSxFQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBRSxDQUM5RCxDQUFDO0lBQ0gsYUFBQTtJQUNELFlBQUEsT0FBTyxLQUFLLENBQUM7SUFDZixTQUFDLENBQUM7SUFDSixLQUFDLENBQ0YsQ0FBQztJQUVGLElBQUEsT0FBTyxTQUFTLElBQUksQ0FBQyxJQUFBLEdBQTRCLEVBQUUsRUFBQTtZQUNqRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7WUFDZCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVE7SUFBRSxZQUFBLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEQsUUFBQSxPQUFPLElBQUksQ0FBQztJQUNkLEtBQUMsQ0FBQztJQUNKLENBQUM7SUFxQkQ7O0lBRUc7SUFDSCxTQUFnQixLQUFLLENBQ25CLElBQVUsRUFDVixVQUF3QixFQUFFLEVBQUE7UUFFMUIsTUFBTSxFQUFFLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQzlELElBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxZQUFZLFNBQVMsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLElBQUksR0FBVSxFQUFFLENBQUM7UUFDdkIsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSTtJQUNoQyxRQUFBLElBQUksTUFBTSxLQUFLLEdBQUcsQ0FBQyxRQUFRLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssR0FBRyxDQUFDLEVBQUU7SUFDNUQsWUFBQSxNQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzRCxZQUFBLE9BQU8sQ0FBQyxLQUFhLEtBQUssS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkQsU0FBQTtZQUVELE9BQU8sTUFBTSxJQUFJLFVBQVUsQ0FBQztJQUM5QixLQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sU0FBUyxLQUFLLENBQUMsUUFBZ0IsRUFBQTtZQUNwQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVCLFFBQUEsSUFBSSxDQUFDLENBQUM7SUFBRSxZQUFBLE9BQU8sS0FBSyxDQUFDO1lBRXJCLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM3QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRW5DLFFBQUEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7SUFDakMsWUFBQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTO29CQUFFLFNBQVM7Z0JBRWpDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDaEMsWUFBQSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxTQUFBO0lBRUQsUUFBQSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUNqQyxLQUFDLENBQUM7SUFDSixDQUFDO0lBcENELElBb0NDLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtJQUVEOztJQUVHO0lBQ0gsU0FBUyxNQUFNLENBQUMsR0FBVyxFQUFBO1FBQ3pCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQ7O0lBRUc7SUFDSCxTQUFTLGFBQWEsQ0FBQyxLQUFhLEVBQUUsS0FBYSxFQUFBO0lBQ2pELElBQUEsT0FBTyxLQUFLLEdBQUcsQ0FBQSxFQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFBLENBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVEOztJQUVHO0lBQ0gsU0FBUyxXQUFXLENBQUMsS0FBYyxFQUFFLFNBQWlCLEVBQUE7SUFDcEQsSUFBQSxJQUFJLENBQUMsS0FBSztJQUFFLFFBQUEsT0FBTyxNQUFNLENBQUM7SUFFMUIsSUFBQSxNQUFNLEVBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFLLEVBQUEsRUFBQSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUEsTUFBQSxDQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0QsSUFBQSxPQUFPLENBQUMsS0FBYSxLQUFLLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRDs7SUFFRztJQUNILFNBQVMsS0FBSyxDQUFDLE9BQWdDLEVBQUE7UUFDN0MsT0FBTyxPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFDdEMsQ0FBQztJQW1CRDs7SUFFRztJQUNILFNBQVMsY0FBYyxDQUNyQixJQUFlLEVBQ2YsSUFBVyxFQUNYLE9BQTRCLEVBQUE7SUFFNUIsSUFBQSxNQUFNLEVBQUUsUUFBUSxHQUFHLElBQUksRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLEdBQUcsR0FBRyxJQUFJLEVBQUUsS0FBSyxHQUFHLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUM1RSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxJQUFJLE9BQU8sR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUUvQixJQUFBLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUMvQixRQUFBLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO0lBQzdCLFlBQUEsT0FBTyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixTQUFBO0lBQU0sYUFBQTtnQkFDTCxJQUFJLEtBQUssQ0FBQyxJQUFJO0lBQUUsZ0JBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQyxZQUFBLE9BQU8sSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsU0FBQTtJQUNGLEtBQUE7SUFFRCxJQUFBLElBQUksUUFBUTtZQUFFLE9BQU8sSUFBSSxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUEsRUFBQSxDQUFJLENBQUM7SUFDN0QsSUFBQSxPQUFPLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFBLEdBQUEsRUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFFekQsT0FBTyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVEOztJQUVHO0lBQ0gsU0FBUyxXQUFXLENBQUMsU0FBaUIsRUFBRSxTQUFpQixFQUFBO1FBQ3ZELE1BQU0sY0FBYyxHQUFHLENBQUssRUFBQSxFQUFBLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1FBRW5ELE9BQU8sQ0FBQyxHQUFRLEtBQUk7SUFDbEIsUUFBQSxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3ZELFFBQUEsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN2RCxRQUFBLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO1lBRXBDLElBQUksR0FBRyxDQUFDLElBQUksRUFBRTtJQUNaLFlBQUEsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sSUFBSSxjQUFjLENBQUM7Z0JBQzlDLElBQUksR0FBRyxDQUFDLFFBQVEsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsS0FBSyxHQUFHLEVBQUU7SUFDaEQsZ0JBQUEsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFFBQVEsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUM1QyxnQkFBQSxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzVELGdCQUFBLE9BQU8sQ0FBTSxHQUFBLEVBQUEsTUFBTSxDQUFPLElBQUEsRUFBQSxPQUFPLENBQU8sSUFBQSxFQUFBLEtBQUssQ0FBTSxHQUFBLEVBQUEsT0FBTyxDQUFPLElBQUEsRUFBQSxNQUFNLENBQUksQ0FBQSxFQUFBLEdBQUcsRUFBRSxDQUFDO0lBQ2xGLGFBQUE7Z0JBQ0QsT0FBTyxDQUFBLEdBQUEsRUFBTSxNQUFNLENBQUksQ0FBQSxFQUFBLE9BQU8sSUFBSSxNQUFNLENBQUEsQ0FBQSxFQUFJLFFBQVEsQ0FBQSxDQUFFLENBQUM7SUFDeEQsU0FBQTtJQUVELFFBQUEsT0FBTyxNQUFNLE1BQU0sQ0FBQSxFQUFHLE1BQU0sQ0FBSSxDQUFBLEVBQUEsUUFBUSxFQUFFLENBQUM7SUFDN0MsS0FBQyxDQUFDO0lBQ0osQ0FBQztJQVNEOzs7Ozs7SUFNRztJQUNILFNBQWdCLFlBQVksQ0FBQyxJQUFVLEVBQUUsVUFBK0IsRUFBRSxFQUFBO0lBQ3hFLElBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxZQUFZLFNBQVMsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRSxNQUFNLElBQUksR0FBVSxFQUFFLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUxELGNBS0MsR0FBQSxJQUFBLENBQUEsWUFBQSxHQUFBLFlBQUE7O0lDbG5CRDs7SUFFRztBQTRDSCxVQUFNLFdBQVcsR0FBRztlQUNoQkEsT0FBSztpQkFDTEMsU0FBTztlQUNQQyxPQUFLO3NCQUNMQyxjQUFZOzs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAvIn0=