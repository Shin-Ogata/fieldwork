/*!
 * @cdp/dom 0.9.21
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
        return !!(elem?.nodeName.toLowerCase() === name.toLowerCase());
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
        return el.ownerDocument?.defaultView ?? window;
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
        selector = selector ?? '';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsImRldGVjdGlvbi50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJhdHRyaWJ1dGVzLnRzIiwidHJhdmVyc2luZy50cyIsIm1hbmlwdWxhdGlvbi50cyIsInN0eWxlcy50cyIsImV2ZW50cy50cyIsInNjcm9sbC50cyIsImVmZmVjdHMudHMiLCJjbGFzcy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyAgICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZG9jdW1lbnQgICAgICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEN1c3RvbUV2ZW50ICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5DdXN0b21FdmVudCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBzYWZlKGdsb2JhbFRoaXMucmVxdWVzdEFuaW1hdGlvbkZyYW1lKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgTnVsbGlzaCxcbiAgICBpc051bWJlcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzTmFtZSxcbiAgICBnZXRHbG9iYWxOYW1lc3BhY2UsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuZXhwb3J0IHR5cGUgRWxlbWVudEJhc2UgPSBOb2RlIHwgV2luZG93O1xuZXhwb3J0IHR5cGUgRWxlbWVudFJlc3VsdDxUPiA9IFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFQgOiBIVE1MRWxlbWVudDtcbmV4cG9ydCB0eXBlIFNlbGVjdG9yQmFzZSA9IE5vZGUgfCBXaW5kb3cgfCBzdHJpbmcgfCBOdWxsaXNoO1xuZXhwb3J0IHR5cGUgRWxlbWVudGlmeVNlZWQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IEhUTUxFbGVtZW50PiA9IFQgfCAoVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVFtdIDogbmV2ZXIpIHwgTm9kZUxpc3RPZjxUIGV4dGVuZHMgTm9kZSA/IFQgOiBuZXZlcj47XG5leHBvcnQgdHlwZSBRdWVyeUNvbnRleHQgPSBQYXJlbnROb2RlICYgUGFydGlhbDxOb25FbGVtZW50UGFyZW50Tm9kZT47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1dpbmRvd0NvbnRleHQoeDogdW5rbm93bik6IHggaXMgV2luZG93IHtcbiAgICByZXR1cm4gKHggYXMgV2luZG93KT8ucGFyZW50IGluc3RhbmNlb2YgV2luZG93O1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gZWxlbWVudGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdIHtcbiAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnRleHQgPSBjb250ZXh0ID8/IGRvY3VtZW50O1xuICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcblxuICAgIHRyeSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHNlZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBzZWVkLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChodG1sLnN0YXJ0c1dpdGgoJzwnKSAmJiBodG1sLmVuZHNXaXRoKCc+JykpIHtcbiAgICAgICAgICAgICAgICAvLyBtYXJrdXBcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLnRlbXBsYXRlLmNvbnRlbnQuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IGh0bWw7XG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dC5nZXRFbGVtZW50QnlJZCkgJiYgKCcjJyA9PT0gc2VsZWN0b3JbMF0pICYmICEvWyAuPD46fl0vLmV4ZWMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHB1cmUgSUQgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWwgPSBjb250ZXh0LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9yLnN1YnN0cmluZygxKSk7XG4gICAgICAgICAgICAgICAgICAgIGVsICYmIGVsZW1lbnRzLnB1c2goZWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2JvZHknID09PSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBib2R5XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goZG9jdW1lbnQuYm9keSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gb3RoZXIgc2VsZWN0b3JzXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uY29udGV4dC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKChzZWVkIGFzIE5vZGUpLm5vZGVUeXBlIHx8IGlzV2luZG93Q29udGV4dChzZWVkKSkge1xuICAgICAgICAgICAgLy8gTm9kZS9lbGVtZW50LCBXaW5kb3dcbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goc2VlZCBhcyBOb2RlIGFzIEVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKDAgPCAoc2VlZCBhcyBUW10pLmxlbmd0aCAmJiAoKHNlZWQgYXMgYW55KVswXS5ub2RlVHlwZSB8fCBpc1dpbmRvd0NvbnRleHQoKHNlZWQgYXMgYW55KVswXSkpKSB7XG4gICAgICAgICAgICAvLyBhcnJheSBvZiBlbGVtZW50cyBvciBjb2xsZWN0aW9uIG9mIERPTVxuICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi4oc2VlZCBhcyBOb2RlW10gYXMgRWxlbWVudFtdKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgZWxlbWVudGlmeSgke2NsYXNzTmFtZShzZWVkKX0sICR7Y2xhc3NOYW1lKGNvbnRleHQpfSksIGZhaWxlZC4gW2Vycm9yOiR7ZX1dYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnRzIGFzIEVsZW1lbnRSZXN1bHQ8VD5bXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvb3RpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXSB7XG4gICAgY29uc3QgcGFyc2UgPSAoZWw6IEVsZW1lbnQsIHBvb2w6IFBhcmVudE5vZGVbXSk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCByb290ID0gKGVsIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkgPyBlbC5jb250ZW50IDogZWw7XG4gICAgICAgIHBvb2wucHVzaChyb290KTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVzID0gcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCd0ZW1wbGF0ZScpO1xuICAgICAgICBmb3IgKGNvbnN0IHQgb2YgdGVtcGxhdGVzKSB7XG4gICAgICAgICAgICBwYXJzZSh0LCBwb29sKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCByb290czogUGFyZW50Tm9kZVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGVsIG9mIGVsZW1lbnRpZnkoc2VlZCwgY29udGV4dCkpIHtcbiAgICAgICAgcGFyc2UoZWwgYXMgRWxlbWVudCwgcm9vdHMpO1xuICAgIH1cblxuICAgIHJldHVybiByb290cyBhcyBFbGVtZW50UmVzdWx0PFQ+W107XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAZW4gRW5zdXJlIHBvc2l0aXZlIG51bWJlciwgaWYgbm90IHJldHVybmVkIGB1bmRlZmluZWRgLlxuICogQGVuIOato+WApOOBruS/neiovC4g55Ww44Gq44KL5aC05ZCIIGB1bmRlZmluZWRgIOOCkui/lOWNtFxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlUG9zaXRpdmVOdW1iZXIodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBGb3IgZWFzaW5nIGBzd2luZ2AgdGltaW5nLWZ1bmN0aW9uLlxuICogQGphIGVhc2luZyBgc3dpbmdgIOeUqOOCv+OCpOODn+ODs+OCsOmWouaVsFxuICpcbiAqIEByZWZlcmVuY2VcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkyNDUwMzAvbG9va2luZy1mb3ItYS1zd2luZy1saWtlLWVhc2luZy1leHByZXNzaWJsZS1ib3RoLXdpdGgtanF1ZXJ5LWFuZC1jc3MzXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81MjA3MzAxL2pxdWVyeS1lYXNpbmctZnVuY3Rpb25zLXdpdGhvdXQtdXNpbmctYS1wbHVnaW5cbiAqXG4gKiBAcGFyYW0gcHJvZ3Jlc3MgWzAgLSAxXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpbmcocHJvZ3Jlc3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNSAtIChNYXRoLmNvcyhwcm9ncmVzcyAqIE1hdGguUEkpIC8gMik7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBET01TdGF0aWMudXRpbHMuZXZhbHVhdGUgfCBldmFsdWF0ZX0oKSBvcHRpb25zLlxuICogQGphIHtAbGluayBET01TdGF0aWMudXRpbHMuZXZhbHVhdGUgfCBldmFsdWF0ZX0oKSDjgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFdmFsT3B0aW9ucyB7XG4gICAgdHlwZT86IHN0cmluZztcbiAgICBzcmM/OiBzdHJpbmc7XG4gICAgbm9uY2U/OiBzdHJpbmc7XG4gICAgbm9Nb2R1bGU/OiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9zY3JpcHRzQXR0cnM6IChrZXlvZiBFdmFsT3B0aW9ucylbXSA9IFtcbiAgICAndHlwZScsXG4gICAgJ3NyYycsXG4gICAgJ25vbmNlJyxcbiAgICAnbm9Nb2R1bGUnLFxuXTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlKGNvZGU6IHN0cmluZywgb3B0aW9ucz86IEVsZW1lbnQgfCBFdmFsT3B0aW9ucywgY29udGV4dD86IERvY3VtZW50IHwgbnVsbCk6IGFueSB7XG4gICAgY29uc3QgZG9jOiBEb2N1bWVudCA9IGNvbnRleHQgPz8gZG9jdW1lbnQ7XG4gICAgY29uc3Qgc2NyaXB0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgIHNjcmlwdC50ZXh0ID0gYENEUF9ET01fRVZBTF9SRVRVUk5fVkFMVUVfQlJJREdFID0gKCgpID0+IHsgcmV0dXJuICR7Y29kZX07IH0pKCk7YDtcblxuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBfc2NyaXB0c0F0dHJzKSB7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSAob3B0aW9ucyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVthdHRyXSB8fCAob3B0aW9ucyBhcyBFbGVtZW50KT8uZ2V0QXR0cmlidXRlPy4oYXR0cik7XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIHRyeSB7XG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZSgnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnKTtcbiAgICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KS5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChzY3JpcHQpO1xuICAgICAgICBjb25zdCByZXR2YWwgPSAoZ2xvYmFsVGhpcyBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ0NEUF9ET01fRVZBTF9SRVRVUk5fVkFMVUVfQlJJREdFJ107XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZGVsZXRlIChnbG9iYWxUaGlzIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBkb2N1bWVudCwgQ3VzdG9tRXZlbnQgfSBmcm9tICcuL3Nzcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdEV2ZW50TWFwIHtcbiAgICAnY29ubmVjdGVkJzogRXZlbnQ7XG4gICAgJ2Rpc2Nvbm5lY3RlZCc6IEV2ZW50O1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgT2JzZXJ2ZXJDb250ZXh0IHtcbiAgICB0YXJnZXRzOiBTZXQ8Tm9kZT47XG4gICAgb2JzZXJ2ZXI6IE11dGF0aW9uT2JzZXJ2ZXI7XG59XG5cbmNvbnN0IF9vYnNlcnZlck1hcCA9IG5ldyBNYXA8Tm9kZSwgT2JzZXJ2ZXJDb250ZXh0PigpO1xuXG5jb25zdCBxdWVyeU9ic2VydmVkTm9kZSA9IChub2RlOiBOb2RlKTogTm9kZSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgZm9yIChjb25zdCBbb2JzZXJ2ZWROb2RlLCBjb250ZXh0XSBvZiBfb2JzZXJ2ZXJNYXApIHtcbiAgICAgICAgaWYgKGNvbnRleHQudGFyZ2V0cy5oYXMobm9kZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZlZE5vZGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbmNvbnN0IGRpc3BhdGNoVGFyZ2V0ID0gKG5vZGU6IE5vZGUsIGV2ZW50OiBFdmVudCwgbm9kZUluOiBXZWFrU2V0PE5vZGU+LCBub2RlT3V0OiBXZWFrU2V0PE5vZGU+KTogdm9pZCA9PiB7XG4gICAgaWYgKHF1ZXJ5T2JzZXJ2ZWROb2RlKG5vZGUpICYmICFub2RlSW4uaGFzKG5vZGUpKSB7XG4gICAgICAgIG5vZGVPdXQuZGVsZXRlKG5vZGUpO1xuICAgICAgICBub2RlSW4uYWRkKG5vZGUpO1xuICAgICAgICBub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGROb2Rlcykge1xuICAgICAgICBkaXNwYXRjaFRhcmdldChjaGlsZCwgZXZlbnQsIG5vZGVJbiwgbm9kZU91dCk7XG4gICAgfVxufTtcblxuY29uc3QgIGRpc3BhdGNoQWxsID0gKG5vZGVzOiBOb2RlTGlzdCwgdHlwZTogc3RyaW5nLCBub2RlSW46IFdlYWtTZXQ8Tm9kZT4sIG5vZGVPdXQ6IFdlYWtTZXQ8Tm9kZT4pOiB2b2lkID0+IHtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgTm9kZS5FTEVNRU5UX05PREUgPT09IG5vZGUubm9kZVR5cGUgJiYgZGlzcGF0Y2hUYXJnZXQoXG4gICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgbmV3IEN1c3RvbUV2ZW50KHR5cGUsIHsgYnViYmxlczogdHJ1ZSwgY2FuY2VsYWJsZTogdHJ1ZSB9KSxcbiAgICAgICAgICAgIG5vZGVJbixcbiAgICAgICAgICAgIG5vZGVPdXQsXG4gICAgICAgICk7XG4gICAgfVxufTtcblxuY29uc3Qgc3RhcnQgPSAob2JzZXJ2ZWROb2RlOiBOb2RlKTogT2JzZXJ2ZXJDb250ZXh0ID0+IHtcbiAgICBjb25zdCBjb25uZWN0ZWQgPSBuZXcgV2Vha1NldDxOb2RlPigpO1xuICAgIGNvbnN0IGRpc2Nvbm5lY3RlZCA9IG5ldyBXZWFrU2V0PE5vZGU+KCk7XG5cbiAgICBjb25zdCBjaGFuZ2VzID0gKHJlY29yZHM6IE11dGF0aW9uUmVjb3JkW10pOiB2b2lkID0+IHtcbiAgICAgICAgZm9yIChjb25zdCByZWNvcmQgb2YgcmVjb3Jkcykge1xuICAgICAgICAgICAgZGlzcGF0Y2hBbGwocmVjb3JkLnJlbW92ZWROb2RlcywgJ2Rpc2Nvbm5lY3RlZCcsIGRpc2Nvbm5lY3RlZCwgY29ubmVjdGVkKTtcbiAgICAgICAgICAgIGRpc3BhdGNoQWxsKHJlY29yZC5hZGRlZE5vZGVzLCAnY29ubmVjdGVkJywgY29ubmVjdGVkLCBkaXNjb25uZWN0ZWQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbnRleHQ6IE9ic2VydmVyQ29udGV4dCA9IHtcbiAgICAgICAgdGFyZ2V0czogbmV3IFNldCgpLFxuICAgICAgICBvYnNlcnZlcjogbmV3IE11dGF0aW9uT2JzZXJ2ZXIoY2hhbmdlcyksXG4gICAgfTtcbiAgICBfb2JzZXJ2ZXJNYXAuc2V0KG9ic2VydmVkTm9kZSwgY29udGV4dCk7XG4gICAgY29udGV4dC5vYnNlcnZlci5vYnNlcnZlKG9ic2VydmVkTm9kZSwgeyBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfSk7XG5cbiAgICByZXR1cm4gY29udGV4dDtcbn07XG5cbmNvbnN0IHN0b3BBbGwgPSAoKTogdm9pZCA9PiB7XG4gICAgZm9yIChjb25zdCBbLCBjb250ZXh0XSBvZiBfb2JzZXJ2ZXJNYXApIHtcbiAgICAgICAgY29udGV4dC50YXJnZXRzLmNsZWFyKCk7XG4gICAgICAgIGNvbnRleHQub2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgIH1cbiAgICBfb2JzZXJ2ZXJNYXAuY2xlYXIoKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBkZXRlY3RpZnkgPSA8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQsIG9ic2VydmVkPzogTm9kZSk6IFQgPT4ge1xuICAgIGNvbnN0IG9ic2VydmVkTm9kZSA9IG9ic2VydmVkID8/IChub2RlLm93bmVyRG9jdW1lbnQ/LmJvZHkgJiYgbm9kZS5vd25lckRvY3VtZW50KSA/PyBkb2N1bWVudDtcbiAgICBjb25zdCBjb250ZXh0ID0gX29ic2VydmVyTWFwLmdldChvYnNlcnZlZE5vZGUpID8/IHN0YXJ0KG9ic2VydmVkTm9kZSk7XG4gICAgY29udGV4dC50YXJnZXRzLmFkZChub2RlKTtcbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1bmRldGVjdGlmeSA9IDxUIGV4dGVuZHMgTm9kZT4obm9kZT86IFQpOiB2b2lkID0+IHtcbiAgICBpZiAobnVsbCA9PSBub2RlKSB7XG4gICAgICAgIHN0b3BBbGwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvYnNlcnZlZE5vZGUgPSBxdWVyeU9ic2VydmVkTm9kZShub2RlKTtcbiAgICAgICAgaWYgKG9ic2VydmVkTm9kZSkge1xuICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9vYnNlcnZlck1hcC5nZXQob2JzZXJ2ZWROb2RlKSE7XG4gICAgICAgICAgICBjb250ZXh0LnRhcmdldHMuZGVsZXRlKG5vZGUpO1xuICAgICAgICAgICAgaWYgKCFjb250ZXh0LnRhcmdldHMuc2l6ZSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHQub2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIF9vYnNlcnZlck1hcC5kZWxldGUob2JzZXJ2ZWROb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJpbXBvcnQgdHlwZSB7IFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBFbGVtZW50aWZ5U2VlZCxcbiAgICB0eXBlIEVsZW1lbnRSZXN1bHQsXG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBpc1dpbmRvd0NvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbiAgICByb290aWZ5LFxuICAgIGV2YWx1YXRlLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGRldGVjdGlmeSwgdW5kZXRlY3RpZnkgfSBmcm9tICcuL2RldGVjdGlvbic7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NQ2xhc3MsXG4gICAgRE9NLFxuICAgIERPTVBsdWdpbixcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxufSBmcm9tICcuL2NsYXNzJztcblxuLyoqXG4gKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBlcXVpdmFsZW50IHRvIGBqUXVlcnlgIERPTSBtYW5pcHVsYXRpb24uXG4gKiBAamEgYGpRdWVyeWAg44GuIERPTSDmk43kvZzjgajlkIznrYnjga7mqZ/og73jgpLmj5DkvptcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBHZXQgdGhlIDxidXR0b24+IGVsZW1lbnQgd2l0aCB0aGUgY2xhc3MgJ2NvbnRpbnVlJyBhbmQgY2hhbmdlIGl0cyBIVE1MIHRvICdOZXh0IFN0ZXAuLi4nXG4gKiAkKCdidXR0b24uY29udGludWUnKS5odG1sKCdOZXh0IFN0ZXAuLi4nKTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVN0YXRpYyB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgZXF1aXZhbGVudCB0byBgalF1ZXJ5YCBET00gbWFuaXB1bGF0aW9uLiA8YnI+XG4gICAgICogICAgIENyZWF0ZSB7QGxpbmsgRE9NfSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICAgICAqIEBqYSBgalF1ZXJ5YCDjga4gRE9NIOaTjeS9nOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+myA8YnI+XG4gICAgICogICAgIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBkb20gYXMgJCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICpcbiAgICAgKiAvLyBHZXQgdGhlIDxidXR0b24+IGVsZW1lbnQgd2l0aCB0aGUgY2xhc3MgJ2NvbnRpbnVlJyBhbmQgY2hhbmdlIGl0cyBIVE1MIHRvICdOZXh0IFN0ZXAuLi4nXG4gICAgICogJCgnYnV0dG9uLmNvbnRpbnVlJykuaHRtbCgnTmV4dCBTdGVwLi4uJyk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqIEByZXR1cm5zIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqL1xuICAgIDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgb2JqZWN0J3MgYHByb3RvdHlwZWAgYWxpYXMuXG4gICAgICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBriBgcHJvdG90eXBlYOOCqOOCpOODquOCouOCuVxuICAgICAqL1xuICAgIGZuOiBET01DbGFzcyAmIFJlY29yZDxzdHJpbmcgfCBzeW1ib2wsIHVua25vd24+O1xuXG4gICAgLyoqIERPTSBVdGlsaXRpZXMgKi9cbiAgICByZWFkb25seSB1dGlsczoge1xuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIFdpbmRvdy5cbiAgICAgICAgICogQGphIFdpbmRvdyDlnovjgafjgYLjgovjgYvliKTlrppcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHhcbiAgICAgICAgICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAgICAgICAgICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAgICAgICAgICovXG4gICAgICAgIGlzV2luZG93Q29udGV4dCh4OiB1bmtub3duKTogeCBpcyBXaW5kb3c7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBDcmVhdGUgRWxlbWVudCBhcnJheSBmcm9tIHNlZWQgYXJnLlxuICAgICAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIFNlZWQg44GL44KJIEVsZW1lbnQg6YWN5YiX44KS5L2c5oiQXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRWxlbWVudCBhcnJheS5cbiAgICAgICAgICogIC0gYGphYCBFbGVtZW50IOmFjeWIl+OBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgICAgICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUgb3IgV2luZG93IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgIGVsZW1lbnRpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIENyZWF0ZSBFbGVtZW50IGFycmF5IGZyb20gc2VlZCBhcmcuIDxicj5cbiAgICAgICAgICogICAgIEFuZCBhbHNvIGxpc3RzIGZvciB0aGUgYERvY3VtZW50RnJhZ21lbnRgIGluc2lkZSB0aGUgYDx0ZW1wbGF0ZT5gIHRhZy5cbiAgICAgICAgICogQGphIOaMh+WumuOBleOCjOOBnyBTZWVkIOOBi+OCiSBFbGVtZW50IOmFjeWIl+OCkuS9nOaIkCA8YnI+XG4gICAgICAgICAqICAgICBgPHRlbXBsYXRlPmAg44K/44Kw5YaF44GuIGBEb2N1bWVudEZyYWdtZW50YCDjgoLliJfmjJnjgZnjgotcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHNlZWRcbiAgICAgICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBFbGVtZW50IGFycmF5LlxuICAgICAgICAgKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAgICAgKiBAcmV0dXJucyBFbGVtZW50W10gYmFzZWQgTm9kZS5cbiAgICAgICAgICovXG4gICAgICAgIHJvb3RpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFRoZSBgZXZhbGAgZnVuY3Rpb24gYnkgd2hpY2ggc2NyaXB0IGBub25jZWAgYXR0cmlidXRlIGNvbnNpZGVyZWQgdW5kZXIgdGhlIENTUCBjb25kaXRpb24uXG4gICAgICAgICAqIEBqYSBDU1Ag55Kw5aKD44Gr44GK44GE44Gm44K544Kv44Oq44OX44OIIGBub25jZWAg5bGe5oCn44KS6ICD5oWu44GX44GfIGBldmFsYCDlrp/ooYzplqLmlbBcbiAgICAgICAgICovXG4gICAgICAgIGV2YWx1YXRlKGNvZGU6IHN0cmluZywgb3B0aW9ucz86IEVsZW1lbnQgfCBFdmFsT3B0aW9ucywgY29udGV4dD86IERvY3VtZW50IHwgbnVsbCk6IGFueTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBFbmFibGluZyB0aGUgbm9kZSB0byBkZXRlY3QgZXZlbnRzIG9mIERPTSBjb25uZWN0ZWQgYW5kIGRpc2Nvbm5lY3RlZC5cbiAgICAgICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgRE9NIOOBuOOBruaOpee2miwgRE9NIOOBi+OCieOBruWIh+aWreOCpOODmeODs+ODiOOCkuaknOWHuuWPr+iDveOBq+OBmeOCi1xuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICAgICAqXG4gICAgICAgICAqIGBgYHRzXG4gICAgICAgICAqIGltcG9ydCB7IGRvbSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICAgICAqIGNvbnN0IHsgZGV0ZWN0aWZ5LCB1bmRldGVjdGlmeSB9ID0gZG9tLnV0aWxzO1xuICAgICAgICAgKlxuICAgICAgICAgKiBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgKlxuICAgICAgICAgKiAvLyBvYnNlcnZhdGlvbiBzdGFydFxuICAgICAgICAgKiBkZXRlY3RpZnkoZWwpO1xuICAgICAgICAgKiBlbC5hZGRFdmVudExpc3RlbmVyKCdjb25uZWN0ZWQnLCAoKSA9PiB7XG4gICAgICAgICAqICAgICBjb25zb2xlLmxvZygnb24gY29ubmVjdGVkJyk7XG4gICAgICAgICAqIH0pO1xuICAgICAgICAgKiBlbC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCAoKSA9PiB7XG4gICAgICAgICAqICAgICBjb25zb2xlLmxvZygnb24gZGlzY29ubmVjdGVkJyk7XG4gICAgICAgICAqIH0pO1xuICAgICAgICAgKlxuICAgICAgICAgKiAvLyBvYnNlcnZhdGlvbiBzdG9wXG4gICAgICAgICAqIHVuZGV0ZWN0aWZ5KGVsKTtcbiAgICAgICAgICogYGBgXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBub2RlXG4gICAgICAgICAqICAtIGBlbmAgdGFyZ2V0IG5vZGVcbiAgICAgICAgICogIC0gYGphYCDlr77osaHjga7opoHntKBcbiAgICAgICAgICogQHBhcmFtIG9ic2VydmVkXG4gICAgICAgICAqICAtIGBlbmAgU3BlY2lmaWVzIHRoZSByb290IGVsZW1lbnQgdG8gd2F0Y2guIElmIG5vdCBzcGVjaWZpZWQsIGBvd25lckRvY3VtZW50YCBpcyBldmFsdWF0ZWQgZmlyc3QsIGZvbGxvd2VkIGJ5IGdsb2JhbCBgZG9jdW1lbnRgLlxuICAgICAgICAgKiAgLSBgamFgIOebo+imluWvvuixoeOBruODq+ODvOODiOimgee0oOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44GvIGBvd25lckRvY3VtZW50YCwg44Kw44Ot44O844OQ44OrIGBkb2N1bWVudGAg44Gu6aCG44Gr6KmV5L6h44GV44KM44KLXG4gICAgICAgICAqL1xuICAgICAgICBkZXRlY3RpZnk8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQsIG9ic2VydmVkPzogTm9kZSk6IFQ7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBlbiBVbmRldGVjdCBjb25uZWN0ZWQgYW5kIGRpc2Nvbm5lY3RlZCBmcm9tIERPTSBldmVudHMgZm9yIGFuIGVsZW1lbnQuXG4gICAgICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIERPTSDjgbjjga7mjqXntposIERPTSDjgYvjgonjga7liIfmlq3jgqTjg5njg7Pjg4jjgpLmpJzlh7rjgpLop6PpmaTjgZnjgotcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5vZGVcbiAgICAgICAgICogIC0gYGVuYCB0YXJnZXQgbm9kZS4gSWYgbm90IHNwZWNpZmllZCwgZXhlY3V0ZSBhbGwgcmVsZWFzZS5cbiAgICAgICAgICogIC0gYGphYCDlr77osaHjga7opoHntKAuIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+WFqOino+mZpOOCkuWun+ihjFxuICAgICAgICAgKi9cbiAgICAgICAgdW5kZXRlY3RpZnk8VCBleHRlbmRzIE5vZGU+KG5vZGU/OiBUKTogdm9pZDtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBET01GYWN0b3J5ID0gPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKSA9PiBET01SZXN1bHQ8VD47XG5cbmxldCBfZmFjdG9yeSE6IERPTUZhY3Rvcnk7XG5cbmNvbnN0IGRvbSA9ICg8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBET01SZXN1bHQ8VD4gPT4ge1xuICAgIHJldHVybiBfZmFjdG9yeShzZWxlY3RvciwgY29udGV4dCk7XG59KSBhcyBET01TdGF0aWM7XG5cbihkb20gYXMgV3JpdGFibGU8RE9NU3RhdGljPikudXRpbHMgPSB7XG4gICAgaXNXaW5kb3dDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG4gICAgcm9vdGlmeSxcbiAgICBldmFsdWF0ZSxcbiAgICBkZXRlY3RpZnksXG4gICAgdW5kZXRlY3RpZnksXG59O1xuXG4vKiogQGludGVybmFsIOW+queSsOWPgueFp+WbnumBv+OBruOBn+OCgeOBrumBheW7tuOCs+ODs+OCueODiOODqeOCr+OCt+ODp+ODs+ODoeOCveODg+ODiSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKGZuOiBET01DbGFzcywgZmFjdG9yeTogRE9NRmFjdG9yeSk6IHZvaWQge1xuICAgIF9mYWN0b3J5ID0gZmFjdG9yeTtcbiAgICAoZG9tLmZuIGFzIERPTUNsYXNzKSA9IGZuO1xufVxuXG5leHBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgRE9NLFxuICAgIERPTVBsdWdpbixcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSxcbn07XG4iLCJpbXBvcnQgdHlwZSB7IE51bGxpc2gsIFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGlzV2luZG93Q29udGV4dCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEVsZW1lbnRCYXNlLFxuICAgIHR5cGUgU2VsZWN0b3JCYXNlLFxuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY3JlYXRlSXRlcmFibGVJdGVyYXRvciA9IFN5bWJvbCgnY3JlYXRlLWl0ZXJhYmxlLWl0ZXJhdG9yJyk7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3Rpb24gY2xhc3Mgb2Yge0BsaW5rIERPTUNsYXNzfS4gVGhpcyBjbGFzcyBwcm92aWRlcyBpdGVyYXRvciBtZXRob2RzLlxuICogQGphIHtAbGluayBET01DbGFzc30g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBUW10pIHtcbiAgICAgICAgY29uc3Qgc2VsZjogV3JpdGFibGU8RE9NQWNjZXNzPFQ+PiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYCBhbmQgY29ubmVjdGVkIHRvYCBEb2N1bWVudGAgb3IgYFNoYWRvd1Jvb3RgLlxuICAgICAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCiuOBi+OBpCBgRG9jdW1lbnRgIOOBvuOBn+OBryBgU2hhZG93Um9vdGAg44Gr5o6l57aa44GV44KM44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgZ2V0IGlzQ29ubmVjdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2Yge0BsaW5rIEVsZW1lbnRCYXNlfSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosge0BsaW5rIEVsZW1lbnRCYXNlfSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFQ+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZSh7QGxpbmsgRWxlbWVudEJhc2V9KSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpLCB2YWx1ZSh7QGxpbmsgRWxlbWVudEJhc2V9KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpbmRleCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlcikgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gdmFsdWUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGl0ZXJhdG9yIGNyZWF0ZSBmdW5jdGlvbiAqL1xuICAgIHByaXZhdGUgW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXTxSPih2YWx1ZUdlbmVyYXRvcjogKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4gPSB7XG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFI+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY29udGV4dC5wb2ludGVyO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgY29udGV4dC5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBvaW50ZXIrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlR2VuZXJhdG9yKGN1cnJlbnQsIGNvbnRleHQuYmFzZVtjdXJyZW50XSksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LW9iamVjdC10eXBlXG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYE5vZGVgLlxuICogQGphIOWvvuixoeOBjCBgTm9kZWAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZShlbDogdW5rbm93bik6IGVsIGlzIE5vZGUge1xuICAgIHJldHVybiAhIShlbCAmJiAoZWwgYXMgTm9kZSkubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkVMRU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBIVE1MRWxlbWVudGAg44G+44Gf44GvIGBTVkdFbGVtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAge0BsaW5rIEVsZW1lbnRCYXNlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRWxlbWVudEJhc2V9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgSFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YCBvciBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44G+44Gf44GvIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVF1ZXJpYWJsZShlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgRWxlbWVudCB8IERvY3VtZW50IHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkucXVlcnlTZWxlY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRG9jdW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVEb2N1bWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogZWwgaXMgRG9jdW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkRPQ1VNRU5UX05PREUgPT09IGVsLm5vZGVUeXBlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHtAbGluayBET019IHRhcmdldCBpcyBgRWxlbWVudGAuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUVsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RWxlbWVudD4ge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGRvbVswXSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHtAbGluayBET019IHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAge0BsaW5rIERPTUl0ZXJhYmxlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRE9NSXRlcmFibGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlSFRNTE9yU1ZHRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgYwgYERvY3VtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZURvY3VtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPERvY3VtZW50PiB7XG4gICAgcmV0dXJuIGRvbVswXSBpbnN0YW5jZW9mIERvY3VtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYFdpbmRvd2AuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBXaW5kb3dgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAge0BsaW5rIERPTUl0ZXJhYmxlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRE9NSXRlcmFibGV9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlV2luZG93KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPFdpbmRvdz4ge1xuICAgIHJldHVybiBpc1dpbmRvd0NvbnRleHQoZG9tWzBdKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE51bGxpc2guXG4gKiBAamEgTnVsbGlzaCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE51bGxpc2g+IHtcbiAgICByZXR1cm4gIXNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIHN0cmluZz4ge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOb2RlLlxuICogQGphIE5vZGUg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGU+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgTm9kZSkubm9kZVR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIEVsZW1lbnQuXG4gKiBAamEgRWxlbWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbGVtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRWxlbWVudD4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIEVsZW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIERvY3VtZW50LlxuICogQGphIERvY3VtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RvY3VtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBEb2N1bWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgV2luZG93LlxuICogQGphIFdpbmRvdyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBXaW5kb3c+IHtcbiAgICByZXR1cm4gaXNXaW5kb3dDb250ZXh0KHNlbGVjdG9yKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIGlzIGFibGUgdG8gaXRlcmF0ZS5cbiAqIEBqYSDotbDmn7vlj6/og73jgarjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGVMaXN0T2Y8Tm9kZT4+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgVFtdKS5sZW5ndGg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIHtAbGluayBET019LlxuICogQGphIHtAbGluayBET019IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERPTT4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayBub2RlIG5hbWUgaXMgYXJndW1lbnQuXG4gKiBAamEgTm9kZSDlkI3jgYzlvJXmlbDjgafkuI7jgYjjgZ/lkI3liY3jgajkuIDoh7TjgZnjgovjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vZGVOYW1lKGVsZW06IE5vZGUgfCBudWxsLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISEoZWxlbT8ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmFtZS50b0xvd2VyQ2FzZSgpKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IG5vZGUgb2Zmc2V0IHBhcmVudC4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNldCBwYXJlbnQg44Gu5Y+W5b6XLiBTVkdFbGVtZW50IOOBq+OCgumBqeeUqOWPr+iDvVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KG5vZGU6IE5vZGUpOiBFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKChub2RlIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRQYXJlbnQpIHtcbiAgICAgICAgcmV0dXJuIChub2RlIGFzIEhUTUxFbGVtZW50KS5vZmZzZXRQYXJlbnQ7XG4gICAgfSBlbHNlIGlmIChub2RlTmFtZShub2RlLCAnc3ZnJykpIHtcbiAgICAgICAgY29uc3QgJHN2ZyA9ICQobm9kZSk7XG4gICAgICAgIGNvbnN0IGNzc1Byb3BzID0gJHN2Zy5jc3MoWydkaXNwbGF5JywgJ3Bvc2l0aW9uJ10pO1xuICAgICAgICBpZiAoJ25vbmUnID09PSBjc3NQcm9wcy5kaXNwbGF5IHx8ICdmaXhlZCcgPT09IGNzc1Byb3BzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnQgPSAkc3ZnWzBdLnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkaXNwbGF5LCBwb3NpdGlvbiB9ID0gJChwYXJlbnQpLmNzcyhbJ2Rpc3BsYXknLCAncG9zaXRpb24nXSk7XG4gICAgICAgICAgICAgICAgaWYgKCdub25lJyA9PT0gZGlzcGxheSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFwb3NpdGlvbiB8fCAnc3RhdGljJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bk9iamVjdCxcbiAgICB0eXBlIFBsYWluT2JqZWN0LFxuICAgIHR5cGUgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIHR5cGUgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBjYW1lbGl6ZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NVmFsdWVUeXBlPFQsIEsgPSAndmFsdWUnPiA9IFQgZXh0ZW5kcyBIVE1MU2VsZWN0RWxlbWVudCA/IChzdHJpbmcgfCBzdHJpbmdbXSkgOiBLIGV4dGVuZHMga2V5b2YgVCA/IFRbS10gOiBzdHJpbmc7XG5leHBvcnQgdHlwZSBET01EYXRhID0gUGxhaW5PYmplY3Q8VHlwZWREYXRhPjtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTFNlbGVjdEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAnc2VsZWN0JyA9PT0gZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAmJiAoZWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLm11bHRpcGxlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc0lucHV0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MSW5wdXRFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhdHRyaWJ1dGVzIG1ldGhvZHMuXG4gKiBAamEg5bGe5oCn5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01BdHRyaWJ1dGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENsYXNzZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGFkZENsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGFueSBvZiB0aGUgbWF0Y2hlZCBlbGVtZW50cyBhcmUgYXNzaWduZWQgdGhlIGdpdmVuIGNsYXNzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLlsJHjgarjgY/jgajjgoLopoHntKDjgYzmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWVcbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDbGFzcyhjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSAmJiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG9yIHJlbW92ZSBvbmUgb3IgbW9yZSBjbGFzc2VzIGZyb20gZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICBkZXBlbmRpbmcgb24gZWl0aGVyIHRoZSBjbGFzcydzIHByZXNlbmNlIG9yIHRoZSB2YWx1ZSBvZiB0aGUgc3RhdGUgYXJndW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBrueKtuaFi+OBq+W/nOOBmOOBpiwg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS6KaB57Sg44Gr6L+95YqgL+WJiumZpOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBmb3JjZVxuICAgICAqICAtIGBlbmAgaWYgdGhpcyBhcmd1bWVudCBleGlzdHMsIHRydWU6IHRoZSBjbGFzc2VzIHNob3VsZCBiZSBhZGRlZCAvIGZhbHNlOiByZW1vdmVkLlxuICAgICAqICAtIGBqYWAg5byV5pWw44GM5a2Y5Zyo44GZ44KL5aC05ZCILCB0cnVlOiDjgq/jg6njgrnjgpLov73liqAgLyBmYWxzZTog44Kv44Op44K544KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHRvZ2dsZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGZvcmNlPzogYm9vbGVhbik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNsYXNzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LnRvZ2dsZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwcm9wZXJ0eSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBUKTogVEVsZW1lbnRbVF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgdmFsdWVcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+ODl+ODreODkeODhuOCo+WApFxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBULCB2YWx1ZTogVEVsZW1lbnRbVF0pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBwcm9wZXJ0eSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIHByb3BlcnR5LXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihrZXk6IFQgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBURWxlbWVudFtUXSk6IFRFbGVtZW50W1RdIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHByb3BlcnR5XG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXNbMF0gYXMgVEVsZW1lbnQgJiBSZWNvcmQ8c3RyaW5nLCBURWxlbWVudFtUXT47XG4gICAgICAgICAgICByZXR1cm4gZmlyc3QgJiYgZmlyc3Rba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlXG4gICAgICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKGVsIGFzIHVua25vd24gYXMgVW5rbm93bk9iamVjdCwga2V5IGFzIHN0cmluZywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSBpbiBlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKGVsIGFzIHVua25vd24gYXMgVW5rbm93bk9iamVjdCwgbmFtZSwgKGtleSBhcyBSZWNvcmQ8c3RyaW5nLCBURWxlbWVudFtUXT4pW25hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBBdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGF0dHJpYnV0ZSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIGF0dHJpYnV0ZSB2YWx1ZSBmb3Igb25seSB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogQGphIOWxnuaAp+WApOOBruWPluW+lyA8YnI+XG4gICAgICogICAgIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgbmFtZVxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzaW5nbGUgYXR0cmlidXRlIHZhbHVlIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuWNmOS4gOWxnuaAp+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgbmFtZVxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIHZhbHVlLiBpZiBgbnVsbGAgc2V0LCByZW1vdmUgYXR0cmlidXRlLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5bGe5oCn5YCkLiBgbnVsbGAg44GM5oyH5a6a44GV44KM44Gf5aC05ZCI5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIGF0dHIobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBhdHRyaWJ1dGUgdmFsdWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuikh+aVsOWxnuaAp+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBhdHRyaWJ1dGUtdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgYXR0cmlidXRlLXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBhdHRyKGtleTogc3RyaW5nIHwgUGxhaW5PYmplY3QsIHZhbHVlPzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwpOiBzdHJpbmcgfCB1bmRlZmluZWQgfCB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZCA9PT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9IGVsc2UgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgYXR0cmlidXRlXG4gICAgICAgICAgICBjb25zdCBhdHRyID0gdGhpc1swXS5nZXRBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgICAgIHJldHVybiBhdHRyID8/IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlQXR0cihrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5IGFzIHN0cmluZywgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtdWx0aXBsZVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSAoa2V5IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgU3RyaW5nKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgYXR0cmlidXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/lsZ7mgKfjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGUgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgb7jgZ/jga/lsZ7mgKflkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlQXR0cihuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF0dHJzID0gaXNBcnJheShuYW1lKSA/IG5hbWUgOiBbbmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBWYWx1ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSB2YWx1ZSDlgKTjga7lj5blvpcuIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4oKTogRE9NVmFsdWVUeXBlPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgdmFsdWUgb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgaYgdmFsdWUg5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU6IERPTVZhbHVlVHlwZTxUPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZT86IERPTVZhbHVlVHlwZTxUPik6IGFueSB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLnNlbGVjdGVkT3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMucHVzaChvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgndmFsdWUnIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbCBhcyBhbnkpLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBubyBzdXBwb3J0IHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSB2YWx1ZS5pbmNsdWRlcyhvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0lucHV0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IERhdGFcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlcyBhbGwgYERPTVN0cmluZ01hcGAgc3RvcmUgc2V0IGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga4gSFRNTDUgZGF0YS0qIOWxnuaAp+OBpyBgRE9NU3RyaW5nTWFwYCDjgavmoLzntI3jgZXjgozjgZ/lhajjg4fjg7zjgr/lgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YSgpOiBET01EYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWUgYXQgdGhlIG5hbWVkIGRhdGEgc3RvcmUgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBjb2xsZWN0aW9uLCBhcyBzZXQgYnkgZGF0YShrZXksIHZhbHVlKSBvciBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga4ga2V5IOOBp+aMh+WumuOBl+OBnyBIVE1MNSBkYXRhLSog5bGe5oCn5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZyk6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdG9yZSBhcmJpdHJhcnkgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuS7u+aEj+OBruODh+ODvOOCv+OCkuagvOe0jVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBkYXRhIHZhbHVlIChub3Qgb25seSBgc3RyaW5nYClcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WApOOCkuaMh+WumiAo5paH5a2X5YiX5Lul5aSW44KC5Y+X5LuY5Y+vKVxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nLCB2YWx1ZTogVHlwZWREYXRhKTogdGhpcztcblxuICAgIHB1YmxpYyBkYXRhKGtleT86IHN0cmluZywgdmFsdWU/OiBUeXBlZERhdGEpOiBET01EYXRhIHwgVHlwZWREYXRhIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIHN1cHBvcnRlZCBkYXRhc2V0IGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBkYXRhc2V0XG4gICAgICAgICAgICBjb25zdCBkYXRhc2V0ID0gdGhpc1swXS5kYXRhc2V0O1xuICAgICAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGFsbCBkYXRhXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YTogRE9NRGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhkYXRhc2V0KSkge1xuICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShkYXRhLCBwcm9wLCB0b1R5cGVkRGF0YShkYXRhc2V0W3Byb3BdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0eXBlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB0b1R5cGVkRGF0YShkYXRhc2V0W2NhbWVsaXplKGtleSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcHJvcCA9IGNhbWVsaXplKGtleSA/PyAnJyk7XG4gICAgICAgICAgICBpZiAocHJvcCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKGVsLmRhdGFzZXQgYXMgdW5rbm93biBhcyBVbmtub3duT2JqZWN0LCBwcm9wLCBmcm9tVHlwZWREYXRhKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGRhdGEuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+ODh+ODvOOCv+OCkuODh+ODvOOCv+mgmOWfn+OBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZURhdGEoa2V5OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShrZXkpID8ga2V5Lm1hcChrID0+IGNhbWVsaXplKGspKSA6IFtjYW1lbGl6ZShrZXkpXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRhdGFzZXQgfSA9IGVsO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YXNldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01BdHRyaWJ1dGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBpc1dpbmRvd0NvbnRleHQgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBFbGVtZW50QmFzZSxcbiAgICB0eXBlIFNlbGVjdG9yQmFzZSxcbiAgICB0eXBlIFF1ZXJ5Q29udGV4dCxcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NUmVzdWx0LFxuICAgIHR5cGUgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NSXRlcmFibGUsXG4gICAgRE9NQmFzZSxcbiAgICBpc05vZGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVRdWVyaWFibGUsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG4gICAgaXNFbXB0eVNlbGVjdG9yLFxuICAgIGlzU3RyaW5nU2VsZWN0b3IsXG4gICAgaXNEb2N1bWVudFNlbGVjdG9yLFxuICAgIGlzV2luZG93U2VsZWN0b3IsXG4gICAgaXNOb2RlU2VsZWN0b3IsXG4gICAgaXNJdGVyYWJsZVNlbGVjdG9yLFxuICAgIG5vZGVOYW1lLFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VCBleHRlbmRzIEVsZW1lbnRCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IFU7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgaXMoKWAgYW5kIGBmaWx0ZXIoKWAgKi9cbmZ1bmN0aW9uIHdpbm5vdzxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxVPixcbiAgICBkb206IERPTVRyYXZlcnNpbmc8VT4sXG4gICAgdmFsaWRDYWxsYmFjazogKGVsOiBVKSA9PiB1bmtub3duLFxuICAgIGludmFsaWRDYWxsYmFjaz86ICgpID0+IHVua25vd24sXG4pOiBhbnkge1xuICAgIGludmFsaWRDYWxsYmFjayA9IGludmFsaWRDYWxsYmFjayA/PyBub29wO1xuXG4gICAgbGV0IHJldHZhbDogdW5rbm93bjtcbiAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIGRvbS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IuY2FsbChlbCwgaW5kZXgsIGVsKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZ1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXM/LihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChpc1dpbmRvd0NvbnRleHQoZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50ID09PSBlbCBhcyBOb2RlIGFzIERvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAsIGBwYXJlbnRzKClgIGFuZCBgc2libGluZ3MoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNoaWxkcmVuKClgLCBgcGFyZW50KClgLCBgbmV4dCgpYCBhbmQgYHByZXYoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUmV0cmlldmVOb2RlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5vZGU6IE5vZGUgfCBudWxsLCBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQpOiBub2RlIGlzIE5vZGUge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKCQobm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgbmV4dFVudGlsKClgIGFuZCBgcHJldlVudGlsKCkgKi9cbmZ1bmN0aW9uIHJldHJpZXZlU2libGluZ3M8XG4gICAgRSBleHRlbmRzIEVsZW1lbnRCYXNlLFxuICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4+KFxuICAgIHNpYmxpbmc6ICdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJyB8ICduZXh0RWxlbWVudFNpYmxpbmcnLFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxFPixcbiAgICBzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPlxuKTogRE9NPFQ+IHtcbiAgICBpZiAoIWlzVHlwZUVsZW1lbnQoZG9tKSkge1xuICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZG9tIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgIGxldCBlbGVtID0gZWxbc2libGluZ107XG4gICAgICAgIHdoaWxlIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtID0gZWxlbVtzaWJsaW5nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSB0cmF2ZXJzaW5nIG1ldGhvZHMuXG4gKiBAamEg44OI44Op44OQ44O844K544Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01UcmF2ZXJzaW5nPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVsZW1lbnQgTWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIG9uZSBvZiB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpumFjeS4i+OBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBURWxlbWVudCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoKTogVEVsZW1lbnRbXTtcblxuICAgIHB1YmxpYyBnZXQoaW5kZXg/OiBudW1iZXIpOiBURWxlbWVudFtdIHwgVEVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCAhPSBpbmRleCkge1xuICAgICAgICAgICAgaW5kZXggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCA8IDAgPyB0aGlzW2luZGV4ICsgdGhpcy5sZW5ndGhdIDogdGhpc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0FycmF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgYWxsIHRoZSBlbGVtZW50cyBjb250YWluZWQgaW4gdGhlIHtAbGluayBET019IHNldCwgYXMgYW4gYXJyYXkuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyB0b0FycmF5KCk6IFRFbGVtZW50W10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXNdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBlbGVtZW50IHdpdGhpbiB0aGUge0BsaW5rIERPTX0gY29sbGVjdGlvbiByZWxhdGl2ZSB0byBpdHMgc2libGluZyBlbGVtZW50cy5cbiAgICAgKiBAamEge0BsaW5rIERPTX0g5YaF44Gu5pyA5Yid44Gu6KaB57Sg44GM5YWE5byf6KaB57Sg44Gu5L2V55Wq55uu44Gr5omA5bGe44GZ44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWFyY2ggZm9yIGEgZ2l2ZW4gYSBzZWxlY3RvciwgZWxlbWVudCwgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UgZnJvbSBhbW9uZyB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOmFjeS4i+OBruS9leeVquebruOBq+aJgOWxnuOBl+OBpuOBhOOCi+OBi+OCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yOiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgcHVibGljIGluZGV4PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oc2VsZWN0b3I/OiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgIGxldCBjaGlsZDogTm9kZSB8IG51bGwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgd2hpbGUgKG51bGwgIT09IChjaGlsZCA9IGNoaWxkLnByZXZpb3VzU2libGluZykpIHtcbiAgICAgICAgICAgICAgICBpZiAoTm9kZS5FTEVNRU5UX05PREUgPT09IGNoaWxkLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlbGVtOiBUIHwgRWxlbWVudDtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gJChzZWxlY3RvcilbMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW0gPSBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2UgPyBzZWxlY3RvclswXSA6IHNlbGVjdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaSA9IFsuLi50aGlzXS5pbmRleE9mKGVsZW0gYXMgVEVsZW1lbnQgJiBFbGVtZW50KTtcbiAgICAgICAgICAgIHJldHVybiAwIDw9IGkgPyBpIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBUcmF2ZXJzaW5nXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmlyc3QgaW4gdGhlIHNldCBhcyB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyA5Yid44Gu6KaB57Sg44KSIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOBq+OBl+OBpuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1swXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmluYWwgb25lIGluIHRoZSBzZXQgYXMge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+acq+WwvuOBruimgee0oOOCkiB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1t0aGlzLmxlbmd0aCAtIDFdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcge0BsaW5rIERPTX0gaW5zdGFuY2Ugd2l0aCBlbGVtZW50cyBhZGRlZCB0byB0aGUgc2V0IGZyb20gc2VsZWN0b3IuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIOOBp+WPluW+l+OBl+OBnyBgRWxlbWVudGAg44KS6L+95Yqg44GX44Gf5paw6KaPIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCAkYWRkID0gJChzZWxlY3RvciwgY29udGV4dCk7XG4gICAgICAgIGNvbnN0IGVsZW1zID0gbmV3IFNldChbLi4udGhpcywgLi4uJGFkZF0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbXNdIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IG9mIGVsZW1lbnRzIGFnYWluc3QgYSBzZWxlY3RvciwgZWxlbWVudCwgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGB0cnVlYCBpZiBhdCBsZWFzdCBvbmUgb2YgdGhlc2UgZWxlbWVudHMgbWF0Y2hlcyB0aGUgZ2l2ZW4gYXJndW1lbnRzLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gr5oyH5a6a44GX44Gf5p2h5Lu244GM6KaB57Sg44Gu5LiA44Gk44Gn44KC5LiA6Ie044GZ44KM44GwIGB0cnVlYCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaXM8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKCkgPT4gdHJ1ZSwgKCkgPT4gZmFsc2UpIGFzIGJvb2xlYW47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcge0BsaW5rIERPTX0gaW5zdGFuY2UgaW5jbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5YaF5YyF44GZ44KLIOaWsOimjyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBURWxlbWVudFtdID0gW107XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5wdXNoKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGVsZW1lbnRzIGZyb20gdGhlIHNldCBvZiBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS5YmK6Zmk44GX44Gm6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcge0BsaW5rIERPTX0gaW5zdGFuY2UgZXhjbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5Lul5aSW44KS5YaF5YyF44GZ44KLIOaWsOimjyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgbm90PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gbmV3IFNldDxURWxlbWVudD4oWy4uLnRoaXNdKTtcbiAgICAgICAgd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoZWw6IFRFbGVtZW50KSA9PiB7IGVsZW1lbnRzLmRlbGV0ZShlbCk7IH0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbWVudHNdIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBkZXNjZW5kYW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBmeOCi+imgee0oOOCkuaknOe0olxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGZpbmQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3RvciA9ICQoc2VsZWN0b3IpIGFzIERPTTxOb2RlPjtcbiAgICAgICAgICAgIHJldHVybiAkc2VsZWN0b3IuZmlsdGVyKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbCAhPT0gZWxlbSAmJiBlbC5jb250YWlucyhlbGVtKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1zID0gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uZWxlbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBoYXZlIGEgZGVzY2VuZGFudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZfjgZ/lrZDopoHntKDmjIHjgaTopoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXM8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldHM6IE5vZGVbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoc2VsZWN0b3IsIGVsIGFzIEVsZW1lbnQpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICAgICB0YXJnZXRzLnB1c2goLi4uJHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiBuZXcgU2V0KHRhcmdldHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtICE9PSBlbCAmJiBlbGVtLmNvbnRhaW5zKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFBhc3MgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IHRocm91Z2ggYSBmdW5jdGlvbiwgcHJvZHVjaW5nIGEgbmV3IHtAbGluayBET019IGluc3RhbmNlIGNvbnRhaW5pbmcgdGhlIHJldHVybiB2YWx1ZXMuXG4gICAgICogQGphIOOCs+ODvOODq+ODkOODg+OCr+OBp+WkieabtOOBleOCjOOBn+imgee0oOOCkueUqOOBhOOBpuaWsOOBn+OBqyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmp4vnr4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+WkieabtOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBtYXA8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihjYWxsYmFjazogRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VEVsZW1lbnQsIFQ+KTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRlIG92ZXIgYSB7QGxpbmsgRE9NfSBpbnN0YW5jZSwgZXhlY3V0aW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGVhY2goY2FsbGJhY2s6IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGZhbHNlID09PSBjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gYSBzdWJzZXQgc3BlY2lmaWVkIGJ5IGEgcmFuZ2Ugb2YgaW5kaWNlcy5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44Gf56+E5Zuy44Gu6KaB57Sg44KS5ZCr44KAIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGJlZ2luXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIGJlZ2luIHRvIGJlIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44Gu6ZaL5aeL5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICogQHBhcmFtIGVuZFxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBzdG9wIGJlaW5nIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44KS57WC44GI44KL55u05YmN44Gu5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICovXG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQoWy4uLnRoaXNdLnNsaWNlKGJlZ2luLCBlbmQpIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgb25lIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBl+OBn+imgee0oOOCkuWQq+OCgCB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGVxKGluZGV4OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMuZ2V0KGluZGV4KSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3IgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yIGJ5IHRlc3RpbmcgdGhlIGVsZW1lbnQgaXRzZWxmIGFuZCB0cmF2ZXJzaW5nIHVwIHRocm91Z2ggaXRzIGFuY2VzdG9ycyBpbiB0aGUgRE9NIHRyZWUuXG4gICAgICogQGphIOmWi+Wni+imgee0oOOBi+OCieacgOOCgui/keOBhOimquimgee0oOOCkumBuOaKni4g44K744Os44Kv44K/44O85oyH5a6a44GX44Gf5aC05ZCILCDjg57jg4Pjg4HjgZnjgovmnIDjgoLov5HjgYTopqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGNsb3Nlc3Q8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gc2VsZWN0b3IgfHwgIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9zZXN0cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0gZWwuY2xvc2VzdChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXN0cy5hZGQoYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4uY2xvc2VzdHNdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMgYXMgdW5rbm93biBhcyBFbGVtZW50KSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzKHNlbGVjdG9yKS5lcSgwKSBhcyBET008Tm9kZT4gYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2hpbGRyZW4gb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDlkITopoHntKDjga7lrZDopoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OBjOaMh+WumuOBleOCjOOBn+WgtOWQiOOBr+ODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+e1kOaenOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIGNoaWxkcmVuPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNoaWxkcmVuID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBlbC5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsaWRSZXRyaWV2ZU5vZGUoY2hpbGQsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4uYWRkKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uY2hpbGRyZW5dKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZmlyc3QgcGFyZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu5pyA5Yid44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyB7QGxpbmsgRE9NfSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpICYmIHZhbGlkUmV0cmlldmVOb2RlKHBhcmVudE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLmFkZChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnBhcmVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyB7QGxpbmsgRE9NfSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzVW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3RvciwgRE9NIG5vZGUsIG9yIHtAbGluayBET019IGluc3RhbmNlXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBpywg5oyH5a6a44GX44Gf44K744Os44Kv44K/44O844KE5p2h5Lu244Gr5LiA6Ie044GZ44KL6KaB57Sg44GM5Ye644Gm44GP44KL44G+44Gn6YG45oqe44GX44Gm5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIHtAbGluayBET019IGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHNVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICBsZXQgcGFyZW50czogTm9kZVtdID0gW107XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBsZXQgcGFyZW50Tm9kZSA9IChlbCBhcyBOb2RlKS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgd2hpbGUgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSkge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudE5vZGUpLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLnB1c2gocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLnB1c2gocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUgPSBwYXJlbnROb2RlLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyDopIfmlbDopoHntKDjgYzlr77osaHjgavjgarjgovjgajjgY3jga/lj43ou6JcbiAgICAgICAgaWYgKDEgPCB0aGlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyZW50cyA9IFsuLi5uZXcgU2V0KHBhcmVudHMucmV2ZXJzZSgpKV0ucmV2ZXJzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICQocGFyZW50cykgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IGZvbGxvd2luZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBuZXh0IHNpYmxpbmcgb25seSBpZiBpdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gICAgICogQGphIOimgee0oOmbhuWQiOOBruWQhOimgee0oOOBruebtOW+jOOBq+OBguOBn+OCi+WFhOW8n+imgee0oOOCkuaKveWHuiA8YnI+XG4gICAgICogICAgIOadoeS7tuW8j+OCkuaMh+WumuOBl+OAgee1kOaenOOCu+ODg+ODiOOBi+OCieabtOOBq+e1nui+vOOBv+OCkuihjOOBhuOBk+OBqOOCguWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZXh0U2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGVsLm5leHRFbGVtZW50U2libGluZztcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSZXRyaWV2ZU5vZGUoZWxlbSwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRTaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5uZXh0U2libGluZ3NdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgZm9sbG93aW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg6ZuG5ZCI5YaF44Gu5ZCE6KaB57Sg44Gu5qyh5Lul6ZmN44Gu5YWo44Gm44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgpLmjIflrprjgZnjgovjgZPjgajjgafjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgZPjgajjgYzlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dEFsbDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmV4dFVudGlsKHVuZGVmaW5lZCwgc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIGZvbGxvd2luZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgdXAgdG8gYnV0IG5vdCBpbmNsdWRpbmcgdGhlIGVsZW1lbnQgbWF0Y2hlZCBieSB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOOBruasoeS7pemZjeOBruWFhOW8n+imgee0oOOBpywg5oyH5a6a44GX44Gf44K744Os44Kv44K/44O844KE5p2h5Lu244Gr5LiA6Ie044GZ44KL6KaB57Sg44GM5Ye644Gm44GP44KL44G+44Gn6YG45oqe44GX44Gm5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ25leHRFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IHByZWNlZGluZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TliY3jga7lhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldlNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldlNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnByZXZTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7liY3ku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wcmV2VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgcHJlY2VkaW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5YmN5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygncHJldmlvdXNFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3RvclxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/lkITopoHntKDjga7lhYTlvJ/opoHntKDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBzaWJsaW5nczxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaWJsaW5nIG9mICQocGFyZW50Tm9kZSkuY2hpbGRyZW4oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2libGluZyAhPT0gZWwgYXMgRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChzaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uc2libGluZ3NdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2hpbGRyZW4gb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHRleHQgYW5kIGNvbW1lbnQgbm9kZXMuXG4gICAgICogQGphIOODhuOCreOCueODiOOChEhUTUzjgrPjg6Hjg7Pjg4jjgpLlkKvjgoDlrZDopoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oKTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZShlbCwgJ2lmcmFtZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZCgoZWwgYXMgSFRNTElGcmFtZUVsZW1lbnQpLmNvbnRlbnREb2N1bWVudCBhcyBOb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKGVsLCAndGVtcGxhdGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQpLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBlbC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNvbnRlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNsb3Nlc3QgYW5jZXN0b3IgZWxlbWVudCB0aGF0IGlzIHBvc2l0aW9uZWQuXG4gICAgICogQGphIOimgee0oOOBruWFiOelluimgee0oOOBpywg44K544K/44Kk44Or44Gn44Od44K444K344On44Oz5oyH5a6aKHBvc2l0aWlvbuOBjHJlbGF0aXZlLCBhYnNvbHV0ZSwgZml4ZWTjga7jgYTjgZrjgozjgYsp44GV44KM44Gm44GE44KL44KC44Gu44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldFBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBjb25zdCByb290RWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJChyb290RWxlbWVudCkgYXMgRE9NPE5vZGU+IGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBnZXRPZmZzZXRQYXJlbnQoZWwgYXMgTm9kZSkgPz8gcm9vdEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2Zmc2V0cy5hZGQob2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5vZmZzZXRzXSkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01UcmF2ZXJzaW5nLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcsIHNldE1peENsYXNzQXR0cmlidXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBFbGVtZW50QmFzZSxcbiAgICB0eXBlIFNlbGVjdG9yQmFzZSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIHR5cGUgRE9NUmVzdWx0LFxuICAgIHR5cGUgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVEb2N1bWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBjaGVjayBIVE1MIHN0cmluZyAqL1xuZnVuY3Rpb24gaXNIVE1MU3RyaW5nKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc3ViamVjdCA9IHNyYy50cmltKCk7XG4gICAgcmV0dXJuICgnPCcgPT09IHN1YmplY3Quc2xpY2UoMCwgMSkpICYmICgnPicgPT09IHN1YmplY3Quc2xpY2UoLTEpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBhcHBlbmQoKWAsIGBwcmVwZW5kKClgLCBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGVTZXQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiBTZXQ8Tm9kZSB8IHN0cmluZz4ge1xuICAgIGNvbnN0IG5vZGVzID0gbmV3IFNldDxOb2RlIHwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgY29udGVudCBvZiBjb250ZW50cykge1xuICAgICAgICBpZiAoKGlzU3RyaW5nKGNvbnRlbnQpICYmICFpc0hUTUxTdHJpbmcoY29udGVudCkpIHx8IGlzTm9kZShjb250ZW50KSkge1xuICAgICAgICAgICAgbm9kZXMuYWRkKGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJGRvbSA9ICQoY29udGVudCBhcyBET008RWxlbWVudD4pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mICRkb20pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdHJpbmcobm9kZSkgfHwgKGlzTm9kZShub2RlKSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IG5vZGUubm9kZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGVzO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGJlZm9yZSgpYCBhbmQgYGFmdGVyKClgICAqL1xuZnVuY3Rpb24gdG9Ob2RlKG5vZGU6IE5vZGUgfCBzdHJpbmcpOiBOb2RlIHtcbiAgICBpZiAoaXNTdHJpbmcobm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBkZXRhY2goKWAgYW5kIGByZW1vdmUoKWAgKi9cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQsXG4gICAgZG9tOiBET01JdGVyYWJsZTxVPixcbiAgICBrZWVwTGlzdGVuZXI6IGJvb2xlYW5cbik6IHZvaWQge1xuICAgIGNvbnN0ICRkb206IERPTTxVPiA9IG51bGwgIT0gc2VsZWN0b3JcbiAgICAgICAgPyAoZG9tIGFzIERPTTxVPikuZmlsdGVyKHNlbGVjdG9yKVxuICAgICAgICA6IGRvbSBhcyBET008VT47XG5cbiAgICBpZiAoIWtlZXBMaXN0ZW5lcikge1xuICAgICAgICAkZG9tLm9mZigpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgIGVsLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIG1hbmlwdWxhdGlvbiBtZXRob2RzLlxuICogQGphIOODnuODi+ODlOODpeODrOODvOOCt+ODp+ODs+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NTWFuaXB1bGF0aW9uPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgSW5zaWRlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBIVE1MIGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIEhUTUwg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGh0bWwoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgSFRNTCBjb250ZW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavmjIflrprjgZfjgZ8gSFRNTCDjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBodG1sU3RyaW5nXG4gICAgICogIC0gYGVuYCBBIHN0cmluZyBvZiBIVE1MIHRvIHNldCBhcyB0aGUgY29udGVudCBvZiBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOWGheOBq+aMv+WFpeOBmeOCiyBIVE1MIOaWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKGh0bWxTdHJpbmc6IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nPzogc3RyaW5nKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IGh0bWxTdHJpbmcpIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpID8gZWwuaW5uZXJIVE1MIDogJyc7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoaHRtbFN0cmluZykpIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLmlubmVySFRNTCA9IGh0bWxTdHJpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpbnZhbGlkIGFyZ1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBpbnZhbGlkIGFyZy4gaHRtbFN0cmluZyB0eXBlOiR7dHlwZW9mIGh0bWxTdHJpbmd9YCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHRleHQgY29udGVudHMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIGpRdWVyeSByZXR1cm5zIHRoZSBjb21iaW5lZCB0ZXh0IG9mIGVhY2ggZWxlbWVudCwgYnV0IHRoaXMgbWV0aG9kIG1ha2VzIG9ubHkgZmlyc3QgZWxlbWVudCdzIHRleHQuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBruODhuOCreOCueODiOOCkuWPluW+lyA8YnI+XG4gICAgICogICAgIGpRdWVyeSDjga/lkITopoHntKDjga7pgKPntZDjg4bjgq3jgrnjg4jjgpLov5TljbTjgZnjgovjgYzmnKzjg6Hjgr3jg4Pjg4njga/lhYjpoK3opoHntKDjga7jgb/jgpLlr77osaHjgajjgZnjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgdGV4dCgpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBjb250ZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIHNwZWNpZmllZCB0ZXh0LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavmjIflrprjgZfjgZ/jg4bjgq3jgrnjg4jjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZXh0XG4gICAgICogIC0gYGVuYCBUaGUgdGV4dCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgovjg4bjgq3jgrnjg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgdGV4dCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdGV4dCh2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiBzdHJpbmcgfCB0aGlzIHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZWwudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChudWxsICE9IHRleHQpID8gdGV4dC50cmltKCkgOiAnJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gaXNTdHJpbmcodmFsdWUpID8gdmFsdWUgOiBTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgdG8gdGhlIGVuZCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlvJXmlbDjgafmjIflrprjgZfjgZ/jgrPjg7Pjg4bjg7Pjg4TjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFwcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuYXBwZW5kKC4uLm5vZGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL6KaB57Sg44KS5LuW44Gu6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBiZWdpbm5pbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YWI6aCt44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5wcmVwZW5kKC4uLm5vZGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL6KaB57Sg44KS5LuW44Gu6KaB57Sg44Gu5YWI6aCt44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZFRvPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5wcmVwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIE91dHNpZGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIGJlZm9yZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7liY3jgavmjIflrprjgZfjgZ8gSFRNTCDjgoTopoHntKDjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGJlZm9yZTxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBiZWZvcmUgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5YmN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5zZXJ0QmVmb3JlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5iZWZvcmUodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCBhZnRlciBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lvozjgo3jgavmjIflrprjgZfjgZ8gSFRNTCDjgoTopoHntKDjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFmdGVyPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLlsuLi5jb250ZW50c10ucmV2ZXJzZSgpKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRvTm9kZShub2RlKSwgZWwubmV4dFNpYmxpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGFmdGVyIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBruW+jOOCjeOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEFmdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hZnRlcih0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBBcm91bmRcblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBhbGwgZWxlbWVudHMgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRG9jdW1lbnQodGhpcykgfHwgaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBOb2RlO1xuXG4gICAgICAgIC8vIFRoZSBlbGVtZW50cyB0byB3cmFwIHRoZSB0YXJnZXQgYXJvdW5kXG4gICAgICAgIGNvbnN0ICR3cmFwID0gJChzZWxlY3RvciwgZWwub3duZXJEb2N1bWVudCkuZXEoMCkuY2xvbmUodHJ1ZSkgYXMgRE9NPEVsZW1lbnQ+O1xuXG4gICAgICAgIGlmIChlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAkd3JhcC5pbnNlcnRCZWZvcmUoZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHdyYXAubWFwKChpbmRleDogbnVtYmVyLCBlbGVtOiBFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICB3aGlsZSAoZWxlbS5maXJzdEVsZW1lbnRDaGlsZCkge1xuICAgICAgICAgICAgICAgIGVsZW0gPSBlbGVtLmZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgICAgIH0pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50Pik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIHRoZSBjb250ZW50IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGheWBtOOCkiwg5oyH5a6a44GX44Gf5Yil44Ko44Os44Oh44Oz44OI44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcElubmVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICBjb25zdCBjb250ZW50cyA9ICRlbC5jb250ZW50cygpO1xuICAgICAgICAgICAgaWYgKDAgPCBjb250ZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50cy53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsLmFwcGVuZChzZWxlY3RvciBhcyBOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpIsIOaMh+WumuOBl+OBn+WIpeimgee0oOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICRlbC53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHBhcmVudHMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTSwgbGVhdmluZyB0aGUgbWF0Y2hlZCBlbGVtZW50cyBpbiB0aGVpciBwbGFjZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu6Kaq44Ko44Os44Oh44Oz44OI44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdW53cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICBzZWxmLnBhcmVudChzZWxlY3Rvcikubm90KCdib2R5JykuZWFjaCgoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICQoZWxlbSkucmVwbGFjZVdpdGgoZWxlbS5jaGlsZE5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVtb3ZhbFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgY2hpbGQgbm9kZXMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg5YaF44Gu5a2Q6KaB57SgKOODhuOCreOCueODiOOCguWvvuixoSnjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZW1wdHkoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS4gVGhpcyBtZXRob2Qga2VlcHMgZXZlbnQgbGlzdGVuZXIgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkLiDliYrpmaTlvozjgoLjgqTjg5njg7Pjg4jjg6rjgrnjg4rjga/mnInlirlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBkZXRhY2g8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICByZW1vdmVFbGVtZW50KHNlbGVjdG9yLCB0aGlzLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDopoHntKDjgpIgRE9NIOOBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIHJlbW92ZUVsZW1lbnQoc2VsZWN0b3IsIHRoaXMsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBSZXBsYWNlbWVudFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB3aXRoIHRoZSBwcm92aWRlZCBuZXcgY29udGVudCBhbmQgcmV0dXJuIHRoZSBzZXQgb2YgZWxlbWVudHMgdGhhdCB3YXMgcmVtb3ZlZC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GV44KM44Gf5Yil44Gu6KaB57Sg44KEIEhUTUwg44Go5beu44GX5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3Q29udGVudFxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlV2l0aDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihuZXdDb250ZW50PzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgZWxlbSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChuZXdDb250ZW50KTtcbiAgICAgICAgICAgIGlmICgxID09PSAkZG9tLmxlbmd0aCAmJiBpc05vZGVFbGVtZW50KCRkb21bMF0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRkb21bMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5yZXBsYWNlV2l0aChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggdGFyZ2V0IGVsZW1lbnQgd2l0aCB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeOBruimgee0oOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlcGxhY2VBbGw8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnJlcGxhY2VXaXRoKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01NYW5pcHVsYXRpb24sICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNBcnJheSxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBjbGFzc2lmeSxcbiAgICBkYXNoZXJpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgRWxlbWVudEJhc2UsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgdHlwZSBET01JdGVyYWJsZSxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgKi9cbmZ1bmN0aW9uIGVuc3VyZUNoYWluQ2FzZVByb3Blcmllcyhwcm9wczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+KTogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJldHZhbCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IGluIHByb3BzKSB7XG4gICAgICAgIGFzc2lnblZhbHVlKHJldHZhbCwgZGFzaGVyaXplKGtleSksIHByb3BzW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldERlZmF1bHRWaWV3KGVsOiBFbGVtZW50KTogV2luZG93IHtcbiAgICByZXR1cm4gZWwub3duZXJEb2N1bWVudD8uZGVmYXVsdFZpZXcgPz8gd2luZG93O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsOiBFbGVtZW50KTogQ1NTU3R5bGVEZWNsYXJhdGlvbiB7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4gdmlldy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGNzcyB2YWx1ZSB0byBudW1iZXIgKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWwpIHx8IDA7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZXNvbHZlciA9IHtcbiAgICB3aWR0aDogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgaGVpZ2h0OiBbJ3RvcCcsICdib3R0b20nXSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0UGFkZGluZyhzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0Qm9yZGVyKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBib3JkZXItJHtfcmVzb2x2ZXJbdHlwZV1bMF19LXdpZHRoYCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVsxXX0td2lkdGhgKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0TWFyZ2luKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBtYXJnaW4tJHtfcmVzb2x2ZXJbdHlwZV1bMF19YCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgd2lkdGgoKWAgYW5kIGBoZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZVNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSkge1xuICAgICAgICAgICAgLy8g44K544Kv44Ot44O844Or44OQ44O844KS6Zmk44GE44Gf5bmFIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiAoZG9tWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BjbGllbnQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIChzY3JvbGxXaWR0aCAvIHNjcm9sbEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiAoZG9tWzBdLmRvY3VtZW50RWxlbWVudCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaXplIC0gKGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICByZXR1cm4gZG9tLmNzcyh0eXBlLCBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZSA6IGAke3ZhbHVlfXB4YCk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlubmVyV2lkdGgoKWAgYW5kIGBpbm5lckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlSW5uZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IoZG9tIGFzIERPTVN0eWxlczxUPiwgdHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIC8vIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgIC8vIHNldHRlciAobm8gcmVhY3Rpb24pXG4gICAgICAgIHJldHVybiBkb207XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIGNvbnN0IGlzVGV4dFByb3AgPSBpc1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgZG9tKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlLCBuZXdWYWwgfSA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RleHRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdHlsZSwgbmV3VmFsIH07XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2JvcmRlci1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCAtIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpfXB4YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovIGludGVyZmFjZSBQYXJzZU91dGVyU2l6ZUFyZ3NSZXN1bHQgeyBpbmNsdWRlTWFyZ2luOiBib29sZWFuOyB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nOyB9XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgb3V0ZXJXaWR0aCgpYCBhbmQgYG91dGVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJnczogdW5rbm93bltdKTogUGFyc2VPdXRlclNpemVBcmdzUmVzdWx0IHtcbiAgICBsZXQgW3ZhbHVlLCBpbmNsdWRlTWFyZ2luXSA9IGFyZ3M7XG4gICAgaWYgKCFpc051bWJlcih2YWx1ZSkgJiYgIWlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICBpbmNsdWRlTWFyZ2luID0gISF2YWx1ZTtcbiAgICAgICAgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gYXMgUGFyc2VPdXRlclNpemVBcmdzUmVzdWx0O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlT3V0ZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbjogYm9vbGVhbiwgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkuWQq+OCgeOBn+W5hSAoaW5uZXJXaWR0aCAvIGlubmVySGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIChkb21bMF0gYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtgaW5uZXIke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAob2Zmc2V0V2lkdGggLyBvZmZzZXRIZWlnaHQpXG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVNYXJnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQgKyBnZXRNYXJnaW4oc3R5bGUsIHR5cGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXJnaW4gPSBpbmNsdWRlTWFyZ2luID8gZ2V0TWFyZ2luKHN0eWxlLCB0eXBlKSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IChpc1RleHRQcm9wID8gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSkgOiB2YWx1ZSkgLSBtYXJnaW47XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN0eWxlLCBuZXdWYWwgfTtcbiAgICAgICAgICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsIC0gZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSAtIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpfXB4YCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsfXB4YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBvc2l0aW9uKClgIGFuZCBgb2Zmc2V0KClgICovXG5mdW5jdGlvbiBnZXRPZmZzZXRQb3NpdGlvbihlbDogRWxlbWVudCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB7XG4gICAgLy8gZm9yIGRpc3BsYXkgbm9uZVxuICAgIGlmIChlbC5nZXRDbGllbnRSZWN0cygpLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogcmVjdC50b3AgKyB2aWV3LnNjcm9sbFksXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHZpZXcuc2Nyb2xsWCxcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgb2Zmc2V0W1dpZHRoIHwgSGVpZ2h0XS4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNlW1dpZHRoIHwgSGVpZ2h0XSDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRTaXplKGVsOiBIVE1MT3JTVkdFbGVtZW50LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIGlmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICByZXR1cm4gKGVsIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbYG9mZnNldCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIFNWR0VsZW1lbnQg44GvIG9mZnNldFdpZHRoIOOBjOOCteODneODvOODiOOBleOCjOOBquOBhFxuICAgICAgICAgKiAgICAgICAgZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkg44GvIHRyYW5zZm9ybSDjgavlvbHpn7/jgpLlj5fjgZHjgovjgZ/jgoEsXG4gICAgICAgICAqICAgICAgICDlrprnvqnpgJrjgoogYm9yZGVyLCBwYWRkaW4g44KS5ZCr44KB44Gf5YCk44KS566X5Ye644GZ44KLXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsIGFzIFNWR0VsZW1lbnQpO1xuICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgc3R5bGUgbWFuYWdlbWVudCBtZXRob2RzLlxuICogQGphIOOCueOCv+OCpOODq+mWoumAo+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU3R5bGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFN0eWxlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY29tcHV0ZWQgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gQ1NTIOOBq+ioreWumuOBleOCjOOBpuOBhOOCi+ODl+ODreODkeODhuOCo+WApOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSB2YWx1ZSBzdHJpbmcuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5YCk44KS5paH5a2X5YiX44Gn6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBtdWx0aXBsZSBjb21wdXRlZCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBDU1Mg44Gr6Kit5a6a44GV44KM44Gm44GE44KL44OX44Ot44OR44OG44Kj5YCk44KS6KSH5pWw5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZXNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFycmF5IGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN6YWN5YiX44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eS12YWx1ZSBvYmplY3QuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj44KS5qC857SN44GX44Gf44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lczogc3RyaW5nW10pOiBQbGFpbk9iamVjdDxzdHJpbmc+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBDU1MgcHJvcGVydGl5IGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOBriBDU1Mg44OX44Ot44OR44OG44Kj44Gr5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3jgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHN0cmluZyB2YWx1ZSB0byBzZXQgZm9yIHRoZSBwcm9wZXJ0eS4gaWYgbnVsbCBwYXNzZWQsIHJlbW92ZSBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WApOOCkuaWh+Wtl+WIl+OBp+aMh+Wumi4gbnVsbCDmjIflrprjgafliYrpmaQuXG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgb25lIG9yIG1vcmUgQ1NTIHByb3BlcnRpZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44GuIENTUyDopIfmlbDjga7jg5fjg63jg5Hjg4bjgqPjgavlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+OCkuagvOe0jeOBl+OBn+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MocHJvcGVydGllczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+KTogdGhpcztcblxuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nIHwgc3RyaW5nW10gfCBQbGFpbk9iamVjdDxzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4sIHZhbHVlPzogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IFBsYWluT2JqZWN0PHN0cmluZz4gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/ICcnIDogdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKGRhc2hlcml6ZShuYW1lKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShuYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgLy8gZ2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShrZXkpO1xuICAgICAgICAgICAgICAgIHByb3BzW2tleV0gPSB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpLmdldFByb3BlcnR5VmFsdWUocHJvcE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKG5hbWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUgfSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gcHJvcHNbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgcHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/mqKrluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruaoquW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+eri+W5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7nuKbluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgb3V0ZXIgd2lkdGggKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCguLi5hcmdzOiB1bmtub3duW10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBvdXRlciBoZWlnaHQgKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo57im5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIG91dGVyIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoLi4uYXJnczogdW5rbm93bltdKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgaW5jbHVkZU1hcmdpbiwgdmFsdWUgfSA9IHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIG1hbmFnZU91dGVyU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIG9mZnNldCBwYXJlbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruimquimgee0oOOBi+OCieOBruebuOWvvueahOOBquihqOekuuS9jee9ruOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBwb3NpdGlvbigpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0ge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG9mZnNldDogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9O1xuICAgICAgICBsZXQgcGFyZW50T2Zmc2V0ID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCBtYXJnaW5Ub3A6IG10LCBtYXJnaW5MZWZ0OiBtbCB9ID0gJChlbCkuY3NzKFsncG9zaXRpb24nLCAnbWFyZ2luVG9wJywgJ21hcmdpbkxlZnQnXSk7XG4gICAgICAgIGNvbnN0IG1hcmdpblRvcCA9IHRvTnVtYmVyKG10KTtcbiAgICAgICAgY29uc3QgbWFyZ2luTGVmdCA9IHRvTnVtYmVyKG1sKTtcblxuICAgICAgICAvLyBwb3NpdGlvbjpmaXhlZCBlbGVtZW50cyBhcmUgb2Zmc2V0IGZyb20gdGhlIHZpZXdwb3J0LCB3aGljaCBpdHNlbGYgYWx3YXlzIGhhcyB6ZXJvIG9mZnNldFxuICAgICAgICBpZiAoJ2ZpeGVkJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIEFzc3VtZSBwb3NpdGlvbjpmaXhlZCBpbXBsaWVzIGF2YWlsYWJpbGl0eSBvZiBnZXRCb3VuZGluZ0NsaWVudFJlY3RcbiAgICAgICAgICAgIG9mZnNldCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2Zmc2V0ID0gZ2V0T2Zmc2V0UG9zaXRpb24oZWwpO1xuXG4gICAgICAgICAgICAvLyBBY2NvdW50IGZvciB0aGUgKnJlYWwqIG9mZnNldCBwYXJlbnQsIHdoaWNoIGNhbiBiZSB0aGUgZG9jdW1lbnQgb3IgaXRzIHJvb3QgZWxlbWVudFxuICAgICAgICAgICAgLy8gd2hlbiBhIHN0YXRpY2FsbHkgcG9zaXRpb25lZCBlbGVtZW50IGlzIGlkZW50aWZpZWRcbiAgICAgICAgICAgIGNvbnN0IGRvYyA9IGVsLm93bmVyRG9jdW1lbnQ7XG4gICAgICAgICAgICBsZXQgb2Zmc2V0UGFyZW50ID0gZ2V0T2Zmc2V0UGFyZW50KGVsKSA/PyBkb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICAgICAgbGV0ICRvZmZzZXRQYXJlbnQgPSAkKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICB3aGlsZSAob2Zmc2V0UGFyZW50ICYmXG4gICAgICAgICAgICAgICAgKG9mZnNldFBhcmVudCA9PT0gZG9jLmJvZHkgfHwgb2Zmc2V0UGFyZW50ID09PSBkb2MuZG9jdW1lbnRFbGVtZW50KSAmJlxuICAgICAgICAgICAgICAgICdzdGF0aWMnID09PSAkb2Zmc2V0UGFyZW50LmNzcygncG9zaXRpb24nKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0UGFyZW50ID0gb2Zmc2V0UGFyZW50LnBhcmVudE5vZGUgYXMgRWxlbWVudDtcbiAgICAgICAgICAgICAgICAkb2Zmc2V0UGFyZW50ID0gJChvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9mZnNldFBhcmVudCAmJiBvZmZzZXRQYXJlbnQgIT09IGVsICYmIE5vZGUuRUxFTUVOVF9OT0RFID09PSBvZmZzZXRQYXJlbnQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJbmNvcnBvcmF0ZSBib3JkZXJzIGludG8gaXRzIG9mZnNldCwgc2luY2UgdGhleSBhcmUgb3V0c2lkZSBpdHMgY29udGVudCBvcmlnaW5cbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQgPSBnZXRPZmZzZXRQb3NpdGlvbihvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgYm9yZGVyVG9wV2lkdGgsIGJvcmRlckxlZnRXaWR0aCB9ID0gJG9mZnNldFBhcmVudC5jc3MoWydib3JkZXJUb3BXaWR0aCcsICdib3JkZXJMZWZ0V2lkdGgnXSk7XG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0LnRvcCArPSB0b051bWJlcihib3JkZXJUb3BXaWR0aCk7XG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0LmxlZnQgKz0gdG9OdW1iZXIoYm9yZGVyTGVmdFdpZHRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN1YnRyYWN0IHBhcmVudCBvZmZzZXRzIGFuZCBlbGVtZW50IG1hcmdpbnNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvcDogb2Zmc2V0LnRvcCAtIHBhcmVudE9mZnNldC50b3AgLSBtYXJnaW5Ub3AsXG4gICAgICAgICAgICBsZWZ0OiBvZmZzZXQubGVmdCAtIHBhcmVudE9mZnNldC5sZWZ0IC0gbWFyZ2luTGVmdCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50LlxuICAgICAqIEBqYSBkb2N1bWVudCDjgpLln7rmupbjgajjgZfjgaYsIOODnuODg+ODgeOBl+OBpuOBhOOCi+imgee0oOmbhuWQiOOBrjHjgaTnm67jga7opoHntKDjga7nj77lnKjjga7luqfmqJnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0KCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBkb2N1bWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GrIGRvY3VtZW50IOOCkuWfuua6luOBq+OBl+OBn+ePvuWcqOW6p+aomeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNvb3JkaW5hdGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgcHJvcGVydGllcyBgdG9wYCBhbmQgYGxlZnRgLlxuICAgICAqICAtIGBqYWAgYHRvcGAsIGBsZWZ0YCDjg5fjg63jg5Hjg4bjgqPjgpLlkKvjgoDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0KGNvb3JkaW5hdGVzOiB7IHRvcD86IG51bWJlcjsgbGVmdD86IG51bWJlcjsgfSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2Zmc2V0KGNvb3JkaW5hdGVzPzogeyB0b3A/OiBudW1iZXI7IGxlZnQ/OiBudW1iZXI7IH0pOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSBjb29yZGluYXRlcyA/IHsgdG9wOiAwLCBsZWZ0OiAwIH0gOiB0aGlzO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gY29vcmRpbmF0ZXMpIHtcbiAgICAgICAgICAgIC8vIGdldFxuICAgICAgICAgICAgcmV0dXJuIGdldE9mZnNldFBvc2l0aW9uKHRoaXNbMF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wczogeyB0b3A/OiBzdHJpbmc7IGxlZnQ/OiBzdHJpbmc7IH0gPSB7fTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0b3A6IGNzc1RvcCwgbGVmdDogY3NzTGVmdCB9ID0gJGVsLmNzcyhbJ3Bvc2l0aW9uJywgJ3RvcCcsICdsZWZ0J10pO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHBvc2l0aW9uIGZpcnN0LCBpbi1jYXNlIHRvcC9sZWZ0IGFyZSBzZXQgZXZlbiBvbiBzdGF0aWMgZWxlbVxuICAgICAgICAgICAgICAgIGlmICgnc3RhdGljJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgY3VyT2Zmc2V0ID0gJGVsLm9mZnNldCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1clBvc2l0aW9uID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmVlZENhbGN1bGF0ZVBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICA9ICgnYWJzb2x1dGUnID09PSBwb3NpdGlvbiB8fCAnZml4ZWQnID09PSBwb3NpdGlvbikgJiYgKGNzc1RvcCArIGNzc0xlZnQpLmluY2x1ZGVzKCdhdXRvJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZWVkQ2FsY3VsYXRlUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkZWwucG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHRvcDogdG9OdW1iZXIoY3NzVG9wKSwgbGVmdDogdG9OdW1iZXIoY3NzTGVmdCkgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjb29yZGluYXRlcy50b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcHMudG9wID0gYCR7KGNvb3JkaW5hdGVzLnRvcCAtIGN1ck9mZnNldC50b3ApICsgY3VyUG9zaXRpb24udG9wfXB4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY29vcmRpbmF0ZXMubGVmdCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wcy5sZWZ0ID0gYCR7KGNvb3JkaW5hdGVzLmxlZnQgLSBjdXJPZmZzZXQubGVmdCkgKyBjdXJQb3NpdGlvbi5sZWZ0fXB4YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkZWwuY3NzKHByb3BzIGFzIFBsYWluT2JqZWN0PHN0cmluZz4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVN0eWxlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIHR5cGUgQWNjZXNzaWJsZSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgY29tYmluYXRpb24sXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgdHlwZSBFbGVtZW50QmFzZSxcbiAgICB0eXBlIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgdHlwZSBET01JdGVyYWJsZSwgaXNUeXBlRWxlbWVudCB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgdHlwZSB7IENvbm5lY3RFdmVudE1hcCB9IGZyb20gJy4vZGV0ZWN0aW9uJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsRXZlbnRMaXN0ZW5lciBleHRlbmRzIEV2ZW50TGlzdGVuZXIge1xuICAgIG9yaWdpbj86IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBFdmVudExpc3RlbmVySGFuZGxlciB7XG4gICAgbGlzdGVuZXI6IEludGVybmFsRXZlbnRMaXN0ZW5lcjtcbiAgICBwcm94eTogRXZlbnRMaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEJpbmRJbmZvIHtcbiAgICByZWdpc3RlcmVkOiBTZXQ8RXZlbnRMaXN0ZW5lcj47XG4gICAgaGFuZGxlcnM6IEV2ZW50TGlzdGVuZXJIYW5kbGVyW107XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgQmluZEV2ZW50Q29udGV4dCA9IFJlY29yZDxzdHJpbmcsIEJpbmRJbmZvPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgQ09PS0lFX1NFUEFSQVRPUiAgPSAnfCcsXG4gICAgQUREUkVTU19FVkVOVCAgICAgPSAwLFxuICAgIEFERFJFU1NfTkFNRVNQQUNFID0gMSxcbiAgICBBRERSRVNTX09QVElPTlMgICA9IDIsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIHVua25vd25bXT4oKSxcbiAgICBldmVudExpc3RlbmVyczogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIEJpbmRFdmVudENvbnRleHQ+KCksXG4gICAgbGl2ZUV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgZXZlbnQtZGF0YSBmcm9tIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5RXZlbnREYXRhKGV2ZW50OiBFdmVudCk6IHVua25vd25bXSB7XG4gICAgY29uc3QgZGF0YSA9IF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmdldChldmVudC50YXJnZXQgYXMgRWxlbWVudCkgPz8gW107XG4gICAgZGF0YS51bnNoaWZ0KGV2ZW50KTtcbiAgICByZXR1cm4gZGF0YTtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBldmVudC1kYXRhIHdpdGggZWxlbWVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudERhdGEoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50RGF0YTogdW5rbm93bltdKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuc2V0KGVsZW0sIGV2ZW50RGF0YSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgZGVsZXRlIGV2ZW50LWRhdGEgYnkgZWxlbWVudCAqL1xuZnVuY3Rpb24gZGVsZXRlRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZGVsZXRlKGVsZW0pO1xufVxuXG4vKiogQGludGVybmFsIG5vcm1hbGl6ZSBldmVudCBuYW1lc3BhY2UgKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZUV2ZW50TmFtZXNwYWNlcyhldmVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBuYW1lc3BhY2VzID0gZXZlbnQuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBtYWluID0gbmFtZXNwYWNlcy5zaGlmdCgpITtcbiAgICBpZiAoIW5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBtYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWVzcGFjZXMuc29ydCgpO1xuICAgICAgICByZXR1cm4gYCR7bWFpbn0uJHtuYW1lc3BhY2VzLmpvaW4oJy4nKX1gO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBzcGxpdCBldmVudCBuYW1lc3BhY2VzICovXG5mdW5jdGlvbiBzcGxpdEV2ZW50TmFtZXNwYWNlcyhldmVudDogc3RyaW5nKTogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10ge1xuICAgIGNvbnN0IHJldHZhbDogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZXMgPSBldmVudC5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1haW4gPSBuYW1lc3BhY2VzLnNoaWZ0KCkhO1xuXG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IG1haW4sIG5hbWVzcGFjZTogJycgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmFtZXNwYWNlcy5zb3J0KCk7XG5cbiAgICAgICAgY29uc3QgY29tYm9zOiBzdHJpbmdbXVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSBuYW1lc3BhY2VzLmxlbmd0aDsgaSA+PSAxOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbWJvcy5wdXNoKC4uLmNvbWJpbmF0aW9uKG5hbWVzcGFjZXMsIGkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGAuJHtuYW1lc3BhY2VzLmpvaW4oJy4nKX0uYDtcbiAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBtYWluLCBuYW1lc3BhY2U6IHNpZ25hdHVyZSB9KTtcbiAgICAgICAgZm9yIChjb25zdCBucyBvZiBjb21ib3MpIHtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKHsgdHlwZTogYCR7bWFpbn0uJHtucy5qb2luKCcuJyl9YCwgbmFtZXNwYWNlOiBzaWduYXR1cmUgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIHJldmVyc2UgcmVzb2x1dGlvbiBldmVudCBuYW1lc3BhY2VzICovXG5mdW5jdGlvbiByZXNvbHZlRXZlbnROYW1lc3BhY2VzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nKTogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10ge1xuICAgIGNvbnN0IHJldHZhbDogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZXMgPSBldmVudC5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1haW4gPSBuYW1lc3BhY2VzLnNoaWZ0KCkhO1xuICAgIGNvbnN0IHR5cGUgPSBub3JtYWxpemVFdmVudE5hbWVzcGFjZXMoZXZlbnQpO1xuXG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IG1haW4sIG5hbWVzcGFjZTogJycgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcXVlcnkgPSAoY29udGV4dDogQmluZEV2ZW50Q29udGV4dCB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29raWVzID0gT2JqZWN0LmtleXMoY29udGV4dCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzaWduYXR1cmVzID0gY29va2llcy5maWx0ZXIoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGUgPT09IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX0VWRU5UXTtcbiAgICAgICAgICAgICAgICB9KS5tYXAoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX05BTUVTUEFDRV07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzaWJsaW5ncyA9IGNvb2tpZXMuZmlsdGVyKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc2lnbmF0dXJlIG9mIHNpZ25hdHVyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzaWduYXR1cmUgPT09IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX05BTUVTUEFDRV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSkubWFwKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF0sIG5hbWVzcGFjZTogc2VlZFtDb25zdC5BRERSRVNTX05BTUVTUEFDRV0gfTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKC4uLnNpYmxpbmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB7IGV2ZW50TGlzdGVuZXJzLCBsaXZlRXZlbnRMaXN0ZW5lcnMgfSA9IF9ldmVudENvbnRleHRNYXA7XG4gICAgICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG4gICAgICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBldmVudCBjb29raWUgZnJvbSBldmVudCBuYW1lLCBzZWxlY3Rvciwgb3B0aW9ucyAqL1xuZnVuY3Rpb24gdG9Db29raWUoZXZlbnQ6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBjb25zdCBvcHRzID0geyAuLi5vcHRpb25zIH07XG4gICAgZGVsZXRlIG9wdHMub25jZTtcbiAgICByZXR1cm4gYCR7ZXZlbnR9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7bmFtZXNwYWNlfSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke0pTT04uc3RyaW5naWZ5KG9wdHMpfSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke3NlbGVjdG9yfWA7XG59XG5cbi8qKiBAaW50ZXJuYWwgZ2V0IGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgYnkgZWxlbWVudCBhbmQgZXZlbnQgKi9cbmZ1bmN0aW9uIGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICBoYW5kbGVyczogW10sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSE7XG4gICAgY29uc3QgY29va2llID0gdG9Db29raWUoZXZlbnQsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHF1ZXJ5IGFsbCBldmVudCBhbmQgaGFuZGxlciBieSBlbGVtZW50LCBmb3IgYWxsIGBvZmYoKWAgYW5kIGBjbG9uZSh0cnVlKWAgKi9cbmZ1bmN0aW9uIGV4dHJhY3RBbGxIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgcmVtb3ZlID0gdHJ1ZSk6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10ge1xuICAgIGNvbnN0IGhhbmRsZXJzOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IG9iamVjdDsgfVtdID0gW107XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBPYmplY3Qua2V5cyhjb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzZWVkW0NvbnN0LkFERFJFU1NfRVZFTlRdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBKU09OLnBhcnNlKHNlZWRbQ29uc3QuQUREUkVTU19PUFRJT05TXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGNvbnRleHRbY29va2llXS5oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgbGl2ZUV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBuYW1lc3BhY2UgZXZlbnQgYW5kIGhhbmRsZXIgYnkgZWxlbWVudCwgZm9yIGBvZmYoYC4ke25hbWVzcGFjZX1gKWAgKi9cbmZ1bmN0aW9uIGV4dHJhY3ROYW1lc3BhY2VIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgbmFtZXNwYWNlczogc3RyaW5nKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzID0gbmFtZXNwYWNlcy5zcGxpdCgnLicpLmZpbHRlcihuID0+ICEhbik7XG4gICAgY29uc3QgbmFtZXNwYWNlRmlsdGVyID0gKGNvb2tpZTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZXNwYWNlIG9mIG5hbWVzKSB7XG4gICAgICAgICAgICBpZiAoY29va2llLmluY2x1ZGVzKGAuJHtuYW1lc3BhY2V9LmApKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogdm9pZCA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBjb29raWVzID0gT2JqZWN0LmtleXMoY29udGV4dCkuZmlsdGVyKG5hbWVzcGFjZUZpbHRlcik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBjb29raWVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFtDb25zdC5BRERSRVNTX09QVElPTlNdKTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzOiBfaGFuZGxlcnMgfSA9IGNvbnRleHRbY29va2llXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgX2hhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goeyBldmVudCwgaGFuZGxlcjogaGFuZGxlci5wcm94eSwgb3B0aW9ucyB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuXG4gICAgcmV0dXJuIGhhbmRsZXJzO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUGFyc2VFdmVudEFyZ3NSZXN1bHQge1xuICAgIHR5cGU6IHN0cmluZ1tdO1xuICAgIHNlbGVjdG9yOiBzdHJpbmc7XG4gICAgbGlzdGVuZXI6IEludGVybmFsRXZlbnRMaXN0ZW5lcjtcbiAgICBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucztcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJzZSBldmVudCBhcmdzICovXG5mdW5jdGlvbiBwYXJzZUV2ZW50QXJncyguLi5hcmdzOiB1bmtub3duW10pOiBQYXJzZUV2ZW50QXJnc1Jlc3VsdCB7XG4gICAgbGV0IFt0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgW3R5cGUsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgICAgIHNlbGVjdG9yID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHR5cGUgPSAhdHlwZSA/IFtdIDogKGlzQXJyYXkodHlwZSkgPyB0eXBlIDogW3R5cGVdKTtcbiAgICBzZWxlY3RvciA9IHNlbGVjdG9yID8/ICcnO1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIGlmICh0cnVlID09PSBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IGNhcHR1cmU6IHRydWUgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSBhcyBQYXJzZUV2ZW50QXJnc1Jlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfbm9UcmlnZ2VyID0gWydyZXNpemUnLCAnc2Nyb2xsJ107XG5cbi8qKiBAaW50ZXJuYWwgZXZlbnQtc2hvcnRjdXQgaW1wbCAqL1xuZnVuY3Rpb24gZXZlbnRTaG9ydGN1dDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHRoaXM6IERPTUV2ZW50czxBY2Nlc3NpYmxlPFQsICgpID0+IHZvaWQ+PixcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgaGFuZGxlcj86IEV2ZW50TGlzdGVuZXIsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuKTogRE9NRXZlbnRzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSBoYW5kbGVyKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKCFfbm9UcmlnZ2VyLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZWxbbmFtZV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsW25hbWVdKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCBhcyBhbnkpLnRyaWdnZXIobmFtZSBhcyBhbnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5vbihuYW1lIGFzIGFueSwgaGFuZGxlciBhcyBhbnksIG9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFdmVudChzcmM6IEVsZW1lbnQsIGRzdDogRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdEFsbEhhbmRsZXJzKHNyYywgZmFsc2UpO1xuICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICBkc3QuYWRkRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNsb25lKClgICovXG5mdW5jdGlvbiBjbG9uZUVsZW1lbnQoZWxlbTogRWxlbWVudCwgd2l0aEV2ZW50czogYm9vbGVhbiwgZGVlcDogYm9vbGVhbik6IEVsZW1lbnQge1xuICAgIGNvbnN0IGNsb25lID0gZWxlbS5jbG9uZU5vZGUodHJ1ZSkgYXMgRWxlbWVudDtcblxuICAgIGlmICh3aXRoRXZlbnRzKSB7XG4gICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBjb25zdCBzcmNFbGVtZW50cyA9IGVsZW0ucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgY29uc3QgZHN0RWxlbWVudHMgPSBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtpbmRleF0gb2Ygc3JjRWxlbWVudHMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgY2xvbmVFdmVudChzcmNFbGVtZW50c1tpbmRleF0sIGRzdEVsZW1lbnRzW2luZGV4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjbG9uZUV2ZW50KGVsZW0sIGNsb25lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbG9uZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNlbGYgZXZlbnQgbWFuYWdlICovXG5mdW5jdGlvbiBoYW5kbGVTZWxmRXZlbnQ8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZjogRE9NRXZlbnRzPFRFbGVtZW50PixcbiAgICBjYWxsYmFjazogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLFxuICAgIGV2ZW50TmFtZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8RE9NRXZlbnRNYXA8SFRNTEVsZW1lbnQgfCBXaW5kb3c+PixcbiAgICBwZXJtYW5lbnQ6IGJvb2xlYW4sXG4pOiBET01FdmVudHM8VEVsZW1lbnQ+IHtcbiAgICBmdW5jdGlvbiBmaXJlQ2FsbEJhY2sodGhpczogRWxlbWVudCwgZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgaWYgKCFwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgIChzZWxmIGFzIERPTUV2ZW50czxOb2RlPikub2ZmKGV2ZW50TmFtZSwgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpc0Z1bmN0aW9uKGNhbGxiYWNrKSAmJiAoc2VsZiBhcyBET01FdmVudHM8Tm9kZT4pLm9uKGV2ZW50TmFtZSwgZmlyZUNhbGxCYWNrKTtcbiAgICByZXR1cm4gc2VsZjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qIGVzbGludC1kaXNhYmxlIEBzdHlsaXN0aWMvaW5kZW50ICovXG5leHBvcnQgdHlwZSBET01FdmVudE1hcDxUPlxuICAgID0gVCBleHRlbmRzIFdpbmRvdyA/IFdpbmRvd0V2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRG9jdW1lbnQgPyBEb2N1bWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEJvZHlFbGVtZW50ID8gSFRNTEJvZHlFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWVkaWFFbGVtZW50ID8gSFRNTE1lZGlhRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEVsZW1lbnQgPyBIVE1MRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRWxlbWVudCA/IEVsZW1lbnRFdmVudE1hcCAmIENvbm5lY3RFdmVudE1hcFxuICAgIDogR2xvYmFsRXZlbnRIYW5kbGVyc0V2ZW50TWFwO1xuLyogZXNsaW50LWVuYWJsZSBAc3R5bGlzdGljL2luZGVudCAqL1xuXG5leHBvcnQgdHlwZSBET01FdmVudExpc3RlbmVyPFQgPSBIVE1MRWxlbWVudCwgTSBleHRlbmRzIERPTUV2ZW50TWFwPFQ+ID0gRE9NRXZlbnRNYXA8VD4+ID0gKGV2ZW50OiBNW2tleW9mIE1dLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbmV4cG9ydCB0eXBlIEV2ZW50V2l0aE5hbWVzcGFjZTxUIGV4dGVuZHMgRE9NRXZlbnRNYXA8YW55Pj4gPSBrZXlvZiBUIHwgYCR7c3RyaW5nICYga2V5b2YgVH0uJHtzdHJpbmd9YDtcbmV4cG9ydCB0eXBlIE1ha2VFdmVudFR5cGU8VCwgTT4gPSBUIGV4dGVuZHMga2V5b2YgTSA/IGtleW9mIE0gOiAoVCBleHRlbmRzIGAke3N0cmluZyAmIGtleW9mIE19LiR7aW5mZXIgQ31gID8gYCR7c3RyaW5nICYga2V5b2YgTX0uJHtDfWAgOiBuZXZlcik7XG5leHBvcnQgdHlwZSBFdmVudFR5cGU8VCBleHRlbmRzIERPTUV2ZW50TWFwPGFueT4+ID0gTWFrZUV2ZW50VHlwZTxFdmVudFdpdGhOYW1lc3BhY2U8VD4sIFQ+O1xuZXhwb3J0IHR5cGUgRXZlbnRUeXBlT3JOYW1lc3BhY2U8VCBleHRlbmRzIERPTUV2ZW50TWFwPGFueT4+ID0gRXZlbnRUeXBlPFQ+IHwgYC4ke3N0cmluZ31gO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGV2ZW50IG1hbmFnZW1lbnRzLlxuICogQGphIOOCpOODmeODs+ODiOeuoeeQhuOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRXZlbnRzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBiYXNpY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBvbiguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTGl2ZUV2ZW50KGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoZS5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXZlbnREYXRhID0gcXVlcnlFdmVudERhdGEoZSk7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChlLnRhcmdldCBhcyBFbGVtZW50IHwgbnVsbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkoJHRhcmdldFswXSwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXJlbnQgb2YgJHRhcmdldC5wYXJlbnRzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50KS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHBhcmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBxdWVyeUV2ZW50RGF0YShlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm94eSA9IHNlbGVjdG9yID8gaGFuZGxlTGl2ZUV2ZW50IDogaGFuZGxlRXZlbnQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHNwbGl0RXZlbnROYW1lc3BhY2VzKGV2ZW50KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbWJvIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHR5cGUsIG5hbWVzcGFjZSB9ID0gY29tYm87XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJlZCAmJiAhcmVnaXN0ZXJlZC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmFkZChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm94eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIG9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCkgYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub24gfCBvbn0oKSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIG9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCkgYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub24gfCBvbn0oKSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGFsbCBldmVudCBoYW5kbGVyLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgZnjgbnjgabjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmKCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2ZmKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhlbCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdE5hbWVzcGFjZUhhbmRsZXJzKGVsLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHJlc29sdmVFdmVudE5hbWVzcGFjZXMoZWwsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tYm8gb2YgY29tYm9zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB0eXBlLCBuYW1lc3BhY2UgfSA9IGNvbWJvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IGhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gaGFuZGxlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHsgLy8gYmFja3dhcmQgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChoYW5kbGVyPy5saXN0ZW5lcj8ub3JpZ2luID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLnByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCDkuIDluqbjgaDjgZHlkbzjgbPlh7rjgZXjgozjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+WvvuOBl+OBpuOCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIG9uY2UoLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgLi4ub3B0aW9ucywgLi4ueyBvbmNlOiB0cnVlIH0gfTtcblxuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gb25jZUhhbmRsZXIodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgLi4uZXZlbnRBcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGV2ZW50QXJncyk7XG4gICAgICAgICAgICBzZWxmLm9mZih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICAgICAgICAgIGRlbGV0ZSBvbmNlSGFuZGxlci5vcmlnaW47XG4gICAgICAgIH1cbiAgICAgICAgb25jZUhhbmRsZXIub3JpZ2luID0gbGlzdGVuZXIgYXMgSW50ZXJuYWxFdmVudExpc3RlbmVyIHwgdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdGhpcy5vbih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhbGwgaGFuZGxlcnMgYWRkZWQgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBq+WvvuOBl+OBpuOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiAvLyB3LyBldmVudC1uYW1lc3BhY2UgYmVoYXZpb3VyXG4gICAgICogJCgnLmxpbmsnKS5vbignY2xpY2suaG9nZS5waXlvJywgKGUpID0+IHsgLi4uIH0pO1xuICAgICAqICQoJy5saW5rJykub24oJ2NsaWNrLmhvZ2UnLCAgKGUpID0+IHsgLi4uIH0pO1xuICAgICAqXG4gICAgICogJCgnLmxpbmsnKS50cmlnZ2VyKCcuaG9nZScpOyAgICAgICAgICAgLy8gY29tcGlsZSBlcnJvci4gKG5vdCBmaXJlKVxuICAgICAqICQoJy5saW5rJykudHJpZ2dlcignY2xpY2suaG9nZScpOyAgICAgIC8vIGZpcmUgYm90aC5cbiAgICAgKiAkKCcubGluaycpLnRyaWdnZXIoJ2NsaWNrLmhvZ2UucGl5bycpOyAvLyBmaXJlIG9ubHkgZmlyc3Qgb25lXG4gICAgICogYGBgXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS4gLyBgRXZlbnRgIGluc3RhbmNlIG9yIGBFdmVudGAgaW5zdGFuY2UgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJcgLyBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCuemFjeWIl1xuICAgICAqIEBwYXJhbSBldmVudERhdGFcbiAgICAgKiAgLSBgZW5gIG9wdGlvbmFsIHNlbmRpbmcgZGF0YS5cbiAgICAgKiAgLSBgamFgIOmAgeS/oeOBmeOCi+S7u+aEj+OBruODh+ODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHNlZWQ6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdIHwgRXZlbnQgfCBFdmVudFtdIHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgRXZlbnQpW10sXG4gICAgICAgIC4uLmV2ZW50RGF0YTogdW5rbm93bltdXG4gICAgKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNvbnZlcnQgPSAoYXJnOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IEV2ZW50KTogRXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGFyZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUV2ZW50KG5vcm1hbGl6ZUV2ZW50TmFtZXNwYWNlcyhhcmcpLCB7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogZXZlbnREYXRhLFxuICAgICAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnIGFzIEV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IGlzQXJyYXkoc2VlZCkgPyBzZWVkIDogW3NlZWRdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBlID0gY29udmVydChldmVudCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlckV2ZW50RGF0YShlbCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUV2ZW50RGF0YShlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgdXRpbGl0eVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgndHJhbnNpdGlvbnN0YXJ0JykuXG4gICAgICogQGphIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCd0cmFuc2l0aW9uc3RhcnQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25zdGFydGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGB0cmFuc2l0aW9uc3RhcnRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJhbnNpdGlvblN0YXJ0KGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAndHJhbnNpdGlvbnN0YXJ0JywgcGVybWFuZW50KSBhcyB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ3RyYW5zaXRpb25lbmQnKS5cbiAgICAgKiBAamEge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ3RyYW5zaXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAndHJhbnNpdGlvbmVuZCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCdhbmltYXRpb25zdGFydCcpLlxuICAgICAqIEBqYSB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgnYW5pbWF0aW9uc3RhcnQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYGFuaW1hdGlvbnN0YXJ0YCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbnN0YXJ0YCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGlvblN0YXJ0KGNhbGxiYWNrOiAoZXZlbnQ6IEFuaW1hdGlvbkV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTZWxmRXZlbnQodGhpcywgY2FsbGJhY2ssICdhbmltYXRpb25zdGFydCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCdhbmltYXRpb25lbmQnKS5cbiAgICAgKiBAamEge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ2FuaW1hdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZVNlbGZFdmVudCh0aGlzLCBjYWxsYmFjaywgJ2FuaW1hdGlvbmVuZCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmluZCBvbmUgb3IgdHdvIGhhbmRsZXJzIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzLCB0byBiZSBleGVjdXRlZCB3aGVuIHRoZSBgbW91c2VlbnRlcmAgYW5kIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudHMuXG4gICAgICogQGphIDHjgaTjgb7jgZ/jga8y44Gk44Gu44OP44Oz44OJ44Op44KS5oyH5a6a44GXLCDkuIDoh7TjgZfjgZ/opoHntKDjga4gYG1vdXNlZW50ZXJgLCBgbW91c2VsZWF2ZWAg44KS5qSc55+lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlckluKE91dClcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VlbnRlcmAgdGhlIGVsZW1lbnQuIDxicj5cbiAgICAgKiAgICAgICAgSWYgaGFuZGxlciBzZXQgb25seSBvbmUsIGEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQsIHRvby5cbiAgICAgKiAgLSBgamFgIGBtb3VzZWVudGVyYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIDxicj5cbiAgICAgKiAgICAgICAgICDlvJXmlbDjgYwx44Gk44Gn44GC44KL5aC05ZCILCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KC5YW844Gt44KLXG4gICAgICogQHBhcmFtIGhhbmRsZXJPdXRcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGhvdmVyKGhhbmRsZXJJbjogRE9NRXZlbnRMaXN0ZW5lciwgaGFuZGxlck91dD86IERPTUV2ZW50TGlzdGVuZXIpOiB0aGlzIHtcbiAgICAgICAgaGFuZGxlck91dCA9IGhhbmRsZXJPdXQgPz8gaGFuZGxlckluO1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZWVudGVyKGhhbmRsZXJJbikubW91c2VsZWF2ZShoYW5kbGVyT3V0KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBzaG9ydGN1dFxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xpY2soaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY2xpY2snLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGRibGNsaWNrYCBldmVudC5cbiAgICAgKiBAamEgYGRibGNsaWNrYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkYmxjbGljayhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdkYmxjbGljaycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgYmx1cmAgZXZlbnQuXG4gICAgICogQGphIGBibHVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBibHVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2JsdXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1cyhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1cycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNpbmAgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c2luYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c2luKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3VzaW4nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3Vzb3V0YCBldmVudC5cbiAgICAgKiBAamEgYGZvY3Vzb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c291dChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c291dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5dXBgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5dXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXVwKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlkb3duYCBldmVudC5cbiAgICAgKiBAamEgYGtleWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleWRvd24oaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5ZG93bicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5cHJlc3NgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5cHJlc3NgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXByZXNzKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXByZXNzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzdWJtaXRgIGV2ZW50LlxuICAgICAqIEBqYSBgc3VibWl0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdWJtaXQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc3VibWl0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjb250ZXh0bWVudWAgZXZlbnQuXG4gICAgICogQGphIGBjb250ZXh0bWVudWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGV4dG1lbnUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY29udGV4dG1lbnUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNoYW5nZWAgZXZlbnQuXG4gICAgICogQGphIGBjaGFuZ2VgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjaGFuZ2UnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZG93bihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWRvd24nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbW92ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW1vdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlbW92ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNldXBgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2V1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2V1cChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWVudGVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZW50ZXIoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VlbnRlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VsZWF2ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWxlYXZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWxlYXZlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbGVhdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3V0YCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW91dChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW91dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdmVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3ZlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdmVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlb3ZlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hzdGFydGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaHN0YXJ0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaHN0YXJ0KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoc3RhcnQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoZW5kYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoZW5kYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGVuZChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGVuZCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2htb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNobW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2htb3ZlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNobW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hjYW5jZWxgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hjYW5jZWxgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoY2FuY2VsKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoY2FuY2VsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGByZXNpemVgIGV2ZW50LlxuICAgICAqIEBqYSBgcmVzaXplYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNpemUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgncmVzaXplJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzY3JvbGxgIGV2ZW50LlxuICAgICAqIEBqYSBgc2Nyb2xsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGwoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc2Nyb2xsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBDb3B5aW5nXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu44OH44Kj44O844OX44Kz44OU44O844KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEV2ZW50c1xuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciBldmVudCBoYW5kbGVycyBzaG91bGQgYmUgY29waWVkIGFsb25nIHdpdGggdGhlIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KC44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICogQHBhcmFtIGRlZXBcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgY2xvbmVkIGVsZW1lbnQgc2hvdWxkIGJlIGNvcGllZC5cbiAgICAgKiAgLSBgamFgIGJvb2xlYW7lgKTjgafjgIHphY3kuIvjga7opoHntKDjga7jgZnjgbnjgabjga7lrZDopoHntKDjgavlr77jgZfjgabjgoLjgIHku5jpmo/jgZfjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLjgrPjg5Tjg7zjgZnjgovjgYvjganjgYbjgYvjgpLmsbrlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUod2l0aEV2ZW50cyA9IGZhbHNlLCBkZWVwID0gZmFsc2UpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudChzZWxmKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGYubWFwKChpbmRleDogbnVtYmVyLCBlbDogVEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjbG9uZUVsZW1lbnQoZWwgYXMgTm9kZSBhcyBFbGVtZW50LCB3aXRoRXZlbnRzLCBkZWVwKSBhcyBOb2RlIGFzIFRFbGVtZW50O1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUV2ZW50cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBOdWxsaXNoLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NpZnksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGlzV2luZG93Q29udGV4dCxcbiAgICBlbnN1cmVQb3NpdGl2ZU51bWJlcixcbiAgICBzd2luZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgdHlwZSB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc05vZGVEb2N1bWVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IGdldE9mZnNldFNpemUgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIHtAbGluayBET019YC5zY3JvbGxUbygpYCBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEge0BsaW5rIERPTX1gLnNjcm9sbFRvKClgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVNjcm9sbE9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogQGphIOe4puOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqL1xuICAgIHRvcD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg5qiq44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgbGVmdD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgZHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiBAamEg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqL1xuICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBzY3JvbGwgdGFyZ2V0IGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5VGFyZ2V0RWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfSBlbHNlIGlmIChpc05vZGVEb2N1bWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2UgaWYgKGlzV2luZG93Q29udGV4dChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIHBhcnNlQXJncyguLi5hcmdzOiB1bmtub3duW10pOiBET01TY3JvbGxPcHRpb25zIHtcbiAgICBjb25zdCBvcHRpb25zOiBET01TY3JvbGxPcHRpb25zID0geyBlYXNpbmc6ICdzd2luZycgfTtcbiAgICBpZiAoMSA9PT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBhcmdzWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbbGVmdCwgdG9wLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFja10gPSBhcmdzO1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHtcbiAgICAgICAgICAgIHRvcCxcbiAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcHRpb25zLnRvcCAgICAgID0gZW5zdXJlUG9zaXRpdmVOdW1iZXIob3B0aW9ucy50b3ApO1xuICAgIG9wdGlvbnMubGVmdCAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmxlZnQpO1xuICAgIG9wdGlvbnMuZHVyYXRpb24gPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmR1cmF0aW9uKTtcblxuICAgIHJldHVybiBvcHRpb25zO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHNjcm9sbFRvKClgICovXG5mdW5jdGlvbiBleGVjU2Nyb2xsKGVsOiBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQsIG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICBjb25zdCB7IHRvcCwgbGVmdCwgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2sgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBpbml0aWFsVG9wID0gZWwuc2Nyb2xsVG9wO1xuICAgIGNvbnN0IGluaXRpYWxMZWZ0ID0gZWwuc2Nyb2xsTGVmdDtcbiAgICBsZXQgZW5hYmxlVG9wID0gaXNOdW1iZXIodG9wKTtcbiAgICBsZXQgZW5hYmxlTGVmdCA9IGlzTnVtYmVyKGxlZnQpO1xuXG4gICAgLy8gbm9uIGFuaW1hdGlvbiBjYXNlXG4gICAgaWYgKCFkdXJhdGlvbikge1xuICAgICAgICBsZXQgbm90aWZ5ID0gZmFsc2U7XG4gICAgICAgIGlmIChlbmFibGVUb3AgJiYgdG9wICE9PSBpbml0aWFsVG9wKSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxUb3AgPSB0b3AhO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5hYmxlTGVmdCAmJiBsZWZ0ICE9PSBpbml0aWFsTGVmdCkge1xuICAgICAgICAgICAgZWwuc2Nyb2xsTGVmdCA9IGxlZnQhO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90aWZ5ICYmIGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjTWV0cmljcyA9IChlbmFibGU6IGJvb2xlYW4sIGJhc2U6IG51bWJlciwgaW5pdGlhbFZhbHVlOiBudW1iZXIsIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IHsgbWF4OiBudW1iZXI7IG5ldzogbnVtYmVyOyBpbml0aWFsOiBudW1iZXI7IH0gPT4ge1xuICAgICAgICBpZiAoIWVuYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWF4OiAwLCBuZXc6IDAsIGluaXRpYWw6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXhWYWx1ZSA9IChlbCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdIC0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gTWF0aC5tYXgoTWF0aC5taW4oYmFzZSwgbWF4VmFsdWUpLCAwKTtcbiAgICAgICAgcmV0dXJuIHsgbWF4OiBtYXhWYWx1ZSwgbmV3OiBuZXdWYWx1ZSwgaW5pdGlhbDogaW5pdGlhbFZhbHVlIH07XG4gICAgfTtcblxuICAgIGNvbnN0IG1ldHJpY3NUb3AgPSBjYWxjTWV0cmljcyhlbmFibGVUb3AsIHRvcCEsIGluaXRpYWxUb3AsICdoZWlnaHQnKTtcbiAgICBjb25zdCBtZXRyaWNzTGVmdCA9IGNhbGNNZXRyaWNzKGVuYWJsZUxlZnQsIGxlZnQhLCBpbml0aWFsTGVmdCwgJ3dpZHRoJyk7XG5cbiAgICBpZiAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3ID09PSBtZXRyaWNzVG9wLmluaXRpYWwpIHtcbiAgICAgICAgZW5hYmxlVG9wID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChlbmFibGVMZWZ0ICYmIG1ldHJpY3NMZWZ0Lm5ldyA9PT0gbWV0cmljc0xlZnQuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVMZWZ0ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICghZW5hYmxlVG9wICYmICFlbmFibGVMZWZ0KSB7XG4gICAgICAgIC8vIG5lZWQgbm90IHRvIHNjcm9sbFxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FsY1Byb2dyZXNzID0gKHZhbHVlOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihlYXNpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZWFzaW5nKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAnbGluZWFyJyA9PT0gZWFzaW5nID8gdmFsdWUgOiBzd2luZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgZGVsdGEgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBhbmltYXRlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBlbGFwc2UgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGgubWF4KE1hdGgubWluKGVsYXBzZSAvIGR1cmF0aW9uLCAxKSwgMCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzQ29lZmYgPSBjYWxjUHJvZ3Jlc3MocHJvZ3Jlc3MpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBkZWx0YVxuICAgICAgICBpZiAoZW5hYmxlVG9wKSB7XG4gICAgICAgICAgICBkZWx0YS50b3AgPSBtZXRyaWNzVG9wLmluaXRpYWwgKyAocHJvZ3Jlc3NDb2VmZiAqIChtZXRyaWNzVG9wLm5ldyAtIG1ldHJpY3NUb3AuaW5pdGlhbCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0KSB7XG4gICAgICAgICAgICBkZWx0YS5sZWZ0ID0gbWV0cmljc0xlZnQuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NMZWZ0Lm5ldyAtIG1ldHJpY3NMZWZ0LmluaXRpYWwpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIGRvbmVcbiAgICAgICAgaWYgKChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPiBtZXRyaWNzVG9wLmluaXRpYWwgJiYgZGVsdGEudG9wID49IG1ldHJpY3NUb3AubmV3KSAgICAgICB8fCAvLyBzY3JvbGwgZG93blxuICAgICAgICAgICAgKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA8IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPD0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCB1cFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID4gbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0ID49IG1ldHJpY3NMZWZ0Lm5ldykgIHx8IC8vIHNjcm9sbCByaWdodFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3IDwgbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0IDw9IG1ldHJpY3NMZWZ0Lm5ldykgICAgIC8vIHNjcm9sbCBsZWZ0XG4gICAgICAgICkge1xuICAgICAgICAgICAgLy8gZW5zdXJlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICBlbmFibGVUb3AgJiYgKGVsLnNjcm9sbFRvcCA9IG1ldHJpY3NUb3AubmV3KTtcbiAgICAgICAgICAgIGVuYWJsZUxlZnQgJiYgKGVsLnNjcm9sbExlZnQgPSBtZXRyaWNzTGVmdC5uZXcpO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlbGVhc2UgcmVmZXJlbmNlIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgZWwgPSBudWxsITtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBkZWx0YS50b3ApO1xuICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gZGVsdGEubGVmdCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44K544Kv44Ot44O844Or44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TY3JvbGw8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU2Nyb2xsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb246IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUb3AoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxUb3AgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgdG9wOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg5qiq5pa55ZCR44K544Kv44Ot44O844Or44GV44KM44Gf44OU44Kv44K744Or5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NpdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxMZWZ0IDogMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsVG8oe1xuICAgICAgICAgICAgICAgIGxlZnQ6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5qiq5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0geFxuICAgICAqICAtIGBlbmAgdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0geVxuICAgICAqICAtIGBlbmAgdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhcbiAgICAgICAgeDogbnVtYmVyLFxuICAgICAgICB5OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBzY3JvbGwgdmFsdWVzIGJ5IG9wdG9pbnMuXG4gICAgICogQGphIOOCquODl+OCt+ODp+ODs+OCkueUqOOBhOOBpuOCueOCr+ODreODvOODq+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhvcHRpb25zOiBET01TY3JvbGxPcHRpb25zKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUbyguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlQXJncyguLi5hcmdzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtID0gcXVlcnlUYXJnZXRFbGVtZW50KGVsKTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZXhlY1Njcm9sbChlbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVNjcm9sbCwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbiAgICBub29wLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBFbGVtZW50QmFzZSwgRE9NIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIERPTX0gZWZmZWN0IHBhcmFtZXRlci5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgqjjg5Xjgqfjgq/jg4jlirnmnpzjga7jg5Hjg6njg6Hjg7zjgr9cbiAqL1xuZXhwb3J0IHR5cGUgRE9NRWZmZWN0UGFyYW1ldGVycyA9IEtleWZyYW1lW10gfCBQcm9wZXJ0eUluZGV4ZWRLZXlmcmFtZXMgfCBudWxsO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NfSBlZmZlY3Qgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgqjjg5Xjgqfjgq/jg4jlirnmnpzjga7jgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IHR5cGUgRE9NRWZmZWN0T3B0aW9ucyA9IG51bWJlciB8IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9ucztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIERPTX0gZWZmZWN0IGNvbnRleHQgb2JqZWN0LlxuICogQGphIHtAbGluayBET019IOOBruOCqOODleOCp+OCr+ODiOWKueaenOOBruOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgRE9NfSBpbnN0YW5jZSB0aGF0IGNhbGxlZCB7QGxpbmsgRE9NRWZmZWN0cy5hbmltYXRlIHwgYW5pbWF0ZX0oKSBtZXRob2QuXG4gICAgICogQGphIHtAbGluayBET01FZmZlY3RzLmFuaW1hdGUgfCBhbmltYXRlfSgpIOODoeOCveODg+ODieOCkuWun+ihjOOBl+OBnyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBkb206IERPTTxURWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYEVsZW1lbnRgIGFuZCBgQW5pbWF0aW9uYCBpbnN0YW5jZSBtYXAgYnkgZXhlY3V0aW9uIHtAbGluayBET01FZmZlY3RzLmFuaW1hdGUgfCBhbmltYXRlfSgpIG1ldGhvZCBhdCB0aGlzIHRpbWUuXG4gICAgICogQGphIOS7iuWbniB7QGxpbmsgRE9NRWZmZWN0cy5hbmltYXRlIHwgYW5pbWF0ZX0oKSDlrp/ooYzjgZfjgZ8gYEVsZW1lbnRgIOOBqCBgQW5pbWF0aW9uYCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7jg57jg4Pjg5dcbiAgICAgKi9cbiAgICByZWFkb25seSBhbmltYXRpb25zOiBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGN1cnJlbnQgZmluaXNoZWQgUHJvbWlzZSBmb3IgdGhpcyBhbmltYXRpb24uXG4gICAgICogQGphIOWvvuixoeOCouODi+ODoeODvOOCt+ODp+ODs+OBrue1guS6huaZguOBq+eZuueBq+OBmeOCiyBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgZmluaXNoZWQ6IFByb21pc2U8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYW5pbUNvbnRleHRNYXAgPSBuZXcgV2Vha01hcDxFbGVtZW50LCBTZXQ8QW5pbWF0aW9uPj4oKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhbmltYXRpb24vZWZmZWN0IG1ldGhvZHMuXG4gKiBAamEg44Ki44OL44Oh44O844K344On44OzL+OCqOODleOCp+OCr+ODiOaTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRWZmZWN0czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFZmZlY3RzIGFuaW1hdGlvblxuXG4gICAgLyoqXG4gICAgICogQGVuIFN0YXJ0IGFuaW1hdGlvbiBieSBgV2ViIEFuaW1hdGlvbiBBUElgLlxuICAgICAqIEBqYSBgV2ViIEFuaW1hdGlvbiBBUElgIOOCkueUqOOBhOOBpuOCouODi+ODoeODvOOCt+ODp+ODs+OCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRlKHBhcmFtczogRE9NRWZmZWN0UGFyYW1ldGVycywgb3B0aW9uczogRE9NRWZmZWN0T3B0aW9ucyk6IERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICAgICAgZG9tOiB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiBhcyBET008VEVsZW1lbnQ+LFxuICAgICAgICAgICAgYW5pbWF0aW9uczogbmV3IE1hcDxURWxlbWVudCwgQW5pbWF0aW9uPigpLFxuICAgICAgICB9IGFzIFdyaXRhYmxlPERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQ+PjtcblxuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJlc3VsdC5maW5pc2hlZCA9IFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYW5pbSA9IGVsLmFuaW1hdGUocGFyYW1zLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCkgPz8gbmV3IFNldCgpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuYWRkKGFuaW0pO1xuICAgICAgICAgICAgICAgIF9hbmltQ29udGV4dE1hcC5zZXQoZWwsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5hbmltYXRpb25zLnNldChlbCBhcyBOb2RlIGFzIFRFbGVtZW50LCBhbmltKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdC5maW5pc2hlZCA9IFByb21pc2UuYWxsKFsuLi5yZXN1bHQuYW5pbWF0aW9ucy52YWx1ZXMoKV0ubWFwKGFuaW0gPT4gYW5pbS5maW5pc2hlZCkpLnRoZW4oKCkgPT4gcmVzdWx0KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWwgY3VycmVudCBydW5uaW5nIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg54++5Zyo5a6f6KGM44GX44Gm44GE44KL44Ki44OL44Oh44O844K344On44Oz44KS5Lit5q2iXG4gICAgICovXG4gICAgcHVibGljIGNhbmNlbCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYW5pbWF0aW9uIG9mIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5jYW5jZWwoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBfYW5pbUNvbnRleHRNYXAuZGVsZXRlKGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmluaXNoIGN1cnJlbnQgcnVubmluZyBhbmltYXRpb24uXG4gICAgICogQGphIOePvuWcqOWun+ihjOOBl+OBpuOBhOOCi+OCouODi+ODoeODvOOCt+ODp+ODs+OCkue1guS6hlxuICAgICAqL1xuICAgIHB1YmxpYyBmaW5pc2goKTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFuaW1hdGlvbiBvZiBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRpb24uZmluaXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gZmluaXNoIOOBp+OBr+egtOajhOOBl+OBquOBhFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHMgdXRpbGl0eVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgZm9yY2UgcmVmbG93LlxuICAgICAqIEBqYSDlvLfliLbjg6rjg5Xjg63jg7zjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVmbG93KCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpc1swXSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgdW5rbm93biBhcyBET00pICB7XG4gICAgICAgICAgICAgICAgbm9vcChlbC5vZmZzZXRIZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGZvcmNlIHJlcGFpbnQuXG4gICAgICogQGphIOW8t+WItuWGjeaPj+eUu+OCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyByZXBhaW50KCk6IHRoaXMge1xuICAgICAgICBpZiAodGhpc1swXSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgdW5rbm93biBhcyBET00pICB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGVsLnN0eWxlLmRpc3BsYXk7XG4gICAgICAgICAgICAgICAgZWwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgICAgICBlbC5zdHlsZS5kaXNwbGF5ID0gY3VycmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUVmZmVjdHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgQ2xhc3MsXG4gICAgbWl4aW5zLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEVsZW1lbnRCYXNlLFxuICAgIHR5cGUgU2VsZWN0b3JCYXNlLFxuICAgIHR5cGUgRWxlbWVudGlmeVNlZWQsXG4gICAgdHlwZSBRdWVyeUNvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBET01CYXNlIH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IERPTUF0dHJpYnV0ZXMgfSBmcm9tICcuL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHsgRE9NVHJhdmVyc2luZyB9IGZyb20gJy4vdHJhdmVyc2luZyc7XG5pbXBvcnQgeyBET01NYW5pcHVsYXRpb24gfSBmcm9tICcuL21hbmlwdWxhdGlvbic7XG5pbXBvcnQgeyBET01TdHlsZXMgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyBET01FdmVudHMgfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQgeyBET01TY3JvbGwgfSBmcm9tICcuL3Njcm9sbCc7XG5pbXBvcnQgeyBET01FZmZlY3RzIH0gZnJvbSAnLi9lZmZlY3RzJztcblxudHlwZSBET01GZWF0dXJlczxUIGV4dGVuZHMgRWxlbWVudEJhc2U+XG4gICAgPSBET01CYXNlPFQ+XG4gICAgJiBET01BdHRyaWJ1dGVzPFQ+XG4gICAgJiBET01UcmF2ZXJzaW5nPFQ+XG4gICAgJiBET01NYW5pcHVsYXRpb248VD5cbiAgICAmIERPTVN0eWxlczxUPlxuICAgICYgRE9NRXZlbnRzPFQ+XG4gICAgJiBET01TY3JvbGw8VD5cbiAgICAmIERPTUVmZmVjdHM8VD47XG5cbi8qKlxuICogQGVuIHtAbGluayBET019IHBsdWdpbiBtZXRob2QgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjg5fjg6njgrDjgqTjg7Pjg6Hjgr3jg4Pjg4nlrprnvqlcbiAqXG4gKiBAbm90ZVxuICogIC0g44OX44Op44Kw44Kk44Oz5ouh5by15a6a576p44Gv44GT44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K544Oe44O844K444GZ44KLLlxuICogIC0gVHlwZVNjcmlwdCAzLjcg5pmC54K544GnLCBtb2R1bGUgaW50ZXJmYWNlIOOBruODnuODvOOCuOOBryBtb2R1bGUg44Gu5a6M5YWo44Gq44OR44K544KS5b+F6KaB44Go44GZ44KL44Gf44KBLFxuICogICAg5pys44Os44Od44K444OI44Oq44Gn44GvIGJ1bmRsZSDjgZfjgZ8gYGRpc3QvZG9tLmQudHNgIOOCkuaPkOS+m+OBmeOCiy5cbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzMzMzI2XG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81Nzg0ODEzNC90cm91YmxlLXVwZGF0aW5nLWFuLWludGVyZmFjZS11c2luZy1kZWNsYXJhdGlvbi1tZXJnaW5nXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NUGx1Z2luIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZVxuXG4vKipcbiAqIEBlbiBUaGlzIGludGVyZmFjZSBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m+OBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBET01GZWF0dXJlczxUPiwgRE9NUGx1Z2luIHsgfVxuXG5leHBvcnQgdHlwZSBET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gRWxlbWVudGlmeVNlZWQ8VD4gfCBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIERPTVJlc3VsdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPiA9IFQgZXh0ZW5kcyBET008RWxlbWVudEJhc2U+ID8gVCA6IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBET008VD4gOiBET008SFRNTEVsZW1lbnQ+KTtcbmV4cG9ydCB0eXBlIERPTUl0ZXJhdGVDYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IGJvb2xlYW4gfCB2b2lkO1xuXG4vKipcbiAqIEBlbiBUaGlzIGNsYXNzIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6bXG4gKlxuICogVU5TVVBQT1JURUQgTUVUSE9EIExJU1RcbiAqXG4gKiBbVHJhdmVyc2luZ11cbiAqICAuYWRkQmFjaygpXG4gKiAgLmVuZCgpXG4gKlxuICogW0VmZmVjdHNdXG4gKiAuc2hvdygpXG4gKiAuaGlkZSgpXG4gKiAudG9nZ2xlKClcbiAqIC5zdG9wKClcbiAqIC5jbGVhclF1ZXVlKClcbiAqIC5kZWxheSgpXG4gKiAuZGVxdWV1ZSgpXG4gKiAuZmFkZUluKClcbiAqIC5mYWRlT3V0KClcbiAqIC5mYWRlVG8oKVxuICogLmZhZGVUb2dnbGUoKVxuICogLnF1ZXVlKClcbiAqIC5zbGlkZURvd24oKVxuICogLnNsaWRlVG9nZ2xlKClcbiAqIC5zbGlkZVVwKClcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUNsYXNzIGV4dGVuZHMgbWl4aW5zKFxuICAgIERPTUJhc2UsXG4gICAgRE9NQXR0cmlidXRlcyxcbiAgICBET01UcmF2ZXJzaW5nLFxuICAgIERPTU1hbmlwdWxhdGlvbixcbiAgICBET01TdHlsZXMsXG4gICAgRE9NRXZlbnRzLFxuICAgIERPTVNjcm9sbCxcbiAgICBET01FZmZlY3RzLFxuKSB7XG4gICAgLyoqXG4gICAgICogcHJpdmF0ZSBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoZWxlbWVudHM6IEVsZW1lbnRCYXNlW10pIHtcbiAgICAgICAgc3VwZXIoZWxlbWVudHMpO1xuICAgICAgICAvLyBhbGwgc291cmNlIGNsYXNzZXMgaGF2ZSBubyBjb25zdHJ1Y3Rvci5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIHtAbGluayBET019IGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqIEByZXR1cm5zIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKHNlbGVjdG9yICYmICFjb250ZXh0KSB7XG4gICAgICAgICAgICBpZiAoaXNET01DbGFzcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRE9NQ2xhc3MoKGVsZW1lbnRpZnkoc2VsZWN0b3IgYXMgRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQpKSkgYXMgdW5rbm93biBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQ2xhc3MgYXMgdW5rbm93biBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMge0BsaW5rIERPTX0uXG4gKiBAamEge0BsaW5rIERPTX0g5Z6L44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHhcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNET01DbGFzcyh4OiB1bmtub3duKTogeCBpcyBET00ge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgRE9NQ2xhc3M7XG59XG4iLCJpbXBvcnQgeyBzZXR1cCB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUNsYXNzIH0gZnJvbSAnLi9jbGFzcyc7XG5cbi8vIGluaXQgZm9yIHN0YXRpY1xuc2V0dXAoRE9NQ2xhc3MucHJvdG90eXBlLCBET01DbGFzcy5jcmVhdGUpO1xuXG5leHBvcnQgKiBmcm9tICcuL2V4cG9ydHMnO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyBkZWZhdWx0IH0gZnJvbSAnLi9leHBvcnRzJztcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsImNsYXNzTmFtZSIsImlzTnVtYmVyIiwiZ2V0R2xvYmFsTmFtZXNwYWNlIiwiJCIsImlzQXJyYXkiLCJpc1N0cmluZyIsImFzc2lnblZhbHVlIiwidG9UeXBlZERhdGEiLCJjYW1lbGl6ZSIsImZyb21UeXBlZERhdGEiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSIsIm5vb3AiLCJkb20iLCJkYXNoZXJpemUiLCJjbGFzc2lmeSIsImNvbWJpbmF0aW9uIiwibWl4aW5zIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBOztJQUVHO0lBRUgsaUJBQXdC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LElBQUk7UUFDZjtJQUVBOzs7SUFHRztRQUNJLE9BQU8sR0FBQTtJQUNWLFFBQUEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksV0FBVyxFQUFFO0lBQ2hDLFlBQUEsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFzQixFQUFHO0lBQ3RDLGdCQUFBLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTztJQUNoQyxnQkFBQSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNO0lBQ3pCLGdCQUFBLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU87Z0JBQzlCO1lBQ0o7SUFDQSxRQUFBLE9BQU8sSUFBSTtRQUNmO0lBQ0g7QUFFREQsa0NBQW9CLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDOztJQ25IcEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBMEJHO0lBQ0csTUFBTyxRQUFTLFNBQVFNLGdCQUFNLENBQ2hDLE9BQU8sRUFDUCxhQUFhLEVBQ2IsYUFBYSxFQUNiLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxVQUFVLENBQ2IsQ0FBQTtJQUNHOzs7Ozs7SUFNRztJQUNILElBQUEsV0FBQSxDQUFvQixRQUF1QixFQUFBO1lBQ3ZDLEtBQUssQ0FBQyxRQUFRLENBQUM7O1FBRW5CO0lBRUE7Ozs7Ozs7Ozs7Ozs7SUFhRztJQUNJLElBQUEsT0FBTyxNQUFNLENBQXlCLFFBQXlCLEVBQUUsT0FBNkIsRUFBQTtJQUNqRyxRQUFBLElBQUksUUFBUSxJQUFJLENBQUMsT0FBTyxFQUFFO0lBQ3RCLFlBQUEsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDdEIsZ0JBQUEsT0FBTyxRQUF3QjtnQkFDbkM7WUFDSjtJQUNBLFFBQUEsT0FBTyxJQUFJLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBNkIsRUFBRSxPQUFPLENBQUMsRUFBNkI7UUFDeEc7SUFDSDtJQUVEO0FBQ0FOLGtDQUFvQixDQUFDLFFBQTRCLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQztJQUV0RTs7Ozs7OztJQU9HO0lBQ0csU0FBVSxVQUFVLENBQUMsQ0FBVSxFQUFBO1FBQ2pDLE9BQU8sQ0FBQyxZQUFZLFFBQVE7SUFDaEM7O0lDM0lBO0lBQ0EsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQzs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9kb20vIn0=