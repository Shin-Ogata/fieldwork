import { Nil } from '@cdp/core-utils';
import { ElementBase, SelectorBase, DOM, DOMSelector } from './static';
/**
 * @en Base abstraction class of [[DOMClass]]. This class provides iterator methods.
 * @ja [[DOMClass]] の基底抽象クラス. iterator を提供.
 */
export declare class DOMBase<T extends ElementBase> implements ArrayLike<T>, Iterable<T> {
    /**
     * @en number of `Element`
     * @ja 内包する `Element` 数
     */
    readonly length: number;
    /**
     * @en `Element` accessor
     * @ja `Element` への添え字アクセス
     */
    readonly [n: number]: T;
    /**
     * constructor
     *
     * @param elements
     *  - `en` operation targets `Element` array.
     *  - `ja` 操作対象の `Element` 配列
     */
    constructor(elements: T[]);
    /**
     * @en Iterator of [[ElementBase]] values in the array.
     * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
     */
    [Symbol.iterator](): Iterator<T>;
    /**
     * @en Returns an iterable of key(index), value([[ElementBase]]) pairs for every entry in the array.
     * @ja key(index), value([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    entries(): IterableIterator<[number, T]>;
    /**
     * @en Returns an iterable of keys(index) in the array.
     * @ja key(index) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    keys(): IterableIterator<number>;
    /**
     * @en Returns an iterable of values([[ElementBase]]) in the array.
     * @ja values([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    values(): IterableIterator<T>;
}
/**
 * @en Base interface for DOM Mixin class.
 * @ja DOM Mixin クラスの既定インターフェイス
 */
export interface DOMIterable<T extends ElementBase = HTMLElement> extends Partial<DOMBase<T>> {
    length: number;
    [n: number]: T;
    [Symbol.iterator]: () => Iterator<T>;
}
/**
 * @en Check target is `Node`.
 * @ja 対象が `Node` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export declare function isNode(el: unknown): el is Node;
/**
 * @en Check target is `Element`.
 * @ja 対象が `Element` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export declare function isNodeElement(el: ElementBase | Nil): el is Element;
/**
 * @en Check target is `HTMLElement` or `SVGElement`.
 * @ja 対象が `HTMLElement` または `SVGElement` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export declare function isNodeHTMLOrSVGElement(el: ElementBase | Nil): el is HTMLElement | SVGElement;
/**
 * @en Check target is `Element` or `Document`.
 * @ja 対象が `Element` または `Document` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export declare function isNodeQueriable(el: ElementBase | Nil): el is Element | Document;
/**
 * @en Check [[DOM]] target is `Element`.
 * @ja [[DOM]] が `Element` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export declare function isTypeElement(dom: DOMIterable<ElementBase>): dom is DOMIterable<Element>;
/**
 * @en Check [[DOM]] target is `HTMLElement` or `SVGElement`.
 * @ja [[DOM]] が `HTMLElement` または `SVGElement` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export declare function isTypeHTMLOrSVGElement(dom: DOMIterable<ElementBase>): dom is DOMIterable<HTMLElement | SVGElement>;
/**
 * @en Check [[DOM]] target is `Document`.
 * @ja [[DOM]] が `Document` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export declare function isTypeDocument(dom: DOMIterable<ElementBase>): dom is DOMIterable<Document>;
/**
 * @en Check [[DOM]] target is `Window`.
 * @ja [[DOM]] が `Window` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export declare function isTypeWindow(dom: DOMIterable<ElementBase>): dom is DOMIterable<Window>;
/**
 * @en Check the selector type is Nil.
 * @ja Nil セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isEmptySelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Nil>;
/**
 * @en Check the selector type is String.
 * @ja String セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isStringSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, string>;
/**
 * @en Check the selector type is Node.
 * @ja Node セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isNodeSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Node>;
/**
 * @en Check the selector type is Element.
 * @ja Element セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isElementSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Element>;
/**
 * @en Check the selector type is Document.
 * @ja Document セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isDocumentSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Document>;
/**
 * @en Check the selector type is Window.
 * @ja Window セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isWindowSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Window>;
/**
 * @en Check the selector is able to iterate.
 * @ja 走査可能なセレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isIterableSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, NodeListOf<Node>>;
/**
 * @en Check the selector type is [[DOM]].
 * @ja [[DOM]] セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isDOMSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, DOM>;
/**
 * @en Check node name is argument.
 * @ja Node 名が引数で与えた名前と一致するか判定
 */
export declare function nodeName(elem: Node | null, name: string): boolean;
/**
 * @en Get node offset parent. This function will work SVGElement, too.
 * @ja offset parent の取得. SVGElement にも適用可能
 */
export declare function getOffsetParent(node: Node): Element | null;
