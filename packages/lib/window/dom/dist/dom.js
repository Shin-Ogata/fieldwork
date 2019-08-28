/*!
 * @cdp/dom 0.9.0
 *   dom utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils));
}(this, function (exports, coreUtils) { 'use strict';

    /*
     * SSR (Server Side Rendering) 環境においても
     * `window` オブジェクトと `document` オブジェクトの存在を保証する
     */
    const win = coreUtils.safe(globalThis.window);
    const doc = coreUtils.safe(globalThis.document);

    /**
     * @en Create Element array from seed arg.
     * @ja 指定された Seed から Element 配列を作成
     *
     * @param seed
     *  - `en` Object(s) or the selector string which becomes origin of Element array.
     *  - `ja` Element 配列のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     * @returns Element[] based Node or Window object.
     */
    function elementify(seed, context = doc) {
        if (!seed) {
            return [];
        }
        const elements = [];
        try {
            if ('string' === typeof seed) {
                const html = seed.trim();
                if (html.includes('<') && html.includes('>')) {
                    // markup
                    const template = doc.createElement('template');
                    template.innerHTML = html;
                    elements.push(...template.content.children);
                }
                else {
                    const selector = seed.trim();
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    if (coreUtils.isFunction(context.getElementById) && ('#' === selector[0]) && !/[ .<>:~]/.exec(selector)) {
                        // pure ID selector
                        const el = context.getElementById(selector.substring(1));
                        el && elements.push(el);
                    }
                    else if ('body' === selector) {
                        // body
                        elements.push(doc.body);
                    }
                    else {
                        // other selectors
                        elements.push(...context.querySelectorAll(selector));
                    }
                }
            }
            else if (seed.nodeType || window === seed) {
                // Node/element, Window
                elements.push(seed);
            }
            else if (0 < seed.length && (seed[0].nodeType || window === seed[0])) {
                // array of elements or collection of DOM
                elements.push(...seed);
            }
        }
        catch (e) {
            console.warn(`elementify(${coreUtils.className(seed)}, ${coreUtils.className(context)}), failed. [error:${e}]`);
        }
        return elements;
    }

    const utils = /*#__PURE__*/Object.freeze({
        elementify: elementify
    });

    let _factory;
    /**
     * @en Create [[DOMClass]] instance from `selector` arg.
     * @ja 指定された `selector` [[DOMClass]] インスタンスを作成
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     * @returns [[DOMClass]] instance.
     */
    function dom(selector, context) {
        return _factory(selector, context);
    }
    dom.utils = utils;
    /** @internal 循環参照回避のための遅延コンストラクションメソッド */
    function setup(fn, factory) {
        _factory = factory;
        dom.fn = fn;
    }

    /** @internal */
    const _createIterableIterator = Symbol('createIterableIterator');
    /**
     * @en Base abstraction class of [[DOMClass]]. This class provides iterator methods.
     * @ja [[DOMClass]] の基底抽象クラス. iterator を提供.
     */
    class DOMBase {
        /**
         * constructor
         *
         * @param elements
         *  - `en` operation targets `Element` array.
         *  - `ja` 操作対象の `Element` 配列
         */
        constructor(elements) {
            const self = this;
            for (const [index, elem] of elements.entries()) {
                self[index] = elem;
            }
            this.length = elements.length;
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: Iterable<T>
        /**
         * @en Iterator of [[ElementBase]] values in the array.
         * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
         */
        [Symbol.iterator]() {
            const iterator = {
                base: this,
                pointer: 0,
                next() {
                    if (this.pointer < this.base.length) {
                        return {
                            done: false,
                            value: this.base[this.pointer++],
                        };
                    }
                    else {
                        return {
                            done: true,
                            value: undefined,
                        };
                    }
                },
            };
            return iterator;
        }
        /**
         * @en Returns an iterable of key(index), value([[ElementBase]]) pairs for every entry in the array.
         * @ja key(index), value([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
         */
        entries() {
            return this[_createIterableIterator]((key, value) => [key, value]);
        }
        /**
         * @en Returns an iterable of keys(index) in the array.
         * @ja key(index) 配列にアクセス可能なイテレータオブジェクトを返却
         */
        keys() {
            return this[_createIterableIterator]((key) => key);
        }
        /**
         * @en Returns an iterable of values([[ElementBase]]) in the array.
         * @ja values([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
         */
        values() {
            return this[_createIterableIterator]((key, value) => value);
        }
        /** @internal common iterator create function */
        [_createIterableIterator](valueGenerator) {
            const context = {
                base: this,
                pointer: 0,
            };
            const iterator = {
                next() {
                    const current = context.pointer;
                    if (current < context.base.length) {
                        context.pointer++;
                        return {
                            done: false,
                            value: valueGenerator(current, context.base[current]),
                        };
                    }
                    else {
                        return {
                            done: true,
                            value: undefined,
                        };
                    }
                },
                [Symbol.iterator]() {
                    return this;
                },
            };
            return iterator;
        }
    }
    /**
     * @en Check the selector type is Nil.
     * @ja Nil セレクタであるか判定
     *
     * @param selector
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isEmptySelector(selector) {
        return !selector;
    }
    /**
     * @en Check the selector type is String.
     * @ja String セレクタであるか判定
     *
     * @param selector
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isStringSelector(selector) {
        return 'string' === typeof selector;
    }
    /**
     * @en Check the selector type is Node.
     * @ja Node セレクタであるか判定
     *
     * @param selector
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isNodeSelector(selector) {
        return null != selector.nodeType;
    }
    /**
     * @en Check the selector type is Document.
     * @ja Document セレクタであるか判定
     *
     * @param selector
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isDocumentSelector(selector) {
        return doc === selector;
    }
    /**
     * @en Check the selector type is Window.
     * @ja Window セレクタであるか判定
     *
     * @param selector
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isWindowSelector(selector) {
        return win === selector;
    }
    /**
     * @en Check the selector is able to iterate.
     * @ja 走査可能なセレクタであるか判定
     *
     * @param selector
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isIterableSelector(selector) {
        return null != selector.length;
    }

    /** @internal helper for `parent()` and `parents()` */
    function validParentNode(parentNode) {
        return null != parentNode && Node.DOCUMENT_NODE !== parentNode.nodeType && Node.DOCUMENT_FRAGMENT_NODE !== parentNode.nodeType;
    }
    /**
     * @en Mixin base class which concentrated the methods of DOM class.
     * @ja DOM のメソッドを集約した Mixin Base クラス
     */
    class DOMMethods {
        ///////////////////////////////////////////////////////////////////////
        // public:
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
        is(selector) {
            if (this.length <= 0 || isEmptySelector(selector)) {
                return false;
            }
            for (const [index, el] of this.entries()) {
                if (coreUtils.isFunction(selector)) {
                    if (selector(index, el)) {
                        return true;
                    }
                }
                else if (isStringSelector(selector)) {
                    if (el.matches && el.matches(selector)) {
                        return true;
                    }
                }
                else if (isWindowSelector(selector)) {
                    return win === el;
                }
                else if (isDocumentSelector(selector)) {
                    return doc === el;
                }
                else if (isNodeSelector(selector)) {
                    if (selector === el) {
                        return true;
                    }
                }
                else if (isIterableSelector(selector)) {
                    for (const elem of selector) {
                        if (elem === el) {
                            return true;
                        }
                    }
                }
                else {
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
        parent(selector) {
            const parents = new Set();
            for (const elem of this) {
                const parentNode = elem.parentNode;
                if (validParentNode(parentNode)) {
                    if (selector) {
                        if (dom(parentNode).is(selector)) {
                            parents.add(parentNode);
                        }
                    }
                    else {
                        parents.add(parentNode);
                    }
                }
            }
            return dom([...parents]);
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
        parents(selector) {
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
        parentsUntil(selector, filter) {
            let parents = [];
            for (const elem of this) {
                let parentNode = elem.parentNode;
                while (validParentNode(parentNode)) {
                    if (null != selector) {
                        if (dom(parentNode).is(selector)) {
                            break;
                        }
                    }
                    if (filter) {
                        if (dom(parentNode).is(filter)) {
                            parents.push(parentNode);
                        }
                    }
                    else {
                        parents.push(parentNode);
                    }
                    parentNode = parentNode.parentNode;
                }
            }
            // 複数要素が対象になるときは反転
            if (1 < this.length) {
                parents = [...new Set(parents.reverse())].reverse();
            }
            return dom(parents);
        }
    }

    /**
     * @en This class provides DOM operations like `jQuery` library.
     * @ja `jQuery` のようなDOM 操作を提供
     */
    class DOMClass extends coreUtils.mixins(DOMBase, DOMMethods) {
        /**
         * private constructor
         *
         * @param elements
         *  - `en` operation targets `Element` array.
         *  - `ja` 操作対象の `Element` 配列
         */
        constructor(elements) {
            super(elements);
            this.super(DOMMethods);
        }
        /**
         * @en Create [[DOM]] instance from `selector` arg.
         * @ja 指定された `selector` [[DOM]] インスタンスを作成
         *
         * @internal
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
         *  - `ja` [[DOMClass]] のもとになるオブジェクト(群)またはセレクタ文字列
         * @param context
         *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
         *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
         * @returns [[DOMClass]] instance.
         */
        static create(selector, context) {
            if (selector && !context) {
                if (selector instanceof DOMClass) {
                    return selector; // eslint-disable-line @typescript-eslint/no-explicit-any
                }
            }
            return new DOMClass(elementify(selector, context));
        }
    }

    // init for static
    setup(DOMClass.prototype, DOMClass.create);

    exports.default = dom;
    exports.dom = dom;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJtZXRob2RzLnRzIiwiY2xhc3MudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoJcbiAqIGB3aW5kb3dgIOOCquODluOCuOOCp+OCr+ODiOOBqCBgZG9jdW1lbnRgIOOCquODluOCuOOCp+OCr+ODiOOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5jb25zdCB3aW4gPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbmNvbnN0IGRvYyA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG5cbmV4cG9ydCB7XG4gICAgd2luIGFzIHdpbmRvdyxcbiAgICBkb2MgYXMgZG9jdW1lbnQsXG59O1xuIiwiaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgaXNGdW5jdGlvbixcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuZXhwb3J0IHR5cGUgRWxlbWVudEJhc2UgPSBOb2RlIHwgV2luZG93O1xuZXhwb3J0IHR5cGUgRWxlbWVudFJlc3VsdDxUPiA9IFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFQgOiBFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE5pbDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBFbGVtZW50PiA9IFQgfCAoVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVFtdIDogbmV2ZXIpIHwgTm9kZUxpc3RPZjxUIGV4dGVuZHMgTm9kZSA/IFQgOiBuZXZlcj47XG5leHBvcnQgdHlwZSBRdWVyeUNvbnRleHQgPSBQYXJlbnROb2RlICYgUGFydGlhbDxOb25FbGVtZW50UGFyZW50Tm9kZT47XG5cbi8qKlxuICogQGVuIENyZWF0ZSBFbGVtZW50IGFycmF5IGZyb20gc2VlZCBhcmcuXG4gKiBAamEg5oyH5a6a44GV44KM44GfIFNlZWQg44GL44KJIEVsZW1lbnQg6YWN5YiX44KS5L2c5oiQXG4gKlxuICogQHBhcmFtIHNlZWRcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRWxlbWVudCBhcnJheS5cbiAqICAtIGBqYWAgRWxlbWVudCDphY3liJfjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIGNvbnRleHRcbiAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gKiBAcmV0dXJucyBFbGVtZW50W10gYmFzZWQgTm9kZSBvciBXaW5kb3cgb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZWxlbWVudGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ6IFF1ZXJ5Q29udGV4dCA9IGRvY3VtZW50KTogRWxlbWVudFJlc3VsdDxUPltdIHtcbiAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcblxuICAgIHRyeSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHNlZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBzZWVkLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChodG1sLmluY2x1ZGVzKCc8JykgJiYgaHRtbC5pbmNsdWRlcygnPicpKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFya3VwXG4gICAgICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi50ZW1wbGF0ZS5jb250ZW50LmNoaWxkcmVuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBzZWVkLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dC5nZXRFbGVtZW50QnlJZCkgJiYgKCcjJyA9PT0gc2VsZWN0b3JbMF0pICYmICEvWyAuPD46fl0vLmV4ZWMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHB1cmUgSUQgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWwgPSBjb250ZXh0LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9yLnN1YnN0cmluZygxKSk7XG4gICAgICAgICAgICAgICAgICAgIGVsICYmIGVsZW1lbnRzLnB1c2goZWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2JvZHknID09PSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBib2R5XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goZG9jdW1lbnQuYm9keSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXIgc2VsZWN0b3JzXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uY29udGV4dC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKChzZWVkIGFzIE5vZGUpLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZCkge1xuICAgICAgICAgICAgLy8gTm9kZS9lbGVtZW50LCBXaW5kb3dcbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goc2VlZCBhcyBOb2RlIGFzIEVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKDAgPCAoc2VlZCBhcyBUW10pLmxlbmd0aCAmJiAoc2VlZFswXS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWRbMF0pKSB7XG4gICAgICAgICAgICAvLyBhcnJheSBvZiBlbGVtZW50cyBvciBjb2xsZWN0aW9uIG9mIERPTVxuICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi4oc2VlZCBhcyBOb2RlW10gYXMgRWxlbWVudFtdKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgZWxlbWVudGlmeSgke2NsYXNzTmFtZShzZWVkKX0sICR7Y2xhc3NOYW1lKGNvbnRleHQpfSksIGZhaWxlZC4gW2Vycm9yOiR7ZX1dYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnRzIGFzIEVsZW1lbnRSZXN1bHQ8VD5bXTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIERPTUNsYXNzLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG59IGZyb20gJy4vY2xhc3MnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBkb20ge1xuICAgIGxldCBmbjogRE9NQ2xhc3M8YW55Pjtcbn1cblxudHlwZSBET01GYWN0b3J5ID0gPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQpID0+IERPTVJlc3VsdDxUPjtcblxubGV0IF9mYWN0b3J5ITogRE9NRmFjdG9yeTtcblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbRE9NQ2xhc3NdXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NQ2xhc3NdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01DbGFzc11dLlxuICogIC0gYGphYCBbW0RPTUNsYXNzXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgW1tET01DbGFzc11dIGluc3RhbmNlLlxuICovXG5mdW5jdGlvbiBkb208VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTVJlc3VsdDxUPiB7XG4gICAgcmV0dXJuIF9mYWN0b3J5KHNlbGVjdG9yLCBjb250ZXh0KTtcbn1cblxuZG9tLnV0aWxzID0gdXRpbHM7XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzPGFueT4sIGZhY3Rvcnk6IERPTUZhY3RvcnkpOiB2b2lkIHtcbiAgICBfZmFjdG9yeSA9IGZhY3Rvcnk7XG4gICAgZG9tLmZuID0gZm47XG59XG5cbmV4cG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSxcbn07XG4iLCJpbXBvcnQgeyBOaWwsIFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdywgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3InKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRWxlbWVudEFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBFbGVtZW50PiA9IFdyaXRhYmxlPERPTUJhc2U8VD4+O1xuXG4vKipcbiAqIEBlbiBCYXNlIGFic3RyYWN0aW9uIGNsYXNzIG9mIFtbRE9NQ2xhc3NdXS4gVGhpcyBjbGFzcyBwcm92aWRlcyBpdGVyYXRvciBtZXRob2RzLlxuICogQGphIFtbRE9NQ2xhc3NdXSDjga7ln7rlupXmir3osaHjgq/jg6njgrkuIGl0ZXJhdG9yIOOCkuaPkOS+my5cbiAqL1xuZXhwb3J0IGNsYXNzIERPTUJhc2U8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIEFycmF5TGlrZTxUPiwgSXRlcmFibGU8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBudW1iZXIgb2YgYEVsZW1lbnRgXG4gICAgICogQGphIOWGheWMheOBmeOCiyBgRWxlbWVudGAg5pWwXG4gICAgICovXG4gICAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYEVsZW1lbnRgIGFjY2Vzc29yXG4gICAgICogQGphIGBFbGVtZW50YCDjgbjjga7mt7vjgYjlrZfjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVDtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBUW10pIHtcbiAgICAgICAgY29uc3Qgc2VsZjogRWxlbWVudEFjY2VzczxUPiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaW5kZXgpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IoY3VycmVudCwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEVsZW1lbnQ+IGV4dGVuZHMgUGFydGlhbDxET01CYXNlPFQ+PiB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE5pbC5cbiAqIEBqYSBOaWwg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOaWw+IHtcbiAgICByZXR1cm4gIXNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIHN0cmluZz4ge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOb2RlLlxuICogQGphIE5vZGUg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGU+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgTm9kZSkubm9kZVR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIEVsZW1lbnQuXG4gKiBAamEgRWxlbWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbGVtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRWxlbWVudD4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIEVsZW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIERvY3VtZW50LlxuICogQGphIERvY3VtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RvY3VtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IHNlbGVjdG9yIGFzIE5vZGUgYXMgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFdpbmRvdy5cbiAqIEBqYSBXaW5kb3cg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgV2luZG93PiB7XG4gICAgcmV0dXJuIHdpbmRvdyA9PT0gc2VsZWN0b3IgYXMgV2luZG93O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgaXMgYWJsZSB0byBpdGVyYXRlLlxuICogQGphIOi1sOafu+WPr+iDveOBquOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTm9kZUxpc3RPZjxOb2RlPj4ge1xuICAgIHJldHVybiBudWxsICE9IChzZWxlY3RvciBhcyBUW10pLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgW1tET01dXS5cbiAqIEBqYSBbW0RPTV1dIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERPTT4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2U7XG59XG4iLCJpbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdywgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzRW1wdHlTZWxlY3RvcixcbiAgICBpc1N0cmluZ1NlbGVjdG9yLFxuICAgIGlzRG9jdW1lbnRTZWxlY3RvcixcbiAgICBpc1dpbmRvd1NlbGVjdG9yLFxuICAgIGlzTm9kZVNlbGVjdG9yLFxuICAgIGlzSXRlcmFibGVTZWxlY3Rvcixcbn0gZnJvbSAnLi9iYXNlJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAgYW5kIGBwYXJlbnRzKClgICovXG5mdW5jdGlvbiB2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZTogTm9kZSB8IG51bGwpOiBwYXJlbnROb2RlIGlzIE5vZGUge1xuICAgIHJldHVybiBudWxsICE9IHBhcmVudE5vZGUgJiYgTm9kZS5ET0NVTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlICYmIE5vZGUuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSAhPT0gcGFyZW50Tm9kZS5ub2RlVHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIG1ldGhvZHMgb2YgRE9NIGNsYXNzLlxuICogQGphIERPTSDjga7jg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTU1ldGhvZHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEVsZW1lbnQ+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzpcblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgY3VycmVudCBtYXRjaGVkIHNldCBvZiBlbGVtZW50cyBhZ2FpbnN0IGEgc2VsZWN0b3IsIGVsZW1lbnQsIG9yIFtbRE9NXV0gb2JqZWN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yKGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZ1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGlmICgoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2luZG93ID09PSBlbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkb2N1bWVudCA9PT0gZWwgYXMgTm9kZSBhcyBEb2N1bWVudDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSBlbCBhcyBOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbSA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBwYXJlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7mnIDliJ3jga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzdHJpbmcgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjmloflrZfliJfjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEVsZW1lbnQ+KHNlbGVjdG9yPzogc3RyaW5nKTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3QgcGFyZW50cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSAoZWxlbSBhcyBOb2RlKS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgaWYgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudHMuYWRkKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5hZGQocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5wYXJlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50czxUIGV4dGVuZHMgTm9kZSA9IEVsZW1lbnQ+KHNlbGVjdG9yPzogc3RyaW5nKTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50c1VudGlsKHVuZGVmaW5lZCwgc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIDxicj5cbiAgICAgKiAgICAgdXAgdG8gYnV0IG5vdCBpbmNsdWRpbmcgdGhlIGVsZW1lbnQgbWF0Y2hlZCBieSB0aGUgc2VsZWN0b3IsIERPTSBub2RlLCBvciBbW0RPTV1dIG9iamVjdFxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzVW50aWw8VCBleHRlbmRzIE5vZGUgPSBFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBzdHJpbmcpOiBET008VD4ge1xuICAgICAgICBsZXQgcGFyZW50czogTm9kZVtdID0gW107XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnROb2RlID0gKGVsZW0gYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHdoaWxlICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KSH5pWw6KaB57Sg44GM5a++6LGh44Gr44Gq44KL44Go44GN44Gv5Y+N6LuiXG4gICAgICAgIGlmICgxIDwgdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcmVudHMgPSBbLi4ubmV3IFNldChwYXJlbnRzLnJldmVyc2UoKSldLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkKHBhcmVudHMpIGFzIERPTTxUPjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtaXhpbnMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRWxlbWVudGlmeVNlZWQsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRE9NQmFzZSwgRE9NSXRlcmFibGUgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgRE9NTWV0aG9kcyB9IGZyb20gJy4vbWV0aG9kcyc7XG5cbi8qKlxuICogQGVuIFRoaXMgaW50ZXJmYWNlIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6b44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEVsZW1lbnQ+IGV4dGVuZHMgRE9NQ2xhc3M8VD4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG5leHBvcnQgdHlwZSBET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gRWxlbWVudD4gPSBFbGVtZW50aWZ5U2VlZDxUPiB8IERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgRE9NUmVzdWx0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+ID0gVCBleHRlbmRzIERPTTxFbGVtZW50QmFzZT4gPyBUIDogKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IERPTTxUPiA6IERPTTxFbGVtZW50Pik7XG5leHBvcnQgdHlwZSBET01JdGVyYXRlQ2FsbGJhY2s8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBib29sZWFuIHwgdm9pZDtcblxuLyoqXG4gKiBAZW4gVGhpcyBjbGFzcyBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m1xuICovXG5leHBvcnQgY2xhc3MgRE9NQ2xhc3M8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEVsZW1lbnQ+IGV4dGVuZHMgbWl4aW5zKERPTUJhc2UsIERPTU1ldGhvZHMpIGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcbiAgICAvKipcbiAgICAgKiBwcml2YXRlIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiB0YXJnZXRzIGBFbGVtZW50YCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOaTjeS9nOWvvuixoeOBriBgRWxlbWVudGAg6YWN5YiXXG4gICAgICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihlbGVtZW50czogVEVsZW1lbnRbXSkge1xuICAgICAgICBzdXBlcihlbGVtZW50cyk7XG4gICAgICAgIHRoaXMuc3VwZXIoRE9NTWV0aG9kcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW0RPTV1dIGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01DbGFzc11dLlxuICAgICAqICAtIGBqYWAgW1tET01DbGFzc11dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKiBAcmV0dXJucyBbW0RPTUNsYXNzXV0gaW5zdGFuY2UuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChzZWxlY3RvciAmJiAhY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgYXMgYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IERPTUNsYXNzKChlbGVtZW50aWZ5KHNlbGVjdG9yIGFzIEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0KSBhcyBFbGVtZW50W10pKSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuICAgIGtleXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPG51bWJlcj47XG4gICAgdmFsdWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxURWxlbWVudD47XG59XG4iLCJpbXBvcnQgeyBzZXR1cCB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUNsYXNzIH0gZnJvbSAnLi9jbGFzcyc7XG5cbi8vIGluaXQgZm9yIHN0YXRpY1xuc2V0dXAoRE9NQ2xhc3MucHJvdG90eXBlLCBET01DbGFzcy5jcmVhdGUpO1xuXG5leHBvcnQgKiBmcm9tICcuL2V4cG9ydHMnO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyBkZWZhdWx0IH0gZnJvbSAnLi9leHBvcnRzJztcbiJdLCJuYW1lcyI6WyJzYWZlIiwiZG9jdW1lbnQiLCJpc0Z1bmN0aW9uIiwiY2xhc3NOYW1lIiwid2luZG93IiwiJCIsIm1peGlucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFFQTs7OztJ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
