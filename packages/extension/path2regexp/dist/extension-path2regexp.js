/*!
 * @cdp/extension-path2regexp 0.9.21
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
    	dist.PathError = dist.TokenData = void 0;
    	dist.parse = parse;
    	dist.compile = compile;
    	dist.match = match;
    	dist.pathToRegexp = pathToRegexp;
    	dist.stringify = stringify;
    	const DEFAULT_DELIMITER = "/";
    	const NOOP_VALUE = (value) => value;
    	const ID_START = /^[$_\p{ID_Start}]$/u;
    	const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
    	const SIMPLE_TOKENS = {
    	    // Groups.
    	    "{": "{",
    	    "}": "}",
    	    // Reserved.
    	    "(": "(",
    	    ")": ")",
    	    "[": "[",
    	    "]": "]",
    	    "+": "+",
    	    "?": "?",
    	    "!": "!",
    	};
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
    	 * Tokenized path instance.
    	 */
    	class TokenData {
    	    constructor(tokens, originalPath) {
    	        this.tokens = tokens;
    	        this.originalPath = originalPath;
    	    }
    	}
    	dist.TokenData = TokenData;
    	/**
    	 * ParseError is thrown when there is an error processing the path.
    	 */
    	class PathError extends TypeError {
    	    constructor(message, originalPath) {
    	        let text = message;
    	        if (originalPath)
    	            text += `: ${originalPath}`;
    	        text += `; visit https://git.new/pathToRegexpError for info`;
    	        super(text);
    	        this.originalPath = originalPath;
    	    }
    	}
    	dist.PathError = PathError;
    	/**
    	 * Parse a string for the raw tokens.
    	 */
    	function parse(str, options = {}) {
    	    const { encodePath = NOOP_VALUE } = options;
    	    const chars = [...str];
    	    const tokens = [];
    	    let index = 0;
    	    let pos = 0;
    	    function name() {
    	        let value = "";
    	        if (ID_START.test(chars[index])) {
    	            do {
    	                value += chars[index++];
    	            } while (ID_CONTINUE.test(chars[index]));
    	        }
    	        else if (chars[index] === '"') {
    	            let quoteStart = index;
    	            while (index++ < chars.length) {
    	                if (chars[index] === '"') {
    	                    index++;
    	                    quoteStart = 0;
    	                    break;
    	                }
    	                // Increment over escape characters.
    	                if (chars[index] === "\\")
    	                    index++;
    	                value += chars[index];
    	            }
    	            if (quoteStart) {
    	                throw new PathError(`Unterminated quote at index ${quoteStart}`, str);
    	            }
    	        }
    	        if (!value) {
    	            throw new PathError(`Missing parameter name at index ${index}`, str);
    	        }
    	        return value;
    	    }
    	    while (index < chars.length) {
    	        const value = chars[index];
    	        const type = SIMPLE_TOKENS[value];
    	        if (type) {
    	            tokens.push({ type, index: index++, value });
    	        }
    	        else if (value === "\\") {
    	            tokens.push({ type: "escape", index: index++, value: chars[index++] });
    	        }
    	        else if (value === ":") {
    	            tokens.push({ type: "param", index: index++, value: name() });
    	        }
    	        else if (value === "*") {
    	            tokens.push({ type: "wildcard", index: index++, value: name() });
    	        }
    	        else {
    	            tokens.push({ type: "char", index: index++, value });
    	        }
    	    }
    	    tokens.push({ type: "end", index, value: "" });
    	    function consumeUntil(endType) {
    	        const output = [];
    	        while (true) {
    	            const token = tokens[pos++];
    	            if (token.type === endType)
    	                break;
    	            if (token.type === "char" || token.type === "escape") {
    	                let path = token.value;
    	                let cur = tokens[pos];
    	                while (cur.type === "char" || cur.type === "escape") {
    	                    path += cur.value;
    	                    cur = tokens[++pos];
    	                }
    	                output.push({
    	                    type: "text",
    	                    value: encodePath(path),
    	                });
    	                continue;
    	            }
    	            if (token.type === "param" || token.type === "wildcard") {
    	                output.push({
    	                    type: token.type,
    	                    name: token.value,
    	                });
    	                continue;
    	            }
    	            if (token.type === "{") {
    	                output.push({
    	                    type: "group",
    	                    tokens: consumeUntil("}"),
    	                });
    	                continue;
    	            }
    	            throw new PathError(`Unexpected ${token.type} at index ${token.index}, expected ${endType}`, str);
    	        }
    	        return output;
    	    }
    	    return new TokenData(consumeUntil("end"), str);
    	}
    	/**
    	 * Compile a string to a template function for the path.
    	 */
    	function compile(path, options = {}) {
    	    const { encode = encodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
    	    const data = typeof path === "object" ? path : parse(path, options);
    	    const fn = tokensToFunction(data.tokens, delimiter, encode);
    	    return function path(params = {}) {
    	        const [path, ...missing] = fn(params);
    	        if (missing.length) {
    	            throw new TypeError(`Missing parameters: ${missing.join(", ")}`);
    	        }
    	        return path;
    	    };
    	}
    	function tokensToFunction(tokens, delimiter, encode) {
    	    const encoders = tokens.map((token) => tokenToFunction(token, delimiter, encode));
    	    return (data) => {
    	        const result = [""];
    	        for (const encoder of encoders) {
    	            const [value, ...extras] = encoder(data);
    	            result[0] += value;
    	            result.push(...extras);
    	        }
    	        return result;
    	    };
    	}
    	/**
    	 * Convert a single token into a path building function.
    	 */
    	function tokenToFunction(token, delimiter, encode) {
    	    if (token.type === "text")
    	        return () => [token.value];
    	    if (token.type === "group") {
    	        const fn = tokensToFunction(token.tokens, delimiter, encode);
    	        return (data) => {
    	            const [value, ...missing] = fn(data);
    	            if (!missing.length)
    	                return [value];
    	            return [""];
    	        };
    	    }
    	    const encodeValue = encode || NOOP_VALUE;
    	    if (token.type === "wildcard" && encode !== false) {
    	        return (data) => {
    	            const value = data[token.name];
    	            if (value == null)
    	                return ["", token.name];
    	            if (!Array.isArray(value) || value.length === 0) {
    	                throw new TypeError(`Expected "${token.name}" to be a non-empty array`);
    	            }
    	            return [
    	                value
    	                    .map((value, index) => {
    	                    if (typeof value !== "string") {
    	                        throw new TypeError(`Expected "${token.name}/${index}" to be a string`);
    	                    }
    	                    return encodeValue(value);
    	                })
    	                    .join(delimiter),
    	            ];
    	        };
    	    }
    	    return (data) => {
    	        const value = data[token.name];
    	        if (value == null)
    	            return ["", token.name];
    	        if (typeof value !== "string") {
    	            throw new TypeError(`Expected "${token.name}" to be a string`);
    	        }
    	        return [encodeValue(value)];
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
    	function pathToRegexp(path, options = {}) {
    	    const { delimiter = DEFAULT_DELIMITER, end = true, sensitive = false, trailing = true, } = options;
    	    const keys = [];
    	    const flags = sensitive ? "" : "i";
    	    const sources = [];
    	    for (const input of pathsToArray(path, [])) {
    	        const data = typeof input === "object" ? input : parse(input, options);
    	        for (const tokens of flatten(data.tokens, 0, [])) {
    	            sources.push(toRegExpSource(tokens, delimiter, keys, data.originalPath));
    	        }
    	    }
    	    let pattern = `^(?:${sources.join("|")})`;
    	    if (trailing)
    	        pattern += `(?:${escape(delimiter)}$)?`;
    	    pattern += end ? "$" : `(?=${escape(delimiter)}|$)`;
    	    const regexp = new RegExp(pattern, flags);
    	    return { regexp, keys };
    	}
    	/**
    	 * Convert a path or array of paths into a flat array.
    	 */
    	function pathsToArray(paths, init) {
    	    if (Array.isArray(paths)) {
    	        for (const p of paths)
    	            pathsToArray(p, init);
    	    }
    	    else {
    	        init.push(paths);
    	    }
    	    return init;
    	}
    	/**
    	 * Generate a flat list of sequence tokens from the given tokens.
    	 */
    	function* flatten(tokens, index, init) {
    	    if (index === tokens.length) {
    	        return yield init;
    	    }
    	    const token = tokens[index];
    	    if (token.type === "group") {
    	        for (const seq of flatten(token.tokens, 0, init.slice())) {
    	            yield* flatten(tokens, index + 1, seq);
    	        }
    	    }
    	    else {
    	        init.push(token);
    	    }
    	    yield* flatten(tokens, index + 1, init);
    	}
    	/**
    	 * Transform a flat sequence of tokens into a regular expression.
    	 */
    	function toRegExpSource(tokens, delimiter, keys, originalPath) {
    	    let result = "";
    	    let backtrack = "";
    	    let isSafeSegmentParam = true;
    	    for (const token of tokens) {
    	        if (token.type === "text") {
    	            result += escape(token.value);
    	            backtrack += token.value;
    	            isSafeSegmentParam || (isSafeSegmentParam = token.value.includes(delimiter));
    	            continue;
    	        }
    	        if (token.type === "param" || token.type === "wildcard") {
    	            if (!isSafeSegmentParam && !backtrack) {
    	                throw new PathError(`Missing text before "${token.name}" ${token.type}`, originalPath);
    	            }
    	            if (token.type === "param") {
    	                result += `(${negate(delimiter, isSafeSegmentParam ? "" : backtrack)}+)`;
    	            }
    	            else {
    	                result += `([\\s\\S]+)`;
    	            }
    	            keys.push(token);
    	            backtrack = "";
    	            isSafeSegmentParam = false;
    	            continue;
    	        }
    	    }
    	    return result;
    	}
    	/**
    	 * Block backtracking on previous text and ignore delimiter string.
    	 */
    	function negate(delimiter, backtrack) {
    	    if (backtrack.length < 2) {
    	        if (delimiter.length < 2)
    	            return `[^${escape(delimiter + backtrack)}]`;
    	        return `(?:(?!${escape(delimiter)})[^${escape(backtrack)}])`;
    	    }
    	    if (delimiter.length < 2) {
    	        return `(?:(?!${escape(backtrack)})[^${escape(delimiter)}])`;
    	    }
    	    return `(?:(?!${escape(backtrack)}|${escape(delimiter)})[\\s\\S])`;
    	}
    	/**
    	 * Stringify an array of tokens into a path string.
    	 */
    	function stringifyTokens(tokens) {
    	    let value = "";
    	    let i = 0;
    	    function name(value) {
    	        const isSafe = isNameSafe(value) && isNextNameSafe(tokens[i]);
    	        return isSafe ? value : JSON.stringify(value);
    	    }
    	    while (i < tokens.length) {
    	        const token = tokens[i++];
    	        if (token.type === "text") {
    	            value += escapeText(token.value);
    	            continue;
    	        }
    	        if (token.type === "group") {
    	            value += `{${stringifyTokens(token.tokens)}}`;
    	            continue;
    	        }
    	        if (token.type === "param") {
    	            value += `:${name(token.name)}`;
    	            continue;
    	        }
    	        if (token.type === "wildcard") {
    	            value += `*${name(token.name)}`;
    	            continue;
    	        }
    	        throw new TypeError(`Unknown token type: ${token.type}`);
    	    }
    	    return value;
    	}
    	/**
    	 * Stringify token data into a path string.
    	 */
    	function stringify(data) {
    	    return stringifyTokens(data.tokens);
    	}
    	/**
    	 * Validate the parameter name contains valid ID characters.
    	 */
    	function isNameSafe(name) {
    	    const [first, ...rest] = name;
    	    return ID_START.test(first) && rest.every((char) => ID_CONTINUE.test(char));
    	}
    	/**
    	 * Validate the next token does not interfere with the current param name.
    	 */
    	function isNextNameSafe(token) {
    	    if (token && token.type === "text")
    	        return !ID_CONTINUE.test(token.value[0]);
    	    return true;
    	}
    	
    	return dist;
    }

    var distExports = requireDist();

    /* eslint-disable
        @typescript-eslint/no-namespace,
     */
    const path2regexp = {
        TokenData: distExports.TokenData,
        PathError: distExports.PathError,
        parse: distExports.parse,
        compile: distExports.compile,
        match: distExports.match,
        stringify: distExports.stringify,
        pathToRegexp: distExports.pathToRegexp,
    };

    exports.path2regexp = path2regexp;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX1NUQVJUID0gL15bJF9cXHB7SURfU3RhcnR9XSQvdTtcbmNvbnN0IElEX0NPTlRJTlVFID0gL15bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0kL3U7XG5cbi8qKlxuICogRW5jb2RlIGEgc3RyaW5nIGludG8gYW5vdGhlciBzdHJpbmcuXG4gKi9cbmV4cG9ydCB0eXBlIEVuY29kZSA9ICh2YWx1ZTogc3RyaW5nKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogRGVjb2RlIGEgc3RyaW5nIGludG8gYW5vdGhlciBzdHJpbmcuXG4gKi9cbmV4cG9ydCB0eXBlIERlY29kZSA9ICh2YWx1ZTogc3RyaW5nKSA9PiBzdHJpbmc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VPcHRpb25zIHtcbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MuXG4gICAqL1xuICBlbmNvZGVQYXRoPzogRW5jb2RlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhdGhUb1JlZ2V4cE9wdGlvbnMge1xuICAvKipcbiAgICogTWF0Y2hlcyB0aGUgcGF0aCBjb21wbGV0ZWx5IHdpdGhvdXQgdHJhaWxpbmcgY2hhcmFjdGVycy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuZD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBBbGxvd3Mgb3B0aW9uYWwgdHJhaWxpbmcgZGVsaW1pdGVyIHRvIG1hdGNoLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgdHJhaWxpbmc/OiBib29sZWFuO1xuICAvKipcbiAgICogTWF0Y2ggd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoT3B0aW9ucyBleHRlbmRzIFBhdGhUb1JlZ2V4cE9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGRlY29kaW5nIHN0cmluZ3MgZm9yIHBhcmFtcywgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGRlY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBkZWNvZGU/OiBEZWNvZGUgfCBmYWxzZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncyBmb3Igb3V0cHV0IGludG8gdGhlIHBhdGgsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBlbmNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZW5jb2RlPzogRW5jb2RlIHwgZmFsc2U7XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBkZWxpbWl0ZXIgZm9yIHNlZ21lbnRzLiAoZGVmYXVsdDogYCcvJ2ApXG4gICAqL1xuICBkZWxpbWl0ZXI/OiBzdHJpbmc7XG59XG5cbnR5cGUgVG9rZW5UeXBlID1cbiAgfCBcIntcIlxuICB8IFwifVwiXG4gIHwgXCJ3aWxkY2FyZFwiXG4gIHwgXCJwYXJhbVwiXG4gIHwgXCJjaGFyXCJcbiAgfCBcImVzY2FwZVwiXG4gIHwgXCJlbmRcIlxuICAvLyBSZXNlcnZlZCBmb3IgdXNlIG9yIGFtYmlndW91cyBkdWUgdG8gcGFzdCB1c2UuXG4gIHwgXCIoXCJcbiAgfCBcIilcIlxuICB8IFwiW1wiXG4gIHwgXCJdXCJcbiAgfCBcIitcIlxuICB8IFwiP1wiXG4gIHwgXCIhXCI7XG5cbi8qKlxuICogVG9rZW5pemVyIHJlc3VsdHMuXG4gKi9cbmludGVyZmFjZSBMZXhUb2tlbiB7XG4gIHR5cGU6IFRva2VuVHlwZTtcbiAgaW5kZXg6IG51bWJlcjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuY29uc3QgU0lNUExFX1RPS0VOUzogUmVjb3JkPHN0cmluZywgVG9rZW5UeXBlPiA9IHtcbiAgLy8gR3JvdXBzLlxuICBcIntcIjogXCJ7XCIsXG4gIFwifVwiOiBcIn1cIixcbiAgLy8gUmVzZXJ2ZWQuXG4gIFwiKFwiOiBcIihcIixcbiAgXCIpXCI6IFwiKVwiLFxuICBcIltcIjogXCJbXCIsXG4gIFwiXVwiOiBcIl1cIixcbiAgXCIrXCI6IFwiK1wiLFxuICBcIj9cIjogXCI/XCIsXG4gIFwiIVwiOiBcIiFcIixcbn07XG5cbi8qKlxuICogRXNjYXBlIHRleHQgZm9yIHN0cmluZ2lmeSB0byBwYXRoLlxuICovXG5mdW5jdGlvbiBlc2NhcGVUZXh0KHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvW3t9KClcXFtcXF0rPyE6KlxcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuXG4vKipcbiAqIEVzY2FwZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZShzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1suKyo/XiR7fSgpW1xcXXwvXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG5cbi8qKlxuICogUGxhaW4gdGV4dC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZXh0IHtcbiAgdHlwZTogXCJ0ZXh0XCI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBwYXJhbWV0ZXIgZGVzaWduZWQgdG8gbWF0Y2ggYXJiaXRyYXJ5IHRleHQgd2l0aGluIGEgc2VnbWVudC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXIge1xuICB0eXBlOiBcInBhcmFtXCI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHdpbGRjYXJkIHBhcmFtZXRlciBkZXNpZ25lZCB0byBtYXRjaCBtdWx0aXBsZSBzZWdtZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXaWxkY2FyZCB7XG4gIHR5cGU6IFwid2lsZGNhcmRcIjtcbiAgbmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgc2V0IG9mIHBvc3NpYmxlIHRva2VucyB0byBleHBhbmQgd2hlbiBtYXRjaGluZy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcm91cCB7XG4gIHR5cGU6IFwiZ3JvdXBcIjtcbiAgdG9rZW5zOiBUb2tlbltdO1xufVxuXG4vKipcbiAqIEEgdG9rZW4gdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgcmVnZXhwIGNhcHR1cmUuXG4gKi9cbmV4cG9ydCB0eXBlIEtleSA9IFBhcmFtZXRlciB8IFdpbGRjYXJkO1xuXG4vKipcbiAqIEEgc2VxdWVuY2Ugb2YgYHBhdGgtdG8tcmVnZXhwYCBrZXlzIHRoYXQgbWF0Y2ggY2FwdHVyaW5nIGdyb3Vwcy5cbiAqL1xuZXhwb3J0IHR5cGUgS2V5cyA9IEFycmF5PEtleT47XG5cbi8qKlxuICogQSBzZXF1ZW5jZSBvZiBwYXRoIG1hdGNoIGNoYXJhY3RlcnMuXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gVGV4dCB8IFBhcmFtZXRlciB8IFdpbGRjYXJkIHwgR3JvdXA7XG5cbi8qKlxuICogVG9rZW5pemVkIHBhdGggaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBUb2tlbkRhdGEge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgdG9rZW5zOiBUb2tlbltdLFxuICAgIHB1YmxpYyByZWFkb25seSBvcmlnaW5hbFBhdGg/OiBzdHJpbmcsXG4gICkge31cbn1cblxuLyoqXG4gKiBQYXJzZUVycm9yIGlzIHRocm93biB3aGVuIHRoZXJlIGlzIGFuIGVycm9yIHByb2Nlc3NpbmcgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXRoRXJyb3IgZXh0ZW5kcyBUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IG9yaWdpbmFsUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICApIHtcbiAgICBsZXQgdGV4dCA9IG1lc3NhZ2U7XG4gICAgaWYgKG9yaWdpbmFsUGF0aCkgdGV4dCArPSBgOiAke29yaWdpbmFsUGF0aH1gO1xuICAgIHRleHQgKz0gYDsgdmlzaXQgaHR0cHM6Ly9naXQubmV3L3BhdGhUb1JlZ2V4cEVycm9yIGZvciBpbmZvYDtcbiAgICBzdXBlcih0ZXh0KTtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cjogc3RyaW5nLCBvcHRpb25zOiBQYXJzZU9wdGlvbnMgPSB7fSk6IFRva2VuRGF0YSB7XG4gIGNvbnN0IHsgZW5jb2RlUGF0aCA9IE5PT1BfVkFMVUUgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGNoYXJzID0gWy4uLnN0cl07XG4gIGNvbnN0IHRva2VuczogQXJyYXk8TGV4VG9rZW4+ID0gW107XG4gIGxldCBpbmRleCA9IDA7XG4gIGxldCBwb3MgPSAwO1xuXG4gIGZ1bmN0aW9uIG5hbWUoKSB7XG4gICAgbGV0IHZhbHVlID0gXCJcIjtcblxuICAgIGlmIChJRF9TVEFSVC50ZXN0KGNoYXJzW2luZGV4XSkpIHtcbiAgICAgIGRvIHtcbiAgICAgICAgdmFsdWUgKz0gY2hhcnNbaW5kZXgrK107XG4gICAgICB9IHdoaWxlIChJRF9DT05USU5VRS50ZXN0KGNoYXJzW2luZGV4XSkpO1xuICAgIH0gZWxzZSBpZiAoY2hhcnNbaW5kZXhdID09PSAnXCInKSB7XG4gICAgICBsZXQgcXVvdGVTdGFydCA9IGluZGV4O1xuXG4gICAgICB3aGlsZSAoaW5kZXgrKyA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICBpZiAoY2hhcnNbaW5kZXhdID09PSAnXCInKSB7XG4gICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICBxdW90ZVN0YXJ0ID0gMDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluY3JlbWVudCBvdmVyIGVzY2FwZSBjaGFyYWN0ZXJzLlxuICAgICAgICBpZiAoY2hhcnNbaW5kZXhdID09PSBcIlxcXFxcIikgaW5kZXgrKztcblxuICAgICAgICB2YWx1ZSArPSBjaGFyc1tpbmRleF07XG4gICAgICB9XG5cbiAgICAgIGlmIChxdW90ZVN0YXJ0KSB7XG4gICAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoYFVudGVybWluYXRlZCBxdW90ZSBhdCBpbmRleCAke3F1b3RlU3RhcnR9YCwgc3RyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0IGluZGV4ICR7aW5kZXh9YCwgc3RyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB3aGlsZSAoaW5kZXggPCBjaGFycy5sZW5ndGgpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNoYXJzW2luZGV4XTtcbiAgICBjb25zdCB0eXBlID0gU0lNUExFX1RPS0VOU1t2YWx1ZV07XG5cbiAgICBpZiAodHlwZSkge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlLCBpbmRleDogaW5kZXgrKywgdmFsdWUgfSk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJlc2NhcGVcIiwgaW5kZXg6IGluZGV4KyssIHZhbHVlOiBjaGFyc1tpbmRleCsrXSB9KTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSBcIjpcIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcInBhcmFtXCIsIGluZGV4OiBpbmRleCsrLCB2YWx1ZTogbmFtZSgpIH0pO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiKlwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwid2lsZGNhcmRcIiwgaW5kZXg6IGluZGV4KyssIHZhbHVlOiBuYW1lKCkgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJjaGFyXCIsIGluZGV4OiBpbmRleCsrLCB2YWx1ZSB9KTtcbiAgICB9XG4gIH1cblxuICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiZW5kXCIsIGluZGV4LCB2YWx1ZTogXCJcIiB9KTtcblxuICBmdW5jdGlvbiBjb25zdW1lVW50aWwoZW5kVHlwZTogVG9rZW5UeXBlKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgb3V0cHV0OiBUb2tlbltdID0gW107XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbcG9zKytdO1xuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IGVuZFR5cGUpIGJyZWFrO1xuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJjaGFyXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJlc2NhcGVcIikge1xuICAgICAgICBsZXQgcGF0aCA9IHRva2VuLnZhbHVlO1xuICAgICAgICBsZXQgY3VyID0gdG9rZW5zW3Bvc107XG5cbiAgICAgICAgd2hpbGUgKGN1ci50eXBlID09PSBcImNoYXJcIiB8fCBjdXIudHlwZSA9PT0gXCJlc2NhcGVcIikge1xuICAgICAgICAgIHBhdGggKz0gY3VyLnZhbHVlO1xuICAgICAgICAgIGN1ciA9IHRva2Vuc1srK3Bvc107XG4gICAgICAgIH1cblxuICAgICAgICBvdXRwdXQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdmFsdWU6IGVuY29kZVBhdGgocGF0aCksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIiB8fCB0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IHRva2VuLnR5cGUsXG4gICAgICAgICAgbmFtZTogdG9rZW4udmFsdWUsXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwie1wiKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgICAgICAgdG9rZW5zOiBjb25zdW1lVW50aWwoXCJ9XCIpLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoXG4gICAgICAgIGBVbmV4cGVjdGVkICR7dG9rZW4udHlwZX0gYXQgaW5kZXggJHt0b2tlbi5pbmRleH0sIGV4cGVjdGVkICR7ZW5kVHlwZX1gLFxuICAgICAgICBzdHIsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICByZXR1cm4gbmV3IFRva2VuRGF0YShjb25zdW1lVW50aWwoXCJlbmRcIiksIHN0cik7XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIFBhcmFtRGF0YSA9IFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3QgeyBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IGRhdGEgPSB0eXBlb2YgcGF0aCA9PT0gXCJvYmplY3RcIiA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3QgZm4gPSB0b2tlbnNUb0Z1bmN0aW9uKGRhdGEudG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHBhdGgocGFyYW1zOiBQID0ge30gYXMgUCkge1xuICAgIGNvbnN0IFtwYXRoLCAuLi5taXNzaW5nXSA9IGZuKHBhcmFtcyk7XG4gICAgaWYgKG1pc3NpbmcubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlcnM6ICR7bWlzc2luZy5qb2luKFwiLCBcIil9YCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBQYXJhbURhdGEgPSBQYXJ0aWFsPFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdPj47XG5leHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAoZGF0YT86IFApID0+IHN0cmluZztcblxuZnVuY3Rpb24gdG9rZW5zVG9GdW5jdGlvbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbikge1xuICBjb25zdCBlbmNvZGVycyA9IHRva2Vucy5tYXAoKHRva2VuKSA9PlxuICAgIHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZGVsaW1pdGVyLCBlbmNvZGUpLFxuICApO1xuXG4gIHJldHVybiAoZGF0YTogUGFyYW1EYXRhKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtcIlwiXTtcblxuICAgIGZvciAoY29uc3QgZW5jb2RlciBvZiBlbmNvZGVycykge1xuICAgICAgY29uc3QgW3ZhbHVlLCAuLi5leHRyYXNdID0gZW5jb2RlcihkYXRhKTtcbiAgICAgIHJlc3VsdFswXSArPSB2YWx1ZTtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLmV4dHJhcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgc2luZ2xlIHRva2VuIGludG8gYSBwYXRoIGJ1aWxkaW5nIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlblRvRnVuY3Rpb24oXG4gIHRva2VuOiBUb2tlbixcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pOiAoZGF0YTogUGFyYW1EYXRhKSA9PiBzdHJpbmdbXSB7XG4gIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikgcmV0dXJuICgpID0+IFt0b2tlbi52YWx1ZV07XG5cbiAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgIGNvbnN0IGZuID0gdG9rZW5zVG9GdW5jdGlvbih0b2tlbi50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICAgIHJldHVybiAoZGF0YSkgPT4ge1xuICAgICAgY29uc3QgW3ZhbHVlLCAuLi5taXNzaW5nXSA9IGZuKGRhdGEpO1xuICAgICAgaWYgKCFtaXNzaW5nLmxlbmd0aCkgcmV0dXJuIFt2YWx1ZV07XG4gICAgICByZXR1cm4gW1wiXCJdO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBlbmNvZGVWYWx1ZSA9IGVuY29kZSB8fCBOT09QX1ZBTFVFO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIgJiYgZW5jb2RlICE9PSBmYWxzZSkge1xuICAgIHJldHVybiAoZGF0YSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBbXCJcIiwgdG9rZW4ubmFtZV07XG5cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGEgbm9uLWVtcHR5IGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbXG4gICAgICAgIHZhbHVlXG4gICAgICAgICAgLm1hcCgodmFsdWUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2luZGV4fVwiIHRvIGJlIGEgc3RyaW5nYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5qb2luKGRlbGltaXRlciksXG4gICAgICBdO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBbXCJcIiwgdG9rZW4ubmFtZV07XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgIH1cblxuICAgIHJldHVybiBbZW5jb2RlVmFsdWUodmFsdWUpXTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIHJlc3VsdCBjb250YWlucyBkYXRhIGFib3V0IHRoZSBwYXRoIG1hdGNoLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+IHtcbiAgcGF0aDogc3RyaW5nO1xuICBwYXJhbXM6IFA7XG59XG5cbi8qKlxuICogQSBtYXRjaCBpcyBlaXRoZXIgYGZhbHNlYCAobm8gbWF0Y2gpIG9yIGEgbWF0Y2ggcmVzdWx0LlxuICovXG5leHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IGZhbHNlIHwgTWF0Y2hSZXN1bHQ8UD47XG5cbi8qKlxuICogVGhlIG1hdGNoIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgbWF0Y2hlZCB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChwYXRoOiBzdHJpbmcpID0+IE1hdGNoPFA+O1xuXG4vKipcbiAqIFN1cHBvcnRlZCBwYXRoIHR5cGVzLlxuICovXG5leHBvcnQgdHlwZSBQYXRoID0gc3RyaW5nIHwgVG9rZW5EYXRhO1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHBhdGggaW50byBhIG1hdGNoIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IE1hdGNoT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKTogTWF0Y2hGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHsgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50LCBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUiB9ID1cbiAgICBvcHRpb25zO1xuICBjb25zdCB7IHJlZ2V4cCwga2V5cyB9ID0gcGF0aFRvUmVnZXhwKHBhdGgsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGRlY29kZXJzID0ga2V5cy5tYXAoKGtleSkgPT4ge1xuICAgIGlmIChkZWNvZGUgPT09IGZhbHNlKSByZXR1cm4gTk9PUF9WQUxVRTtcbiAgICBpZiAoa2V5LnR5cGUgPT09IFwicGFyYW1cIikgcmV0dXJuIGRlY29kZTtcbiAgICByZXR1cm4gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnNwbGl0KGRlbGltaXRlcikubWFwKGRlY29kZSk7XG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiBtYXRjaChpbnB1dDogc3RyaW5nKSB7XG4gICAgY29uc3QgbSA9IHJlZ2V4cC5leGVjKGlucHV0KTtcbiAgICBpZiAoIW0pIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHBhdGggPSBtWzBdO1xuICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtW2ldID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIGNvbnN0IGRlY29kZXIgPSBkZWNvZGVyc1tpIC0gMV07XG4gICAgICBwYXJhbXNba2V5Lm5hbWVdID0gZGVjb2RlcihtW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXRoLCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1JlZ2V4cChcbiAgcGF0aDogUGF0aCB8IFBhdGhbXSxcbiAgb3B0aW9uczogUGF0aFRvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKSB7XG4gIGNvbnN0IHtcbiAgICBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUixcbiAgICBlbmQgPSB0cnVlLFxuICAgIHNlbnNpdGl2ZSA9IGZhbHNlLFxuICAgIHRyYWlsaW5nID0gdHJ1ZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGtleXM6IEtleXMgPSBbXTtcbiAgY29uc3QgZmxhZ3MgPSBzZW5zaXRpdmUgPyBcIlwiIDogXCJpXCI7XG4gIGNvbnN0IHNvdXJjZXM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBpbnB1dCBvZiBwYXRoc1RvQXJyYXkocGF0aCwgW10pKSB7XG4gICAgY29uc3QgZGF0YSA9IHR5cGVvZiBpbnB1dCA9PT0gXCJvYmplY3RcIiA/IGlucHV0IDogcGFyc2UoaW5wdXQsIG9wdGlvbnMpO1xuICAgIGZvciAoY29uc3QgdG9rZW5zIG9mIGZsYXR0ZW4oZGF0YS50b2tlbnMsIDAsIFtdKSkge1xuICAgICAgc291cmNlcy5wdXNoKHRvUmVnRXhwU291cmNlKHRva2VucywgZGVsaW1pdGVyLCBrZXlzLCBkYXRhLm9yaWdpbmFsUGF0aCkpO1xuICAgIH1cbiAgfVxuXG4gIGxldCBwYXR0ZXJuID0gYF4oPzoke3NvdXJjZXMuam9pbihcInxcIil9KWA7XG4gIGlmICh0cmFpbGluZykgcGF0dGVybiArPSBgKD86JHtlc2NhcGUoZGVsaW1pdGVyKX0kKT9gO1xuICBwYXR0ZXJuICs9IGVuZCA/IFwiJFwiIDogYCg/PSR7ZXNjYXBlKGRlbGltaXRlcil9fCQpYDtcblxuICBjb25zdCByZWdleHAgPSBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbiAgcmV0dXJuIHsgcmVnZXhwLCBrZXlzIH07XG59XG5cbi8qKlxuICogQ29udmVydCBhIHBhdGggb3IgYXJyYXkgb2YgcGF0aHMgaW50byBhIGZsYXQgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIHBhdGhzVG9BcnJheShwYXRoczogUGF0aCB8IFBhdGhbXSwgaW5pdDogUGF0aFtdKTogUGF0aFtdIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkocGF0aHMpKSB7XG4gICAgZm9yIChjb25zdCBwIG9mIHBhdGhzKSBwYXRoc1RvQXJyYXkocCwgaW5pdCk7XG4gIH0gZWxzZSB7XG4gICAgaW5pdC5wdXNoKHBhdGhzKTtcbiAgfVxuICByZXR1cm4gaW5pdDtcbn1cblxuLyoqXG4gKiBGbGF0dGVuZWQgdG9rZW4gc2V0LlxuICovXG50eXBlIEZsYXRUb2tlbiA9IFRleHQgfCBQYXJhbWV0ZXIgfCBXaWxkY2FyZDtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGZsYXQgbGlzdCBvZiBzZXF1ZW5jZSB0b2tlbnMgZnJvbSB0aGUgZ2l2ZW4gdG9rZW5zLlxuICovXG5mdW5jdGlvbiogZmxhdHRlbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuICBpbml0OiBGbGF0VG9rZW5bXSxcbik6IEdlbmVyYXRvcjxGbGF0VG9rZW5bXT4ge1xuICBpZiAoaW5kZXggPT09IHRva2Vucy5sZW5ndGgpIHtcbiAgICByZXR1cm4geWllbGQgaW5pdDtcbiAgfVxuXG4gIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4XTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgZm9yIChjb25zdCBzZXEgb2YgZmxhdHRlbih0b2tlbi50b2tlbnMsIDAsIGluaXQuc2xpY2UoKSkpIHtcbiAgICAgIHlpZWxkKiBmbGF0dGVuKHRva2VucywgaW5kZXggKyAxLCBzZXEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpbml0LnB1c2godG9rZW4pO1xuICB9XG5cbiAgeWllbGQqIGZsYXR0ZW4odG9rZW5zLCBpbmRleCArIDEsIGluaXQpO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhIGZsYXQgc2VxdWVuY2Ugb2YgdG9rZW5zIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbmZ1bmN0aW9uIHRvUmVnRXhwU291cmNlKFxuICB0b2tlbnM6IEZsYXRUb2tlbltdLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAga2V5czogS2V5cyxcbiAgb3JpZ2luYWxQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4pOiBzdHJpbmcge1xuICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgbGV0IGJhY2t0cmFjayA9IFwiXCI7XG4gIGxldCBpc1NhZmVTZWdtZW50UGFyYW0gPSB0cnVlO1xuXG4gIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICByZXN1bHQgKz0gZXNjYXBlKHRva2VuLnZhbHVlKTtcbiAgICAgIGJhY2t0cmFjayArPSB0b2tlbi52YWx1ZTtcbiAgICAgIGlzU2FmZVNlZ21lbnRQYXJhbSB8fD0gdG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICBpZiAoIWlzU2FmZVNlZ21lbnRQYXJhbSAmJiAhYmFja3RyYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoXG4gICAgICAgICAgYE1pc3NpbmcgdGV4dCBiZWZvcmUgXCIke3Rva2VuLm5hbWV9XCIgJHt0b2tlbi50eXBlfWAsXG4gICAgICAgICAgb3JpZ2luYWxQYXRoLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJwYXJhbVwiKSB7XG4gICAgICAgIHJlc3VsdCArPSBgKCR7bmVnYXRlKGRlbGltaXRlciwgaXNTYWZlU2VnbWVudFBhcmFtID8gXCJcIiA6IGJhY2t0cmFjayl9KylgO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ICs9IGAoW1xcXFxzXFxcXFNdKylgO1xuICAgICAgfVxuXG4gICAgICBrZXlzLnB1c2godG9rZW4pO1xuICAgICAgYmFja3RyYWNrID0gXCJcIjtcbiAgICAgIGlzU2FmZVNlZ21lbnRQYXJhbSA9IGZhbHNlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBCbG9jayBiYWNrdHJhY2tpbmcgb24gcHJldmlvdXMgdGV4dCBhbmQgaWdub3JlIGRlbGltaXRlciBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIG5lZ2F0ZShkZWxpbWl0ZXI6IHN0cmluZywgYmFja3RyYWNrOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoYmFja3RyYWNrLmxlbmd0aCA8IDIpIHtcbiAgICBpZiAoZGVsaW1pdGVyLmxlbmd0aCA8IDIpIHJldHVybiBgW14ke2VzY2FwZShkZWxpbWl0ZXIgKyBiYWNrdHJhY2spfV1gO1xuICAgIHJldHVybiBgKD86KD8hJHtlc2NhcGUoZGVsaW1pdGVyKX0pW14ke2VzY2FwZShiYWNrdHJhY2spfV0pYDtcbiAgfVxuICBpZiAoZGVsaW1pdGVyLmxlbmd0aCA8IDIpIHtcbiAgICByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGJhY2t0cmFjayl9KVteJHtlc2NhcGUoZGVsaW1pdGVyKX1dKWA7XG4gIH1cbiAgcmV0dXJuIGAoPzooPyEke2VzY2FwZShiYWNrdHJhY2spfXwke2VzY2FwZShkZWxpbWl0ZXIpfSlbXFxcXHNcXFxcU10pYDtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgYW4gYXJyYXkgb2YgdG9rZW5zIGludG8gYSBwYXRoIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5VG9rZW5zKHRva2VuczogVG9rZW5bXSk6IHN0cmluZyB7XG4gIGxldCB2YWx1ZSA9IFwiXCI7XG4gIGxldCBpID0gMDtcblxuICBmdW5jdGlvbiBuYW1lKHZhbHVlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpc1NhZmUgPSBpc05hbWVTYWZlKHZhbHVlKSAmJiBpc05leHROYW1lU2FmZSh0b2tlbnNbaV0pO1xuICAgIHJldHVybiBpc1NhZmUgPyB2YWx1ZSA6IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgfVxuXG4gIHdoaWxlIChpIDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2krK107XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgIHZhbHVlICs9IGVzY2FwZVRleHQodG9rZW4udmFsdWUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgICAgdmFsdWUgKz0gYHske3N0cmluZ2lmeVRva2Vucyh0b2tlbi50b2tlbnMpfX1gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikge1xuICAgICAgdmFsdWUgKz0gYDoke25hbWUodG9rZW4ubmFtZSl9YDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIHZhbHVlICs9IGAqJHtuYW1lKHRva2VuLm5hbWUpfWA7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmtub3duIHRva2VuIHR5cGU6ICR7KHRva2VuIGFzIGFueSkudHlwZX1gKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgdG9rZW4gZGF0YSBpbnRvIGEgcGF0aCBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkoZGF0YTogVG9rZW5EYXRhKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0cmluZ2lmeVRva2VucyhkYXRhLnRva2Vucyk7XG59XG5cbi8qKlxuICogVmFsaWRhdGUgdGhlIHBhcmFtZXRlciBuYW1lIGNvbnRhaW5zIHZhbGlkIElEIGNoYXJhY3RlcnMuXG4gKi9cbmZ1bmN0aW9uIGlzTmFtZVNhZmUobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IFtmaXJzdCwgLi4ucmVzdF0gPSBuYW1lO1xuICByZXR1cm4gSURfU1RBUlQudGVzdChmaXJzdCkgJiYgcmVzdC5ldmVyeSgoY2hhcikgPT4gSURfQ09OVElOVUUudGVzdChjaGFyKSk7XG59XG5cbi8qKlxuICogVmFsaWRhdGUgdGhlIG5leHQgdG9rZW4gZG9lcyBub3QgaW50ZXJmZXJlIHdpdGggdGhlIGN1cnJlbnQgcGFyYW0gbmFtZS5cbiAqL1xuZnVuY3Rpb24gaXNOZXh0TmFtZVNhZmUodG9rZW46IFRva2VuIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gIGlmICh0b2tlbiAmJiB0b2tlbi50eXBlID09PSBcInRleHRcIikgcmV0dXJuICFJRF9DT05USU5VRS50ZXN0KHRva2VuLnZhbHVlWzBdKTtcbiAgcmV0dXJuIHRydWU7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIEVuY29kZSBhcyBwMnJFbmNvZGUsXG4gICAgdHlwZSBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIHR5cGUgUGFyc2VPcHRpb25zIGFzIHAyclBhcnNlT3B0aW9ucyxcbiAgICB0eXBlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgYXMgcDJyUGF0aFRvUmVnZXhwT3B0aW9ucyxcbiAgICB0eXBlIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgdHlwZSBDb21waWxlT3B0aW9ucyBhcyBwMnJDb21waWxlT3B0aW9ucyxcbiAgICB0eXBlIFBhcmFtRGF0YSBhcyBwMnJQYXJhbURhdGEsXG4gICAgdHlwZSBQYXRoRnVuY3Rpb24gYXMgcDJyUGF0aEZ1bmN0aW9uLFxuICAgIHR5cGUgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgdHlwZSBNYXRjaCBhcyBwMnJNYXRjaCxcbiAgICB0eXBlIE1hdGNoRnVuY3Rpb24gYXMgcDJyTWF0Y2hGdW5jdGlvbixcbiAgICB0eXBlIEtleSBhcyBwMnJLZXksXG4gICAgdHlwZSBUb2tlbiBhcyBwMnJUb2tlbixcbiAgICB0eXBlIFBhdGggYXMgcDJyUGF0aCxcbiAgICBUb2tlbkRhdGEgYXMgcDJyVG9rZW5EYXRhLFxuICAgIFBhdGhFcnJvciBhcyBwMnJQYXRoRXJyb3IsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICBtYXRjaCxcbiAgICBzdHJpbmdpZnksXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBFbmNvZGUgPSBwMnJFbmNvZGU7XG4gICAgZXhwb3J0IHR5cGUgRGVjb2RlID0gcDJyRGVjb2RlO1xuICAgIGV4cG9ydCB0eXBlIFBhcnNlT3B0aW9ucyA9IHAyclBhcnNlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zID0gcDJyUGF0aFRvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaE9wdGlvbnMgPSBwMnJNYXRjaE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgQ29tcGlsZU9wdGlvbnMgPSBwMnJDb21waWxlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUb2tlbkRhdGEgPSBwMnJUb2tlbkRhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gcDJyUGFyYW1EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyclBhdGhGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoUmVzdWx0PFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2g8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgUGF0aCA9IHAyclBhdGg7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIFRva2VuRGF0YTogcDJyVG9rZW5EYXRhLFxuICAgIFBhdGhFcnJvcjogcDJyUGF0aEVycm9yLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOlsicDJyVG9rZW5EYXRhIiwicDJyUGF0aEVycm9yIiwicGFyc2UiLCJjb21waWxlIiwibWF0Y2giLCJzdHJpbmdpZnkiLCJwYXRoVG9SZWdleHAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBNExBLENBQUEsSUFBQSxDQUFBLEtBQUEs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SyxJQUFJLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQSxDQUFBLENBQUc7aUJBQzdDOztJQUdGLFNBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtpQkFDMUIsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFFO2lCQUMvQjs7SUFHRixTQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7aUJBQzdCLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBRTtpQkFDL0I7O2FBR0YsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLG9CQUFBLEVBQXdCLEtBQWEsQ0FBQyxJQUFJLENBQUEsQ0FBRSxDQUFDOztJQUduRSxLQUFBLE9BQU8sS0FBSztJQUNkLENBQUE7SUFFQTs7SUFFRztLQUNILFNBQWdCLFNBQVMsQ0FBQyxJQUFlLEVBQUE7SUFDdkMsS0FBQSxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JDLENBQUE7SUFFQTs7SUFFRztLQUNILFNBQVMsVUFBVSxDQUFDLElBQVksRUFBQTtTQUM5QixNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSTtTQUM3QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdFLENBQUE7SUFFQTs7SUFFRztLQUNILFNBQVMsY0FBYyxDQUFDLEtBQXdCLEVBQUE7SUFDOUMsS0FBQSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU07SUFBRSxTQUFBLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsS0FBQSxPQUFPLElBQUk7SUFDYixDQUFBOzs7Ozs7O0lDaHBCQTs7SUFFRztBQTRDSCxVQUFNLFdBQVcsR0FBRztJQUNoQixJQUFBLFNBQVMsRUFBRUEscUJBQVk7SUFDdkIsSUFBQSxTQUFTLEVBQUVDLHFCQUFZO2VBQ3ZCQyxpQkFBSztpQkFDTEMsbUJBQU87ZUFDUEMsaUJBQUs7bUJBQ0xDLHFCQUFTO3NCQUNUQyx3QkFBWTs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9