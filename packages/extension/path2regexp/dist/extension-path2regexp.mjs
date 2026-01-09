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

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9TVEFSVCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV0kL3U7XG5jb25zdCBJRF9DT05USU5VRSA9IC9eWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dJC91O1xuXG4vKipcbiAqIEVuY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBFbmNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG4vKipcbiAqIERlY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBEZWNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzLlxuICAgKi9cbiAgZW5jb2RlUGF0aD86IEVuY29kZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIE1hdGNoZXMgdGhlIHBhdGggY29tcGxldGVseSB3aXRob3V0IHRyYWlsaW5nIGNoYXJhY3RlcnMuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3dzIG9wdGlvbmFsIHRyYWlsaW5nIGRlbGltaXRlciB0byBtYXRjaC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHRyYWlsaW5nPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE1hdGNoIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaE9wdGlvbnMgZXh0ZW5kcyBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBkZWNvZGluZyBzdHJpbmdzIGZvciBwYXJhbXMsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBkZWNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZGVjb2RlPzogRGVjb2RlIHwgZmFsc2U7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZU9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xufVxuXG50eXBlIFRva2VuVHlwZSA9XG4gIHwgXCJ7XCJcbiAgfCBcIn1cIlxuICB8IFwid2lsZGNhcmRcIlxuICB8IFwicGFyYW1cIlxuICB8IFwiY2hhclwiXG4gIHwgXCJlc2NhcGVcIlxuICB8IFwiZW5kXCJcbiAgLy8gUmVzZXJ2ZWQgZm9yIHVzZSBvciBhbWJpZ3VvdXMgZHVlIHRvIHBhc3QgdXNlLlxuICB8IFwiKFwiXG4gIHwgXCIpXCJcbiAgfCBcIltcIlxuICB8IFwiXVwiXG4gIHwgXCIrXCJcbiAgfCBcIj9cIlxuICB8IFwiIVwiO1xuXG4vKipcbiAqIFRva2VuaXplciByZXN1bHRzLlxuICovXG5pbnRlcmZhY2UgTGV4VG9rZW4ge1xuICB0eXBlOiBUb2tlblR5cGU7XG4gIGluZGV4OiBudW1iZXI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmNvbnN0IFNJTVBMRV9UT0tFTlM6IFJlY29yZDxzdHJpbmcsIFRva2VuVHlwZT4gPSB7XG4gIC8vIEdyb3Vwcy5cbiAgXCJ7XCI6IFwie1wiLFxuICBcIn1cIjogXCJ9XCIsXG4gIC8vIFJlc2VydmVkLlxuICBcIihcIjogXCIoXCIsXG4gIFwiKVwiOiBcIilcIixcbiAgXCJbXCI6IFwiW1wiLFxuICBcIl1cIjogXCJdXCIsXG4gIFwiK1wiOiBcIitcIixcbiAgXCI/XCI6IFwiP1wiLFxuICBcIiFcIjogXCIhXCIsXG59O1xuXG4vKipcbiAqIEVzY2FwZSB0ZXh0IGZvciBzdHJpbmdpZnkgdG8gcGF0aC5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlVGV4dChzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL1t7fSgpXFxbXFxdKz8hOipcXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGUoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bLisqP14ke30oKVtcXF18L1xcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuXG4vKipcbiAqIFBsYWluIHRleHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGV4dCB7XG4gIHR5cGU6IFwidGV4dFwiO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIGFyYml0cmFyeSB0ZXh0IHdpdGhpbiBhIHNlZ21lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyIHtcbiAgdHlwZTogXCJwYXJhbVwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB3aWxkY2FyZCBwYXJhbWV0ZXIgZGVzaWduZWQgdG8gbWF0Y2ggbXVsdGlwbGUgc2VnbWVudHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgV2lsZGNhcmQge1xuICB0eXBlOiBcIndpbGRjYXJkXCI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHNldCBvZiBwb3NzaWJsZSB0b2tlbnMgdG8gZXhwYW5kIHdoZW4gbWF0Y2hpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JvdXAge1xuICB0eXBlOiBcImdyb3VwXCI7XG4gIHRva2VuczogVG9rZW5bXTtcbn1cblxuLyoqXG4gKiBBIHRva2VuIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIHJlZ2V4cCBjYXB0dXJlLlxuICovXG5leHBvcnQgdHlwZSBLZXkgPSBQYXJhbWV0ZXIgfCBXaWxkY2FyZDtcblxuLyoqXG4gKiBBIHNlcXVlbmNlIG9mIGBwYXRoLXRvLXJlZ2V4cGAga2V5cyB0aGF0IG1hdGNoIGNhcHR1cmluZyBncm91cHMuXG4gKi9cbmV4cG9ydCB0eXBlIEtleXMgPSBBcnJheTxLZXk+O1xuXG4vKipcbiAqIEEgc2VxdWVuY2Ugb2YgcGF0aCBtYXRjaCBjaGFyYWN0ZXJzLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IFRleHQgfCBQYXJhbWV0ZXIgfCBXaWxkY2FyZCB8IEdyb3VwO1xuXG4vKipcbiAqIFRva2VuaXplZCBwYXRoIGluc3RhbmNlLlxuICovXG5leHBvcnQgY2xhc3MgVG9rZW5EYXRhIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHRva2VuczogVG9rZW5bXSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgb3JpZ2luYWxQYXRoPzogc3RyaW5nLFxuICApIHt9XG59XG5cbi8qKlxuICogUGFyc2VFcnJvciBpcyB0aHJvd24gd2hlbiB0aGVyZSBpcyBhbiBlcnJvciBwcm9jZXNzaW5nIHRoZSBwYXRoLlxuICovXG5leHBvcnQgY2xhc3MgUGF0aEVycm9yIGV4dGVuZHMgVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBvcmlnaW5hbFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgKSB7XG4gICAgbGV0IHRleHQgPSBtZXNzYWdlO1xuICAgIGlmIChvcmlnaW5hbFBhdGgpIHRleHQgKz0gYDogJHtvcmlnaW5hbFBhdGh9YDtcbiAgICB0ZXh0ICs9IGA7IHZpc2l0IGh0dHBzOi8vZ2l0Lm5ldy9wYXRoVG9SZWdleHBFcnJvciBmb3IgaW5mb2A7XG4gICAgc3VwZXIodGV4dCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhIHN0cmluZyBmb3IgdGhlIHJhdyB0b2tlbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShzdHI6IHN0cmluZywgb3B0aW9uczogUGFyc2VPcHRpb25zID0ge30pOiBUb2tlbkRhdGEge1xuICBjb25zdCB7IGVuY29kZVBhdGggPSBOT09QX1ZBTFVFIH0gPSBvcHRpb25zO1xuICBjb25zdCBjaGFycyA9IFsuLi5zdHJdO1xuICBjb25zdCB0b2tlbnM6IEFycmF5PExleFRva2VuPiA9IFtdO1xuICBsZXQgaW5kZXggPSAwO1xuICBsZXQgcG9zID0gMDtcblxuICBmdW5jdGlvbiBuYW1lKCkge1xuICAgIGxldCB2YWx1ZSA9IFwiXCI7XG5cbiAgICBpZiAoSURfU1RBUlQudGVzdChjaGFyc1tpbmRleF0pKSB7XG4gICAgICBkbyB7XG4gICAgICAgIHZhbHVlICs9IGNoYXJzW2luZGV4KytdO1xuICAgICAgfSB3aGlsZSAoSURfQ09OVElOVUUudGVzdChjaGFyc1tpbmRleF0pKTtcbiAgICB9IGVsc2UgaWYgKGNoYXJzW2luZGV4XSA9PT0gJ1wiJykge1xuICAgICAgbGV0IHF1b3RlU3RhcnQgPSBpbmRleDtcblxuICAgICAgd2hpbGUgKGluZGV4KysgPCBjaGFycy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGNoYXJzW2luZGV4XSA9PT0gJ1wiJykge1xuICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgcXVvdGVTdGFydCA9IDA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbmNyZW1lbnQgb3ZlciBlc2NhcGUgY2hhcmFjdGVycy5cbiAgICAgICAgaWYgKGNoYXJzW2luZGV4XSA9PT0gXCJcXFxcXCIpIGluZGV4Kys7XG5cbiAgICAgICAgdmFsdWUgKz0gY2hhcnNbaW5kZXhdO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVvdGVTdGFydCkge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBVbnRlcm1pbmF0ZWQgcXVvdGUgYXQgaW5kZXggJHtxdW90ZVN0YXJ0fWAsIHN0cik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXIgbmFtZSBhdCBpbmRleCAke2luZGV4fWAsIHN0cik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgd2hpbGUgKGluZGV4IDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjaGFyc1tpbmRleF07XG4gICAgY29uc3QgdHlwZSA9IFNJTVBMRV9UT0tFTlNbdmFsdWVdO1xuXG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZSwgaW5kZXg6IGluZGV4KyssIHZhbHVlIH0pO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiXFxcXFwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiZXNjYXBlXCIsIGluZGV4OiBpbmRleCsrLCB2YWx1ZTogY2hhcnNbaW5kZXgrK10gfSk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gXCI6XCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJwYXJhbVwiLCBpbmRleDogaW5kZXgrKywgdmFsdWU6IG5hbWUoKSB9KTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSBcIipcIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIndpbGRjYXJkXCIsIGluZGV4OiBpbmRleCsrLCB2YWx1ZTogbmFtZSgpIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiY2hhclwiLCBpbmRleDogaW5kZXgrKywgdmFsdWUgfSk7XG4gICAgfVxuICB9XG5cbiAgdG9rZW5zLnB1c2goeyB0eXBlOiBcImVuZFwiLCBpbmRleCwgdmFsdWU6IFwiXCIgfSk7XG5cbiAgZnVuY3Rpb24gY29uc3VtZVVudGlsKGVuZFR5cGU6IFRva2VuVHlwZSk6IFRva2VuW10ge1xuICAgIGNvbnN0IG91dHB1dDogVG9rZW5bXSA9IFtdO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW3BvcysrXTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBlbmRUeXBlKSBicmVhaztcblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwiY2hhclwiIHx8IHRva2VuLnR5cGUgPT09IFwiZXNjYXBlXCIpIHtcbiAgICAgICAgbGV0IHBhdGggPSB0b2tlbi52YWx1ZTtcbiAgICAgICAgbGV0IGN1ciA9IHRva2Vuc1twb3NdO1xuXG4gICAgICAgIHdoaWxlIChjdXIudHlwZSA9PT0gXCJjaGFyXCIgfHwgY3VyLnR5cGUgPT09IFwiZXNjYXBlXCIpIHtcbiAgICAgICAgICBwYXRoICs9IGN1ci52YWx1ZTtcbiAgICAgICAgICBjdXIgPSB0b2tlbnNbKytwb3NdO1xuICAgICAgICB9XG5cbiAgICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgIHZhbHVlOiBlbmNvZGVQYXRoKHBhdGgpLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiB0b2tlbi50eXBlLFxuICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcIntcIikge1xuICAgICAgICBvdXRwdXQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgICAgIHRva2VuczogY29uc3VtZVVudGlsKFwifVwiKSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFxuICAgICAgICBgVW5leHBlY3RlZCAke3Rva2VuLnR5cGV9IGF0IGluZGV4ICR7dG9rZW4uaW5kZXh9LCBleHBlY3RlZCAke2VuZFR5cGV9YCxcbiAgICAgICAgc3RyLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgcmV0dXJuIG5ldyBUb2tlbkRhdGEoY29uc3VtZVVudGlsKFwiZW5kXCIpLCBzdHIpO1xufVxuXG4vKipcbiAqIENvbXBpbGUgYSBzdHJpbmcgdG8gYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmb3IgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlPFAgZXh0ZW5kcyBQYXJhbURhdGEgPSBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoLFxuICBvcHRpb25zOiBDb21waWxlT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKSB7XG4gIGNvbnN0IHsgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50LCBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUiB9ID1cbiAgICBvcHRpb25zO1xuICBjb25zdCBkYXRhID0gdHlwZW9mIHBhdGggPT09IFwib2JqZWN0XCIgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gIGNvbnN0IGZuID0gdG9rZW5zVG9GdW5jdGlvbihkYXRhLnRva2VucywgZGVsaW1pdGVyLCBlbmNvZGUpO1xuXG4gIHJldHVybiBmdW5jdGlvbiBwYXRoKHBhcmFtczogUCA9IHt9IGFzIFApIHtcbiAgICBjb25zdCBbcGF0aCwgLi4ubWlzc2luZ10gPSBmbihwYXJhbXMpO1xuICAgIGlmIChtaXNzaW5nLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXJzOiAke21pc3Npbmcuam9pbihcIiwgXCIpfWApO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXT4+O1xuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbmZ1bmN0aW9uIHRva2Vuc1RvRnVuY3Rpb24oXG4gIHRva2VuczogVG9rZW5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pIHtcbiAgY29uc3QgZW5jb2RlcnMgPSB0b2tlbnMubWFwKCh0b2tlbikgPT5cbiAgICB0b2tlblRvRnVuY3Rpb24odG9rZW4sIGRlbGltaXRlciwgZW5jb2RlKSxcbiAgKTtcblxuICByZXR1cm4gKGRhdGE6IFBhcmFtRGF0YSkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXCJcIl07XG5cbiAgICBmb3IgKGNvbnN0IGVuY29kZXIgb2YgZW5jb2RlcnMpIHtcbiAgICAgIGNvbnN0IFt2YWx1ZSwgLi4uZXh0cmFzXSA9IGVuY29kZXIoZGF0YSk7XG4gICAgICByZXN1bHRbMF0gKz0gdmFsdWU7XG4gICAgICByZXN1bHQucHVzaCguLi5leHRyYXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydCBhIHNpbmdsZSB0b2tlbiBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gdG9rZW5Ub0Z1bmN0aW9uKFxuICB0b2tlbjogVG9rZW4sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogKGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nW10ge1xuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHJldHVybiAoKSA9PiBbdG9rZW4udmFsdWVdO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24odG9rZW4udG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IFt2YWx1ZSwgLi4ubWlzc2luZ10gPSBmbihkYXRhKTtcbiAgICAgIGlmICghbWlzc2luZy5sZW5ndGgpIHJldHVybiBbdmFsdWVdO1xuICAgICAgcmV0dXJuIFtcIlwiXTtcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgZW5jb2RlVmFsdWUgPSBlbmNvZGUgfHwgTk9PUF9WQUxVRTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiICYmIGVuY29kZSAhPT0gZmFsc2UpIHtcbiAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gW1wiXCIsIHRva2VuLm5hbWVdO1xuXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIG5vbi1lbXB0eSBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW1xuICAgICAgICB2YWx1ZVxuICAgICAgICAgIC5tYXAoKHZhbHVlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX0vJHtpbmRleH1cIiB0byBiZSBhIHN0cmluZ2AsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVWYWx1ZSh2YWx1ZSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuam9pbihkZWxpbWl0ZXIpLFxuICAgICAgXTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gW1wiXCIsIHRva2VuLm5hbWVdO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2VuY29kZVZhbHVlKHZhbHVlKV07XG4gIH07XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiB7XG4gIHBhdGg6IHN0cmluZztcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAocGF0aDogc3RyaW5nKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBTdXBwb3J0ZWQgcGF0aCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBwYXRoIGludG8gYSBtYXRjaCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoIHwgUGF0aFtdLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgeyByZWdleHAsIGtleXMgfSA9IHBhdGhUb1JlZ2V4cChwYXRoLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlID09PSBmYWxzZSkgcmV0dXJuIE5PT1BfVkFMVUU7XG4gICAgaWYgKGtleS50eXBlID09PSBcInBhcmFtXCIpIHJldHVybiBkZWNvZGU7XG4gICAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5zcGxpdChkZWxpbWl0ZXIpLm1hcChkZWNvZGUpO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2goaW5wdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZWdleHAuZXhlYyhpbnB1dCk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBwYXRoID0gbVswXTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG4gICAgICBjb25zdCBkZWNvZGVyID0gZGVjb2RlcnNbaSAtIDFdO1xuICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZXIobVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgcGFyYW1zIH07XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9SZWdleHAoXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7XG4gICAgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIsXG4gICAgZW5kID0gdHJ1ZSxcbiAgICBzZW5zaXRpdmUgPSBmYWxzZSxcbiAgICB0cmFpbGluZyA9IHRydWUsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBrZXlzOiBLZXlzID0gW107XG4gIGNvbnN0IGZsYWdzID0gc2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiO1xuICBjb25zdCBzb3VyY2VzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgaW5wdXQgb2YgcGF0aHNUb0FycmF5KHBhdGgsIFtdKSkge1xuICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YgaW5wdXQgPT09IFwib2JqZWN0XCIgPyBpbnB1dCA6IHBhcnNlKGlucHV0LCBvcHRpb25zKTtcbiAgICBmb3IgKGNvbnN0IHRva2VucyBvZiBmbGF0dGVuKGRhdGEudG9rZW5zLCAwLCBbXSkpIHtcbiAgICAgIHNvdXJjZXMucHVzaCh0b1JlZ0V4cFNvdXJjZSh0b2tlbnMsIGRlbGltaXRlciwga2V5cywgZGF0YS5vcmlnaW5hbFBhdGgpKTtcbiAgICB9XG4gIH1cblxuICBsZXQgcGF0dGVybiA9IGBeKD86JHtzb3VyY2VzLmpvaW4oXCJ8XCIpfSlgO1xuICBpZiAodHJhaWxpbmcpIHBhdHRlcm4gKz0gYCg/OiR7ZXNjYXBlKGRlbGltaXRlcil9JCk/YDtcbiAgcGF0dGVybiArPSBlbmQgPyBcIiRcIiA6IGAoPz0ke2VzY2FwZShkZWxpbWl0ZXIpfXwkKWA7XG5cbiAgY29uc3QgcmVnZXhwID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG4gIHJldHVybiB7IHJlZ2V4cCwga2V5cyB9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBwYXRoIG9yIGFycmF5IG9mIHBhdGhzIGludG8gYSBmbGF0IGFycmF5LlxuICovXG5mdW5jdGlvbiBwYXRoc1RvQXJyYXkocGF0aHM6IFBhdGggfCBQYXRoW10sIGluaXQ6IFBhdGhbXSk6IFBhdGhbXSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHBhdGhzKSkge1xuICAgIGZvciAoY29uc3QgcCBvZiBwYXRocykgcGF0aHNUb0FycmF5KHAsIGluaXQpO1xuICB9IGVsc2Uge1xuICAgIGluaXQucHVzaChwYXRocyk7XG4gIH1cbiAgcmV0dXJuIGluaXQ7XG59XG5cbi8qKlxuICogRmxhdHRlbmVkIHRva2VuIHNldC5cbiAqL1xudHlwZSBGbGF0VG9rZW4gPSBUZXh0IHwgUGFyYW1ldGVyIHwgV2lsZGNhcmQ7XG5cbi8qKlxuICogR2VuZXJhdGUgYSBmbGF0IGxpc3Qgb2Ygc2VxdWVuY2UgdG9rZW5zIGZyb20gdGhlIGdpdmVuIHRva2Vucy5cbiAqL1xuZnVuY3Rpb24qIGZsYXR0ZW4oXG4gIHRva2VuczogVG9rZW5bXSxcbiAgaW5kZXg6IG51bWJlcixcbiAgaW5pdDogRmxhdFRva2VuW10sXG4pOiBHZW5lcmF0b3I8RmxhdFRva2VuW10+IHtcbiAgaWYgKGluZGV4ID09PSB0b2tlbnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHlpZWxkIGluaXQ7XG4gIH1cblxuICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleF07XG5cbiAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgIGZvciAoY29uc3Qgc2VxIG9mIGZsYXR0ZW4odG9rZW4udG9rZW5zLCAwLCBpbml0LnNsaWNlKCkpKSB7XG4gICAgICB5aWVsZCogZmxhdHRlbih0b2tlbnMsIGluZGV4ICsgMSwgc2VxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaW5pdC5wdXNoKHRva2VuKTtcbiAgfVxuXG4gIHlpZWxkKiBmbGF0dGVuKHRva2VucywgaW5kZXggKyAxLCBpbml0KTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBmbGF0IHNlcXVlbmNlIG9mIHRva2VucyBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uLlxuICovXG5mdW5jdGlvbiB0b1JlZ0V4cFNvdXJjZShcbiAgdG9rZW5zOiBGbGF0VG9rZW5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGtleXM6IEtleXMsXG4gIG9yaWdpbmFsUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuKTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gIGxldCBiYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgaXNTYWZlU2VnbWVudFBhcmFtID0gdHJ1ZTtcblxuICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikge1xuICAgICAgcmVzdWx0ICs9IGVzY2FwZSh0b2tlbi52YWx1ZSk7XG4gICAgICBiYWNrdHJhY2sgKz0gdG9rZW4udmFsdWU7XG4gICAgICBpc1NhZmVTZWdtZW50UGFyYW0gfHw9IHRva2VuLnZhbHVlLmluY2x1ZGVzKGRlbGltaXRlcik7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJwYXJhbVwiIHx8IHRva2VuLnR5cGUgPT09IFwid2lsZGNhcmRcIikge1xuICAgICAgaWYgKCFpc1NhZmVTZWdtZW50UGFyYW0gJiYgIWJhY2t0cmFjaykge1xuICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFxuICAgICAgICAgIGBNaXNzaW5nIHRleHQgYmVmb3JlIFwiJHt0b2tlbi5uYW1lfVwiICR7dG9rZW4udHlwZX1gLFxuICAgICAgICAgIG9yaWdpbmFsUGF0aCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikge1xuICAgICAgICByZXN1bHQgKz0gYCgke25lZ2F0ZShkZWxpbWl0ZXIsIGlzU2FmZVNlZ21lbnRQYXJhbSA/IFwiXCIgOiBiYWNrdHJhY2spfSspYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCArPSBgKFtcXFxcc1xcXFxTXSspYDtcbiAgICAgIH1cblxuICAgICAga2V5cy5wdXNoKHRva2VuKTtcbiAgICAgIGJhY2t0cmFjayA9IFwiXCI7XG4gICAgICBpc1NhZmVTZWdtZW50UGFyYW0gPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQmxvY2sgYmFja3RyYWNraW5nIG9uIHByZXZpb3VzIHRleHQgYW5kIGlnbm9yZSBkZWxpbWl0ZXIgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBuZWdhdGUoZGVsaW1pdGVyOiBzdHJpbmcsIGJhY2t0cmFjazogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGJhY2t0cmFjay5sZW5ndGggPCAyKSB7XG4gICAgaWYgKGRlbGltaXRlci5sZW5ndGggPCAyKSByZXR1cm4gYFteJHtlc2NhcGUoZGVsaW1pdGVyICsgYmFja3RyYWNrKX1dYDtcbiAgICByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGRlbGltaXRlcil9KVteJHtlc2NhcGUoYmFja3RyYWNrKX1dKWA7XG4gIH1cbiAgaWYgKGRlbGltaXRlci5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIGAoPzooPyEke2VzY2FwZShiYWNrdHJhY2spfSlbXiR7ZXNjYXBlKGRlbGltaXRlcil9XSlgO1xuICB9XG4gIHJldHVybiBgKD86KD8hJHtlc2NhcGUoYmFja3RyYWNrKX18JHtlc2NhcGUoZGVsaW1pdGVyKX0pW1xcXFxzXFxcXFNdKWA7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IGFuIGFycmF5IG9mIHRva2VucyBpbnRvIGEgcGF0aCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeVRva2Vucyh0b2tlbnM6IFRva2VuW10pOiBzdHJpbmcge1xuICBsZXQgdmFsdWUgPSBcIlwiO1xuICBsZXQgaSA9IDA7XG5cbiAgZnVuY3Rpb24gbmFtZSh2YWx1ZTogc3RyaW5nKSB7XG4gICAgY29uc3QgaXNTYWZlID0gaXNOYW1lU2FmZSh2YWx1ZSkgJiYgaXNOZXh0TmFtZVNhZmUodG9rZW5zW2ldKTtcbiAgICByZXR1cm4gaXNTYWZlID8gdmFsdWUgOiBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gIH1cblxuICB3aGlsZSAoaSA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpKytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICB2YWx1ZSArPSBlc2NhcGVUZXh0KHRva2VuLnZhbHVlKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgIHZhbHVlICs9IGB7JHtzdHJpbmdpZnlUb2tlbnModG9rZW4udG9rZW5zKX19YDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgIHZhbHVlICs9IGA6JHtuYW1lKHRva2VuLm5hbWUpfWA7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICB2YWx1ZSArPSBgKiR7bmFtZSh0b2tlbi5uYW1lKX1gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5rbm93biB0b2tlbiB0eXBlOiAkeyh0b2tlbiBhcyBhbnkpLnR5cGV9YCk7XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IHRva2VuIGRhdGEgaW50byBhIHBhdGggc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5KGRhdGE6IFRva2VuRGF0YSk6IHN0cmluZyB7XG4gIHJldHVybiBzdHJpbmdpZnlUb2tlbnMoZGF0YS50b2tlbnMpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHRoZSBwYXJhbWV0ZXIgbmFtZSBjb250YWlucyB2YWxpZCBJRCBjaGFyYWN0ZXJzLlxuICovXG5mdW5jdGlvbiBpc05hbWVTYWZlKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBbZmlyc3QsIC4uLnJlc3RdID0gbmFtZTtcbiAgcmV0dXJuIElEX1NUQVJULnRlc3QoZmlyc3QpICYmIHJlc3QuZXZlcnkoKGNoYXIpID0+IElEX0NPTlRJTlVFLnRlc3QoY2hhcikpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHRoZSBuZXh0IHRva2VuIGRvZXMgbm90IGludGVyZmVyZSB3aXRoIHRoZSBjdXJyZW50IHBhcmFtIG5hbWUuXG4gKi9cbmZ1bmN0aW9uIGlzTmV4dE5hbWVTYWZlKHRva2VuOiBUb2tlbiB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICBpZiAodG9rZW4gJiYgdG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHJldHVybiAhSURfQ09OVElOVUUudGVzdCh0b2tlbi52YWx1ZVswXSk7XG4gIHJldHVybiB0cnVlO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBFbmNvZGUgYXMgcDJyRW5jb2RlLFxuICAgIHR5cGUgRGVjb2RlIGFzIHAyckRlY29kZSxcbiAgICB0eXBlIFBhcnNlT3B0aW9ucyBhcyBwMnJQYXJzZU9wdGlvbnMsXG4gICAgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zIGFzIHAyclBhdGhUb1JlZ2V4cE9wdGlvbnMsXG4gICAgdHlwZSBNYXRjaE9wdGlvbnMgYXMgcDJyTWF0Y2hPcHRpb25zLFxuICAgIHR5cGUgQ29tcGlsZU9wdGlvbnMgYXMgcDJyQ29tcGlsZU9wdGlvbnMsXG4gICAgdHlwZSBQYXJhbURhdGEgYXMgcDJyUGFyYW1EYXRhLFxuICAgIHR5cGUgUGF0aEZ1bmN0aW9uIGFzIHAyclBhdGhGdW5jdGlvbixcbiAgICB0eXBlIE1hdGNoUmVzdWx0IGFzIHAyck1hdGNoUmVzdWx0LFxuICAgIHR5cGUgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgdHlwZSBNYXRjaEZ1bmN0aW9uIGFzIHAyck1hdGNoRnVuY3Rpb24sXG4gICAgdHlwZSBLZXkgYXMgcDJyS2V5LFxuICAgIHR5cGUgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgdHlwZSBQYXRoIGFzIHAyclBhdGgsXG4gICAgVG9rZW5EYXRhIGFzIHAyclRva2VuRGF0YSxcbiAgICBQYXRoRXJyb3IgYXMgcDJyUGF0aEVycm9yLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgRW5jb2RlID0gcDJyRW5jb2RlO1xuICAgIGV4cG9ydCB0eXBlIERlY29kZSA9IHAyckRlY29kZTtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyA9IHAyclBhdGhUb1JlZ2V4cE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hPcHRpb25zID0gcDJyTWF0Y2hPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIENvbXBpbGVPcHRpb25zID0gcDJyQ29tcGlsZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5EYXRhID0gcDJyVG9rZW5EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IHAyclBhcmFtRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJQYXRoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaFJlc3VsdDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xufVxuXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBUb2tlbkRhdGE6IHAyclRva2VuRGF0YSxcbiAgICBQYXRoRXJyb3I6IHAyclBhdGhFcnJvcixcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHN0cmluZ2lmeSxcbiAgICBwYXRoVG9SZWdleHAsXG59O1xuXG5leHBvcnQgeyBwYXRoMnJlZ2V4cCB9O1xuIl0sIm5hbWVzIjpbInAyclRva2VuRGF0YSIsInAyclBhdGhFcnJvciIsInBhcnNlIiwiY29tcGlsZSIsIm1hdGNoIiwic3RyaW5naWZ5IiwicGF0aFRvUmVnZXhwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQTRMQSxDQUFBLElBQUEsQ0FBQSxLQUFBLEdBQUEs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TUFBTSxDQUFDLENBQUEsQ0FBQSxDQUFHO2FBQzdDOztBQUdGLFNBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTthQUMxQixLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBLENBQUU7YUFDL0I7O0FBR0YsU0FBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFO2FBQzdCLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBRTthQUMvQjs7U0FHRixNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsb0JBQUEsRUFBd0IsS0FBYSxDQUFDLElBQUksQ0FBQSxDQUFFLENBQUM7O0FBR25FLEtBQUEsT0FBTyxLQUFLO0FBQ2QsQ0FBQTtBQUVBOztBQUVHO0NBQ0gsU0FBZ0IsU0FBUyxDQUFDLElBQWUsRUFBQTtBQUN2QyxLQUFBLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDckMsQ0FBQTtBQUVBOztBQUVHO0NBQ0gsU0FBUyxVQUFVLENBQUMsSUFBWSxFQUFBO0tBQzlCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJO0tBQzdCLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDN0UsQ0FBQTtBQUVBOztBQUVHO0NBQ0gsU0FBUyxjQUFjLENBQUMsS0FBd0IsRUFBQTtBQUM5QyxLQUFBLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTTtBQUFFLFNBQUEsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RSxLQUFBLE9BQU8sSUFBSTtBQUNiLENBQUE7Ozs7Ozs7QUNocEJBOztBQUVHO0FBNENILE1BQU0sV0FBVyxHQUFHO0FBQ2hCLElBQUEsU0FBUyxFQUFFQSxxQkFBWTtBQUN2QixJQUFBLFNBQVMsRUFBRUMscUJBQVk7V0FDdkJDLGlCQUFLO2FBQ0xDLG1CQUFPO1dBQ1BDLGlCQUFLO2VBQ0xDLHFCQUFTO2tCQUNUQyx3QkFBWTs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9