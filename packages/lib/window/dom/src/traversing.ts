import { isFunction, setMixClassAttribute } from '@cdp/core-utils';
import { window, document } from './ssr';
import {
    ElementBase,
    SelectorBase,
    DOM,
    DOMSelector,
    DOMIterateCallback,
    dom as $,
} from './static';
import {
    DOMIterable,
    isEmptySelector,
    isStringSelector,
    isDocumentSelector,
    isWindowSelector,
    isNodeSelector,
    isIterableSelector,
} from './base';

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
    // public: Manipulation

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

        for (const [index, el] of this.entries()) {
            if (isFunction(selector)) {
                if (selector(index, el)) {
                    return true;
                }
            } else if (isStringSelector(selector)) {
                if ((el as Node as Element).matches && (el as Node as Element).matches(selector)) {
                    return true;
                }
            } else if (isWindowSelector(selector)) {
                return window === el;
            } else if (isDocumentSelector(selector)) {
                return document === el as Node as Document;
            } else if (isNodeSelector(selector)) {
                if (selector === el as Node) {
                    return true;
                }
            } else if (isIterableSelector(selector)) {
                for (const elem of selector) {
                    if (elem === el as Node) {
                        return true;
                    }
                }
            } else {
                return false;
            }
        }

        return false;
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
        for (const elem of this) {
            const parentNode = (elem as Node).parentNode;
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

        for (const elem of this) {
            let parentNode = (elem as Node).parentNode;
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
}

setMixClassAttribute(DOMTraversing, 'noConstructor');
