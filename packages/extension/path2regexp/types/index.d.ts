import { Encode as p2rEncode, Decode as p2rDecode, ParseOptions as p2rParseOptions, PathToRegexpOptions as p2rPathToRegexpOptions, MatchOptions as p2rMatchOptions, CompileOptions as p2rCompileOptions, TokenData as p2rTokenData, ParamData as p2rParamData, PathFunction as p2rPathFunction, MatchResult as p2rMatchResult, Match as p2rMatch, MatchFunction as p2rMatchFunction, Key as p2rKey, Token as p2rToken, Path as p2rPath, PathRegExp as p2rPathRegExp, parse, compile, match, pathToRegexp } from 'path-to-regexp';
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
    type PathRegExp = p2rPathRegExp;
}
declare const path2regexp: {
    parse: typeof parse;
    compile: typeof compile;
    match: typeof match;
    pathToRegexp: typeof pathToRegexp;
};
export { path2regexp };
