/* eslint-disable
    @typescript-eslint/no-namespace,
 */

import {
    ParseOptions as p2rParseOptions,
    TokensToFunctionOptions as p2rTokensToFunctionOptions,
    PathFunction as p2rPathFunction,
    RegexpToFunctionOptions as p2rRegexpToFunctionOptions,
    MatchResult as p2rMatchResult,
    Match as p2rMatch,
    MatchFunction as p2rMatchFunction,
    Key as p2rKey,
    Token as p2rToken,
    TokensToRegexpOptions as p2rTokensToRegexpOptions,
    Path as p2rPath,
    parse,
    compile,
    tokensToFunction,
    match,
    regexpToFunction,
    tokensToRegexp,
    pathToRegexp,
} from 'path-to-regexp';

declare namespace path2regexp {
    export type ParseOptions = p2rParseOptions;
    export type TokensToFunctionOptions = p2rTokensToFunctionOptions;
    export type PathFunction = p2rPathFunction;
    export type RegexpToFunctionOptions = p2rRegexpToFunctionOptions;
    export type MatchResult = p2rMatchResult;
    export type Match = p2rMatch;
    export type MatchFunction = p2rMatchFunction;
    export type Key = p2rKey;
    export type Token = p2rToken;
    export type TokensToRegexpOptions = p2rTokensToRegexpOptions;
    export type Path = p2rPath;
    export type parse = typeof parse;
    export type compile = typeof compile;
    export type tokensToFunction = typeof tokensToFunction;
    export type match = typeof match;
    export type regexpToFunction = typeof regexpToFunction;
    export type tokensToRegexp = typeof tokensToRegexp;
    export type pathToRegexp = typeof pathToRegexp;
}

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
