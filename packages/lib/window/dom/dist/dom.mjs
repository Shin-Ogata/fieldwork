/*!
 * @cdp/dom 0.9.0
 *   dom utility module
 */

import { safe, isFunction, className, setMixClassAttribute, isArray, isString, toTypedData, camelize, fromTypedData, noop, mixins } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においても
 * `window` オブジェクトと `document` オブジェクト等の存在を保証する
 */
const win = safe(globalThis.window);
const doc = safe(globalThis.document);
const evt = safe(globalThis.CustomEvent);

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

var utils = /*#__PURE__*/Object.freeze({
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
        const classes = isArray(className) ? className : [className];
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
            operation(el);
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
        const attrs = isArray(name) ? name : [name];
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
                if (isArray(value) && isMultiSelect(el)) {
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
                    const dataset = el.dataset;
                    if (dataset) {
                        dataset[prop] = fromTypedData(value);
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
setMixClassAttribute(DOMAttributes, 'protoExtendsOnly');

/* eslint-disable @typescript-eslint/no-explicit-any */
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
/** @internal helper for `contents()` */
function nodeName(elem, name) {
    return !!(elem && elem.nodeName.toLowerCase() === name.toLowerCase());
}
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
     *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
     *  - `ja` [[DOMClass]] のもとになるインスタンス(群)またはセレクタ文字列
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
                    if (el !== elem && el.contains(elem)) {
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
                const elems = el.querySelectorAll(selector);
                elements.push(...elems);
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
            const $target = dom(selector, el);
            targets.push(...$target);
        }
        return this.filter((index, elem) => {
            for (const el of new Set(targets)) {
                if (elem !== el && elem.contains(el)) {
                    return true;
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
                const c = el.closest(selector);
                if (c) {
                    closests.add(c);
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
            for (const child of el.children) {
                if (validRetrieveNode(child, selector)) {
                    children.add(child);
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
            const parentNode = el.parentNode;
            if (validParentNode(parentNode) && validRetrieveNode(parentNode, selector)) {
                parents.add(parentNode);
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
            const elem = el.nextElementSibling;
            if (validRetrieveNode(elem, selector)) {
                nextSiblings.add(elem);
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
            const elem = el.previousElementSibling;
            if (validRetrieveNode(elem, selector)) {
                prevSiblings.add(elem);
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
            const parentNode = el.parentNode;
            if (validParentNode(parentNode)) {
                for (const sibling of dom(parentNode).children(selector)) {
                    if (sibling !== el) {
                        siblings.add(sibling);
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
        return dom([...contents]);
    }
}
setMixClassAttribute(DOMTraversing, 'protoExtendsOnly');

/**
 * @en Mixin base class which concentrated the manipulation methods.
 * @ja マニピュレーションメソッドを集約した Mixin Base クラス
 */
class DOMManipulation {
}
setMixClassAttribute(DOMManipulation, 'protoExtendsOnly');
/*
[dom7]
// DOM Insertion, Inside
.append()
.appendTo()
.html()
.prepend()
.prependTo()
.text()
// DOM Insertion, Outside
.after()
.before()
.insertAfter()
.insertBefore()
// DOM Removal
.detach()
.empty()
.remove()

[jquery]
// DOM Insertion, Around
.unwrap()
.wrap()
.wrapAll()
.wrapInner()
// DOM Replacement
.replaceAll()
.replaceWith()
 */

/**
 * @en Mixin base class which concentrated the style management methods.
 * @ja スタイル関連メソッドを集約した Mixin Base クラス
 */
class DOMStyles {
}
setMixClassAttribute(DOMStyles, 'protoExtendsOnly');
/*
[dom7]
.css()
.height()
.offset()
.outerHeight()
.outerWidth()
.width()

[jquery]
.innerHeight()
.innerWidth()
.position()
.offsetParent()
 */

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
}
setMixClassAttribute(DOMEvents, 'protoExtendsOnly');
/*
[jquery]
// Copying
.clone()
 */

/**
 * @en Mixin base class which concentrated the manipulation methods.
 * @ja スクロールメソッドを集約した Mixin Base クラス
 */
class DOMScroll {
}
setMixClassAttribute(DOMScroll, 'protoExtendsOnly');
/*
[dom7]
.scrollLeft()
.scrollTop()
.scrollTo()
 */

/**
 * @en Mixin base class which concentrated the animation/effect methods.
 * @ja アニメーション/エフェクト操作メソッドを集約した Mixin Base クラス
 */
class DOMEffects {
}
setMixClassAttribute(DOMEffects, 'protoExtendsOnly');
/*
[dom7]
.animate()
.stop()
.show()
.hide()
.transform()
.transition()

[jquery]
.clearQueue()   // 未定
.delay()        // 未定
.dequeue()      // 未定
.fadeIn()
.fadeOut()
.fadeTo()
.fadeToggle()
.finish()       // 未定
.queue()        // 未定
.slideDown()    // やらない
.slideToggle()  // やらない
.slideUp()      // やらない
.toggle()       // やらない?
 */

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

export default dom;
export { dom };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwidXRpbHMudHMiLCJzdGF0aWMudHMiLCJiYXNlLnRzIiwiYXR0cmlidXRlcy50cyIsInRyYXZlcnNpbmcudHMiLCJtYW5pcHVsYXRpb24udHMiLCJzdHlsZXMudHMiLCJldmVudHMudHMiLCJzY3JvbGwudHMiLCJlZmZlY3RzLnRzIiwiY2xhc3MudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoJcbiAqIGB3aW5kb3dgIOOCquODluOCuOOCp+OCr+ODiOOBqCBgZG9jdW1lbnRgIOOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5jb25zdCB3aW4gPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbmNvbnN0IGRvYyA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG5jb25zdCBldnQgPSBzYWZlKGdsb2JhbFRoaXMuQ3VzdG9tRXZlbnQpO1xuXG5leHBvcnQge1xuICAgIHdpbiBhcyB3aW5kb3csXG4gICAgZG9jIGFzIGRvY3VtZW50LFxuICAgIGV2dCBhcyBDdXN0b21FdmVudCxcbn07XG4iLCJpbXBvcnQge1xuICAgIE5pbCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNsYXNzTmFtZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QmFzZSA9IE5vZGUgfCBXaW5kb3c7XG5leHBvcnQgdHlwZSBFbGVtZW50UmVzdWx0PFQ+ID0gVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IEhUTUxFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE5pbDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBUIHwgKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFRbXSA6IG5ldmVyKSB8IE5vZGVMaXN0T2Y8VCBleHRlbmRzIE5vZGUgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgUXVlcnlDb250ZXh0ID0gUGFyZW50Tm9kZSAmIFBhcnRpYWw8Tm9uRWxlbWVudFBhcmVudE5vZGU+O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgRWxlbWVudCBhcnJheSBmcm9tIHNlZWQgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBTZWVkIOOBi+OCiSBFbGVtZW50IOmFjeWIl+OCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUgb3IgV2luZG93IG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0OiBRdWVyeUNvbnRleHQgPSBkb2N1bWVudCk6IEVsZW1lbnRSZXN1bHQ8VD5bXSB7XG4gICAgaWYgKCFzZWVkKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG5cbiAgICB0cnkge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBodG1sID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHRtbC5pbmNsdWRlcygnPCcpICYmIGh0bWwuaW5jbHVkZXMoJz4nKSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcmt1cFxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQpICYmICgnIycgPT09IHNlbGVjdG9yWzBdKSAmJiAhL1sgLjw+On5dLy5leGVjKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXJlIElEIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvci5zdWJzdHJpbmcoMSkpO1xuICAgICAgICAgICAgICAgICAgICBlbCAmJiBlbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdib2R5JyA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYm9keVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIHNlbGVjdG9yc1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmNvbnRleHQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgoc2VlZCBhcyBOb2RlKS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWQgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmIChzZWVkWzBdLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZFswXSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NQ2xhc3MsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbn0gZnJvbSAnLi9jbGFzcyc7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGRvbSB7XG4gICAgbGV0IGZuOiBET01DbGFzcztcbn1cblxudHlwZSBET01GYWN0b3J5ID0gPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQpID0+IERPTVJlc3VsdDxUPjtcblxubGV0IF9mYWN0b3J5ITogRE9NRmFjdG9yeTtcblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbRE9NQ2xhc3NdXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NQ2xhc3NdXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01DbGFzc11dLlxuICogIC0gYGphYCBbW0RPTUNsYXNzXV0g44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgW1tET01DbGFzc11dIGluc3RhbmNlLlxuICovXG5mdW5jdGlvbiBkb208VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTVJlc3VsdDxUPiB7XG4gICAgcmV0dXJuIF9mYWN0b3J5KHNlbGVjdG9yLCBjb250ZXh0KTtcbn1cblxuZG9tLnV0aWxzID0gdXRpbHM7XG5cbi8qKiBAaW50ZXJuYWwg5b6q55Kw5Y+C54Wn5Zue6YG/44Gu44Gf44KB44Gu6YGF5bu244Kz44Oz44K544OI44Op44Kv44K344On44Oz44Oh44K944OD44OJICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoZm46IERPTUNsYXNzLCBmYWN0b3J5OiBET01GYWN0b3J5KTogdm9pZCB7XG4gICAgX2ZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIGRvbS5mbiA9IGZuO1xufVxuXG5leHBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBRdWVyeUNvbnRleHQsXG4gICAgRE9NLFxuICAgIERPTVNlbGVjdG9yLFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20sXG59O1xuIiwiaW1wb3J0IHsgTmlsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdywgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3InKTtcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdGlvbiBjbGFzcyBvZiBbW0RPTUNsYXNzXV0uIFRoaXMgY2xhc3MgcHJvdmlkZXMgaXRlcmF0b3IgbWV0aG9kcy5cbiAqIEBqYSBbW0RPTUNsYXNzXV0g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50czogVFtdKSB7XG4gICAgICAgIGNvbnN0IHNlbGY6IERPTUFjY2VzczxUPiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaW5kZXgpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IoY3VycmVudCwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICBjb25zdCBub2RlID0gZG9tWzBdIGFzIE5vZGU7XG4gICAgcmV0dXJuICEhKG5vZGUgJiYgbm9kZS5ub2RlVHlwZSAmJiAoTm9kZS5FTEVNRU5UX05PREUgPT09IG5vZGUubm9kZVR5cGUpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEhUTUxFbGVtZW50YCBvciBgU1ZHRWxlbWVudGAuXG4gKiBAamEgW1tET01dXSDjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOCkuWvvuixoeOBq+OBl+OBpuOBhOOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBkb21cbiAqICAtIGBlbmAgW1tET01JdGVyYWJsZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRE9NSXRlcmFibGVdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8SFRNTEVsZW1lbnQgfCBTVkdFbGVtZW50PiB7XG4gICAgY29uc3Qgbm9kZSA9IGRvbVswXSBhcyBOb2RlO1xuICAgIHJldHVybiAhIShub2RlICYmIG5vZGUubm9kZVR5cGUgJiYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBub2RlLm5vZGVUeXBlKSAmJiAobnVsbCAhPSAobm9kZSBhcyBIVE1MRWxlbWVudCkuZGF0YXNldCkpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRG9jdW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IGRvbVswXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYFdpbmRvd2AuXG4gKiBAamEgW1tET01dXSDjgYwgYFdpbmRvd2Ag44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlV2luZG93KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPFdpbmRvdz4ge1xuICAgIHJldHVybiB3aW5kb3cgPT09IGRvbVswXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgTmlsLlxuICogQGphIE5pbCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5pbD4ge1xuICAgIHJldHVybiAhc2VsZWN0b3I7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFN0cmluZy5cbiAqIEBqYSBTdHJpbmcg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgc3RyaW5nPiB7XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2Ygc2VsZWN0b3I7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE5vZGUuXG4gKiBAamEgTm9kZSDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTm9kZT4ge1xuICAgIHJldHVybiBudWxsICE9IChzZWxlY3RvciBhcyBOb2RlKS5ub2RlVHlwZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgRWxlbWVudC5cbiAqIEBqYSBFbGVtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VsZW1lbnRTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBFbGVtZW50PiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRWxlbWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgRG9jdW1lbnQuXG4gKiBAamEgRG9jdW1lbnQg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRG9jdW1lbnRTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBEb2N1bWVudD4ge1xuICAgIHJldHVybiBkb2N1bWVudCA9PT0gc2VsZWN0b3IgYXMgTm9kZSBhcyBEb2N1bWVudDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgV2luZG93LlxuICogQGphIFdpbmRvdyDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXaW5kb3dTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBXaW5kb3c+IHtcbiAgICByZXR1cm4gd2luZG93ID09PSBzZWxlY3RvciBhcyBXaW5kb3c7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciBpcyBhYmxlIHRvIGl0ZXJhdGUuXG4gKiBAamEg6LWw5p+75Y+v6IO944Gq44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGVTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOb2RlTGlzdE9mPE5vZGU+PiB7XG4gICAgcmV0dXJuIG51bGwgIT0gKHNlbGVjdG9yIGFzIFRbXSkubGVuZ3RoO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBbW0RPTV1dLlxuICogQGphIFtbRE9NXV0g44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE9NU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRE9NPiB7XG4gICAgcmV0dXJuIHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQmFzZTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgKi9cbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgY2FtZWxpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNUeXBlRWxlbWVudCxcbiAgICBpc1R5cGVIVE1MT3JTVkdFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgdHlwZSBET01WYWx1ZVR5cGU8VCwgSyA9ICd2YWx1ZSc+ID0gVCBleHRlbmRzIEhUTUxTZWxlY3RFbGVtZW50ID8gKHN0cmluZyB8IHN0cmluZ1tdKSA6IEsgZXh0ZW5kcyBrZXlvZiBUID8gVFtLXSA6IHVuZGVmaW5lZDtcbmV4cG9ydCB0eXBlIERPTURhdGEgPSBQbGFpbk9iamVjdDxUeXBlZERhdGE+O1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgYXR0cmlidXRlcyBtZXRob2RzLlxuICogQGphIOWxnuaAp+aTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NQXR0cmlidXRlczxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IENsYXNzZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGFkZENsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxFbGVtZW50Pikge1xuICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGNzcyBjbGFzcyB0byBlbGVtZW50cy5cbiAgICAgKiBAamEgY3NzIGNsYXNzIOimgee0oOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVDbGFzcyhjbGFzc05hbWU6IHN0cmluZyB8IHN0cmluZ1tdKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERldGVybWluZSB3aGV0aGVyIGFueSBvZiB0aGUgbWF0Y2hlZCBlbGVtZW50cyBhcmUgYXNzaWduZWQgdGhlIGdpdmVuIGNsYXNzLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLlsJHjgarjgY/jgajjgoLopoHntKDjgYzmjIHjgaPjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWVcbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXNDbGFzcyhjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG9yIHJlbW92ZSBvbmUgb3IgbW9yZSBjbGFzc2VzIGZyb20gZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICBkZXBlbmRpbmcgb24gZWl0aGVyIHRoZSBjbGFzcydzIHByZXNlbmNlIG9yIHRoZSB2YWx1ZSBvZiB0aGUgc3RhdGUgYXJndW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBrueKtuaFi+OBq+W/nOOBmOOBpiwg5oyH5a6a44GV44KM44Gf44Kv44Op44K55ZCN44KS6KaB57Sg44Gr6L+95YqgL+WJiumZpOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZSBvciBjbGFzcyBuYW1lIGxpc3QgKGFycmF5KS5cbiAgICAgKiAgLSBgamFgIOOCr+ODqeOCueWQjeOBvuOBn+OBr+OCr+ODqeOCueWQjeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBmb3JjZVxuICAgICAqICAtIGBlbmAgaWYgdGhpcyBhcmd1bWVudCBleGlzdHMsIHRydWU6IHRoZSBjbGFzc2VzIHNob3VsZCBiZSBhZGRlZCAvIGZhbHNlOiByZW1vdmVkLlxuICAgICAqICAtIGBqYWAg5byV5pWw44GM5a2Y5Zyo44GZ44KL5aC05ZCILCB0cnVlOiDjgq/jg6njgrnjgpLov73liqAgLyBmYWxzZTog44Kv44Op44K544KS5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIHRvZ2dsZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGZvcmNlPzogYm9vbGVhbik6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2xhc3NlcyA9IGlzQXJyYXkoY2xhc3NOYW1lKSA/IGNsYXNzTmFtZSA6IFtjbGFzc05hbWVdO1xuICAgICAgICBjb25zdCBvcGVyYXRpb24gPSAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNsYXNzZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LnRvZ2dsZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCkgPT4gZWxlbS5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxFbGVtZW50Pikge1xuICAgICAgICAgICAgb3BlcmF0aW9uKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUHJvcGVydGllc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBwcm9wZXJ0eSB2YWx1ZS4gPGJyPlxuICAgICAqICAgICBUaGUgbWV0aG9kIGdldHMgdGhlIHByb3BlcnR5IHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg44OX44Ot44OR44OG44Kj5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWVcbiAgICAgKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBUKTogVEVsZW1lbnRbVF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgdmFsdWVcbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+ODl+ODreODkeODhuOCo+WApFxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihuYW1lOiBULCB2YWx1ZTogVEVsZW1lbnRbVF0pOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBtdWx0aSBwcm9wZXJ0eSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw44OX44Ot44OR44OG44Kj44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvcGVydGllc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIHByb3BlcnR5LXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIHByb3BlcnR5LXZhbHVlIOODmuOCouOCkuaMgeOBpOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBwcm9wKHByb3BlcnRpZXM6IFBsYWluT2JqZWN0KTogdGhpcztcblxuICAgIHB1YmxpYyBwcm9wPFQgZXh0ZW5kcyBOb25GdW5jdGlvblByb3BlcnR5TmFtZXM8VEVsZW1lbnQ+PihrZXk6IFQgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBURWxlbWVudFtUXSk6IFRFbGVtZW50W1RdIHwgdGhpcyB7XG4gICAgICAgIGlmIChudWxsID09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IHByb3BlcnR5XG4gICAgICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXNbMF07XG4gICAgICAgICAgICByZXR1cm4gZmlyc3QgJiYgZmlyc3Rba2V5IGFzIHN0cmluZ107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgcHJvcGVydHlcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBlbFtrZXkgYXMgc3RyaW5nXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3Qua2V5cyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSBpbiBlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsW25hbWVdID0ga2V5W25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYXR0cmlidXRlIHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgYXR0cmlidXRlIHZhbHVlIGZvciBvbmx5IHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiBAamEg5bGe5oCn5YCk44Gu5Y+W5b6XIDxicj5cbiAgICAgKiAgICAg5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHNpbmdsZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Y2Y5LiA5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSBuYW1lXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhdHRyaWJ1dGUgdmFsdWUuIGlmIGBudWxsYCBzZXQsIHJlbW92ZSBhdHRyaWJ1dGUuXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlsZ7mgKflgKQuIGBudWxsYCDjgYzmjIflrprjgZXjgozjgZ/loLTlkIjliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIGF0dHJpYnV0ZSB2YWx1ZXMgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm6KSH5pWw5bGe5oCn44Gu6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cmlidXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IG9mIGF0dHJpYnV0ZS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBhdHRyaWJ1dGUtdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGF0dHIocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIGF0dHIoa2V5OiBzdHJpbmcgfCBQbGFpbk9iamVjdCwgdmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IHN0cmluZyB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkID09PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH0gZWxzZSBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSAmJiBpc1N0cmluZyhrZXkpKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzWzBdLmdldEF0dHJpYnV0ZShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIChudWxsICE9IGF0dHIpID8gYXR0ciA6IHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIGF0dHJpYnV0ZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlQXR0cihrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxFbGVtZW50Pikge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZVxuICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5IGFzIHN0cmluZywgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGtleVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsID09PSB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShuYW1lLCBTdHJpbmcodmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5oyH5a6a44GX44Gf5bGe5oCn44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgYXR0cmlidXRlIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg5bGe5oCn5ZCN44G+44Gf44Gv5bGe5oCn5ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUF0dHIobmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhdHRycyA9IGlzQXJyYXkobmFtZSkgPyBuYW1lIDogW25hbWVdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0ciBvZiBhdHRycykge1xuICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFZhbHVlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIHZhbHVlIOWApOOBruWPluW+ly4g5pyA5Yid44Gu6KaB57Sg44GM5Y+W5b6X5a++6LGhXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50PigpOiBET01WYWx1ZVR5cGU8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSB2YWx1ZSBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpiB2YWx1ZSDlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgYHN0cmluZ2Agb3IgYG51bWJlcmAgb3IgYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApLlxuICAgICAqICAtIGBqYWAgYHN0cmluZ2Ag44G+44Gf44GvIGBudW1iZXJgIOOBvuOBn+OBryBgc3RyaW5nW11gIChgPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+YClcbiAgICAgKi9cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZTogRE9NVmFsdWVUeXBlPFQ+KTogdGhpcztcblxuICAgIHB1YmxpYyB2YWw8VCBleHRlbmRzIEVsZW1lbnRCYXNlID0gVEVsZW1lbnQ+KHZhbHVlPzogRE9NVmFsdWVUeXBlPFQ+KTogYW55IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNNdWx0aVNlbGVjdCA9IChlbDogYW55KTogZWwgaXMgSFRNTFNlbGVjdEVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuICdzZWxlY3QnID09PSBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICYmIGVsLm11bHRpcGxlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTXVsdGlTZWxlY3QoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwuc2VsZWN0ZWRPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCd2YWx1ZScgaW4gZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsIGFzIGFueSkudmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5vIHN1cHBvcnQgdmFsdWVcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4gYXMgRE9NSXRlcmFibGU8SFRNTElucHV0RWxlbWVudD4pIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgaXNNdWx0aVNlbGVjdChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBvcHRpb24gb2YgZWwub3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uLnNlbGVjdGVkID0gKHZhbHVlIGFzIHN0cmluZ1tdKS5pbmNsdWRlcyhvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRGF0YVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiB0aGUgdmFsdWVzIGFsbCBgRE9NU3RyaW5nTWFwYCBzdG9yZSBzZXQgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBIVE1MNSBkYXRhLSog5bGe5oCn44GnIGBET01TdHJpbmdNYXBgIOOBq+agvOe0jeOBleOCjOOBn+WFqOODh+ODvOOCv+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKCk6IERPTURhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZSBhdCB0aGUgbmFtZWQgZGF0YSBzdG9yZSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24sIGFzIHNldCBieSBkYXRhKGtleSwgdmFsdWUpIG9yIGJ5IGFuIEhUTUw1IGRhdGEtKiBhdHRyaWJ1dGUuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBriBrZXkg44Gn5oyH5a6a44GX44GfIEhUTUw1IGRhdGEtKiDlsZ7mgKflgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkYXRhKGtleTogc3RyaW5nKTogVHlwZWREYXRhIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFN0b3JlIGFyYml0cmFyeSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5a++44GX44Gm5Lu75oSP44Gu44OH44O844K/44KS5qC857SNXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBzdHJpbmcgZXF1aXZhbGVudCB0byBkYXRhLWBrZXlgIGlzIGdpdmVuLlxuICAgICAqICAtIGBqYWAgZGF0YS1ga2V5YCDjgavnm7jlvZPjgZnjgovmloflrZfliJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGRhdGEgdmFsdWUgKG5vdCBvbmx5IGBzdHJpbmdgKVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5oyH5a6aICjmloflrZfliJfku6XlpJbjgoLlj5fku5jlj68pXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcsIHZhbHVlOiBUeXBlZERhdGEpOiB0aGlzO1xuXG4gICAgcHVibGljIGRhdGEoa2V5Pzogc3RyaW5nLCB2YWx1ZT86IFR5cGVkRGF0YSk6IERPTURhdGEgfCBUeXBlZERhdGEgfCB1bmRlZmluZWQgfCB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBub24gc3VwcG9ydGVkIGRhdGFzZXQgZWxlbWVudFxuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gdmFsdWUgPyB1bmRlZmluZWQgOiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGRhdGFzZXRcbiAgICAgICAgICAgIGNvbnN0IGRhdGFzZXQgPSB0aGlzWzBdLmRhdGFzZXQ7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgYWxsIGRhdGFcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBET01EYXRhID0ge307XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGRhdGFzZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGFbcHJvcF0gPSB0b1R5cGVkRGF0YShkYXRhc2V0W3Byb3BdKSBhcyBUeXBlZERhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0eXBlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHJldHVybiB0b1R5cGVkRGF0YShkYXRhc2V0W2NhbWVsaXplKGtleSldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcHJvcCA9IGNhbWVsaXplKGtleSB8fCAnJyk7XG4gICAgICAgICAgICBpZiAocHJvcCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudD4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IGVsLmRhdGFzZXQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhc2V0W3Byb3BdID0gZnJvbVR5cGVkRGF0YSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3BlY2lmaWVkIGRhdGEuXG4gICAgICogQGphIOaMh+WumuOBl+OBn+ODh+ODvOOCv+OCkuODh+ODvOOCv+mgmOWfn+OBi+OCieWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZURhdGEoa2V5OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb3BzID0gaXNBcnJheShrZXkpID8ga2V5Lm1hcChrID0+IGNhbWVsaXplKGspKSA6IFtjYW1lbGl6ZShrZXkpXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPEhUTUxFbGVtZW50Pikge1xuICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IGVsLmRhdGFzZXQ7XG4gICAgICAgICAgICBpZiAoZGF0YXNldCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wcykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZGF0YXNldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01BdHRyaWJ1dGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIG5vb3AsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3csIGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01JdGVyYXRlQ2FsbGJhY2ssXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NQmFzZSxcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbiAgICBpc0VtcHR5U2VsZWN0b3IsXG4gICAgaXNTdHJpbmdTZWxlY3RvcixcbiAgICBpc0RvY3VtZW50U2VsZWN0b3IsXG4gICAgaXNXaW5kb3dTZWxlY3RvcixcbiAgICBpc05vZGVTZWxlY3RvcixcbiAgICBpc0l0ZXJhYmxlU2VsZWN0b3IsXG59IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCB0eXBlIERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBVO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlzKClgIGFuZCBgZmlsdGVyKClgICovXG5mdW5jdGlvbiB3aW5ub3c8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VT4sXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPFU+LFxuICAgIHZhbGlkQ2FsbGJhY2s6IChlbDogVSkgPT4gYW55LFxuICAgIGludmFsaWRDYWxsYmFjaz86ICgpID0+IGFueSxcbik6IGFueSB7XG4gICAgaW52YWxpZENhbGxiYWNrID0gaW52YWxpZENhbGxiYWNrIHx8IG5vb3A7XG5cbiAgICBsZXQgcmV0dmFsOiBhbnk7XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiBkb20uZW50cmllcygpKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmdTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmICgoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzV2luZG93U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAod2luZG93ID09PSBlbCBhcyBXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0RvY3VtZW50U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQgPT09IGVsIGFzIE5vZGUgYXMgRG9jdW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc05vZGVTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbSA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBhcmVudCgpYCwgYHBhcmVudHMoKWAgYW5kIGBzaWJsaW5ncygpYCAqL1xuZnVuY3Rpb24gdmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGU6IE5vZGUgfCBudWxsKTogcGFyZW50Tm9kZSBpcyBOb2RlIHtcbiAgICByZXR1cm4gbnVsbCAhPSBwYXJlbnROb2RlICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gcGFyZW50Tm9kZS5ub2RlVHlwZSAmJiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2hpbGRyZW4oKWAsIGBwYXJlbnQoKWAsIGBuZXh0KClgIGFuZCBgcHJldigpYCAqL1xuZnVuY3Rpb24gdmFsaWRSZXRyaWV2ZU5vZGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4obm9kZTogTm9kZSB8IG51bGwsIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCk6IG5vZGUgaXMgTm9kZSB7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBpZiAoJChub2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBuZXh0VW50aWwoKWAgYW5kIGBwcmV2VW50aWwoKSAqL1xuZnVuY3Rpb24gcmV0cmlldmVTaWJsaW5nczxcbiAgICBFIGV4dGVuZHMgRWxlbWVudEJhc2UsXG4gICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2Vcbj4oXG4gICAgc2libGluZzogJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnIHwgJ25leHRFbGVtZW50U2libGluZycsXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPEU+LFxuICAgIHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+XG4pOiBET008VD4ge1xuICAgIGlmICghaXNUeXBlRWxlbWVudChkb20pKSB7XG4gICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuXG4gICAgZm9yIChjb25zdCBlbCBvZiBkb20gYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgbGV0IGVsZW0gPSBlbFtzaWJsaW5nXTtcbiAgICAgICAgd2hpbGUgKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoJChlbGVtKS5pcyhmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0gPSBlbGVtW3NpYmxpbmddO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGNvbnRlbnRzKClgICovXG5mdW5jdGlvbiBub2RlTmFtZShlbGVtOiBOb2RlIHwgbnVsbCwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKGVsZW0gJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCkpO1xufVxuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgdHJhdmVyc2luZyBtZXRob2RzLlxuICogQGphIOODiOODqeODkOODvOOCueODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NVHJhdmVyc2luZzxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVsZW1lbnQgTWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIG9uZSBvZiB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6a44GX44Gm6YWN5LiL44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoaW5kZXg6IG51bWJlcik6IFRFbGVtZW50IHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIHRoZSBlbGVtZW50cyBtYXRjaGVkIGJ5IHRoZSBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgZnjgbnjgabjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KCk6IFRFbGVtZW50W107XG5cbiAgICBwdWJsaWMgZ2V0KGluZGV4PzogbnVtYmVyKTogVEVsZW1lbnRbXSB8IFRFbGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKG51bGwgIT0gaW5kZXgpIHtcbiAgICAgICAgICAgIGluZGV4ID0gTWF0aC5mbG9vcihpbmRleCk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggPCAwID8gdGhpc1tpbmRleCArIHRoaXMubGVuZ3RoXSA6IHRoaXNbaW5kZXhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9BcnJheSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHJpZXZlIGFsbCB0aGUgZWxlbWVudHMgY29udGFpbmVkIGluIHRoZSBbW0RPTV1dIHNldCwgYXMgYW4gYXJyYXkuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBmeOBueOBpuOCkumFjeWIl+OBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyB0b0FycmF5KCk6IFRFbGVtZW50W10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXNdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBlbGVtZW50IHdpdGhpbiB0aGUgW1tET01dXSBjb2xsZWN0aW9uIHJlbGF0aXZlIHRvIGl0cyBzaWJsaW5nIGVsZW1lbnRzLlxuICAgICAqIEBqYSBbW0RPTV1dIOWGheOBruacgOWIneOBruimgee0oOOBjOWFhOW8n+imgee0oOOBruS9leeVquebruOBq+aJgOWxnuOBmeOCi+OBi+OCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpbmRleCgpOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VhcmNoIGZvciBhIGdpdmVuIGEgc2VsZWN0b3IsIGVsZW1lbnQsIG9yIFtbRE9NXV0gaW5zdGFuY2UgZnJvbSBhbW9uZyB0aGUgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg44K744Os44Kv44K/LCDopoHntKAsIOOBvuOBn+OBryBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBlywg6YWN5LiL44Gu5L2V55Wq55uu44Gr5omA5bGe44GX44Gm44GE44KL44GL44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGluZGV4PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oc2VsZWN0b3I6IHN0cmluZyB8IFQgfCBET008VD4pOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgICBwdWJsaWMgaW5kZXg8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihzZWxlY3Rvcj86IHN0cmluZyB8IFQgfCBET008VD4pOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgbGV0IGNoaWxkOiBOb2RlIHwgbnVsbCA9IHRoaXNbMF07XG4gICAgICAgICAgICB3aGlsZSAobnVsbCAhPT0gKGNoaWxkID0gY2hpbGQucHJldmlvdXNTaWJsaW5nKSkge1xuICAgICAgICAgICAgICAgIGlmIChOb2RlLkVMRU1FTlRfTk9ERSA9PT0gY2hpbGQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVsZW06IFQgfCBFbGVtZW50O1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGVsZW0gPSAkKHNlbGVjdG9yKVswXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbSA9IHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQmFzZSA/IHNlbGVjdG9yWzBdIDogc2VsZWN0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpID0gWy4uLnRoaXNdLmluZGV4T2YoZWxlbSBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgIHJldHVybiAwIDw9IGkgPyBpIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBUcmF2ZXJzaW5nXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgZmlyc3QgaW4gdGhlIHNldCBhcyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovmnIDliJ3jga7opoHntKDjgpIgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKHRoaXNbMF0pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGZpbmFsIG9uZSBpbiB0aGUgc2V0IGFzIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+acq+WwvuOBruimgee0oOOCkiBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOBq+OBl+OBpuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJCh0aGlzW3RoaXMubGVuZ3RoIC0gMV0pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyBbW0RPTV1dIGluc3RhbmNlIHdpdGggZWxlbWVudHMgYWRkZWQgdG8gdGhlIHNldCBmcm9tIHNlbGVjdG9yLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCDjgaflj5blvpfjgZfjgZ8gYEVsZW1lbnRgIOOCkui/veWKoOOBl+OBn+aWsOimjyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTUNsYXNzXV0uXG4gICAgICogIC0gYGphYCBbW0RPTUNsYXNzXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0ICRhZGQgPSAkKHNlbGVjdG9yLCBjb250ZXh0KTtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBuZXcgU2V0KFsuLi50aGlzLCAuLi4kYWRkXSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtc10gYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgb2YgZWxlbWVudHMgYWdhaW5zdCBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3aW5ub3coc2VsZWN0b3IsIHRoaXMsICgpID0+IHRydWUsICgpID0+IGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyBbW0RPTV1dIGluc3RhbmNlIGluY2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuWGheWMheOBmeOCiyDmlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBURWxlbWVudFtdID0gW107XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5wdXNoKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGVsZW1lbnRzIGZyb20gdGhlIHNldCBvZiBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLliYrpmaTjgZfjgabov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcgW1tET01dXSBpbnN0YW5jZSBleGNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLku6XlpJbjgpLlhoXljIXjgZnjgosg5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIG5vdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IG5ldyBTZXQ8VEVsZW1lbnQ+KFsuLi50aGlzXSk7XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5kZWxldGUoZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoWy4uLmVsZW1lbnRzXSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluZDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdG9yID0gJChzZWxlY3RvcikgYXMgRE9NPE5vZGU+O1xuICAgICAgICAgICAgcmV0dXJuICRzZWxlY3Rvci5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbCAhPT0gZWxlbSAmJiBlbC5jb250YWlucyhlbGVtKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSkgYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtcyA9IGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4uZWxlbXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET008VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IGhhdmUgYSBkZXNjZW5kYW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBl+OBn+WtkOimgee0oOaMgeOBpOimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXRzOiBFbGVtZW50W10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChzZWxlY3RvciwgZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIHRhcmdldHMucHVzaCguLi4kdGFyZ2V0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmZpbHRlcigoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgbmV3IFNldCh0YXJnZXRzKSkge1xuICAgICAgICAgICAgICAgIGlmICgoZWxlbSBhcyBOb2RlKSAhPT0gZWwgJiYgKGVsZW0gYXMgTm9kZSkuY29udGFpbnMoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSkgYXMgRE9NPE5vZGU+IGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUGFzcyBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgdGhyb3VnaCBhIGZ1bmN0aW9uLCBwcm9kdWNpbmcgYSBuZXcgW1tET01dXSBpbnN0YW5jZSBjb250YWluaW5nIHRoZSByZXR1cm4gdmFsdWVzLlxuICAgICAqIEBqYSDjgrPjg7zjg6vjg5Djg4Pjgq/jgaflpInmm7TjgZXjgozjgZ/opoHntKDjgpLnlKjjgYTjgabmlrDjgZ/jgasgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmp4vnr4lcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHdpbGwgYmUgaW52b2tlZCBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldC5cbiAgICAgKiAgLSBgamFgIOWQhOimgee0oOOBq+WvvuOBl+OBpuWRvOOBs+WHuuOBleOCjOOCi+WkieabtOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBtYXA8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihjYWxsYmFjazogRE9NTW9kaWZpY2F0aW9uQ2FsbGJhY2s8VEVsZW1lbnQsIFQ+KTogRE9NPFQ+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudHM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRlIG92ZXIgYSBbW0RPTV1dIGluc3RhbmNlLCBleGVjdXRpbmcgYSBmdW5jdGlvbiBmb3IgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuOCs+ODvOODq+ODkOODg+OCr+mWouaVsOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgZWFjaChjYWxsYmFjazogRE9NSXRlcmF0ZUNhbGxiYWNrPFRFbGVtZW50Pik6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IFtpbmRleCwgZWxdIG9mIHRoaXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBpZiAoZmFsc2UgPT09IGNhbGxiYWNrLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byBhIHN1YnNldCBzcGVjaWZpZWQgYnkgYSByYW5nZSBvZiBpbmRpY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZXjgozjgZ/nr4Tlm7Ljga7opoHntKDjgpLlkKvjgoAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiZWdpblxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciBpbmRpY2F0aW5nIHRoZSAwLWJhc2VkIHBvc2l0aW9uIGF0IHdoaWNoIHRoZSBlbGVtZW50cyBiZWdpbiB0byBiZSBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OBrumWi+Wni+S9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqIEBwYXJhbSBlbmRcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgc3RvcCBiZWluZyBzZWxlY3RlZC5cbiAgICAgKiAgLSBgamFgIOWPluOCiuWHuuOBl+OCkue1guOBiOOCi+ebtOWJjeOBruS9jee9ruOCkuekuuOBmSAwIOOBi+OCieWni+OBvuOCi+OCpOODs+ODh+ODg+OCr+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBzbGljZShiZWdpbj86IG51bWJlciwgZW5kPzogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIHJldHVybiAkKFsuLi50aGlzXS5zbGljZShiZWdpbiwgZW5kKSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIG9uZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgZfjgZ/opoHntKDjgpLlkKvjgoAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGVxKGluZGV4OiBudW1iZXIpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMuZ2V0KGluZGV4KSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3IgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQsIGdldCB0aGUgZmlyc3QgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yIGJ5IHRlc3RpbmcgdGhlIGVsZW1lbnQgaXRzZWxmIGFuZCB0cmF2ZXJzaW5nIHVwIHRocm91Z2ggaXRzIGFuY2VzdG9ycyBpbiB0aGUgRE9NIHRyZWUuXG4gICAgICogQGphIOmWi+Wni+imgee0oOOBi+OCieacgOOCgui/keOBhOimquimgee0oOOCkumBuOaKni4g44K744Os44Kv44K/44O85oyH5a6a44GX44Gf5aC05ZCILCDjg57jg4Pjg4HjgZnjgovmnIDjgoLov5HjgYTopqropoHntKDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9zZXN0PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmIChudWxsID09IHNlbGVjdG9yIHx8ICFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsb3Nlc3RzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYyA9IGVsLmNsb3Nlc3Qoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmIChjKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsb3Nlc3RzLmFkZChjKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJChbLi4uY2xvc2VzdHNdKSBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHRoaXMgYXMgYW55KTtcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50cyhzZWxlY3RvcikuZXEoMCkgYXMgRE9NPE5vZGU+IGFzIERPTTxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5ZCE6KaB57Sg44Gu5a2Q6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgYzmjIflrprjgZXjgozjgZ/loLTlkIjjga/jg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/ntZDmnpzjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGlsZHJlbjxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGNoaWxkLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW4uYWRkKGNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNoaWxkcmVuXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IHBhcmVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruacgOWIneOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPikge1xuICAgICAgICAgICAgY29uc3QgcGFyZW50Tm9kZSA9IGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpICYmIHZhbGlkUmV0cmlldmVOb2RlKHBhcmVudE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHBhcmVudHMuYWRkKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkKFsuLi5wYXJlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGFuY2VzdG9ycyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruelluWFiOOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnRzVW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgPGJyPlxuICAgICAqICAgICB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3RvciwgRE9NIG5vZGUsIG9yIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwdWJsaWMgcGFyZW50c1VudGlsPFxuICAgICAgICBUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LFxuICAgICAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgICAgICBWIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlXG4gICAgPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+LCBmaWx0ZXI/OiBET01TZWxlY3RvcjxWPik6IERPTTxUPiB7XG4gICAgICAgIGxldCBwYXJlbnRzOiBOb2RlW10gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGxldCBwYXJlbnROb2RlID0gKGVsIGFzIE5vZGUpLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB3aGlsZSAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudE5vZGUpLmlzKGZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudHMucHVzaChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOikh+aVsOimgee0oOOBjOWvvuixoeOBq+OBquOCi+OBqOOBjeOBr+WPjei7olxuICAgICAgICBpZiAoMSA8IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJlbnRzID0gWy4uLm5ldyBTZXQocGFyZW50cy5yZXZlcnNlKCkpXS5yZXZlcnNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJChwYXJlbnRzKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgZm9sbG93aW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIG5leHQgc2libGluZyBvbmx5IGlmIGl0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAgICAgKiBAamEg6KaB57Sg6ZuG5ZCI44Gu5ZCE6KaB57Sg44Gu55u05b6M44Gr44GC44Gf44KL5YWE5byf6KaB57Sg44KS5oq95Ye6IDxicj5cbiAgICAgKiAgICAg5p2h5Lu25byP44KS5oyH5a6a44GX44CB57WQ5p6c44K744OD44OI44GL44KJ5pu044Gr57We6L6844G/44KS6KGM44GG44GT44Go44KC5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgbmV4dDxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG5leHRTaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICBjb25zdCBlbGVtID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIG5leHRTaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLm5leHRTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7mrKHku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5uZXh0VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgZm9sbG93aW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5qyh5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jg7zjgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ25leHRFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGltbWVkaWF0ZWx5IHByZWNlZGluZyBzaWJsaW5nIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuIDxicj5cbiAgICAgKiAgICAgSWYgYSBzZWxlY3RvciBpcyBwcm92aWRlZCwgaXQgcmV0cmlldmVzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TliY3jga7lhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldlNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIHByZXZTaWJsaW5ncy5hZGQoZWxlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnByZXZTaWJsaW5nc10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDpm4blkIjlhoXjga7lkITopoHntKDjga7liY3ku6XpmY3jga7lhajjgabjga7lhYTlvJ/opoHntKDjgpLlj5blvpcuIOOCu+ODrOOCr+OCv+OCkuaMh+WumuOBmeOCi+OBk+OBqOOBp+ODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OBk+OBqOOBjOWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2QWxsPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5wcmV2VW50aWwodW5kZWZpbmVkLCBzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhbGwgcHJlY2VkaW5nIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgZWxlbWVudCBtYXRjaGVkIGJ5IHRoZSBzZWxlY3Rvci5cbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf6KaB57Sg44Gu5YmN5Lul6ZmN44Gu5YWE5byf6KaB57Sg44GnLCDmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgoTmnaHku7bjgavkuIDoh7TjgZnjgovopoHntKDjgYzlh7rjgabjgY/jgovjgb7jgafpgbjmip7jgZfjgablj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHN0cmluZyBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOaWh+Wtl+WIl+OCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmV2VW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgcmV0dXJuIHJldHJpZXZlU2libGluZ3MoJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnLCB0aGlzLCBzZWxlY3RvciwgZmlsdGVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3JcbiAgICAgKiBAamEg44Oe44OD44OB44GX44Gf5ZCE6KaB57Sg44Gu5YWE5byf6KaB57Sg44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2libGluZ3M8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaWJsaW5ncyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzIGFzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNpYmxpbmcgb2YgJChwYXJlbnROb2RlKS5jaGlsZHJlbihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNpYmxpbmcgIT09IGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoc2libGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyB0ZXh0IGFuZCBjb21tZW50IG5vZGVzLlxuICAgICAqIEBqYSDjg4bjgq3jgrnjg4jjgoRIVE1M44Kz44Oh44Oz44OI44KS5ZCr44KA5a2Q6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGNvbnRlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPikge1xuICAgICAgICAgICAgaWYgKG5vZGVOYW1lKGVsLCAnaWZyYW1lJykpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIEhUTUxJRnJhbWVFbGVtZW50KS5jb250ZW50RG9jdW1lbnQgYXMgTm9kZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKGVsLCAndGVtcGxhdGUnKSkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZCgoZWwgYXMgSFRNTFRlbXBsYXRlRWxlbWVudCkuY29udGVudCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBlbC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNvbnRlbnRzXSkgYXMgRE9NPFQ+O1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NVHJhdmVyc2luZywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsImltcG9ydCB7IHNldE1peENsYXNzQXR0cmlidXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NSXRlcmFibGUgfSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44Oe44OL44OU44Ol44Os44O844K344On44Oz44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01NYW5pcHVsYXRpb248VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEluc2lkZVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIE91dHNpZGVcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBBcm91bmRcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVtb3ZhbFxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBSZXBsYWNlbWVudFxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01NYW5pcHVsYXRpb24sICdwcm90b0V4dGVuZHNPbmx5Jyk7XG5cbi8qXG5bZG9tN11cbi8vIERPTSBJbnNlcnRpb24sIEluc2lkZVxuLmFwcGVuZCgpXG4uYXBwZW5kVG8oKVxuLmh0bWwoKVxuLnByZXBlbmQoKVxuLnByZXBlbmRUbygpXG4udGV4dCgpXG4vLyBET00gSW5zZXJ0aW9uLCBPdXRzaWRlXG4uYWZ0ZXIoKVxuLmJlZm9yZSgpXG4uaW5zZXJ0QWZ0ZXIoKVxuLmluc2VydEJlZm9yZSgpXG4vLyBET00gUmVtb3ZhbFxuLmRldGFjaCgpXG4uZW1wdHkoKVxuLnJlbW92ZSgpXG5cbltqcXVlcnldXG4vLyBET00gSW5zZXJ0aW9uLCBBcm91bmRcbi51bndyYXAoKVxuLndyYXAoKVxuLndyYXBBbGwoKVxuLndyYXBJbm5lcigpXG4vLyBET00gUmVwbGFjZW1lbnRcbi5yZXBsYWNlQWxsKClcbi5yZXBsYWNlV2l0aCgpXG4gKi9cbiIsImltcG9ydCB7IHNldE1peENsYXNzQXR0cmlidXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NSXRlcmFibGUgfSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgc3R5bGUgbWFuYWdlbWVudCBtZXRob2RzLlxuICogQGphIOOCueOCv+OCpOODq+mWoumAo+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU3R5bGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU3R5bGVzXG5cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU3R5bGVzLCAncHJvdG9FeHRlbmRzT25seScpO1xuXG4vKlxuW2RvbTddXG4uY3NzKClcbi5oZWlnaHQoKVxuLm9mZnNldCgpXG4ub3V0ZXJIZWlnaHQoKVxuLm91dGVyV2lkdGgoKVxuLndpZHRoKClcblxuW2pxdWVyeV1cbi5pbm5lckhlaWdodCgpXG4uaW5uZXJXaWR0aCgpXG4ucG9zaXRpb24oKVxuLm9mZnNldFBhcmVudCgpXG4gKi9cbiIsIi8qIGVzbGludC1kaXNhYmxlIG5vLWludmFsaWQtdGhpcywgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBET01FdmVudExpc3RuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEV2ZW50Q29udGV4dCB7XG4gICAgW2Nvb2tpZTogc3RyaW5nXTogQmluZEluZm87XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgPSAnfCcsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudCwgYW55W10+KCksXG4gICAgZXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnQsIEJpbmRFdmVudENvbnRleHQ+KCksXG4gICAgbGl2ZUV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50LCBCaW5kRXZlbnRDb250ZXh0PigpLFxufTtcblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBldmVudC1kYXRhIGZyb20gZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlFdmVudERhdGEoZXZlbnQ6IEV2ZW50KTogYW55W10ge1xuICAgIGNvbnN0IGRhdGEgPSBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5nZXQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpIHx8IFtdO1xuICAgIGRhdGEudW5zaGlmdChldmVudCk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZXZlbnQtZGF0YSB3aXRoIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnREYXRhKGVsZW06IEVsZW1lbnQsIGV2ZW50RGF0YTogYW55W10pOiB2b2lkIHtcbiAgICBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5zZXQoZWxlbSwgZXZlbnREYXRhKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBkZWxldGUgZXZlbnQtZGF0YSBieSBlbGVtZW50ICovXG5mdW5jdGlvbiBkZWxldGVFdmVudERhdGEoZWxlbTogRWxlbWVudCk6IHZvaWQge1xuICAgIF9ldmVudENvbnRleHRNYXAuZXZlbnREYXRhLmRlbGV0ZShlbGVtKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IGV2ZW50IGNvb2tpZSBmcm9tIGV2ZW50IG5hbWUsIHNlbGVjdG9yLCBvcHRpb25zICovXG5mdW5jdGlvbiB0b0Nvb2tpZShldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgZGVsZXRlIG9wdGlvbnMub25jZTtcbiAgICByZXR1cm4gYCR7ZXZlbnR9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucyl9JHtDb25zdC5DT09LSUVfU0VQQVJBVE9SfSR7c2VsZWN0b3J9YDtcbn1cblxuLyoqIEBpbnRlcm5hbCBnZXQgbGlzdGVuZXIgaGFuZGxlcnMgY29udGV4dCBieSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbGVtOiBFbGVtZW50LCBldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkgYXMgQmluZEV2ZW50Q29udGV4dDtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgZnJvbSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoXG4gICAgZWxlbTogRWxlbWVudCxcbiAgICBldmVudHM6IHN0cmluZ1tdLFxuICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgbGlzdGVuZXI6IEV2ZW50TGlzdGVuZXIsXG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXIsXG4gICAgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbik6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWxlbSwgZXZlbnQsIHNlbGVjdG9yLCBvcHRpb25zLCB0cnVlKTtcbiAgICAgICAgaWYgKHJlZ2lzdGVyZWQgJiYgIXJlZ2lzdGVyZWQuaGFzKGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgcmVnaXN0ZXJlZC5hZGQobGlzdGVuZXIpO1xuICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIsXG4gICAgICAgICAgICAgICAgcHJveHksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGVsZW0uYWRkRXZlbnRMaXN0ZW5lciAmJiBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIHByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBhbGwgZXZlbnQgYW5kIGhhbmRsZXIgYnkgZWxlbWVudCwgZm9yIGFsbCBgb2ZmKClgICovXG5mdW5jdGlvbiBleHRyYWN0QWxsSGFuZGxlcnMoZWxlbTogRWxlbWVudCk6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogYW55OyB9W10ge1xuICAgIGNvbnN0IGhhbmRsZXJzOiB7IGV2ZW50OiBzdHJpbmc7IGhhbmRsZXI6IEV2ZW50TGlzdGVuZXI7IG9wdGlvbnM6IGFueTsgfVtdID0gW107XG5cbiAgICBjb25zdCBxdWVyeSA9IChjb250ZXh0OiBCaW5kRXZlbnRDb250ZXh0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZSBvZiBPYmplY3Qua2V5cyhjb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZWQgPSBjb29raWUuc3BsaXQoQ29uc3QuQ09PS0lFX1NFUEFSQVRPUik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzZWVkWzBdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBKU09OLnBhcnNlKHNlZWRbMV0pO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBjb250ZXh0W2Nvb2tpZV0uaGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMucHVzaCh7IGV2ZW50LCBoYW5kbGVyOiBoYW5kbGVyLnByb3h5LCBvcHRpb25zIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHsgZXZlbnRMaXN0ZW5lcnMsIGxpdmVFdmVudExpc3RlbmVycyB9ID0gX2V2ZW50Q29udGV4dE1hcDtcbiAgICBxdWVyeShldmVudExpc3RlbmVycy5nZXQoZWxlbSkpICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiBsaXZlRXZlbnRMaXN0ZW5lcnMuZGVsZXRlKGVsZW0pO1xuXG4gICAgcmV0dXJuIGhhbmRsZXJzO1xufVxuXG4vKiogQGludGVybmFsIHBhcnNlIGV2ZW50IGFyZ3MgKi9cbmZ1bmN0aW9uIHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3M6IGFueVtdKTogeyB0eXBlOiBzdHJpbmdbXTsgc2VsZWN0b3I6IHN0cmluZzsgbGlzdGVuZXI6IERPTUV2ZW50TGlzdG5lcjsgb3B0aW9uczogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnM7IH0ge1xuICAgIGxldCBbdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgaWYgKGlzRnVuY3Rpb24oc2VsZWN0b3IpKSB7XG4gICAgICAgIFt0eXBlLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgICAgICBzZWxlY3RvciA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICB0eXBlID0gIXR5cGUgPyBbXSA6IChpc0FycmF5KHR5cGUpID8gdHlwZSA6IFt0eXBlXSk7XG4gICAgc2VsZWN0b3IgPSBzZWxlY3RvciB8fCAnJztcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSBpZiAodHJ1ZSA9PT0gb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0geyBjYXB0dXJlOiB0cnVlIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9ub1RyaWdnZXIgPSBbJ3Jlc2l6ZScsICdzY3JvbGwnXTtcblxuLyoqIEBpbnRlcm5hbCBldmVudC1zaG9ydGN1dCBpbXBsICovXG5mdW5jdGlvbiBldmVudFNob3J0Y3V0PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4odGhpczogRE9NRXZlbnRzPFQ+LCBuYW1lOiBzdHJpbmcsIGhhbmRsZXI/OiBFdmVudExpc3RlbmVyLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogRE9NRXZlbnRzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSBoYW5kbGVyKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01FdmVudHMgPE5vZGU+IGFzIERPTUV2ZW50czxFbGVtZW50Pikge1xuICAgICAgICAgICAgaWYgKCFfbm9UcmlnZ2VyLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZWxbbmFtZV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsW25hbWVdKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkudHJpZ2dlcihuYW1lIGFzIGFueSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKG5hbWUgYXMgYW55LCBoYW5kbGVyIGFzIGFueSwgb3B0aW9ucyk7XG4gICAgfVxufVxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cbmV4cG9ydCB0eXBlIERPTUV2ZW50TWFwPFQ+XG4gICAgPSBUIGV4dGVuZHMgV2luZG93ID8gV2luZG93RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBEb2N1bWVudCA/IERvY3VtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MQm9keUVsZW1lbnQgPyBIVE1MQm9keUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxGcmFtZVNldEVsZW1lbnQgPyBIVE1MRnJhbWVTZXRFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWFycXVlZUVsZW1lbnQgPyBIVE1MTWFycXVlZUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxWaWRlb0VsZW1lbnQgPyBIVE1MVmlkZW9FbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWVkaWFFbGVtZW50ID8gSFRNTE1lZGlhRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEVsZW1lbnQgPyBIVE1MRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRWxlbWVudCA/IEVsZW1lbnRFdmVudE1hcFxuICAgIDogR2xvYmFsRXZlbnRIYW5kbGVyc0V2ZW50TWFwO1xuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBldmVudCBtYW5hZ2VtZW50cy5cbiAqIEBqYSDjgqTjg5njg7Pjg4jnrqHnkIbjgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUV2ZW50czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBiYXNpY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oLi4uYXJnczogYW55W10pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyB0eXBlOiBldmVudHMsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlTGl2ZUV2ZW50KGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBjb25zdCBldmVudERhdGEgPSBxdWVyeUV2ZW50RGF0YShlKTtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGUudGFyZ2V0IGFzIEVsZW1lbnQgfCBudWxsKSBhcyBET008RWxlbWVudD47XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseSgkdGFyZ2V0WzBdLCBldmVudERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhcmVudCBvZiAkdGFyZ2V0LnBhcmVudHMoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnQpLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkocGFyZW50LCBldmVudERhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlRXZlbnQodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIHF1ZXJ5RXZlbnREYXRhKGUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByb3h5ID0gc2VsZWN0b3IgPyBoYW5kbGVMaXZlRXZlbnQgOiBoYW5kbGVFdmVudDtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxFbGVtZW50Pikge1xuICAgICAgICAgICAgcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoZWwsIGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQgW1tvbl1dIG9yIFtbb25jZV1dIGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiBbW29uXV0g44G+44Gf44GvIFtbb25jZV1dIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyPzogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZT86IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIGxpc3RlbmVyPzogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PiguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxFbGVtZW50Pikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdEFsbEhhbmRsZXJzKGVsKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBldmVudCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxFbGVtZW50Pikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsLCBldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPCBoYW5kbGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBoYW5kbGVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgeyAvLyBiYWNrd2FyZCBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGVyID0gaGFuZGxlcnNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIub3JpZ2luICYmIGhhbmRsZXIubGlzdGVuZXIub3JpZ2luID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCFsaXN0ZW5lcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlci5wcm94eSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZC5kZWxldGUoaGFuZGxlci5saXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZS4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIOS4gOW6puOBoOOBkeWRvOOBs+WHuuOBleOCjOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr5a++44GX44Gm44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KC4uLmFyZ3M6IGFueVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgLi4ub3B0aW9ucywgLi4ueyBvbmNlOiB0cnVlIH0gfTtcblxuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gb25jZUhhbmRsZXIodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgLi4uZXZlbnRBcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgZXZlbnRBcmdzKTtcbiAgICAgICAgICAgIHNlbGYub2ZmKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgICAgICAgICAgZGVsZXRlIG9uY2VIYW5kbGVyLm9yaWdpbjtcbiAgICAgICAgfVxuICAgICAgICBvbmNlSGFuZGxlci5vcmlnaW4gPSBsaXN0ZW5lcjtcbiAgICAgICAgcmV0dXJuIHRoaXMub24odHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYWxsIGhhbmRsZXJzIGFkZGVkIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgavlr77jgZfjgabjgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuIC8gYEV2ZW50YCBpbnN0YW5jZSBvciBgRXZlbnRgIGluc3RhbmNlIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXIC8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrnphY3liJdcbiAgICAgKiBAcGFyYW0gZXZlbnREYXRhXG4gICAgICogIC0gYGVuYCBvcHRpb25hbCBzZW5kaW5nIGRhdGEuXG4gICAgICogIC0gYGphYCDpgIHkv6HjgZnjgovku7vmhI/jga7jg4fjg7zjgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICBzZWVkOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdIHwgRXZlbnQgfCBFdmVudFtdIHwgKGtleW9mIFRFdmVudE1hcCB8IEV2ZW50KVtdLFxuICAgICAgICAuLi5ldmVudERhdGE6IGFueVtdXG4gICAgKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNvbnZlcnQgPSAoYXJnOiBrZXlvZiBURXZlbnRNYXAgfCBFdmVudCk6IEV2ZW50ID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhhcmcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDdXN0b21FdmVudChhcmcsIHtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBldmVudERhdGEsXG4gICAgICAgICAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcmcgYXMgRXZlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZXZlbnRzID0gaXNBcnJheShzZWVkKSA/IHNlZWQgOiBbc2VlZF07XG5cbiAgICAgICAgZm9yIChjb25zdCBldmVudCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgIGNvbnN0IGUgPSBjb252ZXJ0KGV2ZW50KTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEVsZW1lbnQ+KSB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJFdmVudERhdGEoZWwsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgZWwuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgICAgICBkZWxldGVFdmVudERhdGEoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHV0aWxpdHlcblxuICAgIC8qKlxuICAgICAqIEBlbiBTaG9ydGN1dCBmb3IgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ3RyYW5zaXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYHRyYW5zaXRpb25lbmRgIGhhbmRsZXIuXG4gICAgICogIC0gYGphYCBgdHJhbnNpdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyB0cmFuc2l0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IFRyYW5zaXRpb25FdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIHBlcm1hbmVudCA9IGZhbHNlKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUV2ZW50czxOb2RlPiBhcyBET01FdmVudHM8SFRNTEVsZW1lbnQ+O1xuICAgICAgICBmdW5jdGlvbiBmaXJlQ2FsbEJhY2sodGhpczogRWxlbWVudCwgZTogVHJhbnNpdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIGUpO1xuICAgICAgICAgICAgaWYgKCFwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9mZigndHJhbnNpdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBzZWxmLm9uKCd0cmFuc2l0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ2FuaW1hdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEhUTUxFbGVtZW50PjtcbiAgICAgICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IEFuaW1hdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIGUpO1xuICAgICAgICAgICAgaWYgKCFwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9mZignYW5pbWF0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHNlbGYub24oJ2FuaW1hdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJpbmQgb25lIG9yIHR3byBoYW5kbGVycyB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cywgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIGFuZCBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnRzLlxuICAgICAqIEBqYSAx44Gk44G+44Gf44GvMuOBpOOBruODj+ODs+ODieODqeOCkuaMh+WumuOBlywg5LiA6Ie044GX44Gf6KaB57Sg44GuIGBtb3VzZWVudGVyYCwgYG1vdXNlbGVhdmVgIOOCkuaknOefpVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJJbihPdXQpXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIHRoZSBlbGVtZW50LiA8YnI+XG4gICAgICogICAgICAgIElmIGhhbmRsZXIgc2V0IG9ubHkgb25lLCBhIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LCB0b28uXG4gICAgICogIC0gYGphYCBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiA8YnI+XG4gICAgICogICAgICAgICAg5byV5pWw44GMMeOBpOOBp+OBguOCi+WgtOWQiCwgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCguWFvOOBreOCi1xuICAgICAqIEBwYXJhbSBoYW5kbGVyT3V0XG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LlxuICAgICAqICAtIGBqYWAgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBob3ZlcihoYW5kbGVySW46IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBoYW5kbGVyT3V0PzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQpOiB0aGlzIHtcbiAgICAgICAgaGFuZGxlck91dCA9IGhhbmRsZXJPdXQgfHwgaGFuZGxlckluO1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZWVudGVyKGhhbmRsZXJJbikubW91c2VsZWF2ZShoYW5kbGVyT3V0KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBzaG9ydGN1dFxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBkYmxjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBkYmxjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGJsY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2RibGNsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBibHVyYCBldmVudC5cbiAgICAgKiBAamEgYGJsdXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGJsdXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2JsdXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1cyhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXMnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzaW5gIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNpbmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNpbihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNpbicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3Vzb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c291dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5dXBgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5dXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXl1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5ZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBrZXlkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlkb3duKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlwcmVzc2AgZXZlbnQuXG4gICAgICogQGphIGBrZXlwcmVzc2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5cHJlc3MoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXByZXNzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzdWJtaXRgIGV2ZW50LlxuICAgICAqIEBqYSBgc3VibWl0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdWJtaXQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3N1Ym1pdCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY29udGV4dG1lbnVgIGV2ZW50LlxuICAgICAqIEBqYSBgY29udGV4dG1lbnVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNvbnRleHRtZW51KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjb250ZXh0bWVudScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2hhbmdlYCBldmVudC5cbiAgICAgKiBAamEgYGNoYW5nZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjaGFuZ2UnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZG93bihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vtb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW1vdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2V1cGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWVudGVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZW50ZXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZW50ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VsZWF2ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VsZWF2ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VsZWF2ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW91dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdmVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3ZlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdmVyKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW92ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoc3RhcnRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hzdGFydGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hzdGFydChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hzdGFydCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hlbmRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hlbmRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoZW5kKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGVuZCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2htb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNobW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2htb3ZlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaG1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoY2FuY2VsYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoY2FuY2VsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGNhbmNlbChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hjYW5jZWwnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHJlc2l6ZWAgZXZlbnQuXG4gICAgICogQGphIGByZXNpemVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2l6ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgncmVzaXplJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzY3JvbGxgIGV2ZW50LlxuICAgICAqIEBqYSBgc2Nyb2xsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGwoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Njcm9sbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ29weWluZ1xufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FdmVudHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG5cbi8qXG5banF1ZXJ5XVxuLy8gQ29weWluZ1xuLmNsb25lKClcbiAqL1xuIiwiaW1wb3J0IHsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBtYW5pcHVsYXRpb24gbWV0aG9kcy5cbiAqIEBqYSDjgrnjgq/jg63jg7zjg6vjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVNjcm9sbDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFNjcm9sbFxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01TY3JvbGwsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG5cbi8qXG5bZG9tN11cbi5zY3JvbGxMZWZ0KClcbi5zY3JvbGxUb3AoKVxuLnNjcm9sbFRvKClcbiAqL1xuIiwiaW1wb3J0IHsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhbmltYXRpb24vZWZmZWN0IG1ldGhvZHMuXG4gKiBAamEg44Ki44OL44Oh44O844K344On44OzL+OCqOODleOCp+OCr+ODiOaTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRWZmZWN0czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHNcbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRWZmZWN0cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcblxuLypcbltkb203XVxuLmFuaW1hdGUoKVxuLnN0b3AoKVxuLnNob3coKVxuLmhpZGUoKVxuLnRyYW5zZm9ybSgpXG4udHJhbnNpdGlvbigpXG5cbltqcXVlcnldXG4uY2xlYXJRdWV1ZSgpICAgLy8g5pyq5a6aXG4uZGVsYXkoKSAgICAgICAgLy8g5pyq5a6aXG4uZGVxdWV1ZSgpICAgICAgLy8g5pyq5a6aXG4uZmFkZUluKClcbi5mYWRlT3V0KClcbi5mYWRlVG8oKVxuLmZhZGVUb2dnbGUoKVxuLmZpbmlzaCgpICAgICAgIC8vIOacquWumlxuLnF1ZXVlKCkgICAgICAgIC8vIOacquWumlxuLnNsaWRlRG93bigpICAgIC8vIOOChOOCieOBquOBhFxuLnNsaWRlVG9nZ2xlKCkgIC8vIOOChOOCieOBquOBhFxuLnNsaWRlVXAoKSAgICAgIC8vIOOChOOCieOBquOBhFxuLnRvZ2dsZSgpICAgICAgIC8vIOOChOOCieOBquOBhD9cbiAqL1xuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuaW1wb3J0IHsgbWl4aW5zIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIEVsZW1lbnRpZnlTZWVkLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBlbGVtZW50aWZ5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERPTUJhc2UgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgRE9NQXR0cmlidXRlcyB9IGZyb20gJy4vYXR0cmlidXRlcyc7XG5pbXBvcnQgeyBET01UcmF2ZXJzaW5nIH0gZnJvbSAnLi90cmF2ZXJzaW5nJztcbmltcG9ydCB7IERPTU1hbmlwdWxhdGlvbiB9IGZyb20gJy4vbWFuaXB1bGF0aW9uJztcbmltcG9ydCB7IERPTVN0eWxlcyB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCB7IERPTUV2ZW50cyB9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7IERPTVNjcm9sbCB9IGZyb20gJy4vc2Nyb2xsJztcbmltcG9ydCB7IERPTUVmZmVjdHMgfSBmcm9tICcuL2VmZmVjdHMnO1xuXG4vKipcbiAqIEBlbiBUaGlzIGludGVyZmFjZSBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m+OBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD5cbiAgICBleHRlbmRzIERPTUJhc2U8VD4sIERPTUF0dHJpYnV0ZXM8VD4sIERPTVRyYXZlcnNpbmc8VD4sIERPTU1hbmlwdWxhdGlvbjxUPiwgRE9NU3R5bGVzPFQ+LCBET01FdmVudHM8VD4sIERPTVNjcm9sbDxUPiwgRE9NRWZmZWN0czxUPlxueyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG5leHBvcnQgdHlwZSBET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gRWxlbWVudGlmeVNlZWQ8VD4gfCBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIERPTVJlc3VsdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPiA9IFQgZXh0ZW5kcyBET008RWxlbWVudEJhc2U+ID8gVCA6IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBET008VD4gOiBET008SFRNTEVsZW1lbnQ+KTtcbmV4cG9ydCB0eXBlIERPTUl0ZXJhdGVDYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IGJvb2xlYW4gfCB2b2lkO1xuXG4vKipcbiAqIEBlbiBUaGlzIGNsYXNzIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6bXG4gKlxuICogVU5TVVBQT1JURUQgTUVUSE9EIExJU1RcbiAqXG4gKiBbVHJhdmVyc2luZ11cbiAqICAuYWRkQmFjaygpXG4gKiAgLmVuZCgpXG4gKi9cbmV4cG9ydCBjbGFzcyBET01DbGFzcyBleHRlbmRzIG1peGlucyhcbiAgICBET01CYXNlLFxuICAgIERPTUF0dHJpYnV0ZXMsXG4gICAgRE9NVHJhdmVyc2luZyxcbiAgICBET01NYW5pcHVsYXRpb24sXG4gICAgRE9NU3R5bGVzLFxuICAgIERPTUV2ZW50cyxcbiAgICBET01TY3JvbGwsXG4gICAgRE9NRWZmZWN0cyxcbikge1xuICAgIC8qKlxuICAgICAqIHByaXZhdGUgY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBwcml2YXRlIGNvbnN0cnVjdG9yKGVsZW1lbnRzOiBFbGVtZW50QmFzZVtdKSB7XG4gICAgICAgIHN1cGVyKGVsZW1lbnRzKTtcbiAgICAgICAgLy8gYWxsIHNvdXJjZSBjbGFzc2VzIGhhdmUgbm8gY29uc3RydWN0b3IuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBbW0RPTV1dIGluc3RhbmNlIGZyb20gYHNlbGVjdG9yYCBhcmcuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBgc2VsZWN0b3JgIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01DbGFzc11dLlxuICAgICAqICAtIGBqYWAgW1tET01DbGFzc11dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKiBAcmV0dXJucyBbW0RPTUNsYXNzXV0gaW5zdGFuY2UuXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCk6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChzZWxlY3RvciAmJiAhY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgYXMgYW55O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRE9NQ2xhc3MoKGVsZW1lbnRpZnkoc2VsZWN0b3IgYXMgRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQpKSkgYXMgYW55O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHNldHVwIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NQ2xhc3MgfSBmcm9tICcuL2NsYXNzJztcblxuLy8gaW5pdCBmb3Igc3RhdGljXG5zZXR1cChET01DbGFzcy5wcm90b3R5cGUsIERPTUNsYXNzLmNyZWF0ZSk7XG5cbmV4cG9ydCAqIGZyb20gJy4vZXhwb3J0cyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIGRlZmF1bHQgfSBmcm9tICcuL2V4cG9ydHMnO1xuIl0sIm5hbWVzIjpbImRvY3VtZW50Iiwid2luZG93IiwiJCIsImRvbSIsIkN1c3RvbUV2ZW50Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBRUE7Ozs7QUFJQSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQzs7QUNLekM7Ozs7Ozs7Ozs7OztBQVlBLFNBQWdCLFVBQVUsQ0FBeUIsSUFBd0IsRUFBRSxVQUF3QkEsR0FBUTtJQUN6RyxJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1AsT0FBTyxFQUFFLENBQUM7S0FDYjtJQUVELE1BQU0sUUFBUSxHQUFjLEVBQUUsQ0FBQztJQUUvQixJQUFJO1FBQ0EsSUFBSSxRQUFRLEtBQUssT0FBTyxJQUFJLEVBQUU7WUFDMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3pCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFOztnQkFFMUMsTUFBTSxRQUFRLEdBQUdBLEdBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFD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
