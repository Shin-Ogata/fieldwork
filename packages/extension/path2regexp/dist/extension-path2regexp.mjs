/*!
 * @cdp/extension-path2regexp 0.9.18
 *   extension for conversion path to regexp library
 */

var dist = {};

Object.defineProperty(dist, "__esModule", { value: true });
var pathToRegexp_1 = dist.pathToRegexp = match_1 = dist.match = compile_1 = dist.compile = parse_1 = dist.parse = dist.TokenData = void 0;
const DEFAULT_DELIMITER = "/";
const NOOP_VALUE = (value) => value;
const ID_CHAR = /^\p{XID_Continue}$/u;
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
        throw new TypeError(`Unexpected ${nextType} at ${index}, expected ${type}: https://git.new/pathToRegexpError`);
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
        return (this.tryConsume("?") || this.tryConsume("*") || this.tryConsume("+") || "");
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
    const { delimiter = DEFAULT_DELIMITER, encodePath = NOOP_VALUE } = options;
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
                throw new TypeError(`Unexpected * at ${next.index}, you probably want \`/*\` or \`{/:foo}*\`: https://git.new/pathToRegexpError`);
            }
            continue;
        }
        const asterisk = it.tryConsume("*");
        if (asterisk) {
            tokens.push({
                name: String(key++),
                pattern: `[^${escape(delimiter)}]*`,
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
            const separator = it.tryConsume(";") ? it.text() : prefix + suffix;
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
var parse_1 = dist.parse = parse;
/**
 * Compile a string to a template function for the path.
 */
function compile(path, options = {}) {
    const data = path instanceof TokenData ? path : parse(path, options);
    return compileTokens(data, options);
}
var compile_1 = dist.compile = compile;
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
    const { prefix = "", suffix = "", separator = "" } = token;
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
    const { encode = encodeURIComponent, loose = true, validate = true, } = options;
    const reFlags = flags(options);
    const stringify = toStringify(loose, data.delimiter);
    const keyToRegexp = toKeyRegexp(stringify, data.delimiter);
    // Compile all the tokens into regexps.
    const encoders = data.tokens.map((token) => {
        const fn = tokenToFunction(token, encode);
        if (!validate || typeof token === "string")
            return fn;
        const pattern = keyToRegexp(token);
        const validRe = new RegExp(`^${pattern}$`, reFlags);
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
            const re = new RegExp(stringify(key.separator || ""), "g");
            return (value) => value.split(re).map(decode);
        }
        return decode || NOOP_VALUE;
    });
    return function match(pathname) {
        const m = re.exec(pathname);
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
var match_1 = dist.match = match;
/**
 * Escape a regular expression string.
 */
function escape(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
/**
 * Escape and repeat loose characters for regular expressions.
 */
function looseReplacer(value, loose) {
    return loose ? `${escape(value)}+` : escape(value);
}
/**
 * Encode all non-delimiter characters using the encode function.
 */
function toStringify(loose, delimiter) {
    if (!loose)
        return escape;
    const re = new RegExp(`[^${escape(delimiter)}]+|(.)`, "g");
    return (value) => value.replace(re, looseReplacer);
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
    return options.sensitive ? "" : "i";
}
/**
 * Expose a function for taking tokens and returning a RegExp.
 */
function tokensToRegexp(data, keys, options) {
    const { trailing = true, start = true, end = true, loose = true } = options;
    const stringify = toStringify(loose, data.delimiter);
    const keyToRegexp = toKeyRegexp(stringify, data.delimiter);
    let pattern = start ? "^" : "";
    for (const token of data.tokens) {
        if (typeof token === "string") {
            pattern += stringify(token);
        }
        else {
            if (token.name)
                keys.push(token);
            pattern += keyToRegexp(token);
        }
    }
    if (trailing)
        pattern += `(?:${stringify(data.delimiter)})?`;
    pattern += end ? "$" : `(?=${escape(data.delimiter)}|$)`;
    return new RegExp(pattern, flags(options));
}
/**
 * Convert a token into a regexp string (re-used for path validation).
 */
function toKeyRegexp(stringify, delimiter) {
    const segmentPattern = `[^${escape(delimiter)}]+?`;
    return (key) => {
        const prefix = key.prefix ? stringify(key.prefix) : "";
        const suffix = key.suffix ? stringify(key.suffix) : "";
        const modifier = key.modifier || "";
        if (key.name) {
            const pattern = key.pattern || segmentPattern;
            if (key.modifier === "+" || key.modifier === "*") {
                const mod = key.modifier === "*" ? "?" : "";
                const split = key.separator ? stringify(key.separator) : "";
                return `(?:${prefix}((?:${pattern})(?:${split}(?:${pattern}))*)${suffix})${mod}`;
            }
            return `(?:${prefix}(${pattern})${suffix})${modifier}`;
        }
        return `(?:${prefix}${suffix})${modifier}`;
    };
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
pathToRegexp_1 = dist.pathToRegexp = pathToRegexp;

/* eslint-disable
    @typescript-eslint/no-namespace,
 */
const path2regexp = {
    parse: parse_1,
    compile: compile_1,
    match: match_1,
    pathToRegexp: pathToRegexp_1,
};

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9DSEFSID0gL15cXHB7WElEX0NvbnRpbnVlfSQvdTtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogU2V0IHRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3IgcmVwZWF0IHBhcmFtZXRlcnMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQgaW50byBwYXRoLlxuICAgKi9cbiAgZW5jb2RlUGF0aD86IEVuY29kZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXRoVG9SZWdleHBPcHRpb25zIGV4dGVuZHMgUGFyc2VPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogQWxsb3cgZGVsaW1pdGVyIHRvIGJlIGFyYml0cmFyaWx5IHJlcGVhdGVkLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgbG9vc2U/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3aWxsIG1hdGNoIHRvIHRoZSBlbmQgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuZD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdpbGwgbWF0Y2ggZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmcuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBzdGFydD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIGFsbG93cyBhbiBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIGV4dGVuZHMgUGFyc2VPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSB2YWxpZGF0aW9uIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFsbG93IGRlbGltaXRlciB0byBiZSBhcmJpdHJhcmlseSByZXBlYXRlZC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGxvb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYGZhbHNlYCB0aGUgZnVuY3Rpb24gY2FuIHByb2R1Y2UgYW4gaW52YWxpZCAodW5tYXRjaGVkKSBwYXRoLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgdmFsaWRhdGU/OiBib29sZWFuO1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dCBpbnRvIHRoZSBwYXRoLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZW5jb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGVuY29kZT86IEVuY29kZSB8IGZhbHNlO1xufVxuXG50eXBlIFRva2VuVHlwZSA9XG4gIHwgXCJ7XCJcbiAgfCBcIn1cIlxuICB8IFwiKlwiXG4gIHwgXCIrXCJcbiAgfCBcIj9cIlxuICB8IFwiTkFNRVwiXG4gIHwgXCJQQVRURVJOXCJcbiAgfCBcIkNIQVJcIlxuICB8IFwiRVNDQVBFRFwiXG4gIHwgXCJFTkRcIlxuICAvLyBSZXNlcnZlZCBmb3IgdXNlLlxuICB8IFwiIVwiXG4gIHwgXCJAXCJcbiAgfCBcIixcIlxuICB8IFwiO1wiO1xuXG4vKipcbiAqIFRva2VuaXplciByZXN1bHRzLlxuICovXG5pbnRlcmZhY2UgTGV4VG9rZW4ge1xuICB0eXBlOiBUb2tlblR5cGU7XG4gIGluZGV4OiBudW1iZXI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmNvbnN0IFNJTVBMRV9UT0tFTlM6IFJlY29yZDxzdHJpbmcsIFRva2VuVHlwZT4gPSB7XG4gIFwiIVwiOiBcIiFcIixcbiAgXCJAXCI6IFwiQFwiLFxuICBcIjtcIjogXCI7XCIsXG4gIFwiLFwiOiBcIixcIixcbiAgXCIqXCI6IFwiKlwiLFxuICBcIitcIjogXCIrXCIsXG4gIFwiP1wiOiBcIj9cIixcbiAgXCJ7XCI6IFwie1wiLFxuICBcIn1cIjogXCJ9XCIsXG59O1xuXG4vKipcbiAqIFRva2VuaXplIGlucHV0IHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gbGV4ZXIoc3RyOiBzdHJpbmcpIHtcbiAgY29uc3QgY2hhcnMgPSBbLi4uc3RyXTtcbiAgY29uc3QgdG9rZW5zOiBMZXhUb2tlbltdID0gW107XG4gIGxldCBpID0gMDtcblxuICB3aGlsZSAoaSA8IGNoYXJzLmxlbmd0aCkge1xuICAgIGNvbnN0IHZhbHVlID0gY2hhcnNbaV07XG4gICAgY29uc3QgdHlwZSA9IFNJTVBMRV9UT0tFTlNbdmFsdWVdO1xuXG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZSwgaW5kZXg6IGkrKywgdmFsdWUgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgPT09IFwiXFxcXFwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiRVNDQVBFRFwiLCBpbmRleDogaSsrLCB2YWx1ZTogY2hhcnNbaSsrXSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gXCI6XCIpIHtcbiAgICAgIGxldCBuYW1lID0gXCJcIjtcblxuICAgICAgd2hpbGUgKElEX0NIQVIudGVzdChjaGFyc1srK2ldKSkge1xuICAgICAgICBuYW1lICs9IGNoYXJzW2ldO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXJhbWV0ZXIgbmFtZSBhdCAke2l9YCk7XG4gICAgICB9XG5cbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJOQU1FXCIsIGluZGV4OiBpLCB2YWx1ZTogbmFtZSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gXCIoXCIpIHtcbiAgICAgIGNvbnN0IHBvcyA9IGkrKztcbiAgICAgIGxldCBjb3VudCA9IDE7XG4gICAgICBsZXQgcGF0dGVybiA9IFwiXCI7XG5cbiAgICAgIGlmIChjaGFyc1tpXSA9PT0gXCI/XCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgUGF0dGVybiBjYW5ub3Qgc3RhcnQgd2l0aCBcIj9cIiBhdCAke2l9YCk7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChpIDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgIGlmIChjaGFyc1tpXSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICBwYXR0ZXJuICs9IGNoYXJzW2krK10gKyBjaGFyc1tpKytdO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYXJzW2ldID09PSBcIilcIikge1xuICAgICAgICAgIGNvdW50LS07XG4gICAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhcnNbaV0gPT09IFwiKFwiKSB7XG4gICAgICAgICAgY291bnQrKztcbiAgICAgICAgICBpZiAoY2hhcnNbaSArIDFdICE9PSBcIj9cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgQ2FwdHVyaW5nIGdyb3VwcyBhcmUgbm90IGFsbG93ZWQgYXQgJHtpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBhdHRlcm4gKz0gY2hhcnNbaSsrXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvdW50KSB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmJhbGFuY2VkIHBhdHRlcm4gYXQgJHtwb3N9YCk7XG4gICAgICBpZiAoIXBhdHRlcm4pIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGF0dGVybiBhdCAke3Bvc31gKTtcblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIlBBVFRFUk5cIiwgaW5kZXg6IGksIHZhbHVlOiBwYXR0ZXJuIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkNIQVJcIiwgaW5kZXg6IGksIHZhbHVlOiBjaGFyc1tpKytdIH0pO1xuICB9XG5cbiAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVORFwiLCBpbmRleDogaSwgdmFsdWU6IFwiXCIgfSk7XG5cbiAgcmV0dXJuIG5ldyBJdGVyKHRva2Vucyk7XG59XG5cbmNsYXNzIEl0ZXIge1xuICBpbmRleCA9IDA7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB0b2tlbnM6IExleFRva2VuW10pIHt9XG5cbiAgcGVlaygpOiBMZXhUb2tlbiB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMuaW5kZXhdO1xuICB9XG5cbiAgdHJ5Q29uc3VtZSh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHRva2VuID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKHRva2VuLnR5cGUgIT09IHR5cGUpIHJldHVybjtcbiAgICB0aGlzLmluZGV4Kys7XG4gICAgcmV0dXJuIHRva2VuLnZhbHVlO1xuICB9XG5cbiAgY29uc3VtZSh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhbHVlID0gdGhpcy50cnlDb25zdW1lKHR5cGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsdWU7XG4gICAgY29uc3QgeyB0eXBlOiBuZXh0VHlwZSwgaW5kZXggfSA9IHRoaXMucGVlaygpO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgVW5leHBlY3RlZCAke25leHRUeXBlfSBhdCAke2luZGV4fSwgZXhwZWN0ZWQgJHt0eXBlfTogaHR0cHM6Ly9naXQubmV3L3BhdGhUb1JlZ2V4cEVycm9yYCxcbiAgICApO1xuICB9XG5cbiAgdGV4dCgpOiBzdHJpbmcge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICgodmFsdWUgPSB0aGlzLnRyeUNvbnN1bWUoXCJDSEFSXCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIkVTQ0FQRURcIikpKSB7XG4gICAgICByZXN1bHQgKz0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBtb2RpZmllcigpOiBzdHJpbmcge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzLnRyeUNvbnN1bWUoXCI/XCIpIHx8IHRoaXMudHJ5Q29uc3VtZShcIipcIikgfHwgdGhpcy50cnlDb25zdW1lKFwiK1wiKSB8fCBcIlwiXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIFRva2VuaXplZCBwYXRoIGluc3RhbmNlLiBDYW4gd2UgcGFzc2VkIGFyb3VuZCBpbnN0ZWFkIG9mIHN0cmluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRva2VuRGF0YSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSB0b2tlbnM6IFRva2VuW10sXG4gICAgcHVibGljIHJlYWRvbmx5IGRlbGltaXRlcjogc3RyaW5nLFxuICApIHt9XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5EYXRhIHtcbiAgY29uc3QgeyBkZWxpbWl0ZXIgPSBERUZBVUxUX0RFTElNSVRFUiwgZW5jb2RlUGF0aCA9IE5PT1BfVkFMVUUgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHRva2VuczogVG9rZW5bXSA9IFtdO1xuICBjb25zdCBpdCA9IGxleGVyKHN0cik7XG4gIGxldCBrZXkgPSAwO1xuXG4gIGRvIHtcbiAgICBjb25zdCBwYXRoID0gaXQudGV4dCgpO1xuICAgIGlmIChwYXRoKSB0b2tlbnMucHVzaChlbmNvZGVQYXRoKHBhdGgpKTtcblxuICAgIGNvbnN0IG5hbWUgPSBpdC50cnlDb25zdW1lKFwiTkFNRVwiKTtcbiAgICBjb25zdCBwYXR0ZXJuID0gaXQudHJ5Q29uc3VtZShcIlBBVFRFUk5cIik7XG5cbiAgICBpZiAobmFtZSB8fCBwYXR0ZXJuKSB7XG4gICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgIG5hbWU6IG5hbWUgfHwgU3RyaW5nKGtleSsrKSxcbiAgICAgICAgcGF0dGVybixcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBuZXh0ID0gaXQucGVlaygpO1xuICAgICAgaWYgKG5leHQudHlwZSA9PT0gXCIqXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBgVW5leHBlY3RlZCAqIGF0ICR7bmV4dC5pbmRleH0sIHlvdSBwcm9iYWJseSB3YW50IFxcYC8qXFxgIG9yIFxcYHsvOmZvb30qXFxgOiBodHRwczovL2dpdC5uZXcvcGF0aFRvUmVnZXhwRXJyb3JgLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBhc3RlcmlzayA9IGl0LnRyeUNvbnN1bWUoXCIqXCIpO1xuICAgIGlmIChhc3Rlcmlzaykge1xuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICBuYW1lOiBTdHJpbmcoa2V5KyspLFxuICAgICAgICBwYXR0ZXJuOiBgW14ke2VzY2FwZShkZWxpbWl0ZXIpfV0qYCxcbiAgICAgICAgbW9kaWZpZXI6IFwiKlwiLFxuICAgICAgICBzZXBhcmF0b3I6IGRlbGltaXRlcixcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BlbiA9IGl0LnRyeUNvbnN1bWUoXCJ7XCIpO1xuICAgIGlmIChvcGVuKSB7XG4gICAgICBjb25zdCBwcmVmaXggPSBpdC50ZXh0KCk7XG4gICAgICBjb25zdCBuYW1lID0gaXQudHJ5Q29uc3VtZShcIk5BTUVcIik7XG4gICAgICBjb25zdCBwYXR0ZXJuID0gaXQudHJ5Q29uc3VtZShcIlBBVFRFUk5cIik7XG4gICAgICBjb25zdCBzdWZmaXggPSBpdC50ZXh0KCk7XG4gICAgICBjb25zdCBzZXBhcmF0b3IgPSBpdC50cnlDb25zdW1lKFwiO1wiKSA/IGl0LnRleHQoKSA6IHByZWZpeCArIHN1ZmZpeDtcblxuICAgICAgaXQuY29uc3VtZShcIn1cIik7XG5cbiAgICAgIGNvbnN0IG1vZGlmaWVyID0gaXQubW9kaWZpZXIoKTtcblxuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lIHx8IChwYXR0ZXJuID8gU3RyaW5nKGtleSsrKSA6IFwiXCIpLFxuICAgICAgICBwcmVmaXg6IGVuY29kZVBhdGgocHJlZml4KSxcbiAgICAgICAgc3VmZml4OiBlbmNvZGVQYXRoKHN1ZmZpeCksXG4gICAgICAgIHBhdHRlcm4sXG4gICAgICAgIG1vZGlmaWVyLFxuICAgICAgICBzZXBhcmF0b3IsXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGl0LmNvbnN1bWUoXCJFTkRcIik7XG4gICAgYnJlYWs7XG4gIH0gd2hpbGUgKHRydWUpO1xuXG4gIHJldHVybiBuZXcgVG9rZW5EYXRhKHRva2VucywgZGVsaW1pdGVyKTtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgcGF0aDogUGF0aCxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgcmV0dXJuIGNvbXBpbGVUb2tlbnM8UD4oZGF0YSwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IFBhcnRpYWw8UmVjb3JkPHN0cmluZywgc3RyaW5nIHwgc3RyaW5nW10+PjtcbmV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChkYXRhPzogUCkgPT4gc3RyaW5nO1xuXG4vKipcbiAqIENvbnZlcnQgYSBzaW5nbGUgdG9rZW4gaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRva2VuVG9GdW5jdGlvbihcbiAgdG9rZW46IFRva2VuLFxuICBlbmNvZGU6IEVuY29kZSB8IGZhbHNlLFxuKTogKGRhdGE6IFBhcmFtRGF0YSkgPT4gc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiAoKSA9PiB0b2tlbjtcbiAgfVxuXG4gIGNvbnN0IGVuY29kZVZhbHVlID0gZW5jb2RlIHx8IE5PT1BfVkFMVUU7XG4gIGNvbnN0IHJlcGVhdGVkID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIjtcbiAgY29uc3Qgb3B0aW9uYWwgPSB0b2tlbi5tb2RpZmllciA9PT0gXCI/XCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiO1xuICBjb25zdCB7IHByZWZpeCA9IFwiXCIsIHN1ZmZpeCA9IFwiXCIsIHNlcGFyYXRvciA9IFwiXCIgfSA9IHRva2VuO1xuXG4gIGlmIChlbmNvZGUgJiYgcmVwZWF0ZWQpIHtcbiAgICBjb25zdCBzdHJpbmdpZnkgPSAodmFsdWU6IHN0cmluZywgaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX0vJHtpbmRleH1cIiB0byBiZSBhIHN0cmluZ2ApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGVuY29kZVZhbHVlKHZhbHVlKTtcbiAgICB9O1xuXG4gICAgY29uc3QgY29tcGlsZSA9ICh2YWx1ZTogdW5rbm93bikgPT4ge1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSBhbiBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSByZXR1cm4gXCJcIjtcblxuICAgICAgcmV0dXJuIHByZWZpeCArIHZhbHVlLm1hcChzdHJpbmdpZnkpLmpvaW4oc2VwYXJhdG9yKSArIHN1ZmZpeDtcbiAgICB9O1xuXG4gICAgaWYgKG9wdGlvbmFsKSB7XG4gICAgICByZXR1cm4gKGRhdGEpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV07XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmxlbmd0aCA/IGNvbXBpbGUodmFsdWUpIDogXCJcIjtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIChkYXRhKTogc3RyaW5nID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVt0b2tlbi5uYW1lXTtcbiAgICAgIHJldHVybiBjb21waWxlKHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgY29uc3Qgc3RyaW5naWZ5ID0gKHZhbHVlOiB1bmtub3duKSA9PiB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgcmV0dXJuIHByZWZpeCArIGVuY29kZVZhbHVlKHZhbHVlKSArIHN1ZmZpeDtcbiAgfTtcblxuICBpZiAob3B0aW9uYWwpIHtcbiAgICByZXR1cm4gKGRhdGEpOiBzdHJpbmcgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgICAgcmV0dXJuIHN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiAoZGF0YSk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgIHJldHVybiBzdHJpbmdpZnkodmFsdWUpO1xuICB9O1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSB0b2tlbnMgaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGVUb2tlbnM8UCBleHRlbmRzIFBhcmFtRGF0YT4oXG4gIGRhdGE6IFRva2VuRGF0YSxcbiAgb3B0aW9uczogQ29tcGlsZU9wdGlvbnMsXG4pOiBQYXRoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7XG4gICAgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50LFxuICAgIGxvb3NlID0gdHJ1ZSxcbiAgICB2YWxpZGF0ZSA9IHRydWUsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCByZUZsYWdzID0gZmxhZ3Mob3B0aW9ucyk7XG4gIGNvbnN0IHN0cmluZ2lmeSA9IHRvU3RyaW5naWZ5KGxvb3NlLCBkYXRhLmRlbGltaXRlcik7XG4gIGNvbnN0IGtleVRvUmVnZXhwID0gdG9LZXlSZWdleHAoc3RyaW5naWZ5LCBkYXRhLmRlbGltaXRlcik7XG5cbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHRva2VucyBpbnRvIHJlZ2V4cHMuXG4gIGNvbnN0IGVuY29kZXJzOiBBcnJheTwoZGF0YTogUGFyYW1EYXRhKSA9PiBzdHJpbmc+ID0gZGF0YS50b2tlbnMubWFwKFxuICAgICh0b2tlbikgPT4ge1xuICAgICAgY29uc3QgZm4gPSB0b2tlblRvRnVuY3Rpb24odG9rZW4sIGVuY29kZSk7XG4gICAgICBpZiAoIXZhbGlkYXRlIHx8IHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIGZuO1xuXG4gICAgICBjb25zdCBwYXR0ZXJuID0ga2V5VG9SZWdleHAodG9rZW4pO1xuICAgICAgY29uc3QgdmFsaWRSZSA9IG5ldyBSZWdFeHAoYF4ke3BhdHRlcm59JGAsIHJlRmxhZ3MpO1xuXG4gICAgICByZXR1cm4gKGRhdGEpID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBmbihkYXRhKTtcbiAgICAgICAgaWYgKCF2YWxpZFJlLnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIGBJbnZhbGlkIHZhbHVlIGZvciBcIiR7dG9rZW4ubmFtZX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH07XG4gICAgfSxcbiAgKTtcblxuICByZXR1cm4gZnVuY3Rpb24gcGF0aChkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge30pIHtcbiAgICBsZXQgcGF0aCA9IFwiXCI7XG4gICAgZm9yIChjb25zdCBlbmNvZGVyIG9mIGVuY29kZXJzKSBwYXRoICs9IGVuY29kZXIoZGF0YSk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgUGFyYW1EYXRhPiB7XG4gIHBhdGg6IHN0cmluZztcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSAocGF0aDogc3RyaW5nKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBDcmVhdGUgcGF0aCBtYXRjaCBmdW5jdGlvbiBmcm9tIGBwYXRoLXRvLXJlZ2V4cGAgc3BlYy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgbG9vc2UgPSB0cnVlIH0gPSBvcHRpb25zO1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3Qgc3RyaW5naWZ5ID0gdG9TdHJpbmdpZnkobG9vc2UsIGRhdGEuZGVsaW1pdGVyKTtcbiAgY29uc3Qga2V5czogS2V5W10gPSBbXTtcbiAgY29uc3QgcmUgPSB0b2tlbnNUb1JlZ2V4cChkYXRhLCBrZXlzLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlICYmIChrZXkubW9kaWZpZXIgPT09IFwiK1wiIHx8IGtleS5tb2RpZmllciA9PT0gXCIqXCIpKSB7XG4gICAgICBjb25zdCByZSA9IG5ldyBSZWdFeHAoc3RyaW5naWZ5KGtleS5zZXBhcmF0b3IgfHwgXCJcIiksIFwiZ1wiKTtcbiAgICAgIHJldHVybiAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUuc3BsaXQocmUpLm1hcChkZWNvZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWNvZGUgfHwgTk9PUF9WQUxVRTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG1hdGNoKHBhdGhuYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtID0gcmUuZXhlYyhwYXRobmFtZSk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB7IDA6IHBhdGgsIGluZGV4IH0gPSBtO1xuICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtW2ldID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIGNvbnN0IGRlY29kZXIgPSBkZWNvZGVyc1tpIC0gMV07XG4gICAgICBwYXJhbXNba2V5Lm5hbWVdID0gZGVjb2RlcihtW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXRoLCBpbmRleCwgcGFyYW1zIH07XG4gIH07XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFsuKyo/PV4hOiR7fSgpW1xcXXwvXFxcXF0pL2csIFwiXFxcXCQxXCIpO1xufVxuXG4vKipcbiAqIEVzY2FwZSBhbmQgcmVwZWF0IGxvb3NlIGNoYXJhY3RlcnMgZm9yIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG4gKi9cbmZ1bmN0aW9uIGxvb3NlUmVwbGFjZXIodmFsdWU6IHN0cmluZywgbG9vc2U6IHN0cmluZykge1xuICByZXR1cm4gbG9vc2UgPyBgJHtlc2NhcGUodmFsdWUpfStgIDogZXNjYXBlKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBFbmNvZGUgYWxsIG5vbi1kZWxpbWl0ZXIgY2hhcmFjdGVycyB1c2luZyB0aGUgZW5jb2RlIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b1N0cmluZ2lmeShsb29zZTogYm9vbGVhbiwgZGVsaW1pdGVyOiBzdHJpbmcpIHtcbiAgaWYgKCFsb29zZSkgcmV0dXJuIGVzY2FwZTtcblxuICBjb25zdCByZSA9IG5ldyBSZWdFeHAoYFteJHtlc2NhcGUoZGVsaW1pdGVyKX1dK3woLilgLCBcImdcIik7XG4gIHJldHVybiAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUucmVwbGFjZShyZSwgbG9vc2VSZXBsYWNlcik7XG59XG5cbi8qKlxuICogR2V0IHRoZSBmbGFncyBmb3IgYSByZWdleHAgZnJvbSB0aGUgb3B0aW9ucy5cbiAqL1xuZnVuY3Rpb24gZmxhZ3Mob3B0aW9uczogeyBzZW5zaXRpdmU/OiBib29sZWFuIH0pIHtcbiAgcmV0dXJuIG9wdGlvbnMuc2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiO1xufVxuXG4vKipcbiAqIEEga2V5IGlzIGEgY2FwdHVyZSBncm91cCBpbiB0aGUgcmVnZXguXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgS2V5IHtcbiAgbmFtZTogc3RyaW5nO1xuICBwcmVmaXg/OiBzdHJpbmc7XG4gIHN1ZmZpeD86IHN0cmluZztcbiAgcGF0dGVybj86IHN0cmluZztcbiAgbW9kaWZpZXI/OiBzdHJpbmc7XG4gIHNlcGFyYXRvcj86IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHRva2VuIGlzIGEgc3RyaW5nIChub3RoaW5nIHNwZWNpYWwpIG9yIGtleSBtZXRhZGF0YSAoY2FwdHVyZSBncm91cCkuXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gc3RyaW5nIHwgS2V5O1xuXG4vKipcbiAqIEV4cG9zZSBhIGZ1bmN0aW9uIGZvciB0YWtpbmcgdG9rZW5zIGFuZCByZXR1cm5pbmcgYSBSZWdFeHAuXG4gKi9cbmZ1bmN0aW9uIHRva2Vuc1RvUmVnZXhwKFxuICBkYXRhOiBUb2tlbkRhdGEsXG4gIGtleXM6IEtleVtdLFxuICBvcHRpb25zOiBQYXRoVG9SZWdleHBPcHRpb25zLFxuKTogUmVnRXhwIHtcbiAgY29uc3QgeyB0cmFpbGluZyA9IHRydWUsIHN0YXJ0ID0gdHJ1ZSwgZW5kID0gdHJ1ZSwgbG9vc2UgPSB0cnVlIH0gPSBvcHRpb25zO1xuICBjb25zdCBzdHJpbmdpZnkgPSB0b1N0cmluZ2lmeShsb29zZSwgZGF0YS5kZWxpbWl0ZXIpO1xuICBjb25zdCBrZXlUb1JlZ2V4cCA9IHRvS2V5UmVnZXhwKHN0cmluZ2lmeSwgZGF0YS5kZWxpbWl0ZXIpO1xuICBsZXQgcGF0dGVybiA9IHN0YXJ0ID8gXCJeXCIgOiBcIlwiO1xuXG4gIGZvciAoY29uc3QgdG9rZW4gb2YgZGF0YS50b2tlbnMpIHtcbiAgICBpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBwYXR0ZXJuICs9IHN0cmluZ2lmeSh0b2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0b2tlbi5uYW1lKSBrZXlzLnB1c2godG9rZW4pO1xuICAgICAgcGF0dGVybiArPSBrZXlUb1JlZ2V4cCh0b2tlbik7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRyYWlsaW5nKSBwYXR0ZXJuICs9IGAoPzoke3N0cmluZ2lmeShkYXRhLmRlbGltaXRlcil9KT9gO1xuICBwYXR0ZXJuICs9IGVuZCA/IFwiJFwiIDogYCg/PSR7ZXNjYXBlKGRhdGEuZGVsaW1pdGVyKX18JClgO1xuXG4gIHJldHVybiBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgdG9rZW4gaW50byBhIHJlZ2V4cCBzdHJpbmcgKHJlLXVzZWQgZm9yIHBhdGggdmFsaWRhdGlvbikuXG4gKi9cbmZ1bmN0aW9uIHRvS2V5UmVnZXhwKHN0cmluZ2lmeTogRW5jb2RlLCBkZWxpbWl0ZXI6IHN0cmluZykge1xuICBjb25zdCBzZWdtZW50UGF0dGVybiA9IGBbXiR7ZXNjYXBlKGRlbGltaXRlcil9XSs/YDtcblxuICByZXR1cm4gKGtleTogS2V5KSA9PiB7XG4gICAgY29uc3QgcHJlZml4ID0ga2V5LnByZWZpeCA/IHN0cmluZ2lmeShrZXkucHJlZml4KSA6IFwiXCI7XG4gICAgY29uc3Qgc3VmZml4ID0ga2V5LnN1ZmZpeCA/IHN0cmluZ2lmeShrZXkuc3VmZml4KSA6IFwiXCI7XG4gICAgY29uc3QgbW9kaWZpZXIgPSBrZXkubW9kaWZpZXIgfHwgXCJcIjtcblxuICAgIGlmIChrZXkubmFtZSkge1xuICAgICAgY29uc3QgcGF0dGVybiA9IGtleS5wYXR0ZXJuIHx8IHNlZ21lbnRQYXR0ZXJuO1xuICAgICAgaWYgKGtleS5tb2RpZmllciA9PT0gXCIrXCIgfHwga2V5Lm1vZGlmaWVyID09PSBcIipcIikge1xuICAgICAgICBjb25zdCBtb2QgPSBrZXkubW9kaWZpZXIgPT09IFwiKlwiID8gXCI/XCIgOiBcIlwiO1xuICAgICAgICBjb25zdCBzcGxpdCA9IGtleS5zZXBhcmF0b3IgPyBzdHJpbmdpZnkoa2V5LnNlcGFyYXRvcikgOiBcIlwiO1xuICAgICAgICByZXR1cm4gYCg/OiR7cHJlZml4fSgoPzoke3BhdHRlcm59KSg/OiR7c3BsaXR9KD86JHtwYXR0ZXJufSkpKikke3N1ZmZpeH0pJHttb2R9YDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBgKD86JHtwcmVmaXh9KCR7cGF0dGVybn0pJHtzdWZmaXh9KSR7bW9kaWZpZXJ9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gYCg/OiR7cHJlZml4fSR7c3VmZml4fSkke21vZGlmaWVyfWA7XG4gIH07XG59XG5cbi8qKlxuICogUmVwZWF0ZWQgYW5kIHNpbXBsZSBpbnB1dCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuZXhwb3J0IHR5cGUgUGF0aFJlZ0V4cCA9IFJlZ0V4cCAmIHsga2V5czogS2V5W10gfTtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGdpdmVuIHBhdGggc3RyaW5nLCByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKlxuICogQW4gZW1wdHkgYXJyYXkgY2FuIGJlIHBhc3NlZCBpbiBmb3IgdGhlIGtleXMsIHdoaWNoIHdpbGwgaG9sZCB0aGVcbiAqIHBsYWNlaG9sZGVyIGtleSBkZXNjcmlwdGlvbnMuIEZvciBleGFtcGxlLCB1c2luZyBgL3VzZXIvOmlkYCwgYGtleXNgIHdpbGxcbiAqIGNvbnRhaW4gYFt7IG5hbWU6ICdpZCcsIGRlbGltaXRlcjogJy8nLCBvcHRpb25hbDogZmFsc2UsIHJlcGVhdDogZmFsc2UgfV1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUmVnZXhwKHBhdGg6IFBhdGgsIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBkYXRhID0gcGF0aCBpbnN0YW5jZW9mIFRva2VuRGF0YSA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3Qga2V5czogS2V5W10gPSBbXTtcbiAgY29uc3QgcmVnZXhwID0gdG9rZW5zVG9SZWdleHAoZGF0YSwga2V5cywgb3B0aW9ucyk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKHJlZ2V4cCwgeyBrZXlzIH0pO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgRW5jb2RlIGFzIHAyckVuY29kZSxcbiAgICBEZWNvZGUgYXMgcDJyRGVjb2RlLFxuICAgIFBhcnNlT3B0aW9ucyBhcyBwMnJQYXJzZU9wdGlvbnMsXG4gICAgUGF0aFRvUmVnZXhwT3B0aW9ucyBhcyBwMnJQYXRoVG9SZWdleHBPcHRpb25zLFxuICAgIE1hdGNoT3B0aW9ucyBhcyBwMnJNYXRjaE9wdGlvbnMsXG4gICAgQ29tcGlsZU9wdGlvbnMgYXMgcDJyQ29tcGlsZU9wdGlvbnMsXG4gICAgVG9rZW5EYXRhIGFzIHAyclRva2VuRGF0YSxcbiAgICBQYXJhbURhdGEgYXMgcDJyUGFyYW1EYXRhLFxuICAgIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIEtleSBhcyBwMnJLZXksXG4gICAgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgUGF0aCBhcyBwMnJQYXRoLFxuICAgIFBhdGhSZWdFeHAgYXMgcDJyUGF0aFJlZ0V4cCxcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgRW5jb2RlID0gcDJyRW5jb2RlO1xuICAgIGV4cG9ydCB0eXBlIERlY29kZSA9IHAyckRlY29kZTtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyA9IHAyclBhdGhUb1JlZ2V4cE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hPcHRpb25zID0gcDJyTWF0Y2hPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIENvbXBpbGVPcHRpb25zID0gcDJyQ29tcGlsZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5EYXRhID0gcDJyVG9rZW5EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IHAyclBhcmFtRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJQYXRoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaFJlc3VsdDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xuICAgIGV4cG9ydCB0eXBlIFBhdGhSZWdFeHAgPSBwMnJQYXRoUmVnRXhwO1xufVxuXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOlsicGFyc2UiLCJjb21waWxlIiwibWF0Y2giLCJwYXRoVG9SZWdleHAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO0FBQzlCLE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxLQUFLLEtBQUssQ0FBQztBQUM1QyxNQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQztBQWtHdEMsTUFBTSxhQUFhLEdBQThCO0FBQy9DLElBQUEsR0FBRyxFQUFFLEdBQUc7QUFDUixJQUFBLEdBQUcsRUFBRSxHQUFHO0FBQ1IsSUFBQSxHQUFHLEVBQUUsR0FBRztBQUNSLElBQUEsR0FBRyxFQUFFLEdBQUc7QUFDUixJQUFBLEdBQUcsRUFBRSxHQUFHO0FBQ1IsSUFBQSxHQUFHLEVBQUUsR0FBRztBQUNSLElBQUEsR0FBRyxFQUFFLEdBQUc7QUFDUixJQUFBLEdBQUcsRUFBRSxHQUFHO0FBQ1IsSUFBQSxHQUFHLEVBQUUsR0FBRztDQUNULENBQUM7QUFFRjs7QUFFRztBQUNILFNBQVMsS0FBSyxDQUFDLEdBQVcsRUFBQTtBQUN4QixJQUFBLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN2QixNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUM7SUFDOUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBRVYsSUFBQSxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ3ZCLFFBQUEsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLFFBQUEsTUFBTSxJQUFJLEdBQUcsYUFBYSxD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QUM7QUFDSixDQUFDO0FBU0Q7Ozs7OztBQU1HO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVUsRUFBRSxVQUErQixFQUFFLEVBQUE7QUFDeEUsSUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksU0FBUyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JFLE1BQU0sSUFBSSxHQUFVLEVBQUUsQ0FBQztJQUN2QixNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNuRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBTEQsY0FLQyxHQUFBLElBQUEsQ0FBQSxZQUFBLEdBQUEsWUFBQTs7QUNsbkJEOztBQUVHO0FBNENILE1BQU0sV0FBVyxHQUFHO1dBQ2hCQSxPQUFLO2FBQ0xDLFNBQU87V0FDUEMsT0FBSztrQkFDTEMsY0FBWTs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9