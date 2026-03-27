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
    	    const root = new SourceNode("^");
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
    	            let node = root;
    	            for (const part of toRegExpSource(tokens, delimiter, data.originalPath)) {
    	                node = node.add(part.source, part.key);
    	            }
    	            node.add(""); // Mark the end of the source.
    	        });
    	    }
    	    const keys = [];
    	    let pattern = toRegExp(root, keys);
    	    if (trailing)
    	        pattern += "(?:" + escape(delimiter) + "$)?";
    	    pattern += end ? "$" : "(?=" + escape(delimiter) + "|$)";
    	    return { regexp: new RegExp(pattern, sensitive ? "" : "i"), keys };
    	}
    	function toRegExp(node, keys) {
    	    if (node.key)
    	        keys.push(node.key);
    	    const children = Object.keys(node.children);
    	    const text = children
    	        .map((id) => toRegExp(node.children[id], keys))
    	        .join("|");
    	    return node.source + (children.length < 2 ? text : `(?:${text})`);
    	}
    	class SourceNode {
    	    constructor(source, key) {
    	        this.source = source;
    	        this.key = key;
    	        this.children = Object.create(null);
    	    }
    	    add(source, key) {
    	        var _a;
    	        const id = source + ":" + (key ? key.name : "");
    	        return ((_a = this.children)[id] || (_a[id] = new SourceNode(source, key)));
    	    }
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
    	function toRegExpSource(tokens, delimiter, originalPath) {
    	    let result = [];
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
    	            result.push({ source: escape(token.value) });
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
    	                result.push({
    	                    source: hasSegmentCapture // Seen param/wildcard in segment.
    	                        ? `(${negate(delimiter, backtrack)}+?)`
    	                        : hasInSegment(index, "wildcard") // See wildcard later in segment.
    	                            ? `(${negate(delimiter, peekText(index))}+?)`
    	                            : `(${negate(delimiter, "")}+?)`,
    	                    key: token,
    	                });
    	                hasSegmentCapture |= prevCaptureType = 1;
    	            }
    	            else {
    	                result.push({
    	                    source: hasSegmentCapture & 2 // Seen wildcard in segment.
    	                        ? `(${negate(backtrack, "")}+?)`
    	                        : hasSegmentCapture & 1 // Seen param in segment.
    	                            ? `(${negate(wildcardBacktrack, "")}+?)`
    	                            : wildcardBacktrack // No capture in segment, seen wildcard in path.
    	                                ? `(${negate(wildcardBacktrack, "")}+?|${negate(delimiter, "")}+?)`
    	                                : `([^]+?)`,
    	                    key: token,
    	                });
    	                wildcardBacktrack = "";
    	                hasSegmentCapture |= prevCaptureType = 2;
    	            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX1NUQVJUID0gL15bJF9cXHB7SURfU3RhcnR9XSQvdTtcbmNvbnN0IElEX0NPTlRJTlVFID0gL15bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0kL3U7XG5jb25zdCBJRCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV1bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0qJC91O1xuXG4vKipcbiAqIEVuY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBFbmNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG4vKipcbiAqIERlY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBEZWNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzLlxuICAgKi9cbiAgZW5jb2RlUGF0aD86IEVuY29kZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIE1hdGNoZXMgdGhlIHBhdGggY29tcGxldGVseSB3aXRob3V0IHRyYWlsaW5nIGNoYXJhY3RlcnMuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3dzIG9wdGlvbmFsIHRyYWlsaW5nIGRlbGltaXRlciB0byBtYXRjaC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHRyYWlsaW5nPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE1hdGNoIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaE9wdGlvbnMgZXh0ZW5kcyBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBkZWNvZGluZyBzdHJpbmdzIGZvciBwYXJhbXMsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBkZWNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZGVjb2RlPzogRGVjb2RlIHwgZmFsc2U7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZU9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xufVxuXG50eXBlIFRva2VuVHlwZSA9XG4gIHwgXCJ7XCJcbiAgfCBcIn1cIlxuICB8IFwid2lsZGNhcmRcIlxuICB8IFwicGFyYW1cIlxuICB8IFwiY2hhclwiXG4gIHwgXCJlc2NhcGVcIlxuICB8IFwiZW5kXCJcbiAgLy8gUmVzZXJ2ZWQgZm9yIHVzZSBvciBhbWJpZ3VvdXMgZHVlIHRvIHBhc3QgdXNlLlxuICB8IFwiKFwiXG4gIHwgXCIpXCJcbiAgfCBcIltcIlxuICB8IFwiXVwiXG4gIHwgXCIrXCJcbiAgfCBcIj9cIlxuICB8IFwiIVwiO1xuXG4vKipcbiAqIFRva2VuaXplciByZXN1bHRzLlxuICovXG5pbnRlcmZhY2UgTGV4VG9rZW4ge1xuICB0eXBlOiBUb2tlblR5cGU7XG4gIGluZGV4OiBudW1iZXI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmNvbnN0IFNJTVBMRV9UT0tFTlMgPSBcInt9KClbXSs/IVwiO1xuXG4vKipcbiAqIEVzY2FwZSB0ZXh0IGZvciBzdHJpbmdpZnkgdG8gcGF0aC5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlVGV4dChzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1t7fSgpXFxbXFxdKz8hOipcXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGUoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bLisqP14ke30oKVtcXF18L1xcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuXG4vKipcbiAqIFBsYWluIHRleHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGV4dCB7XG4gIHR5cGU6IFwidGV4dFwiO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIGFyYml0cmFyeSB0ZXh0IHdpdGhpbiBhIHNlZ21lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyIHtcbiAgdHlwZTogXCJwYXJhbVwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB3aWxkY2FyZCBwYXJhbWV0ZXIgZGVzaWduZWQgdG8gbWF0Y2ggbXVsdGlwbGUgc2VnbWVudHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgV2lsZGNhcmQge1xuICB0eXBlOiBcIndpbGRjYXJkXCI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHNldCBvZiBwb3NzaWJsZSB0b2tlbnMgdG8gZXhwYW5kIHdoZW4gbWF0Y2hpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JvdXAge1xuICB0eXBlOiBcImdyb3VwXCI7XG4gIHRva2VuczogVG9rZW5bXTtcbn1cblxuLyoqXG4gKiBBIHRva2VuIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIHJlZ2V4cCBjYXB0dXJlLlxuICovXG5leHBvcnQgdHlwZSBLZXkgPSBQYXJhbWV0ZXIgfCBXaWxkY2FyZDtcblxuLyoqXG4gKiBBIHNlcXVlbmNlIG9mIGBwYXRoLXRvLXJlZ2V4cGAga2V5cyB0aGF0IG1hdGNoIGNhcHR1cmluZyBncm91cHMuXG4gKi9cbmV4cG9ydCB0eXBlIEtleXMgPSBBcnJheTxLZXk+O1xuXG4vKipcbiAqIEEgc2VxdWVuY2Ugb2YgcGF0aCBtYXRjaCBjaGFyYWN0ZXJzLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IFRleHQgfCBQYXJhbWV0ZXIgfCBXaWxkY2FyZCB8IEdyb3VwO1xuXG4vKipcbiAqIFRva2VuaXplZCBwYXRoIGluc3RhbmNlLlxuICovXG5leHBvcnQgY2xhc3MgVG9rZW5EYXRhIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHRva2VuczogVG9rZW5bXSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3JpZ2luYWxQYXRoPzogc3RyaW5nLFxuICApIHt9XG59XG5cbi8qKlxuICogUGFyc2VFcnJvciBpcyB0aHJvd24gd2hlbiB0aGVyZSBpcyBhbiBlcnJvciBwcm9jZXNzaW5nIHRoZSBwYXRoLlxuICovXG5leHBvcnQgY2xhc3MgUGF0aEVycm9yIGV4dGVuZHMgVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBvcmlnaW5hbFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgKSB7XG4gICAgbGV0IHRleHQgPSBtZXNzYWdlO1xuICAgIGlmIChvcmlnaW5hbFBhdGgpIHRleHQgKz0gYDogJHtvcmlnaW5hbFBhdGh9YDtcbiAgICB0ZXh0ICs9IGA7IHZpc2l0IGh0dHBzOi8vZ2l0Lm5ldy9wYXRoVG9SZWdleHBFcnJvciBmb3IgaW5mb2A7XG4gICAgc3VwZXIodGV4dCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhIHN0cmluZyBmb3IgdGhlIHJhdyB0b2tlbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShzdHI6IHN0cmluZywgb3B0aW9uczogUGFyc2VPcHRpb25zID0ge30pOiBUb2tlbkRhdGEge1xuICBjb25zdCB7IGVuY29kZVBhdGggPSBOT09QX1ZBTFVFIH0gPSBvcHRpb25zO1xuICBjb25zdCBjaGFycyA9IFsuLi5zdHJdO1xuICBjb25zdCB0b2tlbnM6IEFycmF5PExleFRva2VuPiA9IFtdO1xuICBsZXQgaW5kZXggPSAwO1xuICBsZXQgcG9zID0gMDtcblxuICBmdW5jdGlvbiBuYW1lKCkge1xuICAgIGxldCB2YWx1ZSA9IFwiXCI7XG5cbiAgICBpZiAoSURfU1RBUlQudGVzdChjaGFyc1tpbmRleF0pKSB7XG4gICAgICBkbyB7XG4gICAgICAgIHZhbHVlICs9IGNoYXJzW2luZGV4KytdO1xuICAgICAgfSB3aGlsZSAoSURfQ09OVElOVUUudGVzdChjaGFyc1tpbmRleF0pKTtcbiAgICB9IGVsc2UgaWYgKGNoYXJzW2luZGV4XSA9PT0gJ1wiJykge1xuICAgICAgbGV0IHF1b3RlU3RhcnQgPSBpbmRleDtcblxuICAgICAgd2hpbGUgKGluZGV4IDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChjaGFyc1srK2luZGV4XSA9PT0gJ1wiJykge1xuICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgcXVvdGVTdGFydCA9IDA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbmNyZW1lbnQgb3ZlciBlc2NhcGUgY2hhcmFjdGVycy5cbiAgICAgICAgaWYgKGNoYXJzW2luZGV4XSA9PT0gXCJcXFxcXCIpIGluZGV4Kys7XG5cbiAgICAgICAgdmFsdWUgKz0gY2hhcnNbaW5kZXhdO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVvdGVTdGFydCkge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBVbnRlcm1pbmF0ZWQgcXVvdGUgYXQgaW5kZXggJHtxdW90ZVN0YXJ0fWAsIHN0cik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXIgbmFtZSBhdCBpbmRleCAke2luZGV4fWAsIHN0cik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgd2hpbGUgKGluZGV4IDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjaGFyc1tpbmRleCsrXTtcblxuICAgIGlmIChTSU1QTEVfVE9LRU5TLmluY2x1ZGVzKHZhbHVlKSkge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiB2YWx1ZSBhcyBUb2tlblR5cGUsIGluZGV4LCB2YWx1ZSB9KTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSBcIlxcXFxcIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcImVzY2FwZVwiLCBpbmRleCwgdmFsdWU6IGNoYXJzW2luZGV4KytdIH0pO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiOlwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwicGFyYW1cIiwgaW5kZXgsIHZhbHVlOiBuYW1lKCkgfSk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gXCIqXCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJ3aWxkY2FyZFwiLCBpbmRleCwgdmFsdWU6IG5hbWUoKSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcImNoYXJcIiwgaW5kZXgsIHZhbHVlIH0pO1xuICAgIH1cbiAgfVxuXG4gIHRva2Vucy5wdXNoKHsgdHlwZTogXCJlbmRcIiwgaW5kZXgsIHZhbHVlOiBcIlwiIH0pO1xuXG4gIGZ1bmN0aW9uIGNvbnN1bWVVbnRpbChlbmRUeXBlOiBUb2tlblR5cGUpOiBUb2tlbltdIHtcbiAgICBjb25zdCBvdXRwdXQ6IFRva2VuW10gPSBbXTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1twb3MrK107XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gZW5kVHlwZSkgYnJlYWs7XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcImNoYXJcIiB8fCB0b2tlbi50eXBlID09PSBcImVzY2FwZVwiKSB7XG4gICAgICAgIGxldCBwYXRoID0gdG9rZW4udmFsdWU7XG4gICAgICAgIGxldCBjdXIgPSB0b2tlbnNbcG9zXTtcblxuICAgICAgICB3aGlsZSAoY3VyLnR5cGUgPT09IFwiY2hhclwiIHx8IGN1ci50eXBlID09PSBcImVzY2FwZVwiKSB7XG4gICAgICAgICAgcGF0aCArPSBjdXIudmFsdWU7XG4gICAgICAgICAgY3VyID0gdG9rZW5zWysrcG9zXTtcbiAgICAgICAgfVxuXG4gICAgICAgIG91dHB1dC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICB2YWx1ZTogZW5jb2RlUGF0aChwYXRoKSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJwYXJhbVwiIHx8IHRva2VuLnR5cGUgPT09IFwid2lsZGNhcmRcIikge1xuICAgICAgICBvdXRwdXQucHVzaCh7XG4gICAgICAgICAgdHlwZTogdG9rZW4udHlwZSxcbiAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ7XCIpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICB0b2tlbnM6IGNvbnN1bWVVbnRpbChcIn1cIiksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcbiAgICAgICAgYFVuZXhwZWN0ZWQgJHt0b2tlbi50eXBlfSBhdCBpbmRleCAke3Rva2VuLmluZGV4fSwgZXhwZWN0ZWQgJHtlbmRUeXBlfWAsXG4gICAgICAgIHN0cixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIHJldHVybiBuZXcgVG9rZW5EYXRhKGNvbnN1bWVVbnRpbChcImVuZFwiKSwgc3RyKTtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgUGFyYW1EYXRhID0gUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7IGVuY29kZSA9IGVuY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgZGF0YSA9IHR5cGVvZiBwYXRoID09PSBcIm9iamVjdFwiID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24oZGF0YS50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICByZXR1cm4gZnVuY3Rpb24gcGF0aChwYXJhbXM6IFAgPSB7fSBhcyBQKSB7XG4gICAgY29uc3QgW3BhdGgsIC4uLm1pc3NpbmddID0gZm4ocGFyYW1zKTtcbiAgICBpZiAobWlzc2luZy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyczogJHttaXNzaW5nLmpvaW4oXCIsIFwiKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IFBhcnRpYWw8UmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10+PjtcbmV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChkYXRhPzogUCkgPT4gc3RyaW5nO1xuXG5mdW5jdGlvbiB0b2tlbnNUb0Z1bmN0aW9uKFxuICB0b2tlbnM6IFRva2VuW10sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKSB7XG4gIGNvbnN0IGVuY29kZXJzID0gdG9rZW5zLm1hcCgodG9rZW4pID0+XG4gICAgdG9rZW5Ub0Z1bmN0aW9uKHRva2VuLCBkZWxpbWl0ZXIsIGVuY29kZSksXG4gICk7XG5cbiAgcmV0dXJuIChkYXRhOiBQYXJhbURhdGEpID0+IHtcbiAgICBjb25zdCByZXN1bHQ6IHN0cmluZ1tdID0gW1wiXCJdO1xuXG4gICAgZm9yIChjb25zdCBlbmNvZGVyIG9mIGVuY29kZXJzKSB7XG4gICAgICBjb25zdCBbdmFsdWUsIC4uLmV4dHJhc10gPSBlbmNvZGVyKGRhdGEpO1xuICAgICAgcmVzdWx0WzBdICs9IHZhbHVlO1xuICAgICAgcmVzdWx0LnB1c2goLi4uZXh0cmFzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzaW5nbGUgdG9rZW4gaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRva2VuVG9GdW5jdGlvbihcbiAgdG9rZW46IFRva2VuLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbik6IChkYXRhOiBQYXJhbURhdGEpID0+IHN0cmluZ1tdIHtcbiAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSByZXR1cm4gKCkgPT4gW3Rva2VuLnZhbHVlXTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgY29uc3QgZm4gPSB0b2tlbnNUb0Z1bmN0aW9uKHRva2VuLnRva2VucywgZGVsaW1pdGVyLCBlbmNvZGUpO1xuXG4gICAgcmV0dXJuIChkYXRhKSA9PiB7XG4gICAgICBjb25zdCBbdmFsdWUsIC4uLm1pc3NpbmddID0gZm4oZGF0YSk7XG4gICAgICBpZiAoIW1pc3NpbmcubGVuZ3RoKSByZXR1cm4gW3ZhbHVlXTtcbiAgICAgIHJldHVybiBbXCJcIl07XG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGVuY29kZVZhbHVlID0gZW5jb2RlIHx8IE5PT1BfVkFMVUU7XG5cbiAgaWYgKHRva2VuLnR5cGUgPT09IFwid2lsZGNhcmRcIiAmJiBlbmNvZGUgIT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIChkYXRhKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIFtcIlwiLCB0b2tlbi5uYW1lXTtcblxuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBub24tZW1wdHkgYXJyYXlgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFtcbiAgICAgICAgdmFsdWVcbiAgICAgICAgICAubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICBgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9LyR7aW5kZXh9XCIgdG8gYmUgYSBzdHJpbmdgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlVmFsdWUodmFsdWUpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmpvaW4oZGVsaW1pdGVyKSxcbiAgICAgIF07XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiAoZGF0YSkgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIFtcIlwiLCB0b2tlbi5uYW1lXTtcblxuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFtlbmNvZGVWYWx1ZSh2YWx1ZSldO1xuICB9O1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggcmVzdWx0IGNvbnRhaW5zIGRhdGEgYWJvdXQgdGhlIHBhdGggbWF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4ge1xuICBwYXRoOiBzdHJpbmc7XG4gIHBhcmFtczogUDtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIGlzIGVpdGhlciBgZmFsc2VgIChubyBtYXRjaCkgb3IgYSBtYXRjaCByZXN1bHQuXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gZmFsc2UgfCBNYXRjaFJlc3VsdDxQPjtcblxuLyoqXG4gKiBUaGUgbWF0Y2ggZnVuY3Rpb24gdGFrZXMgYSBzdHJpbmcgYW5kIHJldHVybnMgd2hldGhlciBpdCBtYXRjaGVkIHRoZSBwYXRoLlxuICovXG5leHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKHBhdGg6IHN0cmluZykgPT4gTWF0Y2g8UD47XG5cbi8qKlxuICogU3VwcG9ydGVkIHBhdGggdHlwZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFBhdGggPSBzdHJpbmcgfCBUb2tlbkRhdGE7XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgcGF0aCBpbnRvIGEgbWF0Y2ggZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCB8IFBhdGhbXSxcbiAgb3B0aW9uczogTWF0Y2hPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pOiBNYXRjaEZ1bmN0aW9uPFA+IHtcbiAgY29uc3QgeyBkZWNvZGUgPSBkZWNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IHsgcmVnZXhwLCBrZXlzIH0gPSBwYXRoVG9SZWdleHAocGF0aCwgb3B0aW9ucyk7XG5cbiAgY29uc3QgZGVjb2RlcnMgPSBrZXlzLm1hcCgoa2V5KSA9PiB7XG4gICAgaWYgKGRlY29kZSA9PT0gZmFsc2UpIHJldHVybiBOT09QX1ZBTFVFO1xuICAgIGlmIChrZXkudHlwZSA9PT0gXCJwYXJhbVwiKSByZXR1cm4gZGVjb2RlO1xuICAgIHJldHVybiAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUuc3BsaXQoZGVsaW1pdGVyKS5tYXAoZGVjb2RlKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG1hdGNoKGlucHV0OiBzdHJpbmcpIHtcbiAgICBjb25zdCBtID0gcmVnZXhwLmV4ZWMoaW5wdXQpO1xuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgcGF0aCA9IG1bMF07XG4gICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG1baV0gPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGtleSA9IGtleXNbaSAtIDFdO1xuICAgICAgY29uc3QgZGVjb2RlciA9IGRlY29kZXJzW2kgLSAxXTtcbiAgICAgIHBhcmFtc1trZXkubmFtZV0gPSBkZWNvZGVyKG1baV0pO1xuICAgIH1cblxuICAgIHJldHVybiB7IHBhdGgsIHBhcmFtcyB9O1xuICB9O1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHBhdGggaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBhbmQgY2FwdHVyZSBrZXlzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUmVnZXhwKFxuICBwYXRoOiBQYXRoIHwgUGF0aFtdLFxuICBvcHRpb25zOiBQYXRoVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3Qge1xuICAgIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSLFxuICAgIGVuZCA9IHRydWUsXG4gICAgc2Vuc2l0aXZlID0gZmFsc2UsXG4gICAgdHJhaWxpbmcgPSB0cnVlLFxuICB9ID0gb3B0aW9ucztcbiAgY29uc3Qgcm9vdCA9IG5ldyBTb3VyY2VOb2RlKFwiXlwiKTtcbiAgY29uc3QgcGF0aHM6IEFycmF5PFBhdGggfCBQYXRoW10+ID0gW3BhdGhdO1xuICBsZXQgY29tYmluYXRpb25zID0gMDtcblxuICB3aGlsZSAocGF0aHMubGVuZ3RoKSB7XG4gICAgY29uc3QgcGF0aCA9IHBhdGhzLnNoaWZ0KCkhO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICAgIHBhdGhzLnB1c2goLi4ucGF0aCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gdHlwZW9mIHBhdGggPT09IFwib2JqZWN0XCIgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gICAgZmxhdHRlbihkYXRhLnRva2VucywgMCwgW10sICh0b2tlbnMpID0+IHtcbiAgICAgIGlmIChjb21iaW5hdGlvbnMrKyA+PSAyNTYpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcIlRvbyBtYW55IHBhdGggY29tYmluYXRpb25zXCIsIGRhdGEub3JpZ2luYWxQYXRoKTtcbiAgICAgIH1cblxuICAgICAgbGV0IG5vZGUgPSByb290O1xuXG4gICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdG9SZWdFeHBTb3VyY2UodG9rZW5zLCBkZWxpbWl0ZXIsIGRhdGEub3JpZ2luYWxQYXRoKSkge1xuICAgICAgICBub2RlID0gbm9kZS5hZGQocGFydC5zb3VyY2UsIHBhcnQua2V5KTtcbiAgICAgIH1cblxuICAgICAgbm9kZS5hZGQoXCJcIik7IC8vIE1hcmsgdGhlIGVuZCBvZiB0aGUgc291cmNlLlxuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qga2V5czogS2V5cyA9IFtdO1xuICBsZXQgcGF0dGVybiA9IHRvUmVnRXhwKHJvb3QsIGtleXMpO1xuICBpZiAodHJhaWxpbmcpIHBhdHRlcm4gKz0gXCIoPzpcIiArIGVzY2FwZShkZWxpbWl0ZXIpICsgXCIkKT9cIjtcbiAgcGF0dGVybiArPSBlbmQgPyBcIiRcIiA6IFwiKD89XCIgKyBlc2NhcGUoZGVsaW1pdGVyKSArIFwifCQpXCI7XG5cbiAgcmV0dXJuIHsgcmVnZXhwOiBuZXcgUmVnRXhwKHBhdHRlcm4sIHNlbnNpdGl2ZSA/IFwiXCIgOiBcImlcIiksIGtleXMgfTtcbn1cblxuZnVuY3Rpb24gdG9SZWdFeHAobm9kZTogU291cmNlTm9kZSwga2V5czogS2V5cyk6IHN0cmluZyB7XG4gIGlmIChub2RlLmtleSkga2V5cy5wdXNoKG5vZGUua2V5KTtcblxuICBjb25zdCBjaGlsZHJlbiA9IE9iamVjdC5rZXlzKG5vZGUuY2hpbGRyZW4pO1xuICBjb25zdCB0ZXh0ID0gY2hpbGRyZW5cbiAgICAubWFwKChpZCkgPT4gdG9SZWdFeHAobm9kZS5jaGlsZHJlbltpZF0sIGtleXMpKVxuICAgIC5qb2luKFwifFwiKTtcblxuICByZXR1cm4gbm9kZS5zb3VyY2UgKyAoY2hpbGRyZW4ubGVuZ3RoIDwgMiA/IHRleHQgOiBgKD86JHt0ZXh0fSlgKTtcbn1cblxuY2xhc3MgU291cmNlTm9kZSB7XG4gIGNoaWxkcmVuOiBSZWNvcmQ8c3RyaW5nLCBTb3VyY2VOb2RlPiA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHNvdXJjZTogc3RyaW5nLFxuICAgIHB1YmxpYyBrZXk/OiBLZXksXG4gICkge31cblxuICBhZGQoc291cmNlOiBzdHJpbmcsIGtleT86IEtleSkge1xuICAgIGNvbnN0IGlkID0gc291cmNlICsgXCI6XCIgKyAoa2V5ID8ga2V5Lm5hbWUgOiBcIlwiKTtcbiAgICByZXR1cm4gKHRoaXMuY2hpbGRyZW5baWRdIHx8PSBuZXcgU291cmNlTm9kZShzb3VyY2UsIGtleSkpO1xuICB9XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYSBmbGF0IGxpc3Qgb2Ygc2VxdWVuY2UgdG9rZW5zIGZyb20gdGhlIGdpdmVuIHRva2Vucy5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuICByZXN1bHQ6IEV4Y2x1ZGU8VG9rZW4sIEdyb3VwPltdLFxuICBjYWxsYmFjazogKHJlc3VsdDogRXhjbHVkZTxUb2tlbiwgR3JvdXA+W10pID0+IHZvaWQsXG4pOiB2b2lkIHtcbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgICAgZmxhdHRlbih0b2tlbi50b2tlbnMsIDAsIHJlc3VsdC5zbGljZSgpLCAoc2VxKSA9PlxuICAgICAgICBmbGF0dGVuKHRva2VucywgaW5kZXgsIHNlcSwgY2FsbGJhY2spLFxuICAgICAgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc3VsdC5wdXNoKHRva2VuKTtcbiAgfVxuXG4gIGNhbGxiYWNrKHJlc3VsdCk7XG59XG5cbi8qKlxuICogU2ltcGxlc3QgdG9rZW4gZm9yIHRoZSB0cmllIGRlZHVwbGljYXRpb24uXG4gKi9cbmludGVyZmFjZSBSZWdFeHBQYXJ0IHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIGtleT86IEtleTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBmbGF0IHNlcXVlbmNlIG9mIHRva2VucyBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uLlxuICovXG5mdW5jdGlvbiB0b1JlZ0V4cFNvdXJjZShcbiAgdG9rZW5zOiBFeGNsdWRlPFRva2VuLCBHcm91cD5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIG9yaWdpbmFsUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuKTogUmVnRXhwUGFydFtdIHtcbiAgbGV0IHJlc3VsdDogUmVnRXhwUGFydFtdID0gW107XG4gIGxldCBiYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgd2lsZGNhcmRCYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgcHJldkNhcHR1cmVUeXBlOiAwIHwgMSB8IDIgPSAwO1xuICBsZXQgaGFzU2VnbWVudENhcHR1cmUgPSAwO1xuICBsZXQgaW5kZXggPSAwO1xuXG4gIGZ1bmN0aW9uIGhhc0luU2VnbWVudChpbmRleDogbnVtYmVyLCB0eXBlOiBUb2tlblR5cGUpIHtcbiAgICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSB0eXBlKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikge1xuICAgICAgICBpZiAodG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKSkgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZWtUZXh0KGluZGV4OiBudW1iZXIpIHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcbiAgICAgIGlmICh0b2tlbi50eXBlICE9PSBcInRleHRcIikgYnJlYWs7XG4gICAgICByZXN1bHQgKz0gdG9rZW4udmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHsgc291cmNlOiBlc2NhcGUodG9rZW4udmFsdWUpIH0pO1xuICAgICAgYmFja3RyYWNrICs9IHRva2VuLnZhbHVlO1xuICAgICAgaWYgKHByZXZDYXB0dXJlVHlwZSA9PT0gMikgd2lsZGNhcmRCYWNrdHJhY2sgKz0gdG9rZW4udmFsdWU7XG4gICAgICBpZiAodG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKSkgaGFzU2VnbWVudENhcHR1cmUgPSAwO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIiB8fCB0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIGlmIChwcmV2Q2FwdHVyZVR5cGUgJiYgIWJhY2t0cmFjaykge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFxuICAgICAgICAgIGBNaXNzaW5nIHRleHQgYmVmb3JlIFwiJHt0b2tlbi5uYW1lfVwiICR7dG9rZW4udHlwZX1gLFxuICAgICAgICAgIG9yaWdpbmFsUGF0aCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikge1xuICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgc291cmNlOiBoYXNTZWdtZW50Q2FwdHVyZSAvLyBTZWVuIHBhcmFtL3dpbGRjYXJkIGluIHNlZ21lbnQuXG4gICAgICAgICAgICA/IGAoJHtuZWdhdGUoZGVsaW1pdGVyLCBiYWNrdHJhY2spfSs/KWBcbiAgICAgICAgICAgIDogaGFzSW5TZWdtZW50KGluZGV4LCBcIndpbGRjYXJkXCIpIC8vIFNlZSB3aWxkY2FyZCBsYXRlciBpbiBzZWdtZW50LlxuICAgICAgICAgICAgICA/IGAoJHtuZWdhdGUoZGVsaW1pdGVyLCBwZWVrVGV4dChpbmRleCkpfSs/KWBcbiAgICAgICAgICAgICAgOiBgKCR7bmVnYXRlKGRlbGltaXRlciwgXCJcIil9Kz8pYCxcbiAgICAgICAgICBrZXk6IHRva2VuLFxuICAgICAgICB9KTtcblxuICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSB8PSBwcmV2Q2FwdHVyZVR5cGUgPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgIHNvdXJjZTpcbiAgICAgICAgICAgIGhhc1NlZ21lbnRDYXB0dXJlICYgMiAvLyBTZWVuIHdpbGRjYXJkIGluIHNlZ21lbnQuXG4gICAgICAgICAgICAgID8gYCgke25lZ2F0ZShiYWNrdHJhY2ssIFwiXCIpfSs/KWBcbiAgICAgICAgICAgICAgOiBoYXNTZWdtZW50Q2FwdHVyZSAmIDEgLy8gU2VlbiBwYXJhbSBpbiBzZWdtZW50LlxuICAgICAgICAgICAgICAgID8gYCgke25lZ2F0ZSh3aWxkY2FyZEJhY2t0cmFjaywgXCJcIil9Kz8pYFxuICAgICAgICAgICAgICAgIDogd2lsZGNhcmRCYWNrdHJhY2sgLy8gTm8gY2FwdHVyZSBpbiBzZWdtZW50LCBzZWVuIHdpbGRjYXJkIGluIHBhdGguXG4gICAgICAgICAgICAgICAgICA/IGAoJHtuZWdhdGUod2lsZGNhcmRCYWNrdHJhY2ssIFwiXCIpfSs/fCR7bmVnYXRlKGRlbGltaXRlciwgXCJcIil9Kz8pYFxuICAgICAgICAgICAgICAgICAgOiBgKFteXSs/KWAsXG4gICAgICAgICAga2V5OiB0b2tlbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd2lsZGNhcmRCYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgICBoYXNTZWdtZW50Q2FwdHVyZSB8PSBwcmV2Q2FwdHVyZVR5cGUgPSAyO1xuICAgICAgfVxuXG4gICAgICBiYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5rbm93biB0b2tlbiB0eXBlOiAkeyh0b2tlbiBhcyBhbnkpLnR5cGV9YCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEJsb2NrIGJhY2t0cmFja2luZyBvbiBwcmV2aW91cyB0ZXh0L2RlbGltaXRlci5cbiAqL1xuZnVuY3Rpb24gbmVnYXRlKGE6IHN0cmluZywgYjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGIubGVuZ3RoID4gYS5sZW5ndGgpIHJldHVybiBuZWdhdGUoYiwgYSk7IC8vIExvbmdlc3Qgc3RyaW5nIGZpcnN0LlxuXG4gIGlmIChhID09PSBiKSBiID0gXCJcIjsgLy8gQ2xlYW5lciByZWdleCBzdHJpbmdzLCBubyBkdXBsaWNhdGlvbi5cbiAgaWYgKGIubGVuZ3RoID4gMSkgcmV0dXJuIGAoPzooPyEke2VzY2FwZShhKX18JHtlc2NhcGUoYil9KVteXSlgO1xuICBpZiAoYS5sZW5ndGggPiAxKSByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGEpfSlbXiR7ZXNjYXBlKGIpfV0pYDtcbiAgcmV0dXJuIGBbXiR7ZXNjYXBlKGEgKyBiKX1dYDtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgYW4gYXJyYXkgb2YgdG9rZW5zIGludG8gYSBwYXRoIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5VG9rZW5zKHRva2VuczogVG9rZW5bXSwgaW5kZXg6IG51bWJlcik6IHN0cmluZyB7XG4gIGxldCB2YWx1ZSA9IFwiXCI7XG5cbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICB2YWx1ZSArPSBlc2NhcGVUZXh0KHRva2VuLnZhbHVlKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgIHZhbHVlICs9IFwie1wiICsgc3RyaW5naWZ5VG9rZW5zKHRva2VuLnRva2VucywgMCkgKyBcIn1cIjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgIHZhbHVlICs9IFwiOlwiICsgc3RyaW5naWZ5TmFtZSh0b2tlbi5uYW1lLCB0b2tlbnNbaW5kZXhdKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIHZhbHVlICs9IFwiKlwiICsgc3RyaW5naWZ5TmFtZSh0b2tlbi5uYW1lLCB0b2tlbnNbaW5kZXhdKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVua25vd24gdG9rZW4gdHlwZTogJHsodG9rZW4gYXMgYW55KS50eXBlfWApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFN0cmluZ2lmeSB0b2tlbiBkYXRhIGludG8gYSBwYXRoIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ2lmeShkYXRhOiBUb2tlbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gc3RyaW5naWZ5VG9rZW5zKGRhdGEudG9rZW5zLCAwKTtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgYSBwYXJhbWV0ZXIgbmFtZSwgZXNjYXBpbmcgd2hlbiBpdCBjYW5ub3QgYmUgZW1pdHRlZCBkaXJlY3RseS5cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5TmFtZShuYW1lOiBzdHJpbmcsIG5leHQ6IFRva2VuIHwgdW5kZWZpbmVkKTogc3RyaW5nIHtcbiAgaWYgKCFJRC50ZXN0KG5hbWUpKSByZXR1cm4gSlNPTi5zdHJpbmdpZnkobmFtZSk7XG5cbiAgaWYgKG5leHQ/LnR5cGUgPT09IFwidGV4dFwiICYmIElEX0NPTlRJTlVFLnRlc3QobmV4dC52YWx1ZVswXSkpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobmFtZSk7XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgRW5jb2RlIGFzIHAyckVuY29kZSxcbiAgICB0eXBlIERlY29kZSBhcyBwMnJEZWNvZGUsXG4gICAgdHlwZSBQYXJzZU9wdGlvbnMgYXMgcDJyUGFyc2VPcHRpb25zLFxuICAgIHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyBhcyBwMnJQYXRoVG9SZWdleHBPcHRpb25zLFxuICAgIHR5cGUgTWF0Y2hPcHRpb25zIGFzIHAyck1hdGNoT3B0aW9ucyxcbiAgICB0eXBlIENvbXBpbGVPcHRpb25zIGFzIHAyckNvbXBpbGVPcHRpb25zLFxuICAgIHR5cGUgUGFyYW1EYXRhIGFzIHAyclBhcmFtRGF0YSxcbiAgICB0eXBlIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgdHlwZSBNYXRjaFJlc3VsdCBhcyBwMnJNYXRjaFJlc3VsdCxcbiAgICB0eXBlIE1hdGNoIGFzIHAyck1hdGNoLFxuICAgIHR5cGUgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIHR5cGUgS2V5IGFzIHAycktleSxcbiAgICB0eXBlIFRva2VuIGFzIHAyclRva2VuLFxuICAgIHR5cGUgUGF0aCBhcyBwMnJQYXRoLFxuICAgIFRva2VuRGF0YSBhcyBwMnJUb2tlbkRhdGEsXG4gICAgUGF0aEVycm9yIGFzIHAyclBhdGhFcnJvcixcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHN0cmluZ2lmeSxcbiAgICBwYXRoVG9SZWdleHAsXG59IGZyb20gJ3BhdGgtdG8tcmVnZXhwJztcblxuZGVjbGFyZSBuYW1lc3BhY2UgcGF0aDJyZWdleHAge1xuICAgIGV4cG9ydCB0eXBlIEVuY29kZSA9IHAyckVuY29kZTtcbiAgICBleHBvcnQgdHlwZSBEZWNvZGUgPSBwMnJEZWNvZGU7XG4gICAgZXhwb3J0IHR5cGUgUGFyc2VPcHRpb25zID0gcDJyUGFyc2VPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgPSBwMnJQYXRoVG9SZWdleHBPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoT3B0aW9ucyA9IHAyck1hdGNoT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBDb21waWxlT3B0aW9ucyA9IHAyckNvbXBpbGVPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRva2VuRGF0YSA9IHAyclRva2VuRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXJhbURhdGEgPSBwMnJQYXJhbURhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyUGF0aEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2hSZXN1bHQ8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2hGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBLZXkgPSBwMnJLZXk7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW4gPSBwMnJUb2tlbjtcbiAgICBleHBvcnQgdHlwZSBQYXRoID0gcDJyUGF0aDtcbn1cblxuY29uc3QgcGF0aDJyZWdleHAgPSB7XG4gICAgVG9rZW5EYXRhOiBwMnJUb2tlbkRhdGEsXG4gICAgUGF0aEVycm9yOiBwMnJQYXRoRXJyb3IsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICBtYXRjaCxcbiAgICBzdHJpbmdpZnksXG4gICAgcGF0aFRvUmVnZXhwLFxufTtcblxuZXhwb3J0IHsgcGF0aDJyZWdleHAgfTtcbiJdLCJuYW1lcyI6WyJwMnJUb2tlbkRhdGEiLCJwMnJQYXRoRXJyb3IiLCJwYXJzZSIsImNvbXBpbGUiLCJtYXRjaCIsInN0cmluZ2lmeSIsInBhdGhUb1JlZ2V4cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFpTEEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUE7SUFrSEEsQ0FBQSxJQUFBLENBQUEsT0FBQSxHQUFBLE9BQUE7SUFnSUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUE7SUFvQ0EsQ0FBQSxJQUFBLENBQUEsWUFBQSxHQUFBLFlBQUE7SUF1UEEsQ0FBQSxJQUFBLENBQUEsU0FBQSxHQUFBLFNBQUE7S0E5ckJBLE1BQU0saUJBQWlCLEdBQUcsR0FBRztJQUM3QixDQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxLQUFLLEtBQUs7S0FDM0MsTUFBTSxRQUFRLEdBQUcscUJBQXFCO0tBQ3RDLE1BQU0sV0FBVyxHQUFHLG1DQUFtQztLQUN2RCxNQUFNLEVBQUUsR0FBRyxvREFBb0Q7S0FrRi9ELE1BQU0sYUFBYSxHQUFHLFdBQVc7SUFFakM7O0lBRUc7S0FDSCxTQUFTLFVBQVUsQ0FBQyxHQUFXLEVBQUE7U0FDN0IsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQztJQUNsRCxDQUFBO0lBRUE7O0lBRUc7S0FDSCxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUE7U0FDekIsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLE1BQU0sQ0FBQztJQUNwRCxDQUFBO0lBaURBOztJ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LENBQUM7aUJBQ3ZEOzthQUdGLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQSxvQkFBQSxFQUF3QixLQUFhLENBQUMsSUFBSSxDQUFBLENBQUUsQ0FBQzs7SUFHbkUsS0FBQSxPQUFPLEtBQUs7SUFDZCxDQUFBO0lBRUE7O0lBRUc7S0FDSCxTQUFnQixTQUFTLENBQUMsSUFBZSxFQUFBO1NBQ3ZDLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUE7SUFFQTs7SUFFRztJQUNILENBQUEsU0FBUyxhQUFhLENBQUMsSUFBWSxFQUFFLElBQXVCLEVBQUE7SUFDMUQsS0FBQSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7SUFBRSxTQUFBLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7U0FFL0MsSUFBSSxDQUFBLElBQUksS0FBQSxJQUFBLElBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsSUFBSSxNQUFLLE1BQU0sSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUM1RCxTQUFBLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7O0lBRzdCLEtBQUEsT0FBTyxJQUFJO0lBQ2IsQ0FBQTs7Ozs7OztJQzdzQkE7O0lBRUc7QUE0Q0gsVUFBTSxXQUFXLEdBQUc7SUFDaEIsSUFBQSxTQUFTLEVBQUVBLHFCQUFZO0lBQ3ZCLElBQUEsU0FBUyxFQUFFQyxxQkFBWTtlQUN2QkMsaUJBQUs7aUJBQ0xDLG1CQUFPO2VBQ1BDLGlCQUFLO21CQUNMQyxxQkFBUztzQkFDVEMsd0JBQVk7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cC8ifQ==