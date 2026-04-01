/*!
 * @cdp/extension-path2regexp 0.9.21
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
	const SIMPLE_TOKENS = "{}()[]+?!";
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
	            while (index < chars.length) {
	                if (chars[++index] === '"') {
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
	        const value = chars[index++];
	        if (SIMPLE_TOKENS.includes(value)) {
	            tokens.push({ type: value, index, value });
	        }
	        else if (value === "\\") {
	            tokens.push({ type: "escape", index, value: chars[index++] });
	        }
	        else if (value === ":") {
	            tokens.push({ type: "param", index, value: name() });
	        }
	        else if (value === "*") {
	            tokens.push({ type: "wildcard", index, value: name() });
	        }
	        else {
	            tokens.push({ type: "char", index, value });
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
	/**
	 * Transform a path into a regular expression and capture keys.
	 */
	function pathToRegexp(path, options = {}) {
	    const { delimiter = DEFAULT_DELIMITER, end = true, sensitive = false, trailing = true, } = options;
	    const keys = [];
	    const sources = [];
	    const paths = [path];
	    let combinations = 0;
	    while (paths.length) {
	        const path = paths.shift();
	        if (Array.isArray(path)) {
	            paths.push(...path);
	            continue;
	        }
	        const data = typeof path === "object" ? path : parse(path, options);
	        flatten(data.tokens, 0, [], (tokens) => {
	            if (combinations++ >= 256) {
	                throw new PathError("Too many path combinations", data.originalPath);
	            }
	            sources.push(toRegExpSource(tokens, delimiter, keys, data.originalPath));
	        });
	    }
	    let pattern = `^(?:${sources.join("|")})`;
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
	            flatten(token.tokens, 0, result.slice(), (seq) => flatten(tokens, index, seq, callback));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9TVEFSVCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV0kL3U7XG5jb25zdCBJRF9DT05USU5VRSA9IC9eWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dJC91O1xuY29uc3QgSUQgPSAvXlskX1xccHtJRF9TdGFydH1dWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dKiQvdTtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogQSBmdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncy5cbiAgICovXG4gIGVuY29kZVBhdGg/OiBFbmNvZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBNYXRjaGVzIHRoZSBwYXRoIGNvbXBsZXRlbHkgd2l0aG91dCB0cmFpbGluZyBjaGFyYWN0ZXJzLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5kPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFsbG93cyBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBkZWxpbWl0ZXIgZm9yIHNlZ21lbnRzLiAoZGVmYXVsdDogYCcvJ2ApXG4gICAqL1xuICBkZWxpbWl0ZXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQgaW50byB0aGUgcGF0aCwgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGVuY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBlbmNvZGU/OiBFbmNvZGUgfCBmYWxzZTtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxudHlwZSBUb2tlblR5cGUgPVxuICB8IFwie1wiXG4gIHwgXCJ9XCJcbiAgfCBcIndpbGRjYXJkXCJcbiAgfCBcInBhcmFtXCJcbiAgfCBcImNoYXJcIlxuICB8IFwiZXNjYXBlXCJcbiAgfCBcImVuZFwiXG4gIC8vIFJlc2VydmVkIGZvciB1c2Ugb3IgYW1iaWd1b3VzIGR1ZSB0byBwYXN0IHVzZS5cbiAgfCBcIihcIlxuICB8IFwiKVwiXG4gIHwgXCJbXCJcbiAgfCBcIl1cIlxuICB8IFwiK1wiXG4gIHwgXCI/XCJcbiAgfCBcIiFcIjtcblxuLyoqXG4gKiBUb2tlbml6ZXIgcmVzdWx0cy5cbiAqL1xuaW50ZXJmYWNlIExleFRva2VuIHtcbiAgdHlwZTogVG9rZW5UeXBlO1xuICBpbmRleDogbnVtYmVyO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG5jb25zdCBTSU1QTEVfVE9LRU5TID0gXCJ7fSgpW10rPyFcIjtcblxuLyoqXG4gKiBFc2NhcGUgdGV4dCBmb3Igc3RyaW5naWZ5IHRvIHBhdGguXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVRleHQoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9be30oKVxcW1xcXSs/IToqXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvWy4rKj9eJHt9KClbXFxdfC9cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBQbGFpbiB0ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRleHQge1xuICB0eXBlOiBcInRleHRcIjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHBhcmFtZXRlciBkZXNpZ25lZCB0byBtYXRjaCBhcmJpdHJhcnkgdGV4dCB3aXRoaW4gYSBzZWdtZW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlciB7XG4gIHR5cGU6IFwicGFyYW1cIjtcbiAgbmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgd2lsZGNhcmQgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIG11bHRpcGxlIHNlZ21lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdpbGRjYXJkIHtcbiAgdHlwZTogXCJ3aWxkY2FyZFwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBzZXQgb2YgcG9zc2libGUgdG9rZW5zIHRvIGV4cGFuZCB3aGVuIG1hdGNoaW5nLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwIHtcbiAgdHlwZTogXCJncm91cFwiO1xuICB0b2tlbnM6IFRva2VuW107XG59XG5cbi8qKlxuICogQSB0b2tlbiB0aGF0IGNvcnJlc3BvbmRzIHdpdGggYSByZWdleHAgY2FwdHVyZS5cbiAqL1xuZXhwb3J0IHR5cGUgS2V5ID0gUGFyYW1ldGVyIHwgV2lsZGNhcmQ7XG5cbi8qKlxuICogQSBzZXF1ZW5jZSBvZiBgcGF0aC10by1yZWdleHBgIGtleXMgdGhhdCBtYXRjaCBjYXB0dXJpbmcgZ3JvdXBzLlxuICovXG5leHBvcnQgdHlwZSBLZXlzID0gQXJyYXk8S2V5PjtcblxuLyoqXG4gKiBBIHNlcXVlbmNlIG9mIHBhdGggbWF0Y2ggY2hhcmFjdGVycy5cbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBUZXh0IHwgUGFyYW1ldGVyIHwgV2lsZGNhcmQgfCBHcm91cDtcblxuLyoqXG4gKiBUb2tlbml6ZWQgcGF0aCBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRva2VuRGF0YSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSB0b2tlbnM6IFRva2VuW10sXG4gICAgcHVibGljIHJlYWRvbmx5IG9yaWdpbmFsUGF0aD86IHN0cmluZyxcbiAgKSB7fVxufVxuXG4vKipcbiAqIFBhcnNlRXJyb3IgaXMgdGhyb3duIHdoZW4gdGhlcmUgaXMgYW4gZXJyb3IgcHJvY2Vzc2luZyB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdGhFcnJvciBleHRlbmRzIFR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3JpZ2luYWxQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICkge1xuICAgIGxldCB0ZXh0ID0gbWVzc2FnZTtcbiAgICBpZiAob3JpZ2luYWxQYXRoKSB0ZXh0ICs9IGA6ICR7b3JpZ2luYWxQYXRofWA7XG4gICAgdGV4dCArPSBgOyB2aXNpdCBodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3IgZm9yIGluZm9gO1xuICAgIHN1cGVyKHRleHQpO1xuICB9XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5EYXRhIHtcbiAgY29uc3QgeyBlbmNvZGVQYXRoID0gTk9PUF9WQUxVRSB9ID0gb3B0aW9ucztcbiAgY29uc3QgY2hhcnMgPSBbLi4uc3RyXTtcbiAgY29uc3QgdG9rZW5zOiBBcnJheTxMZXhUb2tlbj4gPSBbXTtcbiAgbGV0IGluZGV4ID0gMDtcbiAgbGV0IHBvcyA9IDA7XG5cbiAgZnVuY3Rpb24gbmFtZSgpIHtcbiAgICBsZXQgdmFsdWUgPSBcIlwiO1xuXG4gICAgaWYgKElEX1NUQVJULnRlc3QoY2hhcnNbaW5kZXhdKSkge1xuICAgICAgZG8ge1xuICAgICAgICB2YWx1ZSArPSBjaGFyc1tpbmRleCsrXTtcbiAgICAgIH0gd2hpbGUgKElEX0NPTlRJTlVFLnRlc3QoY2hhcnNbaW5kZXhdKSk7XG4gICAgfSBlbHNlIGlmIChjaGFyc1tpbmRleF0gPT09ICdcIicpIHtcbiAgICAgIGxldCBxdW90ZVN0YXJ0ID0gaW5kZXg7XG5cbiAgICAgIHdoaWxlIChpbmRleCA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICBpZiAoY2hhcnNbKytpbmRleF0gPT09ICdcIicpIHtcbiAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgIHF1b3RlU3RhcnQgPSAwO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5jcmVtZW50IG92ZXIgZXNjYXBlIGNoYXJhY3RlcnMuXG4gICAgICAgIGlmIChjaGFyc1tpbmRleF0gPT09IFwiXFxcXFwiKSBpbmRleCsrO1xuXG4gICAgICAgIHZhbHVlICs9IGNoYXJzW2luZGV4XTtcbiAgICAgIH1cblxuICAgICAgaWYgKHF1b3RlU3RhcnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihgVW50ZXJtaW5hdGVkIHF1b3RlIGF0IGluZGV4ICR7cXVvdGVTdGFydH1gLCBzdHIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyIG5hbWUgYXQgaW5kZXggJHtpbmRleH1gLCBzdHIpO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHdoaWxlIChpbmRleCA8IGNoYXJzLmxlbmd0aCkge1xuICAgIGNvbnN0IHZhbHVlID0gY2hhcnNbaW5kZXgrK107XG5cbiAgICBpZiAoU0lNUExFX1RPS0VOUy5pbmNsdWRlcyh2YWx1ZSkpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogdmFsdWUgYXMgVG9rZW5UeXBlLCBpbmRleCwgdmFsdWUgfSk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJlc2NhcGVcIiwgaW5kZXgsIHZhbHVlOiBjaGFyc1tpbmRleCsrXSB9KTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSBcIjpcIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcInBhcmFtXCIsIGluZGV4LCB2YWx1ZTogbmFtZSgpIH0pO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiKlwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwid2lsZGNhcmRcIiwgaW5kZXgsIHZhbHVlOiBuYW1lKCkgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJjaGFyXCIsIGluZGV4LCB2YWx1ZSB9KTtcbiAgICB9XG4gIH1cblxuICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiZW5kXCIsIGluZGV4LCB2YWx1ZTogXCJcIiB9KTtcblxuICBmdW5jdGlvbiBjb25zdW1lVW50aWwoZW5kVHlwZTogVG9rZW5UeXBlKTogVG9rZW5bXSB7XG4gICAgY29uc3Qgb3V0cHV0OiBUb2tlbltdID0gW107XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbcG9zKytdO1xuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IGVuZFR5cGUpIGJyZWFrO1xuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJjaGFyXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJlc2NhcGVcIikge1xuICAgICAgICBsZXQgcGF0aCA9IHRva2VuLnZhbHVlO1xuICAgICAgICBsZXQgY3VyID0gdG9rZW5zW3Bvc107XG5cbiAgICAgICAgd2hpbGUgKGN1ci50eXBlID09PSBcImNoYXJcIiB8fCBjdXIudHlwZSA9PT0gXCJlc2NhcGVcIikge1xuICAgICAgICAgIHBhdGggKz0gY3VyLnZhbHVlO1xuICAgICAgICAgIGN1ciA9IHRva2Vuc1srK3Bvc107XG4gICAgICAgIH1cblxuICAgICAgICBvdXRwdXQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdmFsdWU6IGVuY29kZVBhdGgocGF0aCksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIiB8fCB0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IHRva2VuLnR5cGUsXG4gICAgICAgICAgbmFtZTogdG9rZW4udmFsdWUsXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwie1wiKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgICAgICAgdG9rZW5zOiBjb25zdW1lVW50aWwoXCJ9XCIpLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBQYXRoRXJyb3IoXG4gICAgICAgIGBVbmV4cGVjdGVkICR7dG9rZW4udHlwZX0gYXQgaW5kZXggJHt0b2tlbi5pbmRleH0sIGV4cGVjdGVkICR7ZW5kVHlwZX1gLFxuICAgICAgICBzdHIsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICByZXR1cm4gbmV3IFRva2VuRGF0YShjb25zdW1lVW50aWwoXCJlbmRcIiksIHN0cik7XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIFBhcmFtRGF0YSA9IFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3QgeyBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IGRhdGEgPSB0eXBlb2YgcGF0aCA9PT0gXCJvYmplY3RcIiA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3QgZm4gPSB0b2tlbnNUb0Z1bmN0aW9uKGRhdGEudG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHBhdGgocGFyYW1zOiBQID0ge30gYXMgUCkge1xuICAgIGNvbnN0IFtwYXRoLCAuLi5taXNzaW5nXSA9IGZuKHBhcmFtcyk7XG4gICAgaWYgKG1pc3NpbmcubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlcnM6ICR7bWlzc2luZy5qb2luKFwiLCBcIil9YCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBQYXJhbURhdGEgPSBQYXJ0aWFsPFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdPj47XG5leHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAoZGF0YT86IFApID0+IHN0cmluZztcblxuZnVuY3Rpb24gdG9rZW5zVG9GdW5jdGlvbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbikge1xuICBjb25zdCBlbmNvZGVycyA9IHRva2Vucy5tYXAoKHRva2VuKSA9PlxuICAgIHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZGVsaW1pdGVyLCBlbmNvZGUpLFxuICApO1xuXG4gIHJldHVybiAoZGF0YTogUGFyYW1EYXRhKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtcIlwiXTtcblxuICAgIGZvciAoY29uc3QgZW5jb2RlciBvZiBlbmNvZGVycykge1xuICAgICAgY29uc3QgW3ZhbHVlLCAuLi5leHRyYXNdID0gZW5jb2RlcihkYXRhKTtcbiAgICAgIHJlc3VsdFswXSArPSB2YWx1ZTtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLmV4dHJhcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgc2luZ2xlIHRva2VuIGludG8gYSBwYXRoIGJ1aWxkaW5nIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlblRvRnVuY3Rpb24oXG4gIHRva2VuOiBUb2tlbixcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pOiAoZGF0YTogUGFyYW1EYXRhKSA9PiBzdHJpbmdbXSB7XG4gIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikgcmV0dXJuICgpID0+IFt0b2tlbi52YWx1ZV07XG5cbiAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgIGNvbnN0IGZuID0gdG9rZW5zVG9GdW5jdGlvbih0b2tlbi50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICAgIHJldHVybiAoZGF0YSkgPT4ge1xuICAgICAgY29uc3QgW3ZhbHVlLCAuLi5taXNzaW5nXSA9IGZuKGRhdGEpO1xuICAgICAgaWYgKCFtaXNzaW5nLmxlbmd0aCkgcmV0dXJuIFt2YWx1ZV07XG4gICAgICByZXR1cm4gW1wiXCJdO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBlbmNvZGVWYWx1ZSA9IGVuY29kZSB8fCBOT09QX1ZBTFVFO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIgJiYgZW5jb2RlICE9PSBmYWxzZSkge1xuICAgIHJldHVybiAoZGF0YSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBbXCJcIiwgdG9rZW4ubmFtZV07XG5cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGEgbm9uLWVtcHR5IGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbXG4gICAgICAgIHZhbHVlXG4gICAgICAgICAgLm1hcCgodmFsdWUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2luZGV4fVwiIHRvIGJlIGEgc3RyaW5nYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5qb2luKGRlbGltaXRlciksXG4gICAgICBdO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBbXCJcIiwgdG9rZW4ubmFtZV07XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgIH1cblxuICAgIHJldHVybiBbZW5jb2RlVmFsdWUodmFsdWUpXTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIHJlc3VsdCBjb250YWlucyBkYXRhIGFib3V0IHRoZSBwYXRoIG1hdGNoLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+IHtcbiAgcGF0aDogc3RyaW5nO1xuICBwYXJhbXM6IFA7XG59XG5cbi8qKlxuICogQSBtYXRjaCBpcyBlaXRoZXIgYGZhbHNlYCAobm8gbWF0Y2gpIG9yIGEgbWF0Y2ggcmVzdWx0LlxuICovXG5leHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IGZhbHNlIHwgTWF0Y2hSZXN1bHQ8UD47XG5cbi8qKlxuICogVGhlIG1hdGNoIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgbWF0Y2hlZCB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChwYXRoOiBzdHJpbmcpID0+IE1hdGNoPFA+O1xuXG4vKipcbiAqIFN1cHBvcnRlZCBwYXRoIHR5cGVzLlxuICovXG5leHBvcnQgdHlwZSBQYXRoID0gc3RyaW5nIHwgVG9rZW5EYXRhO1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHBhdGggaW50byBhIG1hdGNoIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IE1hdGNoT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKTogTWF0Y2hGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHsgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50LCBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUiB9ID1cbiAgICBvcHRpb25zO1xuICBjb25zdCB7IHJlZ2V4cCwga2V5cyB9ID0gcGF0aFRvUmVnZXhwKHBhdGgsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGRlY29kZXJzID0ga2V5cy5tYXAoKGtleSkgPT4ge1xuICAgIGlmIChkZWNvZGUgPT09IGZhbHNlKSByZXR1cm4gTk9PUF9WQUxVRTtcbiAgICBpZiAoa2V5LnR5cGUgPT09IFwicGFyYW1cIikgcmV0dXJuIGRlY29kZTtcbiAgICByZXR1cm4gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnNwbGl0KGRlbGltaXRlcikubWFwKGRlY29kZSk7XG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiBtYXRjaChpbnB1dDogc3RyaW5nKSB7XG4gICAgY29uc3QgbSA9IHJlZ2V4cC5leGVjKGlucHV0KTtcbiAgICBpZiAoIW0pIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHBhdGggPSBtWzBdO1xuICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtW2ldID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIGNvbnN0IGRlY29kZXIgPSBkZWNvZGVyc1tpIC0gMV07XG4gICAgICBwYXJhbXNba2V5Lm5hbWVdID0gZGVjb2RlcihtW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXRoLCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBwYXRoIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24gYW5kIGNhcHR1cmUga2V5cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1JlZ2V4cChcbiAgcGF0aDogUGF0aCB8IFBhdGhbXSxcbiAgb3B0aW9uczogUGF0aFRvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKSB7XG4gIGNvbnN0IHtcbiAgICBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUixcbiAgICBlbmQgPSB0cnVlLFxuICAgIHNlbnNpdGl2ZSA9IGZhbHNlLFxuICAgIHRyYWlsaW5nID0gdHJ1ZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGtleXM6IEtleXMgPSBbXTtcbiAgY29uc3Qgc291cmNlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcGF0aHM6IEFycmF5PFBhdGggfCBQYXRoW10+ID0gW3BhdGhdO1xuICBsZXQgY29tYmluYXRpb25zID0gMDtcblxuICB3aGlsZSAocGF0aHMubGVuZ3RoKSB7XG4gICAgY29uc3QgcGF0aCA9IHBhdGhzLnNoaWZ0KCkhO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICAgIHBhdGhzLnB1c2goLi4ucGF0aCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gdHlwZW9mIHBhdGggPT09IFwib2JqZWN0XCIgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gICAgZmxhdHRlbihkYXRhLnRva2VucywgMCwgW10sICh0b2tlbnMpID0+IHtcbiAgICAgIGlmIChjb21iaW5hdGlvbnMrKyA+PSAyNTYpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcIlRvbyBtYW55IHBhdGggY29tYmluYXRpb25zXCIsIGRhdGEub3JpZ2luYWxQYXRoKTtcbiAgICAgIH1cblxuICAgICAgc291cmNlcy5wdXNoKHRvUmVnRXhwU291cmNlKHRva2VucywgZGVsaW1pdGVyLCBrZXlzLCBkYXRhLm9yaWdpbmFsUGF0aCkpO1xuICAgIH0pO1xuICB9XG5cbiAgbGV0IHBhdHRlcm4gPSBgXig/OiR7c291cmNlcy5qb2luKFwifFwiKX0pYDtcbiAgaWYgKHRyYWlsaW5nKSBwYXR0ZXJuICs9IFwiKD86XCIgKyBlc2NhcGUoZGVsaW1pdGVyKSArIFwiJCk/XCI7XG4gIHBhdHRlcm4gKz0gZW5kID8gXCIkXCIgOiBcIig/PVwiICsgZXNjYXBlKGRlbGltaXRlcikgKyBcInwkKVwiO1xuXG4gIHJldHVybiB7IHJlZ2V4cDogbmV3IFJlZ0V4cChwYXR0ZXJuLCBzZW5zaXRpdmUgPyBcIlwiIDogXCJpXCIpLCBrZXlzIH07XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBmbGF0IGxpc3Qgb2Ygc2VxdWVuY2UgdG9rZW5zIGZyb20gdGhlIGdpdmVuIHRva2Vucy5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuICByZXN1bHQ6IEV4Y2x1ZGU8VG9rZW4sIEdyb3VwPltdLFxuICBjYWxsYmFjazogKHJlc3VsdDogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10pID0+IHZvaWQsXG4pOiB2b2lkIHtcbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgICAgZmxhdHRlbih0b2tlbi50b2tlbnMsIDAsIHJlc3VsdC5zbGljZSgpLCAoc2VxKSA9PlxuICAgICAgICBmbGF0dGVuKHRva2VucywgaW5kZXgsIHNlcSwgY2FsbGJhY2spLFxuICAgICAgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKHRva2VuKTtcbiAgfVxuXG4gIGNhbGxiYWNrKHJlc3VsdCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgZmxhdCBzZXF1ZW5jZSBvZiB0b2tlbnMgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqL1xuZnVuY3Rpb24gdG9SZWdFeHBTb3VyY2UoXG4gIHRva2VuczogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBrZXlzOiBLZXlzLFxuICBvcmlnaW5hbFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbik6IHN0cmluZyB7XG4gIGxldCByZXN1bHQgPSBcIlwiO1xuICBsZXQgYmFja3RyYWNrID0gXCJcIjtcbiAgbGV0IHdpbGRjYXJkQmFja3RyYWNrID0gXCJcIjtcbiAgbGV0IHByZXZDYXB0dXJlVHlwZTogMCB8IDEgfCAyID0gMDtcbiAgbGV0IGhhc1NlZ21lbnRDYXB0dXJlID0gMDtcbiAgbGV0IGluZGV4ID0gMDtcblxuICBmdW5jdGlvbiBoYXNJblNlZ21lbnQoaW5kZXg6IG51bWJlciwgdHlwZTogVG9rZW5UeXBlKSB7XG4gICAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gdHlwZSkgcmV0dXJuIHRydWU7XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgICAgaWYgKHRva2VuLnZhbHVlLmluY2x1ZGVzKGRlbGltaXRlcikpIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBwZWVrVGV4dChpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gICAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG4gICAgICBpZiAodG9rZW4udHlwZSAhPT0gXCJ0ZXh0XCIpIGJyZWFrO1xuICAgICAgcmVzdWx0ICs9IHRva2VuLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICByZXN1bHQgKz0gZXNjYXBlKHRva2VuLnZhbHVlKTtcbiAgICAgIGJhY2t0cmFjayArPSB0b2tlbi52YWx1ZTtcbiAgICAgIGlmIChwcmV2Q2FwdHVyZVR5cGUgPT09IDIpIHdpbGRjYXJkQmFja3RyYWNrICs9IHRva2VuLnZhbHVlO1xuICAgICAgaWYgKHRva2VuLnZhbHVlLmluY2x1ZGVzKGRlbGltaXRlcikpIGhhc1NlZ21lbnRDYXB0dXJlID0gMDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICBpZiAocHJldkNhcHR1cmVUeXBlICYmICFiYWNrdHJhY2spIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcbiAgICAgICAgICBgTWlzc2luZyB0ZXh0IGJlZm9yZSBcIiR7dG9rZW4ubmFtZX1cIiAke3Rva2VuLnR5cGV9YCxcbiAgICAgICAgICBvcmlnaW5hbFBhdGgsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgICAgcmVzdWx0ICs9XG4gICAgICAgICAgaGFzU2VnbWVudENhcHR1cmUgJiAyIC8vIFNlZW4gd2lsZGNhcmQgaW4gc2VnbWVudC5cbiAgICAgICAgICAgID8gYCgke25lZ2F0ZShkZWxpbWl0ZXIsIGJhY2t0cmFjayl9KylgXG4gICAgICAgICAgICA6IGhhc0luU2VnbWVudChpbmRleCwgXCJ3aWxkY2FyZFwiKSAvLyBTZWUgd2lsZGNhcmQgbGF0ZXIgaW4gc2VnbWVudC5cbiAgICAgICAgICAgICAgPyBgKCR7bmVnYXRlKGRlbGltaXRlciwgcGVla1RleHQoaW5kZXgpKX0rKWBcbiAgICAgICAgICAgICAgOiBoYXNTZWdtZW50Q2FwdHVyZSAmIDEgLy8gU2VlbiBwYXJhbWV0ZXIgaW4gc2VnbWVudC5cbiAgICAgICAgICAgICAgICA/IGAoJHtuZWdhdGUoZGVsaW1pdGVyLCBiYWNrdHJhY2spfSt8JHtlc2NhcGUoYmFja3RyYWNrKX0pYFxuICAgICAgICAgICAgICAgIDogYCgke25lZ2F0ZShkZWxpbWl0ZXIsIFwiXCIpfSspYDtcblxuICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSB8PSBwcmV2Q2FwdHVyZVR5cGUgPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ICs9XG4gICAgICAgICAgaGFzU2VnbWVudENhcHR1cmUgJiAyIC8vIFNlZW4gd2lsZGNhcmQgaW4gc2VnbWVudC5cbiAgICAgICAgICAgID8gYCgke25lZ2F0ZShiYWNrdHJhY2ssIFwiXCIpfSspYFxuICAgICAgICAgICAgOiB3aWxkY2FyZEJhY2t0cmFjayAvLyBObyBjYXB0dXJlIGluIHNlZ21lbnQsIHNlZW4gd2lsZGNhcmQgaW4gcGF0aC5cbiAgICAgICAgICAgICAgPyBgKCR7bmVnYXRlKHdpbGRjYXJkQmFja3RyYWNrLCBcIlwiKX0rfCR7bmVnYXRlKGRlbGltaXRlciwgXCJcIil9KylgXG4gICAgICAgICAgICAgIDogYChbXl0rKWA7XG5cbiAgICAgICAgd2lsZGNhcmRCYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSB8PSBwcmV2Q2FwdHVyZVR5cGUgPSAyO1xuICAgICAgfVxuXG4gICAgICBrZXlzLnB1c2godG9rZW4pO1xuICAgICAgYmFja3RyYWNrID0gXCJcIjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVua25vd24gdG9rZW4gdHlwZTogJHsodG9rZW4gYXMgYW55KS50eXBlfWApO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBCbG9jayBiYWNrdHJhY2tpbmcgb24gcHJldmlvdXMgdGV4dC9kZWxpbWl0ZXIuXG4gKi9cbmZ1bmN0aW9uIG5lZ2F0ZShhOiBzdHJpbmcsIGI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChiLmxlbmd0aCA+IGEubGVuZ3RoKSByZXR1cm4gbmVnYXRlKGIsIGEpOyAvLyBMb25nZXN0IHN0cmluZyBmaXJzdC5cblxuICBpZiAoYSA9PT0gYikgYiA9IFwiXCI7IC8vIENsZWFuZXIgcmVnZXggc3RyaW5ncywgbm8gZHVwbGljYXRpb24uXG4gIGlmIChiLmxlbmd0aCA+IDEpIHJldHVybiBgKD86KD8hJHtlc2NhcGUoYSl9fCR7ZXNjYXBlKGIpfSlbXl0pYDtcbiAgaWYgKGEubGVuZ3RoID4gMSkgcmV0dXJuIGAoPzooPyEke2VzY2FwZShhKX0pW14ke2VzY2FwZShiKX1dKWA7XG4gIHJldHVybiBgW14ke2VzY2FwZShhICsgYil9XWA7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IGFuIGFycmF5IG9mIHRva2VucyBpbnRvIGEgcGF0aCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeVRva2Vucyh0b2tlbnM6IFRva2VuW10sIGluZGV4OiBudW1iZXIpOiBzdHJpbmcge1xuICBsZXQgdmFsdWUgPSBcIlwiO1xuXG4gIHdoaWxlIChpbmRleCA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikge1xuICAgICAgdmFsdWUgKz0gZXNjYXBlVGV4dCh0b2tlbi52YWx1ZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICB2YWx1ZSArPSBcIntcIiArIHN0cmluZ2lmeVRva2Vucyh0b2tlbi50b2tlbnMsIDApICsgXCJ9XCI7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJwYXJhbVwiKSB7XG4gICAgICB2YWx1ZSArPSBcIjpcIiArIHN0cmluZ2lmeU5hbWUodG9rZW4ubmFtZSwgdG9rZW5zW2luZGV4XSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICB2YWx1ZSArPSBcIipcIiArIHN0cmluZ2lmeU5hbWUodG9rZW4ubmFtZSwgdG9rZW5zW2luZGV4XSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmtub3duIHRva2VuIHR5cGU6ICR7KHRva2VuIGFzIGFueSkudHlwZX1gKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgdG9rZW4gZGF0YSBpbnRvIGEgcGF0aCBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnkoZGF0YTogVG9rZW5EYXRhKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0cmluZ2lmeVRva2VucyhkYXRhLnRva2VucywgMCk7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IGEgcGFyYW1ldGVyIG5hbWUsIGVzY2FwaW5nIHdoZW4gaXQgY2Fubm90IGJlIGVtaXR0ZWQgZGlyZWN0bHkuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeU5hbWUobmFtZTogc3RyaW5nLCBuZXh0OiBUb2tlbiB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGlmICghSUQudGVzdChuYW1lKSkgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5hbWUpO1xuXG4gIGlmIChuZXh0Py50eXBlID09PSBcInRleHRcIiAmJiBJRF9DT05USU5VRS50ZXN0KG5leHQudmFsdWVbMF0pKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIG5hbWU7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIEVuY29kZSBhcyBwMnJFbmNvZGUsXG4gICAgdHlwZSBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIHR5cGUgUGFyc2VPcHRpb25zIGFzIHAyclBhcnNlT3B0aW9ucyxcbiAgICB0eXBlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgYXMgcDJyUGF0aFRvUmVnZXhwT3B0aW9ucyxcbiAgICB0eXBlIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgdHlwZSBDb21waWxlT3B0aW9ucyBhcyBwMnJDb21waWxlT3B0aW9ucyxcbiAgICB0eXBlIFBhcmFtRGF0YSBhcyBwMnJQYXJhbURhdGEsXG4gICAgdHlwZSBQYXRoRnVuY3Rpb24gYXMgcDJyUGF0aEZ1bmN0aW9uLFxuICAgIHR5cGUgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgdHlwZSBNYXRjaCBhcyBwMnJNYXRjaCxcbiAgICB0eXBlIE1hdGNoRnVuY3Rpb24gYXMgcDJyTWF0Y2hGdW5jdGlvbixcbiAgICB0eXBlIEtleSBhcyBwMnJLZXksXG4gICAgdHlwZSBUb2tlbiBhcyBwMnJUb2tlbixcbiAgICB0eXBlIFBhdGggYXMgcDJyUGF0aCxcbiAgICBUb2tlbkRhdGEgYXMgcDJyVG9rZW5EYXRhLFxuICAgIFBhdGhFcnJvciBhcyBwMnJQYXRoRXJyb3IsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICBtYXRjaCxcbiAgICBzdHJpbmdpZnksXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBFbmNvZGUgPSBwMnJFbmNvZGU7XG4gICAgZXhwb3J0IHR5cGUgRGVjb2RlID0gcDJyRGVjb2RlO1xuICAgIGV4cG9ydCB0eXBlIFBhcnNlT3B0aW9ucyA9IHAyclBhcnNlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zID0gcDJyUGF0aFRvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaE9wdGlvbnMgPSBwMnJNYXRjaE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgQ29tcGlsZU9wdGlvbnMgPSBwMnJDb21waWxlT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUb2tlbkRhdGEgPSBwMnJUb2tlbkRhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gcDJyUGFyYW1EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyclBhdGhGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoUmVzdWx0PFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2g8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgUGF0aCA9IHAyclBhdGg7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIFRva2VuRGF0YTogcDJyVG9rZW5EYXRhLFxuICAgIFBhdGhFcnJvcjogcDJyUGF0aEVycm9yLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOlsicDJyVG9rZW5EYXRhIiwicDJyUGF0aEVycm9yIiwicGFyc2UiLCJjb21waWxlIiwibWF0Y2giLCJzdHJpbmdpZnkiLCJwYXRoVG9SZWdleHAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBaUxBLENBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBO0FBa0hBLENBQUEsSUFBQSxDQUFBLE9BQUEsR0FBQSxPQUFBO0FBZ0lBLENBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQSxLQUFBO0FBb0NBLENBQUEsSUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBO0FBNk1BLENBQUEsSUFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBO0NBcHBCQSxNQUFNLGlCQUFpQixHQUFHLEdBQUc7QUFDN0IsQ0FBQSxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWEsS0FBSyxLQUFLO0NBQzNDLE1BQU0sUUFBUSxHQUFHLHFCQUFxQjtDQUN0QyxNQUFNLFdBQVcsR0FBRyxtQ0FBbUM7Q0FDdkQsTUFBTSxFQUFFLEdBQUcsb0RBQW9EO0NBa0YvRCxNQUFNLGFBQWEsR0FBRyxXQUFXO0FBRWpDOztBQUVHO0NBQ0gsU0FBUyxVQUFVLENBQUMsR0FBVyxFQUFBO0tBQzdCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLENBQUM7QUFDbEQsQ0FBQTtBQUVBOztBQUVHO0NBQ0gsU0FBUyxNQUFNLENBQUMsR0FBVyxFQUFBO0tBQ3pCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUM7QUFDcEQsQ0FBQTtBQWlEQTs7QUFFRztBQUNILENBQUEsTUFBYSxTQUFTLENBQUE7S0FDcEIsV0FBQSxDQUNrQixNQUFlLEVBQ2YsWUFBcUIsRUFBQTtTQURyQixJQUFBLENBQUEsTUFBTSxHQUFOLE1BQU07U0FDTixJQUFBLENBQUEsWUFB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SUFBSSxDQUFDLElBQUksQ0FBQztBQUFFLFNBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztLQUUvQyxJQUFJLENBQUEsSUFBSSxLQUFBLElBQUEsSUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxJQUFJLE1BQUssTUFBTSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVELFNBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQzs7QUFHN0IsS0FBQSxPQUFPLElBQUk7QUFDYixDQUFBOzs7Ozs7O0FDbnFCQTs7QUFFRztBQTRDSCxNQUFNLFdBQVcsR0FBRztBQUNoQixJQUFBLFNBQVMsRUFBRUEscUJBQVk7QUFDdkIsSUFBQSxTQUFTLEVBQUVDLHFCQUFZO1dBQ3ZCQyxpQkFBSzthQUNMQyxtQkFBTztXQUNQQyxpQkFBSztlQUNMQyxxQkFBUztrQkFDVEMsd0JBQVk7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cC8ifQ==