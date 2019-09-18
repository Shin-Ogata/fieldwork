import { ElementBase, SelectorBase, DOMSelector, DOM } from './static';
import { DOMIterable } from './base';
/**
 * @en Mixin base class which concentrated the manipulation methods.
 * @ja マニピュレーションメソッドを集約した Mixin Base クラス
 */
export declare class DOMManipulation<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
    /**
     * @en Get the HTML contents of the first element in the set of matched elements.
     * @ja 先頭要素の HTML を取得
     */
    html(): string;
    /**
     * @en Set the HTML contents of each element in the set of matched elements.
     * @ja 配下の要素に指定した HTML を設定
     *
     * @param htmlString
     *  - `en` A string of HTML to set as the content of each matched element.
     *  - `ja` 要素内に挿入する HTML 文字列を指定
     */
    html(htmlString: string): this;
    /**
     * @en Get the text contents of the first element in the set of matched elements. <br>
     *     jQuery returns the combined text of each element, but this method makes only first element's text.
     * @ja 先頭要素のテキストを取得 <br>
     *     jQuery は各要素の連結テキストを返却するが本メソッドは先頭要素のみを対象とする
     */
    text(): string;
    /**
     * @en Set the content of each element in the set of matched elements to the specified text.
     * @ja 配下の要素に指定したテキストを設定
     *
     * @param text
     *  - `en` The text to set as the content of each matched element.
     *  - `ja` 要素内に挿入するテキストを指定
     */
    text(value: string | number | boolean): this;
    /**
     * @en Insert content, specified by the parameter, to the end of each element in the set of matched elements.
     * @ja 配下の要素に引数で指定したコンテンツを追加
     *
     * @param contents
     *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
     *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
     */
    append<T extends Element>(...contents: (Node | string | DOM<T> | NodeListOf<T>)[]): this;
    /**
     * @en Insert every element in the set of matched elements to the end of the target.
     * @ja 配下要素を他の要素に追加
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    appendTo<T extends SelectorBase>(selector: DOMSelector<T>): this;
    /**
     * @en Insert content, specified by the parameter, to the beginning of each element in the set of matched elements.
     * @ja 配下の要素の先頭に引数で指定したコンテンツを挿入
     *
     * @param contents
     *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
     *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
     */
    prepend<T extends Element>(...contents: (Node | string | DOM<T> | NodeListOf<T>)[]): this;
    /**
     * @en Insert every element in the set of matched elements to the beginning of the target.
     * @ja 配下要素を他の要素の先頭に挿入
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    prependTo<T extends SelectorBase>(selector: DOMSelector<T>): this;
    /**
     * @en Insert content, specified by the parameter, before each element in the set of matched elements.
     * @ja 配下の要素の前に指定した HTML や要素を挿入
     *
     * @param contents
     *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
     *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
     */
    before<T extends Element>(...contents: (Node | string | DOM<T> | NodeListOf<T>)[]): this;
    /**
     * @en Insert every element in the set of matched elements before the target.
     * @ja 配下の要素を指定した別要素の前に挿入
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    insertBefore<T extends SelectorBase>(selector: DOMSelector<T>): this;
    /**
     * @en Insert content, specified by the parameter, after each element in the set of matched elements.
     * @ja 配下の要素の後ろに指定した HTML や要素を挿入
     *
     * @param contents
     *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
     *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
     */
    after<T extends Element>(...contents: (Node | string | DOM<T> | NodeListOf<T>)[]): this;
    /**
     * @en Insert every element in the set of matched elements after the target.
     * @ja 配下の要素を指定した別要素の後ろに挿入
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    insertAfter<T extends SelectorBase>(selector: DOMSelector<T>): this;
    /**
     * @en Remove all child nodes of the set of matched elements from the DOM.
     * @ja 配下の要素内の子要素(テキストも対象)をすべて削除
     */
    empty(): this;
    /**
     * @en Remove the set of matched elements from the DOM. This method keeps event listener information.
     * @ja 要素を DOM から削除. 削除後もイベントリスナは有効
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    detach<T extends SelectorBase>(selector?: DOMSelector<T>): this;
    /**
     * @en Remove the set of matched elements from the DOM.
     * @ja 要素を DOM から削除
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    remove<T extends SelectorBase>(selector?: DOMSelector<T>): this;
}
