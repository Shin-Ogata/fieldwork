import type { TemplateDelimiters } from './interfaces';
/** (string | Token[]) */
export type TokenList = unknown;
/**
 * @en {@link Token} address id.
 * @ja {@link Token} アドレス識別子
 */
export declare const enum TokenAddress {
    TYPE = 0,
    VALUE = 1,
    START = 2,
    END = 3,
    TOKEN_LIST = 4,
    TAG_INDEX = 5,
    HAS_NO_SPACE = 6
}
/**
 * @en Internal delimiters definition for {@link TemplateEngine}. ex) ['{{','}}'] or '{{ }}'
 * @ja {@link TemplateEngine} の内部で使用する区切り文字 ex) ['{{','}}'] or '{{ }}'
 */
export type Delimiters = string | TemplateDelimiters;
