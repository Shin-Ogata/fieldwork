import { ElementBase, SelectorBase, DOM, DOMSelector, DOMIterateCallback } from './static';
import { DOMIterable } from './base';
/**
 * @en Mixin base class which concentrated the methods of DOM class.
 * @ja DOM のメソッドを集約した Mixin Base クラス
 */
export declare class DOMMethods<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
    /**
     * @en Add css class to elements.
     * @ja css class 要素に追加
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     */
    addClass(className: string | string[]): this;
    /**
     * @en Remove css class to elements.
     * @ja css class 要素を削除
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     */
    removeClass(className: string | string[]): this;
    /**
     * @en Determine whether any of the matched elements are assigned the given class.
     * @ja 指定されたクラス名を少なくとも要素が持っているか判定
     *
     * @param className
     *  - `en` class name
     *  - `ja` クラス名
     */
    hasClass(className: string): boolean;
    /**
     * @en Add or remove one or more classes from each element in the set of matched elements, <br>
     *     depending on either the class's presence or the value of the state argument.
     * @ja 現在の状態に応じて, 指定されたクラス名を要素に追加/削除を実行
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     * @param force
     *  - `en` if this argument exists, true: the classes should be added / false: removed.
     *  - `ja` 引数が存在する場合, true: クラスを追加 / false: クラスを削除
     */
    toggleClass(className: string | string[], force?: boolean): this;
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
    is<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): boolean;
    /**
     * @en Get the first parent of each element in the current set of matched elements.
     * @ja 管轄している各要素の最初の親要素を返却
     *
     * @param selector
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     * @returns [[DOM]] instance
     */
    parent<T extends Node = HTMLElement>(selector?: string): DOM<T>;
    /**
     * @en Get the ancestors of each element in the current set of matched elements.
     * @ja 管轄している各要素の祖先の親要素を返却
     *
     * @param selector
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     * @returns [[DOM]] instance
     */
    parents<T extends Node = HTMLElement>(selector?: string): DOM<T>;
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
    parentsUntil<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>, filter?: string): DOM<T>;
}
