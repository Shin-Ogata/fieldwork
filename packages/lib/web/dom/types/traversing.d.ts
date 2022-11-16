import { ElementBase, SelectorBase, QueryContext, DOM, DOMSelector, DOMResult, DOMIterateCallback } from './static';
import { DOMIterable } from './base';
export type DOMModificationCallback<T extends ElementBase, U extends ElementBase> = (index: number, element: T) => U;
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
     * @en Retrieve one of the elements matched by the [[DOM]] instance.
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
     * @en Retrieve the elements matched by the [[DOM]] instance.
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
     * @en Search for a given a selector, element, or [[DOM]] instance from among the matched elements.
     * @ja セレクタ, 要素, または [[DOM]] インスタンスを指定し, 配下の何番目に所属しているかを返却
     */
    index<T extends ElementBase>(selector: string | T | DOM<T>): number | undefined;
    /**
     * @en Reduce the set of matched elements to the first in the set as [[DOM]] instance.
     * @ja 管轄している最初の要素を [[DOM]] インスタンスにして取得
     */
    first(): DOM<TElement>;
    /**
     * @en Reduce the set of matched elements to the final one in the set as [[DOM]] instance.
     * @ja 管轄している末尾の要素を [[DOM]] インスタンスにして取得
     */
    last(): DOM<TElement>;
    /**
     * @en Create a new [[DOM]] instance with elements added to the set from selector.
     * @ja 指定された `selector` で取得した `Element` を追加した新規 [[DOM]] インスタンスを返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     */
    add<T extends SelectorBase>(selector: DOMSelector<T>, context?: QueryContext): DOM<TElement>;
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
    is<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): boolean;
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
    filter<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): DOM<TElement>;
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
    not<T extends SelectorBase>(selector: DOMSelector<T> | DOMIterateCallback<TElement>): DOM<TElement>;
    /**
     * @en Get the descendants of each element in the current set of matched elements, filtered by a selector.
     * @ja 配下の要素に対して指定したセレクタに一致する要素を検索
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    find<T extends SelectorBase = SelectorBase>(selector: DOMSelector<T>): DOMResult<T>;
    /**
     * @en Reduce the set of matched elements to those that have a descendant that matches the selector.
     * @ja 配下の要素に対して指定したセレクタに一致した子要素持つ要素を返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    has<T extends SelectorBase = SelectorBase>(selector: DOMSelector<T>): DOMResult<T>;
    /**
     * @en Pass each element in the current matched set through a function, producing a new [[DOM]] instance containing the return values.
     * @ja コールバックで変更された要素を用いて新たに [[DOM]] インスタンスを構築
     *
     * @param callback
     *  - `en` modification function object that will be invoked for each element in the current set.
     *  - `ja` 各要素に対して呼び出される変更関数
     */
    map<T extends ElementBase>(callback: DOMModificationCallback<TElement, T>): DOM<T>;
    /**
     * @en Iterate over a [[DOM]] instance, executing a function for each matched element.
     * @ja 配下の要素に対してコールバック関数を実行
     *
     * @param callback
     *  - `en` callback function object that will be invoked for each element in the current set.
     *  - `ja` 各要素に対して呼び出されるコールバック関数
     */
    each(callback: DOMIterateCallback<TElement>): this;
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
    slice(begin?: number, end?: number): DOM<TElement>;
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
    eq(index: number): DOM<TElement>;
    /**
     * @en For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
     * @ja 開始要素から最も近い親要素を選択. セレクター指定した場合, マッチする最も近い親要素を返却
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]], test function.
     *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
     */
    closest<T extends SelectorBase = SelectorBase>(selector: DOMSelector<T>): DOMResult<T>;
    /**
     * @en Get the children of each element in the set of matched elements, optionally filtered by a selector.
     * @ja 各要素の子要素を取得. セレクタが指定された場合はフィルタリングされた結果を返却
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    children<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
    /**
     * @en Get the first parent of each element in the current set of matched elements.
     * @ja 管轄している各要素の最初の親要素を返却
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     * @returns [[DOM]] instance
     */
    parent<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
    /**
     * @en Get the ancestors of each element in the current set of matched elements.
     * @ja 管轄している各要素の祖先の親要素を返却
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     * @returns [[DOM]] instance
     */
    parents<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
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
    parentsUntil<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase, V extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>, filter?: DOMSelector<V>): DOM<T>;
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
    next<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
    /**
     * @en Get all following siblings of each element in the set of matched elements, optionally filtered by a selector.
     * @ja マッチした要素集合内の各要素の次以降の全ての兄弟要素を取得. セレクタを指定することでフィルタリングすることが可能.
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    nextAll<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
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
    nextUntil<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase, V extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>, filter?: DOMSelector<V>): DOM<T>;
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
    prev<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
    /**
     * @en Get all preceding siblings of each element in the set of matched elements, optionally filtered by a selector.
     * @ja マッチした要素集合内の各要素の前以降の全ての兄弟要素を取得. セレクタを指定することでフィルタリングすることが可能.
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    prevAll<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
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
    prevUntil<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase, V extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>, filter?: DOMSelector<V>): DOM<T>;
    /**
     * @en Get the siblings of each element in the set of matched elements, optionally filtered by a selector
     * @ja マッチした各要素の兄弟要素を取得
     *
     * @param selector
     *  - `en` filtered by a selector.
     *  - `ja` フィルタ用セレクタ
     */
    siblings<T extends Node = HTMLElement, U extends SelectorBase = SelectorBase>(selector?: DOMSelector<U>): DOM<T>;
    /**
     * @en Get the children of each element in the set of matched elements, including text and comment nodes.
     * @ja テキストやHTMLコメントを含む子要素を取得
     */
    contents<T extends Node = HTMLElement>(): DOM<T>;
    /**
     * @en Get the closest ancestor element that is positioned.
     * @ja 要素の先祖要素で, スタイルでポジション指定(positiionがrelative, absolute, fixedのいずれか)されているものを取得
     */
    offsetParent<T extends Node = HTMLElement>(): DOM<T>;
}
