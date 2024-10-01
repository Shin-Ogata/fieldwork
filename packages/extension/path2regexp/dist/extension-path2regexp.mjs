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
	dist.stringify = stringify;
	const DEFAULT_DELIMITER = "/";
	const NOOP_VALUE = (value) => value;
	const ID_START = /^[$_\p{ID_Start}]$/u;
	const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
	const DEBUG_URL = "https://git.new/pathToRegexpError";
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
	    return str.replace(/[{}()\[\]+?!:*]/g, "\\$&");
	}
	/**
	 * Escape a regular expression string.
	 */
	function escape(str) {
	    return str.replace(/[.+*?^${}()[\]|/\\]/g, "\\$&");
	}
	/**
	 * Tokenize input string.
	 */
	function* lexer(str) {
	    const chars = [...str];
	    let i = 0;
	    function name() {
	        let value = "";
	        if (ID_START.test(chars[++i])) {
	            value += chars[i];
	            while (ID_CONTINUE.test(chars[++i])) {
	                value += chars[i];
	            }
	        }
	        else if (chars[i] === '"') {
	            let pos = i;
	            while (i < chars.length) {
	                if (chars[++i] === '"') {
	                    i++;
	                    pos = 0;
	                    break;
	                }
	                if (chars[i] === "\\") {
	                    value += chars[++i];
	                }
	                else {
	                    value += chars[i];
	                }
	            }
	            if (pos) {
	                throw new TypeError(`Unterminated quote at ${pos}: ${DEBUG_URL}`);
	            }
	        }
	        if (!value) {
	            throw new TypeError(`Missing parameter name at ${i}: ${DEBUG_URL}`);
	        }
	        return value;
	    }
	    while (i < chars.length) {
	        const value = chars[i];
	        const type = SIMPLE_TOKENS[value];
	        if (type) {
	            yield { type, index: i++, value };
	        }
	        else if (value === "\\") {
	            yield { type: "ESCAPED", index: i++, value: chars[i++] };
	        }
	        else if (value === ":") {
	            const value = name();
	            yield { type: "PARAM", index: i, value };
	        }
	        else if (value === "*") {
	            const value = name();
	            yield { type: "WILDCARD", index: i, value };
	        }
	        else {
	            yield { type: "CHAR", index: i, value: chars[i++] };
	        }
	    }
	    return { type: "END", index: i, value: "" };
	}
	class Iter {
	    constructor(tokens) {
	        this.tokens = tokens;
	    }
	    peek() {
	        if (!this._peek) {
	            const next = this.tokens.next();
	            this._peek = next.value;
	        }
	        return this._peek;
	    }
	    tryConsume(type) {
	        const token = this.peek();
	        if (token.type !== type)
	            return;
	        this._peek = undefined; // Reset after consumed.
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
	}
	/**
	 * Tokenized path instance.
	 */
	class TokenData {
	    constructor(tokens) {
	        this.tokens = tokens;
	    }
	}
	dist.TokenData = TokenData;
	/**
	 * Parse a string for the raw tokens.
	 */
	function parse(str, options = {}) {
	    const { encodePath = NOOP_VALUE } = options;
	    const it = new Iter(lexer(str));
	    function consume(endType) {
	        const tokens = [];
	        while (true) {
	            const path = it.text();
	            if (path)
	                tokens.push({ type: "text", value: encodePath(path) });
	            const param = it.tryConsume("PARAM");
	            if (param) {
	                tokens.push({
	                    type: "param",
	                    name: param,
	                });
	                continue;
	            }
	            const wildcard = it.tryConsume("WILDCARD");
	            if (wildcard) {
	                tokens.push({
	                    type: "wildcard",
	                    name: wildcard,
	                });
	                continue;
	            }
	            const open = it.tryConsume("{");
	            if (open) {
	                tokens.push({
	                    type: "group",
	                    tokens: consume("}"),
	                });
	                continue;
	            }
	            it.consume(endType);
	            return tokens;
	        }
	    }
	    const tokens = consume("END");
	    return new TokenData(tokens);
	}
	/**
	 * Compile a string to a template function for the path.
	 */
	function compile(path, options = {}) {
	    const { encode = encodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
	    const data = path instanceof TokenData ? path : parse(path, options);
	    const fn = tokensToFunction(data.tokens, delimiter, encode);
	    return function path(data = {}) {
	        const [path, ...missing] = fn(data);
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
	    const sources = [];
	    const flags = sensitive ? "" : "i";
	    const paths = Array.isArray(path) ? path : [path];
	    const items = paths.map((path) => path instanceof TokenData ? path : parse(path, options));
	    for (const { tokens } of items) {
	        for (const seq of flatten(tokens, 0, [])) {
	            const regexp = sequenceToRegExp(seq, delimiter, keys);
	            sources.push(regexp);
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
	 * Generate a flat list of sequence tokens from the given tokens.
	 */
	function* flatten(tokens, index, init) {
	    if (index === tokens.length) {
	        return yield init;
	    }
	    const token = tokens[index];
	    if (token.type === "group") {
	        const fork = init.slice();
	        for (const seq of flatten(token.tokens, 0, fork)) {
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
	function sequenceToRegExp(tokens, delimiter, keys) {
	    let result = "";
	    let backtrack = "";
	    let isSafeSegmentParam = true;
	    for (let i = 0; i < tokens.length; i++) {
	        const token = tokens[i];
	        if (token.type === "text") {
	            result += escape(token.value);
	            backtrack += token.value;
	            isSafeSegmentParam || (isSafeSegmentParam = token.value.includes(delimiter));
	            continue;
	        }
	        if (token.type === "param" || token.type === "wildcard") {
	            if (!isSafeSegmentParam && !backtrack) {
	                throw new TypeError(`Missing text after "${token.name}": ${DEBUG_URL}`);
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
	 * Stringify token data into a path string.
	 */
	function stringify(data) {
	    return data.tokens
	        .map(function stringifyToken(token, index, tokens) {
	        if (token.type === "text")
	            return escapeText(token.value);
	        if (token.type === "group") {
	            return `{${token.tokens.map(stringifyToken).join("")}}`;
	        }
	        const isSafe = isNameSafe(token.name) && isNextNameSafe(tokens[index + 1]);
	        const key = isSafe ? token.name : JSON.stringify(token.name);
	        if (token.type === "param")
	            return `:${key}`;
	        if (token.type === "wildcard")
	            return `*${key}`;
	        throw new TypeError(`Unexpected token: ${token}`);
	    })
	        .join("");
	}
	function isNameSafe(name) {
	    const [first, ...rest] = name;
	    if (!ID_START.test(first))
	        return false;
	    return rest.every((char) => ID_CONTINUE.test(char));
	}
	function isNextNameSafe(token) {
	    if ((token === null || token === void 0 ? void 0 : token.type) !== "text")
	        return true;
	    return !ID_CONTINUE.test(token.value[0]);
	}
	
	return dist;
}

var distExports = requireDist();

/* eslint-disable
    @typescript-eslint/no-namespace,
 */
const path2regexp = {
    TokenData: distExports.TokenData,
    parse: distExports.parse,
    compile: distExports.compile,
    match: distExports.match,
    stringify: distExports.stringify,
    pathToRegexp: distExports.pathToRegexp,
};

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9TVEFSVCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV0kL3U7XG5jb25zdCBJRF9DT05USU5VRSA9IC9eWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dJC91O1xuY29uc3QgREVCVUdfVVJMID0gXCJodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3JcIjtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogQSBmdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncy5cbiAgICovXG4gIGVuY29kZVBhdGg/OiBFbmNvZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBNYXRjaGVzIHRoZSBwYXRoIGNvbXBsZXRlbHkgd2l0aG91dCB0cmFpbGluZyBjaGFyYWN0ZXJzLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5kPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFsbG93cyBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBkZWxpbWl0ZXIgZm9yIHNlZ21lbnRzLiAoZGVmYXVsdDogYCcvJ2ApXG4gICAqL1xuICBkZWxpbWl0ZXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQgaW50byB0aGUgcGF0aCwgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGVuY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBlbmNvZGU/OiBFbmNvZGUgfCBmYWxzZTtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxudHlwZSBUb2tlblR5cGUgPVxuICB8IFwie1wiXG4gIHwgXCJ9XCJcbiAgfCBcIldJTERDQVJEXCJcbiAgfCBcIlBBUkFNXCJcbiAgfCBcIkNIQVJcIlxuICB8IFwiRVNDQVBFRFwiXG4gIHwgXCJFTkRcIlxuICAvLyBSZXNlcnZlZCBmb3IgdXNlIG9yIGFtYmlndW91cyBkdWUgdG8gcGFzdCB1c2UuXG4gIHwgXCIoXCJcbiAgfCBcIilcIlxuICB8IFwiW1wiXG4gIHwgXCJdXCJcbiAgfCBcIitcIlxuICB8IFwiP1wiXG4gIHwgXCIhXCI7XG5cbi8qKlxuICogVG9rZW5pemVyIHJlc3VsdHMuXG4gKi9cbmludGVyZmFjZSBMZXhUb2tlbiB7XG4gIHR5cGU6IFRva2VuVHlwZTtcbiAgaW5kZXg6IG51bWJlcjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuY29uc3QgU0lNUExFX1RPS0VOUzogUmVjb3JkPHN0cmluZywgVG9rZW5UeXBlPiA9IHtcbiAgLy8gR3JvdXBzLlxuICBcIntcIjogXCJ7XCIsXG4gIFwifVwiOiBcIn1cIixcbiAgLy8gUmVzZXJ2ZWQuXG4gIFwiKFwiOiBcIihcIixcbiAgXCIpXCI6IFwiKVwiLFxuICBcIltcIjogXCJbXCIsXG4gIFwiXVwiOiBcIl1cIixcbiAgXCIrXCI6IFwiK1wiLFxuICBcIj9cIjogXCI/XCIsXG4gIFwiIVwiOiBcIiFcIixcbn07XG5cbi8qKlxuICogRXNjYXBlIHRleHQgZm9yIHN0cmluZ2lmeSB0byBwYXRoLlxuICovXG5mdW5jdGlvbiBlc2NhcGVUZXh0KHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvW3t9KClcXFtcXF0rPyE6Kl0vZywgXCJcXFxcJCZcIik7XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvWy4rKj9eJHt9KClbXFxdfC9cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBUb2tlbml6ZSBpbnB1dCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uKiBsZXhlcihzdHI6IHN0cmluZyk6IEdlbmVyYXRvcjxMZXhUb2tlbiwgTGV4VG9rZW4+IHtcbiAgY29uc3QgY2hhcnMgPSBbLi4uc3RyXTtcbiAgbGV0IGkgPSAwO1xuXG4gIGZ1bmN0aW9uIG5hbWUoKSB7XG4gICAgbGV0IHZhbHVlID0gXCJcIjtcblxuICAgIGlmIChJRF9TVEFSVC50ZXN0KGNoYXJzWysraV0pKSB7XG4gICAgICB2YWx1ZSArPSBjaGFyc1tpXTtcbiAgICAgIHdoaWxlIChJRF9DT05USU5VRS50ZXN0KGNoYXJzWysraV0pKSB7XG4gICAgICAgIHZhbHVlICs9IGNoYXJzW2ldO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2hhcnNbaV0gPT09ICdcIicpIHtcbiAgICAgIGxldCBwb3MgPSBpO1xuXG4gICAgICB3aGlsZSAoaSA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICBpZiAoY2hhcnNbKytpXSA9PT0gJ1wiJykge1xuICAgICAgICAgIGkrKztcbiAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYXJzW2ldID09PSBcIlxcXFxcIikge1xuICAgICAgICAgIHZhbHVlICs9IGNoYXJzWysraV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgKz0gY2hhcnNbaV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHBvcykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbnRlcm1pbmF0ZWQgcXVvdGUgYXQgJHtwb3N9OiAke0RFQlVHX1VSTH1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0ICR7aX06ICR7REVCVUdfVVJMfWApO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHdoaWxlIChpIDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjaGFyc1tpXTtcbiAgICBjb25zdCB0eXBlID0gU0lNUExFX1RPS0VOU1t2YWx1ZV07XG5cbiAgICBpZiAodHlwZSkge1xuICAgICAgeWllbGQgeyB0eXBlLCBpbmRleDogaSsrLCB2YWx1ZSB9O1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiXFxcXFwiKSB7XG4gICAgICB5aWVsZCB7IHR5cGU6IFwiRVNDQVBFRFwiLCBpbmRleDogaSsrLCB2YWx1ZTogY2hhcnNbaSsrXSB9O1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiOlwiKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG5hbWUoKTtcbiAgICAgIHlpZWxkIHsgdHlwZTogXCJQQVJBTVwiLCBpbmRleDogaSwgdmFsdWUgfTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSBcIipcIikge1xuICAgICAgY29uc3QgdmFsdWUgPSBuYW1lKCk7XG4gICAgICB5aWVsZCB7IHR5cGU6IFwiV0lMRENBUkRcIiwgaW5kZXg6IGksIHZhbHVlIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHlpZWxkIHsgdHlwZTogXCJDSEFSXCIsIGluZGV4OiBpLCB2YWx1ZTogY2hhcnNbaSsrXSB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IHR5cGU6IFwiRU5EXCIsIGluZGV4OiBpLCB2YWx1ZTogXCJcIiB9O1xufVxuXG5jbGFzcyBJdGVyIHtcbiAgcHJpdmF0ZSBfcGVlaz86IExleFRva2VuO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdG9rZW5zOiBHZW5lcmF0b3I8TGV4VG9rZW4sIExleFRva2VuPikge31cblxuICBwZWVrKCk6IExleFRva2VuIHtcbiAgICBpZiAoIXRoaXMuX3BlZWspIHtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnRva2Vucy5uZXh0KCk7XG4gICAgICB0aGlzLl9wZWVrID0gbmV4dC52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BlZWs7XG4gIH1cblxuICB0cnlDb25zdW1lKHR5cGU6IFRva2VuVHlwZSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdG9rZW4gPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodG9rZW4udHlwZSAhPT0gdHlwZSkgcmV0dXJuO1xuICAgIHRoaXMuX3BlZWsgPSB1bmRlZmluZWQ7IC8vIFJlc2V0IGFmdGVyIGNvbnN1bWVkLlxuICAgIHJldHVybiB0b2tlbi52YWx1ZTtcbiAgfVxuXG4gIGNvbnN1bWUodHlwZTogVG9rZW5UeXBlKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMudHJ5Q29uc3VtZSh0eXBlKTtcbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHZhbHVlO1xuICAgIGNvbnN0IHsgdHlwZTogbmV4dFR5cGUsIGluZGV4IH0gPSB0aGlzLnBlZWsoKTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgYFVuZXhwZWN0ZWQgJHtuZXh0VHlwZX0gYXQgJHtpbmRleH0sIGV4cGVjdGVkICR7dHlwZX06ICR7REVCVUdfVVJMfWAsXG4gICAgKTtcbiAgfVxuXG4gIHRleHQoKTogc3RyaW5nIHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB3aGlsZSAoKHZhbHVlID0gdGhpcy50cnlDb25zdW1lKFwiQ0hBUlwiKSB8fCB0aGlzLnRyeUNvbnN1bWUoXCJFU0NBUEVEXCIpKSkge1xuICAgICAgcmVzdWx0ICs9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cbi8qKlxuICogUGxhaW4gdGV4dC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZXh0IHtcbiAgdHlwZTogXCJ0ZXh0XCI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBwYXJhbWV0ZXIgZGVzaWduZWQgdG8gbWF0Y2ggYXJiaXRyYXJ5IHRleHQgd2l0aGluIGEgc2VnbWVudC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXIge1xuICB0eXBlOiBcInBhcmFtXCI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHdpbGRjYXJkIHBhcmFtZXRlciBkZXNpZ25lZCB0byBtYXRjaCBtdWx0aXBsZSBzZWdtZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXaWxkY2FyZCB7XG4gIHR5cGU6IFwid2lsZGNhcmRcIjtcbiAgbmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgc2V0IG9mIHBvc3NpYmxlIHRva2VucyB0byBleHBhbmQgd2hlbiBtYXRjaGluZy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcm91cCB7XG4gIHR5cGU6IFwiZ3JvdXBcIjtcbiAgdG9rZW5zOiBUb2tlbltdO1xufVxuXG4vKipcbiAqIEEgdG9rZW4gdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgcmVnZXhwIGNhcHR1cmUuXG4gKi9cbmV4cG9ydCB0eXBlIEtleSA9IFBhcmFtZXRlciB8IFdpbGRjYXJkO1xuXG4vKipcbiAqIEEgc2VxdWVuY2Ugb2YgYHBhdGgtdG8tcmVnZXhwYCBrZXlzIHRoYXQgbWF0Y2ggY2FwdHVyaW5nIGdyb3Vwcy5cbiAqL1xuZXhwb3J0IHR5cGUgS2V5cyA9IEFycmF5PEtleT47XG5cbi8qKlxuICogQSBzZXF1ZW5jZSBvZiBwYXRoIG1hdGNoIGNoYXJhY3RlcnMuXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gVGV4dCB8IFBhcmFtZXRlciB8IFdpbGRjYXJkIHwgR3JvdXA7XG5cbi8qKlxuICogVG9rZW5pemVkIHBhdGggaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBUb2tlbkRhdGEge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgdG9rZW5zOiBUb2tlbltdKSB7fVxufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cjogc3RyaW5nLCBvcHRpb25zOiBQYXJzZU9wdGlvbnMgPSB7fSk6IFRva2VuRGF0YSB7XG4gIGNvbnN0IHsgZW5jb2RlUGF0aCA9IE5PT1BfVkFMVUUgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGl0ID0gbmV3IEl0ZXIobGV4ZXIoc3RyKSk7XG5cbiAgZnVuY3Rpb24gY29uc3VtZShlbmRUeXBlOiBUb2tlblR5cGUpOiBUb2tlbltdIHtcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCBwYXRoID0gaXQudGV4dCgpO1xuICAgICAgaWYgKHBhdGgpIHRva2Vucy5wdXNoKHsgdHlwZTogXCJ0ZXh0XCIsIHZhbHVlOiBlbmNvZGVQYXRoKHBhdGgpIH0pO1xuXG4gICAgICBjb25zdCBwYXJhbSA9IGl0LnRyeUNvbnN1bWUoXCJQQVJBTVwiKTtcbiAgICAgIGlmIChwYXJhbSkge1xuICAgICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJwYXJhbVwiLFxuICAgICAgICAgIG5hbWU6IHBhcmFtLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHdpbGRjYXJkID0gaXQudHJ5Q29uc3VtZShcIldJTERDQVJEXCIpO1xuICAgICAgaWYgKHdpbGRjYXJkKSB7XG4gICAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcIndpbGRjYXJkXCIsXG4gICAgICAgICAgbmFtZTogd2lsZGNhcmQsXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3BlbiA9IGl0LnRyeUNvbnN1bWUoXCJ7XCIpO1xuICAgICAgaWYgKG9wZW4pIHtcbiAgICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICB0b2tlbnM6IGNvbnN1bWUoXCJ9XCIpLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGl0LmNvbnN1bWUoZW5kVHlwZSk7XG4gICAgICByZXR1cm4gdG9rZW5zO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHRva2VucyA9IGNvbnN1bWUoXCJFTkRcIik7XG4gIHJldHVybiBuZXcgVG9rZW5EYXRhKHRva2Vucyk7XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIFBhcmFtRGF0YSA9IFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3QgeyBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IGRhdGEgPSBwYXRoIGluc3RhbmNlb2YgVG9rZW5EYXRhID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24oZGF0YS50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICByZXR1cm4gZnVuY3Rpb24gcGF0aChkYXRhOiBQID0ge30gYXMgUCkge1xuICAgIGNvbnN0IFtwYXRoLCAuLi5taXNzaW5nXSA9IGZuKGRhdGEpO1xuICAgIGlmIChtaXNzaW5nLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXJzOiAke21pc3Npbmcuam9pbihcIiwgXCIpfWApO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXT4+O1xuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbmZ1bmN0aW9uIHRva2Vuc1RvRnVuY3Rpb24oXG4gIHRva2VuczogVG9rZW5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pIHtcbiAgY29uc3QgZW5jb2RlcnMgPSB0b2tlbnMubWFwKCh0b2tlbikgPT5cbiAgICB0b2tlblRvRnVuY3Rpb24odG9rZW4sIGRlbGltaXRlciwgZW5jb2RlKSxcbiAgKTtcblxuICByZXR1cm4gKGRhdGE6IFBhcmFtRGF0YSkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXCJcIl07XG5cbiAgICBmb3IgKGNvbnN0IGVuY29kZXIgb2YgZW5jb2RlcnMpIHtcbiAgICAgIGNvbnN0IFt2YWx1ZSwgLi4uZXh0cmFzXSA9IGVuY29kZXIoZGF0YSk7XG4gICAgICByZXN1bHRbMF0gKz0gdmFsdWU7XG4gICAgICByZXN1bHQucHVzaCguLi5leHRyYXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydCBhIHNpbmdsZSB0b2tlbiBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gdG9rZW5Ub0Z1bmN0aW9uKFxuICB0b2tlbjogVG9rZW4sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogKGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nW10ge1xuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHJldHVybiAoKSA9PiBbdG9rZW4udmFsdWVdO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24odG9rZW4udG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IFt2YWx1ZSwgLi4ubWlzc2luZ10gPSBmbihkYXRhKTtcbiAgICAgIGlmICghbWlzc2luZy5sZW5ndGgpIHJldHVybiBbdmFsdWVdO1xuICAgICAgcmV0dXJuIFtcIlwiXTtcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgZW5jb2RlVmFsdWUgPSBlbmNvZGUgfHwgTk9PUF9WQUxVRTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiICYmIGVuY29kZSAhPT0gZmFsc2UpIHtcbiAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gW1wiXCIsIHRva2VuLm5hbWVdO1xuXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIG5vbi1lbXB0eSBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW1xuICAgICAgICB2YWx1ZVxuICAgICAgICAgIC5tYXAoKHZhbHVlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX0vJHtpbmRleH1cIiB0byBiZSBhIHN0cmluZ2AsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVWYWx1ZSh2YWx1ZSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuam9pbihkZWxpbWl0ZXIpLFxuICAgICAgXTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gW1wiXCIsIHRva2VuLm5hbWVdO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2VuY29kZVZhbHVlKHZhbHVlKV07XG4gIH07XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiB7XG4gIHBhdGg6IHN0cmluZztcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAocGF0aDogc3RyaW5nKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBTdXBwb3J0ZWQgcGF0aCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBwYXRoIGludG8gYSBtYXRjaCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoIHwgUGF0aFtdLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgeyByZWdleHAsIGtleXMgfSA9IHBhdGhUb1JlZ2V4cChwYXRoLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlID09PSBmYWxzZSkgcmV0dXJuIE5PT1BfVkFMVUU7XG4gICAgaWYgKGtleS50eXBlID09PSBcInBhcmFtXCIpIHJldHVybiBkZWNvZGU7XG4gICAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5zcGxpdChkZWxpbWl0ZXIpLm1hcChkZWNvZGUpO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2goaW5wdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZWdleHAuZXhlYyhpbnB1dCk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBwYXRoID0gbVswXTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG4gICAgICBjb25zdCBkZWNvZGVyID0gZGVjb2RlcnNbaSAtIDFdO1xuICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZXIobVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgcGFyYW1zIH07XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9SZWdleHAoXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7XG4gICAgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIsXG4gICAgZW5kID0gdHJ1ZSxcbiAgICBzZW5zaXRpdmUgPSBmYWxzZSxcbiAgICB0cmFpbGluZyA9IHRydWUsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBrZXlzOiBLZXlzID0gW107XG4gIGNvbnN0IHNvdXJjZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGZsYWdzID0gc2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiO1xuICBjb25zdCBwYXRocyA9IEFycmF5LmlzQXJyYXkocGF0aCkgPyBwYXRoIDogW3BhdGhdO1xuICBjb25zdCBpdGVtcyA9IHBhdGhzLm1hcCgocGF0aCkgPT5cbiAgICBwYXRoIGluc3RhbmNlb2YgVG9rZW5EYXRhID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpLFxuICApO1xuXG4gIGZvciAoY29uc3QgeyB0b2tlbnMgfSBvZiBpdGVtcykge1xuICAgIGZvciAoY29uc3Qgc2VxIG9mIGZsYXR0ZW4odG9rZW5zLCAwLCBbXSkpIHtcbiAgICAgIGNvbnN0IHJlZ2V4cCA9IHNlcXVlbmNlVG9SZWdFeHAoc2VxLCBkZWxpbWl0ZXIsIGtleXMpO1xuICAgICAgc291cmNlcy5wdXNoKHJlZ2V4cCk7XG4gICAgfVxuICB9XG5cbiAgbGV0IHBhdHRlcm4gPSBgXig/OiR7c291cmNlcy5qb2luKFwifFwiKX0pYDtcbiAgaWYgKHRyYWlsaW5nKSBwYXR0ZXJuICs9IGAoPzoke2VzY2FwZShkZWxpbWl0ZXIpfSQpP2A7XG4gIHBhdHRlcm4gKz0gZW5kID8gXCIkXCIgOiBgKD89JHtlc2NhcGUoZGVsaW1pdGVyKX18JClgO1xuXG4gIGNvbnN0IHJlZ2V4cCA9IG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICByZXR1cm4geyByZWdleHAsIGtleXMgfTtcbn1cblxuLyoqXG4gKiBGbGF0dGVuZWQgdG9rZW4gc2V0LlxuICovXG50eXBlIEZsYXR0ZW5lZCA9IFRleHQgfCBQYXJhbWV0ZXIgfCBXaWxkY2FyZDtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGZsYXQgbGlzdCBvZiBzZXF1ZW5jZSB0b2tlbnMgZnJvbSB0aGUgZ2l2ZW4gdG9rZW5zLlxuICovXG5mdW5jdGlvbiogZmxhdHRlbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuICBpbml0OiBGbGF0dGVuZWRbXSxcbik6IEdlbmVyYXRvcjxGbGF0dGVuZWRbXT4ge1xuICBpZiAoaW5kZXggPT09IHRva2Vucy5sZW5ndGgpIHtcbiAgICByZXR1cm4geWllbGQgaW5pdDtcbiAgfVxuXG4gIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4XTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgY29uc3QgZm9yayA9IGluaXQuc2xpY2UoKTtcbiAgICBmb3IgKGNvbnN0IHNlcSBvZiBmbGF0dGVuKHRva2VuLnRva2VucywgMCwgZm9yaykpIHtcbiAgICAgIHlpZWxkKiBmbGF0dGVuKHRva2VucywgaW5kZXggKyAxLCBzZXEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpbml0LnB1c2godG9rZW4pO1xuICB9XG5cbiAgeWllbGQqIGZsYXR0ZW4odG9rZW5zLCBpbmRleCArIDEsIGluaXQpO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhIGZsYXQgc2VxdWVuY2Ugb2YgdG9rZW5zIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbmZ1bmN0aW9uIHNlcXVlbmNlVG9SZWdFeHAodG9rZW5zOiBGbGF0dGVuZWRbXSwgZGVsaW1pdGVyOiBzdHJpbmcsIGtleXM6IEtleXMpIHtcbiAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gIGxldCBiYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgaXNTYWZlU2VnbWVudFBhcmFtID0gdHJ1ZTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2ldO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICByZXN1bHQgKz0gZXNjYXBlKHRva2VuLnZhbHVlKTtcbiAgICAgIGJhY2t0cmFjayArPSB0b2tlbi52YWx1ZTtcbiAgICAgIGlzU2FmZVNlZ21lbnRQYXJhbSB8fD0gdG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICBpZiAoIWlzU2FmZVNlZ21lbnRQYXJhbSAmJiAhYmFja3RyYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgdGV4dCBhZnRlciBcIiR7dG9rZW4ubmFtZX1cIjogJHtERUJVR19VUkx9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgICAgcmVzdWx0ICs9IGAoJHtuZWdhdGUoZGVsaW1pdGVyLCBpc1NhZmVTZWdtZW50UGFyYW0gPyBcIlwiIDogYmFja3RyYWNrKX0rKWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgKz0gYChbXFxcXHNcXFxcU10rKWA7XG4gICAgICB9XG5cbiAgICAgIGtleXMucHVzaCh0b2tlbik7XG4gICAgICBiYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgaXNTYWZlU2VnbWVudFBhcmFtID0gZmFsc2U7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBuZWdhdGUoZGVsaW1pdGVyOiBzdHJpbmcsIGJhY2t0cmFjazogc3RyaW5nKSB7XG4gIGlmIChiYWNrdHJhY2subGVuZ3RoIDwgMikge1xuICAgIGlmIChkZWxpbWl0ZXIubGVuZ3RoIDwgMikgcmV0dXJuIGBbXiR7ZXNjYXBlKGRlbGltaXRlciArIGJhY2t0cmFjayl9XWA7XG4gICAgcmV0dXJuIGAoPzooPyEke2VzY2FwZShkZWxpbWl0ZXIpfSlbXiR7ZXNjYXBlKGJhY2t0cmFjayl9XSlgO1xuICB9XG4gIGlmIChkZWxpbWl0ZXIubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiBgKD86KD8hJHtlc2NhcGUoYmFja3RyYWNrKX0pW14ke2VzY2FwZShkZWxpbWl0ZXIpfV0pYDtcbiAgfVxuICByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGJhY2t0cmFjayl9fCR7ZXNjYXBlKGRlbGltaXRlcil9KVtcXFxcc1xcXFxTXSlgO1xufVxuXG4vKipcbiAqIFN0cmluZ2lmeSB0b2tlbiBkYXRhIGludG8gYSBwYXRoIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ2lmeShkYXRhOiBUb2tlbkRhdGEpIHtcbiAgcmV0dXJuIGRhdGEudG9rZW5zXG4gICAgLm1hcChmdW5jdGlvbiBzdHJpbmdpZnlUb2tlbih0b2tlbiwgaW5kZXgsIHRva2Vucyk6IHN0cmluZyB7XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHJldHVybiBlc2NhcGVUZXh0KHRva2VuLnZhbHVlKTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgICAgcmV0dXJuIGB7JHt0b2tlbi50b2tlbnMubWFwKHN0cmluZ2lmeVRva2VuKS5qb2luKFwiXCIpfX1gO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc1NhZmUgPVxuICAgICAgICBpc05hbWVTYWZlKHRva2VuLm5hbWUpICYmIGlzTmV4dE5hbWVTYWZlKHRva2Vuc1tpbmRleCArIDFdKTtcbiAgICAgIGNvbnN0IGtleSA9IGlzU2FmZSA/IHRva2VuLm5hbWUgOiBKU09OLnN0cmluZ2lmeSh0b2tlbi5uYW1lKTtcblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikgcmV0dXJuIGA6JHtrZXl9YDtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHJldHVybiBgKiR7a2V5fWA7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmV4cGVjdGVkIHRva2VuOiAke3Rva2VufWApO1xuICAgIH0pXG4gICAgLmpvaW4oXCJcIik7XG59XG5cbmZ1bmN0aW9uIGlzTmFtZVNhZmUobmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IFtmaXJzdCwgLi4ucmVzdF0gPSBuYW1lO1xuICBpZiAoIUlEX1NUQVJULnRlc3QoZmlyc3QpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiByZXN0LmV2ZXJ5KChjaGFyKSA9PiBJRF9DT05USU5VRS50ZXN0KGNoYXIpKTtcbn1cblxuZnVuY3Rpb24gaXNOZXh0TmFtZVNhZmUodG9rZW46IFRva2VuIHwgdW5kZWZpbmVkKSB7XG4gIGlmICh0b2tlbj8udHlwZSAhPT0gXCJ0ZXh0XCIpIHJldHVybiB0cnVlO1xuICByZXR1cm4gIUlEX0NPTlRJTlVFLnRlc3QodG9rZW4udmFsdWVbMF0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgRW5jb2RlIGFzIHAyckVuY29kZSxcbiAgICBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIFBhcnNlT3B0aW9ucyBhcyBwMnJQYXJzZU9wdGlvbnMsXG4gICAgUGF0aFRvUmVnZXhwT3B0aW9ucyBhcyBwMnJQYXRoVG9SZWdleHBPcHRpb25zLFxuICAgIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgQ29tcGlsZU9wdGlvbnMgYXMgcDJyQ29tcGlsZU9wdGlvbnMsXG4gICAgVG9rZW5EYXRhIGFzIHAyclRva2VuRGF0YSxcbiAgICBQYXJhbURhdGEgYXMgcDJyUGFyYW1EYXRhLFxuICAgIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIEtleSBhcyBwMnJLZXksXG4gICAgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgUGF0aCBhcyBwMnJQYXRoLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgRW5jb2RlID0gcDJyRW5jb2RlO1xuICAgIGV4cG9ydCB0eXBlIERlY29kZSA9IHAyckRlY29kZTtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyA9IHAyclBhdGhUb1JlZ2V4cE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hPcHRpb25zID0gcDJyTWF0Y2hPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIENvbXBpbGVPcHRpb25zID0gcDJyQ29tcGlsZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5EYXRhID0gcDJyVG9rZW5EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IHAyclBhcmFtRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJQYXRoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaFJlc3VsdDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xufVxuXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBUb2tlbkRhdGE6IHAyclRva2VuRGF0YSxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHN0cmluZ2lmeSxcbiAgICBwYXRoVG9SZWdleHAsXG59O1xuXG5leHBvcnQgeyBwYXRoMnJlZ2V4cCB9O1xuIl0sIm5hbWVzIjpbInAyclRva2VuRGF0YSIsInBhcnNlIiwiY29tcGlsZSIsIm1hdGNoIiwic3RyaW5naWZ5IiwicGF0aFRvUmVnZXhwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQW9SQSxDQTZDQyxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUEsQ0FBQTtBQUtELENBZ0JDLElBQUEsQ0FBQSxPQUFBLEdBQUEsT0FBQSxDQUFBO0FBZ0hELENBK0JDLElBQUEsQ0FBQSxLQUFBLEdBQUEsS0FBQSxDQUFBO0FBRUQsQ0ErQkMsSUFBQSxDQUFBLFlBQUEsR0FBQSxZQUFBLENBQUE7QUFzRkQsQ0FpQkMsSUFBQSxDQUFBLFNBQUEsR0FBQSxTQUFBLENBQUE7Q0E3bUJELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO0FBQzlCLENBQUEsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEtBQUssS0FBSyxDQUFDO0NBQzVDLE1BQU0sUUFBUSxHQUFHLHFCQUFxQixDQUFDO0NBQ3ZDLE1BQU0sV0FBVyxHQUFHLG1DQUFtQyxDQUFDO0NBQ3hELE1BQU0sU0FBUyxHQUFHLG1DQUFtQyxDQUFDO0FBa0Z0RCxDQUFBLE1BQU0sYUFBYSxHQUE4Qjs7S0FFL0MsR0FBRyxFQUFFLEdBQUc7S0FDUixHQUFHLEVBQUUsR0FBRzs7S0FFUixHQUFHLEVBQUUsR0FBRztLQUNSLEdBQUcsRUFBRSxHQUFHO0tBQ1IsR0FBRyxFQUFFLEdBQUc7S0FDUixHQUFHLEVBQUUsR0FBRztLQUNSLEdBQUcsRUFBRSxHQUFHO0tBQ1IsR0FBRyxFQUFFLEdBQUc7S0FDUixHQUFHLEVBQUUsR0FBRztFQUNULENBQUM7QUFFRjs7QUFFRztDQUNILFNBQVMsVUFBVSxDQUFDLEdBQVcsRUFBQTtLQUM3QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUM7RUFDaEQ7QUFFRDs7QUFFRztDQUNILFNBQVMsTUFBTSxDQUFDLEdBQVcsRUFBQTtLQUN6QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUM7RUFDcEQ7QUFFRDs7QUFFRztDQUNILFVBQVUsS0FBSyxDQUFDLEdBQVcsRUFBQTtBQUN6QixLQUFBLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztLQUN2QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FFVixTQUFTLElBQUksR0FBQTtTQUNYLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztTQUVmLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzdCLGFBQUEsS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNsQixPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNuQyxpQkFBQSxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2NBQ25CO1VBQ0Y7QUFBTSxjQUFBLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTthQUMzQixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFFWixhQUFBLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7aUJBQ3ZCLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO3FCQUN0QixDQUFDLEVBQUUsQ0FBQztxQkFDSixHQUFHLEdBQUcsQ0FBQyxDQUFDO3FCQUNSLE1BQU07a0JBQ1A7QUFFRCxpQkFBQSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7QUFDckIscUJBQUEsS0FBSyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2tCQUNyQjtzQkFBTTtBQUNMLHFCQUFBLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7a0JBQ25CO2NBQ0Y7YUFFRCxJQUFJLEdBQUcsRUFBRTtpQkFDUCxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsc0JBQUEsRUFBeUIsR0FBRyxDQUFLLEVBQUEsRUFBQSxTQUFTLENBQUUsQ0FBQSxDQUFDLENBQUM7Y0FDbkU7VUFDRjtTQUVELElBQUksQ0FBQyxLQUFLLEVBQUU7YUFDVixNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsMEJBQUEsRUFBNkIsQ0FBQyxDQUFLLEVBQUEsRUFBQSxTQUFTLENBQUUsQ0FBQSxDQUFDLENBQUM7VUFDckU7U0FFRCxPQUFPLEtBQUssQ0FBQztNQUNkO0FBRUQsS0FBQSxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ3ZCLFNBQUEsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLFNBQUEsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBRWxDLElBQUksSUFBSSxFQUFFO2FBQ1IsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7VUFDbkM7QUFBTSxjQUFBLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtBQUN6QixhQUFBLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztVQUMxRDtBQUFNLGNBQUEsSUFBSSxLQUFLLEtBQUssR0FBRyxFQUFFO0FBQ3hCLGFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUM7YUFDckIsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztVQUMxQztBQUFNLGNBQUEsSUFBSSxLQUFLLEtBQUssR0FBRyxFQUFFO0FBQ3hCLGFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUM7YUFDckIsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztVQUM3QztjQUFNO0FBQ0wsYUFBQSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1VBQ3JEO01BQ0Y7QUFFRCxLQUFBLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO0VBQzdDO0FBRUQsQ0FBQSxNQUFNLElBQUksQ0FBQTtLQUdSLFdBQUEsQ0FBb0IsTUFBcUMsRUFBQTtTQUFyQyxJQUFNLENBQUEsTUFBQSxHQUFOLE1BQU0sQ0FBK0I7TUFBSTtLQUU3RCxJQUFJLEdBQUE7QUFDRixTQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO2FBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNoQyxhQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztVQUN6QjtTQUNELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztNQUNuQjtLQUVELFVBQVUsQ0FBQyxJQUFlLEVBQUE7QUFDeEIsU0FBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDMUIsU0FBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSTthQUFFLE9BQU87QUFDaEMsU0FBQSxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztTQUN2QixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUM7TUFDcEI7S0FFRCxPQUFPLENBQUMsSUFBZSxFQUFBO1NBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEMsSUFBSSxLQUFLLEtBQUssU0FBUzthQUFFLE9BQU8sS0FBSyxDQUFDO0FBQ3RDLFNBQUEsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQzlDLE1BQU0sSUFBSSxTQUFTLENBQ2pCLENBQUEsV0FBQSxFQUFjLFFBQVEsQ0FBQSxJQUFBLEVBQU8sS0FBSyxDQUFBLFdBQUEsRUFBYyxJQUFJLENBQUEsRUFBQSxFQUFLLFNBQVMsQ0FBQSxDQUFFLENBQ3JFLENBQUM7TUFDSDtLQUVELElBQUksR0FBQTtTQUNGLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztTQUNoQixJQUFJLEtBQXlCLENBQUM7QUFDOUIsU0FBQSxRQUFRLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUc7YUFDdEUsTUFBTSxJQUFJLEtBQUssQ0FBQztVQUNqQjtTQUNELE9BQU8sTUFBTSxDQUFDO01BQ2Y7RUFDRjtBQWlERDs7QUFFRztBQUNILENBQUEsTUFBYSxTQUFTLENBQUE7S0FDcEIsV0FBQSxDQUE0QixNQUFlLEVBQUE7U0FBZixJQUFNLENBQUEsTUFBQSxHQUFOLE1BQU0sQ0FBUztNQUFJO0VBQ2hEO0FBRkQsQ0FFQyxJQUFBLENBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQTtBQUVEOztBQUVHO0FBQ0gsQ0FBQSxTQUFnQixLQUFLLENBQUMsR0FBVyxFQUFFLFVBQXdCLEVBQUUsRUFBQTtLQUMzRCxNQUFNLEVBQUUsVUFBVSxHQUFHLFVBQVUsRUFBRSxHQUFHLE9BQU8sQ0FBQztLQUM1QyxNQUFNLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUVoQyxTQUFTLE9BQU8sQ0FBQyxPQUFrQixFQUFBO1NBQ2pDLE1BQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQztTQUUzQixPQUFPLElBQUksRUFBRTtBQUNYLGFBQUEsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3ZCLGFBQUEsSUFBSSxJQUFJO0FBQUUsaUJBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFFakUsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNyQyxJQUFJLEtBQUssRUFBRTtpQkFDVCxNQUFNLENBQUMsSUFBSSxDQUFDO3FCQUNWLElBQUksRUFBRSxPQUFPO3FCQUNiLElBQUksRUFBRSxLQUFLO0FBQ1osa0JBQUEsQ0FBQyxDQUFDO2lCQUNILFNBQVM7Y0FDVjthQUVELE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDM0MsSUFBSSxRQUFRLEVBQUU7aUJBQ1osTUFBTSxDQUFDLElBQUksQ0FBQztxQkFDVixJQUFJLEVBQUUsVUFBVTtxQkFDaEIsSUFBSSxFQUFFLFFBQVE7QUFDZixrQkFBQSxDQUFDLENBQUM7aUJBQ0gsU0FBUztjQUNWO2FBRUQsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQyxJQUFJLElBQUksRUFBRTtpQkFDUixNQUFNLENBQUMsSUFBSSxDQUFDO3FCQUNWLElBQUksRUFBRSxPQUFPO0FBQ2IscUJBQUEsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDckIsa0JBQUEsQ0FBQyxDQUFDO2lCQUNILFNBQVM7Y0FDVjtBQUVELGFBQUEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNwQixPQUFPLE1BQU0sQ0FBQztVQUNmO01BQ0Y7QUFFRCxLQUFBLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM5QixLQUFBLE9BQU8sSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDOUI7QUFFRDs7QUFFRztBQUNILENBQUEsU0FBZ0IsT0FBTyxDQUNyQixJQUFVLEVBQ1YsVUFBeUMsRUFBRSxFQUFBO0tBRTNDLE1BQU0sRUFBRSxNQUFNLEdBQUcsa0JBQWtCLEVBQUUsU0FBUyxHQUFHLGlCQUFpQixFQUFFLEdBQ2xFLE9BQU8sQ0FBQztBQUNWLEtBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxZQUFZLFNBQVMsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNyRSxLQUFBLE1BQU0sRUFBRSxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBRTVELEtBQUEsT0FBTyxTQUFTLElBQUksQ0FBQyxJQUFBLEdBQVUsRUFBTyxFQUFBO1NBQ3BDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsU0FBQSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7QUFDbEIsYUFBQSxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsb0JBQUEsRUFBdUIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBRSxDQUFBLENBQUMsQ0FBQztVQUNsRTtTQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsTUFBQyxDQUFDO0VBQ0g7QUFLRCxDQUFBLFNBQVMsZ0JBQWdCLENBQ3ZCLE1BQWUsRUFDZixTQUFpQixFQUNqQixNQUFzQixFQUFBO0tBRXRCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEtBQ2hDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUMxQyxDQUFDO0tBRUYsT0FBTyxDQUFDLElBQWUsS0FBSTtBQUN6QixTQUFBLE1BQU0sTUFBTSxHQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFOUIsU0FBQSxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTthQUM5QixNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pDLGFBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQztBQUNuQixhQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztVQUN4QjtTQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLE1BQUMsQ0FBQztFQUNIO0FBRUQ7O0FBRUc7QUFDSCxDQUFBLFNBQVMsZUFBZSxDQUN0QixLQUFZLEVBQ1osU0FBaUIsRUFDakIsTUFBc0IsRUFBQTtBQUV0QixLQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxNQUFNO1NBQUUsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRXRELEtBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtBQUMxQixTQUFBLE1BQU0sRUFBRSxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBRTdELE9BQU8sQ0FBQyxJQUFJLEtBQUk7YUFDZCxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtpQkFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDcEMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2QsVUFBQyxDQUFDO01BQ0g7QUFFRCxLQUFBLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxVQUFVLENBQUM7S0FFekMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxNQUFNLEtBQUssS0FBSyxFQUFFO1NBQ2pELE9BQU8sQ0FBQyxJQUFJLEtBQUk7YUFDZCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQy9CLElBQUksS0FBSyxJQUFJLElBQUk7aUJBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFM0MsYUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtpQkFDL0MsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLFVBQUEsRUFBYSxLQUFLLENBQUMsSUFBSSxDQUEyQix5QkFBQSxDQUFBLENBQUMsQ0FBQztjQUN6RTthQUVELE9BQU87aUJBQ0wsS0FBSztBQUNGLHNCQUFBLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEtBQUk7QUFDcEIscUJBQUEsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7eUJBQzdCLE1BQU0sSUFBSSxTQUFTLENBQ2pCLENBQWEsVUFBQSxFQUFBLEtBQUssQ0FBQyxJQUFJLENBQUksQ0FBQSxFQUFBLEtBQUssQ0FBa0IsZ0JBQUEsQ0FBQSxDQUNuRCxDQUFDO3NCQUNIO0FBRUQscUJBQUEsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDNUIsa0JBQUMsQ0FBQztzQkFDRCxJQUFJLENBQUMsU0FBUyxDQUFDO2NBQ25CLENBQUM7QUFDSixVQUFDLENBQUM7TUFDSDtLQUVELE9BQU8sQ0FBQyxJQUFJLEtBQUk7U0FDZCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQy9CLElBQUksS0FBSyxJQUFJLElBQUk7YUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUUzQyxTQUFBLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFO2FBQzdCLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQSxVQUFBLEVBQWEsS0FBSyxDQUFDLElBQUksQ0FBa0IsZ0JBQUEsQ0FBQSxDQUFDLENBQUM7VUFDaEU7QUFFRCxTQUFBLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUM5QixNQUFDLENBQUM7RUFDSDtBQXlCRDs7QUFFRztBQUNILENBQUEsU0FBZ0IsS0FBSyxDQUNuQixJQUFtQixFQUNuQixVQUF1QyxFQUFFLEVBQUE7S0FFekMsTUFBTSxFQUFFLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxTQUFTLEdBQUcsaUJBQWlCLEVBQUUsR0FDbEUsT0FBTyxDQUFDO0FBQ1YsS0FBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FFckQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSTtTQUNoQyxJQUFJLE1BQU0sS0FBSyxLQUFLO2FBQUUsT0FBTyxVQUFVLENBQUM7QUFDeEMsU0FBQSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssT0FBTzthQUFFLE9BQU8sTUFBTSxDQUFDO0FBQ3hDLFNBQUEsT0FBTyxDQUFDLEtBQWEsS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMvRCxNQUFDLENBQUMsQ0FBQztLQUVILE9BQU8sU0FBUyxLQUFLLENBQUMsS0FBYSxFQUFBO1NBQ2pDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDN0IsSUFBSSxDQUFDLENBQUM7YUFBRSxPQUFPLEtBQUssQ0FBQztBQUVyQixTQUFBLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNsQixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRW5DLFNBQUEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDakMsYUFBQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTO2lCQUFFLFNBQVM7YUFFakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUN4QixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLGFBQUEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7VUFDbEM7QUFFRCxTQUFBLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7QUFDMUIsTUFBQyxDQUFDO0VBQ0g7QUFFRCxDQUFBLFNBQWdCLFlBQVksQ0FDMUIsSUFBbUIsRUFDbkIsVUFBOEMsRUFBRSxFQUFBO0tBRWhELE1BQU0sRUFDSixTQUFTLEdBQUcsaUJBQWlCLEVBQzdCLEdBQUcsR0FBRyxJQUFJLEVBQ1YsU0FBUyxHQUFHLEtBQUssRUFDakIsUUFBUSxHQUFHLElBQUksR0FDaEIsR0FBRyxPQUFPLENBQUM7S0FDWixNQUFNLElBQUksR0FBUyxFQUFFLENBQUM7S0FDdEIsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0tBQzdCLE1BQU0sS0FBSyxHQUFHLFNBQVMsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDO0FBQ25DLEtBQUEsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNsRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUMzQixJQUFJLFlBQVksU0FBUyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUN4RCxDQUFDO0FBRUYsS0FBQSxLQUFLLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxLQUFLLEVBQUU7QUFDOUIsU0FBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQ3hDLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDdEQsYUFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1VBQ3RCO01BQ0Y7S0FFRCxJQUFJLE9BQU8sR0FBRyxDQUFBLElBQUEsRUFBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUEsQ0FBRyxDQUFDO0FBQzFDLEtBQUEsSUFBSSxRQUFRO0FBQUUsU0FBQSxPQUFPLElBQUksQ0FBTSxHQUFBLEVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7QUFDdEQsS0FBQSxPQUFPLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO0tBRXBELE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxQyxLQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUM7RUFDekI7QUFPRDs7QUFFRztBQUNILENBQUEsVUFBVSxPQUFPLENBQ2YsTUFBZSxFQUNmLEtBQWEsRUFDYixJQUFpQixFQUFBO0FBRWpCLEtBQUEsSUFBSSxLQUFLLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRTtTQUMzQixPQUFPLE1BQU0sSUFBSSxDQUFDO01BQ25CO0FBRUQsS0FBQSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFNUIsS0FBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFO0FBQzFCLFNBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQzFCLFNBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7YUFDaEQsT0FBTyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7VUFDeEM7TUFDRjtVQUFNO0FBQ0wsU0FBQSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO01BQ2xCO0tBRUQsT0FBTyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDekM7QUFFRDs7QUFFRztBQUNILENBQUEsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFtQixFQUFFLFNBQWlCLEVBQUUsSUFBVSxFQUFBO0tBQzFFLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztLQUNoQixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7S0FDbkIsSUFBSSxrQkFBa0IsR0FBRyxJQUFJLENBQUM7QUFFOUIsS0FBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN0QyxTQUFBLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUV4QixTQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7YUFDekIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDOUIsYUFBQSxTQUFTLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQzthQUN6QixrQkFBa0IsS0FBbEIsa0JBQWtCLEdBQUssS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTthQUN2RCxTQUFTO1VBQ1Y7QUFFRCxTQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7QUFDdkQsYUFBQSxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxTQUFTLEVBQUU7aUJBQ3JDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBdUIsb0JBQUEsRUFBQSxLQUFLLENBQUMsSUFBSSxDQUFNLEdBQUEsRUFBQSxTQUFTLENBQUUsQ0FBQSxDQUFDLENBQUM7Y0FDekU7QUFFRCxhQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7QUFDMUIsaUJBQUEsTUFBTSxJQUFJLENBQUksQ0FBQSxFQUFBLE1BQU0sQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7Y0FDMUU7a0JBQU07aUJBQ0wsTUFBTSxJQUFJLGFBQWEsQ0FBQztjQUN6QjtBQUVELGFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNqQixTQUFTLEdBQUcsRUFBRSxDQUFDO2FBQ2Ysa0JBQWtCLEdBQUcsS0FBSyxDQUFDO2FBQzNCLFNBQVM7VUFDVjtNQUNGO0tBRUQsT0FBTyxNQUFNLENBQUM7RUFDZjtBQUVELENBQUEsU0FBUyxNQUFNLENBQUMsU0FBaUIsRUFBRSxTQUFpQixFQUFBO0FBQ2xELEtBQUEsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUN4QixTQUFBLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDO2FBQUUsT0FBTyxDQUFBLEVBQUEsRUFBSyxNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUM7U0FDdkUsT0FBTyxDQUFBLE1BQUEsRUFBUyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQU0sR0FBQSxFQUFBLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQSxFQUFBLENBQUksQ0FBQztNQUM5RDtBQUNELEtBQUEsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtTQUN4QixPQUFPLENBQUEsTUFBQSxFQUFTLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBTSxHQUFBLEVBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBLEVBQUEsQ0FBSSxDQUFDO01BQzlEO0tBQ0QsT0FBTyxDQUFBLE1BQUEsRUFBUyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUksQ0FBQSxFQUFBLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQSxVQUFBLENBQVksQ0FBQztFQUNwRTtBQUVEOztBQUVHO0NBQ0gsU0FBZ0IsU0FBUyxDQUFDLElBQWUsRUFBQTtLQUN2QyxPQUFPLElBQUksQ0FBQyxNQUFNO1VBQ2YsR0FBRyxDQUFDLFNBQVMsY0FBYyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFBO0FBQy9DLFNBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU07QUFBRSxhQUFBLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxRCxTQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7YUFDMUIsT0FBTyxDQUFJLENBQUEsRUFBQSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztVQUN6RDtBQUVELFNBQUEsTUFBTSxNQUFNLEdBQ1YsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzlELE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRTdELFNBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU87YUFBRSxPQUFPLENBQUEsQ0FBQSxFQUFJLEdBQUcsQ0FBQSxDQUFFLENBQUM7QUFDN0MsU0FBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssVUFBVTthQUFFLE9BQU8sQ0FBQSxDQUFBLEVBQUksR0FBRyxDQUFBLENBQUUsQ0FBQztTQUNoRCxNQUFNLElBQUksU0FBUyxDQUFDLHFCQUFxQixLQUFLLENBQUEsQ0FBRSxDQUFDLENBQUM7QUFDcEQsTUFBQyxDQUFDO1VBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ2I7Q0FFRCxTQUFTLFVBQVUsQ0FBQyxJQUFZLEVBQUE7S0FDOUIsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM5QixLQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztTQUFFLE9BQU8sS0FBSyxDQUFDO0FBQ3hDLEtBQUEsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNyRDtDQUVELFNBQVMsY0FBYyxDQUFDLEtBQXdCLEVBQUE7S0FDOUMsSUFBSSxDQUFBLEtBQUssS0FBTCxJQUFBLElBQUEsS0FBSyx1QkFBTCxLQUFLLENBQUUsSUFBSSxNQUFLLE1BQU07U0FBRSxPQUFPLElBQUksQ0FBQztBQUN4QyxLQUFBLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxQzs7Ozs7OztBQ3huQkQ7O0FBRUc7QUEyQ0gsTUFBTSxXQUFXLEdBQUc7QUFDaEIsSUFBQSxTQUFTLEVBQUVBLHFCQUFZO1dBQ3ZCQyxpQkFBSzthQUNMQyxtQkFBTztXQUNQQyxpQkFBSztlQUNMQyxxQkFBUztrQkFDVEMsd0JBQVk7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cC8ifQ==