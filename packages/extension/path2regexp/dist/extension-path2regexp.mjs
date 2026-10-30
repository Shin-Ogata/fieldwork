/*!
 * @cdp/extension-path2regexp 0.9.22
 *   extension for conversion path to regexp library
 */

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
 * ParseError is thrown when there is an error processing the path.
 */
class PathError extends TypeError {
    originalPath;
    constructor(message, originalPath) {
        super(message +
            (originalPath ? `: ${originalPath}` : "") +
            "; visit https://git.new/pathToRegexpError for info");
        this.originalPath = originalPath;
    }
}
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
            const char = chars[index++];
            if (char === end) {
                writePath();
                return output;
            }
            if (char === "\\") {
                if (index === chars.length) {
                    throw new PathError(`Unexpected end after \\ at index ${index}`, str);
                }
                path += chars[index++];
                continue;
            }
            if (char === ":" || char === "*") {
                const type = char === ":" ? "param" : "wildcard";
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
            if (char === "{") {
                writePath();
                output.push({
                    type: "group",
                    tokens: consumeUntil("}"),
                });
                continue;
            }
            if ("}()[]+?!".includes(char)) {
                throw new PathError(`Unexpected ${char} at index ${index - 1}`, str);
            }
            path += char;
        }
        if (end) {
            throw new PathError(`Unexpected end at index ${index}, expected ${end}`, str);
        }
        writePath();
        return output;
    }
    return {
        tokens: consumeUntil(""),
        originalPath: str,
    };
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
            if (!result) {
                throw new TypeError(`Expected "${token.name}" to be a non-empty array`);
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
        if (typeof value !== "string" || value.length === 0) {
            throw new TypeError(`Expected "${token.name}" to be a non-empty string`);
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
            source += toRegExpSource(tokens, delimiter, keys, data.originalPath, trailing);
            combinations++;
        });
    }
    process(path);
    let pattern = `^(?:${source})`;
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
function toRegExpSource(tokens, delimiter, keys, originalPath, trailing) {
    let result = "";
    let prefix = "";
    let hasWildcardAhead = false;
    let hasSegmentWildcard = false;
    let wildcardBacktrack = "";
    let index = 0;
    function seekWildcard(index) {
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type === "wildcard")
                return true;
        }
        return false;
    }
    function textRemaining(index) {
        let result = "";
        while (index < tokens.length) {
            const token = tokens[index++];
            if (token.type !== "text")
                return result;
            if (token.value.includes(delimiter))
                break;
            result += token.value;
        }
    }
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "text") {
            const value = escape(token.value);
            result += value;
            wildcardBacktrack += value;
            prefix += token.value;
            if (token.value.includes(delimiter))
                hasSegmentWildcard = false;
            continue;
        }
        if (token.type === "param" || token.type === "wildcard") {
            if (result && !prefix) {
                throw new PathError(`Missing text before "${token.name}" ${token.type}`, originalPath);
            }
            keys.push(token);
            if (token.type === "param") {
                if (hasSegmentWildcard) {
                    const value = negate(delimiter, prefix);
                    result += `(${value}+?|${value}*${escape(prefix)})`;
                }
                else {
                    const text = textRemaining(index);
                    if (text) {
                        result += `(?=(${negate(delimiter, "")}+?)${escape(text)})(?:\\${keys.length})`;
                    }
                    else {
                        result += `(${negate(delimiter, "")}+)`;
                    }
                }
            }
            else {
                // If we had a wildcard, close lookahead and reset.
                if (hasWildcardAhead)
                    result += `)${wildcardBacktrack}`;
                hasWildcardAhead = seekWildcard(index);
                // Lock earlier wildcards; leave the last one greedy.
                result += hasWildcardAhead ? "(?=([^]+?)" : "([^]+)";
                hasSegmentWildcard = true;
                wildcardBacktrack = "";
            }
            wildcardBacktrack += `(?:\\${keys.length})`;
            prefix = "";
            continue;
        }
        throw new TypeError(`Unknown token type: ${token.type}`);
    }
    if (trailing && !prefix.endsWith(delimiter)) {
        result += "(?:" + escape(delimiter) + "$)?";
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
 * Stringify token data into a path string.
 */
function stringify(data) {
    const { tokens } = data;
    let index = 0;
    let value = "";
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "text") {
            value += escapeText(token.value);
            continue;
        }
        if (token.type === "group") {
            value += "{" + stringify(token) + "}";
            continue;
        }
        if (token.type === "param") {
            value += ":" + stringifyName(token.name, tokens, index);
            continue;
        }
        if (token.type === "wildcard") {
            value += "*" + stringifyName(token.name, tokens, index);
            continue;
        }
        throw new TypeError(`Unknown token type: ${token.type}`);
    }
    return value;
}
/**
 * Wrap a parameter name in quotes, escaping only the characters the parser
 * treats specially inside a quoted name (`"` and `\`). `JSON.stringify` can't
 * be used here because it emits escapes like `\n` that the parser reads back as
 * the literal character `n`, so names with control characters wouldn't survive
 * a `parse` -> `stringify` -> `parse` round trip.
 */
function quoteName(name) {
    return `"${name.replace(/["\\]/g, "\\$&")}"`;
}
/**
 * Stringify a parameter name, escaping when it cannot be emitted directly.
 */
function stringifyName(name, tokens, index) {
    if (!ID.test(name))
        return quoteName(name);
    while (index < tokens.length) {
        const token = tokens[index++];
        if (token.type === "text") {
            if (!token.value)
                continue;
            // Destructuring reads the first *code point*, matching `parse`, which
            // iterates the path with `[...str]`. Indexing with `[0]` would read only the
            // leading surrogate of an astral character, missing that the parser treats
            // the whole character as `ID_Continue` and absorbs it into the name.
            const [first] = token.value;
            if (ID_CONTINUE.test(first))
                return quoteName(name);
        }
        break;
    }
    return name;
}

/* eslint-disable
    @typescript-eslint/no-namespace,
 */
const path2regexp = {
    PathError: PathError,
    parse,
    compile,
    match,
    stringify,
    pathToRegexp,
};

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgREVGQVVMVF9ERUxJTUlURVIgPSBcIi9cIjtcbmNvbnN0IE5PT1BfVkFMVUUgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWU7XG5jb25zdCBJRF9TVEFSVCA9IC9eWyRfXFxwe0lEX1N0YXJ0fV0kL3U7XG5jb25zdCBJRF9DT05USU5VRSA9IC9eWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dJC91O1xuY29uc3QgSUQgPSAvXlskX1xccHtJRF9TdGFydH1dWyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1dKiQvdTtcblxuLyoqXG4gKiBFbmNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRW5jb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuLyoqXG4gKiBEZWNvZGUgYSBzdHJpbmcgaW50byBhbm90aGVyIHN0cmluZy5cbiAqL1xuZXhwb3J0IHR5cGUgRGVjb2RlID0gKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogQSBmdW5jdGlvbiBmb3IgZW5jb2RpbmcgaW5wdXQgc3RyaW5ncy5cbiAgICovXG4gIGVuY29kZVBhdGg/OiBFbmNvZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBNYXRjaGVzIHRoZSBwYXRoIGNvbXBsZXRlbHkgd2l0aG91dCB0cmFpbGluZyBjaGFyYWN0ZXJzLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5kPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEFsbG93cyBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cmFpbGluZz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBNYXRjaCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBkZWxpbWl0ZXIgZm9yIHNlZ21lbnRzLiAoZGVmYXVsdDogYCcvJ2ApXG4gICAqL1xuICBkZWxpbWl0ZXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hPcHRpb25zIGV4dGVuZHMgUGF0aFRvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLCBvciBgZmFsc2VgIHRvIGRpc2FibGUgZW50aXJlbHkuIChkZWZhdWx0OiBgZGVjb2RlVVJJQ29tcG9uZW50YClcbiAgICovXG4gIGRlY29kZT86IERlY29kZSB8IGZhbHNlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVPcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQgaW50byB0aGUgcGF0aCwgb3IgYGZhbHNlYCB0byBkaXNhYmxlIGVudGlyZWx5LiAoZGVmYXVsdDogYGVuY29kZVVSSUNvbXBvbmVudGApXG4gICAqL1xuICBlbmNvZGU/OiBFbmNvZGUgfCBmYWxzZTtcbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3Igc2VnbWVudHMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbn1cblxuLyoqXG4gKiBFc2NhcGUgdGV4dCBmb3Igc3RyaW5naWZ5IHRvIHBhdGguXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVRleHQoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9be30oKVxcW1xcXSs/IToqXFxcXF0vZywgXCJcXFxcJCZcIik7XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlKHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvWy4rKj9eJHt9KClbXFxdfC9cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbn1cblxuLyoqXG4gKiBQbGFpbiB0ZXh0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRleHQge1xuICB0eXBlOiBcInRleHRcIjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHBhcmFtZXRlciBkZXNpZ25lZCB0byBtYXRjaCBhcmJpdHJhcnkgdGV4dCB3aXRoaW4gYSBzZWdtZW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlciB7XG4gIHR5cGU6IFwicGFyYW1cIjtcbiAgbmFtZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgd2lsZGNhcmQgcGFyYW1ldGVyIGRlc2lnbmVkIHRvIG1hdGNoIG11bHRpcGxlIHNlZ21lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdpbGRjYXJkIHtcbiAgdHlwZTogXCJ3aWxkY2FyZFwiO1xuICBuYW1lOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBzZXQgb2YgcG9zc2libGUgdG9rZW5zIHRvIGV4cGFuZCB3aGVuIG1hdGNoaW5nLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyb3VwIHtcbiAgdHlwZTogXCJncm91cFwiO1xuICB0b2tlbnM6IHJlYWRvbmx5IFRva2VuW107XG59XG5cbi8qKlxuICogVG9rZW5zIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIHJlZ2V4cCBjYXB0dXJlLlxuICovXG5leHBvcnQgdHlwZSBLZXkgPSBQYXJhbWV0ZXIgfCBXaWxkY2FyZDtcblxuLyoqXG4gKiBBIHNlcXVlbmNlIG9mIHBhdGggbWF0Y2ggY2hhcmFjdGVycy5cbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBUZXh0IHwgUGFyYW1ldGVyIHwgV2lsZGNhcmQgfCBHcm91cDtcblxuLyoqXG4gKiBUb2tlbml6ZWQgcGF0aCBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUb2tlbkRhdGEge1xuICB0b2tlbnM6IHJlYWRvbmx5IFRva2VuW107XG4gIG9yaWdpbmFsUGF0aD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBQYXJzZUVycm9yIGlzIHRocm93biB3aGVuIHRoZXJlIGlzIGFuIGVycm9yIHByb2Nlc3NpbmcgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXRoRXJyb3IgZXh0ZW5kcyBUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IG9yaWdpbmFsUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICApIHtcbiAgICBzdXBlcihcbiAgICAgIG1lc3NhZ2UgK1xuICAgICAgICAob3JpZ2luYWxQYXRoID8gYDogJHtvcmlnaW5hbFBhdGh9YCA6IFwiXCIpICtcbiAgICAgICAgXCI7IHZpc2l0IGh0dHBzOi8vZ2l0Lm5ldy9wYXRoVG9SZWdleHBFcnJvciBmb3IgaW5mb1wiLFxuICAgICk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhIHN0cmluZyBmb3IgdGhlIHJhdyB0b2tlbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShzdHI6IHN0cmluZywgb3B0aW9uczogUGFyc2VPcHRpb25zID0ge30pOiBUb2tlbkRhdGEge1xuICBjb25zdCB7IGVuY29kZVBhdGggPSBOT09QX1ZBTFVFIH0gPSBvcHRpb25zO1xuICBjb25zdCBjaGFycyA9IFsuLi5zdHJdO1xuICBsZXQgaW5kZXggPSAwO1xuXG4gIGZ1bmN0aW9uIGNvbnN1bWVVbnRpbChlbmQ6IHN0cmluZyk6IFRva2VuW10ge1xuICAgIGNvbnN0IG91dHB1dDogVG9rZW5bXSA9IFtdO1xuICAgIGxldCBwYXRoID0gXCJcIjtcblxuICAgIGZ1bmN0aW9uIHdyaXRlUGF0aCgpIHtcbiAgICAgIGlmICghcGF0aCkgcmV0dXJuO1xuICAgICAgb3V0cHV0LnB1c2goe1xuICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgdmFsdWU6IGVuY29kZVBhdGgocGF0aCksXG4gICAgICB9KTtcbiAgICAgIHBhdGggPSBcIlwiO1xuICAgIH1cblxuICAgIHdoaWxlIChpbmRleCA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgY29uc3QgY2hhciA9IGNoYXJzW2luZGV4KytdO1xuXG4gICAgICBpZiAoY2hhciA9PT0gZW5kKSB7XG4gICAgICAgIHdyaXRlUGF0aCgpO1xuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSBjaGFycy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBVbmV4cGVjdGVkIGVuZCBhZnRlciBcXFxcIGF0IGluZGV4ICR7aW5kZXh9YCwgc3RyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhdGggKz0gY2hhcnNbaW5kZXgrK107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hhciA9PT0gXCI6XCIgfHwgY2hhciA9PT0gXCIqXCIpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGNoYXIgPT09IFwiOlwiID8gXCJwYXJhbVwiIDogXCJ3aWxkY2FyZFwiO1xuICAgICAgICBsZXQgbmFtZSA9IFwiXCI7XG5cbiAgICAgICAgaWYgKElEX1NUQVJULnRlc3QoY2hhcnNbaW5kZXhdKSkge1xuICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgIG5hbWUgKz0gY2hhcnNbaW5kZXgrK107XG4gICAgICAgICAgfSB3aGlsZSAoSURfQ09OVElOVUUudGVzdChjaGFyc1tpbmRleF0pKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFyc1tpbmRleF0gPT09ICdcIicpIHtcbiAgICAgICAgICBsZXQgcXVvdGVTdGFydCA9IGluZGV4O1xuXG4gICAgICAgICAgd2hpbGUgKGluZGV4IDwgY2hhcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoY2hhcnNbKytpbmRleF0gPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgICAgcXVvdGVTdGFydCA9IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbmNyZW1lbnQgb3ZlciBlc2NhcGUgY2hhcmFjdGVycy5cbiAgICAgICAgICAgIGlmIChjaGFyc1tpbmRleF0gPT09IFwiXFxcXFwiKSBpbmRleCsrO1xuXG4gICAgICAgICAgICBuYW1lICs9IGNoYXJzW2luZGV4XTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocXVvdGVTdGFydCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcbiAgICAgICAgICAgICAgYFVudGVybWluYXRlZCBxdW90ZSBhdCBpbmRleCAke3F1b3RlU3RhcnR9YCxcbiAgICAgICAgICAgICAgc3RyLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0IGluZGV4ICR7aW5kZXh9YCwgc3RyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdyaXRlUGF0aCgpO1xuICAgICAgICBvdXRwdXQucHVzaCh7IHR5cGUsIG5hbWUgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hhciA9PT0gXCJ7XCIpIHtcbiAgICAgICAgd3JpdGVQYXRoKCk7XG4gICAgICAgIG91dHB1dC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgICAgICAgdG9rZW5zOiBjb25zdW1lVW50aWwoXCJ9XCIpLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChcIn0oKVtdKz8hXCIuaW5jbHVkZXMoY2hhcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihgVW5leHBlY3RlZCAke2NoYXJ9IGF0IGluZGV4ICR7aW5kZXggLSAxfWAsIHN0cik7XG4gICAgICB9XG5cbiAgICAgIHBhdGggKz0gY2hhcjtcbiAgICB9XG5cbiAgICBpZiAoZW5kKSB7XG4gICAgICB0aHJvdyBuZXcgUGF0aEVycm9yKFxuICAgICAgICBgVW5leHBlY3RlZCBlbmQgYXQgaW5kZXggJHtpbmRleH0sIGV4cGVjdGVkICR7ZW5kfWAsXG4gICAgICAgIHN0cixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgd3JpdGVQYXRoKCk7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdG9rZW5zOiBjb25zdW1lVW50aWwoXCJcIiksXG4gICAgb3JpZ2luYWxQYXRoOiBzdHIsXG4gIH07XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIFBhcmFtRGF0YSA9IFBhcmFtRGF0YT4oXG4gIHBhdGg6IFBhdGgsXG4gIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zICYgUGFyc2VPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3QgeyBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQsIGRlbGltaXRlciA9IERFRkFVTFRfREVMSU1JVEVSIH0gPVxuICAgIG9wdGlvbnM7XG4gIGNvbnN0IGRhdGEgPSB0eXBlb2YgcGF0aCA9PT0gXCJvYmplY3RcIiA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgY29uc3QgZm4gPSB0b2tlbnNUb0Z1bmN0aW9uKGRhdGEudG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHBhdGgocGFyYW1zOiBQID0ge30gYXMgUCkge1xuICAgIGNvbnN0IG1pc3Npbmc6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgcGF0aCA9IGZuKHBhcmFtcywgbWlzc2luZyk7XG5cbiAgICBpZiAobWlzc2luZy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyczogJHttaXNzaW5nLmpvaW4oXCIsIFwiKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1EYXRhID0gUGFydGlhbDxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXT4+O1xuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBQYXJhbURhdGE+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogSW50ZXJuYWwgcGF0aCBidWlsZGVyIGZ1bmN0aW9uLlxuICovXG50eXBlIFRva2VuRW5jb2RlciA9IChkYXRhOiBQYXJhbURhdGEsIG1pc3Npbmc6IHN0cmluZ1tdKSA9PiBzdHJpbmc7XG5cbmZ1bmN0aW9uIHRva2Vuc1RvRnVuY3Rpb24oXG4gIHRva2VuczogcmVhZG9ubHkgVG9rZW5bXSxcbiAgZGVsaW1pdGVyOiBzdHJpbmcsXG4gIGVuY29kZTogRW5jb2RlIHwgZmFsc2UsXG4pOiBUb2tlbkVuY29kZXIge1xuICBjb25zdCBlbmNvZGVycyA9IHRva2Vucy5tYXAoKHRva2VuKSA9PlxuICAgIHRva2VuVG9GdW5jdGlvbih0b2tlbiwgZGVsaW1pdGVyLCBlbmNvZGUpLFxuICApO1xuXG4gIHJldHVybiAoZGF0YTogUGFyYW1EYXRhLCBtaXNzaW5nOiBzdHJpbmdbXSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuXG4gICAgZm9yIChjb25zdCBlbmNvZGVyIG9mIGVuY29kZXJzKSB7XG4gICAgICByZXN1bHQgKz0gZW5jb2RlcihkYXRhLCBtaXNzaW5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzaW5nbGUgdG9rZW4gaW50byBhIHBhdGggYnVpbGRpbmcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRva2VuVG9GdW5jdGlvbihcbiAgdG9rZW46IFRva2VuLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAgZW5jb2RlOiBFbmNvZGUgfCBmYWxzZSxcbik6IFRva2VuRW5jb2RlciB7XG4gIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikgcmV0dXJuICgpID0+IHRva2VuLnZhbHVlO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICBjb25zdCBmbiA9IHRva2Vuc1RvRnVuY3Rpb24odG9rZW4udG9rZW5zLCBkZWxpbWl0ZXIsIGVuY29kZSk7XG5cbiAgICByZXR1cm4gKGRhdGEsIG1pc3NpbmcpID0+IHtcbiAgICAgIGNvbnN0IGxlbiA9IG1pc3NpbmcubGVuZ3RoO1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihkYXRhLCBtaXNzaW5nKTtcbiAgICAgIGlmIChtaXNzaW5nLmxlbmd0aCA9PT0gbGVuKSByZXR1cm4gdmFsdWU7XG5cbiAgICAgIG1pc3NpbmcubGVuZ3RoID0gbGVuOyAvLyBSZXNldCBvcHRpb25hbCBncm91cC5cbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH07XG4gIH1cblxuICBjb25zdCBlbmNvZGVWYWx1ZSA9IGVuY29kZSB8fCBOT09QX1ZBTFVFO1xuXG4gIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIgJiYgZW5jb2RlICE9PSBmYWxzZSkge1xuICAgIHJldHVybiAoZGF0YSwgbWlzc2luZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgbWlzc2luZy5wdXNoKHRva2VuLm5hbWUpO1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBub24tZW1wdHkgYXJyYXlgKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdCA9IFwiXCI7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZVtpXSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfS8ke2l9XCIgdG8gYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpID4gMCkgcmVzdWx0ICs9IGRlbGltaXRlcjtcbiAgICAgICAgcmVzdWx0ICs9IGVuY29kZVZhbHVlKHZhbHVlW2ldKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBub24tZW1wdHkgYXJyYXlgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIChkYXRhLCBtaXNzaW5nKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICBtaXNzaW5nLnB1c2godG9rZW4ubmFtZSk7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgYSBub24tZW1wdHkgc3RyaW5nYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVuY29kZVZhbHVlKHZhbHVlKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIHJlc3VsdCBjb250YWlucyBkYXRhIGFib3V0IHRoZSBwYXRoIG1hdGNoLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBQYXJhbURhdGE+IHtcbiAgcGF0aDogc3RyaW5nO1xuICBwYXJhbXM6IFA7XG59XG5cbi8qKlxuICogQSBtYXRjaCBpcyBlaXRoZXIgYGZhbHNlYCAobm8gbWF0Y2gpIG9yIGEgbWF0Y2ggcmVzdWx0LlxuICovXG5leHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IGZhbHNlIHwgTWF0Y2hSZXN1bHQ8UD47XG5cbi8qKlxuICogVGhlIG1hdGNoIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgbWF0Y2hlZCB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IChwYXRoOiBzdHJpbmcpID0+IE1hdGNoPFA+O1xuXG4vKipcbiAqIFN1cHBvcnRlZCBwYXRoIGlucHV0cy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFRva2VuRGF0YTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSBwYXRoIGludG8gYSBtYXRjaCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBQYXJhbURhdGE+KFxuICBwYXRoOiBQYXRoIHwgUGF0aFtdLFxuICBvcHRpb25zOiBNYXRjaE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudCwgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIgfSA9XG4gICAgb3B0aW9ucztcbiAgY29uc3QgeyByZWdleHAsIGtleXMgfSA9IHBhdGhUb1JlZ2V4cChwYXRoLCBvcHRpb25zKTtcblxuICBjb25zdCBkZWNvZGVycyA9IGtleXMubWFwKChrZXkpID0+IHtcbiAgICBpZiAoZGVjb2RlID09PSBmYWxzZSkgcmV0dXJuIE5PT1BfVkFMVUU7XG4gICAgaWYgKGtleS50eXBlID09PSBcInBhcmFtXCIpIHJldHVybiBkZWNvZGU7XG4gICAgcmV0dXJuICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5zcGxpdChkZWxpbWl0ZXIpLm1hcChkZWNvZGUpO1xuICB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gbWF0Y2goaW5wdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZWdleHAuZXhlYyhpbnB1dCk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBwYXRoID0gbVswXTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG4gICAgICBjb25zdCBkZWNvZGVyID0gZGVjb2RlcnNbaSAtIDFdO1xuICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZXIobVtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgcGFyYW1zIH07XG4gIH07XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgcGF0aCBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uIGFuZCBjYXB0dXJlIGtleXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9SZWdleHAoXG4gIHBhdGg6IFBhdGggfCBQYXRoW10sXG4gIG9wdGlvbnM6IFBhdGhUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7XG4gICAgZGVsaW1pdGVyID0gREVGQVVMVF9ERUxJTUlURVIsXG4gICAgZW5kID0gdHJ1ZSxcbiAgICBzZW5zaXRpdmUgPSBmYWxzZSxcbiAgICB0cmFpbGluZyA9IHRydWUsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBrZXlzOiBLZXlbXSA9IFtdO1xuICBsZXQgc291cmNlID0gXCJcIjtcbiAgbGV0IGNvbWJpbmF0aW9ucyA9IDA7XG5cbiAgZnVuY3Rpb24gcHJvY2VzcyhwYXRoOiBQYXRoIHwgUGF0aFtdKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICAgIGZvciAoY29uc3QgcCBvZiBwYXRoKSBwcm9jZXNzKHApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YgcGF0aCA9PT0gXCJvYmplY3RcIiA/IHBhdGggOiBwYXJzZShwYXRoLCBvcHRpb25zKTtcbiAgICBmbGF0dGVuKGRhdGEudG9rZW5zLCAwLCBbXSwgKHRva2VucykgPT4ge1xuICAgICAgaWYgKGNvbWJpbmF0aW9ucyA+PSAyNTYpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcIlRvbyBtYW55IHBhdGggY29tYmluYXRpb25zXCIsIGRhdGEub3JpZ2luYWxQYXRoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbWJpbmF0aW9ucyA+IDApIHNvdXJjZSArPSBcInxcIjtcbiAgICAgIHNvdXJjZSArPSB0b1JlZ0V4cFNvdXJjZShcbiAgICAgICAgdG9rZW5zLFxuICAgICAgICBkZWxpbWl0ZXIsXG4gICAgICAgIGtleXMsXG4gICAgICAgIGRhdGEub3JpZ2luYWxQYXRoLFxuICAgICAgICB0cmFpbGluZyxcbiAgICAgICk7XG4gICAgICBjb21iaW5hdGlvbnMrKztcbiAgICB9KTtcbiAgfVxuXG4gIHByb2Nlc3MocGF0aCk7XG5cbiAgbGV0IHBhdHRlcm4gPSBgXig/OiR7c291cmNlfSlgO1xuICBwYXR0ZXJuICs9IGVuZCA/IFwiJFwiIDogXCIoPz1cIiArIGVzY2FwZShkZWxpbWl0ZXIpICsgXCJ8JClcIjtcblxuICByZXR1cm4geyByZWdleHA6IG5ldyBSZWdFeHAocGF0dGVybiwgc2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiKSwga2V5cyB9O1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGEgZmxhdCBsaXN0IG9mIHNlcXVlbmNlIHRva2VucyBmcm9tIHRoZSBnaXZlbiB0b2tlbnMuXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW4oXG4gIHRva2VuczogcmVhZG9ubHkgVG9rZW5bXSxcbiAgaW5kZXg6IG51bWJlcixcbiAgcmVzdWx0OiBFeGNsdWRlPFRva2VuLCBHcm91cD5bXSxcbiAgY2FsbGJhY2s6IChyZXN1bHQ6IEV4Y2x1ZGU8VG9rZW4sIEdyb3VwPltdKSA9PiB2b2lkLFxuKTogdm9pZCB7XG4gIHdoaWxlIChpbmRleCA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcImdyb3VwXCIpIHtcbiAgICAgIGNvbnN0IGxlbiA9IHJlc3VsdC5sZW5ndGg7XG4gICAgICBmbGF0dGVuKHRva2VuLnRva2VucywgMCwgcmVzdWx0LCAoc2VxKSA9PlxuICAgICAgICBmbGF0dGVuKHRva2VucywgaW5kZXgsIHNlcSwgY2FsbGJhY2spLFxuICAgICAgKTtcbiAgICAgIHJlc3VsdC5sZW5ndGggPSBsZW47XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXN1bHQucHVzaCh0b2tlbik7XG4gIH1cblxuICBjYWxsYmFjayhyZXN1bHQpO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhIGZsYXQgc2VxdWVuY2Ugb2YgdG9rZW5zIGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbmZ1bmN0aW9uIHRvUmVnRXhwU291cmNlKFxuICB0b2tlbnM6IEV4Y2x1ZGU8VG9rZW4sIEdyb3VwPltdLFxuICBkZWxpbWl0ZXI6IHN0cmluZyxcbiAga2V5czogS2V5W10sXG4gIG9yaWdpbmFsUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICB0cmFpbGluZzogYm9vbGVhbixcbik6IHN0cmluZyB7XG4gIGxldCByZXN1bHQgPSBcIlwiO1xuICBsZXQgcHJlZml4ID0gXCJcIjtcbiAgbGV0IGhhc1dpbGRjYXJkQWhlYWQgPSBmYWxzZTtcbiAgbGV0IGhhc1NlZ21lbnRXaWxkY2FyZCA9IGZhbHNlO1xuICBsZXQgd2lsZGNhcmRCYWNrdHJhY2sgPSBcIlwiO1xuICBsZXQgaW5kZXggPSAwO1xuXG4gIGZ1bmN0aW9uIHNlZWtXaWxkY2FyZChpbmRleDogbnVtYmVyKSB7XG4gICAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gdGV4dFJlbWFpbmluZyhpbmRleDogbnVtYmVyKSB7XG4gICAgbGV0IHJlc3VsdCA9IFwiXCI7XG4gICAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG4gICAgICBpZiAodG9rZW4udHlwZSAhPT0gXCJ0ZXh0XCIpIHJldHVybiByZXN1bHQ7XG4gICAgICBpZiAodG9rZW4udmFsdWUuaW5jbHVkZXMoZGVsaW1pdGVyKSkgYnJlYWs7XG4gICAgICByZXN1bHQgKz0gdG9rZW4udmFsdWU7XG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKGluZGV4IDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2luZGV4KytdO1xuXG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGVzY2FwZSh0b2tlbi52YWx1ZSk7XG4gICAgICByZXN1bHQgKz0gdmFsdWU7XG4gICAgICB3aWxkY2FyZEJhY2t0cmFjayArPSB2YWx1ZTtcbiAgICAgIHByZWZpeCArPSB0b2tlbi52YWx1ZTtcbiAgICAgIGlmICh0b2tlbi52YWx1ZS5pbmNsdWRlcyhkZWxpbWl0ZXIpKSBoYXNTZWdtZW50V2lsZGNhcmQgPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIgfHwgdG9rZW4udHlwZSA9PT0gXCJ3aWxkY2FyZFwiKSB7XG4gICAgICBpZiAocmVzdWx0ICYmICFwcmVmaXgpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBhdGhFcnJvcihcbiAgICAgICAgICBgTWlzc2luZyB0ZXh0IGJlZm9yZSBcIiR7dG9rZW4ubmFtZX1cIiAke3Rva2VuLnR5cGV9YCxcbiAgICAgICAgICBvcmlnaW5hbFBhdGgsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGtleXMucHVzaCh0b2tlbik7XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgICAgaWYgKGhhc1NlZ21lbnRXaWxkY2FyZCkge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gbmVnYXRlKGRlbGltaXRlciwgcHJlZml4KTtcbiAgICAgICAgICByZXN1bHQgKz0gYCgke3ZhbHVlfSs/fCR7dmFsdWV9KiR7ZXNjYXBlKHByZWZpeCl9KWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgdGV4dCA9IHRleHRSZW1haW5pbmcoaW5kZXgpO1xuXG4gICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBgKD89KCR7bmVnYXRlKGRlbGltaXRlciwgXCJcIil9Kz8pJHtlc2NhcGUodGV4dCl9KSg/OlxcXFwke2tleXMubGVuZ3RofSlgO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gYCgke25lZ2F0ZShkZWxpbWl0ZXIsIFwiXCIpfSspYDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHdlIGhhZCBhIHdpbGRjYXJkLCBjbG9zZSBsb29rYWhlYWQgYW5kIHJlc2V0LlxuICAgICAgICBpZiAoaGFzV2lsZGNhcmRBaGVhZCkgcmVzdWx0ICs9IGApJHt3aWxkY2FyZEJhY2t0cmFja31gO1xuXG4gICAgICAgIGhhc1dpbGRjYXJkQWhlYWQgPSBzZWVrV2lsZGNhcmQoaW5kZXgpO1xuXG4gICAgICAgIC8vIExvY2sgZWFybGllciB3aWxkY2FyZHM7IGxlYXZlIHRoZSBsYXN0IG9uZSBncmVlZHkuXG4gICAgICAgIHJlc3VsdCArPSBoYXNXaWxkY2FyZEFoZWFkID8gXCIoPz0oW15dKz8pXCIgOiBcIihbXl0rKVwiO1xuXG4gICAgICAgIGhhc1NlZ21lbnRXaWxkY2FyZCA9IHRydWU7XG4gICAgICAgIHdpbGRjYXJkQmFja3RyYWNrID0gXCJcIjtcbiAgICAgIH1cblxuICAgICAgd2lsZGNhcmRCYWNrdHJhY2sgKz0gYCg/OlxcXFwke2tleXMubGVuZ3RofSlgO1xuICAgICAgcHJlZml4ID0gXCJcIjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVua25vd24gdG9rZW4gdHlwZTogJHsodG9rZW4gYXMgYW55KS50eXBlfWApO1xuICB9XG5cbiAgaWYgKHRyYWlsaW5nICYmICFwcmVmaXguZW5kc1dpdGgoZGVsaW1pdGVyKSkge1xuICAgIHJlc3VsdCArPSBcIig/OlwiICsgZXNjYXBlKGRlbGltaXRlcikgKyBcIiQpP1wiO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBCbG9jayBiYWNrdHJhY2tpbmcgb24gcHJldmlvdXMgdGV4dC9kZWxpbWl0ZXIuXG4gKi9cbmZ1bmN0aW9uIG5lZ2F0ZShhOiBzdHJpbmcsIGI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChiLmxlbmd0aCA+IGEubGVuZ3RoKSByZXR1cm4gbmVnYXRlKGIsIGEpOyAvLyBMb25nZXN0IHN0cmluZyBmaXJzdC5cblxuICBpZiAoYSA9PT0gYikgYiA9IFwiXCI7IC8vIENsZWFuZXIgcmVnZXggc3RyaW5ncywgbm8gZHVwbGljYXRpb24uXG4gIGlmIChiLmxlbmd0aCA+IDEpIHJldHVybiBgKD86KD8hJHtlc2NhcGUoYSl9fCR7ZXNjYXBlKGIpfSlbXl0pYDtcbiAgaWYgKGEubGVuZ3RoID4gMSkgcmV0dXJuIGAoPzooPyEke2VzY2FwZShhKX0pW14ke2VzY2FwZShiKX1dKWA7XG4gIHJldHVybiBgW14ke2VzY2FwZShhICsgYil9XWA7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IHRva2VuIGRhdGEgaW50byBhIHBhdGggc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5KGRhdGE6IFRva2VuRGF0YSk6IHN0cmluZyB7XG4gIGNvbnN0IHsgdG9rZW5zIH0gPSBkYXRhO1xuICBsZXQgaW5kZXggPSAwO1xuICBsZXQgdmFsdWUgPSBcIlwiO1xuXG4gIHdoaWxlIChpbmRleCA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpbmRleCsrXTtcblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInRleHRcIikge1xuICAgICAgdmFsdWUgKz0gZXNjYXBlVGV4dCh0b2tlbi52YWx1ZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4udHlwZSA9PT0gXCJncm91cFwiKSB7XG4gICAgICB2YWx1ZSArPSBcIntcIiArIHN0cmluZ2lmeSh0b2tlbikgKyBcIn1cIjtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcInBhcmFtXCIpIHtcbiAgICAgIHZhbHVlICs9IFwiOlwiICsgc3RyaW5naWZ5TmFtZSh0b2tlbi5uYW1lLCB0b2tlbnMsIGluZGV4KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbi50eXBlID09PSBcIndpbGRjYXJkXCIpIHtcbiAgICAgIHZhbHVlICs9IFwiKlwiICsgc3RyaW5naWZ5TmFtZSh0b2tlbi5uYW1lLCB0b2tlbnMsIGluZGV4KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVua25vd24gdG9rZW4gdHlwZTogJHsodG9rZW4gYXMgYW55KS50eXBlfWApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFdyYXAgYSBwYXJhbWV0ZXIgbmFtZSBpbiBxdW90ZXMsIGVzY2FwaW5nIG9ubHkgdGhlIGNoYXJhY3RlcnMgdGhlIHBhcnNlclxuICogdHJlYXRzIHNwZWNpYWxseSBpbnNpZGUgYSBxdW90ZWQgbmFtZSAoYFwiYCBhbmQgYFxcYCkuIGBKU09OLnN0cmluZ2lmeWAgY2FuJ3RcbiAqIGJlIHVzZWQgaGVyZSBiZWNhdXNlIGl0IGVtaXRzIGVzY2FwZXMgbGlrZSBgXFxuYCB0aGF0IHRoZSBwYXJzZXIgcmVhZHMgYmFjayBhc1xuICogdGhlIGxpdGVyYWwgY2hhcmFjdGVyIGBuYCwgc28gbmFtZXMgd2l0aCBjb250cm9sIGNoYXJhY3RlcnMgd291bGRuJ3Qgc3Vydml2ZVxuICogYSBgcGFyc2VgIC0+IGBzdHJpbmdpZnlgIC0+IGBwYXJzZWAgcm91bmQgdHJpcC5cbiAqL1xuZnVuY3Rpb24gcXVvdGVOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgXCIke25hbWUucmVwbGFjZSgvW1wiXFxcXF0vZywgXCJcXFxcJCZcIil9XCJgO1xufVxuXG4vKipcbiAqIFN0cmluZ2lmeSBhIHBhcmFtZXRlciBuYW1lLCBlc2NhcGluZyB3aGVuIGl0IGNhbm5vdCBiZSBlbWl0dGVkIGRpcmVjdGx5LlxuICovXG5mdW5jdGlvbiBzdHJpbmdpZnlOYW1lKFxuICBuYW1lOiBzdHJpbmcsXG4gIHRva2VuczogcmVhZG9ubHkgVG9rZW5bXSxcbiAgaW5kZXg6IG51bWJlcixcbik6IHN0cmluZyB7XG4gIGlmICghSUQudGVzdChuYW1lKSkgcmV0dXJuIHF1b3RlTmFtZShuYW1lKTtcblxuICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoKSB7XG4gICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaW5kZXgrK107XG4gICAgaWYgKHRva2VuLnR5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICBpZiAoIXRva2VuLnZhbHVlKSBjb250aW51ZTtcblxuICAgICAgLy8gRGVzdHJ1Y3R1cmluZyByZWFkcyB0aGUgZmlyc3QgKmNvZGUgcG9pbnQqLCBtYXRjaGluZyBgcGFyc2VgLCB3aGljaFxuICAgICAgLy8gaXRlcmF0ZXMgdGhlIHBhdGggd2l0aCBgWy4uLnN0cl1gLiBJbmRleGluZyB3aXRoIGBbMF1gIHdvdWxkIHJlYWQgb25seSB0aGVcbiAgICAgIC8vIGxlYWRpbmcgc3Vycm9nYXRlIG9mIGFuIGFzdHJhbCBjaGFyYWN0ZXIsIG1pc3NpbmcgdGhhdCB0aGUgcGFyc2VyIHRyZWF0c1xuICAgICAgLy8gdGhlIHdob2xlIGNoYXJhY3RlciBhcyBgSURfQ29udGludWVgIGFuZCBhYnNvcmJzIGl0IGludG8gdGhlIG5hbWUuXG4gICAgICBjb25zdCBbZmlyc3RdID0gdG9rZW4udmFsdWU7XG4gICAgICBpZiAoSURfQ09OVElOVUUudGVzdChmaXJzdCkpIHJldHVybiBxdW90ZU5hbWUobmFtZSk7XG4gICAgfVxuXG4gICAgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgRW5jb2RlIGFzIHAyckVuY29kZSxcbiAgICB0eXBlIERlY29kZSBhcyBwMnJEZWNvZGUsXG4gICAgdHlwZSBQYXJzZU9wdGlvbnMgYXMgcDJyUGFyc2VPcHRpb25zLFxuICAgIHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyBhcyBwMnJQYXRoVG9SZWdleHBPcHRpb25zLFxuICAgIHR5cGUgTWF0Y2hPcHRpb25zIGFzIHAyck1hdGNoT3B0aW9ucyxcbiAgICB0eXBlIENvbXBpbGVPcHRpb25zIGFzIHAyckNvbXBpbGVPcHRpb25zLFxuICAgIHR5cGUgUGFyYW1EYXRhIGFzIHAyclBhcmFtRGF0YSxcbiAgICB0eXBlIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgdHlwZSBNYXRjaFJlc3VsdCBhcyBwMnJNYXRjaFJlc3VsdCxcbiAgICB0eXBlIE1hdGNoIGFzIHAyck1hdGNoLFxuICAgIHR5cGUgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIHR5cGUgS2V5IGFzIHAycktleSxcbiAgICB0eXBlIFRva2VuIGFzIHAyclRva2VuLFxuICAgIHR5cGUgUGF0aCBhcyBwMnJQYXRoLFxuICAgIHR5cGUgVG9rZW5EYXRhIGFzIHAyclRva2VuRGF0YSxcbiAgICBQYXRoRXJyb3IgYXMgcDJyUGF0aEVycm9yLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgbWF0Y2gsXG4gICAgc3RyaW5naWZ5LFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgRW5jb2RlID0gcDJyRW5jb2RlO1xuICAgIGV4cG9ydCB0eXBlIERlY29kZSA9IHAyckRlY29kZTtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aFRvUmVnZXhwT3B0aW9ucyA9IHAyclBhdGhUb1JlZ2V4cE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hPcHRpb25zID0gcDJyTWF0Y2hPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIENvbXBpbGVPcHRpb25zID0gcDJyQ29tcGlsZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5EYXRhID0gcDJyVG9rZW5EYXRhO1xuICAgIGV4cG9ydCB0eXBlIFBhcmFtRGF0YSA9IHAyclBhcmFtRGF0YTtcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJQYXRoRnVuY3Rpb248UD47XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaFJlc3VsdDxQPjtcbiAgICBleHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgUGFyYW1EYXRhPiA9IHAyck1hdGNoPFA+O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIFBhcmFtRGF0YT4gPSBwMnJNYXRjaEZ1bmN0aW9uPFA+O1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xufVxuXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBQYXRoRXJyb3I6IHAyclBhdGhFcnJvcixcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIG1hdGNoLFxuICAgIHN0cmluZ2lmeSxcbiAgICBwYXRoVG9SZWdleHAsXG59O1xuXG5leHBvcnQgeyBwYXRoMnJlZ2V4cCB9O1xuIl0sIm5hbWVzIjpbInAyclBhdGhFcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxNQUFNLGlCQUFpQixHQUFHLEdBQUc7QUFDN0IsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEtBQUssS0FBSztBQUMzQyxNQUFNLFFBQVEsR0FBRyxxQkFBcUI7QUFDdEMsTUFBTSxXQUFXLEdBQUcsbUNBQW1DO0FBQ3ZELE1BQU0sRUFBRSxHQUFHLG9EQUFvRDtBQXdEL0Q7O0FBRUc7QUFDSCxTQUFTLFVBQVUsQ0FBQyxHQUFXLEVBQUE7SUFDN0IsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQztBQUNsRDtBQUVBOztBQUVHO0FBQ0gsU0FBUyxNQUFNLENBQUMsR0FBVyxFQUFBO0lBQ3pCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxNQUFN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QUssQ0FBQztZQUNoQztRQUNGO0FBRUEsUUFBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFO1lBQzFCLEtBQUssSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUc7WUFDckM7UUFDRjtBQUVBLFFBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtBQUMxQixZQUFBLEtBQUssSUFBSSxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQztZQUN2RDtRQUNGO0FBRUEsUUFBQSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFO0FBQzdCLFlBQUEsS0FBSyxJQUFJLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDO1lBQ3ZEO1FBQ0Y7UUFFQSxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsb0JBQUEsRUFBd0IsS0FBYSxDQUFDLElBQUksQ0FBQSxDQUFFLENBQUM7SUFDbkU7QUFFQSxJQUFBLE9BQU8sS0FBSztBQUNkO0FBRUE7Ozs7OztBQU1HO0FBQ0gsU0FBUyxTQUFTLENBQUMsSUFBWSxFQUFBO0lBQzdCLE9BQU8sQ0FBQSxDQUFBLEVBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUEsQ0FBQSxDQUFHO0FBQzlDO0FBRUE7O0FBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsSUFBWSxFQUNaLE1BQXdCLEVBQ3hCLEtBQWEsRUFBQTtBQUViLElBQUEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQUUsUUFBQSxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFFMUMsSUFBQSxPQUFPLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFO0FBQzVCLFFBQUEsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQzdCLFFBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtZQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUs7Z0JBQUU7Ozs7O0FBTWxCLFlBQUEsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLO0FBQzNCLFlBQUEsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUFFLGdCQUFBLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQztRQUNyRDtRQUVBO0lBQ0Y7QUFFQSxJQUFBLE9BQU8sSUFBSTtBQUNiOztBQ3ZyQkE7O0FBRUc7QUE0Q0gsTUFBTSxXQUFXLEdBQUc7QUFDaEIsSUFBQSxTQUFTLEVBQUVBLFNBQVk7SUFDdkIsS0FBSztJQUNMLE9BQU87SUFDUCxLQUFLO0lBQ0wsU0FBUztJQUNULFlBQVk7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAvIn0=