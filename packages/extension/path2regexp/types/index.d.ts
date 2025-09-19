import { type Encode as p2rEncode, type Decode as p2rDecode, type ParseOptions as p2rParseOptions, type PathToRegexpOptions as p2rPathToRegexpOptions, type MatchOptions as p2rMatchOptions, type CompileOptions as p2rCompileOptions, type ParamData as p2rParamData, type PathFunction as p2rPathFunction, type MatchResult as p2rMatchResult, type Match as p2rMatch, type MatchFunction as p2rMatchFunction, type Key as p2rKey, type Token as p2rToken, type Path as p2rPath, TokenData as p2rTokenData, PathError as p2rPathError, parse, compile, match, stringify, pathToRegexp } from 'path-to-regexp';
declare namespace path2regexp {
    type Encode = p2rEncode;
    type Decode = p2rDecode;
    type ParseOptions = p2rParseOptions;
    type PathToRegexpOptions = p2rPathToRegexpOptions;
    type MatchOptions = p2rMatchOptions;
    type CompileOptions = p2rCompileOptions;
    type TokenData = p2rTokenData;
    type ParamData = p2rParamData;
    type PathFunction<P extends ParamData> = p2rPathFunction<P>;
    type MatchResult<P extends ParamData> = p2rMatchResult<P>;
    type Match<P extends ParamData> = p2rMatch<P>;
    type MatchFunction<P extends ParamData> = p2rMatchFunction<P>;
    type Key = p2rKey;
    type Token = p2rToken;
    type Path = p2rPath;
}
declare const path2regexp: {
    TokenData: typeof p2rTokenData;
    PathError: typeof p2rPathError;
    parse: typeof parse;
    compile: typeof compile;
    match: typeof match;
    stringify: typeof stringify;
    pathToRegexp: typeof pathToRegexp;
};
export { path2regexp };
