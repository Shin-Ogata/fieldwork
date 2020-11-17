/*!
 * @cdp/dom 0.9.5
 *   dom utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
}(this, (function (exports, coreUtils) { 'use strict';

    /*
     * SSR (Server Side Rendering) 環境においても
     * `window` オブジェクトと `document` オブジェクト等の存在を保証する
     */
    /** @internal */ const win = coreUtils.safe(globalThis.window);
    /** @internal */ const doc = coreUtils.safe(globalThis.document);
    /** @internal */ const evt = coreUtils.safe(globalThis.CustomEvent);
    /** @internal */ const requestAnimationFrame = win.requestAnimationFrame;

    /* eslint-disable
        @typescript-eslint/no-explicit-any
     */
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
    function elementify(seed, context) {
        if (!seed) {
            return [];
        }
        context = context || doc;
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
    /**
     * @en Ensure positive number, if not returned `undefined`.
     * @en 正値の保証. 異なる場合 `undefined` を返却
     */
    function ensurePositiveNumber(value) {
        return (coreUtils.isNumber(value) && 0 <= value) ? value : undefined;
    }
    /**
     * @en For easing `swing` timing-function.
     * @ja easing `swing` 用タイミング関数
     *
     * @reference
     *  - https://stackoverflow.com/questions/9245030/looking-for-a-swing-like-easing-expressible-both-with-jquery-and-css3
     *  - https://stackoverflow.com/questions/5207301/jquery-easing-functions-without-using-a-plugin
     *
     * @param progress [0 - 1]
     */
    function swing(progress) {
        return 0.5 - (Math.cos(progress * Math.PI) / 2);
    }
    /** @internal */
    const _scriptsAttrs = [
        'type',
        'src',
        'nonce',
        'noModule',
    ];
    /**
     * @en The `eval` function by which script `nonce` attribute considered under the CSP condition.
     * @ja CSP 環境においてスクリプト `nonce` 属性を考慮した `eval` 実行関数
     */
    function evaluate(code, options, context) {
        const doc$1 = context || doc;
        const script = doc$1.createElement('script');
        script.text = `CDP_DOM_EVAL_RETURN_VALUE_BRIDGE = (() => { return ${code}; })();`;
        if (options) {
            for (const attr of _scriptsAttrs) {
                const val = options[attr] || (options.getAttribute && options.getAttribute(attr));
                if (val) {
                    script.setAttribute(attr, val);
                }
            }
        }
        // execute
        try {
            coreUtils.getGlobalNamespace('CDP_DOM_EVAL_RETURN_VALUE_BRIDGE');
            doc$1.head.appendChild(script).parentNode.removeChild(script); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            const retval = globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
            return retval;
        }
        finally {
            delete globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
        }
    }

    /* eslint-disable
        @typescript-eslint/no-namespace
     */
    /** @internal */ let _factory;
    /**
     * @en Create [[DOM]] instance from `selector` arg.
     * @ja 指定された `selector` [[DOM]] インスタンスを作成
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     * @returns [[DOM]] instance.
     */
    function dom(selector, context) {
        return _factory(selector, context);
    }
    dom.utils = {
        elementify,
        evaluate,
    };
    /** @internal 循環参照回避のための遅延コンストラクションメソッド */
    function setup(fn, factory) {
        _factory = factory;
        dom.fn = fn;
    }

    /** @internal */ const _createIterableIterator = Symbol('create-iterable-iterator');
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
    //__________________________________________________________________________________________________//
    /**
     * @en Check target is `Node`.
     * @ja 対象が `Node` であるか判定
     *
     * @param el
     *  - `en` [[ElementBase]] instance
     *  - `ja` [[ElementBase]] インスタンス
     */
    function isNode(el) {
        return !!(el && el.nodeType);
    }
    /**
     * @en Check target is `Element`.
     * @ja 対象が `Element` であるか判定
     *
     * @param el
     *  - `en` [[ElementBase]] instance
     *  - `ja` [[ElementBase]] インスタンス
     */
    function isNodeElement(el) {
        return isNode(el) && (Node.ELEMENT_NODE === el.nodeType);
    }
    /**
     * @en Check target is `HTMLElement` or `SVGElement`.
     * @ja 対象が `HTMLElement` または `SVGElement` であるか判定
     *
     * @param el
     *  - `en` [[ElementBase]] instance
     *  - `ja` [[ElementBase]] インスタンス
     */
    function isNodeHTMLOrSVGElement(el) {
        return isNodeElement(el) && (null != el.dataset);
    }
    /**
     * @en Check target is `Element` or `Document`.
     * @ja 対象が `Element` または `Document` であるか判定
     *
     * @param el
     *  - `en` [[ElementBase]] instance
     *  - `ja` [[ElementBase]] インスタンス
     */
    function isNodeQueriable(el) {
        return !!(el && el.querySelector); // eslint-disable-line @typescript-eslint/unbound-method
    }
    /**
     * @en Check target is `Document`.
     * @ja 対象が `Document` であるか判定
     *
     * @param el
     *  - `en` [[ElementBase]] instance
     *  - `ja` [[ElementBase]] インスタンス
     */
    function isNodeDocument(el) {
        return isNode(el) && (Node.DOCUMENT_NODE === el.nodeType);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Check [[DOM]] target is `Element`.
     * @ja [[DOM]] が `Element` を対象にしているか判定
     *
     * @param dom
     *  - `en` [[DOMIterable]] instance
     *  - `ja` [[DOMIterable]] インスタンス
     */
    function isTypeElement(dom) {
        return isNodeElement(dom[0]);
    }
    /**
     * @en Check [[DOM]] target is `HTMLElement` or `SVGElement`.
     * @ja [[DOM]] が `HTMLElement` または `SVGElement` を対象にしているか判定
     *
     * @param dom
     *  - `en` [[DOMIterable]] instance
     *  - `ja` [[DOMIterable]] インスタンス
     */
    function isTypeHTMLOrSVGElement(dom) {
        return isNodeHTMLOrSVGElement(dom[0]);
    }
    /**
     * @en Check [[DOM]] target is `Document`.
     * @ja [[DOM]] が `Document` を対象にしているか判定
     *
     * @param dom
     *  - `en` [[DOMIterable]] instance
     *  - `ja` [[DOMIterable]] インスタンス
     */
    function isTypeDocument(dom) {
        return doc === dom[0];
    }
    /**
     * @en Check [[DOM]] target is `Window`.
     * @ja [[DOM]] が `Window` を対象にしているか判定
     *
     * @param dom
     *  - `en` [[DOMIterable]] instance
     *  - `ja` [[DOMIterable]] インスタンス
     */
    function isTypeWindow(dom) {
        return win === dom[0];
    }
    //__________________________________________________________________________________________________//
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
    //__________________________________________________________________________________________________//
    /**
     * @en Check node name is argument.
     * @ja Node 名が引数で与えた名前と一致するか判定
     */
    function nodeName(elem, name) {
        return !!(elem && elem.nodeName.toLowerCase() === name.toLowerCase());
    }
    /**
     * @en Get node offset parent. This function will work SVGElement, too.
     * @ja offset parent の取得. SVGElement にも適用可能
     */
    function getOffsetParent(node) {
        if (node.offsetParent) {
            return node.offsetParent;
        }
        else if (nodeName(node, 'svg')) {
            const $svg = dom(node);
            const cssProps = $svg.css(['display', 'position']);
            if ('none' === cssProps.display || 'fixed' === cssProps.position) {
                return null;
            }
            else {
                let parent = $svg[0].parentElement;
                while (parent) {
                    const { display, position } = dom(parent).css(['display', 'position']);
                    if ('none' === display) {
                        return null;
                    }
                    else if (!position || 'static' === position) {
                        parent = parent.parentElement;
                    }
                    else {
                        break;
                    }
                }
                return parent;
            }
        }
        else {
            return null;
        }
    }

    /* eslint-disable
        @typescript-eslint/no-explicit-any
     */
    /** @internal helper for `val()`*/
    function isMultiSelectElement(el) {
        return isNodeElement(el) && 'select' === el.nodeName.toLowerCase() && el.multiple;
    }
    /** @internal helper for `val()`*/
    function isInputElement(el) {
        return isNodeElement(el) && (null != el.value);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Mixin base class which concentrated the attributes methods.
     * @ja 属性操作メソッドを集約した Mixin Base クラス
     */
    class DOMAttributes {
        ///////////////////////////////////////////////////////////////////////
        // public: Classes
        /**
         * @en Add css class to elements.
         * @ja css class 要素に追加
         *
         * @param className
         *  - `en` class name or class name list (array).
         *  - `ja` クラス名またはクラス名の配列を指定
         */
        addClass(className) {
            if (!isTypeElement(this)) {
                return this;
            }
            const classes = coreUtils.isArray(className) ? className : [className];
            for (const el of this) {
                if (isNodeElement(el)) {
                    el.classList.add(...classes);
                }
            }
            return this;
        }
        /**
         * @en Remove css class to elements.
         * @ja css class 要素を削除
         *
         * @param className
         *  - `en` class name or class name list (array).
         *  - `ja` クラス名またはクラス名の配列を指定
         */
        removeClass(className) {
            if (!isTypeElement(this)) {
                return this;
            }
            const classes = coreUtils.isArray(className) ? className : [className];
            for (const el of this) {
                if (isNodeElement(el)) {
                    el.classList.remove(...classes);
                }
            }
            return this;
        }
        /**
         * @en Determine whether any of the matched elements are assigned the given class.
         * @ja 指定されたクラス名を少なくとも要素が持っているか判定
         *
         * @param className
         *  - `en` class name
         *  - `ja` クラス名
         */
        hasClass(className) {
            if (!isTypeElement(this)) {
                return false;
            }
            for (const el of this) {
                if (isNodeElement(el) && el.classList.contains(className)) {
                    return true;
                }
            }
            return false;
        }
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
        toggleClass(className, force) {
            if (!isTypeElement(this)) {
                return this;
            }
            const classes = coreUtils.isArray(className) ? className : [className];
            const operation = (() => {
                if (null == force) {
                    return (elem) => {
                        for (const name of classes) {
                            elem.classList.toggle(name);
                        }
                    };
                }
                else if (force) {
                    return (elem) => elem.classList.add(...classes);
                }
                else {
                    return (elem) => elem.classList.remove(...classes);
                }
            })();
            for (const el of this) {
                if (isNodeElement(el)) {
                    operation(el);
                }
            }
            return this;
        }
        prop(key, value) {
            if (null == value && coreUtils.isString(key)) {
                // get first element property
                const first = this[0];
                return first && first[key];
            }
            else {
                // set property
                for (const el of this) {
                    if (null != value) {
                        // single
                        el[key] = value;
                    }
                    else {
                        // multiple
                        for (const name of Object.keys(key)) {
                            if (name in el) {
                                el[name] = key[name];
                            }
                        }
                    }
                }
                return this;
            }
        }
        attr(key, value) {
            if (!isTypeElement(this)) {
                // non element
                return undefined === value ? undefined : this;
            }
            else if (undefined === value && coreUtils.isString(key)) {
                // get first element attribute
                const attr = this[0].getAttribute(key);
                return (null != attr) ? attr : undefined;
            }
            else if (null === value) {
                // remove attribute
                return this.removeAttr(key);
            }
            else {
                // set attribute
                for (const el of this) {
                    if (isNodeElement(el)) {
                        if (null != value) {
                            // single
                            el.setAttribute(key, String(value));
                        }
                        else {
                            // multiple
                            for (const name of Object.keys(key)) {
                                const val = key[name];
                                if (null === val) {
                                    el.removeAttribute(name);
                                }
                                else {
                                    el.setAttribute(name, String(val));
                                }
                            }
                        }
                    }
                }
                return this;
            }
        }
        /**
         * @en Remove specified attribute.
         * @ja 指定した属性を削除
         *
         * @param name
         *  - `en` attribute name or attribute name list (array).
         *  - `ja` 属性名または属性名の配列を指定
         */
        removeAttr(name) {
            if (!isTypeElement(this)) {
                return this;
            }
            const attrs = coreUtils.isArray(name) ? name : [name];
            for (const el of this) {
                if (isNodeElement(el)) {
                    for (const attr of attrs) {
                        el.removeAttribute(attr);
                    }
                }
            }
            return this;
        }
        val(value) {
            if (!isTypeElement(this)) {
                // non element
                return null == value ? undefined : this;
            }
            if (null == value) {
                // get first element value
                const el = this[0];
                if (isMultiSelectElement(el)) {
                    const values = [];
                    for (const option of el.selectedOptions) {
                        values.push(option.value);
                    }
                    return values;
                }
                else if ('value' in el) {
                    return el.value;
                }
                else {
                    // no support value
                    return undefined;
                }
            }
            else {
                // set value
                for (const el of this) {
                    if (coreUtils.isArray(value) && isMultiSelectElement(el)) {
                        for (const option of el.options) {
                            option.selected = value.includes(option.value);
                        }
                    }
                    else if (isInputElement(el)) {
                        el.value = value;
                    }
                }
                return this;
            }
        }
        data(key, value) {
            if (!isTypeHTMLOrSVGElement(this)) {
                // non supported dataset element
                return null == value ? undefined : this;
            }
            if (undefined === value) {
                // get first element dataset
                const dataset = this[0].dataset;
                if (null == key) {
                    // get all data
                    const data = {};
                    for (const prop of Object.keys(dataset)) {
                        data[prop] = coreUtils.toTypedData(dataset[prop]);
                    }
                    return data;
                }
                else {
                    // typed value
                    return coreUtils.toTypedData(dataset[coreUtils.camelize(key)]);
                }
            }
            else {
                // set value
                const prop = coreUtils.camelize(key || '');
                if (prop) {
                    for (const el of this) {
                        if (isNodeHTMLOrSVGElement(el)) {
                            el.dataset[prop] = coreUtils.fromTypedData(value);
                        }
                    }
                }
                return this;
            }
        }
        /**
         * @en Remove specified data.
         * @ja 指定したデータをデータ領域から削除
         *
         * @param key
         *  - `en` string equivalent to data-`key` is given.
         *  - `ja` data-`key` に相当する文字列を指定
         */
        removeData(key) {
            if (!isTypeHTMLOrSVGElement(this)) {
                return this;
            }
            const props = coreUtils.isArray(key) ? key.map(k => coreUtils.camelize(k)) : [coreUtils.camelize(key)];
            for (const el of this) {
                if (isNodeHTMLOrSVGElement(el)) {
                    const { dataset } = el;
                    for (const prop of props) {
                        delete dataset[prop];
                    }
                }
            }
            return this;
        }
    }
    coreUtils.setMixClassAttribute(DOMAttributes, 'protoExtendsOnly');

    /* eslint-disable
        @typescript-eslint/no-explicit-any
     */
    /** @internal helper for `is()` and `filter()` */
    function winnow(selector, dom, validCallback, invalidCallback) {
        invalidCallback = invalidCallback || coreUtils.noop;
        let retval;
        for (const [index, el] of dom.entries()) {
            if (coreUtils.isFunction(selector)) {
                if (selector.call(el, index, el)) {
                    retval = validCallback(el);
                    if (undefined !== retval) {
                        return retval;
                    }
                }
            }
            else if (isStringSelector(selector)) {
                if (el.matches && el.matches(selector)) {
                    retval = validCallback(el);
                    if (undefined !== retval) {
                        return retval;
                    }
                }
            }
            else if (isWindowSelector(selector)) {
                if (win === el) {
                    retval = validCallback(el);
                    if (undefined !== retval) {
                        return retval;
                    }
                }
                else {
                    retval = invalidCallback();
                    if (undefined !== retval) {
                        return retval;
                    }
                }
            }
            else if (isDocumentSelector(selector)) {
                if (doc === el) {
                    retval = validCallback(el);
                    if (undefined !== retval) {
                        return retval;
                    }
                }
                else {
                    retval = invalidCallback();
                    if (undefined !== retval) {
                        return retval;
                    }
                }
            }
            else if (isNodeSelector(selector)) {
                if (selector === el) {
                    retval = validCallback(el);
                    if (undefined !== retval) {
                        return retval;
                    }
                }
            }
            else if (isIterableSelector(selector)) {
                for (const elem of selector) {
                    if (elem === el) {
                        retval = validCallback(el);
                        if (undefined !== retval) {
                            return retval;
                        }
                    }
                }
            }
            else {
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
    function validParentNode(parentNode) {
        return null != parentNode && Node.DOCUMENT_NODE !== parentNode.nodeType && Node.DOCUMENT_FRAGMENT_NODE !== parentNode.nodeType;
    }
    /** @internal helper for `children()`, `parent()`, `next()` and `prev()` */
    function validRetrieveNode(node, selector) {
        if (node) {
            if (selector) {
                if (dom(node).is(selector)) {
                    return true;
                }
            }
            else {
                return true;
            }
        }
        return false;
    }
    /** @internal helper for `nextUntil()` and `prevUntil() */
    function retrieveSiblings(sibling, dom$1, selector, filter) {
        if (!isTypeElement(dom$1)) {
            return dom();
        }
        const siblings = new Set();
        for (const el of dom$1) {
            let elem = el[sibling];
            while (elem) {
                if (null != selector) {
                    if (dom(elem).is(selector)) {
                        break;
                    }
                }
                if (filter) {
                    if (dom(elem).is(filter)) {
                        siblings.add(elem);
                    }
                }
                else {
                    siblings.add(elem);
                }
                elem = elem[sibling];
            }
        }
        return dom([...siblings]);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Mixin base class which concentrated the traversing methods.
     * @ja トラバースメソッドを集約した Mixin Base クラス
     */
    class DOMTraversing {
        get(index) {
            if (null != index) {
                index = Math.trunc(index);
                return index < 0 ? this[index + this.length] : this[index];
            }
            else {
                return this.toArray();
            }
        }
        /**
         * @en Retrieve all the elements contained in the [[DOM]] set, as an array.
         * @ja 配下の要素すべてを配列で取得
         */
        toArray() {
            return [...this];
        }
        index(selector) {
            if (!isTypeElement(this)) {
                return undefined;
            }
            else if (null == selector) {
                let i = 0;
                let child = this[0];
                while (null !== (child = child.previousSibling)) {
                    if (Node.ELEMENT_NODE === child.nodeType) {
                        i += 1;
                    }
                }
                return i;
            }
            else {
                let elem;
                if (coreUtils.isString(selector)) {
                    elem = dom(selector)[0];
                }
                else {
                    elem = selector instanceof DOMBase ? selector[0] : selector;
                }
                const i = [...this].indexOf(elem);
                return 0 <= i ? i : undefined;
            }
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Traversing
        /**
         * @en Reduce the set of matched elements to the first in the set as [[DOM]] instance.
         * @ja 管轄している最初の要素を [[DOM]] インスタンスにして取得
         */
        first() {
            return dom(this[0]);
        }
        /**
         * @en Reduce the set of matched elements to the final one in the set as [[DOM]] instance.
         * @ja 管轄している末尾の要素を [[DOM]] インスタンスにして取得
         */
        last() {
            return dom(this[this.length - 1]);
        }
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
        add(selector, context) {
            const $add = dom(selector, context);
            const elems = new Set([...this, ...$add]);
            return dom([...elems]);
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
        is(selector) {
            if (this.length <= 0 || isEmptySelector(selector)) {
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
        filter(selector) {
            if (this.length <= 0 || isEmptySelector(selector)) {
                return dom();
            }
            const elements = [];
            winnow(selector, this, (el) => { elements.push(el); });
            return dom(elements);
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
        not(selector) {
            if (this.length <= 0 || isEmptySelector(selector)) {
                return dom();
            }
            const elements = new Set([...this]);
            winnow(selector, this, (el) => { elements.delete(el); });
            return dom([...elements]);
        }
        /**
         * @en Get the descendants of each element in the current set of matched elements, filtered by a selector.
         * @ja 配下の要素に対して指定したセレクタに一致する要素を検索
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        find(selector) {
            if (!coreUtils.isString(selector)) {
                const $selector = dom(selector);
                return $selector.filter((index, elem) => {
                    for (const el of this) {
                        if (isNode(el) && el !== elem && el.contains(elem)) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            else if (isTypeWindow(this)) {
                return dom();
            }
            else {
                const elements = [];
                for (const el of this) {
                    if (isNodeQueriable(el)) {
                        const elems = el.querySelectorAll(selector);
                        elements.push(...elems);
                    }
                }
                return dom(elements);
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
        has(selector) {
            if (isTypeWindow(this)) {
                return dom();
            }
            const targets = [];
            for (const el of this) {
                if (isNodeQueriable(el)) {
                    const $target = dom(selector, el);
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
            });
        }
        /**
         * @en Pass each element in the current matched set through a function, producing a new [[DOM]] instance containing the return values.
         * @ja コールバックで変更された要素を用いて新たに [[DOM]] インスタンスを構築
         *
         * @param callback
         *  - `en` modification function object that will be invoked for each element in the current set.
         *  - `ja` 各要素に対して呼び出される変更関数
         */
        map(callback) {
            const elements = [];
            for (const [index, el] of this.entries()) {
                elements.push(callback.call(el, index, el));
            }
            return dom(elements);
        }
        /**
         * @en Iterate over a [[DOM]] instance, executing a function for each matched element.
         * @ja 配下の要素に対してコールバック関数を実行
         *
         * @param callback
         *  - `en` callback function object that will be invoked for each element in the current set.
         *  - `ja` 各要素に対して呼び出されるコールバック関数
         */
        each(callback) {
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
        slice(begin, end) {
            return dom([...this].slice(begin, end));
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
        eq(index) {
            if (null == index) {
                // for fail safe
                return dom();
            }
            else {
                return dom(this.get(index));
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
        closest(selector) {
            if (null == selector || !isTypeElement(this)) {
                return dom();
            }
            else if (coreUtils.isString(selector)) {
                const closests = new Set();
                for (const el of this) {
                    if (isNodeElement(el)) {
                        const c = el.closest(selector);
                        if (c) {
                            closests.add(c);
                        }
                    }
                }
                return dom([...closests]);
            }
            else if (this.is(selector)) {
                return dom(this);
            }
            else {
                return this.parents(selector).eq(0);
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
        children(selector) {
            if (isTypeWindow(this)) {
                return dom();
            }
            const children = new Set();
            for (const el of this) {
                if (isNodeQueriable(el)) {
                    for (const child of el.children) {
                        if (validRetrieveNode(child, selector)) {
                            children.add(child);
                        }
                    }
                }
            }
            return dom([...children]);
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
        parent(selector) {
            const parents = new Set();
            for (const el of this) {
                if (isNode(el)) {
                    const parentNode = el.parentNode;
                    if (validParentNode(parentNode) && validRetrieveNode(parentNode, selector)) {
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
         *  - `en` filtered by a selector.
         *  - `ja` フィルタ用セレクタ
         * @returns [[DOM]] instance
         */
        parents(selector) {
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
        parentsUntil(selector, filter) {
            let parents = [];
            for (const el of this) {
                let parentNode = el.parentNode;
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
        next(selector) {
            if (!isTypeElement(this)) {
                return dom();
            }
            const nextSiblings = new Set();
            for (const el of this) {
                if (isNodeElement(el)) {
                    const elem = el.nextElementSibling;
                    if (validRetrieveNode(elem, selector)) {
                        nextSiblings.add(elem);
                    }
                }
            }
            return dom([...nextSiblings]);
        }
        /**
         * @en Get all following siblings of each element in the set of matched elements, optionally filtered by a selector.
         * @ja マッチした要素集合内の各要素の次以降の全ての兄弟要素を取得. セレクタを指定することでフィルタリングすることが可能.
         *
         * @param selector
         *  - `en` filtered by a selector.
         *  - `ja` フィルタ用セレクタ
         */
        nextAll(selector) {
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
        nextUntil(selector, filter) {
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
        prev(selector) {
            if (!isTypeElement(this)) {
                return dom();
            }
            const prevSiblings = new Set();
            for (const el of this) {
                if (isNodeElement(el)) {
                    const elem = el.previousElementSibling;
                    if (validRetrieveNode(elem, selector)) {
                        prevSiblings.add(elem);
                    }
                }
            }
            return dom([...prevSiblings]);
        }
        /**
         * @en Get all preceding siblings of each element in the set of matched elements, optionally filtered by a selector.
         * @ja マッチした要素集合内の各要素の前以降の全ての兄弟要素を取得. セレクタを指定することでフィルタリングすることが可能.
         *
         * @param selector
         *  - `en` filtered by a selector.
         *  - `ja` フィルタ用セレクタ
         */
        prevAll(selector) {
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
        prevUntil(selector, filter) {
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
        siblings(selector) {
            if (!isTypeElement(this)) {
                return dom();
            }
            const siblings = new Set();
            for (const el of this) {
                if (isNodeElement(el)) {
                    const parentNode = el.parentNode;
                    if (validParentNode(parentNode)) {
                        for (const sibling of dom(parentNode).children(selector)) {
                            if (sibling !== el) {
                                siblings.add(sibling);
                            }
                        }
                    }
                }
            }
            return dom([...siblings]);
        }
        /**
         * @en Get the children of each element in the set of matched elements, including text and comment nodes.
         * @ja テキストやHTMLコメントを含む子要素を取得
         */
        contents() {
            if (isTypeWindow(this)) {
                return dom();
            }
            const contents = new Set();
            for (const el of this) {
                if (isNode(el)) {
                    if (nodeName(el, 'iframe')) {
                        contents.add(el.contentDocument);
                    }
                    else if (nodeName(el, 'template')) {
                        contents.add(el.content);
                    }
                    else {
                        for (const node of el.childNodes) {
                            contents.add(node);
                        }
                    }
                }
            }
            return dom([...contents]);
        }
        /**
         * @en Get the closest ancestor element that is positioned.
         * @ja 要素の先祖要素で, スタイルでポジション指定(positiionがrelative, absolute, fixedのいずれか)されているものを取得
         */
        offsetParent() {
            const rootElement = doc.documentElement;
            if (this.length <= 0) {
                return dom();
            }
            else if (!isTypeElement(this)) {
                return dom(rootElement);
            }
            else {
                const offsets = new Set();
                for (const el of this) {
                    const offset = getOffsetParent(el) || rootElement;
                    offsets.add(offset);
                }
                return dom([...offsets]);
            }
        }
    }
    coreUtils.setMixClassAttribute(DOMTraversing, 'protoExtendsOnly');

    /** @internal check HTML string */
    function isHTMLString(src) {
        const subject = src.trim();
        return ('<' === subject.slice(0, 1)) && ('>' === subject.slice(-1));
    }
    /** @internal helper for `append()`, `prepend()`, `before()` and `after()`  */
    function toNodeSet(...contents) {
        const nodes = new Set();
        for (const content of contents) {
            if ((coreUtils.isString(content) && !isHTMLString(content)) || isNode(content)) {
                nodes.add(content);
            }
            else {
                const $dom = dom(content);
                for (const node of $dom) {
                    if (coreUtils.isString(node) || (isNode(node) && Node.DOCUMENT_NODE !== node.nodeType)) {
                        nodes.add(node);
                    }
                }
            }
        }
        return nodes;
    }
    /** @internal helper for `before()` and `after()`  */
    function toNode(node) {
        if (coreUtils.isString(node)) {
            return doc.createTextNode(node);
        }
        else {
            return node;
        }
    }
    /** @internal helper for `detach()` and `remove()` */
    function removeElement(selector, dom, keepListener) {
        const $dom = null != selector
            ? dom.filter(selector)
            : dom;
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
    class DOMManipulation {
        html(htmlString) {
            if (undefined === htmlString) {
                // getter
                const el = this[0];
                return isNodeElement(el) ? el.innerHTML : '';
            }
            else if (coreUtils.isString(htmlString)) {
                // setter
                for (const el of this) {
                    if (isNodeElement(el)) {
                        el.innerHTML = htmlString;
                    }
                }
                return this;
            }
            else {
                // invalid arg
                console.warn(`invalid arg. htmlString type:${typeof htmlString}`);
                return this;
            }
        }
        text(value) {
            if (undefined === value) {
                // getter
                const el = this[0];
                if (isNode(el)) {
                    const text = el.textContent;
                    return (null != text) ? text.trim() : '';
                }
                else {
                    return '';
                }
            }
            else {
                // setter
                const text = coreUtils.isString(value) ? value : String(value);
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
        append(...contents) {
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
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        appendTo(selector) {
            return dom(selector).append(this);
        }
        /**
         * @en Insert content, specified by the parameter, to the beginning of each element in the set of matched elements.
         * @ja 配下の要素の先頭に引数で指定したコンテンツを挿入
         *
         * @param contents
         *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
         *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
         */
        prepend(...contents) {
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
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        prependTo(selector) {
            return dom(selector).prepend(this);
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Insertion, Outside
        /**
         * @en Insert content, specified by the parameter, before each element in the set of matched elements.
         * @ja 配下の要素の前に指定した HTML や要素を挿入
         *
         * @param contents
         *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
         *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
         */
        before(...contents) {
            const nodes = toNodeSet(...contents);
            for (const el of this) {
                if (isNode(el) && el.parentNode) {
                    for (const node of nodes) {
                        el.parentNode.insertBefore(toNode(node), el);
                    }
                }
            }
            return this;
        }
        /**
         * @en Insert every element in the set of matched elements before the target.
         * @ja 配下の要素を指定した別要素の前に挿入
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        insertBefore(selector) {
            return dom(selector).before(this);
        }
        /**
         * @en Insert content, specified by the parameter, after each element in the set of matched elements.
         * @ja 配下の要素の後ろに指定した HTML や要素を挿入
         *
         * @param contents
         *  - `en` element(s), text node(s), HTML string, or [[DOM]] instance.
         *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または [[DOM]] インスタンス
         */
        after(...contents) {
            const nodes = toNodeSet(...[...contents].reverse());
            for (const el of this) {
                if (isNode(el) && el.parentNode) {
                    for (const node of nodes) {
                        el.parentNode.insertBefore(toNode(node), el.nextSibling);
                    }
                }
            }
            return this;
        }
        /**
         * @en Insert every element in the set of matched elements after the target.
         * @ja 配下の要素を指定した別要素の後ろに挿入
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        insertAfter(selector) {
            return dom(selector).after(this);
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Insertion, Around
        /**
         * @en Wrap an HTML structure around all elements in the set of matched elements.
         * @ja 配下の要素を指定した別要素でそれぞれ囲む
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        wrapAll(selector) {
            if (isTypeDocument(this) || isTypeWindow(this)) {
                return this;
            }
            const el = this[0];
            // The elements to wrap the target around
            const $wrap = dom(selector, el.ownerDocument).eq(0).clone(true);
            if (el.parentNode) {
                $wrap.insertBefore(el);
            }
            $wrap.map((index, elem) => {
                while (elem.firstElementChild) {
                    elem = elem.firstElementChild;
                }
                return elem;
            }).append(this);
            return this;
        }
        /**
         * @en Wrap an HTML structure around the content of each element in the set of matched elements.
         * @ja 配下の要素の内側を, 指定した別エレメントでそれぞれ囲む
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        wrapInner(selector) {
            if (!isTypeElement(this)) {
                return this;
            }
            for (const el of this) {
                const $el = dom(el);
                const contents = $el.contents();
                if (0 < contents.length) {
                    contents.wrapAll(selector);
                }
                else {
                    $el.append(selector);
                }
            }
            return this;
        }
        /**
         * @en Wrap an HTML structure around each element in the set of matched elements.
         * @ja 配下の要素を, 指定した別要素でそれぞれ囲む
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        wrap(selector) {
            if (!isTypeElement(this)) {
                return this;
            }
            for (const el of this) {
                const $el = dom(el);
                $el.wrapAll(selector);
            }
            return this;
        }
        /**
         * @en Remove the parents of the set of matched elements from the DOM, leaving the matched elements in their place.
         * @ja 要素の親エレメントを削除
         *
         * @param selector
         *  - `en` filtered by a selector.
         *  - `ja` フィルタ用セレクタ
         */
        unwrap(selector) {
            const self = this;
            self.parent(selector).not('body').each((index, elem) => {
                dom(elem).replaceWith(elem.childNodes);
            });
            return this;
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Removal
        /**
         * @en Remove all child nodes of the set of matched elements from the DOM.
         * @ja 配下の要素内の子要素(テキストも対象)をすべて削除
         */
        empty() {
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
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        detach(selector) {
            removeElement(selector, this, true);
            return this;
        }
        /**
         * @en Remove the set of matched elements from the DOM.
         * @ja 要素を DOM から削除
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        remove(selector) {
            removeElement(selector, this, false);
            return this;
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Replacement
        /**
         * @en Replace each element in the set of matched elements with the provided new content and return the set of elements that was removed.
         * @ja 配下の要素を指定された別の要素や HTML と差し替え
         *
         * @param newContent
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        replaceWith(newContent) {
            const elem = (() => {
                const $dom = dom(newContent);
                if (1 === $dom.length && isNodeElement($dom[0])) {
                    return $dom[0];
                }
                else {
                    const fragment = doc.createDocumentFragment();
                    for (const el of $dom) {
                        if (isNodeElement(el)) {
                            fragment.appendChild(el);
                        }
                    }
                    return fragment;
                }
            })();
            for (const el of this) {
                if (isNodeElement(el)) {
                    el.replaceWith(elem);
                }
            }
            return this;
        }
        /**
         * @en Replace each target element with the set of matched elements.
         * @ja 配下の要素を指定した別の要素と差し替え
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
         */
        replaceAll(selector) {
            return dom(selector).replaceWith(this);
        }
    }
    coreUtils.setMixClassAttribute(DOMManipulation, 'protoExtendsOnly');

    /** @internal helper for `css()` */
    function ensureChainCaseProperies(props) {
        const retval = {};
        for (const key in props) {
            retval[coreUtils.dasherize(key)] = props[key];
        }
        return retval;
    }
    /** @internal helper for `css()` get props */
    function getDefaultView(el) {
        return (el.ownerDocument && el.ownerDocument.defaultView) || win;
    }
    /** @internal helper for `css()` get props */
    function getComputedStyleFrom(el) {
        const view = getDefaultView(el);
        return view.getComputedStyle(el);
    }
    /** @internal helper for css value to number */
    function toNumber(val) {
        return parseFloat(val) || 0;
    }
    /** @internal */
    const _resolver = {
        width: ['left', 'right'],
        height: ['top', 'bottom'],
    };
    /** @internal helper for size calcution */
    function getPadding(style, type) {
        return toNumber(style.getPropertyValue(`padding-${_resolver[type][0]}`))
            + toNumber(style.getPropertyValue(`padding-${_resolver[type][1]}`));
    }
    /** @internal helper for size calcution */
    function getBorder(style, type) {
        return toNumber(style.getPropertyValue(`border-${_resolver[type][0]}-width`))
            + toNumber(style.getPropertyValue(`border-${_resolver[type][1]}-width`));
    }
    /** @internal helper for size calcution */
    function getMargin(style, type) {
        return toNumber(style.getPropertyValue(`margin-${_resolver[type][0]}`))
            + toNumber(style.getPropertyValue(`margin-${_resolver[type][1]}`));
    }
    /** @internal helper for `width()` and `heigth()` */
    function manageSizeFor(dom, type, value) {
        if (null == value) {
            // getter
            if (isTypeWindow(dom)) {
                // スクロールバーを除いた幅 (clientWidth / clientHeight)
                return dom[0].document.documentElement[`client${coreUtils.classify(type)}`];
            }
            else if (isTypeDocument(dom)) {
                // (scrollWidth / scrollHeight)
                return dom[0].documentElement[`scroll${coreUtils.classify(type)}`];
            }
            else {
                const el = dom[0];
                if (isNodeHTMLOrSVGElement(el)) {
                    const style = getComputedStyleFrom(el);
                    const size = toNumber(style.getPropertyValue(type));
                    if ('border-box' === style.getPropertyValue('box-sizing')) {
                        return size - (getBorder(style, type) + getPadding(style, type));
                    }
                    else {
                        return size;
                    }
                }
                else {
                    return 0;
                }
            }
        }
        else {
            // setter
            return dom.css(type, coreUtils.isString(value) ? value : `${value}px`);
        }
    }
    /** @internal helper for `innerWidth()` and `innerHeigth()` */
    function manageInnerSizeFor(dom, type, value) {
        if (null == value) {
            // getter
            if (isTypeWindow(dom) || isTypeDocument(dom)) {
                return manageSizeFor(dom, type);
            }
            else {
                const el = dom[0];
                if (isNodeHTMLOrSVGElement(el)) {
                    // (clientWidth / clientHeight)
                    return el[`client${coreUtils.classify(type)}`];
                }
                else {
                    return 0;
                }
            }
        }
        else if (isTypeWindow(dom) || isTypeDocument(dom)) {
            // setter (no reaction)
            return dom;
        }
        else {
            // setter
            const isTextProp = coreUtils.isString(value);
            for (const el of dom) {
                if (isNodeHTMLOrSVGElement(el)) {
                    const { style, newVal } = (() => {
                        if (isTextProp) {
                            el.style.setProperty(type, value);
                        }
                        const style = getComputedStyleFrom(el);
                        const newVal = isTextProp ? toNumber(style.getPropertyValue(type)) : value;
                        return { style, newVal };
                    })();
                    if ('border-box' === style.getPropertyValue('box-sizing')) {
                        el.style.setProperty(type, `${newVal + getBorder(style, type)}px`);
                    }
                    else {
                        el.style.setProperty(type, `${newVal - getPadding(style, type)}px`);
                    }
                }
            }
            return dom;
        }
    }
    /** @internal helper for `outerWidth()` and `outerHeigth()` */
    function parseOuterSizeArgs(...args) {
        let [value, includeMargin] = args;
        if (!coreUtils.isNumber(value) && !coreUtils.isString(value)) {
            includeMargin = !!value;
            value = undefined;
        }
        return { includeMargin, value };
    }
    /** @internal helper for `outerWidth()` and `outerHeigth()` */
    function manageOuterSizeFor(dom, type, includeMargin, value) {
        if (null == value) {
            // getter
            if (isTypeWindow(dom)) {
                // スクロールバーを含めた幅 (innerWidth / innerHeight)
                return dom[0][`inner${coreUtils.classify(type)}`];
            }
            else if (isTypeDocument(dom)) {
                return manageSizeFor(dom, type);
            }
            else {
                const el = dom[0];
                if (isNodeHTMLOrSVGElement(el)) {
                    // (offsetWidth / offsetHeight)
                    const offset = getOffsetSize(el, type);
                    if (includeMargin) {
                        const style = getComputedStyleFrom(el);
                        return offset + getMargin(style, type);
                    }
                    else {
                        return offset;
                    }
                }
                else {
                    return 0;
                }
            }
        }
        else if (isTypeWindow(dom) || isTypeDocument(dom)) {
            // setter (no reaction)
            return dom;
        }
        else {
            // setter
            const isTextProp = coreUtils.isString(value);
            for (const el of dom) {
                if (isNodeHTMLOrSVGElement(el)) {
                    const { style, newVal } = (() => {
                        if (isTextProp) {
                            el.style.setProperty(type, value);
                        }
                        const style = getComputedStyleFrom(el);
                        const margin = includeMargin ? getMargin(style, type) : 0;
                        const newVal = (isTextProp ? toNumber(style.getPropertyValue(type)) : value) - margin;
                        return { style, newVal };
                    })();
                    if ('content-box' === style.getPropertyValue('box-sizing')) {
                        el.style.setProperty(type, `${newVal - getBorder(style, type) - getPadding(style, type)}px`);
                    }
                    else {
                        el.style.setProperty(type, `${newVal}px`);
                    }
                }
            }
            return dom;
        }
    }
    /** @internal helper for `position()` and `offset()` */
    function getOffsetPosition(el) {
        // for display none
        if (el.getClientRects().length <= 0) {
            return { top: 0, left: 0 };
        }
        const rect = el.getBoundingClientRect();
        const view = getDefaultView(el);
        return {
            top: rect.top + view.pageYOffset,
            left: rect.left + view.pageXOffset
        };
    }
    /**
     * @en Get offset[Width | Height]. This function will work SVGElement, too.
     * @ja offse[Width | Height] の取得. SVGElement にも適用可能
     */
    function getOffsetSize(el, type) {
        if (null != el.offsetWidth) {
            // (offsetWidth / offsetHeight)
            return el[`offset${coreUtils.classify(type)}`];
        }
        else {
            /*
             * [NOTE] SVGElement は offsetWidth がサポートされない
             *        getBoundingClientRect() は transform に影響を受けるため,
             *        定義通り border, paddin を含めた値を算出する
             */
            const style = getComputedStyleFrom(el);
            const size = toNumber(style.getPropertyValue(type));
            if ('content-box' === style.getPropertyValue('box-sizing')) {
                return size + getBorder(style, type) + getPadding(style, type);
            }
            else {
                return size;
            }
        }
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Mixin base class which concentrated the style management methods.
     * @ja スタイル関連メソッドを集約した Mixin Base クラス
     */
    class DOMStyles {
        css(name, value) {
            // valid elements
            if (!isTypeHTMLOrSVGElement(this)) {
                if (coreUtils.isString(name)) {
                    return null == value ? '' : this;
                }
                else if (coreUtils.isArray(name)) {
                    return {};
                }
                else {
                    return this;
                }
            }
            if (coreUtils.isString(name)) {
                if (undefined === value) {
                    // get property single
                    const el = this[0];
                    return getComputedStyleFrom(el).getPropertyValue(coreUtils.dasherize(name));
                }
                else {
                    // set property single
                    const propName = coreUtils.dasherize(name);
                    const remove = (null === value);
                    for (const el of this) {
                        if (isNodeHTMLOrSVGElement(el)) {
                            if (remove) {
                                el.style.removeProperty(propName);
                            }
                            else {
                                el.style.setProperty(propName, value);
                            }
                        }
                    }
                    return this;
                }
            }
            else if (coreUtils.isArray(name)) {
                // get multiple properties
                const el = this[0];
                const view = getDefaultView(el);
                const props = {};
                for (const key of name) {
                    const propName = coreUtils.dasherize(key);
                    props[key] = view.getComputedStyle(el).getPropertyValue(propName);
                }
                return props;
            }
            else {
                // set multiple properties
                const props = ensureChainCaseProperies(name);
                for (const el of this) {
                    if (isNodeHTMLOrSVGElement(el)) {
                        const { style } = el;
                        for (const propName in props) {
                            if (null === props[propName]) {
                                style.removeProperty(propName);
                            }
                            else {
                                style.setProperty(propName, props[propName]);
                            }
                        }
                    }
                }
                return this;
            }
        }
        width(value) {
            return manageSizeFor(this, 'width', value);
        }
        height(value) {
            return manageSizeFor(this, 'height', value);
        }
        innerWidth(value) {
            return manageInnerSizeFor(this, 'width', value);
        }
        innerHeight(value) {
            return manageInnerSizeFor(this, 'height', value);
        }
        outerWidth(...args) {
            const { includeMargin, value } = parseOuterSizeArgs(...args);
            return manageOuterSizeFor(this, 'width', includeMargin, value);
        }
        outerHeight(...args) {
            const { includeMargin, value } = parseOuterSizeArgs(...args);
            return manageOuterSizeFor(this, 'height', includeMargin, value);
        }
        /**
         * @en Get the current coordinates of the first element in the set of matched elements, relative to the offset parent.
         * @ja 最初の要素の親要素からの相対的な表示位置を返却
         */
        position() {
            // valid elements
            if (!isTypeHTMLOrSVGElement(this)) {
                return { top: 0, left: 0 };
            }
            let offset;
            let parentOffset = { top: 0, left: 0 };
            const el = this[0];
            const { position, marginTop: mt, marginLeft: ml } = dom(el).css(['position', 'marginTop', 'marginLeft']);
            const marginTop = toNumber(mt);
            const marginLeft = toNumber(ml);
            // position:fixed elements are offset from the viewport, which itself always has zero offset
            if ('fixed' === position) {
                // Assume position:fixed implies availability of getBoundingClientRect
                offset = el.getBoundingClientRect();
            }
            else {
                offset = getOffsetPosition(el);
                // Account for the *real* offset parent, which can be the document or its root element
                // when a statically positioned element is identified
                const doc = el.ownerDocument;
                let offsetParent = getOffsetParent(el) || doc.documentElement;
                let $offsetParent = dom(offsetParent);
                while (offsetParent &&
                    (offsetParent === doc.body || offsetParent === doc.documentElement) &&
                    'static' === $offsetParent.css('position')) {
                    offsetParent = offsetParent.parentNode;
                    $offsetParent = dom(offsetParent);
                }
                if (offsetParent && offsetParent !== el && Node.ELEMENT_NODE === offsetParent.nodeType) {
                    // Incorporate borders into its offset, since they are outside its content origin
                    parentOffset = getOffsetPosition(offsetParent);
                    const { borderTopWidth, borderLeftWidth } = $offsetParent.css(['borderTopWidth', 'borderLeftWidth']);
                    parentOffset.top += toNumber(borderTopWidth);
                    parentOffset.left += toNumber(borderLeftWidth);
                }
            }
            // Subtract parent offsets and element margins
            return {
                top: offset.top - parentOffset.top - marginTop,
                left: offset.left - parentOffset.left - marginLeft,
            };
        }
        offset(coordinates) {
            // valid elements
            if (!isTypeHTMLOrSVGElement(this)) {
                return null == coordinates ? { top: 0, left: 0 } : this;
            }
            else if (null == coordinates) {
                // get
                return getOffsetPosition(this[0]);
            }
            else {
                // set
                for (const el of this) {
                    const $el = dom(el);
                    const props = {};
                    const { position, top: cssTop, left: cssLeft } = $el.css(['position', 'top', 'left']);
                    // Set position first, in-case top/left are set even on static elem
                    if ('static' === position) {
                        el.style.position = 'relative';
                    }
                    const curOffset = $el.offset();
                    const curPosition = (() => {
                        const needCalculatePosition = ('absolute' === position || 'fixed' === position) && (cssTop + cssLeft).includes('auto');
                        if (needCalculatePosition) {
                            return $el.position();
                        }
                        else {
                            return { top: toNumber(cssTop), left: toNumber(cssLeft) };
                        }
                    })();
                    if (null != coordinates.top) {
                        props.top = `${(coordinates.top - curOffset.top) + curPosition.top}px`;
                    }
                    if (null != coordinates.left) {
                        props.left = `${(coordinates.left - curOffset.left) + curPosition.left}px`;
                    }
                    $el.css(props);
                }
                return this;
            }
        }
    }
    coreUtils.setMixClassAttribute(DOMStyles, 'protoExtendsOnly');

    /* eslint-disable
        no-invalid-this
     ,  @typescript-eslint/no-explicit-any
     */
    //__________________________________________________________________________________________________//
    /** @internal */
    const _eventContextMap = {
        eventData: new WeakMap(),
        eventListeners: new WeakMap(),
        liveEventListeners: new WeakMap(),
    };
    /** @internal query event-data from element */
    function queryEventData(event) {
        const data = _eventContextMap.eventData.get(event.target) || [];
        data.unshift(event);
        return data;
    }
    /** @internal register event-data with element */
    function registerEventData(elem, eventData) {
        _eventContextMap.eventData.set(elem, eventData);
    }
    /** @internal delete event-data by element */
    function deleteEventData(elem) {
        _eventContextMap.eventData.delete(elem);
    }
    /** @internal convert event cookie from event name, selector, options */
    function toCookie(event, selector, options) {
        delete options.once;
        return `${event}${"|" /* COOKIE_SEPARATOR */}${JSON.stringify(options)}${"|" /* COOKIE_SEPARATOR */}${selector}`;
    }
    /** @internal get listener handlers context by element and event */
    function getEventListenersHandlers(elem, event, selector, options, ensure) {
        const eventListeners = selector ? _eventContextMap.liveEventListeners : _eventContextMap.eventListeners;
        if (!eventListeners.has(elem)) {
            if (ensure) {
                eventListeners.set(elem, {});
            }
            else {
                return {
                    registered: undefined,
                    handlers: [],
                };
            }
        }
        const context = eventListeners.get(elem);
        const cookie = toCookie(event, selector, options);
        if (!context[cookie]) {
            context[cookie] = {
                registered: new Set(),
                handlers: [],
            };
        }
        return context[cookie];
    }
    /** @internal register listener handlers context from element and event */
    function registerEventListenerHandlers(elem, events, selector, listener, proxy, options) {
        for (const event of events) {
            const { registered, handlers } = getEventListenersHandlers(elem, event, selector, options, true);
            if (registered && !registered.has(listener)) {
                registered.add(listener);
                handlers.push({
                    listener,
                    proxy,
                });
                elem.addEventListener && elem.addEventListener(event, proxy, options);
            }
        }
    }
    /** @internal query all event and handler by element, for all `off()` and `clone(true)` */
    function extractAllHandlers(elem, remove = true) {
        const handlers = [];
        const query = (context) => {
            if (context) {
                for (const cookie of Object.keys(context)) {
                    const seed = cookie.split("|" /* COOKIE_SEPARATOR */);
                    const event = seed[0];
                    const options = JSON.parse(seed[1]);
                    for (const handler of context[cookie].handlers) {
                        handlers.push({ event, handler: handler.proxy, options });
                    }
                }
                return true;
            }
            else {
                return false;
            }
        };
        const { eventListeners, liveEventListeners } = _eventContextMap;
        query(eventListeners.get(elem)) && remove && eventListeners.delete(elem);
        query(liveEventListeners.get(elem)) && remove && liveEventListeners.delete(elem);
        return handlers;
    }
    /** @internal parse event args */
    function parseEventArgs(...args) {
        let [type, selector, listener, options] = args;
        if (coreUtils.isFunction(selector)) {
            [type, listener, options] = args;
            selector = undefined;
        }
        type = !type ? [] : (coreUtils.isArray(type) ? type : [type]);
        selector = selector || '';
        if (!options) {
            options = {};
        }
        else if (true === options) {
            options = { capture: true };
        }
        return { type, selector, listener, options };
    }
    /** @internal */ const _noTrigger = ['resize', 'scroll'];
    /** @internal event-shortcut impl */
    function eventShortcut(name, handler, options) {
        if (null == handler) {
            for (const el of this) {
                if (!_noTrigger.includes(name)) {
                    if (coreUtils.isFunction(el[name])) {
                        el[name]();
                    }
                    else {
                        dom(el).trigger(name);
                    }
                }
            }
            return this;
        }
        else {
            return this.on(name, handler, options);
        }
    }
    /** @internal helper for `clone()` */
    function cloneEvent(src, dst) {
        const contexts = extractAllHandlers(src, false);
        for (const context of contexts) {
            dst.addEventListener(context.event, context.handler, context.options);
        }
    }
    /** @internal helper for `clone()` */
    function cloneElement(elem, withEvents, deep) {
        const clone = elem.cloneNode(true);
        if (withEvents) {
            if (deep) {
                const srcElements = elem.querySelectorAll('*');
                const dstElements = clone.querySelectorAll('*');
                for (const [index] of srcElements.entries()) {
                    cloneEvent(srcElements[index], dstElements[index]);
                }
            }
            else {
                cloneEvent(elem, clone);
            }
        }
        return clone;
    }
    /* eslint-enable @typescript-eslint/indent */
    /**
     * @en Mixin base class which concentrated the event managements.
     * @ja イベント管理を集約した Mixin Base クラス
     */
    class DOMEvents {
        on(...args) {
            const { type: events, selector, listener, options } = parseEventArgs(...args);
            function handleLiveEvent(e) {
                const eventData = queryEventData(e);
                const $target = dom(e.target);
                if ($target.is(selector)) {
                    listener.apply($target[0], eventData);
                }
                else {
                    for (const parent of $target.parents()) {
                        if (dom(parent).is(selector)) {
                            listener.apply(parent, eventData);
                        }
                    }
                }
            }
            function handleEvent(e) {
                listener.apply(this, queryEventData(e));
            }
            const proxy = selector ? handleLiveEvent : handleEvent;
            for (const el of this) {
                registerEventListenerHandlers(el, events, selector, listener, proxy, options);
            }
            return this;
        }
        off(...args) {
            const { type: events, selector, listener, options } = parseEventArgs(...args);
            if (events.length <= 0) {
                for (const el of this) {
                    const contexts = extractAllHandlers(el);
                    for (const context of contexts) {
                        el.removeEventListener(context.event, context.handler, context.options);
                    }
                }
            }
            else {
                for (const event of events) {
                    for (const el of this) {
                        const { registered, handlers } = getEventListenersHandlers(el, event, selector, options, false);
                        if (0 < handlers.length) {
                            for (let i = handlers.length - 1; i >= 0; i--) { // backward operation
                                const handler = handlers[i];
                                if ((listener && handler.listener === listener) ||
                                    (listener && handler.listener && handler.listener.origin && handler.listener.origin === listener) ||
                                    (!listener)) {
                                    el.removeEventListener(event, handler.proxy, options);
                                    handlers.splice(i, 1);
                                    registered.delete(handler.listener);
                                }
                            }
                        }
                    }
                }
            }
            return this;
        }
        once(...args) {
            const { type, selector, listener, options } = parseEventArgs(...args);
            const opts = { ...options, ...{ once: true } };
            const self = this;
            function onceHandler(...eventArgs) {
                listener.apply(this, eventArgs);
                self.off(type, selector, onceHandler, opts);
                delete onceHandler.origin;
            }
            onceHandler.origin = listener;
            return this.on(type, selector, onceHandler, opts);
        }
        /**
         * @en Execute all handlers added to the matched elements for the specified event.
         * @ja 設定されているイベントハンドラに対してイベントを発行
         *
         * @param seed
         *  - `en` event name or event name array. / `Event` instance or `Event` instance array.
         *  - `ja` イベント名またはイベント名配列 / `Event` インスタンスまたは `Event` インスタンス配列
         * @param eventData
         *  - `en` optional sending data.
         *  - `ja` 送信する任意のデータ
         */
        trigger(seed, ...eventData) {
            const convert = (arg) => {
                if (coreUtils.isString(arg)) {
                    return new evt(arg, {
                        detail: eventData,
                        bubbles: true,
                        cancelable: true,
                    });
                }
                else {
                    return arg;
                }
            };
            const events = coreUtils.isArray(seed) ? seed : [seed];
            for (const event of events) {
                const e = convert(event);
                for (const el of this) {
                    registerEventData(el, eventData);
                    el.dispatchEvent(e);
                    deleteEventData(el);
                }
            }
            return this;
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Events utility
        /**
         * @en Shortcut for [[once]]('transitionend').
         * @ja [[once]]('transitionend') のユーティリティ
         *
         * @param callback
         *  - `en` `transitionend` handler.
         *  - `ja` `transitionend` ハンドラ
         * @param permanent
         *  - `en` if set `true`, callback keep living until elements removed.
         *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
         */
        transitionEnd(callback, permanent = false) {
            const self = this;
            function fireCallBack(e) {
                if (e.target !== this) {
                    return;
                }
                callback.call(this, e);
                if (!permanent) {
                    self.off('transitionend', fireCallBack);
                }
            }
            coreUtils.isFunction(callback) && self.on('transitionend', fireCallBack);
            return this;
        }
        /**
         * @en Shortcut for [[once]]('animationend').
         * @ja [[once]]('animationend') のユーティリティ
         *
         * @param callback
         *  - `en` `animationend` handler.
         *  - `ja` `animationend` ハンドラ
         * @param permanent
         *  - `en` if set `true`, callback keep living until elements removed.
         *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
         */
        animationEnd(callback, permanent = false) {
            const self = this;
            function fireCallBack(e) {
                if (e.target !== this) {
                    return;
                }
                callback.call(this, e);
                if (!permanent) {
                    self.off('animationend', fireCallBack);
                }
            }
            coreUtils.isFunction(callback) && self.on('animationend', fireCallBack);
            return this;
        }
        /**
         * @en Bind one or two handlers to the matched elements, to be executed when the `mouseenter` and `mouseleave` the elements.
         * @ja 1つまたは2つのハンドラを指定し, 一致した要素の `mouseenter`, `mouseleave` を検知
         *
         * @param handlerIn(Out)
         *  - `en` A function to execute when the `mouseenter` the element. <br>
         *        If handler set only one, a function to execute when the `mouseleave` the element, too.
         *  - `ja` `mouseenter` イベントハンドラを指定. <br>
         *          引数が1つである場合, `mouseleave` ハンドラも兼ねる
         * @param handlerOut
         *  - `en` A function to execute when the `mouseleave` the element.
         *  - `ja` `mouseleave` ハンドラを指定
         */
        hover(handlerIn, handlerOut) {
            handlerOut = handlerOut || handlerIn;
            return this.mouseenter(handlerIn).mouseleave(handlerOut);
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Events shortcut
        /**
         * @en Trigger or handle `click` event.
         * @ja `click` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        click(handler, options) {
            return eventShortcut.bind(this)('click', handler, options);
        }
        /**
         * @en Trigger or handle `dblclick` event.
         * @ja `dblclick` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        dblclick(handler, options) {
            return eventShortcut.bind(this)('dblclick', handler, options);
        }
        /**
         * @en Trigger or handle `blur` event.
         * @ja `blur` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        blur(handler, options) {
            return eventShortcut.bind(this)('blur', handler, options);
        }
        /**
         * @en Trigger or handle `focus` event.
         * @ja `focus` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        focus(handler, options) {
            return eventShortcut.bind(this)('focus', handler, options);
        }
        /**
         * @en Trigger or handle `focusin` event.
         * @ja `focusin` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        focusin(handler, options) {
            return eventShortcut.bind(this)('focusin', handler, options);
        }
        /**
         * @en Trigger or handle `focusout` event.
         * @ja `focusout` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        focusout(handler, options) {
            return eventShortcut.bind(this)('focusout', handler, options);
        }
        /**
         * @en Trigger or handle `keyup` event.
         * @ja `keyup` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        keyup(handler, options) {
            return eventShortcut.bind(this)('keyup', handler, options);
        }
        /**
         * @en Trigger or handle `keydown` event.
         * @ja `keydown` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        keydown(handler, options) {
            return eventShortcut.bind(this)('keydown', handler, options);
        }
        /**
         * @en Trigger or handle `keypress` event.
         * @ja `keypress` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        keypress(handler, options) {
            return eventShortcut.bind(this)('keypress', handler, options);
        }
        /**
         * @en Trigger or handle `submit` event.
         * @ja `submit` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        submit(handler, options) {
            return eventShortcut.bind(this)('submit', handler, options);
        }
        /**
         * @en Trigger or handle `contextmenu` event.
         * @ja `contextmenu` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        contextmenu(handler, options) {
            return eventShortcut.bind(this)('contextmenu', handler, options);
        }
        /**
         * @en Trigger or handle `change` event.
         * @ja `change` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        change(handler, options) {
            return eventShortcut.bind(this)('change', handler, options);
        }
        /**
         * @en Trigger or handle `mousedown` event.
         * @ja `mousedown` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        mousedown(handler, options) {
            return eventShortcut.bind(this)('mousedown', handler, options);
        }
        /**
         * @en Trigger or handle `mousemove` event.
         * @ja `mousemove` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        mousemove(handler, options) {
            return eventShortcut.bind(this)('mousemove', handler, options);
        }
        /**
         * @en Trigger or handle `mouseup` event.
         * @ja `mouseup` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        mouseup(handler, options) {
            return eventShortcut.bind(this)('mouseup', handler, options);
        }
        /**
         * @en Trigger or handle `mouseenter` event.
         * @ja `mouseenter` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        mouseenter(handler, options) {
            return eventShortcut.bind(this)('mouseenter', handler, options);
        }
        /**
         * @en Trigger or handle `mouseleave` event.
         * @ja `mouseleave` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        mouseleave(handler, options) {
            return eventShortcut.bind(this)('mouseleave', handler, options);
        }
        /**
         * @en Trigger or handle `mouseout` event.
         * @ja `mouseout` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        mouseout(handler, options) {
            return eventShortcut.bind(this)('mouseout', handler, options);
        }
        /**
         * @en Trigger or handle `mouseover` event.
         * @ja `mouseover` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        mouseover(handler, options) {
            return eventShortcut.bind(this)('mouseover', handler, options);
        }
        /**
         * @en Trigger or handle `touchstart` event.
         * @ja `touchstart` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        touchstart(handler, options) {
            return eventShortcut.bind(this)('touchstart', handler, options);
        }
        /**
         * @en Trigger or handle `touchend` event.
         * @ja `touchend` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        touchend(handler, options) {
            return eventShortcut.bind(this)('touchend', handler, options);
        }
        /**
         * @en Trigger or handle `touchmove` event.
         * @ja `touchmove` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        touchmove(handler, options) {
            return eventShortcut.bind(this)('touchmove', handler, options);
        }
        /**
         * @en Trigger or handle `touchcancel` event.
         * @ja `touchcancel` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        touchcancel(handler, options) {
            return eventShortcut.bind(this)('touchcancel', handler, options);
        }
        /**
         * @en Trigger or handle `resize` event.
         * @ja `resize` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        resize(handler, options) {
            return eventShortcut.bind(this)('resize', handler, options);
        }
        /**
         * @en Trigger or handle `scroll` event.
         * @ja `scroll` イベントの発行または捕捉
         *
         * @param handler
         *  - `en` event handler is designated. when omitting, the event is triggered.
         *  - `ja` イベントハンドラを指定. 省略した場合はイベントを発行
         * @param options
         *  - `en` options for `addEventLisntener`
         *  - `ja` `addEventLisntener` に指定するオプション
         */
        scroll(handler, options) {
            return eventShortcut.bind(this)('scroll', handler, options);
        }
        ///////////////////////////////////////////////////////////////////////
        // public: Copying
        /**
         * @en Create a deep copy of the set of matched elements.
         * @ja 配下の要素のディープコピーを作成
         *
         * @param withEvents
         *  - `en` A Boolean indicating whether event handlers should be copied along with the elements.
         *  - `ja` イベントハンドラもコピーするかどうかを決定
         * @param deep
         *  - `en` A Boolean indicating whether event handlers for all children of the cloned element should be copied.
         *  - `ja` boolean値で、配下の要素のすべての子要素に対しても、付随しているイベントハンドラをコピーするかどうかを決定
         */
        clone(withEvents = false, deep = false) {
            const self = this;
            if (!isTypeElement(self)) {
                return self;
            }
            return self.map((index, el) => {
                return cloneElement(el, withEvents, deep);
            });
        }
    }
    coreUtils.setMixClassAttribute(DOMEvents, 'protoExtendsOnly');

    //__________________________________________________________________________________________________//
    /** @internal query scroll target element */
    function queryTargetElement(el) {
        if (isNodeElement(el)) {
            return el;
        }
        else if (isNodeDocument(el)) {
            return el.documentElement;
        }
        else if (win === el) {
            return win.document.documentElement;
        }
        else {
            return null;
        }
    }
    /** @internal helper for `scrollTo()` */
    function parseArgs(...args) {
        const options = { easing: 'swing' };
        if (1 === args.length) {
            Object.assign(options, args[0]);
        }
        else {
            const [left, top, duration, easing, callback] = args;
            Object.assign(options, {
                top,
                left,
                duration,
                easing,
                callback,
            });
        }
        options.top = ensurePositiveNumber(options.top);
        options.left = ensurePositiveNumber(options.left);
        options.duration = ensurePositiveNumber(options.duration);
        return options;
    }
    /** @internal helper for `scrollTo()` */
    function execScroll(el, options) {
        const { top, left, duration, easing, callback } = options;
        const initialTop = el.scrollTop;
        const initialLeft = el.scrollLeft;
        let enableTop = coreUtils.isNumber(top);
        let enableLeft = coreUtils.isNumber(left);
        // non animation case
        if (!duration) {
            let notify = false;
            if (enableTop && top !== initialTop) {
                el.scrollTop = top;
                notify = true;
            }
            if (enableLeft && left !== initialLeft) {
                el.scrollLeft = left;
                notify = true;
            }
            if (notify && coreUtils.isFunction(callback)) {
                callback();
            }
            return;
        }
        const calcMetrics = (enable, base, initialValue, type) => {
            if (!enable) {
                return { max: 0, new: 0, initial: 0 };
            }
            const maxValue = el[`scroll${coreUtils.classify(type)}`] - getOffsetSize(el, type);
            const newValue = Math.max(Math.min(base, maxValue), 0);
            return { max: maxValue, new: newValue, initial: initialValue };
        };
        const metricsTop = calcMetrics(enableTop, top, initialTop, 'height');
        const metricsLeft = calcMetrics(enableLeft, left, initialLeft, 'width');
        if (enableTop && metricsTop.new === metricsTop.initial) {
            enableTop = false;
        }
        if (enableLeft && metricsLeft.new === metricsLeft.initial) {
            enableLeft = false;
        }
        if (!enableTop && !enableLeft) {
            // need not to scroll
            return;
        }
        const calcProgress = (value) => {
            if (coreUtils.isFunction(easing)) {
                return easing(value);
            }
            else {
                return 'linear' === easing ? value : swing(value);
            }
        };
        const delta = { top: 0, left: 0 };
        const startTime = Date.now();
        const animate = () => {
            const elapse = Date.now() - startTime;
            const progress = Math.max(Math.min(elapse / duration, 1), 0);
            const progressCoeff = calcProgress(progress);
            // update delta
            if (enableTop) {
                delta.top = metricsTop.initial + (progressCoeff * (metricsTop.new - metricsTop.initial));
            }
            if (enableLeft) {
                delta.left = metricsLeft.initial + (progressCoeff * (metricsLeft.new - metricsLeft.initial));
            }
            // check done
            if ((enableTop && metricsTop.new > metricsTop.initial && delta.top >= metricsTop.new) || // scroll down
                (enableTop && metricsTop.new < metricsTop.initial && delta.top <= metricsTop.new) || // scroll up
                (enableLeft && metricsLeft.new > metricsLeft.initial && delta.left >= metricsLeft.new) || // scroll right
                (enableLeft && metricsLeft.new < metricsLeft.initial && delta.left <= metricsLeft.new) // scroll left
            ) {
                // ensure destination
                enableTop && (el.scrollTop = metricsTop.new);
                enableLeft && (el.scrollLeft = metricsLeft.new);
                if (coreUtils.isFunction(callback)) {
                    callback();
                }
                // release reference immediately.
                el = null; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                return;
            }
            // update scroll position
            enableTop && (el.scrollTop = delta.top);
            enableLeft && (el.scrollLeft = delta.left);
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Mixin base class which concentrated the manipulation methods.
     * @ja スクロールメソッドを集約した Mixin Base クラス
     */
    class DOMScroll {
        scrollTop(position, duration, easing, callback) {
            if (null == position) {
                // getter
                const el = queryTargetElement(this[0]);
                return el ? el.scrollTop : 0;
            }
            else {
                // setter
                return this.scrollTo({
                    top: position,
                    duration,
                    easing,
                    callback,
                });
            }
        }
        scrollLeft(position, duration, easing, callback) {
            if (null == position) {
                // getter
                const el = queryTargetElement(this[0]);
                return el ? el.scrollLeft : 0;
            }
            else {
                // setter
                return this.scrollTo({
                    left: position,
                    duration,
                    easing,
                    callback,
                });
            }
        }
        scrollTo(...args) {
            const options = parseArgs(...args);
            for (const el of this) {
                const elem = queryTargetElement(el);
                if (isNodeHTMLOrSVGElement(elem)) {
                    execScroll(elem, options);
                }
            }
            return this;
        }
    }
    coreUtils.setMixClassAttribute(DOMScroll, 'protoExtendsOnly');

    //__________________________________________________________________________________________________//
    /** @internal */ const _animContextMap = new WeakMap();
    //__________________________________________________________________________________________________//
    /**
     * @en Mixin base class which concentrated the animation/effect methods.
     * @ja アニメーション/エフェクト操作メソッドを集約した Mixin Base クラス
     */
    class DOMEffects {
        ///////////////////////////////////////////////////////////////////////
        // public: Effects
        /**
         * @en Start animation by `Web Animation API`.
         * @ja `Web Animation API` を用いてアニメーションを実行
         */
        animate(params, options) {
            const result = {
                dom: this,
                animations: new Map(),
            };
            if (!isTypeElement(this)) {
                result.finished = Promise.resolve(result);
                return result;
            }
            for (const el of this) {
                if (isNodeElement(el)) {
                    const anim = el.animate(params, options);
                    const context = _animContextMap.get(el) || new Set();
                    context.add(anim);
                    _animContextMap.set(el, context);
                    result.animations.set(el, anim);
                }
            }
            result.finished = Promise.all([...result.animations.values()].map(anim => anim.finished)).then(() => result);
            return result;
        }
        /**
         * @en Cancel current running animation.
         * @ja 現在実行しているアニメーションを中止
         */
        cancel() {
            if (isTypeElement(this)) {
                for (const el of this) {
                    const context = _animContextMap.get(el);
                    if (context) {
                        for (const animation of context) {
                            animation.cancel();
                        }
                        _animContextMap.delete(el);
                    }
                }
            }
            return this;
        }
        /**
         * @en Finish current running animation.
         * @ja 現在実行しているアニメーションを終了
         */
        finish() {
            if (isTypeElement(this)) {
                for (const el of this) {
                    const context = _animContextMap.get(el);
                    if (context) {
                        for (const animation of context) {
                            animation.finish();
                        }
                        // finish では破棄しない
                    }
                }
            }
            return this;
        }
    }
    coreUtils.setMixClassAttribute(DOMEffects, 'protoExtendsOnly');

    /**
     * @en This class provides DOM operations like `jQuery` library.
     * @ja `jQuery` のようなDOM 操作を提供
     *
     * UNSUPPORTED METHOD LIST
     *
     * [Traversing]
     *  .addBack()
     *  .end()
     *
     * [Effects]
     * .show()
     * .hide()
     * .toggle()
     * .stop()
     * .clearQueue()
     * .delay()
     * .dequeue()
     * .fadeIn()
     * .fadeOut()
     * .fadeTo()
     * .fadeToggle()
     * .queue()
     * .slideDown()
     * .slideToggle()
     * .slideUp()
     */
    class DOMClass extends coreUtils.mixins(DOMBase, DOMAttributes, DOMTraversing, DOMManipulation, DOMStyles, DOMEvents, DOMScroll, DOMEffects) {
        /**
         * private constructor
         *
         * @param elements
         *  - `en` operation targets `Element` array.
         *  - `ja` 操作対象の `Element` 配列
         */
        constructor(elements) {
            super(elements);
            // all source classes have no constructor.
        }
        /**
         * @en Create [[DOM]] instance from `selector` arg.
         * @ja 指定された `selector` [[DOM]] インスタンスを作成
         *
         * @internal
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
         *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
         * @param context
         *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
         *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
         * @returns [[DOM]] instance.
         */
        static create(selector, context) {
            if (selector && !context) {
                if (selector instanceof DOMClass) {
                    return selector;
                }
            }
            return new DOMClass((elementify(selector, context)));
        }
    }
    // mixin による `instanceof` は無効に設定
    coreUtils.setMixClassAttribute(DOMClass, 'instanceOf', null);

    // init for static
    setup(DOMClass.prototype, DOMClass.create);

    exports.default = dom;
    exports.dom = dom;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJhdHRyaWJ1dGVzLnRzIiwidHJhdmVyc2luZy50cyIsIm1hbmlwdWxhdGlvbi50cyIsInN0eWxlcy50cyIsImV2ZW50cy50cyIsInNjcm9sbC50cyIsImVmZmVjdHMudHMiLCJjbGFzcy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCglxuICogYHdpbmRvd2Ag44Kq44OW44K444Kn44Kv44OI44GoIGBkb2N1bWVudGAg44Kq44OW44K444Kn44Kv44OI562J44Gu5a2Y5Zyo44KS5L+d6Ki844GZ44KLXG4gKi9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCB3aW4gPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgZG9jID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgZXZ0ID0gc2FmZShnbG9iYWxUaGlzLkN1c3RvbUV2ZW50KTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luLnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHtcbiAgICB3aW4gYXMgd2luZG93LFxuICAgIGRvYyBhcyBkb2N1bWVudCxcbiAgICBldnQgYXMgQ3VzdG9tRXZlbnQsXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgTmlsLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NOYW1lLFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QmFzZSA9IE5vZGUgfCBXaW5kb3c7XG5leHBvcnQgdHlwZSBFbGVtZW50UmVzdWx0PFQ+ID0gVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IEhUTUxFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE5pbDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBUIHwgKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFRbXSA6IG5ldmVyKSB8IE5vZGVMaXN0T2Y8VCBleHRlbmRzIE5vZGUgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgUXVlcnlDb250ZXh0ID0gUGFyZW50Tm9kZSAmIFBhcnRpYWw8Tm9uRWxlbWVudFBhcmVudE5vZGU+O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgRWxlbWVudCBhcnJheSBmcm9tIHNlZWQgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBTZWVkIOOBi+OCiSBFbGVtZW50IOmFjeWIl+OCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUgb3IgV2luZG93IG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXSB7XG4gICAgaWYgKCFzZWVkKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb250ZXh0ID0gY29udGV4dCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG5cbiAgICB0cnkge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBodG1sID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHRtbC5pbmNsdWRlcygnPCcpICYmIGh0bWwuaW5jbHVkZXMoJz4nKSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcmt1cFxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQpICYmICgnIycgPT09IHNlbGVjdG9yWzBdKSAmJiAhL1sgLjw+On5dLy5leGVjKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXJlIElEIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvci5zdWJzdHJpbmcoMSkpO1xuICAgICAgICAgICAgICAgICAgICBlbCAmJiBlbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdib2R5JyA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYm9keVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIHNlbGVjdG9yc1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmNvbnRleHQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgoc2VlZCBhcyBOb2RlKS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWQgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmIChzZWVkWzBdLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZFswXSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBGb3IgZWFzaW5nIGBzd2luZ2AgdGltaW5nLWZ1bmN0aW9uLlxuICogQGphIGVhc2luZyBgc3dpbmdgIOeUqOOCv+OCpOODn+ODs+OCsOmWouaVsFxuICpcbiAqIEByZWZlcmVuY2VcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkyNDUwMzAvbG9va2luZy1mb3ItYS1zd2luZy1saWtlLWVhc2luZy1leHByZXNzaWJsZS1ib3RoLXdpdGgtanF1ZXJ5LWFuZC1jc3MzXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81MjA3MzAxL2pxdWVyeS1lYXNpbmctZnVuY3Rpb25zLXdpdGhvdXQtdXNpbmctYS1wbHVnaW5cbiAqXG4gKiBAcGFyYW0gcHJvZ3Jlc3MgWzAgLSAxXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpbmcocHJvZ3Jlc3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNSAtIChNYXRoLmNvcyhwcm9ncmVzcyAqIE1hdGguUEkpIC8gMik7XG59XG5cbi8qKlxuICogQGVuIFtbZXZhbHVhdGVdXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tldmFsdWF0ZV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZhbE9wdGlvbnMge1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgc3JjPzogc3RyaW5nO1xuICAgIG5vbmNlPzogc3RyaW5nO1xuICAgIG5vTW9kdWxlPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyaXB0c0F0dHJzOiAoa2V5b2YgRXZhbE9wdGlvbnMpW10gPSBbXG4gICAgJ3R5cGUnLFxuICAgICdzcmMnLFxuICAgICdub25jZScsXG4gICAgJ25vTW9kdWxlJyxcbl07XG5cbi8qKlxuICogQGVuIFRoZSBgZXZhbGAgZnVuY3Rpb24gYnkgd2hpY2ggc2NyaXB0IGBub25jZWAgYXR0cmlidXRlIGNvbnNpZGVyZWQgdW5kZXIgdGhlIENTUCBjb25kaXRpb24uXG4gKiBAamEgQ1NQIOeSsOWig+OBq+OBiuOBhOOBpuOCueOCr+ODquODl+ODiCBgbm9uY2VgIOWxnuaAp+OCkuiAg+aFruOBl+OBnyBgZXZhbGAg5a6f6KGM6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnkge1xuICAgIGNvbnN0IGRvYzogRG9jdW1lbnQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQudGV4dCA9IGBDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSA9ICgoKSA9PiB7IHJldHVybiAke2NvZGV9OyB9KSgpO2A7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgX3NjcmlwdHNBdHRycykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gb3B0aW9uc1thdHRyXSB8fCAoKG9wdGlvbnMgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlICYmIChvcHRpb25zIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyKSk7XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIHRyeSB7XG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZSgnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnKTtcbiAgICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KS5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChzY3JpcHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgcmV0dmFsID0gZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAqL1xuXG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgZWxlbWVudGlmeSxcbiAgICBldmFsdWF0ZSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01QbHVnaW4sXG4gICAgRE9NQ2xhc3MsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbn0gZnJvbSAnLi9jbGFzcyc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGRvbSB7XG4gICAgbGV0IGZuOiBET01DbGFzcztcbn1cblxuZXhwb3J0IHR5cGUgRE9NRmFjdG9yeSA9IDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCkgPT4gRE9NUmVzdWx0PFQ+O1xuXG4vKiogQGludGVybmFsICovIGxldCBfZmFjdG9yeSE6IERPTUZhY3Rvcnk7XG5cbi8qKlxuICogQGVuIENyZWF0ZSBbW0RPTV1dIGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIGNvbnRleHRcbiAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlLlxuICovXG5mdW5jdGlvbiBkb208VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBET01SZXN1bHQ8VD4ge1xuICAgIHJldHVybiBfZmFjdG9yeShzZWxlY3RvciwgY29udGV4dCk7XG59XG5cbmRvbS51dGlscyA9IHtcbiAgICBlbGVtZW50aWZ5LFxuICAgIGV2YWx1YXRlLFxufTtcblxuLyoqIEBpbnRlcm5hbCDlvqrnkrDlj4Lnhaflm57pgb/jga7jgZ/jgoHjga7pgYXlu7bjgrPjg7Pjgrnjg4jjg6njgq/jgrfjg6fjg7Pjg6Hjgr3jg4Pjg4kgKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cChmbjogRE9NQ2xhc3MsIGZhY3Rvcnk6IERPTUZhY3RvcnkpOiB2b2lkIHtcbiAgICBfZmFjdG9yeSA9IGZhY3Rvcnk7XG4gICAgZG9tLmZuID0gZm47XG59XG5cbmV4cG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tLFxufTtcbiIsImltcG9ydCB7IE5pbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3csIGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZS1pdGVyYWJsZS1pdGVyYXRvcicpO1xuXG4vKipcbiAqIEBlbiBCYXNlIGFic3RyYWN0aW9uIGNsYXNzIG9mIFtbRE9NQ2xhc3NdXS4gVGhpcyBjbGFzcyBwcm92aWRlcyBpdGVyYXRvciBtZXRob2RzLlxuICogQGphIFtbRE9NQ2xhc3NdXSDjga7ln7rlupXmir3osaHjgq/jg6njgrkuIGl0ZXJhdG9yIOOCkuaPkOS+my5cbiAqL1xuZXhwb3J0IGNsYXNzIERPTUJhc2U8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIEFycmF5TGlrZTxUPiwgSXRlcmFibGU8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBudW1iZXIgb2YgYEVsZW1lbnRgXG4gICAgICogQGphIOWGheWMheOBmeOCiyBgRWxlbWVudGAg5pWwXG4gICAgICovXG4gICAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYEVsZW1lbnRgIGFjY2Vzc29yXG4gICAgICogQGphIGBFbGVtZW50YCDjgbjjga7mt7vjgYjlrZfjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVDtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBUW10pIHtcbiAgICAgICAgY29uc3Qgc2VsZjogRE9NQWNjZXNzPFQ+ID0gdGhpcztcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsZW1dIG9mIGVsZW1lbnRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgc2VsZltpbmRleF0gPSBlbGVtO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZWxlbWVudHMubGVuZ3RoO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2YgW1tFbGVtZW50QmFzZV1dIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOagvOe0jeOBl+OBpuOBhOOCiyBbW0VsZW1lbnRCYXNlXV0g44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VD4ge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxUPiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRlciA8IHRoaXMuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYmFzZVt0aGlzLnBvaW50ZXIrK10sXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yIGFzIEl0ZXJhdG9yPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSwgdmFsdWUoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpbmRleCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlcikgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihjdXJyZW50LCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQmFzZSBpbnRlcmZhY2UgZm9yIERPTSBNaXhpbiBjbGFzcy5cbiAqIEBqYSBET00gTWl4aW4g44Kv44Op44K544Gu5pei5a6a44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NSXRlcmFibGU8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+IGV4dGVuZHMgUGFydGlhbDxET01CYXNlPFQ+PiB7XG4gICAgbGVuZ3RoOiBudW1iZXI7XG4gICAgW246IG51bWJlcl06IFQ7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFQ+O1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbCBET00gYWNjZXNzXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgIGNvbnN0IGRvbTogRE9NQWNjZXNzPFRFbGVtZW50PiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NQWNjZXNzPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NPFQ+PiB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlXG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYE5vZGVgLlxuICogQGphIOWvvuixoeOBjCBgTm9kZWAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGUoZWw6IHVua25vd24pOiBlbCBpcyBOb2RlIHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUpLm5vZGVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEVsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlKGVsKSAmJiAoTm9kZS5FTEVNRU5UX05PREUgPT09IGVsLm5vZGVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBIVE1MRWxlbWVudGAgb3IgYFNWR0VsZW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgSFRNTEVsZW1lbnRgIOOBvuOBn+OBryBgU1ZHRWxlbWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IGVsIGlzIEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRWxlbWVudGAgb3IgYERvY3VtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEVsZW1lbnRgIOOBvuOBn+OBryBgRG9jdW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlUXVlcmlhYmxlKGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IGVsIGlzIEVsZW1lbnQgfCBEb2N1bWVudCB7XG4gICAgcmV0dXJuICEhKGVsICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLnF1ZXJ5U2VsZWN0b3IpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYERvY3VtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZURvY3VtZW50KGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IGVsIGlzIERvY3VtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlKGVsKSAmJiAoTm9kZS5ET0NVTUVOVF9OT0RFID09PSBlbC5ub2RlVHlwZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgRWxlbWVudGAuXG4gKiBAamEgW1tET01dXSDjgYwgYEVsZW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUVsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RWxlbWVudD4ge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGRvbVswXSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIFtbRE9NXV0gdGFyZ2V0IGlzIGBIVE1MRWxlbWVudGAgb3IgYFNWR0VsZW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBIVE1MRWxlbWVudGAg44G+44Gf44GvIGBTVkdFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVIVE1MT3JTVkdFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudD4ge1xuICAgIHJldHVybiBpc05vZGVIVE1MT3JTVkdFbGVtZW50KGRvbVswXSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIFtbRE9NXV0gdGFyZ2V0IGlzIGBEb2N1bWVudGAuXG4gKiBAamEgW1tET01dXSDjgYwgYERvY3VtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVEb2N1bWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxEb2N1bWVudD4ge1xuICAgIHJldHVybiBkb2N1bWVudCA9PT0gZG9tWzBdO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgV2luZG93YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgV2luZG93YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVXaW5kb3coZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8V2luZG93PiB7XG4gICAgcmV0dXJuIHdpbmRvdyA9PT0gZG9tWzBdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTmlsLlxuICogQGphIE5pbCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5pbD4ge1xuICAgIHJldHVybiAhc2VsZWN0b3I7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgc3RyaW5nPiB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2Ygc2VsZWN0b3I7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE5vZGUuXG4gKiBAamEgTm9kZSDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTm9kZT4ge1xuICAgIHJldHVybiBudWxsICE9IChzZWxlY3RvciBhcyBOb2RlKS5ub2RlVHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgRWxlbWVudC5cbiAqIEBqYSBFbGVtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VsZW1lbnRTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBFbGVtZW50PiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRWxlbWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgRG9jdW1lbnQuXG4gKiBAamEgRG9jdW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRG9jdW1lbnRTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBEb2N1bWVudD4ge1xuICAgIHJldHVybiBkb2N1bWVudCA9PT0gc2VsZWN0b3IgYXMgTm9kZSBhcyBEb2N1bWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgV2luZG93LlxuICogQGphIFdpbmRvdyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBXaW5kb3c+IHtcbiAgICByZXR1cm4gd2luZG93ID09PSBzZWxlY3RvciBhcyBXaW5kb3c7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciBpcyBhYmxlIHRvIGl0ZXJhdGUuXG4gKiBAamEg6LWw5p+75Y+v6IO944Gq44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlTGlzdE9mPE5vZGU+PiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIFRbXSkubGVuZ3RoO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBbW0RPTV1dLlxuICogQGphIFtbRE9NXV0g44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE9NU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRE9NPiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQmFzZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIG5vZGUgbmFtZSBpcyBhcmd1bWVudC5cbiAqIEBqYSBOb2RlIOWQjeOBjOW8leaVsOOBp+S4juOBiOOBn+WQjeWJjeOBqOS4gOiHtOOBmeOCi+OBi+WIpOWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9kZU5hbWUoZWxlbTogTm9kZSB8IG51bGwsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIShlbGVtICYmIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmFtZS50b0xvd2VyQ2FzZSgpKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IG5vZGUgb2Zmc2V0IHBhcmVudC4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNldCBwYXJlbnQg44Gu5Y+W5b6XLiBTVkdFbGVtZW50IOOBq+OCgumBqeeUqOWPr+iDvVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KG5vZGU6IE5vZGUpOiBFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKChub2RlIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRQYXJlbnQpIHtcbiAgICAgICAgcmV0dXJuIChub2RlIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRQYXJlbnQ7XG4gICAgfSBlbHNlIGlmIChub2RlTmFtZShub2RlLCAnc3ZnJykpIHtcbiAgICAgICAgY29uc3QgJHN2ZyA9ICQobm9kZSk7XG4gICAgICAgIGNvbnN0IGNzc1Byb3BzID0gJHN2Zy5jc3MoWydkaXNwbGF5JywgJ3Bvc2l0aW9uJ10pO1xuICAgICAgICBpZiAoJ25vbmUnID09PSBjc3NQcm9wcy5kaXNwbGF5IHx8ICdmaXhlZCcgPT09IGNzc1Byb3BzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnQgPSAkc3ZnWzBdLnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkaXNwbGF5LCBwb3NpdGlvbiB9ID0gJChwYXJlbnQpLmNzcyhbJ2Rpc3BsYXknLCAncG9zaXRpb24nXSk7XG4gICAgICAgICAgICAgICAgaWYgKCdub25lJyA9PT0gZGlzcGxheSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFwb3NpdGlvbiB8fCAnc3RhdGljJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgY2FtZWxpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NVmFsdWVUeXBlPFQsIEsgPSAndmFsdWUnPiA9IFQgZXh0ZW5kcyBIVE1MU2VsZWN0RWxlbWVudCA/IChzdHJpbmcgfCBzdHJpbmdbXSkgOiBLIGV4dGVuZHMga2V5b2YgVCA/IFRbS10gOiB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBET01EYXRhID0gUGxhaW5PYmplY3Q8VHlwZWREYXRhPjtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTFNlbGVjdEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAnc2VsZWN0JyA9PT0gZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAmJiAoZWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLm11bHRpcGxlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc0lucHV0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MSW5wdXRFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhdHRyaWJ1dGVzIG1ldGhvZHMuXG4gKiBAamEg5bGe5oCn5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01BdHRyaWJ1dGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ2xhc3Nlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBjc3MgY2xhc3MgdG8gZWxlbWVudHMuXG4gICAgICogQGphIGNzcyBjbGFzcyDopoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgYW55IG9mIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGFyZSBhc3NpZ25lZCB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCr+ODqeOCueWQjeOCkuWwkeOBquOBj+OBqOOCguimgee0oOOBjOaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZVxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCNXG4gICAgICovXG4gICAgcHVibGljIGhhc0NsYXNzKGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpICYmIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgb3IgcmVtb3ZlIG9uZSBvciBtb3JlIGNsYXNzZXMgZnJvbSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIGRlcGVuZGluZyBvbiBlaXRoZXIgdGhlIGNsYXNzJ3MgcHJlc2VuY2Ugb3IgdGhlIHZhbHVlIG9mIHRoZSBzdGF0ZSBhcmd1bWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu54q25oWL44Gr5b+c44GY44GmLCDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLopoHntKDjgavov73liqAv5YmK6Zmk44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGZvcmNlXG4gICAgICogIC0gYGVuYCBpZiB0aGlzIGFyZ3VtZW50IGV4aXN0cywgdHJ1ZTogdGhlIGNsYXNzZXMgc2hvdWxkIGJlIGFkZGVkIC8gZmFsc2U6IHJlbW92ZWQuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgYzlrZjlnKjjgZnjgovloLTlkIgsIHRydWU6IOOCr+ODqeOCueOCkui/veWKoCAvIGZhbHNlOiDjgq/jg6njgrnjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9nZ2xlQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZm9yY2U/OiBib29sZWFuKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGNvbnN0IG9wZXJhdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBmb3JjZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY2xhc3Nlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QudG9nZ2xlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpID0+IGVsZW0uY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBQcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHByb3BlcnR5IHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQpOiBURWxlbWVudFtUXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIHByb3BlcnR5IHZhbHVlIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuWNmOS4gOODl+ODreODkeODhuOCo+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSB2YWx1ZVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL44OX44Ot44OR44OG44Kj5YCkXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQsIHZhbHVlOiBURWxlbWVudFtUXSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIHByb3BlcnR5IHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgcHJvcGVydHktdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3AocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KGtleTogVCB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IFRFbGVtZW50W1RdKTogVEVsZW1lbnRbVF0gfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgcHJvcGVydHlcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBmaXJzdCAmJiBmaXJzdFtrZXkgYXMgc3RyaW5nXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlXG4gICAgICAgICAgICAgICAgICAgIGVsW2tleSBhcyBzdHJpbmddID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxbbmFtZV0gPSBrZXlbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhdHRyaWJ1dGUgdmFsdWUuIDxicj5cbiAgICAgKiAgICAgVGhlIG1ldGhvZCBnZXRzIHRoZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDlsZ7mgKflgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIGF0dHJpYnV0ZSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSB2YWx1ZS4gaWYgYG51bGxgIHNldCwgcmVtb3ZlIGF0dHJpYnV0ZS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WxnuaAp+WApC4gYG51bGxgIOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiOWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbXVsdGkgYXR0cmlidXRlIHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgYXR0cmlidXRlLXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIGF0dHJpYnV0ZS12YWx1ZSDjg5rjgqLjgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgYXR0cihrZXk6IHN0cmluZyB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQgPT09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmICh1bmRlZmluZWQgPT09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKGtleSk7XG4gICAgICAgICAgICByZXR1cm4gKG51bGwgIT0gYXR0cikgPyBhdHRyIDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYXR0cmlidXRlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVBdHRyKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IGF0dHJpYnV0ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXkgYXMgc3RyaW5nLCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGtleVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgU3RyaW5nKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgYXR0cmlidXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/lsZ7mgKfjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGUgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgb7jgZ/jga/lsZ7mgKflkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlQXR0cihuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF0dHJzID0gaXNBcnJheShuYW1lKSA/IG5hbWUgOiBbbmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBWYWx1ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSB2YWx1ZSDlgKTjga7lj5blvpcuIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4oKTogRE9NVmFsdWVUeXBlPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgdmFsdWUgb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgaYgdmFsdWUg5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU6IERPTVZhbHVlVHlwZTxUPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZT86IERPTVZhbHVlVHlwZTxUPik6IGFueSB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLnNlbGVjdGVkT3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMucHVzaChvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgndmFsdWUnIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbCBhcyBhbnkpLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBubyBzdXBwb3J0IHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSAodmFsdWUgYXMgc3RyaW5nW10pLmluY2x1ZGVzKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW5wdXRFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBEYXRhXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZXMgYWxsIGBET01TdHJpbmdNYXBgIHN0b3JlIHNldCBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIEhUTUw1IGRhdGEtKiDlsZ7mgKfjgacgYERPTVN0cmluZ01hcGAg44Gr5qC857SN44GV44KM44Gf5YWo44OH44O844K/5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGRhdGEoKTogRE9NRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlIGF0IHRoZSBuYW1lZCBkYXRhIHN0b3JlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbiwgYXMgc2V0IGJ5IGRhdGEoa2V5LCB2YWx1ZSkgb3IgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIGtleSDjgafmjIflrprjgZfjgZ8gSFRNTDUgZGF0YS0qIOWxnuaAp+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvcmUgYXJiaXRyYXJ5IGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabku7vmhI/jga7jg4fjg7zjgr/jgpLmoLzntI1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgZGF0YSB2YWx1ZSAobm90IG9ubHkgYHN0cmluZ2ApXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmjIflrpogKOaWh+Wtl+WIl+S7peWkluOCguWPl+S7mOWPrylcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZywgdmFsdWU6IFR5cGVkRGF0YSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGF0YShrZXk/OiBzdHJpbmcsIHZhbHVlPzogVHlwZWREYXRhKTogRE9NRGF0YSB8IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBzdXBwb3J0ZWQgZGF0YXNldCBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgZGF0YXNldFxuICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IHRoaXNbMF0uZGF0YXNldDtcbiAgICAgICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBhbGwgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGE6IERPTURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoZGF0YXNldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtwcm9wXSA9IHRvVHlwZWREYXRhKGRhdGFzZXRbcHJvcF0pIGFzIFR5cGVkRGF0YTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHR5cGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvVHlwZWREYXRhKGRhdGFzZXRbY2FtZWxpemUoa2V5KV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBjb25zdCBwcm9wID0gY2FtZWxpemUoa2V5IHx8ICcnKTtcbiAgICAgICAgICAgIGlmIChwcm9wKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuZGF0YXNldFtwcm9wXSA9IGZyb21UeXBlZERhdGEodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBkYXRhLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/jg4fjg7zjgr/jgpLjg4fjg7zjgr/poJjln5/jgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVEYXRhKGtleTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkoa2V5KSA/IGtleS5tYXAoayA9PiBjYW1lbGl6ZShrKSkgOiBbY2FtZWxpemUoa2V5KV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkYXRhc2V0IH0gPSBlbDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFzZXRbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQXR0cmlidXRlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93LCBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01CYXNlLFxuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZVF1ZXJpYWJsZSxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBpc0VtcHR5U2VsZWN0b3IsXG4gICAgaXNTdHJpbmdTZWxlY3RvcixcbiAgICBpc0RvY3VtZW50U2VsZWN0b3IsXG4gICAgaXNXaW5kb3dTZWxlY3RvcixcbiAgICBpc05vZGVTZWxlY3RvcixcbiAgICBpc0l0ZXJhYmxlU2VsZWN0b3IsXG4gICAgbm9kZU5hbWUsXG4gICAgZ2V0T2Zmc2V0UGFyZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01Nb2RpZmljYXRpb25DYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gVTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpcygpYCBhbmQgYGZpbHRlcigpYCAqL1xuZnVuY3Rpb24gd2lubm93PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFU+LFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxVPixcbiAgICB2YWxpZENhbGxiYWNrOiAoZWw6IFUpID0+IHVua25vd24sXG4gICAgaW52YWxpZENhbGxiYWNrPzogKCkgPT4gdW5rbm93bixcbik6IGFueSB7XG4gICAgaW52YWxpZENhbGxiYWNrID0gaW52YWxpZENhbGxiYWNrIHx8IG5vb3A7XG5cbiAgICBsZXQgcmV0dmFsOiB1bmtub3duO1xuICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgZG9tLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3Rvci5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkubWF0Y2hlcyAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1dpbmRvd1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHdpbmRvdyA9PT0gZWwgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50ID09PSBlbCBhcyBOb2RlIGFzIERvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAsIGBwYXJlbnRzKClgIGFuZCBgc2libGluZ3MoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNoaWxkcmVuKClgLCBgcGFyZW50KClgLCBgbmV4dCgpYCBhbmQgYHByZXYoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUmV0cmlldmVOb2RlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5vZGU6IE5vZGUgfCBudWxsLCBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQpOiBub2RlIGlzIE5vZGUge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKCQobm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgbmV4dFVudGlsKClgIGFuZCBgcHJldlVudGlsKCkgKi9cbmZ1bmN0aW9uIHJldHJpZXZlU2libGluZ3M8XG4gICAgRSBleHRlbmRzIEVsZW1lbnRCYXNlLFxuICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4+KFxuICAgIHNpYmxpbmc6ICdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJyB8ICduZXh0RWxlbWVudFNpYmxpbmcnLFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxFPixcbiAgICBzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPlxuKTogRE9NPFQ+IHtcbiAgICBpZiAoIWlzVHlwZUVsZW1lbnQoZG9tKSkge1xuICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZG9tIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgIGxldCBlbGVtID0gZWxbc2libGluZ107XG4gICAgICAgIHdoaWxlIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtID0gZWxlbVtzaWJsaW5nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSB0cmF2ZXJzaW5nIG1ldGhvZHMuXG4gKiBAamEg44OI44Op44OQ44O844K544Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01UcmF2ZXJzaW5nPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWxlbWVudCBNZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgb25lIG9mIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgabphY3kuIvjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVEVsZW1lbnQgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoKTogVEVsZW1lbnRbXTtcblxuICAgIHB1YmxpYyBnZXQoaW5kZXg/OiBudW1iZXIpOiBURWxlbWVudFtdIHwgVEVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCAhPSBpbmRleCkge1xuICAgICAgICAgICAgaW5kZXggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCA8IDAgPyB0aGlzW2luZGV4ICsgdGhpcy5sZW5ndGhdIDogdGhpc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0FycmF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgYWxsIHRoZSBlbGVtZW50cyBjb250YWluZWQgaW4gdGhlIFtbRE9NXV0gc2V0LCBhcyBhbiBhcnJheS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHRvQXJyYXkoKTogVEVsZW1lbnRbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpc107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aGluIHRoZSBbW0RPTV1dIGNvbGxlY3Rpb24gcmVsYXRpdmUgdG8gaXRzIHNpYmxpbmcgZWxlbWVudHMuXG4gICAgICogQGphIFtbRE9NXV0g5YaF44Gu5pyA5Yid44Gu6KaB57Sg44GM5YWE5byf6KaB57Sg44Gu5L2V55Wq55uu44Gr5omA5bGe44GZ44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWFyY2ggZm9yIGEgZ2l2ZW4gYSBzZWxlY3RvciwgZWxlbWVudCwgb3IgW1tET01dXSBpbnN0YW5jZSBmcm9tIGFtb25nIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDphY3kuIvjga7kvZXnlarnm67jgavmiYDlsZ7jgZfjgabjgYTjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcjogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yPzogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICBsZXQgY2hpbGQ6IE5vZGUgfCBudWxsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHdoaWxlIChudWxsICE9PSAoY2hpbGQgPSBjaGlsZC5wcmV2aW91c1NpYmxpbmcpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBjaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWxlbTogVCB8IEVsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlID8gc2VsZWN0b3JbMF0gOiBzZWxlY3RvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGkgPSBbLi4udGhpc10uaW5kZXhPZihlbGVtIGFzIFRFbGVtZW50ICYgRWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gMCA8PSBpID8gaSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVHJhdmVyc2luZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGZpcnN0IGluIHRoZSBzZXQgYXMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyA5Yid44Gu6KaB57Sg44KSIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJCh0aGlzWzBdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaW5hbCBvbmUgaW4gdGhlIHNldCBhcyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovmnKvlsL7jga7opoHntKDjgpIgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1t0aGlzLmxlbmd0aCAtIDFdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgW1tET01dXSBpbnN0YW5jZSB3aXRoIGVsZW1lbnRzIGFkZGVkIHRvIHRoZSBzZXQgZnJvbSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAg44Gn5Y+W5b6X44GX44GfIGBFbGVtZW50YCDjgpLov73liqDjgZfjgZ/mlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0ICRhZGQgPSAkKHNlbGVjdG9yLCBjb250ZXh0KTtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBuZXcgU2V0KFsuLi50aGlzLCAuLi4kYWRkXSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtc10gYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgb2YgZWxlbWVudHMgYWdhaW5zdCBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3aW5ub3coc2VsZWN0b3IsIHRoaXMsICgpID0+IHRydWUsICgpID0+IGZhbHNlKSBhcyBib29sZWFuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRob3NlIHRoYXQgbWF0Y2ggdGhlIHNlbGVjdG9yIG9yIHBhc3MgdGhlIGZ1bmN0aW9uJ3MgdGVzdC5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgTmV3IFtbRE9NXV0gaW5zdGFuY2UgaW5jbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5YaF5YyF44GZ44KLIOaWsOimjyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRFbGVtZW50W10gPSBbXTtcbiAgICAgICAgd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoZWw6IFRFbGVtZW50KSA9PiB7IGVsZW1lbnRzLnB1c2goZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZWxlbWVudHMgZnJvbSB0aGUgc2V0IG9mIG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkuWJiumZpOOBl+OBpui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyBbW0RPTV1dIGluc3RhbmNlIGV4Y2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuS7peWkluOCkuWGheWMheOBmeOCiyDmlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgbm90PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gbmV3IFNldDxURWxlbWVudD4oWy4uLnRoaXNdKTtcbiAgICAgICAgd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoZWw6IFRFbGVtZW50KSA9PiB7IGVsZW1lbnRzLmRlbGV0ZShlbCk7IH0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbWVudHNdIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBkZXNjZW5kYW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBmeOCi+imgee0oOOCkuaknOe0olxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBmaW5kPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmICghaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0b3IgPSAkKHNlbGVjdG9yKSBhcyBET008Tm9kZT47XG4gICAgICAgICAgICByZXR1cm4gJHNlbGVjdG9yLmZpbHRlcigoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwgIT09IGVsZW0gJiYgZWwuY29udGFpbnMoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVtcyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmVsZW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRob3NlIHRoYXQgaGF2ZSBhIGRlc2NlbmRhbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GX44Gf5a2Q6KaB57Sg5oyB44Gk6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGhhczxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogTm9kZVtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChzZWxlY3RvciwgZWwgYXMgRWxlbWVudCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgICAgIHRhcmdldHMucHVzaCguLi4kdGFyZ2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmZpbHRlcigoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIG5ldyBTZXQodGFyZ2V0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW0gIT09IGVsICYmIGVsZW0uY29udGFpbnMoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUGFzcyBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgdGhyb3VnaCBhIGZ1bmN0aW9uLCBwcm9kdWNpbmcgYSBuZXcgW1tET01dXSBpbnN0YW5jZSBjb250YWluaW5nIHRoZSByZXR1cm4gdmFsdWVzLlxuICAgICAqIEBqYSDjgrPjg7zjg6vjg5Djg4Pjgq/jgaflpInmm7TjgZXjgozjgZ/opoHntKDjgpLnlKjjgYTjgabmlrDjgZ/jgasgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmp4vnr4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+WkieabtOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBtYXA8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihjYWxsYmFjazogRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VEVsZW1lbnQsIFQ+KTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRlIG92ZXIgYSBbW0RPTV1dIGluc3RhbmNlLCBleGVjdXRpbmcgYSBmdW5jdGlvbiBmb3IgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+mWouaVsOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgZWFjaChjYWxsYmFjazogRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBpZiAoZmFsc2UgPT09IGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byBhIHN1YnNldCBzcGVjaWZpZWQgYnkgYSByYW5nZSBvZiBpbmRpY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ/nr4Tlm7Ljga7opoHntKDjgpLlkKvjgoAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiZWdpblxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBiZWdpbiB0byBiZSBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OBrumWi+Wni+S9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqIEBwYXJhbSBlbmRcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgc3RvcCBiZWluZyBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OCkue1guOBiOOCi+ebtOWJjeOBruS9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBzbGljZShiZWdpbj86IG51bWJlciwgZW5kPzogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKFsuLi50aGlzXS5zbGljZShiZWdpbiwgZW5kKSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIG9uZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZfjgZ/opoHntKDjgpLlkKvjgoAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGVxKGluZGV4OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMuZ2V0KGluZGV4KSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3IgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yIGJ5IHRlc3RpbmcgdGhlIGVsZW1lbnQgaXRzZWxmIGFuZCB0cmF2ZXJzaW5nIHVwIHRocm91Z2ggaXRzIGFuY2VzdG9ycyBpbiB0aGUgRE9NIHRyZWUuXG4gICAgICogQGphIOmWi+Wni+imgee0oOOBi+OCieacgOOCgui/keOBhOimquimgee0oOOCkumBuOaKni4g44K744Os44Kv44K/44O85oyH5a6a44GX44Gf5aC05ZCILCDjg57jg4Pjg4HjgZnjgovmnIDjgoLov5HjgYTopqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9zZXN0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChudWxsID09IHNlbGVjdG9yIHx8ICFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgY2xvc2VzdHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYyA9IGVsLmNsb3Nlc3Qoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VzdHMuYWRkKGMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoWy4uLmNsb3Nlc3RzXSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzIGFzIHVua25vd24gYXMgRWxlbWVudCkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50cyhzZWxlY3RvcikuZXEoMCkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5ZCE6KaB57Sg44Gu5a2Q6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgYzmjIflrprjgZXjgozjgZ/loLTlkIjjga/jg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/ntZDmnpzjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGlsZHJlbjxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGNoaWxkLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLmFkZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNoaWxkcmVuXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IHBhcmVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruacgOWIneOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpICYmIHZhbGlkUmV0cmlldmVOb2RlKHBhcmVudE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLmFkZChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnBhcmVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudHNVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBhbmNlc3RvcnMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLCBET00gbm9kZSwgb3IgW1tET01dXSBpbnN0YW5jZVxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzVW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgbGV0IHBhcmVudHM6IE5vZGVbXSA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgbGV0IHBhcmVudE5vZGUgPSAoZWwgYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHdoaWxlICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KSH5pWw6KaB57Sg44GM5a++6LGh44Gr44Gq44KL44Go44GN44Gv5Y+N6LuiXG4gICAgICAgIGlmICgxIDwgdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcmVudHMgPSBbLi4ubmV3IFNldChwYXJlbnRzLnJldmVyc2UoKSldLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkKHBhcmVudHMpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbW1lZGlhdGVseSBmb2xsb3dpbmcgc2libGluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIElmIGEgc2VsZWN0b3IgaXMgcHJvdmlkZWQsIGl0IHJldHJpZXZlcyB0aGUgbmV4dCBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDopoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TlvozjgavjgYLjgZ/jgovlhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dFNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5uZXh0RWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ubmV4dFNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIGZvbGxvd2luZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruasoeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm5leHRVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7mrKHku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygnbmV4dEVsZW1lbnRTaWJsaW5nJywgdGhpcywgc2VsZWN0b3IsIGZpbHRlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgcHJlY2VkaW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIHByZXZpb3VzIHNpYmxpbmcgb25seSBpZiBpdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOOBruWQhOimgee0oOOBruebtOWJjeOBruWFhOW8n+imgee0oOOCkuaKveWHuiA8YnI+XG4gICAgICogICAgIOadoeS7tuW8j+OCkuaMh+WumuOBl+OAgee1kOaenOOCu+ODg+ODiOOBi+OCieabtOOBq+e1nui+vOOBv+OCkuihjOOBhuOBk+OBqOOCguWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXY8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2U2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ucHJldlNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIHByZWNlZGluZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruWJjeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7liY3ku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygncHJldmlvdXNFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3RvclxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/lkITopoHntKDjga7lhYTlvJ/opoHntKDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBzaWJsaW5nczxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaWJsaW5nIG9mICQocGFyZW50Tm9kZSkuY2hpbGRyZW4oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2libGluZyAhPT0gZWwgYXMgRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChzaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uc2libGluZ3NdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2hpbGRyZW4gb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHRleHQgYW5kIGNvbW1lbnQgbm9kZXMuXG4gICAgICogQGphIOODhuOCreOCueODiOOChEhUTUzjgrPjg6Hjg7Pjg4jjgpLlkKvjgoDlrZDopoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oKTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZShlbCwgJ2lmcmFtZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZCgoZWwgYXMgTm9kZSBhcyBIVE1MSUZyYW1lRWxlbWVudCkuY29udGVudERvY3VtZW50IGFzIE5vZGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZU5hbWUoZWwsICd0ZW1wbGF0ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZCgoZWwgYXMgTm9kZSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50KS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgZWwuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5jb250ZW50c10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjbG9zZXN0IGFuY2VzdG9yIGVsZW1lbnQgdGhhdCBpcyBwb3NpdGlvbmVkLlxuICAgICAqIEBqYSDopoHntKDjga7lhYjnpZbopoHntKDjgacsIOOCueOCv+OCpOODq+OBp+ODneOCuOOCt+ODp+ODs+aMh+Wumihwb3NpdGlpb27jgYxyZWxhdGl2ZSwgYWJzb2x1dGUsIGZpeGVk44Gu44GE44Ga44KM44GLKeOBleOCjOOBpuOBhOOCi+OCguOBruOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXRQYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oKTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQocm9vdEVsZW1lbnQpIGFzIERPTTxOb2RlPiBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0UGFyZW50KGVsIGFzIE5vZGUpIHx8IHJvb3RFbGVtZW50O1xuICAgICAgICAgICAgICAgIG9mZnNldHMuYWRkKG9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4ub2Zmc2V0c10pIGFzIERPTTxUPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NVHJhdmVyc2luZywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7IGlzU3RyaW5nLCBzZXRNaXhDbGFzc0F0dHJpYnV0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgSFRNTCBzdHJpbmcgKi9cbmZ1bmN0aW9uIGlzSFRNTFN0cmluZyhzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHN1YmplY3QgPSBzcmMudHJpbSgpO1xuICAgIHJldHVybiAoJzwnID09PSBzdWJqZWN0LnNsaWNlKDAsIDEpKSAmJiAoJz4nID09PSBzdWJqZWN0LnNsaWNlKC0xKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgYXBwZW5kKClgLCBgcHJlcGVuZCgpYCwgYGJlZm9yZSgpYCBhbmQgYGFmdGVyKClgICAqL1xuZnVuY3Rpb24gdG9Ob2RlU2V0PFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogU2V0PE5vZGUgfCBzdHJpbmc+IHtcbiAgICBjb25zdCBub2RlcyA9IG5ldyBTZXQ8Tm9kZSB8IHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRlbnQgb2YgY29udGVudHMpIHtcbiAgICAgICAgaWYgKChpc1N0cmluZyhjb250ZW50KSAmJiAhaXNIVE1MU3RyaW5nKGNvbnRlbnQpKSB8fCBpc05vZGUoY29udGVudCkpIHtcbiAgICAgICAgICAgIG5vZGVzLmFkZChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0ICRkb20gPSAkKGNvbnRlbnQgYXMgRE9NPEVsZW1lbnQ+KTtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiAkZG9tKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzU3RyaW5nKG5vZGUpIHx8IChpc05vZGUobm9kZSkgJiYgTm9kZS5ET0NVTUVOVF9OT0RFICE9PSBub2RlLm5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICBub2Rlcy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2Rlcztcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBiZWZvcmUoKWAgYW5kIGBhZnRlcigpYCAgKi9cbmZ1bmN0aW9uIHRvTm9kZShub2RlOiBOb2RlIHwgc3RyaW5nKTogTm9kZSB7XG4gICAgaWYgKGlzU3RyaW5nKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgZGV0YWNoKClgIGFuZCBgcmVtb3ZlKClgICovXG5mdW5jdGlvbiByZW1vdmVFbGVtZW50PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgdW5kZWZpbmVkLFxuICAgIGRvbTogRE9NSXRlcmFibGU8VT4sXG4gICAga2VlcExpc3RlbmVyOiBib29sZWFuXG4pOiB2b2lkIHtcbiAgICBjb25zdCAkZG9tOiBET008VT4gPSBudWxsICE9IHNlbGVjdG9yXG4gICAgICAgID8gKGRvbSBhcyBET008VT4pLmZpbHRlcihzZWxlY3RvcilcbiAgICAgICAgOiBkb20gYXMgRE9NPFU+O1xuXG4gICAgaWYgKCFrZWVwTGlzdGVuZXIpIHtcbiAgICAgICAgJGRvbS5vZmYoKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGVsIG9mICRkb20pIHtcbiAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBtYW5pcHVsYXRpb24gbWV0aG9kcy5cbiAqIEBqYSDjg57jg4vjg5Tjg6Xjg6zjg7zjgrfjg6fjg7Pjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTU1hbmlwdWxhdGlvbjxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgSW5zaWRlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBIVE1MIGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIEhUTUwg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGh0bWwoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgSFRNTCBjb250ZW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavmjIflrprjgZfjgZ8gSFRNTCDjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBodG1sU3RyaW5nXG4gICAgICogIC0gYGVuYCBBIHN0cmluZyBvZiBIVE1MIHRvIHNldCBhcyB0aGUgY29udGVudCBvZiBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOWGheOBq+aMv+WFpeOBmeOCiyBIVE1MIOaWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKGh0bWxTdHJpbmc6IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nPzogc3RyaW5nKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IGh0bWxTdHJpbmcpIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpID8gZWwuaW5uZXJIVE1MIDogJyc7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoaHRtbFN0cmluZykpIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLmlubmVySFRNTCA9IGh0bWxTdHJpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpbnZhbGlkIGFyZ1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIGFyZy4gaHRtbFN0cmluZyB0eXBlOiR7dHlwZW9mIGh0bWxTdHJpbmd9YCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHRleHQgY29udGVudHMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIGpRdWVyeSByZXR1cm5zIHRoZSBjb21iaW5lZCB0ZXh0IG9mIGVhY2ggZWxlbWVudCwgYnV0IHRoaXMgbWV0aG9kIG1ha2VzIG9ubHkgZmlyc3QgZWxlbWVudCdzIHRleHQuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBruODhuOCreOCueODiOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIGpRdWVyeSDjga/lkITopoHntKDjga7pgKPntZDjg4bjgq3jgrnjg4jjgpLov5TljbTjgZnjgovjgYzmnKzjg6Hjgr3jg4Pjg4njga/lhYjpoK3opoHntKDjga7jgb/jgpLlr77osaHjgajjgZnjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgdGV4dCgpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBjb250ZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIHNwZWNpZmllZCB0ZXh0LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavmjIflrprjgZfjgZ/jg4bjgq3jgrnjg4jjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZXh0XG4gICAgICogIC0gYGVuYCBUaGUgdGV4dCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgovjg4bjgq3jgrnjg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgdGV4dCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdGV4dCh2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiBzdHJpbmcgfCB0aGlzIHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZWwudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChudWxsICE9IHRleHQpID8gdGV4dC50cmltKCkgOiAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gaXNTdHJpbmcodmFsdWUpID8gdmFsdWUgOiBTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgdG8gdGhlIGVuZCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlvJXmlbDjgafmjIflrprjgZfjgZ/jgrPjg7Pjg4bjg7Pjg4TjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBhcHBlbmQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmFwcGVuZCguLi5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZW5kIG9mIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+imgee0oOOCkuS7luOBruimgee0oOOBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBhcHBlbmRUbzxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYXBwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgdG8gdGhlIGJlZ2lubmluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhYjpoK3jgavlvJXmlbDjgafmjIflrprjgZfjgZ/jgrPjg7Pjg4bjg7Pjg4TjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5wcmVwZW5kKC4uLm5vZGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL6KaB57Sg44KS5LuW44Gu6KaB57Sg44Gu5YWI6aCt44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHByZXBlbmRUbzxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkucHJlcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBPdXRzaWRlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCBiZWZvcmUgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YmN44Gr5oyH5a6a44GX44GfIEhUTUwg44KE6KaB57Sg44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYmVmb3JlPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRvTm9kZShub2RlKSwgZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGJlZm9yZSB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjga7liY3jgavmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5zZXJ0QmVmb3JlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5iZWZvcmUodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCBhZnRlciBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lvozjgo3jgavmjIflrprjgZfjgZ8gSFRNTCDjgoTopoHntKDjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBhZnRlcjxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5bLi4uY29udGVudHNdLnJldmVyc2UoKSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsLm5leHRTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBhZnRlciB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjga7lvozjgo3jgavmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5zZXJ0QWZ0ZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFmdGVyKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEFyb3VuZFxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIGFsbCBlbGVtZW50cyBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRG9jdW1lbnQodGhpcykgfHwgaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBOb2RlO1xuXG4gICAgICAgIC8vIFRoZSBlbGVtZW50cyB0byB3cmFwIHRoZSB0YXJnZXQgYXJvdW5kXG4gICAgICAgIGNvbnN0ICR3cmFwID0gJChzZWxlY3RvciwgZWwub3duZXJEb2N1bWVudCkuZXEoMCkuY2xvbmUodHJ1ZSkgYXMgRE9NPEVsZW1lbnQ+O1xuXG4gICAgICAgIGlmIChlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAkd3JhcC5pbnNlcnRCZWZvcmUoZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHdyYXAubWFwKChpbmRleDogbnVtYmVyLCBlbGVtOiBFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICB3aGlsZSAoZWxlbS5maXJzdEVsZW1lbnRDaGlsZCkge1xuICAgICAgICAgICAgICAgIGVsZW0gPSBlbGVtLmZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgICAgIH0pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50Pik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIHRoZSBjb250ZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGheWBtOOCkiwg5oyH5a6a44GX44Gf5Yil44Ko44Os44Oh44Oz44OI44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXBJbm5lcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgY29uc3QgY29udGVudHMgPSAkZWwuY29udGVudHMoKTtcbiAgICAgICAgICAgIGlmICgwIDwgY29udGVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29udGVudHMud3JhcEFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRlbC5hcHBlbmQoc2VsZWN0b3IgYXMgTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KSLCDmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgJGVsLndyYXBBbGwoc2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGUgcGFyZW50cyBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLCBsZWF2aW5nIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLlxuICAgICAqIEBqYSDopoHntKDjga7opqrjgqjjg6zjg6Hjg7Pjg4jjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyB1bndyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD47XG4gICAgICAgIHNlbGYucGFyZW50KHNlbGVjdG9yKS5ub3QoJ2JvZHknKS5lYWNoKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgJChlbGVtKS5yZXBsYWNlV2l0aChlbGVtLmNoaWxkTm9kZXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBSZW1vdmFsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGFsbCBjaGlsZCBub2RlcyBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDlhoXjga7lrZDopoHntKAo44OG44Kt44K544OI44KC5a++6LGhKeOCkuOBmeOBueOBpuWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBlbXB0eSgpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLiBUaGlzIG1ldGhvZCBrZWVwcyBldmVudCBsaXN0ZW5lciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg6KaB57Sg44KSIERPTSDjgYvjgonliYrpmaQuIOWJiumZpOW+jOOCguOCpOODmeODs+ODiOODquOCueODiuOBr+acieWKuVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBkZXRhY2g8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICByZW1vdmVFbGVtZW50KHNlbGVjdG9yLCB0aGlzLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDopoHntKDjgpIgRE9NIOOBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICByZW1vdmVFbGVtZW50KHNlbGVjdG9yLCB0aGlzLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVwbGFjZW1lbnRcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgd2l0aCB0aGUgcHJvdmlkZWQgbmV3IGNvbnRlbnQgYW5kIHJldHVybiB0aGUgc2V0IG9mIGVsZW1lbnRzIHRoYXQgd2FzIHJlbW92ZWQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBleOCjOOBn+WIpeOBruimgee0oOOChCBIVE1MIOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld0NvbnRlbnRcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlcGxhY2VXaXRoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5ld0NvbnRlbnQ/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBjb25zdCBlbGVtID0gKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRkb20gPSAkKG5ld0NvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKDEgPT09ICRkb20ubGVuZ3RoICYmIGlzTm9kZUVsZW1lbnQoJGRvbVswXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGRvbVswXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiAkZG9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLnJlcGxhY2VXaXRoKGVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgZWFjaCB0YXJnZXQgZWxlbWVudCB3aXRoIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil44Gu6KaB57Sg44Go5beu44GX5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlcGxhY2VBbGw8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnJlcGxhY2VXaXRoKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01NYW5pcHVsYXRpb24sICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzQXJyYXksXG4gICAgY2xhc3NpZnksXG4gICAgZGFzaGVyaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgKi9cbmZ1bmN0aW9uIGVuc3VyZUNoYWluQ2FzZVByb3Blcmllcyhwcm9wczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4pOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgcmV0dmFsID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gcHJvcHMpIHtcbiAgICAgICAgcmV0dmFsW2Rhc2hlcml6ZShrZXkpXSA9IHByb3BzW2tleV07XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0RGVmYXVsdFZpZXcoZWw6IEVsZW1lbnQpOiBXaW5kb3cge1xuICAgIHJldHVybiAoZWwub3duZXJEb2N1bWVudCAmJiBlbC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3KSB8fCB3aW5kb3c7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWw6IEVsZW1lbnQpOiBDU1NTdHlsZURlY2xhcmF0aW9uIHtcbiAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgIHJldHVybiB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgY3NzIHZhbHVlIHRvIG51bWJlciAqL1xuZnVuY3Rpb24gdG9OdW1iZXIodmFsOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbCkgfHwgMDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3Jlc29sdmVyID0ge1xuICAgIHdpZHRoOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICBoZWlnaHQ6IFsndG9wJywgJ2JvdHRvbSddLFxufTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRQYWRkaW5nKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzBdfWApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRCb3JkZXIoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVswXX0td2lkdGhgKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgYm9yZGVyLSR7X3Jlc29sdmVyW3R5cGVdWzFdfS13aWR0aGApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRNYXJnaW4oc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgbWFyZ2luLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB3aWR0aCgpYCBhbmQgYGhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLpmaTjgYTjgZ/luYUgKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnRbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgLy8gKHNjcm9sbFdpZHRoIC8gc2Nyb2xsSGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudEVsZW1lbnRbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemUgPSB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2JvcmRlci1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemUgLSAoZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2l6ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIHJldHVybiBkb20uY3NzKHR5cGUsIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogYCR7dmFsdWV9cHhgKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgaW5uZXJXaWR0aCgpYCBhbmQgYGlubmVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VJbm5lclNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgICAgIHJldHVybiBlbFtgY2xpZW50JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlIGFzIG51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCArIGdldEJvcmRlcihzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdCA9IHsgaW5jbHVkZU1hcmdpbjogYm9vbGVhbjsgdmFsdWU6IG51bWJlciB8IHN0cmluZzsgfTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzOiB1bmtub3duW10pOiBQYXJzZU91dGVyU2l6ZUFyZ3NSZXN1bHQge1xuICAgIGxldCBbdmFsdWUsIGluY2x1ZGVNYXJnaW5dID0gYXJncztcbiAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSAmJiAhaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIGluY2x1ZGVNYXJnaW4gPSAhIXZhbHVlO1xuICAgICAgICB2YWx1ZSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHsgaW5jbHVkZU1hcmdpbiwgdmFsdWUgfSBhcyBQYXJzZU91dGVyU2l6ZUFyZ3NSZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgb3V0ZXJXaWR0aCgpYCBhbmQgYG91dGVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VPdXRlclNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCBpbmNsdWRlTWFyZ2luOiBib29sZWFuLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSkge1xuICAgICAgICAgICAgLy8g44K544Kv44Ot44O844Or44OQ44O844KS5ZCr44KB44Gf5bmFIChpbm5lcldpZHRoIC8gaW5uZXJIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gZG9tWzBdW2Bpbm5lciR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IoZG9tIGFzIERPTVN0eWxlczxUPiwgdHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIC8vIChvZmZzZXRXaWR0aCAvIG9mZnNldEhlaWdodClcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBnZXRPZmZzZXRTaXplKGVsLCB0eXBlKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZU1hcmdpbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldCArIGdldE1hcmdpbihzdHlsZSwgdHlwZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgIC8vIHNldHRlciAobm8gcmVhY3Rpb24pXG4gICAgICAgIHJldHVybiBkb207XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIGNvbnN0IGlzVGV4dFByb3AgPSBpc1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgZG9tKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlLCBuZXdWYWwgfSA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RleHRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCB2YWx1ZSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXJnaW4gPSBpbmNsdWRlTWFyZ2luID8gZ2V0TWFyZ2luKHN0eWxlLCB0eXBlKSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IChpc1RleHRQcm9wID8gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSkgOiB2YWx1ZSBhcyBudW1iZXIpIC0gbWFyZ2luO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdHlsZSwgbmV3VmFsIH07XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCAtIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbH1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwb3NpdGlvbigpYCBhbmQgYG9mZnNldCgpYCAqL1xuZnVuY3Rpb24gZ2V0T2Zmc2V0UG9zaXRpb24oZWw6IEVsZW1lbnQpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0ge1xuICAgIC8vIGZvciBkaXNwbGF5IG5vbmVcbiAgICBpZiAoZWwuZ2V0Q2xpZW50UmVjdHMoKS5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0b3A6IHJlY3QudG9wICsgdmlldy5wYWdlWU9mZnNldCxcbiAgICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgdmlldy5wYWdlWE9mZnNldFxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBvZmZzZXRbV2lkdGggfCBIZWlnaHRdLiBUaGlzIGZ1bmN0aW9uIHdpbGwgd29yayBTVkdFbGVtZW50LCB0b28uXG4gKiBAamEgb2Zmc2VbV2lkdGggfCBIZWlnaHRdIOOBruWPluW+ly4gU1ZHRWxlbWVudCDjgavjgoLpgannlKjlj6/og71cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE9mZnNldFNpemUoZWw6IEhUTUxPclNWR0VsZW1lbnQsIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgaWYgKG51bGwgIT0gKGVsIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRXaWR0aCkge1xuICAgICAgICAvLyAob2Zmc2V0V2lkdGggLyBvZmZzZXRIZWlnaHQpXG4gICAgICAgIHJldHVybiBlbFtgb2Zmc2V0JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvKlxuICAgICAgICAgKiBbTk9URV0gU1ZHRWxlbWVudCDjga8gb2Zmc2V0V2lkdGgg44GM44K144Od44O844OI44GV44KM44Gq44GEXG4gICAgICAgICAqICAgICAgICBnZXRCb3VuZGluZ0NsaWVudFJlY3QoKSDjga8gdHJhbnNmb3JtIOOBq+W9semfv+OCkuWPl+OBkeOCi+OBn+OCgSxcbiAgICAgICAgICogICAgICAgIOWumue+qemAmuOCiiBib3JkZXIsIHBhZGRpbiDjgpLlkKvjgoHjgZ/lgKTjgpLnrpflh7rjgZnjgotcbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwgYXMgU1ZHRWxlbWVudCk7XG4gICAgICAgIGNvbnN0IHNpemUgPSB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKTtcbiAgICAgICAgaWYgKCdjb250ZW50LWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNpemUgKyBnZXRCb3JkZXIoc3R5bGUsIHR5cGUpICsgZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBzdHlsZSBtYW5hZ2VtZW50IG1ldGhvZHMuXG4gKiBAamEg44K544K/44Kk44Or6Zai6YCj44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TdHlsZXM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTdHlsZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgdmFsdWUgc3RyaW5nLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WApOOCkuaWh+Wtl+WIl+OBp+i/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbXVsdGlwbGUgY29tcHV0ZWQgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gQ1NTIOOBq+ioreWumuOBleOCjOOBpuOBhOOCi+ODl+ODreODkeODhuOCo+WApOOCkuikh+aVsOWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVzXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcnJheSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjemFjeWIl+OCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHktdmFsdWUgb2JqZWN0LlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+OCkuagvOe0jeOBl+OBn+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZXM6IHN0cmluZ1tdKTogUGxhaW5PYmplY3Q8c3RyaW5nPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgQ1NTIHByb3BlcnRpeSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBzdHJpbmcgdmFsdWUgdG8gc2V0IGZvciB0aGUgcHJvcGVydHkuIGlmIG51bGwgcGFzc2VkLCByZW1vdmUgcHJvcGVydHkuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmloflrZfliJfjgafmjIflrpouIG51bGwg5oyH5a6a44Gn5YmK6ZmkLlxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG9uZSBvciBtb3JlIENTUyBwcm9wZXJ0aWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOBriBDU1Mg6KSH5pWw44Gu44OX44Ot44OR44OG44Kj44Gr5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+KTogdGhpcztcblxuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nIHwgc3RyaW5nW10gfCBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPiwgdmFsdWU/OiBzdHJpbmcgfCBudWxsKTogc3RyaW5nIHwgUGxhaW5PYmplY3Q8c3RyaW5nPiB8IHRoaXMge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gJycgOiB0aGlzO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9IGFzIFBsYWluT2JqZWN0PHN0cmluZz47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgRWxlbWVudDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpLmdldFByb3BlcnR5VmFsdWUoZGFzaGVyaXplKG5hbWUpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5IHNpbmdsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZGFzaGVyaXplKG5hbWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbW92ZSA9IChudWxsID09PSB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KHByb3BOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkocHJvcE5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG5hbWUpKSB7XG4gICAgICAgICAgICAvLyBnZXQgbXVsdGlwbGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgbmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZGFzaGVyaXplKGtleSk7XG4gICAgICAgICAgICAgICAgcHJvcHNba2V5XSA9IHZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShlbCkuZ2V0UHJvcGVydHlWYWx1ZShwcm9wTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvcHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgbXVsdGlwbGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBlbnN1cmVDaGFpbkNhc2VQcm9wZXJpZXMobmFtZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSB9ID0gZWw7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSBwcm9wc1twcm9wTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCBwcm9wc1twcm9wTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+aoquW5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5qiq5bmF44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIHdpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIHdpZHRoKHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBvciBzZXQgdGhlIHdpZHRoIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6KiI566X5riI44G/56uL5bmF44KS44OU44Kv44K744Or5Y2Y5L2N44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBrue4puW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaW5uZXIgd2lkdGggZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOaoquW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lcldpZHRoKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBpbm5lciB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lcldpZHRoKHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VJbm5lclNpemVGb3IodGhpcywgJ3dpZHRoJywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIGhlaWdodCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgcGFkZGluZyBidXQgbm90IGJvcmRlci5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5YaF6YOo57im5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGlubmVySGVpZ2h0KCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBpbm5lciBoZWlnaHQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo57im5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGlubmVySGVpZ2h0KHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VJbm5lclNpemVGb3IodGhpcywgJ2hlaWdodCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBvdXRlciB3aWR0aCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jmqKrluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aChpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBvdXRlciB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lpJbpg6jmqKrluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlcldpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlcldpZHRoKC4uLmFyZ3M6IHVua25vd25bXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ3dpZHRoJywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIGhlaWdodCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOe4puW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlckhlaWdodCguLi5hcmdzOiB1bmtub3duW10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCBpbmNsdWRlTWFyZ2luLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgb2Zmc2V0IHBhcmVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6Kaq6KaB57Sg44GL44KJ44Gu55u45a++55qE44Gq6KGo56S65L2N572u44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHBvc2l0aW9uKCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgb2Zmc2V0OiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG4gICAgICAgIGxldCBwYXJlbnRPZmZzZXQgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIG1hcmdpblRvcDogbXQsIG1hcmdpbkxlZnQ6IG1sIH0gPSAkKGVsKS5jc3MoWydwb3NpdGlvbicsICdtYXJnaW5Ub3AnLCAnbWFyZ2luTGVmdCddKTtcbiAgICAgICAgY29uc3QgbWFyZ2luVG9wID0gdG9OdW1iZXIobXQpO1xuICAgICAgICBjb25zdCBtYXJnaW5MZWZ0ID0gdG9OdW1iZXIobWwpO1xuXG4gICAgICAgIC8vIHBvc2l0aW9uOmZpeGVkIGVsZW1lbnRzIGFyZSBvZmZzZXQgZnJvbSB0aGUgdmlld3BvcnQsIHdoaWNoIGl0c2VsZiBhbHdheXMgaGFzIHplcm8gb2Zmc2V0XG4gICAgICAgIGlmICgnZml4ZWQnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gQXNzdW1lIHBvc2l0aW9uOmZpeGVkIGltcGxpZXMgYXZhaWxhYmlsaXR5IG9mIGdldEJvdW5kaW5nQ2xpZW50UmVjdFxuICAgICAgICAgICAgb2Zmc2V0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBnZXRPZmZzZXRQb3NpdGlvbihlbCk7XG5cbiAgICAgICAgICAgIC8vIEFjY291bnQgZm9yIHRoZSAqcmVhbCogb2Zmc2V0IHBhcmVudCwgd2hpY2ggY2FuIGJlIHRoZSBkb2N1bWVudCBvciBpdHMgcm9vdCBlbGVtZW50XG4gICAgICAgICAgICAvLyB3aGVuIGEgc3RhdGljYWxseSBwb3NpdGlvbmVkIGVsZW1lbnQgaXMgaWRlbnRpZmllZFxuICAgICAgICAgICAgY29uc3QgZG9jID0gZWwub3duZXJEb2N1bWVudDtcbiAgICAgICAgICAgIGxldCBvZmZzZXRQYXJlbnQgPSBnZXRPZmZzZXRQYXJlbnQoZWwpIHx8IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgICAgICBsZXQgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIHdoaWxlIChvZmZzZXRQYXJlbnQgJiZcbiAgICAgICAgICAgICAgICAob2Zmc2V0UGFyZW50ID09PSBkb2MuYm9keSB8fCBvZmZzZXRQYXJlbnQgPT09IGRvYy5kb2N1bWVudEVsZW1lbnQpICYmXG4gICAgICAgICAgICAgICAgJ3N0YXRpYycgPT09ICRvZmZzZXRQYXJlbnQuY3NzKCdwb3NpdGlvbicpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvZmZzZXRQYXJlbnQgPSBvZmZzZXRQYXJlbnQucGFyZW50Tm9kZSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgICAgICRvZmZzZXRQYXJlbnQgPSAkKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2Zmc2V0UGFyZW50ICYmIG9mZnNldFBhcmVudCAhPT0gZWwgJiYgTm9kZS5FTEVNRU5UX05PREUgPT09IG9mZnNldFBhcmVudC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIC8vIEluY29ycG9yYXRlIGJvcmRlcnMgaW50byBpdHMgb2Zmc2V0LCBzaW5jZSB0aGV5IGFyZSBvdXRzaWRlIGl0cyBjb250ZW50IG9yaWdpblxuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBib3JkZXJUb3BXaWR0aCwgYm9yZGVyTGVmdFdpZHRoIH0gPSAkb2Zmc2V0UGFyZW50LmNzcyhbJ2JvcmRlclRvcFdpZHRoJywgJ2JvcmRlckxlZnRXaWR0aCddKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQudG9wICs9IHRvTnVtYmVyKGJvcmRlclRvcFdpZHRoKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQubGVmdCArPSB0b051bWJlcihib3JkZXJMZWZ0V2lkdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3VidHJhY3QgcGFyZW50IG9mZnNldHMgYW5kIGVsZW1lbnQgbWFyZ2luc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG9wOiBvZmZzZXQudG9wIC0gcGFyZW50T2Zmc2V0LnRvcCAtIG1hcmdpblRvcCxcbiAgICAgICAgICAgIGxlZnQ6IG9mZnNldC5sZWZ0IC0gcGFyZW50T2Zmc2V0LmxlZnQgLSBtYXJnaW5MZWZ0LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIGRvY3VtZW50IOOCkuWfuua6luOBqOOBl+OBpiwg44Oe44OD44OB44GX44Gm44GE44KL6KaB57Sg6ZuG5ZCI44GuMeOBpOebruOBruimgee0oOOBruePvuWcqOOBruW6p+aomeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgasgZG9jdW1lbnQg44KS5Z+65rqW44Gr44GX44Gf54++5Zyo5bqn5qiZ44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29vcmRpbmF0ZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBwcm9wZXJ0aWVzIGB0b3BgIGFuZCBgbGVmdGAuXG4gICAgICogIC0gYGphYCBgdG9wYCwgYGxlZnRgIOODl+ODreODkeODhuOCo+OCkuWQq+OCgOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM6IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogdGhpcztcblxuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM/OiB7IHRvcD86IG51bWJlcjsgbGVmdD86IG51bWJlcjsgfSk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB8IHRoaXMge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IGNvb3JkaW5hdGVzID8geyB0b3A6IDAsIGxlZnQ6IDAgfSA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBjb29yZGluYXRlcykge1xuICAgICAgICAgICAgLy8gZ2V0XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UG9zaXRpb24odGhpc1swXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXRcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BzOiB7IHRvcD86IHN0cmluZzsgbGVmdD86IHN0cmluZzsgfSA9IHt9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIHRvcDogY3NzVG9wLCBsZWZ0OiBjc3NMZWZ0IH0gPSAkZWwuY3NzKFsncG9zaXRpb24nLCAndG9wJywgJ2xlZnQnXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcG9zaXRpb24gZmlyc3QsIGluLWNhc2UgdG9wL2xlZnQgYXJlIHNldCBldmVuIG9uIHN0YXRpYyBlbGVtXG4gICAgICAgICAgICAgICAgaWYgKCdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjdXJPZmZzZXQgPSAkZWwub2Zmc2V0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VyUG9zaXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZWVkQ2FsY3VsYXRlUG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgID0gKCdhYnNvbHV0ZScgPT09IHBvc2l0aW9uIHx8ICdmaXhlZCcgPT09IHBvc2l0aW9uKSAmJiAoY3NzVG9wICsgY3NzTGVmdCkuaW5jbHVkZXMoJ2F1dG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5lZWRDYWxjdWxhdGVQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRlbC5wb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiB0b051bWJlcihjc3NUb3ApLCBsZWZ0OiB0b051bWJlcihjc3NMZWZ0KSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkoKTtcblxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLnRvcCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wcy50b3AgPSBgJHsoY29vcmRpbmF0ZXMudG9wIC0gY3VyT2Zmc2V0LnRvcCkgKyBjdXJQb3NpdGlvbi50b3B9cHhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjb29yZGluYXRlcy5sZWZ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLmxlZnQgPSBgJHsoY29vcmRpbmF0ZXMubGVmdCAtIGN1ck9mZnNldC5sZWZ0KSArIGN1clBvc2l0aW9uLmxlZnR9cHhgO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRlbC5jc3MocHJvcHMgYXMgUGxhaW5PYmplY3Q8c3RyaW5nPik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU3R5bGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1pbnZhbGlkLXRoaXNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSwgaXNUeXBlRWxlbWVudCB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBET01FdmVudExpc3RuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEV2ZW50Q29udGV4dCB7XG4gICAgW2Nvb2tpZTogc3RyaW5nXTogQmluZEluZm87XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgPSAnfCcsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIHVua25vd25bXT4oKSxcbiAgICBldmVudExpc3RlbmVyczogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIEJpbmRFdmVudENvbnRleHQ+KCksXG4gICAgbGl2ZUV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgZXZlbnQtZGF0YSBmcm9tIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5RXZlbnREYXRhKGV2ZW50OiBFdmVudCk6IHVua25vd25bXSB7XG4gICAgY29uc3QgZGF0YSA9IF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmdldChldmVudC50YXJnZXQgYXMgRWxlbWVudCkgfHwgW107XG4gICAgZGF0YS51bnNoaWZ0KGV2ZW50KTtcbiAgICByZXR1cm4gZGF0YTtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBldmVudC1kYXRhIHdpdGggZWxlbWVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudERhdGEoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50RGF0YTogdW5rbm93bltdKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuc2V0KGVsZW0sIGV2ZW50RGF0YSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgZGVsZXRlIGV2ZW50LWRhdGEgYnkgZWxlbWVudCAqL1xuZnVuY3Rpb24gZGVsZXRlRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZGVsZXRlKGVsZW0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgZXZlbnQgY29va2llIGZyb20gZXZlbnQgbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMgKi9cbmZ1bmN0aW9uIHRvQ29va2llKGV2ZW50OiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBkZWxldGUgb3B0aW9ucy5vbmNlO1xuICAgIHJldHVybiBgJHtldmVudH0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtKU09OLnN0cmluZ2lmeShvcHRpb25zKX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtzZWxlY3Rvcn1gO1xufVxuXG4vKiogQGludGVybmFsIGdldCBsaXN0ZW5lciBoYW5kbGVycyBjb250ZXh0IGJ5IGVsZW1lbnQgYW5kIGV2ZW50ICovXG5mdW5jdGlvbiBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkgYXMgQmluZEV2ZW50Q29udGV4dDtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgZnJvbSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoXG4gICAgZWxlbTogRWxlbWVudEJhc2UsXG4gICAgZXZlbnRzOiBzdHJpbmdbXSxcbiAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyLFxuICAgIHByb3h5OiBFdmVudExpc3RlbmVyLFxuICAgIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW0sIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgdHJ1ZSk7XG4gICAgICAgIGlmIChyZWdpc3RlcmVkICYmICFyZWdpc3RlcmVkLmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQuYWRkKGxpc3RlbmVyKTtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIHByb3h5LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgJiYgZWxlbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgYWxsIGV2ZW50IGFuZCBoYW5kbGVyIGJ5IGVsZW1lbnQsIGZvciBhbGwgYG9mZigpYCBhbmQgYGNsb25lKHRydWUpYCAqL1xuZnVuY3Rpb24gZXh0cmFjdEFsbEhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCByZW1vdmUgPSB0cnVlKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIE9iamVjdC5rZXlzKGNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbMF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFsxXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGNvbnRleHRbY29va2llXS5oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgbGl2ZUV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBQYXJzZUV2ZW50QXJnc1Jlc3VsdCA9IHtcbiAgICB0eXBlOiBzdHJpbmdbXTtcbiAgICBzZWxlY3Rvcjogc3RyaW5nO1xuICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7XG4gICAgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnM7XG59O1xuXG4vKiogQGludGVybmFsIHBhcnNlIGV2ZW50IGFyZ3MgKi9cbmZ1bmN0aW9uIHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IFBhcnNlRXZlbnRBcmdzUmVzdWx0IHtcbiAgICBsZXQgW3R5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICBbdHlwZSwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICAgICAgc2VsZWN0b3IgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdHlwZSA9ICF0eXBlID8gW10gOiAoaXNBcnJheSh0eXBlKSA/IHR5cGUgOiBbdHlwZV0pO1xuICAgIHNlbGVjdG9yID0gc2VsZWN0b3IgfHwgJyc7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHRydWUgPT09IG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHsgY2FwdHVyZTogdHJ1ZSB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9IGFzIFBhcnNlRXZlbnRBcmdzUmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9ub1RyaWdnZXIgPSBbJ3Jlc2l6ZScsICdzY3JvbGwnXTtcblxuLyoqIEBpbnRlcm5hbCBldmVudC1zaG9ydGN1dCBpbXBsICovXG5mdW5jdGlvbiBldmVudFNob3J0Y3V0PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4odGhpczogRE9NRXZlbnRzPFQ+LCBuYW1lOiBzdHJpbmcsIGhhbmRsZXI/OiBFdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogRE9NRXZlbnRzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSBoYW5kbGVyKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKCFfbm9UcmlnZ2VyLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZWxbbmFtZV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsW25hbWVdKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCBhcyBhbnkpLnRyaWdnZXIobmFtZSBhcyBhbnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5vbihuYW1lIGFzIGFueSwgaGFuZGxlciBhcyBhbnksIG9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFdmVudChzcmM6IEVsZW1lbnQsIGRzdDogRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdEFsbEhhbmRsZXJzKHNyYywgZmFsc2UpO1xuICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICBkc3QuYWRkRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNsb25lKClgICovXG5mdW5jdGlvbiBjbG9uZUVsZW1lbnQoZWxlbTogRWxlbWVudCwgd2l0aEV2ZW50czogYm9vbGVhbiwgZGVlcDogYm9vbGVhbik6IEVsZW1lbnQge1xuICAgIGNvbnN0IGNsb25lID0gZWxlbS5jbG9uZU5vZGUodHJ1ZSkgYXMgRWxlbWVudDtcblxuICAgIGlmICh3aXRoRXZlbnRzKSB7XG4gICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBjb25zdCBzcmNFbGVtZW50cyA9IGVsZW0ucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgY29uc3QgZHN0RWxlbWVudHMgPSBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtpbmRleF0gb2Ygc3JjRWxlbWVudHMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgY2xvbmVFdmVudChzcmNFbGVtZW50c1tpbmRleF0sIGRzdEVsZW1lbnRzW2luZGV4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjbG9uZUV2ZW50KGVsZW0sIGNsb25lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbG9uZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cbmV4cG9ydCB0eXBlIERPTUV2ZW50TWFwPFQ+XG4gICAgPSBUIGV4dGVuZHMgV2luZG93ID8gV2luZG93RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBEb2N1bWVudCA/IERvY3VtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MQm9keUVsZW1lbnQgPyBIVE1MQm9keUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxGcmFtZVNldEVsZW1lbnQgPyBIVE1MRnJhbWVTZXRFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWFycXVlZUVsZW1lbnQgPyBIVE1MTWFycXVlZUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxNZWRpYUVsZW1lbnQgPyBIVE1MTWVkaWFFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MRWxlbWVudCA/IEhUTUxFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBFbGVtZW50ID8gRWxlbWVudEV2ZW50TWFwXG4gICAgOiBHbG9iYWxFdmVudEhhbmRsZXJzRXZlbnRNYXA7XG4vKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGV2ZW50IG1hbmFnZW1lbnRzLlxuICogQGphIOOCpOODmeODs+ODiOeuoeeQhuOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRXZlbnRzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIGJhc2ljXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb24oLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUxpdmVFdmVudChlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgY29uc3QgZXZlbnREYXRhID0gcXVlcnlFdmVudERhdGEoZSk7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChlLnRhcmdldCBhcyBFbGVtZW50IHwgbnVsbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkoJHRhcmdldFswXSwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXJlbnQgb2YgJHRhcmdldC5wYXJlbnRzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50KS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHBhcmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBxdWVyeUV2ZW50RGF0YShlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm94eSA9IHNlbGVjdG9yID8gaGFuZGxlTGl2ZUV2ZW50IDogaGFuZGxlRXZlbnQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICByZWdpc3RlckV2ZW50TGlzdGVuZXJIYW5kbGVycyhlbCwgZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIHByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBsaXN0ZW5lcj86IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGFsbCBldmVudCBoYW5kbGVyLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgZnjgbnjgabjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmKCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2ZmKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhlbCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IGhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGhhbmRsZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7IC8vIGJhY2t3YXJkIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVyc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLnByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmRlbGV0ZShoYW5kbGVyLmxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb25jZSguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCBvcHRzID0geyAuLi5vcHRpb25zLCAuLi57IG9uY2U6IHRydWUgfSB9O1xuXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiBvbmNlSGFuZGxlcih0aGlzOiBET01FdmVudHM8VEVsZW1lbnQ+LCAuLi5ldmVudEFyZ3M6IHVua25vd25bXSk6IHZvaWQge1xuICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgZXZlbnRBcmdzKTtcbiAgICAgICAgICAgIHNlbGYub2ZmKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgICAgICAgICAgZGVsZXRlIG9uY2VIYW5kbGVyLm9yaWdpbjtcbiAgICAgICAgfVxuICAgICAgICBvbmNlSGFuZGxlci5vcmlnaW4gPSBsaXN0ZW5lciBhcyBET01FdmVudExpc3RuZXIgfCB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGFsbCBoYW5kbGVycyBhZGRlZCB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gr5a++44GX44Gm44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LiAvIGBFdmVudGAgaW5zdGFuY2Ugb3IgYEV2ZW50YCBpbnN0YW5jZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIlyAvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K544G+44Gf44GvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K56YWN5YiXXG4gICAgICogQHBhcmFtIGV2ZW50RGF0YVxuICAgICAqICAtIGBlbmAgb3B0aW9uYWwgc2VuZGluZyBkYXRhLlxuICAgICAqICAtIGBqYWAg6YCB5L+h44GZ44KL5Lu75oSP44Gu44OH44O844K/XG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgc2VlZDoga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSB8IEV2ZW50IHwgRXZlbnRbXSB8IChrZXlvZiBURXZlbnRNYXAgfCBFdmVudClbXSxcbiAgICAgICAgLi4uZXZlbnREYXRhOiB1bmtub3duW11cbiAgICApOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY29udmVydCA9IChhcmc6IGtleW9mIFRFdmVudE1hcCB8IEV2ZW50KTogRXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGFyZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUV2ZW50KGFyZywge1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IGV2ZW50RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZyBhcyBFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBldmVudHMgPSBpc0FycmF5KHNlZWQpID8gc2VlZCA6IFtzZWVkXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgY29uc3QgZSA9IGNvbnZlcnQoZXZlbnQpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJFdmVudERhdGEoZWwsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgZWwuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICBkZWxldGVFdmVudERhdGEoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHV0aWxpdHlcblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3IgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEhUTUxFbGVtZW50PjtcbiAgICAgICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IFRyYW5zaXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ3RyYW5zaXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlzRnVuY3Rpb24oY2FsbGJhY2spICYmIHNlbGYub24oJ3RyYW5zaXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ2FuaW1hdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxIVE1MRWxlbWVudD47XG4gICAgICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBBbmltYXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ2FuaW1hdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgc2VsZi5vbignYW5pbWF0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJpbmQgb25lIG9yIHR3byBoYW5kbGVycyB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cywgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIGFuZCBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnRzLlxuICAgICAqIEBqYSAx44Gk44G+44Gf44GvMuOBpOOBruODj+ODs+ODieODqeOCkuaMh+WumuOBlywg5LiA6Ie044GX44Gf6KaB57Sg44GuIGBtb3VzZWVudGVyYCwgYG1vdXNlbGVhdmVgIOOCkuaknOefpVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJJbihPdXQpXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIHRoZSBlbGVtZW50LiA8YnI+XG4gICAgICogICAgICAgIElmIGhhbmRsZXIgc2V0IG9ubHkgb25lLCBhIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LCB0b28uXG4gICAgICogIC0gYGphYCBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiA8YnI+XG4gICAgICogICAgICAgICAg5byV5pWw44GMMeOBpOOBp+OBguOCi+WgtOWQiCwgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCguWFvOOBreOCi1xuICAgICAqIEBwYXJhbSBoYW5kbGVyT3V0XG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LlxuICAgICAqICAtIGBqYWAgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBob3ZlcihoYW5kbGVySW46IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgaGFuZGxlck91dD86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCk6IHRoaXMge1xuICAgICAgICBoYW5kbGVyT3V0ID0gaGFuZGxlck91dCB8fCBoYW5kbGVySW47XG4gICAgICAgIHJldHVybiB0aGlzLm1vdXNlZW50ZXIoaGFuZGxlckluKS5tb3VzZWxlYXZlKGhhbmRsZXJPdXQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHNob3J0Y3V0XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNsaWNrYCBldmVudC5cbiAgICAgKiBAamEgYGNsaWNrYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjbGljayhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBkYmxjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBkYmxjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGJsY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdkYmxjbGljaycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgYmx1cmAgZXZlbnQuXG4gICAgICogQGphIGBibHVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBibHVyKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnYmx1cicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3VzKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXMnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzaW5gIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNpbmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNpbihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3VzaW4nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3Vzb3V0YCBldmVudC5cbiAgICAgKiBAamEgYGZvY3Vzb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c291dChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3Vzb3V0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXl1cGAgZXZlbnQuXG4gICAgICogQGphIGBrZXl1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5dXAoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXl1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5ZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBrZXlkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlkb3duKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5ZG93bicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5cHJlc3NgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5cHJlc3NgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXByZXNzKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5cHJlc3MnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHN1Ym1pdGAgZXZlbnQuXG4gICAgICogQGphIGBzdWJtaXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN1Ym1pdChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3N1Ym1pdCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY29udGV4dG1lbnVgIGV2ZW50LlxuICAgICAqIEBqYSBgY29udGV4dG1lbnVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNvbnRleHRtZW51KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY29udGV4dG1lbnUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNoYW5nZWAgZXZlbnQuXG4gICAgICogQGphIGBjaGFuZ2VgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NoYW5nZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2Vkb3duYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZG93bmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2Vkb3duKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vtb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW1vdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNldXBgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2V1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2V1cChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNldXAnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZW50ZXJgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VlbnRlcihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZW50ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VsZWF2ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VsZWF2ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbGVhdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3V0YCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW91dChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlb3V0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW92ZXJgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdmVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW92ZXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW92ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoc3RhcnRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hzdGFydGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hzdGFydChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoc3RhcnQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoZW5kYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoZW5kYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGVuZChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoZW5kJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaG1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2htb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaG1vdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaG1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoY2FuY2VsYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoY2FuY2VsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGNhbmNlbChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoY2FuY2VsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGByZXNpemVgIGV2ZW50LlxuICAgICAqIEBqYSBgcmVzaXplYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNpemUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdyZXNpemUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHNjcm9sbGAgZXZlbnQuXG4gICAgICogQGphIGBzY3JvbGxgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Njcm9sbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ29weWluZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIGRlZXAgY29weSBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruODh+OCo+ODvOODl+OCs+ODlOODvOOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIHdpdGhFdmVudHNcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgc2hvdWxkIGJlIGNvcGllZCBhbG9uZyB3aXRoIHRoZSBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCguOCs+ODlOODvOOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumlxuICAgICAqIEBwYXJhbSBkZWVwXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIGV2ZW50IGhhbmRsZXJzIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIGNsb25lZCBlbGVtZW50IHNob3VsZCBiZSBjb3BpZWQuXG4gICAgICogIC0gYGphYCBib29sZWFu5YCk44Gn44CB6YWN5LiL44Gu6KaB57Sg44Gu44GZ44G544Gm44Gu5a2Q6KaB57Sg44Gr5a++44GX44Gm44KC44CB5LuY6ZqP44GX44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKHdpdGhFdmVudHMgPSBmYWxzZSwgZGVlcCA9IGZhbHNlKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQoc2VsZikpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxmLm1hcCgoaW5kZXg6IG51bWJlciwgZWw6IFRFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmVFbGVtZW50KGVsIGFzIE5vZGUgYXMgRWxlbWVudCwgd2l0aEV2ZW50cywgZGVlcCkgYXMgTm9kZSBhcyBURWxlbWVudDtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FdmVudHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQge1xuICAgIE5pbCxcbiAgICBpc051bWJlcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzaWZ5LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBlbnN1cmVQb3NpdGl2ZU51bWJlcixcbiAgICBzd2luZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzTm9kZURvY3VtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgZ2V0T2Zmc2V0U2l6ZSB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCB7XG4gICAgd2luZG93LFxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcbn0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dYC5zY3JvbGxUbygpYCBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEgW1tET01dXWAuc2Nyb2xsVG8oKWAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NU2Nyb2xsT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB2ZXJ0aWNhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgdG9wPzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSBob3Jpem9udGFsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqIEBqYSDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKi9cbiAgICBsZWZ0PzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBkdXJhdGlvbj86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqIEBqYSDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICovXG4gICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBjYWxsYmFjaz86ICgpID0+IHZvaWQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHF1ZXJ5IHNjcm9sbCB0YXJnZXQgZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlUYXJnZXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH0gZWxzZSBpZiAoaXNOb2RlRG9jdW1lbnQoZWwpKSB7XG4gICAgICAgIHJldHVybiBlbC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cgPT09IGVsKSB7XG4gICAgICAgIHJldHVybiB3aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBzY3JvbGxUbygpYCAqL1xuZnVuY3Rpb24gcGFyc2VBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IERPTVNjcm9sbE9wdGlvbnMge1xuICAgIGNvbnN0IG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMgPSB7IGVhc2luZzogJ3N3aW5nJyB9O1xuICAgIGlmICgxID09PSBhcmdzLmxlbmd0aCkge1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIGFyZ3NbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFtsZWZ0LCB0b3AsIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrXSA9IGFyZ3M7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywge1xuICAgICAgICAgICAgdG9wLFxuICAgICAgICAgICAgbGVmdCxcbiAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wdGlvbnMudG9wICAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLnRvcCk7XG4gICAgb3B0aW9ucy5sZWZ0ICAgICA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMubGVmdCk7XG4gICAgb3B0aW9ucy5kdXJhdGlvbiA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMuZHVyYXRpb24pO1xuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIGV4ZWNTY3JvbGwoZWw6IEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCwgb3B0aW9uczogRE9NU2Nyb2xsT3B0aW9ucyk6IHZvaWQge1xuICAgIGNvbnN0IHsgdG9wLCBsZWZ0LCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjayB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IGluaXRpYWxUb3AgPSBlbC5zY3JvbGxUb3A7XG4gICAgY29uc3QgaW5pdGlhbExlZnQgPSBlbC5zY3JvbGxMZWZ0O1xuICAgIGxldCBlbmFibGVUb3AgPSBpc051bWJlcih0b3ApO1xuICAgIGxldCBlbmFibGVMZWZ0ID0gaXNOdW1iZXIobGVmdCk7XG5cbiAgICAvLyBub24gYW5pbWF0aW9uIGNhc2VcbiAgICBpZiAoIWR1cmF0aW9uKSB7XG4gICAgICAgIGxldCBub3RpZnkgPSBmYWxzZTtcbiAgICAgICAgaWYgKGVuYWJsZVRvcCAmJiB0b3AgIT09IGluaXRpYWxUb3ApIHtcbiAgICAgICAgICAgIGVsLnNjcm9sbFRvcCA9IHRvcCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0ICYmIGxlZnQgIT09IGluaXRpYWxMZWZ0KSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxMZWZ0ID0gbGVmdCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub3RpZnkgJiYgaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGNNZXRyaWNzID0gKGVuYWJsZTogYm9vbGVhbiwgYmFzZTogbnVtYmVyLCBpbml0aWFsVmFsdWU6IG51bWJlciwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogeyBtYXg6IG51bWJlcjsgbmV3OiBudW1iZXI7IGluaXRpYWw6IG51bWJlcjsgfSA9PiB7XG4gICAgICAgIGlmICghZW5hYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBtYXg6IDAsIG5ldzogMCwgaW5pdGlhbDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1heFZhbHVlID0gZWxbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF0gLSBnZXRPZmZzZXRTaXplKGVsLCB0eXBlKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1heChNYXRoLm1pbihiYXNlLCBtYXhWYWx1ZSksIDApO1xuICAgICAgICByZXR1cm4geyBtYXg6IG1heFZhbHVlLCBuZXc6IG5ld1ZhbHVlLCBpbml0aWFsOiBpbml0aWFsVmFsdWUgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgbWV0cmljc1RvcCA9IGNhbGNNZXRyaWNzKGVuYWJsZVRvcCwgdG9wIGFzIG51bWJlciwgaW5pdGlhbFRvcCwgJ2hlaWdodCcpO1xuICAgIGNvbnN0IG1ldHJpY3NMZWZ0ID0gY2FsY01ldHJpY3MoZW5hYmxlTGVmdCwgbGVmdCBhcyBudW1iZXIsIGluaXRpYWxMZWZ0LCAnd2lkdGgnKTtcblxuICAgIGlmIChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPT09IG1ldHJpY3NUb3AuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVUb3AgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID09PSBtZXRyaWNzTGVmdC5pbml0aWFsKSB7XG4gICAgICAgIGVuYWJsZUxlZnQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFlbmFibGVUb3AgJiYgIWVuYWJsZUxlZnQpIHtcbiAgICAgICAgLy8gbmVlZCBub3QgdG8gc2Nyb2xsXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjUHJvZ3Jlc3MgPSAodmFsdWU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGVhc2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBlYXNpbmcodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdsaW5lYXInID09PSBlYXNpbmcgPyB2YWx1ZSA6IHN3aW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWx0YSA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGNvbnN0IGFuaW1hdGUgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGVsYXBzZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gTWF0aC5tYXgoTWF0aC5taW4oZWxhcHNlIC8gZHVyYXRpb24sIDEpLCAwKTtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3NDb2VmZiA9IGNhbGNQcm9ncmVzcyhwcm9ncmVzcyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGRlbHRhXG4gICAgICAgIGlmIChlbmFibGVUb3ApIHtcbiAgICAgICAgICAgIGRlbHRhLnRvcCA9IG1ldHJpY3NUb3AuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NUb3AubmV3IC0gbWV0cmljc1RvcC5pbml0aWFsKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuYWJsZUxlZnQpIHtcbiAgICAgICAgICAgIGRlbHRhLmxlZnQgPSBtZXRyaWNzTGVmdC5pbml0aWFsICsgKHByb2dyZXNzQ29lZmYgKiAobWV0cmljc0xlZnQubmV3IC0gbWV0cmljc0xlZnQuaW5pdGlhbCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgZG9uZVxuICAgICAgICBpZiAoKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA+IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPj0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCBkb3duXG4gICAgICAgICAgICAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3IDwgbWV0cmljc1RvcC5pbml0aWFsICYmIGRlbHRhLnRvcCA8PSBtZXRyaWNzVG9wLm5ldykgICAgICAgfHwgLy8gc2Nyb2xsIHVwXG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPiBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPj0gbWV0cmljc0xlZnQubmV3KSAgfHwgLy8gc2Nyb2xsIHJpZ2h0XG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPCBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPD0gbWV0cmljc0xlZnQubmV3KSAgICAgLy8gc2Nyb2xsIGxlZnRcbiAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIGVuYWJsZVRvcCAmJiAoZWwuc2Nyb2xsVG9wID0gbWV0cmljc1RvcC5uZXcpO1xuICAgICAgICAgICAgZW5hYmxlTGVmdCAmJiAoZWwuc2Nyb2xsTGVmdCA9IG1ldHJpY3NMZWZ0Lm5ldyk7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVsZWFzZSByZWZlcmVuY2UgaW1tZWRpYXRlbHkuXG4gICAgICAgICAgICBlbCA9IG51bGwhOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBkZWx0YS50b3ApO1xuICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gZGVsdGEubGVmdCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44K544Kv44Ot44O844Or44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TY3JvbGw8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTY3JvbGxcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBleOCjOOBn+ODlOOCr+OCu+ODq+aVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUb3AoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zaXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSBkdXJhdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKiBAcGFyYW0gZWFzaW5nXG4gICAgICogIC0gYGVuYCB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqICAtIGBqYWAg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbFRvcCA6IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbFRvKHtcbiAgICAgICAgICAgICAgICB0b3A6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIGhvcml6b250YWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOaoquaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbExlZnQgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgbGVmdDogcG9zaXRpb24sXG4gICAgICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB4XG4gICAgICogIC0gYGVuYCB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOaoquOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSB5XG4gICAgICogIC0gYGVuYCB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDnuKbjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKFxuICAgICAgICB4OiBudW1iZXIsXG4gICAgICAgIHk6IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIHNjcm9sbCB2YWx1ZXMgYnkgb3B0b2lucy5cbiAgICAgKiBAamEg44Kq44OX44K344On44Oz44KS55So44GE44Gm44K544Kv44Ot44O844Or5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gcGFyc2VBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBxdWVyeVRhcmdldEVsZW1lbnQoZWwpO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBleGVjU2Nyb2xsKGVsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU2Nyb2xsLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsIFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlLCBET00gfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3QgcGFyYW1ldGVyLlxuICogQGphIFtbRE9NXV0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdFBhcmFtZXRlcnMgPSBLZXlmcmFtZVtdIHwgUHJvcGVydHlJbmRleGVkS2V5ZnJhbWVzIHwgbnVsbDtcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3Qgb3B0aW9ucy5cbiAqIEBqYSBbW0RPTV1dIOOCqOODleOCp+OCr+ODiOWKueaenOOBruOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RPcHRpb25zID0gbnVtYmVyIHwgS2V5ZnJhbWVBbmltYXRpb25PcHRpb25zO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBjb250ZXh0IG9iamVjdC5cbiAqIEBqYSBbW0RPTV1dIOOBruOCqOODleOCp+OCr+ODiOWKueaenOOBruOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBbW0RPTV1dIGluc3RhbmNlIHRoYXQgY2FsbGVkIFtbYW5pbWF0ZV1dKCkgbWV0aG9kLlxuICAgICAqIEBqYSBbW2FuaW1hdGVdXSgpIOODoeOCveODg+ODieOCkuWun+ihjOOBl+OBnyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGRvbTogRE9NPFRFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYW5kIGBBbmltYXRpb25gIGluc3RhbmNlIG1hcCBieSBleGVjdXRpb24gW1thbmltYXRlXV0oKSBtZXRob2QgYXQgdGhpcyB0aW1lLlxuICAgICAqIEBqYSDku4rlm57lrp/ooYzjgZfjgZ8gYEVsZW1lbnRgIOOBqCBgQW5pbWF0aW9uYCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7jg57jg4Pjg5dcbiAgICAgKi9cbiAgICByZWFkb25seSBhbmltYXRpb25zOiBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGN1cnJlbnQgZmluaXNoZWQgUHJvbWlzZSBmb3IgdGhpcyBhbmltYXRpb24uXG4gICAgICogQGphIOWvvuixoeOCouODi+ODoeODvOOCt+ODp+ODs+OBrue1guS6huaZguOBq+eZuueBq+OBmeOCiyBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgZmluaXNoZWQ6IFByb21pc2U8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYW5pbUNvbnRleHRNYXAgPSBuZXcgV2Vha01hcDxFbGVtZW50LCBTZXQ8QW5pbWF0aW9uPj4oKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhbmltYXRpb24vZWZmZWN0IG1ldGhvZHMuXG4gKiBAamEg44Ki44OL44Oh44O844K344On44OzL+OCqOODleOCp+OCr+ODiOaTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRWZmZWN0czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGFydCBhbmltYXRpb24gYnkgYFdlYiBBbmltYXRpb24gQVBJYC5cbiAgICAgKiBAamEgYFdlYiBBbmltYXRpb24gQVBJYCDjgpLnlKjjgYTjgabjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0ZShwYXJhbXM6IERPTUVmZmVjdFBhcmFtZXRlcnMsIG9wdGlvbnM6IERPTUVmZmVjdE9wdGlvbnMpOiBET01FZmZlY3RDb250ZXh0PFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGRvbTogdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD4gYXMgRE9NPFRFbGVtZW50PixcbiAgICAgICAgICAgIGFuaW1hdGlvbnM6IG5ldyBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj4oKSxcbiAgICAgICAgfSBhcyBXcml0YWJsZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG5cbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFuaW0gPSBlbC5hbmltYXRlKHBhcmFtcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwpIHx8IG5ldyBTZXQoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmFkZChhbmltKTtcbiAgICAgICAgICAgICAgICBfYW5pbUNvbnRleHRNYXAuc2V0KGVsLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuYW5pbWF0aW9ucy5zZXQoZWwgYXMgTm9kZSBhcyBURWxlbWVudCwgYW5pbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLmFsbChbLi4ucmVzdWx0LmFuaW1hdGlvbnMudmFsdWVzKCldLm1hcChhbmltID0+IGFuaW0uZmluaXNoZWQpKS50aGVuKCgpID0+IHJlc3VsdCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsIGN1cnJlbnQgcnVubmluZyBhbmltYXRpb24uXG4gICAgICogQGphIOePvuWcqOWun+ihjOOBl+OBpuOBhOOCi+OCouODi+ODoeODvOOCt+ODp+ODs+OCkuS4reatolxuICAgICAqL1xuICAgIHB1YmxpYyBjYW5jZWwoKTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFuaW1hdGlvbiBvZiBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRpb24uY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLmRlbGV0ZShlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZpbmlzaCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLntYLkuoZcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluaXNoKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmlzaCDjgafjga/noLTmo4TjgZfjgarjgYRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FZmZlY3RzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHtcbiAgICBDbGFzcyxcbiAgICBtaXhpbnMsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBFbGVtZW50aWZ5U2VlZCxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBET01CYXNlIH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IERPTUF0dHJpYnV0ZXMgfSBmcm9tICcuL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHsgRE9NVHJhdmVyc2luZyB9IGZyb20gJy4vdHJhdmVyc2luZyc7XG5pbXBvcnQgeyBET01NYW5pcHVsYXRpb24gfSBmcm9tICcuL21hbmlwdWxhdGlvbic7XG5pbXBvcnQgeyBET01TdHlsZXMgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyBET01FdmVudHMgfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQgeyBET01TY3JvbGwgfSBmcm9tICcuL3Njcm9sbCc7XG5pbXBvcnQgeyBET01FZmZlY3RzIH0gZnJvbSAnLi9lZmZlY3RzJztcblxudHlwZSBET01GZWF0dXJlczxUIGV4dGVuZHMgRWxlbWVudEJhc2U+XG4gICAgPSBET01CYXNlPFQ+XG4gICAgJiBET01BdHRyaWJ1dGVzPFQ+XG4gICAgJiBET01UcmF2ZXJzaW5nPFQ+XG4gICAgJiBET01NYW5pcHVsYXRpb248VD5cbiAgICAmIERPTVN0eWxlczxUPlxuICAgICYgRE9NRXZlbnRzPFQ+XG4gICAgJiBET01TY3JvbGw8VD5cbiAgICAmIERPTUVmZmVjdHM8VD47XG5cbi8qKlxuICogQGVuIFtbRE9NXV0gcGx1Z2luIG1ldGhvZCBkZWZpbml0aW9uLlxuICogQGphIFtbRE9NXV0g44OX44Op44Kw44Kk44Oz44Oh44K944OD44OJ5a6a576pXG4gKlxuICogQG5vdGVcbiAqICAtIOODl+ODqeOCsOOCpOODs+aLoeW8teWumue+qeOBr+OBk+OBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueODnuODvOOCuOOBmeOCiy5cbiAqICAtIFR5cGVTY3JpcHQgMy43IOaZgueCueOBpywgbW9kdWxlIGludGVyZmFjZSDjga7jg57jg7zjgrjjga8gbW9kdWxlIOOBruWujOWFqOOBquODkeOCueOCkuW/heimgeOBqOOBmeOCi+OBn+OCgSxcbiAqICAgIOacrOODrOODneOCuOODiOODquOBp+OBryBidW5kbGUg44GX44GfIGBkaXN0L2RvbS5kLnRzYCDjgpLmj5DkvpvjgZnjgosuXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zMzMyNlxuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTc4NDgxMzQvdHJvdWJsZS11cGRhdGluZy1hbi1pbnRlcmZhY2UtdXNpbmctZGVjbGFyYXRpb24tbWVyZ2luZ1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVBsdWdpbiB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlXG5cbi8qKlxuICogQGVuIFRoaXMgaW50ZXJmYWNlIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6b44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIERPTUZlYXR1cmVzPFQ+LCBET01QbHVnaW4geyB9XG5cbmV4cG9ydCB0eXBlIERPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBFbGVtZW50aWZ5U2VlZDxUPiB8IERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgRE9NUmVzdWx0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+ID0gVCBleHRlbmRzIERPTTxFbGVtZW50QmFzZT4gPyBUIDogKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IERPTTxUPiA6IERPTTxIVE1MRWxlbWVudD4pO1xuZXhwb3J0IHR5cGUgRE9NSXRlcmF0ZUNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gYm9vbGVhbiB8IHZvaWQ7XG5cbi8qKlxuICogQGVuIFRoaXMgY2xhc3MgcHJvdmlkZXMgRE9NIG9wZXJhdGlvbnMgbGlrZSBgalF1ZXJ5YCBsaWJyYXJ5LlxuICogQGphIGBqUXVlcnlgIOOBruOCiOOBhuOBqkRPTSDmk43kvZzjgpLmj5DkvptcbiAqXG4gKiBVTlNVUFBPUlRFRCBNRVRIT0QgTElTVFxuICpcbiAqIFtUcmF2ZXJzaW5nXVxuICogIC5hZGRCYWNrKClcbiAqICAuZW5kKClcbiAqXG4gKiBbRWZmZWN0c11cbiAqIC5zaG93KClcbiAqIC5oaWRlKClcbiAqIC50b2dnbGUoKVxuICogLnN0b3AoKVxuICogLmNsZWFyUXVldWUoKVxuICogLmRlbGF5KClcbiAqIC5kZXF1ZXVlKClcbiAqIC5mYWRlSW4oKVxuICogLmZhZGVPdXQoKVxuICogLmZhZGVUbygpXG4gKiAuZmFkZVRvZ2dsZSgpXG4gKiAucXVldWUoKVxuICogLnNsaWRlRG93bigpXG4gKiAuc2xpZGVUb2dnbGUoKVxuICogLnNsaWRlVXAoKVxuICovXG5leHBvcnQgY2xhc3MgRE9NQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoXG4gICAgRE9NQmFzZSxcbiAgICBET01BdHRyaWJ1dGVzLFxuICAgIERPTVRyYXZlcnNpbmcsXG4gICAgRE9NTWFuaXB1bGF0aW9uLFxuICAgIERPTVN0eWxlcyxcbiAgICBET01FdmVudHMsXG4gICAgRE9NU2Nyb2xsLFxuICAgIERPTUVmZmVjdHMsXG4pIHtcbiAgICAvKipcbiAgICAgKiBwcml2YXRlIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiB0YXJnZXRzIGBFbGVtZW50YCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOaTjeS9nOWvvuixoeOBriBgRWxlbWVudGAg6YWN5YiXXG4gICAgICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihlbGVtZW50czogRWxlbWVudEJhc2VbXSkge1xuICAgICAgICBzdXBlcihlbGVtZW50cyk7XG4gICAgICAgIC8vIGFsbCBzb3VyY2UgY2xhc3NlcyBoYXZlIG5vIGNvbnN0cnVjdG9yLlxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tET01dXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKHNlbGVjdG9yICYmICFjb250ZXh0KSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgaW5zdGFuY2VvZiBET01DbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxlY3RvciBhcyB1bmtub3duIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IERPTUNsYXNzKChlbGVtZW50aWZ5KHNlbGVjdG9yIGFzIEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0KSkpIGFzIHVua25vd24gYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKERPTUNsYXNzIGFzIHVua25vd24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4iLCJpbXBvcnQgeyBzZXR1cCB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUNsYXNzIH0gZnJvbSAnLi9jbGFzcyc7XG5cbi8vIGluaXQgZm9yIHN0YXRpY1xuc2V0dXAoRE9NQ2xhc3MucHJvdG90eXBlLCBET01DbGFzcy5jcmVhdGUpO1xuXG5leHBvcnQgKiBmcm9tICcuL2V4cG9ydHMnO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyBkZWZhdWx0IH0gZnJvbSAnLi9leHBvcnRzJztcbiJdLCJuYW1lcyI6WyJzYWZlIiwiZG9jdW1lbnQiLCJpc0Z1bmN0aW9uIiwiY2xhc3NOYW1lIiwiaXNOdW1iZXIiLCJkb2MiLCJnZXRHbG9iYWxOYW1lc3BhY2UiLCJ3aW5kb3ciLCIkIiwiaXNBcnJheSIsImlzU3RyaW5nIiwidG9UeXBlZERhdGEiLCJjYW1lbGl6ZSIsImZyb21UeXBlZERhdGEiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSIsIm5vb3AiLCJkb20iLCJkYXNoZXJpemUiLCJjbGFzc2lmeSIsIkN1c3RvbUV2ZW50IiwibWl4aW5zIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBOzs7O0lBS0EsaUJBQWlCLE1BQU0sR0FBRyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JELGlCQUFpQixNQUFNLEdBQUcsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2RCxpQkFBaUIsTUFBTSxHQUFHLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUQsaUJBQWlCLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDLHFCQUFxQjs7SUNWeEU7OztJQW1CQTs7Ozs7Ozs7Ozs7O2FBWWdCLFVBQVUsQ0FBeUIsSUFBd0IsRUFBRSxPQUE2QjtRQUN0RyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1AsT0FBTyxFQUFFLENBQUM7U0FDYjtRQUVELE9BQU8sR0FBRyxPQUFPLElBQUlDLEdBQVEsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBYyxFQUFFLENBQUM7UUFFL0IsSUFBSTtZQUNBLElBQUksUUFBUSxLQUFLLE9BQU8sSUFBSSxFQUFFO2dCQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3pCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFOztvQkFFMUMsTUFBTSxRQUFRLEdBQUdBLEdBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3BELFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO29CQUMxQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENB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YSxDQUFDLENBQUM7b0JBQ25ELElBQUksT0FBTyxFQUFFO3dCQUNULEtBQUssTUFBTSxTQUFTLElBQUksT0FBTyxFQUFFOzRCQUM3QixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7eUJBQ3RCO3dCQUNELGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBYSxDQUFDLENBQUM7cUJBQ3pDO2lCQUNKO2FBQ0o7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNmOzs7OztRQU1NLE1BQU07WUFDVCxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDckIsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUU7b0JBQ25CLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBYSxDQUFDLENBQUM7b0JBQ25ELElBQUksT0FBTyxFQUFFO3dCQUNULEtBQUssTUFBTSxTQUFTLElBQUksT0FBTyxFQUFFOzRCQUM3QixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7eUJBQ3RCOztxQkFFSjtpQkFDSjthQUNKO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDZjtLQUNKO0FBRURBLGtDQUFvQixDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQzs7SUNoRnBEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7VUEyQmEsUUFBUyxTQUFRTSxnQkFBTSxDQUNoQyxPQUFPLEVBQ1AsYUFBYSxFQUNiLGFBQWEsRUFDYixlQUFlLEVBQ2YsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsVUFBVSxDQUNiOzs7Ozs7OztRQVFHLFlBQW9CLFFBQXVCO1lBQ3ZDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQzs7U0FFbkI7Ozs7Ozs7Ozs7Ozs7OztRQWdCTSxPQUFPLE1BQU0sQ0FBeUIsUUFBeUIsRUFBRSxPQUE2QjtZQUNqRyxJQUFJLFFBQVEsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDdEIsSUFBSSxRQUFRLFlBQVksUUFBUSxFQUFFO29CQUM5QixPQUFPLFFBQW1DLENBQUM7aUJBQzlDO2FBQ0o7WUFDRCxPQUFPLElBQUksUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUE2QixFQUFFLE9BQU8sQ0FBQyxFQUE2QixDQUFDO1NBQ3hHO0tBQ0o7SUFFRDtBQUNBTixrQ0FBb0IsQ0FBQyxRQUE0QixFQUFFLFlBQVksRUFBRSxJQUFJLENBQUM7O0lDL0h0RTtJQUNBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9kb20vIn0=
