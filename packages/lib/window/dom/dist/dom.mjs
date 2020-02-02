/*!
 * @cdp/dom 0.9.0
 *   dom utility module
 */

import { safe, isFunction, className, getGlobalNamespace, isNumber, setMixClassAttribute, isArray, isString, toTypedData, camelize, fromTypedData, noop, dasherize, classify, mixins } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においても
 * `window` オブジェクトと `document` オブジェクト等の存在を保証する
 */
/** @internal */
const win = safe(globalThis.window);
/** @internal */
const doc = safe(globalThis.document);
/** @internal */
const evt = safe(globalThis.CustomEvent);
/** @internal */
const { requestAnimationFrame } = win;

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
                if (isFunction(context.getElementById) && ('#' === selector[0]) && !/[ .<>:~]/.exec(selector)) {
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
        console.warn(`elementify(${className(seed)}, ${className(context)}), failed. [error:${e}]`);
    }
    return elements;
}
/**
 * @en Ensure positive number, if not returned `undefined`.
 * @en 正値の保証. 異なる場合 `undefined` を返却
 */
function ensurePositiveNumber(value) {
    return (isNumber(value) && 0 <= value) ? value : undefined;
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
        getGlobalNamespace('CDP_DOM_EVAL_RETURN_VALUE_BRIDGE');
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
 , @typescript-eslint/no-explicit-any
 */
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
        else if (undefined === value && isString(key)) {
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
                    data[prop] = toTypedData(dataset[prop]);
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
            const prop = camelize(key || '');
            if (prop) {
                for (const el of this) {
                    if (isNodeHTMLOrSVGElement(el)) {
                        el.dataset[prop] = fromTypedData(value);
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
   @typescript-eslint/no-explicit-any
 */
/** @internal helper for `is()` and `filter()` */
function winnow(selector, dom, validCallback, invalidCallback) {
    invalidCallback = invalidCallback || noop;
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
setMixClassAttribute(DOMManipulation, 'protoExtendsOnly');

/* eslint-disable
   @typescript-eslint/no-explicit-any
 */
/** @internal helper for `css()` */
function ensureChainCaseProperies(props) {
    const retval = {};
    for (const key in props) {
        retval[dasherize(key)] = props[key];
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
setMixClassAttribute(DOMStyles, 'protoExtendsOnly');

/* eslint-disable
   no-invalid-this
 , @typescript-eslint/no-explicit-any
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
/** @internal */
const _noTrigger = ['resize', 'scroll'];
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
            if (isString(arg)) {
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
        isFunction(callback) && self.on('transitionend', fireCallBack);
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
        isFunction(callback) && self.on('animationend', fireCallBack);
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
setMixClassAttribute(DOMEvents, 'protoExtendsOnly');

/* eslint-disable
   @typescript-eslint/no-explicit-any
 */
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
setMixClassAttribute(DOMScroll, 'protoExtendsOnly');

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
setMixClassAttribute(DOMEffects, 'protoExtendsOnly');

/* eslint-disable
   @typescript-eslint/no-explicit-any
 , @typescript-eslint/no-empty-interface
 */
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

export default dom;
export { dom };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwidXRpbHMudHMiLCJzdGF0aWMudHMiLCJiYXNlLnRzIiwiYXR0cmlidXRlcy50cyIsInRyYXZlcnNpbmcudHMiLCJtYW5pcHVsYXRpb24udHMiLCJzdHlsZXMudHMiLCJldmVudHMudHMiLCJzY3JvbGwudHMiLCJlZmZlY3RzLnRzIiwiY2xhc3MudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoJcbiAqIGB3aW5kb3dgIOOCquODluOCuOOCp+OCr+ODiOOBqCBgZG9jdW1lbnRgIOOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHdpbiA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZG9jID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGV2dCA9IHNhZmUoZ2xvYmFsVGhpcy5DdXN0b21FdmVudCk7XG4vKiogQGludGVybmFsICovXG5jb25zdCB7IHJlcXVlc3RBbmltYXRpb25GcmFtZSB9ID0gd2luO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIHdpbiBhcyB3aW5kb3csXG4gICAgZG9jIGFzIGRvY3VtZW50LFxuICAgIGV2dCBhcyBDdXN0b21FdmVudCxcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG59O1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBpc051bWJlcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzTmFtZSxcbiAgICBnZXRHbG9iYWxOYW1lc3BhY2UsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuZXhwb3J0IHR5cGUgRWxlbWVudEJhc2UgPSBOb2RlIHwgV2luZG93O1xuZXhwb3J0IHR5cGUgRWxlbWVudFJlc3VsdDxUPiA9IFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFQgOiBIVE1MRWxlbWVudDtcbmV4cG9ydCB0eXBlIFNlbGVjdG9yQmFzZSA9IE5vZGUgfCBXaW5kb3cgfCBzdHJpbmcgfCBOaWw7XG5leHBvcnQgdHlwZSBFbGVtZW50aWZ5U2VlZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gVCB8IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUW10gOiBuZXZlcikgfCBOb2RlTGlzdE9mPFQgZXh0ZW5kcyBOb2RlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIFF1ZXJ5Q29udGV4dCA9IFBhcmVudE5vZGUgJiBQYXJ0aWFsPE5vbkVsZW1lbnRQYXJlbnROb2RlPjtcblxuLyoqXG4gKiBAZW4gQ3JlYXRlIEVsZW1lbnQgYXJyYXkgZnJvbSBzZWVkIGFyZy5cbiAqIEBqYSDmjIflrprjgZXjgozjgZ8gU2VlZCDjgYvjgokgRWxlbWVudCDphY3liJfjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gc2VlZFxuICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBFbGVtZW50IGFycmF5LlxuICogIC0gYGphYCBFbGVtZW50IOmFjeWIl+OBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAqIEByZXR1cm5zIEVsZW1lbnRbXSBiYXNlZCBOb2RlIG9yIFdpbmRvdyBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGVtZW50aWZ5PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlZWQ/OiBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBFbGVtZW50UmVzdWx0PFQ+W10ge1xuICAgIGlmICghc2VlZCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29udGV4dCA9IGNvbnRleHQgfHwgZG9jdW1lbnQ7XG4gICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2Ygc2VlZCkge1xuICAgICAgICAgICAgY29uc3QgaHRtbCA9IHNlZWQudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGh0bWwuaW5jbHVkZXMoJzwnKSAmJiBodG1sLmluY2x1ZGVzKCc+JykpIHtcbiAgICAgICAgICAgICAgICAvLyBtYXJrdXBcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLnRlbXBsYXRlLmNvbnRlbnQuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IHNlZWQudHJpbSgpO1xuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0LmdldEVsZW1lbnRCeUlkKSAmJiAoJyMnID09PSBzZWxlY3RvclswXSkgJiYgIS9bIC48Pjp+XS8uZXhlYyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcHVyZSBJRCBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbCA9IGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3Iuc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgZWwgJiYgZWxlbWVudHMucHVzaChlbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgnYm9keScgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJvZHlcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChkb2N1bWVudC5ib2R5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlciBzZWxlY3RvcnNcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5jb250ZXh0LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoKHNlZWQgYXMgTm9kZSkubm9kZVR5cGUgfHwgd2luZG93ID09PSBzZWVkIGFzIFdpbmRvdykge1xuICAgICAgICAgICAgLy8gTm9kZS9lbGVtZW50LCBXaW5kb3dcbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goc2VlZCBhcyBOb2RlIGFzIEVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKDAgPCAoc2VlZCBhcyBUW10pLmxlbmd0aCAmJiAoc2VlZFswXS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWRbMF0pKSB7XG4gICAgICAgICAgICAvLyBhcnJheSBvZiBlbGVtZW50cyBvciBjb2xsZWN0aW9uIG9mIERPTVxuICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi4oc2VlZCBhcyBOb2RlW10gYXMgRWxlbWVudFtdKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgZWxlbWVudGlmeSgke2NsYXNzTmFtZShzZWVkKX0sICR7Y2xhc3NOYW1lKGNvbnRleHQpfSksIGZhaWxlZC4gW2Vycm9yOiR7ZX1dYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnRzIGFzIEVsZW1lbnRSZXN1bHQ8VD5bXTtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIHBvc2l0aXZlIG51bWJlciwgaWYgbm90IHJldHVybmVkIGB1bmRlZmluZWRgLlxuICogQGVuIOato+WApOOBruS/neiovC4g55Ww44Gq44KL5aC05ZCIIGB1bmRlZmluZWRgIOOCkui/lOWNtFxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlUG9zaXRpdmVOdW1iZXIodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBAZW4gRm9yIGVhc2luZyBgc3dpbmdgIHRpbWluZy1mdW5jdGlvbi5cbiAqIEBqYSBlYXNpbmcgYHN3aW5nYCDnlKjjgr/jgqTjg5/jg7PjgrDplqLmlbBcbiAqXG4gKiBAcmVmZXJlbmNlXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy85MjQ1MDMwL2xvb2tpbmctZm9yLWEtc3dpbmctbGlrZS1lYXNpbmctZXhwcmVzc2libGUtYm90aC13aXRoLWpxdWVyeS1hbmQtY3NzM1xuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTIwNzMwMS9qcXVlcnktZWFzaW5nLWZ1bmN0aW9ucy13aXRob3V0LXVzaW5nLWEtcGx1Z2luXG4gKlxuICogQHBhcmFtIHByb2dyZXNzIFswIC0gMV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aW5nKHByb2dyZXNzOiBudW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiAwLjUgLSAoTWF0aC5jb3MocHJvZ3Jlc3MgKiBNYXRoLlBJKSAvIDIpO1xufVxuXG4vKipcbiAqIEBlbiBbW2V2YWx1YXRlXV0oKSBvcHRpb25zLlxuICogQGphIFtbZXZhbHVhdGVdXSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2YWxPcHRpb25zIHtcbiAgICB0eXBlPzogc3RyaW5nO1xuICAgIHNyYz86IHN0cmluZztcbiAgICBub25jZT86IHN0cmluZztcbiAgICBub01vZHVsZT86IHN0cmluZztcbn1cblxuY29uc3QgX3NjcmlwdHNBdHRyczogKGtleW9mIEV2YWxPcHRpb25zKVtdID0gW1xuICAgICd0eXBlJyxcbiAgICAnc3JjJyxcbiAgICAnbm9uY2UnLFxuICAgICdub01vZHVsZScsXG5dO1xuXG4vKipcbiAqIEBlbiBUaGUgYGV2YWxgIGZ1bmN0aW9uIGJ5IHdoaWNoIHNjcmlwdCBgbm9uY2VgIGF0dHJpYnV0ZSBjb25zaWRlcmVkIHVuZGVyIHRoZSBDU1AgY29uZGl0aW9uLlxuICogQGphIENTUCDnkrDlooPjgavjgYrjgYTjgabjgrnjgq/jg6rjg5fjg4ggYG5vbmNlYCDlsZ7mgKfjgpLogIPmha7jgZfjgZ8gYGV2YWxgIOWun+ihjOmWouaVsFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGUoY29kZTogc3RyaW5nLCBvcHRpb25zPzogRWxlbWVudCB8IEV2YWxPcHRpb25zLCBjb250ZXh0PzogRG9jdW1lbnQgfCBudWxsKTogYW55IHtcbiAgICBjb25zdCBkb2M6IERvY3VtZW50ID0gY29udGV4dCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCBzY3JpcHQgPSBkb2MuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnRleHQgPSBgQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UgPSAoKCkgPT4geyByZXR1cm4gJHtjb2RlfTsgfSkoKTtgO1xuXG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIF9zY3JpcHRzQXR0cnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IG9wdGlvbnNbYXR0cl0gfHwgKChvcHRpb25zIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZSAmJiAob3B0aW9ucyBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGUoYXR0cikpO1xuICAgICAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgICAgIHNjcmlwdC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGV4ZWN1dGVcbiAgICB0cnkge1xuICAgICAgICBnZXRHbG9iYWxOYW1lc3BhY2UoJ0NEUF9ET01fRVZBTF9SRVRVUk5fVkFMVUVfQlJJREdFJyk7XG4gICAgICAgIGRvYy5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCkucGFyZW50Tm9kZSEucmVtb3ZlQ2hpbGQoc2NyaXB0KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IGdsb2JhbFRoaXNbJ0NEUF9ET01fRVZBTF9SRVRVUk5fVkFMVUVfQlJJREdFJ107XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZGVsZXRlIGdsb2JhbFRoaXNbJ0NEUF9ET01fRVZBTF9SRVRVUk5fVkFMVUVfQlJJREdFJ107XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgZWxlbWVudGlmeSxcbiAgICBldmFsdWF0ZSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01QbHVnaW4sXG4gICAgRE9NQ2xhc3MsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbn0gZnJvbSAnLi9jbGFzcyc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGRvbSB7XG4gICAgbGV0IGZuOiBET01DbGFzcztcbn1cblxudHlwZSBET01GYWN0b3J5ID0gPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKSA9PiBET01SZXN1bHQ8VD47XG5cbmxldCBfZmFjdG9yeSE6IERPTUZhY3Rvcnk7XG5cbi8qKlxuICogQGVuIENyZWF0ZSBbW0RPTV1dIGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIGNvbnRleHRcbiAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlLlxuICovXG5mdW5jdGlvbiBkb208VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBET01SZXN1bHQ8VD4ge1xuICAgIHJldHVybiBfZmFjdG9yeShzZWxlY3RvciwgY29udGV4dCk7XG59XG5cbmRvbS51dGlscyA9IHtcbiAgICBlbGVtZW50aWZ5LFxuICAgIGV2YWx1YXRlLFxufTtcblxuLyoqIEBpbnRlcm5hbCDlvqrnkrDlj4Lnhaflm57pgb/jga7jgZ/jgoHjga7pgYXlu7bjgrPjg7Pjgrnjg4jjg6njgq/jgrfjg6fjg7Pjg6Hjgr3jg4Pjg4kgKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cChmbjogRE9NQ2xhc3MsIGZhY3Rvcnk6IERPTUZhY3RvcnkpOiB2b2lkIHtcbiAgICBfZmFjdG9yeSA9IGZhY3Rvcnk7XG4gICAgZG9tLmZuID0gZm47XG59XG5cbmV4cG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tLFxufTtcbiIsImltcG9ydCB7IE5pbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3csIGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yID0gU3ltYm9sKCdjcmVhdGVJdGVyYWJsZUl0ZXJhdG9yJyk7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3Rpb24gY2xhc3Mgb2YgW1tET01DbGFzc11dLiBUaGlzIGNsYXNzIHByb3ZpZGVzIGl0ZXJhdG9yIG1ldGhvZHMuXG4gKiBAamEgW1tET01DbGFzc11dIOOBruWfuuW6leaKveixoeOCr+ODqeOCuS4gaXRlcmF0b3Ig44KS5o+Q5L6bLlxuICovXG5leHBvcnQgY2xhc3MgRE9NQmFzZTxUIGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgQXJyYXlMaWtlPFQ+LCBJdGVyYWJsZTxUPiB7XG4gICAgLyoqXG4gICAgICogQGVuIG51bWJlciBvZiBgRWxlbWVudGBcbiAgICAgKiBAamEg5YaF5YyF44GZ44KLIGBFbGVtZW50YCDmlbBcbiAgICAgKi9cbiAgICByZWFkb25seSBsZW5ndGg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYWNjZXNzb3JcbiAgICAgKiBAamEgYEVsZW1lbnRgIOOBuOOBrua3u+OBiOWtl+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBUO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiB0YXJnZXRzIGBFbGVtZW50YCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOaTjeS9nOWvvuixoeOBriBgRWxlbWVudGAg6YWN5YiXXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoZWxlbWVudHM6IFRbXSkge1xuICAgICAgICBjb25zdCBzZWxmOiBET01BY2Nlc3M8VD4gPSB0aGlzO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxlbV0gb2YgZWxlbWVudHMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBzZWxmW2luZGV4XSA9IGVsZW07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sZW5ndGggPSBlbGVtZW50cy5sZW5ndGg7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSXRlcmFibGU8VD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRvciBvZiBbW0VsZW1lbnRCYXNlXV0gdmFsdWVzIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg5qC857SN44GX44Gm44GE44KLIFtbRWxlbWVudEJhc2VdXSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFQ+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5KGluZGV4KSwgdmFsdWUoW1tFbGVtZW50QmFzZV1dKSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBUXT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gW2tleSwgdmFsdWVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXlzKGluZGV4KSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyKSA9PiBrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gdmFsdWUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGl0ZXJhdG9yIGNyZWF0ZSBmdW5jdGlvbiAqL1xuICAgIHByaXZhdGUgW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXTxSPih2YWx1ZUdlbmVyYXRvcjogKGtleTogbnVtYmVyLCB2YWx1ZTogVCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4gPSB7XG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFI+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY29udGV4dC5wb2ludGVyO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgY29udGV4dC5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBvaW50ZXIrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlR2VuZXJhdG9yKGN1cnJlbnQsIGNvbnRleHQuYmFzZVtjdXJyZW50XSksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gaXRlcmF0b3I7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBCYXNlIGludGVyZmFjZSBmb3IgRE9NIE1peGluIGNsYXNzLlxuICogQGphIERPTSBNaXhpbiDjgq/jg6njgrnjga7ml6LlrprjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01JdGVyYWJsZTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTUJhc2U8VD4+IHtcbiAgICBsZW5ndGg6IG51bWJlcjtcbiAgICBbbjogbnVtYmVyXTogVDtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VD47XG59XG5cbi8qKlxuICogQGludGVybmFsIERPTSBhY2Nlc3NcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICAgY29uc3QgZG9tOiBET01BY2Nlc3M8VEVsZW1lbnQ+ID0gdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD47XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01BY2Nlc3M8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+IGV4dGVuZHMgUGFydGlhbDxET008VD4+IHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgTm9kZWAuXG4gKiBAamEg5a++6LGh44GMIGBOb2RlYCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZShlbDogdW5rbm93bik6IGVsIGlzIE5vZGUge1xuICAgIHJldHVybiAhIShlbCAmJiAoZWwgYXMgTm9kZSkubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IGVsIGlzIEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkVMRU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBIVE1MRWxlbWVudGAg44G+44Gf44GvIGBTVkdFbGVtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgSFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxFbGVtZW50KS5kYXRhc2V0KTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBFbGVtZW50YCBvciBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRWxlbWVudGAg44G+44Gf44GvIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVRdWVyaWFibGUoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgRWxlbWVudCB8IERvY3VtZW50IHtcbiAgICByZXR1cm4gISEoZWwgJiYgKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkucXVlcnlTZWxlY3Rvcik7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIOWvvuixoeOBjCBgRG9jdW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlRG9jdW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgRG9jdW1lbnQge1xuICAgIHJldHVybiBpc05vZGUoZWwpICYmIChOb2RlLkRPQ1VNRU5UX05PREUgPT09IGVsLm5vZGVUeXBlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIFtbRE9NXV0gdGFyZ2V0IGlzIGBFbGVtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxFbGVtZW50PiB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZG9tWzBdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEgW1tET01dXSDjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50PiB7XG4gICAgcmV0dXJuIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZG9tWzBdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYERvY3VtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgRG9jdW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZURvY3VtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPERvY3VtZW50PiB7XG4gICAgcmV0dXJuIGRvY3VtZW50ID09PSBkb21bMF07XG59XG5cbi8qKlxuICogQGVuIENoZWNrIFtbRE9NXV0gdGFyZ2V0IGlzIGBXaW5kb3dgLlxuICogQGphIFtbRE9NXV0g44GMIGBXaW5kb3dgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZVdpbmRvdyhkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxXaW5kb3c+IHtcbiAgICByZXR1cm4gd2luZG93ID09PSBkb21bMF07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOaWwuXG4gKiBAamEgTmlsIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTmlsPiB7XG4gICAgcmV0dXJuICFzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgU3RyaW5nLlxuICogQGphIFN0cmluZyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmdTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBzdHJpbmc+IHtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiBzZWxlY3Rvcjtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTm9kZS5cbiAqIEBqYSBOb2RlIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlPiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIE5vZGUpLm5vZGVUeXBlO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBFbGVtZW50LlxuICogQGphIEVsZW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRWxlbWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBFbGVtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBEb2N1bWVudC5cbiAqIEBqYSBEb2N1bWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEb2N1bWVudFNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERvY3VtZW50PiB7XG4gICAgcmV0dXJuIGRvY3VtZW50ID09PSBzZWxlY3RvciBhcyBOb2RlIGFzIERvY3VtZW50O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBXaW5kb3cuXG4gKiBAamEgV2luZG93IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1dpbmRvd1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIFdpbmRvdz4ge1xuICAgIHJldHVybiB3aW5kb3cgPT09IHNlbGVjdG9yIGFzIFdpbmRvdztcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIGlzIGFibGUgdG8gaXRlcmF0ZS5cbiAqIEBqYSDotbDmn7vlj6/og73jgarjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGVMaXN0T2Y8Tm9kZT4+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgVFtdKS5sZW5ndGg7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFtbRE9NXV0uXG4gKiBAamEgW1tET01dXSDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBET00+IHtcbiAgICByZXR1cm4gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgbm9kZSBuYW1lIGlzIGFyZ3VtZW50LlxuICogQGphIE5vZGUg5ZCN44GM5byV5pWw44Gn5LiO44GI44Gf5ZCN5YmN44Go5LiA6Ie044GZ44KL44GL5Yik5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub2RlTmFtZShlbGVtOiBOb2RlIHwgbnVsbCwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGVsZW0gJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgbm9kZSBvZmZzZXQgcGFyZW50LiBUaGlzIGZ1bmN0aW9uIHdpbGwgd29yayBTVkdFbGVtZW50LCB0b28uXG4gKiBAamEgb2Zmc2V0IHBhcmVudCDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRQYXJlbnQobm9kZTogTm9kZSk6IEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAoKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudCkge1xuICAgICAgICByZXR1cm4gKG5vZGUgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFBhcmVudDtcbiAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKG5vZGUsICdzdmcnKSkge1xuICAgICAgICBjb25zdCAkc3ZnID0gJChub2RlKTtcbiAgICAgICAgY29uc3QgY3NzUHJvcHMgPSAkc3ZnLmNzcyhbJ2Rpc3BsYXknLCAncG9zaXRpb24nXSk7XG4gICAgICAgIGlmICgnbm9uZScgPT09IGNzc1Byb3BzLmRpc3BsYXkgfHwgJ2ZpeGVkJyA9PT0gY3NzUHJvcHMucG9zaXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHBhcmVudCA9ICRzdmdbMF0ucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRpc3BsYXksIHBvc2l0aW9uIH0gPSAkKHBhcmVudCkuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgICAgICAgICBpZiAoJ25vbmUnID09PSBkaXNwbGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXBvc2l0aW9uIHx8ICdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lcyxcbiAgICBUeXBlZERhdGEsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICB0b1R5cGVkRGF0YSxcbiAgICBmcm9tVHlwZWREYXRhLFxuICAgIGNhbWVsaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCB0eXBlIERPTVZhbHVlVHlwZTxULCBLID0gJ3ZhbHVlJz4gPSBUIGV4dGVuZHMgSFRNTFNlbGVjdEVsZW1lbnQgPyAoc3RyaW5nIHwgc3RyaW5nW10pIDogSyBleHRlbmRzIGtleW9mIFQgPyBUW0tdIDogdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgRE9NRGF0YSA9IFBsYWluT2JqZWN0PFR5cGVkRGF0YT47XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgdmFsKClgKi9cbmZ1bmN0aW9uIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsOiBFbGVtZW50QmFzZSk6IGVsIGlzIEhUTUxTZWxlY3RFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgJ3NlbGVjdCcgPT09IGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgJiYgKGVsIGFzIEhUTUxTZWxlY3RFbGVtZW50KS5tdWx0aXBsZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNJbnB1dEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTElucHV0RWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmIChudWxsICE9IChlbCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgYXR0cmlidXRlcyBtZXRob2RzLlxuICogQGphIOWxnuaAp+aTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NQXR0cmlidXRlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENsYXNzZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGFkZENsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGFueSBvZiB0aGUgbWF0Y2hlZCBlbGVtZW50cyBhcmUgYXNzaWduZWQgdGhlIGdpdmVuIGNsYXNzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLlsJHjgarjgY/jgajjgoLopoHntKDjgYzmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWVcbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDbGFzcyhjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSAmJiBlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG9yIHJlbW92ZSBvbmUgb3IgbW9yZSBjbGFzc2VzIGZyb20gZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICBkZXBlbmRpbmcgb24gZWl0aGVyIHRoZSBjbGFzcydzIHByZXNlbmNlIG9yIHRoZSB2YWx1ZSBvZiB0aGUgc3RhdGUgYXJndW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBrueKtuaFi+OBq+W/nOOBmOOBpiwg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS6KaB57Sg44Gr6L+95YqgL+WJiumZpOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBmb3JjZVxuICAgICAqICAtIGBlbmAgaWYgdGhpcyBhcmd1bWVudCBleGlzdHMsIHRydWU6IHRoZSBjbGFzc2VzIHNob3VsZCBiZSBhZGRlZCAvIGZhbHNlOiByZW1vdmVkLlxuICAgICAqICAtIGBqYWAg5byV5pWw44GM5a2Y5Zyo44GZ44KL5aC05ZCILCB0cnVlOiDjgq/jg6njgrnjgpLov73liqAgLyBmYWxzZTog44Kv44Op44K544KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHRvZ2dsZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGZvcmNlPzogYm9vbGVhbik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNsYXNzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LnRvZ2dsZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwcm9wZXJ0eSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBUKTogVEVsZW1lbnRbVF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgdmFsdWVcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+ODl+ODreODkeODhuOCo+WApFxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBULCB2YWx1ZTogVEVsZW1lbnRbVF0pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBwcm9wZXJ0eSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIHByb3BlcnR5LXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihrZXk6IFQgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBURWxlbWVudFtUXSk6IFRFbGVtZW50W1RdIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHByb3BlcnR5XG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gZmlyc3QgJiYgZmlyc3Rba2V5IGFzIHN0cmluZ107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgcHJvcGVydHlcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBlbFtrZXkgYXMgc3RyaW5nXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSBpbiBlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW25hbWVdID0ga2V5W25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYXR0cmlidXRlIHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgYXR0cmlidXRlIHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg5bGe5oCn5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgdmFsdWUuIGlmIGBudWxsYCBzZXQsIHJlbW92ZSBhdHRyaWJ1dGUuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlsZ7mgKflgKQuIGBudWxsYCDjgYzmjIflrprjgZXjgozjgZ/loLTlkIjliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIGF0dHJpYnV0ZS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBhdHRyaWJ1dGUtdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIGF0dHIoa2V5OiBzdHJpbmcgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIChudWxsICE9IGF0dHIpID8gYXR0ciA6IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlQXR0cihrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5IGFzIHN0cmluZywgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtdWx0aXBsZVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWwgPSBrZXlbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT09IHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIFN0cmluZyh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf5bGe5oCn44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgYXR0cmlidXRlIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44G+44Gf44Gv5bGe5oCn5ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUF0dHIobmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhdHRycyA9IGlzQXJyYXkobmFtZSkgPyBuYW1lIDogW25hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVmFsdWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEgdmFsdWUg5YCk44Gu5Y+W5b6XLiDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgc3RyaW5nYCBvciBgbnVtYmVyYCBvciBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YCkuXG4gICAgICogIC0gYGphYCBgc3RyaW5nYCDjgb7jgZ/jga8gYG51bWJlcmAg44G+44Gf44GvIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KCk6IERPTVZhbHVlVHlwZTxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIHZhbHVlIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44GmIHZhbHVlIOWApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBgc3RyaW5nYCBvciBgbnVtYmVyYCBvciBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YCkuXG4gICAgICogIC0gYGphYCBgc3RyaW5nYCDjgb7jgZ/jga8gYG51bWJlcmAg44G+44Gf44GvIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKVxuICAgICAqL1xuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlOiBET01WYWx1ZVR5cGU8VD4pOiB0aGlzO1xuXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU/OiBET01WYWx1ZVR5cGU8VD4pOiBhbnkge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc011bHRpU2VsZWN0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5zZWxlY3RlZE9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzLnB1c2gob3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ3ZhbHVlJyBpbiBlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWwgYXMgYW55KS52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gc3VwcG9ydCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiBpc011bHRpU2VsZWN0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwub3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gKHZhbHVlIGFzIHN0cmluZ1tdKS5pbmNsdWRlcyhvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0lucHV0RWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRGF0YVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWVzIGFsbCBgRE9NU3RyaW5nTWFwYCBzdG9yZSBzZXQgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBIVE1MNSBkYXRhLSog5bGe5oCn44GnIGBET01TdHJpbmdNYXBgIOOBq+agvOe0jeOBleOCjOOBn+WFqOODh+ODvOOCv+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKCk6IERPTURhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZSBhdCB0aGUgbmFtZWQgZGF0YSBzdG9yZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24sIGFzIHNldCBieSBkYXRhKGtleSwgdmFsdWUpIG9yIGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBrZXkg44Gn5oyH5a6a44GX44GfIEhUTUw1IGRhdGEtKiDlsZ7mgKflgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b3JlIGFyYml0cmFyeSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Lu75oSP44Gu44OH44O844K/44KS5qC857SNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGRhdGEgdmFsdWUgKG5vdCBvbmx5IGBzdHJpbmdgKVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5oyH5a6aICjmloflrZfliJfku6XlpJbjgoLlj5fku5jlj68pXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcsIHZhbHVlOiBUeXBlZERhdGEpOiB0aGlzO1xuXG4gICAgcHVibGljIGRhdGEoa2V5Pzogc3RyaW5nLCB2YWx1ZT86IFR5cGVkRGF0YSk6IERPTURhdGEgfCBUeXBlZERhdGEgfCB1bmRlZmluZWQgfCB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gc3VwcG9ydGVkIGRhdGFzZXQgZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGRhdGFzZXRcbiAgICAgICAgICAgIGNvbnN0IGRhdGFzZXQgPSB0aGlzWzBdLmRhdGFzZXQ7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgYWxsIGRhdGFcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBET01EYXRhID0ge307XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGRhdGFzZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGFbcHJvcF0gPSB0b1R5cGVkRGF0YShkYXRhc2V0W3Byb3BdKSBhcyBUeXBlZERhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0eXBlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB0b1R5cGVkRGF0YShkYXRhc2V0W2NhbWVsaXplKGtleSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcHJvcCA9IGNhbWVsaXplKGtleSB8fCAnJyk7XG4gICAgICAgICAgICBpZiAocHJvcCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmRhdGFzZXRbcHJvcF0gPSBmcm9tVHlwZWREYXRhKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgZGF0YS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf44OH44O844K/44KS44OH44O844K/6aCY5Z+f44GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlRGF0YShrZXk6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJvcHMgPSBpc0FycmF5KGtleSkgPyBrZXkubWFwKGsgPT4gY2FtZWxpemUoaykpIDogW2NhbWVsaXplKGtleSldO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGF0YXNldCB9ID0gZWw7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhc2V0W3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUF0dHJpYnV0ZXMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93LCBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01CYXNlLFxuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZVF1ZXJpYWJsZSxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBpc0VtcHR5U2VsZWN0b3IsXG4gICAgaXNTdHJpbmdTZWxlY3RvcixcbiAgICBpc0RvY3VtZW50U2VsZWN0b3IsXG4gICAgaXNXaW5kb3dTZWxlY3RvcixcbiAgICBpc05vZGVTZWxlY3RvcixcbiAgICBpc0l0ZXJhYmxlU2VsZWN0b3IsXG4gICAgbm9kZU5hbWUsXG4gICAgZ2V0T2Zmc2V0UGFyZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01Nb2RpZmljYXRpb25DYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gVTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpcygpYCBhbmQgYGZpbHRlcigpYCAqL1xuZnVuY3Rpb24gd2lubm93PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFU+LFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxVPixcbiAgICB2YWxpZENhbGxiYWNrOiAoZWw6IFUpID0+IGFueSxcbiAgICBpbnZhbGlkQ2FsbGJhY2s/OiAoKSA9PiBhbnksXG4pOiBhbnkge1xuICAgIGludmFsaWRDYWxsYmFjayA9IGludmFsaWRDYWxsYmFjayB8fCBub29wO1xuXG4gICAgbGV0IHJldHZhbDogYW55O1xuICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgZG9tLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3Rvci5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkubWF0Y2hlcyAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1dpbmRvd1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHdpbmRvdyA9PT0gZWwgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50ID09PSBlbCBhcyBOb2RlIGFzIERvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAsIGBwYXJlbnRzKClgIGFuZCBgc2libGluZ3MoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNoaWxkcmVuKClgLCBgcGFyZW50KClgLCBgbmV4dCgpYCBhbmQgYHByZXYoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUmV0cmlldmVOb2RlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5vZGU6IE5vZGUgfCBudWxsLCBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQpOiBub2RlIGlzIE5vZGUge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKCQobm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgbmV4dFVudGlsKClgIGFuZCBgcHJldlVudGlsKCkgKi9cbmZ1bmN0aW9uIHJldHJpZXZlU2libGluZ3M8XG4gICAgRSBleHRlbmRzIEVsZW1lbnRCYXNlLFxuICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4+KFxuICAgIHNpYmxpbmc6ICdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJyB8ICduZXh0RWxlbWVudFNpYmxpbmcnLFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxFPixcbiAgICBzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPlxuKTogRE9NPFQ+IHtcbiAgICBpZiAoIWlzVHlwZUVsZW1lbnQoZG9tKSkge1xuICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZG9tIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgIGxldCBlbGVtID0gZWxbc2libGluZ107XG4gICAgICAgIHdoaWxlIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtID0gZWxlbVtzaWJsaW5nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSB0cmF2ZXJzaW5nIG1ldGhvZHMuXG4gKiBAamEg44OI44Op44OQ44O844K544Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01UcmF2ZXJzaW5nPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWxlbWVudCBNZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgb25lIG9mIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgabphY3kuIvjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVEVsZW1lbnQgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoKTogVEVsZW1lbnRbXTtcblxuICAgIHB1YmxpYyBnZXQoaW5kZXg/OiBudW1iZXIpOiBURWxlbWVudFtdIHwgVEVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCAhPSBpbmRleCkge1xuICAgICAgICAgICAgaW5kZXggPSBNYXRoLmZsb29yKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCA8IDAgPyB0aGlzW2luZGV4ICsgdGhpcy5sZW5ndGhdIDogdGhpc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0FycmF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgYWxsIHRoZSBlbGVtZW50cyBjb250YWluZWQgaW4gdGhlIFtbRE9NXV0gc2V0LCBhcyBhbiBhcnJheS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHRvQXJyYXkoKTogVEVsZW1lbnRbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpc107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aGluIHRoZSBbW0RPTV1dIGNvbGxlY3Rpb24gcmVsYXRpdmUgdG8gaXRzIHNpYmxpbmcgZWxlbWVudHMuXG4gICAgICogQGphIFtbRE9NXV0g5YaF44Gu5pyA5Yid44Gu6KaB57Sg44GM5YWE5byf6KaB57Sg44Gu5L2V55Wq55uu44Gr5omA5bGe44GZ44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWFyY2ggZm9yIGEgZ2l2ZW4gYSBzZWxlY3RvciwgZWxlbWVudCwgb3IgW1tET01dXSBpbnN0YW5jZSBmcm9tIGFtb25nIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDphY3kuIvjga7kvZXnlarnm67jgavmiYDlsZ7jgZfjgabjgYTjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcjogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yPzogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICBsZXQgY2hpbGQ6IE5vZGUgfCBudWxsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHdoaWxlIChudWxsICE9PSAoY2hpbGQgPSBjaGlsZC5wcmV2aW91c1NpYmxpbmcpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBjaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWxlbTogVCB8IEVsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlID8gc2VsZWN0b3JbMF0gOiBzZWxlY3RvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGkgPSBbLi4udGhpc10uaW5kZXhPZihlbGVtIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIDAgPD0gaSA/IGkgOiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFRyYXZlcnNpbmdcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaXJzdCBpbiB0aGUgc2V0IGFzIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+acgOWIneOBruimgee0oOOCkiBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OBl+OBpuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1swXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmluYWwgb25lIGluIHRoZSBzZXQgYXMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyr5bC+44Gu6KaB57Sg44KSIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKHRoaXNbdGhpcy5sZW5ndGggLSAxXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IFtbRE9NXV0gaW5zdGFuY2Ugd2l0aCBlbGVtZW50cyBhZGRlZCB0byB0aGUgc2V0IGZyb20gc2VsZWN0b3IuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIOOBp+WPluW+l+OBl+OBnyBgRWxlbWVudGAg44KS6L+95Yqg44GX44Gf5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCAkYWRkID0gJChzZWxlY3RvciwgY29udGV4dCk7XG4gICAgICAgIGNvbnN0IGVsZW1zID0gbmV3IFNldChbLi4udGhpcywgLi4uJGFkZF0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbXNdIGFzIGFueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IG9mIGVsZW1lbnRzIGFnYWluc3QgYSBzZWxlY3RvciwgZWxlbWVudCwgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GZ44KL44GL56K66KqNXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHRydWVgIGlmIGF0IGxlYXN0IG9uZSBvZiB0aGVzZSBlbGVtZW50cyBtYXRjaGVzIHRoZSBnaXZlbiBhcmd1bWVudHMuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgavmjIflrprjgZfjgZ/mnaHku7bjgYzopoHntKDjga7kuIDjgaTjgafjgoLkuIDoh7TjgZnjgozjgbAgYHRydWVgIOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpczxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogYm9vbGVhbiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoKSA9PiB0cnVlLCAoKSA9PiBmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcgW1tET01dXSBpbnN0YW5jZSBpbmNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLlhoXljIXjgZnjgosg5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50czogVEVsZW1lbnRbXSA9IFtdO1xuICAgICAgICB3aW5ub3coc2VsZWN0b3IsIHRoaXMsIChlbDogVEVsZW1lbnQpID0+IHsgZWxlbWVudHMucHVzaChlbCk7IH0pO1xuICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBlbGVtZW50cyBmcm9tIHRoZSBzZXQgb2YgbWF0Y2ggdGhlIHNlbGVjdG9yIG9yIHBhc3MgdGhlIGZ1bmN0aW9uJ3MgdGVzdC5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS5YmK6Zmk44GX44Gm6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgTmV3IFtbRE9NXV0gaW5zdGFuY2UgZXhjbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5Lul5aSW44KS5YaF5YyF44GZ44KLIOaWsOimjyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBub3Q8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBuZXcgU2V0PFRFbGVtZW50PihbLi4udGhpc10pO1xuICAgICAgICB3aW5ub3coc2VsZWN0b3IsIHRoaXMsIChlbDogVEVsZW1lbnQpID0+IHsgZWxlbWVudHMuZGVsZXRlKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtZW50c10gYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGRlc2NlbmRhbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GZ44KL6KaB57Sg44KS5qSc57SiXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGZpbmQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKCFpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3RvciA9ICQoc2VsZWN0b3IpIGFzIERPTTxOb2RlPjtcbiAgICAgICAgICAgIHJldHVybiAkc2VsZWN0b3IuZmlsdGVyKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbCAhPT0gZWxlbSAmJiBlbC5jb250YWlucyhlbGVtKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1zID0gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uZWxlbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhvc2UgdGhhdCBoYXZlIGEgZGVzY2VuZGFudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZfjgZ/lrZDopoHntKDmjIHjgaTopoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBOb2RlW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKHNlbGVjdG9yLCBlbCBhcyBFbGVtZW50KSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICAgICAgdGFyZ2V0cy5wdXNoKC4uLiR0YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyKChpbmRleCwgZWxlbSkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbGVtKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgbmV3IFNldCh0YXJnZXRzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbSAhPT0gZWwgJiYgZWxlbS5jb250YWlucyhlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KSBhcyBET008Tm9kZT4gYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBQYXNzIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBtYXRjaGVkIHNldCB0aHJvdWdoIGEgZnVuY3Rpb24sIHByb2R1Y2luZyBhIG5ldyBbW0RPTV1dIGluc3RhbmNlIGNvbnRhaW5pbmcgdGhlIHJldHVybiB2YWx1ZXMuXG4gICAgICogQGphIOOCs+ODvOODq+ODkOODg+OCr+OBp+WkieabtOOBleOCjOOBn+imgee0oOOCkueUqOOBhOOBpuaWsOOBn+OBqyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuani+eviVxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBtb2RpZmljYXRpb24gZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL5aSJ5pu06Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIG1hcDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGNhbGxiYWNrOiBET01Nb2RpZmljYXRpb25DYWxsYmFjazxURWxlbWVudCwgVD4pOiBET008VD4ge1xuICAgICAgICBjb25zdCBlbGVtZW50czogVFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgdGhpcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goY2FsbGJhY2suY2FsbChlbCwgaW5kZXgsIGVsKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdGUgb3ZlciBhIFtbRE9NXV0gaW5zdGFuY2UsIGV4ZWN1dGluZyBhIGZ1bmN0aW9uIGZvciBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm44Kz44O844Or44OQ44OD44Kv6Zai5pWw44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBlYWNoKGNhbGxiYWNrOiBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgdGhpcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChmYWxzZSA9PT0gY2FsbGJhY2suY2FsbChlbCwgaW5kZXgsIGVsKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIGEgc3Vic2V0IHNwZWNpZmllZCBieSBhIHJhbmdlIG9mIGluZGljZXMuXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBleOCjOOBn+evhOWbsuOBruimgee0oOOCkuWQq+OCgCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGJlZ2luXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIGJlZ2luIHRvIGJlIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44Gu6ZaL5aeL5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICogQHBhcmFtIGVuZFxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBzdG9wIGJlaW5nIHNlbGVjdGVkLlxuICAgICAqICAtIGBqYWAg5Y+W44KK5Ye644GX44KS57WC44GI44KL55u05YmN44Gu5L2N572u44KS56S644GZIDAg44GL44KJ5aeL44G+44KL44Kk44Oz44OH44OD44Kv44K5XG4gICAgICovXG4gICAgcHVibGljIHNsaWNlKGJlZ2luPzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQoWy4uLnRoaXNdLnNsaWNlKGJlZ2luLCBlbmQpIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgb25lIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBl+OBn+imgee0oOOCkuWQq+OCgCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgZXEoaW5kZXg6IG51bWJlcik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZVxuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcy5nZXQoaW5kZXgpKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCwgZ2V0IHRoZSBmaXJzdCBlbGVtZW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IgYnkgdGVzdGluZyB0aGUgZWxlbWVudCBpdHNlbGYgYW5kIHRyYXZlcnNpbmcgdXAgdGhyb3VnaCBpdHMgYW5jZXN0b3JzIGluIHRoZSBET00gdHJlZS5cbiAgICAgKiBAamEg6ZaL5aeL6KaB57Sg44GL44KJ5pyA44KC6L+R44GE6Kaq6KaB57Sg44KS6YG45oqeLiDjgrvjg6zjgq/jgr/jg7zmjIflrprjgZfjgZ/loLTlkIgsIOODnuODg+ODgeOBmeOCi+acgOOCgui/keOBhOimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGNsb3Nlc3Q8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gc2VsZWN0b3IgfHwgIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBjb25zdCBjbG9zZXN0cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0gZWwuY2xvc2VzdChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXN0cy5hZGQoYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4uY2xvc2VzdHNdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMgYXMgYW55KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudHMoc2VsZWN0b3IpLmVxKDApIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjaGlsZHJlbiBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOWQhOimgee0oOOBruWtkOimgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44GM5oyH5a6a44GV44KM44Gf5aC05ZCI44Gv44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf57WQ5p6c44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgY2hpbGRyZW48VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShjaGlsZCwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbi5hZGQoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5jaGlsZHJlbl0pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBwYXJlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7mnIDliJ3jga7opqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBjb25zdCBwYXJlbnRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50Tm9kZSA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlKSAmJiB2YWxpZFJldHJpZXZlTm9kZShwYXJlbnROb2RlLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5hZGQocGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5wYXJlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzVW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3RvciwgRE9NIG5vZGUsIG9yIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50c1VudGlsPFxuICAgICAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgICAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgICAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4gICAgPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPik6IERPTTxUPiB7XG4gICAgICAgIGxldCBwYXJlbnRzOiBOb2RlW10gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnROb2RlID0gKGVsIGFzIE5vZGUpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB3aGlsZSAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudE5vZGUpLmlzKGZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOikh+aVsOimgee0oOOBjOWvvuixoeOBq+OBquOCi+OBqOOBjeOBr+WPjei7olxuICAgICAgICBpZiAoMSA8IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJlbnRzID0gWy4uLm5ldyBTZXQocGFyZW50cy5yZXZlcnNlKCkpXS5yZXZlcnNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJChwYXJlbnRzKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgZm9sbG93aW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIG5leHQgc2libGluZyBvbmx5IGlmIGl0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAgICAgKiBAamEg6KaB57Sg6ZuG5ZCI44Gu5ZCE6KaB57Sg44Gu55u05b6M44Gr44GC44Gf44KL5YWE5byf6KaB57Sg44KS5oq95Ye6IDxicj5cbiAgICAgKiAgICAg5p2h5Lu25byP44KS5oyH5a6a44GX44CB57WQ5p6c44K744OD44OI44GL44KJ5pu044Gr57We6L6844G/44KS6KGM44GG44GT44Go44KC5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5leHRTaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLm5leHRTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7mrKHku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5uZXh0VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgZm9sbG93aW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5qyh5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ25leHRFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IHByZWNlZGluZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TliY3jga7lhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldlNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFJldHJpZXZlTm9kZShlbGVtLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldlNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnByZXZTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7liY3ku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wcmV2VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgcHJlY2VkaW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5YmN5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnLCB0aGlzLCBzZWxlY3RvciwgZmlsdGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3JcbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf5ZCE6KaB57Sg44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2libGluZ3M8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc2libGluZyBvZiAkKHBhcmVudE5vZGUpLmNoaWxkcmVuKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNpYmxpbmcgIT09IGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2libGluZ3MuYWRkKHNpYmxpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjaGlsZHJlbiBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgdGV4dCBhbmQgY29tbWVudCBub2Rlcy5cbiAgICAgKiBAamEg44OG44Kt44K544OI44KESFRNTOOCs+ODoeODs+ODiOOCkuWQq+OCgOWtkOimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBjb250ZW50czxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVOYW1lKGVsLCAnaWZyYW1lJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKChlbCBhcyBOb2RlIGFzIEhUTUxJRnJhbWVFbGVtZW50KS5jb250ZW50RG9jdW1lbnQgYXMgTm9kZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlTmFtZShlbCwgJ3RlbXBsYXRlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudHMuYWRkKChlbCBhcyBOb2RlIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQpLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBlbC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNvbnRlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNsb3Nlc3QgYW5jZXN0b3IgZWxlbWVudCB0aGF0IGlzIHBvc2l0aW9uZWQuXG4gICAgICogQGphIOimgee0oOOBruWFiOelluimgee0oOOBpywg44K544K/44Kk44Or44Gn44Od44K444K344On44Oz5oyH5a6aKHBvc2l0aWlvbuOBjHJlbGF0aXZlLCBhYnNvbHV0ZSwgZml4ZWTjga7jgYTjgZrjgozjgYsp44GV44KM44Gm44GE44KL44KC44Gu44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldFBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBjb25zdCByb290RWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJChyb290RWxlbWVudCkgYXMgRE9NPE5vZGU+IGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBnZXRPZmZzZXRQYXJlbnQoZWwgYXMgTm9kZSkgfHwgcm9vdEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2Zmc2V0cy5hZGQob2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5vZmZzZXRzXSkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01UcmF2ZXJzaW5nLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcsIHNldE1peENsYXNzQXR0cmlidXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVEb2N1bWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBjaGVjayBIVE1MIHN0cmluZyAqL1xuZnVuY3Rpb24gaXNIVE1MU3RyaW5nKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc3ViamVjdCA9IHNyYy50cmltKCk7XG4gICAgcmV0dXJuICgnPCcgPT09IHN1YmplY3Quc2xpY2UoMCwgMSkpICYmICgnPicgPT09IHN1YmplY3Quc2xpY2UoLTEpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBhcHBlbmQoKWAsIGBwcmVwZW5kKClgLCBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGVTZXQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiBTZXQ8Tm9kZSB8IHN0cmluZz4ge1xuICAgIGNvbnN0IG5vZGVzID0gbmV3IFNldDxOb2RlIHwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgY29udGVudCBvZiBjb250ZW50cykge1xuICAgICAgICBpZiAoKGlzU3RyaW5nKGNvbnRlbnQpICYmICFpc0hUTUxTdHJpbmcoY29udGVudCkpIHx8IGlzTm9kZShjb250ZW50KSkge1xuICAgICAgICAgICAgbm9kZXMuYWRkKGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJGRvbSA9ICQoY29udGVudCBhcyBET008RWxlbWVudD4pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mICRkb20pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdHJpbmcobm9kZSkgfHwgKGlzTm9kZShub2RlKSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IG5vZGUubm9kZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGVzO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGJlZm9yZSgpYCBhbmQgYGFmdGVyKClgICAqL1xuZnVuY3Rpb24gdG9Ob2RlKG5vZGU6IE5vZGUgfCBzdHJpbmcpOiBOb2RlIHtcbiAgICBpZiAoaXNTdHJpbmcobm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBkZXRhY2goKWAgYW5kIGByZW1vdmUoKWAgKi9cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQsXG4gICAgZG9tOiBET01JdGVyYWJsZTxVPixcbiAgICBrZWVwTGlzdGVuZXI6IGJvb2xlYW5cbik6IHZvaWQge1xuICAgIGNvbnN0ICRkb206IERPTTxVPiA9IG51bGwgIT0gc2VsZWN0b3JcbiAgICAgICAgPyAoZG9tIGFzIERPTTxVPikuZmlsdGVyKHNlbGVjdG9yKVxuICAgICAgICA6IGRvbSBhcyBET008VT47XG5cbiAgICBpZiAoIWtlZXBMaXN0ZW5lcikge1xuICAgICAgICAkZG9tLm9mZigpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgIGVsLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIG1hbmlwdWxhdGlvbiBtZXRob2RzLlxuICogQGphIOODnuODi+ODlOODpeODrOODvOOCt+ODp+ODs+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NTWFuaXB1bGF0aW9uPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBJbnNpZGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIEhUTUwgY29udGVudHMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gSFRNTCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbCgpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBIVE1MIGNvbnRlbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+aMh+WumuOBl+OBnyBIVE1MIOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGh0bWxTdHJpbmdcbiAgICAgKiAgLSBgZW5gIEEgc3RyaW5nIG9mIEhUTUwgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KLIEhUTUwg5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZzogc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBodG1sKGh0bWxTdHJpbmc/OiBzdHJpbmcpOiBzdHJpbmcgfCB0aGlzIHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gaHRtbFN0cmluZykge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgPyBlbC5pbm5lckhUTUwgOiAnJztcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhodG1sU3RyaW5nKSkge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbFN0cmluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGludmFsaWQgYXJnXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgYXJnLiBodG1sU3RyaW5nIHR5cGU6JHt0eXBlb2YgaHRtbFN0cmluZ31gKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdGV4dCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgalF1ZXJ5IHJldHVybnMgdGhlIGNvbWJpbmVkIHRleHQgb2YgZWFjaCBlbGVtZW50LCBidXQgdGhpcyBtZXRob2QgbWFrZXMgb25seSBmaXJzdCBlbGVtZW50J3MgdGV4dC5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44Gu44OG44Kt44K544OI44KS5Y+W5b6XIDxicj5cbiAgICAgKiAgICAgalF1ZXJ5IOOBr+WQhOimgee0oOOBrumAo+e1kOODhuOCreOCueODiOOCkui/lOWNtOOBmeOCi+OBjOacrOODoeOCveODg+ODieOBr+WFiOmgreimgee0oOOBruOBv+OCkuWvvuixoeOBqOOBmeOCi1xuICAgICAqL1xuICAgIHB1YmxpYyB0ZXh0KCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIGNvbnRlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgc3BlY2lmaWVkIHRleHQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+aMh+WumuOBl+OBn+ODhuOCreOCueODiOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRleHRcbiAgICAgKiAgLSBgZW5gIFRoZSB0ZXh0IHRvIHNldCBhcyB0aGUgY29udGVudCBvZiBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOWGheOBq+aMv+WFpeOBmeOCi+ODhuOCreOCueODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyB0ZXh0KHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyB0ZXh0KHZhbHVlPzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBlbC50ZXh0Q29udGVudDtcbiAgICAgICAgICAgICAgICByZXR1cm4gKG51bGwgIT0gdGV4dCkgPyB0ZXh0LnRyaW0oKSA6ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZSA6IFN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCB0byB0aGUgZW5kIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+W8leaVsOOBp+aMh+WumuOBl+OBn+OCs+ODs+ODhuODs+ODhOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFwcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuYXBwZW5kKC4uLm5vZGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL6KaB57Sg44KS5LuW44Gu6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGFwcGVuZFRvPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCB0byB0aGUgYmVnaW5uaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWFiOmgreOBq+W8leaVsOOBp+aMh+WumuOBl+OBn+OCs+ODs+ODhuODs+ODhOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIHByZXBlbmQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLnByZXBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjga7lhYjpoK3jgavmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZFRvPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5wcmVwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIE91dHNpZGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIGJlZm9yZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7liY3jgavmjIflrprjgZfjgZ8gSFRNTCDjgoTopoHntKDjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBiZWZvcmU8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYmVmb3JlIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBruWJjeOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBpbnNlcnRCZWZvcmU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmJlZm9yZSh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIGFmdGVyIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruW+jOOCjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFmdGVyPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLlsuLi5jb250ZW50c10ucmV2ZXJzZSgpKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRvTm9kZShub2RlKSwgZWwubmV4dFNpYmxpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGFmdGVyIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBruW+jOOCjeOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBpbnNlcnRBZnRlcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYWZ0ZXIodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgQXJvdW5kXG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgYWxsIGVsZW1lbnRzIGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXBBbGw8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVEb2N1bWVudCh0aGlzKSB8fCBpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIE5vZGU7XG5cbiAgICAgICAgLy8gVGhlIGVsZW1lbnRzIHRvIHdyYXAgdGhlIHRhcmdldCBhcm91bmRcbiAgICAgICAgY29uc3QgJHdyYXAgPSAkKHNlbGVjdG9yLCBlbC5vd25lckRvY3VtZW50KS5lcSgwKS5jbG9uZSh0cnVlKSBhcyBET008RWxlbWVudD47XG5cbiAgICAgICAgaWYgKGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICR3cmFwLmluc2VydEJlZm9yZShlbCk7XG4gICAgICAgIH1cblxuICAgICAgICAkd3JhcC5tYXAoKGluZGV4OiBudW1iZXIsIGVsZW06IEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIHdoaWxlIChlbGVtLmZpcnN0RWxlbWVudENoaWxkKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9IGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZWxlbTtcbiAgICAgICAgfSkuYXBwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgdGhlIGNvbnRlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF5YG044KSLCDmjIflrprjgZfjgZ/liKXjgqjjg6zjg6Hjg7Pjg4jjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcElubmVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICBjb25zdCBjb250ZW50cyA9ICRlbC5jb250ZW50cygpO1xuICAgICAgICAgICAgaWYgKDAgPCBjb250ZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50cy53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsLmFwcGVuZChzZWxlY3RvciBhcyBOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpIsIOaMh+WumuOBl+OBn+WIpeimgee0oOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICAkZWwud3JhcEFsbChzZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBwYXJlbnRzIG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00sIGxlYXZpbmcgdGhlIG1hdGNoZWQgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UuXG4gICAgICogQGphIOimgee0oOOBruimquOCqOODrOODoeODs+ODiOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHVud3JhcDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgc2VsZi5wYXJlbnQoc2VsZWN0b3IpLm5vdCgnYm9keScpLmVhY2goKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAkKGVsZW0pLnJlcGxhY2VXaXRoKGVsZW0uY2hpbGROb2Rlcyk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlbW92YWxcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYWxsIGNoaWxkIG5vZGVzIG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOWGheOBruWtkOimgee0oCjjg4bjgq3jgrnjg4jjgoLlr77osaEp44KS44GZ44G544Gm5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIGVtcHR5KCk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChlbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uIFRoaXMgbWV0aG9kIGtlZXBzIGV2ZW50IGxpc3RlbmVyIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDopoHntKDjgpIgRE9NIOOBi+OCieWJiumZpC4g5YmK6Zmk5b6M44KC44Kk44OZ44Oz44OI44Oq44K544OK44Gv5pyJ5Yq5XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGRldGFjaDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIHJlbW92ZUVsZW1lbnQoc2VsZWN0b3IsIHRoaXMsIHRydWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIHJlbW92ZUVsZW1lbnQoc2VsZWN0b3IsIHRoaXMsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBSZXBsYWNlbWVudFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB3aXRoIHRoZSBwcm92aWRlZCBuZXcgY29udGVudCBhbmQgcmV0dXJuIHRoZSBzZXQgb2YgZWxlbWVudHMgdGhhdCB3YXMgcmVtb3ZlZC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GV44KM44Gf5Yil44Gu6KaB57Sg44KEIEhUTUwg44Go5beu44GX5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3Q29udGVudFxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVdpdGg8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4obmV3Q29udGVudD86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGVsZW0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGRvbSA9ICQobmV3Q29udGVudCk7XG4gICAgICAgICAgICBpZiAoMSA9PT0gJGRvbS5sZW5ndGggJiYgaXNOb2RlRWxlbWVudCgkZG9tWzBdKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkZG9tWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mICRkb20pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucmVwbGFjZVdpdGgoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIHRhcmdldCBlbGVtZW50IHdpdGggdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXjga7opoHntKDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVwbGFjZUFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkucmVwbGFjZVdpdGgodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTU1hbmlwdWxhdGlvbiwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc1N0cmluZyxcbiAgICBpc051bWJlcixcbiAgICBpc0FycmF5LFxuICAgIGNsYXNzaWZ5LFxuICAgIGRhc2hlcml6ZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZURvY3VtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBnZXRPZmZzZXRQYXJlbnQsXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgICovXG5mdW5jdGlvbiBlbnN1cmVDaGFpbkNhc2VQcm9wZXJpZXMocHJvcHM6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+KTogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJldHZhbCA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IGluIHByb3BzKSB7XG4gICAgICAgIHJldHZhbFtkYXNoZXJpemUoa2V5KV0gPSBwcm9wc1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldERlZmF1bHRWaWV3KGVsOiBFbGVtZW50KTogV2luZG93IHtcbiAgICByZXR1cm4gKGVsLm93bmVyRG9jdW1lbnQgJiYgZWwub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgfHwgd2luZG93O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCBnZXQgcHJvcHMgKi9cbmZ1bmN0aW9uIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsOiBFbGVtZW50KTogQ1NTU3R5bGVEZWNsYXJhdGlvbiB7XG4gICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICByZXR1cm4gdmlldy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGNzcyB2YWx1ZSB0byBudW1iZXIgKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWwpIHx8IDA7XG59XG5cbmNvbnN0IF9yZXNvbHZlciA9IHtcbiAgICB3aWR0aDogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgaGVpZ2h0OiBbJ3RvcCcsICdib3R0b20nXSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0UGFkZGluZyhzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgcGFkZGluZy0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0Qm9yZGVyKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBib3JkZXItJHtfcmVzb2x2ZXJbdHlwZV1bMF19LXdpZHRoYCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVsxXX0td2lkdGhgKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBzaXplIGNhbGN1dGlvbiAqL1xuZnVuY3Rpb24gZ2V0TWFyZ2luKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBtYXJnaW4tJHtfcmVzb2x2ZXJbdHlwZV1bMF19YCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVsxXX1gKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgd2lkdGgoKWAgYW5kIGBoZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZVNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSkge1xuICAgICAgICAgICAgLy8g44K544Kv44Ot44O844Or44OQ44O844KS6Zmk44GE44Gf5bmFIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiBkb21bMF0uZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50W2BjbGllbnQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIChzY3JvbGxXaWR0aCAvIHNjcm9sbEhlaWdodClcbiAgICAgICAgICAgIHJldHVybiBkb21bMF0uZG9jdW1lbnRFbGVtZW50W2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaXplIC0gKGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICByZXR1cm4gZG9tLmNzcyh0eXBlLCBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZSA6IGAke3ZhbHVlfXB4YCk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlubmVyV2lkdGgoKWAgYW5kIGBpbm5lckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlSW5uZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IoZG9tIGFzIERPTVN0eWxlczxUPiwgdHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIC8vIChjbGllbnRXaWR0aCAvIGNsaWVudEhlaWdodClcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgIC8vIHNldHRlciAobm8gcmVhY3Rpb24pXG4gICAgICAgIHJldHVybiBkb207XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIGNvbnN0IGlzVGV4dFByb3AgPSBpc1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgZG9tKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlLCBuZXdWYWwgfSA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RleHRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCB2YWx1ZSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSBpc1RleHRQcm9wID8gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSkgOiB2YWx1ZSBhcyBudW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN0eWxlLCBuZXdWYWwgfTtcbiAgICAgICAgICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICAgIGlmICgnYm9yZGVyLWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgKyBnZXRCb3JkZXIoc3R5bGUsIHR5cGUpfXB4YCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsIC0gZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgb3V0ZXJXaWR0aCgpYCBhbmQgYG91dGVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJnczogYW55W10pOiB7IGluY2x1ZGVNYXJnaW46IGJvb2xlYW47IHZhbHVlOiBudW1iZXIgfCBzdHJpbmc7IH0ge1xuICAgIGxldCBbdmFsdWUsIGluY2x1ZGVNYXJnaW5dID0gYXJncztcbiAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSAmJiAhaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIGluY2x1ZGVNYXJnaW4gPSAhIXZhbHVlO1xuICAgICAgICB2YWx1ZSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHsgaW5jbHVkZU1hcmdpbiwgdmFsdWUgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZU91dGVyU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW46IGJvb2xlYW4sIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLlkKvjgoHjgZ/luYUgKGlubmVyV2lkdGggLyBpbm5lckhlaWdodClcbiAgICAgICAgICAgIHJldHVybiBkb21bMF1bYGlubmVyJHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGdldE9mZnNldFNpemUoZWwsIHR5cGUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTWFyZ2luKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0ICsgZ2V0TWFyZ2luKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Zmc2V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hcmdpbiA9IGluY2x1ZGVNYXJnaW4gPyBnZXRNYXJnaW4oc3R5bGUsIHR5cGUpIDogMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsID0gKGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlIGFzIG51bWJlcikgLSBtYXJnaW47XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN0eWxlLCBuZXdWYWwgfTtcbiAgICAgICAgICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsIC0gZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSAtIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpfXB4YCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgYCR7bmV3VmFsfXB4YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBvc2l0aW9uKClgIGFuZCBgb2Zmc2V0KClgICovXG5mdW5jdGlvbiBnZXRPZmZzZXRQb3NpdGlvbihlbDogRWxlbWVudCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB7XG4gICAgLy8gZm9yIGRpc3BsYXkgbm9uZVxuICAgIGlmIChlbC5nZXRDbGllbnRSZWN0cygpLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogcmVjdC50b3AgKyB2aWV3LnBhZ2VZT2Zmc2V0LFxuICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyB2aWV3LnBhZ2VYT2Zmc2V0XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IG9mZnNldFtXaWR0aCB8IEhlaWdodF0uIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZVtXaWR0aCB8IEhlaWdodF0g44Gu5Y+W5b6XLiBTVkdFbGVtZW50IOOBq+OCgumBqeeUqOWPr+iDvVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T2Zmc2V0U2l6ZShlbDogSFRNTE9yU1ZHRWxlbWVudCwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICBpZiAobnVsbCAhPSAoZWwgYXMgSFRNTEVsZW1lbnQpLm9mZnNldFdpZHRoKSB7XG4gICAgICAgIC8vIChvZmZzZXRXaWR0aCAvIG9mZnNldEhlaWdodClcbiAgICAgICAgcmV0dXJuIGVsW2BvZmZzZXQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIFtOT1RFXSBTVkdFbGVtZW50IOOBryBvZmZzZXRXaWR0aCDjgYzjgrXjg53jg7zjg4jjgZXjgozjgarjgYRcbiAgICAgICAgICogICAgICAgIGdldEJvdW5kaW5nQ2xpZW50UmVjdCgpIOOBryB0cmFuc2Zvcm0g44Gr5b2x6Z+/44KS5Y+X44GR44KL44Gf44KBLFxuICAgICAgICAgKiAgICAgICAg5a6a576p6YCa44KKIGJvcmRlciwgcGFkZGluIOOCkuWQq+OCgeOBn+WApOOCkueul+WHuuOBmeOCi1xuICAgICAgICAgKi9cbiAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCBhcyBTVkdFbGVtZW50KTtcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpO1xuICAgICAgICBpZiAoJ2NvbnRlbnQtYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZSArIGdldEJvcmRlcihzdHlsZSwgdHlwZSkgKyBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIHN0eWxlIG1hbmFnZW1lbnQgbWV0aG9kcy5cbiAqIEBqYSDjgrnjgr/jgqTjg6vplqLpgKPjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVN0eWxlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFN0eWxlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY29tcHV0ZWQgc3R5bGUgcHJvcGVydGllcyBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gQ1NTIOOBq+ioreWumuOBleOCjOOBpuOBhOOCi+ODl+ODreODkeODhuOCo+WApOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSB2YWx1ZSBzdHJpbmcuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5YCk44KS5paH5a2X5YiX44Gn6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBtdWx0aXBsZSBjb21wdXRlZCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBDU1Mg44Gr6Kit5a6a44GV44KM44Gm44GE44KL44OX44Ot44OR44OG44Kj5YCk44KS6KSH5pWw5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZXNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eSBuYW1lIGFycmF5IGFzIGNoYWluLWNhY2UuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj5ZCN6YWN5YiX44KS44OB44Kn44Kk44Oz44Kx44O844K544Gn5oyH5a6aXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIENTUyBwcm9wZXJ0eS12YWx1ZSBvYmplY3QuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj44KS5qC857SN44GX44Gf44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lczogc3RyaW5nW10pOiBQbGFpbk9iamVjdDxzdHJpbmc+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBDU1MgcHJvcGVydGl5IGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOimgee0oOOBriBDU1Mg44OX44Ot44OR44OG44Kj44Gr5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3jgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHN0cmluZyB2YWx1ZSB0byBzZXQgZm9yIHRoZSBwcm9wZXJ0eS4gaWYgbnVsbCBwYXNzZWQsIHJlbW92ZSBwcm9wZXJ0eS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WApOOCkuaWh+Wtl+WIl+OBp+aMh+Wumi4gbnVsbCDmjIflrprjgafliYrpmaQuXG4gICAgICovXG4gICAgcHVibGljIGNzcyhuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgb25lIG9yIG1vcmUgQ1NTIHByb3BlcnRpZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44GuIENTUyDopIfmlbDjga7jg5fjg63jg5Hjg4bjgqPjgavlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+OCkuagvOe0jeOBl+OBn+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHB1YmxpYyBjc3MocHJvcGVydGllczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4pOiB0aGlzO1xuXG4gICAgcHVibGljIGNzcyhuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+LCB2YWx1ZT86IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgfCBQbGFpbk9iamVjdDxzdHJpbmc+IHwgdGhpcyB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyAnJyA6IHRoaXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IHByb3BlcnR5IHNpbmdsZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCkuZ2V0UHJvcGVydHlWYWx1ZShkYXNoZXJpemUobmFtZSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBzZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBkYXNoZXJpemUobmFtZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVtb3ZlID0gKG51bGwgPT09IHZhbHVlKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkobmFtZSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBtdWx0aXBsZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgRWxlbWVudDtcbiAgICAgICAgICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IHt9IGFzIFBsYWluT2JqZWN0PHN0cmluZz47XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBkYXNoZXJpemUoa2V5KTtcbiAgICAgICAgICAgICAgICBwcm9wc1trZXldID0gdmlldy5nZXRDb21wdXRlZFN0eWxlKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKHByb3BOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm9wcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBtdWx0aXBsZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IGVuc3VyZUNoYWluQ2FzZVByb3BlcmllcyhuYW1lKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlIH0gPSBlbDtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wTmFtZSBpbiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT09IHByb3BzW3Byb3BOYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlLnJlbW92ZVByb3BlcnR5KHByb3BOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUuc2V0UHJvcGVydHkocHJvcE5hbWUsIHByb3BzW3Byb3BOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgd2lkdGggZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBvciBzZXQgdGhlIHdpZHRoIG9mIGV2ZXJ5IG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6KiI566X5riI44G/5qiq5bmF44KS44OU44Kv44K744Or5Y2Y5L2N44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHdpZHRoKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyB3aWR0aCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7mqKrluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgd2lkdGgodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IodGhpcywgJ3dpZHRoJywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGhlaWdodCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/nq4vluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIENTUyBoZWlnaHQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu57im5bmF44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBoZWlnaHQodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IodGhpcywgJ2hlaWdodCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBpbmNsdWRpbmcgcGFkZGluZyBidXQgbm90IGJvcmRlci5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGlubmVyIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOaoquW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lcldpZHRoKHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZUlubmVyU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaW5uZXIgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jnuKbluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJIZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGlubmVyIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXpg6jnuKbluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJIZWlnaHQodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJIZWlnaHQodmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgcmV0dXJuIG1hbmFnZUlubmVyU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIHdpZHRoIChpbmNsdWRpbmcgcGFkZGluZywgYm9yZGVyLCBhbmQgb3B0aW9uYWxseSBtYXJnaW4pIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWklumDqOaoquW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuWPluW+ly4g44Kq44OX44K344On44Oz5oyH5a6a44Gr44KI44KK44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44Gf44KC44Gu44KC5Y+W5b6X5Y+vXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlcldpZHRoKGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIG91dGVyIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOaoquW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZywgaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIG91dGVyV2lkdGgoLi4uYXJnczogYW55W10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBvdXRlciBoZWlnaHQgKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo57im5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIG91dGVyIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoLi4uYXJnczogYW55W10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCBpbmNsdWRlTWFyZ2luLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgb2Zmc2V0IHBhcmVudC5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu6Kaq6KaB57Sg44GL44KJ44Gu55u45a++55qE44Gq6KGo56S65L2N572u44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHBvc2l0aW9uKCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgb2Zmc2V0OiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG4gICAgICAgIGxldCBwYXJlbnRPZmZzZXQgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIG1hcmdpblRvcDogbXQsIG1hcmdpbkxlZnQ6IG1sIH0gPSAkKGVsKS5jc3MoWydwb3NpdGlvbicsICdtYXJnaW5Ub3AnLCAnbWFyZ2luTGVmdCddKTtcbiAgICAgICAgY29uc3QgbWFyZ2luVG9wID0gdG9OdW1iZXIobXQpO1xuICAgICAgICBjb25zdCBtYXJnaW5MZWZ0ID0gdG9OdW1iZXIobWwpO1xuXG4gICAgICAgIC8vIHBvc2l0aW9uOmZpeGVkIGVsZW1lbnRzIGFyZSBvZmZzZXQgZnJvbSB0aGUgdmlld3BvcnQsIHdoaWNoIGl0c2VsZiBhbHdheXMgaGFzIHplcm8gb2Zmc2V0XG4gICAgICAgIGlmICgnZml4ZWQnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gQXNzdW1lIHBvc2l0aW9uOmZpeGVkIGltcGxpZXMgYXZhaWxhYmlsaXR5IG9mIGdldEJvdW5kaW5nQ2xpZW50UmVjdFxuICAgICAgICAgICAgb2Zmc2V0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBnZXRPZmZzZXRQb3NpdGlvbihlbCk7XG5cbiAgICAgICAgICAgIC8vIEFjY291bnQgZm9yIHRoZSAqcmVhbCogb2Zmc2V0IHBhcmVudCwgd2hpY2ggY2FuIGJlIHRoZSBkb2N1bWVudCBvciBpdHMgcm9vdCBlbGVtZW50XG4gICAgICAgICAgICAvLyB3aGVuIGEgc3RhdGljYWxseSBwb3NpdGlvbmVkIGVsZW1lbnQgaXMgaWRlbnRpZmllZFxuICAgICAgICAgICAgY29uc3QgZG9jID0gZWwub3duZXJEb2N1bWVudCBhcyBEb2N1bWVudDtcbiAgICAgICAgICAgIGxldCBvZmZzZXRQYXJlbnQgPSBnZXRPZmZzZXRQYXJlbnQoZWwpIHx8IGRvYy5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgICAgICBsZXQgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIHdoaWxlIChvZmZzZXRQYXJlbnQgJiZcbiAgICAgICAgICAgICAgICAob2Zmc2V0UGFyZW50ID09PSBkb2MuYm9keSB8fCBvZmZzZXRQYXJlbnQgPT09IGRvYy5kb2N1bWVudEVsZW1lbnQpICYmXG4gICAgICAgICAgICAgICAgJ3N0YXRpYycgPT09ICRvZmZzZXRQYXJlbnQuY3NzKCdwb3NpdGlvbicpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBvZmZzZXRQYXJlbnQgPSBvZmZzZXRQYXJlbnQucGFyZW50Tm9kZSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgICAgICRvZmZzZXRQYXJlbnQgPSAkKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2Zmc2V0UGFyZW50ICYmIG9mZnNldFBhcmVudCAhPT0gZWwgJiYgTm9kZS5FTEVNRU5UX05PREUgPT09IG9mZnNldFBhcmVudC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIC8vIEluY29ycG9yYXRlIGJvcmRlcnMgaW50byBpdHMgb2Zmc2V0LCBzaW5jZSB0aGV5IGFyZSBvdXRzaWRlIGl0cyBjb250ZW50IG9yaWdpblxuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBib3JkZXJUb3BXaWR0aCwgYm9yZGVyTGVmdFdpZHRoIH0gPSAkb2Zmc2V0UGFyZW50LmNzcyhbJ2JvcmRlclRvcFdpZHRoJywgJ2JvcmRlckxlZnRXaWR0aCddKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQudG9wICs9IHRvTnVtYmVyKGJvcmRlclRvcFdpZHRoKTtcbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQubGVmdCArPSB0b051bWJlcihib3JkZXJMZWZ0V2lkdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3VidHJhY3QgcGFyZW50IG9mZnNldHMgYW5kIGVsZW1lbnQgbWFyZ2luc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG9wOiBvZmZzZXQudG9wIC0gcGFyZW50T2Zmc2V0LnRvcCAtIG1hcmdpblRvcCxcbiAgICAgICAgICAgIGxlZnQ6IG9mZnNldC5sZWZ0IC0gcGFyZW50T2Zmc2V0LmxlZnQgLSBtYXJnaW5MZWZ0LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIGRvY3VtZW50IOOCkuWfuua6luOBqOOBl+OBpiwg44Oe44OD44OB44GX44Gm44GE44KL6KaB57Sg6ZuG5ZCI44GuMeOBpOebruOBruimgee0oOOBruePvuWcqOOBruW6p+aomeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgasgZG9jdW1lbnQg44KS5Z+65rqW44Gr44GX44Gf54++5Zyo5bqn5qiZ44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29vcmRpbmF0ZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBwcm9wZXJ0aWVzIGB0b3BgIGFuZCBgbGVmdGAuXG4gICAgICogIC0gYGphYCBgdG9wYCwgYGxlZnRgIOODl+ODreODkeODhuOCo+OCkuWQq+OCgOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM6IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogdGhpcztcblxuICAgIHB1YmxpYyBvZmZzZXQoY29vcmRpbmF0ZXM/OiB7IHRvcD86IG51bWJlcjsgbGVmdD86IG51bWJlcjsgfSk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfSB8IHRoaXMge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IGNvb3JkaW5hdGVzID8geyB0b3A6IDAsIGxlZnQ6IDAgfSA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBjb29yZGluYXRlcykge1xuICAgICAgICAgICAgLy8gZ2V0XG4gICAgICAgICAgICByZXR1cm4gZ2V0T2Zmc2V0UG9zaXRpb24odGhpc1swXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXRcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BzOiB7IHRvcD86IHN0cmluZzsgbGVmdD86IHN0cmluZzsgfSA9IHt9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcG9zaXRpb24sIHRvcDogY3NzVG9wLCBsZWZ0OiBjc3NMZWZ0IH0gPSAkZWwuY3NzKFsncG9zaXRpb24nLCAndG9wJywgJ2xlZnQnXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcG9zaXRpb24gZmlyc3QsIGluLWNhc2UgdG9wL2xlZnQgYXJlIHNldCBldmVuIG9uIHN0YXRpYyBlbGVtXG4gICAgICAgICAgICAgICAgaWYgKCdzdGF0aWMnID09PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjdXJPZmZzZXQgPSAkZWwub2Zmc2V0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VyUG9zaXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZWVkQ2FsY3VsYXRlUG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgID0gKCdhYnNvbHV0ZScgPT09IHBvc2l0aW9uIHx8ICdmaXhlZCcgPT09IHBvc2l0aW9uKSAmJiAoY3NzVG9wICsgY3NzTGVmdCkuaW5jbHVkZXMoJ2F1dG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5lZWRDYWxjdWxhdGVQb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRlbC5wb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdG9wOiB0b051bWJlcihjc3NUb3ApLCBsZWZ0OiB0b051bWJlcihjc3NMZWZ0KSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkoKTtcblxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLnRvcCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wcy50b3AgPSBgJHsoY29vcmRpbmF0ZXMudG9wIC0gY3VyT2Zmc2V0LnRvcCkgKyBjdXJQb3NpdGlvbi50b3B9cHhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjb29yZGluYXRlcy5sZWZ0KSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLmxlZnQgPSBgJHsoY29vcmRpbmF0ZXMubGVmdCAtIGN1ck9mZnNldC5sZWZ0KSArIGN1clBvc2l0aW9uLmxlZnR9cHhgO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRlbC5jc3MocHJvcHMgYXMgUGxhaW5PYmplY3Q8c3RyaW5nPik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU3R5bGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIG5vLWludmFsaWQtdGhpc1xuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ3VzdG9tRXZlbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NSXRlcmFibGUsIGlzVHlwZUVsZW1lbnQgfSBmcm9tICcuL2Jhc2UnO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRE9NRXZlbnRMaXN0bmVyIGV4dGVuZHMgRXZlbnRMaXN0ZW5lciB7XG4gICAgb3JpZ2luPzogRXZlbnRMaXN0ZW5lcjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEV2ZW50TGlzdGVuZXJIYW5kbGVyIHtcbiAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0bmVyO1xuICAgIHByb3h5OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEluZm8ge1xuICAgIHJlZ2lzdGVyZWQ6IFNldDxFdmVudExpc3RlbmVyPjtcbiAgICBoYW5kbGVyczogRXZlbnRMaXN0ZW5lckhhbmRsZXJbXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEJpbmRFdmVudENvbnRleHQge1xuICAgIFtjb29raWU6IHN0cmluZ106IEJpbmRJbmZvO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBDT09LSUVfU0VQQVJBVE9SID0gJ3wnLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2V2ZW50Q29udGV4dE1hcCA9IHtcbiAgICBldmVudERhdGE6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCBhbnlbXT4oKSxcbiAgICBldmVudExpc3RlbmVyczogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIEJpbmRFdmVudENvbnRleHQ+KCksXG4gICAgbGl2ZUV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbn07XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgZXZlbnQtZGF0YSBmcm9tIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5RXZlbnREYXRhKGV2ZW50OiBFdmVudCk6IGFueVtdIHtcbiAgICBjb25zdCBkYXRhID0gX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZ2V0KGV2ZW50LnRhcmdldCBhcyBFbGVtZW50KSB8fCBbXTtcbiAgICBkYXRhLnVuc2hpZnQoZXZlbnQpO1xuICAgIHJldHVybiBkYXRhO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGV2ZW50LWRhdGEgd2l0aCBlbGVtZW50ICovXG5mdW5jdGlvbiByZWdpc3RlckV2ZW50RGF0YShlbGVtOiBFbGVtZW50QmFzZSwgZXZlbnREYXRhOiBhbnlbXSk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLnNldChlbGVtLCBldmVudERhdGEpO1xufVxuXG4vKiogQGludGVybmFsIGRlbGV0ZSBldmVudC1kYXRhIGJ5IGVsZW1lbnQgKi9cbmZ1bmN0aW9uIGRlbGV0ZUV2ZW50RGF0YShlbGVtOiBFbGVtZW50QmFzZSk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmRlbGV0ZShlbGVtKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IGV2ZW50IGNvb2tpZSBmcm9tIGV2ZW50IG5hbWUsIHNlbGVjdG9yLCBvcHRpb25zICovXG5mdW5jdGlvbiB0b0Nvb2tpZShldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgZGVsZXRlIG9wdGlvbnMub25jZTtcbiAgICByZXR1cm4gYCR7ZXZlbnR9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucyl9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7c2VsZWN0b3J9YDtcbn1cblxuLyoqIEBpbnRlcm5hbCBnZXQgbGlzdGVuZXIgaGFuZGxlcnMgY29udGV4dCBieSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgZXZlbnQ6IHN0cmluZywgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMsIGVuc3VyZTogYm9vbGVhbik6IEJpbmRJbmZvIHtcbiAgICBjb25zdCBldmVudExpc3RlbmVycyA9IHNlbGVjdG9yID8gX2V2ZW50Q29udGV4dE1hcC5saXZlRXZlbnRMaXN0ZW5lcnMgOiBfZXZlbnRDb250ZXh0TWFwLmV2ZW50TGlzdGVuZXJzO1xuICAgIGlmICghZXZlbnRMaXN0ZW5lcnMuaGFzKGVsZW0pKSB7XG4gICAgICAgIGlmIChlbnN1cmUpIHtcbiAgICAgICAgICAgIGV2ZW50TGlzdGVuZXJzLnNldChlbGVtLCB7fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb250ZXh0ID0gZXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pIGFzIEJpbmRFdmVudENvbnRleHQ7XG4gICAgY29uc3QgY29va2llID0gdG9Db29raWUoZXZlbnQsIHNlbGVjdG9yLCBvcHRpb25zKTtcbiAgICBpZiAoIWNvbnRleHRbY29va2llXSkge1xuICAgICAgICBjb250ZXh0W2Nvb2tpZV0gPSB7XG4gICAgICAgICAgICByZWdpc3RlcmVkOiBuZXcgU2V0PEV2ZW50TGlzdGVuZXI+KCksXG4gICAgICAgICAgICBoYW5kbGVyczogW10sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbnRleHRbY29va2llXTtcbn1cblxuLyoqIEBpbnRlcm5hbCByZWdpc3RlciBsaXN0ZW5lciBoYW5kbGVycyBjb250ZXh0IGZyb20gZWxlbWVudCBhbmQgZXZlbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnRMaXN0ZW5lckhhbmRsZXJzKFxuICAgIGVsZW06IEVsZW1lbnRCYXNlLFxuICAgIGV2ZW50czogc3RyaW5nW10sXG4gICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lcixcbiAgICBwcm94eTogRXZlbnRMaXN0ZW5lcixcbiAgICBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBldmVudCBvZiBldmVudHMpIHtcbiAgICAgICAgY29uc3QgeyByZWdpc3RlcmVkLCBoYW5kbGVycyB9ID0gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbGVtLCBldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMsIHRydWUpO1xuICAgICAgICBpZiAocmVnaXN0ZXJlZCAmJiAhcmVnaXN0ZXJlZC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICByZWdpc3RlcmVkLmFkZChsaXN0ZW5lcik7XG4gICAgICAgICAgICBoYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICBwcm94eSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZWxlbS5hZGRFdmVudExpc3RlbmVyICYmIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgcHJveHksIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIHF1ZXJ5IGFsbCBldmVudCBhbmQgaGFuZGxlciBieSBlbGVtZW50LCBmb3IgYWxsIGBvZmYoKWAgYW5kIGBjbG9uZSh0cnVlKWAgKi9cbmZ1bmN0aW9uIGV4dHJhY3RBbGxIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgcmVtb3ZlID0gdHJ1ZSk6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogYW55OyB9W10ge1xuICAgIGNvbnN0IGhhbmRsZXJzOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IGFueTsgfVtdID0gW107XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBPYmplY3Qua2V5cyhjb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzZWVkWzBdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBKU09OLnBhcnNlKHNlZWRbMV0pO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBjb250ZXh0W2Nvb2tpZV0uaGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7IGV2ZW50LCBoYW5kbGVyOiBoYW5kbGVyLnByb3h5LCBvcHRpb25zIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpICYmIHJlbW92ZSAmJiBldmVudExpc3RlbmVycy5kZWxldGUoZWxlbSk7XG4gICAgcXVlcnkobGl2ZUV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGxpdmVFdmVudExpc3RlbmVycy5kZWxldGUoZWxlbSk7XG5cbiAgICByZXR1cm4gaGFuZGxlcnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgcGFyc2UgZXZlbnQgYXJncyAqL1xuZnVuY3Rpb24gcGFyc2VFdmVudEFyZ3MoLi4uYXJnczogYW55W10pOiB7IHR5cGU6IHN0cmluZ1tdOyBzZWxlY3Rvcjogc3RyaW5nOyBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0bmVyOyBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9uczsgfSB7XG4gICAgbGV0IFt0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgW3R5cGUsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgICAgIHNlbGVjdG9yID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHR5cGUgPSAhdHlwZSA/IFtdIDogKGlzQXJyYXkodHlwZSkgPyB0eXBlIDogW3R5cGVdKTtcbiAgICBzZWxlY3RvciA9IHNlbGVjdG9yIHx8ICcnO1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIGlmICh0cnVlID09PSBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IGNhcHR1cmU6IHRydWUgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX25vVHJpZ2dlciA9IFsncmVzaXplJywgJ3Njcm9sbCddO1xuXG4vKiogQGludGVybmFsIGV2ZW50LXNob3J0Y3V0IGltcGwgKi9cbmZ1bmN0aW9uIGV2ZW50U2hvcnRjdXQ8VCBleHRlbmRzIEVsZW1lbnRCYXNlPih0aGlzOiBET01FdmVudHM8VD4sIG5hbWU6IHN0cmluZywgaGFuZGxlcj86IEV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiBET01FdmVudHM8VD4ge1xuICAgIGlmIChudWxsID09IGhhbmRsZXIpIHtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoIV9ub1RyaWdnZXIuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihlbFtuYW1lXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxbbmFtZV0oKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGVsIGFzIGFueSkudHJpZ2dlcihuYW1lIGFzIGFueSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKG5hbWUgYXMgYW55LCBoYW5kbGVyIGFzIGFueSwgb3B0aW9ucyk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNsb25lKClgICovXG5mdW5jdGlvbiBjbG9uZUV2ZW50KHNyYzogRWxlbWVudCwgZHN0OiBFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0QWxsSGFuZGxlcnMoc3JjLCBmYWxzZSk7XG4gICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgIGRzdC5hZGRFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRWxlbWVudChlbGVtOiBFbGVtZW50LCB3aXRoRXZlbnRzOiBib29sZWFuLCBkZWVwOiBib29sZWFuKTogRWxlbWVudCB7XG4gICAgY29uc3QgY2xvbmUgPSBlbGVtLmNsb25lTm9kZSh0cnVlKSBhcyBFbGVtZW50O1xuXG4gICAgaWYgKHdpdGhFdmVudHMpIHtcbiAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIGNvbnN0IHNyY0VsZW1lbnRzID0gZWxlbS5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgICAgICBjb25zdCBkc3RFbGVtZW50cyA9IGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2luZGV4XSBvZiBzcmNFbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBjbG9uZUV2ZW50KHNyY0VsZW1lbnRzW2luZGV4XSwgZHN0RWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsb25lRXZlbnQoZWxlbSwgY2xvbmUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb25lO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCAqL1xuZXhwb3J0IHR5cGUgRE9NRXZlbnRNYXA8VD5cbiAgICA9IFQgZXh0ZW5kcyBXaW5kb3cgPyBXaW5kb3dFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIERvY3VtZW50ID8gRG9jdW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxCb2R5RWxlbWVudCA/IEhUTUxCb2R5RWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEZyYW1lU2V0RWxlbWVudCA/IEhUTUxGcmFtZVNldEVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxNYXJxdWVlRWxlbWVudCA/IEhUTUxNYXJxdWVlRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTFZpZGVvRWxlbWVudCA/IEhUTUxWaWRlb0VsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxNZWRpYUVsZW1lbnQgPyBIVE1MTWVkaWFFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MRWxlbWVudCA/IEhUTUxFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBFbGVtZW50ID8gRWxlbWVudEV2ZW50TWFwXG4gICAgOiBHbG9iYWxFdmVudEhhbmRsZXJzRXZlbnRNYXA7XG4vKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGV2ZW50IG1hbmFnZW1lbnRzLlxuICogQGphIOOCpOODmeODs+ODiOeuoeeQhuOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRXZlbnRzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIGJhc2ljXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBsaXN0ZW5lcjogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oLi4uYXJnczogYW55W10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTGl2ZUV2ZW50KGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBjb25zdCBldmVudERhdGEgPSBxdWVyeUV2ZW50RGF0YShlKTtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGUudGFyZ2V0IGFzIEVsZW1lbnQgfCBudWxsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseSgkdGFyZ2V0WzBdLCBldmVudERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhcmVudCBvZiAkdGFyZ2V0LnBhcmVudHMoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnQpLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkocGFyZW50LCBldmVudERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlRXZlbnQodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIHF1ZXJ5RXZlbnREYXRhKGUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByb3h5ID0gc2VsZWN0b3IgPyBoYW5kbGVMaXZlRXZlbnQgOiBoYW5kbGVFdmVudDtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIHJlZ2lzdGVyRXZlbnRMaXN0ZW5lckhhbmRsZXJzKGVsLCBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgcHJveHksIG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcj86IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgbGlzdGVuZXI/OiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGFsbCBldmVudCBoYW5kbGVyLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgZnjgbnjgabjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmKCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oLi4uYXJnczogYW55W10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgaWYgKGV2ZW50cy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0QWxsSGFuZGxlcnMoZWwpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsLCBldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCBoYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBoYW5kbGVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgeyAvLyBiYWNrd2FyZCBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIub3JpZ2luICYmIGhhbmRsZXIubGlzdGVuZXIub3JpZ2luID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCFsaXN0ZW5lcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlci5wcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZS4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIOS4gOW6puOBoOOBkeWRvOOBs+WHuuOBleOCjOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr5a++44GX44Gm44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oLi4uYXJnczogYW55W10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCBvcHRzID0geyAuLi5vcHRpb25zLCAuLi57IG9uY2U6IHRydWUgfSB9O1xuXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBmdW5jdGlvbiBvbmNlSGFuZGxlcih0aGlzOiBET01FdmVudHM8VEVsZW1lbnQ+LCAuLi5ldmVudEFyZ3M6IGFueVtdKTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBldmVudEFyZ3MpO1xuICAgICAgICAgICAgc2VsZi5vZmYodHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgICAgICAgICBkZWxldGUgb25jZUhhbmRsZXIub3JpZ2luO1xuICAgICAgICB9XG4gICAgICAgIG9uY2VIYW5kbGVyLm9yaWdpbiA9IGxpc3RlbmVyO1xuICAgICAgICByZXR1cm4gdGhpcy5vbih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBhbGwgaGFuZGxlcnMgYWRkZWQgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBq+WvvuOBl+OBpuOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS4gLyBgRXZlbnRgIGluc3RhbmNlIG9yIGBFdmVudGAgaW5zdGFuY2UgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJcgLyBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBgRXZlbnRgIOOCpOODs+OCueOCv+ODs+OCuemFjeWIl1xuICAgICAqIEBwYXJhbSBldmVudERhdGFcbiAgICAgKiAgLSBgZW5gIG9wdGlvbmFsIHNlbmRpbmcgZGF0YS5cbiAgICAgKiAgLSBgamFgIOmAgeS/oeOBmeOCi+S7u+aEj+OBruODh+ODvOOCv1xuICAgICAqL1xuICAgIHB1YmxpYyB0cmlnZ2VyPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHNlZWQ6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10gfCBFdmVudCB8IEV2ZW50W10gfCAoa2V5b2YgVEV2ZW50TWFwIHwgRXZlbnQpW10sXG4gICAgICAgIC4uLmV2ZW50RGF0YTogYW55W11cbiAgICApOiB0aGlzIHtcbiAgICAgICAgY29uc3QgY29udmVydCA9IChhcmc6IGtleW9mIFRFdmVudE1hcCB8IEV2ZW50KTogRXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGFyZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUV2ZW50KGFyZywge1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IGV2ZW50RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZyBhcyBFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBldmVudHMgPSBpc0FycmF5KHNlZWQpID8gc2VlZCA6IFtzZWVkXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgY29uc3QgZSA9IGNvbnZlcnQoZXZlbnQpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJFdmVudERhdGEoZWwsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgZWwuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICBkZWxldGVFdmVudERhdGEoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHV0aWxpdHlcblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3IgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUV2ZW50czxOb2RlPiBhcyBET01FdmVudHM8SFRNTEVsZW1lbnQ+O1xuICAgICAgICBmdW5jdGlvbiBmaXJlQ2FsbEJhY2sodGhpczogRWxlbWVudCwgZTogVHJhbnNpdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIGUpO1xuICAgICAgICAgICAgaWYgKCFwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9mZigndHJhbnNpdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgc2VsZi5vbigndHJhbnNpdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3IgW1tvbmNlXV0oJ2FuaW1hdGlvbmVuZCcpLlxuICAgICAqIEBqYSBbW29uY2VdXSgnYW5pbWF0aW9uZW5kJykg44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGBhbmltYXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgYW5pbWF0aW9uZW5kYCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGlvbkVuZChjYWxsYmFjazogKGV2ZW50OiBBbmltYXRpb25FdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUV2ZW50czxOb2RlPiBhcyBET01FdmVudHM8SFRNTEVsZW1lbnQ+O1xuICAgICAgICBmdW5jdGlvbiBmaXJlQ2FsbEJhY2sodGhpczogRWxlbWVudCwgZTogQW5pbWF0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgZSk7XG4gICAgICAgICAgICBpZiAoIXBlcm1hbmVudCkge1xuICAgICAgICAgICAgICAgIHNlbGYub2ZmKCdhbmltYXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlzRnVuY3Rpb24oY2FsbGJhY2spICYmIHNlbGYub24oJ2FuaW1hdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBCaW5kIG9uZSBvciB0d28gaGFuZGxlcnMgdG8gdGhlIG1hdGNoZWQgZWxlbWVudHMsIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIGBtb3VzZWVudGVyYCBhbmQgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50cy5cbiAgICAgKiBAamEgMeOBpOOBvuOBn+OBrzLjgaTjga7jg4/jg7Pjg4njg6njgpLmjIflrprjgZcsIOS4gOiHtOOBl+OBn+imgee0oOOBriBgbW91c2VlbnRlcmAsIGBtb3VzZWxlYXZlYCDjgpLmpJznn6VcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVySW4oT3V0KVxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWVudGVyYCB0aGUgZWxlbWVudC4gPGJyPlxuICAgICAqICAgICAgICBJZiBoYW5kbGVyIHNldCBvbmx5IG9uZSwgYSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudCwgdG9vLlxuICAgICAqICAtIGBqYWAgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4gPGJyPlxuICAgICAqICAgICAgICAgIOW8leaVsOOBjDHjgaTjgafjgYLjgovloLTlkIgsIGBtb3VzZWxlYXZlYCDjg4/jg7Pjg4njg6njgoLlhbzjga3jgotcbiAgICAgKiBAcGFyYW0gaGFuZGxlck91dFxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gdGhlIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIGBtb3VzZWxlYXZlYCDjg4/jg7Pjg4njg6njgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaG92ZXIoaGFuZGxlckluOiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgaGFuZGxlck91dD86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKTogdGhpcyB7XG4gICAgICAgIGhhbmRsZXJPdXQgPSBoYW5kbGVyT3V0IHx8IGhhbmRsZXJJbjtcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2VlbnRlcihoYW5kbGVySW4pLm1vdXNlbGVhdmUoaGFuZGxlck91dCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgc2hvcnRjdXRcblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2xpY2tgIGV2ZW50LlxuICAgICAqIEBqYSBgY2xpY2tgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNsaWNrKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjbGljaycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZGJsY2xpY2tgIGV2ZW50LlxuICAgICAqIEBqYSBgZGJsY2xpY2tgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGRibGNsaWNrKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdkYmxjbGljaycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgYmx1cmAgZXZlbnQuXG4gICAgICogQGphIGBibHVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBibHVyKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdibHVyJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c2AgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXMoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3VzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c2luYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzaW5gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3VzaW4oaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3VzaW4nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3Vzb3V0YCBldmVudC5cbiAgICAgKiBAamEgYGZvY3Vzb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c291dChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNvdXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleXVwYCBldmVudC5cbiAgICAgKiBAamEgYGtleXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXl1cChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5dXAnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleWRvd25gIGV2ZW50LlxuICAgICAqIEBqYSBga2V5ZG93bmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5ZG93bihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5ZG93bicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5cHJlc3NgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5cHJlc3NgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXByZXNzKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlwcmVzcycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgc3VibWl0YCBldmVudC5cbiAgICAgKiBAamEgYHN1Ym1pdGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3VibWl0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdzdWJtaXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNvbnRleHRtZW51YCBldmVudC5cbiAgICAgKiBAamEgYGNvbnRleHRtZW51YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjb250ZXh0bWVudShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY29udGV4dG1lbnUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNoYW5nZWAgZXZlbnQuXG4gICAgICogQGphIGBjaGFuZ2VgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNoYW5nZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY2hhbmdlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWRvd25gIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWRvd24oaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZG93bicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2Vtb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlbW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2Vtb3ZlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNldXBgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2V1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2V1cChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2V1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VlbnRlcmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWVudGVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWVudGVyKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWVudGVyJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWxlYXZlYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlbGVhdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlbGVhdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbGVhdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3V0YCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3V0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW91dChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VvdXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3ZlcmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW92ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3ZlcihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VvdmVyJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaHN0YXJ0YCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoc3RhcnRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoc3RhcnQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoc3RhcnQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoZW5kYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoZW5kYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGVuZChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hlbmQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNobW92ZWAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaG1vdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNobW92ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2htb3ZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaGNhbmNlbGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaGNhbmNlbGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hjYW5jZWwoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoY2FuY2VsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGByZXNpemVgIGV2ZW50LlxuICAgICAqIEBqYSBgcmVzaXplYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNpemUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Jlc2l6ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgc2Nyb2xsYCBldmVudC5cbiAgICAgKiBAamEgYHNjcm9sbGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdzY3JvbGwnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENvcHlpbmdcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBkZWVwIGNvcHkgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7jg4fjgqPjg7zjg5fjgrPjg5Tjg7zjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSB3aXRoRXZlbnRzXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIGV2ZW50IGhhbmRsZXJzIHNob3VsZCBiZSBjb3BpZWQgYWxvbmcgd2l0aCB0aGUgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgoLjgrPjg5Tjg7zjgZnjgovjgYvjganjgYbjgYvjgpLmsbrlrppcbiAgICAgKiBAcGFyYW0gZGVlcFxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciBldmVudCBoYW5kbGVycyBmb3IgYWxsIGNoaWxkcmVuIG9mIHRoZSBjbG9uZWQgZWxlbWVudCBzaG91bGQgYmUgY29waWVkLlxuICAgICAqICAtIGBqYWAgYm9vbGVhbuWApOOBp+OAgemFjeS4i+OBruimgee0oOOBruOBmeOBueOBpuOBruWtkOimgee0oOOBq+WvvuOBl+OBpuOCguOAgeS7mOmaj+OBl+OBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuOCs+ODlOODvOOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumlxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSh3aXRoRXZlbnRzID0gZmFsc2UsIGRlZXAgPSBmYWxzZSk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD4gYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHNlbGYpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2VsZi5tYXAoKGluZGV4OiBudW1iZXIsIGVsOiBURWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNsb25lRWxlbWVudChlbCBhcyBOb2RlIGFzIEVsZW1lbnQsIHdpdGhFdmVudHMsIGRlZXApIGFzIE5vZGUgYXMgVEVsZW1lbnQ7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRXZlbnRzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIE5pbCxcbiAgICBpc051bWJlcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzaWZ5LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBlbnN1cmVQb3NpdGl2ZU51bWJlcixcbiAgICBzd2luZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzTm9kZURvY3VtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgZ2V0T2Zmc2V0U2l6ZSB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCB7XG4gICAgd2luZG93LFxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcbn0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dYC5zY3JvbGxUbygpYCBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEgW1tET01dXWAuc2Nyb2xsVG8oKWAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NU2Nyb2xsT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB2ZXJ0aWNhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgdG9wPzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSBob3Jpem9udGFsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqIEBqYSDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKi9cbiAgICBsZWZ0PzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBkdXJhdGlvbj86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqIEBqYSDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICovXG4gICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBjYWxsYmFjaz86ICgpID0+IHZvaWQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHF1ZXJ5IHNjcm9sbCB0YXJnZXQgZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlUYXJnZXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH0gZWxzZSBpZiAoaXNOb2RlRG9jdW1lbnQoZWwpKSB7XG4gICAgICAgIHJldHVybiBlbC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cgPT09IGVsKSB7XG4gICAgICAgIHJldHVybiB3aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBzY3JvbGxUbygpYCAqL1xuZnVuY3Rpb24gcGFyc2VBcmdzKC4uLmFyZ3M6IGFueVtdKTogRE9NU2Nyb2xsT3B0aW9ucyB7XG4gICAgY29uc3Qgb3B0aW9uczogRE9NU2Nyb2xsT3B0aW9ucyA9IHsgZWFzaW5nOiAnc3dpbmcnIH07XG4gICAgaWYgKDEgPT09IGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgYXJnc1swXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgW2xlZnQsIHRvcCwgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2tdID0gYXJncztcbiAgICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7XG4gICAgICAgICAgICB0b3AsXG4gICAgICAgICAgICBsZWZ0LFxuICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy50b3AgICAgICA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMudG9wKTtcbiAgICBvcHRpb25zLmxlZnQgICAgID0gZW5zdXJlUG9zaXRpdmVOdW1iZXIob3B0aW9ucy5sZWZ0KTtcbiAgICBvcHRpb25zLmR1cmF0aW9uID0gZW5zdXJlUG9zaXRpdmVOdW1iZXIob3B0aW9ucy5kdXJhdGlvbik7XG5cbiAgICByZXR1cm4gb3B0aW9ucztcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBzY3JvbGxUbygpYCAqL1xuZnVuY3Rpb24gZXhlY1Njcm9sbChlbDogSFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50LCBvcHRpb25zOiBET01TY3JvbGxPcHRpb25zKTogdm9pZCB7XG4gICAgY29uc3QgeyB0b3AsIGxlZnQsIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgaW5pdGlhbFRvcCA9IGVsLnNjcm9sbFRvcDtcbiAgICBjb25zdCBpbml0aWFsTGVmdCA9IGVsLnNjcm9sbExlZnQ7XG4gICAgbGV0IGVuYWJsZVRvcCA9IGlzTnVtYmVyKHRvcCk7XG4gICAgbGV0IGVuYWJsZUxlZnQgPSBpc051bWJlcihsZWZ0KTtcblxuICAgIC8vIG5vbiBhbmltYXRpb24gY2FzZVxuICAgIGlmICghZHVyYXRpb24pIHtcbiAgICAgICAgbGV0IG5vdGlmeSA9IGZhbHNlO1xuICAgICAgICBpZiAoZW5hYmxlVG9wICYmIHRvcCAhPT0gaW5pdGlhbFRvcCkge1xuICAgICAgICAgICAgZWwuc2Nyb2xsVG9wID0gdG9wIGFzIG51bWJlcjtcbiAgICAgICAgICAgIG5vdGlmeSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuYWJsZUxlZnQgJiYgbGVmdCAhPT0gaW5pdGlhbExlZnQpIHtcbiAgICAgICAgICAgIGVsLnNjcm9sbExlZnQgPSBsZWZ0IGFzIG51bWJlcjtcbiAgICAgICAgICAgIG5vdGlmeSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vdGlmeSAmJiBpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FsY01ldHJpY3MgPSAoZW5hYmxlOiBib29sZWFuLCBiYXNlOiBudW1iZXIsIGluaXRpYWxWYWx1ZTogbnVtYmVyLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiB7IG1heDogbnVtYmVyOyBuZXc6IG51bWJlcjsgaW5pdGlhbDogbnVtYmVyOyB9ID0+IHtcbiAgICAgICAgaWYgKCFlbmFibGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IG1heDogMCwgbmV3OiAwLCBpbml0aWFsOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWF4VmFsdWUgPSBlbFtgc2Nyb2xsJHtjbGFzc2lmeSh0eXBlKX1gXSAtIGdldE9mZnNldFNpemUoZWwsIHR5cGUpO1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IE1hdGgubWF4KE1hdGgubWluKGJhc2UsIG1heFZhbHVlKSwgMCk7XG4gICAgICAgIHJldHVybiB7IG1heDogbWF4VmFsdWUsIG5ldzogbmV3VmFsdWUsIGluaXRpYWw6IGluaXRpYWxWYWx1ZSB9O1xuICAgIH07XG5cbiAgICBjb25zdCBtZXRyaWNzVG9wID0gY2FsY01ldHJpY3MoZW5hYmxlVG9wLCB0b3AgYXMgbnVtYmVyLCBpbml0aWFsVG9wLCAnaGVpZ2h0Jyk7XG4gICAgY29uc3QgbWV0cmljc0xlZnQgPSBjYWxjTWV0cmljcyhlbmFibGVMZWZ0LCBsZWZ0IGFzIG51bWJlciwgaW5pdGlhbExlZnQsICd3aWR0aCcpO1xuXG4gICAgaWYgKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA9PT0gbWV0cmljc1RvcC5pbml0aWFsKSB7XG4gICAgICAgIGVuYWJsZVRvcCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPT09IG1ldHJpY3NMZWZ0LmluaXRpYWwpIHtcbiAgICAgICAgZW5hYmxlTGVmdCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWVuYWJsZVRvcCAmJiAhZW5hYmxlTGVmdCkge1xuICAgICAgICAvLyBuZWVkIG5vdCB0byBzY3JvbGxcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGNQcm9ncmVzcyA9ICh2YWx1ZTogbnVtYmVyKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oZWFzaW5nKSkge1xuICAgICAgICAgICAgcmV0dXJuIGVhc2luZyh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJ2xpbmVhcicgPT09IGVhc2luZyA/IHZhbHVlIDogc3dpbmcodmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGRlbHRhID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgY29uc3QgYW5pbWF0ZSA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgY29uc3QgZWxhcHNlID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBNYXRoLm1heChNYXRoLm1pbihlbGFwc2UgLyBkdXJhdGlvbiwgMSksIDApO1xuICAgICAgICBjb25zdCBwcm9ncmVzc0NvZWZmID0gY2FsY1Byb2dyZXNzKHByb2dyZXNzKTtcblxuICAgICAgICAvLyB1cGRhdGUgZGVsdGFcbiAgICAgICAgaWYgKGVuYWJsZVRvcCkge1xuICAgICAgICAgICAgZGVsdGEudG9wID0gbWV0cmljc1RvcC5pbml0aWFsICsgKHByb2dyZXNzQ29lZmYgKiAobWV0cmljc1RvcC5uZXcgLSBtZXRyaWNzVG9wLmluaXRpYWwpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5hYmxlTGVmdCkge1xuICAgICAgICAgICAgZGVsdGEubGVmdCA9IG1ldHJpY3NMZWZ0LmluaXRpYWwgKyAocHJvZ3Jlc3NDb2VmZiAqIChtZXRyaWNzTGVmdC5uZXcgLSBtZXRyaWNzTGVmdC5pbml0aWFsKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjaGVjayBkb25lXG4gICAgICAgIGlmICgoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3ID4gbWV0cmljc1RvcC5pbml0aWFsICYmIGRlbHRhLnRvcCA+PSBtZXRyaWNzVG9wLm5ldykgICAgICAgfHwgLy8gc2Nyb2xsIGRvd25cbiAgICAgICAgICAgIChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPCBtZXRyaWNzVG9wLmluaXRpYWwgJiYgZGVsdGEudG9wIDw9IG1ldHJpY3NUb3AubmV3KSAgICAgICB8fCAvLyBzY3JvbGwgdXBcbiAgICAgICAgICAgIChlbmFibGVMZWZ0ICYmIG1ldHJpY3NMZWZ0Lm5ldyA+IG1ldHJpY3NMZWZ0LmluaXRpYWwgJiYgZGVsdGEubGVmdCA+PSBtZXRyaWNzTGVmdC5uZXcpICB8fCAvLyBzY3JvbGwgcmlnaHRcbiAgICAgICAgICAgIChlbmFibGVMZWZ0ICYmIG1ldHJpY3NMZWZ0Lm5ldyA8IG1ldHJpY3NMZWZ0LmluaXRpYWwgJiYgZGVsdGEubGVmdCA8PSBtZXRyaWNzTGVmdC5uZXcpICAgICAvLyBzY3JvbGwgbGVmdFxuICAgICAgICApIHtcbiAgICAgICAgICAgIC8vIGVuc3VyZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBtZXRyaWNzVG9wLm5ldyk7XG4gICAgICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gbWV0cmljc0xlZnQubmV3KTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyByZWxlYXNlIHJlZmVyZW5jZSBpbW1lZGlhdGVseS5cbiAgICAgICAgICAgIGVsID0gbnVsbCE7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXBkYXRlIHNjcm9sbCBwb3NpdGlvblxuICAgICAgICBlbmFibGVUb3AgJiYgKGVsLnNjcm9sbFRvcCA9IGRlbHRhLnRvcCk7XG4gICAgICAgIGVuYWJsZUxlZnQgJiYgKGVsLnNjcm9sbExlZnQgPSBkZWx0YS5sZWZ0KTtcblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG4gICAgfTtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBtYW5pcHVsYXRpb24gbWV0aG9kcy5cbiAqIEBqYSDjgrnjgq/jg63jg7zjg6vjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVNjcm9sbDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFNjcm9sbFxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5pa55ZCR44K544Kv44Ot44O844Or44GV44KM44Gf44OU44Kv44K744Or5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvcCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NpdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUb3AoXG4gICAgICAgIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKFxuICAgICAgICBwb3NpdGlvbj86IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gcXVlcnlUYXJnZXRFbGVtZW50KHRoaXNbMF0pO1xuICAgICAgICAgICAgcmV0dXJuIGVsID8gZWwuc2Nyb2xsVG9wIDogMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsVG8oe1xuICAgICAgICAgICAgICAgIHRvcDogcG9zaXRpb24sXG4gICAgICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIGhvcml6b250YWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOaoquaWueWQkeOCueOCr+ODreODvOODq+OBleOCjOOBn+ODlOOCr+OCu+ODq+aVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg5qiq5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zaXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSBkdXJhdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKiBAcGFyYW0gZWFzaW5nXG4gICAgICogIC0gYGVuYCB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqICAtIGBqYWAg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdChcbiAgICAgICAgcG9zaXRpb246IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KFxuICAgICAgICBwb3NpdGlvbj86IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gcXVlcnlUYXJnZXRFbGVtZW50KHRoaXNbMF0pO1xuICAgICAgICAgICAgcmV0dXJuIGVsID8gZWwuc2Nyb2xsTGVmdCA6IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbFRvKHtcbiAgICAgICAgICAgICAgICBsZWZ0OiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgYW5kIGhvcml6b250YWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaoquaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHhcbiAgICAgKiAgLSBgZW5gIHRoZSBob3Jpem9udGFsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg5qiq44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIHlcbiAgICAgKiAgLSBgZW5gIHRoZSB2ZXJ0aWNhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOe4puOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSBkdXJhdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKiBAcGFyYW0gZWFzaW5nXG4gICAgICogIC0gYGVuYCB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqICAtIGBqYWAg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG8oXG4gICAgICAgIHg6IG51bWJlcixcbiAgICAgICAgeTogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgc2Nyb2xsIHZhbHVlcyBieSBvcHRvaW5zLlxuICAgICAqIEBqYSDjgqrjg5fjgrfjg6fjg7PjgpLnlKjjgYTjgabjgrnjgq/jg63jg7zjg6vmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG8ob3B0aW9uczogRE9NU2Nyb2xsT3B0aW9ucyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgc2Nyb2xsVG8oLi4uYXJnczogYW55W10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlQXJncyguLi5hcmdzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtID0gcXVlcnlUYXJnZXRFbGVtZW50KGVsKTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZXhlY1Njcm9sbChlbGVtLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVNjcm9sbCwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7IHNldE1peENsYXNzQXR0cmlidXRlLCBXcml0YWJsZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSwgRE9NIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbi8qKlxuICogQGVuIFtbRE9NXV0gZWZmZWN0IHBhcmFtZXRlci5cbiAqIEBqYSBbW0RPTV1dIOOCqOODleOCp+OCr+ODiOWKueaenOOBruODkeODqeODoeODvOOCv1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RQYXJhbWV0ZXJzID0gS2V5ZnJhbWVbXSB8IFByb3BlcnR5SW5kZXhlZEtleWZyYW1lcyB8IG51bGw7XG5cbi8qKlxuICogQGVuIFtbRE9NXV0gZWZmZWN0IG9wdGlvbnMuXG4gKiBAamEgW1tET01dXSDjgqjjg5Xjgqfjgq/jg4jlirnmnpzjga7jgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IHR5cGUgRE9NRWZmZWN0T3B0aW9ucyA9IG51bWJlciB8IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9ucztcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3QgY29udGV4dCBvYmplY3QuXG4gKiBAamEgW1tET01dXSDjga7jgqjjg5Xjgqfjgq/jg4jlirnmnpzjga7jgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01FZmZlY3RDb250ZXh0PFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gW1tET01dXSBpbnN0YW5jZSB0aGF0IGNhbGxlZCBbW2FuaW1hdGVdXSgpIG1ldGhvZC5cbiAgICAgKiBAamEgW1thbmltYXRlXV0oKSDjg6Hjgr3jg4Pjg4njgpLlrp/ooYzjgZfjgZ8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICByZWFkb25seSBkb206IERPTTxURWxlbWVudD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gYEVsZW1lbnRgIGFuZCBgQW5pbWF0aW9uYCBpbnN0YW5jZSBtYXAgYnkgZXhlY3V0aW9uIFtbYW5pbWF0ZV1dKCkgbWV0aG9kIGF0IHRoaXMgdGltZS5cbiAgICAgKiBAamEg5LuK5Zue5a6f6KGM44GX44GfIGBFbGVtZW50YCDjgaggYEFuaW1hdGlvbmAg44Kk44Oz44K544K/44Oz44K544Gu44Oe44OD44OXXG4gICAgICovXG4gICAgcmVhZG9ubHkgYW5pbWF0aW9uczogTWFwPFRFbGVtZW50LCBBbmltYXRpb24+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBjdXJyZW50IGZpbmlzaGVkIFByb21pc2UgZm9yIHRoaXMgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDlr77osaHjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7ntYLkuobmmYLjgavnmbrngavjgZnjgosgYFByb21pc2VgIOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGZpbmlzaGVkOiBQcm9taXNlPERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQ+Pjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9hbmltQ29udGV4dE1hcCA9IG5ldyBXZWFrTWFwPEVsZW1lbnQsIFNldDxBbmltYXRpb24+PigpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGFuaW1hdGlvbi9lZmZlY3QgbWV0aG9kcy5cbiAqIEBqYSDjgqLjg4vjg6Hjg7zjgrfjg6fjg7Mv44Ko44OV44Kn44Kv44OI5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FZmZlY3RzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWZmZWN0c1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0YXJ0IGFuaW1hdGlvbiBieSBgV2ViIEFuaW1hdGlvbiBBUElgLlxuICAgICAqIEBqYSBgV2ViIEFuaW1hdGlvbiBBUElgIOOCkueUqOOBhOOBpuOCouODi+ODoeODvOOCt+ODp+ODs+OCkuWun+ihjFxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRlKHBhcmFtczogRE9NRWZmZWN0UGFyYW1ldGVycywgb3B0aW9uczogRE9NRWZmZWN0T3B0aW9ucyk6IERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICAgICAgZG9tOiB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiBhcyBET008VEVsZW1lbnQ+LFxuICAgICAgICAgICAgYW5pbWF0aW9uczogbmV3IE1hcDxURWxlbWVudCwgQW5pbWF0aW9uPigpLFxuICAgICAgICB9IGFzIFdyaXRhYmxlPERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQ+PjtcblxuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJlc3VsdC5maW5pc2hlZCA9IFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYW5pbSA9IGVsLmFuaW1hdGUocGFyYW1zLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCkgfHwgbmV3IFNldCgpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuYWRkKGFuaW0pO1xuICAgICAgICAgICAgICAgIF9hbmltQ29udGV4dE1hcC5zZXQoZWwsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5hbmltYXRpb25zLnNldChlbCBhcyBOb2RlIGFzIFRFbGVtZW50LCBhbmltKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdC5maW5pc2hlZCA9IFByb21pc2UuYWxsKFsuLi5yZXN1bHQuYW5pbWF0aW9ucy52YWx1ZXMoKV0ubWFwKGFuaW0gPT4gYW5pbS5maW5pc2hlZCkpLnRoZW4oKCkgPT4gcmVzdWx0KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDYW5jZWwgY3VycmVudCBydW5uaW5nIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg54++5Zyo5a6f6KGM44GX44Gm44GE44KL44Ki44OL44Oh44O844K344On44Oz44KS5Lit5q2iXG4gICAgICovXG4gICAgcHVibGljIGNhbmNlbCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYW5pbWF0aW9uIG9mIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5jYW5jZWwoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBfYW5pbUNvbnRleHRNYXAuZGVsZXRlKGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmluaXNoIGN1cnJlbnQgcnVubmluZyBhbmltYXRpb24uXG4gICAgICogQGphIOePvuWcqOWun+ihjOOBl+OBpuOBhOOCi+OCouODi+ODoeODvOOCt+ODp+ODs+OCkue1guS6hlxuICAgICAqL1xuICAgIHB1YmxpYyBmaW5pc2goKTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFuaW1hdGlvbiBvZiBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRpb24uZmluaXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gZmluaXNoIOOBp+OBr+egtOajhOOBl+OBquOBhFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUVmZmVjdHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuICovXG5cbmltcG9ydCB7IG1peGlucyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBFbGVtZW50aWZ5U2VlZCxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBET01CYXNlIH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IERPTUF0dHJpYnV0ZXMgfSBmcm9tICcuL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHsgRE9NVHJhdmVyc2luZyB9IGZyb20gJy4vdHJhdmVyc2luZyc7XG5pbXBvcnQgeyBET01NYW5pcHVsYXRpb24gfSBmcm9tICcuL21hbmlwdWxhdGlvbic7XG5pbXBvcnQgeyBET01TdHlsZXMgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyBET01FdmVudHMgfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQgeyBET01TY3JvbGwgfSBmcm9tICcuL3Njcm9sbCc7XG5pbXBvcnQgeyBET01FZmZlY3RzIH0gZnJvbSAnLi9lZmZlY3RzJztcblxudHlwZSBET01GZWF0dXJlczxUIGV4dGVuZHMgRWxlbWVudEJhc2U+XG4gICAgPSBET01CYXNlPFQ+XG4gICAgJiBET01BdHRyaWJ1dGVzPFQ+XG4gICAgJiBET01UcmF2ZXJzaW5nPFQ+XG4gICAgJiBET01NYW5pcHVsYXRpb248VD5cbiAgICAmIERPTVN0eWxlczxUPlxuICAgICYgRE9NRXZlbnRzPFQ+XG4gICAgJiBET01TY3JvbGw8VD5cbiAgICAmIERPTUVmZmVjdHM8VD47XG5cbi8qKlxuICogQGVuIFtbRE9NXV0gcGx1Z2luIG1ldGhvZCBkZWZpbml0aW9uLlxuICogQGphIFtbRE9NXV0g44OX44Op44Kw44Kk44Oz44Oh44K944OD44OJ5a6a576pXG4gKlxuICogQG5vdGVcbiAqICAtIOODl+ODqeOCsOOCpOODs+aLoeW8teWumue+qeOBr+OBk+OBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueODnuODvOOCuOOBmeOCiy5cbiAqICAtIFR5cGVTY3JpcHQgMy43IOaZgueCueOBpywgbW9kdWxlIGludGVyZmFjZSDjga7jg57jg7zjgrjjga8gbW9kdWxlIOOBruWujOWFqOOBquODkeOCueOCkuW/heimgeOBqOOBmeOCi+OBn+OCgSxcbiAqICAgIOacrOODrOODneOCuOODiOODquOBp+OBryBidW5kbGUg44GX44GfIGBkaXN0L2RvbS5kLnRzYCDjgpLmj5DkvpvjgZnjgosuXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zMzMyNlxuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTc4NDgxMzQvdHJvdWJsZS11cGRhdGluZy1hbi1pbnRlcmZhY2UtdXNpbmctZGVjbGFyYXRpb24tbWVyZ2luZ1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVBsdWdpbiB7IH1cblxuLyoqXG4gKiBAZW4gVGhpcyBpbnRlcmZhY2UgcHJvdmlkZXMgRE9NIG9wZXJhdGlvbnMgbGlrZSBgalF1ZXJ5YCBsaWJyYXJ5LlxuICogQGphIGBqUXVlcnlgIOOBruOCiOOBhuOBqkRPTSDmk43kvZzjgpLmj5DkvpvjgZnjgovjgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gSFRNTEVsZW1lbnQ+IGV4dGVuZHMgRE9NRmVhdHVyZXM8VD4sIERPTVBsdWdpbiB7IH1cblxuZXhwb3J0IHR5cGUgRE9NU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IEhUTUxFbGVtZW50PiA9IEVsZW1lbnRpZnlTZWVkPFQ+IHwgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFQgOiBuZXZlcj47XG5leHBvcnQgdHlwZSBET01SZXN1bHQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4gPSBUIGV4dGVuZHMgRE9NPEVsZW1lbnRCYXNlPiA/IFQgOiAoVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gRE9NPFQ+IDogRE9NPEhUTUxFbGVtZW50Pik7XG5leHBvcnQgdHlwZSBET01JdGVyYXRlQ2FsbGJhY2s8VCBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBib29sZWFuIHwgdm9pZDtcblxuLyoqXG4gKiBAZW4gVGhpcyBjbGFzcyBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m1xuICpcbiAqIFVOU1VQUE9SVEVEIE1FVEhPRCBMSVNUXG4gKlxuICogW1RyYXZlcnNpbmddXG4gKiAgLmFkZEJhY2soKVxuICogIC5lbmQoKVxuICpcbiAqIFtFZmZlY3RzXVxuICogLnNob3coKVxuICogLmhpZGUoKVxuICogLnRvZ2dsZSgpXG4gKiAuc3RvcCgpXG4gKiAuY2xlYXJRdWV1ZSgpXG4gKiAuZGVsYXkoKVxuICogLmRlcXVldWUoKVxuICogLmZhZGVJbigpXG4gKiAuZmFkZU91dCgpXG4gKiAuZmFkZVRvKClcbiAqIC5mYWRlVG9nZ2xlKClcbiAqIC5xdWV1ZSgpXG4gKiAuc2xpZGVEb3duKClcbiAqIC5zbGlkZVRvZ2dsZSgpXG4gKiAuc2xpZGVVcCgpXG4gKi9cbmV4cG9ydCBjbGFzcyBET01DbGFzcyBleHRlbmRzIG1peGlucyhcbiAgICBET01CYXNlLFxuICAgIERPTUF0dHJpYnV0ZXMsXG4gICAgRE9NVHJhdmVyc2luZyxcbiAgICBET01NYW5pcHVsYXRpb24sXG4gICAgRE9NU3R5bGVzLFxuICAgIERPTUV2ZW50cyxcbiAgICBET01TY3JvbGwsXG4gICAgRE9NRWZmZWN0cyxcbikge1xuICAgIC8qKlxuICAgICAqIHByaXZhdGUgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBFbGVtZW50QmFzZVtdKSB7XG4gICAgICAgIHN1cGVyKGVsZW1lbnRzKTtcbiAgICAgICAgLy8gYWxsIHNvdXJjZSBjbGFzc2VzIGhhdmUgbm8gY29uc3RydWN0b3IuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW0RPTV1dIGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoc2VsZWN0b3IgJiYgIWNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIERPTUNsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdG9yIGFzIGFueTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IERPTUNsYXNzKChlbGVtZW50aWZ5KHNlbGVjdG9yIGFzIEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0KSkpIGFzIGFueTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzZXR1cCB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7IERPTUNsYXNzIH0gZnJvbSAnLi9jbGFzcyc7XG5cbi8vIGluaXQgZm9yIHN0YXRpY1xuc2V0dXAoRE9NQ2xhc3MucHJvdG90eXBlLCBET01DbGFzcy5jcmVhdGUpO1xuXG5leHBvcnQgKiBmcm9tICcuL2V4cG9ydHMnO1xuZXhwb3J0IHsgZGVmYXVsdCBhcyBkZWZhdWx0IH0gZnJvbSAnLi9leHBvcnRzJztcbiJdLCJuYW1lcyI6WyJkb2N1bWVudCIsImRvYyIsIndpbmRvdyIsIiQiLCJkb20iLCJDdXN0b21FdmVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVBOzs7O0FBS0E7QUFDQSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BDO0FBQ0EsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN0QztBQUNBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDekM7QUFDQSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxHQUFHOztBQ2RyQzs7O0FBSUEsQUFlQTs7Ozs7Ozs7Ozs7O0FBWUEsU0FBZ0IsVUFBVSxDQUF5QixJQUF3QixFQUFFLE9BQTZCO0lBQ3RHLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDUCxPQUFPLEVBQUUsQ0FBQztLQUNiO0lBRUQsT0FBTyxHQUFHLE9BQU8sSUFBSUEsR0FBUSxDQUFDO0lBQzlCLE1BQU0sUUFBUSxHQUFjLEVBQUUsQ0FBQztJQUUvQixJQUFJO1FBQ0EsSUFBSSxRQUFRLEtBQUssT0FBTyxJ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
