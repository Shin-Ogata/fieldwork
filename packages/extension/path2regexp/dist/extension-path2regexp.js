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
    dist.TokenData = void 0;
    var parse_1 = dist.parse = parse;
    var compile_1 = dist.compile = compile;
    var match_1 = dist.match = match;
    var pathToRegexp_1 = dist.pathToRegexp = pathToRegexp;
    const DEFAULT_DELIMITER = "/";
    const NOOP_VALUE = (value) => value;
    const ID_CHAR = /^\p{XID_Continue}$/u;
    const DEBUG_URL = "https://git.new/pathToRegexpError";
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
            throw new TypeError(`Unexpected ${nextType} at ${index}, expected ${type}: ${DEBUG_URL}`);
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
            return this.tryConsume("?") || this.tryConsume("*") || this.tryConsume("+");
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
        const { encodePath = NOOP_VALUE, delimiter = encodePath(DEFAULT_DELIMITER) } = options;
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
                    throw new TypeError(`Unexpected * at ${next.index}, you probably want \`/*\` or \`{/:foo}*\`: ${DEBUG_URL}`);
                }
                continue;
            }
            const asterisk = it.tryConsume("*");
            if (asterisk) {
                tokens.push({
                    name: String(key++),
                    pattern: `(?:(?!${escape(delimiter)}).)*`,
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
                const separator = it.tryConsume(";") && it.text();
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
    /**
     * Compile a string to a template function for the path.
     */
    function compile(path, options = {}) {
        const data = path instanceof TokenData ? path : parse(path, options);
        return compileTokens(data, options);
    }
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
        const { prefix = "", suffix = "", separator = suffix + prefix } = token;
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
        const { encode = encodeURIComponent, loose = true, validate = true, strict = false, } = options;
        const flags = toFlags(options);
        const stringify = toStringify(loose, data.delimiter);
        const sources = toRegExpSource(data, stringify, [], flags, strict);
        // Compile all the tokens into regexps.
        const encoders = data.tokens.map((token, index) => {
            const fn = tokenToFunction(token, encode);
            if (!validate || typeof token === "string")
                return fn;
            const validRe = new RegExp(`^${sources[index]}$`, flags);
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
                const { prefix = "", suffix = "", separator = suffix + prefix } = key;
                const re = new RegExp(stringify(separator), "g");
                return (value) => value.split(re).map(decode);
            }
            return decode || NOOP_VALUE;
        });
        return function match(input) {
            const m = re.exec(input);
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
    /**
     * Escape a regular expression string.
     */
    function escape(str) {
        return str.replace(/([.+*?^${}()[\]|/\\])/g, "\\$1");
    }
    /**
     * Escape and repeat loose characters for regular expressions.
     */
    function looseReplacer(value, loose) {
        const escaped = escape(value);
        return loose ? `(?:${escaped})+(?!${escaped})` : escaped;
    }
    /**
     * Encode all non-delimiter characters using the encode function.
     */
    function toStringify(loose, delimiter) {
        if (!loose)
            return escape;
        const re = new RegExp(`(?:(?!${escape(delimiter)}).)+|(.)`, "g");
        return (value) => value.replace(re, looseReplacer);
    }
    /**
     * Get the flags for a regexp from the options.
     */
    function toFlags(options) {
        return options.sensitive ? "" : "i";
    }
    /**
     * Expose a function for taking tokens and returning a RegExp.
     */
    function tokensToRegexp(data, keys, options) {
        const { trailing = true, loose = true, start = true, end = true, strict = false, } = options;
        const flags = toFlags(options);
        const stringify = toStringify(loose, data.delimiter);
        const sources = toRegExpSource(data, stringify, keys, flags, strict);
        let pattern = start ? "^" : "";
        pattern += sources.join("");
        if (trailing)
            pattern += `(?:${stringify(data.delimiter)})?`;
        pattern += end ? "$" : `(?=${escape(data.delimiter)}|$)`;
        return new RegExp(pattern, flags);
    }
    /**
     * Convert a token into a regexp string (re-used for path validation).
     */
    function toRegExpSource(data, stringify, keys, flags, strict) {
        const defaultPattern = `(?:(?!${escape(data.delimiter)}).)+?`;
        let backtrack = "";
        let safe = true;
        return data.tokens.map((token, index) => {
            if (typeof token === "string") {
                backtrack = token;
                return stringify(token);
            }
            const { prefix = "", suffix = "", separator = suffix + prefix, modifier = "", } = token;
            const pre = stringify(prefix);
            const post = stringify(suffix);
            if (token.name) {
                const pattern = token.pattern ? `(?:${token.pattern})` : defaultPattern;
                const re = checkPattern(pattern, token.name, flags);
                safe || (safe = safePattern(re, prefix || backtrack));
                if (!safe) {
                    throw new TypeError(`Ambiguous pattern for "${token.name}": ${DEBUG_URL}`);
                }
                safe = !strict || safePattern(re, suffix);
                backtrack = "";
                keys.push(token);
                if (modifier === "+" || modifier === "*") {
                    const mod = modifier === "*" ? "?" : "";
                    const sep = stringify(separator);
                    if (!sep) {
                        throw new TypeError(`Missing separator for "${token.name}": ${DEBUG_URL}`);
                    }
                    safe || (safe = !strict || safePattern(re, separator));
                    if (!safe) {
                        throw new TypeError(`Ambiguous pattern for "${token.name}" separator: ${DEBUG_URL}`);
                    }
                    safe = !strict;
                    return `(?:${pre}(${pattern}(?:${sep}${pattern})*)${post})${mod}`;
                }
                return `(?:${pre}(${pattern})${post})${modifier}`;
            }
            return `(?:${pre}${post})${modifier}`;
        });
    }
    function checkPattern(pattern, name, flags) {
        try {
            return new RegExp(`^${pattern}$`, flags);
        }
        catch (err) {
            throw new TypeError(`Invalid pattern for "${name}": ${err.message}`);
        }
    }
    function safePattern(re, value) {
        return value ? !re.test(value) : false;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX0NIQVIgPSAvXlxccHtYSURfQ29udGludWV9JC91O1xuY29uc3QgREVCVUdfVVJMID0gXCJodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3JcIjtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xuICAvKipcbiAgICogQSBmdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncy5cbiAgICovXG4gIGVuY29kZVBhdGg/OiBFbmNvZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF0aFRvUmVnZXhwT3B0aW9ucyBleHRlbmRzIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBSZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3cgdGhlIGRlbGltaXRlciB0byBiZSBhcmJpdHJhcmlseSByZXBlYXRlZC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGxvb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFZlcmlmeSBwYXR0ZXJucyBhcmUgdmFsaWQgYW5kIHNhZmUgdG8gdXNlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHN0cmljdD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHN0YXJ0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE1hdGNoIHRvIHRoZSBlbmQgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuZD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBBbGxvdyBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIGV4dGVuZHMgUGFyc2VPcHRpb25zIHtcbiAgLyoqXG4gICAqIFJlZ2V4cCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgZGVsaW1pdGVyIHRvIGJlIGFyYml0cmFyaWx5IHJlcGVhdGVkLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgbG9vc2U/OiBib29sZWFuO1xuICAvKipcbiAgICogVmVyaWZ5IHBhdHRlcm5zIGFyZSB2YWxpZCBhbmQgc2FmZSB0byB1c2UuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc3RyaWN0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFZlcmlmaWVzIHRoZSBmdW5jdGlvbiBpcyBwcm9kdWNpbmcgYSB2YWxpZCBwYXRoLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgdmFsaWRhdGU/OiBib29sZWFuO1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xufVxuXG50eXBlIFRva2VuVHlwZSA9XG4gIHwgXCJ7XCJcbiAgfCBcIn1cIlxuICB8IFwiO1wiXG4gIHwgXCIqXCJcbiAgfCBcIitcIlxuICB8IFwiP1wiXG4gIHwgXCJOQU1FXCJcbiAgfCBcIlBBVFRFUk5cIlxuICB8IFwiQ0hBUlwiXG4gIHwgXCJFU0NBUEVEXCJcbiAgfCBcIkVORFwiXG4gIC8vIFJlc2VydmVkIGZvciB1c2UuXG4gIHwgXCIhXCJcbiAgfCBcIkBcIlxuICB8IFwiLFwiO1xuXG4vKipcbiAqIFRva2VuaXplciByZXN1bHRzLlxuICovXG5pbnRlcmZhY2UgTGV4VG9rZW4ge1xuICB0eXBlOiBUb2tlblR5cGU7XG4gIGluZGV4OiBudW1iZXI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmNvbnN0IFNJTVBMRV9UT0tFTlM6IFJlY29yZDxzdHJpbmcsIFRva2VuVHlwZT4gPSB7XG4gIFwiIVwiOiBcIiFcIixcbiAgXCJAXCI6IFwiQFwiLFxuICBcIjtcIjogXCI7XCIsXG4gIFwiLFwiOiBcIixcIixcbiAgXCIqXCI6IFwiKlwiLFxuICBcIitcIjogXCIrXCIsXG4gIFwiP1wiOiBcIj9cIixcbiAgXCJ7XCI6IFwie1wiLFxuICBcIn1cIjogXCJ9XCIsXG59O1xuXG4vKipcbiAqIFRva2VuaXplIGlucHV0IHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gbGV4ZXIoc3RyOiBzdHJpbmcpIHtcbiAgY29uc3QgY2hhcnMgPSBbLi4uc3RyXTtcbiAgY29uc3QgdG9rZW5zOiBMZXhUb2tlbltdID0gW107XG4gIGxldCBpID0gMDtcblxuICB3aGlsZSAoaSA8IGNoYXJzLmxlbmd0aCkge1xuICAgIGNvbnN0IHZhbHVlID0gY2hhcnNbaV07XG4gICAgY29uc3QgdHlwZSA9IFNJTVBMRV9UT0tFTlNbdmFsdWVdO1xuXG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZSwgaW5kZXg6IGkrKywgdmFsdWUgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IFwiXFxcXFwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiRVNDQVBFRFwiLCBpbmRleDogaSsrLCB2YWx1ZTogY2hhcnNbaSsrXSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gXCI6XCIpIHtcbiAgICAgIGxldCBuYW1lID0gXCJcIjtcblxuICAgICAgd2hpbGUgKElEX0NIQVIudGVzdChjaGFyc1srK2ldKSkge1xuICAgICAgICBuYW1lICs9IGNoYXJzW2ldO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXIgbmFtZSBhdCAke2l9YCk7XG4gICAgICB9XG5cbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJOQU1FXCIsIGluZGV4OiBpLCB2YWx1ZTogbmFtZSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gXCIoXCIpIHtcbiAgICAgIGNvbnN0IHBvcyA9IGkrKztcbiAgICAgIGxldCBjb3VudCA9IDE7XG4gICAgICBsZXQgcGF0dGVybiA9IFwiXCI7XG5cbiAgICAgIGlmIChjaGFyc1tpXSA9PT0gXCI/XCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgUGF0dGVybiBjYW5ub3Qgc3RhcnQgd2l0aCBcIj9cIiBhdCAke2l9YCk7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChpIDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChjaGFyc1tpXSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICBwYXR0ZXJuICs9IGNoYXJzW2krK10gKyBjaGFyc1tpKytdO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYXJzW2ldID09PSBcIilcIikge1xuICAgICAgICAgIGNvdW50LS07XG4gICAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhcnNbaV0gPT09IFwiKFwiKSB7XG4gICAgICAgICAgY291bnQrKztcbiAgICAgICAgICBpZiAoY2hhcnNbaSArIDFdICE9PSBcIj9cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgQ2FwdHVyaW5nIGdyb3VwcyBhcmUgbm90IGFsbG93ZWQgYXQgJHtpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBhdHRlcm4gKz0gY2hhcnNbaSsrXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvdW50KSB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmJhbGFuY2VkIHBhdHRlcm4gYXQgJHtwb3N9YCk7XG4gICAgICBpZiAoIXBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGF0dGVybiBhdCAke3Bvc31gKTtcblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIlBBVFRFUk5cIiwgaW5kZXg6IGksIHZhbHVlOiBwYXR0ZXJuIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkNIQVJcIiwgaW5kZXg6IGksIHZhbHVlOiBjaGFyc1tpKytdIH0pO1xuICB9XG5cbiAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVORFwiLCBpbmRleDogaSwgdmFsdWU6IFwiXCIgfSk7XG5cbiAgcmV0dXJuIG5ldyBJdGVyKHRva2Vucyk7XG59XG5cbmNsYXNzIEl0ZXIge1xuICBpbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0b2tlbnM6IExleFRva2VuW10pIHt9XG5cbiAgcGVlaygpOiBMZXhUb2tlbiB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMuaW5kZXhdO1xuICB9XG5cbiAgdHJ5Q29uc3VtZSh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHRva2VuID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKHRva2VuLnR5cGUgIT09IHR5cGUpIHJldHVybjtcbiAgICB0aGlzLmluZGV4Kys7XG4gICAgcmV0dXJuIHRva2VuLnZhbHVlO1xuICB9XG5cbiAgY29uc3VtZSh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy50cnlDb25zdW1lKHR5cGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsdWU7XG4gICAgY29uc3QgeyB0eXBlOiBuZXh0VHlwZSwgaW5kZXggfSA9IHRoaXMucGVlaygpO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgVW5leHBlY3RlZCAke25leHRUeXBlfSBhdCAke2luZGV4fSwgZXhwZWN0ZWQgJHt0eXBlfTogJHtERUJVR19VUkx9YCxcbiAgICApO1xuICB9XG5cbiAgdGV4dCgpOiBzdHJpbmcge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICgodmFsdWUgPSB0aGlzLnRyeUNvbnN1bWUoXCJDSEFSXCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIkVTQ0FQRURcIikpKSB7XG4gICAgICByZXN1bHQgKz0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBtb2RpZmllcigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnRyeUNvbnN1bWUoXCI/XCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIipcIikgfHwgdGhpcy50cnlDb25zdW1lKFwiK1wiKTtcbiAgfVxufVxuXG4vKipcbiAqIFRva2VuaXplZCBwYXRoIGluc3RhbmNlLiBDYW4gd2UgcGFzc2VkIGFyb3VuZCBpbnN0ZWFkIG9mIHN0cmluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRva2VuRGF0YSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSB0b2tlbnM6IFRva2VuW10sXG4gICAgcHVibGljIHJlYWRvbmx5IGRlbGltaXRlcjogc3RyaW5nLFxuICApIHt9XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5EYXRhIHtcbiAgY29uc3QgeyBlbmNvZGVQYXRoID0gTk9PUF9WQUxVRSwgZGVsaW1pdGVyID0gZW5jb2RlUGF0aChERUZBVUxUX0RFTElNSVRFUikgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgdG9rZW5zOiBUb2tlbltdID0gW107XG4gIGNvbnN0IGl0ID0gbGV4ZXIoc3RyKTtcbiAgbGV0IGtleSA9IDA7XG5cbiAgZG8ge1xuICAgIGNvbnN0IHBhdGggPSBpdC50ZXh0KCk7XG4gICAgaWYgKHBhdGgpIHRva2Vucy5wdXNoKGVuY29kZVBhdGgocGF0aCkpO1xuXG4gICAgY29uc3QgbmFtZSA9IGl0LnRyeUNvbnN1bWUoXCJOQU1FXCIpO1xuICAgIGNvbnN0IHBhdHRlcm4gPSBpdC50cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcblxuICAgIGlmIChuYW1lIHx8IHBhdHRlcm4pIHtcbiAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCBTdHJpbmcoa2V5KyspLFxuICAgICAgICBwYXR0ZXJuLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IG5leHQgPSBpdC5wZWVrKCk7XG4gICAgICBpZiAobmV4dC50eXBlID09PSBcIipcIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGBVbmV4cGVjdGVkICogYXQgJHtuZXh0LmluZGV4fSwgeW91IHByb2JhYmx5IHdhbnQgXFxgLypcXGAgb3IgXFxgey86Zm9vfSpcXGA6ICR7REVCVUdfVVJMfWAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGFzdGVyaXNrID0gaXQudHJ5Q29uc3VtZShcIipcIik7XG4gICAgaWYgKGFzdGVyaXNrKSB7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIG5hbWU6IFN0cmluZyhrZXkrKyksXG4gICAgICAgIHBhdHRlcm46IGAoPzooPyEke2VzY2FwZShkZWxpbWl0ZXIpfSkuKSpgLFxuICAgICAgICBtb2RpZmllcjogXCIqXCIsXG4gICAgICAgIHNlcGFyYXRvcjogZGVsaW1pdGVyLFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBvcGVuID0gaXQudHJ5Q29uc3VtZShcIntcIik7XG4gICAgaWYgKG9wZW4pIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGl0LnRleHQoKTtcbiAgICAgIGNvbnN0IG5hbWUgPSBpdC50cnlDb25zdW1lKFwiTkFNRVwiKTtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBpdC50cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IGl0LnRleHQoKTtcbiAgICAgIGNvbnN0IHNlcGFyYXRvciA9IGl0LnRyeUNvbnN1bWUoXCI7XCIpICYmIGl0LnRleHQoKTtcblxuICAgICAgaXQuY29uc3VtZShcIn1cIik7XG5cbiAgICAgIGNvbnN0IG1vZGlmaWVyID0gaXQubW9kaWZpZXIoKTtcblxuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lIHx8IChwYXR0ZXJuID8gU3RyaW5nKGtleSsrKSA6IFwiXCIpLFxuICAgICAgICBwcmVmaXg6IGVuY29kZVBhdGgocHJlZml4KSxcbiAgICAgICAgc3VmZml4OiBlbmNvZGVQYXRoKHN1ZmZpeCksXG4gICAgICAgIHBhdHRlcm4sXG4gICAgICAgIG1vZGlmaWVyLFxuICAgICAgICBzZXBhcmF0b3IsXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGl0LmNvbnN1bWUoXCJFTkRcIik7XG4gICAgYnJlYWs7XG4gIH0gd2hpbGUgKHRydWUpO1xuXG4gIHJldHVybiBuZXcgVG9rZW5EYXRhKHRva2VucywgZGVsaW1pdGVyKTtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgUGFyYW1EYXRhID0gUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgcmV0dXJuIGNvbXBpbGVUb2tlbnM8UD4oZGF0YSwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IFBhcnRpYWw8UmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10+PjtcbmV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChkYXRhPzogUCkgPT4gc3RyaW5nO1xuXG4vKipcbiAqIENvbnZlcnQgYSBzaW5nbGUgdG9rZW4gaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRva2VuVG9GdW5jdGlvbihcbiAgdG9rZW46IFRva2VuLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogKGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiAoKSA9PiB0b2tlbjtcbiAgfVxuXG4gIGNvbnN0IGVuY29kZVZhbHVlID0gZW5jb2RlIHx8IE5PT1BfVkFMVUU7XG4gIGNvbnN0IHJlcGVhdGVkID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIjtcbiAgY29uc3Qgb3B0aW9uYWwgPSB0b2tlbi5tb2RpZmllciA9PT0gXCI/XCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiO1xuICBjb25zdCB7IHByZWZpeCA9IFwiXCIsIHN1ZmZpeCA9IFwiXCIsIHNlcGFyYXRvciA9IHN1ZmZpeCArIHByZWZpeCB9ID0gdG9rZW47XG5cbiAgaWYgKGVuY29kZSAmJiByZXBlYXRlZCkge1xuICAgIGNvbnN0IHN0cmluZ2lmeSA9ICh2YWx1ZTogc3RyaW5nLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2luZGV4fVwiIHRvIGJlIGEgc3RyaW5nYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW5jb2RlVmFsdWUodmFsdWUpO1xuICAgIH07XG5cbiAgICBjb25zdCBjb21waWxlID0gKHZhbHVlOiB1bmtub3duKSA9PiB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGFuIGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHJldHVybiBcIlwiO1xuXG4gICAgICByZXR1cm4gcHJlZml4ICsgdmFsdWUubWFwKHN0cmluZ2lmeSkuam9pbihzZXBhcmF0b3IpICsgc3VmZml4O1xuICAgIH07XG5cbiAgICBpZiAob3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgICAgICByZXR1cm4gdmFsdWUubGVuZ3RoID8gY29tcGlsZSh2YWx1ZSkgOiBcIlwiO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gKGRhdGEpOiBzdHJpbmcgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgcmV0dXJuIGNvbXBpbGUodmFsdWUpO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBzdHJpbmdpZnkgPSAodmFsdWU6IHVua25vd24pID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICByZXR1cm4gcHJlZml4ICsgZW5jb2RlVmFsdWUodmFsdWUpICsgc3VmZml4O1xuICB9O1xuXG4gIGlmIChvcHRpb25hbCkge1xuICAgIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgICByZXR1cm4gc3RyaW5naWZ5KHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgcmV0dXJuIHN0cmluZ2lmeSh2YWx1ZSk7XG4gIH07XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIHRva2VucyBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY29tcGlsZVRva2VuczxQIGV4dGVuZHMgUGFyYW1EYXRhPihcbiAgZGF0YTogVG9rZW5EYXRhLFxuICBvcHRpb25zOiBDb21waWxlT3B0aW9ucyxcbik6IFBhdGhGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHtcbiAgICBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsXG4gICAgbG9vc2UgPSB0cnVlLFxuICAgIHZhbGlkYXRlID0gdHJ1ZSxcbiAgICBzdHJpY3QgPSBmYWxzZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGZsYWdzID0gdG9GbGFncyhvcHRpb25zKTtcbiAgY29uc3Qgc3RyaW5naWZ5ID0gdG9TdHJpbmdpZnkobG9vc2UsIGRhdGEuZGVsaW1pdGVyKTtcbiAgY29uc3Qgc291cmNlcyA9IHRvUmVnRXhwU291cmNlKGRhdGEsIHN0cmluZ2lmeSwgW10sIGZsYWdzLCBzdHJpY3QpO1xuXG4gIC8vIENvbXBpbGUgYWxsIHRoZSB0b2tlbnMgaW50byByZWdleHBzLlxuICBjb25zdCBlbmNvZGVyczogQXJyYXk8KGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nPiA9IGRhdGEudG9rZW5zLm1hcChcbiAgICAodG9rZW4sIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCBmbiA9IHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZW5jb2RlKTtcbiAgICAgIGlmICghdmFsaWRhdGUgfHwgdHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSByZXR1cm4gZm47XG5cbiAgICAgIGNvbnN0IHZhbGlkUmUgPSBuZXcgUmVnRXhwKGBeJHtzb3VyY2VzW2luZGV4XX0kYCwgZmxhZ3MpO1xuXG4gICAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBmbihkYXRhKTtcbiAgICAgICAgaWYgKCF2YWxpZFJlLnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIGBJbnZhbGlkIHZhbHVlIGZvciBcIiR7dG9rZW4ubmFtZX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH07XG4gICAgfSxcbiAgKTtcblxuICByZXR1cm4gZnVuY3Rpb24gcGF0aChkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge30pIHtcbiAgICBsZXQgcGF0aCA9IFwiXCI7XG4gICAgZm9yIChjb25zdCBlbmNvZGVyIG9mIGVuY29kZXJzKSBwYXRoICs9IGVuY29kZXIoZGF0YSk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiB7XG4gIHBhdGg6IHN0cmluZztcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAocGF0aDogc3RyaW5nKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBDcmVhdGUgcGF0aCBtYXRjaCBmdW5jdGlvbiBmcm9tIGBwYXRoLXRvLXJlZ2V4cGAgc3BlYy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgbG9vc2UgPSB0cnVlIH0gPSBvcHRpb25zO1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3Qgc3RyaW5naWZ5ID0gdG9TdHJpbmdpZnkobG9vc2UsIGRhdGEuZGVsaW1pdGVyKTtcbiAgY29uc3Qga2V5czogS2V5W10gPSBbXTtcbiAgY29uc3QgcmUgPSB0b2tlbnNUb1JlZ2V4cChkYXRhLCBrZXlzLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlICYmIChrZXkubW9kaWZpZXIgPT09IFwiK1wiIHx8IGtleS5tb2RpZmllciA9PT0gXCIqXCIpKSB7XG4gICAgICBjb25zdCB7IHByZWZpeCA9IFwiXCIsIHN1ZmZpeCA9IFwiXCIsIHNlcGFyYXRvciA9IHN1ZmZpeCArIHByZWZpeCB9ID0ga2V5O1xuICAgICAgY29uc3QgcmUgPSBuZXcgUmVnRXhwKHN0cmluZ2lmeShzZXBhcmF0b3IpLCBcImdcIik7XG4gICAgICByZXR1cm4gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnNwbGl0KHJlKS5tYXAoZGVjb2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb2RlIHx8IE5PT1BfVkFMVUU7XG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiBtYXRjaChpbnB1dDogc3RyaW5nKSB7XG4gICAgY29uc3QgbSA9IHJlLmV4ZWMoaW5wdXQpO1xuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgeyAwOiBwYXRoLCBpbmRleCB9ID0gbTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG4gICAgICBjb25zdCBkZWNvZGVyID0gZGVjb2RlcnNbaSAtIDFdO1xuICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZXIobVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgaW5kZXgsIHBhcmFtcyB9O1xuICB9O1xufVxuXG4vKipcbiAqIEVzY2FwZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZShzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbLisqP14ke30oKVtcXF18L1xcXFxdKS9nLCBcIlxcXFwkMVwiKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYW5kIHJlcGVhdCBsb29zZSBjaGFyYWN0ZXJzIGZvciByZWd1bGFyIGV4cHJlc3Npb25zLlxuICovXG5mdW5jdGlvbiBsb29zZVJlcGxhY2VyKHZhbHVlOiBzdHJpbmcsIGxvb3NlOiBzdHJpbmcpIHtcbiAgY29uc3QgZXNjYXBlZCA9IGVzY2FwZSh2YWx1ZSk7XG4gIHJldHVybiBsb29zZSA/IGAoPzoke2VzY2FwZWR9KSsoPyEke2VzY2FwZWR9KWAgOiBlc2NhcGVkO1xufVxuXG4vKipcbiAqIEVuY29kZSBhbGwgbm9uLWRlbGltaXRlciBjaGFyYWN0ZXJzIHVzaW5nIHRoZSBlbmNvZGUgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5naWZ5KGxvb3NlOiBib29sZWFuLCBkZWxpbWl0ZXI6IHN0cmluZykge1xuICBpZiAoIWxvb3NlKSByZXR1cm4gZXNjYXBlO1xuXG4gIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgKD86KD8hJHtlc2NhcGUoZGVsaW1pdGVyKX0pLikrfCguKWAsIFwiZ1wiKTtcbiAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5yZXBsYWNlKHJlLCBsb29zZVJlcGxhY2VyKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZsYWdzIGZvciBhIHJlZ2V4cCBmcm9tIHRoZSBvcHRpb25zLlxuICovXG5mdW5jdGlvbiB0b0ZsYWdzKG9wdGlvbnM6IHsgc2Vuc2l0aXZlPzogYm9vbGVhbiB9KSB7XG4gIHJldHVybiBvcHRpb25zLnNlbnNpdGl2ZSA/IFwiXCIgOiBcImlcIjtcbn1cblxuLyoqXG4gKiBBIGtleSBpcyBhIGNhcHR1cmUgZ3JvdXAgaW4gdGhlIHJlZ2V4LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEtleSB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHJlZml4Pzogc3RyaW5nO1xuICBzdWZmaXg/OiBzdHJpbmc7XG4gIHBhdHRlcm4/OiBzdHJpbmc7XG4gIG1vZGlmaWVyPzogc3RyaW5nO1xuICBzZXBhcmF0b3I/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0b2tlbiBpcyBhIHN0cmluZyAobm90aGluZyBzcGVjaWFsKSBvciBrZXkgbWV0YWRhdGEgKGNhcHR1cmUgZ3JvdXApLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IHN0cmluZyB8IEtleTtcblxuLyoqXG4gKiBFeHBvc2UgYSBmdW5jdGlvbiBmb3IgdGFraW5nIHRva2VucyBhbmQgcmV0dXJuaW5nIGEgUmVnRXhwLlxuICovXG5mdW5jdGlvbiB0b2tlbnNUb1JlZ2V4cChcbiAgZGF0YTogVG9rZW5EYXRhLFxuICBrZXlzOiBLZXlbXSxcbiAgb3B0aW9uczogUGF0aFRvUmVnZXhwT3B0aW9ucyxcbik6IFJlZ0V4cCB7XG4gIGNvbnN0IHtcbiAgICB0cmFpbGluZyA9IHRydWUsXG4gICAgbG9vc2UgPSB0cnVlLFxuICAgIHN0YXJ0ID0gdHJ1ZSxcbiAgICBlbmQgPSB0cnVlLFxuICAgIHN0cmljdCA9IGZhbHNlLFxuICB9ID0gb3B0aW9ucztcbiAgY29uc3QgZmxhZ3MgPSB0b0ZsYWdzKG9wdGlvbnMpO1xuICBjb25zdCBzdHJpbmdpZnkgPSB0b1N0cmluZ2lmeShsb29zZSwgZGF0YS5kZWxpbWl0ZXIpO1xuICBjb25zdCBzb3VyY2VzID0gdG9SZWdFeHBTb3VyY2UoZGF0YSwgc3RyaW5naWZ5LCBrZXlzLCBmbGFncywgc3RyaWN0KTtcbiAgbGV0IHBhdHRlcm4gPSBzdGFydCA/IFwiXlwiIDogXCJcIjtcbiAgcGF0dGVybiArPSBzb3VyY2VzLmpvaW4oXCJcIik7XG4gIGlmICh0cmFpbGluZykgcGF0dGVybiArPSBgKD86JHtzdHJpbmdpZnkoZGF0YS5kZWxpbWl0ZXIpfSk/YDtcbiAgcGF0dGVybiArPSBlbmQgPyBcIiRcIiA6IGAoPz0ke2VzY2FwZShkYXRhLmRlbGltaXRlcil9fCQpYDtcblxuICByZXR1cm4gbmV3IFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHRva2VuIGludG8gYSByZWdleHAgc3RyaW5nIChyZS11c2VkIGZvciBwYXRoIHZhbGlkYXRpb24pLlxuICovXG5mdW5jdGlvbiB0b1JlZ0V4cFNvdXJjZShcbiAgZGF0YTogVG9rZW5EYXRhLFxuICBzdHJpbmdpZnk6IEVuY29kZSxcbiAga2V5czogS2V5W10sXG4gIGZsYWdzOiBzdHJpbmcsXG4gIHN0cmljdDogYm9vbGVhbixcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgZGVmYXVsdFBhdHRlcm4gPSBgKD86KD8hJHtlc2NhcGUoZGF0YS5kZWxpbWl0ZXIpfSkuKSs/YDtcbiAgbGV0IGJhY2t0cmFjayA9IFwiXCI7XG4gIGxldCBzYWZlID0gdHJ1ZTtcblxuICByZXR1cm4gZGF0YS50b2tlbnMubWFwKCh0b2tlbiwgaW5kZXgpID0+IHtcbiAgICBpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBiYWNrdHJhY2sgPSB0b2tlbjtcbiAgICAgIHJldHVybiBzdHJpbmdpZnkodG9rZW4pO1xuICAgIH1cblxuICAgIGNvbnN0IHtcbiAgICAgIHByZWZpeCA9IFwiXCIsXG4gICAgICBzdWZmaXggPSBcIlwiLFxuICAgICAgc2VwYXJhdG9yID0gc3VmZml4ICsgcHJlZml4LFxuICAgICAgbW9kaWZpZXIgPSBcIlwiLFxuICAgIH0gPSB0b2tlbjtcblxuICAgIGNvbnN0IHByZSA9IHN0cmluZ2lmeShwcmVmaXgpO1xuICAgIGNvbnN0IHBvc3QgPSBzdHJpbmdpZnkoc3VmZml4KTtcblxuICAgIGlmICh0b2tlbi5uYW1lKSB7XG4gICAgICBjb25zdCBwYXR0ZXJuID0gdG9rZW4ucGF0dGVybiA/IGAoPzoke3Rva2VuLnBhdHRlcm59KWAgOiBkZWZhdWx0UGF0dGVybjtcbiAgICAgIGNvbnN0IHJlID0gY2hlY2tQYXR0ZXJuKHBhdHRlcm4sIHRva2VuLm5hbWUsIGZsYWdzKTtcblxuICAgICAgc2FmZSB8fD0gc2FmZVBhdHRlcm4ocmUsIHByZWZpeCB8fCBiYWNrdHJhY2spO1xuICAgICAgaWYgKCFzYWZlKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgYEFtYmlndW91cyBwYXR0ZXJuIGZvciBcIiR7dG9rZW4ubmFtZX1cIjogJHtERUJVR19VUkx9YCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHNhZmUgPSAhc3RyaWN0IHx8IHNhZmVQYXR0ZXJuKHJlLCBzdWZmaXgpO1xuICAgICAgYmFja3RyYWNrID0gXCJcIjtcblxuICAgICAga2V5cy5wdXNoKHRva2VuKTtcblxuICAgICAgaWYgKG1vZGlmaWVyID09PSBcIitcIiB8fCBtb2RpZmllciA9PT0gXCIqXCIpIHtcbiAgICAgICAgY29uc3QgbW9kID0gbW9kaWZpZXIgPT09IFwiKlwiID8gXCI/XCIgOiBcIlwiO1xuICAgICAgICBjb25zdCBzZXAgPSBzdHJpbmdpZnkoc2VwYXJhdG9yKTtcblxuICAgICAgICBpZiAoIXNlcCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBgTWlzc2luZyBzZXBhcmF0b3IgZm9yIFwiJHt0b2tlbi5uYW1lfVwiOiAke0RFQlVHX1VSTH1gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBzYWZlIHx8PSAhc3RyaWN0IHx8IHNhZmVQYXR0ZXJuKHJlLCBzZXBhcmF0b3IpO1xuICAgICAgICBpZiAoIXNhZmUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYEFtYmlndW91cyBwYXR0ZXJuIGZvciBcIiR7dG9rZW4ubmFtZX1cIiBzZXBhcmF0b3I6ICR7REVCVUdfVVJMfWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBzYWZlID0gIXN0cmljdDtcblxuICAgICAgICByZXR1cm4gYCg/OiR7cHJlfSgke3BhdHRlcm59KD86JHtzZXB9JHtwYXR0ZXJufSkqKSR7cG9zdH0pJHttb2R9YDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGAoPzoke3ByZX0oJHtwYXR0ZXJufSkke3Bvc3R9KSR7bW9kaWZpZXJ9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gYCg/OiR7cHJlfSR7cG9zdH0pJHttb2RpZmllcn1gO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY2hlY2tQYXR0ZXJuKHBhdHRlcm46IHN0cmluZywgbmFtZTogc3RyaW5nLCBmbGFnczogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4ke3BhdHRlcm59JGAsIGZsYWdzKTtcbiAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIHBhdHRlcm4gZm9yIFwiJHtuYW1lfVwiOiAke2Vyci5tZXNzYWdlfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhZmVQYXR0ZXJuKHJlOiBSZWdFeHAsIHZhbHVlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHZhbHVlID8gIXJlLnRlc3QodmFsdWUpIDogZmFsc2U7XG59XG5cbi8qKlxuICogUmVwZWF0ZWQgYW5kIHNpbXBsZSBpbnB1dCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGdpdmVuIHBhdGggc3RyaW5nLCByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKlxuICogQW4gZW1wdHkgYXJyYXkgY2FuIGJlIHBhc3NlZCBpbiBmb3IgdGhlIGtleXMsIHdoaWNoIHdpbGwgaG9sZCB0aGVcbiAqIHBsYWNlaG9sZGVyIGtleSBkZXNjcmlwdGlvbnMuIEZvciBleGFtcGxlLCB1c2luZyBgL3VzZXIvOmlkYCwgYGtleXNgIHdpbGxcbiAqIGNvbnRhaW4gYFt7IG5hbWU6ICdpZCcsIGRlbGltaXRlcjogJy8nLCBvcHRpb25hbDogZmFsc2UsIHJlcGVhdDogZmFsc2UgfV1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUmVnZXhwKHBhdGg6IFBhdGgsIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3Qga2V5czogS2V5W10gPSBbXTtcbiAgY29uc3QgcmVnZXhwID0gdG9rZW5zVG9SZWdleHAoZGF0YSwga2V5cywgb3B0aW9ucyk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKHJlZ2V4cCwgeyBrZXlzIH0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgRW5jb2RlIGFzIHAyckVuY29kZSxcbiAgICBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIFBhcnNlT3B0aW9ucyBhcyBwMnJQYXJzZU9wdGlvbnMsXG4gICAgUGF0aFRvUmVnZXhwT3B0aW9ucyBhcyBwMnJQYXRoVG9SZWdleHBPcHRpb25zLFxuICAgIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgQ29tcGlsZU9wdGlvbnMgYXMgcDJyQ29tcGlsZU9wdGlvbnMsXG4gICAgVG9rZW5EYXRhIGFzIHAyclRva2VuRGF0YSxcbiAgICBQYXJhbURhdGEgYXMgcDJyUGFyYW1EYXRhLFxuICAgIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIEtleSBhcyBwMnJLZXksXG4gICAgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgUGF0aCBhcyBwMnJQYXRoLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBFbmNvZGUgPSBwMnJFbmNvZGU7XG4gICAgZXhwb3J0IHR5cGUgRGVjb2RlID0gcDJyRGVjb2RlO1xuICAgIGV4cG9ydCB0eXBlIFBhcnNlT3B0aW9ucyA9IHAyclBhcnNlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zID0gcDJyUGF0aFRvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaE9wdGlvbnMgPSBwMnJNYXRjaE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgQ29tcGlsZU9wdGlvbnMgPSBwMnJDb21waWxlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUb2tlbkRhdGEgPSBwMnJUb2tlbkRhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gcDJyUGFyYW1EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyclBhdGhGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoUmVzdWx0PFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2g8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgUGF0aCA9IHAyclBhdGg7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgcGF0aFRvUmVnZXhwLFxufTtcblxuZXhwb3J0IHsgcGF0aDJyZWdleHAgfTtcbiJdLCJuYW1lcyI6WyJwYXJzZSIsImNvbXBpbGUiLCJtYXRjaCIsInBhdGhUb1JlZ2V4cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0lBZ1FBLElBcUVDLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtJQUtELElBTUMsU0FBQSxHQUFBLElBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0lBNElELElBcUNDLE9BQUEsR0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtJQThLRCxJQUtDLGNBQUEsR0FBQSxJQUFBLENBQUEsWUFBQSxHQUFBLFlBQUEsQ0FBQTtJQXByQkQsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUM7SUFDOUIsTUFBTSxVQUFVLEdB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QSxPQUFPLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQ3pDLENBQUM7SUFPRDs7Ozs7O0lBTUc7SUFDSCxTQUFnQixZQUFZLENBQUMsSUFBVSxFQUFFLFVBQStCLEVBQUUsRUFBQTtJQUN4RSxJQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksWUFBWSxTQUFTLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckUsTUFBTSxJQUFJLEdBQVUsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDOztJQ3ByQkE7O0lBRUc7QUEwQ0gsVUFBTSxXQUFXLEdBQUc7ZUFDaEJBLE9BQUs7aUJBQ0xDLFNBQU87ZUFDUEMsT0FBSztzQkFDTEMsY0FBWTs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9