/*!
 * @cdp/extension-path2regexp 0.9.12
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

export { path2regexp };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXBhdGgycmVnZXhwLm1qcyIsInNvdXJjZXMiOlsicGF0aC10by1yZWdleHAvc3JjL2luZGV4LnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUb2tlbml6ZXIgcmVzdWx0cy5cbiAqL1xuaW50ZXJmYWNlIExleFRva2VuIHtcbiAgdHlwZTpcbiAgICB8IFwiT1BFTlwiXG4gICAgfCBcIkNMT1NFXCJcbiAgICB8IFwiUEFUVEVSTlwiXG4gICAgfCBcIk5BTUVcIlxuICAgIHwgXCJDSEFSXCJcbiAgICB8IFwiRVNDQVBFRF9DSEFSXCJcbiAgICB8IFwiTU9ESUZJRVJcIlxuICAgIHwgXCJFTkRcIjtcbiAgaW5kZXg6IG51bWJlcjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBUb2tlbml6ZSBpbnB1dCBzdHJpbmcuXG4gKi9cbmZ1bmN0aW9uIGxleGVyKHN0cjogc3RyaW5nKTogTGV4VG9rZW5bXSB7XG4gIGNvbnN0IHRva2VuczogTGV4VG9rZW5bXSA9IFtdO1xuICBsZXQgaSA9IDA7XG5cbiAgd2hpbGUgKGkgPCBzdHIubGVuZ3RoKSB7XG4gICAgY29uc3QgY2hhciA9IHN0cltpXTtcblxuICAgIGlmIChjaGFyID09PSBcIipcIiB8fCBjaGFyID09PSBcIitcIiB8fCBjaGFyID09PSBcIj9cIikge1xuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIk1PRElGSUVSXCIsIGluZGV4OiBpLCB2YWx1ZTogc3RyW2krK10gfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCJcXFxcXCIpIHtcbiAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogXCJFU0NBUEVEX0NIQVJcIiwgaW5kZXg6IGkrKywgdmFsdWU6IHN0cltpKytdIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoYXIgPT09IFwie1wiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiT1BFTlwiLCBpbmRleDogaSwgdmFsdWU6IHN0cltpKytdIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoYXIgPT09IFwifVwiKSB7XG4gICAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiQ0xPU0VcIiwgaW5kZXg6IGksIHZhbHVlOiBzdHJbaSsrXSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaGFyID09PSBcIjpcIikge1xuICAgICAgbGV0IG5hbWUgPSBcIlwiO1xuICAgICAgbGV0IGogPSBpICsgMTtcblxuICAgICAgd2hpbGUgKGogPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBzdHIuY2hhckNvZGVBdChqKTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgLy8gYDAtOWBcbiAgICAgICAgICAoY29kZSA+PSA0OCAmJiBjb2RlIDw9IDU3KSB8fFxuICAgICAgICAgIC8vIGBBLVpgXG4gICAgICAgICAgKGNvZGUgPj0gNjUgJiYgY29kZSA8PSA5MCkgfHxcbiAgICAgICAgICAvLyBgYS16YFxuICAgICAgICAgIChjb2RlID49IDk3ICYmIGNvZGUgPD0gMTIyKSB8fFxuICAgICAgICAgIC8vIGBfYFxuICAgICAgICAgIGNvZGUgPT09IDk1XG4gICAgICAgICkge1xuICAgICAgICAgIG5hbWUgKz0gc3RyW2orK107XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKCFuYW1lKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBNaXNzaW5nIHBhcmFtZXRlciBuYW1lIGF0ICR7aX1gKTtcblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIk5BTUVcIiwgaW5kZXg6IGksIHZhbHVlOiBuYW1lIH0pO1xuICAgICAgaSA9IGo7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2hhciA9PT0gXCIoXCIpIHtcbiAgICAgIGxldCBjb3VudCA9IDE7XG4gICAgICBsZXQgcGF0dGVybiA9IFwiXCI7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuXG4gICAgICBpZiAoc3RyW2pdID09PSBcIj9cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBQYXR0ZXJuIGNhbm5vdCBzdGFydCB3aXRoIFwiP1wiIGF0ICR7an1gKTtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGogPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgIGlmIChzdHJbal0gPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgcGF0dGVybiArPSBzdHJbaisrXSArIHN0cltqKytdO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cltqXSA9PT0gXCIpXCIpIHtcbiAgICAgICAgICBjb3VudC0tO1xuICAgICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHN0cltqXSA9PT0gXCIoXCIpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgIGlmIChzdHJbaiArIDFdICE9PSBcIj9cIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgQ2FwdHVyaW5nIGdyb3VwcyBhcmUgbm90IGFsbG93ZWQgYXQgJHtqfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBhdHRlcm4gKz0gc3RyW2orK107XG4gICAgICB9XG5cbiAgICAgIGlmIChjb3VudCkgdGhyb3cgbmV3IFR5cGVFcnJvcihgVW5iYWxhbmNlZCBwYXR0ZXJuIGF0ICR7aX1gKTtcbiAgICAgIGlmICghcGF0dGVybikgdGhyb3cgbmV3IFR5cGVFcnJvcihgTWlzc2luZyBwYXR0ZXJuIGF0ICR7aX1gKTtcblxuICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIlBBVFRFUk5cIiwgaW5kZXg6IGksIHZhbHVlOiBwYXR0ZXJuIH0pO1xuICAgICAgaSA9IGo7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0b2tlbnMucHVzaCh7IHR5cGU6IFwiQ0hBUlwiLCBpbmRleDogaSwgdmFsdWU6IHN0cltpKytdIH0pO1xuICB9XG5cbiAgdG9rZW5zLnB1c2goeyB0eXBlOiBcIkVORFwiLCBpbmRleDogaSwgdmFsdWU6IFwiXCIgfSk7XG5cbiAgcmV0dXJuIHRva2Vucztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZU9wdGlvbnMge1xuICAvKipcbiAgICogU2V0IHRoZSBkZWZhdWx0IGRlbGltaXRlciBmb3IgcmVwZWF0IHBhcmFtZXRlcnMuIChkZWZhdWx0OiBgJy8nYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbiAgLyoqXG4gICAqIExpc3Qgb2YgY2hhcmFjdGVycyB0byBhdXRvbWF0aWNhbGx5IGNvbnNpZGVyIHByZWZpeGVzIHdoZW4gcGFyc2luZy5cbiAgICovXG4gIHByZWZpeGVzPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHN0cjogc3RyaW5nLCBvcHRpb25zOiBQYXJzZU9wdGlvbnMgPSB7fSk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnMgPSBsZXhlcihzdHIpO1xuICBjb25zdCB7IHByZWZpeGVzID0gXCIuL1wiIH0gPSBvcHRpb25zO1xuICBjb25zdCBkZWZhdWx0UGF0dGVybiA9IGBbXiR7ZXNjYXBlU3RyaW5nKG9wdGlvbnMuZGVsaW1pdGVyIHx8IFwiLyM/XCIpfV0rP2A7XG4gIGNvbnN0IHJlc3VsdDogVG9rZW5bXSA9IFtdO1xuICBsZXQga2V5ID0gMDtcbiAgbGV0IGkgPSAwO1xuICBsZXQgcGF0aCA9IFwiXCI7XG5cbiAgY29uc3QgdHJ5Q29uc3VtZSA9ICh0eXBlOiBMZXhUb2tlbltcInR5cGVcIl0pOiBzdHJpbmcgfCB1bmRlZmluZWQgPT4ge1xuICAgIGlmIChpIDwgdG9rZW5zLmxlbmd0aCAmJiB0b2tlbnNbaV0udHlwZSA9PT0gdHlwZSkgcmV0dXJuIHRva2Vuc1tpKytdLnZhbHVlO1xuICB9O1xuXG4gIGNvbnN0IG11c3RDb25zdW1lID0gKHR5cGU6IExleFRva2VuW1widHlwZVwiXSk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSB0cnlDb25zdW1lKHR5cGUpO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gdmFsdWU7XG4gICAgY29uc3QgeyB0eXBlOiBuZXh0VHlwZSwgaW5kZXggfSA9IHRva2Vuc1tpXTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBVbmV4cGVjdGVkICR7bmV4dFR5cGV9IGF0ICR7aW5kZXh9LCBleHBlY3RlZCAke3R5cGV9YCk7XG4gIH07XG5cbiAgY29uc3QgY29uc3VtZVRleHQgPSAoKTogc3RyaW5nID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgICBsZXQgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICB3aGlsZSAoKHZhbHVlID0gdHJ5Q29uc3VtZShcIkNIQVJcIikgfHwgdHJ5Q29uc3VtZShcIkVTQ0FQRURfQ0hBUlwiKSkpIHtcbiAgICAgIHJlc3VsdCArPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICB3aGlsZSAoaSA8IHRva2Vucy5sZW5ndGgpIHtcbiAgICBjb25zdCBjaGFyID0gdHJ5Q29uc3VtZShcIkNIQVJcIik7XG4gICAgY29uc3QgbmFtZSA9IHRyeUNvbnN1bWUoXCJOQU1FXCIpO1xuICAgIGNvbnN0IHBhdHRlcm4gPSB0cnlDb25zdW1lKFwiUEFUVEVSTlwiKTtcblxuICAgIGlmIChuYW1lIHx8IHBhdHRlcm4pIHtcbiAgICAgIGxldCBwcmVmaXggPSBjaGFyIHx8IFwiXCI7XG5cbiAgICAgIGlmIChwcmVmaXhlcy5pbmRleE9mKHByZWZpeCkgPT09IC0xKSB7XG4gICAgICAgIHBhdGggKz0gcHJlZml4O1xuICAgICAgICBwcmVmaXggPSBcIlwiO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aCkge1xuICAgICAgICByZXN1bHQucHVzaChwYXRoKTtcbiAgICAgICAgcGF0aCA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCBrZXkrKyxcbiAgICAgICAgcHJlZml4LFxuICAgICAgICBzdWZmaXg6IFwiXCIsXG4gICAgICAgIHBhdHRlcm46IHBhdHRlcm4gfHwgZGVmYXVsdFBhdHRlcm4sXG4gICAgICAgIG1vZGlmaWVyOiB0cnlDb25zdW1lKFwiTU9ESUZJRVJcIikgfHwgXCJcIixcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSBjaGFyIHx8IHRyeUNvbnN1bWUoXCJFU0NBUEVEX0NIQVJcIik7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICBwYXRoICs9IHZhbHVlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHBhdGgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHBhdGgpO1xuICAgICAgcGF0aCA9IFwiXCI7XG4gICAgfVxuXG4gICAgY29uc3Qgb3BlbiA9IHRyeUNvbnN1bWUoXCJPUEVOXCIpO1xuICAgIGlmIChvcGVuKSB7XG4gICAgICBjb25zdCBwcmVmaXggPSBjb25zdW1lVGV4dCgpO1xuICAgICAgY29uc3QgbmFtZSA9IHRyeUNvbnN1bWUoXCJOQU1FXCIpIHx8IFwiXCI7XG4gICAgICBjb25zdCBwYXR0ZXJuID0gdHJ5Q29uc3VtZShcIlBBVFRFUk5cIikgfHwgXCJcIjtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IGNvbnN1bWVUZXh0KCk7XG5cbiAgICAgIG11c3RDb25zdW1lKFwiQ0xPU0VcIik7XG5cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSB8fCAocGF0dGVybiA/IGtleSsrIDogXCJcIiksXG4gICAgICAgIHBhdHRlcm46IG5hbWUgJiYgIXBhdHRlcm4gPyBkZWZhdWx0UGF0dGVybiA6IHBhdHRlcm4sXG4gICAgICAgIHByZWZpeCxcbiAgICAgICAgc3VmZml4LFxuICAgICAgICBtb2RpZmllcjogdHJ5Q29uc3VtZShcIk1PRElGSUVSXCIpIHx8IFwiXCIsXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIG11c3RDb25zdW1lKFwiRU5EXCIpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGVuIGB0cnVlYCB0aGUgcmVnZXhwIHdpbGwgYmUgY2FzZSBzZW5zaXRpdmUuIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc2Vuc2l0aXZlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBlbmNvZGluZyBpbnB1dCBzdHJpbmdzIGZvciBvdXRwdXQuXG4gICAqL1xuICBlbmNvZGU/OiAodmFsdWU6IHN0cmluZywgdG9rZW46IEtleSkgPT4gc3RyaW5nO1xuICAvKipcbiAgICogV2hlbiBgZmFsc2VgIHRoZSBmdW5jdGlvbiBjYW4gcHJvZHVjZSBhbiBpbnZhbGlkICh1bm1hdGNoZWQpIHBhdGguIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB2YWxpZGF0ZT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGU8UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4oXG4gIHN0cjogc3RyaW5nLFxuICBvcHRpb25zPzogUGFyc2VPcHRpb25zICYgVG9rZW5zVG9GdW5jdGlvbk9wdGlvbnNcbikge1xuICByZXR1cm4gdG9rZW5zVG9GdW5jdGlvbjxQPihwYXJzZShzdHIsIG9wdGlvbnMpLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gKGRhdGE/OiBQKSA9PiBzdHJpbmc7XG5cbi8qKlxuICogRXhwb3NlIGEgbWV0aG9kIGZvciB0cmFuc2Zvcm1pbmcgdG9rZW5zIGludG8gdGhlIHBhdGggZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbnNUb0Z1bmN0aW9uPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+KFxuICB0b2tlbnM6IFRva2VuW10sXG4gIG9wdGlvbnM6IFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zID0ge31cbik6IFBhdGhGdW5jdGlvbjxQPiB7XG4gIGNvbnN0IHJlRmxhZ3MgPSBmbGFncyhvcHRpb25zKTtcbiAgY29uc3QgeyBlbmNvZGUgPSAoeDogc3RyaW5nKSA9PiB4LCB2YWxpZGF0ZSA9IHRydWUgfSA9IG9wdGlvbnM7XG5cbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHRva2VucyBpbnRvIHJlZ2V4cHMuXG4gIGNvbnN0IG1hdGNoZXMgPSB0b2tlbnMubWFwKCh0b2tlbikgPT4ge1xuICAgIGlmICh0eXBlb2YgdG9rZW4gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKGBeKD86JHt0b2tlbi5wYXR0ZXJufSkkYCwgcmVGbGFncyk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gKGRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4gfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgbGV0IHBhdGggPSBcIlwiO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2ldO1xuXG4gICAgICBpZiAodHlwZW9mIHRva2VuID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHBhdGggKz0gdG9rZW47XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGRhdGEgPyBkYXRhW3Rva2VuLm5hbWVdIDogdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgb3B0aW9uYWwgPSB0b2tlbi5tb2RpZmllciA9PT0gXCI/XCIgfHwgdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiO1xuICAgICAgY29uc3QgcmVwZWF0ID0gdG9rZW4ubW9kaWZpZXIgPT09IFwiKlwiIHx8IHRva2VuLm1vZGlmaWVyID09PSBcIitcIjtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGlmICghcmVwZWF0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIGBFeHBlY3RlZCBcIiR7dG9rZW4ubmFtZX1cIiB0byBub3QgcmVwZWF0LCBidXQgZ290IGFuIGFycmF5YFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYgKG9wdGlvbmFsKSBjb250aW51ZTtcblxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG5vdCBiZSBlbXB0eWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB2YWx1ZS5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBlbmNvZGUodmFsdWVbal0sIHRva2VuKTtcblxuICAgICAgICAgIGlmICh2YWxpZGF0ZSAmJiAhKG1hdGNoZXNbaV0gYXMgUmVnRXhwKS50ZXN0KHNlZ21lbnQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICBgRXhwZWN0ZWQgYWxsIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG1hdGNoIFwiJHt0b2tlbi5wYXR0ZXJufVwiLCBidXQgZ290IFwiJHtzZWdtZW50fVwiYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYXRoICs9IHRva2VuLnByZWZpeCArIHNlZ21lbnQgKyB0b2tlbi5zdWZmaXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgY29uc3Qgc2VnbWVudCA9IGVuY29kZShTdHJpbmcodmFsdWUpLCB0b2tlbik7XG5cbiAgICAgICAgaWYgKHZhbGlkYXRlICYmICEobWF0Y2hlc1tpXSBhcyBSZWdFeHApLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgYEV4cGVjdGVkIFwiJHt0b2tlbi5uYW1lfVwiIHRvIG1hdGNoIFwiJHt0b2tlbi5wYXR0ZXJufVwiLCBidXQgZ290IFwiJHtzZWdtZW50fVwiYFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXRoICs9IHRva2VuLnByZWZpeCArIHNlZ21lbnQgKyB0b2tlbi5zdWZmaXg7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9uYWwpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCB0eXBlT2ZNZXNzYWdlID0gcmVwZWF0ID8gXCJhbiBhcnJheVwiIDogXCJhIHN0cmluZ1wiO1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgXCIke3Rva2VuLm5hbWV9XCIgdG8gYmUgJHt0eXBlT2ZNZXNzYWdlfWApO1xuICAgIH1cblxuICAgIHJldHVybiBwYXRoO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBkZWNvZGluZyBzdHJpbmdzIGZvciBwYXJhbXMuXG4gICAqL1xuICBkZWNvZGU/OiAodmFsdWU6IHN0cmluZywgdG9rZW46IEtleSkgPT4gc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgbWF0Y2ggcmVzdWx0IGNvbnRhaW5zIGRhdGEgYWJvdXQgdGhlIHBhdGggbWF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hSZXN1bHQ8UCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4ge1xuICBwYXRoOiBzdHJpbmc7XG4gIGluZGV4OiBudW1iZXI7XG4gIHBhcmFtczogUDtcbn1cblxuLyoqXG4gKiBBIG1hdGNoIGlzIGVpdGhlciBgZmFsc2VgIChubyBtYXRjaCkgb3IgYSBtYXRjaCByZXN1bHQuXG4gKi9cbmV4cG9ydCB0eXBlIE1hdGNoPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gZmFsc2UgfCBNYXRjaFJlc3VsdDxQPjtcblxuLyoqXG4gKiBUaGUgbWF0Y2ggZnVuY3Rpb24gdGFrZXMgYSBzdHJpbmcgYW5kIHJldHVybnMgd2hldGhlciBpdCBtYXRjaGVkIHRoZSBwYXRoLlxuICovXG5leHBvcnQgdHlwZSBNYXRjaEZ1bmN0aW9uPFAgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+ID0gKFxuICBwYXRoOiBzdHJpbmdcbikgPT4gTWF0Y2g8UD47XG5cbi8qKlxuICogQ3JlYXRlIHBhdGggbWF0Y2ggZnVuY3Rpb24gZnJvbSBgcGF0aC10by1yZWdleHBgIHNwZWMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaDxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgc3RyOiBQYXRoLFxuICBvcHRpb25zPzogUGFyc2VPcHRpb25zICYgVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnNcbikge1xuICBjb25zdCBrZXlzOiBLZXlbXSA9IFtdO1xuICBjb25zdCByZSA9IHBhdGhUb1JlZ2V4cChzdHIsIGtleXMsIG9wdGlvbnMpO1xuICByZXR1cm4gcmVnZXhwVG9GdW5jdGlvbjxQPihyZSwga2V5cywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgcGF0aCBtYXRjaCBmdW5jdGlvbiBmcm9tIGBwYXRoLXRvLXJlZ2V4cGAgb3V0cHV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnZXhwVG9GdW5jdGlvbjxQIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0PihcbiAgcmU6IFJlZ0V4cCxcbiAga2V5czogS2V5W10sXG4gIG9wdGlvbnM6IFJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zID0ge31cbik6IE1hdGNoRnVuY3Rpb248UD4ge1xuICBjb25zdCB7IGRlY29kZSA9ICh4OiBzdHJpbmcpID0+IHggfSA9IG9wdGlvbnM7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChwYXRobmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgbSA9IHJlLmV4ZWMocGF0aG5hbWUpO1xuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgeyAwOiBwYXRoLCBpbmRleCB9ID0gbTtcbiAgICBjb25zdCBwYXJhbXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBtLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobVtpXSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qga2V5ID0ga2V5c1tpIC0gMV07XG5cbiAgICAgIGlmIChrZXkubW9kaWZpZXIgPT09IFwiKlwiIHx8IGtleS5tb2RpZmllciA9PT0gXCIrXCIpIHtcbiAgICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IG1baV0uc3BsaXQoa2V5LnByZWZpeCArIGtleS5zdWZmaXgpLm1hcCgodmFsdWUpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGVjb2RlKHZhbHVlLCBrZXkpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtc1trZXkubmFtZV0gPSBkZWNvZGUobVtpXSwga2V5KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXRoLCBpbmRleCwgcGFyYW1zIH07XG4gIH07XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlU3RyaW5nKHN0cjogc3RyaW5nKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFsuKyo/PV4hOiR7fSgpW1xcXXwvXFxcXF0pL2csIFwiXFxcXCQxXCIpO1xufVxuXG4vKipcbiAqIEdldCB0aGUgZmxhZ3MgZm9yIGEgcmVnZXhwIGZyb20gdGhlIG9wdGlvbnMuXG4gKi9cbmZ1bmN0aW9uIGZsYWdzKG9wdGlvbnM/OiB7IHNlbnNpdGl2ZT86IGJvb2xlYW4gfSkge1xuICByZXR1cm4gb3B0aW9ucyAmJiBvcHRpb25zLnNlbnNpdGl2ZSA/IFwiXCIgOiBcImlcIjtcbn1cblxuLyoqXG4gKiBNZXRhZGF0YSBhYm91dCBhIGtleS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBLZXkge1xuICBuYW1lOiBzdHJpbmcgfCBudW1iZXI7XG4gIHByZWZpeDogc3RyaW5nO1xuICBzdWZmaXg6IHN0cmluZztcbiAgcGF0dGVybjogc3RyaW5nO1xuICBtb2RpZmllcjogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgdG9rZW4gaXMgYSBzdHJpbmcgKG5vdGhpbmcgc3BlY2lhbCkgb3Iga2V5IG1ldGFkYXRhIChjYXB0dXJlIGdyb3VwKS5cbiAqL1xuZXhwb3J0IHR5cGUgVG9rZW4gPSBzdHJpbmcgfCBLZXk7XG5cbi8qKlxuICogUHVsbCBvdXQga2V5cyBmcm9tIGEgcmVnZXhwLlxuICovXG5mdW5jdGlvbiByZWdleHBUb1JlZ2V4cChwYXRoOiBSZWdFeHAsIGtleXM/OiBLZXlbXSk6IFJlZ0V4cCB7XG4gIGlmICgha2V5cykgcmV0dXJuIHBhdGg7XG5cbiAgY29uc3QgZ3JvdXBzUmVnZXggPSAvXFwoKD86XFw/PCguKj8pPik/KD8hXFw/KS9nO1xuXG4gIGxldCBpbmRleCA9IDA7XG4gIGxldCBleGVjUmVzdWx0ID0gZ3JvdXBzUmVnZXguZXhlYyhwYXRoLnNvdXJjZSk7XG4gIHdoaWxlIChleGVjUmVzdWx0KSB7XG4gICAga2V5cy5wdXNoKHtcbiAgICAgIC8vIFVzZSBwYXJlbnRoZXNpemVkIHN1YnN0cmluZyBtYXRjaCBpZiBhdmFpbGFibGUsIGluZGV4IG90aGVyd2lzZVxuICAgICAgbmFtZTogZXhlY1Jlc3VsdFsxXSB8fCBpbmRleCsrLFxuICAgICAgcHJlZml4OiBcIlwiLFxuICAgICAgc3VmZml4OiBcIlwiLFxuICAgICAgbW9kaWZpZXI6IFwiXCIsXG4gICAgICBwYXR0ZXJuOiBcIlwiLFxuICAgIH0pO1xuICAgIGV4ZWNSZXN1bHQgPSBncm91cHNSZWdleC5leGVjKHBhdGguc291cmNlKTtcbiAgfVxuXG4gIHJldHVybiBwYXRoO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiBhcnJheSBpbnRvIGEgcmVnZXhwLlxuICovXG5mdW5jdGlvbiBhcnJheVRvUmVnZXhwKFxuICBwYXRoczogQXJyYXk8c3RyaW5nIHwgUmVnRXhwPixcbiAga2V5cz86IEtleVtdLFxuICBvcHRpb25zPzogVG9rZW5zVG9SZWdleHBPcHRpb25zICYgUGFyc2VPcHRpb25zXG4pOiBSZWdFeHAge1xuICBjb25zdCBwYXJ0cyA9IHBhdGhzLm1hcCgocGF0aCkgPT4gcGF0aFRvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpLnNvdXJjZSk7XG4gIHJldHVybiBuZXcgUmVnRXhwKGAoPzoke3BhcnRzLmpvaW4oXCJ8XCIpfSlgLCBmbGFncyhvcHRpb25zKSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgcGF0aCByZWdleHAgZnJvbSBzdHJpbmcgaW5wdXQuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ1RvUmVnZXhwKFxuICBwYXRoOiBzdHJpbmcsXG4gIGtleXM/OiBLZXlbXSxcbiAgb3B0aW9ucz86IFRva2Vuc1RvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9uc1xuKSB7XG4gIHJldHVybiB0b2tlbnNUb1JlZ2V4cChwYXJzZShwYXRoLCBvcHRpb25zKSwga2V5cywgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5zVG9SZWdleHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBiZSBjYXNlIHNlbnNpdGl2ZS4gKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBzZW5zaXRpdmU/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3b24ndCBhbGxvdyBhbiBvcHRpb25hbCB0cmFpbGluZyBkZWxpbWl0ZXIgdG8gbWF0Y2guIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgc3RyaWN0PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gYHRydWVgIHRoZSByZWdleHAgd2lsbCBtYXRjaCB0byB0aGUgZW5kIG9mIHRoZSBzdHJpbmcuIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmQ/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiBgdHJ1ZWAgdGhlIHJlZ2V4cCB3aWxsIG1hdGNoIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nLiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgc3RhcnQ/OiBib29sZWFuO1xuICAvKipcbiAgICogU2V0cyB0aGUgZmluYWwgY2hhcmFjdGVyIGZvciBub24tZW5kaW5nIG9wdGltaXN0aWMgbWF0Y2hlcy4gKGRlZmF1bHQ6IGAvYClcbiAgICovXG4gIGRlbGltaXRlcj86IHN0cmluZztcbiAgLyoqXG4gICAqIExpc3Qgb2YgY2hhcmFjdGVycyB0aGF0IGNhbiBhbHNvIGJlIFwiZW5kXCIgY2hhcmFjdGVycy5cbiAgICovXG4gIGVuZHNXaXRoPzogc3RyaW5nO1xuICAvKipcbiAgICogRW5jb2RlIHBhdGggdG9rZW5zIGZvciB1c2UgaW4gdGhlIGBSZWdFeHBgLlxuICAgKi9cbiAgZW5jb2RlPzogKHZhbHVlOiBzdHJpbmcpID0+IHN0cmluZztcbn1cblxuLyoqXG4gKiBFeHBvc2UgYSBmdW5jdGlvbiBmb3IgdGFraW5nIHRva2VucyBhbmQgcmV0dXJuaW5nIGEgUmVnRXhwLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5zVG9SZWdleHAoXG4gIHRva2VuczogVG9rZW5bXSxcbiAga2V5cz86IEtleVtdLFxuICBvcHRpb25zOiBUb2tlbnNUb1JlZ2V4cE9wdGlvbnMgPSB7fVxuKSB7XG4gIGNvbnN0IHtcbiAgICBzdHJpY3QgPSBmYWxzZSxcbiAgICBzdGFydCA9IHRydWUsXG4gICAgZW5kID0gdHJ1ZSxcbiAgICBlbmNvZGUgPSAoeDogc3RyaW5nKSA9PiB4LFxuICAgIGRlbGltaXRlciA9IFwiLyM/XCIsXG4gICAgZW5kc1dpdGggPSBcIlwiLFxuICB9ID0gb3B0aW9ucztcbiAgY29uc3QgZW5kc1dpdGhSZSA9IGBbJHtlc2NhcGVTdHJpbmcoZW5kc1dpdGgpfV18JGA7XG4gIGNvbnN0IGRlbGltaXRlclJlID0gYFske2VzY2FwZVN0cmluZyhkZWxpbWl0ZXIpfV1gO1xuICBsZXQgcm91dGUgPSBzdGFydCA/IFwiXlwiIDogXCJcIjtcblxuICAvLyBJdGVyYXRlIG92ZXIgdGhlIHRva2VucyBhbmQgY3JlYXRlIG91ciByZWdleHAgc3RyaW5nLlxuICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgIGlmICh0eXBlb2YgdG9rZW4gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHJvdXRlICs9IGVzY2FwZVN0cmluZyhlbmNvZGUodG9rZW4pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcHJlZml4ID0gZXNjYXBlU3RyaW5nKGVuY29kZSh0b2tlbi5wcmVmaXgpKTtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IGVzY2FwZVN0cmluZyhlbmNvZGUodG9rZW4uc3VmZml4KSk7XG5cbiAgICAgIGlmICh0b2tlbi5wYXR0ZXJuKSB7XG4gICAgICAgIGlmIChrZXlzKSBrZXlzLnB1c2godG9rZW4pO1xuXG4gICAgICAgIGlmIChwcmVmaXggfHwgc3VmZml4KSB7XG4gICAgICAgICAgaWYgKHRva2VuLm1vZGlmaWVyID09PSBcIitcIiB8fCB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vZCA9IHRva2VuLm1vZGlmaWVyID09PSBcIipcIiA/IFwiP1wiIDogXCJcIjtcbiAgICAgICAgICAgIHJvdXRlICs9IGAoPzoke3ByZWZpeH0oKD86JHt0b2tlbi5wYXR0ZXJufSkoPzoke3N1ZmZpeH0ke3ByZWZpeH0oPzoke3Rva2VuLnBhdHRlcm59KSkqKSR7c3VmZml4fSkke21vZH1gO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByb3V0ZSArPSBgKD86JHtwcmVmaXh9KCR7dG9rZW4ucGF0dGVybn0pJHtzdWZmaXh9KSR7dG9rZW4ubW9kaWZpZXJ9YDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRva2VuLm1vZGlmaWVyID09PSBcIitcIiB8fCB0b2tlbi5tb2RpZmllciA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIHJvdXRlICs9IGAoKD86JHt0b2tlbi5wYXR0ZXJufSkke3Rva2VuLm1vZGlmaWVyfSlgO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByb3V0ZSArPSBgKCR7dG9rZW4ucGF0dGVybn0pJHt0b2tlbi5tb2RpZmllcn1gO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcm91dGUgKz0gYCg/OiR7cHJlZml4fSR7c3VmZml4fSkke3Rva2VuLm1vZGlmaWVyfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGVuZCkge1xuICAgIGlmICghc3RyaWN0KSByb3V0ZSArPSBgJHtkZWxpbWl0ZXJSZX0/YDtcblxuICAgIHJvdXRlICs9ICFvcHRpb25zLmVuZHNXaXRoID8gXCIkXCIgOiBgKD89JHtlbmRzV2l0aFJlfSlgO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVuZFRva2VuID0gdG9rZW5zW3Rva2Vucy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBpc0VuZERlbGltaXRlZCA9XG4gICAgICB0eXBlb2YgZW5kVG9rZW4gPT09IFwic3RyaW5nXCJcbiAgICAgICAgPyBkZWxpbWl0ZXJSZS5pbmRleE9mKGVuZFRva2VuW2VuZFRva2VuLmxlbmd0aCAtIDFdKSA+IC0xXG4gICAgICAgIDogZW5kVG9rZW4gPT09IHVuZGVmaW5lZDtcblxuICAgIGlmICghc3RyaWN0KSB7XG4gICAgICByb3V0ZSArPSBgKD86JHtkZWxpbWl0ZXJSZX0oPz0ke2VuZHNXaXRoUmV9KSk/YDtcbiAgICB9XG5cbiAgICBpZiAoIWlzRW5kRGVsaW1pdGVkKSB7XG4gICAgICByb3V0ZSArPSBgKD89JHtkZWxpbWl0ZXJSZX18JHtlbmRzV2l0aFJlfSlgO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgUmVnRXhwKHJvdXRlLCBmbGFncyhvcHRpb25zKSk7XG59XG5cbi8qKlxuICogU3VwcG9ydGVkIGBwYXRoLXRvLXJlZ2V4cGAgaW5wdXQgdHlwZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFBhdGggPSBzdHJpbmcgfCBSZWdFeHAgfCBBcnJheTxzdHJpbmcgfCBSZWdFeHA+O1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsIHJldHVybmluZyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBBbiBlbXB0eSBhcnJheSBjYW4gYmUgcGFzc2VkIGluIGZvciB0aGUga2V5cywgd2hpY2ggd2lsbCBob2xkIHRoZVxuICogcGxhY2Vob2xkZXIga2V5IGRlc2NyaXB0aW9ucy4gRm9yIGV4YW1wbGUsIHVzaW5nIGAvdXNlci86aWRgLCBga2V5c2Agd2lsbFxuICogY29udGFpbiBgW3sgbmFtZTogJ2lkJywgZGVsaW1pdGVyOiAnLycsIG9wdGlvbmFsOiBmYWxzZSwgcmVwZWF0OiBmYWxzZSB9XWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9SZWdleHAoXG4gIHBhdGg6IFBhdGgsXG4gIGtleXM/OiBLZXlbXSxcbiAgb3B0aW9ucz86IFRva2Vuc1RvUmVnZXhwT3B0aW9ucyAmIFBhcnNlT3B0aW9uc1xuKSB7XG4gIGlmIChwYXRoIGluc3RhbmNlb2YgUmVnRXhwKSByZXR1cm4gcmVnZXhwVG9SZWdleHAocGF0aCwga2V5cyk7XG4gIGlmIChBcnJheS5pc0FycmF5KHBhdGgpKSByZXR1cm4gYXJyYXlUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zKTtcbiAgcmV0dXJuIHN0cmluZ1RvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICovXG5cbmltcG9ydCB7XG4gICAgUGFyc2VPcHRpb25zIGFzIHAyclBhcnNlT3B0aW9ucyxcbiAgICBUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyBhcyBwMnJUb2tlbnNUb0Z1bmN0aW9uT3B0aW9ucyxcbiAgICBQYXRoRnVuY3Rpb24gYXMgcDJyUGF0aEZ1bmN0aW9uLFxuICAgIFJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zIGFzIHAyclJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zLFxuICAgIE1hdGNoUmVzdWx0IGFzIHAyck1hdGNoUmVzdWx0LFxuICAgIE1hdGNoIGFzIHAyck1hdGNoLFxuICAgIE1hdGNoRnVuY3Rpb24gYXMgcDJyTWF0Y2hGdW5jdGlvbixcbiAgICBLZXkgYXMgcDJyS2V5LFxuICAgIFRva2VuIGFzIHAyclRva2VuLFxuICAgIFRva2Vuc1RvUmVnZXhwT3B0aW9ucyBhcyBwMnJUb2tlbnNUb1JlZ2V4cE9wdGlvbnMsXG4gICAgUGF0aCBhcyBwMnJQYXRoLFxuICAgIHBhcnNlLFxuICAgIGNvbXBpbGUsXG4gICAgdG9rZW5zVG9GdW5jdGlvbixcbiAgICBtYXRjaCxcbiAgICByZWdleHBUb0Z1bmN0aW9uLFxuICAgIHRva2Vuc1RvUmVnZXhwLFxuICAgIHBhdGhUb1JlZ2V4cCxcbn0gZnJvbSAncGF0aC10by1yZWdleHAnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBwYXRoMnJlZ2V4cCB7XG4gICAgZXhwb3J0IHR5cGUgUGFyc2VPcHRpb25zID0gcDJyUGFyc2VPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRva2Vuc1RvRnVuY3Rpb25PcHRpb25zID0gcDJyVG9rZW5zVG9GdW5jdGlvbk9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUGF0aEZ1bmN0aW9uID0gcDJyUGF0aEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIFJlZ2V4cFRvRnVuY3Rpb25PcHRpb25zID0gcDJyUmVnZXhwVG9GdW5jdGlvbk9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgTWF0Y2hSZXN1bHQgPSBwMnJNYXRjaFJlc3VsdDtcbiAgICBleHBvcnQgdHlwZSBNYXRjaCA9IHAyck1hdGNoO1xuICAgIGV4cG9ydCB0eXBlIE1hdGNoRnVuY3Rpb24gPSBwMnJNYXRjaEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIEtleSA9IHAycktleTtcbiAgICBleHBvcnQgdHlwZSBUb2tlbiA9IHAyclRva2VuO1xuICAgIGV4cG9ydCB0eXBlIFRva2Vuc1RvUmVnZXhwT3B0aW9ucyA9IHAyclRva2Vuc1RvUmVnZXhwT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBQYXRoID0gcDJyUGF0aDtcbiAgICBleHBvcnQgdHlwZSBwYXJzZSA9IHR5cGVvZiBwYXJzZTtcbiAgICBleHBvcnQgdHlwZSBjb21waWxlID0gdHlwZW9mIGNvbXBpbGU7XG4gICAgZXhwb3J0IHR5cGUgdG9rZW5zVG9GdW5jdGlvbiA9IHR5cGVvZiB0b2tlbnNUb0Z1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIG1hdGNoID0gdHlwZW9mIG1hdGNoO1xuICAgIGV4cG9ydCB0eXBlIHJlZ2V4cFRvRnVuY3Rpb24gPSB0eXBlb2YgcmVnZXhwVG9GdW5jdGlvbjtcbiAgICBleHBvcnQgdHlwZSB0b2tlbnNUb1JlZ2V4cCA9IHR5cGVvZiB0b2tlbnNUb1JlZ2V4cDtcbiAgICBleHBvcnQgdHlwZSBwYXRoVG9SZWdleHAgPSB0eXBlb2YgcGF0aFRvUmVnZXhwO1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG5jb25zdCBwYXRoMnJlZ2V4cCA9IHtcbiAgICBwYXJzZSxcbiAgICBjb21waWxlLFxuICAgIHRva2Vuc1RvRnVuY3Rpb24sXG4gICAgbWF0Y2gsXG4gICAgcmVnZXhwVG9GdW5jdGlvbixcbiAgICB0b2tlbnNUb1JlZ2V4cCxcbiAgICBwYXRoVG9SZWdleHAsXG59O1xuXG5leHBvcnQgeyBwYXRoMnJlZ2V4cCB9O1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBaUJBOztBQUVHO0FBQ0gsU0FBUyxLQUFLLENBQUMsR0FBVyxFQUFBO0lBQ3hCLElBQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFFVixJQUFBLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUU7QUFDckIsUUFBQSxJQUFNLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEIsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0QsU0FBUztBQUNWLFNBQUE7UUFFRCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7WUFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkUsU0FBUztBQUNWLFNBQUE7UUFFRCxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7WUFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMs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QUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFPRDs7Ozs7O0FBTUc7U0FDYSxZQUFZLENBQzFCLElBQVUsRUFDVixJQUFZLEVBQ1osT0FBOEMsRUFBQTtJQUU5QyxJQUFJLElBQUksWUFBWSxNQUFNO0FBQUUsUUFBQSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUQsSUFBQSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQUUsT0FBTyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNuRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzdDOztBQzVtQkE7O0FBRUc7QUE0Q0g7QUFDQSxNQUFNLFdBQVcsR0FBRztJQUNoQixLQUFLO0lBQ0wsT0FBTztJQUNQLGdCQUFnQjtJQUNoQixLQUFLO0lBQ0wsZ0JBQWdCO0lBQ2hCLGNBQWM7SUFDZCxZQUFZOzs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwLyJ9
