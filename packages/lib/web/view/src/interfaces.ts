import { PlainObject } from '@cdp/core-utils';
import { DOMSelector, DOMEventListener } from '@cdp/dom';

/**
 * @en DOM relation event map hash.
 * @ja DOM イベントに関連付けるハッシュ定義
 */
export interface ViewEventsHash<TElement extends Node = HTMLElement, TFuncName = string> {
    [selector: string]: TFuncName | DOMEventListener<TElement>;
}

/**
 * @en [[View]] construction options.
 * @ja [[View]] 構築に指定するオプション
 */
export interface ViewConstructionOptions<TElement extends Node = HTMLElement, TFuncName = string> {
    el?: DOMSelector<TElement | string>;
    events?: ViewEventsHash<TElement, TFuncName>;
    id?: string;
    className?: string;
    tagName?: string;
    attributes?: PlainObject<string | number | boolean | null>;
}
