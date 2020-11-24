import { PlainObject } from '@cdp/core-utils';
import { DOM, DOMEventListener } from '@cdp/dom';

/**
 * @en DOM relation event map hash.
 * @ja DOM イベントに関連付けるハッシュ定義
 */
export interface ViewEventsHash<TElement extends Node = HTMLElement> {
    [selector: string]: string | DOMEventListener<TElement>;
}

/**
 * @en [[View]] construction options.
 * @ja [[View]] 構築に指定するオプション
 */
export interface ViewConstructionOptions<TElement extends Node = HTMLElement> {
    el?: TElement | DOM<TElement>;
    events?: ViewEventsHash<TElement>;
    id?: string;
    className?: string;
    tagName?: string;
    attributes?: PlainObject<string | number | boolean | null>;
}
