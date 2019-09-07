import { ElementBase, SelectorBase, QueryContext, DOM, DOMSelector, DOMIterateCallback } from './static';
import { DOMIterable } from './base';
export declare type DOMModificationCallback<T extends ElementBase, U extends ElementBase> = (index: number, element: T) => U;
/**
 * @en Mixin base class which concentrated the traversing methods.
 * @ja トラバースメソッドを集約した Mixin Base クラス
 */
export declare class DOMTraversing<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
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
    get(index: number): TElement | undefined;
    /**
     * @en Retrieve the elements matched by the [[DOM]] object.
     * @ja 配下の要素すべてを配列で取得
     */
    get(): TElement[];
    /**
     * @en Retrieve all the elements contained in the [[DOM]] set, as an array.
     * @ja 配下の要素すべてを配列で取得
     */
    toArray(): TElement[];
    /**
     * @en Return the position of the first element within the [[DOM]] collection relative to its sibling elements.
     * @ja [[DOM]] 内の最初の要素が兄弟要素の何番目に所属するかを返却
     */
    index(): number | undefined;
    /**
     * @en Search for a given a selector, element, or [[DOM]] object from among the matched elements.
     * @ja セレクタ, 要素, または [[DOM]] オブジェクトを指定し, 配下の何番目に所属しているかを返却
     */
    index<T extends ElementBase>(selector: string | T | DOM<T>): number | undefined;
    /**
     * @en Reduce the set of matched elements to the first in the set as [[DOM]] object.
     * @ja 管轄している最初の要素を [[DOM]] オブジェクトにして取得
     */
    first(): DOM<TElement>;
    /**
     * @en Reduce the set of matched elements to the final one in the set as [[DOM]] object.
     * @ja 管轄している末尾の要素を [[DOM]] オブジェクトにして取得
     */
    last(): DOM<TElement>;
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
    add<T extends SelectorBase>(selector: DOMSelector<T>, context?: QueryContext): DOM<TElement>;
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
     * @en Reduce the set of matched elements to those that match the selector or pass the function's test.
     * @ja セレクタ, 要素, または [[DOM]] オブジェクトを指定し, 現在の要素のセットと一致したものを返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列, テスト関数
     * @returns
     *  - `en` New [[DOM]] object including filtered elements.
     *  - `ja` フィルタリングされた要素を内包する 新規 [[DOM]] オブジェクト
     */
    filter<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): DOM<TElement>;
    /**
     * @en Remove elements from the set of match the selector or pass the function's test.
     * @ja セレクタ, 要素, または [[DOM]] オブジェクトを指定し, 現在の要素のセットと一致したものを削除して返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列, テスト関数
     * @returns
     *  - `en` New [[DOM]] object excluding filtered elements.
     *  - `ja` フィルタリングされた要素を以外を内包する 新規 [[DOM]] オブジェクト
     */
    not<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): DOM<TElement>;
    /**
     * @en Get the descendants of each element in the current set of matched elements, filtered by a selector.
     * @ja 配下の要素に対して指定したセレクタに一致する要素を検索
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
     */
    find<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector: DOMSelector<U>): DOM<T>;
    /**
     * @en Reduce the set of matched elements to those that have a descendant that matches the selector.
     * @ja 配下の要素に対して指定したセレクタに一致した子要素持つ要素を返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
     */
    has<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector: DOMSelector<U>): DOM<T>;
    /**
     * @en Pass each element in the current matched set through a function, producing a new [[DOM]] object containing the return values.
     * @ja コールバックで変更された要素を用いて新たに [[DOM]] オブジェクトを構築
     *
     * @param callback
     *  - `en` modification function object that will be invoked for each element in the current set.
     *  - `ja` 各要素に対して呼び出される変更関数
     */
    map<T extends ElementBase>(callback: DOMModificationCallback<TElement, T>): DOM<T>;
    /**
     * @en Iterate over a [[DOM]] object, executing a function for each matched element.
     * @ja 配下の要素に対してコールバック関数を実行
     *
     * @param callback
     *  - `en` callback function object that will be invoked for each element in the current set.
     *  - `ja` 各要素に対して呼び出されるコールバック関数
     */
    each(callback: DOMIterateCallback<TElement>): this;
    /**
     * @en Reduce the set of matched elements to a subset specified by a range of indices.
     * @ja インデックス指定された範囲の要素を含む [[DOM]] オブジェクトを返却
     *
     * @param begin
     *  - `en` An integer indicating the 0-based position at which the elements begin to be selected.
     *  - `ja` 取り出しの開始位置を示す 0 から始まるインデックス
     * @param end
     *  - `en` An integer indicating the 0-based position at which the elements stop being selected.
     *  - `ja` 取り出しを終える直前の位置を示す 0 から始まるインデックス
     */
    slice(begin?: number, end?: number): DOM<TElement>;
    /**
     * @en Reduce the set of matched elements to the one at the specified index.
     * @ja インデックス指定した要素を含む [[DOM]] オブジェクトを返却
     *
     * @param index
     *  - `en` A zero-based integer indicating which element to retrieve. <br>
     *         If negative index is counted from the end of the matched set.
     *  - `ja` 0 base のインデックスを指定 <br>
     *         負値が指定された場合, 末尾からのインデックスとして解釈される
     */
    eq(index: number): DOM<TElement>;
    /**
     * @en For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
     * @ja 開始要素から最も近い親要素を選択. セレクター指定した場合, マッチする最も近い親要素を返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列, テスト関数
     */
    closest<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector: DOMSelector<U>): DOM<T>;
    /**
     * @en Get the children of each element in the set of matched elements, optionally filtered by a selector.
     * @ja 各要素の子要素を取得. セレクタが指定された場合はフィルタリングされた結果を返却
     *
     * @param selector
     *  - `en` filtered by a string selector.
     *  - `ja` フィルタ用文字列セレクタ
     */
    children<T extends Node = HTMLElement>(selector?: string): DOM<T>;
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
    parents<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
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
    parentsUntil<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase, V extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>, filter?: DOMSelector<V>): DOM<T>;
}
