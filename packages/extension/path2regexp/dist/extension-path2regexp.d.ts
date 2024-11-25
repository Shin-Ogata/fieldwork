/*!
 * @cdp/extension-path2regexp 0.9.18
 *   Generated by 'cdp-task bundle dts' task.
 *   - built with TypeScript 5.7.2
 *   - includes:
 *     - path-to-regexp
 */

declare namespace path2regexp {
/**
 * Encode a string into another string.
 */
export type Encode = (value: string) => string;
/**
 * Decode a string into another string.
 */
export type Decode = (value: string) => string;
export interface ParseOptions {
    /**
     * A function for encoding input strings.
     */
    encodePath?: Encode;
}
export interface PathToRegexpOptions {
    /**
     * Matches the path completely without trailing characters. (default: `true`)
     */
    end?: boolean;
    /**
     * Allows optional trailing delimiter to match. (default: `true`)
     */
    trailing?: boolean;
    /**
     * Match will be case sensitive. (default: `false`)
     */
    sensitive?: boolean;
    /**
     * The default delimiter for segments. (default: `'/'`)
     */
    delimiter?: string;
}
export interface MatchOptions extends PathToRegexpOptions {
    /**
     * Function for decoding strings for params, or `false` to disable entirely. (default: `decodeURIComponent`)
     */
    decode?: Decode | false;
}
export interface CompileOptions {
    /**
     * Function for encoding input strings for output into the path, or `false` to disable entirely. (default: `encodeURIComponent`)
     */
    encode?: Encode | false;
    /**
     * The default delimiter for segments. (default: `'/'`)
     */
    delimiter?: string;
}
/**
 * Plain text.
 */
export interface Text {
    type: 'text';
    value: string;
}
/**
 * A parameter designed to match arbitrary text within a segment.
 */
export interface Parameter {
    type: 'param';
    name: string;
}
/**
 * A wildcard parameter designed to match multiple segments.
 */
export interface Wildcard {
    type: 'wildcard';
    name: string;
}
/**
 * A set of possible tokens to expand when matching.
 */
export interface Group {
    type: 'group';
    tokens: Token[];
}
/**
 * A token that corresponds with a regexp capture.
 */
export type Key = Parameter | Wildcard;
/**
 * A sequence of `path-to-regexp` keys that match capturing groups.
 */
export type Keys = Array<Key>;
/**
 * A sequence of path match characters.
 */
export type Token = Text | Parameter | Wildcard | Group;
export interface TokenData {
    readonly tokens: Token[];
}
export function parse(str: string, options?: ParseOptions): TokenData;
export function compile<P extends ParamData = ParamData>(path: Path, options?: CompileOptions & ParseOptions): (data?: P) => string;
export type ParamData = Partial<Record<string, string | string[]>>;
export type PathFunction<P extends ParamData> = (data?: P) => string;
/**
 * A match result contains data about the path match.
 */
export interface MatchResult<P extends ParamData> {
    path: string;
    params: P;
}
/**
 * A match is either `false` (no match) or a match result.
 */
export type Match<P extends ParamData> = false | MatchResult<P>;
/**
 * The match function takes a string and returns whether it matched the path.
 */
export type MatchFunction<P extends ParamData> = (path: string) => Match<P>;
/**
 * Supported path types.
 */
export type Path = string | TokenData;
export function match<P extends ParamData>(path: Path | Path[], options?: MatchOptions & ParseOptions): MatchFunction<P>;
export function pathToRegexp(path: Path | Path[], options?: PathToRegexpOptions & ParseOptions): {
    regexp: RegExp;
    keys: Keys;
};
export function stringify(data: TokenData): string;
}
export { path2regexp };
