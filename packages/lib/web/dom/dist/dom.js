/*!
 * @cdp/dom 0.9.19
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
    /** @internal */
    function isWindowContext(x) {
        return x?.parent instanceof Window;
    }
    /** @internal */
    function elementify(seed, context) {
        if (!seed) {
            return [];
        }
        context = context ?? document;
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
    /** @internal */
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
     * @internal
     * @en Ensure positive number, if not returned `undefined`.
     * @en 正値の保証. 異なる場合 `undefined` を返却
     */
    function ensurePositiveNumber(value) {
        return (coreUtils.isNumber(value) && 0 <= value) ? value : undefined;
    }
    /**
     * @internal
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
    /** @internal */
    function evaluate(code, options, context) {
        const doc = context ?? document;
        const script = doc.createElement('script');
        script.text = `CDP_DOM_EVAL_RETURN_VALUE_BRIDGE = (() => { return ${code}; })();`;
        if (options) {
            for (const attr of _scriptsAttrs) {
                const val = options[attr] || options?.getAttribute?.(attr);
                if (val) {
                    script.setAttribute(attr, val);
                }
            }
        }
        // execute
        try {
            coreUtils.getGlobalNamespace('CDP_DOM_EVAL_RETURN_VALUE_BRIDGE');
            doc.head.appendChild(script).parentNode.removeChild(script);
            const retval = globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
            return retval;
        }
        finally {
            delete globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
        }
    }

    const _observerMap = new Map();
    const queryObservedNode = (node) => {
        for (const [observedNode, context] of _observerMap) {
            if (context.targets.has(node)) {
                return observedNode;
            }
        }
        return undefined;
    };
    const dispatchTarget = (node, event, nodeIn, nodeOut) => {
        if (queryObservedNode(node) && !nodeIn.has(node)) {
            nodeOut.delete(node);
            nodeIn.add(node);
            node.dispatchEvent(event);
        }
        for (const child of node.childNodes) {
            dispatchTarget(child, event, nodeIn, nodeOut);
        }
    };
    const dispatchAll = (nodes, type, nodeIn, nodeOut) => {
        for (const node of nodes) {
            Node.ELEMENT_NODE === node.nodeType && dispatchTarget(node, new CustomEvent(type, { bubbles: true, cancelable: true }), nodeIn, nodeOut);
        }
    };
    const start = (observedNode) => {
        const connected = new WeakSet();
        const disconnected = new WeakSet();
        const changes = (records) => {
            for (const record of records) {
                dispatchAll(record.removedNodes, 'disconnected', disconnected, connected);
                dispatchAll(record.addedNodes, 'connected', connected, disconnected);
            }
        };
        const context = {
            targets: new Set(),
            observer: new MutationObserver(changes),
        };
        _observerMap.set(observedNode, context);
        context.observer.observe(observedNode, { childList: true, subtree: true });
        return context;
    };
    const stopAll = () => {
        for (const [, context] of _observerMap) {
            context.targets.clear();
            context.observer.disconnect();
        }
        _observerMap.clear();
    };
    /** @internal */
    const detectify = (node, observed) => {
        const observedNode = observed ?? (node.ownerDocument?.body && node.ownerDocument) ?? document;
        const context = _observerMap.get(observedNode) ?? start(observedNode);
        context.targets.add(node);
        return node;
    };
    /** @internal */
    const undetectify = (node) => {
        if (null == node) {
            stopAll();
        }
        else {
            const observedNode = queryObservedNode(node);
            if (observedNode) {
                const context = _observerMap.get(observedNode);
                context.targets.delete(node);
                if (!context.targets.size) {
                    context.observer.disconnect();
                    _observerMap.delete(observedNode);
                }
            }
        }
    };

    let _factory;
    const dom = ((selector, context) => {
        return _factory(selector, context);
    });
    dom.utils = {
        isWindowContext,
        elementify,
        rootify,
        evaluate,
        detectify,
        undetectify,
    };
    /** @internal 循環参照回避のための遅延コンストラクションメソッド */
    function setup(fn, factory) {
        _factory = factory;
        dom.fn = fn;
    }

    /** @internal */ const _createIterableIterator = Symbol('create-iterable-iterator');
    /**
     * @en Base abstraction class of {@link DOMClass}. This class provides iterator methods.
     * @ja {@link DOMClass} の基底抽象クラス. iterator を提供.
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
         *  - `en` {@link ElementBase} instance
         *  - `ja` {@link ElementBase} インスタンス
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
         * @en Iterator of {@link ElementBase} values in the array.
         * @ja 格納している {@link ElementBase} にアクセス可能なイテレータオブジェクトを返却
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
         * @en Returns an iterable of key(index), value({@link ElementBase}) pairs for every entry in the array.
         * @ja key(index), value({@link ElementBase}) 配列にアクセス可能なイテレータオブジェクトを返却
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
         * @en Returns an iterable of values({@link ElementBase}) in the array.
         * @ja values({@link ElementBase}) 配列にアクセス可能なイテレータオブジェクトを返却
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
     *  - `en` {@link ElementBase} instance
     *  - `ja` {@link ElementBase} インスタンス
     */
    function isNode(el) {
        return !!(el && el.nodeType);
    }
    /**
     * @en Check target is `Element`.
     * @ja 対象が `Element` であるか判定
     *
     * @param el
     *  - `en` {@link ElementBase} instance
     *  - `ja` {@link ElementBase} インスタンス
     */
    function isNodeElement(el) {
        return isNode(el) && (Node.ELEMENT_NODE === el.nodeType);
    }
    /**
     * @en Check target is `HTMLElement` or `SVGElement`.
     * @ja 対象が `HTMLElement` または `SVGElement` であるか判定
     *
     * @param el
     *  - `en` {@link ElementBase} instance
     *  - `ja` {@link ElementBase} インスタンス
     */
    function isNodeHTMLOrSVGElement(el) {
        return isNodeElement(el) && (null != el.dataset);
    }
    /**
     * @en Check target is `Element` or `Document`.
     * @ja 対象が `Element` または `Document` であるか判定
     *
     * @param el
     *  - `en` {@link ElementBase} instance
     *  - `ja` {@link ElementBase} インスタンス
     */
    function isNodeQueriable(el) {
        return !!(el && el.querySelector);
    }
    /**
     * @en Check target is `Document`.
     * @ja 対象が `Document` であるか判定
     *
     * @param el
     *  - `en` {@link ElementBase} instance
     *  - `ja` {@link ElementBase} インスタンス
     */
    function isNodeDocument(el) {
        return isNode(el) && (Node.DOCUMENT_NODE === el.nodeType);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Check {@link DOM} target is `Element`.
     * @ja {@link DOM} が `Element` を対象にしているか判定
     *
     * @param dom
     *  - `en` {@link DOMIterable} instance
     *  - `ja` {@link DOMIterable} インスタンス
     */
    function isTypeElement(dom) {
        return isNodeElement(dom[0]);
    }
    /**
     * @en Check {@link DOM} target is `HTMLElement` or `SVGElement`.
     * @ja {@link DOM} が `HTMLElement` または `SVGElement` を対象にしているか判定
     *
     * @param dom
     *  - `en` {@link DOMIterable} instance
     *  - `ja` {@link DOMIterable} インスタンス
     */
    function isTypeHTMLOrSVGElement(dom) {
        return isNodeHTMLOrSVGElement(dom[0]);
    }
    /**
     * @en Check {@link DOM} target is `Document`.
     * @ja {@link DOM} が `Document` を対象にしているか判定
     *
     * @param dom
     *  - `en` {@link DOMIterable} instance
     *  - `ja` {@link DOMIterable} インスタンス
     */
    function isTypeDocument(dom) {
        return dom[0] instanceof Document;
    }
    /**
     * @en Check {@link DOM} target is `Window`.
     * @ja {@link DOM} が `Window` を対象にしているか判定
     *
     * @param dom
     *  - `en` {@link DOMIterable} instance
     *  - `ja` {@link DOMIterable} インスタンス
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
                return attr ?? undefined;
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
                const prop = coreUtils.camelize(key ?? '');
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
        invalidCallback = invalidCallback ?? coreUtils.noop;
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
                if (el.matches?.(selector)) {
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
         * @en Retrieve all the elements contained in the {@link DOM} set, as an array.
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
         * @en Reduce the set of matched elements to the first in the set as {@link DOM} instance.
         * @ja 管轄している最初の要素を {@link DOM} インスタンスにして取得
         */
        first() {
            return dom(this[0]);
        }
        /**
         * @en Reduce the set of matched elements to the final one in the set as {@link DOM} instance.
         * @ja 管轄している末尾の要素を {@link DOM} インスタンスにして取得
         */
        last() {
            return dom(this[this.length - 1]);
        }
        /**
         * @en Create a new {@link DOM} instance with elements added to the set from selector.
         * @ja 指定された `selector` で取得した `Element` を追加した新規 {@link DOM} インスタンスを返却
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         * @en Check the current matched set of elements against a selector, element, or {@link DOM} instance.
         * @ja セレクタ, 要素, または {@link DOM} インスタンスを指定し, 現在の要素のセットと一致するか確認
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}, test function.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
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
         * @ja セレクタ, 要素, または {@link DOM} インスタンスを指定し, 現在の要素のセットと一致したものを返却
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}, test function.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
         * @returns
         *  - `en` New {@link DOM} instance including filtered elements.
         *  - `ja` フィルタリングされた要素を内包する 新規 {@link DOM} インスタンス
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
         * @ja セレクタ, 要素, または {@link DOM} インスタンスを指定し, 現在の要素のセットと一致したものを削除して返却
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}, test function.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
         * @returns
         *  - `en` New {@link DOM} instance excluding filtered elements.
         *  - `ja` フィルタリングされた要素を以外を内包する 新規 {@link DOM} インスタンス
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         * @en Pass each element in the current matched set through a function, producing a new {@link DOM} instance containing the return values.
         * @ja コールバックで変更された要素を用いて新たに {@link DOM} インスタンスを構築
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
         * @en Iterate over a {@link DOM} instance, executing a function for each matched element.
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
         * @ja インデックス指定された範囲の要素を含む {@link DOM} インスタンスを返却
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
         * @ja インデックス指定した要素を含む {@link DOM} インスタンスを返却
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}, test function.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列, テスト関数
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
         * @returns {@link DOM} instance
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
         * @returns {@link DOM} instance
         */
        parents(selector) {
            return this.parentsUntil(undefined, selector);
        }
        /**
         * @en Get the ancestors of each element in the current set of matched elements, <br>
         *     up to but not including the element matched by the selector, DOM node, or {@link DOM} instance
         * @ja 管轄している各要素の祖先で, 指定したセレクターや条件に一致する要素が出てくるまで選択して取得
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
         * @param filter
         *  - `en` filtered by a string selector.
         *  - `ja` フィルタ用文字列セレクタ
         * @returns {@link DOM} instance
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
                    const offset = getOffsetParent(el) ?? rootElement;
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
         *  - `en` element(s), text node(s), HTML string, or {@link DOM} instance.
         *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または {@link DOM} インスタンス
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
         */
        appendTo(selector) {
            return dom(selector).append(this);
        }
        /**
         * @en Insert content, specified by the parameter, to the beginning of each element in the set of matched elements.
         * @ja 配下の要素の先頭に引数で指定したコンテンツを挿入
         *
         * @param contents
         *  - `en` element(s), text node(s), HTML string, or {@link DOM} instance.
         *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または {@link DOM} インスタンス
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` element(s), text node(s), HTML string, or {@link DOM} instance.
         *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または {@link DOM} インスタンス
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
         */
        insertBefore(selector) {
            return dom(selector).before(this);
        }
        /**
         * @en Insert content, specified by the parameter, after each element in the set of matched elements.
         * @ja 配下の要素の後ろに指定した HTML や要素を挿入
         *
         * @param contents
         *  - `en` element(s), text node(s), HTML string, or {@link DOM} instance.
         *  - `ja` 追加する要素(群), テキストノード(群), HTML string, または {@link DOM} インスタンス
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるインスタンス(群)またはセレクタ文字列
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
        return (el.ownerDocument && el.ownerDocument.defaultView) ?? window;
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
                let offsetParent = getOffsetParent(el) ?? doc.documentElement;
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
        const data = _eventContextMap.eventData.get(event.target) ?? [];
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
                if (e.defaultPrevented) {
                    return;
                }
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
                                            (handler?.listener?.origin === listener) ||
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
         * @en Shortcut for {@link DOMEvents.once | once}('transitionstart').
         * @ja {@link DOMEvents.once | once}('transitionstart') のユーティリティ
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
         * @en Shortcut for {@link DOMEvents.once | once}('transitionend').
         * @ja {@link DOMEvents.once | once}('transitionend') のユーティリティ
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
         * @en Shortcut for {@link DOMEvents.once | once}('animationstart').
         * @ja {@link DOMEvents.once | once}('animationstart') のユーティリティ
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
         * @en Shortcut for {@link DOMEvents.once | once}('animationend').
         * @ja {@link DOMEvents.once | once}('animationend') のユーティリティ
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
            handlerOut = handlerOut ?? handlerIn;
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
                el = null;
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
                    const context = _animContextMap.get(el) ?? new Set();
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
         * @en Create {@link DOM} instance from `selector` arg.
         * @ja 指定された `selector` {@link DOM} インスタンスを作成
         *
         * @internal
         *
         * @param selector
         *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
         *  - `ja` {@link DOM} のもとになるオブジェクト(群)またはセレクタ文字列
         * @param context
         *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
         *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
         * @returns {@link DOM} instance.
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
     * @en Check the value-type is {@link DOM}.
     * @ja {@link DOM} 型であるか判定
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsImRldGVjdGlvbi50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJhdHRyaWJ1dGVzLnRzIiwidHJhdmVyc2luZy50cyIsIm1hbmlwdWxhdGlvbi50cyIsInN0eWxlcy50cyIsImV2ZW50cy50cyIsInNjcm9sbC50cyIsImVmZmVjdHMudHMiLCJjbGFzcy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyAgICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZG9jdW1lbnQgICAgICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEN1c3RvbUV2ZW50ICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5DdXN0b21FdmVudCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBzYWZlKGdsb2JhbFRoaXMucmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIE51bGxpc2gsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNGdW5jdGlvbixcbiAgICBjbGFzc05hbWUsXG4gICAgZ2V0R2xvYmFsTmFtZXNwYWNlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbmV4cG9ydCB0eXBlIEVsZW1lbnRCYXNlID0gTm9kZSB8IFdpbmRvdztcbmV4cG9ydCB0eXBlIEVsZW1lbnRSZXN1bHQ8VD4gPSBUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogSFRNTEVsZW1lbnQ7XG5leHBvcnQgdHlwZSBTZWxlY3RvckJhc2UgPSBOb2RlIHwgV2luZG93IHwgc3RyaW5nIHwgTnVsbGlzaDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBUIHwgKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFRbXSA6IG5ldmVyKSB8IE5vZGVMaXN0T2Y8VCBleHRlbmRzIE5vZGUgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgUXVlcnlDb250ZXh0ID0gUGFyZW50Tm9kZSAmIFBhcnRpYWw8Tm9uRWxlbWVudFBhcmVudE5vZGU+O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dDb250ZXh0KHg6IHVua25vd24pOiB4IGlzIFdpbmRvdyB7XG4gICAgcmV0dXJuICh4IGFzIFdpbmRvdyk/LnBhcmVudCBpbnN0YW5jZW9mIFdpbmRvdztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXSB7XG4gICAgaWYgKCFzZWVkKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb250ZXh0ID0gY29udGV4dCA/PyBkb2N1bWVudDtcbiAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG5cbiAgICB0cnkge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBodG1sID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHRtbC5zdGFydHNXaXRoKCc8JykgJiYgaHRtbC5lbmRzV2l0aCgnPicpKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFya3VwXG4gICAgICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi50ZW1wbGF0ZS5jb250ZW50LmNoaWxkcmVuKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBodG1sO1xuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQpICYmICgnIycgPT09IHNlbGVjdG9yWzBdKSAmJiAhL1sgLjw+On5dLy5leGVjKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXJlIElEIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvci5zdWJzdHJpbmcoMSkpO1xuICAgICAgICAgICAgICAgICAgICBlbCAmJiBlbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdib2R5JyA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYm9keVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIHNlbGVjdG9yc1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmNvbnRleHQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgoc2VlZCBhcyBOb2RlKS5ub2RlVHlwZSB8fCBpc1dpbmRvd0NvbnRleHQoc2VlZCkpIHtcbiAgICAgICAgICAgIC8vIE5vZGUvZWxlbWVudCwgV2luZG93XG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKHNlZWQgYXMgTm9kZSBhcyBFbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIGlmICgwIDwgKHNlZWQgYXMgVFtdKS5sZW5ndGggJiYgKChzZWVkIGFzIGFueSlbMF0ubm9kZVR5cGUgfHwgaXNXaW5kb3dDb250ZXh0KChzZWVkIGFzIGFueSlbMF0pKSkge1xuICAgICAgICAgICAgLy8gYXJyYXkgb2YgZWxlbWVudHMgb3IgY29sbGVjdGlvbiBvZiBET01cbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uKHNlZWQgYXMgTm9kZVtdIGFzIEVsZW1lbnRbXSkpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oYGVsZW1lbnRpZnkoJHtjbGFzc05hbWUoc2VlZCl9LCAke2NsYXNzTmFtZShjb250ZXh0KX0pLCBmYWlsZWQuIFtlcnJvcjoke2V9XWApO1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtZW50cyBhcyBFbGVtZW50UmVzdWx0PFQ+W107XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiByb290aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBFbGVtZW50UmVzdWx0PFQ+W10ge1xuICAgIGNvbnN0IHBhcnNlID0gKGVsOiBFbGVtZW50LCBwb29sOiBQYXJlbnROb2RlW10pOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3Qgcm9vdCA9IChlbCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpID8gZWwuY29udGVudCA6IGVsO1xuICAgICAgICBwb29sLnB1c2gocm9vdCk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlcyA9IHJvb3QucXVlcnlTZWxlY3RvckFsbCgndGVtcGxhdGUnKTtcbiAgICAgICAgZm9yIChjb25zdCB0IG9mIHRlbXBsYXRlcykge1xuICAgICAgICAgICAgcGFyc2UodCwgcG9vbCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgcm9vdHM6IFBhcmVudE5vZGVbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBlbCBvZiBlbGVtZW50aWZ5KHNlZWQsIGNvbnRleHQpKSB7XG4gICAgICAgIHBhcnNlKGVsIGFzIEVsZW1lbnQsIHJvb3RzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIEVuc3VyZSBwb3NpdGl2ZSBudW1iZXIsIGlmIG5vdCByZXR1cm5lZCBgdW5kZWZpbmVkYC5cbiAqIEBlbiDmraPlgKTjga7kv53oqLwuIOeVsOOBquOCi+WgtOWQiCBgdW5kZWZpbmVkYCDjgpLov5TljbRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVBvc2l0aXZlTnVtYmVyKHZhbHVlOiBudW1iZXIgfCB1bmRlZmluZWQpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiAoaXNOdW1iZXIodmFsdWUpICYmIDAgPD0gdmFsdWUpID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gRm9yIGVhc2luZyBgc3dpbmdgIHRpbWluZy1mdW5jdGlvbi5cbiAqIEBqYSBlYXNpbmcgYHN3aW5nYCDnlKjjgr/jgqTjg5/jg7PjgrDplqLmlbBcbiAqXG4gKiBAcmVmZXJlbmNlXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy85MjQ1MDMwL2xvb2tpbmctZm9yLWEtc3dpbmctbGlrZS1lYXNpbmctZXhwcmVzc2libGUtYm90aC13aXRoLWpxdWVyeS1hbmQtY3NzM1xuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTIwNzMwMS9qcXVlcnktZWFzaW5nLWZ1bmN0aW9ucy13aXRob3V0LXVzaW5nLWEtcGx1Z2luXG4gKlxuICogQHBhcmFtIHByb2dyZXNzIFswIC0gMV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aW5nKHByb2dyZXNzOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiAwLjUgLSAoTWF0aC5jb3MocHJvZ3Jlc3MgKiBNYXRoLlBJKSAvIDIpO1xufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NU3RhdGljLnV0aWxzLmV2YWx1YXRlIHwgZXZhbHVhdGV9KCkgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgRE9NU3RhdGljLnV0aWxzLmV2YWx1YXRlIHwgZXZhbHVhdGV9KCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZhbE9wdGlvbnMge1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgc3JjPzogc3RyaW5nO1xuICAgIG5vbmNlPzogc3RyaW5nO1xuICAgIG5vTW9kdWxlPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyaXB0c0F0dHJzOiAoa2V5b2YgRXZhbE9wdGlvbnMpW10gPSBbXG4gICAgJ3R5cGUnLFxuICAgICdzcmMnLFxuICAgICdub25jZScsXG4gICAgJ25vTW9kdWxlJyxcbl07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnkge1xuICAgIGNvbnN0IGRvYzogRG9jdW1lbnQgPSBjb250ZXh0ID8/IGRvY3VtZW50O1xuICAgIGNvbnN0IHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQudGV4dCA9IGBDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSA9ICgoKSA9PiB7IHJldHVybiAke2NvZGV9OyB9KSgpO2A7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgX3NjcmlwdHNBdHRycykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gKG9wdGlvbnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbYXR0cl0gfHwgKG9wdGlvbnMgYXMgRWxlbWVudCk/LmdldEF0dHJpYnV0ZT8uKGF0dHIpO1xuICAgICAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgICAgIHNjcmlwdC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGV4ZWN1dGVcbiAgICB0cnkge1xuICAgICAgICBnZXRHbG9iYWxOYW1lc3BhY2UoJ0NEUF9ET01fRVZBTF9SRVRVUk5fVkFMVUVfQlJJREdFJyk7XG4gICAgICAgIGRvYy5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCkucGFyZW50Tm9kZSEucmVtb3ZlQ2hpbGQoc2NyaXB0KTtcbiAgICAgICAgY29uc3QgcmV0dmFsID0gKGdsb2JhbFRoaXMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSddO1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIGRlbGV0ZSAoZ2xvYmFsVGhpcyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ0NEUF9ET01fRVZBTF9SRVRVUk5fVkFMVUVfQlJJREdFJ107XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZG9jdW1lbnQsIEN1c3RvbUV2ZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbm5lY3RFdmVudE1hcCB7XG4gICAgJ2Nvbm5lY3RlZCc6IEV2ZW50O1xuICAgICdkaXNjb25uZWN0ZWQnOiBFdmVudDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIE9ic2VydmVyQ29udGV4dCB7XG4gICAgdGFyZ2V0czogU2V0PE5vZGU+O1xuICAgIG9ic2VydmVyOiBNdXRhdGlvbk9ic2VydmVyO1xufVxuXG5jb25zdCBfb2JzZXJ2ZXJNYXAgPSBuZXcgTWFwPE5vZGUsIE9ic2VydmVyQ29udGV4dD4oKTtcblxuY29uc3QgcXVlcnlPYnNlcnZlZE5vZGUgPSAobm9kZTogTm9kZSk6IE5vZGUgfCB1bmRlZmluZWQgPT4ge1xuICAgIGZvciAoY29uc3QgW29ic2VydmVkTm9kZSwgY29udGV4dF0gb2YgX29ic2VydmVyTWFwKSB7XG4gICAgICAgIGlmIChjb250ZXh0LnRhcmdldHMuaGFzKG5vZGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2ZWROb2RlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG5jb25zdCBkaXNwYXRjaFRhcmdldCA9IChub2RlOiBOb2RlLCBldmVudDogRXZlbnQsIG5vZGVJbjogV2Vha1NldDxOb2RlPiwgbm9kZU91dDogV2Vha1NldDxOb2RlPik6IHZvaWQgPT4ge1xuICAgIGlmIChxdWVyeU9ic2VydmVkTm9kZShub2RlKSAmJiAhbm9kZUluLmhhcyhub2RlKSkge1xuICAgICAgICBub2RlT3V0LmRlbGV0ZShub2RlKTtcbiAgICAgICAgbm9kZUluLmFkZChub2RlKTtcbiAgICAgICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgZGlzcGF0Y2hUYXJnZXQoY2hpbGQsIGV2ZW50LCBub2RlSW4sIG5vZGVPdXQpO1xuICAgIH1cbn07XG5cbmNvbnN0ICBkaXNwYXRjaEFsbCA9IChub2RlczogTm9kZUxpc3QsIHR5cGU6IHN0cmluZywgbm9kZUluOiBXZWFrU2V0PE5vZGU+LCBub2RlT3V0OiBXZWFrU2V0PE5vZGU+KTogdm9pZCA9PiB7XG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgIE5vZGUuRUxFTUVOVF9OT0RFID09PSBub2RlLm5vZGVUeXBlICYmIGRpc3BhdGNoVGFyZ2V0KFxuICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgIG5ldyBDdXN0b21FdmVudCh0eXBlLCB7IGJ1YmJsZXM6IHRydWUsIGNhbmNlbGFibGU6IHRydWUgfSksXG4gICAgICAgICAgICBub2RlSW4sXG4gICAgICAgICAgICBub2RlT3V0LFxuICAgICAgICApO1xuICAgIH1cbn07XG5cbmNvbnN0IHN0YXJ0ID0gKG9ic2VydmVkTm9kZTogTm9kZSk6IE9ic2VydmVyQ29udGV4dCA9PiB7XG4gICAgY29uc3QgY29ubmVjdGVkID0gbmV3IFdlYWtTZXQ8Tm9kZT4oKTtcbiAgICBjb25zdCBkaXNjb25uZWN0ZWQgPSBuZXcgV2Vha1NldDxOb2RlPigpO1xuXG4gICAgY29uc3QgY2hhbmdlcyA9IChyZWNvcmRzOiBNdXRhdGlvblJlY29yZFtdKTogdm9pZCA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIHJlY29yZHMpIHtcbiAgICAgICAgICAgIGRpc3BhdGNoQWxsKHJlY29yZC5yZW1vdmVkTm9kZXMsICdkaXNjb25uZWN0ZWQnLCBkaXNjb25uZWN0ZWQsIGNvbm5lY3RlZCk7XG4gICAgICAgICAgICBkaXNwYXRjaEFsbChyZWNvcmQuYWRkZWROb2RlcywgJ2Nvbm5lY3RlZCcsIGNvbm5lY3RlZCwgZGlzY29ubmVjdGVkKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBjb250ZXh0OiBPYnNlcnZlckNvbnRleHQgPSB7XG4gICAgICAgIHRhcmdldHM6IG5ldyBTZXQoKSxcbiAgICAgICAgb2JzZXJ2ZXI6IG5ldyBNdXRhdGlvbk9ic2VydmVyKGNoYW5nZXMpLFxuICAgIH07XG4gICAgX29ic2VydmVyTWFwLnNldChvYnNlcnZlZE5vZGUsIGNvbnRleHQpO1xuICAgIGNvbnRleHQub2JzZXJ2ZXIub2JzZXJ2ZShvYnNlcnZlZE5vZGUsIHsgY2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlIH0pO1xuXG4gICAgcmV0dXJuIGNvbnRleHQ7XG59O1xuXG5jb25zdCBzdG9wQWxsID0gKCk6IHZvaWQgPT4ge1xuICAgIGZvciAoY29uc3QgWywgY29udGV4dF0gb2YgX29ic2VydmVyTWFwKSB7XG4gICAgICAgIGNvbnRleHQudGFyZ2V0cy5jbGVhcigpO1xuICAgICAgICBjb250ZXh0Lm9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG4gICAgX29ic2VydmVyTWFwLmNsZWFyKCk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZGV0ZWN0aWZ5ID0gPFQgZXh0ZW5kcyBOb2RlPihub2RlOiBULCBvYnNlcnZlZD86IE5vZGUpOiBUID0+IHtcbiAgICBjb25zdCBvYnNlcnZlZE5vZGUgPSBvYnNlcnZlZCA/PyAobm9kZS5vd25lckRvY3VtZW50Py5ib2R5ICYmIG5vZGUub3duZXJEb2N1bWVudCkgPz8gZG9jdW1lbnQ7XG4gICAgY29uc3QgY29udGV4dCA9IF9vYnNlcnZlck1hcC5nZXQob2JzZXJ2ZWROb2RlKSA/PyBzdGFydChvYnNlcnZlZE5vZGUpO1xuICAgIGNvbnRleHQudGFyZ2V0cy5hZGQobm9kZSk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdW5kZXRlY3RpZnkgPSA8VCBleHRlbmRzIE5vZGU+KG5vZGU/OiBUKTogdm9pZCA9PiB7XG4gICAgaWYgKG51bGwgPT0gbm9kZSkge1xuICAgICAgICBzdG9wQWxsKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2JzZXJ2ZWROb2RlID0gcXVlcnlPYnNlcnZlZE5vZGUobm9kZSk7XG4gICAgICAgIGlmIChvYnNlcnZlZE5vZGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfb2JzZXJ2ZXJNYXAuZ2V0KG9ic2VydmVkTm9kZSkhO1xuICAgICAgICAgICAgY29udGV4dC50YXJnZXRzLmRlbGV0ZShub2RlKTtcbiAgICAgICAgICAgIGlmICghY29udGV4dC50YXJnZXRzLnNpemUpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0Lm9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICBfb2JzZXJ2ZXJNYXAuZGVsZXRlKG9ic2VydmVkTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBXcml0YWJsZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIEVsZW1lbnRpZnlTZWVkLFxuICAgIEVsZW1lbnRSZXN1bHQsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBpc1dpbmRvd0NvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbiAgICByb290aWZ5LFxuICAgIGV2YWx1YXRlLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGRldGVjdGlmeSwgdW5kZXRlY3RpZnkgfSBmcm9tICcuL2RldGVjdGlvbic7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01QbHVnaW4sXG4gICAgRE9NQ2xhc3MsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbn0gZnJvbSAnLi9jbGFzcyc7XG5cbi8qKlxuICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgZXF1aXZhbGVudCB0byBgalF1ZXJ5YCBET00gbWFuaXB1bGF0aW9uLlxuICogQGphIGBqUXVlcnlgIOOBriBET00g5pON5L2c44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBkb20gYXMgJCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gR2V0IHRoZSA8YnV0dG9uPiBlbGVtZW50IHdpdGggdGhlIGNsYXNzICdjb250aW51ZScgYW5kIGNoYW5nZSBpdHMgSFRNTCB0byAnTmV4dCBTdGVwLi4uJ1xuICogJCgnYnV0dG9uLmNvbnRpbnVlJykuaHRtbCgnTmV4dCBTdGVwLi4uJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01TdGF0aWMge1xuICAgIC8qKlxuICAgICAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IGVxdWl2YWxlbnQgdG8gYGpRdWVyeWAgRE9NIG1hbmlwdWxhdGlvbi4gPGJyPlxuICAgICAqICAgICBDcmVhdGUge0BsaW5rIERPTX0gaW5zdGFuY2UgZnJvbSBgc2VsZWN0b3JgIGFyZy5cbiAgICAgKiBAamEgYGpRdWVyeWAg44GuIERPTSDmk43kvZzjgajlkIznrYnjga7mqZ/og73jgpLmj5DkvpsgPGJyPlxuICAgICAqICAgICDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgZG9tIGFzICQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICAgICAqXG4gICAgICogLy8gR2V0IHRoZSA8YnV0dG9uPiBlbGVtZW50IHdpdGggdGhlIGNsYXNzICdjb250aW51ZScgYW5kIGNoYW5nZSBpdHMgSFRNTCB0byAnTmV4dCBTdGVwLi4uJ1xuICAgICAqICQoJ2J1dHRvbi5jb250aW51ZScpLmh0bWwoJ05leHQgU3RlcC4uLicpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKiBAcmV0dXJucyB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBET01SZXN1bHQ8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIG9iamVjdCdzIGBwcm90b3R5cGVgIGFsaWFzLlxuICAgICAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga4gYHByb3RvdHlwZWDjgqjjgqTjg6rjgqLjgrlcbiAgICAgKi9cbiAgICBmbjogRE9NQ2xhc3MgJiBSZWNvcmQ8c3RyaW5nIHwgc3ltYm9sLCB1bmtub3duPjtcblxuICAgIC8qKiBET00gVXRpbGl0aWVzICovXG4gICAgcmVhZG9ubHkgdXRpbHM6IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyBXaW5kb3cuXG4gICAgICAgICAqIEBqYSBXaW5kb3cg5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB4XG4gICAgICAgICAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gICAgICAgICAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gICAgICAgICAqL1xuICAgICAgICBpc1dpbmRvd0NvbnRleHQoeDogdW5rbm93bik6IHggaXMgV2luZG93O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gQ3JlYXRlIEVsZW1lbnQgYXJyYXkgZnJvbSBzZWVkIGFyZy5cbiAgICAgICAgICogQGphIOaMh+WumuOBleOCjOOBnyBTZWVkIOOBi+OCiSBFbGVtZW50IOmFjeWIl+OCkuS9nOaIkFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gICAgICAgICAqICAtIGBqYWAgRWxlbWVudCDphY3liJfjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICAgICAqIEByZXR1cm5zIEVsZW1lbnRbXSBiYXNlZCBOb2RlIG9yIFdpbmRvdyBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICBlbGVtZW50aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBFbGVtZW50UmVzdWx0PFQ+W107XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBDcmVhdGUgRWxlbWVudCBhcnJheSBmcm9tIHNlZWQgYXJnLiA8YnI+XG4gICAgICAgICAqICAgICBBbmQgYWxzbyBsaXN0cyBmb3IgdGhlIGBEb2N1bWVudEZyYWdtZW50YCBpbnNpZGUgdGhlIGA8dGVtcGxhdGU+YCB0YWcuXG4gICAgICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gU2VlZCDjgYvjgokgRWxlbWVudCDphY3liJfjgpLkvZzmiJAgPGJyPlxuICAgICAgICAgKiAgICAgYDx0ZW1wbGF0ZT5gIOOCv+OCsOWGheOBriBgRG9jdW1lbnRGcmFnbWVudGAg44KC5YiX5oyZ44GZ44KLXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRWxlbWVudCBhcnJheS5cbiAgICAgICAgICogIC0gYGphYCBFbGVtZW50IOmFjeWIl+OBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgICAgICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUuXG4gICAgICAgICAqL1xuICAgICAgICByb290aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBFbGVtZW50UmVzdWx0PFQ+W107XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBUaGUgYGV2YWxgIGZ1bmN0aW9uIGJ5IHdoaWNoIHNjcmlwdCBgbm9uY2VgIGF0dHJpYnV0ZSBjb25zaWRlcmVkIHVuZGVyIHRoZSBDU1AgY29uZGl0aW9uLlxuICAgICAgICAgKiBAamEgQ1NQIOeSsOWig+OBq+OBiuOBhOOBpuOCueOCr+ODquODl+ODiCBgbm9uY2VgIOWxnuaAp+OCkuiAg+aFruOBl+OBnyBgZXZhbGAg5a6f6KGM6Zai5pWwXG4gICAgICAgICAqL1xuICAgICAgICBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gRW5hYmxpbmcgdGhlIG5vZGUgdG8gZGV0ZWN0IGV2ZW50cyBvZiBET00gY29ubmVjdGVkIGFuZCBkaXNjb25uZWN0ZWQuXG4gICAgICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIERPTSDjgbjjga7mjqXntposIERPTSDjgYvjgonjga7liIfmlq3jgqTjg5njg7Pjg4jjgpLmpJzlh7rlj6/og73jgavjgZnjgotcbiAgICAgICAgICpcbiAgICAgICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAgICAgKlxuICAgICAgICAgKiBgYGB0c1xuICAgICAgICAgKiBpbXBvcnQgeyBkb20gfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICAgICAgICAgKiBjb25zdCB7IGRldGVjdGlmeSwgdW5kZXRlY3RpZnkgfSA9IGRvbS51dGlscztcbiAgICAgICAgICpcbiAgICAgICAgICogY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICpcbiAgICAgICAgICogLy8gb2JzZXJ2YXRpb24gc3RhcnRcbiAgICAgICAgICogZGV0ZWN0aWZ5KGVsKTtcbiAgICAgICAgICogZWwuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGVkJywgKCkgPT4ge1xuICAgICAgICAgKiAgICAgY29uc29sZS5sb2coJ29uIGNvbm5lY3RlZCcpO1xuICAgICAgICAgKiB9KTtcbiAgICAgICAgICogZWwuYWRkRXZlbnRMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgKCkgPT4ge1xuICAgICAgICAgKiAgICAgY29uc29sZS5sb2coJ29uIGRpc2Nvbm5lY3RlZCcpO1xuICAgICAgICAgKiB9KTtcbiAgICAgICAgICpcbiAgICAgICAgICogLy8gb2JzZXJ2YXRpb24gc3RvcFxuICAgICAgICAgKiB1bmRldGVjdGlmeShlbCk7XG4gICAgICAgICAqIGBgYFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAgICAgKiAgLSBgZW5gIHRhcmdldCBub2RlXG4gICAgICAgICAqICAtIGBqYWAg5a++6LGh44Gu6KaB57SgXG4gICAgICAgICAqIEBwYXJhbSBvYnNlcnZlZFxuICAgICAgICAgKiAgLSBgZW5gIFNwZWNpZmllcyB0aGUgcm9vdCBlbGVtZW50IHRvIHdhdGNoLiBJZiBub3Qgc3BlY2lmaWVkLCBgb3duZXJEb2N1bWVudGAgaXMgZXZhbHVhdGVkIGZpcnN0LCBmb2xsb3dlZCBieSBnbG9iYWwgYGRvY3VtZW50YC5cbiAgICAgICAgICogIC0gYGphYCDnm6Poppblr77osaHjga7jg6vjg7zjg4jopoHntKDjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBryBgb3duZXJEb2N1bWVudGAsIOOCsOODreODvOODkOODqyBgZG9jdW1lbnRgIOOBrumghuOBq+ipleS+oeOBleOCjOOCi1xuICAgICAgICAgKi9cbiAgICAgICAgZGV0ZWN0aWZ5PFQgZXh0ZW5kcyBOb2RlPihub2RlOiBULCBvYnNlcnZlZD86IE5vZGUpOiBUO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVW5kZXRlY3QgY29ubmVjdGVkIGFuZCBkaXNjb25uZWN0ZWQgZnJvbSBET00gZXZlbnRzIGZvciBhbiBlbGVtZW50LlxuICAgICAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCBET00g44G444Gu5o6l57aaLCBET00g44GL44KJ44Gu5YiH5pat44Kk44OZ44Oz44OI44KS5qSc5Ye644KS6Kej6Zmk44GZ44KLXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBub2RlXG4gICAgICAgICAqICAtIGBlbmAgdGFyZ2V0IG5vZGUuIElmIG5vdCBzcGVjaWZpZWQsIGV4ZWN1dGUgYWxsIHJlbGVhc2UuXG4gICAgICAgICAqICAtIGBqYWAg5a++6LGh44Gu6KaB57SgLiDmjIflrprjgZfjgarjgYTloLTlkIjjga/lhajop6PpmaTjgpLlrp/ooYxcbiAgICAgICAgICovXG4gICAgICAgIHVuZGV0ZWN0aWZ5PFQgZXh0ZW5kcyBOb2RlPihub2RlPzogVCk6IHZvaWQ7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRE9NRmFjdG9yeSA9IDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCkgPT4gRE9NUmVzdWx0PFQ+O1xuXG5sZXQgX2ZhY3RvcnkhOiBET01GYWN0b3J5O1xuXG5jb25zdCBkb20gPSAoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+ID0+IHtcbiAgICByZXR1cm4gX2ZhY3Rvcnkoc2VsZWN0b3IsIGNvbnRleHQpO1xufSkgYXMgRE9NU3RhdGljO1xuXG4oZG9tIGFzIFdyaXRhYmxlPERPTVN0YXRpYz4pLnV0aWxzID0ge1xuICAgIGlzV2luZG93Q29udGV4dCxcbiAgICBlbGVtZW50aWZ5LFxuICAgIHJvb3RpZnksXG4gICAgZXZhbHVhdGUsXG4gICAgZGV0ZWN0aWZ5LFxuICAgIHVuZGV0ZWN0aWZ5LFxufTtcblxuLyoqIEBpbnRlcm5hbCDlvqrnkrDlj4Lnhaflm57pgb/jga7jgZ/jgoHjga7pgYXlu7bjgrPjg7Pjgrnjg4jjg6njgq/jgrfjg6fjg7Pjg6Hjgr3jg4Pjg4kgKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cChmbjogRE9NQ2xhc3MsIGZhY3Rvcnk6IERPTUZhY3RvcnkpOiB2b2lkIHtcbiAgICBfZmFjdG9yeSA9IGZhY3Rvcnk7XG4gICAgKGRvbS5mbiBhcyBET01DbGFzcykgPSBmbjtcbn1cblxuZXhwb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIEV2YWxPcHRpb25zLFxuICAgIERPTSxcbiAgICBET01QbHVnaW4sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20sXG59O1xuIiwiaW1wb3J0IHR5cGUgeyBOdWxsaXNoLCBXcml0YWJsZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBpc1dpbmRvd0NvbnRleHQgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yID0gU3ltYm9sKCdjcmVhdGUtaXRlcmFibGUtaXRlcmF0b3InKTtcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdGlvbiBjbGFzcyBvZiB7QGxpbmsgRE9NQ2xhc3N9LiBUaGlzIGNsYXNzIHByb3ZpZGVzIGl0ZXJhdG9yIG1ldGhvZHMuXG4gKiBAamEge0BsaW5rIERPTUNsYXNzfSDjga7ln7rlupXmir3osaHjgq/jg6njgrkuIGl0ZXJhdG9yIOOCkuaPkOS+my5cbiAqL1xuZXhwb3J0IGNsYXNzIERPTUJhc2U8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIEFycmF5TGlrZTxUPiwgSXRlcmFibGU8VD4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBudW1iZXIgb2YgYEVsZW1lbnRgXG4gICAgICogQGphIOWGheWMheOBmeOCiyBgRWxlbWVudGAg5pWwXG4gICAgICovXG4gICAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYEVsZW1lbnRgIGFjY2Vzc29yXG4gICAgICogQGphIGBFbGVtZW50YCDjgbjjga7mt7vjgYjlrZfjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVDtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBUW10pIHtcbiAgICAgICAgY29uc3Qgc2VsZjogV3JpdGFibGU8RE9NQWNjZXNzPFQ+PiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYCBhbmQgY29ubmVjdGVkIHRvYCBEb2N1bWVudGAgb3IgYFNoYWRvd1Jvb3RgLlxuICAgICAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCiuOBi+OBpCBgRG9jdW1lbnRgIOOBvuOBn+OBryBgU2hhZG93Um9vdGAg44Gr5o6l57aa44GV44KM44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgZ2V0IGlzQ29ubmVjdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2Yge0BsaW5rIEVsZW1lbnRCYXNlfSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosge0BsaW5rIEVsZW1lbnRCYXNlfSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFQ+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZSh7QGxpbmsgRWxlbWVudEJhc2V9KSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpLCB2YWx1ZSh7QGxpbmsgRWxlbWVudEJhc2V9KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpbmRleCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlcikgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gdmFsdWUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGl0ZXJhdG9yIGNyZWF0ZSBmdW5jdGlvbiAqL1xuICAgIHByaXZhdGUgW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXTxSPih2YWx1ZUdlbmVyYXRvcjogKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4gPSB7XG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFI+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY29udGV4dC5wb2ludGVyO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgY29udGV4dC5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBvaW50ZXIrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlR2VuZXJhdG9yKGN1cnJlbnQsIGNvbnRleHQuYmFzZVtjdXJyZW50XSksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LW9iamVjdC10eXBlXG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYE5vZGVgLlxuICogQGphIOWvvuixoeOBjCBgTm9kZWAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZShlbDogdW5rbm93bik6IGVsIGlzIE5vZGUge1xuICAgIHJldHVybiAhIShlbCAmJiAoZWwgYXMgTm9kZSkubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkVMRU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBIVE1MRWxlbWVudGAg44G+44Gf44GvIGBTVkdFbGVtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAge0BsaW5rIEVsZW1lbnRCYXNlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRWxlbWVudEJhc2V9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgSFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YCBvciBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44G+44Gf44GvIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVF1ZXJpYWJsZShlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgRWxlbWVudCB8IERvY3VtZW50IHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkucXVlcnlTZWxlY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRG9jdW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVEb2N1bWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgRG9jdW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkRPQ1VNRU5UX05PREUgPT09IGVsLm5vZGVUeXBlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHtAbGluayBET019IHRhcmdldCBpcyBgRWxlbWVudGAuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUVsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RWxlbWVudD4ge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGRvbVswXSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHtAbGluayBET019IHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAge0BsaW5rIERPTUl0ZXJhYmxlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRE9NSXRlcmFibGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlSFRNTE9yU1ZHRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgYwgYERvY3VtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZURvY3VtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPERvY3VtZW50PiB7XG4gICAgcmV0dXJuIGRvbVswXSBpbnN0YW5jZW9mIERvY3VtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYFdpbmRvd2AuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBXaW5kb3dgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAge0BsaW5rIERPTUl0ZXJhYmxlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRE9NSXRlcmFibGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlV2luZG93KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPFdpbmRvdz4ge1xuICAgIHJldHVybiBpc1dpbmRvd0NvbnRleHQoZG9tWzBdKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE51bGxpc2guXG4gKiBAamEgTnVsbGlzaCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE51bGxpc2g+IHtcbiAgICByZXR1cm4gIXNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIHN0cmluZz4ge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOb2RlLlxuICogQGphIE5vZGUg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGU+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgTm9kZSkubm9kZVR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIEVsZW1lbnQuXG4gKiBAamEgRWxlbWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbGVtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRWxlbWVudD4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIEVsZW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIERvY3VtZW50LlxuICogQGphIERvY3VtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RvY3VtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBEb2N1bWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgV2luZG93LlxuICogQGphIFdpbmRvdyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBXaW5kb3c+IHtcbiAgICByZXR1cm4gaXNXaW5kb3dDb250ZXh0KHNlbGVjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIGlzIGFibGUgdG8gaXRlcmF0ZS5cbiAqIEBqYSDotbDmn7vlj6/og73jgarjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGVMaXN0T2Y8Tm9kZT4+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgVFtdKS5sZW5ndGg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIHtAbGluayBET019LlxuICogQGphIHtAbGluayBET019IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERPTT4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayBub2RlIG5hbWUgaXMgYXJndW1lbnQuXG4gKiBAamEgTm9kZSDlkI3jgYzlvJXmlbDjgafkuI7jgYjjgZ/lkI3liY3jgajkuIDoh7TjgZnjgovjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vZGVOYW1lKGVsZW06IE5vZGUgfCBudWxsLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISEoZWxlbSAmJiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUudG9Mb3dlckNhc2UoKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCBub2RlIG9mZnNldCBwYXJlbnQuIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZXQgcGFyZW50IOOBruWPluW+ly4gU1ZHRWxlbWVudCDjgavjgoLpgannlKjlj6/og71cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE9mZnNldFBhcmVudChub2RlOiBOb2RlKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmICgobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50KSB7XG4gICAgICAgIHJldHVybiAobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50O1xuICAgIH0gZWxzZSBpZiAobm9kZU5hbWUobm9kZSwgJ3N2ZycpKSB7XG4gICAgICAgIGNvbnN0ICRzdmcgPSAkKG5vZGUpO1xuICAgICAgICBjb25zdCBjc3NQcm9wcyA9ICRzdmcuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgaWYgKCdub25lJyA9PT0gY3NzUHJvcHMuZGlzcGxheSB8fCAnZml4ZWQnID09PSBjc3NQcm9wcy5wb3NpdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGFyZW50ID0gJHN2Z1swXS5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGlzcGxheSwgcG9zaXRpb24gfSA9ICQocGFyZW50KS5jc3MoWydkaXNwbGF5JywgJ3Bvc2l0aW9uJ10pO1xuICAgICAgICAgICAgICAgIGlmICgnbm9uZScgPT09IGRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghcG9zaXRpb24gfHwgJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIFBsYWluT2JqZWN0LFxuICAgIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lcyxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICB0b1R5cGVkRGF0YSxcbiAgICBmcm9tVHlwZWREYXRhLFxuICAgIGFzc2lnblZhbHVlLFxuICAgIGNhbWVsaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCB0eXBlIERPTVZhbHVlVHlwZTxULCBLID0gJ3ZhbHVlJz4gPSBUIGV4dGVuZHMgSFRNTFNlbGVjdEVsZW1lbnQgPyAoc3RyaW5nIHwgc3RyaW5nW10pIDogSyBleHRlbmRzIGtleW9mIFQgPyBUW0tdIDogc3RyaW5nO1xuZXhwb3J0IHR5cGUgRE9NRGF0YSA9IFBsYWluT2JqZWN0PFR5cGVkRGF0YT47XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgdmFsKClgKi9cbmZ1bmN0aW9uIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsOiBFbGVtZW50QmFzZSk6IGVsIGlzIEhUTUxTZWxlY3RFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgJ3NlbGVjdCcgPT09IGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgJiYgKGVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5tdWx0aXBsZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNJbnB1dEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTElucHV0RWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmIChudWxsICE9IChlbCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgYXR0cmlidXRlcyBtZXRob2RzLlxuICogQGphIOWxnuaAp+aTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NQXR0cmlidXRlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBDbGFzc2VzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGRDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBjc3MgY2xhc3MgdG8gZWxlbWVudHMuXG4gICAgICogQGphIGNzcyBjbGFzcyDopoHntKDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciBhbnkgb2YgdGhlIG1hdGNoZWQgZWxlbWVudHMgYXJlIGFzc2lnbmVkIHRoZSBnaXZlbiBjbGFzcy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS5bCR44Gq44GP44Go44KC6KaB57Sg44GM5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI1cbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkgJiYgZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBvciByZW1vdmUgb25lIG9yIG1vcmUgY2xhc3NlcyBmcm9tIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIDxicj5cbiAgICAgKiAgICAgZGVwZW5kaW5nIG9uIGVpdGhlciB0aGUgY2xhc3MncyBwcmVzZW5jZSBvciB0aGUgdmFsdWUgb2YgdGhlIHN0YXRlIGFyZ3VtZW50LlxuICAgICAqIEBqYSDnj77lnKjjga7nirbmhYvjgavlv5zjgZjjgaYsIOaMh+WumuOBleOCjOOBn+OCr+ODqeOCueWQjeOCkuimgee0oOOBq+i/veWKoC/liYrpmaTjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gZm9yY2VcbiAgICAgKiAgLSBgZW5gIGlmIHRoaXMgYXJndW1lbnQgZXhpc3RzLCB0cnVlOiB0aGUgY2xhc3NlcyBzaG91bGQgYmUgYWRkZWQgLyBmYWxzZTogcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBjOWtmOWcqOOBmeOCi+WgtOWQiCwgdHJ1ZTog44Kv44Op44K544KS6L+95YqgIC8gZmFsc2U6IOOCr+ODqeOCueOCkuWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyB0b2dnbGVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdLCBmb3JjZT86IGJvb2xlYW4pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgY29uc3Qgb3BlcmF0aW9uID0gKCgpID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsID09IGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBjbGFzc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmNsYXNzTGlzdC50b2dnbGUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmb3JjZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpID0+IGVsZW0uY2xhc3NMaXN0LnJlbW92ZSguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIG9wZXJhdGlvbihlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcHJvcGVydHkgdmFsdWUuIDxicj5cbiAgICAgKiAgICAgVGhlIG1ldGhvZCBnZXRzIHRoZSBwcm9wZXJ0eSB2YWx1ZSBmb3Igb25seSB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WApOOBruWPluW+lyA8YnI+XG4gICAgICogICAgIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvcDxUIGV4dGVuZHMgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFRFbGVtZW50Pj4obmFtZTogVCk6IFRFbGVtZW50W1RdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzaW5nbGUgcHJvcGVydHkgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IHZhbHVlXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovjg5fjg63jg5Hjg4bjgqPlgKRcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvcDxUIGV4dGVuZHMgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFRFbGVtZW50Pj4obmFtZTogVCwgdmFsdWU6IFRFbGVtZW50W1RdKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbXVsdGkgcHJvcGVydHkgdmFsdWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuikh+aVsOODl+ODreODkeODhuOCo+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnRpZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBwcm9wZXJ0eS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBwcm9wZXJ0eS12YWx1ZSDjg5rjgqLjgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvcChwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgcHJvcDxUIGV4dGVuZHMgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFRFbGVtZW50Pj4oa2V5OiBUIHwgUGxhaW5PYmplY3QsIHZhbHVlPzogVEVsZW1lbnRbVF0pOiBURWxlbWVudFtUXSB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBwcm9wZXJ0eVxuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzWzBdIGFzIFRFbGVtZW50ICYgUmVjb3JkPHN0cmluZywgVEVsZW1lbnRbVF0+O1xuICAgICAgICAgICAgcmV0dXJuIGZpcnN0ICYmIGZpcnN0W2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgcHJvcGVydHlcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShlbCBhcyB1bmtub3duIGFzIFVua25vd25PYmplY3QsIGtleSBhcyBzdHJpbmcsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBtdWx0aXBsZVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShlbCBhcyB1bmtub3duIGFzIFVua25vd25PYmplY3QsIG5hbWUsIChrZXkgYXMgUmVjb3JkPHN0cmluZywgVEVsZW1lbnRbVF0+KVtuYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhdHRyaWJ1dGUgdmFsdWUuIDxicj5cbiAgICAgKiAgICAgVGhlIG1ldGhvZCBnZXRzIHRoZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDlsZ7mgKflgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIGF0dHJpYnV0ZSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSB2YWx1ZS4gaWYgYG51bGxgIHNldCwgcmVtb3ZlIGF0dHJpYnV0ZS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WxnuaAp+WApC4gYG51bGxgIOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiOWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbXVsdGkgYXR0cmlidXRlIHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgYXR0cmlidXRlLXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIGF0dHJpYnV0ZS12YWx1ZSDjg5rjgqLjgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgYXR0cihrZXk6IHN0cmluZyB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQgPT09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmICh1bmRlZmluZWQgPT09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKGtleSk7XG4gICAgICAgICAgICByZXR1cm4gYXR0ciA/PyB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbW92ZUF0dHIoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgYXR0cmlidXRlXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKGtleSBhcyBzdHJpbmcsIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0gKGtleSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT09IHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIFN0cmluZyh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf5bGe5oCn44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgYXR0cmlidXRlIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44G+44Gf44Gv5bGe5oCn5ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUF0dHIobmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhdHRycyA9IGlzQXJyYXkobmFtZSkgPyBuYW1lIDogW25hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVmFsdWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEgdmFsdWUg5YCk44Gu5Y+W5b6XLiDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgc3RyaW5nYCBvciBgbnVtYmVyYCBvciBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YCkuXG4gICAgICogIC0gYGphYCBgc3RyaW5nYCDjgb7jgZ/jga8gYG51bWJlcmAg44G+44Gf44GvIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KCk6IERPTVZhbHVlVHlwZTxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIHZhbHVlIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44GmIHZhbHVlIOWApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBgc3RyaW5nYCBvciBgbnVtYmVyYCBvciBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YCkuXG4gICAgICogIC0gYGphYCBgc3RyaW5nYCDjgb7jgZ/jga8gYG51bWJlcmAg44G+44Gf44GvIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlOiBET01WYWx1ZVR5cGU8VD4pOiB0aGlzO1xuXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU/OiBET01WYWx1ZVR5cGU8VD4pOiBhbnkge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc011bHRpU2VsZWN0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5zZWxlY3RlZE9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnB1c2gob3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ3ZhbHVlJyBpbiBlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWwgYXMgYW55KS52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gc3VwcG9ydCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiBpc011bHRpU2VsZWN0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwub3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gdmFsdWUuaW5jbHVkZXMob3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbnB1dEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnZhbHVlID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBEYXRhXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZXMgYWxsIGBET01TdHJpbmdNYXBgIHN0b3JlIHNldCBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIEhUTUw1IGRhdGEtKiDlsZ7mgKfjgacgYERPTVN0cmluZ01hcGAg44Gr5qC857SN44GV44KM44Gf5YWo44OH44O844K/5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGRhdGEoKTogRE9NRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlIGF0IHRoZSBuYW1lZCBkYXRhIHN0b3JlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbiwgYXMgc2V0IGJ5IGRhdGEoa2V5LCB2YWx1ZSkgb3IgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIGtleSDjgafmjIflrprjgZfjgZ8gSFRNTDUgZGF0YS0qIOWxnuaAp+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvcmUgYXJiaXRyYXJ5IGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabku7vmhI/jga7jg4fjg7zjgr/jgpLmoLzntI1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgZGF0YSB2YWx1ZSAobm90IG9ubHkgYHN0cmluZ2ApXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmjIflrpogKOaWh+Wtl+WIl+S7peWkluOCguWPl+S7mOWPrylcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZywgdmFsdWU6IFR5cGVkRGF0YSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGF0YShrZXk/OiBzdHJpbmcsIHZhbHVlPzogVHlwZWREYXRhKTogRE9NRGF0YSB8IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBzdXBwb3J0ZWQgZGF0YXNldCBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgZGF0YXNldFxuICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IHRoaXNbMF0uZGF0YXNldDtcbiAgICAgICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBhbGwgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGE6IERPTURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoZGF0YXNldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoZGF0YSwgcHJvcCwgdG9UeXBlZERhdGEoZGF0YXNldFtwcm9wXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gdHlwZWQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9UeXBlZERhdGEoZGF0YXNldFtjYW1lbGl6ZShrZXkpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSBjYW1lbGl6ZShrZXkgPz8gJycpO1xuICAgICAgICAgICAgaWYgKHByb3ApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShlbC5kYXRhc2V0IGFzIHVua25vd24gYXMgVW5rbm93bk9iamVjdCwgcHJvcCwgZnJvbVR5cGVkRGF0YSh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBkYXRhLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/jg4fjg7zjgr/jgpLjg4fjg7zjgr/poJjln5/jgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVEYXRhKGtleTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkoa2V5KSA/IGtleS5tYXAoayA9PiBjYW1lbGl6ZShrKSkgOiBbY2FtZWxpemUoa2V5KV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkYXRhc2V0IH0gPSBlbDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFzZXRbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQXR0cmlidXRlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgbm9vcCxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgaXNXaW5kb3dDb250ZXh0IH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NQmFzZSxcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVRdWVyaWFibGUsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG4gICAgaXNFbXB0eVNlbGVjdG9yLFxuICAgIGlzU3RyaW5nU2VsZWN0b3IsXG4gICAgaXNEb2N1bWVudFNlbGVjdG9yLFxuICAgIGlzV2luZG93U2VsZWN0b3IsXG4gICAgaXNOb2RlU2VsZWN0b3IsXG4gICAgaXNJdGVyYWJsZVNlbGVjdG9yLFxuICAgIG5vZGVOYW1lLFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VCBleHRlbmRzIEVsZW1lbnRCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IFU7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgaXMoKWAgYW5kIGBmaWx0ZXIoKWAgKi9cbmZ1bmN0aW9uIHdpbm5vdzxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxVPixcbiAgICBkb206IERPTVRyYXZlcnNpbmc8VT4sXG4gICAgdmFsaWRDYWxsYmFjazogKGVsOiBVKSA9PiB1bmtub3duLFxuICAgIGludmFsaWRDYWxsYmFjaz86ICgpID0+IHVua25vd24sXG4pOiBhbnkge1xuICAgIGludmFsaWRDYWxsYmFjayA9IGludmFsaWRDYWxsYmFjayA/PyBub29wO1xuXG4gICAgbGV0IHJldHZhbDogdW5rbm93bjtcbiAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIGRvbS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IuY2FsbChlbCwgaW5kZXgsIGVsKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZ1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXM/LihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChpc1dpbmRvd0NvbnRleHQoZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50ID09PSBlbCBhcyBOb2RlIGFzIERvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAsIGBwYXJlbnRzKClgIGFuZCBgc2libGluZ3MoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNoaWxkcmVuKClgLCBgcGFyZW50KClgLCBgbmV4dCgpYCBhbmQgYHByZXYoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUmV0cmlldmVOb2RlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5vZGU6IE5vZGUgfCBudWxsLCBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQpOiBub2RlIGlzIE5vZGUge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKCQobm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgbmV4dFVudGlsKClgIGFuZCBgcHJldlVudGlsKCkgKi9cbmZ1bmN0aW9uIHJldHJpZXZlU2libGluZ3M8XG4gICAgRSBleHRlbmRzIEVsZW1lbnRCYXNlLFxuICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4+KFxuICAgIHNpYmxpbmc6ICdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJyB8ICduZXh0RWxlbWVudFNpYmxpbmcnLFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxFPixcbiAgICBzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPlxuKTogRE9NPFQ+IHtcbiAgICBpZiAoIWlzVHlwZUVsZW1lbnQoZG9tKSkge1xuICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZG9tIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgIGxldCBlbGVtID0gZWxbc2libGluZ107XG4gICAgICAgIHdoaWxlIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtID0gZWxlbVtzaWJsaW5nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSB0cmF2ZXJzaW5nIG1ldGhvZHMuXG4gKiBAamEg44OI44Op44OQ44O844K544Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01UcmF2ZXJzaW5nPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVsZW1lbnQgTWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIG9uZSBvZiB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpumFjeS4i+OBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBURWxlbWVudCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoKTogVEVsZW1lbnRbXTtcblxuICAgIHB1YmxpYyBnZXQoaW5kZXg/OiBudW1iZXIpOiBURWxlbWVudFtdIHwgVEVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCAhPSBpbmRleCkge1xuICAgICAgICAgICAgaW5kZXggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCA8IDAgPyB0aGlzW2luZGV4ICsgdGhpcy5sZW5ndGhdIDogdGhpc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0FycmF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgYWxsIHRoZSBlbGVtZW50cyBjb250YWluZWQgaW4gdGhlIHtAbGluayBET019IHNldCwgYXMgYW4gYXJyYXkuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyB0b0FycmF5KCk6IFRFbGVtZW50W10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXNdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBlbGVtZW50IHdpdGhpbiB0aGUge0BsaW5rIERPTX0gY29sbGVjdGlvbiByZWxhdGl2ZSB0byBpdHMgc2libGluZyBlbGVtZW50cy5cbiAgICAgKiBAamEge0BsaW5rIERPTX0g5YaF44Gu5pyA5Yid44Gu6KaB57Sg44GM5YWE5byf6KaB57Sg44Gu5L2V55Wq55uu44Gr5omA5bGe44GZ44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWFyY2ggZm9yIGEgZ2l2ZW4gYSBzZWxlY3RvciwgZWxlbWVudCwgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UgZnJvbSBhbW9uZyB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOmFjeS4i+OBruS9leeVquebruOBq+aJgOWxnuOBl+OBpuOBhOOCi+OBi+OCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yOiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgcHVibGljIGluZGV4PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oc2VsZWN0b3I/OiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgIGxldCBjaGlsZDogTm9kZSB8IG51bGwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgd2hpbGUgKG51bGwgIT09IChjaGlsZCA9IGNoaWxkLnByZXZpb3VzU2libGluZykpIHtcbiAgICAgICAgICAgICAgICBpZiAoTm9kZS5FTEVNRU5UX05PREUgPT09IGNoaWxkLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlbGVtOiBUIHwgRWxlbWVudDtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gJChzZWxlY3RvcilbMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW0gPSBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2UgPyBzZWxlY3RvclswXSA6IHNlbGVjdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaSA9IFsuLi50aGlzXS5pbmRleE9mKGVsZW0gYXMgVEVsZW1lbnQgJiBFbGVtZW50KTtcbiAgICAgICAgICAgIHJldHVybiAwIDw9IGkgPyBpIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBUcmF2ZXJzaW5nXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmlyc3QgaW4gdGhlIHNldCBhcyB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyA5Yid44Gu6KaB57Sg44KSIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOBq+OBl+OBpuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1swXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmluYWwgb25lIGluIHRoZSBzZXQgYXMge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+acq+WwvuOBruimgee0oOOCkiB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1t0aGlzLmxlbmd0aCAtIDFdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcge0BsaW5rIERPTX0gaW5zdGFuY2Ugd2l0aCBlbGVtZW50cyBhZGRlZCB0byB0aGUgc2V0IGZyb20gc2VsZWN0b3IuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIOOBp+WPluW+l+OBl+OBnyBgRWxlbWVudGAg44KS6L+95Yqg44GX44Gf5paw6KaPIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCAkYWRkID0gJChzZWxlY3RvciwgY29udGV4dCk7XG4gICAgICAgIGNvbnN0IGVsZW1zID0gbmV3IFNldChbLi4udGhpcywgLi4uJGFkZF0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbXNdIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IG9mIGVsZW1lbnRzIGFnYWluc3QgYSBzZWxlY3RvciwgZWxlbWVudCwgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGB0cnVlYCBpZiBhdCBsZWFzdCBvbmUgb2YgdGhlc2UgZWxlbWVudHMgbWF0Y2hlcyB0aGUgZ2l2ZW4gYXJndW1lbnRzLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gr5oyH5a6a44GX44Gf5p2h5Lu244GM6KaB57Sg44Gu5LiA44Gk44Gn44KC5LiA6Ie044GZ44KM44GwIGB0cnVlYCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaXM8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKCkgPT4gdHJ1ZSwgKCkgPT4gZmFsc2UpIGFzIGJvb2xlYW47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcge0BsaW5rIERPTX0gaW5zdGFuY2UgaW5jbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5YaF5YyF44GZ44KLIOaWsOimjyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBURWxlbWVudFtdID0gW107XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5wdXNoKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGVsZW1lbnRzIGZyb20gdGhlIHNldCBvZiBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS5YmK6Zmk44GX44Gm6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcge0BsaW5rIERPTX0gaW5zdGFuY2UgZXhjbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5Lul5aSW44KS5YaF5YyF44GZ44KLIOaWsOimjyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgbm90PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gbmV3IFNldDxURWxlbWVudD4oWy4uLnRoaXNdKTtcbiAgICAgICAgd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoZWw6IFRFbGVtZW50KSA9PiB7IGVsZW1lbnRzLmRlbGV0ZShlbCk7IH0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbWVudHNdIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBkZXNjZW5kYW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBmeOCi+imgee0oOOCkuaknOe0olxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGZpbmQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3RvciA9ICQoc2VsZWN0b3IpIGFzIERPTTxOb2RlPjtcbiAgICAgICAgICAgIHJldHVybiAkc2VsZWN0b3IuZmlsdGVyKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbCAhPT0gZWxlbSAmJiBlbC5jb250YWlucyhlbGVtKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1zID0gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uZWxlbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBoYXZlIGEgZGVzY2VuZGFudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZfjgZ/lrZDopoHntKDmjIHjgaTopoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXM8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldHM6IE5vZGVbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoc2VsZWN0b3IsIGVsIGFzIEVsZW1lbnQpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICAgICB0YXJnZXRzLnB1c2goLi4uJHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiBuZXcgU2V0KHRhcmdldHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtICE9PSBlbCAmJiBlbGVtLmNvbnRhaW5zKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFBhc3MgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IHRocm91Z2ggYSBmdW5jdGlvbiwgcHJvZHVjaW5nIGEgbmV3IHtAbGluayBET019IGluc3RhbmNlIGNvbnRhaW5pbmcgdGhlIHJldHVybiB2YWx1ZXMuXG4gICAgICogQGphIOOCs+ODvOODq+ODkOODg+OCr+OBp+WkieabtOOBleOCjOOBn+imgee0oOOCkueUqOOBhOOBpuaWsOOBn+OBqyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmp4vnr4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+WkieabtOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBtYXA8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihjYWxsYmFjazogRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VEVsZW1lbnQsIFQ+KTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRlIG92ZXIgYSB7QGxpbmsgRE9NfSBpbnN0YW5jZSwgZXhlY3V0aW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGVhY2goY2FsbGJhY2s6IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGZhbHNlID09PSBjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gYSBzdWJzZXQgc3BlY2lmaWVkIGJ5IGEgcmFuZ2Ugb2YgaW5kaWNlcy5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44Gf56+E5Zuy44Gu6KaB57Sg44KS5ZCr44KAIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGJlZ2luXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIGJlZ2luIHRvIGJlIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44Gu6ZaL5aeL5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICogQHBhcmFtIGVuZFxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBzdG9wIGJlaW5nIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44KS57WC44GI44KL55u05YmN44Gu5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICovXG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQoWy4uLnRoaXNdLnNsaWNlKGJlZ2luLCBlbmQpIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgb25lIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBl+OBn+imgee0oOOCkuWQq+OCgCB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGVxKGluZGV4OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMuZ2V0KGluZGV4KSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3IgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yIGJ5IHRlc3RpbmcgdGhlIGVsZW1lbnQgaXRzZWxmIGFuZCB0cmF2ZXJzaW5nIHVwIHRocm91Z2ggaXRzIGFuY2VzdG9ycyBpbiB0aGUgRE9NIHRyZWUuXG4gICAgICogQGphIOmWi+Wni+imgee0oOOBi+OCieacgOOCgui/keOBhOimquimgee0oOOCkumBuOaKni4g44K744Os44Kv44K/44O85oyH5a6a44GX44Gf5aC05ZCILCDjg57jg4Pjg4HjgZnjgovmnIDjgoLov5HjgYTopqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGNsb3Nlc3Q8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gc2VsZWN0b3IgfHwgIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9zZXN0cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0gZWwuY2xvc2VzdChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXN0cy5hZGQoYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4uY2xvc2VzdHNdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMgYXMgdW5rbm93biBhcyBFbGVtZW50KSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzKHNlbGVjdG9yKS5lcSgwKSBhcyBET008Tm9kZT4gYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2hpbGRyZW4gb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDlkITopoHntKDjga7lrZDopoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OBjOaMh+WumuOBleOCjOOBn+WgtOWQiOOBr+ODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+e1kOaenOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIGNoaWxkcmVuPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoaWxkcmVuID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBlbC5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsaWRSZXRyaWV2ZU5vZGUoY2hpbGQsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4uYWRkKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uY2hpbGRyZW5dKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZmlyc3QgcGFyZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu5pyA5Yid44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyB7QGxpbmsgRE9NfSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpICYmIHZhbGlkUmV0cmlldmVOb2RlKHBhcmVudE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLmFkZChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnBhcmVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyB7QGxpbmsgRE9NfSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzVW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3RvciwgRE9NIG5vZGUsIG9yIHtAbGluayBET019IGluc3RhbmNlXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBpywg5oyH5a6a44GX44Gf44K744Os44Kv44K/44O844KE5p2h5Lu244Gr5LiA6Ie044GZ44KL6KaB57Sg44GM5Ye644Gm44GP44KL44G+44Gn6YG45oqe44GX44Gm5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIHtAbGluayBET019IGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHNVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICBsZXQgcGFyZW50czogTm9kZVtdID0gW107XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBsZXQgcGFyZW50Tm9kZSA9IChlbCBhcyBOb2RlKS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgd2hpbGUgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudE5vZGUpLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLnB1c2gocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLnB1c2gocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUgPSBwYXJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDopIfmlbDopoHntKDjgYzlr77osaHjgavjgarjgovjgajjgY3jga/lj43ou6JcbiAgICAgICAgaWYgKDEgPCB0aGlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyZW50cyA9IFsuLi5uZXcgU2V0KHBhcmVudHMucmV2ZXJzZSgpKV0ucmV2ZXJzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICQocGFyZW50cykgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IGZvbGxvd2luZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBuZXh0IHNpYmxpbmcgb25seSBpZiBpdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gICAgICogQGphIOimgee0oOmbhuWQiOOBruWQhOimgee0oOOBruebtOW+jOOBq+OBguOBn+OCi+WFhOW8n+imgee0oOOCkuaKveWHuiA8YnI+XG4gICAgICogICAgIOadoeS7tuW8j+OCkuaMh+WumuOBl+OAgee1kOaenOOCu+ODg+ODiOOBi+OCieabtOOBq+e1nui+vOOBv+OCkuihjOOBhuOBk+OBqOOCguWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZXh0U2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGVsLm5leHRFbGVtZW50U2libGluZztcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSZXRyaWV2ZU5vZGUoZWxlbSwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRTaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5uZXh0U2libGluZ3NdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgZm9sbG93aW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg6ZuG5ZCI5YaF44Gu5ZCE6KaB57Sg44Gu5qyh5Lul6ZmN44Gu5YWo44Gm44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgpLmjIflrprjgZnjgovjgZPjgajjgafjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgZPjgajjgYzlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dEFsbDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmV4dFVudGlsKHVuZGVmaW5lZCwgc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIGZvbGxvd2luZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgdXAgdG8gYnV0IG5vdCBpbmNsdWRpbmcgdGhlIGVsZW1lbnQgbWF0Y2hlZCBieSB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOOBruasoeS7pemZjeOBruWFhOW8n+imgee0oOOBpywg5oyH5a6a44GX44Gf44K744Os44Kv44K/44O844KE5p2h5Lu244Gr5LiA6Ie044GZ44KL6KaB57Sg44GM5Ye644Gm44GP44KL44G+44Gn6YG45oqe44GX44Gm5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ25leHRFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IHByZWNlZGluZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TliY3jga7lhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldlNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldlNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnByZXZTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7liY3ku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wcmV2VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgcHJlY2VkaW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5YmN5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygncHJldmlvdXNFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3RvclxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/lkITopoHntKDjga7lhYTlvJ/opoHntKDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBzaWJsaW5nczxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaWJsaW5nIG9mICQocGFyZW50Tm9kZSkuY2hpbGRyZW4oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2libGluZyAhPT0gZWwgYXMgRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChzaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uc2libGluZ3NdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2hpbGRyZW4gb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHRleHQgYW5kIGNvbW1lbnQgbm9kZXMuXG4gICAgICogQGphIOODhuOCreOCueODiOOChEhUTUzjgrPjg6Hjg7Pjg4jjgpLlkKvjgoDlrZDopoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oKTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZShlbCwgJ2lmcmFtZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZCgoZWwgYXMgSFRNTElGcmFtZUVsZW1lbnQpLmNvbnRlbnREb2N1bWVudCBhcyBOb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKGVsLCAndGVtcGxhdGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQpLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBlbC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNvbnRlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNsb3Nlc3QgYW5jZXN0b3IgZWxlbWVudCB0aGF0IGlzIHBvc2l0aW9uZWQuXG4gICAgICogQGphIOimgee0oOOBruWFiOelluimgee0oOOBpywg44K544K/44Kk44Or44Gn44Od44K444K344On44Oz5oyH5a6aKHBvc2l0aWlvbuOBjHJlbGF0aXZlLCBhYnNvbHV0ZSwgZml4ZWTjga7jgYTjgZrjgozjgYsp44GV44KM44Gm44GE44KL44KC44Gu44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldFBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBjb25zdCByb290RWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJChyb290RWxlbWVudCkgYXMgRE9NPE5vZGU+IGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBnZXRPZmZzZXRQYXJlbnQoZWwgYXMgTm9kZSkgPz8gcm9vdEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2Zmc2V0cy5hZGQob2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5vZmZzZXRzXSkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01UcmF2ZXJzaW5nLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcsIHNldE1peENsYXNzQXR0cmlidXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVEb2N1bWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBjaGVjayBIVE1MIHN0cmluZyAqL1xuZnVuY3Rpb24gaXNIVE1MU3RyaW5nKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc3ViamVjdCA9IHNyYy50cmltKCk7XG4gICAgcmV0dXJuICgnPCcgPT09IHN1YmplY3Quc2xpY2UoMCwgMSkpICYmICgnPicgPT09IHN1YmplY3Quc2xpY2UoLTEpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBhcHBlbmQoKWAsIGBwcmVwZW5kKClgLCBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGVTZXQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiBTZXQ8Tm9kZSB8IHN0cmluZz4ge1xuICAgIGNvbnN0IG5vZGVzID0gbmV3IFNldDxOb2RlIHwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgY29udGVudCBvZiBjb250ZW50cykge1xuICAgICAgICBpZiAoKGlzU3RyaW5nKGNvbnRlbnQpICYmICFpc0hUTUxTdHJpbmcoY29udGVudCkpIHx8IGlzTm9kZShjb250ZW50KSkge1xuICAgICAgICAgICAgbm9kZXMuYWRkKGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJGRvbSA9ICQoY29udGVudCBhcyBET008RWxlbWVudD4pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mICRkb20pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdHJpbmcobm9kZSkgfHwgKGlzTm9kZShub2RlKSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IG5vZGUubm9kZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGVzO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGJlZm9yZSgpYCBhbmQgYGFmdGVyKClgICAqL1xuZnVuY3Rpb24gdG9Ob2RlKG5vZGU6IE5vZGUgfCBzdHJpbmcpOiBOb2RlIHtcbiAgICBpZiAoaXNTdHJpbmcobm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBkZXRhY2goKWAgYW5kIGByZW1vdmUoKWAgKi9cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQsXG4gICAgZG9tOiBET01JdGVyYWJsZTxVPixcbiAgICBrZWVwTGlzdGVuZXI6IGJvb2xlYW5cbik6IHZvaWQge1xuICAgIGNvbnN0ICRkb206IERPTTxVPiA9IG51bGwgIT0gc2VsZWN0b3JcbiAgICAgICAgPyAoZG9tIGFzIERPTTxVPikuZmlsdGVyKHNlbGVjdG9yKVxuICAgICAgICA6IGRvbSBhcyBET008VT47XG5cbiAgICBpZiAoIWtlZXBMaXN0ZW5lcikge1xuICAgICAgICAkZG9tLm9mZigpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgIGVsLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIG1hbmlwdWxhdGlvbiBtZXRob2RzLlxuICogQGphIOODnuODi+ODlOODpeODrOODvOOCt+ODp+ODs+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NTWFuaXB1bGF0aW9uPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgSW5zaWRlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBIVE1MIGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIEhUTUwg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGh0bWwoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgSFRNTCBjb250ZW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavmjIflrprjgZfjgZ8gSFRNTCDjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBodG1sU3RyaW5nXG4gICAgICogIC0gYGVuYCBBIHN0cmluZyBvZiBIVE1MIHRvIHNldCBhcyB0aGUgY29udGVudCBvZiBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOWGheOBq+aMv+WFpeOBmeOCiyBIVE1MIOaWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKGh0bWxTdHJpbmc6IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nPzogc3RyaW5nKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IGh0bWxTdHJpbmcpIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpID8gZWwuaW5uZXJIVE1MIDogJyc7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoaHRtbFN0cmluZykpIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLmlubmVySFRNTCA9IGh0bWxTdHJpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpbnZhbGlkIGFyZ1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIGFyZy4gaHRtbFN0cmluZyB0eXBlOiR7dHlwZW9mIGh0bWxTdHJpbmd9YCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHRleHQgY29udGVudHMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIGpRdWVyeSByZXR1cm5zIHRoZSBjb21iaW5lZCB0ZXh0IG9mIGVhY2ggZWxlbWVudCwgYnV0IHRoaXMgbWV0aG9kIG1ha2VzIG9ubHkgZmlyc3QgZWxlbWVudCdzIHRleHQuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBruODhuOCreOCueODiOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIGpRdWVyeSDjga/lkITopoHntKDjga7pgKPntZDjg4bjgq3jgrnjg4jjgpLov5TljbTjgZnjgovjgYzmnKzjg6Hjgr3jg4Pjg4njga/lhYjpoK3opoHntKDjga7jgb/jgpLlr77osaHjgajjgZnjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgdGV4dCgpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBjb250ZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIHNwZWNpZmllZCB0ZXh0LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavmjIflrprjgZfjgZ/jg4bjgq3jgrnjg4jjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZXh0XG4gICAgICogIC0gYGVuYCBUaGUgdGV4dCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgovjg4bjgq3jgrnjg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgdGV4dCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdGV4dCh2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiBzdHJpbmcgfCB0aGlzIHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZWwudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChudWxsICE9IHRleHQpID8gdGV4dC50cmltKCkgOiAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gaXNTdHJpbmcodmFsdWUpID8gdmFsdWUgOiBTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgdG8gdGhlIGVuZCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlvJXmlbDjgafmjIflrprjgZfjgZ/jgrPjg7Pjg4bjg7Pjg4TjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFwcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuYXBwZW5kKC4uLm5vZGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL6KaB57Sg44KS5LuW44Gu6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBiZWdpbm5pbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YWI6aCt44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5wcmVwZW5kKC4uLm5vZGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL6KaB57Sg44KS5LuW44Gu6KaB57Sg44Gu5YWI6aCt44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZFRvPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5wcmVwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIE91dHNpZGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIGJlZm9yZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7liY3jgavmjIflrprjgZfjgZ8gSFRNTCDjgoTopoHntKDjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGJlZm9yZTxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBiZWZvcmUgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5YmN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5zZXJ0QmVmb3JlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5iZWZvcmUodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCBhZnRlciBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lvozjgo3jgavmjIflrprjgZfjgZ8gSFRNTCDjgoTopoHntKDjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFmdGVyPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLlsuLi5jb250ZW50c10ucmV2ZXJzZSgpKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRvTm9kZShub2RlKSwgZWwubmV4dFNpYmxpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGFmdGVyIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBruW+jOOCjeOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEFmdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hZnRlcih0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBBcm91bmRcblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBhbGwgZWxlbWVudHMgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRG9jdW1lbnQodGhpcykgfHwgaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBOb2RlO1xuXG4gICAgICAgIC8vIFRoZSBlbGVtZW50cyB0byB3cmFwIHRoZSB0YXJnZXQgYXJvdW5kXG4gICAgICAgIGNvbnN0ICR3cmFwID0gJChzZWxlY3RvciwgZWwub3duZXJEb2N1bWVudCkuZXEoMCkuY2xvbmUodHJ1ZSkgYXMgRE9NPEVsZW1lbnQ+O1xuXG4gICAgICAgIGlmIChlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAkd3JhcC5pbnNlcnRCZWZvcmUoZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHdyYXAubWFwKChpbmRleDogbnVtYmVyLCBlbGVtOiBFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICB3aGlsZSAoZWxlbS5maXJzdEVsZW1lbnRDaGlsZCkge1xuICAgICAgICAgICAgICAgIGVsZW0gPSBlbGVtLmZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgICAgIH0pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50Pik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIHRoZSBjb250ZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGheWBtOOCkiwg5oyH5a6a44GX44Gf5Yil44Ko44Os44Oh44Oz44OI44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcElubmVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICBjb25zdCBjb250ZW50cyA9ICRlbC5jb250ZW50cygpO1xuICAgICAgICAgICAgaWYgKDAgPCBjb250ZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50cy53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsLmFwcGVuZChzZWxlY3RvciBhcyBOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpIsIOaMh+WumuOBl+OBn+WIpeimgee0oOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICRlbC53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHBhcmVudHMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTSwgbGVhdmluZyB0aGUgbWF0Y2hlZCBlbGVtZW50cyBpbiB0aGVpciBwbGFjZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu6Kaq44Ko44Os44Oh44Oz44OI44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdW53cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICBzZWxmLnBhcmVudChzZWxlY3Rvcikubm90KCdib2R5JykuZWFjaCgoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICQoZWxlbSkucmVwbGFjZVdpdGgoZWxlbS5jaGlsZE5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVtb3ZhbFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgY2hpbGQgbm9kZXMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg5YaF44Gu5a2Q6KaB57SgKOODhuOCreOCueODiOOCguWvvuixoSnjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZW1wdHkoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS4gVGhpcyBtZXRob2Qga2VlcHMgZXZlbnQgbGlzdGVuZXIgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkLiDliYrpmaTlvozjgoLjgqTjg5njg7Pjg4jjg6rjgrnjg4rjga/mnInlirlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBkZXRhY2g8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICByZW1vdmVFbGVtZW50KHNlbGVjdG9yLCB0aGlzLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDopoHntKDjgpIgRE9NIOOBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIHJlbW92ZUVsZW1lbnQoc2VsZWN0b3IsIHRoaXMsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBSZXBsYWNlbWVudFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB3aXRoIHRoZSBwcm92aWRlZCBuZXcgY29udGVudCBhbmQgcmV0dXJuIHRoZSBzZXQgb2YgZWxlbWVudHMgdGhhdCB3YXMgcmVtb3ZlZC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GV44KM44Gf5Yil44Gu6KaB57Sg44KEIEhUTUwg44Go5beu44GX5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3Q29udGVudFxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlV2l0aDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihuZXdDb250ZW50PzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgZWxlbSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChuZXdDb250ZW50KTtcbiAgICAgICAgICAgIGlmICgxID09PSAkZG9tLmxlbmd0aCAmJiBpc05vZGVFbGVtZW50KCRkb21bMF0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRkb21bMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5yZXBsYWNlV2l0aChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggdGFyZ2V0IGVsZW1lbnQgd2l0aCB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeOBruimgee0oOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlcGxhY2VBbGw8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnJlcGxhY2VXaXRoKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01NYW5pcHVsYXRpb24sICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzQXJyYXksXG4gICAgYXNzaWduVmFsdWUsXG4gICAgY2xhc3NpZnksXG4gICAgZGFzaGVyaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgKi9cbmZ1bmN0aW9uIGVuc3VyZUNoYWluQ2FzZVByb3Blcmllcyhwcm9wczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+KTogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJldHZhbCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IGluIHByb3BzKSB7XG4gICAgICAgIGFzc2lnblZhbHVlKHJldHZhbCwgZGFzaGVyaXplKGtleSksIHByb3BzW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldERlZmF1bHRWaWV3KGVsOiBFbGVtZW50KTogV2luZG93IHtcbiAgICByZXR1cm4gKGVsLm93bmVyRG9jdW1lbnQgJiYgZWwub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgPz8gd2luZG93O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsOiBFbGVtZW50KTogQ1NTU3R5bGVEZWNsYXJhdGlvbiB7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4gdmlldy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGNzcyB2YWx1ZSB0byBudW1iZXIgKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWwpIHx8IDA7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZXNvbHZlciA9IHtcbiAgICB3aWR0aDogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgaGVpZ2h0OiBbJ3RvcCcsICdib3R0b20nXSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0UGFkZGluZyhzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0Qm9yZGVyKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBib3JkZXItJHtfcmVzb2x2ZXJbdHlwZV1bMF19LXdpZHRoYCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVsxXX0td2lkdGhgKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0TWFyZ2luKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBtYXJnaW4tJHtfcmVzb2x2ZXJbdHlwZV1bMF19YCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgd2lkdGgoKWAgYW5kIGBoZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZVNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSkge1xuICAgICAgICAgICAgLy8g44K544Kv44Ot44O844Or44OQ44O844KS6Zmk44GE44Gf5bmFIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiAoZG9tWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BjbGllbnQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIChzY3JvbGxXaWR0aCAvIHNjcm9sbEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiAoZG9tWzBdLmRvY3VtZW50RWxlbWVudCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaXplIC0gKGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICByZXR1cm4gZG9tLmNzcyh0eXBlLCBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZSA6IGAke3ZhbHVlfXB4YCk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlubmVyV2lkdGgoKWAgYW5kIGBpbm5lckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlSW5uZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IoZG9tIGFzIERPTVN0eWxlczxUPiwgdHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIC8vIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgIC8vIHNldHRlciAobm8gcmVhY3Rpb24pXG4gICAgICAgIHJldHVybiBkb207XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIGNvbnN0IGlzVGV4dFByb3AgPSBpc1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgZG9tKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlLCBuZXdWYWwgfSA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RleHRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdHlsZSwgbmV3VmFsIH07XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2JvcmRlci1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCAtIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpfXB4YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovIGludGVyZmFjZSBQYXJzZU91dGVyU2l6ZUFyZ3NSZXN1bHQgeyBpbmNsdWRlTWFyZ2luOiBib29sZWFuOyB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nOyB9XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgb3V0ZXJXaWR0aCgpYCBhbmQgYG91dGVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJnczogdW5rbm93bltdKTogUGFyc2VPdXRlclNpemVBcmdzUmVzdWx0IHtcbiAgICBsZXQgW3ZhbHVlLCBpbmNsdWRlTWFyZ2luXSA9IGFyZ3M7XG4gICAgaWYgKCFpc051bWJlcih2YWx1ZSkgJiYgIWlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICBpbmNsdWRlTWFyZ2luID0gISF2YWx1ZTtcbiAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gYXMgUGFyc2VPdXRlclNpemVBcmdzUmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlT3V0ZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbjogYm9vbGVhbiwgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkuWQq+OCgeOBn+W5hSAoaW5uZXJXaWR0aCAvIGlubmVySGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIChkb21bMF0gYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtgaW5uZXIke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAob2Zmc2V0V2lkdGggLyBvZmZzZXRIZWlnaHQpXG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVNYXJnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQgKyBnZXRNYXJnaW4oc3R5bGUsIHR5cGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXJnaW4gPSBpbmNsdWRlTWFyZ2luID8gZ2V0TWFyZ2luKHN0eWxlLCB0eXBlKSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IChpc1RleHRQcm9wID8gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSkgOiB2YWx1ZSkgLSBtYXJnaW47XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN0eWxlLCBuZXdWYWwgfTtcbiAgICAgICAgICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsIC0gZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSAtIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpfXB4YCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsfXB4YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBvc2l0aW9uKClgIGFuZCBgb2Zmc2V0KClgICovXG5mdW5jdGlvbiBnZXRPZmZzZXRQb3NpdGlvbihlbDogRWxlbWVudCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB7XG4gICAgLy8gZm9yIGRpc3BsYXkgbm9uZVxuICAgIGlmIChlbC5nZXRDbGllbnRSZWN0cygpLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogcmVjdC50b3AgKyB2aWV3LnNjcm9sbFksXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHZpZXcuc2Nyb2xsWCxcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgb2Zmc2V0W1dpZHRoIHwgSGVpZ2h0XS4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNlW1dpZHRoIHwgSGVpZ2h0XSDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRTaXplKGVsOiBIVE1MT3JTVkdFbGVtZW50LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIGlmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICByZXR1cm4gKGVsIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbYG9mZnNldCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIFNWR0VsZW1lbnQg44GvIG9mZnNldFdpZHRoIOOBjOOCteODneODvOODiOOBleOCjOOBquOBhFxuICAgICAgICAgKiAgICAgICAgZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkg44GvIHRyYW5zZm9ybSDjgavlvbHpn7/jgpLlj5fjgZHjgovjgZ/jgoEsXG4gICAgICAgICAqICAgICAgICDlrprnvqnpgJrjgoogYm9yZGVyLCBwYWRkaW4g44KS5ZCr44KB44Gf5YCk44KS566X5Ye644GZ44KLXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsIGFzIFNWR0VsZW1lbnQpO1xuICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgc3R5bGUgbWFuYWdlbWVudCBtZXRob2RzLlxuICogQGphIOOCueOCv+OCpOODq+mWoumAo+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU3R5bGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFN0eWxlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY29tcHV0ZWQgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gQ1NTIOOBq+ioreWumuOBleOCjOOBpuOBhOOCi+ODl+ODreODkeODhuOCo+WApOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSB2YWx1ZSBzdHJpbmcuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5YCk44KS5paH5a2X5YiX44Gn6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBtdWx0aXBsZSBjb21wdXRlZCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBDU1Mg44Gr6Kit5a6a44GV44KM44Gm44GE44KL44OX44Ot44OR44OG44Kj5YCk44KS6KSH5pWw5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZXNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFycmF5IGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN6YWN5YiX44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eS12YWx1ZSBvYmplY3QuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj44KS5qC857SN44GX44Gf44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lczogc3RyaW5nW10pOiBQbGFpbk9iamVjdDxzdHJpbmc+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBDU1MgcHJvcGVydGl5IGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOBriBDU1Mg44OX44Ot44OR44OG44Kj44Gr5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3jgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHN0cmluZyB2YWx1ZSB0byBzZXQgZm9yIHRoZSBwcm9wZXJ0eS4gaWYgbnVsbCBwYXNzZWQsIHJlbW92ZSBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WApOOCkuaWh+Wtl+WIl+OBp+aMh+Wumi4gbnVsbCDmjIflrprjgafliYrpmaQuXG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgb25lIG9yIG1vcmUgQ1NTIHByb3BlcnRpZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44GuIENTUyDopIfmlbDjga7jg5fjg63jg5Hjg4bjgqPjgavlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+OCkuagvOe0jeOBl+OBn+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MocHJvcGVydGllczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+KTogdGhpcztcblxuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nIHwgc3RyaW5nW10gfCBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4sIHZhbHVlPzogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IFBsYWluT2JqZWN0PHN0cmluZz4gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/ICcnIDogdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKGRhc2hlcml6ZShuYW1lKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShuYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgLy8gZ2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShrZXkpO1xuICAgICAgICAgICAgICAgIHByb3BzW2tleV0gPSB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpLmdldFByb3BlcnR5VmFsdWUocHJvcE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKG5hbWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUgfSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gcHJvcHNbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgcHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/mqKrluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruaoquW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+eri+W5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7nuKbluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgb3V0ZXIgd2lkdGggKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCguLi5hcmdzOiB1bmtub3duW10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBvdXRlciBoZWlnaHQgKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo57im5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIG91dGVyIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoLi4uYXJnczogdW5rbm93bltdKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgaW5jbHVkZU1hcmdpbiwgdmFsdWUgfSA9IHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIG1hbmFnZU91dGVyU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIG9mZnNldCBwYXJlbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruimquimgee0oOOBi+OCieOBruebuOWvvueahOOBquihqOekuuS9jee9ruOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBwb3NpdGlvbigpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0ge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG9mZnNldDogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9O1xuICAgICAgICBsZXQgcGFyZW50T2Zmc2V0ID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCBtYXJnaW5Ub3A6IG10LCBtYXJnaW5MZWZ0OiBtbCB9ID0gJChlbCkuY3NzKFsncG9zaXRpb24nLCAnbWFyZ2luVG9wJywgJ21hcmdpbkxlZnQnXSk7XG4gICAgICAgIGNvbnN0IG1hcmdpblRvcCA9IHRvTnVtYmVyKG10KTtcbiAgICAgICAgY29uc3QgbWFyZ2luTGVmdCA9IHRvTnVtYmVyKG1sKTtcblxuICAgICAgICAvLyBwb3NpdGlvbjpmaXhlZCBlbGVtZW50cyBhcmUgb2Zmc2V0IGZyb20gdGhlIHZpZXdwb3J0LCB3aGljaCBpdHNlbGYgYWx3YXlzIGhhcyB6ZXJvIG9mZnNldFxuICAgICAgICBpZiAoJ2ZpeGVkJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIEFzc3VtZSBwb3NpdGlvbjpmaXhlZCBpbXBsaWVzIGF2YWlsYWJpbGl0eSBvZiBnZXRCb3VuZGluZ0NsaWVudFJlY3RcbiAgICAgICAgICAgIG9mZnNldCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2Zmc2V0ID0gZ2V0T2Zmc2V0UG9zaXRpb24oZWwpO1xuXG4gICAgICAgICAgICAvLyBBY2NvdW50IGZvciB0aGUgKnJlYWwqIG9mZnNldCBwYXJlbnQsIHdoaWNoIGNhbiBiZSB0aGUgZG9jdW1lbnQgb3IgaXRzIHJvb3QgZWxlbWVudFxuICAgICAgICAgICAgLy8gd2hlbiBhIHN0YXRpY2FsbHkgcG9zaXRpb25lZCBlbGVtZW50IGlzIGlkZW50aWZpZWRcbiAgICAgICAgICAgIGNvbnN0IGRvYyA9IGVsLm93bmVyRG9jdW1lbnQ7XG4gICAgICAgICAgICBsZXQgb2Zmc2V0UGFyZW50ID0gZ2V0T2Zmc2V0UGFyZW50KGVsKSA/PyBkb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICAgICAgbGV0ICRvZmZzZXRQYXJlbnQgPSAkKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICB3aGlsZSAob2Zmc2V0UGFyZW50ICYmXG4gICAgICAgICAgICAgICAgKG9mZnNldFBhcmVudCA9PT0gZG9jLmJvZHkgfHwgb2Zmc2V0UGFyZW50ID09PSBkb2MuZG9jdW1lbnRFbGVtZW50KSAmJlxuICAgICAgICAgICAgICAgICdzdGF0aWMnID09PSAkb2Zmc2V0UGFyZW50LmNzcygncG9zaXRpb24nKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0UGFyZW50ID0gb2Zmc2V0UGFyZW50LnBhcmVudE5vZGUgYXMgRWxlbWVudDtcbiAgICAgICAgICAgICAgICAkb2Zmc2V0UGFyZW50ID0gJChvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9mZnNldFBhcmVudCAmJiBvZmZzZXRQYXJlbnQgIT09IGVsICYmIE5vZGUuRUxFTUVOVF9OT0RFID09PSBvZmZzZXRQYXJlbnQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJbmNvcnBvcmF0ZSBib3JkZXJzIGludG8gaXRzIG9mZnNldCwgc2luY2UgdGhleSBhcmUgb3V0c2lkZSBpdHMgY29udGVudCBvcmlnaW5cbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQgPSBnZXRPZmZzZXRQb3NpdGlvbihvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgYm9yZGVyVG9wV2lkdGgsIGJvcmRlckxlZnRXaWR0aCB9ID0gJG9mZnNldFBhcmVudC5jc3MoWydib3JkZXJUb3BXaWR0aCcsICdib3JkZXJMZWZ0V2lkdGgnXSk7XG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0LnRvcCArPSB0b051bWJlcihib3JkZXJUb3BXaWR0aCk7XG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0LmxlZnQgKz0gdG9OdW1iZXIoYm9yZGVyTGVmdFdpZHRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN1YnRyYWN0IHBhcmVudCBvZmZzZXRzIGFuZCBlbGVtZW50IG1hcmdpbnNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvcDogb2Zmc2V0LnRvcCAtIHBhcmVudE9mZnNldC50b3AgLSBtYXJnaW5Ub3AsXG4gICAgICAgICAgICBsZWZ0OiBvZmZzZXQubGVmdCAtIHBhcmVudE9mZnNldC5sZWZ0IC0gbWFyZ2luTGVmdCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50LlxuICAgICAqIEBqYSBkb2N1bWVudCDjgpLln7rmupbjgajjgZfjgaYsIOODnuODg+ODgeOBl+OBpuOBhOOCi+imgee0oOmbhuWQiOOBrjHjgaTnm67jga7opoHntKDjga7nj77lnKjjga7luqfmqJnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0KCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBkb2N1bWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GrIGRvY3VtZW50IOOCkuWfuua6luOBq+OBl+OBn+ePvuWcqOW6p+aomeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNvb3JkaW5hdGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgcHJvcGVydGllcyBgdG9wYCBhbmQgYGxlZnRgLlxuICAgICAqICAtIGBqYWAgYHRvcGAsIGBsZWZ0YCDjg5fjg63jg5Hjg4bjgqPjgpLlkKvjgoDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0KGNvb3JkaW5hdGVzOiB7IHRvcD86IG51bWJlcjsgbGVmdD86IG51bWJlcjsgfSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2Zmc2V0KGNvb3JkaW5hdGVzPzogeyB0b3A/OiBudW1iZXI7IGxlZnQ/OiBudW1iZXI7IH0pOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSBjb29yZGluYXRlcyA/IHsgdG9wOiAwLCBsZWZ0OiAwIH0gOiB0aGlzO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gY29vcmRpbmF0ZXMpIHtcbiAgICAgICAgICAgIC8vIGdldFxuICAgICAgICAgICAgcmV0dXJuIGdldE9mZnNldFBvc2l0aW9uKHRoaXNbMF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wczogeyB0b3A/OiBzdHJpbmc7IGxlZnQ/OiBzdHJpbmc7IH0gPSB7fTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0b3A6IGNzc1RvcCwgbGVmdDogY3NzTGVmdCB9ID0gJGVsLmNzcyhbJ3Bvc2l0aW9uJywgJ3RvcCcsICdsZWZ0J10pO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHBvc2l0aW9uIGZpcnN0LCBpbi1jYXNlIHRvcC9sZWZ0IGFyZSBzZXQgZXZlbiBvbiBzdGF0aWMgZWxlbVxuICAgICAgICAgICAgICAgIGlmICgnc3RhdGljJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgY3VyT2Zmc2V0ID0gJGVsLm9mZnNldCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1clBvc2l0aW9uID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmVlZENhbGN1bGF0ZVBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICA9ICgnYWJzb2x1dGUnID09PSBwb3NpdGlvbiB8fCAnZml4ZWQnID09PSBwb3NpdGlvbikgJiYgKGNzc1RvcCArIGNzc0xlZnQpLmluY2x1ZGVzKCdhdXRvJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZWVkQ2FsY3VsYXRlUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkZWwucG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHRvcDogdG9OdW1iZXIoY3NzVG9wKSwgbGVmdDogdG9OdW1iZXIoY3NzTGVmdCkgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjb29yZGluYXRlcy50b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcHMudG9wID0gYCR7KGNvb3JkaW5hdGVzLnRvcCAtIGN1ck9mZnNldC50b3ApICsgY3VyUG9zaXRpb24udG9wfXB4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY29vcmRpbmF0ZXMubGVmdCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wcy5sZWZ0ID0gYCR7KGNvb3JkaW5hdGVzLmxlZnQgLSBjdXJPZmZzZXQubGVmdCkgKyBjdXJQb3NpdGlvbi5sZWZ0fXB4YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkZWwuY3NzKHByb3BzIGFzIFBsYWluT2JqZWN0PHN0cmluZz4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVN0eWxlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8taW52YWxpZC10aGlzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBBY2Nlc3NpYmxlLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBjb21iaW5hdGlvbixcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEN1c3RvbUV2ZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUl0ZXJhYmxlLCBpc1R5cGVFbGVtZW50IH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB0eXBlIHsgQ29ubmVjdEV2ZW50TWFwIH0gZnJvbSAnLi9kZXRlY3Rpb24nO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgSW50ZXJuYWxFdmVudExpc3RlbmVyIGV4dGVuZHMgRXZlbnRMaXN0ZW5lciB7XG4gICAgb3JpZ2luPzogRXZlbnRMaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEV2ZW50TGlzdGVuZXJIYW5kbGVyIHtcbiAgICBsaXN0ZW5lcjogSW50ZXJuYWxFdmVudExpc3RlbmVyO1xuICAgIHByb3h5OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEluZm8ge1xuICAgIHJlZ2lzdGVyZWQ6IFNldDxFdmVudExpc3RlbmVyPjtcbiAgICBoYW5kbGVyczogRXZlbnRMaXN0ZW5lckhhbmRsZXJbXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBCaW5kRXZlbnRDb250ZXh0ID0gUmVjb3JkPHN0cmluZywgQmluZEluZm8+O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBDT09LSUVfU0VQQVJBVE9SICA9ICd8JyxcbiAgICBBRERSRVNTX0VWRU5UICAgICA9IDAsXG4gICAgQUREUkVTU19OQU1FU1BBQ0UgPSAxLFxuICAgIEFERFJFU1NfT1BUSU9OUyAgID0gMixcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9ldmVudENvbnRleHRNYXAgPSB7XG4gICAgZXZlbnREYXRhOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgdW5rbm93bltdPigpLFxuICAgIGV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbiAgICBsaXZlRXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCBCaW5kRXZlbnRDb250ZXh0PigpLFxufTtcblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBldmVudC1kYXRhIGZyb20gZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlFdmVudERhdGEoZXZlbnQ6IEV2ZW50KTogdW5rbm93bltdIHtcbiAgICBjb25zdCBkYXRhID0gX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZ2V0KGV2ZW50LnRhcmdldCBhcyBFbGVtZW50KSA/PyBbXTtcbiAgICBkYXRhLnVuc2hpZnQoZXZlbnQpO1xuICAgIHJldHVybiBkYXRhO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGV2ZW50LWRhdGEgd2l0aCBlbGVtZW50ICovXG5mdW5jdGlvbiByZWdpc3RlckV2ZW50RGF0YShlbGVtOiBFbGVtZW50QmFzZSwgZXZlbnREYXRhOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5zZXQoZWxlbSwgZXZlbnREYXRhKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBkZWxldGUgZXZlbnQtZGF0YSBieSBlbGVtZW50ICovXG5mdW5jdGlvbiBkZWxldGVFdmVudERhdGEoZWxlbTogRWxlbWVudEJhc2UpOiB2b2lkIHtcbiAgICBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5kZWxldGUoZWxlbSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgbm9ybWFsaXplIGV2ZW50IG5hbWVzcGFjZSAqL1xuZnVuY3Rpb24gbm9ybWFsaXplRXZlbnROYW1lc3BhY2VzKGV2ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5hbWVzcGFjZXMgPSBldmVudC5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1haW4gPSBuYW1lc3BhY2VzLnNoaWZ0KCkhO1xuICAgIGlmICghbmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG1haW47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmFtZXNwYWNlcy5zb3J0KCk7XG4gICAgICAgIHJldHVybiBgJHttYWlufS4ke25hbWVzcGFjZXMuam9pbignLicpfWA7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIHNwbGl0IGV2ZW50IG5hbWVzcGFjZXMgKi9cbmZ1bmN0aW9uIHNwbGl0RXZlbnROYW1lc3BhY2VzKGV2ZW50OiBzdHJpbmcpOiB7IHR5cGU6IHN0cmluZzsgbmFtZXNwYWNlOiBzdHJpbmc7IH1bXSB7XG4gICAgY29uc3QgcmV0dmFsOiB7IHR5cGU6IHN0cmluZzsgbmFtZXNwYWNlOiBzdHJpbmc7IH1bXSA9IFtdO1xuXG4gICAgY29uc3QgbmFtZXNwYWNlcyA9IGV2ZW50LnNwbGl0KCcuJyk7XG4gICAgY29uc3QgbWFpbiA9IG5hbWVzcGFjZXMuc2hpZnQoKSE7XG5cbiAgICBpZiAoIW5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHZhbC5wdXNoKHsgdHlwZTogbWFpbiwgbmFtZXNwYWNlOiAnJyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lc3BhY2VzLnNvcnQoKTtcblxuICAgICAgICBjb25zdCBjb21ib3M6IHN0cmluZ1tdW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IG5hbWVzcGFjZXMubGVuZ3RoOyBpID49IDE7IGktLSkge1xuICAgICAgICAgICAgY29tYm9zLnB1c2goLi4uY29tYmluYXRpb24obmFtZXNwYWNlcywgaSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2lnbmF0dXJlID0gYC4ke25hbWVzcGFjZXMuam9pbignLicpfS5gO1xuICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IG1haW4sIG5hbWVzcGFjZTogc2lnbmF0dXJlIH0pO1xuICAgICAgICBmb3IgKGNvbnN0IG5zIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBgJHttYWlufS4ke25zLmpvaW4oJy4nKX1gLCBuYW1lc3BhY2U6IHNpZ25hdHVyZSB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmV2ZXJzZSByZXNvbHV0aW9uIGV2ZW50IG5hbWVzcGFjZXMgKi9cbmZ1bmN0aW9uIHJlc29sdmVFdmVudE5hbWVzcGFjZXMoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50OiBzdHJpbmcpOiB7IHR5cGU6IHN0cmluZzsgbmFtZXNwYWNlOiBzdHJpbmc7IH1bXSB7XG4gICAgY29uc3QgcmV0dmFsOiB7IHR5cGU6IHN0cmluZzsgbmFtZXNwYWNlOiBzdHJpbmc7IH1bXSA9IFtdO1xuXG4gICAgY29uc3QgbmFtZXNwYWNlcyA9IGV2ZW50LnNwbGl0KCcuJyk7XG4gICAgY29uc3QgbWFpbiA9IG5hbWVzcGFjZXMuc2hpZnQoKSE7XG4gICAgY29uc3QgdHlwZSA9IG5vcm1hbGl6ZUV2ZW50TmFtZXNwYWNlcyhldmVudCk7XG5cbiAgICBpZiAoIW5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHZhbC5wdXNoKHsgdHlwZTogbWFpbiwgbmFtZXNwYWNlOiAnJyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvb2tpZXMgPSBPYmplY3Qua2V5cyhjb250ZXh0KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNpZ25hdHVyZXMgPSBjb29raWVzLmZpbHRlcihjb29raWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZSA9PT0gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpW0NvbnN0LkFERFJFU1NfRVZFTlRdO1xuICAgICAgICAgICAgICAgIH0pLm1hcChjb29raWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpW0NvbnN0LkFERFJFU1NfTkFNRVNQQUNFXTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNpYmxpbmdzID0gY29va2llcy5maWx0ZXIoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaWduYXR1cmUgb2Ygc2lnbmF0dXJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNpZ25hdHVyZSA9PT0gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpW0NvbnN0LkFERFJFU1NfTkFNRVNQQUNFXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KS5tYXAoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogc2VlZFtDb25zdC5BRERSRVNTX0VWRU5UXSwgbmFtZXNwYWNlOiBzZWVkW0NvbnN0LkFERFJFU1NfTkFNRVNQQUNFXSB9O1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goLi4uc2libGluZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICAgICAgcXVlcnkoZXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKTtcbiAgICAgICAgcXVlcnkobGl2ZUV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IGV2ZW50IGNvb2tpZSBmcm9tIGV2ZW50IG5hbWUsIHNlbGVjdG9yLCBvcHRpb25zICovXG5mdW5jdGlvbiB0b0Nvb2tpZShldmVudDogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIGNvbnN0IG9wdHMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICBkZWxldGUgb3B0cy5vbmNlO1xuICAgIHJldHVybiBgJHtldmVudH0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtuYW1lc3BhY2V9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7SlNPTi5zdHJpbmdpZnkob3B0cyl9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7c2VsZWN0b3J9YDtcbn1cblxuLyoqIEBpbnRlcm5hbCBnZXQgbGlzdGVuZXIgaGFuZGxlcnMgY29udGV4dCBieSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgZXZlbnQ6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zLCBlbnN1cmU6IGJvb2xlYW4pOiBCaW5kSW5mbyB7XG4gICAgY29uc3QgZXZlbnRMaXN0ZW5lcnMgPSBzZWxlY3RvciA/IF9ldmVudENvbnRleHRNYXAubGl2ZUV2ZW50TGlzdGVuZXJzIDogX2V2ZW50Q29udGV4dE1hcC5ldmVudExpc3RlbmVycztcbiAgICBpZiAoIWV2ZW50TGlzdGVuZXJzLmhhcyhlbGVtKSkge1xuICAgICAgICBpZiAoZW5zdXJlKSB7XG4gICAgICAgICAgICBldmVudExpc3RlbmVycy5zZXQoZWxlbSwge30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlcmVkOiB1bmRlZmluZWQhLFxuICAgICAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb250ZXh0ID0gZXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pITtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgbmFtZXNwYWNlLCBzZWxlY3Rvciwgb3B0aW9ucyk7XG4gICAgaWYgKCFjb250ZXh0W2Nvb2tpZV0pIHtcbiAgICAgICAgY29udGV4dFtjb29raWVdID0ge1xuICAgICAgICAgICAgcmVnaXN0ZXJlZDogbmV3IFNldDxFdmVudExpc3RlbmVyPigpLFxuICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBjb250ZXh0W2Nvb2tpZV07XG59XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgYWxsIGV2ZW50IGFuZCBoYW5kbGVyIGJ5IGVsZW1lbnQsIGZvciBhbGwgYG9mZigpYCBhbmQgYGNsb25lKHRydWUpYCAqL1xuZnVuY3Rpb24gZXh0cmFjdEFsbEhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCByZW1vdmUgPSB0cnVlKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIE9iamVjdC5rZXlzKGNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFtDb25zdC5BRERSRVNTX09QVElPTlNdKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgY29udGV4dFtjb29raWVdLmhhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goeyBldmVudCwgaGFuZGxlcjogaGFuZGxlci5wcm94eSwgb3B0aW9ucyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB7IGV2ZW50TGlzdGVuZXJzLCBsaXZlRXZlbnRMaXN0ZW5lcnMgfSA9IF9ldmVudENvbnRleHRNYXA7XG4gICAgcXVlcnkoZXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgZXZlbnRMaXN0ZW5lcnMuZGVsZXRlKGVsZW0pO1xuICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpICYmIHJlbW92ZSAmJiBsaXZlRXZlbnRMaXN0ZW5lcnMuZGVsZXRlKGVsZW0pO1xuXG4gICAgcmV0dXJuIGhhbmRsZXJzO1xufVxuXG4vKiogQGludGVybmFsIHF1ZXJ5IG5hbWVzcGFjZSBldmVudCBhbmQgaGFuZGxlciBieSBlbGVtZW50LCBmb3IgYG9mZihgLiR7bmFtZXNwYWNlfWApYCAqL1xuZnVuY3Rpb24gZXh0cmFjdE5hbWVzcGFjZUhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBuYW1lc3BhY2VzOiBzdHJpbmcpOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IG9iamVjdDsgfVtdIHtcbiAgICBjb25zdCBoYW5kbGVyczogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSA9IFtdO1xuXG4gICAgY29uc3QgbmFtZXMgPSBuYW1lc3BhY2VzLnNwbGl0KCcuJykuZmlsdGVyKG4gPT4gISFuKTtcbiAgICBjb25zdCBuYW1lc3BhY2VGaWx0ZXIgPSAoY29va2llOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lc3BhY2Ugb2YgbmFtZXMpIHtcbiAgICAgICAgICAgIGlmIChjb29raWUuaW5jbHVkZXMoYC4ke25hbWVzcGFjZX0uYCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvb2tpZXMgPSBPYmplY3Qua2V5cyhjb250ZXh0KS5maWx0ZXIobmFtZXNwYWNlRmlsdGVyKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIGNvb2tpZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWVkID0gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gc2VlZFtDb25zdC5BRERSRVNTX0VWRU5UXTtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0gSlNPTi5wYXJzZShzZWVkW0NvbnN0LkFERFJFU1NfT1BUSU9OU10pO1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnM6IF9oYW5kbGVycyB9ID0gY29udGV4dFtjb29raWVdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBfaGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7IGV2ZW50LCBoYW5kbGVyOiBoYW5kbGVyLnByb3h5LCBvcHRpb25zIH0pO1xuICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmRlbGV0ZShoYW5kbGVyLmxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG4gICAgcXVlcnkobGl2ZUV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG5cbiAgICByZXR1cm4gaGFuZGxlcnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQYXJzZUV2ZW50QXJnc1Jlc3VsdCB7XG4gICAgdHlwZTogc3RyaW5nW107XG4gICAgc2VsZWN0b3I6IHN0cmluZztcbiAgICBsaXN0ZW5lcjogSW50ZXJuYWxFdmVudExpc3RlbmVyO1xuICAgIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zO1xufVxuXG4vKiogQGludGVybmFsIHBhcnNlIGV2ZW50IGFyZ3MgKi9cbmZ1bmN0aW9uIHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IFBhcnNlRXZlbnRBcmdzUmVzdWx0IHtcbiAgICBsZXQgW3R5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICBbdHlwZSwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICAgICAgc2VsZWN0b3IgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdHlwZSA9ICF0eXBlID8gW10gOiAoaXNBcnJheSh0eXBlKSA/IHR5cGUgOiBbdHlwZV0pO1xuICAgIHNlbGVjdG9yID0gc2VsZWN0b3IgfHwgJyc7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHRydWUgPT09IG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHsgY2FwdHVyZTogdHJ1ZSB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9IGFzIFBhcnNlRXZlbnRBcmdzUmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9ub1RyaWdnZXIgPSBbJ3Jlc2l6ZScsICdzY3JvbGwnXTtcblxuLyoqIEBpbnRlcm5hbCBldmVudC1zaG9ydGN1dCBpbXBsICovXG5mdW5jdGlvbiBldmVudFNob3J0Y3V0PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgdGhpczogRE9NRXZlbnRzPEFjY2Vzc2libGU8VCwgKCkgPT4gdm9pZD4+LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBoYW5kbGVyPzogRXZlbnRMaXN0ZW5lcixcbiAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4pOiBET01FdmVudHM8VD4ge1xuICAgIGlmIChudWxsID09IGhhbmRsZXIpIHtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoIV9ub1RyaWdnZXIuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihlbFtuYW1lXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxbbmFtZV0oKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGVsIGFzIGFueSkudHJpZ2dlcihuYW1lIGFzIGFueSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKG5hbWUgYXMgYW55LCBoYW5kbGVyIGFzIGFueSwgb3B0aW9ucyk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNsb25lKClgICovXG5mdW5jdGlvbiBjbG9uZUV2ZW50KHNyYzogRWxlbWVudCwgZHN0OiBFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0QWxsSGFuZGxlcnMoc3JjLCBmYWxzZSk7XG4gICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgIGRzdC5hZGRFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRWxlbWVudChlbGVtOiBFbGVtZW50LCB3aXRoRXZlbnRzOiBib29sZWFuLCBkZWVwOiBib29sZWFuKTogRWxlbWVudCB7XG4gICAgY29uc3QgY2xvbmUgPSBlbGVtLmNsb25lTm9kZSh0cnVlKSBhcyBFbGVtZW50O1xuXG4gICAgaWYgKHdpdGhFdmVudHMpIHtcbiAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIGNvbnN0IHNyY0VsZW1lbnRzID0gZWxlbS5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgICAgICBjb25zdCBkc3RFbGVtZW50cyA9IGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2luZGV4XSBvZiBzcmNFbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBjbG9uZUV2ZW50KHNyY0VsZW1lbnRzW2luZGV4XSwgZHN0RWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsb25lRXZlbnQoZWxlbSwgY2xvbmUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb25lO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2VsZiBldmVudCBtYW5hZ2UgKi9cbmZ1bmN0aW9uIGhhbmRsZVNlbGZFdmVudDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxmOiBET01FdmVudHM8VEVsZW1lbnQ+LFxuICAgIGNhbGxiYWNrOiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsXG4gICAgZXZlbnROYW1lOiBFdmVudFR5cGVPck5hbWVzcGFjZTxET01FdmVudE1hcDxIVE1MRWxlbWVudCB8IFdpbmRvdz4+LFxuICAgIHBlcm1hbmVudDogYm9vbGVhbixcbik6IERPTUV2ZW50czxURWxlbWVudD4ge1xuICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICBpZiAoZS50YXJnZXQgIT09IHRoaXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIGUpO1xuICAgICAgICBpZiAoIXBlcm1hbmVudCkge1xuICAgICAgICAgICAgKHNlbGYgYXMgRE9NRXZlbnRzPE5vZGU+KS5vZmYoZXZlbnROYW1lLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlzRnVuY3Rpb24oY2FsbGJhY2spICYmIChzZWxmIGFzIERPTUV2ZW50czxOb2RlPikub24oZXZlbnROYW1lLCBmaXJlQ2FsbEJhY2spO1xuICAgIHJldHVybiBzZWxmO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyogZXNsaW50LWRpc2FibGUgQHN0eWxpc3RpYzpqcy9pbmRlbnQgKi9cbmV4cG9ydCB0eXBlIERPTUV2ZW50TWFwPFQ+XG4gICAgPSBUIGV4dGVuZHMgV2luZG93ID8gV2luZG93RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBEb2N1bWVudCA/IERvY3VtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MQm9keUVsZW1lbnQgPyBIVE1MQm9keUVsZW1lbnRFdmVudE1hcCAmIENvbm5lY3RFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxNZWRpYUVsZW1lbnQgPyBIVE1MTWVkaWFFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MRWxlbWVudCA/IEhUTUxFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBFbGVtZW50ID8gRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwXG4gICAgOiBHbG9iYWxFdmVudEhhbmRsZXJzRXZlbnRNYXA7XG4vKiBlc2xpbnQtZW5hYmxlIEBzdHlsaXN0aWM6anMvaW5kZW50ICovXG5cbmV4cG9ydCB0eXBlIERPTUV2ZW50TGlzdGVuZXI8VCA9IEhUTUxFbGVtZW50LCBNIGV4dGVuZHMgRE9NRXZlbnRNYXA8VD4gPSBET01FdmVudE1hcDxUPj4gPSAoZXZlbnQ6IE1ba2V5b2YgTV0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuZXhwb3J0IHR5cGUgRXZlbnRXaXRoTmFtZXNwYWNlPFQgZXh0ZW5kcyBET01FdmVudE1hcDxhbnk+PiA9IGtleW9mIFQgfCBgJHtzdHJpbmcgJiBrZXlvZiBUfS4ke3N0cmluZ31gO1xuZXhwb3J0IHR5cGUgTWFrZUV2ZW50VHlwZTxULCBNPiA9IFQgZXh0ZW5kcyBrZXlvZiBNID8ga2V5b2YgTSA6IChUIGV4dGVuZHMgYCR7c3RyaW5nICYga2V5b2YgTX0uJHtpbmZlciBDfWAgPyBgJHtzdHJpbmcgJiBrZXlvZiBNfS4ke0N9YCA6IG5ldmVyKTtcbmV4cG9ydCB0eXBlIEV2ZW50VHlwZTxUIGV4dGVuZHMgRE9NRXZlbnRNYXA8YW55Pj4gPSBNYWtlRXZlbnRUeXBlPEV2ZW50V2l0aE5hbWVzcGFjZTxUPiwgVD47XG5leHBvcnQgdHlwZSBFdmVudFR5cGVPck5hbWVzcGFjZTxUIGV4dGVuZHMgRE9NRXZlbnRNYXA8YW55Pj4gPSBFdmVudFR5cGU8VD4gfCBgLiR7c3RyaW5nfWA7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgZXZlbnQgbWFuYWdlbWVudHMuXG4gKiBAamEg44Kk44OZ44Oz44OI566h55CG44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FdmVudHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIGJhc2ljXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIG9uKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVMaXZlRXZlbnQoZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmIChlLmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBldmVudERhdGEgPSBxdWVyeUV2ZW50RGF0YShlKTtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGUudGFyZ2V0IGFzIEVsZW1lbnQgfCBudWxsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseSgkdGFyZ2V0WzBdLCBldmVudERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhcmVudCBvZiAkdGFyZ2V0LnBhcmVudHMoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnQpLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkocGFyZW50LCBldmVudERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlRXZlbnQodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIHF1ZXJ5RXZlbnREYXRhKGUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByb3h5ID0gc2VsZWN0b3IgPyBoYW5kbGVMaXZlRXZlbnQgOiBoYW5kbGVFdmVudDtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tYm9zID0gc3BsaXRFdmVudE5hbWVzcGFjZXMoZXZlbnQpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tYm8gb2YgY29tYm9zKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHlwZSwgbmFtZXNwYWNlIH0gPSBjb21ibztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyByZWdpc3RlcmVkLCBoYW5kbGVycyB9ID0gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbCwgdHlwZSwgbmFtZXNwYWNlLCBzZWxlY3Rvciwgb3B0aW9ucywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWdpc3RlcmVkICYmICFyZWdpc3RlcmVkLmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQuYWRkKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3h5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIHByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCB7QGxpbmsgRE9NRXZlbnRzLm9uIHwgb259KCkgb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4ge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIOOBvuOBn+OBryB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgpIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCB7QGxpbmsgRE9NRXZlbnRzLm9uIHwgb259KCkgb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4ge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIOOBvuOBn+OBryB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgpIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OBmeOBueOBpuOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmYoKTogdGhpcztcblxuICAgIHB1YmxpYyBvZmYoLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGlmIChldmVudHMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdEFsbEhhbmRsZXJzKGVsKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBldmVudCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0TmFtZXNwYWNlSGFuZGxlcnMoZWwsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tYm9zID0gcmVzb2x2ZUV2ZW50TmFtZXNwYWNlcyhlbCwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21ibyBvZiBjb21ib3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHR5cGUsIG5hbWVzcGFjZSB9ID0gY29tYm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyByZWdpc3RlcmVkLCBoYW5kbGVycyB9ID0gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbCwgdHlwZSwgbmFtZXNwYWNlLCBzZWxlY3Rvciwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgwIDwgaGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBoYW5kbGVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgeyAvLyBiYWNrd2FyZCBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVyc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGhhbmRsZXI/Lmxpc3RlbmVyPy5vcmlnaW4gPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICghbGlzdGVuZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIucHJveHksIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmRlbGV0ZShoYW5kbGVyLmxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCDkuIDluqbjgaDjgZHlkbzjgbPlh7rjgZXjgozjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+WvvuOBl+OBpuOCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZS4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIOS4gOW6puOBoOOBkeWRvOOBs+WHuuOBleOCjOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr5a++44GX44Gm44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb25jZSguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCBvcHRzID0geyAuLi5vcHRpb25zLCAuLi57IG9uY2U6IHRydWUgfSB9O1xuXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiBvbmNlSGFuZGxlcih0aGlzOiBET01FdmVudHM8VEVsZW1lbnQ+LCAuLi5ldmVudEFyZ3M6IHVua25vd25bXSk6IHZvaWQge1xuICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgZXZlbnRBcmdzKTtcbiAgICAgICAgICAgIHNlbGYub2ZmKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgICAgICAgICAgZGVsZXRlIG9uY2VIYW5kbGVyLm9yaWdpbjtcbiAgICAgICAgfVxuICAgICAgICBvbmNlSGFuZGxlci5vcmlnaW4gPSBsaXN0ZW5lciBhcyBJbnRlcm5hbEV2ZW50TGlzdGVuZXIgfCB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGFsbCBoYW5kbGVycyBhZGRlZCB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gr5a++44GX44Gm44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIC8vIHcvIGV2ZW50LW5hbWVzcGFjZSBiZWhhdmlvdXJcbiAgICAgKiAkKCcubGluaycpLm9uKCdjbGljay5ob2dlLnBpeW8nLCAoZSkgPT4geyAuLi4gfSk7XG4gICAgICogJCgnLmxpbmsnKS5vbignY2xpY2suaG9nZScsICAoZSkgPT4geyAuLi4gfSk7XG4gICAgICpcbiAgICAgKiAkKCcubGluaycpLnRyaWdnZXIoJy5ob2dlJyk7ICAgICAgICAgICAvLyBjb21waWxlIGVycm9yLiAobm90IGZpcmUpXG4gICAgICogJCgnLmxpbmsnKS50cmlnZ2VyKCdjbGljay5ob2dlJyk7ICAgICAgLy8gZmlyZSBib3RoLlxuICAgICAqICQoJy5saW5rJykudHJpZ2dlcignY2xpY2suaG9nZS5waXlvJyk7IC8vIGZpcmUgb25seSBmaXJzdCBvbmVcbiAgICAgKiBgYGBcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LiAvIGBFdmVudGAgaW5zdGFuY2Ugb3IgYEV2ZW50YCBpbnN0YW5jZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIlyAvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K544G+44Gf44GvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K56YWN5YiXXG4gICAgICogQHBhcmFtIGV2ZW50RGF0YVxuICAgICAqICAtIGBlbmAgb3B0aW9uYWwgc2VuZGluZyBkYXRhLlxuICAgICAqICAtIGBqYWAg6YCB5L+h44GZ44KL5Lu75oSP44Gu44OH44O844K/XG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgc2VlZDogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10gfCBFdmVudCB8IEV2ZW50W10gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4gfCBFdmVudClbXSxcbiAgICAgICAgLi4uZXZlbnREYXRhOiB1bmtub3duW11cbiAgICApOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY29udmVydCA9IChhcmc6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgRXZlbnQpOiBFdmVudCA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoYXJnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ3VzdG9tRXZlbnQobm9ybWFsaXplRXZlbnROYW1lc3BhY2VzKGFyZyksIHtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBldmVudERhdGEsXG4gICAgICAgICAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcmcgYXMgRXZlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZXZlbnRzID0gaXNBcnJheShzZWVkKSA/IHNlZWQgOiBbc2VlZF07XG5cbiAgICAgICAgZm9yIChjb25zdCBldmVudCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgIGNvbnN0IGUgPSBjb252ZXJ0KGV2ZW50KTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyRXZlbnREYXRhKGVsLCBldmVudERhdGEpO1xuICAgICAgICAgICAgICAgIGVsLmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlRXZlbnREYXRhKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyB1dGlsaXR5XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCd0cmFuc2l0aW9uc3RhcnQnKS5cbiAgICAgKiBAamEge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ3RyYW5zaXRpb25zdGFydCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgdHJhbnNpdGlvbnN0YXJ0YCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYHRyYW5zaXRpb25zdGFydGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uU3RhcnQoY2FsbGJhY2s6IChldmVudDogVHJhbnNpdGlvbkV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTZWxmRXZlbnQodGhpcywgY2FsbGJhY2ssICd0cmFuc2l0aW9uc3RhcnQnLCBwZXJtYW5lbnQpIGFzIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgndHJhbnNpdGlvbmVuZCcpLlxuICAgICAqIEBqYSB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgndHJhbnNpdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgdHJhbnNpdGlvbmVuZGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGB0cmFuc2l0aW9uZW5kYCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIHRyYW5zaXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogVHJhbnNpdGlvbkV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTZWxmRXZlbnQodGhpcywgY2FsbGJhY2ssICd0cmFuc2l0aW9uZW5kJywgcGVybWFuZW50KSBhcyB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ2FuaW1hdGlvbnN0YXJ0JykuXG4gICAgICogQGphIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCdhbmltYXRpb25zdGFydCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uc3RhcnRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgYW5pbWF0aW9uc3RhcnRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0aW9uU3RhcnQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZVNlbGZFdmVudCh0aGlzLCBjYWxsYmFjaywgJ2FuaW1hdGlvbnN0YXJ0JywgcGVybWFuZW50KSBhcyB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ2FuaW1hdGlvbmVuZCcpLlxuICAgICAqIEBqYSB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgnYW5pbWF0aW9uZW5kJykg44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGBhbmltYXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgYW5pbWF0aW9uZW5kYCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGlvbkVuZChjYWxsYmFjazogKGV2ZW50OiBBbmltYXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAnYW5pbWF0aW9uZW5kJywgcGVybWFuZW50KSBhcyB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBCaW5kIG9uZSBvciB0d28gaGFuZGxlcnMgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMsIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIGBtb3VzZWVudGVyYCBhbmQgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50cy5cbiAgICAgKiBAamEgMeOBpOOBvuOBn+OBrzLjgaTjga7jg4/jg7Pjg4njg6njgpLmjIflrprjgZcsIOS4gOiHtOOBl+OBn+imgee0oOOBriBgbW91c2VlbnRlcmAsIGBtb3VzZWxlYXZlYCDjgpLmpJznn6VcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVySW4oT3V0KVxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWVudGVyYCB0aGUgZWxlbWVudC4gPGJyPlxuICAgICAqICAgICAgICBJZiBoYW5kbGVyIHNldCBvbmx5IG9uZSwgYSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudCwgdG9vLlxuICAgICAqICAtIGBqYWAgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4gPGJyPlxuICAgICAqICAgICAgICAgIOW8leaVsOOBjDHjgaTjgafjgYLjgovloLTlkIgsIGBtb3VzZWxlYXZlYCDjg4/jg7Pjg4njg6njgoLlhbzjga3jgotcbiAgICAgKiBAcGFyYW0gaGFuZGxlck91dFxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIGBtb3VzZWxlYXZlYCDjg4/jg7Pjg4njg6njgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaG92ZXIoaGFuZGxlckluOiBET01FdmVudExpc3RlbmVyLCBoYW5kbGVyT3V0PzogRE9NRXZlbnRMaXN0ZW5lcik6IHRoaXMge1xuICAgICAgICBoYW5kbGVyT3V0ID0gaGFuZGxlck91dCA/PyBoYW5kbGVySW47XG4gICAgICAgIHJldHVybiB0aGlzLm1vdXNlZW50ZXIoaGFuZGxlckluKS5tb3VzZWxlYXZlKGhhbmRsZXJPdXQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHNob3J0Y3V0XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNsaWNrYCBldmVudC5cbiAgICAgKiBAamEgYGNsaWNrYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjbGljayhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjbGljaycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZGJsY2xpY2tgIGV2ZW50LlxuICAgICAqIEBqYSBgZGJsY2xpY2tgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRibGNsaWNrKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2RibGNsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBibHVyYCBldmVudC5cbiAgICAgKiBAamEgYGJsdXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGJsdXIoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnYmx1cicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3VzKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3VzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c2luYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzaW5gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3VzaW4oaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNpbicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3Vzb3V0KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3Vzb3V0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXl1cGAgZXZlbnQuXG4gICAgICogQGphIGBrZXl1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5dXAoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5dXAnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleWRvd25gIGV2ZW50LlxuICAgICAqIEBqYSBga2V5ZG93bmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5ZG93bihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlwcmVzc2AgZXZlbnQuXG4gICAgICogQGphIGBrZXlwcmVzc2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5cHJlc3MoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5cHJlc3MnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHN1Ym1pdGAgZXZlbnQuXG4gICAgICogQGphIGBzdWJtaXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN1Ym1pdChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdzdWJtaXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNvbnRleHRtZW51YCBldmVudC5cbiAgICAgKiBAamEgYGNvbnRleHRtZW51YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjb250ZXh0bWVudShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjb250ZXh0bWVudScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2hhbmdlYCBldmVudC5cbiAgICAgKiBAamEgYGNoYW5nZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NoYW5nZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2Vkb3duYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZG93bmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2Vkb3duKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZG93bicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2Vtb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlbW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2Vtb3ZlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2V1cGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZXVwKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNldXAnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZW50ZXJgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VlbnRlcihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWVudGVyJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWxlYXZlYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlbGVhdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlbGVhdmUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VsZWF2ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3V0KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlb3V0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW92ZXJgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdmVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW92ZXIoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VvdmVyJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaHN0YXJ0YCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoc3RhcnRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoc3RhcnQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hzdGFydCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hlbmRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hlbmRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoZW5kKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoZW5kJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaG1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2htb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaG1vdmUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2htb3ZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaGNhbmNlbGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaGNhbmNlbGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hjYW5jZWwoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hjYW5jZWwnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHJlc2l6ZWAgZXZlbnQuXG4gICAgICogQGphIGByZXNpemVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2l6ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdyZXNpemUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHNjcm9sbGAgZXZlbnQuXG4gICAgICogQGphIGBzY3JvbGxgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdzY3JvbGwnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENvcHlpbmdcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBkZWVwIGNvcHkgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7jg4fjgqPjg7zjg5fjgrPjg5Tjg7zjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB3aXRoRXZlbnRzXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIGV2ZW50IGhhbmRsZXJzIHNob3VsZCBiZSBjb3BpZWQgYWxvbmcgd2l0aCB0aGUgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgoLjgrPjg5Tjg7zjgZnjgovjgYvjganjgYbjgYvjgpLmsbrlrppcbiAgICAgKiBAcGFyYW0gZGVlcFxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciBldmVudCBoYW5kbGVycyBmb3IgYWxsIGNoaWxkcmVuIG9mIHRoZSBjbG9uZWQgZWxlbWVudCBzaG91bGQgYmUgY29waWVkLlxuICAgICAqICAtIGBqYWAgYm9vbGVhbuWApOOBp+OAgemFjeS4i+OBruimgee0oOOBruOBmeOBueOBpuOBruWtkOimgee0oOOBq+WvvuOBl+OBpuOCguOAgeS7mOmaj+OBl+OBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuOCs+ODlOODvOOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumlxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSh3aXRoRXZlbnRzID0gZmFsc2UsIGRlZXAgPSBmYWxzZSk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD4gYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHNlbGYpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZi5tYXAoKGluZGV4OiBudW1iZXIsIGVsOiBURWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNsb25lRWxlbWVudChlbCBhcyBOb2RlIGFzIEVsZW1lbnQsIHdpdGhFdmVudHMsIGRlZXApIGFzIE5vZGUgYXMgVEVsZW1lbnQ7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRXZlbnRzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHtcbiAgICBOdWxsaXNoLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NpZnksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGlzV2luZG93Q29udGV4dCxcbiAgICBlbnN1cmVQb3NpdGl2ZU51bWJlcixcbiAgICBzd2luZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzTm9kZURvY3VtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgZ2V0T2Zmc2V0U2l6ZSB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCB7IHJlcXVlc3RBbmltYXRpb25GcmFtZSB9IGZyb20gJy4vc3NyJztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIERPTX1gLnNjcm9sbFRvKClgIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgRE9NfWAuc2Nyb2xsVG8oKWAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NU2Nyb2xsT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB2ZXJ0aWNhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgdG9wPzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSBob3Jpem9udGFsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqIEBqYSDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKi9cbiAgICBsZWZ0PzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBkdXJhdGlvbj86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqIEBqYSDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICovXG4gICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBjYWxsYmFjaz86ICgpID0+IHZvaWQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHF1ZXJ5IHNjcm9sbCB0YXJnZXQgZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlUYXJnZXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE51bGxpc2gpOiBFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9IGVsc2UgaWYgKGlzTm9kZURvY3VtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWwuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dDb250ZXh0KGVsKSkge1xuICAgICAgICByZXR1cm4gZWwuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBzY3JvbGxUbygpYCAqL1xuZnVuY3Rpb24gcGFyc2VBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IERPTVNjcm9sbE9wdGlvbnMge1xuICAgIGNvbnN0IG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMgPSB7IGVhc2luZzogJ3N3aW5nJyB9O1xuICAgIGlmICgxID09PSBhcmdzLmxlbmd0aCkge1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIGFyZ3NbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFtsZWZ0LCB0b3AsIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrXSA9IGFyZ3M7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywge1xuICAgICAgICAgICAgdG9wLFxuICAgICAgICAgICAgbGVmdCxcbiAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wdGlvbnMudG9wICAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLnRvcCk7XG4gICAgb3B0aW9ucy5sZWZ0ICAgICA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMubGVmdCk7XG4gICAgb3B0aW9ucy5kdXJhdGlvbiA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMuZHVyYXRpb24pO1xuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIGV4ZWNTY3JvbGwoZWw6IEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCwgb3B0aW9uczogRE9NU2Nyb2xsT3B0aW9ucyk6IHZvaWQge1xuICAgIGNvbnN0IHsgdG9wLCBsZWZ0LCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjayB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IGluaXRpYWxUb3AgPSBlbC5zY3JvbGxUb3A7XG4gICAgY29uc3QgaW5pdGlhbExlZnQgPSBlbC5zY3JvbGxMZWZ0O1xuICAgIGxldCBlbmFibGVUb3AgPSBpc051bWJlcih0b3ApO1xuICAgIGxldCBlbmFibGVMZWZ0ID0gaXNOdW1iZXIobGVmdCk7XG5cbiAgICAvLyBub24gYW5pbWF0aW9uIGNhc2VcbiAgICBpZiAoIWR1cmF0aW9uKSB7XG4gICAgICAgIGxldCBub3RpZnkgPSBmYWxzZTtcbiAgICAgICAgaWYgKGVuYWJsZVRvcCAmJiB0b3AgIT09IGluaXRpYWxUb3ApIHtcbiAgICAgICAgICAgIGVsLnNjcm9sbFRvcCA9IHRvcCE7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0ICYmIGxlZnQgIT09IGluaXRpYWxMZWZ0KSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxMZWZ0ID0gbGVmdCE7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub3RpZnkgJiYgaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGNNZXRyaWNzID0gKGVuYWJsZTogYm9vbGVhbiwgYmFzZTogbnVtYmVyLCBpbml0aWFsVmFsdWU6IG51bWJlciwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogeyBtYXg6IG51bWJlcjsgbmV3OiBudW1iZXI7IGluaXRpYWw6IG51bWJlcjsgfSA9PiB7XG4gICAgICAgIGlmICghZW5hYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBtYXg6IDAsIG5ldzogMCwgaW5pdGlhbDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1heFZhbHVlID0gKGVsIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF0gLSBnZXRPZmZzZXRTaXplKGVsLCB0eXBlKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1heChNYXRoLm1pbihiYXNlLCBtYXhWYWx1ZSksIDApO1xuICAgICAgICByZXR1cm4geyBtYXg6IG1heFZhbHVlLCBuZXc6IG5ld1ZhbHVlLCBpbml0aWFsOiBpbml0aWFsVmFsdWUgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgbWV0cmljc1RvcCA9IGNhbGNNZXRyaWNzKGVuYWJsZVRvcCwgdG9wISwgaW5pdGlhbFRvcCwgJ2hlaWdodCcpO1xuICAgIGNvbnN0IG1ldHJpY3NMZWZ0ID0gY2FsY01ldHJpY3MoZW5hYmxlTGVmdCwgbGVmdCEsIGluaXRpYWxMZWZ0LCAnd2lkdGgnKTtcblxuICAgIGlmIChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPT09IG1ldHJpY3NUb3AuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVUb3AgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID09PSBtZXRyaWNzTGVmdC5pbml0aWFsKSB7XG4gICAgICAgIGVuYWJsZUxlZnQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFlbmFibGVUb3AgJiYgIWVuYWJsZUxlZnQpIHtcbiAgICAgICAgLy8gbmVlZCBub3QgdG8gc2Nyb2xsXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjUHJvZ3Jlc3MgPSAodmFsdWU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGVhc2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBlYXNpbmcodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdsaW5lYXInID09PSBlYXNpbmcgPyB2YWx1ZSA6IHN3aW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWx0YSA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGNvbnN0IGFuaW1hdGUgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGVsYXBzZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gTWF0aC5tYXgoTWF0aC5taW4oZWxhcHNlIC8gZHVyYXRpb24sIDEpLCAwKTtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3NDb2VmZiA9IGNhbGNQcm9ncmVzcyhwcm9ncmVzcyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGRlbHRhXG4gICAgICAgIGlmIChlbmFibGVUb3ApIHtcbiAgICAgICAgICAgIGRlbHRhLnRvcCA9IG1ldHJpY3NUb3AuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NUb3AubmV3IC0gbWV0cmljc1RvcC5pbml0aWFsKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuYWJsZUxlZnQpIHtcbiAgICAgICAgICAgIGRlbHRhLmxlZnQgPSBtZXRyaWNzTGVmdC5pbml0aWFsICsgKHByb2dyZXNzQ29lZmYgKiAobWV0cmljc0xlZnQubmV3IC0gbWV0cmljc0xlZnQuaW5pdGlhbCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgZG9uZVxuICAgICAgICBpZiAoKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA+IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPj0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCBkb3duXG4gICAgICAgICAgICAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3IDwgbWV0cmljc1RvcC5pbml0aWFsICYmIGRlbHRhLnRvcCA8PSBtZXRyaWNzVG9wLm5ldykgICAgICAgfHwgLy8gc2Nyb2xsIHVwXG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPiBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPj0gbWV0cmljc0xlZnQubmV3KSAgfHwgLy8gc2Nyb2xsIHJpZ2h0XG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPCBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPD0gbWV0cmljc0xlZnQubmV3KSAgICAgLy8gc2Nyb2xsIGxlZnRcbiAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIGVuYWJsZVRvcCAmJiAoZWwuc2Nyb2xsVG9wID0gbWV0cmljc1RvcC5uZXcpO1xuICAgICAgICAgICAgZW5hYmxlTGVmdCAmJiAoZWwuc2Nyb2xsTGVmdCA9IG1ldHJpY3NMZWZ0Lm5ldyk7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVsZWFzZSByZWZlcmVuY2UgaW1tZWRpYXRlbHkuXG4gICAgICAgICAgICBlbCA9IG51bGwhO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXBkYXRlIHNjcm9sbCBwb3NpdGlvblxuICAgICAgICBlbmFibGVUb3AgJiYgKGVsLnNjcm9sbFRvcCA9IGRlbHRhLnRvcCk7XG4gICAgICAgIGVuYWJsZUxlZnQgJiYgKGVsLnNjcm9sbExlZnQgPSBkZWx0YS5sZWZ0KTtcblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG4gICAgfTtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBtYW5pcHVsYXRpb24gbWV0aG9kcy5cbiAqIEBqYSDjgrnjgq/jg63jg7zjg6vjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVNjcm9sbDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTY3JvbGxcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBleOCjOOBn+ODlOOCr+OCu+ODq+aVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUb3AoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zaXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSBkdXJhdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKiBAcGFyYW0gZWFzaW5nXG4gICAgICogIC0gYGVuYCB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqICAtIGBqYWAg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbFRvcCA6IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbFRvKHtcbiAgICAgICAgICAgICAgICB0b3A6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIGhvcml6b250YWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOaoquaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbExlZnQgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgbGVmdDogcG9zaXRpb24sXG4gICAgICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB4XG4gICAgICogIC0gYGVuYCB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOaoquOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSB5XG4gICAgICogIC0gYGVuYCB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDnuKbjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKFxuICAgICAgICB4OiBudW1iZXIsXG4gICAgICAgIHk6IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIHNjcm9sbCB2YWx1ZXMgYnkgb3B0b2lucy5cbiAgICAgKiBAamEg44Kq44OX44K344On44Oz44KS55So44GE44Gm44K544Kv44Ot44O844Or5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gcGFyc2VBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBxdWVyeVRhcmdldEVsZW1lbnQoZWwpO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBleGVjU2Nyb2xsKGVsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU2Nyb2xsLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbiAgICBub29wLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBFbGVtZW50QmFzZSwgRE9NIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbi8qKlxuICogQGVuIHtAbGluayBET019IGVmZmVjdCBwYXJhbWV0ZXIuXG4gKiBAamEge0BsaW5rIERPTX0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdFBhcmFtZXRlcnMgPSBLZXlmcmFtZVtdIHwgUHJvcGVydHlJbmRleGVkS2V5ZnJhbWVzIHwgbnVsbDtcblxuLyoqXG4gKiBAZW4ge0BsaW5rIERPTX0gZWZmZWN0IG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIERPTX0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdE9wdGlvbnMgPSBudW1iZXIgfCBLZXlmcmFtZUFuaW1hdGlvbk9wdGlvbnM7XG5cbi8qKlxuICogQGVuIHtAbGluayBET019IGVmZmVjdCBjb250ZXh0IG9iamVjdC5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjga7jgqjjg5Xjgqfjgq/jg4jlirnmnpzjga7jgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01FZmZlY3RDb250ZXh0PFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IHtcbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIERPTX0gaW5zdGFuY2UgdGhhdCBjYWxsZWQge0BsaW5rIERPTUVmZmVjdHMuYW5pbWF0ZSB8IGFuaW1hdGV9KCkgbWV0aG9kLlxuICAgICAqIEBqYSB7QGxpbmsgRE9NRWZmZWN0cy5hbmltYXRlIHwgYW5pbWF0ZX0oKSDjg6Hjgr3jg4Pjg4njgpLlrp/ooYzjgZfjgZ8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgZG9tOiBET008VEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhbmQgYEFuaW1hdGlvbmAgaW5zdGFuY2UgbWFwIGJ5IGV4ZWN1dGlvbiB7QGxpbmsgRE9NRWZmZWN0cy5hbmltYXRlIHwgYW5pbWF0ZX0oKSBtZXRob2QgYXQgdGhpcyB0aW1lLlxuICAgICAqIEBqYSDku4rlm54ge0BsaW5rIERPTUVmZmVjdHMuYW5pbWF0ZSB8IGFuaW1hdGV9KCkg5a6f6KGM44GX44GfIGBFbGVtZW50YCDjgaggYEFuaW1hdGlvbmAg44Kk44Oz44K544K/44Oz44K544Gu44Oe44OD44OXXG4gICAgICovXG4gICAgcmVhZG9ubHkgYW5pbWF0aW9uczogTWFwPFRFbGVtZW50LCBBbmltYXRpb24+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjdXJyZW50IGZpbmlzaGVkIFByb21pc2UgZm9yIHRoaXMgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDlr77osaHjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7ntYLkuobmmYLjgavnmbrngavjgZnjgosgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGZpbmlzaGVkOiBQcm9taXNlPERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQ+Pjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2FuaW1Db250ZXh0TWFwID0gbmV3IFdlYWtNYXA8RWxlbWVudCwgU2V0PEFuaW1hdGlvbj4+KCk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgYW5pbWF0aW9uL2VmZmVjdCBtZXRob2RzLlxuICogQGphIOOCouODi+ODoeODvOOCt+ODp+ODsy/jgqjjg5Xjgqfjgq/jg4jmk43kvZzjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUVmZmVjdHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWZmZWN0cyBhbmltYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGFydCBhbmltYXRpb24gYnkgYFdlYiBBbmltYXRpb24gQVBJYC5cbiAgICAgKiBAamEgYFdlYiBBbmltYXRpb24gQVBJYCDjgpLnlKjjgYTjgabjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0ZShwYXJhbXM6IERPTUVmZmVjdFBhcmFtZXRlcnMsIG9wdGlvbnM6IERPTUVmZmVjdE9wdGlvbnMpOiBET01FZmZlY3RDb250ZXh0PFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGRvbTogdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD4gYXMgRE9NPFRFbGVtZW50PixcbiAgICAgICAgICAgIGFuaW1hdGlvbnM6IG5ldyBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj4oKSxcbiAgICAgICAgfSBhcyBXcml0YWJsZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG5cbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFuaW0gPSBlbC5hbmltYXRlKHBhcmFtcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwpID8/IG5ldyBTZXQoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmFkZChhbmltKTtcbiAgICAgICAgICAgICAgICBfYW5pbUNvbnRleHRNYXAuc2V0KGVsLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuYW5pbWF0aW9ucy5zZXQoZWwgYXMgTm9kZSBhcyBURWxlbWVudCwgYW5pbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLmFsbChbLi4ucmVzdWx0LmFuaW1hdGlvbnMudmFsdWVzKCldLm1hcChhbmltID0+IGFuaW0uZmluaXNoZWQpKS50aGVuKCgpID0+IHJlc3VsdCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsIGN1cnJlbnQgcnVubmluZyBhbmltYXRpb24uXG4gICAgICogQGphIOePvuWcqOWun+ihjOOBl+OBpuOBhOOCi+OCouODi+ODoeODvOOCt+ODp+ODs+OCkuS4reatolxuICAgICAqL1xuICAgIHB1YmxpYyBjYW5jZWwoKTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFuaW1hdGlvbiBvZiBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRpb24uY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLmRlbGV0ZShlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZpbmlzaCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLntYLkuoZcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluaXNoKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmlzaCDjgafjga/noLTmo4TjgZfjgarjgYRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFZmZlY3RzIHV0aWxpdHlcblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGZvcmNlIHJlZmxvdy5cbiAgICAgKiBAamEg5by35Yi244Oq44OV44Ot44O844KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIHJlZmxvdygpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXNbMF0gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIHVua25vd24gYXMgRE9NKSAge1xuICAgICAgICAgICAgICAgIG5vb3AoZWwub2Zmc2V0SGVpZ2h0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBmb3JjZSByZXBhaW50LlxuICAgICAqIEBqYSDlvLfliLblho3mj4/nlLvjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVwYWludCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKHRoaXNbMF0gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIHVua25vd24gYXMgRE9NKSAge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBlbC5zdHlsZS5kaXNwbGF5O1xuICAgICAgICAgICAgICAgIGVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgZWwuc3R5bGUuZGlzcGxheSA9IGN1cnJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FZmZlY3RzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHtcbiAgICBDbGFzcyxcbiAgICBtaXhpbnMsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBFbGVtZW50aWZ5U2VlZCxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBET01CYXNlIH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IERPTUF0dHJpYnV0ZXMgfSBmcm9tICcuL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHsgRE9NVHJhdmVyc2luZyB9IGZyb20gJy4vdHJhdmVyc2luZyc7XG5pbXBvcnQgeyBET01NYW5pcHVsYXRpb24gfSBmcm9tICcuL21hbmlwdWxhdGlvbic7XG5pbXBvcnQgeyBET01TdHlsZXMgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyBET01FdmVudHMgfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQgeyBET01TY3JvbGwgfSBmcm9tICcuL3Njcm9sbCc7XG5pbXBvcnQgeyBET01FZmZlY3RzIH0gZnJvbSAnLi9lZmZlY3RzJztcblxudHlwZSBET01GZWF0dXJlczxUIGV4dGVuZHMgRWxlbWVudEJhc2U+XG4gICAgPSBET01CYXNlPFQ+XG4gICAgJiBET01BdHRyaWJ1dGVzPFQ+XG4gICAgJiBET01UcmF2ZXJzaW5nPFQ+XG4gICAgJiBET01NYW5pcHVsYXRpb248VD5cbiAgICAmIERPTVN0eWxlczxUPlxuICAgICYgRE9NRXZlbnRzPFQ+XG4gICAgJiBET01TY3JvbGw8VD5cbiAgICAmIERPTUVmZmVjdHM8VD47XG5cbi8qKlxuICogQGVuIHtAbGluayBET019IHBsdWdpbiBtZXRob2QgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjg5fjg6njgrDjgqTjg7Pjg6Hjgr3jg4Pjg4nlrprnvqlcbiAqXG4gKiBAbm90ZVxuICogIC0g44OX44Op44Kw44Kk44Oz5ouh5by15a6a576p44Gv44GT44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K544Oe44O844K444GZ44KLLlxuICogIC0gVHlwZVNjcmlwdCAzLjcg5pmC54K544GnLCBtb2R1bGUgaW50ZXJmYWNlIOOBruODnuODvOOCuOOBryBtb2R1bGUg44Gu5a6M5YWo44Gq44OR44K544KS5b+F6KaB44Go44GZ44KL44Gf44KBLFxuICogICAg5pys44Os44Od44K444OI44Oq44Gn44GvIGJ1bmRsZSDjgZfjgZ8gYGRpc3QvZG9tLmQudHNgIOOCkuaPkOS+m+OBmeOCiy5cbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzMzMzI2XG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81Nzg0ODEzNC90cm91YmxlLXVwZGF0aW5nLWFuLWludGVyZmFjZS11c2luZy1kZWNsYXJhdGlvbi1tZXJnaW5nXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NUGx1Z2luIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZVxuXG4vKipcbiAqIEBlbiBUaGlzIGludGVyZmFjZSBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m+OBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBET01GZWF0dXJlczxUPiwgRE9NUGx1Z2luIHsgfVxuXG5leHBvcnQgdHlwZSBET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gRWxlbWVudGlmeVNlZWQ8VD4gfCBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIERPTVJlc3VsdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPiA9IFQgZXh0ZW5kcyBET008RWxlbWVudEJhc2U+ID8gVCA6IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBET008VD4gOiBET008SFRNTEVsZW1lbnQ+KTtcbmV4cG9ydCB0eXBlIERPTUl0ZXJhdGVDYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IGJvb2xlYW4gfCB2b2lkO1xuXG4vKipcbiAqIEBlbiBUaGlzIGNsYXNzIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6bXG4gKlxuICogVU5TVVBQT1JURUQgTUVUSE9EIExJU1RcbiAqXG4gKiBbVHJhdmVyc2luZ11cbiAqICAuYWRkQmFjaygpXG4gKiAgLmVuZCgpXG4gKlxuICogW0VmZmVjdHNdXG4gKiAuc2hvdygpXG4gKiAuaGlkZSgpXG4gKiAudG9nZ2xlKClcbiAqIC5zdG9wKClcbiAqIC5jbGVhclF1ZXVlKClcbiAqIC5kZWxheSgpXG4gKiAuZGVxdWV1ZSgpXG4gKiAuZmFkZUluKClcbiAqIC5mYWRlT3V0KClcbiAqIC5mYWRlVG8oKVxuICogLmZhZGVUb2dnbGUoKVxuICogLnF1ZXVlKClcbiAqIC5zbGlkZURvd24oKVxuICogLnNsaWRlVG9nZ2xlKClcbiAqIC5zbGlkZVVwKClcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUNsYXNzIGV4dGVuZHMgbWl4aW5zKFxuICAgIERPTUJhc2UsXG4gICAgRE9NQXR0cmlidXRlcyxcbiAgICBET01UcmF2ZXJzaW5nLFxuICAgIERPTU1hbmlwdWxhdGlvbixcbiAgICBET01TdHlsZXMsXG4gICAgRE9NRXZlbnRzLFxuICAgIERPTVNjcm9sbCxcbiAgICBET01FZmZlY3RzLFxuKSB7XG4gICAgLyoqXG4gICAgICogcHJpdmF0ZSBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoZWxlbWVudHM6IEVsZW1lbnRCYXNlW10pIHtcbiAgICAgICAgc3VwZXIoZWxlbWVudHMpO1xuICAgICAgICAvLyBhbGwgc291cmNlIGNsYXNzZXMgaGF2ZSBubyBjb25zdHJ1Y3Rvci5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIHtAbGluayBET019IGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqIEByZXR1cm5zIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKHNlbGVjdG9yICYmICFjb250ZXh0KSB7XG4gICAgICAgICAgICBpZiAoaXNET01DbGFzcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRE9NQ2xhc3MoKGVsZW1lbnRpZnkoc2VsZWN0b3IgYXMgRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQpKSkgYXMgdW5rbm93biBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQ2xhc3MgYXMgdW5rbm93biBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIERPTX0uXG4gKiBAamEge0BsaW5rIERPTX0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNET01DbGFzcyh4OiB1bmtub3duKTogeCBpcyBET00ge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgRE9NQ2xhc3M7XG59XG4iLCJpbXBvcnQgeyBzZXR1cCB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUNsYXNzIH0gZnJvbSAnLi9jbGFzcyc7XG5cbi8vIGluaXQgZm9yIHN0YXRpY1xuc2V0dXAoRE9NQ2xhc3MucHJvdG90eXBlLCBET01DbGFzcy5jcmVhdGUpO1xuXG5leHBvcnQgKiBmcm9tICcuL2V4cG9ydHMnO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyBkZWZhdWx0IH0gZnJvbSAnLi9leHBvcnRzJztcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsImNsYXNzTmFtZSIsImlzTnVtYmVyIiwiZ2V0R2xvYmFsTmFtZXNwYWNlIiwiJCIsImlzQXJyYXkiLCJpc1N0cmluZyIsImFzc2lnblZhbHVlIiwidG9UeXBlZERhdGEiLCJjYW1lbGl6ZSIsImZyb21UeXBlZERhdGEiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSIsIm5vb3AiLCJkb20iLCJkYXNoZXJpemUiLCJjbGFzc2lmeSIsImNvbWJpbmF0aW9uIiwibWl4aW5zIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBOztJQUVHO0lBRUgsaUJBQXdCLE1BQU0sTUFBTSxHQUFrQkEsY0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7SUFDN0UsaUJBQXdCLE1BQU0sUUFBUSxHQUFnQkEsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7SUFDL0UsaUJBQXdCLE1BQU0sV0FBVyxHQUFhQSxjQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztJ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