/*!
 * @cdp/dom 0.9.16
 *   dom utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, coreUtils) { 'use strict';

    /*
     * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
     */
    /** @internal */ const window = coreUtils.safe(globalThis.window);
    /** @internal */ const document = coreUtils.safe(globalThis.document);
    /** @internal */ const CustomEvent = coreUtils.safe(globalThis.CustomEvent);
    /** @internal */ const requestAnimationFrame = coreUtils.safe(globalThis.requestAnimationFrame);

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
     */
    /**
     * @en Check the value-type is Window.
     * @ja Window 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isWindowContext(x) {
        return x?.parent instanceof Window;
    }
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
        context = context || document;
        const elements = [];
        try {
            if ('string' === typeof seed) {
                const html = seed.trim();
                if (html.startsWith('<') && html.endsWith('>')) {
                    // markup
                    const template = document.createElement('template');
                    template.innerHTML = html;
                    elements.push(...template.content.children);
                }
                else {
                    const selector = html;
                    if (coreUtils.isFunction(context.getElementById) && ('#' === selector[0]) && !/[ .<>:~]/.exec(selector)) {
                        // pure ID selector
                        const el = context.getElementById(selector.substring(1));
                        el && elements.push(el);
                    }
                    else if ('body' === selector) {
                        // body
                        elements.push(document.body);
                    }
                    else {
                        // other selectors
                        elements.push(...context.querySelectorAll(selector));
                    }
                }
            }
            else if (seed.nodeType || isWindowContext(seed)) {
                // Node/element, Window
                elements.push(seed);
            }
            else if (0 < seed.length && (seed[0].nodeType || isWindowContext(seed[0]))) {
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
     * @en Create Element array from seed arg. <br>
     *     And also lists for the `DocumentFragment` inside the `<template>` tag.
     * @ja 指定された Seed から Element 配列を作成 <br>
     *     `<template>` タグ内の `DocumentFragment` も列挙する
     *
     * @param seed
     *  - `en` Object(s) or the selector string which becomes origin of Element array.
     *  - `ja` Element 配列のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     * @returns Element[] based Node.
     */
    function rootify(seed, context) {
        const parse = (el, pool) => {
            const root = (el instanceof HTMLTemplateElement) ? el.content : el;
            pool.push(root);
            const templates = root.querySelectorAll('template');
            for (const t of templates) {
                parse(t, pool);
            }
        };
        const roots = [];
        for (const el of elementify(seed, context)) {
            parse(el, roots);
        }
        return roots;
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
        const doc = context || document;
        const script = doc.createElement('script');
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
            doc.head.appendChild(script).parentNode.removeChild(script); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            const retval = globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
            return retval;
        }
        finally {
            delete globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
        }
    }

    /* eslint-disable
        @typescript-eslint/no-namespace,
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
        isWindowContext,
        elementify,
        rootify,
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
        /**
         * @en Check target is `Node` and connected to` Document` or `ShadowRoot`.
         * @ja 対象が `Node` でありかつ `Document` または `ShadowRoot` に接続されているか判定
         *
         * @param el
         *  - `en` [[ElementBase]] instance
         *  - `ja` [[ElementBase]] インスタンス
         */
        get isConnected() {
            for (const el of this) {
                if (isNode(el) && el.isConnected) {
                    return true;
                }
            }
            return false;
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
                            value: undefined, // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
                            value: undefined, // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
        return !!(el && el.querySelector);
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
        return dom[0] instanceof Document;
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
        return isWindowContext(dom[0]);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Check the selector type is Nullish.
     * @ja Nullish セレクタであるか判定
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
        return selector instanceof Document;
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
        return isWindowContext(selector);
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
        @typescript-eslint/no-explicit-any,
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
                        coreUtils.assignValue(el, key, value);
                    }
                    else {
                        // multiple
                        for (const name of Object.keys(key)) {
                            if (name in el) {
                                coreUtils.assignValue(el, name, key[name]);
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
                        coreUtils.assignValue(data, prop, coreUtils.toTypedData(dataset[prop]));
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
                            coreUtils.assignValue(el.dataset, prop, coreUtils.fromTypedData(value));
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
        @typescript-eslint/no-explicit-any,
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
                if (isWindowContext(el)) {
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
                if (document === el) {
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
            const rootElement = document.documentElement;
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
            return document.createTextNode(node);
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
                    const fragment = document.createDocumentFragment();
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
            coreUtils.assignValue(retval, coreUtils.dasherize(key), props[key]);
        }
        return retval;
    }
    /** @internal helper for `css()` get props */
    function getDefaultView(el) {
        return (el.ownerDocument && el.ownerDocument.defaultView) || window;
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
            top: rect.top + view.scrollY,
            left: rect.left + view.scrollX,
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
        no-invalid-this,
        @typescript-eslint/no-explicit-any,
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
    /** @internal normalize event namespace */
    function normalizeEventNamespaces(event) {
        const namespaces = event.split('.');
        const main = namespaces.shift();
        if (!namespaces.length) {
            return main;
        }
        else {
            namespaces.sort();
            return `${main}.${namespaces.join('.')}`;
        }
    }
    /** @internal split event namespaces */
    function splitEventNamespaces(event) {
        const retval = [];
        const namespaces = event.split('.');
        const main = namespaces.shift();
        if (!namespaces.length) {
            retval.push({ type: main, namespace: '' });
        }
        else {
            namespaces.sort();
            const combos = [];
            for (let i = namespaces.length; i >= 1; i--) {
                combos.push(...coreUtils.combination(namespaces, i));
            }
            const signature = `.${namespaces.join('.')}.`;
            retval.push({ type: main, namespace: signature });
            for (const ns of combos) {
                retval.push({ type: `${main}.${ns.join('.')}`, namespace: signature });
            }
        }
        return retval;
    }
    /** @internal reverse resolution event namespaces */
    function resolveEventNamespaces(elem, event) {
        const retval = [];
        const namespaces = event.split('.');
        const main = namespaces.shift();
        const type = normalizeEventNamespaces(event);
        if (!namespaces.length) {
            retval.push({ type: main, namespace: '' });
        }
        else {
            const query = (context) => {
                if (context) {
                    const cookies = Object.keys(context);
                    const signatures = cookies.filter(cookie => {
                        return type === cookie.split("|" /* Const.COOKIE_SEPARATOR */)[0 /* Const.ADDRESS_EVENT */];
                    }).map(cookie => {
                        return cookie.split("|" /* Const.COOKIE_SEPARATOR */)[1 /* Const.ADDRESS_NAMESPACE */];
                    });
                    const siblings = cookies.filter(cookie => {
                        for (const signature of signatures) {
                            if (signature === cookie.split("|" /* Const.COOKIE_SEPARATOR */)[1 /* Const.ADDRESS_NAMESPACE */]) {
                                return true;
                            }
                        }
                        return false;
                    }).map(cookie => {
                        const seed = cookie.split("|" /* Const.COOKIE_SEPARATOR */);
                        return { type: seed[0 /* Const.ADDRESS_EVENT */], namespace: seed[1 /* Const.ADDRESS_NAMESPACE */] };
                    });
                    retval.push(...siblings);
                }
            };
            const { eventListeners, liveEventListeners } = _eventContextMap;
            query(eventListeners.get(elem));
            query(liveEventListeners.get(elem));
        }
        return retval;
    }
    /** @internal convert event cookie from event name, selector, options */
    function toCookie(event, namespace, selector, options) {
        const opts = { ...options };
        delete opts.once;
        return `${event}${"|" /* Const.COOKIE_SEPARATOR */}${namespace}${"|" /* Const.COOKIE_SEPARATOR */}${JSON.stringify(opts)}${"|" /* Const.COOKIE_SEPARATOR */}${selector}`;
    }
    /** @internal get listener handlers context by element and event */
    function getEventListenersHandlers(elem, event, namespace, selector, options, ensure) {
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
        const cookie = toCookie(event, namespace, selector, options);
        if (!context[cookie]) {
            context[cookie] = {
                registered: new Set(),
                handlers: [],
            };
        }
        return context[cookie];
    }
    /** @internal query all event and handler by element, for all `off()` and `clone(true)` */
    function extractAllHandlers(elem, remove = true) {
        const handlers = [];
        const query = (context) => {
            if (context) {
                for (const cookie of Object.keys(context)) {
                    const seed = cookie.split("|" /* Const.COOKIE_SEPARATOR */);
                    const event = seed[0 /* Const.ADDRESS_EVENT */];
                    const options = JSON.parse(seed[2 /* Const.ADDRESS_OPTIONS */]);
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
    /** @internal query namespace event and handler by element, for `off(`.${namespace}`)` */
    function extractNamespaceHandlers(elem, namespaces) {
        const handlers = [];
        const names = namespaces.split('.').filter(n => !!n);
        const namespaceFilter = (cookie) => {
            for (const namespace of names) {
                if (cookie.includes(`.${namespace}.`)) {
                    return true;
                }
            }
            return false;
        };
        const query = (context) => {
            if (context) {
                const cookies = Object.keys(context).filter(namespaceFilter);
                for (const cookie of cookies) {
                    const seed = cookie.split("|" /* Const.COOKIE_SEPARATOR */);
                    const event = seed[0 /* Const.ADDRESS_EVENT */];
                    const options = JSON.parse(seed[2 /* Const.ADDRESS_OPTIONS */]);
                    const { registered, handlers: _handlers } = context[cookie];
                    for (const handler of _handlers) {
                        handlers.push({ event, handler: handler.proxy, options });
                        registered.delete(handler.listener);
                    }
                }
            }
        };
        const { eventListeners, liveEventListeners } = _eventContextMap;
        query(eventListeners.get(elem));
        query(liveEventListeners.get(elem));
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
    /** @internal helper for self event manage */
    function handleSelfEvent(self, callback, eventName, permanent) {
        function fireCallBack(e) {
            if (e.target !== this) {
                return;
            }
            callback.call(this, e);
            if (!permanent) {
                self.off(eventName, fireCallBack);
            }
        }
        coreUtils.isFunction(callback) && self.on(eventName, fireCallBack);
        return self;
    }
    //__________________________________________________________________________________________________//
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
                for (const event of events) {
                    const combos = splitEventNamespaces(event);
                    for (const combo of combos) {
                        const { type, namespace } = combo;
                        const { registered, handlers } = getEventListenersHandlers(el, type, namespace, selector, options, true);
                        if (registered && !registered.has(listener)) {
                            registered.add(listener);
                            handlers.push({
                                listener,
                                proxy,
                            });
                            el.addEventListener(type, proxy, options);
                        }
                    }
                }
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
                for (const el of this) {
                    for (const event of events) {
                        if (event.startsWith('.')) {
                            const contexts = extractNamespaceHandlers(el, event);
                            for (const context of contexts) {
                                el.removeEventListener(context.event, context.handler, context.options);
                            }
                        }
                        else {
                            const combos = resolveEventNamespaces(el, event);
                            for (const combo of combos) {
                                const { type, namespace } = combo;
                                const { registered, handlers } = getEventListenersHandlers(el, type, namespace, selector, options, false);
                                if (0 < handlers.length) {
                                    for (let i = handlers.length - 1; i >= 0; i--) { // backward operation
                                        const handler = handlers[i];
                                        if ((listener && handler.listener === listener) ||
                                            (listener && handler.listener && handler.listener.origin && handler.listener.origin === listener) ||
                                            (!listener)) {
                                            el.removeEventListener(type, handler.proxy, options);
                                            handlers.splice(i, 1);
                                            registered.delete(handler.listener);
                                        }
                                    }
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
         * @example <br>
         *
         * ```ts
         * // w/ event-namespace behaviour
         * $('.link').on('click.hoge.piyo', (e) => { ... });
         * $('.link').on('click.hoge',  (e) => { ... });
         *
         * $('.link').trigger('.hoge');           // compile error. (not fire)
         * $('.link').trigger('click.hoge');      // fire both.
         * $('.link').trigger('click.hoge.piyo'); // fire only first one
         * ```
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
                    return new CustomEvent(normalizeEventNamespaces(arg), {
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
         * @en Shortcut for [[once]]('transitionstart').
         * @ja [[once]]('transitionstart') のユーティリティ
         *
         * @param callback
         *  - `en` `transitionstart` handler.
         *  - `ja` `transitionstart` ハンドラ
         * @param permanent
         *  - `en` if set `true`, callback keep living until elements removed.
         *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
         */
        transitionStart(callback, permanent = false) {
            return handleSelfEvent(this, callback, 'transitionstart', permanent);
        }
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
            return handleSelfEvent(this, callback, 'transitionend', permanent);
        }
        /**
         * @en Shortcut for [[once]]('animationstart').
         * @ja [[once]]('animationstart') のユーティリティ
         *
         * @param callback
         *  - `en` `animationstart` handler.
         *  - `ja` `animationstart` ハンドラ
         * @param permanent
         *  - `en` if set `true`, callback keep living until elements removed.
         *  - `ja` `true` を設定した場合, 要素が削除されるまでコールバックが有効
         */
        animationStart(callback, permanent = false) {
            return handleSelfEvent(this, callback, 'animationstart', permanent);
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
            return handleSelfEvent(this, callback, 'animationend', permanent);
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
        else if (isWindowContext(el)) {
            return el.document.documentElement;
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
        // public: Effects animation
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
        ///////////////////////////////////////////////////////////////////////
        // public: Effects utility
        /**
         * @en Execute force reflow.
         * @ja 強制リフローを実行
         */
        reflow() {
            if (this[0] instanceof HTMLElement) {
                for (const el of this) {
                    coreUtils.noop(el.offsetHeight);
                }
            }
            return this;
        }
        /**
         * @en Execute force repaint.
         * @ja 強制再描画を実行
         */
        repaint() {
            if (this[0] instanceof HTMLElement) {
                for (const el of this) {
                    const current = el.style.display;
                    el.style.display = 'none';
                    el.style.display = current;
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
                if (isDOMClass(selector)) {
                    return selector;
                }
            }
            return new DOMClass((elementify(selector, context)));
        }
    }
    // mixin による `instanceof` は無効に設定
    coreUtils.setMixClassAttribute(DOMClass, 'instanceOf', null);
    /**
     * @en Check the value-type is [[DOM]].
     * @ja [[DOM]] 型であるか判定
     *
     * @param x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     */
    function isDOMClass(x) {
        return x instanceof DOMClass;
    }

    // init for static
    setup(DOMClass.prototype, DOMClass.create);

    exports.default = dom;
    exports.dom = dom;
    exports.isDOMClass = isDOMClass;

    Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJhdHRyaWJ1dGVzLnRzIiwidHJhdmVyc2luZy50cyIsIm1hbmlwdWxhdGlvbi50cyIsInN0eWxlcy50cyIsImV2ZW50cy50cyIsInNjcm9sbC50cyIsImVmZmVjdHMudHMiLCJjbGFzcy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyAgICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZG9jdW1lbnQgICAgICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEN1c3RvbUV2ZW50ICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5DdXN0b21FdmVudCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBzYWZlKGdsb2JhbFRoaXMucmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIE51bGxpc2gsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNGdW5jdGlvbixcbiAgICBjbGFzc05hbWUsXG4gICAgZ2V0R2xvYmFsTmFtZXNwYWNlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbmV4cG9ydCB0eXBlIEVsZW1lbnRCYXNlID0gTm9kZSB8IFdpbmRvdztcbmV4cG9ydCB0eXBlIEVsZW1lbnRSZXN1bHQ8VD4gPSBUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogSFRNTEVsZW1lbnQ7XG5leHBvcnQgdHlwZSBTZWxlY3RvckJhc2UgPSBOb2RlIHwgV2luZG93IHwgc3RyaW5nIHwgTnVsbGlzaDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBUIHwgKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFRbXSA6IG5ldmVyKSB8IE5vZGVMaXN0T2Y8VCBleHRlbmRzIE5vZGUgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgUXVlcnlDb250ZXh0ID0gUGFyZW50Tm9kZSAmIFBhcnRpYWw8Tm9uRWxlbWVudFBhcmVudE5vZGU+O1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBXaW5kb3cuXG4gKiBAamEgV2luZG93IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93Q29udGV4dCh4OiB1bmtub3duKTogeCBpcyBXaW5kb3cge1xuICAgIHJldHVybiAoeCBhcyBXaW5kb3cpPy5wYXJlbnQgaW5zdGFuY2VvZiBXaW5kb3c7XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBFbGVtZW50IGFycmF5IGZyb20gc2VlZCBhcmcuXG4gKiBAamEg5oyH5a6a44GV44KM44GfIFNlZWQg44GL44KJIEVsZW1lbnQg6YWN5YiX44KS5L2c5oiQXG4gKlxuICogQHBhcmFtIHNlZWRcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRWxlbWVudCBhcnJheS5cbiAqICAtIGBqYWAgRWxlbWVudCDphY3liJfjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIGNvbnRleHRcbiAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gKiBAcmV0dXJucyBFbGVtZW50W10gYmFzZWQgTm9kZSBvciBXaW5kb3cgb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZWxlbWVudGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdIHtcbiAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnRleHQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcblxuICAgIHRyeSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHNlZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBzZWVkLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChodG1sLnN0YXJ0c1dpdGgoJzwnKSAmJiBodG1sLmVuZHNXaXRoKCc+JykpIHtcbiAgICAgICAgICAgICAgICAvLyBtYXJrdXBcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLnRlbXBsYXRlLmNvbnRlbnQuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IGh0bWw7XG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dC5nZXRFbGVtZW50QnlJZCkgJiYgKCcjJyA9PT0gc2VsZWN0b3JbMF0pICYmICEvWyAuPD46fl0vLmV4ZWMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHB1cmUgSUQgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWwgPSBjb250ZXh0LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9yLnN1YnN0cmluZygxKSk7XG4gICAgICAgICAgICAgICAgICAgIGVsICYmIGVsZW1lbnRzLnB1c2goZWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2JvZHknID09PSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBib2R5XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goZG9jdW1lbnQuYm9keSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXIgc2VsZWN0b3JzXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uY29udGV4dC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKChzZWVkIGFzIE5vZGUpLm5vZGVUeXBlIHx8IGlzV2luZG93Q29udGV4dChzZWVkKSkge1xuICAgICAgICAgICAgLy8gTm9kZS9lbGVtZW50LCBXaW5kb3dcbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goc2VlZCBhcyBOb2RlIGFzIEVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKDAgPCAoc2VlZCBhcyBUW10pLmxlbmd0aCAmJiAoc2VlZFswXS5ub2RlVHlwZSB8fCBpc1dpbmRvd0NvbnRleHQoc2VlZFswXSkpKSB7XG4gICAgICAgICAgICAvLyBhcnJheSBvZiBlbGVtZW50cyBvciBjb2xsZWN0aW9uIG9mIERPTVxuICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi4oc2VlZCBhcyBOb2RlW10gYXMgRWxlbWVudFtdKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgZWxlbWVudGlmeSgke2NsYXNzTmFtZShzZWVkKX0sICR7Y2xhc3NOYW1lKGNvbnRleHQpfSksIGZhaWxlZC4gW2Vycm9yOiR7ZX1dYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnRzIGFzIEVsZW1lbnRSZXN1bHQ8VD5bXTtcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIEVsZW1lbnQgYXJyYXkgZnJvbSBzZWVkIGFyZy4gPGJyPlxuICogICAgIEFuZCBhbHNvIGxpc3RzIGZvciB0aGUgYERvY3VtZW50RnJhZ21lbnRgIGluc2lkZSB0aGUgYDx0ZW1wbGF0ZT5gIHRhZy5cbiAqIEBqYSDmjIflrprjgZXjgozjgZ8gU2VlZCDjgYvjgokgRWxlbWVudCDphY3liJfjgpLkvZzmiJAgPGJyPlxuICogICAgIGA8dGVtcGxhdGU+YCDjgr/jgrDlhoXjga4gYERvY3VtZW50RnJhZ21lbnRgIOOCguWIl+aMmeOBmeOCi1xuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb290aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBFbGVtZW50UmVzdWx0PFQ+W10ge1xuICAgIGNvbnN0IHBhcnNlID0gKGVsOiBFbGVtZW50LCBwb29sOiBQYXJlbnROb2RlW10pOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3Qgcm9vdCA9IChlbCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpID8gZWwuY29udGVudCA6IGVsO1xuICAgICAgICBwb29sLnB1c2gocm9vdCk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlcyA9IHJvb3QucXVlcnlTZWxlY3RvckFsbCgndGVtcGxhdGUnKTtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIHRlbXBsYXRlcykge1xuICAgICAgICAgICAgcGFyc2UodCwgcG9vbCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgcm9vdHM6IFBhcmVudE5vZGVbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBlbCBvZiBlbGVtZW50aWZ5KHNlZWQsIGNvbnRleHQpKSB7XG4gICAgICAgIHBhcnNlKGVsIGFzIEVsZW1lbnQsIHJvb3RzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBGb3IgZWFzaW5nIGBzd2luZ2AgdGltaW5nLWZ1bmN0aW9uLlxuICogQGphIGVhc2luZyBgc3dpbmdgIOeUqOOCv+OCpOODn+ODs+OCsOmWouaVsFxuICpcbiAqIEByZWZlcmVuY2VcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkyNDUwMzAvbG9va2luZy1mb3ItYS1zd2luZy1saWtlLWVhc2luZy1leHByZXNzaWJsZS1ib3RoLXdpdGgtanF1ZXJ5LWFuZC1jc3MzXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81MjA3MzAxL2pxdWVyeS1lYXNpbmctZnVuY3Rpb25zLXdpdGhvdXQtdXNpbmctYS1wbHVnaW5cbiAqXG4gKiBAcGFyYW0gcHJvZ3Jlc3MgWzAgLSAxXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpbmcocHJvZ3Jlc3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNSAtIChNYXRoLmNvcyhwcm9ncmVzcyAqIE1hdGguUEkpIC8gMik7XG59XG5cbi8qKlxuICogQGVuIFtbZXZhbHVhdGVdXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tldmFsdWF0ZV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZhbE9wdGlvbnMge1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgc3JjPzogc3RyaW5nO1xuICAgIG5vbmNlPzogc3RyaW5nO1xuICAgIG5vTW9kdWxlPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyaXB0c0F0dHJzOiAoa2V5b2YgRXZhbE9wdGlvbnMpW10gPSBbXG4gICAgJ3R5cGUnLFxuICAgICdzcmMnLFxuICAgICdub25jZScsXG4gICAgJ25vTW9kdWxlJyxcbl07XG5cbi8qKlxuICogQGVuIFRoZSBgZXZhbGAgZnVuY3Rpb24gYnkgd2hpY2ggc2NyaXB0IGBub25jZWAgYXR0cmlidXRlIGNvbnNpZGVyZWQgdW5kZXIgdGhlIENTUCBjb25kaXRpb24uXG4gKiBAamEgQ1NQIOeSsOWig+OBq+OBiuOBhOOBpuOCueOCr+ODquODl+ODiCBgbm9uY2VgIOWxnuaAp+OCkuiAg+aFruOBl+OBnyBgZXZhbGAg5a6f6KGM6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnkge1xuICAgIGNvbnN0IGRvYzogRG9jdW1lbnQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQudGV4dCA9IGBDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSA9ICgoKSA9PiB7IHJldHVybiAke2NvZGV9OyB9KSgpO2A7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgX3NjcmlwdHNBdHRycykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gb3B0aW9uc1thdHRyXSB8fCAoKG9wdGlvbnMgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlICYmIChvcHRpb25zIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyKSk7XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIHRyeSB7XG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZSgnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnKTtcbiAgICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KS5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChzY3JpcHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgcmV0dmFsID0gZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIEV2YWxPcHRpb25zLFxuICAgIGlzV2luZG93Q29udGV4dCxcbiAgICBlbGVtZW50aWZ5LFxuICAgIHJvb3RpZnksXG4gICAgZXZhbHVhdGUsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTUNsYXNzLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG59IGZyb20gJy4vY2xhc3MnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBkb20ge1xuICAgIGxldCBmbjogRE9NQ2xhc3M7XG59XG5cbmV4cG9ydCB0eXBlIERPTUZhY3RvcnkgPSA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpID0+IERPTVJlc3VsdDxUPjtcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2ZhY3RvcnkhOiBET01GYWN0b3J5O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgW1tET01dXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gZG9tPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICByZXR1cm4gX2ZhY3Rvcnkoc2VsZWN0b3IsIGNvbnRleHQpO1xufVxuXG5kb20udXRpbHMgPSB7XG4gICAgaXNXaW5kb3dDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG4gICAgcm9vdGlmeSxcbiAgICBldmFsdWF0ZSxcbn07XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzLCBmYWN0b3J5OiBET01GYWN0b3J5KTogdm9pZCB7XG4gICAgX2ZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIGRvbS5mbiA9IGZuO1xufVxuXG5leHBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgRE9NLFxuICAgIERPTVBsdWdpbixcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSxcbn07XG4iLCJpbXBvcnQgeyBOdWxsaXNoIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGlzV2luZG93Q29udGV4dCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZS1pdGVyYWJsZS1pdGVyYXRvcicpO1xuXG4vKipcbiAqIEBlbiBCYXNlIGFic3RyYWN0aW9uIGNsYXNzIG9mIFtbRE9NQ2xhc3NdXS4gVGhpcyBjbGFzcyBwcm92aWRlcyBpdGVyYXRvciBtZXRob2RzLlxuICogQGphIFtbRE9NQ2xhc3NdXSDjga7ln7rlupXmir3osaHjgq/jg6njgrkuIGl0ZXJhdG9yIOOCkuaPkOS+my5cbiAqL1xuZXhwb3J0IGNsYXNzIERPTUJhc2U8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIEFycmF5TGlrZTxUPiwgSXRlcmFibGU8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBudW1iZXIgb2YgYEVsZW1lbnRgXG4gICAgICogQGphIOWGheWMheOBmeOCiyBgRWxlbWVudGAg5pWwXG4gICAgICovXG4gICAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYEVsZW1lbnRgIGFjY2Vzc29yXG4gICAgICogQGphIGBFbGVtZW50YCDjgbjjga7mt7vjgYjlrZfjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVDtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBUW10pIHtcbiAgICAgICAgY29uc3Qgc2VsZjogRE9NQWNjZXNzPFQ+ID0gdGhpcztcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsZW1dIG9mIGVsZW1lbnRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgc2VsZltpbmRleF0gPSBlbGVtO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGVuZ3RoID0gZWxlbWVudHMubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYE5vZGVgIGFuZCBjb25uZWN0ZWQgdG9gIERvY3VtZW50YCBvciBgU2hhZG93Um9vdGAuXG4gICAgICogQGphIOWvvuixoeOBjCBgTm9kZWAg44Gn44GC44KK44GL44GkIGBEb2N1bWVudGAg44G+44Gf44GvIGBTaGFkb3dSb290YCDjgavmjqXntprjgZXjgozjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFxuICAgICAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gICAgICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgZ2V0IGlzQ29ubmVjdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2YgW1tFbGVtZW50QmFzZV1dIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOagvOe0jeOBl+OBpuOBhOOCiyBbW0VsZW1lbnRCYXNlXV0g44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VD4ge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxUPiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRlciA8IHRoaXMuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYmFzZVt0aGlzLnBvaW50ZXIrK10sXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yIGFzIEl0ZXJhdG9yPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSwgdmFsdWUoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpbmRleCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlcikgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihjdXJyZW50LCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQmFzZSBpbnRlcmZhY2UgZm9yIERPTSBNaXhpbiBjbGFzcy5cbiAqIEBqYSBET00gTWl4aW4g44Kv44Op44K544Gu5pei5a6a44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NSXRlcmFibGU8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+IGV4dGVuZHMgUGFydGlhbDxET01CYXNlPFQ+PiB7XG4gICAgbGVuZ3RoOiBudW1iZXI7XG4gICAgW246IG51bWJlcl06IFQ7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFQ+O1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbCBET00gYWNjZXNzXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgIGNvbnN0IGRvbTogRE9NQWNjZXNzPFRFbGVtZW50PiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NQWNjZXNzPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NPFQ+PiB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlXG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYE5vZGVgLlxuICogQGphIOWvvuixoeOBjCBgTm9kZWAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGUoZWw6IHVua25vd24pOiBlbCBpcyBOb2RlIHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUpLm5vZGVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEVsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgRWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBlbC5ub2RlVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgSFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YCBvciBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44G+44Gf44GvIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVRdWVyaWFibGUoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIEVsZW1lbnQgfCBEb2N1bWVudCB7XG4gICAgcmV0dXJuICEhKGVsICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLnF1ZXJ5U2VsZWN0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYERvY3VtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZURvY3VtZW50KGVsOiBFbGVtZW50QmFzZSB8IE51bGxpc2gpOiBlbCBpcyBEb2N1bWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRE9DVU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgSFRNTEVsZW1lbnRgIOOBvuOBn+OBryBgU1ZHRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlSFRNTE9yU1ZHRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRG9jdW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9tWzBdIGluc3RhbmNlb2YgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIFtbRE9NXV0gdGFyZ2V0IGlzIGBXaW5kb3dgLlxuICogQGphIFtbRE9NXV0g44GMIGBXaW5kb3dgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZVdpbmRvdyhkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxXaW5kb3c+IHtcbiAgICByZXR1cm4gaXNXaW5kb3dDb250ZXh0KGRvbVswXSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOdWxsaXNoLlxuICogQGphIE51bGxpc2gg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOdWxsaXNoPiB7XG4gICAgcmV0dXJuICFzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmdTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBzdHJpbmc+IHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiBzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTm9kZS5cbiAqIEBqYSBOb2RlIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlPiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIE5vZGUpLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBFbGVtZW50LlxuICogQGphIEVsZW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRWxlbWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBFbGVtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBEb2N1bWVudC5cbiAqIEBqYSBEb2N1bWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEb2N1bWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERvY3VtZW50PiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFdpbmRvdy5cbiAqIEBqYSBXaW5kb3cg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgV2luZG93PiB7XG4gICAgcmV0dXJuIGlzV2luZG93Q29udGV4dChzZWxlY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciBpcyBhYmxlIHRvIGl0ZXJhdGUuXG4gKiBAamEg6LWw5p+75Y+v6IO944Gq44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlTGlzdE9mPE5vZGU+PiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIFRbXSkubGVuZ3RoO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBbW0RPTV1dLlxuICogQGphIFtbRE9NXV0g44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE9NU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRE9NPiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQmFzZTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIG5vZGUgbmFtZSBpcyBhcmd1bWVudC5cbiAqIEBqYSBOb2RlIOWQjeOBjOW8leaVsOOBp+S4juOBiOOBn+WQjeWJjeOBqOS4gOiHtOOBmeOCi+OBi+WIpOWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9kZU5hbWUoZWxlbTogTm9kZSB8IG51bGwsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIShlbGVtICYmIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmFtZS50b0xvd2VyQ2FzZSgpKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IG5vZGUgb2Zmc2V0IHBhcmVudC4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNldCBwYXJlbnQg44Gu5Y+W5b6XLiBTVkdFbGVtZW50IOOBq+OCgumBqeeUqOWPr+iDvVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KG5vZGU6IE5vZGUpOiBFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKChub2RlIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRQYXJlbnQpIHtcbiAgICAgICAgcmV0dXJuIChub2RlIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRQYXJlbnQ7XG4gICAgfSBlbHNlIGlmIChub2RlTmFtZShub2RlLCAnc3ZnJykpIHtcbiAgICAgICAgY29uc3QgJHN2ZyA9ICQobm9kZSk7XG4gICAgICAgIGNvbnN0IGNzc1Byb3BzID0gJHN2Zy5jc3MoWydkaXNwbGF5JywgJ3Bvc2l0aW9uJ10pO1xuICAgICAgICBpZiAoJ25vbmUnID09PSBjc3NQcm9wcy5kaXNwbGF5IHx8ICdmaXhlZCcgPT09IGNzc1Byb3BzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnQgPSAkc3ZnWzBdLnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkaXNwbGF5LCBwb3NpdGlvbiB9ID0gJChwYXJlbnQpLmNzcyhbJ2Rpc3BsYXknLCAncG9zaXRpb24nXSk7XG4gICAgICAgICAgICAgICAgaWYgKCdub25lJyA9PT0gZGlzcGxheSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFwb3NpdGlvbiB8fCAnc3RhdGljJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIFVua25vd25PYmplY3QsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgYXNzaWduVmFsdWUsXG4gICAgY2FtZWxpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NVmFsdWVUeXBlPFQsIEsgPSAndmFsdWUnPiA9IFQgZXh0ZW5kcyBIVE1MU2VsZWN0RWxlbWVudCA/IChzdHJpbmcgfCBzdHJpbmdbXSkgOiBLIGV4dGVuZHMga2V5b2YgVCA/IFRbS10gOiBzdHJpbmc7XG5leHBvcnQgdHlwZSBET01EYXRhID0gUGxhaW5PYmplY3Q8VHlwZWREYXRhPjtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTFNlbGVjdEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAnc2VsZWN0JyA9PT0gZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAmJiAoZWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLm11bHRpcGxlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc0lucHV0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MSW5wdXRFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhdHRyaWJ1dGVzIG1ldGhvZHMuXG4gKiBAamEg5bGe5oCn5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01BdHRyaWJ1dGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENsYXNzZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGFkZENsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGFueSBvZiB0aGUgbWF0Y2hlZCBlbGVtZW50cyBhcmUgYXNzaWduZWQgdGhlIGdpdmVuIGNsYXNzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLlsJHjgarjgY/jgajjgoLopoHntKDjgYzmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWVcbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDbGFzcyhjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSAmJiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG9yIHJlbW92ZSBvbmUgb3IgbW9yZSBjbGFzc2VzIGZyb20gZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICBkZXBlbmRpbmcgb24gZWl0aGVyIHRoZSBjbGFzcydzIHByZXNlbmNlIG9yIHRoZSB2YWx1ZSBvZiB0aGUgc3RhdGUgYXJndW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBrueKtuaFi+OBq+W/nOOBmOOBpiwg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS6KaB57Sg44Gr6L+95YqgL+WJiumZpOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBmb3JjZVxuICAgICAqICAtIGBlbmAgaWYgdGhpcyBhcmd1bWVudCBleGlzdHMsIHRydWU6IHRoZSBjbGFzc2VzIHNob3VsZCBiZSBhZGRlZCAvIGZhbHNlOiByZW1vdmVkLlxuICAgICAqICAtIGBqYWAg5byV5pWw44GM5a2Y5Zyo44GZ44KL5aC05ZCILCB0cnVlOiDjgq/jg6njgrnjgpLov73liqAgLyBmYWxzZTog44Kv44Op44K544KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHRvZ2dsZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGZvcmNlPzogYm9vbGVhbik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNsYXNzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LnRvZ2dsZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwcm9wZXJ0eSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBUKTogVEVsZW1lbnRbVF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgdmFsdWVcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+ODl+ODreODkeODhuOCo+WApFxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBULCB2YWx1ZTogVEVsZW1lbnRbVF0pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBwcm9wZXJ0eSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIHByb3BlcnR5LXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihrZXk6IFQgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBURWxlbWVudFtUXSk6IFRFbGVtZW50W1RdIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHByb3BlcnR5XG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gZmlyc3QgJiYgZmlyc3Rba2V5IGFzIHN0cmluZ107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgcHJvcGVydHlcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShlbCBhcyB1bmtub3duIGFzIFVua25vd25PYmplY3QsIGtleSBhcyBzdHJpbmcsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBtdWx0aXBsZVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShlbCBhcyB1bmtub3duIGFzIFVua25vd25PYmplY3QsIG5hbWUsIGtleVtuYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhdHRyaWJ1dGUgdmFsdWUuIDxicj5cbiAgICAgKiAgICAgVGhlIG1ldGhvZCBnZXRzIHRoZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDlsZ7mgKflgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIGF0dHJpYnV0ZSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSB2YWx1ZS4gaWYgYG51bGxgIHNldCwgcmVtb3ZlIGF0dHJpYnV0ZS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WxnuaAp+WApC4gYG51bGxgIOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiOWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbXVsdGkgYXR0cmlidXRlIHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgYXR0cmlidXRlLXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIGF0dHJpYnV0ZS12YWx1ZSDjg5rjgqLjgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgYXR0cihrZXk6IHN0cmluZyB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQgPT09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmICh1bmRlZmluZWQgPT09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKGtleSk7XG4gICAgICAgICAgICByZXR1cm4gKG51bGwgIT0gYXR0cikgPyBhdHRyIDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYXR0cmlidXRlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVBdHRyKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IGF0dHJpYnV0ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXkgYXMgc3RyaW5nLCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGtleVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgU3RyaW5nKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgYXR0cmlidXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/lsZ7mgKfjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGUgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgb7jgZ/jga/lsZ7mgKflkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlQXR0cihuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF0dHJzID0gaXNBcnJheShuYW1lKSA/IG5hbWUgOiBbbmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBWYWx1ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSB2YWx1ZSDlgKTjga7lj5blvpcuIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4oKTogRE9NVmFsdWVUeXBlPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgdmFsdWUgb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgaYgdmFsdWUg5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU6IERPTVZhbHVlVHlwZTxUPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZT86IERPTVZhbHVlVHlwZTxUPik6IGFueSB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLnNlbGVjdGVkT3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMucHVzaChvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgndmFsdWUnIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbCBhcyBhbnkpLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBubyBzdXBwb3J0IHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSAodmFsdWUgYXMgc3RyaW5nW10pLmluY2x1ZGVzKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW5wdXRFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBEYXRhXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZXMgYWxsIGBET01TdHJpbmdNYXBgIHN0b3JlIHNldCBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIEhUTUw1IGRhdGEtKiDlsZ7mgKfjgacgYERPTVN0cmluZ01hcGAg44Gr5qC857SN44GV44KM44Gf5YWo44OH44O844K/5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGRhdGEoKTogRE9NRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlIGF0IHRoZSBuYW1lZCBkYXRhIHN0b3JlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbiwgYXMgc2V0IGJ5IGRhdGEoa2V5LCB2YWx1ZSkgb3IgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIGtleSDjgafmjIflrprjgZfjgZ8gSFRNTDUgZGF0YS0qIOWxnuaAp+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvcmUgYXJiaXRyYXJ5IGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabku7vmhI/jga7jg4fjg7zjgr/jgpLmoLzntI1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgZGF0YSB2YWx1ZSAobm90IG9ubHkgYHN0cmluZ2ApXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmjIflrpogKOaWh+Wtl+WIl+S7peWkluOCguWPl+S7mOWPrylcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZywgdmFsdWU6IFR5cGVkRGF0YSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGF0YShrZXk/OiBzdHJpbmcsIHZhbHVlPzogVHlwZWREYXRhKTogRE9NRGF0YSB8IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBzdXBwb3J0ZWQgZGF0YXNldCBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgZGF0YXNldFxuICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IHRoaXNbMF0uZGF0YXNldDtcbiAgICAgICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBhbGwgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGE6IERPTURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoZGF0YXNldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoZGF0YSwgcHJvcCwgdG9UeXBlZERhdGEoZGF0YXNldFtwcm9wXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gdHlwZWQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9UeXBlZERhdGEoZGF0YXNldFtjYW1lbGl6ZShrZXkpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSBjYW1lbGl6ZShrZXkgfHwgJycpO1xuICAgICAgICAgICAgaWYgKHByb3ApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShlbC5kYXRhc2V0IGFzIHVua25vd24gYXMgVW5rbm93bk9iamVjdCwgcHJvcCwgZnJvbVR5cGVkRGF0YSh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBkYXRhLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/jg4fjg7zjgr/jgpLjg4fjg7zjgr/poJjln5/jgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVEYXRhKGtleTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkoa2V5KSA/IGtleS5tYXAoayA9PiBjYW1lbGl6ZShrKSkgOiBbY2FtZWxpemUoa2V5KV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkYXRhc2V0IH0gPSBlbDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFzZXRbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQXR0cmlidXRlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgbm9vcCxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgaXNXaW5kb3dDb250ZXh0IH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NQmFzZSxcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVRdWVyaWFibGUsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG4gICAgaXNFbXB0eVNlbGVjdG9yLFxuICAgIGlzU3RyaW5nU2VsZWN0b3IsXG4gICAgaXNEb2N1bWVudFNlbGVjdG9yLFxuICAgIGlzV2luZG93U2VsZWN0b3IsXG4gICAgaXNOb2RlU2VsZWN0b3IsXG4gICAgaXNJdGVyYWJsZVNlbGVjdG9yLFxuICAgIG5vZGVOYW1lLFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VCBleHRlbmRzIEVsZW1lbnRCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IFU7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgaXMoKWAgYW5kIGBmaWx0ZXIoKWAgKi9cbmZ1bmN0aW9uIHdpbm5vdzxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxVPixcbiAgICBkb206IERPTVRyYXZlcnNpbmc8VT4sXG4gICAgdmFsaWRDYWxsYmFjazogKGVsOiBVKSA9PiB1bmtub3duLFxuICAgIGludmFsaWRDYWxsYmFjaz86ICgpID0+IHVua25vd24sXG4pOiBhbnkge1xuICAgIGludmFsaWRDYWxsYmFjayA9IGludmFsaWRDYWxsYmFjayB8fCBub29wO1xuXG4gICAgbGV0IHJldHZhbDogdW5rbm93bjtcbiAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIGRvbS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IuY2FsbChlbCwgaW5kZXgsIGVsKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZ1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXMgJiYgKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChpc1dpbmRvd0NvbnRleHQoZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50ID09PSBlbCBhcyBOb2RlIGFzIERvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAsIGBwYXJlbnRzKClgIGFuZCBgc2libGluZ3MoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNoaWxkcmVuKClgLCBgcGFyZW50KClgLCBgbmV4dCgpYCBhbmQgYHByZXYoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUmV0cmlldmVOb2RlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5vZGU6IE5vZGUgfCBudWxsLCBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQpOiBub2RlIGlzIE5vZGUge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKCQobm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgbmV4dFVudGlsKClgIGFuZCBgcHJldlVudGlsKCkgKi9cbmZ1bmN0aW9uIHJldHJpZXZlU2libGluZ3M8XG4gICAgRSBleHRlbmRzIEVsZW1lbnRCYXNlLFxuICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4+KFxuICAgIHNpYmxpbmc6ICdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJyB8ICduZXh0RWxlbWVudFNpYmxpbmcnLFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxFPixcbiAgICBzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPlxuKTogRE9NPFQ+IHtcbiAgICBpZiAoIWlzVHlwZUVsZW1lbnQoZG9tKSkge1xuICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZG9tIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgIGxldCBlbGVtID0gZWxbc2libGluZ107XG4gICAgICAgIHdoaWxlIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtID0gZWxlbVtzaWJsaW5nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSB0cmF2ZXJzaW5nIG1ldGhvZHMuXG4gKiBAamEg44OI44Op44OQ44O844K544Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01UcmF2ZXJzaW5nPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVsZW1lbnQgTWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIG9uZSBvZiB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44Gm6YWN5LiL44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRFbGVtZW50IHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgZnjgbnjgabjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KCk6IFRFbGVtZW50W107XG5cbiAgICBwdWJsaWMgZ2V0KGluZGV4PzogbnVtYmVyKTogVEVsZW1lbnRbXSB8IFRFbGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gaW5kZXgpIHtcbiAgICAgICAgICAgIGluZGV4ID0gTWF0aC50cnVuYyhpbmRleCk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggPCAwID8gdGhpc1tpbmRleCArIHRoaXMubGVuZ3RoXSA6IHRoaXNbaW5kZXhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9BcnJheSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIGFsbCB0aGUgZWxlbWVudHMgY29udGFpbmVkIGluIHRoZSBbW0RPTV1dIHNldCwgYXMgYW4gYXJyYXkuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyB0b0FycmF5KCk6IFRFbGVtZW50W10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXNdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBlbGVtZW50IHdpdGhpbiB0aGUgW1tET01dXSBjb2xsZWN0aW9uIHJlbGF0aXZlIHRvIGl0cyBzaWJsaW5nIGVsZW1lbnRzLlxuICAgICAqIEBqYSBbW0RPTV1dIOWGheOBruacgOWIneOBruimgee0oOOBjOWFhOW8n+imgee0oOOBruS9leeVquebruOBq+aJgOWxnuOBmeOCi+OBi+OCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpbmRleCgpOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VhcmNoIGZvciBhIGdpdmVuIGEgc2VsZWN0b3IsIGVsZW1lbnQsIG9yIFtbRE9NXV0gaW5zdGFuY2UgZnJvbSBhbW9uZyB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg6YWN5LiL44Gu5L2V55Wq55uu44Gr5omA5bGe44GX44Gm44GE44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oc2VsZWN0b3I6IHN0cmluZyB8IFQgfCBET008VD4pOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcj86IHN0cmluZyB8IFQgfCBET008VD4pOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgbGV0IGNoaWxkOiBOb2RlIHwgbnVsbCA9IHRoaXNbMF07XG4gICAgICAgICAgICB3aGlsZSAobnVsbCAhPT0gKGNoaWxkID0gY2hpbGQucHJldmlvdXNTaWJsaW5nKSkge1xuICAgICAgICAgICAgICAgIGlmIChOb2RlLkVMRU1FTlRfTk9ERSA9PT0gY2hpbGQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVsZW06IFQgfCBFbGVtZW50O1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGVsZW0gPSAkKHNlbGVjdG9yKVswXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9IHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQmFzZSA/IHNlbGVjdG9yWzBdIDogc2VsZWN0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpID0gWy4uLnRoaXNdLmluZGV4T2YoZWxlbSBhcyBURWxlbWVudCAmIEVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIDAgPD0gaSA/IGkgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFRyYXZlcnNpbmdcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaXJzdCBpbiB0aGUgc2V0IGFzIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+acgOWIneOBruimgee0oOOCkiBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OBl+OBpuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1swXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmluYWwgb25lIGluIHRoZSBzZXQgYXMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyr5bC+44Gu6KaB57Sg44KSIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKHRoaXNbdGhpcy5sZW5ndGggLSAxXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IFtbRE9NXV0gaW5zdGFuY2Ugd2l0aCBlbGVtZW50cyBhZGRlZCB0byB0aGUgc2V0IGZyb20gc2VsZWN0b3IuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIOOBp+WPluW+l+OBl+OBnyBgRWxlbWVudGAg44KS6L+95Yqg44GX44Gf5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCAkYWRkID0gJChzZWxlY3RvciwgY29udGV4dCk7XG4gICAgICAgIGNvbnN0IGVsZW1zID0gbmV3IFNldChbLi4udGhpcywgLi4uJGFkZF0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbXNdIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IG9mIGVsZW1lbnRzIGFnYWluc3QgYSBzZWxlY3RvciwgZWxlbWVudCwgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GZ44KL44GL56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgIGlmIGF0IGxlYXN0IG9uZSBvZiB0aGVzZSBlbGVtZW50cyBtYXRjaGVzIHRoZSBnaXZlbiBhcmd1bWVudHMuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgavmjIflrprjgZfjgZ/mnaHku7bjgYzopoHntKDjga7kuIDjgaTjgafjgoLkuIDoh7TjgZnjgozjgbAgYHRydWVgIOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpczxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogYm9vbGVhbiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoKSA9PiB0cnVlLCAoKSA9PiBmYWxzZSkgYXMgYm9vbGVhbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyBbW0RPTV1dIGluc3RhbmNlIGluY2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuWGheWMheOBmeOCiyDmlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBURWxlbWVudFtdID0gW107XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5wdXNoKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGVsZW1lbnRzIGZyb20gdGhlIHNldCBvZiBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLliYrpmaTjgZfjgabov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcgW1tET01dXSBpbnN0YW5jZSBleGNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLku6XlpJbjgpLlhoXljIXjgZnjgosg5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIG5vdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IG5ldyBTZXQ8VEVsZW1lbnQ+KFsuLi50aGlzXSk7XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5kZWxldGUoZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoWy4uLmVsZW1lbnRzXSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdG9yID0gJChzZWxlY3RvcikgYXMgRE9NPE5vZGU+O1xuICAgICAgICAgICAgcmV0dXJuICRzZWxlY3Rvci5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsICE9PSBlbGVtICYmIGVsLmNvbnRhaW5zKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbXMgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5lbGVtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IGhhdmUgYSBkZXNjZW5kYW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBl+OBn+WtkOimgee0oOaMgeOBpOimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXM8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldHM6IE5vZGVbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoc2VsZWN0b3IsIGVsIGFzIEVsZW1lbnQpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICAgICB0YXJnZXRzLnB1c2goLi4uJHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiBuZXcgU2V0KHRhcmdldHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtICE9PSBlbCAmJiBlbGVtLmNvbnRhaW5zKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFBhc3MgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IHRocm91Z2ggYSBmdW5jdGlvbiwgcHJvZHVjaW5nIGEgbmV3IFtbRE9NXV0gaW5zdGFuY2UgY29udGFpbmluZyB0aGUgcmV0dXJuIHZhbHVlcy5cbiAgICAgKiBAamEg44Kz44O844Or44OQ44OD44Kv44Gn5aSJ5pu044GV44KM44Gf6KaB57Sg44KS55So44GE44Gm5paw44Gf44GrIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5qeL56+JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIG1vZGlmaWNhdGlvbiBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovlpInmm7TplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbWFwPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oY2FsbGJhY2s6IERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFRFbGVtZW50LCBUPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0ZSBvdmVyIGEgW1tET01dXSBpbnN0YW5jZSwgZXhlY3V0aW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGVhY2goY2FsbGJhY2s6IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGZhbHNlID09PSBjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gYSBzdWJzZXQgc3BlY2lmaWVkIGJ5IGEgcmFuZ2Ugb2YgaW5kaWNlcy5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44Gf56+E5Zuy44Gu6KaB57Sg44KS5ZCr44KAIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmVnaW5cbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgYmVnaW4gdG8gYmUgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjga7plovlp4vkvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKiBAcGFyYW0gZW5kXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIHN0b3AgYmVpbmcgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjgpLntYLjgYjjgovnm7TliY3jga7kvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJChbLi4udGhpc10uc2xpY2UoYmVnaW4sIGVuZCkgYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBvbmUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GX44Gf6KaB57Sg44KS5ZCr44KAIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBlcShpbmRleDogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzLmdldChpbmRleCkpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0LCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3RvciBieSB0ZXN0aW5nIHRoZSBlbGVtZW50IGl0c2VsZiBhbmQgdHJhdmVyc2luZyB1cCB0aHJvdWdoIGl0cyBhbmNlc3RvcnMgaW4gdGhlIERPTSB0cmVlLlxuICAgICAqIEBqYSDplovlp4vopoHntKDjgYvjgonmnIDjgoLov5HjgYTopqropoHntKDjgpLpgbjmip4uIOOCu+ODrOOCr+OCv+ODvOaMh+WumuOBl+OBn+WgtOWQiCwg44Oe44OD44OB44GZ44KL5pyA44KC6L+R44GE6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvc2VzdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWxlY3RvciB8fCAhaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsb3Nlc3RzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBlbC5jbG9zZXN0KHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3Nlc3RzLmFkZChjKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5jbG9zZXN0c10pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcyBhcyB1bmtub3duIGFzIEVsZW1lbnQpIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudHMoc2VsZWN0b3IpLmVxKDApIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjaGlsZHJlbiBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOWQhOimgee0oOOBruWtkOimgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44GM5oyH5a6a44GV44KM44Gf5aC05ZCI44Gv44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf57WQ5p6c44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgY2hpbGRyZW48VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShjaGlsZCwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5hZGQoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5jaGlsZHJlbl0pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBwYXJlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7mnIDliJ3jga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBjb25zdCBwYXJlbnRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50Tm9kZSA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSAmJiB2YWxpZFJldHJpZXZlTm9kZShwYXJlbnROb2RlLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5hZGQocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5wYXJlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzVW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3RvciwgRE9NIG5vZGUsIG9yIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50c1VudGlsPFxuICAgICAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgICAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgICAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4gICAgPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPik6IERPTTxUPiB7XG4gICAgICAgIGxldCBwYXJlbnRzOiBOb2RlW10gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnROb2RlID0gKGVsIGFzIE5vZGUpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB3aGlsZSAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudE5vZGUpLmlzKGZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOikh+aVsOimgee0oOOBjOWvvuixoeOBq+OBquOCi+OBqOOBjeOBr+WPjei7olxuICAgICAgICBpZiAoMSA8IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJlbnRzID0gWy4uLm5ldyBTZXQocGFyZW50cy5yZXZlcnNlKCkpXS5yZXZlcnNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJChwYXJlbnRzKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgZm9sbG93aW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIG5leHQgc2libGluZyBvbmx5IGlmIGl0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAgICAgKiBAamEg6KaB57Sg6ZuG5ZCI44Gu5ZCE6KaB57Sg44Gu55u05b6M44Gr44GC44Gf44KL5YWE5byf6KaB57Sg44KS5oq95Ye6IDxicj5cbiAgICAgKiAgICAg5p2h5Lu25byP44KS5oyH5a6a44GX44CB57WQ5p6c44K744OD44OI44GL44KJ5pu044Gr57We6L6844G/44KS6KGM44GG44GT44Go44KC5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5leHRTaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLm5leHRTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7mrKHku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5uZXh0VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgZm9sbG93aW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5qyh5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ25leHRFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IHByZWNlZGluZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TliY3jga7lhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldlNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldlNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnByZXZTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7liY3ku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wcmV2VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgcHJlY2VkaW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5YmN5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnLCB0aGlzLCBzZWxlY3RvciwgZmlsdGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3JcbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf5ZCE6KaB57Sg44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2libGluZ3M8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc2libGluZyBvZiAkKHBhcmVudE5vZGUpLmNoaWxkcmVuKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNpYmxpbmcgIT09IGVsIGFzIEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoc2libGluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyB0ZXh0IGFuZCBjb21tZW50IG5vZGVzLlxuICAgICAqIEBqYSDjg4bjgq3jgrnjg4jjgoRIVE1M44Kz44Oh44Oz44OI44KS5ZCr44KA5a2Q6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGNvbnRlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUoZWwsICdpZnJhbWUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIEhUTUxJRnJhbWVFbGVtZW50KS5jb250ZW50RG9jdW1lbnQgYXMgTm9kZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlTmFtZShlbCwgJ3RlbXBsYXRlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKChlbCBhcyBIVE1MVGVtcGxhdGVFbGVtZW50KS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgZWwuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5jb250ZW50c10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjbG9zZXN0IGFuY2VzdG9yIGVsZW1lbnQgdGhhdCBpcyBwb3NpdGlvbmVkLlxuICAgICAqIEBqYSDopoHntKDjga7lhYjnpZbopoHntKDjgacsIOOCueOCv+OCpOODq+OBp+ODneOCuOOCt+ODp+ODs+aMh+Wumihwb3NpdGlpb27jgYxyZWxhdGl2ZSwgYWJzb2x1dGUsIGZpeGVk44Gu44GE44Ga44KM44GLKeOBleOCjOOBpuOBhOOCi+OCguOBruOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXRQYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oKTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQocm9vdEVsZW1lbnQpIGFzIERPTTxOb2RlPiBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0UGFyZW50KGVsIGFzIE5vZGUpIHx8IHJvb3RFbGVtZW50O1xuICAgICAgICAgICAgICAgIG9mZnNldHMuYWRkKG9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4ub2Zmc2V0c10pIGFzIERPTTxUPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NVHJhdmVyc2luZywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7IGlzU3RyaW5nLCBzZXRNaXhDbGFzc0F0dHJpYnV0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgSFRNTCBzdHJpbmcgKi9cbmZ1bmN0aW9uIGlzSFRNTFN0cmluZyhzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHN1YmplY3QgPSBzcmMudHJpbSgpO1xuICAgIHJldHVybiAoJzwnID09PSBzdWJqZWN0LnNsaWNlKDAsIDEpKSAmJiAoJz4nID09PSBzdWJqZWN0LnNsaWNlKC0xKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgYXBwZW5kKClgLCBgcHJlcGVuZCgpYCwgYGJlZm9yZSgpYCBhbmQgYGFmdGVyKClgICAqL1xuZnVuY3Rpb24gdG9Ob2RlU2V0PFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogU2V0PE5vZGUgfCBzdHJpbmc+IHtcbiAgICBjb25zdCBub2RlcyA9IG5ldyBTZXQ8Tm9kZSB8IHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRlbnQgb2YgY29udGVudHMpIHtcbiAgICAgICAgaWYgKChpc1N0cmluZyhjb250ZW50KSAmJiAhaXNIVE1MU3RyaW5nKGNvbnRlbnQpKSB8fCBpc05vZGUoY29udGVudCkpIHtcbiAgICAgICAgICAgIG5vZGVzLmFkZChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0ICRkb20gPSAkKGNvbnRlbnQgYXMgRE9NPEVsZW1lbnQ+KTtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiAkZG9tKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzU3RyaW5nKG5vZGUpIHx8IChpc05vZGUobm9kZSkgJiYgTm9kZS5ET0NVTUVOVF9OT0RFICE9PSBub2RlLm5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICBub2Rlcy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2Rlcztcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBiZWZvcmUoKWAgYW5kIGBhZnRlcigpYCAgKi9cbmZ1bmN0aW9uIHRvTm9kZShub2RlOiBOb2RlIHwgc3RyaW5nKTogTm9kZSB7XG4gICAgaWYgKGlzU3RyaW5nKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgZGV0YWNoKClgIGFuZCBgcmVtb3ZlKClgICovXG5mdW5jdGlvbiByZW1vdmVFbGVtZW50PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgdW5kZWZpbmVkLFxuICAgIGRvbTogRE9NSXRlcmFibGU8VT4sXG4gICAga2VlcExpc3RlbmVyOiBib29sZWFuXG4pOiB2b2lkIHtcbiAgICBjb25zdCAkZG9tOiBET008VT4gPSBudWxsICE9IHNlbGVjdG9yXG4gICAgICAgID8gKGRvbSBhcyBET008VT4pLmZpbHRlcihzZWxlY3RvcilcbiAgICAgICAgOiBkb20gYXMgRE9NPFU+O1xuXG4gICAgaWYgKCFrZWVwTGlzdGVuZXIpIHtcbiAgICAgICAgJGRvbS5vZmYoKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGVsIG9mICRkb20pIHtcbiAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBtYW5pcHVsYXRpb24gbWV0aG9kcy5cbiAqIEBqYSDjg57jg4vjg5Tjg6Xjg6zjg7zjgrfjg6fjg7Pjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTU1hbmlwdWxhdGlvbjxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEluc2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBIVE1MIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIEhUTUwgY29udGVudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44GfIEhUTUwg44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaHRtbFN0cmluZ1xuICAgICAqICAtIGBlbmAgQSBzdHJpbmcgb2YgSFRNTCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgosgSFRNTCDmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nOiBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZz86IHN0cmluZyk6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSA/IGVsLmlubmVySFRNTCA6ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGh0bWxTdHJpbmcpKSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sU3RyaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaW52YWxpZCBhcmdcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBhcmcuIGh0bWxTdHJpbmcgdHlwZToke3R5cGVvZiBodG1sU3RyaW5nfWApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBqUXVlcnkgcmV0dXJucyB0aGUgY29tYmluZWQgdGV4dCBvZiBlYWNoIGVsZW1lbnQsIGJ1dCB0aGlzIG1ldGhvZCBtYWtlcyBvbmx5IGZpcnN0IGVsZW1lbnQncyB0ZXh0LlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga7jg4bjgq3jgrnjg4jjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICBqUXVlcnkg44Gv5ZCE6KaB57Sg44Gu6YCj57WQ44OG44Kt44K544OI44KS6L+U5Y2044GZ44KL44GM5pys44Oh44K944OD44OJ44Gv5YWI6aCt6KaB57Sg44Gu44G/44KS5a++6LGh44Go44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIHRleHQoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBzcGVjaWZpZWQgdGV4dC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44Gf44OG44Kt44K544OI44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGV4dFxuICAgICAqICAtIGBlbmAgVGhlIHRleHQgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KL44OG44Kt44K544OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHRleHQodmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIHRleHQodmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGVsLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiAobnVsbCAhPSB0ZXh0KSA/IHRleHQudHJpbSgpIDogJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBlbmQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5hcHBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBiZWdpbm5pbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YWI6aCt44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucHJlcGVuZCguLi5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+imgee0oOOCkuS7luOBruimgee0oOOBruWFiOmgreOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnByZXBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgT3V0c2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYmVmb3JlIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWJjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGJlZm9yZTxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBiZWZvcmUgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5YmN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEJlZm9yZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYmVmb3JlKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYWZ0ZXIgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5b6M44KN44Gr5oyH5a6a44GX44GfIEhUTUwg44KE6KaB57Sg44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWZ0ZXI8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uWy4uLmNvbnRlbnRzXS5yZXZlcnNlKCkpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYWZ0ZXIgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5b6M44KN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEFmdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hZnRlcih0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBBcm91bmRcblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBhbGwgZWxlbWVudHMgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcEFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZURvY3VtZW50KHRoaXMpIHx8IGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgTm9kZTtcblxuICAgICAgICAvLyBUaGUgZWxlbWVudHMgdG8gd3JhcCB0aGUgdGFyZ2V0IGFyb3VuZFxuICAgICAgICBjb25zdCAkd3JhcCA9ICQoc2VsZWN0b3IsIGVsLm93bmVyRG9jdW1lbnQpLmVxKDApLmNsb25lKHRydWUpIGFzIERPTTxFbGVtZW50PjtcblxuICAgICAgICBpZiAoZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgJHdyYXAuaW5zZXJ0QmVmb3JlKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgICR3cmFwLm1hcCgoaW5kZXg6IG51bWJlciwgZWxlbTogRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgd2hpbGUgKGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gZWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9KS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXlgbTjgpIsIOaMh+WumuOBl+OBn+WIpeOCqOODrOODoeODs+ODiOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwSW5uZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRzID0gJGVsLmNvbnRlbnRzKCk7XG4gICAgICAgICAgICBpZiAoMCA8IGNvbnRlbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRzLndyYXBBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWwuYXBwZW5kKHNlbGVjdG9yIGFzIE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkiwg5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICRlbC53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHBhcmVudHMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTSwgbGVhdmluZyB0aGUgbWF0Y2hlZCBlbGVtZW50cyBpbiB0aGVpciBwbGFjZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu6Kaq44Ko44Os44Oh44Oz44OI44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdW53cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICBzZWxmLnBhcmVudChzZWxlY3Rvcikubm90KCdib2R5JykuZWFjaCgoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICQoZWxlbSkucmVwbGFjZVdpdGgoZWxlbS5jaGlsZE5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVtb3ZhbFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgY2hpbGQgbm9kZXMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg5YaF44Gu5a2Q6KaB57SgKOODhuOCreOCueODiOOCguWvvuixoSnjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZW1wdHkoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS4gVGhpcyBtZXRob2Qga2VlcHMgZXZlbnQgbGlzdGVuZXIgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkLiDliYrpmaTlvozjgoLjgqTjg5njg7Pjg4jjg6rjgrnjg4rjga/mnInlirlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZGV0YWNoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6KaB57Sg44KSIERPTSDjgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgZmFsc2UpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlcGxhY2VtZW50XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHdpdGggdGhlIHByb3ZpZGVkIG5ldyBjb250ZW50IGFuZCByZXR1cm4gdGhlIHNldCBvZiBlbGVtZW50cyB0aGF0IHdhcyByZW1vdmVkLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZXjgozjgZ/liKXjga7opoHntKDjgoQgSFRNTCDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdDb250ZW50XG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlV2l0aDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihuZXdDb250ZW50PzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgZWxlbSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChuZXdDb250ZW50KTtcbiAgICAgICAgICAgIGlmICgxID09PSAkZG9tLmxlbmd0aCAmJiBpc05vZGVFbGVtZW50KCRkb21bMF0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRkb21bMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5yZXBsYWNlV2l0aChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggdGFyZ2V0IGVsZW1lbnQgd2l0aCB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeOBruimgee0oOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5yZXBsYWNlV2l0aCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NTWFuaXB1bGF0aW9uLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICBpc051bWJlcixcbiAgICBpc0FycmF5LFxuICAgIGFzc2lnblZhbHVlLFxuICAgIGNsYXNzaWZ5LFxuICAgIGRhc2hlcml6ZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZURvY3VtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBnZXRPZmZzZXRQYXJlbnQsXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgICovXG5mdW5jdGlvbiBlbnN1cmVDaGFpbkNhc2VQcm9wZXJpZXMocHJvcHM6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+KTogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJldHZhbCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IGluIHByb3BzKSB7XG4gICAgICAgIGFzc2lnblZhbHVlKHJldHZhbCwgZGFzaGVyaXplKGtleSksIHByb3BzW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldERlZmF1bHRWaWV3KGVsOiBFbGVtZW50KTogV2luZG93IHtcbiAgICByZXR1cm4gKGVsLm93bmVyRG9jdW1lbnQgJiYgZWwub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgfHwgd2luZG93O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsOiBFbGVtZW50KTogQ1NTU3R5bGVEZWNsYXJhdGlvbiB7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4gdmlldy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGNzcyB2YWx1ZSB0byBudW1iZXIgKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWwpIHx8IDA7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZXNvbHZlciA9IHtcbiAgICB3aWR0aDogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgaGVpZ2h0OiBbJ3RvcCcsICdib3R0b20nXSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0UGFkZGluZyhzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0Qm9yZGVyKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBib3JkZXItJHtfcmVzb2x2ZXJbdHlwZV1bMF19LXdpZHRoYCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVsxXX0td2lkdGhgKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0TWFyZ2luKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBtYXJnaW4tJHtfcmVzb2x2ZXJbdHlwZV1bMF19YCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgd2lkdGgoKWAgYW5kIGBoZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZVNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSkge1xuICAgICAgICAgICAgLy8g44K544Kv44Ot44O844Or44OQ44O844KS6Zmk44GE44Gf5bmFIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiBkb21bMF0uZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50W2BjbGllbnQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIChzY3JvbGxXaWR0aCAvIHNjcm9sbEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiBkb21bMF0uZG9jdW1lbnRFbGVtZW50W2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaXplIC0gKGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICByZXR1cm4gZG9tLmNzcyh0eXBlLCBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZSA6IGAke3ZhbHVlfXB4YCk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlubmVyV2lkdGgoKWAgYW5kIGBpbm5lckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlSW5uZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IoZG9tIGFzIERPTVN0eWxlczxUPiwgdHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIC8vIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgIC8vIHNldHRlciAobm8gcmVhY3Rpb24pXG4gICAgICAgIHJldHVybiBkb207XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIGNvbnN0IGlzVGV4dFByb3AgPSBpc1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgZG9tKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlLCBuZXdWYWwgfSA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RleHRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdHlsZSwgbmV3VmFsIH07XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2JvcmRlci1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCAtIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpfXB4YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovIHR5cGUgUGFyc2VPdXRlclNpemVBcmdzUmVzdWx0ID0geyBpbmNsdWRlTWFyZ2luOiBib29sZWFuOyB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nOyB9O1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdCB7XG4gICAgbGV0IFt2YWx1ZSwgaW5jbHVkZU1hcmdpbl0gPSBhcmdzO1xuICAgIGlmICghaXNOdW1iZXIodmFsdWUpICYmICFpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgaW5jbHVkZU1hcmdpbiA9ICEhdmFsdWU7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4geyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9IGFzIFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZU91dGVyU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW46IGJvb2xlYW4sIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLlkKvjgoHjgZ/luYUgKGlubmVyV2lkdGggLyBpbm5lckhlaWdodClcbiAgICAgICAgICAgIHJldHVybiBkb21bMF1bYGlubmVyJHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGdldE9mZnNldFNpemUoZWwsIHR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTWFyZ2luKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0ICsgZ2V0TWFyZ2luKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFyZ2luID0gaW5jbHVkZU1hcmdpbiA/IGdldE1hcmdpbihzdHlsZSwgdHlwZSkgOiAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAoaXNUZXh0UHJvcCA/IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpIDogdmFsdWUpIC0gbWFyZ2luO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdHlsZSwgbmV3VmFsIH07XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCAtIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbH1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwb3NpdGlvbigpYCBhbmQgYG9mZnNldCgpYCAqL1xuZnVuY3Rpb24gZ2V0T2Zmc2V0UG9zaXRpb24oZWw6IEVsZW1lbnQpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0ge1xuICAgIC8vIGZvciBkaXNwbGF5IG5vbmVcbiAgICBpZiAoZWwuZ2V0Q2xpZW50UmVjdHMoKS5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0b3A6IHJlY3QudG9wICsgdmlldy5zY3JvbGxZLFxuICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyB2aWV3LnNjcm9sbFgsXG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IG9mZnNldFtXaWR0aCB8IEhlaWdodF0uIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZVtXaWR0aCB8IEhlaWdodF0g44Gu5Y+W5b6XLiBTVkdFbGVtZW50IOOBq+OCgumBqeeUqOWPr+iDvVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T2Zmc2V0U2l6ZShlbDogSFRNTE9yU1ZHRWxlbWVudCwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCAhPSAoZWwgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoKSB7XG4gICAgICAgIC8vIChvZmZzZXRXaWR0aCAvIG9mZnNldEhlaWdodClcbiAgICAgICAgcmV0dXJuIGVsW2BvZmZzZXQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIFtOT1RFXSBTVkdFbGVtZW50IOOBryBvZmZzZXRXaWR0aCDjgYzjgrXjg53jg7zjg4jjgZXjgozjgarjgYRcbiAgICAgICAgICogICAgICAgIGdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIOOBryB0cmFuc2Zvcm0g44Gr5b2x6Z+/44KS5Y+X44GR44KL44Gf44KBLFxuICAgICAgICAgKiAgICAgICAg5a6a576p6YCa44KKIGJvcmRlciwgcGFkZGluIOOCkuWQq+OCgeOBn+WApOOCkueul+WHuuOBmeOCi1xuICAgICAgICAgKi9cbiAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCBhcyBTVkdFbGVtZW50KTtcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpO1xuICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZSArIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIHN0eWxlIG1hbmFnZW1lbnQgbWV0aG9kcy5cbiAqIEBqYSDjgrnjgr/jgqTjg6vplqLpgKPjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVN0eWxlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTdHlsZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgdmFsdWUgc3RyaW5nLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WApOOCkuaWh+Wtl+WIl+OBp+i/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbXVsdGlwbGUgY29tcHV0ZWQgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gQ1NTIOOBq+ioreWumuOBleOCjOOBpuOBhOOCi+ODl+ODreODkeODhuOCo+WApOOCkuikh+aVsOWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVzXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcnJheSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjemFjeWIl+OCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHktdmFsdWUgb2JqZWN0LlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+OCkuagvOe0jeOBl+OBn+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZXM6IHN0cmluZ1tdKTogUGxhaW5PYmplY3Q8c3RyaW5nPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgQ1NTIHByb3BlcnRpeSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBzdHJpbmcgdmFsdWUgdG8gc2V0IGZvciB0aGUgcHJvcGVydHkuIGlmIG51bGwgcGFzc2VkLCByZW1vdmUgcHJvcGVydHkuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmloflrZfliJfjgafmjIflrpouIG51bGwg5oyH5a6a44Gn5YmK6ZmkLlxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG9uZSBvciBtb3JlIENTUyBwcm9wZXJ0aWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOBriBDU1Mg6KSH5pWw44Gu44OX44Ot44OR44OG44Kj44Gr5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+KTogdGhpcztcblxuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nIHwgc3RyaW5nW10gfCBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPiwgdmFsdWU/OiBzdHJpbmcgfCBudWxsKTogc3RyaW5nIHwgUGxhaW5PYmplY3Q8c3RyaW5nPiB8IHRoaXMge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gJycgOiB0aGlzO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9IGFzIFBsYWluT2JqZWN0PHN0cmluZz47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgRWxlbWVudDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpLmdldFByb3BlcnR5VmFsdWUoZGFzaGVyaXplKG5hbWUpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5IHNpbmdsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZGFzaGVyaXplKG5hbWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbW92ZSA9IChudWxsID09PSB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KHByb3BOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkocHJvcE5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG5hbWUpKSB7XG4gICAgICAgICAgICAvLyBnZXQgbXVsdGlwbGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgbmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZGFzaGVyaXplKGtleSk7XG4gICAgICAgICAgICAgICAgcHJvcHNba2V5XSA9IHZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShlbCkuZ2V0UHJvcGVydHlWYWx1ZShwcm9wTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvcHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgbXVsdGlwbGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBlbnN1cmVDaGFpbkNhc2VQcm9wZXJpZXMobmFtZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSB9ID0gZWw7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSBwcm9wc1twcm9wTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCBwcm9wc1twcm9wTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+aoquW5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5qiq5bmF44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIHdpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIHdpZHRoKHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBvciBzZXQgdGhlIHdpZHRoIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6KiI566X5riI44G/56uL5bmF44KS44OU44Kv44K744Or5Y2Y5L2N44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBrue4puW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaW5uZXIgd2lkdGggZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOaoquW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lcldpZHRoKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBpbm5lciB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lcldpZHRoKHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VJbm5lclNpemVGb3IodGhpcywgJ3dpZHRoJywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIGhlaWdodCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgcGFkZGluZyBidXQgbm90IGJvcmRlci5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5YaF6YOo57im5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGlubmVySGVpZ2h0KCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBpbm5lciBoZWlnaHQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo57im5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGlubmVySGVpZ2h0KHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VJbm5lclNpemVGb3IodGhpcywgJ2hlaWdodCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBvdXRlciB3aWR0aCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jmqKrluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aChpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBvdXRlciB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lpJbpg6jmqKrluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlcldpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlcldpZHRoKC4uLmFyZ3M6IHVua25vd25bXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ3dpZHRoJywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIGhlaWdodCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOe4puW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlckhlaWdodCguLi5hcmdzOiB1bmtub3duW10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCBpbmNsdWRlTWFyZ2luLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgb2Zmc2V0IHBhcmVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6Kaq6KaB57Sg44GL44KJ44Gu55u45a++55qE44Gq6KGo56S65L2N572u44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHBvc2l0aW9uKCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgb2Zmc2V0OiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG4gICAgICAgIGxldCBwYXJlbnRPZmZzZXQgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIG1hcmdpblRvcDogbXQsIG1hcmdpbkxlZnQ6IG1sIH0gPSAkKGVsKS5jc3MoWydwb3NpdGlvbicsICdtYXJnaW5Ub3AnLCAnbWFyZ2luTGVmdCddKTtcbiAgICAgICAgY29uc3QgbWFyZ2luVG9wID0gdG9OdW1iZXIobXQpO1xuICAgICAgICBjb25zdCBtYXJnaW5MZWZ0ID0gdG9OdW1iZXIobWwpO1xuXG4gICAgICAgIC8vIHBvc2l0aW9uOmZpeGVkIGVsZW1lbnRzIGFyZSBvZmZzZXQgZnJvbSB0aGUgdmlld3BvcnQsIHdoaWNoIGl0c2VsZiBhbHdheXMgaGFzIHplcm8gb2Zmc2V0XG4gICAgICAgIGlmICgnZml4ZWQnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gQXNzdW1lIHBvc2l0aW9uOmZpeGVkIGltcGxpZXMgYXZhaWxhYmlsaXR5IG9mIGdldEJvdW5kaW5nQ2xpZW50UmVjdFxuICAgICAgICAgICAgb2Zmc2V0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBnZXRPZmZzZXRQb3NpdGlvbihlbCk7XG5cbiAgICAgICAgICAgIC8vIEFjY291bnQgZm9yIHRoZSAqcmVhbCogb2Zmc2V0IHBhcmVudCwgd2hpY2ggY2FuIGJlIHRoZSBkb2N1bWVudCBvciBpdHMgcm9vdCBlbGVtZW50XG4gICAgICAgICAgICAvLyB3aGVuIGEgc3RhdGljYWxseSBwb3NpdGlvbmVkIGVsZW1lbnQgaXMgaWRlbnRpZmllZFxuICAgICAgICAgICAgY29uc3QgZG9jID0gZWwub3duZXJEb2N1bWVudDtcbiAgICAgICAgICAgIGxldCBvZmZzZXRQYXJlbnQgPSBnZXRPZmZzZXRQYXJlbnQoZWwpIHx8IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgICAgICBsZXQgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIHdoaWxlIChvZmZzZXRQYXJlbnQgJiZcbiAgICAgICAgICAgICAgICAob2Zmc2V0UGFyZW50ID09PSBkb2MuYm9keSB8fCBvZmZzZXRQYXJlbnQgPT09IGRvYy5kb2N1bWVudEVsZW1lbnQpICYmXG4gICAgICAgICAgICAgICAgJ3N0YXRpYycgPT09ICRvZmZzZXRQYXJlbnQuY3NzKCdwb3NpdGlvbicpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvZmZzZXRQYXJlbnQgPSBvZmZzZXRQYXJlbnQucGFyZW50Tm9kZSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgICAgICRvZmZzZXRQYXJlbnQgPSAkKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2Zmc2V0UGFyZW50ICYmIG9mZnNldFBhcmVudCAhPT0gZWwgJiYgTm9kZS5FTEVNRU5UX05PREUgPT09IG9mZnNldFBhcmVudC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIC8vIEluY29ycG9yYXRlIGJvcmRlcnMgaW50byBpdHMgb2Zmc2V0LCBzaW5jZSB0aGV5IGFyZSBvdXRzaWRlIGl0cyBjb250ZW50IG9yaWdpblxuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBib3JkZXJUb3BXaWR0aCwgYm9yZGVyTGVmdFdpZHRoIH0gPSAkb2Zmc2V0UGFyZW50LmNzcyhbJ2JvcmRlclRvcFdpZHRoJywgJ2JvcmRlckxlZnRXaWR0aCddKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQudG9wICs9IHRvTnVtYmVyKGJvcmRlclRvcFdpZHRoKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQubGVmdCArPSB0b051bWJlcihib3JkZXJMZWZ0V2lkdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3VidHJhY3QgcGFyZW50IG9mZnNldHMgYW5kIGVsZW1lbnQgbWFyZ2luc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG9wOiBvZmZzZXQudG9wIC0gcGFyZW50T2Zmc2V0LnRvcCAtIG1hcmdpblRvcCxcbiAgICAgICAgICAgIGxlZnQ6IG9mZnNldC5sZWZ0IC0gcGFyZW50T2Zmc2V0LmxlZnQgLSBtYXJnaW5MZWZ0LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIGRvY3VtZW50IOOCkuWfuua6luOBqOOBl+OBpiwg44Oe44OD44OB44GX44Gm44GE44KL6KaB57Sg6ZuG5ZCI44GuMeOBpOebruOBruimgee0oOOBruePvuWcqOOBruW6p+aomeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgasgZG9jdW1lbnQg44KS5Z+65rqW44Gr44GX44Gf54++5Zyo5bqn5qiZ44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29vcmRpbmF0ZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBwcm9wZXJ0aWVzIGB0b3BgIGFuZCBgbGVmdGAuXG4gICAgICogIC0gYGphYCBgdG9wYCwgYGxlZnRgIOODl+ODreODkeODhuOCo+OCkuWQq+OCgOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM6IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogdGhpcztcblxuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM/OiB7IHRvcD86IG51bWJlcjsgbGVmdD86IG51bWJlcjsgfSk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB8IHRoaXMge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IGNvb3JkaW5hdGVzID8geyB0b3A6IDAsIGxlZnQ6IDAgfSA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBjb29yZGluYXRlcykge1xuICAgICAgICAgICAgLy8gZ2V0XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UG9zaXRpb24odGhpc1swXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXRcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BzOiB7IHRvcD86IHN0cmluZzsgbGVmdD86IHN0cmluZzsgfSA9IHt9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIHRvcDogY3NzVG9wLCBsZWZ0OiBjc3NMZWZ0IH0gPSAkZWwuY3NzKFsncG9zaXRpb24nLCAndG9wJywgJ2xlZnQnXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcG9zaXRpb24gZmlyc3QsIGluLWNhc2UgdG9wL2xlZnQgYXJlIHNldCBldmVuIG9uIHN0YXRpYyBlbGVtXG4gICAgICAgICAgICAgICAgaWYgKCdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjdXJPZmZzZXQgPSAkZWwub2Zmc2V0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VyUG9zaXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZWVkQ2FsY3VsYXRlUG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgID0gKCdhYnNvbHV0ZScgPT09IHBvc2l0aW9uIHx8ICdmaXhlZCcgPT09IHBvc2l0aW9uKSAmJiAoY3NzVG9wICsgY3NzTGVmdCkuaW5jbHVkZXMoJ2F1dG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5lZWRDYWxjdWxhdGVQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRlbC5wb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiB0b051bWJlcihjc3NUb3ApLCBsZWZ0OiB0b051bWJlcihjc3NMZWZ0KSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkoKTtcblxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLnRvcCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wcy50b3AgPSBgJHsoY29vcmRpbmF0ZXMudG9wIC0gY3VyT2Zmc2V0LnRvcCkgKyBjdXJQb3NpdGlvbi50b3B9cHhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjb29yZGluYXRlcy5sZWZ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLmxlZnQgPSBgJHsoY29vcmRpbmF0ZXMubGVmdCAtIGN1ck9mZnNldC5sZWZ0KSArIGN1clBvc2l0aW9uLmxlZnR9cHhgO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRlbC5jc3MocHJvcHMgYXMgUGxhaW5PYmplY3Q8c3RyaW5nPik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU3R5bGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1pbnZhbGlkLXRoaXMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBjb21iaW5hdGlvbixcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEN1c3RvbUV2ZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUl0ZXJhYmxlLCBpc1R5cGVFbGVtZW50IH0gZnJvbSAnLi9iYXNlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsRXZlbnRMaXN0ZW5lciBleHRlbmRzIEV2ZW50TGlzdGVuZXIge1xuICAgIG9yaWdpbj86IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBFdmVudExpc3RlbmVySGFuZGxlciB7XG4gICAgbGlzdGVuZXI6IEludGVybmFsRXZlbnRMaXN0ZW5lcjtcbiAgICBwcm94eTogRXZlbnRMaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEJpbmRJbmZvIHtcbiAgICByZWdpc3RlcmVkOiBTZXQ8RXZlbnRMaXN0ZW5lcj47XG4gICAgaGFuZGxlcnM6IEV2ZW50TGlzdGVuZXJIYW5kbGVyW107XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kRXZlbnRDb250ZXh0IHtcbiAgICBbY29va2llOiBzdHJpbmddOiBCaW5kSW5mbztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgQ09PS0lFX1NFUEFSQVRPUiAgPSAnfCcsXG4gICAgQUREUkVTU19FVkVOVCAgICAgPSAwLFxuICAgIEFERFJFU1NfTkFNRVNQQUNFID0gMSxcbiAgICBBRERSRVNTX09QVElPTlMgICA9IDIsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIHVua25vd25bXT4oKSxcbiAgICBldmVudExpc3RlbmVyczogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIEJpbmRFdmVudENvbnRleHQ+KCksXG4gICAgbGl2ZUV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgZXZlbnQtZGF0YSBmcm9tIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5RXZlbnREYXRhKGV2ZW50OiBFdmVudCk6IHVua25vd25bXSB7XG4gICAgY29uc3QgZGF0YSA9IF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmdldChldmVudC50YXJnZXQgYXMgRWxlbWVudCkgfHwgW107XG4gICAgZGF0YS51bnNoaWZ0KGV2ZW50KTtcbiAgICByZXR1cm4gZGF0YTtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBldmVudC1kYXRhIHdpdGggZWxlbWVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudERhdGEoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50RGF0YTogdW5rbm93bltdKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuc2V0KGVsZW0sIGV2ZW50RGF0YSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgZGVsZXRlIGV2ZW50LWRhdGEgYnkgZWxlbWVudCAqL1xuZnVuY3Rpb24gZGVsZXRlRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZGVsZXRlKGVsZW0pO1xufVxuXG4vKiogQGludGVybmFsIG5vcm1hbGl6ZSBldmVudCBuYW1lc3BhY2UgKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZUV2ZW50TmFtZXNwYWNlcyhldmVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBuYW1lc3BhY2VzID0gZXZlbnQuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBtYWluID0gbmFtZXNwYWNlcy5zaGlmdCgpIGFzIHN0cmluZztcbiAgICBpZiAoIW5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBtYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWVzcGFjZXMuc29ydCgpO1xuICAgICAgICByZXR1cm4gYCR7bWFpbn0uJHtuYW1lc3BhY2VzLmpvaW4oJy4nKX1gO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBzcGxpdCBldmVudCBuYW1lc3BhY2VzICovXG5mdW5jdGlvbiBzcGxpdEV2ZW50TmFtZXNwYWNlcyhldmVudDogc3RyaW5nKTogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10ge1xuICAgIGNvbnN0IHJldHZhbDogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZXMgPSBldmVudC5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1haW4gPSBuYW1lc3BhY2VzLnNoaWZ0KCkgYXMgc3RyaW5nO1xuXG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IG1haW4sIG5hbWVzcGFjZTogJycgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmFtZXNwYWNlcy5zb3J0KCk7XG5cbiAgICAgICAgY29uc3QgY29tYm9zOiBzdHJpbmdbXVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSBuYW1lc3BhY2VzLmxlbmd0aDsgaSA+PSAxOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbWJvcy5wdXNoKC4uLmNvbWJpbmF0aW9uKG5hbWVzcGFjZXMsIGkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGAuJHtuYW1lc3BhY2VzLmpvaW4oJy4nKX0uYDtcbiAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBtYWluLCBuYW1lc3BhY2U6IHNpZ25hdHVyZSB9KTtcbiAgICAgICAgZm9yIChjb25zdCBucyBvZiBjb21ib3MpIHtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKHsgdHlwZTogYCR7bWFpbn0uJHtucy5qb2luKCcuJyl9YCwgbmFtZXNwYWNlOiBzaWduYXR1cmUgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIHJldmVyc2UgcmVzb2x1dGlvbiBldmVudCBuYW1lc3BhY2VzICovXG5mdW5jdGlvbiByZXNvbHZlRXZlbnROYW1lc3BhY2VzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nKTogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10ge1xuICAgIGNvbnN0IHJldHZhbDogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZXMgPSBldmVudC5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1haW4gPSBuYW1lc3BhY2VzLnNoaWZ0KCkgYXMgc3RyaW5nO1xuICAgIGNvbnN0IHR5cGUgPSBub3JtYWxpemVFdmVudE5hbWVzcGFjZXMoZXZlbnQpO1xuXG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IG1haW4sIG5hbWVzcGFjZTogJycgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcXVlcnkgPSAoY29udGV4dDogQmluZEV2ZW50Q29udGV4dCB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29raWVzID0gT2JqZWN0LmtleXMoY29udGV4dCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzaWduYXR1cmVzID0gY29va2llcy5maWx0ZXIoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGUgPT09IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX0VWRU5UXTtcbiAgICAgICAgICAgICAgICB9KS5tYXAoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX05BTUVTUEFDRV07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzaWJsaW5ncyA9IGNvb2tpZXMuZmlsdGVyKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc2lnbmF0dXJlIG9mIHNpZ25hdHVyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzaWduYXR1cmUgPT09IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX05BTUVTUEFDRV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSkubWFwKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF0sIG5hbWVzcGFjZTogc2VlZFtDb25zdC5BRERSRVNTX05BTUVTUEFDRV0gfTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKC4uLnNpYmxpbmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB7IGV2ZW50TGlzdGVuZXJzLCBsaXZlRXZlbnRMaXN0ZW5lcnMgfSA9IF9ldmVudENvbnRleHRNYXA7XG4gICAgICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG4gICAgICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBldmVudCBjb29raWUgZnJvbSBldmVudCBuYW1lLCBzZWxlY3Rvciwgb3B0aW9ucyAqL1xuZnVuY3Rpb24gdG9Db29raWUoZXZlbnQ6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBjb25zdCBvcHRzID0geyAuLi5vcHRpb25zIH07XG4gICAgZGVsZXRlIG9wdHMub25jZTtcbiAgICByZXR1cm4gYCR7ZXZlbnR9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7bmFtZXNwYWNlfSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke0pTT04uc3RyaW5naWZ5KG9wdHMpfSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke3NlbGVjdG9yfWA7XG59XG5cbi8qKiBAaW50ZXJuYWwgZ2V0IGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgYnkgZWxlbWVudCBhbmQgZXZlbnQgKi9cbmZ1bmN0aW9uIGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkgYXMgQmluZEV2ZW50Q29udGV4dDtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgbmFtZXNwYWNlLCBzZWxlY3Rvciwgb3B0aW9ucyk7XG4gICAgaWYgKCFjb250ZXh0W2Nvb2tpZV0pIHtcbiAgICAgICAgY29udGV4dFtjb29raWVdID0ge1xuICAgICAgICAgICAgcmVnaXN0ZXJlZDogbmV3IFNldDxFdmVudExpc3RlbmVyPigpLFxuICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBjb250ZXh0W2Nvb2tpZV07XG59XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgYWxsIGV2ZW50IGFuZCBoYW5kbGVyIGJ5IGVsZW1lbnQsIGZvciBhbGwgYG9mZigpYCBhbmQgYGNsb25lKHRydWUpYCAqL1xuZnVuY3Rpb24gZXh0cmFjdEFsbEhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCByZW1vdmUgPSB0cnVlKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIE9iamVjdC5rZXlzKGNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFtDb25zdC5BRERSRVNTX09QVElPTlNdKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgY29udGV4dFtjb29raWVdLmhhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goeyBldmVudCwgaGFuZGxlcjogaGFuZGxlci5wcm94eSwgb3B0aW9ucyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB7IGV2ZW50TGlzdGVuZXJzLCBsaXZlRXZlbnRMaXN0ZW5lcnMgfSA9IF9ldmVudENvbnRleHRNYXA7XG4gICAgcXVlcnkoZXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgZXZlbnRMaXN0ZW5lcnMuZGVsZXRlKGVsZW0pO1xuICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpICYmIHJlbW92ZSAmJiBsaXZlRXZlbnRMaXN0ZW5lcnMuZGVsZXRlKGVsZW0pO1xuXG4gICAgcmV0dXJuIGhhbmRsZXJzO1xufVxuXG4vKiogQGludGVybmFsIHF1ZXJ5IG5hbWVzcGFjZSBldmVudCBhbmQgaGFuZGxlciBieSBlbGVtZW50LCBmb3IgYG9mZihgLiR7bmFtZXNwYWNlfWApYCAqL1xuZnVuY3Rpb24gZXh0cmFjdE5hbWVzcGFjZUhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBuYW1lc3BhY2VzOiBzdHJpbmcpOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IG9iamVjdDsgfVtdIHtcbiAgICBjb25zdCBoYW5kbGVyczogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSA9IFtdO1xuXG4gICAgY29uc3QgbmFtZXMgPSBuYW1lc3BhY2VzLnNwbGl0KCcuJykuZmlsdGVyKG4gPT4gISFuKTtcbiAgICBjb25zdCBuYW1lc3BhY2VGaWx0ZXIgPSAoY29va2llOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lc3BhY2Ugb2YgbmFtZXMpIHtcbiAgICAgICAgICAgIGlmIChjb29raWUuaW5jbHVkZXMoYC4ke25hbWVzcGFjZX0uYCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvb2tpZXMgPSBPYmplY3Qua2V5cyhjb250ZXh0KS5maWx0ZXIobmFtZXNwYWNlRmlsdGVyKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIGNvb2tpZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWVkID0gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gc2VlZFtDb25zdC5BRERSRVNTX0VWRU5UXTtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0gSlNPTi5wYXJzZShzZWVkW0NvbnN0LkFERFJFU1NfT1BUSU9OU10pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnM6IF9oYW5kbGVycyB9ID0gY29udGV4dFtjb29raWVdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBfaGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7IGV2ZW50LCBoYW5kbGVyOiBoYW5kbGVyLnByb3h5LCBvcHRpb25zIH0pO1xuICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmRlbGV0ZShoYW5kbGVyLmxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG4gICAgcXVlcnkobGl2ZUV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG5cbiAgICByZXR1cm4gaGFuZGxlcnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgUGFyc2VFdmVudEFyZ3NSZXN1bHQgPSB7XG4gICAgdHlwZTogc3RyaW5nW107XG4gICAgc2VsZWN0b3I6IHN0cmluZztcbiAgICBsaXN0ZW5lcjogSW50ZXJuYWxFdmVudExpc3RlbmVyO1xuICAgIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zO1xufTtcblxuLyoqIEBpbnRlcm5hbCBwYXJzZSBldmVudCBhcmdzICovXG5mdW5jdGlvbiBwYXJzZUV2ZW50QXJncyguLi5hcmdzOiB1bmtub3duW10pOiBQYXJzZUV2ZW50QXJnc1Jlc3VsdCB7XG4gICAgbGV0IFt0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgW3R5cGUsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgICAgIHNlbGVjdG9yID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHR5cGUgPSAhdHlwZSA/IFtdIDogKGlzQXJyYXkodHlwZSkgPyB0eXBlIDogW3R5cGVdKTtcbiAgICBzZWxlY3RvciA9IHNlbGVjdG9yIHx8ICcnO1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIGlmICh0cnVlID09PSBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IGNhcHR1cmU6IHRydWUgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSBhcyBQYXJzZUV2ZW50QXJnc1Jlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfbm9UcmlnZ2VyID0gWydyZXNpemUnLCAnc2Nyb2xsJ107XG5cbi8qKiBAaW50ZXJuYWwgZXZlbnQtc2hvcnRjdXQgaW1wbCAqL1xuZnVuY3Rpb24gZXZlbnRTaG9ydGN1dDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHRoaXM6IERPTUV2ZW50czxUPiwgbmFtZTogc3RyaW5nLCBoYW5kbGVyPzogRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IERPTUV2ZW50czxUPiB7XG4gICAgaWYgKG51bGwgPT0gaGFuZGxlcikge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmICghX25vVHJpZ2dlci5pbmNsdWRlcyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGVsW25hbWVdKSkge1xuICAgICAgICAgICAgICAgICAgICBlbFtuYW1lXSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwgYXMgYW55KS50cmlnZ2VyKG5hbWUgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24obmFtZSBhcyBhbnksIGhhbmRsZXIgYXMgYW55LCBvcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRXZlbnQoc3JjOiBFbGVtZW50LCBkc3Q6IEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhzcmMsIGZhbHNlKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgZHN0LmFkZEV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFbGVtZW50KGVsZW06IEVsZW1lbnQsIHdpdGhFdmVudHM6IGJvb2xlYW4sIGRlZXA6IGJvb2xlYW4pOiBFbGVtZW50IHtcbiAgICBjb25zdCBjbG9uZSA9IGVsZW0uY2xvbmVOb2RlKHRydWUpIGFzIEVsZW1lbnQ7XG5cbiAgICBpZiAod2l0aEV2ZW50cykge1xuICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgY29uc3Qgc3JjRWxlbWVudHMgPSBlbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGNvbnN0IGRzdEVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaW5kZXhdIG9mIHNyY0VsZW1lbnRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGNsb25lRXZlbnQoc3JjRWxlbWVudHNbaW5kZXhdLCBkc3RFbGVtZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2xvbmVFdmVudChlbGVtLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xvbmU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzZWxmIGV2ZW50IG1hbmFnZSAqL1xuZnVuY3Rpb24gaGFuZGxlU2VsZkV2ZW50PFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGY6IERPTUV2ZW50czxURWxlbWVudD4sXG4gICAgY2FsbGJhY2s6IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbiAgICBldmVudE5hbWU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPERPTUV2ZW50TWFwPEhUTUxFbGVtZW50IHwgV2luZG93Pj4sXG4gICAgcGVybWFuZW50OiBib29sZWFuLFxuKTogRE9NRXZlbnRzPFRFbGVtZW50PiB7XG4gICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhpcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgZSk7XG4gICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAoc2VsZiBhcyBET01FdmVudHM8Tm9kZT4pLm9mZihldmVudE5hbWUsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgKHNlbGYgYXMgRE9NRXZlbnRzPE5vZGU+KS5vbihldmVudE5hbWUsIGZpcmVDYWxsQmFjayk7XG4gICAgcmV0dXJuIHNlbGY7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5leHBvcnQgdHlwZSBET01FdmVudE1hcDxUPlxuICAgID0gVCBleHRlbmRzIFdpbmRvdyA/IFdpbmRvd0V2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRG9jdW1lbnQgPyBEb2N1bWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEJvZHlFbGVtZW50ID8gSFRNTEJvZHlFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWVkaWFFbGVtZW50ID8gSFRNTE1lZGlhRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEVsZW1lbnQgPyBIVE1MRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRWxlbWVudCA/IEVsZW1lbnRFdmVudE1hcFxuICAgIDogR2xvYmFsRXZlbnRIYW5kbGVyc0V2ZW50TWFwO1xuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5cbmV4cG9ydCB0eXBlIERPTUV2ZW50TGlzdGVuZXI8VCA9IEhUTUxFbGVtZW50LCBNIGV4dGVuZHMgRE9NRXZlbnRNYXA8VD4gPSBET01FdmVudE1hcDxUPj4gPSAoZXZlbnQ6IE1ba2V5b2YgTV0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93blxuXG5leHBvcnQgdHlwZSBFdmVudFdpdGhOYW1lc3BhY2U8VCBleHRlbmRzIERPTUV2ZW50TWFwPHVua25vd24+PiA9IGtleW9mIFQgfCBgJHtzdHJpbmcgJiBrZXlvZiBUfS4ke3N0cmluZ31gO1xuZXhwb3J0IHR5cGUgTWFrZUV2ZW50VHlwZTxULCBNPiA9IFQgZXh0ZW5kcyBrZXlvZiBNID8ga2V5b2YgTSA6IChUIGV4dGVuZHMgYCR7c3RyaW5nICYga2V5b2YgTX0uJHtpbmZlciBDfWAgPyBgJHtzdHJpbmcgJiBrZXlvZiBNfS4ke0N9YCA6IG5ldmVyKTtcbmV4cG9ydCB0eXBlIEV2ZW50VHlwZTxUIGV4dGVuZHMgRE9NRXZlbnRNYXA8dW5rbm93bj4+ID0gTWFrZUV2ZW50VHlwZTxFdmVudFdpdGhOYW1lc3BhY2U8VD4sIFQ+O1xuZXhwb3J0IHR5cGUgRXZlbnRUeXBlT3JOYW1lc3BhY2U8VCBleHRlbmRzIERPTUV2ZW50TWFwPHVua25vd24+PiA9IEV2ZW50VHlwZTxUPiB8IGAuJHtzdHJpbmd9YDtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBldmVudCBtYW5hZ2VtZW50cy5cbiAqIEBqYSDjgqTjg5njg7Pjg4jnrqHnkIbjgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUV2ZW50czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgYmFzaWNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb24oLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUxpdmVFdmVudChlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgY29uc3QgZXZlbnREYXRhID0gcXVlcnlFdmVudERhdGEoZSk7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChlLnRhcmdldCBhcyBFbGVtZW50IHwgbnVsbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkoJHRhcmdldFswXSwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXJlbnQgb2YgJHRhcmdldC5wYXJlbnRzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50KS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHBhcmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBxdWVyeUV2ZW50RGF0YShlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm94eSA9IHNlbGVjdG9yID8gaGFuZGxlTGl2ZUV2ZW50IDogaGFuZGxlRXZlbnQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHNwbGl0RXZlbnROYW1lc3BhY2VzKGV2ZW50KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbWJvIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHR5cGUsIG5hbWVzcGFjZSB9ID0gY29tYm87XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJlZCAmJiAhcmVnaXN0ZXJlZC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmFkZChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm94eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQgW1tvbl1dIG9yIFtbb25jZV1dIGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiBbW29uXV0g44G+44Gf44GvIFtbb25jZV1dIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlci5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44GZ44G544Gm44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIG9mZigpOiB0aGlzO1xuXG4gICAgcHVibGljIG9mZiguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgaWYgKGV2ZW50cy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0QWxsSGFuZGxlcnMoZWwpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3ROYW1lc3BhY2VIYW5kbGVycyhlbCwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21ib3MgPSByZXNvbHZlRXZlbnROYW1lc3BhY2VzKGVsLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbWJvIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHlwZSwgbmFtZXNwYWNlIH0gPSBjb21ibztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsLCB0eXBlLCBuYW1lc3BhY2UsIHNlbGVjdG9yLCBvcHRpb25zLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCBoYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGhhbmRsZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7IC8vIGJhY2t3YXJkIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IGhhbmRsZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyLm9yaWdpbiAmJiBoYW5kbGVyLmxpc3RlbmVyLm9yaWdpbiA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCFsaXN0ZW5lcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgaGFuZGxlci5wcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQuZGVsZXRlKGhhbmRsZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZS4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIOS4gOW6puOBoOOBkeWRvOOBs+WHuuOBleOCjOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr5a++44GX44Gm44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBvbmNlKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7IC4uLm9wdGlvbnMsIC4uLnsgb25jZTogdHJ1ZSB9IH07XG5cbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGZ1bmN0aW9uIG9uY2VIYW5kbGVyKHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIC4uLmV2ZW50QXJnczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBldmVudEFyZ3MpO1xuICAgICAgICAgICAgc2VsZi5vZmYodHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgICAgICAgICBkZWxldGUgb25jZUhhbmRsZXIub3JpZ2luO1xuICAgICAgICB9XG4gICAgICAgIG9uY2VIYW5kbGVyLm9yaWdpbiA9IGxpc3RlbmVyIGFzIEludGVybmFsRXZlbnRMaXN0ZW5lciB8IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHRoaXMub24odHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYWxsIGhhbmRsZXJzIGFkZGVkIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgavlr77jgZfjgabjgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogLy8gdy8gZXZlbnQtbmFtZXNwYWNlIGJlaGF2aW91clxuICAgICAqICQoJy5saW5rJykub24oJ2NsaWNrLmhvZ2UucGl5bycsIChlKSA9PiB7IC4uLiB9KTtcbiAgICAgKiAkKCcubGluaycpLm9uKCdjbGljay5ob2dlJywgIChlKSA9PiB7IC4uLiB9KTtcbiAgICAgKlxuICAgICAqICQoJy5saW5rJykudHJpZ2dlcignLmhvZ2UnKTsgICAgICAgICAgIC8vIGNvbXBpbGUgZXJyb3IuIChub3QgZmlyZSlcbiAgICAgKiAkKCcubGluaycpLnRyaWdnZXIoJ2NsaWNrLmhvZ2UnKTsgICAgICAvLyBmaXJlIGJvdGguXG4gICAgICogJCgnLmxpbmsnKS50cmlnZ2VyKCdjbGljay5ob2dlLnBpeW8nKTsgLy8gZmlyZSBvbmx5IGZpcnN0IG9uZVxuICAgICAqIGBgYFxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuIC8gYEV2ZW50YCBpbnN0YW5jZSBvciBgRXZlbnRgIGluc3RhbmNlIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXIC8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrnphY3liJdcbiAgICAgKiBAcGFyYW0gZXZlbnREYXRhXG4gICAgICogIC0gYGVuYCBvcHRpb25hbCBzZW5kaW5nIGRhdGEuXG4gICAgICogIC0gYGphYCDpgIHkv6HjgZnjgovku7vmhI/jga7jg4fjg7zjgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICBzZWVkOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSB8IEV2ZW50IHwgRXZlbnRbXSB8IChFdmVudFR5cGU8VEV2ZW50TWFwPiB8IEV2ZW50KVtdLFxuICAgICAgICAuLi5ldmVudERhdGE6IHVua25vd25bXVxuICAgICk6IHRoaXMge1xuICAgICAgICBjb25zdCBjb252ZXJ0ID0gKGFyZzogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCBFdmVudCk6IEV2ZW50ID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhhcmcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDdXN0b21FdmVudChub3JtYWxpemVFdmVudE5hbWVzcGFjZXMoYXJnKSwge1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IGV2ZW50RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZyBhcyBFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBldmVudHMgPSBpc0FycmF5KHNlZWQpID8gc2VlZCA6IFtzZWVkXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgY29uc3QgZSA9IGNvbnZlcnQoZXZlbnQpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJFdmVudERhdGEoZWwsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgZWwuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICBkZWxldGVFdmVudERhdGEoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHV0aWxpdHlcblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3IgW1tvbmNlXV0oJ3RyYW5zaXRpb25zdGFydCcpLlxuICAgICAqIEBqYSBbW29uY2VdXSgndHJhbnNpdGlvbnN0YXJ0Jykg44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGB0cmFuc2l0aW9uc3RhcnRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbnN0YXJ0YCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIHRyYW5zaXRpb25TdGFydChjYWxsYmFjazogKGV2ZW50OiBUcmFuc2l0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZVNlbGZFdmVudCh0aGlzLCBjYWxsYmFjaywgJ3RyYW5zaXRpb25zdGFydCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIFtbb25jZV1dKCd0cmFuc2l0aW9uZW5kJykuXG4gICAgICogQGphIFtbb25jZV1dKCd0cmFuc2l0aW9uZW5kJykg44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGB0cmFuc2l0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYHRyYW5zaXRpb25lbmRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJhbnNpdGlvbkVuZChjYWxsYmFjazogKGV2ZW50OiBUcmFuc2l0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZVNlbGZFdmVudCh0aGlzLCBjYWxsYmFjaywgJ3RyYW5zaXRpb25lbmQnLCBwZXJtYW5lbnQpIGFzIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciBbW29uY2VdXSgnYW5pbWF0aW9uc3RhcnQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ2FuaW1hdGlvbnN0YXJ0Jykg44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGBhbmltYXRpb25zdGFydGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGBhbmltYXRpb25zdGFydGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25TdGFydChjYWxsYmFjazogKGV2ZW50OiBBbmltYXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAnYW5pbWF0aW9uc3RhcnQnLCBwZXJtYW5lbnQpIGFzIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciBbW29uY2VdXSgnYW5pbWF0aW9uZW5kJykuXG4gICAgICogQGphIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYGFuaW1hdGlvbmVuZGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGBhbmltYXRpb25lbmRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IEFuaW1hdGlvbkV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTZWxmRXZlbnQodGhpcywgY2FsbGJhY2ssICdhbmltYXRpb25lbmQnLCBwZXJtYW5lbnQpIGFzIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJpbmQgb25lIG9yIHR3byBoYW5kbGVycyB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cywgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIGFuZCBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnRzLlxuICAgICAqIEBqYSAx44Gk44G+44Gf44GvMuOBpOOBruODj+ODs+ODieODqeOCkuaMh+WumuOBlywg5LiA6Ie044GX44Gf6KaB57Sg44GuIGBtb3VzZWVudGVyYCwgYG1vdXNlbGVhdmVgIOOCkuaknOefpVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJJbihPdXQpXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIHRoZSBlbGVtZW50LiA8YnI+XG4gICAgICogICAgICAgIElmIGhhbmRsZXIgc2V0IG9ubHkgb25lLCBhIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LCB0b28uXG4gICAgICogIC0gYGphYCBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiA8YnI+XG4gICAgICogICAgICAgICAg5byV5pWw44GMMeOBpOOBp+OBguOCi+WgtOWQiCwgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCguWFvOOBreOCi1xuICAgICAqIEBwYXJhbSBoYW5kbGVyT3V0XG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LlxuICAgICAqICAtIGBqYWAgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBob3ZlcihoYW5kbGVySW46IERPTUV2ZW50TGlzdGVuZXIsIGhhbmRsZXJPdXQ/OiBET01FdmVudExpc3RlbmVyKTogdGhpcyB7XG4gICAgICAgIGhhbmRsZXJPdXQgPSBoYW5kbGVyT3V0IHx8IGhhbmRsZXJJbjtcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2VlbnRlcihoYW5kbGVySW4pLm1vdXNlbGVhdmUoaGFuZGxlck91dCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgc2hvcnRjdXRcblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2xpY2tgIGV2ZW50LlxuICAgICAqIEBqYSBgY2xpY2tgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNsaWNrKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBkYmxjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBkYmxjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGJsY2xpY2soaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZGJsY2xpY2snLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGJsdXJgIGV2ZW50LlxuICAgICAqIEBqYSBgYmx1cmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYmx1cihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdibHVyJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c2AgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXMoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXMnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzaW5gIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNpbmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNpbihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c2luJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c291dGAgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c291dGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNvdXQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNvdXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleXVwYCBldmVudC5cbiAgICAgKiBAamEgYGtleXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXl1cChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXl1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5ZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBrZXlkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlkb3duKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleWRvd24nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleXByZXNzYCBldmVudC5cbiAgICAgKiBAamEgYGtleXByZXNzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlwcmVzcyhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlwcmVzcycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgc3VibWl0YCBldmVudC5cbiAgICAgKiBAamEgYHN1Ym1pdGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3VibWl0KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3N1Ym1pdCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY29udGV4dG1lbnVgIGV2ZW50LlxuICAgICAqIEBqYSBgY29udGV4dG1lbnVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNvbnRleHRtZW51KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NvbnRleHRtZW51JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjaGFuZ2VgIGV2ZW50LlxuICAgICAqIEBqYSBgY2hhbmdlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGFuZ2UoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY2hhbmdlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWRvd25gIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWRvd24oaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vtb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW1vdmUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vtb3ZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZXVwYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNldXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNldXAoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2V1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VlbnRlcmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWVudGVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWVudGVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZW50ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VsZWF2ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VsZWF2ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWxlYXZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW91dGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW91dGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdXQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VvdXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3ZlcmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW92ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3ZlcihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW92ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoc3RhcnRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hzdGFydGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hzdGFydChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaHN0YXJ0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaGVuZGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaGVuZGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hlbmQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hlbmQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNobW92ZWAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaG1vdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNobW92ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaG1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoY2FuY2VsYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoY2FuY2VsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGNhbmNlbChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGNhbmNlbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgcmVzaXplYCBldmVudC5cbiAgICAgKiBAamEgYHJlc2l6ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzaXplKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Jlc2l6ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgc2Nyb2xsYCBldmVudC5cbiAgICAgKiBAamEgYHNjcm9sbGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Njcm9sbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ29weWluZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIGRlZXAgY29weSBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruODh+OCo+ODvOODl+OCs+ODlOODvOOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIHdpdGhFdmVudHNcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgc2hvdWxkIGJlIGNvcGllZCBhbG9uZyB3aXRoIHRoZSBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCguOCs+ODlOODvOOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumlxuICAgICAqIEBwYXJhbSBkZWVwXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIGV2ZW50IGhhbmRsZXJzIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIGNsb25lZCBlbGVtZW50IHNob3VsZCBiZSBjb3BpZWQuXG4gICAgICogIC0gYGphYCBib29sZWFu5YCk44Gn44CB6YWN5LiL44Gu6KaB57Sg44Gu44GZ44G544Gm44Gu5a2Q6KaB57Sg44Gr5a++44GX44Gm44KC44CB5LuY6ZqP44GX44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKHdpdGhFdmVudHMgPSBmYWxzZSwgZGVlcCA9IGZhbHNlKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQoc2VsZikpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxmLm1hcCgoaW5kZXg6IG51bWJlciwgZWw6IFRFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmVFbGVtZW50KGVsIGFzIE5vZGUgYXMgRWxlbWVudCwgd2l0aEV2ZW50cywgZGVlcCkgYXMgTm9kZSBhcyBURWxlbWVudDtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FdmVudHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQge1xuICAgIE51bGxpc2gsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNGdW5jdGlvbixcbiAgICBjbGFzc2lmeSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgaXNXaW5kb3dDb250ZXh0LFxuICAgIGVuc3VyZVBvc2l0aXZlTnVtYmVyLFxuICAgIHN3aW5nLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNOb2RlRG9jdW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBnZXRPZmZzZXRTaXplIH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dYC5zY3JvbGxUbygpYCBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEgW1tET01dXWAuc2Nyb2xsVG8oKWAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NU2Nyb2xsT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB2ZXJ0aWNhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgdG9wPzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSBob3Jpem9udGFsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqIEBqYSDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKi9cbiAgICBsZWZ0PzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBkdXJhdGlvbj86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqIEBqYSDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICovXG4gICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBjYWxsYmFjaz86ICgpID0+IHZvaWQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHF1ZXJ5IHNjcm9sbCB0YXJnZXQgZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlUYXJnZXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE51bGxpc2gpOiBFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9IGVsc2UgaWYgKGlzTm9kZURvY3VtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWwuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dDb250ZXh0KGVsKSkge1xuICAgICAgICByZXR1cm4gZWwuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBzY3JvbGxUbygpYCAqL1xuZnVuY3Rpb24gcGFyc2VBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IERPTVNjcm9sbE9wdGlvbnMge1xuICAgIGNvbnN0IG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMgPSB7IGVhc2luZzogJ3N3aW5nJyB9O1xuICAgIGlmICgxID09PSBhcmdzLmxlbmd0aCkge1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIGFyZ3NbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFtsZWZ0LCB0b3AsIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrXSA9IGFyZ3M7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywge1xuICAgICAgICAgICAgdG9wLFxuICAgICAgICAgICAgbGVmdCxcbiAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wdGlvbnMudG9wICAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLnRvcCk7XG4gICAgb3B0aW9ucy5sZWZ0ICAgICA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMubGVmdCk7XG4gICAgb3B0aW9ucy5kdXJhdGlvbiA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMuZHVyYXRpb24pO1xuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIGV4ZWNTY3JvbGwoZWw6IEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCwgb3B0aW9uczogRE9NU2Nyb2xsT3B0aW9ucyk6IHZvaWQge1xuICAgIGNvbnN0IHsgdG9wLCBsZWZ0LCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjayB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IGluaXRpYWxUb3AgPSBlbC5zY3JvbGxUb3A7XG4gICAgY29uc3QgaW5pdGlhbExlZnQgPSBlbC5zY3JvbGxMZWZ0O1xuICAgIGxldCBlbmFibGVUb3AgPSBpc051bWJlcih0b3ApO1xuICAgIGxldCBlbmFibGVMZWZ0ID0gaXNOdW1iZXIobGVmdCk7XG5cbiAgICAvLyBub24gYW5pbWF0aW9uIGNhc2VcbiAgICBpZiAoIWR1cmF0aW9uKSB7XG4gICAgICAgIGxldCBub3RpZnkgPSBmYWxzZTtcbiAgICAgICAgaWYgKGVuYWJsZVRvcCAmJiB0b3AgIT09IGluaXRpYWxUb3ApIHtcbiAgICAgICAgICAgIGVsLnNjcm9sbFRvcCA9IHRvcCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0ICYmIGxlZnQgIT09IGluaXRpYWxMZWZ0KSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxMZWZ0ID0gbGVmdCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub3RpZnkgJiYgaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGNNZXRyaWNzID0gKGVuYWJsZTogYm9vbGVhbiwgYmFzZTogbnVtYmVyLCBpbml0aWFsVmFsdWU6IG51bWJlciwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogeyBtYXg6IG51bWJlcjsgbmV3OiBudW1iZXI7IGluaXRpYWw6IG51bWJlcjsgfSA9PiB7XG4gICAgICAgIGlmICghZW5hYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBtYXg6IDAsIG5ldzogMCwgaW5pdGlhbDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1heFZhbHVlID0gZWxbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF0gLSBnZXRPZmZzZXRTaXplKGVsLCB0eXBlKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1heChNYXRoLm1pbihiYXNlLCBtYXhWYWx1ZSksIDApO1xuICAgICAgICByZXR1cm4geyBtYXg6IG1heFZhbHVlLCBuZXc6IG5ld1ZhbHVlLCBpbml0aWFsOiBpbml0aWFsVmFsdWUgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgbWV0cmljc1RvcCA9IGNhbGNNZXRyaWNzKGVuYWJsZVRvcCwgdG9wIGFzIG51bWJlciwgaW5pdGlhbFRvcCwgJ2hlaWdodCcpO1xuICAgIGNvbnN0IG1ldHJpY3NMZWZ0ID0gY2FsY01ldHJpY3MoZW5hYmxlTGVmdCwgbGVmdCBhcyBudW1iZXIsIGluaXRpYWxMZWZ0LCAnd2lkdGgnKTtcblxuICAgIGlmIChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPT09IG1ldHJpY3NUb3AuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVUb3AgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID09PSBtZXRyaWNzTGVmdC5pbml0aWFsKSB7XG4gICAgICAgIGVuYWJsZUxlZnQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFlbmFibGVUb3AgJiYgIWVuYWJsZUxlZnQpIHtcbiAgICAgICAgLy8gbmVlZCBub3QgdG8gc2Nyb2xsXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjUHJvZ3Jlc3MgPSAodmFsdWU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGVhc2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBlYXNpbmcodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdsaW5lYXInID09PSBlYXNpbmcgPyB2YWx1ZSA6IHN3aW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWx0YSA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGNvbnN0IGFuaW1hdGUgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGVsYXBzZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gTWF0aC5tYXgoTWF0aC5taW4oZWxhcHNlIC8gZHVyYXRpb24sIDEpLCAwKTtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3NDb2VmZiA9IGNhbGNQcm9ncmVzcyhwcm9ncmVzcyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGRlbHRhXG4gICAgICAgIGlmIChlbmFibGVUb3ApIHtcbiAgICAgICAgICAgIGRlbHRhLnRvcCA9IG1ldHJpY3NUb3AuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NUb3AubmV3IC0gbWV0cmljc1RvcC5pbml0aWFsKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuYWJsZUxlZnQpIHtcbiAgICAgICAgICAgIGRlbHRhLmxlZnQgPSBtZXRyaWNzTGVmdC5pbml0aWFsICsgKHByb2dyZXNzQ29lZmYgKiAobWV0cmljc0xlZnQubmV3IC0gbWV0cmljc0xlZnQuaW5pdGlhbCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgZG9uZVxuICAgICAgICBpZiAoKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA+IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPj0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCBkb3duXG4gICAgICAgICAgICAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3IDwgbWV0cmljc1RvcC5pbml0aWFsICYmIGRlbHRhLnRvcCA8PSBtZXRyaWNzVG9wLm5ldykgICAgICAgfHwgLy8gc2Nyb2xsIHVwXG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPiBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPj0gbWV0cmljc0xlZnQubmV3KSAgfHwgLy8gc2Nyb2xsIHJpZ2h0XG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPCBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPD0gbWV0cmljc0xlZnQubmV3KSAgICAgLy8gc2Nyb2xsIGxlZnRcbiAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIGVuYWJsZVRvcCAmJiAoZWwuc2Nyb2xsVG9wID0gbWV0cmljc1RvcC5uZXcpO1xuICAgICAgICAgICAgZW5hYmxlTGVmdCAmJiAoZWwuc2Nyb2xsTGVmdCA9IG1ldHJpY3NMZWZ0Lm5ldyk7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVsZWFzZSByZWZlcmVuY2UgaW1tZWRpYXRlbHkuXG4gICAgICAgICAgICBlbCA9IG51bGwhOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBkZWx0YS50b3ApO1xuICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gZGVsdGEubGVmdCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44K544Kv44Ot44O844Or44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TY3JvbGw8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU2Nyb2xsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb246IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUb3AoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxUb3AgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgdG9wOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg5qiq5pa55ZCR44K544Kv44Ot44O844Or44GV44KM44Gf44OU44Kv44K744Or5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NpdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxMZWZ0IDogMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsVG8oe1xuICAgICAgICAgICAgICAgIGxlZnQ6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5qiq5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0geFxuICAgICAqICAtIGBlbmAgdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0geVxuICAgICAqICAtIGBlbmAgdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhcbiAgICAgICAgeDogbnVtYmVyLFxuICAgICAgICB5OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBzY3JvbGwgdmFsdWVzIGJ5IG9wdG9pbnMuXG4gICAgICogQGphIOOCquODl+OCt+ODp+ODs+OCkueUqOOBhOOBpuOCueOCr+ODreODvOODq+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhvcHRpb25zOiBET01TY3JvbGxPcHRpb25zKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUbyguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlQXJncyguLi5hcmdzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtID0gcXVlcnlUYXJnZXRFbGVtZW50KGVsKTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZXhlY1Njcm9sbChlbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVNjcm9sbCwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgRWxlbWVudEJhc2UsIERPTSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBwYXJhbWV0ZXIuXG4gKiBAamEgW1tET01dXSDjgqjjg5Xjgqfjgq/jg4jlirnmnpzjga7jg5Hjg6njg6Hjg7zjgr9cbiAqL1xuZXhwb3J0IHR5cGUgRE9NRWZmZWN0UGFyYW1ldGVycyA9IEtleWZyYW1lW10gfCBQcm9wZXJ0eUluZGV4ZWRLZXlmcmFtZXMgfCBudWxsO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBvcHRpb25zLlxuICogQGphIFtbRE9NXV0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdE9wdGlvbnMgPSBudW1iZXIgfCBLZXlmcmFtZUFuaW1hdGlvbk9wdGlvbnM7XG5cbi8qKlxuICogQGVuIFtbRE9NXV0gZWZmZWN0IGNvbnRleHQgb2JqZWN0LlxuICogQGphIFtbRE9NXV0g44Gu44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiB7XG4gICAgLyoqXG4gICAgICogQGVuIFtbRE9NXV0gaW5zdGFuY2UgdGhhdCBjYWxsZWQgW1thbmltYXRlXV0oKSBtZXRob2QuXG4gICAgICogQGphIFtbYW5pbWF0ZV1dKCkg44Oh44K944OD44OJ44KS5a6f6KGM44GX44GfIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgZG9tOiBET008VEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhbmQgYEFuaW1hdGlvbmAgaW5zdGFuY2UgbWFwIGJ5IGV4ZWN1dGlvbiBbW2FuaW1hdGVdXSgpIG1ldGhvZCBhdCB0aGlzIHRpbWUuXG4gICAgICogQGphIOS7iuWbnuWun+ihjOOBl+OBnyBgRWxlbWVudGAg44GoIGBBbmltYXRpb25gIOOCpOODs+OCueOCv+ODs+OCueOBruODnuODg+ODl1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGFuaW1hdGlvbnM6IE1hcDxURWxlbWVudCwgQW5pbWF0aW9uPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY3VycmVudCBmaW5pc2hlZCBQcm9taXNlIGZvciB0aGlzIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg5a++6LGh44Ki44OL44Oh44O844K344On44Oz44Gu57WC5LqG5pmC44Gr55m654Gr44GZ44KLIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICByZWFkb25seSBmaW5pc2hlZDogUHJvbWlzZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9hbmltQ29udGV4dE1hcCA9IG5ldyBXZWFrTWFwPEVsZW1lbnQsIFNldDxBbmltYXRpb24+PigpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGFuaW1hdGlvbi9lZmZlY3QgbWV0aG9kcy5cbiAqIEBqYSDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Mv44Ko44OV44Kn44Kv44OI5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FZmZlY3RzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHMgYW5pbWF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhcnQgYW5pbWF0aW9uIGJ5IGBXZWIgQW5pbWF0aW9uIEFQSWAuXG4gICAgICogQGphIGBXZWIgQW5pbWF0aW9uIEFQSWAg44KS55So44GE44Gm44Ki44OL44Oh44O844K344On44Oz44KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGUocGFyYW1zOiBET01FZmZlY3RQYXJhbWV0ZXJzLCBvcHRpb25zOiBET01FZmZlY3RPcHRpb25zKTogRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICBkb206IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD4sXG4gICAgICAgICAgICBhbmltYXRpb25zOiBuZXcgTWFwPFRFbGVtZW50LCBBbmltYXRpb24+KCksXG4gICAgICAgIH0gYXMgV3JpdGFibGU8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xuXG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmltID0gZWwuYW5pbWF0ZShwYXJhbXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsKSB8fCBuZXcgU2V0KCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5hZGQoYW5pbSk7XG4gICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLnNldChlbCwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmFuaW1hdGlvbnMuc2V0KGVsIGFzIE5vZGUgYXMgVEVsZW1lbnQsIGFuaW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5hbGwoWy4uLnJlc3VsdC5hbmltYXRpb25zLnZhbHVlcygpXS5tYXAoYW5pbSA9PiBhbmltLmZpbmlzaGVkKSkudGhlbigoKSA9PiByZXN1bHQpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLkuK3mraJcbiAgICAgKi9cbiAgICBwdWJsaWMgY2FuY2VsKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmNhbmNlbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF9hbmltQ29udGV4dE1hcC5kZWxldGUoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGaW5pc2ggY3VycmVudCBydW5uaW5nIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg54++5Zyo5a6f6KGM44GX44Gm44GE44KL44Ki44OL44Oh44O844K344On44Oz44KS57WC5LqGXG4gICAgICovXG4gICAgcHVibGljIGZpbmlzaCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYW5pbWF0aW9uIG9mIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5maW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBmaW5pc2gg44Gn44Gv56C05qOE44GX44Gq44GEXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWZmZWN0cyB1dGlsaXR5XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBmb3JjZSByZWZsb3cuXG4gICAgICogQGphIOW8t+WItuODquODleODreODvOOCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyByZWZsb3coKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzWzBdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyB1bmtub3duIGFzIERPTSkgIHtcbiAgICAgICAgICAgICAgICBub29wKGVsLm9mZnNldEhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgZm9yY2UgcmVwYWludC5cbiAgICAgKiBAamEg5by35Yi25YaN5o+P55S744KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIHJlcGFpbnQoKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzWzBdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyB1bmtub3duIGFzIERPTSkgIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gZWwuc3R5bGUuZGlzcGxheTtcbiAgICAgICAgICAgICAgICBlbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGVsLnN0eWxlLmRpc3BsYXkgPSBjdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRWZmZWN0cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgQ2xhc3MsXG4gICAgbWl4aW5zLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRWxlbWVudGlmeVNlZWQsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRE9NQmFzZSB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBET01BdHRyaWJ1dGVzIH0gZnJvbSAnLi9hdHRyaWJ1dGVzJztcbmltcG9ydCB7IERPTVRyYXZlcnNpbmcgfSBmcm9tICcuL3RyYXZlcnNpbmcnO1xuaW1wb3J0IHsgRE9NTWFuaXB1bGF0aW9uIH0gZnJvbSAnLi9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHsgRE9NU3R5bGVzIH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHsgRE9NRXZlbnRzIH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHsgRE9NU2Nyb2xsIH0gZnJvbSAnLi9zY3JvbGwnO1xuaW1wb3J0IHsgRE9NRWZmZWN0cyB9IGZyb20gJy4vZWZmZWN0cyc7XG5cbnR5cGUgRE9NRmVhdHVyZXM8VCBleHRlbmRzIEVsZW1lbnRCYXNlPlxuICAgID0gRE9NQmFzZTxUPlxuICAgICYgRE9NQXR0cmlidXRlczxUPlxuICAgICYgRE9NVHJhdmVyc2luZzxUPlxuICAgICYgRE9NTWFuaXB1bGF0aW9uPFQ+XG4gICAgJiBET01TdHlsZXM8VD5cbiAgICAmIERPTUV2ZW50czxUPlxuICAgICYgRE9NU2Nyb2xsPFQ+XG4gICAgJiBET01FZmZlY3RzPFQ+O1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIHBsdWdpbiBtZXRob2QgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW0RPTV1dIOODl+ODqeOCsOOCpOODs+ODoeOCveODg+ODieWumue+qVxuICpcbiAqIEBub3RlXG4gKiAgLSDjg5fjg6njgrDjgqTjg7Pmi6HlvLXlrprnvqnjga/jgZPjga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjg57jg7zjgrjjgZnjgosuXG4gKiAgLSBUeXBlU2NyaXB0IDMuNyDmmYLngrnjgacsIG1vZHVsZSBpbnRlcmZhY2Ug44Gu44Oe44O844K444GvIG1vZHVsZSDjga7lrozlhajjgarjg5HjgrnjgpLlv4XopoHjgajjgZnjgovjgZ/jgoEsXG4gKiAgICDmnKzjg6zjg53jgrjjg4jjg6rjgafjga8gYnVuZGxlIOOBl+OBnyBgZGlzdC9kb20uZC50c2Ag44KS5o+Q5L6b44GZ44KLLlxuICpcbiAqIEBzZWVcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzMzMjZcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzU3ODQ4MTM0L3Ryb3VibGUtdXBkYXRpbmctYW4taW50ZXJmYWNlLXVzaW5nLWRlY2xhcmF0aW9uLW1lcmdpbmdcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01QbHVnaW4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vKipcbiAqIEBlbiBUaGlzIGludGVyZmFjZSBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m+OBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBET01GZWF0dXJlczxUPiwgRE9NUGx1Z2luIHsgfVxuXG5leHBvcnQgdHlwZSBET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gRWxlbWVudGlmeVNlZWQ8VD4gfCBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIERPTVJlc3VsdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPiA9IFQgZXh0ZW5kcyBET008RWxlbWVudEJhc2U+ID8gVCA6IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBET008VD4gOiBET008SFRNTEVsZW1lbnQ+KTtcbmV4cG9ydCB0eXBlIERPTUl0ZXJhdGVDYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IGJvb2xlYW4gfCB2b2lkO1xuXG4vKipcbiAqIEBlbiBUaGlzIGNsYXNzIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6bXG4gKlxuICogVU5TVVBQT1JURUQgTUVUSE9EIExJU1RcbiAqXG4gKiBbVHJhdmVyc2luZ11cbiAqICAuYWRkQmFjaygpXG4gKiAgLmVuZCgpXG4gKlxuICogW0VmZmVjdHNdXG4gKiAuc2hvdygpXG4gKiAuaGlkZSgpXG4gKiAudG9nZ2xlKClcbiAqIC5zdG9wKClcbiAqIC5jbGVhclF1ZXVlKClcbiAqIC5kZWxheSgpXG4gKiAuZGVxdWV1ZSgpXG4gKiAuZmFkZUluKClcbiAqIC5mYWRlT3V0KClcbiAqIC5mYWRlVG8oKVxuICogLmZhZGVUb2dnbGUoKVxuICogLnF1ZXVlKClcbiAqIC5zbGlkZURvd24oKVxuICogLnNsaWRlVG9nZ2xlKClcbiAqIC5zbGlkZVVwKClcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUNsYXNzIGV4dGVuZHMgbWl4aW5zKFxuICAgIERPTUJhc2UsXG4gICAgRE9NQXR0cmlidXRlcyxcbiAgICBET01UcmF2ZXJzaW5nLFxuICAgIERPTU1hbmlwdWxhdGlvbixcbiAgICBET01TdHlsZXMsXG4gICAgRE9NRXZlbnRzLFxuICAgIERPTVNjcm9sbCxcbiAgICBET01FZmZlY3RzLFxuKSB7XG4gICAgLyoqXG4gICAgICogcHJpdmF0ZSBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoZWxlbWVudHM6IEVsZW1lbnRCYXNlW10pIHtcbiAgICAgICAgc3VwZXIoZWxlbWVudHMpO1xuICAgICAgICAvLyBhbGwgc291cmNlIGNsYXNzZXMgaGF2ZSBubyBjb25zdHJ1Y3Rvci5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIFtbRE9NXV0gaW5zdGFuY2UgZnJvbSBgc2VsZWN0b3JgIGFyZy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChzZWxlY3RvciAmJiAhY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKGlzRE9NQ2xhc3Moc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdG9yIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IERPTUNsYXNzKChlbGVtZW50aWZ5KHNlbGVjdG9yIGFzIEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0KSkpIGFzIHVua25vd24gYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKERPTUNsYXNzIGFzIHVua25vd24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFtbRE9NXV0uXG4gKiBAamEgW1tET01dXSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTUNsYXNzKHg6IHVua25vd24pOiB4IGlzIERPTSB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBET01DbGFzcztcbn1cbiIsImltcG9ydCB7IHNldHVwIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NQ2xhc3MgfSBmcm9tICcuL2NsYXNzJztcblxuLy8gaW5pdCBmb3Igc3RhdGljXG5zZXR1cChET01DbGFzcy5wcm90b3R5cGUsIERPTUNsYXNzLmNyZWF0ZSk7XG5cbmV4cG9ydCAqIGZyb20gJy4vZXhwb3J0cyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIGRlZmF1bHQgfSBmcm9tICcuL2V4cG9ydHMnO1xuIl0sIm5hbWVzIjpbInNhZmUiLCJpc0Z1bmN0aW9uIiwiY2xhc3NOYW1lIiwiaXNOdW1iZXIiLCJnZXRHbG9iYWxOYW1lc3BhY2UiLCIkIiwiaXNBcnJheSIsImlzU3RyaW5nIiwiYXNzaWduVmFsdWUiLCJ0b1R5cGVkRGF0YSIsImNhbWVsaXplIiwiZnJvbVR5cGVkRGF0YSIsInNldE1peENsYXNzQXR0cmlidXRlIiwibm9vcCIsImRvbSIsImRhc2hlcml6ZSIsImNsYXNzaWZ5IiwiY29tYmluYXRpb24iLCJtaXhpbnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUE7O0lBRUc7SUFFSCxpQkFBd0IsTUFBTSxNQUFNLEdBQWtCQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlFLGlCQUF3QixNQUFNLFFBQVEsR0FBZ0JBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEYsaUJBQXdCLE1BQU0sV0FBVyxHQUFhQSxjQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25GLGlCQUF3QixNQUFNLHFCQUFxQixHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDOztJQ1Q1Rjs7SUFFRztJQWlCSDs7Ozs7OztJQU9HO0lBQ0csU0FBVSxlQUFlLENBQUMsQ0FBVSxFQUFBO0lBQ3RDLElBQUEsT0FBUSxDQUFZLEVBQUUsTUFBTSxZQUFZLE1BQU0sQ0FBQztJQUNuRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O0lBV0c7SUFDYSxTQUFBLFVBQVUsQ0FBeUIsSUFBd0IsRUFBRSxPQUE2QixFQUFBO1FBQ3RHLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDUCxRQUFB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QyxDQUFDO0lBQ3pCLGFBQUE7SUFDSixTQUFBO0lBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7OztJQUdHO1FBQ0ksT0FBTyxHQUFBO0lBQ1YsUUFBQSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxXQUFXLEVBQUU7SUFDaEMsWUFBQSxLQUFLLE1BQU0sRUFBRSxJQUFJLElBQXNCLEVBQUc7SUFDdEMsZ0JBQUEsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDakMsZ0JBQUEsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQzFCLGdCQUFBLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUM5QixhQUFBO0lBQ0osU0FBQTtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUNKLENBQUE7QUFFREQsa0NBQW9CLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDOztJQ25IcEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBMEJHO0lBQ0csTUFBTyxRQUFTLFNBQVFNLGdCQUFNLENBQ2hDLE9BQU8sRUFDUCxhQUFhLEVBQ2IsYUFBYSxFQUNiLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxVQUFVLENBQ2IsQ0FBQTtJQUNHOzs7Ozs7SUFNRztJQUNILElBQUEsV0FBQSxDQUFvQixRQUF1QixFQUFBO1lBQ3ZDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQzs7U0FFbkI7SUFFRDs7Ozs7Ozs7Ozs7OztJQWFHO0lBQ0ksSUFBQSxPQUFPLE1BQU0sQ0FBeUIsUUFBeUIsRUFBRSxPQUE2QixFQUFBO0lBQ2pHLFFBQUEsSUFBSSxRQUFRLElBQUksQ0FBQyxPQUFPLEVBQUU7SUFDdEIsWUFBQSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtJQUN0QixnQkFBQSxPQUFPLFFBQXdCLENBQUM7SUFDbkMsYUFBQTtJQUNKLFNBQUE7SUFDRCxRQUFBLE9BQU8sSUFBSSxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQTZCLEVBQUUsT0FBTyxDQUFDLEVBQTZCLENBQUM7U0FDeEc7SUFDSixDQUFBO0lBRUQ7QUFDQU4sa0NBQW9CLENBQUMsUUFBNEIsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFdkU7Ozs7Ozs7SUFPRztJQUNHLFNBQVUsVUFBVSxDQUFDLENBQVUsRUFBQTtRQUNqQyxPQUFPLENBQUMsWUFBWSxRQUFRLENBQUM7SUFDakM7O0lDM0lBO0lBQ0EsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQzs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9kb20vIn0=