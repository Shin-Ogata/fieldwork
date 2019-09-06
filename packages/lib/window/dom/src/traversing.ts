/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    isFunction,
    isString,
    noop,
    setMixClassAttribute,
} from '@cdp/core-utils';
import { window, document } from './ssr';
import {
    ElementBase,
    SelectorBase,
    QueryContext,
    DOM,
    DOMSelector,
    DOMIterateCallback,
    dom as $,
} from './static';
import {
    DOMBase,
    DOMIterable,
    isTypeElement,
    isEmptySelector,
    isStringSelector,
    isDocumentSelector,
    isWindowSelector,
    isNodeSelector,
    isIterableSelector,
} from './base';

export type DOMModificationCallback<T extends ElementBase, U extends ElementBase> = (index: number, element: T) => U;

/** @internal helper for `is()` and `filter()` */
function winnow<T extends SelectorBase, U extends ElementBase>(
    selector: DOMSelector<T> | DOMIterateCallback<U>,
    dom: DOMTraversing<U>,
    validCallback: (el: U) => any,
    invalidCallback?: () => any,
): any {
    invalidCallback = invalidCallback || noop;

    let retval: any;
    for (const [index, el] of dom.entries()) {
        if (isFunction(selector)) {
            if (selector.call(el, index, el)) {
                retval = validCallback(el);
                if (undefined !== retval) {
                    return retval;
                }
            }
        } else if (isStringSelector(selector)) {
            if ((el as Node as Element).matches && (el as Node as Element).matches(selector)) {
                retval = validCallback(el);
                if (undefined !== retval) {
                    return retval;
                }
            }
        } else if (isWindowSelector(selector)) {
            if (window === el) {
                retval = validCallback(el);
                if (undefined !== retval) {
                    return retval;
                }
            } else {
                retval = invalidCallback();
                if (undefined !== retval) {
                    return retval;
                }
            }
        } else if (isDocumentSelector(selector)) {
            if (document === el as Node as Document) {
                retval = validCallback(el);
                if (undefined !== retval) {
                    return retval;
                }
            } else {
                retval = invalidCallback();
                if (undefined !== retval) {
                    return retval;
                }
            }
        } else if (isNodeSelector(selector)) {
            if (selector === el as Node) {
                retval = validCallback(el);
                if (undefined !== retval) {
                    return retval;
                }
            }
        } else if (isIterableSelector(selector)) {
            for (const elem of selector) {
                if (elem === el as Node) {
                    retval = validCallback(el);
                    if (undefined !== retval) {
                        return retval;
                    }
                }
            }
        } else {
            retval = invalidCallback();
            if (undefined !== retval) {
                return retval;
            }
        }
    }

    retval = invalidCallback();
    if (undefined !== retval) {
        return retval;
    }
}

/** @internal helper for `parent()` and `parents()` */
function validParentNode(parentNode: Node | null): parentNode is Node {
    return null != parentNode && Node.DOCUMENT_NODE !== parentNode.nodeType && Node.DOCUMENT_FRAGMENT_NODE !== parentNode.nodeType;
}

/**
 * @en Mixin base class which concentrated the traversing methods.
 * @ja トラバースメソッドを集約した Mixin Base クラス
 */
export class DOMTraversing<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Element Methods

    /**
     * @en Retrieve one of the elements matched by the [[DOM]] object.
     * @ja インデックスを指定して配下の要素にアクセス
     *
     * @param index
     *  - `en` A zero-based integer indicating which element to retrieve. <br>
     *         If negative index is counted from the end of the matched set.
     *  - `ja` 0 base のインデックスを指定 <br>
     *         負値が指定された場合, 末尾からのインデックスとして解釈される
     */
    public get(index: number): TElement | undefined;

    /**
     * @en Retrieve the elements matched by the [[DOM]] object.
     * @ja 配下の要素すべてを配列で取得
     */
    public get(): TElement[];

    public get(index?: number): TElement[] | TElement | undefined {
        if (null != index) {
            return index < 0 ? this[index + this.length] : this[index];
        } else {
            return this.toArray();
        }
    }

    /**
     * @en Retrieve all the elements contained in the [[DOM]] set, as an array.
     * @ja 配下の要素すべてを配列で取得
     */
    public toArray(): TElement[] {
        return [...this];
    }

    /**
     * @en Return the position of the first element within the [[DOM]] collection relative to its sibling elements.
     * @ja [[DOM]] 内の最初の要素が兄弟要素の何番目に所属するかを返却
     */
    public index(): number | undefined;

    /**
     * @en Search for a given a selector, element, or [[DOM]] object from among the matched elements.
     * @ja セレクタ, 要素, または [[DOM]] オブジェクトを指定し, 配下の何番目に所属しているかを返却
     */
    public index<T extends ElementBase>(selector: string | T | DOM<T>): number | undefined;

    public index<T extends ElementBase>(selector?: string | T | DOM<T>): number | undefined {
        if (!isTypeElement(this)) {
            return undefined;
        } else if (null == selector) {
            let i = 0;
            let child: Node | null = this[0];
            while (null !== (child = child.previousSibling)) {
                if (Node.ELEMENT_NODE === child.nodeType) {
                    i += 1;
                }
            }
            return i;
        } else {
            let elem: T | Element;
            if (isString(selector)) {
                elem = $(selector)[0];
            } else {
                elem = selector instanceof DOMBase ? selector[0] : selector;
            }
            const i = [...this].indexOf(elem as Element);
            return 0 <= i ? i : undefined;
        }
    }

///////////////////////////////////////////////////////////////////////
// public: Traversing

    /**
     * @en Reduce the set of matched elements to the first in the set as [[DOM]] object.
     * @ja 管轄している最初の要素を [[DOM]] オブジェクトにして取得
     */
    public first(): DOM<TElement> {
        return $(this[0]) as DOM<TElement>;
    }

    /**
     * @en Reduce the set of matched elements to the final one in the set as [[DOM]] object.
     * @ja 管轄している末尾の要素を [[DOM]] オブジェクトにして取得
     */
    public last(): DOM<TElement> {
        return $(this[this.length - 1]) as DOM<TElement>;
    }

    /**
     * @en Create a new [[DOM]] object with elements added to the set from selector.
     * @ja 指定された `selector` で取得した `Element` を追加した新規 [[DOM]] オブジェクトを返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     */
    public add<T extends SelectorBase>(selector: DOMSelector<T>, context?: QueryContext): DOM<TElement> {
        const $add = $(selector, context);
        const elems = new Set([...this, ...$add]);
        return $([...elems] as any);
    }

    /**
     * @en Check the current matched set of elements against a selector, element, or [[DOM]] object.
     * @ja セレクタ, 要素, または [[DOM]] オブジェクトを指定し, 現在の要素のセットと一致するか確認
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列, テスト関数
     * @returns
     *  - `en` `true` if at least one of these elements matches the given arguments.
     *  - `ja` 引数に指定した条件が要素の一つでも一致すれば `true` を返却
     */
    public is<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): boolean {
        if (this.length <= 0 || isEmptySelector(selector as DOMSelector<T>)) {
            return false;
        }
        return winnow(selector, this, () => true, () => false);
    }

    /**
     * @en Reduce the set of matched elements to those that match the selector or pass the function's test.
     * @ja セレクタ, 要素, または [[DOM]] オブジェクトを指定し, 現在の要素のセットと一致したものを返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列, テスト関数
     * @returns
     *  - `en` `true` if at least one of these elements matches the given arguments.
     *  - `ja` 引数に指定した条件が要素の一つでも一致すれば `true` を返却
     */
    public filter<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): DOM<TElement> {
        if (this.length <= 0 || isEmptySelector(selector as DOMSelector<T>)) {
            return $() as DOM<TElement>;
        }
        const elements: TElement[] = [];
        winnow(selector, this, (el: TElement) => { elements.push(el); });
        return $(elements as Node[]) as DOM<TElement>;
    }

    /**
     * @en Pass each element in the current matched set through a function, producing a new [[DOM]] object containing the return values.
     * @ja コールバックで変更された要素を用いて新たに [[DOM]] オブジェクトを構築
     *
     * @param callback
     *  - `en` modification function object that will be invoked for each element in the current set.
     *  - `ja` 各要素に対して呼び出される変更関数
     */
    public map<T extends ElementBase>(callback: DOMModificationCallback<TElement, T>): DOM<T> {
        const elements: T[] = [];
        for (const [index, el] of this.entries()) {
            elements.push(callback.call(el, index, el));
        }
        return $(elements as Node[]) as DOM<T>;
    }

    /**
     * @en Iterate over a [[DOM]] object, executing a function for each matched element.
     * @ja 配下の要素に対してコールバック関数を実行
     *
     * @param callback
     *  - `en` callback function object that will be invoked for each element in the current set.
     *  - `ja` 各要素に対して呼び出されるコールバック関数
     */
    public each(callback: DOMIterateCallback<TElement>): this {
        for (const [index, el] of this.entries()) {
            if (false === callback.call(el, index, el)) {
                return this;
            }
        }
        return this;
    }

    /**
     * @en Get the first parent of each element in the current set of matched elements.
     * @ja 管轄している各要素の最初の親要素を返却
     *
     * @param selector
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     * @returns [[DOM]] instance
     */
    public parent<T extends Node = HTMLElement>(selector?: string): DOM<T> {
        const parents = new Set<Node>();
        for (const el of this) {
            const parentNode = (el as Node).parentNode;
            if (validParentNode(parentNode)) {
                if (selector) {
                    if ($(parentNode).is(selector)) {
                        parents.add(parentNode);
                    }
                } else {
                    parents.add(parentNode);
                }
            }
        }
        return $([...parents]) as DOM<T>;
    }

    /**
     * @en Get the ancestors of each element in the current set of matched elements.
     * @ja 管轄している各要素の祖先の親要素を返却
     *
     * @param selector
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     * @returns [[DOM]] instance
     */
    public parents<T extends Node = HTMLElement>(selector?: string): DOM<T> {
        return this.parentsUntil(undefined, selector);
    }

    /**
     * @en Get the ancestors of each element in the current set of matched elements, <br>
     *     up to but not including the element matched by the selector, DOM node, or [[DOM]] object
     * @ja 管轄している各要素の祖先で, 指定したセレクターや条件に一致する要素が出てくるまで選択して取得
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
     * @param filter
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     * @returns [[DOM]] instance
     */
    public parentsUntil<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>, filter?: string): DOM<T> {
        let parents: Node[] = [];

        for (const el of this) {
            let parentNode = (el as Node).parentNode;
            while (validParentNode(parentNode)) {
                if (null != selector) {
                    if ($(parentNode).is(selector)) {
                        break;
                    }
                }
                if (filter) {
                    if ($(parentNode).is(filter)) {
                        parents.push(parentNode);
                    }
                } else {
                    parents.push(parentNode);
                }
                parentNode = parentNode.parentNode;
            }
        }

        // 複数要素が対象になるときは反転
        if (1 < this.length) {
            parents = [...new Set(parents.reverse())].reverse();
        }

        return $(parents) as DOM<T>;
    }

///////////////////////////////////////////////////////////////////////
// public: Copying
}

setMixClassAttribute(DOMTraversing, 'protoExtendsOnly');

/*
[dom7]
.children()
.closest()
.eq()
.find() !! filter系 !!
.next()
.nextAll()
.prev()
.prevAll()
.siblings()

[jquery]
.contents()
.has()
.nextUntil()
.not() !! filter系 !!
.prevUntil()
.slice()
// Copying
.clone()
 */
