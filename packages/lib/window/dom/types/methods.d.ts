import { ElementBase, SelectorBase, DOMSelector, DOMIterateCallback } from './static';
import { IDOM } from './base';
/**
 * @en Mixin base class which concentrated the methods of DOM class.
 * @ja DOM のメソッドを集約した Mixin Base クラス
 */
export declare class DOMMethods<TElement extends ElementBase = Element> implements IDOM<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
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
    is<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): boolean;
}
