/*!
 * @cdp/dom 0.9.18
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwidXRpbHMudHMiLCJkZXRlY3Rpb24udHMiLCJzdGF0aWMudHMiLCJiYXNlLnRzIiwiYXR0cmlidXRlcy50cyIsInRyYXZlcnNpbmcudHMiLCJtYW5pcHVsYXRpb24udHMiLCJzdHlsZXMudHMiLCJldmVudHMudHMiLCJzY3JvbGwudHMiLCJlZmZlY3RzLnRzIiwiY2xhc3MudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoLjgqrjg5bjgrjjgqfjgq/jg4jnrYnjga7lrZjlnKjjgpLkv53oqLzjgZnjgotcbiAqL1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgICAgICAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBDdXN0b21FdmVudCAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuQ3VzdG9tRXZlbnQpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gc2FmZShnbG9iYWxUaGlzLnJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBOdWxsaXNoLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NOYW1lLFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QmFzZSA9IE5vZGUgfCBXaW5kb3c7XG5leHBvcnQgdHlwZSBFbGVtZW50UmVzdWx0PFQ+ID0gVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IEhUTUxFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE51bGxpc2g7XG5leHBvcnQgdHlwZSBFbGVtZW50aWZ5U2VlZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gVCB8IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUW10gOiBuZXZlcikgfCBOb2RlTGlzdE9mPFQgZXh0ZW5kcyBOb2RlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIFF1ZXJ5Q29udGV4dCA9IFBhcmVudE5vZGUgJiBQYXJ0aWFsPE5vbkVsZW1lbnRQYXJlbnROb2RlPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93Q29udGV4dCh4OiB1bmtub3duKTogeCBpcyBXaW5kb3cge1xuICAgIHJldHVybiAoeCBhcyBXaW5kb3cpPy5wYXJlbnQgaW5zdGFuY2VvZiBXaW5kb3c7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBFbGVtZW50UmVzdWx0PFQ+W10ge1xuICAgIGlmICghc2VlZCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29udGV4dCA9IGNvbnRleHQgPz8gZG9jdW1lbnQ7XG4gICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2Ygc2VlZCkge1xuICAgICAgICAgICAgY29uc3QgaHRtbCA9IHNlZWQudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGh0bWwuc3RhcnRzV2l0aCgnPCcpICYmIGh0bWwuZW5kc1dpdGgoJz4nKSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcmt1cFxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gaHRtbDtcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0LmdldEVsZW1lbnRCeUlkKSAmJiAoJyMnID09PSBzZWxlY3RvclswXSkgJiYgIS9bIC48Pjp+XS8uZXhlYyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcHVyZSBJRCBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbCA9IGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3Iuc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgZWwgJiYgZWxlbWVudHMucHVzaChlbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgnYm9keScgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJvZHlcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlciBzZWxlY3RvcnNcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5jb250ZXh0LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoKHNlZWQgYXMgTm9kZSkubm9kZVR5cGUgfHwgaXNXaW5kb3dDb250ZXh0KHNlZWQpKSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmICgoc2VlZCBhcyBhbnkpWzBdLm5vZGVUeXBlIHx8IGlzV2luZG93Q29udGV4dCgoc2VlZCBhcyBhbnkpWzBdKSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gcm9vdGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdIHtcbiAgICBjb25zdCBwYXJzZSA9IChlbDogRWxlbWVudCwgcG9vbDogUGFyZW50Tm9kZVtdKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IHJvb3QgPSAoZWwgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSA/IGVsLmNvbnRlbnQgOiBlbDtcbiAgICAgICAgcG9vbC5wdXNoKHJvb3QpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZXMgPSByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGZvciAoY29uc3QgdCBvZiB0ZW1wbGF0ZXMpIHtcbiAgICAgICAgICAgIHBhcnNlKHQsIHBvb2wpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJvb3RzOiBQYXJlbnROb2RlW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZWxlbWVudGlmeShzZWVkLCBjb250ZXh0KSkge1xuICAgICAgICBwYXJzZShlbCBhcyBFbGVtZW50LCByb290cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3RzIGFzIEVsZW1lbnRSZXN1bHQ8VD5bXTtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogQGVuIEZvciBlYXNpbmcgYHN3aW5nYCB0aW1pbmctZnVuY3Rpb24uXG4gKiBAamEgZWFzaW5nIGBzd2luZ2Ag55So44K/44Kk44Of44Oz44Kw6Zai5pWwXG4gKlxuICogQHJlZmVyZW5jZVxuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvOTI0NTAzMC9sb29raW5nLWZvci1hLXN3aW5nLWxpa2UtZWFzaW5nLWV4cHJlc3NpYmxlLWJvdGgtd2l0aC1qcXVlcnktYW5kLWNzczNcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzUyMDczMDEvanF1ZXJ5LWVhc2luZy1mdW5jdGlvbnMtd2l0aG91dC11c2luZy1hLXBsdWdpblxuICpcbiAqIEBwYXJhbSBwcm9ncmVzcyBbMCAtIDFdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzd2luZyhwcm9ncmVzczogbnVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gMC41IC0gKE1hdGguY29zKHByb2dyZXNzICogTWF0aC5QSSkgLyAyKTtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIERPTVN0YXRpYy51dGlscy5ldmFsdWF0ZSB8IGV2YWx1YXRlfSgpIG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIERPTVN0YXRpYy51dGlscy5ldmFsdWF0ZSB8IGV2YWx1YXRlfSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2YWxPcHRpb25zIHtcbiAgICB0eXBlPzogc3RyaW5nO1xuICAgIHNyYz86IHN0cmluZztcbiAgICBub25jZT86IHN0cmluZztcbiAgICBub01vZHVsZT86IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3NjcmlwdHNBdHRyczogKGtleW9mIEV2YWxPcHRpb25zKVtdID0gW1xuICAgICd0eXBlJyxcbiAgICAnc3JjJyxcbiAgICAnbm9uY2UnLFxuICAgICdub01vZHVsZScsXG5dO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGUoY29kZTogc3RyaW5nLCBvcHRpb25zPzogRWxlbWVudCB8IEV2YWxPcHRpb25zLCBjb250ZXh0PzogRG9jdW1lbnQgfCBudWxsKTogYW55IHtcbiAgICBjb25zdCBkb2M6IERvY3VtZW50ID0gY29udGV4dCA/PyBkb2N1bWVudDtcbiAgICBjb25zdCBzY3JpcHQgPSBkb2MuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnRleHQgPSBgQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UgPSAoKCkgPT4geyByZXR1cm4gJHtjb2RlfTsgfSkoKTtgO1xuXG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIF9zY3JpcHRzQXR0cnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IChvcHRpb25zIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pW2F0dHJdIHx8IChvcHRpb25zIGFzIEVsZW1lbnQpPy5nZXRBdHRyaWJ1dGU/LihhdHRyKTtcbiAgICAgICAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgICAgICAgICBzY3JpcHQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBleGVjdXRlXG4gICAgdHJ5IHtcbiAgICAgICAgZ2V0R2xvYmFsTmFtZXNwYWNlKCdDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRScpO1xuICAgICAgICBkb2MuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpLnBhcmVudE5vZGUhLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICAgIGNvbnN0IHJldHZhbCA9IChnbG9iYWxUaGlzIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgKGdsb2JhbFRoaXMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSddO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IGRvY3VtZW50LCBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcblxuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0RXZlbnRNYXAge1xuICAgICdjb25uZWN0ZWQnOiBFdmVudDtcbiAgICAnZGlzY29ubmVjdGVkJzogRXZlbnQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBPYnNlcnZlckNvbnRleHQge1xuICAgIHRhcmdldHM6IFNldDxOb2RlPjtcbiAgICBvYnNlcnZlcjogTXV0YXRpb25PYnNlcnZlcjtcbn1cblxuY29uc3QgX29ic2VydmVyTWFwID0gbmV3IE1hcDxOb2RlLCBPYnNlcnZlckNvbnRleHQ+KCk7XG5cbmNvbnN0IHF1ZXJ5T2JzZXJ2ZWROb2RlID0gKG5vZGU6IE5vZGUpOiBOb2RlIHwgdW5kZWZpbmVkID0+IHtcbiAgICBmb3IgKGNvbnN0IFtvYnNlcnZlZE5vZGUsIGNvbnRleHRdIG9mIF9vYnNlcnZlck1hcCkge1xuICAgICAgICBpZiAoY29udGV4dC50YXJnZXRzLmhhcyhub2RlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmVkTm9kZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuY29uc3QgZGlzcGF0Y2hUYXJnZXQgPSAobm9kZTogTm9kZSwgZXZlbnQ6IEV2ZW50LCBub2RlSW46IFdlYWtTZXQ8Tm9kZT4sIG5vZGVPdXQ6IFdlYWtTZXQ8Tm9kZT4pOiB2b2lkID0+IHtcbiAgICBpZiAocXVlcnlPYnNlcnZlZE5vZGUobm9kZSkgJiYgIW5vZGVJbi5oYXMobm9kZSkpIHtcbiAgICAgICAgbm9kZU91dC5kZWxldGUobm9kZSk7XG4gICAgICAgIG5vZGVJbi5hZGQobm9kZSk7XG4gICAgICAgIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZE5vZGVzKSB7XG4gICAgICAgIGRpc3BhdGNoVGFyZ2V0KGNoaWxkLCBldmVudCwgbm9kZUluLCBub2RlT3V0KTtcbiAgICB9XG59O1xuXG5jb25zdCAgZGlzcGF0Y2hBbGwgPSAobm9kZXM6IE5vZGVMaXN0LCB0eXBlOiBzdHJpbmcsIG5vZGVJbjogV2Vha1NldDxOb2RlPiwgbm9kZU91dDogV2Vha1NldDxOb2RlPik6IHZvaWQgPT4ge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICBOb2RlLkVMRU1FTlRfTk9ERSA9PT0gbm9kZS5ub2RlVHlwZSAmJiBkaXNwYXRjaFRhcmdldChcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICBuZXcgQ3VzdG9tRXZlbnQodHlwZSwgeyBidWJibGVzOiB0cnVlLCBjYW5jZWxhYmxlOiB0cnVlIH0pLFxuICAgICAgICAgICAgbm9kZUluLFxuICAgICAgICAgICAgbm9kZU91dCxcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG5jb25zdCBzdGFydCA9IChvYnNlcnZlZE5vZGU6IE5vZGUpOiBPYnNlcnZlckNvbnRleHQgPT4ge1xuICAgIGNvbnN0IGNvbm5lY3RlZCA9IG5ldyBXZWFrU2V0PE5vZGU+KCk7XG4gICAgY29uc3QgZGlzY29ubmVjdGVkID0gbmV3IFdlYWtTZXQ8Tm9kZT4oKTtcblxuICAgIGNvbnN0IGNoYW5nZXMgPSAocmVjb3JkczogTXV0YXRpb25SZWNvcmRbXSk6IHZvaWQgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IHJlY29yZCBvZiByZWNvcmRzKSB7XG4gICAgICAgICAgICBkaXNwYXRjaEFsbChyZWNvcmQucmVtb3ZlZE5vZGVzLCAnZGlzY29ubmVjdGVkJywgZGlzY29ubmVjdGVkLCBjb25uZWN0ZWQpO1xuICAgICAgICAgICAgZGlzcGF0Y2hBbGwocmVjb3JkLmFkZGVkTm9kZXMsICdjb25uZWN0ZWQnLCBjb25uZWN0ZWQsIGRpc2Nvbm5lY3RlZCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgY29udGV4dDogT2JzZXJ2ZXJDb250ZXh0ID0ge1xuICAgICAgICB0YXJnZXRzOiBuZXcgU2V0KCksXG4gICAgICAgIG9ic2VydmVyOiBuZXcgTXV0YXRpb25PYnNlcnZlcihjaGFuZ2VzKSxcbiAgICB9O1xuICAgIF9vYnNlcnZlck1hcC5zZXQob2JzZXJ2ZWROb2RlLCBjb250ZXh0KTtcbiAgICBjb250ZXh0Lm9ic2VydmVyLm9ic2VydmUob2JzZXJ2ZWROb2RlLCB7IGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KTtcblxuICAgIHJldHVybiBjb250ZXh0O1xufTtcblxuY29uc3Qgc3RvcEFsbCA9ICgpOiB2b2lkID0+IHtcbiAgICBmb3IgKGNvbnN0IFssIGNvbnRleHRdIG9mIF9vYnNlcnZlck1hcCkge1xuICAgICAgICBjb250ZXh0LnRhcmdldHMuY2xlYXIoKTtcbiAgICAgICAgY29udGV4dC5vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfVxuICAgIF9vYnNlcnZlck1hcC5jbGVhcigpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGRldGVjdGlmeSA9IDxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCwgb2JzZXJ2ZWQ/OiBOb2RlKTogVCA9PiB7XG4gICAgY29uc3Qgb2JzZXJ2ZWROb2RlID0gb2JzZXJ2ZWQgPz8gKG5vZGUub3duZXJEb2N1bWVudD8uYm9keSAmJiBub2RlLm93bmVyRG9jdW1lbnQpID8/IGRvY3VtZW50O1xuICAgIGNvbnN0IGNvbnRleHQgPSBfb2JzZXJ2ZXJNYXAuZ2V0KG9ic2VydmVkTm9kZSkgPz8gc3RhcnQob2JzZXJ2ZWROb2RlKTtcbiAgICBjb250ZXh0LnRhcmdldHMuYWRkKG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVuZGV0ZWN0aWZ5ID0gPFQgZXh0ZW5kcyBOb2RlPihub2RlPzogVCk6IHZvaWQgPT4ge1xuICAgIGlmIChudWxsID09IG5vZGUpIHtcbiAgICAgICAgc3RvcEFsbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9ic2VydmVkTm9kZSA9IHF1ZXJ5T2JzZXJ2ZWROb2RlKG5vZGUpO1xuICAgICAgICBpZiAob2JzZXJ2ZWROb2RlKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX29ic2VydmVyTWFwLmdldChvYnNlcnZlZE5vZGUpITtcbiAgICAgICAgICAgIGNvbnRleHQudGFyZ2V0cy5kZWxldGUobm9kZSk7XG4gICAgICAgICAgICBpZiAoIWNvbnRleHQudGFyZ2V0cy5zaXplKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5vYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgX29ic2VydmVyTWFwLmRlbGV0ZShvYnNlcnZlZE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsImltcG9ydCB0eXBlIHsgV3JpdGFibGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBFbGVtZW50aWZ5U2VlZCxcbiAgICBFbGVtZW50UmVzdWx0LFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgaXNXaW5kb3dDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG4gICAgcm9vdGlmeSxcbiAgICBldmFsdWF0ZSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBkZXRlY3RpZnksIHVuZGV0ZWN0aWZ5IH0gZnJvbSAnLi9kZXRlY3Rpb24nO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTUNsYXNzLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG59IGZyb20gJy4vY2xhc3MnO1xuXG4vKipcbiAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IGVxdWl2YWxlbnQgdG8gYGpRdWVyeWAgRE9NIG1hbmlwdWxhdGlvbi5cbiAqIEBqYSBgalF1ZXJ5YCDjga4gRE9NIOaTjeS9nOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+m1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZG9tIGFzICQgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIC8vIEdldCB0aGUgPGJ1dHRvbj4gZWxlbWVudCB3aXRoIHRoZSBjbGFzcyAnY29udGludWUnIGFuZCBjaGFuZ2UgaXRzIEhUTUwgdG8gJ05leHQgU3RlcC4uLidcbiAqICQoJ2J1dHRvbi5jb250aW51ZScpLmh0bWwoJ05leHQgU3RlcC4uLicpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NU3RhdGljIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBlcXVpdmFsZW50IHRvIGBqUXVlcnlgIERPTSBtYW5pcHVsYXRpb24uIDxicj5cbiAgICAgKiAgICAgQ3JlYXRlIHtAbGluayBET019IGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gICAgICogQGphIGBqUXVlcnlgIOOBriBET00g5pON5L2c44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bIDxicj5cbiAgICAgKiAgICAg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKlxuICAgICAqIC8vIEdldCB0aGUgPGJ1dHRvbj4gZWxlbWVudCB3aXRoIHRoZSBjbGFzcyAnY29udGludWUnIGFuZCBjaGFuZ2UgaXRzIEhUTUwgdG8gJ05leHQgU3RlcC4uLidcbiAgICAgKiAkKCdidXR0b24uY29udGludWUnKS5odG1sKCdOZXh0IFN0ZXAuLi4nKTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICogQHJldHVybnMge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICovXG4gICAgPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBvYmplY3QncyBgcHJvdG90eXBlYCBhbGlhcy5cbiAgICAgKiBAamEg44Kq44OW44K444Kn44Kv44OI44GuIGBwcm90b3R5cGVg44Ko44Kk44Oq44Ki44K5XG4gICAgICovXG4gICAgZm46IERPTUNsYXNzICYgUmVjb3JkPHN0cmluZyB8IHN5bWJvbCwgdW5rbm93bj47XG5cbiAgICAvKiogRE9NIFV0aWxpdGllcyAqL1xuICAgIHJlYWRvbmx5IHV0aWxzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgV2luZG93LlxuICAgICAgICAgKiBAamEgV2luZG93IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0geFxuICAgICAgICAgKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICAgICAgICAgKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICAgICAgICAgKi9cbiAgICAgICAgaXNXaW5kb3dDb250ZXh0KHg6IHVua25vd24pOiB4IGlzIFdpbmRvdztcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIENyZWF0ZSBFbGVtZW50IGFycmF5IGZyb20gc2VlZCBhcmcuXG4gICAgICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gU2VlZCDjgYvjgokgRWxlbWVudCDphY3liJfjgpLkvZzmiJBcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHNlZWRcbiAgICAgICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBFbGVtZW50IGFycmF5LlxuICAgICAgICAgKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAgICAgKiBAcmV0dXJucyBFbGVtZW50W10gYmFzZWQgTm9kZSBvciBXaW5kb3cgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgZWxlbWVudGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gQ3JlYXRlIEVsZW1lbnQgYXJyYXkgZnJvbSBzZWVkIGFyZy4gPGJyPlxuICAgICAgICAgKiAgICAgQW5kIGFsc28gbGlzdHMgZm9yIHRoZSBgRG9jdW1lbnRGcmFnbWVudGAgaW5zaWRlIHRoZSBgPHRlbXBsYXRlPmAgdGFnLlxuICAgICAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIFNlZWQg44GL44KJIEVsZW1lbnQg6YWN5YiX44KS5L2c5oiQIDxicj5cbiAgICAgICAgICogICAgIGA8dGVtcGxhdGU+YCDjgr/jgrDlhoXjga4gYERvY3VtZW50RnJhZ21lbnRgIOOCguWIl+aMmeOBmeOCi1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gICAgICAgICAqICAtIGBqYWAgRWxlbWVudCDphY3liJfjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICAgICAqIEByZXR1cm5zIEVsZW1lbnRbXSBiYXNlZCBOb2RlLlxuICAgICAgICAgKi9cbiAgICAgICAgcm9vdGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZW4gVGhlIGBldmFsYCBmdW5jdGlvbiBieSB3aGljaCBzY3JpcHQgYG5vbmNlYCBhdHRyaWJ1dGUgY29uc2lkZXJlZCB1bmRlciB0aGUgQ1NQIGNvbmRpdGlvbi5cbiAgICAgICAgICogQGphIENTUCDnkrDlooPjgavjgYrjgYTjgabjgrnjgq/jg6rjg5fjg4ggYG5vbmNlYCDlsZ7mgKfjgpLogIPmha7jgZfjgZ8gYGV2YWxgIOWun+ihjOmWouaVsFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGUoY29kZTogc3RyaW5nLCBvcHRpb25zPzogRWxlbWVudCB8IEV2YWxPcHRpb25zLCBjb250ZXh0PzogRG9jdW1lbnQgfCBudWxsKTogYW55OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIEVuYWJsaW5nIHRoZSBub2RlIHRvIGRldGVjdCBldmVudHMgb2YgRE9NIGNvbm5lY3RlZCBhbmQgZGlzY29ubmVjdGVkLlxuICAgICAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCBET00g44G444Gu5o6l57aaLCBET00g44GL44KJ44Gu5YiH5pat44Kk44OZ44Oz44OI44KS5qSc5Ye65Y+v6IO944Gr44GZ44KLXG4gICAgICAgICAqXG4gICAgICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgICAgICpcbiAgICAgICAgICogYGBgdHNcbiAgICAgICAgICogaW1wb3J0IHsgZG9tIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgICAgICogY29uc3QgeyBkZXRlY3RpZnksIHVuZGV0ZWN0aWZ5IH0gPSBkb20udXRpbHM7XG4gICAgICAgICAqXG4gICAgICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAqXG4gICAgICAgICAqIC8vIG9ic2VydmF0aW9uIHN0YXJ0XG4gICAgICAgICAqIGRldGVjdGlmeShlbCk7XG4gICAgICAgICAqIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2Nvbm5lY3RlZCcsICgpID0+IHtcbiAgICAgICAgICogICAgIGNvbnNvbGUubG9nKCdvbiBjb25uZWN0ZWQnKTtcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2Rpc2Nvbm5lY3RlZCcsICgpID0+IHtcbiAgICAgICAgICogICAgIGNvbnNvbGUubG9nKCdvbiBkaXNjb25uZWN0ZWQnKTtcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqXG4gICAgICAgICAqIC8vIG9ic2VydmF0aW9uIHN0b3BcbiAgICAgICAgICogdW5kZXRlY3RpZnkoZWwpO1xuICAgICAgICAgKiBgYGBcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5vZGVcbiAgICAgICAgICogIC0gYGVuYCB0YXJnZXQgbm9kZVxuICAgICAgICAgKiAgLSBgamFgIOWvvuixoeOBruimgee0oFxuICAgICAgICAgKiBAcGFyYW0gb2JzZXJ2ZWRcbiAgICAgICAgICogIC0gYGVuYCBTcGVjaWZpZXMgdGhlIHJvb3QgZWxlbWVudCB0byB3YXRjaC4gSWYgbm90IHNwZWNpZmllZCwgYG93bmVyRG9jdW1lbnRgIGlzIGV2YWx1YXRlZCBmaXJzdCwgZm9sbG93ZWQgYnkgZ2xvYmFsIGBkb2N1bWVudGAuXG4gICAgICAgICAqICAtIGBqYWAg55uj6KaW5a++6LGh44Gu44Or44O844OI6KaB57Sg44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga8gYG93bmVyRG9jdW1lbnRgLCDjgrDjg63jg7zjg5Djg6sgYGRvY3VtZW50YCDjga7poIbjgavoqZXkvqHjgZXjgozjgotcbiAgICAgICAgICovXG4gICAgICAgIGRldGVjdGlmeTxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCwgb2JzZXJ2ZWQ/OiBOb2RlKTogVDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGVuIFVuZGV0ZWN0IGNvbm5lY3RlZCBhbmQgZGlzY29ubmVjdGVkIGZyb20gRE9NIGV2ZW50cyBmb3IgYW4gZWxlbWVudC5cbiAgICAgICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgRE9NIOOBuOOBruaOpee2miwgRE9NIOOBi+OCieOBruWIh+aWreOCpOODmeODs+ODiOOCkuaknOWHuuOCkuino+mZpOOBmeOCi1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAgICAgKiAgLSBgZW5gIHRhcmdldCBub2RlLiBJZiBub3Qgc3BlY2lmaWVkLCBleGVjdXRlIGFsbCByZWxlYXNlLlxuICAgICAgICAgKiAgLSBgamFgIOWvvuixoeOBruimgee0oC4g5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv5YWo6Kej6Zmk44KS5a6f6KGMXG4gICAgICAgICAqL1xuICAgICAgICB1bmRldGVjdGlmeTxUIGV4dGVuZHMgTm9kZT4obm9kZT86IFQpOiB2b2lkO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIERPTUZhY3RvcnkgPSA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpID0+IERPTVJlc3VsdDxUPjtcblxubGV0IF9mYWN0b3J5ITogRE9NRmFjdG9yeTtcblxuY29uc3QgZG9tID0gKDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiA9PiB7XG4gICAgcmV0dXJuIF9mYWN0b3J5KHNlbGVjdG9yLCBjb250ZXh0KTtcbn0pIGFzIERPTVN0YXRpYztcblxuKGRvbSBhcyBXcml0YWJsZTxET01TdGF0aWM+KS51dGlscyA9IHtcbiAgICBpc1dpbmRvd0NvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbiAgICByb290aWZ5LFxuICAgIGV2YWx1YXRlLFxuICAgIGRldGVjdGlmeSxcbiAgICB1bmRldGVjdGlmeSxcbn07XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzLCBmYWN0b3J5OiBET01GYWN0b3J5KTogdm9pZCB7XG4gICAgX2ZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIChkb20uZm4gYXMgRE9NQ2xhc3MpID0gZm47XG59XG5cbmV4cG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tLFxufTtcbiIsImltcG9ydCB0eXBlIHsgTnVsbGlzaCwgV3JpdGFibGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgaXNXaW5kb3dDb250ZXh0IH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY3JlYXRlSXRlcmFibGVJdGVyYXRvciA9IFN5bWJvbCgnY3JlYXRlLWl0ZXJhYmxlLWl0ZXJhdG9yJyk7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3Rpb24gY2xhc3Mgb2Yge0BsaW5rIERPTUNsYXNzfS4gVGhpcyBjbGFzcyBwcm92aWRlcyBpdGVyYXRvciBtZXRob2RzLlxuICogQGphIHtAbGluayBET01DbGFzc30g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50czogVFtdKSB7XG4gICAgICAgIGNvbnN0IHNlbGY6IFdyaXRhYmxlPERPTUFjY2VzczxUPj4gPSB0aGlzO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxlbV0gb2YgZWxlbWVudHMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBzZWxmW2luZGV4XSA9IGVsZW07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sZW5ndGggPSBlbGVtZW50cy5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRhcmdldCBpcyBgTm9kZWAgYW5kIGNvbm5lY3RlZCB0b2AgRG9jdW1lbnRgIG9yIGBTaGFkb3dSb290YC5cbiAgICAgKiBAamEg5a++6LGh44GMIGBOb2RlYCDjgafjgYLjgorjgYvjgaQgYERvY3VtZW50YCDjgb7jgZ/jga8gYFNoYWRvd1Jvb3RgIOOBq+aOpee2muOBleOCjOOBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGVsXG4gICAgICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgRWxlbWVudEJhc2V9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGdldCBpc0Nvbm5lY3RlZCgpOiBib29sZWFuIHtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIHtAbGluayBFbGVtZW50QmFzZX0gdmFsdWVzIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg5qC857SN44GX44Gm44GE44KLIHtAbGluayBFbGVtZW50QmFzZX0g44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VD4ge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxUPiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRlciA8IHRoaXMuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYmFzZVt0aGlzLnBvaW50ZXIrK10sXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5KGluZGV4KSwgdmFsdWUoe0BsaW5rIEVsZW1lbnRCYXNlfSkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSwgdmFsdWUoe0BsaW5rIEVsZW1lbnRCYXNlfSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaW5kZXgpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKHtAbGluayBFbGVtZW50QmFzZX0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKHtAbGluayBFbGVtZW50QmFzZX0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IG51bWJlciwgdmFsdWU6IFQpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihjdXJyZW50LCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gaXRlcmF0b3I7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBCYXNlIGludGVyZmFjZSBmb3IgRE9NIE1peGluIGNsYXNzLlxuICogQGphIERPTSBNaXhpbiDjgq/jg6njgrnjga7ml6LlrprjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01JdGVyYWJsZTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTUJhc2U8VD4+IHtcbiAgICBsZW5ndGg6IG51bWJlcjtcbiAgICBbbjogbnVtYmVyXTogVDtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VD47XG59XG5cbi8qKlxuICogQGludGVybmFsIERPTSBhY2Nlc3NcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICAgY29uc3QgZG9tOiBET01BY2Nlc3M8VEVsZW1lbnQ+ID0gdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD47XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01BY2Nlc3M8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+IGV4dGVuZHMgUGFydGlhbDxET008VD4+IHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYC5cbiAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGUoZWw6IHVua25vd24pOiBlbCBpcyBOb2RlIHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUpLm5vZGVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEVsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE51bGxpc2gpOiBlbCBpcyBFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlKGVsKSAmJiAoTm9kZS5FTEVNRU5UX05PREUgPT09IGVsLm5vZGVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBIVE1MRWxlbWVudGAgb3IgYFNWR0VsZW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgSFRNTEVsZW1lbnRgIOOBvuOBn+OBryBgU1ZHRWxlbWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHtAbGluayBFbGVtZW50QmFzZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIEVsZW1lbnRCYXNlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldCk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRWxlbWVudGAgb3IgYERvY3VtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEVsZW1lbnRgIOOBvuOBn+OBryBgRG9jdW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB7QGxpbmsgRWxlbWVudEJhc2V9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBFbGVtZW50QmFzZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVRdWVyaWFibGUoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIEVsZW1lbnQgfCBEb2N1bWVudCB7XG4gICAgcmV0dXJuICEhKGVsICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLnF1ZXJ5U2VsZWN0b3IpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYERvY3VtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAge0BsaW5rIEVsZW1lbnRCYXNlfSBpbnN0YW5jZVxuICogIC0gYGphYCB7QGxpbmsgRWxlbWVudEJhc2V9IOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlRG9jdW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTnVsbGlzaCk6IGVsIGlzIERvY3VtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlKGVsKSAmJiAoTm9kZS5ET0NVTUVOVF9OT0RFID09PSBlbC5ub2RlVHlwZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIHtAbGluayBET019IOOBjCBgRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCB7QGxpbmsgRE9NSXRlcmFibGV9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBET01JdGVyYWJsZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB7QGxpbmsgRE9NfSB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBIVE1MRWxlbWVudGAg44G+44Gf44GvIGBTVkdFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50PiB7XG4gICAgcmV0dXJuIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZG9tWzBdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sge0BsaW5rIERPTX0gdGFyZ2V0IGlzIGBEb2N1bWVudGAuXG4gKiBAamEge0BsaW5rIERPTX0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCB7QGxpbmsgRE9NSXRlcmFibGV9IGluc3RhbmNlXG4gKiAgLSBgamFgIHtAbGluayBET01JdGVyYWJsZX0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVEb2N1bWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxEb2N1bWVudD4ge1xuICAgIHJldHVybiBkb21bMF0gaW5zdGFuY2VvZiBEb2N1bWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sge0BsaW5rIERPTX0gdGFyZ2V0IGlzIGBXaW5kb3dgLlxuICogQGphIHtAbGluayBET019IOOBjCBgV2luZG93YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIHtAbGluayBET01JdGVyYWJsZX0gaW5zdGFuY2VcbiAqICAtIGBqYWAge0BsaW5rIERPTUl0ZXJhYmxlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZVdpbmRvdyhkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxXaW5kb3c+IHtcbiAgICByZXR1cm4gaXNXaW5kb3dDb250ZXh0KGRvbVswXSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOdWxsaXNoLlxuICogQGphIE51bGxpc2gg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOdWxsaXNoPiB7XG4gICAgcmV0dXJuICFzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmdTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBzdHJpbmc+IHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiBzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTm9kZS5cbiAqIEBqYSBOb2RlIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlPiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIE5vZGUpLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBFbGVtZW50LlxuICogQGphIEVsZW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRWxlbWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBFbGVtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBEb2N1bWVudC5cbiAqIEBqYSBEb2N1bWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEb2N1bWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERvY3VtZW50PiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFdpbmRvdy5cbiAqIEBqYSBXaW5kb3cg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgV2luZG93PiB7XG4gICAgcmV0dXJuIGlzV2luZG93Q29udGV4dChzZWxlY3Rvcik7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciBpcyBhYmxlIHRvIGl0ZXJhdGUuXG4gKiBAamEg6LWw5p+75Y+v6IO944Gq44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlTGlzdE9mPE5vZGU+PiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIFRbXSkubGVuZ3RoO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyB7QGxpbmsgRE9NfS5cbiAqIEBqYSB7QGxpbmsgRE9NfSDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBET00+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgbm9kZSBuYW1lIGlzIGFyZ3VtZW50LlxuICogQGphIE5vZGUg5ZCN44GM5byV5pWw44Gn5LiO44GI44Gf5ZCN5YmN44Go5LiA6Ie044GZ44KL44GL5Yik5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub2RlTmFtZShlbGVtOiBOb2RlIHwgbnVsbCwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGVsZW0gJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgbm9kZSBvZmZzZXQgcGFyZW50LiBUaGlzIGZ1bmN0aW9uIHdpbGwgd29yayBTVkdFbGVtZW50LCB0b28uXG4gKiBAamEgb2Zmc2V0IHBhcmVudCDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRQYXJlbnQobm9kZTogTm9kZSk6IEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAoKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudCkge1xuICAgICAgICByZXR1cm4gKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudDtcbiAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKG5vZGUsICdzdmcnKSkge1xuICAgICAgICBjb25zdCAkc3ZnID0gJChub2RlKTtcbiAgICAgICAgY29uc3QgY3NzUHJvcHMgPSAkc3ZnLmNzcyhbJ2Rpc3BsYXknLCAncG9zaXRpb24nXSk7XG4gICAgICAgIGlmICgnbm9uZScgPT09IGNzc1Byb3BzLmRpc3BsYXkgfHwgJ2ZpeGVkJyA9PT0gY3NzUHJvcHMucG9zaXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHBhcmVudCA9ICRzdmdbMF0ucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRpc3BsYXksIHBvc2l0aW9uIH0gPSAkKHBhcmVudCkuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgICAgICAgICBpZiAoJ25vbmUnID09PSBkaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXBvc2l0aW9uIHx8ICdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBOb25GdW5jdGlvblByb3BlcnR5TmFtZXMsXG4gICAgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBjYW1lbGl6ZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01WYWx1ZVR5cGU8VCwgSyA9ICd2YWx1ZSc+ID0gVCBleHRlbmRzIEhUTUxTZWxlY3RFbGVtZW50ID8gKHN0cmluZyB8IHN0cmluZ1tdKSA6IEsgZXh0ZW5kcyBrZXlvZiBUID8gVFtLXSA6IHN0cmluZztcbmV4cG9ydCB0eXBlIERPTURhdGEgPSBQbGFpbk9iamVjdDxUeXBlZERhdGE+O1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc011bHRpU2VsZWN0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MU2VsZWN0RWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmICdzZWxlY3QnID09PSBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICYmIChlbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkubXVsdGlwbGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgdmFsKClgKi9cbmZ1bmN0aW9uIGlzSW5wdXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSk6IGVsIGlzIEhUTUxJbnB1dEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAobnVsbCAhPSAoZWwgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGF0dHJpYnV0ZXMgbWV0aG9kcy5cbiAqIEBqYSDlsZ7mgKfmk43kvZzjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUF0dHJpYnV0ZXM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ2xhc3Nlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBjc3MgY2xhc3MgdG8gZWxlbWVudHMuXG4gICAgICogQGphIGNzcyBjbGFzcyDopoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgYW55IG9mIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGFyZSBhc3NpZ25lZCB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCr+ODqeOCueWQjeOCkuWwkeOBquOBj+OBqOOCguimgee0oOOBjOaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZVxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCNXG4gICAgICovXG4gICAgcHVibGljIGhhc0NsYXNzKGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpICYmIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgb3IgcmVtb3ZlIG9uZSBvciBtb3JlIGNsYXNzZXMgZnJvbSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIGRlcGVuZGluZyBvbiBlaXRoZXIgdGhlIGNsYXNzJ3MgcHJlc2VuY2Ugb3IgdGhlIHZhbHVlIG9mIHRoZSBzdGF0ZSBhcmd1bWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu54q25oWL44Gr5b+c44GY44GmLCDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLopoHntKDjgavov73liqAv5YmK6Zmk44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGZvcmNlXG4gICAgICogIC0gYGVuYCBpZiB0aGlzIGFyZ3VtZW50IGV4aXN0cywgdHJ1ZTogdGhlIGNsYXNzZXMgc2hvdWxkIGJlIGFkZGVkIC8gZmFsc2U6IHJlbW92ZWQuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgYzlrZjlnKjjgZnjgovloLTlkIgsIHRydWU6IOOCr+ODqeOCueOCkui/veWKoCAvIGZhbHNlOiDjgq/jg6njgrnjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9nZ2xlQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZm9yY2U/OiBib29sZWFuKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGNvbnN0IG9wZXJhdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBmb3JjZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY2xhc3Nlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QudG9nZ2xlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpID0+IGVsZW0uY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBQcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHByb3BlcnR5IHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQpOiBURWxlbWVudFtUXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIHByb3BlcnR5IHZhbHVlIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuWNmOS4gOODl+ODreODkeODhuOCo+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSB2YWx1ZVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL44OX44Ot44OR44OG44Kj5YCkXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQsIHZhbHVlOiBURWxlbWVudFtUXSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIHByb3BlcnR5IHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgcHJvcGVydHktdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3AocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KGtleTogVCB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IFRFbGVtZW50W1RdKTogVEVsZW1lbnRbVF0gfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgcHJvcGVydHlcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpc1swXSBhcyBURWxlbWVudCAmIFJlY29yZDxzdHJpbmcsIFRFbGVtZW50W1RdPjtcbiAgICAgICAgICAgIHJldHVybiBmaXJzdCAmJiBmaXJzdFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoZWwgYXMgdW5rbm93biBhcyBVbmtub3duT2JqZWN0LCBrZXkgYXMgc3RyaW5nLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoZWwgYXMgdW5rbm93biBhcyBVbmtub3duT2JqZWN0LCBuYW1lLCAoa2V5IGFzIFJlY29yZDxzdHJpbmcsIFRFbGVtZW50W1RdPilbbmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYXR0cmlidXRlIHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgYXR0cmlidXRlIHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg5bGe5oCn5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgdmFsdWUuIGlmIGBudWxsYCBzZXQsIHJlbW92ZSBhdHRyaWJ1dGUuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlsZ7mgKflgKQuIGBudWxsYCDjgYzmjIflrprjgZXjgozjgZ/loLTlkIjliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIGF0dHJpYnV0ZS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBhdHRyaWJ1dGUtdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIGF0dHIoa2V5OiBzdHJpbmcgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGF0dHIgPz8gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYXR0cmlidXRlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVBdHRyKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IGF0dHJpYnV0ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXkgYXMgc3RyaW5nLCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IChrZXkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCBTdHJpbmcodmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBhdHRyaWJ1dGUuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+WxnuaAp+OCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIGF0dHJpYnV0ZSBuYW1lIG9yIGF0dHJpYnV0ZSBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOBvuOBn+OBr+WxnuaAp+WQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVBdHRyKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXR0cnMgPSBpc0FycmF5KG5hbWUpID8gbmFtZSA6IFtuYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFZhbHVlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIHZhbHVlIOWApOOBruWPluW+ly4g5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50PigpOiBET01WYWx1ZVR5cGU8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSB2YWx1ZSBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpiB2YWx1ZSDlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZTogRE9NVmFsdWVUeXBlPFQ+KTogdGhpcztcblxuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlPzogRE9NVmFsdWVUeXBlPFQ+KTogYW55IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHZhbHVlXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICBpZiAoaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwuc2VsZWN0ZWRPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsIGFzIGFueSkudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5vIHN1cHBvcnQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5zZWxlY3RlZCA9IHZhbHVlLmluY2x1ZGVzKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW5wdXRFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IHZhbHVlIGFzIHN0cmluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRGF0YVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWVzIGFsbCBgRE9NU3RyaW5nTWFwYCBzdG9yZSBzZXQgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBIVE1MNSBkYXRhLSog5bGe5oCn44GnIGBET01TdHJpbmdNYXBgIOOBq+agvOe0jeOBleOCjOOBn+WFqOODh+ODvOOCv+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKCk6IERPTURhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZSBhdCB0aGUgbmFtZWQgZGF0YSBzdG9yZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24sIGFzIHNldCBieSBkYXRhKGtleSwgdmFsdWUpIG9yIGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBrZXkg44Gn5oyH5a6a44GX44GfIEhUTUw1IGRhdGEtKiDlsZ7mgKflgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b3JlIGFyYml0cmFyeSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Lu75oSP44Gu44OH44O844K/44KS5qC857SNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGRhdGEgdmFsdWUgKG5vdCBvbmx5IGBzdHJpbmdgKVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5oyH5a6aICjmloflrZfliJfku6XlpJbjgoLlj5fku5jlj68pXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcsIHZhbHVlOiBUeXBlZERhdGEpOiB0aGlzO1xuXG4gICAgcHVibGljIGRhdGEoa2V5Pzogc3RyaW5nLCB2YWx1ZT86IFR5cGVkRGF0YSk6IERPTURhdGEgfCBUeXBlZERhdGEgfCB1bmRlZmluZWQgfCB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gc3VwcG9ydGVkIGRhdGFzZXQgZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGRhdGFzZXRcbiAgICAgICAgICAgIGNvbnN0IGRhdGFzZXQgPSB0aGlzWzBdLmRhdGFzZXQ7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgYWxsIGRhdGFcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBET01EYXRhID0ge307XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGRhdGFzZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKGRhdGEsIHByb3AsIHRvVHlwZWREYXRhKGRhdGFzZXRbcHJvcF0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHR5cGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvVHlwZWREYXRhKGRhdGFzZXRbY2FtZWxpemUoa2V5KV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBjb25zdCBwcm9wID0gY2FtZWxpemUoa2V5ID8/ICcnKTtcbiAgICAgICAgICAgIGlmIChwcm9wKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzaWduVmFsdWUoZWwuZGF0YXNldCBhcyB1bmtub3duIGFzIFVua25vd25PYmplY3QsIHByb3AsIGZyb21UeXBlZERhdGEodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgZGF0YS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf44OH44O844K/44KS44OH44O844K/6aCY5Z+f44GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlRGF0YShrZXk6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KGtleSkgPyBrZXkubWFwKGsgPT4gY2FtZWxpemUoaykpIDogW2NhbWVsaXplKGtleSldO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGF0YXNldCB9ID0gZWw7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhc2V0W3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUF0dHJpYnV0ZXMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIG5vb3AsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IGlzV2luZG93Q29udGV4dCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUJhc2UsXG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlUXVlcmlhYmxlLFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGlzRW1wdHlTZWxlY3RvcixcbiAgICBpc1N0cmluZ1NlbGVjdG9yLFxuICAgIGlzRG9jdW1lbnRTZWxlY3RvcixcbiAgICBpc1dpbmRvd1NlbGVjdG9yLFxuICAgIGlzTm9kZVNlbGVjdG9yLFxuICAgIGlzSXRlcmFibGVTZWxlY3RvcixcbiAgICBub2RlTmFtZSxcbiAgICBnZXRPZmZzZXRQYXJlbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCB0eXBlIERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBVO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlzKClgIGFuZCBgZmlsdGVyKClgICovXG5mdW5jdGlvbiB3aW5ub3c8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VT4sXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPFU+LFxuICAgIHZhbGlkQ2FsbGJhY2s6IChlbDogVSkgPT4gdW5rbm93bixcbiAgICBpbnZhbGlkQ2FsbGJhY2s/OiAoKSA9PiB1bmtub3duLFxuKTogYW55IHtcbiAgICBpbnZhbGlkQ2FsbGJhY2sgPSBpbnZhbGlkQ2FsbGJhY2sgPz8gbm9vcDtcblxuICAgIGxldCByZXR2YWw6IHVua25vd247XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiBkb20uZW50cmllcygpKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmdTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmICgoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzPy4oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzV2luZG93U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoaXNXaW5kb3dDb250ZXh0KGVsKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzRG9jdW1lbnRTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChkb2N1bWVudCA9PT0gZWwgYXMgTm9kZSBhcyBEb2N1bWVudCkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzTm9kZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSBlbCBhcyBOb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGVTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmIChlbGVtID09PSBlbCBhcyBOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgcGFyZW50KClgLCBgcGFyZW50cygpYCBhbmQgYHNpYmxpbmdzKClgICovXG5mdW5jdGlvbiB2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZTogTm9kZSB8IG51bGwpOiBwYXJlbnROb2RlIGlzIE5vZGUge1xuICAgIHJldHVybiBudWxsICE9IHBhcmVudE5vZGUgJiYgTm9kZS5ET0NVTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlICYmIE5vZGUuRE9DVU1FTlRfRlJBR01FTlRfTk9ERSAhPT0gcGFyZW50Tm9kZS5ub2RlVHlwZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjaGlsZHJlbigpYCwgYHBhcmVudCgpYCwgYG5leHQoKWAgYW5kIGBwcmV2KClgICovXG5mdW5jdGlvbiB2YWxpZFJldHJpZXZlTm9kZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihub2RlOiBOb2RlIHwgbnVsbCwgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogbm9kZSBpcyBOb2RlIHtcbiAgICBpZiAobm9kZSkge1xuICAgICAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIGlmICgkKG5vZGUpLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG5leHRVbnRpbCgpYCBhbmQgYHByZXZVbnRpbCgpICovXG5mdW5jdGlvbiByZXRyaWV2ZVNpYmxpbmdzPFxuICAgIEUgZXh0ZW5kcyBFbGVtZW50QmFzZSxcbiAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuPihcbiAgICBzaWJsaW5nOiAncHJldmlvdXNFbGVtZW50U2libGluZycgfCAnbmV4dEVsZW1lbnRTaWJsaW5nJyxcbiAgICBkb206IERPTVRyYXZlcnNpbmc8RT4sXG4gICAgc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj5cbik6IERPTTxUPiB7XG4gICAgaWYgKCFpc1R5cGVFbGVtZW50KGRvbSkpIHtcbiAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgY29uc3Qgc2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG5cbiAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSBhcyBET01JdGVyYWJsZTxFbGVtZW50Pikge1xuICAgICAgICBsZXQgZWxlbSA9IGVsW3NpYmxpbmddO1xuICAgICAgICB3aGlsZSAoZWxlbSkge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoJChlbGVtKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKGZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgc2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbSA9IGVsZW1bc2libGluZ107XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gJChbLi4uc2libGluZ3NdKSBhcyBET008VD47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgdHJhdmVyc2luZyBtZXRob2RzLlxuICogQGphIOODiOODqeODkOODvOOCueODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NVHJhdmVyc2luZzxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFbGVtZW50IE1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSBvbmUgb2YgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgabphY3kuIvjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVEVsZW1lbnQgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgZnjgbnjgabjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KCk6IFRFbGVtZW50W107XG5cbiAgICBwdWJsaWMgZ2V0KGluZGV4PzogbnVtYmVyKTogVEVsZW1lbnRbXSB8IFRFbGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gaW5kZXgpIHtcbiAgICAgICAgICAgIGluZGV4ID0gTWF0aC50cnVuYyhpbmRleCk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggPCAwID8gdGhpc1tpbmRleCArIHRoaXMubGVuZ3RoXSA6IHRoaXNbaW5kZXhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9BcnJheSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIGFsbCB0aGUgZWxlbWVudHMgY29udGFpbmVkIGluIHRoZSB7QGxpbmsgRE9NfSBzZXQsIGFzIGFuIGFycmF5LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgZnjgbnjgabjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBURWxlbWVudFtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3QgZWxlbWVudCB3aXRoaW4gdGhlIHtAbGluayBET019IGNvbGxlY3Rpb24gcmVsYXRpdmUgdG8gaXRzIHNpYmxpbmcgZWxlbWVudHMuXG4gICAgICogQGphIHtAbGluayBET019IOWGheOBruacgOWIneOBruimgee0oOOBjOWFhOW8n+imgee0oOOBruS9leeVquebruOBq+aJgOWxnuOBmeOCi+OBi+OCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpbmRleCgpOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VhcmNoIGZvciBhIGdpdmVuIGEgc2VsZWN0b3IsIGVsZW1lbnQsIG9yIHtAbGluayBET019IGluc3RhbmNlIGZyb20gYW1vbmcgdGhlIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDphY3kuIvjga7kvZXnlarnm67jgavmiYDlsZ7jgZfjgabjgYTjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcjogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yPzogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICBsZXQgY2hpbGQ6IE5vZGUgfCBudWxsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHdoaWxlIChudWxsICE9PSAoY2hpbGQgPSBjaGlsZC5wcmV2aW91c1NpYmxpbmcpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBjaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWxlbTogVCB8IEVsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlID8gc2VsZWN0b3JbMF0gOiBzZWxlY3RvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGkgPSBbLi4udGhpc10uaW5kZXhPZihlbGVtIGFzIFRFbGVtZW50ICYgRWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gMCA8PSBpID8gaSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVHJhdmVyc2luZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGZpcnN0IGluIHRoZSBzZXQgYXMge0BsaW5rIERPTX0gaW5zdGFuY2UuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+acgOWIneOBruimgee0oOOCkiB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKHRoaXNbMF0pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGZpbmFsIG9uZSBpbiB0aGUgc2V0IGFzIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovmnKvlsL7jga7opoHntKDjgpIge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKHRoaXNbdGhpcy5sZW5ndGggLSAxXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IHtAbGluayBET019IGluc3RhbmNlIHdpdGggZWxlbWVudHMgYWRkZWQgdG8gdGhlIHNldCBmcm9tIHNlbGVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCDjgaflj5blvpfjgZfjgZ8gYEVsZW1lbnRgIOOCkui/veWKoOOBl+OBn+aWsOimjyB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICovXG4gICAgcHVibGljIGFkZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3QgJGFkZCA9ICQoc2VsZWN0b3IsIGNvbnRleHQpO1xuICAgICAgICBjb25zdCBlbGVtcyA9IG5ldyBTZXQoWy4uLnRoaXMsIC4uLiRhZGRdKTtcbiAgICAgICAgcmV0dXJuICQoWy4uLmVsZW1zXSBhcyBhbnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayB0aGUgY3VycmVudCBtYXRjaGVkIHNldCBvZiBlbGVtZW50cyBhZ2FpbnN0IGEgc2VsZWN0b3IsIGVsZW1lbnQsIG9yIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GZ44KL44GL56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3aW5ub3coc2VsZWN0b3IsIHRoaXMsICgpID0+IHRydWUsICgpID0+IGZhbHNlKSBhcyBib29sZWFuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRob3NlIHRoYXQgbWF0Y2ggdGhlIHNlbGVjdG9yIG9yIHBhc3MgdGhlIGZ1bmN0aW9uJ3MgdGVzdC5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgTmV3IHtAbGluayBET019IGluc3RhbmNlIGluY2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuWGheWMheOBmeOCiyDmlrDopo8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50czogVEVsZW1lbnRbXSA9IFtdO1xuICAgICAgICB3aW5ub3coc2VsZWN0b3IsIHRoaXMsIChlbDogVEVsZW1lbnQpID0+IHsgZWxlbWVudHMucHVzaChlbCk7IH0pO1xuICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBlbGVtZW50cyBmcm9tIHRoZSBzZXQgb2YgbWF0Y2ggdGhlIHNlbGVjdG9yIG9yIHBhc3MgdGhlIGZ1bmN0aW9uJ3MgdGVzdC5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkuWJiumZpOOBl+OBpui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgTmV3IHtAbGluayBET019IGluc3RhbmNlIGV4Y2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuS7peWkluOCkuWGheWMheOBmeOCiyDmlrDopo8ge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIG5vdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IG5ldyBTZXQ8VEVsZW1lbnQ+KFsuLi50aGlzXSk7XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5kZWxldGUoZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoWy4uLmVsZW1lbnRzXSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBmaW5kPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmICghaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0b3IgPSAkKHNlbGVjdG9yKSBhcyBET008Tm9kZT47XG4gICAgICAgICAgICByZXR1cm4gJHNlbGVjdG9yLmZpbHRlcigoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwgIT09IGVsZW0gJiYgZWwuY29udGFpbnMoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVtcyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmVsZW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRob3NlIHRoYXQgaGF2ZSBhIGRlc2NlbmRhbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GX44Gf5a2Q6KaB57Sg5oyB44Gk6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBOb2RlW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKHNlbGVjdG9yLCBlbCBhcyBFbGVtZW50KSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICAgICAgdGFyZ2V0cy5wdXNoKC4uLiR0YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbGVtKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgbmV3IFNldCh0YXJnZXRzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbSAhPT0gZWwgJiYgZWxlbS5jb250YWlucyhlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KSBhcyBET008Tm9kZT4gYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQYXNzIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBtYXRjaGVkIHNldCB0aHJvdWdoIGEgZnVuY3Rpb24sIHByb2R1Y2luZyBhIG5ldyB7QGxpbmsgRE9NfSBpbnN0YW5jZSBjb250YWluaW5nIHRoZSByZXR1cm4gdmFsdWVzLlxuICAgICAqIEBqYSDjgrPjg7zjg6vjg5Djg4Pjgq/jgaflpInmm7TjgZXjgozjgZ/opoHntKDjgpLnlKjjgYTjgabmlrDjgZ/jgasge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS5qeL56+JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIG1vZGlmaWNhdGlvbiBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovlpInmm7TplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbWFwPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oY2FsbGJhY2s6IERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFRFbGVtZW50LCBUPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0ZSBvdmVyIGEge0BsaW5rIERPTX0gaW5zdGFuY2UsIGV4ZWN1dGluZyBhIGZ1bmN0aW9uIGZvciBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv6Zai5pWw44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBlYWNoKGNhbGxiYWNrOiBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgdGhpcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChmYWxzZSA9PT0gY2FsbGJhY2suY2FsbChlbCwgaW5kZXgsIGVsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIGEgc3Vic2V0IHNwZWNpZmllZCBieSBhIHJhbmdlIG9mIGluZGljZXMuXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBn+evhOWbsuOBruimgee0oOOCkuWQq+OCgCB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiZWdpblxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBiZWdpbiB0byBiZSBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OBrumWi+Wni+S9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqIEBwYXJhbSBlbmRcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgc3RvcCBiZWluZyBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OCkue1guOBiOOCi+ebtOWJjeOBruS9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBzbGljZShiZWdpbj86IG51bWJlciwgZW5kPzogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKFsuLi50aGlzXS5zbGljZShiZWdpbiwgZW5kKSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIG9uZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZfjgZ/opoHntKDjgpLlkKvjgoAge0BsaW5rIERPTX0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBlcShpbmRleDogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzLmdldChpbmRleCkpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0LCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3RvciBieSB0ZXN0aW5nIHRoZSBlbGVtZW50IGl0c2VsZiBhbmQgdHJhdmVyc2luZyB1cCB0aHJvdWdoIGl0cyBhbmNlc3RvcnMgaW4gdGhlIERPTSB0cmVlLlxuICAgICAqIEBqYSDplovlp4vopoHntKDjgYvjgonmnIDjgoLov5HjgYTopqropoHntKDjgpLpgbjmip4uIOOCu+ODrOOCr+OCv+ODvOaMh+WumuOBl+OBn+WgtOWQiCwg44Oe44OD44OB44GZ44KL5pyA44KC6L+R44GE6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9zZXN0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChudWxsID09IHNlbGVjdG9yIHx8ICFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgY2xvc2VzdHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYyA9IGVsLmNsb3Nlc3Qoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VzdHMuYWRkKGMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoWy4uLmNsb3Nlc3RzXSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzIGFzIHVua25vd24gYXMgRWxlbWVudCkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50cyhzZWxlY3RvcikuZXEoMCkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5ZCE6KaB57Sg44Gu5a2Q6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgYzmjIflrprjgZXjgozjgZ/loLTlkIjjga/jg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/ntZDmnpzjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGlsZHJlbjxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGNoaWxkLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLmFkZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNoaWxkcmVuXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IHBhcmVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruacgOWIneOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMge0BsaW5rIERPTX0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBjb25zdCBwYXJlbnRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50Tm9kZSA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSAmJiB2YWxpZFJldHJpZXZlTm9kZShwYXJlbnROb2RlLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5hZGQocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5wYXJlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMge0BsaW5rIERPTX0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50czxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50c1VudGlsKHVuZGVmaW5lZCwgc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIDxicj5cbiAgICAgKiAgICAgdXAgdG8gYnV0IG5vdCBpbmNsdWRpbmcgdGhlIGVsZW1lbnQgbWF0Y2hlZCBieSB0aGUgc2VsZWN0b3IsIERPTSBub2RlLCBvciB7QGxpbmsgRE9NfSBpbnN0YW5jZVxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzdHJpbmcgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjmloflrZfliJfjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyB7QGxpbmsgRE9NfSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzVW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgbGV0IHBhcmVudHM6IE5vZGVbXSA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgbGV0IHBhcmVudE5vZGUgPSAoZWwgYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHdoaWxlICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KSH5pWw6KaB57Sg44GM5a++6LGh44Gr44Gq44KL44Go44GN44Gv5Y+N6LuiXG4gICAgICAgIGlmICgxIDwgdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcmVudHMgPSBbLi4ubmV3IFNldChwYXJlbnRzLnJldmVyc2UoKSldLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkKHBhcmVudHMpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbW1lZGlhdGVseSBmb2xsb3dpbmcgc2libGluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIElmIGEgc2VsZWN0b3IgaXMgcHJvdmlkZWQsIGl0IHJldHJpZXZlcyB0aGUgbmV4dCBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDopoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TlvozjgavjgYLjgZ/jgovlhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dFNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5uZXh0RWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ubmV4dFNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIGZvbGxvd2luZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruasoeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm5leHRVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7mrKHku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzdHJpbmcgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjmloflrZfliJfjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dFVudGlsPFxuICAgICAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgICAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgICAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4gICAgPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiByZXRyaWV2ZVNpYmxpbmdzKCduZXh0RWxlbWVudFNpYmxpbmcnLCB0aGlzLCBzZWxlY3RvciwgZmlsdGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbW1lZGlhdGVseSBwcmVjZWRpbmcgc2libGluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIElmIGEgc2VsZWN0b3IgaXMgcHJvdmlkZWQsIGl0IHJldHJpZXZlcyB0aGUgcHJldmlvdXMgc2libGluZyBvbmx5IGlmIGl0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg6ZuG5ZCI44Gu5ZCE6KaB57Sg44Gu55u05YmN44Gu5YWE5byf6KaB57Sg44KS5oq95Ye6IDxicj5cbiAgICAgKiAgICAg5p2h5Lu25byP44KS5oyH5a6a44GX44CB57WQ5p6c44K744OD44OI44GL44KJ5pu044Gr57We6L6844G/44KS6KGM44GG44GT44Go44KC5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgcHJldjxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZXZTaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtID0gZWwucHJldmlvdXNFbGVtZW50U2libGluZztcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRSZXRyaWV2ZU5vZGUoZWxlbSwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZTaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5wcmV2U2libGluZ3NdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgcHJlY2VkaW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg6ZuG5ZCI5YaF44Gu5ZCE6KaB57Sg44Gu5YmN5Lul6ZmN44Gu5YWo44Gm44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgpLmjIflrprjgZnjgovjgZPjgajjgafjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgZPjgajjgYzlj6/og70uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgcHJldkFsbDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJldlVudGlsKHVuZGVmaW5lZCwgc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIHByZWNlZGluZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgdXAgdG8gYnV0IG5vdCBpbmNsdWRpbmcgdGhlIGVsZW1lbnQgbWF0Y2hlZCBieSB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOOBruWJjeS7pemZjeOBruWFhOW8n+imgee0oOOBpywg5oyH5a6a44GX44Gf44K744Os44Kv44K/44KE5p2h5Lu244Gr5LiA6Ie044GZ44KL6KaB57Sg44GM5Ye644Gm44GP44KL44G+44Gn6YG45oqe44GX44Gm5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnLCB0aGlzLCBzZWxlY3RvciwgZmlsdGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3JcbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf5ZCE6KaB57Sg44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2libGluZ3M8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc2libGluZyBvZiAkKHBhcmVudE5vZGUpLmNoaWxkcmVuKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNpYmxpbmcgIT09IGVsIGFzIEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoc2libGluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyB0ZXh0IGFuZCBjb21tZW50IG5vZGVzLlxuICAgICAqIEBqYSDjg4bjgq3jgrnjg4jjgoRIVE1M44Kz44Oh44Oz44OI44KS5ZCr44KA5a2Q6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGNvbnRlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUoZWwsICdpZnJhbWUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIEhUTUxJRnJhbWVFbGVtZW50KS5jb250ZW50RG9jdW1lbnQgYXMgTm9kZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlTmFtZShlbCwgJ3RlbXBsYXRlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKChlbCBhcyBIVE1MVGVtcGxhdGVFbGVtZW50KS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgZWwuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5jb250ZW50c10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjbG9zZXN0IGFuY2VzdG9yIGVsZW1lbnQgdGhhdCBpcyBwb3NpdGlvbmVkLlxuICAgICAqIEBqYSDopoHntKDjga7lhYjnpZbopoHntKDjgacsIOOCueOCv+OCpOODq+OBp+ODneOCuOOCt+ODp+ODs+aMh+Wumihwb3NpdGlpb27jgYxyZWxhdGl2ZSwgYWJzb2x1dGUsIGZpeGVk44Gu44GE44Ga44KM44GLKeOBleOCjOOBpuOBhOOCi+OCguOBruOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXRQYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oKTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQocm9vdEVsZW1lbnQpIGFzIERPTTxOb2RlPiBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0UGFyZW50KGVsIGFzIE5vZGUpID8/IHJvb3RFbGVtZW50O1xuICAgICAgICAgICAgICAgIG9mZnNldHMuYWRkKG9mZnNldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4ub2Zmc2V0c10pIGFzIERPTTxUPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NVHJhdmVyc2luZywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7IGlzU3RyaW5nLCBzZXRNaXhDbGFzc0F0dHJpYnV0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgY2hlY2sgSFRNTCBzdHJpbmcgKi9cbmZ1bmN0aW9uIGlzSFRNTFN0cmluZyhzcmM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHN1YmplY3QgPSBzcmMudHJpbSgpO1xuICAgIHJldHVybiAoJzwnID09PSBzdWJqZWN0LnNsaWNlKDAsIDEpKSAmJiAoJz4nID09PSBzdWJqZWN0LnNsaWNlKC0xKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgYXBwZW5kKClgLCBgcHJlcGVuZCgpYCwgYGJlZm9yZSgpYCBhbmQgYGFmdGVyKClgICAqL1xuZnVuY3Rpb24gdG9Ob2RlU2V0PFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogU2V0PE5vZGUgfCBzdHJpbmc+IHtcbiAgICBjb25zdCBub2RlcyA9IG5ldyBTZXQ8Tm9kZSB8IHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRlbnQgb2YgY29udGVudHMpIHtcbiAgICAgICAgaWYgKChpc1N0cmluZyhjb250ZW50KSAmJiAhaXNIVE1MU3RyaW5nKGNvbnRlbnQpKSB8fCBpc05vZGUoY29udGVudCkpIHtcbiAgICAgICAgICAgIG5vZGVzLmFkZChjb250ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0ICRkb20gPSAkKGNvbnRlbnQgYXMgRE9NPEVsZW1lbnQ+KTtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiAkZG9tKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzU3RyaW5nKG5vZGUpIHx8IChpc05vZGUobm9kZSkgJiYgTm9kZS5ET0NVTUVOVF9OT0RFICE9PSBub2RlLm5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICBub2Rlcy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2Rlcztcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBiZWZvcmUoKWAgYW5kIGBhZnRlcigpYCAgKi9cbmZ1bmN0aW9uIHRvTm9kZShub2RlOiBOb2RlIHwgc3RyaW5nKTogTm9kZSB7XG4gICAgaWYgKGlzU3RyaW5nKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgZGV0YWNoKClgIGFuZCBgcmVtb3ZlKClgICovXG5mdW5jdGlvbiByZW1vdmVFbGVtZW50PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgdW5kZWZpbmVkLFxuICAgIGRvbTogRE9NSXRlcmFibGU8VT4sXG4gICAga2VlcExpc3RlbmVyOiBib29sZWFuXG4pOiB2b2lkIHtcbiAgICBjb25zdCAkZG9tOiBET008VT4gPSBudWxsICE9IHNlbGVjdG9yXG4gICAgICAgID8gKGRvbSBhcyBET008VT4pLmZpbHRlcihzZWxlY3RvcilcbiAgICAgICAgOiBkb20gYXMgRE9NPFU+O1xuXG4gICAgaWYgKCFrZWVwTGlzdGVuZXIpIHtcbiAgICAgICAgJGRvbS5vZmYoKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGVsIG9mICRkb20pIHtcbiAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBtYW5pcHVsYXRpb24gbWV0aG9kcy5cbiAqIEBqYSDjg57jg4vjg5Tjg6Xjg6zjg7zjgrfjg6fjg7Pjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTU1hbmlwdWxhdGlvbjxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEluc2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBIVE1MIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIEhUTUwgY29udGVudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44GfIEhUTUwg44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaHRtbFN0cmluZ1xuICAgICAqICAtIGBlbmAgQSBzdHJpbmcgb2YgSFRNTCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgosgSFRNTCDmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nOiBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZz86IHN0cmluZyk6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSA/IGVsLmlubmVySFRNTCA6ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGh0bWxTdHJpbmcpKSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sU3RyaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaW52YWxpZCBhcmdcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBhcmcuIGh0bWxTdHJpbmcgdHlwZToke3R5cGVvZiBodG1sU3RyaW5nfWApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBqUXVlcnkgcmV0dXJucyB0aGUgY29tYmluZWQgdGV4dCBvZiBlYWNoIGVsZW1lbnQsIGJ1dCB0aGlzIG1ldGhvZCBtYWtlcyBvbmx5IGZpcnN0IGVsZW1lbnQncyB0ZXh0LlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga7jg4bjgq3jgrnjg4jjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICBqUXVlcnkg44Gv5ZCE6KaB57Sg44Gu6YCj57WQ44OG44Kt44K544OI44KS6L+U5Y2044GZ44KL44GM5pys44Oh44K944OD44OJ44Gv5YWI6aCt6KaB57Sg44Gu44G/44KS5a++6LGh44Go44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIHRleHQoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBzcGVjaWZpZWQgdGV4dC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44Gf44OG44Kt44K544OI44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGV4dFxuICAgICAqICAtIGBlbmAgVGhlIHRleHQgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KL44OG44Kt44K544OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHRleHQodmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIHRleHQodmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGVsLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiAobnVsbCAhPSB0ZXh0KSA/IHRleHQudHJpbSgpIDogJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBlbmQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBhcHBlbmQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmFwcGVuZCguLi5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZW5kIG9mIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+imgee0oOOCkuS7luOBruimgee0oOOBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGFwcGVuZFRvPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCB0byB0aGUgYmVnaW5uaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWFiOmgreOBq+W8leaVsOOBp+aMh+WumuOBl+OBn+OCs+ODs+ODhuODs+ODhOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucHJlcGVuZCguLi5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+imgee0oOOCkuS7luOBruimgee0oOOBruWFiOmgreOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHByZXBlbmRUbzxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkucHJlcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBPdXRzaWRlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCBiZWZvcmUgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YmN44Gr5oyH5a6a44GX44GfIEhUTUwg44KE6KaB57Sg44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBiZWZvcmU8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYmVmb3JlIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBruWJjeOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEJlZm9yZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYmVmb3JlKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYWZ0ZXIgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5b6M44KN44Gr5oyH5a6a44GX44GfIEhUTUwg44KE6KaB57Sg44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIHtAbGluayBET019IGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBhZnRlcjxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5bLi4uY29udGVudHNdLnJldmVyc2UoKSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsLm5leHRTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBhZnRlciB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjga7lvozjgo3jgavmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBpbnNlcnRBZnRlcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYWZ0ZXIodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgQXJvdW5kXG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgYWxsIGVsZW1lbnRzIGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcEFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZURvY3VtZW50KHRoaXMpIHx8IGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgTm9kZTtcblxuICAgICAgICAvLyBUaGUgZWxlbWVudHMgdG8gd3JhcCB0aGUgdGFyZ2V0IGFyb3VuZFxuICAgICAgICBjb25zdCAkd3JhcCA9ICQoc2VsZWN0b3IsIGVsLm93bmVyRG9jdW1lbnQpLmVxKDApLmNsb25lKHRydWUpIGFzIERPTTxFbGVtZW50PjtcblxuICAgICAgICBpZiAoZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgJHdyYXAuaW5zZXJ0QmVmb3JlKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgICR3cmFwLm1hcCgoaW5kZXg6IG51bWJlciwgZWxlbTogRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgd2hpbGUgKGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gZWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9KS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXlgbTjgpIsIOaMh+WumuOBl+OBn+WIpeOCqOODrOODoeODs+ODiOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXBJbm5lcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgY29uc3QgY29udGVudHMgPSAkZWwuY29udGVudHMoKTtcbiAgICAgICAgICAgIGlmICgwIDwgY29udGVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29udGVudHMud3JhcEFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRlbC5hcHBlbmQoc2VsZWN0b3IgYXMgTm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KSLCDmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICAkZWwud3JhcEFsbChzZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBwYXJlbnRzIG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00sIGxlYXZpbmcgdGhlIG1hdGNoZWQgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UuXG4gICAgICogQGphIOimgee0oOOBruimquOCqOODrOODoeODs+ODiOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHVud3JhcDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgc2VsZi5wYXJlbnQoc2VsZWN0b3IpLm5vdCgnYm9keScpLmVhY2goKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAkKGVsZW0pLnJlcGxhY2VXaXRoKGVsZW0uY2hpbGROb2Rlcyk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlbW92YWxcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYWxsIGNoaWxkIG5vZGVzIG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOWGheOBruWtkOimgee0oCjjg4bjgq3jgrnjg4jjgoLlr77osaEp44KS44GZ44G544Gm5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIGVtcHR5KCk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChlbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uIFRoaXMgbWV0aG9kIGtlZXBzIGV2ZW50IGxpc3RlbmVyIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDopoHntKDjgpIgRE9NIOOBi+OCieWJiumZpC4g5YmK6Zmk5b6M44KC44Kk44OZ44Oz44OI44Oq44K544OK44Gv5pyJ5Yq5XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZGV0YWNoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6KaB57Sg44KSIERPTSDjgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICByZW1vdmVFbGVtZW50KHNlbGVjdG9yLCB0aGlzLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVwbGFjZW1lbnRcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgd2l0aCB0aGUgcHJvdmlkZWQgbmV3IGNvbnRlbnQgYW5kIHJldHVybiB0aGUgc2V0IG9mIGVsZW1lbnRzIHRoYXQgd2FzIHJlbW92ZWQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBleOCjOOBn+WIpeOBruimgee0oOOChCBIVE1MIOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld0NvbnRlbnRcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICAgICAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVdpdGg8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4obmV3Q29udGVudD86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGVsZW0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGRvbSA9ICQobmV3Q29udGVudCk7XG4gICAgICAgICAgICBpZiAoMSA9PT0gJGRvbS5sZW5ndGggJiYgaXNOb2RlRWxlbWVudCgkZG9tWzBdKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkZG9tWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mICRkb20pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucmVwbGFjZVdpdGgoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIHRhcmdldCBlbGVtZW50IHdpdGggdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXjga7opoHntKDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gICAgICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5yZXBsYWNlV2l0aCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NTWFuaXB1bGF0aW9uLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICBpc051bWJlcixcbiAgICBpc0FycmF5LFxuICAgIGFzc2lnblZhbHVlLFxuICAgIGNsYXNzaWZ5LFxuICAgIGRhc2hlcml6ZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZURvY3VtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBnZXRPZmZzZXRQYXJlbnQsXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgICovXG5mdW5jdGlvbiBlbnN1cmVDaGFpbkNhc2VQcm9wZXJpZXMocHJvcHM6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPik6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCByZXR2YWwgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBwcm9wcykge1xuICAgICAgICBhc3NpZ25WYWx1ZShyZXR2YWwsIGRhc2hlcml6ZShrZXkpLCBwcm9wc1trZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgZ2V0IHByb3BzICovXG5mdW5jdGlvbiBnZXREZWZhdWx0VmlldyhlbDogRWxlbWVudCk6IFdpbmRvdyB7XG4gICAgcmV0dXJuIChlbC5vd25lckRvY3VtZW50ICYmIGVsLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcpID8/IHdpbmRvdztcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgZ2V0IHByb3BzICovXG5mdW5jdGlvbiBnZXRDb21wdXRlZFN0eWxlRnJvbShlbDogRWxlbWVudCk6IENTU1N0eWxlRGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgcmV0dXJuIHZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBjc3MgdmFsdWUgdG8gbnVtYmVyICovXG5mdW5jdGlvbiB0b051bWJlcih2YWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsKSB8fCAwO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVzb2x2ZXIgPSB7XG4gICAgd2lkdGg6IFsnbGVmdCcsICdyaWdodCddLFxuICAgIGhlaWdodDogWyd0b3AnLCAnYm90dG9tJ10sXG59O1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldFBhZGRpbmcoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYHBhZGRpbmctJHtfcmVzb2x2ZXJbdHlwZV1bMF19YCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYHBhZGRpbmctJHtfcmVzb2x2ZXJbdHlwZV1bMV19YCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldEJvcmRlcihzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgYm9yZGVyLSR7X3Jlc29sdmVyW3R5cGVdWzBdfS13aWR0aGApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBib3JkZXItJHtfcmVzb2x2ZXJbdHlwZV1bMV19LXdpZHRoYCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldE1hcmdpbihzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgbWFyZ2luLSR7X3Jlc29sdmVyW3R5cGVdWzBdfWApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBtYXJnaW4tJHtfcmVzb2x2ZXJbdHlwZV1bMV19YCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHdpZHRoKClgIGFuZCBgaGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkumZpOOBhOOBn+W5hSAoY2xpZW50V2lkdGggLyBjbGllbnRIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gKGRvbVswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtgY2xpZW50JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICAvLyAoc2Nyb2xsV2lkdGggLyBzY3JvbGxIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gKGRvbVswXS5kb2N1bWVudEVsZW1lbnQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KVtgc2Nyb2xsJHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZSA9IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpO1xuICAgICAgICAgICAgICAgIGlmICgnYm9yZGVyLWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2l6ZSAtIChnZXRCb3JkZXIoc3R5bGUsIHR5cGUpICsgZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgcmV0dXJuIGRvbS5jc3ModHlwZSwgaXNTdHJpbmcodmFsdWUpID8gdmFsdWUgOiBgJHt2YWx1ZX1weGApO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpbm5lcldpZHRoKClgIGFuZCBgaW5uZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZUlubmVyU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAoY2xpZW50V2lkdGggLyBjbGllbnRIZWlnaHQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BjbGllbnQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSBpc1RleHRQcm9wID8gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSkgOiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCArIGdldEJvcmRlcihzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBpbnRlcmZhY2UgUGFyc2VPdXRlclNpemVBcmdzUmVzdWx0IHsgaW5jbHVkZU1hcmdpbjogYm9vbGVhbjsgdmFsdWU6IG51bWJlciB8IHN0cmluZzsgfVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdCB7XG4gICAgbGV0IFt2YWx1ZSwgaW5jbHVkZU1hcmdpbl0gPSBhcmdzO1xuICAgIGlmICghaXNOdW1iZXIodmFsdWUpICYmICFpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgaW5jbHVkZU1hcmdpbiA9ICEhdmFsdWU7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4geyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9IGFzIFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZU91dGVyU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW46IGJvb2xlYW4sIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLlkKvjgoHjgZ/luYUgKGlubmVyV2lkdGggLyBpbm5lckhlaWdodClcbiAgICAgICAgICAgIHJldHVybiAoZG9tWzBdIGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgbnVtYmVyPilbYGlubmVyJHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGdldE9mZnNldFNpemUoZWwsIHR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTWFyZ2luKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0ICsgZ2V0TWFyZ2luKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFyZ2luID0gaW5jbHVkZU1hcmdpbiA/IGdldE1hcmdpbihzdHlsZSwgdHlwZSkgOiAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAoaXNUZXh0UHJvcCA/IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpIDogdmFsdWUpIC0gbWFyZ2luO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdHlsZSwgbmV3VmFsIH07XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCAtIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbH1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwb3NpdGlvbigpYCBhbmQgYG9mZnNldCgpYCAqL1xuZnVuY3Rpb24gZ2V0T2Zmc2V0UG9zaXRpb24oZWw6IEVsZW1lbnQpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0ge1xuICAgIC8vIGZvciBkaXNwbGF5IG5vbmVcbiAgICBpZiAoZWwuZ2V0Q2xpZW50UmVjdHMoKS5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0b3A6IHJlY3QudG9wICsgdmlldy5zY3JvbGxZLFxuICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyB2aWV3LnNjcm9sbFgsXG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IG9mZnNldFtXaWR0aCB8IEhlaWdodF0uIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZVtXaWR0aCB8IEhlaWdodF0g44Gu5Y+W5b6XLiBTVkdFbGVtZW50IOOBq+OCgumBqeeUqOWPr+iDvVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T2Zmc2V0U2l6ZShlbDogSFRNTE9yU1ZHRWxlbWVudCwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCAhPSAoZWwgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoKSB7XG4gICAgICAgIC8vIChvZmZzZXRXaWR0aCAvIG9mZnNldEhlaWdodClcbiAgICAgICAgcmV0dXJuIChlbCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BvZmZzZXQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIFtOT1RFXSBTVkdFbGVtZW50IOOBryBvZmZzZXRXaWR0aCDjgYzjgrXjg53jg7zjg4jjgZXjgozjgarjgYRcbiAgICAgICAgICogICAgICAgIGdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIOOBryB0cmFuc2Zvcm0g44Gr5b2x6Z+/44KS5Y+X44GR44KL44Gf44KBLFxuICAgICAgICAgKiAgICAgICAg5a6a576p6YCa44KKIGJvcmRlciwgcGFkZGluIOOCkuWQq+OCgeOBn+WApOOCkueul+WHuuOBmeOCi1xuICAgICAgICAgKi9cbiAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCBhcyBTVkdFbGVtZW50KTtcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpO1xuICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZSArIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIHN0eWxlIG1hbmFnZW1lbnQgbWV0aG9kcy5cbiAqIEBqYSDjgrnjgr/jgqTjg6vplqLpgKPjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVN0eWxlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXSE6ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTdHlsZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgdmFsdWUgc3RyaW5nLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WApOOCkuaWh+Wtl+WIl+OBp+i/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbXVsdGlwbGUgY29tcHV0ZWQgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gQ1NTIOOBq+ioreWumuOBleOCjOOBpuOBhOOCi+ODl+ODreODkeODhuOCo+WApOOCkuikh+aVsOWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVzXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcnJheSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjemFjeWIl+OCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHktdmFsdWUgb2JqZWN0LlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+OCkuagvOe0jeOBl+OBn+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZXM6IHN0cmluZ1tdKTogUGxhaW5PYmplY3Q8c3RyaW5nPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgQ1NTIHByb3BlcnRpeSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBzdHJpbmcgdmFsdWUgdG8gc2V0IGZvciB0aGUgcHJvcGVydHkuIGlmIG51bGwgcGFzc2VkLCByZW1vdmUgcHJvcGVydHkuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmloflrZfliJfjgafmjIflrpouIG51bGwg5oyH5a6a44Gn5YmK6ZmkLlxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG9uZSBvciBtb3JlIENTUyBwcm9wZXJ0aWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOBriBDU1Mg6KSH5pWw44Gu44OX44Ot44OR44OG44Kj44Gr5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdIHwgUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+LCB2YWx1ZT86IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgfCBQbGFpbk9iamVjdDxzdHJpbmc+IHwgdGhpcyB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyAnJyA6IHRoaXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHByb3BlcnR5IHNpbmdsZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCkuZ2V0UHJvcGVydHlWYWx1ZShkYXNoZXJpemUobmFtZSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBzZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBkYXNoZXJpemUobmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVtb3ZlID0gKG51bGwgPT09IHZhbHVlKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkobmFtZSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBtdWx0aXBsZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgRWxlbWVudDtcbiAgICAgICAgICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IHt9IGFzIFBsYWluT2JqZWN0PHN0cmluZz47XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBkYXNoZXJpemUoa2V5KTtcbiAgICAgICAgICAgICAgICBwcm9wc1trZXldID0gdmlldy5nZXRDb21wdXRlZFN0eWxlKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKHByb3BOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm9wcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBtdWx0aXBsZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IGVuc3VyZUNoYWluQ2FzZVByb3BlcmllcyhuYW1lKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlIH0gPSBlbDtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wTmFtZSBpbiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT09IHByb3BzW3Byb3BOYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlLnJlbW92ZVByb3BlcnR5KHByb3BOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUuc2V0UHJvcGVydHkocHJvcE5hbWUsIHByb3BzW3Byb3BOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgd2lkdGggZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBvciBzZXQgdGhlIHdpZHRoIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6KiI566X5riI44G/5qiq5bmF44KS44OU44Kv44K744Or5Y2Y5L2N44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHdpZHRoKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7mqKrluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgd2lkdGgodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IodGhpcywgJ3dpZHRoJywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGhlaWdodCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/nq4vluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBoZWlnaHQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu57im5bmF44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBoZWlnaHQodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IodGhpcywgJ2hlaWdodCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgcGFkZGluZyBidXQgbm90IGJvcmRlci5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGlubmVyIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOaoquW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lcldpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZUlubmVyU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaW5uZXIgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jnuKbluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJIZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGlubmVyIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXpg6jnuKbluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJIZWlnaHQodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJIZWlnaHQodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZUlubmVyU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIHdpZHRoIChpbmNsdWRpbmcgcGFkZGluZywgYm9yZGVyLCBhbmQgb3B0aW9uYWxseSBtYXJnaW4pIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWklumDqOaoquW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuWPluW+ly4g44Kq44OX44K344On44Oz5oyH5a6a44Gr44KI44KK44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44Gf44KC44Gu44KC5Y+W5b6X5Y+vXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlcldpZHRoKGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIG91dGVyIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOaoquW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZywgaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIG91dGVyV2lkdGgoLi4uYXJnczogdW5rbm93bltdKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgaW5jbHVkZU1hcmdpbiwgdmFsdWUgfSA9IHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIG1hbmFnZU91dGVyU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCBpbmNsdWRlTWFyZ2luLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgb3V0ZXIgaGVpZ2h0IChpbmNsdWRpbmcgcGFkZGluZywgYm9yZGVyLCBhbmQgb3B0aW9uYWxseSBtYXJnaW4pIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWklumDqOe4puW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuWPluW+ly4g44Kq44OX44K344On44Oz5oyH5a6a44Gr44KI44KK44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44Gf44KC44Gu44KC5Y+W5b6X5Y+vXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlckhlaWdodChpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBvdXRlciBoZWlnaHQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5aSW6YOo57im5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQodmFsdWU6IG51bWJlciB8IHN0cmluZywgaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIG91dGVySGVpZ2h0KC4uLmFyZ3M6IHVua25vd25bXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBvZmZzZXQgcGFyZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7opqropoHntKDjgYvjgonjga7nm7jlr77nmoTjgarooajnpLrkvY3nva7jgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgcG9zaXRpb24oKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBvZmZzZXQ6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfTtcbiAgICAgICAgbGV0IHBhcmVudE9mZnNldCA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgbWFyZ2luVG9wOiBtdCwgbWFyZ2luTGVmdDogbWwgfSA9ICQoZWwpLmNzcyhbJ3Bvc2l0aW9uJywgJ21hcmdpblRvcCcsICdtYXJnaW5MZWZ0J10pO1xuICAgICAgICBjb25zdCBtYXJnaW5Ub3AgPSB0b051bWJlcihtdCk7XG4gICAgICAgIGNvbnN0IG1hcmdpbkxlZnQgPSB0b051bWJlcihtbCk7XG5cbiAgICAgICAgLy8gcG9zaXRpb246Zml4ZWQgZWxlbWVudHMgYXJlIG9mZnNldCBmcm9tIHRoZSB2aWV3cG9ydCwgd2hpY2ggaXRzZWxmIGFsd2F5cyBoYXMgemVybyBvZmZzZXRcbiAgICAgICAgaWYgKCdmaXhlZCcgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAvLyBBc3N1bWUgcG9zaXRpb246Zml4ZWQgaW1wbGllcyBhdmFpbGFiaWxpdHkgb2YgZ2V0Qm91bmRpbmdDbGllbnRSZWN0XG4gICAgICAgICAgICBvZmZzZXQgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKGVsKTtcblxuICAgICAgICAgICAgLy8gQWNjb3VudCBmb3IgdGhlICpyZWFsKiBvZmZzZXQgcGFyZW50LCB3aGljaCBjYW4gYmUgdGhlIGRvY3VtZW50IG9yIGl0cyByb290IGVsZW1lbnRcbiAgICAgICAgICAgIC8vIHdoZW4gYSBzdGF0aWNhbGx5IHBvc2l0aW9uZWQgZWxlbWVudCBpcyBpZGVudGlmaWVkXG4gICAgICAgICAgICBjb25zdCBkb2MgPSBlbC5vd25lckRvY3VtZW50O1xuICAgICAgICAgICAgbGV0IG9mZnNldFBhcmVudCA9IGdldE9mZnNldFBhcmVudChlbCkgPz8gZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgICAgIGxldCAkb2Zmc2V0UGFyZW50ID0gJChvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgd2hpbGUgKG9mZnNldFBhcmVudCAmJlxuICAgICAgICAgICAgICAgIChvZmZzZXRQYXJlbnQgPT09IGRvYy5ib2R5IHx8IG9mZnNldFBhcmVudCA9PT0gZG9jLmRvY3VtZW50RWxlbWVudCkgJiZcbiAgICAgICAgICAgICAgICAnc3RhdGljJyA9PT0gJG9mZnNldFBhcmVudC5jc3MoJ3Bvc2l0aW9uJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9mZnNldFBhcmVudCA9IG9mZnNldFBhcmVudC5wYXJlbnROb2RlIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvZmZzZXRQYXJlbnQgJiYgb2Zmc2V0UGFyZW50ICE9PSBlbCAmJiBOb2RlLkVMRU1FTlRfTk9ERSA9PT0gb2Zmc2V0UGFyZW50Lm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5jb3Jwb3JhdGUgYm9yZGVycyBpbnRvIGl0cyBvZmZzZXQsIHNpbmNlIHRoZXkgYXJlIG91dHNpZGUgaXRzIGNvbnRlbnQgb3JpZ2luXG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0ID0gZ2V0T2Zmc2V0UG9zaXRpb24ob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGJvcmRlclRvcFdpZHRoLCBib3JkZXJMZWZ0V2lkdGggfSA9ICRvZmZzZXRQYXJlbnQuY3NzKFsnYm9yZGVyVG9wV2lkdGgnLCAnYm9yZGVyTGVmdFdpZHRoJ10pO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC50b3AgKz0gdG9OdW1iZXIoYm9yZGVyVG9wV2lkdGgpO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC5sZWZ0ICs9IHRvTnVtYmVyKGJvcmRlckxlZnRXaWR0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdWJ0cmFjdCBwYXJlbnQgb2Zmc2V0cyBhbmQgZWxlbWVudCBtYXJnaW5zXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3A6IG9mZnNldC50b3AgLSBwYXJlbnRPZmZzZXQudG9wIC0gbWFyZ2luVG9wLFxuICAgICAgICAgICAgbGVmdDogb2Zmc2V0LmxlZnQgLSBwYXJlbnRPZmZzZXQubGVmdCAtIG1hcmdpbkxlZnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBkb2N1bWVudC5cbiAgICAgKiBAamEgZG9jdW1lbnQg44KS5Z+65rqW44Go44GX44GmLCDjg57jg4Pjg4HjgZfjgabjgYTjgovopoHntKDpm4blkIjjga4x44Gk55uu44Gu6KaB57Sg44Gu54++5Zyo44Gu5bqn5qiZ44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldCgpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBqyBkb2N1bWVudCDjgpLln7rmupbjgavjgZfjgZ/nj77lnKjluqfmqJnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb29yZGluYXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHByb3BlcnRpZXMgYHRvcGAgYW5kIGBsZWZ0YC5cbiAgICAgKiAgLSBgamFgIGB0b3BgLCBgbGVmdGAg44OX44Ot44OR44OG44Kj44KS5ZCr44KA44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlczogeyB0b3A/OiBudW1iZXI7IGxlZnQ/OiBudW1iZXI7IH0pOiB0aGlzO1xuXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlcz86IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHwgdGhpcyB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gY29vcmRpbmF0ZXMgPyB7IHRvcDogMCwgbGVmdDogMCB9IDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGNvb3JkaW5hdGVzKSB7XG4gICAgICAgICAgICAvLyBnZXRcbiAgICAgICAgICAgIHJldHVybiBnZXRPZmZzZXRQb3NpdGlvbih0aGlzWzBdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldFxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcHM6IHsgdG9wPzogc3RyaW5nOyBsZWZ0Pzogc3RyaW5nOyB9ID0ge307XG4gICAgICAgICAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdG9wOiBjc3NUb3AsIGxlZnQ6IGNzc0xlZnQgfSA9ICRlbC5jc3MoWydwb3NpdGlvbicsICd0b3AnLCAnbGVmdCddKTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBwb3NpdGlvbiBmaXJzdCwgaW4tY2FzZSB0b3AvbGVmdCBhcmUgc2V0IGV2ZW4gb24gc3RhdGljIGVsZW1cbiAgICAgICAgICAgICAgICBpZiAoJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGN1ck9mZnNldCA9ICRlbC5vZmZzZXQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJQb3NpdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5lZWRDYWxjdWxhdGVQb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgPSAoJ2Fic29sdXRlJyA9PT0gcG9zaXRpb24gfHwgJ2ZpeGVkJyA9PT0gcG9zaXRpb24pICYmIChjc3NUb3AgKyBjc3NMZWZ0KS5pbmNsdWRlcygnYXV0bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmVlZENhbGN1bGF0ZVBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGVsLnBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0b3A6IHRvTnVtYmVyKGNzc1RvcCksIGxlZnQ6IHRvTnVtYmVyKGNzc0xlZnQpIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY29vcmRpbmF0ZXMudG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLnRvcCA9IGAkeyhjb29yZGluYXRlcy50b3AgLSBjdXJPZmZzZXQudG9wKSArIGN1clBvc2l0aW9uLnRvcH1weGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLmxlZnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcHMubGVmdCA9IGAkeyhjb29yZGluYXRlcy5sZWZ0IC0gY3VyT2Zmc2V0LmxlZnQpICsgY3VyUG9zaXRpb24ubGVmdH1weGA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJGVsLmNzcyhwcm9wcyBhcyBQbGFpbk9iamVjdDxzdHJpbmc+KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01TdHlsZXMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIG5vLWludmFsaWQtdGhpcyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgQWNjZXNzaWJsZSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgY29tYmluYXRpb24sXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSwgaXNUeXBlRWxlbWVudCB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgdHlwZSB7IENvbm5lY3RFdmVudE1hcCB9IGZyb20gJy4vZGV0ZWN0aW9uJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEludGVybmFsRXZlbnRMaXN0ZW5lciBleHRlbmRzIEV2ZW50TGlzdGVuZXIge1xuICAgIG9yaWdpbj86IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBFdmVudExpc3RlbmVySGFuZGxlciB7XG4gICAgbGlzdGVuZXI6IEludGVybmFsRXZlbnRMaXN0ZW5lcjtcbiAgICBwcm94eTogRXZlbnRMaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEJpbmRJbmZvIHtcbiAgICByZWdpc3RlcmVkOiBTZXQ8RXZlbnRMaXN0ZW5lcj47XG4gICAgaGFuZGxlcnM6IEV2ZW50TGlzdGVuZXJIYW5kbGVyW107XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgQmluZEV2ZW50Q29udGV4dCA9IFJlY29yZDxzdHJpbmcsIEJpbmRJbmZvPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgQ09PS0lFX1NFUEFSQVRPUiAgPSAnfCcsXG4gICAgQUREUkVTU19FVkVOVCAgICAgPSAwLFxuICAgIEFERFJFU1NfTkFNRVNQQUNFID0gMSxcbiAgICBBRERSRVNTX09QVElPTlMgICA9IDIsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIHVua25vd25bXT4oKSxcbiAgICBldmVudExpc3RlbmVyczogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIEJpbmRFdmVudENvbnRleHQ+KCksXG4gICAgbGl2ZUV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgZXZlbnQtZGF0YSBmcm9tIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5RXZlbnREYXRhKGV2ZW50OiBFdmVudCk6IHVua25vd25bXSB7XG4gICAgY29uc3QgZGF0YSA9IF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmdldChldmVudC50YXJnZXQgYXMgRWxlbWVudCkgPz8gW107XG4gICAgZGF0YS51bnNoaWZ0KGV2ZW50KTtcbiAgICByZXR1cm4gZGF0YTtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBldmVudC1kYXRhIHdpdGggZWxlbWVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudERhdGEoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50RGF0YTogdW5rbm93bltdKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuc2V0KGVsZW0sIGV2ZW50RGF0YSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgZGVsZXRlIGV2ZW50LWRhdGEgYnkgZWxlbWVudCAqL1xuZnVuY3Rpb24gZGVsZXRlRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZGVsZXRlKGVsZW0pO1xufVxuXG4vKiogQGludGVybmFsIG5vcm1hbGl6ZSBldmVudCBuYW1lc3BhY2UgKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZUV2ZW50TmFtZXNwYWNlcyhldmVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBuYW1lc3BhY2VzID0gZXZlbnQuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBtYWluID0gbmFtZXNwYWNlcy5zaGlmdCgpITtcbiAgICBpZiAoIW5hbWVzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBtYWluO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWVzcGFjZXMuc29ydCgpO1xuICAgICAgICByZXR1cm4gYCR7bWFpbn0uJHtuYW1lc3BhY2VzLmpvaW4oJy4nKX1gO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBzcGxpdCBldmVudCBuYW1lc3BhY2VzICovXG5mdW5jdGlvbiBzcGxpdEV2ZW50TmFtZXNwYWNlcyhldmVudDogc3RyaW5nKTogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10ge1xuICAgIGNvbnN0IHJldHZhbDogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZXMgPSBldmVudC5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1haW4gPSBuYW1lc3BhY2VzLnNoaWZ0KCkhO1xuXG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IG1haW4sIG5hbWVzcGFjZTogJycgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmFtZXNwYWNlcy5zb3J0KCk7XG5cbiAgICAgICAgY29uc3QgY29tYm9zOiBzdHJpbmdbXVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSBuYW1lc3BhY2VzLmxlbmd0aDsgaSA+PSAxOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbWJvcy5wdXNoKC4uLmNvbWJpbmF0aW9uKG5hbWVzcGFjZXMsIGkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGAuJHtuYW1lc3BhY2VzLmpvaW4oJy4nKX0uYDtcbiAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBtYWluLCBuYW1lc3BhY2U6IHNpZ25hdHVyZSB9KTtcbiAgICAgICAgZm9yIChjb25zdCBucyBvZiBjb21ib3MpIHtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKHsgdHlwZTogYCR7bWFpbn0uJHtucy5qb2luKCcuJyl9YCwgbmFtZXNwYWNlOiBzaWduYXR1cmUgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIHJldmVyc2UgcmVzb2x1dGlvbiBldmVudCBuYW1lc3BhY2VzICovXG5mdW5jdGlvbiByZXNvbHZlRXZlbnROYW1lc3BhY2VzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nKTogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10ge1xuICAgIGNvbnN0IHJldHZhbDogeyB0eXBlOiBzdHJpbmc7IG5hbWVzcGFjZTogc3RyaW5nOyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzcGFjZXMgPSBldmVudC5zcGxpdCgnLicpO1xuICAgIGNvbnN0IG1haW4gPSBuYW1lc3BhY2VzLnNoaWZ0KCkhO1xuICAgIGNvbnN0IHR5cGUgPSBub3JtYWxpemVFdmVudE5hbWVzcGFjZXMoZXZlbnQpO1xuXG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IG1haW4sIG5hbWVzcGFjZTogJycgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcXVlcnkgPSAoY29udGV4dDogQmluZEV2ZW50Q29udGV4dCB8IHVuZGVmaW5lZCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb29raWVzID0gT2JqZWN0LmtleXMoY29udGV4dCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzaWduYXR1cmVzID0gY29va2llcy5maWx0ZXIoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGUgPT09IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX0VWRU5UXTtcbiAgICAgICAgICAgICAgICB9KS5tYXAoY29va2llID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX05BTUVTUEFDRV07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzaWJsaW5ncyA9IGNvb2tpZXMuZmlsdGVyKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc2lnbmF0dXJlIG9mIHNpZ25hdHVyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzaWduYXR1cmUgPT09IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKVtDb25zdC5BRERSRVNTX05BTUVTUEFDRV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSkubWFwKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF0sIG5hbWVzcGFjZTogc2VlZFtDb25zdC5BRERSRVNTX05BTUVTUEFDRV0gfTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKC4uLnNpYmxpbmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB7IGV2ZW50TGlzdGVuZXJzLCBsaXZlRXZlbnRMaXN0ZW5lcnMgfSA9IF9ldmVudENvbnRleHRNYXA7XG4gICAgICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSk7XG4gICAgICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBldmVudCBjb29raWUgZnJvbSBldmVudCBuYW1lLCBzZWxlY3Rvciwgb3B0aW9ucyAqL1xuZnVuY3Rpb24gdG9Db29raWUoZXZlbnQ6IHN0cmluZywgbmFtZXNwYWNlOiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBjb25zdCBvcHRzID0geyAuLi5vcHRpb25zIH07XG4gICAgZGVsZXRlIG9wdHMub25jZTtcbiAgICByZXR1cm4gYCR7ZXZlbnR9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7bmFtZXNwYWNlfSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke0pTT04uc3RyaW5naWZ5KG9wdHMpfSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke3NlbGVjdG9yfWA7XG59XG5cbi8qKiBAaW50ZXJuYWwgZ2V0IGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgYnkgZWxlbWVudCBhbmQgZXZlbnQgKi9cbmZ1bmN0aW9uIGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWxlbTogRWxlbWVudEJhc2UsIGV2ZW50OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICBoYW5kbGVyczogW10sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSE7XG4gICAgY29uc3QgY29va2llID0gdG9Db29raWUoZXZlbnQsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHF1ZXJ5IGFsbCBldmVudCBhbmQgaGFuZGxlciBieSBlbGVtZW50LCBmb3IgYWxsIGBvZmYoKWAgYW5kIGBjbG9uZSh0cnVlKWAgKi9cbmZ1bmN0aW9uIGV4dHJhY3RBbGxIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgcmVtb3ZlID0gdHJ1ZSk6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10ge1xuICAgIGNvbnN0IGhhbmRsZXJzOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IG9iamVjdDsgfVtdID0gW107XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBPYmplY3Qua2V5cyhjb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzZWVkW0NvbnN0LkFERFJFU1NfRVZFTlRdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBKU09OLnBhcnNlKHNlZWRbQ29uc3QuQUREUkVTU19PUFRJT05TXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGNvbnRleHRbY29va2llXS5oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgbGl2ZUV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBuYW1lc3BhY2UgZXZlbnQgYW5kIGhhbmRsZXIgYnkgZWxlbWVudCwgZm9yIGBvZmYoYC4ke25hbWVzcGFjZX1gKWAgKi9cbmZ1bmN0aW9uIGV4dHJhY3ROYW1lc3BhY2VIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgbmFtZXNwYWNlczogc3RyaW5nKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzID0gbmFtZXNwYWNlcy5zcGxpdCgnLicpLmZpbHRlcihuID0+ICEhbik7XG4gICAgY29uc3QgbmFtZXNwYWNlRmlsdGVyID0gKGNvb2tpZTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZXNwYWNlIG9mIG5hbWVzKSB7XG4gICAgICAgICAgICBpZiAoY29va2llLmluY2x1ZGVzKGAuJHtuYW1lc3BhY2V9LmApKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogdm9pZCA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBjb29raWVzID0gT2JqZWN0LmtleXMoY29udGV4dCkuZmlsdGVyKG5hbWVzcGFjZUZpbHRlcik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBjb29raWVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFtDb25zdC5BRERSRVNTX09QVElPTlNdKTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzOiBfaGFuZGxlcnMgfSA9IGNvbnRleHRbY29va2llXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgX2hhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goeyBldmVudCwgaGFuZGxlcjogaGFuZGxlci5wcm94eSwgb3B0aW9ucyB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuXG4gICAgcmV0dXJuIGhhbmRsZXJzO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUGFyc2VFdmVudEFyZ3NSZXN1bHQge1xuICAgIHR5cGU6IHN0cmluZ1tdO1xuICAgIHNlbGVjdG9yOiBzdHJpbmc7XG4gICAgbGlzdGVuZXI6IEludGVybmFsRXZlbnRMaXN0ZW5lcjtcbiAgICBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucztcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJzZSBldmVudCBhcmdzICovXG5mdW5jdGlvbiBwYXJzZUV2ZW50QXJncyguLi5hcmdzOiB1bmtub3duW10pOiBQYXJzZUV2ZW50QXJnc1Jlc3VsdCB7XG4gICAgbGV0IFt0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgW3R5cGUsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgICAgIHNlbGVjdG9yID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHR5cGUgPSAhdHlwZSA/IFtdIDogKGlzQXJyYXkodHlwZSkgPyB0eXBlIDogW3R5cGVdKTtcbiAgICBzZWxlY3RvciA9IHNlbGVjdG9yIHx8ICcnO1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIGlmICh0cnVlID09PSBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IGNhcHR1cmU6IHRydWUgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSBhcyBQYXJzZUV2ZW50QXJnc1Jlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfbm9UcmlnZ2VyID0gWydyZXNpemUnLCAnc2Nyb2xsJ107XG5cbi8qKiBAaW50ZXJuYWwgZXZlbnQtc2hvcnRjdXQgaW1wbCAqL1xuZnVuY3Rpb24gZXZlbnRTaG9ydGN1dDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHRoaXM6IERPTUV2ZW50czxBY2Nlc3NpYmxlPFQsICgpID0+IHZvaWQ+PixcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgaGFuZGxlcj86IEV2ZW50TGlzdGVuZXIsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuKTogRE9NRXZlbnRzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSBoYW5kbGVyKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKCFfbm9UcmlnZ2VyLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZWxbbmFtZV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsW25hbWVdKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCBhcyBhbnkpLnRyaWdnZXIobmFtZSBhcyBhbnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5vbihuYW1lIGFzIGFueSwgaGFuZGxlciBhcyBhbnksIG9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFdmVudChzcmM6IEVsZW1lbnQsIGRzdDogRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdEFsbEhhbmRsZXJzKHNyYywgZmFsc2UpO1xuICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICBkc3QuYWRkRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNsb25lKClgICovXG5mdW5jdGlvbiBjbG9uZUVsZW1lbnQoZWxlbTogRWxlbWVudCwgd2l0aEV2ZW50czogYm9vbGVhbiwgZGVlcDogYm9vbGVhbik6IEVsZW1lbnQge1xuICAgIGNvbnN0IGNsb25lID0gZWxlbS5jbG9uZU5vZGUodHJ1ZSkgYXMgRWxlbWVudDtcblxuICAgIGlmICh3aXRoRXZlbnRzKSB7XG4gICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBjb25zdCBzcmNFbGVtZW50cyA9IGVsZW0ucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgY29uc3QgZHN0RWxlbWVudHMgPSBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtpbmRleF0gb2Ygc3JjRWxlbWVudHMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgY2xvbmVFdmVudChzcmNFbGVtZW50c1tpbmRleF0sIGRzdEVsZW1lbnRzW2luZGV4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjbG9uZUV2ZW50KGVsZW0sIGNsb25lKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjbG9uZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNlbGYgZXZlbnQgbWFuYWdlICovXG5mdW5jdGlvbiBoYW5kbGVTZWxmRXZlbnQ8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZjogRE9NRXZlbnRzPFRFbGVtZW50PixcbiAgICBjYWxsYmFjazogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLFxuICAgIGV2ZW50TmFtZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8RE9NRXZlbnRNYXA8SFRNTEVsZW1lbnQgfCBXaW5kb3c+PixcbiAgICBwZXJtYW5lbnQ6IGJvb2xlYW4sXG4pOiBET01FdmVudHM8VEVsZW1lbnQ+IHtcbiAgICBmdW5jdGlvbiBmaXJlQ2FsbEJhY2sodGhpczogRWxlbWVudCwgZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgaWYgKCFwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgIChzZWxmIGFzIERPTUV2ZW50czxOb2RlPikub2ZmKGV2ZW50TmFtZSwgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpc0Z1bmN0aW9uKGNhbGxiYWNrKSAmJiAoc2VsZiBhcyBET01FdmVudHM8Tm9kZT4pLm9uKGV2ZW50TmFtZSwgZmlyZUNhbGxCYWNrKTtcbiAgICByZXR1cm4gc2VsZjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qIGVzbGludC1kaXNhYmxlIEBzdHlsaXN0aWM6anMvaW5kZW50ICovXG5leHBvcnQgdHlwZSBET01FdmVudE1hcDxUPlxuICAgID0gVCBleHRlbmRzIFdpbmRvdyA/IFdpbmRvd0V2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRG9jdW1lbnQgPyBEb2N1bWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEJvZHlFbGVtZW50ID8gSFRNTEJvZHlFbGVtZW50RXZlbnRNYXAgJiBDb25uZWN0RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWVkaWFFbGVtZW50ID8gSFRNTE1lZGlhRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEVsZW1lbnQgPyBIVE1MRWxlbWVudEV2ZW50TWFwICYgQ29ubmVjdEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRWxlbWVudCA/IEVsZW1lbnRFdmVudE1hcCAmIENvbm5lY3RFdmVudE1hcFxuICAgIDogR2xvYmFsRXZlbnRIYW5kbGVyc0V2ZW50TWFwO1xuLyogZXNsaW50LWVuYWJsZSBAc3R5bGlzdGljOmpzL2luZGVudCAqL1xuXG5leHBvcnQgdHlwZSBET01FdmVudExpc3RlbmVyPFQgPSBIVE1MRWxlbWVudCwgTSBleHRlbmRzIERPTUV2ZW50TWFwPFQ+ID0gRE9NRXZlbnRNYXA8VD4+ID0gKGV2ZW50OiBNW2tleW9mIE1dLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbmV4cG9ydCB0eXBlIEV2ZW50V2l0aE5hbWVzcGFjZTxUIGV4dGVuZHMgRE9NRXZlbnRNYXA8YW55Pj4gPSBrZXlvZiBUIHwgYCR7c3RyaW5nICYga2V5b2YgVH0uJHtzdHJpbmd9YDtcbmV4cG9ydCB0eXBlIE1ha2VFdmVudFR5cGU8VCwgTT4gPSBUIGV4dGVuZHMga2V5b2YgTSA/IGtleW9mIE0gOiAoVCBleHRlbmRzIGAke3N0cmluZyAmIGtleW9mIE19LiR7aW5mZXIgQ31gID8gYCR7c3RyaW5nICYga2V5b2YgTX0uJHtDfWAgOiBuZXZlcik7XG5leHBvcnQgdHlwZSBFdmVudFR5cGU8VCBleHRlbmRzIERPTUV2ZW50TWFwPGFueT4+ID0gTWFrZUV2ZW50VHlwZTxFdmVudFdpdGhOYW1lc3BhY2U8VD4sIFQ+O1xuZXhwb3J0IHR5cGUgRXZlbnRUeXBlT3JOYW1lc3BhY2U8VCBleHRlbmRzIERPTUV2ZW50TWFwPGFueT4+ID0gRXZlbnRUeXBlPFQ+IHwgYC4ke3N0cmluZ31gO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGV2ZW50IG1hbmFnZW1lbnRzLlxuICogQGphIOOCpOODmeODs+ODiOeuoeeQhuOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRXZlbnRzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBiYXNpY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBvbiguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTGl2ZUV2ZW50KGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoZS5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXZlbnREYXRhID0gcXVlcnlFdmVudERhdGEoZSk7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChlLnRhcmdldCBhcyBFbGVtZW50IHwgbnVsbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkoJHRhcmdldFswXSwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXJlbnQgb2YgJHRhcmdldC5wYXJlbnRzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50KS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHBhcmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBxdWVyeUV2ZW50RGF0YShlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm94eSA9IHNlbGVjdG9yID8gaGFuZGxlTGl2ZUV2ZW50IDogaGFuZGxlRXZlbnQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHNwbGl0RXZlbnROYW1lc3BhY2VzKGV2ZW50KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbWJvIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHR5cGUsIG5hbWVzcGFjZSB9ID0gY29tYm87XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJlZCAmJiAhcmVnaXN0ZXJlZC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmFkZChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm94eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIG9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCkgYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub24gfCBvbn0oKSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQge0BsaW5rIERPTUV2ZW50cy5vbiB8IG9ufSgpIG9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCkgYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIHtAbGluayBET01FdmVudHMub24gfCBvbn0oKSDjgb7jgZ/jga8ge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oKSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyPzogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGFsbCBldmVudCBoYW5kbGVyLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgZnjgbnjgabjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmKCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2ZmKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhlbCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdE5hbWVzcGFjZUhhbmRsZXJzKGVsLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHJlc29sdmVFdmVudE5hbWVzcGFjZXMoZWwsIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tYm8gb2YgY29tYm9zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB0eXBlLCBuYW1lc3BhY2UgfSA9IGNvbWJvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IGhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gaGFuZGxlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHsgLy8gYmFja3dhcmQgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChoYW5kbGVyPy5saXN0ZW5lcj8ub3JpZ2luID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLnByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCDkuIDluqbjgaDjgZHlkbzjgbPlh7rjgZXjgozjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+WvvuOBl+OBpuOCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIG9uY2UoLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgLi4ub3B0aW9ucywgLi4ueyBvbmNlOiB0cnVlIH0gfTtcblxuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gb25jZUhhbmRsZXIodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgLi4uZXZlbnRBcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGV2ZW50QXJncyk7XG4gICAgICAgICAgICBzZWxmLm9mZih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICAgICAgICAgIGRlbGV0ZSBvbmNlSGFuZGxlci5vcmlnaW47XG4gICAgICAgIH1cbiAgICAgICAgb25jZUhhbmRsZXIub3JpZ2luID0gbGlzdGVuZXIgYXMgSW50ZXJuYWxFdmVudExpc3RlbmVyIHwgdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdGhpcy5vbih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhbGwgaGFuZGxlcnMgYWRkZWQgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBq+WvvuOBl+OBpuOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiAvLyB3LyBldmVudC1uYW1lc3BhY2UgYmVoYXZpb3VyXG4gICAgICogJCgnLmxpbmsnKS5vbignY2xpY2suaG9nZS5waXlvJywgKGUpID0+IHsgLi4uIH0pO1xuICAgICAqICQoJy5saW5rJykub24oJ2NsaWNrLmhvZ2UnLCAgKGUpID0+IHsgLi4uIH0pO1xuICAgICAqXG4gICAgICogJCgnLmxpbmsnKS50cmlnZ2VyKCcuaG9nZScpOyAgICAgICAgICAgLy8gY29tcGlsZSBlcnJvci4gKG5vdCBmaXJlKVxuICAgICAqICQoJy5saW5rJykudHJpZ2dlcignY2xpY2suaG9nZScpOyAgICAgIC8vIGZpcmUgYm90aC5cbiAgICAgKiAkKCcubGluaycpLnRyaWdnZXIoJ2NsaWNrLmhvZ2UucGl5bycpOyAvLyBmaXJlIG9ubHkgZmlyc3Qgb25lXG4gICAgICogYGBgXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS4gLyBgRXZlbnRgIGluc3RhbmNlIG9yIGBFdmVudGAgaW5zdGFuY2UgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJcgLyBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCuemFjeWIl1xuICAgICAqIEBwYXJhbSBldmVudERhdGFcbiAgICAgKiAgLSBgZW5gIG9wdGlvbmFsIHNlbmRpbmcgZGF0YS5cbiAgICAgKiAgLSBgamFgIOmAgeS/oeOBmeOCi+S7u+aEj+OBruODh+ODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHNlZWQ6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdIHwgRXZlbnQgfCBFdmVudFtdIHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgRXZlbnQpW10sXG4gICAgICAgIC4uLmV2ZW50RGF0YTogdW5rbm93bltdXG4gICAgKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNvbnZlcnQgPSAoYXJnOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IEV2ZW50KTogRXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGFyZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUV2ZW50KG5vcm1hbGl6ZUV2ZW50TmFtZXNwYWNlcyhhcmcpLCB7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogZXZlbnREYXRhLFxuICAgICAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnIGFzIEV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IGlzQXJyYXkoc2VlZCkgPyBzZWVkIDogW3NlZWRdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBlID0gY29udmVydChldmVudCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlckV2ZW50RGF0YShlbCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUV2ZW50RGF0YShlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgdXRpbGl0eVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgndHJhbnNpdGlvbnN0YXJ0JykuXG4gICAgICogQGphIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCd0cmFuc2l0aW9uc3RhcnQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25zdGFydGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGB0cmFuc2l0aW9uc3RhcnRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJhbnNpdGlvblN0YXJ0KGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAndHJhbnNpdGlvbnN0YXJ0JywgcGVybWFuZW50KSBhcyB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3Ige0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ3RyYW5zaXRpb25lbmQnKS5cbiAgICAgKiBAamEge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ3RyYW5zaXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gaGFuZGxlU2VsZkV2ZW50KHRoaXMsIGNhbGxiYWNrLCAndHJhbnNpdGlvbmVuZCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCdhbmltYXRpb25zdGFydCcpLlxuICAgICAqIEBqYSB7QGxpbmsgRE9NRXZlbnRzLm9uY2UgfCBvbmNlfSgnYW5pbWF0aW9uc3RhcnQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYGFuaW1hdGlvbnN0YXJ0YCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbnN0YXJ0YCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGlvblN0YXJ0KGNhbGxiYWNrOiAoZXZlbnQ6IEFuaW1hdGlvbkV2ZW50LCAuLi5hcmdzOiB1bmtub3duW10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBoYW5kbGVTZWxmRXZlbnQodGhpcywgY2FsbGJhY2ssICdhbmltYXRpb25zdGFydCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIHtAbGluayBET01FdmVudHMub25jZSB8IG9uY2V9KCdhbmltYXRpb25lbmQnKS5cbiAgICAgKiBAamEge0BsaW5rIERPTUV2ZW50cy5vbmNlIHwgb25jZX0oJ2FuaW1hdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZVNlbGZFdmVudCh0aGlzLCBjYWxsYmFjaywgJ2FuaW1hdGlvbmVuZCcsIHBlcm1hbmVudCkgYXMgdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmluZCBvbmUgb3IgdHdvIGhhbmRsZXJzIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzLCB0byBiZSBleGVjdXRlZCB3aGVuIHRoZSBgbW91c2VlbnRlcmAgYW5kIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudHMuXG4gICAgICogQGphIDHjgaTjgb7jgZ/jga8y44Gk44Gu44OP44Oz44OJ44Op44KS5oyH5a6a44GXLCDkuIDoh7TjgZfjgZ/opoHntKDjga4gYG1vdXNlZW50ZXJgLCBgbW91c2VsZWF2ZWAg44KS5qSc55+lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlckluKE91dClcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VlbnRlcmAgdGhlIGVsZW1lbnQuIDxicj5cbiAgICAgKiAgICAgICAgSWYgaGFuZGxlciBzZXQgb25seSBvbmUsIGEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQsIHRvby5cbiAgICAgKiAgLSBgamFgIGBtb3VzZWVudGVyYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIDxicj5cbiAgICAgKiAgICAgICAgICDlvJXmlbDjgYwx44Gk44Gn44GC44KL5aC05ZCILCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KC5YW844Gt44KLXG4gICAgICogQHBhcmFtIGhhbmRsZXJPdXRcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGhvdmVyKGhhbmRsZXJJbjogRE9NRXZlbnRMaXN0ZW5lciwgaGFuZGxlck91dD86IERPTUV2ZW50TGlzdGVuZXIpOiB0aGlzIHtcbiAgICAgICAgaGFuZGxlck91dCA9IGhhbmRsZXJPdXQgPz8gaGFuZGxlckluO1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZWVudGVyKGhhbmRsZXJJbikubW91c2VsZWF2ZShoYW5kbGVyT3V0KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBzaG9ydGN1dFxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xpY2soaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY2xpY2snLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGRibGNsaWNrYCBldmVudC5cbiAgICAgKiBAamEgYGRibGNsaWNrYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkYmxjbGljayhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdkYmxjbGljaycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgYmx1cmAgZXZlbnQuXG4gICAgICogQGphIGBibHVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBibHVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2JsdXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1cyhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1cycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNpbmAgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c2luYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c2luKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3VzaW4nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3Vzb3V0YCBldmVudC5cbiAgICAgKiBAamEgYGZvY3Vzb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c291dChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c291dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5dXBgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5dXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXVwKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlkb3duYCBldmVudC5cbiAgICAgKiBAamEgYGtleWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleWRvd24oaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5ZG93bicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5cHJlc3NgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5cHJlc3NgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXByZXNzKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXByZXNzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzdWJtaXRgIGV2ZW50LlxuICAgICAqIEBqYSBgc3VibWl0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdWJtaXQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc3VibWl0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjb250ZXh0bWVudWAgZXZlbnQuXG4gICAgICogQGphIGBjb250ZXh0bWVudWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGV4dG1lbnUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY29udGV4dG1lbnUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNoYW5nZWAgZXZlbnQuXG4gICAgICogQGphIGBjaGFuZ2VgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjaGFuZ2UnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZG93bihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWRvd24nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbW92ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW1vdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlbW92ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNldXBgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2V1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2V1cChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWVudGVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZW50ZXIoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VlbnRlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VsZWF2ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWxlYXZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWxlYXZlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbGVhdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3V0YCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW91dChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW91dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdmVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3ZlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdmVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlb3ZlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hzdGFydGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaHN0YXJ0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaHN0YXJ0KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoc3RhcnQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoZW5kYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoZW5kYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGVuZChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGVuZCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2htb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNobW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2htb3ZlKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNobW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hjYW5jZWxgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hjYW5jZWxgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoY2FuY2VsKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoY2FuY2VsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGByZXNpemVgIGV2ZW50LlxuICAgICAqIEBqYSBgcmVzaXplYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNpemUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgncmVzaXplJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzY3JvbGxgIGV2ZW50LlxuICAgICAqIEBqYSBgc2Nyb2xsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGwoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc2Nyb2xsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBDb3B5aW5nXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu44OH44Kj44O844OX44Kz44OU44O844KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEV2ZW50c1xuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciBldmVudCBoYW5kbGVycyBzaG91bGQgYmUgY29waWVkIGFsb25nIHdpdGggdGhlIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KC44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICogQHBhcmFtIGRlZXBcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgY2xvbmVkIGVsZW1lbnQgc2hvdWxkIGJlIGNvcGllZC5cbiAgICAgKiAgLSBgamFgIGJvb2xlYW7lgKTjgafjgIHphY3kuIvjga7opoHntKDjga7jgZnjgbnjgabjga7lrZDopoHntKDjgavlr77jgZfjgabjgoLjgIHku5jpmo/jgZfjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLjgrPjg5Tjg7zjgZnjgovjgYvjganjgYbjgYvjgpLmsbrlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUod2l0aEV2ZW50cyA9IGZhbHNlLCBkZWVwID0gZmFsc2UpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudChzZWxmKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGYubWFwKChpbmRleDogbnVtYmVyLCBlbDogVEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjbG9uZUVsZW1lbnQoZWwgYXMgTm9kZSBhcyBFbGVtZW50LCB3aXRoRXZlbnRzLCBkZWVwKSBhcyBOb2RlIGFzIFRFbGVtZW50O1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUV2ZW50cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgTnVsbGlzaCxcbiAgICBpc051bWJlcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzaWZ5LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBpc1dpbmRvd0NvbnRleHQsXG4gICAgZW5zdXJlUG9zaXRpdmVOdW1iZXIsXG4gICAgc3dpbmcsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc05vZGVEb2N1bWVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IGdldE9mZnNldFNpemUgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIHtAbGluayBET019YC5zY3JvbGxUbygpYCBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEge0BsaW5rIERPTX1gLnNjcm9sbFRvKClgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVNjcm9sbE9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogQGphIOe4puOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqL1xuICAgIHRvcD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg5qiq44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgbGVmdD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgZHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiBAamEg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqL1xuICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBzY3JvbGwgdGFyZ2V0IGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5VGFyZ2V0RWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOdWxsaXNoKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfSBlbHNlIGlmIChpc05vZGVEb2N1bWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2UgaWYgKGlzV2luZG93Q29udGV4dChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIHBhcnNlQXJncyguLi5hcmdzOiB1bmtub3duW10pOiBET01TY3JvbGxPcHRpb25zIHtcbiAgICBjb25zdCBvcHRpb25zOiBET01TY3JvbGxPcHRpb25zID0geyBlYXNpbmc6ICdzd2luZycgfTtcbiAgICBpZiAoMSA9PT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBhcmdzWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbbGVmdCwgdG9wLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFja10gPSBhcmdzO1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHtcbiAgICAgICAgICAgIHRvcCxcbiAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcHRpb25zLnRvcCAgICAgID0gZW5zdXJlUG9zaXRpdmVOdW1iZXIob3B0aW9ucy50b3ApO1xuICAgIG9wdGlvbnMubGVmdCAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmxlZnQpO1xuICAgIG9wdGlvbnMuZHVyYXRpb24gPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmR1cmF0aW9uKTtcblxuICAgIHJldHVybiBvcHRpb25zO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHNjcm9sbFRvKClgICovXG5mdW5jdGlvbiBleGVjU2Nyb2xsKGVsOiBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQsIG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICBjb25zdCB7IHRvcCwgbGVmdCwgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2sgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBpbml0aWFsVG9wID0gZWwuc2Nyb2xsVG9wO1xuICAgIGNvbnN0IGluaXRpYWxMZWZ0ID0gZWwuc2Nyb2xsTGVmdDtcbiAgICBsZXQgZW5hYmxlVG9wID0gaXNOdW1iZXIodG9wKTtcbiAgICBsZXQgZW5hYmxlTGVmdCA9IGlzTnVtYmVyKGxlZnQpO1xuXG4gICAgLy8gbm9uIGFuaW1hdGlvbiBjYXNlXG4gICAgaWYgKCFkdXJhdGlvbikge1xuICAgICAgICBsZXQgbm90aWZ5ID0gZmFsc2U7XG4gICAgICAgIGlmIChlbmFibGVUb3AgJiYgdG9wICE9PSBpbml0aWFsVG9wKSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxUb3AgPSB0b3AhO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5hYmxlTGVmdCAmJiBsZWZ0ICE9PSBpbml0aWFsTGVmdCkge1xuICAgICAgICAgICAgZWwuc2Nyb2xsTGVmdCA9IGxlZnQhO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90aWZ5ICYmIGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjTWV0cmljcyA9IChlbmFibGU6IGJvb2xlYW4sIGJhc2U6IG51bWJlciwgaW5pdGlhbFZhbHVlOiBudW1iZXIsIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IHsgbWF4OiBudW1iZXI7IG5ldzogbnVtYmVyOyBpbml0aWFsOiBudW1iZXI7IH0gPT4ge1xuICAgICAgICBpZiAoIWVuYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWF4OiAwLCBuZXc6IDAsIGluaXRpYWw6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXhWYWx1ZSA9IChlbCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pW2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdIC0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gTWF0aC5tYXgoTWF0aC5taW4oYmFzZSwgbWF4VmFsdWUpLCAwKTtcbiAgICAgICAgcmV0dXJuIHsgbWF4OiBtYXhWYWx1ZSwgbmV3OiBuZXdWYWx1ZSwgaW5pdGlhbDogaW5pdGlhbFZhbHVlIH07XG4gICAgfTtcblxuICAgIGNvbnN0IG1ldHJpY3NUb3AgPSBjYWxjTWV0cmljcyhlbmFibGVUb3AsIHRvcCEsIGluaXRpYWxUb3AsICdoZWlnaHQnKTtcbiAgICBjb25zdCBtZXRyaWNzTGVmdCA9IGNhbGNNZXRyaWNzKGVuYWJsZUxlZnQsIGxlZnQhLCBpbml0aWFsTGVmdCwgJ3dpZHRoJyk7XG5cbiAgICBpZiAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3ID09PSBtZXRyaWNzVG9wLmluaXRpYWwpIHtcbiAgICAgICAgZW5hYmxlVG9wID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChlbmFibGVMZWZ0ICYmIG1ldHJpY3NMZWZ0Lm5ldyA9PT0gbWV0cmljc0xlZnQuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVMZWZ0ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICghZW5hYmxlVG9wICYmICFlbmFibGVMZWZ0KSB7XG4gICAgICAgIC8vIG5lZWQgbm90IHRvIHNjcm9sbFxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FsY1Byb2dyZXNzID0gKHZhbHVlOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihlYXNpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZWFzaW5nKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAnbGluZWFyJyA9PT0gZWFzaW5nID8gdmFsdWUgOiBzd2luZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgZGVsdGEgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBhbmltYXRlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBlbGFwc2UgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGgubWF4KE1hdGgubWluKGVsYXBzZSAvIGR1cmF0aW9uLCAxKSwgMCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzQ29lZmYgPSBjYWxjUHJvZ3Jlc3MocHJvZ3Jlc3MpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBkZWx0YVxuICAgICAgICBpZiAoZW5hYmxlVG9wKSB7XG4gICAgICAgICAgICBkZWx0YS50b3AgPSBtZXRyaWNzVG9wLmluaXRpYWwgKyAocHJvZ3Jlc3NDb2VmZiAqIChtZXRyaWNzVG9wLm5ldyAtIG1ldHJpY3NUb3AuaW5pdGlhbCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0KSB7XG4gICAgICAgICAgICBkZWx0YS5sZWZ0ID0gbWV0cmljc0xlZnQuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NMZWZ0Lm5ldyAtIG1ldHJpY3NMZWZ0LmluaXRpYWwpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIGRvbmVcbiAgICAgICAgaWYgKChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPiBtZXRyaWNzVG9wLmluaXRpYWwgJiYgZGVsdGEudG9wID49IG1ldHJpY3NUb3AubmV3KSAgICAgICB8fCAvLyBzY3JvbGwgZG93blxuICAgICAgICAgICAgKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA8IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPD0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCB1cFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID4gbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0ID49IG1ldHJpY3NMZWZ0Lm5ldykgIHx8IC8vIHNjcm9sbCByaWdodFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3IDwgbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0IDw9IG1ldHJpY3NMZWZ0Lm5ldykgICAgIC8vIHNjcm9sbCBsZWZ0XG4gICAgICAgICkge1xuICAgICAgICAgICAgLy8gZW5zdXJlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICBlbmFibGVUb3AgJiYgKGVsLnNjcm9sbFRvcCA9IG1ldHJpY3NUb3AubmV3KTtcbiAgICAgICAgICAgIGVuYWJsZUxlZnQgJiYgKGVsLnNjcm9sbExlZnQgPSBtZXRyaWNzTGVmdC5uZXcpO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlbGVhc2UgcmVmZXJlbmNlIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgZWwgPSBudWxsITtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBkZWx0YS50b3ApO1xuICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gZGVsdGEubGVmdCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44K544Kv44Ot44O844Or44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TY3JvbGw8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl0hOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU2Nyb2xsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb246IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUb3AoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxUb3AgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgdG9wOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg5qiq5pa55ZCR44K544Kv44Ot44O844Or44GV44KM44Gf44OU44Kv44K744Or5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NpdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxMZWZ0IDogMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsVG8oe1xuICAgICAgICAgICAgICAgIGxlZnQ6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5qiq5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0geFxuICAgICAqICAtIGBlbmAgdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0geVxuICAgICAqICAtIGBlbmAgdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhcbiAgICAgICAgeDogbnVtYmVyLFxuICAgICAgICB5OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBzY3JvbGwgdmFsdWVzIGJ5IG9wdG9pbnMuXG4gICAgICogQGphIOOCquODl+OCt+ODp+ODs+OCkueUqOOBhOOBpuOCueOCr+ODreODvOODq+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhvcHRpb25zOiBET01TY3JvbGxPcHRpb25zKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUbyguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlQXJncyguLi5hcmdzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtID0gcXVlcnlUYXJnZXRFbGVtZW50KGVsKTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZXhlY1Njcm9sbChlbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVNjcm9sbCwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgRWxlbWVudEJhc2UsIERPTSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NfSBlZmZlY3QgcGFyYW1ldGVyLlxuICogQGphIHtAbGluayBET019IOOCqOODleOCp+OCr+ODiOWKueaenOOBruODkeODqeODoeODvOOCv1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RQYXJhbWV0ZXJzID0gS2V5ZnJhbWVbXSB8IFByb3BlcnR5SW5kZXhlZEtleWZyYW1lcyB8IG51bGw7XG5cbi8qKlxuICogQGVuIHtAbGluayBET019IGVmZmVjdCBvcHRpb25zLlxuICogQGphIHtAbGluayBET019IOOCqOODleOCp+OCr+ODiOWKueaenOOBruOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RPcHRpb25zID0gbnVtYmVyIHwgS2V5ZnJhbWVBbmltYXRpb25PcHRpb25zO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NfSBlZmZlY3QgY29udGV4dCBvYmplY3QuXG4gKiBAamEge0BsaW5rIERPTX0g44Gu44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiB7XG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBET019IGluc3RhbmNlIHRoYXQgY2FsbGVkIHtAbGluayBET01FZmZlY3RzLmFuaW1hdGUgfCBhbmltYXRlfSgpIG1ldGhvZC5cbiAgICAgKiBAamEge0BsaW5rIERPTUVmZmVjdHMuYW5pbWF0ZSB8IGFuaW1hdGV9KCkg44Oh44K944OD44OJ44KS5a6f6KGM44GX44GfIHtAbGluayBET019IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGRvbTogRE9NPFRFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYW5kIGBBbmltYXRpb25gIGluc3RhbmNlIG1hcCBieSBleGVjdXRpb24ge0BsaW5rIERPTUVmZmVjdHMuYW5pbWF0ZSB8IGFuaW1hdGV9KCkgbWV0aG9kIGF0IHRoaXMgdGltZS5cbiAgICAgKiBAamEg5LuK5ZueIHtAbGluayBET01FZmZlY3RzLmFuaW1hdGUgfCBhbmltYXRlfSgpIOWun+ihjOOBl+OBnyBgRWxlbWVudGAg44GoIGBBbmltYXRpb25gIOOCpOODs+OCueOCv+ODs+OCueOBruODnuODg+ODl1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGFuaW1hdGlvbnM6IE1hcDxURWxlbWVudCwgQW5pbWF0aW9uPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY3VycmVudCBmaW5pc2hlZCBQcm9taXNlIGZvciB0aGlzIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg5a++6LGh44Ki44OL44Oh44O844K344On44Oz44Gu57WC5LqG5pmC44Gr55m654Gr44GZ44KLIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICByZWFkb25seSBmaW5pc2hlZDogUHJvbWlzZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9hbmltQ29udGV4dE1hcCA9IG5ldyBXZWFrTWFwPEVsZW1lbnQsIFNldDxBbmltYXRpb24+PigpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGFuaW1hdGlvbi9lZmZlY3QgbWV0aG9kcy5cbiAqIEBqYSDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Mv44Ko44OV44Kn44Kv44OI5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FZmZlY3RzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdITogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHMgYW5pbWF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhcnQgYW5pbWF0aW9uIGJ5IGBXZWIgQW5pbWF0aW9uIEFQSWAuXG4gICAgICogQGphIGBXZWIgQW5pbWF0aW9uIEFQSWAg44KS55So44GE44Gm44Ki44OL44Oh44O844K344On44Oz44KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGUocGFyYW1zOiBET01FZmZlY3RQYXJhbWV0ZXJzLCBvcHRpb25zOiBET01FZmZlY3RPcHRpb25zKTogRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICBkb206IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD4sXG4gICAgICAgICAgICBhbmltYXRpb25zOiBuZXcgTWFwPFRFbGVtZW50LCBBbmltYXRpb24+KCksXG4gICAgICAgIH0gYXMgV3JpdGFibGU8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xuXG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmltID0gZWwuYW5pbWF0ZShwYXJhbXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsKSA/PyBuZXcgU2V0KCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5hZGQoYW5pbSk7XG4gICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLnNldChlbCwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmFuaW1hdGlvbnMuc2V0KGVsIGFzIE5vZGUgYXMgVEVsZW1lbnQsIGFuaW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5hbGwoWy4uLnJlc3VsdC5hbmltYXRpb25zLnZhbHVlcygpXS5tYXAoYW5pbSA9PiBhbmltLmZpbmlzaGVkKSkudGhlbigoKSA9PiByZXN1bHQpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLkuK3mraJcbiAgICAgKi9cbiAgICBwdWJsaWMgY2FuY2VsKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmNhbmNlbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF9hbmltQ29udGV4dE1hcC5kZWxldGUoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGaW5pc2ggY3VycmVudCBydW5uaW5nIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg54++5Zyo5a6f6KGM44GX44Gm44GE44KL44Ki44OL44Oh44O844K344On44Oz44KS57WC5LqGXG4gICAgICovXG4gICAgcHVibGljIGZpbmlzaCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYW5pbWF0aW9uIG9mIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5maW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBmaW5pc2gg44Gn44Gv56C05qOE44GX44Gq44GEXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWZmZWN0cyB1dGlsaXR5XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBmb3JjZSByZWZsb3cuXG4gICAgICogQGphIOW8t+WItuODquODleODreODvOOCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyByZWZsb3coKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzWzBdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyB1bmtub3duIGFzIERPTSkgIHtcbiAgICAgICAgICAgICAgICBub29wKGVsLm9mZnNldEhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgZm9yY2UgcmVwYWludC5cbiAgICAgKiBAamEg5by35Yi25YaN5o+P55S744KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIHJlcGFpbnQoKTogdGhpcyB7XG4gICAgICAgIGlmICh0aGlzWzBdIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyB1bmtub3duIGFzIERPTSkgIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gZWwuc3R5bGUuZGlzcGxheTtcbiAgICAgICAgICAgICAgICBlbC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGVsLnN0eWxlLmRpc3BsYXkgPSBjdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRWZmZWN0cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgQ2xhc3MsXG4gICAgbWl4aW5zLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRWxlbWVudGlmeVNlZWQsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRE9NQmFzZSB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBET01BdHRyaWJ1dGVzIH0gZnJvbSAnLi9hdHRyaWJ1dGVzJztcbmltcG9ydCB7IERPTVRyYXZlcnNpbmcgfSBmcm9tICcuL3RyYXZlcnNpbmcnO1xuaW1wb3J0IHsgRE9NTWFuaXB1bGF0aW9uIH0gZnJvbSAnLi9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHsgRE9NU3R5bGVzIH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHsgRE9NRXZlbnRzIH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHsgRE9NU2Nyb2xsIH0gZnJvbSAnLi9zY3JvbGwnO1xuaW1wb3J0IHsgRE9NRWZmZWN0cyB9IGZyb20gJy4vZWZmZWN0cyc7XG5cbnR5cGUgRE9NRmVhdHVyZXM8VCBleHRlbmRzIEVsZW1lbnRCYXNlPlxuICAgID0gRE9NQmFzZTxUPlxuICAgICYgRE9NQXR0cmlidXRlczxUPlxuICAgICYgRE9NVHJhdmVyc2luZzxUPlxuICAgICYgRE9NTWFuaXB1bGF0aW9uPFQ+XG4gICAgJiBET01TdHlsZXM8VD5cbiAgICAmIERPTUV2ZW50czxUPlxuICAgICYgRE9NU2Nyb2xsPFQ+XG4gICAgJiBET01FZmZlY3RzPFQ+O1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgRE9NfSBwbHVnaW4gbWV0aG9kIGRlZmluaXRpb24uXG4gKiBAamEge0BsaW5rIERPTX0g44OX44Op44Kw44Kk44Oz44Oh44K944OD44OJ5a6a576pXG4gKlxuICogQG5vdGVcbiAqICAtIOODl+ODqeOCsOOCpOODs+aLoeW8teWumue+qeOBr+OBk+OBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueODnuODvOOCuOOBmeOCiy5cbiAqICAtIFR5cGVTY3JpcHQgMy43IOaZgueCueOBpywgbW9kdWxlIGludGVyZmFjZSDjga7jg57jg7zjgrjjga8gbW9kdWxlIOOBruWujOWFqOOBquODkeOCueOCkuW/heimgeOBqOOBmeOCi+OBn+OCgSxcbiAqICAgIOacrOODrOODneOCuOODiOODquOBp+OBryBidW5kbGUg44GX44GfIGBkaXN0L2RvbS5kLnRzYCDjgpLmj5DkvpvjgZnjgosuXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zMzMyNlxuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTc4NDgxMzQvdHJvdWJsZS11cGRhdGluZy1hbi1pbnRlcmZhY2UtdXNpbmctZGVjbGFyYXRpb24tbWVyZ2luZ1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVBsdWdpbiB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktb2JqZWN0LXR5cGVcblxuLyoqXG4gKiBAZW4gVGhpcyBpbnRlcmZhY2UgcHJvdmlkZXMgRE9NIG9wZXJhdGlvbnMgbGlrZSBgalF1ZXJ5YCBsaWJyYXJ5LlxuICogQGphIGBqUXVlcnlgIOOBruOCiOOBhuOBqkRPTSDmk43kvZzjgpLmj5DkvpvjgZnjgovjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+IGV4dGVuZHMgRE9NRmVhdHVyZXM8VD4sIERPTVBsdWdpbiB7IH1cblxuZXhwb3J0IHR5cGUgRE9NU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IEhUTUxFbGVtZW50PiA9IEVsZW1lbnRpZnlTZWVkPFQ+IHwgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFQgOiBuZXZlcj47XG5leHBvcnQgdHlwZSBET01SZXN1bHQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4gPSBUIGV4dGVuZHMgRE9NPEVsZW1lbnRCYXNlPiA/IFQgOiAoVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gRE9NPFQ+IDogRE9NPEhUTUxFbGVtZW50Pik7XG5leHBvcnQgdHlwZSBET01JdGVyYXRlQ2FsbGJhY2s8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBib29sZWFuIHwgdm9pZDtcblxuLyoqXG4gKiBAZW4gVGhpcyBjbGFzcyBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m1xuICpcbiAqIFVOU1VQUE9SVEVEIE1FVEhPRCBMSVNUXG4gKlxuICogW1RyYXZlcnNpbmddXG4gKiAgLmFkZEJhY2soKVxuICogIC5lbmQoKVxuICpcbiAqIFtFZmZlY3RzXVxuICogLnNob3coKVxuICogLmhpZGUoKVxuICogLnRvZ2dsZSgpXG4gKiAuc3RvcCgpXG4gKiAuY2xlYXJRdWV1ZSgpXG4gKiAuZGVsYXkoKVxuICogLmRlcXVldWUoKVxuICogLmZhZGVJbigpXG4gKiAuZmFkZU91dCgpXG4gKiAuZmFkZVRvKClcbiAqIC5mYWRlVG9nZ2xlKClcbiAqIC5xdWV1ZSgpXG4gKiAuc2xpZGVEb3duKClcbiAqIC5zbGlkZVRvZ2dsZSgpXG4gKiAuc2xpZGVVcCgpXG4gKi9cbmV4cG9ydCBjbGFzcyBET01DbGFzcyBleHRlbmRzIG1peGlucyhcbiAgICBET01CYXNlLFxuICAgIERPTUF0dHJpYnV0ZXMsXG4gICAgRE9NVHJhdmVyc2luZyxcbiAgICBET01NYW5pcHVsYXRpb24sXG4gICAgRE9NU3R5bGVzLFxuICAgIERPTUV2ZW50cyxcbiAgICBET01TY3JvbGwsXG4gICAgRE9NRWZmZWN0cyxcbikge1xuICAgIC8qKlxuICAgICAqIHByaXZhdGUgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBFbGVtZW50QmFzZVtdKSB7XG4gICAgICAgIHN1cGVyKGVsZW1lbnRzKTtcbiAgICAgICAgLy8gYWxsIHNvdXJjZSBjbGFzc2VzIGhhdmUgbm8gY29uc3RydWN0b3IuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSB7QGxpbmsgRE9NfSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCB7QGxpbmsgRE9NfSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAgICAgKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKiBAcmV0dXJucyB7QGxpbmsgRE9NfSBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChzZWxlY3RvciAmJiAhY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKGlzRE9NQ2xhc3Moc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdG9yIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IERPTUNsYXNzKChlbGVtZW50aWZ5KHNlbGVjdG9yIGFzIEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0KSkpIGFzIHVua25vd24gYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKERPTUNsYXNzIGFzIHVua25vd24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSB2YWx1ZS10eXBlIGlzIHtAbGluayBET019LlxuICogQGphIHtAbGluayBET019IOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE9NQ2xhc3MoeDogdW5rbm93bik6IHggaXMgRE9NIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIERPTUNsYXNzO1xufVxuIiwiaW1wb3J0IHsgc2V0dXAgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01DbGFzcyB9IGZyb20gJy4vY2xhc3MnO1xuXG4vLyBpbml0IGZvciBzdGF0aWNcbnNldHVwKERPTUNsYXNzLnByb3RvdHlwZSwgRE9NQ2xhc3MuY3JlYXRlKTtcblxuZXhwb3J0ICogZnJvbSAnLi9leHBvcnRzJztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgZGVmYXVsdCB9IGZyb20gJy4vZXhwb3J0cyc7XG4iXSwibmFtZXMiOlsiJCIsImRvbSJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVBOztBQUVHO0FBRUgsaUJBQXdCLE1BQU0sTUFBTSxHQUFrQixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzlFLGlCQUF3QixNQUFNLFFBQVEsR0FBZ0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoRixpQkFBd0IsTUFBTSxXQUFXLEdBQWEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNuRixpQkFBd0IsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDOztBQ1Q1Rjs7QUFFRztBQWlCSDtBQUNNLFNBQVUsZUFBZSxDQUFDLENBQVUsRUFBQTtBQUN0QyxJQUFBLE9BQVEsQ0FBWSxFQUFFLE1BQU0sWUFBWSxNQUFNLENBQUM7QUFDbkQsQ0FBQztBQUVEO0FBQ2dCLFNBQUEsVUFBVSxDQUF5QixJQUF3QixFQUFFLE9B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QUFHRztJQUNJLE9BQU8sR0FBQTtBQUNWLFFBQUEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksV0FBVyxFQUFFO0FBQ2hDLFlBQUEsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFzQixFQUFHO0FBQ3RDLGdCQUFBLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO0FBQ2pDLGdCQUFBLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUMxQixnQkFBQSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7YUFDOUI7U0FDSjtBQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjtBQUNKLENBQUE7QUFFRCxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUM7O0FDbkhwRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEwQkc7QUFDRyxNQUFPLFFBQVMsU0FBUSxNQUFNLENBQ2hDLE9BQU8sRUFDUCxhQUFhLEVBQ2IsYUFBYSxFQUNiLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxVQUFVLENBQ2IsQ0FBQTtBQUNHOzs7Ozs7QUFNRztBQUNILElBQUEsV0FBQSxDQUFvQixRQUF1QixFQUFBO1FBQ3ZDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQzs7S0FFbkI7QUFFRDs7Ozs7Ozs7Ozs7OztBQWFHO0FBQ0ksSUFBQSxPQUFPLE1BQU0sQ0FBeUIsUUFBeUIsRUFBRSxPQUE2QixFQUFBO0FBQ2pHLFFBQUEsSUFBSSxRQUFRLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDdEIsWUFBQSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUN0QixnQkFBQSxPQUFPLFFBQXdCLENBQUM7YUFDbkM7U0FDSjtBQUNELFFBQUEsT0FBTyxJQUFJLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBNkIsRUFBRSxPQUFPLENBQUMsRUFBNkIsQ0FBQztLQUN4RztBQUNKLENBQUE7QUFFRDtBQUNBLG9CQUFvQixDQUFDLFFBQTRCLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBRXZFOzs7Ozs7O0FBT0c7QUFDRyxTQUFVLFVBQVUsQ0FBQyxDQUFVLEVBQUE7SUFDakMsT0FBTyxDQUFDLFlBQVksUUFBUSxDQUFDO0FBQ2pDOztBQzNJQTtBQUNBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2RvbS8ifQ==