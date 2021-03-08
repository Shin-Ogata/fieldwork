import { TemplateDelimiters } from './interfaces';
/** (string | Token[]) */
export declare type TokenList = unknown;
/**
 * @en [[Token]] address id.
 * @ja [[Token]] アドレス識別子
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
 * @en Internal delimiters definition for [[TemplateEngine]]. ex) ['{{','}}'] or '{{ }}'
 * @ja [[TemplateEngine]] の内部で使用する区切り文字 ex) ['{{','}}'] or '{{ }}'
 */
export declare type Delimiters = string | TemplateDelimiters;
