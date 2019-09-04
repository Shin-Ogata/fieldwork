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
     * `window` オブジェクトと `document` オブジェクト等の存在を保証する
     */
    const win = coreUtils.safe(globalThis.window);
    const doc = coreUtils.safe(globalThis.document);
    const evt = coreUtils.safe(globalThis.CustomEvent);

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
        const node = dom[0];
        return !!(node && node.nodeType && (Node.ELEMENT_NODE === node.nodeType));
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
        const node = dom[0];
        return !!(node && node.nodeType && (Node.ELEMENT_NODE === node.nodeType) && (null != node.dataset));
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /**
     * @en Mixin base class which concentrated the property methods of DOM class.
     * @ja DOM のプロパティ操作メソッドを集約した Mixin Base クラス
     */
    class DOMProperties {
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
                el.classList.add(...classes);
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
                el.classList.remove(...classes);
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
                if (el.classList.contains(className)) {
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
                operation(el);
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
                for (const attr of attrs) {
                    el.removeAttribute(attr);
                }
            }
            return this;
        }
        val(value) {
            if (!isTypeElement(this)) {
                // non element
                return null == value ? undefined : this;
            }
            const isMultiSelect = (el) => {
                return 'select' === el.nodeName.toLowerCase() && el.multiple;
            };
            if (null == value) {
                // get first element value
                const el = this[0];
                if (isMultiSelect(el)) {
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
                    if (coreUtils.isArray(value) && isMultiSelect(el)) {
                        for (const option of el.options) {
                            option.selected = value.includes(option.value);
                        }
                    }
                    else {
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
                        const dataset = el.dataset;
                        if (dataset) {
                            dataset[prop] = coreUtils.fromTypedData(value);
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
                const dataset = el.dataset;
                if (dataset) {
                    for (const prop of props) {
                        delete dataset[prop];
                    }
                }
            }
            return this;
        }
    }
    coreUtils.setMixClassAttribute(DOMProperties, 'noConstructor');

    /** @internal helper for `parent()` and `parents()` */
    function validParentNode(parentNode) {
        return null != parentNode && Node.DOCUMENT_NODE !== parentNode.nodeType && Node.DOCUMENT_FRAGMENT_NODE !== parentNode.nodeType;
    }
    /**
     * @en Mixin base class which concentrated the manipulation methods of DOM class.
     * @ja DOM のマニピュレーションメソッドを集約した Mixin Base クラス
     */
    class DOMManipulations {
        ///////////////////////////////////////////////////////////////////////
        // public: Manipulation
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
    coreUtils.setMixClassAttribute(DOMManipulations, 'noConstructor');
    // TODO:
    //transform,
    //transition,
    //width,
    //outerWidth,
    //height,
    //outerHeight,
    //offset,
    //hide, <- やらない?
    //show, <- やらない?
    //styles,
    //css,
    //toArray,
    //each,
    //forEach,
    //filter,
    //map,
    //html,
    //text,
    //indexOf,
    //index,
    //eq,
    //append,
    //appendTo,
    //prepend,
    //prependTo,
    //insertBefore,
    //insertAfter,
    //next,
    //nextAll,
    //prev,
    //prevAll,
    //siblings,
    //closest,
    //find,
    //children,
    //remove,
    //detach,
    //add,
    //empty,
    /////
    // contents
    // position
    // scrollTop (window) <- scroll (pr2)
    // clone
    // wrap
    // unwrap
    // replaceWith
    // fade, fadeIn, fadeOut, fadeTo, fadeToggle <- animation (pr3)
    // slideUp, slideDown, slideToggle <- やらない
    ///
    // first
    // has
    // last
    // innerHeight
    // innerWidth
    // nextUntil
    // offsetParent
    // outerHeight
    // outerWidth
    // prevUntil
    // replaceAll
    // wrapAll
    // wrapInner

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
    /** @internal query all event and handler by element, for all `off()` */
    function extractAllHandlers(elem) {
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
        query(eventListeners.get(elem)) && eventListeners.delete(elem);
        query(liveEventListeners.get(elem)) && liveEventListeners.delete(elem);
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
    /* eslint-enable @typescript-eslint/indent */
    /**
     * @en Mixin base class which concentrated the event management of DOM class.
     * @ja DOM のイベント管理を集約した Mixin Base クラス
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
        // public: utility
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
            if (callback) {
                self.on('transitionend', fireCallBack);
            }
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
            if (callback) {
                self.on('animationend', fireCallBack);
            }
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
        // public: event-shortcut
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
    }
    coreUtils.setMixClassAttribute(DOMEvents, 'noConstructor');

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /**
     * @en This class provides DOM operations like `jQuery` library.
     * @ja `jQuery` のようなDOM 操作を提供
     */
    class DOMClass extends coreUtils.mixins(DOMBase, DOMProperties, DOMManipulations, DOMEvents) {
        /**
         * private constructor
         *
         * @param elements
         *  - `en` operation targets `Element` array.
         *  - `ja` 操作対象の `Element` 配列
         */
        constructor(elements) {
            super(elements);
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

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJwcm9wZXJ0aWVzLnRzIiwibWFuaXB1bGF0aW9ucy50cyIsImV2ZW50cy50cyIsImNsYXNzLnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qXG4gKiBTU1IgKFNlcnZlciBTaWRlIFJlbmRlcmluZykg55Kw5aKD44Gr44GK44GE44Gm44KCXG4gKiBgd2luZG93YCDjgqrjg5bjgrjjgqfjgq/jg4jjgaggYGRvY3VtZW50YCDjgqrjg5bjgrjjgqfjgq/jg4jnrYnjga7lrZjlnKjjgpLkv53oqLzjgZnjgotcbiAqL1xuY29uc3Qgd2luID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG5jb25zdCBkb2MgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuY29uc3QgZXZ0ID0gc2FmZShnbG9iYWxUaGlzLkN1c3RvbUV2ZW50KTtcblxuZXhwb3J0IHtcbiAgICB3aW4gYXMgd2luZG93LFxuICAgIGRvYyBhcyBkb2N1bWVudCxcbiAgICBldnQgYXMgQ3VzdG9tRXZlbnQsXG59O1xuIiwiaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgaXNGdW5jdGlvbixcbiAgICBjbGFzc05hbWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuZXhwb3J0IHR5cGUgRWxlbWVudEJhc2UgPSBOb2RlIHwgV2luZG93O1xuZXhwb3J0IHR5cGUgRWxlbWVudFJlc3VsdDxUPiA9IFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFQgOiBIVE1MRWxlbWVudDtcbmV4cG9ydCB0eXBlIFNlbGVjdG9yQmFzZSA9IE5vZGUgfCBXaW5kb3cgfCBzdHJpbmcgfCBOaWw7XG5leHBvcnQgdHlwZSBFbGVtZW50aWZ5U2VlZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gVCB8IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUW10gOiBuZXZlcikgfCBOb2RlTGlzdE9mPFQgZXh0ZW5kcyBOb2RlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIFF1ZXJ5Q29udGV4dCA9IFBhcmVudE5vZGUgJiBQYXJ0aWFsPE5vbkVsZW1lbnRQYXJlbnROb2RlPjtcblxuLyoqXG4gKiBAZW4gQ3JlYXRlIEVsZW1lbnQgYXJyYXkgZnJvbSBzZWVkIGFyZy5cbiAqIEBqYSDmjIflrprjgZXjgozjgZ8gU2VlZCDjgYvjgokgRWxlbWVudCDphY3liJfjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gc2VlZFxuICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBFbGVtZW50IGFycmF5LlxuICogIC0gYGphYCBFbGVtZW50IOmFjeWIl+OBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAqIEByZXR1cm5zIEVsZW1lbnRbXSBiYXNlZCBOb2RlIG9yIFdpbmRvdyBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dDogUXVlcnlDb250ZXh0ID0gZG9jdW1lbnQpOiBFbGVtZW50UmVzdWx0PFQ+W10ge1xuICAgIGlmICghc2VlZCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2Ygc2VlZCkge1xuICAgICAgICAgICAgY29uc3QgaHRtbCA9IHNlZWQudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGh0bWwuaW5jbHVkZXMoJzwnKSAmJiBodG1sLmluY2x1ZGVzKCc+JykpIHtcbiAgICAgICAgICAgICAgICAvLyBtYXJrdXBcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLnRlbXBsYXRlLmNvbnRlbnQuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IHNlZWQudHJpbSgpO1xuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0LmdldEVsZW1lbnRCeUlkKSAmJiAoJyMnID09PSBzZWxlY3RvclswXSkgJiYgIS9bIC48Pjp+XS8uZXhlYyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcHVyZSBJRCBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbCA9IGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3Iuc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgZWwgJiYgZWxlbWVudHMucHVzaChlbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgnYm9keScgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJvZHlcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlciBzZWxlY3RvcnNcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5jb250ZXh0LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoKHNlZWQgYXMgTm9kZSkubm9kZVR5cGUgfHwgd2luZG93ID09PSBzZWVkKSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmIChzZWVkWzBdLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZFswXSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NQ2xhc3MsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbn0gZnJvbSAnLi9jbGFzcyc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGRvbSB7XG4gICAgbGV0IGZuOiBET01DbGFzcztcbn1cblxudHlwZSBET01GYWN0b3J5ID0gPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQpID0+IERPTVJlc3VsdDxUPjtcblxubGV0IF9mYWN0b3J5ITogRE9NRmFjdG9yeTtcblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbRE9NQ2xhc3NdXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NQ2xhc3NdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01DbGFzc11dLlxuICogIC0gYGphYCBbW0RPTUNsYXNzXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgW1tET01DbGFzc11dIGluc3RhbmNlLlxuICovXG5mdW5jdGlvbiBkb208VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTVJlc3VsdDxUPiB7XG4gICAgcmV0dXJuIF9mYWN0b3J5KHNlbGVjdG9yLCBjb250ZXh0KTtcbn1cblxuZG9tLnV0aWxzID0gdXRpbHM7XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzLCBmYWN0b3J5OiBET01GYWN0b3J5KTogdm9pZCB7XG4gICAgX2ZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIGRvbS5mbiA9IGZuO1xufVxuXG5leHBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20sXG59O1xuIiwiaW1wb3J0IHsgTmlsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdywgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3InKTtcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdGlvbiBjbGFzcyBvZiBbW0RPTUNsYXNzXV0uIFRoaXMgY2xhc3MgcHJvdmlkZXMgaXRlcmF0b3IgbWV0aG9kcy5cbiAqIEBqYSBbW0RPTUNsYXNzXV0g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50czogVFtdKSB7XG4gICAgICAgIGNvbnN0IHNlbGY6IERPTUFjY2VzczxUPiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaW5kZXgpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IoY3VycmVudCwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICBjb25zdCBub2RlID0gZG9tWzBdIGFzIE5vZGU7XG4gICAgcmV0dXJuICEhKG5vZGUgJiYgbm9kZS5ub2RlVHlwZSAmJiAoTm9kZS5FTEVNRU5UX05PREUgPT09IG5vZGUubm9kZVR5cGUpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEgW1tET01dXSDjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50PiB7XG4gICAgY29uc3Qgbm9kZSA9IGRvbVswXSBhcyBOb2RlO1xuICAgIHJldHVybiAhIShub2RlICYmIG5vZGUubm9kZVR5cGUgJiYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBub2RlLm5vZGVUeXBlKSAmJiAobnVsbCAhPSAobm9kZSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldCkpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRG9jdW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IGRvbVswXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYFdpbmRvd2AuXG4gKiBAamEgW1tET01dXSDjgYwgYFdpbmRvd2Ag44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlV2luZG93KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPFdpbmRvdz4ge1xuICAgIHJldHVybiB3aW5kb3cgPT09IGRvbVswXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTmlsLlxuICogQGphIE5pbCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5pbD4ge1xuICAgIHJldHVybiAhc2VsZWN0b3I7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgc3RyaW5nPiB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2Ygc2VsZWN0b3I7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE5vZGUuXG4gKiBAamEgTm9kZSDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTm9kZT4ge1xuICAgIHJldHVybiBudWxsICE9IChzZWxlY3RvciBhcyBOb2RlKS5ub2RlVHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgRWxlbWVudC5cbiAqIEBqYSBFbGVtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VsZW1lbnRTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBFbGVtZW50PiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRWxlbWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgRG9jdW1lbnQuXG4gKiBAamEgRG9jdW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRG9jdW1lbnRTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBEb2N1bWVudD4ge1xuICAgIHJldHVybiBkb2N1bWVudCA9PT0gc2VsZWN0b3IgYXMgTm9kZSBhcyBEb2N1bWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgV2luZG93LlxuICogQGphIFdpbmRvdyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBXaW5kb3c+IHtcbiAgICByZXR1cm4gd2luZG93ID09PSBzZWxlY3RvciBhcyBXaW5kb3c7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciBpcyBhYmxlIHRvIGl0ZXJhdGUuXG4gKiBAamEg6LWw5p+75Y+v6IO944Gq44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlTGlzdE9mPE5vZGU+PiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIFRbXSkubGVuZ3RoO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBbW0RPTV1dLlxuICogQGphIFtbRE9NXV0g44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE9NU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRE9NPiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQmFzZTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgY2FtZWxpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01WYWx1ZVR5cGU8VCwgSyA9ICd2YWx1ZSc+ID0gVCBleHRlbmRzIEhUTUxTZWxlY3RFbGVtZW50ID8gKHN0cmluZyB8IHN0cmluZ1tdKSA6IEsgZXh0ZW5kcyBrZXlvZiBUID8gVFtLXSA6IHVuZGVmaW5lZDtcbmV4cG9ydCB0eXBlIERPTURhdGEgPSBQbGFpbk9iamVjdDxUeXBlZERhdGE+O1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgcHJvcGVydHkgbWV0aG9kcyBvZiBET00gY2xhc3MuXG4gKiBAamEgRE9NIOOBruODl+ODreODkeODhuOCo+aTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NUHJvcGVydGllczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENsYXNzZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGFkZENsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxFbGVtZW50Pikge1xuICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGFueSBvZiB0aGUgbWF0Y2hlZCBlbGVtZW50cyBhcmUgYXNzaWduZWQgdGhlIGdpdmVuIGNsYXNzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLlsJHjgarjgY/jgajjgoLopoHntKDjgYzmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWVcbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDbGFzcyhjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG9yIHJlbW92ZSBvbmUgb3IgbW9yZSBjbGFzc2VzIGZyb20gZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICBkZXBlbmRpbmcgb24gZWl0aGVyIHRoZSBjbGFzcydzIHByZXNlbmNlIG9yIHRoZSB2YWx1ZSBvZiB0aGUgc3RhdGUgYXJndW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBrueKtuaFi+OBq+W/nOOBmOOBpiwg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS6KaB57Sg44Gr6L+95YqgL+WJiumZpOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBmb3JjZVxuICAgICAqICAtIGBlbmAgaWYgdGhpcyBhcmd1bWVudCBleGlzdHMsIHRydWU6IHRoZSBjbGFzc2VzIHNob3VsZCBiZSBhZGRlZCAvIGZhbHNlOiByZW1vdmVkLlxuICAgICAqICAtIGBqYWAg5byV5pWw44GM5a2Y5Zyo44GZ44KL5aC05ZCILCB0cnVlOiDjgq/jg6njgrnjgpLov73liqAgLyBmYWxzZTog44Kv44Op44K544KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHRvZ2dsZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGZvcmNlPzogYm9vbGVhbik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNsYXNzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LnRvZ2dsZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxFbGVtZW50Pikge1xuICAgICAgICAgICAgb3BlcmF0aW9uKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwcm9wZXJ0eSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBUKTogVEVsZW1lbnRbVF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgdmFsdWVcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+ODl+ODreODkeODhuOCo+WApFxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBULCB2YWx1ZTogVEVsZW1lbnRbVF0pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBwcm9wZXJ0eSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIHByb3BlcnR5LXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihrZXk6IFQgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBURWxlbWVudFtUXSk6IFRFbGVtZW50W1RdIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHByb3BlcnR5XG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gZmlyc3QgJiYgZmlyc3Rba2V5IGFzIHN0cmluZ107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgcHJvcGVydHlcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBlbFtrZXkgYXMgc3RyaW5nXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSBpbiBlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW25hbWVdID0ga2V5W25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYXR0cmlidXRlIHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgYXR0cmlidXRlIHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg5bGe5oCn5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgdmFsdWUuIGlmIGBudWxsYCBzZXQsIHJlbW92ZSBhdHRyaWJ1dGUuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlsZ7mgKflgKQuIGBudWxsYCDjgYzmjIflrprjgZXjgozjgZ/loLTlkIjliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIGF0dHJpYnV0ZS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBhdHRyaWJ1dGUtdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIGF0dHIoa2V5OiBzdHJpbmcgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIChudWxsICE9IGF0dHIpID8gYXR0ciA6IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlQXR0cihrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxFbGVtZW50Pikge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5IGFzIHN0cmluZywgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGtleVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCBTdHJpbmcodmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf5bGe5oCn44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgYXR0cmlidXRlIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44G+44Gf44Gv5bGe5oCn5ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUF0dHIobmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhdHRycyA9IGlzQXJyYXkobmFtZSkgPyBuYW1lIDogW25hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBhdHRycykge1xuICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFZhbHVlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIHZhbHVlIOWApOOBruWPluW+ly4g5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50PigpOiBET01WYWx1ZVR5cGU8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSB2YWx1ZSBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpiB2YWx1ZSDlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZTogRE9NVmFsdWVUeXBlPFQ+KTogdGhpcztcblxuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlPzogRE9NVmFsdWVUeXBlPFQ+KTogYW55IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNNdWx0aVNlbGVjdCA9IChlbDogYW55KTogZWwgaXMgSFRNTFNlbGVjdEVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuICdzZWxlY3QnID09PSBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICYmIGVsLm11bHRpcGxlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTXVsdGlTZWxlY3QoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwuc2VsZWN0ZWRPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsIGFzIGFueSkudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5vIHN1cHBvcnQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4gYXMgRE9NSXRlcmFibGU8SFRNTElucHV0RWxlbWVudD4pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgaXNNdWx0aVNlbGVjdChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwub3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gKHZhbHVlIGFzIHN0cmluZ1tdKS5pbmNsdWRlcyhvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRGF0YVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWVzIGFsbCBgRE9NU3RyaW5nTWFwYCBzdG9yZSBzZXQgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBIVE1MNSBkYXRhLSog5bGe5oCn44GnIGBET01TdHJpbmdNYXBgIOOBq+agvOe0jeOBleOCjOOBn+WFqOODh+ODvOOCv+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKCk6IERPTURhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZSBhdCB0aGUgbmFtZWQgZGF0YSBzdG9yZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24sIGFzIHNldCBieSBkYXRhKGtleSwgdmFsdWUpIG9yIGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBrZXkg44Gn5oyH5a6a44GX44GfIEhUTUw1IGRhdGEtKiDlsZ7mgKflgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b3JlIGFyYml0cmFyeSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Lu75oSP44Gu44OH44O844K/44KS5qC857SNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGRhdGEgdmFsdWUgKG5vdCBvbmx5IGBzdHJpbmdgKVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5oyH5a6aICjmloflrZfliJfku6XlpJbjgoLlj5fku5jlj68pXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcsIHZhbHVlOiBUeXBlZERhdGEpOiB0aGlzO1xuXG4gICAgcHVibGljIGRhdGEoa2V5Pzogc3RyaW5nLCB2YWx1ZT86IFR5cGVkRGF0YSk6IERPTURhdGEgfCBUeXBlZERhdGEgfCB1bmRlZmluZWQgfCB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gc3VwcG9ydGVkIGRhdGFzZXQgZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGRhdGFzZXRcbiAgICAgICAgICAgIGNvbnN0IGRhdGFzZXQgPSB0aGlzWzBdLmRhdGFzZXQ7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgYWxsIGRhdGFcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBET01EYXRhID0ge307XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGRhdGFzZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGFbcHJvcF0gPSB0b1R5cGVkRGF0YShkYXRhc2V0W3Byb3BdKSBhcyBUeXBlZERhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0eXBlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB0b1R5cGVkRGF0YShkYXRhc2V0W2NhbWVsaXplKGtleSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcHJvcCA9IGNhbWVsaXplKGtleSB8fCAnJyk7XG4gICAgICAgICAgICBpZiAocHJvcCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudD4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IGVsLmRhdGFzZXQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhc2V0W3Byb3BdID0gZnJvbVR5cGVkRGF0YSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGRhdGEuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+ODh+ODvOOCv+OCkuODh+ODvOOCv+mgmOWfn+OBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZURhdGEoa2V5OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShrZXkpID8ga2V5Lm1hcChrID0+IGNhbWVsaXplKGspKSA6IFtjYW1lbGl6ZShrZXkpXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPEhUTUxFbGVtZW50Pikge1xuICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IGVsLmRhdGFzZXQ7XG4gICAgICAgICAgICBpZiAoZGF0YXNldCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YXNldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01Qcm9wZXJ0aWVzLCAnbm9Db25zdHJ1Y3RvcicpO1xuIiwiaW1wb3J0IHsgaXNGdW5jdGlvbiwgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93LCBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNFbXB0eVNlbGVjdG9yLFxuICAgIGlzU3RyaW5nU2VsZWN0b3IsXG4gICAgaXNEb2N1bWVudFNlbGVjdG9yLFxuICAgIGlzV2luZG93U2VsZWN0b3IsXG4gICAgaXNOb2RlU2VsZWN0b3IsXG4gICAgaXNJdGVyYWJsZVNlbGVjdG9yLFxufSBmcm9tICcuL2Jhc2UnO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBhcmVudCgpYCBhbmQgYHBhcmVudHMoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMgb2YgRE9NIGNsYXNzLlxuICogQGphIERPTSDjga7jg57jg4vjg5Tjg6Xjg6zjg7zjgrfjg6fjg7Pjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTU1hbmlwdWxhdGlvbnM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBNYW5pcHVsYXRpb25cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgY3VycmVudCBtYXRjaGVkIHNldCBvZiBlbGVtZW50cyBhZ2FpbnN0IGEgc2VsZWN0b3IsIGVsZW1lbnQsIG9yIFtbRE9NXV0gb2JqZWN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yKGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZ1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGlmICgoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaW5kb3dTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2luZG93ID09PSBlbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkb2N1bWVudCA9PT0gZWwgYXMgTm9kZSBhcyBEb2N1bWVudDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSBlbCBhcyBOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbSA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBwYXJlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7mnIDliJ3jga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzdHJpbmcgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjmloflrZfliJfjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PihzZWxlY3Rvcj86IHN0cmluZyk6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWxlbSBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gKGVsZW0gYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLmFkZChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudHMuYWRkKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ucGFyZW50c10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBhbmNlc3RvcnMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzdHJpbmcgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjmloflrZfliJfjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oc2VsZWN0b3I/OiBzdHJpbmcpOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzVW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3RvciwgRE9NIG5vZGUsIG9yIFtbRE9NXV0gb2JqZWN0XG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBpywg5oyH5a6a44GX44Gf44K744Os44Kv44K/44O844KE5p2h5Lu244Gr5LiA6Ie044GZ44KL6KaB57Sg44GM5Ye644Gm44GP44KL44G+44Gn6YG45oqe44GX44Gm5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzdHJpbmcgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjmloflrZfliJfjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHNVbnRpbDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBzdHJpbmcpOiBET008VD4ge1xuICAgICAgICBsZXQgcGFyZW50czogTm9kZVtdID0gW107XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnROb2RlID0gKGVsZW0gYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHdoaWxlICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KSH5pWw6KaB57Sg44GM5a++6LGh44Gr44Gq44KL44Go44GN44Gv5Y+N6LuiXG4gICAgICAgIGlmICgxIDwgdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcmVudHMgPSBbLi4ubmV3IFNldChwYXJlbnRzLnJldmVyc2UoKSldLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkKHBhcmVudHMpIGFzIERPTTxUPjtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTU1hbmlwdWxhdGlvbnMsICdub0NvbnN0cnVjdG9yJyk7XG5cbi8vIFRPRE86XG4gICAgLy90cmFuc2Zvcm0sXG4gICAgLy90cmFuc2l0aW9uLFxuICAgIC8vd2lkdGgsXG4gICAgLy9vdXRlcldpZHRoLFxuICAgIC8vaGVpZ2h0LFxuICAgIC8vb3V0ZXJIZWlnaHQsXG4gICAgLy9vZmZzZXQsXG4gICAgLy9oaWRlLCA8LSDjgoTjgonjgarjgYQ/XG4gICAgLy9zaG93LCA8LSDjgoTjgonjgarjgYQ/XG4gICAgLy9zdHlsZXMsXG4gICAgLy9jc3MsXG4gICAgLy90b0FycmF5LFxuICAgIC8vZWFjaCxcbiAgICAvL2ZvckVhY2gsXG4gICAgLy9maWx0ZXIsXG4gICAgLy9tYXAsXG4gICAgLy9odG1sLFxuICAgIC8vdGV4dCxcbiAgICAvL2luZGV4T2YsXG4gICAgLy9pbmRleCxcbiAgICAvL2VxLFxuICAgIC8vYXBwZW5kLFxuICAgIC8vYXBwZW5kVG8sXG4gICAgLy9wcmVwZW5kLFxuICAgIC8vcHJlcGVuZFRvLFxuICAgIC8vaW5zZXJ0QmVmb3JlLFxuICAgIC8vaW5zZXJ0QWZ0ZXIsXG4gICAgLy9uZXh0LFxuICAgIC8vbmV4dEFsbCxcbiAgICAvL3ByZXYsXG4gICAgLy9wcmV2QWxsLFxuICAgIC8vc2libGluZ3MsXG4gICAgLy9jbG9zZXN0LFxuICAgIC8vZmluZCxcbiAgICAvL2NoaWxkcmVuLFxuICAgIC8vcmVtb3ZlLFxuICAgIC8vZGV0YWNoLFxuICAgIC8vYWRkLFxuICAgIC8vZW1wdHksXG5cbi8vLy8vXG5cbi8vIGNvbnRlbnRzXG4vLyBwb3NpdGlvblxuLy8gc2Nyb2xsVG9wICh3aW5kb3cpIDwtIHNjcm9sbCAocHIyKVxuLy8gY2xvbmVcbi8vIHdyYXBcbi8vIHVud3JhcFxuLy8gcmVwbGFjZVdpdGhcbi8vIGZhZGUsIGZhZGVJbiwgZmFkZU91dCwgZmFkZVRvLCBmYWRlVG9nZ2xlIDwtIGFuaW1hdGlvbiAocHIzKVxuLy8gc2xpZGVVcCwgc2xpZGVEb3duLCBzbGlkZVRvZ2dsZSA8LSDjgoTjgonjgarjgYRcblxuLy8vXG5cbi8vIGZpcnN0XG4vLyBoYXNcbi8vIGxhc3Rcbi8vIGlubmVySGVpZ2h0XG4vLyBpbm5lcldpZHRoXG4vLyBuZXh0VW50aWxcbi8vIG9mZnNldFBhcmVudFxuLy8gb3V0ZXJIZWlnaHRcbi8vIG91dGVyV2lkdGhcbi8vIHByZXZVbnRpbFxuLy8gcmVwbGFjZUFsbFxuLy8gd3JhcEFsbFxuLy8gd3JhcElubmVyXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ3VzdG9tRXZlbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBET01FdmVudExpc3RuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEV2ZW50Q29udGV4dCB7XG4gICAgW2Nvb2tpZTogc3RyaW5nXTogQmluZEluZm87XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgPSAnfCcsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudCwgYW55W10+KCksXG4gICAgZXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnQsIEJpbmRFdmVudENvbnRleHQ+KCksXG4gICAgbGl2ZUV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50LCBCaW5kRXZlbnRDb250ZXh0PigpLFxufTtcblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBldmVudC1kYXRhIGZyb20gZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlFdmVudERhdGEoZXZlbnQ6IEV2ZW50KTogYW55W10ge1xuICAgIGNvbnN0IGRhdGEgPSBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5nZXQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpIHx8IFtdO1xuICAgIGRhdGEudW5zaGlmdChldmVudCk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZXZlbnQtZGF0YSB3aXRoIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnREYXRhKGVsZW06IEVsZW1lbnQsIGV2ZW50RGF0YTogYW55W10pOiB2b2lkIHtcbiAgICBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5zZXQoZWxlbSwgZXZlbnREYXRhKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBkZWxldGUgZXZlbnQtZGF0YSBieSBlbGVtZW50ICovXG5mdW5jdGlvbiBkZWxldGVFdmVudERhdGEoZWxlbTogRWxlbWVudCk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmRlbGV0ZShlbGVtKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IGV2ZW50IGNvb2tpZSBmcm9tIGV2ZW50IG5hbWUsIHNlbGVjdG9yLCBvcHRpb25zICovXG5mdW5jdGlvbiB0b0Nvb2tpZShldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgZGVsZXRlIG9wdGlvbnMub25jZTtcbiAgICByZXR1cm4gYCR7ZXZlbnR9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucyl9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7c2VsZWN0b3J9YDtcbn1cblxuLyoqIEBpbnRlcm5hbCBnZXQgbGlzdGVuZXIgaGFuZGxlcnMgY29udGV4dCBieSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbGVtOiBFbGVtZW50LCBldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkgYXMgQmluZEV2ZW50Q29udGV4dDtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgZnJvbSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoXG4gICAgZWxlbTogRWxlbWVudCxcbiAgICBldmVudHM6IHN0cmluZ1tdLFxuICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIsXG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXIsXG4gICAgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbik6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWxlbSwgZXZlbnQsIHNlbGVjdG9yLCBvcHRpb25zLCB0cnVlKTtcbiAgICAgICAgaWYgKHJlZ2lzdGVyZWQgJiYgIXJlZ2lzdGVyZWQuaGFzKGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcmVnaXN0ZXJlZC5hZGQobGlzdGVuZXIpO1xuICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgcHJveHksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lciAmJiBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBhbGwgZXZlbnQgYW5kIGhhbmRsZXIgYnkgZWxlbWVudCwgZm9yIGFsbCBgb2ZmKClgICovXG5mdW5jdGlvbiBleHRyYWN0QWxsSGFuZGxlcnMoZWxlbTogRWxlbWVudCk6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogYW55OyB9W10ge1xuICAgIGNvbnN0IGhhbmRsZXJzOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IGFueTsgfVtdID0gW107XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBPYmplY3Qua2V5cyhjb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzZWVkWzBdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBKU09OLnBhcnNlKHNlZWRbMV0pO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBjb250ZXh0W2Nvb2tpZV0uaGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7IGV2ZW50LCBoYW5kbGVyOiBoYW5kbGVyLnByb3h5LCBvcHRpb25zIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiBsaXZlRXZlbnRMaXN0ZW5lcnMuZGVsZXRlKGVsZW0pO1xuXG4gICAgcmV0dXJuIGhhbmRsZXJzO1xufVxuXG4vKiogQGludGVybmFsIHBhcnNlIGV2ZW50IGFyZ3MgKi9cbmZ1bmN0aW9uIHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3M6IGFueVtdKTogeyB0eXBlOiBzdHJpbmdbXTsgc2VsZWN0b3I6IHN0cmluZzsgbGlzdGVuZXI6IERPTUV2ZW50TGlzdG5lcjsgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnM7IH0ge1xuICAgIGxldCBbdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgIFt0eXBlLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgICAgICBzZWxlY3RvciA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICB0eXBlID0gIXR5cGUgPyBbXSA6IChpc0FycmF5KHR5cGUpID8gdHlwZSA6IFt0eXBlXSk7XG4gICAgc2VsZWN0b3IgPSBzZWxlY3RvciB8fCAnJztcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSBpZiAodHJ1ZSA9PT0gb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0geyBjYXB0dXJlOiB0cnVlIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9ub1RyaWdnZXIgPSBbJ3Jlc2l6ZScsICdzY3JvbGwnXTtcblxuLyoqIEBpbnRlcm5hbCBldmVudC1zaG9ydGN1dCBpbXBsICovXG5mdW5jdGlvbiBldmVudFNob3J0Y3V0PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4odGhpczogRE9NRXZlbnRzPFQ+LCBuYW1lOiBzdHJpbmcsIGhhbmRsZXI/OiBFdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogRE9NRXZlbnRzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSBoYW5kbGVyKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01FdmVudHMgPE5vZGU+IGFzIERPTUV2ZW50czxFbGVtZW50Pikge1xuICAgICAgICAgICAgaWYgKCFfbm9UcmlnZ2VyLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZWxbbmFtZV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsW25hbWVdKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkudHJpZ2dlcihuYW1lIGFzIGFueSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKG5hbWUgYXMgYW55LCBoYW5kbGVyIGFzIGFueSwgb3B0aW9ucyk7XG4gICAgfVxufVxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cbmV4cG9ydCB0eXBlIERPTUV2ZW50TWFwPFQ+XG4gICAgPSBUIGV4dGVuZHMgV2luZG93ID8gV2luZG93RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBEb2N1bWVudCA/IERvY3VtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MQm9keUVsZW1lbnQgPyBIVE1MQm9keUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxGcmFtZVNldEVsZW1lbnQgPyBIVE1MRnJhbWVTZXRFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWFycXVlZUVsZW1lbnQgPyBIVE1MTWFycXVlZUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxWaWRlb0VsZW1lbnQgPyBIVE1MVmlkZW9FbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWVkaWFFbGVtZW50ID8gSFRNTE1lZGlhRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEVsZW1lbnQgPyBIVE1MRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRWxlbWVudCA/IEVsZW1lbnRFdmVudE1hcFxuICAgIDogR2xvYmFsRXZlbnRIYW5kbGVyc0V2ZW50TWFwO1xuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBldmVudCBtYW5hZ2VtZW50IG9mIERPTSBjbGFzcy5cbiAqIEBqYSBET00g44Gu44Kk44OZ44Oz44OI566h55CG44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FdmVudHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBiYXNpY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oLi4uYXJnczogYW55W10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTGl2ZUV2ZW50KGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBjb25zdCBldmVudERhdGEgPSBxdWVyeUV2ZW50RGF0YShlKTtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGUudGFyZ2V0IGFzIEVsZW1lbnQgfCBudWxsKTtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KCR0YXJnZXRbMF0sIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFyZW50IG9mICR0YXJnZXQucGFyZW50cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudCkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseShwYXJlbnQsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVFdmVudCh0aGlzOiBET01FdmVudHM8VEVsZW1lbnQ+LCBlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgcXVlcnlFdmVudERhdGEoZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJveHkgPSBzZWxlY3RvciA/IGhhbmRsZUxpdmVFdmVudCA6IGhhbmRsZUV2ZW50O1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICByZWdpc3RlckV2ZW50TGlzdGVuZXJIYW5kbGVycyhlbCwgZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIHByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlPzoga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgbGlzdGVuZXI/OiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KC4uLmFyZ3M6IGFueVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGlmIChldmVudHMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0QWxsSGFuZGxlcnMoZWwpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IGhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGhhbmRsZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7IC8vIGJhY2t3YXJkIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVyc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLnByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmRlbGV0ZShoYW5kbGVyLmxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBsaXN0ZW5lcjogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oLi4uYXJnczogYW55W10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCBvcHRzID0geyAuLi5vcHRpb25zLCAuLi57IG9uY2U6IHRydWUgfSB9O1xuXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiBvbmNlSGFuZGxlcih0aGlzOiBET01FdmVudHM8VEVsZW1lbnQ+LCAuLi5ldmVudEFyZ3M6IGFueVtdKTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBldmVudEFyZ3MpO1xuICAgICAgICAgICAgc2VsZi5vZmYodHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgICAgICAgICBkZWxldGUgb25jZUhhbmRsZXIub3JpZ2luO1xuICAgICAgICB9XG4gICAgICAgIG9uY2VIYW5kbGVyLm9yaWdpbiA9IGxpc3RlbmVyO1xuICAgICAgICByZXR1cm4gdGhpcy5vbih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhbGwgaGFuZGxlcnMgYWRkZWQgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBq+WvvuOBl+OBpuOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS4gLyBgRXZlbnRgIGluc3RhbmNlIG9yIGBFdmVudGAgaW5zdGFuY2UgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJcgLyBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCuemFjeWIl1xuICAgICAqIEBwYXJhbSBldmVudERhdGFcbiAgICAgKiAgLSBgZW5gIG9wdGlvbmFsIHNlbmRpbmcgZGF0YS5cbiAgICAgKiAgLSBgamFgIOmAgeS/oeOBmeOCi+S7u+aEj+OBruODh+ODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHNlZWQ6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10gfCBFdmVudCB8IEV2ZW50W10gfCAoa2V5b2YgVEV2ZW50TWFwIHwgRXZlbnQpW10sXG4gICAgICAgIC4uLmV2ZW50RGF0YTogYW55W11cbiAgICApOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY29udmVydCA9IChhcmc6IGtleW9mIFRFdmVudE1hcCB8IEV2ZW50KTogRXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGFyZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUV2ZW50KGFyZywge1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IGV2ZW50RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZyBhcyBFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBldmVudHMgPSBpc0FycmF5KHNlZWQpID8gc2VlZCA6IFtzZWVkXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgY29uc3QgZSA9IGNvbnZlcnQoZXZlbnQpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUV2ZW50czxOb2RlPiBhcyBET01FdmVudHM8RWxlbWVudD4pIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlckV2ZW50RGF0YShlbCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUV2ZW50RGF0YShlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiB1dGlsaXR5XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIFtbb25jZV1dKCd0cmFuc2l0aW9uZW5kJykuXG4gICAgICogQGphIFtbb25jZV1dKCd0cmFuc2l0aW9uZW5kJykg44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGB0cmFuc2l0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYHRyYW5zaXRpb25lbmRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJhbnNpdGlvbkVuZChjYWxsYmFjazogKGV2ZW50OiBUcmFuc2l0aW9uRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEhUTUxFbGVtZW50PjtcbiAgICAgICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IFRyYW5zaXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ3RyYW5zaXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgc2VsZi5vbigndHJhbnNpdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciBbW29uY2VdXSgnYW5pbWF0aW9uZW5kJykuXG4gICAgICogQGphIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYGFuaW1hdGlvbmVuZGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGBhbmltYXRpb25lbmRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IEFuaW1hdGlvbkV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxIVE1MRWxlbWVudD47XG4gICAgICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBBbmltYXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ2FuaW1hdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBzZWxmLm9uKCdhbmltYXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBCaW5kIG9uZSBvciB0d28gaGFuZGxlcnMgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMsIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIGBtb3VzZWVudGVyYCBhbmQgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50cy5cbiAgICAgKiBAamEgMeOBpOOBvuOBn+OBrzLjgaTjga7jg4/jg7Pjg4njg6njgpLmjIflrprjgZcsIOS4gOiHtOOBl+OBn+imgee0oOOBriBgbW91c2VlbnRlcmAsIGBtb3VzZWxlYXZlYCDjgpLmpJznn6VcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVySW4oT3V0KVxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWVudGVyYCB0aGUgZWxlbWVudC4gPGJyPlxuICAgICAqICAgICAgICBJZiBoYW5kbGVyIHNldCBvbmx5IG9uZSwgYSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudCwgdG9vLlxuICAgICAqICAtIGBqYWAgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4gPGJyPlxuICAgICAqICAgICAgICAgIOW8leaVsOOBjDHjgaTjgafjgYLjgovloLTlkIgsIGBtb3VzZWxlYXZlYCDjg4/jg7Pjg4njg6njgoLlhbzjga3jgotcbiAgICAgKiBAcGFyYW0gaGFuZGxlck91dFxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIGBtb3VzZWxlYXZlYCDjg4/jg7Pjg4njg6njgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaG92ZXIoaGFuZGxlckluOiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgaGFuZGxlck91dD86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKTogdGhpcyB7XG4gICAgICAgIGhhbmRsZXJPdXQgPSBoYW5kbGVyT3V0IHx8IGhhbmRsZXJJbjtcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2VlbnRlcihoYW5kbGVySW4pLm1vdXNlbGVhdmUoaGFuZGxlck91dCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBldmVudC1zaG9ydGN1dFxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBkYmxjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBkYmxjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGJsY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2RibGNsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBibHVyYCBldmVudC5cbiAgICAgKiBAamEgYGJsdXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGJsdXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2JsdXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1cyhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXMnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzaW5gIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNpbmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNpbihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNpbicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3Vzb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c291dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5dXBgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5dXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXl1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5ZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBrZXlkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlkb3duKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlwcmVzc2AgZXZlbnQuXG4gICAgICogQGphIGBrZXlwcmVzc2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5cHJlc3MoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXByZXNzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzdWJtaXRgIGV2ZW50LlxuICAgICAqIEBqYSBgc3VibWl0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdWJtaXQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3N1Ym1pdCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY29udGV4dG1lbnVgIGV2ZW50LlxuICAgICAqIEBqYSBgY29udGV4dG1lbnVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNvbnRleHRtZW51KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjb250ZXh0bWVudScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2hhbmdlYCBldmVudC5cbiAgICAgKiBAamEgYGNoYW5nZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjaGFuZ2UnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZG93bihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vtb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW1vdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2V1cGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWVudGVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZW50ZXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZW50ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VsZWF2ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VsZWF2ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VsZWF2ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW91dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdmVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3ZlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdmVyKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW92ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoc3RhcnRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hzdGFydGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hzdGFydChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hzdGFydCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hlbmRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hlbmRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoZW5kKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGVuZCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2htb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNobW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2htb3ZlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaG1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoY2FuY2VsYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoY2FuY2VsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGNhbmNlbChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hjYW5jZWwnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHJlc2l6ZWAgZXZlbnQuXG4gICAgICogQGphIGByZXNpemVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2l6ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgncmVzaXplJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzY3JvbGxgIGV2ZW50LlxuICAgICAqIEBqYSBgc2Nyb2xsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGwoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Njcm9sbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRXZlbnRzLCAnbm9Db25zdHJ1Y3RvcicpO1xuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuaW1wb3J0IHsgbWl4aW5zIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIEVsZW1lbnRpZnlTZWVkLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBlbGVtZW50aWZ5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERPTUJhc2UgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgRE9NUHJvcGVydGllcyB9IGZyb20gJy4vcHJvcGVydGllcyc7XG5pbXBvcnQgeyBET01NYW5pcHVsYXRpb25zIH0gZnJvbSAnLi9tYW5pcHVsYXRpb25zJztcbmltcG9ydCB7IERPTUV2ZW50cyB9IGZyb20gJy4vZXZlbnRzJztcblxuLyoqXG4gKiBAZW4gVGhpcyBpbnRlcmZhY2UgcHJvdmlkZXMgRE9NIG9wZXJhdGlvbnMgbGlrZSBgalF1ZXJ5YCBsaWJyYXJ5LlxuICogQGphIGBqUXVlcnlgIOOBruOCiOOBhuOBqkRPTSDmk43kvZzjgpLmj5DkvpvjgZnjgovjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+XG4gICAgZXh0ZW5kcyBET01CYXNlPFQ+LCBET01Qcm9wZXJ0aWVzPFQ+LCBET01NYW5pcHVsYXRpb25zPFQ+LCBET01FdmVudHM8VD5cbnsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcblxuZXhwb3J0IHR5cGUgRE9NU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IEhUTUxFbGVtZW50PiA9IEVsZW1lbnRpZnlTZWVkPFQ+IHwgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFQgOiBuZXZlcj47XG5leHBvcnQgdHlwZSBET01SZXN1bHQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4gPSBUIGV4dGVuZHMgRE9NPEVsZW1lbnRCYXNlPiA/IFQgOiAoVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gRE9NPFQ+IDogRE9NPEhUTUxFbGVtZW50Pik7XG5leHBvcnQgdHlwZSBET01JdGVyYXRlQ2FsbGJhY2s8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBib29sZWFuIHwgdm9pZDtcblxuLyoqXG4gKiBAZW4gVGhpcyBjbGFzcyBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m1xuICovXG5leHBvcnQgY2xhc3MgRE9NQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoRE9NQmFzZSwgRE9NUHJvcGVydGllcywgRE9NTWFuaXB1bGF0aW9ucywgRE9NRXZlbnRzKSB7XG4gICAgLyoqXG4gICAgICogcHJpdmF0ZSBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoZWxlbWVudHM6IEVsZW1lbnRCYXNlW10pIHtcbiAgICAgICAgc3VwZXIoZWxlbWVudHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tET01dXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NQ2xhc3NdXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NQ2xhc3NdXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICogQHJldHVybnMgW1tET01DbGFzc11dIGluc3RhbmNlLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQpOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoc2VsZWN0b3IgJiYgIWNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIERPTUNsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdG9yIGFzIGFueTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IERPTUNsYXNzKChlbGVtZW50aWZ5KHNlbGVjdG9yIGFzIEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0KSkpIGFzIGFueTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzZXR1cCB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUNsYXNzIH0gZnJvbSAnLi9jbGFzcyc7XG5cbi8vIGluaXQgZm9yIHN0YXRpY1xuc2V0dXAoRE9NQ2xhc3MucHJvdG90eXBlLCBET01DbGFzcy5jcmVhdGUpO1xuXG5leHBvcnQgKiBmcm9tICcuL2V4cG9ydHMnO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyBkZWZhdWx0IH0gZnJvbSAnLi9leHBvcnRzJztcbiJdLCJuYW1lcyI6WyJzYWZlIiwiZG9jdW1lbnQiLCJpc0Z1bmN0aW9uIiwiY2xhc3NOYW1lIiwid2luZG93IiwiaXNBcnJheSIsImlzU3RyaW5nIiwidG9UeXBlZERhdGEiLCJjYW1lbGl6ZSIsImZyb21UeXBlZERhdGEiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSIsIiQiLCJDdXN0b21FdmVudCIsIm1peGlucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFFQTs7OztJQUlBLE1BQU0sR0FBRyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sR0FBRyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sR0FBRyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDOztJQ0t6Qzs7Ozs7Ozs7Ozs7O0FBWUEsYUFBZ0IsVUFBVSxDQUF5QixJQUF3QixFQUFFLFVBQXdCQyxHQUFRO1FBQ3pHLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDUCxPQUFPLEVBQUUsQ0FBQztTQUNiO1FBRUQsTUFBTSxRQUFRLEdBQWMsRUFBRSxDQUFDO1FBRS9CLElBQUk7WUFDQSxJQUFJLFFBQVEsS0FBSyxPQUFPLElBQUksRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN6QixJQUFJLElBQUksQ0FBQyxR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
