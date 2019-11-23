import { TemplateTags, TemplateWriter } from './interfaces';
/** (string | Token[]) */
declare type TokenList = unknown;
/**
 * @en [[Template]] token structure.
 * @ja [[Template]] token 型
 */
export declare type Token = [string, string, number, number, TokenList?, number?, boolean?];
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
 * @en Internal delimiters definition for [[Template]]. ex) ['{{','}}'] or '{{ }}'
 * @ja [[Template]] の内部で使用する区切り文字 ex) ['{{','}}'] or '{{ }}'
 */
export declare type Delimiters = string | TemplateTags;
export declare const globalSettings: {
    tags: TemplateTags;
    escape: (src: import("@cdp/core-utils").Primitive) => string;
    writer: TemplateWriter;
};
export {};
