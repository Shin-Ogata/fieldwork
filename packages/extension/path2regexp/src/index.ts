/* eslint-disable
    @typescript-eslint/no-namespace,
 */

import {
    type Encode as p2rEncode,
    type Decode as p2rDecode,
    type ParseOptions as p2rParseOptions,
    type PathToRegexpOptions as p2rPathToRegexpOptions,
    type MatchOptions as p2rMatchOptions,
    type CompileOptions as p2rCompileOptions,
    type ParamData as p2rParamData,
    type PathFunction as p2rPathFunction,
    type MatchResult as p2rMatchResult,
    type Match as p2rMatch,
    type MatchFunction as p2rMatchFunction,
    type Key as p2rKey,
    type Token as p2rToken,
    type Path as p2rPath,
    TokenData as p2rTokenData,
    PathError as p2rPathError,
    parse,
    compile,
    match,
    stringify,
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
}

const path2regexp = {
    TokenData: p2rTokenData,
    PathError: p2rPathError,
    parse,
    compile,
    match,
    stringify,
    pathToRegexp,
};

export { path2regexp };
