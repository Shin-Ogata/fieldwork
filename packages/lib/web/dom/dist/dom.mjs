/*!
 * @cdp/dom 0.9.11
 *   dom utility module
 */

import { safe, isFunction, className, getGlobalNamespace, isNumber, setMixClassAttribute, isArray, isString, toTypedData, camelize, fromTypedData, noop, dasherize, classify, combination, mixins } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
 */
/** @internal */ const window$1 = safe(globalThis.window);
/** @internal */ const document = safe(globalThis.document);
/** @internal */ const CustomEvent = safe(globalThis.CustomEvent);
/** @internal */ const requestAnimationFrame = safe(globalThis.requestAnimationFrame);

/* eslint-disable
    @typescript-eslint/no-explicit-any,
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
                // eslint-disable-next-line @typescript-eslint/unbound-method
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
        getGlobalNamespace('CDP_DOM_EVAL_RETURN_VALUE_BRIDGE');
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
    return document === dom[0];
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
    return window$1 === dom[0];
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
    return document === selector;
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
    return window$1 === selector;
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
    @typescript-eslint/no-explicit-any,
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
            if (window$1 === el) {
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
setMixClassAttribute(DOMManipulation, 'protoExtendsOnly');

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
    return (el.ownerDocument && el.ownerDocument.defaultView) || window$1;
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
                    return type === cookie.split("|" /* COOKIE_SEPARATOR */)[0 /* ADDRESS_EVENT */];
                }).map(cookie => {
                    return cookie.split("|" /* COOKIE_SEPARATOR */)[1 /* ADDRESS_NAMESPACE */];
                });
                const siblings = cookies.filter(cookie => {
                    for (const signature of signatures) {
                        if (signature === cookie.split("|" /* COOKIE_SEPARATOR */)[1 /* ADDRESS_NAMESPACE */]) {
                            return true;
                        }
                    }
                    return false;
                }).map(cookie => {
                    const seed = cookie.split("|" /* COOKIE_SEPARATOR */);
                    return { type: seed[0 /* ADDRESS_EVENT */], namespace: seed[1 /* ADDRESS_NAMESPACE */] };
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
    return `${event}${"|" /* COOKIE_SEPARATOR */}${namespace}${"|" /* COOKIE_SEPARATOR */}${JSON.stringify(opts)}${"|" /* COOKIE_SEPARATOR */}${selector}`;
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
                const seed = cookie.split("|" /* COOKIE_SEPARATOR */);
                const event = seed[0 /* ADDRESS_EVENT */];
                const options = JSON.parse(seed[2 /* ADDRESS_OPTIONS */]);
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
                const seed = cookie.split("|" /* COOKIE_SEPARATOR */);
                const event = seed[0 /* ADDRESS_EVENT */];
                const options = JSON.parse(seed[2 /* ADDRESS_OPTIONS */]);
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

//__________________________________________________________________________________________________//
/** @internal query scroll target element */
function queryTargetElement(el) {
    if (isNodeElement(el)) {
        return el;
    }
    else if (isNodeDocument(el)) {
        return el.documentElement;
    }
    else if (window$1 === el) {
        return window$1.document.documentElement;
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
setMixClassAttribute(DOMClass, 'instanceOf', null);
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

export { dom as default, dom, isDOMClass };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwidXRpbHMudHMiLCJzdGF0aWMudHMiLCJiYXNlLnRzIiwiYXR0cmlidXRlcy50cyIsInRyYXZlcnNpbmcudHMiLCJtYW5pcHVsYXRpb24udHMiLCJzdHlsZXMudHMiLCJldmVudHMudHMiLCJzY3JvbGwudHMiLCJlZmZlY3RzLnRzIiwiY2xhc3MudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoLjgqrjg5bjgrjjgqfjgq/jg4jnrYnjga7lrZjlnKjjgpLkv53oqLzjgZnjgotcbiAqL1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgICAgICAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBDdXN0b21FdmVudCAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuQ3VzdG9tRXZlbnQpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gc2FmZShnbG9iYWxUaGlzLnJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNGdW5jdGlvbixcbiAgICBjbGFzc05hbWUsXG4gICAgZ2V0R2xvYmFsTmFtZXNwYWNlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbmV4cG9ydCB0eXBlIEVsZW1lbnRCYXNlID0gTm9kZSB8IFdpbmRvdztcbmV4cG9ydCB0eXBlIEVsZW1lbnRSZXN1bHQ8VD4gPSBUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogSFRNTEVsZW1lbnQ7XG5leHBvcnQgdHlwZSBTZWxlY3RvckJhc2UgPSBOb2RlIHwgV2luZG93IHwgc3RyaW5nIHwgTmlsO1xuZXhwb3J0IHR5cGUgRWxlbWVudGlmeVNlZWQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IEhUTUxFbGVtZW50PiA9IFQgfCAoVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVFtdIDogbmV2ZXIpIHwgTm9kZUxpc3RPZjxUIGV4dGVuZHMgTm9kZSA/IFQgOiBuZXZlcj47XG5leHBvcnQgdHlwZSBRdWVyeUNvbnRleHQgPSBQYXJlbnROb2RlICYgUGFydGlhbDxOb25FbGVtZW50UGFyZW50Tm9kZT47XG5cbi8qKlxuICogQGVuIENyZWF0ZSBFbGVtZW50IGFycmF5IGZyb20gc2VlZCBhcmcuXG4gKiBAamEg5oyH5a6a44GV44KM44GfIFNlZWQg44GL44KJIEVsZW1lbnQg6YWN5YiX44KS5L2c5oiQXG4gKlxuICogQHBhcmFtIHNlZWRcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgRWxlbWVudCBhcnJheS5cbiAqICAtIGBqYWAgRWxlbWVudCDphY3liJfjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIGNvbnRleHRcbiAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gKiBAcmV0dXJucyBFbGVtZW50W10gYmFzZWQgTm9kZSBvciBXaW5kb3cgb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZWxlbWVudGlmeTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWVkPzogRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRWxlbWVudFJlc3VsdDxUPltdIHtcbiAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnRleHQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IGVsZW1lbnRzOiBFbGVtZW50W10gPSBbXTtcblxuICAgIHRyeSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHNlZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBzZWVkLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChodG1sLnN0YXJ0c1dpdGgoJzwnKSAmJiBodG1sLmVuZHNXaXRoKCc+JykpIHtcbiAgICAgICAgICAgICAgICAvLyBtYXJrdXBcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLnRlbXBsYXRlLmNvbnRlbnQuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IGh0bWw7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQpICYmICgnIycgPT09IHNlbGVjdG9yWzBdKSAmJiAhL1sgLjw+On5dLy5leGVjKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXJlIElEIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvci5zdWJzdHJpbmcoMSkpO1xuICAgICAgICAgICAgICAgICAgICBlbCAmJiBlbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdib2R5JyA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYm9keVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIHNlbGVjdG9yc1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmNvbnRleHQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgoc2VlZCBhcyBOb2RlKS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWQgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmIChzZWVkWzBdLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZFswXSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBGb3IgZWFzaW5nIGBzd2luZ2AgdGltaW5nLWZ1bmN0aW9uLlxuICogQGphIGVhc2luZyBgc3dpbmdgIOeUqOOCv+OCpOODn+ODs+OCsOmWouaVsFxuICpcbiAqIEByZWZlcmVuY2VcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkyNDUwMzAvbG9va2luZy1mb3ItYS1zd2luZy1saWtlLWVhc2luZy1leHByZXNzaWJsZS1ib3RoLXdpdGgtanF1ZXJ5LWFuZC1jc3MzXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81MjA3MzAxL2pxdWVyeS1lYXNpbmctZnVuY3Rpb25zLXdpdGhvdXQtdXNpbmctYS1wbHVnaW5cbiAqXG4gKiBAcGFyYW0gcHJvZ3Jlc3MgWzAgLSAxXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpbmcocHJvZ3Jlc3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNSAtIChNYXRoLmNvcyhwcm9ncmVzcyAqIE1hdGguUEkpIC8gMik7XG59XG5cbi8qKlxuICogQGVuIFtbZXZhbHVhdGVdXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tldmFsdWF0ZV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZhbE9wdGlvbnMge1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgc3JjPzogc3RyaW5nO1xuICAgIG5vbmNlPzogc3RyaW5nO1xuICAgIG5vTW9kdWxlPzogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyaXB0c0F0dHJzOiAoa2V5b2YgRXZhbE9wdGlvbnMpW10gPSBbXG4gICAgJ3R5cGUnLFxuICAgICdzcmMnLFxuICAgICdub25jZScsXG4gICAgJ25vTW9kdWxlJyxcbl07XG5cbi8qKlxuICogQGVuIFRoZSBgZXZhbGAgZnVuY3Rpb24gYnkgd2hpY2ggc2NyaXB0IGBub25jZWAgYXR0cmlidXRlIGNvbnNpZGVyZWQgdW5kZXIgdGhlIENTUCBjb25kaXRpb24uXG4gKiBAamEgQ1NQIOeSsOWig+OBq+OBiuOBhOOBpuOCueOCr+ODquODl+ODiCBgbm9uY2VgIOWxnuaAp+OCkuiAg+aFruOBl+OBnyBgZXZhbGAg5a6f6KGM6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnkge1xuICAgIGNvbnN0IGRvYzogRG9jdW1lbnQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQudGV4dCA9IGBDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSA9ICgoKSA9PiB7IHJldHVybiAke2NvZGV9OyB9KSgpO2A7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgX3NjcmlwdHNBdHRycykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gb3B0aW9uc1thdHRyXSB8fCAoKG9wdGlvbnMgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlICYmIChvcHRpb25zIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyKSk7XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIHRyeSB7XG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZSgnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnKTtcbiAgICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KS5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChzY3JpcHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgcmV0dmFsID0gZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gKi9cblxuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIEV2YWxPcHRpb25zLFxuICAgIGVsZW1lbnRpZnksXG4gICAgZXZhbHVhdGUsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NUGx1Z2luLFxuICAgIERPTUNsYXNzLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG59IGZyb20gJy4vY2xhc3MnO1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBkb20ge1xuICAgIGxldCBmbjogRE9NQ2xhc3M7XG59XG5cbmV4cG9ydCB0eXBlIERPTUZhY3RvcnkgPSA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpID0+IERPTVJlc3VsdDxUPjtcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX2ZhY3RvcnkhOiBET01GYWN0b3J5O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgW1tET01dXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZS5cbiAqL1xuZnVuY3Rpb24gZG9tPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICByZXR1cm4gX2ZhY3Rvcnkoc2VsZWN0b3IsIGNvbnRleHQpO1xufVxuXG5kb20udXRpbHMgPSB7XG4gICAgZWxlbWVudGlmeSxcbiAgICBldmFsdWF0ZSxcbn07XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzLCBmYWN0b3J5OiBET01GYWN0b3J5KTogdm9pZCB7XG4gICAgX2ZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIGRvbS5mbiA9IGZuO1xufVxuXG5leHBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRXZhbE9wdGlvbnMsXG4gICAgRE9NLFxuICAgIERPTVBsdWdpbixcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSxcbn07XG4iLCJpbXBvcnQgeyBOaWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93LCBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yID0gU3ltYm9sKCdjcmVhdGUtaXRlcmFibGUtaXRlcmF0b3InKTtcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdGlvbiBjbGFzcyBvZiBbW0RPTUNsYXNzXV0uIFRoaXMgY2xhc3MgcHJvdmlkZXMgaXRlcmF0b3IgbWV0aG9kcy5cbiAqIEBqYSBbW0RPTUNsYXNzXV0g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50czogVFtdKSB7XG4gICAgICAgIGNvbnN0IHNlbGY6IERPTUFjY2VzczxUPiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaW5kZXgpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IoY3VycmVudCwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYC5cbiAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlKGVsOiB1bmtub3duKTogZWwgaXMgTm9kZSB7XG4gICAgcmV0dXJuICEhKGVsICYmIChlbCBhcyBOb2RlKS5ub2RlVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRWxlbWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBFbGVtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgRWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBlbC5ub2RlVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAobnVsbCAhPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEVsZW1lbnRgIG9yIGBEb2N1bWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBFbGVtZW50YCDjgb7jgZ/jga8gYERvY3VtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVF1ZXJpYWJsZShlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBFbGVtZW50IHwgRG9jdW1lbnQge1xuICAgIHJldHVybiAhIShlbCAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5xdWVyeVNlbGVjdG9yKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2Rcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBEb2N1bWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVEb2N1bWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBEb2N1bWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRE9DVU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgSFRNTEVsZW1lbnRgIOOBvuOBn+OBryBgU1ZHRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlSFRNTE9yU1ZHRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRG9jdW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IGRvbVswXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYFdpbmRvd2AuXG4gKiBAamEgW1tET01dXSDjgYwgYFdpbmRvd2Ag44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlV2luZG93KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPFdpbmRvdz4ge1xuICAgIHJldHVybiB3aW5kb3cgPT09IGRvbVswXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE5pbC5cbiAqIEBqYSBOaWwg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOaWw+IHtcbiAgICByZXR1cm4gIXNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIHN0cmluZz4ge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOb2RlLlxuICogQGphIE5vZGUg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGU+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgTm9kZSkubm9kZVR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIEVsZW1lbnQuXG4gKiBAamEgRWxlbWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbGVtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRWxlbWVudD4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIEVsZW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIERvY3VtZW50LlxuICogQGphIERvY3VtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RvY3VtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IHNlbGVjdG9yIGFzIE5vZGUgYXMgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFdpbmRvdy5cbiAqIEBqYSBXaW5kb3cg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgV2luZG93PiB7XG4gICAgcmV0dXJuIHdpbmRvdyA9PT0gc2VsZWN0b3IgYXMgV2luZG93O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgaXMgYWJsZSB0byBpdGVyYXRlLlxuICogQGphIOi1sOafu+WPr+iDveOBquOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTm9kZUxpc3RPZjxOb2RlPj4ge1xuICAgIHJldHVybiBudWxsICE9IChzZWxlY3RvciBhcyBUW10pLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgW1tET01dXS5cbiAqIEBqYSBbW0RPTV1dIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERPTT4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayBub2RlIG5hbWUgaXMgYXJndW1lbnQuXG4gKiBAamEgTm9kZSDlkI3jgYzlvJXmlbDjgafkuI7jgYjjgZ/lkI3liY3jgajkuIDoh7TjgZnjgovjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vZGVOYW1lKGVsZW06IE5vZGUgfCBudWxsLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISEoZWxlbSAmJiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUudG9Mb3dlckNhc2UoKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCBub2RlIG9mZnNldCBwYXJlbnQuIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZXQgcGFyZW50IOOBruWPluW+ly4gU1ZHRWxlbWVudCDjgavjgoLpgannlKjlj6/og71cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE9mZnNldFBhcmVudChub2RlOiBOb2RlKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmICgobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50KSB7XG4gICAgICAgIHJldHVybiAobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50O1xuICAgIH0gZWxzZSBpZiAobm9kZU5hbWUobm9kZSwgJ3N2ZycpKSB7XG4gICAgICAgIGNvbnN0ICRzdmcgPSAkKG5vZGUpO1xuICAgICAgICBjb25zdCBjc3NQcm9wcyA9ICRzdmcuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgaWYgKCdub25lJyA9PT0gY3NzUHJvcHMuZGlzcGxheSB8fCAnZml4ZWQnID09PSBjc3NQcm9wcy5wb3NpdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGFyZW50ID0gJHN2Z1swXS5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGlzcGxheSwgcG9zaXRpb24gfSA9ICQocGFyZW50KS5jc3MoWydkaXNwbGF5JywgJ3Bvc2l0aW9uJ10pO1xuICAgICAgICAgICAgICAgIGlmICgnbm9uZScgPT09IGRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghcG9zaXRpb24gfHwgJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBOb25GdW5jdGlvblByb3BlcnR5TmFtZXMsXG4gICAgVHlwZWREYXRhLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBjYW1lbGl6ZSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01WYWx1ZVR5cGU8VCwgSyA9ICd2YWx1ZSc+ID0gVCBleHRlbmRzIEhUTUxTZWxlY3RFbGVtZW50ID8gKHN0cmluZyB8IHN0cmluZ1tdKSA6IEsgZXh0ZW5kcyBrZXlvZiBUID8gVFtLXSA6IHN0cmluZztcbmV4cG9ydCB0eXBlIERPTURhdGEgPSBQbGFpbk9iamVjdDxUeXBlZERhdGE+O1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc011bHRpU2VsZWN0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MU2VsZWN0RWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZUVsZW1lbnQoZWwpICYmICdzZWxlY3QnID09PSBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICYmIChlbCBhcyBIVE1MU2VsZWN0RWxlbWVudCkubXVsdGlwbGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgdmFsKClgKi9cbmZ1bmN0aW9uIGlzSW5wdXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSk6IGVsIGlzIEhUTUxJbnB1dEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAobnVsbCAhPSAoZWwgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIGF0dHJpYnV0ZXMgbWV0aG9kcy5cbiAqIEBqYSDlsZ7mgKfmk43kvZzjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUF0dHJpYnV0ZXM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBDbGFzc2VzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGRDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBjc3MgY2xhc3MgdG8gZWxlbWVudHMuXG4gICAgICogQGphIGNzcyBjbGFzcyDopoHntKDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZXRlcm1pbmUgd2hldGhlciBhbnkgb2YgdGhlIG1hdGNoZWQgZWxlbWVudHMgYXJlIGFzc2lnbmVkIHRoZSBnaXZlbiBjbGFzcy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS5bCR44Gq44GP44Go44KC6KaB57Sg44GM5oyB44Gj44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI1cbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkgJiYgZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBvciByZW1vdmUgb25lIG9yIG1vcmUgY2xhc3NlcyBmcm9tIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIDxicj5cbiAgICAgKiAgICAgZGVwZW5kaW5nIG9uIGVpdGhlciB0aGUgY2xhc3MncyBwcmVzZW5jZSBvciB0aGUgdmFsdWUgb2YgdGhlIHN0YXRlIGFyZ3VtZW50LlxuICAgICAqIEBqYSDnj77lnKjjga7nirbmhYvjgavlv5zjgZjjgaYsIOaMh+WumuOBleOCjOOBn+OCr+ODqeOCueWQjeOCkuimgee0oOOBq+i/veWKoC/liYrpmaTjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gZm9yY2VcbiAgICAgKiAgLSBgZW5gIGlmIHRoaXMgYXJndW1lbnQgZXhpc3RzLCB0cnVlOiB0aGUgY2xhc3NlcyBzaG91bGQgYmUgYWRkZWQgLyBmYWxzZTogcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBjOWtmOWcqOOBmeOCi+WgtOWQiCwgdHJ1ZTog44Kv44Op44K544KS6L+95YqgIC8gZmFsc2U6IOOCr+ODqeOCueOCkuWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyB0b2dnbGVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdLCBmb3JjZT86IGJvb2xlYW4pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgY29uc3Qgb3BlcmF0aW9uID0gKCgpID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsID09IGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBjbGFzc2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmNsYXNzTGlzdC50b2dnbGUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmb3JjZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpID0+IGVsZW0uY2xhc3NMaXN0LnJlbW92ZSguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIG9wZXJhdGlvbihlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFByb3BlcnRpZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgcHJvcGVydHkgdmFsdWUuIDxicj5cbiAgICAgKiAgICAgVGhlIG1ldGhvZCBnZXRzIHRoZSBwcm9wZXJ0eSB2YWx1ZSBmb3Igb25seSB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogQGphIOODl+ODreODkeODhuOCo+WApOOBruWPluW+lyA8YnI+XG4gICAgICogICAgIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvcDxUIGV4dGVuZHMgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFRFbGVtZW50Pj4obmFtZTogVCk6IFRFbGVtZW50W1RdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzaW5nbGUgcHJvcGVydHkgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IHZhbHVlXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovjg5fjg63jg5Hjg4bjgqPlgKRcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvcDxUIGV4dGVuZHMgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFRFbGVtZW50Pj4obmFtZTogVCwgdmFsdWU6IFRFbGVtZW50W1RdKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbXVsdGkgcHJvcGVydHkgdmFsdWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuikh+aVsOODl+ODreODkeODhuOCo+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnRpZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBwcm9wZXJ0eS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBwcm9wZXJ0eS12YWx1ZSDjg5rjgqLjgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJvcChwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgcHJvcDxUIGV4dGVuZHMgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzPFRFbGVtZW50Pj4oa2V5OiBUIHwgUGxhaW5PYmplY3QsIHZhbHVlPzogVEVsZW1lbnRbVF0pOiBURWxlbWVudFtUXSB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBwcm9wZXJ0eVxuICAgICAgICAgICAgY29uc3QgZmlyc3QgPSB0aGlzWzBdO1xuICAgICAgICAgICAgcmV0dXJuIGZpcnN0ICYmIGZpcnN0W2tleSBhcyBzdHJpbmddO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHByb3BlcnR5XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgZWxba2V5IGFzIHN0cmluZ10gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBtdWx0aXBsZVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbFtuYW1lXSA9IGtleVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBBdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGF0dHJpYnV0ZSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIGF0dHJpYnV0ZSB2YWx1ZSBmb3Igb25seSB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogQGphIOWxnuaAp+WApOOBruWPluW+lyA8YnI+XG4gICAgICogICAgIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgbmFtZVxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBzaW5nbGUgYXR0cmlidXRlIHZhbHVlIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuWNmOS4gOWxnuaAp+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgbmFtZVxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIHZhbHVlLiBpZiBgbnVsbGAgc2V0LCByZW1vdmUgYXR0cmlidXRlLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5bGe5oCn5YCkLiBgbnVsbGAg44GM5oyH5a6a44GV44KM44Gf5aC05ZCI5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIGF0dHIobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBhdHRyaWJ1dGUgdmFsdWVzIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuikh+aVsOWxnuaAp+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJpYnV0ZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBhdHRyaWJ1dGUtdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgYXR0cmlidXRlLXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBhdHRyKGtleTogc3RyaW5nIHwgUGxhaW5PYmplY3QsIHZhbHVlPzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwpOiBzdHJpbmcgfCB1bmRlZmluZWQgfCB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZCA9PT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9IGVsc2UgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgYXR0cmlidXRlXG4gICAgICAgICAgICBjb25zdCBhdHRyID0gdGhpc1swXS5nZXRBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgICAgIHJldHVybiAobnVsbCAhPSBhdHRyKSA/IGF0dHIgOiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlbW92ZUF0dHIoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgYXR0cmlidXRlXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKGtleSBhcyBzdHJpbmcsIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsID0ga2V5W25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCBTdHJpbmcodmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBhdHRyaWJ1dGUuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+WxnuaAp+OCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIGF0dHJpYnV0ZSBuYW1lIG9yIGF0dHJpYnV0ZSBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOBvuOBn+OBr+WxnuaAp+WQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVBdHRyKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYXR0cnMgPSBpc0FycmF5KG5hbWUpID8gbmFtZSA6IFtuYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFZhbHVlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIHZhbHVlIOWApOOBruWPluW+ly4g5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50PigpOiBET01WYWx1ZVR5cGU8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSB2YWx1ZSBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpiB2YWx1ZSDlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZTogRE9NVmFsdWVUeXBlPFQ+KTogdGhpcztcblxuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlPzogRE9NVmFsdWVUeXBlPFQ+KTogYW55IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHZhbHVlXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICBpZiAoaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwuc2VsZWN0ZWRPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsIGFzIGFueSkudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5vIHN1cHBvcnQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLm9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5zZWxlY3RlZCA9ICh2YWx1ZSBhcyBzdHJpbmdbXSkuaW5jbHVkZXMob3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNJbnB1dEVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IERhdGFcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlcyBhbGwgYERPTVN0cmluZ01hcGAgc3RvcmUgc2V0IGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga4gSFRNTDUgZGF0YS0qIOWxnuaAp+OBpyBgRE9NU3RyaW5nTWFwYCDjgavmoLzntI3jgZXjgozjgZ/lhajjg4fjg7zjgr/lgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YSgpOiBET01EYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWUgYXQgdGhlIG5hbWVkIGRhdGEgc3RvcmUgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBjb2xsZWN0aW9uLCBhcyBzZXQgYnkgZGF0YShrZXksIHZhbHVlKSBvciBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga4ga2V5IOOBp+aMh+WumuOBl+OBnyBIVE1MNSBkYXRhLSog5bGe5oCn5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZyk6IFR5cGVkRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdG9yZSBhcmJpdHJhcnkgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuS7u+aEj+OBruODh+ODvOOCv+OCkuagvOe0jVxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBkYXRhIHZhbHVlIChub3Qgb25seSBgc3RyaW5nYClcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WApOOCkuaMh+WumiAo5paH5a2X5YiX5Lul5aSW44KC5Y+X5LuY5Y+vKVxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nLCB2YWx1ZTogVHlwZWREYXRhKTogdGhpcztcblxuICAgIHB1YmxpYyBkYXRhKGtleT86IHN0cmluZywgdmFsdWU/OiBUeXBlZERhdGEpOiBET01EYXRhIHwgVHlwZWREYXRhIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIHN1cHBvcnRlZCBkYXRhc2V0IGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBkYXRhc2V0XG4gICAgICAgICAgICBjb25zdCBkYXRhc2V0ID0gdGhpc1swXS5kYXRhc2V0O1xuICAgICAgICAgICAgaWYgKG51bGwgPT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGFsbCBkYXRhXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YTogRE9NRGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhkYXRhc2V0KSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhW3Byb3BdID0gdG9UeXBlZERhdGEoZGF0YXNldFtwcm9wXSkgYXMgVHlwZWREYXRhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gdHlwZWQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9UeXBlZERhdGEoZGF0YXNldFtjYW1lbGl6ZShrZXkpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IHByb3AgPSBjYW1lbGl6ZShrZXkgfHwgJycpO1xuICAgICAgICAgICAgaWYgKHByb3ApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5kYXRhc2V0W3Byb3BdID0gZnJvbVR5cGVkRGF0YSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGRhdGEuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+ODh+ODvOOCv+OCkuODh+ODvOOCv+mgmOWfn+OBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZURhdGEoa2V5OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShrZXkpID8ga2V5Lm1hcChrID0+IGNhbWVsaXplKGspKSA6IFtjYW1lbGl6ZShrZXkpXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRhdGFzZXQgfSA9IGVsO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YXNldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01BdHRyaWJ1dGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93LCBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01CYXNlLFxuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZVF1ZXJpYWJsZSxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBpc0VtcHR5U2VsZWN0b3IsXG4gICAgaXNTdHJpbmdTZWxlY3RvcixcbiAgICBpc0RvY3VtZW50U2VsZWN0b3IsXG4gICAgaXNXaW5kb3dTZWxlY3RvcixcbiAgICBpc05vZGVTZWxlY3RvcixcbiAgICBpc0l0ZXJhYmxlU2VsZWN0b3IsXG4gICAgbm9kZU5hbWUsXG4gICAgZ2V0T2Zmc2V0UGFyZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01Nb2RpZmljYXRpb25DYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gVTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpcygpYCBhbmQgYGZpbHRlcigpYCAqL1xuZnVuY3Rpb24gd2lubm93PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UsIFUgZXh0ZW5kcyBFbGVtZW50QmFzZT4oXG4gICAgc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFU+LFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxVPixcbiAgICB2YWxpZENhbGxiYWNrOiAoZWw6IFUpID0+IHVua25vd24sXG4gICAgaW52YWxpZENhbGxiYWNrPzogKCkgPT4gdW5rbm93bixcbik6IGFueSB7XG4gICAgaW52YWxpZENhbGxiYWNrID0gaW52YWxpZENhbGxiYWNrIHx8IG5vb3A7XG5cbiAgICBsZXQgcmV0dmFsOiB1bmtub3duO1xuICAgIGZvciAoY29uc3QgW2luZGV4LCBlbF0gb2YgZG9tLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3Rvci5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoKGVsIGFzIE5vZGUgYXMgRWxlbWVudCkubWF0Y2hlcyAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc1dpbmRvd1NlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHdpbmRvdyA9PT0gZWwgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50ID09PSBlbCBhcyBOb2RlIGFzIERvY3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSBpbnZhbGlkQ2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOb2RlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtIG9mIHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0gPT09IGVsIGFzIE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBwYXJlbnQoKWAsIGBwYXJlbnRzKClgIGFuZCBgc2libGluZ3MoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUGFyZW50Tm9kZShwYXJlbnROb2RlOiBOb2RlIHwgbnVsbCk6IHBhcmVudE5vZGUgaXMgTm9kZSB7XG4gICAgcmV0dXJuIG51bGwgIT0gcGFyZW50Tm9kZSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGUgJiYgTm9kZS5ET0NVTUVOVF9GUkFHTUVOVF9OT0RFICE9PSBwYXJlbnROb2RlLm5vZGVUeXBlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNoaWxkcmVuKClgLCBgcGFyZW50KClgLCBgbmV4dCgpYCBhbmQgYHByZXYoKWAgKi9cbmZ1bmN0aW9uIHZhbGlkUmV0cmlldmVOb2RlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KG5vZGU6IE5vZGUgfCBudWxsLCBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQpOiBub2RlIGlzIE5vZGUge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgaWYgKCQobm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgbmV4dFVudGlsKClgIGFuZCBgcHJldlVudGlsKCkgKi9cbmZ1bmN0aW9uIHJldHJpZXZlU2libGluZ3M8XG4gICAgRSBleHRlbmRzIEVsZW1lbnRCYXNlLFxuICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4+KFxuICAgIHNpYmxpbmc6ICdwcmV2aW91c0VsZW1lbnRTaWJsaW5nJyB8ICduZXh0RWxlbWVudFNpYmxpbmcnLFxuICAgIGRvbTogRE9NVHJhdmVyc2luZzxFPixcbiAgICBzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPlxuKTogRE9NPFQ+IHtcbiAgICBpZiAoIWlzVHlwZUVsZW1lbnQoZG9tKSkge1xuICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcblxuICAgIGZvciAoY29uc3QgZWwgb2YgZG9tIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgIGxldCBlbGVtID0gZWxbc2libGluZ107XG4gICAgICAgIHdoaWxlIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGlmICgkKGVsZW0pLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtID0gZWxlbVtzaWJsaW5nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkKFsuLi5zaWJsaW5nc10pIGFzIERPTTxUPjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSB0cmF2ZXJzaW5nIG1ldGhvZHMuXG4gKiBAamEg44OI44Op44OQ44O844K544Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01UcmF2ZXJzaW5nPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRWxlbWVudCBNZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgb25lIG9mIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrprjgZfjgabphY3kuIvjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGdldChpbmRleDogbnVtYmVyKTogVEVsZW1lbnQgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoKTogVEVsZW1lbnRbXTtcblxuICAgIHB1YmxpYyBnZXQoaW5kZXg/OiBudW1iZXIpOiBURWxlbWVudFtdIHwgVEVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCAhPSBpbmRleCkge1xuICAgICAgICAgICAgaW5kZXggPSBNYXRoLnRydW5jKGluZGV4KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCA8IDAgPyB0aGlzW2luZGV4ICsgdGhpcy5sZW5ndGhdIDogdGhpc1tpbmRleF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0FycmF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0cmlldmUgYWxsIHRoZSBlbGVtZW50cyBjb250YWluZWQgaW4gdGhlIFtbRE9NXV0gc2V0LCBhcyBhbiBhcnJheS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHRvQXJyYXkoKTogVEVsZW1lbnRbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpc107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aGluIHRoZSBbW0RPTV1dIGNvbGxlY3Rpb24gcmVsYXRpdmUgdG8gaXRzIHNpYmxpbmcgZWxlbWVudHMuXG4gICAgICogQGphIFtbRE9NXV0g5YaF44Gu5pyA5Yid44Gu6KaB57Sg44GM5YWE5byf6KaB57Sg44Gu5L2V55Wq55uu44Gr5omA5bGe44GZ44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4KCk6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWFyY2ggZm9yIGEgZ2l2ZW4gYSBzZWxlY3RvciwgZWxlbWVudCwgb3IgW1tET01dXSBpbnN0YW5jZSBmcm9tIGFtb25nIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDphY3kuIvjga7kvZXnlarnm67jgavmiYDlsZ7jgZfjgabjgYTjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcjogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yPzogc3RyaW5nIHwgVCB8IERPTTxUPik6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgICAgICBsZXQgY2hpbGQ6IE5vZGUgfCBudWxsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHdoaWxlIChudWxsICE9PSAoY2hpbGQgPSBjaGlsZC5wcmV2aW91c1NpYmxpbmcpKSB7XG4gICAgICAgICAgICAgICAgaWYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBjaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZWxlbTogVCB8IEVsZW1lbnQ7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9ICQoc2VsZWN0b3IpWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gc2VsZWN0b3IgaW5zdGFuY2VvZiBET01CYXNlID8gc2VsZWN0b3JbMF0gOiBzZWxlY3RvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGkgPSBbLi4udGhpc10uaW5kZXhPZihlbGVtIGFzIFRFbGVtZW50ICYgRWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gMCA8PSBpID8gaSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVHJhdmVyc2luZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGZpcnN0IGluIHRoZSBzZXQgYXMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyA5Yid44Gu6KaB57Sg44KSIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJCh0aGlzWzBdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaW5hbCBvbmUgaW4gdGhlIHNldCBhcyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovmnKvlsL7jga7opoHntKDjgpIgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1t0aGlzLmxlbmd0aCAtIDFdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgW1tET01dXSBpbnN0YW5jZSB3aXRoIGVsZW1lbnRzIGFkZGVkIHRvIHRoZSBzZXQgZnJvbSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAg44Gn5Y+W5b6X44GX44GfIGBFbGVtZW50YCDjgpLov73liqDjgZfjgZ/mlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0ICRhZGQgPSAkKHNlbGVjdG9yLCBjb250ZXh0KTtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBuZXcgU2V0KFsuLi50aGlzLCAuLi4kYWRkXSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtc10gYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgb2YgZWxlbWVudHMgYWdhaW5zdCBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3aW5ub3coc2VsZWN0b3IsIHRoaXMsICgpID0+IHRydWUsICgpID0+IGZhbHNlKSBhcyBib29sZWFuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRob3NlIHRoYXQgbWF0Y2ggdGhlIHNlbGVjdG9yIG9yIHBhc3MgdGhlIGZ1bmN0aW9uJ3MgdGVzdC5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg54++5Zyo44Gu6KaB57Sg44Gu44K744OD44OI44Go5LiA6Ie044GX44Gf44KC44Gu44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgTmV3IFtbRE9NXV0gaW5zdGFuY2UgaW5jbHVkaW5nIGZpbHRlcmVkIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Oq44Oz44Kw44GV44KM44Gf6KaB57Sg44KS5YaF5YyF44GZ44KLIOaWsOimjyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+IHwgRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCB8fCBpc0VtcHR5U2VsZWN0b3Ioc2VsZWN0b3IgYXMgRE9NU2VsZWN0b3I8VD4pKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRFbGVtZW50W10gPSBbXTtcbiAgICAgICAgd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoZWw6IFRFbGVtZW50KSA9PiB7IGVsZW1lbnRzLnB1c2goZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZWxlbWVudHMgZnJvbSB0aGUgc2V0IG9mIG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkuWJiumZpOOBl+OBpui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyBbW0RPTV1dIGluc3RhbmNlIGV4Y2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuS7peWkluOCkuWGheWMheOBmeOCiyDmlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgbm90PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gbmV3IFNldDxURWxlbWVudD4oWy4uLnRoaXNdKTtcbiAgICAgICAgd2lubm93KHNlbGVjdG9yLCB0aGlzLCAoZWw6IFRFbGVtZW50KSA9PiB7IGVsZW1lbnRzLmRlbGV0ZShlbCk7IH0pO1xuICAgICAgICByZXR1cm4gJChbLi4uZWxlbWVudHNdIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBkZXNjZW5kYW50cyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBmeOCi+imgee0oOOCkuaknOe0olxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBmaW5kPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmICghaXNTdHJpbmcoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0b3IgPSAkKHNlbGVjdG9yKSBhcyBET008Tm9kZT47XG4gICAgICAgICAgICByZXR1cm4gJHNlbGVjdG9yLmZpbHRlcigoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwgIT09IGVsZW0gJiYgZWwuY29udGFpbnMoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVtcyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmVsZW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRob3NlIHRoYXQgaGF2ZSBhIGRlc2NlbmRhbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5oyH5a6a44GX44Gf44K744Os44Kv44K/44Gr5LiA6Ie044GX44Gf5a2Q6KaB57Sg5oyB44Gk6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGhhczxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdGFyZ2V0czogTm9kZVtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChzZWxlY3RvciwgZWwgYXMgRWxlbWVudCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgICAgIHRhcmdldHMucHVzaCguLi4kdGFyZ2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmZpbHRlcigoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIG5ldyBTZXQodGFyZ2V0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW0gIT09IGVsICYmIGVsZW0uY29udGFpbnMoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUGFzcyBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgdGhyb3VnaCBhIGZ1bmN0aW9uLCBwcm9kdWNpbmcgYSBuZXcgW1tET01dXSBpbnN0YW5jZSBjb250YWluaW5nIHRoZSByZXR1cm4gdmFsdWVzLlxuICAgICAqIEBqYSDjgrPjg7zjg6vjg5Djg4Pjgq/jgaflpInmm7TjgZXjgozjgZ/opoHntKDjgpLnlKjjgYTjgabmlrDjgZ/jgasgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmp4vnr4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+WkieabtOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBtYXA8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihjYWxsYmFjazogRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VEVsZW1lbnQsIFQ+KTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRlIG92ZXIgYSBbW0RPTV1dIGluc3RhbmNlLCBleGVjdXRpbmcgYSBmdW5jdGlvbiBmb3IgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+mWouaVsOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgZWFjaChjYWxsYmFjazogRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBpZiAoZmFsc2UgPT09IGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byBhIHN1YnNldCBzcGVjaWZpZWQgYnkgYSByYW5nZSBvZiBpbmRpY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ/nr4Tlm7Ljga7opoHntKDjgpLlkKvjgoAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiZWdpblxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBiZWdpbiB0byBiZSBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OBrumWi+Wni+S9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqIEBwYXJhbSBlbmRcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgc3RvcCBiZWluZyBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OCkue1guOBiOOCi+ebtOWJjeOBruS9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBzbGljZShiZWdpbj86IG51bWJlciwgZW5kPzogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKFsuLi50aGlzXS5zbGljZShiZWdpbiwgZW5kKSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIG9uZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZfjgZ/opoHntKDjgpLlkKvjgoAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGVxKGluZGV4OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMuZ2V0KGluZGV4KSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3IgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yIGJ5IHRlc3RpbmcgdGhlIGVsZW1lbnQgaXRzZWxmIGFuZCB0cmF2ZXJzaW5nIHVwIHRocm91Z2ggaXRzIGFuY2VzdG9ycyBpbiB0aGUgRE9NIHRyZWUuXG4gICAgICogQGphIOmWi+Wni+imgee0oOOBi+OCieacgOOCgui/keOBhOimquimgee0oOOCkumBuOaKni4g44K744Os44Kv44K/44O85oyH5a6a44GX44Gf5aC05ZCILCDjg57jg4Pjg4HjgZnjgovmnIDjgoLov5HjgYTopqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9zZXN0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChudWxsID09IHNlbGVjdG9yIHx8ICFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgY2xvc2VzdHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYyA9IGVsLmNsb3Nlc3Qoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VzdHMuYWRkKGMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoWy4uLmNsb3Nlc3RzXSkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzIGFzIHVua25vd24gYXMgRWxlbWVudCkgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50cyhzZWxlY3RvcikuZXEoMCkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5ZCE6KaB57Sg44Gu5a2Q6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgYzmjIflrprjgZXjgozjgZ/loLTlkIjjga/jg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/ntZDmnpzjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGlsZHJlbjxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGNoaWxkLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLmFkZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNoaWxkcmVuXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IHBhcmVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruacgOWIneOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpICYmIHZhbGlkUmV0cmlldmVOb2RlKHBhcmVudE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLmFkZChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnBhcmVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudHNVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBhbmNlc3RvcnMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLCBET00gbm9kZSwgb3IgW1tET01dXSBpbnN0YW5jZVxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzVW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgbGV0IHBhcmVudHM6IE5vZGVbXSA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgbGV0IHBhcmVudE5vZGUgPSAoZWwgYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHdoaWxlICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KSH5pWw6KaB57Sg44GM5a++6LGh44Gr44Gq44KL44Go44GN44Gv5Y+N6LuiXG4gICAgICAgIGlmICgxIDwgdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcmVudHMgPSBbLi4ubmV3IFNldChwYXJlbnRzLnJldmVyc2UoKSldLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkKHBhcmVudHMpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbW1lZGlhdGVseSBmb2xsb3dpbmcgc2libGluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIElmIGEgc2VsZWN0b3IgaXMgcHJvdmlkZWQsIGl0IHJldHJpZXZlcyB0aGUgbmV4dCBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDopoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TlvozjgavjgYLjgZ/jgovlhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dFNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5uZXh0RWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ubmV4dFNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIGZvbGxvd2luZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruasoeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm5leHRVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7mrKHku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygnbmV4dEVsZW1lbnRTaWJsaW5nJywgdGhpcywgc2VsZWN0b3IsIGZpbHRlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgcHJlY2VkaW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIHByZXZpb3VzIHNpYmxpbmcgb25seSBpZiBpdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOOBruWQhOimgee0oOOBruebtOWJjeOBruWFhOW8n+imgee0oOOCkuaKveWHuiA8YnI+XG4gICAgICogICAgIOadoeS7tuW8j+OCkuaMh+WumuOBl+OAgee1kOaenOOCu+ODg+ODiOOBi+OCieabtOOBq+e1nui+vOOBv+OCkuihjOOBhuOBk+OBqOOCguWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXY8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2U2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ucHJldlNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIHByZWNlZGluZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruWJjeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7liY3ku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygncHJldmlvdXNFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3RvclxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/lkITopoHntKDjga7lhYTlvJ/opoHntKDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBzaWJsaW5nczxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaWJsaW5nIG9mICQocGFyZW50Tm9kZSkuY2hpbGRyZW4oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2libGluZyAhPT0gZWwgYXMgRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChzaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uc2libGluZ3NdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2hpbGRyZW4gb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHRleHQgYW5kIGNvbW1lbnQgbm9kZXMuXG4gICAgICogQGphIOODhuOCreOCueODiOOChEhUTUzjgrPjg6Hjg7Pjg4jjgpLlkKvjgoDlrZDopoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudD4oKTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlTmFtZShlbCwgJ2lmcmFtZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZCgoZWwgYXMgSFRNTElGcmFtZUVsZW1lbnQpLmNvbnRlbnREb2N1bWVudCBhcyBOb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKGVsLCAndGVtcGxhdGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQpLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBlbC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNvbnRlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNsb3Nlc3QgYW5jZXN0b3IgZWxlbWVudCB0aGF0IGlzIHBvc2l0aW9uZWQuXG4gICAgICogQGphIOimgee0oOOBruWFiOelluimgee0oOOBpywg44K544K/44Kk44Or44Gn44Od44K444K344On44Oz5oyH5a6aKHBvc2l0aWlvbuOBjHJlbGF0aXZlLCBhYnNvbHV0ZSwgZml4ZWTjga7jgYTjgZrjgozjgYsp44GV44KM44Gm44GE44KL44KC44Gu44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldFBhcmVudDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50PigpOiBET008VD4ge1xuICAgICAgICBjb25zdCByb290RWxlbWVudCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJChyb290RWxlbWVudCkgYXMgRE9NPE5vZGU+IGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG9mZnNldHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBnZXRPZmZzZXRQYXJlbnQoZWwgYXMgTm9kZSkgfHwgcm9vdEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgb2Zmc2V0cy5hZGQob2Zmc2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5vZmZzZXRzXSkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01UcmF2ZXJzaW5nLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcsIHNldE1peENsYXNzQXR0cmlidXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTVJlc3VsdCxcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVEb2N1bWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBjaGVjayBIVE1MIHN0cmluZyAqL1xuZnVuY3Rpb24gaXNIVE1MU3RyaW5nKHNyYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc3ViamVjdCA9IHNyYy50cmltKCk7XG4gICAgcmV0dXJuICgnPCcgPT09IHN1YmplY3Quc2xpY2UoMCwgMSkpICYmICgnPicgPT09IHN1YmplY3Quc2xpY2UoLTEpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBhcHBlbmQoKWAsIGBwcmVwZW5kKClgLCBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGVTZXQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiBTZXQ8Tm9kZSB8IHN0cmluZz4ge1xuICAgIGNvbnN0IG5vZGVzID0gbmV3IFNldDxOb2RlIHwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgY29udGVudCBvZiBjb250ZW50cykge1xuICAgICAgICBpZiAoKGlzU3RyaW5nKGNvbnRlbnQpICYmICFpc0hUTUxTdHJpbmcoY29udGVudCkpIHx8IGlzTm9kZShjb250ZW50KSkge1xuICAgICAgICAgICAgbm9kZXMuYWRkKGNvbnRlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgJGRvbSA9ICQoY29udGVudCBhcyBET008RWxlbWVudD4pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mICRkb20pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdHJpbmcobm9kZSkgfHwgKGlzTm9kZShub2RlKSAmJiBOb2RlLkRPQ1VNRU5UX05PREUgIT09IG5vZGUubm9kZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGVzO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGJlZm9yZSgpYCBhbmQgYGFmdGVyKClgICAqL1xuZnVuY3Rpb24gdG9Ob2RlKG5vZGU6IE5vZGUgfCBzdHJpbmcpOiBOb2RlIHtcbiAgICBpZiAoaXNTdHJpbmcobm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBkZXRhY2goKWAgYW5kIGByZW1vdmUoKWAgKi9cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCB1bmRlZmluZWQsXG4gICAgZG9tOiBET01JdGVyYWJsZTxVPixcbiAgICBrZWVwTGlzdGVuZXI6IGJvb2xlYW5cbik6IHZvaWQge1xuICAgIGNvbnN0ICRkb206IERPTTxVPiA9IG51bGwgIT0gc2VsZWN0b3JcbiAgICAgICAgPyAoZG9tIGFzIERPTTxVPikuZmlsdGVyKHNlbGVjdG9yKVxuICAgICAgICA6IGRvbSBhcyBET008VT47XG5cbiAgICBpZiAoIWtlZXBMaXN0ZW5lcikge1xuICAgICAgICAkZG9tLm9mZigpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgIGVsLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIG1hbmlwdWxhdGlvbiBtZXRob2RzLlxuICogQGphIOODnuODi+ODlOODpeODrOODvOOCt+ODp+ODs+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NTWFuaXB1bGF0aW9uPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBJbnNpZGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIEhUTUwgY29udGVudHMgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga4gSFRNTCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbCgpOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBIVE1MIGNvbnRlbnRzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+aMh+WumuOBl+OBnyBIVE1MIOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGh0bWxTdHJpbmdcbiAgICAgKiAgLSBgZW5gIEEgc3RyaW5nIG9mIEhUTUwgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KLIEhUTUwg5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZzogc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBodG1sKGh0bWxTdHJpbmc/OiBzdHJpbmcpOiBzdHJpbmcgfCB0aGlzIHtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gaHRtbFN0cmluZykge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgPyBlbC5pbm5lckhUTUwgOiAnJztcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhodG1sU3RyaW5nKSkge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuaW5uZXJIVE1MID0gaHRtbFN0cmluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGludmFsaWQgYXJnXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYGludmFsaWQgYXJnLiBodG1sU3RyaW5nIHR5cGU6JHt0eXBlb2YgaHRtbFN0cmluZ31gKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdGV4dCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgalF1ZXJ5IHJldHVybnMgdGhlIGNvbWJpbmVkIHRleHQgb2YgZWFjaCBlbGVtZW50LCBidXQgdGhpcyBtZXRob2QgbWFrZXMgb25seSBmaXJzdCBlbGVtZW50J3MgdGV4dC5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44Gu44OG44Kt44K544OI44KS5Y+W5b6XIDxicj5cbiAgICAgKiAgICAgalF1ZXJ5IOOBr+WQhOimgee0oOOBrumAo+e1kOODhuOCreOCueODiOOCkui/lOWNtOOBmeOCi+OBjOacrOODoeOCveODg+ODieOBr+WFiOmgreimgee0oOOBruOBv+OCkuWvvuixoeOBqOOBmeOCi1xuICAgICAqL1xuICAgIHB1YmxpYyB0ZXh0KCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIGNvbnRlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgc3BlY2lmaWVkIHRleHQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+aMh+WumuOBl+OBn+ODhuOCreOCueODiOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHRleHRcbiAgICAgKiAgLSBgZW5gIFRoZSB0ZXh0IHRvIHNldCBhcyB0aGUgY29udGVudCBvZiBlYWNoIG1hdGNoZWQgZWxlbWVudC5cbiAgICAgKiAgLSBgamFgIOimgee0oOWGheOBq+aMv+WFpeOBmeOCi+ODhuOCreOCueODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyB0ZXh0KHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyB0ZXh0KHZhbHVlPzogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBlbC50ZXh0Q29udGVudDtcbiAgICAgICAgICAgICAgICByZXR1cm4gKG51bGwgIT0gdGV4dCkgPyB0ZXh0LnRyaW0oKSA6ICcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZSA6IFN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCB0byB0aGUgZW5kIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+W8leaVsOOBp+aMh+WumuOBl+OBn+OCs+ODs+ODhuODs+ODhOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFwcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuYXBwZW5kKC4uLm5vZGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL6KaB57Sg44KS5LuW44Gu6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGFwcGVuZFRvPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGNvbnRlbnQsIHNwZWNpZmllZCBieSB0aGUgcGFyYW1ldGVyLCB0byB0aGUgYmVnaW5uaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWFiOmgreOBq+W8leaVsOOBp+aMh+WumuOBl+OBn+OCs+ODs+ODhuODs+ODhOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIHByZXBlbmQ8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGVsLnByZXBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjga7lhYjpoK3jgavmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZFRvPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5wcmVwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIE91dHNpZGVcblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIGJlZm9yZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7liY3jgavmjIflrprjgZfjgZ8gSFRNTCDjgoTopoHntKDjgpLmjL/lhaVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZW50c1xuICAgICAqICAtIGBlbmAgZWxlbWVudChzKSwgdGV4dCBub2RlKHMpLCBIVE1MIHN0cmluZywgb3IgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOBmeOCi+imgee0oCjnvqQpLCDjg4bjgq3jgrnjg4jjg47jg7zjg4ko576kKSwgSFRNTCBzdHJpbmcsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBiZWZvcmU8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uY29udGVudHMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYmVmb3JlIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBruWJjeOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBpbnNlcnRCZWZvcmU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmJlZm9yZSh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIGFmdGVyIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruW+jOOCjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGFmdGVyPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLlsuLi5jb250ZW50c10ucmV2ZXJzZSgpKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsKSAmJiBlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRvTm9kZShub2RlKSwgZWwubmV4dFNpYmxpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSW5zZXJ0IGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGFmdGVyIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeimgee0oOOBruW+jOOCjeOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBpbnNlcnRBZnRlcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYWZ0ZXIodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgQXJvdW5kXG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgYWxsIGVsZW1lbnRzIGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXBBbGw8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVEb2N1bWVudCh0aGlzKSB8fCBpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIE5vZGU7XG5cbiAgICAgICAgLy8gVGhlIGVsZW1lbnRzIHRvIHdyYXAgdGhlIHRhcmdldCBhcm91bmRcbiAgICAgICAgY29uc3QgJHdyYXAgPSAkKHNlbGVjdG9yLCBlbC5vd25lckRvY3VtZW50KS5lcSgwKS5jbG9uZSh0cnVlKSBhcyBET008RWxlbWVudD47XG5cbiAgICAgICAgaWYgKGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICR3cmFwLmluc2VydEJlZm9yZShlbCk7XG4gICAgICAgIH1cblxuICAgICAgICAkd3JhcC5tYXAoKGluZGV4OiBudW1iZXIsIGVsZW06IEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIHdoaWxlIChlbGVtLmZpcnN0RWxlbWVudENoaWxkKSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9IGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZWxlbTtcbiAgICAgICAgfSkuYXBwZW5kKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JhcCBhbiBIVE1MIHN0cnVjdHVyZSBhcm91bmQgdGhlIGNvbnRlbnQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF5YG044KSLCDmjIflrprjgZfjgZ/liKXjgqjjg6zjg6Hjg7Pjg4jjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcElubmVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICBjb25zdCBjb250ZW50cyA9ICRlbC5jb250ZW50cygpO1xuICAgICAgICAgICAgaWYgKDAgPCBjb250ZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50cy53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVsLmFwcGVuZChzZWxlY3RvciBhcyBOb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpIsIOaMh+WumuOBl+OBn+WIpeimgee0oOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICAkZWwud3JhcEFsbChzZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBwYXJlbnRzIG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00sIGxlYXZpbmcgdGhlIG1hdGNoZWQgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UuXG4gICAgICogQGphIOimgee0oOOBruimquOCqOODrOODoeODs+ODiOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHVud3JhcDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgc2VsZi5wYXJlbnQoc2VsZWN0b3IpLm5vdCgnYm9keScpLmVhY2goKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAkKGVsZW0pLnJlcGxhY2VXaXRoKGVsZW0uY2hpbGROb2Rlcyk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlbW92YWxcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYWxsIGNoaWxkIG5vZGVzIG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOWGheOBruWtkOimgee0oCjjg4bjgq3jgrnjg4jjgoLlr77osaEp44KS44GZ44G544Gm5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIGVtcHR5KCk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChlbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uIFRoaXMgbWV0aG9kIGtlZXBzIGV2ZW50IGxpc3RlbmVyIGluZm9ybWF0aW9uLlxuICAgICAqIEBqYSDopoHntKDjgpIgRE9NIOOBi+OCieWJiumZpC4g5YmK6Zmk5b6M44KC44Kk44OZ44Oz44OI44Oq44K544OK44Gv5pyJ5Yq5XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGRldGFjaDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIHJlbW92ZUVsZW1lbnQoc2VsZWN0b3IsIHRoaXMsIHRydWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIHJlbW92ZUVsZW1lbnQoc2VsZWN0b3IsIHRoaXMsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBSZXBsYWNlbWVudFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB3aXRoIHRoZSBwcm92aWRlZCBuZXcgY29udGVudCBhbmQgcmV0dXJuIHRoZSBzZXQgb2YgZWxlbWVudHMgdGhhdCB3YXMgcmVtb3ZlZC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GV44KM44Gf5Yil44Gu6KaB57Sg44KEIEhUTUwg44Go5beu44GX5pu/44GIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3Q29udGVudFxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVdpdGg8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4obmV3Q29udGVudD86IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGVsZW0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGRvbSA9ICQobmV3Q29udGVudCk7XG4gICAgICAgICAgICBpZiAoMSA9PT0gJGRvbS5sZW5ndGggJiYgaXNOb2RlRWxlbWVudCgkZG9tWzBdKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkZG9tWzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mICRkb20pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucmVwbGFjZVdpdGgoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIHRhcmdldCBlbGVtZW50IHdpdGggdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXjga7opoHntKDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVwbGFjZUFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkucmVwbGFjZVdpdGgodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTU1hbmlwdWxhdGlvbiwgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNBcnJheSxcbiAgICBjbGFzc2lmeSxcbiAgICBkYXNoZXJpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc1R5cGVEb2N1bWVudCxcbiAgICBpc1R5cGVXaW5kb3csXG4gICAgZ2V0T2Zmc2V0UGFyZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNzcygpYCAqL1xuZnVuY3Rpb24gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKHByb3BzOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPik6IFBsYWluT2JqZWN0PHN0cmluZyB8IG51bGw+IHtcbiAgICBjb25zdCByZXR2YWwgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBwcm9wcykge1xuICAgICAgICByZXR2YWxbZGFzaGVyaXplKGtleSldID0gcHJvcHNba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgZ2V0IHByb3BzICovXG5mdW5jdGlvbiBnZXREZWZhdWx0VmlldyhlbDogRWxlbWVudCk6IFdpbmRvdyB7XG4gICAgcmV0dXJuIChlbC5vd25lckRvY3VtZW50ICYmIGVsLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcpIHx8IHdpbmRvdztcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgZ2V0IHByb3BzICovXG5mdW5jdGlvbiBnZXRDb21wdXRlZFN0eWxlRnJvbShlbDogRWxlbWVudCk6IENTU1N0eWxlRGVjbGFyYXRpb24ge1xuICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgcmV0dXJuIHZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBjc3MgdmFsdWUgdG8gbnVtYmVyICovXG5mdW5jdGlvbiB0b051bWJlcih2YWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsKSB8fCAwO1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVzb2x2ZXIgPSB7XG4gICAgd2lkdGg6IFsnbGVmdCcsICdyaWdodCddLFxuICAgIGhlaWdodDogWyd0b3AnLCAnYm90dG9tJ10sXG59O1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldFBhZGRpbmcoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYHBhZGRpbmctJHtfcmVzb2x2ZXJbdHlwZV1bMF19YCkpXG4gICAgICAgICArIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYHBhZGRpbmctJHtfcmVzb2x2ZXJbdHlwZV1bMV19YCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldEJvcmRlcihzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgYm9yZGVyLSR7X3Jlc29sdmVyW3R5cGVdWzBdfS13aWR0aGApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBib3JkZXItJHtfcmVzb2x2ZXJbdHlwZV1bMV19LXdpZHRoYCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3Igc2l6ZSBjYWxjdXRpb24gKi9cbmZ1bmN0aW9uIGdldE1hcmdpbihzdHlsZTogQ1NTU3R5bGVEZWNsYXJhdGlvbiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgbWFyZ2luLSR7X3Jlc29sdmVyW3R5cGVdWzBdfWApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBtYXJnaW4tJHtfcmVzb2x2ZXJbdHlwZV1bMV19YCkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHdpZHRoKClgIGFuZCBgaGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkumZpOOBhOOBn+W5hSAoY2xpZW50V2lkdGggLyBjbGllbnRIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gZG9tWzBdLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudFtgY2xpZW50JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICAvLyAoc2Nyb2xsV2lkdGggLyBzY3JvbGxIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gZG9tWzBdLmRvY3VtZW50RWxlbWVudFtgc2Nyb2xsJHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZSA9IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpO1xuICAgICAgICAgICAgICAgIGlmICgnYm9yZGVyLWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2l6ZSAtIChnZXRCb3JkZXIoc3R5bGUsIHR5cGUpICsgZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzaXplO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgcmV0dXJuIGRvbS5jc3ModHlwZSwgaXNTdHJpbmcodmFsdWUpID8gdmFsdWUgOiBgJHt2YWx1ZX1weGApO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBpbm5lcldpZHRoKClgIGFuZCBgaW5uZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIG1hbmFnZUlubmVyU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAoY2xpZW50V2lkdGggLyBjbGllbnRIZWlnaHQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsW2BjbGllbnQke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSBpc1RleHRQcm9wID8gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSkgOiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCArIGdldEJvcmRlcihzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyB0eXBlIFBhcnNlT3V0ZXJTaXplQXJnc1Jlc3VsdCA9IHsgaW5jbHVkZU1hcmdpbjogYm9vbGVhbjsgdmFsdWU6IG51bWJlciB8IHN0cmluZzsgfTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzOiB1bmtub3duW10pOiBQYXJzZU91dGVyU2l6ZUFyZ3NSZXN1bHQge1xuICAgIGxldCBbdmFsdWUsIGluY2x1ZGVNYXJnaW5dID0gYXJncztcbiAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSAmJiAhaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIGluY2x1ZGVNYXJnaW4gPSAhIXZhbHVlO1xuICAgICAgICB2YWx1ZSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHsgaW5jbHVkZU1hcmdpbiwgdmFsdWUgfSBhcyBQYXJzZU91dGVyU2l6ZUFyZ3NSZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgb3V0ZXJXaWR0aCgpYCBhbmQgYG91dGVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VPdXRlclNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCBpbmNsdWRlTWFyZ2luOiBib29sZWFuLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSkge1xuICAgICAgICAgICAgLy8g44K544Kv44Ot44O844Or44OQ44O844KS5ZCr44KB44Gf5bmFIChpbm5lcldpZHRoIC8gaW5uZXJIZWlnaHQpXG4gICAgICAgICAgICByZXR1cm4gZG9tWzBdW2Bpbm5lciR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hbmFnZVNpemVGb3IoZG9tIGFzIERPTVN0eWxlczxUPiwgdHlwZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIC8vIChvZmZzZXRXaWR0aCAvIG9mZnNldEhlaWdodClcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBnZXRPZmZzZXRTaXplKGVsLCB0eXBlKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZU1hcmdpbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldCArIGdldE1hcmdpbihzdHlsZSwgdHlwZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgIC8vIHNldHRlciAobm8gcmVhY3Rpb24pXG4gICAgICAgIHJldHVybiBkb207XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIGNvbnN0IGlzVGV4dFByb3AgPSBpc1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgZG9tKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHN0eWxlLCBuZXdWYWwgfSA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RleHRQcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hcmdpbiA9IGluY2x1ZGVNYXJnaW4gPyBnZXRNYXJnaW4oc3R5bGUsIHR5cGUpIDogMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsID0gKGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlKSAtIG1hcmdpbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdjb250ZW50LWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRCb3JkZXIoc3R5bGUsIHR5cGUpIC0gZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWx9cHhgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgcG9zaXRpb24oKWAgYW5kIGBvZmZzZXQoKWAgKi9cbmZ1bmN0aW9uIGdldE9mZnNldFBvc2l0aW9uKGVsOiBFbGVtZW50KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAvLyBmb3IgZGlzcGxheSBub25lXG4gICAgaWYgKGVsLmdldENsaWVudFJlY3RzKCkubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgfVxuXG4gICAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiByZWN0LnRvcCArIHZpZXcucGFnZVlPZmZzZXQsXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHZpZXcucGFnZVhPZmZzZXRcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgb2Zmc2V0W1dpZHRoIHwgSGVpZ2h0XS4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNlW1dpZHRoIHwgSGVpZ2h0XSDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRTaXplKGVsOiBIVE1MT3JTVkdFbGVtZW50LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIGlmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICByZXR1cm4gZWxbYG9mZnNldCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIFNWR0VsZW1lbnQg44GvIG9mZnNldFdpZHRoIOOBjOOCteODneODvOODiOOBleOCjOOBquOBhFxuICAgICAgICAgKiAgICAgICAgZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkg44GvIHRyYW5zZm9ybSDjgavlvbHpn7/jgpLlj5fjgZHjgovjgZ/jgoEsXG4gICAgICAgICAqICAgICAgICDlrprnvqnpgJrjgoogYm9yZGVyLCBwYWRkaW4g44KS5ZCr44KB44Gf5YCk44KS566X5Ye644GZ44KLXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsIGFzIFNWR0VsZW1lbnQpO1xuICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgc3R5bGUgbWFuYWdlbWVudCBtZXRob2RzLlxuICogQGphIOOCueOCv+OCpOODq+mWoumAo+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU3R5bGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU3R5bGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjb21wdXRlZCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBDU1Mg44Gr6Kit5a6a44GV44KM44Gm44GE44KL44OX44Ot44OR44OG44Kj5YCk44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3jgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IHZhbHVlIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlgKTjgpLmloflrZfliJfjgafov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG11bHRpcGxlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLopIfmlbDlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXJyYXkgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3phY3liJfjgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5LXZhbHVlIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWVzOiBzdHJpbmdbXSk6IFBsYWluT2JqZWN0PHN0cmluZz47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IENTUyBwcm9wZXJ0aXkgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44GuIENTUyDjg5fjg63jg5Hjg4bjgqPjgavlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgc3RyaW5nIHZhbHVlIHRvIHNldCBmb3IgdGhlIHByb3BlcnR5LiBpZiBudWxsIHBhc3NlZCwgcmVtb3ZlIHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5paH5a2X5YiX44Gn5oyH5a6aLiBudWxsIOaMh+WumuOBp+WJiumZpC5cbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bGwpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBvbmUgb3IgbW9yZSBDU1MgcHJvcGVydGllcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOikh+aVsOOBruODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnRpZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBwcm9wZXJ0eS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj44KS5qC857SN44GX44Gf44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcHVibGljIGNzcyhwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdIHwgUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4sIHZhbHVlPzogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IFBsYWluT2JqZWN0PHN0cmluZz4gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/ICcnIDogdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKGRhc2hlcml6ZShuYW1lKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShuYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgLy8gZ2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShrZXkpO1xuICAgICAgICAgICAgICAgIHByb3BzW2tleV0gPSB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpLmdldFByb3BlcnR5VmFsdWUocHJvcE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKG5hbWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUgfSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gcHJvcHNbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgcHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/mqKrluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruaoquW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+eri+W5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7nuKbluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgb3V0ZXIgd2lkdGggKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCguLi5hcmdzOiB1bmtub3duW10pOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9ID0gcGFyc2VPdXRlclNpemVBcmdzKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gbWFuYWdlT3V0ZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBvdXRlciBoZWlnaHQgKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo57im5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIG91dGVyIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKiBAcGFyYW0gaW5jbHVkZU1hcmdpblxuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciB0byBpbmNsdWRlIHRoZSBlbGVtZW50J3MgbWFyZ2luIGluIHRoZSBjYWxjdWxhdGlvbi5cbiAgICAgKiAgLSBgamFgIOODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOCi+WgtOWQiOOBryB0cnVlIOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBvdXRlckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoLi4uYXJnczogdW5rbm93bltdKTogbnVtYmVyIHwgdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgaW5jbHVkZU1hcmdpbiwgdmFsdWUgfSA9IHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIG1hbmFnZU91dGVyU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIG9mZnNldCBwYXJlbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruimquimgee0oOOBi+OCieOBruebuOWvvueahOOBquihqOekuuS9jee9ruOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBwb3NpdGlvbigpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0ge1xuICAgICAgICAvLyB2YWxpZCBlbGVtZW50c1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG9mZnNldDogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9O1xuICAgICAgICBsZXQgcGFyZW50T2Zmc2V0ID0geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCBtYXJnaW5Ub3A6IG10LCBtYXJnaW5MZWZ0OiBtbCB9ID0gJChlbCkuY3NzKFsncG9zaXRpb24nLCAnbWFyZ2luVG9wJywgJ21hcmdpbkxlZnQnXSk7XG4gICAgICAgIGNvbnN0IG1hcmdpblRvcCA9IHRvTnVtYmVyKG10KTtcbiAgICAgICAgY29uc3QgbWFyZ2luTGVmdCA9IHRvTnVtYmVyKG1sKTtcblxuICAgICAgICAvLyBwb3NpdGlvbjpmaXhlZCBlbGVtZW50cyBhcmUgb2Zmc2V0IGZyb20gdGhlIHZpZXdwb3J0LCB3aGljaCBpdHNlbGYgYWx3YXlzIGhhcyB6ZXJvIG9mZnNldFxuICAgICAgICBpZiAoJ2ZpeGVkJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIEFzc3VtZSBwb3NpdGlvbjpmaXhlZCBpbXBsaWVzIGF2YWlsYWJpbGl0eSBvZiBnZXRCb3VuZGluZ0NsaWVudFJlY3RcbiAgICAgICAgICAgIG9mZnNldCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2Zmc2V0ID0gZ2V0T2Zmc2V0UG9zaXRpb24oZWwpO1xuXG4gICAgICAgICAgICAvLyBBY2NvdW50IGZvciB0aGUgKnJlYWwqIG9mZnNldCBwYXJlbnQsIHdoaWNoIGNhbiBiZSB0aGUgZG9jdW1lbnQgb3IgaXRzIHJvb3QgZWxlbWVudFxuICAgICAgICAgICAgLy8gd2hlbiBhIHN0YXRpY2FsbHkgcG9zaXRpb25lZCBlbGVtZW50IGlzIGlkZW50aWZpZWRcbiAgICAgICAgICAgIGNvbnN0IGRvYyA9IGVsLm93bmVyRG9jdW1lbnQ7XG4gICAgICAgICAgICBsZXQgb2Zmc2V0UGFyZW50ID0gZ2V0T2Zmc2V0UGFyZW50KGVsKSB8fCBkb2MuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICAgICAgbGV0ICRvZmZzZXRQYXJlbnQgPSAkKG9mZnNldFBhcmVudCk7XG4gICAgICAgICAgICB3aGlsZSAob2Zmc2V0UGFyZW50ICYmXG4gICAgICAgICAgICAgICAgKG9mZnNldFBhcmVudCA9PT0gZG9jLmJvZHkgfHwgb2Zmc2V0UGFyZW50ID09PSBkb2MuZG9jdW1lbnRFbGVtZW50KSAmJlxuICAgICAgICAgICAgICAgICdzdGF0aWMnID09PSAkb2Zmc2V0UGFyZW50LmNzcygncG9zaXRpb24nKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0UGFyZW50ID0gb2Zmc2V0UGFyZW50LnBhcmVudE5vZGUgYXMgRWxlbWVudDtcbiAgICAgICAgICAgICAgICAkb2Zmc2V0UGFyZW50ID0gJChvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9mZnNldFBhcmVudCAmJiBvZmZzZXRQYXJlbnQgIT09IGVsICYmIE5vZGUuRUxFTUVOVF9OT0RFID09PSBvZmZzZXRQYXJlbnQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAvLyBJbmNvcnBvcmF0ZSBib3JkZXJzIGludG8gaXRzIG9mZnNldCwgc2luY2UgdGhleSBhcmUgb3V0c2lkZSBpdHMgY29udGVudCBvcmlnaW5cbiAgICAgICAgICAgICAgICBwYXJlbnRPZmZzZXQgPSBnZXRPZmZzZXRQb3NpdGlvbihvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgYm9yZGVyVG9wV2lkdGgsIGJvcmRlckxlZnRXaWR0aCB9ID0gJG9mZnNldFBhcmVudC5jc3MoWydib3JkZXJUb3BXaWR0aCcsICdib3JkZXJMZWZ0V2lkdGgnXSk7XG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0LnRvcCArPSB0b051bWJlcihib3JkZXJUb3BXaWR0aCk7XG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0LmxlZnQgKz0gdG9OdW1iZXIoYm9yZGVyTGVmdFdpZHRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN1YnRyYWN0IHBhcmVudCBvZmZzZXRzIGFuZCBlbGVtZW50IG1hcmdpbnNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvcDogb2Zmc2V0LnRvcCAtIHBhcmVudE9mZnNldC50b3AgLSBtYXJnaW5Ub3AsXG4gICAgICAgICAgICBsZWZ0OiBvZmZzZXQubGVmdCAtIHBhcmVudE9mZnNldC5sZWZ0IC0gbWFyZ2luTGVmdCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgcmVsYXRpdmUgdG8gdGhlIGRvY3VtZW50LlxuICAgICAqIEBqYSBkb2N1bWVudCDjgpLln7rmupbjgajjgZfjgaYsIOODnuODg+ODgeOBl+OBpuOBhOOCi+imgee0oOmbhuWQiOOBrjHjgaTnm67jga7opoHntKDjga7nj77lnKjjga7luqfmqJnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0KCk6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXMgb2YgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBkb2N1bWVudC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GrIGRvY3VtZW50IOOCkuWfuua6luOBq+OBl+OBn+ePvuWcqOW6p+aomeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNvb3JkaW5hdGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgcHJvcGVydGllcyBgdG9wYCBhbmQgYGxlZnRgLlxuICAgICAqICAtIGBqYWAgYHRvcGAsIGBsZWZ0YCDjg5fjg63jg5Hjg4bjgqPjgpLlkKvjgoDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0KGNvb3JkaW5hdGVzOiB7IHRvcD86IG51bWJlcjsgbGVmdD86IG51bWJlcjsgfSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb2Zmc2V0KGNvb3JkaW5hdGVzPzogeyB0b3A/OiBudW1iZXI7IGxlZnQ/OiBudW1iZXI7IH0pOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH0gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSBjb29yZGluYXRlcyA/IHsgdG9wOiAwLCBsZWZ0OiAwIH0gOiB0aGlzO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gY29vcmRpbmF0ZXMpIHtcbiAgICAgICAgICAgIC8vIGdldFxuICAgICAgICAgICAgcmV0dXJuIGdldE9mZnNldFBvc2l0aW9uKHRoaXNbMF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wczogeyB0b3A/OiBzdHJpbmc7IGxlZnQ/OiBzdHJpbmc7IH0gPSB7fTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHBvc2l0aW9uLCB0b3A6IGNzc1RvcCwgbGVmdDogY3NzTGVmdCB9ID0gJGVsLmNzcyhbJ3Bvc2l0aW9uJywgJ3RvcCcsICdsZWZ0J10pO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHBvc2l0aW9uIGZpcnN0LCBpbi1jYXNlIHRvcC9sZWZ0IGFyZSBzZXQgZXZlbiBvbiBzdGF0aWMgZWxlbVxuICAgICAgICAgICAgICAgIGlmICgnc3RhdGljJyA9PT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgY3VyT2Zmc2V0ID0gJGVsLm9mZnNldCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1clBvc2l0aW9uID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmVlZENhbGN1bGF0ZVBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICA9ICgnYWJzb2x1dGUnID09PSBwb3NpdGlvbiB8fCAnZml4ZWQnID09PSBwb3NpdGlvbikgJiYgKGNzc1RvcCArIGNzc0xlZnQpLmluY2x1ZGVzKCdhdXRvJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZWVkQ2FsY3VsYXRlUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkZWwucG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHRvcDogdG9OdW1iZXIoY3NzVG9wKSwgbGVmdDogdG9OdW1iZXIoY3NzTGVmdCkgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBjb29yZGluYXRlcy50b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcHMudG9wID0gYCR7KGNvb3JkaW5hdGVzLnRvcCAtIGN1ck9mZnNldC50b3ApICsgY3VyUG9zaXRpb24udG9wfXB4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY29vcmRpbmF0ZXMubGVmdCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9wcy5sZWZ0ID0gYCR7KGNvb3JkaW5hdGVzLmxlZnQgLSBjdXJPZmZzZXQubGVmdCkgKyBjdXJQb3NpdGlvbi5sZWZ0fXB4YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkZWwuY3NzKHByb3BzIGFzIFBsYWluT2JqZWN0PHN0cmluZz4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVN0eWxlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgbm8taW52YWxpZC10aGlzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgY29tYmluYXRpb24sXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSwgaXNUeXBlRWxlbWVudCB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBJbnRlcm5hbEV2ZW50TGlzdGVuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBJbnRlcm5hbEV2ZW50TGlzdGVuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEV2ZW50Q29udGV4dCB7XG4gICAgW2Nvb2tpZTogc3RyaW5nXTogQmluZEluZm87XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgID0gJ3wnLFxuICAgIEFERFJFU1NfRVZFTlQgICAgID0gMCxcbiAgICBBRERSRVNTX05BTUVTUEFDRSA9IDEsXG4gICAgQUREUkVTU19PUFRJT05TICAgPSAyLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2V2ZW50Q29udGV4dE1hcCA9IHtcbiAgICBldmVudERhdGE6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCB1bmtub3duW10+KCksXG4gICAgZXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCBCaW5kRXZlbnRDb250ZXh0PigpLFxuICAgIGxpdmVFdmVudExpc3RlbmVyczogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIEJpbmRFdmVudENvbnRleHQ+KCksXG59O1xuXG4vKiogQGludGVybmFsIHF1ZXJ5IGV2ZW50LWRhdGEgZnJvbSBlbGVtZW50ICovXG5mdW5jdGlvbiBxdWVyeUV2ZW50RGF0YShldmVudDogRXZlbnQpOiB1bmtub3duW10ge1xuICAgIGNvbnN0IGRhdGEgPSBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5nZXQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpIHx8IFtdO1xuICAgIGRhdGEudW5zaGlmdChldmVudCk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZXZlbnQtZGF0YSB3aXRoIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudERhdGE6IHVua25vd25bXSk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLnNldChlbGVtLCBldmVudERhdGEpO1xufVxuXG4vKiogQGludGVybmFsIGRlbGV0ZSBldmVudC1kYXRhIGJ5IGVsZW1lbnQgKi9cbmZ1bmN0aW9uIGRlbGV0ZUV2ZW50RGF0YShlbGVtOiBFbGVtZW50QmFzZSk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmRlbGV0ZShlbGVtKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBub3JtYWxpemUgZXZlbnQgbmFtZXNwYWNlICovXG5mdW5jdGlvbiBub3JtYWxpemVFdmVudE5hbWVzcGFjZXMoZXZlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgbmFtZXNwYWNlcyA9IGV2ZW50LnNwbGl0KCcuJyk7XG4gICAgY29uc3QgbWFpbiA9IG5hbWVzcGFjZXMuc2hpZnQoKSBhcyBzdHJpbmc7XG4gICAgaWYgKCFuYW1lc3BhY2VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbWFpbjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lc3BhY2VzLnNvcnQoKTtcbiAgICAgICAgcmV0dXJuIGAke21haW59LiR7bmFtZXNwYWNlcy5qb2luKCcuJyl9YDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgc3BsaXQgZXZlbnQgbmFtZXNwYWNlcyAqL1xuZnVuY3Rpb24gc3BsaXRFdmVudE5hbWVzcGFjZXMoZXZlbnQ6IHN0cmluZyk6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdIHtcbiAgICBjb25zdCByZXR2YWw6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdID0gW107XG5cbiAgICBjb25zdCBuYW1lc3BhY2VzID0gZXZlbnQuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBtYWluID0gbmFtZXNwYWNlcy5zaGlmdCgpIGFzIHN0cmluZztcblxuICAgIGlmICghbmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBtYWluLCBuYW1lc3BhY2U6ICcnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5hbWVzcGFjZXMuc29ydCgpO1xuXG4gICAgICAgIGNvbnN0IGNvbWJvczogc3RyaW5nW11bXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gbmFtZXNwYWNlcy5sZW5ndGg7IGkgPj0gMTsgaS0tKSB7XG4gICAgICAgICAgICBjb21ib3MucHVzaCguLi5jb21iaW5hdGlvbihuYW1lc3BhY2VzLCBpKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBgLiR7bmFtZXNwYWNlcy5qb2luKCcuJyl9LmA7XG4gICAgICAgIHJldHZhbC5wdXNoKHsgdHlwZTogbWFpbiwgbmFtZXNwYWNlOiBzaWduYXR1cmUgfSk7XG4gICAgICAgIGZvciAoY29uc3QgbnMgb2YgY29tYm9zKSB7XG4gICAgICAgICAgICByZXR2YWwucHVzaCh7IHR5cGU6IGAke21haW59LiR7bnMuam9pbignLicpfWAsIG5hbWVzcGFjZTogc2lnbmF0dXJlIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldHZhbDtcbn1cblxuLyoqIEBpbnRlcm5hbCByZXZlcnNlIHJlc29sdXRpb24gZXZlbnQgbmFtZXNwYWNlcyAqL1xuZnVuY3Rpb24gcmVzb2x2ZUV2ZW50TmFtZXNwYWNlcyhlbGVtOiBFbGVtZW50QmFzZSwgZXZlbnQ6IHN0cmluZyk6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdIHtcbiAgICBjb25zdCByZXR2YWw6IHsgdHlwZTogc3RyaW5nOyBuYW1lc3BhY2U6IHN0cmluZzsgfVtdID0gW107XG5cbiAgICBjb25zdCBuYW1lc3BhY2VzID0gZXZlbnQuc3BsaXQoJy4nKTtcbiAgICBjb25zdCBtYWluID0gbmFtZXNwYWNlcy5zaGlmdCgpIGFzIHN0cmluZztcbiAgICBjb25zdCB0eXBlID0gbm9ybWFsaXplRXZlbnROYW1lc3BhY2VzKGV2ZW50KTtcblxuICAgIGlmICghbmFtZXNwYWNlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dmFsLnB1c2goeyB0eXBlOiBtYWluLCBuYW1lc3BhY2U6ICcnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29va2llcyA9IE9iamVjdC5rZXlzKGNvbnRleHQpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2lnbmF0dXJlcyA9IGNvb2tpZXMuZmlsdGVyKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlID09PSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUilbQ29uc3QuQUREUkVTU19FVkVOVF07XG4gICAgICAgICAgICAgICAgfSkubWFwKGNvb2tpZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUilbQ29uc3QuQUREUkVTU19OQU1FU1BBQ0VdO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2libGluZ3MgPSBjb29raWVzLmZpbHRlcihjb29raWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNpZ25hdHVyZSBvZiBzaWduYXR1cmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2lnbmF0dXJlID09PSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUilbQ29uc3QuQUREUkVTU19OQU1FU1BBQ0VdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pLm1hcChjb29raWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWVkID0gY29va2llLnNwbGl0KENvbnN0LkNPT0tJRV9TRVBBUkFUT1IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBzZWVkW0NvbnN0LkFERFJFU1NfRVZFTlRdLCBuYW1lc3BhY2U6IHNlZWRbQ29uc3QuQUREUkVTU19OQU1FU1BBQ0VdIH07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5zaWJsaW5ncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgICAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgICAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0dmFsO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgZXZlbnQgY29va2llIGZyb20gZXZlbnQgbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMgKi9cbmZ1bmN0aW9uIHRvQ29va2llKGV2ZW50OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgY29uc3Qgb3B0cyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgIGRlbGV0ZSBvcHRzLm9uY2U7XG4gICAgcmV0dXJuIGAke2V2ZW50fSR7Q29uc3QuQ09PS0lFX1NFUEFSQVRPUn0ke25hbWVzcGFjZX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtKU09OLnN0cmluZ2lmeShvcHRzKX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtzZWxlY3Rvcn1gO1xufVxuXG4vKiogQGludGVybmFsIGdldCBsaXN0ZW5lciBoYW5kbGVycyBjb250ZXh0IGJ5IGVsZW1lbnQgYW5kIGV2ZW50ICovXG5mdW5jdGlvbiBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZywgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMsIGVuc3VyZTogYm9vbGVhbik6IEJpbmRJbmZvIHtcbiAgICBjb25zdCBldmVudExpc3RlbmVycyA9IHNlbGVjdG9yID8gX2V2ZW50Q29udGV4dE1hcC5saXZlRXZlbnRMaXN0ZW5lcnMgOiBfZXZlbnRDb250ZXh0TWFwLmV2ZW50TGlzdGVuZXJzO1xuICAgIGlmICghZXZlbnRMaXN0ZW5lcnMuaGFzKGVsZW0pKSB7XG4gICAgICAgIGlmIChlbnN1cmUpIHtcbiAgICAgICAgICAgIGV2ZW50TGlzdGVuZXJzLnNldChlbGVtLCB7fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb250ZXh0ID0gZXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pIGFzIEJpbmRFdmVudENvbnRleHQ7XG4gICAgY29uc3QgY29va2llID0gdG9Db29raWUoZXZlbnQsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHF1ZXJ5IGFsbCBldmVudCBhbmQgaGFuZGxlciBieSBlbGVtZW50LCBmb3IgYWxsIGBvZmYoKWAgYW5kIGBjbG9uZSh0cnVlKWAgKi9cbmZ1bmN0aW9uIGV4dHJhY3RBbGxIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgcmVtb3ZlID0gdHJ1ZSk6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10ge1xuICAgIGNvbnN0IGhhbmRsZXJzOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IG9iamVjdDsgfVtdID0gW107XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBPYmplY3Qua2V5cyhjb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzZWVkW0NvbnN0LkFERFJFU1NfRVZFTlRdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBKU09OLnBhcnNlKHNlZWRbQ29uc3QuQUREUkVTU19PUFRJT05TXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGNvbnRleHRbY29va2llXS5oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgbGl2ZUV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBuYW1lc3BhY2UgZXZlbnQgYW5kIGhhbmRsZXIgYnkgZWxlbWVudCwgZm9yIGBvZmYoYC4ke25hbWVzcGFjZX1gKWAgKi9cbmZ1bmN0aW9uIGV4dHJhY3ROYW1lc3BhY2VIYW5kbGVycyhlbGVtOiBFbGVtZW50QmFzZSwgbmFtZXNwYWNlczogc3RyaW5nKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBvYmplY3Q7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogb2JqZWN0OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IG5hbWVzID0gbmFtZXNwYWNlcy5zcGxpdCgnLicpLmZpbHRlcihuID0+ICEhbik7XG4gICAgY29uc3QgbmFtZXNwYWNlRmlsdGVyID0gKGNvb2tpZTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgbmFtZXNwYWNlIG9mIG5hbWVzKSB7XG4gICAgICAgICAgICBpZiAoY29va2llLmluY2x1ZGVzKGAuJHtuYW1lc3BhY2V9LmApKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogdm9pZCA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBjb29raWVzID0gT2JqZWN0LmtleXMoY29udGV4dCkuZmlsdGVyKG5hbWVzcGFjZUZpbHRlcik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBjb29raWVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbQ29uc3QuQUREUkVTU19FVkVOVF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFtDb25zdC5BRERSRVNTX09QVElPTlNdKTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzOiBfaGFuZGxlcnMgfSA9IGNvbnRleHRbY29va2llXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgX2hhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goeyBldmVudCwgaGFuZGxlcjogaGFuZGxlci5wcm94eSwgb3B0aW9ucyB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuICAgIHF1ZXJ5KGxpdmVFdmVudExpc3RlbmVycy5nZXQoZWxlbSkpO1xuXG4gICAgcmV0dXJuIGhhbmRsZXJzO1xufVxuXG4vKiogQGludGVybmFsICovXG50eXBlIFBhcnNlRXZlbnRBcmdzUmVzdWx0ID0ge1xuICAgIHR5cGU6IHN0cmluZ1tdO1xuICAgIHNlbGVjdG9yOiBzdHJpbmc7XG4gICAgbGlzdGVuZXI6IEludGVybmFsRXZlbnRMaXN0ZW5lcjtcbiAgICBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucztcbn07XG5cbi8qKiBAaW50ZXJuYWwgcGFyc2UgZXZlbnQgYXJncyAqL1xuZnVuY3Rpb24gcGFyc2VFdmVudEFyZ3MoLi4uYXJnczogdW5rbm93bltdKTogUGFyc2VFdmVudEFyZ3NSZXN1bHQge1xuICAgIGxldCBbdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgIFt0eXBlLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgICAgICBzZWxlY3RvciA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICB0eXBlID0gIXR5cGUgPyBbXSA6IChpc0FycmF5KHR5cGUpID8gdHlwZSA6IFt0eXBlXSk7XG4gICAgc2VsZWN0b3IgPSBzZWxlY3RvciB8fCAnJztcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSBpZiAodHJ1ZSA9PT0gb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0geyBjYXB0dXJlOiB0cnVlIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gYXMgUGFyc2VFdmVudEFyZ3NSZXN1bHQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX25vVHJpZ2dlciA9IFsncmVzaXplJywgJ3Njcm9sbCddO1xuXG4vKiogQGludGVybmFsIGV2ZW50LXNob3J0Y3V0IGltcGwgKi9cbmZ1bmN0aW9uIGV2ZW50U2hvcnRjdXQ8VCBleHRlbmRzIEVsZW1lbnRCYXNlPih0aGlzOiBET01FdmVudHM8VD4sIG5hbWU6IHN0cmluZywgaGFuZGxlcj86IEV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiBET01FdmVudHM8VD4ge1xuICAgIGlmIChudWxsID09IGhhbmRsZXIpIHtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoIV9ub1RyaWdnZXIuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihlbFtuYW1lXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxbbmFtZV0oKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGVsIGFzIGFueSkudHJpZ2dlcihuYW1lIGFzIGFueSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKG5hbWUgYXMgYW55LCBoYW5kbGVyIGFzIGFueSwgb3B0aW9ucyk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNsb25lKClgICovXG5mdW5jdGlvbiBjbG9uZUV2ZW50KHNyYzogRWxlbWVudCwgZHN0OiBFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0QWxsSGFuZGxlcnMoc3JjLCBmYWxzZSk7XG4gICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgIGRzdC5hZGRFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRWxlbWVudChlbGVtOiBFbGVtZW50LCB3aXRoRXZlbnRzOiBib29sZWFuLCBkZWVwOiBib29sZWFuKTogRWxlbWVudCB7XG4gICAgY29uc3QgY2xvbmUgPSBlbGVtLmNsb25lTm9kZSh0cnVlKSBhcyBFbGVtZW50O1xuXG4gICAgaWYgKHdpdGhFdmVudHMpIHtcbiAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIGNvbnN0IHNyY0VsZW1lbnRzID0gZWxlbS5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgICAgICBjb25zdCBkc3RFbGVtZW50cyA9IGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2luZGV4XSBvZiBzcmNFbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBjbG9uZUV2ZW50KHNyY0VsZW1lbnRzW2luZGV4XSwgZHN0RWxlbWVudHNbaW5kZXhdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsb25lRXZlbnQoZWxlbSwgY2xvbmUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb25lO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCAqL1xuZXhwb3J0IHR5cGUgRE9NRXZlbnRNYXA8VD5cbiAgICA9IFQgZXh0ZW5kcyBXaW5kb3cgPyBXaW5kb3dFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIERvY3VtZW50ID8gRG9jdW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxCb2R5RWxlbWVudCA/IEhUTUxCb2R5RWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTE1lZGlhRWxlbWVudCA/IEhUTUxNZWRpYUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxFbGVtZW50ID8gSFRNTEVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEVsZW1lbnQgPyBFbGVtZW50RXZlbnRNYXBcbiAgICA6IEdsb2JhbEV2ZW50SGFuZGxlcnNFdmVudE1hcDtcbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCAqL1xuXG5leHBvcnQgdHlwZSBET01FdmVudExpc3RlbmVyPFQgPSBIVE1MRWxlbWVudCwgTSBleHRlbmRzIERPTUV2ZW50TWFwPFQ+ID0gRE9NRXZlbnRNYXA8VD4+ID0gKGV2ZW50OiBNW2tleW9mIE1dLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd25cblxuZXhwb3J0IHR5cGUgRXZlbnRXaXRoTmFtZXNwYWNlPFQgZXh0ZW5kcyBET01FdmVudE1hcDx1bmtub3duPj4gPSBrZXlvZiBUIHwgYCR7c3RyaW5nICYga2V5b2YgVH0uJHtzdHJpbmd9YDtcbmV4cG9ydCB0eXBlIE1ha2VFdmVudFR5cGU8VCwgTT4gPSBUIGV4dGVuZHMga2V5b2YgTSA/IGtleW9mIE0gOiAoVCBleHRlbmRzIGAke3N0cmluZyAmIGtleW9mIE19LiR7aW5mZXIgQ31gID8gYCR7c3RyaW5nICYga2V5b2YgTX0uJHtDfWAgOiBuZXZlcik7XG5leHBvcnQgdHlwZSBFdmVudFR5cGU8VCBleHRlbmRzIERPTUV2ZW50TWFwPHVua25vd24+PiA9IE1ha2VFdmVudFR5cGU8RXZlbnRXaXRoTmFtZXNwYWNlPFQ+LCBUPjtcbmV4cG9ydCB0eXBlIEV2ZW50VHlwZU9yTmFtZXNwYWNlPFQgZXh0ZW5kcyBET01FdmVudE1hcDx1bmtub3duPj4gPSBFdmVudFR5cGU8VD4gfCBgLiR7c3RyaW5nfWA7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgZXZlbnQgbWFuYWdlbWVudHMuXG4gKiBAamEg44Kk44OZ44Oz44OI566h55CG44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FdmVudHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgYmFzaWNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb24oLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUxpdmVFdmVudChlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgY29uc3QgZXZlbnREYXRhID0gcXVlcnlFdmVudERhdGEoZSk7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChlLnRhcmdldCBhcyBFbGVtZW50IHwgbnVsbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkoJHRhcmdldFswXSwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXJlbnQgb2YgJHRhcmdldC5wYXJlbnRzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50KS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHBhcmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBxdWVyeUV2ZW50RGF0YShlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm94eSA9IHNlbGVjdG9yID8gaGFuZGxlTGl2ZUV2ZW50IDogaGFuZGxlRXZlbnQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbWJvcyA9IHNwbGl0RXZlbnROYW1lc3BhY2VzKGV2ZW50KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbWJvIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHR5cGUsIG5hbWVzcGFjZSB9ID0gY29tYm87XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIHR5cGUsIG5hbWVzcGFjZSwgc2VsZWN0b3IsIG9wdGlvbnMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJlZCAmJiAhcmVnaXN0ZXJlZC5oYXMobGlzdGVuZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmFkZChsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm94eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQgW1tvbl1dIG9yIFtbb25jZV1dIGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiBbW29uXV0g44G+44Gf44GvIFtbb25jZV1dIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZU9yTmFtZXNwYWNlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPilbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlT3JOYW1lc3BhY2U8VEV2ZW50TWFwPiB8IChFdmVudFR5cGVPck5hbWVzcGFjZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBsaXN0ZW5lcj86IERPTUV2ZW50TGlzdGVuZXI8VEVsZW1lbnQsIFRFdmVudE1hcD4sXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlci5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44GZ44G544Gm44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIG9mZigpOiB0aGlzO1xuXG4gICAgcHVibGljIG9mZiguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgaWYgKGV2ZW50cy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dHMgPSBleHRyYWN0QWxsSGFuZGxlcnMoZWwpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29udGV4dCBvZiBjb250ZXh0cykge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGNvbnRleHQuZXZlbnQsIGNvbnRleHQuaGFuZGxlciwgY29udGV4dC5vcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3ROYW1lc3BhY2VIYW5kbGVycyhlbCwgZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21ib3MgPSByZXNvbHZlRXZlbnROYW1lc3BhY2VzKGVsLCBldmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbWJvIG9mIGNvbWJvcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHlwZSwgbmFtZXNwYWNlIH0gPSBjb21ibztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsLCB0eXBlLCBuYW1lc3BhY2UsIHNlbGVjdG9yLCBvcHRpb25zLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCBoYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGhhbmRsZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7IC8vIGJhY2t3YXJkIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IGhhbmRsZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyLm9yaWdpbiAmJiBoYW5kbGVyLmxpc3RlbmVyLm9yaWdpbiA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCFsaXN0ZW5lcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgaGFuZGxlci5wcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQuZGVsZXRlKGhhbmRsZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZS4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIOS4gOW6puOBoOOBkeWRvOOBs+WHuuOBleOCjOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr5a++44GX44Gm44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IEV2ZW50VHlwZTxURXZlbnRNYXA+IHwgKEV2ZW50VHlwZTxURXZlbnRNYXA+KVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogRE9NRXZlbnRMaXN0ZW5lcjxURWxlbWVudCwgVEV2ZW50TWFwPixcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZTogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCAoRXZlbnRUeXBlPFRFdmVudE1hcD4pW10sXG4gICAgICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RlbmVyPFRFbGVtZW50LCBURXZlbnRNYXA+LFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBvbmNlKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7IC4uLm9wdGlvbnMsIC4uLnsgb25jZTogdHJ1ZSB9IH07XG5cbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGZ1bmN0aW9uIG9uY2VIYW5kbGVyKHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIC4uLmV2ZW50QXJnczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBldmVudEFyZ3MpO1xuICAgICAgICAgICAgc2VsZi5vZmYodHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgICAgICAgICBkZWxldGUgb25jZUhhbmRsZXIub3JpZ2luO1xuICAgICAgICB9XG4gICAgICAgIG9uY2VIYW5kbGVyLm9yaWdpbiA9IGxpc3RlbmVyIGFzIEludGVybmFsRXZlbnRMaXN0ZW5lciB8IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHRoaXMub24odHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYWxsIGhhbmRsZXJzIGFkZGVkIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgavlr77jgZfjgabjgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogLy8gdy8gZXZlbnQtbmFtZXNwYWNlIGJlaGF2aW91clxuICAgICAqICQoJy5saW5rJykub24oJ2NsaWNrLmhvZ2UucGl5bycsIChlKSA9PiB7IC4uLiB9KTtcbiAgICAgKiAkKCcubGluaycpLm9uKCdjbGljay5ob2dlJywgIChlKSA9PiB7IC4uLiB9KTtcbiAgICAgKlxuICAgICAqICQoJy5saW5rJykudHJpZ2dlcignLmhvZ2UnKTsgICAgICAgICAgIC8vIGNvbXBpbGUgZXJyb3IuIChub3QgZmlyZSlcbiAgICAgKiAkKCcubGluaycpLnRyaWdnZXIoJ2NsaWNrLmhvZ2UnKTsgICAgICAvLyBmaXJlIGJvdGguXG4gICAgICogJCgnLmxpbmsnKS50cmlnZ2VyKCdjbGljay5ob2dlLnBpeW8nKTsgLy8gZmlyZSBvbmx5IGZpcnN0IG9uZVxuICAgICAqIGBgYFxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuIC8gYEV2ZW50YCBpbnN0YW5jZSBvciBgRXZlbnRgIGluc3RhbmNlIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXIC8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrnphY3liJdcbiAgICAgKiBAcGFyYW0gZXZlbnREYXRhXG4gICAgICogIC0gYGVuYCBvcHRpb25hbCBzZW5kaW5nIGRhdGEuXG4gICAgICogIC0gYGphYCDpgIHkv6HjgZnjgovku7vmhI/jga7jg4fjg7zjgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICBzZWVkOiBFdmVudFR5cGU8VEV2ZW50TWFwPiB8IChFdmVudFR5cGU8VEV2ZW50TWFwPilbXSB8IEV2ZW50IHwgRXZlbnRbXSB8IChFdmVudFR5cGU8VEV2ZW50TWFwPiB8IEV2ZW50KVtdLFxuICAgICAgICAuLi5ldmVudERhdGE6IHVua25vd25bXVxuICAgICk6IHRoaXMge1xuICAgICAgICBjb25zdCBjb252ZXJ0ID0gKGFyZzogRXZlbnRUeXBlPFRFdmVudE1hcD4gfCBFdmVudCk6IEV2ZW50ID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhhcmcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDdXN0b21FdmVudChub3JtYWxpemVFdmVudE5hbWVzcGFjZXMoYXJnKSwge1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWw6IGV2ZW50RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZyBhcyBFdmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBldmVudHMgPSBpc0FycmF5KHNlZWQpID8gc2VlZCA6IFtzZWVkXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICAgICAgY29uc3QgZSA9IGNvbnZlcnQoZXZlbnQpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJFdmVudERhdGEoZWwsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgZWwuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICBkZWxldGVFdmVudERhdGEoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHV0aWxpdHlcblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3IgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogdW5rbm93bltdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEhUTUxFbGVtZW50PjtcbiAgICAgICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IFRyYW5zaXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ3RyYW5zaXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlzRnVuY3Rpb24oY2FsbGJhY2spICYmIHNlbGYub24oJ3RyYW5zaXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ2FuaW1hdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxIVE1MRWxlbWVudD47XG4gICAgICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBBbmltYXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ2FuaW1hdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgc2VsZi5vbignYW5pbWF0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJpbmQgb25lIG9yIHR3byBoYW5kbGVycyB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cywgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIGFuZCBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnRzLlxuICAgICAqIEBqYSAx44Gk44G+44Gf44GvMuOBpOOBruODj+ODs+ODieODqeOCkuaMh+WumuOBlywg5LiA6Ie044GX44Gf6KaB57Sg44GuIGBtb3VzZWVudGVyYCwgYG1vdXNlbGVhdmVgIOOCkuaknOefpVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJJbihPdXQpXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIHRoZSBlbGVtZW50LiA8YnI+XG4gICAgICogICAgICAgIElmIGhhbmRsZXIgc2V0IG9ubHkgb25lLCBhIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LCB0b28uXG4gICAgICogIC0gYGphYCBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiA8YnI+XG4gICAgICogICAgICAgICAg5byV5pWw44GMMeOBpOOBp+OBguOCi+WgtOWQiCwgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCguWFvOOBreOCi1xuICAgICAqIEBwYXJhbSBoYW5kbGVyT3V0XG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LlxuICAgICAqICAtIGBqYWAgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBob3ZlcihoYW5kbGVySW46IERPTUV2ZW50TGlzdGVuZXIsIGhhbmRsZXJPdXQ/OiBET01FdmVudExpc3RlbmVyKTogdGhpcyB7XG4gICAgICAgIGhhbmRsZXJPdXQgPSBoYW5kbGVyT3V0IHx8IGhhbmRsZXJJbjtcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2VlbnRlcihoYW5kbGVySW4pLm1vdXNlbGVhdmUoaGFuZGxlck91dCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgc2hvcnRjdXRcblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2xpY2tgIGV2ZW50LlxuICAgICAqIEBqYSBgY2xpY2tgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNsaWNrKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBkYmxjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBkYmxjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGJsY2xpY2soaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZGJsY2xpY2snLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGJsdXJgIGV2ZW50LlxuICAgICAqIEBqYSBgYmx1cmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYmx1cihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdibHVyJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c2AgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXMoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXMnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzaW5gIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNpbmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNpbihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c2luJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c291dGAgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c291dGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNvdXQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNvdXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleXVwYCBldmVudC5cbiAgICAgKiBAamEgYGtleXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXl1cChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXl1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5ZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBrZXlkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlkb3duKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleWRvd24nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleXByZXNzYCBldmVudC5cbiAgICAgKiBAamEgYGtleXByZXNzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlwcmVzcyhoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlwcmVzcycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgc3VibWl0YCBldmVudC5cbiAgICAgKiBAamEgYHN1Ym1pdGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3VibWl0KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3N1Ym1pdCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY29udGV4dG1lbnVgIGV2ZW50LlxuICAgICAqIEBqYSBgY29udGV4dG1lbnVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNvbnRleHRtZW51KGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NvbnRleHRtZW51JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjaGFuZ2VgIGV2ZW50LlxuICAgICAqIEBqYSBgY2hhbmdlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGFuZ2UoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY2hhbmdlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWRvd25gIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWRvd24oaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vtb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW1vdmUoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vtb3ZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZXVwYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNldXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNldXAoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2V1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VlbnRlcmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWVudGVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWVudGVyKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZW50ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VsZWF2ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VsZWF2ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWxlYXZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW91dGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW91dGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdXQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VvdXQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlb3ZlcmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW92ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3ZlcihoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW92ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoc3RhcnRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hzdGFydGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hzdGFydChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaHN0YXJ0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaGVuZGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaGVuZGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hlbmQoaGFuZGxlcj86IERPTUV2ZW50TGlzdGVuZXIsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hlbmQnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNobW92ZWAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaG1vdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNobW92ZShoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaG1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoY2FuY2VsYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoY2FuY2VsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGNhbmNlbChoYW5kbGVyPzogRE9NRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGNhbmNlbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgcmVzaXplYCBldmVudC5cbiAgICAgKiBAamEgYHJlc2l6ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzaXplKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Jlc2l6ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgc2Nyb2xsYCBldmVudC5cbiAgICAgKiBAamEgYHNjcm9sbGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsKGhhbmRsZXI/OiBET01FdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Njcm9sbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ29weWluZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIGRlZXAgY29weSBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruODh+OCo+ODvOODl+OCs+ODlOODvOOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIHdpdGhFdmVudHNcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgc2hvdWxkIGJlIGNvcGllZCBhbG9uZyB3aXRoIHRoZSBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCguOCs+ODlOODvOOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumlxuICAgICAqIEBwYXJhbSBkZWVwXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIGV2ZW50IGhhbmRsZXJzIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIGNsb25lZCBlbGVtZW50IHNob3VsZCBiZSBjb3BpZWQuXG4gICAgICogIC0gYGphYCBib29sZWFu5YCk44Gn44CB6YWN5LiL44Gu6KaB57Sg44Gu44GZ44G544Gm44Gu5a2Q6KaB57Sg44Gr5a++44GX44Gm44KC44CB5LuY6ZqP44GX44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKHdpdGhFdmVudHMgPSBmYWxzZSwgZGVlcCA9IGZhbHNlKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQoc2VsZikpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxmLm1hcCgoaW5kZXg6IG51bWJlciwgZWw6IFRFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmVFbGVtZW50KGVsIGFzIE5vZGUgYXMgRWxlbWVudCwgd2l0aEV2ZW50cywgZGVlcCkgYXMgTm9kZSBhcyBURWxlbWVudDtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FdmVudHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQge1xuICAgIE5pbCxcbiAgICBpc051bWJlcixcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzaWZ5LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBlbnN1cmVQb3NpdGl2ZU51bWJlcixcbiAgICBzd2luZyxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzTm9kZURvY3VtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgZ2V0T2Zmc2V0U2l6ZSB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCB7XG4gICAgd2luZG93LFxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcbn0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dYC5zY3JvbGxUbygpYCBvcHRpb25zIGRlZmluaXRpb24uXG4gKiBAamEgW1tET01dXWAuc2Nyb2xsVG8oKWAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44Oz5a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NU2Nyb2xsT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB2ZXJ0aWNhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgdG9wPzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSBob3Jpem9udGFsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqIEBqYSDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKi9cbiAgICBsZWZ0PzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKi9cbiAgICBkdXJhdGlvbj86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqIEBqYSDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICovXG4gICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBjYWxsYmFjaz86ICgpID0+IHZvaWQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHF1ZXJ5IHNjcm9sbCB0YXJnZXQgZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlUYXJnZXRFbGVtZW50KGVsOiBFbGVtZW50QmFzZSB8IE5pbCk6IEVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH0gZWxzZSBpZiAoaXNOb2RlRG9jdW1lbnQoZWwpKSB7XG4gICAgICAgIHJldHVybiBlbC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cgPT09IGVsKSB7XG4gICAgICAgIHJldHVybiB3aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBzY3JvbGxUbygpYCAqL1xuZnVuY3Rpb24gcGFyc2VBcmdzKC4uLmFyZ3M6IHVua25vd25bXSk6IERPTVNjcm9sbE9wdGlvbnMge1xuICAgIGNvbnN0IG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMgPSB7IGVhc2luZzogJ3N3aW5nJyB9O1xuICAgIGlmICgxID09PSBhcmdzLmxlbmd0aCkge1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIGFyZ3NbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFtsZWZ0LCB0b3AsIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrXSA9IGFyZ3M7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywge1xuICAgICAgICAgICAgdG9wLFxuICAgICAgICAgICAgbGVmdCxcbiAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wdGlvbnMudG9wICAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLnRvcCk7XG4gICAgb3B0aW9ucy5sZWZ0ICAgICA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMubGVmdCk7XG4gICAgb3B0aW9ucy5kdXJhdGlvbiA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMuZHVyYXRpb24pO1xuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIGV4ZWNTY3JvbGwoZWw6IEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCwgb3B0aW9uczogRE9NU2Nyb2xsT3B0aW9ucyk6IHZvaWQge1xuICAgIGNvbnN0IHsgdG9wLCBsZWZ0LCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjayB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IGluaXRpYWxUb3AgPSBlbC5zY3JvbGxUb3A7XG4gICAgY29uc3QgaW5pdGlhbExlZnQgPSBlbC5zY3JvbGxMZWZ0O1xuICAgIGxldCBlbmFibGVUb3AgPSBpc051bWJlcih0b3ApO1xuICAgIGxldCBlbmFibGVMZWZ0ID0gaXNOdW1iZXIobGVmdCk7XG5cbiAgICAvLyBub24gYW5pbWF0aW9uIGNhc2VcbiAgICBpZiAoIWR1cmF0aW9uKSB7XG4gICAgICAgIGxldCBub3RpZnkgPSBmYWxzZTtcbiAgICAgICAgaWYgKGVuYWJsZVRvcCAmJiB0b3AgIT09IGluaXRpYWxUb3ApIHtcbiAgICAgICAgICAgIGVsLnNjcm9sbFRvcCA9IHRvcCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0ICYmIGxlZnQgIT09IGluaXRpYWxMZWZ0KSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxMZWZ0ID0gbGVmdCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub3RpZnkgJiYgaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGNNZXRyaWNzID0gKGVuYWJsZTogYm9vbGVhbiwgYmFzZTogbnVtYmVyLCBpbml0aWFsVmFsdWU6IG51bWJlciwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogeyBtYXg6IG51bWJlcjsgbmV3OiBudW1iZXI7IGluaXRpYWw6IG51bWJlcjsgfSA9PiB7XG4gICAgICAgIGlmICghZW5hYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBtYXg6IDAsIG5ldzogMCwgaW5pdGlhbDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1heFZhbHVlID0gZWxbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF0gLSBnZXRPZmZzZXRTaXplKGVsLCB0eXBlKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1heChNYXRoLm1pbihiYXNlLCBtYXhWYWx1ZSksIDApO1xuICAgICAgICByZXR1cm4geyBtYXg6IG1heFZhbHVlLCBuZXc6IG5ld1ZhbHVlLCBpbml0aWFsOiBpbml0aWFsVmFsdWUgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgbWV0cmljc1RvcCA9IGNhbGNNZXRyaWNzKGVuYWJsZVRvcCwgdG9wIGFzIG51bWJlciwgaW5pdGlhbFRvcCwgJ2hlaWdodCcpO1xuICAgIGNvbnN0IG1ldHJpY3NMZWZ0ID0gY2FsY01ldHJpY3MoZW5hYmxlTGVmdCwgbGVmdCBhcyBudW1iZXIsIGluaXRpYWxMZWZ0LCAnd2lkdGgnKTtcblxuICAgIGlmIChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPT09IG1ldHJpY3NUb3AuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVUb3AgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID09PSBtZXRyaWNzTGVmdC5pbml0aWFsKSB7XG4gICAgICAgIGVuYWJsZUxlZnQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFlbmFibGVUb3AgJiYgIWVuYWJsZUxlZnQpIHtcbiAgICAgICAgLy8gbmVlZCBub3QgdG8gc2Nyb2xsXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjUHJvZ3Jlc3MgPSAodmFsdWU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGVhc2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBlYXNpbmcodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdsaW5lYXInID09PSBlYXNpbmcgPyB2YWx1ZSA6IHN3aW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWx0YSA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGNvbnN0IGFuaW1hdGUgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGVsYXBzZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gTWF0aC5tYXgoTWF0aC5taW4oZWxhcHNlIC8gZHVyYXRpb24sIDEpLCAwKTtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3NDb2VmZiA9IGNhbGNQcm9ncmVzcyhwcm9ncmVzcyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGRlbHRhXG4gICAgICAgIGlmIChlbmFibGVUb3ApIHtcbiAgICAgICAgICAgIGRlbHRhLnRvcCA9IG1ldHJpY3NUb3AuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NUb3AubmV3IC0gbWV0cmljc1RvcC5pbml0aWFsKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuYWJsZUxlZnQpIHtcbiAgICAgICAgICAgIGRlbHRhLmxlZnQgPSBtZXRyaWNzTGVmdC5pbml0aWFsICsgKHByb2dyZXNzQ29lZmYgKiAobWV0cmljc0xlZnQubmV3IC0gbWV0cmljc0xlZnQuaW5pdGlhbCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgZG9uZVxuICAgICAgICBpZiAoKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA+IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPj0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCBkb3duXG4gICAgICAgICAgICAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3IDwgbWV0cmljc1RvcC5pbml0aWFsICYmIGRlbHRhLnRvcCA8PSBtZXRyaWNzVG9wLm5ldykgICAgICAgfHwgLy8gc2Nyb2xsIHVwXG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPiBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPj0gbWV0cmljc0xlZnQubmV3KSAgfHwgLy8gc2Nyb2xsIHJpZ2h0XG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPCBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPD0gbWV0cmljc0xlZnQubmV3KSAgICAgLy8gc2Nyb2xsIGxlZnRcbiAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIGVuYWJsZVRvcCAmJiAoZWwuc2Nyb2xsVG9wID0gbWV0cmljc1RvcC5uZXcpO1xuICAgICAgICAgICAgZW5hYmxlTGVmdCAmJiAoZWwuc2Nyb2xsTGVmdCA9IG1ldHJpY3NMZWZ0Lm5ldyk7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVsZWFzZSByZWZlcmVuY2UgaW1tZWRpYXRlbHkuXG4gICAgICAgICAgICBlbCA9IG51bGwhOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBkZWx0YS50b3ApO1xuICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gZGVsdGEubGVmdCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44K544Kv44Ot44O844Or44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TY3JvbGw8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTY3JvbGxcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBleOCjOOBn+ODlOOCr+OCu+ODq+aVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUb3AoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zaXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSBkdXJhdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKiBAcGFyYW0gZWFzaW5nXG4gICAgICogIC0gYGVuYCB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqICAtIGBqYWAg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbFRvcCA6IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbFRvKHtcbiAgICAgICAgICAgICAgICB0b3A6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIGhvcml6b250YWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOaoquaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbExlZnQgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgbGVmdDogcG9zaXRpb24sXG4gICAgICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB4XG4gICAgICogIC0gYGVuYCB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOaoquOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSB5XG4gICAgICogIC0gYGVuYCB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDnuKbjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKFxuICAgICAgICB4OiBudW1iZXIsXG4gICAgICAgIHk6IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIHNjcm9sbCB2YWx1ZXMgYnkgb3B0b2lucy5cbiAgICAgKiBAamEg44Kq44OX44K344On44Oz44KS55So44GE44Gm44K544Kv44Ot44O844Or5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gcGFyc2VBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBxdWVyeVRhcmdldEVsZW1lbnQoZWwpO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBleGVjU2Nyb2xsKGVsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU2Nyb2xsLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsIFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlLCBET00gfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3QgcGFyYW1ldGVyLlxuICogQGphIFtbRE9NXV0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdFBhcmFtZXRlcnMgPSBLZXlmcmFtZVtdIHwgUHJvcGVydHlJbmRleGVkS2V5ZnJhbWVzIHwgbnVsbDtcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3Qgb3B0aW9ucy5cbiAqIEBqYSBbW0RPTV1dIOOCqOODleOCp+OCr+ODiOWKueaenOOBruOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RPcHRpb25zID0gbnVtYmVyIHwgS2V5ZnJhbWVBbmltYXRpb25PcHRpb25zO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBjb250ZXh0IG9iamVjdC5cbiAqIEBqYSBbW0RPTV1dIOOBruOCqOODleOCp+OCr+ODiOWKueaenOOBruOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBbW0RPTV1dIGluc3RhbmNlIHRoYXQgY2FsbGVkIFtbYW5pbWF0ZV1dKCkgbWV0aG9kLlxuICAgICAqIEBqYSBbW2FuaW1hdGVdXSgpIOODoeOCveODg+ODieOCkuWun+ihjOOBl+OBnyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGRvbTogRE9NPFRFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYW5kIGBBbmltYXRpb25gIGluc3RhbmNlIG1hcCBieSBleGVjdXRpb24gW1thbmltYXRlXV0oKSBtZXRob2QgYXQgdGhpcyB0aW1lLlxuICAgICAqIEBqYSDku4rlm57lrp/ooYzjgZfjgZ8gYEVsZW1lbnRgIOOBqCBgQW5pbWF0aW9uYCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7jg57jg4Pjg5dcbiAgICAgKi9cbiAgICByZWFkb25seSBhbmltYXRpb25zOiBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGN1cnJlbnQgZmluaXNoZWQgUHJvbWlzZSBmb3IgdGhpcyBhbmltYXRpb24uXG4gICAgICogQGphIOWvvuixoeOCouODi+ODoeODvOOCt+ODp+ODs+OBrue1guS6huaZguOBq+eZuueBq+OBmeOCiyBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgZmluaXNoZWQ6IFByb21pc2U8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYW5pbUNvbnRleHRNYXAgPSBuZXcgV2Vha01hcDxFbGVtZW50LCBTZXQ8QW5pbWF0aW9uPj4oKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhbmltYXRpb24vZWZmZWN0IG1ldGhvZHMuXG4gKiBAamEg44Ki44OL44Oh44O844K344On44OzL+OCqOODleOCp+OCr+ODiOaTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRWZmZWN0czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGFydCBhbmltYXRpb24gYnkgYFdlYiBBbmltYXRpb24gQVBJYC5cbiAgICAgKiBAamEgYFdlYiBBbmltYXRpb24gQVBJYCDjgpLnlKjjgYTjgabjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0ZShwYXJhbXM6IERPTUVmZmVjdFBhcmFtZXRlcnMsIG9wdGlvbnM6IERPTUVmZmVjdE9wdGlvbnMpOiBET01FZmZlY3RDb250ZXh0PFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGRvbTogdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD4gYXMgRE9NPFRFbGVtZW50PixcbiAgICAgICAgICAgIGFuaW1hdGlvbnM6IG5ldyBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj4oKSxcbiAgICAgICAgfSBhcyBXcml0YWJsZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG5cbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFuaW0gPSBlbC5hbmltYXRlKHBhcmFtcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwpIHx8IG5ldyBTZXQoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmFkZChhbmltKTtcbiAgICAgICAgICAgICAgICBfYW5pbUNvbnRleHRNYXAuc2V0KGVsLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuYW5pbWF0aW9ucy5zZXQoZWwgYXMgTm9kZSBhcyBURWxlbWVudCwgYW5pbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLmFsbChbLi4ucmVzdWx0LmFuaW1hdGlvbnMudmFsdWVzKCldLm1hcChhbmltID0+IGFuaW0uZmluaXNoZWQpKS50aGVuKCgpID0+IHJlc3VsdCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsIGN1cnJlbnQgcnVubmluZyBhbmltYXRpb24uXG4gICAgICogQGphIOePvuWcqOWun+ihjOOBl+OBpuOBhOOCi+OCouODi+ODoeODvOOCt+ODp+ODs+OCkuS4reatolxuICAgICAqL1xuICAgIHB1YmxpYyBjYW5jZWwoKTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFuaW1hdGlvbiBvZiBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRpb24uY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLmRlbGV0ZShlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZpbmlzaCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLntYLkuoZcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluaXNoKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmlzaCDjgafjga/noLTmo4TjgZfjgarjgYRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FZmZlY3RzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHtcbiAgICBDbGFzcyxcbiAgICBtaXhpbnMsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBFbGVtZW50aWZ5U2VlZCxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgZWxlbWVudGlmeSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBET01CYXNlIH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IERPTUF0dHJpYnV0ZXMgfSBmcm9tICcuL2F0dHJpYnV0ZXMnO1xuaW1wb3J0IHsgRE9NVHJhdmVyc2luZyB9IGZyb20gJy4vdHJhdmVyc2luZyc7XG5pbXBvcnQgeyBET01NYW5pcHVsYXRpb24gfSBmcm9tICcuL21hbmlwdWxhdGlvbic7XG5pbXBvcnQgeyBET01TdHlsZXMgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQgeyBET01FdmVudHMgfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQgeyBET01TY3JvbGwgfSBmcm9tICcuL3Njcm9sbCc7XG5pbXBvcnQgeyBET01FZmZlY3RzIH0gZnJvbSAnLi9lZmZlY3RzJztcblxudHlwZSBET01GZWF0dXJlczxUIGV4dGVuZHMgRWxlbWVudEJhc2U+XG4gICAgPSBET01CYXNlPFQ+XG4gICAgJiBET01BdHRyaWJ1dGVzPFQ+XG4gICAgJiBET01UcmF2ZXJzaW5nPFQ+XG4gICAgJiBET01NYW5pcHVsYXRpb248VD5cbiAgICAmIERPTVN0eWxlczxUPlxuICAgICYgRE9NRXZlbnRzPFQ+XG4gICAgJiBET01TY3JvbGw8VD5cbiAgICAmIERPTUVmZmVjdHM8VD47XG5cbi8qKlxuICogQGVuIFtbRE9NXV0gcGx1Z2luIG1ldGhvZCBkZWZpbml0aW9uLlxuICogQGphIFtbRE9NXV0g44OX44Op44Kw44Kk44Oz44Oh44K944OD44OJ5a6a576pXG4gKlxuICogQG5vdGVcbiAqICAtIOODl+ODqeOCsOOCpOODs+aLoeW8teWumue+qeOBr+OBk+OBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueODnuODvOOCuOOBmeOCiy5cbiAqICAtIFR5cGVTY3JpcHQgMy43IOaZgueCueOBpywgbW9kdWxlIGludGVyZmFjZSDjga7jg57jg7zjgrjjga8gbW9kdWxlIOOBruWujOWFqOOBquODkeOCueOCkuW/heimgeOBqOOBmeOCi+OBn+OCgSxcbiAqICAgIOacrOODrOODneOCuOODiOODquOBp+OBryBidW5kbGUg44GX44GfIGBkaXN0L2RvbS5kLnRzYCDjgpLmj5DkvpvjgZnjgosuXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8zMzMyNlxuICogIC0gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTc4NDgxMzQvdHJvdWJsZS11cGRhdGluZy1hbi1pbnRlcmZhY2UtdXNpbmctZGVjbGFyYXRpb24tbWVyZ2luZ1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVBsdWdpbiB7IH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlXG5cbi8qKlxuICogQGVuIFRoaXMgaW50ZXJmYWNlIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6b44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIERPTUZlYXR1cmVzPFQ+LCBET01QbHVnaW4geyB9XG5cbmV4cG9ydCB0eXBlIERPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBFbGVtZW50aWZ5U2VlZDxUPiB8IERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgRE9NUmVzdWx0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+ID0gVCBleHRlbmRzIERPTTxFbGVtZW50QmFzZT4gPyBUIDogKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IERPTTxUPiA6IERPTTxIVE1MRWxlbWVudD4pO1xuZXhwb3J0IHR5cGUgRE9NSXRlcmF0ZUNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gYm9vbGVhbiB8IHZvaWQ7XG5cbi8qKlxuICogQGVuIFRoaXMgY2xhc3MgcHJvdmlkZXMgRE9NIG9wZXJhdGlvbnMgbGlrZSBgalF1ZXJ5YCBsaWJyYXJ5LlxuICogQGphIGBqUXVlcnlgIOOBruOCiOOBhuOBqkRPTSDmk43kvZzjgpLmj5DkvptcbiAqXG4gKiBVTlNVUFBPUlRFRCBNRVRIT0QgTElTVFxuICpcbiAqIFtUcmF2ZXJzaW5nXVxuICogIC5hZGRCYWNrKClcbiAqICAuZW5kKClcbiAqXG4gKiBbRWZmZWN0c11cbiAqIC5zaG93KClcbiAqIC5oaWRlKClcbiAqIC50b2dnbGUoKVxuICogLnN0b3AoKVxuICogLmNsZWFyUXVldWUoKVxuICogLmRlbGF5KClcbiAqIC5kZXF1ZXVlKClcbiAqIC5mYWRlSW4oKVxuICogLmZhZGVPdXQoKVxuICogLmZhZGVUbygpXG4gKiAuZmFkZVRvZ2dsZSgpXG4gKiAucXVldWUoKVxuICogLnNsaWRlRG93bigpXG4gKiAuc2xpZGVUb2dnbGUoKVxuICogLnNsaWRlVXAoKVxuICovXG5leHBvcnQgY2xhc3MgRE9NQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoXG4gICAgRE9NQmFzZSxcbiAgICBET01BdHRyaWJ1dGVzLFxuICAgIERPTVRyYXZlcnNpbmcsXG4gICAgRE9NTWFuaXB1bGF0aW9uLFxuICAgIERPTVN0eWxlcyxcbiAgICBET01FdmVudHMsXG4gICAgRE9NU2Nyb2xsLFxuICAgIERPTUVmZmVjdHMsXG4pIHtcbiAgICAvKipcbiAgICAgKiBwcml2YXRlIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiB0YXJnZXRzIGBFbGVtZW50YCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOaTjeS9nOWvvuixoeOBriBgRWxlbWVudGAg6YWN5YiXXG4gICAgICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihlbGVtZW50czogRWxlbWVudEJhc2VbXSkge1xuICAgICAgICBzdXBlcihlbGVtZW50cyk7XG4gICAgICAgIC8vIGFsbCBzb3VyY2UgY2xhc3NlcyBoYXZlIG5vIGNvbnN0cnVjdG9yLlxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tET01dXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKHNlbGVjdG9yICYmICFjb250ZXh0KSB7XG4gICAgICAgICAgICBpZiAoaXNET01DbGFzcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgYXMgRE9NUmVzdWx0PFQ+O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRE9NQ2xhc3MoKGVsZW1lbnRpZnkoc2VsZWN0b3IgYXMgRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQpKSkgYXMgdW5rbm93biBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQ2xhc3MgYXMgdW5rbm93biBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHZhbHVlLXR5cGUgaXMgW1tET01dXS5cbiAqIEBqYSBbW0RPTV1dIOWei+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSB4XG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE9NQ2xhc3MoeDogdW5rbm93bik6IHggaXMgRE9NIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIERPTUNsYXNzO1xufVxuIiwiaW1wb3J0IHsgc2V0dXAgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01DbGFzcyB9IGZyb20gJy4vY2xhc3MnO1xuXG4vLyBpbml0IGZvciBzdGF0aWNcbnNldHVwKERPTUNsYXNzLnByb3RvdHlwZSwgRE9NQ2xhc3MuY3JlYXRlKTtcblxuZXhwb3J0ICogZnJvbSAnLi9leHBvcnRzJztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgZGVmYXVsdCB9IGZyb20gJy4vZXhwb3J0cyc7XG4iXSwibmFtZXMiOlsid2luZG93IiwiJCIsImRvbSJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVBOztBQUVHO0FBRUgsaUJBQXdCLE1BQU1BLFFBQU0sR0FBa0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM5RSxpQkFBd0IsTUFBTSxRQUFRLEdBQWdCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEYsaUJBQXdCLE1BQU0sV0FBVyxHQUFhLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDbkYsaUJBQXdCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQzs7QUNUNUY7O0FBRUc7QUFpQkg7Ozs7Ozs7Ozs7O0FBV0c7QUFDYSxTQUFBLFVBQVUsQ0FBeUIsSUFBd0IsRUFBRSxPQUE2QixFQUFBO0lBQ3RHLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDUCxRQUFBLE9BQU8sRUFBRSxDQUFDO0FBQ2IsS0FBQTtBQUVELElBQUEsT0FBTyxHQUFHLE9BQU8sSUFBSSxRQUFRLENBQUM7SUFDOUIsTUFBTSxRQUFRLEdBQWMsRUFBRSxDQUFDO0lBRS9CLElBQUk7QUFDQSxRQUFBLElBQUksUUFBUSxLQUFLLE9BQU8sSUFBSSxFQUFFO0FBQzFCLFlBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3pCLFlBQUEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7O2dCQUU1QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BELGdCQUFBLFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO2dC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
