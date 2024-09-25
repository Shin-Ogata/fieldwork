/*!
 * @cdp/extension-path2regexp 0.9.18
 *   extension for conversion path to regexp library
 */

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

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9DSEFSID0gL15cXHB7WElEX0NvbnRpbnVlfSQvdTtcbmNvbnN0IERFQlVHX1VSTCA9IFwiaHR0cHM6Ly9naXQubmV3L3BhdGhUb1JlZ2V4cEVycm9yXCI7XG5cbi8qKlxuICogRW5jb2RlIGEgc3RyaW5nIGludG8gYW5vdGhlciBzdHJpbmcuXG4gKi9cbmV4cG9ydCB0eXBlIEVuY29kZSA9ICh2YWx1ZTogc3RyaW5nKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogRGVjb2RlIGEgc3RyaW5nIGludG8gYW5vdGhlciBzdHJpbmcuXG4gKi9cbmV4cG9ydCB0eXBlIERlY29kZSA9ICh2YWx1ZTogc3RyaW5nKSA9PiBzdHJpbmc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VPcHRpb25zIHtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MuXG4gICAqL1xuICBlbmNvZGVQYXRoPzogRW5jb2RlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgZXh0ZW5kcyBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogUmVnZXhwIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBkZWxpbWl0ZXIgdG8gYmUgYXJiaXRyYXJpbHkgcmVwZWF0ZWQuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBsb29zZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBWZXJpZnkgcGF0dGVybnMgYXJlIHZhbGlkIGFuZCBzYWZlIHRvIHVzZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzdHJpY3Q/OiBib29sZWFuO1xuICAvKipcbiAgICogTWF0Y2ggZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmcuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBzdGFydD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCB0byB0aGUgZW5kIG9mIHRoZSBzdHJpbmcuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3cgb3B0aW9uYWwgdHJhaWxpbmcgZGVsaW1pdGVyIHRvIG1hdGNoLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgdHJhaWxpbmc/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoT3B0aW9ucyBleHRlbmRzIFBhdGhUb1JlZ2V4cE9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGRlY29kaW5nIHN0cmluZ3MgZm9yIHBhcmFtcywgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGRlY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBkZWNvZGU/OiBEZWNvZGUgfCBmYWxzZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlT3B0aW9ucyBleHRlbmRzIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBSZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3cgdGhlIGRlbGltaXRlciB0byBiZSBhcmJpdHJhcmlseSByZXBlYXRlZC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGxvb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFZlcmlmeSBwYXR0ZXJucyBhcmUgdmFsaWQgYW5kIHNhZmUgdG8gdXNlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHN0cmljdD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBWZXJpZmllcyB0aGUgZnVuY3Rpb24gaXMgcHJvZHVjaW5nIGEgdmFsaWQgcGF0aC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHZhbGlkYXRlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQgaW50byB0aGUgcGF0aCwgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGVuY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBlbmNvZGU/OiBFbmNvZGUgfCBmYWxzZTtcbn1cblxudHlwZSBUb2tlblR5cGUgPVxuICB8IFwie1wiXG4gIHwgXCJ9XCJcbiAgfCBcIjtcIlxuICB8IFwiKlwiXG4gIHwgXCIrXCJcbiAgfCBcIj9cIlxuICB8IFwiTkFNRVwiXG4gIHwgXCJQQVRURVJOXCJcbiAgfCBcIkNIQVJcIlxuICB8IFwiRVNDQVBFRFwiXG4gIHwgXCJFTkRcIlxuICAvLyBSZXNlcnZlZCBmb3IgdXNlLlxuICB8IFwiIVwiXG4gIHwgXCJAXCJcbiAgfCBcIixcIjtcblxuLyoqXG4gKiBUb2tlbml6ZXIgcmVzdWx0cy5cbiAqL1xuaW50ZXJmYWNlIExleFRva2VuIHtcbiAgdHlwZTogVG9rZW5UeXBlO1xuICBpbmRleDogbnVtYmVyO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG5jb25zdCBTSU1QTEVfVE9LRU5TOiBSZWNvcmQ8c3RyaW5nLCBUb2tlblR5cGU+ID0ge1xuICBcIiFcIjogXCIhXCIsXG4gIFwiQFwiOiBcIkBcIixcbiAgXCI7XCI6IFwiO1wiLFxuICBcIixcIjogXCIsXCIsXG4gIFwiKlwiOiBcIipcIixcbiAgXCIrXCI6IFwiK1wiLFxuICBcIj9cIjogXCI/XCIsXG4gIFwie1wiOiBcIntcIixcbiAgXCJ9XCI6IFwifVwiLFxufTtcblxuLyoqXG4gKiBUb2tlbml6ZSBpbnB1dCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGxleGVyKHN0cjogc3RyaW5nKSB7XG4gIGNvbnN0IGNoYXJzID0gWy4uLnN0cl07XG4gIGNvbnN0IHRva2VuczogTGV4VG9rZW5bXSA9IFtdO1xuICBsZXQgaSA9IDA7XG5cbiAgd2hpbGUgKGkgPCBjaGFycy5sZW5ndGgpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNoYXJzW2ldO1xuICAgIGNvbnN0IHR5cGUgPSBTSU1QTEVfVE9LRU5TW3ZhbHVlXTtcblxuICAgIGlmICh0eXBlKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGUsIGluZGV4OiBpKyssIHZhbHVlIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSBcIlxcXFxcIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVTQ0FQRURcIiwgaW5kZXg6IGkrKywgdmFsdWU6IGNoYXJzW2krK10gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IFwiOlwiKSB7XG4gICAgICBsZXQgbmFtZSA9IFwiXCI7XG5cbiAgICAgIHdoaWxlIChJRF9DSEFSLnRlc3QoY2hhcnNbKytpXSkpIHtcbiAgICAgICAgbmFtZSArPSBjaGFyc1tpXTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyIG5hbWUgYXQgJHtpfWApO1xuICAgICAgfVxuXG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiTkFNRVwiLCBpbmRleDogaSwgdmFsdWU6IG5hbWUgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IFwiKFwiKSB7XG4gICAgICBjb25zdCBwb3MgPSBpKys7XG4gICAgICBsZXQgY291bnQgPSAxO1xuICAgICAgbGV0IHBhdHRlcm4gPSBcIlwiO1xuXG4gICAgICBpZiAoY2hhcnNbaV0gPT09IFwiP1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFBhdHRlcm4gY2Fubm90IHN0YXJ0IHdpdGggXCI/XCIgYXQgJHtpfWApO1xuICAgICAgfVxuXG4gICAgICB3aGlsZSAoaSA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICBpZiAoY2hhcnNbaV0gPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgcGF0dGVybiArPSBjaGFyc1tpKytdICsgY2hhcnNbaSsrXTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFyc1tpXSA9PT0gXCIpXCIpIHtcbiAgICAgICAgICBjb3VudC0tO1xuICAgICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNoYXJzW2ldID09PSBcIihcIikge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgaWYgKGNoYXJzW2kgKyAxXSAhPT0gXCI/XCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYENhcHR1cmluZyBncm91cHMgYXJlIG5vdCBhbGxvd2VkIGF0ICR7aX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwYXR0ZXJuICs9IGNoYXJzW2krK107XG4gICAgICB9XG5cbiAgICAgIGlmIChjb3VudCkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5iYWxhbmNlZCBwYXR0ZXJuIGF0ICR7cG9zfWApO1xuICAgICAgaWYgKCFwYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhdHRlcm4gYXQgJHtwb3N9YCk7XG5cbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJQQVRURVJOXCIsIGluZGV4OiBpLCB2YWx1ZTogcGF0dGVybiB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJDSEFSXCIsIGluZGV4OiBpLCB2YWx1ZTogY2hhcnNbaSsrXSB9KTtcbiAgfVxuXG4gIHRva2Vucy5wdXNoKHsgdHlwZTogXCJFTkRcIiwgaW5kZXg6IGksIHZhbHVlOiBcIlwiIH0pO1xuXG4gIHJldHVybiBuZXcgSXRlcih0b2tlbnMpO1xufVxuXG5jbGFzcyBJdGVyIHtcbiAgaW5kZXggPSAwO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdG9rZW5zOiBMZXhUb2tlbltdKSB7fVxuXG4gIHBlZWsoKTogTGV4VG9rZW4ge1xuICAgIHJldHVybiB0aGlzLnRva2Vuc1t0aGlzLmluZGV4XTtcbiAgfVxuXG4gIHRyeUNvbnN1bWUodHlwZTogTGV4VG9rZW5bXCJ0eXBlXCJdKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB0b2tlbiA9IHRoaXMucGVlaygpO1xuICAgIGlmICh0b2tlbi50eXBlICE9PSB0eXBlKSByZXR1cm47XG4gICAgdGhpcy5pbmRleCsrO1xuICAgIHJldHVybiB0b2tlbi52YWx1ZTtcbiAgfVxuXG4gIGNvbnN1bWUodHlwZTogTGV4VG9rZW5bXCJ0eXBlXCJdKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMudHJ5Q29uc3VtZSh0eXBlKTtcbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHZhbHVlO1xuICAgIGNvbnN0IHsgdHlwZTogbmV4dFR5cGUsIGluZGV4IH0gPSB0aGlzLnBlZWsoKTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgYFVuZXhwZWN0ZWQgJHtuZXh0VHlwZX0gYXQgJHtpbmRleH0sIGV4cGVjdGVkICR7dHlwZX06ICR7REVCVUdfVVJMfWAsXG4gICAgKTtcbiAgfVxuXG4gIHRleHQoKTogc3RyaW5nIHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB3aGlsZSAoKHZhbHVlID0gdGhpcy50cnlDb25zdW1lKFwiQ0hBUlwiKSB8fCB0aGlzLnRyeUNvbnN1bWUoXCJFU0NBUEVEXCIpKSkge1xuICAgICAgcmVzdWx0ICs9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgbW9kaWZpZXIoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy50cnlDb25zdW1lKFwiP1wiKSB8fCB0aGlzLnRyeUNvbnN1bWUoXCIqXCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIitcIik7XG4gIH1cbn1cblxuLyoqXG4gKiBUb2tlbml6ZWQgcGF0aCBpbnN0YW5jZS4gQ2FuIHdlIHBhc3NlZCBhcm91bmQgaW5zdGVhZCBvZiBzdHJpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBUb2tlbkRhdGEge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgdG9rZW5zOiBUb2tlbltdLFxuICAgIHB1YmxpYyByZWFkb25seSBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgKSB7fVxufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cjogc3RyaW5nLCBvcHRpb25zOiBQYXJzZU9wdGlvbnMgPSB7fSk6IFRva2VuRGF0YSB7XG4gIGNvbnN0IHsgZW5jb2RlUGF0aCA9IE5PT1BfVkFMVUUsIGRlbGltaXRlciA9IGVuY29kZVBhdGgoREVGQVVMVF9ERUxJTUlURVIpIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IHRva2VuczogVG9rZW5bXSA9IFtdO1xuICBjb25zdCBpdCA9IGxleGVyKHN0cik7XG4gIGxldCBrZXkgPSAwO1xuXG4gIGRvIHtcbiAgICBjb25zdCBwYXRoID0gaXQudGV4dCgpO1xuICAgIGlmIChwYXRoKSB0b2tlbnMucHVzaChlbmNvZGVQYXRoKHBhdGgpKTtcblxuICAgIGNvbnN0IG5hbWUgPSBpdC50cnlDb25zdW1lKFwiTkFNRVwiKTtcbiAgICBjb25zdCBwYXR0ZXJuID0gaXQudHJ5Q29uc3VtZShcIlBBVFRFUk5cIik7XG5cbiAgICBpZiAobmFtZSB8fCBwYXR0ZXJuKSB7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIG5hbWU6IG5hbWUgfHwgU3RyaW5nKGtleSsrKSxcbiAgICAgICAgcGF0dGVybixcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBuZXh0ID0gaXQucGVlaygpO1xuICAgICAgaWYgKG5leHQudHlwZSA9PT0gXCIqXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBgVW5leHBlY3RlZCAqIGF0ICR7bmV4dC5pbmRleH0sIHlvdSBwcm9iYWJseSB3YW50IFxcYC8qXFxgIG9yIFxcYHsvOmZvb30qXFxgOiAke0RFQlVHX1VSTH1gLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBhc3RlcmlzayA9IGl0LnRyeUNvbnN1bWUoXCIqXCIpO1xuICAgIGlmIChhc3Rlcmlzaykge1xuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICBuYW1lOiBTdHJpbmcoa2V5KyspLFxuICAgICAgICBwYXR0ZXJuOiBgKD86KD8hJHtlc2NhcGUoZGVsaW1pdGVyKX0pLikqYCxcbiAgICAgICAgbW9kaWZpZXI6IFwiKlwiLFxuICAgICAgICBzZXBhcmF0b3I6IGRlbGltaXRlcixcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BlbiA9IGl0LnRyeUNvbnN1bWUoXCJ7XCIpO1xuICAgIGlmIChvcGVuKSB7XG4gICAgICBjb25zdCBwcmVmaXggPSBpdC50ZXh0KCk7XG4gICAgICBjb25zdCBuYW1lID0gaXQudHJ5Q29uc3VtZShcIk5BTUVcIik7XG4gICAgICBjb25zdCBwYXR0ZXJuID0gaXQudHJ5Q29uc3VtZShcIlBBVFRFUk5cIik7XG4gICAgICBjb25zdCBzdWZmaXggPSBpdC50ZXh0KCk7XG4gICAgICBjb25zdCBzZXBhcmF0b3IgPSBpdC50cnlDb25zdW1lKFwiO1wiKSAmJiBpdC50ZXh0KCk7XG5cbiAgICAgIGl0LmNvbnN1bWUoXCJ9XCIpO1xuXG4gICAgICBjb25zdCBtb2RpZmllciA9IGl0Lm1vZGlmaWVyKCk7XG5cbiAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCAocGF0dGVybiA/IFN0cmluZyhrZXkrKykgOiBcIlwiKSxcbiAgICAgICAgcHJlZml4OiBlbmNvZGVQYXRoKHByZWZpeCksXG4gICAgICAgIHN1ZmZpeDogZW5jb2RlUGF0aChzdWZmaXgpLFxuICAgICAgICBwYXR0ZXJuLFxuICAgICAgICBtb2RpZmllcixcbiAgICAgICAgc2VwYXJhdG9yLFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpdC5jb25zdW1lKFwiRU5EXCIpO1xuICAgIGJyZWFrO1xuICB9IHdoaWxlICh0cnVlKTtcblxuICByZXR1cm4gbmV3IFRva2VuRGF0YSh0b2tlbnMsIGRlbGltaXRlcik7XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIFBhcmFtRGF0YSA9IFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3QgZGF0YSA9IHBhdGggaW5zdGFuY2VvZiBUb2tlbkRhdGEgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gIHJldHVybiBjb21waWxlVG9rZW5zPFA+KGRhdGEsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgdHlwZSBQYXJhbURhdGEgPSBQYXJ0aWFsPFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdPj47XG5leHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAoZGF0YT86IFApID0+IHN0cmluZztcblxuLyoqXG4gKiBDb252ZXJ0IGEgc2luZ2xlIHRva2VuIGludG8gYSBwYXRoIGJ1aWxkaW5nIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlblRvRnVuY3Rpb24oXG4gIHRva2VuOiBUb2tlbixcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbik6IChkYXRhOiBQYXJhbURhdGEpID0+IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgdG9rZW4gPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gKCkgPT4gdG9rZW47XG4gIH1cblxuICBjb25zdCBlbmNvZGVWYWx1ZSA9IGVuY29kZSB8fCBOT09QX1ZBTFVFO1xuICBjb25zdCByZXBlYXRlZCA9IHRva2VuLm1vZGlmaWVyID09PSBcIitcIiB8fCB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCI7XG4gIGNvbnN0IG9wdGlvbmFsID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiP1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIjtcbiAgY29uc3QgeyBwcmVmaXggPSBcIlwiLCBzdWZmaXggPSBcIlwiLCBzZXBhcmF0b3IgPSBzdWZmaXggKyBwcmVmaXggfSA9IHRva2VuO1xuXG4gIGlmIChlbmNvZGUgJiYgcmVwZWF0ZWQpIHtcbiAgICBjb25zdCBzdHJpbmdpZnkgPSAodmFsdWU6IHN0cmluZywgaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX0vJHtpbmRleH1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGVuY29kZVZhbHVlKHZhbHVlKTtcbiAgICB9O1xuXG4gICAgY29uc3QgY29tcGlsZSA9ICh2YWx1ZTogdW5rbm93bikgPT4ge1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhbiBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSByZXR1cm4gXCJcIjtcblxuICAgICAgcmV0dXJuIHByZWZpeCArIHZhbHVlLm1hcChzdHJpbmdpZnkpLmpvaW4oc2VwYXJhdG9yKSArIHN1ZmZpeDtcbiAgICB9O1xuXG4gICAgaWYgKG9wdGlvbmFsKSB7XG4gICAgICByZXR1cm4gKGRhdGEpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmxlbmd0aCA/IGNvbXBpbGUodmFsdWUpIDogXCJcIjtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIChkYXRhKTogc3RyaW5nID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgIHJldHVybiBjb21waWxlKHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgY29uc3Qgc3RyaW5naWZ5ID0gKHZhbHVlOiB1bmtub3duKSA9PiB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgcmV0dXJuIHByZWZpeCArIGVuY29kZVZhbHVlKHZhbHVlKSArIHN1ZmZpeDtcbiAgfTtcblxuICBpZiAob3B0aW9uYWwpIHtcbiAgICByZXR1cm4gKGRhdGEpOiBzdHJpbmcgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgICAgcmV0dXJuIHN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgIHJldHVybiBzdHJpbmdpZnkodmFsdWUpO1xuICB9O1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSB0b2tlbnMgaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGVUb2tlbnM8UCBleHRlbmRzIFBhcmFtRGF0YT4oXG4gIGRhdGE6IFRva2VuRGF0YSxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMsXG4pOiBQYXRoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7XG4gICAgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50LFxuICAgIGxvb3NlID0gdHJ1ZSxcbiAgICB2YWxpZGF0ZSA9IHRydWUsXG4gICAgc3RyaWN0ID0gZmFsc2UsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBmbGFncyA9IHRvRmxhZ3Mob3B0aW9ucyk7XG4gIGNvbnN0IHN0cmluZ2lmeSA9IHRvU3RyaW5naWZ5KGxvb3NlLCBkYXRhLmRlbGltaXRlcik7XG4gIGNvbnN0IHNvdXJjZXMgPSB0b1JlZ0V4cFNvdXJjZShkYXRhLCBzdHJpbmdpZnksIFtdLCBmbGFncywgc3RyaWN0KTtcblxuICAvLyBDb21waWxlIGFsbCB0aGUgdG9rZW5zIGludG8gcmVnZXhwcy5cbiAgY29uc3QgZW5jb2RlcnM6IEFycmF5PChkYXRhOiBQYXJhbURhdGEpID0+IHN0cmluZz4gPSBkYXRhLnRva2Vucy5tYXAoXG4gICAgKHRva2VuLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgZm4gPSB0b2tlblRvRnVuY3Rpb24odG9rZW4sIGVuY29kZSk7XG4gICAgICBpZiAoIXZhbGlkYXRlIHx8IHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIGZuO1xuXG4gICAgICBjb25zdCB2YWxpZFJlID0gbmV3IFJlZ0V4cChgXiR7c291cmNlc1tpbmRleF19JGAsIGZsYWdzKTtcblxuICAgICAgcmV0dXJuIChkYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZm4oZGF0YSk7XG4gICAgICAgIGlmICghdmFsaWRSZS50ZXN0KHZhbHVlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBgSW52YWxpZCB2YWx1ZSBmb3IgXCIke3Rva2VuLm5hbWV9XCI6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9O1xuICAgIH0sXG4gICk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHBhdGgoZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9KSB7XG4gICAgbGV0IHBhdGggPSBcIlwiO1xuICAgIGZvciAoY29uc3QgZW5jb2RlciBvZiBlbmNvZGVycykgcGF0aCArPSBlbmNvZGVyKGRhdGEpO1xuICAgIHJldHVybiBwYXRoO1xuICB9O1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggcmVzdWx0IGNvbnRhaW5zIGRhdGEgYWJvdXQgdGhlIHBhdGggbWF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4ge1xuICBwYXRoOiBzdHJpbmc7XG4gIGluZGV4OiBudW1iZXI7XG4gIHBhcmFtczogUDtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIGlzIGVpdGhlciBgZmFsc2VgIChubyBtYXRjaCkgb3IgYSBtYXRjaCByZXN1bHQuXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gZmFsc2UgfCBNYXRjaFJlc3VsdDxQPjtcblxuLyoqXG4gKiBUaGUgbWF0Y2ggZnVuY3Rpb24gdGFrZXMgYSBzdHJpbmcgYW5kIHJldHVybnMgd2hldGhlciBpdCBtYXRjaGVkIHRoZSBwYXRoLlxuICovXG5leHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKHBhdGg6IHN0cmluZykgPT4gTWF0Y2g8UD47XG5cbi8qKlxuICogQ3JlYXRlIHBhdGggbWF0Y2ggZnVuY3Rpb24gZnJvbSBgcGF0aC10by1yZWdleHBgIHNwZWMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCxcbiAgb3B0aW9uczogTWF0Y2hPcHRpb25zID0ge30sXG4pOiBNYXRjaEZ1bmN0aW9uPFA+IHtcbiAgY29uc3QgeyBkZWNvZGUgPSBkZWNvZGVVUklDb21wb25lbnQsIGxvb3NlID0gdHJ1ZSB9ID0gb3B0aW9ucztcbiAgY29uc3QgZGF0YSA9IHBhdGggaW5zdGFuY2VvZiBUb2tlbkRhdGEgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gIGNvbnN0IHN0cmluZ2lmeSA9IHRvU3RyaW5naWZ5KGxvb3NlLCBkYXRhLmRlbGltaXRlcik7XG4gIGNvbnN0IGtleXM6IEtleVtdID0gW107XG4gIGNvbnN0IHJlID0gdG9rZW5zVG9SZWdleHAoZGF0YSwga2V5cywgb3B0aW9ucyk7XG5cbiAgY29uc3QgZGVjb2RlcnMgPSBrZXlzLm1hcCgoa2V5KSA9PiB7XG4gICAgaWYgKGRlY29kZSAmJiAoa2V5Lm1vZGlmaWVyID09PSBcIitcIiB8fCBrZXkubW9kaWZpZXIgPT09IFwiKlwiKSkge1xuICAgICAgY29uc3QgeyBwcmVmaXggPSBcIlwiLCBzdWZmaXggPSBcIlwiLCBzZXBhcmF0b3IgPSBzdWZmaXggKyBwcmVmaXggfSA9IGtleTtcbiAgICAgIGNvbnN0IHJlID0gbmV3IFJlZ0V4cChzdHJpbmdpZnkoc2VwYXJhdG9yKSwgXCJnXCIpO1xuICAgICAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5zcGxpdChyZSkubWFwKGRlY29kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY29kZSB8fCBOT09QX1ZBTFVFO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2goaW5wdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZS5leGVjKGlucHV0KTtcbiAgICBpZiAoIW0pIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHsgMDogcGF0aCwgaW5kZXggfSA9IG07XG4gICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG1baV0gPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGtleSA9IGtleXNbaSAtIDFdO1xuICAgICAgY29uc3QgZGVjb2RlciA9IGRlY29kZXJzW2kgLSAxXTtcbiAgICAgIHBhcmFtc1trZXkubmFtZV0gPSBkZWNvZGVyKG1baV0pO1xuICAgIH1cblxuICAgIHJldHVybiB7IHBhdGgsIGluZGV4LCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGUoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oWy4rKj9eJHt9KClbXFxdfC9cXFxcXSkvZywgXCJcXFxcJDFcIik7XG59XG5cbi8qKlxuICogRXNjYXBlIGFuZCByZXBlYXQgbG9vc2UgY2hhcmFjdGVycyBmb3IgcmVndWxhciBleHByZXNzaW9ucy5cbiAqL1xuZnVuY3Rpb24gbG9vc2VSZXBsYWNlcih2YWx1ZTogc3RyaW5nLCBsb29zZTogc3RyaW5nKSB7XG4gIGNvbnN0IGVzY2FwZWQgPSBlc2NhcGUodmFsdWUpO1xuICByZXR1cm4gbG9vc2UgPyBgKD86JHtlc2NhcGVkfSkrKD8hJHtlc2NhcGVkfSlgIDogZXNjYXBlZDtcbn1cblxuLyoqXG4gKiBFbmNvZGUgYWxsIG5vbi1kZWxpbWl0ZXIgY2hhcmFjdGVycyB1c2luZyB0aGUgZW5jb2RlIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b1N0cmluZ2lmeShsb29zZTogYm9vbGVhbiwgZGVsaW1pdGVyOiBzdHJpbmcpIHtcbiAgaWYgKCFsb29zZSkgcmV0dXJuIGVzY2FwZTtcblxuICBjb25zdCByZSA9IG5ldyBSZWdFeHAoYCg/Oig/ISR7ZXNjYXBlKGRlbGltaXRlcil9KS4pK3woLilgLCBcImdcIik7XG4gIHJldHVybiAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUucmVwbGFjZShyZSwgbG9vc2VSZXBsYWNlcik7XG59XG5cbi8qKlxuICogR2V0IHRoZSBmbGFncyBmb3IgYSByZWdleHAgZnJvbSB0aGUgb3B0aW9ucy5cbiAqL1xuZnVuY3Rpb24gdG9GbGFncyhvcHRpb25zOiB7IHNlbnNpdGl2ZT86IGJvb2xlYW4gfSkge1xuICByZXR1cm4gb3B0aW9ucy5zZW5zaXRpdmUgPyBcIlwiIDogXCJpXCI7XG59XG5cbi8qKlxuICogQSBrZXkgaXMgYSBjYXB0dXJlIGdyb3VwIGluIHRoZSByZWdleC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBLZXkge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByZWZpeD86IHN0cmluZztcbiAgc3VmZml4Pzogc3RyaW5nO1xuICBwYXR0ZXJuPzogc3RyaW5nO1xuICBtb2RpZmllcj86IHN0cmluZztcbiAgc2VwYXJhdG9yPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgdG9rZW4gaXMgYSBzdHJpbmcgKG5vdGhpbmcgc3BlY2lhbCkgb3Iga2V5IG1ldGFkYXRhIChjYXB0dXJlIGdyb3VwKS5cbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBzdHJpbmcgfCBLZXk7XG5cbi8qKlxuICogRXhwb3NlIGEgZnVuY3Rpb24gZm9yIHRha2luZyB0b2tlbnMgYW5kIHJldHVybmluZyBhIFJlZ0V4cC5cbiAqL1xuZnVuY3Rpb24gdG9rZW5zVG9SZWdleHAoXG4gIGRhdGE6IFRva2VuRGF0YSxcbiAga2V5czogS2V5W10sXG4gIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMsXG4pOiBSZWdFeHAge1xuICBjb25zdCB7XG4gICAgdHJhaWxpbmcgPSB0cnVlLFxuICAgIGxvb3NlID0gdHJ1ZSxcbiAgICBzdGFydCA9IHRydWUsXG4gICAgZW5kID0gdHJ1ZSxcbiAgICBzdHJpY3QgPSBmYWxzZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGZsYWdzID0gdG9GbGFncyhvcHRpb25zKTtcbiAgY29uc3Qgc3RyaW5naWZ5ID0gdG9TdHJpbmdpZnkobG9vc2UsIGRhdGEuZGVsaW1pdGVyKTtcbiAgY29uc3Qgc291cmNlcyA9IHRvUmVnRXhwU291cmNlKGRhdGEsIHN0cmluZ2lmeSwga2V5cywgZmxhZ3MsIHN0cmljdCk7XG4gIGxldCBwYXR0ZXJuID0gc3RhcnQgPyBcIl5cIiA6IFwiXCI7XG4gIHBhdHRlcm4gKz0gc291cmNlcy5qb2luKFwiXCIpO1xuICBpZiAodHJhaWxpbmcpIHBhdHRlcm4gKz0gYCg/OiR7c3RyaW5naWZ5KGRhdGEuZGVsaW1pdGVyKX0pP2A7XG4gIHBhdHRlcm4gKz0gZW5kID8gXCIkXCIgOiBgKD89JHtlc2NhcGUoZGF0YS5kZWxpbWl0ZXIpfXwkKWA7XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSB0b2tlbiBpbnRvIGEgcmVnZXhwIHN0cmluZyAocmUtdXNlZCBmb3IgcGF0aCB2YWxpZGF0aW9uKS5cbiAqL1xuZnVuY3Rpb24gdG9SZWdFeHBTb3VyY2UoXG4gIGRhdGE6IFRva2VuRGF0YSxcbiAgc3RyaW5naWZ5OiBFbmNvZGUsXG4gIGtleXM6IEtleVtdLFxuICBmbGFnczogc3RyaW5nLFxuICBzdHJpY3Q6IGJvb2xlYW4sXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGRlZmF1bHRQYXR0ZXJuID0gYCg/Oig/ISR7ZXNjYXBlKGRhdGEuZGVsaW1pdGVyKX0pLikrP2A7XG4gIGxldCBiYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgc2FmZSA9IHRydWU7XG5cbiAgcmV0dXJuIGRhdGEudG9rZW5zLm1hcCgodG9rZW4sIGluZGV4KSA9PiB7XG4gICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgYmFja3RyYWNrID0gdG9rZW47XG4gICAgICByZXR1cm4gc3RyaW5naWZ5KHRva2VuKTtcbiAgICB9XG5cbiAgICBjb25zdCB7XG4gICAgICBwcmVmaXggPSBcIlwiLFxuICAgICAgc3VmZml4ID0gXCJcIixcbiAgICAgIHNlcGFyYXRvciA9IHN1ZmZpeCArIHByZWZpeCxcbiAgICAgIG1vZGlmaWVyID0gXCJcIixcbiAgICB9ID0gdG9rZW47XG5cbiAgICBjb25zdCBwcmUgPSBzdHJpbmdpZnkocHJlZml4KTtcbiAgICBjb25zdCBwb3N0ID0gc3RyaW5naWZ5KHN1ZmZpeCk7XG5cbiAgICBpZiAodG9rZW4ubmFtZSkge1xuICAgICAgY29uc3QgcGF0dGVybiA9IHRva2VuLnBhdHRlcm4gPyBgKD86JHt0b2tlbi5wYXR0ZXJufSlgIDogZGVmYXVsdFBhdHRlcm47XG4gICAgICBjb25zdCByZSA9IGNoZWNrUGF0dGVybihwYXR0ZXJuLCB0b2tlbi5uYW1lLCBmbGFncyk7XG5cbiAgICAgIHNhZmUgfHw9IHNhZmVQYXR0ZXJuKHJlLCBwcmVmaXggfHwgYmFja3RyYWNrKTtcbiAgICAgIGlmICghc2FmZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGBBbWJpZ3VvdXMgcGF0dGVybiBmb3IgXCIke3Rva2VuLm5hbWV9XCI6ICR7REVCVUdfVVJMfWAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBzYWZlID0gIXN0cmljdCB8fCBzYWZlUGF0dGVybihyZSwgc3VmZml4KTtcbiAgICAgIGJhY2t0cmFjayA9IFwiXCI7XG5cbiAgICAgIGtleXMucHVzaCh0b2tlbik7XG5cbiAgICAgIGlmIChtb2RpZmllciA9PT0gXCIrXCIgfHwgbW9kaWZpZXIgPT09IFwiKlwiKSB7XG4gICAgICAgIGNvbnN0IG1vZCA9IG1vZGlmaWVyID09PSBcIipcIiA/IFwiP1wiIDogXCJcIjtcbiAgICAgICAgY29uc3Qgc2VwID0gc3RyaW5naWZ5KHNlcGFyYXRvcik7XG5cbiAgICAgICAgaWYgKCFzZXApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYE1pc3Npbmcgc2VwYXJhdG9yIGZvciBcIiR7dG9rZW4ubmFtZX1cIjogJHtERUJVR19VUkx9YCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgc2FmZSB8fD0gIXN0cmljdCB8fCBzYWZlUGF0dGVybihyZSwgc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKCFzYWZlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIGBBbWJpZ3VvdXMgcGF0dGVybiBmb3IgXCIke3Rva2VuLm5hbWV9XCIgc2VwYXJhdG9yOiAke0RFQlVHX1VSTH1gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgc2FmZSA9ICFzdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIGAoPzoke3ByZX0oJHtwYXR0ZXJufSg/OiR7c2VwfSR7cGF0dGVybn0pKikke3Bvc3R9KSR7bW9kfWA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBgKD86JHtwcmV9KCR7cGF0dGVybn0pJHtwb3N0fSkke21vZGlmaWVyfWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGAoPzoke3ByZX0ke3Bvc3R9KSR7bW9kaWZpZXJ9YDtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrUGF0dGVybihwYXR0ZXJuOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZmxhZ3M6IHN0cmluZykge1xuICB0cnkge1xuICAgIHJldHVybiBuZXcgUmVnRXhwKGBeJHtwYXR0ZXJufSRgLCBmbGFncyk7XG4gIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgSW52YWxpZCBwYXR0ZXJuIGZvciBcIiR7bmFtZX1cIjogJHtlcnIubWVzc2FnZX1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzYWZlUGF0dGVybihyZTogUmVnRXhwLCB2YWx1ZTogc3RyaW5nKSB7XG4gIHJldHVybiB2YWx1ZSA/ICFyZS50ZXN0KHZhbHVlKSA6IGZhbHNlO1xufVxuXG4vKipcbiAqIFJlcGVhdGVkIGFuZCBzaW1wbGUgaW5wdXQgdHlwZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFBhdGggPSBzdHJpbmcgfCBUb2tlbkRhdGE7XG5cbi8qKlxuICogTm9ybWFsaXplIHRoZSBnaXZlbiBwYXRoIHN0cmluZywgcmV0dXJuaW5nIGEgcmVndWxhciBleHByZXNzaW9uLlxuICpcbiAqIEFuIGVtcHR5IGFycmF5IGNhbiBiZSBwYXNzZWQgaW4gZm9yIHRoZSBrZXlzLCB3aGljaCB3aWxsIGhvbGQgdGhlXG4gKiBwbGFjZWhvbGRlciBrZXkgZGVzY3JpcHRpb25zLiBGb3IgZXhhbXBsZSwgdXNpbmcgYC91c2VyLzppZGAsIGBrZXlzYCB3aWxsXG4gKiBjb250YWluIGBbeyBuYW1lOiAnaWQnLCBkZWxpbWl0ZXI6ICcvJywgb3B0aW9uYWw6IGZhbHNlLCByZXBlYXQ6IGZhbHNlIH1dYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1JlZ2V4cChwYXRoOiBQYXRoLCBvcHRpb25zOiBQYXRoVG9SZWdleHBPcHRpb25zID0ge30pIHtcbiAgY29uc3QgZGF0YSA9IHBhdGggaW5zdGFuY2VvZiBUb2tlbkRhdGEgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gIGNvbnN0IGtleXM6IEtleVtdID0gW107XG4gIGNvbnN0IHJlZ2V4cCA9IHRva2Vuc1RvUmVnZXhwKGRhdGEsIGtleXMsIG9wdGlvbnMpO1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZWdleHAsIHsga2V5cyB9KTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIEVuY29kZSBhcyBwMnJFbmNvZGUsXG4gICAgRGVjb2RlIGFzIHAyckRlY29kZSxcbiAgICBQYXJzZU9wdGlvbnMgYXMgcDJyUGFyc2VPcHRpb25zLFxuICAgIFBhdGhUb1JlZ2V4cE9wdGlvbnMgYXMgcDJyUGF0aFRvUmVnZXhwT3B0aW9ucyxcbiAgICBNYXRjaE9wdGlvbnMgYXMgcDJyTWF0Y2hPcHRpb25zLFxuICAgIENvbXBpbGVPcHRpb25zIGFzIHAyckNvbXBpbGVPcHRpb25zLFxuICAgIFRva2VuRGF0YSBhcyBwMnJUb2tlbkRhdGEsXG4gICAgUGFyYW1EYXRhIGFzIHAyclBhcmFtRGF0YSxcbiAgICBQYXRoRnVuY3Rpb24gYXMgcDJyUGF0aEZ1bmN0aW9uLFxuICAgIE1hdGNoUmVzdWx0IGFzIHAyck1hdGNoUmVzdWx0LFxuICAgIE1hdGNoIGFzIHAyck1hdGNoLFxuICAgIE1hdGNoRnVuY3Rpb24gYXMgcDJyTWF0Y2hGdW5jdGlvbixcbiAgICBLZXkgYXMgcDJyS2V5LFxuICAgIFRva2VuIGFzIHAyclRva2VuLFxuICAgIFBhdGggYXMgcDJyUGF0aCxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgRW5jb2RlID0gcDJyRW5jb2RlO1xuICAgIGV4cG9ydCB0eXBlIERlY29kZSA9IHAyckRlY29kZTtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyA9IHAyclBhdGhUb1JlZ2V4cE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hPcHRpb25zID0gcDJyTWF0Y2hPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIENvbXBpbGVPcHRpb25zID0gcDJyQ29tcGlsZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5EYXRhID0gcDJyVG9rZW5EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IHAyclBhcmFtRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJQYXRoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaFJlc3VsdDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xufVxuXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOlsicGFyc2UiLCJjb21waWxlIiwibWF0Y2giLCJwYXRoVG9SZWdleHAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBZ1FBLENBcUVDLElBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBS0QsQ0FNQyxJQUFBLENBQUEsT0FBQSxHQUFBLE9BQUEsQ0FBQTtBQTRJRCxDQXFDQyxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQThLRCxDQUtDLElBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQSxDQUFBO0NBcHJCRCxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQztBQUM5QixDQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxLQUFLLEtBQUssQ0FBQztDQUM1QyxN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Q0FBQSxFQUFBLEdBQUcsRUFBRSxDQUFDO2NBQ25FO2FBRUQsT0FBTyxDQUFBLEdBQUEsRUFBTSxHQUFHLENBQUksQ0FBQSxFQUFBLE9BQU8sSUFBSSxJQUFJLENBQUEsQ0FBQSxFQUFJLFFBQVEsQ0FBQSxDQUFFLENBQUM7VUFDbkQ7QUFFRCxTQUFBLE9BQU8sTUFBTSxHQUFHLENBQUEsRUFBRyxJQUFJLENBQUksQ0FBQSxFQUFBLFFBQVEsRUFBRSxDQUFDO0FBQ3hDLE1BQUMsQ0FBQyxDQUFDO0VBQ0o7QUFFRCxDQUFBLFNBQVMsWUFBWSxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFBO0FBQ2hFLEtBQUEsSUFBSTtTQUNGLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQSxDQUFBLEVBQUksT0FBTyxDQUFHLENBQUEsQ0FBQSxFQUFFLEtBQUssQ0FBQyxDQUFDO01BQzFDO0tBQUMsT0FBTyxHQUFRLEVBQUU7U0FDakIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUF3QixxQkFBQSxFQUFBLElBQUksQ0FBTSxHQUFBLEVBQUEsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFBLENBQUMsQ0FBQztNQUN0RTtFQUNGO0FBRUQsQ0FBQSxTQUFTLFdBQVcsQ0FBQyxFQUFVLEVBQUUsS0FBYSxFQUFBO0FBQzVDLEtBQUEsT0FBTyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztFQUN4QztBQU9EOzs7Ozs7QUFNRztBQUNILENBQUEsU0FBZ0IsWUFBWSxDQUFDLElBQVUsRUFBRSxVQUErQixFQUFFLEVBQUE7QUFDeEUsS0FBQSxNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksU0FBUyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ3JFLE1BQU0sSUFBSSxHQUFVLEVBQUUsQ0FBQztLQUN2QixNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztLQUNuRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztFQUN4Qzs7Ozs7OztBQ3ByQkQ7O0FBRUc7QUEwQ0gsTUFBTSxXQUFXLEdBQUc7V0FDaEJBLGlCQUFLO2FBQ0xDLG1CQUFPO1dBQ1BDLGlCQUFLO2tCQUNMQyx3QkFBWTs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9