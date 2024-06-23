/* eslint-disable
    @typescript-eslint/no-namespace,
 */

import {
    Encode as p2rEncode,
    Decode as p2rDecode,
    ParseOptions as p2rParseOptions,
    PathToRegexpOptions as p2rPathToRegexpOptions,
    MatchOptions as p2rMatchOptions,
    CompileOptions as p2rCompileOptions,
    TokenData as p2rTokenData,
    ParamData as p2rParamData,
    PathFunction as p2rPathFunction,
    MatchResult as p2rMatchResult,
    Match as p2rMatch,
    MatchFunction as p2rMatchFunction,
    Key as p2rKey,
    Token as p2rToken,
    Path as p2rPath,
    PathRegExp as p2rPathRegExp,
    parse,
    compile,
    match,
    pathToRegexp,
} from 'path-to-regexp';

declare namespace path2regexp {
    export type Encode = p2rEncode;
    export type Decode = p2rDecode;
    export type ParseOptions = p2rParseOptions;
    export type PathToRegexpOptions = p2rPathToRegexpOptions;
    export type MatchOptions = p2rMatchOptions;
    export type CompileOptions = p2rCompileOptions;
    export type TokenData = p2rTokenData;
    export type ParamData = p2rParamData;
    export type PathFunction<P extends ParamData> = p2rPathFunction<P>;
    export type MatchResult<P extends ParamData> = p2rMatchResult<P>;
    export type Match<P extends ParamData> = p2rMatch<P>;
    export type MatchFunction<P extends ParamData> = p2rMatchFunction<P>;
    export type Key = p2rKey;
    export type Token = p2rToken;
    export type Path = p2rPath;
    export type PathRegExp = p2rPathRegExp;
}

const path2regexp = {
    parse,
    compile,
    match,
    pathToRegexp,
};

export { path2regexp };
