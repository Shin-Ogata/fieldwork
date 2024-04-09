/*!
 * @cdp/extension-path2regexp 0.9.18
 *   extension for conversion path to regexp library
 */

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

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUb2tlbml6ZXIgcmVzdWx0cy5cbiAqL1xuaW50ZXJmYWNlIExleFRva2VuIHtcbiAgdHlwZTpcbiAgICB8IFwiT1BFTlwiXG4gICAgfCBcIkNMT1NFXCJcbiAgICB8IFwiUEFUVEVSTlwiXG4gICAgfCBcIk5BTUVcIlxuICAgIHwgXCJDSEFSXCJcbiAgICB8IFwiRVNDQVBFRF9DSEFSXCJcbiAgICB8IFwiTU9ESUZJRVJcIlxuICAgIHwgXCJFTkRcIjtcbiAgaW5kZXg6IG51bWJlcjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBUb2tlbml6ZSBpbnB1dCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGxleGVyKHN0cjogc3RyaW5nKTogTGV4VG9rZW5bXSB7XG4gIGNvbnN0IHRva2VuczogTGV4VG9rZW5bXSA9IFtdO1xuICBsZXQgaSA9IDA7XG5cbiAgd2hpbGUgKGkgPCBzdHIubGVuZ3RoKSB7XG4gICAgY29uc3QgY2hhciA9IHN0cltpXTtcblxuICAgIGlmIChjaGFyID09PSBcIipcIiB8fCBjaGFyID09PSBcIitcIiB8fCBjaGFyID09PSBcIj9cIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIk1PRElGSUVSXCIsIGluZGV4OiBpLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJFU0NBUEVEX0NIQVJcIiwgaW5kZXg6IGkrKywgdmFsdWU6IHN0cltpKytdIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoYXIgPT09IFwie1wiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiT1BFTlwiLCBpbmRleDogaSwgdmFsdWU6IHN0cltpKytdIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoYXIgPT09IFwifVwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiQ0xPU0VcIiwgaW5kZXg6IGksIHZhbHVlOiBzdHJbaSsrXSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaGFyID09PSBcIjpcIikge1xuICAgICAgbGV0IG5hbWUgPSBcIlwiO1xuICAgICAgbGV0IGogPSBpICsgMTtcblxuICAgICAgd2hpbGUgKGogPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBzdHIuY2hhckNvZGVBdChqKTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgLy8gYDAtOWBcbiAgICAgICAgICAoY29kZSA+PSA0OCAmJiBjb2RlIDw9IDU3KSB8fFxuICAgICAgICAgIC8vIGBBLVpgXG4gICAgICAgICAgKGNvZGUgPj0gNjUgJiYgY29kZSA8PSA5MCkgfHxcbiAgICAgICAgICAvLyBgYS16YFxuICAgICAgICAgIChjb2RlID49IDk3ICYmIGNvZGUgPD0gMTIyKSB8fFxuICAgICAgICAgIC8vIGBfYFxuICAgICAgICAgIGNvZGUgPT09IDk1XG4gICAgICAgICkge1xuICAgICAgICAgIG5hbWUgKz0gc3RyW2orK107XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKCFuYW1lKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0ICR7aX1gKTtcblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIk5BTUVcIiwgaW5kZXg6IGksIHZhbHVlOiBuYW1lIH0pO1xuICAgICAgaSA9IGo7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCIoXCIpIHtcbiAgICAgIGxldCBjb3VudCA9IDE7XG4gICAgICBsZXQgcGF0dGVybiA9IFwiXCI7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuXG4gICAgICBpZiAoc3RyW2pdID09PSBcIj9cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBQYXR0ZXJuIGNhbm5vdCBzdGFydCB3aXRoIFwiP1wiIGF0ICR7an1gKTtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGogPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgIGlmIChzdHJbal0gPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgcGF0dGVybiArPSBzdHJbaisrXSArIHN0cltqKytdO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cltqXSA9PT0gXCIpXCIpIHtcbiAgICAgICAgICBjb3VudC0tO1xuICAgICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHN0cltqXSA9PT0gXCIoXCIpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgIGlmIChzdHJbaiArIDFdICE9PSBcIj9cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgQ2FwdHVyaW5nIGdyb3VwcyBhcmUgbm90IGFsbG93ZWQgYXQgJHtqfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBhdHRlcm4gKz0gc3RyW2orK107XG4gICAgICB9XG5cbiAgICAgIGlmIChjb3VudCkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5iYWxhbmNlZCBwYXR0ZXJuIGF0ICR7aX1gKTtcbiAgICAgIGlmICghcGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXR0ZXJuIGF0ICR7aX1gKTtcblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIlBBVFRFUk5cIiwgaW5kZXg6IGksIHZhbHVlOiBwYXR0ZXJuIH0pO1xuICAgICAgaSA9IGo7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiQ0hBUlwiLCBpbmRleDogaSwgdmFsdWU6IHN0cltpKytdIH0pO1xuICB9XG5cbiAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVORFwiLCBpbmRleDogaSwgdmFsdWU6IFwiXCIgfSk7XG5cbiAgcmV0dXJuIHRva2Vucztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogU2V0IHRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3IgcmVwZWF0IHBhcmFtZXRlcnMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbiAgLyoqXG4gICAqIExpc3Qgb2YgY2hhcmFjdGVycyB0byBhdXRvbWF0aWNhbGx5IGNvbnNpZGVyIHByZWZpeGVzIHdoZW4gcGFyc2luZy5cbiAgICovXG4gIHByZWZpeGVzPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cjogc3RyaW5nLCBvcHRpb25zOiBQYXJzZU9wdGlvbnMgPSB7fSk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnMgPSBsZXhlcihzdHIpO1xuICBjb25zdCB7IHByZWZpeGVzID0gXCIuL1wiIH0gPSBvcHRpb25zO1xuICBjb25zdCBkZWZhdWx0UGF0dGVybiA9IGBbXiR7ZXNjYXBlU3RyaW5nKG9wdGlvbnMuZGVsaW1pdGVyIHx8IFwiLyM/XCIpfV0rP2A7XG4gIGNvbnN0IHJlc3VsdDogVG9rZW5bXSA9IFtdO1xuICBsZXQga2V5ID0gMDtcbiAgbGV0IGkgPSAwO1xuICBsZXQgcGF0aCA9IFwiXCI7XG5cbiAgY29uc3QgdHJ5Q29uc3VtZSA9ICh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcgfCB1bmRlZmluZWQgPT4ge1xuICAgIGlmIChpIDwgdG9rZW5zLmxlbmd0aCAmJiB0b2tlbnNbaV0udHlwZSA9PT0gdHlwZSkgcmV0dXJuIHRva2Vuc1tpKytdLnZhbHVlO1xuICB9O1xuXG4gIGNvbnN0IG11c3RDb25zdW1lID0gKHR5cGU6IExleFRva2VuW1widHlwZVwiXSk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSB0cnlDb25zdW1lKHR5cGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsdWU7XG4gICAgY29uc3QgeyB0eXBlOiBuZXh0VHlwZSwgaW5kZXggfSA9IHRva2Vuc1tpXTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmV4cGVjdGVkICR7bmV4dFR5cGV9IGF0ICR7aW5kZXh9LCBleHBlY3RlZCAke3R5cGV9YCk7XG4gIH07XG5cbiAgY29uc3QgY29uc3VtZVRleHQgPSAoKTogc3RyaW5nID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB3aGlsZSAoKHZhbHVlID0gdHJ5Q29uc3VtZShcIkNIQVJcIikgfHwgdHJ5Q29uc3VtZShcIkVTQ0FQRURfQ0hBUlwiKSkpIHtcbiAgICAgIHJlc3VsdCArPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICB3aGlsZSAoaSA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCBjaGFyID0gdHJ5Q29uc3VtZShcIkNIQVJcIik7XG4gICAgY29uc3QgbmFtZSA9IHRyeUNvbnN1bWUoXCJOQU1FXCIpO1xuICAgIGNvbnN0IHBhdHRlcm4gPSB0cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcblxuICAgIGlmIChuYW1lIHx8IHBhdHRlcm4pIHtcbiAgICAgIGxldCBwcmVmaXggPSBjaGFyIHx8IFwiXCI7XG5cbiAgICAgIGlmIChwcmVmaXhlcy5pbmRleE9mKHByZWZpeCkgPT09IC0xKSB7XG4gICAgICAgIHBhdGggKz0gcHJlZml4O1xuICAgICAgICBwcmVmaXggPSBcIlwiO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aCkge1xuICAgICAgICByZXN1bHQucHVzaChwYXRoKTtcbiAgICAgICAgcGF0aCA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCBrZXkrKyxcbiAgICAgICAgcHJlZml4LFxuICAgICAgICBzdWZmaXg6IFwiXCIsXG4gICAgICAgIHBhdHRlcm46IHBhdHRlcm4gfHwgZGVmYXVsdFBhdHRlcm4sXG4gICAgICAgIG1vZGlmaWVyOiB0cnlDb25zdW1lKFwiTU9ESUZJRVJcIikgfHwgXCJcIixcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSBjaGFyIHx8IHRyeUNvbnN1bWUoXCJFU0NBUEVEX0NIQVJcIik7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICBwYXRoICs9IHZhbHVlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHBhdGgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IFwiXCI7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BlbiA9IHRyeUNvbnN1bWUoXCJPUEVOXCIpO1xuICAgIGlmIChvcGVuKSB7XG4gICAgICBjb25zdCBwcmVmaXggPSBjb25zdW1lVGV4dCgpO1xuICAgICAgY29uc3QgbmFtZSA9IHRyeUNvbnN1bWUoXCJOQU1FXCIpIHx8IFwiXCI7XG4gICAgICBjb25zdCBwYXR0ZXJuID0gdHJ5Q29uc3VtZShcIlBBVFRFUk5cIikgfHwgXCJcIjtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IGNvbnN1bWVUZXh0KCk7XG5cbiAgICAgIG11c3RDb25zdW1lKFwiQ0xPU0VcIik7XG5cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCAocGF0dGVybiA/IGtleSsrIDogXCJcIiksXG4gICAgICAgIHBhdHRlcm46IG5hbWUgJiYgIXBhdHRlcm4gPyBkZWZhdWx0UGF0dGVybiA6IHBhdHRlcm4sXG4gICAgICAgIHByZWZpeCxcbiAgICAgICAgc3VmZml4LFxuICAgICAgICBtb2RpZmllcjogdHJ5Q29uc3VtZShcIk1PRElGSUVSXCIpIHx8IFwiXCIsXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIG11c3RDb25zdW1lKFwiRU5EXCIpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQuXG4gICAqL1xuICBlbmNvZGU/OiAodmFsdWU6IHN0cmluZywgdG9rZW46IEtleSkgPT4gc3RyaW5nO1xuICAvKipcbiAgICogV2hlbiBgZmFsc2VgIHRoZSBmdW5jdGlvbiBjYW4gcHJvZHVjZSBhbiBpbnZhbGlkICh1bm1hdGNoZWQpIHBhdGguIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB2YWxpZGF0ZT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4oXG4gIHN0cjogc3RyaW5nLFxuICBvcHRpb25zPzogUGFyc2VPcHRpb25zICYgVG9rZW5zVG9GdW5jdGlvbk9wdGlvbnMsXG4pIHtcbiAgcmV0dXJuIHRva2Vuc1RvRnVuY3Rpb248UD4ocGFyc2Uoc3RyLCBvcHRpb25zKSwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCB0eXBlIFBhdGhGdW5jdGlvbjxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiA9IChkYXRhPzogUCkgPT4gc3RyaW5nO1xuXG4vKipcbiAqIEV4cG9zZSBhIG1ldGhvZCBmb3IgdHJhbnNmb3JtaW5nIHRva2VucyBpbnRvIHRoZSBwYXRoIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5zVG9GdW5jdGlvbjxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgdG9rZW5zOiBUb2tlbltdLFxuICBvcHRpb25zOiBUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyA9IHt9LFxuKTogUGF0aEZ1bmN0aW9uPFA+IHtcbiAgY29uc3QgcmVGbGFncyA9IGZsYWdzKG9wdGlvbnMpO1xuICBjb25zdCB7IGVuY29kZSA9ICh4OiBzdHJpbmcpID0+IHgsIHZhbGlkYXRlID0gdHJ1ZSB9ID0gb3B0aW9ucztcblxuICAvLyBDb21waWxlIGFsbCB0aGUgdG9rZW5zIGludG8gcmVnZXhwcy5cbiAgY29uc3QgbWF0Y2hlcyA9IHRva2Vucy5tYXAoKHRva2VuKSA9PiB7XG4gICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJvYmplY3RcIikge1xuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4oPzoke3Rva2VuLnBhdHRlcm59KSRgLCByZUZsYWdzKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiAoZGF0YTogUmVjb3JkPHN0cmluZywgYW55PiB8IG51bGwgfCB1bmRlZmluZWQpID0+IHtcbiAgICBsZXQgcGF0aCA9IFwiXCI7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnNbaV07XG5cbiAgICAgIGlmICh0eXBlb2YgdG9rZW4gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcGF0aCArPSB0b2tlbjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gZGF0YSA/IGRhdGFbdG9rZW4ubmFtZV0gOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBvcHRpb25hbCA9IHRva2VuLm1vZGlmaWVyID09PSBcIj9cIiB8fCB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCI7XG4gICAgICBjb25zdCByZXBlYXQgPSB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKCFyZXBlYXQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG5vdCByZXBlYXQsIGJ1dCBnb3QgYW4gYXJyYXlgLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYgKG9wdGlvbmFsKSBjb250aW51ZTtcblxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG5vdCBiZSBlbXB0eWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB2YWx1ZS5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBlbmNvZGUodmFsdWVbal0sIHRva2VuKTtcblxuICAgICAgICAgIGlmICh2YWxpZGF0ZSAmJiAhKG1hdGNoZXNbaV0gYXMgUmVnRXhwKS50ZXN0KHNlZ21lbnQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICBgRXhwZWN0ZWQgYWxsIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG1hdGNoIFwiJHt0b2tlbi5wYXR0ZXJufVwiLCBidXQgZ290IFwiJHtzZWdtZW50fVwiYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcGF0aCArPSB0b2tlbi5wcmVmaXggKyBzZWdtZW50ICsgdG9rZW4uc3VmZml4O1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGNvbnN0IHNlZ21lbnQgPSBlbmNvZGUoU3RyaW5nKHZhbHVlKSwgdG9rZW4pO1xuXG4gICAgICAgIGlmICh2YWxpZGF0ZSAmJiAhKG1hdGNoZXNbaV0gYXMgUmVnRXhwKS50ZXN0KHNlZ21lbnQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBtYXRjaCBcIiR7dG9rZW4ucGF0dGVybn1cIiwgYnV0IGdvdCBcIiR7c2VnbWVudH1cImAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhdGggKz0gdG9rZW4ucHJlZml4ICsgc2VnbWVudCArIHRva2VuLnN1ZmZpeDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25hbCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHR5cGVPZk1lc3NhZ2UgPSByZXBlYXQgPyBcImFuIGFycmF5XCIgOiBcImEgc3RyaW5nXCI7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBiZSAke3R5cGVPZk1lc3NhZ2V9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdGg7XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGRlY29kaW5nIHN0cmluZ3MgZm9yIHBhcmFtcy5cbiAgICovXG4gIGRlY29kZT86ICh2YWx1ZTogc3RyaW5nLCB0b2tlbjogS2V5KSA9PiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBtYXRjaCByZXN1bHQgY29udGFpbnMgZGF0YSBhYm91dCB0aGUgcGF0aCBtYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdDxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PiB7XG4gIHBhdGg6IHN0cmluZztcbiAgaW5kZXg6IG51bWJlcjtcbiAgcGFyYW1zOiBQO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggaXMgZWl0aGVyIGBmYWxzZWAgKG5vIG1hdGNoKSBvciBhIG1hdGNoIHJlc3VsdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF0Y2g8UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSBmYWxzZSB8IE1hdGNoUmVzdWx0PFA+O1xuXG4vKipcbiAqIFRoZSBtYXRjaCBmdW5jdGlvbiB0YWtlcyBhIHN0cmluZyBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IG1hdGNoZWQgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb248UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gPSAoXG4gIHBhdGg6IHN0cmluZyxcbikgPT4gTWF0Y2g8UD47XG5cbi8qKlxuICogQ3JlYXRlIHBhdGggbWF0Y2ggZnVuY3Rpb24gZnJvbSBgcGF0aC10by1yZWdleHBgIHNwZWMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaDxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgc3RyOiBQYXRoLFxuICBvcHRpb25zPzogUGFyc2VPcHRpb25zICYgVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnMsXG4pIHtcbiAgY29uc3Qga2V5czogS2V5W10gPSBbXTtcbiAgY29uc3QgcmUgPSBwYXRoVG9SZWdleHAoc3RyLCBrZXlzLCBvcHRpb25zKTtcbiAgcmV0dXJuIHJlZ2V4cFRvRnVuY3Rpb248UD4ocmUsIGtleXMsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIHBhdGggbWF0Y2ggZnVuY3Rpb24gZnJvbSBgcGF0aC10by1yZWdleHBgIG91dHB1dC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2V4cFRvRnVuY3Rpb248UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4oXG4gIHJlOiBSZWdFeHAsXG4gIGtleXM6IEtleVtdLFxuICBvcHRpb25zOiBSZWdleHBUb0Z1bmN0aW9uT3B0aW9ucyA9IHt9LFxuKTogTWF0Y2hGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHsgZGVjb2RlID0gKHg6IHN0cmluZykgPT4geCB9ID0gb3B0aW9ucztcblxuICByZXR1cm4gZnVuY3Rpb24gKHBhdGhuYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBtID0gcmUuZXhlYyhwYXRobmFtZSk7XG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCB7IDA6IHBhdGgsIGluZGV4IH0gPSBtO1xuICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IG0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtW2ldID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2kgLSAxXTtcblxuICAgICAgaWYgKGtleS5tb2RpZmllciA9PT0gXCIqXCIgfHwga2V5Lm1vZGlmaWVyID09PSBcIitcIikge1xuICAgICAgICBwYXJhbXNba2V5Lm5hbWVdID0gbVtpXS5zcGxpdChrZXkucHJlZml4ICsga2V5LnN1ZmZpeCkubWFwKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHJldHVybiBkZWNvZGUodmFsdWUsIGtleSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IGRlY29kZShtW2ldLCBrZXkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdGgsIGluZGV4LCBwYXJhbXMgfTtcbiAgfTtcbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICovXG5mdW5jdGlvbiBlc2NhcGVTdHJpbmcoc3RyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oWy4rKj89XiE6JHt9KClbXFxdfC9cXFxcXSkvZywgXCJcXFxcJDFcIik7XG59XG5cbi8qKlxuICogR2V0IHRoZSBmbGFncyBmb3IgYSByZWdleHAgZnJvbSB0aGUgb3B0aW9ucy5cbiAqL1xuZnVuY3Rpb24gZmxhZ3Mob3B0aW9ucz86IHsgc2Vuc2l0aXZlPzogYm9vbGVhbiB9KSB7XG4gIHJldHVybiBvcHRpb25zICYmIG9wdGlvbnMuc2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiO1xufVxuXG4vKipcbiAqIE1ldGFkYXRhIGFib3V0IGEga2V5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEtleSB7XG4gIG5hbWU6IHN0cmluZyB8IG51bWJlcjtcbiAgcHJlZml4OiBzdHJpbmc7XG4gIHN1ZmZpeDogc3RyaW5nO1xuICBwYXR0ZXJuOiBzdHJpbmc7XG4gIG1vZGlmaWVyOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSB0b2tlbiBpcyBhIHN0cmluZyAobm90aGluZyBzcGVjaWFsKSBvciBrZXkgbWV0YWRhdGEgKGNhcHR1cmUgZ3JvdXApLlxuICovXG5leHBvcnQgdHlwZSBUb2tlbiA9IHN0cmluZyB8IEtleTtcblxuLyoqXG4gKiBQdWxsIG91dCBrZXlzIGZyb20gYSByZWdleHAuXG4gKi9cbmZ1bmN0aW9uIHJlZ2V4cFRvUmVnZXhwKHBhdGg6IFJlZ0V4cCwga2V5cz86IEtleVtdKTogUmVnRXhwIHtcbiAgaWYgKCFrZXlzKSByZXR1cm4gcGF0aDtcblxuICBjb25zdCBncm91cHNSZWdleCA9IC9cXCgoPzpcXD88KC4qPyk+KT8oPyFcXD8pL2c7XG5cbiAgbGV0IGluZGV4ID0gMDtcbiAgbGV0IGV4ZWNSZXN1bHQgPSBncm91cHNSZWdleC5leGVjKHBhdGguc291cmNlKTtcbiAgd2hpbGUgKGV4ZWNSZXN1bHQpIHtcbiAgICBrZXlzLnB1c2goe1xuICAgICAgLy8gVXNlIHBhcmVudGhlc2l6ZWQgc3Vic3RyaW5nIG1hdGNoIGlmIGF2YWlsYWJsZSwgaW5kZXggb3RoZXJ3aXNlXG4gICAgICBuYW1lOiBleGVjUmVzdWx0WzFdIHx8IGluZGV4KyssXG4gICAgICBwcmVmaXg6IFwiXCIsXG4gICAgICBzdWZmaXg6IFwiXCIsXG4gICAgICBtb2RpZmllcjogXCJcIixcbiAgICAgIHBhdHRlcm46IFwiXCIsXG4gICAgfSk7XG4gICAgZXhlY1Jlc3VsdCA9IGdyb3Vwc1JlZ2V4LmV4ZWMocGF0aC5zb3VyY2UpO1xuICB9XG5cbiAgcmV0dXJuIHBhdGg7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIGFycmF5IGludG8gYSByZWdleHAuXG4gKi9cbmZ1bmN0aW9uIGFycmF5VG9SZWdleHAoXG4gIHBhdGhzOiBBcnJheTxzdHJpbmcgfCBSZWdFeHA+LFxuICBrZXlzPzogS2V5W10sXG4gIG9wdGlvbnM/OiBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgJiBQYXJzZU9wdGlvbnMsXG4pOiBSZWdFeHAge1xuICBjb25zdCBwYXJ0cyA9IHBhdGhzLm1hcCgocGF0aCkgPT4gcGF0aFRvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpLnNvdXJjZSk7XG4gIHJldHVybiBuZXcgUmVnRXhwKGAoPzoke3BhcnRzLmpvaW4oXCJ8XCIpfSlgLCBmbGFncyhvcHRpb25zKSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgcGF0aCByZWdleHAgZnJvbSBzdHJpbmcgaW5wdXQuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ1RvUmVnZXhwKFxuICBwYXRoOiBzdHJpbmcsXG4gIGtleXM/OiBLZXlbXSxcbiAgb3B0aW9ucz86IFRva2Vuc1RvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9ucyxcbikge1xuICByZXR1cm4gdG9rZW5zVG9SZWdleHAocGFyc2UocGF0aCwgb3B0aW9ucyksIGtleXMsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRva2Vuc1RvUmVnZXhwT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd29uJ3QgYWxsb3cgYW4gb3B0aW9uYWwgdHJhaWxpbmcgZGVsaW1pdGVyIHRvIG1hdGNoLiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIHN0cmljdD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdpbGwgbWF0Y2ggdG8gdGhlIGVuZCBvZiB0aGUgc3RyaW5nLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5kPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBtYXRjaCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZy4gKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIHN0YXJ0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFNldHMgdGhlIGZpbmFsIGNoYXJhY3RlciBmb3Igbm9uLWVuZGluZyBvcHRpbWlzdGljIG1hdGNoZXMuIChkZWZhdWx0OiBgL2ApXG4gICAqL1xuICBkZWxpbWl0ZXI/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBMaXN0IG9mIGNoYXJhY3RlcnMgdGhhdCBjYW4gYWxzbyBiZSBcImVuZFwiIGNoYXJhY3RlcnMuXG4gICAqL1xuICBlbmRzV2l0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIEVuY29kZSBwYXRoIHRva2VucyBmb3IgdXNlIGluIHRoZSBgUmVnRXhwYC5cbiAgICovXG4gIGVuY29kZT86ICh2YWx1ZTogc3RyaW5nKSA9PiBzdHJpbmc7XG59XG5cbi8qKlxuICogRXhwb3NlIGEgZnVuY3Rpb24gZm9yIHRha2luZyB0b2tlbnMgYW5kIHJldHVybmluZyBhIFJlZ0V4cC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRva2Vuc1RvUmVnZXhwKFxuICB0b2tlbnM6IFRva2VuW10sXG4gIGtleXM/OiBLZXlbXSxcbiAgb3B0aW9uczogVG9rZW5zVG9SZWdleHBPcHRpb25zID0ge30sXG4pIHtcbiAgY29uc3Qge1xuICAgIHN0cmljdCA9IGZhbHNlLFxuICAgIHN0YXJ0ID0gdHJ1ZSxcbiAgICBlbmQgPSB0cnVlLFxuICAgIGVuY29kZSA9ICh4OiBzdHJpbmcpID0+IHgsXG4gICAgZGVsaW1pdGVyID0gXCIvIz9cIixcbiAgICBlbmRzV2l0aCA9IFwiXCIsXG4gIH0gPSBvcHRpb25zO1xuICBjb25zdCBlbmRzV2l0aFJlID0gYFske2VzY2FwZVN0cmluZyhlbmRzV2l0aCl9XXwkYDtcbiAgY29uc3QgZGVsaW1pdGVyUmUgPSBgWyR7ZXNjYXBlU3RyaW5nKGRlbGltaXRlcil9XWA7XG4gIGxldCByb3V0ZSA9IHN0YXJ0ID8gXCJeXCIgOiBcIlwiO1xuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgdG9rZW5zIGFuZCBjcmVhdGUgb3VyIHJlZ2V4cCBzdHJpbmcuXG4gIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgcm91dGUgKz0gZXNjYXBlU3RyaW5nKGVuY29kZSh0b2tlbikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBwcmVmaXggPSBlc2NhcGVTdHJpbmcoZW5jb2RlKHRva2VuLnByZWZpeCkpO1xuICAgICAgY29uc3Qgc3VmZml4ID0gZXNjYXBlU3RyaW5nKGVuY29kZSh0b2tlbi5zdWZmaXgpKTtcblxuICAgICAgaWYgKHRva2VuLnBhdHRlcm4pIHtcbiAgICAgICAgaWYgKGtleXMpIGtleXMucHVzaCh0b2tlbik7XG5cbiAgICAgICAgaWYgKHByZWZpeCB8fCBzdWZmaXgpIHtcbiAgICAgICAgICBpZiAodG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIikge1xuICAgICAgICAgICAgY29uc3QgbW9kID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiID8gXCI/XCIgOiBcIlwiO1xuICAgICAgICAgICAgcm91dGUgKz0gYCg/OiR7cHJlZml4fSgoPzoke3Rva2VuLnBhdHRlcm59KSg/OiR7c3VmZml4fSR7cHJlZml4fSg/OiR7dG9rZW4ucGF0dGVybn0pKSopJHtzdWZmaXh9KSR7bW9kfWA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvdXRlICs9IGAoPzoke3ByZWZpeH0oJHt0b2tlbi5wYXR0ZXJufSkke3N1ZmZpeH0pJHt0b2tlbi5tb2RpZmllcn1gO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodG9rZW4ubW9kaWZpZXIgPT09IFwiK1wiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIipcIikge1xuICAgICAgICAgICAgcm91dGUgKz0gYCgoPzoke3Rva2VuLnBhdHRlcm59KSR7dG9rZW4ubW9kaWZpZXJ9KWA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJvdXRlICs9IGAoJHt0b2tlbi5wYXR0ZXJufSkke3Rva2VuLm1vZGlmaWVyfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByb3V0ZSArPSBgKD86JHtwcmVmaXh9JHtzdWZmaXh9KSR7dG9rZW4ubW9kaWZpZXJ9YDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZW5kKSB7XG4gICAgaWYgKCFzdHJpY3QpIHJvdXRlICs9IGAke2RlbGltaXRlclJlfT9gO1xuXG4gICAgcm91dGUgKz0gIW9wdGlvbnMuZW5kc1dpdGggPyBcIiRcIiA6IGAoPz0ke2VuZHNXaXRoUmV9KWA7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW5kVG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IGlzRW5kRGVsaW1pdGVkID1cbiAgICAgIHR5cGVvZiBlbmRUb2tlbiA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IGRlbGltaXRlclJlLmluZGV4T2YoZW5kVG9rZW5bZW5kVG9rZW4ubGVuZ3RoIC0gMV0pID4gLTFcbiAgICAgICAgOiBlbmRUb2tlbiA9PT0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKCFzdHJpY3QpIHtcbiAgICAgIHJvdXRlICs9IGAoPzoke2RlbGltaXRlclJlfSg/PSR7ZW5kc1dpdGhSZX0pKT9gO1xuICAgIH1cblxuICAgIGlmICghaXNFbmREZWxpbWl0ZWQpIHtcbiAgICAgIHJvdXRlICs9IGAoPz0ke2RlbGltaXRlclJlfXwke2VuZHNXaXRoUmV9KWA7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAocm91dGUsIGZsYWdzKG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBTdXBwb3J0ZWQgYHBhdGgtdG8tcmVnZXhwYCBpbnB1dCB0eXBlcy5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aCA9IHN0cmluZyB8IFJlZ0V4cCB8IEFycmF5PHN0cmluZyB8IFJlZ0V4cD47XG5cbi8qKlxuICogTm9ybWFsaXplIHRoZSBnaXZlbiBwYXRoIHN0cmluZywgcmV0dXJuaW5nIGEgcmVndWxhciBleHByZXNzaW9uLlxuICpcbiAqIEFuIGVtcHR5IGFycmF5IGNhbiBiZSBwYXNzZWQgaW4gZm9yIHRoZSBrZXlzLCB3aGljaCB3aWxsIGhvbGQgdGhlXG4gKiBwbGFjZWhvbGRlciBrZXkgZGVzY3JpcHRpb25zLiBGb3IgZXhhbXBsZSwgdXNpbmcgYC91c2VyLzppZGAsIGBrZXlzYCB3aWxsXG4gKiBjb250YWluIGBbeyBuYW1lOiAnaWQnLCBkZWxpbWl0ZXI6ICcvJywgb3B0aW9uYWw6IGZhbHNlLCByZXBlYXQ6IGZhbHNlIH1dYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1JlZ2V4cChcbiAgcGF0aDogUGF0aCxcbiAga2V5cz86IEtleVtdLFxuICBvcHRpb25zPzogVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zLFxuKSB7XG4gIGlmIChwYXRoIGluc3RhbmNlb2YgUmVnRXhwKSByZXR1cm4gcmVnZXhwVG9SZWdleHAocGF0aCwga2V5cyk7XG4gIGlmIChBcnJheS5pc0FycmF5KHBhdGgpKSByZXR1cm4gYXJyYXlUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zKTtcbiAgcmV0dXJuIHN0cmluZ1RvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgUGFyc2VPcHRpb25zIGFzIHAyclBhcnNlT3B0aW9ucyxcbiAgICBUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyBhcyBwMnJUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyxcbiAgICBQYXRoRnVuY3Rpb24gYXMgcDJyUGF0aEZ1bmN0aW9uLFxuICAgIFJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zIGFzIHAyclJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zLFxuICAgIE1hdGNoUmVzdWx0IGFzIHAyck1hdGNoUmVzdWx0LFxuICAgIE1hdGNoIGFzIHAyck1hdGNoLFxuICAgIE1hdGNoRnVuY3Rpb24gYXMgcDJyTWF0Y2hGdW5jdGlvbixcbiAgICBLZXkgYXMgcDJyS2V5LFxuICAgIFRva2VuIGFzIHAyclRva2VuLFxuICAgIFRva2Vuc1RvUmVnZXhwT3B0aW9ucyBhcyBwMnJUb2tlbnNUb1JlZ2V4cE9wdGlvbnMsXG4gICAgUGF0aCBhcyBwMnJQYXRoLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgdG9rZW5zVG9GdW5jdGlvbixcbiAgICBtYXRjaCxcbiAgICByZWdleHBUb0Z1bmN0aW9uLFxuICAgIHRva2Vuc1RvUmVnZXhwLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgUGFyc2VPcHRpb25zID0gcDJyUGFyc2VPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zID0gcDJyVG9rZW5zVG9GdW5jdGlvbk9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uID0gcDJyUGF0aEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIFJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zID0gcDJyUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQgPSBwMnJNYXRjaFJlc3VsdDtcbiAgICBleHBvcnQgdHlwZSBNYXRjaCA9IHAyck1hdGNoO1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb24gPSBwMnJNYXRjaEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFRva2Vuc1RvUmVnZXhwT3B0aW9ucyA9IHAyclRva2Vuc1RvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoID0gcDJyUGF0aDtcbiAgICBleHBvcnQgdHlwZSBwYXJzZSA9IHR5cGVvZiBwYXJzZTtcbiAgICBleHBvcnQgdHlwZSBjb21waWxlID0gdHlwZW9mIGNvbXBpbGU7XG4gICAgZXhwb3J0IHR5cGUgdG9rZW5zVG9GdW5jdGlvbiA9IHR5cGVvZiB0b2tlbnNUb0Z1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIG1hdGNoID0gdHlwZW9mIG1hdGNoO1xuICAgIGV4cG9ydCB0eXBlIHJlZ2V4cFRvRnVuY3Rpb24gPSB0eXBlb2YgcmVnZXhwVG9GdW5jdGlvbjtcbiAgICBleHBvcnQgdHlwZSB0b2tlbnNUb1JlZ2V4cCA9IHR5cGVvZiB0b2tlbnNUb1JlZ2V4cDtcbiAgICBleHBvcnQgdHlwZSBwYXRoVG9SZWdleHAgPSB0eXBlb2YgcGF0aFRvUmVnZXhwO1xufVxuXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIHRva2Vuc1RvRnVuY3Rpb24sXG4gICAgbWF0Y2gsXG4gICAgcmVnZXhwVG9GdW5jdGlvbixcbiAgICB0b2tlbnNUb1JlZ2V4cCxcbiAgICBwYXRoVG9SZWdleHAsXG59O1xuXG5leHBvcnQgeyBwYXRoMnJlZ2V4cCB9O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBaUJBOztBQUVHO0FBQ0gsU0FBUyxLQUFLLENBQUMsR0FBVyxFQUFBO0lBQ3hCLElBQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFFVixJQUFBLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUU7QUFDckIsUUFBQSxJQUFNLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEIsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0QsU0FBUztBQUNWLFNBQUE7UUFFRCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7WUFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkUsU0FBUztBQUNWLFNBQUE7UUFFRCxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7WUFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELFNBQVM7QUFDVixTQUFBO1FBRUQs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QzNDLENBQUM7QUFPRDs7Ozs7O0FBTUc7U0FDYSxZQUFZLENBQzFCLElBQVUsRUFDVixJQUFZLEVBQ1osT0FBOEMsRUFBQTtJQUU5QyxJQUFJLElBQUksWUFBWSxNQUFNO0FBQUUsUUFBQSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUQsSUFBQSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQUUsT0FBTyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNuRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzdDOztBQzVtQkE7O0FBRUc7QUE0Q0gsTUFBTSxXQUFXLEdBQUc7SUFDaEIsS0FBSztJQUNMLE9BQU87SUFDUCxnQkFBZ0I7SUFDaEIsS0FBSztJQUNMLGdCQUFnQjtJQUNoQixjQUFjO0lBQ2QsWUFBWTs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9