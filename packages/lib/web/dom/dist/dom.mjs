/*!
 * @cdp/dom 0.9.17
 *   dom utility module
 */

import { safe, isFunction, className, getGlobalNamespace, isNumber, setMixClassAttribute, isArray, isString, assignValue, toTypedData, camelize, fromTypedData, noop, dasherize, classify, combination, mixins } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
 */
/** @internal */ const window = safe(globalThis.window);
/** @internal */ const document = safe(globalThis.document);
/** @internal */ const CustomEvent = safe(globalThis.CustomEvent);
/** @internal */ const requestAnimationFrame = safe(globalThis.requestAnimationFrame);

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
                if (isFunction(context.getElementById) && ('#' === selector[0]) && !/[ .<>:~]/.exec(selector)) {
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
        console.warn(`elementify(${className(seed)}, ${className(context)}), failed. [error:${e}]`);
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
    return (isNumber(value) && 0 <= value) ? value : undefined;
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
        getGlobalNamespace('CDP_DOM_EVAL_RETURN_VALUE_BRIDGE');
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
        const classes = isArray(className) ? className : [className];
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
        const classes = isArray(className) ? className : [className];
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
        const classes = isArray(className) ? className : [className];
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
        if (null == value && isString(key)) {
            // get first element property
            const first = this[0];
            return first && first[key];
        }
        else {
            // set property
            for (const el of this) {
                if (null != value) {
                    // single
                    assignValue(el, key, value);
                }
                else {
                    // multiple
                    for (const name of Object.keys(key)) {
                        if (name in el) {
                            assignValue(el, name, key[name]);
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
        else if (undefined === value && isString(key)) {
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
        const attrs = isArray(name) ? name : [name];
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
                if (isArray(value) && isMultiSelectElement(el)) {
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
                    assignValue(data, prop, toTypedData(dataset[prop]));
                }
                return data;
            }
            else {
                // typed value
                return toTypedData(dataset[camelize(key)]);
            }
        }
        else {
            // set value
            const prop = camelize(key ?? '');
            if (prop) {
                for (const el of this) {
                    if (isNodeHTMLOrSVGElement(el)) {
                        assignValue(el.dataset, prop, fromTypedData(value));
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
        const props = isArray(key) ? key.map(k => camelize(k)) : [camelize(key)];
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
setMixClassAttribute(DOMAttributes, 'protoExtendsOnly');

/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */
/** @internal helper for `is()` and `filter()` */
function winnow(selector, dom, validCallback, invalidCallback) {
    invalidCallback = invalidCallback ?? noop;
    let retval;
    for (const [index, el] of dom.entries()) {
        if (isFunction(selector)) {
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
            if (isString(selector)) {
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
        if (!isString(selector)) {
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
        else if (isString(selector)) {
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
setMixClassAttribute(DOMTraversing, 'protoExtendsOnly');

/** @internal check HTML string */
function isHTMLString(src) {
    const subject = src.trim();
    return ('<' === subject.slice(0, 1)) && ('>' === subject.slice(-1));
}
/** @internal helper for `append()`, `prepend()`, `before()` and `after()`  */
function toNodeSet(...contents) {
    const nodes = new Set();
    for (const content of contents) {
        if ((isString(content) && !isHTMLString(content)) || isNode(content)) {
            nodes.add(content);
        }
        else {
            const $dom = dom(content);
            for (const node of $dom) {
                if (isString(node) || (isNode(node) && Node.DOCUMENT_NODE !== node.nodeType)) {
                    nodes.add(node);
                }
            }
        }
    }
    return nodes;
}
/** @internal helper for `before()` and `after()`  */
function toNode(node) {
    if (isString(node)) {
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
        else if (isString(htmlString)) {
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
setMixClassAttribute(DOMManipulation, 'protoExtendsOnly');

/** @internal helper for `css()` */
function ensureChainCaseProperies(props) {
    const retval = {};
    for (const key in props) {
        assignValue(retval, dasherize(key), props[key]);
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
            return dom[0].document.documentElement[`client${classify(type)}`];
        }
        else if (isTypeDocument(dom)) {
            // (scrollWidth / scrollHeight)
            return dom[0].documentElement[`scroll${classify(type)}`];
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
        return dom.css(type, isString(value) ? value : `${value}px`);
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
                return el[`client${classify(type)}`];
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
        const isTextProp = isString(value);
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
    if (!isNumber(value) && !isString(value)) {
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
            return dom[0][`inner${classify(type)}`];
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
        const isTextProp = isString(value);
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
        return el[`offset${classify(type)}`];
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
            if (isString(name)) {
                return null == value ? '' : this;
            }
            else if (isArray(name)) {
                return {};
            }
            else {
                return this;
            }
        }
        if (isString(name)) {
            if (undefined === value) {
                // get property single
                const el = this[0];
                return getComputedStyleFrom(el).getPropertyValue(dasherize(name));
            }
            else {
                // set property single
                const propName = dasherize(name);
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
        else if (isArray(name)) {
            // get multiple properties
            const el = this[0];
            const view = getDefaultView(el);
            const props = {};
            for (const key of name) {
                const propName = dasherize(key);
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
setMixClassAttribute(DOMStyles, 'protoExtendsOnly');

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
            combos.push(...combination(namespaces, i));
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
    if (isFunction(selector)) {
        [type, listener, options] = args;
        selector = undefined;
    }
    type = !type ? [] : (isArray(type) ? type : [type]);
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
                if (isFunction(el[name])) {
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
    isFunction(callback) && self.on(eventName, fireCallBack);
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
            if (isString(arg)) {
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
        const events = isArray(seed) ? seed : [seed];
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
setMixClassAttribute(DOMEvents, 'protoExtendsOnly');

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
    let enableTop = isNumber(top);
    let enableLeft = isNumber(left);
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
        if (notify && isFunction(callback)) {
            callback();
        }
        return;
    }
    const calcMetrics = (enable, base, initialValue, type) => {
        if (!enable) {
            return { max: 0, new: 0, initial: 0 };
        }
        const maxValue = el[`scroll${classify(type)}`] - getOffsetSize(el, type);
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
        if (isFunction(easing)) {
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
            if (isFunction(callback)) {
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
setMixClassAttribute(DOMScroll, 'protoExtendsOnly');

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
                noop(el.offsetHeight);
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
setMixClassAttribute(DOMEffects, 'protoExtendsOnly');

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
class DOMClass extends mixins(DOMBase, DOMAttributes, DOMTraversing, DOMManipulation, DOMStyles, DOMEvents, DOMScroll, DOMEffects) {
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
setMixClassAttribute(DOMClass, 'instanceOf', null);
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

export { dom as default, dom, isDOMClass };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwidXRpbHMudHMiLCJkZXRlY3Rpb24udHMiLCJzdGF0aWMudHMiLCJiYXNlLnRzIiwiYXR0cmlidXRlcy50cyIsInRyYXZlcnNpbmcudHMiLCJtYW5pcHVsYXRpb24udHMiLCJzdHlsZXMudHMiLCJldmVudHMudHMiLCJzY3JvbGwudHMiLCJlZmZlY3RzLnRzIiwiY2xhc3MudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoLjgqrjg5bjgrjjgqfjgq/jg4jnrYnjga7lrZjlnKjjgpLkv53oqLzjgZnjgotcbiAqL1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgICAgICAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBDdXN0b21FdmVudCAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuQ3VzdG9tRXZlbnQpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gc2FmZShnbG9iYWxUaGlzLnJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBOdWxsaXNoLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NOYW1lLFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QmFzZSA9IE5vZGUgfCBXaW5kb3c7XG5leHBvcnQgdHlwZSBFbGVtZW50UmVzdWx0PFQ+ID0gVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IEhUTUxFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE51bGxpc2g7XG5leHBvcnQgdHlwZSBFbGVtZW50aWZ5U2VlZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gVCB8IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUW10gOiBuZXZlcikgfCBOb2RlTGlzdE9mPFQgZXh0ZW5kcyBOb2RlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIFF1ZXJ5Q29udGV4dCA9IFBhcmVudE5vZGUgJiBQYXJ0aWFsPE5vbkVsZW1lbnRQYXJlbnROb2RlPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93Q29udGV4dCh4OiB1bmtub3duKTogeCBpcyBXaW5kb3cge1xuICAgIHJldHVybiAoeCBhcyBXaW5kb3cpPy5wYXJlbnQgaW5zdGFuY2VvZiBXaW5kb3c7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBFbGVtZW50UmVzdWx0PFQ+W10ge1xuICAgIGlmICghc2VlZCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29udGV4dCA9IGNvbnRleHQgPz8gZG9jdW1lbnQ7XG4gICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2Ygc2VlZCkge1xuICAgICAgICAgICAgY29uc3QgaHRtbCA9IHNlZWQudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGh0bWwuc3RhcnRzV2l0aCgnPCcpICYmIGh0bWwuZW5kc1dpdGgoJz4nKSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcmt1cFxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gaHRtbDtcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0LmdldEVsZW1lbnRCeUlkKSAmJiAoJyMnID09PSBzZWxlY3RvclswXSkgJiYgIS9bIC48Pjp+XS8uZXhlYyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcHVyZSBJRCBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbCA9IGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3Iuc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgZWwgJiYgZWxlbWVudHMucHVzaChlbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgnYm9keScgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJvZHlcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlciBzZWxlY3RvcnNcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5jb250ZXh0LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoKHNlZWQgYXMgTm9kZSkubm9kZVR5cGUgfHwgaXNXaW5kb3dDb250ZXh0KHNlZWQpKSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmICgoc2VlZCBhcyBhbnkpWzBdLm5vZGVUeXBlIHx8IGlzV2luZG93Q29udGV4dCgoc2VlZCBhcyBhbnkpWzBdKSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gcm9vdGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdIHtcbiAgICBjb25zdCBwYXJzZSA9IChlbDogRWxlbWVudCwgcG9vbDogUGFyZW50Tm9kZVtdKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IHJvb3QgPSAoZWwgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSA/IGVsLmNvbnRlbnQgOiBlbDtcbiAgICAgICAgcG9vbC5wdXNoKHJvb3QpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZXMgPSByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiB0ZW1wbGF0ZXMpIHtcbiAgICAgICAgICAgIHBhcnNlKHQsIHBvb2wpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJvb3RzOiBQYXJlbnROb2RlW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZWxlbWVudGlmeShzZWVkLCBjb250ZXh0KSkge1xuICAgICAgICBwYXJzZShlbCBhcyBFbGVtZW50LCByb290cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3RzIGFzIEVsZW1lbnRSZXN1bHQ8VD5bXTtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIEZvciBlYXNpbmcgYHN3aW5nYCB0aW1pbmctZnVuY3Rpb24uXG4gKiBAamEgZWFzaW5nIGBzd2luZ2Ag55So44K/44Kk44Of44Oz44Kw6Zai5pWwXG4gKlxuICogQHJlZmVyZW5jZVxuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvOTI0NTAzMC9sb29raW5nLWZvci1hLXN3aW5nLWxpa2UtZWFzaW5nLWV4cHJlc3NpYmxlLWJvdGgtd2l0aC1qcXVlcnktYW5kLWNzczNcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzUyMDczMDEvanF1ZXJ5LWVhc2luZy1mdW5jdGlvbnMtd2l0aG91dC11c2luZy1hLXBsdWdpblxuICpcbiAqIEBwYXJhbSBwcm9ncmVzcyBbMCAtIDFdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzd2luZyhwcm9ncmVzczogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gMC41IC0gKE1hdGguY29zKHByb2dyZXNzICogTWF0aC5QSSkgLyAyKTtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIERPTVN0YXRpYy51dGlscy5ldmFsdWF0ZSB8IGV2YWx1YXRlfSgpIG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIERPTVN0YXRpYy51dGlscy5ldmFsdWF0ZSB8IGV2YWx1YXRlfSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2YWxPcHRpb25zIHtcbiAgICB0eXBlPzogc3RyaW5nO1xuICAgIHNyYz86IHN0cmluZztcbiAgICBub25jZT86IHN0cmluZztcbiAgICBub01vZHVsZT86IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3NjcmlwdHNBdHRyczogKGtleW9mIEV2YWxPcHRpb25zKVtdID0gW1xuICAgICd0eXBlJyxcbiAgICAnc3JjJyxcbiAgICAnbm9uY2UnLFxuICAgICdub01vZHVsZScsXG5dO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGUoY29kZTogc3RyaW5nLCBvcHRpb25zPzogRWxlbWVudCB8IEV2YWxPcHRpb25zLCBjb250ZXh0PzogRG9jdW1lbnQgfCBudWxsKTogYW55IHtcbiAgICBjb25zdCBkb2M6IERvY3VtZW50ID0gY29udGV4dCA/PyBkb2N1bWVudDtcbiAgICBjb25zdCBzY3JpcHQgPSBkb2MuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnRleHQgPSBgQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UgPSAoKCkgPT4geyByZXR1cm4gJHtjb2RlfTsgfSkoKTtgO1xuXG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIF9zY3JpcHRzQXR0cnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IChvcHRpb25zIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pW2F0dHJdIHx8IChvcHRpb25zIGFzIEVsZW1lbnQpPy5nZXRBdHRyaWJ1dGU/LihhdHRyKTtcbiAgICAgICAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBleGVjdXRlXG4gICAgdHJ5IHtcbiAgICAgICAgZ2V0R2xvYmFsTmFtZXNwYWNlKCdDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRScpO1xuICAgICAgICBkb2MuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpLnBhcmVudE5vZGUhLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICAgIGNvbnN0IHJldHZhbCA9IChnbG9iYWxUaGlzIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgKGdsb2JhbFRoaXMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSddO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IGRvY3VtZW50LCBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcblxuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0RXZlbnRNYXAge1xuICAgICdjb25uZWN0ZWQnOiBFdmVudDtcbiAgICAnZGlzY29ubmVjdGVkJzogRXZlbnQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBPYnNlcnZlckNvbnRleHQge1xuICAgIHRhcmdldHM6IFNldDxOb2RlPjtcbiAgICBvYnNlcnZlcjogTXV0YXRpb25PYnNlcnZlcjtcbn1cblxuY29uc3QgX29ic2VydmVyTWFwID0gbmV3IE1hcDxOb2RlLCBPYnNlcnZlckNvbnRleHQ+KCk7XG5cbmNvbnN0IHF1ZXJ5T2JzZXJ2ZWROb2RlID0gKG5vZGU6IE5vZGUpOiBOb2RlIHwgdW5kZWZpbmVkID0+IHtcbiAgICBmb3IgKGNvbnN0IFtvYnNlcnZlZE5vZGUsIGNvbnRleHRdIG9mIF9vYnNlcnZlck1hcCkge1xuICAgICAgICBpZiAoY29udGV4dC50YXJnZXRzLmhhcyhub2RlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmVkTm9kZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuY29uc3QgZGlzcGF0Y2hUYXJnZXQgPSAobm9kZTogTm9kZSwgZXZlbnQ6IEV2ZW50LCBub2RlSW46IFdlYWtTZXQ8Tm9kZT4sIG5vZGVPdXQ6IFdlYWtTZXQ8Tm9kZT4pOiB2b2lkID0+IHtcbiAgICBpZiAocXVlcnlPYnNlcnZlZE5vZGUobm9kZSkgJiYgIW5vZGVJbi5oYXMobm9kZSkpIHtcbiAgICAgICAgbm9kZU91dC5kZWxldGUobm9kZSk7XG4gICAgICAgIG5vZGVJbi5hZGQobm9kZSk7XG4gICAgICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZE5vZGVzKSB7XG4gICAgICAgIGRpc3BhdGNoVGFyZ2V0KGNoaWxkLCBldmVudCwgbm9kZUluLCBub2RlT3V0KTtcbiAgICB9XG59O1xuXG5jb25zdCAgZGlzcGF0Y2hBbGwgPSAobm9kZXM6IE5vZGVMaXN0LCB0eXBlOiBzdHJpbmcsIG5vZGVJbjogV2Vha1NldDxOb2RlPiwgbm9kZU91dDogV2Vha1NldDxOb2RlPik6IHZvaWQgPT4ge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICBOb2RlLkVMRU1FTlRfTk9ERSA9PT0gbm9kZS5ub2RlVHlwZSAmJiBkaXNwYXRjaFRhcmdldChcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pLFxuICAgICAgICAgICAgbm9kZUluLFxuICAgICAgICAgICAgbm9kZU91dCxcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG5jb25zdCBzdGFydCA9IChvYnNlcnZlZE5vZGU6IE5vZGUpOiBPYnNlcnZlckNvbnRleHQgPT4ge1xuICAgIGNvbnN0IGNvbm5lY3RlZCA9IG5ldyBXZWFrU2V0PE5vZGU+KCk7XG4gICAgY29uc3QgZGlzY29ubmVjdGVkID0gbmV3IFdlYWtTZXQ8Tm9kZT4oKTtcblxuICAgIGNvbnN0IGNoYW5nZXMgPSAocmVjb3JkczogTXV0YXRpb25SZWNvcmRbXSk6IHZvaWQgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBkaXNwYXRjaEFsbChyZWNvcmQucmVtb3ZlZE5vZGVzLCAnZGlzY29ubmVjdGVkJywgZGlzY29ubmVjdGVkLCBjb25uZWN0ZWQpO1xuICAgICAgICAgICAgZGlzcGF0Y2hBbGwocmVjb3JkLmFkZGVkTm9kZXMsICdjb25uZWN0ZWQnLCBjb25uZWN0ZWQsIGRpc2Nvbm5lY3RlZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgY29udGV4dDogT2JzZXJ2ZXJDb250ZXh0ID0ge1xuICAgICAgICB0YXJnZXRzOiBuZXcgU2V0KCksXG4gICAgICAgIG9ic2VydmVyOiBuZXcgTXV0YXRpb25PYnNlcnZlcihjaGFuZ2VzKSxcbiAgICB9O1xuICAgIF9vYnNlcnZlck1hcC5zZXQob2JzZXJ2ZWROb2RlLCBjb250ZXh0KTtcbiAgICBjb250ZXh0Lm9ic2VydmVyLm9ic2VydmUob2JzZXJ2ZWROb2RlLCB7IGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KTtcblxuICAgIHJldHVybiBjb250ZXh0O1xufTtcblxuY29uc3Qgc3RvcEFsbCA9ICgpOiB2b2lkID0+IHtcbiAgICBmb3IgKGNvbnN0IFssIGNvbnRleHRdIG9mIF9vYnNlcnZlck1hcCkge1xuICAgICAgICBjb250ZXh0LnRhcmdldHMuY2xlYXIoKTtcbiAgICAgICAgY29udGV4dC5vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfVxuICAgIF9vYnNlcnZlck1hcC5jbGVhcigpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGRldGVjdGlmeSA9IDxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCwgb2JzZXJ2ZWQ/OiBOb2RlKTogVCA9PiB7XG4gICAgY29uc3Qgb2JzZXJ2ZWROb2RlID0gb2JzZXJ2ZWQgPz8gKG5vZGUub3duZXJEb2N1bWVudD8uYm9keSAmJiBub2RlLm93bmVyRG9jdW1lbnQpID8/IGRvY3VtZW50O1xuICAgIGNvbnN0IGNvbnRleHQgPSBfb2JzZXJ2ZXJNYXAuZ2V0KG9ic2VydmVkTm9kZSkgPz8gc3RhcnQob2JzZXJ2ZWROb2RlKTtcbiAgICBjb250ZXh0LnRhcmdldHMuYWRkKG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVuZGV0ZWN0aWZ5ID0gPFQgZXh0ZW5kcyBOb2RlPihub2RlPzogVCk6IHZvaWQgPT4ge1xuICAgIGlmIChudWxsID09IG5vZGUpIHtcbiAgICAgICAgc3RvcEFsbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9ic2VydmVkTm9kZSA9IHF1ZXJ5T2JzZXJ2ZWROb2RlKG5vZGUpO1xuICAgICAgICBpZiAob2JzZXJ2ZWROb2RlKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX29ic2VydmVyTWFwLmdldChvYnNlcnZlZE5vZGUpITtcbiAgICAgICAgICAgIGNvbnRleHQudGFyZ2V0cy5kZWxldGUobm9kZSk7XG4gICAgICAgICAgICBpZiAoIWNvbnRleHQudGFyZ2V0cy5zaXplKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgX29ic2VydmVyTWFwLmRlbGV0ZShvYnNlcnZlZE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsImltcG9ydCB0eXBlIHsgV3JpdGFibGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBFbGVtZW50aWZ5U2VlZCxcbiAgICBFbGVtZW50UmVzdWx0LFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgaXNXaW5kb3dDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG4gICAgcm9vdGlmeSxcbiAgICBldmFsdWF0ZSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBkZXRlY3RpZnksIHVuZGV0ZWN0aWZ5IH0gZnJvbSAnLi9kZXRlY3Rpb24nO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTUNsYXNzLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG59IGZyb20gJy4vY2xhc3MnO1xuXG4vKipcbiAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IGVxdWl2YWxlbnQgdG8gYGpRdWVyeWAgRE9NIG1hbmlwdWxhdGlvbi5cbiAqIEBqYSBgalF1ZXJ5YCDjga4gRE9NIOaTjeS9nOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+m1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZG9tIGFzICQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIEdldCB0aGUgPGJ1dHRvbj4gZWxlbWVudCB3aXRoIHRoZSBjbGFzcyAnY29udGludWUnIGFuZCBjaGFuZ2UgaXRzIEhUTUwgdG8gJ05leHQgU3RlcC4uLidcbiAqICQoJ2J1dHRvbi5jb250aW51ZScpLmh0bWwoJ05leHQgU3RlcC4uLicpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NU3RhdGljIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBlcXVpdmFsZW50IHRvIGBqUXVlcnlgIERPTSBtYW5pcHVsYXRpb24uIDxicj5cbiAgICAgKiAgICAgQ3JlYXRlIHtAbGluayBET019IGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gICAgICogQGphIGBqUXVlcnlgIOOBriBET00g5pON5L2c44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bIDxicj5cbiAgICAgKiAgICAg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKlxuICAgICAqIC8vIEdldCB0aGUgPGJ1dHRvbj4gZWxlbWVudCB3aXRoIHRoZSBjbGFzcyAnY29udGludWUnIGFuZCBjaGFuZ2UgaXRzIEhUTUwgdG8gJ05leHQgU3RlcC4uLidcbiAgICAgKiAkKCdidXR0b24uY29udGludWUnKS5odG1sKCdOZXh0IFN0ZXAuLi4nKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICogQHJldHVybnMge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICovXG4gICAgPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBvYmplY3QncyBgcHJvdG90eXBlYCBhbGlhcy5cbiAgICAgKiBAamEg44Kq44OW44K444Kn44Kv44OI44GuIGBwcm90b3R5cGVg44Ko44Kk44Oq44Ki44K5XG4gICAgICovXG4gICAgZm46IERPTUNsYXNzICYgUmVjb3JkPHN0cmluZyB8IHN5bWJvbCwgdW5rbm93bj47XG5cbiAgICAvKiogRE9NIFV0aWxpdGllcyAqL1xuICAgIHJlYWRvbmx5IHV0aWxzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgV2luZG93LlxuICAgICAgICAgKiBAamEgV2luZG93IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0geFxuICAgICAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAgICAgKi9cbiAgICAgICAgaXNXaW5kb3dDb250ZXh0KHg6IHVua25vd24pOiB4IGlzIFdpbmRvdztcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIENyZWF0ZSBFbGVtZW50IGFycmF5IGZyb20gc2VlZCBhcmcuXG4gICAgICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gU2VlZCDjgYvjgokgRWxlbWVudCDphY3liJfjgpLkvZzmiJBcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHNlZWRcbiAgICAgICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBFbGVtZW50IGFycmF5LlxuICAgICAgICAgKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAgICAgKiBAcmV0dXJucyBFbGVtZW50W10gYmFzZWQgTm9kZSBvciBXaW5kb3cgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgZWxlbWVudGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gQ3JlYXRlIEVsZW1lbnQgYXJyYXkgZnJvbSBzZWVkIGFyZy4gPGJyPlxuICAgICAgICAgKiAgICAgQW5kIGFsc28gbGlzdHMgZm9yIHRoZSBgRG9jdW1lbnRGcmFnbWVudGAgaW5zaWRlIHRoZSBgPHRlbXBsYXRlPmAgdGFnLlxuICAgICAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIFNlZWQg44GL44KJIEVsZW1lbnQg6YWN5YiX44KS5L2c5oiQIDxicj5cbiAgICAgICAgICogICAgIGA8dGVtcGxhdGU+YCDjgr/jgrDlhoXjga4gYERvY3VtZW50RnJhZ21lbnRgIOOCguWIl+aMmeOBmeOCi1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gICAgICAgICAqICAtIGBqYWAgRWxlbWVudCDphY3liJfjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICAgICAqIEByZXR1cm5zIEVsZW1lbnRbXSBiYXNlZCBOb2RlLlxuICAgICAgICAgKi9cbiAgICAgICAgcm9vdGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGBldmFsYCBmdW5jdGlvbiBieSB3aGljaCBzY3JpcHQgYG5vbmNlYCBhdHRyaWJ1dGUgY29uc2lkZXJlZCB1bmRlciB0aGUgQ1NQIGNvbmRpdGlvbi5cbiAgICAgICAgICogQGphIENTUCDnkrDlooPjgavjgYrjgYTjgabjgrnjgq/jg6rjg5fjg4ggYG5vbmNlYCDlsZ7mgKfjgpLogIPmha7jgZfjgZ8gYGV2YWxgIOWun+ihjOmWouaVsFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGUoY29kZTogc3RyaW5nLCBvcHRpb25zPzogRWxlbWVudCB8IEV2YWxPcHRpb25zLCBjb250ZXh0PzogRG9jdW1lbnQgfCBudWxsKTogYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIEVuYWJsaW5nIHRoZSBub2RlIHRvIGRldGVjdCBldmVudHMgb2YgRE9NIGNvbm5lY3RlZCBhbmQgZGlzY29ubmVjdGVkLlxuICAgICAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCBET00g44G444Gu5o6l57aaLCBET00g44GL44KJ44Gu5YiH5pat44Kk44OZ44Oz44OI44KS5qSc5Ye65Y+v6IO944Gr44GZ44KLXG4gICAgICAgICAqXG4gICAgICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgICAgICpcbiAgICAgICAgICogYGBgdHNcbiAgICAgICAgICogaW1wb3J0IHsgZG9tIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgICAgICogY29uc3QgeyBkZXRlY3RpZnksIHVuZGV0ZWN0aWZ5IH0gPSBkb20udXRpbHM7XG4gICAgICAgICAqXG4gICAgICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAqXG4gICAgICAgICAqIC8vIG9ic2VydmF0aW9uIHN0YXJ0XG4gICAgICAgICAqIGRldGVjdGlmeShlbCk7XG4gICAgICAgICAqIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2Nvbm5lY3RlZCcsICgpID0+IHtcbiAgICAgICAgICogICAgIGNvbnNvbGUubG9nKCdvbiBjb25uZWN0ZWQnKTtcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2Rpc2Nvbm5lY3RlZCcsICgpID0+IHtcbiAgICAgICAgICogICAgIGNvbnNvbGUubG9nKCdvbiBkaXNjb25uZWN0ZWQnKTtcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIC8vIG9ic2VydmF0aW9uIHN0b3BcbiAgICAgICAgICogdW5kZXRlY3RpZnkoZWwpO1xuICAgICAgICAgKiBgYGBcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5vZGVcbiAgICAgICAgICogIC0gYGVuYCB0YXJnZXQgbm9kZVxuICAgICAgICAgKiAgLSBgamFgIOWvvuixoeOBruimgee0oFxuICAgICAgICAgKiBAcGFyYW0gb2JzZXJ2ZWRcbiAgICAgICAgICogIC0gYGVuYCBTcGVjaWZpZXMgdGhlIHJvb3QgZWxlbWVudCB0byB3YXRjaC4gSWYgbm90IHNwZWNpZmllZCwgYG93bmVyRG9jdW1lbnRgIGlzIGV2YWx1YXRlZCBmaXJzdCwgZm9sbG93ZWQgYnkgZ2xvYmFsIGBkb2N1bWVudGAuXG4gICAgICAgICAqICAtIGBqYWAg55uj6KaW5a++6LGh44Gu44Or44O844OI6KaB57Sg44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga8gYG93bmVyRG9jdW1lbnRgLCDjgrDjg63jg7zjg5Djg6sgYGRvY3VtZW50YCDjga7poIbjgavoqZXkvqHjgZXjgozjgotcbiAgICAgICAgICovXG4gICAgICAgIGRldGVjdGlmeTxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCwgb2JzZXJ2ZWQ/OiBOb2RlKTogVDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFVuZGV0ZWN0IGNvbm5lY3RlZCBhbmQgZGlzY29ubmVjdGVkIGZyb20gRE9NIGV2ZW50cyBmb3IgYW4gZWxlbWVudC5cbiAgICAgICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgRE9NIOOBuOOBruaOpee2miwgRE9NIOOBi+OCieOBruWIh+aWreOCpOODmeODs+ODiOOCkuaknOWHuuOCkuino+mZpOOBmeOCi1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAgICAgKiAgLSBgZW5gIHRhcmdldCBub2RlLiBJZiBub3Qgc3BlY2lmaWVkLCBleGVjdXRlIGFsbCByZWxlYXNlLlxuICAgICAgICAgKiAgLSBgamFgIOWvvuixoeOBruimgee0oC4g5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5YWo6Kej6Zmk44KS5a6f6KGMXG4gICAgICAgICAqL1xuICAgICAgICB1bmRldGVjdGlmeTxUIGV4dGVuZHMgTm9kZT4obm9kZT86IFQpOiB2b2lkO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIERPTUZhY3RvcnkgPSA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpID0+IERPTVJlc3VsdDxUPjtcblxubGV0IF9mYWN0b3J5ITogRE9NRmFjdG9yeTtcblxuY29uc3QgZG9tID0gKDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiA9PiB7XG4gICAgcmV0dXJuIF9mYWN0b3J5KHNlbGVjdG9yLCBjb250ZXh0KTtcbn0pIGFzIERPTVN0YXRpYztcblxuKGRvbSBhcyBXcml0YWJsZTxET01TdGF0aWM+KS51dGlscyA9IHtcbiAgICBpc1dpbmRvd0NvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbiAgICByb290aWZ5LFxuICAgIGV2YWx1YXRlLFxuICAgIGRldGVjdGlmeSxcbiAgICB1bmRldGVjdGlmeSxcbn07XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzLCBmYWN0b3J5OiBET01GYWN0b3J5KTogdm9pZCB7XG4gICAgX2ZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIChkb20uZm4gYXMgRE9NQ2xhc3MpID0gZm47XG59XG5cbmV4cG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tLFxufTtcbiIsImltcG9ydCB7IE51bGxpc2ggfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgaXNXaW5kb3dDb250ZXh0IH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY3JlYXRlSXRlcmFibGVJdGVyYXRvciA9IFN5bWJvbCgnY3JlYXRlLWl0ZXJhYmxlLWl0ZXJhdG9yJyk7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3Rpb24gY2xhc3Mgb2Yge0BsaW5rIERPTUNsYXNzfS4gVGhpcyBjbGFzcyBwcm92aWRlcyBpdGVyYXRvciBtZXRob2RzLlxuICogQGphIHtAbGluayBET01DbGFzc30g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50czogVFtdKSB7XG4gICAgICAgIGNvbnN0IHNlbGY6IERPTUFjY2VzczxUPiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYCBhbmQgY29ubmVjdGVkIHRvYCBEb2N1bWVudGAgb3IgYFNoYWRvd1Jvb3RgLlxuICAgICAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCiuOBi+OBpCBgRG9jdW1lbnRgIOOBvuOBn+OBryBgU2hhZG93Um9vdGAg44Gr5o6l57aa44GV44KM44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxcbiAgICAgKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgZ2V0IGlzQ29ubmVjdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFQ+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2Yge0BsaW5rIEVsZW1lbnRCYXNlfSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosge0BsaW5rIEVsZW1lbnRCYXNlfSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFQ+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZSh7QGxpbmsgRWxlbWVudEJhc2V9KSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpLCB2YWx1ZSh7QGxpbmsgRWxlbWVudEJhc2V9KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpbmRleCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlcikgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gdmFsdWUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGl0ZXJhdG9yIGNyZWF0ZSBmdW5jdGlvbiAqL1xuICAgIHByaXZhdGUgW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXTxSPih2YWx1ZUdlbmVyYXRvcjogKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4gPSB7XG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFI+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY29udGV4dC5wb2ludGVyO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgY29udGV4dC5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBvaW50ZXIrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlR2VuZXJhdG9yKGN1cnJlbnQsIGNvbnRleHQuYmFzZVtjdXJyZW50XSksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYC5cbiAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGUoZWw6IHVua25vd24pOiBlbCBpcyBOb2RlIHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUpLm5vZGVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEVsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE51bGxpc2gpOiBlbCBpcyBFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlKGVsKSAmJiAoTm9kZS5FTEVNRU5UX05PREUgPT09IGVsLm5vZGVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBIVE1MRWxlbWVudGAgb3IgYFNWR0VsZW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgSFRNTEVsZW1lbnRgIOOBvuOBn+OBryBgU1ZHRWxlbWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRWxlbWVudGAgb3IgYERvY3VtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEVsZW1lbnRgIOOBvuOBn+OBryBgRG9jdW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVRdWVyaWFibGUoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIEVsZW1lbnQgfCBEb2N1bWVudCB7XG4gICAgcmV0dXJuICEhKGVsICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLnF1ZXJ5U2VsZWN0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYERvY3VtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAge0BsaW5rIEVsZW1lbnRCYXNlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRWxlbWVudEJhc2V9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlRG9jdW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIERvY3VtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlKGVsKSAmJiAoTm9kZS5ET0NVTUVOVF9OT0RFID09PSBlbC5ub2RlVHlwZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIHtAbGluayBET019IOOBjCBgRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCB7QGxpbmsgRE9NSXRlcmFibGV9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBET01JdGVyYWJsZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBIVE1MRWxlbWVudGAg44G+44Gf44GvIGBTVkdFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50PiB7XG4gICAgcmV0dXJuIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZG9tWzBdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sge0BsaW5rIERPTX0gdGFyZ2V0IGlzIGBEb2N1bWVudGAuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCB7QGxpbmsgRE9NSXRlcmFibGV9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBET01JdGVyYWJsZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVEb2N1bWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxEb2N1bWVudD4ge1xuICAgIHJldHVybiBkb21bMF0gaW5zdGFuY2VvZiBEb2N1bWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sge0BsaW5rIERPTX0gdGFyZ2V0IGlzIGBXaW5kb3dgLlxuICogQGphIHtAbGluayBET019IOOBjCBgV2luZG93YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZVdpbmRvdyhkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxXaW5kb3c+IHtcbiAgICByZXR1cm4gaXNXaW5kb3dDb250ZXh0KGRvbVswXSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOdWxsaXNoLlxuICogQGphIE51bGxpc2gg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOdWxsaXNoPiB7XG4gICAgcmV0dXJuICFzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmdTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBzdHJpbmc+IHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiBzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTm9kZS5cbiAqIEBqYSBOb2RlIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlPiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIE5vZGUpLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBFbGVtZW50LlxuICogQGphIEVsZW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRWxlbWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBFbGVtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBEb2N1bWVudC5cbiAqIEBqYSBEb2N1bWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEb2N1bWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERvY3VtZW50PiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFdpbmRvdy5cbiAqIEBqYSBXaW5kb3cg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgV2luZG93PiB7XG4gICAgcmV0dXJuIGlzV2luZG93Q29udGV4dChzZWxlY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciBpcyBhYmxlIHRvIGl0ZXJhdGUuXG4gKiBAamEg6LWw5p+75Y+v6IO944Gq44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlTGlzdE9mPE5vZGU+PiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIFRbXSkubGVuZ3RoO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyB7QGxpbmsgRE9NfS5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBET00+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgbm9kZSBuYW1lIGlzIGFyZ3VtZW50LlxuICogQGphIE5vZGUg5ZCN44GM5byV5pWw44Gn5LiO44GI44Gf5ZCN5YmN44Go5LiA6Ie044GZ44KL44GL5Yik5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub2RlTmFtZShlbGVtOiBOb2RlIHwgbnVsbCwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGVsZW0gJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgbm9kZSBvZmZzZXQgcGFyZW50LiBUaGlzIGZ1bmN0aW9uIHdpbGwgd29yayBTVkdFbGVtZW50LCB0b28uXG4gKiBAamEgb2Zmc2V0IHBhcmVudCDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRQYXJlbnQobm9kZTogTm9kZSk6IEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAoKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudCkge1xuICAgICAgICByZXR1cm4gKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudDtcbiAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKG5vZGUsICdzdmcnKSkge1xuICAgICAgICBjb25zdCAkc3ZnID0gJChub2RlKTtcbiAgICAgICAgY29uc3QgY3NzUHJvcHMgPSAkc3ZnLmNzcyhbJ2Rpc3BsYXknLCAncG9zaXRpb24nXSk7XG4gICAgICAgIGlmICgnbm9uZScgPT09IGNzc1Byb3BzLmRpc3BsYXkgfHwgJ2ZpeGVkJyA9PT0gY3NzUHJvcHMucG9zaXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHBhcmVudCA9ICRzdmdbMF0ucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRpc3BsYXksIHBvc2l0aW9uIH0gPSAkKHBhcmVudCkuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgICAgICAgICBpZiAoJ25vbmUnID09PSBkaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXBvc2l0aW9uIHx8ICdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBOb25GdW5jdGlvblByb3BlcnR5TmFtZXMsXG4gICAgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBjYW1lbGl6ZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01WYWx1ZVR5cGU8VCwgSyA9ICd2YWx1ZSc+ID0gVCBleHRlbmRzIEhUTUxTZWxlY3RFbGVtZW50ID8gKHN0cmluZyB8IHN0cmluZ1tdKSA6IEsgZXh0ZW5kcyBrZXlvZiBUID8gVFtLXSA6IHN0cmluZztcbmV4cG9ydCB0eXBlIERPTURhdGEgPSBQbGFpbk9iamVjdDxUeXBlZERhdGE+O1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc011bHRpU2VsZWN0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MU2VsZWN0RWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmICdzZWxlY3QnID09PSBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICYmIChlbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkubXVsdGlwbGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgdmFsKClgKi9cbmZ1bmN0aW9uIGlzSW5wdXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSk6IGVsIGlzIEhUTUxJbnB1dEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAobnVsbCAhPSAoZWwgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGF0dHJpYnV0ZXMgbWV0aG9kcy5cbiAqIEBqYSDlsZ7mgKfmk43kvZzjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUF0dHJpYnV0ZXM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ2xhc3Nlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBjc3MgY2xhc3MgdG8gZWxlbWVudHMuXG4gICAgICogQGphIGNzcyBjbGFzcyDopoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgYW55IG9mIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGFyZSBhc3NpZ25lZCB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCr+ODqeOCueWQjeOCkuWwkeOBquOBj+OBqOOCguimgee0oOOBjOaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZVxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCNXG4gICAgICovXG4gICAgcHVibGljIGhhc0NsYXNzKGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpICYmIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgb3IgcmVtb3ZlIG9uZSBvciBtb3JlIGNsYXNzZXMgZnJvbSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIGRlcGVuZGluZyBvbiBlaXRoZXIgdGhlIGNsYXNzJ3MgcHJlc2VuY2Ugb3IgdGhlIHZhbHVlIG9mIHRoZSBzdGF0ZSBhcmd1bWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu54q25oWL44Gr5b+c44GY44GmLCDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLopoHntKDjgavov73liqAv5YmK6Zmk44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGZvcmNlXG4gICAgICogIC0gYGVuYCBpZiB0aGlzIGFyZ3VtZW50IGV4aXN0cywgdHJ1ZTogdGhlIGNsYXNzZXMgc2hvdWxkIGJlIGFkZGVkIC8gZmFsc2U6IHJlbW92ZWQuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgYzlrZjlnKjjgZnjgovloLTlkIgsIHRydWU6IOOCr+ODqeOCueOCkui/veWKoCAvIGZhbHNlOiDjgq/jg6njgrnjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9nZ2xlQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZm9yY2U/OiBib29sZWFuKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGNvbnN0IG9wZXJhdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBmb3JjZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY2xhc3Nlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QudG9nZ2xlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpID0+IGVsZW0uY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBQcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHByb3BlcnR5IHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQpOiBURWxlbWVudFtUXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIHByb3BlcnR5IHZhbHVlIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuWNmOS4gOODl+ODreODkeODhuOCo+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSB2YWx1ZVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL44OX44Ot44OR44OG44Kj5YCkXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQsIHZhbHVlOiBURWxlbWVudFtUXSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIHByb3BlcnR5IHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgcHJvcGVydHktdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3AocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KGtleTogVCB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IFRFbGVtZW50W1RdKTogVEVsZW1lbnRbVF0gfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgcHJvcGVydHlcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpc1swXSBhcyBURWxlbWVudCAmIFJlY29yZDxzdHJpbmcsIFRFbGVtZW50W1RdPjtcbiAgICAgICAgICAgIHJldHVybiBmaXJzdCAmJiBmaXJzdFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoZWwgYXMgdW5rbm93biBhcyBVbmtub3duT2JqZWN0LCBrZXkgYXMgc3RyaW5nLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoZWwgYXMgdW5rbm93biBhcyBVbmtub3duT2JqZWN0LCBuYW1lLCAoa2V5IGFzIFJlY29yZDxzdHJpbmcsIFRFbGVtZW50W1RdPilbbmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYXR0cmlidXRlIHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgYXR0cmlidXRlIHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg5bGe5oCn5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgdmFsdWUuIGlmIGBudWxsYCBzZXQsIHJlbW92ZSBhdHRyaWJ1dGUuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlsZ7mgKflgKQuIGBudWxsYCDjgYzmjIflrprjgZXjgozjgZ/loLTlkIjliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIGF0dHJpYnV0ZS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBhdHRyaWJ1dGUtdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIGF0dHIoa2V5OiBzdHJpbmcgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGF0dHIgPz8gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYXR0cmlidXRlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVBdHRyKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IGF0dHJpYnV0ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXkgYXMgc3RyaW5nLCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IChrZXkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCBTdHJpbmcodmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBhdHRyaWJ1dGUuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+WxnuaAp+OCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIGF0dHJpYnV0ZSBuYW1lIG9yIGF0dHJpYnV0ZSBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOBvuOBn+OBr+WxnuaAp+WQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVBdHRyKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXR0cnMgPSBpc0FycmF5KG5hbWUpID8gbmFtZSA6IFtuYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFZhbHVlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIHZhbHVlIOWApOOBruWPluW+ly4g5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50PigpOiBET01WYWx1ZVR5cGU8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSB2YWx1ZSBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpiB2YWx1ZSDlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZTogRE9NVmFsdWVUeXBlPFQ+KTogdGhpcztcblxuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlPzogRE9NVmFsdWVUeXBlPFQ+KTogYW55IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHZhbHVlXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICBpZiAoaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwuc2VsZWN0ZWRPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsIGFzIGFueSkudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5vIHN1cHBvcnQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5zZWxlY3RlZCA9ICh2YWx1ZSBhcyBzdHJpbmdbXSkuaW5jbHVkZXMob3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbnB1dEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IERhdGFcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlcyBhbGwgYERPTVN0cmluZ01hcGAgc3RvcmUgc2V0IGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga4gSFRNTDUgZGF0YS0qIOWxnuaAp+OBpyBgRE9NU3RyaW5nTWFwYCDjgavmoLzntI3jgZXjgozjgZ/lhajjg4fjg7zjgr/lgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YSgpOiBET01EYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWUgYXQgdGhlIG5hbWVkIGRhdGEgc3RvcmUgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBjb2xsZWN0aW9uLCBhcyBzZXQgYnkgZGF0YShrZXksIHZhbHVlKSBvciBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga4ga2V5IOOBp+aMh+WumuOBl+OBnyBIVE1MNSBkYXRhLSog5bGe5oCn5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZyk6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdG9yZSBhcmJpdHJhcnkgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuS7u+aEj+OBruODh+ODvOOCv+OCkuagvOe0jVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBkYXRhIHZhbHVlIChub3Qgb25seSBgc3RyaW5nYClcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WApOOCkuaMh+WumiAo5paH5a2X5YiX5Lul5aSW44KC5Y+X5LuY5Y+vKVxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nLCB2YWx1ZTogVHlwZWREYXRhKTogdGhpcztcblxuICAgIHB1YmxpYyBkYXRhKGtleT86IHN0cmluZywgdmFsdWU/OiBUeXBlZERhdGEpOiBET01EYXRhIHwgVHlwZWREYXRhIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIHN1cHBvcnRlZCBkYXRhc2V0IGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBkYXRhc2V0XG4gICAgICAgICAgICBjb25zdCBkYXRhc2V0ID0gdGhpc1swXS5kYXRhc2V0O1xuICAgICAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGFsbCBkYXRhXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YTogRE9NRGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhkYXRhc2V0KSkge1xuICAgICAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShkYXRhLCBwcm9wLCB0b1R5cGVkRGF0YShkYXRhc2V0W3Byb3BdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0eXBlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB0b1R5cGVkRGF0YShkYXRhc2V0W2NhbWVsaXplKGtleSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcHJvcCA9IGNhbWVsaXplKGtleSA/PyAnJyk7XG4gICAgICAgICAgICBpZiAocHJvcCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKGVsLmRhdGFzZXQgYXMgdW5rbm93biBhcyBVbmtub3duT2JqZWN0LCBwcm9wLCBmcm9tVHlwZWREYXRhKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGRhdGEuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+ODh+ODvOOCv+OCkuODh+ODvOOCv+mgmOWfn+OBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZURhdGEoa2V5OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShrZXkpID8ga2V5Lm1hcChrID0+IGNhbWVsaXplKGspKSA6IFtjYW1lbGl6ZShrZXkpXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRhdGFzZXQgfSA9IGVsO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YXNldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01BdHRyaWJ1dGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBpc1dpbmRvd0NvbnRleHQgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01CYXNlLFxuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZVF1ZXJpYWJsZSxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBpc0VtcHR5U2VsZWN0b3IsXG4gICAgaXNTdHJpbmdTZWxlY3RvcixcbiAgICBpc0RvY3VtZW50U2VsZWN0b3IsXG4gICAgaXNXaW5kb3dTZWxlY3RvcixcbiAgICBpc05vZGVTZWxlY3RvcixcbiAgICBpc0l0ZXJhYmxlU2VsZWN0b3IsXG4gICAgbm9kZU5hbWUsXG4gICAgZ2V0T2Zmc2V0UGFyZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01Nb2RpZmljYXRpb25DYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gVTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpcygpYCBhbmQgYGZpbHRlcigpYCAqL1xuZnVuY3Rpb24gd2lubm93PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFU+LFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxVPixcbiAgICB2YWxpZENhbGxiYWNrOiAoZWw6IFUpID0+IHVua25vd24sXG4gICAgaW52YWxpZENhbGxiYWNrPzogKCkgPT4gdW5rbm93bixcbik6IGFueSB7XG4gICAgaW52YWxpZENhbGxiYWNrID0gaW52YWxpZENhbGxiYWNrID8/IG5vb3A7XG5cbiAgICBsZXQgcmV0dmFsOiB1bmtub3duO1xuICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgZG9tLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3Rvci5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkubWF0Y2hlcyAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1dpbmRvd1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGlzV2luZG93Q29udGV4dChlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0RvY3VtZW50U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQgPT09IGVsIGFzIE5vZGUgYXMgRG9jdW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc05vZGVTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbSA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBhcmVudCgpYCwgYHBhcmVudHMoKWAgYW5kIGBzaWJsaW5ncygpYCAqL1xuZnVuY3Rpb24gdmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGU6IE5vZGUgfCBudWxsKTogcGFyZW50Tm9kZSBpcyBOb2RlIHtcbiAgICByZXR1cm4gbnVsbCAhPSBwYXJlbnROb2RlICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gcGFyZW50Tm9kZS5ub2RlVHlwZSAmJiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2hpbGRyZW4oKWAsIGBwYXJlbnQoKWAsIGBuZXh0KClgIGFuZCBgcHJldigpYCAqL1xuZnVuY3Rpb24gdmFsaWRSZXRyaWV2ZU5vZGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4obm9kZTogTm9kZSB8IG51bGwsIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCk6IG5vZGUgaXMgTm9kZSB7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBpZiAoJChub2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBuZXh0VW50aWwoKWAgYW5kIGBwcmV2VW50aWwoKSAqL1xuZnVuY3Rpb24gcmV0cmlldmVTaWJsaW5nczxcbiAgICBFIGV4dGVuZHMgRWxlbWVudEJhc2UsXG4gICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2Vcbj4oXG4gICAgc2libGluZzogJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnIHwgJ25leHRFbGVtZW50U2libGluZycsXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPEU+LFxuICAgIHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+XG4pOiBET008VD4ge1xuICAgIGlmICghaXNUeXBlRWxlbWVudChkb20pKSB7XG4gICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuXG4gICAgZm9yIChjb25zdCBlbCBvZiBkb20gYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgbGV0IGVsZW0gPSBlbFtzaWJsaW5nXTtcbiAgICAgICAgd2hpbGUgKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoJChlbGVtKS5pcyhmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0gPSBlbGVtW3NpYmxpbmddO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIHRyYXZlcnNpbmcgbWV0aG9kcy5cbiAqIEBqYSDjg4jjg6njg5Djg7zjgrnjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVRyYXZlcnNpbmc8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWxlbWVudCBNZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgb25lIG9mIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44Gm6YWN5LiL44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRFbGVtZW50IHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldCgpOiBURWxlbWVudFtdO1xuXG4gICAgcHVibGljIGdldChpbmRleD86IG51bWJlcik6IFRFbGVtZW50W10gfCBURWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChudWxsICE9IGluZGV4KSB7XG4gICAgICAgICAgICBpbmRleCA9IE1hdGgudHJ1bmMoaW5kZXgpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGV4IDwgMCA/IHRoaXNbaW5kZXggKyB0aGlzLmxlbmd0aF0gOiB0aGlzW2luZGV4XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvQXJyYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSBhbGwgdGhlIGVsZW1lbnRzIGNvbnRhaW5lZCBpbiB0aGUge0BsaW5rIERPTX0gc2V0LCBhcyBhbiBhcnJheS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHRvQXJyYXkoKTogVEVsZW1lbnRbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpc107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aGluIHRoZSB7QGxpbmsgRE9NfSBjb2xsZWN0aW9uIHJlbGF0aXZlIHRvIGl0cyBzaWJsaW5nIGVsZW1lbnRzLlxuICAgICAqIEBqYSB7QGxpbmsgRE9NfSDlhoXjga7mnIDliJ3jga7opoHntKDjgYzlhYTlvJ/opoHntKDjga7kvZXnlarnm67jgavmiYDlsZ7jgZnjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNlYXJjaCBmb3IgYSBnaXZlbiBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciB7QGxpbmsgRE9NfSBpbnN0YW5jZSBmcm9tIGFtb25nIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg6YWN5LiL44Gu5L2V55Wq55uu44Gr5omA5bGe44GX44Gm44GE44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oc2VsZWN0b3I6IHN0cmluZyB8IFQgfCBET008VD4pOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcj86IHN0cmluZyB8IFQgfCBET008VD4pOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgbGV0IGNoaWxkOiBOb2RlIHwgbnVsbCA9IHRoaXNbMF07XG4gICAgICAgICAgICB3aGlsZSAobnVsbCAhPT0gKGNoaWxkID0gY2hpbGQucHJldmlvdXNTaWJsaW5nKSkge1xuICAgICAgICAgICAgICAgIGlmIChOb2RlLkVMRU1FTlRfTk9ERSA9PT0gY2hpbGQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVsZW06IFQgfCBFbGVtZW50O1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGVsZW0gPSAkKHNlbGVjdG9yKVswXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9IHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQmFzZSA/IHNlbGVjdG9yWzBdIDogc2VsZWN0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpID0gWy4uLnRoaXNdLmluZGV4T2YoZWxlbSBhcyBURWxlbWVudCAmIEVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIDAgPD0gaSA/IGkgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFRyYXZlcnNpbmdcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaXJzdCBpbiB0aGUgc2V0IGFzIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovmnIDliJ3jga7opoHntKDjgpIge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJCh0aGlzWzBdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaW5hbCBvbmUgaW4gdGhlIHNldCBhcyB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyr5bC+44Gu6KaB57Sg44KSIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOBq+OBl+OBpuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJCh0aGlzW3RoaXMubGVuZ3RoIC0gMV0pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyB7QGxpbmsgRE9NfSBpbnN0YW5jZSB3aXRoIGVsZW1lbnRzIGFkZGVkIHRvIHRoZSBzZXQgZnJvbSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAg44Gn5Y+W5b6X44GX44GfIGBFbGVtZW50YCDjgpLov73liqDjgZfjgZ/mlrDopo8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0ICRhZGQgPSAkKHNlbGVjdG9yLCBjb250ZXh0KTtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBuZXcgU2V0KFsuLi50aGlzLCAuLi4kYWRkXSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtc10gYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgb2YgZWxlbWVudHMgYWdhaW5zdCBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBmeOCi+OBi+eiuuiqjVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgIGlmIGF0IGxlYXN0IG9uZSBvZiB0aGVzZSBlbGVtZW50cyBtYXRjaGVzIHRoZSBnaXZlbiBhcmd1bWVudHMuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgavmjIflrprjgZfjgZ/mnaHku7bjgYzopoHntKDjga7kuIDjgaTjgafjgoLkuIDoh7TjgZnjgozjgbAgYHRydWVgIOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpczxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogYm9vbGVhbiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoKSA9PiB0cnVlLCAoKSA9PiBmYWxzZSkgYXMgYm9vbGVhbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyB7QGxpbmsgRE9NfSBpbnN0YW5jZSBpbmNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLlhoXljIXjgZnjgosg5paw6KaPIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRFbGVtZW50W10gPSBbXTtcbiAgICAgICAgd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoZWw6IFRFbGVtZW50KSA9PiB7IGVsZW1lbnRzLnB1c2goZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZWxlbWVudHMgZnJvbSB0aGUgc2V0IG9mIG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLliYrpmaTjgZfjgabov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyB7QGxpbmsgRE9NfSBpbnN0YW5jZSBleGNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLku6XlpJbjgpLlhoXljIXjgZnjgosg5paw6KaPIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBub3Q8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBuZXcgU2V0PFRFbGVtZW50PihbLi4udGhpc10pO1xuICAgICAgICB3aW5ub3coc2VsZWN0b3IsIHRoaXMsIChlbDogVEVsZW1lbnQpID0+IHsgZWxlbWVudHMuZGVsZXRlKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtZW50c10gYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGRlc2NlbmRhbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GZ44KL6KaB57Sg44KS5qSc57SiXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdG9yID0gJChzZWxlY3RvcikgYXMgRE9NPE5vZGU+O1xuICAgICAgICAgICAgcmV0dXJuICRzZWxlY3Rvci5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsICE9PSBlbGVtICYmIGVsLmNvbnRhaW5zKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbXMgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5lbGVtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IGhhdmUgYSBkZXNjZW5kYW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBl+OBn+WtkOimgee0oOaMgeOBpOimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGhhczxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogTm9kZVtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChzZWxlY3RvciwgZWwgYXMgRWxlbWVudCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgICAgIHRhcmdldHMucHVzaCguLi4kdGFyZ2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmZpbHRlcigoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIG5ldyBTZXQodGFyZ2V0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW0gIT09IGVsICYmIGVsZW0uY29udGFpbnMoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUGFzcyBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgdGhyb3VnaCBhIGZ1bmN0aW9uLCBwcm9kdWNpbmcgYSBuZXcge0BsaW5rIERPTX0gaW5zdGFuY2UgY29udGFpbmluZyB0aGUgcmV0dXJuIHZhbHVlcy5cbiAgICAgKiBAamEg44Kz44O844Or44OQ44OD44Kv44Gn5aSJ5pu044GV44KM44Gf6KaB57Sg44KS55So44GE44Gm5paw44Gf44GrIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuani+eviVxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBtb2RpZmljYXRpb24gZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL5aSJ5pu06Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG1hcDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGNhbGxiYWNrOiBET01Nb2RpZmljYXRpb25DYWxsYmFjazxURWxlbWVudCwgVD4pOiBET008VD4ge1xuICAgICAgICBjb25zdCBlbGVtZW50czogVFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgdGhpcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goY2FsbGJhY2suY2FsbChlbCwgaW5kZXgsIGVsKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdGUgb3ZlciBhIHtAbGluayBET019IGluc3RhbmNlLCBleGVjdXRpbmcgYSBmdW5jdGlvbiBmb3IgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+mWouaVsOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgZWFjaChjYWxsYmFjazogRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBpZiAoZmFsc2UgPT09IGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byBhIHN1YnNldCBzcGVjaWZpZWQgYnkgYSByYW5nZSBvZiBpbmRpY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ/nr4Tlm7Ljga7opoHntKDjgpLlkKvjgoAge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmVnaW5cbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgYmVnaW4gdG8gYmUgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjga7plovlp4vkvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKiBAcGFyYW0gZW5kXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIHN0b3AgYmVpbmcgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjgpLntYLjgYjjgovnm7TliY3jga7kvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJChbLi4udGhpc10uc2xpY2UoYmVnaW4sIGVuZCkgYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBvbmUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GX44Gf6KaB57Sg44KS5ZCr44KAIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgZXEoaW5kZXg6IG51bWJlcik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZVxuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5nZXQoaW5kZXgpKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCwgZ2V0IHRoZSBmaXJzdCBlbGVtZW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IgYnkgdGVzdGluZyB0aGUgZWxlbWVudCBpdHNlbGYgYW5kIHRyYXZlcnNpbmcgdXAgdGhyb3VnaCBpdHMgYW5jZXN0b3JzIGluIHRoZSBET00gdHJlZS5cbiAgICAgKiBAamEg6ZaL5aeL6KaB57Sg44GL44KJ5pyA44KC6L+R44GE6Kaq6KaB57Sg44KS6YG45oqeLiDjgrvjg6zjgq/jgr/jg7zmjIflrprjgZfjgZ/loLTlkIgsIOODnuODg+ODgeOBmeOCi+acgOOCgui/keOBhOimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvc2VzdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWxlY3RvciB8fCAhaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsb3Nlc3RzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBlbC5jbG9zZXN0KHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3Nlc3RzLmFkZChjKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5jbG9zZXN0c10pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcyBhcyB1bmtub3duIGFzIEVsZW1lbnQpIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudHMoc2VsZWN0b3IpLmVxKDApIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjaGlsZHJlbiBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOWQhOimgee0oOOBruWtkOimgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44GM5oyH5a6a44GV44KM44Gf5aC05ZCI44Gv44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf57WQ5p6c44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgY2hpbGRyZW48VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShjaGlsZCwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5hZGQoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5jaGlsZHJlbl0pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBwYXJlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7mnIDliJ3jga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIHtAbGluayBET019IGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3QgcGFyZW50cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkgJiYgdmFsaWRSZXRyaWV2ZU5vZGUocGFyZW50Tm9kZSwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudHMuYWRkKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ucGFyZW50c10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBhbmNlc3RvcnMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIHtAbGluayBET019IGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudHNVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBhbmNlc3RvcnMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLCBET00gbm9kZSwgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2VcbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMge0BsaW5rIERPTX0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50c1VudGlsPFxuICAgICAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgICAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgICAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4gICAgPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPik6IERPTTxUPiB7XG4gICAgICAgIGxldCBwYXJlbnRzOiBOb2RlW10gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnROb2RlID0gKGVsIGFzIE5vZGUpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB3aGlsZSAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudE5vZGUpLmlzKGZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOikh+aVsOimgee0oOOBjOWvvuixoeOBq+OBquOCi+OBqOOBjeOBr+WPjei7olxuICAgICAgICBpZiAoMSA8IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJlbnRzID0gWy4uLm5ldyBTZXQocGFyZW50cy5yZXZlcnNlKCkpXS5yZXZlcnNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJChwYXJlbnRzKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgZm9sbG93aW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIG5leHQgc2libGluZyBvbmx5IGlmIGl0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAgICAgKiBAamEg6KaB57Sg6ZuG5ZCI44Gu5ZCE6KaB57Sg44Gu55u05b6M44Gr44GC44Gf44KL5YWE5byf6KaB57Sg44KS5oq95Ye6IDxicj5cbiAgICAgKiAgICAg5p2h5Lu25byP44KS5oyH5a6a44GX44CB57WQ5p6c44K744OD44OI44GL44KJ5pu044Gr57We6L6844G/44KS6KGM44GG44GT44Go44KC5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5leHRTaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLm5leHRTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7mrKHku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5uZXh0VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgZm9sbG93aW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5qyh5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygnbmV4dEVsZW1lbnRTaWJsaW5nJywgdGhpcywgc2VsZWN0b3IsIGZpbHRlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgcHJlY2VkaW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIHByZXZpb3VzIHNpYmxpbmcgb25seSBpZiBpdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOOBruWQhOimgee0oOOBruebtOWJjeOBruWFhOW8n+imgee0oOOCkuaKveWHuiA8YnI+XG4gICAgICogICAgIOadoeS7tuW8j+OCkuaMh+WumuOBl+OAgee1kOaenOOCu+ODg+ODiOOBi+OCieabtOOBq+e1nui+vOOBv+OCkuihjOOBhuOBk+OBqOOCguWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXY8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2U2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ucHJldlNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIHByZWNlZGluZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruWJjeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7liY3ku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzdHJpbmcgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjmloflrZfliJfjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgcHJldlVudGlsPFxuICAgICAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgICAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgICAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4gICAgPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiByZXRyaWV2ZVNpYmxpbmdzKCdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJywgdGhpcywgc2VsZWN0b3IsIGZpbHRlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+WQhOimgee0oOOBruWFhOW8n+imgee0oOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHNpYmxpbmdzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50Tm9kZSA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNpYmxpbmcgb2YgJChwYXJlbnROb2RlKS5jaGlsZHJlbihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzaWJsaW5nICE9PSBlbCBhcyBFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2libGluZ3MuYWRkKHNpYmxpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjaGlsZHJlbiBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgdGV4dCBhbmQgY29tbWVudCBub2Rlcy5cbiAgICAgKiBAamEg44OG44Kt44K544OI44KESFRNTOOCs+ODoeODs+ODiOOCkuWQq+OCgOWtkOimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBjb250ZW50czxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVOYW1lKGVsLCAnaWZyYW1lJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKChlbCBhcyBIVE1MSUZyYW1lRWxlbWVudCkuY29udGVudERvY3VtZW50IGFzIE5vZGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZU5hbWUoZWwsICd0ZW1wbGF0ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZCgoZWwgYXMgSFRNTFRlbXBsYXRlRWxlbWVudCkuY29udGVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIGVsLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uY29udGVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2xvc2VzdCBhbmNlc3RvciBlbGVtZW50IHRoYXQgaXMgcG9zaXRpb25lZC5cbiAgICAgKiBAamEg6KaB57Sg44Gu5YWI56WW6KaB57Sg44GnLCDjgrnjgr/jgqTjg6vjgafjg53jgrjjgrfjg6fjg7PmjIflrpoocG9zaXRpaW9u44GMcmVsYXRpdmUsIGFic29sdXRlLCBmaXhlZOOBruOBhOOBmuOCjOOBiynjgZXjgozjgabjgYTjgovjgoLjga7jgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0UGFyZW50PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHJvb3RFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHJvb3RFbGVtZW50KSBhcyBET008Tm9kZT4gYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGdldE9mZnNldFBhcmVudChlbCBhcyBOb2RlKSA/PyByb290RWxlbWVudDtcbiAgICAgICAgICAgICAgICBvZmZzZXRzLmFkZChvZmZzZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoWy4uLm9mZnNldHNdKSBhcyBET008VD47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVRyYXZlcnNpbmcsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQgeyBpc1N0cmluZywgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZURvY3VtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGNoZWNrIEhUTUwgc3RyaW5nICovXG5mdW5jdGlvbiBpc0hUTUxTdHJpbmcoc3JjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBzdWJqZWN0ID0gc3JjLnRyaW0oKTtcbiAgICByZXR1cm4gKCc8JyA9PT0gc3ViamVjdC5zbGljZSgwLCAxKSkgJiYgKCc+JyA9PT0gc3ViamVjdC5zbGljZSgtMSkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGFwcGVuZCgpYCwgYHByZXBlbmQoKWAsIGBiZWZvcmUoKWAgYW5kIGBhZnRlcigpYCAgKi9cbmZ1bmN0aW9uIHRvTm9kZVNldDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IFNldDxOb2RlIHwgc3RyaW5nPiB7XG4gICAgY29uc3Qgbm9kZXMgPSBuZXcgU2V0PE5vZGUgfCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjb250ZW50IG9mIGNvbnRlbnRzKSB7XG4gICAgICAgIGlmICgoaXNTdHJpbmcoY29udGVudCkgJiYgIWlzSFRNTFN0cmluZyhjb250ZW50KSkgfHwgaXNOb2RlKGNvbnRlbnQpKSB7XG4gICAgICAgICAgICBub2Rlcy5hZGQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChjb250ZW50IGFzIERPTTxFbGVtZW50Pik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1N0cmluZyhub2RlKSB8fCAoaXNOb2RlKG5vZGUpICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gbm9kZS5ub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMuYWRkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGUobm9kZTogTm9kZSB8IHN0cmluZyk6IE5vZGUge1xuICAgIGlmIChpc1N0cmluZyhub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGRldGFjaCgpYCBhbmQgYHJlbW92ZSgpYCAqL1xuZnVuY3Rpb24gcmVtb3ZlRWxlbWVudDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCxcbiAgICBkb206IERPTUl0ZXJhYmxlPFU+LFxuICAgIGtlZXBMaXN0ZW5lcjogYm9vbGVhblxuKTogdm9pZCB7XG4gICAgY29uc3QgJGRvbTogRE9NPFU+ID0gbnVsbCAhPSBzZWxlY3RvclxuICAgICAgICA/IChkb20gYXMgRE9NPFU+KS5maWx0ZXIoc2VsZWN0b3IpXG4gICAgICAgIDogZG9tIGFzIERPTTxVPjtcblxuICAgIGlmICgha2VlcExpc3RlbmVyKSB7XG4gICAgICAgICRkb20ub2ZmKCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBlbCBvZiAkZG9tKSB7XG4gICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44Oe44OL44OU44Ol44Os44O844K344On44Oz44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01NYW5pcHVsYXRpb248VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBJbnNpZGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIEhUTUwgY29udGVudHMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gSFRNTCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbCgpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBIVE1MIGNvbnRlbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+aMh+WumuOBl+OBnyBIVE1MIOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGh0bWxTdHJpbmdcbiAgICAgKiAgLSBgZW5gIEEgc3RyaW5nIG9mIEhUTUwgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KLIEhUTUwg5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZzogc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBodG1sKGh0bWxTdHJpbmc/OiBzdHJpbmcpOiBzdHJpbmcgfCB0aGlzIHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gaHRtbFN0cmluZykge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgPyBlbC5pbm5lckhUTUwgOiAnJztcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhodG1sU3RyaW5nKSkge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbFN0cmluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGludmFsaWQgYXJnXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgYXJnLiBodG1sU3RyaW5nIHR5cGU6JHt0eXBlb2YgaHRtbFN0cmluZ31gKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdGV4dCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgalF1ZXJ5IHJldHVybnMgdGhlIGNvbWJpbmVkIHRleHQgb2YgZWFjaCBlbGVtZW50LCBidXQgdGhpcyBtZXRob2QgbWFrZXMgb25seSBmaXJzdCBlbGVtZW50J3MgdGV4dC5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44Gu44OG44Kt44K544OI44KS5Y+W5b6XIDxicj5cbiAgICAgKiAgICAgalF1ZXJ5IOOBr+WQhOimgee0oOOBrumAo+e1kOODhuOCreOCueODiOOCkui/lOWNtOOBmeOCi+OBjOacrOODoeOCveODg+ODieOBr+WFiOmgreimgee0oOOBruOBv+OCkuWvvuixoeOBqOOBmeOCi1xuICAgICAqL1xuICAgIHB1YmxpYyB0ZXh0KCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIGNvbnRlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgc3BlY2lmaWVkIHRleHQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+aMh+WumuOBl+OBn+ODhuOCreOCueODiOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRleHRcbiAgICAgKiAgLSBgZW5gIFRoZSB0ZXh0IHRvIHNldCBhcyB0aGUgY29udGVudCBvZiBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOWGheOBq+aMv+WFpeOBmeOCi+ODhuOCreOCueODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyB0ZXh0KHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyB0ZXh0KHZhbHVlPzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBlbC50ZXh0Q29udGVudDtcbiAgICAgICAgICAgICAgICByZXR1cm4gKG51bGwgIT0gdGV4dCkgPyB0ZXh0LnRyaW0oKSA6ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZSA6IFN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCB0byB0aGUgZW5kIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+W8leaVsOOBp+aMh+WumuOBl+OBn+OCs+ODs+ODhuODs+ODhOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5hcHBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBhcHBlbmRUbzxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYXBwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgdG8gdGhlIGJlZ2lubmluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhYjpoK3jgavlvJXmlbDjgafmjIflrprjgZfjgZ/jgrPjg7Pjg4bjg7Pjg4TjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3Ige0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIHByZXBlbmQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLnByZXBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjga7lhYjpoK3jgavmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnByZXBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgT3V0c2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYmVmb3JlIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWJjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYmVmb3JlPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRvTm9kZShub2RlKSwgZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGJlZm9yZSB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjga7liY3jgavmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBpbnNlcnRCZWZvcmU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmJlZm9yZSh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIGFmdGVyIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruW+jOOCjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWZ0ZXI8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uWy4uLmNvbnRlbnRzXS5yZXZlcnNlKCkpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYWZ0ZXIgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5b6M44KN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5zZXJ0QWZ0ZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFmdGVyKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEFyb3VuZFxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIGFsbCBlbGVtZW50cyBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXBBbGw8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVEb2N1bWVudCh0aGlzKSB8fCBpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIE5vZGU7XG5cbiAgICAgICAgLy8gVGhlIGVsZW1lbnRzIHRvIHdyYXAgdGhlIHRhcmdldCBhcm91bmRcbiAgICAgICAgY29uc3QgJHdyYXAgPSAkKHNlbGVjdG9yLCBlbC5vd25lckRvY3VtZW50KS5lcSgwKS5jbG9uZSh0cnVlKSBhcyBET008RWxlbWVudD47XG5cbiAgICAgICAgaWYgKGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICR3cmFwLmluc2VydEJlZm9yZShlbCk7XG4gICAgICAgIH1cblxuICAgICAgICAkd3JhcC5tYXAoKGluZGV4OiBudW1iZXIsIGVsZW06IEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIHdoaWxlIChlbGVtLmZpcnN0RWxlbWVudENoaWxkKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9IGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZWxlbTtcbiAgICAgICAgfSkuYXBwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgdGhlIGNvbnRlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF5YG044KSLCDmjIflrprjgZfjgZ/liKXjgqjjg6zjg6Hjg7Pjg4jjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwSW5uZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRzID0gJGVsLmNvbnRlbnRzKCk7XG4gICAgICAgICAgICBpZiAoMCA8IGNvbnRlbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRzLndyYXBBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWwuYXBwZW5kKHNlbGVjdG9yIGFzIE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkiwg5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgJGVsLndyYXBBbGwoc2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGUgcGFyZW50cyBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLCBsZWF2aW5nIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLlxuICAgICAqIEBqYSDopoHntKDjga7opqrjgqjjg6zjg6Hjg7Pjg4jjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyB1bndyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD47XG4gICAgICAgIHNlbGYucGFyZW50KHNlbGVjdG9yKS5ub3QoJ2JvZHknKS5lYWNoKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgJChlbGVtKS5yZXBsYWNlV2l0aChlbGVtLmNoaWxkTm9kZXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBSZW1vdmFsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGFsbCBjaGlsZCBub2RlcyBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDlhoXjga7lrZDopoHntKAo44OG44Kt44K544OI44KC5a++6LGhKeOCkuOBmeOBueOBpuWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBlbXB0eSgpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVDaGlsZChlbC5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgZnJvbSB0aGUgRE9NLiBUaGlzIG1ldGhvZCBrZWVwcyBldmVudCBsaXN0ZW5lciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAamEg6KaB57Sg44KSIERPTSDjgYvjgonliYrpmaQuIOWJiumZpOW+jOOCguOCpOODmeODs+ODiOODquOCueODiuOBr+acieWKuVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGRldGFjaDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIHJlbW92ZUVsZW1lbnQoc2VsZWN0b3IsIHRoaXMsIHRydWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgZmFsc2UpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlcGxhY2VtZW50XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHdpdGggdGhlIHByb3ZpZGVkIG5ldyBjb250ZW50IGFuZCByZXR1cm4gdGhlIHNldCBvZiBlbGVtZW50cyB0aGF0IHdhcyByZW1vdmVkLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZXjgozjgZ/liKXjga7opoHntKDjgoQgSFRNTCDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdDb250ZW50XG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlcGxhY2VXaXRoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5ld0NvbnRlbnQ/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBjb25zdCBlbGVtID0gKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRkb20gPSAkKG5ld0NvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKDEgPT09ICRkb20ubGVuZ3RoICYmIGlzTm9kZUVsZW1lbnQoJGRvbVswXSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGRvbVswXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiAkZG9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLnJlcGxhY2VXaXRoKGVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgZWFjaCB0YXJnZXQgZWxlbWVudCB3aXRoIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil44Gu6KaB57Sg44Go5beu44GX5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVwbGFjZUFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkucmVwbGFjZVdpdGgodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTU1hbmlwdWxhdGlvbiwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNBcnJheSxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBjbGFzc2lmeSxcbiAgICBkYXNoZXJpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVEb2N1bWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG4gICAgZ2V0T2Zmc2V0UGFyZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCAqL1xuZnVuY3Rpb24gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKHByb3BzOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPik6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCByZXR2YWwgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBwcm9wcykge1xuICAgICAgICBhc3NpZ25WYWx1ZShyZXR2YWwsIGRhc2hlcml6ZShrZXkpLCBwcm9wc1trZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgZ2V0IHByb3BzICovXG5mdW5jdGlvbiBnZXREZWZhdWx0VmlldyhlbDogRWxlbWVudCk6IFdpbmRvdyB7XG4gICAgcmV0dXJuIChlbC5vd25lckRvY3VtZW50ICYmIGVsLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcpID8/IHdpbmRvdztcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgZ2V0IHByb3BzICovXG5mdW5jdGlvbiBnZXRDb21wdXRlZFN0eWxlRnJvbShlbDogRWxlbWVudCk6IENTU1N0eWxlRGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgcmV0dXJuIHZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBjc3MgdmFsdWUgdG8gbnVtYmVyICovXG5mdW5jdGlvbiB0b051bWJlcih2YWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsKSB8fCAwO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVzb2x2ZXIgPSB7XG4gICAgd2lkdGg6IFsnbGVmdCcsICdyaWdodCddLFxuICAgIGhlaWdodDogWyd0b3AnLCAnYm90dG9tJ10sXG59O1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldFBhZGRpbmcoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYHBhZGRpbmctJHtfcmVzb2x2ZXJbdHlwZV1bMF19YCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYHBhZGRpbmctJHtfcmVzb2x2ZXJbdHlwZV1bMV19YCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldEJvcmRlcihzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgYm9yZGVyLSR7X3Jlc29sdmVyW3R5cGVdWzBdfS13aWR0aGApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBib3JkZXItJHtfcmVzb2x2ZXJbdHlwZV1bMV19LXdpZHRoYCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldE1hcmdpbihzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgbWFyZ2luLSR7X3Jlc29sdmVyW3R5cGVdWzBdfWApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBtYXJnaW4tJHtfcmVzb2x2ZXJbdHlwZV1bMV19YCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHdpZHRoKClgIGFuZCBgaGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkumZpOOBhOOBn+W5hSAoY2xpZW50V2lkdGggLyBjbGllbnRIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gKGRvbVswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtgY2xpZW50JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICAvLyAoc2Nyb2xsV2lkdGggLyBzY3JvbGxIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gKGRvbVswXS5kb2N1bWVudEVsZW1lbnQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtgc2Nyb2xsJHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZSA9IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpO1xuICAgICAgICAgICAgICAgIGlmICgnYm9yZGVyLWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2l6ZSAtIChnZXRCb3JkZXIoc3R5bGUsIHR5cGUpICsgZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgcmV0dXJuIGRvbS5jc3ModHlwZSwgaXNTdHJpbmcodmFsdWUpID8gdmFsdWUgOiBgJHt2YWx1ZX1weGApO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpbm5lcldpZHRoKClgIGFuZCBgaW5uZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZUlubmVyU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAoY2xpZW50V2lkdGggLyBjbGllbnRIZWlnaHQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BjbGllbnQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSBpc1RleHRQcm9wID8gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSkgOiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCArIGdldEJvcmRlcihzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBpbnRlcmZhY2UgUGFyc2VPdXRlclNpemVBcmdzUmVzdWx0IHsgaW5jbHVkZU1hcmdpbjogYm9vbGVhbjsgdmFsdWU6IG51bWJlciB8IHN0cmluZzsgfVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdCB7XG4gICAgbGV0IFt2YWx1ZSwgaW5jbHVkZU1hcmdpbl0gPSBhcmdzO1xuICAgIGlmICghaXNOdW1iZXIodmFsdWUpICYmICFpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgaW5jbHVkZU1hcmdpbiA9ICEhdmFsdWU7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4geyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9IGFzIFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZU91dGVyU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW46IGJvb2xlYW4sIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLlkKvjgoHjgZ/luYUgKGlubmVyV2lkdGggLyBpbm5lckhlaWdodClcbiAgICAgICAgICAgIHJldHVybiAoZG9tWzBdIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbYGlubmVyJHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGdldE9mZnNldFNpemUoZWwsIHR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTWFyZ2luKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0ICsgZ2V0TWFyZ2luKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFyZ2luID0gaW5jbHVkZU1hcmdpbiA/IGdldE1hcmdpbihzdHlsZSwgdHlwZSkgOiAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAoaXNUZXh0UHJvcCA/IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpIDogdmFsdWUpIC0gbWFyZ2luO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdHlsZSwgbmV3VmFsIH07XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCAtIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbH1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwb3NpdGlvbigpYCBhbmQgYG9mZnNldCgpYCAqL1xuZnVuY3Rpb24gZ2V0T2Zmc2V0UG9zaXRpb24oZWw6IEVsZW1lbnQpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0ge1xuICAgIC8vIGZvciBkaXNwbGF5IG5vbmVcbiAgICBpZiAoZWwuZ2V0Q2xpZW50UmVjdHMoKS5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0b3A6IHJlY3QudG9wICsgdmlldy5zY3JvbGxZLFxuICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyB2aWV3LnNjcm9sbFgsXG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IG9mZnNldFtXaWR0aCB8IEhlaWdodF0uIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZVtXaWR0aCB8IEhlaWdodF0g44Gu5Y+W5b6XLiBTVkdFbGVtZW50IOOBq+OCgumBqeeUqOWPr+iDvVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T2Zmc2V0U2l6ZShlbDogSFRNTE9yU1ZHRWxlbWVudCwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCAhPSAoZWwgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoKSB7XG4gICAgICAgIC8vIChvZmZzZXRXaWR0aCAvIG9mZnNldEhlaWdodClcbiAgICAgICAgcmV0dXJuIChlbCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BvZmZzZXQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIFtOT1RFXSBTVkdFbGVtZW50IOOBryBvZmZzZXRXaWR0aCDjgYzjgrXjg53jg7zjg4jjgZXjgozjgarjgYRcbiAgICAgICAgICogICAgICAgIGdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIOOBryB0cmFuc2Zvcm0g44Gr5b2x6Z+/44KS5Y+X44GR44KL44Gf44KBLFxuICAgICAgICAgKiAgICAgICAg5a6a576p6YCa44KKIGJvcmRlciwgcGFkZGluIOOCkuWQq+OCgeOBn+WApOOCkueul+WHuuOBmeOCi1xuICAgICAgICAgKi9cbiAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCBhcyBTVkdFbGVtZW50KTtcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpO1xuICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZSArIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIHN0eWxlIG1hbmFnZW1lbnQgbWV0aG9kcy5cbiAqIEBqYSDjgrnjgr/jgqTjg6vplqLpgKPjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVN0eWxlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTdHlsZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgdmFsdWUgc3RyaW5nLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WApOOCkuaWh+Wtl+WIl+OBp+i/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbXVsdGlwbGUgY29tcHV0ZWQgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gQ1NTIOOBq+ioreWumuOBleOCjOOBpuOBhOOCi+ODl+ODreODkeODhuOCo+WApOOCkuikh+aVsOWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVzXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcnJheSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjemFjeWIl+OCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHktdmFsdWUgb2JqZWN0LlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+OCkuagvOe0jeOBl+OBn+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZXM6IHN0cmluZ1tdKTogUGxhaW5PYmplY3Q8c3RyaW5nPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgQ1NTIHByb3BlcnRpeSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBzdHJpbmcgdmFsdWUgdG8gc2V0IGZvciB0aGUgcHJvcGVydHkuIGlmIG51bGwgcGFzc2VkLCByZW1vdmUgcHJvcGVydHkuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmloflrZfliJfjgafmjIflrpouIG51bGwg5oyH5a6a44Gn5YmK6ZmkLlxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG9uZSBvciBtb3JlIENTUyBwcm9wZXJ0aWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOBriBDU1Mg6KSH5pWw44Gu44OX44Ot44OR44OG44Kj44Gr5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+KTogdGhpcztcblxuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nIHwgc3RyaW5nW10gfCBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPiwgdmFsdWU/OiBzdHJpbmcgfCBudWxsKTogc3RyaW5nIHwgUGxhaW5PYmplY3Q8c3RyaW5nPiB8IHRoaXMge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gJycgOiB0aGlzO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9IGFzIFBsYWluT2JqZWN0PHN0cmluZz47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgRWxlbWVudDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpLmdldFByb3BlcnR5VmFsdWUoZGFzaGVyaXplKG5hbWUpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5IHNpbmdsZVxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZGFzaGVyaXplKG5hbWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlbW92ZSA9IChudWxsID09PSB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KHByb3BOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkocHJvcE5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KG5hbWUpKSB7XG4gICAgICAgICAgICAvLyBnZXQgbXVsdGlwbGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgbmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZGFzaGVyaXplKGtleSk7XG4gICAgICAgICAgICAgICAgcHJvcHNba2V5XSA9IHZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShlbCkuZ2V0UHJvcGVydHlWYWx1ZShwcm9wTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvcHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgbXVsdGlwbGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSBlbnN1cmVDaGFpbkNhc2VQcm9wZXJpZXMobmFtZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSB9ID0gZWw7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSBwcm9wc1twcm9wTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCBwcm9wc1twcm9wTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+aoquW5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5qiq5bmF44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIHdpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIHdpZHRoKHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBvciBzZXQgdGhlIHdpZHRoIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6KiI566X5riI44G/56uL5bmF44KS44OU44Kv44K744Or5Y2Y5L2N44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBrue4puW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaW5uZXIgd2lkdGggZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOaoquW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lcldpZHRoKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBpbm5lciB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lcldpZHRoKHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VJbm5lclNpemVGb3IodGhpcywgJ3dpZHRoJywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIGhlaWdodCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgcGFkZGluZyBidXQgbm90IGJvcmRlci5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5YaF6YOo57im5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGlubmVySGVpZ2h0KCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBpbm5lciBoZWlnaHQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo57im5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGlubmVySGVpZ2h0KHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIHJldHVybiBtYW5hZ2VJbm5lclNpemVGb3IodGhpcywgJ2hlaWdodCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBvdXRlciB3aWR0aCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jmqKrluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aChpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBvdXRlciB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lpJbpg6jmqKrluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlcldpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlcldpZHRoKC4uLmFyZ3M6IHVua25vd25bXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ3dpZHRoJywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIGhlaWdodCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOe4puW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlckhlaWdodCguLi5hcmdzOiB1bmtub3duW10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCBpbmNsdWRlTWFyZ2luLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgb2Zmc2V0IHBhcmVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6Kaq6KaB57Sg44GL44KJ44Gu55u45a++55qE44Gq6KGo56S65L2N572u44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHBvc2l0aW9uKCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgb2Zmc2V0OiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG4gICAgICAgIGxldCBwYXJlbnRPZmZzZXQgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIG1hcmdpblRvcDogbXQsIG1hcmdpbkxlZnQ6IG1sIH0gPSAkKGVsKS5jc3MoWydwb3NpdGlvbicsICdtYXJnaW5Ub3AnLCAnbWFyZ2luTGVmdCddKTtcbiAgICAgICAgY29uc3QgbWFyZ2luVG9wID0gdG9OdW1iZXIobXQpO1xuICAgICAgICBjb25zdCBtYXJnaW5MZWZ0ID0gdG9OdW1iZXIobWwpO1xuXG4gICAgICAgIC8vIHBvc2l0aW9uOmZpeGVkIGVsZW1lbnRzIGFyZSBvZmZzZXQgZnJvbSB0aGUgdmlld3BvcnQsIHdoaWNoIGl0c2VsZiBhbHdheXMgaGFzIHplcm8gb2Zmc2V0XG4gICAgICAgIGlmICgnZml4ZWQnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gQXNzdW1lIHBvc2l0aW9uOmZpeGVkIGltcGxpZXMgYXZhaWxhYmlsaXR5IG9mIGdldEJvdW5kaW5nQ2xpZW50UmVjdFxuICAgICAgICAgICAgb2Zmc2V0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBnZXRPZmZzZXRQb3NpdGlvbihlbCk7XG5cbiAgICAgICAgICAgIC8vIEFjY291bnQgZm9yIHRoZSAqcmVhbCogb2Zmc2V0IHBhcmVudCwgd2hpY2ggY2FuIGJlIHRoZSBkb2N1bWVudCBvciBpdHMgcm9vdCBlbGVtZW50XG4gICAgICAgICAgICAvLyB3aGVuIGEgc3RhdGljYWxseSBwb3NpdGlvbmVkIGVsZW1lbnQgaXMgaWRlbnRpZmllZFxuICAgICAgICAgICAgY29uc3QgZG9jID0gZWwub3duZXJEb2N1bWVudDtcbiAgICAgICAgICAgIGxldCBvZmZzZXRQYXJlbnQgPSBnZXRPZmZzZXRQYXJlbnQoZWwpID8/IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgICAgICBsZXQgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIHdoaWxlIChvZmZzZXRQYXJlbnQgJiZcbiAgICAgICAgICAgICAgICAob2Zmc2V0UGFyZW50ID09PSBkb2MuYm9keSB8fCBvZmZzZXRQYXJlbnQgPT09IGRvYy5kb2N1bWVudEVsZW1lbnQpICYmXG4gICAgICAgICAgICAgICAgJ3N0YXRpYycgPT09ICRvZmZzZXRQYXJlbnQuY3NzKCdwb3NpdGlvbicpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvZmZzZXRQYXJlbnQgPSBvZmZzZXRQYXJlbnQucGFyZW50Tm9kZSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgICAgICRvZmZzZXRQYXJlbnQgPSAkKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2Zmc2V0UGFyZW50ICYmIG9mZnNldFBhcmVudCAhPT0gZWwgJiYgTm9kZS5FTEVNRU5UX05PREUgPT09IG9mZnNldFBhcmVudC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIC8vIEluY29ycG9yYXRlIGJvcmRlcnMgaW50byBpdHMgb2Zmc2V0LCBzaW5jZSB0aGV5IGFyZSBvdXRzaWRlIGl0cyBjb250ZW50IG9yaWdpblxuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBib3JkZXJUb3BXaWR0aCwgYm9yZGVyTGVmdFdpZHRoIH0gPSAkb2Zmc2V0UGFyZW50LmNzcyhbJ2JvcmRlclRvcFdpZHRoJywgJ2JvcmRlckxlZnRXaWR0aCddKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQudG9wICs9IHRvTnVtYmVyKGJvcmRlclRvcFdpZHRoKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQubGVmdCArPSB0b051bWJlcihib3JkZXJMZWZ0V2lkdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3VidHJhY3QgcGFyZW50IG9mZnNldHMgYW5kIGVsZW1lbnQgbWFyZ2luc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG9wOiBvZmZzZXQudG9wIC0gcGFyZW50T2Zmc2V0LnRvcCAtIG1hcmdpblRvcCxcbiAgICAgICAgICAgIGxlZnQ6IG9mZnNldC5sZWZ0IC0gcGFyZW50T2Zmc2V0LmxlZnQgLSBtYXJnaW5MZWZ0LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIGRvY3VtZW50IOOCkuWfuua6luOBqOOBl+OBpiwg44Oe44OD44OB44GX44Gm44GE44KL6KaB57Sg6ZuG5ZCI44GuMeOBpOebruOBruimgee0oOOBruePvuWcqOOBruW6p+aomeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgasgZG9jdW1lbnQg44KS5Z+65rqW44Gr44GX44Gf54++5Zyo5bqn5qiZ44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29vcmRpbmF0ZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBwcm9wZXJ0aWVzIGB0b3BgIGFuZCBgbGVmdGAuXG4gICAgICogIC0gYGphYCBgdG9wYCwgYGxlZnRgIOODl+ODreODkeODhuOCo+OCkuWQq+OCgOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM6IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogdGhpcztcblxuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM/OiB7IHRvcD86IG51bWJlcjsgbGVmdD86IG51bWJlcjsgfSk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB8IHRoaXMge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IGNvb3JkaW5hdGVzID8geyB0b3A6IDAsIGxlZnQ6IDAgfSA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBjb29yZGluYXRlcykge1xuICAgICAgICAgICAgLy8gZ2V0XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UG9zaXRpb24odGhpc1swXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXRcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BzOiB7IHRvcD86IHN0cmluZzsgbGVmdD86IHN0cmluZzsgfSA9IHt9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIHRvcDogY3NzVG9wLCBsZWZ0OiBjc3NMZWZ0IH0gPSAkZWwuY3NzKFsncG9zaXRpb24nLCAndG9wJywgJ2xlZnQnXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcG9zaXRpb24gZmlyc3QsIGluLWNhc2UgdG9wL2xlZnQgYXJlIHNldCBldmVuIG9uIHN0YXRpYyBlbGVtXG4gICAgICAgICAgICAgICAgaWYgKCdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjdXJPZmZzZXQgPSAkZWwub2Zmc2V0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VyUG9zaXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZWVkQ2FsY3VsYXRlUG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgID0gKCdhYnNvbHV0ZScgPT09IHBvc2l0aW9uIHx8ICdmaXhlZCcgPT09IHBvc2l0aW9uKSAmJiAoY3NzVG9wICsgY3NzTGVmdCkuaW5jbHVkZXMoJ2F1dG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5lZWRDYWxjdWxhdGVQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRlbC5wb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiB0b051bWJlcihjc3NUb3ApLCBsZWZ0OiB0b051bWJlcihjc3NMZWZ0KSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkoKTtcblxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLnRvcCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wcy50b3AgPSBgJHsoY29vcmRpbmF0ZXMudG9wIC0gY3VyT2Zmc2V0LnRvcCkgKyBjdXJQb3NpdGlvbi50b3B9cHhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjb29yZGluYXRlcy5sZWZ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLmxlZnQgPSBgJHsoY29vcmRpbmF0ZXMubGVmdCAtIGN1ck9mZnNldC5sZWZ0KSArIGN1clBvc2l0aW9uLmxlZnR9cHhgO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRlbC5jc3MocHJvcHMgYXMgUGxhaW5PYmplY3Q8c3RyaW5nPik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU3R5bGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBuby1pbnZhbGlkLXRoaXMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIEFjY2Vzc2libGUsXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGNvbWJpbmF0aW9uLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ3VzdG9tRXZlbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NSXRlcmFibGUsIGlzVHlwZUVsZW1lbnQgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHR5cGUgeyBDb25uZWN0RXZlbnRNYXAgfSBmcm9tICcuL2RldGVjdGlvbic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbEV2ZW50TGlzdGVuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBJbnRlcm5hbEV2ZW50TGlzdGVuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG50eXBlIEJpbmRFdmVudENvbnRleHQgPSBSZWNvcmQ8c3RyaW5nLCBCaW5kSW5mbz47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgID0gJ3wnLFxuICAgIEFERFJFU1NfRVZFTlQgICAgID0gMCxcbiAgICBBRERSRVNTX05BTUVTUEFDRSA9IDEsXG4gICAgQUREUkVTU19PUFRJT05TICAgPSAyLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2V2ZW50Q29udGV4dE1hcCA9IHtcbiAgICBldmVudERhdGE6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCB1bmtub3duW10+KCksXG4gICAgZXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCBCaW5kRXZlbnRDb250ZXh0PigpLFxuICAgIGxpdmVFdmVudExpc3RlbmVyczogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIEJpbmRFdmVudENvbnRleHQ+KCksXG59O1xuXG4vKiogQGludGVybmFsIHF1ZXJ5IGV2ZW50LWRhdGEgZnJvbSBlbGVtZW50ICovXG5mdW5jdGlvbiBxdWVyeUV2ZW50RGF0YShldmVudDogRXZlbnQpOiB1bmtub3duW10ge1xuICAgIGNvbnN0IGRhdGEgPSBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5nZXQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpID8/IFtdO1xuICAgIGRhdGEudW5zaGlmdChldmVudCk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZXZlbnQtZGF0YSB3aXRoIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudERhdGE6IHVua25vd25bXSk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLnNldChlbGVtLCBldmVudERhdGEpO1xufVxuXG4vKiogQGludGVybmFsIGRlbGV0ZSBldmVudC1kYXRhIGJ5IGVsZW1lbnQgKi9cbmZ1bmN0aW9uIGRlbGV0ZUV2ZW50RGF0YShlbGVtOiBFbGVtZW50QmFzZSk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmRlbGV0ZShlbGVtKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBub3JtYWxpemUgZXZlbnQgbmFtZXNwYWNlICovXG5mdW5jdGlvbiBub3JtYWxpemVFdmVudE5hbWVzcGFjZXMoZXZlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgbmFtZXNwYWNlcyA9IGV2ZW50LnNwbGl0KCcuJyk7XG4gICAgY29uc3QgbWFpbiA9IG5hbWVzcGFjZXMuc2hpZnQoKSE7XG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbWFpbjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lc3BhY2VzLnNvcnQoKTtcbiAgICAgICAgcmV0dXJuIGAke21haW59LiR7bmFtZXNwYWNlcy5qb2luKCcuJyl9YDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgc3BsaXQgZXZlbnQgbmFtZXNwYWNlcyAqL1xuZnVuY3Rpb24gc3BsaXRFdmVudE5hbWVzcGFjZXMoZXZlbnQ6IHN0cmluZyk6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdIHtcbiAgICBjb25zdCByZXR2YWw6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdID0gW107XG5cbiAgICBjb25zdCBuYW1lc3BhY2VzID0gZXZlbnQuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBtYWluID0gbmFtZXNwYWNlcy5zaGlmdCgpITtcblxuICAgIGlmICghbmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBtYWluLCBuYW1lc3BhY2U6ICcnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWVzcGFjZXMuc29ydCgpO1xuXG4gICAgICAgIGNvbnN0IGNvbWJvczogc3RyaW5nW11bXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gbmFtZXNwYWNlcy5sZW5ndGg7IGkgPj0gMTsgaS0tKSB7XG4gICAgICAgICAgICBjb21ib3MucHVzaCguLi5jb21iaW5hdGlvbihuYW1lc3BhY2VzLCBpKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBgLiR7bmFtZXNwYWNlcy5qb2luKCcuJyl9LmA7XG4gICAgICAgIHJldHZhbC5wdXNoKHsgdHlwZTogbWFpbiwgbmFtZXNwYWNlOiBzaWduYXR1cmUgfSk7XG4gICAgICAgIGZvciAoY29uc3QgbnMgb2YgY29tYm9zKSB7XG4gICAgICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IGAke21haW59LiR7bnMuam9pbignLicpfWAsIG5hbWVzcGFjZTogc2lnbmF0dXJlIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqIEBpbnRlcm5hbCByZXZlcnNlIHJlc29sdXRpb24gZXZlbnQgbmFtZXNwYWNlcyAqL1xuZnVuY3Rpb24gcmVzb2x2ZUV2ZW50TmFtZXNwYWNlcyhlbGVtOiBFbGVtZW50QmFzZSwgZXZlbnQ6IHN0cmluZyk6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdIHtcbiAgICBjb25zdCByZXR2YWw6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdID0gW107XG5cbiAgICBjb25zdCBuYW1lc3BhY2VzID0gZXZlbnQuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBtYWluID0gbmFtZXNwYWNlcy5zaGlmdCgpITtcbiAgICBjb25zdCB0eXBlID0gbm9ybWFsaXplRXZlbnROYW1lc3BhY2VzKGV2ZW50KTtcblxuICAgIGlmICghbmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBtYWluLCBuYW1lc3BhY2U6ICcnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29va2llcyA9IE9iamVjdC5rZXlzKGNvbnRleHQpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2lnbmF0dXJlcyA9IGNvb2tpZXMuZmlsdGVyKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlID09PSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUilbQ29uc3QuQUREUkVTU19FVkVOVF07XG4gICAgICAgICAgICAgICAgfSkubWFwKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUilbQ29uc3QuQUREUkVTU19OQU1FU1BBQ0VdO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2libGluZ3MgPSBjb29raWVzLmZpbHRlcihjb29raWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNpZ25hdHVyZSBvZiBzaWduYXR1cmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2lnbmF0dXJlID09PSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUilbQ29uc3QuQUREUkVTU19OQU1FU1BBQ0VdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pLm1hcChjb29raWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWVkID0gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzZWVkW0NvbnN0LkFERFJFU1NfRVZFTlRdLCBuYW1lc3BhY2U6IHNlZWRbQ29uc3QuQUREUkVTU19OQU1FU1BBQ0VdIH07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5zaWJsaW5ncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgICAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgICAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgZXZlbnQgY29va2llIGZyb20gZXZlbnQgbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMgKi9cbmZ1bmN0aW9uIHRvQ29va2llKGV2ZW50OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgY29uc3Qgb3B0cyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgIGRlbGV0ZSBvcHRzLm9uY2U7XG4gICAgcmV0dXJuIGAke2V2ZW50fSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke25hbWVzcGFjZX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtKU09OLnN0cmluZ2lmeShvcHRzKX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtzZWxlY3Rvcn1gO1xufVxuXG4vKiogQGludGVybmFsIGdldCBsaXN0ZW5lciBoYW5kbGVycyBjb250ZXh0IGJ5IGVsZW1lbnQgYW5kIGV2ZW50ICovXG5mdW5jdGlvbiBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMsIGVuc3VyZTogYm9vbGVhbik6IEJpbmRJbmZvIHtcbiAgICBjb25zdCBldmVudExpc3RlbmVycyA9IHNlbGVjdG9yID8gX2V2ZW50Q29udGV4dE1hcC5saXZlRXZlbnRMaXN0ZW5lcnMgOiBfZXZlbnRDb250ZXh0TWFwLmV2ZW50TGlzdGVuZXJzO1xuICAgIGlmICghZXZlbnRMaXN0ZW5lcnMuaGFzKGVsZW0pKSB7XG4gICAgICAgIGlmIChlbnN1cmUpIHtcbiAgICAgICAgICAgIGV2ZW50TGlzdGVuZXJzLnNldChlbGVtLCB7fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IHVuZGVmaW5lZCEsXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkhO1xuICAgIGNvbnN0IGNvb2tpZSA9IHRvQ29va2llKGV2ZW50LCBuYW1lc3BhY2UsIHNlbGVjdG9yLCBvcHRpb25zKTtcbiAgICBpZiAoIWNvbnRleHRbY29va2llXSkge1xuICAgICAgICBjb250ZXh0W2Nvb2tpZV0gPSB7XG4gICAgICAgICAgICByZWdpc3RlcmVkOiBuZXcgU2V0PEV2ZW50TGlzdGVuZXI+KCksXG4gICAgICAgICAgICBoYW5kbGVyczogW10sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbnRleHRbY29va2llXTtcbn1cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBhbGwgZXZlbnQgYW5kIGhhbmRsZXIgYnkgZWxlbWVudCwgZm9yIGFsbCBgb2ZmKClgIGFuZCBgY2xvbmUodHJ1ZSlgICovXG5mdW5jdGlvbiBleHRyYWN0QWxsSGFuZGxlcnMoZWxlbTogRWxlbWVudEJhc2UsIHJlbW92ZSA9IHRydWUpOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IG9iamVjdDsgfVtdIHtcbiAgICBjb25zdCBoYW5kbGVyczogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSA9IFtdO1xuXG4gICAgY29uc3QgcXVlcnkgPSAoY29udGV4dDogQmluZEV2ZW50Q29udGV4dCB8IHVuZGVmaW5lZCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjb29raWUgb2YgT2JqZWN0LmtleXMoY29udGV4dCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWVkID0gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gc2VlZFtDb25zdC5BRERSRVNTX0VWRU5UXTtcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0gSlNPTi5wYXJzZShzZWVkW0NvbnN0LkFERFJFU1NfT1BUSU9OU10pO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBjb250ZXh0W2Nvb2tpZV0uaGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7IGV2ZW50LCBoYW5kbGVyOiBoYW5kbGVyLnByb3h5LCBvcHRpb25zIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpICYmIHJlbW92ZSAmJiBldmVudExpc3RlbmVycy5kZWxldGUoZWxlbSk7XG4gICAgcXVlcnkobGl2ZUV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGxpdmVFdmVudExpc3RlbmVycy5kZWxldGUoZWxlbSk7XG5cbiAgICByZXR1cm4gaGFuZGxlcnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgbmFtZXNwYWNlIGV2ZW50IGFuZCBoYW5kbGVyIGJ5IGVsZW1lbnQsIGZvciBgb2ZmKGAuJHtuYW1lc3BhY2V9YClgICovXG5mdW5jdGlvbiBleHRyYWN0TmFtZXNwYWNlSGFuZGxlcnMoZWxlbTogRWxlbWVudEJhc2UsIG5hbWVzcGFjZXM6IHN0cmluZyk6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10ge1xuICAgIGNvbnN0IGhhbmRsZXJzOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IG9iamVjdDsgfVtdID0gW107XG5cbiAgICBjb25zdCBuYW1lcyA9IG5hbWVzcGFjZXMuc3BsaXQoJy4nKS5maWx0ZXIobiA9PiAhIW4pO1xuICAgIGNvbnN0IG5hbWVzcGFjZUZpbHRlciA9IChjb29raWU6IHN0cmluZyk6IGJvb2xlYW4gPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IG5hbWVzcGFjZSBvZiBuYW1lcykge1xuICAgICAgICAgICAgaWYgKGNvb2tpZS5pbmNsdWRlcyhgLiR7bmFtZXNwYWNlfS5gKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgY29uc3QgcXVlcnkgPSAoY29udGV4dDogQmluZEV2ZW50Q29udGV4dCB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgY29uc3QgY29va2llcyA9IE9iamVjdC5rZXlzKGNvbnRleHQpLmZpbHRlcihuYW1lc3BhY2VGaWx0ZXIpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjb29raWUgb2YgY29va2llcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzZWVkW0NvbnN0LkFERFJFU1NfRVZFTlRdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBKU09OLnBhcnNlKHNlZWRbQ29uc3QuQUREUkVTU19PUFRJT05TXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgeyByZWdpc3RlcmVkLCBoYW5kbGVyczogX2hhbmRsZXJzIH0gPSBjb250ZXh0W2Nvb2tpZV07XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIF9oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQuZGVsZXRlKGhhbmRsZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCB7IGV2ZW50TGlzdGVuZXJzLCBsaXZlRXZlbnRMaXN0ZW5lcnMgfSA9IF9ldmVudENvbnRleHRNYXA7XG4gICAgcXVlcnkoZXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFBhcnNlRXZlbnRBcmdzUmVzdWx0IHtcbiAgICB0eXBlOiBzdHJpbmdbXTtcbiAgICBzZWxlY3Rvcjogc3RyaW5nO1xuICAgIGxpc3RlbmVyOiBJbnRlcm5hbEV2ZW50TGlzdGVuZXI7XG4gICAgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgcGFyc2UgZXZlbnQgYXJncyAqL1xuZnVuY3Rpb24gcGFyc2VFdmVudEFyZ3MoLi4uYXJnczogdW5rbm93bltdKTogUGFyc2VFdmVudEFyZ3NSZXN1bHQge1xuICAgIGxldCBbdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgIFt0eXBlLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgICAgICBzZWxlY3RvciA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICB0eXBlID0gIXR5cGUgPyBbXSA6IChpc0FycmF5KHR5cGUpID8gdHlwZSA6IFt0eXBlXSk7XG4gICAgc2VsZWN0b3IgPSBzZWxlY3RvciB8fCAnJztcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSBpZiAodHJ1ZSA9PT0gb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0geyBjYXB0dXJlOiB0cnVlIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gYXMgUGFyc2VFdmVudEFyZ3NSZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX25vVHJpZ2dlciA9IFsncmVzaXplJywgJ3Njcm9sbCddO1xuXG4vKiogQGludGVybmFsIGV2ZW50LXNob3J0Y3V0IGltcGwgKi9cbmZ1bmN0aW9uIGV2ZW50U2hvcnRjdXQ8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICB0aGlzOiBET01FdmVudHM8QWNjZXNzaWJsZTxULCAoKSA9PiB2b2lkPj4sXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGhhbmRsZXI/OiBFdmVudExpc3RlbmVyLFxuICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbik6IERPTUV2ZW50czxUPiB7XG4gICAgaWYgKG51bGwgPT0gaGFuZGxlcikge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmICghX25vVHJpZ2dlci5pbmNsdWRlcyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGVsW25hbWVdKSkge1xuICAgICAgICAgICAgICAgICAgICBlbFtuYW1lXSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwgYXMgYW55KS50cmlnZ2VyKG5hbWUgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24obmFtZSBhcyBhbnksIGhhbmRsZXIgYXMgYW55LCBvcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRXZlbnQoc3JjOiBFbGVtZW50LCBkc3Q6IEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhzcmMsIGZhbHNlKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgZHN0LmFkZEV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFbGVtZW50KGVsZW06IEVsZW1lbnQsIHdpdGhFdmVudHM6IGJvb2xlYW4sIGRlZXA6IGJvb2xlYW4pOiBFbGVtZW50IHtcbiAgICBjb25zdCBjbG9uZSA9IGVsZW0uY2xvbmVOb2RlKHRydWUpIGFzIEVsZW1lbnQ7XG5cbiAgICBpZiAod2l0aEV2ZW50cykge1xuICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgY29uc3Qgc3JjRWxlbWVudHMgPSBlbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGNvbnN0IGRzdEVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaW5kZXhdIG9mIHNyY0VsZW1lbnRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGNsb25lRXZlbnQoc3JjRWxlbWVudHNbaW5kZXhdLCBkc3RFbGVtZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2xvbmVFdmVudChlbGVtLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xvbmU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzZWxmIGV2ZW50IG1hbmFnZSAqL1xuZnVuY3Rpb24gaGFuZGxlU2VsZkV2ZW50PFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGY6IERPTUV2ZW50czxURWxlbWVudD4sXG4gICAgY2FsbGJhY2s6IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCxcbiAgICBldmVudE5hbWU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPERPTUV2ZW50TWFwPEhUTUxFbGVtZW50IHwgV2luZG93Pj4sXG4gICAgcGVybWFuZW50OiBib29sZWFuLFxuKTogRE9NRXZlbnRzPFRFbGVtZW50PiB7XG4gICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhpcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgZSk7XG4gICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAoc2VsZiBhcyBET01FdmVudHM8Tm9kZT4pLm9mZihldmVudE5hbWUsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgKHNlbGYgYXMgRE9NRXZlbnRzPE5vZGU+KS5vbihldmVudE5hbWUsIGZpcmVDYWxsQmFjayk7XG4gICAgcmV0dXJuIHNlbGY7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5leHBvcnQgdHlwZSBET01FdmVudE1hcDxUPlxuICAgID0gVCBleHRlbmRzIFdpbmRvdyA/IFdpbmRvd0V2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRG9jdW1lbnQgPyBEb2N1bWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEJvZHlFbGVtZW50ID8gSFRNTEJvZHlFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWVkaWFFbGVtZW50ID8gSFRNTE1lZGlhRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEVsZW1lbnQgPyBIVE1MRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRWxlbWVudCA/IEVsZW1lbnRFdmVudE1hcCAmIENvbm5lY3RFdmVudE1hcFxuICAgIDogR2xvYmFsRXZlbnRIYW5kbGVyc0V2ZW50TWFwO1xuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5cbmV4cG9ydCB0eXBlIERPTUV2ZW50TGlzdGVuZXI8VCA9IEhUTUxFbGVtZW50LCBNIGV4dGVuZHMgRE9NRXZlbnRNYXA8VD4gPSBET01FdmVudE1hcDxUPj4gPSAoZXZlbnQ6IE1ba2V5b2YgTV0sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93blxuXG5leHBvcnQgdHlwZSBFdmVudFdpdGhOYW1lc3BhY2U8VCBleHRlbmRzIERPTUV2ZW50TWFwPHVua25vd24+PiA9IGtleW9mIFQgfCBgJHtzdHJpbmcgJiBrZXlvZiBUfS4ke3N0cmluZ31gO1xuZXhwb3J0IHR5cGUgTWFrZUV2ZW50VHlwZTxULCBNPiA9IFQgZXh0ZW5kcyBrZXlvZiBNID8ga2V5b2YgTSA6IChUIGV4dGVuZHMgYCR7c3RyaW5nICYga2V5b2YgTX0uJHtpbmZlciBDfWAgPyBgJHtzdHJpbmcgJiBrZXlvZiBNfS4ke0N9YCA6IG5ldmVyKTtcbmV4cG9ydCB0eXBlIEV2ZW50VHlwZTxUIGV4dGVuZHMgRE9NRXZlbnRNYXA8dW5rbm93bj4+ID0gTWFrZUV2ZW50VHlwZTxFdmVudFdpdGhOYW1lc3BhY2U8VD4sIFQ+O1xuZXhwb3J0IHR5cGUgRXZlbnRUeXBlT3JOYW1lc3BhY2U8VCBleHRlbmRzIERPTUV2ZW50TWFwPHVua25vd24+PiA9IEV2ZW50VHlwZTxUPiB8IGAuJHtzdHJpbmd9YDtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBldmVudCBtYW5hZ2VtZW50cy5cbiAqIEBqYSDjgqTjg5njg7Pjg4jnrqHnkIbjgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUV2ZW50czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgYmFzaWNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb24oLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUxpdmVFdmVudChlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgY29uc3QgZXZlbnREYXRhID0gcXVlcnlFdmVudERhdGEoZSk7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChlLnRhcmdldCBhcyBFbGVtZW50IHwgbnVsbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkoJHRhcmdldFswXSwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXJlbnQgb2YgJHRhcmdldC5wYXJlbnRzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50KS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHBhcmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBxdWVyeUV2ZW50RGF0YShlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm94eSA9IHNlbGVjdG9yID8gaGFuZGxlTGl2ZUV2ZW50IDogaGFuZGxlRXZlbnQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHNwbGl0RXZlbnROYW1lc3BhY2VzKGV2ZW50KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbWJvIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHR5cGUsIG5hbWVzcGFjZSB9ID0gY29tYm87XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJlZCAmJiAhcmVnaXN0ZXJlZC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmFkZChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm94eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIG9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCkgYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub24gfCBvbn0oKSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIG9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCkgYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub24gfCBvbn0oKSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGFsbCBldmVudCBoYW5kbGVyLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgZnjgbnjgabjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmKCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2ZmKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhlbCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdE5hbWVzcGFjZUhhbmRsZXJzKGVsLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHJlc29sdmVFdmVudE5hbWVzcGFjZXMoZWwsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tYm8gb2YgY29tYm9zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB0eXBlLCBuYW1lc3BhY2UgfSA9IGNvbWJvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IGhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gaGFuZGxlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHsgLy8gYmFja3dhcmQgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChoYW5kbGVyPy5saXN0ZW5lcj8ub3JpZ2luID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLnByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCDkuIDluqbjgaDjgZHlkbzjgbPlh7rjgZXjgozjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+WvvuOBl+OBpuOCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIG9uY2UoLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgLi4ub3B0aW9ucywgLi4ueyBvbmNlOiB0cnVlIH0gfTtcblxuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gb25jZUhhbmRsZXIodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgLi4uZXZlbnRBcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGV2ZW50QXJncyk7XG4gICAgICAgICAgICBzZWxmLm9mZih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICAgICAgICAgIGRlbGV0ZSBvbmNlSGFuZGxlci5vcmlnaW47XG4gICAgICAgIH1cbiAgICAgICAgb25jZUhhbmRsZXIub3JpZ2luID0gbGlzdGVuZXIgYXMgSW50ZXJuYWxFdmVudExpc3RlbmVyIHwgdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdGhpcy5vbih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhbGwgaGFuZGxlcnMgYWRkZWQgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBq+WvvuOBl+OBpuOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiAvLyB3LyBldmVudC1uYW1lc3BhY2UgYmVoYXZpb3VyXG4gICAgICogJCgnLmxpbmsnKS5vbignY2xpY2suaG9nZS5waXlvJywgKGUpID0+IHsgLi4uIH0pO1xuICAgICAqICQoJy5saW5rJykub24oJ2NsaWNrLmhvZ2UnLCAgKGUpID0+IHsgLi4uIH0pO1xuICAgICAqXG4gICAgICogJCgnLmxpbmsnKS50cmlnZ2VyKCcuaG9nZScpOyAgICAgICAgICAgLy8gY29tcGlsZSBlcnJvci4gKG5vdCBmaXJlKVxuICAgICAqICQoJy5saW5rJykudHJpZ2dlcignY2xpY2suaG9nZScpOyAgICAgIC8vIGZpcmUgYm90aC5cbiAgICAgKiAkKCcubGluaycpLnRyaWdnZXIoJ2NsaWNrLmhvZ2UucGl5bycpOyAvLyBmaXJlIG9ubHkgZmlyc3Qgb25lXG4gICAgICogYGBgXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS4gLyBgRXZlbnRgIGluc3RhbmNlIG9yIGBFdmVudGAgaW5zdGFuY2UgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJcgLyBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCuemFjeWIl1xuICAgICAqIEBwYXJhbSBldmVudERhdGFcbiAgICAgKiAgLSBgZW5gIG9wdGlvbmFsIHNlbmRpbmcgZGF0YS5cbiAgICAgKiAgLSBgamFgIOmAgeS/oeOBmeOCi+S7u+aEj+OBruODh+ODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHNlZWQ6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdIHwgRXZlbnQgfCBFdmVudFtdIHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgRXZlbnQpW10sXG4gICAgICAgIC4uLmV2ZW50RGF0YTogdW5rbm93bltdXG4gICAgKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNvbnZlcnQgPSAoYXJnOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IEV2ZW50KTogRXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGFyZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUV2ZW50KG5vcm1hbGl6ZUV2ZW50TmFtZXNwYWNlcyhhcmcpLCB7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogZXZlbnREYXRhLFxuICAgICAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnIGFzIEV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IGlzQXJyYXkoc2VlZCkgPyBzZWVkIDogW3NlZWRdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBlID0gY29udmVydChldmVudCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlckV2ZW50RGF0YShlbCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUV2ZW50RGF0YShlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgdXRpbGl0eVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgndHJhbnNpdGlvbnN0YXJ0JykuXG4gICAgICogQGphIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCd0cmFuc2l0aW9uc3RhcnQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25zdGFydGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGB0cmFuc2l0aW9uc3RhcnRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJhbnNpdGlvblN0YXJ0KGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAndHJhbnNpdGlvbnN0YXJ0JywgcGVybWFuZW50KSBhcyB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ3RyYW5zaXRpb25lbmQnKS5cbiAgICAgKiBAamEge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ3RyYW5zaXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAndHJhbnNpdGlvbmVuZCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCdhbmltYXRpb25zdGFydCcpLlxuICAgICAqIEBqYSB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgnYW5pbWF0aW9uc3RhcnQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYGFuaW1hdGlvbnN0YXJ0YCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbnN0YXJ0YCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGlvblN0YXJ0KGNhbGxiYWNrOiAoZXZlbnQ6IEFuaW1hdGlvbkV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTZWxmRXZlbnQodGhpcywgY2FsbGJhY2ssICdhbmltYXRpb25zdGFydCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCdhbmltYXRpb25lbmQnKS5cbiAgICAgKiBAamEge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ2FuaW1hdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZVNlbGZFdmVudCh0aGlzLCBjYWxsYmFjaywgJ2FuaW1hdGlvbmVuZCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmluZCBvbmUgb3IgdHdvIGhhbmRsZXJzIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzLCB0byBiZSBleGVjdXRlZCB3aGVuIHRoZSBgbW91c2VlbnRlcmAgYW5kIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudHMuXG4gICAgICogQGphIDHjgaTjgb7jgZ/jga8y44Gk44Gu44OP44Oz44OJ44Op44KS5oyH5a6a44GXLCDkuIDoh7TjgZfjgZ/opoHntKDjga4gYG1vdXNlZW50ZXJgLCBgbW91c2VsZWF2ZWAg44KS5qSc55+lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlckluKE91dClcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VlbnRlcmAgdGhlIGVsZW1lbnQuIDxicj5cbiAgICAgKiAgICAgICAgSWYgaGFuZGxlciBzZXQgb25seSBvbmUsIGEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQsIHRvby5cbiAgICAgKiAgLSBgamFgIGBtb3VzZWVudGVyYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIDxicj5cbiAgICAgKiAgICAgICAgICDlvJXmlbDjgYwx44Gk44Gn44GC44KL5aC05ZCILCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KC5YW844Gt44KLXG4gICAgICogQHBhcmFtIGhhbmRsZXJPdXRcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGhvdmVyKGhhbmRsZXJJbjogRE9NRXZlbnRMaXN0ZW5lciwgaGFuZGxlck91dD86IERPTUV2ZW50TGlzdGVuZXIpOiB0aGlzIHtcbiAgICAgICAgaGFuZGxlck91dCA9IGhhbmRsZXJPdXQgPz8gaGFuZGxlckluO1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZWVudGVyKGhhbmRsZXJJbikubW91c2VsZWF2ZShoYW5kbGVyT3V0KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBzaG9ydGN1dFxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xpY2soaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY2xpY2snLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGRibGNsaWNrYCBldmVudC5cbiAgICAgKiBAamEgYGRibGNsaWNrYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkYmxjbGljayhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdkYmxjbGljaycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgYmx1cmAgZXZlbnQuXG4gICAgICogQGphIGBibHVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBibHVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2JsdXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1cyhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1cycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNpbmAgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c2luYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c2luKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3VzaW4nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3Vzb3V0YCBldmVudC5cbiAgICAgKiBAamEgYGZvY3Vzb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c291dChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c291dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5dXBgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5dXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXVwKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlkb3duYCBldmVudC5cbiAgICAgKiBAamEgYGtleWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleWRvd24oaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5ZG93bicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5cHJlc3NgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5cHJlc3NgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXByZXNzKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXByZXNzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzdWJtaXRgIGV2ZW50LlxuICAgICAqIEBqYSBgc3VibWl0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdWJtaXQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc3VibWl0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjb250ZXh0bWVudWAgZXZlbnQuXG4gICAgICogQGphIGBjb250ZXh0bWVudWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGV4dG1lbnUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY29udGV4dG1lbnUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNoYW5nZWAgZXZlbnQuXG4gICAgICogQGphIGBjaGFuZ2VgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjaGFuZ2UnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZG93bihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWRvd24nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbW92ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW1vdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlbW92ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNldXBgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2V1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2V1cChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWVudGVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZW50ZXIoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VlbnRlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VsZWF2ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWxlYXZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWxlYXZlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbGVhdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3V0YCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW91dChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW91dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdmVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3ZlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdmVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlb3ZlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hzdGFydGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaHN0YXJ0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaHN0YXJ0KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoc3RhcnQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoZW5kYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoZW5kYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGVuZChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGVuZCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2htb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNobW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2htb3ZlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNobW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hjYW5jZWxgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hjYW5jZWxgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoY2FuY2VsKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoY2FuY2VsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGByZXNpemVgIGV2ZW50LlxuICAgICAqIEBqYSBgcmVzaXplYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNpemUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgncmVzaXplJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzY3JvbGxgIGV2ZW50LlxuICAgICAqIEBqYSBgc2Nyb2xsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGwoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc2Nyb2xsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBDb3B5aW5nXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu44OH44Kj44O844OX44Kz44OU44O844KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEV2ZW50c1xuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciBldmVudCBoYW5kbGVycyBzaG91bGQgYmUgY29waWVkIGFsb25nIHdpdGggdGhlIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KC44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICogQHBhcmFtIGRlZXBcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgY2xvbmVkIGVsZW1lbnQgc2hvdWxkIGJlIGNvcGllZC5cbiAgICAgKiAgLSBgamFgIGJvb2xlYW7lgKTjgafjgIHphY3kuIvjga7opoHntKDjga7jgZnjgbnjgabjga7lrZDopoHntKDjgavlr77jgZfjgabjgoLjgIHku5jpmo/jgZfjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLjgrPjg5Tjg7zjgZnjgovjgYvjganjgYbjgYvjgpLmsbrlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUod2l0aEV2ZW50cyA9IGZhbHNlLCBkZWVwID0gZmFsc2UpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudChzZWxmKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGYubWFwKChpbmRleDogbnVtYmVyLCBlbDogVEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjbG9uZUVsZW1lbnQoZWwgYXMgTm9kZSBhcyBFbGVtZW50LCB3aXRoRXZlbnRzLCBkZWVwKSBhcyBOb2RlIGFzIFRFbGVtZW50O1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUV2ZW50cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgTnVsbGlzaCxcbiAgICBpc051bWJlcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzaWZ5LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBpc1dpbmRvd0NvbnRleHQsXG4gICAgZW5zdXJlUG9zaXRpdmVOdW1iZXIsXG4gICAgc3dpbmcsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc05vZGVEb2N1bWVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IGdldE9mZnNldFNpemUgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIHtAbGluayBET019YC5zY3JvbGxUbygpYCBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEge0BsaW5rIERPTX1gLnNjcm9sbFRvKClgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVNjcm9sbE9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogQGphIOe4puOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqL1xuICAgIHRvcD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg5qiq44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgbGVmdD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgZHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiBAamEg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqL1xuICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBzY3JvbGwgdGFyZ2V0IGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5VGFyZ2V0RWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfSBlbHNlIGlmIChpc05vZGVEb2N1bWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2UgaWYgKGlzV2luZG93Q29udGV4dChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIHBhcnNlQXJncyguLi5hcmdzOiB1bmtub3duW10pOiBET01TY3JvbGxPcHRpb25zIHtcbiAgICBjb25zdCBvcHRpb25zOiBET01TY3JvbGxPcHRpb25zID0geyBlYXNpbmc6ICdzd2luZycgfTtcbiAgICBpZiAoMSA9PT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBhcmdzWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbbGVmdCwgdG9wLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFja10gPSBhcmdzO1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHtcbiAgICAgICAgICAgIHRvcCxcbiAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcHRpb25zLnRvcCAgICAgID0gZW5zdXJlUG9zaXRpdmVOdW1iZXIob3B0aW9ucy50b3ApO1xuICAgIG9wdGlvbnMubGVmdCAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmxlZnQpO1xuICAgIG9wdGlvbnMuZHVyYXRpb24gPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmR1cmF0aW9uKTtcblxuICAgIHJldHVybiBvcHRpb25zO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHNjcm9sbFRvKClgICovXG5mdW5jdGlvbiBleGVjU2Nyb2xsKGVsOiBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQsIG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICBjb25zdCB7IHRvcCwgbGVmdCwgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2sgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBpbml0aWFsVG9wID0gZWwuc2Nyb2xsVG9wO1xuICAgIGNvbnN0IGluaXRpYWxMZWZ0ID0gZWwuc2Nyb2xsTGVmdDtcbiAgICBsZXQgZW5hYmxlVG9wID0gaXNOdW1iZXIodG9wKTtcbiAgICBsZXQgZW5hYmxlTGVmdCA9IGlzTnVtYmVyKGxlZnQpO1xuXG4gICAgLy8gbm9uIGFuaW1hdGlvbiBjYXNlXG4gICAgaWYgKCFkdXJhdGlvbikge1xuICAgICAgICBsZXQgbm90aWZ5ID0gZmFsc2U7XG4gICAgICAgIGlmIChlbmFibGVUb3AgJiYgdG9wICE9PSBpbml0aWFsVG9wKSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxUb3AgPSB0b3AhO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5hYmxlTGVmdCAmJiBsZWZ0ICE9PSBpbml0aWFsTGVmdCkge1xuICAgICAgICAgICAgZWwuc2Nyb2xsTGVmdCA9IGxlZnQhO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90aWZ5ICYmIGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjTWV0cmljcyA9IChlbmFibGU6IGJvb2xlYW4sIGJhc2U6IG51bWJlciwgaW5pdGlhbFZhbHVlOiBudW1iZXIsIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IHsgbWF4OiBudW1iZXI7IG5ldzogbnVtYmVyOyBpbml0aWFsOiBudW1iZXI7IH0gPT4ge1xuICAgICAgICBpZiAoIWVuYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWF4OiAwLCBuZXc6IDAsIGluaXRpYWw6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXhWYWx1ZSA9IChlbCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdIC0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gTWF0aC5tYXgoTWF0aC5taW4oYmFzZSwgbWF4VmFsdWUpLCAwKTtcbiAgICAgICAgcmV0dXJuIHsgbWF4OiBtYXhWYWx1ZSwgbmV3OiBuZXdWYWx1ZSwgaW5pdGlhbDogaW5pdGlhbFZhbHVlIH07XG4gICAgfTtcblxuICAgIGNvbnN0IG1ldHJpY3NUb3AgPSBjYWxjTWV0cmljcyhlbmFibGVUb3AsIHRvcCEsIGluaXRpYWxUb3AsICdoZWlnaHQnKTtcbiAgICBjb25zdCBtZXRyaWNzTGVmdCA9IGNhbGNNZXRyaWNzKGVuYWJsZUxlZnQsIGxlZnQhLCBpbml0aWFsTGVmdCwgJ3dpZHRoJyk7XG5cbiAgICBpZiAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3ID09PSBtZXRyaWNzVG9wLmluaXRpYWwpIHtcbiAgICAgICAgZW5hYmxlVG9wID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChlbmFibGVMZWZ0ICYmIG1ldHJpY3NMZWZ0Lm5ldyA9PT0gbWV0cmljc0xlZnQuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVMZWZ0ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICghZW5hYmxlVG9wICYmICFlbmFibGVMZWZ0KSB7XG4gICAgICAgIC8vIG5lZWQgbm90IHRvIHNjcm9sbFxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FsY1Byb2dyZXNzID0gKHZhbHVlOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihlYXNpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZWFzaW5nKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAnbGluZWFyJyA9PT0gZWFzaW5nID8gdmFsdWUgOiBzd2luZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgZGVsdGEgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBhbmltYXRlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBlbGFwc2UgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGgubWF4KE1hdGgubWluKGVsYXBzZSAvIGR1cmF0aW9uLCAxKSwgMCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzQ29lZmYgPSBjYWxjUHJvZ3Jlc3MocHJvZ3Jlc3MpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBkZWx0YVxuICAgICAgICBpZiAoZW5hYmxlVG9wKSB7XG4gICAgICAgICAgICBkZWx0YS50b3AgPSBtZXRyaWNzVG9wLmluaXRpYWwgKyAocHJvZ3Jlc3NDb2VmZiAqIChtZXRyaWNzVG9wLm5ldyAtIG1ldHJpY3NUb3AuaW5pdGlhbCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0KSB7XG4gICAgICAgICAgICBkZWx0YS5sZWZ0ID0gbWV0cmljc0xlZnQuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NMZWZ0Lm5ldyAtIG1ldHJpY3NMZWZ0LmluaXRpYWwpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIGRvbmVcbiAgICAgICAgaWYgKChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPiBtZXRyaWNzVG9wLmluaXRpYWwgJiYgZGVsdGEudG9wID49IG1ldHJpY3NUb3AubmV3KSAgICAgICB8fCAvLyBzY3JvbGwgZG93blxuICAgICAgICAgICAgKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA8IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPD0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCB1cFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID4gbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0ID49IG1ldHJpY3NMZWZ0Lm5ldykgIHx8IC8vIHNjcm9sbCByaWdodFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3IDwgbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0IDw9IG1ldHJpY3NMZWZ0Lm5ldykgICAgIC8vIHNjcm9sbCBsZWZ0XG4gICAgICAgICkge1xuICAgICAgICAgICAgLy8gZW5zdXJlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICBlbmFibGVUb3AgJiYgKGVsLnNjcm9sbFRvcCA9IG1ldHJpY3NUb3AubmV3KTtcbiAgICAgICAgICAgIGVuYWJsZUxlZnQgJiYgKGVsLnNjcm9sbExlZnQgPSBtZXRyaWNzTGVmdC5uZXcpO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlbGVhc2UgcmVmZXJlbmNlIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgZWwgPSBudWxsITtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBkZWx0YS50b3ApO1xuICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gZGVsdGEubGVmdCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44K544Kv44Ot44O844Or44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TY3JvbGw8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU2Nyb2xsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb246IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUb3AoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxUb3AgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgdG9wOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg5qiq5pa55ZCR44K544Kv44Ot44O844Or44GV44KM44Gf44OU44Kv44K744Or5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NpdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxMZWZ0IDogMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsVG8oe1xuICAgICAgICAgICAgICAgIGxlZnQ6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5qiq5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0geFxuICAgICAqICAtIGBlbmAgdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0geVxuICAgICAqICAtIGBlbmAgdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhcbiAgICAgICAgeDogbnVtYmVyLFxuICAgICAgICB5OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBzY3JvbGwgdmFsdWVzIGJ5IG9wdG9pbnMuXG4gICAgICogQGphIOOCquODl+OCt+ODp+ODs+OCkueUqOOBhOOBpuOCueOCr+ODreODvOODq+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhvcHRpb25zOiBET01TY3JvbGxPcHRpb25zKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUbyguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlQXJncyguLi5hcmdzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtID0gcXVlcnlUYXJnZXRFbGVtZW50KGVsKTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZXhlY1Njcm9sbChlbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVNjcm9sbCwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgRWxlbWVudEJhc2UsIERPTSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NfSBlZmZlY3QgcGFyYW1ldGVyLlxuICogQGphIHtAbGluayBET019IOOCqOODleOCp+OCr+ODiOWKueaenOOBruODkeODqeODoeODvOOCv1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RQYXJhbWV0ZXJzID0gS2V5ZnJhbWVbXSB8IFByb3BlcnR5SW5kZXhlZEtleWZyYW1lcyB8IG51bGw7XG5cbi8qKlxuICogQGVuIHtAbGluayBET019IGVmZmVjdCBvcHRpb25zLlxuICogQGphIHtAbGluayBET019IOOCqOODleOCp+OCr+ODiOWKueaenOOBruOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RPcHRpb25zID0gbnVtYmVyIHwgS2V5ZnJhbWVBbmltYXRpb25PcHRpb25zO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NfSBlZmZlY3QgY29udGV4dCBvYmplY3QuXG4gKiBAamEge0BsaW5rIERPTX0g44Gu44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiB7XG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBET019IGluc3RhbmNlIHRoYXQgY2FsbGVkIHtAbGluayBET01FZmZlY3RzLmFuaW1hdGUgfCBhbmltYXRlfSgpIG1ldGhvZC5cbiAgICAgKiBAamEge0BsaW5rIERPTUVmZmVjdHMuYW5pbWF0ZSB8IGFuaW1hdGV9KCkg44Oh44K944OD44OJ44KS5a6f6KGM44GX44GfIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGRvbTogRE9NPFRFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYW5kIGBBbmltYXRpb25gIGluc3RhbmNlIG1hcCBieSBleGVjdXRpb24ge0BsaW5rIERPTUVmZmVjdHMuYW5pbWF0ZSB8IGFuaW1hdGV9KCkgbWV0aG9kIGF0IHRoaXMgdGltZS5cbiAgICAgKiBAamEg5LuK5ZueIHtAbGluayBET01FZmZlY3RzLmFuaW1hdGUgfCBhbmltYXRlfSgpIOWun+ihjOOBl+OBnyBgRWxlbWVudGAg44GoIGBBbmltYXRpb25gIOOCpOODs+OCueOCv+ODs+OCueOBruODnuODg+ODl1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGFuaW1hdGlvbnM6IE1hcDxURWxlbWVudCwgQW5pbWF0aW9uPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY3VycmVudCBmaW5pc2hlZCBQcm9taXNlIGZvciB0aGlzIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg5a++6LGh44Ki44OL44Oh44O844K344On44Oz44Gu57WC5LqG5pmC44Gr55m654Gr44GZ44KLIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICByZWFkb25seSBmaW5pc2hlZDogUHJvbWlzZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9hbmltQ29udGV4dE1hcCA9IG5ldyBXZWFrTWFwPEVsZW1lbnQsIFNldDxBbmltYXRpb24+PigpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGFuaW1hdGlvbi9lZmZlY3QgbWV0aG9kcy5cbiAqIEBqYSDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Mv44Ko44OV44Kn44Kv44OI5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FZmZlY3RzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHMgYW5pbWF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhcnQgYW5pbWF0aW9uIGJ5IGBXZWIgQW5pbWF0aW9uIEFQSWAuXG4gICAgICogQGphIGBXZWIgQW5pbWF0aW9uIEFQSWAg44KS55So44GE44Gm44Ki44OL44Oh44O844K344On44Oz44KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGUocGFyYW1zOiBET01FZmZlY3RQYXJhbWV0ZXJzLCBvcHRpb25zOiBET01FZmZlY3RPcHRpb25zKTogRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICBkb206IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD4sXG4gICAgICAgICAgICBhbmltYXRpb25zOiBuZXcgTWFwPFRFbGVtZW50LCBBbmltYXRpb24+KCksXG4gICAgICAgIH0gYXMgV3JpdGFibGU8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xuXG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmltID0gZWwuYW5pbWF0ZShwYXJhbXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsKSA/PyBuZXcgU2V0KCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5hZGQoYW5pbSk7XG4gICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLnNldChlbCwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmFuaW1hdGlvbnMuc2V0KGVsIGFzIE5vZGUgYXMgVEVsZW1lbnQsIGFuaW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5hbGwoWy4uLnJlc3VsdC5hbmltYXRpb25zLnZhbHVlcygpXS5tYXAoYW5pbSA9PiBhbmltLmZpbmlzaGVkKSkudGhlbigoKSA9PiByZXN1bHQpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLkuK3mraJcbiAgICAgKi9cbiAgICBwdWJsaWMgY2FuY2VsKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmNhbmNlbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF9hbmltQ29udGV4dE1hcC5kZWxldGUoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGaW5pc2ggY3VycmVudCBydW5uaW5nIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg54++5Zyo5a6f6KGM44GX44Gm44GE44KL44Ki44OL44Oh44O844K344On44Oz44KS57WC5LqGXG4gICAgICovXG4gICAgcHVibGljIGZpbmlzaCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYW5pbWF0aW9uIG9mIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5maW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBmaW5pc2gg44Gn44Gv56C05qOE44GX44Gq44GEXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWZmZWN0cyB1dGlsaXR5XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBmb3JjZSByZWZsb3cuXG4gICAgICogQGphIOW8t+WItuODquODleODreODvOOCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyByZWZsb3coKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzWzBdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyB1bmtub3duIGFzIERPTSkgIHtcbiAgICAgICAgICAgICAgICBub29wKGVsLm9mZnNldEhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgZm9yY2UgcmVwYWludC5cbiAgICAgKiBAamEg5by35Yi25YaN5o+P55S744KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIHJlcGFpbnQoKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzWzBdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyB1bmtub3duIGFzIERPTSkgIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gZWwuc3R5bGUuZGlzcGxheTtcbiAgICAgICAgICAgICAgICBlbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGVsLnN0eWxlLmRpc3BsYXkgPSBjdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRWZmZWN0cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgQ2xhc3MsXG4gICAgbWl4aW5zLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRWxlbWVudGlmeVNlZWQsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRE9NQmFzZSB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBET01BdHRyaWJ1dGVzIH0gZnJvbSAnLi9hdHRyaWJ1dGVzJztcbmltcG9ydCB7IERPTVRyYXZlcnNpbmcgfSBmcm9tICcuL3RyYXZlcnNpbmcnO1xuaW1wb3J0IHsgRE9NTWFuaXB1bGF0aW9uIH0gZnJvbSAnLi9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHsgRE9NU3R5bGVzIH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHsgRE9NRXZlbnRzIH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHsgRE9NU2Nyb2xsIH0gZnJvbSAnLi9zY3JvbGwnO1xuaW1wb3J0IHsgRE9NRWZmZWN0cyB9IGZyb20gJy4vZWZmZWN0cyc7XG5cbnR5cGUgRE9NRmVhdHVyZXM8VCBleHRlbmRzIEVsZW1lbnRCYXNlPlxuICAgID0gRE9NQmFzZTxUPlxuICAgICYgRE9NQXR0cmlidXRlczxUPlxuICAgICYgRE9NVHJhdmVyc2luZzxUPlxuICAgICYgRE9NTWFuaXB1bGF0aW9uPFQ+XG4gICAgJiBET01TdHlsZXM8VD5cbiAgICAmIERPTUV2ZW50czxUPlxuICAgICYgRE9NU2Nyb2xsPFQ+XG4gICAgJiBET01FZmZlY3RzPFQ+O1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NfSBwbHVnaW4gbWV0aG9kIGRlZmluaXRpb24uXG4gKiBAamEge0BsaW5rIERPTX0g44OX44Op44Kw44Kk44Oz44Oh44K944OD44OJ5a6a576pXG4gKlxuICogQG5vdGVcbiAqICAtIOODl+ODqeOCsOOCpOODs+aLoeW8teWumue+qeOBr+OBk+OBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueODnuODvOOCuOOBmeOCiy5cbiAqICAtIFR5cGVTY3JpcHQgMy43IOaZgueCueOBpywgbW9kdWxlIGludGVyZmFjZSDjga7jg57jg7zjgrjjga8gbW9kdWxlIOOBruWujOWFqOOBquODkeOCueOCkuW/heimgeOBqOOBmeOCi+OBn+OCgSxcbiAqICAgIOacrOODrOODneOCuOODiOODquOBp+OBryBidW5kbGUg44GX44GfIGBkaXN0L2RvbS5kLnRzYCDjgpLmj5DkvpvjgZnjgosuXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zMzMyNlxuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTc4NDgxMzQvdHJvdWJsZS11cGRhdGluZy1hbi1pbnRlcmZhY2UtdXNpbmctZGVjbGFyYXRpb24tbWVyZ2luZ1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVBsdWdpbiB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlXG5cbi8qKlxuICogQGVuIFRoaXMgaW50ZXJmYWNlIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6b44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIERPTUZlYXR1cmVzPFQ+LCBET01QbHVnaW4geyB9XG5cbmV4cG9ydCB0eXBlIERPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBFbGVtZW50aWZ5U2VlZDxUPiB8IERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgRE9NUmVzdWx0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+ID0gVCBleHRlbmRzIERPTTxFbGVtZW50QmFzZT4gPyBUIDogKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IERPTTxUPiA6IERPTTxIVE1MRWxlbWVudD4pO1xuZXhwb3J0IHR5cGUgRE9NSXRlcmF0ZUNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gYm9vbGVhbiB8IHZvaWQ7XG5cbi8qKlxuICogQGVuIFRoaXMgY2xhc3MgcHJvdmlkZXMgRE9NIG9wZXJhdGlvbnMgbGlrZSBgalF1ZXJ5YCBsaWJyYXJ5LlxuICogQGphIGBqUXVlcnlgIOOBruOCiOOBhuOBqkRPTSDmk43kvZzjgpLmj5DkvptcbiAqXG4gKiBVTlNVUFBPUlRFRCBNRVRIT0QgTElTVFxuICpcbiAqIFtUcmF2ZXJzaW5nXVxuICogIC5hZGRCYWNrKClcbiAqICAuZW5kKClcbiAqXG4gKiBbRWZmZWN0c11cbiAqIC5zaG93KClcbiAqIC5oaWRlKClcbiAqIC50b2dnbGUoKVxuICogLnN0b3AoKVxuICogLmNsZWFyUXVldWUoKVxuICogLmRlbGF5KClcbiAqIC5kZXF1ZXVlKClcbiAqIC5mYWRlSW4oKVxuICogLmZhZGVPdXQoKVxuICogLmZhZGVUbygpXG4gKiAuZmFkZVRvZ2dsZSgpXG4gKiAucXVldWUoKVxuICogLnNsaWRlRG93bigpXG4gKiAuc2xpZGVUb2dnbGUoKVxuICogLnNsaWRlVXAoKVxuICovXG5leHBvcnQgY2xhc3MgRE9NQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoXG4gICAgRE9NQmFzZSxcbiAgICBET01BdHRyaWJ1dGVzLFxuICAgIERPTVRyYXZlcnNpbmcsXG4gICAgRE9NTWFuaXB1bGF0aW9uLFxuICAgIERPTVN0eWxlcyxcbiAgICBET01FdmVudHMsXG4gICAgRE9NU2Nyb2xsLFxuICAgIERPTUVmZmVjdHMsXG4pIHtcbiAgICAvKipcbiAgICAgKiBwcml2YXRlIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiB0YXJnZXRzIGBFbGVtZW50YCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOaTjeS9nOWvvuixoeOBriBgRWxlbWVudGAg6YWN5YiXXG4gICAgICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihlbGVtZW50czogRWxlbWVudEJhc2VbXSkge1xuICAgICAgICBzdXBlcihlbGVtZW50cyk7XG4gICAgICAgIC8vIGFsbCBzb3VyY2UgY2xhc3NlcyBoYXZlIG5vIGNvbnN0cnVjdG9yLlxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUge0BsaW5rIERPTX0gaW5zdGFuY2UgZnJvbSBgc2VsZWN0b3JgIGFyZy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICogQHJldHVybnMge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoc2VsZWN0b3IgJiYgIWNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmIChpc0RPTUNsYXNzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxlY3RvciBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBET01DbGFzcygoZWxlbWVudGlmeShzZWxlY3RvciBhcyBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dCkpKSBhcyB1bmtub3duIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG59XG5cbi8vIG1peGluIOOBq+OCiOOCiyBgaW5zdGFuY2VvZmAg44Gv54Sh5Yq544Gr6Kit5a6aXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01DbGFzcyBhcyB1bmtub3duIGFzIENsYXNzLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgdmFsdWUtdHlwZSBpcyB7QGxpbmsgRE9NfS5cbiAqIEBqYSB7QGxpbmsgRE9NfSDlnovjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0geFxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTUNsYXNzKHg6IHVua25vd24pOiB4IGlzIERPTSB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBET01DbGFzcztcbn1cbiIsImltcG9ydCB7IHNldHVwIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NQ2xhc3MgfSBmcm9tICcuL2NsYXNzJztcblxuLy8gaW5pdCBmb3Igc3RhdGljXG5zZXR1cChET01DbGFzcy5wcm90b3R5cGUsIERPTUNsYXNzLmNyZWF0ZSk7XG5cbmV4cG9ydCAqIGZyb20gJy4vZXhwb3J0cyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIGRlZmF1bHQgfSBmcm9tICcuL2V4cG9ydHMnO1xuIl0sIm5hbWVzIjpbIiQiLCJkb20iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQTs7QUFFRztBQUVILGlCQUF3QixNQUFNLE1BQU0sR0FBa0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM5RSxpQkFBd0IsTUFBTSxRQUFRLEdBQWdCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEYsaUJBQXdCLE1BQU0sV0FBVyxHQUFhLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbkYsaUJBQXdCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQzs7QUNUNUY7O0FBRUc7QUFpQkg7QUFDTSxTQUFVLGVBQWUsQ0FBQyxDQUFVLEVBQUE7QUFDdEMsSUFBQSxPQUFRLENBQVksRUFBRSxNQUFNLFlBQVksTUFBTSxDQUFDO0FBQ25ELENBQUM7QUFFRDtBQUNnQixTQUFBLFVBQVUsQ0FBeUIsSUFBd0IsRUFBRSxPQUE2QixFQUFBO0lBQ3RHLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDUCxRQUFBLE9BQU8sRUFBRSxDQUFDO0FBQ2IsS0FBQTtBQUVELElBQUEsT0FBTyxHQUFHLE9BQU8sSUFBSSxRQUFRLENB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