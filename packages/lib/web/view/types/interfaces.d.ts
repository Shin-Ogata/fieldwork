import type { PlainObject } from '@cdp/core-utils';
import type { DOMSelector, DOMEventListener } from '@cdp/dom';
/**
 * @en DOM relation event map hash.
 * @ja DOM イベントに関連付けるハッシュ定義
 */
export interface ViewEventsHash<TElement extends Node = HTMLElement, TFuncName = string> {
    [selector: string]: TFuncName | DOMEventListener<TElement>;
}
/**
 * @en {@link View} construction options.
 * @ja {@link View} 構築に指定するオプション
 */
export interface ViewConstructionOptions<TElement extends Node = HTMLElement, TFuncName = string> {
    el?: DOMSelector<TElement | string>;
    events?: ViewEventsHash<TElement, TFuncName>;
    id?: string;
    className?: string;
    tagName?: string;
    attributes?: PlainObject<string | number | boolean | null>;
}
