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
           // 進捗通知
           if (coreUtils.isFunction(progress)) {
               progress({
                   total: targets.length,
                   items: result$1,
                   options: { ...opts },
               });
           }
           if (auto && null != limit) {
               if (targets.length <= index + limit) {
                   // 自動継続指定時には最後にすべての item を返却
                   return targets;
               }
               else {
                   index += result$1.length;
               }
           }
           else {
               return result$1;
           }
       }
   }
   /** @internal `provider` 関数を使用して CollectionQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
   async function queryFromProvider(queryInfo, provider, options) {
       const { filter, index: baseIndex, limit, cancel: token, progress, auto, noCache, } = options;
       const targets = [];
       const canCache = (result) => {
           return !noCache && (!coreUtils.isFunction(filter) && result.total <= targets.length);
       };
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
           if (canCache(result$1)) {
               queryInfo.cache = {
                   total: result$1.total,
                   items: targets,
               };
           }
           // 進捗通知
           if (coreUtils.isFunction(progress)) {
               progress({
                   total: result$1.total,
                   items: result$1.items,
                   options: { ...opts },
               });
           }
           if (auto && null != limit) {
               if (result$1.total <= index + limit) {
                   // 自動継続指定時には最後にすべての item を返却
                   return targets;
               }
               else {
                   index += result$1.items.length;
               }
           }
           else {
               return result$1.items;
           }
       }
   }
   /** @internal SafeCollectionQueryOptions に変換 */
   function ensureOptions(options) {
       const opts = Object.assign({ sortKeys: [] }, options);
       const { noSearch, sortKeys } = opts;
       if (!noSearch && !opts.comparators) {
           const comparators = [];
           for (const sortKey of sortKeys) {
               comparators.push(toComparator(sortKey));
           }
           opts.comparators = comparators;
       }
       return opts;
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
       // query に使用した sort, filter 情報をキャッシュ
       queryInfo.sortKeys = opts.sortKeys;
       queryInfo.comparators = opts.comparators;
       queryInfo.filter = opts.filter;
       if (queryInfo.cache) {
           return queryFromCache(queryInfo.cache.items, opts);
       }
       else {
           return queryFromProvider(queryInfo, provider, opts);
       }
   }

   exports.ArrayCursor = ArrayCursor;
   exports.appendArray = appendArray;
   exports.clearArray = clearArray;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIENPTExFQ1RJT04gPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19NT0RFTF9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMSwgJ2ludmFsaWQgYWNjZXNzLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgW1tDb2xsYXRvclByb3ZpZGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBbW0NvbGxhdG9yUHJvdmlkZXJdXSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRDb2xsYXRvclByb3ZpZGVyKG5ld1Byb3ZpZGVyPzogQ29sbGF0b3JQcm92aWRlcik6IENvbGxhdG9yUHJvdmlkZXIge1xuICAgIGlmIChudWxsID09IG5ld1Byb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiBfY29sbGF0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvdmlkZXIgPSBfY29sbGF0b3I7XG4gICAgICAgIF9jb2xsYXRvciA9IG5ld1Byb3ZpZGVyO1xuICAgICAgICByZXR1cm4gb2xkUHJvdmlkZXI7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBHZXQgc3RyaW5nIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5paH5a2X5YiX5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHJpbmdDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBULCByaHM6IFQpOiBudW1iZXIgPT4ge1xuICAgICAgICAvLyB1bmRlZmluZWQg44GvICcnIOOBqOWQjOetieOBq+aJseOBhlxuICAgICAgICBjb25zdCBsaHNQcm9wID0gKG51bGwgIT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkgPyBsaHNbcHJvcCBhcyBzdHJpbmddIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcCBhcyBzdHJpbmddKSA/IHJoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgcmV0dXJuIG9yZGVyICogX2NvbGxhdG9yKCkuY29tcGFyZShsaHNQcm9wLCByaHNQcm9wKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZGF0ZSBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaXpeaZguavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IGxoc0RhdGUgPSBsaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBjb25zdCByaHNEYXRlID0gcmhzW3Byb3AgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcCBhcyBzdHJpbmddID09PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAobGhzW3Byb3AgYXMgc3RyaW5nXSA8IHJoc1twcm9wIGFzIHN0cmluZ10gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSBbW1NvcnRLZXldXS5cbiAqIEBqYSBbW1NvcnRLZXldXSDjgpIgY29tcGFyYXRvciDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5OiBTb3J0S2V5PEs+KTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICBjb25zdCBwcm9wTmFtZSA9IHNvcnRLZXkubmFtZTtcbiAgICBzd2l0Y2ggKHNvcnRLZXkudHlwZSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSz4ocHJvcE5hbWUsIHNvcnRLZXkub3JkZXIpO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiBnZXRCb29sZWFuQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gZ2V0TnVtYmVyQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgcmV0dXJuIGdldERhdGVDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgfVxufVxuIiwiLyoqXG4gKiBAZW4gQ3Vyc29yIHBvc2l0aW9uIGNvbnN0YW50LlxuICogQGphIOOCq+ODvOOCveODq+S9jee9ruWumuaVsFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDdXJzb3JQb3Mge1xuICAgIE9VVF9PRl9SQU5HRSAgICA9IC0xLFxuICAgIENVUlJFTlQgICAgICAgICA9IC0yLFxufVxuXG4vKipcbiAqIEBlbiBTZWVrIGV4cHJlc3Npb24gZnVuY3Rpb24gdHlwZS5cbiAqIEBqYSDjgrfjg7zjgq/lvI/plqLmlbDlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vla0V4cDxUPiA9ICh2YWx1ZTogVCwgaW5kZXg/OiBudW1iZXIsIG9iaj86IFRbXSkgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHByb3ZpZGVzIGN1cnNvciBpbnRlcmZhY2UgZm9yIEFycmF5LiA8YnI+XG4gKiAgICAgSXQgaXMgZGlmZmVyZW50IGZyb20gSXRlcmF0b3IgaW50ZXJmYWNlIG9mIGVzMjAxNSwgYW5kIHRoYXQgcHJvdmlkZXMgaW50ZXJmYWNlIHdoaWNoIGlzIHNpbWlsYXIgdG8gREIgcmVjb3Jkc2V0J3Mgb25lLlxuICogQGphIEFycmF5IOeUqOOCq+ODvOOCveODqyBJL0Yg44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBlczIwMTUg44GuIEl0ZXJhdG9yIEkvRiDjgajjga/nlbDjgarjgorjgIFEQiByZWNvcmRzZXQg44Kq44OW44K444Kn44Kv44OI44Op44Kk44Kv44Gq6LWw5p+7IEkvRiDjgpLmj5DkvpvjgZnjgotcbiAqL1xuZXhwb3J0IGNsYXNzIEFycmF5Q3Vyc29yPFQgPSBhbnk+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLyoqIEBpbnRlcm5hbCDlr77osaHjga7phY3liJcgICovXG4gICAgcHJpdmF0ZSBfYXJyYXk6IFRbXTtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruWFiOmgreOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICAqL1xuICAgIHByaXZhdGUgX2JvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruacq+WwvuOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfZW9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg54++5Zyo44GuIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogMFxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiAwXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXJyYXk6IFRbXSwgaW5pdGlhbEluZGV4ID0gMCkge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgdGFyZ2V0IGFycmF5LlxuICAgICAqIEBqYSDlr77osaHjga7lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5LiBkZWZhdWx0OiBlbXB0eSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+Wumi4gICBkZWZhdWx0OiDnqbrphY3liJdcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoYXJyYXk6IFRbXSA9IFtdLCBpbml0aWFsSW5kZXg6IG51bWJlciA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0UpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGN1cnJlbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheVt0aGlzLl9pbmRleF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjmjIfjgZfnpLrjgZfjgabjgYTjgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRhcmdldCBhcnJheSBsZW5ndGguXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBruimgee0oOaVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgQk9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5YWI6aCt44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQk9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBFT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7mnKvlsL7jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lb2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByYXcgYXJyYXkgaW5zdGFuY2UuXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBhcnJheSgpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY3Vyc29yIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGZpcnN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOWFiOmgreimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlRmlyc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBsYXN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOacq+Wwvuimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTGFzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIG5leHQgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5qyh44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVOZXh0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZikge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIHByZXZpb3VzIGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuWJjeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlUHJldmlvdXMoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fZW9mKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VlayBieSBwYXNzZWQgY3JpdGVyaWEuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG9wZXJhdGlvbiBmYWlsZWQsIHRoZSBjdXJzb3IgcG9zaXRpb24gc2V0IHRvIEVPRi5cbiAgICAgKiBAamEg5oyH5a6a5p2h5Lu244Gn44K344O844KvIDxicj5cbiAgICAgKiAgICAg44K344O844Kv44Gr5aSx5pWX44GX44Gf5aC05ZCI44GvIEVPRiDnirbmhYvjgavjgarjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjcml0ZXJpYVxuICAgICAqICAtIGBlbmAgaW5kZXggb3Igc2VlayBleHByZXNzaW9uXG4gICAgICogIC0gYGphYCBpbmRleCAvIOadoeS7tuW8j+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzZWVrKGNyaXRlcmlhOiBudW1iZXIgfCBTZWVrRXhwPFQ+KTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBjcml0ZXJpYSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBjcml0ZXJpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkuZmluZEluZGV4KGNyaXRlcmlhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIOOCq+ODvOOCveODq+OBjOacieWKueOBquevhOWbsuOCkuekuuOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0cnVlOiDmnInlirkgLyBmYWxzZTog54Sh5Yq5XG4gICAgICovXG4gICAgcHJpdmF0ZSB2YWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICgwIDw9IHRoaXMuX2luZGV4ICYmIHRoaXMuX2luZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmlxdWUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxUb2tlbixcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5LCBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuLyoqIEBpbnRlcm5hbCB3YWl0IGZvciBjaGFuZ2UgZGV0ZWN0aW9uICovXG5mdW5jdGlvbiBtYWtlUHJvbWlzZTxUPihlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPiwgcmVtYXA/OiBUW10pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGVkaXRvci5vZmYoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICAgICAgcmVtYXAubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICByZW1hcC5wdXNoKC4uLmVkaXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHJlY29yZHMpO1xuICAgICAgICB9O1xuICAgICAgICBlZGl0b3Iub24oY2FsbGJhY2spO1xuICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgdG8gW1tPYnNlcnZhYmxlQXJyYXldXSBpZiBuZWVkZWQuICovXG5hc3luYyBmdW5jdGlvbiBnZXRFZGl0Q29udGV4dDxUPihcbiAgICB0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSxcbiAgICB0b2tlbj86IENhbmNlbFRva2VuXG4pOiBQcm9taXNlPHsgZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD47IHByb21pc2U6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT47IH0+IHwgbmV2ZXIge1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yOiB0YXJnZXQsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZSh0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvciA9IE9ic2VydmFibGVBcnJheS5mcm9tKHRhcmdldCk7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcixcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKGVkaXRvciwgdGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsICd0YXJnZXQgaXMgbm90IEFycmF5IG9yIE9ic2VydmFibGVBcnJheS4nKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKDAsIHRhcmdldC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnB1c2goLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBhcnJheS5cbiAqIEBqYSDmjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZShpbmRleCwgMCwgLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIGFycmF5IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gb3JkZXJzIHx8IG9yZGVycy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOmZjemghuOCveODvOODiFxuICAgIG9yZGVycy5zb3J0KChsaHMsIHJocykgPT4ge1xuICAgICAgICByZXR1cm4gKGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgIGVkaXRvci5zcGxpY2Uob3JkZXIsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuIiwiaW1wb3J0IHsgaXNGdW5jdGlvbiwgc29ydCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBTb3J0S2V5LFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25GZXRjaFJlc3VsdCxcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25JdGVtUHJvdmlkZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyB0b0NvbXBhcmF0b3IgfSBmcm9tICcuL3V0aWxzL2NvbXBhcmF0b3InO1xuXG5jb25zdCB7IHRydW5jIH0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIOS9v+eUqOOBmeOCi+ODl+ODreODkeODhuOCo+OBjOS/neiovOOBleOCjOOBnyBDb2xsZWN0aW9uUXVlcnlPcHRpb25zICovXG5pbnRlcmZhY2UgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyB7fSwgVEtleSBleHRlbmRzIHN0cmluZz4gZXh0ZW5kcyBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgc29ydEtleXM6IFNvcnRLZXk8VEtleT5bXTtcbiAgICBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQXBwbHkgYGZpbHRlcmAgYW5kIGBzb3J0IGtleWAgdG8gdGhlIGBpdGVtc2AgZnJvbSBbW3F1ZXJ5SXRlbXNdXWAoKWAgcmVzdWx0LlxuICogQGphIFtbcXVlcnlJdGVtc11dYCgpYCDjgZfjgZ8gYGl0ZW1zYCDjgavlr77jgZfjgaYgYGZpbHRlcmAg44GoIGBzb3J0IGtleWAg44KS6YGp55SoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZWFyY2hJdGVtczxUSXRlbT4oaXRlbXM6IFRJdGVtW10sIGZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IG51bGwsIC4uLmNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10pOiBUSXRlbVtdIHtcbiAgICBsZXQgcmVzdWx0ID0gaXNGdW5jdGlvbihmaWx0ZXIpID8gaXRlbXMuZmlsdGVyKGZpbHRlcikgOiBpdGVtcy5zbGljZSgpO1xuICAgIGZvciAoY29uc3QgY29tcGFyYXRvciBvZiBjb21wYXJhdG9ycykge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihjb21wYXJhdG9yKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gc29ydChyZXN1bHQsIGNvbXBhcmF0b3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIOOBmeOBp+OBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBpuOBhOOCi+WvvuixoeOBq+WvvuOBl+OBpiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBxdWVyeSDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbUNhY2hlPFRJdGVtIGV4dGVuZHMge30sIFRLZXkgZXh0ZW5kcyBzdHJpbmc+KFxuICAgIGNhY2hlZDogVEl0ZW1bXSxcbiAgICBvcHRpb25zOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8VEl0ZW1bXT4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgZmlsdGVyLFxuICAgICAgICBjb21wYXJhdG9ycyxcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgICAgICBub1NlYXJjaCxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBq+WvvuOBl+OBpuODleOCo+ODq+OCv+ODquODs+OCsCwg44K944O844OI44KS5a6f6KGMXG4gICAgY29uc3QgdGFyZ2V0cyA9IG5vU2VhcmNoID8gY2FjaGVkLnNsaWNlKCkgOiBzZWFyY2hJdGVtcyhjYWNoZWQsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSAobnVsbCAhPSBiYXNlSW5kZXgpID8gYmFzZUluZGV4IDogMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAkeyBvcHRpb25zLmxpbWl0IH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRhcmdldHMuc2xpY2UoaW5kZXgsIChudWxsICE9IGxpbWl0KSA/IGluZGV4ICsgbGltaXQgOiB1bmRlZmluZWQpO1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICB0b3RhbDogdGFyZ2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgaXRlbXM6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldHMubGVuZ3RoIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gcmVzdWx0Lmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgYHByb3ZpZGVyYCDplqLmlbDjgpLkvb/nlKjjgZfjgaYgQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggYHF1ZXJ5YCDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbVByb3ZpZGVyPFRJdGVtIGV4dGVuZHMge30sIFRLZXkgZXh0ZW5kcyBzdHJpbmc+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPFRJdGVtW10+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGZpbHRlcixcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgICAgICBub0NhY2hlLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgdGFyZ2V0czogVEl0ZW1bXSA9IFtdO1xuXG4gICAgY29uc3QgY2FuQ2FjaGUgPSAocmVzdWx0OiBDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+KTogYm9vbGVhbiA9PiB7XG4gICAgICAgIHJldHVybiAhbm9DYWNoZSAmJiAoIWlzRnVuY3Rpb24oZmlsdGVyKSAmJiByZXN1bHQudG90YWwgPD0gdGFyZ2V0cy5sZW5ndGgpO1xuICAgIH07XG5cbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7b3B0aW9ucy5saW1pdH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyKG9wdHMpO1xuXG4gICAgICAgIHRhcmdldHMucHVzaCguLi5yZXN1bHQuaXRlbXMpO1xuICAgICAgICBpZiAoY2FuQ2FjaGUocmVzdWx0KSkge1xuICAgICAgICAgICAgcXVlcnlJbmZvLmNhY2hlID0ge1xuICAgICAgICAgICAgICAgIHRvdGFsOiByZXN1bHQudG90YWwsXG4gICAgICAgICAgICAgICAgaXRlbXM6IHRhcmdldHMsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgcHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgIHRvdGFsOiByZXN1bHQudG90YWwsXG4gICAgICAgICAgICAgICAgaXRlbXM6IHJlc3VsdC5pdGVtcyxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHJlc3VsdC50b3RhbCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IHJlc3VsdC5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0Lml0ZW1zO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+WkieaPmyAqL1xuZnVuY3Rpb24gZW5zdXJlT3B0aW9uczxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgc3RyaW5nPihcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB8IHVuZGVmaW5lZFxuKTogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHNvcnRLZXlzOiBbXSB9LCBvcHRpb25zKTtcbiAgICBjb25zdCB7IG5vU2VhcmNoLCBzb3J0S2V5cyB9ID0gb3B0cztcblxuICAgIGlmICghbm9TZWFyY2ggJiYgIW9wdHMuY29tcGFyYXRvcnMpIHtcbiAgICAgICAgY29uc3QgY29tcGFyYXRvcnMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzb3J0S2V5IG9mIHNvcnRLZXlzKSB7XG4gICAgICAgICAgICBjb21wYXJhdG9ycy5wdXNoKHRvQ29tcGFyYXRvcihzb3J0S2V5KSk7XG4gICAgICAgIH1cbiAgICAgICAgb3B0cy5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRzIGFzIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5Pjtcbn1cblxuLyoqXG4gKiBAZW4gTG93IGxldmVsIGZ1bmN0aW9uIGZvciBbW0NvbGxlY3Rpb25dXSBxdWVyeSBpdGVtcy5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSBJdGVtIOOCkuOCr+OCqOODquOBmeOCi+S9juODrOODmeODq+mWouaVsFxuICpcbiAqIEBwYXJhbSBxdWVyeUluZm9cbiAqICAtIGBlbmAgcXVlcnkgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg44Kv44Ko44Oq5oOF5aCxXG4gKiBAcGFyYW0gcHJvdmlkZXJcbiAqICAtIGBlbmAgcHJvdmlkZXIgZnVuY3Rpb25cbiAqICAtIGBqYWAg44OX44Ot44OQ44Kk44OA6Zai5pWwXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlJdGVtczxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgc3RyaW5nPihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zPzogQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8VEl0ZW1bXT4ge1xuICAgIGNvbnN0IG9wdHMgPSBlbnN1cmVPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgLy8gcXVlcnkg44Gr5L2/55So44GX44GfIHNvcnQsIGZpbHRlciDmg4XloLHjgpLjgq3jg6Pjg4Pjgrfjg6VcbiAgICBxdWVyeUluZm8uc29ydEtleXMgICAgPSBvcHRzLnNvcnRLZXlzO1xuICAgIHF1ZXJ5SW5mby5jb21wYXJhdG9ycyA9IG9wdHMuY29tcGFyYXRvcnM7XG4gICAgcXVlcnlJbmZvLmZpbHRlciAgICAgID0gb3B0cy5maWx0ZXI7XG5cbiAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgIHJldHVybiBxdWVyeUZyb21DYWNoZShxdWVyeUluZm8uY2FjaGUuaXRlbXMsIG9wdHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBxdWVyeUZyb21Qcm92aWRlcihxdWVyeUluZm8sIHByb3ZpZGVyLCBvcHRzKTtcbiAgICB9XG59XG4iXSwibmFtZXMiOlsiZ2V0TGFuZ3VhZ2UiLCJPYnNlcnZhYmxlQXJyYXkiLCJjYyIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInVuaXF1ZSIsImlzRnVuY3Rpb24iLCJzb3J0IiwicmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztHQUFBOzs7OztHQU1BLGdEQWNDO0dBZEQ7Ozs7O09BVUk7T0FBQTtXQUNJLHNGQUE0QyxDQUFBO1dBQzVDLHNEQUEyQixZQUFBLGtCQUFrQixnQkFBdUIsc0JBQTZCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyw4QkFBQSxDQUFBO1FBQ3pILElBQUE7R0FDTCxDQUFDOztHQ1BEO0dBQ0EsSUFBSSxTQUFTLEdBQXFCO09BQzlCLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDQSxnQkFBVyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0dBQ3BGLENBQUMsQ0FBQztHQUVGOzs7Ozs7Ozs7O0FBVUEsWUFBZ0IsdUJBQXVCLENBQUMsV0FBOEI7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
