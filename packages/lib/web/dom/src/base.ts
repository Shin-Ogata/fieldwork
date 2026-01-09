import type { Nullish, Writable } from '@cdp/core-utils';
import { isWindowContext } from './utils';
import {
    type ElementBase,
    type SelectorBase,
    type DOM,
    type DOMSelector,
    dom as $,
} from './static';

/** @internal */ const _createIterableIterator = Symbol('create-iterable-iterator');

/**
 * @en Base abstraction class of {@link DOMClass}. This class provides iterator methods.
 * @ja {@link DOMClass} の基底抽象クラス. iterator を提供.
 */
export class DOMBase<T extends ElementBase> implements ArrayLike<T>, Iterable<T> {
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
    constructor(elements: T[]) {
        const self: Writable<DOMAccess<T>> = this;
        for (const [index, elem] of elements.entries()) {
            self[index] = elem;
        }
        this.length = elements.length;
    }

    /**
     * @en Check target is `Node` and connected to` Document` or `ShadowRoot`.
     * @ja 対象が `Node` でありかつ `Document` または `ShadowRoot` に接続されているか判定
     *
     * @param el
     *  - `en` {@link ElementBase} instance
     *  - `ja` {@link ElementBase} インスタンス
     */
    get isConnected(): boolean {
        for (const el of this) {
            if (isNode(el) && el.isConnected) {
                return true;
            }
        }
        return false;
    }

///////////////////////////////////////////////////////////////////////
// implements: Iterable<T>

    /**
     * @en Iterator of {@link ElementBase} values in the array.
     * @ja 格納している {@link ElementBase} にアクセス可能なイテレータオブジェクトを返却
     */
    [Symbol.iterator](): Iterator<T> {
        const iterator = {
            base: this,
            pointer: 0,
            next(): IteratorResult<T> {
                if (this.pointer < this.base.length) {
                    return {
                        done: false,
                        value: this.base[this.pointer++],
                    };
                } else {
                    return {
                        done: true,
                        value: undefined!,
                    };
                }
            },
        };
        return iterator as Iterator<T>;
    }

    /**
     * @en Returns an iterable of key(index), value({@link ElementBase}) pairs for every entry in the array.
     * @ja key(index), value({@link ElementBase}) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    entries(): IterableIterator<[number, T]> {
        return this[_createIterableIterator]((key: number, value: T) => [key, value]);
    }

    /**
     * @en Returns an iterable of keys(index) in the array.
     * @ja key(index) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    keys(): IterableIterator<number> {
        return this[_createIterableIterator]((key: number) => key);
    }

    /**
     * @en Returns an iterable of values({@link ElementBase}) in the array.
     * @ja values({@link ElementBase}) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    values(): IterableIterator<T> {
        return this[_createIterableIterator]((key: number, value: T) => value);
    }

    /** @internal common iterator create function */
    private [_createIterableIterator]<R>(valueGenerator: (key: number, value: T) => R): IterableIterator<R> {
        const context = {
            base: this,
            pointer: 0,
        };

        const iterator: IterableIterator<R> = {
            next(): IteratorResult<R> {
                const current = context.pointer;
                if (current < context.base.length) {
                    context.pointer++;
                    return {
                        done: false,
                        value: valueGenerator(current, context.base[current]),
                    };
                } else {
                    return {
                        done: true,
                        value: undefined!,
                    };
                }
            },
            [Symbol.iterator](): IterableIterator<R> {
                return this;
            },
        };

        return iterator;
    }
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
 * @internal DOM access
 *
 * @example <br>
 *
 * ```ts
 *   const dom: DOMAccess<TElement> = this as DOMIterable<TElement>;
 * ```
 */
export interface DOMAccess<T extends ElementBase = HTMLElement> extends Partial<DOM<T>> { } // eslint-disable-line @typescript-eslint/no-empty-object-type

//__________________________________________________________________________________________________//

/**
 * @en Check target is `Node`.
 * @ja 対象が `Node` であるか判定
 *
 * @param el
 *  - `en` {@link ElementBase} instance
 *  - `ja` {@link ElementBase} インスタンス
 */
export function isNode(el: unknown): el is Node {
    return !!(el && (el as Node).nodeType);
}

/**
 * @en Check target is `Element`.
 * @ja 対象が `Element` であるか判定
 *
 * @param el
 *  - `en` {@link ElementBase} instance
 *  - `ja` {@link ElementBase} インスタンス
 */
export function isNodeElement(el: ElementBase | Nullish): el is Element {
    return isNode(el) && (Node.ELEMENT_NODE === el.nodeType);
}

/**
 * @en Check target is `HTMLElement` or `SVGElement`.
 * @ja 対象が `HTMLElement` または `SVGElement` であるか判定
 *
 * @param el
 *  - `en` {@link ElementBase} instance
 *  - `ja` {@link ElementBase} インスタンス
 */
export function isNodeHTMLOrSVGElement(el: ElementBase | Nullish): el is HTMLElement | SVGElement {
    return isNodeElement(el) && (null != (el as HTMLElement).dataset);
}

/**
 * @en Check target is `Element` or `Document`.
 * @ja 対象が `Element` または `Document` であるか判定
 *
 * @param el
 *  - `en` {@link ElementBase} instance
 *  - `ja` {@link ElementBase} インスタンス
 */
export function isNodeQueriable(el: ElementBase | Nullish): el is Element | Document {
    return !!(el && (el as Node as Element).querySelector);
}

/**
 * @en Check target is `Document`.
 * @ja 対象が `Document` であるか判定
 *
 * @param el
 *  - `en` {@link ElementBase} instance
 *  - `ja` {@link ElementBase} インスタンス
 */
export function isNodeDocument(el: ElementBase | Nullish): el is Document {
    return isNode(el) && (Node.DOCUMENT_NODE === el.nodeType);
}

//__________________________________________________________________________________________________//

/**
 * @en Check {@link DOM} target is `Element`.
 * @ja {@link DOM} が `Element` を対象にしているか判定
 *
 * @param dom
 *  - `en` {@link DOMIterable} instance
 *  - `ja` {@link DOMIterable} インスタンス
 */
export function isTypeElement(dom: DOMIterable<ElementBase>): dom is DOMIterable<Element> {
    return isNodeElement(dom[0]);
}

/**
 * @en Check {@link DOM} target is `HTMLElement` or `SVGElement`.
 * @ja {@link DOM} が `HTMLElement` または `SVGElement` を対象にしているか判定
 *
 * @param dom
 *  - `en` {@link DOMIterable} instance
 *  - `ja` {@link DOMIterable} インスタンス
 */
export function isTypeHTMLOrSVGElement(dom: DOMIterable<ElementBase>): dom is DOMIterable<HTMLElement | SVGElement> {
    return isNodeHTMLOrSVGElement(dom[0]);
}

/**
 * @en Check {@link DOM} target is `Document`.
 * @ja {@link DOM} が `Document` を対象にしているか判定
 *
 * @param dom
 *  - `en` {@link DOMIterable} instance
 *  - `ja` {@link DOMIterable} インスタンス
 */
export function isTypeDocument(dom: DOMIterable<ElementBase>): dom is DOMIterable<Document> {
    return dom[0] instanceof Document;
}

/**
 * @en Check {@link DOM} target is `Window`.
 * @ja {@link DOM} が `Window` を対象にしているか判定
 *
 * @param dom
 *  - `en` {@link DOMIterable} instance
 *  - `ja` {@link DOMIterable} インスタンス
 */
export function isTypeWindow(dom: DOMIterable<ElementBase>): dom is DOMIterable<Window> {
    return isWindowContext(dom[0]);
}

//__________________________________________________________________________________________________//

/**
 * @en Check the selector type is Nullish.
 * @ja Nullish セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isEmptySelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Nullish> {
    return !selector;
}

/**
 * @en Check the selector type is String.
 * @ja String セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isStringSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, string> {
    return 'string' === typeof selector;
}

/**
 * @en Check the selector type is Node.
 * @ja Node セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isNodeSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Node> {
    return null != (selector as Node).nodeType;
}

/**
 * @en Check the selector type is Element.
 * @ja Element セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isElementSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Element> {
    return selector instanceof Element;
}

/**
 * @en Check the selector type is Document.
 * @ja Document セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isDocumentSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Document> {
    return selector instanceof Document;
}

/**
 * @en Check the selector type is Window.
 * @ja Window セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isWindowSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Window> {
    return isWindowContext(selector);
}

/**
 * @en Check the selector is able to iterate.
 * @ja 走査可能なセレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isIterableSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, NodeListOf<Node>> {
    return null != (selector as T[]).length;
}

/**
 * @en Check the selector type is {@link DOM}.
 * @ja {@link DOM} セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isDOMSelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, DOM> {
    return selector instanceof DOMBase;
}

//__________________________________________________________________________________________________//

/**
 * @en Check node name is argument.
 * @ja Node 名が引数で与えた名前と一致するか判定
 */
export function nodeName(elem: Node | null, name: string): boolean {
    return !!(elem?.nodeName.toLowerCase() === name.toLowerCase());
}

/**
 * @en Get node offset parent. This function will work SVGElement, too.
 * @ja offset parent の取得. SVGElement にも適用可能
 */
export function getOffsetParent(node: Node): Element | null {
    if ((node as HTMLElement).offsetParent) {
        return (node as HTMLElement).offsetParent;
    } else if (nodeName(node, 'svg')) {
        const $svg = $(node);
        const cssProps = $svg.css(['display', 'position']);
        if ('none' === cssProps.display || 'fixed' === cssProps.position) {
            return null;
        } else {
            let parent = $svg[0].parentElement;
            while (parent) {
                const { display, position } = $(parent).css(['display', 'position']);
                if ('none' === display) {
                    return null;
                } else if (!position || 'static' === position) {
                    parent = parent.parentElement;
                } else {
                    break;
                }
            }
            return parent;
        }
    } else {
        return null;
    }
}
