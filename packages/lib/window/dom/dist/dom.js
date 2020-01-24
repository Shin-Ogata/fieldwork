/*!
 * @cdp/dom 0.9.0
 *   dom utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP));
}(this, (function (exports, coreUtils) { 'use strict';

    /*
     * SSR (Server Side Rendering) 環境においても
     * `window` オブジェクトと `document` オブジェクト等の存在を保証する
     */
    const win = coreUtils.safe(globalThis.window);
    const doc = coreUtils.safe(globalThis.document);
    const evt = coreUtils.safe(globalThis.CustomEvent);
    const { requestAnimationFrame } = win;

    /* eslint-disable @typescript-eslint/no-explicit-any */
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

    /* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-explicit-any */
    let _factory;
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
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
                index = Math.floor(index);
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
        return ('<' === src.slice(0, 1)) && ('>' === src.slice(-1));
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
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

    /* eslint-disable no-invalid-this, @typescript-eslint/no-explicit-any */
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
    /** @internal */
    const _noTrigger = ['resize', 'scroll'];
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
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
    /** @internal */
    const _animContextMap = new WeakMap();
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
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

    // init for static
    setup(DOMClass.prototype, DOMClass.create);

    exports.default = dom;
    exports.dom = dom;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJhdHRyaWJ1dGVzLnRzIiwidHJhdmVyc2luZy50cyIsIm1hbmlwdWxhdGlvbi50cyIsInN0eWxlcy50cyIsImV2ZW50cy50cyIsInNjcm9sbC50cyIsImVmZmVjdHMudHMiLCJjbGFzcy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCglxuICogYHdpbmRvd2Ag44Kq44OW44K444Kn44Kv44OI44GoIGBkb2N1bWVudGAg44Kq44OW44K444Kn44Kv44OI562J44Gu5a2Y5Zyo44KS5L+d6Ki844GZ44KLXG4gKi9cbmNvbnN0IHdpbiA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuY29uc3QgZG9jID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbmNvbnN0IGV2dCA9IHNhZmUoZ2xvYmFsVGhpcy5DdXN0b21FdmVudCk7XG5cbmNvbnN0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIH0gPSB3aW47XG5cbmV4cG9ydCB7XG4gICAgd2luIGFzIHdpbmRvdyxcbiAgICBkb2MgYXMgZG9jdW1lbnQsXG4gICAgZXZ0IGFzIEN1c3RvbUV2ZW50LFxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgTmlsLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NOYW1lLFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QmFzZSA9IE5vZGUgfCBXaW5kb3c7XG5leHBvcnQgdHlwZSBFbGVtZW50UmVzdWx0PFQ+ID0gVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IEhUTUxFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE5pbDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBUIHwgKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFRbXSA6IG5ldmVyKSB8IE5vZGVMaXN0T2Y8VCBleHRlbmRzIE5vZGUgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgUXVlcnlDb250ZXh0ID0gUGFyZW50Tm9kZSAmIFBhcnRpYWw8Tm9uRWxlbWVudFBhcmVudE5vZGU+O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgRWxlbWVudCBhcnJheSBmcm9tIHNlZWQgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBTZWVkIOOBi+OCiSBFbGVtZW50IOmFjeWIl+OCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUgb3IgV2luZG93IG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXSB7XG4gICAgaWYgKCFzZWVkKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb250ZXh0ID0gY29udGV4dCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG5cbiAgICB0cnkge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBodG1sID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHRtbC5pbmNsdWRlcygnPCcpICYmIGh0bWwuaW5jbHVkZXMoJz4nKSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcmt1cFxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQpICYmICgnIycgPT09IHNlbGVjdG9yWzBdKSAmJiAhL1sgLjw+On5dLy5leGVjKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXJlIElEIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvci5zdWJzdHJpbmcoMSkpO1xuICAgICAgICAgICAgICAgICAgICBlbCAmJiBlbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdib2R5JyA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYm9keVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIHNlbGVjdG9yc1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmNvbnRleHQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgoc2VlZCBhcyBOb2RlKS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWQgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmIChzZWVkWzBdLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZFswXSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBGb3IgZWFzaW5nIGBzd2luZ2AgdGltaW5nLWZ1bmN0aW9uLlxuICogQGphIGVhc2luZyBgc3dpbmdgIOeUqOOCv+OCpOODn+ODs+OCsOmWouaVsFxuICpcbiAqIEByZWZlcmVuY2VcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkyNDUwMzAvbG9va2luZy1mb3ItYS1zd2luZy1saWtlLWVhc2luZy1leHByZXNzaWJsZS1ib3RoLXdpdGgtanF1ZXJ5LWFuZC1jc3MzXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81MjA3MzAxL2pxdWVyeS1lYXNpbmctZnVuY3Rpb25zLXdpdGhvdXQtdXNpbmctYS1wbHVnaW5cbiAqXG4gKiBAcGFyYW0gcHJvZ3Jlc3MgWzAgLSAxXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpbmcocHJvZ3Jlc3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNSAtIChNYXRoLmNvcyhwcm9ncmVzcyAqIE1hdGguUEkpIC8gMik7XG59XG5cbi8qKlxuICogQGVuIFtbZXZhbHVhdGVdXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tldmFsdWF0ZV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZhbE9wdGlvbnMge1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgc3JjPzogc3RyaW5nO1xuICAgIG5vbmNlPzogc3RyaW5nO1xuICAgIG5vTW9kdWxlPzogc3RyaW5nO1xufVxuXG5jb25zdCBfc2NyaXB0c0F0dHJzOiAoa2V5b2YgRXZhbE9wdGlvbnMpW10gPSBbXG4gICAgJ3R5cGUnLFxuICAgICdzcmMnLFxuICAgICdub25jZScsXG4gICAgJ25vTW9kdWxlJyxcbl07XG5cbi8qKlxuICogQGVuIFRoZSBgZXZhbGAgZnVuY3Rpb24gYnkgd2hpY2ggc2NyaXB0IGBub25jZWAgYXR0cmlidXRlIGNvbnNpZGVyZWQgdW5kZXIgdGhlIENTUCBjb25kaXRpb24uXG4gKiBAamEgQ1NQIOeSsOWig+OBq+OBiuOBhOOBpuOCueOCr+ODquODl+ODiCBgbm9uY2VgIOWxnuaAp+OCkuiAg+aFruOBl+OBnyBgZXZhbGAg5a6f6KGM6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnkge1xuICAgIGNvbnN0IGRvYzogRG9jdW1lbnQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQudGV4dCA9IGBDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSA9ICgoKSA9PiB7IHJldHVybiAke2NvZGV9OyB9KSgpO2A7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgX3NjcmlwdHNBdHRycykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gb3B0aW9uc1thdHRyXSB8fCAoKG9wdGlvbnMgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlICYmIChvcHRpb25zIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyKSk7XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIHRyeSB7XG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZSgnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnKTtcbiAgICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KS5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChzY3JpcHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgcmV0dmFsID0gZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBlbGVtZW50aWZ5LFxuICAgIGV2YWx1YXRlLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIERPTUNsYXNzLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG59IGZyb20gJy4vY2xhc3MnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBkb20ge1xuICAgIGxldCBmbjogRE9NQ2xhc3M7XG59XG5cbnR5cGUgRE9NRmFjdG9yeSA9IDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCkgPT4gRE9NUmVzdWx0PFQ+O1xuXG5sZXQgX2ZhY3RvcnkhOiBET01GYWN0b3J5O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgW1tET01dXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gZG9tPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICByZXR1cm4gX2ZhY3Rvcnkoc2VsZWN0b3IsIGNvbnRleHQpO1xufVxuXG5kb20udXRpbHMgPSB7XG4gICAgZWxlbWVudGlmeSxcbiAgICBldmFsdWF0ZSxcbn07XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzLCBmYWN0b3J5OiBET01GYWN0b3J5KTogdm9pZCB7XG4gICAgX2ZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIGRvbS5mbiA9IGZuO1xufVxuXG5leHBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tLFxufTtcbiIsImltcG9ydCB7IE5pbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3csIGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yID0gU3ltYm9sKCdjcmVhdGVJdGVyYWJsZUl0ZXJhdG9yJyk7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3Rpb24gY2xhc3Mgb2YgW1tET01DbGFzc11dLiBUaGlzIGNsYXNzIHByb3ZpZGVzIGl0ZXJhdG9yIG1ldGhvZHMuXG4gKiBAamEgW1tET01DbGFzc11dIOOBruWfuuW6leaKveixoeOCr+ODqeOCuS4gaXRlcmF0b3Ig44KS5o+Q5L6bLlxuICovXG5leHBvcnQgY2xhc3MgRE9NQmFzZTxUIGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgQXJyYXlMaWtlPFQ+LCBJdGVyYWJsZTxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIG51bWJlciBvZiBgRWxlbWVudGBcbiAgICAgKiBAamEg5YaF5YyF44GZ44KLIGBFbGVtZW50YCDmlbBcbiAgICAgKi9cbiAgICByZWFkb25seSBsZW5ndGg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYWNjZXNzb3JcbiAgICAgKiBAamEgYEVsZW1lbnRgIOOBuOOBrua3u+OBiOWtl+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBUO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiB0YXJnZXRzIGBFbGVtZW50YCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOaTjeS9nOWvvuixoeOBriBgRWxlbWVudGAg6YWN5YiXXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoZWxlbWVudHM6IFRbXSkge1xuICAgICAgICBjb25zdCBzZWxmOiBET01BY2Nlc3M8VD4gPSB0aGlzO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxlbV0gb2YgZWxlbWVudHMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBzZWxmW2luZGV4XSA9IGVsZW07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sZW5ndGggPSBlbGVtZW50cy5sZW5ndGg7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSXRlcmFibGU8VD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRvciBvZiBbW0VsZW1lbnRCYXNlXV0gdmFsdWVzIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg5qC857SN44GX44Gm44GE44KLIFtbRWxlbWVudEJhc2VdXSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFQ+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5KGluZGV4KSwgdmFsdWUoW1tFbGVtZW50QmFzZV1dKSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBUXT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gW2tleSwgdmFsdWVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXlzKGluZGV4KSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyKSA9PiBrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gdmFsdWUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGl0ZXJhdG9yIGNyZWF0ZSBmdW5jdGlvbiAqL1xuICAgIHByaXZhdGUgW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXTxSPih2YWx1ZUdlbmVyYXRvcjogKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4gPSB7XG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFI+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY29udGV4dC5wb2ludGVyO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgY29udGV4dC5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBvaW50ZXIrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlR2VuZXJhdG9yKGN1cnJlbnQsIGNvbnRleHQuYmFzZVtjdXJyZW50XSksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gaXRlcmF0b3I7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBCYXNlIGludGVyZmFjZSBmb3IgRE9NIE1peGluIGNsYXNzLlxuICogQGphIERPTSBNaXhpbiDjgq/jg6njgrnjga7ml6LlrprjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01JdGVyYWJsZTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTUJhc2U8VD4+IHtcbiAgICBsZW5ndGg6IG51bWJlcjtcbiAgICBbbjogbnVtYmVyXTogVDtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VD47XG59XG5cbi8qKlxuICogQGludGVybmFsIERPTSBhY2Nlc3NcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICAgY29uc3QgZG9tOiBET01BY2Nlc3M8VEVsZW1lbnQ+ID0gdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD47XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01BY2Nlc3M8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+IGV4dGVuZHMgUGFydGlhbDxET008VD4+IHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgTm9kZWAuXG4gKiBAamEg5a++6LGh44GMIGBOb2RlYCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZShlbDogdW5rbm93bik6IGVsIGlzIE5vZGUge1xuICAgIHJldHVybiAhIShlbCAmJiAoZWwgYXMgTm9kZSkubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IGVsIGlzIEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkVMRU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBIVE1MRWxlbWVudGAg44G+44Gf44GvIGBTVkdFbGVtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgSFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YCBvciBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44G+44Gf44GvIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVRdWVyaWFibGUoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgRWxlbWVudCB8IERvY3VtZW50IHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkucXVlcnlTZWxlY3Rvcik7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRG9jdW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlRG9jdW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgRG9jdW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkRPQ1VNRU5UX05PREUgPT09IGVsLm5vZGVUeXBlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIFtbRE9NXV0gdGFyZ2V0IGlzIGBFbGVtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxFbGVtZW50PiB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZG9tWzBdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEgW1tET01dXSDjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50PiB7XG4gICAgcmV0dXJuIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZG9tWzBdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgRG9jdW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZURvY3VtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPERvY3VtZW50PiB7XG4gICAgcmV0dXJuIGRvY3VtZW50ID09PSBkb21bMF07XG59XG5cbi8qKlxuICogQGVuIENoZWNrIFtbRE9NXV0gdGFyZ2V0IGlzIGBXaW5kb3dgLlxuICogQGphIFtbRE9NXV0g44GMIGBXaW5kb3dgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZVdpbmRvdyhkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxXaW5kb3c+IHtcbiAgICByZXR1cm4gd2luZG93ID09PSBkb21bMF07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOaWwuXG4gKiBAamEgTmlsIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTmlsPiB7XG4gICAgcmV0dXJuICFzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmdTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBzdHJpbmc+IHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiBzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTm9kZS5cbiAqIEBqYSBOb2RlIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlPiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIE5vZGUpLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBFbGVtZW50LlxuICogQGphIEVsZW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRWxlbWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBFbGVtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBEb2N1bWVudC5cbiAqIEBqYSBEb2N1bWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEb2N1bWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERvY3VtZW50PiB7XG4gICAgcmV0dXJuIGRvY3VtZW50ID09PSBzZWxlY3RvciBhcyBOb2RlIGFzIERvY3VtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBXaW5kb3cuXG4gKiBAamEgV2luZG93IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1dpbmRvd1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIFdpbmRvdz4ge1xuICAgIHJldHVybiB3aW5kb3cgPT09IHNlbGVjdG9yIGFzIFdpbmRvdztcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIGlzIGFibGUgdG8gaXRlcmF0ZS5cbiAqIEBqYSDotbDmn7vlj6/og73jgarjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGVMaXN0T2Y8Tm9kZT4+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgVFtdKS5sZW5ndGg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFtbRE9NXV0uXG4gKiBAamEgW1tET01dXSDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBET00+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgbm9kZSBuYW1lIGlzIGFyZ3VtZW50LlxuICogQGphIE5vZGUg5ZCN44GM5byV5pWw44Gn5LiO44GI44Gf5ZCN5YmN44Go5LiA6Ie044GZ44KL44GL5Yik5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub2RlTmFtZShlbGVtOiBOb2RlIHwgbnVsbCwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGVsZW0gJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgbm9kZSBvZmZzZXQgcGFyZW50LiBUaGlzIGZ1bmN0aW9uIHdpbGwgd29yayBTVkdFbGVtZW50LCB0b28uXG4gKiBAamEgb2Zmc2V0IHBhcmVudCDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRQYXJlbnQobm9kZTogTm9kZSk6IEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAoKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudCkge1xuICAgICAgICByZXR1cm4gKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudDtcbiAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKG5vZGUsICdzdmcnKSkge1xuICAgICAgICBjb25zdCAkc3ZnID0gJChub2RlKTtcbiAgICAgICAgY29uc3QgY3NzUHJvcHMgPSAkc3ZnLmNzcyhbJ2Rpc3BsYXknLCAncG9zaXRpb24nXSk7XG4gICAgICAgIGlmICgnbm9uZScgPT09IGNzc1Byb3BzLmRpc3BsYXkgfHwgJ2ZpeGVkJyA9PT0gY3NzUHJvcHMucG9zaXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHBhcmVudCA9ICRzdmdbMF0ucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRpc3BsYXksIHBvc2l0aW9uIH0gPSAkKHBhcmVudCkuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgICAgICAgICBpZiAoJ25vbmUnID09PSBkaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXBvc2l0aW9uIHx8ICdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lcyxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICB0b1R5cGVkRGF0YSxcbiAgICBmcm9tVHlwZWREYXRhLFxuICAgIGNhbWVsaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCB0eXBlIERPTVZhbHVlVHlwZTxULCBLID0gJ3ZhbHVlJz4gPSBUIGV4dGVuZHMgSFRNTFNlbGVjdEVsZW1lbnQgPyAoc3RyaW5nIHwgc3RyaW5nW10pIDogSyBleHRlbmRzIGtleW9mIFQgPyBUW0tdIDogdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgRE9NRGF0YSA9IFBsYWluT2JqZWN0PFR5cGVkRGF0YT47XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgdmFsKClgKi9cbmZ1bmN0aW9uIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsOiBFbGVtZW50QmFzZSk6IGVsIGlzIEhUTUxTZWxlY3RFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgJ3NlbGVjdCcgPT09IGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgJiYgKGVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5tdWx0aXBsZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNJbnB1dEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTElucHV0RWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmIChudWxsICE9IChlbCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgYXR0cmlidXRlcyBtZXRob2RzLlxuICogQGphIOWxnuaAp+aTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NQXR0cmlidXRlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENsYXNzZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGFkZENsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGFueSBvZiB0aGUgbWF0Y2hlZCBlbGVtZW50cyBhcmUgYXNzaWduZWQgdGhlIGdpdmVuIGNsYXNzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLlsJHjgarjgY/jgajjgoLopoHntKDjgYzmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWVcbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDbGFzcyhjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSAmJiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG9yIHJlbW92ZSBvbmUgb3IgbW9yZSBjbGFzc2VzIGZyb20gZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICBkZXBlbmRpbmcgb24gZWl0aGVyIHRoZSBjbGFzcydzIHByZXNlbmNlIG9yIHRoZSB2YWx1ZSBvZiB0aGUgc3RhdGUgYXJndW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBrueKtuaFi+OBq+W/nOOBmOOBpiwg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS6KaB57Sg44Gr6L+95YqgL+WJiumZpOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBmb3JjZVxuICAgICAqICAtIGBlbmAgaWYgdGhpcyBhcmd1bWVudCBleGlzdHMsIHRydWU6IHRoZSBjbGFzc2VzIHNob3VsZCBiZSBhZGRlZCAvIGZhbHNlOiByZW1vdmVkLlxuICAgICAqICAtIGBqYWAg5byV5pWw44GM5a2Y5Zyo44GZ44KL5aC05ZCILCB0cnVlOiDjgq/jg6njgrnjgpLov73liqAgLyBmYWxzZTog44Kv44Op44K544KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHRvZ2dsZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGZvcmNlPzogYm9vbGVhbik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNsYXNzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LnRvZ2dsZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwcm9wZXJ0eSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBUKTogVEVsZW1lbnRbVF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgdmFsdWVcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+ODl+ODreODkeODhuOCo+WApFxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBULCB2YWx1ZTogVEVsZW1lbnRbVF0pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBwcm9wZXJ0eSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIHByb3BlcnR5LXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihrZXk6IFQgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBURWxlbWVudFtUXSk6IFRFbGVtZW50W1RdIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHByb3BlcnR5XG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gZmlyc3QgJiYgZmlyc3Rba2V5IGFzIHN0cmluZ107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgcHJvcGVydHlcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBlbFtrZXkgYXMgc3RyaW5nXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSBpbiBlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW25hbWVdID0ga2V5W25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYXR0cmlidXRlIHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgYXR0cmlidXRlIHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg5bGe5oCn5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgdmFsdWUuIGlmIGBudWxsYCBzZXQsIHJlbW92ZSBhdHRyaWJ1dGUuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlsZ7mgKflgKQuIGBudWxsYCDjgYzmjIflrprjgZXjgozjgZ/loLTlkIjliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIGF0dHJpYnV0ZS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBhdHRyaWJ1dGUtdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIGF0dHIoa2V5OiBzdHJpbmcgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIChudWxsICE9IGF0dHIpID8gYXR0ciA6IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlQXR0cihrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5IGFzIHN0cmluZywgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtdWx0aXBsZVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBrZXlbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT09IHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIFN0cmluZyh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf5bGe5oCn44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgYXR0cmlidXRlIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44G+44Gf44Gv5bGe5oCn5ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUF0dHIobmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhdHRycyA9IGlzQXJyYXkobmFtZSkgPyBuYW1lIDogW25hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVmFsdWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEgdmFsdWUg5YCk44Gu5Y+W5b6XLiDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgc3RyaW5nYCBvciBgbnVtYmVyYCBvciBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YCkuXG4gICAgICogIC0gYGphYCBgc3RyaW5nYCDjgb7jgZ/jga8gYG51bWJlcmAg44G+44Gf44GvIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KCk6IERPTVZhbHVlVHlwZTxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIHZhbHVlIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44GmIHZhbHVlIOWApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBgc3RyaW5nYCBvciBgbnVtYmVyYCBvciBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YCkuXG4gICAgICogIC0gYGphYCBgc3RyaW5nYCDjgb7jgZ/jga8gYG51bWJlcmAg44G+44Gf44GvIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlOiBET01WYWx1ZVR5cGU8VD4pOiB0aGlzO1xuXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU/OiBET01WYWx1ZVR5cGU8VD4pOiBhbnkge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc011bHRpU2VsZWN0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5zZWxlY3RlZE9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnB1c2gob3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ3ZhbHVlJyBpbiBlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWwgYXMgYW55KS52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gc3VwcG9ydCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiBpc011bHRpU2VsZWN0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwub3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gKHZhbHVlIGFzIHN0cmluZ1tdKS5pbmNsdWRlcyhvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0lucHV0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRGF0YVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWVzIGFsbCBgRE9NU3RyaW5nTWFwYCBzdG9yZSBzZXQgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBIVE1MNSBkYXRhLSog5bGe5oCn44GnIGBET01TdHJpbmdNYXBgIOOBq+agvOe0jeOBleOCjOOBn+WFqOODh+ODvOOCv+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKCk6IERPTURhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZSBhdCB0aGUgbmFtZWQgZGF0YSBzdG9yZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24sIGFzIHNldCBieSBkYXRhKGtleSwgdmFsdWUpIG9yIGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBrZXkg44Gn5oyH5a6a44GX44GfIEhUTUw1IGRhdGEtKiDlsZ7mgKflgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b3JlIGFyYml0cmFyeSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Lu75oSP44Gu44OH44O844K/44KS5qC857SNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGRhdGEgdmFsdWUgKG5vdCBvbmx5IGBzdHJpbmdgKVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5oyH5a6aICjmloflrZfliJfku6XlpJbjgoLlj5fku5jlj68pXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcsIHZhbHVlOiBUeXBlZERhdGEpOiB0aGlzO1xuXG4gICAgcHVibGljIGRhdGEoa2V5Pzogc3RyaW5nLCB2YWx1ZT86IFR5cGVkRGF0YSk6IERPTURhdGEgfCBUeXBlZERhdGEgfCB1bmRlZmluZWQgfCB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gc3VwcG9ydGVkIGRhdGFzZXQgZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGRhdGFzZXRcbiAgICAgICAgICAgIGNvbnN0IGRhdGFzZXQgPSB0aGlzWzBdLmRhdGFzZXQ7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgYWxsIGRhdGFcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBET01EYXRhID0ge307XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGRhdGFzZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGFbcHJvcF0gPSB0b1R5cGVkRGF0YShkYXRhc2V0W3Byb3BdKSBhcyBUeXBlZERhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0eXBlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB0b1R5cGVkRGF0YShkYXRhc2V0W2NhbWVsaXplKGtleSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcHJvcCA9IGNhbWVsaXplKGtleSB8fCAnJyk7XG4gICAgICAgICAgICBpZiAocHJvcCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmRhdGFzZXRbcHJvcF0gPSBmcm9tVHlwZWREYXRhKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgZGF0YS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf44OH44O844K/44KS44OH44O844K/6aCY5Z+f44GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlRGF0YShrZXk6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KGtleSkgPyBrZXkubWFwKGsgPT4gY2FtZWxpemUoaykpIDogW2NhbWVsaXplKGtleSldO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGF0YXNldCB9ID0gZWw7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhc2V0W3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUF0dHJpYnV0ZXMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93LCBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01CYXNlLFxuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZVF1ZXJpYWJsZSxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBpc0VtcHR5U2VsZWN0b3IsXG4gICAgaXNTdHJpbmdTZWxlY3RvcixcbiAgICBpc0RvY3VtZW50U2VsZWN0b3IsXG4gICAgaXNXaW5kb3dTZWxlY3RvcixcbiAgICBpc05vZGVTZWxlY3RvcixcbiAgICBpc0l0ZXJhYmxlU2VsZWN0b3IsXG4gICAgbm9kZU5hbWUsXG4gICAgZ2V0T2Zmc2V0UGFyZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01Nb2RpZmljYXRpb25DYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gVTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpcygpYCBhbmQgYGZpbHRlcigpYCAqL1xuZnVuY3Rpb24gd2lubm93PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFU+LFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxVPixcbiAgICB2YWxpZENhbGxiYWNrOiAoZWw6IFUpID0+IGFueSxcbiAgICBpbnZhbGlkQ2FsbGJhY2s/OiAoKSA9PiBhbnksXG4pOiBhbnkge1xuICAgIGludmFsaWRDYWxsYmFjayA9IGludmFsaWRDYWxsYmFjayB8fCBub29wO1xuXG4gICAgbGV0IHJldHZhbDogYW55O1xuICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgZG9tLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3Rvci5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkubWF0Y2hlcyAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1dpbmRvd1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHdpbmRvdyA9PT0gZWwgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50ID09PSBlbCBhcyBOb2RlIGFzIERvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAsIGBwYXJlbnRzKClgIGFuZCBgc2libGluZ3MoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNoaWxkcmVuKClgLCBgcGFyZW50KClgLCBgbmV4dCgpYCBhbmQgYHByZXYoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUmV0cmlldmVOb2RlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5vZGU6IE5vZGUgfCBudWxsLCBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQpOiBub2RlIGlzIE5vZGUge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKCQobm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgbmV4dFVudGlsKClgIGFuZCBgcHJldlVudGlsKCkgKi9cbmZ1bmN0aW9uIHJldHJpZXZlU2libGluZ3M8XG4gICAgRSBleHRlbmRzIEVsZW1lbnRCYXNlLFxuICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4+KFxuICAgIHNpYmxpbmc6ICdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJyB8ICduZXh0RWxlbWVudFNpYmxpbmcnLFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxFPixcbiAgICBzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPlxuKTogRE9NPFQ+IHtcbiAgICBpZiAoIWlzVHlwZUVsZW1lbnQoZG9tKSkge1xuICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZG9tIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgIGxldCBlbGVtID0gZWxbc2libGluZ107XG4gICAgICAgIHdoaWxlIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtID0gZWxlbVtzaWJsaW5nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSB0cmF2ZXJzaW5nIG1ldGhvZHMuXG4gKiBAamEg44OI44Op44OQ44O844K544Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01UcmF2ZXJzaW5nPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWxlbWVudCBNZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgb25lIG9mIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgabphY3kuIvjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVEVsZW1lbnQgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoKTogVEVsZW1lbnRbXTtcblxuICAgIHB1YmxpYyBnZXQoaW5kZXg/OiBudW1iZXIpOiBURWxlbWVudFtdIHwgVEVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCAhPSBpbmRleCkge1xuICAgICAgICAgICAgaW5kZXggPSBNYXRoLmZsb29yKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCA8IDAgPyB0aGlzW2luZGV4ICsgdGhpcy5sZW5ndGhdIDogdGhpc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0FycmF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgYWxsIHRoZSBlbGVtZW50cyBjb250YWluZWQgaW4gdGhlIFtbRE9NXV0gc2V0LCBhcyBhbiBhcnJheS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHRvQXJyYXkoKTogVEVsZW1lbnRbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpc107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aGluIHRoZSBbW0RPTV1dIGNvbGxlY3Rpb24gcmVsYXRpdmUgdG8gaXRzIHNpYmxpbmcgZWxlbWVudHMuXG4gICAgICogQGphIFtbRE9NXV0g5YaF44Gu5pyA5Yid44Gu6KaB57Sg44GM5YWE5byf6KaB57Sg44Gu5L2V55Wq55uu44Gr5omA5bGe44GZ44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWFyY2ggZm9yIGEgZ2l2ZW4gYSBzZWxlY3RvciwgZWxlbWVudCwgb3IgW1tET01dXSBpbnN0YW5jZSBmcm9tIGFtb25nIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDphY3kuIvjga7kvZXnlarnm67jgavmiYDlsZ7jgZfjgabjgYTjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcjogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yPzogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICBsZXQgY2hpbGQ6IE5vZGUgfCBudWxsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHdoaWxlIChudWxsICE9PSAoY2hpbGQgPSBjaGlsZC5wcmV2aW91c1NpYmxpbmcpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBjaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWxlbTogVCB8IEVsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlID8gc2VsZWN0b3JbMF0gOiBzZWxlY3RvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGkgPSBbLi4udGhpc10uaW5kZXhPZihlbGVtIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIDAgPD0gaSA/IGkgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFRyYXZlcnNpbmdcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaXJzdCBpbiB0aGUgc2V0IGFzIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+acgOWIneOBruimgee0oOOCkiBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OBl+OBpuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1swXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmluYWwgb25lIGluIHRoZSBzZXQgYXMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyr5bC+44Gu6KaB57Sg44KSIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKHRoaXNbdGhpcy5sZW5ndGggLSAxXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IFtbRE9NXV0gaW5zdGFuY2Ugd2l0aCBlbGVtZW50cyBhZGRlZCB0byB0aGUgc2V0IGZyb20gc2VsZWN0b3IuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIOOBp+WPluW+l+OBl+OBnyBgRWxlbWVudGAg44KS6L+95Yqg44GX44Gf5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCAkYWRkID0gJChzZWxlY3RvciwgY29udGV4dCk7XG4gICAgICAgIGNvbnN0IGVsZW1zID0gbmV3IFNldChbLi4udGhpcywgLi4uJGFkZF0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbXNdIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IG9mIGVsZW1lbnRzIGFnYWluc3QgYSBzZWxlY3RvciwgZWxlbWVudCwgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GZ44KL44GL56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgIGlmIGF0IGxlYXN0IG9uZSBvZiB0aGVzZSBlbGVtZW50cyBtYXRjaGVzIHRoZSBnaXZlbiBhcmd1bWVudHMuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgavmjIflrprjgZfjgZ/mnaHku7bjgYzopoHntKDjga7kuIDjgaTjgafjgoLkuIDoh7TjgZnjgozjgbAgYHRydWVgIOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpczxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogYm9vbGVhbiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoKSA9PiB0cnVlLCAoKSA9PiBmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcgW1tET01dXSBpbnN0YW5jZSBpbmNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLlhoXljIXjgZnjgosg5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50czogVEVsZW1lbnRbXSA9IFtdO1xuICAgICAgICB3aW5ub3coc2VsZWN0b3IsIHRoaXMsIChlbDogVEVsZW1lbnQpID0+IHsgZWxlbWVudHMucHVzaChlbCk7IH0pO1xuICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBlbGVtZW50cyBmcm9tIHRoZSBzZXQgb2YgbWF0Y2ggdGhlIHNlbGVjdG9yIG9yIHBhc3MgdGhlIGZ1bmN0aW9uJ3MgdGVzdC5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS5YmK6Zmk44GX44Gm6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgTmV3IFtbRE9NXV0gaW5zdGFuY2UgZXhjbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5Lul5aSW44KS5YaF5YyF44GZ44KLIOaWsOimjyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBub3Q8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBuZXcgU2V0PFRFbGVtZW50PihbLi4udGhpc10pO1xuICAgICAgICB3aW5ub3coc2VsZWN0b3IsIHRoaXMsIChlbDogVEVsZW1lbnQpID0+IHsgZWxlbWVudHMuZGVsZXRlKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtZW50c10gYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGRlc2NlbmRhbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GZ44KL6KaB57Sg44KS5qSc57SiXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGZpbmQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3RvciA9ICQoc2VsZWN0b3IpIGFzIERPTTxOb2RlPjtcbiAgICAgICAgICAgIHJldHVybiAkc2VsZWN0b3IuZmlsdGVyKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbCAhPT0gZWxlbSAmJiBlbC5jb250YWlucyhlbGVtKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1zID0gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uZWxlbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBoYXZlIGEgZGVzY2VuZGFudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZfjgZ/lrZDopoHntKDmjIHjgaTopoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBOb2RlW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKHNlbGVjdG9yLCBlbCBhcyBFbGVtZW50KSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICAgICAgdGFyZ2V0cy5wdXNoKC4uLiR0YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbGVtKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgbmV3IFNldCh0YXJnZXRzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbSAhPT0gZWwgJiYgZWxlbS5jb250YWlucyhlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KSBhcyBET008Tm9kZT4gYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQYXNzIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBtYXRjaGVkIHNldCB0aHJvdWdoIGEgZnVuY3Rpb24sIHByb2R1Y2luZyBhIG5ldyBbW0RPTV1dIGluc3RhbmNlIGNvbnRhaW5pbmcgdGhlIHJldHVybiB2YWx1ZXMuXG4gICAgICogQGphIOOCs+ODvOODq+ODkOODg+OCr+OBp+WkieabtOOBleOCjOOBn+imgee0oOOCkueUqOOBhOOBpuaWsOOBn+OBqyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuani+eviVxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBtb2RpZmljYXRpb24gZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL5aSJ5pu06Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG1hcDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGNhbGxiYWNrOiBET01Nb2RpZmljYXRpb25DYWxsYmFjazxURWxlbWVudCwgVD4pOiBET008VD4ge1xuICAgICAgICBjb25zdCBlbGVtZW50czogVFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgdGhpcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goY2FsbGJhY2suY2FsbChlbCwgaW5kZXgsIGVsKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdGUgb3ZlciBhIFtbRE9NXV0gaW5zdGFuY2UsIGV4ZWN1dGluZyBhIGZ1bmN0aW9uIGZvciBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv6Zai5pWw44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBlYWNoKGNhbGxiYWNrOiBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgdGhpcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChmYWxzZSA9PT0gY2FsbGJhY2suY2FsbChlbCwgaW5kZXgsIGVsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIGEgc3Vic2V0IHNwZWNpZmllZCBieSBhIHJhbmdlIG9mIGluZGljZXMuXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBn+evhOWbsuOBruimgee0oOOCkuWQq+OCgCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGJlZ2luXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIGJlZ2luIHRvIGJlIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44Gu6ZaL5aeL5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICogQHBhcmFtIGVuZFxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBzdG9wIGJlaW5nIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44KS57WC44GI44KL55u05YmN44Gu5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICovXG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQoWy4uLnRoaXNdLnNsaWNlKGJlZ2luLCBlbmQpIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgb25lIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBl+OBn+imgee0oOOCkuWQq+OCgCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgZXEoaW5kZXg6IG51bWJlcik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZVxuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5nZXQoaW5kZXgpKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCwgZ2V0IHRoZSBmaXJzdCBlbGVtZW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IgYnkgdGVzdGluZyB0aGUgZWxlbWVudCBpdHNlbGYgYW5kIHRyYXZlcnNpbmcgdXAgdGhyb3VnaCBpdHMgYW5jZXN0b3JzIGluIHRoZSBET00gdHJlZS5cbiAgICAgKiBAamEg6ZaL5aeL6KaB57Sg44GL44KJ5pyA44KC6L+R44GE6Kaq6KaB57Sg44KS6YG45oqeLiDjgrvjg6zjgq/jgr/jg7zmjIflrprjgZfjgZ/loLTlkIgsIOODnuODg+ODgeOBmeOCi+acgOOCgui/keOBhOimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGNsb3Nlc3Q8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gc2VsZWN0b3IgfHwgIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9zZXN0cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0gZWwuY2xvc2VzdChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXN0cy5hZGQoYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4uY2xvc2VzdHNdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMgYXMgYW55KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudHMoc2VsZWN0b3IpLmVxKDApIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjaGlsZHJlbiBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOWQhOimgee0oOOBruWtkOimgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44GM5oyH5a6a44GV44KM44Gf5aC05ZCI44Gv44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf57WQ5p6c44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgY2hpbGRyZW48VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShjaGlsZCwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5hZGQoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5jaGlsZHJlbl0pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBwYXJlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7mnIDliJ3jga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBjb25zdCBwYXJlbnRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50Tm9kZSA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSAmJiB2YWxpZFJldHJpZXZlTm9kZShwYXJlbnROb2RlLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5hZGQocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5wYXJlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzVW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3RvciwgRE9NIG5vZGUsIG9yIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50c1VudGlsPFxuICAgICAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgICAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgICAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4gICAgPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPik6IERPTTxUPiB7XG4gICAgICAgIGxldCBwYXJlbnRzOiBOb2RlW10gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnROb2RlID0gKGVsIGFzIE5vZGUpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB3aGlsZSAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudE5vZGUpLmlzKGZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOikh+aVsOimgee0oOOBjOWvvuixoeOBq+OBquOCi+OBqOOBjeOBr+WPjei7olxuICAgICAgICBpZiAoMSA8IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJlbnRzID0gWy4uLm5ldyBTZXQocGFyZW50cy5yZXZlcnNlKCkpXS5yZXZlcnNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJChwYXJlbnRzKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgZm9sbG93aW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIG5leHQgc2libGluZyBvbmx5IGlmIGl0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAgICAgKiBAamEg6KaB57Sg6ZuG5ZCI44Gu5ZCE6KaB57Sg44Gu55u05b6M44Gr44GC44Gf44KL5YWE5byf6KaB57Sg44KS5oq95Ye6IDxicj5cbiAgICAgKiAgICAg5p2h5Lu25byP44KS5oyH5a6a44GX44CB57WQ5p6c44K744OD44OI44GL44KJ5pu044Gr57We6L6844G/44KS6KGM44GG44GT44Go44KC5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5leHRTaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLm5leHRTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7mrKHku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5uZXh0VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgZm9sbG93aW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5qyh5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ25leHRFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IHByZWNlZGluZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TliY3jga7lhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldlNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldlNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnByZXZTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7liY3ku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wcmV2VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgcHJlY2VkaW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5YmN5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnLCB0aGlzLCBzZWxlY3RvciwgZmlsdGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3JcbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf5ZCE6KaB57Sg44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2libGluZ3M8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc2libGluZyBvZiAkKHBhcmVudE5vZGUpLmNoaWxkcmVuKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNpYmxpbmcgIT09IGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2libGluZ3MuYWRkKHNpYmxpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjaGlsZHJlbiBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgdGV4dCBhbmQgY29tbWVudCBub2Rlcy5cbiAgICAgKiBAamEg44OG44Kt44K544OI44KESFRNTOOCs+ODoeODs+ODiOOCkuWQq+OCgOWtkOimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBjb250ZW50czxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVOYW1lKGVsLCAnaWZyYW1lJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKChlbCBhcyBOb2RlIGFzIEhUTUxJRnJhbWVFbGVtZW50KS5jb250ZW50RG9jdW1lbnQgYXMgTm9kZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlTmFtZShlbCwgJ3RlbXBsYXRlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKChlbCBhcyBOb2RlIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQpLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBlbC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNvbnRlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNsb3Nlc3QgYW5jZXN0b3IgZWxlbWVudCB0aGF0IGlzIHBvc2l0aW9uZWQuXG4gICAgICogQGphIOimgee0oOOBruWFiOelluimgee0oOOBpywg44K544K/44Kk44Or44Gn44Od44K444K344On44Oz5oyH5a6aKHBvc2l0aWlvbuOBjHJlbGF0aXZlLCBhYnNvbHV0ZSwgZml4ZWTjga7jgYTjgZrjgozjgYsp44GV44KM44Gm44GE44KL44KC44Gu44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldFBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBjb25zdCByb290RWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJChyb290RWxlbWVudCkgYXMgRE9NPE5vZGU+IGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBnZXRPZmZzZXRQYXJlbnQoZWwgYXMgTm9kZSkgfHwgcm9vdEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2Zmc2V0cy5hZGQob2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5vZmZzZXRzXSkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01UcmF2ZXJzaW5nLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcsIHNldE1peENsYXNzQXR0cmlidXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVEb2N1bWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBjaGVjayBIVE1MIHN0cmluZyAqL1xuZnVuY3Rpb24gaXNIVE1MU3RyaW5nKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICAoJzwnID09PSBzcmMuc2xpY2UoMCwgMSkpICYmICgnPicgPT09IHNyYy5zbGljZSgtMSkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGFwcGVuZCgpYCwgYHByZXBlbmQoKWAsIGBiZWZvcmUoKWAgYW5kIGBhZnRlcigpYCAgKi9cbmZ1bmN0aW9uIHRvTm9kZVNldDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IFNldDxOb2RlIHwgc3RyaW5nPiB7XG4gICAgY29uc3Qgbm9kZXMgPSBuZXcgU2V0PE5vZGUgfCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjb250ZW50IG9mIGNvbnRlbnRzKSB7XG4gICAgICAgIGlmICgoaXNTdHJpbmcoY29udGVudCkgJiYgIWlzSFRNTFN0cmluZyhjb250ZW50KSkgfHwgaXNOb2RlKGNvbnRlbnQpKSB7XG4gICAgICAgICAgICBub2Rlcy5hZGQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChjb250ZW50IGFzIERPTTxFbGVtZW50Pik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1N0cmluZyhub2RlKSB8fCAoaXNOb2RlKG5vZGUpICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gbm9kZS5ub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMuYWRkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGUobm9kZTogTm9kZSB8IHN0cmluZyk6IE5vZGUge1xuICAgIGlmIChpc1N0cmluZyhub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGRldGFjaCgpYCBhbmQgYHJlbW92ZSgpYCAqL1xuZnVuY3Rpb24gcmVtb3ZlRWxlbWVudDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCxcbiAgICBkb206IERPTUl0ZXJhYmxlPFU+LFxuICAgIGtlZXBMaXN0ZW5lcjogYm9vbGVhblxuKTogdm9pZCB7XG4gICAgY29uc3QgJGRvbTogRE9NPFU+ID0gbnVsbCAhPSBzZWxlY3RvclxuICAgICAgICA/IChkb20gYXMgRE9NPFU+KS5maWx0ZXIoc2VsZWN0b3IpXG4gICAgICAgIDogZG9tIGFzIERPTTxVPjtcblxuICAgIGlmICgha2VlcExpc3RlbmVyKSB7XG4gICAgICAgICRkb20ub2ZmKCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBlbCBvZiAkZG9tKSB7XG4gICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44Oe44OL44OU44Ol44Os44O844K344On44Oz44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01NYW5pcHVsYXRpb248VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEluc2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBIVE1MIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIEhUTUwgY29udGVudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44GfIEhUTUwg44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaHRtbFN0cmluZ1xuICAgICAqICAtIGBlbmAgQSBzdHJpbmcgb2YgSFRNTCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgosgSFRNTCDmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nOiBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZz86IHN0cmluZyk6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSA/IGVsLmlubmVySFRNTCA6ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGh0bWxTdHJpbmcpKSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sU3RyaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaW52YWxpZCBhcmdcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBhcmcuIGh0bWxTdHJpbmcgdHlwZToke3R5cGVvZiBodG1sU3RyaW5nfWApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBqUXVlcnkgcmV0dXJucyB0aGUgY29tYmluZWQgdGV4dCBvZiBlYWNoIGVsZW1lbnQsIGJ1dCB0aGlzIG1ldGhvZCBtYWtlcyBvbmx5IGZpcnN0IGVsZW1lbnQncyB0ZXh0LlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga7jg4bjgq3jgrnjg4jjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICBqUXVlcnkg44Gv5ZCE6KaB57Sg44Gu6YCj57WQ44OG44Kt44K544OI44KS6L+U5Y2044GZ44KL44GM5pys44Oh44K944OD44OJ44Gv5YWI6aCt6KaB57Sg44Gu44G/44KS5a++6LGh44Go44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIHRleHQoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBzcGVjaWZpZWQgdGV4dC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44Gf44OG44Kt44K544OI44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGV4dFxuICAgICAqICAtIGBlbmAgVGhlIHRleHQgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KL44OG44Kt44K544OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHRleHQodmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIHRleHQodmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGVsLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiAobnVsbCAhPSB0ZXh0KSA/IHRleHQudHJpbSgpIDogJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBlbmQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5hcHBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBiZWdpbm5pbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YWI6aCt44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucHJlcGVuZCguLi5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+imgee0oOOCkuS7luOBruimgee0oOOBruWFiOmgreOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnByZXBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgT3V0c2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYmVmb3JlIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWJjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGJlZm9yZTxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBiZWZvcmUgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5YmN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEJlZm9yZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYmVmb3JlKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYWZ0ZXIgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5b6M44KN44Gr5oyH5a6a44GX44GfIEhUTUwg44KE6KaB57Sg44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWZ0ZXI8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uWy4uLmNvbnRlbnRzXS5yZXZlcnNlKCkpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYWZ0ZXIgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5b6M44KN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEFmdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hZnRlcih0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBBcm91bmRcblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBhbGwgZWxlbWVudHMgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcEFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZURvY3VtZW50KHRoaXMpIHx8IGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgTm9kZTtcblxuICAgICAgICAvLyBUaGUgZWxlbWVudHMgdG8gd3JhcCB0aGUgdGFyZ2V0IGFyb3VuZFxuICAgICAgICBjb25zdCAkd3JhcCA9ICQoc2VsZWN0b3IsIGVsLm93bmVyRG9jdW1lbnQpLmVxKDApLmNsb25lKHRydWUpIGFzIERPTTxFbGVtZW50PjtcblxuICAgICAgICBpZiAoZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgJHdyYXAuaW5zZXJ0QmVmb3JlKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgICR3cmFwLm1hcCgoaW5kZXg6IG51bWJlciwgZWxlbTogRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgd2hpbGUgKGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gZWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9KS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXlgbTjgpIsIOaMh+WumuOBl+OBn+WIpeOCqOODrOODoeODs+ODiOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwSW5uZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRzID0gJGVsLmNvbnRlbnRzKCk7XG4gICAgICAgICAgICBpZiAoMCA8IGNvbnRlbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRzLndyYXBBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWwuYXBwZW5kKHNlbGVjdG9yIGFzIE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkiwg5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICRlbC53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHBhcmVudHMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTSwgbGVhdmluZyB0aGUgbWF0Y2hlZCBlbGVtZW50cyBpbiB0aGVpciBwbGFjZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu6Kaq44Ko44Os44Oh44Oz44OI44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdW53cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICBzZWxmLnBhcmVudChzZWxlY3Rvcikubm90KCdib2R5JykuZWFjaCgoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICQoZWxlbSkucmVwbGFjZVdpdGgoZWxlbS5jaGlsZE5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVtb3ZhbFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgY2hpbGQgbm9kZXMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg5YaF44Gu5a2Q6KaB57SgKOODhuOCreOCueODiOOCguWvvuixoSnjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZW1wdHkoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS4gVGhpcyBtZXRob2Qga2VlcHMgZXZlbnQgbGlzdGVuZXIgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkLiDliYrpmaTlvozjgoLjgqTjg5njg7Pjg4jjg6rjgrnjg4rjga/mnInlirlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZGV0YWNoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6KaB57Sg44KSIERPTSDjgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgZmFsc2UpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlcGxhY2VtZW50XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHdpdGggdGhlIHByb3ZpZGVkIG5ldyBjb250ZW50IGFuZCByZXR1cm4gdGhlIHNldCBvZiBlbGVtZW50cyB0aGF0IHdhcyByZW1vdmVkLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZXjgozjgZ/liKXjga7opoHntKDjgoQgSFRNTCDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdDb250ZW50XG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlV2l0aDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihuZXdDb250ZW50PzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgZWxlbSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChuZXdDb250ZW50KTtcbiAgICAgICAgICAgIGlmICgxID09PSAkZG9tLmxlbmd0aCAmJiBpc05vZGVFbGVtZW50KCRkb21bMF0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRkb21bMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5yZXBsYWNlV2l0aChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggdGFyZ2V0IGVsZW1lbnQgd2l0aCB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeOBruimgee0oOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5yZXBsYWNlV2l0aCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NTWFuaXB1bGF0aW9uLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzQXJyYXksXG4gICAgY2xhc3NpZnksXG4gICAgZGFzaGVyaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgKi9cbmZ1bmN0aW9uIGVuc3VyZUNoYWluQ2FzZVByb3Blcmllcyhwcm9wczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4pOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgcmV0dmFsID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gcHJvcHMpIHtcbiAgICAgICAgcmV0dmFsW2Rhc2hlcml6ZShrZXkpXSA9IHByb3BzW2tleV07XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0RGVmYXVsdFZpZXcoZWw6IEVsZW1lbnQpOiBXaW5kb3cge1xuICAgIHJldHVybiAoZWwub3duZXJEb2N1bWVudCAmJiBlbC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3KSB8fCB3aW5kb3c7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWw6IEVsZW1lbnQpOiBDU1NTdHlsZURlY2xhcmF0aW9uIHtcbiAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgIHJldHVybiB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgY3NzIHZhbHVlIHRvIG51bWJlciAqL1xuZnVuY3Rpb24gdG9OdW1iZXIodmFsOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbCkgfHwgMDtcbn1cblxuY29uc3QgX3Jlc29sdmVyID0ge1xuICAgIHdpZHRoOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICBoZWlnaHQ6IFsndG9wJywgJ2JvdHRvbSddLFxufTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRQYWRkaW5nKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzBdfWApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRCb3JkZXIoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVswXX0td2lkdGhgKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgYm9yZGVyLSR7X3Jlc29sdmVyW3R5cGVdWzFdfS13aWR0aGApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRNYXJnaW4oc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgbWFyZ2luLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB3aWR0aCgpYCBhbmQgYGhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLpmaTjgYTjgZ/luYUgKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnRbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgLy8gKHNjcm9sbFdpZHRoIC8gc2Nyb2xsSGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudEVsZW1lbnRbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemUgPSB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2JvcmRlci1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemUgLSAoZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2l6ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIHJldHVybiBkb20uY3NzKHR5cGUsIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogYCR7dmFsdWV9cHhgKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgaW5uZXJXaWR0aCgpYCBhbmQgYGlubmVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VJbm5lclNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgICAgIHJldHVybiBlbFtgY2xpZW50JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlIGFzIG51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCArIGdldEJvcmRlcihzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzOiBhbnlbXSk6IHsgaW5jbHVkZU1hcmdpbjogYm9vbGVhbjsgdmFsdWU6IG51bWJlciB8IHN0cmluZzsgfSB7XG4gICAgbGV0IFt2YWx1ZSwgaW5jbHVkZU1hcmdpbl0gPSBhcmdzO1xuICAgIGlmICghaXNOdW1iZXIodmFsdWUpICYmICFpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgaW5jbHVkZU1hcmdpbiA9ICEhdmFsdWU7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4geyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlT3V0ZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbjogYm9vbGVhbiwgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkuWQq+OCgeOBn+W5hSAoaW5uZXJXaWR0aCAvIGlubmVySGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXVtgaW5uZXIke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAob2Zmc2V0V2lkdGggLyBvZmZzZXRIZWlnaHQpXG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVNYXJnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQgKyBnZXRNYXJnaW4oc3R5bGUsIHR5cGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFyZ2luID0gaW5jbHVkZU1hcmdpbiA/IGdldE1hcmdpbihzdHlsZSwgdHlwZSkgOiAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAoaXNUZXh0UHJvcCA/IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpIDogdmFsdWUgYXMgbnVtYmVyKSAtIG1hcmdpbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdjb250ZW50LWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRCb3JkZXIoc3R5bGUsIHR5cGUpIC0gZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWx9cHhgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgcG9zaXRpb24oKWAgYW5kIGBvZmZzZXQoKWAgKi9cbmZ1bmN0aW9uIGdldE9mZnNldFBvc2l0aW9uKGVsOiBFbGVtZW50KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAvLyBmb3IgZGlzcGxheSBub25lXG4gICAgaWYgKGVsLmdldENsaWVudFJlY3RzKCkubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgfVxuXG4gICAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiByZWN0LnRvcCArIHZpZXcucGFnZVlPZmZzZXQsXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHZpZXcucGFnZVhPZmZzZXRcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgb2Zmc2V0W1dpZHRoIHwgSGVpZ2h0XS4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNlW1dpZHRoIHwgSGVpZ2h0XSDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRTaXplKGVsOiBIVE1MT3JTVkdFbGVtZW50LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIGlmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICByZXR1cm4gZWxbYG9mZnNldCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIFNWR0VsZW1lbnQg44GvIG9mZnNldFdpZHRoIOOBjOOCteODneODvOODiOOBleOCjOOBquOBhFxuICAgICAgICAgKiAgICAgICAgZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkg44GvIHRyYW5zZm9ybSDjgavlvbHpn7/jgpLlj5fjgZHjgovjgZ/jgoEsXG4gICAgICAgICAqICAgICAgICDlrprnvqnpgJrjgoogYm9yZGVyLCBwYWRkaW4g44KS5ZCr44KB44Gf5YCk44KS566X5Ye644GZ44KLXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsIGFzIFNWR0VsZW1lbnQpO1xuICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgc3R5bGUgbWFuYWdlbWVudCBtZXRob2RzLlxuICogQGphIOOCueOCv+OCpOODq+mWoumAo+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU3R5bGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU3R5bGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjb21wdXRlZCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBDU1Mg44Gr6Kit5a6a44GV44KM44Gm44GE44KL44OX44Ot44OR44OG44Kj5YCk44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3jgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IHZhbHVlIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlgKTjgpLmloflrZfliJfjgafov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG11bHRpcGxlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLopIfmlbDlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXJyYXkgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3phY3liJfjgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5LXZhbHVlIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWVzOiBzdHJpbmdbXSk6IFBsYWluT2JqZWN0PHN0cmluZz47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IENTUyBwcm9wZXJ0aXkgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44GuIENTUyDjg5fjg63jg5Hjg4bjgqPjgavlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgc3RyaW5nIHZhbHVlIHRvIHNldCBmb3IgdGhlIHByb3BlcnR5LiBpZiBudWxsIHBhc3NlZCwgcmVtb3ZlIHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5paH5a2X5YiX44Gn5oyH5a6aLiBudWxsIOaMh+WumuOBp+WJiumZpC5cbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bGwpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBvbmUgb3IgbW9yZSBDU1MgcHJvcGVydGllcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOikh+aVsOOBruODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnRpZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBwcm9wZXJ0eS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj44KS5qC857SN44GX44Gf44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcHVibGljIGNzcyhwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdIHwgUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4sIHZhbHVlPzogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IFBsYWluT2JqZWN0PHN0cmluZz4gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/ICcnIDogdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKGRhc2hlcml6ZShuYW1lKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShuYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgLy8gZ2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShrZXkpO1xuICAgICAgICAgICAgICAgIHByb3BzW2tleV0gPSB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpLmdldFByb3BlcnR5VmFsdWUocHJvcE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKG5hbWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUgfSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gcHJvcHNbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgcHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/mqKrluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruaoquW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+eri+W5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7nuKbluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgb3V0ZXIgd2lkdGggKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCguLi5hcmdzOiBhbnlbXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ3dpZHRoJywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIGhlaWdodCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOe4puW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlckhlaWdodCguLi5hcmdzOiBhbnlbXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBvZmZzZXQgcGFyZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7opqropoHntKDjgYvjgonjga7nm7jlr77nmoTjgarooajnpLrkvY3nva7jgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgcG9zaXRpb24oKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBvZmZzZXQ6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfTtcbiAgICAgICAgbGV0IHBhcmVudE9mZnNldCA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgbWFyZ2luVG9wOiBtdCwgbWFyZ2luTGVmdDogbWwgfSA9ICQoZWwpLmNzcyhbJ3Bvc2l0aW9uJywgJ21hcmdpblRvcCcsICdtYXJnaW5MZWZ0J10pO1xuICAgICAgICBjb25zdCBtYXJnaW5Ub3AgPSB0b051bWJlcihtdCk7XG4gICAgICAgIGNvbnN0IG1hcmdpbkxlZnQgPSB0b051bWJlcihtbCk7XG5cbiAgICAgICAgLy8gcG9zaXRpb246Zml4ZWQgZWxlbWVudHMgYXJlIG9mZnNldCBmcm9tIHRoZSB2aWV3cG9ydCwgd2hpY2ggaXRzZWxmIGFsd2F5cyBoYXMgemVybyBvZmZzZXRcbiAgICAgICAgaWYgKCdmaXhlZCcgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAvLyBBc3N1bWUgcG9zaXRpb246Zml4ZWQgaW1wbGllcyBhdmFpbGFiaWxpdHkgb2YgZ2V0Qm91bmRpbmdDbGllbnRSZWN0XG4gICAgICAgICAgICBvZmZzZXQgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKGVsKTtcblxuICAgICAgICAgICAgLy8gQWNjb3VudCBmb3IgdGhlICpyZWFsKiBvZmZzZXQgcGFyZW50LCB3aGljaCBjYW4gYmUgdGhlIGRvY3VtZW50IG9yIGl0cyByb290IGVsZW1lbnRcbiAgICAgICAgICAgIC8vIHdoZW4gYSBzdGF0aWNhbGx5IHBvc2l0aW9uZWQgZWxlbWVudCBpcyBpZGVudGlmaWVkXG4gICAgICAgICAgICBjb25zdCBkb2MgPSBlbC5vd25lckRvY3VtZW50IGFzIERvY3VtZW50O1xuICAgICAgICAgICAgbGV0IG9mZnNldFBhcmVudCA9IGdldE9mZnNldFBhcmVudChlbCkgfHwgZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgICAgIGxldCAkb2Zmc2V0UGFyZW50ID0gJChvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgd2hpbGUgKG9mZnNldFBhcmVudCAmJlxuICAgICAgICAgICAgICAgIChvZmZzZXRQYXJlbnQgPT09IGRvYy5ib2R5IHx8IG9mZnNldFBhcmVudCA9PT0gZG9jLmRvY3VtZW50RWxlbWVudCkgJiZcbiAgICAgICAgICAgICAgICAnc3RhdGljJyA9PT0gJG9mZnNldFBhcmVudC5jc3MoJ3Bvc2l0aW9uJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9mZnNldFBhcmVudCA9IG9mZnNldFBhcmVudC5wYXJlbnROb2RlIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvZmZzZXRQYXJlbnQgJiYgb2Zmc2V0UGFyZW50ICE9PSBlbCAmJiBOb2RlLkVMRU1FTlRfTk9ERSA9PT0gb2Zmc2V0UGFyZW50Lm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5jb3Jwb3JhdGUgYm9yZGVycyBpbnRvIGl0cyBvZmZzZXQsIHNpbmNlIHRoZXkgYXJlIG91dHNpZGUgaXRzIGNvbnRlbnQgb3JpZ2luXG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0ID0gZ2V0T2Zmc2V0UG9zaXRpb24ob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGJvcmRlclRvcFdpZHRoLCBib3JkZXJMZWZ0V2lkdGggfSA9ICRvZmZzZXRQYXJlbnQuY3NzKFsnYm9yZGVyVG9wV2lkdGgnLCAnYm9yZGVyTGVmdFdpZHRoJ10pO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC50b3AgKz0gdG9OdW1iZXIoYm9yZGVyVG9wV2lkdGgpO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC5sZWZ0ICs9IHRvTnVtYmVyKGJvcmRlckxlZnRXaWR0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdWJ0cmFjdCBwYXJlbnQgb2Zmc2V0cyBhbmQgZWxlbWVudCBtYXJnaW5zXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3A6IG9mZnNldC50b3AgLSBwYXJlbnRPZmZzZXQudG9wIC0gbWFyZ2luVG9wLFxuICAgICAgICAgICAgbGVmdDogb2Zmc2V0LmxlZnQgLSBwYXJlbnRPZmZzZXQubGVmdCAtIG1hcmdpbkxlZnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBkb2N1bWVudC5cbiAgICAgKiBAamEgZG9jdW1lbnQg44KS5Z+65rqW44Go44GX44GmLCDjg57jg4Pjg4HjgZfjgabjgYTjgovopoHntKDpm4blkIjjga4x44Gk55uu44Gu6KaB57Sg44Gu54++5Zyo44Gu5bqn5qiZ44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldCgpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBqyBkb2N1bWVudCDjgpLln7rmupbjgavjgZfjgZ/nj77lnKjluqfmqJnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb29yZGluYXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHByb3BlcnRpZXMgYHRvcGAgYW5kIGBsZWZ0YC5cbiAgICAgKiAgLSBgamFgIGB0b3BgLCBgbGVmdGAg44OX44Ot44OR44OG44Kj44KS5ZCr44KA44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlczogeyB0b3A/OiBudW1iZXI7IGxlZnQ/OiBudW1iZXI7IH0pOiB0aGlzO1xuXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlcz86IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHwgdGhpcyB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gY29vcmRpbmF0ZXMgPyB7IHRvcDogMCwgbGVmdDogMCB9IDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGNvb3JkaW5hdGVzKSB7XG4gICAgICAgICAgICAvLyBnZXRcbiAgICAgICAgICAgIHJldHVybiBnZXRPZmZzZXRQb3NpdGlvbih0aGlzWzBdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldFxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcHM6IHsgdG9wPzogc3RyaW5nOyBsZWZ0Pzogc3RyaW5nOyB9ID0ge307XG4gICAgICAgICAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdG9wOiBjc3NUb3AsIGxlZnQ6IGNzc0xlZnQgfSA9ICRlbC5jc3MoWydwb3NpdGlvbicsICd0b3AnLCAnbGVmdCddKTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBwb3NpdGlvbiBmaXJzdCwgaW4tY2FzZSB0b3AvbGVmdCBhcmUgc2V0IGV2ZW4gb24gc3RhdGljIGVsZW1cbiAgICAgICAgICAgICAgICBpZiAoJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGN1ck9mZnNldCA9ICRlbC5vZmZzZXQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJQb3NpdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5lZWRDYWxjdWxhdGVQb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgPSAoJ2Fic29sdXRlJyA9PT0gcG9zaXRpb24gfHwgJ2ZpeGVkJyA9PT0gcG9zaXRpb24pICYmIChjc3NUb3AgKyBjc3NMZWZ0KS5pbmNsdWRlcygnYXV0bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmVlZENhbGN1bGF0ZVBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGVsLnBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0b3A6IHRvTnVtYmVyKGNzc1RvcCksIGxlZnQ6IHRvTnVtYmVyKGNzc0xlZnQpIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY29vcmRpbmF0ZXMudG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLnRvcCA9IGAkeyhjb29yZGluYXRlcy50b3AgLSBjdXJPZmZzZXQudG9wKSArIGN1clBvc2l0aW9uLnRvcH1weGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLmxlZnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcHMubGVmdCA9IGAkeyhjb29yZGluYXRlcy5sZWZ0IC0gY3VyT2Zmc2V0LmxlZnQpICsgY3VyUG9zaXRpb24ubGVmdH1weGA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJGVsLmNzcyhwcm9wcyBhcyBQbGFpbk9iamVjdDxzdHJpbmc+KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01TdHlsZXMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSwgaXNUeXBlRWxlbWVudCB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBET01FdmVudExpc3RuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEV2ZW50Q29udGV4dCB7XG4gICAgW2Nvb2tpZTogc3RyaW5nXTogQmluZEluZm87XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgPSAnfCcsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIGFueVtdPigpLFxuICAgIGV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbiAgICBsaXZlRXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCBCaW5kRXZlbnRDb250ZXh0PigpLFxufTtcblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBldmVudC1kYXRhIGZyb20gZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlFdmVudERhdGEoZXZlbnQ6IEV2ZW50KTogYW55W10ge1xuICAgIGNvbnN0IGRhdGEgPSBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5nZXQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpIHx8IFtdO1xuICAgIGRhdGEudW5zaGlmdChldmVudCk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZXZlbnQtZGF0YSB3aXRoIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudERhdGE6IGFueVtdKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuc2V0KGVsZW0sIGV2ZW50RGF0YSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgZGVsZXRlIGV2ZW50LWRhdGEgYnkgZWxlbWVudCAqL1xuZnVuY3Rpb24gZGVsZXRlRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZGVsZXRlKGVsZW0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgZXZlbnQgY29va2llIGZyb20gZXZlbnQgbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMgKi9cbmZ1bmN0aW9uIHRvQ29va2llKGV2ZW50OiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBkZWxldGUgb3B0aW9ucy5vbmNlO1xuICAgIHJldHVybiBgJHtldmVudH0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtKU09OLnN0cmluZ2lmeShvcHRpb25zKX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtzZWxlY3Rvcn1gO1xufVxuXG4vKiogQGludGVybmFsIGdldCBsaXN0ZW5lciBoYW5kbGVycyBjb250ZXh0IGJ5IGVsZW1lbnQgYW5kIGV2ZW50ICovXG5mdW5jdGlvbiBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkgYXMgQmluZEV2ZW50Q29udGV4dDtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgZnJvbSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoXG4gICAgZWxlbTogRWxlbWVudEJhc2UsXG4gICAgZXZlbnRzOiBzdHJpbmdbXSxcbiAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyLFxuICAgIHByb3h5OiBFdmVudExpc3RlbmVyLFxuICAgIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW0sIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgdHJ1ZSk7XG4gICAgICAgIGlmIChyZWdpc3RlcmVkICYmICFyZWdpc3RlcmVkLmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQuYWRkKGxpc3RlbmVyKTtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIHByb3h5LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgJiYgZWxlbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgYWxsIGV2ZW50IGFuZCBoYW5kbGVyIGJ5IGVsZW1lbnQsIGZvciBhbGwgYG9mZigpYCBhbmQgYGNsb25lKHRydWUpYCAqL1xuZnVuY3Rpb24gZXh0cmFjdEFsbEhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCByZW1vdmUgPSB0cnVlKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBhbnk7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogYW55OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIE9iamVjdC5rZXlzKGNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbMF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFsxXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGNvbnRleHRbY29va2llXS5oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgbGl2ZUV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJzZSBldmVudCBhcmdzICovXG5mdW5jdGlvbiBwYXJzZUV2ZW50QXJncyguLi5hcmdzOiBhbnlbXSk6IHsgdHlwZTogc3RyaW5nW107IHNlbGVjdG9yOiBzdHJpbmc7IGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7IG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zOyB9IHtcbiAgICBsZXQgW3R5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICBbdHlwZSwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICAgICAgc2VsZWN0b3IgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdHlwZSA9ICF0eXBlID8gW10gOiAoaXNBcnJheSh0eXBlKSA/IHR5cGUgOiBbdHlwZV0pO1xuICAgIHNlbGVjdG9yID0gc2VsZWN0b3IgfHwgJyc7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHRydWUgPT09IG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHsgY2FwdHVyZTogdHJ1ZSB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbm9UcmlnZ2VyID0gWydyZXNpemUnLCAnc2Nyb2xsJ107XG5cbi8qKiBAaW50ZXJuYWwgZXZlbnQtc2hvcnRjdXQgaW1wbCAqL1xuZnVuY3Rpb24gZXZlbnRTaG9ydGN1dDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHRoaXM6IERPTUV2ZW50czxUPiwgbmFtZTogc3RyaW5nLCBoYW5kbGVyPzogRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IERPTUV2ZW50czxUPiB7XG4gICAgaWYgKG51bGwgPT0gaGFuZGxlcikge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmICghX25vVHJpZ2dlci5pbmNsdWRlcyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGVsW25hbWVdKSkge1xuICAgICAgICAgICAgICAgICAgICBlbFtuYW1lXSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwgYXMgYW55KS50cmlnZ2VyKG5hbWUgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24obmFtZSBhcyBhbnksIGhhbmRsZXIgYXMgYW55LCBvcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRXZlbnQoc3JjOiBFbGVtZW50LCBkc3Q6IEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhzcmMsIGZhbHNlKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgZHN0LmFkZEV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFbGVtZW50KGVsZW06IEVsZW1lbnQsIHdpdGhFdmVudHM6IGJvb2xlYW4sIGRlZXA6IGJvb2xlYW4pOiBFbGVtZW50IHtcbiAgICBjb25zdCBjbG9uZSA9IGVsZW0uY2xvbmVOb2RlKHRydWUpIGFzIEVsZW1lbnQ7XG5cbiAgICBpZiAod2l0aEV2ZW50cykge1xuICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgY29uc3Qgc3JjRWxlbWVudHMgPSBlbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGNvbnN0IGRzdEVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaW5kZXhdIG9mIHNyY0VsZW1lbnRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGNsb25lRXZlbnQoc3JjRWxlbWVudHNbaW5kZXhdLCBkc3RFbGVtZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2xvbmVFdmVudChlbGVtLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xvbmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5leHBvcnQgdHlwZSBET01FdmVudE1hcDxUPlxuICAgID0gVCBleHRlbmRzIFdpbmRvdyA/IFdpbmRvd0V2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRG9jdW1lbnQgPyBEb2N1bWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEJvZHlFbGVtZW50ID8gSFRNTEJvZHlFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MRnJhbWVTZXRFbGVtZW50ID8gSFRNTEZyYW1lU2V0RWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTE1hcnF1ZWVFbGVtZW50ID8gSFRNTE1hcnF1ZWVFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MVmlkZW9FbGVtZW50ID8gSFRNTFZpZGVvRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTE1lZGlhRWxlbWVudCA/IEhUTUxNZWRpYUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxFbGVtZW50ID8gSFRNTEVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEVsZW1lbnQgPyBFbGVtZW50RXZlbnRNYXBcbiAgICA6IEdsb2JhbEV2ZW50SGFuZGxlcnNFdmVudE1hcDtcbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCAqL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgZXZlbnQgbWFuYWdlbWVudHMuXG4gKiBAamEg44Kk44OZ44Oz44OI566h55CG44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FdmVudHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgYmFzaWNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PiguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVMaXZlRXZlbnQoZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50RGF0YSA9IHF1ZXJ5RXZlbnREYXRhKGUpO1xuICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZS50YXJnZXQgYXMgRWxlbWVudCB8IG51bGwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KCR0YXJnZXRbMF0sIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFyZW50IG9mICR0YXJnZXQucGFyZW50cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudCkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseShwYXJlbnQsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVFdmVudCh0aGlzOiBET01FdmVudHM8VEVsZW1lbnQ+LCBlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgcXVlcnlFdmVudERhdGEoZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJveHkgPSBzZWxlY3RvciA/IGhhbmRsZUxpdmVFdmVudCA6IGhhbmRsZUV2ZW50O1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoZWwsIGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQgW1tvbl1dIG9yIFtbb25jZV1dIGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiBbW29uXV0g44G+44Gf44GvIFtbb25jZV1dIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyPzogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBsaXN0ZW5lcj86IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OBmeOBueOBpuOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmYoKTogdGhpcztcblxuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PiguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhlbCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IGhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGhhbmRsZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7IC8vIGJhY2t3YXJkIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVyc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLnByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmRlbGV0ZShoYW5kbGVyLmxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCDkuIDluqbjgaDjgZHlkbzjgbPlh7rjgZXjgozjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+WvvuOBl+OBpuOCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBsaXN0ZW5lcjogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PiguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7IC4uLm9wdGlvbnMsIC4uLnsgb25jZTogdHJ1ZSB9IH07XG5cbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGZ1bmN0aW9uIG9uY2VIYW5kbGVyKHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIC4uLmV2ZW50QXJnczogYW55W10pOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGV2ZW50QXJncyk7XG4gICAgICAgICAgICBzZWxmLm9mZih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICAgICAgICAgIGRlbGV0ZSBvbmNlSGFuZGxlci5vcmlnaW47XG4gICAgICAgIH1cbiAgICAgICAgb25jZUhhbmRsZXIub3JpZ2luID0gbGlzdGVuZXI7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGFsbCBoYW5kbGVycyBhZGRlZCB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gr5a++44GX44Gm44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LiAvIGBFdmVudGAgaW5zdGFuY2Ugb3IgYEV2ZW50YCBpbnN0YW5jZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIlyAvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K544G+44Gf44GvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K56YWN5YiXXG4gICAgICogQHBhcmFtIGV2ZW50RGF0YVxuICAgICAqICAtIGBlbmAgb3B0aW9uYWwgc2VuZGluZyBkYXRhLlxuICAgICAqICAtIGBqYWAg6YCB5L+h44GZ44KL5Lu75oSP44Gu44OH44O844K/XG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgc2VlZDoga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSB8IEV2ZW50IHwgRXZlbnRbXSB8IChrZXlvZiBURXZlbnRNYXAgfCBFdmVudClbXSxcbiAgICAgICAgLi4uZXZlbnREYXRhOiBhbnlbXVxuICAgICk6IHRoaXMge1xuICAgICAgICBjb25zdCBjb252ZXJ0ID0gKGFyZzoga2V5b2YgVEV2ZW50TWFwIHwgRXZlbnQpOiBFdmVudCA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoYXJnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ3VzdG9tRXZlbnQoYXJnLCB7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogZXZlbnREYXRhLFxuICAgICAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnIGFzIEV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IGlzQXJyYXkoc2VlZCkgPyBzZWVkIDogW3NlZWRdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBlID0gY29udmVydChldmVudCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlckV2ZW50RGF0YShlbCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUV2ZW50RGF0YShlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgdXRpbGl0eVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciBbW29uY2VdXSgndHJhbnNpdGlvbmVuZCcpLlxuICAgICAqIEBqYSBbW29uY2VdXSgndHJhbnNpdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgdHJhbnNpdGlvbmVuZGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGB0cmFuc2l0aW9uZW5kYCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIHRyYW5zaXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogVHJhbnNpdGlvbkV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxIVE1MRWxlbWVudD47XG4gICAgICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBUcmFuc2l0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgZSk7XG4gICAgICAgICAgICBpZiAoIXBlcm1hbmVudCkge1xuICAgICAgICAgICAgICAgIHNlbGYub2ZmKCd0cmFuc2l0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpc0Z1bmN0aW9uKGNhbGxiYWNrKSAmJiBzZWxmLm9uKCd0cmFuc2l0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciBbW29uY2VdXSgnYW5pbWF0aW9uZW5kJykuXG4gICAgICogQGphIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYGFuaW1hdGlvbmVuZGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGBhbmltYXRpb25lbmRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IEFuaW1hdGlvbkV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxIVE1MRWxlbWVudD47XG4gICAgICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBBbmltYXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ2FuaW1hdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgc2VsZi5vbignYW5pbWF0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJpbmQgb25lIG9yIHR3byBoYW5kbGVycyB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cywgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIGFuZCBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnRzLlxuICAgICAqIEBqYSAx44Gk44G+44Gf44GvMuOBpOOBruODj+ODs+ODieODqeOCkuaMh+WumuOBlywg5LiA6Ie044GX44Gf6KaB57Sg44GuIGBtb3VzZWVudGVyYCwgYG1vdXNlbGVhdmVgIOOCkuaknOefpVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJJbihPdXQpXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIHRoZSBlbGVtZW50LiA8YnI+XG4gICAgICogICAgICAgIElmIGhhbmRsZXIgc2V0IG9ubHkgb25lLCBhIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LCB0b28uXG4gICAgICogIC0gYGphYCBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiA8YnI+XG4gICAgICogICAgICAgICAg5byV5pWw44GMMeOBpOOBp+OBguOCi+WgtOWQiCwgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCguWFvOOBreOCi1xuICAgICAqIEBwYXJhbSBoYW5kbGVyT3V0XG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LlxuICAgICAqICAtIGBqYWAgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBob3ZlcihoYW5kbGVySW46IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBoYW5kbGVyT3V0PzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQpOiB0aGlzIHtcbiAgICAgICAgaGFuZGxlck91dCA9IGhhbmRsZXJPdXQgfHwgaGFuZGxlckluO1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZWVudGVyKGhhbmRsZXJJbikubW91c2VsZWF2ZShoYW5kbGVyT3V0KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBzaG9ydGN1dFxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBkYmxjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBkYmxjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGJsY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2RibGNsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBibHVyYCBldmVudC5cbiAgICAgKiBAamEgYGJsdXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGJsdXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2JsdXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1cyhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXMnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzaW5gIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNpbmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNpbihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNpbicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3Vzb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c291dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5dXBgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5dXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXl1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5ZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBrZXlkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlkb3duKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlwcmVzc2AgZXZlbnQuXG4gICAgICogQGphIGBrZXlwcmVzc2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5cHJlc3MoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXByZXNzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzdWJtaXRgIGV2ZW50LlxuICAgICAqIEBqYSBgc3VibWl0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdWJtaXQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3N1Ym1pdCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY29udGV4dG1lbnVgIGV2ZW50LlxuICAgICAqIEBqYSBgY29udGV4dG1lbnVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNvbnRleHRtZW51KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjb250ZXh0bWVudScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2hhbmdlYCBldmVudC5cbiAgICAgKiBAamEgYGNoYW5nZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjaGFuZ2UnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZG93bihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vtb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW1vdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2V1cGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWVudGVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZW50ZXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZW50ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VsZWF2ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VsZWF2ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VsZWF2ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW91dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdmVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3ZlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdmVyKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW92ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoc3RhcnRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hzdGFydGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hzdGFydChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hzdGFydCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hlbmRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hlbmRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoZW5kKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGVuZCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2htb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNobW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2htb3ZlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaG1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoY2FuY2VsYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoY2FuY2VsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGNhbmNlbChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hjYW5jZWwnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHJlc2l6ZWAgZXZlbnQuXG4gICAgICogQGphIGByZXNpemVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2l6ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgncmVzaXplJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzY3JvbGxgIGV2ZW50LlxuICAgICAqIEBqYSBgc2Nyb2xsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGwoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Njcm9sbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ29weWluZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIGRlZXAgY29weSBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruODh+OCo+ODvOODl+OCs+ODlOODvOOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIHdpdGhFdmVudHNcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgc2hvdWxkIGJlIGNvcGllZCBhbG9uZyB3aXRoIHRoZSBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCguOCs+ODlOODvOOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumlxuICAgICAqIEBwYXJhbSBkZWVwXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIGV2ZW50IGhhbmRsZXJzIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIGNsb25lZCBlbGVtZW50IHNob3VsZCBiZSBjb3BpZWQuXG4gICAgICogIC0gYGphYCBib29sZWFu5YCk44Gn44CB6YWN5LiL44Gu6KaB57Sg44Gu44GZ44G544Gm44Gu5a2Q6KaB57Sg44Gr5a++44GX44Gm44KC44CB5LuY6ZqP44GX44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKHdpdGhFdmVudHMgPSBmYWxzZSwgZGVlcCA9IGZhbHNlKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQoc2VsZikpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxmLm1hcCgoaW5kZXg6IG51bWJlciwgZWw6IFRFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmVFbGVtZW50KGVsIGFzIE5vZGUgYXMgRWxlbWVudCwgd2l0aEV2ZW50cywgZGVlcCkgYXMgTm9kZSBhcyBURWxlbWVudDtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FdmVudHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgTmlsLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NpZnksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGVuc3VyZVBvc2l0aXZlTnVtYmVyLFxuICAgIHN3aW5nLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNOb2RlRG9jdW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBnZXRPZmZzZXRTaXplIH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHtcbiAgICB3aW5kb3csXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxufSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIFtbRE9NXV1gLnNjcm9sbFRvKClgIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW0RPTV1dYC5zY3JvbGxUbygpYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01TY3JvbGxPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqIEBqYSDnuKbjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKi9cbiAgICB0b3A/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogQGphIOaoquOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqL1xuICAgIGxlZnQ/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqL1xuICAgIGR1cmF0aW9uPzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogQGphIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKi9cbiAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlcik7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgc2Nyb2xsIHRhcmdldCBlbGVtZW50ICovXG5mdW5jdGlvbiBxdWVyeVRhcmdldEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfSBlbHNlIGlmIChpc05vZGVEb2N1bWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdyA9PT0gZWwpIHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHNjcm9sbFRvKClgICovXG5mdW5jdGlvbiBwYXJzZUFyZ3MoLi4uYXJnczogYW55W10pOiBET01TY3JvbGxPcHRpb25zIHtcbiAgICBjb25zdCBvcHRpb25zOiBET01TY3JvbGxPcHRpb25zID0geyBlYXNpbmc6ICdzd2luZycgfTtcbiAgICBpZiAoMSA9PT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBhcmdzWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbbGVmdCwgdG9wLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFja10gPSBhcmdzO1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHtcbiAgICAgICAgICAgIHRvcCxcbiAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcHRpb25zLnRvcCAgICAgID0gZW5zdXJlUG9zaXRpdmVOdW1iZXIob3B0aW9ucy50b3ApO1xuICAgIG9wdGlvbnMubGVmdCAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmxlZnQpO1xuICAgIG9wdGlvbnMuZHVyYXRpb24gPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmR1cmF0aW9uKTtcblxuICAgIHJldHVybiBvcHRpb25zO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHNjcm9sbFRvKClgICovXG5mdW5jdGlvbiBleGVjU2Nyb2xsKGVsOiBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQsIG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICBjb25zdCB7IHRvcCwgbGVmdCwgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2sgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBpbml0aWFsVG9wID0gZWwuc2Nyb2xsVG9wO1xuICAgIGNvbnN0IGluaXRpYWxMZWZ0ID0gZWwuc2Nyb2xsTGVmdDtcbiAgICBsZXQgZW5hYmxlVG9wID0gaXNOdW1iZXIodG9wKTtcbiAgICBsZXQgZW5hYmxlTGVmdCA9IGlzTnVtYmVyKGxlZnQpO1xuXG4gICAgLy8gbm9uIGFuaW1hdGlvbiBjYXNlXG4gICAgaWYgKCFkdXJhdGlvbikge1xuICAgICAgICBsZXQgbm90aWZ5ID0gZmFsc2U7XG4gICAgICAgIGlmIChlbmFibGVUb3AgJiYgdG9wICE9PSBpbml0aWFsVG9wKSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxUb3AgPSB0b3AgYXMgbnVtYmVyO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5hYmxlTGVmdCAmJiBsZWZ0ICE9PSBpbml0aWFsTGVmdCkge1xuICAgICAgICAgICAgZWwuc2Nyb2xsTGVmdCA9IGxlZnQgYXMgbnVtYmVyO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90aWZ5ICYmIGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjTWV0cmljcyA9IChlbmFibGU6IGJvb2xlYW4sIGJhc2U6IG51bWJlciwgaW5pdGlhbFZhbHVlOiBudW1iZXIsIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IHsgbWF4OiBudW1iZXI7IG5ldzogbnVtYmVyOyBpbml0aWFsOiBudW1iZXI7IH0gPT4ge1xuICAgICAgICBpZiAoIWVuYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWF4OiAwLCBuZXc6IDAsIGluaXRpYWw6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXhWYWx1ZSA9IGVsW2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdIC0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gTWF0aC5tYXgoTWF0aC5taW4oYmFzZSwgbWF4VmFsdWUpLCAwKTtcbiAgICAgICAgcmV0dXJuIHsgbWF4OiBtYXhWYWx1ZSwgbmV3OiBuZXdWYWx1ZSwgaW5pdGlhbDogaW5pdGlhbFZhbHVlIH07XG4gICAgfTtcblxuICAgIGNvbnN0IG1ldHJpY3NUb3AgPSBjYWxjTWV0cmljcyhlbmFibGVUb3AsIHRvcCBhcyBudW1iZXIsIGluaXRpYWxUb3AsICdoZWlnaHQnKTtcbiAgICBjb25zdCBtZXRyaWNzTGVmdCA9IGNhbGNNZXRyaWNzKGVuYWJsZUxlZnQsIGxlZnQgYXMgbnVtYmVyLCBpbml0aWFsTGVmdCwgJ3dpZHRoJyk7XG5cbiAgICBpZiAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3ID09PSBtZXRyaWNzVG9wLmluaXRpYWwpIHtcbiAgICAgICAgZW5hYmxlVG9wID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChlbmFibGVMZWZ0ICYmIG1ldHJpY3NMZWZ0Lm5ldyA9PT0gbWV0cmljc0xlZnQuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVMZWZ0ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICghZW5hYmxlVG9wICYmICFlbmFibGVMZWZ0KSB7XG4gICAgICAgIC8vIG5lZWQgbm90IHRvIHNjcm9sbFxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FsY1Byb2dyZXNzID0gKHZhbHVlOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihlYXNpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZWFzaW5nKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAnbGluZWFyJyA9PT0gZWFzaW5nID8gdmFsdWUgOiBzd2luZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgZGVsdGEgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBhbmltYXRlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBlbGFwc2UgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGgubWF4KE1hdGgubWluKGVsYXBzZSAvIGR1cmF0aW9uLCAxKSwgMCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzQ29lZmYgPSBjYWxjUHJvZ3Jlc3MocHJvZ3Jlc3MpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBkZWx0YVxuICAgICAgICBpZiAoZW5hYmxlVG9wKSB7XG4gICAgICAgICAgICBkZWx0YS50b3AgPSBtZXRyaWNzVG9wLmluaXRpYWwgKyAocHJvZ3Jlc3NDb2VmZiAqIChtZXRyaWNzVG9wLm5ldyAtIG1ldHJpY3NUb3AuaW5pdGlhbCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0KSB7XG4gICAgICAgICAgICBkZWx0YS5sZWZ0ID0gbWV0cmljc0xlZnQuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NMZWZ0Lm5ldyAtIG1ldHJpY3NMZWZ0LmluaXRpYWwpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIGRvbmVcbiAgICAgICAgaWYgKChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPiBtZXRyaWNzVG9wLmluaXRpYWwgJiYgZGVsdGEudG9wID49IG1ldHJpY3NUb3AubmV3KSAgICAgICB8fCAvLyBzY3JvbGwgZG93blxuICAgICAgICAgICAgKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA8IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPD0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCB1cFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID4gbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0ID49IG1ldHJpY3NMZWZ0Lm5ldykgIHx8IC8vIHNjcm9sbCByaWdodFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3IDwgbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0IDw9IG1ldHJpY3NMZWZ0Lm5ldykgICAgIC8vIHNjcm9sbCBsZWZ0XG4gICAgICAgICkge1xuICAgICAgICAgICAgLy8gZW5zdXJlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICBlbmFibGVUb3AgJiYgKGVsLnNjcm9sbFRvcCA9IG1ldHJpY3NUb3AubmV3KTtcbiAgICAgICAgICAgIGVuYWJsZUxlZnQgJiYgKGVsLnNjcm9sbExlZnQgPSBtZXRyaWNzTGVmdC5uZXcpO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlbGVhc2UgcmVmZXJlbmNlIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgZWwgPSBudWxsITsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGUgc2Nyb2xsIHBvc2l0aW9uXG4gICAgICAgIGVuYWJsZVRvcCAmJiAoZWwuc2Nyb2xsVG9wID0gZGVsdGEudG9wKTtcbiAgICAgICAgZW5hYmxlTGVmdCAmJiAoZWwuc2Nyb2xsTGVmdCA9IGRlbHRhLmxlZnQpO1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcbiAgICB9O1xuXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIG1hbmlwdWxhdGlvbiBtZXRob2RzLlxuICogQGphIOOCueOCr+ODreODvOODq+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU2Nyb2xsPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU2Nyb2xsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb246IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUb3AoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxUb3AgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgdG9wOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg5qiq5pa55ZCR44K544Kv44Ot44O844Or44GV44KM44Gf44OU44Kv44K744Or5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NpdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxMZWZ0IDogMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsVG8oe1xuICAgICAgICAgICAgICAgIGxlZnQ6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5qiq5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0geFxuICAgICAqICAtIGBlbmAgdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0geVxuICAgICAqICAtIGBlbmAgdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhcbiAgICAgICAgeDogbnVtYmVyLFxuICAgICAgICB5OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBzY3JvbGwgdmFsdWVzIGJ5IG9wdG9pbnMuXG4gICAgICogQGphIOOCquODl+OCt+ODp+ODs+OCkueUqOOBhOOBpuOCueOCr+ODreODvOODq+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhvcHRpb25zOiBET01TY3JvbGxPcHRpb25zKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUbyguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gcGFyc2VBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBxdWVyeVRhcmdldEVsZW1lbnQoZWwpO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBleGVjU2Nyb2xsKGVsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU2Nyb2xsLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsIFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlLCBET00gfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3QgcGFyYW1ldGVyLlxuICogQGphIFtbRE9NXV0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdFBhcmFtZXRlcnMgPSBLZXlmcmFtZVtdIHwgUHJvcGVydHlJbmRleGVkS2V5ZnJhbWVzIHwgbnVsbDtcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3Qgb3B0aW9ucy5cbiAqIEBqYSBbW0RPTV1dIOOCqOODleOCp+OCr+ODiOWKueaenOOBruOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RPcHRpb25zID0gbnVtYmVyIHwgS2V5ZnJhbWVBbmltYXRpb25PcHRpb25zO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBjb250ZXh0IG9iamVjdC5cbiAqIEBqYSBbW0RPTV1dIOOBruOCqOODleOCp+OCr+ODiOWKueaenOOBruOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBbW0RPTV1dIGluc3RhbmNlIHRoYXQgY2FsbGVkIFtbYW5pbWF0ZV1dKCkgbWV0aG9kLlxuICAgICAqIEBqYSBbW2FuaW1hdGVdXSgpIOODoeOCveODg+ODieOCkuWun+ihjOOBl+OBnyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGRvbTogRE9NPFRFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYW5kIGBBbmltYXRpb25gIGluc3RhbmNlIG1hcCBieSBleGVjdXRpb24gW1thbmltYXRlXV0oKSBtZXRob2QgYXQgdGhpcyB0aW1lLlxuICAgICAqIEBqYSDku4rlm57lrp/ooYzjgZfjgZ8gYEVsZW1lbnRgIOOBqCBgQW5pbWF0aW9uYCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7jg57jg4Pjg5dcbiAgICAgKi9cbiAgICByZWFkb25seSBhbmltYXRpb25zOiBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGN1cnJlbnQgZmluaXNoZWQgUHJvbWlzZSBmb3IgdGhpcyBhbmltYXRpb24uXG4gICAgICogQGphIOWvvuixoeOCouODi+ODoeODvOOCt+ODp+ODs+OBrue1guS6huaZguOBq+eZuueBq+OBmeOCiyBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgZmluaXNoZWQ6IFByb21pc2U8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FuaW1Db250ZXh0TWFwID0gbmV3IFdlYWtNYXA8RWxlbWVudCwgU2V0PEFuaW1hdGlvbj4+KCk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgYW5pbWF0aW9uL2VmZmVjdCBtZXRob2RzLlxuICogQGphIOOCouODi+ODoeODvOOCt+ODp+ODsy/jgqjjg5Xjgqfjgq/jg4jmk43kvZzjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUVmZmVjdHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFZmZlY3RzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhcnQgYW5pbWF0aW9uIGJ5IGBXZWIgQW5pbWF0aW9uIEFQSWAuXG4gICAgICogQGphIGBXZWIgQW5pbWF0aW9uIEFQSWAg44KS55So44GE44Gm44Ki44OL44Oh44O844K344On44Oz44KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGUocGFyYW1zOiBET01FZmZlY3RQYXJhbWV0ZXJzLCBvcHRpb25zOiBET01FZmZlY3RPcHRpb25zKTogRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICBkb206IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD4sXG4gICAgICAgICAgICBhbmltYXRpb25zOiBuZXcgTWFwPFRFbGVtZW50LCBBbmltYXRpb24+KCksXG4gICAgICAgIH0gYXMgV3JpdGFibGU8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xuXG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmltID0gZWwuYW5pbWF0ZShwYXJhbXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsKSB8fCBuZXcgU2V0KCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5hZGQoYW5pbSk7XG4gICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLnNldChlbCwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmFuaW1hdGlvbnMuc2V0KGVsIGFzIE5vZGUgYXMgVEVsZW1lbnQsIGFuaW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5hbGwoWy4uLnJlc3VsdC5hbmltYXRpb25zLnZhbHVlcygpXS5tYXAoYW5pbSA9PiBhbmltLmZpbmlzaGVkKSkudGhlbigoKSA9PiByZXN1bHQpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLkuK3mraJcbiAgICAgKi9cbiAgICBwdWJsaWMgY2FuY2VsKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmNhbmNlbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF9hbmltQ29udGV4dE1hcC5kZWxldGUoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGaW5pc2ggY3VycmVudCBydW5uaW5nIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg54++5Zyo5a6f6KGM44GX44Gm44GE44KL44Ki44OL44Oh44O844K344On44Oz44KS57WC5LqGXG4gICAgICovXG4gICAgcHVibGljIGZpbmlzaCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYW5pbWF0aW9uIG9mIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5maW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBmaW5pc2gg44Gn44Gv56C05qOE44GX44Gq44GEXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRWZmZWN0cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cblxuaW1wb3J0IHsgbWl4aW5zIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIEVsZW1lbnRpZnlTZWVkLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBlbGVtZW50aWZ5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERPTUJhc2UgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgRE9NQXR0cmlidXRlcyB9IGZyb20gJy4vYXR0cmlidXRlcyc7XG5pbXBvcnQgeyBET01UcmF2ZXJzaW5nIH0gZnJvbSAnLi90cmF2ZXJzaW5nJztcbmltcG9ydCB7IERPTU1hbmlwdWxhdGlvbiB9IGZyb20gJy4vbWFuaXB1bGF0aW9uJztcbmltcG9ydCB7IERPTVN0eWxlcyB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCB7IERPTUV2ZW50cyB9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7IERPTVNjcm9sbCB9IGZyb20gJy4vc2Nyb2xsJztcbmltcG9ydCB7IERPTUVmZmVjdHMgfSBmcm9tICcuL2VmZmVjdHMnO1xuXG4vKipcbiAqIEBlbiBUaGlzIGludGVyZmFjZSBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m+OBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD5cbiAgICBleHRlbmRzIERPTUJhc2U8VD4sIERPTUF0dHJpYnV0ZXM8VD4sIERPTVRyYXZlcnNpbmc8VD4sIERPTU1hbmlwdWxhdGlvbjxUPiwgRE9NU3R5bGVzPFQ+LCBET01FdmVudHM8VD4sIERPTVNjcm9sbDxUPiwgRE9NRWZmZWN0czxUPlxueyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG5leHBvcnQgdHlwZSBET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gRWxlbWVudGlmeVNlZWQ8VD4gfCBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIERPTVJlc3VsdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPiA9IFQgZXh0ZW5kcyBET008RWxlbWVudEJhc2U+ID8gVCA6IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBET008VD4gOiBET008SFRNTEVsZW1lbnQ+KTtcbmV4cG9ydCB0eXBlIERPTUl0ZXJhdGVDYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IGJvb2xlYW4gfCB2b2lkO1xuXG4vKipcbiAqIEBlbiBUaGlzIGNsYXNzIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6bXG4gKlxuICogVU5TVVBQT1JURUQgTUVUSE9EIExJU1RcbiAqXG4gKiBbVHJhdmVyc2luZ11cbiAqICAuYWRkQmFjaygpXG4gKiAgLmVuZCgpXG4gKlxuICogW0VmZmVjdHNdXG4gKiAuc2hvdygpXG4gKiAuaGlkZSgpXG4gKiAudG9nZ2xlKClcbiAqIC5zdG9wKClcbiAqIC5jbGVhclF1ZXVlKClcbiAqIC5kZWxheSgpXG4gKiAuZGVxdWV1ZSgpXG4gKiAuZmFkZUluKClcbiAqIC5mYWRlT3V0KClcbiAqIC5mYWRlVG8oKVxuICogLmZhZGVUb2dnbGUoKVxuICogLnF1ZXVlKClcbiAqIC5zbGlkZURvd24oKVxuICogLnNsaWRlVG9nZ2xlKClcbiAqIC5zbGlkZVVwKClcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUNsYXNzIGV4dGVuZHMgbWl4aW5zKFxuICAgIERPTUJhc2UsXG4gICAgRE9NQXR0cmlidXRlcyxcbiAgICBET01UcmF2ZXJzaW5nLFxuICAgIERPTU1hbmlwdWxhdGlvbixcbiAgICBET01TdHlsZXMsXG4gICAgRE9NRXZlbnRzLFxuICAgIERPTVNjcm9sbCxcbiAgICBET01FZmZlY3RzLFxuKSB7XG4gICAgLyoqXG4gICAgICogcHJpdmF0ZSBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoZWxlbWVudHM6IEVsZW1lbnRCYXNlW10pIHtcbiAgICAgICAgc3VwZXIoZWxlbWVudHMpO1xuICAgICAgICAvLyBhbGwgc291cmNlIGNsYXNzZXMgaGF2ZSBubyBjb25zdHJ1Y3Rvci5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIFtbRE9NXV0gaW5zdGFuY2UgZnJvbSBgc2VsZWN0b3JgIGFyZy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChzZWxlY3RvciAmJiAhY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgYXMgYW55O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRE9NQ2xhc3MoKGVsZW1lbnRpZnkoc2VsZWN0b3IgYXMgRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQpKSkgYXMgYW55O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHNldHVwIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NQ2xhc3MgfSBmcm9tICcuL2NsYXNzJztcblxuLy8gaW5pdCBmb3Igc3RhdGljXG5zZXR1cChET01DbGFzcy5wcm90b3R5cGUsIERPTUNsYXNzLmNyZWF0ZSk7XG5cbmV4cG9ydCAqIGZyb20gJy4vZXhwb3J0cyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIGRlZmF1bHQgfSBmcm9tICcuL2V4cG9ydHMnO1xuIl0sIm5hbWVzIjpbInNhZmUiLCJkb2N1bWVudCIsImlzRnVuY3Rpb24iLCJjbGFzc05hbWUiLCJpc051bWJlciIsImRvYyIsImdldEdsb2JhbE5hbWVzcGFjZSIsIndpbmRvdyIsIiQiLCJpc0FycmF5IiwiaXNTdHJpbmciLCJ0b1R5cGVkRGF0YSIsImNhbWVsaXplIiwiZnJvbVR5cGVkRGF0YSIsInNldE1peENsYXNzQXR0cmlidXRlIiwibm9vcCIsImRvbSIsImRhc2hlcml6ZSIsImNsYXNzaWZ5IiwiQ3VzdG9tRXZlbnQiLCJtaXhpbnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUE7Ozs7SUFJQSxNQUFNLEdBQUcsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQyxNQUFNLEdBQUcsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0QyxNQUFNLEdBQUcsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUV6QyxNQUFNLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxHQUFHOztJQ1ZyQztBQUVBLElBZUE7Ozs7Ozs7Ozs7OztBQVlBLGFBQWdCLFVBQVUsQ0FBeUIsSUFBd0IsRUFBRSxPQUE2QjtRQUN0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
