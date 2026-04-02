/*!
 * @cdp/extension-path2regexp 0.9.22
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
    	            const value = chars[index++];
    	            if (value === end) {
    	                writePath();
    	                return output;
    	            }
    	            if (value === "\\") {
    	                if (index === chars.length) {
    	                    throw new PathError(`Unexpected end after \\ at index ${index}`, str);
    	                }
    	                path += chars[index++];
    	                continue;
    	            }
    	            if (value === ":" || value === "*") {
    	                const type = value === ":" ? "param" : "wildcard";
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
    	            if (value === "{") {
    	                writePath();
    	                output.push({
    	                    type: "group",
    	                    tokens: consumeUntil("}"),
    	                });
    	                continue;
    	            }
    	            if (value === "}" ||
    	                value === "(" ||
    	                value === ")" ||
    	                value === "[" ||
    	                value === "]" ||
    	                value === "+" ||
    	                value === "?" ||
    	                value === "!") {
    	                throw new PathError(`Unexpected ${value} at index ${index - 1}`, str);
    	            }
    	            path += value;
    	        }
    	        if (end) {
    	            throw new PathError(`Unexpected end at index ${index}, expected ${end}`, str);
    	        }
    	        writePath();
    	        return output;
    	    }
    	    return new TokenData(consumeUntil(""), str);
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
    	            return result;
    	        };
    	    }
    	    return (data, missing) => {
    	        const value = data[token.name];
    	        if (value == null) {
    	            missing.push(token.name);
    	            return "";
    	        }
    	        if (typeof value !== "string") {
    	            throw new TypeError(`Expected "${token.name}" to be a string`);
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
    	            source += toRegExpSource(tokens, delimiter, keys, data.originalPath);
    	            combinations++;
    	        });
    	    }
    	    process(path);
    	    let pattern = `^(?:${source})`;
    	    if (trailing)
    	        pattern += "(?:" + escape(delimiter) + "$)?";
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
    	function toRegExpSource(tokens, delimiter, keys, originalPath) {
    	    let result = "";
    	    let backtrack = "";
    	    let wildcardBacktrack = "";
    	    let prevCaptureType = 0;
    	    let hasSegmentCapture = 0;
    	    let index = 0;
    	    function hasInSegment(index, type) {
    	        while (index < tokens.length) {
    	            const token = tokens[index++];
    	            if (token.type === type)
    	                return true;
    	            if (token.type === "text") {
    	                if (token.value.includes(delimiter))
    	                    break;
    	            }
    	        }
    	        return false;
    	    }
    	    function peekText(index) {
    	        let result = "";
    	        while (index < tokens.length) {
    	            const token = tokens[index++];
    	            if (token.type !== "text")
    	                break;
    	            result += token.value;
    	        }
    	        return result;
    	    }
    	    while (index < tokens.length) {
    	        const token = tokens[index++];
    	        if (token.type === "text") {
    	            result += escape(token.value);
    	            backtrack += token.value;
    	            if (prevCaptureType === 2)
    	                wildcardBacktrack += token.value;
    	            if (token.value.includes(delimiter))
    	                hasSegmentCapture = 0;
    	            continue;
    	        }
    	        if (token.type === "param" || token.type === "wildcard") {
    	            if (prevCaptureType && !backtrack) {
    	                throw new PathError(`Missing text before "${token.name}" ${token.type}`, originalPath);
    	            }
    	            if (token.type === "param") {
    	                result +=
    	                    hasSegmentCapture & 2 // Seen wildcard in segment.
    	                        ? `(${negate(delimiter, backtrack)}+)`
    	                        : hasInSegment(index, "wildcard") // See wildcard later in segment.
    	                            ? `(${negate(delimiter, peekText(index))}+)`
    	                            : hasSegmentCapture & 1 // Seen parameter in segment.
    	                                ? `(${negate(delimiter, backtrack)}+|${escape(backtrack)})`
    	                                : `(${negate(delimiter, "")}+)`;
    	                hasSegmentCapture |= prevCaptureType = 1;
    	            }
    	            else {
    	                result +=
    	                    hasSegmentCapture & 2 // Seen wildcard in segment.
    	                        ? `(${negate(backtrack, "")}+)`
    	                        : wildcardBacktrack // No capture in segment, seen wildcard in path.
    	                            ? `(${negate(wildcardBacktrack, "")}+|${negate(delimiter, "")}+)`
    	                            : `([^]+)`;
    	                wildcardBacktrack = "";
    	                hasSegmentCapture |= prevCaptureType = 2;
    	            }
    	            keys.push(token);
    	            backtrack = "";
    	            continue;
    	        }
    	        throw new TypeError(`Unknown token type: ${token.type}`);
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
    	 * Stringify an array of tokens into a path string.
    	 */
    	function stringifyTokens(tokens, index) {
    	    let value = "";
    	    while (index < tokens.length) {
    	        const token = tokens[index++];
    	        if (token.type === "text") {
    	            value += escapeText(token.value);
    	            continue;
    	        }
    	        if (token.type === "group") {
    	            value += "{" + stringifyTokens(token.tokens, 0) + "}";
    	            continue;
    	        }
    	        if (token.type === "param") {
    	            value += ":" + stringifyName(token.name, tokens[index]);
    	            continue;
    	        }
    	        if (token.type === "wildcard") {
    	            value += "*" + stringifyName(token.name, tokens[index]);
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
    	    return stringifyTokens(data.tokens, 0);
    	}
    	/**
    	 * Stringify a parameter name, escaping when it cannot be emitted directly.
    	 */
    	function stringifyName(name, next) {
    	    if (!ID.test(name))
    	        return JSON.stringify(name);
    	    if ((next === null || next === void 0 ? void 0 : next.type) === "text" && ID_CONTINUE.test(next.value[0])) {
    	        return JSON.stringify(name);
    	    }
    	    return name;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX1NUQVJUID0gL15bJF9cXHB7SURfU3RhcnR9XSQvdTtcbmNvbnN0IElEX0NPTlRJTlVFID0gL15bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0kL3U7XG5jb25zdCBJRCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV1bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0qJC91O1xuXG4vKipcbiAqIEVuY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBFbmNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG4vKipcbiAqIERlY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBEZWNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzLlxuICAgKi9cbiAgZW5jb2RlUGF0aD86IEVuY29kZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIE1hdGNoZXMgdGhlIHBhdGggY29tcGxldGVseSB3aXRob3V0IHRyYWlsaW5nIGNoYXJhY3RlcnMuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3dzIG9wdGlvbmFsIHRyYWlsaW5nIGRlbGltaXRlciB0byBtYXRjaC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHRyYWlsaW5nPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE1hdGNoIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaE9wdGlvbnMgZXh0ZW5kcyBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBkZWNvZGluZyBzdHJpbmdzIGZvciBwYXJhbXMsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBkZWNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZGVjb2RlPzogRGVjb2RlIHwgZmFsc2U7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZU9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEVzY2FwZSB0ZXh0IGZvciBzdHJpbmdpZnkgdG8gcGF0aC5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlVGV4dChzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1t7fSgpXFxbXFxdKz8hOipcXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGUoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bLisqP14ke30oKVtcXF18L1xcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuXG4vKipcbiAqIFBsYWluIHRleHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGV4dCB7XG4gIHR5cGU6IFwidGV4dFwiO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIGFyYml0cmFyeSB0ZXh0IHdpdGhpbiBhIHNlZ21lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyIHtcbiAgdHlwZTogXCJwYXJhbVwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB3aWxkY2FyZCBwYXJhbWV0ZXIgZGVzaWduZWQgdG8gbWF0Y2ggbXVsdGlwbGUgc2VnbWVudHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgV2lsZGNhcmQge1xuICB0eXBlOiBcIndpbGRjYXJkXCI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHNldCBvZiBwb3NzaWJsZSB0b2tlbnMgdG8gZXhwYW5kIHdoZW4gbWF0Y2hpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JvdXAge1xuICB0eXBlOiBcImdyb3VwXCI7XG4gIHRva2VuczogVG9rZW5bXTtcbn1cblxuLyoqXG4gKiBBIHRva2VuIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIHJlZ2V4cCBjYXB0dXJlLlxuICovXG5leHBvcnQgdHlwZSBLZXkgPSBQYXJhbWV0ZXIgfCBXaWxkY2FyZDtcblxuLyoqXG4gKiBBIHNlcXVlbmNlIG9mIGBwYXRoLXRvLXJlZ2V4cGAga2V5cyB0aGF0IG1hdGNoIGNhcHR1cmluZyBncm91cHMuXG4gKi9cbmV4cG9ydCB0eXBlIEtleXMgPSBBcnJheTxLZXk+O1xuXG4vKipcbiAqIEEgc2VxdWVuY2Ugb2YgcGF0aCBtYXRjaCBjaGFyYWN0ZXJzLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IFRleHQgfCBQYXJhbWV0ZXIgfCBXaWxkY2FyZCB8IEdyb3VwO1xuXG4vKipcbiAqIFRva2VuaXplZCBwYXRoIGluc3RhbmNlLlxuICovXG5leHBvcnQgY2xhc3MgVG9rZW5EYXRhIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHRva2VuczogVG9rZW5bXSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3JpZ2luYWxQYXRoPzogc3RyaW5nLFxuICApIHt9XG59XG5cbi8qKlxuICogUGFyc2VFcnJvciBpcyB0aHJvd24gd2hlbiB0aGVyZSBpcyBhbiBlcnJvciBwcm9jZXNzaW5nIHRoZSBwYXRoLlxuICovXG5leHBvcnQgY2xhc3MgUGF0aEVycm9yIGV4dGVuZHMgVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBvcmlnaW5hbFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgKSB7XG4gICAgbGV0IHRleHQgPSBtZXNzYWdlO1xuICAgIGlmIChvcmlnaW5hbFBhdGgpIHRleHQgKz0gYDogJHtvcmlnaW5hbFBhdGh9YDtcbiAgICB0ZXh0ICs9IGA7IHZpc2l0IGh0dHBzOi8vZ2l0Lm5ldy9wYXRoVG9SZWdleHBFcnJvciBmb3IgaW5mb2A7XG4gICAgc3VwZXIodGV4dCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhIHN0cmluZyBmb3IgdGhlIHJhdyB0b2tlbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShzdHI6IHN0cmluZywgb3B0aW9uczogUGFyc2VPcHRpb25zID0ge30pOiBUb2tlbkRhdGEge1xuICBjb25zdCB7IGVuY29kZVBhdGggPSBOT09QX1ZBTFVFIH0gPSBvcHRpb25zO1xuICBjb25zdCBjaGFycyA9IFsuLi5zdHJdO1xuICBsZXQgaW5kZXggPSAwO1xuXG4gIGZ1bmN0aW9uIGNvbnN1bWVVbnRpbChlbmQ6IHN0cmluZyk6IFRva2VuW10ge1xuICAgIGNvbnN0IG91dHB1dDogVG9rZW5bXSA9IFtdO1xuICAgIGxldCBwYXRoID0gXCJcIjtcblxuICAgIGZ1bmN0aW9uIHdyaXRlUGF0aCgpIHtcbiAgICAgIGlmICghcGF0aCkgcmV0dXJuO1xuICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgdmFsdWU6IGVuY29kZVBhdGgocGF0aCksXG4gICAgICB9KTtcbiAgICAgIHBhdGggPSBcIlwiO1xuICAgIH1cblxuICAgIHdoaWxlIChpbmRleCA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgY29uc3QgdmFsdWUgPSBjaGFyc1tpbmRleCsrXTtcblxuICAgICAgaWYgKHZhbHVlID09PSBlbmQpIHtcbiAgICAgICAgd3JpdGVQYXRoKCk7XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICB9XG5cbiAgICAgIGlmICh2YWx1ZSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSBjaGFycy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBVbmV4cGVjdGVkIGVuZCBhZnRlciBcXFxcIGF0IGluZGV4ICR7aW5kZXh9YCwgc3RyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhdGggKz0gY2hhcnNbaW5kZXgrK107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodmFsdWUgPT09IFwiOlwiIHx8IHZhbHVlID09PSBcIipcIikge1xuICAgICAgICBjb25zdCB0eXBlID0gdmFsdWUgPT09IFwiOlwiID8gXCJwYXJhbVwiIDogXCJ3aWxkY2FyZFwiO1xuICAgICAgICBsZXQgbmFtZSA9IFwiXCI7XG5cbiAgICAgICAgaWYgKElEX1NUQVJULnRlc3QoY2hhcnNbaW5kZXhdKSkge1xuICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgIG5hbWUgKz0gY2hhcnNbaW5kZXgrK107XG4gICAgICAgICAgfSB3aGlsZSAoSURfQ09OVElOVUUudGVzdChjaGFyc1tpbmRleF0pKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFyc1tpbmRleF0gPT09ICdcIicpIHtcbiAgICAgICAgICBsZXQgcXVvdGVTdGFydCA9IGluZGV4O1xuXG4gICAgICAgICAgd2hpbGUgKGluZGV4IDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoY2hhcnNbKytpbmRleF0gPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgICAgcXVvdGVTdGFydCA9IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbmNyZW1lbnQgb3ZlciBlc2NhcGUgY2hhcmFjdGVycy5cbiAgICAgICAgICAgIGlmIChjaGFyc1tpbmRleF0gPT09IFwiXFxcXFwiKSBpbmRleCsrO1xuXG4gICAgICAgICAgICBuYW1lICs9IGNoYXJzW2luZGV4XTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocXVvdGVTdGFydCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcbiAgICAgICAgICAgICAgYFVudGVybWluYXRlZCBxdW90ZSBhdCBpbmRleCAke3F1b3RlU3RhcnR9YCxcbiAgICAgICAgICAgICAgc3RyLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0IGluZGV4ICR7aW5kZXh9YCwgc3RyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdyaXRlUGF0aCgpO1xuICAgICAgICBvdXRwdXQucHVzaCh7IHR5cGUsIG5hbWUgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodmFsdWUgPT09IFwie1wiKSB7XG4gICAgICAgIHdyaXRlUGF0aCgpO1xuICAgICAgICBvdXRwdXQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgICAgIHRva2VuczogY29uc3VtZVVudGlsKFwifVwiKSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoXG4gICAgICAgIHZhbHVlID09PSBcIn1cIiB8fFxuICAgICAgICB2YWx1ZSA9PT0gXCIoXCIgfHxcbiAgICAgICAgdmFsdWUgPT09IFwiKVwiIHx8XG4gICAgICAgIHZhbHVlID09PSBcIltcIiB8fFxuICAgICAgICB2YWx1ZSA9PT0gXCJdXCIgfHxcbiAgICAgICAgdmFsdWUgPT09IFwiK1wiIHx8XG4gICAgICAgIHZhbHVlID09PSBcIj9cIiB8fFxuICAgICAgICB2YWx1ZSA9PT0gXCIhXCJcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBVbmV4cGVjdGVkICR7dmFsdWV9IGF0IGluZGV4ICR7aW5kZXggLSAxfWAsIHN0cik7XG4gICAgICB9XG5cbiAgICAgIHBhdGggKz0gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKGVuZCkge1xuICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcbiAgICAgICAgYFVuZXhwZWN0ZWQgZW5kIGF0IGluZGV4ICR7aW5kZXh9LCBleHBlY3RlZCAke2VuZH1gLFxuICAgICAgICBzdHIsXG4gICAgICApO1xuICAgIH1cblxuICAgIHdyaXRlUGF0aCgpO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICByZXR1cm4gbmV3IFRva2VuRGF0YShjb25zdW1lVW50aWwoXCJcIiksIHN0cik7XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIFBhcmFtRGF0YSA9IFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3QgeyBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IGRhdGEgPSB0eXBlb2YgcGF0aCA9PT0gXCJvYmplY3RcIiA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3QgZm4gPSB0b2tlbnNUb0Z1bmN0aW9uKGRhdGEudG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHBhdGgocGFyYW1zOiBQID0ge30gYXMgUCkge1xuICAgIGNvbnN0IG1pc3Npbmc6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgcGF0aCA9IGZuKHBhcmFtcywgbWlzc2luZyk7XG5cbiAgICBpZiAobWlzc2luZy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyczogJHttaXNzaW5nLmpvaW4oXCIsIFwiKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXT4+O1xuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogSW50ZXJuYWwgcGF0aCBidWlsZGVyIGZ1bmN0aW9uLlxuICovXG50eXBlIFRva2VuRW5jb2RlciA9IChkYXRhOiBQYXJhbURhdGEsIG1pc3Npbmc6IHN0cmluZ1tdKSA9PiBzdHJpbmc7XG5cbmZ1bmN0aW9uIHRva2Vuc1RvRnVuY3Rpb24oXG4gIHRva2VuczogVG9rZW5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pOiBUb2tlbkVuY29kZXIge1xuICBjb25zdCBlbmNvZGVycyA9IHRva2Vucy5tYXAoKHRva2VuKSA9PlxuICAgIHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZGVsaW1pdGVyLCBlbmNvZGUpLFxuICApO1xuXG4gIHJldHVybiAoZGF0YTogUGFyYW1EYXRhLCBtaXNzaW5nOiBzdHJpbmdbXSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuXG4gICAgZm9yIChjb25zdCBlbmNvZGVyIG9mIGVuY29kZXJzKSB7XG4gICAgICByZXN1bHQgKz0gZW5jb2RlcihkYXRhLCBtaXNzaW5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzaW5nbGUgdG9rZW4gaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRva2VuVG9GdW5jdGlvbihcbiAgdG9rZW46IFRva2VuLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbik6IFRva2VuRW5jb2RlciB7XG4gIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikgcmV0dXJuICgpID0+IHRva2VuLnZhbHVlO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24odG9rZW4udG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgICByZXR1cm4gKGRhdGEsIG1pc3NpbmcpID0+IHtcbiAgICAgIGNvbnN0IGxlbiA9IG1pc3NpbmcubGVuZ3RoO1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihkYXRhLCBtaXNzaW5nKTtcbiAgICAgIGlmIChtaXNzaW5nLmxlbmd0aCA9PT0gbGVuKSByZXR1cm4gdmFsdWU7XG5cbiAgICAgIG1pc3NpbmcubGVuZ3RoID0gbGVuOyAvLyBSZXNldCBvcHRpb25hbCBncm91cC5cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBlbmNvZGVWYWx1ZSA9IGVuY29kZSB8fCBOT09QX1ZBTFVFO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIgJiYgZW5jb2RlICE9PSBmYWxzZSkge1xuICAgIHJldHVybiAoZGF0YSwgbWlzc2luZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgbWlzc2luZy5wdXNoKHRva2VuLm5hbWUpO1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBub24tZW1wdHkgYXJyYXlgKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdCA9IFwiXCI7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZVtpXSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2l9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpID4gMCkgcmVzdWx0ICs9IGRlbGltaXRlcjtcbiAgICAgICAgcmVzdWx0ICs9IGVuY29kZVZhbHVlKHZhbHVlW2ldKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhLCBtaXNzaW5nKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICBtaXNzaW5nLnB1c2godG9rZW4ubmFtZSk7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgIH1cblxuICAgIHJldHVybiBlbmNvZGVWYWx1ZSh2YWx1ZSk7XG4gIH07XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiB7XG4gIHBhdGg6IHN0cmluZztcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAocGF0aDogc3RyaW5nKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBTdXBwb3J0ZWQgcGF0aCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBwYXRoIGludG8gYSBtYXRjaCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoIHwgUGF0aFtdLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgeyByZWdleHAsIGtleXMgfSA9IHBhdGhUb1JlZ2V4cChwYXRoLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlID09PSBmYWxzZSkgcmV0dXJuIE5PT1BfVkFMVUU7XG4gICAgaWYgKGtleS50eXBlID09PSBcInBhcmFtXCIpIHJldHVybiBkZWNvZGU7XG4gICAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5zcGxpdChkZWxpbWl0ZXIpLm1hcChkZWNvZGUpO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2goaW5wdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZWdleHAuZXhlYyhpbnB1dCk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBwYXRoID0gbVswXTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG4gICAgICBjb25zdCBkZWNvZGVyID0gZGVjb2RlcnNbaSAtIDFdO1xuICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZXIobVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgcGFyYW1zIH07XG4gIH07XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgcGF0aCBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uIGFuZCBjYXB0dXJlIGtleXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9SZWdleHAoXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7XG4gICAgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIsXG4gICAgZW5kID0gdHJ1ZSxcbiAgICBzZW5zaXRpdmUgPSBmYWxzZSxcbiAgICB0cmFpbGluZyA9IHRydWUsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBrZXlzOiBLZXlzID0gW107XG4gIGxldCBzb3VyY2UgPSBcIlwiO1xuICBsZXQgY29tYmluYXRpb25zID0gMDtcblxuICBmdW5jdGlvbiBwcm9jZXNzKHBhdGg6IFBhdGggfCBQYXRoW10pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgICAgZm9yIChjb25zdCBwIG9mIHBhdGgpIHByb2Nlc3MocCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHR5cGVvZiBwYXRoID09PSBcIm9iamVjdFwiID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICAgIGZsYXR0ZW4oZGF0YS50b2tlbnMsIDAsIFtdLCAodG9rZW5zKSA9PiB7XG4gICAgICBpZiAoY29tYmluYXRpb25zID49IDI1Nikge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFwiVG9vIG1hbnkgcGF0aCBjb21iaW5hdGlvbnNcIiwgZGF0YS5vcmlnaW5hbFBhdGgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tYmluYXRpb25zID4gMCkgc291cmNlICs9IFwifFwiO1xuICAgICAgc291cmNlICs9IHRvUmVnRXhwU291cmNlKHRva2VucywgZGVsaW1pdGVyLCBrZXlzLCBkYXRhLm9yaWdpbmFsUGF0aCk7XG4gICAgICBjb21iaW5hdGlvbnMrKztcbiAgICB9KTtcbiAgfVxuXG4gIHByb2Nlc3MocGF0aCk7XG5cbiAgbGV0IHBhdHRlcm4gPSBgXig/OiR7c291cmNlfSlgO1xuICBpZiAodHJhaWxpbmcpIHBhdHRlcm4gKz0gXCIoPzpcIiArIGVzY2FwZShkZWxpbWl0ZXIpICsgXCIkKT9cIjtcbiAgcGF0dGVybiArPSBlbmQgPyBcIiRcIiA6IFwiKD89XCIgKyBlc2NhcGUoZGVsaW1pdGVyKSArIFwifCQpXCI7XG5cbiAgcmV0dXJuIHsgcmVnZXhwOiBuZXcgUmVnRXhwKHBhdHRlcm4sIHNlbnNpdGl2ZSA/IFwiXCIgOiBcImlcIiksIGtleXMgfTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGZsYXQgbGlzdCBvZiBzZXF1ZW5jZSB0b2tlbnMgZnJvbSB0aGUgZ2l2ZW4gdG9rZW5zLlxuICovXG5mdW5jdGlvbiBmbGF0dGVuKFxuICB0b2tlbnM6IFRva2VuW10sXG4gIGluZGV4OiBudW1iZXIsXG4gIHJlc3VsdDogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10sXG4gIGNhbGxiYWNrOiAocmVzdWx0OiBFeGNsdWRlPFRva2VuLCBHcm91cD5bXSkgPT4gdm9pZCxcbik6IHZvaWQge1xuICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICBjb25zdCBsZW4gPSByZXN1bHQubGVuZ3RoO1xuICAgICAgZmxhdHRlbih0b2tlbi50b2tlbnMsIDAsIHJlc3VsdCwgKHNlcSkgPT5cbiAgICAgICAgZmxhdHRlbih0b2tlbnMsIGluZGV4LCBzZXEsIGNhbGxiYWNrKSxcbiAgICAgICk7XG4gICAgICByZXN1bHQubGVuZ3RoID0gbGVuO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzdWx0LnB1c2godG9rZW4pO1xuICB9XG5cbiAgY2FsbGJhY2socmVzdWx0KTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBmbGF0IHNlcXVlbmNlIG9mIHRva2VucyBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uLlxuICovXG5mdW5jdGlvbiB0b1JlZ0V4cFNvdXJjZShcbiAgdG9rZW5zOiBFeGNsdWRlPFRva2VuLCBHcm91cD5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGtleXM6IEtleXMsXG4gIG9yaWdpbmFsUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuKTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gIGxldCBiYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgd2lsZGNhcmRCYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgcHJldkNhcHR1cmVUeXBlOiAwIHwgMSB8IDIgPSAwO1xuICBsZXQgaGFzU2VnbWVudENhcHR1cmUgPSAwO1xuICBsZXQgaW5kZXggPSAwO1xuXG4gIGZ1bmN0aW9uIGhhc0luU2VnbWVudChpbmRleDogbnVtYmVyLCB0eXBlOiBUb2tlbltcInR5cGVcIl0pIHtcbiAgICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSB0eXBlKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikge1xuICAgICAgICBpZiAodG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKSkgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZWtUZXh0KGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcbiAgICAgIGlmICh0b2tlbi50eXBlICE9PSBcInRleHRcIikgYnJlYWs7XG4gICAgICByZXN1bHQgKz0gdG9rZW4udmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgIHJlc3VsdCArPSBlc2NhcGUodG9rZW4udmFsdWUpO1xuICAgICAgYmFja3RyYWNrICs9IHRva2VuLnZhbHVlO1xuICAgICAgaWYgKHByZXZDYXB0dXJlVHlwZSA9PT0gMikgd2lsZGNhcmRCYWNrdHJhY2sgKz0gdG9rZW4udmFsdWU7XG4gICAgICBpZiAodG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKSkgaGFzU2VnbWVudENhcHR1cmUgPSAwO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIiB8fCB0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIGlmIChwcmV2Q2FwdHVyZVR5cGUgJiYgIWJhY2t0cmFjaykge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFxuICAgICAgICAgIGBNaXNzaW5nIHRleHQgYmVmb3JlIFwiJHt0b2tlbi5uYW1lfVwiICR7dG9rZW4udHlwZX1gLFxuICAgICAgICAgIG9yaWdpbmFsUGF0aCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikge1xuICAgICAgICByZXN1bHQgKz1cbiAgICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSAmIDIgLy8gU2VlbiB3aWxkY2FyZCBpbiBzZWdtZW50LlxuICAgICAgICAgICAgPyBgKCR7bmVnYXRlKGRlbGltaXRlciwgYmFja3RyYWNrKX0rKWBcbiAgICAgICAgICAgIDogaGFzSW5TZWdtZW50KGluZGV4LCBcIndpbGRjYXJkXCIpIC8vIFNlZSB3aWxkY2FyZCBsYXRlciBpbiBzZWdtZW50LlxuICAgICAgICAgICAgICA/IGAoJHtuZWdhdGUoZGVsaW1pdGVyLCBwZWVrVGV4dChpbmRleCkpfSspYFxuICAgICAgICAgICAgICA6IGhhc1NlZ21lbnRDYXB0dXJlICYgMSAvLyBTZWVuIHBhcmFtZXRlciBpbiBzZWdtZW50LlxuICAgICAgICAgICAgICAgID8gYCgke25lZ2F0ZShkZWxpbWl0ZXIsIGJhY2t0cmFjayl9K3wke2VzY2FwZShiYWNrdHJhY2spfSlgXG4gICAgICAgICAgICAgICAgOiBgKCR7bmVnYXRlKGRlbGltaXRlciwgXCJcIil9KylgO1xuXG4gICAgICAgIGhhc1NlZ21lbnRDYXB0dXJlIHw9IHByZXZDYXB0dXJlVHlwZSA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgKz1cbiAgICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSAmIDIgLy8gU2VlbiB3aWxkY2FyZCBpbiBzZWdtZW50LlxuICAgICAgICAgICAgPyBgKCR7bmVnYXRlKGJhY2t0cmFjaywgXCJcIil9KylgXG4gICAgICAgICAgICA6IHdpbGRjYXJkQmFja3RyYWNrIC8vIE5vIGNhcHR1cmUgaW4gc2VnbWVudCwgc2VlbiB3aWxkY2FyZCBpbiBwYXRoLlxuICAgICAgICAgICAgICA/IGAoJHtuZWdhdGUod2lsZGNhcmRCYWNrdHJhY2ssIFwiXCIpfSt8JHtuZWdhdGUoZGVsaW1pdGVyLCBcIlwiKX0rKWBcbiAgICAgICAgICAgICAgOiBgKFteXSspYDtcblxuICAgICAgICB3aWxkY2FyZEJhY2t0cmFjayA9IFwiXCI7XG4gICAgICAgIGhhc1NlZ21lbnRDYXB0dXJlIHw9IHByZXZDYXB0dXJlVHlwZSA9IDI7XG4gICAgICB9XG5cbiAgICAgIGtleXMucHVzaCh0b2tlbik7XG4gICAgICBiYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5rbm93biB0b2tlbiB0eXBlOiAkeyh0b2tlbiBhcyBhbnkpLnR5cGV9YCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEJsb2NrIGJhY2t0cmFja2luZyBvbiBwcmV2aW91cyB0ZXh0L2RlbGltaXRlci5cbiAqL1xuZnVuY3Rpb24gbmVnYXRlKGE6IHN0cmluZywgYjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGIubGVuZ3RoID4gYS5sZW5ndGgpIHJldHVybiBuZWdhdGUoYiwgYSk7IC8vIExvbmdlc3Qgc3RyaW5nIGZpcnN0LlxuXG4gIGlmIChhID09PSBiKSBiID0gXCJcIjsgLy8gQ2xlYW5lciByZWdleCBzdHJpbmdzLCBubyBkdXBsaWNhdGlvbi5cbiAgaWYgKGIubGVuZ3RoID4gMSkgcmV0dXJuIGAoPzooPyEke2VzY2FwZShhKX18JHtlc2NhcGUoYil9KVteXSlgO1xuICBpZiAoYS5sZW5ndGggPiAxKSByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGEpfSlbXiR7ZXNjYXBlKGIpfV0pYDtcbiAgcmV0dXJuIGBbXiR7ZXNjYXBlKGEgKyBiKX1dYDtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgYW4gYXJyYXkgb2YgdG9rZW5zIGludG8gYSBwYXRoIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5VG9rZW5zKHRva2VuczogVG9rZW5bXSwgaW5kZXg6IG51bWJlcik6IHN0cmluZyB7XG4gIGxldCB2YWx1ZSA9IFwiXCI7XG5cbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICB2YWx1ZSArPSBlc2NhcGVUZXh0KHRva2VuLnZhbHVlKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgIHZhbHVlICs9IFwie1wiICsgc3RyaW5naWZ5VG9rZW5zKHRva2VuLnRva2VucywgMCkgKyBcIn1cIjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgIHZhbHVlICs9IFwiOlwiICsgc3RyaW5naWZ5TmFtZSh0b2tlbi5uYW1lLCB0b2tlbnNbaW5kZXhdKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIHZhbHVlICs9IFwiKlwiICsgc3RyaW5naWZ5TmFtZSh0b2tlbi5uYW1lLCB0b2tlbnNbaW5kZXhdKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVua25vd24gdG9rZW4gdHlwZTogJHsodG9rZW4gYXMgYW55KS50eXBlfWApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFN0cmluZ2lmeSB0b2tlbiBkYXRhIGludG8gYSBwYXRoIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ2lmeShkYXRhOiBUb2tlbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gc3RyaW5naWZ5VG9rZW5zKGRhdGEudG9rZW5zLCAwKTtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgYSBwYXJhbWV0ZXIgbmFtZSwgZXNjYXBpbmcgd2hlbiBpdCBjYW5ub3QgYmUgZW1pdHRlZCBkaXJlY3RseS5cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5TmFtZShuYW1lOiBzdHJpbmcsIG5leHQ6IFRva2VuIHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgaWYgKCFJRC50ZXN0KG5hbWUpKSByZXR1cm4gSlNPTi5zdHJpbmdpZnkobmFtZSk7XG5cbiAgaWYgKG5leHQ/LnR5cGUgPT09IFwidGV4dFwiICYmIElEX0NPTlRJTlVFLnRlc3QobmV4dC52YWx1ZVswXSkpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobmFtZSk7XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgRW5jb2RlIGFzIHAyckVuY29kZSxcbiAgICB0eXBlIERlY29kZSBhcyBwMnJEZWNvZGUsXG4gICAgdHlwZSBQYXJzZU9wdGlvbnMgYXMgcDJyUGFyc2VPcHRpb25zLFxuICAgIHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyBhcyBwMnJQYXRoVG9SZWdleHBPcHRpb25zLFxuICAgIHR5cGUgTWF0Y2hPcHRpb25zIGFzIHAyck1hdGNoT3B0aW9ucyxcbiAgICB0eXBlIENvbXBpbGVPcHRpb25zIGFzIHAyckNvbXBpbGVPcHRpb25zLFxuICAgIHR5cGUgUGFyYW1EYXRhIGFzIHAyclBhcmFtRGF0YSxcbiAgICB0eXBlIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgdHlwZSBNYXRjaFJlc3VsdCBhcyBwMnJNYXRjaFJlc3VsdCxcbiAgICB0eXBlIE1hdGNoIGFzIHAyck1hdGNoLFxuICAgIHR5cGUgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIHR5cGUgS2V5IGFzIHAycktleSxcbiAgICB0eXBlIFRva2VuIGFzIHAyclRva2VuLFxuICAgIHR5cGUgUGF0aCBhcyBwMnJQYXRoLFxuICAgIFRva2VuRGF0YSBhcyBwMnJUb2tlbkRhdGEsXG4gICAgUGF0aEVycm9yIGFzIHAyclBhdGhFcnJvcixcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHN0cmluZ2lmeSxcbiAgICBwYXRoVG9SZWdleHAsXG59IGZyb20gJ3BhdGgtdG8tcmVnZXhwJztcblxuZGVjbGFyZSBuYW1lc3BhY2UgcGF0aDJyZWdleHAge1xuICAgIGV4cG9ydCB0eXBlIEVuY29kZSA9IHAyckVuY29kZTtcbiAgICBleHBvcnQgdHlwZSBEZWNvZGUgPSBwMnJEZWNvZGU7XG4gICAgZXhwb3J0IHR5cGUgUGFyc2VPcHRpb25zID0gcDJyUGFyc2VPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgPSBwMnJQYXRoVG9SZWdleHBPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoT3B0aW9ucyA9IHAyck1hdGNoT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBDb21waWxlT3B0aW9ucyA9IHAyckNvbXBpbGVPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRva2VuRGF0YSA9IHAyclRva2VuRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXJhbURhdGEgPSBwMnJQYXJhbURhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyUGF0aEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2hSZXN1bHQ8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2hGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBLZXkgPSBwMnJLZXk7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW4gPSBwMnJUb2tlbjtcbiAgICBleHBvcnQgdHlwZSBQYXRoID0gcDJyUGF0aDtcbn1cblxuY29uc3QgcGF0aDJyZWdleHAgPSB7XG4gICAgVG9rZW5EYXRhOiBwMnJUb2tlbkRhdGEsXG4gICAgUGF0aEVycm9yOiBwMnJQYXRoRXJyb3IsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICBtYXRjaCxcbiAgICBzdHJpbmdpZnksXG4gICAgcGF0aFRvUmVnZXhwLFxufTtcblxuZXhwb3J0IHsgcGF0aDJyZWdleHAgfTtcbiJdLCJuYW1lcyI6WyJwMnJUb2tlbkRhdGEiLCJwMnJQYXRoRXJyb3IiLCJwYXJzZSIsImNvbXBpbGUiLCJtYXRjaCIsInN0cmluZ2lmeSIsInBhdGhUb1JlZ2V4cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7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QUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUN2RDs7YUFHRixNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsb0JBQUEsRUFBd0IsS0FBYSxDQUFDLElBQUksQ0FBQSxDQUFFLENBQUM7O0lBR25FLEtBQUEsT0FBTyxLQUFLO0lBQ2QsQ0FBQTtJQUVBOztJQUVHO0tBQ0gsU0FBZ0IsU0FBUyxDQUFDLElBQWUsRUFBQTtTQUN2QyxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN4QyxDQUFBO0lBRUE7O0lBRUc7SUFDSCxDQUFBLFNBQVMsYUFBYSxDQUFDLElBQVksRUFBRSxJQUF1QixFQUFBO0lBQzFELEtBQUEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQUUsU0FBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1NBRS9DLElBQUksQ0FBQSxJQUFJLEtBQUEsSUFBQSxJQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLElBQUksTUFBSyxNQUFNLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDNUQsU0FBQSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDOztJQUc3QixLQUFBLE9BQU8sSUFBSTtJQUNiLENBQUE7Ozs7Ozs7SUM1cEJBOztJQUVHO0FBNENILFVBQU0sV0FBVyxHQUFHO0lBQ2hCLElBQUEsU0FBUyxFQUFFQSxxQkFBWTtJQUN2QixJQUFBLFNBQVMsRUFBRUMscUJBQVk7ZUFDdkJDLGlCQUFLO2lCQUNMQyxtQkFBTztlQUNQQyxpQkFBSzttQkFDTEMscUJBQVM7c0JBQ1RDLHdCQUFZOzs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAvIn0=