/*!
 * @cdp/extension-path2regexp 0.9.13
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLmpzIiwic291cmNlcyI6WyJwYXRoLXRvLXJlZ2V4cC9zcmMvaW5kZXgudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRva2VuaXplciByZXN1bHRzLlxuICovXG5pbnRlcmZhY2UgTGV4VG9rZW4ge1xuICB0eXBlOlxuICAgIHwgXCJPUEVOXCJcbiAgICB8IFwiQ0xPU0VcIlxuICAgIHwgXCJQQVRURVJOXCJcbiAgICB8IFwiTkFNRVwiXG4gICAgfCBcIkNIQVJcIlxuICAgIHwgXCJFU0NBUEVEX0NIQVJcIlxuICAgIHwgXCJNT0RJRklFUlwiXG4gICAgfCBcIkVORFwiO1xuICBpbmRleDogbnVtYmVyO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIFRva2VuaXplIGlucHV0IHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gbGV4ZXIoc3RyOiBzdHJpbmcpOiBMZXhUb2tlbltdIHtcbiAgY29uc3QgdG9rZW5zOiBMZXhUb2tlbltdID0gW107XG4gIGxldCBpID0gMDtcblxuICB3aGlsZSAoaSA8IHN0ci5sZW5ndGgpIHtcbiAgICBjb25zdCBjaGFyID0gc3RyW2ldO1xuXG4gICAgaWYgKGNoYXIgPT09IFwiKlwiIHx8IGNoYXIgPT09IFwiK1wiIHx8IGNoYXIgPT09IFwiP1wiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiTU9ESUZJRVJcIiwgaW5kZXg6IGksIHZhbHVlOiBzdHJbaSsrXSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaGFyID09PSBcIlxcXFxcIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVTQ0FQRURfQ0hBUlwiLCBpbmRleDogaSsrLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCJ7XCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJPUEVOXCIsIGluZGV4OiBpLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCJ9XCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJDTE9TRVwiLCBpbmRleDogaSwgdmFsdWU6IHN0cltpKytdIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoYXIgPT09IFwiOlwiKSB7XG4gICAgICBsZXQgbmFtZSA9IFwiXCI7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuXG4gICAgICB3aGlsZSAoaiA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgY29kZSA9IHN0ci5jaGFyQ29kZUF0KGopO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAvLyBgMC05YFxuICAgICAgICAgIChjb2RlID49IDQ4ICYmIGNvZGUgPD0gNTcpIHx8XG4gICAgICAgICAgLy8gYEEtWmBcbiAgICAgICAgICAoY29kZSA+PSA2NSAmJiBjb2RlIDw9IDkwKSB8fFxuICAgICAgICAgIC8vIGBhLXpgXG4gICAgICAgICAgKGNvZGUgPj0gOTcgJiYgY29kZSA8PSAxMjIpIHx8XG4gICAgICAgICAgLy8gYF9gXG4gICAgICAgICAgY29kZSA9PT0gOTVcbiAgICAgICAgKSB7XG4gICAgICAgICAgbmFtZSArPSBzdHJbaisrXTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW5hbWUpIHRocm93IG5ldyBUeXBlRXJyb3IoYE1pc3NpbmcgcGFyYW1ldGVyIG5hbWUgYXQgJHtpfWApO1xuXG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiTkFNRVwiLCBpbmRleDogaSwgdmFsdWU6IG5hbWUgfSk7XG4gICAgICBpID0gajtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaGFyID09PSBcIihcIikge1xuICAgICAgbGV0IGNvdW50ID0gMTtcbiAgICAgIGxldCBwYXR0ZXJuID0gXCJcIjtcbiAgICAgIGxldCBqID0gaSArIDE7XG5cbiAgICAgIGlmIChzdHJbal0gPT09IFwiP1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFBhdHRlcm4gY2Fubm90IHN0YXJ0IHdpdGggXCI/XCIgYXQgJHtqfWApO1xuICAgICAgfVxuXG4gICAgICB3aGlsZSAoaiA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHN0cltqXSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICBwYXR0ZXJuICs9IHN0cltqKytdICsgc3RyW2orK107XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RyW2pdID09PSBcIilcIikge1xuICAgICAgICAgIGNvdW50LS07XG4gICAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoc3RyW2pdID09PSBcIihcIikge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgaWYgKHN0cltqICsgMV0gIT09IFwiP1wiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBDYXB0dXJpbmcgZ3JvdXBzIGFyZSBub3QgYWxsb3dlZCBhdCAke2p9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0dGVybiArPSBzdHJbaisrXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvdW50KSB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmJhbGFuY2VkIHBhdHRlcm4gYXQgJHtpfWApO1xuICAgICAgaWYgKCFwYXR0ZXJuKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhdHRlcm4gYXQgJHtpfWApO1xuXG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiUEFUVEVSTlwiLCBpbmRleDogaSwgdmFsdWU6IHBhdHRlcm4gfSk7XG4gICAgICBpID0gajtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJDSEFSXCIsIGluZGV4OiBpLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gIH1cblxuICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiRU5EXCIsIGluZGV4OiBpLCB2YWx1ZTogXCJcIiB9KTtcblxuICByZXR1cm4gdG9rZW5zO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTZXQgdGhlIGRlZmF1bHQgZGVsaW1pdGVyIGZvciByZXBlYXQgcGFyYW1ldGVycy4gKGRlZmF1bHQ6IGAnLydgKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xuICAvKipcbiAgICogTGlzdCBvZiBjaGFyYWN0ZXJzIHRvIGF1dG9tYXRpY2FsbHkgY29uc2lkZXIgcHJlZml4ZXMgd2hlbiBwYXJzaW5nLlxuICAgKi9cbiAgcHJlZml4ZXM/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3RyOiBzdHJpbmcsIG9wdGlvbnM6IFBhcnNlT3B0aW9ucyA9IHt9KTogVG9rZW5bXSB7XG4gIGNvbnN0IHRva2VucyA9IGxleGVyKHN0cik7XG4gIGNvbnN0IHsgcHJlZml4ZXMgPSBcIi4vXCIgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IGRlZmF1bHRQYXR0ZXJuID0gYFteJHtlc2NhcGVTdHJpbmcob3B0aW9ucy5kZWxpbWl0ZXIgfHwgXCIvIz9cIil9XSs/YDtcbiAgY29uc3QgcmVzdWx0OiBUb2tlbltdID0gW107XG4gIGxldCBrZXkgPSAwO1xuICBsZXQgaSA9IDA7XG4gIGxldCBwYXRoID0gXCJcIjtcblxuICBjb25zdCB0cnlDb25zdW1lID0gKHR5cGU6IExleFRva2VuW1widHlwZVwiXSk6IHN0cmluZyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgaWYgKGkgPCB0b2tlbnMubGVuZ3RoICYmIHRva2Vuc1tpXS50eXBlID09PSB0eXBlKSByZXR1cm4gdG9rZW5zW2krK10udmFsdWU7XG4gIH07XG5cbiAgY29uc3QgbXVzdENvbnN1bWUgPSAodHlwZTogTGV4VG9rZW5bXCJ0eXBlXCJdKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IHRyeUNvbnN1bWUodHlwZSk7XG4gICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHJldHVybiB2YWx1ZTtcbiAgICBjb25zdCB7IHR5cGU6IG5leHRUeXBlLCBpbmRleCB9ID0gdG9rZW5zW2ldO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFVuZXhwZWN0ZWQgJHtuZXh0VHlwZX0gYXQgJHtpbmRleH0sIGV4cGVjdGVkICR7dHlwZX1gKTtcbiAgfTtcblxuICBjb25zdCBjb25zdW1lVGV4dCA9ICgpOiBzdHJpbmcgPT4ge1xuICAgIGxldCByZXN1bHQgPSBcIlwiO1xuICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIHdoaWxlICgodmFsdWUgPSB0cnlDb25zdW1lKFwiQ0hBUlwiKSB8fCB0cnlDb25zdW1lKFwiRVNDQVBFRF9DSEFSXCIpKSkge1xuICAgICAgcmVzdWx0ICs9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHdoaWxlIChpIDwgdG9rZW5zLmxlbmd0aCkge1xuICAgIGNvbnN0IGNoYXIgPSB0cnlDb25zdW1lKFwiQ0hBUlwiKTtcbiAgICBjb25zdCBuYW1lID0gdHJ5Q29uc3VtZShcIk5BTUVcIik7XG4gICAgY29uc3QgcGF0dGVybiA9IHRyeUNvbnN1bWUoXCJQQVRURVJOXCIpO1xuXG4gICAgaWYgKG5hbWUgfHwgcGF0dGVybikge1xuICAgICAgbGV0IHByZWZpeCA9IGNoYXIgfHwgXCJcIjtcblxuICAgICAgaWYgKHByZWZpeGVzLmluZGV4T2YocHJlZml4KSA9PT0gLTEpIHtcbiAgICAgICAgcGF0aCArPSBwcmVmaXg7XG4gICAgICAgIHByZWZpeCA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHBhdGgpO1xuICAgICAgICBwYXRoID0gXCJcIjtcbiAgICAgIH1cblxuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lIHx8IGtleSsrLFxuICAgICAgICBwcmVmaXgsXG4gICAgICAgIHN1ZmZpeDogXCJcIixcbiAgICAgICAgcGF0dGVybjogcGF0dGVybiB8fCBkZWZhdWx0UGF0dGVybixcbiAgICAgICAgbW9kaWZpZXI6IHRyeUNvbnN1bWUoXCJNT0RJRklFUlwiKSB8fCBcIlwiLFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IGNoYXIgfHwgdHJ5Q29uc3VtZShcIkVTQ0FQRURfQ0hBUlwiKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHBhdGggKz0gdmFsdWU7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAocGF0aCkge1xuICAgICAgcmVzdWx0LnB1c2gocGF0aCk7XG4gICAgICBwYXRoID0gXCJcIjtcbiAgICB9XG5cbiAgICBjb25zdCBvcGVuID0gdHJ5Q29uc3VtZShcIk9QRU5cIik7XG4gICAgaWYgKG9wZW4pIHtcbiAgICAgIGNvbnN0IHByZWZpeCA9IGNvbnN1bWVUZXh0KCk7XG4gICAgICBjb25zdCBuYW1lID0gdHJ5Q29uc3VtZShcIk5BTUVcIikgfHwgXCJcIjtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSB0cnlDb25zdW1lKFwiUEFUVEVSTlwiKSB8fCBcIlwiO1xuICAgICAgY29uc3Qgc3VmZml4ID0gY29uc3VtZVRleHQoKTtcblxuICAgICAgbXVzdENvbnN1bWUoXCJDTE9TRVwiKTtcblxuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lIHx8IChwYXR0ZXJuID8ga2V5KysgOiBcIlwiKSxcbiAgICAgICAgcGF0dGVybjogbmFtZSAmJiAhcGF0dGVybiA/IGRlZmF1bHRQYXR0ZXJuIDogcGF0dGVybixcbiAgICAgICAgcHJlZml4LFxuICAgICAgICBzdWZmaXgsXG4gICAgICAgIG1vZGlmaWVyOiB0cnlDb25zdW1lKFwiTU9ESUZJRVJcIikgfHwgXCJcIixcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgbXVzdENvbnN1bWUoXCJFTkRcIik7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGVuY29kaW5nIGlucHV0IHN0cmluZ3MgZm9yIG91dHB1dC5cbiAgICovXG4gIGVuY29kZT86ICh2YWx1ZTogc3RyaW5nLCB0b2tlbjogS2V5KSA9PiBzdHJpbmc7XG4gIC8qKlxuICAgKiBXaGVuIGBmYWxzZWAgdGhlIGZ1bmN0aW9uIGNhbiBwcm9kdWNlIGFuIGludmFsaWQgKHVubWF0Y2hlZCkgcGF0aC4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHZhbGlkYXRlPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgc3RyaW5nIHRvIGEgdGVtcGxhdGUgZnVuY3Rpb24gZm9yIHRoZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZTxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgc3RyOiBzdHJpbmcsXG4gIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMgJiBUb2tlbnNUb0Z1bmN0aW9uT3B0aW9uc1xuKSB7XG4gIHJldHVybiB0b2tlbnNUb0Z1bmN0aW9uPFA+KHBhcnNlKHN0ciwgb3B0aW9ucyksIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgdHlwZSBQYXRoRnVuY3Rpb248UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSAoZGF0YT86IFApID0+IHN0cmluZztcblxuLyoqXG4gKiBFeHBvc2UgYSBtZXRob2QgZm9yIHRyYW5zZm9ybWluZyB0b2tlbnMgaW50byB0aGUgcGF0aCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRva2Vuc1RvRnVuY3Rpb248UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4oXG4gIHRva2VuczogVG9rZW5bXSxcbiAgb3B0aW9uczogVG9rZW5zVG9GdW5jdGlvbk9wdGlvbnMgPSB7fVxuKTogUGF0aEZ1bmN0aW9uPFA+IHtcbiAgY29uc3QgcmVGbGFncyA9IGZsYWdzKG9wdGlvbnMpO1xuICBjb25zdCB7IGVuY29kZSA9ICh4OiBzdHJpbmcpID0+IHgsIHZhbGlkYXRlID0gdHJ1ZSB9ID0gb3B0aW9ucztcblxuICAvLyBDb21waWxlIGFsbCB0aGUgdG9rZW5zIGludG8gcmVnZXhwcy5cbiAgY29uc3QgbWF0Y2hlcyA9IHRva2Vucy5tYXAoKHRva2VuKSA9PiB7XG4gICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4oPzoke3Rva2VuLnBhdHRlcm59KSRgLCByZUZsYWdzKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiAoZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiB8IG51bGwgfCB1bmRlZmluZWQpID0+IHtcbiAgICBsZXQgcGF0aCA9IFwiXCI7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaV07XG5cbiAgICAgIGlmICh0eXBlb2YgdG9rZW4gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcGF0aCArPSB0b2tlbjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YSA/IGRhdGFbdG9rZW4ubmFtZV0gOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBvcHRpb25hbCA9IHRva2VuLm1vZGlmaWVyID09PSBcIj9cIiB8fCB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCI7XG4gICAgICBjb25zdCByZXBlYXQgPSB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKCFyZXBlYXQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG5vdCByZXBlYXQsIGJ1dCBnb3QgYW4gYXJyYXlgXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZiAob3B0aW9uYWwpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gbm90IGJlIGVtcHR5YCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHZhbHVlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgY29uc3Qgc2VnbWVudCA9IGVuY29kZSh2YWx1ZVtqXSwgdG9rZW4pO1xuXG4gICAgICAgICAgaWYgKHZhbGlkYXRlICYmICEobWF0Y2hlc1tpXSBhcyBSZWdFeHApLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIGBFeHBlY3RlZCBhbGwgXCIke3Rva2VuLm5hbWV9XCIgdG8gbWF0Y2ggXCIke3Rva2VuLnBhdHRlcm59XCIsIGJ1dCBnb3QgXCIke3NlZ21lbnR9XCJgXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHBhdGggKz0gdG9rZW4ucHJlZml4ICsgc2VnbWVudCArIHRva2VuLnN1ZmZpeDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICBjb25zdCBzZWdtZW50ID0gZW5jb2RlKFN0cmluZyh2YWx1ZSksIHRva2VuKTtcblxuICAgICAgICBpZiAodmFsaWRhdGUgJiYgIShtYXRjaGVzW2ldIGFzIFJlZ0V4cCkudGVzdChzZWdtZW50KSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gbWF0Y2ggXCIke3Rva2VuLnBhdHRlcm59XCIsIGJ1dCBnb3QgXCIke3NlZ21lbnR9XCJgXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhdGggKz0gdG9rZW4ucHJlZml4ICsgc2VnbWVudCArIHRva2VuLnN1ZmZpeDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25hbCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHR5cGVPZk1lc3NhZ2UgPSByZXBlYXQgPyBcImFuIGFycmF5XCIgOiBcImEgc3RyaW5nXCI7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSAke3R5cGVPZk1lc3NhZ2V9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGRlY29kaW5nIHN0cmluZ3MgZm9yIHBhcmFtcy5cbiAgICovXG4gIGRlY29kZT86ICh2YWx1ZTogc3RyaW5nLCB0b2tlbjogS2V5KSA9PiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiB7XG4gIHBhdGg6IHN0cmluZztcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSAoXG4gIHBhdGg6IHN0cmluZ1xuKSA9PiBNYXRjaDxQPjtcblxuLyoqXG4gKiBDcmVhdGUgcGF0aCBtYXRjaCBmdW5jdGlvbiBmcm9tIGBwYXRoLXRvLXJlZ2V4cGAgc3BlYy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KFxuICBzdHI6IFBhdGgsXG4gIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMgJiBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgJiBSZWdleHBUb0Z1bmN0aW9uT3B0aW9uc1xuKSB7XG4gIGNvbnN0IGtleXM6IEtleVtdID0gW107XG4gIGNvbnN0IHJlID0gcGF0aFRvUmVnZXhwKHN0ciwga2V5cywgb3B0aW9ucyk7XG4gIHJldHVybiByZWdleHBUb0Z1bmN0aW9uPFA+KHJlLCBrZXlzLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBwYXRoIG1hdGNoIGZ1bmN0aW9uIGZyb20gYHBhdGgtdG8tcmVnZXhwYCBvdXRwdXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdleHBUb0Z1bmN0aW9uPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KFxuICByZTogUmVnRXhwLFxuICBrZXlzOiBLZXlbXSxcbiAgb3B0aW9uczogUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMgPSB7fVxuKTogTWF0Y2hGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHsgZGVjb2RlID0gKHg6IHN0cmluZykgPT4geCB9ID0gb3B0aW9ucztcblxuICByZXR1cm4gZnVuY3Rpb24gKHBhdGhuYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtID0gcmUuZXhlYyhwYXRobmFtZSk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB7IDA6IHBhdGgsIGluZGV4IH0gPSBtO1xuICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtW2ldID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2kgLSAxXTtcblxuICAgICAgaWYgKGtleS5tb2RpZmllciA9PT0gXCIqXCIgfHwga2V5Lm1vZGlmaWVyID09PSBcIitcIikge1xuICAgICAgICBwYXJhbXNba2V5Lm5hbWVdID0gbVtpXS5zcGxpdChrZXkucHJlZml4ICsga2V5LnN1ZmZpeCkubWFwKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBkZWNvZGUodmFsdWUsIGtleSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZShtW2ldLCBrZXkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdGgsIGluZGV4LCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGVTdHJpbmcoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oWy4rKj89XiE6JHt9KClbXFxdfC9cXFxcXSkvZywgXCJcXFxcJDFcIik7XG59XG5cbi8qKlxuICogR2V0IHRoZSBmbGFncyBmb3IgYSByZWdleHAgZnJvbSB0aGUgb3B0aW9ucy5cbiAqL1xuZnVuY3Rpb24gZmxhZ3Mob3B0aW9ucz86IHsgc2Vuc2l0aXZlPzogYm9vbGVhbiB9KSB7XG4gIHJldHVybiBvcHRpb25zICYmIG9wdGlvbnMuc2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiO1xufVxuXG4vKipcbiAqIE1ldGFkYXRhIGFib3V0IGEga2V5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEtleSB7XG4gIG5hbWU6IHN0cmluZyB8IG51bWJlcjtcbiAgcHJlZml4OiBzdHJpbmc7XG4gIHN1ZmZpeDogc3RyaW5nO1xuICBwYXR0ZXJuOiBzdHJpbmc7XG4gIG1vZGlmaWVyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0b2tlbiBpcyBhIHN0cmluZyAobm90aGluZyBzcGVjaWFsKSBvciBrZXkgbWV0YWRhdGEgKGNhcHR1cmUgZ3JvdXApLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IHN0cmluZyB8IEtleTtcblxuLyoqXG4gKiBQdWxsIG91dCBrZXlzIGZyb20gYSByZWdleHAuXG4gKi9cbmZ1bmN0aW9uIHJlZ2V4cFRvUmVnZXhwKHBhdGg6IFJlZ0V4cCwga2V5cz86IEtleVtdKTogUmVnRXhwIHtcbiAgaWYgKCFrZXlzKSByZXR1cm4gcGF0aDtcblxuICBjb25zdCBncm91cHNSZWdleCA9IC9cXCgoPzpcXD88KC4qPyk+KT8oPyFcXD8pL2c7XG5cbiAgbGV0IGluZGV4ID0gMDtcbiAgbGV0IGV4ZWNSZXN1bHQgPSBncm91cHNSZWdleC5leGVjKHBhdGguc291cmNlKTtcbiAgd2hpbGUgKGV4ZWNSZXN1bHQpIHtcbiAgICBrZXlzLnB1c2goe1xuICAgICAgLy8gVXNlIHBhcmVudGhlc2l6ZWQgc3Vic3RyaW5nIG1hdGNoIGlmIGF2YWlsYWJsZSwgaW5kZXggb3RoZXJ3aXNlXG4gICAgICBuYW1lOiBleGVjUmVzdWx0WzFdIHx8IGluZGV4KyssXG4gICAgICBwcmVmaXg6IFwiXCIsXG4gICAgICBzdWZmaXg6IFwiXCIsXG4gICAgICBtb2RpZmllcjogXCJcIixcbiAgICAgIHBhdHRlcm46IFwiXCIsXG4gICAgfSk7XG4gICAgZXhlY1Jlc3VsdCA9IGdyb3Vwc1JlZ2V4LmV4ZWMocGF0aC5zb3VyY2UpO1xuICB9XG5cbiAgcmV0dXJuIHBhdGg7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIGFycmF5IGludG8gYSByZWdleHAuXG4gKi9cbmZ1bmN0aW9uIGFycmF5VG9SZWdleHAoXG4gIHBhdGhzOiBBcnJheTxzdHJpbmcgfCBSZWdFeHA+LFxuICBrZXlzPzogS2V5W10sXG4gIG9wdGlvbnM/OiBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnNcbik6IFJlZ0V4cCB7XG4gIGNvbnN0IHBhcnRzID0gcGF0aHMubWFwKChwYXRoKSA9PiBwYXRoVG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucykuc291cmNlKTtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoYCg/OiR7cGFydHMuam9pbihcInxcIil9KWAsIGZsYWdzKG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBwYXRoIHJlZ2V4cCBmcm9tIHN0cmluZyBpbnB1dC5cbiAqL1xuZnVuY3Rpb24gc3RyaW5nVG9SZWdleHAoXG4gIHBhdGg6IHN0cmluZyxcbiAga2V5cz86IEtleVtdLFxuICBvcHRpb25zPzogVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zXG4pIHtcbiAgcmV0dXJuIHRva2Vuc1RvUmVnZXhwKHBhcnNlKHBhdGgsIG9wdGlvbnMpLCBrZXlzLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3aWxsIGJlIGNhc2Ugc2Vuc2l0aXZlLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHNlbnNpdGl2ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdvbid0IGFsbG93IGFuIG9wdGlvbmFsIHRyYWlsaW5nIGRlbGltaXRlciB0byBtYXRjaC4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzdHJpY3Q/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3aWxsIG1hdGNoIHRvIHRoZSBlbmQgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuZD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdpbGwgbWF0Y2ggZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmcuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBzdGFydD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBmaW5hbCBjaGFyYWN0ZXIgZm9yIG5vbi1lbmRpbmcgb3B0aW1pc3RpYyBtYXRjaGVzLiAoZGVmYXVsdDogYC9gKVxuICAgKi9cbiAgZGVsaW1pdGVyPzogc3RyaW5nO1xuICAvKipcbiAgICogTGlzdCBvZiBjaGFyYWN0ZXJzIHRoYXQgY2FuIGFsc28gYmUgXCJlbmRcIiBjaGFyYWN0ZXJzLlxuICAgKi9cbiAgZW5kc1dpdGg/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBFbmNvZGUgcGF0aCB0b2tlbnMgZm9yIHVzZSBpbiB0aGUgYFJlZ0V4cGAuXG4gICAqL1xuICBlbmNvZGU/OiAodmFsdWU6IHN0cmluZykgPT4gc3RyaW5nO1xufVxuXG4vKipcbiAqIEV4cG9zZSBhIGZ1bmN0aW9uIGZvciB0YWtpbmcgdG9rZW5zIGFuZCByZXR1cm5pbmcgYSBSZWdFeHAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbnNUb1JlZ2V4cChcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBrZXlzPzogS2V5W10sXG4gIG9wdGlvbnM6IFRva2Vuc1RvUmVnZXhwT3B0aW9ucyA9IHt9XG4pIHtcbiAgY29uc3Qge1xuICAgIHN0cmljdCA9IGZhbHNlLFxuICAgIHN0YXJ0ID0gdHJ1ZSxcbiAgICBlbmQgPSB0cnVlLFxuICAgIGVuY29kZSA9ICh4OiBzdHJpbmcpID0+IHgsXG4gICAgZGVsaW1pdGVyID0gXCIvIz9cIixcbiAgICBlbmRzV2l0aCA9IFwiXCIsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBlbmRzV2l0aFJlID0gYFske2VzY2FwZVN0cmluZyhlbmRzV2l0aCl9XXwkYDtcbiAgY29uc3QgZGVsaW1pdGVyUmUgPSBgWyR7ZXNjYXBlU3RyaW5nKGRlbGltaXRlcil9XWA7XG4gIGxldCByb3V0ZSA9IHN0YXJ0ID8gXCJeXCIgOiBcIlwiO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgdG9rZW5zIGFuZCBjcmVhdGUgb3VyIHJlZ2V4cCBzdHJpbmcuXG4gIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgcm91dGUgKz0gZXNjYXBlU3RyaW5nKGVuY29kZSh0b2tlbikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBwcmVmaXggPSBlc2NhcGVTdHJpbmcoZW5jb2RlKHRva2VuLnByZWZpeCkpO1xuICAgICAgY29uc3Qgc3VmZml4ID0gZXNjYXBlU3RyaW5nKGVuY29kZSh0b2tlbi5zdWZmaXgpKTtcblxuICAgICAgaWYgKHRva2VuLnBhdHRlcm4pIHtcbiAgICAgICAgaWYgKGtleXMpIGtleXMucHVzaCh0b2tlbik7XG5cbiAgICAgICAgaWYgKHByZWZpeCB8fCBzdWZmaXgpIHtcbiAgICAgICAgICBpZiAodG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIikge1xuICAgICAgICAgICAgY29uc3QgbW9kID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiID8gXCI/XCIgOiBcIlwiO1xuICAgICAgICAgICAgcm91dGUgKz0gYCg/OiR7cHJlZml4fSgoPzoke3Rva2VuLnBhdHRlcm59KSg/OiR7c3VmZml4fSR7cHJlZml4fSg/OiR7dG9rZW4ucGF0dGVybn0pKSopJHtzdWZmaXh9KSR7bW9kfWA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvdXRlICs9IGAoPzoke3ByZWZpeH0oJHt0b2tlbi5wYXR0ZXJufSkke3N1ZmZpeH0pJHt0b2tlbi5tb2RpZmllcn1gO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIikge1xuICAgICAgICAgICAgcm91dGUgKz0gYCgoPzoke3Rva2VuLnBhdHRlcm59KSR7dG9rZW4ubW9kaWZpZXJ9KWA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvdXRlICs9IGAoJHt0b2tlbi5wYXR0ZXJufSkke3Rva2VuLm1vZGlmaWVyfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByb3V0ZSArPSBgKD86JHtwcmVmaXh9JHtzdWZmaXh9KSR7dG9rZW4ubW9kaWZpZXJ9YDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZW5kKSB7XG4gICAgaWYgKCFzdHJpY3QpIHJvdXRlICs9IGAke2RlbGltaXRlclJlfT9gO1xuXG4gICAgcm91dGUgKz0gIW9wdGlvbnMuZW5kc1dpdGggPyBcIiRcIiA6IGAoPz0ke2VuZHNXaXRoUmV9KWA7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW5kVG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IGlzRW5kRGVsaW1pdGVkID1cbiAgICAgIHR5cGVvZiBlbmRUb2tlbiA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IGRlbGltaXRlclJlLmluZGV4T2YoZW5kVG9rZW5bZW5kVG9rZW4ubGVuZ3RoIC0gMV0pID4gLTFcbiAgICAgICAgOiBlbmRUb2tlbiA9PT0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKCFzdHJpY3QpIHtcbiAgICAgIHJvdXRlICs9IGAoPzoke2RlbGltaXRlclJlfSg/PSR7ZW5kc1dpdGhSZX0pKT9gO1xuICAgIH1cblxuICAgIGlmICghaXNFbmREZWxpbWl0ZWQpIHtcbiAgICAgIHJvdXRlICs9IGAoPz0ke2RlbGltaXRlclJlfXwke2VuZHNXaXRoUmV9KWA7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAocm91dGUsIGZsYWdzKG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBTdXBwb3J0ZWQgYHBhdGgtdG8tcmVnZXhwYCBpbnB1dCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFJlZ0V4cCB8IEFycmF5PHN0cmluZyB8IFJlZ0V4cD47XG5cbi8qKlxuICogTm9ybWFsaXplIHRoZSBnaXZlbiBwYXRoIHN0cmluZywgcmV0dXJuaW5nIGEgcmVndWxhciBleHByZXNzaW9uLlxuICpcbiAqIEFuIGVtcHR5IGFycmF5IGNhbiBiZSBwYXNzZWQgaW4gZm9yIHRoZSBrZXlzLCB3aGljaCB3aWxsIGhvbGQgdGhlXG4gKiBwbGFjZWhvbGRlciBrZXkgZGVzY3JpcHRpb25zLiBGb3IgZXhhbXBsZSwgdXNpbmcgYC91c2VyLzppZGAsIGBrZXlzYCB3aWxsXG4gKiBjb250YWluIGBbeyBuYW1lOiAnaWQnLCBkZWxpbWl0ZXI6ICcvJywgb3B0aW9uYWw6IGZhbHNlLCByZXBlYXQ6IGZhbHNlIH1dYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1JlZ2V4cChcbiAgcGF0aDogUGF0aCxcbiAga2V5cz86IEtleVtdLFxuICBvcHRpb25zPzogVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zXG4pIHtcbiAgaWYgKHBhdGggaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiByZWdleHBUb1JlZ2V4cChwYXRoLCBrZXlzKTtcbiAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHJldHVybiBhcnJheVRvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpO1xuICByZXR1cm4gc3RyaW5nVG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucyk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBQYXJzZU9wdGlvbnMgYXMgcDJyUGFyc2VPcHRpb25zLFxuICAgIFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zIGFzIHAyclRva2Vuc1RvRnVuY3Rpb25PcHRpb25zLFxuICAgIFBhdGhGdW5jdGlvbiBhcyBwMnJQYXRoRnVuY3Rpb24sXG4gICAgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMgYXMgcDJyUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMsXG4gICAgTWF0Y2hSZXN1bHQgYXMgcDJyTWF0Y2hSZXN1bHQsXG4gICAgTWF0Y2ggYXMgcDJyTWF0Y2gsXG4gICAgTWF0Y2hGdW5jdGlvbiBhcyBwMnJNYXRjaEZ1bmN0aW9uLFxuICAgIEtleSBhcyBwMnJLZXksXG4gICAgVG9rZW4gYXMgcDJyVG9rZW4sXG4gICAgVG9rZW5zVG9SZWdleHBPcHRpb25zIGFzIHAyclRva2Vuc1RvUmVnZXhwT3B0aW9ucyxcbiAgICBQYXRoIGFzIHAyclBhdGgsXG4gICAgcGFyc2UsXG4gICAgY29tcGlsZSxcbiAgICB0b2tlbnNUb0Z1bmN0aW9uLFxuICAgIG1hdGNoLFxuICAgIHJlZ2V4cFRvRnVuY3Rpb24sXG4gICAgdG9rZW5zVG9SZWdleHAsXG4gICAgcGF0aFRvUmVnZXhwLFxufSBmcm9tICdwYXRoLXRvLXJlZ2V4cCc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIHBhdGgycmVnZXhwIHtcbiAgICBleHBvcnQgdHlwZSBQYXJzZU9wdGlvbnMgPSBwMnJQYXJzZU9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5zVG9GdW5jdGlvbk9wdGlvbnMgPSBwMnJUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoRnVuY3Rpb24gPSBwMnJQYXRoRnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMgPSBwMnJSZWdleHBUb0Z1bmN0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBNYXRjaFJlc3VsdCA9IHAyck1hdGNoUmVzdWx0O1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoID0gcDJyTWF0Y2g7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hGdW5jdGlvbiA9IHAyck1hdGNoRnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgS2V5ID0gcDJyS2V5O1xuICAgIGV4cG9ydCB0eXBlIFRva2VuID0gcDJyVG9rZW47XG4gICAgZXhwb3J0IHR5cGUgVG9rZW5zVG9SZWdleHBPcHRpb25zID0gcDJyVG9rZW5zVG9SZWdleHBPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFBhdGggPSBwMnJQYXRoO1xuICAgIGV4cG9ydCB0eXBlIHBhcnNlID0gdHlwZW9mIHBhcnNlO1xuICAgIGV4cG9ydCB0eXBlIGNvbXBpbGUgPSB0eXBlb2YgY29tcGlsZTtcbiAgICBleHBvcnQgdHlwZSB0b2tlbnNUb0Z1bmN0aW9uID0gdHlwZW9mIHRva2Vuc1RvRnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgbWF0Y2ggPSB0eXBlb2YgbWF0Y2g7XG4gICAgZXhwb3J0IHR5cGUgcmVnZXhwVG9GdW5jdGlvbiA9IHR5cGVvZiByZWdleHBUb0Z1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIHRva2Vuc1RvUmVnZXhwID0gdHlwZW9mIHRva2Vuc1RvUmVnZXhwO1xuICAgIGV4cG9ydCB0eXBlIHBhdGhUb1JlZ2V4cCA9IHR5cGVvZiBwYXRoVG9SZWdleHA7XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbmNvbnN0IHBhdGgycmVnZXhwID0ge1xuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgdG9rZW5zVG9GdW5jdGlvbixcbiAgICBtYXRjaCxcbiAgICByZWdleHBUb0Z1bmN0aW9uLFxuICAgIHRva2Vuc1RvUmVnZXhwLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn07XG5cbmV4cG9ydCB7IHBhdGgycmVnZXhwIH07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFpQkE7O0lBRUc7SUFDSCxTQUFTLEtBQUssQ0FBQyxHQUFXLEVBQUE7UUFDeEIsSUFBTSxNQUFNLEdBQWUsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVWLElBQUEsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRTtJQUNyQixRQUFBLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwQixJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzdELFNBQVM7SUFDVixTQUFBO1lBRUQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO2dCQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkUsU0FBUztJQUNWLFNBQUE7WUFFRCxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcs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Q0FBQztJQUM3QyxTQUFBO0lBQ0YsS0FBQTtRQUVELE9BQU8sSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFPRDs7Ozs7O0lBTUc7YUFDYSxZQUFZLENBQzFCLElBQVUsRUFDVixJQUFZLEVBQ1osT0FBOEMsRUFBQTtRQUU5QyxJQUFJLElBQUksWUFBWSxNQUFNO0lBQUUsUUFBQSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUQsSUFBQSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQUUsT0FBTyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdDOztJQzVtQkE7O0lBRUc7SUE0Q0g7QUFDQSxVQUFNLFdBQVcsR0FBRztRQUNoQixLQUFLO1FBQ0wsT0FBTztRQUNQLGdCQUFnQjtRQUNoQixLQUFLO1FBQ0wsZ0JBQWdCO1FBQ2hCLGNBQWM7UUFDZCxZQUFZOzs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9
