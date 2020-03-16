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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ1dGlscy50cyIsInN0YXRpYy50cyIsImJhc2UudHMiLCJhdHRyaWJ1dGVzLnRzIiwidHJhdmVyc2luZy50cyIsIm1hbmlwdWxhdGlvbi50cyIsInN0eWxlcy50cyIsImV2ZW50cy50cyIsInNjcm9sbC50cyIsImVmZmVjdHMudHMiLCJjbGFzcy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCglxuICogYHdpbmRvd2Ag44Kq44OW44K444Kn44Kv44OI44GoIGBkb2N1bWVudGAg44Kq44OW44K444Kn44Kv44OI562J44Gu5a2Y5Zyo44KS5L+d6Ki844GZ44KLXG4gKi9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgd2luID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBkb2MgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZXZ0ID0gc2FmZShnbG9iYWxUaGlzLkN1c3RvbUV2ZW50KTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIH0gPSB3aW47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgd2luIGFzIHdpbmRvdyxcbiAgICBkb2MgYXMgZG9jdW1lbnQsXG4gICAgZXZ0IGFzIEN1c3RvbUV2ZW50LFxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSxcbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgTmlsLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NOYW1lLFxuICAgIGdldEdsb2JhbE5hbWVzcGFjZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG5leHBvcnQgdHlwZSBFbGVtZW50QmFzZSA9IE5vZGUgfCBXaW5kb3c7XG5leHBvcnQgdHlwZSBFbGVtZW50UmVzdWx0PFQ+ID0gVCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IEhUTUxFbGVtZW50O1xuZXhwb3J0IHR5cGUgU2VsZWN0b3JCYXNlID0gTm9kZSB8IFdpbmRvdyB8IHN0cmluZyB8IE5pbDtcbmV4cG9ydCB0eXBlIEVsZW1lbnRpZnlTZWVkPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBIVE1MRWxlbWVudD4gPSBUIHwgKFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA/IFRbXSA6IG5ldmVyKSB8IE5vZGVMaXN0T2Y8VCBleHRlbmRzIE5vZGUgPyBUIDogbmV2ZXI+O1xuZXhwb3J0IHR5cGUgUXVlcnlDb250ZXh0ID0gUGFyZW50Tm9kZSAmIFBhcnRpYWw8Tm9uRWxlbWVudFBhcmVudE5vZGU+O1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgRWxlbWVudCBhcnJheSBmcm9tIHNlZWQgYXJnLlxuICogQGphIOaMh+WumuOBleOCjOOBnyBTZWVkIOOBi+OCiSBFbGVtZW50IOmFjeWIl+OCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIEVsZW1lbnQgYXJyYXkuXG4gKiAgLSBgamFgIEVsZW1lbnQg6YWN5YiX44Gu44KC44Go44Gr44Gq44KL44Kq44OW44K444Kn44Kv44OIKOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIFNldCB1c2luZyBgRG9jdW1lbnRgIGNvbnRleHQuIFdoZW4gYmVpbmcgdW4tZGVzaWduYXRpbmcsIGEgZml4ZWQgdmFsdWUgb2YgdGhlIGVudmlyb25tZW50IGlzIHVzZWQuXG4gKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICogQHJldHVybnMgRWxlbWVudFtdIGJhc2VkIE5vZGUgb3IgV2luZG93IG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsZW1lbnRpZnk8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VlZD86IEVsZW1lbnRpZnlTZWVkPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IEVsZW1lbnRSZXN1bHQ8VD5bXSB7XG4gICAgaWYgKCFzZWVkKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb250ZXh0ID0gY29udGV4dCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCBlbGVtZW50czogRWxlbWVudFtdID0gW107XG5cbiAgICB0cnkge1xuICAgICAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBodG1sID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICBpZiAoaHRtbC5pbmNsdWRlcygnPCcpICYmIGh0bWwuaW5jbHVkZXMoJz4nKSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcmt1cFxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gc2VlZC50cmltKCk7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQuZ2V0RWxlbWVudEJ5SWQpICYmICgnIycgPT09IHNlbGVjdG9yWzBdKSAmJiAhL1sgLjw+On5dLy5leGVjKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXJlIElEIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChzZWxlY3Rvci5zdWJzdHJpbmcoMSkpO1xuICAgICAgICAgICAgICAgICAgICBlbCAmJiBlbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdib2R5JyA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYm9keVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIHNlbGVjdG9yc1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLmNvbnRleHQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICgoc2VlZCBhcyBOb2RlKS5ub2RlVHlwZSB8fCB3aW5kb3cgPT09IHNlZWQgYXMgV2luZG93KSB7XG4gICAgICAgICAgICAvLyBOb2RlL2VsZW1lbnQsIFdpbmRvd1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChzZWVkIGFzIE5vZGUgYXMgRWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoMCA8IChzZWVkIGFzIFRbXSkubGVuZ3RoICYmIChzZWVkWzBdLm5vZGVUeXBlIHx8IHdpbmRvdyA9PT0gc2VlZFswXSkpIHtcbiAgICAgICAgICAgIC8vIGFycmF5IG9mIGVsZW1lbnRzIG9yIGNvbGxlY3Rpb24gb2YgRE9NXG4gICAgICAgICAgICBlbGVtZW50cy5wdXNoKC4uLihzZWVkIGFzIE5vZGVbXSBhcyBFbGVtZW50W10pKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBlbGVtZW50aWZ5KCR7Y2xhc3NOYW1lKHNlZWQpfSwgJHtjbGFzc05hbWUoY29udGV4dCl9KSwgZmFpbGVkLiBbZXJyb3I6JHtlfV1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudHMgYXMgRWxlbWVudFJlc3VsdDxUPltdO1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgcG9zaXRpdmUgbnVtYmVyLCBpZiBub3QgcmV0dXJuZWQgYHVuZGVmaW5lZGAuXG4gKiBAZW4g5q2j5YCk44Gu5L+d6Ki8LiDnlbDjgarjgovloLTlkIggYHVuZGVmaW5lZGAg44KS6L+U5Y20XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVQb3NpdGl2ZU51bWJlcih2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEBlbiBGb3IgZWFzaW5nIGBzd2luZ2AgdGltaW5nLWZ1bmN0aW9uLlxuICogQGphIGVhc2luZyBgc3dpbmdgIOeUqOOCv+OCpOODn+ODs+OCsOmWouaVsFxuICpcbiAqIEByZWZlcmVuY2VcbiAqICAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkyNDUwMzAvbG9va2luZy1mb3ItYS1zd2luZy1saWtlLWVhc2luZy1leHByZXNzaWJsZS1ib3RoLXdpdGgtanF1ZXJ5LWFuZC1jc3MzXG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81MjA3MzAxL2pxdWVyeS1lYXNpbmctZnVuY3Rpb25zLXdpdGhvdXQtdXNpbmctYS1wbHVnaW5cbiAqXG4gKiBAcGFyYW0gcHJvZ3Jlc3MgWzAgLSAxXVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpbmcocHJvZ3Jlc3M6IG51bWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIDAuNSAtIChNYXRoLmNvcyhwcm9ncmVzcyAqIE1hdGguUEkpIC8gMik7XG59XG5cbi8qKlxuICogQGVuIFtbZXZhbHVhdGVdXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tldmFsdWF0ZV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZhbE9wdGlvbnMge1xuICAgIHR5cGU/OiBzdHJpbmc7XG4gICAgc3JjPzogc3RyaW5nO1xuICAgIG5vbmNlPzogc3RyaW5nO1xuICAgIG5vTW9kdWxlPzogc3RyaW5nO1xufVxuXG5jb25zdCBfc2NyaXB0c0F0dHJzOiAoa2V5b2YgRXZhbE9wdGlvbnMpW10gPSBbXG4gICAgJ3R5cGUnLFxuICAgICdzcmMnLFxuICAgICdub25jZScsXG4gICAgJ25vTW9kdWxlJyxcbl07XG5cbi8qKlxuICogQGVuIFRoZSBgZXZhbGAgZnVuY3Rpb24gYnkgd2hpY2ggc2NyaXB0IGBub25jZWAgYXR0cmlidXRlIGNvbnNpZGVyZWQgdW5kZXIgdGhlIENTUCBjb25kaXRpb24uXG4gKiBAamEgQ1NQIOeSsOWig+OBq+OBiuOBhOOBpuOCueOCr+ODquODl+ODiCBgbm9uY2VgIOWxnuaAp+OCkuiAg+aFruOBl+OBnyBgZXZhbGAg5a6f6KGM6Zai5pWwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZShjb2RlOiBzdHJpbmcsIG9wdGlvbnM/OiBFbGVtZW50IHwgRXZhbE9wdGlvbnMsIGNvbnRleHQ/OiBEb2N1bWVudCB8IG51bGwpOiBhbnkge1xuICAgIGNvbnN0IGRvYzogRG9jdW1lbnQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuICAgIGNvbnN0IHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICBzY3JpcHQudGV4dCA9IGBDRFBfRE9NX0VWQUxfUkVUVVJOX1ZBTFVFX0JSSURHRSA9ICgoKSA9PiB7IHJldHVybiAke2NvZGV9OyB9KSgpO2A7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgX3NjcmlwdHNBdHRycykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gb3B0aW9uc1thdHRyXSB8fCAoKG9wdGlvbnMgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlICYmIChvcHRpb25zIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyKSk7XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnNldEF0dHJpYnV0ZShhdHRyLCB2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIHRyeSB7XG4gICAgICAgIGdldEdsb2JhbE5hbWVzcGFjZSgnQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnKTtcbiAgICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KS5wYXJlbnROb2RlIS5yZW1vdmVDaGlsZChzY3JpcHQpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgY29uc3QgcmV0dmFsID0gZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkZWxldGUgZ2xvYmFsVGhpc1snQ0RQX0RPTV9FVkFMX1JFVFVSTl9WQUxVRV9CUklER0UnXTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBFdmFsT3B0aW9ucyxcbiAgICBlbGVtZW50aWZ5LFxuICAgIGV2YWx1YXRlLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIERPTVBsdWdpbixcbiAgICBET01DbGFzcyxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxufSBmcm9tICcuL2NsYXNzJztcblxuZGVjbGFyZSBuYW1lc3BhY2UgZG9tIHtcbiAgICBsZXQgZm46IERPTUNsYXNzO1xufVxuXG50eXBlIERPTUZhY3RvcnkgPSA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxUPiwgY29udGV4dD86IFF1ZXJ5Q29udGV4dCB8IG51bGwpID0+IERPTVJlc3VsdDxUPjtcblxubGV0IF9mYWN0b3J5ITogRE9NRmFjdG9yeTtcblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbRE9NXV0gaW5zdGFuY2UgZnJvbSBgc2VsZWN0b3JgIGFyZy5cbiAqIEBqYSDmjIflrprjgZXjgozjgZ8gYHNlbGVjdG9yYCBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkFxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCquODluOCuOOCp+OCr+ODiCjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICogIC0gYGphYCDkvb/nlKjjgZnjgosgYERvY3VtZW50YCDjgrPjg7Pjg4bjgq3jgrnjg4jjgpLmjIflrpouIOacquaMh+WumuOBruWgtOWQiOOBr+eSsOWig+OBruaXouWumuWApOOBjOS9v+eUqOOBleOCjOOCiy5cbiAqIEByZXR1cm5zIFtbRE9NXV0gaW5zdGFuY2UuXG4gKi9cbmZ1bmN0aW9uIGRvbTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiB7XG4gICAgcmV0dXJuIF9mYWN0b3J5KHNlbGVjdG9yLCBjb250ZXh0KTtcbn1cblxuZG9tLnV0aWxzID0ge1xuICAgIGVsZW1lbnRpZnksXG4gICAgZXZhbHVhdGUsXG59O1xuXG4vKiogQGludGVybmFsIOW+queSsOWPgueFp+WbnumBv+OBruOBn+OCgeOBrumBheW7tuOCs+ODs+OCueODiOODqeOCr+OCt+ODp+ODs+ODoeOCveODg+ODiSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKGZuOiBET01DbGFzcywgZmFjdG9yeTogRE9NRmFjdG9yeSk6IHZvaWQge1xuICAgIF9mYWN0b3J5ID0gZmFjdG9yeTtcbiAgICBkb20uZm4gPSBmbjtcbn1cblxuZXhwb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIEV2YWxPcHRpb25zLFxuICAgIERPTSxcbiAgICBET01QbHVnaW4sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTUl0ZXJhdGVDYWxsYmFjayxcbiAgICBkb20sXG59O1xuIiwiaW1wb3J0IHsgTmlsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdywgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIEVsZW1lbnRCYXNlLFxuICAgIFNlbGVjdG9yQmFzZSxcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJy4vc3RhdGljJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3InKTtcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdGlvbiBjbGFzcyBvZiBbW0RPTUNsYXNzXV0uIFRoaXMgY2xhc3MgcHJvdmlkZXMgaXRlcmF0b3IgbWV0aG9kcy5cbiAqIEBqYSBbW0RPTUNsYXNzXV0g44Gu5Z+65bqV5oq96LGh44Kv44Op44K5LiBpdGVyYXRvciDjgpLmj5DkvpsuXG4gKi9cbmV4cG9ydCBjbGFzcyBET01CYXNlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBBcnJheUxpa2U8VD4sIEl0ZXJhYmxlPFQ+IHtcbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIGBFbGVtZW50YFxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgYEVsZW1lbnRgIOaVsFxuICAgICAqL1xuICAgIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIGBFbGVtZW50YCBhY2Nlc3NvclxuICAgICAqIEBqYSBgRWxlbWVudGAg44G444Gu5re744GI5a2X44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcmVhZG9ubHkgW246IG51bWJlcl06IFQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSBlbGVtZW50c1xuICAgICAqICAtIGBlbmAgb3BlcmF0aW9uIHRhcmdldHMgYEVsZW1lbnRgIGFycmF5LlxuICAgICAqICAtIGBqYWAg5pON5L2c5a++6LGh44GuIGBFbGVtZW50YCDphY3liJdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50czogVFtdKSB7XG4gICAgICAgIGNvbnN0IHNlbGY6IERPTUFjY2VzczxUPiA9IHRoaXM7XG4gICAgICAgIGZvciAoY29uc3QgW2luZGV4LCBlbGVtXSBvZiBlbGVtZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHNlbGZbaW5kZXhdID0gZWxlbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxlbmd0aCA9IGVsZW1lbnRzLmxlbmd0aDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFQ+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaW5kZXgpLCB2YWx1ZShbW0VsZW1lbnRCYXNlXV0pIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpbmRleCksIHZhbHVlKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaW5kZXgpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGluZGV4KSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBudW1iZXIsIHZhbHVlOiBUKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IoY3VycmVudCwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEJhc2UgaW50ZXJmYWNlIGZvciBET00gTWl4aW4gY2xhc3MuXG4gKiBAamEgRE9NIE1peGluIOOCr+ODqeOCueOBruaXouWumuOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUl0ZXJhYmxlPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IEhUTUxFbGVtZW50PiBleHRlbmRzIFBhcnRpYWw8RE9NQmFzZTxUPj4ge1xuICAgIGxlbmd0aDogbnVtYmVyO1xuICAgIFtuOiBudW1iZXJdOiBUO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxUPjtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWwgRE9NIGFjY2Vzc1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogICBjb25zdCBkb206IERPTUFjY2VzczxURWxlbWVudD4gPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PjtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUFjY2VzczxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBQYXJ0aWFsPERPTTxUPj4geyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWVtcHR5LWludGVyZmFjZVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBOb2RlYC5cbiAqIEBqYSDlr77osaHjgYwgYE5vZGVgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlKGVsOiB1bmtub3duKTogZWwgaXMgTm9kZSB7XG4gICAgcmV0dXJuICEhKGVsICYmIChlbCBhcyBOb2RlKS5ub2RlVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgRWxlbWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBFbGVtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZUVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogZWwgaXMgRWxlbWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRUxFTUVOVF9OT0RFID09PSBlbC5ub2RlVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSDlr77osaHjgYwgYEhUTUxFbGVtZW50YCDjgb7jgZ/jga8gYFNWR0VsZW1lbnRgIOOBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCBbW0VsZW1lbnRCYXNlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tFbGVtZW50QmFzZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAobnVsbCAhPSAoZWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQpO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0YXJnZXQgaXMgYEVsZW1lbnRgIG9yIGBEb2N1bWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBFbGVtZW50YCDjgb7jgZ/jga8gYERvY3VtZW50YCDjgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgW1tFbGVtZW50QmFzZV1dIGluc3RhbmNlXG4gKiAgLSBgamFgIFtbRWxlbWVudEJhc2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVF1ZXJpYWJsZShlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBFbGVtZW50IHwgRG9jdW1lbnQge1xuICAgIHJldHVybiAhIShlbCAmJiAoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5xdWVyeVNlbGVjdG9yKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2Rcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGFyZ2V0IGlzIGBEb2N1bWVudGAuXG4gKiBAamEg5a++6LGh44GMIGBEb2N1bWVudGAg44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIFtbRWxlbWVudEJhc2VdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0VsZW1lbnRCYXNlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGVEb2N1bWVudChlbDogRWxlbWVudEJhc2UgfCBOaWwpOiBlbCBpcyBEb2N1bWVudCB7XG4gICAgcmV0dXJuIGlzTm9kZShlbCkgJiYgKE5vZGUuRE9DVU1FTlRfTk9ERSA9PT0gZWwubm9kZVR5cGUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYEVsZW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBFbGVtZW50YCDjgpLlr77osaHjgavjgZfjgabjgYTjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gZG9tXG4gKiAgLSBgZW5gIFtbRE9NSXRlcmFibGVdXSBpbnN0YW5jZVxuICogIC0gYGphYCBbW0RPTUl0ZXJhYmxlXV0g44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1R5cGVFbGVtZW50KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPEVsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgSFRNTEVsZW1lbnRgIG9yIGBTVkdFbGVtZW50YC5cbiAqIEBqYSBbW0RPTV1dIOOBjCBgSFRNTEVsZW1lbnRgIOOBvuOBn+OBryBgU1ZHRWxlbWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlSFRNTE9yU1ZHRWxlbWVudChkb206IERPTUl0ZXJhYmxlPEVsZW1lbnRCYXNlPik6IGRvbSBpcyBET01JdGVyYWJsZTxIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQ+IHtcbiAgICByZXR1cm4gaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChkb21bMF0pO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayBbW0RPTV1dIHRhcmdldCBpcyBgRG9jdW1lbnRgLlxuICogQGphIFtbRE9NXV0g44GMIGBEb2N1bWVudGAg44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlRG9jdW1lbnQoZG9tOiBET01JdGVyYWJsZTxFbGVtZW50QmFzZT4pOiBkb20gaXMgRE9NSXRlcmFibGU8RG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IGRvbVswXTtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgW1tET01dXSB0YXJnZXQgaXMgYFdpbmRvd2AuXG4gKiBAamEgW1tET01dXSDjgYwgYFdpbmRvd2Ag44KS5a++6LGh44Gr44GX44Gm44GE44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIGRvbVxuICogIC0gYGVuYCBbW0RPTUl0ZXJhYmxlXV0gaW5zdGFuY2VcbiAqICAtIGBqYWAgW1tET01JdGVyYWJsZV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUeXBlV2luZG93KGRvbTogRE9NSXRlcmFibGU8RWxlbWVudEJhc2U+KTogZG9tIGlzIERPTUl0ZXJhYmxlPFdpbmRvdz4ge1xuICAgIHJldHVybiB3aW5kb3cgPT09IGRvbVswXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIE5pbC5cbiAqIEBqYSBOaWwg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHlTZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBzZWxlY3RvciBpcyBFeHRyYWN0PERPTVNlbGVjdG9yPFQ+LCBOaWw+IHtcbiAgICByZXR1cm4gIXNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBTdHJpbmcuXG4gKiBAamEgU3RyaW5nIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ1NlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIHN0cmluZz4ge1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgdHlwZSBpcyBOb2RlLlxuICogQGphIE5vZGUg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIE5vZGU+IHtcbiAgICByZXR1cm4gbnVsbCAhPSAoc2VsZWN0b3IgYXMgTm9kZSkubm9kZVR5cGU7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIEVsZW1lbnQuXG4gKiBAamEgRWxlbWVudCDjgrvjg6zjgq/jgr/jgafjgYLjgovjgYvliKTlrppcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgZXZhbHVhdGVkIHZhbHVlXG4gKiAgLSBgamFgIOipleS+oeOBmeOCi+WApFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFbGVtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRWxlbWVudD4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIEVsZW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIERvY3VtZW50LlxuICogQGphIERvY3VtZW50IOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RvY3VtZW50U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgRG9jdW1lbnQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnQgPT09IHNlbGVjdG9yIGFzIE5vZGUgYXMgRG9jdW1lbnQ7XG59XG5cbi8qKlxuICogQGVuIENoZWNrIHRoZSBzZWxlY3RvciB0eXBlIGlzIFdpbmRvdy5cbiAqIEBqYSBXaW5kb3cg44K744Os44Kv44K/44Gn44GC44KL44GL5Yik5a6aXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIGV2YWx1YXRlZCB2YWx1ZVxuICogIC0gYGphYCDoqZXkvqHjgZnjgovlgKRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2luZG93U2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgV2luZG93PiB7XG4gICAgcmV0dXJuIHdpbmRvdyA9PT0gc2VsZWN0b3IgYXMgV2luZG93O1xufVxuXG4vKipcbiAqIEBlbiBDaGVjayB0aGUgc2VsZWN0b3IgaXMgYWJsZSB0byBpdGVyYXRlLlxuICogQGphIOi1sOafu+WPr+iDveOBquOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0l0ZXJhYmxlU2VsZWN0b3I8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogc2VsZWN0b3IgaXMgRXh0cmFjdDxET01TZWxlY3RvcjxUPiwgTm9kZUxpc3RPZjxOb2RlPj4ge1xuICAgIHJldHVybiBudWxsICE9IChzZWxlY3RvciBhcyBUW10pLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBAZW4gQ2hlY2sgdGhlIHNlbGVjdG9yIHR5cGUgaXMgW1tET01dXS5cbiAqIEBqYSBbW0RPTV1dIOOCu+ODrOOCr+OCv+OBp+OBguOCi+OBi+WIpOWumlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBldmFsdWF0ZWQgdmFsdWVcbiAqICAtIGBqYWAg6KmV5L6h44GZ44KL5YCkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RPTVNlbGVjdG9yPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IHNlbGVjdG9yIGlzIEV4dHJhY3Q8RE9NU2VsZWN0b3I8VD4sIERPTT4ge1xuICAgIHJldHVybiBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2U7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDaGVjayBub2RlIG5hbWUgaXMgYXJndW1lbnQuXG4gKiBAamEgTm9kZSDlkI3jgYzlvJXmlbDjgafkuI7jgYjjgZ/lkI3liY3jgajkuIDoh7TjgZnjgovjgYvliKTlrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vZGVOYW1lKGVsZW06IE5vZGUgfCBudWxsLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISEoZWxlbSAmJiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUudG9Mb3dlckNhc2UoKSk7XG59XG5cbi8qKlxuICogQGVuIEdldCBub2RlIG9mZnNldCBwYXJlbnQuIFRoaXMgZnVuY3Rpb24gd2lsbCB3b3JrIFNWR0VsZW1lbnQsIHRvby5cbiAqIEBqYSBvZmZzZXQgcGFyZW50IOOBruWPluW+ly4gU1ZHRWxlbWVudCDjgavjgoLpgannlKjlj6/og71cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE9mZnNldFBhcmVudChub2RlOiBOb2RlKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmICgobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50KSB7XG4gICAgICAgIHJldHVybiAobm9kZSBhcyBIVE1MRWxlbWVudCkub2Zmc2V0UGFyZW50O1xuICAgIH0gZWxzZSBpZiAobm9kZU5hbWUobm9kZSwgJ3N2ZycpKSB7XG4gICAgICAgIGNvbnN0ICRzdmcgPSAkKG5vZGUpO1xuICAgICAgICBjb25zdCBjc3NQcm9wcyA9ICRzdmcuY3NzKFsnZGlzcGxheScsICdwb3NpdGlvbiddKTtcbiAgICAgICAgaWYgKCdub25lJyA9PT0gY3NzUHJvcHMuZGlzcGxheSB8fCAnZml4ZWQnID09PSBjc3NQcm9wcy5wb3NpdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGFyZW50ID0gJHN2Z1swXS5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGlzcGxheSwgcG9zaXRpb24gfSA9ICQocGFyZW50KS5jc3MoWydkaXNwbGF5JywgJ3Bvc2l0aW9uJ10pO1xuICAgICAgICAgICAgICAgIGlmICgnbm9uZScgPT09IGRpc3BsYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghcG9zaXRpb24gfHwgJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgTm9uRnVuY3Rpb25Qcm9wZXJ0eU5hbWVzLFxuICAgIFR5cGVkRGF0YSxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgY2FtZWxpemUsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFbGVtZW50QmFzZSB9IGZyb20gJy4vc3RhdGljJztcbmltcG9ydCB7XG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IHR5cGUgRE9NVmFsdWVUeXBlPFQsIEsgPSAndmFsdWUnPiA9IFQgZXh0ZW5kcyBIVE1MU2VsZWN0RWxlbWVudCA/IChzdHJpbmcgfCBzdHJpbmdbXSkgOiBLIGV4dGVuZHMga2V5b2YgVCA/IFRbS10gOiB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBET01EYXRhID0gUGxhaW5PYmplY3Q8VHlwZWREYXRhPjtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB2YWwoKWAqL1xuZnVuY3Rpb24gaXNNdWx0aVNlbGVjdEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlKTogZWwgaXMgSFRNTFNlbGVjdEVsZW1lbnQge1xuICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSAmJiAnc2VsZWN0JyA9PT0gZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAmJiAoZWwgYXMgSFRNTFNlbGVjdEVsZW1lbnQpLm11bHRpcGxlO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHZhbCgpYCovXG5mdW5jdGlvbiBpc0lucHV0RWxlbWVudChlbDogRWxlbWVudEJhc2UpOiBlbCBpcyBIVE1MSW5wdXRFbGVtZW50IHtcbiAgICByZXR1cm4gaXNOb2RlRWxlbWVudChlbCkgJiYgKG51bGwgIT0gKGVsIGFzIEhUTUxJbnB1dEVsZW1lbnQpLnZhbHVlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1peGluIGJhc2UgY2xhc3Mgd2hpY2ggY29uY2VudHJhdGVkIHRoZSBhdHRyaWJ1dGVzIG1ldGhvZHMuXG4gKiBAamEg5bGe5oCn5pON5L2c44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01BdHRyaWJ1dGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ2xhc3Nlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBjc3MgY2xhc3MgdG8gZWxlbWVudHMuXG4gICAgICogQGphIGNzcyBjbGFzcyDopoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjbGFzc05hbWVcbiAgICAgKiAgLSBgZW5gIGNsYXNzIG5hbWUgb3IgY2xhc3MgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDjgq/jg6njgrnlkI3jgb7jgZ/jga/jgq/jg6njgrnlkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBpc0FycmF5KGNsYXNzTmFtZSkgPyBjbGFzc05hbWUgOiBbY2xhc3NOYW1lXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgY3NzIGNsYXNzIHRvIGVsZW1lbnRzLlxuICAgICAqIEBqYSBjc3MgY2xhc3Mg6KaB57Sg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZUNsYXNzKGNsYXNzTmFtZTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGV0ZXJtaW5lIHdoZXRoZXIgYW55IG9mIHRoZSBtYXRjaGVkIGVsZW1lbnRzIGFyZSBhc3NpZ25lZCB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCr+ODqeOCueWQjeOCkuWwkeOBquOBj+OBqOOCguimgee0oOOBjOaMgeOBo+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGNsYXNzTmFtZVxuICAgICAqICAtIGBlbmAgY2xhc3MgbmFtZVxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCNXG4gICAgICovXG4gICAgcHVibGljIGhhc0NsYXNzKGNsYXNzTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpICYmIGVsLmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgb3IgcmVtb3ZlIG9uZSBvciBtb3JlIGNsYXNzZXMgZnJvbSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIGRlcGVuZGluZyBvbiBlaXRoZXIgdGhlIGNsYXNzJ3MgcHJlc2VuY2Ugb3IgdGhlIHZhbHVlIG9mIHRoZSBzdGF0ZSBhcmd1bWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu54q25oWL44Gr5b+c44GY44GmLCDmjIflrprjgZXjgozjgZ/jgq/jg6njgrnlkI3jgpLopoHntKDjgavov73liqAv5YmK6Zmk44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2xhc3NOYW1lXG4gICAgICogIC0gYGVuYCBjbGFzcyBuYW1lIG9yIGNsYXNzIG5hbWUgbGlzdCAoYXJyYXkpLlxuICAgICAqICAtIGBqYWAg44Kv44Op44K55ZCN44G+44Gf44Gv44Kv44Op44K55ZCN44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGZvcmNlXG4gICAgICogIC0gYGVuYCBpZiB0aGlzIGFyZ3VtZW50IGV4aXN0cywgdHJ1ZTogdGhlIGNsYXNzZXMgc2hvdWxkIGJlIGFkZGVkIC8gZmFsc2U6IHJlbW92ZWQuXG4gICAgICogIC0gYGphYCDlvJXmlbDjgYzlrZjlnKjjgZnjgovloLTlkIgsIHRydWU6IOOCr+ODqeOCueOCkui/veWKoCAvIGZhbHNlOiDjgq/jg6njgrnjgpLliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9nZ2xlQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZm9yY2U/OiBib29sZWFuKTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjbGFzc2VzID0gaXNBcnJheShjbGFzc05hbWUpID8gY2xhc3NOYW1lIDogW2NsYXNzTmFtZV07XG4gICAgICAgIGNvbnN0IG9wZXJhdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBmb3JjZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoZWxlbTogRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY2xhc3Nlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QudG9nZ2xlKG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9yY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGVsZW06IEVsZW1lbnQpID0+IGVsZW0uY2xhc3NMaXN0LmFkZCguLi5jbGFzc2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbGVtOiBFbGVtZW50KSA9PiBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoLi4uY2xhc3Nlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBQcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHByb3BlcnR5IHZhbHVlLiA8YnI+XG4gICAgICogICAgIFRoZSBtZXRob2QgZ2V0cyB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDjg5fjg63jg5Hjg4bjgqPlgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZVxuICAgICAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQpOiBURWxlbWVudFtUXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIHByb3BlcnR5IHZhbHVlIGZvciB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuWNmOS4gOODl+ODreODkeODhuOCo+OBruioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lXG4gICAgICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSB2YWx1ZVxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL44OX44Ot44OR44OG44Kj5YCkXG4gICAgICovXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KG5hbWU6IFQsIHZhbHVlOiBURWxlbWVudFtUXSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IG11bHRpIHByb3BlcnR5IHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDjg5fjg63jg5Hjg4bjgqPjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9wZXJ0aWVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgcHJvcGVydHktdmFsdWUgcGFpcnMgdG8gc2V0LlxuICAgICAqICAtIGBqYWAgcHJvcGVydHktdmFsdWUg44Oa44Ki44KS5oyB44Gk44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHByb3AocHJvcGVydGllczogUGxhaW5PYmplY3QpOiB0aGlzO1xuXG4gICAgcHVibGljIHByb3A8VCBleHRlbmRzIE5vbkZ1bmN0aW9uUHJvcGVydHlOYW1lczxURWxlbWVudD4+KGtleTogVCB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IFRFbGVtZW50W1RdKTogVEVsZW1lbnRbVF0gfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgcHJvcGVydHlcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBmaXJzdCAmJiBmaXJzdFtrZXkgYXMgc3RyaW5nXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlXG4gICAgICAgICAgICAgICAgICAgIGVsW2tleSBhcyBzdHJpbmddID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxbbmFtZV0gPSBrZXlbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhdHRyaWJ1dGUgdmFsdWUuIDxicj5cbiAgICAgKiAgICAgVGhlIG1ldGhvZCBnZXRzIHRoZSBhdHRyaWJ1dGUgdmFsdWUgZm9yIG9ubHkgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqIEBqYSDlsZ7mgKflgKTjga7lj5blvpcgPGJyPlxuICAgICAqICAgICDmnIDliJ3jga7opoHntKDjgYzlj5blvpflr77osaFcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgc2luZ2xlIGF0dHJpYnV0ZSB2YWx1ZSBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabljZjkuIDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXR0cmlidXRlIG5hbWVcbiAgICAgKiAgLSBgamFgIOWxnuaAp+WQjeOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGF0dHJpYnV0ZSB2YWx1ZS4gaWYgYG51bGxgIHNldCwgcmVtb3ZlIGF0dHJpYnV0ZS5cbiAgICAgKiAgLSBgamFgIOioreWumuOBmeOCi+WxnuaAp+WApC4gYG51bGxgIOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiOWJiumZpFxuICAgICAqL1xuICAgIHB1YmxpYyBhdHRyKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgbXVsdGkgYXR0cmlidXRlIHZhbHVlcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabopIfmlbDlsZ7mgKfjga7oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyaWJ1dGVzXG4gICAgICogIC0gYGVuYCBBbiBvYmplY3Qgb2YgYXR0cmlidXRlLXZhbHVlIHBhaXJzIHRvIHNldC5cbiAgICAgKiAgLSBgamFgIGF0dHJpYnV0ZS12YWx1ZSDjg5rjgqLjgpLmjIHjgaTjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgYXR0cihwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdCk6IHRoaXM7XG5cbiAgICBwdWJsaWMgYXR0cihrZXk6IHN0cmluZyB8IFBsYWluT2JqZWN0LCB2YWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsKTogc3RyaW5nIHwgdW5kZWZpbmVkIHwgdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQgPT09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmICh1bmRlZmluZWQgPT09IHZhbHVlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICAgICAgICAgIC8vIGdldCBmaXJzdCBlbGVtZW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXNbMF0uZ2V0QXR0cmlidXRlKGtleSk7XG4gICAgICAgICAgICByZXR1cm4gKG51bGwgIT0gYXR0cikgPyBhdHRyIDogdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgYXR0cmlidXRlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVBdHRyKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IGF0dHJpYnV0ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXkgYXMgc3RyaW5nLCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IGtleVtuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgU3RyaW5nKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBzcGVjaWZpZWQgYXR0cmlidXRlLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/lsZ7mgKfjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGUgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBsaXN0IChhcnJheSkuXG4gICAgICogIC0gYGphYCDlsZ7mgKflkI3jgb7jgZ/jga/lsZ7mgKflkI3jga7phY3liJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlQXR0cihuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGF0dHJzID0gaXNBcnJheShuYW1lKSA/IG5hbWUgOiBbbmFtZV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBWYWx1ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSB2YWx1ZSDlgKTjga7lj5blvpcuIOacgOWIneOBruimgee0oOOBjOWPluW+l+WvvuixoVxuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4oKTogRE9NVmFsdWVUeXBlPFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgdmFsdWUgb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgaYgdmFsdWUg5YCk44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIGBzdHJpbmdgIG9yIGBudW1iZXJgIG9yIGBzdHJpbmdbXWAgKGA8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj5gKS5cbiAgICAgKiAgLSBgamFgIGBzdHJpbmdgIOOBvuOBn+OBryBgbnVtYmVyYCDjgb7jgZ/jga8gYHN0cmluZ1tdYCAoYDxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPmApXG4gICAgICovXG4gICAgcHVibGljIHZhbDxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBURWxlbWVudD4odmFsdWU6IERPTVZhbHVlVHlwZTxUPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgdmFsPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSA9IFRFbGVtZW50Pih2YWx1ZT86IERPTVZhbHVlVHlwZTxUPik6IGFueSB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgLy8gbm9uIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiBudWxsID09IHZhbHVlID8gdW5kZWZpbmVkIDogdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXQgZmlyc3QgZWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgaWYgKGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3B0aW9uIG9mIGVsLnNlbGVjdGVkT3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZXMucHVzaChvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgndmFsdWUnIGluIGVsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChlbCBhcyBhbnkpLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBubyBzdXBwb3J0IHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIGlzTXVsdGlTZWxlY3RFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBlbC5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb24uc2VsZWN0ZWQgPSAodmFsdWUgYXMgc3RyaW5nW10pLmluY2x1ZGVzKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzSW5wdXRFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBEYXRhXG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSB2YWx1ZXMgYWxsIGBET01TdHJpbmdNYXBgIHN0b3JlIHNldCBieSBhbiBIVE1MNSBkYXRhLSogYXR0cmlidXRlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIEhUTUw1IGRhdGEtKiDlsZ7mgKfjgacgYERPTVN0cmluZ01hcGAg44Gr5qC857SN44GV44KM44Gf5YWo44OH44O844K/5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGRhdGEoKTogRE9NRGF0YSB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gdGhlIHZhbHVlIGF0IHRoZSBuYW1lZCBkYXRhIHN0b3JlIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgY29sbGVjdGlvbiwgYXMgc2V0IGJ5IGRhdGEoa2V5LCB2YWx1ZSkgb3IgYnkgYW4gSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZS5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44GuIGtleSDjgafmjIflrprjgZfjgZ8gSFRNTDUgZGF0YS0qIOWxnuaAp+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgc3RyaW5nIGVxdWl2YWxlbnQgdG8gZGF0YS1ga2V5YCBpcyBnaXZlbi5cbiAgICAgKiAgLSBgamFgIGRhdGEtYGtleWAg44Gr55u45b2T44GZ44KL5paH5a2X5YiX44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRhdGEoa2V5OiBzdHJpbmcpOiBUeXBlZERhdGEgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvcmUgYXJiaXRyYXJ5IGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabku7vmhI/jga7jg4fjg7zjgr/jgpLmoLzntI1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgZGF0YSB2YWx1ZSAobm90IG9ubHkgYHN0cmluZ2ApXG4gICAgICogIC0gYGphYCDoqK3lrprjgZnjgovlgKTjgpLmjIflrpogKOaWh+Wtl+WIl+S7peWkluOCguWPl+S7mOWPrylcbiAgICAgKi9cbiAgICBwdWJsaWMgZGF0YShrZXk6IHN0cmluZywgdmFsdWU6IFR5cGVkRGF0YSk6IHRoaXM7XG5cbiAgICBwdWJsaWMgZGF0YShrZXk/OiBzdHJpbmcsIHZhbHVlPzogVHlwZWREYXRhKTogRE9NRGF0YSB8IFR5cGVkRGF0YSB8IHVuZGVmaW5lZCB8IHRoaXMge1xuICAgICAgICBpZiAoIWlzVHlwZUhUTUxPclNWR0VsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIC8vIG5vbiBzdXBwb3J0ZWQgZGF0YXNldCBlbGVtZW50XG4gICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/IHVuZGVmaW5lZCA6IHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodW5kZWZpbmVkID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZpcnN0IGVsZW1lbnQgZGF0YXNldFxuICAgICAgICAgICAgY29uc3QgZGF0YXNldCA9IHRoaXNbMF0uZGF0YXNldDtcbiAgICAgICAgICAgIGlmIChudWxsID09IGtleSkge1xuICAgICAgICAgICAgICAgIC8vIGdldCBhbGwgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGE6IERPTURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMoZGF0YXNldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtwcm9wXSA9IHRvVHlwZWREYXRhKGRhdGFzZXRbcHJvcF0pIGFzIFR5cGVkRGF0YTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHR5cGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvVHlwZWREYXRhKGRhdGFzZXRbY2FtZWxpemUoa2V5KV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlXG4gICAgICAgICAgICBjb25zdCBwcm9wID0gY2FtZWxpemUoa2V5IHx8ICcnKTtcbiAgICAgICAgICAgIGlmIChwcm9wKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuZGF0YXNldFtwcm9wXSA9IGZyb21UeXBlZERhdGEodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHNwZWNpZmllZCBkYXRhLlxuICAgICAqIEBqYSDmjIflrprjgZfjgZ/jg4fjg7zjgr/jgpLjg4fjg7zjgr/poJjln5/jgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHN0cmluZyBlcXVpdmFsZW50IHRvIGRhdGEtYGtleWAgaXMgZ2l2ZW4uXG4gICAgICogIC0gYGphYCBkYXRhLWBrZXlgIOOBq+ebuOW9k+OBmeOCi+aWh+Wtl+WIl+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmVEYXRhKGtleTogc3RyaW5nIHwgc3RyaW5nW10pOiB0aGlzIHtcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcm9wcyA9IGlzQXJyYXkoa2V5KSA/IGtleS5tYXAoayA9PiBjYW1lbGl6ZShrKSkgOiBbY2FtZWxpemUoa2V5KV07XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkYXRhc2V0IH0gPSBlbDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFzZXRbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NQXR0cmlidXRlcywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIG5vb3AsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3csIGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgUXVlcnlDb250ZXh0LFxuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBET01SZXN1bHQsXG4gICAgRE9NSXRlcmF0ZUNhbGxiYWNrLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUJhc2UsXG4gICAgRE9NSXRlcmFibGUsXG4gICAgaXNOb2RlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNOb2RlUXVlcmlhYmxlLFxuICAgIGlzVHlwZUVsZW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGlzRW1wdHlTZWxlY3RvcixcbiAgICBpc1N0cmluZ1NlbGVjdG9yLFxuICAgIGlzRG9jdW1lbnRTZWxlY3RvcixcbiAgICBpc1dpbmRvd1NlbGVjdG9yLFxuICAgIGlzTm9kZVNlbGVjdG9yLFxuICAgIGlzSXRlcmFibGVTZWxlY3RvcixcbiAgICBub2RlTmFtZSxcbiAgICBnZXRPZmZzZXRQYXJlbnQsXG59IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCB0eXBlIERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFQgZXh0ZW5kcyBFbGVtZW50QmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPiA9IChpbmRleDogbnVtYmVyLCBlbGVtZW50OiBUKSA9PiBVO1xuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGlzKClgIGFuZCBgZmlsdGVyKClgICovXG5mdW5jdGlvbiB3aW5ub3c8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSwgVSBleHRlbmRzIEVsZW1lbnRCYXNlPihcbiAgICBzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VT4sXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPFU+LFxuICAgIHZhbGlkQ2FsbGJhY2s6IChlbDogVSkgPT4gYW55LFxuICAgIGludmFsaWRDYWxsYmFjaz86ICgpID0+IGFueSxcbik6IGFueSB7XG4gICAgaW52YWxpZENhbGxiYWNrID0gaW52YWxpZENhbGxiYWNrIHx8IG5vb3A7XG5cbiAgICBsZXQgcmV0dmFsOiBhbnk7XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiBkb20uZW50cmllcygpKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yLmNhbGwoZWwsIGluZGV4LCBlbCkpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmdTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmICgoZWwgYXMgTm9kZSBhcyBFbGVtZW50KS5tYXRjaGVzICYmIChlbCBhcyBOb2RlIGFzIEVsZW1lbnQpLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsID0gdmFsaWRDYWxsYmFjayhlbCk7XG4gICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzV2luZG93U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAod2luZG93ID09PSBlbCBhcyBXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0RvY3VtZW50U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQgPT09IGVsIGFzIE5vZGUgYXMgRG9jdW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IGludmFsaWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc05vZGVTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHZhbCA9IHZhbGlkQ2FsbGJhY2soZWwpO1xuICAgICAgICAgICAgICAgIGlmICh1bmRlZmluZWQgIT09IHJldHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlU2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW0gb2Ygc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbSA9PT0gZWwgYXMgTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR2YWwgPSB2YWxpZENhbGxiYWNrKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgICAgICAgICBpZiAodW5kZWZpbmVkICE9PSByZXR2YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dmFsID0gaW52YWxpZENhbGxiYWNrKCk7XG4gICAgaWYgKHVuZGVmaW5lZCAhPT0gcmV0dmFsKSB7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHBhcmVudCgpYCwgYHBhcmVudHMoKWAgYW5kIGBzaWJsaW5ncygpYCAqL1xuZnVuY3Rpb24gdmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGU6IE5vZGUgfCBudWxsKTogcGFyZW50Tm9kZSBpcyBOb2RlIHtcbiAgICByZXR1cm4gbnVsbCAhPSBwYXJlbnROb2RlICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gcGFyZW50Tm9kZS5ub2RlVHlwZSAmJiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUgIT09IHBhcmVudE5vZGUubm9kZVR5cGU7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2hpbGRyZW4oKWAsIGBwYXJlbnQoKWAsIGBuZXh0KClgIGFuZCBgcHJldigpYCAqL1xuZnVuY3Rpb24gdmFsaWRSZXRyaWV2ZU5vZGU8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4obm9kZTogTm9kZSB8IG51bGwsIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCk6IG5vZGUgaXMgTm9kZSB7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBpZiAoJChub2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBuZXh0VW50aWwoKWAgYW5kIGBwcmV2VW50aWwoKSAqL1xuZnVuY3Rpb24gcmV0cmlldmVTaWJsaW5nczxcbiAgICBFIGV4dGVuZHMgRWxlbWVudEJhc2UsXG4gICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlLFxuICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2Vcbj4oXG4gICAgc2libGluZzogJ3ByZXZpb3VzRWxlbWVudFNpYmxpbmcnIHwgJ25leHRFbGVtZW50U2libGluZycsXG4gICAgZG9tOiBET01UcmF2ZXJzaW5nPEU+LFxuICAgIHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+XG4pOiBET008VD4ge1xuICAgIGlmICghaXNUeXBlRWxlbWVudChkb20pKSB7XG4gICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuXG4gICAgZm9yIChjb25zdCBlbCBvZiBkb20gYXMgRE9NSXRlcmFibGU8RWxlbWVudD4pIHtcbiAgICAgICAgbGV0IGVsZW0gPSBlbFtzaWJsaW5nXTtcbiAgICAgICAgd2hpbGUgKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaWYgKCQoZWxlbSkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoJChlbGVtKS5pcyhmaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNpYmxpbmdzLmFkZChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW0gPSBlbGVtW3NpYmxpbmddO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIHRyYXZlcnNpbmcgbWV0aG9kcy5cbiAqIEBqYSDjg4jjg6njg5Djg7zjgrnjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTVRyYXZlcnNpbmc8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFbGVtZW50IE1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSBvbmUgb2YgdGhlIGVsZW1lbnRzIG1hdGNoZWQgYnkgdGhlIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumuOBl+OBpumFjeS4i+OBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KGluZGV4OiBudW1iZXIpOiBURWxlbWVudCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSB0aGUgZWxlbWVudHMgbWF0Y2hlZCBieSB0aGUgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44GZ44G544Gm44KS6YWN5YiX44Gn5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGdldCgpOiBURWxlbWVudFtdO1xuXG4gICAgcHVibGljIGdldChpbmRleD86IG51bWJlcik6IFRFbGVtZW50W10gfCBURWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChudWxsICE9IGluZGV4KSB7XG4gICAgICAgICAgICBpbmRleCA9IE1hdGguZmxvb3IoaW5kZXgpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGV4IDwgMCA/IHRoaXNbaW5kZXggKyB0aGlzLmxlbmd0aF0gOiB0aGlzW2luZGV4XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvQXJyYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXRyaWV2ZSBhbGwgdGhlIGVsZW1lbnRzIGNvbnRhaW5lZCBpbiB0aGUgW1tET01dXSBzZXQsIGFzIGFuIGFycmF5LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgZnjgbnjgabjgpLphY3liJfjgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9BcnJheSgpOiBURWxlbWVudFtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3QgZWxlbWVudCB3aXRoaW4gdGhlIFtbRE9NXV0gY29sbGVjdGlvbiByZWxhdGl2ZSB0byBpdHMgc2libGluZyBlbGVtZW50cy5cbiAgICAgKiBAamEgW1tET01dXSDlhoXjga7mnIDliJ3jga7opoHntKDjgYzlhYTlvJ/opoHntKDjga7kvZXnlarnm67jgavmiYDlsZ7jgZnjgovjgYvjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5kZXgoKTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNlYXJjaCBmb3IgYSBnaXZlbiBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciBbW0RPTV1dIGluc3RhbmNlIGZyb20gYW1vbmcgdGhlIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOmFjeS4i+OBruS9leeVquebruOBq+aJgOWxnuOBl+OBpuOBhOOCi+OBi+OCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBpbmRleDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHNlbGVjdG9yOiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgcHVibGljIGluZGV4PFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oc2VsZWN0b3I/OiBzdHJpbmcgfCBUIHwgRE9NPFQ+KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgICAgIGxldCBjaGlsZDogTm9kZSB8IG51bGwgPSB0aGlzWzBdO1xuICAgICAgICAgICAgd2hpbGUgKG51bGwgIT09IChjaGlsZCA9IGNoaWxkLnByZXZpb3VzU2libGluZykpIHtcbiAgICAgICAgICAgICAgICBpZiAoTm9kZS5FTEVNRU5UX05PREUgPT09IGNoaWxkLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlbGVtOiBUIHwgRWxlbWVudDtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gJChzZWxlY3RvcilbMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW0gPSBzZWxlY3RvciBpbnN0YW5jZW9mIERPTUJhc2UgPyBzZWxlY3RvclswXSA6IHNlbGVjdG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaSA9IFsuLi50aGlzXS5pbmRleE9mKGVsZW0gYXMgRWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gMCA8PSBpID8gaSA6IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogVHJhdmVyc2luZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGZpcnN0IGluIHRoZSBzZXQgYXMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5pyA5Yid44Gu6KaB57Sg44KSIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544Gr44GX44Gm5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJCh0aGlzWzBdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBmaW5hbCBvbmUgaW4gdGhlIHNldCBhcyBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovmnKvlsL7jga7opoHntKDjgpIgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgavjgZfjgablj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgcmV0dXJuICQodGhpc1t0aGlzLmxlbmd0aCAtIDFdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgW1tET01dXSBpbnN0YW5jZSB3aXRoIGVsZW1lbnRzIGFkZGVkIHRvIHRoZSBzZXQgZnJvbSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAg44Gn5Y+W5b6X44GX44GfIGBFbGVtZW50YCDjgpLov73liqDjgZfjgZ/mlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmAgU2V0IHVzaW5nIGBEb2N1bWVudGAgY29udGV4dC4gV2hlbiBiZWluZyB1bi1kZXNpZ25hdGluZywgYSBmaXhlZCB2YWx1ZSBvZiB0aGUgZW52aXJvbm1lbnQgaXMgdXNlZC5cbiAgICAgKiAgLSBgamFgIOS9v+eUqOOBmeOCiyBgRG9jdW1lbnRgIOOCs+ODs+ODhuOCreOCueODiOOCkuaMh+Wumi4g5pyq5oyH5a6a44Gu5aC05ZCI44Gv55Kw5aKD44Gu5pei5a6a5YCk44GM5L2/55So44GV44KM44KLLlxuICAgICAqL1xuICAgIHB1YmxpYyBhZGQ8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0ICRhZGQgPSAkKHNlbGVjdG9yLCBjb250ZXh0KTtcbiAgICAgICAgY29uc3QgZWxlbXMgPSBuZXcgU2V0KFsuLi50aGlzLCAuLi4kYWRkXSk7XG4gICAgICAgIHJldHVybiAkKFsuLi5lbGVtc10gYXMgYW55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgdGhlIGN1cnJlbnQgbWF0Y2hlZCBzZXQgb2YgZWxlbWVudHMgYWdhaW5zdCBhIHNlbGVjdG9yLCBlbGVtZW50LCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZnjgovjgYvnorroqo1cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBgdHJ1ZWAgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZXNlIGVsZW1lbnRzIG1hdGNoZXMgdGhlIGdpdmVuIGFyZ3VtZW50cy5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBq+aMh+WumuOBl+OBn+adoeS7tuOBjOimgee0oOOBruS4gOOBpOOBp+OCguS4gOiHtOOBmeOCjOOBsCBgdHJ1ZWAg44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIGlzPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB3aW5ub3coc2VsZWN0b3IsIHRoaXMsICgpID0+IHRydWUsICgpID0+IGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IG1hdGNoIHRoZSBzZWxlY3RvciBvciBwYXNzIHRoZSBmdW5jdGlvbidzIHRlc3QuXG4gICAgICogQGphIOOCu+ODrOOCr+OCvywg6KaB57SgLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZcsIOePvuWcqOOBruimgee0oOOBruOCu+ODg+ODiOOBqOS4gOiHtOOBl+OBn+OCguOBruOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLCB0ZXN0IGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIlywg44OG44K544OI6Zai5pWwXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIE5ldyBbW0RPTV1dIGluc3RhbmNlIGluY2x1ZGluZyBmaWx0ZXJlZCBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+ODquODs+OCsOOBleOCjOOBn+imgee0oOOCkuWGheWMheOBmeOCiyDmlrDopo8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiBET008VEVsZW1lbnQ+IHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoIDw9IDAgfHwgaXNFbXB0eVNlbGVjdG9yKHNlbGVjdG9yIGFzIERPTVNlbGVjdG9yPFQ+KSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBURWxlbWVudFtdID0gW107XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5wdXNoKGVsKTsgfSk7XG4gICAgICAgIHJldHVybiAkKGVsZW1lbnRzIGFzIE5vZGVbXSkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGVsZW1lbnRzIGZyb20gdGhlIHNldCBvZiBtYXRjaCB0aGUgc2VsZWN0b3Igb3IgcGFzcyB0aGUgZnVuY3Rpb24ncyB0ZXN0LlxuICAgICAqIEBqYSDjgrvjg6zjgq/jgr8sIOimgee0oCwg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GXLCDnj77lnKjjga7opoHntKDjga7jgrvjg4Pjg4jjgajkuIDoh7TjgZfjgZ/jgoLjga7jgpLliYrpmaTjgZfjgabov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXSwgdGVzdCBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJcsIOODhuOCueODiOmWouaVsFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBOZXcgW1tET01dXSBpbnN0YW5jZSBleGNsdWRpbmcgZmlsdGVyZWQgZWxlbWVudHMuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/opoHntKDjgpLku6XlpJbjgpLlhoXljIXjgZnjgosg5paw6KaPIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIG5vdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4gfCBET01JdGVyYXRlQ2FsbGJhY2s8VEVsZW1lbnQ+KTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA8PSAwIHx8IGlzRW1wdHlTZWxlY3RvcihzZWxlY3RvciBhcyBET01TZWxlY3RvcjxUPikpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFRFbGVtZW50PjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbGVtZW50cyA9IG5ldyBTZXQ8VEVsZW1lbnQ+KFsuLi50aGlzXSk7XG4gICAgICAgIHdpbm5vdyhzZWxlY3RvciwgdGhpcywgKGVsOiBURWxlbWVudCkgPT4geyBlbGVtZW50cy5kZWxldGUoZWwpOyB9KTtcbiAgICAgICAgcmV0dXJuICQoWy4uLmVsZW1lbnRzXSBhcyBOb2RlW10pIGFzIERPTTxURWxlbWVudD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZGVzY2VuZGFudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabmjIflrprjgZfjgZ/jgrvjg6zjgq/jgr/jgavkuIDoh7TjgZnjgovopoHntKDjgpLmpJzntKJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmluZDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAoIWlzU3RyaW5nKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdG9yID0gJChzZWxlY3RvcikgYXMgRE9NPE5vZGU+O1xuICAgICAgICAgICAgcmV0dXJuICRzZWxlY3Rvci5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsICE9PSBlbGVtICYmIGVsLmNvbnRhaW5zKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWxlbWVudHM6IEVsZW1lbnRbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZVF1ZXJpYWJsZShlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbXMgPSBlbC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaCguLi5lbGVtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoZWxlbWVudHMgYXMgTm9kZVtdKSBhcyBET01SZXN1bHQ8VD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVkdWNlIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aG9zZSB0aGF0IGhhdmUgYSBkZXNjZW5kYW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBq+WvvuOBl+OBpuaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OBq+S4gOiHtOOBl+OBn+WtkOimgee0oOaMgeOBpOimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBoYXM8VCBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldHM6IE5vZGVbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVRdWVyaWFibGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoc2VsZWN0b3IsIGVsIGFzIEVsZW1lbnQpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICAgICB0YXJnZXRzLnB1c2goLi4uJHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXIoKGluZGV4LCBlbGVtKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlKGVsZW0pKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiBuZXcgU2V0KHRhcmdldHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtICE9PSBlbCAmJiBlbGVtLmNvbnRhaW5zKGVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pIGFzIERPTTxOb2RlPiBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFBhc3MgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IG1hdGNoZWQgc2V0IHRocm91Z2ggYSBmdW5jdGlvbiwgcHJvZHVjaW5nIGEgbmV3IFtbRE9NXV0gaW5zdGFuY2UgY29udGFpbmluZyB0aGUgcmV0dXJuIHZhbHVlcy5cbiAgICAgKiBAamEg44Kz44O844Or44OQ44OD44Kv44Gn5aSJ5pu044GV44KM44Gf6KaB57Sg44KS55So44GE44Gm5paw44Gf44GrIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS5qeL56+JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIG1vZGlmaWNhdGlvbiBmdW5jdGlvbiBvYmplY3QgdGhhdCB3aWxsIGJlIGludm9rZWQgZm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQuXG4gICAgICogIC0gYGphYCDlkITopoHntKDjgavlr77jgZfjgablkbzjgbPlh7rjgZXjgozjgovlpInmm7TplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgbWFwPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oY2FsbGJhY2s6IERPTU1vZGlmaWNhdGlvbkNhbGxiYWNrPFRFbGVtZW50LCBUPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgZWxlbWVudHMucHVzaChjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChlbGVtZW50cyBhcyBOb2RlW10pIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0ZSBvdmVyIGEgW1tET01dXSBpbnN0YW5jZSwgZXhlY3V0aW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgavlr77jgZfjgabjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gb2JqZWN0IHRoYXQgd2lsbCBiZSBpbnZva2VkIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0LlxuICAgICAqICAtIGBqYWAg5ZCE6KaB57Sg44Gr5a++44GX44Gm5ZG844Gz5Ye644GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgcHVibGljIGVhY2goY2FsbGJhY2s6IERPTUl0ZXJhdGVDYWxsYmFjazxURWxlbWVudD4pOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBbaW5kZXgsIGVsXSBvZiB0aGlzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGZhbHNlID09PSBjYWxsYmFjay5jYWxsKGVsLCBpbmRleCwgZWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZHVjZSB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gYSBzdWJzZXQgc3BlY2lmaWVkIGJ5IGEgcmFuZ2Ugb2YgaW5kaWNlcy5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GV44KM44Gf56+E5Zuy44Gu6KaB57Sg44KS5ZCr44KAIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmVnaW5cbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgaW5kaWNhdGluZyB0aGUgMC1iYXNlZCBwb3NpdGlvbiBhdCB3aGljaCB0aGUgZWxlbWVudHMgYmVnaW4gdG8gYmUgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjga7plovlp4vkvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKiBAcGFyYW0gZW5kXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIGluZGljYXRpbmcgdGhlIDAtYmFzZWQgcG9zaXRpb24gYXQgd2hpY2ggdGhlIGVsZW1lbnRzIHN0b3AgYmVpbmcgc2VsZWN0ZWQuXG4gICAgICogIC0gYGphYCDlj5bjgorlh7rjgZfjgpLntYLjgYjjgovnm7TliY3jga7kvY3nva7jgpLnpLrjgZkgMCDjgYvjgonlp4vjgb7jgovjgqTjg7Pjg4fjg4Pjgq/jgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgc2xpY2UoYmVnaW4/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IERPTTxURWxlbWVudD4ge1xuICAgICAgICByZXR1cm4gJChbLi4udGhpc10uc2xpY2UoYmVnaW4sIGVuZCkgYXMgTm9kZVtdKSBhcyBET008VEVsZW1lbnQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWR1Y2UgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBvbmUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44GX44Gf6KaB57Sg44KS5ZCr44KAIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K544KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBlcShpbmRleDogbnVtYmVyKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gJCh0aGlzLmdldChpbmRleCkpIGFzIERPTTxURWxlbWVudD47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0LCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3RvciBieSB0ZXN0aW5nIHRoZSBlbGVtZW50IGl0c2VsZiBhbmQgdHJhdmVyc2luZyB1cCB0aHJvdWdoIGl0cyBhbmNlc3RvcnMgaW4gdGhlIERPTSB0cmVlLlxuICAgICAqIEBqYSDplovlp4vopoHntKDjgYvjgonmnIDjgoLov5HjgYTopqropoHntKDjgpLpgbjmip4uIOOCu+ODrOOCr+OCv+ODvOaMh+WumuOBl+OBn+WgtOWQiCwg44Oe44OD44OB44GZ44KL5pyA44KC6L+R44GE6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0sIHRlc3QgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXLCDjg4bjgrnjg4jplqLmlbBcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvc2VzdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWxlY3RvciB8fCAhaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIGNvbnN0IGNsb3Nlc3RzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBlbC5jbG9zZXN0KHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3Nlc3RzLmFkZChjKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAkKFsuLi5jbG9zZXN0c10pIGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgcmV0dXJuICQodGhpcyBhcyBhbnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50cyhzZWxlY3RvcikuZXEoMCkgYXMgRE9NPE5vZGU+IGFzIERPTVJlc3VsdDxUPjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiBAamEg5ZCE6KaB57Sg44Gu5a2Q6KaB57Sg44KS5Y+W5b6XLiDjgrvjg6zjgq/jgr/jgYzmjIflrprjgZXjgozjgZ/loLTlkIjjga/jg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZXjgozjgZ/ntZDmnpzjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBjaGlsZHJlbjxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGlsZHJlbiA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlUXVlcmlhYmxlKGVsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWwuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGNoaWxkLCBzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuLmFkZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLmNoaWxkcmVuXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IHBhcmVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIGN1cnJlbnQgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOeuoei9hOOBl+OBpuOBhOOCi+WQhOimgee0oOOBruacgOWIneOBruimquimgee0oOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnQ8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHBhcmVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROb2RlID0gZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAodmFsaWRQYXJlbnROb2RlKHBhcmVudE5vZGUpICYmIHZhbGlkUmV0cmlldmVOb2RlKHBhcmVudE5vZGUsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRzLmFkZChwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnBhcmVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgYW5jZXN0b3JzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgY3VycmVudCBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg566h6L2E44GX44Gm44GE44KL5ZCE6KaB57Sg44Gu56WW5YWI44Gu6Kaq6KaB57Sg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKiBAcmV0dXJucyBbW0RPTV1dIGluc3RhbmNlXG4gICAgICovXG4gICAgcHVibGljIHBhcmVudHM8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudHNVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBhbmNlc3RvcnMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBjdXJyZW50IHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCA8YnI+XG4gICAgICogICAgIHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLCBET00gbm9kZSwgb3IgW1tET01dXSBpbnN0YW5jZVxuICAgICAqIEBqYSDnrqHovYTjgZfjgabjgYTjgovlkITopoHntKDjga7npZblhYjjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZVxuICAgICAqL1xuICAgIHB1YmxpYyBwYXJlbnRzVW50aWw8XG4gICAgICAgIFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsXG4gICAgICAgIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2UsXG4gICAgICAgIFYgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2VcbiAgICA+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4sIGZpbHRlcj86IERPTVNlbGVjdG9yPFY+KTogRE9NPFQ+IHtcbiAgICAgICAgbGV0IHBhcmVudHM6IE5vZGVbXSA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgbGV0IHBhcmVudE5vZGUgPSAoZWwgYXMgTm9kZSkucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIHdoaWxlICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBzZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJChwYXJlbnROb2RlKS5pcyhzZWxlY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCQocGFyZW50Tm9kZSkuaXMoZmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50cy5wdXNoKHBhcmVudE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g6KSH5pWw6KaB57Sg44GM5a++6LGh44Gr44Gq44KL44Go44GN44Gv5Y+N6LuiXG4gICAgICAgIGlmICgxIDwgdGhpcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcmVudHMgPSBbLi4ubmV3IFNldChwYXJlbnRzLnJldmVyc2UoKSldLnJldmVyc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAkKHBhcmVudHMpIGFzIERPTTxUPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBpbW1lZGlhdGVseSBmb2xsb3dpbmcgc2libGluZyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLiA8YnI+XG4gICAgICogICAgIElmIGEgc2VsZWN0b3IgaXMgcHJvdmlkZWQsIGl0IHJldHJpZXZlcyB0aGUgbmV4dCBzaWJsaW5nIG9ubHkgaWYgaXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICAgICAqIEBqYSDopoHntKDpm4blkIjjga7lkITopoHntKDjga7nm7TlvozjgavjgYLjgZ/jgovlhYTlvJ/opoHntKDjgpLmir3lh7ogPGJyPlxuICAgICAqICAgICDmnaHku7blvI/jgpLmjIflrprjgZfjgIHntZDmnpzjgrvjg4Pjg4jjgYvjgonmm7TjgavntZ7ovrzjgb/jgpLooYzjgYbjgZPjgajjgoLlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBuZXh0PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFUgZXh0ZW5kcyBTZWxlY3RvckJhc2UgPSBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VT4pOiBET008VD4ge1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dFNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBlbC5uZXh0RWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ubmV4dFNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIGZvbGxvd2luZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruasoeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm5leHRVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBmb2xsb3dpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7mrKHku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+ODvOOChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIG5leHRVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygnbmV4dEVsZW1lbnRTaWJsaW5nJywgdGhpcywgc2VsZWN0b3IsIGZpbHRlcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgaW1tZWRpYXRlbHkgcHJlY2VkaW5nIHNpYmxpbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBJZiBhIHNlbGVjdG9yIGlzIHByb3ZpZGVkLCBpdCByZXRyaWV2ZXMgdGhlIHByZXZpb3VzIHNpYmxpbmcgb25seSBpZiBpdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOOBruWQhOimgee0oOOBruebtOWJjeOBruWFhOW8n+imgee0oOOCkuaKveWHuiA8YnI+XG4gICAgICogICAgIOadoeS7tuW8j+OCkuaMh+WumuOBl+OAgee1kOaenOOCu+ODg+ODiOOBi+OCieabtOOBq+e1nui+vOOBv+OCkuihjOOBhuOBk+OBqOOCguWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXY8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2U2libGluZ3MgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWxlbSA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgaWYgKHZhbGlkUmV0cmlldmVOb2RlKGVsZW0sIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2U2libGluZ3MuYWRkKGVsZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4ucHJldlNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYWxsIHByZWNlZGluZyBzaWJsaW5ncyBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogQGphIOODnuODg+ODgeOBl+OBn+imgee0oOmbhuWQiOWGheOBruWQhOimgee0oOOBruWJjeS7pemZjeOBruWFqOOBpuOBruWFhOW8n+imgee0oOOCkuWPluW+ly4g44K744Os44Kv44K/44KS5oyH5a6a44GZ44KL44GT44Go44Gn44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44GT44Go44GM5Y+v6IO9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBmaWx0ZXJlZCBieSBhIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZBbGw8VCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCwgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPik6IERPTTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZVbnRpbCh1bmRlZmluZWQsIHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGFsbCBwcmVjZWRpbmcgc2libGluZ3Mgb2YgZWFjaCBlbGVtZW50IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIHRoZSBlbGVtZW50IG1hdGNoZWQgYnkgdGhlIHNlbGVjdG9yLlxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/opoHntKDjga7liY3ku6XpmY3jga7lhYTlvJ/opoHntKDjgacsIOaMh+WumuOBl+OBn+OCu+ODrOOCr+OCv+OChOadoeS7tuOBq+S4gOiHtOOBmeOCi+imgee0oOOBjOWHuuOBpuOBj+OCi+OBvuOBp+mBuOaKnuOBl+OBpuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc3RyaW5nIHNlbGVjdG9yLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/55So5paH5a2X5YiX44K744Os44Kv44K/XG4gICAgICovXG4gICAgcHVibGljIHByZXZVbnRpbDxcbiAgICAgICAgVCBleHRlbmRzIE5vZGUgPSBIVE1MRWxlbWVudCxcbiAgICAgICAgVSBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZSxcbiAgICAgICAgViBleHRlbmRzIFNlbGVjdG9yQmFzZSA9IFNlbGVjdG9yQmFzZVxuICAgID4oc2VsZWN0b3I/OiBET01TZWxlY3RvcjxVPiwgZmlsdGVyPzogRE9NU2VsZWN0b3I8Vj4pOiBET008VD4ge1xuICAgICAgICByZXR1cm4gcmV0cmlldmVTaWJsaW5ncygncHJldmlvdXNFbGVtZW50U2libGluZycsIHRoaXMsIHNlbGVjdG9yLCBmaWx0ZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHNpYmxpbmdzIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBzZWxlY3RvclxuICAgICAqIEBqYSDjg57jg4Pjg4HjgZfjgZ/lkITopoHntKDjga7lhYTlvJ/opoHntKDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgZmlsdGVyZWQgYnkgYSBzZWxlY3Rvci5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+eUqOOCu+ODrOOCr+OCv1xuICAgICAqL1xuICAgIHB1YmxpYyBzaWJsaW5nczxUIGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBVIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFU+KTogRE9NPFQ+IHtcbiAgICAgICAgaWYgKCFpc1R5cGVFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJCgpIGFzIERPTTxUPjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpYmxpbmdzID0gbmV3IFNldDxOb2RlPigpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSBlbC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZFBhcmVudE5vZGUocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzaWJsaW5nIG9mICQocGFyZW50Tm9kZSkuY2hpbGRyZW4oc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2libGluZyAhPT0gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5ncy5hZGQoc2libGluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICQoWy4uLnNpYmxpbmdzXSkgYXMgRE9NPFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGNoaWxkcmVuIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyB0ZXh0IGFuZCBjb21tZW50IG5vZGVzLlxuICAgICAqIEBqYSDjg4bjgq3jgrnjg4jjgoRIVE1M44Kz44Oh44Oz44OI44KS5ZCr44KA5a2Q6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGNvbnRlbnRzPFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3codGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKCkgYXMgRE9NPFQ+O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudHMgPSBuZXcgU2V0PE5vZGU+KCk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZU5hbWUoZWwsICdpZnJhbWUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIE5vZGUgYXMgSFRNTElGcmFtZUVsZW1lbnQpLmNvbnRlbnREb2N1bWVudCBhcyBOb2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVOYW1lKGVsLCAndGVtcGxhdGUnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50cy5hZGQoKGVsIGFzIE5vZGUgYXMgSFRNTFRlbXBsYXRlRWxlbWVudCkuY29udGVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIGVsLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzLmFkZChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJChbLi4uY29udGVudHNdKSBhcyBET008VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY2xvc2VzdCBhbmNlc3RvciBlbGVtZW50IHRoYXQgaXMgcG9zaXRpb25lZC5cbiAgICAgKiBAamEg6KaB57Sg44Gu5YWI56WW6KaB57Sg44GnLCDjgrnjgr/jgqTjg6vjgafjg53jgrjjgrfjg6fjg7PmjIflrpoocG9zaXRpaW9u44GMcmVsYXRpdmUsIGFic29sdXRlLCBmaXhlZOOBruOBhOOBmuOCjOOBiynjgZXjgozjgabjgYTjgovjgoLjga7jgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgb2Zmc2V0UGFyZW50PFQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQ+KCk6IERPTTxUPiB7XG4gICAgICAgIGNvbnN0IHJvb3RFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICQoKSBhcyBET008VD47XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiAkKHJvb3RFbGVtZW50KSBhcyBET008Tm9kZT4gYXMgRE9NPFQ+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0cyA9IG5ldyBTZXQ8Tm9kZT4oKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGdldE9mZnNldFBhcmVudChlbCBhcyBOb2RlKSB8fCByb290RWxlbWVudDtcbiAgICAgICAgICAgICAgICBvZmZzZXRzLmFkZChvZmZzZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICQoWy4uLm9mZnNldHNdKSBhcyBET008VD47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnNldE1peENsYXNzQXR0cmlidXRlKERPTVRyYXZlcnNpbmcsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCJpbXBvcnQgeyBpc1N0cmluZywgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBTZWxlY3RvckJhc2UsXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgRE9NUmVzdWx0LFxuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGUsXG4gICAgaXNOb2RlRWxlbWVudCxcbiAgICBpc1R5cGVFbGVtZW50LFxuICAgIGlzVHlwZURvY3VtZW50LFxuICAgIGlzVHlwZVdpbmRvdyxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGNoZWNrIEhUTUwgc3RyaW5nICovXG5mdW5jdGlvbiBpc0hUTUxTdHJpbmcoc3JjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBzdWJqZWN0ID0gc3JjLnRyaW0oKTtcbiAgICByZXR1cm4gKCc8JyA9PT0gc3ViamVjdC5zbGljZSgwLCAxKSkgJiYgKCc+JyA9PT0gc3ViamVjdC5zbGljZSgtMSkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGFwcGVuZCgpYCwgYHByZXBlbmQoKWAsIGBiZWZvcmUoKWAgYW5kIGBhZnRlcigpYCAgKi9cbmZ1bmN0aW9uIHRvTm9kZVNldDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IFNldDxOb2RlIHwgc3RyaW5nPiB7XG4gICAgY29uc3Qgbm9kZXMgPSBuZXcgU2V0PE5vZGUgfCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjb250ZW50IG9mIGNvbnRlbnRzKSB7XG4gICAgICAgIGlmICgoaXNTdHJpbmcoY29udGVudCkgJiYgIWlzSFRNTFN0cmluZyhjb250ZW50KSkgfHwgaXNOb2RlKGNvbnRlbnQpKSB7XG4gICAgICAgICAgICBub2Rlcy5hZGQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChjb250ZW50IGFzIERPTTxFbGVtZW50Pik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1N0cmluZyhub2RlKSB8fCAoaXNOb2RlKG5vZGUpICYmIE5vZGUuRE9DVU1FTlRfTk9ERSAhPT0gbm9kZS5ub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMuYWRkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9kZXM7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgYmVmb3JlKClgIGFuZCBgYWZ0ZXIoKWAgICovXG5mdW5jdGlvbiB0b05vZGUobm9kZTogTm9kZSB8IHN0cmluZyk6IE5vZGUge1xuICAgIGlmIChpc1N0cmluZyhub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYGRldGFjaCgpYCBhbmQgYHJlbW92ZSgpYCAqL1xuZnVuY3Rpb24gcmVtb3ZlRWxlbWVudDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlLCBVIGV4dGVuZHMgRWxlbWVudEJhc2U+KFxuICAgIHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPiB8IHVuZGVmaW5lZCxcbiAgICBkb206IERPTUl0ZXJhYmxlPFU+LFxuICAgIGtlZXBMaXN0ZW5lcjogYm9vbGVhblxuKTogdm9pZCB7XG4gICAgY29uc3QgJGRvbTogRE9NPFU+ID0gbnVsbCAhPSBzZWxlY3RvclxuICAgICAgICA/IChkb20gYXMgRE9NPFU+KS5maWx0ZXIoc2VsZWN0b3IpXG4gICAgICAgIDogZG9tIGFzIERPTTxVPjtcblxuICAgIGlmICgha2VlcExpc3RlbmVyKSB7XG4gICAgICAgICRkb20ub2ZmKCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBlbCBvZiAkZG9tKSB7XG4gICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgbWFuaXB1bGF0aW9uIG1ldGhvZHMuXG4gKiBAamEg44Oe44OL44OU44Ol44Os44O844K344On44Oz44Oh44K944OD44OJ44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01NYW5pcHVsYXRpb248VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBJbnNlcnRpb24sIEluc2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgSFRNTCBjb250ZW50cyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBIVE1MIOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBodG1sKCk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIEhUTUwgY29udGVudHMgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44GfIEhUTUwg44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaHRtbFN0cmluZ1xuICAgICAqICAtIGBlbmAgQSBzdHJpbmcgb2YgSFRNTCB0byBzZXQgYXMgdGhlIGNvbnRlbnQgb2YgZWFjaCBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogIC0gYGphYCDopoHntKDlhoXjgavmjL/lhaXjgZnjgosgSFRNTCDmloflrZfliJfjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgaHRtbChodG1sU3RyaW5nOiBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGh0bWwoaHRtbFN0cmluZz86IHN0cmluZyk6IHN0cmluZyB8IHRoaXMge1xuICAgICAgICBpZiAodW5kZWZpbmVkID09PSBodG1sU3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIHJldHVybiBpc05vZGVFbGVtZW50KGVsKSA/IGVsLmlubmVySFRNTCA6ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGh0bWxTdHJpbmcpKSB7XG4gICAgICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sU3RyaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaW52YWxpZCBhcmdcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgaW52YWxpZCBhcmcuIGh0bWxTdHJpbmcgdHlwZToke3R5cGVvZiBodG1sU3RyaW5nfWApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnRzIG9mIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy4gPGJyPlxuICAgICAqICAgICBqUXVlcnkgcmV0dXJucyB0aGUgY29tYmluZWQgdGV4dCBvZiBlYWNoIGVsZW1lbnQsIGJ1dCB0aGlzIG1ldGhvZCBtYWtlcyBvbmx5IGZpcnN0IGVsZW1lbnQncyB0ZXh0LlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjga7jg4bjgq3jgrnjg4jjgpLlj5blvpcgPGJyPlxuICAgICAqICAgICBqUXVlcnkg44Gv5ZCE6KaB57Sg44Gu6YCj57WQ44OG44Kt44K544OI44KS6L+U5Y2044GZ44KL44GM5pys44Oh44K944OD44OJ44Gv5YWI6aCt6KaB57Sg44Gu44G/44KS5a++6LGh44Go44GZ44KLXG4gICAgICovXG4gICAgcHVibGljIHRleHQoKTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHRvIHRoZSBzcGVjaWZpZWQgdGV4dC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5oyH5a6a44GX44Gf44OG44Kt44K544OI44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGV4dFxuICAgICAqICAtIGBlbmAgVGhlIHRleHQgdG8gc2V0IGFzIHRoZSBjb250ZW50IG9mIGVhY2ggbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqICAtIGBqYWAg6KaB57Sg5YaF44Gr5oy/5YWl44GZ44KL44OG44Kt44K544OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHRleHQodmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiB0aGlzO1xuXG4gICAgcHVibGljIHRleHQodmFsdWU/OiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogc3RyaW5nIHwgdGhpcyB7XG4gICAgICAgIGlmICh1bmRlZmluZWQgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGVsLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiAobnVsbCAhPSB0ZXh0KSA/IHRleHQudHJpbSgpIDogJyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGlmIChpc05vZGUoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBlbmQgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kPFQgZXh0ZW5kcyBFbGVtZW50PiguLi5jb250ZW50czogKE5vZGUgfCBzdHJpbmcgfCBET008VD4gfCBOb2RlTGlzdE9mPFQ+KVtdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG5vZGVzID0gdG9Ob2RlU2V0KC4uLmNvbnRlbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5hcHBlbmQoLi4ubm9kZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiB0aGUgdGFyZ2V0LlxuICAgICAqIEBqYSDphY3kuIvopoHntKDjgpLku5bjga7opoHntKDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgYXBwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLmFwcGVuZCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgY29udGVudCwgc3BlY2lmaWVkIGJ5IHRoZSBwYXJhbWV0ZXIsIHRvIHRoZSBiZWdpbm5pbmcgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YWI6aCt44Gr5byV5pWw44Gn5oyH5a6a44GX44Gf44Kz44Oz44OG44Oz44OE44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgcHJlcGVuZDxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgZWwucHJlcGVuZCguLi5ub2Rlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSB0YXJnZXQuXG4gICAgICogQGphIOmFjeS4i+imgee0oOOCkuS7luOBruimgee0oOOBruWFiOmgreOBq+aMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyBwcmVwZW5kVG88VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogRE9NUmVzdWx0PFQ+IHtcbiAgICAgICAgcmV0dXJuICgkKHNlbGVjdG9yKSBhcyBET00pLnByZXBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pIGFzIERPTVJlc3VsdDxUPjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEluc2VydGlvbiwgT3V0c2lkZVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYmVmb3JlIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWJjeOBq+aMh+WumuOBl+OBnyBIVE1MIOOChOimgee0oOOCkuaMv+WFpVxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRlbnRzXG4gICAgICogIC0gYGVuYCBlbGVtZW50KHMpLCB0ZXh0IG5vZGUocyksIEhUTUwgc3RyaW5nLCBvciBbW0RPTV1dIGluc3RhbmNlLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44GZ44KL6KaB57SgKOe+pCksIOODhuOCreOCueODiOODjuODvOODiSjnvqQpLCBIVE1MIHN0cmluZywg44G+44Gf44GvIFtbRE9NXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGJlZm9yZTxUIGV4dGVuZHMgRWxlbWVudD4oLi4uY29udGVudHM6IChOb2RlIHwgc3RyaW5nIHwgRE9NPFQ+IHwgTm9kZUxpc3RPZjxUPilbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBub2RlcyA9IHRvTm9kZVNldCguLi5jb250ZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZShlbCkgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0b05vZGUobm9kZSksIGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBldmVyeSBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cyBiZWZvcmUgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5YmN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEJlZm9yZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiBET01SZXN1bHQ8VD4ge1xuICAgICAgICByZXR1cm4gKCQoc2VsZWN0b3IpIGFzIERPTSkuYmVmb3JlKHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+KSBhcyBET01SZXN1bHQ8VD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEluc2VydCBjb250ZW50LCBzcGVjaWZpZWQgYnkgdGhlIHBhcmFtZXRlciwgYWZ0ZXIgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5b6M44KN44Gr5oyH5a6a44GX44GfIEhUTUwg44KE6KaB57Sg44KS5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGVudHNcbiAgICAgKiAgLSBgZW5gIGVsZW1lbnQocyksIHRleHQgbm9kZShzKSwgSFRNTCBzdHJpbmcsIG9yIFtbRE9NXV0gaW5zdGFuY2UuXG4gICAgICogIC0gYGphYCDov73liqDjgZnjgovopoHntKAo576kKSwg44OG44Kt44K544OI44OO44O844OJKOe+pCksIEhUTUwgc3RyaW5nLCDjgb7jgZ/jga8gW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgYWZ0ZXI8VCBleHRlbmRzIEVsZW1lbnQ+KC4uLmNvbnRlbnRzOiAoTm9kZSB8IHN0cmluZyB8IERPTTxUPiB8IE5vZGVMaXN0T2Y8VD4pW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgbm9kZXMgPSB0b05vZGVTZXQoLi4uWy4uLmNvbnRlbnRzXS5yZXZlcnNlKCkpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGUoZWwpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodG9Ob2RlKG5vZGUpLCBlbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbnNlcnQgZXZlcnkgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgYWZ0ZXIgdGhlIHRhcmdldC5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44KS5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gu5b6M44KN44Gr5oy/5YWlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIGluc2VydEFmdGVyPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5hZnRlcih0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogSW5zZXJ0aW9uLCBBcm91bmRcblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCBhbGwgZWxlbWVudHMgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZfjgZ/liKXopoHntKDjgafjgZ3jgozjgZ7jgozlm7LjgoBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JhcEFsbDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3RvcjogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZURvY3VtZW50KHRoaXMpIHx8IGlzVHlwZVdpbmRvdyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbCA9IHRoaXNbMF0gYXMgTm9kZTtcblxuICAgICAgICAvLyBUaGUgZWxlbWVudHMgdG8gd3JhcCB0aGUgdGFyZ2V0IGFyb3VuZFxuICAgICAgICBjb25zdCAkd3JhcCA9ICQoc2VsZWN0b3IsIGVsLm93bmVyRG9jdW1lbnQpLmVxKDApLmNsb25lKHRydWUpIGFzIERPTTxFbGVtZW50PjtcblxuICAgICAgICBpZiAoZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgJHdyYXAuaW5zZXJ0QmVmb3JlKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgICR3cmFwLm1hcCgoaW5kZXg6IG51bWJlciwgZWxlbTogRWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgd2hpbGUgKGVsZW0uZmlyc3RFbGVtZW50Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBlbGVtID0gZWxlbS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICB9KS5hcHBlbmQodGhpcyBhcyBET01JdGVyYWJsZTxOb2RlPiBhcyBET008RWxlbWVudD4pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcmFwIGFuIEhUTUwgc3RydWN0dXJlIGFyb3VuZCB0aGUgY29udGVudCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7lhoXlgbTjgpIsIOaMh+WumuOBl+OBn+WIpeOCqOODrOODoeODs+ODiOOBp+OBneOCjOOBnuOCjOWbsuOCgFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyB3cmFwSW5uZXI8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRzID0gJGVsLmNvbnRlbnRzKCk7XG4gICAgICAgICAgICBpZiAoMCA8IGNvbnRlbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnRzLndyYXBBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZWwuYXBwZW5kKHNlbGVjdG9yIGFzIE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFdyYXAgYW4gSFRNTCBzdHJ1Y3R1cmUgYXJvdW5kIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkiwg5oyH5a6a44GX44Gf5Yil6KaB57Sg44Gn44Gd44KM44Ge44KM5Zuy44KAXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gICAgICogIC0gYGphYCBbW0RPTV1dIOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCuSjnvqQp44G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICovXG4gICAgcHVibGljIHdyYXA8VCBleHRlbmRzIFNlbGVjdG9yQmFzZT4oc2VsZWN0b3I6IERPTVNlbGVjdG9yPFQ+KTogdGhpcyB7XG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgICRlbC53cmFwQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHBhcmVudHMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTSwgbGVhdmluZyB0aGUgbWF0Y2hlZCBlbGVtZW50cyBpbiB0aGVpciBwbGFjZS5cbiAgICAgKiBAamEg6KaB57Sg44Gu6Kaq44Ko44Os44Oh44Oz44OI44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIGZpbHRlcmVkIGJ5IGEgc2VsZWN0b3IuXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/nlKjjgrvjg6zjgq/jgr9cbiAgICAgKi9cbiAgICBwdWJsaWMgdW53cmFwPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NSXRlcmFibGU8Tm9kZT4gYXMgRE9NPEVsZW1lbnQ+O1xuICAgICAgICBzZWxmLnBhcmVudChzZWxlY3Rvcikubm90KCdib2R5JykuZWFjaCgoaW5kZXgsIGVsZW0pID0+IHtcbiAgICAgICAgICAgICQoZWxlbSkucmVwbGFjZVdpdGgoZWxlbS5jaGlsZE5vZGVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogUmVtb3ZhbFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhbGwgY2hpbGQgbm9kZXMgb2YgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg5YaF44Gu5a2Q6KaB57SgKOODhuOCreOCueODiOOCguWvvuixoSnjgpLjgZnjgbnjgabliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZW1wdHkoKTogdGhpcyB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS4gVGhpcyBtZXRob2Qga2VlcHMgZXZlbnQgbGlzdGVuZXIgaW5mb3JtYXRpb24uXG4gICAgICogQGphIOimgee0oOOCkiBET00g44GL44KJ5YmK6ZmkLiDliYrpmaTlvozjgoLjgqTjg5njg7Pjg4jjg6rjgrnjg4rjga/mnInlirlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgZGV0YWNoPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgdHJ1ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIGZyb20gdGhlIERPTS5cbiAgICAgKiBAamEg6KaB57Sg44KSIERPTSDjgYvjgonliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAgICAgKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yPzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgcmVtb3ZlRWxlbWVudChzZWxlY3RvciwgdGhpcywgZmFsc2UpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IFJlcGxhY2VtZW50XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIHdpdGggdGhlIHByb3ZpZGVkIG5ldyBjb250ZW50IGFuZCByZXR1cm4gdGhlIHNldCBvZiBlbGVtZW50cyB0aGF0IHdhcyByZW1vdmVkLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjgpLmjIflrprjgZXjgozjgZ/liKXjga7opoHntKDjgoQgSFRNTCDjgajlt67jgZfmm7/jgYhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdDb250ZW50XG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlV2l0aDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihuZXdDb250ZW50PzogRE9NU2VsZWN0b3I8VD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3QgZWxlbSA9ICgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZG9tID0gJChuZXdDb250ZW50KTtcbiAgICAgICAgICAgIGlmICgxID09PSAkZG9tLmxlbmd0aCAmJiBpc05vZGVFbGVtZW50KCRkb21bMF0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRkb21bMF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgJGRvbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBlbC5yZXBsYWNlV2l0aChlbGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGVhY2ggdGFyZ2V0IGVsZW1lbnQgd2l0aCB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOCkuaMh+WumuOBl+OBn+WIpeOBruimgee0oOOBqOW3ruOBl+abv+OBiFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqL1xuICAgIHB1YmxpYyByZXBsYWNlQWxsPFQgZXh0ZW5kcyBTZWxlY3RvckJhc2U+KHNlbGVjdG9yOiBET01TZWxlY3RvcjxUPik6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIHJldHVybiAoJChzZWxlY3RvcikgYXMgRE9NKS5yZXBsYWNlV2l0aCh0aGlzIGFzIERPTUl0ZXJhYmxlPE5vZGU+IGFzIERPTTxFbGVtZW50PikgYXMgRE9NUmVzdWx0PFQ+O1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NTWFuaXB1bGF0aW9uLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzU3RyaW5nLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzQXJyYXksXG4gICAgY2xhc3NpZnksXG4gICAgZGFzaGVyaXplLFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBFbGVtZW50QmFzZSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVIVE1MT3JTVkdFbGVtZW50LFxuICAgIGlzVHlwZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNUeXBlRG9jdW1lbnQsXG4gICAgaXNUeXBlV2luZG93LFxuICAgIGdldE9mZnNldFBhcmVudCxcbn0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjc3MoKWAgKi9cbmZ1bmN0aW9uIGVuc3VyZUNoYWluQ2FzZVByb3Blcmllcyhwcm9wczogUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4pOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgcmV0dmFsID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gcHJvcHMpIHtcbiAgICAgICAgcmV0dmFsW2Rhc2hlcml6ZShrZXkpXSA9IHByb3BzW2tleV07XG4gICAgfVxuICAgIHJldHVybiByZXR2YWw7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0RGVmYXVsdFZpZXcoZWw6IEVsZW1lbnQpOiBXaW5kb3cge1xuICAgIHJldHVybiAoZWwub3duZXJEb2N1bWVudCAmJiBlbC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3KSB8fCB3aW5kb3c7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY3NzKClgIGdldCBwcm9wcyAqL1xuZnVuY3Rpb24gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWw6IEVsZW1lbnQpOiBDU1NTdHlsZURlY2xhcmF0aW9uIHtcbiAgICBjb25zdCB2aWV3ID0gZ2V0RGVmYXVsdFZpZXcoZWwpO1xuICAgIHJldHVybiB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgY3NzIHZhbHVlIHRvIG51bWJlciAqL1xuZnVuY3Rpb24gdG9OdW1iZXIodmFsOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbCkgfHwgMDtcbn1cblxuY29uc3QgX3Jlc29sdmVyID0ge1xuICAgIHdpZHRoOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICBoZWlnaHQ6IFsndG9wJywgJ2JvdHRvbSddLFxufTtcblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRQYWRkaW5nKHN0eWxlOiBDU1NTdHlsZURlY2xhcmF0aW9uLCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIHJldHVybiB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzBdfWApKVxuICAgICAgICAgKyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGBwYWRkaW5nLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRCb3JkZXIoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYGJvcmRlci0ke19yZXNvbHZlclt0eXBlXVswXX0td2lkdGhgKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgYm9yZGVyLSR7X3Jlc29sdmVyW3R5cGVdWzFdfS13aWR0aGApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIHNpemUgY2FsY3V0aW9uICovXG5mdW5jdGlvbiBnZXRNYXJnaW4oc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUoYG1hcmdpbi0ke19yZXNvbHZlclt0eXBlXVswXX1gKSlcbiAgICAgICAgICsgdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShgbWFyZ2luLSR7X3Jlc29sdmVyW3R5cGVdWzFdfWApKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGB3aWR0aCgpYCBhbmQgYGhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlU2l6ZUZvcjxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KGRvbTogRE9NU3R5bGVzPFQ+LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcsIHZhbHVlPzogbnVtYmVyIHwgc3RyaW5nKTogbnVtYmVyIHwgRE9NU3R5bGVzPFQ+IHtcbiAgICBpZiAobnVsbCA9PSB2YWx1ZSkge1xuICAgICAgICAvLyBnZXR0ZXJcbiAgICAgICAgaWYgKGlzVHlwZVdpbmRvdyhkb20pKSB7XG4gICAgICAgICAgICAvLyDjgrnjgq/jg63jg7zjg6vjg5Djg7zjgpLpmaTjgYTjgZ/luYUgKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnRbYGNsaWVudCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSBpZiAoaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAgICAgLy8gKHNjcm9sbFdpZHRoIC8gc2Nyb2xsSGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXS5kb2N1bWVudEVsZW1lbnRbYHNjcm9sbCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBlbCA9IGRvbVswXTtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZUZyb20oZWwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemUgPSB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKTtcbiAgICAgICAgICAgICAgICBpZiAoJ2JvcmRlci1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpemUgLSAoZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2l6ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgIHJldHVybiBkb20uY3NzKHR5cGUsIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogYCR7dmFsdWV9cHhgKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgaW5uZXJXaWR0aCgpYCBhbmQgYGlubmVySGVpZ3RoKClgICovXG5mdW5jdGlvbiBtYW5hZ2VJbm5lclNpemVGb3I8VCBleHRlbmRzIEVsZW1lbnRCYXNlPihkb206IERPTVN0eWxlczxUPiwgdHlwZTogJ3dpZHRoJyB8ICdoZWlnaHQnLCB2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IERPTVN0eWxlczxUPiB7XG4gICAgaWYgKG51bGwgPT0gdmFsdWUpIHtcbiAgICAgICAgLy8gZ2V0dGVyXG4gICAgICAgIGlmIChpc1R5cGVXaW5kb3coZG9tKSB8fCBpc1R5cGVEb2N1bWVudChkb20pKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcihkb20gYXMgRE9NU3R5bGVzPFQ+LCB0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGVsID0gZG9tWzBdO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgLy8gKGNsaWVudFdpZHRoIC8gY2xpZW50SGVpZ2h0KVxuICAgICAgICAgICAgICAgIHJldHVybiBlbFtgY2xpZW50JHtjbGFzc2lmeSh0eXBlKX1gXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVHlwZVdpbmRvdyhkb20pIHx8IGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgLy8gc2V0dGVyIChubyByZWFjdGlvbilcbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZXR0ZXJcbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9IGlzU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiBkb20pIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVIVE1MT3JTVkdFbGVtZW50KGVsKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUsIG5ld1ZhbCB9ID0gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGV4dFByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIHZhbHVlIGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbCA9IGlzVGV4dFByb3AgPyB0b051bWJlcihzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHR5cGUpKSA6IHZhbHVlIGFzIG51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdib3JkZXItYm94JyA9PT0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnYm94LXNpemluZycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHR5cGUsIGAke25ld1ZhbCArIGdldEJvcmRlcihzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRQYWRkaW5nKHN0eWxlLCB0eXBlKX1weGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBvdXRlcldpZHRoKClgIGFuZCBgb3V0ZXJIZWlndGgoKWAgKi9cbmZ1bmN0aW9uIHBhcnNlT3V0ZXJTaXplQXJncyguLi5hcmdzOiBhbnlbXSk6IHsgaW5jbHVkZU1hcmdpbjogYm9vbGVhbjsgdmFsdWU6IG51bWJlciB8IHN0cmluZzsgfSB7XG4gICAgbGV0IFt2YWx1ZSwgaW5jbHVkZU1hcmdpbl0gPSBhcmdzO1xuICAgIGlmICghaXNOdW1iZXIodmFsdWUpICYmICFpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgaW5jbHVkZU1hcmdpbiA9ICEhdmFsdWU7XG4gICAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4geyBpbmNsdWRlTWFyZ2luLCB2YWx1ZSB9O1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYG91dGVyV2lkdGgoKWAgYW5kIGBvdXRlckhlaWd0aCgpYCAqL1xuZnVuY3Rpb24gbWFuYWdlT3V0ZXJTaXplRm9yPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT4oZG9tOiBET01TdHlsZXM8VD4sIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0JywgaW5jbHVkZU1hcmdpbjogYm9vbGVhbiwgdmFsdWU/OiBudW1iZXIgfCBzdHJpbmcpOiBudW1iZXIgfCBET01TdHlsZXM8VD4ge1xuICAgIGlmIChudWxsID09IHZhbHVlKSB7XG4gICAgICAgIC8vIGdldHRlclxuICAgICAgICBpZiAoaXNUeXBlV2luZG93KGRvbSkpIHtcbiAgICAgICAgICAgIC8vIOOCueOCr+ODreODvOODq+ODkOODvOOCkuWQq+OCgeOBn+W5hSAoaW5uZXJXaWR0aCAvIGlubmVySGVpZ2h0KVxuICAgICAgICAgICAgcmV0dXJuIGRvbVswXVtgaW5uZXIke2NsYXNzaWZ5KHR5cGUpfWBdO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVHlwZURvY3VtZW50KGRvbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBtYW5hZ2VTaXplRm9yKGRvbSBhcyBET01TdHlsZXM8VD4sIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZWwgPSBkb21bMF07XG4gICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyAob2Zmc2V0V2lkdGggLyBvZmZzZXRIZWlnaHQpXG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVNYXJnaW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlRnJvbShlbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQgKyBnZXRNYXJnaW4oc3R5bGUsIHR5cGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUeXBlV2luZG93KGRvbSkgfHwgaXNUeXBlRG9jdW1lbnQoZG9tKSkge1xuICAgICAgICAvLyBzZXR0ZXIgKG5vIHJlYWN0aW9uKVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldHRlclxuICAgICAgICBjb25zdCBpc1RleHRQcm9wID0gaXNTdHJpbmcodmFsdWUpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIGRvbSkge1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBzdHlsZSwgbmV3VmFsIH0gPSAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkodHlwZSwgdmFsdWUgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFyZ2luID0gaW5jbHVkZU1hcmdpbiA/IGdldE1hcmdpbihzdHlsZSwgdHlwZSkgOiAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWwgPSAoaXNUZXh0UHJvcCA/IHRvTnVtYmVyKHN0eWxlLmdldFByb3BlcnR5VmFsdWUodHlwZSkpIDogdmFsdWUgYXMgbnVtYmVyKSAtIG1hcmdpbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3R5bGUsIG5ld1ZhbCB9O1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgaWYgKCdjb250ZW50LWJveCcgPT09IHN0eWxlLmdldFByb3BlcnR5VmFsdWUoJ2JveC1zaXppbmcnKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWwgLSBnZXRCb3JkZXIoc3R5bGUsIHR5cGUpIC0gZ2V0UGFkZGluZyhzdHlsZSwgdHlwZSl9cHhgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSh0eXBlLCBgJHtuZXdWYWx9cHhgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRvbTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgcG9zaXRpb24oKWAgYW5kIGBvZmZzZXQoKWAgKi9cbmZ1bmN0aW9uIGdldE9mZnNldFBvc2l0aW9uKGVsOiBFbGVtZW50KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAvLyBmb3IgZGlzcGxheSBub25lXG4gICAgaWYgKGVsLmdldENsaWVudFJlY3RzKCkubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgfVxuXG4gICAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHZpZXcgPSBnZXREZWZhdWx0VmlldyhlbCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiByZWN0LnRvcCArIHZpZXcucGFnZVlPZmZzZXQsXG4gICAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHZpZXcucGFnZVhPZmZzZXRcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgb2Zmc2V0W1dpZHRoIHwgSGVpZ2h0XS4gVGhpcyBmdW5jdGlvbiB3aWxsIHdvcmsgU1ZHRWxlbWVudCwgdG9vLlxuICogQGphIG9mZnNlW1dpZHRoIHwgSGVpZ2h0XSDjga7lj5blvpcuIFNWR0VsZW1lbnQg44Gr44KC6YGp55So5Y+v6IO9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPZmZzZXRTaXplKGVsOiBIVE1MT3JTVkdFbGVtZW50LCB0eXBlOiAnd2lkdGgnIHwgJ2hlaWdodCcpOiBudW1iZXIge1xuICAgIGlmIChudWxsICE9IChlbCBhcyBIVE1MRWxlbWVudCkub2Zmc2V0V2lkdGgpIHtcbiAgICAgICAgLy8gKG9mZnNldFdpZHRoIC8gb2Zmc2V0SGVpZ2h0KVxuICAgICAgICByZXR1cm4gZWxbYG9mZnNldCR7Y2xhc3NpZnkodHlwZSl9YF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICogW05PVEVdIFNWR0VsZW1lbnQg44GvIG9mZnNldFdpZHRoIOOBjOOCteODneODvOODiOOBleOCjOOBquOBhFxuICAgICAgICAgKiAgICAgICAgZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkg44GvIHRyYW5zZm9ybSDjgavlvbHpn7/jgpLlj5fjgZHjgovjgZ/jgoEsXG4gICAgICAgICAqICAgICAgICDlrprnvqnpgJrjgoogYm9yZGVyLCBwYWRkaW4g44KS5ZCr44KB44Gf5YCk44KS566X5Ye644GZ44KLXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGVGcm9tKGVsIGFzIFNWR0VsZW1lbnQpO1xuICAgICAgICBjb25zdCBzaXplID0gdG9OdW1iZXIoc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSh0eXBlKSk7XG4gICAgICAgIGlmICgnY29udGVudC1ib3gnID09PSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKCdib3gtc2l6aW5nJykpIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplICsgZ2V0Qm9yZGVyKHN0eWxlLCB0eXBlKSArIGdldFBhZGRpbmcoc3R5bGUsIHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNpemU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgc3R5bGUgbWFuYWdlbWVudCBtZXRob2RzLlxuICogQGphIOOCueOCv+OCpOODq+mWoumAo+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU3R5bGVzPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU3R5bGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjb21wdXRlZCBzdHlsZSBwcm9wZXJ0aWVzIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOWFiOmgreimgee0oOOBriBDU1Mg44Gr6Kit5a6a44GV44KM44Gm44GE44KL44OX44Ot44OR44OG44Kj5YCk44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3jgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IHZhbHVlIHN0cmluZy5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlgKTjgpLmloflrZfliJfjgafov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyk6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG11bHRpcGxlIGNvbXB1dGVkIHN0eWxlIHByb3BlcnRpZXMgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44GuIENTUyDjgavoqK3lrprjgZXjgozjgabjgYTjgovjg5fjg63jg5Hjg4bjgqPlgKTjgpLopIfmlbDlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5IG5hbWUgYXJyYXkgYXMgY2hhaW4tY2FjZS5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPlkI3phY3liJfjgpLjg4HjgqfjgqTjg7PjgrHjg7zjgrnjgafmjIflrppcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgQ1NTIHByb3BlcnR5LXZhbHVlIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIENTUyDjg5fjg63jg5Hjg4bjgqPjgpLmoLzntI3jgZfjgZ/jgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWVzOiBzdHJpbmdbXSk6IFBsYWluT2JqZWN0PHN0cmluZz47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IENTUyBwcm9wZXJ0aXkgZm9yIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6KaB57Sg44GuIENTUyDjg5fjg63jg5Hjg4bjgqPjgavlgKTjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCBDU1MgcHJvcGVydHkgbmFtZSBhcyBjaGFpbi1jYWNlLlxuICAgICAqICAtIGBqYWAgQ1NTIOODl+ODreODkeODhuOCo+WQjeOCkuODgeOCp+OCpOODs+OCseODvOOCueOBp+aMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgc3RyaW5nIHZhbHVlIHRvIHNldCBmb3IgdGhlIHByb3BlcnR5LiBpZiBudWxsIHBhc3NlZCwgcmVtb3ZlIHByb3BlcnR5LlxuICAgICAqICAtIGBqYWAg6Kit5a6a44GZ44KL5YCk44KS5paH5a2X5YiX44Gn5oyH5a6aLiBudWxsIOaMh+WumuOBp+WJiumZpC5cbiAgICAgKi9cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyB8IG51bGwpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCBvbmUgb3IgbW9yZSBDU1MgcHJvcGVydGllcyBmb3IgdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDopoHntKDjga4gQ1NTIOikh+aVsOOBruODl+ODreODkeODhuOCo+OBq+WApOOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb3BlcnRpZXNcbiAgICAgKiAgLSBgZW5gIEFuIG9iamVjdCBvZiBwcm9wZXJ0eS12YWx1ZSBwYWlycyB0byBzZXQuXG4gICAgICogIC0gYGphYCBDU1Mg44OX44Ot44OR44OG44Kj44KS5qC857SN44GX44Gf44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcHVibGljIGNzcyhwcm9wZXJ0aWVzOiBQbGFpbk9iamVjdDxzdHJpbmcgfCBudWxsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgY3NzKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdIHwgUGxhaW5PYmplY3Q8c3RyaW5nIHwgbnVsbD4sIHZhbHVlPzogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IFBsYWluT2JqZWN0PHN0cmluZz4gfCB0aGlzIHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbCA9PSB2YWx1ZSA/ICcnIDogdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7fSBhcyBQbGFpbk9iamVjdDxzdHJpbmc+O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1N0cmluZyhuYW1lKSkge1xuICAgICAgICAgICAgaWYgKHVuZGVmaW5lZCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgcHJvcGVydHkgc2luZ2xlXG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSB0aGlzWzBdIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldENvbXB1dGVkU3R5bGVGcm9tKGVsKS5nZXRQcm9wZXJ0eVZhbHVlKGRhc2hlcml6ZShuYW1lKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHNldCBwcm9wZXJ0eSBzaW5nbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShuYW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PT0gdmFsdWUpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSFRNTE9yU1ZHRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KHByb3BOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBcnJheShuYW1lKSkge1xuICAgICAgICAgICAgLy8gZ2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGVsID0gdGhpc1swXSBhcyBFbGVtZW50O1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IGdldERlZmF1bHRWaWV3KGVsKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0ge30gYXMgUGxhaW5PYmplY3Q8c3RyaW5nPjtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGRhc2hlcml6ZShrZXkpO1xuICAgICAgICAgICAgICAgIHByb3BzW2tleV0gPSB2aWV3LmdldENvbXB1dGVkU3R5bGUoZWwpLmdldFByb3BlcnR5VmFsdWUocHJvcE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0IG11bHRpcGxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZW5zdXJlQ2hhaW5DYXNlUHJvcGVyaWVzKG5hbWUpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3R5bGUgfSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PT0gcHJvcHNbcHJvcE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShwcm9wTmFtZSwgcHJvcHNbcHJvcE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCB3aWR0aCBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzIG9yIHNldCB0aGUgd2lkdGggb2YgZXZlcnkgbWF0Y2hlZCBlbGVtZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7oqIjnrpfmuIjjgb/mqKrluYXjgpLjg5Tjgq/jgrvjg6vljZjkvY3jgaflj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgd2lkdGgoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIHdpZHRoIG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruaoquW5heOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyB3aWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnd2lkdGgnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgaGVpZ2h0IGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMgb3Igc2V0IHRoZSB3aWR0aCBvZiBldmVyeSBtYXRjaGVkIGVsZW1lbnQuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruioiOeul+a4iOOBv+eri+W5heOCkuODlOOCr+OCu+ODq+WNmOS9jeOBp+WPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBoZWlnaHQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgQ1NTIGhlaWdodCBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDphY3kuIvjga7opoHntKDjga7nuKbluYXjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBwaXhlbHMsIG9yIGFuIGludGVnZXIgYWxvbmcgd2l0aCBhbiBvcHRpb25hbCB1bml0IG9mIG1lYXN1cmUgYXBwZW5kZWQgKGFzIGEgc3RyaW5nKS5cbiAgICAgKiAgLSBgamFgIOW8leaVsOOBruWApOOBjOaVsOWApOOBruOBqOOBjeOBryBgcHhgIOOBqOOBl+OBpuaJseOBhCwg5paH5a2X5YiX44GvIENTUyDjga7jg6vjg7zjg6vjgavlvpPjgYZcbiAgICAgKi9cbiAgICBwdWJsaWMgaGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcpOiB0aGlzO1xuXG4gICAgcHVibGljIGhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlU2l6ZUZvcih0aGlzLCAnaGVpZ2h0JywgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIGlubmVyIHdpZHRoIGZvciB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIGluY2x1ZGluZyBwYWRkaW5nIGJ1dCBub3QgYm9yZGVyLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lhoXpg6jmqKrluYUoYm9yZGVy44Gv6Zmk44GN44CBcGFkZGluZ+OBr+WQq+OCgCnjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5YaF6YOo5qiq5bmFKGJvcmRlcuOBr+mZpOOBjeOAgXBhZGRpbmfjga/lkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICovXG4gICAgcHVibGljIGlubmVyV2lkdGgodmFsdWU6IG51bWJlciB8IHN0cmluZyk6IHRoaXM7XG5cbiAgICBwdWJsaWMgaW5uZXJXaWR0aCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICd3aWR0aCcsIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb21wdXRlZCBpbm5lciBoZWlnaHQgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cywgaW5jbHVkaW5nIHBhZGRpbmcgYnV0IG5vdCBib3JkZXIuXG4gICAgICogQGphIOacgOWIneOBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCgpOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1MgaW5uZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWGhemDqOe4puW5hShib3JkZXLjga/pmaTjgY3jgIFwYWRkaW5n44Gv5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqL1xuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nKTogdGhpcztcblxuICAgIHB1YmxpYyBpbm5lckhlaWdodCh2YWx1ZT86IG51bWJlciB8IHN0cmluZyk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICByZXR1cm4gbWFuYWdlSW5uZXJTaXplRm9yKHRoaXMsICdoZWlnaHQnLCB2YWx1ZSkgYXMgKG51bWJlciB8IHRoaXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGN1cnJlbnQgY29tcHV0ZWQgb3V0ZXIgd2lkdGggKGluY2x1ZGluZyBwYWRkaW5nLCBib3JkZXIsIGFuZCBvcHRpb25hbGx5IG1hcmdpbikgZm9yIHRoZSBmaXJzdCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg5pyA5Yid44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS5Y+W5b6XLiDjgqrjg5fjgrfjg6fjg7PmjIflrprjgavjgojjgorjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgZ/jgoLjga7jgoLlj5blvpflj69cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVyV2lkdGgoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgd2lkdGggb2YgZWFjaCBlbGVtZW50IGluIHRoZSBzZXQgb2YgbWF0Y2hlZCBlbGVtZW50cy5cbiAgICAgKiBAamEg6YWN5LiL44Gu6KaB57Sg44Gu5aSW6YOo5qiq5bmFKGJvcmRlcuOAgXBhZGRpbmfjgpLlkKvjgoAp44KS6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVcbiAgICAgKiAgLSBgZW5gIEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgcGl4ZWxzLCBvciBhbiBpbnRlZ2VyIGFsb25nIHdpdGggYW4gb3B0aW9uYWwgdW5pdCBvZiBtZWFzdXJlIGFwcGVuZGVkIChhcyBhIHN0cmluZykuXG4gICAgICogIC0gYGphYCDlvJXmlbDjga7lgKTjgYzmlbDlgKTjga7jgajjgY3jga8gYHB4YCDjgajjgZfjgabmibHjgYQsIOaWh+Wtl+WIl+OBryBDU1Mg44Gu44Or44O844Or44Gr5b6T44GGXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCh2YWx1ZTogbnVtYmVyIHwgc3RyaW5nLCBpbmNsdWRlTWFyZ2luPzogYm9vbGVhbik6IHRoaXM7XG5cbiAgICBwdWJsaWMgb3V0ZXJXaWR0aCguLi5hcmdzOiBhbnlbXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ3dpZHRoJywgaW5jbHVkZU1hcmdpbiwgdmFsdWUpIGFzIChudW1iZXIgfCB0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBjdXJyZW50IGNvbXB1dGVkIG91dGVyIGhlaWdodCAoaW5jbHVkaW5nIHBhZGRpbmcsIGJvcmRlciwgYW5kIG9wdGlvbmFsbHkgbWFyZ2luKSBmb3IgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7lpJbpg6jnuKbluYUoYm9yZGVy44CBcGFkZGluZ+OCkuWQq+OCgCnjgpLlj5blvpcuIOOCquODl+OCt+ODp+ODs+aMh+WumuOBq+OCiOOCiuODnuODvOOCuOODs+mgmOWfn+OCkuWQq+OCgeOBn+OCguOBruOCguWPluW+l+WPr1xuICAgICAqXG4gICAgICogQHBhcmFtIGluY2x1ZGVNYXJnaW5cbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZWxlbWVudCdzIG1hcmdpbiBpbiB0aGUgY2FsY3VsYXRpb24uXG4gICAgICogIC0gYGphYCDjg57jg7zjgrjjg7PpoJjln5/jgpLlkKvjgoHjgovloLTlkIjjga8gdHJ1ZSDjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgb3V0ZXJIZWlnaHQoaW5jbHVkZU1hcmdpbj86IGJvb2xlYW4pOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBDU1Mgb3V0ZXIgaGVpZ2h0IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruWklumDqOe4puW5hShib3JkZXLjgIFwYWRkaW5n44KS5ZCr44KAKeOCkuioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCBBbiBpbnRlZ2VyIHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHBpeGVscywgb3IgYW4gaW50ZWdlciBhbG9uZyB3aXRoIGFuIG9wdGlvbmFsIHVuaXQgb2YgbWVhc3VyZSBhcHBlbmRlZCAoYXMgYSBzdHJpbmcpLlxuICAgICAqICAtIGBqYWAg5byV5pWw44Gu5YCk44GM5pWw5YCk44Gu44Go44GN44GvIGBweGAg44Go44GX44Gm5omx44GELCDmloflrZfliJfjga8gQ1NTIOOBruODq+ODvOODq+OBq+W+k+OBhlxuICAgICAqIEBwYXJhbSBpbmNsdWRlTWFyZ2luXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGUgdGhlIGVsZW1lbnQncyBtYXJnaW4gaW4gdGhlIGNhbGN1bGF0aW9uLlxuICAgICAqICAtIGBqYWAg44Oe44O844K444Oz6aCY5Z+f44KS5ZCr44KB44KL5aC05ZCI44GvIHRydWUg44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG91dGVySGVpZ2h0KHZhbHVlOiBudW1iZXIgfCBzdHJpbmcsIGluY2x1ZGVNYXJnaW4/OiBib29sZWFuKTogdGhpcztcblxuICAgIHB1YmxpYyBvdXRlckhlaWdodCguLi5hcmdzOiBhbnlbXSk6IG51bWJlciB8IHRoaXMge1xuICAgICAgICBjb25zdCB7IGluY2x1ZGVNYXJnaW4sIHZhbHVlIH0gPSBwYXJzZU91dGVyU2l6ZUFyZ3MoLi4uYXJncyk7XG4gICAgICAgIHJldHVybiBtYW5hZ2VPdXRlclNpemVGb3IodGhpcywgJ2hlaWdodCcsIGluY2x1ZGVNYXJnaW4sIHZhbHVlKSBhcyAobnVtYmVyIHwgdGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBvZmZzZXQgcGFyZW50LlxuICAgICAqIEBqYSDmnIDliJ3jga7opoHntKDjga7opqropoHntKDjgYvjgonjga7nm7jlr77nmoTjgarooajnpLrkvY3nva7jgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgcG9zaXRpb24oKTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHtcbiAgICAgICAgLy8gdmFsaWQgZWxlbWVudHNcbiAgICAgICAgaWYgKCFpc1R5cGVIVE1MT3JTVkdFbGVtZW50KHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4geyB0b3A6IDAsIGxlZnQ6IDAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBvZmZzZXQ6IHsgdG9wOiBudW1iZXI7IGxlZnQ6IG51bWJlcjsgfTtcbiAgICAgICAgbGV0IHBhcmVudE9mZnNldCA9IHsgdG9wOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIGNvbnN0IGVsID0gdGhpc1swXTtcbiAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgbWFyZ2luVG9wOiBtdCwgbWFyZ2luTGVmdDogbWwgfSA9ICQoZWwpLmNzcyhbJ3Bvc2l0aW9uJywgJ21hcmdpblRvcCcsICdtYXJnaW5MZWZ0J10pO1xuICAgICAgICBjb25zdCBtYXJnaW5Ub3AgPSB0b051bWJlcihtdCk7XG4gICAgICAgIGNvbnN0IG1hcmdpbkxlZnQgPSB0b051bWJlcihtbCk7XG5cbiAgICAgICAgLy8gcG9zaXRpb246Zml4ZWQgZWxlbWVudHMgYXJlIG9mZnNldCBmcm9tIHRoZSB2aWV3cG9ydCwgd2hpY2ggaXRzZWxmIGFsd2F5cyBoYXMgemVybyBvZmZzZXRcbiAgICAgICAgaWYgKCdmaXhlZCcgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAvLyBBc3N1bWUgcG9zaXRpb246Zml4ZWQgaW1wbGllcyBhdmFpbGFiaWxpdHkgb2YgZ2V0Qm91bmRpbmdDbGllbnRSZWN0XG4gICAgICAgICAgICBvZmZzZXQgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9mZnNldCA9IGdldE9mZnNldFBvc2l0aW9uKGVsKTtcblxuICAgICAgICAgICAgLy8gQWNjb3VudCBmb3IgdGhlICpyZWFsKiBvZmZzZXQgcGFyZW50LCB3aGljaCBjYW4gYmUgdGhlIGRvY3VtZW50IG9yIGl0cyByb290IGVsZW1lbnRcbiAgICAgICAgICAgIC8vIHdoZW4gYSBzdGF0aWNhbGx5IHBvc2l0aW9uZWQgZWxlbWVudCBpcyBpZGVudGlmaWVkXG4gICAgICAgICAgICBjb25zdCBkb2MgPSBlbC5vd25lckRvY3VtZW50IGFzIERvY3VtZW50O1xuICAgICAgICAgICAgbGV0IG9mZnNldFBhcmVudCA9IGdldE9mZnNldFBhcmVudChlbCkgfHwgZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgICAgIGxldCAkb2Zmc2V0UGFyZW50ID0gJChvZmZzZXRQYXJlbnQpO1xuICAgICAgICAgICAgd2hpbGUgKG9mZnNldFBhcmVudCAmJlxuICAgICAgICAgICAgICAgIChvZmZzZXRQYXJlbnQgPT09IGRvYy5ib2R5IHx8IG9mZnNldFBhcmVudCA9PT0gZG9jLmRvY3VtZW50RWxlbWVudCkgJiZcbiAgICAgICAgICAgICAgICAnc3RhdGljJyA9PT0gJG9mZnNldFBhcmVudC5jc3MoJ3Bvc2l0aW9uJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIG9mZnNldFBhcmVudCA9IG9mZnNldFBhcmVudC5wYXJlbnROb2RlIGFzIEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgJG9mZnNldFBhcmVudCA9ICQob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvZmZzZXRQYXJlbnQgJiYgb2Zmc2V0UGFyZW50ICE9PSBlbCAmJiBOb2RlLkVMRU1FTlRfTk9ERSA9PT0gb2Zmc2V0UGFyZW50Lm5vZGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5jb3Jwb3JhdGUgYm9yZGVycyBpbnRvIGl0cyBvZmZzZXQsIHNpbmNlIHRoZXkgYXJlIG91dHNpZGUgaXRzIGNvbnRlbnQgb3JpZ2luXG4gICAgICAgICAgICAgICAgcGFyZW50T2Zmc2V0ID0gZ2V0T2Zmc2V0UG9zaXRpb24ob2Zmc2V0UGFyZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGJvcmRlclRvcFdpZHRoLCBib3JkZXJMZWZ0V2lkdGggfSA9ICRvZmZzZXRQYXJlbnQuY3NzKFsnYm9yZGVyVG9wV2lkdGgnLCAnYm9yZGVyTGVmdFdpZHRoJ10pO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC50b3AgKz0gdG9OdW1iZXIoYm9yZGVyVG9wV2lkdGgpO1xuICAgICAgICAgICAgICAgIHBhcmVudE9mZnNldC5sZWZ0ICs9IHRvTnVtYmVyKGJvcmRlckxlZnRXaWR0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdWJ0cmFjdCBwYXJlbnQgb2Zmc2V0cyBhbmQgZWxlbWVudCBtYXJnaW5zXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3A6IG9mZnNldC50b3AgLSBwYXJlbnRPZmZzZXQudG9wIC0gbWFyZ2luVG9wLFxuICAgICAgICAgICAgbGVmdDogb2Zmc2V0LmxlZnQgLSBwYXJlbnRPZmZzZXQubGVmdCAtIG1hcmdpbkxlZnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgY3VycmVudCBjb29yZGluYXRlcyBvZiB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMsIHJlbGF0aXZlIHRvIHRoZSBkb2N1bWVudC5cbiAgICAgKiBAamEgZG9jdW1lbnQg44KS5Z+65rqW44Go44GX44GmLCDjg57jg4Pjg4HjgZfjgabjgYTjgovopoHntKDpm4blkIjjga4x44Gk55uu44Gu6KaB57Sg44Gu54++5Zyo44Gu5bqn5qiZ44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldCgpOiB7IHRvcDogbnVtYmVyOyBsZWZ0OiBudW1iZXI7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzIG9mIGV2ZXJ5IGVsZW1lbnQgaW4gdGhlIHNldCBvZiBtYXRjaGVkIGVsZW1lbnRzLCByZWxhdGl2ZSB0byB0aGUgZG9jdW1lbnQuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBqyBkb2N1bWVudCDjgpLln7rmupbjgavjgZfjgZ/nj77lnKjluqfmqJnjgpLoqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb29yZGluYXRlc1xuICAgICAqICAtIGBlbmAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHByb3BlcnRpZXMgYHRvcGAgYW5kIGBsZWZ0YC5cbiAgICAgKiAgLSBgamFgIGB0b3BgLCBgbGVmdGAg44OX44Ot44OR44OG44Kj44KS5ZCr44KA44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlczogeyB0b3A/OiBudW1iZXI7IGxlZnQ/OiBudW1iZXI7IH0pOiB0aGlzO1xuXG4gICAgcHVibGljIG9mZnNldChjb29yZGluYXRlcz86IHsgdG9wPzogbnVtYmVyOyBsZWZ0PzogbnVtYmVyOyB9KTogeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB9IHwgdGhpcyB7XG4gICAgICAgIC8vIHZhbGlkIGVsZW1lbnRzXG4gICAgICAgIGlmICghaXNUeXBlSFRNTE9yU1ZHRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGwgPT0gY29vcmRpbmF0ZXMgPyB7IHRvcDogMCwgbGVmdDogMCB9IDogdGhpcztcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGNvb3JkaW5hdGVzKSB7XG4gICAgICAgICAgICAvLyBnZXRcbiAgICAgICAgICAgIHJldHVybiBnZXRPZmZzZXRQb3NpdGlvbih0aGlzWzBdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldFxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvcHM6IHsgdG9wPzogc3RyaW5nOyBsZWZ0Pzogc3RyaW5nOyB9ID0ge307XG4gICAgICAgICAgICAgICAgY29uc3QgeyBwb3NpdGlvbiwgdG9wOiBjc3NUb3AsIGxlZnQ6IGNzc0xlZnQgfSA9ICRlbC5jc3MoWydwb3NpdGlvbicsICd0b3AnLCAnbGVmdCddKTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBwb3NpdGlvbiBmaXJzdCwgaW4tY2FzZSB0b3AvbGVmdCBhcmUgc2V0IGV2ZW4gb24gc3RhdGljIGVsZW1cbiAgICAgICAgICAgICAgICBpZiAoJ3N0YXRpYycgPT09IHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGN1ck9mZnNldCA9ICRlbC5vZmZzZXQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJQb3NpdGlvbiA9ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5lZWRDYWxjdWxhdGVQb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgPSAoJ2Fic29sdXRlJyA9PT0gcG9zaXRpb24gfHwgJ2ZpeGVkJyA9PT0gcG9zaXRpb24pICYmIChjc3NUb3AgKyBjc3NMZWZ0KS5pbmNsdWRlcygnYXV0bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmVlZENhbGN1bGF0ZVBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGVsLnBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0b3A6IHRvTnVtYmVyKGNzc1RvcCksIGxlZnQ6IHRvTnVtYmVyKGNzc0xlZnQpIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gY29vcmRpbmF0ZXMudG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BzLnRvcCA9IGAkeyhjb29yZGluYXRlcy50b3AgLSBjdXJPZmZzZXQudG9wKSArIGN1clBvc2l0aW9uLnRvcH1weGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGNvb3JkaW5hdGVzLmxlZnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcHMubGVmdCA9IGAkeyhjb29yZGluYXRlcy5sZWZ0IC0gY3VyT2Zmc2V0LmxlZnQpICsgY3VyUG9zaXRpb24ubGVmdH1weGA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJGVsLmNzcyhwcm9wcyBhcyBQbGFpbk9iamVjdDxzdHJpbmc+KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01TdHlsZXMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgbm8taW52YWxpZC10aGlzXG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDdXN0b21FdmVudCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQgeyBET01JdGVyYWJsZSwgaXNUeXBlRWxlbWVudCB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBET01FdmVudExpc3RuZXIgZXh0ZW5kcyBFdmVudExpc3RlbmVyIHtcbiAgICBvcmlnaW4/OiBFdmVudExpc3RlbmVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRXZlbnRMaXN0ZW5lckhhbmRsZXIge1xuICAgIGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7XG4gICAgcHJveHk6IEV2ZW50TGlzdGVuZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBCaW5kSW5mbyB7XG4gICAgcmVnaXN0ZXJlZDogU2V0PEV2ZW50TGlzdGVuZXI+O1xuICAgIGhhbmRsZXJzOiBFdmVudExpc3RlbmVySGFuZGxlcltdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgQmluZEV2ZW50Q29udGV4dCB7XG4gICAgW2Nvb2tpZTogc3RyaW5nXTogQmluZEluZm87XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIENPT0tJRV9TRVBBUkFUT1IgPSAnfCcsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfZXZlbnRDb250ZXh0TWFwID0ge1xuICAgIGV2ZW50RGF0YTogbmV3IFdlYWtNYXA8RWxlbWVudEJhc2UsIGFueVtdPigpLFxuICAgIGV2ZW50TGlzdGVuZXJzOiBuZXcgV2Vha01hcDxFbGVtZW50QmFzZSwgQmluZEV2ZW50Q29udGV4dD4oKSxcbiAgICBsaXZlRXZlbnRMaXN0ZW5lcnM6IG5ldyBXZWFrTWFwPEVsZW1lbnRCYXNlLCBCaW5kRXZlbnRDb250ZXh0PigpLFxufTtcblxuLyoqIEBpbnRlcm5hbCBxdWVyeSBldmVudC1kYXRhIGZyb20gZWxlbWVudCAqL1xuZnVuY3Rpb24gcXVlcnlFdmVudERhdGEoZXZlbnQ6IEV2ZW50KTogYW55W10ge1xuICAgIGNvbnN0IGRhdGEgPSBfZXZlbnRDb250ZXh0TWFwLmV2ZW50RGF0YS5nZXQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpIHx8IFtdO1xuICAgIGRhdGEudW5zaGlmdChldmVudCk7XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVnaXN0ZXIgZXZlbnQtZGF0YSB3aXRoIGVsZW1lbnQgKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudERhdGE6IGFueVtdKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuc2V0KGVsZW0sIGV2ZW50RGF0YSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgZGVsZXRlIGV2ZW50LWRhdGEgYnkgZWxlbWVudCAqL1xuZnVuY3Rpb24gZGVsZXRlRXZlbnREYXRhKGVsZW06IEVsZW1lbnRCYXNlKTogdm9pZCB7XG4gICAgX2V2ZW50Q29udGV4dE1hcC5ldmVudERhdGEuZGVsZXRlKGVsZW0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgZXZlbnQgY29va2llIGZyb20gZXZlbnQgbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMgKi9cbmZ1bmN0aW9uIHRvQ29va2llKGV2ZW50OiBzdHJpbmcsIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogc3RyaW5nIHtcbiAgICBkZWxldGUgb3B0aW9ucy5vbmNlO1xuICAgIHJldHVybiBgJHtldmVudH0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtKU09OLnN0cmluZ2lmeShvcHRpb25zKX0ke0NvbnN0LkNPT0tJRV9TRVBBUkFUT1J9JHtzZWxlY3Rvcn1gO1xufVxuXG4vKiogQGludGVybmFsIGdldCBsaXN0ZW5lciBoYW5kbGVycyBjb250ZXh0IGJ5IGVsZW1lbnQgYW5kIGV2ZW50ICovXG5mdW5jdGlvbiBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCBldmVudDogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBBZGRFdmVudExpc3RlbmVyT3B0aW9ucywgZW5zdXJlOiBib29sZWFuKTogQmluZEluZm8ge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXJzID0gc2VsZWN0b3IgPyBfZXZlbnRDb250ZXh0TWFwLmxpdmVFdmVudExpc3RlbmVycyA6IF9ldmVudENvbnRleHRNYXAuZXZlbnRMaXN0ZW5lcnM7XG4gICAgaWYgKCFldmVudExpc3RlbmVycy5oYXMoZWxlbSkpIHtcbiAgICAgICAgaWYgKGVuc3VyZSkge1xuICAgICAgICAgICAgZXZlbnRMaXN0ZW5lcnMuc2V0KGVsZW0sIHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZDogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgaGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBldmVudExpc3RlbmVycy5nZXQoZWxlbSkgYXMgQmluZEV2ZW50Q29udGV4dDtcbiAgICBjb25zdCBjb29raWUgPSB0b0Nvb2tpZShldmVudCwgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmICghY29udGV4dFtjb29raWVdKSB7XG4gICAgICAgIGNvbnRleHRbY29va2llXSA9IHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQ6IG5ldyBTZXQ8RXZlbnRMaXN0ZW5lcj4oKSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dFtjb29raWVdO1xufVxuXG4vKiogQGludGVybmFsIHJlZ2lzdGVyIGxpc3RlbmVyIGhhbmRsZXJzIGNvbnRleHQgZnJvbSBlbGVtZW50IGFuZCBldmVudCAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoXG4gICAgZWxlbTogRWxlbWVudEJhc2UsXG4gICAgZXZlbnRzOiBzdHJpbmdbXSxcbiAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyLFxuICAgIHByb3h5OiBFdmVudExpc3RlbmVyLFxuICAgIG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cykge1xuICAgICAgICBjb25zdCB7IHJlZ2lzdGVyZWQsIGhhbmRsZXJzIH0gPSBnZXRFdmVudExpc3RlbmVyc0hhbmRsZXJzKGVsZW0sIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgdHJ1ZSk7XG4gICAgICAgIGlmIChyZWdpc3RlcmVkICYmICFyZWdpc3RlcmVkLmhhcyhsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHJlZ2lzdGVyZWQuYWRkKGxpc3RlbmVyKTtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgIHByb3h5LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgJiYgZWxlbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgYWxsIGV2ZW50IGFuZCBoYW5kbGVyIGJ5IGVsZW1lbnQsIGZvciBhbGwgYG9mZigpYCBhbmQgYGNsb25lKHRydWUpYCAqL1xuZnVuY3Rpb24gZXh0cmFjdEFsbEhhbmRsZXJzKGVsZW06IEVsZW1lbnRCYXNlLCByZW1vdmUgPSB0cnVlKTogeyBldmVudDogc3RyaW5nOyBoYW5kbGVyOiBFdmVudExpc3RlbmVyOyBvcHRpb25zOiBhbnk7IH1bXSB7XG4gICAgY29uc3QgaGFuZGxlcnM6IHsgZXZlbnQ6IHN0cmluZzsgaGFuZGxlcjogRXZlbnRMaXN0ZW5lcjsgb3B0aW9uczogYW55OyB9W10gPSBbXTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gKGNvbnRleHQ6IEJpbmRFdmVudENvbnRleHQgfCB1bmRlZmluZWQpOiBib29sZWFuID0+IHtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY29va2llIG9mIE9iamVjdC5rZXlzKGNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlZCA9IGNvb2tpZS5zcGxpdChDb25zdC5DT09LSUVfU0VQQVJBVE9SKTtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IHNlZWRbMF07XG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VlZFsxXSk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGNvbnRleHRbY29va2llXS5oYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5wdXNoKHsgZXZlbnQsIGhhbmRsZXI6IGhhbmRsZXIucHJveHksIG9wdGlvbnMgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgeyBldmVudExpc3RlbmVycywgbGl2ZUV2ZW50TGlzdGVuZXJzIH0gPSBfZXZlbnRDb250ZXh0TWFwO1xuICAgIHF1ZXJ5KGV2ZW50TGlzdGVuZXJzLmdldChlbGVtKSkgJiYgcmVtb3ZlICYmIGV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcbiAgICBxdWVyeShsaXZlRXZlbnRMaXN0ZW5lcnMuZ2V0KGVsZW0pKSAmJiByZW1vdmUgJiYgbGl2ZUV2ZW50TGlzdGVuZXJzLmRlbGV0ZShlbGVtKTtcblxuICAgIHJldHVybiBoYW5kbGVycztcbn1cblxuLyoqIEBpbnRlcm5hbCBwYXJzZSBldmVudCBhcmdzICovXG5mdW5jdGlvbiBwYXJzZUV2ZW50QXJncyguLi5hcmdzOiBhbnlbXSk6IHsgdHlwZTogc3RyaW5nW107IHNlbGVjdG9yOiBzdHJpbmc7IGxpc3RlbmVyOiBET01FdmVudExpc3RuZXI7IG9wdGlvbnM6IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zOyB9IHtcbiAgICBsZXQgW3R5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChpc0Z1bmN0aW9uKHNlbGVjdG9yKSkge1xuICAgICAgICBbdHlwZSwgbGlzdGVuZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICAgICAgc2VsZWN0b3IgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdHlwZSA9ICF0eXBlID8gW10gOiAoaXNBcnJheSh0eXBlKSA/IHR5cGUgOiBbdHlwZV0pO1xuICAgIHNlbGVjdG9yID0gc2VsZWN0b3IgfHwgJyc7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHRydWUgPT09IG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHsgY2FwdHVyZTogdHJ1ZSB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9O1xufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbm9UcmlnZ2VyID0gWydyZXNpemUnLCAnc2Nyb2xsJ107XG5cbi8qKiBAaW50ZXJuYWwgZXZlbnQtc2hvcnRjdXQgaW1wbCAqL1xuZnVuY3Rpb24gZXZlbnRTaG9ydGN1dDxUIGV4dGVuZHMgRWxlbWVudEJhc2U+KHRoaXM6IERPTUV2ZW50czxUPiwgbmFtZTogc3RyaW5nLCBoYW5kbGVyPzogRXZlbnRMaXN0ZW5lciwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IERPTUV2ZW50czxUPiB7XG4gICAgaWYgKG51bGwgPT0gaGFuZGxlcikge1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGlmICghX25vVHJpZ2dlci5pbmNsdWRlcyhuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGVsW25hbWVdKSkge1xuICAgICAgICAgICAgICAgICAgICBlbFtuYW1lXSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwgYXMgYW55KS50cmlnZ2VyKG5hbWUgYXMgYW55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub24obmFtZSBhcyBhbnksIGhhbmRsZXIgYXMgYW55LCBvcHRpb25zKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyIGZvciBgY2xvbmUoKWAgKi9cbmZ1bmN0aW9uIGNsb25lRXZlbnQoc3JjOiBFbGVtZW50LCBkc3Q6IEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhzcmMsIGZhbHNlKTtcbiAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgY29udGV4dHMpIHtcbiAgICAgICAgZHN0LmFkZEV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgZm9yIGBjbG9uZSgpYCAqL1xuZnVuY3Rpb24gY2xvbmVFbGVtZW50KGVsZW06IEVsZW1lbnQsIHdpdGhFdmVudHM6IGJvb2xlYW4sIGRlZXA6IGJvb2xlYW4pOiBFbGVtZW50IHtcbiAgICBjb25zdCBjbG9uZSA9IGVsZW0uY2xvbmVOb2RlKHRydWUpIGFzIEVsZW1lbnQ7XG5cbiAgICBpZiAod2l0aEV2ZW50cykge1xuICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgY29uc3Qgc3JjRWxlbWVudHMgPSBlbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGNvbnN0IGRzdEVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaW5kZXhdIG9mIHNyY0VsZW1lbnRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGNsb25lRXZlbnQoc3JjRWxlbWVudHNbaW5kZXhdLCBkc3RFbGVtZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2xvbmVFdmVudChlbGVtLCBjbG9uZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xvbmU7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5leHBvcnQgdHlwZSBET01FdmVudE1hcDxUPlxuICAgID0gVCBleHRlbmRzIFdpbmRvdyA/IFdpbmRvd0V2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgRG9jdW1lbnQgPyBEb2N1bWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTEJvZHlFbGVtZW50ID8gSFRNTEJvZHlFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MRnJhbWVTZXRFbGVtZW50ID8gSFRNTEZyYW1lU2V0RWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTE1hcnF1ZWVFbGVtZW50ID8gSFRNTE1hcnF1ZWVFbGVtZW50RXZlbnRNYXBcbiAgICA6IFQgZXh0ZW5kcyBIVE1MVmlkZW9FbGVtZW50ID8gSFRNTFZpZGVvRWxlbWVudEV2ZW50TWFwXG4gICAgOiBUIGV4dGVuZHMgSFRNTE1lZGlhRWxlbWVudCA/IEhUTUxNZWRpYUVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEhUTUxFbGVtZW50ID8gSFRNTEVsZW1lbnRFdmVudE1hcFxuICAgIDogVCBleHRlbmRzIEVsZW1lbnQgPyBFbGVtZW50RXZlbnRNYXBcbiAgICA6IEdsb2JhbEV2ZW50SGFuZGxlcnNFdmVudE1hcDtcbi8qIGVzbGludC1lbmFibGUgQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCAqL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgZXZlbnQgbWFuYWdlbWVudHMuXG4gKiBAamEg44Kk44OZ44Oz44OI566h55CG44KS6ZuG57SE44GX44GfIE1peGluIEJhc2Ug44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBET01FdmVudHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgYmFzaWNcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwgMeOBpOOBvuOBn+OBr+ikh+aVsOOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuioreWumiAo5YuV55qE6KaB57Sg44Gr44KC5pyJ5Yq5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHR5cGVcbiAgICAgKiAgLSBgZW5gIGV2ZW50IG5hbWUgb3IgZXZlbnQgbmFtZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIl1xuICAgICAqIEBwYXJhbSBzZWxlY3RvclxuICAgICAqICAtIGBlbmAgQSBzZWxlY3RvciBzdHJpbmcgdG8gZmlsdGVyIHRoZSBkZXNjZW5kYW50cyBvZiB0aGUgc2VsZWN0ZWQgZWxlbWVudHMgdGhhdCB0cmlnZ2VyIHRoZSBldmVudC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOeZuuihjOWFg+OCkuODleOCo+ODq+OCv+ODquODs+OCsOOBmeOCi+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBvbjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBzZWxlY3Rvcjogc3RyaW5nLFxuICAgICAgICBsaXN0ZW5lcjogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBldmVudCBoYW5kbGVyIGZ1bmN0aW9uIHRvIG9uZSBvciBtb3JlIGV2ZW50cyB0byB0aGUgZWxlbWVudHMuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCAx44Gk44G+44Gf44Gv6KSH5pWw44Gu44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIGxpc3RlbmVyOiAoZXZlbnQ6IFRFdmVudE1hcFtrZXlvZiBURXZlbnRNYXBdLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCxcbiAgICAgICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9uc1xuICAgICk6IHRoaXM7XG5cbiAgICBwdWJsaWMgb248VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PiguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVMaXZlRXZlbnQoZTogRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50RGF0YSA9IHF1ZXJ5RXZlbnREYXRhKGUpO1xuICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZS50YXJnZXQgYXMgRWxlbWVudCB8IG51bGwpIGFzIERPTTxFbGVtZW50PjtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KCR0YXJnZXRbMF0sIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFyZW50IG9mICR0YXJnZXQucGFyZW50cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkKHBhcmVudCkuaXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5hcHBseShwYXJlbnQsIGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVFdmVudCh0aGlzOiBET01FdmVudHM8VEVsZW1lbnQ+LCBlOiBFdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgcXVlcnlFdmVudERhdGEoZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJveHkgPSBzZWxlY3RvciA/IGhhbmRsZUxpdmVFdmVudCA6IGhhbmRsZUV2ZW50O1xuXG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgcmVnaXN0ZXJFdmVudExpc3RlbmVySGFuZGxlcnMoZWwsIGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBwcm94eSwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuIFRoZSBoYW5kbGVyIGRlc2lnbmF0ZWQgYXQgW1tvbl1dIG9yIFtbb25jZV1dIGFuZCB0aGF0IHNhbWUgY29uZGl0aW9uIGFyZSByZWxlYXNlZC4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgbWV0aG9kIHJlY2VpdmVzIG5vIGFyZ3VtZW50cywgYWxsIGhhbmRsZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gu6Kej6ZmkLiBbW29uXV0g44G+44Gf44GvIFtbb25jZV1dIOOBqOWQjOadoeS7tuOBp+aMh+WumuOBl+OBn+OCguOBruOBjOino+mZpOOBleOCjOOCiyA8YnI+XG4gICAgICogICAgIOW8leaVsOOBjOeEoeOBhOWgtOWQiOOBr+OBmeOBueOBpuOBruODj+ODs+ODieODqeOBjOino+mZpOOBleOCjOOCiy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3JcbiAgICAgKiAgLSBgZW5gIEEgc2VsZWN0b3Igc3RyaW5nIHRvIGZpbHRlciB0aGUgZGVzY2VuZGFudHMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnRzIHRoYXQgdHJpZ2dlciB0aGUgZXZlbnQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jnmbrooYzlhYPjgpLjg5XjgqPjg6vjgr/jg6rjg7PjgrDjgZnjgovjgrvjg6zjgq/jgr/mloflrZfliJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb2ZmPFRFdmVudE1hcCBleHRlbmRzIERPTUV2ZW50TWFwPFRFbGVtZW50Pj4oXG4gICAgICAgIHR5cGU6IGtleW9mIFRFdmVudE1hcCB8IChrZXlvZiBURXZlbnRNYXApW10sXG4gICAgICAgIHNlbGVjdG9yOiBzdHJpbmcsXG4gICAgICAgIGxpc3RlbmVyPzogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBldmVudCBoYW5kbGVyLiBUaGUgaGFuZGxlciBkZXNpZ25hdGVkIGF0IFtbb25dXSBvciBbW29uY2VdXSBhbmQgdGhhdCBzYW1lIGNvbmRpdGlvbiBhcmUgcmVsZWFzZWQuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG1ldGhvZCByZWNlaXZlcyBubyBhcmd1bWVudHMsIGFsbCBoYW5kbGVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpC4gW1tvbl1dIOOBvuOBn+OBryBbW29uY2VdXSDjgajlkIzmnaHku7bjgafmjIflrprjgZfjgZ/jgoLjga7jgYzop6PpmaTjgZXjgozjgosgPGJyPlxuICAgICAqICAgICDlvJXmlbDjgYznhKHjgYTloLTlkIjjga/jgZnjgbnjgabjga7jg4/jg7Pjg4njg6njgYzop6PpmaTjgZXjgozjgosuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9mZjxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBsaXN0ZW5lcj86IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXIuXG4gICAgICogQGphIOioreWumuOBleOCjOOBpuOBhOOCi+OBmeOBueOBpuOBruOCpOODmeODs+ODiOODj+ODs+ODieODqeOBruino+mZpFxuICAgICAqL1xuICAgIHB1YmxpYyBvZmYoKTogdGhpcztcblxuICAgIHB1YmxpYyBvZmY8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PiguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGU6IGV2ZW50cywgc2VsZWN0b3IsIGxpc3RlbmVyLCBvcHRpb25zIH0gPSBwYXJzZUV2ZW50QXJncyguLi5hcmdzKTtcblxuICAgICAgICBpZiAoZXZlbnRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0cyA9IGV4dHJhY3RBbGxIYW5kbGVycyhlbCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIGNvbnRleHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoY29udGV4dC5ldmVudCwgY29udGV4dC5oYW5kbGVyLCBjb250ZXh0Lm9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnaXN0ZXJlZCwgaGFuZGxlcnMgfSA9IGdldEV2ZW50TGlzdGVuZXJzSGFuZGxlcnMoZWwsIGV2ZW50LCBzZWxlY3Rvciwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8IGhhbmRsZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IGhhbmRsZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7IC8vIGJhY2t3YXJkIG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBoYW5kbGVyc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChsaXN0ZW5lciAmJiBoYW5kbGVyLmxpc3RlbmVyID09PSBsaXN0ZW5lcikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGxpc3RlbmVyICYmIGhhbmRsZXIubGlzdGVuZXIgJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gJiYgaGFuZGxlci5saXN0ZW5lci5vcmlnaW4gPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoIWxpc3RlbmVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLnByb3h5LCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkLmRlbGV0ZShoYW5kbGVyLmxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb24gdG8gb25lIG9yIG1vcmUgZXZlbnRzIHRvIHRoZSBlbGVtZW50cyB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlLiAobGl2ZSBldmVudCBhdmFpbGFibGUpXG4gICAgICogQGphIOimgee0oOOBq+WvvuOBl+OBpiwg5LiA5bqm44Gg44GR5ZG844Gz5Ye644GV44KM44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS6Kit5a6aICjli5XnmoTopoHntKDjgavlr77jgZfjgabjgoLmnInlirkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI5ZCN44G+44Gf44Gv44Kk44OZ44Oz44OI5ZCN6YWN5YiXXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBBIHNlbGVjdG9yIHN0cmluZyB0byBmaWx0ZXIgdGhlIGRlc2NlbmRhbnRzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50cyB0aGF0IHRyaWdnZXIgdGhlIGV2ZW50LlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI55m66KGM5YWD44KS44OV44Kj44Or44K/44Oq44Oz44Kw44GZ44KL44K744Os44Kv44K/5paH5a2X5YiXXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgdHlwZToga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSxcbiAgICAgICAgc2VsZWN0b3I6IHN0cmluZyxcbiAgICAgICAgbGlzdGVuZXI6IChldmVudDogVEV2ZW50TWFwW2tleW9mIFRFdmVudE1hcF0sIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLFxuICAgICAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zXG4gICAgKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgZXZlbnQgaGFuZGxlciBmdW5jdGlvbiB0byBvbmUgb3IgbW9yZSBldmVudHMgdG8gdGhlIGVsZW1lbnRzIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UuIChsaXZlIGV2ZW50IGF2YWlsYWJsZSlcbiAgICAgKiBAamEg6KaB57Sg44Gr5a++44GX44GmLCDkuIDluqbjgaDjgZHlkbzjgbPlh7rjgZXjgozjgovjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLoqK3lrpogKOWLleeahOimgee0oOOBq+WvvuOBl+OBpuOCguacieWKuSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0eXBlXG4gICAgICogIC0gYGVuYCBldmVudCBuYW1lIG9yIGV2ZW50IG5hbWUgYXJyYXkuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jlkI3jgb7jgZ/jga/jgqTjg5njg7Pjg4jlkI3phY3liJdcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgb25jZTxURXZlbnRNYXAgZXh0ZW5kcyBET01FdmVudE1hcDxURWxlbWVudD4+KFxuICAgICAgICB0eXBlOiBrZXlvZiBURXZlbnRNYXAgfCAoa2V5b2YgVEV2ZW50TWFwKVtdLFxuICAgICAgICBsaXN0ZW5lcjogKGV2ZW50OiBURXZlbnRNYXBba2V5b2YgVEV2ZW50TWFwXSwgLi4uYXJnczogYW55W10pID0+IHZvaWQsXG4gICAgICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIG9uY2U8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PiguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IHR5cGUsIHNlbGVjdG9yLCBsaXN0ZW5lciwgb3B0aW9ucyB9ID0gcGFyc2VFdmVudEFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSB7IC4uLm9wdGlvbnMsIC4uLnsgb25jZTogdHJ1ZSB9IH07XG5cbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIGZ1bmN0aW9uIG9uY2VIYW5kbGVyKHRoaXM6IERPTUV2ZW50czxURWxlbWVudD4sIC4uLmV2ZW50QXJnczogYW55W10pOiB2b2lkIHtcbiAgICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGV2ZW50QXJncyk7XG4gICAgICAgICAgICBzZWxmLm9mZih0eXBlIGFzIGFueSwgc2VsZWN0b3IsIG9uY2VIYW5kbGVyLCBvcHRzKTtcbiAgICAgICAgICAgIGRlbGV0ZSBvbmNlSGFuZGxlci5vcmlnaW47XG4gICAgICAgIH1cbiAgICAgICAgb25jZUhhbmRsZXIub3JpZ2luID0gbGlzdGVuZXI7XG4gICAgICAgIHJldHVybiB0aGlzLm9uKHR5cGUgYXMgYW55LCBzZWxlY3Rvciwgb25jZUhhbmRsZXIsIG9wdHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGFsbCBoYW5kbGVycyBhZGRlZCB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBAamEg6Kit5a6a44GV44KM44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44Gr5a++44GX44Gm44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZXZlbnQgbmFtZSBvciBldmVudCBuYW1lIGFycmF5LiAvIGBFdmVudGAgaW5zdGFuY2Ugb3IgYEV2ZW50YCBpbnN0YW5jZSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOWQjeOBvuOBn+OBr+OCpOODmeODs+ODiOWQjemFjeWIlyAvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K544G+44Gf44GvIGBFdmVudGAg44Kk44Oz44K544K/44Oz44K56YWN5YiXXG4gICAgICogQHBhcmFtIGV2ZW50RGF0YVxuICAgICAqICAtIGBlbmAgb3B0aW9uYWwgc2VuZGluZyBkYXRhLlxuICAgICAqICAtIGBqYWAg6YCB5L+h44GZ44KL5Lu75oSP44Gu44OH44O844K/XG4gICAgICovXG4gICAgcHVibGljIHRyaWdnZXI8VEV2ZW50TWFwIGV4dGVuZHMgRE9NRXZlbnRNYXA8VEVsZW1lbnQ+PihcbiAgICAgICAgc2VlZDoga2V5b2YgVEV2ZW50TWFwIHwgKGtleW9mIFRFdmVudE1hcClbXSB8IEV2ZW50IHwgRXZlbnRbXSB8IChrZXlvZiBURXZlbnRNYXAgfCBFdmVudClbXSxcbiAgICAgICAgLi4uZXZlbnREYXRhOiBhbnlbXVxuICAgICk6IHRoaXMge1xuICAgICAgICBjb25zdCBjb252ZXJ0ID0gKGFyZzoga2V5b2YgVEV2ZW50TWFwIHwgRXZlbnQpOiBFdmVudCA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoYXJnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ3VzdG9tRXZlbnQoYXJnLCB7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogZXZlbnREYXRhLFxuICAgICAgICAgICAgICAgICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnIGFzIEV2ZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IGlzQXJyYXkoc2VlZCkgPyBzZWVkIDogW3NlZWRdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBlID0gY29udmVydChldmVudCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlckV2ZW50RGF0YShlbCwgZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUV2ZW50RGF0YShlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFdmVudHMgdXRpbGl0eVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciBbW29uY2VdXSgndHJhbnNpdGlvbmVuZCcpLlxuICAgICAqIEBqYSBbW29uY2VdXSgndHJhbnNpdGlvbmVuZCcpIOOBruODpuODvOODhuOCo+ODquODhuOCo1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBgdHJhbnNpdGlvbmVuZGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGB0cmFuc2l0aW9uZW5kYCDjg4/jg7Pjg4njg6lcbiAgICAgKiBAcGFyYW0gcGVybWFuZW50XG4gICAgICogIC0gYGVuYCBpZiBzZXQgYHRydWVgLCBjYWxsYmFjayBrZWVwIGxpdmluZyB1bnRpbCBlbGVtZW50cyByZW1vdmVkLlxuICAgICAqICAtIGBqYWAgYHRydWVgIOOCkuioreWumuOBl+OBn+WgtOWQiCwg6KaB57Sg44GM5YmK6Zmk44GV44KM44KL44G+44Gn44Kz44O844Or44OQ44OD44Kv44GM5pyJ5Yq5XG4gICAgICovXG4gICAgcHVibGljIHRyYW5zaXRpb25FbmQoY2FsbGJhY2s6IChldmVudDogVHJhbnNpdGlvbkV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxIVE1MRWxlbWVudD47XG4gICAgICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBUcmFuc2l0aW9uRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgZSk7XG4gICAgICAgICAgICBpZiAoIXBlcm1hbmVudCkge1xuICAgICAgICAgICAgICAgIHNlbGYub2ZmKCd0cmFuc2l0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpc0Z1bmN0aW9uKGNhbGxiYWNrKSAmJiBzZWxmLm9uKCd0cmFuc2l0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNob3J0Y3V0IGZvciBbW29uY2VdXSgnYW5pbWF0aW9uZW5kJykuXG4gICAgICogQGphIFtbb25jZV1dKCdhbmltYXRpb25lbmQnKSDjga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgYGFuaW1hdGlvbmVuZGAgaGFuZGxlci5cbiAgICAgKiAgLSBgamFgIGBhbmltYXRpb25lbmRgIOODj+ODs+ODieODqVxuICAgICAqIEBwYXJhbSBwZXJtYW5lbnRcbiAgICAgKiAgLSBgZW5gIGlmIHNldCBgdHJ1ZWAsIGNhbGxiYWNrIGtlZXAgbGl2aW5nIHVudGlsIGVsZW1lbnRzIHJlbW92ZWQuXG4gICAgICogIC0gYGphYCBgdHJ1ZWAg44KS6Kit5a6a44GX44Gf5aC05ZCILCDopoHntKDjgYzliYrpmaTjgZXjgozjgovjgb7jgafjgrPjg7zjg6vjg5Djg4Pjgq/jgYzmnInlirlcbiAgICAgKi9cbiAgICBwdWJsaWMgYW5pbWF0aW9uRW5kKGNhbGxiYWNrOiAoZXZlbnQ6IEFuaW1hdGlvbkV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgcGVybWFuZW50ID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXMgYXMgRE9NRXZlbnRzPE5vZGU+IGFzIERPTUV2ZW50czxIVE1MRWxlbWVudD47XG4gICAgICAgIGZ1bmN0aW9uIGZpcmVDYWxsQmFjayh0aGlzOiBFbGVtZW50LCBlOiBBbmltYXRpb25FdmVudCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlKTtcbiAgICAgICAgICAgIGlmICghcGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vZmYoJ2FuaW1hdGlvbmVuZCcsIGZpcmVDYWxsQmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgc2VsZi5vbignYW5pbWF0aW9uZW5kJywgZmlyZUNhbGxCYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEJpbmQgb25lIG9yIHR3byBoYW5kbGVycyB0byB0aGUgbWF0Y2hlZCBlbGVtZW50cywgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIGFuZCBgbW91c2VsZWF2ZWAgdGhlIGVsZW1lbnRzLlxuICAgICAqIEBqYSAx44Gk44G+44Gf44GvMuOBpOOBruODj+ODs+ODieODqeOCkuaMh+WumuOBlywg5LiA6Ie044GX44Gf6KaB57Sg44GuIGBtb3VzZWVudGVyYCwgYG1vdXNlbGVhdmVgIOOCkuaknOefpVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJJbihPdXQpXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlZW50ZXJgIHRoZSBlbGVtZW50LiA8YnI+XG4gICAgICogICAgICAgIElmIGhhbmRsZXIgc2V0IG9ubHkgb25lLCBhIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LCB0b28uXG4gICAgICogIC0gYGphYCBgbW91c2VlbnRlcmAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiA8YnI+XG4gICAgICogICAgICAgICAg5byV5pWw44GMMeOBpOOBp+OBguOCi+WgtOWQiCwgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCguWFvOOBreOCi1xuICAgICAqIEBwYXJhbSBoYW5kbGVyT3V0XG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgYG1vdXNlbGVhdmVgIHRoZSBlbGVtZW50LlxuICAgICAqICAtIGBqYWAgYG1vdXNlbGVhdmVgIOODj+ODs+ODieODqeOCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBob3ZlcihoYW5kbGVySW46IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBoYW5kbGVyT3V0PzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQpOiB0aGlzIHtcbiAgICAgICAgaGFuZGxlck91dCA9IGhhbmRsZXJPdXQgfHwgaGFuZGxlckluO1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZWVudGVyKGhhbmRsZXJJbikubW91c2VsZWF2ZShoYW5kbGVyT3V0KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWM6IEV2ZW50cyBzaG9ydGN1dFxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2NsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBkYmxjbGlja2AgZXZlbnQuXG4gICAgICogQGphIGBkYmxjbGlja2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZGJsY2xpY2soaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2RibGNsaWNrJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBibHVyYCBldmVudC5cbiAgICAgKiBAamEgYGJsdXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGJsdXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2JsdXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzYCBldmVudC5cbiAgICAgKiBAamEgYGZvY3VzYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmb2N1cyhoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXMnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYGZvY3VzaW5gIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNpbmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZm9jdXNpbihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnZm9jdXNpbicsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgZm9jdXNvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgZm9jdXNvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZvY3Vzb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdmb2N1c291dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5dXBgIGV2ZW50LlxuICAgICAqIEBqYSBga2V5dXBgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGtleXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXl1cCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBga2V5ZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBrZXlkb3duYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBrZXlkb3duKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdrZXlkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBrZXlwcmVzc2AgZXZlbnQuXG4gICAgICogQGphIGBrZXlwcmVzc2Ag44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMga2V5cHJlc3MoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ2tleXByZXNzJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzdWJtaXRgIGV2ZW50LlxuICAgICAqIEBqYSBgc3VibWl0YCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdWJtaXQoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3N1Ym1pdCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY29udGV4dG1lbnVgIGV2ZW50LlxuICAgICAqIEBqYSBgY29udGV4dG1lbnVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNvbnRleHRtZW51KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjb250ZXh0bWVudScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgY2hhbmdlYCBldmVudC5cbiAgICAgKiBAamEgYGNoYW5nZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY2hhbmdlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdjaGFuZ2UnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlZG93bmAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZWRvd25gIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZG93bihoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2Vkb3duJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZW1vdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2Vtb3ZlYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZW1vdmUoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlbW92ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2V1cGAgZXZlbnQuXG4gICAgICogQGphIGBtb3VzZXVwYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBtb3VzZXVwKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZXVwJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBtb3VzZWVudGVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlZW50ZXJgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlZW50ZXIoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ21vdXNlZW50ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYG1vdXNlbGVhdmVgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VsZWF2ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VsZWF2ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgnbW91c2VsZWF2ZScsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdXRgIGV2ZW50LlxuICAgICAqIEBqYSBgbW91c2VvdXRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIG1vdXNlb3V0KGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW91dCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgbW91c2VvdmVyYCBldmVudC5cbiAgICAgKiBAamEgYG1vdXNlb3ZlcmAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgbW91c2VvdmVyKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCdtb3VzZW92ZXInLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoc3RhcnRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hzdGFydGAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2hzdGFydChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hzdGFydCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2hlbmRgIGV2ZW50LlxuICAgICAqIEBqYSBgdG91Y2hlbmRgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHRvdWNoZW5kKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaGVuZCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUcmlnZ2VyIG9yIGhhbmRsZSBgdG91Y2htb3ZlYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNobW92ZWAg44Kk44OZ44Oz44OI44Gu55m66KGM44G+44Gf44Gv5o2V5o2JXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGFuZGxlclxuICAgICAqICAtIGBlbmAgZXZlbnQgaGFuZGxlciBpcyBkZXNpZ25hdGVkLiB3aGVuIG9taXR0aW5nLCB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAqICAtIGBqYWAg44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS5oyH5a6aLiDnnIHnlaXjgZfjgZ/loLTlkIjjga/jgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyBmb3IgYGFkZEV2ZW50TGlzbnRlbmVyYFxuICAgICAqICAtIGBqYWAgYGFkZEV2ZW50TGlzbnRlbmVyYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdG91Y2htb3ZlKGhhbmRsZXI/OiAoZXZlbnQ6IEV2ZW50LCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCwgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gZXZlbnRTaG9ydGN1dC5iaW5kKHRoaXMpKCd0b3VjaG1vdmUnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHRvdWNoY2FuY2VsYCBldmVudC5cbiAgICAgKiBAamEgYHRvdWNoY2FuY2VsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB0b3VjaGNhbmNlbChoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgndG91Y2hjYW5jZWwnLCBoYW5kbGVyLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVHJpZ2dlciBvciBoYW5kbGUgYHJlc2l6ZWAgZXZlbnQuXG4gICAgICogQGphIGByZXNpemVgIOOCpOODmeODs+ODiOOBrueZuuihjOOBvuOBn+OBr+aNleaNiVxuICAgICAqXG4gICAgICogQHBhcmFtIGhhbmRsZXJcbiAgICAgKiAgLSBgZW5gIGV2ZW50IGhhbmRsZXIgaXMgZGVzaWduYXRlZC4gd2hlbiBvbWl0dGluZywgdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkuaMh+Wumi4g55yB55Wl44GX44Gf5aC05ZCI44Gv44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgZm9yIGBhZGRFdmVudExpc250ZW5lcmBcbiAgICAgKiAgLSBgamFgIGBhZGRFdmVudExpc250ZW5lcmAg44Gr5oyH5a6a44GZ44KL44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2l6ZShoYW5kbGVyPzogKGV2ZW50OiBFdmVudCwgLi4uYXJnczogYW55W10pID0+IHZvaWQsIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50U2hvcnRjdXQuYmluZCh0aGlzKSgncmVzaXplJywgaGFuZGxlciwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRyaWdnZXIgb3IgaGFuZGxlIGBzY3JvbGxgIGV2ZW50LlxuICAgICAqIEBqYSBgc2Nyb2xsYCDjgqTjg5njg7Pjg4jjga7nmbrooYzjgb7jgZ/jga/mjZXmjYlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoYW5kbGVyXG4gICAgICogIC0gYGVuYCBldmVudCBoYW5kbGVyIGlzIGRlc2lnbmF0ZWQuIHdoZW4gb21pdHRpbmcsIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICogIC0gYGphYCDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLmjIflrpouIOecgeeVpeOBl+OBn+WgtOWQiOOBr+OCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIGZvciBgYWRkRXZlbnRMaXNudGVuZXJgXG4gICAgICogIC0gYGphYCBgYWRkRXZlbnRMaXNudGVuZXJgIOOBq+aMh+WumuOBmeOCi+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGwoaGFuZGxlcj86IChldmVudDogRXZlbnQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkLCBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zKTogdGhpcyB7XG4gICAgICAgIHJldHVybiBldmVudFNob3J0Y3V0LmJpbmQodGhpcykoJ3Njcm9sbCcsIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogQ29weWluZ1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIGRlZXAgY29weSBvZiB0aGUgc2V0IG9mIG1hdGNoZWQgZWxlbWVudHMuXG4gICAgICogQGphIOmFjeS4i+OBruimgee0oOOBruODh+OCo+ODvOODl+OCs+ODlOODvOOCkuS9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIHdpdGhFdmVudHNcbiAgICAgKiAgLSBgZW5gIEEgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgZXZlbnQgaGFuZGxlcnMgc2hvdWxkIGJlIGNvcGllZCBhbG9uZyB3aXRoIHRoZSBlbGVtZW50cy5cbiAgICAgKiAgLSBgamFgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCguOCs+ODlOODvOOBmeOCi+OBi+OBqeOBhuOBi+OCkuaxuuWumlxuICAgICAqIEBwYXJhbSBkZWVwXG4gICAgICogIC0gYGVuYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIGV2ZW50IGhhbmRsZXJzIGZvciBhbGwgY2hpbGRyZW4gb2YgdGhlIGNsb25lZCBlbGVtZW50IHNob3VsZCBiZSBjb3BpZWQuXG4gICAgICogIC0gYGphYCBib29sZWFu5YCk44Gn44CB6YWN5LiL44Gu6KaB57Sg44Gu44GZ44G544Gm44Gu5a2Q6KaB57Sg44Gr5a++44GX44Gm44KC44CB5LuY6ZqP44GX44Gm44GE44KL44Kk44OZ44Oz44OI44OP44Oz44OJ44Op44KS44Kz44OU44O844GZ44KL44GL44Gp44GG44GL44KS5rG65a6aXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKHdpdGhFdmVudHMgPSBmYWxzZSwgZGVlcCA9IGZhbHNlKTogRE9NPFRFbGVtZW50PiB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzIGFzIERPTUl0ZXJhYmxlPFRFbGVtZW50PiBhcyBET008VEVsZW1lbnQ+O1xuICAgICAgICBpZiAoIWlzVHlwZUVsZW1lbnQoc2VsZikpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxmLm1hcCgoaW5kZXg6IG51bWJlciwgZWw6IFRFbGVtZW50KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmVFbGVtZW50KGVsIGFzIE5vZGUgYXMgRWxlbWVudCwgd2l0aEV2ZW50cywgZGVlcCkgYXMgTm9kZSBhcyBURWxlbWVudDtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShET01FdmVudHMsICdwcm90b0V4dGVuZHNPbmx5Jyk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgTmlsLFxuICAgIGlzTnVtYmVyLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2xhc3NpZnksXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIGVuc3VyZVBvc2l0aXZlTnVtYmVyLFxuICAgIHN3aW5nLFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHtcbiAgICBET01JdGVyYWJsZSxcbiAgICBpc05vZGVFbGVtZW50LFxuICAgIGlzTm9kZUhUTUxPclNWR0VsZW1lbnQsXG4gICAgaXNOb2RlRG9jdW1lbnQsXG59IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBnZXRPZmZzZXRTaXplIH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHtcbiAgICB3aW5kb3csXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxufSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIFtbRE9NXV1gLnNjcm9sbFRvKClgIG9wdGlvbnMgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW0RPTV1dYC5zY3JvbGxUbygpYCDjgavmjIflrprjgZnjgovjgqrjg5fjgrfjg6fjg7PlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBET01TY3JvbGxPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqIEBqYSDnuKbjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKi9cbiAgICB0b3A/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogQGphIOaoquOCueOCr+ODreODvOODq+mHj+OCkuODlOOCr+OCu+ODq+OBp+aMh+WumlxuICAgICAqL1xuICAgIGxlZnQ/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gdGhlIHRpbWUgdG8gc3BlbmQgb24gc2Nyb2xsLiBbbXNlY11cbiAgICAgKiBAamEg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqL1xuICAgIGR1cmF0aW9uPzogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogQGphIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKi9cbiAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlcik7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gc2Nyb2xsIGNvbXBsZXRpb24gY2FsbGJhY2suXG4gICAgICogQGphIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcXVlcnkgc2Nyb2xsIHRhcmdldCBlbGVtZW50ICovXG5mdW5jdGlvbiBxdWVyeVRhcmdldEVsZW1lbnQoZWw6IEVsZW1lbnRCYXNlIHwgTmlsKTogRWxlbWVudCB8IG51bGwge1xuICAgIGlmIChpc05vZGVFbGVtZW50KGVsKSkge1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfSBlbHNlIGlmIChpc05vZGVEb2N1bWVudChlbCkpIHtcbiAgICAgICAgcmV0dXJuIGVsLmRvY3VtZW50RWxlbWVudDtcbiAgICB9IGVsc2UgaWYgKHdpbmRvdyA9PT0gZWwpIHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHNjcm9sbFRvKClgICovXG5mdW5jdGlvbiBwYXJzZUFyZ3MoLi4uYXJnczogYW55W10pOiBET01TY3JvbGxPcHRpb25zIHtcbiAgICBjb25zdCBvcHRpb25zOiBET01TY3JvbGxPcHRpb25zID0geyBlYXNpbmc6ICdzd2luZycgfTtcbiAgICBpZiAoMSA9PT0gYXJncy5sZW5ndGgpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihvcHRpb25zLCBhcmdzWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbbGVmdCwgdG9wLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFja10gPSBhcmdzO1xuICAgICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHtcbiAgICAgICAgICAgIHRvcCxcbiAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgIGNhbGxiYWNrLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvcHRpb25zLnRvcCAgICAgID0gZW5zdXJlUG9zaXRpdmVOdW1iZXIob3B0aW9ucy50b3ApO1xuICAgIG9wdGlvbnMubGVmdCAgICAgPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmxlZnQpO1xuICAgIG9wdGlvbnMuZHVyYXRpb24gPSBlbnN1cmVQb3NpdGl2ZU51bWJlcihvcHRpb25zLmR1cmF0aW9uKTtcblxuICAgIHJldHVybiBvcHRpb25zO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciBmb3IgYHNjcm9sbFRvKClgICovXG5mdW5jdGlvbiBleGVjU2Nyb2xsKGVsOiBIVE1MRWxlbWVudCB8IFNWR0VsZW1lbnQsIG9wdGlvbnM6IERPTVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICBjb25zdCB7IHRvcCwgbGVmdCwgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2sgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBpbml0aWFsVG9wID0gZWwuc2Nyb2xsVG9wO1xuICAgIGNvbnN0IGluaXRpYWxMZWZ0ID0gZWwuc2Nyb2xsTGVmdDtcbiAgICBsZXQgZW5hYmxlVG9wID0gaXNOdW1iZXIodG9wKTtcbiAgICBsZXQgZW5hYmxlTGVmdCA9IGlzTnVtYmVyKGxlZnQpO1xuXG4gICAgLy8gbm9uIGFuaW1hdGlvbiBjYXNlXG4gICAgaWYgKCFkdXJhdGlvbikge1xuICAgICAgICBsZXQgbm90aWZ5ID0gZmFsc2U7XG4gICAgICAgIGlmIChlbmFibGVUb3AgJiYgdG9wICE9PSBpbml0aWFsVG9wKSB7XG4gICAgICAgICAgICBlbC5zY3JvbGxUb3AgPSB0b3AgYXMgbnVtYmVyO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZW5hYmxlTGVmdCAmJiBsZWZ0ICE9PSBpbml0aWFsTGVmdCkge1xuICAgICAgICAgICAgZWwuc2Nyb2xsTGVmdCA9IGxlZnQgYXMgbnVtYmVyO1xuICAgICAgICAgICAgbm90aWZ5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90aWZ5ICYmIGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxjTWV0cmljcyA9IChlbmFibGU6IGJvb2xlYW4sIGJhc2U6IG51bWJlciwgaW5pdGlhbFZhbHVlOiBudW1iZXIsIHR5cGU6ICd3aWR0aCcgfCAnaGVpZ2h0Jyk6IHsgbWF4OiBudW1iZXI7IG5ldzogbnVtYmVyOyBpbml0aWFsOiBudW1iZXI7IH0gPT4ge1xuICAgICAgICBpZiAoIWVuYWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgbWF4OiAwLCBuZXc6IDAsIGluaXRpYWw6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXhWYWx1ZSA9IGVsW2BzY3JvbGwke2NsYXNzaWZ5KHR5cGUpfWBdIC0gZ2V0T2Zmc2V0U2l6ZShlbCwgdHlwZSk7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gTWF0aC5tYXgoTWF0aC5taW4oYmFzZSwgbWF4VmFsdWUpLCAwKTtcbiAgICAgICAgcmV0dXJuIHsgbWF4OiBtYXhWYWx1ZSwgbmV3OiBuZXdWYWx1ZSwgaW5pdGlhbDogaW5pdGlhbFZhbHVlIH07XG4gICAgfTtcblxuICAgIGNvbnN0IG1ldHJpY3NUb3AgPSBjYWxjTWV0cmljcyhlbmFibGVUb3AsIHRvcCBhcyBudW1iZXIsIGluaXRpYWxUb3AsICdoZWlnaHQnKTtcbiAgICBjb25zdCBtZXRyaWNzTGVmdCA9IGNhbGNNZXRyaWNzKGVuYWJsZUxlZnQsIGxlZnQgYXMgbnVtYmVyLCBpbml0aWFsTGVmdCwgJ3dpZHRoJyk7XG5cbiAgICBpZiAoZW5hYmxlVG9wICYmIG1ldHJpY3NUb3AubmV3ID09PSBtZXRyaWNzVG9wLmluaXRpYWwpIHtcbiAgICAgICAgZW5hYmxlVG9wID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChlbmFibGVMZWZ0ICYmIG1ldHJpY3NMZWZ0Lm5ldyA9PT0gbWV0cmljc0xlZnQuaW5pdGlhbCkge1xuICAgICAgICBlbmFibGVMZWZ0ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICghZW5hYmxlVG9wICYmICFlbmFibGVMZWZ0KSB7XG4gICAgICAgIC8vIG5lZWQgbm90IHRvIHNjcm9sbFxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgY2FsY1Byb2dyZXNzID0gKHZhbHVlOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihlYXNpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gZWFzaW5nKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAnbGluZWFyJyA9PT0gZWFzaW5nID8gdmFsdWUgOiBzd2luZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgZGVsdGEgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBhbmltYXRlID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBjb25zdCBlbGFwc2UgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IE1hdGgubWF4KE1hdGgubWluKGVsYXBzZSAvIGR1cmF0aW9uLCAxKSwgMCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzQ29lZmYgPSBjYWxjUHJvZ3Jlc3MocHJvZ3Jlc3MpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBkZWx0YVxuICAgICAgICBpZiAoZW5hYmxlVG9wKSB7XG4gICAgICAgICAgICBkZWx0YS50b3AgPSBtZXRyaWNzVG9wLmluaXRpYWwgKyAocHJvZ3Jlc3NDb2VmZiAqIChtZXRyaWNzVG9wLm5ldyAtIG1ldHJpY3NUb3AuaW5pdGlhbCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbmFibGVMZWZ0KSB7XG4gICAgICAgICAgICBkZWx0YS5sZWZ0ID0gbWV0cmljc0xlZnQuaW5pdGlhbCArIChwcm9ncmVzc0NvZWZmICogKG1ldHJpY3NMZWZ0Lm5ldyAtIG1ldHJpY3NMZWZ0LmluaXRpYWwpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIGRvbmVcbiAgICAgICAgaWYgKChlbmFibGVUb3AgJiYgbWV0cmljc1RvcC5uZXcgPiBtZXRyaWNzVG9wLmluaXRpYWwgJiYgZGVsdGEudG9wID49IG1ldHJpY3NUb3AubmV3KSAgICAgICB8fCAvLyBzY3JvbGwgZG93blxuICAgICAgICAgICAgKGVuYWJsZVRvcCAmJiBtZXRyaWNzVG9wLm5ldyA8IG1ldHJpY3NUb3AuaW5pdGlhbCAmJiBkZWx0YS50b3AgPD0gbWV0cmljc1RvcC5uZXcpICAgICAgIHx8IC8vIHNjcm9sbCB1cFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3ID4gbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0ID49IG1ldHJpY3NMZWZ0Lm5ldykgIHx8IC8vIHNjcm9sbCByaWdodFxuICAgICAgICAgICAgKGVuYWJsZUxlZnQgJiYgbWV0cmljc0xlZnQubmV3IDwgbWV0cmljc0xlZnQuaW5pdGlhbCAmJiBkZWx0YS5sZWZ0IDw9IG1ldHJpY3NMZWZ0Lm5ldykgICAgIC8vIHNjcm9sbCBsZWZ0XG4gICAgICAgICkge1xuICAgICAgICAgICAgLy8gZW5zdXJlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICBlbmFibGVUb3AgJiYgKGVsLnNjcm9sbFRvcCA9IG1ldHJpY3NUb3AubmV3KTtcbiAgICAgICAgICAgIGVuYWJsZUxlZnQgJiYgKGVsLnNjcm9sbExlZnQgPSBtZXRyaWNzTGVmdC5uZXcpO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlbGVhc2UgcmVmZXJlbmNlIGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgZWwgPSBudWxsITsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGUgc2Nyb2xsIHBvc2l0aW9uXG4gICAgICAgIGVuYWJsZVRvcCAmJiAoZWwuc2Nyb2xsVG9wID0gZGVsdGEudG9wKTtcbiAgICAgICAgZW5hYmxlTGVmdCAmJiAoZWwuc2Nyb2xsTGVmdCA9IGRlbHRhLmxlZnQpO1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhbmltYXRlKTtcbiAgICB9O1xuXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGFuaW1hdGUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTWl4aW4gYmFzZSBjbGFzcyB3aGljaCBjb25jZW50cmF0ZWQgdGhlIG1hbmlwdWxhdGlvbiBtZXRob2RzLlxuICogQGphIOOCueOCr+ODreODvOODq+ODoeOCveODg+ODieOCkumbhue0hOOBl+OBnyBNaXhpbiBCYXNlIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRE9NU2Nyb2xsPFRFbGVtZW50IGV4dGVuZHMgRWxlbWVudEJhc2U+IGltcGxlbWVudHMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IHtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcHJlbWVudHM6IERPTUl0ZXJhYmxlPFQ+XG5cbiAgICByZWFkb25seSBbbjogbnVtYmVyXTogVEVsZW1lbnQ7XG4gICAgcmVhZG9ubHkgbGVuZ3RoITogbnVtYmVyO1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdOiAoKSA9PiBJdGVyYXRvcjxURWxlbWVudD47XG4gICAgZW50cmllcyE6ICgpID0+IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVEVsZW1lbnRdPjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYzogU2Nyb2xsXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBudW1iZXIgb2YgcGl4ZWxzIHZlcnRpY2FsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDnuKbmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZXjgozjgZ/jg5Tjgq/jgrvjg6vmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Nyb2xsVG9wKCk6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgdmVydGljYWwgc2Nyb2xsZWQuXG4gICAgICogQGphIOe4puaWueWQkeOCueOCr+ODreODvOODq+OBmeOCi+ODlOOCr+OCu+ODq+aVsOOCkuaMh+WumlxuICAgICAqXG4gICAgICogQHBhcmFtIHBvc2l0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0gZHVyYXRpb25cbiAgICAgKiAgLSBgZW5gIHRoZSB0aW1lIHRvIHNwZW5kIG9uIHNjcm9sbC4gW21zZWNdXG4gICAgICogIC0gYGphYCDjgrnjgq/jg63jg7zjg6vjgavosrvjgoTjgZnmmYLplpMgW21zZWNdXG4gICAgICogQHBhcmFtIGVhc2luZ1xuICAgICAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIGRlZmF1bHQ6ICdzd2luZydcbiAgICAgKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsCDml6LlrprlgKQ6ICdzd2luZydcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIHNjcm9sbCBjb21wbGV0aW9uIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or5a6M5LqG44Kz44O844Or44OQ44OD44KvXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbFRvcChcbiAgICAgICAgcG9zaXRpb246IG51bWJlcixcbiAgICAgICAgZHVyYXRpb24/OiBudW1iZXIsXG4gICAgICAgIGVhc2luZz86ICdsaW5lYXInIHwgJ3N3aW5nJyB8ICgocHJvZ3Jlc3M6IG51bWJlcikgPT4gbnVtYmVyKSxcbiAgICAgICAgY2FsbGJhY2s/OiAoKSA9PiB2b2lkXG4gICAgKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUb3AoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxUb3AgOiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2V0dGVyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zY3JvbGxUbyh7XG4gICAgICAgICAgICAgICAgdG9wOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBlYXNpbmcsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2ssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG51bWJlciBvZiBwaXhlbHMgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg5qiq5pa55ZCR44K544Kv44Ot44O844Or44GV44KM44Gf44OU44Kv44K744Or5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHNjcm9sbExlZnQoKTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyBob3Jpem9udGFsIHNjcm9sbGVkLlxuICAgICAqIEBqYSDmqKrmlrnlkJHjgrnjgq/jg63jg7zjg6vjgZnjgovjg5Tjgq/jgrvjg6vmlbDjgpLmjIflrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwb3NpdGlvblxuICAgICAqICAtIGBlbmAgdGhlIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxMZWZ0KFxuICAgICAgICBwb3NpdGlvbjogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiB0aGlzO1xuXG4gICAgcHVibGljIHNjcm9sbExlZnQoXG4gICAgICAgIHBvc2l0aW9uPzogbnVtYmVyLFxuICAgICAgICBkdXJhdGlvbj86IG51bWJlcixcbiAgICAgICAgZWFzaW5nPzogJ2xpbmVhcicgfCAnc3dpbmcnIHwgKChwcm9ncmVzczogbnVtYmVyKSA9PiBudW1iZXIpLFxuICAgICAgICBjYWxsYmFjaz86ICgpID0+IHZvaWRcbiAgICApOiBudW1iZXIgfCB0aGlzIHtcbiAgICAgICAgaWYgKG51bGwgPT0gcG9zaXRpb24pIHtcbiAgICAgICAgICAgIC8vIGdldHRlclxuICAgICAgICAgICAgY29uc3QgZWwgPSBxdWVyeVRhcmdldEVsZW1lbnQodGhpc1swXSk7XG4gICAgICAgICAgICByZXR1cm4gZWwgPyBlbC5zY3JvbGxMZWZ0IDogMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNldHRlclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2Nyb2xsVG8oe1xuICAgICAgICAgICAgICAgIGxlZnQ6IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGVhc2luZyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldCB0aGUgbnVtYmVyIG9mIHBpeGVscyB2ZXJ0aWNhbCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxlZC5cbiAgICAgKiBAamEg57im5qiq5pa55ZCR44K544Kv44Ot44O844Or44GZ44KL44OU44Kv44K744Or5pWw44KS5oyH5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0geFxuICAgICAqICAtIGBlbmAgdGhlIGhvcml6b250YWwgc2Nyb2xsIHZhbHVlIGJ5IHBpeGNlbHMuXG4gICAgICogIC0gYGphYCDmqKrjgrnjgq/jg63jg7zjg6vph4/jgpLjg5Tjgq/jgrvjg6vjgafmjIflrppcbiAgICAgKiBAcGFyYW0geVxuICAgICAqICAtIGBlbmAgdGhlIHZlcnRpY2FsIHNjcm9sbCB2YWx1ZSBieSBwaXhjZWxzLlxuICAgICAqICAtIGBqYWAg57im44K544Kv44Ot44O844Or6YeP44KS44OU44Kv44K744Or44Gn5oyH5a6aXG4gICAgICogQHBhcmFtIGR1cmF0aW9uXG4gICAgICogIC0gYGVuYCB0aGUgdGltZSB0byBzcGVuZCBvbiBzY3JvbGwuIFttc2VjXVxuICAgICAqICAtIGBqYWAg44K544Kv44Ot44O844Or44Gr6LK744KE44GZ5pmC6ZaTIFttc2VjXVxuICAgICAqIEBwYXJhbSBlYXNpbmdcbiAgICAgKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBkZWZhdWx0OiAnc3dpbmcnXG4gICAgICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbAg5pei5a6a5YCkOiAnc3dpbmcnXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBzY3JvbGwgY29tcGxldGlvbiBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOOCueOCr+ODreODvOODq+WujOS6huOCs+ODvOODq+ODkOODg+OCr1xuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhcbiAgICAgICAgeDogbnVtYmVyLFxuICAgICAgICB5OiBudW1iZXIsXG4gICAgICAgIGR1cmF0aW9uPzogbnVtYmVyLFxuICAgICAgICBlYXNpbmc/OiAnbGluZWFyJyB8ICdzd2luZycgfCAoKHByb2dyZXNzOiBudW1iZXIpID0+IG51bWJlciksXG4gICAgICAgIGNhbGxiYWNrPzogKCkgPT4gdm9pZFxuICAgICk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0IHRoZSBzY3JvbGwgdmFsdWVzIGJ5IG9wdG9pbnMuXG4gICAgICogQGphIOOCquODl+OCt+ODp+ODs+OCkueUqOOBhOOBpuOCueOCr+ODreODvOODq+aMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzY3JvbGxUbyhvcHRpb25zOiBET01TY3JvbGxPcHRpb25zKTogdGhpcztcblxuICAgIHB1YmxpYyBzY3JvbGxUbyguLi5hcmdzOiBhbnlbXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gcGFyc2VBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRoaXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsZW0gPSBxdWVyeVRhcmdldEVsZW1lbnQoZWwpO1xuICAgICAgICAgICAgaWYgKGlzTm9kZUhUTUxPclNWR0VsZW1lbnQoZWxlbSkpIHtcbiAgICAgICAgICAgICAgICBleGVjU2Nyb2xsKGVsZW0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NU2Nyb2xsLCAncHJvdG9FeHRlbmRzT25seScpO1xuIiwiaW1wb3J0IHsgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsIFdyaXRhYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEVsZW1lbnRCYXNlLCBET00gfSBmcm9tICcuL3N0YXRpYyc7XG5pbXBvcnQge1xuICAgIERPTUl0ZXJhYmxlLFxuICAgIGlzTm9kZUVsZW1lbnQsXG4gICAgaXNUeXBlRWxlbWVudCxcbn0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3QgcGFyYW1ldGVyLlxuICogQGphIFtbRE9NXV0g44Ko44OV44Kn44Kv44OI5Yq55p6c44Gu44OR44Op44Oh44O844K/XG4gKi9cbmV4cG9ydCB0eXBlIERPTUVmZmVjdFBhcmFtZXRlcnMgPSBLZXlmcmFtZVtdIHwgUHJvcGVydHlJbmRleGVkS2V5ZnJhbWVzIHwgbnVsbDtcblxuLyoqXG4gKiBAZW4gW1tET01dXSBlZmZlY3Qgb3B0aW9ucy5cbiAqIEBqYSBbW0RPTV1dIOOCqOODleOCp+OCr+ODiOWKueaenOOBruOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgdHlwZSBET01FZmZlY3RPcHRpb25zID0gbnVtYmVyIHwgS2V5ZnJhbWVBbmltYXRpb25PcHRpb25zO1xuXG4vKipcbiAqIEBlbiBbW0RPTV1dIGVmZmVjdCBjb250ZXh0IG9iamVjdC5cbiAqIEBqYSBbW0RPTV1dIOOBruOCqOODleOCp+OCr+ODiOWKueaenOOBruOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTUVmZmVjdENvbnRleHQ8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4ge1xuICAgIC8qKlxuICAgICAqIEBlbiBbW0RPTV1dIGluc3RhbmNlIHRoYXQgY2FsbGVkIFtbYW5pbWF0ZV1dKCkgbWV0aG9kLlxuICAgICAqIEBqYSBbW2FuaW1hdGVdXSgpIOODoeOCveODg+ODieOCkuWun+ihjOOBl+OBnyBbW0RPTV1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHJlYWRvbmx5IGRvbTogRE9NPFRFbGVtZW50PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBgRWxlbWVudGAgYW5kIGBBbmltYXRpb25gIGluc3RhbmNlIG1hcCBieSBleGVjdXRpb24gW1thbmltYXRlXV0oKSBtZXRob2QgYXQgdGhpcyB0aW1lLlxuICAgICAqIEBqYSDku4rlm57lrp/ooYzjgZfjgZ8gYEVsZW1lbnRgIOOBqCBgQW5pbWF0aW9uYCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7jg57jg4Pjg5dcbiAgICAgKi9cbiAgICByZWFkb25seSBhbmltYXRpb25zOiBNYXA8VEVsZW1lbnQsIEFuaW1hdGlvbj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIGN1cnJlbnQgZmluaXNoZWQgUHJvbWlzZSBmb3IgdGhpcyBhbmltYXRpb24uXG4gICAgICogQGphIOWvvuixoeOCouODi+ODoeODvOOCt+ODp+ODs+OBrue1guS6huaZguOBq+eZuueBq+OBmeOCiyBgUHJvbWlzZWAg44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgcmVhZG9ubHkgZmluaXNoZWQ6IFByb21pc2U8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FuaW1Db250ZXh0TWFwID0gbmV3IFdlYWtNYXA8RWxlbWVudCwgU2V0PEFuaW1hdGlvbj4+KCk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNaXhpbiBiYXNlIGNsYXNzIHdoaWNoIGNvbmNlbnRyYXRlZCB0aGUgYW5pbWF0aW9uL2VmZmVjdCBtZXRob2RzLlxuICogQGphIOOCouODi+ODoeODvOOCt+ODp+ODsy/jgqjjg5Xjgqfjgq/jg4jmk43kvZzjg6Hjgr3jg4Pjg4njgpLpm4bntITjgZfjgZ8gTWl4aW4gQmFzZSDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUVmZmVjdHM8VEVsZW1lbnQgZXh0ZW5kcyBFbGVtZW50QmFzZT4gaW1wbGVtZW50cyBET01JdGVyYWJsZTxURWxlbWVudD4ge1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wcmVtZW50czogRE9NSXRlcmFibGU8VD5cblxuICAgIHJlYWRvbmx5IFtuOiBudW1iZXJdOiBURWxlbWVudDtcbiAgICByZWFkb25seSBsZW5ndGghOiBudW1iZXI7XG4gICAgW1N5bWJvbC5pdGVyYXRvcl06ICgpID0+IEl0ZXJhdG9yPFRFbGVtZW50PjtcbiAgICBlbnRyaWVzITogKCkgPT4gSXRlcmFibGVJdGVyYXRvcjxbbnVtYmVyLCBURWxlbWVudF0+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljOiBFZmZlY3RzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RhcnQgYW5pbWF0aW9uIGJ5IGBXZWIgQW5pbWF0aW9uIEFQSWAuXG4gICAgICogQGphIGBXZWIgQW5pbWF0aW9uIEFQSWAg44KS55So44GE44Gm44Ki44OL44Oh44O844K344On44Oz44KS5a6f6KGMXG4gICAgICovXG4gICAgcHVibGljIGFuaW1hdGUocGFyYW1zOiBET01FZmZlY3RQYXJhbWV0ZXJzLCBvcHRpb25zOiBET01FZmZlY3RPcHRpb25zKTogRE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICBkb206IHRoaXMgYXMgRE9NSXRlcmFibGU8VEVsZW1lbnQ+IGFzIERPTTxURWxlbWVudD4sXG4gICAgICAgICAgICBhbmltYXRpb25zOiBuZXcgTWFwPFRFbGVtZW50LCBBbmltYXRpb24+KCksXG4gICAgICAgIH0gYXMgV3JpdGFibGU8RE9NRWZmZWN0Q29udGV4dDxURWxlbWVudD4+O1xuXG4gICAgICAgIGlmICghaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoaXNOb2RlRWxlbWVudChlbCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmltID0gZWwuYW5pbWF0ZShwYXJhbXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsKSB8fCBuZXcgU2V0KCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5hZGQoYW5pbSk7XG4gICAgICAgICAgICAgICAgX2FuaW1Db250ZXh0TWFwLnNldChlbCwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmFuaW1hdGlvbnMuc2V0KGVsIGFzIE5vZGUgYXMgVEVsZW1lbnQsIGFuaW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LmZpbmlzaGVkID0gUHJvbWlzZS5hbGwoWy4uLnJlc3VsdC5hbmltYXRpb25zLnZhbHVlcygpXS5tYXAoYW5pbSA9PiBhbmltLmZpbmlzaGVkKSkudGhlbigoKSA9PiByZXN1bHQpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENhbmNlbCBjdXJyZW50IHJ1bm5pbmcgYW5pbWF0aW9uLlxuICAgICAqIEBqYSDnj77lnKjlrp/ooYzjgZfjgabjgYTjgovjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLkuK3mraJcbiAgICAgKi9cbiAgICBwdWJsaWMgY2FuY2VsKCk6IHRoaXMge1xuICAgICAgICBpZiAoaXNUeXBlRWxlbWVudCh0aGlzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGV4dCA9IF9hbmltQ29udGV4dE1hcC5nZXQoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhbmltYXRpb24gb2YgY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uLmNhbmNlbCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF9hbmltQ29udGV4dE1hcC5kZWxldGUoZWwgYXMgRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGaW5pc2ggY3VycmVudCBydW5uaW5nIGFuaW1hdGlvbi5cbiAgICAgKiBAamEg54++5Zyo5a6f6KGM44GX44Gm44GE44KL44Ki44OL44Oh44O844K344On44Oz44KS57WC5LqGXG4gICAgICovXG4gICAgcHVibGljIGZpbmlzaCgpOiB0aGlzIHtcbiAgICAgICAgaWYgKGlzVHlwZUVsZW1lbnQodGhpcykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGhpcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQgPSBfYW5pbUNvbnRleHRNYXAuZ2V0KGVsIGFzIEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYW5pbWF0aW9uIG9mIGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5maW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBmaW5pc2gg44Gn44Gv56C05qOE44GX44Gq44GEXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoRE9NRWZmZWN0cywgJ3Byb3RvRXh0ZW5kc09ubHknKTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktaW50ZXJmYWNlXG4gKi9cblxuaW1wb3J0IHsgbWl4aW5zIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgRWxlbWVudEJhc2UsXG4gICAgU2VsZWN0b3JCYXNlLFxuICAgIEVsZW1lbnRpZnlTZWVkLFxuICAgIFF1ZXJ5Q29udGV4dCxcbiAgICBlbGVtZW50aWZ5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERPTUJhc2UgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgRE9NQXR0cmlidXRlcyB9IGZyb20gJy4vYXR0cmlidXRlcyc7XG5pbXBvcnQgeyBET01UcmF2ZXJzaW5nIH0gZnJvbSAnLi90cmF2ZXJzaW5nJztcbmltcG9ydCB7IERPTU1hbmlwdWxhdGlvbiB9IGZyb20gJy4vbWFuaXB1bGF0aW9uJztcbmltcG9ydCB7IERPTVN0eWxlcyB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCB7IERPTUV2ZW50cyB9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7IERPTVNjcm9sbCB9IGZyb20gJy4vc2Nyb2xsJztcbmltcG9ydCB7IERPTUVmZmVjdHMgfSBmcm9tICcuL2VmZmVjdHMnO1xuXG50eXBlIERPTUZlYXR1cmVzPFQgZXh0ZW5kcyBFbGVtZW50QmFzZT5cbiAgICA9IERPTUJhc2U8VD5cbiAgICAmIERPTUF0dHJpYnV0ZXM8VD5cbiAgICAmIERPTVRyYXZlcnNpbmc8VD5cbiAgICAmIERPTU1hbmlwdWxhdGlvbjxUPlxuICAgICYgRE9NU3R5bGVzPFQ+XG4gICAgJiBET01FdmVudHM8VD5cbiAgICAmIERPTVNjcm9sbDxUPlxuICAgICYgRE9NRWZmZWN0czxUPjtcblxuLyoqXG4gKiBAZW4gW1tET01dXSBwbHVnaW4gbWV0aG9kIGRlZmluaXRpb24uXG4gKiBAamEgW1tET01dXSDjg5fjg6njgrDjgqTjg7Pjg6Hjgr3jg4Pjg4nlrprnvqlcbiAqXG4gKiBAbm90ZVxuICogIC0g44OX44Op44Kw44Kk44Oz5ouh5by15a6a576p44Gv44GT44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K544Oe44O844K444GZ44KLLlxuICogIC0gVHlwZVNjcmlwdCAzLjcg5pmC54K544GnLCBtb2R1bGUgaW50ZXJmYWNlIOOBruODnuODvOOCuOOBryBtb2R1bGUg44Gu5a6M5YWo44Gq44OR44K544KS5b+F6KaB44Go44GZ44KL44Gf44KBLFxuICogICAg5pys44Os44Od44K444OI44Oq44Gn44GvIGJ1bmRsZSDjgZfjgZ8gYGRpc3QvZG9tLmQudHNgIOOCkuaPkOS+m+OBmeOCiy5cbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzMzMzI2XG4gKiAgLSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81Nzg0ODEzNC90cm91YmxlLXVwZGF0aW5nLWFuLWludGVyZmFjZS11c2luZy1kZWNsYXJhdGlvbi1tZXJnaW5nXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRE9NUGx1Z2luIHsgfVxuXG4vKipcbiAqIEBlbiBUaGlzIGludGVyZmFjZSBwcm92aWRlcyBET00gb3BlcmF0aW9ucyBsaWtlIGBqUXVlcnlgIGxpYnJhcnkuXG4gKiBAamEgYGpRdWVyeWAg44Gu44KI44GG44GqRE9NIOaTjeS9nOOCkuaPkOS+m+OBmeOCi+OCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERPTTxUIGV4dGVuZHMgRWxlbWVudEJhc2UgPSBIVE1MRWxlbWVudD4gZXh0ZW5kcyBET01GZWF0dXJlczxUPiwgRE9NUGx1Z2luIHsgfVxuXG5leHBvcnQgdHlwZSBET01TZWxlY3RvcjxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlID0gSFRNTEVsZW1lbnQ+ID0gRWxlbWVudGlmeVNlZWQ8VD4gfCBET008VCBleHRlbmRzIEVsZW1lbnRCYXNlID8gVCA6IG5ldmVyPjtcbmV4cG9ydCB0eXBlIERPTVJlc3VsdDxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPiA9IFQgZXh0ZW5kcyBET008RWxlbWVudEJhc2U+ID8gVCA6IChUIGV4dGVuZHMgRWxlbWVudEJhc2UgPyBET008VD4gOiBET008SFRNTEVsZW1lbnQ+KTtcbmV4cG9ydCB0eXBlIERPTUl0ZXJhdGVDYWxsYmFjazxUIGV4dGVuZHMgRWxlbWVudEJhc2U+ID0gKGluZGV4OiBudW1iZXIsIGVsZW1lbnQ6IFQpID0+IGJvb2xlYW4gfCB2b2lkO1xuXG4vKipcbiAqIEBlbiBUaGlzIGNsYXNzIHByb3ZpZGVzIERPTSBvcGVyYXRpb25zIGxpa2UgYGpRdWVyeWAgbGlicmFyeS5cbiAqIEBqYSBgalF1ZXJ5YCDjga7jgojjgYbjgapET00g5pON5L2c44KS5o+Q5L6bXG4gKlxuICogVU5TVVBQT1JURUQgTUVUSE9EIExJU1RcbiAqXG4gKiBbVHJhdmVyc2luZ11cbiAqICAuYWRkQmFjaygpXG4gKiAgLmVuZCgpXG4gKlxuICogW0VmZmVjdHNdXG4gKiAuc2hvdygpXG4gKiAuaGlkZSgpXG4gKiAudG9nZ2xlKClcbiAqIC5zdG9wKClcbiAqIC5jbGVhclF1ZXVlKClcbiAqIC5kZWxheSgpXG4gKiAuZGVxdWV1ZSgpXG4gKiAuZmFkZUluKClcbiAqIC5mYWRlT3V0KClcbiAqIC5mYWRlVG8oKVxuICogLmZhZGVUb2dnbGUoKVxuICogLnF1ZXVlKClcbiAqIC5zbGlkZURvd24oKVxuICogLnNsaWRlVG9nZ2xlKClcbiAqIC5zbGlkZVVwKClcbiAqL1xuZXhwb3J0IGNsYXNzIERPTUNsYXNzIGV4dGVuZHMgbWl4aW5zKFxuICAgIERPTUJhc2UsXG4gICAgRE9NQXR0cmlidXRlcyxcbiAgICBET01UcmF2ZXJzaW5nLFxuICAgIERPTU1hbmlwdWxhdGlvbixcbiAgICBET01TdHlsZXMsXG4gICAgRE9NRXZlbnRzLFxuICAgIERPTVNjcm9sbCxcbiAgICBET01FZmZlY3RzLFxuKSB7XG4gICAgLyoqXG4gICAgICogcHJpdmF0ZSBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICogIC0gYGVuYCBvcGVyYXRpb24gdGFyZ2V0cyBgRWxlbWVudGAgYXJyYXkuXG4gICAgICogIC0gYGphYCDmk43kvZzlr77osaHjga4gYEVsZW1lbnRgIOmFjeWIl1xuICAgICAqL1xuICAgIHByaXZhdGUgY29uc3RydWN0b3IoZWxlbWVudHM6IEVsZW1lbnRCYXNlW10pIHtcbiAgICAgICAgc3VwZXIoZWxlbWVudHMpO1xuICAgICAgICAvLyBhbGwgc291cmNlIGNsYXNzZXMgaGF2ZSBubyBjb25zdHJ1Y3Rvci5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIFtbRE9NXV0gaW5zdGFuY2UgZnJvbSBgc2VsZWN0b3JgIGFyZy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIGBzZWxlY3RvcmAgW1tET01dXSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJBcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlbGVjdG9yXG4gICAgICogIC0gYGVuYCBPYmplY3Qocykgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiBbW0RPTV1dLlxuICAgICAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqrjg5bjgrjjgqfjgq/jg4go576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYCBTZXQgdXNpbmcgYERvY3VtZW50YCBjb250ZXh0LiBXaGVuIGJlaW5nIHVuLWRlc2lnbmF0aW5nLCBhIGZpeGVkIHZhbHVlIG9mIHRoZSBlbnZpcm9ubWVudCBpcyB1c2VkLlxuICAgICAqICAtIGBqYWAg5L2/55So44GZ44KLIGBEb2N1bWVudGAg44Kz44Oz44OG44Kt44K544OI44KS5oyH5a6aLiDmnKrmjIflrprjga7loLTlkIjjga/nkrDlooPjga7ml6LlrprlgKTjgYzkvb/nlKjjgZXjgozjgosuXG4gICAgICogQHJldHVybnMgW1tET01dXSBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZTxUIGV4dGVuZHMgU2VsZWN0b3JCYXNlPihzZWxlY3Rvcj86IERPTVNlbGVjdG9yPFQ+LCBjb250ZXh0PzogUXVlcnlDb250ZXh0IHwgbnVsbCk6IERPTVJlc3VsdDxUPiB7XG4gICAgICAgIGlmIChzZWxlY3RvciAmJiAhY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgRE9NQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZWN0b3IgYXMgYW55O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgRE9NQ2xhc3MoKGVsZW1lbnRpZnkoc2VsZWN0b3IgYXMgRWxlbWVudGlmeVNlZWQ8VD4sIGNvbnRleHQpKSkgYXMgYW55O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHNldHVwIH0gZnJvbSAnLi9zdGF0aWMnO1xuaW1wb3J0IHsgRE9NQ2xhc3MgfSBmcm9tICcuL2NsYXNzJztcblxuLy8gaW5pdCBmb3Igc3RhdGljXG5zZXR1cChET01DbGFzcy5wcm90b3R5cGUsIERPTUNsYXNzLmNyZWF0ZSk7XG5cbmV4cG9ydCAqIGZyb20gJy4vZXhwb3J0cyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIGRlZmF1bHQgfSBmcm9tICcuL2V4cG9ydHMnO1xuIl0sIm5hbWVzIjpbInNhZmUiLCJkb2N1bWVudCIsImlzRnVuY3Rpb24iLCJjbGFzc05hbWUiLCJpc051bWJlciIsImRvYyIsImdldEdsb2JhbE5hbWVzcGFjZSIsIndpbmRvdyIsIiQiLCJpc0FycmF5IiwiaXNTdHJpbmciLCJ0b1R5cGVkRGF0YSIsImNhbWVsaXplIiwiZnJvbVR5cGVkRGF0YSIsInNldE1peENsYXNzQXR0cmlidXRlIiwibm9vcCIsImRvbSIsImRhc2hlcml6ZSIsImNsYXNzaWZ5IiwiQ3VzdG9tRXZlbnQiLCJtaXhpbnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0dBRUE7Ozs7R0FLQTtHQUNBLE1BQU0sR0FBRyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0dBQ3BDO0dBQ0EsTUFBTSxHQUFHLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7R0FDdEM7R0FDQSxNQUFNLEdBQUcsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztHQUN6QztHQUNBLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxHQUFHLEdBQUc7O0dDZHJDOzs7R0FtQkE7Ozs7Ozs7Ozs7OztZQVln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UUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxNQUFNLENBQUMsQ0FBQztXQUU3RyxPQUFPLE1BQU0sQ0FBQztRQUNqQjs7Ozs7T0FNTSxNQUFNO1dBQ1QsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUU7ZUFDckIsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUU7bUJBQ25CLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBYSxDQUFDLENBQUM7bUJBQ25ELElBQUksT0FBTyxFQUFFO3VCQUNULEtBQUssTUFBTSxTQUFTLElBQUksT0FBTyxFQUFFOzJCQUM3QixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ3RCO3VCQUNELGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBYSxDQUFDLENBQUM7b0JBQ3pDO2dCQUNKO1lBQ0o7V0FDRCxPQUFPLElBQUksQ0FBQztRQUNmOzs7OztPQU1NLE1BQU07V0FDVCxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRTtlQUNyQixLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRTttQkFDbkIsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFhLENBQUMsQ0FBQzttQkFDbkQsSUFBSSxPQUFPLEVBQUU7dUJBQ1QsS0FBSyxNQUFNLFNBQVMsSUFBSSxPQUFPLEVBQUU7MkJBQzdCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDdEI7O29CQUVKO2dCQUNKO1lBQ0o7V0FDRCxPQUFPLElBQUksQ0FBQztRQUNmO0lBQ0o7QUFFREEsaUNBQW9CLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDOztHQ3pJcEQ7Ozs7R0F5REE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztTQTJCYSxRQUFTLFNBQVFNLGdCQUFNLENBQ2hDLE9BQU8sRUFDUCxhQUFhLEVBQ2IsYUFBYSxFQUNiLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxVQUFVLENBQ2I7Ozs7Ozs7O09BUUcsWUFBb0IsUUFBdUI7V0FDdkMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDOztRQUVuQjs7Ozs7Ozs7Ozs7Ozs7O09BZ0JNLE9BQU8sTUFBTSxDQUF5QixRQUF5QixFQUFFLE9BQTZCO1dBQ2pHLElBQUksUUFBUSxJQUFJLENBQUMsT0FBTyxFQUFFO2VBQ3RCLElBQUksUUFBUSxZQUFZLFFBQVEsRUFBRTttQkFDOUIsT0FBTyxRQUFlLENBQUM7Z0JBQzFCO1lBQ0o7V0FDRCxPQUFPLElBQUksUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUE2QixFQUFFLE9BQU8sQ0FBQyxFQUFTLENBQUM7UUFDcEY7OztHQzVITDtHQUNBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUM7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2RvbS8ifQ==
