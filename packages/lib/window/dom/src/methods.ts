import { isFunction } from '@cdp/core-utils';
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
    IDOM,
    isEmptySelector,
    isStringSelector,
    isDocumentSelector,
    isWindowSelector,
    isNodeSelector,
    isIterableSelector,
} from './base';

/**
 * @en Mixin base class which concentrated the methods of DOM class.
 * @ja DOM のメソッドを集約した Mixin Base クラス
 */
export class DOMMethods<TElement extends ElementBase = Element> implements IDOM<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: IDOM<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public:

    /**
     * @en Check the current matched set of elements against a selector, element, or [[DOM]] object.
     * @ja セレクタ, 要素, または [[DOM]] オブジェクトを指定し, 現在の要素のセットと一致するか確認
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]], test function.
     *  - `ja` [[DOMClass]] のもとになるオブジェクト(群)またはセレクタ文字列, テスト関数
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
            } else if (isIterableSelector(selector as DOMSelector<TElement>)) {
                for (const elem of selector as Iterable<TElement>) {
                    if (elem === el) {
                        return true;
                    }
                }
            } else {
                return false;
            }
        }

        return false;
    }
}
