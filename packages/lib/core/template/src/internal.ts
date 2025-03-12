import { escapeHTML } from '@cdp/core-utils';
import type {
    TemplateDelimiters,
    TemplateWriter,
    TemplateEscaper,
} from './interfaces';

/** (string | Token[]) */
export type TokenList = unknown;

/**
 * @en {@link TemplateEngine} token structure.
 * @ja {@link TemplateEngine} token 型
 *
 * @internal
 */
export type Token = [string, string, number, number, TokenList?, number?, boolean?];

/**
 * @en {@link Token} address id.
 * @ja {@link Token} アドレス識別子
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
 * @en Internal delimiters definition for {@link TemplateEngine}. ex) ['{{','}}'] or '{{ }}'
 * @ja {@link TemplateEngine} の内部で使用する区切り文字 ex) ['{{','}}'] or '{{ }}'
 */
export type Delimiters = string | TemplateDelimiters;

/** @internal */
export const globalSettings = {
    tags: ['{{', '}}'],
    escape: escapeHTML,
} as {
    tags: TemplateDelimiters;
    escape: TemplateEscaper;
    writer: TemplateWriter;
};
