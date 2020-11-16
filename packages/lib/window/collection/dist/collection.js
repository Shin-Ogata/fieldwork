/*!
 * @cdp/collection 0.9.5
 *   generic collection scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/i18n'), require('@cdp/core-utils'), require('@cdp/promise'), require('@cdp/observable'), require('@cdp/result'), require('@cdp/events'), require('@cdp/data-sync'), require('@cdp/model')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/i18n', '@cdp/core-utils', '@cdp/promise', '@cdp/observable', '@cdp/result', '@cdp/events', '@cdp/data-sync', '@cdp/model'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, i18n, coreUtils, promise, observable, result, events, dataSync, model) { 'use strict';

    /* eslint-disable
        @typescript-eslint/no-namespace
     ,  @typescript-eslint/no-unused-vars
     ,  @typescript-eslint/restrict-plus-operands
     */
    (function () {
        /**
         * @en Extends error code definitions.
         * @ja 拡張通エラーコード定義
         */
        let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
        (function () {
            RESULT_CODE[RESULT_CODE["MVC_COLLECTION_DECLARE"] = 9007199254740991] = "MVC_COLLECTION_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_ACCESS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 70 /* COLLECTION */ + 1, 'invalid access.')] = "ERROR_MVC_INVALID_ACCESS";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_COMPARATORS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 70 /* COLLECTION */ + 2, 'invalid comparators.')] = "ERROR_MVC_INVALID_COMPARATORS";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_EDIT_PERMISSION_DENIED"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 70 /* COLLECTION */ + 3, 'editing permission denied.')] = "ERROR_MVC_EDIT_PERMISSION_DENIED";
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
        const { name, type, order } = sortKey;
        switch (type) {
            case 'string':
                return getStringComparator(name, order);
            case 'boolean':
                return getBooleanComparator(name, order);
            case 'number':
                return getNumberComparator(name, order);
            case 'date':
                return getDateComparator(name, order);
            default:
                return getGenericComparator(name, order);
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

    /** @internal */
    const trunc = Math.trunc.bind(Math);
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
    /** @internal valid orders index */
    function validOrders(length, orders) {
        if (null == orders || orders.length <= 0) {
            return false;
        }
        for (const index of orders) {
            if (index < 0 || length <= index || trunc(index) !== index) {
                throw result.makeResult(result.RESULT_CODE.NOT_SUPPORTED, `orders[] index is invalid. index: ${index}`);
            }
        }
        return true;
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
        if (index < 0 || target.length < index || trunc(index) !== index) {
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
        if (index < 0 || target.length < index || trunc(index) !== index) {
            throw result.makeResult(result.RESULT_CODE.NOT_SUPPORTED, `reorderArray(), index is invalid. index: ${index}`);
        }
        else if (!validOrders(target.length, orders)) {
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
        if (!validOrders(target.length, orders)) {
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
        return (item) => String(item[prop]).toLocaleLowerCase().includes(value.toLocaleLowerCase());
    }
    /** @internal DynamicPackageOperator.NOT_LIKE */
    function notLike(prop, value) {
        return (item) => !String(item[prop]).toLocaleLowerCase().includes(value.toLocaleLowerCase());
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
                    console.warn(`unknown combination: ${type}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
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
                const { operator, prop, value } = cond;
                switch (operator) {
                    case 0 /* EQUAL */:
                        fltr = combination(this._combination, equal(prop, value), fltr);
                        break;
                    case 1 /* NOT_EQUAL */:
                        fltr = combination(this._combination, notEqual(prop, value), fltr);
                        break;
                    case 2 /* GREATER */:
                        fltr = combination(this._combination, greater(prop, value), fltr);
                        break;
                    case 3 /* LESS */:
                        fltr = combination(this._combination, less(prop, value), fltr);
                        break;
                    case 4 /* GREATER_EQUAL */:
                        fltr = combination(this._combination, greaterEqual(prop, value), fltr);
                        break;
                    case 5 /* LESS_EQUAL */:
                        fltr = combination(this._combination, lessEqual(prop, value), fltr);
                        break;
                    case 6 /* LIKE */:
                        fltr = combination(this._combination, like(prop, value), fltr);
                        break;
                    case 7 /* NOT_LIKE */:
                        fltr = combination(this._combination, notLike(prop, value), fltr);
                        break;
                    case 8 /* DATE_LESS_EQUAL */:
                        fltr = combination(this._combination, dateLessEqual(prop, value, cond.unit), fltr);
                        break;
                    case 9 /* DATE_LESS_NOT_EQUAL */:
                        fltr = combination(this._combination, dateLessNotEqual(prop, value, cond.unit), fltr);
                        break;
                    case 10 /* RANGE */:
                        fltr = combination(this._combination, range(prop, value, cond.range), fltr);
                        break;
                    default:
                        console.warn(`unknown operator: ${operator}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
                        break;
                }
            }
            return fltr || (( /* item */) => true);
        }
    }

    /** @internal */
    const trunc$1 = Math.trunc.bind(Math);
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
                    console.warn(`cannot access property: ${prop}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
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
    /** @internal すでにキャッシュされている対象に対して CollectionItemQueryOptions に指定された振る舞いを行う内部 query 関数 */
    async function queryFromCache(cached, options) {
        const { filter, comparators, index: baseIndex, limit, cancel: token, progress, auto, noSearch, } = options;
        // キャッシュに対してフィルタリング, ソートを実行
        const targets = noSearch ? cached.slice() : searchItems(cached, filter, ...comparators);
        const results = [];
        let index = (null != baseIndex) ? baseIndex : 0;
        while (true) {
            await promise.checkCanceled(token);
            if (index < 0 || targets.length <= index || trunc$1(index) !== index) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
            }
            else if (null != limit && (limit <= 0 || trunc$1(limit) !== limit)) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${limit}`);
            }
            const opts = Object.assign(options, { index });
            const items = targets.slice(index, (null != limit) ? index + limit : undefined);
            results.push(...items);
            const retval = {
                total: targets.length,
                items,
                options: { ...opts },
            };
            // 進捗通知
            if (coreUtils.isFunction(progress)) {
                progress({ ...retval });
            }
            if (auto && null != limit) {
                if (targets.length <= index + limit) {
                    // 自動継続指定時には最後にすべての item を返却
                    retval.items = results;
                }
                else {
                    index += items.length;
                    continue;
                }
            }
            return retval;
        }
    }
    /** @internal レスポンスのキャッシュを試行 */
    function tryCache(queryInfo, result, options) {
        const { noCache, noSearch } = options;
        const canCache = !noCache && !noSearch && result.total === result.items.length;
        if (canCache) {
            queryInfo.cache = { ...result };
            delete queryInfo.cache.options;
        }
    }
    /** @internal `provider` 関数を使用して CollectionItemQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
    async function queryFromProvider(queryInfo, provider, options) {
        const { index: baseIndex, limit, cancel: token, progress, auto, } = options;
        const results = [];
        const receivedAll = (resp) => {
            const hasCond = !!resp.options?.condition;
            return hasCond || resp.total === resp.items.length;
        };
        let index = (null != baseIndex) ? baseIndex : 0;
        while (true) {
            await promise.checkCanceled(token);
            if (index < 0 || trunc$1(index) !== index) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
            }
            else if (null != limit && (limit <= 0 || trunc$1(limit) !== limit)) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${limit}`);
            }
            const opts = Object.assign(options, { index });
            let resp = await provider(opts);
            const nextOpts = Object.assign({}, opts, resp.options);
            if (receivedAll(resp)) {
                tryCache(queryInfo, resp, nextOpts);
                const { noSearch, condition: seed } = nextOpts;
                if (seed) {
                    const condition = new DynamicCondition(seed);
                    resp = conditionalFix(searchItems(resp.items, condition.filter, ...condition.comparators), condition);
                    if (queryInfo.cache) {
                        Object.assign(queryInfo.cache, resp);
                        delete queryInfo.cache.options;
                    }
                }
                return queryFromCache(resp.items, Object.assign(opts, { noSearch }));
            } // eslint-disable-line brace-style
            else {
                results.push(...resp.items);
                const retval = {
                    total: resp.total,
                    items: resp.items,
                    options: nextOpts,
                };
                // 進捗通知
                if (coreUtils.isFunction(progress)) {
                    progress({ ...retval });
                }
                if (auto && null != limit) {
                    if (resp.total <= index + limit) {
                        // 自動継続指定時には最後にすべての item を返却
                        retval.items = results;
                    }
                    else {
                        index += resp.items.length;
                        continue;
                    }
                }
                tryCache(queryInfo, retval, nextOpts);
                return retval;
            }
        }
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
        Object.assign(queryInfo, { sortKeys, comparators, filter });
        if (queryInfo.cache) {
            return (await queryFromCache(queryInfo.cache.items, opts)).items;
        }
        else {
            return (await queryFromProvider(queryInfo, provider, opts)).items;
        }
    }

    /** @internal */
    const _properties = Symbol('properties');
    /** @internal */
    const _createIterableIterator = Symbol('create-iterable-iterator');
    /** @internal */
    const _prepareModel = Symbol('prepare-model');
    /** @internal */
    const _removeModels = Symbol('remove-models');
    /** @internal */
    const _addReference = Symbol('add-reference');
    /** @internal */
    const _removeReference = Symbol('remove-reference');
    /** @internal */
    const _onModelEvent = Symbol('model-event-handler');
    /** @internal reset model context */
    const resetModelStore = (context) => {
        context.byId.clear();
        context.store.length = 0;
    };
    /** @internal */
    const ensureSortOptions = (options) => {
        const { sortKeys: keys, comparators: comps } = options;
        return {
            sortKeys: keys || [],
            comparators: comps || convertSortKeys(keys || []),
        };
    };
    /** @internal */
    const modelIdAttribute = (ctor) => {
        return ctor?.['idAttribute'] || 'id';
    };
    /** @internal */
    const getModelId = (attrs, ctor) => {
        return attrs[modelIdAttribute(ctor)];
    };
    /** @internal */
    const getChangedIds = (obj, ctor) => {
        const model = obj;
        const idAttribute = modelIdAttribute(ctor);
        const id = model[idAttribute];
        if (!coreUtils.isString(id)) {
            return undefined;
        }
        return { id: model[idAttribute], prevId: coreUtils.isFunction(model.previous) ? model.previous(idAttribute) : undefined };
    };
    /** @internal */
    const modelConstructor = (self) => {
        return self.constructor['model'];
    };
    /** @internal */
    const isCollectionModel = (x, self) => {
        const ctor = modelConstructor(self);
        return coreUtils.isFunction(ctor) ? x instanceof ctor : false;
    };
    /** @internal */
    const spliceArray = (target, insert, at) => {
        at = Math.min(Math.max(at, 0), target.length);
        target.splice(at, 0, ...insert);
    };
    /** @internal */
    function parseFilterArgs(...args) {
        const [filter, options] = args;
        if (null == filter) {
            return {};
        }
        else if (!coreUtils.isFunction(filter)) {
            return filter;
        }
        else {
            return Object.assign({}, options, { filter });
        }
    }
    /** @internal */
    const _setOptions = { add: true, remove: true, merge: true };
    /** @internal */
    const _addOptions = { add: true, remove: false };
    //__________________________________________________________________________________________________//
    /**
     * @en Base class definition for collection that is ordered sets of models.
     * @ja モデルの集合を扱うコレクションの基底クラス定義.
     *
     * @example <br>
     *
     * ```ts
     * import { PlainObject } from '@cdp/core-utils';
     * import { Model, ModelConstructor } from '@cdp/model';
     * import {
     *     Collection,
     *     CollectionItemQueryOptions,
     *     CollectionItemQueryResult,
     * } from '@cdp/collection';
     *
     * // Model schema
     * interface TrackAttribute {
     *   uri: string;
     *   title: string;
     *   artist: string;
     *   album:  string;
     *   releaseDate: Date;
     *   :
     * }
     *
     * // Model definition
     * const TrackBase = Model as ModelConstructor<Model<TrackAttribute>, TrackAttribute>;
     * class Track extends TrackBase {
     *     static idAttribute = 'uri';
     * }
     *
     * // Collection definition
     * class Playlist extends Collection<Track> {
     *     // set target Model constructor
     *     static readonly model = Track;
     *
     *     // @override if need to use custom content provider for fetch.
     *     protected async sync(
     *         options?: CollectionItemQueryOptions<Track>
     *     ): Promise<CollectionItemQueryResult<object>> {
     *         // some specific implementation here.
     *         const items = await customProvider(options);
     *         return {
     *             total: items.length,
     *             items,
     *             options,
     *         } as CollectionItemQueryResult<object>;
     *     }
     *
     *     // @override if need to convert a response into a list of models.
     *     protected parse(response: PlainObject[]): TrackAttribute[] {
     *         return response.map(seed => {
     *             const date = seed.releaseDate;
     *             seed.releaseDate = new Date(date);
     *             return seed;
     *         }) as TrackAttribute[];
     *      }
     * }
     *
     * let seeds: TrackAttribute[];
     *
     * const playlist = new Playlist(seeds, {
     *     // default query options
     *     queryOptions: {
     *         sortKeys: [
     *             { name: 'title', order: SortOrder.DESC, type: 'string' },
     *         ],
     *     }
     * });
     *
     * await playlist.requery();
     *
     * for (const track of playlist) {
     *     console.log(JSON.stringify(track.toJSON()));
     * }
     * ```
     */
    class Collection extends events.EventSource {
        ///////////////////////////////////////////////////////////////////////
        // construction/destruction:
        /**
         * constructor
         *
         * @param seeds
         *  - `en` given the seed of model array.
         *  - `ja` モデル要素の配列を指定
         * @param options
         *  - `en` construction options.
         *  - `ja` 構築オプション
         */
        constructor(seeds, options) {
            super();
            const opts = Object.assign({ modelOptions: {}, queryOptions: {} }, options);
            const { modelOptions, queryOptions } = opts;
            this[_properties] = {
                constructOptions: opts,
                provider: opts.provider || this.sync.bind(this),
                cid: coreUtils.luid('collection:', 8),
                queryOptions,
                queryInfo: {},
                modelOptions,
                byId: new Map(),
                store: [],
            };
            this.initQueryInfo();
            /* model event handler */
            this[_onModelEvent] = (event, model, collection, options) => {
                if (event.startsWith('@') && model) {
                    if (('@add' === event || '@remove' === event) && collection !== this) {
                        return;
                    }
                    if ('@destroy' === event) {
                        // model event arguments adjustment.
                        options = collection; // eslint-disable-line @typescript-eslint/no-explicit-any
                        collection = this;
                        this.remove(model, options);
                    }
                    if ('@change' === event) {
                        const ids = getChangedIds(model, modelConstructor(this));
                        if (ids) {
                            const { id, prevId } = ids;
                            if (prevId !== id) {
                                const { byId } = this[_properties];
                                byId.set(id, model);
                                if (null != prevId) {
                                    byId.delete(prevId);
                                }
                            }
                        }
                    }
                    // delegate event
                    this.trigger.call(this, event, model, collection, options); // eslint-disable-line no-useless-call
                }
            };
            if (seeds) {
                this.reset(seeds, Object.assign({ silent: true }, opts));
            }
        }
        /**
         * @ja Initialize query info
         * @ja クエリ情報の初期化
         */
        initQueryInfo() {
            const { sortKeys, comparators } = ensureSortOptions(this._defaultQueryOptions);
            this._queryInfo = { sortKeys, comparators };
        }
        /**
         * @en Released all instances and event listener under the management.
         * @ja 管理対象を破棄
         *
         * @param options
         *  - `en` options (reserved).
         *  - `ja` オプション (予約)
         */
        release(options) {
            this[_properties].afterFilter = undefined;
            this[_properties].store = [];
            this.initQueryInfo();
            return this.stopListening();
        }
        /**
         * @ja Clear cache instance method
         * @ja キャッシュの破棄
         */
        clearCache() {
            delete this._queryInfo.cache;
        }
        ///////////////////////////////////////////////////////////////////////
        // accessor: attributes
        /**
         * @en Get content ID.
         * @ja コンテント ID を取得
         */
        get id() {
            return this[_properties].cid;
        }
        /**
         * @en Get models.
         * @ja モデルアクセス
         */
        get models() {
            const { _queryFilter, _afterFilter } = this;
            const { store } = this[_properties];
            return (_afterFilter && _afterFilter !== _queryFilter) ? store.filter(_afterFilter) : store;
        }
        /**
         * @en number of models.
         * @ja 内包するモデル数
         */
        get length() {
            return this.models.length;
        }
        /**
         * @en Check applied after-filter.
         * @ja 絞り込み用フィルタが適用されているかを判定
         */
        get filtered() {
            return !!this[_properties].afterFilter;
        }
        /**
         * @en [[CollectionQueryInfo]] instance
         * @ja [[CollectionQueryInfo]] を格納するインスタンス
         */
        get _queryInfo() {
            return this[_properties].queryInfo;
        }
        /**
         * @en [[CollectionQueryInfo]] instance
         * @ja [[CollectionQueryInfo]] を格納するインスタンス
         */
        set _queryInfo(val) {
            this[_properties].queryInfo = val;
        }
        /**
         * @en Get creating options.
         * @ja 構築時のオプションを取得
         */
        get _options() {
            return this[_properties].constructOptions;
        }
        /**
         * @en Get default provider.
         * @ja 既定のプロバイダを取得
         */
        get _provider() {
            return this[_properties].provider;
        }
        /**
         * @en Get default parse behaviour.
         * @ja 既定の parse 動作を取得
         */
        get _defaultParse() {
            return this._options.parse;
        }
        /**
         * @en Get default query options.
         * @ja 既定のクエリオプションを取得
         */
        get _defaultQueryOptions() {
            return this[_properties].queryOptions;
        }
        /**
         * @en Get last query options.
         * @ja 最後のクエリオプションを取得
         */
        get _lastQueryOptions() {
            const { sortKeys, comparators, filter } = this[_properties].queryInfo;
            const opts = {};
            sortKeys.length && (opts.sortKeys = sortKeys);
            comparators.length && (opts.comparators = comparators);
            filter && (opts.filter = filter);
            return opts;
        }
        /**
         * @en Access to sort comparators.
         * @ja ソート用比較関数へのアクセス
         */
        get _comparators() {
            return this[_properties].queryInfo.comparators;
        }
        /**
         * @en Access to query-filter.
         * @ja クエリ用フィルタ関数へのアクセス
         */
        get _queryFilter() {
            return this[_properties].queryInfo.filter;
        }
        /**
         * @en Access to after-filter.
         * @ja 絞り込み用フィルタ関数へのアクセス
         */
        get _afterFilter() {
            return this[_properties].afterFilter;
        }
        ///////////////////////////////////////////////////////////////////////
        // operations: utils
        /**
         * @en Get a model from a collection, specified by an `id`, a `cid`, or by passing in a model instance.
         * @ja `id`, `cid` およびインスタンスからモデルを特定
         *
         * @param seed
         *  - `en` `id`, a `cid`, or by passing in a model instance
         *  - `ja`  `id`, `cid` およびインスタンス
         */
        get(seed) {
            if (null == seed) {
                return undefined;
            }
            const { byId } = this[_properties];
            if (coreUtils.isString(seed) && byId.has(seed)) {
                return byId.get(seed);
            }
            const id = getModelId(model.isModel(seed) ? seed.toJSON() : seed, modelConstructor(this));
            const cid = seed._cid;
            return byId.get(id) || (cid && byId.get(cid));
        }
        /**
         * @en Returns `true` if the model is in the collection by an `id`, a `cid`, or by passing in a model instance.
         * @ja `id`, `cid` およびインスタンスからモデルを所有しているか判定
         *
         * @param seed
         *  - `en` `id`, a `cid`, or by passing in a model instance
         *  - `ja`  `id`, `cid` およびインスタンス
         */
        has(seed) {
            return null != this.get(seed);
        }
        /**
         * @en Return a copy of the model's `attributes` object.
         * @ja モデル属性値のコピーを返却
         */
        toJSON() {
            return this.models.map(m => model.isModel(m) ? m.toJSON() : m);
        }
        /**
         * @es Clone this instance.
         * @ja インスタンスの複製を返却
         *
         * @override
         */
        clone() {
            const { constructor, _options } = this;
            return new constructor(this[_properties].store, _options);
        }
        /**
         * @en Force a collection to re-sort itself.
         * @ja コレクション要素の再ソート
         *
         * @param options
         *  - `en` sort options.
         *  - `ja` ソートオプション
         */
        sort(options) {
            const opts = options || {};
            const { noThrow, silent } = opts;
            const { sortKeys, comparators: comps } = ensureSortOptions(opts);
            const comparators = 0 < comps.length ? comps : this._comparators;
            if (comparators.length <= 0) {
                if (noThrow) {
                    return this;
                }
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_COMPARATORS, 'Cannot sort a set without a comparator.');
            }
            this[_properties].store = searchItems(this[_properties].store, this._afterFilter, ...comparators);
            // update queryInfo
            this[_properties].queryInfo.comparators = comparators;
            if (0 < sortKeys.length) {
                this[_properties].queryInfo.sortKeys = sortKeys;
            }
            if (!silent) {
                this.trigger('@sort', this, opts);
            }
            return this;
        }
        filter(...args) {
            const opts = parseFilterArgs(...args);
            const { filter, silent } = opts;
            if (filter !== this[_properties].afterFilter) {
                this[_properties].afterFilter = filter;
                if (!silent) {
                    this.trigger('@filter', this, opts);
                }
            }
            return this;
        }
        /**
         * @en Get the model at the given index. If negative value is given, the target will be found from the last index.
         * @ja インデックス指定によるモデルへのアクセス. 負値の場合は末尾検索を実行
         *
         * @param index
         *  - `en` A zero-based integer indicating which element to retrieve. <br>
         *         If negative index is counted from the end of the matched set.
         *  - `ja` 0 base のインデックスを指定 <br>
         *         負値が指定された場合, 末尾からのインデックスとして解釈される
         */
        at(index) {
            return coreUtils.at(this.models, index);
        }
        first(count) {
            const targets = this.models;
            if (null == count) {
                return targets[0];
            }
            else {
                return targets.slice(0, count);
            }
        }
        last(count) {
            const targets = this.models;
            if (null == count) {
                return targets[targets.length - 1];
            }
            else {
                return targets.slice(-1 * count);
            }
        }
        ///////////////////////////////////////////////////////////////////////
        // operations: sync
        /**
         * @en Converts a response into the hash of attributes to be `set` on the collection. The default implementation is just to pass the response along.
         * @ja レスポンスの変換メソッド. 既定では何もしない
         *
         * @override
         */
        parse(response, options) {
            return response;
        }
        /**
         * @en The [[fetch]] method proxy that is compatible with [[CollectionItemProvider]] returns one-shot result.
         * @ja [[CollectionItemProvider]] 互換の単発の fetch 結果を返却. 必要に応じてオーバーライド可能.
         *
         * @override
         *
         * @param options
         *  - `en` option object
         *  - `ja` オプション
         */
        async sync(options) {
            const items = await dataSync.defaultSync().sync('read', this, options);
            return {
                total: items.length,
                items,
                options,
            };
        }
        /**
         * @en Fetch the [[Model]] from the server, merging the response with the model's local attributes.
         * @ja [[Model]] 属性のサーバー同期. レスポンスのマージを実行
         *
         * @param options
         *  - `en` fetch options.
         *  - `ja` フェッチオプション
         */
        async fetch(options) {
            const opts = Object.assign({ progress: coreUtils.noop }, this._defaultQueryOptions, options);
            try {
                const { progress: original, limit, reset, noCache } = opts;
                const { _queryInfo, _provider } = this;
                const finalize = (null == limit);
                opts.progress = (info) => {
                    original(info);
                    !finalize && this.add(info.items, opts);
                };
                if (noCache) {
                    this.clearCache();
                }
                if (!finalize && reset) {
                    this.reset(undefined, { silent: true });
                }
                const resp = await queryItems(_queryInfo, _provider, opts);
                if (finalize) {
                    reset ? this.reset(resp, opts) : this.add(resp, opts);
                }
                this.trigger('@sync', this, resp, opts);
                return resp;
            }
            catch (e) {
                this.trigger('@error', undefined, this, e, opts);
                throw e;
            }
        }
        /**
         * @en Execute `fetch()` with last query options.
         * @ja 前回と同条件で `fetch()` を実行
         *
         * @param options
         *  - `en` requery options.
         *  - `ja` リクエリオプション
         */
        requery(options) {
            const opts = Object.assign({}, this._lastQueryOptions, options, { reset: true });
            return this.fetch(opts);
        }
        set(seeds, options) {
            if (coreUtils.isNil(seeds)) {
                return;
            }
            const opts = Object.assign({ parse: this._defaultParse }, _setOptions, options);
            if (opts.parse && !isCollectionModel(seeds, this)) {
                seeds = this.parse(seeds, options) || [];
            }
            const singular = !coreUtils.isArray(seeds);
            const items = singular ? [seeds] : seeds.slice();
            const { store } = this[_properties];
            const at = ((candidate) => {
                if (null != candidate) {
                    if (candidate > store.length) {
                        return store.length;
                    }
                    if (candidate < 0) {
                        candidate += store.length;
                        return (candidate < 0) ? 0 : candidate;
                    }
                    return candidate;
                }
            })(opts.at);
            const set = [];
            const toAdd = [];
            const toMerge = [];
            const toRemove = [];
            const modelSet = new Set();
            const { add, merge, remove, parse, silent } = opts;
            let sort = false;
            const sortable = this._comparators.length && null == at && false !== opts.sort;
            // Turn bare objects into model references, and prevent invalid models from being added.
            for (const [i, item] of items.entries()) {
                // If a duplicate is found, prevent it from being added and optionally merge it into the existing model.
                const existing = this.get(item);
                if (existing) {
                    if (merge && item !== existing) {
                        let attrs = model.isModel(item) ? item.toJSON() : item;
                        if (parse && coreUtils.isFunction(existing.parse)) {
                            attrs = existing.parse(attrs, opts);
                        }
                        if (coreUtils.isFunction(existing.setAttributes)) {
                            existing.setAttributes(attrs, opts);
                        }
                        else {
                            Object.assign(existing, attrs);
                        }
                        toMerge.push(existing);
                        if (sortable && !sort) {
                            sort = coreUtils.isFunction(existing.hasChanged) ? existing.hasChanged() : true;
                        }
                    }
                    if (!modelSet.has(existing)) {
                        modelSet.add(existing);
                        set.push(existing);
                    }
                    items[i] = existing;
                } // eslint-disable-line brace-style
                // If this is a new, valid model, push it to the `toAdd` list.
                else if (add) {
                    const model = items[i] = this[_prepareModel](item, opts);
                    if (model) {
                        toAdd.push(model);
                        this[_addReference](model);
                        modelSet.add(model);
                        set.push(model);
                    }
                }
            }
            // Remove stale models.
            if (remove) {
                for (const model of store) {
                    if (!modelSet.has(model)) {
                        toRemove.push(model);
                    }
                }
                if (toRemove.length) {
                    this[_removeModels](toRemove, opts);
                }
            }
            // See if sorting is needed, update `length` and splice in new models.
            let orderChanged = false;
            const replace = !sortable && add && remove;
            if (set.length && replace) {
                orderChanged = (store.length !== set.length) || store.some((m, index) => m !== set[index]);
                store.length = 0;
                spliceArray(store, set, 0);
            }
            else if (toAdd.length) {
                if (sortable) {
                    sort = true;
                }
                spliceArray(store, toAdd, null == at ? store.length : at);
            }
            // Silently sort the collection if appropriate.
            if (sort) {
                this.sort({ silent: true });
            }
            // Unless silenced, it's time to fire all appropriate add/sort/update events.
            if (!silent) {
                for (const [i, model$1] of toAdd.entries()) {
                    if (null != at) {
                        opts.index = at + i;
                    }
                    if (model.isModel(model$1) || (model$1 instanceof events.EventBroker)) {
                        model$1.trigger('@add', model$1, this, opts);
                    }
                    else {
                        this.trigger('@add', model$1, this, opts);
                    }
                }
                if (sort || orderChanged) {
                    this.trigger('@sort', this, opts);
                }
                if (toAdd.length || toRemove.length || toMerge.length) {
                    opts.changes = {
                        added: toAdd,
                        removed: toRemove,
                        merged: toMerge
                    };
                    this.trigger('@update', this, opts);
                }
            }
            // drop undefined
            const retval = items.filter(i => null != i);
            // Return the added (or merged) model (or models).
            return singular ? retval[0] : (retval.length ? retval : void 0);
        }
        /**
         * @en Replace a collection with a new list of models (or attribute hashes), triggering a single `reset` event on completion.
         * @ja コレクションを新しいモデル一覧で置換. 完了時に `reset` イベントを発行
         *
         * @param seeds
         *  - `en` given the seed of model array.
         *  - `ja` モデル要素の配列を指定
         * @param options
         *  - `en` reset options.
         *  - `ja` リセットオプション
         */
        reset(seeds, options) {
            const opts = Object.assign({}, options);
            const { store } = this[_properties];
            for (const model of store) {
                this[_removeReference](model);
            }
            opts.previous = store.slice();
            resetModelStore(this[_properties]);
            const models = seeds ? this.add(seeds, Object.assign({ silent: true }, opts)) : [];
            if (!opts.silent) {
                this.trigger('@reset', this, opts);
            }
            return models;
        }
        add(seeds, options) {
            return this.set(seeds, Object.assign({ merge: false }, options, _addOptions));
        }
        remove(seeds, options) {
            const opts = Object.assign({}, options);
            const singular = !coreUtils.isArray(seeds);
            const items = singular ? [seeds] : seeds.slice();
            const removed = this[_removeModels](items, opts);
            if (!opts.silent && removed.length) {
                opts.changes = { added: [], merged: [], removed };
                this.trigger('@update', this, opts);
            }
            return singular ? removed[0] : removed;
        }
        /**
         * @en Add a model to the end of the collection.
         * @ja 末尾にモデルを追加
         *
         * @param seed
         *  - `en` given the seed of model.
         *  - `ja` モデル要素を指定
         * @param options
         *  - `en` add options.
         *  - `ja` 追加オプション
         */
        push(seed, options) {
            const { store } = this[_properties];
            return this.add(seed, Object.assign({ at: store.length }, options));
        }
        /**
         * @en Remove a model from the end of the collection.
         * @ja 末尾のモデルを削除
         *
         * @param options
         *  - `en` Silenceable options.
         *  - `ja` Silenceable オプション
         */
        pop(options) {
            const { store } = this[_properties];
            return this.remove(store[store.length - 1], options);
        }
        /**
         * @en Add a model to the beginning of the collection.
         * @ja 先頭にモデルを追加
         *
         * @param seed
         *  - `en` given the seed of model.
         *  - `ja` モデル要素を指定
         * @param options
         *  - `en` add options.
         *  - `ja` 追加オプション
         */
        unshift(seed, options) {
            return this.add(seed, Object.assign({ at: 0 }, options));
        }
        /**
         * @en Remove a model from the beginning of the collection.
         * @ja 先頭のモデルを削除
         *
         * @param options
         *  - `en` Silenceable options.
         *  - `ja` Silenceable オプション
         */
        shift(options) {
            const { store } = this[_properties];
            return this.remove(store[0], options);
        }
        /**
         * @en Create a new instance of a model in this collection.
         * @ja 新しいモデルインスタンスを作成し, コレクションに追加
         *
         * @param attrs
         *  - `en` attributes object.
         *  - `ja` 属性オブジェクトを指定
         * @param options
         *  - `en` model construction options.
         *  - `ja` モデル構築オプション
         */
        create(attrs, options) {
            const { wait } = options || {};
            const seed = this[_prepareModel](attrs, options);
            if (!seed) {
                return undefined;
            }
            const model$1 = model.isModel(seed) ? seed : undefined;
            if (!wait || !model$1) {
                this.add(seed, options);
            }
            if (model$1) {
                void (async () => {
                    try {
                        await model$1.save(undefined, options);
                        if (wait) {
                            this.add(seed, options);
                        }
                    }
                    catch (e) {
                        this.trigger('@error', model$1, this, e, options);
                    }
                })();
            }
            return seed;
        }
        /** @internal model preparation */
        [_prepareModel](attrs, options) {
            if (isCollectionModel(attrs, this)) {
                return attrs;
            }
            const constructor = modelConstructor(this);
            const { modelOptions } = this[_properties];
            if (constructor) {
                const opts = Object.assign({}, modelOptions, options);
                const model = new constructor(attrs, opts);
                if (coreUtils.isFunction(model.validate)) {
                    const result$1 = model.validate();
                    if (result.FAILED(result$1.code)) {
                        this.trigger('@invalid', attrs, this, result$1, opts);
                        return undefined;
                    }
                }
                return model;
            }
            // plain object
            return attrs;
        }
        /** @internal Internal method called by both remove and set. */
        [_removeModels](models, options) {
            const opts = Object.assign({}, options);
            const removed = [];
            for (const mdl of models) {
                const model$1 = this.get(mdl);
                if (!model$1) {
                    continue;
                }
                const { store } = this[_properties];
                const index = store.indexOf(model$1);
                store.splice(index, 1);
                // Remove references before triggering 'remove' event to prevent an infinite loop.
                this[_removeReference](model$1, true);
                if (!opts.silent) {
                    opts.index = index;
                    if (model.isModel(model$1) || (model$1 instanceof events.EventBroker)) {
                        model$1.trigger('@remove', model$1, this, opts);
                    }
                    else {
                        this.trigger('@remove', model$1, this, opts);
                    }
                }
                removed.push(model$1);
                this[_removeReference](model$1, false);
            }
            return removed;
        }
        /** @internal Internal method to create a model's ties to a collection. */
        [_addReference](model$1) {
            const { byId } = this[_properties];
            const { _cid, id } = model$1;
            if (null != _cid) {
                byId.set(_cid, model$1);
            }
            if (null != id) {
                byId.set(id, model$1);
            }
            if (model.isModel(model$1) || (model$1 instanceof events.EventPublisher)) {
                this.listenTo(model$1, '*', this[_onModelEvent]);
            }
        }
        /** @internal Internal method to sever a model's ties to a collection. */
        [_removeReference](model$1, partial = false) {
            const { byId } = this[_properties];
            const { _cid, id } = model$1;
            if (null != _cid) {
                byId.delete(_cid);
            }
            if (null != id) {
                byId.delete(id);
            }
            if (!partial && (model.isModel(model$1) || (model$1 instanceof events.EventPublisher))) {
                this.stopListening(model$1, '*', this[_onModelEvent]);
            }
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: Iterable<TModel>
        /**
         * @en Iterator of [[ElementBase]] values in the array.
         * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
         */
        [Symbol.iterator]() {
            const iterator = {
                base: this.models,
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
         * @en Returns an iterable of key(id), value(model) pairs for every entry in the array.
         * @ja key(id), value(model) 配列にアクセス可能なイテレータオブジェクトを返却
         */
        entries() {
            return this[_createIterableIterator]((key, value) => [key, value]);
        }
        /**
         * @en Returns an iterable of keys(id) in the array.
         * @ja key(id) 配列にアクセス可能なイテレータオブジェクトを返却
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
                base: this.models,
                pointer: 0,
            };
            const pos2key = (pos) => {
                return getModelId(context.base[pos], modelConstructor(this)) || String(pos);
            };
            const iterator = {
                next() {
                    const current = context.pointer;
                    if (current < context.base.length) {
                        context.pointer++;
                        return {
                            done: false,
                            value: valueGenerator(pos2key(current), context.base[current]),
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
    // mixin による `instanceof` は無効に設定
    coreUtils.setMixClassAttribute(Collection, 'instanceOf', null);

    /** @internal */
    function prepare(collection) {
        if (collection.filtered) {
            throw result.makeResult(result.RESULT_CODE.ERROR_MVC_EDIT_PERMISSION_DENIED, 'collection is applied after-filter.');
        }
        return collection.models.slice();
    }
    /** @internal */
    async function exec(collection, options, operation) {
        const targets = prepare(collection);
        const change = await operation(targets, options?.cancel);
        collection.set(targets, options);
        return change;
    }
    /** @internal */
    function min(indices) {
        return indices.reduce((lhs, rhs) => Math.min(lhs, rhs));
    }
    /** @internal */
    function makeListChanged(type, changes, rangeFrom, rangeTo, at) {
        const changed = !!changes.length;
        return {
            type,
            list: changes,
            range: changed ? { from: rangeFrom, to: rangeTo } : undefined,
            insertedTo: changed ? at : undefined,
        };
    }
    /**
     * @en Clear all elements of [[Collection]].
     * @ja [[Collection]] 要素の全削除
     *
     * @param collection
     *  - `en` target [[Collection]]
     *  - `ja` 対象 [[Collection]]
     * @param options
     *  - `en` [[CollectionEditOptions]] reference.
     *  - `ja` [[CollectionEditOptions]] を指定
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function clearCollection(collection, options) {
        const rangeTo = collection.length - 1;
        const changes = await exec(collection, options, (targets, token) => clearArray(targets, token));
        return makeListChanged('remove', changes, 0, rangeTo);
    }
    /**
     * @en Append source elements to the end of [[Collection]].
     * @ja [[Collection]] の末尾に追加
     *
     * @param collection
     *  - `en` target [[Collection]]
     *  - `ja` 対象 [[Collection]]
     * @param src
     *  - `en` source elements
     *  - `ja` 追加元要素
     * @param options
     *  - `en` [[CollectionEditOptions]] reference.
     *  - `ja` [[CollectionEditOptions]] を指定
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function appendCollection(collection, src, options) {
        const rangeFrom = collection.length;
        const changes = await exec(collection, options, (targets, token) => appendArray(targets, src, token));
        return makeListChanged('add', changes, rangeFrom, collection.length - 1, rangeFrom);
    }
    /**
     * @en Insert source elements to specified index of [[Collection]].
     * @ja [[Collection]] の指定した位置に挿入
     *
     * @param collection
     *  - `en` target [[Collection]]
     *  - `ja` 対象 [[Collection]]
     * @param index
     *  - `ja` target array position index
     *  - `ja` 追加先のインデックス
     * @param src
     *  - `en` source elements
     *  - `ja` 追加元要素
     * @param options
     *  - `en` [[CollectionEditOptions]] reference.
     *  - `ja` [[CollectionEditOptions]] を指定
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function insertCollection(collection, index, src, options) {
        const changes = await exec(collection, options, (targets, token) => insertArray(targets, index, src, token));
        return makeListChanged('add', changes, index, collection.length - 1, index);
    }
    /**
     * @en Reorder [[Collection]] elements position.
     * @ja [[Collection]] 項目の位置を変更
     *
     * @param collection
     *  - `en` target [[Collection]]
     *  - `ja` 対象 [[Collection]]
     * @param index
     *  - `ja` target array position index
     *  - `ja` 追加先のインデックス
     * @param orders
     *  - `en` edit order index array
     *  - `ja` インデックス配列
     * @param options
     *  - `en` [[CollectionEditOptions]] reference.
     *  - `ja` [[CollectionEditOptions]] を指定
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function reorderCollection(collection, index, orders, options) {
        const rangeFrom = min([index, ...orders]);
        const changes = await exec(collection, options, (targets, token) => reorderArray(targets, index, orders, token));
        return makeListChanged('reorder', changes, rangeFrom, collection.length - 1, index);
    }
    /**
     * @en Remove [[Collection]] elements.
     * @ja [[Collection]] 項目の削除
     *
     * @param collection
     *  - `en` target [[Collection]]
     *  - `ja` 対象 [[Collection]]
     * @param orders
     *  - `en` removed order index array
     *  - `ja` インデックス配列
     * @param options
     *  - `en` [[CollectionEditOptions]] reference.
     *  - `ja` [[CollectionEditOptions]] を指定
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function removeCollection(collection, orders, options) {
        const rangeFrom = min(orders);
        const rangeTo = collection.length - 1;
        const changes = await exec(collection, options, (targets, token) => removeArray(targets, orders, token));
        return makeListChanged('remove', changes, rangeFrom, rangeTo);
    }

    exports.ArrayCursor = ArrayCursor;
    exports.Collection = Collection;
    exports.DynamicCondition = DynamicCondition;
    exports.appendArray = appendArray;
    exports.appendCollection = appendCollection;
    exports.clearArray = clearArray;
    exports.clearCollection = clearCollection;
    exports.conditionalFix = conditionalFix;
    exports.convertSortKeys = convertSortKeys;
    exports.defaultCollatorProvider = defaultCollatorProvider;
    exports.getBooleanComparator = getBooleanComparator;
    exports.getDateComparator = getDateComparator;
    exports.getGenericComparator = getGenericComparator;
    exports.getNumberComparator = getNumberComparator;
    exports.getStringComparator = getStringComparator;
    exports.insertArray = insertArray;
    exports.insertCollection = insertCollection;
    exports.queryItems = queryItems;
    exports.removeArray = removeArray;
    exports.removeCollection = removeCollection;
    exports.reorderArray = reorderArray;
    exports.reorderCollection = reorderCollection;
    exports.searchItems = searchItems;
    exports.toComparator = toComparator;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIiwiYmFzZS50cyIsImNvbGxlY3Rpb24tZWRpdG9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICwgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQ09MTEVDVElPTiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDEwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX0NPTExFQ1RJT05fREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMSwgJ2ludmFsaWQgYWNjZXNzLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUyAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAyLCAnaW52YWxpZCBjb21wYXJhdG9ycy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMywgJ2VkaXRpbmcgcGVybWlzc2lvbiBkZW5pZWQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZ2V0TGFuZ3VhZ2UgfSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBTb3J0T3JkZXIsXG4gICAgU29ydENhbGxiYWNrLFxuICAgIFNvcnRLZXksXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBgSW50bC5Db2xsYXRvcmAgZmFjdG9yeSBmdW5jdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEgYEludGwuQ29sbGF0b3JgIOOCkui/lOWNtOOBmeOCi+mWouaVsOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsYXRvclByb3ZpZGVyID0gKCkgPT4gSW50bC5Db2xsYXRvcjtcblxuLyoqIEBpbnRlcm5hbCBkZWZhdWx0IEludGwuQ29sbGF0b3IgcHJvdmlkZXIgKi9cbmxldCBfY29sbGF0b3I6IENvbGxhdG9yUHJvdmlkZXIgPSAoKTogSW50bC5Db2xsYXRvciA9PiB7XG4gICAgcmV0dXJuIG5ldyBJbnRsLkNvbGxhdG9yKGdldExhbmd1YWdlKCksIHsgc2Vuc2l0aXZpdHk6ICdiYXNlJywgbnVtZXJpYzogdHJ1ZSB9KTtcbn07XG5cbi8qKlxuICogQGphIOaXouWumuOBriBJbnRsLkNvbGxhdG9yIOOCkuioreWumlxuICpcbiAqIEBwYXJhbSBuZXdQcm92aWRlclxuICogIC0gYGVuYCBuZXcgW1tDb2xsYXRvclByb3ZpZGVyXV0gb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC5cbiAqICAtIGBqYWAg6Kit5a6a44GV44KM44Gm44GE44GfIFtbQ29sbGF0b3JQcm92aWRlcl1dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdENvbGxhdG9yUHJvdmlkZXIobmV3UHJvdmlkZXI/OiBDb2xsYXRvclByb3ZpZGVyKTogQ29sbGF0b3JQcm92aWRlciB7XG4gICAgaWYgKG51bGwgPT0gbmV3UHJvdmlkZXIpIHtcbiAgICAgICAgcmV0dXJuIF9jb2xsYXRvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRQcm92aWRlciA9IF9jb2xsYXRvcjtcbiAgICAgICAgX2NvbGxhdG9yID0gbmV3UHJvdmlkZXI7XG4gICAgICAgIHJldHVybiBvbGRQcm92aWRlcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEdldCBzdHJpbmcgY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDmloflrZfliJfmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCBwcm9wZXJ0eSBuYW1lXG4gKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICogQHBhcmFtIG9yZGVyXG4gKiAgLSBgZW5gIHNvcnQgb3JkZXIgY29kZVxuICogIC0gYGphYCDjgr3jg7zjg4jpoIbjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIC8vIHVuZGVmaW5lZCDjga8gJycg44Go5ZCM562J44Gr5omx44GGXG4gICAgICAgIGNvbnN0IGxoc1Byb3AgPSAobnVsbCAhPSBsaHNbcHJvcCBhcyBzdHJpbmddKSA/IGxoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgY29uc3QgcmhzUHJvcCA9IChudWxsICE9IHJoc1twcm9wIGFzIHN0cmluZ10pID8gcmhzW3Byb3AgYXMgc3RyaW5nXSA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wIGFzIHN0cmluZ107XG4gICAgICAgIGNvbnN0IHJoc0RhdGUgPSByaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobGhzRGF0ZSA9PT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gKHVuZGVmaW5lZCA9PT0gdW5kZWZpbmVkKSBvciDoh6rlt7Hlj4LnhadcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNEYXRlKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbGhzVmFsdWUgPSBPYmplY3QobGhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgY29uc3QgcmhzVmFsdWUgPSBPYmplY3QocmhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgaWYgKGxoc1ZhbHVlID09PSByaHNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGxoc1ZhbHVlIDwgcmhzVmFsdWUgPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBnZW5lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24gYnkgY29tcGFyYXRpdmUgb3BlcmF0b3IuXG4gKiBAamEg5q+U6LyD5ryU566X5a2Q44KS55So44GE44Gf5rGO55So5q+U6LyD6Zai5pWw44Gu5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGxoc1twcm9wIGFzIHN0cmluZ10gPT09IHJoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcCBhcyBzdHJpbmddIDwgcmhzW3Byb3AgYXMgc3RyaW5nXSA/IC0xICogb3JkZXIgOiAxICogb3JkZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGJvb2xlYW4gY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDnnJ/lgb3lgKTmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEJvb2xlYW5Db21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIEdldCBudW1lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pWw5YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXROdW1iZXJDb21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBmcm9tIFtbU29ydEtleV1dLlxuICogQGphIFtbU29ydEtleV1dIOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdHlwZSwgb3JkZXIgfSA9IHNvcnRLZXk7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIFtbU29ydEtleV1dIGFycmF5LlxuICogQGphIFtbU29ydEtleV1dIOmFjeWIl+OCkiBjb21wYXJhdG9yIOmFjeWIl+OBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNvcnRLZXlzPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXlzOiBTb3J0S2V5PEs+W10pOiBTb3J0Q2FsbGJhY2s8VD5bXSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUPltdID0gW107XG4gICAgZm9yIChjb25zdCBzb3J0S2V5IG9mIHNvcnRLZXlzKSB7XG4gICAgICAgIGNvbXBhcmF0b3JzLnB1c2godG9Db21wYXJhdG9yKHNvcnRLZXkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBhcmF0b3JzO1xufVxuIiwiLyoqXG4gKiBAZW4gQ3Vyc29yIHBvc2l0aW9uIGNvbnN0YW50LlxuICogQGphIOOCq+ODvOOCveODq+S9jee9ruWumuaVsFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDdXJzb3JQb3Mge1xuICAgIE9VVF9PRl9SQU5HRSAgICA9IC0xLFxuICAgIENVUlJFTlQgICAgICAgICA9IC0yLFxufVxuXG4vKipcbiAqIEBlbiBTZWVrIGV4cHJlc3Npb24gZnVuY3Rpb24gdHlwZS5cbiAqIEBqYSDjgrfjg7zjgq/lvI/plqLmlbDlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vla0V4cDxUPiA9ICh2YWx1ZTogVCwgaW5kZXg/OiBudW1iZXIsIG9iaj86IFRbXSkgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHByb3ZpZGVzIGN1cnNvciBpbnRlcmZhY2UgZm9yIEFycmF5LiA8YnI+XG4gKiAgICAgSXQgaXMgZGlmZmVyZW50IGZyb20gSXRlcmF0b3IgaW50ZXJmYWNlIG9mIGVzMjAxNSwgYW5kIHRoYXQgcHJvdmlkZXMgaW50ZXJmYWNlIHdoaWNoIGlzIHNpbWlsYXIgdG8gREIgcmVjb3Jkc2V0J3Mgb25lLlxuICogQGphIEFycmF5IOeUqOOCq+ODvOOCveODqyBJL0Yg44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBlczIwMTUg44GuIEl0ZXJhdG9yIEkvRiDjgajjga/nlbDjgarjgorjgIFEQiByZWNvcmRzZXQg44Kq44OW44K444Kn44Kv44OI44Op44Kk44Kv44Gq6LWw5p+7IEkvRiDjgpLmj5DkvpvjgZnjgotcbiAqL1xuZXhwb3J0IGNsYXNzIEFycmF5Q3Vyc29yPFQgPSBhbnk+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLyoqIEBpbnRlcm5hbCDlr77osaHjga7phY3liJcgICovXG4gICAgcHJpdmF0ZSBfYXJyYXk6IFRbXTtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruWFiOmgreOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICAqL1xuICAgIHByaXZhdGUgX2JvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruacq+WwvuOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfZW9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg54++5Zyo44GuIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogMFxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiAwXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXJyYXk6IFRbXSwgaW5pdGlhbEluZGV4ID0gMCkge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgdGFyZ2V0IGFycmF5LlxuICAgICAqIEBqYSDlr77osaHjga7lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5LiBkZWZhdWx0OiBlbXB0eSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+Wumi4gICBkZWZhdWx0OiDnqbrphY3liJdcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoYXJyYXk6IFRbXSA9IFtdLCBpbml0aWFsSW5kZXg6IG51bWJlciA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0UpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGN1cnJlbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheVt0aGlzLl9pbmRleF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjmjIfjgZfnpLrjgZfjgabjgYTjgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRhcmdldCBhcnJheSBsZW5ndGguXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBruimgee0oOaVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgQk9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5YWI6aCt44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQk9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBFT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7mnKvlsL7jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lb2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByYXcgYXJyYXkgaW5zdGFuY2UuXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBhcnJheSgpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY3Vyc29yIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGZpcnN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOWFiOmgreimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlRmlyc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBsYXN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOacq+Wwvuimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTGFzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIG5leHQgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5qyh44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVOZXh0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZikge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIHByZXZpb3VzIGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuWJjeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlUHJldmlvdXMoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fZW9mKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VlayBieSBwYXNzZWQgY3JpdGVyaWEuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG9wZXJhdGlvbiBmYWlsZWQsIHRoZSBjdXJzb3IgcG9zaXRpb24gc2V0IHRvIEVPRi5cbiAgICAgKiBAamEg5oyH5a6a5p2h5Lu244Gn44K344O844KvIDxicj5cbiAgICAgKiAgICAg44K344O844Kv44Gr5aSx5pWX44GX44Gf5aC05ZCI44GvIEVPRiDnirbmhYvjgavjgarjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjcml0ZXJpYVxuICAgICAqICAtIGBlbmAgaW5kZXggb3Igc2VlayBleHByZXNzaW9uXG4gICAgICogIC0gYGphYCBpbmRleCAvIOadoeS7tuW8j+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzZWVrKGNyaXRlcmlhOiBudW1iZXIgfCBTZWVrRXhwPFQ+KTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBjcml0ZXJpYSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBjcml0ZXJpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkuZmluZEluZGV4KGNyaXRlcmlhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIOOCq+ODvOOCveODq+OBjOacieWKueOBquevhOWbsuOCkuekuuOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0cnVlOiDmnInlirkgLyBmYWxzZTog54Sh5Yq5XG4gICAgICovXG4gICAgcHJpdmF0ZSB2YWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICgwIDw9IHRoaXMuX2luZGV4ICYmIHRoaXMuX2luZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmlxdWUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxUb2tlbixcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5LCBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgdHJ1bmMgPSBNYXRoLnRydW5jLmJpbmQoTWF0aCk7XG5cbi8qKiBAaW50ZXJuYWwgd2FpdCBmb3IgY2hhbmdlIGRldGVjdGlvbiAqL1xuZnVuY3Rpb24gbWFrZVByb21pc2U8VD4oZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD4sIHJlbWFwPzogVFtdKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBlZGl0b3Iub2ZmKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgICAgIHJlbWFwLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgcmVtYXAucHVzaCguLi5lZGl0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZWNvcmRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLm9uKGNhbGxiYWNrKTtcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFtbT2JzZXJ2YWJsZUFycmF5XV0gaWYgbmVlZGVkLiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0RWRpdENvbnRleHQ8VD4oXG4gICAgdGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sXG4gICAgdG9rZW4/OiBDYW5jZWxUb2tlblxuKTogUHJvbWlzZTx7IGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+OyBwcm9taXNlOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+OyB9PiB8IG5ldmVyIHtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgT2JzZXJ2YWJsZUFycmF5KSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcjogdGFyZ2V0LFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UodGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCBlZGl0b3IgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbSh0YXJnZXQpO1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3IsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZShlZGl0b3IsIHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCAndGFyZ2V0IGlzIG5vdCBBcnJheSBvciBPYnNlcnZhYmxlQXJyYXkuJyk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIHZhbGlkIG9yZGVycyBpbmRleCAqL1xuZnVuY3Rpb24gdmFsaWRPcmRlcnMobGVuZ3RoOiBudW1iZXIsIG9yZGVyczogbnVtYmVyW10pOiBib29sZWFuIHwgbmV2ZXIge1xuICAgIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgaW5kZXggb2Ygb3JkZXJzKSB7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgbGVuZ3RoIDw9IGluZGV4IHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYG9yZGVyc1tdIGluZGV4IGlzIGludmFsaWQuIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKDAsIHRhcmdldC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnB1c2goLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBhcnJheS5cbiAqIEBqYSDmjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgaW5zZXJ0QXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5zcGxpY2UoaW5kZXgsIDAsIC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVvcmRlciBhcnJheSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSDpoIXnm67jga7kvY3nva7jgpLlpInmm7RcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIGVkaXQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYHJlb3JkZXJBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKCF2YWxpZE9yZGVycyh0YXJnZXQubGVuZ3RoLCBvcmRlcnMpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDkvZzmpa3phY3liJfjgafnt6jpm4ZcbiAgICBsZXQgd29yazogKFQgfCBudWxsKVtdID0gQXJyYXkuZnJvbShlZGl0b3IpO1xuICAgIHtcbiAgICAgICAgY29uc3QgcmVvcmRlcnM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgICAgICByZW9yZGVycy5wdXNoKGVkaXRvcltvcmRlcl0pO1xuICAgICAgICAgICAgd29ya1tvcmRlcl0gPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgd29yay5zcGxpY2UoaW5kZXgsIDAsIC4uLnJlb3JkZXJzKTtcbiAgICAgICAgd29yayA9IHdvcmsuZmlsdGVyKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIOWApOOCkuabuOOBjeaIu+OBl1xuICAgIGZvciAoY29uc3QgaWR4IG9mIHdvcmsua2V5cygpKSB7XG4gICAgICAgIGVkaXRvcltpZHhdID0gd29ya1tpZHhdIGFzIFQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlbW92ZSBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDpoIXnm67jga7liYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgcmVtb3ZlZCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZUFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKCF2YWxpZE9yZGVycyh0YXJnZXQubGVuZ3RoLCBvcmRlcnMpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDpmY3poIbjgr3jg7zjg4hcbiAgICBvcmRlcnMuc29ydCgobGhzLCByaHMpID0+IHtcbiAgICAgICAgcmV0dXJuIChsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICBlZGl0b3Iuc3BsaWNlKG9yZGVyLCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbiIsImltcG9ydCB7IEtleXMsIGNvbXB1dGVEYXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEZpbHRlckNhbGxiYWNrLCBEeW5hbWljQ29tYmluYXRpb24gfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgVmFsdWVUeXBlQUxMPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBzdHJpbmcgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PG51bWJlciB8IERhdGUsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgVmFsdWVUeXBlU3RyaW5nPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxzdHJpbmcsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCB1bmRlZmluZWQ7XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdICE9PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVIgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTUyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3M8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDw9IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IFN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0xJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RMaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAhU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiBkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc05vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiAhKGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLlJBTkdFICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgbWluOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+LCBtYXg6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIGNvbWJpbmF0aW9uKER5bmFtaWNDb21iaW5hdGlvbi5BTkQsIGdyZWF0ZXJFcXVhbChwcm9wLCBtaW4pLCBsZXNzRXF1YWwocHJvcCwgbWF4KSk7XG59XG5cbi8qKiBAaW50ZXJuYWwg44OV44Kj44Or44K/44Gu5ZCI5oiQICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluYXRpb248VCBleHRlbmRzIG9iamVjdD4odHlwZTogRHluYW1pY0NvbWJpbmF0aW9uLCBsaHM6IEZpbHRlckNhbGxiYWNrPFQ+LCByaHM6IEZpbHRlckNhbGxiYWNrPFQ+IHwgdW5kZWZpbmVkKTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAhcmhzID8gbGhzIDogKGl0ZW06IFQpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5BTkQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5PUjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pIHx8IHJocyhpdGVtKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIGNvbWJpbmF0aW9uOiAke3R5cGV9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgLy8gZmFpbCBzYWZlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwiaW1wb3J0IHsgS2V5cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxuICAgIER5bmFtaWNDb25kaXRpb25TZWVkLFxuICAgIER5bmFtaWNPcGVyYXRvckNvbnRleHQsXG4gICAgRHluYW1pY0xpbWl0Q29uZGl0aW9uLFxuICAgIER5bmFtaWNPcGVyYXRvcixcbiAgICBEeW5hbWljQ29tYmluYXRpb24sXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBWYWx1ZVR5cGVBTEwsXG4gICAgVmFsdWVUeXBlQ29tcGFyYWJsZSxcbiAgICBWYWx1ZVR5cGVTdHJpbmcsXG4gICAgZXF1YWwsXG4gICAgbm90RXF1YWwsXG4gICAgZ3JlYXRlcixcbiAgICBsZXNzLFxuICAgIGdyZWF0ZXJFcXVhbCxcbiAgICBsZXNzRXF1YWwsXG4gICAgbGlrZSxcbiAgICBub3RMaWtlLFxuICAgIGRhdGVMZXNzRXF1YWwsXG4gICAgZGF0ZUxlc3NOb3RFcXVhbCxcbiAgICByYW5nZSxcbiAgICBjb21iaW5hdGlvbixcbn0gZnJvbSAnLi9keW5hbWljLWZpbHRlcnMnO1xuXG4vKipcbiAqIEBlbiBEeW5hbWljIHF1ZXJ5IGNvbmRpdGlvbiBtYW5hZ2VyIGNsYXNzLlxuICogQGphIOODgOOCpOODiuODn+ODg+OCr+OCr+OCqOODqueKtuaFi+euoeeQhuOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY0NvbmRpdGlvbjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+IGltcGxlbWVudHMgRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+IHtcblxuICAgIHByaXZhdGUgX29wZXJhdG9yczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9jb21iaW5hdGlvbjogRHluYW1pY0NvbWJpbmF0aW9uO1xuICAgIHByaXZhdGUgX3N1bUtleXM6IEtleXM8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfbGltaXQ/OiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+O1xuICAgIHByaXZhdGUgX3JhbmRvbTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9zb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgW1tEeW5hbWljQ29uZGl0aW9uU2VlZF1dIGluc3RhbmNlXG4gICAgICogIC0gYGphYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM6IER5bmFtaWNDb25kaXRpb25TZWVkPFRJdGVtLCBUS2V5PiA9IHsgb3BlcmF0b3JzOiBbXSB9KSB7XG4gICAgICAgIGNvbnN0IHsgb3BlcmF0b3JzLCBjb21iaW5hdGlvbiwgc3VtS2V5cywgbGltaXQsIHJhbmRvbSwgc29ydEtleXMgfSA9IHNlZWRzO1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgICAgID0gb3BlcmF0b3JzO1xuICAgICAgICB0aGlzLl9jb21iaW5hdGlvbiAgID0gbnVsbCAhPSBjb21iaW5hdGlvbiA/IGNvbWJpbmF0aW9uIDogRHluYW1pY0NvbWJpbmF0aW9uLkFORDtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyAgICAgICA9IG51bGwgIT0gc3VtS2V5cyA/IHN1bUtleXMgOiBbXTtcbiAgICAgICAgdGhpcy5fbGltaXQgICAgICAgICA9IGxpbWl0O1xuICAgICAgICB0aGlzLl9yYW5kb20gICAgICAgID0gISFyYW5kb207XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzICAgICAgPSBzb3J0S2V5cyB8fCBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZFxuXG4gICAgZ2V0IG9wZXJhdG9ycygpOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG5cbiAgICBzZXQgb3BlcmF0b3JzKHZhbHVlczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSkge1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IHN1bUtleXMoKTogKEtleXM8VEl0ZW0+KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1bUtleXM7XG4gICAgfVxuXG4gICAgc2V0IHN1bUtleXModmFsdWVzOiAoS2V5czxUSXRlbT4pW10pIHtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgY29tYmluYXRpb24oKTogRHluYW1pY0NvbWJpbmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbWJpbmF0aW9uO1xuICAgIH1cblxuICAgIHNldCBjb21iaW5hdGlvbih2YWx1ZTogRHluYW1pY0NvbWJpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGxpbWl0KCk6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGltaXQ7XG4gICAgfVxuXG4gICAgc2V0IGxpbWl0KHZhbHVlOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2xpbWl0ID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHJhbmRvbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbTtcbiAgICB9XG5cbiAgICBzZXQgcmFuZG9tKHZhbHVlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3JhbmRvbSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBzb3J0S2V5cygpOiBTb3J0S2V5PFRLZXk+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc29ydEtleXM7XG4gICAgfVxuXG4gICAgc2V0IHNvcnRLZXlzKHZhbHVlczogU29ydEtleTxUS2V5PltdKSB7XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzID0gdmFsdWVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBhY2Nlc3NvcjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29tcGFyYXRvciBmdW5jdGlvbnMuXG4gICAgICogQGphIOavlOi8g+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBjb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gY29udmVydFNvcnRLZXlzKHRoaXMuX3NvcnRLZXlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHN5bnRoZXNpcyBmaWx0ZXIgZnVuY3Rpb24uXG4gICAgICogQGphIOWQiOaIkOa4iOOBv+ODleOCo+ODq+OCv+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBmaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHtcbiAgICAgICAgbGV0IGZsdHI6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbmQgb2YgdGhpcy5fb3BlcmF0b3JzKSB7XG4gICAgICAgICAgICBjb25zdCB7IG9wZXJhdG9yLCBwcm9wLCB2YWx1ZSB9ID0gY29uZDtcbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuR1JFQVRFUjpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVyPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3M8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3NFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWtlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZVN0cmluZzxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVMZXNzRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NOb3RFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+LCBjb25kLnJhbmdlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRvcjogJHtvcGVyYXRvcn1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciB8fCAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIHNvcnQsXG4gICAgc2h1ZmZsZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIFNvcnRLZXksXG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvblF1ZXJ5SW5mbyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIER5bmFtaWNMaW1pdCxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscy9jb21wYXJhdG9yJztcbmltcG9ydCB7IER5bmFtaWNDb25kaXRpb24gfSBmcm9tICcuL2R5bmFtaWMtY29uZGl0aW9uJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgdHJ1bmMgPSBNYXRoLnRydW5jLmJpbmQoTWF0aCk7XG5cbi8qKiBAaW50ZXJuYWwg5L2/55So44GZ44KL44OX44Ot44OR44OG44Kj44GM5L+d6Ki844GV44KM44GfIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zICovXG5pbnRlcmZhY2UgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4gZXh0ZW5kcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIHNvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG4gICAgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEFwcGx5IGBmaWx0ZXJgIGFuZCBgc29ydCBrZXlgIHRvIHRoZSBgaXRlbXNgIGZyb20gW1txdWVyeUl0ZW1zXV1gKClgIHJlc3VsdC5cbiAqIEBqYSBbW3F1ZXJ5SXRlbXNdXWAoKWAg44GX44GfIGBpdGVtc2Ag44Gr5a++44GX44GmIGBmaWx0ZXJgIOOBqCBgc29ydCBrZXlgIOOCkumBqeeUqFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoSXRlbXM8VEl0ZW0+KGl0ZW1zOiBUSXRlbVtdLCBmaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4gfCBudWxsLCAuLi5jb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdKTogVEl0ZW1bXSB7XG4gICAgbGV0IHJlc3VsdCA9IGlzRnVuY3Rpb24oZmlsdGVyKSA/IGl0ZW1zLmZpbHRlcihmaWx0ZXIpIDogaXRlbXMuc2xpY2UoKTtcbiAgICBmb3IgKGNvbnN0IGNvbXBhcmF0b3Igb2YgY29tcGFyYXRvcnMpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29tcGFyYXRvcikpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHNvcnQocmVzdWx0LCBjb21wYXJhdG9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjb25kaXRpbmFsRml4IOOBq+S9v+eUqOOBmeOCiyBDcml0ZXJpYSBNYXAgKi9cbmNvbnN0IF9saW1pdENyaXRlcmlhID0ge1xuICAgIFtEeW5hbWljTGltaXQuQ09VTlRdOiBudWxsLFxuICAgIFtEeW5hbWljTGltaXQuU1VNXTogeyBjb2VmZjogMSB9LFxuICAgIFtEeW5hbWljTGltaXQuU0VDT05EXTogeyBjb2VmZjogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUlOVVRFXTogeyBjb2VmZjogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5IT1VSXTogeyBjb2VmZjogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkRBWV06IHsgY29lZmY6IDI0ICogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LktCXTogeyBjb2VmZjogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUJdOiB7IGNvZWZmOiAxMDI0ICogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuR0JdOiB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LlRCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0ICogMTAyNCB9LFxufTtcblxuLyoqXG4gKiBAZW4gRml4IHRoZSB0YXJnZXQgaXRlbXMgYnkgW1tEeW5hbWljQ29uZGl0aW9uXV0uXG4gKiBAamEgW1tEeW5hbWljQ29uZGl0aW9uXV0g44Gr5b6T44GE5a++6LGh44KS5pW05b2iXG4gKlxuICogQHBhcmFtIGl0ZW1zXG4gKiAgLSBgZW5gIHRhcmdldCBpdGVtcyAoZGVzdHJ1Y3RpdmUpXG4gKiAgLSBgamFgIOWvvuixoeOBruOCouOCpOODhuODoCAo56C05aOK55qEKVxuICogQHBhcmFtIGNvbmRpdGlvblxuICogIC0gYGVuYCBjb25kaXRpb24gb2JqZWN0XG4gKiAgLSBgamFgIOadoeS7tuOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uZGl0aW9uYWxGaXg8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PihcbiAgICBpdGVtczogVEl0ZW1bXSxcbiAgICBjb25kaXRpb246IER5bmFtaWNDb25kaXRpb248VEl0ZW0sIFRLZXk+XG4pOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPiB7XG4gICAgY29uc3QgeyByYW5kb20sIGxpbWl0LCBzdW1LZXlzIH0gPSBjb25kaXRpb247XG5cbiAgICBpZiAocmFuZG9tKSB7XG4gICAgICAgIHNodWZmbGUoaXRlbXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChsaW1pdCkge1xuICAgICAgICBjb25zdCB7IHVuaXQsIHZhbHVlLCBwcm9wIH0gPSBsaW1pdDtcbiAgICAgICAgY29uc3QgcmVzZXQ6IFRJdGVtW10gPSBbXTtcbiAgICAgICAgY29uc3QgY3JpdGVyaWEgPSBfbGltaXRDcml0ZXJpYVt1bml0XTtcbiAgICAgICAgY29uc3QgbGltaXRDb3VudCA9IHZhbHVlO1xuICAgICAgICBjb25zdCBleGNlc3MgPSAhIWxpbWl0LmV4Y2VzcztcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoIWNyaXRlcmlhKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSB7XG4gICAgICAgICAgICAgICAgY291bnQgKz0gKE51bWJlcihpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSAvIGNyaXRlcmlhLmNvZWZmKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgYWNjZXNzIHByb3BlcnR5OiAke3Byb3B9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsaW1pdENvdW50IDwgY291bnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXhjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGl0ZW1zID0gcmVzZXQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICBpdGVtcyxcbiAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0sIEtleXM8VEl0ZW0+PjtcblxuICAgIGlmICgwIDwgc3VtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBzdW1LZXlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgKz0gTnVtYmVyKGl0ZW1ba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCDjgZnjgafjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgabjgYTjgovlr77osaHjgavlr77jgZfjgaYgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIHF1ZXJ5IOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tQ2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgY2FjaGVkOiBUSXRlbVtdLFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgZmlsdGVyLFxuICAgICAgICBjb21wYXJhdG9ycyxcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgICAgICBub1NlYXJjaCxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBq+WvvuOBl+OBpuODleOCo+ODq+OCv+ODquODs+OCsCwg44K944O844OI44KS5a6f6KGMXG4gICAgY29uc3QgdGFyZ2V0cyA9IG5vU2VhcmNoID8gY2FjaGVkLnNsaWNlKCkgOiBzZWFyY2hJdGVtcyhjYWNoZWQsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuICAgIGxldCBpbmRleDogbnVtYmVyID0gKG51bGwgIT0gYmFzZUluZGV4KSA/IGJhc2VJbmRleCA6IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHsgbGltaXQgfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgeyBpbmRleCB9KTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSB0YXJnZXRzLnNsaWNlKGluZGV4LCAobnVsbCAhPSBsaW1pdCkgPyBpbmRleCArIGxpbWl0IDogdW5kZWZpbmVkKTtcblxuICAgICAgICByZXN1bHRzLnB1c2goLi4uaXRlbXMpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi5vcHRzIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+LFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldHMubGVuZ3RoIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCDjg6zjgrnjg53jg7Pjgrnjga7jgq3jg6Pjg4Pjgrfjg6XjgpLoqabooYwgKi9cbmZ1bmN0aW9uIHRyeUNhY2hlPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcmVzdWx0OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPixcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT5cbik6IHZvaWQge1xuICAgIGNvbnN0IHsgbm9DYWNoZSwgbm9TZWFyY2ggfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgY2FuQ2FjaGUgPSAhbm9DYWNoZSAmJiAhbm9TZWFyY2ggJiYgcmVzdWx0LnRvdGFsID09PSByZXN1bHQuaXRlbXMubGVuZ3RoO1xuICAgIGlmIChjYW5DYWNoZSkge1xuICAgICAgICBxdWVyeUluZm8uY2FjaGUgPSB7IC4uLnJlc3VsdCB9O1xuICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGBwcm92aWRlcmAg6Zai5pWw44KS5L2/55So44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBgcXVlcnlgIOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tUHJvdmlkZXI8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG5cbiAgICBjb25zdCByZWNlaXZlZEFsbCA9IChyZXNwOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPik6IGJvb2xlYW4gPT4ge1xuICAgICAgICBjb25zdCBoYXNDb25kID0gISFyZXNwLm9wdGlvbnM/LmNvbmRpdGlvbjtcbiAgICAgICAgcmV0dXJuIGhhc0NvbmQgfHwgcmVzcC50b3RhbCA9PT0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgfTtcblxuICAgIGxldCBpbmRleDogbnVtYmVyID0gKG51bGwgIT0gYmFzZUluZGV4KSA/IGJhc2VJbmRleCA6IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHtsaW1pdH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGxldCByZXNwID0gYXdhaXQgcHJvdmlkZXIob3B0cyk7XG4gICAgICAgIGNvbnN0IG5leHRPcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cywgcmVzcC5vcHRpb25zKTtcblxuICAgICAgICBpZiAocmVjZWl2ZWRBbGwocmVzcCkpIHtcbiAgICAgICAgICAgIHRyeUNhY2hlKHF1ZXJ5SW5mbywgcmVzcCwgbmV4dE9wdHMpO1xuXG4gICAgICAgICAgICBjb25zdCB7IG5vU2VhcmNoLCBjb25kaXRpb246IHNlZWQgfSA9IG5leHRPcHRzO1xuICAgICAgICAgICAgaWYgKHNlZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kaXRpb24gPSBuZXcgRHluYW1pY0NvbmRpdGlvbihzZWVkKTtcbiAgICAgICAgICAgICAgICByZXNwID0gY29uZGl0aW9uYWxGaXgoc2VhcmNoSXRlbXMoXG4gICAgICAgICAgICAgICAgICAgIHJlc3AuaXRlbXMsXG4gICAgICAgICAgICAgICAgICAgIGNvbmRpdGlvbi5maWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIC4uLmNvbmRpdGlvbi5jb21wYXJhdG9yc1xuICAgICAgICAgICAgICAgICksIGNvbmRpdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLmNhY2hlLCByZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHF1ZXJ5SW5mby5jYWNoZS5vcHRpb25zO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5RnJvbUNhY2hlKHJlc3AuaXRlbXMsIE9iamVjdC5hc3NpZ24ob3B0cywgeyBub1NlYXJjaCB9KSk7XG4gICAgICAgIH0vLyBlc2xpbnQtZGlzYWJsZS1saW5lIGJyYWNlLXN0eWxlXG5cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goLi4ucmVzcC5pdGVtcyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgICAgICB0b3RhbDogcmVzcC50b3RhbCxcbiAgICAgICAgICAgICAgICBpdGVtczogcmVzcC5pdGVtcyxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBuZXh0T3B0cyxcbiAgICAgICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcC50b3RhbCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IHJlc3AuaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeUNhY2hlKHF1ZXJ5SW5mbywgcmV0dmFsLCBuZXh0T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavlpInmj5sgKi9cbmZ1bmN0aW9uIGVuc3VyZU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHwgdW5kZWZpbmVkXG4pOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgc29ydEtleXM6IFtdIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgbm9TZWFyY2gsIHNvcnRLZXlzIH0gPSBvcHRzO1xuXG4gICAgaWYgKCFub1NlYXJjaCAmJiAoIW9wdHMuY29tcGFyYXRvcnMgfHwgb3B0cy5jb21wYXJhdG9ycy5sZW5ndGggPD0gMCkpIHtcbiAgICAgICAgb3B0cy5jb21wYXJhdG9ycyA9IGNvbnZlcnRTb3J0S2V5cyhzb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHMgYXMgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+O1xufVxuXG4vKipcbiAqIEBlbiBMb3cgbGV2ZWwgZnVuY3Rpb24gZm9yIFtbQ29sbGVjdGlvbl1dIHF1ZXJ5IGl0ZW1zLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIEl0ZW0g44KS44Kv44Ko44Oq44GZ44KL5L2O44Os44OZ44Or6Zai5pWwXG4gKlxuICogQHBhcmFtIHF1ZXJ5SW5mb1xuICogIC0gYGVuYCBxdWVyeSBpbmZvcm1hdGlvblxuICogIC0gYGphYCDjgq/jgqjjg6rmg4XloLFcbiAqIEBwYXJhbSBwcm92aWRlclxuICogIC0gYGVuYCBwcm92aWRlciBmdW5jdGlvblxuICogIC0gYGphYCDjg5fjg63jg5DjgqTjg4DplqLmlbBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHF1ZXJ5IG9wdGlvbnNcbiAqICAtIGBqYWAg44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeUl0ZW1zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8VEl0ZW1bXT4ge1xuICAgIGNvbnN0IG9wdHMgPSBlbnN1cmVPcHRpb25zKG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IG9wdHM7XG5cbiAgICAvLyBxdWVyeSDjgavkvb/nlKjjgZfjgZ8gc29ydCwgZmlsdGVyIOaDheWgseOCkuOCreODo+ODg+OCt+ODpVxuICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0pO1xuXG4gICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbUNhY2hlKHF1ZXJ5SW5mby5jYWNoZS5pdGVtcywgb3B0cykpLml0ZW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgcXVlcnlGcm9tUHJvdmlkZXIocXVlcnlJbmZvLCBwcm92aWRlciwgb3B0cykpLml0ZW1zO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgQ29uc3RydWN0b3IsXG4gICAgQ2xhc3MsXG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBLZXlzLFxuICAgIGlzTmlsLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIGx1aWQsXG4gICAgYXQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFNpbGVuY2VhYmxlLFxuICAgIFN1YnNjcmliYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFNvdXJjZSxcbiAgICBFdmVudFB1Ymxpc2hlcixcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWwsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgaXNNb2RlbCxcbn0gZnJvbSAnQGNkcC9tb2RlbCc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uU29ydE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkV2ZW50LFxuICAgIENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZGRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25TZXRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZVNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHNlYXJjaEl0ZW1zLCBxdWVyeUl0ZW1zIH0gZnJvbSAnLi9xdWVyeSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9wcm9wZXJ0aWVzICAgICAgICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfY3JlYXRlSXRlcmFibGVJdGVyYXRvciA9IFN5bWJvbCgnY3JlYXRlLWl0ZXJhYmxlLWl0ZXJhdG9yJyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJlcGFyZU1vZGVsICAgICAgICAgICA9IFN5bWJvbCgncHJlcGFyZS1tb2RlbCcpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3JlbW92ZU1vZGVscyAgICAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1tb2RlbHMnKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9hZGRSZWZlcmVuY2UgICAgICAgICAgID0gU3ltYm9sKCdhZGQtcmVmZXJlbmNlJyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfcmVtb3ZlUmVmZXJlbmNlICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX29uTW9kZWxFdmVudCAgICAgICAgICAgPSBTeW1ib2woJ21vZGVsLWV2ZW50LWhhbmRsZXInKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PiB7XG4gICAgcmVhZG9ubHkgY29uc3RydWN0T3B0aW9uczogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VCwgSz47XG4gICAgcmVhZG9ubHkgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VCwgSz47XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgcXVlcnlPcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxULCBLPjtcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VCwgSz47XG4gICAgcmVhZG9ubHkgbW9kZWxPcHRpb25zOiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM7XG4gICAgcmVhZG9ubHkgYnlJZDogTWFwPHN0cmluZywgVD47XG4gICAgc3RvcmU6IFRbXTtcbiAgICBhZnRlckZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFQ+O1xufVxuXG4vKiogQGludGVybmFsIHJlc2V0IG1vZGVsIGNvbnRleHQgKi9cbmNvbnN0IHJlc2V0TW9kZWxTdG9yZSA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4oY29udGV4dDogUHJvcGVydHk8VCwgSz4pOiB2b2lkID0+IHtcbiAgICBjb250ZXh0LmJ5SWQuY2xlYXIoKTtcbiAgICBjb250ZXh0LnN0b3JlLmxlbmd0aCA9IDA7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVTb3J0T3B0aW9ucyA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ob3B0aW9uczogQ29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+KTogUmVxdWlyZWQ8Q29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+PiA9PiB7XG4gICAgY29uc3QgeyBzb3J0S2V5czoga2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBvcHRpb25zO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNvcnRLZXlzOiBrZXlzIHx8IFtdLFxuICAgICAgICBjb21wYXJhdG9yczogY29tcHMgfHwgY29udmVydFNvcnRLZXlzKGtleXMgfHwgW10pLFxuICAgIH07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtb2RlbElkQXR0cmlidXRlID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gY3Rvcj8uWydpZEF0dHJpYnV0ZSddIHx8ICdpZCc7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBnZXRNb2RlbElkID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGF0dHJzOiBULCBjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGF0dHJzW21vZGVsSWRBdHRyaWJ1dGUoY3RvcildO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0Q2hhbmdlZElkcyA9IDxUIGV4dGVuZHMgb2JqZWN0PihvYmo6IG9iamVjdCwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiB7IGlkOiBzdHJpbmc7IHByZXZJZD86IHN0cmluZzsgfSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgdHlwZSBNb2RlbExpa2UgPSB7IHByZXZpb3VzOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZzsgfTtcbiAgICBjb25zdCBtb2RlbCA9IG9iaiBhcyBNb2RlbExpa2U7XG5cbiAgICBjb25zdCBpZEF0dHJpYnV0ZSA9IG1vZGVsSWRBdHRyaWJ1dGUoY3Rvcik7XG4gICAgY29uc3QgaWQgPSBtb2RlbFtpZEF0dHJpYnV0ZV07XG4gICAgaWYgKCFpc1N0cmluZyhpZCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4geyBpZDogbW9kZWxbaWRBdHRyaWJ1dGVdLCBwcmV2SWQ6IGlzRnVuY3Rpb24obW9kZWwucHJldmlvdXMpID8gbW9kZWwucHJldmlvdXMoaWRBdHRyaWJ1dGUpIDogdW5kZWZpbmVkIH07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtb2RlbENvbnN0cnVjdG9yID0gPFQgZXh0ZW5kcyBvYmplY3QsIEUgZXh0ZW5kcyBDb2xsZWN0aW9uRXZlbnQ8VD4sIEsgZXh0ZW5kcyBLZXlzPFQ+PihzZWxmOiBDb2xsZWN0aW9uPFQsIEUsIEs+KTogQ2xhc3MgfCB1bmRlZmluZWQgPT4ge1xuICAgIHJldHVybiBzZWxmLmNvbnN0cnVjdG9yWydtb2RlbCddO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgaXNDb2xsZWN0aW9uTW9kZWwgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHg6IHVua25vd24sIHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiB4IGlzIFQgPT4ge1xuICAgIGNvbnN0IGN0b3IgPSBtb2RlbENvbnN0cnVjdG9yKHNlbGYpO1xuICAgIHJldHVybiBpc0Z1bmN0aW9uKGN0b3IpID8geCBpbnN0YW5jZW9mIGN0b3IgOiBmYWxzZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHNwbGljZUFycmF5ID0gPFQ+KHRhcmdldDogVFtdLCBpbnNlcnQ6IFRbXSwgYXQ6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgIGF0ID0gTWF0aC5taW4oTWF0aC5tYXgoYXQsIDApLCB0YXJnZXQubGVuZ3RoKTtcbiAgICB0YXJnZXQuc3BsaWNlKGF0LCAwLCAuLi5pbnNlcnQpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gcGFyc2VGaWx0ZXJBcmdzPFQgZXh0ZW5kcyBvYmplY3Q+KC4uLmFyZ3M6IHVua25vd25bXSk6IENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnM8VD4ge1xuICAgIGNvbnN0IFtmaWx0ZXIsIG9wdGlvbnNdID0gYXJncztcbiAgICBpZiAobnVsbCA9PSBmaWx0ZXIpIHtcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH0gZWxzZSBpZiAoIWlzRnVuY3Rpb24oZmlsdGVyKSkge1xuICAgICAgICByZXR1cm4gZmlsdGVyIGFzIENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnM8VD47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHsgZmlsdGVyIH0pIGFzIENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnM8VD47XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2V0T3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IHRydWUsIG1lcmdlOiB0cnVlIH07XG4vKiogQGludGVybmFsICovXG5jb25zdCBfYWRkT3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlIH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIGNvbGxlY3Rpb24gdGhhdCBpcyBvcmRlcmVkIHNldHMgb2YgbW9kZWxzLlxuICogQGphIOODouODh+ODq+OBrumbhuWQiOOCkuaJseOBhuOCs+ODrOOCr+OCt+ODp+ODs+OBruWfuuW6leOCr+ODqeOCueWumue+qS5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbiAqIGltcG9ydCB7IE1vZGVsLCBNb2RlbENvbnN0cnVjdG9yIH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKiBpbXBvcnQge1xuICogICAgIENvbGxlY3Rpb24sXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAqIH0gZnJvbSAnQGNkcC9jb2xsZWN0aW9uJztcbiAqXG4gKiAvLyBNb2RlbCBzY2hlbWFcbiAqIGludGVyZmFjZSBUcmFja0F0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICB0aXRsZTogc3RyaW5nO1xuICogICBhcnRpc3Q6IHN0cmluZztcbiAqICAgYWxidW06ICBzdHJpbmc7XG4gKiAgIHJlbGVhc2VEYXRlOiBEYXRlO1xuICogICA6XG4gKiB9XG4gKlxuICogLy8gTW9kZWwgZGVmaW5pdGlvblxuICogY29uc3QgVHJhY2tCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxUcmFja0F0dHJpYnV0ZT4sIFRyYWNrQXR0cmlidXRlPjtcbiAqIGNsYXNzIFRyYWNrIGV4dGVuZHMgVHJhY2tCYXNlIHtcbiAqICAgICBzdGF0aWMgaWRBdHRyaWJ1dGUgPSAndXJpJztcbiAqIH1cbiAqXG4gKiAvLyBDb2xsZWN0aW9uIGRlZmluaXRpb25cbiAqIGNsYXNzIFBsYXlsaXN0IGV4dGVuZHMgQ29sbGVjdGlvbjxUcmFjaz4ge1xuICogICAgIC8vIHNldCB0YXJnZXQgTW9kZWwgY29uc3RydWN0b3JcbiAqICAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWwgPSBUcmFjaztcbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gdXNlIGN1c3RvbSBjb250ZW50IHByb3ZpZGVyIGZvciBmZXRjaC5cbiAqICAgICBwcm90ZWN0ZWQgYXN5bmMgc3luYyhcbiAqICAgICAgICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRyYWNrPlxuICogICAgICk6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+PiB7XG4gKiAgICAgICAgIC8vIHNvbWUgc3BlY2lmaWMgaW1wbGVtZW50YXRpb24gaGVyZS5cbiAqICAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBjdXN0b21Qcm92aWRlcihvcHRpb25zKTtcbiAqICAgICAgICAgcmV0dXJuIHtcbiAqICAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gKiAgICAgICAgICAgICBpdGVtcyxcbiAqICAgICAgICAgICAgIG9wdGlvbnMsXG4gKiAgICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+O1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gY29udmVydCBhIHJlc3BvbnNlIGludG8gYSBsaXN0IG9mIG1vZGVscy5cbiAqICAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IFBsYWluT2JqZWN0W10pOiBUcmFja0F0dHJpYnV0ZVtdIHtcbiAqICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLm1hcChzZWVkID0+IHtcbiAqICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBzZWVkLnJlbGVhc2VEYXRlO1xuICogICAgICAgICAgICAgc2VlZC5yZWxlYXNlRGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICogICAgICAgICAgICAgcmV0dXJuIHNlZWQ7XG4gKiAgICAgICAgIH0pIGFzIFRyYWNrQXR0cmlidXRlW107XG4gKiAgICAgIH1cbiAqIH1cbiAqXG4gKiBsZXQgc2VlZHM6IFRyYWNrQXR0cmlidXRlW107XG4gKlxuICogY29uc3QgcGxheWxpc3QgPSBuZXcgUGxheWxpc3Qoc2VlZHMsIHtcbiAqICAgICAvLyBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnNcbiAqICAgICBxdWVyeU9wdGlvbnM6IHtcbiAqICAgICAgICAgc29ydEtleXM6IFtcbiAqICAgICAgICAgICAgIHsgbmFtZTogJ3RpdGxlJywgb3JkZXI6IFNvcnRPcmRlci5ERVNDLCB0eXBlOiAnc3RyaW5nJyB9LFxuICogICAgICAgICBdLFxuICogICAgIH1cbiAqIH0pO1xuICpcbiAqIGF3YWl0IHBsYXlsaXN0LnJlcXVlcnkoKTtcbiAqXG4gKiBmb3IgKGNvbnN0IHRyYWNrIG9mIHBsYXlsaXN0KSB7XG4gKiAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodHJhY2sudG9KU09OKCkpKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29sbGVjdGlvbjxcbiAgICBUTW9kZWwgZXh0ZW5kcyBvYmplY3QgPSBhbnksIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIEV2ZW50IGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4gPSBDb2xsZWN0aW9uRXZlbnQ8VE1vZGVsPixcbiAgICBUS2V5IGV4dGVuZHMgS2V5czxUTW9kZWw+ID0gS2V5czxUTW9kZWw+XG4+IGV4dGVuZHMgRXZlbnRTb3VyY2U8RXZlbnQ+IGltcGxlbWVudHMgSXRlcmFibGU8VE1vZGVsPiB7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW9kZWwgY29uc3RydWN0b3IuIDxicj5cbiAgICAgKiAgICAgVGhlIGNvbnN0cnVjdG9yIGlzIHVzZWQgaW50ZXJuYWxseSBieSB0aGlzIFtbQ29sbGVjdGlvbl1dIGNsYXNzIGZvciBbW1RNb2RlbF1dIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAamEg44Oi44OH44Or44Kz44Oz44K544OI44Op44Kv44K/IDxicj5cbiAgICAgKiAgICAgW1tDb2xsZWN0aW9uXV0g44Kv44Op44K544GMIFtbVE1vZGVsXV0g44KS5qeL56+J44GZ44KL44Gf44KB44Gr5L2/55So44GZ44KLXG4gICAgICovXG4gICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsPzogQ2xhc3M7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY29uc3RydWN0aW9uL2Rlc3RydWN0aW9uOlxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkcz86IFRNb2RlbFtdIHwgUGxhaW5PYmplY3RbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBtb2RlbE9wdGlvbnM6IHt9LCBxdWVyeU9wdGlvbnM6IHt9IH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHsgbW9kZWxPcHRpb25zLCBxdWVyeU9wdGlvbnMgfSA9IG9wdHM7XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RPcHRpb25zOiBvcHRzLFxuICAgICAgICAgICAgcHJvdmlkZXI6IG9wdHMucHJvdmlkZXIgfHwgdGhpcy5zeW5jLmJpbmQodGhpcyksXG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ2NvbGxlY3Rpb246JywgOCksXG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMsXG4gICAgICAgICAgICBxdWVyeUluZm86IHt9LFxuICAgICAgICAgICAgbW9kZWxPcHRpb25zLFxuICAgICAgICAgICAgYnlJZDogbmV3IE1hcDxzdHJpbmcsIFRNb2RlbD4oKSxcbiAgICAgICAgICAgIHN0b3JlOiBbXSxcbiAgICAgICAgfSBhcyB1bmtub3duIGFzIFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbiAgICAgICAgdGhpcy5pbml0UXVlcnlJbmZvKCk7XG5cbiAgICAgICAgLyogbW9kZWwgZXZlbnQgaGFuZGxlciAqL1xuICAgICAgICB0aGlzW19vbk1vZGVsRXZlbnRdID0gKGV2ZW50OiBzdHJpbmcsIG1vZGVsOiBUTW9kZWwgfCB1bmRlZmluZWQsIGNvbGxlY3Rpb246IHRoaXMsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnQCcpICYmIG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgaWYgKCgnQGFkZCcgPT09IGV2ZW50IHx8ICdAcmVtb3ZlJyA9PT0gZXZlbnQpICYmIGNvbGxlY3Rpb24gIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJ0BkZXN0cm95JyA9PT0gZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW9kZWwgZXZlbnQgYXJndW1lbnRzIGFkanVzdG1lbnQuXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSAoY29sbGVjdGlvbiBhcyBhbnkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKG1vZGVsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdAY2hhbmdlJyA9PT0gZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRzID0gZ2V0Q2hhbmdlZElkcyhtb2RlbCwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaWQsIHByZXZJZCB9ID0gaWRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZJZCAhPT0gaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuc2V0KGlkLCBtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gcHJldklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuZGVsZXRlKHByZXZJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGRlbGVnYXRlIGV2ZW50XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyLmNhbGwodGhpcywgZXZlbnQsIG1vZGVsLCBjb2xsZWN0aW9uLCBvcHRpb25zKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11c2VsZXNzLWNhbGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2VlZHMpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIEluaXRpYWxpemUgcXVlcnkgaW5mb1xuICAgICAqIEBqYSDjgq/jgqjjg6rmg4XloLHjga7liJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaW5pdFF1ZXJ5SW5mbygpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKHRoaXMuX2RlZmF1bHRRdWVyeU9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9xdWVyeUluZm8gPSB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlZCBhbGwgaW5zdGFuY2VzIGFuZCBldmVudCBsaXN0ZW5lciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44KS56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyAocmVzZXJ2ZWQpLlxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzICjkuojntIQpXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2Uob3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdGhpcyB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IFtdO1xuICAgICAgICB0aGlzLmluaXRRdWVyeUluZm8oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBqYSBDbGVhciBjYWNoZSBpbnN0YW5jZSBtZXRob2RcbiAgICAgKiBAamEg44Kt44Oj44OD44K344Ol44Gu56C05qOEXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9xdWVyeUluZm8uY2FjaGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OIIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbW9kZWxzLlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgbW9kZWxzKCk6IHJlYWRvbmx5IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3QgeyBfcXVlcnlGaWx0ZXIsIF9hZnRlckZpbHRlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAoX2FmdGVyRmlsdGVyICYmIF9hZnRlckZpbHRlciAhPT0gX3F1ZXJ5RmlsdGVyKSA/IHN0b3JlLmZpbHRlcihfYWZ0ZXJGaWx0ZXIpIDogc3RvcmU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG51bWJlciBvZiBtb2RlbHMuXG4gICAgICogQGphIOWGheWMheOBmeOCi+ODouODh+ODq+aVsFxuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWxzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYXBwbGllZCBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBjOmBqeeUqOOBleOCjOOBpuOBhOOCi+OBi+OCkuWIpOWumlxuICAgICAqL1xuICAgIGdldCBmaWx0ZXJlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIGluc3RhbmNlXG4gICAgICogQGphIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5SW5mbygpOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc2V0IF9xdWVyeUluZm8odmFsOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvID0gdmFsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3JlYXRpbmcgb3B0aW9ucy5cbiAgICAgKiBAamEg5qeL56+J5pmC44Gu44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfb3B0aW9ucygpOiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnN0cnVjdE9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHByb3ZpZGVyLlxuICAgICAqIEBqYSDml6Llrprjga7jg5fjg63jg5DjgqTjg4DjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9wcm92aWRlcigpOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJvdmlkZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHBhcnNlIGJlaGF2aW91ci5cbiAgICAgKiBAamEg5pei5a6a44GuIHBhcnNlIOWLleS9nOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRQYXJzZSgpOiBib29sZWFuIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnMucGFyc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOaXouWumuOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeU9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOacgOW+jOOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2xhc3RRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbztcbiAgICAgICAgY29uc3Qgb3B0czogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiA9IHt9O1xuXG4gICAgICAgIHNvcnRLZXlzLmxlbmd0aCAmJiAob3B0cy5zb3J0S2V5cyA9IHNvcnRLZXlzKTtcbiAgICAgICAgY29tcGFyYXRvcnMubGVuZ3RoICYmIChvcHRzLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnMpO1xuICAgICAgICBmaWx0ZXIgJiYgKG9wdHMuZmlsdGVyID0gZmlsdGVyKTtcblxuICAgICAgICByZXR1cm4gb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHNvcnQgY29tcGFyYXRvcnMuXG4gICAgICogQGphIOOCveODvOODiOeUqOavlOi8g+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUTW9kZWw+W10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmNvbXBhcmF0b3JzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcXVlcnktZmlsdGVyLlxuICAgICAqIEBqYSDjgq/jgqjjg6rnlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9xdWVyeUZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5maWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2FmdGVyRmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdXRpbHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYSBtb2RlbCBmcm9tIGEgY29sbGVjdGlvbiwgc3BlY2lmaWVkIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJ44Oi44OH44Or44KS54m55a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGdldChzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHNlZWQpICYmIGJ5SWQuaGFzKHNlZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gYnlJZC5nZXQoc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpZCA9IGdldE1vZGVsSWQoaXNNb2RlbChzZWVkKSA/IHNlZWQudG9KU09OKCkgOiBzZWVkIGFzIG9iamVjdCwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSk7XG4gICAgICAgIGNvbnN0IGNpZCA9IChzZWVkIGFzIG9iamVjdCBhcyB7IF9jaWQ/OiBzdHJpbmc7IH0pLl9jaWQ7XG5cbiAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KGlkKSB8fCAoY2lkICYmIGJ5SWQuZ2V0KGNpZCkpIGFzIFRNb2RlbCB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG1vZGVsIGlzIGluIHRoZSBjb2xsZWN0aW9uIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJ44Oi44OH44Or44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGhhcyhzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5nZXQoc2VlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIGNvcHkgb2YgdGhlIG1vZGVsJ3MgYGF0dHJpYnV0ZXNgIG9iamVjdC5cbiAgICAgKiBAamEg44Oi44OH44Or5bGe5oCn5YCk44Gu44Kz44OU44O844KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHRvSlNPTigpOiBvYmplY3RbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVscy5tYXAobSA9PiBpc01vZGVsKG0pID8gbS50b0pTT04oKSA6IG0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlcyBDbG9uZSB0aGlzIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7opIfoo73jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb25zdHJ1Y3RvciwgX29wdGlvbnMgfSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgKGNvbnN0cnVjdG9yIGFzIENvbnN0cnVjdG9yPHRoaXM+KSh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgX29wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBhIGNvbGxlY3Rpb24gdG8gcmUtc29ydCBpdHNlbGYuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+imgee0oOOBruWGjeOCveODvOODiFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNvcnQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOOCveODvOODiOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzb3J0KG9wdGlvbnM/OiBDb2xsZWN0aW9uUmVTb3J0T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCB7IG5vVGhyb3csIHNpbGVudCB9ID0gb3B0cztcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBlbnN1cmVTb3J0T3B0aW9ucyhvcHRzKTtcbiAgICAgICAgY29uc3QgY29tcGFyYXRvcnMgPSAwIDwgY29tcHMubGVuZ3RoID8gY29tcHMgOiB0aGlzLl9jb21wYXJhdG9ycztcblxuICAgICAgICBpZiAoY29tcGFyYXRvcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGlmIChub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0NPTVBBUkFUT1JTLCAnQ2Fubm90IHNvcnQgYSBzZXQgd2l0aG91dCBhIGNvbXBhcmF0b3IuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IHNlYXJjaEl0ZW1zKHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLCB0aGlzLl9hZnRlckZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBxdWVyeUluZm9cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnM7XG4gICAgICAgIGlmICgwIDwgc29ydEtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uc29ydEtleXMgPSBzb3J0S2V5cztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc29ydCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbHkgYWZ0ZXItZmlsdGVyIHRvIGNvbGxlY3Rpb24gaXRzZWxmLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgZmlsdGVyIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFNpbGVuY2VhYmxlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBTaWxlbmNlYWJsZSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyKGNhbGxiYWNrOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkLCBvcHRpb25zPzogU2lsZW5jZWFibGUpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGx5IGFmdGVyLWZpbHRlciB0byBjb2xsZWN0aW9uIGl0c2VsZi5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWZ0ZXItZmlsdGVyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDntZ7jgorovrzjgb/jgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyKG9wdGlvbnM6IENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnM8VE1vZGVsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgZmlsdGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRzID0gcGFyc2VGaWx0ZXJBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCB7IGZpbHRlciwgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBpZiAoZmlsdGVyICE9PSB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcikge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BmaWx0ZXInLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG1vZGVsIGF0IHRoZSBnaXZlbiBpbmRleC4gSWYgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4sIHRoZSB0YXJnZXQgd2lsbCBiZSBmb3VuZCBmcm9tIHRoZSBsYXN0IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgavjgojjgovjg6Ljg4fjg6vjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXQoaW5kZXg6IG51bWJlcik6IFRNb2RlbCB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLm1vZGVscyBhcyBUTW9kZWxbXSwgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoKTogVE1vZGVsIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdmFsdWUgb2YgYGNvdW50YCBlbGVtZW50cyBvZiB0aGUgbW9kZWwgZnJvbSB0aGUgZmlyc3QuXG4gICAgICogQGphIOODouODh+ODq+OBruWFiOmgreOBi+OCiWBjb3VudGAg5YiG44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBmaXJzdChjb3VudD86IG51bWJlcik6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMubW9kZWxzO1xuICAgICAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0cy5zbGljZSgwLCBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBUTW9kZWwgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiBgY291bnRgIGVsZW1lbnRzIG9mIHRoZSBtb2RlbCBmcm9tIHRoZSBsYXN0LlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjga7lhYjpoK3jgYvjgolgY291bnRgIOWIhuOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBsYXN0KGNvdW50PzogbnVtYmVyKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5tb2RlbHM7XG4gICAgICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0c1t0YXJnZXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHMuc2xpY2UoLTEgKiBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIGNvbGxlY3Rpb24uIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IFBsYWluT2JqZWN0IHwgdm9pZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10gfCBQbGFpbk9iamVjdFtdIHwgdW5kZWZpbmVkIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFRNb2RlbFtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgW1tmZXRjaF1dIG1ldGhvZCBwcm94eSB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCBbW0NvbGxlY3Rpb25JdGVtUHJvdmlkZXJdXSByZXR1cm5zIG9uZS1zaG90IHJlc3VsdC5cbiAgICAgKiBAamEgW1tDb2xsZWN0aW9uSXRlbVByb3ZpZGVyXV0g5LqS5o+b44Gu5Y2Y55m644GuIGZldGNoIOe1kOaenOOCkui/lOWNtC4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMob3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGRlZmF1bHRTeW5jKCkuc3luYygncmVhZCcsIHRoaXMgYXMgU3luY0NvbnRleHQsIG9wdGlvbnMpIGFzIFRNb2RlbFtdO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSBbW01vZGVsXV0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGZldGNoIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg5Xjgqfjg4Pjg4Hjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8b2JqZWN0W10+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwcm9ncmVzczogbm9vcCB9LCB0aGlzLl9kZWZhdWx0UXVlcnlPcHRpb25zLCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBwcm9ncmVzczogb3JpZ2luYWwsIGxpbWl0LCByZXNldCwgbm9DYWNoZSB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IHsgX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyIH0gPSB0aGlzO1xuICAgICAgICAgICAgY29uc3QgZmluYWxpemUgPSAobnVsbCA9PSBsaW1pdCk7XG5cbiAgICAgICAgICAgIG9wdHMucHJvZ3Jlc3MgPSAoaW5mbzogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUTW9kZWw+KSA9PiB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWwoaW5mbyk7XG4gICAgICAgICAgICAgICAgIWZpbmFsaXplICYmIHRoaXMuYWRkKGluZm8uaXRlbXMsIG9wdHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKG5vQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmaW5hbGl6ZSAmJiByZXNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQodW5kZWZpbmVkLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHF1ZXJ5SXRlbXMoX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyLCBvcHRzKTtcblxuICAgICAgICAgICAgaWYgKGZpbmFsaXplKSB7XG4gICAgICAgICAgICAgICAgcmVzZXQgPyB0aGlzLnJlc2V0KHJlc3AsIG9wdHMpIDogdGhpcy5hZGQocmVzcCwgb3B0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBDb2xsZWN0aW9uLCByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZXJyb3InLCB1bmRlZmluZWQsIHRoaXMgYXMgQ29sbGVjdGlvbiwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYGZldGNoKClgIHdpdGggbGFzdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDliY3lm57jgajlkIzmnaHku7bjgacgYGZldGNoKClgIOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlcXVlcnkgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODquOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXF1ZXJ5KG9wdGlvbnM/OiBDb2xsZWN0aW9uUmVxdWVyeU9wdGlvbnMpOiBQcm9taXNlPG9iamVjdFtdPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9sYXN0UXVlcnlPcHRpb25zLCBvcHRpb25zLCB7IHJlc2V0OiB0cnVlIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaChvcHRzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBjb2xsZWN0aW9uIHNldHVwXG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44Gr44Oi44OH44Or44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYTjg6Ljg4fjg6vjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIE5pbCB2YWx1ZS5cbiAgICAgKiAgLSBgamFgIE5pbCDopoHntKBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWQ6IHVuZGVmaW5lZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgavjg6Ljg4fjg6vjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhOODouODh+ODq+OBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgavjg6Ljg4fjg6vjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhOODouODh+ODq+OBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkczogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBzZXQoc2VlZHM/OiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHZvaWQge1xuICAgICAgICBpZiAoaXNOaWwoc2VlZHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHBhcnNlOiB0aGlzLl9kZWZhdWx0UGFyc2UgfSwgX3NldE9wdGlvbnMsIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGlmIChvcHRzLnBhcnNlICYmICFpc0NvbGxlY3Rpb25Nb2RlbChzZWVkcywgdGhpcykpIHtcbiAgICAgICAgICAgIHNlZWRzID0gdGhpcy5wYXJzZShzZWVkcywgb3B0aW9ucykgfHwgW107XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXM6IChUTW9kZWwgfCBvYmplY3QgfCB1bmRlZmluZWQpW10gPSBzaW5ndWxhciA/IFtzZWVkc10gOiAoc2VlZHMgYXMgb2JqZWN0W10pLnNsaWNlKCk7XG5cbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG5cbiAgICAgICAgY29uc3QgYXQgPSAoKGNhbmRpZGF0ZSk6IG51bWJlciB8IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA+IHN0b3JlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgKz0gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGNhbmRpZGF0ZSA8IDApID8gMCA6IGNhbmRpZGF0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkob3B0cy5hdCk7XG5cbiAgICAgICAgY29uc3Qgc2V0OiBvYmplY3RbXSAgICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvQWRkOiBUTW9kZWxbXSAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b01lcmdlOiBUTW9kZWxbXSAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9SZW1vdmU6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGNvbnN0IG1vZGVsU2V0ID0gbmV3IFNldDxvYmplY3Q+KCk7XG5cbiAgICAgICAgY29uc3QgeyBhZGQsIG1lcmdlLCByZW1vdmUsIHBhcnNlLCBzaWxlbnQgfSA9IG9wdHM7XG5cbiAgICAgICAgbGV0IHNvcnQgPSBmYWxzZTtcbiAgICAgICAgY29uc3Qgc29ydGFibGUgPSB0aGlzLl9jb21wYXJhdG9ycy5sZW5ndGggJiYgbnVsbCA9PSBhdCAmJiBmYWxzZSAhPT0gb3B0cy5zb3J0O1xuXG4gICAgICAgIHR5cGUgTW9kZWxGZWF0dXJlID0ge1xuICAgICAgICAgICAgcGFyc2U6IChhdHJyPzogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiBvYmplY3Q7XG4gICAgICAgICAgICBzZXRBdHRyaWJ1dGVzOiAoYXRycjogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiB2b2lkO1xuICAgICAgICAgICAgaGFzQ2hhbmdlZDogKCkgPT4gYm9vbGVhbjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUdXJuIGJhcmUgb2JqZWN0cyBpbnRvIG1vZGVsIHJlZmVyZW5jZXMsIGFuZCBwcmV2ZW50IGludmFsaWQgbW9kZWxzIGZyb20gYmVpbmcgYWRkZWQuXG4gICAgICAgIGZvciAoY29uc3QgW2ksIGl0ZW1dIG9mIGl0ZW1zLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgLy8gSWYgYSBkdXBsaWNhdGUgaXMgZm91bmQsIHByZXZlbnQgaXQgZnJvbSBiZWluZyBhZGRlZCBhbmQgb3B0aW9uYWxseSBtZXJnZSBpdCBpbnRvIHRoZSBleGlzdGluZyBtb2RlbC5cbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5nZXQoaXRlbSkgYXMgTW9kZWxGZWF0dXJlO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lcmdlICYmIGl0ZW0gIT09IGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBhdHRycyA9IGlzTW9kZWwoaXRlbSkgPyBpdGVtLnRvSlNPTigpIDogaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlICYmIGlzRnVuY3Rpb24oZXhpc3RpbmcucGFyc2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRycyA9IGV4aXN0aW5nLnBhcnNlKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGV4aXN0aW5nLnNldEF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZy5zZXRBdHRyaWJ1dGVzKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIGF0dHJzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRvTWVyZ2UucHVzaChleGlzdGluZyBhcyBUTW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29ydGFibGUgJiYgIXNvcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvcnQgPSBpc0Z1bmN0aW9uKGV4aXN0aW5nLmhhc0NoYW5nZWQpID8gZXhpc3RpbmcuaGFzQ2hhbmdlZCgpIDogdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW1vZGVsU2V0LmhhcyhleGlzdGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxTZXQuYWRkKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnB1c2goZXhpc3RpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpdGVtc1tpXSA9IGV4aXN0aW5nO1xuICAgICAgICAgICAgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGJyYWNlLXN0eWxlXG5cbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBuZXcsIHZhbGlkIG1vZGVsLCBwdXNoIGl0IHRvIHRoZSBgdG9BZGRgIGxpc3QuXG4gICAgICAgICAgICBlbHNlIGlmIChhZGQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlbCA9IGl0ZW1zW2ldID0gdGhpc1tfcHJlcGFyZU1vZGVsXShpdGVtLCBvcHRzKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BZGQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX2FkZFJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIHN0YWxlIG1vZGVscy5cbiAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKG1vZGVsKSkge1xuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZS5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfcmVtb3ZlTW9kZWxzXSh0b1JlbW92ZSwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWUgaWYgc29ydGluZyBpcyBuZWVkZWQsIHVwZGF0ZSBgbGVuZ3RoYCBhbmQgc3BsaWNlIGluIG5ldyBtb2RlbHMuXG4gICAgICAgIGxldCBvcmRlckNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgcmVwbGFjZSA9ICFzb3J0YWJsZSAmJiBhZGQgJiYgcmVtb3ZlO1xuICAgICAgICBpZiAoc2V0Lmxlbmd0aCAmJiByZXBsYWNlKSB7XG4gICAgICAgICAgICBvcmRlckNoYW5nZWQgPSAoc3RvcmUubGVuZ3RoICE9PSBzZXQubGVuZ3RoKSB8fCBzdG9yZS5zb21lKChtLCBpbmRleCkgPT4gbSAhPT0gc2V0W2luZGV4XSk7XG4gICAgICAgICAgICBzdG9yZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgc3BsaWNlQXJyYXkoc3RvcmUsIHNldCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAodG9BZGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoc29ydGFibGUpIHtcbiAgICAgICAgICAgICAgICBzb3J0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCB0b0FkZCwgbnVsbCA9PSBhdCA/IHN0b3JlLmxlbmd0aCA6IGF0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNpbGVudGx5IHNvcnQgdGhlIGNvbGxlY3Rpb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgIGlmIChzb3J0KSB7XG4gICAgICAgICAgICB0aGlzLnNvcnQoeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVbmxlc3Mgc2lsZW5jZWQsIGl0J3MgdGltZSB0byBmaXJlIGFsbCBhcHByb3ByaWF0ZSBhZGQvc29ydC91cGRhdGUgZXZlbnRzLlxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaSwgbW9kZWxdIG9mIHRvQWRkLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBhdCArIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAYWRkJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BhZGQnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc29ydCB8fCBvcmRlckNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc29ydCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9BZGQubGVuZ3RoIHx8IHRvUmVtb3ZlLmxlbmd0aCB8fCB0b01lcmdlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWQ6IHRvQWRkLFxuICAgICAgICAgICAgICAgICAgICByZW1vdmVkOiB0b1JlbW92ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VkOiB0b01lcmdlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRyb3AgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IGl0ZW1zLmZpbHRlcihpID0+IG51bGwgIT0gaSkgYXMgVE1vZGVsW107XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBhZGRlZCAob3IgbWVyZ2VkKSBtb2RlbCAob3IgbW9kZWxzKS5cbiAgICAgICAgcmV0dXJuIHNpbmd1bGFyID8gcmV0dmFsWzBdIDogKHJldHZhbC5sZW5ndGggPyByZXR2YWwgOiB2b2lkIDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGEgY29sbGVjdGlvbiB3aXRoIGEgbmV3IGxpc3Qgb2YgbW9kZWxzIChvciBhdHRyaWJ1dGUgaGFzaGVzKSwgdHJpZ2dlcmluZyBhIHNpbmdsZSBgcmVzZXRgIGV2ZW50IG9uIGNvbXBsZXRpb24uXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OCkuaWsOOBl+OBhOODouODh+ODq+S4gOimp+OBp+e9ruaPmy4g5a6M5LqG5pmC44GrIGByZXNldGAg44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgrvjg4Pjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoc2VlZHM/OiAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zICYgeyBwcmV2aW91czogVE1vZGVsW107IH07XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIHN0b3JlKSB7XG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMucHJldmlvdXMgPSBzdG9yZS5zbGljZSgpO1xuICAgICAgICByZXNldE1vZGVsU3RvcmUodGhpc1tfcHJvcGVydGllc10pO1xuXG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHNlZWRzID8gdGhpcy5hZGQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpIDogW107XG5cbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHJlc2V0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb2RlbHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBtb2RlbCB0byB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz44G444Gu44Oi44OH44Or44Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkKHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgdG8gdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjg6rjgrnjg4jmjIflrprjgavjgojjgovjgrPjg6zjgq/jgrfjg6fjg7Pjgbjjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIGFkZChzZWVkczogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXQoc2VlZHMgYXMgVW5rbm93bk9iamVjdCwgT2JqZWN0LmFzc2lnbih7IG1lcmdlOiBmYWxzZSB9LCBvcHRpb25zLCBfYWRkT3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBzZXQuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBi+OCieODouODh+ODq+OCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbGlzdCBvZiBtb2RlbHMgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjg6rjgrnjg4jmjIflrprjgavjgojjgovjgrPjg6zjgq/jgrfjg6fjg7PjgYvjgonjga7liYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVtb3ZlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDliYrpmaTjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWRzOiAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3Qgc2luZ3VsYXIgPSAhaXNBcnJheShzZWVkcyk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gc2luZ3VsYXIgPyBbc2VlZHMgYXMgVE1vZGVsXSA6IChzZWVkcyBhcyBUTW9kZWxbXSkuc2xpY2UoKTtcbiAgICAgICAgY29uc3QgcmVtb3ZlZCA9IHRoaXNbX3JlbW92ZU1vZGVsc10oaXRlbXMsIG9wdHMpO1xuICAgICAgICBpZiAoIW9wdHMuc2lsZW50ICYmIHJlbW92ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7IGFkZGVkOiBbXSwgbWVyZ2VkOiBbXSwgcmVtb3ZlZCB9O1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNpbmd1bGFyID8gcmVtb3ZlZFswXSA6IHJlbW92ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIG1vZGVsIHRvIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacq+WwvuOBq+ODouODh+ODq+OCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHB1c2goc2VlZDogVE1vZGVsIHwgUGxhaW5PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2VlZCwgT2JqZWN0LmFzc2lnbih7IGF0OiBzdG9yZS5sZW5ndGggfSwgb3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacq+WwvuOBruODouODh+ODq+OCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFNpbGVuY2VhYmxlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBTaWxlbmNlYWJsZSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcG9wKG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc3RvcmVbc3RvcmUubGVuZ3RoIC0gMV0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBtb2RlbCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3jgavjg6Ljg4fjg6vjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bnNoaWZ0KHNlZWQ6IFRNb2RlbCB8IFBsYWluT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2VlZCwgT2JqZWN0LmFzc2lnbih7IGF0OiAwIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3jga7jg6Ljg4fjg6vjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNoaWZ0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc3RvcmVbMF0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgYSBtb2RlbCBpbiB0aGlzIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOaWsOOBl+OBhOODouODh+ODq+OCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkOOBlywg44Kz44Os44Kv44K344On44Oz44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cnNcbiAgICAgKiAgLSBgZW5gIGF0dHJpYnV0ZXMgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5bGe5oCn44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG1vZGVsIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNyZWF0ZShhdHRyczogb2JqZWN0LCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3Qgc2VlZCA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oYXR0cnMsIG9wdGlvbnMgYXMgU2lsZW5jZWFibGUpO1xuICAgICAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtb2RlbCA9IGlzTW9kZWwoc2VlZCkgPyBzZWVkIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXdhaXQgfHwgIW1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vZGVsLnNhdmUodW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHNlZWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZXJyb3InLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBtb2RlbCBwcmVwYXJhdGlvbiAqL1xuICAgIHByaXZhdGUgW19wcmVwYXJlTW9kZWxdKGF0dHJzOiBvYmplY3QgfCBUTW9kZWwgfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKGlzQ29sbGVjdGlvbk1vZGVsKGF0dHJzLCB0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBtb2RlbENvbnN0cnVjdG9yKHRoaXMpO1xuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucyB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGlmIChjb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG1vZGVsT3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IG5ldyBjb25zdHJ1Y3RvcihhdHRycywgb3B0cykgYXMgeyB2YWxpZGF0ZTogKCkgPT4gUmVzdWx0OyB9O1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24obW9kZWwudmFsaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbW9kZWwudmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAaW52YWxpZCcsIGF0dHJzIGFzIE1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIHJlc3VsdCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsIGFzIFRNb2RlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBsYWluIG9iamVjdFxuICAgICAgICByZXR1cm4gYXR0cnMgYXMgVE1vZGVsO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIGNhbGxlZCBieSBib3RoIHJlbW92ZSBhbmQgc2V0LiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVNb2RlbHNdKG1vZGVsczogVE1vZGVsW10sIG9wdGlvbnM6IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBtZGwgb2YgbW9kZWxzKSB7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IHRoaXMuZ2V0KG1kbCk7XG4gICAgICAgICAgICBpZiAoIW1vZGVsKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzdG9yZS5pbmRleE9mKG1vZGVsKTtcbiAgICAgICAgICAgIHN0b3JlLnNwbGljZShpbmRleCwgMSk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSByZWZlcmVuY2VzIGJlZm9yZSB0cmlnZ2VyaW5nICdyZW1vdmUnIGV2ZW50IHRvIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcC5cbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwsIHRydWUpO1xuXG4gICAgICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0ByZW1vdmUnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlbW92ZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gY3JlYXRlIGEgbW9kZWwncyB0aWVzIHRvIGEgY29sbGVjdGlvbi4gKi9cbiAgICBwcml2YXRlIFtfYWRkUmVmZXJlbmNlXShtb2RlbDogVE1vZGVsKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLnNldChfY2lkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuc2V0KGlkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgdGhpc1tfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCB0byBzZXZlciBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCwgcGFydGlhbCA9IGZhbHNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLmRlbGV0ZShfY2lkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGFydGlhbCAmJiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRQdWJsaXNoZXIpKSkge1xuICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKG1vZGVsIGFzIFN1YnNjcmliYWJsZSwgJyonLCB0aGlzW19vbk1vZGVsRXZlbnRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFRNb2RlbD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRvciBvZiBbW0VsZW1lbnRCYXNlXV0gdmFsdWVzIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg5qC857SN44GX44Gm44GE44KLIFtbRWxlbWVudEJhc2VdXSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUTW9kZWw+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLm1vZGVscyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFRNb2RlbD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUTW9kZWw+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleShpZCksIHZhbHVlKG1vZGVsKSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpLCB2YWx1ZShtb2RlbCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtzdHJpbmcsIFRNb2RlbF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gW2tleSwgdmFsdWVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXlzKGlkKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpZCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nKSA9PiBrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcy5tb2RlbHMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvczJrZXkgPSAocG9zOiBudW1iZXIpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGdldE1vZGVsSWQoY29udGV4dC5iYXNlW3Bvc10sIG1vZGVsQ29uc3RydWN0b3IodGhpcykpIHx8IFN0cmluZyhwb3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihwb3Mya2V5KGN1cnJlbnQpLCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yO1xuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKENvbGxlY3Rpb24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4iLCJpbXBvcnQgdHlwZSB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEFycmF5Q2hhbmdlUmVjb3JkIH0gZnJvbSAnQGNkcC9vYnNlcnZhYmxlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHR5cGUgeyBMaXN0Q2hhbmdlZCwgTGlzdEVkaXRPcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgY2xlYXJBcnJheSxcbiAgICBhcHBlbmRBcnJheSxcbiAgICBpbnNlcnRBcnJheSxcbiAgICByZW9yZGVyQXJyYXksXG4gICAgcmVtb3ZlQXJyYXksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0aW9uIH0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4gRWRpdGVkIGNvbGxlY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOiiq+e3qOmbhuOCs+ODrOOCr+OCt+ODp+ODs+OBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uRWRpdGVlPE0gZXh0ZW5kcyBvYmplY3Q+ID0gQ29sbGVjdGlvbjxNLCBhbnksIGFueT47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwcmVwYXJlPFQgZXh0ZW5kcyBvYmplY3Q+KGNvbGxlY3Rpb246IENvbGxlY3Rpb24pOiBUW10gfCBuZXZlciB7XG4gICAgaWYgKGNvbGxlY3Rpb24uZmlsdGVyZWQpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfRURJVF9QRVJNSVNTSU9OX0RFTklFRCwgJ2NvbGxlY3Rpb24gaXMgYXBwbGllZCBhZnRlci1maWx0ZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBjb2xsZWN0aW9uLm1vZGVscy5zbGljZSgpO1xufVxuXG4vKiogQGludGVybmFsICovXG5hc3luYyBmdW5jdGlvbiBleGVjPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248VD4sXG4gICAgb3B0aW9uczogTGlzdEVkaXRPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAgIG9wZXJhdGlvbjogKHRhcmdldHM6IFRbXSwgdG9rZW46IENhbmNlbFRva2VuIHwgdW5kZWZpbmVkKSA9PiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+LFxuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgY29uc3QgdGFyZ2V0cyA9IHByZXBhcmU8VD4oY29sbGVjdGlvbik7XG4gICAgY29uc3QgY2hhbmdlID0gYXdhaXQgb3BlcmF0aW9uKHRhcmdldHMsIG9wdGlvbnM/LmNhbmNlbCk7XG4gICAgY29sbGVjdGlvbi5zZXQodGFyZ2V0cywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGNoYW5nZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gbWluKGluZGljZXM6IG51bWJlcltdKTogbnVtYmVyIHtcbiAgICByZXR1cm4gaW5kaWNlcy5yZWR1Y2UoKGxocywgcmhzKSA9PiBNYXRoLm1pbihsaHMsIHJocykpO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBtYWtlTGlzdENoYW5nZWQ8VD4oXG4gICAgdHlwZTogJ2FkZCcgfCAncmVtb3ZlJyB8ICdyZW9yZGVyJyxcbiAgICBjaGFuZ2VzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdLFxuICAgIHJhbmdlRnJvbTogbnVtYmVyLFxuICAgIHJhbmdlVG86IG51bWJlcixcbiAgICBhdD86IG51bWJlcixcbik6IExpc3RDaGFuZ2VkPFQ+IHtcbiAgICBjb25zdCBjaGFuZ2VkID0gISFjaGFuZ2VzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlLFxuICAgICAgICBsaXN0OiBjaGFuZ2VzLFxuICAgICAgICByYW5nZTogY2hhbmdlZCA/IHsgZnJvbTogcmFuZ2VGcm9tLCB0bzogcmFuZ2VUbyB9IDogdW5kZWZpbmVkLFxuICAgICAgICBpbnNlcnRlZFRvOiBjaGFuZ2VkID8gYXQgOiB1bmRlZmluZWQsXG4gICAgfSBhcyBMaXN0Q2hhbmdlZDxUPjtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXIgYWxsIGVsZW1lbnRzIG9mIFtbQ29sbGVjdGlvbl1dLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIOimgee0oOOBruWFqOWJiumZpFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCBbW0NvbGxlY3Rpb25dXVxuICogIC0gYGphYCDlr77osaEgW1tDb2xsZWN0aW9uXV1cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0gcmVmZXJlbmNlLlxuICogIC0gYGphYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZVRvID0gY29sbGVjdGlvbi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gY2xlYXJBcnJheSh0YXJnZXRzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3JlbW92ZScsIGNoYW5nZXMsIDAsIHJhbmdlVG8pO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgW1tDb2xsZWN0aW9uXV0uXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgc3JjOiBUW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IGNvbGxlY3Rpb24ubGVuZ3RoO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gYXBwZW5kQXJyYXkodGFyZ2V0cywgc3JjLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ2FkZCcsIGNoYW5nZXMsIHJhbmdlRnJvbSwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCByYW5nZUZyb20pO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBbW0NvbGxlY3Rpb25dXS5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDjga7mjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgaW5kZXg6IG51bWJlcixcbiAgICBzcmM6IFRbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBpbnNlcnRBcnJheSh0YXJnZXRzLCBpbmRleCwgc3JjLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ2FkZCcsIGNoYW5nZXMsIGluZGV4LCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIGluZGV4KTtcbn1cblxuLyoqXG4gKiBAZW4gUmVvcmRlciBbW0NvbGxlY3Rpb25dXSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDpoIXnm67jga7kvY3nva7jgpLlpInmm7RcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBpbmRleDogbnVtYmVyLFxuICAgIG9yZGVyczogbnVtYmVyW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IG1pbihbaW5kZXgsIC4uLm9yZGVyc10pO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gcmVvcmRlckFycmF5KHRhcmdldHMsIGluZGV4LCBvcmRlcnMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVvcmRlcicsIGNoYW5nZXMsIHJhbmdlRnJvbSwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCBpbmRleCk7XG59XG5cbi8qKlxuICogQGVuIFJlbW92ZSBbW0NvbGxlY3Rpb25dXSBlbGVtZW50cy5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDpoIXnm67jga7liYrpmaRcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgb3JkZXJzOiBudW1iZXJbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gbWluKG9yZGVycyk7XG4gICAgY29uc3QgcmFuZ2VUbyA9IGNvbGxlY3Rpb24ubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IHJlbW92ZUFycmF5KHRhcmdldHMsIG9yZGVycywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW1vdmUnLCBjaGFuZ2VzLCByYW5nZUZyb20sIHJhbmdlVG8pO1xufVxuIl0sIm5hbWVzIjpbImdldExhbmd1YWdlIiwiT2JzZXJ2YWJsZUFycmF5IiwiY2MiLCJtYWtlUmVzdWx0IiwiUkVTVUxUX0NPREUiLCJ1bmlxdWUiLCJjb21wdXRlRGF0ZSIsInRydW5jIiwiaXNGdW5jdGlvbiIsInNvcnQiLCJzaHVmZmxlIiwiaXNTdHJpbmciLCJFdmVudFNvdXJjZSIsImx1aWQiLCJpc01vZGVsIiwiYXQiLCJkZWZhdWx0U3luYyIsIm5vb3AiLCJpc05pbCIsImlzQXJyYXkiLCJtb2RlbCIsIkV2ZW50QnJva2VyIiwicmVzdWx0IiwiRkFJTEVEIiwiRXZlbnRQdWJsaXNoZXIiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7SUFNQTs7Ozs7UUFVSTtRQUFBO1lBQ0ksZ0dBQWlELENBQUE7WUFDakQsc0RBQW1DLFlBQUEsa0JBQWtCLGdCQUF1QixzQkFBNkIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLDhCQUFBLENBQUE7WUFDOUgsMkRBQW1DLFlBQUEsa0JBQWtCLGdCQUF1QixzQkFBNkIsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLG1DQUFB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QUM7UUFDakgsT0FBTyxlQUFlLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztJQWlCTyxlQUFlLGdCQUFnQixDQUNsQyxVQUErQixFQUMvQixNQUFnQixFQUNoQixPQUF5QjtRQUV6QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDdEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RyxPQUFPLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9jb2xsZWN0aW9uLyJ9
