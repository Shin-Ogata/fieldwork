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

    var hasRequiredDist;

    function requireDist () {
    	if (hasRequiredDist) return dist;
    	hasRequiredDist = 1;
    	Object.defineProperty(dist, "__esModule", { value: true });
    	dist.TokenData = void 0;
    	dist.parse = parse;
    	dist.compile = compile;
    	dist.match = match;
    	dist.pathToRegexp = pathToRegexp;
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
    	
    	return dist;
    }

    var distExports = requireDist();

    /* eslint-disable
        @typescript-eslint/no-namespace,
     */
    const path2regexp = {
        parse: distExports.parse,
        compile: distExports.compile,
        match: distExports.match,
        pathToRegexp: distExports.pathToRegexp,
    };

    exports.path2regexp = path2regexp;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX0NIQVIgPSAvXlxccHtYSURfQ29udGludWV9JC91O1xuY29uc3QgREVCVUdfVVJMID0gXCJodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3JcIjtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xuICAvKipcbiAgICogQSBmdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncy5cbiAgICovXG4gIGVuY29kZVBhdGg/OiBFbmNvZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF0aFRvUmVnZXhwT3B0aW9ucyBleHRlbmRzIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBSZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3cgdGhlIGRlbGltaXRlciB0byBiZSBhcmJpdHJhcmlseSByZXBlYXRlZC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGxvb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFZlcmlmeSBwYXR0ZXJucyBhcmUgdmFsaWQgYW5kIHNhZmUgdG8gdXNlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHN0cmljdD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHN0YXJ0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE1hdGNoIHRvIHRoZSBlbmQgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuZD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBBbGxvdyBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIGV4dGVuZHMgUGFyc2VPcHRpb25zIHtcbiAgLyoqXG4gICAqIFJlZ2V4cCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgZGVsaW1pdGVyIHRvIGJlIGFyYml0cmFyaWx5IHJlcGVhdGVkLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgbG9vc2U/OiBib29sZWFuO1xuICAvKipcbiAgICogVmVyaWZ5IHBhdHRlcm5zIGFyZSB2YWxpZCBhbmQgc2FmZSB0byB1c2UuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc3RyaWN0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFZlcmlmaWVzIHRoZSBmdW5jdGlvbiBpcyBwcm9kdWNpbmcgYSB2YWxpZCBwYXRoLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgdmFsaWRhdGU/OiBib29sZWFuO1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xufVxuXG50eXBlIFRva2VuVHlwZSA9XG4gIHwgXCJ7XCJcbiAgfCBcIn1cIlxuICB8IFwiO1wiXG4gIHwgXCIqXCJcbiAgfCBcIitcIlxuICB8IFwiP1wiXG4gIHwgXCJOQU1FXCJcbiAgfCBcIlBBVFRFUk5cIlxuICB8IFwiQ0hBUlwiXG4gIHwgXCJFU0NBUEVEXCJcbiAgfCBcIkVORFwiXG4gIC8vIFJlc2VydmVkIGZvciB1c2UuXG4gIHwgXCIhXCJcbiAgfCBcIkBcIlxuICB8IFwiLFwiO1xuXG4vKipcbiAqIFRva2VuaXplciByZXN1bHRzLlxuICovXG5pbnRlcmZhY2UgTGV4VG9rZW4ge1xuICB0eXBlOiBUb2tlblR5cGU7XG4gIGluZGV4OiBudW1iZXI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmNvbnN0IFNJTVBMRV9UT0tFTlM6IFJlY29yZDxzdHJpbmcsIFRva2VuVHlwZT4gPSB7XG4gIFwiIVwiOiBcIiFcIixcbiAgXCJAXCI6IFwiQFwiLFxuICBcIjtcIjogXCI7XCIsXG4gIFwiLFwiOiBcIixcIixcbiAgXCIqXCI6IFwiKlwiLFxuICBcIitcIjogXCIrXCIsXG4gIFwiP1wiOiBcIj9cIixcbiAgXCJ7XCI6IFwie1wiLFxuICBcIn1cIjogXCJ9XCIsXG59O1xuXG4vKipcbiAqIFRva2VuaXplIGlucHV0IHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gbGV4ZXIoc3RyOiBzdHJpbmcpIHtcbiAgY29uc3QgY2hhcnMgPSBbLi4uc3RyXTtcbiAgY29uc3QgdG9rZW5zOiBMZXhUb2tlbltdID0gW107XG4gIGxldCBpID0gMDtcblxuICB3aGlsZSAoaSA8IGNoYXJzLmxlbmd0aCkge1xuICAgIGNvbnN0IHZhbHVlID0gY2hhcnNbaV07XG4gICAgY29uc3QgdHlwZSA9IFNJTVBMRV9UT0tFTlNbdmFsdWVdO1xuXG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZSwgaW5kZXg6IGkrKywgdmFsdWUgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IFwiXFxcXFwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiRVNDQVBFRFwiLCBpbmRleDogaSsrLCB2YWx1ZTogY2hhcnNbaSsrXSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gXCI6XCIpIHtcbiAgICAgIGxldCBuYW1lID0gXCJcIjtcblxuICAgICAgd2hpbGUgKElEX0NIQVIudGVzdChjaGFyc1srK2ldKSkge1xuICAgICAgICBuYW1lICs9IGNoYXJzW2ldO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXIgbmFtZSBhdCAke2l9YCk7XG4gICAgICB9XG5cbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJOQU1FXCIsIGluZGV4OiBpLCB2YWx1ZTogbmFtZSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gXCIoXCIpIHtcbiAgICAgIGNvbnN0IHBvcyA9IGkrKztcbiAgICAgIGxldCBjb3VudCA9IDE7XG4gICAgICBsZXQgcGF0dGVybiA9IFwiXCI7XG5cbiAgICAgIGlmIChjaGFyc1tpXSA9PT0gXCI/XCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgUGF0dGVybiBjYW5ub3Qgc3RhcnQgd2l0aCBcIj9cIiBhdCAke2l9YCk7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChpIDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChjaGFyc1tpXSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICBwYXR0ZXJuICs9IGNoYXJzW2krK10gKyBjaGFyc1tpKytdO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYXJzW2ldID09PSBcIilcIikge1xuICAgICAgICAgIGNvdW50LS07XG4gICAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhcnNbaV0gPT09IFwiKFwiKSB7XG4gICAgICAgICAgY291bnQrKztcbiAgICAgICAgICBpZiAoY2hhcnNbaSArIDFdICE9PSBcIj9cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgQ2FwdHVyaW5nIGdyb3VwcyBhcmUgbm90IGFsbG93ZWQgYXQgJHtpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBhdHRlcm4gKz0gY2hhcnNbaSsrXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvdW50KSB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmJhbGFuY2VkIHBhdHRlcm4gYXQgJHtwb3N9YCk7XG4gICAgICBpZiAoIXBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGF0dGVybiBhdCAke3Bvc31gKTtcblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIlBBVFRFUk5cIiwgaW5kZXg6IGksIHZhbHVlOiBwYXR0ZXJuIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkNIQVJcIiwgaW5kZXg6IGksIHZhbHVlOiBjaGFyc1tpKytdIH0pO1xuICB9XG5cbiAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVORFwiLCBpbmRleDogaSwgdmFsdWU6IFwiXCIgfSk7XG5cbiAgcmV0dXJuIG5ldyBJdGVyKHRva2Vucyk7XG59XG5cbmNsYXNzIEl0ZXIge1xuICBpbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0b2tlbnM6IExleFRva2VuW10pIHt9XG5cbiAgcGVlaygpOiBMZXhUb2tlbiB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMuaW5kZXhdO1xuICB9XG5cbiAgdHJ5Q29uc3VtZSh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHRva2VuID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKHRva2VuLnR5cGUgIT09IHR5cGUpIHJldHVybjtcbiAgICB0aGlzLmluZGV4Kys7XG4gICAgcmV0dXJuIHRva2VuLnZhbHVlO1xuICB9XG5cbiAgY29uc3VtZSh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy50cnlDb25zdW1lKHR5cGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsdWU7XG4gICAgY29uc3QgeyB0eXBlOiBuZXh0VHlwZSwgaW5kZXggfSA9IHRoaXMucGVlaygpO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgVW5leHBlY3RlZCAke25leHRUeXBlfSBhdCAke2luZGV4fSwgZXhwZWN0ZWQgJHt0eXBlfTogJHtERUJVR19VUkx9YCxcbiAgICApO1xuICB9XG5cbiAgdGV4dCgpOiBzdHJpbmcge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICgodmFsdWUgPSB0aGlzLnRyeUNvbnN1bWUoXCJDSEFSXCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIkVTQ0FQRURcIikpKSB7XG4gICAgICByZXN1bHQgKz0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBtb2RpZmllcigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnRyeUNvbnN1bWUoXCI/XCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIipcIikgfHwgdGhpcy50cnlDb25zdW1lKFwiK1wiKTtcbiAgfVxufVxuXG4vKipcbiAqIFRva2VuaXplZCBwYXRoIGluc3RhbmNlLiBDYW4gd2UgcGFzc2VkIGFyb3VuZCBpbnN0ZWFkIG9mIHN0cmluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRva2VuRGF0YSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSB0b2tlbnM6IFRva2VuW10sXG4gICAgcHVibGljIHJlYWRvbmx5IGRlbGltaXRlcjogc3RyaW5nLFxuICApIHt9XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5EYXRhIHtcbiAgY29uc3QgeyBlbmNvZGVQYXRoID0gTk9PUF9WQUxVRSwgZGVsaW1pdGVyID0gZW5jb2RlUGF0aChERUZBVUxUX0RFTElNSVRFUikgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgdG9rZW5zOiBUb2tlbltdID0gW107XG4gIGNvbnN0IGl0ID0gbGV4ZXIoc3RyKTtcbiAgbGV0IGtleSA9IDA7XG5cbiAgZG8ge1xuICAgIGNvbnN0IHBhdGggPSBpdC50ZXh0KCk7XG4gICAgaWYgKHBhdGgpIHRva2Vucy5wdXNoKGVuY29kZVBhdGgocGF0aCkpO1xuXG4gICAgY29uc3QgbmFtZSA9IGl0LnRyeUNvbnN1bWUoXCJOQU1FXCIpO1xuICAgIGNvbnN0IHBhdHRlcm4gPSBpdC50cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcblxuICAgIGlmIChuYW1lIHx8IHBhdHRlcm4pIHtcbiAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCBTdHJpbmcoa2V5KyspLFxuICAgICAgICBwYXR0ZXJuLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IG5leHQgPSBpdC5wZWVrKCk7XG4gICAgICBpZiAobmV4dC50eXBlID09PSBcIipcIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGBVbmV4cGVjdGVkICogYXQgJHtuZXh0LmluZGV4fSwgeW91IHByb2JhYmx5IHdhbnQgXFxgLypcXGAgb3IgXFxgey86Zm9vfSpcXGA6ICR7REVCVUdfVVJMfWAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGFzdGVyaXNrID0gaXQudHJ5Q29uc3VtZShcIipcIik7XG4gICAgaWYgKGFzdGVyaXNrKSB7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIG5hbWU6IFN0cmluZyhrZXkrKyksXG4gICAgICAgIHBhdHRlcm46IGAoPzooPyEke2VzY2FwZShkZWxpbWl0ZXIpfSkuKSpgLFxuICAgICAgICBtb2RpZmllcjogXCIqXCIsXG4gICAgICAgIHNlcGFyYXRvcjogZGVsaW1pdGVyLFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBvcGVuID0gaXQudHJ5Q29uc3VtZShcIntcIik7XG4gICAgaWYgKG9wZW4pIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGl0LnRleHQoKTtcbiAgICAgIGNvbnN0IG5hbWUgPSBpdC50cnlDb25zdW1lKFwiTkFNRVwiKTtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBpdC50cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IGl0LnRleHQoKTtcbiAgICAgIGNvbnN0IHNlcGFyYXRvciA9IGl0LnRyeUNvbnN1bWUoXCI7XCIpICYmIGl0LnRleHQoKTtcblxuICAgICAgaXQuY29uc3VtZShcIn1cIik7XG5cbiAgICAgIGNvbnN0IG1vZGlmaWVyID0gaXQubW9kaWZpZXIoKTtcblxuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lIHx8IChwYXR0ZXJuID8gU3RyaW5nKGtleSsrKSA6IFwiXCIpLFxuICAgICAgICBwcmVmaXg6IGVuY29kZVBhdGgocHJlZml4KSxcbiAgICAgICAgc3VmZml4OiBlbmNvZGVQYXRoKHN1ZmZpeCksXG4gICAgICAgIHBhdHRlcm4sXG4gICAgICAgIG1vZGlmaWVyLFxuICAgICAgICBzZXBhcmF0b3IsXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGl0LmNvbnN1bWUoXCJFTkRcIik7XG4gICAgYnJlYWs7XG4gIH0gd2hpbGUgKHRydWUpO1xuXG4gIHJldHVybiBuZXcgVG9rZW5EYXRhKHRva2VucywgZGVsaW1pdGVyKTtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgUGFyYW1EYXRhID0gUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgcmV0dXJuIGNvbXBpbGVUb2tlbnM8UD4oZGF0YSwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IFBhcnRpYWw8UmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10+PjtcbmV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChkYXRhPzogUCkgPT4gc3RyaW5nO1xuXG4vKipcbiAqIENvbnZlcnQgYSBzaW5nbGUgdG9rZW4gaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRva2VuVG9GdW5jdGlvbihcbiAgdG9rZW46IFRva2VuLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogKGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiAoKSA9PiB0b2tlbjtcbiAgfVxuXG4gIGNvbnN0IGVuY29kZVZhbHVlID0gZW5jb2RlIHx8IE5PT1BfVkFMVUU7XG4gIGNvbnN0IHJlcGVhdGVkID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIjtcbiAgY29uc3Qgb3B0aW9uYWwgPSB0b2tlbi5tb2RpZmllciA9PT0gXCI/XCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiO1xuICBjb25zdCB7IHByZWZpeCA9IFwiXCIsIHN1ZmZpeCA9IFwiXCIsIHNlcGFyYXRvciA9IHN1ZmZpeCArIHByZWZpeCB9ID0gdG9rZW47XG5cbiAgaWYgKGVuY29kZSAmJiByZXBlYXRlZCkge1xuICAgIGNvbnN0IHN0cmluZ2lmeSA9ICh2YWx1ZTogc3RyaW5nLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2luZGV4fVwiIHRvIGJlIGEgc3RyaW5nYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW5jb2RlVmFsdWUodmFsdWUpO1xuICAgIH07XG5cbiAgICBjb25zdCBjb21waWxlID0gKHZhbHVlOiB1bmtub3duKSA9PiB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGFuIGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHJldHVybiBcIlwiO1xuXG4gICAgICByZXR1cm4gcHJlZml4ICsgdmFsdWUubWFwKHN0cmluZ2lmeSkuam9pbihzZXBhcmF0b3IpICsgc3VmZml4O1xuICAgIH07XG5cbiAgICBpZiAob3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgICAgICByZXR1cm4gdmFsdWUubGVuZ3RoID8gY29tcGlsZSh2YWx1ZSkgOiBcIlwiO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gKGRhdGEpOiBzdHJpbmcgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgcmV0dXJuIGNvbXBpbGUodmFsdWUpO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBzdHJpbmdpZnkgPSAodmFsdWU6IHVua25vd24pID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICByZXR1cm4gcHJlZml4ICsgZW5jb2RlVmFsdWUodmFsdWUpICsgc3VmZml4O1xuICB9O1xuXG4gIGlmIChvcHRpb25hbCkge1xuICAgIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgICByZXR1cm4gc3RyaW5naWZ5KHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgcmV0dXJuIHN0cmluZ2lmeSh2YWx1ZSk7XG4gIH07XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIHRva2VucyBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY29tcGlsZVRva2VuczxQIGV4dGVuZHMgUGFyYW1EYXRhPihcbiAgZGF0YTogVG9rZW5EYXRhLFxuICBvcHRpb25zOiBDb21waWxlT3B0aW9ucyxcbik6IFBhdGhGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHtcbiAgICBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsXG4gICAgbG9vc2UgPSB0cnVlLFxuICAgIHZhbGlkYXRlID0gdHJ1ZSxcbiAgICBzdHJpY3QgPSBmYWxzZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGZsYWdzID0gdG9GbGFncyhvcHRpb25zKTtcbiAgY29uc3Qgc3RyaW5naWZ5ID0gdG9TdHJpbmdpZnkobG9vc2UsIGRhdGEuZGVsaW1pdGVyKTtcbiAgY29uc3Qgc291cmNlcyA9IHRvUmVnRXhwU291cmNlKGRhdGEsIHN0cmluZ2lmeSwgW10sIGZsYWdzLCBzdHJpY3QpO1xuXG4gIC8vIENvbXBpbGUgYWxsIHRoZSB0b2tlbnMgaW50byByZWdleHBzLlxuICBjb25zdCBlbmNvZGVyczogQXJyYXk8KGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nPiA9IGRhdGEudG9rZW5zLm1hcChcbiAgICAodG9rZW4sIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCBmbiA9IHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZW5jb2RlKTtcbiAgICAgIGlmICghdmFsaWRhdGUgfHwgdHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSByZXR1cm4gZm47XG5cbiAgICAgIGNvbnN0IHZhbGlkUmUgPSBuZXcgUmVnRXhwKGBeJHtzb3VyY2VzW2luZGV4XX0kYCwgZmxhZ3MpO1xuXG4gICAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBmbihkYXRhKTtcbiAgICAgICAgaWYgKCF2YWxpZFJlLnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIGBJbnZhbGlkIHZhbHVlIGZvciBcIiR7dG9rZW4ubmFtZX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH07XG4gICAgfSxcbiAgKTtcblxuICByZXR1cm4gZnVuY3Rpb24gcGF0aChkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge30pIHtcbiAgICBsZXQgcGF0aCA9IFwiXCI7XG4gICAgZm9yIChjb25zdCBlbmNvZGVyIG9mIGVuY29kZXJzKSBwYXRoICs9IGVuY29kZXIoZGF0YSk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiB7XG4gIHBhdGg6IHN0cmluZztcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAocGF0aDogc3RyaW5nKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBDcmVhdGUgcGF0aCBtYXRjaCBmdW5jdGlvbiBmcm9tIGBwYXRoLXRvLXJlZ2V4cGAgc3BlYy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgbG9vc2UgPSB0cnVlIH0gPSBvcHRpb25zO1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3Qgc3RyaW5naWZ5ID0gdG9TdHJpbmdpZnkobG9vc2UsIGRhdGEuZGVsaW1pdGVyKTtcbiAgY29uc3Qga2V5czogS2V5W10gPSBbXTtcbiAgY29uc3QgcmUgPSB0b2tlbnNUb1JlZ2V4cChkYXRhLCBrZXlzLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlICYmIChrZXkubW9kaWZpZXIgPT09IFwiK1wiIHx8IGtleS5tb2RpZmllciA9PT0gXCIqXCIpKSB7XG4gICAgICBjb25zdCB7IHByZWZpeCA9IFwiXCIsIHN1ZmZpeCA9IFwiXCIsIHNlcGFyYXRvciA9IHN1ZmZpeCArIHByZWZpeCB9ID0ga2V5O1xuICAgICAgY29uc3QgcmUgPSBuZXcgUmVnRXhwKHN0cmluZ2lmeShzZXBhcmF0b3IpLCBcImdcIik7XG4gICAgICByZXR1cm4gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnNwbGl0KHJlKS5tYXAoZGVjb2RlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb2RlIHx8IE5PT1BfVkFMVUU7XG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiBtYXRjaChpbnB1dDogc3RyaW5nKSB7XG4gICAgY29uc3QgbSA9IHJlLmV4ZWMoaW5wdXQpO1xuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgeyAwOiBwYXRoLCBpbmRleCB9ID0gbTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG4gICAgICBjb25zdCBkZWNvZGVyID0gZGVjb2RlcnNbaSAtIDFdO1xuICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZXIobVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgaW5kZXgsIHBhcmFtcyB9O1xuICB9O1xufVxuXG4vKipcbiAqIEVzY2FwZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZShzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbLisqP14ke30oKVtcXF18L1xcXFxdKS9nLCBcIlxcXFwkMVwiKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYW5kIHJlcGVhdCBsb29zZSBjaGFyYWN0ZXJzIGZvciByZWd1bGFyIGV4cHJlc3Npb25zLlxuICovXG5mdW5jdGlvbiBsb29zZVJlcGxhY2VyKHZhbHVlOiBzdHJpbmcsIGxvb3NlOiBzdHJpbmcpIHtcbiAgY29uc3QgZXNjYXBlZCA9IGVzY2FwZSh2YWx1ZSk7XG4gIHJldHVybiBsb29zZSA/IGAoPzoke2VzY2FwZWR9KSsoPyEke2VzY2FwZWR9KWAgOiBlc2NhcGVkO1xufVxuXG4vKipcbiAqIEVuY29kZSBhbGwgbm9uLWRlbGltaXRlciBjaGFyYWN0ZXJzIHVzaW5nIHRoZSBlbmNvZGUgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5naWZ5KGxvb3NlOiBib29sZWFuLCBkZWxpbWl0ZXI6IHN0cmluZykge1xuICBpZiAoIWxvb3NlKSByZXR1cm4gZXNjYXBlO1xuXG4gIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgKD86KD8hJHtlc2NhcGUoZGVsaW1pdGVyKX0pLikrfCguKWAsIFwiZ1wiKTtcbiAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5yZXBsYWNlKHJlLCBsb29zZVJlcGxhY2VyKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZsYWdzIGZvciBhIHJlZ2V4cCBmcm9tIHRoZSBvcHRpb25zLlxuICovXG5mdW5jdGlvbiB0b0ZsYWdzKG9wdGlvbnM6IHsgc2Vuc2l0aXZlPzogYm9vbGVhbiB9KSB7XG4gIHJldHVybiBvcHRpb25zLnNlbnNpdGl2ZSA/IFwiXCIgOiBcImlcIjtcbn1cblxuLyoqXG4gKiBBIGtleSBpcyBhIGNhcHR1cmUgZ3JvdXAgaW4gdGhlIHJlZ2V4LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEtleSB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHJlZml4Pzogc3RyaW5nO1xuICBzdWZmaXg/OiBzdHJpbmc7XG4gIHBhdHRlcm4/OiBzdHJpbmc7XG4gIG1vZGlmaWVyPzogc3RyaW5nO1xuICBzZXBhcmF0b3I/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0b2tlbiBpcyBhIHN0cmluZyAobm90aGluZyBzcGVjaWFsKSBvciBrZXkgbWV0YWRhdGEgKGNhcHR1cmUgZ3JvdXApLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IHN0cmluZyB8IEtleTtcblxuLyoqXG4gKiBFeHBvc2UgYSBmdW5jdGlvbiBmb3IgdGFraW5nIHRva2VucyBhbmQgcmV0dXJuaW5nIGEgUmVnRXhwLlxuICovXG5mdW5jdGlvbiB0b2tlbnNUb1JlZ2V4cChcbiAgZGF0YTogVG9rZW5EYXRhLFxuICBrZXlzOiBLZXlbXSxcbiAgb3B0aW9uczogUGF0aFRvUmVnZXhwT3B0aW9ucyxcbik6IFJlZ0V4cCB7XG4gIGNvbnN0IHtcbiAgICB0cmFpbGluZyA9IHRydWUsXG4gICAgbG9vc2UgPSB0cnVlLFxuICAgIHN0YXJ0ID0gdHJ1ZSxcbiAgICBlbmQgPSB0cnVlLFxuICAgIHN0cmljdCA9IGZhbHNlLFxuICB9ID0gb3B0aW9ucztcbiAgY29uc3QgZmxhZ3MgPSB0b0ZsYWdzKG9wdGlvbnMpO1xuICBjb25zdCBzdHJpbmdpZnkgPSB0b1N0cmluZ2lmeShsb29zZSwgZGF0YS5kZWxpbWl0ZXIpO1xuICBjb25zdCBzb3VyY2VzID0gdG9SZWdFeHBTb3VyY2UoZGF0YSwgc3RyaW5naWZ5LCBrZXlzLCBmbGFncywgc3RyaWN0KTtcbiAgbGV0IHBhdHRlcm4gPSBzdGFydCA/IFwiXlwiIDogXCJcIjtcbiAgcGF0dGVybiArPSBzb3VyY2VzLmpvaW4oXCJcIik7XG4gIGlmICh0cmFpbGluZykgcGF0dGVybiArPSBgKD86JHtzdHJpbmdpZnkoZGF0YS5kZWxpbWl0ZXIpfSk/YDtcbiAgcGF0dGVybiArPSBlbmQgPyBcIiRcIiA6IGAoPz0ke2VzY2FwZShkYXRhLmRlbGltaXRlcil9fCQpYDtcblxuICByZXR1cm4gbmV3IFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHRva2VuIGludG8gYSByZWdleHAgc3RyaW5nIChyZS11c2VkIGZvciBwYXRoIHZhbGlkYXRpb24pLlxuICovXG5mdW5jdGlvbiB0b1JlZ0V4cFNvdXJjZShcbiAgZGF0YTogVG9rZW5EYXRhLFxuICBzdHJpbmdpZnk6IEVuY29kZSxcbiAga2V5czogS2V5W10sXG4gIGZsYWdzOiBzdHJpbmcsXG4gIHN0cmljdDogYm9vbGVhbixcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgZGVmYXVsdFBhdHRlcm4gPSBgKD86KD8hJHtlc2NhcGUoZGF0YS5kZWxpbWl0ZXIpfSkuKSs/YDtcbiAgbGV0IGJhY2t0cmFjayA9IFwiXCI7XG4gIGxldCBzYWZlID0gdHJ1ZTtcblxuICByZXR1cm4gZGF0YS50b2tlbnMubWFwKCh0b2tlbiwgaW5kZXgpID0+IHtcbiAgICBpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBiYWNrdHJhY2sgPSB0b2tlbjtcbiAgICAgIHJldHVybiBzdHJpbmdpZnkodG9rZW4pO1xuICAgIH1cblxuICAgIGNvbnN0IHtcbiAgICAgIHByZWZpeCA9IFwiXCIsXG4gICAgICBzdWZmaXggPSBcIlwiLFxuICAgICAgc2VwYXJhdG9yID0gc3VmZml4ICsgcHJlZml4LFxuICAgICAgbW9kaWZpZXIgPSBcIlwiLFxuICAgIH0gPSB0b2tlbjtcblxuICAgIGNvbnN0IHByZSA9IHN0cmluZ2lmeShwcmVmaXgpO1xuICAgIGNvbnN0IHBvc3QgPSBzdHJpbmdpZnkoc3VmZml4KTtcblxuICAgIGlmICh0b2tlbi5uYW1lKSB7XG4gICAgICBjb25zdCBwYXR0ZXJuID0gdG9rZW4ucGF0dGVybiA/IGAoPzoke3Rva2VuLnBhdHRlcm59KWAgOiBkZWZhdWx0UGF0dGVybjtcbiAgICAgIGNvbnN0IHJlID0gY2hlY2tQYXR0ZXJuKHBhdHRlcm4sIHRva2VuLm5hbWUsIGZsYWdzKTtcblxuICAgICAgc2FmZSB8fD0gc2FmZVBhdHRlcm4ocmUsIHByZWZpeCB8fCBiYWNrdHJhY2spO1xuICAgICAgaWYgKCFzYWZlKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgYEFtYmlndW91cyBwYXR0ZXJuIGZvciBcIiR7dG9rZW4ubmFtZX1cIjogJHtERUJVR19VUkx9YCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHNhZmUgPSAhc3RyaWN0IHx8IHNhZmVQYXR0ZXJuKHJlLCBzdWZmaXgpO1xuICAgICAgYmFja3RyYWNrID0gXCJcIjtcblxuICAgICAga2V5cy5wdXNoKHRva2VuKTtcblxuICAgICAgaWYgKG1vZGlmaWVyID09PSBcIitcIiB8fCBtb2RpZmllciA9PT0gXCIqXCIpIHtcbiAgICAgICAgY29uc3QgbW9kID0gbW9kaWZpZXIgPT09IFwiKlwiID8gXCI/XCIgOiBcIlwiO1xuICAgICAgICBjb25zdCBzZXAgPSBzdHJpbmdpZnkoc2VwYXJhdG9yKTtcblxuICAgICAgICBpZiAoIXNlcCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBgTWlzc2luZyBzZXBhcmF0b3IgZm9yIFwiJHt0b2tlbi5uYW1lfVwiOiAke0RFQlVHX1VSTH1gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBzYWZlIHx8PSAhc3RyaWN0IHx8IHNhZmVQYXR0ZXJuKHJlLCBzZXBhcmF0b3IpO1xuICAgICAgICBpZiAoIXNhZmUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYEFtYmlndW91cyBwYXR0ZXJuIGZvciBcIiR7dG9rZW4ubmFtZX1cIiBzZXBhcmF0b3I6ICR7REVCVUdfVVJMfWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBzYWZlID0gIXN0cmljdDtcblxuICAgICAgICByZXR1cm4gYCg/OiR7cHJlfSgke3BhdHRlcm59KD86JHtzZXB9JHtwYXR0ZXJufSkqKSR7cG9zdH0pJHttb2R9YDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGAoPzoke3ByZX0oJHtwYXR0ZXJufSkke3Bvc3R9KSR7bW9kaWZpZXJ9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gYCg/OiR7cHJlfSR7cG9zdH0pJHttb2RpZmllcn1gO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY2hlY2tQYXR0ZXJuKHBhdHRlcm46IHN0cmluZywgbmFtZTogc3RyaW5nLCBmbGFnczogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4ke3BhdHRlcm59JGAsIGZsYWdzKTtcbiAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBJbnZhbGlkIHBhdHRlcm4gZm9yIFwiJHtuYW1lfVwiOiAke2Vyci5tZXNzYWdlfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhZmVQYXR0ZXJuKHJlOiBSZWdFeHAsIHZhbHVlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHZhbHVlID8gIXJlLnRlc3QodmFsdWUpIDogZmFsc2U7XG59XG5cbi8qKlxuICogUmVwZWF0ZWQgYW5kIHNpbXBsZSBpbnB1dCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGdpdmVuIHBhdGggc3RyaW5nLCByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKlxuICogQW4gZW1wdHkgYXJyYXkgY2FuIGJlIHBhc3NlZCBpbiBmb3IgdGhlIGtleXMsIHdoaWNoIHdpbGwgaG9sZCB0aGVcbiAqIHBsYWNlaG9sZGVyIGtleSBkZXNjcmlwdGlvbnMuIEZvciBleGFtcGxlLCB1c2luZyBgL3VzZXIvOmlkYCwgYGtleXNgIHdpbGxcbiAqIGNvbnRhaW4gYFt7IG5hbWU6ICdpZCcsIGRlbGltaXRlcjogJy8nLCBvcHRpb25hbDogZmFsc2UsIHJlcGVhdDogZmFsc2UgfV1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUmVnZXhwKHBhdGg6IFBhdGgsIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3Qga2V5czogS2V5W10gPSBbXTtcbiAgY29uc3QgcmVnZXhwID0gdG9rZW5zVG9SZWdleHAoZGF0YSwga2V5cywgb3B0aW9ucyk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKHJlZ2V4cCwgeyBrZXlzIH0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgRW5jb2RlIGFzIHAyckVuY29kZSxcbiAgICBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIFBhcnNlT3B0aW9ucyBhcyBwMnJQYXJzZU9wdGlvbnMsXG4gICAgUGF0aFRvUmVnZXhwT3B0aW9ucyBhcyBwMnJQYXRoVG9SZWdleHBPcHRpb25zLFxuICAgIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgQ29tcGlsZU9wdGlvbnMgYXMgcDJyQ29tcGlsZU9wdGlvbnMsXG4gICAgVG9rZW5EYXRhIGFzIHAyclRva2VuRGF0YSxcbiAgICBQYXJhbURhdGEgYXMgcDJyUGFyYW1EYXRhLFxuICAgIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIEtleSBhcyBwMnJLZXksXG4gICAgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgUGF0aCBhcyBwMnJQYXRoLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBFbmNvZGUgPSBwMnJFbmNvZGU7XG4gICAgZXhwb3J0IHR5cGUgRGVjb2RlID0gcDJyRGVjb2RlO1xuICAgIGV4cG9ydCB0eXBlIFBhcnNlT3B0aW9ucyA9IHAyclBhcnNlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zID0gcDJyUGF0aFRvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaE9wdGlvbnMgPSBwMnJNYXRjaE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgQ29tcGlsZU9wdGlvbnMgPSBwMnJDb21waWxlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUb2tlbkRhdGEgPSBwMnJUb2tlbkRhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gcDJyUGFyYW1EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyclBhdGhGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoUmVzdWx0PFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2g8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgUGF0aCA9IHAyclBhdGg7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgcGF0aFRvUmVnZXhwLFxufTtcblxuZXhwb3J0IHsgcGF0aDJyZWdleHAgfTtcbiJdLCJuYW1lcyI6WyJwYXJzZSIsImNvbXBpbGUiLCJtYXRjaCIsInBhdGhUb1JlZ2V4cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnUUEsQ0FxRUMsSUFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBLENBQUE7SUFLRCxDQU1DLElBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0lBNElELENBcUNDLElBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0lBOEtELENBS0MsSUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7S0FwckJELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO0lBQzlCLENBQUEsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEtBQUssS0FBSyxDQUFDO0tBQzVDLE1BQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDO0tBQ3RDLE1BQU0sU0FBUyxHQUFHLG1DQUFtQyxDQUFDO0lBMEd0RCxDQUFBLE1BQU0sYUFBYSxHQUE4QjtTQUMvQyxHQUFHLEVBQUUsR0FBRztTQUNSLEdBQUcsRUFBRSxHQUFHO1NBQ1IsR0FBRyxFQUFFLEdBQUc7U0FDUixHQUFHLEVBQUUsR0FBRztTQUNSLEdBQUcsRUFBRSxHQUFHO1NBQ1IsR0FBRyxFQUFFLEdBQUc7U0FDUixHQUFHLEVBQUUsR0FBRztTQUNSLEdBQUcsRUFBRSxHQUFHO1NBQ1IsR0FBRyxFQUFFLEdBQUc7TUFDVCxDQUFDO0lBRUY7O0lBRUc7S0FDSCxTQUFTLEtBQUssQ0FBQyxHQUFXLEVBQUE7SUFDeEIsS0FBQSxNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7U0FDdkIsTUFBTSxNQUFNLEdBQWUsRUFBRSxDQUFDO1NBQzlCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVWLEtBQUEsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtJQUN2QixTQUFBLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QixTQUFBLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUVsQyxJQUFJLElBQUksRUFBRTtJQUNSLGFBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztpQkFDekMsU0FBUztjQUNWO0lBRUQsU0FBQSxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7aUJBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUNoRSxTQUFTO2NBQ1Y7SUFFRCxTQUFBLElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRTtpQkFDakIsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO2lCQUVkLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQy9CLGlCQUFBLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7a0JBQ2xCO2lCQUVELElBQUksQ0FBQyxJQUFJLEVBQUU7cUJBQ1QsTUFBTSxJQUFJLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDO2tCQUN2RDtJQUVELGFBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztpQkFDckQsU0FBUztjQUNWO0lBRUQsU0FBQSxJQUFJLEtBQUssS0FBSyxHQUFHLEVBQUU7SUFDakIsYUFBQSxNQUFNLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztpQkFDaEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO2lCQUNkLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUVqQixhQUFBLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtxQkFDcEIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDO2tCQUM5RDtJQUVELGFBQUEsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtJQUN2QixpQkFBQSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7SUFDckIscUJBQUEsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3lCQUNuQyxTQUFTO3NCQUNWO0lBRUQsaUJBQUEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO3lCQUNwQixLQUFLLEVBQUUsQ0FBQztJQUNSLHFCQUFBLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTs2QkFDZixDQUFDLEVBQUUsQ0FBQzs2QkFDSixNQUFNOzBCQUNQO3NCQUNGO0lBQU0sc0JBQUEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO3lCQUMzQixLQUFLLEVBQUUsQ0FBQzt5QkFDUixJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFOzZCQUN4QixNQUFNLElBQUksU0FBUyxDQUFDLHVDQUF1QyxDQUFDLENBQUEsQ0FBRSxDQUFDLENBQUM7MEJBQ2pFO3NCQUNGO0lBRUQsaUJBQUEsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2tCQUN2QjtJQUVELGFBQUEsSUFBSSxLQUFLO3FCQUFFLE1BQU0sSUFBSSxTQUFTLENBQUMseUJBQXlCLEdBQUcsQ0FBQSxDQUFFLENBQUMsQ0FBQztpQkFDL0QsSUFBSSxDQUFDLE9BQU87cUJBQUUsTUFBTSxJQUFJLFNBQVMsQ0FBQyxzQkFBc0IsR0FBRyxDQUFBLENBQUUsQ0FBQyxDQUFDO0lBRS9ELGFBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztpQkFDM0QsU0FBUztjQUNWO2FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1VBQzVEO0lBRUQsS0FBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRWxELEtBQUEsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztNQUN6QjtJQUVELENBQUEsTUFBTSxJQUFJLENBQUE7U0FHUixXQUFBLENBQW9CLE1BQWtCLEVBQUE7YUFBbEIsSUFBTSxDQUFBLE1BQUEsR0FBTixNQUFNLENBQVk7YUFGdEMsSUFBSyxDQUFBLEtBQUEsR0FBRyxDQUFDLENBQUM7VUFFZ0M7U0FFMUMsSUFBSSxHQUFBO2FBQ0YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztVQUNoQztTQUVELFVBQVUsQ0FBQyxJQUFzQixFQUFBO0lBQy9CLFNBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzFCLFNBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUk7aUJBQUUsT0FBTzthQUNoQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7YUFDYixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUM7VUFDcEI7U0FFRCxPQUFPLENBQUMsSUFBc0IsRUFBQTthQUM1QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BDLElBQUksS0FBSyxLQUFLLFNBQVM7aUJBQUUsT0FBTyxLQUFLLENBQUM7SUFDdEMsU0FBQSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDOUMsTUFBTSxJQUFJLFNBQVMsQ0FDakIsQ0FBQSxXQUFBLEVBQWMsUUFBUSxDQUFBLElBQUEsRUFBTyxLQUFLLENBQUEsV0FBQSxFQUFjLElBQUksQ0FBQSxFQUFBLEVBQUssU0FBUyxDQUFBLENBQUUsQ0FDckUsQ0FBQztVQUNIO1NBRUQsSUFBSSxHQUFBO2FBQ0YsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO2FBQ2hCLElBQUksS0FBeUIsQ0FBQztJQUM5QixTQUFBLFFBQVEsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRztpQkFDdEUsTUFBTSxJQUFJLEtBQUssQ0FBQztjQUNqQjthQUNELE9BQU8sTUFBTSxDQUFDO1VBQ2Y7U0FFRCxRQUFRLEdBQUE7YUFDTixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1VBQzdFO01BQ0Y7SUFFRDs7SUFFRztJQUNILENBQUEsTUFBYSxTQUFTLENBQUE7U0FDcEIsV0FDa0IsQ0FBQSxNQUFlLEVBQ2YsU0FBaUIsRUFBQTthQURqQixJQUFNLENBQUEsTUFBQSxHQUFOLE1BQU0sQ0FBUzthQUNmLElBQVMsQ0FBQSxTQUFBLEdBQVQsU0FBUyxDQUFRO1VBQy9CO01BQ0w7SUFMRCxDQUtDLElBQUEsQ0FBQSxTQUFBLEdBQUEsU0FBQSxDQUFBO0lBRUQ7O0lBRUc7SUFDSCxDQUFBLFNBQWdCLEtBQUssQ0FBQyxHQUFXLEVBQUUsVUFBd0IsRUFBRSxFQUFBO0lBQzNELEtBQUEsTUFBTSxFQUFFLFVBQVUsR0FBRyxVQUFVLEVBQUUsU0FBUyxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEdBQzFFLE9BQU8sQ0FBQztTQUNWLE1BQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQztJQUMzQixLQUFBLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN0QixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFWixLQUFBLEdBQUc7SUFDRCxTQUFBLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixTQUFBLElBQUksSUFBSTtpQkFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBRXhDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDbkMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUV6QyxTQUFBLElBQUksSUFBSSxJQUFJLE9BQU8sRUFBRTtpQkFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQztxQkFDVixJQUFJLEVBQUUsSUFBSSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztxQkFDM0IsT0FBTztJQUNSLGNBQUEsQ0FBQyxDQUFDO0lBRUgsYUFBQSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdkIsYUFBQSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO3FCQUNyQixNQUFNLElBQUksU0FBUyxDQUNqQixDQUFtQixnQkFBQSxFQUFBLElBQUksQ0FBQyxLQUFLLENBQStDLDRDQUFBLEVBQUEsU0FBUyxDQUFFLENBQUEsQ0FDeEYsQ0FBQztrQkFDSDtpQkFFRCxTQUFTO2NBQ1Y7YUFFRCxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3BDLElBQUksUUFBUSxFQUFFO2lCQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDVixpQkFBQSxJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO3FCQUNuQixPQUFPLEVBQUUsQ0FBUyxNQUFBLEVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFNLElBQUEsQ0FBQTtxQkFDekMsUUFBUSxFQUFFLEdBQUc7cUJBQ2IsU0FBUyxFQUFFLFNBQVM7SUFDckIsY0FBQSxDQUFDLENBQUM7aUJBQ0gsU0FBUztjQUNWO2FBRUQsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQyxJQUFJLElBQUksRUFBRTtJQUNSLGFBQUEsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO2lCQUN6QixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNuQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pDLGFBQUEsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3pCLGFBQUEsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFbEQsYUFBQSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRWhCLGFBQUEsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO2lCQUUvQixNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ1YsaUJBQUEsSUFBSSxFQUFFLElBQUksS0FBSyxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzVDLGlCQUFBLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDO0lBQzFCLGlCQUFBLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDO3FCQUMxQixPQUFPO3FCQUNQLFFBQVE7cUJBQ1IsU0FBUztJQUNWLGNBQUEsQ0FBQyxDQUFDO2lCQUNILFNBQVM7Y0FDVjtJQUVELFNBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNsQixNQUFNO1VBQ1AsUUFBUSxJQUFJLEVBQUU7U0FFZixPQUFPLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztNQUN6QztJQUVEOztJQUVHO0lBQ0gsQ0FBQSxTQUFnQixPQUFPLENBQ3JCLElBQVUsRUFDVixVQUEwQixFQUFFLEVBQUE7SUFFNUIsS0FBQSxNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksU0FBUyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JFLEtBQUEsT0FBTyxhQUFhLENBQUksSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO01BQ3hDO0lBS0Q7O0lBRUc7SUFDSCxDQUFBLFNBQVMsZUFBZSxDQUN0QixLQUFZLEVBQ1osTUFBc0IsRUFBQTtJQUV0QixLQUFBLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO2FBQzdCLE9BQU8sTUFBTSxLQUFLLENBQUM7VUFDcEI7SUFFRCxLQUFBLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxVQUFVLENBQUM7SUFDekMsS0FBQSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLEdBQUcsQ0FBQztJQUNsRSxLQUFBLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssR0FBRyxDQUFDO0lBQ2xFLEtBQUEsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxTQUFTLEdBQUcsTUFBTSxHQUFHLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztJQUV4RSxLQUFBLElBQUksTUFBTSxJQUFJLFFBQVEsRUFBRTtJQUN0QixTQUFBLE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWEsS0FBSTtJQUNqRCxhQUFBLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO3FCQUM3QixNQUFNLElBQUksU0FBUyxDQUFDLENBQWEsVUFBQSxFQUFBLEtBQUssQ0FBQyxJQUFJLENBQUksQ0FBQSxFQUFBLEtBQUssQ0FBa0IsZ0JBQUEsQ0FBQSxDQUFDLENBQUM7a0JBQ3pFO0lBQ0QsYUFBQSxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QixVQUFDLENBQUM7SUFFRixTQUFBLE1BQU0sT0FBTyxHQUFHLENBQUMsS0FBYyxLQUFJO2lCQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtxQkFDekIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLFVBQUEsRUFBYSxLQUFLLENBQUMsSUFBSSxDQUFrQixnQkFBQSxDQUFBLENBQUMsQ0FBQztrQkFDaEU7SUFFRCxhQUFBLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO3FCQUFFLE9BQU8sRUFBRSxDQUFDO0lBRWxDLGFBQUEsT0FBTyxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDO0lBQ2hFLFVBQUMsQ0FBQzthQUVGLElBQUksUUFBUSxFQUFFO2lCQUNaLE9BQU8sQ0FBQyxJQUFJLEtBQVk7cUJBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQy9CLElBQUksS0FBSyxJQUFJLElBQUk7eUJBQUUsT0FBTyxFQUFFLENBQUM7cUJBQzdCLE9BQU8sS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzVDLGNBQUMsQ0FBQztjQUNIO2FBRUQsT0FBTyxDQUFDLElBQUksS0FBWTtpQkFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixhQUFBLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLFVBQUMsQ0FBQztVQUNIO0lBRUQsS0FBQSxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQWMsS0FBSTtJQUNuQyxTQUFBLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO2lCQUM3QixNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsVUFBQSxFQUFhLEtBQUssQ0FBQyxJQUFJLENBQWtCLGdCQUFBLENBQUEsQ0FBQyxDQUFDO2NBQ2hFO2FBQ0QsT0FBTyxNQUFNLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQztJQUM5QyxNQUFDLENBQUM7U0FFRixJQUFJLFFBQVEsRUFBRTthQUNaLE9BQU8sQ0FBQyxJQUFJLEtBQVk7aUJBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQy9CLElBQUksS0FBSyxJQUFJLElBQUk7cUJBQUUsT0FBTyxFQUFFLENBQUM7SUFDN0IsYUFBQSxPQUFPLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixVQUFDLENBQUM7VUFDSDtTQUVELE9BQU8sQ0FBQyxJQUFJLEtBQVk7YUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixTQUFBLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLE1BQUMsQ0FBQztNQUNIO0lBRUQ7O0lBRUc7SUFDSCxDQUFBLFNBQVMsYUFBYSxDQUNwQixJQUFlLEVBQ2YsT0FBdUIsRUFBQTtTQUV2QixNQUFNLEVBQ0osTUFBTSxHQUFHLGtCQUFrQixFQUMzQixLQUFLLEdBQUcsSUFBSSxFQUNaLFFBQVEsR0FBRyxJQUFJLEVBQ2YsTUFBTSxHQUFHLEtBQUssR0FDZixHQUFHLE9BQU8sQ0FBQztJQUNaLEtBQUEsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQy9CLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JELEtBQUEsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQzs7SUFHbkUsS0FBQSxNQUFNLFFBQVEsR0FBdUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2xFLENBQUMsS0FBSyxFQUFFLEtBQUssS0FBSTthQUNmLE1BQU0sRUFBRSxHQUFHLGVBQWUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUMsU0FBQSxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVE7aUJBQUUsT0FBTyxFQUFFLENBQUM7SUFFdEQsU0FBQSxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFJLENBQUEsRUFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQSxDQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFFekQsT0FBTyxDQUFDLElBQUksS0FBSTtJQUNkLGFBQUEsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtxQkFDeEIsTUFBTSxJQUFJLFNBQVMsQ0FDakIsQ0FBc0IsbUJBQUEsRUFBQSxLQUFLLENBQUMsSUFBSSxDQUFBLEdBQUEsRUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUUsQ0FDOUQsQ0FBQztrQkFDSDtpQkFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLFVBQUMsQ0FBQztJQUNKLE1BQUMsQ0FDRixDQUFDO0lBRUYsS0FBQSxPQUFPLFNBQVMsSUFBSSxDQUFDLElBQUEsR0FBNEIsRUFBRSxFQUFBO2FBQ2pELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQzthQUNkLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUTtJQUFFLGFBQUEsSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN0RCxPQUFPLElBQUksQ0FBQztJQUNkLE1BQUMsQ0FBQztNQUNIO0lBcUJEOztJQUVHO0lBQ0gsQ0FBQSxTQUFnQixLQUFLLENBQ25CLElBQVUsRUFDVixVQUF3QixFQUFFLEVBQUE7U0FFMUIsTUFBTSxFQUFFLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQzlELEtBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxZQUFZLFNBQVMsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNyRSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUNyRCxNQUFNLElBQUksR0FBVSxFQUFFLENBQUM7U0FDdkIsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FFL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSTtJQUNoQyxTQUFBLElBQUksTUFBTSxLQUFLLEdBQUcsQ0FBQyxRQUFRLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssR0FBRyxDQUFDLEVBQUU7SUFDNUQsYUFBQSxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLFNBQVMsR0FBRyxNQUFNLEdBQUcsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDO0lBQ3RFLGFBQUEsTUFBTSxFQUFFLEdBQUcsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pELGFBQUEsT0FBTyxDQUFDLEtBQWEsS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztjQUN2RDthQUVELE9BQU8sTUFBTSxJQUFJLFVBQVUsQ0FBQztJQUM5QixNQUFDLENBQUMsQ0FBQztTQUVILE9BQU8sU0FBUyxLQUFLLENBQUMsS0FBYSxFQUFBO2FBQ2pDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDekIsSUFBSSxDQUFDLENBQUM7aUJBQUUsT0FBTyxLQUFLLENBQUM7YUFFckIsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQzdCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbkMsU0FBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUNqQyxhQUFBLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVM7cUJBQUUsU0FBUztpQkFFakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztpQkFDeEIsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoQyxhQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQ2xDO2FBRUQsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDakMsTUFBQyxDQUFDO01BQ0g7SUFFRDs7SUFFRztLQUNILFNBQVMsTUFBTSxDQUFDLEdBQVcsRUFBQTtTQUN6QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxDQUFDLENBQUM7TUFDdEQ7SUFFRDs7SUFFRztJQUNILENBQUEsU0FBUyxhQUFhLENBQUMsS0FBYSxFQUFFLEtBQWEsRUFBQTtJQUNqRCxLQUFBLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QixLQUFBLE9BQU8sS0FBSyxHQUFHLENBQU0sR0FBQSxFQUFBLE9BQU8sQ0FBUSxLQUFBLEVBQUEsT0FBTyxDQUFHLENBQUEsQ0FBQSxHQUFHLE9BQU8sQ0FBQztNQUMxRDtJQUVEOztJQUVHO0lBQ0gsQ0FBQSxTQUFTLFdBQVcsQ0FBQyxLQUFjLEVBQUUsU0FBaUIsRUFBQTtTQUNwRCxJQUFJLENBQUMsS0FBSzthQUFFLE9BQU8sTUFBTSxDQUFDO0lBRTFCLEtBQUEsTUFBTSxFQUFFLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBUyxNQUFBLEVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBLFFBQUEsQ0FBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pFLEtBQUEsT0FBTyxDQUFDLEtBQWEsS0FBSyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztNQUM1RDtJQUVEOztJQUVHO0tBQ0gsU0FBUyxPQUFPLENBQUMsT0FBZ0MsRUFBQTtTQUMvQyxPQUFPLE9BQU8sQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQztNQUNyQztJQW1CRDs7SUFFRztJQUNILENBQUEsU0FBUyxjQUFjLENBQ3JCLElBQWUsRUFDZixJQUFXLEVBQ1gsT0FBNEIsRUFBQTtTQUU1QixNQUFNLEVBQ0osUUFBUSxHQUFHLElBQUksRUFDZixLQUFLLEdBQUcsSUFBSSxFQUNaLEtBQUssR0FBRyxJQUFJLEVBQ1osR0FBRyxHQUFHLElBQUksRUFDVixNQUFNLEdBQUcsS0FBSyxHQUNmLEdBQUcsT0FBTyxDQUFDO0lBQ1osS0FBQSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDL0IsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDckQsS0FBQSxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3JFLElBQUksT0FBTyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO1NBQy9CLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVCLEtBQUEsSUFBSSxRQUFRO2FBQUUsT0FBTyxJQUFJLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQSxFQUFBLENBQUksQ0FBQztJQUM3RCxLQUFBLE9BQU8sSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUEsR0FBQSxFQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztTQUV6RCxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztNQUNuQztJQUVEOztJQUVHO0tBQ0gsU0FBUyxjQUFjLENBQ3JCLElBQWUsRUFDZixTQUFpQixFQUNqQixJQUFXLEVBQ1gsS0FBYSxFQUNiLE1BQWUsRUFBQTtTQUVmLE1BQU0sY0FBYyxHQUFHLENBQUEsTUFBQSxFQUFTLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUEsS0FBQSxDQUFPLENBQUM7U0FDOUQsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO1NBQ25CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztTQUVoQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssS0FBSTtJQUN0QyxTQUFBLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO2lCQUM3QixTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLGFBQUEsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7Y0FDekI7YUFFRCxNQUFNLEVBQ0osTUFBTSxHQUFHLEVBQUUsRUFDWCxNQUFNLEdBQUcsRUFBRSxFQUNYLFNBQVMsR0FBRyxNQUFNLEdBQUcsTUFBTSxFQUMzQixRQUFRLEdBQUcsRUFBRSxHQUNkLEdBQUcsS0FBSyxDQUFDO0lBRVYsU0FBQSxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUIsU0FBQSxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFL0IsU0FBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7SUFDZCxhQUFBLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBTSxHQUFBLEVBQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQSxDQUFBLENBQUcsR0FBRyxjQUFjLENBQUM7SUFDeEUsYUFBQSxNQUFNLEVBQUUsR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBRXBELElBQUksS0FBSixJQUFJLEdBQUssV0FBVyxDQUFDLEVBQUUsRUFBRSxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQTtpQkFDOUMsSUFBSSxDQUFDLElBQUksRUFBRTtxQkFDVCxNQUFNLElBQUksU0FBUyxDQUNqQixDQUEwQix1QkFBQSxFQUFBLEtBQUssQ0FBQyxJQUFJLENBQU0sR0FBQSxFQUFBLFNBQVMsQ0FBRSxDQUFBLENBQ3RELENBQUM7a0JBQ0g7aUJBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7aUJBQzFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFFZixhQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBRWpCLElBQUksUUFBUSxLQUFLLEdBQUcsSUFBSSxRQUFRLEtBQUssR0FBRyxFQUFFO3FCQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDeEMsaUJBQUEsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUVqQyxJQUFJLENBQUMsR0FBRyxFQUFFO3lCQUNSLE1BQU0sSUFBSSxTQUFTLENBQ2pCLENBQTBCLHVCQUFBLEVBQUEsS0FBSyxDQUFDLElBQUksQ0FBTSxHQUFBLEVBQUEsU0FBUyxDQUFFLENBQUEsQ0FDdEQsQ0FBQztzQkFDSDtJQUVELGlCQUFBLElBQUksS0FBSixJQUFJLEdBQUssQ0FBQyxNQUFNLElBQUksV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFBO3FCQUMvQyxJQUFJLENBQUMsSUFBSSxFQUFFO3lCQUNULE1BQU0sSUFBSSxTQUFTLENBQ2pCLENBQTBCLHVCQUFBLEVBQUEsS0FBSyxDQUFDLElBQUksQ0FBZ0IsYUFBQSxFQUFBLFNBQVMsQ0FBRSxDQUFBLENBQ2hFLENBQUM7c0JBQ0g7cUJBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDO3FCQUVmLE9BQU8sQ0FBTSxHQUFBLEVBQUEsR0FBRyxDQUFJLENBQUEsRUFBQSxPQUFPLENBQU0sR0FBQSxFQUFBLEdBQUcsQ0FBRyxFQUFBLE9BQU8sQ0FBTSxHQUFBLEVBQUEsSUFBSSxDQUFJLENBQUEsRUFBQSxHQUFHLEVBQUUsQ0FBQztrQkFDbkU7aUJBRUQsT0FBTyxDQUFBLEdBQUEsRUFBTSxHQUFHLENBQUksQ0FBQSxFQUFBLE9BQU8sSUFBSSxJQUFJLENBQUEsQ0FBQSxFQUFJLFFBQVEsQ0FBQSxDQUFFLENBQUM7Y0FDbkQ7SUFFRCxTQUFBLE9BQU8sTUFBTSxHQUFHLENBQUEsRUFBRyxJQUFJLENBQUksQ0FBQSxFQUFBLFFBQVEsRUFBRSxDQUFDO0lBQ3hDLE1BQUMsQ0FBQyxDQUFDO01BQ0o7SUFFRCxDQUFBLFNBQVMsWUFBWSxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFBO0lBQ2hFLEtBQUEsSUFBSTthQUNGLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQSxDQUFBLEVBQUksT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLEtBQUssQ0FBQyxDQUFDO1VBQzFDO1NBQUMsT0FBTyxHQUFRLEVBQUU7YUFDakIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUF3QixxQkFBQSxFQUFBLElBQUksQ0FBTSxHQUFBLEVBQUEsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFBLENBQUMsQ0FBQztVQUN0RTtNQUNGO0lBRUQsQ0FBQSxTQUFTLFdBQVcsQ0FBQyxFQUFVLEVBQUUsS0FBYSxFQUFBO0lBQzVDLEtBQUEsT0FBTyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztNQUN4QztJQU9EOzs7Ozs7SUFNRztJQUNILENBQUEsU0FBZ0IsWUFBWSxDQUFDLElBQVUsRUFBRSxVQUErQixFQUFFLEVBQUE7SUFDeEUsS0FBQSxNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksU0FBUyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3JFLE1BQU0sSUFBSSxHQUFVLEVBQUUsQ0FBQztTQUN2QixNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNuRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztNQUN4Qzs7Ozs7OztJQ3ByQkQ7O0lBRUc7QUEwQ0gsVUFBTSxXQUFXLEdBQUc7ZUFDaEJBLGlCQUFLO2lCQUNMQyxtQkFBTztlQUNQQyxpQkFBSztzQkFDTEMsd0JBQVk7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cC8ifQ==