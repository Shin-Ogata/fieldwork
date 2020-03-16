/*!
 * @cdp/collection 0.9.0
 *   generic collection scheme
 */

(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/i18n'), require('@cdp/core-utils'), require('@cdp/promise'), require('@cdp/observable'), require('@cdp/result')) :
   typeof define === 'function' && define.amd ? define(['exports', '@cdp/i18n', '@cdp/core-utils', '@cdp/promise', '@cdp/observable', '@cdp/result'], factory) :
   (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, i18n, coreUtils, promise, observable, result) { 'use strict';

   /* eslint-disable
      @typescript-eslint/no-namespace
    , @typescript-eslint/no-unused-vars
    , @typescript-eslint/restrict-plus-operands
    */
   globalThis.CDP_DECLARE = globalThis.CDP_DECLARE;
   (function () {
       /**
        * @en Extends error code definitions.
        * @ja 拡張通エラーコード定義
        */
       let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
       (function () {
           RESULT_CODE[RESULT_CODE["MVC_MODEL_DECLARE"] = 9007199254740991] = "MVC_MODEL_DECLARE";
           RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_ACCESS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 70 /* COLLECTION */ + 1, 'invalid access.')] = "ERROR_MVC_INVALID_ACCESS";
       })();
   })();

   /** @internal default Intl.Collator provider */
   let _collator = () => {
       return new Intl.Collator(i18n.getLanguage(), { sensitivity: 'base', numeric: true });
   };
   /**
    * @ja 既定の Intl.Collator を設定
    *
    * @param newProvider
    *  - `en` new [[CollatorProvider]] object. if `undefined` passed, only returns the current object.
    *  - `ja` 新しい [[CollatorProvider]] オブジェクトを指定. `undefined` が渡される場合は現在設定されているオブジェクトの返却のみ行う
    * @returns
    *  - `en` old [[CollatorProvider]] object.
    *  - `ja` 設定されていた [[CollatorProvider]] オブジェクト
    */
   function defaultCollatorProvider(newProvider) {
       if (null == newProvider) {
           return _collator;
       }
       else {
           const oldProvider = _collator;
           _collator = newProvider;
           return oldProvider;
       }
   }
   /**
    * @en Get string comparator function.
    * @ja 文字列比較用関数を取得
    *
    * @param prop
    *  - `en` property name
    *  - `ja` プロパティ名を指定
    * @param order
    *  - `en` sort order code
    *  - `ja` ソート順を指定
    */
   function getStringComparator(prop, order) {
       return (lhs, rhs) => {
           // undefined は '' と同等に扱う
           const lhsProp = (null != lhs[prop]) ? lhs[prop] : '';
           const rhsProp = (null != rhs[prop]) ? rhs[prop] : '';
           return order * _collator().compare(lhsProp, rhsProp);
       };
   }
   /**
    * @en Get date comparator function.
    * @ja 日時比較用関数を取得
    *
    * @param prop
    *  - `en` property name
    *  - `ja` プロパティ名を指定
    * @param order
    *  - `en` sort order code
    *  - `ja` ソート順を指定
    */
   function getDateComparator(prop, order) {
       return (lhs, rhs) => {
           const lhsDate = lhs[prop];
           const rhsDate = rhs[prop];
           if (lhsDate === rhsDate) {
               // (undefined === undefined) or 自己参照
               return 0;
           }
           else if (null == lhsDate) {
               // undefined は最低値扱い (昇順時に先頭へ)
               return -1 * order;
           }
           else if (null == rhsDate) {
               // undefined は最低値扱い (昇順時に先頭へ)
               return 1 * order;
           }
           else {
               const lhsValue = Object(lhsDate).valueOf();
               const rhsValue = Object(rhsDate).valueOf();
               if (lhsValue === rhsValue) {
                   return 0;
               }
               else {
                   return (lhsValue < rhsValue ? -1 * order : 1 * order);
               }
           }
       };
   }
   /**
    * @en Get generic comparator function by comparative operator.
    * @ja 比較演算子を用いた汎用比較関数の取得
    *
    * @param prop
    *  - `en` property name
    *  - `ja` プロパティ名を指定
    * @param order
    *  - `en` sort order code
    *  - `ja` ソート順を指定
    */
   function getGenericComparator(prop, order) {
       return (lhs, rhs) => {
           if (lhs[prop] === rhs[prop]) {
               return 0;
           }
           else if (null == lhs[prop]) {
               // undefined は最低値扱い (昇順時に先頭へ)
               return -1 * order;
           }
           else if (null == rhs[prop]) {
               // undefined は最低値扱い (昇順時に先頭へ)
               return 1 * order;
           }
           else {
               return (lhs[prop] < rhs[prop] ? -1 * order : 1 * order);
           }
       };
   }
   /**
    * @en Get boolean comparator function.
    * @ja 真偽値比較用関数を取得
    */
   const getBooleanComparator = getGenericComparator;
   /**
    * @en Get numeric comparator function.
    * @ja 数値比較用関数を取得
    */
   const getNumberComparator = getGenericComparator;
   /**
    * @en Convert to comparator from [[SortKey]].
    * @ja [[SortKey]] を comparator に変換
    */
   function toComparator(sortKey) {
       const propName = sortKey.name;
       switch (sortKey.type) {
           case 'string':
               return getStringComparator(propName, sortKey.order);
           case 'boolean':
               return getBooleanComparator(propName, sortKey.order);
           case 'number':
               return getNumberComparator(propName, sortKey.order);
           case 'date':
               return getDateComparator(propName, sortKey.order);
           default:
               return getGenericComparator(propName, sortKey.order);
       }
   }
   /**
    * @en Convert to comparator array from [[SortKey]] array.
    * @ja [[SortKey]] 配列を comparator 配列に変換
    */
   function convertSortKeys(sortKeys) {
       const comparators = [];
       for (const sortKey of sortKeys) {
           comparators.push(toComparator(sortKey));
       }
       return comparators;
   }

   /**
    * @en The class provides cursor interface for Array. <br>
    *     It is different from Iterator interface of es2015, and that provides interface which is similar to DB recordset's one.
    * @ja Array 用カーソル I/F を提供するクラス <br>
    *     es2015 の Iterator I/F とは異なり、DB recordset オブジェクトライクな走査 I/F を提供する
    */
   class ArrayCursor {
       /**
        * constructor
        *
        * @param array
        *  - `en` target array
        *  - `ja` 走査対象の配列を指定
        * @param initialIndex
        *  - `en` initial index. default: 0
        *  - `ja` 初期化する index を指定 default: 0
        */
       constructor(array, initialIndex = 0) {
           this._array = array;
           this._index = initialIndex;
           if (this.valid()) {
               this._bof = this._eof = false;
           }
           else {
               this._index = -1 /* OUT_OF_RANGE */;
               this._bof = true;
               this._eof = false;
           }
       }
       /**
        * @en Reset target array.
        * @ja 対象の再設定
        *
        * @param array
        *  - `en` target array. default: empty array.
        *  - `ja` 走査対象の配列を指定.   default: 空配列
        * @param initialIndex
        *  - `en` initial index. default: CURSOR.OUT_OF_RANGE
        *  - `ja` 初期化する index を指定 default: CURSOR.OUT_OF_RANGE
        */
       reset(array = [], initialIndex = -1 /* OUT_OF_RANGE */) {
           this._array = array;
           this._index = initialIndex;
           if (this.valid()) {
               this._bof = this._eof = false;
           }
           else {
               this._index = -1 /* OUT_OF_RANGE */;
               this._bof = true;
               this._eof = false;
           }
           return this;
       }
       ///////////////////////////////////////////////////////////////////////
       // accessors:
       /**
        * @en Access to current element.
        * @ja 現在の要素にアクセス
        */
       get current() {
           return this._array[this._index];
       }
       /**
        * @en Get current index.
        * @ja 現在指し示している index を取得
        */
       get index() {
           return this._index;
       }
       /**
        * @en Get target array length.
        * @ja 走査対象の要素数を取得
        */
       get length() {
           return this._array.length;
       }
       /**
        * @en Judge BOF or not.
        * @ja 要素外の先頭か判定
        */
       get isBOF() {
           return this._bof;
       }
       /**
        * @en Judge EOF or not.
        * @ja 要素外の末尾か判定
        */
       get isEOF() {
           return this._eof;
       }
       /**
        * @en Access to raw array instance.
        * @ja 走査対象にアクセス
        */
       get array() {
           return this._array;
       }
       ///////////////////////////////////////////////////////////////////////
       // cursor operation:
       /**
        * @en Move to first element position.
        * @ja 先頭要素へ移動
        */
       moveFirst() {
           this._index = 0;
           this._bof = this._eof = false;
           if (!this.valid()) {
               this._index = -1 /* OUT_OF_RANGE */;
               this._bof = true;
           }
           return this;
       }
       /**
        * @en Move to last element position.
        * @ja 末尾要素へ移動
        */
       moveLast() {
           this._index = this._array.length - 1;
           this._bof = this._eof = false;
           if (!this.valid()) {
               this._eof = true;
           }
           return this;
       }
       /**
        * @en Move to next element position.
        * @ja カーソルを次へ移動
        */
       moveNext() {
           if (this._bof) {
               this._bof = false;
               this._index = 0;
           }
           else {
               this._index++;
           }
           if (!this.valid()) {
               this._index = -1 /* OUT_OF_RANGE */;
               this._eof = true;
           }
           return this;
       }
       /**
        * @en Move to previous element position.
        * @ja カーソルを前へ移動
        */
       movePrevious() {
           if (this._eof) {
               this._eof = false;
               this._index = this.length - 1;
           }
           else {
               this._index--;
           }
           if (!this.valid()) {
               this._index = -1 /* OUT_OF_RANGE */;
               this._bof = true;
           }
           return this;
       }
       /**
        * @en Seek by passed criteria. <br>
        *     If the operation failed, the cursor position set to EOF.
        * @ja 指定条件でシーク <br>
        *     シークに失敗した場合は EOF 状態になる
        *
        * @param criteria
        *  - `en` index or seek expression
        *  - `ja` index / 条件式を指定
        */
       seek(criteria) {
           if ('number' === typeof criteria) {
               this._index = criteria;
           }
           else {
               this._index = this._array.findIndex(criteria);
           }
           if (!this.valid()) {
               this._index = -1 /* OUT_OF_RANGE */;
               this._bof = false;
               this._eof = true;
           }
           return this;
       }
       ///////////////////////////////////////////////////////////////////////
       // private methods:
       /**
        * カーソルが有効な範囲を示しているか判定
        *
        * @internal
        *
        * @returns true: 有効 / false: 無効
        */
       valid() {
           return (0 <= this._index && this._index < this._array.length);
       }
   }

   /** @internal wait for change detection */
   function makePromise(editor, remap) {
       return new Promise(resolve => {
           const callback = (records) => {
               editor.off(callback);
               if (remap) {
                   remap.length = 0;
                   remap.push(...editor);
               }
               resolve(records);
           };
           editor.on(callback);
       });
   }
   /** @internal convert to [[ObservableArray]] if needed. */
   async function getEditContext(target, token) {
       if (target instanceof observable.ObservableArray) {
           await promise.checkCanceled(token);
           return {
               editor: target,
               promise: makePromise(target),
           };
       }
       else if (Array.isArray(target)) {
           const editor = observable.ObservableArray.from(target);
           await promise.checkCanceled(token);
           return {
               editor,
               promise: makePromise(editor, target),
           };
       }
       else {
           throw result.makeResult(result.RESULT_CODE.NOT_SUPPORTED, 'target is not Array or ObservableArray.');
       }
   }
   /**
    * @en Clear all array elements.
    * @ja 配列の全削除
    *
    * @param target
    *  - `en` target array
    *  - `ja` 対象配列
    * @param token
    *  - `en` [[CancelToken]] reference. (enable `undefined`)
    *  - `ja` [[CancelToken]] を指定 (undefined 可)
    * @returns
    *  - `en` Changed information
    *  - `ja` 変更情報
    */
   async function clearArray(target, token) {
       if (target.length <= 0) {
           return [];
       }
       const { editor, promise } = await getEditContext(target, token);
       editor.splice(0, target.length);
       return promise;
   }
   /**
    * @en Append source elements to the end of array.
    * @ja 配列の末尾に追加
    *
    * @param target
    *  - `en` target array
    *  - `ja` 対象配列
    * @param src
    *  - `en` source elements
    *  - `ja` 追加元要素
    * @param token
    *  - `en` [[CancelToken]] reference. (enable `undefined`)
    *  - `ja` [[CancelToken]] を指定 (undefined 可)
    * @returns
    *  - `en` Changed information
    *  - `ja` 変更情報
    */
   async function appendArray(target, src, token) {
       if (null == src || src.length <= 0) {
           return [];
       }
       const { editor, promise } = await getEditContext(target, token);
       editor.push(...src);
       return promise;
   }
   /**
    * @en Insert source elements to specified index of array.
    * @ja 指定した位置に挿入
    *
    * @param target
    *  - `en` target array
    *  - `ja` 対象配列
    * @param index
    *  - `ja` target array position index
    *  - `ja` 追加先のインデックス
    * @param src
    *  - `en` source elements
    *  - `ja` 追加元要素
    * @param token
    *  - `en` [[CancelToken]] reference. (enable `undefined`)
    *  - `ja` [[CancelToken]] を指定 (undefined 可)
    * @returns
    *  - `en` Changed information
    *  - `ja` 変更情報
    */
   async function insertArray(target, index, src, token) {
       // 最後の要素に追加するため index == target.length を許容
       if (index < 0 || target.length < index || Math.trunc(index) !== index) {
           throw result.makeResult(result.RESULT_CODE.NOT_SUPPORTED, `insertArray(), index is invalid. index: ${index}`);
       }
       else if (null == src || src.length <= 0) {
           return [];
       }
       const { editor, promise } = await getEditContext(target, token);
       editor.splice(index, 0, ...src);
       return promise;
   }
   /**
    * @en Reorder array elements position.
    * @ja 項目の位置を変更
    *
    * @param target
    *  - `en` target array
    *  - `ja` 対象配列
    * @param index
    *  - `ja` target array position index
    *  - `ja` 追加先のインデックス
    * @param orders
    *  - `en` edit order index array
    *  - `ja` インデックス配列
    * @param token
    *  - `en` [[CancelToken]] reference. (enable `undefined`)
    *  - `ja` [[CancelToken]] を指定 (undefined 可)
    * @returns
    *  - `en` Changed information
    *  - `ja` 変更情報
    */
   async function reorderArray(target, index, orders, token) {
       // 最後の要素に追加するため index == target.length を許容
       if (index < 0 || target.length < index || Math.trunc(index) !== index) {
           throw result.makeResult(result.RESULT_CODE.NOT_SUPPORTED, `insertArray(), index is invalid. index: ${index}`);
       }
       else if (null == orders || orders.length <= 0) {
           return [];
       }
       const { editor, promise } = await getEditContext(target, token);
       // 作業配列で編集
       let work = Array.from(editor);
       {
           const reorders = [];
           for (const order of coreUtils.unique(orders)) {
               reorders.push(editor[order]);
               work[order] = null;
           }
           work.splice(index, 0, ...reorders);
           work = work.filter((value) => {
               return null != value;
           });
       }
       // 値を書き戻し
       for (const idx of work.keys()) {
           editor[idx] = work[idx];
       }
       return promise;
   }
   /**
    * @en Remove array elements.
    * @ja 項目の削除
    *
    * @param target
    *  - `en` target array
    *  - `ja` 対象配列
    * @param orders
    *  - `en` removed order index array
    *  - `ja` インデックス配列
    * @param token
    *  - `en` [[CancelToken]] reference. (enable `undefined`)
    *  - `ja` [[CancelToken]] を指定 (undefined 可)
    * @returns
    *  - `en` Changed information
    *  - `ja` 変更情報
    */
   async function removeArray(target, orders, token) {
       if (null == orders || orders.length <= 0) {
           return [];
       }
       const { editor, promise } = await getEditContext(target, token);
       // 降順ソート
       orders.sort((lhs, rhs) => {
           return (lhs < rhs ? 1 : -1);
       });
       for (const order of coreUtils.unique(orders)) {
           editor.splice(order, 1);
       }
       return promise;
   }

   /* eslint-disable
      @typescript-eslint/no-explicit-any
    */
   /** @internal DynamicPackageOperator.EQUAL */
   function equal(prop, value) {
       return (item) => item[prop] === value;
   }
   /** @internal DynamicPackageOperator.NOT_EQUAL */
   function notEqual(prop, value) {
       return (item) => item[prop] !== value;
   }
   /** @internal DynamicPackageOperator.GREATER */
   function greater(prop, value) {
       return (item) => item[prop] > value;
   }
   /** @internal DynamicPackageOperator.LESS */
   function less(prop, value) {
       return (item) => item[prop] < value;
   }
   /** @internal DynamicPackageOperator.GREATER_EQUAL */
   function greaterEqual(prop, value) {
       return (item) => item[prop] >= value;
   }
   /** @internal DynamicPackageOperator.LESS_EQUAL */
   function lessEqual(prop, value) {
       return (item) => item[prop] <= value;
   }
   /** @internal DynamicPackageOperator.LIKE */
   function like(prop, value) {
       return (item) => -1 !== String(item[prop]).toLocaleLowerCase().indexOf(value.toLocaleLowerCase());
   }
   /** @internal DynamicPackageOperator.NOT_LIKE */
   function notLike(prop, value) {
       return (item) => -1 === String(item[prop]).toLocaleLowerCase().indexOf(value.toLocaleLowerCase());
   }
   /** @internal DynamicPackageOperator.DATE_LESS_EQUAL */
   function dateLessEqual(prop, value, unit) {
       return (item) => {
           const date = coreUtils.computeDate(new Date(), -1 * value, unit);
           return date <= item[prop];
       };
   }
   /** @internal DynamicPackageOperator.DATE_LESS_NOT_EQUAL */
   function dateLessNotEqual(prop, value, unit) {
       return (item) => {
           const date = coreUtils.computeDate(new Date(), -1 * value, unit);
           return !(date <= item[prop]);
       };
   }
   /** @internal DynamicPackageOperator.RANGE */
   function range(prop, min, max) {
       return combination(0 /* AND */, greaterEqual(prop, min), lessEqual(prop, max));
   }
   /** @internal フィルタの合成 */
   function combination(type, lhs, rhs) {
       return !rhs ? lhs : (item) => {
           switch (type) {
               case 0 /* AND */:
                   return lhs(item) && rhs(item);
               case 1 /* OR */:
                   return lhs(item) || rhs(item);
               default:
                   console.warn(`unknown combination: ${type}`);
                   // fail safe
                   return lhs(item) && rhs(item);
           }
       };
   }

   /**
    * @en Dynamic query condition manager class.
    * @ja ダイナミッククエリ状態管理クラス
    */
   class DynamicCondition {
       /**
        * constructor
        *
        * @param seeds
        *  - `en` [[DynamicConditionSeed]] instance
        *  - `ja` [[DynamicConditionSeed]] インスタンス
        */
       constructor(seeds = { operators: [] }) {
           const { operators, combination, sumKeys, limit, random, sortKeys } = seeds;
           this._operators = operators;
           this._combination = null != combination ? combination : 0 /* AND */;
           this._sumKeys = null != sumKeys ? sumKeys : [];
           this._limit = limit;
           this._random = !!random;
           this._sortKeys = sortKeys || [];
       }
       ///////////////////////////////////////////////////////////////////////
       // implements: DynamicConditionSeed
       get operators() {
           return this._operators;
       }
       set operators(values) {
           this._operators = values;
       }
       get sumKeys() {
           return this._sumKeys;
       }
       set sumKeys(values) {
           this._sumKeys = values;
       }
       get combination() {
           return this._combination;
       }
       set combination(value) {
           this._combination = value;
       }
       get limit() {
           return this._limit;
       }
       set limit(value) {
           this._limit = value;
       }
       get random() {
           return this._random;
       }
       set random(value) {
           this._random = value;
       }
       get sortKeys() {
           return this._sortKeys;
       }
       set sortKeys(values) {
           this._sortKeys = values;
       }
       ///////////////////////////////////////////////////////////////////////
       // public accessor:
       /**
        * @en Get comparator functions.
        * @ja 比較関数取得
        */
       get comparators() {
           return convertSortKeys(this._sortKeys);
       }
       /**
        * @en Get synthesis filter function.
        * @ja 合成済みフィルタ関数取得
        */
       get filter() {
           let fltr;
           for (const cond of this._operators) {
               switch (cond.operator) {
                   case 0 /* EQUAL */:
                       fltr = combination(this._combination, equal(cond.prop, cond.value), fltr);
                       break;
                   case 1 /* NOT_EQUAL */:
                       fltr = combination(this._combination, notEqual(cond.prop, cond.value), fltr);
                       break;
                   case 2 /* GREATER */:
                       fltr = combination(this._combination, greater(cond.prop, cond.value), fltr);
                       break;
                   case 3 /* LESS */:
                       fltr = combination(this._combination, less(cond.prop, cond.value), fltr);
                       break;
                   case 4 /* GREATER_EQUAL */:
                       fltr = combination(this._combination, greaterEqual(cond.prop, cond.value), fltr);
                       break;
                   case 5 /* LESS_EQUAL */:
                       fltr = combination(this._combination, lessEqual(cond.prop, cond.value), fltr);
                       break;
                   case 6 /* LIKE */:
                       fltr = combination(this._combination, like(cond.prop, cond.value), fltr);
                       break;
                   case 7 /* NOT_LIKE */:
                       fltr = combination(this._combination, notLike(cond.prop, cond.value), fltr);
                       break;
                   case 8 /* DATE_LESS_EQUAL */:
                       fltr = combination(this._combination, dateLessEqual(cond.prop, cond.value, cond.unit), fltr);
                       break;
                   case 9 /* DATE_LESS_NOT_EQUAL */:
                       fltr = combination(this._combination, dateLessNotEqual(cond.prop, cond.value, cond.unit), fltr);
                       break;
                   case 10 /* RANGE */:
                       fltr = combination(this._combination, range(cond.prop, cond.value, cond.range), fltr);
                       break;
                   default:
                       console.warn(`unknown operator: ${cond.operator}`);
                       break;
               }
           }
           return fltr || (( /* item */) => true);
       }
   }

   const { trunc } = Math;
   //__________________________________________________________________________________________________//
   /**
    * @en Apply `filter` and `sort key` to the `items` from [[queryItems]]`()` result.
    * @ja [[queryItems]]`()` した `items` に対して `filter` と `sort key` を適用
    */
   function searchItems(items, filter, ...comparators) {
       let result = coreUtils.isFunction(filter) ? items.filter(filter) : items.slice();
       for (const comparator of comparators) {
           if (coreUtils.isFunction(comparator)) {
               result = coreUtils.sort(result, comparator);
           }
       }
       return result;
   }
   //__________________________________________________________________________________________________//
   /** @internal すでにキャッシュされている対象に対して CollectionQueryOptions に指定された振る舞いを行う内部 query 関数 */
   async function queryFromCache(cached, options) {
       const { filter, comparators, index: baseIndex, limit, cancel: token, progress, auto, noSearch, } = options;
       // キャッシュに対してフィルタリング, ソートを実行
       const targets = noSearch ? cached.slice() : searchItems(cached, filter, ...comparators);
       let index = (null != baseIndex) ? baseIndex : 0;
       while (true) {
           await promise.checkCanceled(token);
           if (index < 0 || targets.length <= index || trunc(index) !== index) {
               throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
           }
           else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
               throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${options.limit}`);
           }
           const opts = Object.assign(options, { index });
           const result$1 = targets.slice(index, (null != limit) ? index + limit : undefined);
           const retval = {
               total: targets.length,
               items: result$1,
               options: { ...opts },
           };
           // 進捗通知
           if (coreUtils.isFunction(progress)) {
               progress({ ...retval });
           }
           if (auto && null != limit) {
               if (targets.length <= index + limit) {
                   // 自動継続指定時には最後にすべての item を返却
                   retval.items = targets;
               }
               else {
                   index += result$1.length;
                   continue;
               }
           }
           return retval;
       }
   }
   /** @internal `provider` 関数を使用して CollectionQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
   async function queryFromProvider(provider, options) {
       const { index: baseIndex, limit, cancel: token, progress, auto, } = options;
       const targets = [];
       let index = (null != baseIndex) ? baseIndex : 0;
       while (true) {
           await promise.checkCanceled(token);
           if (index < 0 || trunc(index) !== index) {
               throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
           }
           else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
               throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${options.limit}`);
           }
           const opts = Object.assign(options, { index });
           const result$1 = await provider(opts);
           targets.push(...result$1.items);
           const retval = {
               total: result$1.total,
               items: result$1.items,
               options: Object.assign({}, opts, result$1.options),
           };
           // 進捗通知
           if (coreUtils.isFunction(progress)) {
               progress({ ...retval });
           }
           if (auto && null != limit) {
               if (result$1.total <= index + limit) {
                   // 自動継続指定時には最後にすべての item を返却
                   retval.items = targets;
               }
               else {
                   index += result$1.items.length;
                   continue;
               }
           }
           return retval;
       }
   }
   //__________________________________________________________________________________________________//
   /** @internal conditinalFix に使用する Criteria Map */
   const _limitCriteria = {
       [0 /* COUNT */]: null,
       [1 /* SUM */]: { coeff: 1 },
       [2 /* SECOND */]: { coeff: 1000 },
       [3 /* MINUTE */]: { coeff: 60 * 1000 },
       [4 /* HOUR */]: { coeff: 60 * 60 * 1000 },
       [5 /* DAY */]: { coeff: 24 * 60 * 60 * 1000 },
       [6 /* KB */]: { coeff: 1024 },
       [7 /* MB */]: { coeff: 1024 * 1024 },
       [8 /* GB */]: { coeff: 1024 * 1024 * 1024 },
       [9 /* TB */]: { coeff: 1024 * 1024 * 1024 * 1024 },
   };
   /**
    * @en Fix the target items by [[DynamicCondition]].
    * @ja [[DynamicCondition]] に従い対象を整形
    *
    * @param items
    *  - `en` target items (destructive)
    *  - `ja` 対象のアイテム (破壊的)
    * @param condition
    *  - `en` condition object
    *  - `ja` 条件オブジェクト
    */
   function conditionalFix(items, condition) {
       const { random, limit, sumKeys } = condition;
       if (random) {
           coreUtils.shuffle(items, true);
       }
       if (limit) {
           const { unit, value, prop } = limit;
           const reset = [];
           const criteria = _limitCriteria[unit];
           const limitCount = value;
           const excess = !!limit.excess;
           let count = 0;
           for (const item of items) {
               if (!criteria) {
                   count++;
               }
               else if (null != item[prop]) {
                   count += (Number(item[prop]) / criteria.coeff);
               }
               else {
                   console.warn(`cannot access property: ${prop}`);
                   continue;
               }
               if (limitCount < count) {
                   if (excess) {
                       reset.push(item);
                   }
                   break;
               }
               else {
                   reset.push(item);
               }
           }
           items = reset;
       }
       const result = {
           total: items.length,
           items,
       };
       if (0 < sumKeys.length) {
           for (const item of items) {
               for (const key of sumKeys) {
                   if (!(key in result)) {
                       result[key] = 0;
                   }
                   result[key] += Number(item[key]);
               }
           }
       }
       return result;
   }
   //__________________________________________________________________________________________________//
   /** @internal SafeCollectionQueryOptions に変換 */
   function ensureOptions(options) {
       const opts = Object.assign({ sortKeys: [] }, options);
       const { noSearch, sortKeys } = opts;
       if (!noSearch && (!opts.comparators || opts.comparators.length <= 0)) {
           opts.comparators = convertSortKeys(sortKeys);
       }
       return opts;
   }
   /** @internal キャッシュ可能か判定 */
   function canCache(result, options) {
       const { noCache, noSearch } = options;
       return !noCache && !noSearch && result.total === result.items.length;
   }
   /**
    * @en Low level function for [[Collection]] query items.
    * @ja [[Collection]] Item をクエリする低レベル関数
    *
    * @param queryInfo
    *  - `en` query information
    *  - `ja` クエリ情報
    * @param provider
    *  - `en` provider function
    *  - `ja` プロバイダ関数
    * @param options
    *  - `en` query options
    *  - `ja` クエリオプション
    */
   async function queryItems(queryInfo, provider, options) {
       const opts = ensureOptions(options);
       const { sortKeys, comparators, filter } = opts;
       // query に使用した sort, filter 情報をキャッシュ
       queryInfo.sortKeys = sortKeys;
       queryInfo.comparators = comparators;
       queryInfo.filter = filter;
       if (queryInfo.cache) {
           return (await queryFromCache(queryInfo.cache.items, opts)).items;
       }
       else {
           let result = await queryFromProvider(provider, opts);
           const nextOpts = result.options;
           if (canCache(result, nextOpts)) {
               queryInfo.cache = { ...result };
               delete queryInfo.cache.options;
           }
           const { noSearch, condition: seed } = nextOpts;
           if (seed) {
               const condition = new DynamicCondition(seed);
               result = conditionalFix(searchItems(result.items, condition.filter, ...condition.comparators), condition);
               if (queryInfo.cache) {
                   Object.assign(queryInfo.cache, result);
                   delete queryInfo.cache.options;
               }
           }
           return noSearch ? result.items : searchItems(result.items, filter, ...comparators);
       }
   }

   exports.ArrayCursor = ArrayCursor;
   exports.DynamicCondition = DynamicCondition;
   exports.appendArray = appendArray;
   exports.clearArray = clearArray;
   exports.conditionalFix = conditionalFix;
   exports.convertSortKeys = convertSortKeys;
   exports.defaultCollatorProvider = defaultCollatorProvider;
   exports.getBooleanComparator = getBooleanComparator;
   exports.getDateComparator = getDateComparator;
   exports.getGenericComparator = getGenericComparator;
   exports.getNumberComparator = getNumberComparator;
   exports.getStringComparator = getStringComparator;
   exports.insertArray = insertArray;
   exports.queryItems = queryItems;
   exports.removeArray = removeArray;
   exports.reorderArray = reorderArray;
   exports.searchItems = searchItems;
   exports.toComparator = toComparator;

   Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAsIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQ09MTEVDVElPTiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDEwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX01PREVMX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUyA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAxLCAnaW52YWxpZCBhY2Nlc3MuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZ2V0TGFuZ3VhZ2UgfSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBTb3J0T3JkZXIsXG4gICAgU29ydENhbGxiYWNrLFxuICAgIFNvcnRLZXksXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBgSW50bC5Db2xsYXRvcmAgZmFjdG9yeSBmdW5jdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEgYEludGwuQ29sbGF0b3JgIOOCkui/lOWNtOOBmeOCi+mWouaVsOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsYXRvclByb3ZpZGVyID0gKCkgPT4gSW50bC5Db2xsYXRvcjtcblxuLyoqIEBpbnRlcm5hbCBkZWZhdWx0IEludGwuQ29sbGF0b3IgcHJvdmlkZXIgKi9cbmxldCBfY29sbGF0b3I6IENvbGxhdG9yUHJvdmlkZXIgPSAoKTogSW50bC5Db2xsYXRvciA9PiB7XG4gICAgcmV0dXJuIG5ldyBJbnRsLkNvbGxhdG9yKGdldExhbmd1YWdlKCksIHsgc2Vuc2l0aXZpdHk6ICdiYXNlJywgbnVtZXJpYzogdHJ1ZSB9KTtcbn07XG5cbi8qKlxuICogQGphIOaXouWumuOBriBJbnRsLkNvbGxhdG9yIOOCkuioreWumlxuICpcbiAqIEBwYXJhbSBuZXdQcm92aWRlclxuICogIC0gYGVuYCBuZXcgW1tDb2xsYXRvclByb3ZpZGVyXV0gb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC5cbiAqICAtIGBqYWAg6Kit5a6a44GV44KM44Gm44GE44GfIFtbQ29sbGF0b3JQcm92aWRlcl1dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdENvbGxhdG9yUHJvdmlkZXIobmV3UHJvdmlkZXI/OiBDb2xsYXRvclByb3ZpZGVyKTogQ29sbGF0b3JQcm92aWRlciB7XG4gICAgaWYgKG51bGwgPT0gbmV3UHJvdmlkZXIpIHtcbiAgICAgICAgcmV0dXJuIF9jb2xsYXRvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRQcm92aWRlciA9IF9jb2xsYXRvcjtcbiAgICAgICAgX2NvbGxhdG9yID0gbmV3UHJvdmlkZXI7XG4gICAgICAgIHJldHVybiBvbGRQcm92aWRlcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEdldCBzdHJpbmcgY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDmloflrZfliJfmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCBwcm9wZXJ0eSBuYW1lXG4gKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICogQHBhcmFtIG9yZGVyXG4gKiAgLSBgZW5gIHNvcnQgb3JkZXIgY29kZVxuICogIC0gYGphYCDjgr3jg7zjg4jpoIbjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIC8vIHVuZGVmaW5lZCDjga8gJycg44Go5ZCM562J44Gr5omx44GGXG4gICAgICAgIGNvbnN0IGxoc1Byb3AgPSAobnVsbCAhPSBsaHNbcHJvcCBhcyBzdHJpbmddKSA/IGxoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgY29uc3QgcmhzUHJvcCA9IChudWxsICE9IHJoc1twcm9wIGFzIHN0cmluZ10pID8gcmhzW3Byb3AgYXMgc3RyaW5nXSA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wIGFzIHN0cmluZ107XG4gICAgICAgIGNvbnN0IHJoc0RhdGUgPSByaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobGhzRGF0ZSA9PT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gKHVuZGVmaW5lZCA9PT0gdW5kZWZpbmVkKSBvciDoh6rlt7Hlj4LnhadcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNEYXRlKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbGhzVmFsdWUgPSBPYmplY3QobGhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgY29uc3QgcmhzVmFsdWUgPSBPYmplY3QocmhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgaWYgKGxoc1ZhbHVlID09PSByaHNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGxoc1ZhbHVlIDwgcmhzVmFsdWUgPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBnZW5lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24gYnkgY29tcGFyYXRpdmUgb3BlcmF0b3IuXG4gKiBAamEg5q+U6LyD5ryU566X5a2Q44KS55So44GE44Gf5rGO55So5q+U6LyD6Zai5pWw44Gu5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGxoc1twcm9wIGFzIHN0cmluZ10gPT09IHJoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcCBhcyBzdHJpbmddIDwgcmhzW3Byb3AgYXMgc3RyaW5nXSA/IC0xICogb3JkZXIgOiAxICogb3JkZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGJvb2xlYW4gY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDnnJ/lgb3lgKTmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEJvb2xlYW5Db21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIEdldCBudW1lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pWw5YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXROdW1iZXJDb21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBmcm9tIFtbU29ydEtleV1dLlxuICogQGphIFtbU29ydEtleV1dIOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHByb3BOYW1lID0gc29ydEtleS5uYW1lO1xuICAgIHN3aXRjaCAoc29ydEtleS50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4ocHJvcE5hbWUsIHNvcnRLZXkub3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIFtbU29ydEtleV1dIGFycmF5LlxuICogQGphIFtbU29ydEtleV1dIOmFjeWIl+OCkiBjb21wYXJhdG9yIOmFjeWIl+OBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNvcnRLZXlzPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXlzOiBTb3J0S2V5PEs+W10pOiBTb3J0Q2FsbGJhY2s8VD5bXSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUPltdID0gW107XG4gICAgZm9yIChjb25zdCBzb3J0S2V5IG9mIHNvcnRLZXlzKSB7XG4gICAgICAgIGNvbXBhcmF0b3JzLnB1c2godG9Db21wYXJhdG9yKHNvcnRLZXkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBhcmF0b3JzO1xufVxuIiwiLyoqXG4gKiBAZW4gQ3Vyc29yIHBvc2l0aW9uIGNvbnN0YW50LlxuICogQGphIOOCq+ODvOOCveODq+S9jee9ruWumuaVsFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDdXJzb3JQb3Mge1xuICAgIE9VVF9PRl9SQU5HRSAgICA9IC0xLFxuICAgIENVUlJFTlQgICAgICAgICA9IC0yLFxufVxuXG4vKipcbiAqIEBlbiBTZWVrIGV4cHJlc3Npb24gZnVuY3Rpb24gdHlwZS5cbiAqIEBqYSDjgrfjg7zjgq/lvI/plqLmlbDlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vla0V4cDxUPiA9ICh2YWx1ZTogVCwgaW5kZXg/OiBudW1iZXIsIG9iaj86IFRbXSkgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHByb3ZpZGVzIGN1cnNvciBpbnRlcmZhY2UgZm9yIEFycmF5LiA8YnI+XG4gKiAgICAgSXQgaXMgZGlmZmVyZW50IGZyb20gSXRlcmF0b3IgaW50ZXJmYWNlIG9mIGVzMjAxNSwgYW5kIHRoYXQgcHJvdmlkZXMgaW50ZXJmYWNlIHdoaWNoIGlzIHNpbWlsYXIgdG8gREIgcmVjb3Jkc2V0J3Mgb25lLlxuICogQGphIEFycmF5IOeUqOOCq+ODvOOCveODqyBJL0Yg44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBlczIwMTUg44GuIEl0ZXJhdG9yIEkvRiDjgajjga/nlbDjgarjgorjgIFEQiByZWNvcmRzZXQg44Kq44OW44K444Kn44Kv44OI44Op44Kk44Kv44Gq6LWw5p+7IEkvRiDjgpLmj5DkvpvjgZnjgotcbiAqL1xuZXhwb3J0IGNsYXNzIEFycmF5Q3Vyc29yPFQgPSBhbnk+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLyoqIEBpbnRlcm5hbCDlr77osaHjga7phY3liJcgICovXG4gICAgcHJpdmF0ZSBfYXJyYXk6IFRbXTtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruWFiOmgreOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICAqL1xuICAgIHByaXZhdGUgX2JvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruacq+WwvuOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfZW9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg54++5Zyo44GuIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogMFxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiAwXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXJyYXk6IFRbXSwgaW5pdGlhbEluZGV4ID0gMCkge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgdGFyZ2V0IGFycmF5LlxuICAgICAqIEBqYSDlr77osaHjga7lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5LiBkZWZhdWx0OiBlbXB0eSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+Wumi4gICBkZWZhdWx0OiDnqbrphY3liJdcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoYXJyYXk6IFRbXSA9IFtdLCBpbml0aWFsSW5kZXg6IG51bWJlciA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0UpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGN1cnJlbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheVt0aGlzLl9pbmRleF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjmjIfjgZfnpLrjgZfjgabjgYTjgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRhcmdldCBhcnJheSBsZW5ndGguXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBruimgee0oOaVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgQk9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5YWI6aCt44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQk9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBFT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7mnKvlsL7jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lb2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByYXcgYXJyYXkgaW5zdGFuY2UuXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBhcnJheSgpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY3Vyc29yIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGZpcnN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOWFiOmgreimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlRmlyc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBsYXN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOacq+Wwvuimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTGFzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIG5leHQgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5qyh44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVOZXh0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZikge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIHByZXZpb3VzIGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuWJjeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlUHJldmlvdXMoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fZW9mKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VlayBieSBwYXNzZWQgY3JpdGVyaWEuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG9wZXJhdGlvbiBmYWlsZWQsIHRoZSBjdXJzb3IgcG9zaXRpb24gc2V0IHRvIEVPRi5cbiAgICAgKiBAamEg5oyH5a6a5p2h5Lu244Gn44K344O844KvIDxicj5cbiAgICAgKiAgICAg44K344O844Kv44Gr5aSx5pWX44GX44Gf5aC05ZCI44GvIEVPRiDnirbmhYvjgavjgarjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjcml0ZXJpYVxuICAgICAqICAtIGBlbmAgaW5kZXggb3Igc2VlayBleHByZXNzaW9uXG4gICAgICogIC0gYGphYCBpbmRleCAvIOadoeS7tuW8j+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzZWVrKGNyaXRlcmlhOiBudW1iZXIgfCBTZWVrRXhwPFQ+KTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBjcml0ZXJpYSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBjcml0ZXJpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkuZmluZEluZGV4KGNyaXRlcmlhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIOOCq+ODvOOCveODq+OBjOacieWKueOBquevhOWbsuOCkuekuuOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0cnVlOiDmnInlirkgLyBmYWxzZTog54Sh5Yq5XG4gICAgICovXG4gICAgcHJpdmF0ZSB2YWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICgwIDw9IHRoaXMuX2luZGV4ICYmIHRoaXMuX2luZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmlxdWUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxUb2tlbixcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5LCBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuLyoqIEBpbnRlcm5hbCB3YWl0IGZvciBjaGFuZ2UgZGV0ZWN0aW9uICovXG5mdW5jdGlvbiBtYWtlUHJvbWlzZTxUPihlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPiwgcmVtYXA/OiBUW10pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGVkaXRvci5vZmYoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICAgICAgcmVtYXAubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICByZW1hcC5wdXNoKC4uLmVkaXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHJlY29yZHMpO1xuICAgICAgICB9O1xuICAgICAgICBlZGl0b3Iub24oY2FsbGJhY2spO1xuICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgdG8gW1tPYnNlcnZhYmxlQXJyYXldXSBpZiBuZWVkZWQuICovXG5hc3luYyBmdW5jdGlvbiBnZXRFZGl0Q29udGV4dDxUPihcbiAgICB0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSxcbiAgICB0b2tlbj86IENhbmNlbFRva2VuXG4pOiBQcm9taXNlPHsgZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD47IHByb21pc2U6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT47IH0+IHwgbmV2ZXIge1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yOiB0YXJnZXQsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZSh0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvciA9IE9ic2VydmFibGVBcnJheS5mcm9tKHRhcmdldCk7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcixcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKGVkaXRvciwgdGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsICd0YXJnZXQgaXMgbm90IEFycmF5IG9yIE9ic2VydmFibGVBcnJheS4nKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKDAsIHRhcmdldC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnB1c2goLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBhcnJheS5cbiAqIEBqYSDmjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZShpbmRleCwgMCwgLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIGFycmF5IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gb3JkZXJzIHx8IG9yZGVycy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOmZjemghuOCveODvOODiFxuICAgIG9yZGVycy5zb3J0KChsaHMsIHJocykgPT4ge1xuICAgICAgICByZXR1cm4gKGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgIGVkaXRvci5zcGxpY2Uob3JkZXIsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyBLZXlzLCBjb21wdXRlRGF0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBGaWx0ZXJDYWxsYmFjaywgRHluYW1pY0NvbWJpbmF0aW9uIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZUFMTDxUPiA9IEV4dHJhY3Q8bnVtYmVyIHwgc3RyaW5nIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+ID0gRXh0cmFjdDxudW1iZXIgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZVN0cmluZzxUPiA9IEV4dHJhY3Q8c3RyaW5nLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIER5bmFtaWNPcGVyYXRvckRhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgdW5kZWZpbmVkO1xuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbDxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUFMTDxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gIT09IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuR1JFQVRFUiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyZWF0ZXI8VCBleHRlbmRzIHt9Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPiB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1MgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID49IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTU19FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3NFcXVhbDxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA8PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWtlPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IC0xICE9PSBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmRleE9mKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0xJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RMaWtlPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IC0xID09PSBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmRleE9mKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NFcXVhbDxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiBkYXRlIDw9IChpdGVtW3Byb3BdIGFzIGFueSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc05vdEVxdWFsPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuICEoZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyBhbnkpKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuUkFOR0UgKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZTxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIG1pbjogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPiwgbWF4OiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiBjb21iaW5hdGlvbihEeW5hbWljQ29tYmluYXRpb24uQU5ELCBncmVhdGVyRXF1YWwocHJvcCwgbWluKSwgbGVzc0VxdWFsKHByb3AsIG1heCkpO1xufVxuXG4vKiogQGludGVybmFsIOODleOCo+ODq+OCv+OBruWQiOaIkCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQgZXh0ZW5kcyB7fT4odHlwZTogRHluYW1pY0NvbWJpbmF0aW9uLCBsaHM6IEZpbHRlckNhbGxiYWNrPFQ+LCByaHM6IEZpbHRlckNhbGxiYWNrPFQ+IHwgdW5kZWZpbmVkKTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAhcmhzID8gbGhzIDogKGl0ZW06IFQpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5BTkQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5PUjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pIHx8IHJocyhpdGVtKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIGNvbWJpbmF0aW9uOiAke3R5cGV9YCk7XG4gICAgICAgICAgICAgICAgLy8gZmFpbCBzYWZlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwiaW1wb3J0IHsgS2V5cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxuICAgIER5bmFtaWNDb25kaXRpb25TZWVkLFxuICAgIER5bmFtaWNPcGVyYXRvckNvbnRleHQsXG4gICAgRHluYW1pY0xpbWl0Q29uZGl0aW9uLFxuICAgIER5bmFtaWNPcGVyYXRvcixcbiAgICBEeW5hbWljQ29tYmluYXRpb24sXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBWYWx1ZVR5cGVBTEwsXG4gICAgVmFsdWVUeXBlQ29tcGFyYWJsZSxcbiAgICBWYWx1ZVR5cGVTdHJpbmcsXG4gICAgZXF1YWwsXG4gICAgbm90RXF1YWwsXG4gICAgZ3JlYXRlcixcbiAgICBsZXNzLFxuICAgIGdyZWF0ZXJFcXVhbCxcbiAgICBsZXNzRXF1YWwsXG4gICAgbGlrZSxcbiAgICBub3RMaWtlLFxuICAgIGRhdGVMZXNzRXF1YWwsXG4gICAgZGF0ZUxlc3NOb3RFcXVhbCxcbiAgICByYW5nZSxcbiAgICBjb21iaW5hdGlvbixcbn0gZnJvbSAnLi9keW5hbWljLWZpbHRlcnMnO1xuXG4vKipcbiAqIEBlbiBEeW5hbWljIHF1ZXJ5IGNvbmRpdGlvbiBtYW5hZ2VyIGNsYXNzLlxuICogQGphIOODgOOCpOODiuODn+ODg+OCr+OCr+OCqOODqueKtuaFi+euoeeQhuOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY0NvbmRpdGlvbjxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4gaW1wbGVtZW50cyBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4ge1xuXG4gICAgcHJpdmF0ZSBfb3BlcmF0b3JzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdO1xuICAgIHByaXZhdGUgX2NvbWJpbmF0aW9uOiBEeW5hbWljQ29tYmluYXRpb247XG4gICAgcHJpdmF0ZSBfc3VtS2V5czogS2V5czxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9saW1pdD86IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT47XG4gICAgcHJpdmF0ZSBfcmFuZG9tOiBib29sZWFuO1xuICAgIHByaXZhdGUgX3NvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIFtbRHluYW1pY0NvbmRpdGlvblNlZWRdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkczogRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+ID0geyBvcGVyYXRvcnM6IFtdIH0pIHtcbiAgICAgICAgY29uc3QgeyBvcGVyYXRvcnMsIGNvbWJpbmF0aW9uLCBzdW1LZXlzLCBsaW1pdCwgcmFuZG9tLCBzb3J0S2V5cyB9ID0gc2VlZHM7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyAgICAgPSBvcGVyYXRvcnM7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uICAgPSBudWxsICE9IGNvbWJpbmF0aW9uID8gY29tYmluYXRpb24gOiBEeW5hbWljQ29tYmluYXRpb24uQU5EO1xuICAgICAgICB0aGlzLl9zdW1LZXlzICAgICAgID0gbnVsbCAhPSBzdW1LZXlzID8gc3VtS2V5cyA6IFtdO1xuICAgICAgICB0aGlzLl9saW1pdCAgICAgICAgID0gbGltaXQ7XG4gICAgICAgIHRoaXMuX3JhbmRvbSAgICAgICAgPSAhIXJhbmRvbTtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgICAgICA9IHNvcnRLZXlzIHx8IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IER5bmFtaWNDb25kaXRpb25TZWVkXG5cbiAgICBnZXQgb3BlcmF0b3JzKCk6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0b3JzO1xuICAgIH1cblxuICAgIHNldCBvcGVyYXRvcnModmFsdWVzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgc3VtS2V5cygpOiAoS2V5czxUSXRlbT4pW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3VtS2V5cztcbiAgICB9XG5cbiAgICBzZXQgc3VtS2V5cyh2YWx1ZXM6IChLZXlzPFRJdGVtPilbXSkge1xuICAgICAgICB0aGlzLl9zdW1LZXlzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIGdldCBjb21iaW5hdGlvbigpOiBEeW5hbWljQ29tYmluYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29tYmluYXRpb247XG4gICAgfVxuXG4gICAgc2V0IGNvbWJpbmF0aW9uKHZhbHVlOiBEeW5hbWljQ29tYmluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgbGltaXQoKTogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9saW1pdDtcbiAgICB9XG5cbiAgICBzZXQgbGltaXQodmFsdWU6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fbGltaXQgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgcmFuZG9tKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmFuZG9tO1xuICAgIH1cblxuICAgIHNldCByYW5kb20odmFsdWU6IGJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5fcmFuZG9tID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHNvcnRLZXlzKCk6IFNvcnRLZXk8VEtleT5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3J0S2V5cztcbiAgICB9XG5cbiAgICBzZXQgc29ydEtleXModmFsdWVzOiBTb3J0S2V5PFRLZXk+W10pIHtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIGFjY2Vzc29yOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb21wYXJhdG9yIGZ1bmN0aW9ucy5cbiAgICAgKiBAamEg5q+U6LyD6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0U29ydEtleXModGhpcy5fc29ydEtleXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc3ludGhlc2lzIGZpbHRlciBmdW5jdGlvbi5cbiAgICAgKiBAamEg5ZCI5oiQ5riI44G/44OV44Kj44Or44K/6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4ge1xuICAgICAgICBsZXQgZmx0cjogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29uZCBvZiB0aGlzLl9vcGVyYXRvcnMpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoY29uZC5vcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkVRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVBTEw8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVI6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlcjxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1M6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzczxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXNzRXF1YWw8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpa2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc0VxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc05vdEVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiwgY29uZC5yYW5nZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0b3I6ICR7Y29uZC5vcGVyYXRvcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciB8fCAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIHNvcnQsXG4gICAgc2h1ZmZsZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIFNvcnRLZXksXG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkZldGNoUmVzdWx0LFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBEeW5hbWljTGltaXQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMvY29tcGFyYXRvcic7XG5pbXBvcnQgeyBEeW5hbWljQ29uZGl0aW9uIH0gZnJvbSAnLi9keW5hbWljLWNvbmRpdGlvbic7XG5cbmNvbnN0IHsgdHJ1bmMgfSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwg5L2/55So44GZ44KL44OX44Ot44OR44OG44Kj44GM5L+d6Ki844GV44KM44GfIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMgKi9cbmludGVyZmFjZSBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+IGV4dGVuZHMgQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIHNvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG4gICAgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEFwcGx5IGBmaWx0ZXJgIGFuZCBgc29ydCBrZXlgIHRvIHRoZSBgaXRlbXNgIGZyb20gW1txdWVyeUl0ZW1zXV1gKClgIHJlc3VsdC5cbiAqIEBqYSBbW3F1ZXJ5SXRlbXNdXWAoKWAg44GX44GfIGBpdGVtc2Ag44Gr5a++44GX44GmIGBmaWx0ZXJgIOOBqCBgc29ydCBrZXlgIOOCkumBqeeUqFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoSXRlbXM8VEl0ZW0+KGl0ZW1zOiBUSXRlbVtdLCBmaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4gfCBudWxsLCAuLi5jb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdKTogVEl0ZW1bXSB7XG4gICAgbGV0IHJlc3VsdCA9IGlzRnVuY3Rpb24oZmlsdGVyKSA/IGl0ZW1zLmZpbHRlcihmaWx0ZXIpIDogaXRlbXMuc2xpY2UoKTtcbiAgICBmb3IgKGNvbnN0IGNvbXBhcmF0b3Igb2YgY29tcGFyYXRvcnMpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29tcGFyYXRvcikpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHNvcnQocmVzdWx0LCBjb21wYXJhdG9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCDjgZnjgafjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgabjgYTjgovlr77osaHjgavlr77jgZfjgaYgQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggcXVlcnkg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21DYWNoZTxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIGNhY2hlZDogVEl0ZW1bXSxcbiAgICBvcHRpb25zOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8Q29sbGVjdGlvbkZldGNoUmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgZmlsdGVyLFxuICAgICAgICBjb21wYXJhdG9ycyxcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgICAgICBub1NlYXJjaCxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBq+WvvuOBl+OBpuODleOCo+ODq+OCv+ODquODs+OCsCwg44K944O844OI44KS5a6f6KGMXG4gICAgY29uc3QgdGFyZ2V0cyA9IG5vU2VhcmNoID8gY2FjaGVkLnNsaWNlKCkgOiBzZWFyY2hJdGVtcyhjYWNoZWQsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSAobnVsbCAhPSBiYXNlSW5kZXgpID8gYmFzZUluZGV4IDogMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAkeyBvcHRpb25zLmxpbWl0IH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRhcmdldHMuc2xpY2UoaW5kZXgsIChudWxsICE9IGxpbWl0KSA/IGluZGV4ICsgbGltaXQgOiB1bmRlZmluZWQpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zOiByZXN1bHQsXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSBhcyBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtPixcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldHMubGVuZ3RoIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSB0YXJnZXRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSByZXN1bHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgYHByb3ZpZGVyYCDplqLmlbDjgpLkvb/nlKjjgZfjgaYgQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggYHF1ZXJ5YCDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbVByb3ZpZGVyPFRJdGVtIGV4dGVuZHMge30sIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25GZXRjaFJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IHRhcmdldHM6IFRJdGVtW10gPSBbXTtcblxuICAgIGxldCBpbmRleDogbnVtYmVyID0gKG51bGwgIT0gYmFzZUluZGV4KSA/IGJhc2VJbmRleCA6IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHtvcHRpb25zLmxpbWl0fWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgeyBpbmRleCB9KTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvdmlkZXIob3B0cyk7XG5cbiAgICAgICAgdGFyZ2V0cy5wdXNoKC4uLnJlc3VsdC5pdGVtcyk7XG5cbiAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgdG90YWw6IHJlc3VsdC50b3RhbCxcbiAgICAgICAgICAgIGl0ZW1zOiByZXN1bHQuaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zOiBPYmplY3QuYXNzaWduKHt9LCBvcHRzLCByZXN1bHQub3B0aW9ucykgYXMgQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbT4sXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkZldGNoUmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQudG90YWwgPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHRhcmdldHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IHJlc3VsdC5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY29uZGl0aW5hbEZpeCDjgavkvb/nlKjjgZnjgosgQ3JpdGVyaWEgTWFwICovXG5jb25zdCBfbGltaXRDcml0ZXJpYSA9IHtcbiAgICBbRHluYW1pY0xpbWl0LkNPVU5UXTogbnVsbCxcbiAgICBbRHluYW1pY0xpbWl0LlNVTV06ICAgICB7IGNvZWZmOiAxIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5TRUNPTkRdOiAgeyBjb2VmZjogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUlOVVRFXTogIHsgY29lZmY6IDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuSE9VUl06ICAgIHsgY29lZmY6IDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5EQVldOiAgICAgeyBjb2VmZjogMjQgKiA2MCAqIDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuS0JdOiAgICAgIHsgY29lZmY6IDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1CXTogICAgICB7IGNvZWZmOiAxMDI0ICogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuR0JdOiAgICAgIHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuVEJdOiAgICAgIHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbn07XG5cbi8qKlxuICogQGVuIEZpeCB0aGUgdGFyZ2V0IGl0ZW1zIGJ5IFtbRHluYW1pY0NvbmRpdGlvbl1dLlxuICogQGphIFtbRHluYW1pY0NvbmRpdGlvbl1dIOOBq+W+k+OBhOWvvuixoeOCkuaVtOW9olxuICpcbiAqIEBwYXJhbSBpdGVtc1xuICogIC0gYGVuYCB0YXJnZXQgaXRlbXMgKGRlc3RydWN0aXZlKVxuICogIC0gYGphYCDlr77osaHjga7jgqLjgqTjg4bjg6AgKOegtOWjiueahClcbiAqIEBwYXJhbSBjb25kaXRpb25cbiAqICAtIGBlbmAgY29uZGl0aW9uIG9iamVjdFxuICogIC0gYGphYCDmnaHku7bjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbmRpdGlvbmFsRml4PFRJdGVtIGV4dGVuZHMge30sIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PihcbiAgICBpdGVtczogVEl0ZW1bXSxcbiAgICBjb25kaXRpb246IER5bmFtaWNDb25kaXRpb248VEl0ZW0sIFRLZXk+XG4pOiBDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+IHtcbiAgICBjb25zdCB7IHJhbmRvbSwgbGltaXQsIHN1bUtleXMgfSA9IGNvbmRpdGlvbjtcblxuICAgIGlmIChyYW5kb20pIHtcbiAgICAgICAgc2h1ZmZsZShpdGVtcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIGNvbnN0IHsgdW5pdCwgdmFsdWUsIHByb3AgfSA9IGxpbWl0O1xuICAgICAgICBjb25zdCByZXNldDogVEl0ZW1bXSA9IFtdO1xuICAgICAgICBjb25zdCBjcml0ZXJpYSA9IF9saW1pdENyaXRlcmlhW3VuaXRdO1xuICAgICAgICBjb25zdCBsaW1pdENvdW50ID0gdmFsdWU7XG4gICAgICAgIGNvbnN0IGV4Y2VzcyA9ICEhbGltaXQuZXhjZXNzO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGlmICghY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIHtcbiAgICAgICAgICAgICAgICBjb3VudCArPSAoTnVtYmVyKGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIC8gY3JpdGVyaWEuY29lZmYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBhY2Nlc3MgcHJvcGVydHk6ICR7cHJvcH1gKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxpbWl0Q291bnQgPCBjb3VudCkge1xuICAgICAgICAgICAgICAgIGlmIChleGNlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXRlbXMgPSByZXNldDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgIGl0ZW1zLFxuICAgIH0gYXMgQ29sbGVjdGlvbkZldGNoUmVzdWx0PFRJdGVtLCBLZXlzPFRJdGVtPj47XG5cbiAgICBpZiAoMCA8IHN1bUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2Ygc3VtS2V5cykge1xuICAgICAgICAgICAgICAgIGlmICghKGtleSBpbiByZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpICs9IE51bWJlcihpdGVtW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnMg44Gr5aSJ5o+bICovXG5mdW5jdGlvbiBlbnN1cmVPcHRpb25zPFRJdGVtIGV4dGVuZHMge30sIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgb3B0aW9uczogQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4gfCB1bmRlZmluZWRcbik6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBzb3J0S2V5czogW10gfSwgb3B0aW9ucyk7XG4gICAgY29uc3QgeyBub1NlYXJjaCwgc29ydEtleXMgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW5vU2VhcmNoICYmICghb3B0cy5jb21wYXJhdG9ycyB8fCBvcHRzLmNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSkge1xuICAgICAgICBvcHRzLmNvbXBhcmF0b3JzID0gY29udmVydFNvcnRLZXlzKHNvcnRLZXlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0cyBhcyBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT47XG59XG5cbi8qKiBAaW50ZXJuYWwg44Kt44Oj44OD44K344Ol5Y+v6IO944GL5Yik5a6aICovXG5mdW5jdGlvbiBjYW5DYWNoZTxUSXRlbSBleHRlbmRzIHt9PihyZXN1bHQ6IENvbGxlY3Rpb25GZXRjaFJlc3VsdDxUSXRlbT4sIG9wdGlvbnM6IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0+KTogYm9vbGVhbiB7XG4gICAgY29uc3QgeyBub0NhY2hlLCBub1NlYXJjaCB9ID0gb3B0aW9ucztcbiAgICByZXR1cm4gIW5vQ2FjaGUgJiYgIW5vU2VhcmNoICYmIHJlc3VsdC50b3RhbCA9PT0gcmVzdWx0Lml0ZW1zLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBAZW4gTG93IGxldmVsIGZ1bmN0aW9uIGZvciBbW0NvbGxlY3Rpb25dXSBxdWVyeSBpdGVtcy5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSBJdGVtIOOCkuOCr+OCqOODquOBmeOCi+S9juODrOODmeODq+mWouaVsFxuICpcbiAqIEBwYXJhbSBxdWVyeUluZm9cbiAqICAtIGBlbmAgcXVlcnkgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg44Kv44Ko44Oq5oOF5aCxXG4gKiBAcGFyYW0gcHJvdmlkZXJcbiAqICAtIGBlbmAgcHJvdmlkZXIgZnVuY3Rpb25cbiAqICAtIGBqYWAg44OX44Ot44OQ44Kk44OA6Zai5pWwXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlJdGVtczxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxUSXRlbVtdPiB7XG4gICAgY29uc3Qgb3B0cyA9IGVuc3VyZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gb3B0cztcblxuICAgIC8vIHF1ZXJ5IOOBq+S9v+eUqOOBl+OBnyBzb3J0LCBmaWx0ZXIg5oOF5aCx44KS44Kt44Oj44OD44K344OlXG4gICAgcXVlcnlJbmZvLnNvcnRLZXlzICAgID0gc29ydEtleXM7XG4gICAgcXVlcnlJbmZvLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnM7XG4gICAgcXVlcnlJbmZvLmZpbHRlciAgICAgID0gZmlsdGVyO1xuXG4gICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbUNhY2hlKHF1ZXJ5SW5mby5jYWNoZS5pdGVtcywgb3B0cykpLml0ZW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBxdWVyeUZyb21Qcm92aWRlcihwcm92aWRlciwgb3B0cyk7XG4gICAgICAgIGNvbnN0IG5leHRPcHRzID0gcmVzdWx0Lm9wdGlvbnMgYXMgQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbT47XG4gICAgICAgIGlmIChjYW5DYWNoZShyZXN1bHQsIG5leHRPcHRzKSkge1xuICAgICAgICAgICAgcXVlcnlJbmZvLmNhY2hlID0geyAuLi5yZXN1bHQgfTtcbiAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgbm9TZWFyY2gsIGNvbmRpdGlvbjogc2VlZCB9ID0gbmV4dE9wdHM7XG4gICAgICAgIGlmIChzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBjb25kaXRpb24gPSBuZXcgRHluYW1pY0NvbmRpdGlvbihzZWVkKTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGNvbmRpdGlvbmFsRml4KHNlYXJjaEl0ZW1zKFxuICAgICAgICAgICAgICAgIHJlc3VsdC5pdGVtcyxcbiAgICAgICAgICAgICAgICBjb25kaXRpb24uZmlsdGVyLFxuICAgICAgICAgICAgICAgIC4uLmNvbmRpdGlvbi5jb21wYXJhdG9yc1xuICAgICAgICAgICAgKSwgY29uZGl0aW9uKTtcblxuICAgICAgICAgICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLmNhY2hlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBub1NlYXJjaCA/IHJlc3VsdC5pdGVtcyA6IHNlYXJjaEl0ZW1zKHJlc3VsdC5pdGVtcywgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImdldExhbmd1YWdlIiwiT2JzZXJ2YWJsZUFycmF5IiwiY2MiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJ1bmlxdWUiLCJjb21wdXRlRGF0ZSIsImlzRnVuY3Rpb24iLCJzb3J0IiwicmVzdWx0Iiwic2h1ZmZsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7R0FBQTs7Ozs7R0FNQSxnREFjQztHQWREOzs7OztPQVVJO09BQUE7V0FDSSxzRkFBNEMsQ0FBQTtXQUM1QyxzREFBMkIsWUFBQSxrQkFBa0IsZ0JBQXVCLHNCQUE2QixDQUFDLEVBQUUsaUJBQWlCLENBQUMsOEJBQUEsQ0FBQTtRQUN6SCxJQUFBO0dBQ0wsQ0FBQzs7R0NQRDtHQUNBLElBQUksU0FBUyxHQUFxQjtPQUM5QixP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
