import { escapeHTML } from '@cdp/core-utils';
import {
    TemplateTags,
    TemplateWriter,
    TemplateEscaper,
} from './interfaces';

/** (string | Token[]) */
type TokenList = unknown;

/**
 * @en [[Template]] token structure.
 * @ja [[Template]] token 型
 */
export type Token = [string, string, number, number, TokenList?, number?, boolean?];

/**
 * @en Internal delimiters definition for [[Template]]. ex) ['{{','}}'] or '{{ }}'
 * @ja [[Template]] の内部で使用する区切り文字 ex) ['{{','}}'] or '{{ }}'
 */
export type Delimiters = string | TemplateTags;

export const globalSettings = {
    tags: ['{{', '}}'],
    escape: escapeHTML,
} as {
    tags: TemplateTags;
    escape: TemplateEscaper;
    writer: TemplateWriter;
};
