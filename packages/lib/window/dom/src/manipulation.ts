import { isString, setMixClassAttribute } from '@cdp/core-utils';
import {
    ElementBase,
    SelectorBase,
    DOMSelector,
    DOM,
    dom as $,
} from './static';
import {
    DOMIterable,
    isNode,
    isNodeElement,
} from './base';

/** @internal check HTML string */
function isHTMLString(src: string): boolean {
    return  ('<' === src.slice(0, 1)) && ('>' === src.slice(-1));
}

/** @internal helper for `append()` */
function toNodeSet<T extends Element>(...contents: (Node | string | DOM<T> | NodeListOf<T>)[]): Set<Node | string> {
    const nodes = new Set<Node | string>();
    for (const content of contents) {
        if ((isString(content) && !isHTMLString(content)) || isNode(content)) {
            nodes.add(content);
        } else {
            const $dom = $(content as DOM<Element>);
            for (const node of $dom) {
                nodes.add(node);
            }
        }
    }
    return nodes;
}

/** @internal helper for `detach()` and `remove()` */
function removeElement<T extends SelectorBase, U extends ElementBase>(
    selector: DOMSelector<T> | undefined,
    dom: DOMIterable<U>,
    keepListener: boolean
): void {
    const $dom: DOM<U> = null != selector
        ? (dom as DOM<U>).filter(selector)
        : dom as DOM<U>;

    if (!keepListener) {
        $dom.off();
    }

    for (const el of $dom) {
        if (isNodeElement(el)) {
            el.remove();
        }
    }
}

//__________________________________________________________________________________________________//

/**
 * @en Mixin base class which concentrated the manipulation methods.
 * @ja マニピュレーションメソッドを集約した Mixin Base クラス
 */
export class DOMManipulation<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Insertion, Inside

    /**
     * @en Get the HTML contents of the first element in the set of matched elements.
     * @ja 先頭要素の HTML を取得
     */
    public html(): string;

    /**
     * @en Set the HTML contents of each element in the set of matched elements.
     * @ja 配下の要素に指定した HTML を設定
     *
     * @param htmlString
     *  - `en` A string of HTML to set as the content of each matched element.
     *  - `ja` 要素内に挿入する HTML 文字列を指定
     */
    public html(htmlString: string): this;

    public html(htmlString?: string): string | this {
        if (undefined === htmlString) {
            // getter
            const el = this[0];
            return isNodeElement(el) ? el.innerHTML : '';
        } else if (isString(htmlString)) {
            // setter
            for (const el of this) {
                if (isNodeElement(el)) {
                    el.innerHTML = htmlString;
                }
            }
            return this;
        } else {
            // invalid arg
            console.warn(`invalid arg. htmlString type:${typeof htmlString}`);
            return this;
        }
    }

    /**
     * @en Get the text contents of the first element in the set of matched elements. <br>
     *     jQuery returns the combined text of each element, but this method makes only first element's text.
     * @ja 先頭要素のテキストを取得 <br>
     *     jQuery は各要素の連結テキストを返却するが本メソッドは先頭要素のみを対象とする
     */
    public text(): string;

    /**
     * @en Set the content of each element in the set of matched elements to the specified text.
     * @ja 配下の要素に指定したテキストを設定
     *
     * @param text
     *  - `en` The text to set as the content of each matched element.
     *  - `ja` 要素内に挿入するテキストを指定
     */
    public text(value: string | number | boolean): this;

    public text(value?: string | number | boolean): string | this {
        if (undefined === value) {
            // getter
            const el = this[0];
            if (isNode(el)) {
                const text = el.textContent;
                return (null != text) ? text.trim() : '';
            } else {
                return '';
            }
        } else {
            // setter
            const text = isString(value) ? value : String(value);
            for (const el of this) {
                if (isNode(el)) {
                    el.textContent = text;
                }
            }
            return this;
        }
    }

    /**
     * @en Insert content, specified by the parameter, to the end of each element in the set of matched elements.
     * @ja 配下の要素に引数で指定したコンテンツを追加
     *
     * @param contents
     *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
     *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
     */
    public append<T extends Element>(...contents: (Node | string | DOM<T> | NodeListOf<T>)[]): this {
        const nodes = toNodeSet(...contents);
        for (const el of this) {
            if (isNodeElement(el)) {
                el.append(...nodes);
            }
        }
        return this;
    }

    /**
     * @en Insert every element in the set of matched elements to the end of the target.
     * @ja 配下要素を他の要素に追加
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    public appendTo<T extends SelectorBase>(selector: DOMSelector<T>): this {
        ($(selector) as DOM).append(this as DOMIterable<Node> as DOM<Element>);
        return this;
    }

    /**
     * @en Insert content, specified by the parameter, to the beginning of each element in the set of matched elements.
     * @ja 配下の要素の先頭に引数で指定したコンテンツを挿入
     *
     * @param contents
     *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
     *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
     */
    public prepend<T extends Element>(...contents: (Node | string | DOM<T> | NodeListOf<T>)[]): this {
        const nodes = toNodeSet(...contents);
        for (const el of this) {
            if (isNodeElement(el)) {
                el.prepend(...nodes);
            }
        }
        return this;
    }

    /**
     * @en Insert every element in the set of matched elements to the beginning of the target.
     * @ja 配下要素を他の要素の先頭に挿入
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    public prependTo<T extends SelectorBase>(selector: DOMSelector<T>): this {
        ($(selector) as DOM).prepend(this as DOMIterable<Node> as DOM<Element>);
        return this;
    }

///////////////////////////////////////////////////////////////////////
// public: Insertion, Outside

///////////////////////////////////////////////////////////////////////
// public: Insertion, Around

///////////////////////////////////////////////////////////////////////
// public: Removal

    /**
     * @en Remove all child nodes of the set of matched elements from the DOM.
     * @ja 配下の要素内の子要素(テキストも対象)をすべて削除
     */
    public empty(): this {
        for (const el of this) {
            if (isNodeElement(el)) {
                while (el.firstChild) {
                    el.removeChild(el.firstChild);
                }
            }
        }
        return this;
    }

    /**
     * @en Remove the set of matched elements from the DOM. This method keeps event listener information.
     * @ja 要素を DOM から削除. 削除後もイベントリスナは有効
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    public detach<T extends SelectorBase>(selector?: DOMSelector<T>): this {
        removeElement(selector, this, true);
        return this;
    }

    /**
     * @en Remove the set of matched elements from the DOM.
     * @ja 要素を DOM から削除
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
     */
    public remove<T extends SelectorBase>(selector?: DOMSelector<T>): this {
        removeElement(selector, this, false);
        return this;
    }

///////////////////////////////////////////////////////////////////////
// public: Replacement
}

setMixClassAttribute(DOMManipulation, 'protoExtendsOnly');

/*
[dom7]
// DOM Insertion, Outside
.after()
.before()
.insertAfter()
.insertBefore()

[jquery]
// DOM Insertion, Around
.unwrap()
.wrap()
.wrapAll()
.wrapInner()
// DOM Replacement
.replaceAll()
.replaceWith()
 */
