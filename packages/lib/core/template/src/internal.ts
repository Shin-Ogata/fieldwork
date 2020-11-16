import { escapeHTML } from '@cdp/core-utils';
import {
    TemplateTags,
    TemplateWriter,
    TemplateEscaper,
} from './interfaces';

/** (string | Token[]) */
export type TokenList = unknown;

/**
 * @en [[TemplateEngine]] token structure.
 * @ja [[TemplateEngine]] token 型
 *
 * @internal
 */
export type Token = [string, string, number, number, TokenList?, number?, boolean?];

/**
 * @en [[Token]] address id.
 * @ja [[Token]] アドレス識別子
 */
export const enum TokenAddress {
    TYPE = 0,
    VALUE,
    START,
    END,
    TOKEN_LIST,
    TAG_INDEX,
    HAS_NO_SPACE,
}

/**
 * @en Internal delimiters definition for [[TemplateEngine]]. ex) ['{{','}}'] or '{{ }}'
 * @ja [[TemplateEngine]] の内部で使用する区切り文字 ex) ['{{','}}'] or '{{ }}'
 */
export type Delimiters = string | TemplateTags;

/** @internal */
export const globalSettings = {
    tags: ['{{', '}}'],
    escape: escapeHTML,
} as {
    tags: TemplateTags;
    escape: TemplateEscaper;
    writer: TemplateWriter;
};
