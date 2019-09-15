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
    isNode,
    isNodeElement,
    isNodeQueriable,
    isTypeElement,
    isTypeWindow,
    isEmptySelector,
    isStringSelector,
    isDocumentSelector,
    isWindowSelector,
    isNodeSelector,
    isIterableSelector,
    nodeName,
    getOffsetParent,
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
            if (window === el as Window) {
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

/** @internal helper for `parent()`, `parents()` and `siblings()` */
function validParentNode(parentNode: Node | null): parentNode is Node {
    return null != parentNode && Node.DOCUMENT_NODE !== parentNode.nodeType && Node.DOCUMENT_FRAGMENT_NODE !== parentNode.nodeType;
}

/** @internal helper for `children()`, `parent()`, `next()` and `prev()` */
function validRetrieveNode<T extends SelectorBase>(node: Node | null, selector: DOMSelector<T> | undefined): node is Node {
    if (node) {
        if (selector) {
            if ($(node).is(selector)) {
                return true;
            }
        } else {
            return true;
        }
    }
    return false;
}

/** @internal helper for `nextUntil()` and `prevUntil() */
function retrieveSiblings<
    E extends ElementBase,
    T extends Node = HTMLElement,
    U extends SelectorBase = SelectorBase,
    V extends SelectorBase = SelectorBase
>(
    sibling: 'previousElementSibling' | 'nextElementSibling',
    dom: DOMTraversing<E>,
    selector?: DOMSelector<U>, filter?: DOMSelector<V>
): DOM<T> {
    if (!isTypeElement(dom)) {
        return $() as DOM<T>;
    }

    const siblings = new Set<Node>();

    for (const el of dom as DOMIterable<Element>) {
        let elem = el[sibling];
        while (elem) {
            if (null != selector) {
                if ($(elem).is(selector)) {
                    break;
                }
            }
            if (filter) {
                if ($(elem).is(filter)) {
                    siblings.add(elem);
                }
            } else {
                siblings.add(elem);
            }
            elem = elem[sibling];
        }
    }

    return $([...siblings]) as DOM<T>;
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
     * @en Retrieve one of the elements matched by the [[DOM]] instance.
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
     * @en Retrieve the elements matched by the [[DOM]] instance.
     * @ja 配下の要素すべてを配列で取得
     */
    public get(): TElement[];

    public get(index?: number): TElement[] | TElement | undefined {
        if (null != index) {
            index = Math.floor(index);
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
     * @en Search for a given a selector, element, or [[DOM]] instance from among the matched elements.
     * @ja セレクタ, 要素, または [[DOM]] インスタンスを指定し, 配下の何番目に所属しているかを返却
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
     * @en Reduce the set of matched elements to the first in the set as [[DOM]] instance.
     * @ja 管轄している最初の要素を [[DOM]] インスタンスにして取得
     */
    public first(): DOM<TElement> {
        return $(this[0]) as DOM<TElement>;
    }

    /**
     * @en Reduce the set of matched elements to the final one in the set as [[DOM]] instance.
     * @ja 管轄している末尾の要素を [[DOM]] インスタンスにして取得
     */
    public last(): DOM<TElement> {
        return $(this[this.length - 1]) as DOM<TElement>;
    }

    /**
     * @en Create a new [[DOM]] instance with elements added to the set from selector.
     * @ja 指定された `selector` で取得した `Element` を追加した新規 [[DOM]] インスタンスを返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
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
     * @en Check the current matched set of elements against a selector, element, or [[DOM]] instance.
     * @ja セレクタ, 要素, または [[DOM]] インスタンスを指定し, 現在の要素のセットと一致するか確認
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
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
     * @ja セレクタ, 要素, または [[DOM]] インスタンスを指定し, 現在の要素のセットと一致したものを返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
     * @returns
     *  - `en` New [[DOM]] instance including filtered elements.
     *  - `ja` フィルタリングされた要素を内包する 新規 [[DOM]] インスタンス
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
     * @en Remove elements from the set of match the selector or pass the function's test.
     * @ja セレクタ, 要素, または [[DOM]] インスタンスを指定し, 現在の要素のセットと一致したものを削除して返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
     * @returns
     *  - `en` New [[DOM]] instance excluding filtered elements.
     *  - `ja` フィルタリングされた要素を以外を内包する 新規 [[DOM]] インスタンス
     */
    public not<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): DOM<TElement> {
        if (this.length <= 0 || isEmptySelector(selector as DOMSelector<T>)) {
            return $() as DOM<TElement>;
        }
        const elements = new Set<TElement>([...this]);
        winnow(selector, this, (el: TElement) => { elements.delete(el); });
        return $([...elements] as Node[]) as DOM<TElement>;
    }

    /**
     * @en Get the descendants of each element in the current set of matched elements, filtered by a selector.
     * @ja 配下の要素に対して指定したセレクタに一致する要素を検索
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    public find<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector: DOMSelector<U>): DOM<T> {
        if (!isString(selector)) {
            const $selector = $(selector) as DOM<Node>;
            return $selector.filter((index, elem) => {
                for (const el of this) {
                    if (isNode(el) && el !== elem && el.contains(elem)) {
                        return true;
                    }
                }
                return false;
            }) as DOM<T>;
        } else if (isTypeWindow(this)) {
            return $() as DOM<T>;
        } else {
            const elements: Element[] = [];
            for (const el of this) {
                if (isNodeQueriable(el)) {
                    const elems = el.querySelectorAll(selector);
                    elements.push(...elems);
                }
            }
            return $(elements as Node[]) as DOM<T>;
        }
    }

    /**
     * @en Reduce the set of matched elements to those that have a descendant that matches the selector.
     * @ja 配下の要素に対して指定したセレクタに一致した子要素持つ要素を返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    public has<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector: DOMSelector<U>): DOM<T> {
        if (isTypeWindow(this)) {
            return $() as DOM<T>;
        }

        const targets: Node[] = [];
        for (const el of this) {
            if (isNodeQueriable(el)) {
                const $target = $(selector, el as Element) as DOM<Element>;
                targets.push(...$target);
            }
        }

        return this.filter((index, elem) => {
            if (isNode(elem)) {
                for (const el of new Set(targets)) {
                    if (elem !== el && elem.contains(el)) {
                        return true;
                    }
                }
            }
            return false;
        }) as DOM<Node> as DOM<T>;
    }

    /**
     * @en Pass each element in the current matched set through a function, producing a new [[DOM]] instance containing the return values.
     * @ja コールバックで変更された要素を用いて新たに [[DOM]] インスタンスを構築
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
     * @en Iterate over a [[DOM]] instance, executing a function for each matched element.
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
     * @en Reduce the set of matched elements to a subset specified by a range of indices.
     * @ja インデックス指定された範囲の要素を含む [[DOM]] インスタンスを返却
     *
     * @param begin
     *  - `en` An integer indicating the 0-based position at which the elements begin to be selected.
     *  - `ja` 取り出しの開始位置を示す 0 から始まるインデックス
     * @param end
     *  - `en` An integer indicating the 0-based position at which the elements stop being selected.
     *  - `ja` 取り出しを終える直前の位置を示す 0 から始まるインデックス
     */
    public slice(begin?: number, end?: number): DOM<TElement> {
        return $([...this].slice(begin, end) as Node[]) as DOM<TElement>;
    }

    /**
     * @en Reduce the set of matched elements to the one at the specified index.
     * @ja インデックス指定した要素を含む [[DOM]] インスタンスを返却
     *
     * @param index
     *  - `en` A zero-based integer indicating which element to retrieve. <br>
     *         If negative index is counted from the end of the matched set.
     *  - `ja` 0 base のインデックスを指定 <br>
     *         負値が指定された場合, 末尾からのインデックスとして解釈される
     */
    public eq(index: number): DOM<TElement> {
        if (null == index) {
            // for fail safe
            return $() as DOM<TElement>;
        } else {
            return $(this.get(index)) as DOM<TElement>;
        }
    }

    /**
     * @en For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
     * @ja 開始要素から最も近い親要素を選択. セレクター指定した場合, マッチする最も近い親要素を返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
     */
    public closest<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector: DOMSelector<U>): DOM<T> {
        if (null == selector || !isTypeElement(this)) {
            return $() as DOM<T>;
        } else if (isString(selector)) {
            const closests = new Set<Node>();
            for (const el of this) {
                if (isNodeElement(el)) {
                    const c = el.closest(selector);
                    if (c) {
                        closests.add(c);
                    }
                }
            }
            return $([...closests]) as DOM<T>;
        } else if (this.is(selector)) {
            return $(this as any);
        } else {
            return this.parents(selector).eq(0) as DOM<Node> as DOM<T>;
        }
    }

    /**
     * @en Get the children of each element in the set of matched elements, optionally filtered by a selector.
     * @ja 各要素の子要素を取得. セレクタが指定された場合はフィルタリングされた結果を返却
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    public children<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        if (isTypeWindow(this)) {
            return $() as DOM<T>;
        }

        const children = new Set<Node>();
        for (const el of this) {
            if (isNodeQueriable(el)) {
                for (const child of el.children) {
                    if (validRetrieveNode(child, selector)) {
                        children.add(child);
                    }
                }
            }
        }
        return $([...children]) as DOM<T>;
    }

    /**
     * @en Get the first parent of each element in the current set of matched elements.
     * @ja 管轄している各要素の最初の親要素を返却
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     * @returns [[DOM]] instance
     */
    public parent<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        const parents = new Set<Node>();
        for (const el of this) {
            if (isNode(el)) {
                const parentNode = el.parentNode;
                if (validParentNode(parentNode) && validRetrieveNode(parentNode, selector)) {
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
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     * @returns [[DOM]] instance
     */
    public parents<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        return this.parentsUntil(undefined, selector);
    }

    /**
     * @en Get the ancestors of each element in the current set of matched elements, <br>
     *     up to but not including the element matched by the selector, DOM node, or [[DOM]] instance
     * @ja 管轄している各要素の祖先で, 指定したセレクターや条件に一致する要素が出てくるまで選択して取得
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     * @param filter
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     * @returns [[DOM]] instance
     */
    public parentsUntil<
        T extends Node = HTMLElement,
        U extends SelectorBase = SelectorBase,
        V extends SelectorBase = SelectorBase
    >(selector?: DOMSelector<U>, filter?: DOMSelector<V>): DOM<T> {
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

    /**
     * @en Get the immediately following sibling of each element in the set of matched elements. <br>
     *     If a selector is provided, it retrieves the next sibling only if it matches that selector.
     * @ja 要素集合の各要素の直後にあたる兄弟要素を抽出 <br>
     *     条件式を指定し、結果セットから更に絞込みを行うことも可能
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    public next<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        if (!isTypeElement(this)) {
            return $() as DOM<T>;
        }

        const nextSiblings = new Set<Node>();
        for (const el of this) {
            if (isNodeElement(el)) {
                const elem = el.nextElementSibling;
                if (validRetrieveNode(elem, selector)) {
                    nextSiblings.add(elem);
                }
            }
        }
        return $([...nextSiblings]) as DOM<T>;
    }

    /**
     * @en Get all following siblings of each element in the set of matched elements, optionally filtered by a selector.
     * @ja マッチした要素集合内の各要素の次以降の全ての兄弟要素を取得. セレクタを指定することでフィルタリングすることが可能.
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    public nextAll<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        return this.nextUntil(undefined, selector);
    }

    /**
     * @en Get all following siblings of each element up to but not including the element matched by the selector.
     * @ja マッチした要素の次以降の兄弟要素で, 指定したセレクターや条件に一致する要素が出てくるまで選択して取得
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     * @param filter
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     */
    public nextUntil<
        T extends Node = HTMLElement,
        U extends SelectorBase = SelectorBase,
        V extends SelectorBase = SelectorBase
    >(selector?: DOMSelector<U>, filter?: DOMSelector<V>): DOM<T> {
        return retrieveSiblings('nextElementSibling', this, selector, filter);
    }

    /**
     * @en Get the immediately preceding sibling of each element in the set of matched elements. <br>
     *     If a selector is provided, it retrieves the previous sibling only if it matches that selector.
     * @ja マッチした要素集合の各要素の直前の兄弟要素を抽出 <br>
     *     条件式を指定し、結果セットから更に絞込みを行うことも可能
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    public prev<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        if (!isTypeElement(this)) {
            return $() as DOM<T>;
        }

        const prevSiblings = new Set<Node>();
        for (const el of this) {
            if (isNodeElement(el)) {
                const elem = el.previousElementSibling;
                if (validRetrieveNode(elem, selector)) {
                    prevSiblings.add(elem);
                }
            }
        }
        return $([...prevSiblings]) as DOM<T>;
    }

    /**
     * @en Get all preceding siblings of each element in the set of matched elements, optionally filtered by a selector.
     * @ja マッチした要素集合内の各要素の前以降の全ての兄弟要素を取得. セレクタを指定することでフィルタリングすることが可能.
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    public prevAll<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        return this.prevUntil(undefined, selector);
    }

    /**
     * @en Get all preceding siblings of each element up to but not including the element matched by the selector.
     * @ja マッチした要素の前以降の兄弟要素で, 指定したセレクタや条件に一致する要素が出てくるまで選択して取得
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     * @param filter
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     */
    public prevUntil<
        T extends Node = HTMLElement,
        U extends SelectorBase = SelectorBase,
        V extends SelectorBase = SelectorBase
    >(selector?: DOMSelector<U>, filter?: DOMSelector<V>): DOM<T> {
        return retrieveSiblings('previousElementSibling', this, selector, filter);
    }

    /**
     * @en Get the siblings of each element in the set of matched elements, optionally filtered by a selector
     * @ja マッチした各要素の兄弟要素を取得
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    public siblings<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T> {
        if (!isTypeElement(this)) {
            return $() as DOM<T>;
        }

        const siblings = new Set<Node>();
        for (const el of this) {
            if (isNodeElement(el)) {
                const parentNode = el.parentNode;
                if (validParentNode(parentNode)) {
                    for (const sibling of $(parentNode).children(selector)) {
                        if (sibling !== el) {
                            siblings.add(sibling);
                        }
                    }
                }
            }
        }
        return $([...siblings]) as DOM<T>;
    }

    /**
     * @en Get the children of each element in the set of matched elements, including text and comment nodes.
     * @ja テキストやHTMLコメントを含む子要素を取得
     */
    public contents<T extends Node = HTMLElement>(): DOM<T> {
        if (isTypeWindow(this)) {
            return $() as DOM<T>;
        }

        const contents = new Set<Node>();
        for (const el of this) {
            if (isNode(el)) {
                if (nodeName(el, 'iframe')) {
                    contents.add((el as Node as HTMLIFrameElement).contentDocument as Node);
                } else if (nodeName(el, 'template')) {
                    contents.add((el as Node as HTMLTemplateElement).content);
                } else {
                    for (const node of el.childNodes) {
                        contents.add(node);
                    }
                }
            }
        }
        return $([...contents]) as DOM<T>;
    }

    /**
     * @en Get the closest ancestor element that is positioned.
     * @ja 要素の先祖要素で, スタイルでポジション指定(positiionがrelative, absolute, fixedのいずれか)されているものを取得
     */
    public offsetParent<T extends Node = HTMLElement>(): DOM<T> {
        const rootElement = document.documentElement;
        if (this.length <= 0) {
            return $() as DOM<T>;
        } else if (!isTypeElement(this)) {
            return $(rootElement) as DOM<Node> as DOM<T>;
        } else {
            const offsets = new Set<Node>();
            for (const el of this) {
                const offset = getOffsetParent(el as Node) || rootElement;
                offsets.add(offset);
            }
            return $([...offsets]) as DOM<T>;
        }
    }
}

setMixClassAttribute(DOMTraversing, 'protoExtendsOnly');
