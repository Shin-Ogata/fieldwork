/*!
 * @cdp/extension-path2regexp 0.9.22
 *   extension for conversion path to regexp library
 */

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

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9TVEFSVCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV0kL3U7XG5jb25zdCBJRF9DT05USU5VRSA9IC9eWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dJC91O1xuY29uc3QgSUQgPSAvXlskX1xccHtJRF9TdGFydH1dWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dKiQvdTtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogQSBmdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncy5cbiAgICovXG4gIGVuY29kZVBhdGg/OiBFbmNvZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBNYXRjaGVzIHRoZSBwYXRoIGNvbXBsZXRlbHkgd2l0aG91dCB0cmFpbGluZyBjaGFyYWN0ZXJzLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5kPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFsbG93cyBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBkZWxpbWl0ZXIgZm9yIHNlZ21lbnRzLiAoZGVmYXVsdDogYCcvJ2ApXG4gICAqL1xuICBkZWxpbWl0ZXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQgaW50byB0aGUgcGF0aCwgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGVuY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBlbmNvZGU/OiBFbmNvZGUgfCBmYWxzZTtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxuLyoqXG4gKiBFc2NhcGUgdGV4dCBmb3Igc3RyaW5naWZ5IHRvIHBhdGguXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVRleHQoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9be30oKVxcW1xcXSs/IToqXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvWy4rKj9eJHt9KClbXFxdfC9cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBQbGFpbiB0ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRleHQge1xuICB0eXBlOiBcInRleHRcIjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHBhcmFtZXRlciBkZXNpZ25lZCB0byBtYXRjaCBhcmJpdHJhcnkgdGV4dCB3aXRoaW4gYSBzZWdtZW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlciB7XG4gIHR5cGU6IFwicGFyYW1cIjtcbiAgbmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgd2lsZGNhcmQgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIG11bHRpcGxlIHNlZ21lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdpbGRjYXJkIHtcbiAgdHlwZTogXCJ3aWxkY2FyZFwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBzZXQgb2YgcG9zc2libGUgdG9rZW5zIHRvIGV4cGFuZCB3aGVuIG1hdGNoaW5nLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwIHtcbiAgdHlwZTogXCJncm91cFwiO1xuICB0b2tlbnM6IFRva2VuW107XG59XG5cbi8qKlxuICogQSB0b2tlbiB0aGF0IGNvcnJlc3BvbmRzIHdpdGggYSByZWdleHAgY2FwdHVyZS5cbiAqL1xuZXhwb3J0IHR5cGUgS2V5ID0gUGFyYW1ldGVyIHwgV2lsZGNhcmQ7XG5cbi8qKlxuICogQSBzZXF1ZW5jZSBvZiBgcGF0aC10by1yZWdleHBgIGtleXMgdGhhdCBtYXRjaCBjYXB0dXJpbmcgZ3JvdXBzLlxuICovXG5leHBvcnQgdHlwZSBLZXlzID0gQXJyYXk8S2V5PjtcblxuLyoqXG4gKiBBIHNlcXVlbmNlIG9mIHBhdGggbWF0Y2ggY2hhcmFjdGVycy5cbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBUZXh0IHwgUGFyYW1ldGVyIHwgV2lsZGNhcmQgfCBHcm91cDtcblxuLyoqXG4gKiBUb2tlbml6ZWQgcGF0aCBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRva2VuRGF0YSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSB0b2tlbnM6IFRva2VuW10sXG4gICAgcHVibGljIHJlYWRvbmx5IG9yaWdpbmFsUGF0aD86IHN0cmluZyxcbiAgKSB7fVxufVxuXG4vKipcbiAqIFBhcnNlRXJyb3IgaXMgdGhyb3duIHdoZW4gdGhlcmUgaXMgYW4gZXJyb3IgcHJvY2Vzc2luZyB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdGhFcnJvciBleHRlbmRzIFR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3JpZ2luYWxQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICkge1xuICAgIGxldCB0ZXh0ID0gbWVzc2FnZTtcbiAgICBpZiAob3JpZ2luYWxQYXRoKSB0ZXh0ICs9IGA6ICR7b3JpZ2luYWxQYXRofWA7XG4gICAgdGV4dCArPSBgOyB2aXNpdCBodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3IgZm9yIGluZm9gO1xuICAgIHN1cGVyKHRleHQpO1xuICB9XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5EYXRhIHtcbiAgY29uc3QgeyBlbmNvZGVQYXRoID0gTk9PUF9WQUxVRSB9ID0gb3B0aW9ucztcbiAgY29uc3QgY2hhcnMgPSBbLi4uc3RyXTtcbiAgbGV0IGluZGV4ID0gMDtcblxuICBmdW5jdGlvbiBjb25zdW1lVW50aWwoZW5kOiBzdHJpbmcpOiBUb2tlbltdIHtcbiAgICBjb25zdCBvdXRwdXQ6IFRva2VuW10gPSBbXTtcbiAgICBsZXQgcGF0aCA9IFwiXCI7XG5cbiAgICBmdW5jdGlvbiB3cml0ZVBhdGgoKSB7XG4gICAgICBpZiAoIXBhdGgpIHJldHVybjtcbiAgICAgIG91dHB1dC5wdXNoKHtcbiAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgIHZhbHVlOiBlbmNvZGVQYXRoKHBhdGgpLFxuICAgICAgfSk7XG4gICAgICBwYXRoID0gXCJcIjtcbiAgICB9XG5cbiAgICB3aGlsZSAoaW5kZXggPCBjaGFycy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gY2hhcnNbaW5kZXgrK107XG5cbiAgICAgIGlmICh2YWx1ZSA9PT0gZW5kKSB7XG4gICAgICAgIHdyaXRlUGF0aCgpO1xuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgfVxuXG4gICAgICBpZiAodmFsdWUgPT09IFwiXFxcXFwiKSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihgVW5leHBlY3RlZCBlbmQgYWZ0ZXIgXFxcXCBhdCBpbmRleCAke2luZGV4fWAsIHN0cik7XG4gICAgICAgIH1cblxuICAgICAgICBwYXRoICs9IGNoYXJzW2luZGV4KytdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHZhbHVlID09PSBcIjpcIiB8fCB2YWx1ZSA9PT0gXCIqXCIpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHZhbHVlID09PSBcIjpcIiA/IFwicGFyYW1cIiA6IFwid2lsZGNhcmRcIjtcbiAgICAgICAgbGV0IG5hbWUgPSBcIlwiO1xuXG4gICAgICAgIGlmIChJRF9TVEFSVC50ZXN0KGNoYXJzW2luZGV4XSkpIHtcbiAgICAgICAgICBkbyB7XG4gICAgICAgICAgICBuYW1lICs9IGNoYXJzW2luZGV4KytdO1xuICAgICAgICAgIH0gd2hpbGUgKElEX0NPTlRJTlVFLnRlc3QoY2hhcnNbaW5kZXhdKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhcnNbaW5kZXhdID09PSAnXCInKSB7XG4gICAgICAgICAgbGV0IHF1b3RlU3RhcnQgPSBpbmRleDtcblxuICAgICAgICAgIHdoaWxlIChpbmRleCA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKGNoYXJzWysraW5kZXhdID09PSAnXCInKSB7XG4gICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAgIHF1b3RlU3RhcnQgPSAwO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5jcmVtZW50IG92ZXIgZXNjYXBlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICBpZiAoY2hhcnNbaW5kZXhdID09PSBcIlxcXFxcIikgaW5kZXgrKztcblxuICAgICAgICAgICAgbmFtZSArPSBjaGFyc1tpbmRleF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHF1b3RlU3RhcnQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoXG4gICAgICAgICAgICAgIGBVbnRlcm1pbmF0ZWQgcXVvdGUgYXQgaW5kZXggJHtxdW90ZVN0YXJ0fWAsXG4gICAgICAgICAgICAgIHN0cixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXIgbmFtZSBhdCBpbmRleCAke2luZGV4fWAsIHN0cik7XG4gICAgICAgIH1cblxuICAgICAgICB3cml0ZVBhdGgoKTtcbiAgICAgICAgb3V0cHV0LnB1c2goeyB0eXBlLCBuYW1lIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHZhbHVlID09PSBcIntcIikge1xuICAgICAgICB3cml0ZVBhdGgoKTtcbiAgICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICB0b2tlbnM6IGNvbnN1bWVVbnRpbChcIn1cIiksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZSA9PT0gXCJ9XCIgfHxcbiAgICAgICAgdmFsdWUgPT09IFwiKFwiIHx8XG4gICAgICAgIHZhbHVlID09PSBcIilcIiB8fFxuICAgICAgICB2YWx1ZSA9PT0gXCJbXCIgfHxcbiAgICAgICAgdmFsdWUgPT09IFwiXVwiIHx8XG4gICAgICAgIHZhbHVlID09PSBcIitcIiB8fFxuICAgICAgICB2YWx1ZSA9PT0gXCI/XCIgfHxcbiAgICAgICAgdmFsdWUgPT09IFwiIVwiXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihgVW5leHBlY3RlZCAke3ZhbHVlfSBhdCBpbmRleCAke2luZGV4IC0gMX1gLCBzdHIpO1xuICAgICAgfVxuXG4gICAgICBwYXRoICs9IHZhbHVlO1xuICAgIH1cblxuICAgIGlmIChlbmQpIHtcbiAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoXG4gICAgICAgIGBVbmV4cGVjdGVkIGVuZCBhdCBpbmRleCAke2luZGV4fSwgZXhwZWN0ZWQgJHtlbmR9YCxcbiAgICAgICAgc3RyLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICB3cml0ZVBhdGgoKTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUb2tlbkRhdGEoY29uc3VtZVVudGlsKFwiXCIpLCBzdHIpO1xufVxuXG4vKipcbiAqIENvbXBpbGUgYSBzdHJpbmcgdG8gYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmb3IgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlPFAgZXh0ZW5kcyBQYXJhbURhdGEgPSBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoLFxuICBvcHRpb25zOiBDb21waWxlT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKSB7XG4gIGNvbnN0IHsgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50LCBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUiB9ID1cbiAgICBvcHRpb25zO1xuICBjb25zdCBkYXRhID0gdHlwZW9mIHBhdGggPT09IFwib2JqZWN0XCIgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gIGNvbnN0IGZuID0gdG9rZW5zVG9GdW5jdGlvbihkYXRhLnRva2VucywgZGVsaW1pdGVyLCBlbmNvZGUpO1xuXG4gIHJldHVybiBmdW5jdGlvbiBwYXRoKHBhcmFtczogUCA9IHt9IGFzIFApIHtcbiAgICBjb25zdCBtaXNzaW5nOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHBhdGggPSBmbihwYXJhbXMsIG1pc3NpbmcpO1xuXG4gICAgaWYgKG1pc3NpbmcubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlcnM6ICR7bWlzc2luZy5qb2luKFwiLCBcIil9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IFBhcnRpYWw8UmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10+PjtcbmV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChkYXRhPzogUCkgPT4gc3RyaW5nO1xuXG4vKipcbiAqIEludGVybmFsIHBhdGggYnVpbGRlciBmdW5jdGlvbi5cbiAqL1xudHlwZSBUb2tlbkVuY29kZXIgPSAoZGF0YTogUGFyYW1EYXRhLCBtaXNzaW5nOiBzdHJpbmdbXSkgPT4gc3RyaW5nO1xuXG5mdW5jdGlvbiB0b2tlbnNUb0Z1bmN0aW9uKFxuICB0b2tlbnM6IFRva2VuW10sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogVG9rZW5FbmNvZGVyIHtcbiAgY29uc3QgZW5jb2RlcnMgPSB0b2tlbnMubWFwKCh0b2tlbikgPT5cbiAgICB0b2tlblRvRnVuY3Rpb24odG9rZW4sIGRlbGltaXRlciwgZW5jb2RlKSxcbiAgKTtcblxuICByZXR1cm4gKGRhdGE6IFBhcmFtRGF0YSwgbWlzc2luZzogc3RyaW5nW10pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcblxuICAgIGZvciAoY29uc3QgZW5jb2RlciBvZiBlbmNvZGVycykge1xuICAgICAgcmVzdWx0ICs9IGVuY29kZXIoZGF0YSwgbWlzc2luZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgc2luZ2xlIHRva2VuIGludG8gYSBwYXRoIGJ1aWxkaW5nIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlblRvRnVuY3Rpb24oXG4gIHRva2VuOiBUb2tlbixcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pOiBUb2tlbkVuY29kZXIge1xuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHJldHVybiAoKSA9PiB0b2tlbi52YWx1ZTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgY29uc3QgZm4gPSB0b2tlbnNUb0Z1bmN0aW9uKHRva2VuLnRva2VucywgZGVsaW1pdGVyLCBlbmNvZGUpO1xuXG4gICAgcmV0dXJuIChkYXRhLCBtaXNzaW5nKSA9PiB7XG4gICAgICBjb25zdCBsZW4gPSBtaXNzaW5nLmxlbmd0aDtcbiAgICAgIGNvbnN0IHZhbHVlID0gZm4oZGF0YSwgbWlzc2luZyk7XG4gICAgICBpZiAobWlzc2luZy5sZW5ndGggPT09IGxlbikgcmV0dXJuIHZhbHVlO1xuXG4gICAgICBtaXNzaW5nLmxlbmd0aCA9IGxlbjsgLy8gUmVzZXQgb3B0aW9uYWwgZ3JvdXAuXG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgZW5jb2RlVmFsdWUgPSBlbmNvZGUgfHwgTk9PUF9WQUxVRTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiICYmIGVuY29kZSAhPT0gZmFsc2UpIHtcbiAgICByZXR1cm4gKGRhdGEsIG1pc3NpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIG1pc3NpbmcucHVzaCh0b2tlbi5uYW1lKTtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGEgbm9uLWVtcHR5IGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGxldCByZXN1bHQgPSBcIlwiO1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWVbaV0gIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX0vJHtpfVwiIHRvIGJlIGEgc3RyaW5nYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaSA+IDApIHJlc3VsdCArPSBkZWxpbWl0ZXI7XG4gICAgICAgIHJlc3VsdCArPSBlbmNvZGVWYWx1ZSh2YWx1ZVtpXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiAoZGF0YSwgbWlzc2luZykgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgbWlzc2luZy5wdXNoKHRva2VuLm5hbWUpO1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW5jb2RlVmFsdWUodmFsdWUpO1xuICB9O1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggcmVzdWx0IGNvbnRhaW5zIGRhdGEgYWJvdXQgdGhlIHBhdGggbWF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4ge1xuICBwYXRoOiBzdHJpbmc7XG4gIHBhcmFtczogUDtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIGlzIGVpdGhlciBgZmFsc2VgIChubyBtYXRjaCkgb3IgYSBtYXRjaCByZXN1bHQuXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gZmFsc2UgfCBNYXRjaFJlc3VsdDxQPjtcblxuLyoqXG4gKiBUaGUgbWF0Y2ggZnVuY3Rpb24gdGFrZXMgYSBzdHJpbmcgYW5kIHJldHVybnMgd2hldGhlciBpdCBtYXRjaGVkIHRoZSBwYXRoLlxuICovXG5leHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKHBhdGg6IHN0cmluZykgPT4gTWF0Y2g8UD47XG5cbi8qKlxuICogU3VwcG9ydGVkIHBhdGggdHlwZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFBhdGggPSBzdHJpbmcgfCBUb2tlbkRhdGE7XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgcGF0aCBpbnRvIGEgbWF0Y2ggZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCB8IFBhdGhbXSxcbiAgb3B0aW9uczogTWF0Y2hPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pOiBNYXRjaEZ1bmN0aW9uPFA+IHtcbiAgY29uc3QgeyBkZWNvZGUgPSBkZWNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IHsgcmVnZXhwLCBrZXlzIH0gPSBwYXRoVG9SZWdleHAocGF0aCwgb3B0aW9ucyk7XG5cbiAgY29uc3QgZGVjb2RlcnMgPSBrZXlzLm1hcCgoa2V5KSA9PiB7XG4gICAgaWYgKGRlY29kZSA9PT0gZmFsc2UpIHJldHVybiBOT09QX1ZBTFVFO1xuICAgIGlmIChrZXkudHlwZSA9PT0gXCJwYXJhbVwiKSByZXR1cm4gZGVjb2RlO1xuICAgIHJldHVybiAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUuc3BsaXQoZGVsaW1pdGVyKS5tYXAoZGVjb2RlKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG1hdGNoKGlucHV0OiBzdHJpbmcpIHtcbiAgICBjb25zdCBtID0gcmVnZXhwLmV4ZWMoaW5wdXQpO1xuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgcGF0aCA9IG1bMF07XG4gICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG1baV0gPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGtleSA9IGtleXNbaSAtIDFdO1xuICAgICAgY29uc3QgZGVjb2RlciA9IGRlY29kZXJzW2kgLSAxXTtcbiAgICAgIHBhcmFtc1trZXkubmFtZV0gPSBkZWNvZGVyKG1baV0pO1xuICAgIH1cblxuICAgIHJldHVybiB7IHBhdGgsIHBhcmFtcyB9O1xuICB9O1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHBhdGggaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBhbmQgY2FwdHVyZSBrZXlzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUmVnZXhwKFxuICBwYXRoOiBQYXRoIHwgUGF0aFtdLFxuICBvcHRpb25zOiBQYXRoVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3Qge1xuICAgIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSLFxuICAgIGVuZCA9IHRydWUsXG4gICAgc2Vuc2l0aXZlID0gZmFsc2UsXG4gICAgdHJhaWxpbmcgPSB0cnVlLFxuICB9ID0gb3B0aW9ucztcbiAgY29uc3Qga2V5czogS2V5cyA9IFtdO1xuICBsZXQgc291cmNlID0gXCJcIjtcbiAgbGV0IGNvbWJpbmF0aW9ucyA9IDA7XG5cbiAgZnVuY3Rpb24gcHJvY2VzcyhwYXRoOiBQYXRoIHwgUGF0aFtdKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICAgIGZvciAoY29uc3QgcCBvZiBwYXRoKSBwcm9jZXNzKHApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YgcGF0aCA9PT0gXCJvYmplY3RcIiA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgICBmbGF0dGVuKGRhdGEudG9rZW5zLCAwLCBbXSwgKHRva2VucykgPT4ge1xuICAgICAgaWYgKGNvbWJpbmF0aW9ucyA+PSAyNTYpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcIlRvbyBtYW55IHBhdGggY29tYmluYXRpb25zXCIsIGRhdGEub3JpZ2luYWxQYXRoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbWJpbmF0aW9ucyA+IDApIHNvdXJjZSArPSBcInxcIjtcbiAgICAgIHNvdXJjZSArPSB0b1JlZ0V4cFNvdXJjZSh0b2tlbnMsIGRlbGltaXRlciwga2V5cywgZGF0YS5vcmlnaW5hbFBhdGgpO1xuICAgICAgY29tYmluYXRpb25zKys7XG4gICAgfSk7XG4gIH1cblxuICBwcm9jZXNzKHBhdGgpO1xuXG4gIGxldCBwYXR0ZXJuID0gYF4oPzoke3NvdXJjZX0pYDtcbiAgaWYgKHRyYWlsaW5nKSBwYXR0ZXJuICs9IFwiKD86XCIgKyBlc2NhcGUoZGVsaW1pdGVyKSArIFwiJCk/XCI7XG4gIHBhdHRlcm4gKz0gZW5kID8gXCIkXCIgOiBcIig/PVwiICsgZXNjYXBlKGRlbGltaXRlcikgKyBcInwkKVwiO1xuXG4gIHJldHVybiB7IHJlZ2V4cDogbmV3IFJlZ0V4cChwYXR0ZXJuLCBzZW5zaXRpdmUgPyBcIlwiIDogXCJpXCIpLCBrZXlzIH07XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBmbGF0IGxpc3Qgb2Ygc2VxdWVuY2UgdG9rZW5zIGZyb20gdGhlIGdpdmVuIHRva2Vucy5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuICByZXN1bHQ6IEV4Y2x1ZGU8VG9rZW4sIEdyb3VwPltdLFxuICBjYWxsYmFjazogKHJlc3VsdDogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10pID0+IHZvaWQsXG4pOiB2b2lkIHtcbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgICAgY29uc3QgbGVuID0gcmVzdWx0Lmxlbmd0aDtcbiAgICAgIGZsYXR0ZW4odG9rZW4udG9rZW5zLCAwLCByZXN1bHQsIChzZXEpID0+XG4gICAgICAgIGZsYXR0ZW4odG9rZW5zLCBpbmRleCwgc2VxLCBjYWxsYmFjayksXG4gICAgICApO1xuICAgICAgcmVzdWx0Lmxlbmd0aCA9IGxlbjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKHRva2VuKTtcbiAgfVxuXG4gIGNhbGxiYWNrKHJlc3VsdCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgZmxhdCBzZXF1ZW5jZSBvZiB0b2tlbnMgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqL1xuZnVuY3Rpb24gdG9SZWdFeHBTb3VyY2UoXG4gIHRva2VuczogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBrZXlzOiBLZXlzLFxuICBvcmlnaW5hbFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbik6IHN0cmluZyB7XG4gIGxldCByZXN1bHQgPSBcIlwiO1xuICBsZXQgYmFja3RyYWNrID0gXCJcIjtcbiAgbGV0IHdpbGRjYXJkQmFja3RyYWNrID0gXCJcIjtcbiAgbGV0IHByZXZDYXB0dXJlVHlwZTogMCB8IDEgfCAyID0gMDtcbiAgbGV0IGhhc1NlZ21lbnRDYXB0dXJlID0gMDtcbiAgbGV0IGluZGV4ID0gMDtcblxuICBmdW5jdGlvbiBoYXNJblNlZ21lbnQoaW5kZXg6IG51bWJlciwgdHlwZTogVG9rZW5bXCJ0eXBlXCJdKSB7XG4gICAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gdHlwZSkgcmV0dXJuIHRydWU7XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgICAgaWYgKHRva2VuLnZhbHVlLmluY2x1ZGVzKGRlbGltaXRlcikpIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBwZWVrVGV4dChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gICAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG4gICAgICBpZiAodG9rZW4udHlwZSAhPT0gXCJ0ZXh0XCIpIGJyZWFrO1xuICAgICAgcmVzdWx0ICs9IHRva2VuLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICByZXN1bHQgKz0gZXNjYXBlKHRva2VuLnZhbHVlKTtcbiAgICAgIGJhY2t0cmFjayArPSB0b2tlbi52YWx1ZTtcbiAgICAgIGlmIChwcmV2Q2FwdHVyZVR5cGUgPT09IDIpIHdpbGRjYXJkQmFja3RyYWNrICs9IHRva2VuLnZhbHVlO1xuICAgICAgaWYgKHRva2VuLnZhbHVlLmluY2x1ZGVzKGRlbGltaXRlcikpIGhhc1NlZ21lbnRDYXB0dXJlID0gMDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICBpZiAocHJldkNhcHR1cmVUeXBlICYmICFiYWNrdHJhY2spIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcbiAgICAgICAgICBgTWlzc2luZyB0ZXh0IGJlZm9yZSBcIiR7dG9rZW4ubmFtZX1cIiAke3Rva2VuLnR5cGV9YCxcbiAgICAgICAgICBvcmlnaW5hbFBhdGgsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgICAgcmVzdWx0ICs9XG4gICAgICAgICAgaGFzU2VnbWVudENhcHR1cmUgJiAyIC8vIFNlZW4gd2lsZGNhcmQgaW4gc2VnbWVudC5cbiAgICAgICAgICAgID8gYCgke25lZ2F0ZShkZWxpbWl0ZXIsIGJhY2t0cmFjayl9KylgXG4gICAgICAgICAgICA6IGhhc0luU2VnbWVudChpbmRleCwgXCJ3aWxkY2FyZFwiKSAvLyBTZWUgd2lsZGNhcmQgbGF0ZXIgaW4gc2VnbWVudC5cbiAgICAgICAgICAgICAgPyBgKCR7bmVnYXRlKGRlbGltaXRlciwgcGVla1RleHQoaW5kZXgpKX0rKWBcbiAgICAgICAgICAgICAgOiBoYXNTZWdtZW50Q2FwdHVyZSAmIDEgLy8gU2VlbiBwYXJhbWV0ZXIgaW4gc2VnbWVudC5cbiAgICAgICAgICAgICAgICA/IGAoJHtuZWdhdGUoZGVsaW1pdGVyLCBiYWNrdHJhY2spfSt8JHtlc2NhcGUoYmFja3RyYWNrKX0pYFxuICAgICAgICAgICAgICAgIDogYCgke25lZ2F0ZShkZWxpbWl0ZXIsIFwiXCIpfSspYDtcblxuICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSB8PSBwcmV2Q2FwdHVyZVR5cGUgPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ICs9XG4gICAgICAgICAgaGFzU2VnbWVudENhcHR1cmUgJiAyIC8vIFNlZW4gd2lsZGNhcmQgaW4gc2VnbWVudC5cbiAgICAgICAgICAgID8gYCgke25lZ2F0ZShiYWNrdHJhY2ssIFwiXCIpfSspYFxuICAgICAgICAgICAgOiB3aWxkY2FyZEJhY2t0cmFjayAvLyBObyBjYXB0dXJlIGluIHNlZ21lbnQsIHNlZW4gd2lsZGNhcmQgaW4gcGF0aC5cbiAgICAgICAgICAgICAgPyBgKCR7bmVnYXRlKHdpbGRjYXJkQmFja3RyYWNrLCBcIlwiKX0rfCR7bmVnYXRlKGRlbGltaXRlciwgXCJcIil9KylgXG4gICAgICAgICAgICAgIDogYChbXl0rKWA7XG5cbiAgICAgICAgd2lsZGNhcmRCYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSB8PSBwcmV2Q2FwdHVyZVR5cGUgPSAyO1xuICAgICAgfVxuXG4gICAgICBrZXlzLnB1c2godG9rZW4pO1xuICAgICAgYmFja3RyYWNrID0gXCJcIjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVua25vd24gdG9rZW4gdHlwZTogJHsodG9rZW4gYXMgYW55KS50eXBlfWApO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBCbG9jayBiYWNrdHJhY2tpbmcgb24gcHJldmlvdXMgdGV4dC9kZWxpbWl0ZXIuXG4gKi9cbmZ1bmN0aW9uIG5lZ2F0ZShhOiBzdHJpbmcsIGI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChiLmxlbmd0aCA+IGEubGVuZ3RoKSByZXR1cm4gbmVnYXRlKGIsIGEpOyAvLyBMb25nZXN0IHN0cmluZyBmaXJzdC5cblxuICBpZiAoYSA9PT0gYikgYiA9IFwiXCI7IC8vIENsZWFuZXIgcmVnZXggc3RyaW5ncywgbm8gZHVwbGljYXRpb24uXG4gIGlmIChiLmxlbmd0aCA+IDEpIHJldHVybiBgKD86KD8hJHtlc2NhcGUoYSl9fCR7ZXNjYXBlKGIpfSlbXl0pYDtcbiAgaWYgKGEubGVuZ3RoID4gMSkgcmV0dXJuIGAoPzooPyEke2VzY2FwZShhKX0pW14ke2VzY2FwZShiKX1dKWA7XG4gIHJldHVybiBgW14ke2VzY2FwZShhICsgYil9XWA7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IGFuIGFycmF5IG9mIHRva2VucyBpbnRvIGEgcGF0aCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeVRva2Vucyh0b2tlbnM6IFRva2VuW10sIGluZGV4OiBudW1iZXIpOiBzdHJpbmcge1xuICBsZXQgdmFsdWUgPSBcIlwiO1xuXG4gIHdoaWxlIChpbmRleCA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikge1xuICAgICAgdmFsdWUgKz0gZXNjYXBlVGV4dCh0b2tlbi52YWx1ZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICB2YWx1ZSArPSBcIntcIiArIHN0cmluZ2lmeVRva2Vucyh0b2tlbi50b2tlbnMsIDApICsgXCJ9XCI7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJwYXJhbVwiKSB7XG4gICAgICB2YWx1ZSArPSBcIjpcIiArIHN0cmluZ2lmeU5hbWUodG9rZW4ubmFtZSwgdG9rZW5zW2luZGV4XSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICB2YWx1ZSArPSBcIipcIiArIHN0cmluZ2lmeU5hbWUodG9rZW4ubmFtZSwgdG9rZW5zW2luZGV4XSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmtub3duIHRva2VuIHR5cGU6ICR7KHRva2VuIGFzIGFueSkudHlwZX1gKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgdG9rZW4gZGF0YSBpbnRvIGEgcGF0aCBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkoZGF0YTogVG9rZW5EYXRhKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0cmluZ2lmeVRva2VucyhkYXRhLnRva2VucywgMCk7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IGEgcGFyYW1ldGVyIG5hbWUsIGVzY2FwaW5nIHdoZW4gaXQgY2Fubm90IGJlIGVtaXR0ZWQgZGlyZWN0bHkuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeU5hbWUobmFtZTogc3RyaW5nLCBuZXh0OiBUb2tlbiB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGlmICghSUQudGVzdChuYW1lKSkgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5hbWUpO1xuXG4gIGlmIChuZXh0Py50eXBlID09PSBcInRleHRcIiAmJiBJRF9DT05USU5VRS50ZXN0KG5leHQudmFsdWVbMF0pKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWU7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIEVuY29kZSBhcyBwMnJFbmNvZGUsXG4gICAgdHlwZSBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIHR5cGUgUGFyc2VPcHRpb25zIGFzIHAyclBhcnNlT3B0aW9ucyxcbiAgICB0eXBlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgYXMgcDJyUGF0aFRvUmVnZXhwT3B0aW9ucyxcbiAgICB0eXBlIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgdHlwZSBDb21waWxlT3B0aW9ucyBhcyBwMnJDb21waWxlT3B0aW9ucyxcbiAgICB0eXBlIFBhcmFtRGF0YSBhcyBwMnJQYXJhbURhdGEsXG4gICAgdHlwZSBQYXRoRnVuY3Rpb24gYXMgcDJyUGF0aEZ1bmN0aW9uLFxuICAgIHR5cGUgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgdHlwZSBNYXRjaCBhcyBwMnJNYXRjaCxcbiAgICB0eXBlIE1hdGNoRnVuY3Rpb24gYXMgcDJyTWF0Y2hGdW5jdGlvbixcbiAgICB0eXBlIEtleSBhcyBwMnJLZXksXG4gICAgdHlwZSBUb2tlbiBhcyBwMnJUb2tlbixcbiAgICB0eXBlIFBhdGggYXMgcDJyUGF0aCxcbiAgICBUb2tlbkRhdGEgYXMgcDJyVG9rZW5EYXRhLFxuICAgIFBhdGhFcnJvciBhcyBwMnJQYXRoRXJyb3IsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICBtYXRjaCxcbiAgICBzdHJpbmdpZnksXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBFbmNvZGUgPSBwMnJFbmNvZGU7XG4gICAgZXhwb3J0IHR5cGUgRGVjb2RlID0gcDJyRGVjb2RlO1xuICAgIGV4cG9ydCB0eXBlIFBhcnNlT3B0aW9ucyA9IHAyclBhcnNlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zID0gcDJyUGF0aFRvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaE9wdGlvbnMgPSBwMnJNYXRjaE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgQ29tcGlsZU9wdGlvbnMgPSBwMnJDb21waWxlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUb2tlbkRhdGEgPSBwMnJUb2tlbkRhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gcDJyUGFyYW1EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyclBhdGhGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoUmVzdWx0PFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2g8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgUGF0aCA9IHAyclBhdGg7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIFRva2VuRGF0YTogcDJyVG9rZW5EYXRhLFxuICAgIFBhdGhFcnJvcjogcDJyUGF0aEVycm9yLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOlsicDJyVG9rZW5EYXRhIiwicDJyUGF0aEVycm9yIiwicGFyc2UiLCJjb21waWxlIiwibWF0Y2giLCJzdHJpbmdpZnkiLCJwYXRoVG9SZWdleHAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7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QUMsS0FBSyxDQUFDLENBQUM7YUFDdkQ7O1NBR0YsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLG9CQUFBLEVBQXdCLEtBQWEsQ0FBQyxJQUFJLENBQUEsQ0FBRSxDQUFDOztBQUduRSxLQUFBLE9BQU8sS0FBSztBQUNkLENBQUE7QUFFQTs7QUFFRztDQUNILFNBQWdCLFNBQVMsQ0FBQyxJQUFlLEVBQUE7S0FDdkMsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDeEMsQ0FBQTtBQUVBOztBQUVHO0FBQ0gsQ0FBQSxTQUFTLGFBQWEsQ0FBQyxJQUFZLEVBQUUsSUFBdUIsRUFBQTtBQUMxRCxLQUFBLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUFFLFNBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztLQUUvQyxJQUFJLENBQUEsSUFBSSxLQUFBLElBQUEsSUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxJQUFJLE1BQUssTUFBTSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVELFNBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQzs7QUFHN0IsS0FBQSxPQUFPLElBQUk7QUFDYixDQUFBOzs7Ozs7O0FDNXBCQTs7QUFFRztBQTRDSCxNQUFNLFdBQVcsR0FBRztBQUNoQixJQUFBLFNBQVMsRUFBRUEscUJBQVk7QUFDdkIsSUFBQSxTQUFTLEVBQUVDLHFCQUFZO1dBQ3ZCQyxpQkFBSzthQUNMQyxtQkFBTztXQUNQQyxpQkFBSztlQUNMQyxxQkFBUztrQkFDVEMsd0JBQVk7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cC8ifQ==