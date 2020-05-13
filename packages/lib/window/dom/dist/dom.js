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
   /** @internal */
   const win = coreUtils.safe(globalThis.window);
   /** @internal */
   const doc = coreUtils.safe(globalThis.document);
   /** @internal */
   const evt = coreUtils.safe(globalThis.CustomEvent);
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

   /* eslint-disable
      @typescript-eslint/no-explicit-any
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

   /* eslint-disable
      @typescript-eslint/no-explicit-any
    */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJhdHRyaWJ1dGVzLnRzIiwidHJhdmVyc2luZy50cyIsIm1hbmlwdWxhdGlvbi50cyIsInN0eWxlcy50cyIsImV2ZW50cy50cyIsInNjcm9sbC50cyIsImVmZmVjdHMudHMiLCJjbGFzcy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCglxuICogYHdpbmRvd2Ag44Kq44OW44K444Kn44Kv44OI44GoIGBkb2N1bWVudGAg44Kq44OW44K444Kn44Kv44OI562J44Gu5a2Y5Zyo44KS5L+d6Ki844GZ44KLXG4gKi9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgd2luID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBkb2MgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZXZ0ID0gc2FmZShnbG9iYWxUaGlzLkN1c3RvbUV2ZW50KTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIH0gPSB3aW47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgd2luIGFzIHdpbmRvdyxcbiAgICBkb2MgYXMgZG9jdW1lbnQsXG4gICAgZXZ0IGFzIEN1c3RvbUV2ZW50LFxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgTmlsLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NOYW1lLFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QmFzZSA9IE5vZGUgfCBXaW5kb3c7XG5leHBvcnQgdHlwZSBFbGVtZW50UmVzdWx0PFQ+ID0gVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IEhUTUxFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE5pbDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBUIHwgKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFRbXSA6IG5ldmVyKSB8IE5vZGVMaXN0T2Y8VCBleHRlbmRzIE5vZGUgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgUXVlcnlDb250ZXh0ID0gUGFyZW50Tm9kZSAmIFBhcnRpYWw8Tm9uRWxlbWVudFBhcmVudE5vZGU+O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgRWxlbWVudCBhcnJheSBmcm9tIHNlZWQgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBTZWVkIOOBi+OCiSBFbGVtZW50IOmFjeWIl+OCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUgb3IgV2luZG93IG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXSB7XG4gICAgaWYgKCFzZWVkKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb250ZXh0ID0gY29udGV4dCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG5cbiAgICB0cnkge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBodG1sID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHRtbC5pbmNsdWRlcygnPCcpICYmIGh0bWwuaW5jbHVkZXMoJz4nKSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcmt1cFxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQpICYmICgnIycgPT09IHNlbGVjdG9yWzBdKSAmJiAhL1sgLjw+On5dLy5leGVjKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXJlIElEIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvci5zdWJzdHJpbmcoMSkpO1xuICAgICAgICAgICAgICAgICAgICBlbCAmJiBlbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdib2R5JyA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYm9keVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIHNlbGVjdG9yc1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmNvbnRleHQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgoc2VlZCBhcyBOb2RlKS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWQgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmIChzZWVkWzBdLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZFswXSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBGb3IgZWFzaW5nIGBzd2luZ2AgdGltaW5nLWZ1bmN0aW9uLlxuICogQGphIGVhc2luZyBgc3dpbmdgIOeUqOOCv+OCpOODn+ODs+OCsOmWouaVsFxuICpcbiAqIEByZWZlcmVuY2VcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkyNDUwMzAvbG9va2luZy1mb3ItYS1zd2luZy1saWtlLWVhc2luZy1leHByZXNzaWJsZS1ib3RoLXdpdGgtanF1ZXJ5LWFuZC1jc3MzXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81MjA3MzAxL2pxdWVyeS1lYXNpbmctZnVuY3Rpb25zLXdpdGhvdXQtdXNpbmctYS1wbHVnaW5cbiAqXG4gKiBAcGFyYW0gcHJvZ3Jlc3MgWzAgLSAxXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpbmcocHJvZ3Jlc3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNSAtIChNYXRoLmNvcyhwcm9ncmVzcyAqIE1hdGguUEkpIC8gMik7XG59XG5cbi8qKlxuICogQGVuIFtbZXZhbHVhdGVdXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tldmFsdWF0ZV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZhbE9wdGlvbnMge1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgc3JjPzogc3RyaW5nO1xuICAgIG5vbmNlPzogc3RyaW5nO1xuICAgIG5vTW9kdWxlPzogc3RyaW5nO1xufVxuXG5jb25zdCBfc2NyaXB0c0F0dHJzOiAoa2V5b2YgRXZhbE9wdGlvbnMpW10gPSBbXG4gICAgJ3R5cGUnLFxuICAgICdzcmMnLFxuICAgICdub25jZScsXG4gICAgJ25vTW9kdWxlJyxcbl07XG5cbi8qKlxuICogQGVuIFRoZSBgZXZhbGAgZnVuY3Rpb24gYnkgd2hpY2ggc2NyaXB0IGBub25jZWAgYXR0cmlidXRlIGNvbnNpZGVyZWQgdW5kZXIgdGhlIENTUCBjb25kaXRpb24uXG4gKiBAamEgQ1NQIOeSsOWig+OBq+OBiuOBhOOBpuOCueOCr+ODquODl+ODiCBgbm9uY2VgIOWxnuaAp+OCkuiAg+aFruOBl+OBnyBgZXZhbGAg5a6f6KGM6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnkge1xuICAgIGNvbnN0IGRvYzogRG9jdW1lbnQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQudGV4dCA9IGBDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSA9ICgoKSA9PiB7IHJldHVybiAke2NvZGV9OyB9KSgpO2A7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgX3NjcmlwdHNBdHRycykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gb3B0aW9uc1thdHRyXSB8fCAoKG9wdGlvbnMgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlICYmIChvcHRpb25zIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyKSk7XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIHRyeSB7XG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZSgnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnKTtcbiAgICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KS5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChzY3JpcHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgcmV0dmFsID0gZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBlbGVtZW50aWZ5LFxuICAgIGV2YWx1YXRlLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIERPTVBsdWdpbixcbiAgICBET01DbGFzcyxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxufSBmcm9tICcuL2NsYXNzJztcblxuZGVjbGFyZSBuYW1lc3BhY2UgZG9tIHtcbiAgICBsZXQgZm46IERPTUNsYXNzO1xufVxuXG50eXBlIERPTUZhY3RvcnkgPSA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpID0+IERPTVJlc3VsdDxUPjtcblxubGV0IF9mYWN0b3J5ITogRE9NRmFjdG9yeTtcblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbRE9NXV0gaW5zdGFuY2UgZnJvbSBgc2VsZWN0b3JgIGFyZy5cbiAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2UuXG4gKi9cbmZ1bmN0aW9uIGRvbTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiB7XG4gICAgcmV0dXJuIF9mYWN0b3J5KHNlbGVjdG9yLCBjb250ZXh0KTtcbn1cblxuZG9tLnV0aWxzID0ge1xuICAgIGVsZW1lbnRpZnksXG4gICAgZXZhbHVhdGUsXG59O1xuXG4vKiogQGludGVybmFsIOW+queSsOWPgueFp+WbnumBv+OBruOBn+OCgeOBrumBheW7tuOCs+ODs+OCueODiOODqeOCr+OCt+ODp+ODs+ODoeOCveODg+ODiSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKGZuOiBET01DbGFzcywgZmFjdG9yeTogRE9NRmFjdG9yeSk6IHZvaWQge1xuICAgIF9mYWN0b3J5ID0gZmFjdG9yeTtcbiAgICBkb20uZm4gPSBmbjtcbn1cblxuZXhwb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIEV2YWxPcHRpb25zLFxuICAgIERPTSxcbiAgICBET01QbHVnaW4sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20sXG59O1xuIiwiaW1wb3J0IHsgTmlsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdywgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3InKTtcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdGlvbiBjbGFzcyBvZiBbW0RPTUNsYXNzXV0uIFRoaXMgY2xhc3MgcHJvdmlkZXMgaXRlcmF0b3IgbWV0aG9kcy5cbiAqIEBqYSBbW0RPTUNsYXNzXV0g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50czogVFtdKSB7XG4gICAgICAgIGNvbnN0IHNlbGY6IERPTUFjY2VzczxUPiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaW5kZXgpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IoY3VycmVudCwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYC5cbiAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlKGVsOiB1bmtub3duKTogZWwgaXMgTm9kZSB7XG4gICAgcmV0dXJuICEhKGVsICYmIChlbCBhcyBOb2RlKS5ub2RlVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRWxlbWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBFbGVtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgRWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBlbC5ub2RlVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAobnVsbCAhPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEVsZW1lbnRgIG9yIGBEb2N1bWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBFbGVtZW50YCDjgb7jgZ/jga8gYERvY3VtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVF1ZXJpYWJsZShlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBFbGVtZW50IHwgRG9jdW1lbnQge1xuICAgIHJldHVybiAhIShlbCAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5xdWVyeVNlbGVjdG9yKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2Rcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBEb2N1bWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVEb2N1bWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBEb2N1bWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRE9DVU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgSFRNTEVsZW1lbnRgIOOBvuOBn+OBryBgU1ZHRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlSFRNTE9yU1ZHRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRG9jdW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IGRvbVswXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYFdpbmRvd2AuXG4gKiBAamEgW1tET01dXSDjgYwgYFdpbmRvd2Ag44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlV2luZG93KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPFdpbmRvdz4ge1xuICAgIHJldHVybiB3aW5kb3cgPT09IGRvbVswXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE5pbC5cbiAqIEBqYSBOaWwg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOaWw+IHtcbiAgICByZXR1cm4gIXNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIHN0cmluZz4ge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOb2RlLlxuICogQGphIE5vZGUg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGU+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgTm9kZSkubm9kZVR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIEVsZW1lbnQuXG4gKiBAamEgRWxlbWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbGVtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRWxlbWVudD4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIEVsZW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIERvY3VtZW50LlxuICogQGphIERvY3VtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RvY3VtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IHNlbGVjdG9yIGFzIE5vZGUgYXMgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFdpbmRvdy5cbiAqIEBqYSBXaW5kb3cg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgV2luZG93PiB7XG4gICAgcmV0dXJuIHdpbmRvdyA9PT0gc2VsZWN0b3IgYXMgV2luZG93O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgaXMgYWJsZSB0byBpdGVyYXRlLlxuICogQGphIOi1sOafu+WPr+iDveOBquOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTm9kZUxpc3RPZjxOb2RlPj4ge1xuICAgIHJldHVybiBudWxsICE9IChzZWxlY3RvciBhcyBUW10pLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgW1tET01dXS5cbiAqIEBqYSBbW0RPTV1dIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERPTT4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayBub2RlIG5hbWUgaXMgYXJndW1lbnQuXG4gKiBAamEgTm9kZSDlkI3jgYzlvJXmlbDjgafkuI7jgYjjgZ/lkI3liY3jgajkuIDoh7TjgZnjgovjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vZGVOYW1lKGVsZW06IE5vZGUgfCBudWxsLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISEoZWxlbSAmJiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUudG9Mb3dlckNhc2UoKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCBub2RlIG9mZnNldCBwYXJlbnQuIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZXQgcGFyZW50IOOBruWPluW+ly4gU1ZHRWxlbWVudCDjgavjgoLpgannlKjlj6/og71cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE9mZnNldFBhcmVudChub2RlOiBOb2RlKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmICgobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50KSB7XG4gICAgICAgIHJldHVybiAobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50O1xuICAgIH0gZWxzZSBpZiAobm9kZU5hbWUobm9kZSwgJ3N2ZycpKSB7XG4gICAgICAgIGNvbnN0ICRzdmcgPSAkKG5vZGUpO1xuICAgICAgICBjb25zdCBjc3NQcm9wcyA9ICRzdmcuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgaWYgKCdub25lJyA9PT0gY3NzUHJvcHMuZGlzcGxheSB8fCAnZml4ZWQnID09PSBjc3NQcm9wcy5wb3NpdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGFyZW50ID0gJHN2Z1swXS5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGlzcGxheSwgcG9zaXRpb24gfSA9ICQocGFyZW50KS5jc3MoWydkaXNwbGF5JywgJ3Bvc2l0aW9uJ10pO1xuICAgICAgICAgICAgICAgIGlmICgnbm9uZScgPT09IGRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghcG9zaXRpb24gfHwgJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgY2FtZWxpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NVmFsdWVUeXBlPFQsIEsgPSAndmFsdWUnPiA9IFQgZXh0ZW5kcyBIVE1MU2VsZWN0RWxlbWVudCA/IChzdHJpbmcgfCBzdHJpbmdbXSkgOiBLIGV4dGVuZHMga2V5b2YgVCA/IFRbS10gOiB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBET01EYXRhID0gUGxhaW5PYmplY3Q8VHlwZWREYXRhPjtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTFNlbGVjdEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAnc2VsZWN0JyA9PT0gZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAmJiAoZWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLm11bHRpcGxlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc0lucHV0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MSW5wdXRFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhdHRyaWJ1dGVzIG1ldGhvZHMuXG4gKiBAamEg5bGe5oCn5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01BdHRyaWJ1dGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ2xhc3Nlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBjc3MgY2xhc3MgdG8gZWxlbWVudHMuXG4gICAgICogQGphIGNzcyBjbGFzcyDopoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgYW55IG9mIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGFyZSBhc3NpZ25lZCB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCr+ODqeOCueWQjeOCkuWwkeOBquOBj+OBqOOCguimgee0oOOBjOaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZVxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCNXG4gICAgICovXG4gICAgcHVibGljIGhhc0NsYXNzKGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpICYmIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgb3IgcmVtb3ZlIG9uZSBvciBtb3JlIGNsYXNzZXMgZnJvbSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIGRlcGVuZGluZyBvbiBlaXRoZXIgdGhlIGNsYXNzJ3MgcHJlc2VuY2Ugb3IgdGhlIHZhbHVlIG9mIHRoZSBzdGF0ZSBhcmd1bWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu54q25oWL44Gr5b+c44GY44GmLCDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLopoHntKDjgavov73liqAv5YmK6Zmk44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGZvcmNlXG4gICAgICogIC0gYGVuYCBpZiB0aGlzIGFyZ3VtZW50IGV4aXN0cywgdHJ1ZTogdGhlIGNsYXNzZXMgc2hvdWxkIGJlIGFkZGVkIC8gZmFsc2U6IHJlbW92ZWQuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgYzlrZjlnKjjgZnjgovloLTlkIgsIHRydWU6IOOCr+ODqeOCueOCkui/veWKoCAvIGZhbHNlOiDjgq/jg6njgrnjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9nZ2xlQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZm9yY2U/OiBib29sZWFuKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGNvbnN0IG9wZXJhdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBmb3JjZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY2xhc3Nlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QudG9nZ2xlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpID0+IGVsZW0uY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBQcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHByb3BlcnR5IHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQpOiBURWxlbWVudFtUXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIHByb3BlcnR5IHZhbHVlIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuWNmOS4gOODl+ODreODkeODhuOCo+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSB2YWx1ZVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL44OX44Ot44OR44OG44Kj5YCkXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQsIHZhbHVlOiBURWxlbWVudFtUXSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIHByb3BlcnR5IHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgcHJvcGVydHktdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3AocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KGtleTogVCB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IFRFbGVtZW50W1RdKTogVEVsZW1lbnRbVF0gfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgcHJvcGVydHlcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBmaXJzdCAmJiBmaXJzdFtrZXkgYXMgc3RyaW5nXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlXG4gICAgICAgICAgICAgICAgICAgIGVsW2tleSBhcyBzdHJpbmddID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxbbmFtZV0gPSBrZXlbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhdHRyaWJ1dGUgdmFsdWUuIDxicj5cbiAgICAgKiAgICAgVGhlIG1ldGhvZCBnZXRzIHRoZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDlsZ7mgKflgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIGF0dHJpYnV0ZSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSB2YWx1ZS4gaWYgYG51bGxgIHNldCwgcmVtb3ZlIGF0dHJpYnV0ZS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WxnuaAp+WApC4gYG51bGxgIOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiOWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbXVsdGkgYXR0cmlidXRlIHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgYXR0cmlidXRlLXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIGF0dHJpYnV0ZS12YWx1ZSDjg5rjgqLjgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgYXR0cihrZXk6IHN0cmluZyB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQgPT09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmICh1bmRlZmluZWQgPT09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKGtleSk7XG4gICAgICAgICAgICByZXR1cm4gKG51bGwgIT0gYXR0cikgPyBhdHRyIDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYXR0cmlidXRlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVBdHRyKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IGF0dHJpYnV0ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXkgYXMgc3RyaW5nLCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGtleVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgU3RyaW5nKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgYXR0cmlidXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/lsZ7mgKfjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGUgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgb7jgZ/jga/lsZ7mgKflkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlQXR0cihuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF0dHJzID0gaXNBcnJheShuYW1lKSA/IG5hbWUgOiBbbmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBWYWx1ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSB2YWx1ZSDlgKTjga7lj5blvpcuIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4oKTogRE9NVmFsdWVUeXBlPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgdmFsdWUgb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgaYgdmFsdWUg5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU6IERPTVZhbHVlVHlwZTxUPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZT86IERPTVZhbHVlVHlwZTxUPik6IGFueSB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLnNlbGVjdGVkT3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMucHVzaChvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgndmFsdWUnIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbCBhcyBhbnkpLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBubyBzdXBwb3J0IHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSAodmFsdWUgYXMgc3RyaW5nW10pLmluY2x1ZGVzKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW5wdXRFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBEYXRhXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZXMgYWxsIGBET01TdHJpbmdNYXBgIHN0b3JlIHNldCBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIEhUTUw1IGRhdGEtKiDlsZ7mgKfjgacgYERPTVN0cmluZ01hcGAg44Gr5qC857SN44GV44KM44Gf5YWo44OH44O844K/5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGRhdGEoKTogRE9NRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlIGF0IHRoZSBuYW1lZCBkYXRhIHN0b3JlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbiwgYXMgc2V0IGJ5IGRhdGEoa2V5LCB2YWx1ZSkgb3IgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIGtleSDjgafmjIflrprjgZfjgZ8gSFRNTDUgZGF0YS0qIOWxnuaAp+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvcmUgYXJiaXRyYXJ5IGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabku7vmhI/jga7jg4fjg7zjgr/jgpLmoLzntI1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgZGF0YSB2YWx1ZSAobm90IG9ubHkgYHN0cmluZ2ApXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmjIflrpogKOaWh+Wtl+WIl+S7peWkluOCguWPl+S7mOWPrylcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZywgdmFsdWU6IFR5cGVkRGF0YSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGF0YShrZXk/OiBzdHJpbmcsIHZhbHVlPzogVHlwZWREYXRhKTogRE9NRGF0YSB8IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBzdXBwb3J0ZWQgZGF0YXNldCBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgZGF0YXNldFxuICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IHRoaXNbMF0uZGF0YXNldDtcbiAgICAgICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBhbGwgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGE6IERPTURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoZGF0YXNldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtwcm9wXSA9IHRvVHlwZWREYXRhKGRhdGFzZXRbcHJvcF0pIGFzIFR5cGVkRGF0YTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHR5cGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvVHlwZWREYXRhKGRhdGFzZXRbY2FtZWxpemUoa2V5KV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBjb25zdCBwcm9wID0gY2FtZWxpemUoa2V5IHx8ICcnKTtcbiAgICAgICAgICAgIGlmIChwcm9wKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuZGF0YXNldFtwcm9wXSA9IGZyb21UeXBlZERhdGEodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBkYXRhLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/jg4fjg7zjgr/jgpLjg4fjg7zjgr/poJjln5/jgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVEYXRhKGtleTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkoa2V5KSA/IGtleS5tYXAoayA9PiBjYW1lbGl6ZShrKSkgOiBbY2FtZWxpemUoa2V5KV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkYXRhc2V0IH0gPSBlbDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFzZXRbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQXR0cmlidXRlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIG5vb3AsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3csIGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUJhc2UsXG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlUXVlcmlhYmxlLFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGlzRW1wdHlTZWxlY3RvcixcbiAgICBpc1N0cmluZ1NlbGVjdG9yLFxuICAgIGlzRG9jdW1lbnRTZWxlY3RvcixcbiAgICBpc1dpbmRvd1NlbGVjdG9yLFxuICAgIGlzTm9kZVNlbGVjdG9yLFxuICAgIGlzSXRlcmFibGVTZWxlY3RvcixcbiAgICBub2RlTmFtZSxcbiAgICBnZXRPZmZzZXRQYXJlbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCB0eXBlIERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBVO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlzKClgIGFuZCBgZmlsdGVyKClgICovXG5mdW5jdGlvbiB3aW5ub3c8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VT4sXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPFU+LFxuICAgIHZhbGlkQ2FsbGJhY2s6IChlbDogVSkgPT4gYW55LFxuICAgIGludmFsaWRDYWxsYmFjaz86ICgpID0+IGFueSxcbik6IGFueSB7XG4gICAgaW52YWxpZENhbGxiYWNrID0gaW52YWxpZENhbGxiYWNrIHx8IG5vb3A7XG5cbiAgICBsZXQgcmV0dmFsOiBhbnk7XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiBkb20uZW50cmllcygpKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmdTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmICgoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzV2luZG93U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAod2luZG93ID09PSBlbCBhcyBXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0RvY3VtZW50U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQgPT09IGVsIGFzIE5vZGUgYXMgRG9jdW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc05vZGVTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbSA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBhcmVudCgpYCwgYHBhcmVudHMoKWAgYW5kIGBzaWJsaW5ncygpYCAqL1xuZnVuY3Rpb24gdmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGU6IE5vZGUgfCBudWxsKTogcGFyZW50Tm9kZSBpcyBOb2RlIHtcbiAgICByZXR1cm4gbnVsbCAhPSBwYXJlbnROb2RlICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gcGFyZW50Tm9kZS5ub2RlVHlwZSAmJiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2hpbGRyZW4oKWAsIGBwYXJlbnQoKWAsIGBuZXh0KClgIGFuZCBgcHJldigpYCAqL1xuZnVuY3Rpb24gdmFsaWRSZXRyaWV2ZU5vZGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4obm9kZTogTm9kZSB8IG51bGwsIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCk6IG5vZGUgaXMgTm9kZSB7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBpZiAoJChub2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBuZXh0VW50aWwoKWAgYW5kIGBwcmV2VW50aWwoKSAqL1xuZnVuY3Rpb24gcmV0cmlldmVTaWJsaW5nczxcbiAgICBFIGV4dGVuZHMgRWxlbWVudEJhc2UsXG4gICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2Vcbj4oXG4gICAgc2libGluZzogJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnIHwgJ25leHRFbGVtZW50U2libGluZycsXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPEU+LFxuICAgIHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+XG4pOiBET008VD4ge1xuICAgIGlmICghaXNUeXBlRWxlbWVudChkb20pKSB7XG4gICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuXG4gICAgZm9yIChjb25zdCBlbCBvZiBkb20gYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgbGV0IGVsZW0gPSBlbFtzaWJsaW5nXTtcbiAgICAgICAgd2hpbGUgKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoJChlbGVtKS5pcyhmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0gPSBlbGVtW3NpYmxpbmddO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIHRyYXZlcnNpbmcgbWV0aG9kcy5cbiAqIEBqYSDjg4jjg6njg5Djg7zjgrnjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVRyYXZlcnNpbmc8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFbGVtZW50IE1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSBvbmUgb2YgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpumFjeS4i+OBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBURWxlbWVudCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldCgpOiBURWxlbWVudFtdO1xuXG4gICAgcHVibGljIGdldChpbmRleD86IG51bWJlcik6IFRFbGVtZW50W10gfCBURWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChudWxsICE9IGluZGV4KSB7XG4gICAgICAgICAgICBpbmRleCA9IE1hdGguZmxvb3IoaW5kZXgpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGV4IDwgMCA/IHRoaXNbaW5kZXggKyB0aGlzLmxlbmd0aF0gOiB0aGlzW2luZGV4XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvQXJyYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSBhbGwgdGhlIGVsZW1lbnRzIGNvbnRhaW5lZCBpbiB0aGUgW1tET01dXSBzZXQsIGFzIGFuIGFycmF5LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgZnjgbnjgabjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBURWxlbWVudFtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3QgZWxlbWVudCB3aXRoaW4gdGhlIFtbRE9NXV0gY29sbGVjdGlvbiByZWxhdGl2ZSB0byBpdHMgc2libGluZyBlbGVtZW50cy5cbiAgICAgKiBAamEgW1tET01dXSDlhoXjga7mnIDliJ3jga7opoHntKDjgYzlhYTlvJ/opoHntKDjga7kvZXnlarnm67jgavmiYDlsZ7jgZnjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNlYXJjaCBmb3IgYSBnaXZlbiBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciBbW0RPTV1dIGluc3RhbmNlIGZyb20gYW1vbmcgdGhlIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOmFjeS4i+OBruS9leeVquebruOBq+aJgOWxnuOBl+OBpuOBhOOCi+OBi+OCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yOiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgcHVibGljIGluZGV4PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oc2VsZWN0b3I/OiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgIGxldCBjaGlsZDogTm9kZSB8IG51bGwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgd2hpbGUgKG51bGwgIT09IChjaGlsZCA9IGNoaWxkLnByZXZpb3VzU2libGluZykpIHtcbiAgICAgICAgICAgICAgICBpZiAoTm9kZS5FTEVNRU5UX05PREUgPT09IGNoaWxkLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlbGVtOiBUIHwgRWxlbWVudDtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gJChzZWxlY3RvcilbMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW0gPSBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2UgPyBzZWxlY3RvclswXSA6IHNlbGVjdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaSA9IFsuLi50aGlzXS5pbmRleE9mKGVsZW0gYXMgRWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gMCA8PSBpID8gaSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVHJhdmVyc2luZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGZpcnN0IGluIHRoZSBzZXQgYXMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyA5Yid44Gu6KaB57Sg44KSIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJCh0aGlzWzBdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaW5hbCBvbmUgaW4gdGhlIHNldCBhcyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovmnKvlsL7jga7opoHntKDjgpIgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1t0aGlzLmxlbmd0aCAtIDFdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgW1tET01dXSBpbnN0YW5jZSB3aXRoIGVsZW1lbnRzIGFkZGVkIHRvIHRoZSBzZXQgZnJvbSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAg44Gn5Y+W5b6X44GX44GfIGBFbGVtZW50YCDjgpLov73liqDjgZfjgZ/mlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0ICRhZGQgPSAkKHNlbGVjdG9yLCBjb250ZXh0KTtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBuZXcgU2V0KFsuLi50aGlzLCAuLi4kYWRkXSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtc10gYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgb2YgZWxlbWVudHMgYWdhaW5zdCBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3aW5ub3coc2VsZWN0b3IsIHRoaXMsICgpID0+IHRydWUsICgpID0+IGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyBbW0RPTV1dIGluc3RhbmNlIGluY2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuWGheWMheOBmeOCiyDmlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBURWxlbWVudFtdID0gW107XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5wdXNoKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGVsZW1lbnRzIGZyb20gdGhlIHNldCBvZiBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLliYrpmaTjgZfjgabov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcgW1tET01dXSBpbnN0YW5jZSBleGNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLku6XlpJbjgpLlhoXljIXjgZnjgosg5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIG5vdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IG5ldyBTZXQ8VEVsZW1lbnQ+KFsuLi50aGlzXSk7XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5kZWxldGUoZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoWy4uLmVsZW1lbnRzXSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdG9yID0gJChzZWxlY3RvcikgYXMgRE9NPE5vZGU+O1xuICAgICAgICAgICAgcmV0dXJuICRzZWxlY3Rvci5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsICE9PSBlbGVtICYmIGVsLmNvbnRhaW5zKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbXMgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5lbGVtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IGhhdmUgYSBkZXNjZW5kYW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBl+OBn+WtkOimgee0oOaMgeOBpOimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXM8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldHM6IE5vZGVbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoc2VsZWN0b3IsIGVsIGFzIEVsZW1lbnQpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICAgICB0YXJnZXRzLnB1c2goLi4uJHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiBuZXcgU2V0KHRhcmdldHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtICE9PSBlbCAmJiBlbGVtLmNvbnRhaW5zKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFBhc3MgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IHRocm91Z2ggYSBmdW5jdGlvbiwgcHJvZHVjaW5nIGEgbmV3IFtbRE9NXV0gaW5zdGFuY2UgY29udGFpbmluZyB0aGUgcmV0dXJuIHZhbHVlcy5cbiAgICAgKiBAamEg44Kz44O844Or44OQ44OD44Kv44Gn5aSJ5pu044GV44KM44Gf6KaB57Sg44KS55So44GE44Gm5paw44Gf44GrIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5qeL56+JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIG1vZGlmaWNhdGlvbiBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovlpInmm7TplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbWFwPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oY2FsbGJhY2s6IERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFRFbGVtZW50LCBUPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0ZSBvdmVyIGEgW1tET01dXSBpbnN0YW5jZSwgZXhlY3V0aW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGVhY2goY2FsbGJhY2s6IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGZhbHNlID09PSBjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gYSBzdWJzZXQgc3BlY2lmaWVkIGJ5IGEgcmFuZ2Ugb2YgaW5kaWNlcy5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44Gf56+E5Zuy44Gu6KaB57Sg44KS5ZCr44KAIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmVnaW5cbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgYmVnaW4gdG8gYmUgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjga7plovlp4vkvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKiBAcGFyYW0gZW5kXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIHN0b3AgYmVpbmcgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjgpLntYLjgYjjgovnm7TliY3jga7kvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJChbLi4udGhpc10uc2xpY2UoYmVnaW4sIGVuZCkgYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBvbmUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GX44Gf6KaB57Sg44KS5ZCr44KAIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBlcShpbmRleDogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzLmdldChpbmRleCkpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0LCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3RvciBieSB0ZXN0aW5nIHRoZSBlbGVtZW50IGl0c2VsZiBhbmQgdHJhdmVyc2luZyB1cCB0aHJvdWdoIGl0cyBhbmNlc3RvcnMgaW4gdGhlIERPTSB0cmVlLlxuICAgICAqIEBqYSDplovlp4vopoHntKDjgYvjgonmnIDjgoLov5HjgYTopqropoHntKDjgpLpgbjmip4uIOOCu+ODrOOCr+OCv+ODvOaMh+WumuOBl+OBn+WgtOWQiCwg44Oe44OD44OB44GZ44KL5pyA44KC6L+R44GE6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvc2VzdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWxlY3RvciB8fCAhaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsb3Nlc3RzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBlbC5jbG9zZXN0KHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3Nlc3RzLmFkZChjKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5jbG9zZXN0c10pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcyBhcyBhbnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50cyhzZWxlY3RvcikuZXEoMCkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5ZCE6KaB57Sg44Gu5a2Q6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgYzmjIflrprjgZXjgozjgZ/loLTlkIjjga/jg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/ntZDmnpzjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGlsZHJlbjxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGNoaWxkLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLmFkZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNoaWxkcmVuXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IHBhcmVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruacgOWIneOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpICYmIHZhbGlkUmV0cmlldmVOb2RlKHBhcmVudE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLmFkZChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnBhcmVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudHNVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBhbmNlc3RvcnMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLCBET00gbm9kZSwgb3IgW1tET01dXSBpbnN0YW5jZVxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzVW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgbGV0IHBhcmVudHM6IE5vZGVbXSA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgbGV0IHBhcmVudE5vZGUgPSAoZWwgYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHdoaWxlICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KSH5pWw6KaB57Sg44GM5a++6LGh44Gr44Gq44KL44Go44GN44Gv5Y+N6LuiXG4gICAgICAgIGlmICgxIDwgdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcmVudHMgPSBbLi4ubmV3IFNldChwYXJlbnRzLnJldmVyc2UoKSldLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkKHBhcmVudHMpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbW1lZGlhdGVseSBmb2xsb3dpbmcgc2libGluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIElmIGEgc2VsZWN0b3IgaXMgcHJvdmlkZWQsIGl0IHJldHJpZXZlcyB0aGUgbmV4dCBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDopoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TlvozjgavjgYLjgZ/jgovlhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dFNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5uZXh0RWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ubmV4dFNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIGZvbGxvd2luZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruasoeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm5leHRVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7mrKHku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygnbmV4dEVsZW1lbnRTaWJsaW5nJywgdGhpcywgc2VsZWN0b3IsIGZpbHRlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgcHJlY2VkaW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIHByZXZpb3VzIHNpYmxpbmcgb25seSBpZiBpdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOOBruWQhOimgee0oOOBruebtOWJjeOBruWFhOW8n+imgee0oOOCkuaKveWHuiA8YnI+XG4gICAgICogICAgIOadoeS7tuW8j+OCkuaMh+WumuOBl+OAgee1kOaenOOCu+ODg+ODiOOBi+OCieabtOOBq+e1nui+vOOBv+OCkuihjOOBhuOBk+OBqOOCguWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXY8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2U2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ucHJldlNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIHByZWNlZGluZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruWJjeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7liY3ku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygncHJldmlvdXNFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3RvclxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/lkITopoHntKDjga7lhYTlvJ/opoHntKDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBzaWJsaW5nczxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaWJsaW5nIG9mICQocGFyZW50Tm9kZSkuY2hpbGRyZW4oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2libGluZyAhPT0gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoc2libGluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyB0ZXh0IGFuZCBjb21tZW50IG5vZGVzLlxuICAgICAqIEBqYSDjg4bjgq3jgrnjg4jjgoRIVE1M44Kz44Oh44Oz44OI44KS5ZCr44KA5a2Q6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGNvbnRlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUoZWwsICdpZnJhbWUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIE5vZGUgYXMgSFRNTElGcmFtZUVsZW1lbnQpLmNvbnRlbnREb2N1bWVudCBhcyBOb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKGVsLCAndGVtcGxhdGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIE5vZGUgYXMgSFRNTFRlbXBsYXRlRWxlbWVudCkuY29udGVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIGVsLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uY29udGVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2xvc2VzdCBhbmNlc3RvciBlbGVtZW50IHRoYXQgaXMgcG9zaXRpb25lZC5cbiAgICAgKiBAamEg6KaB57Sg44Gu5YWI56WW6KaB57Sg44GnLCDjgrnjgr/jgqTjg6vjgafjg53jgrjjgrfjg6fjg7PmjIflrpoocG9zaXRpaW9u44GMcmVsYXRpdmUsIGFic29sdXRlLCBmaXhlZOOBruOBhOOBmuOCjOOBiynjgZXjgozjgabjgYTjgovjgoLjga7jgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0UGFyZW50PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHJvb3RFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHJvb3RFbGVtZW50KSBhcyBET008Tm9kZT4gYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGdldE9mZnNldFBhcmVudChlbCBhcyBOb2RlKSB8fCByb290RWxlbWVudDtcbiAgICAgICAgICAgICAgICBvZmZzZXRzLmFkZChvZmZzZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoWy4uLm9mZnNldHNdKSBhcyBET008VD47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVRyYXZlcnNpbmcsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQgeyBpc1N0cmluZywgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZURvY3VtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGNoZWNrIEhUTUwgc3RyaW5nICovXG5mdW5jdGlvbiBpc0hUTUxTdHJpbmcoc3JjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBzdWJqZWN0ID0gc3JjLnRyaW0oKTtcbiAgICByZXR1cm4gKCc8JyA9PT0gc3ViamVjdC5zbGljZSgwLCAxKSkgJiYgKCc+JyA9PT0gc3ViamVjdC5zbGljZSgtMSkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGFwcGVuZCgpYCwgYHByZXBlbmQoKWAsIGBiZWZvcmUoKWAgYW5kIGBhZnRlcigpYCAgKi9cbmZ1bmN0aW9uIHRvTm9kZVNldDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IFNldDxOb2RlIHwgc3RyaW5nPiB7XG4gICAgY29uc3Qgbm9kZXMgPSBuZXcgU2V0PE5vZGUgfCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjb250ZW50IG9mIGNvbnRlbnRzKSB7XG4gICAgICAgIGlmICgoaXNTdHJpbmcoY29udGVudCkgJiYgIWlzSFRNTFN0cmluZyhjb250ZW50KSkgfHwgaXNOb2RlKGNvbnRlbnQpKSB7XG4gICAgICAgICAgICBub2Rlcy5hZGQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChjb250ZW50IGFzIERPTTxFbGVtZW50Pik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1N0cmluZyhub2RlKSB8fCAoaXNOb2RlKG5vZGUpICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gbm9kZS5ub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMuYWRkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGUobm9kZTogTm9kZSB8IHN0cmluZyk6IE5vZGUge1xuICAgIGlmIChpc1N0cmluZyhub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGRldGFjaCgpYCBhbmQgYHJlbW92ZSgpYCAqL1xuZnVuY3Rpb24gcmVtb3ZlRWxlbWVudDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCxcbiAgICBkb206IERPTUl0ZXJhYmxlPFU+LFxuICAgIGtlZXBMaXN0ZW5lcjogYm9vbGVhblxuKTogdm9pZCB7XG4gICAgY29uc3QgJGRvbTogRE9NPFU+ID0gbnVsbCAhPSBzZWxlY3RvclxuICAgICAgICA/IChkb20gYXMgRE9NPFU+KS5maWx0ZXIoc2VsZWN0b3IpXG4gICAgICAgIDogZG9tIGFzIERPTTxVPjtcblxuICAgIGlmICgha2VlcExpc3RlbmVyKSB7XG4gICAgICAgICRkb20ub2ZmKCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBlbCBvZiAkZG9tKSB7XG4gICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44Oe44OL44OU44Ol44Os44O844K344On44Oz44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01NYW5pcHVsYXRpb248VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEluc2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBIVE1MIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIEhUTUwgY29udGVudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44GfIEhUTUwg44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaHRtbFN0cmluZ1xuICAgICAqICAtIGBlbmAgQSBzdHJpbmcgb2YgSFRNTCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgosgSFRNTCDmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nOiBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZz86IHN0cmluZyk6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSA/IGVsLmlubmVySFRNTCA6ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGh0bWxTdHJpbmcpKSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sU3RyaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaW52YWxpZCBhcmdcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBhcmcuIGh0bWxTdHJpbmcgdHlwZToke3R5cGVvZiBodG1sU3RyaW5nfWApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBqUXVlcnkgcmV0dXJucyB0aGUgY29tYmluZWQgdGV4dCBvZiBlYWNoIGVsZW1lbnQsIGJ1dCB0aGlzIG1ldGhvZCBtYWtlcyBvbmx5IGZpcnN0IGVsZW1lbnQncyB0ZXh0LlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga7jg4bjgq3jgrnjg4jjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICBqUXVlcnkg44Gv5ZCE6KaB57Sg44Gu6YCj57WQ44OG44Kt44K544OI44KS6L+U5Y2044GZ44KL44GM5pys44Oh44K944OD44OJ44Gv5YWI6aCt6KaB57Sg44Gu44G/44KS5a++6LGh44Go44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIHRleHQoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBzcGVjaWZpZWQgdGV4dC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44Gf44OG44Kt44K544OI44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGV4dFxuICAgICAqICAtIGBlbmAgVGhlIHRleHQgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KL44OG44Kt44K544OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHRleHQodmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIHRleHQodmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGVsLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiAobnVsbCAhPSB0ZXh0KSA/IHRleHQudHJpbSgpIDogJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBlbmQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5hcHBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBiZWdpbm5pbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YWI6aCt44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucHJlcGVuZCguLi5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+imgee0oOOCkuS7luOBruimgee0oOOBruWFiOmgreOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnByZXBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgT3V0c2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYmVmb3JlIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWJjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGJlZm9yZTxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBiZWZvcmUgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5YmN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEJlZm9yZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYmVmb3JlKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYWZ0ZXIgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5b6M44KN44Gr5oyH5a6a44GX44GfIEhUTUwg44KE6KaB57Sg44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWZ0ZXI8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uWy4uLmNvbnRlbnRzXS5yZXZlcnNlKCkpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYWZ0ZXIgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5b6M44KN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEFmdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hZnRlcih0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBBcm91bmRcblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBhbGwgZWxlbWVudHMgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcEFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZURvY3VtZW50KHRoaXMpIHx8IGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgTm9kZTtcblxuICAgICAgICAvLyBUaGUgZWxlbWVudHMgdG8gd3JhcCB0aGUgdGFyZ2V0IGFyb3VuZFxuICAgICAgICBjb25zdCAkd3JhcCA9ICQoc2VsZWN0b3IsIGVsLm93bmVyRG9jdW1lbnQpLmVxKDApLmNsb25lKHRydWUpIGFzIERPTTxFbGVtZW50PjtcblxuICAgICAgICBpZiAoZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgJHdyYXAuaW5zZXJ0QmVmb3JlKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgICR3cmFwLm1hcCgoaW5kZXg6IG51bWJlciwgZWxlbTogRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgd2hpbGUgKGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gZWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9KS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXlgbTjgpIsIOaMh+WumuOBl+OBn+WIpeOCqOODrOODoeODs+ODiOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwSW5uZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRzID0gJGVsLmNvbnRlbnRzKCk7XG4gICAgICAgICAgICBpZiAoMCA8IGNvbnRlbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRzLndyYXBBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWwuYXBwZW5kKHNlbGVjdG9yIGFzIE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkiwg5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICRlbC53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHBhcmVudHMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTSwgbGVhdmluZyB0aGUgbWF0Y2hlZCBlbGVtZW50cyBpbiB0aGVpciBwbGFjZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu6Kaq44Ko44Os44Oh44Oz44OI44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdW53cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICBzZWxmLnBhcmVudChzZWxlY3Rvcikubm90KCdib2R5JykuZWFjaCgoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICQoZWxlbSkucmVwbGFjZVdpdGgoZWxlbS5jaGlsZE5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVtb3ZhbFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgY2hpbGQgbm9kZXMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg5YaF44Gu5a2Q6KaB57SgKOODhuOCreOCueODiOOCguWvvuixoSnjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZW1wdHkoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS4gVGhpcyBtZXRob2Qga2VlcHMgZXZlbnQgbGlzdGVuZXIgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkLiDliYrpmaTlvozjgoLjgqTjg5njg7Pjg4jjg6rjgrnjg4rjga/mnInlirlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZGV0YWNoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6KaB57Sg44KSIERPTSDjgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgZmFsc2UpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlcGxhY2VtZW50XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHdpdGggdGhlIHByb3ZpZGVkIG5ldyBjb250ZW50IGFuZCByZXR1cm4gdGhlIHNldCBvZiBlbGVtZW50cyB0aGF0IHdhcyByZW1vdmVkLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZXjgozjgZ/liKXjga7opoHntKDjgoQgSFRNTCDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdDb250ZW50XG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlV2l0aDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihuZXdDb250ZW50PzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgZWxlbSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChuZXdDb250ZW50KTtcbiAgICAgICAgICAgIGlmICgxID09PSAkZG9tLmxlbmd0aCAmJiBpc05vZGVFbGVtZW50KCRkb21bMF0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRkb21bMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5yZXBsYWNlV2l0aChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggdGFyZ2V0IGVsZW1lbnQgd2l0aCB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeOBruimgee0oOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5yZXBsYWNlV2l0aCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NTWFuaXB1bGF0aW9uLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzQXJyYXksXG4gICAgY2xhc3NpZnksXG4gICAgZGFzaGVyaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgKi9cbmZ1bmN0aW9uIGVuc3VyZUNoYWluQ2FzZVByb3Blcmllcyhwcm9wczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4pOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgcmV0dmFsID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gcHJvcHMpIHtcbiAgICAgICAgcmV0dmFsW2Rhc2hlcml6ZShrZXkpXSA9IHByb3BzW2tleV07XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0RGVmYXVsdFZpZXcoZWw6IEVsZW1lbnQpOiBXaW5kb3cge1xuICAgIHJldHVybiAoZWwub3duZXJEb2N1bWVudCAmJiBlbC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3KSB8fCB3aW5kb3c7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWw6IEVsZW1lbnQpOiBDU1NTdHlsZURlY2xhcmF0aW9uIHtcbiAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgIHJldHVybiB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgY3NzIHZhbHVlIHRvIG51bWJlciAqL1xuZnVuY3Rpb24gdG9OdW1iZXIodmFsOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbCkgfHwgMDtcbn1cblxuY29uc3QgX3Jlc29sdmVyID0ge1xuICAgIHdpZHRoOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICBoZWlnaHQ6IFsndG9wJywgJ2JvdHRvbSddLFxufTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRQYWRkaW5nKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzBdfWApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRCb3JkZXIoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVswXX0td2lkdGhgKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgYm9yZGVyLSR7X3Jlc29sdmVyW3R5cGVdWzFdfS13aWR0aGApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRNYXJnaW4oc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgbWFyZ2luLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB3aWR0aCgpYCBhbmQgYGhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLpmaTjgYTjgZ/luYUgKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnRbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgLy8gKHNjcm9sbFdpZHRoIC8gc2Nyb2xsSGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudEVsZW1lbnRbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemUgPSB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2JvcmRlci1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemUgLSAoZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2l6ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIHJldHVybiBkb20uY3NzKHR5cGUsIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogYCR7dmFsdWV9cHhgKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgaW5uZXJXaWR0aCgpYCBhbmQgYGlubmVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VJbm5lclNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgICAgIHJldHVybiBlbFtgY2xpZW50JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlIGFzIG51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCArIGdldEJvcmRlcihzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzOiBhbnlbXSk6IHsgaW5jbHVkZU1hcmdpbjogYm9vbGVhbjsgdmFsdWU6IG51bWJlciB8IHN0cmluZzsgfSB7XG4gICAgbGV0IFt2YWx1ZSwgaW5jbHVkZU1hcmdpbl0gPSBhcmdzO1xuICAgIGlmICghaXNOdW1iZXIodmFsdWUpICYmICFpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgaW5jbHVkZU1hcmdpbiA9ICEhdmFsdWU7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4geyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlT3V0ZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbjogYm9vbGVhbiwgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkuWQq+OCgeOBn+W5hSAoaW5uZXJXaWR0aCAvIGlubmVySGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXVtgaW5uZXIke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAob2Zmc2V0V2lkdGggLyBvZmZzZXRIZWlnaHQpXG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVNYXJnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQgKyBnZXRNYXJnaW4oc3R5bGUsIHR5cGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFyZ2luID0gaW5jbHVkZU1hcmdpbiA/IGdldE1hcmdpbihzdHlsZSwgdHlwZSkgOiAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAoaXNUZXh0UHJvcCA/IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpIDogdmFsdWUgYXMgbnVtYmVyKSAtIG1hcmdpbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdjb250ZW50LWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRCb3JkZXIoc3R5bGUsIHR5cGUpIC0gZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWx9cHhgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgcG9zaXRpb24oKWAgYW5kIGBvZmZzZXQoKWAgKi9cbmZ1bmN0aW9uIGdldE9mZnNldFBvc2l0aW9uKGVsOiBFbGVtZW50KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAvLyBmb3IgZGlzcGxheSBub25lXG4gICAgaWYgKGVsLmdldENsaWVudFJlY3RzKCkubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgfVxuXG4gICAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiByZWN0LnRvcCArIHZpZXcucGFnZVlPZmZzZXQsXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHZpZXcucGFnZVhPZmZzZXRcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgb2Zmc2V0W1dpZHRoIHwgSGVpZ2h0XS4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNlW1dpZHRoIHwgSGVpZ2h0XSDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRTaXplKGVsOiBIVE1MT3JTVkdFbGVtZW50LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIGlmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICByZXR1cm4gZWxbYG9mZnNldCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIFNWR0VsZW1lbnQg44GvIG9mZnNldFdpZHRoIOOBjOOCteODneODvOODiOOBleOCjOOBquOBhFxuICAgICAgICAgKiAgICAgICAgZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkg44GvIHRyYW5zZm9ybSDjgavlvbHpn7/jgpLlj5fjgZHjgovjgZ/jgoEsXG4gICAgICAgICAqICAgICAgICDlrprnvqnpgJrjgoogYm9yZGVyLCBwYWRkaW4g44KS5ZCr44KB44Gf5YCk44KS566X5Ye644GZ44KLXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsIGFzIFNWR0VsZW1lbnQpO1xuICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgc3R5bGUgbWFuYWdlbWVudCBtZXRob2RzLlxuICogQGphIOOCueOCv+OCpOODq+mWoumAo+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU3R5bGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU3R5bGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjb21wdXRlZCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBDU1Mg44Gr6Kit5a6a44GV44KM44Gm44GE44KL44OX44Ot44OR44OG44Kj5YCk44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3jgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IHZhbHVlIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlgKTjgpLmloflrZfliJfjgafov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG11bHRpcGxlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLopIfmlbDlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXJyYXkgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3phY3liJfjgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5LXZhbHVlIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWVzOiBzdHJpbmdbXSk6IFBsYWluT2JqZWN0PHN0cmluZz47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IENTUyBwcm9wZXJ0aXkgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44GuIENTUyDjg5fjg63jg5Hjg4bjgqPjgavlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgc3RyaW5nIHZhbHVlIHRvIHNldCBmb3IgdGhlIHByb3BlcnR5LiBpZiBudWxsIHBhc3NlZCwgcmVtb3ZlIHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5paH5a2X5YiX44Gn5oyH5a6aLiBudWxsIOaMh+WumuOBp+WJiumZpC5cbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bGwpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBvbmUgb3IgbW9yZSBDU1MgcHJvcGVydGllcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOikh+aVsOOBruODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnRpZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBwcm9wZXJ0eS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj44KS5qC857SN44GX44Gf44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcHVibGljIGNzcyhwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdIHwgUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4sIHZhbHVlPzogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IFBsYWluT2JqZWN0PHN0cmluZz4gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/ICcnIDogdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKGRhc2hlcml6ZShuYW1lKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShuYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgLy8gZ2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShrZXkpO1xuICAgICAgICAgICAgICAgIHByb3BzW2tleV0gPSB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpLmdldFByb3BlcnR5VmFsdWUocHJvcE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKG5hbWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUgfSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gcHJvcHNbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgcHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/mqKrluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruaoquW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+eri+W5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7nuKbluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgb3V0ZXIgd2lkdGggKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCguLi5hcmdzOiBhbnlbXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ3dpZHRoJywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIGhlaWdodCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOe4puW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlckhlaWdodCguLi5hcmdzOiBhbnlbXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBvZmZzZXQgcGFyZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7opqropoHntKDjgYvjgonjga7nm7jlr77nmoTjgarooajnpLrkvY3nva7jgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgcG9zaXRpb24oKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBvZmZzZXQ6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfTtcbiAgICAgICAgbGV0IHBhcmVudE9mZnNldCA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgbWFyZ2luVG9wOiBtdCwgbWFyZ2luTGVmdDogbWwgfSA9ICQoZWwpLmNzcyhbJ3Bvc2l0aW9uJywgJ21hcmdpblRvcCcsICdtYXJnaW5MZWZ0J10pO1xuICAgICAgICBjb25zdCBtYXJnaW5Ub3AgPSB0b051bWJlcihtdCk7XG4gICAgICAgIGNvbnN0IG1hcmdpbkxlZnQgPSB0b051bWJlcihtbCk7XG5cbiAgICAgICAgLy8gcG9zaXRpb246Zml4ZWQgZWxlbWVudHMgYXJlIG9mZnNldCBmcm9tIHRoZSB2aWV3cG9ydCwgd2hpY2ggaXRzZWxmIGFsd2F5cyBoYXMgemVybyBvZmZzZXRcbiAgICAgICAgaWYgKCdmaXhlZCcgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAvLyBBc3N1bWUgcG9zaXRpb246Zml4ZWQgaW1wbGllcyBhdmFpbGFiaWxpdHkgb2YgZ2V0Qm91bmRpbmdDbGllbnRSZWN0XG4gICAgICAgICAgICBvZmZzZXQgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKGVsKTtcblxuICAgICAgICAgICAgLy8gQWNjb3VudCBmb3IgdGhlICpyZWFsKiBvZmZzZXQgcGFyZW50LCB3aGljaCBjYW4gYmUgdGhlIGRvY3VtZW50IG9yIGl0cyByb290IGVsZW1lbnRcbiAgICAgICAgICAgIC8vIHdoZW4gYSBzdGF0aWNhbGx5IHBvc2l0aW9uZWQgZWxlbWVudCBpcyBpZGVudGlmaWVkXG4gICAgICAgICAgICBjb25zdCBkb2MgPSBlbC5vd25lckRvY3VtZW50O1xuICAgICAgICAgICAgbGV0IG9mZnNldFBhcmVudCA9IGdldE9mZnNldFBhcmVudChlbCkgfHwgZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgICAgIGxldCAkb2Zmc2V0UGFyZW50ID0gJChvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgd2hpbGUgKG9mZnNldFBhcmVudCAmJlxuICAgICAgICAgICAgICAgIChvZmZzZXRQYXJlbnQgPT09IGRvYy5ib2R5IHx8IG9mZnNldFBhcmVudCA9PT0gZG9jLmRvY3VtZW50RWxlbWVudCkgJiZcbiAgICAgICAgICAgICAgICAnc3RhdGljJyA9PT0gJG9mZnNldFBhcmVudC5jc3MoJ3Bvc2l0aW9uJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9mZnNldFBhcmVudCA9IG9mZnNldFBhcmVudC5wYXJlbnROb2RlIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvZmZzZXRQYXJlbnQgJiYgb2Zmc2V0UGFyZW50ICE9PSBlbCAmJiBOb2RlLkVMRU1FTlRfTk9ERSA9PT0gb2Zmc2V0UGFyZW50Lm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5jb3Jwb3JhdGUgYm9yZGVycyBpbnRvIGl0cyBvZmZzZXQsIHNpbmNlIHRoZXkgYXJlIG91dHNpZGUgaXRzIGNvbnRlbnQgb3JpZ2luXG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0ID0gZ2V0T2Zmc2V0UG9zaXRpb24ob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGJvcmRlclRvcFdpZHRoLCBib3JkZXJMZWZ0V2lkdGggfSA9ICRvZmZzZXRQYXJlbnQuY3NzKFsnYm9yZGVyVG9wV2lkdGgnLCAnYm9yZGVyTGVmdFdpZHRoJ10pO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC50b3AgKz0gdG9OdW1iZXIoYm9yZGVyVG9wV2lkdGgpO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC5sZWZ0ICs9IHRvTnVtYmVyKGJvcmRlckxlZnRXaWR0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdWJ0cmFjdCBwYXJlbnQgb2Zmc2V0cyBhbmQgZWxlbWVudCBtYXJnaW5zXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3A6IG9mZnNldC50b3AgLSBwYXJlbnRPZmZzZXQudG9wIC0gbWFyZ2luVG9wLFxuICAgICAgICAgICAgbGVmdDogb2Zmc2V0LmxlZnQgLSBwYXJlbnRPZmZzZXQubGVmdCAtIG1hcmdpbkxlZnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBkb2N1bWVudC5cbiAgICAgKiBAamEgZG9jdW1lbnQg44KS5Z+65rqW44Go44GX44GmLCDjg57jg4Pjg4HjgZfjgabjgYTjgovopoHntKDpm4blkIjjga4x44Gk55uu44Gu6KaB57Sg44Gu54++5Zyo44Gu5bqn5qiZ44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldCgpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBqyBkb2N1bWVudCDjgpLln7rmupbjgavjgZfjgZ/nj77lnKjluqfmqJnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb29yZGluYXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHByb3BlcnRpZXMgYHRvcGAgYW5kIGBsZWZ0YC5cbiAgICAgKiAgLSBgamFgIGB0b3BgLCBgbGVmdGAg44OX44Ot44OR44OG44Kj44KS5ZCr44KA44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlczogeyB0b3A/OiBudW1iZXI7IGxlZnQ/OiBudW1iZXI7IH0pOiB0aGlzO1xuXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlcz86IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHwgdGhpcyB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gY29vcmRpbmF0ZXMgPyB7IHRvcDogMCwgbGVmdDogMCB9IDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGNvb3JkaW5hdGVzKSB7XG4gICAgICAgICAgICAvLyBnZXRcbiAgICAgICAgICAgIHJldHVybiBnZXRPZmZzZXRQb3NpdGlvbih0aGlzWzBdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldFxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcHM6IHsgdG9wPzogc3RyaW5nOyBsZWZ0Pzogc3RyaW5nOyB9ID0ge307XG4gICAgICAgICAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdG9wOiBjc3NUb3AsIGxlZnQ6IGNzc0xlZnQgfSA9ICRlbC5jc3MoWydwb3NpdGlvbicsICd0b3AnLCAnbGVmdCddKTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBwb3NpdGlvbiBmaXJzdCwgaW4tY2FzZSB0b3AvbGVmdCBhcmUgc2V0IGV2ZW4gb24gc3RhdGljIGVsZW1cbiAgICAgICAgICAgICAgICBpZiAoJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGN1ck9mZnNldCA9ICRlbC5vZmZzZXQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJQb3NpdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5lZWRDYWxjdWxhdGVQb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgPSAoJ2Fic29sdXRlJyA9PT0gcG9zaXRpb24gfHwgJ2ZpeGVkJyA9PT0gcG9zaXRpb24pICYmIChjc3NUb3AgKyBjc3NMZWZ0KS5pbmNsdWRlcygnYXV0bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmVlZENhbGN1bGF0ZVBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGVsLnBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0b3A6IHRvTnVtYmVyKGNzc1RvcCksIGxlZnQ6IHRvTnVtYmVyKGNzc0xlZnQpIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY29vcmRpbmF0ZXMudG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLnRvcCA9IGAkeyhjb29yZGluYXRlcy50b3AgLSBjdXJPZmZzZXQudG9wKSArIGN1clBvc2l0aW9uLnRvcH1weGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLmxlZnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcHMubGVmdCA9IGAkeyhjb29yZGluYXRlcy5sZWZ0IC0gY3VyT2Zmc2V0LmxlZnQpICsgY3VyUG9zaXRpb24ubGVmdH1weGA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJGVsLmNzcyhwcm9wcyBhcyBQbGFpbk9iamVjdDxzdHJpbmc+KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01TdHlsZXMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgbm8taW52YWxpZC10aGlzXG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSwgaXNUeXBlRWxlbWVudCB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBET01FdmVudExpc3RuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEV2ZW50Q29udGV4dCB7XG4gICAgW2Nvb2tpZTogc3RyaW5nXTogQmluZEluZm87XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgPSAnfCcsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIGFueVtdPigpLFxuICAgIGV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbiAgICBsaXZlRXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCBCaW5kRXZlbnRDb250ZXh0PigpLFxufTtcblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBldmVudC1kYXRhIGZyb20gZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlFdmVudERhdGEoZXZlbnQ6IEV2ZW50KTogYW55W10ge1xuICAgIGNvbnN0IGRhdGEgPSBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5nZXQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpIHx8IFtdO1xuICAgIGRhdGEudW5zaGlmdChldmVudCk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZXZlbnQtZGF0YSB3aXRoIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudERhdGE6IGFueVtdKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuc2V0KGVsZW0sIGV2ZW50RGF0YSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgZGVsZXRlIGV2ZW50LWRhdGEgYnkgZWxlbWVudCAqL1xuZnVuY3Rpb24gZGVsZXRlRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZGVsZXRlKGVsZW0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgZXZlbnQgY29va2llIGZyb20gZXZlbnQgbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMgKi9cbmZ1bmN0aW9uIHRvQ29va2llKGV2ZW50OiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBkZWxldGUgb3B0aW9ucy5vbmNlO1xuICAgIHJldHVybiBgJHtldmVudH0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtKU09OLnN0cmluZ2lmeShvcHRpb25zKX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtzZWxlY3Rvcn1gO1xufVxuXG4vKiogQGludGVybmFsIGdldCBsaXN0ZW5lciBoYW5kbGVycyBjb250ZXh0IGJ5IGVsZW1lbnQgYW5kIGV2ZW50ICovXG5mdW5jdGlvbiBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkgYXMgQmluZEV2ZW50Q29udGV4dDtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgZnJvbSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoXG4gICAgZWxlbTogRWxlbWVudEJhc2UsXG4gICAgZXZlbnRzOiBzdHJpbmdbXSxcbiAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyLFxuICAgIHByb3h5OiBFdmVudExpc3RlbmVyLFxuICAgIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW0sIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgdHJ1ZSk7XG4gICAgICAgIGlmIChyZWdpc3RlcmVkICYmICFyZWdpc3RlcmVkLmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQuYWRkKGxpc3RlbmVyKTtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIHByb3h5LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgJiYgZWxlbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgYWxsIGV2ZW50IGFuZCBoYW5kbGVyIGJ5IGVsZW1lbnQsIGZvciBhbGwgYG9mZigpYCBhbmQgYGNsb25lKHRydWUpYCAqL1xuZnVuY3Rpb24gZXh0cmFjdEFsbEhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCByZW1vdmUgPSB0cnVlKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBhbnk7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogYW55OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIE9iamVjdC5rZXlzKGNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbMF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFsxXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGNvbnRleHRbY29va2llXS5oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgbGl2ZUV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJzZSBldmVudCBhcmdzICovXG5mdW5jdGlvbiBwYXJzZUV2ZW50QXJncyguLi5hcmdzOiBhbnlbXSk6IHsgdHlwZTogc3RyaW5nW107IHNlbGVjdG9yOiBzdHJpbmc7IGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7IG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zOyB9IHtcbiAgICBsZXQgW3R5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICBbdHlwZSwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICAgICAgc2VsZWN0b3IgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdHlwZSA9ICF0eXBlID8gW10gOiAoaXNBcnJheSh0eXBlKSA/IHR5cGUgOiBbdHlwZV0pO1xuICAgIHNlbGVjdG9yID0gc2VsZWN0b3IgfHwgJyc7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHRydWUgPT09IG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHsgY2FwdHVyZTogdHJ1ZSB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbm9UcmlnZ2VyID0gWydyZXNpemUnLCAnc2Nyb2xsJ107XG5cbi8qKiBAaW50ZXJuYWwgZXZlbnQtc2hvcnRjdXQgaW1wbCAqL1xuZnVuY3Rpb24gZXZlbnRTaG9ydGN1dDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHRoaXM6IERPTUV2ZW50czxUPiwgbmFtZTogc3RyaW5nLCBoYW5kbGVyPzogRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IERPTUV2ZW50czxUPiB7XG4gICAgaWYgKG51bGwgPT0gaGFuZGxlcikge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmICghX25vVHJpZ2dlci5pbmNsdWRlcyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGVsW25hbWVdKSkge1xuICAgICAgICAgICAgICAgICAgICBlbFtuYW1lXSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwgYXMgYW55KS50cmlnZ2VyKG5hbWUgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24obmFtZSBhcyBhbnksIGhhbmRsZXIgYXMgYW55LCBvcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRXZlbnQoc3JjOiBFbGVtZW50LCBkc3Q6IEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhzcmMsIGZhbHNlKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgZHN0LmFkZEV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFbGVtZW50KGVsZW06IEVsZW1lbnQsIHdpdGhFdmVudHM6IGJvb2xlYW4sIGRlZXA6IGJvb2xlYW4pOiBFbGVtZW50IHtcbiAgICBjb25zdCBjbG9uZSA9IGVsZW0uY2xvbmVOb2RlKHRydWUpIGFzIEVsZW1lbnQ7XG5cbiAgICBpZiAod2l0aEV2ZW50cykge1xuICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgY29uc3Qgc3JjRWxlbWVudHMgPSBlbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGNvbnN0IGRzdEVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaW5kZXhdIG9mIHNyY0VsZW1lbnRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGNsb25lRXZlbnQoc3JjRWxlbWVudHNbaW5kZXhdLCBkc3RFbGVtZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2xvbmVFdmVudChlbGVtLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xvbmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5leHBvcnQgdHlwZSBET01FdmVudE1hcDxUPlxuICAgID0gVCBleHRlbmRzIFdpbmRvdyA/IFdpbmRvd0V2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRG9jdW1lbnQgPyBEb2N1bWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEJvZHlFbGVtZW50ID8gSFRNTEJvZHlFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MRnJhbWVTZXRFbGVtZW50ID8gSFRNTEZyYW1lU2V0RWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTE1hcnF1ZWVFbGVtZW50ID8gSFRNTE1hcnF1ZWVFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MTWVkaWFFbGVtZW50ID8gSFRNTE1lZGlhRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEVsZW1lbnQgPyBIVE1MRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRWxlbWVudCA/IEVsZW1lbnRFdmVudE1hcFxuICAgIDogR2xvYmFsRXZlbnRIYW5kbGVyc0V2ZW50TWFwO1xuLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBldmVudCBtYW5hZ2VtZW50cy5cbiAqIEBqYSDjgqTjg5njg7Pjg4jnrqHnkIbjgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUV2ZW50czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBiYXNpY1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cy4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIDHjgaTjgb7jgZ/jga/opIfmlbDjga7jgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+OCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KC4uLmFyZ3M6IGFueVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUxpdmVFdmVudChlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgY29uc3QgZXZlbnREYXRhID0gcXVlcnlFdmVudERhdGEoZSk7XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChlLnRhcmdldCBhcyBFbGVtZW50IHwgbnVsbCkgYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkoJHRhcmdldFswXSwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXJlbnQgb2YgJHRhcmdldC5wYXJlbnRzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50KS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHBhcmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIGU6IEV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBxdWVyeUV2ZW50RGF0YShlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcm94eSA9IHNlbGVjdG9yID8gaGFuZGxlTGl2ZUV2ZW50IDogaGFuZGxlRXZlbnQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICByZWdpc3RlckV2ZW50TGlzdGVuZXJIYW5kbGVycyhlbCwgZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIHByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgZXZlbnQgaGFuZGxlci4gVGhlIGhhbmRsZXIgZGVzaWduYXRlZCBhdCBbW29uXV0gb3IgW1tvbmNlXV0gYW5kIHRoYXQgc2FtZSBjb25kaXRpb24gYXJlIHJlbGVhc2VkLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBtZXRob2QgcmVjZWl2ZXMgbm8gYXJndW1lbnRzLCBhbGwgaGFuZGxlcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njga7op6PpmaQuIFtbb25dXSDjgb7jgZ/jga8gW1tvbmNlXV0g44Go5ZCM5p2h5Lu244Gn5oyH5a6a44GX44Gf44KC44Gu44GM6Kej6Zmk44GV44KM44KLIDxicj5cbiAgICAgKiAgICAg5byV5pWw44GM54Sh44GE5aC05ZCI44Gv44GZ44G544Gm44Gu44OP44Oz44OJ44Op44GM6Kej6Zmk44GV44KM44KLLlxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI/OiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQgW1tvbl1dIG9yIFtbb25jZV1dIGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiBbW29uXV0g44G+44Gf44GvIFtbb25jZV1dIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIGxpc3RlbmVyPzogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgZXZlbnQgaGFuZGxlci5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44GZ44G544Gm44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkXG4gICAgICovXG4gICAgcHVibGljIG9mZigpOiB0aGlzO1xuXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KC4uLmFyZ3M6IGFueVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZTogZXZlbnRzLCBzZWxlY3RvciwgbGlzdGVuZXIsIG9wdGlvbnMgfSA9IHBhcnNlRXZlbnRBcmdzKC4uLmFyZ3MpO1xuXG4gICAgICAgIGlmIChldmVudHMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRzID0gZXh0cmFjdEFsbEhhbmRsZXJzKGVsKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihjb250ZXh0LmV2ZW50LCBjb250ZXh0LmhhbmRsZXIsIGNvbnRleHQub3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChjb25zdCBldmVudCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyByZWdpc3RlcmVkLCBoYW5kbGVycyB9ID0gZ2V0RXZlbnRMaXN0ZW5lcnNIYW5kbGVycyhlbCwgZXZlbnQsIHNlbGVjdG9yLCBvcHRpb25zLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwIDwgaGFuZGxlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gaGFuZGxlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHsgLy8gYmFja3dhcmQgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IGhhbmRsZXJzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyLm9yaWdpbiAmJiBoYW5kbGVyLmxpc3RlbmVyLm9yaWdpbiA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICghbGlzdGVuZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGhhbmRsZXIucHJveHksIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWQuZGVsZXRlKGhhbmRsZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCDkuIDluqbjgaDjgZHlkbzjgbPlh7rjgZXjgozjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+WvvuOBl+OBpuOCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMgdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZS4gKGxpdmUgZXZlbnQgYXZhaWxhYmxlKVxuICAgICAqIEBqYSDopoHntKDjgavlr77jgZfjgaYsIOS4gOW6puOBoOOBkeWRvOOBs+WHuuOBleOCjOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr5a++44GX44Gm44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbmNlPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KC4uLmFyZ3M6IGFueVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgLi4ub3B0aW9ucywgLi4ueyBvbmNlOiB0cnVlIH0gfTtcblxuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgZnVuY3Rpb24gb25jZUhhbmRsZXIodGhpczogRE9NRXZlbnRzPFRFbGVtZW50PiwgLi4uZXZlbnRBcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgZXZlbnRBcmdzKTtcbiAgICAgICAgICAgIHNlbGYub2ZmKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgICAgICAgICAgZGVsZXRlIG9uY2VIYW5kbGVyLm9yaWdpbjtcbiAgICAgICAgfVxuICAgICAgICBvbmNlSGFuZGxlci5vcmlnaW4gPSBsaXN0ZW5lcjtcbiAgICAgICAgcmV0dXJuIHRoaXMub24odHlwZSBhcyBhbnksIHNlbGVjdG9yLCBvbmNlSGFuZGxlciwgb3B0cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYWxsIGhhbmRsZXJzIGFkZGVkIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGZvciB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICAgICAqIEBqYSDoqK3lrprjgZXjgozjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgavlr77jgZfjgabjgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuIC8gYEV2ZW50YCBpbnN0YW5jZSBvciBgRXZlbnRgIGluc3RhbmNlIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXIC8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga8gYEV2ZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrnphY3liJdcbiAgICAgKiBAcGFyYW0gZXZlbnREYXRhXG4gICAgICogIC0gYGVuYCBvcHRpb25hbCBzZW5kaW5nIGRhdGEuXG4gICAgICogIC0gYGphYCDpgIHkv6HjgZnjgovku7vmhI/jga7jg4fjg7zjgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdHJpZ2dlcjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICBzZWVkOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdIHwgRXZlbnQgfCBFdmVudFtdIHwgKGtleW9mIFRFdmVudE1hcCB8IEV2ZW50KVtdLFxuICAgICAgICAuLi5ldmVudERhdGE6IGFueVtdXG4gICAgKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IGNvbnZlcnQgPSAoYXJnOiBrZXlvZiBURXZlbnRNYXAgfCBFdmVudCk6IEV2ZW50ID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhhcmcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDdXN0b21FdmVudChhcmcsIHtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlsOiBldmVudERhdGEsXG4gICAgICAgICAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcmcgYXMgRXZlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZXZlbnRzID0gaXNBcnJheShzZWVkKSA/IHNlZWQgOiBbc2VlZF07XG5cbiAgICAgICAgZm9yIChjb25zdCBldmVudCBvZiBldmVudHMpIHtcbiAgICAgICAgICAgIGNvbnN0IGUgPSBjb252ZXJ0KGV2ZW50KTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyRXZlbnREYXRhKGVsLCBldmVudERhdGEpO1xuICAgICAgICAgICAgICAgIGVsLmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlRXZlbnREYXRhKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyB1dGlsaXR5XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIFtbb25jZV1dKCd0cmFuc2l0aW9uZW5kJykuXG4gICAgICogQGphIFtbb25jZV1dKCd0cmFuc2l0aW9uZW5kJykg44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGB0cmFuc2l0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYHRyYW5zaXRpb25lbmRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgdHJhbnNpdGlvbkVuZChjYWxsYmFjazogKGV2ZW50OiBUcmFuc2l0aW9uRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEhUTUxFbGVtZW50PjtcbiAgICAgICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IFRyYW5zaXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ3RyYW5zaXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlzRnVuY3Rpb24oY2FsbGJhY2spICYmIHNlbGYub24oJ3RyYW5zaXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2hvcnRjdXQgZm9yIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKS5cbiAgICAgKiBAamEgW1tvbmNlXV0oJ2FuaW1hdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgYW5pbWF0aW9uZW5kYCBoYW5kbGVyLlxuICAgICAqICAtIGBqYWAgYGFuaW1hdGlvbmVuZGAg44OP44Oz44OJ44OpXG4gICAgICogQHBhcmFtIHBlcm1hbmVudFxuICAgICAqICAtIGBlbmAgaWYgc2V0IGB0cnVlYCwgY2FsbGJhY2sga2VlcCBsaXZpbmcgdW50aWwgZWxlbWVudHMgcmVtb3ZlZC5cbiAgICAgKiAgLSBgamFgIGB0cnVlYCDjgpLoqK3lrprjgZfjgZ/loLTlkIgsIOimgee0oOOBjOWJiumZpOOBleOCjOOCi+OBvuOBp+OCs+ODvOODq+ODkOODg+OCr+OBjOacieWKuVxuICAgICAqL1xuICAgIHB1YmxpYyBhbmltYXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogQW5pbWF0aW9uRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBwZXJtYW5lbnQgPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcyBhcyBET01FdmVudHM8Tm9kZT4gYXMgRE9NRXZlbnRzPEhUTUxFbGVtZW50PjtcbiAgICAgICAgZnVuY3Rpb24gZmlyZUNhbGxCYWNrKHRoaXM6IEVsZW1lbnQsIGU6IEFuaW1hdGlvbkV2ZW50KTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQgIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIGUpO1xuICAgICAgICAgICAgaWYgKCFwZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9mZignYW5pbWF0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpc0Z1bmN0aW9uKGNhbGxiYWNrKSAmJiBzZWxmLm9uKCdhbmltYXRpb25lbmQnLCBmaXJlQ2FsbEJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQmluZCBvbmUgb3IgdHdvIGhhbmRsZXJzIHRvIHRoZSBtYXRjaGVkIGVsZW1lbnRzLCB0byBiZSBleGVjdXRlZCB3aGVuIHRoZSBgbW91c2VlbnRlcmAgYW5kIGBtb3VzZWxlYXZlYCB0aGUgZWxlbWVudHMuXG4gICAgICogQGphIDHjgaTjgb7jgZ/jga8y44Gk44Gu44OP44Oz44OJ44Op44KS5oyH5a6a44GXLCDkuIDoh7TjgZfjgZ/opoHntKDjga4gYG1vdXNlZW50ZXJgLCBgbW91c2VsZWF2ZWAg44KS5qSc55+lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlckluKE91dClcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VlbnRlcmAgdGhlIGVsZW1lbnQuIDxicj5cbiAgICAgKiAgICAgICAgSWYgaGFuZGxlciBzZXQgb25seSBvbmUsIGEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQsIHRvby5cbiAgICAgKiAgLSBgamFgIGBtb3VzZWVudGVyYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIDxicj5cbiAgICAgKiAgICAgICAgICDlvJXmlbDjgYwx44Gk44Gn44GC44KL5aC05ZCILCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KC5YW844Gt44KLXG4gICAgICogQHBhcmFtIGhhbmRsZXJPdXRcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIHRoZSBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCBgbW91c2VsZWF2ZWAg44OP44Oz44OJ44Op44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGhvdmVyKGhhbmRsZXJJbjogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIGhhbmRsZXJPdXQ/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCk6IHRoaXMge1xuICAgICAgICBoYW5kbGVyT3V0ID0gaGFuZGxlck91dCB8fCBoYW5kbGVySW47XG4gICAgICAgIHJldHVybiB0aGlzLm1vdXNlZW50ZXIoaGFuZGxlckluKS5tb3VzZWxlYXZlKGhhbmRsZXJPdXQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogRXZlbnRzIHNob3J0Y3V0XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGNsaWNrYCBldmVudC5cbiAgICAgKiBAamEgYGNsaWNrYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjbGljayhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnY2xpY2snLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGRibGNsaWNrYCBldmVudC5cbiAgICAgKiBAamEgYGRibGNsaWNrYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBkYmxjbGljayhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZGJsY2xpY2snLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGJsdXJgIGV2ZW50LlxuICAgICAqIEBqYSBgYmx1cmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYmx1cihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnYmx1cicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3VzKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1cycsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNpbmAgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c2luYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1c2luKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c2luJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBmb2N1c291dGAgZXZlbnQuXG4gICAgICogQGphIGBmb2N1c291dGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNvdXQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2ZvY3Vzb3V0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXl1cGAgZXZlbnQuXG4gICAgICogQGphIGBrZXl1cGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5dXAoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlkb3duYCBldmVudC5cbiAgICAgKiBAamEgYGtleWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleWRvd24oaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleWRvd24nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGtleXByZXNzYCBldmVudC5cbiAgICAgKiBAamEgYGtleXByZXNzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlwcmVzcyhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgna2V5cHJlc3MnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHN1Ym1pdGAgZXZlbnQuXG4gICAgICogQGphIGBzdWJtaXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN1Ym1pdChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc3VibWl0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjb250ZXh0bWVudWAgZXZlbnQuXG4gICAgICogQGphIGBjb250ZXh0bWVudWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY29udGV4dG1lbnUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NvbnRleHRtZW51JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjaGFuZ2VgIGV2ZW50LlxuICAgICAqIEBqYSBgY2hhbmdlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGFuZ2UoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NoYW5nZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2Vkb3duYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZG93bmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2Vkb3duKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWRvd24nLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbW92ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW1vdmVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlbW92ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vtb3ZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZXVwYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNldXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNldXAoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNldXAnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZW50ZXJgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VlbnRlcihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VlbnRlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VsZWF2ZWAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWxlYXZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZWxlYXZlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZWxlYXZlJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW91dGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZW91dGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdXQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlb3V0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW92ZXJgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdmVyYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW92ZXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlb3ZlcicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hzdGFydGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaHN0YXJ0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaHN0YXJ0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaHN0YXJ0JywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaGVuZGAgZXZlbnQuXG4gICAgICogQGphIGB0b3VjaGVuZGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hlbmQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNoZW5kJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGB0b3VjaG1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2htb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaG1vdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3RvdWNobW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hjYW5jZWxgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hjYW5jZWxgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoY2FuY2VsKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGNhbmNlbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgcmVzaXplYCBldmVudC5cbiAgICAgKiBAamEgYHJlc2l6ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzaXplKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdyZXNpemUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHNjcm9sbGAgZXZlbnQuXG4gICAgICogQGphIGBzY3JvbGxgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnc2Nyb2xsJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBDb3B5aW5nXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu44OH44Kj44O844OX44Kz44OU44O844KS5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0gd2l0aEV2ZW50c1xuICAgICAqICAtIGBlbmAgQSBCb29sZWFuIGluZGljYXRpbmcgd2hldGhlciBldmVudCBoYW5kbGVycyBzaG91bGQgYmUgY29waWVkIGFsb25nIHdpdGggdGhlIGVsZW1lbnRzLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KC44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICogQHBhcmFtIGRlZXBcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgY2xvbmVkIGVsZW1lbnQgc2hvdWxkIGJlIGNvcGllZC5cbiAgICAgKiAgLSBgamFgIGJvb2xlYW7lgKTjgafjgIHphY3kuIvjga7opoHntKDjga7jgZnjgbnjgabjga7lrZDopoHntKDjgavlr77jgZfjgabjgoLjgIHku5jpmo/jgZfjgabjgYTjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLjgrPjg5Tjg7zjgZnjgovjgYvjganjgYbjgYvjgpLmsbrlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUod2l0aEV2ZW50cyA9IGZhbHNlLCBkZWVwID0gZmFsc2UpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudChzZWxmKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGYubWFwKChpbmRleDogbnVtYmVyLCBlbDogVEVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjbG9uZUVsZW1lbnQoZWwgYXMgTm9kZSBhcyBFbGVtZW50LCB3aXRoRXZlbnRzLCBkZWVwKSBhcyBOb2RlIGFzIFRFbGVtZW50O1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTUV2ZW50cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBOaWwsXG4gICAgaXNOdW1iZXIsXG4gICAgaXNGdW5jdGlvbixcbiAgICBjbGFzc2lmeSxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgZW5zdXJlUG9zaXRpdmVOdW1iZXIsXG4gICAgc3dpbmcsXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlSFRNTE9yU1ZHRWxlbWVudCxcbiAgICBpc05vZGVEb2N1bWVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IGdldE9mZnNldFNpemUgfSBmcm9tICcuL3N0eWxlcyc7XG5pbXBvcnQge1xuICAgIHdpbmRvdyxcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG59IGZyb20gJy4vc3NyJztcblxuLyoqXG4gKiBAZW4gW1tET01dXWAuc2Nyb2xsVG8oKWAgb3B0aW9ucyBkZWZpbml0aW9uLlxuICogQGphIFtbRE9NXV1gLnNjcm9sbFRvKClgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs+Wumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTVNjcm9sbE9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogQGphIOe4puOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqL1xuICAgIHRvcD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiBAamEg5qiq44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICovXG4gICAgbGVmdD86IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqIEBqYSDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICovXG4gICAgZHVyYXRpb24/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiBAamEg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqL1xuICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBzY3JvbGwgdGFyZ2V0IGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHF1ZXJ5VGFyZ2V0RWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBFbGVtZW50IHwgbnVsbCB7XG4gICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9IGVsc2UgaWYgKGlzTm9kZURvY3VtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWwuZG9jdW1lbnRFbGVtZW50O1xuICAgIH0gZWxzZSBpZiAod2luZG93ID09PSBlbCkge1xuICAgICAgICByZXR1cm4gd2luZG93LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIHBhcnNlQXJncyguLi5hcmdzOiBhbnlbXSk6IERPTVNjcm9sbE9wdGlvbnMge1xuICAgIGNvbnN0IG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMgPSB7IGVhc2luZzogJ3N3aW5nJyB9O1xuICAgIGlmICgxID09PSBhcmdzLmxlbmd0aCkge1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIGFyZ3NbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IFtsZWZ0LCB0b3AsIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrXSA9IGFyZ3M7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywge1xuICAgICAgICAgICAgdG9wLFxuICAgICAgICAgICAgbGVmdCxcbiAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9wdGlvbnMudG9wICAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLnRvcCk7XG4gICAgb3B0aW9ucy5sZWZ0ICAgICA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMubGVmdCk7XG4gICAgb3B0aW9ucy5kdXJhdGlvbiA9IGVuc3VyZVBvc2l0aXZlTnVtYmVyKG9wdGlvbnMuZHVyYXRpb24pO1xuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgc2Nyb2xsVG8oKWAgKi9cbmZ1bmN0aW9uIGV4ZWNTY3JvbGwoZWw6IEhUTUxFbGVtZW50IHwgU1ZHRWxlbWVudCwgb3B0aW9uczogRE9NU2Nyb2xsT3B0aW9ucyk6IHZvaWQge1xuICAgIGNvbnN0IHsgdG9wLCBsZWZ0LCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjayB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IGluaXRpYWxUb3AgPSBlbC5zY3JvbGxUb3A7XG4gICAgY29uc3QgaW5pdGlhbExlZnQgPSBlbC5zY3JvbGxMZWZ0O1xuICAgIGxldCBlbmFibGVUb3AgPSBpc051bWJlcih0b3ApO1xuICAgIGxldCBlbmFibGVMZWZ0ID0gaXNOdW1iZXIobGVmdCk7XG5cbiAgICAvLyBub24gYW5pbWF0aW9uIGNhc2VcbiAgICBpZiAoIWR1cmF0aW9uKSB7XG4gICAgICAgIGxldCBub3RpZnkgPSBmYWxzZTtcbiAgICAgICAgaWYgKGVuYWJsZVRvcCAmJiB0b3AgIT09IGluaXRpYWxUb3ApIHtcbiAgICAgICAgICAgIGVsLnNjcm9sbFRvcCA9IHRvcCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0ICYmIGxlZnQgIT09IGluaXRpYWxMZWZ0KSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxMZWZ0ID0gbGVmdCBhcyBudW1iZXI7XG4gICAgICAgICAgICBub3RpZnkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub3RpZnkgJiYgaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGNNZXRyaWNzID0gKGVuYWJsZTogYm9vbGVhbiwgYmFzZTogbnVtYmVyLCBpbml0aWFsVmFsdWU6IG51bWJlciwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnKTogeyBtYXg6IG51bWJlcjsgbmV3OiBudW1iZXI7IGluaXRpYWw6IG51bWJlcjsgfSA9PiB7XG4gICAgICAgIGlmICghZW5hYmxlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBtYXg6IDAsIG5ldzogMCwgaW5pdGlhbDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1heFZhbHVlID0gZWxbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF0gLSBnZXRPZmZzZXRTaXplKGVsLCB0eXBlKTtcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1heChNYXRoLm1pbihiYXNlLCBtYXhWYWx1ZSksIDApO1xuICAgICAgICByZXR1cm4geyBtYXg6IG1heFZhbHVlLCBuZXc6IG5ld1ZhbHVlLCBpbml0aWFsOiBpbml0aWFsVmFsdWUgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgbWV0cmljc1RvcCA9IGNhbGNNZXRyaWNzKGVuYWJsZVRvcCwgdG9wIGFzIG51bWJlciwgaW5pdGlhbFRvcCwgJ2hlaWdodCcpO1xuICAgIGNvbnN0IG1ldHJpY3NMZWZ0ID0gY2FsY01ldHJpY3MoZW5hYmxlTGVmdCwgbGVmdCBhcyBudW1iZXIsIGluaXRpYWxMZWZ0LCAnd2lkdGgnKTtcblxuICAgIGlmIChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPT09IG1ldHJpY3NUb3AuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVUb3AgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID09PSBtZXRyaWNzTGVmdC5pbml0aWFsKSB7XG4gICAgICAgIGVuYWJsZUxlZnQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFlbmFibGVUb3AgJiYgIWVuYWJsZUxlZnQpIHtcbiAgICAgICAgLy8gbmVlZCBub3QgdG8gc2Nyb2xsXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjUHJvZ3Jlc3MgPSAodmFsdWU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGVhc2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBlYXNpbmcodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdsaW5lYXInID09PSBlYXNpbmcgPyB2YWx1ZSA6IHN3aW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBkZWx0YSA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGNvbnN0IGFuaW1hdGUgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIGNvbnN0IGVsYXBzZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gTWF0aC5tYXgoTWF0aC5taW4oZWxhcHNlIC8gZHVyYXRpb24sIDEpLCAwKTtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3NDb2VmZiA9IGNhbGNQcm9ncmVzcyhwcm9ncmVzcyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGRlbHRhXG4gICAgICAgIGlmIChlbmFibGVUb3ApIHtcbiAgICAgICAgICAgIGRlbHRhLnRvcCA9IG1ldHJpY3NUb3AuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NUb3AubmV3IC0gbWV0cmljc1RvcC5pbml0aWFsKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVuYWJsZUxlZnQpIHtcbiAgICAgICAgICAgIGRlbHRhLmxlZnQgPSBtZXRyaWNzTGVmdC5pbml0aWFsICsgKHByb2dyZXNzQ29lZmYgKiAobWV0cmljc0xlZnQubmV3IC0gbWV0cmljc0xlZnQuaW5pdGlhbCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgZG9uZVxuICAgICAgICBpZiAoKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA+IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPj0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCBkb3duXG4gICAgICAgICAgICAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3IDwgbWV0cmljc1RvcC5pbml0aWFsICYmIGRlbHRhLnRvcCA8PSBtZXRyaWNzVG9wLm5ldykgICAgICAgfHwgLy8gc2Nyb2xsIHVwXG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPiBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPj0gbWV0cmljc0xlZnQubmV3KSAgfHwgLy8gc2Nyb2xsIHJpZ2h0XG4gICAgICAgICAgICAoZW5hYmxlTGVmdCAmJiBtZXRyaWNzTGVmdC5uZXcgPCBtZXRyaWNzTGVmdC5pbml0aWFsICYmIGRlbHRhLmxlZnQgPD0gbWV0cmljc0xlZnQubmV3KSAgICAgLy8gc2Nyb2xsIGxlZnRcbiAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIGVuYWJsZVRvcCAmJiAoZWwuc2Nyb2xsVG9wID0gbWV0cmljc1RvcC5uZXcpO1xuICAgICAgICAgICAgZW5hYmxlTGVmdCAmJiAoZWwuc2Nyb2xsTGVmdCA9IG1ldHJpY3NMZWZ0Lm5ldyk7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVsZWFzZSByZWZlcmVuY2UgaW1tZWRpYXRlbHkuXG4gICAgICAgICAgICBlbCA9IG51bGwhOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgZW5hYmxlVG9wICYmIChlbC5zY3JvbGxUb3AgPSBkZWx0YS50b3ApO1xuICAgICAgICBlbmFibGVMZWZ0ICYmIChlbC5zY3JvbGxMZWZ0ID0gZGVsdGEubGVmdCk7XG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44K544Kv44Ot44O844Or44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01TY3JvbGw8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBTY3JvbGxcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBleOCjOOBn+ODlOOCr+OCu+ODq+aVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUb3AoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcG9zaXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSBkdXJhdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+OBq+iyu+OChOOBmeaZgumWkyBbbXNlY11cbiAgICAgKiBAcGFyYW0gZWFzaW5nXG4gICAgICogIC0gYGVuYCB0aW1pbmcgZnVuY3Rpb24gZGVmYXVsdDogJ3N3aW5nJ1xuICAgICAqICAtIGBqYWAg44K/44Kk44Of44Oz44Kw6Zai5pWwIOaXouWumuWApDogJ3N3aW5nJ1xuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vlrozkuobjgrPjg7zjg6vjg5Djg4Pjgq9cbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbFRvcCA6IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNjcm9sbFRvKHtcbiAgICAgICAgICAgICAgICB0b3A6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIGhvcml6b250YWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOaoquaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uOiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgc2Nyb2xsTGVmdChcbiAgICAgICAgcG9zaXRpb24/OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBpZiAobnVsbCA9PSBwb3NpdGlvbikge1xuICAgICAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgICAgICBjb25zdCBlbCA9IHF1ZXJ5VGFyZ2V0RWxlbWVudCh0aGlzWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBlbCA/IGVsLnNjcm9sbExlZnQgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgbGVmdDogcG9zaXRpb24sXG4gICAgICAgICAgICAgICAgZHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZWFzaW5nLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB4XG4gICAgICogIC0gYGVuYCB0aGUgaG9yaXpvbnRhbCBzY3JvbGwgdmFsdWUgYnkgcGl4Y2Vscy5cbiAgICAgKiAgLSBgamFgIOaoquOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqIEBwYXJhbSB5XG4gICAgICogIC0gYGVuYCB0aGUgdmVydGljYWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDnuKbjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKFxuICAgICAgICB4OiBudW1iZXIsXG4gICAgICAgIHk6IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIHNjcm9sbCB2YWx1ZXMgYnkgb3B0b2lucy5cbiAgICAgKiBAamEg44Kq44OX44K344On44Oz44KS55So44GE44Gm44K544Kv44Ot44O844Or5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvKG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbFRvKC4uLmFyZ3M6IGFueVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBwYXJzZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgY29uc3QgZWxlbSA9IHF1ZXJ5VGFyZ2V0RWxlbWVudChlbCk7XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbGVtKSkge1xuICAgICAgICAgICAgICAgIGV4ZWNTY3JvbGwoZWxlbSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01TY3JvbGwsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQgeyBzZXRNaXhDbGFzc0F0dHJpYnV0ZSwgV3JpdGFibGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRWxlbWVudEJhc2UsIERPTSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxufSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBwYXJhbWV0ZXIuXG4gKiBAamEgW1tET01dXSDjgqjjg5Xjgqfjgq/jg4jlirnmnpzjga7jg5Hjg6njg6Hjg7zjgr9cbiAqL1xuZXhwb3J0IHR5cGUgRE9NRWZmZWN0UGFyYW1ldGVycyA9IEtleWZyYW1lW10gfCBQcm9wZXJ0eUluZGV4ZWRLZXlmcmFtZXMgfCBudWxsO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBvcHRpb25zLlxuICogQGphIFtbRE9NXV0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdE9wdGlvbnMgPSBudW1iZXIgfCBLZXlmcmFtZUFuaW1hdGlvbk9wdGlvbnM7XG5cbi8qKlxuICogQGVuIFtbRE9NXV0gZWZmZWN0IGNvbnRleHQgb2JqZWN0LlxuICogQGphIFtbRE9NXV0g44Gu44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiB7XG4gICAgLyoqXG4gICAgICogQGVuIFtbRE9NXV0gaW5zdGFuY2UgdGhhdCBjYWxsZWQgW1thbmltYXRlXV0oKSBtZXRob2QuXG4gICAgICogQGphIFtbYW5pbWF0ZV1dKCkg44Oh44K944OD44OJ44KS5a6f6KGM44GX44GfIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgZG9tOiBET008VEVsZW1lbnQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhbmQgYEFuaW1hdGlvbmAgaW5zdGFuY2UgbWFwIGJ5IGV4ZWN1dGlvbiBbW2FuaW1hdGVdXSgpIG1ldGhvZCBhdCB0aGlzIHRpbWUuXG4gICAgICogQGphIOS7iuWbnuWun+ihjOOBl+OBnyBgRWxlbWVudGAg44GoIGBBbmltYXRpb25gIOOCpOODs+OCueOCv+ODs+OCueOBruODnuODg+ODl1xuICAgICAqL1xuICAgIHJlYWRvbmx5IGFuaW1hdGlvbnM6IE1hcDxURWxlbWVudCwgQW5pbWF0aW9uPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgY3VycmVudCBmaW5pc2hlZCBQcm9taXNlIGZvciB0aGlzIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg5a++6LGh44Ki44OL44Oh44O844K344On44Oz44Gu57WC5LqG5pmC44Gr55m654Gr44GZ44KLIGBQcm9taXNlYCDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICByZWFkb25seSBmaW5pc2hlZDogUHJvbWlzZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfYW5pbUNvbnRleHRNYXAgPSBuZXcgV2Vha01hcDxFbGVtZW50LCBTZXQ8QW5pbWF0aW9uPj4oKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhbmltYXRpb24vZWZmZWN0IG1ldGhvZHMuXG4gKiBAamEg44Ki44OL44Oh44O844K344On44OzL+OCqOODleOCp+OCr+ODiOaTjeS9nOODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NRWZmZWN0czxURWxlbWVudCBleHRlbmRzIEVsZW1lbnRCYXNlPiBpbXBsZW1lbnRzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiB7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXByZW1lbnRzOiBET01JdGVyYWJsZTxUPlxuXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFRFbGVtZW50O1xuICAgIHJlYWRvbmx5IGxlbmd0aCE6IG51bWJlcjtcbiAgICBbU3ltYm9sLml0ZXJhdG9yXTogKCkgPT4gSXRlcmF0b3I8VEVsZW1lbnQ+O1xuICAgIGVudHJpZXMhOiAoKSA9PiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRFbGVtZW50XT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEVmZmVjdHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGFydCBhbmltYXRpb24gYnkgYFdlYiBBbmltYXRpb24gQVBJYC5cbiAgICAgKiBAamEgYFdlYiBBbmltYXRpb24gQVBJYCDjgpLnlKjjgYTjgabjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLlrp/ooYxcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0ZShwYXJhbXM6IERPTUVmZmVjdFBhcmFtZXRlcnMsIG9wdGlvbnM6IERPTUVmZmVjdE9wdGlvbnMpOiBET01FZmZlY3RDb250ZXh0PFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGRvbTogdGhpcyBhcyBET01JdGVyYWJsZTxURWxlbWVudD4gYXMgRE9NPFRFbGVtZW50PixcbiAgICAgICAgICAgIGFuaW1hdGlvbnM6IG5ldyBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj4oKSxcbiAgICAgICAgfSBhcyBXcml0YWJsZTxET01FZmZlY3RDb250ZXh0PFRFbGVtZW50Pj47XG5cbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFuaW0gPSBlbC5hbmltYXRlKHBhcmFtcywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwpIHx8IG5ldyBTZXQoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmFkZChhbmltKTtcbiAgICAgICAgICAgICAgICBfYW5pbUNvbnRleHRNYXAuc2V0KGVsLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuYW5pbWF0aW9ucy5zZXQoZWwgYXMgTm9kZSBhcyBURWxlbWVudCwgYW5pbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQuZmluaXNoZWQgPSBQcm9taXNlLmFsbChbLi4ucmVzdWx0LmFuaW1hdGlvbnMudmFsdWVzKCldLm1hcChhbmltID0+IGFuaW0uZmluaXNoZWQpKS50aGVuKCgpID0+IHJlc3VsdCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2FuY2VsIGN1cnJlbnQgcnVubmluZyBhbmltYXRpb24uXG4gICAgICogQGphIOePvuWcqOWun+ihjOOBl+OBpuOBhOOCi+OCouODi+ODoeODvOOCt+ODp+ODs+OCkuS4reatolxuICAgICAqL1xuICAgIHB1YmxpYyBjYW5jZWwoKTogdGhpcyB7XG4gICAgICAgIGlmIChpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0ID0gX2FuaW1Db250ZXh0TWFwLmdldChlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFuaW1hdGlvbiBvZiBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRpb24uY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLmRlbGV0ZShlbCBhcyBFbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZpbmlzaCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLntYLkuoZcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluaXNoKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmZpbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmlzaCDjgafjga/noLTmo4TjgZfjgarjgYRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FZmZlY3RzLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAsIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1pbnRlcmZhY2VcbiAqL1xuXG5pbXBvcnQgeyBtaXhpbnMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRWxlbWVudGlmeVNlZWQsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIGVsZW1lbnRpZnksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgRE9NQmFzZSB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBET01BdHRyaWJ1dGVzIH0gZnJvbSAnLi9hdHRyaWJ1dGVzJztcbmltcG9ydCB7IERPTVRyYXZlcnNpbmcgfSBmcm9tICcuL3RyYXZlcnNpbmcnO1xuaW1wb3J0IHsgRE9NTWFuaXB1bGF0aW9uIH0gZnJvbSAnLi9tYW5pcHVsYXRpb24nO1xuaW1wb3J0IHsgRE9NU3R5bGVzIH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHsgRE9NRXZlbnRzIH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHsgRE9NU2Nyb2xsIH0gZnJvbSAnLi9zY3JvbGwnO1xuaW1wb3J0IHsgRE9NRWZmZWN0cyB9IGZyb20gJy4vZWZmZWN0cyc7XG5cbnR5cGUgRE9NRmVhdHVyZXM8VCBleHRlbmRzIEVsZW1lbnRCYXNlPlxuICAgID0gRE9NQmFzZTxUPlxuICAgICYgRE9NQXR0cmlidXRlczxUPlxuICAgICYgRE9NVHJhdmVyc2luZzxUPlxuICAgICYgRE9NTWFuaXB1bGF0aW9uPFQ+XG4gICAgJiBET01TdHlsZXM8VD5cbiAgICAmIERPTUV2ZW50czxUPlxuICAgICYgRE9NU2Nyb2xsPFQ+XG4gICAgJiBET01FZmZlY3RzPFQ+O1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIHBsdWdpbiBtZXRob2QgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW0RPTV1dIOODl+ODqeOCsOOCpOODs+ODoeOCveODg+ODieWumue+qVxuICpcbiAqIEBub3RlXG4gKiAgLSDjg5fjg6njgrDjgqTjg7Pmi6HlvLXlrprnvqnjga/jgZPjga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnjg57jg7zjgrjjgZnjgosuXG4gKiAgLSBUeXBlU2NyaXB0IDMuNyDmmYLngrnjgacsIG1vZHVsZSBpbnRlcmZhY2Ug44Gu44Oe44O844K444GvIG1vZHVsZSDjga7lrozlhajjgarjg5HjgrnjgpLlv4XopoHjgajjgZnjgovjgZ/jgoEsXG4gKiAgICDmnKzjg6zjg53jgrjjg4jjg6rjgafjga8gYnVuZGxlIOOBl+OBnyBgZGlzdC9kb20uZC50c2Ag44KS5o+Q5L6b44GZ44KLLlxuICpcbiAqIEBzZWVcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMzMzMjZcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzU3ODQ4MTM0L3Ryb3VibGUtdXBkYXRpbmctYW4taW50ZXJmYWNlLXVzaW5nLWRlY2xhcmF0aW9uLW1lcmdpbmdcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01QbHVnaW4geyB9XG5cbi8qKlxuICogQGVuIFRoaXMgaW50ZXJmYWNlIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6b44GZ44KL44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIERPTUZlYXR1cmVzPFQ+LCBET01QbHVnaW4geyB9XG5cbmV4cG9ydCB0eXBlIERPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBFbGVtZW50aWZ5U2VlZDxUPiB8IERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgRE9NUmVzdWx0PFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+ID0gVCBleHRlbmRzIERPTTxFbGVtZW50QmFzZT4gPyBUIDogKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IERPTTxUPiA6IERPTTxIVE1MRWxlbWVudD4pO1xuZXhwb3J0IHR5cGUgRE9NSXRlcmF0ZUNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gPSAoaW5kZXg6IG51bWJlciwgZWxlbWVudDogVCkgPT4gYm9vbGVhbiB8IHZvaWQ7XG5cbi8qKlxuICogQGVuIFRoaXMgY2xhc3MgcHJvdmlkZXMgRE9NIG9wZXJhdGlvbnMgbGlrZSBgalF1ZXJ5YCBsaWJyYXJ5LlxuICogQGphIGBqUXVlcnlgIOOBruOCiOOBhuOBqkRPTSDmk43kvZzjgpLmj5DkvptcbiAqXG4gKiBVTlNVUFBPUlRFRCBNRVRIT0QgTElTVFxuICpcbiAqIFtUcmF2ZXJzaW5nXVxuICogIC5hZGRCYWNrKClcbiAqICAuZW5kKClcbiAqXG4gKiBbRWZmZWN0c11cbiAqIC5zaG93KClcbiAqIC5oaWRlKClcbiAqIC50b2dnbGUoKVxuICogLnN0b3AoKVxuICogLmNsZWFyUXVldWUoKVxuICogLmRlbGF5KClcbiAqIC5kZXF1ZXVlKClcbiAqIC5mYWRlSW4oKVxuICogLmZhZGVPdXQoKVxuICogLmZhZGVUbygpXG4gKiAuZmFkZVRvZ2dsZSgpXG4gKiAucXVldWUoKVxuICogLnNsaWRlRG93bigpXG4gKiAuc2xpZGVUb2dnbGUoKVxuICogLnNsaWRlVXAoKVxuICovXG5leHBvcnQgY2xhc3MgRE9NQ2xhc3MgZXh0ZW5kcyBtaXhpbnMoXG4gICAgRE9NQmFzZSxcbiAgICBET01BdHRyaWJ1dGVzLFxuICAgIERPTVRyYXZlcnNpbmcsXG4gICAgRE9NTWFuaXB1bGF0aW9uLFxuICAgIERPTVN0eWxlcyxcbiAgICBET01FdmVudHMsXG4gICAgRE9NU2Nyb2xsLFxuICAgIERPTUVmZmVjdHMsXG4pIHtcbiAgICAvKipcbiAgICAgKiBwcml2YXRlIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxlbWVudHNcbiAgICAgKiAgLSBgZW5gIG9wZXJhdGlvbiB0YXJnZXRzIGBFbGVtZW50YCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOaTjeS9nOWvvuixoeOBriBgRWxlbWVudGAg6YWN5YiXXG4gICAgICovXG4gICAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihlbGVtZW50czogRWxlbWVudEJhc2VbXSkge1xuICAgICAgICBzdXBlcihlbGVtZW50cyk7XG4gICAgICAgIC8vIGFsbCBzb3VyY2UgY2xhc3NlcyBoYXZlIG5vIGNvbnN0cnVjdG9yLlxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgW1tET01dXSBpbnN0YW5jZSBmcm9tIGBzZWxlY3RvcmAgYXJnLlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gICAgICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4sIGNvbnRleHQ/OiBRdWVyeUNvbnRleHQgfCBudWxsKTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKHNlbGVjdG9yICYmICFjb250ZXh0KSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgaW5zdGFuY2VvZiBET01DbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxlY3RvciBhcyBhbnk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBET01DbGFzcygoZWxlbWVudGlmeShzZWxlY3RvciBhcyBFbGVtZW50aWZ5U2VlZDxUPiwgY29udGV4dCkpKSBhcyBhbnk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2V0dXAgfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01DbGFzcyB9IGZyb20gJy4vY2xhc3MnO1xuXG4vLyBpbml0IGZvciBzdGF0aWNcbnNldHVwKERPTUNsYXNzLnByb3RvdHlwZSwgRE9NQ2xhc3MuY3JlYXRlKTtcblxuZXhwb3J0ICogZnJvbSAnLi9leHBvcnRzJztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgZGVmYXVsdCB9IGZyb20gJy4vZXhwb3J0cyc7XG4iXSwibmFtZXMiOlsic2FmZSIsImRvY3VtZW50IiwiaXNGdW5jdGlvbiIsImNsYXNzTmFtZSIsImlzTnVtYmVyIiwiZG9jIiwiZ2V0R2xvYmFsTmFtZXNwYWNlIiwid2luZG93IiwiJCIsImlzQXJyYXkiLCJpc1N0cmluZyIsInRvVHlwZWREYXRhIiwiY2FtZWxpemUiLCJmcm9tVHlwZWREYXRhIiwic2V0TWl4Q2xhc3NBdHRyaWJ1dGUiLCJub29wIiwiZG9tIiwiZGFzaGVyaXplIiwiY2xhc3NpZnkiLCJDdXN0b21FdmVudCIsIm1peGlucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7R0FFQTs7OztHQUtBO0dBQ0EsTUFBTSxHQUFHLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7R0FDcEM7R0FDQSxNQUFNLEdBQUcsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztHQUN0QztHQUNBLE1BQU0sR0FBRyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0dBQ3pDO0dBQ0EsTUFBTSxFQUFFLHFCQUFxQixFQUFFLEdBQUcsR0FBRzs7R0NkckM7OztHQW1CQTs7Ozs7Ozs7Ozs7O1lBWWdCLFVBQVUsQ0FBeUIsSUFBd0IsRUFBRSxPQUE2QjtPQUN0RyxJQUFJLENBQUMsSUFBSSxFQUFFO1dBQ1AsT0FBTyxFQUFFLENB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Qjs7Ozs7T0FNTSxNQUFNO1dBQ1QsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUU7ZUFDckIsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUU7bUJBQ25CLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBYSxDQUFDLENBQUM7bUJBQ25ELElBQUksT0FBTyxFQUFFO3VCQUNULEtBQUssTUFBTSxTQUFTLElBQUksT0FBTyxFQUFFOzJCQUM3QixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ3RCO3VCQUNELGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBYSxDQUFDLENBQUM7b0JBQ3pDO2dCQUNKO1lBQ0o7V0FDRCxPQUFPLElBQUksQ0FBQztRQUNmOzs7OztPQU1NLE1BQU07V0FDVCxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtlQUNyQixLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRTttQkFDbkIsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFhLENBQUMsQ0FBQzttQkFDbkQsSUFBSSxPQUFPLEVBQUU7dUJBQ1QsS0FBSyxNQUFNLFNBQVMsSUFBSSxPQUFPLEVBQUU7MkJBQzdCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDdEI7O29CQUVKO2dCQUNKO1lBQ0o7V0FDRCxPQUFPLElBQUksQ0FBQztRQUNmO0lBQ0o7QUFFREEsaUNBQW9CLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDOztHQ3pJcEQ7Ozs7R0F5REE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztTQTJCYSxRQUFTLFNBQVFNLGdCQUFNLENBQ2hDLE9BQU8sRUFDUCxhQUFhLEVBQ2IsYUFBYSxFQUNiLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxVQUFVLENBQ2I7Ozs7Ozs7O09BUUcsWUFBb0IsUUFBdUI7V0FDdkMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDOztRQUVuQjs7Ozs7Ozs7Ozs7Ozs7O09BZ0JNLE9BQU8sTUFBTSxDQUF5QixRQUF5QixFQUFFLE9BQTZCO1dBQ2pHLElBQUksUUFBUSxJQUFJLENBQUMsT0FBTyxFQUFFO2VBQ3RCLElBQUksUUFBUSxZQUFZLFFBQVEsRUFBRTttQkFDOUIsT0FBTyxRQUFlLENBQUM7Z0JBQzFCO1lBQ0o7V0FDRCxPQUFPLElBQUksUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUE2QixFQUFFLE9BQU8sQ0FBQyxFQUFTLENBQUM7UUFDcEY7OztHQzVITDtHQUNBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2RvbS8ifQ==
