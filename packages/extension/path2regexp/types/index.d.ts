import { ParseOptions as p2rParseOptions, TokensToFunctionOptions as p2rTokensToFunctionOptions, PathFunction as p2rPathFunction, RegexpToFunctionOptions as p2rRegexpToFunctionOptions, MatchResult as p2rMatchResult, Match as p2rMatch, MatchFunction as p2rMatchFunction, Key as p2rKey, Token as p2rToken, TokensToRegexpOptions as p2rTokensToRegexpOptions, Path as p2rPath, parse, compile, tokensToFunction, match, regexpToFunction, tokensToRegexp, pathToRegexp } from 'path-to-regexp';
declare namespace path2regexp {
    type ParseOptions = p2rParseOptions;
    type TokensToFunctionOptions = p2rTokensToFunctionOptions;
    type PathFunction = p2rPathFunction;
    type RegexpToFunctionOptions = p2rRegexpToFunctionOptions;
    type MatchResult = p2rMatchResult;
    type Match = p2rMatch;
    type MatchFunction = p2rMatchFunction;
    type Key = p2rKey;
    type Token = p2rToken;
    type TokensToRegexpOptions = p2rTokensToRegexpOptions;
    type Path = p2rPath;
    type parse = typeof parse;
    type compile = typeof compile;
    type tokensToFunction = typeof tokensToFunction;
    type match = typeof match;
    type regexpToFunction = typeof regexpToFunction;
    type tokensToRegexp = typeof tokensToRegexp;
    type pathToRegexp = typeof pathToRegexp;
}
declare const path2regexp: {
    parse: typeof parse;
    compile: typeof compile;
    tokensToFunction: typeof tokensToFunction;
    match: typeof match;
    regexpToFunction: typeof regexpToFunction;
    tokensToRegexp: typeof tokensToRegexp;
    pathToRegexp: typeof pathToRegexp;
};
export { path2regexp };
