/*!
 * @cdp/extension-path2regexp 0.9.19
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

    exports.path2regexp = path2regexp;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBERUZBVUxUX0RFTElNSVRFUiA9IFwiL1wiO1xuY29uc3QgTk9PUF9WQUxVRSA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZTtcbmNvbnN0IElEX1NUQVJUID0gL15bJF9cXHB7SURfU3RhcnR9XSQvdTtcbmNvbnN0IElEX0NPTlRJTlVFID0gL15bJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfV0kL3U7XG5jb25zdCBERUJVR19VUkwgPSBcImh0dHBzOi8vZ2l0Lm5ldy9wYXRoVG9SZWdleHBFcnJvclwiO1xuXG4vKipcbiAqIEVuY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBFbmNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG4vKipcbiAqIERlY29kZSBhIHN0cmluZyBpbnRvIGFub3RoZXIgc3RyaW5nLlxuICovXG5leHBvcnQgdHlwZSBEZWNvZGUgPSAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzLlxuICAgKi9cbiAgZW5jb2RlUGF0aD86IEVuY29kZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIE1hdGNoZXMgdGhlIHBhdGggY29tcGxldGVseSB3aXRob3V0IHRyYWlsaW5nIGNoYXJhY3RlcnMuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3dzIG9wdGlvbmFsIHRyYWlsaW5nIGRlbGltaXRlciB0byBtYXRjaC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHRyYWlsaW5nPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE1hdGNoIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaE9wdGlvbnMgZXh0ZW5kcyBQYXRoVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBkZWNvZGluZyBzdHJpbmdzIGZvciBwYXJhbXMsIG9yIGBmYWxzZWAgdG8gZGlzYWJsZSBlbnRpcmVseS4gKGRlZmF1bHQ6IGBkZWNvZGVVUklDb21wb25lbnRgKVxuICAgKi9cbiAgZGVjb2RlPzogRGVjb2RlIHwgZmFsc2U7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZU9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciBzZWdtZW50cy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xufVxuXG50eXBlIFRva2VuVHlwZSA9XG4gIHwgXCJ7XCJcbiAgfCBcIn1cIlxuICB8IFwiV0lMRENBUkRcIlxuICB8IFwiUEFSQU1cIlxuICB8IFwiQ0hBUlwiXG4gIHwgXCJFU0NBUEVEXCJcbiAgfCBcIkVORFwiXG4gIC8vIFJlc2VydmVkIGZvciB1c2Ugb3IgYW1iaWd1b3VzIGR1ZSB0byBwYXN0IHVzZS5cbiAgfCBcIihcIlxuICB8IFwiKVwiXG4gIHwgXCJbXCJcbiAgfCBcIl1cIlxuICB8IFwiK1wiXG4gIHwgXCI/XCJcbiAgfCBcIiFcIjtcblxuLyoqXG4gKiBUb2tlbml6ZXIgcmVzdWx0cy5cbiAqL1xuaW50ZXJmYWNlIExleFRva2VuIHtcbiAgdHlwZTogVG9rZW5UeXBlO1xuICBpbmRleDogbnVtYmVyO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG5jb25zdCBTSU1QTEVfVE9LRU5TOiBSZWNvcmQ8c3RyaW5nLCBUb2tlblR5cGU+ID0ge1xuICAvLyBHcm91cHMuXG4gIFwie1wiOiBcIntcIixcbiAgXCJ9XCI6IFwifVwiLFxuICAvLyBSZXNlcnZlZC5cbiAgXCIoXCI6IFwiKFwiLFxuICBcIilcIjogXCIpXCIsXG4gIFwiW1wiOiBcIltcIixcbiAgXCJdXCI6IFwiXVwiLFxuICBcIitcIjogXCIrXCIsXG4gIFwiP1wiOiBcIj9cIixcbiAgXCIhXCI6IFwiIVwiLFxufTtcblxuLyoqXG4gKiBFc2NhcGUgdGV4dCBmb3Igc3RyaW5naWZ5IHRvIHBhdGguXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVRleHQoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9be30oKVxcW1xcXSs/IToqXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGUoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bLisqP14ke30oKVtcXF18L1xcXFxdL2csIFwiXFxcXCQmXCIpO1xufVxuXG4vKipcbiAqIFRva2VuaXplIGlucHV0IHN0cmluZy5cbiAqL1xuZnVuY3Rpb24qIGxleGVyKHN0cjogc3RyaW5nKTogR2VuZXJhdG9yPExleFRva2VuLCBMZXhUb2tlbj4ge1xuICBjb25zdCBjaGFycyA9IFsuLi5zdHJdO1xuICBsZXQgaSA9IDA7XG5cbiAgZnVuY3Rpb24gbmFtZSgpIHtcbiAgICBsZXQgdmFsdWUgPSBcIlwiO1xuXG4gICAgaWYgKElEX1NUQVJULnRlc3QoY2hhcnNbKytpXSkpIHtcbiAgICAgIHZhbHVlICs9IGNoYXJzW2ldO1xuICAgICAgd2hpbGUgKElEX0NPTlRJTlVFLnRlc3QoY2hhcnNbKytpXSkpIHtcbiAgICAgICAgdmFsdWUgKz0gY2hhcnNbaV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjaGFyc1tpXSA9PT0gJ1wiJykge1xuICAgICAgbGV0IHBvcyA9IGk7XG5cbiAgICAgIHdoaWxlIChpIDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChjaGFyc1srK2ldID09PSAnXCInKSB7XG4gICAgICAgICAgaSsrO1xuICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhcnNbaV0gPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgdmFsdWUgKz0gY2hhcnNbKytpXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSArPSBjaGFyc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAocG9zKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVudGVybWluYXRlZCBxdW90ZSBhdCAke3Bvc306ICR7REVCVUdfVVJMfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyIG5hbWUgYXQgJHtpfTogJHtERUJVR19VUkx9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgd2hpbGUgKGkgPCBjaGFycy5sZW5ndGgpIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNoYXJzW2ldO1xuICAgIGNvbnN0IHR5cGUgPSBTSU1QTEVfVE9LRU5TW3ZhbHVlXTtcblxuICAgIGlmICh0eXBlKSB7XG4gICAgICB5aWVsZCB7IHR5cGUsIGluZGV4OiBpKyssIHZhbHVlIH07XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgIHlpZWxkIHsgdHlwZTogXCJFU0NBUEVEXCIsIGluZGV4OiBpKyssIHZhbHVlOiBjaGFyc1tpKytdIH07XG4gICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gXCI6XCIpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gbmFtZSgpO1xuICAgICAgeWllbGQgeyB0eXBlOiBcIlBBUkFNXCIsIGluZGV4OiBpLCB2YWx1ZSB9O1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IFwiKlwiKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG5hbWUoKTtcbiAgICAgIHlpZWxkIHsgdHlwZTogXCJXSUxEQ0FSRFwiLCBpbmRleDogaSwgdmFsdWUgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgeWllbGQgeyB0eXBlOiBcIkNIQVJcIiwgaW5kZXg6IGksIHZhbHVlOiBjaGFyc1tpKytdIH07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHsgdHlwZTogXCJFTkRcIiwgaW5kZXg6IGksIHZhbHVlOiBcIlwiIH07XG59XG5cbmNsYXNzIEl0ZXIge1xuICBwcml2YXRlIF9wZWVrPzogTGV4VG9rZW47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0b2tlbnM6IEdlbmVyYXRvcjxMZXhUb2tlbiwgTGV4VG9rZW4+KSB7fVxuXG4gIHBlZWsoKTogTGV4VG9rZW4ge1xuICAgIGlmICghdGhpcy5fcGVlaykge1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudG9rZW5zLm5leHQoKTtcbiAgICAgIHRoaXMuX3BlZWsgPSBuZXh0LnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGVlaztcbiAgfVxuXG4gIHRyeUNvbnN1bWUodHlwZTogVG9rZW5UeXBlKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB0b2tlbiA9IHRoaXMucGVlaygpO1xuICAgIGlmICh0b2tlbi50eXBlICE9PSB0eXBlKSByZXR1cm47XG4gICAgdGhpcy5fcGVlayA9IHVuZGVmaW5lZDsgLy8gUmVzZXQgYWZ0ZXIgY29uc3VtZWQuXG4gICAgcmV0dXJuIHRva2VuLnZhbHVlO1xuICB9XG5cbiAgY29uc3VtZSh0eXBlOiBUb2tlblR5cGUpOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy50cnlDb25zdW1lKHR5cGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsdWU7XG4gICAgY29uc3QgeyB0eXBlOiBuZXh0VHlwZSwgaW5kZXggfSA9IHRoaXMucGVlaygpO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgVW5leHBlY3RlZCAke25leHRUeXBlfSBhdCAke2luZGV4fSwgZXhwZWN0ZWQgJHt0eXBlfTogJHtERUJVR19VUkx9YCxcbiAgICApO1xuICB9XG5cbiAgdGV4dCgpOiBzdHJpbmcge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICgodmFsdWUgPSB0aGlzLnRyeUNvbnN1bWUoXCJDSEFSXCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIkVTQ0FQRURcIikpKSB7XG4gICAgICByZXN1bHQgKz0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuLyoqXG4gKiBQbGFpbiB0ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRleHQge1xuICB0eXBlOiBcInRleHRcIjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHBhcmFtZXRlciBkZXNpZ25lZCB0byBtYXRjaCBhcmJpdHJhcnkgdGV4dCB3aXRoaW4gYSBzZWdtZW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlciB7XG4gIHR5cGU6IFwicGFyYW1cIjtcbiAgbmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgd2lsZGNhcmQgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIG11bHRpcGxlIHNlZ21lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdpbGRjYXJkIHtcbiAgdHlwZTogXCJ3aWxkY2FyZFwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBzZXQgb2YgcG9zc2libGUgdG9rZW5zIHRvIGV4cGFuZCB3aGVuIG1hdGNoaW5nLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwIHtcbiAgdHlwZTogXCJncm91cFwiO1xuICB0b2tlbnM6IFRva2VuW107XG59XG5cbi8qKlxuICogQSB0b2tlbiB0aGF0IGNvcnJlc3BvbmRzIHdpdGggYSByZWdleHAgY2FwdHVyZS5cbiAqL1xuZXhwb3J0IHR5cGUgS2V5ID0gUGFyYW1ldGVyIHwgV2lsZGNhcmQ7XG5cbi8qKlxuICogQSBzZXF1ZW5jZSBvZiBgcGF0aC10by1yZWdleHBgIGtleXMgdGhhdCBtYXRjaCBjYXB0dXJpbmcgZ3JvdXBzLlxuICovXG5leHBvcnQgdHlwZSBLZXlzID0gQXJyYXk8S2V5PjtcblxuLyoqXG4gKiBBIHNlcXVlbmNlIG9mIHBhdGggbWF0Y2ggY2hhcmFjdGVycy5cbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBUZXh0IHwgUGFyYW1ldGVyIHwgV2lsZGNhcmQgfCBHcm91cDtcblxuLyoqXG4gKiBUb2tlbml6ZWQgcGF0aCBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRva2VuRGF0YSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5EYXRhIHtcbiAgY29uc3QgeyBlbmNvZGVQYXRoID0gTk9PUF9WQUxVRSB9ID0gb3B0aW9ucztcbiAgY29uc3QgaXQgPSBuZXcgSXRlcihsZXhlcihzdHIpKTtcblxuICBmdW5jdGlvbiBjb25zdW1lKGVuZFR5cGU6IFRva2VuVHlwZSk6IFRva2VuW10ge1xuICAgIGNvbnN0IHRva2VuczogVG9rZW5bXSA9IFtdO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHBhdGggPSBpdC50ZXh0KCk7XG4gICAgICBpZiAocGF0aCkgdG9rZW5zLnB1c2goeyB0eXBlOiBcInRleHRcIiwgdmFsdWU6IGVuY29kZVBhdGgocGF0aCkgfSk7XG5cbiAgICAgIGNvbnN0IHBhcmFtID0gaXQudHJ5Q29uc3VtZShcIlBBUkFNXCIpO1xuICAgICAgaWYgKHBhcmFtKSB7XG4gICAgICAgIHRva2Vucy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcInBhcmFtXCIsXG4gICAgICAgICAgbmFtZTogcGFyYW0sXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgd2lsZGNhcmQgPSBpdC50cnlDb25zdW1lKFwiV0lMRENBUkRcIik7XG4gICAgICBpZiAod2lsZGNhcmQpIHtcbiAgICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwid2lsZGNhcmRcIixcbiAgICAgICAgICBuYW1lOiB3aWxkY2FyZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvcGVuID0gaXQudHJ5Q29uc3VtZShcIntcIik7XG4gICAgICBpZiAob3Blbikge1xuICAgICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJncm91cFwiLFxuICAgICAgICAgIHRva2VuczogY29uc3VtZShcIn1cIiksXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaXQuY29uc3VtZShlbmRUeXBlKTtcbiAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdG9rZW5zID0gY29uc3VtZShcIkVORFwiKTtcbiAgcmV0dXJuIG5ldyBUb2tlbkRhdGEodG9rZW5zKTtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgUGFyYW1EYXRhID0gUGFyYW1EYXRhPihcbiAgcGF0aDogUGF0aCxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7IGVuY29kZSA9IGVuY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgZGF0YSA9IHBhdGggaW5zdGFuY2VvZiBUb2tlbkRhdGEgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyk7XG4gIGNvbnN0IGZuID0gdG9rZW5zVG9GdW5jdGlvbihkYXRhLnRva2VucywgZGVsaW1pdGVyLCBlbmNvZGUpO1xuXG4gIHJldHVybiBmdW5jdGlvbiBwYXRoKGRhdGE6IFAgPSB7fSBhcyBQKSB7XG4gICAgY29uc3QgW3BhdGgsIC4uLm1pc3NpbmddID0gZm4oZGF0YSk7XG4gICAgaWYgKG1pc3NpbmcubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlcnM6ICR7bWlzc2luZy5qb2luKFwiLCBcIil9YCk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBQYXJhbURhdGEgPSBQYXJ0aWFsPFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdPj47XG5leHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAoZGF0YT86IFApID0+IHN0cmluZztcblxuZnVuY3Rpb24gdG9rZW5zVG9GdW5jdGlvbihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbikge1xuICBjb25zdCBlbmNvZGVycyA9IHRva2Vucy5tYXAoKHRva2VuKSA9PlxuICAgIHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZGVsaW1pdGVyLCBlbmNvZGUpLFxuICApO1xuXG4gIHJldHVybiAoZGF0YTogUGFyYW1EYXRhKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtcIlwiXTtcblxuICAgIGZvciAoY29uc3QgZW5jb2RlciBvZiBlbmNvZGVycykge1xuICAgICAgY29uc3QgW3ZhbHVlLCAuLi5leHRyYXNdID0gZW5jb2RlcihkYXRhKTtcbiAgICAgIHJlc3VsdFswXSArPSB2YWx1ZTtcbiAgICAgIHJlc3VsdC5wdXNoKC4uLmV4dHJhcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgc2luZ2xlIHRva2VuIGludG8gYSBwYXRoIGJ1aWxkaW5nIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlblRvRnVuY3Rpb24oXG4gIHRva2VuOiBUb2tlbixcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pOiAoZGF0YTogUGFyYW1EYXRhKSA9PiBzdHJpbmdbXSB7XG4gIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikgcmV0dXJuICgpID0+IFt0b2tlbi52YWx1ZV07XG5cbiAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgIGNvbnN0IGZuID0gdG9rZW5zVG9GdW5jdGlvbih0b2tlbi50b2tlbnMsIGRlbGltaXRlciwgZW5jb2RlKTtcblxuICAgIHJldHVybiAoZGF0YSkgPT4ge1xuICAgICAgY29uc3QgW3ZhbHVlLCAuLi5taXNzaW5nXSA9IGZuKGRhdGEpO1xuICAgICAgaWYgKCFtaXNzaW5nLmxlbmd0aCkgcmV0dXJuIFt2YWx1ZV07XG4gICAgICByZXR1cm4gW1wiXCJdO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBlbmNvZGVWYWx1ZSA9IGVuY29kZSB8fCBOT09QX1ZBTFVFO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIgJiYgZW5jb2RlICE9PSBmYWxzZSkge1xuICAgIHJldHVybiAoZGF0YSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBbXCJcIiwgdG9rZW4ubmFtZV07XG5cbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlIGEgbm9uLWVtcHR5IGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbXG4gICAgICAgIHZhbHVlXG4gICAgICAgICAgLm1hcCgodmFsdWUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2luZGV4fVwiIHRvIGJlIGEgc3RyaW5nYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5qb2luKGRlbGltaXRlciksXG4gICAgICBdO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBbXCJcIiwgdG9rZW4ubmFtZV07XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgIH1cblxuICAgIHJldHVybiBbZW5jb2RlVmFsdWUodmFsdWUpXTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIHJlc3VsdCBjb250YWlucyBkYXRhIGFib3V0IHRoZSBwYXRoIG1hdGNoLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+IHtcbiAgcGF0aDogc3RyaW5nO1xuICBwYXJhbXM6IFA7XG59XG5cbi8qKlxuICogQSBtYXRjaCBpcyBlaXRoZXIgYGZhbHNlYCAobm8gbWF0Y2gpIG9yIGEgbWF0Y2ggcmVzdWx0LlxuICovXG5leHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IGZhbHNlIHwgTWF0Y2hSZXN1bHQ8UD47XG5cbi8qKlxuICogVGhlIG1hdGNoIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgbWF0Y2hlZCB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChwYXRoOiBzdHJpbmcpID0+IE1hdGNoPFA+O1xuXG4vKipcbiAqIFN1cHBvcnRlZCBwYXRoIHR5cGVzLlxuICovXG5leHBvcnQgdHlwZSBQYXRoID0gc3RyaW5nIHwgVG9rZW5EYXRhO1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHBhdGggaW50byBhIG1hdGNoIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IE1hdGNoT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKTogTWF0Y2hGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHsgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50LCBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUiB9ID1cbiAgICBvcHRpb25zO1xuICBjb25zdCB7IHJlZ2V4cCwga2V5cyB9ID0gcGF0aFRvUmVnZXhwKHBhdGgsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGRlY29kZXJzID0ga2V5cy5tYXAoKGtleSkgPT4ge1xuICAgIGlmIChkZWNvZGUgPT09IGZhbHNlKSByZXR1cm4gTk9PUF9WQUxVRTtcbiAgICBpZiAoa2V5LnR5cGUgPT09IFwicGFyYW1cIikgcmV0dXJuIGRlY29kZTtcbiAgICByZXR1cm4gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnNwbGl0KGRlbGltaXRlcikubWFwKGRlY29kZSk7XG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiBtYXRjaChpbnB1dDogc3RyaW5nKSB7XG4gICAgY29uc3QgbSA9IHJlZ2V4cC5leGVjKGlucHV0KTtcbiAgICBpZiAoIW0pIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHBhdGggPSBtWzBdO1xuICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtW2ldID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIGNvbnN0IGRlY29kZXIgPSBkZWNvZGVyc1tpIC0gMV07XG4gICAgICBwYXJhbXNba2V5Lm5hbWVdID0gZGVjb2RlcihtW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXRoLCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1JlZ2V4cChcbiAgcGF0aDogUGF0aCB8IFBhdGhbXSxcbiAgb3B0aW9uczogUGF0aFRvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyA9IHt9LFxuKSB7XG4gIGNvbnN0IHtcbiAgICBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUixcbiAgICBlbmQgPSB0cnVlLFxuICAgIHNlbnNpdGl2ZSA9IGZhbHNlLFxuICAgIHRyYWlsaW5nID0gdHJ1ZSxcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGtleXM6IEtleXMgPSBbXTtcbiAgY29uc3Qgc291cmNlczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZmxhZ3MgPSBzZW5zaXRpdmUgPyBcIlwiIDogXCJpXCI7XG4gIGNvbnN0IHBhdGhzID0gQXJyYXkuaXNBcnJheShwYXRoKSA/IHBhdGggOiBbcGF0aF07XG4gIGNvbnN0IGl0ZW1zID0gcGF0aHMubWFwKChwYXRoKSA9PlxuICAgIHBhdGggaW5zdGFuY2VvZiBUb2tlbkRhdGEgPyBwYXRoIDogcGFyc2UocGF0aCwgb3B0aW9ucyksXG4gICk7XG5cbiAgZm9yIChjb25zdCB7IHRva2VucyB9IG9mIGl0ZW1zKSB7XG4gICAgZm9yIChjb25zdCBzZXEgb2YgZmxhdHRlbih0b2tlbnMsIDAsIFtdKSkge1xuICAgICAgY29uc3QgcmVnZXhwID0gc2VxdWVuY2VUb1JlZ0V4cChzZXEsIGRlbGltaXRlciwga2V5cyk7XG4gICAgICBzb3VyY2VzLnB1c2gocmVnZXhwKTtcbiAgICB9XG4gIH1cblxuICBsZXQgcGF0dGVybiA9IGBeKD86JHtzb3VyY2VzLmpvaW4oXCJ8XCIpfSlgO1xuICBpZiAodHJhaWxpbmcpIHBhdHRlcm4gKz0gYCg/OiR7ZXNjYXBlKGRlbGltaXRlcil9JCk/YDtcbiAgcGF0dGVybiArPSBlbmQgPyBcIiRcIiA6IGAoPz0ke2VzY2FwZShkZWxpbWl0ZXIpfXwkKWA7XG5cbiAgY29uc3QgcmVnZXhwID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG4gIHJldHVybiB7IHJlZ2V4cCwga2V5cyB9O1xufVxuXG4vKipcbiAqIEZsYXR0ZW5lZCB0b2tlbiBzZXQuXG4gKi9cbnR5cGUgRmxhdHRlbmVkID0gVGV4dCB8IFBhcmFtZXRlciB8IFdpbGRjYXJkO1xuXG4vKipcbiAqIEdlbmVyYXRlIGEgZmxhdCBsaXN0IG9mIHNlcXVlbmNlIHRva2VucyBmcm9tIHRoZSBnaXZlbiB0b2tlbnMuXG4gKi9cbmZ1bmN0aW9uKiBmbGF0dGVuKFxuICB0b2tlbnM6IFRva2VuW10sXG4gIGluZGV4OiBudW1iZXIsXG4gIGluaXQ6IEZsYXR0ZW5lZFtdLFxuKTogR2VuZXJhdG9yPEZsYXR0ZW5lZFtdPiB7XG4gIGlmIChpbmRleCA9PT0gdG9rZW5zLmxlbmd0aCkge1xuICAgIHJldHVybiB5aWVsZCBpbml0O1xuICB9XG5cbiAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXhdO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICBjb25zdCBmb3JrID0gaW5pdC5zbGljZSgpO1xuICAgIGZvciAoY29uc3Qgc2VxIG9mIGZsYXR0ZW4odG9rZW4udG9rZW5zLCAwLCBmb3JrKSkge1xuICAgICAgeWllbGQqIGZsYXR0ZW4odG9rZW5zLCBpbmRleCArIDEsIHNlcSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGluaXQucHVzaCh0b2tlbik7XG4gIH1cblxuICB5aWVsZCogZmxhdHRlbih0b2tlbnMsIGluZGV4ICsgMSwgaW5pdCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgZmxhdCBzZXF1ZW5jZSBvZiB0b2tlbnMgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqL1xuZnVuY3Rpb24gc2VxdWVuY2VUb1JlZ0V4cCh0b2tlbnM6IEZsYXR0ZW5lZFtdLCBkZWxpbWl0ZXI6IHN0cmluZywga2V5czogS2V5cykge1xuICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgbGV0IGJhY2t0cmFjayA9IFwiXCI7XG4gIGxldCBpc1NhZmVTZWdtZW50UGFyYW0gPSB0cnVlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaV07XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ0ZXh0XCIpIHtcbiAgICAgIHJlc3VsdCArPSBlc2NhcGUodG9rZW4udmFsdWUpO1xuICAgICAgYmFja3RyYWNrICs9IHRva2VuLnZhbHVlO1xuICAgICAgaXNTYWZlU2VnbWVudFBhcmFtIHx8PSB0b2tlbi52YWx1ZS5pbmNsdWRlcyhkZWxpbWl0ZXIpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIiB8fCB0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIGlmICghaXNTYWZlU2VnbWVudFBhcmFtICYmICFiYWNrdHJhY2spIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyB0ZXh0IGFmdGVyIFwiJHt0b2tlbi5uYW1lfVwiOiAke0RFQlVHX1VSTH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwicGFyYW1cIikge1xuICAgICAgICByZXN1bHQgKz0gYCgke25lZ2F0ZShkZWxpbWl0ZXIsIGlzU2FmZVNlZ21lbnRQYXJhbSA/IFwiXCIgOiBiYWNrdHJhY2spfSspYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCArPSBgKFtcXFxcc1xcXFxTXSspYDtcbiAgICAgIH1cblxuICAgICAga2V5cy5wdXNoKHRva2VuKTtcbiAgICAgIGJhY2t0cmFjayA9IFwiXCI7XG4gICAgICBpc1NhZmVTZWdtZW50UGFyYW0gPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG5lZ2F0ZShkZWxpbWl0ZXI6IHN0cmluZywgYmFja3RyYWNrOiBzdHJpbmcpIHtcbiAgaWYgKGJhY2t0cmFjay5sZW5ndGggPCAyKSB7XG4gICAgaWYgKGRlbGltaXRlci5sZW5ndGggPCAyKSByZXR1cm4gYFteJHtlc2NhcGUoZGVsaW1pdGVyICsgYmFja3RyYWNrKX1dYDtcbiAgICByZXR1cm4gYCg/Oig/ISR7ZXNjYXBlKGRlbGltaXRlcil9KVteJHtlc2NhcGUoYmFja3RyYWNrKX1dKWA7XG4gIH1cbiAgaWYgKGRlbGltaXRlci5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIGAoPzooPyEke2VzY2FwZShiYWNrdHJhY2spfSlbXiR7ZXNjYXBlKGRlbGltaXRlcil9XSlgO1xuICB9XG4gIHJldHVybiBgKD86KD8hJHtlc2NhcGUoYmFja3RyYWNrKX18JHtlc2NhcGUoZGVsaW1pdGVyKX0pW1xcXFxzXFxcXFNdKWA7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IHRva2VuIGRhdGEgaW50byBhIHBhdGggc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5KGRhdGE6IFRva2VuRGF0YSkge1xuICByZXR1cm4gZGF0YS50b2tlbnNcbiAgICAubWFwKGZ1bmN0aW9uIHN0cmluZ2lmeVRva2VuKHRva2VuLCBpbmRleCwgdG9rZW5zKTogc3RyaW5nIHtcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikgcmV0dXJuIGVzY2FwZVRleHQodG9rZW4udmFsdWUpO1xuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwiZ3JvdXBcIikge1xuICAgICAgICByZXR1cm4gYHske3Rva2VuLnRva2Vucy5tYXAoc3RyaW5naWZ5VG9rZW4pLmpvaW4oXCJcIil9fWA7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzU2FmZSA9XG4gICAgICAgIGlzTmFtZVNhZmUodG9rZW4ubmFtZSkgJiYgaXNOZXh0TmFtZVNhZmUodG9rZW5zW2luZGV4ICsgMV0pO1xuICAgICAgY29uc3Qga2V5ID0gaXNTYWZlID8gdG9rZW4ubmFtZSA6IEpTT04uc3RyaW5naWZ5KHRva2VuLm5hbWUpO1xuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJwYXJhbVwiKSByZXR1cm4gYDoke2tleX1gO1xuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFwid2lsZGNhcmRcIikgcmV0dXJuIGAqJHtrZXl9YDtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVuZXhwZWN0ZWQgdG9rZW46ICR7dG9rZW59YCk7XG4gICAgfSlcbiAgICAuam9pbihcIlwiKTtcbn1cblxuZnVuY3Rpb24gaXNOYW1lU2FmZShuYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgW2ZpcnN0LCAuLi5yZXN0XSA9IG5hbWU7XG4gIGlmICghSURfU1RBUlQudGVzdChmaXJzdCkpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHJlc3QuZXZlcnkoKGNoYXIpID0+IElEX0NPTlRJTlVFLnRlc3QoY2hhcikpO1xufVxuXG5mdW5jdGlvbiBpc05leHROYW1lU2FmZSh0b2tlbjogVG9rZW4gfCB1bmRlZmluZWQpIHtcbiAgaWYgKHRva2VuPy50eXBlICE9PSBcInRleHRcIikgcmV0dXJuIHRydWU7XG4gIHJldHVybiAhSURfQ09OVElOVUUudGVzdCh0b2tlbi52YWx1ZVswXSk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIEVuY29kZSBhcyBwMnJFbmNvZGUsXG4gICAgdHlwZSBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIHR5cGUgUGFyc2VPcHRpb25zIGFzIHAyclBhcnNlT3B0aW9ucyxcbiAgICB0eXBlIFBhdGhUb1JlZ2V4cE9wdGlvbnMgYXMgcDJyUGF0aFRvUmVnZXhwT3B0aW9ucyxcbiAgICB0eXBlIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgdHlwZSBDb21waWxlT3B0aW9ucyBhcyBwMnJDb21waWxlT3B0aW9ucyxcbiAgICB0eXBlIFBhcmFtRGF0YSBhcyBwMnJQYXJhbURhdGEsXG4gICAgdHlwZSBQYXRoRnVuY3Rpb24gYXMgcDJyUGF0aEZ1bmN0aW9uLFxuICAgIHR5cGUgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgdHlwZSBNYXRjaCBhcyBwMnJNYXRjaCxcbiAgICB0eXBlIE1hdGNoRnVuY3Rpb24gYXMgcDJyTWF0Y2hGdW5jdGlvbixcbiAgICB0eXBlIEtleSBhcyBwMnJLZXksXG4gICAgdHlwZSBUb2tlbiBhcyBwMnJUb2tlbixcbiAgICB0eXBlIFBhdGggYXMgcDJyUGF0aCxcbiAgICBUb2tlbkRhdGEgYXMgcDJyVG9rZW5EYXRhLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgRW5jb2RlID0gcDJyRW5jb2RlO1xuICAgIGV4cG9ydCB0eXBlIERlY29kZSA9IHAyckRlY29kZTtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyA9IHAyclBhdGhUb1JlZ2V4cE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hPcHRpb25zID0gcDJyTWF0Y2hPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIENvbXBpbGVPcHRpb25zID0gcDJyQ29tcGlsZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5EYXRhID0gcDJyVG9rZW5EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IHAyclBhcmFtRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJQYXRoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaFJlc3VsdDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xufVxuXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBUb2tlbkRhdGE6IHAyclRva2VuRGF0YSxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHN0cmluZ2lmeSxcbiAgICBwYXRoVG9SZWdleHAsXG59O1xuXG5leHBvcnQgeyBwYXRoMnJlZ2V4cCB9O1xuIl0sIm5hbWVzIjpbInAyclRva2VuRGF0YSIsInBhcnNlIiwiY29tcGlsZSIsIm1hdGNoIiwic3RyaW5naWZ5IiwicGF0aFRvUmVnZXhwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQW9SQSxDQUFBLElBQUEsQ0FBQSxLQTZDQyxHQUFBLEtBQUE7SUFLRCxDQUFBLElBQUEsQ0FBQSxPQWdCQyxHQUFBLE9BQUE7SUFnSEQsQ0FBQSxJQUFBLENBQUEsS0ErQkMsR0FBQSxLQUFBO0lBRUQsQ0FBQSxJQUFBLENBQUEsWUErQkMsR0FBQSxZQUFBO0lBc0ZELENBQUEsSUFBQSxDQUFBLFNBaUJDLEdBQUEsU0FBQTtLQTdtQkQsTUFBTSxpQkFBaUIsR0FBRyxHQUFHO0lBQzdCLENBQUEsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEtBQUssS0FBSztLQUMzQyxNQUFNLFFBQVEsR0FBRyxxQkFBcUI7S0FDdEMsTUFBTSxXQUFXLEdBQUcsbUNBQW1DO0tBQ3ZELE1BQU0sU0FBUyxHQUFHLG1DQUFtQztJQWtGckQsQ0FBQSxNQUFNLGFBQWEsR0FBOEI7O1NBRS9DLEdBQUcsRUFBRSxHQUFHO1NBQ1IsR0FBRyxFQUFFLEdBQUc7O1NBRVIsR0FBRyxFQUFFLEdBQUc7U0FDUixHQUFHLEVBQUUsR0FBRztTQUNSLEdBQUcsRUFBRSxHQUFHO1NBQ1IsR0FBRyxFQUFFLEdBQUc7U0FDUixHQUFHLEVBQUUsR0FBRztTQUNSLEdBQUcsRUFBRSxHQUFHO1NBQ1IsR0FBRyxFQUFFLEdBQUc7TUFDVDtJQUVE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QUMscUJBQXFCLEtBQUssQ0FBQSxDQUFFLENBQUM7VUFDbEQ7Y0FDQSxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ2I7S0FFQSxTQUFTLFVBQVUsQ0FBQyxJQUFZLEVBQUE7U0FDOUIsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUk7SUFDN0IsS0FBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7SUFBRSxTQUFBLE9BQU8sS0FBSztJQUN2QyxLQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JEO0tBRUEsU0FBUyxjQUFjLENBQUMsS0FBd0IsRUFBQTtTQUM5QyxJQUFJLENBQUEsS0FBSyxLQUFMLElBQUEsSUFBQSxLQUFLLHVCQUFMLEtBQUssQ0FBRSxJQUFJLE1BQUssTUFBTTtJQUFFLFNBQUEsT0FBTyxJQUFJO0lBQ3ZDLEtBQUEsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQzs7Ozs7OztJQ3huQkE7O0lBRUc7QUEyQ0gsVUFBTSxXQUFXLEdBQUc7SUFDaEIsSUFBQSxTQUFTLEVBQUVBLHFCQUFZO2VBQ3ZCQyxpQkFBSztpQkFDTEMsbUJBQU87ZUFDUEMsaUJBQUs7bUJBQ0xDLHFCQUFTO3NCQUNUQyx3QkFBWTs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9