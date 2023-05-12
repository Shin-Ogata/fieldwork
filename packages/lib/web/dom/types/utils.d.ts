import { Nullish } from '@cdp/core-utils';
export type ElementBase = Node | Window;
export type ElementResult<T> = T extends ElementBase ? T : HTMLElement;
export type SelectorBase = Node | Window | string | Nullish;
export type ElementifySeed<T extends SelectorBase = HTMLElement> = T | (T extends ElementBase ? T[] : never) | NodeListOf<T extends Node ? T : never>;
export type QueryContext = ParentNode & Partial<NonElementParentNode>;
/**
 * @en {@link DOMStatic.utils.evaluate | evaluate}() options.
 * @ja {@link DOMStatic.utils.evaluate | evaluate}() に渡すオプション
 */
export interface EvalOptions {
    type?: string;
    src?: string;
    nonce?: string;
    noModule?: string;
}
