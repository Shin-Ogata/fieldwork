/*!
 * @cdp/extension-path2regexp 0.9.20
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9TVEFSVCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV0kL3U7XG5jb25zdCBJRF9DT05USU5VRSA9IC9eWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dJC91O1xuY29uc3QgREVCVUdfVVJMID0gXCJodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3JcIjtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogQSBmdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncy5cbiAgICovXG4gIGVuY29kZVBhdGg/OiBFbmNvZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBNYXRjaGVzIHRoZSBwYXRoIGNvbXBsZXRlbHkgd2l0aG91dCB0cmFpbGluZyBjaGFyYWN0ZXJzLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5kPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFsbG93cyBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBkZWxpbWl0ZXIgZm9yIHNlZ21lbnRzLiAoZGVmYXVsdDogYCcvJ2ApXG4gICAqL1xuICBkZWxpbWl0ZXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQgaW50byB0aGUgcGF0aCwgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGVuY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBlbmNvZGU/OiBFbmNvZGUgfCBmYWxzZTtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxudHlwZSBUb2tlblR5cGUgPVxuICB8IFwie1wiXG4gIHwgXCJ9XCJcbiAgfCBcIldJTERDQVJEXCJcbiAgfCBcIlBBUkFNXCJcbiAgfCBcIkNIQVJcIlxuICB8IFwiRVNDQVBFRFwiXG4gIHwgXCJFTkRcIlxuICAvLyBSZXNlcnZlZCBmb3IgdXNlIG9yIGFtYmlndW91cyBkdWUgdG8gcGFzdCB1c2UuXG4gIHwgXCIoXCJcbiAgfCBcIilcIlxuICB8IFwiW1wiXG4gIHwgXCJdXCJcbiAgfCBcIitcIlxuICB8IFwiP1wiXG4gIHwgXCIhXCI7XG5cbi8qKlxuICogVG9rZW5pemVyIHJlc3VsdHMuXG4gKi9cbmludGVyZmFjZSBMZXhUb2tlbiB7XG4gIHR5cGU6IFRva2VuVHlwZTtcbiAgaW5kZXg6IG51bWJlcjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuY29uc3QgU0lNUExFX1RPS0VOUzogUmVjb3JkPHN0cmluZywgVG9rZW5UeXBlPiA9IHtcbiAgLy8gR3JvdXBzLlxuICBcIntcIjogXCJ7XCIsXG4gIFwifVwiOiBcIn1cIixcbiAgLy8gUmVzZXJ2ZWQuXG4gIFwiKFwiOiBcIihcIixcbiAgXCIpXCI6IFwiKVwiLFxuICBcIltcIjogXCJbXCIsXG4gIFwiXVwiOiBcIl1cIixcbiAgXCIrXCI6IFwiK1wiLFxuICBcIj9cIjogXCI/XCIsXG4gIFwiIVwiOiBcIiFcIixcbn07XG5cbi8qKlxuICogRXNjYXBlIHRleHQgZm9yIHN0cmluZ2lmeSB0byBwYXRoLlxuICovXG5mdW5jdGlvbiBlc2NhcGVUZXh0KHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvW3t9KClcXFtcXF0rPyE6Kl0vZywgXCJcXFxcJCZcIik7XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvWy4rKj9eJHt9KClbXFxdfC9cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBUb2tlbml6ZSBpbnB1dCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uKiBsZXhlcihzdHI6IHN0cmluZyk6IEdlbmVyYXRvcjxMZXhUb2tlbiwgTGV4VG9rZW4+IHtcbiAgY29uc3QgY2hhcnMgPSBbLi4uc3RyXTtcbiAgbGV0IGkgPSAwO1xuXG4gIGZ1bmN0aW9uIG5hbWUoKSB7XG4gICAgbGV0IHZhbHVlID0gXCJcIjtcblxuICAgIGlmIChJRF9TVEFSVC50ZXN0KGNoYXJzWysraV0pKSB7XG4gICAgICB2YWx1ZSArPSBjaGFyc1tpXTtcbiAgICAgIHdoaWxlIChJRF9DT05USU5VRS50ZXN0KGNoYXJzWysraV0pKSB7XG4gICAgICAgIHZhbHVlICs9IGNoYXJzW2ldO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2hhcnNbaV0gPT09ICdcIicpIHtcbiAgICAgIGxldCBwb3MgPSBpO1xuXG4gICAgICB3aGlsZSAoaSA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICBpZiAoY2hhcnNbKytpXSA9PT0gJ1wiJykge1xuICAgICAgICAgIGkrKztcbiAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYXJzW2ldID09PSBcIlxcXFxcIikge1xuICAgICAgICAgIHZhbHVlICs9IGNoYXJzWysraV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgKz0gY2hhcnNbaV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHBvcykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbnRlcm1pbmF0ZWQgcXVvdGUgYXQgJHtwb3N9OiAke0RFQlVHX1VSTH1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0ICR7aX06ICR7REVCVUdfVVJMfWApO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHdoaWxlIChpIDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjaGFyc1tpXTtcbiAgICBjb25zdCB0eXBlID0gU0lNUExFX1RPS0VOU1t2YWx1ZV07XG5cbiAgICBpZiAodHlwZSkge1xuICAgICAgeWllbGQgeyB0eXBlLCBpbmRleDogaSsrLCB2YWx1ZSB9O1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiXFxcXFwiKSB7XG4gICAgICB5aWVsZCB7IHR5cGU6IFwiRVNDQVBFRFwiLCBpbmRleDogaSsrLCB2YWx1ZTogY2hhcnNbaSsrXSB9O1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiOlwiKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG5hbWUoKTtcbiAgICAgIHlpZWxkIHsgdHlwZTogXCJQQVJBTVwiLCBpbmRleDogaSwgdmFsdWUgfTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSBcIipcIikge1xuICAgICAgY29uc3QgdmFsdWUgPSBuYW1lKCk7XG4gICAgICB5aWVsZCB7IHR5cGU6IFwiV0lMRENBUkRcIiwgaW5kZXg6IGksIHZhbHVlIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHlpZWxkIHsgdHlwZTogXCJDSEFSXCIsIGluZGV4OiBpLCB2YWx1ZTogY2hhcnNbaSsrXSB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IHR5cGU6IFwiRU5EXCIsIGluZGV4OiBpLCB2YWx1ZTogXCJcIiB9O1xufVxuXG5jbGFzcyBJdGVyIHtcbiAgcHJpdmF0ZSBfcGVlaz86IExleFRva2VuO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdG9rZW5zOiBHZW5lcmF0b3I8TGV4VG9rZW4sIExleFRva2VuPikge31cblxuICBwZWVrKCk6IExleFRva2VuIHtcbiAgICBpZiAoIXRoaXMuX3BlZWspIHtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnRva2Vucy5uZXh0KCk7XG4gICAgICB0aGlzLl9wZWVrID0gbmV4dC52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BlZWs7XG4gIH1cblxuICB0cnlDb25zdW1lKHR5cGU6IFRva2VuVHlwZSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdG9rZW4gPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodG9rZW4udHlwZSAhPT0gdHlwZSkgcmV0dXJuO1xuICAgIHRoaXMuX3BlZWsgPSB1bmRlZmluZWQ7IC8vIFJlc2V0IGFmdGVyIGNvbnN1bWVkLlxuICAgIHJldHVybiB0b2tlbi52YWx1ZTtcbiAgfVxuXG4gIGNvbnN1bWUodHlwZTogVG9rZW5UeXBlKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMudHJ5Q29uc3VtZSh0eXBlKTtcbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHZhbHVlO1xuICAgIGNvbnN0IHsgdHlwZTogbmV4dFR5cGUsIGluZGV4IH0gPSB0aGlzLnBlZWsoKTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgYFVuZXhwZWN0ZWQgJHtuZXh0VHlwZX0gYXQgJHtpbmRleH0sIGV4cGVjdGVkICR7dHlwZX06ICR7REVCVUdfVVJMfWAsXG4gICAgKTtcbiAgfVxuXG4gIHRleHQoKTogc3RyaW5nIHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB3aGlsZSAoKHZhbHVlID0gdGhpcy50cnlDb25zdW1lKFwiQ0hBUlwiKSB8fCB0aGlzLnRyeUNvbnN1bWUoXCJFU0NBUEVEXCIpKSkge1xuICAgICAgcmVzdWx0ICs9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cbi8qKlxuICogUGxhaW4gdGV4dC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZXh0IHtcbiAgdHlwZTogXCJ0ZXh0XCI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBwYXJhbWV0ZXIgZGVzaWduZWQgdG8gbWF0Y2ggYXJiaXRyYXJ5IHRleHQgd2l0aGluIGEgc2VnbWVudC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXIge1xuICB0eXBlOiBcInBhcmFtXCI7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHdpbGRjYXJkIHBhcmFtZXRlciBkZXNpZ25lZCB0byBtYXRjaCBtdWx0aXBsZSBzZWdtZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXaWxkY2FyZCB7XG4gIHR5cGU6IFwid2lsZGNhcmRcIjtcbiAgbmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgc2V0IG9mIHBvc3NpYmxlIHRva2VucyB0byBleHBhbmQgd2hlbiBtYXRjaGluZy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcm91cCB7XG4gIHR5cGU6IFwiZ3JvdXBcIjtcbiAgdG9rZW5zOiBUb2tlbltdO1xufVxuXG4vKipcbiAqIEEgdG9rZW4gdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgcmVnZXhwIGNhcHR1cmUuXG4gKi9cbmV4cG9ydCB0eXBlIEtleSA9IFBhcmFtZXRlciB8IFdpbGRjYXJkO1xuXG4vKipcbiAqIEEgc2VxdWVuY2Ugb2YgYHBhdGgtdG8tcmVnZXhwYCBrZXlzIHRoYXQgbWF0Y2ggY2FwdHVyaW5nIGdyb3Vwcy5cbiAqL1xuZXhwb3J0IHR5cGUgS2V5cyA9IEFycmF5PEtleT47XG5cbi8qKlxuICogQSBzZXF1ZW5jZSBvZiBwYXRoIG1hdGNoIGNoYXJhY3RlcnMuXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gVGV4dCB8IFBhcmFtZXRlciB8IFdpbGRjYXJkIHwgR3JvdXA7XG5cbi8qKlxuICogVG9rZW5pemVkIHBhdGggaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBUb2tlbkRhdGEge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgdG9rZW5zOiBUb2tlbltdKSB7fVxufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cjogc3RyaW5nLCBvcHRpb25zOiBQYXJzZU9wdGlvbnMgPSB7fSk6IFRva2VuRGF0YSB7XG4gIGNvbnN0IHsgZW5jb2RlUGF0aCA9IE5PT1BfVkFMVUUgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGl0ID0gbmV3IEl0ZXIobGV4ZXIoc3RyKSk7XG5cbiAgZnVuY3Rpb24gY29uc3VtZShlbmRUeXBlOiBUb2tlblR5cGUpOiBUb2tlbltdIHtcbiAgICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCBwYXRoID0gaXQudGV4dCgpO1xuICAgICAgaWYgKHBhdGgpIHRva2Vucy5wdXNoKHsgdHlwZTogXCJ0ZXh0XCIsIHZhbHVlOiBlbmNvZGVQYXRoKHBhdGgpIH0pO1xuXG4gICAgICBjb25zdCBwYXJhbSA9IGl0LnRyeUNvbnN1bWUoXCJQQVJBTVwiKTtcbiAgICAgIGlmIChwYXJhbSkge1xuICAgICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJwYXJhbVwiLFxuICAgICAgICAgIG5hbWU6IHBhcmFtLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHdpbGRjYXJkID0gaXQudHJ5Q29uc3VtZShcIldJTERDQVJEXCIpO1xuICAgICAgaWYgKHdpbGRjYXJkKSB7XG4gICAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcIndpbGRjYXJkXCIsXG4gICAgICAgICAgbmFtZTogd2lsZGNhcmQsXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3BlbiA9IGl0LnRyeUNvbnN1bWUoXCJ7XCIpO1xuICAgICAgaWYgKG9wZW4pIHtcbiAgICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgICAgICB0b2tlbnM6IGNvbnN1bWUoXCJ9XCIpLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGl0LmNvbnN1bWUoZW5kVHlwZSk7XG4gICAgICByZXR1cm4gdG9rZW5zO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHRva2VucyA9IGNvbnN1bWUoXCJFTkRcIik7XG4gIHJldHVybiBuZXcgVG9rZW5EYXRhKHRva2Vucyk7XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIFBhcmFtRGF0YSA9IFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3QgeyBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IGRhdGEgPSBwYXRoIGluc3RhbmNlb2YgVG9rZW5EYXRhID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpO1xuICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24oZGF0YS50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICByZXR1cm4gZnVuY3Rpb24gcGF0aChkYXRhOiBQID0ge30gYXMgUCkge1xuICAgIGNvbnN0IFtwYXRoLCAuLi5taXNzaW5nXSA9IGZuKGRhdGEpO1xuICAgIGlmIChtaXNzaW5nLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXJzOiAke21pc3Npbmcuam9pbihcIiwgXCIpfWApO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXT4+O1xuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbmZ1bmN0aW9uIHRva2Vuc1RvRnVuY3Rpb24oXG4gIHRva2VuczogVG9rZW5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pIHtcbiAgY29uc3QgZW5jb2RlcnMgPSB0b2tlbnMubWFwKCh0b2tlbikgPT5cbiAgICB0b2tlblRvRnVuY3Rpb24odG9rZW4sIGRlbGltaXRlciwgZW5jb2RlKSxcbiAgKTtcblxuICByZXR1cm4gKGRhdGE6IFBhcmFtRGF0YSkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXCJcIl07XG5cbiAgICBmb3IgKGNvbnN0IGVuY29kZXIgb2YgZW5jb2RlcnMpIHtcbiAgICAgIGNvbnN0IFt2YWx1ZSwgLi4uZXh0cmFzXSA9IGVuY29kZXIoZGF0YSk7XG4gICAgICByZXN1bHRbMF0gKz0gdmFsdWU7XG4gICAgICByZXN1bHQucHVzaCguLi5leHRyYXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydCBhIHNpbmdsZSB0b2tlbiBpbnRvIGEgcGF0aCBidWlsZGluZyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gdG9rZW5Ub0Z1bmN0aW9uKFxuICB0b2tlbjogVG9rZW4sXG4gIGRlbGltaXRlcjogc3RyaW5nLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogKGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nW10ge1xuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHJldHVybiAoKSA9PiBbdG9rZW4udmFsdWVdO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24odG9rZW4udG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IFt2YWx1ZSwgLi4ubWlzc2luZ10gPSBmbihkYXRhKTtcbiAgICAgIGlmICghbWlzc2luZy5sZW5ndGgpIHJldHVybiBbdmFsdWVdO1xuICAgICAgcmV0dXJuIFtcIlwiXTtcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgZW5jb2RlVmFsdWUgPSBlbmNvZGUgfHwgTk9PUF9WQUxVRTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiICYmIGVuY29kZSAhPT0gZmFsc2UpIHtcbiAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gW1wiXCIsIHRva2VuLm5hbWVdO1xuXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIG5vbi1lbXB0eSBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW1xuICAgICAgICB2YWx1ZVxuICAgICAgICAgIC5tYXAoKHZhbHVlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgIGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX0vJHtpbmRleH1cIiB0byBiZSBhIHN0cmluZ2AsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVWYWx1ZSh2YWx1ZSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuam9pbihkZWxpbWl0ZXIpLFxuICAgICAgXTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gW1wiXCIsIHRva2VuLm5hbWVdO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2VuY29kZVZhbHVlKHZhbHVlKV07XG4gIH07XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiB7XG4gIHBhdGg6IHN0cmluZztcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAocGF0aDogc3RyaW5nKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBTdXBwb3J0ZWQgcGF0aCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBwYXRoIGludG8gYSBtYXRjaCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoIHwgUGF0aFtdLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgeyByZWdleHAsIGtleXMgfSA9IHBhdGhUb1JlZ2V4cChwYXRoLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlID09PSBmYWxzZSkgcmV0dXJuIE5PT1BfVkFMVUU7XG4gICAgaWYgKGtleS50eXBlID09PSBcInBhcmFtXCIpIHJldHVybiBkZWNvZGU7XG4gICAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5zcGxpdChkZWxpbWl0ZXIpLm1hcChkZWNvZGUpO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2goaW5wdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZWdleHAuZXhlYyhpbnB1dCk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBwYXRoID0gbVswXTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG4gICAgICBjb25zdCBkZWNvZGVyID0gZGVjb2RlcnNbaSAtIDFdO1xuICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZXIobVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgcGFyYW1zIH07XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9SZWdleHAoXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7XG4gICAgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIsXG4gICAgZW5kID0gdHJ1ZSxcbiAgICBzZW5zaXRpdmUgPSBmYWxzZSxcbiAgICB0cmFpbGluZyA9IHRydWUsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBrZXlzOiBLZXlzID0gW107XG4gIGNvbnN0IHNvdXJjZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGZsYWdzID0gc2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiO1xuICBjb25zdCBwYXRocyA9IEFycmF5LmlzQXJyYXkocGF0aCkgPyBwYXRoIDogW3BhdGhdO1xuICBjb25zdCBpdGVtcyA9IHBhdGhzLm1hcCgocGF0aCkgPT5cbiAgICBwYXRoIGluc3RhbmNlb2YgVG9rZW5EYXRhID8gcGF0aCA6IHBhcnNlKHBhdGgsIG9wdGlvbnMpLFxuICApO1xuXG4gIGZvciAoY29uc3QgeyB0b2tlbnMgfSBvZiBpdGVtcykge1xuICAgIGZvciAoY29uc3Qgc2VxIG9mIGZsYXR0ZW4odG9rZW5zLCAwLCBbXSkpIHtcbiAgICAgIGNvbnN0IHJlZ2V4cCA9IHNlcXVlbmNlVG9SZWdFeHAoc2VxLCBkZWxpbWl0ZXIsIGtleXMpO1xuICAgICAgc291cmNlcy5wdXNoKHJlZ2V4cCk7XG4gICAgfVxuICB9XG5cbiAgbGV0IHBhdHRlcm4gPSBgXig/OiR7c291cmNlcy5qb2luKFwifFwiKX0pYDtcbiAgaWYgKHRyYWlsaW5nKSBwYXR0ZXJuICs9IGAoPzoke2VzY2FwZShkZWxpbWl0ZXIpfSQpP2A7XG4gIHBhdHRlcm4gKz0gZW5kID8gXCIkXCIgOiBgKD89JHtlc2NhcGUoZGVsaW1pdGVyKX18JClgO1xuXG4gIGNvbnN0IHJlZ2V4cCA9IG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICByZXR1cm4geyByZWdleHAsIGtleXMgfTtcbn1cblxuLyoqXG4gKiBGbGF0dGVuZWQgdG9rZW4gc2V0LlxuICovXG50eXBlIEZsYXR0ZW5lZCA9IFRleHQgfCBQYXJhbWV0ZXIgfCBXaWxkY2FyZDtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGZsYXQgbGlzdCBvZiBzZXF1ZW5jZSB0b2tlbnMgZnJvbSB0aGUgZ2l2ZW4gdG9rZW5zLlxuICovXG5mdW5jdGlvbiogZmxhdHRlbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBpbmRleDogbnVtYmVyLFxuICBpbml0OiBGbGF0dGVuZWRbXSxcbik6IEdlbmVyYXRvcjxGbGF0dGVuZWRbXT4ge1xuICBpZiAoaW5kZXggPT09IHRva2Vucy5sZW5ndGgpIHtcbiAgICByZXR1cm4geWllbGQgaW5pdDtcbiAgfVxuXG4gIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4XTtcblxuICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgY29uc3QgZm9yayA9IGluaXQuc2xpY2UoKTtcbiAgICBmb3IgKGNvbnN0IHNlcSBvZiBmbGF0dGVuKHRva2VuLnRva2VucywgMCwgZm9yaykpIHtcbiAgICAgIHlpZWxkKiBmbGF0dGVuKHRva2VucywgaW5kZXggKyAxLCBzZXEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpbml0LnB1c2godG9rZW4pO1xuICB9XG5cbiAgeWllbGQqIGZsYXR0ZW4odG9rZW5zLCBpbmRleCArIDEsIGluaXQpO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhIGZsYXQgc2VxdWVuY2Ugb2YgdG9rZW5zIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbmZ1bmN0aW9uIHNlcXVlbmNlVG9SZWdFeHAodG9rZW5zOiBGbGF0dGVuZWRbXSwgZGVsaW1pdGVyOiBzdHJpbmcsIGtleXM6IEtleXMpIHtcbiAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gIGxldCBiYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgaXNTYWZlU2VnbWVudFBhcmFtID0gdHJ1ZTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2ldO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICByZXN1bHQgKz0gZXNjYXBlKHRva2VuLnZhbHVlKTtcbiAgICAgIGJhY2t0cmFjayArPSB0b2tlbi52YWx1ZTtcbiAgICAgIGlzU2FmZVNlZ21lbnRQYXJhbSB8fD0gdG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICBpZiAoIWlzU2FmZVNlZ21lbnRQYXJhbSAmJiAhYmFja3RyYWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgdGV4dCBhZnRlciBcIiR7dG9rZW4ubmFtZX1cIjogJHtERUJVR19VUkx9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgICAgcmVzdWx0ICs9IGAoJHtuZWdhdGUoZGVsaW1pdGVyLCBpc1NhZmVTZWdtZW50UGFyYW0gPyBcIlwiIDogYmFja3RyYWNrKX0rKWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQgKz0gYChbXFxcXHNcXFxcU10rKWA7XG4gICAgICB9XG5cbiAgICAgIGtleXMucHVzaCh0b2tlbik7XG4gICAgICBiYWNrdHJhY2sgPSBcIlwiO1xuICAgICAgaXNTYWZlU2VnbWVudFBhcmFtID0gZmFsc2U7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBuZWdhdGUoZGVsaW1pdGVyOiBzdHJpbmcsIGJhY2t0cmFjazogc3RyaW5nKSB7XG4gIGlmIChiYWNrdHJhY2subGVuZ3RoIDwgMikge1xuICAgIGlmIChkZWxpbWl0ZXIubGVuZ3RoIDwgMikgcmV0dXJuIGBbXiR7ZXNjYXBlKGRlbGltaXRlciArIGJhY2t0cmFjayl9XWA7XG4gICAgcmV0dXJuIGAoPzooPyEke2VzY2FwZShkZWxpbWl0ZXIpfSlbXiR7ZXNjYXBlKGJhY2t0cmFjayl9XSlgO1xuICB9XG4gIGlmIChkZWxpbWl0ZXIubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiBgKD86KD8hJHtlc2NhcGUoYmFja3RyYWNrKX0pW14ke2VzY2FwZShkZWxpbWl0ZXIpfV0pYDtcbiAgfVxuICByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGJhY2t0cmFjayl9fCR7ZXNjYXBlKGRlbGltaXRlcil9KVtcXFxcc1xcXFxTXSlgO1xufVxuXG4vKipcbiAqIFN0cmluZ2lmeSB0b2tlbiBkYXRhIGludG8gYSBwYXRoIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ2lmeShkYXRhOiBUb2tlbkRhdGEpIHtcbiAgcmV0dXJuIGRhdGEudG9rZW5zXG4gICAgLm1hcChmdW5jdGlvbiBzdHJpbmdpZnlUb2tlbih0b2tlbiwgaW5kZXgsIHRva2Vucyk6IHN0cmluZyB7XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHJldHVybiBlc2NhcGVUZXh0KHRva2VuLnZhbHVlKTtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgICAgcmV0dXJuIGB7JHt0b2tlbi50b2tlbnMubWFwKHN0cmluZ2lmeVRva2VuKS5qb2luKFwiXCIpfX1gO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc1NhZmUgPVxuICAgICAgICBpc05hbWVTYWZlKHRva2VuLm5hbWUpICYmIGlzTmV4dE5hbWVTYWZlKHRva2Vuc1tpbmRleCArIDFdKTtcbiAgICAgIGNvbnN0IGtleSA9IGlzU2FmZSA/IHRva2VuLm5hbWUgOiBKU09OLnN0cmluZ2lmeSh0b2tlbi5uYW1lKTtcblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikgcmV0dXJuIGA6JHtrZXl9YDtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHJldHVybiBgKiR7a2V5fWA7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmV4cGVjdGVkIHRva2VuOiAke3Rva2VufWApO1xuICAgIH0pXG4gICAgLmpvaW4oXCJcIik7XG59XG5cbmZ1bmN0aW9uIGlzTmFtZVNhZmUobmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IFtmaXJzdCwgLi4ucmVzdF0gPSBuYW1lO1xuICBpZiAoIUlEX1NUQVJULnRlc3QoZmlyc3QpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiByZXN0LmV2ZXJ5KChjaGFyKSA9PiBJRF9DT05USU5VRS50ZXN0KGNoYXIpKTtcbn1cblxuZnVuY3Rpb24gaXNOZXh0TmFtZVNhZmUodG9rZW46IFRva2VuIHwgdW5kZWZpbmVkKSB7XG4gIGlmICh0b2tlbj8udHlwZSAhPT0gXCJ0ZXh0XCIpIHJldHVybiB0cnVlO1xuICByZXR1cm4gIUlEX0NPTlRJTlVFLnRlc3QodG9rZW4udmFsdWVbMF0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBFbmNvZGUgYXMgcDJyRW5jb2RlLFxuICAgIHR5cGUgRGVjb2RlIGFzIHAyckRlY29kZSxcbiAgICB0eXBlIFBhcnNlT3B0aW9ucyBhcyBwMnJQYXJzZU9wdGlvbnMsXG4gICAgdHlwZSBQYXRoVG9SZWdleHBPcHRpb25zIGFzIHAyclBhdGhUb1JlZ2V4cE9wdGlvbnMsXG4gICAgdHlwZSBNYXRjaE9wdGlvbnMgYXMgcDJyTWF0Y2hPcHRpb25zLFxuICAgIHR5cGUgQ29tcGlsZU9wdGlvbnMgYXMgcDJyQ29tcGlsZU9wdGlvbnMsXG4gICAgdHlwZSBQYXJhbURhdGEgYXMgcDJyUGFyYW1EYXRhLFxuICAgIHR5cGUgUGF0aEZ1bmN0aW9uIGFzIHAyclBhdGhGdW5jdGlvbixcbiAgICB0eXBlIE1hdGNoUmVzdWx0IGFzIHAyck1hdGNoUmVzdWx0LFxuICAgIHR5cGUgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgdHlwZSBNYXRjaEZ1bmN0aW9uIGFzIHAyck1hdGNoRnVuY3Rpb24sXG4gICAgdHlwZSBLZXkgYXMgcDJyS2V5LFxuICAgIHR5cGUgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgdHlwZSBQYXRoIGFzIHAyclBhdGgsXG4gICAgVG9rZW5EYXRhIGFzIHAyclRva2VuRGF0YSxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHN0cmluZ2lmeSxcbiAgICBwYXRoVG9SZWdleHAsXG59IGZyb20gJ3BhdGgtdG8tcmVnZXhwJztcblxuZGVjbGFyZSBuYW1lc3BhY2UgcGF0aDJyZWdleHAge1xuICAgIGV4cG9ydCB0eXBlIEVuY29kZSA9IHAyckVuY29kZTtcbiAgICBleHBvcnQgdHlwZSBEZWNvZGUgPSBwMnJEZWNvZGU7XG4gICAgZXhwb3J0IHR5cGUgUGFyc2VPcHRpb25zID0gcDJyUGFyc2VPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgPSBwMnJQYXRoVG9SZWdleHBPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoT3B0aW9ucyA9IHAyck1hdGNoT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBDb21waWxlT3B0aW9ucyA9IHAyckNvbXBpbGVPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRva2VuRGF0YSA9IHAyclRva2VuRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXJhbURhdGEgPSBwMnJQYXJhbURhdGE7XG4gICAgZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyUGF0aEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2hSZXN1bHQ8UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gcDJyTWF0Y2hGdW5jdGlvbjxQPjtcbiAgICBleHBvcnQgdHlwZSBLZXkgPSBwMnJLZXk7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW4gPSBwMnJUb2tlbjtcbiAgICBleHBvcnQgdHlwZSBQYXRoID0gcDJyUGF0aDtcbn1cblxuY29uc3QgcGF0aDJyZWdleHAgPSB7XG4gICAgVG9rZW5EYXRhOiBwMnJUb2tlbkRhdGEsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICBtYXRjaCxcbiAgICBzdHJpbmdpZnksXG4gICAgcGF0aFRvUmVnZXhwLFxufTtcblxuZXhwb3J0IHsgcGF0aDJyZWdleHAgfTtcbiJdLCJuYW1lcyI6WyJwMnJUb2tlbkRhdGEiLCJwYXJzZSIsImNvbXBpbGUiLCJtYXRjaCIsInN0cmluZ2lmeSIsInBhdGhUb1JlZ2V4cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFvUkEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUE7QUFrREEsQ0FBQSxJQUFBLENBQUEsT0FBQSxHQUFBLE9BQUE7QUFnSUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxHQUFBLEtBQUE7QUFpQ0EsQ0FBQSxJQUFBLENBQUEsWUFBQSxHQUFBLFlBQUE7QUFxSEEsQ0FBQSxJQUFBLENBQUEsU0FBQSxHQUFBLFNBQUE7Q0E1bEJBLE1BQU0saUJBQWlCLEdBQUcsR0FBRztBQUM3QixDQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxLQUFLLEtBQUs7Q0FDM0MsTUFBTSxRQUFRLEdBQUcscUJBQXFCO0NBQ3RDLE1BQU0sV0FBVyxHQUFHLG1DQUFtQztDQUN2RCxNQUFNLFNBQVMsR0FBRyxtQ0FBbUM7QUFrRnJELENBQUEsTUFBTSxhQUFhLEdBQThCOztLQUUvQyxHQUFHLEVBQUUsR0FBRztLQUNSLEdBQUcsRUFBRSxHQUFHOztLQUVSLEdBQUcsRUFBRSxHQUFHO0tBQ1IsR0FBRyxFQUFFLEdBQUc7S0FDUixHQUFHLEVBQUUsR0FBRztLQUNSLEdBQUcsRUFBRSxHQUFHO0tBQ1IsR0FBRyxFQUFFLEdBQUc7S0FDUixHQUFHLEVBQUUsR0FBRztLQUNSLEdBQUcsRUFBRSxHQUFHO0VBQ1Q7QUFFRDs7QUFFRztD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Q0FBQyxFQUFFLENBQUM7QUFDYjtDQUVBLFNBQVMsVUFBVSxDQUFDLElBQVksRUFBQTtLQUM5QixNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSTtBQUM3QixLQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUFFLFNBQUEsT0FBTyxLQUFLO0FBQ3ZDLEtBQUEsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckQ7Q0FFQSxTQUFTLGNBQWMsQ0FBQyxLQUF3QixFQUFBO0tBQzlDLElBQUksQ0FBQSxLQUFLLEtBQUEsSUFBQSxJQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksTUFBSyxNQUFNO0FBQUUsU0FBQSxPQUFPLElBQUk7QUFDdkMsS0FBQSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFDOzs7Ozs7O0FDeG5CQTs7QUFFRztBQTJDSCxNQUFNLFdBQVcsR0FBRztBQUNoQixJQUFBLFNBQVMsRUFBRUEscUJBQVk7V0FDdkJDLGlCQUFLO2FBQ0xDLG1CQUFPO1dBQ1BDLGlCQUFLO2VBQ0xDLHFCQUFTO2tCQUNUQyx3QkFBWTs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9