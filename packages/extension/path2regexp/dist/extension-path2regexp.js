/*!
 * @cdp/extension-path2regexp 0.9.18
 *   extension for conversion path to regexp library
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.CDP = global.CDP || {}, global.CDP.Exension = global.CDP.Exension || {})));
})(this, (function (exports) { 'use strict';

    /**
     * Tokenize input string.
     */
    function lexer(str) {
        var tokens = [];
        var i = 0;
        while (i < str.length) {
            var char = str[i];
            if (char === "*" || char === "+" || char === "?") {
                tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
                continue;
            }
            if (char === "\\") {
                tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
                continue;
            }
            if (char === "{") {
                tokens.push({ type: "OPEN", index: i, value: str[i++] });
                continue;
            }
            if (char === "}") {
                tokens.push({ type: "CLOSE", index: i, value: str[i++] });
                continue;
            }
            if (char === ":") {
                var name = "";
                var j = i + 1;
                while (j < str.length) {
                    var code = str.charCodeAt(j);
                    if (
                    // `0-9`
                    (code >= 48 && code <= 57) ||
                        // `A-Z`
                        (code >= 65 && code <= 90) ||
                        // `a-z`
                        (code >= 97 && code <= 122) ||
                        // `_`
                        code === 95) {
                        name += str[j++];
                        continue;
                    }
                    break;
                }
                if (!name)
                    throw new TypeError("Missing parameter name at ".concat(i));
                tokens.push({ type: "NAME", index: i, value: name });
                i = j;
                continue;
            }
            if (char === "(") {
                var count = 1;
                var pattern = "";
                var j = i + 1;
                if (str[j] === "?") {
                    throw new TypeError("Pattern cannot start with \"?\" at ".concat(j));
                }
                while (j < str.length) {
                    if (str[j] === "\\") {
                        pattern += str[j++] + str[j++];
                        continue;
                    }
                    if (str[j] === ")") {
                        count--;
                        if (count === 0) {
                            j++;
                            break;
                        }
                    }
                    else if (str[j] === "(") {
                        count++;
                        if (str[j + 1] !== "?") {
                            throw new TypeError("Capturing groups are not allowed at ".concat(j));
                        }
                    }
                    pattern += str[j++];
                }
                if (count)
                    throw new TypeError("Unbalanced pattern at ".concat(i));
                if (!pattern)
                    throw new TypeError("Missing pattern at ".concat(i));
                tokens.push({ type: "PATTERN", index: i, value: pattern });
                i = j;
                continue;
            }
            tokens.push({ type: "CHAR", index: i, value: str[i++] });
        }
        tokens.push({ type: "END", index: i, value: "" });
        return tokens;
    }
    /**
     * Parse a string for the raw tokens.
     */
    function parse(str, options) {
        if (options === void 0) { options = {}; }
        var tokens = lexer(str);
        var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
        var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
        var result = [];
        var key = 0;
        var i = 0;
        var path = "";
        var tryConsume = function (type) {
            if (i < tokens.length && tokens[i].type === type)
                return tokens[i++].value;
        };
        var mustConsume = function (type) {
            var value = tryConsume(type);
            if (value !== undefined)
                return value;
            var _a = tokens[i], nextType = _a.type, index = _a.index;
            throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
        };
        var consumeText = function () {
            var result = "";
            var value;
            while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
                result += value;
            }
            return result;
        };
        while (i < tokens.length) {
            var char = tryConsume("CHAR");
            var name = tryConsume("NAME");
            var pattern = tryConsume("PATTERN");
            if (name || pattern) {
                var prefix = char || "";
                if (prefixes.indexOf(prefix) === -1) {
                    path += prefix;
                    prefix = "";
                }
                if (path) {
                    result.push(path);
                    path = "";
                }
                result.push({
                    name: name || key++,
                    prefix: prefix,
                    suffix: "",
                    pattern: pattern || defaultPattern,
                    modifier: tryConsume("MODIFIER") || "",
                });
                continue;
            }
            var value = char || tryConsume("ESCAPED_CHAR");
            if (value) {
                path += value;
                continue;
            }
            if (path) {
                result.push(path);
                path = "";
            }
            var open = tryConsume("OPEN");
            if (open) {
                var prefix = consumeText();
                var name_1 = tryConsume("NAME") || "";
                var pattern_1 = tryConsume("PATTERN") || "";
                var suffix = consumeText();
                mustConsume("CLOSE");
                result.push({
                    name: name_1 || (pattern_1 ? key++ : ""),
                    pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                    prefix: prefix,
                    suffix: suffix,
                    modifier: tryConsume("MODIFIER") || "",
                });
                continue;
            }
            mustConsume("END");
        }
        return result;
    }
    /**
     * Compile a string to a template function for the path.
     */
    function compile(str, options) {
        return tokensToFunction(parse(str, options), options);
    }
    /**
     * Expose a method for transforming tokens into the path function.
     */
    function tokensToFunction(tokens, options) {
        if (options === void 0) { options = {}; }
        var reFlags = flags(options);
        var _a = options.encode, encode = _a === void 0 ? function (x) { return x; } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
        // Compile all the tokens into regexps.
        var matches = tokens.map(function (token) {
            if (typeof token === "object") {
                return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
            }
        });
        return function (data) {
            var path = "";
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                if (typeof token === "string") {
                    path += token;
                    continue;
                }
                var value = data ? data[token.name] : undefined;
                var optional = token.modifier === "?" || token.modifier === "*";
                var repeat = token.modifier === "*" || token.modifier === "+";
                if (Array.isArray(value)) {
                    if (!repeat) {
                        throw new TypeError("Expected \"".concat(token.name, "\" to not repeat, but got an array"));
                    }
                    if (value.length === 0) {
                        if (optional)
                            continue;
                        throw new TypeError("Expected \"".concat(token.name, "\" to not be empty"));
                    }
                    for (var j = 0; j < value.length; j++) {
                        var segment = encode(value[j], token);
                        if (validate && !matches[i].test(segment)) {
                            throw new TypeError("Expected all \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                        }
                        path += token.prefix + segment + token.suffix;
                    }
                    continue;
                }
                if (typeof value === "string" || typeof value === "number") {
                    var segment = encode(String(value), token);
                    if (validate && !matches[i].test(segment)) {
                        throw new TypeError("Expected \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                    }
                    path += token.prefix + segment + token.suffix;
                    continue;
                }
                if (optional)
                    continue;
                var typeOfMessage = repeat ? "an array" : "a string";
                throw new TypeError("Expected \"".concat(token.name, "\" to be ").concat(typeOfMessage));
            }
            return path;
        };
    }
    /**
     * Create path match function from `path-to-regexp` spec.
     */
    function match(str, options) {
        var keys = [];
        var re = pathToRegexp(str, keys, options);
        return regexpToFunction(re, keys, options);
    }
    /**
     * Create a path match function from `path-to-regexp` output.
     */
    function regexpToFunction(re, keys, options) {
        if (options === void 0) { options = {}; }
        var _a = options.decode, decode = _a === void 0 ? function (x) { return x; } : _a;
        return function (pathname) {
            var m = re.exec(pathname);
            if (!m)
                return false;
            var path = m[0], index = m.index;
            var params = Object.create(null);
            var _loop_1 = function (i) {
                if (m[i] === undefined)
                    return "continue";
                var key = keys[i - 1];
                if (key.modifier === "*" || key.modifier === "+") {
                    params[key.name] = m[i].split(key.prefix + key.suffix).map(function (value) {
                        return decode(value, key);
                    });
                }
                else {
                    params[key.name] = decode(m[i], key);
                }
            };
            for (var i = 1; i < m.length; i++) {
                _loop_1(i);
            }
            return { path: path, index: index, params: params };
        };
    }
    /**
     * Escape a regular expression string.
     */
    function escapeString(str) {
        return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
    }
    /**
     * Get the flags for a regexp from the options.
     */
    function flags(options) {
        return options && options.sensitive ? "" : "i";
    }
    /**
     * Pull out keys from a regexp.
     */
    function regexpToRegexp(path, keys) {
        if (!keys)
            return path;
        var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
        var index = 0;
        var execResult = groupsRegex.exec(path.source);
        while (execResult) {
            keys.push({
                // Use parenthesized substring match if available, index otherwise
                name: execResult[1] || index++,
                prefix: "",
                suffix: "",
                modifier: "",
                pattern: "",
            });
            execResult = groupsRegex.exec(path.source);
        }
        return path;
    }
    /**
     * Transform an array into a regexp.
     */
    function arrayToRegexp(paths, keys, options) {
        var parts = paths.map(function (path) { return pathToRegexp(path, keys, options).source; });
        return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
    }
    /**
     * Create a path regexp from string input.
     */
    function stringToRegexp(path, keys, options) {
        return tokensToRegexp(parse(path, options), keys, options);
    }
    /**
     * Expose a function for taking tokens and returning a RegExp.
     */
    function tokensToRegexp(tokens, keys, options) {
        if (options === void 0) { options = {}; }
        var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function (x) { return x; } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
        var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
        var delimiterRe = "[".concat(escapeString(delimiter), "]");
        var route = start ? "^" : "";
        // Iterate over the tokens and create our regexp string.
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            if (typeof token === "string") {
                route += escapeString(encode(token));
            }
            else {
                var prefix = escapeString(encode(token.prefix));
                var suffix = escapeString(encode(token.suffix));
                if (token.pattern) {
                    if (keys)
                        keys.push(token);
                    if (prefix || suffix) {
                        if (token.modifier === "+" || token.modifier === "*") {
                            var mod = token.modifier === "*" ? "?" : "";
                            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
                        }
                        else {
                            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
                        }
                    }
                    else {
                        if (token.modifier === "+" || token.modifier === "*") {
                            route += "((?:".concat(token.pattern, ")").concat(token.modifier, ")");
                        }
                        else {
                            route += "(".concat(token.pattern, ")").concat(token.modifier);
                        }
                    }
                }
                else {
                    route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
                }
            }
        }
        if (end) {
            if (!strict)
                route += "".concat(delimiterRe, "?");
            route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
        }
        else {
            var endToken = tokens[tokens.length - 1];
            var isEndDelimited = typeof endToken === "string"
                ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1
                : endToken === undefined;
            if (!strict) {
                route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
            }
            if (!isEndDelimited) {
                route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
            }
        }
        return new RegExp(route, flags(options));
    }
    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     */
    function pathToRegexp(path, keys, options) {
        if (path instanceof RegExp)
            return regexpToRegexp(path, keys);
        if (Array.isArray(path))
            return arrayToRegexp(path, keys, options);
        return stringToRegexp(path, keys, options);
    }

    /* eslint-disable
        @typescript-eslint/no-namespace,
     */
    const path2regexp = {
        parse,
        compile,
        tokensToFunction,
        match,
        regexpToFunction,
        tokensToRegexp,
        pathToRegexp,
    };

    exports.path2regexp = path2regexp;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRva2VuaXplciByZXN1bHRzLlxuICovXG5pbnRlcmZhY2UgTGV4VG9rZW4ge1xuICB0eXBlOlxuICAgIHwgXCJPUEVOXCJcbiAgICB8IFwiQ0xPU0VcIlxuICAgIHwgXCJQQVRURVJOXCJcbiAgICB8IFwiTkFNRVwiXG4gICAgfCBcIkNIQVJcIlxuICAgIHwgXCJFU0NBUEVEX0NIQVJcIlxuICAgIHwgXCJNT0RJRklFUlwiXG4gICAgfCBcIkVORFwiO1xuICBpbmRleDogbnVtYmVyO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIFRva2VuaXplIGlucHV0IHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gbGV4ZXIoc3RyOiBzdHJpbmcpOiBMZXhUb2tlbltdIHtcbiAgY29uc3QgdG9rZW5zOiBMZXhUb2tlbltdID0gW107XG4gIGxldCBpID0gMDtcblxuICB3aGlsZSAoaSA8IHN0ci5sZW5ndGgpIHtcbiAgICBjb25zdCBjaGFyID0gc3RyW2ldO1xuXG4gICAgaWYgKGNoYXIgPT09IFwiKlwiIHx8IGNoYXIgPT09IFwiK1wiIHx8IGNoYXIgPT09IFwiP1wiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiTU9ESUZJRVJcIiwgaW5kZXg6IGksIHZhbHVlOiBzdHJbaSsrXSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaGFyID09PSBcIlxcXFxcIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVTQ0FQRURfQ0hBUlwiLCBpbmRleDogaSsrLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCJ7XCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJPUEVOXCIsIGluZGV4OiBpLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCJ9XCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJDTE9TRVwiLCBpbmRleDogaSwgdmFsdWU6IHN0cltpKytdIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoYXIgPT09IFwiOlwiKSB7XG4gICAgICBsZXQgbmFtZSA9IFwiXCI7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuXG4gICAgICB3aGlsZSAoaiA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgY29kZSA9IHN0ci5jaGFyQ29kZUF0KGopO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAvLyBgMC05YFxuICAgICAgICAgIChjb2RlID49IDQ4ICYmIGNvZGUgPD0gNTcpIHx8XG4gICAgICAgICAgLy8gYEEtWmBcbiAgICAgICAgICAoY29kZSA+PSA2NSAmJiBjb2RlIDw9IDkwKSB8fFxuICAgICAgICAgIC8vIGBhLXpgXG4gICAgICAgICAgKGNvZGUgPj0gOTcgJiYgY29kZSA8PSAxMjIpIHx8XG4gICAgICAgICAgLy8gYF9gXG4gICAgICAgICAgY29kZSA9PT0gOTVcbiAgICAgICAgKSB7XG4gICAgICAgICAgbmFtZSArPSBzdHJbaisrXTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW5hbWUpIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyIG5hbWUgYXQgJHtpfWApO1xuXG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiTkFNRVwiLCBpbmRleDogaSwgdmFsdWU6IG5hbWUgfSk7XG4gICAgICBpID0gajtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaGFyID09PSBcIihcIikge1xuICAgICAgbGV0IGNvdW50ID0gMTtcbiAgICAgIGxldCBwYXR0ZXJuID0gXCJcIjtcbiAgICAgIGxldCBqID0gaSArIDE7XG5cbiAgICAgIGlmIChzdHJbal0gPT09IFwiP1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFBhdHRlcm4gY2Fubm90IHN0YXJ0IHdpdGggXCI/XCIgYXQgJHtqfWApO1xuICAgICAgfVxuXG4gICAgICB3aGlsZSAoaiA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHN0cltqXSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICBwYXR0ZXJuICs9IHN0cltqKytdICsgc3RyW2orK107XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RyW2pdID09PSBcIilcIikge1xuICAgICAgICAgIGNvdW50LS07XG4gICAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoc3RyW2pdID09PSBcIihcIikge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgaWYgKHN0cltqICsgMV0gIT09IFwiP1wiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBDYXB0dXJpbmcgZ3JvdXBzIGFyZSBub3QgYWxsb3dlZCBhdCAke2p9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0dGVybiArPSBzdHJbaisrXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvdW50KSB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmJhbGFuY2VkIHBhdHRlcm4gYXQgJHtpfWApO1xuICAgICAgaWYgKCFwYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhdHRlcm4gYXQgJHtpfWApO1xuXG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiUEFUVEVSTlwiLCBpbmRleDogaSwgdmFsdWU6IHBhdHRlcm4gfSk7XG4gICAgICBpID0gajtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJDSEFSXCIsIGluZGV4OiBpLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gIH1cblxuICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiRU5EXCIsIGluZGV4OiBpLCB2YWx1ZTogXCJcIiB9KTtcblxuICByZXR1cm4gdG9rZW5zO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTZXQgdGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciByZXBlYXQgcGFyYW1ldGVycy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xuICAvKipcbiAgICogTGlzdCBvZiBjaGFyYWN0ZXJzIHRvIGF1dG9tYXRpY2FsbHkgY29uc2lkZXIgcHJlZml4ZXMgd2hlbiBwYXJzaW5nLlxuICAgKi9cbiAgcHJlZml4ZXM/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5bXSB7XG4gIGNvbnN0IHRva2VucyA9IGxleGVyKHN0cik7XG4gIGNvbnN0IHsgcHJlZml4ZXMgPSBcIi4vXCIgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGRlZmF1bHRQYXR0ZXJuID0gYFteJHtlc2NhcGVTdHJpbmcob3B0aW9ucy5kZWxpbWl0ZXIgfHwgXCIvIz9cIil9XSs/YDtcbiAgY29uc3QgcmVzdWx0OiBUb2tlbltdID0gW107XG4gIGxldCBrZXkgPSAwO1xuICBsZXQgaSA9IDA7XG4gIGxldCBwYXRoID0gXCJcIjtcblxuICBjb25zdCB0cnlDb25zdW1lID0gKHR5cGU6IExleFRva2VuW1widHlwZVwiXSk6IHN0cmluZyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgaWYgKGkgPCB0b2tlbnMubGVuZ3RoICYmIHRva2Vuc1tpXS50eXBlID09PSB0eXBlKSByZXR1cm4gdG9rZW5zW2krK10udmFsdWU7XG4gIH07XG5cbiAgY29uc3QgbXVzdENvbnN1bWUgPSAodHlwZTogTGV4VG9rZW5bXCJ0eXBlXCJdKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IHRyeUNvbnN1bWUodHlwZSk7XG4gICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHJldHVybiB2YWx1ZTtcbiAgICBjb25zdCB7IHR5cGU6IG5leHRUeXBlLCBpbmRleCB9ID0gdG9rZW5zW2ldO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVuZXhwZWN0ZWQgJHtuZXh0VHlwZX0gYXQgJHtpbmRleH0sIGV4cGVjdGVkICR7dHlwZX1gKTtcbiAgfTtcblxuICBjb25zdCBjb25zdW1lVGV4dCA9ICgpOiBzdHJpbmcgPT4ge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICgodmFsdWUgPSB0cnlDb25zdW1lKFwiQ0hBUlwiKSB8fCB0cnlDb25zdW1lKFwiRVNDQVBFRF9DSEFSXCIpKSkge1xuICAgICAgcmVzdWx0ICs9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHdoaWxlIChpIDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IGNoYXIgPSB0cnlDb25zdW1lKFwiQ0hBUlwiKTtcbiAgICBjb25zdCBuYW1lID0gdHJ5Q29uc3VtZShcIk5BTUVcIik7XG4gICAgY29uc3QgcGF0dGVybiA9IHRyeUNvbnN1bWUoXCJQQVRURVJOXCIpO1xuXG4gICAgaWYgKG5hbWUgfHwgcGF0dGVybikge1xuICAgICAgbGV0IHByZWZpeCA9IGNoYXIgfHwgXCJcIjtcblxuICAgICAgaWYgKHByZWZpeGVzLmluZGV4T2YocHJlZml4KSA9PT0gLTEpIHtcbiAgICAgICAgcGF0aCArPSBwcmVmaXg7XG4gICAgICAgIHByZWZpeCA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHBhdGgpO1xuICAgICAgICBwYXRoID0gXCJcIjtcbiAgICAgIH1cblxuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lIHx8IGtleSsrLFxuICAgICAgICBwcmVmaXgsXG4gICAgICAgIHN1ZmZpeDogXCJcIixcbiAgICAgICAgcGF0dGVybjogcGF0dGVybiB8fCBkZWZhdWx0UGF0dGVybixcbiAgICAgICAgbW9kaWZpZXI6IHRyeUNvbnN1bWUoXCJNT0RJRklFUlwiKSB8fCBcIlwiLFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IGNoYXIgfHwgdHJ5Q29uc3VtZShcIkVTQ0FQRURfQ0hBUlwiKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHBhdGggKz0gdmFsdWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAocGF0aCkge1xuICAgICAgcmVzdWx0LnB1c2gocGF0aCk7XG4gICAgICBwYXRoID0gXCJcIjtcbiAgICB9XG5cbiAgICBjb25zdCBvcGVuID0gdHJ5Q29uc3VtZShcIk9QRU5cIik7XG4gICAgaWYgKG9wZW4pIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGNvbnN1bWVUZXh0KCk7XG4gICAgICBjb25zdCBuYW1lID0gdHJ5Q29uc3VtZShcIk5BTUVcIikgfHwgXCJcIjtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSB0cnlDb25zdW1lKFwiUEFUVEVSTlwiKSB8fCBcIlwiO1xuICAgICAgY29uc3Qgc3VmZml4ID0gY29uc3VtZVRleHQoKTtcblxuICAgICAgbXVzdENvbnN1bWUoXCJDTE9TRVwiKTtcblxuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lIHx8IChwYXR0ZXJuID8ga2V5KysgOiBcIlwiKSxcbiAgICAgICAgcGF0dGVybjogbmFtZSAmJiAhcGF0dGVybiA/IGRlZmF1bHRQYXR0ZXJuIDogcGF0dGVybixcbiAgICAgICAgcHJlZml4LFxuICAgICAgICBzdWZmaXgsXG4gICAgICAgIG1vZGlmaWVyOiB0cnlDb25zdW1lKFwiTU9ESUZJRVJcIikgfHwgXCJcIixcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgbXVzdENvbnN1bWUoXCJFTkRcIik7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dC5cbiAgICovXG4gIGVuY29kZT86ICh2YWx1ZTogc3RyaW5nLCB0b2tlbjogS2V5KSA9PiBzdHJpbmc7XG4gIC8qKlxuICAgKiBXaGVuIGBmYWxzZWAgdGhlIGZ1bmN0aW9uIGNhbiBwcm9kdWNlIGFuIGludmFsaWQgKHVubWF0Y2hlZCkgcGF0aC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHZhbGlkYXRlPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgc3RyOiBzdHJpbmcsXG4gIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMgJiBUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyxcbikge1xuICByZXR1cm4gdG9rZW5zVG9GdW5jdGlvbjxQPihwYXJzZShzdHIsIG9wdGlvbnMpLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogRXhwb3NlIGEgbWV0aG9kIGZvciB0cmFuc2Zvcm1pbmcgdG9rZW5zIGludG8gdGhlIHBhdGggZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbnNUb0Z1bmN0aW9uPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KFxuICB0b2tlbnM6IFRva2VuW10sXG4gIG9wdGlvbnM6IFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zID0ge30sXG4pOiBQYXRoRnVuY3Rpb248UD4ge1xuICBjb25zdCByZUZsYWdzID0gZmxhZ3Mob3B0aW9ucyk7XG4gIGNvbnN0IHsgZW5jb2RlID0gKHg6IHN0cmluZykgPT4geCwgdmFsaWRhdGUgPSB0cnVlIH0gPSBvcHRpb25zO1xuXG4gIC8vIENvbXBpbGUgYWxsIHRoZSB0b2tlbnMgaW50byByZWdleHBzLlxuICBjb25zdCBtYXRjaGVzID0gdG9rZW5zLm1hcCgodG9rZW4pID0+IHtcbiAgICBpZiAodHlwZW9mIHRva2VuID09PSBcIm9iamVjdFwiKSB7XG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cChgXig/OiR7dG9rZW4ucGF0dGVybn0pJGAsIHJlRmxhZ3MpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIChkYXRhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4ge1xuICAgIGxldCBwYXRoID0gXCJcIjtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB0b2tlbiA9IHRva2Vuc1tpXTtcblxuICAgICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBwYXRoICs9IHRva2VuO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdmFsdWUgPSBkYXRhID8gZGF0YVt0b2tlbi5uYW1lXSA6IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IG9wdGlvbmFsID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiP1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIjtcbiAgICAgIGNvbnN0IHJlcGVhdCA9IHRva2VuLm1vZGlmaWVyID09PSBcIipcIiB8fCB0b2tlbi5tb2RpZmllciA9PT0gXCIrXCI7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBpZiAoIXJlcGVhdCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gbm90IHJlcGVhdCwgYnV0IGdvdCBhbiBhcnJheWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZiAob3B0aW9uYWwpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gbm90IGJlIGVtcHR5YCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHZhbHVlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29uc3Qgc2VnbWVudCA9IGVuY29kZSh2YWx1ZVtqXSwgdG9rZW4pO1xuXG4gICAgICAgICAgaWYgKHZhbGlkYXRlICYmICEobWF0Y2hlc1tpXSBhcyBSZWdFeHApLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIGBFeHBlY3RlZCBhbGwgXCIke3Rva2VuLm5hbWV9XCIgdG8gbWF0Y2ggXCIke3Rva2VuLnBhdHRlcm59XCIsIGJ1dCBnb3QgXCIke3NlZ21lbnR9XCJgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYXRoICs9IHRva2VuLnByZWZpeCArIHNlZ21lbnQgKyB0b2tlbi5zdWZmaXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgY29uc3Qgc2VnbWVudCA9IGVuY29kZShTdHJpbmcodmFsdWUpLCB0b2tlbik7XG5cbiAgICAgICAgaWYgKHZhbGlkYXRlICYmICEobWF0Y2hlc1tpXSBhcyBSZWdFeHApLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG1hdGNoIFwiJHt0b2tlbi5wYXR0ZXJufVwiLCBidXQgZ290IFwiJHtzZWdtZW50fVwiYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcGF0aCArPSB0b2tlbi5wcmVmaXggKyBzZWdtZW50ICsgdG9rZW4uc3VmZml4O1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdGlvbmFsKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgdHlwZU9mTWVzc2FnZSA9IHJlcGVhdCA/IFwiYW4gYXJyYXlcIiA6IFwiYSBzdHJpbmdcIjtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIGJlICR7dHlwZU9mTWVzc2FnZX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aDtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWdleHBUb0Z1bmN0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgZGVjb2Rpbmcgc3RyaW5ncyBmb3IgcGFyYW1zLlxuICAgKi9cbiAgZGVjb2RlPzogKHZhbHVlOiBzdHJpbmcsIHRva2VuOiBLZXkpID0+IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIG1hdGNoIHJlc3VsdCBjb250YWlucyBkYXRhIGFib3V0IHRoZSBwYXRoIG1hdGNoLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1hdGNoUmVzdWx0PFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+IHtcbiAgcGF0aDogc3RyaW5nO1xuICBpbmRleDogbnVtYmVyO1xuICBwYXJhbXM6IFA7XG59XG5cbi8qKlxuICogQSBtYXRjaCBpcyBlaXRoZXIgYGZhbHNlYCAobm8gbWF0Y2gpIG9yIGEgbWF0Y2ggcmVzdWx0LlxuICovXG5leHBvcnQgdHlwZSBNYXRjaDxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IGZhbHNlIHwgTWF0Y2hSZXN1bHQ8UD47XG5cbi8qKlxuICogVGhlIG1hdGNoIGZ1bmN0aW9uIHRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgbWF0Y2hlZCB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbjxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IChcbiAgcGF0aDogc3RyaW5nLFxuKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBDcmVhdGUgcGF0aCBtYXRjaCBmdW5jdGlvbiBmcm9tIGBwYXRoLXRvLXJlZ2V4cGAgc3BlYy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KFxuICBzdHI6IFBhdGgsXG4gIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMgJiBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgJiBSZWdleHBUb0Z1bmN0aW9uT3B0aW9ucyxcbikge1xuICBjb25zdCBrZXlzOiBLZXlbXSA9IFtdO1xuICBjb25zdCByZSA9IHBhdGhUb1JlZ2V4cChzdHIsIGtleXMsIG9wdGlvbnMpO1xuICByZXR1cm4gcmVnZXhwVG9GdW5jdGlvbjxQPihyZSwga2V5cywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgcGF0aCBtYXRjaCBmdW5jdGlvbiBmcm9tIGBwYXRoLXRvLXJlZ2V4cGAgb3V0cHV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnZXhwVG9GdW5jdGlvbjxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgcmU6IFJlZ0V4cCxcbiAga2V5czogS2V5W10sXG4gIG9wdGlvbnM6IFJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zID0ge30sXG4pOiBNYXRjaEZ1bmN0aW9uPFA+IHtcbiAgY29uc3QgeyBkZWNvZGUgPSAoeDogc3RyaW5nKSA9PiB4IH0gPSBvcHRpb25zO1xuXG4gIHJldHVybiBmdW5jdGlvbiAocGF0aG5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IG0gPSByZS5leGVjKHBhdGhuYW1lKTtcbiAgICBpZiAoIW0pIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHsgMDogcGF0aCwgaW5kZXggfSA9IG07XG4gICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG1baV0gPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGtleSA9IGtleXNbaSAtIDFdO1xuXG4gICAgICBpZiAoa2V5Lm1vZGlmaWVyID09PSBcIipcIiB8fCBrZXkubW9kaWZpZXIgPT09IFwiK1wiKSB7XG4gICAgICAgIHBhcmFtc1trZXkubmFtZV0gPSBtW2ldLnNwbGl0KGtleS5wcmVmaXggKyBrZXkuc3VmZml4KS5tYXAoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRlY29kZSh2YWx1ZSwga2V5KTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXNba2V5Lm5hbWVdID0gZGVjb2RlKG1baV0sIGtleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0aCwgaW5kZXgsIHBhcmFtcyB9O1xuICB9O1xufVxuXG4vKipcbiAqIEVzY2FwZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVN0cmluZyhzdHI6IHN0cmluZykge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbLisqPz1eIToke30oKVtcXF18L1xcXFxdKS9nLCBcIlxcXFwkMVwiKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZsYWdzIGZvciBhIHJlZ2V4cCBmcm9tIHRoZSBvcHRpb25zLlxuICovXG5mdW5jdGlvbiBmbGFncyhvcHRpb25zPzogeyBzZW5zaXRpdmU/OiBib29sZWFuIH0pIHtcbiAgcmV0dXJuIG9wdGlvbnMgJiYgb3B0aW9ucy5zZW5zaXRpdmUgPyBcIlwiIDogXCJpXCI7XG59XG5cbi8qKlxuICogTWV0YWRhdGEgYWJvdXQgYSBrZXkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgS2V5IHtcbiAgbmFtZTogc3RyaW5nIHwgbnVtYmVyO1xuICBwcmVmaXg6IHN0cmluZztcbiAgc3VmZml4OiBzdHJpbmc7XG4gIHBhdHRlcm46IHN0cmluZztcbiAgbW9kaWZpZXI6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHRva2VuIGlzIGEgc3RyaW5nIChub3RoaW5nIHNwZWNpYWwpIG9yIGtleSBtZXRhZGF0YSAoY2FwdHVyZSBncm91cCkuXG4gKi9cbmV4cG9ydCB0eXBlIFRva2VuID0gc3RyaW5nIHwgS2V5O1xuXG4vKipcbiAqIFB1bGwgb3V0IGtleXMgZnJvbSBhIHJlZ2V4cC5cbiAqL1xuZnVuY3Rpb24gcmVnZXhwVG9SZWdleHAocGF0aDogUmVnRXhwLCBrZXlzPzogS2V5W10pOiBSZWdFeHAge1xuICBpZiAoIWtleXMpIHJldHVybiBwYXRoO1xuXG4gIGNvbnN0IGdyb3Vwc1JlZ2V4ID0gL1xcKCg/OlxcPzwoLio/KT4pPyg/IVxcPykvZztcblxuICBsZXQgaW5kZXggPSAwO1xuICBsZXQgZXhlY1Jlc3VsdCA9IGdyb3Vwc1JlZ2V4LmV4ZWMocGF0aC5zb3VyY2UpO1xuICB3aGlsZSAoZXhlY1Jlc3VsdCkge1xuICAgIGtleXMucHVzaCh7XG4gICAgICAvLyBVc2UgcGFyZW50aGVzaXplZCBzdWJzdHJpbmcgbWF0Y2ggaWYgYXZhaWxhYmxlLCBpbmRleCBvdGhlcndpc2VcbiAgICAgIG5hbWU6IGV4ZWNSZXN1bHRbMV0gfHwgaW5kZXgrKyxcbiAgICAgIHByZWZpeDogXCJcIixcbiAgICAgIHN1ZmZpeDogXCJcIixcbiAgICAgIG1vZGlmaWVyOiBcIlwiLFxuICAgICAgcGF0dGVybjogXCJcIixcbiAgICB9KTtcbiAgICBleGVjUmVzdWx0ID0gZ3JvdXBzUmVnZXguZXhlYyhwYXRoLnNvdXJjZSk7XG4gIH1cblxuICByZXR1cm4gcGF0aDtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYW4gYXJyYXkgaW50byBhIHJlZ2V4cC5cbiAqL1xuZnVuY3Rpb24gYXJyYXlUb1JlZ2V4cChcbiAgcGF0aHM6IEFycmF5PHN0cmluZyB8IFJlZ0V4cD4sXG4gIGtleXM/OiBLZXlbXSxcbiAgb3B0aW9ucz86IFRva2Vuc1RvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyxcbik6IFJlZ0V4cCB7XG4gIGNvbnN0IHBhcnRzID0gcGF0aHMubWFwKChwYXRoKSA9PiBwYXRoVG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucykuc291cmNlKTtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoYCg/OiR7cGFydHMuam9pbihcInxcIil9KWAsIGZsYWdzKG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBwYXRoIHJlZ2V4cCBmcm9tIHN0cmluZyBpbnB1dC5cbiAqL1xuZnVuY3Rpb24gc3RyaW5nVG9SZWdleHAoXG4gIHBhdGg6IHN0cmluZyxcbiAga2V5cz86IEtleVtdLFxuICBvcHRpb25zPzogVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zLFxuKSB7XG4gIHJldHVybiB0b2tlbnNUb1JlZ2V4cChwYXJzZShwYXRoLCBvcHRpb25zKSwga2V5cywgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5zVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3b24ndCBhbGxvdyBhbiBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc3RyaWN0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBtYXRjaCB0byB0aGUgZW5kIG9mIHRoZSBzdHJpbmcuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3aWxsIG1hdGNoIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgc3RhcnQ/OiBib29sZWFuO1xuICAvKipcbiAgICogU2V0cyB0aGUgZmluYWwgY2hhcmFjdGVyIGZvciBub24tZW5kaW5nIG9wdGltaXN0aWMgbWF0Y2hlcy4gKGRlZmF1bHQ6IGAvYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbiAgLyoqXG4gICAqIExpc3Qgb2YgY2hhcmFjdGVycyB0aGF0IGNhbiBhbHNvIGJlIFwiZW5kXCIgY2hhcmFjdGVycy5cbiAgICovXG4gIGVuZHNXaXRoPzogc3RyaW5nO1xuICAvKipcbiAgICogRW5jb2RlIHBhdGggdG9rZW5zIGZvciB1c2UgaW4gdGhlIGBSZWdFeHBgLlxuICAgKi9cbiAgZW5jb2RlPzogKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcbn1cblxuLyoqXG4gKiBFeHBvc2UgYSBmdW5jdGlvbiBmb3IgdGFraW5nIHRva2VucyBhbmQgcmV0dXJuaW5nIGEgUmVnRXhwLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5zVG9SZWdleHAoXG4gIHRva2VuczogVG9rZW5bXSxcbiAga2V5cz86IEtleVtdLFxuICBvcHRpb25zOiBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgPSB7fSxcbikge1xuICBjb25zdCB7XG4gICAgc3RyaWN0ID0gZmFsc2UsXG4gICAgc3RhcnQgPSB0cnVlLFxuICAgIGVuZCA9IHRydWUsXG4gICAgZW5jb2RlID0gKHg6IHN0cmluZykgPT4geCxcbiAgICBkZWxpbWl0ZXIgPSBcIi8jP1wiLFxuICAgIGVuZHNXaXRoID0gXCJcIixcbiAgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGVuZHNXaXRoUmUgPSBgWyR7ZXNjYXBlU3RyaW5nKGVuZHNXaXRoKX1dfCRgO1xuICBjb25zdCBkZWxpbWl0ZXJSZSA9IGBbJHtlc2NhcGVTdHJpbmcoZGVsaW1pdGVyKX1dYDtcbiAgbGV0IHJvdXRlID0gc3RhcnQgPyBcIl5cIiA6IFwiXCI7XG5cbiAgLy8gSXRlcmF0ZSBvdmVyIHRoZSB0b2tlbnMgYW5kIGNyZWF0ZSBvdXIgcmVnZXhwIHN0cmluZy5cbiAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICBpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB7XG4gICAgICByb3V0ZSArPSBlc2NhcGVTdHJpbmcoZW5jb2RlKHRva2VuKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGVzY2FwZVN0cmluZyhlbmNvZGUodG9rZW4ucHJlZml4KSk7XG4gICAgICBjb25zdCBzdWZmaXggPSBlc2NhcGVTdHJpbmcoZW5jb2RlKHRva2VuLnN1ZmZpeCkpO1xuXG4gICAgICBpZiAodG9rZW4ucGF0dGVybikge1xuICAgICAgICBpZiAoa2V5cykga2V5cy5wdXNoKHRva2VuKTtcblxuICAgICAgICBpZiAocHJlZml4IHx8IHN1ZmZpeCkge1xuICAgICAgICAgIGlmICh0b2tlbi5tb2RpZmllciA9PT0gXCIrXCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiKSB7XG4gICAgICAgICAgICBjb25zdCBtb2QgPSB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCIgPyBcIj9cIiA6IFwiXCI7XG4gICAgICAgICAgICByb3V0ZSArPSBgKD86JHtwcmVmaXh9KCg/OiR7dG9rZW4ucGF0dGVybn0pKD86JHtzdWZmaXh9JHtwcmVmaXh9KD86JHt0b2tlbi5wYXR0ZXJufSkpKikke3N1ZmZpeH0pJHttb2R9YDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm91dGUgKz0gYCg/OiR7cHJlZml4fSgke3Rva2VuLnBhdHRlcm59KSR7c3VmZml4fSkke3Rva2VuLm1vZGlmaWVyfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0b2tlbi5tb2RpZmllciA9PT0gXCIrXCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiKSB7XG4gICAgICAgICAgICByb3V0ZSArPSBgKCg/OiR7dG9rZW4ucGF0dGVybn0pJHt0b2tlbi5tb2RpZmllcn0pYDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcm91dGUgKz0gYCgke3Rva2VuLnBhdHRlcm59KSR7dG9rZW4ubW9kaWZpZXJ9YDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJvdXRlICs9IGAoPzoke3ByZWZpeH0ke3N1ZmZpeH0pJHt0b2tlbi5tb2RpZmllcn1gO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChlbmQpIHtcbiAgICBpZiAoIXN0cmljdCkgcm91dGUgKz0gYCR7ZGVsaW1pdGVyUmV9P2A7XG5cbiAgICByb3V0ZSArPSAhb3B0aW9ucy5lbmRzV2l0aCA/IFwiJFwiIDogYCg/PSR7ZW5kc1dpdGhSZX0pYDtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlbmRUb2tlbiA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgaXNFbmREZWxpbWl0ZWQgPVxuICAgICAgdHlwZW9mIGVuZFRva2VuID09PSBcInN0cmluZ1wiXG4gICAgICAgID8gZGVsaW1pdGVyUmUuaW5kZXhPZihlbmRUb2tlbltlbmRUb2tlbi5sZW5ndGggLSAxXSkgPiAtMVxuICAgICAgICA6IGVuZFRva2VuID09PSB1bmRlZmluZWQ7XG5cbiAgICBpZiAoIXN0cmljdCkge1xuICAgICAgcm91dGUgKz0gYCg/OiR7ZGVsaW1pdGVyUmV9KD89JHtlbmRzV2l0aFJlfSkpP2A7XG4gICAgfVxuXG4gICAgaWYgKCFpc0VuZERlbGltaXRlZCkge1xuICAgICAgcm91dGUgKz0gYCg/PSR7ZGVsaW1pdGVyUmV9fCR7ZW5kc1dpdGhSZX0pYDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFJlZ0V4cChyb3V0ZSwgZmxhZ3Mob3B0aW9ucykpO1xufVxuXG4vKipcbiAqIFN1cHBvcnRlZCBgcGF0aC10by1yZWdleHBgIGlucHV0IHR5cGVzLlxuICovXG5leHBvcnQgdHlwZSBQYXRoID0gc3RyaW5nIHwgUmVnRXhwIHwgQXJyYXk8c3RyaW5nIHwgUmVnRXhwPjtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGdpdmVuIHBhdGggc3RyaW5nLCByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKlxuICogQW4gZW1wdHkgYXJyYXkgY2FuIGJlIHBhc3NlZCBpbiBmb3IgdGhlIGtleXMsIHdoaWNoIHdpbGwgaG9sZCB0aGVcbiAqIHBsYWNlaG9sZGVyIGtleSBkZXNjcmlwdGlvbnMuIEZvciBleGFtcGxlLCB1c2luZyBgL3VzZXIvOmlkYCwgYGtleXNgIHdpbGxcbiAqIGNvbnRhaW4gYFt7IG5hbWU6ICdpZCcsIGRlbGltaXRlcjogJy8nLCBvcHRpb25hbDogZmFsc2UsIHJlcGVhdDogZmFsc2UgfV1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUmVnZXhwKFxuICBwYXRoOiBQYXRoLFxuICBrZXlzPzogS2V5W10sXG4gIG9wdGlvbnM/OiBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMsXG4pIHtcbiAgaWYgKHBhdGggaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiByZWdleHBUb1JlZ2V4cChwYXRoLCBrZXlzKTtcbiAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHJldHVybiBhcnJheVRvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpO1xuICByZXR1cm4gc3RyaW5nVG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucyk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBQYXJzZU9wdGlvbnMgYXMgcDJyUGFyc2VPcHRpb25zLFxuICAgIFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zIGFzIHAyclRva2Vuc1RvRnVuY3Rpb25PcHRpb25zLFxuICAgIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMgYXMgcDJyUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMsXG4gICAgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIEtleSBhcyBwMnJLZXksXG4gICAgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgVG9rZW5zVG9SZWdleHBPcHRpb25zIGFzIHAyclRva2Vuc1RvUmVnZXhwT3B0aW9ucyxcbiAgICBQYXRoIGFzIHAyclBhdGgsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICB0b2tlbnNUb0Z1bmN0aW9uLFxuICAgIG1hdGNoLFxuICAgIHJlZ2V4cFRvRnVuY3Rpb24sXG4gICAgdG9rZW5zVG9SZWdleHAsXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5zVG9GdW5jdGlvbk9wdGlvbnMgPSBwMnJUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb24gPSBwMnJQYXRoRnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMgPSBwMnJSZWdleHBUb0Z1bmN0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdCA9IHAyck1hdGNoUmVzdWx0O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoID0gcDJyTWF0Y2g7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbiA9IHAyck1hdGNoRnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5zVG9SZWdleHBPcHRpb25zID0gcDJyVG9rZW5zVG9SZWdleHBPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xuICAgIGV4cG9ydCB0eXBlIHBhcnNlID0gdHlwZW9mIHBhcnNlO1xuICAgIGV4cG9ydCB0eXBlIGNvbXBpbGUgPSB0eXBlb2YgY29tcGlsZTtcbiAgICBleHBvcnQgdHlwZSB0b2tlbnNUb0Z1bmN0aW9uID0gdHlwZW9mIHRva2Vuc1RvRnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgbWF0Y2ggPSB0eXBlb2YgbWF0Y2g7XG4gICAgZXhwb3J0IHR5cGUgcmVnZXhwVG9GdW5jdGlvbiA9IHR5cGVvZiByZWdleHBUb0Z1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIHRva2Vuc1RvUmVnZXhwID0gdHlwZW9mIHRva2Vuc1RvUmVnZXhwO1xuICAgIGV4cG9ydCB0eXBlIHBhdGhUb1JlZ2V4cCA9IHR5cGVvZiBwYXRoVG9SZWdleHA7XG59XG5cbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgdG9rZW5zVG9GdW5jdGlvbixcbiAgICBtYXRjaCxcbiAgICByZWdleHBUb0Z1bmN0aW9uLFxuICAgIHRva2Vuc1RvUmVnZXhwLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFpQkE7O0lBRUc7SUFDSCxTQUFTLEtBQUssQ0FBQyxHQUFXLEVBQUE7UUFDeEIsSUFBTSxNQUFNLEdBQWUsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVWLElBQUEsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRTtJQUNyQixRQUFBLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwQixJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzdELFNBQVM7SUFDVixTQUFBO1lBRUQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO2dCQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkUsU0FBUztJQUNWLFNBQUE7WUFFRCxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekQsU0FBUztJQUNW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S0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFPRDs7Ozs7O0lBTUc7YUFDYSxZQUFZLENBQzFCLElBQVUsRUFDVixJQUFZLEVBQ1osT0FBOEMsRUFBQTtRQUU5QyxJQUFJLElBQUksWUFBWSxNQUFNO0lBQUUsUUFBQSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUQsSUFBQSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQUUsT0FBTyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdDOztJQzVtQkE7O0lBRUc7QUE0Q0gsVUFBTSxXQUFXLEdBQUc7UUFDaEIsS0FBSztRQUNMLE9BQU87UUFDUCxnQkFBZ0I7UUFDaEIsS0FBSztRQUNMLGdCQUFnQjtRQUNoQixjQUFjO1FBQ2QsWUFBWTs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9