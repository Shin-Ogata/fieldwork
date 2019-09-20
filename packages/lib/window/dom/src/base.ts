import { Nil } from '@cdp/core-utils';
import { window, document } from './ssr';
import {
    ElementBase,
    SelectorBase,
    DOM,
    DOMSelector,
    dom as $,
} from './static';

/** @internal */
const _createIterableIterator = Symbol('createIterableIterator');

/**
 * @en Base abstraction class of [[DOMClass]]. This class provides iterator methods.
 * @ja [[DOMClass]] の基底抽象クラス. iterator を提供.
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
        const self: DOMAccess<T> = this;
        for (const [index, elem] of elements.entries()) {
            self[index] = elem;
        }
        this.length = elements.length;
    }

///////////////////////////////////////////////////////////////////////
// implements: Iterable<T>

    /**
     * @en Iterator of [[ElementBase]] values in the array.
     * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
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
                        value: undefined!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    };
                }
            },
        };
        return iterator as Iterator<T>;
    }

    /**
     * @en Returns an iterable of key(index), value([[ElementBase]]) pairs for every entry in the array.
     * @ja key(index), value([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
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
     * @en Returns an iterable of values([[ElementBase]]) in the array.
     * @ja values([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
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
                        value: undefined!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
export interface DOMAccess<T extends ElementBase = HTMLElement> extends Partial<DOM<T>> { } // eslint-disable-line @typescript-eslint/no-empty-interface

//__________________________________________________________________________________________________//

/**
 * @en Check target is `Node`.
 * @ja 対象が `Node` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export function isNode(el: unknown): el is Node {
    return !!(el && (el as Node).nodeType);
}

/**
 * @en Check target is `Element`.
 * @ja 対象が `Element` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export function isNodeElement(el: ElementBase | Nil): el is Element {
    return isNode(el) && (Node.ELEMENT_NODE === el.nodeType);
}

/**
 * @en Check target is `HTMLElement` or `SVGElement`.
 * @ja 対象が `HTMLElement` または `SVGElement` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export function isNodeHTMLOrSVGElement(el: ElementBase | Nil): el is HTMLElement | SVGElement {
    return isNodeElement(el) && (null != (el as HTMLElement).dataset);
}

/**
 * @en Check target is `Element` or `Document`.
 * @ja 対象が `Element` または `Document` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export function isNodeQueriable(el: ElementBase | Nil): el is Element | Document {
    return !!(el && (el as Node as Element).querySelector);
}

/**
 * @en Check target is `Document`.
 * @ja 対象が `Document` であるか判定
 *
 * @param el
 *  - `en` [[ElementBase]] instance
 *  - `ja` [[ElementBase]] インスタンス
 */
export function isNodeDocument(el: ElementBase | Nil): el is Document {
    return isNode(el) && (Node.DOCUMENT_NODE === el.nodeType);
}

//__________________________________________________________________________________________________//

/**
 * @en Check [[DOM]] target is `Element`.
 * @ja [[DOM]] が `Element` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export function isTypeElement(dom: DOMIterable<ElementBase>): dom is DOMIterable<Element> {
    return isNodeElement(dom[0]);
}

/**
 * @en Check [[DOM]] target is `HTMLElement` or `SVGElement`.
 * @ja [[DOM]] が `HTMLElement` または `SVGElement` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export function isTypeHTMLOrSVGElement(dom: DOMIterable<ElementBase>): dom is DOMIterable<HTMLElement | SVGElement> {
    return isNodeHTMLOrSVGElement(dom[0]);
}

/**
 * @en Check [[DOM]] target is `Document`.
 * @ja [[DOM]] が `Document` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export function isTypeDocument(dom: DOMIterable<ElementBase>): dom is DOMIterable<Document> {
    return document === dom[0];
}

/**
 * @en Check [[DOM]] target is `Window`.
 * @ja [[DOM]] が `Window` を対象にしているか判定
 *
 * @param dom
 *  - `en` [[DOMIterable]] instance
 *  - `ja` [[DOMIterable]] インスタンス
 */
export function isTypeWindow(dom: DOMIterable<ElementBase>): dom is DOMIterable<Window> {
    return window === dom[0];
}

//__________________________________________________________________________________________________//

/**
 * @en Check the selector type is Nil.
 * @ja Nil セレクタであるか判定
 *
 * @param selector
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isEmptySelector<T extends SelectorBase>(selector: DOMSelector<T>): selector is Extract<DOMSelector<T>, Nil> {
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
    return document === selector as Node as Document;
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
    return window === selector as Window;
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
 * @en Check the selector type is [[DOM]].
 * @ja [[DOM]] セレクタであるか判定
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
    return !!(elem && elem.nodeName.toLowerCase() === name.toLowerCase());
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
