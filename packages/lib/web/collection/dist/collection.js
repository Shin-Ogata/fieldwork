/*!
 * @cdp/collection 0.9.17
 *   generic collection scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/i18n'), require('@cdp/core-utils'), require('@cdp/promise'), require('@cdp/observable'), require('@cdp/result'), require('@cdp/events'), require('@cdp/data-sync'), require('@cdp/model')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/i18n', '@cdp/core-utils', '@cdp/promise', '@cdp/observable', '@cdp/result', '@cdp/events', '@cdp/data-sync', '@cdp/model'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, i18n, coreUtils, promise, observable, result, events, dataSync, model) { 'use strict';

    /* eslint-disable
        @typescript-eslint/no-namespace,
        @typescript-eslint/no-unused-vars,
     */
    (function () {
        /**
         * @en Extends error code definitions.
         * @ja 拡張エラーコード定義
         */
        let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
        (function () {
            RESULT_CODE[RESULT_CODE["MVC_COLLECTION_DECLARE"] = 9007199254740991] = "MVC_COLLECTION_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_ACCESS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 70 /* LOCAL_CODE_BASE.COLLECTION */ + 1, 'invalid access.')] = "ERROR_MVC_INVALID_ACCESS";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_COMPARATORS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 70 /* LOCAL_CODE_BASE.COLLECTION */ + 2, 'invalid comparators.')] = "ERROR_MVC_INVALID_COMPARATORS";
            RESULT_CODE[RESULT_CODE["ERROR_MVC_EDIT_PERMISSION_DENIED"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 70 /* LOCAL_CODE_BASE.COLLECTION */ + 3, 'editing permission denied.')] = "ERROR_MVC_EDIT_PERMISSION_DENIED";
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
     *  - `en` new {@link CollatorProvider} object. if `undefined` passed, only returns the current object.
     *  - `ja` 新しい {@link CollatorProvider} オブジェクトを指定. `undefined` が渡される場合は現在設定されているオブジェクトの返却のみ行う
     * @returns
     *  - `en` old {@link CollatorProvider} object.
     *  - `ja` 設定されていた {@link CollatorProvider} オブジェクト
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
     * @en Convert to comparator from {@link SortKey}.
     * @ja {@link SortKey} を comparator に変換
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
     * @en Convert to comparator array from {@link SortKey} array.
     * @ja {@link SortKey} 配列を comparator 配列に変換
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
        /** @internal 対象の配列  */
        _array;
        /** @internal 要素外の先頭を示しているときに true  */
        _bof;
        /** @internal 要素外の末尾を示しているときに true */
        _eof;
        /** @internal 現在の index */
        _index;
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
                this._index = -1 /* CursorPos.OUT_OF_RANGE */;
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
        reset(array = [], initialIndex = -1 /* CursorPos.OUT_OF_RANGE */) {
            this._array = array;
            this._index = initialIndex;
            if (this.valid()) {
                this._bof = this._eof = false;
            }
            else {
                this._index = -1 /* CursorPos.OUT_OF_RANGE */;
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
                this._index = -1 /* CursorPos.OUT_OF_RANGE */;
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
                this._index = -1 /* CursorPos.OUT_OF_RANGE */;
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
                this._index = -1 /* CursorPos.OUT_OF_RANGE */;
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
                this._index = -1 /* CursorPos.OUT_OF_RANGE */;
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

    const { 
    /** @internal */ trunc: trunc$1 } = Math;
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
    /** @internal convert to {@link ObservableArray} if needed. */
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
            if (index < 0 || length <= index || trunc$1(index) !== index) {
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
     *  - `en` {@link CancelToken} reference. (enable `undefined`)
     *  - `ja` {@link CancelToken} を指定 (undefined 可)
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
     *  - `en` {@link CancelToken} reference. (enable `undefined`)
     *  - `ja` {@link CancelToken} を指定 (undefined 可)
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
     *  - `en` {@link CancelToken} reference. (enable `undefined`)
     *  - `ja` {@link CancelToken} を指定 (undefined 可)
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function insertArray(target, index, src, token) {
        // 最後の要素に追加するため index == target.length を許容
        if (index < 0 || target.length < index || trunc$1(index) !== index) {
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
     *  - `en` {@link CancelToken} reference. (enable `undefined`)
     *  - `ja` {@link CancelToken} を指定 (undefined 可)
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function reorderArray(target, index, orders, token) {
        // 最後の要素に追加するため index == target.length を許容
        if (index < 0 || target.length < index || trunc$1(index) !== index) {
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
     *  - `en` {@link CancelToken} reference. (enable `undefined`)
     *  - `ja` {@link CancelToken} を指定 (undefined 可)
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
        return combination(0 /* DynamicCombination.AND */, greaterEqual(prop, min), lessEqual(prop, max));
    }
    /** @internal フィルタの合成 */
    function combination(type, lhs, rhs) {
        return !rhs ? lhs : (item) => {
            switch (type) {
                case 0 /* DynamicCombination.AND */:
                    return lhs(item) && rhs(item);
                case 1 /* DynamicCombination.OR */:
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
        _operators;
        _combination;
        _sumKeys;
        _limit;
        _random;
        _sortKeys;
        /**
         * constructor
         *
         * @param seeds
         *  - `en` {@link DynamicConditionSeed} instance
         *  - `ja` {@link DynamicConditionSeed} インスタンス
         */
        constructor(seeds = { operators: [] }) {
            const { operators, combination, sumKeys, limit, random, sortKeys } = seeds;
            this._operators = operators;
            this._combination = combination ?? 0 /* DynamicCombination.AND */;
            this._sumKeys = sumKeys ?? [];
            this._limit = limit;
            this._random = !!random;
            this._sortKeys = sortKeys ?? [];
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
                    case 0 /* DynamicOperator.EQUAL */:
                        fltr = combination(this._combination, equal(prop, value), fltr);
                        break;
                    case 1 /* DynamicOperator.NOT_EQUAL */:
                        fltr = combination(this._combination, notEqual(prop, value), fltr);
                        break;
                    case 2 /* DynamicOperator.GREATER */:
                        fltr = combination(this._combination, greater(prop, value), fltr);
                        break;
                    case 3 /* DynamicOperator.LESS */:
                        fltr = combination(this._combination, less(prop, value), fltr);
                        break;
                    case 4 /* DynamicOperator.GREATER_EQUAL */:
                        fltr = combination(this._combination, greaterEqual(prop, value), fltr);
                        break;
                    case 5 /* DynamicOperator.LESS_EQUAL */:
                        fltr = combination(this._combination, lessEqual(prop, value), fltr);
                        break;
                    case 6 /* DynamicOperator.LIKE */:
                        fltr = combination(this._combination, like(prop, value), fltr);
                        break;
                    case 7 /* DynamicOperator.NOT_LIKE */:
                        fltr = combination(this._combination, notLike(prop, value), fltr);
                        break;
                    case 8 /* DynamicOperator.DATE_LESS_EQUAL */:
                        fltr = combination(this._combination, dateLessEqual(prop, value, cond.unit), fltr);
                        break;
                    case 9 /* DynamicOperator.DATE_LESS_NOT_EQUAL */:
                        fltr = combination(this._combination, dateLessNotEqual(prop, value, cond.unit), fltr);
                        break;
                    case 10 /* DynamicOperator.RANGE */:
                        fltr = combination(this._combination, range(prop, value, cond.range), fltr);
                        break;
                    default:
                        console.warn(`unknown operator: ${operator}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
                        break;
                }
            }
            return fltr ?? (( /* item */) => true);
        }
    }

    const { 
    /** @internal */ trunc } = Math;
    //__________________________________________________________________________________________________//
    /**
     * @en Apply `filter` and `sort key` to the `items` from {@link queryItems}() result.
     * @ja {@link queryItems}() した `items` に対して `filter` と `sort key` を適用
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
        [0 /* DynamicLimit.COUNT */]: null,
        [1 /* DynamicLimit.SUM */]: { coeff: 1 },
        [2 /* DynamicLimit.SECOND */]: { coeff: 1000 },
        [3 /* DynamicLimit.MINUTE */]: { coeff: 60 * 1000 },
        [4 /* DynamicLimit.HOUR */]: { coeff: 60 * 60 * 1000 },
        [5 /* DynamicLimit.DAY */]: { coeff: 24 * 60 * 60 * 1000 },
        [6 /* DynamicLimit.KB */]: { coeff: 1024 },
        [7 /* DynamicLimit.MB */]: { coeff: 1024 * 1024 },
        [8 /* DynamicLimit.GB */]: { coeff: 1024 * 1024 * 1024 },
        [9 /* DynamicLimit.TB */]: { coeff: 1024 * 1024 * 1024 * 1024 },
    };
    /**
     * @en Fix the target items by {@link DynamicCondition}.
     * @ja {@link DynamicCondition} に従い対象を整形
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
    /** @internal すでにキャッシュされている対象に対して CollectionItemQueryOptions に指定された振る舞いを行う内部 query 関数 */
    async function queryFromCache(cached, options) {
        const { filter, comparators, index: baseIndex, limit, cancel: token, progress, auto, noSearch, } = options;
        // 対象なし
        if (!cached.length) {
            return {
                total: 0,
                items: [],
                options,
            };
        }
        // キャッシュに対してフィルタリング, ソートを実行
        const targets = noSearch ? cached.slice() : searchItems(cached, filter, ...comparators);
        const results = [];
        let index = baseIndex ?? 0;
        while (true) {
            await promise.checkCanceled(token);
            if (index < 0 || targets.length <= index || trunc(index) !== index) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
            }
            else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
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
        const canCache = !noCache && !noSearch && result.total && result.total === result.items.length;
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
        let index = baseIndex ?? 0;
        while (true) {
            await promise.checkCanceled(token);
            if (index < 0 || trunc(index) !== index) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
            }
            else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
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
     * @en Low level function for {@link Collection} query items.
     * @ja {@link Collection} Item をクエリする低レベル関数
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

    /* eslint-disable
        @typescript-eslint/no-explicit-any,
        @typescript-eslint/dot-notation,
     */
    /** @internal */ const _properties = Symbol('properties');
    /** @internal */ const _createIterableIterator = Symbol('create-iterable-iterator');
    /** @internal */ const _prepareModel = Symbol('prepare-model');
    /** @internal */ const _removeModels = Symbol('remove-models');
    /** @internal */ const _addReference = Symbol('add-reference');
    /** @internal */ const _removeReference = Symbol('remove-reference');
    /** @internal */ const _onModelEvent = Symbol('model-event-handler');
    /** @internal reset model context */
    const resetModelStore = (context) => {
        context.byId.clear();
        context.store.length = 0;
    };
    /** @internal */
    const ensureSortOptions = (options) => {
        const { sortKeys: keys, comparators: comps } = options;
        return {
            sortKeys: keys ?? [],
            comparators: comps ?? convertSortKeys(keys ?? []),
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
    /** @internal */ const _setOptions = { add: true, remove: true, merge: true };
    /** @internal */ const _addOptions = { add: true, remove: false };
    //__________________________________________________________________________________________________//
    /**
     * @en Base class definition for collection that is ordered sets of models.
     * @ja Model の集合を扱う Collection の基底クラス定義.
     *
     * @example <br>
     *
     * ```ts
     * import {
     *     Model,
     *     ModelConstructor,
     *     Collection,
     *     CollectionItemQueryOptions,
     *     CollectionItemQueryResult,
     *     CollectionSeed,
     * } from '@cdp/runtime';
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
     *     protected parse(response: CollectionSeed[]): TrackAttribute[] {
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
        /**
         * @en Model constructor. <br>
         *     The constructor is used internally by this {@link Collection} class for `TModel` construction.
         * @ja Model コンストラクタ <br>
         *     {@link Collection} クラスが `TModel` を構築するために使用する
         */
        static model;
        /** @internal */
        [_properties];
        ///////////////////////////////////////////////////////////////////////
        // construction/destruction:
        /**
         * constructor
         *
         * @param seeds
         *  - `en` given the seed of model array.
         *  - `ja` Model 要素の配列を指定
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
                provider: opts.provider ?? this.sync.bind(this),
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
                if (coreUtils.isString(event) && event.startsWith('@') && model) {
                    if (('@add' === event || '@remove' === event) && collection !== this) {
                        return;
                    }
                    if ('@destroy' === event) {
                        // model event arguments adjustment.
                        options = collection;
                        collection = this; // eslint-disable-line @typescript-eslint/no-this-alias
                        this.remove(model, options);
                    }
                    if (event.startsWith('@change')) {
                        // model event arguments adjustment.
                        options = {};
                        collection = this; // eslint-disable-line @typescript-eslint/no-this-alias
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
         * @ja Model アクセス
         */
        get models() {
            const { _queryFilter, _afterFilter } = this;
            const { store } = this[_properties];
            return (_afterFilter && _afterFilter !== _queryFilter) ? store.filter(_afterFilter) : store;
        }
        /**
         * @en number of models.
         * @ja 内包する Model 数
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
         * @en {@link CollectionQueryInfo} instance
         * @ja {@link CollectionQueryInfo} を格納するインスタンス
         */
        get _queryInfo() {
            return this[_properties].queryInfo;
        }
        /**
         * @en {@link CollectionQueryInfo} instance
         * @ja {@link CollectionQueryInfo} を格納するインスタンス
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
         * @ja `id`, `cid` およびインスタンスから Model を特定
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
            return byId.get(id) ?? (cid && byId.get(cid));
        }
        /**
         * @en Returns `true` if the model is in the collection by an `id`, a `cid`, or by passing in a model instance.
         * @ja `id`, `cid` およびインスタンスから Model を所有しているか判定
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
         * @ja Model 属性値のコピーを返却
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
         * @ja Collection 要素の再ソート
         *
         * @param options
         *  - `en` sort options.
         *  - `ja` ソートオプション
         */
        sort(options) {
            const opts = options ?? {};
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
         * @ja インデックス指定による Model へのアクセス. 負値の場合は末尾検索を実行
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
         * @en The {@link Collection.fetch} method proxy that is compatible with {@link CollectionItemProvider} returns one-shot result.
         * @ja {@link CollectionItemProvider} 互換の単発の {@link Collection.fetch} 結果を返却. 必要に応じてオーバーライド可能.
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
         * @en Fetch the {@link Model} from the server, merging the response with the model's local attributes.
         * @ja {@link Model} 属性のサーバー同期. レスポンスのマージを実行
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
            if (coreUtils.isNullish(seeds)) {
                return;
            }
            const opts = Object.assign({ parse: this._defaultParse }, _setOptions, options);
            if (opts.parse && !isCollectionModel(seeds, this)) {
                seeds = this.parse(seeds, options) ?? [];
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
                spliceArray(store, toAdd, at ?? store.length);
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
         * @ja Collection を新しい Model 一覧で置換. 完了時に `reset` イベントを発行
         *
         * @param seeds
         *  - `en` given the seed of model array.
         *  - `ja` Model 要素の配列を指定
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
         * @ja 末尾に Model を追加
         *
         * @param seed
         *  - `en` given the seed of model.
         *  - `ja` Model 要素を指定
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
         * @ja 末尾の Model を削除
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
         * @ja 先頭に Model を追加
         *
         * @param seed
         *  - `en` given the seed of model.
         *  - `ja` Model 要素を指定
         * @param options
         *  - `en` add options.
         *  - `ja` 追加オプション
         */
        unshift(seed, options) {
            return this.add(seed, Object.assign({ at: 0 }, options));
        }
        /**
         * @en Remove a model from the beginning of the collection.
         * @ja 先頭の Model を削除
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
         * @ja 新しい Model インスタンスを作成し, Collection に追加
         *
         * @param attrs
         *  - `en` attributes object.
         *  - `ja` 属性オブジェクトを指定
         * @param options
         *  - `en` model construction options.
         *  - `ja` Model 構築オプション
         */
        create(attrs, options) {
            const { wait } = options ?? {};
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
         * @en Iterator of {@link ElementBase} values in the array.
         * @ja 格納している {@link ElementBase} にアクセス可能なイテレータオブジェクトを返却
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
         * @en Returns an iterable of values({@link ElementBase}) in the array.
         * @ja values({@link ElementBase}) 配列にアクセス可能なイテレータオブジェクトを返却
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
     * @en Clear all elements of {@link Collection}.
     * @ja {@link Collection} 要素の全削除
     *
     * @param collection
     *  - `en` target {@link Collection}
     *  - `ja` 対象 {@link Collection}
     * @param options
     *  - `en` {@link CollectionEditOptions} reference.
     *  - `ja` {@link CollectionEditOptions} を指定
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
     * @en Append source elements to the end of {@link Collection}.
     * @ja {@link Collection} の末尾に追加
     *
     * @param collection
     *  - `en` target {@link Collection}
     *  - `ja` 対象 {@link Collection}
     * @param src
     *  - `en` source elements
     *  - `ja` 追加元要素
     * @param options
     *  - `en` {@link CollectionEditOptions} reference.
     *  - `ja` {@link CollectionEditOptions} を指定
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
     * @en Insert source elements to specified index of {@link Collection}.
     * @ja {@link Collection} の指定した位置に挿入
     *
     * @param collection
     *  - `en` target {@link Collection}
     *  - `ja` 対象 {@link Collection}
     * @param index
     *  - `ja` target array position index
     *  - `ja` 追加先のインデックス
     * @param src
     *  - `en` source elements
     *  - `ja` 追加元要素
     * @param options
     *  - `en` {@link CollectionEditOptions} reference.
     *  - `ja` {@link CollectionEditOptions} を指定
     * @returns
     *  - `en` Changed information
     *  - `ja` 変更情報
     */
    async function insertCollection(collection, index, src, options) {
        const changes = await exec(collection, options, (targets, token) => insertArray(targets, index, src, token));
        return makeListChanged('add', changes, index, collection.length - 1, index);
    }
    /**
     * @en Reorder {@link Collection} elements position.
     * @ja {@link Collection} 項目の位置を変更
     *
     * @param collection
     *  - `en` target {@link Collection}
     *  - `ja` 対象 {@link Collection}
     * @param index
     *  - `ja` target array position index
     *  - `ja` 追加先のインデックス
     * @param orders
     *  - `en` edit order index array
     *  - `ja` インデックス配列
     * @param options
     *  - `en` {@link CollectionEditOptions} reference.
     *  - `ja` {@link CollectionEditOptions} を指定
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
     * @en Remove {@link Collection} elements.
     * @ja {@link Collection} 項目の削除
     *
     * @param collection
     *  - `en` target {@link Collection}
     *  - `ja` 対象 {@link Collection}
     * @param orders
     *  - `en` removed order index array
     *  - `ja` インデックス配列
     * @param options
     *  - `en` {@link CollectionEditOptions} reference.
     *  - `ja` {@link CollectionEditOptions} を指定
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

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIiwiYmFzZS50cyIsImNvbGxlY3Rpb24tZWRpdG9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQ09MTEVDVElPTiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDEwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX0NPTExFQ1RJT05fREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMSwgJ2ludmFsaWQgYWNjZXNzLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUyAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAyLCAnaW52YWxpZCBjb21wYXJhdG9ycy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMywgJ2VkaXRpbmcgcGVybWlzc2lvbiBkZW5pZWQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBBY2Nlc3NpYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyB7QGxpbmsgQ29sbGF0b3JQcm92aWRlcn0g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0Q29sbGF0b3JQcm92aWRlcihuZXdQcm92aWRlcj86IENvbGxhdG9yUHJvdmlkZXIpOiBDb2xsYXRvclByb3ZpZGVyIHtcbiAgICBpZiAobnVsbCA9PSBuZXdQcm92aWRlcikge1xuICAgICAgICByZXR1cm4gX2NvbGxhdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFByb3ZpZGVyID0gX2NvbGxhdG9yO1xuICAgICAgICBfY29sbGF0b3IgPSBuZXdQcm92aWRlcjtcbiAgICAgICAgcmV0dXJuIG9sZFByb3ZpZGVyO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gR2V0IHN0cmluZyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaWh+Wtl+WIl+avlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgLy8gdW5kZWZpbmVkIOOBryAnJyDjgajlkIznrYnjgavmibHjgYZcbiAgICAgICAgY29uc3QgbGhzUHJvcCA9IChudWxsICE9IGxoc1twcm9wXSkgPyBsaHNbcHJvcF0gYXMgc3RyaW5nIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcF0pID8gcmhzW3Byb3BdIGFzIHN0cmluZyA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wXTtcbiAgICAgICAgY29uc3QgcmhzRGF0ZSA9IHJoc1twcm9wXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IEFjY2Vzc2libGU8VD4sIHJoczogQWNjZXNzaWJsZTxUPik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcF0gPT09IHJoc1twcm9wXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBsaHNbcHJvcF0pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3BdKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcF0gPCByaHNbcHJvcF0gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSB7QGxpbmsgU29ydEtleX0uXG4gKiBAamEge0BsaW5rIFNvcnRLZXl9IOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdHlwZSwgb3JkZXIgfSA9IHNvcnRLZXk7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIHtAbGluayBTb3J0S2V5fSBhcnJheS5cbiAqIEBqYSB7QGxpbmsgU29ydEtleX0g6YWN5YiX44KSIGNvbXBhcmF0b3Ig6YWN5YiX44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U29ydEtleXM8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oc29ydEtleXM6IFNvcnRLZXk8Sz5bXSk6IFNvcnRDYWxsYmFjazxUPltdIHtcbiAgICBjb25zdCBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFQ+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNvcnRLZXkgb2Ygc29ydEtleXMpIHtcbiAgICAgICAgY29tcGFyYXRvcnMucHVzaCh0b0NvbXBhcmF0b3Ioc29ydEtleSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyYXRvcnM7XG59XG4iLCIvKipcbiAqIEBlbiBDdXJzb3IgcG9zaXRpb24gY29uc3RhbnQuXG4gKiBAamEg44Kr44O844K944Or5L2N572u5a6a5pWwXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIEN1cnNvclBvcyB7XG4gICAgT1VUX09GX1JBTkdFICAgID0gLTEsXG4gICAgQ1VSUkVOVCAgICAgICAgID0gLTIsXG59XG5cbi8qKlxuICogQGVuIFNlZWsgZXhwcmVzc2lvbiBmdW5jdGlvbiB0eXBlLlxuICogQGphIOOCt+ODvOOCr+W8j+mWouaVsOWumue+qVxuICovXG5leHBvcnQgdHlwZSBTZWVrRXhwPFQ+ID0gKHZhbHVlOiBULCBpbmRleD86IG51bWJlciwgb2JqPzogVFtdKSA9PiBib29sZWFuO1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgcHJvdmlkZXMgY3Vyc29yIGludGVyZmFjZSBmb3IgQXJyYXkuIDxicj5cbiAqICAgICBJdCBpcyBkaWZmZXJlbnQgZnJvbSBJdGVyYXRvciBpbnRlcmZhY2Ugb2YgZXMyMDE1LCBhbmQgdGhhdCBwcm92aWRlcyBpbnRlcmZhY2Ugd2hpY2ggaXMgc2ltaWxhciB0byBEQiByZWNvcmRzZXQncyBvbmUuXG4gKiBAamEgQXJyYXkg55So44Kr44O844K944OrIEkvRiDjgpLmj5DkvpvjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIGVzMjAxNSDjga4gSXRlcmF0b3IgSS9GIOOBqOOBr+eVsOOBquOCiuOAgURCIHJlY29yZHNldCDjgqrjg5bjgrjjgqfjgq/jg4jjg6njgqTjgq/jgarotbDmn7sgSS9GIOOCkuaPkOS+m+OBmeOCi1xuICovXG5leHBvcnQgY2xhc3MgQXJyYXlDdXJzb3I8VCA9IGFueT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvKiogQGludGVybmFsIOWvvuixoeOBrumFjeWIlyAgKi9cbiAgICBwcml2YXRlIF9hcnJheTogVFtdO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5YWI6aCt44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgICovXG4gICAgcHJpdmF0ZSBfYm9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5pyr5bC+44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9lb2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDnj77lnKjjga4gaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiAwXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IDBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhcnJheTogVFtdLCBpbml0aWFsSW5kZXggPSAwKSB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB0YXJnZXQgYXJyYXkuXG4gICAgICogQGphIOWvvuixoeOBruWGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXkuIGRlZmF1bHQ6IGVtcHR5IGFycmF5LlxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aLiAgIGRlZmF1bHQ6IOepuumFjeWIl1xuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqL1xuICAgIHB1YmxpYyByZXNldChhcnJheTogVFtdID0gW10sIGluaXRpYWxJbmRleDogbnVtYmVyID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRSk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gY3VycmVudCBlbGVtZW50LlxuICAgICAqIEBqYSDnj77lnKjjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgY3VycmVudCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5W3RoaXMuX2luZGV4XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOaMh+OBl+ekuuOBl+OBpuOBhOOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGFyZ2V0IGFycmF5IGxlbmd0aC5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gu6KaB57Sg5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBCT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7lhYjpoK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNCT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ib2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEVPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruacq+WwvuOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0VPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHJhdyBhcnJheSBpbnN0YW5jZS5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGFycmF5KCk6IFRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjdXJzb3Igb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gZmlyc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVGaXJzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGxhc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVMYXN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbmV4dCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLmrKHjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZU5leHQoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fYm9mKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gcHJldmlvdXMgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5YmN44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVQcmV2aW91cygpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9lb2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLmxlbmd0aCAtIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleC0tO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWVrIGJ5IHBhc3NlZCBjcml0ZXJpYS4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgb3BlcmF0aW9uIGZhaWxlZCwgdGhlIGN1cnNvciBwb3NpdGlvbiBzZXQgdG8gRU9GLlxuICAgICAqIEBqYSDmjIflrprmnaHku7bjgafjgrfjg7zjgq8gPGJyPlxuICAgICAqICAgICDjgrfjg7zjgq/jgavlpLHmlZfjgZfjgZ/loLTlkIjjga8gRU9GIOeKtuaFi+OBq+OBquOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGNyaXRlcmlhXG4gICAgICogIC0gYGVuYCBpbmRleCBvciBzZWVrIGV4cHJlc3Npb25cbiAgICAgKiAgLSBgamFgIGluZGV4IC8g5p2h5Lu25byP44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNlZWsoY3JpdGVyaWE6IG51bWJlciB8IFNlZWtFeHA8VD4pOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICgnbnVtYmVyJyA9PT0gdHlwZW9mIGNyaXRlcmlhKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGNyaXRlcmlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5maW5kSW5kZXgoY3JpdGVyaWEpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICog44Kr44O844K944Or44GM5pyJ5Yq544Gq56+E5Zuy44KS56S644GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHRydWU6IOacieWKuSAvIGZhbHNlOiDnhKHlirlcbiAgICAgKi9cbiAgICBwcml2YXRlIHZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKDAgPD0gdGhpcy5faW5kZXggJiYgdGhpcy5faW5kZXggPCB0aGlzLl9hcnJheS5sZW5ndGgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuaXF1ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIENhbmNlbFRva2VuLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlQXJyYXksIEFycmF5Q2hhbmdlUmVjb3JkIH0gZnJvbSAnQGNkcC9vYnNlcnZhYmxlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuXG5jb25zdCB7XG4gICAgLyoqIEBpbnRlcm5hbCAqLyB0cnVuY1xufSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwgd2FpdCBmb3IgY2hhbmdlIGRldGVjdGlvbiAqL1xuZnVuY3Rpb24gbWFrZVByb21pc2U8VD4oZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD4sIHJlbWFwPzogVFtdKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBlZGl0b3Iub2ZmKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgICAgIHJlbWFwLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgcmVtYXAucHVzaCguLi5lZGl0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZWNvcmRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLm9uKGNhbGxiYWNrKTtcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIHtAbGluayBPYnNlcnZhYmxlQXJyYXl9IGlmIG5lZWRlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldEVkaXRDb250ZXh0PFQ+KFxuICAgIHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLFxuICAgIHRva2VuPzogQ2FuY2VsVG9rZW5cbik6IFByb21pc2U8eyBlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPjsgcHJvbWlzZTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPjsgfT4gfCBuZXZlciB7XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIE9ic2VydmFibGVBcnJheSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3I6IHRhcmdldCxcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgY29uc3QgZWRpdG9yID0gT2JzZXJ2YWJsZUFycmF5LmZyb20odGFyZ2V0KTtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yLFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UoZWRpdG9yLCB0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgJ3RhcmdldCBpcyBub3QgQXJyYXkgb3IgT2JzZXJ2YWJsZUFycmF5LicpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBvcmRlcnMgaW5kZXggKi9cbmZ1bmN0aW9uIHZhbGlkT3JkZXJzKGxlbmd0aDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdKTogYm9vbGVhbiB8IG5ldmVyIHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGluZGV4IG9mIG9yZGVycykge1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IGxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBvcmRlcnNbXSBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbn0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKDAsIHRhcmdldC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3IucHVzaCguLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEluc2VydCBzb3VyY2UgZWxlbWVudHMgdG8gc3BlY2lmaWVkIGluZGV4IG9mIGFycmF5LlxuICogQGphIOaMh+WumuOBl+OBn+S9jee9ruOBq+aMv+WFpVxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYGluc2VydEFycmF5KCksIGluZGV4IGlzIGludmFsaWQuIGluZGV4OiAke2luZGV4fWApO1xuICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKGluZGV4LCAwLCAuLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIgYXJyYXkgZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEg6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYHJlb3JkZXJBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKCF2YWxpZE9yZGVycyh0YXJnZXQubGVuZ3RoLCBvcmRlcnMpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDkvZzmpa3phY3liJfjgafnt6jpm4ZcbiAgICBsZXQgd29yazogKFQgfCBudWxsKVtdID0gQXJyYXkuZnJvbShlZGl0b3IpO1xuICAgIHtcbiAgICAgICAgY29uc3QgcmVvcmRlcnM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgICAgICByZW9yZGVycy5wdXNoKGVkaXRvcltvcmRlcl0pO1xuICAgICAgICAgICAgd29ya1tvcmRlcl0gPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgd29yay5zcGxpY2UoaW5kZXgsIDAsIC4uLnJlb3JkZXJzKTtcbiAgICAgICAgd29yayA9IHdvcmsuZmlsdGVyKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIOWApOOCkuabuOOBjeaIu+OBl1xuICAgIGZvciAoY29uc3QgaWR4IG9mIHdvcmsua2V5cygpKSB7XG4gICAgICAgIGVkaXRvcltpZHhdID0gd29ya1tpZHhdIGFzIFQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlbW92ZSBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDpoIXnm67jga7liYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgcmVtb3ZlZCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAoIXZhbGlkT3JkZXJzKHRhcmdldC5sZW5ndGgsIG9yZGVycykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOmZjemghuOCveODvOODiFxuICAgIG9yZGVycy5zb3J0KChsaHMsIHJocykgPT4ge1xuICAgICAgICByZXR1cm4gKGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgIGVkaXRvci5zcGxpY2Uob3JkZXIsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuIiwiaW1wb3J0IHsgS2V5cywgY29tcHV0ZURhdGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRmlsdGVyQ2FsbGJhY2ssIER5bmFtaWNDb21iaW5hdGlvbiB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZUFMTDxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgc3RyaW5nIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PG51bWJlciB8IERhdGUsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgdHlwZSBWYWx1ZVR5cGVTdHJpbmc8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PHN0cmluZywgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIER5bmFtaWNPcGVyYXRvckRhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgdW5kZWZpbmVkO1xuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA9PT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSAhPT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlcjxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IChpdGVtW3Byb3BdIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pID4gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MRVNTICovXG5leHBvcnQgZnVuY3Rpb24gbGVzczxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IChpdGVtW3Byb3BdIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPj0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gbGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPD0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MSUtFICovXG5leHBvcnQgZnVuY3Rpb24gbGlrZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlU3RyaW5nPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5OT1RfTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdExpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+ICFTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmNsdWRlcyh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuIGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzTm90RXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuICEoZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuUkFOR0UgKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCBtaW46IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4sIG1heDogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gY29tYmluYXRpb24oRHluYW1pY0NvbWJpbmF0aW9uLkFORCwgZ3JlYXRlckVxdWFsKHByb3AsIG1pbiksIGxlc3NFcXVhbChwcm9wLCBtYXgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCDjg5XjgqPjg6vjgr/jga7lkIjmiJAgKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5hdGlvbjxUIGV4dGVuZHMgb2JqZWN0Pih0eXBlOiBEeW5hbWljQ29tYmluYXRpb24sIGxoczogRmlsdGVyQ2FsbGJhY2s8VD4sIHJoczogRmlsdGVyQ2FsbGJhY2s8VD4gfCB1bmRlZmluZWQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuICFyaHMgPyBsaHMgOiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLkFORDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLk9SOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgfHwgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gY29tYmluYXRpb246ICR7dHlwZX1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBmYWlsIHNhZmVcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG4iLCJpbXBvcnQgeyBLZXlzIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7XG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIFNvcnRLZXksXG4gICAgRHluYW1pY0NvbmRpdGlvblNlZWQsXG4gICAgRHluYW1pY09wZXJhdG9yQ29udGV4dCxcbiAgICBEeW5hbWljTGltaXRDb25kaXRpb24sXG4gICAgRHluYW1pY09wZXJhdG9yLFxuICAgIER5bmFtaWNDb21iaW5hdGlvbixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFZhbHVlVHlwZUFMTCxcbiAgICBWYWx1ZVR5cGVDb21wYXJhYmxlLFxuICAgIFZhbHVlVHlwZVN0cmluZyxcbiAgICBlcXVhbCxcbiAgICBub3RFcXVhbCxcbiAgICBncmVhdGVyLFxuICAgIGxlc3MsXG4gICAgZ3JlYXRlckVxdWFsLFxuICAgIGxlc3NFcXVhbCxcbiAgICBsaWtlLFxuICAgIG5vdExpa2UsXG4gICAgZGF0ZUxlc3NFcXVhbCxcbiAgICBkYXRlTGVzc05vdEVxdWFsLFxuICAgIHJhbmdlLFxuICAgIGNvbWJpbmF0aW9uLFxufSBmcm9tICcuL2R5bmFtaWMtZmlsdGVycyc7XG5cbi8qKlxuICogQGVuIER5bmFtaWMgcXVlcnkgY29uZGl0aW9uIG1hbmFnZXIgY2xhc3MuXG4gKiBAamEg44OA44Kk44OK44Of44OD44Kv44Kv44Ko44Oq54q25oWL566h55CG44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBEeW5hbWljQ29uZGl0aW9uPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4gaW1wbGVtZW50cyBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4ge1xuXG4gICAgcHJpdmF0ZSBfb3BlcmF0b3JzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdO1xuICAgIHByaXZhdGUgX2NvbWJpbmF0aW9uOiBEeW5hbWljQ29tYmluYXRpb247XG4gICAgcHJpdmF0ZSBfc3VtS2V5czogS2V5czxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9saW1pdD86IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT47XG4gICAgcHJpdmF0ZSBfcmFuZG9tOiBib29sZWFuO1xuICAgIHByaXZhdGUgX3NvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCB7QGxpbmsgRHluYW1pY0NvbmRpdGlvblNlZWR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgRHluYW1pY0NvbmRpdGlvblNlZWR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4gPSB7IG9wZXJhdG9yczogW10gfSkge1xuICAgICAgICBjb25zdCB7IG9wZXJhdG9ycywgY29tYmluYXRpb24sIHN1bUtleXMsIGxpbWl0LCByYW5kb20sIHNvcnRLZXlzIH0gPSBzZWVkcztcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzICAgICA9IG9wZXJhdG9ycztcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gICA9IGNvbWJpbmF0aW9uID8/IER5bmFtaWNDb21iaW5hdGlvbi5BTkQ7XG4gICAgICAgIHRoaXMuX3N1bUtleXMgICAgICAgPSBzdW1LZXlzID8/IFtdO1xuICAgICAgICB0aGlzLl9saW1pdCAgICAgICAgID0gbGltaXQ7XG4gICAgICAgIHRoaXMuX3JhbmRvbSAgICAgICAgPSAhIXJhbmRvbTtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgICAgICA9IHNvcnRLZXlzID8/IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IER5bmFtaWNDb25kaXRpb25TZWVkXG5cbiAgICBnZXQgb3BlcmF0b3JzKCk6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0b3JzO1xuICAgIH1cblxuICAgIHNldCBvcGVyYXRvcnModmFsdWVzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgc3VtS2V5cygpOiAoS2V5czxUSXRlbT4pW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3VtS2V5cztcbiAgICB9XG5cbiAgICBzZXQgc3VtS2V5cyh2YWx1ZXM6IChLZXlzPFRJdGVtPilbXSkge1xuICAgICAgICB0aGlzLl9zdW1LZXlzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIGdldCBjb21iaW5hdGlvbigpOiBEeW5hbWljQ29tYmluYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29tYmluYXRpb247XG4gICAgfVxuXG4gICAgc2V0IGNvbWJpbmF0aW9uKHZhbHVlOiBEeW5hbWljQ29tYmluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgbGltaXQoKTogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9saW1pdDtcbiAgICB9XG5cbiAgICBzZXQgbGltaXQodmFsdWU6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fbGltaXQgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgcmFuZG9tKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmFuZG9tO1xuICAgIH1cblxuICAgIHNldCByYW5kb20odmFsdWU6IGJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5fcmFuZG9tID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHNvcnRLZXlzKCk6IFNvcnRLZXk8VEtleT5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3J0S2V5cztcbiAgICB9XG5cbiAgICBzZXQgc29ydEtleXModmFsdWVzOiBTb3J0S2V5PFRLZXk+W10pIHtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIGFjY2Vzc29yOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb21wYXJhdG9yIGZ1bmN0aW9ucy5cbiAgICAgKiBAamEg5q+U6LyD6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0U29ydEtleXModGhpcy5fc29ydEtleXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc3ludGhlc2lzIGZpbHRlciBmdW5jdGlvbi5cbiAgICAgKiBAamEg5ZCI5oiQ5riI44G/44OV44Kj44Or44K/6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4ge1xuICAgICAgICBsZXQgZmx0cjogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29uZCBvZiB0aGlzLl9vcGVyYXRvcnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgb3BlcmF0b3IsIHByb3AsIHZhbHVlIH0gPSBjb25kO1xuICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkVRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVBTEw8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXI8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1M6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzczxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuR1JFQVRFUl9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVyRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzc0VxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpa2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZVN0cmluZzxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTk9UX0xJS0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90TGlrZTxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc05vdEVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBudW1iZXIsIGNvbmQudW5pdCksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5SQU5HRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4sIGNvbmQucmFuZ2UgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdG9yOiAke29wZXJhdG9yfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmbHRyID8/ICgoLyogaXRlbSAqLykgPT4gdHJ1ZSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgc29ydCxcbiAgICBzaHVmZmxlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY2hlY2tDYW5jZWxlZCBhcyBjYyB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgU29ydEtleSxcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25JdGVtUHJvdmlkZXIsXG4gICAgRHluYW1pY0xpbWl0LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4uL3V0aWxzL2NvbXBhcmF0b3InO1xuaW1wb3J0IHsgRHluYW1pY0NvbmRpdGlvbiB9IGZyb20gJy4vZHluYW1pYy1jb25kaXRpb24nO1xuXG5jb25zdCB7XG4gICAgLyoqIEBpbnRlcm5hbCAqLyB0cnVuY1xufSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwg5L2/55So44GZ44KL44OX44Ot44OR44OG44Kj44GM5L+d6Ki844GV44KM44GfIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zICovXG5pbnRlcmZhY2UgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4gZXh0ZW5kcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIHNvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG4gICAgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEFwcGx5IGBmaWx0ZXJgIGFuZCBgc29ydCBrZXlgIHRvIHRoZSBgaXRlbXNgIGZyb20ge0BsaW5rIHF1ZXJ5SXRlbXN9KCkgcmVzdWx0LlxuICogQGphIHtAbGluayBxdWVyeUl0ZW1zfSgpIOOBl+OBnyBgaXRlbXNgIOOBq+WvvuOBl+OBpiBgZmlsdGVyYCDjgaggYHNvcnQga2V5YCDjgpLpgannlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEl0ZW1zPFRJdGVtPihpdGVtczogVEl0ZW1bXSwgZmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgbnVsbCwgLi4uY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSk6IFRJdGVtW10ge1xuICAgIGxldCByZXN1bHQgPSBpc0Z1bmN0aW9uKGZpbHRlcikgPyBpdGVtcy5maWx0ZXIoZmlsdGVyKSA6IGl0ZW1zLnNsaWNlKCk7XG4gICAgZm9yIChjb25zdCBjb21wYXJhdG9yIG9mIGNvbXBhcmF0b3JzKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBhcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzb3J0KHJlc3VsdCwgY29tcGFyYXRvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY29uZGl0aW5hbEZpeCDjgavkvb/nlKjjgZnjgosgQ3JpdGVyaWEgTWFwICovXG5jb25zdCBfbGltaXRDcml0ZXJpYSA9IHtcbiAgICBbRHluYW1pY0xpbWl0LkNPVU5UXTogbnVsbCxcbiAgICBbRHluYW1pY0xpbWl0LlNVTV06IHsgY29lZmY6IDEgfSxcbiAgICBbRHluYW1pY0xpbWl0LlNFQ09ORF06IHsgY29lZmY6IDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1JTlVURV06IHsgY29lZmY6IDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuSE9VUl06IHsgY29lZmY6IDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5EQVldOiB7IGNvZWZmOiAyNCAqIDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5LQl06IHsgY29lZmY6IDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1CXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LkdCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5UQl06IHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbn07XG5cbi8qKlxuICogQGVuIEZpeCB0aGUgdGFyZ2V0IGl0ZW1zIGJ5IHtAbGluayBEeW5hbWljQ29uZGl0aW9ufS5cbiAqIEBqYSB7QGxpbmsgRHluYW1pY0NvbmRpdGlvbn0g44Gr5b6T44GE5a++6LGh44KS5pW05b2iXG4gKlxuICogQHBhcmFtIGl0ZW1zXG4gKiAgLSBgZW5gIHRhcmdldCBpdGVtcyAoZGVzdHJ1Y3RpdmUpXG4gKiAgLSBgamFgIOWvvuixoeOBruOCouOCpOODhuODoCAo56C05aOK55qEKVxuICogQHBhcmFtIGNvbmRpdGlvblxuICogIC0gYGVuYCBjb25kaXRpb24gb2JqZWN0XG4gKiAgLSBgamFgIOadoeS7tuOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uZGl0aW9uYWxGaXg8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PihcbiAgICBpdGVtczogVEl0ZW1bXSxcbiAgICBjb25kaXRpb246IER5bmFtaWNDb25kaXRpb248VEl0ZW0sIFRLZXk+XG4pOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPiB7XG4gICAgY29uc3QgeyByYW5kb20sIGxpbWl0LCBzdW1LZXlzIH0gPSBjb25kaXRpb247XG5cbiAgICBpZiAocmFuZG9tKSB7XG4gICAgICAgIHNodWZmbGUoaXRlbXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChsaW1pdCkge1xuICAgICAgICBjb25zdCB7IHVuaXQsIHZhbHVlLCBwcm9wIH0gPSBsaW1pdDtcbiAgICAgICAgY29uc3QgcmVzZXQ6IFRJdGVtW10gPSBbXTtcbiAgICAgICAgY29uc3QgY3JpdGVyaWEgPSBfbGltaXRDcml0ZXJpYVt1bml0XTtcbiAgICAgICAgY29uc3QgbGltaXRDb3VudCA9IHZhbHVlO1xuICAgICAgICBjb25zdCBleGNlc3MgPSAhIWxpbWl0LmV4Y2VzcztcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoIWNyaXRlcmlhKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSB7XG4gICAgICAgICAgICAgICAgY291bnQgKz0gKE51bWJlcihpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSAvIGNyaXRlcmlhLmNvZWZmKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgYWNjZXNzIHByb3BlcnR5OiAke3Byb3B9YCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsaW1pdENvdW50IDwgY291bnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXhjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGl0ZW1zID0gcmVzZXQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICBpdGVtcyxcbiAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0sIEtleXM8VEl0ZW0+PjtcblxuICAgIGlmICgwIDwgc3VtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBzdW1LZXlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgKz0gTnVtYmVyKGl0ZW1ba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCDjgZnjgafjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgabjgYTjgovlr77osaHjgavlr77jgZfjgaYgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIHF1ZXJ5IOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tQ2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgY2FjaGVkOiBUSXRlbVtdLFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgZmlsdGVyLFxuICAgICAgICBjb21wYXJhdG9ycyxcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgICAgICBub1NlYXJjaCxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIC8vIOWvvuixoeOBquOBl1xuICAgIGlmICghY2FjaGVkLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IDAsXG4gICAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuICAgIH1cblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBq+WvvuOBl+OBpuODleOCo+ODq+OCv+ODquODs+OCsCwg44K944O844OI44KS5a6f6KGMXG4gICAgY29uc3QgdGFyZ2V0cyA9IG5vU2VhcmNoID8gY2FjaGVkLnNsaWNlKCkgOiBzZWFyY2hJdGVtcyhjYWNoZWQsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuICAgIGxldCBpbmRleDogbnVtYmVyID0gYmFzZUluZGV4ID8/IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHsgbGltaXQgfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgeyBpbmRleCB9KTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSB0YXJnZXRzLnNsaWNlKGluZGV4LCAobnVsbCAhPSBsaW1pdCkgPyBpbmRleCArIGxpbWl0IDogdW5kZWZpbmVkKTtcblxuICAgICAgICByZXN1bHRzLnB1c2goLi4uaXRlbXMpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi5vcHRzIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+LFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldHMubGVuZ3RoIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCDjg6zjgrnjg53jg7Pjgrnjga7jgq3jg6Pjg4Pjgrfjg6XjgpLoqabooYwgKi9cbmZ1bmN0aW9uIHRyeUNhY2hlPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcmVzdWx0OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPixcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT5cbik6IHZvaWQge1xuICAgIGNvbnN0IHsgbm9DYWNoZSwgbm9TZWFyY2ggfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgY2FuQ2FjaGUgPSAhbm9DYWNoZSAmJiAhbm9TZWFyY2ggJiYgcmVzdWx0LnRvdGFsICYmIHJlc3VsdC50b3RhbCA9PT0gcmVzdWx0Lml0ZW1zLmxlbmd0aDtcbiAgICBpZiAoY2FuQ2FjaGUpIHtcbiAgICAgICAgcXVlcnlJbmZvLmNhY2hlID0geyAuLi5yZXN1bHQgfTtcbiAgICAgICAgZGVsZXRlIHF1ZXJ5SW5mby5jYWNoZS5vcHRpb25zO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBgcHJvdmlkZXJgIOmWouaVsOOCkuS9v+eUqOOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggYHF1ZXJ5YCDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbVByb3ZpZGVyPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuXG4gICAgY29uc3QgcmVjZWl2ZWRBbGwgPSAocmVzcDogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4pOiBib29sZWFuID0+IHtcbiAgICAgICAgY29uc3QgaGFzQ29uZCA9ICEhcmVzcC5vcHRpb25zPy5jb25kaXRpb247XG4gICAgICAgIHJldHVybiBoYXNDb25kIHx8IHJlc3AudG90YWwgPT09IHJlc3AuaXRlbXMubGVuZ3RoO1xuICAgIH07XG5cbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IGJhc2VJbmRleCA/PyAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7bGltaXR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBsZXQgcmVzcCA9IGF3YWl0IHByb3ZpZGVyKG9wdHMpO1xuICAgICAgICBjb25zdCBuZXh0T3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdHMsIHJlc3Aub3B0aW9ucyk7XG5cbiAgICAgICAgaWYgKHJlY2VpdmVkQWxsKHJlc3ApKSB7XG4gICAgICAgICAgICB0cnlDYWNoZShxdWVyeUluZm8sIHJlc3AsIG5leHRPcHRzKTtcblxuICAgICAgICAgICAgY29uc3QgeyBub1NlYXJjaCwgY29uZGl0aW9uOiBzZWVkIH0gPSBuZXh0T3B0cztcbiAgICAgICAgICAgIGlmIChzZWVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGl0aW9uID0gbmV3IER5bmFtaWNDb25kaXRpb24oc2VlZCk7XG4gICAgICAgICAgICAgICAgcmVzcCA9IGNvbmRpdGlvbmFsRml4KHNlYXJjaEl0ZW1zKFxuICAgICAgICAgICAgICAgICAgICByZXNwLml0ZW1zLFxuICAgICAgICAgICAgICAgICAgICBjb25kaXRpb24uZmlsdGVyLFxuICAgICAgICAgICAgICAgICAgICAuLi5jb25kaXRpb24uY29tcGFyYXRvcnNcbiAgICAgICAgICAgICAgICApLCBjb25kaXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mby5jYWNoZSwgcmVzcCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBxdWVyeUZyb21DYWNoZShyZXNwLml0ZW1zLCBPYmplY3QuYXNzaWduKG9wdHMsIHsgbm9TZWFyY2ggfSkpO1xuICAgICAgICB9Ly8gZXNsaW50LWRpc2FibGUtbGluZSBicmFjZS1zdHlsZVxuXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnJlc3AuaXRlbXMpO1xuXG4gICAgICAgICAgICBjb25zdCByZXR2YWwgPSB7XG4gICAgICAgICAgICAgICAgdG90YWw6IHJlc3AudG90YWwsXG4gICAgICAgICAgICAgICAgaXRlbXM6IHJlc3AuaXRlbXMsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogbmV4dE9wdHMsXG4gICAgICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXV0byAmJiBudWxsICE9IGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3AudG90YWwgPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsLml0ZW1zID0gcmVzdWx0cztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSByZXNwLml0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnlDYWNoZShxdWVyeUluZm8sIHJldHZhbCwgbmV4dE9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnMg44Gr5aSJ5o+bICovXG5mdW5jdGlvbiBlbnN1cmVPcHRpb25zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB8IHVuZGVmaW5lZFxuKTogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHNvcnRLZXlzOiBbXSB9LCBvcHRpb25zKTtcbiAgICBjb25zdCB7IG5vU2VhcmNoLCBzb3J0S2V5cyB9ID0gb3B0cztcblxuICAgIGlmICghbm9TZWFyY2ggJiYgKCFvcHRzLmNvbXBhcmF0b3JzIHx8IG9wdHMuY29tcGFyYXRvcnMubGVuZ3RoIDw9IDApKSB7XG4gICAgICAgIG9wdHMuY29tcGFyYXRvcnMgPSBjb252ZXJ0U29ydEtleXMoc29ydEtleXMpO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRzIGFzIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5Pjtcbn1cblxuLyoqXG4gKiBAZW4gTG93IGxldmVsIGZ1bmN0aW9uIGZvciB7QGxpbmsgQ29sbGVjdGlvbn0gcXVlcnkgaXRlbXMuXG4gKiBAamEge0BsaW5rIENvbGxlY3Rpb259IEl0ZW0g44KS44Kv44Ko44Oq44GZ44KL5L2O44Os44OZ44Or6Zai5pWwXG4gKlxuICogQHBhcmFtIHF1ZXJ5SW5mb1xuICogIC0gYGVuYCBxdWVyeSBpbmZvcm1hdGlvblxuICogIC0gYGphYCDjgq/jgqjjg6rmg4XloLFcbiAqIEBwYXJhbSBwcm92aWRlclxuICogIC0gYGVuYCBwcm92aWRlciBmdW5jdGlvblxuICogIC0gYGphYCDjg5fjg63jg5DjgqTjg4DplqLmlbBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHF1ZXJ5IG9wdGlvbnNcbiAqICAtIGBqYWAg44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeUl0ZW1zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8VEl0ZW1bXT4ge1xuICAgIGNvbnN0IG9wdHMgPSBlbnN1cmVPcHRpb25zKG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IG9wdHM7XG5cbiAgICAvLyBxdWVyeSDjgavkvb/nlKjjgZfjgZ8gc29ydCwgZmlsdGVyIOaDheWgseOCkuOCreODo+ODg+OCt+ODpVxuICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0pO1xuXG4gICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbUNhY2hlKHF1ZXJ5SW5mby5jYWNoZS5pdGVtcywgb3B0cykpLml0ZW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgcXVlcnlGcm9tUHJvdmlkZXIocXVlcnlJbmZvLCBwcm92aWRlciwgb3B0cykpLml0ZW1zO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvZG90LW5vdGF0aW9uLFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBBY2Nlc3NpYmxlLFxuICAgIENvbnN0cnVjdG9yLFxuICAgIENsYXNzLFxuICAgIEtleXMsXG4gICAgaXNOdWxsaXNoLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIGx1aWQsXG4gICAgYXQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFNpbGVuY2VhYmxlLFxuICAgIFN1YnNjcmliYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFNvdXJjZSxcbiAgICBFdmVudFB1Ymxpc2hlcixcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWwsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgaXNNb2RlbCxcbn0gZnJvbSAnQGNkcC9tb2RlbCc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uU29ydE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvblNlZWQsXG4gICAgQ29sbGVjdGlvbkV2ZW50LFxuICAgIENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZGRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25TZXRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZVNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHNlYXJjaEl0ZW1zLCBxdWVyeUl0ZW1zIH0gZnJvbSAnLi9xdWVyeSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgICAgICAgICAgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZS1pdGVyYWJsZS1pdGVyYXRvcicpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJlcGFyZU1vZGVsICAgICAgICAgICA9IFN5bWJvbCgncHJlcGFyZS1tb2RlbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVtb3ZlTW9kZWxzICAgICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLW1vZGVscycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkUmVmZXJlbmNlICAgICAgICAgICA9IFN5bWJvbCgnYWRkLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVtb3ZlUmVmZXJlbmNlICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb25Nb2RlbEV2ZW50ICAgICAgICAgICA9IFN5bWJvbCgnbW9kZWwtZXZlbnQtaGFuZGxlcicpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+IHtcbiAgICByZWFkb25seSBjb25zdHJ1Y3RPcHRpb25zOiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxULCBLPjtcbiAgICByZWFkb25seSBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxULCBLPjtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBxdWVyeU9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFQsIEs+O1xuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxULCBLPjtcbiAgICByZWFkb25seSBtb2RlbE9wdGlvbnM6IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucztcbiAgICByZWFkb25seSBieUlkOiBNYXA8c3RyaW5nLCBUPjtcbiAgICBzdG9yZTogVFtdO1xuICAgIGFmdGVyRmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVzZXQgbW9kZWwgY29udGV4dCAqL1xuY29uc3QgcmVzZXRNb2RlbFN0b3JlID0gPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+Pihjb250ZXh0OiBQcm9wZXJ0eTxULCBLPik6IHZvaWQgPT4ge1xuICAgIGNvbnRleHQuYnlJZC5jbGVhcigpO1xuICAgIGNvbnRleHQuc3RvcmUubGVuZ3RoID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVuc3VyZVNvcnRPcHRpb25zID0gPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PihvcHRpb25zOiBDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4pOiBSZXF1aXJlZDxDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4+ID0+IHtcbiAgICBjb25zdCB7IHNvcnRLZXlzOiBrZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IG9wdGlvbnM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc29ydEtleXM6IGtleXMgPz8gW10sXG4gICAgICAgIGNvbXBhcmF0b3JzOiBjb21wcyA/PyBjb252ZXJ0U29ydEtleXMoa2V5cyA/PyBbXSksXG4gICAgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsSWRBdHRyaWJ1dGUgPSA8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiAoY3RvciBhcyBhbnkpPy5bJ2lkQXR0cmlidXRlJ10gfHwgJ2lkJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldE1vZGVsSWQgPSA8VCBleHRlbmRzIG9iamVjdD4oYXR0cnM6IEFjY2Vzc2libGU8VCwgc3RyaW5nPiwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBhdHRyc1ttb2RlbElkQXR0cmlidXRlKGN0b3IpXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldENoYW5nZWRJZHMgPSA8VCBleHRlbmRzIG9iamVjdD4ob2JqOiBvYmplY3QsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogeyBpZDogc3RyaW5nOyBwcmV2SWQ/OiBzdHJpbmc7IH0gfCB1bmRlZmluZWQgPT4ge1xuICAgIHR5cGUgTW9kZWxMaWtlID0gQWNjZXNzaWJsZTx7IHByZXZpb3VzOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZzsgfT47XG4gICAgY29uc3QgbW9kZWwgPSBvYmogYXMgTW9kZWxMaWtlO1xuXG4gICAgY29uc3QgaWRBdHRyaWJ1dGUgPSBtb2RlbElkQXR0cmlidXRlKGN0b3IpO1xuICAgIGNvbnN0IGlkID0gbW9kZWxbaWRBdHRyaWJ1dGVdO1xuICAgIGlmICghaXNTdHJpbmcoaWQpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaWQ6IG1vZGVsW2lkQXR0cmlidXRlXSBhcyBzdHJpbmcsIHByZXZJZDogaXNGdW5jdGlvbihtb2RlbC5wcmV2aW91cykgPyBtb2RlbC5wcmV2aW91cyhpZEF0dHJpYnV0ZSkgOiB1bmRlZmluZWQgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsQ29uc3RydWN0b3IgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiBDbGFzcyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgcmV0dXJuIChzZWxmLmNvbnN0cnVjdG9yIGFzIGFueSlbJ21vZGVsJ107XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBpc0NvbGxlY3Rpb25Nb2RlbCA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oeDogdW5rbm93biwgc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IHggaXMgVCA9PiB7XG4gICAgY29uc3QgY3RvciA9IG1vZGVsQ29uc3RydWN0b3Ioc2VsZik7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24oY3RvcikgPyB4IGluc3RhbmNlb2YgY3RvciA6IGZhbHNlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3BsaWNlQXJyYXkgPSA8VD4odGFyZ2V0OiBUW10sIGluc2VydDogVFtdLCBhdDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgYXQgPSBNYXRoLm1pbihNYXRoLm1heChhdCwgMCksIHRhcmdldC5sZW5ndGgpO1xuICAgIHRhcmdldC5zcGxpY2UoYXQsIDAsIC4uLmluc2VydCk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwYXJzZUZpbHRlckFyZ3M8VCBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogdW5rbm93bltdKTogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPiB7XG4gICAgY29uc3QgW2ZpbHRlciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChudWxsID09IGZpbHRlcikge1xuICAgICAgICByZXR1cm4ge307XG4gICAgfSBlbHNlIGlmICghaXNGdW5jdGlvbihmaWx0ZXIpKSB7XG4gICAgICAgIHJldHVybiBmaWx0ZXIgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywgeyBmaWx0ZXIgfSkgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3NldE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiB0cnVlLCBtZXJnZTogdHJ1ZSB9O1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkT3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlIH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIGNvbGxlY3Rpb24gdGhhdCBpcyBvcmRlcmVkIHNldHMgb2YgbW9kZWxzLlxuICogQGphIE1vZGVsIOOBrumbhuWQiOOCkuaJseOBhiBDb2xsZWN0aW9uIOOBruWfuuW6leOCr+ODqeOCueWumue+qS5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgICAgTW9kZWwsXG4gKiAgICAgTW9kZWxDb25zdHJ1Y3RvcixcbiAqICAgICBDb2xsZWN0aW9uLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gKiAgICAgQ29sbGVjdGlvblNlZWQsXG4gKiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gTW9kZWwgc2NoZW1hXG4gKiBpbnRlcmZhY2UgVHJhY2tBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgdGl0bGU6IHN0cmluZztcbiAqICAgYXJ0aXN0OiBzdHJpbmc7XG4gKiAgIGFsYnVtOiAgc3RyaW5nO1xuICogICByZWxlYXNlRGF0ZTogRGF0ZTtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIE1vZGVsIGRlZmluaXRpb25cbiAqIGNvbnN0IFRyYWNrQmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8VHJhY2tBdHRyaWJ1dGU+LCBUcmFja0F0dHJpYnV0ZT47XG4gKiBjbGFzcyBUcmFjayBleHRlbmRzIFRyYWNrQmFzZSB7XG4gKiAgICAgc3RhdGljIGlkQXR0cmlidXRlID0gJ3VyaSc7XG4gKiB9XG4gKlxuICogLy8gQ29sbGVjdGlvbiBkZWZpbml0aW9uXG4gKiBjbGFzcyBQbGF5bGlzdCBleHRlbmRzIENvbGxlY3Rpb248VHJhY2s+IHtcbiAqICAgICAvLyBzZXQgdGFyZ2V0IE1vZGVsIGNvbnN0cnVjdG9yXG4gKiAgICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsID0gVHJhY2s7XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIHVzZSBjdXN0b20gY29udGVudCBwcm92aWRlciBmb3IgZmV0Y2guXG4gKiAgICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMoXG4gKiAgICAgICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUcmFjaz5cbiAqICAgICApOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICogICAgICAgICAvLyBzb21lIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGhlcmUuXG4gKiAgICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgY3VzdG9tUHJvdmlkZXIob3B0aW9ucyk7XG4gKiAgICAgICAgIHJldHVybiB7XG4gKiAgICAgICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICogICAgICAgICAgICAgaXRlbXMsXG4gKiAgICAgICAgICAgICBvcHRpb25zLFxuICogICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0PjtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIGNvbnZlcnQgYSByZXNwb25zZSBpbnRvIGEgbGlzdCBvZiBtb2RlbHMuXG4gKiAgICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBDb2xsZWN0aW9uU2VlZFtdKTogVHJhY2tBdHRyaWJ1dGVbXSB7XG4gKiAgICAgICAgIHJldHVybiByZXNwb25zZS5tYXAoc2VlZCA9PiB7XG4gKiAgICAgICAgICAgICBjb25zdCBkYXRlID0gc2VlZC5yZWxlYXNlRGF0ZTtcbiAqICAgICAgICAgICAgIHNlZWQucmVsZWFzZURhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAqICAgICAgICAgICAgIHJldHVybiBzZWVkO1xuICogICAgICAgICB9KSBhcyBUcmFja0F0dHJpYnV0ZVtdO1xuICogICAgICB9XG4gKiB9XG4gKlxuICogbGV0IHNlZWRzOiBUcmFja0F0dHJpYnV0ZVtdO1xuICpcbiAqIGNvbnN0IHBsYXlsaXN0ID0gbmV3IFBsYXlsaXN0KHNlZWRzLCB7XG4gKiAgICAgLy8gZGVmYXVsdCBxdWVyeSBvcHRpb25zXG4gKiAgICAgcXVlcnlPcHRpb25zOiB7XG4gKiAgICAgICAgIHNvcnRLZXlzOiBbXG4gKiAgICAgICAgICAgICB7IG5hbWU6ICd0aXRsZScsIG9yZGVyOiBTb3J0T3JkZXIuREVTQywgdHlwZTogJ3N0cmluZycgfSxcbiAqICAgICAgICAgXSxcbiAqICAgICB9XG4gKiB9KTtcbiAqXG4gKiBhd2FpdCBwbGF5bGlzdC5yZXF1ZXJ5KCk7XG4gKlxuICogZm9yIChjb25zdCB0cmFjayBvZiBwbGF5bGlzdCkge1xuICogICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRyYWNrLnRvSlNPTigpKSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbGxlY3Rpb248XG4gICAgVE1vZGVsIGV4dGVuZHMgb2JqZWN0ID0gYW55LFxuICAgIFRFdmVudCBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUTW9kZWw+ID0gQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4sXG4gICAgVEtleSBleHRlbmRzIEtleXM8VE1vZGVsPiA9IEtleXM8VE1vZGVsPlxuPiBleHRlbmRzIEV2ZW50U291cmNlPFRFdmVudD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUTW9kZWw+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb2RlbCBjb25zdHJ1Y3Rvci4gPGJyPlxuICAgICAqICAgICBUaGUgY29uc3RydWN0b3IgaXMgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoaXMge0BsaW5rIENvbGxlY3Rpb259IGNsYXNzIGZvciBgVE1vZGVsYCBjb25zdHJ1Y3Rpb24uXG4gICAgICogQGphIE1vZGVsIOOCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gICAgICogICAgIHtAbGluayBDb2xsZWN0aW9ufSDjgq/jg6njgrnjgYwgYFRNb2RlbGAg44KS5qeL56+J44GZ44KL44Gf44KB44Gr5L2/55So44GZ44KLXG4gICAgICovXG4gICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsPzogQ2xhc3M7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY29uc3RydWN0aW9uL2Rlc3RydWN0aW9uOlxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkcz86IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBtb2RlbE9wdGlvbnM6IHt9LCBxdWVyeU9wdGlvbnM6IHt9IH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHsgbW9kZWxPcHRpb25zLCBxdWVyeU9wdGlvbnMgfSA9IG9wdHM7XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RPcHRpb25zOiBvcHRzLFxuICAgICAgICAgICAgcHJvdmlkZXI6IG9wdHMucHJvdmlkZXIgPz8gdGhpcy5zeW5jLmJpbmQodGhpcyksXG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ2NvbGxlY3Rpb246JywgOCksXG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMsXG4gICAgICAgICAgICBxdWVyeUluZm86IHt9LFxuICAgICAgICAgICAgbW9kZWxPcHRpb25zLFxuICAgICAgICAgICAgYnlJZDogbmV3IE1hcDxzdHJpbmcsIFRNb2RlbD4oKSxcbiAgICAgICAgICAgIHN0b3JlOiBbXSxcbiAgICAgICAgfSBhcyB1bmtub3duIGFzIFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbiAgICAgICAgdGhpcy5pbml0UXVlcnlJbmZvKCk7XG5cbiAgICAgICAgLyogbW9kZWwgZXZlbnQgaGFuZGxlciAqL1xuICAgICAgICAodGhpcyBhcyBhbnkpW19vbk1vZGVsRXZlbnRdID0gKGV2ZW50OiBzdHJpbmcsIG1vZGVsOiBUTW9kZWwgfCB1bmRlZmluZWQsIGNvbGxlY3Rpb246IHRoaXMsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoZXZlbnQpICYmIGV2ZW50LnN0YXJ0c1dpdGgoJ0AnKSAmJiBtb2RlbCkge1xuICAgICAgICAgICAgICAgIGlmICgoJ0BhZGQnID09PSBldmVudCB8fCAnQHJlbW92ZScgPT09IGV2ZW50KSAmJiBjb2xsZWN0aW9uICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdAZGVzdHJveScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0gKGNvbGxlY3Rpb24gYXMgYW55KTtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IHRoaXM7ICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnQGNoYW5nZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzOyAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICAgICAgICAgIGlmICgnQGNoYW5nZScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHMgPSBnZXRDaGFuZ2VkSWRzKG1vZGVsLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCBwcmV2SWQgfSA9IGlkcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldklkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBwcmV2SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuZGVsZXRlKHByZXZJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gZGVsZWdhdGUgZXZlbnRcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIuY2FsbCh0aGlzLCBldmVudCwgbW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVzZWxlc3MtY2FsbFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZWVkcykge1xuICAgICAgICAgICAgdGhpcy5yZXNldChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAamEgSW5pdGlhbGl6ZSBxdWVyeSBpbmZvXG4gICAgICogQGphIOOCr+OCqOODquaDheWgseOBruWIneacn+WMllxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpbml0UXVlcnlJbmZvKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9ID0gZW5zdXJlU29ydE9wdGlvbnModGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3F1ZXJ5SW5mbyA9IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgYW5kIGV2ZW50IGxpc3RlbmVyIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgpLnoLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIChyZXNlcnZlZCkuXG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7MgKOS6iOe0hClcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZShvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB0aGlzIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gW107XG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIENsZWFyIGNhY2hlIGluc3RhbmNlIG1ldGhvZFxuICAgICAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjga7noLTmo4RcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgY2xlYXJDYWNoZSgpOiB2b2lkIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3F1ZXJ5SW5mby5jYWNoZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4ggSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBtb2RlbHMuXG4gICAgICogQGphIE1vZGVsIOOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBtb2RlbHMoKTogcmVhZG9ubHkgVE1vZGVsW10ge1xuICAgICAgICBjb25zdCB7IF9xdWVyeUZpbHRlciwgX2FmdGVyRmlsdGVyIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChfYWZ0ZXJGaWx0ZXIgJiYgX2FmdGVyRmlsdGVyICE9PSBfcXVlcnlGaWx0ZXIpID8gc3RvcmUuZmlsdGVyKF9hZnRlckZpbHRlcikgOiBzdG9yZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIG1vZGVscy5cbiAgICAgKiBAamEg5YaF5YyF44GZ44KLIE1vZGVsIOaVsFxuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWxzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYXBwbGllZCBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBjOmBqeeUqOOBleOCjOOBpuOBhOOCi+OBi+OCkuWIpOWumlxuICAgICAqL1xuICAgIGdldCBmaWx0ZXJlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBDb2xsZWN0aW9uUXVlcnlJbmZvfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvblF1ZXJ5SW5mb30g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlJbmZvKCk6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBDb2xsZWN0aW9uUXVlcnlJbmZvfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvblF1ZXJ5SW5mb30g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIHNldCBfcXVlcnlJbmZvKHZhbDogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbyA9IHZhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNyZWF0aW5nIG9wdGlvbnMuXG4gICAgICogQGphIOani+evieaZguOBruOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX29wdGlvbnMoKTogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb25zdHJ1Y3RPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwcm92aWRlci5cbiAgICAgKiBAamEg5pei5a6a44Gu44OX44Ot44OQ44Kk44OA44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJvdmlkZXIoKTogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByb3ZpZGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwYXJzZSBiZWhhdmlvdXIuXG4gICAgICogQGphIOaXouWumuOBriBwYXJzZSDli5XkvZzjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UGFyc2UoKTogYm9vbGVhbiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zLnBhcnNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDml6Llrprjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDmnIDlvozjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9sYXN0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgICAgIGNvbnN0IG9wdHM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4gPSB7fTtcblxuICAgICAgICBzb3J0S2V5cy5sZW5ndGggJiYgKG9wdHMuc29ydEtleXMgPSBzb3J0S2V5cyk7XG4gICAgICAgIGNvbXBhcmF0b3JzLmxlbmd0aCAmJiAob3B0cy5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzKTtcbiAgICAgICAgZmlsdGVyICYmIChvcHRzLmZpbHRlciA9IGZpbHRlcik7XG5cbiAgICAgICAgcmV0dXJuIG9wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBzb3J0IGNvbXBhcmF0b3JzLlxuICAgICAqIEBqYSDjgr3jg7zjg4jnlKjmr5TovIPplqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VE1vZGVsPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHF1ZXJ5LWZpbHRlci5cbiAgICAgKiBAamEg44Kv44Ko44Oq55So44OV44Kj44Or44K/6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlGaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uZmlsdGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gYWZ0ZXItZmlsdGVyLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hZnRlckZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHV0aWxzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGEgbW9kZWwgZnJvbSBhIGNvbGxlY3Rpb24sIHNwZWNpZmllZCBieSBhbiBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2UuXG4gICAgICogQGphIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCueOBi+OCiSBNb2RlbCDjgpLnibnlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgICBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KHNlZWQ6IHN0cmluZyB8IG9iamVjdCB8IHVuZGVmaW5lZCk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChudWxsID09IHNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoaXNTdHJpbmcoc2VlZCkgJiYgYnlJZC5oYXMoc2VlZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBieUlkLmdldChzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gZ2V0TW9kZWxJZChpc01vZGVsKHNlZWQpID8gc2VlZC50b0pTT04oKSA6IHNlZWQgYXMgb2JqZWN0LCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgY29uc3QgY2lkID0gKHNlZWQgYXMgb2JqZWN0IGFzIHsgX2NpZD86IHN0cmluZzsgfSkuX2NpZDtcblxuICAgICAgICByZXR1cm4gYnlJZC5nZXQoaWQpID8/IChjaWQgJiYgYnlJZC5nZXQoY2lkKSkgYXMgVE1vZGVsIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgbW9kZWwgaXMgaW4gdGhlIGNvbGxlY3Rpb24gYnkgYW4gYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlLlxuICAgICAqIEBqYSBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrnjgYvjgokgTW9kZWwg44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGhhcyhzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5nZXQoc2VlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIGNvcHkgb2YgdGhlIG1vZGVsJ3MgYGF0dHJpYnV0ZXNgIG9iamVjdC5cbiAgICAgKiBAamEgTW9kZWwg5bGe5oCn5YCk44Gu44Kz44OU44O844KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHRvSlNPTigpOiBvYmplY3RbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVscy5tYXAobSA9PiBpc01vZGVsKG0pID8gbS50b0pTT04oKSA6IG0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlcyBDbG9uZSB0aGlzIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7opIfoo73jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb25zdHJ1Y3RvciwgX29wdGlvbnMgfSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgKGNvbnN0cnVjdG9yIGFzIENvbnN0cnVjdG9yPHRoaXM+KSh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgX29wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBhIGNvbGxlY3Rpb24gdG8gcmUtc29ydCBpdHNlbGYuXG4gICAgICogQGphIENvbGxlY3Rpb24g6KaB57Sg44Gu5YaN44K944O844OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc29ydCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44K944O844OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNvcnQob3B0aW9ucz86IENvbGxlY3Rpb25SZVNvcnRPcHRpb25zPFRNb2RlbCwgVEtleT4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IHsgbm9UaHJvdywgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKG9wdHMpO1xuICAgICAgICBjb25zdCBjb21wYXJhdG9ycyA9IDAgPCBjb21wcy5sZW5ndGggPyBjb21wcyA6IHRoaXMuX2NvbXBhcmF0b3JzO1xuXG4gICAgICAgIGlmIChjb21wYXJhdG9ycy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaWYgKG5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMsICdDYW5ub3Qgc29ydCBhIHNldCB3aXRob3V0IGEgY29tcGFyYXRvci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gc2VhcmNoSXRlbXModGhpc1tfcHJvcGVydGllc10uc3RvcmUsIHRoaXMuX2FmdGVyRmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHF1ZXJ5SW5mb1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycztcbiAgICAgICAgaWYgKDAgPCBzb3J0S2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5zb3J0S2V5cyA9IHNvcnRLZXlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0Bzb3J0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBseSBhZnRlci1maWx0ZXIgdG8gY29sbGVjdGlvbiBpdHNlbGYuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBmaWx0ZXIgY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXIoY2FsbGJhY2s6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbHkgYWZ0ZXItZmlsdGVyIHRvIGNvbGxlY3Rpb24gaXRzZWxmLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZnRlci1maWx0ZXIgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOe1nuOCiui+vOOBv+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXIob3B0aW9uczogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUTW9kZWw+KTogdGhpcztcblxuICAgIHB1YmxpYyBmaWx0ZXIoLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBwYXJzZUZpbHRlckFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IHsgZmlsdGVyLCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGlmIChmaWx0ZXIgIT09IHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlciA9IGZpbHRlcjtcbiAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGZpbHRlcicsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbW9kZWwgYXQgdGhlIGdpdmVuIGluZGV4LiBJZiBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiwgdGhlIHRhcmdldCB3aWxsIGJlIGZvdW5kIGZyb20gdGhlIGxhc3QgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBq+OCiOOCiyBNb2RlbCDjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXQoaW5kZXg6IG51bWJlcik6IFRNb2RlbCB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLm1vZGVscyBhcyBUTW9kZWxbXSwgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSBNb2RlbCDjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoKTogVE1vZGVsIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdmFsdWUgb2YgYGNvdW50YCBlbGVtZW50cyBvZiB0aGUgbW9kZWwgZnJvbSB0aGUgZmlyc3QuXG4gICAgICogQGphIE1vZGVsIOOBruWFiOmgreOBi+OCiWBjb3VudGAg5YiG44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBmaXJzdChjb3VudD86IG51bWJlcik6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMubW9kZWxzO1xuICAgICAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0cy5zbGljZSgwLCBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSBNb2RlbCDjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBUTW9kZWwgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiBgY291bnRgIGVsZW1lbnRzIG9mIHRoZSBtb2RlbCBmcm9tIHRoZSBsYXN0LlxuICAgICAqIEBqYSBNb2RlbCDjga7lhYjpoK3jgYvjgolgY291bnRgIOWIhuOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBsYXN0KGNvdW50PzogbnVtYmVyKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5tb2RlbHM7XG4gICAgICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0c1t0YXJnZXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHMuc2xpY2UoLTEgKiBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIGNvbGxlY3Rpb24uIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IENvbGxlY3Rpb25TZWVkIHwgQ29sbGVjdGlvblNlZWRbXSB8IHZvaWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSB8IHVuZGVmaW5lZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUTW9kZWxbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIHtAbGluayBDb2xsZWN0aW9uLmZldGNofSBtZXRob2QgcHJveHkgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGgge0BsaW5rIENvbGxlY3Rpb25JdGVtUHJvdmlkZXJ9IHJldHVybnMgb25lLXNob3QgcmVzdWx0LlxuICAgICAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcn0g5LqS5o+b44Gu5Y2Y55m644GuIHtAbGluayBDb2xsZWN0aW9uLmZldGNofSDntZDmnpzjgpLov5TljbQuIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBhc3luYyBzeW5jKG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBkZWZhdWx0U3luYygpLnN5bmMoJ3JlYWQnLCB0aGlzIGFzIFN5bmNDb250ZXh0LCBvcHRpb25zKSBhcyBUTW9kZWxbXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGZXRjaCB0aGUge0BsaW5rIE1vZGVsfSBmcm9tIHRoZSBzZXJ2ZXIsIG1lcmdpbmcgdGhlIHJlc3BvbnNlIHdpdGggdGhlIG1vZGVsJ3MgbG9jYWwgYXR0cmlidXRlcy5cbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGZldGNoIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg5Xjgqfjg4Pjg4Hjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8b2JqZWN0W10+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwcm9ncmVzczogbm9vcCB9LCB0aGlzLl9kZWZhdWx0UXVlcnlPcHRpb25zLCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBwcm9ncmVzczogb3JpZ2luYWwsIGxpbWl0LCByZXNldCwgbm9DYWNoZSB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IHsgX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyIH0gPSB0aGlzO1xuICAgICAgICAgICAgY29uc3QgZmluYWxpemUgPSAobnVsbCA9PSBsaW1pdCk7XG5cbiAgICAgICAgICAgIG9wdHMucHJvZ3Jlc3MgPSAoaW5mbzogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUTW9kZWw+KSA9PiB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWwoaW5mbyk7XG4gICAgICAgICAgICAgICAgIWZpbmFsaXplICYmIHRoaXMuYWRkKGluZm8uaXRlbXMsIG9wdHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKG5vQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmaW5hbGl6ZSAmJiByZXNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQodW5kZWZpbmVkLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHF1ZXJ5SXRlbXMoX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyLCBvcHRzKTtcblxuICAgICAgICAgICAgaWYgKGZpbmFsaXplKSB7XG4gICAgICAgICAgICAgICAgcmVzZXQgPyB0aGlzLnJlc2V0KHJlc3AsIG9wdHMpIDogdGhpcy5hZGQocmVzcCwgb3B0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBDb2xsZWN0aW9uLCByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZXJyb3InLCB1bmRlZmluZWQsIHRoaXMgYXMgQ29sbGVjdGlvbiwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYGZldGNoKClgIHdpdGggbGFzdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDliY3lm57jgajlkIzmnaHku7bjgacgYGZldGNoKClgIOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlcXVlcnkgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODquOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXF1ZXJ5KG9wdGlvbnM/OiBDb2xsZWN0aW9uUmVxdWVyeU9wdGlvbnMpOiBQcm9taXNlPG9iamVjdFtdPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9sYXN0UXVlcnlPcHRpb25zLCBvcHRpb25zLCB7IHJlc2V0OiB0cnVlIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaChvcHRzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBjb2xsZWN0aW9uIHNldHVwXG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIENvbGxlY3Rpb24g44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgasgTW9kZWwg44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYQgTW9kZWwg44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBOdWxsaXNoIHZhbHVlLlxuICAgICAqICAtIGBqYWAgTnVsbGlzaCDopoHntKBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWQ6IHVuZGVmaW5lZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIENvbGxlY3Rpb24g44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgasgTW9kZWwg44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYQgTW9kZWwg44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWRzOiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIHNldChzZWVkcz86IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdm9pZCB7XG4gICAgICAgIGlmIChpc051bGxpc2goc2VlZHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHBhcnNlOiB0aGlzLl9kZWZhdWx0UGFyc2UgfSwgX3NldE9wdGlvbnMsIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGlmIChvcHRzLnBhcnNlICYmICFpc0NvbGxlY3Rpb25Nb2RlbChzZWVkcywgdGhpcykpIHtcbiAgICAgICAgICAgIHNlZWRzID0gdGhpcy5wYXJzZShzZWVkcywgb3B0aW9ucykgPz8gW107XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXM6IChUTW9kZWwgfCBvYmplY3QgfCB1bmRlZmluZWQpW10gPSBzaW5ndWxhciA/IFtzZWVkc10gOiAoc2VlZHMgYXMgb2JqZWN0W10pLnNsaWNlKCk7XG5cbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG5cbiAgICAgICAgY29uc3QgYXQgPSAoKGNhbmRpZGF0ZSk6IG51bWJlciB8IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA+IHN0b3JlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgKz0gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGNhbmRpZGF0ZSA8IDApID8gMCA6IGNhbmRpZGF0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkob3B0cy5hdCk7XG5cbiAgICAgICAgY29uc3Qgc2V0OiBvYmplY3RbXSAgICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvQWRkOiBUTW9kZWxbXSAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b01lcmdlOiBUTW9kZWxbXSAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9SZW1vdmU6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGNvbnN0IG1vZGVsU2V0ID0gbmV3IFNldDxvYmplY3Q+KCk7XG5cbiAgICAgICAgY29uc3QgeyBhZGQsIG1lcmdlLCByZW1vdmUsIHBhcnNlLCBzaWxlbnQgfSA9IG9wdHM7XG5cbiAgICAgICAgbGV0IHNvcnQgPSBmYWxzZTtcbiAgICAgICAgY29uc3Qgc29ydGFibGUgPSB0aGlzLl9jb21wYXJhdG9ycy5sZW5ndGggJiYgbnVsbCA9PSBhdCAmJiBmYWxzZSAhPT0gb3B0cy5zb3J0O1xuXG4gICAgICAgIGludGVyZmFjZSBNb2RlbEZlYXR1cmUge1xuICAgICAgICAgICAgcGFyc2U6IChhdHJyPzogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiBvYmplY3Q7XG4gICAgICAgICAgICBzZXRBdHRyaWJ1dGVzOiAoYXRycjogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiB2b2lkO1xuICAgICAgICAgICAgaGFzQ2hhbmdlZDogKCkgPT4gYm9vbGVhbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFR1cm4gYmFyZSBvYmplY3RzIGludG8gbW9kZWwgcmVmZXJlbmNlcywgYW5kIHByZXZlbnQgaW52YWxpZCBtb2RlbHMgZnJvbSBiZWluZyBhZGRlZC5cbiAgICAgICAgZm9yIChjb25zdCBbaSwgaXRlbV0gb2YgaXRlbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAvLyBJZiBhIGR1cGxpY2F0ZSBpcyBmb3VuZCwgcHJldmVudCBpdCBmcm9tIGJlaW5nIGFkZGVkIGFuZCBvcHRpb25hbGx5IG1lcmdlIGl0IGludG8gdGhlIGV4aXN0aW5nIG1vZGVsLlxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmdldChpdGVtKSBhcyBNb2RlbEZlYXR1cmU7XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVyZ2UgJiYgaXRlbSAhPT0gZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJzID0gaXNNb2RlbChpdGVtKSA/IGl0ZW0udG9KU09OKCkgOiBpdGVtO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2UgJiYgaXNGdW5jdGlvbihleGlzdGluZy5wYXJzZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzID0gZXhpc3RpbmcucGFyc2UoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZXhpc3Rpbmcuc2V0QXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nLnNldEF0dHJpYnV0ZXMoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihleGlzdGluZywgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdG9NZXJnZS5wdXNoKGV4aXN0aW5nIGFzIFRNb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3J0YWJsZSAmJiAhc29ydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydCA9IGlzRnVuY3Rpb24oZXhpc3RpbmcuaGFzQ2hhbmdlZCkgPyBleGlzdGluZy5oYXNDaGFuZ2VkKCkgOiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKGV4aXN0aW5nKSkge1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQoZXhpc3RpbmcpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGl0ZW1zW2ldID0gZXhpc3Rpbmc7XG4gICAgICAgICAgICB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgYnJhY2Utc3R5bGVcblxuICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIG5ldywgdmFsaWQgbW9kZWwsIHB1c2ggaXQgdG8gdGhlIGB0b0FkZGAgbGlzdC5cbiAgICAgICAgICAgIGVsc2UgaWYgKGFkZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gaXRlbXNbaV0gPSB0aGlzW19wcmVwYXJlTW9kZWxdKGl0ZW0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgICAgICAgICB0b0FkZC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfYWRkUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgc3RhbGUgbW9kZWxzLlxuICAgICAgICBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIHN0b3JlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMobW9kZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvUmVtb3ZlLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b1JlbW92ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzW19yZW1vdmVNb2RlbHNdKHRvUmVtb3ZlLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlZSBpZiBzb3J0aW5nIGlzIG5lZWRlZCwgdXBkYXRlIGBsZW5ndGhgIGFuZCBzcGxpY2UgaW4gbmV3IG1vZGVscy5cbiAgICAgICAgbGV0IG9yZGVyQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCByZXBsYWNlID0gIXNvcnRhYmxlICYmIGFkZCAmJiByZW1vdmU7XG4gICAgICAgIGlmIChzZXQubGVuZ3RoICYmIHJlcGxhY2UpIHtcbiAgICAgICAgICAgIG9yZGVyQ2hhbmdlZCA9IChzdG9yZS5sZW5ndGggIT09IHNldC5sZW5ndGgpIHx8IHN0b3JlLnNvbWUoKG0sIGluZGV4KSA9PiBtICE9PSBzZXRbaW5kZXhdKTtcbiAgICAgICAgICAgIHN0b3JlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgc2V0LCAwKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b0FkZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChzb3J0YWJsZSkge1xuICAgICAgICAgICAgICAgIHNvcnQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3BsaWNlQXJyYXkoc3RvcmUsIHRvQWRkLCBhdCA/PyBzdG9yZS5sZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2lsZW50bHkgc29ydCB0aGUgY29sbGVjdGlvbiBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgaWYgKHNvcnQpIHtcbiAgICAgICAgICAgIHRoaXMuc29ydCh7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVubGVzcyBzaWxlbmNlZCwgaXQncyB0aW1lIHRvIGZpcmUgYWxsIGFwcHJvcHJpYXRlIGFkZC9zb3J0L3VwZGF0ZSBldmVudHMuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtpLCBtb2RlbF0gb2YgdG9BZGQuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGF0ICsgaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50QnJva2VyKSkge1xuICAgICAgICAgICAgICAgICAgICAobW9kZWwgYXMgTW9kZWwpLnRyaWdnZXIoJ0BhZGQnLCBtb2RlbCBhcyBNb2RlbCwgdGhpcywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGFkZCcsIG1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzb3J0IHx8IG9yZGVyQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0Bzb3J0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b0FkZC5sZW5ndGggfHwgdG9SZW1vdmUubGVuZ3RoIHx8IHRvTWVyZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0ge1xuICAgICAgICAgICAgICAgICAgICBhZGRlZDogdG9BZGQsXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZWQ6IHRvUmVtb3ZlLFxuICAgICAgICAgICAgICAgICAgICBtZXJnZWQ6IHRvTWVyZ2VcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZHJvcCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgcmV0dmFsID0gaXRlbXMuZmlsdGVyKGkgPT4gbnVsbCAhPSBpKSBhcyBUTW9kZWxbXTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIGFkZGVkIChvciBtZXJnZWQpIG1vZGVsIChvciBtb2RlbHMpLlxuICAgICAgICByZXR1cm4gc2luZ3VsYXIgPyByZXR2YWxbMF0gOiAocmV0dmFsLmxlbmd0aCA/IHJldHZhbCA6IHZvaWQgMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgYSBjb2xsZWN0aW9uIHdpdGggYSBuZXcgbGlzdCBvZiBtb2RlbHMgKG9yIGF0dHJpYnV0ZSBoYXNoZXMpLCB0cmlnZ2VyaW5nIGEgc2luZ2xlIGByZXNldGAgZXZlbnQgb24gY29tcGxldGlvbi5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjgpLmlrDjgZfjgYQgTW9kZWwg5LiA6Kan44Gn572u5o+bLiDlrozkuobmmYLjgasgYHJlc2V0YCDjgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODquOCu+ODg+ODiOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNldChzZWVkcz86IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMgJiB7IHByZXZpb3VzOiBUTW9kZWxbXTsgfTtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cy5wcmV2aW91cyA9IHN0b3JlLnNsaWNlKCk7XG4gICAgICAgIHJlc2V0TW9kZWxTdG9yZSh0aGlzW19wcm9wZXJ0aWVzXSk7XG5cbiAgICAgICAgY29uc3QgbW9kZWxzID0gc2VlZHMgPyB0aGlzLmFkZChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSkgOiBbXTtcblxuICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAcmVzZXQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vZGVscztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG1vZGVsIHRvIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBuOOBriBNb2RlbCDjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGQoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB0byB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogQGphIE1vZGVsIOODquOCueODiOaMh+WumuOBq+OCiOOCiyBDb2xsZWN0aW9uIOOBuOOBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGQoc2VlZHM6IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldChzZWVkcyBhcyBVbmtub3duT2JqZWN0LCBPYmplY3QuYXNzaWduKHsgbWVyZ2U6IGZhbHNlIH0sIG9wdGlvbnMsIF9hZGRPcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjgYvjgokgTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVtb3ZlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDliYrpmaTjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBsaXN0IG9mIG1vZGVscyBmcm9tIHRoZSBzZXQuXG4gICAgICogQGphIE1vZGVsIOODquOCueODiOaMh+WumuOBq+OCiOOCiyBDb2xsZWN0aW9uIOOBi+OCieOBruWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBzaW5ndWxhciA/IFtzZWVkcyBhcyBUTW9kZWxdIDogKHNlZWRzIGFzIFRNb2RlbFtdKS5zbGljZSgpO1xuICAgICAgICBjb25zdCByZW1vdmVkID0gdGhpc1tfcmVtb3ZlTW9kZWxzXShpdGVtcywgb3B0cyk7XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHsgYWRkZWQ6IFtdLCBtZXJnZWQ6IFtdLCByZW1vdmVkIH07XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2luZ3VsYXIgPyByZW1vdmVkWzBdIDogcmVtb3ZlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgbW9kZWwgdG8gdGhlIGVuZCBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+44GrIE1vZGVsIOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHB1c2goc2VlZDogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2VlZCwgT2JqZWN0LmFzc2lnbih7IGF0OiBzdG9yZS5sZW5ndGggfSwgb3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacq+WwvuOBriBNb2RlbCDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHBvcChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHN0b3JlW3N0b3JlLmxlbmd0aCAtIDFdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgbW9kZWwgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt44GrIE1vZGVsIOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuc2hpZnQoc2VlZDogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZChzZWVkLCBPYmplY3QuYXNzaWduKHsgYXQ6IDAgfSwgb3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOWFiOmgreOBriBNb2RlbCDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNoaWZ0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc3RvcmVbMF0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgYSBtb2RlbCBpbiB0aGlzIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOaWsOOBl+OBhCBNb2RlbCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJDjgZcsIENvbGxlY3Rpb24g44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cnNcbiAgICAgKiAgLSBgZW5gIGF0dHJpYnV0ZXMgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5bGe5oCn44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG1vZGVsIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgTW9kZWwg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNyZWF0ZShhdHRyczogb2JqZWN0LCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc2VlZCA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oYXR0cnMsIG9wdGlvbnMgYXMgU2lsZW5jZWFibGUpO1xuICAgICAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtb2RlbCA9IGlzTW9kZWwoc2VlZCkgPyBzZWVkIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXdhaXQgfHwgIW1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vZGVsLnNhdmUodW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHNlZWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZXJyb3InLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBtb2RlbCBwcmVwYXJhdGlvbiAqL1xuICAgIHByaXZhdGUgW19wcmVwYXJlTW9kZWxdKGF0dHJzOiBvYmplY3QgfCBUTW9kZWwgfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKGlzQ29sbGVjdGlvbk1vZGVsKGF0dHJzLCB0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBtb2RlbENvbnN0cnVjdG9yKHRoaXMpO1xuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucyB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGlmIChjb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG1vZGVsT3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IG5ldyBjb25zdHJ1Y3RvcihhdHRycywgb3B0cykgYXMgeyB2YWxpZGF0ZTogKCkgPT4gUmVzdWx0OyB9O1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24obW9kZWwudmFsaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbW9kZWwudmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAaW52YWxpZCcsIGF0dHJzIGFzIE1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIHJlc3VsdCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsIGFzIFRNb2RlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBsYWluIG9iamVjdFxuICAgICAgICByZXR1cm4gYXR0cnMgYXMgVE1vZGVsO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIGNhbGxlZCBieSBib3RoIHJlbW92ZSBhbmQgc2V0LiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVNb2RlbHNdKG1vZGVsczogVE1vZGVsW10sIG9wdGlvbnM6IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBtZGwgb2YgbW9kZWxzKSB7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IHRoaXMuZ2V0KG1kbCk7XG4gICAgICAgICAgICBpZiAoIW1vZGVsKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzdG9yZS5pbmRleE9mKG1vZGVsKTtcbiAgICAgICAgICAgIHN0b3JlLnNwbGljZShpbmRleCwgMSk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSByZWZlcmVuY2VzIGJlZm9yZSB0cmlnZ2VyaW5nICdyZW1vdmUnIGV2ZW50IHRvIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcC5cbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwsIHRydWUpO1xuXG4gICAgICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0ByZW1vdmUnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlbW92ZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gY3JlYXRlIGEgbW9kZWwncyB0aWVzIHRvIGEgY29sbGVjdGlvbi4gKi9cbiAgICBwcml2YXRlIFtfYWRkUmVmZXJlbmNlXShtb2RlbDogVE1vZGVsKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLnNldChfY2lkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuc2V0KGlkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgKHRoaXMgYXMgYW55KVtfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCB0byBzZXZlciBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCwgcGFydGlhbCA9IGZhbHNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLmRlbGV0ZShfY2lkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGFydGlhbCAmJiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRQdWJsaXNoZXIpKSkge1xuICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKG1vZGVsIGFzIFN1YnNjcmliYWJsZSwgJyonLCAodGhpcyBhcyBhbnkpW19vbk1vZGVsRXZlbnRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFRNb2RlbD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRvciBvZiB7QGxpbmsgRWxlbWVudEJhc2V9IHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOagvOe0jeOBl+OBpuOBhOOCiyB7QGxpbmsgRWxlbWVudEJhc2V9IOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMubW9kZWxzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VE1vZGVsPiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRlciA8IHRoaXMuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYmFzZVt0aGlzLnBvaW50ZXIrK10sXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VE1vZGVsPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaWQpLCB2YWx1ZShtb2RlbCkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSwgdmFsdWUobW9kZWwpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBUTW9kZWxdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpZCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZykgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcy5tb2RlbHMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvczJrZXkgPSAocG9zOiBudW1iZXIpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGdldE1vZGVsSWQoY29udGV4dC5iYXNlW3Bvc10gYXMgQWNjZXNzaWJsZTxUTW9kZWwsIHN0cmluZz4sIG1vZGVsQ29uc3RydWN0b3IodGhpcykpIHx8IFN0cmluZyhwb3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihwb3Mya2V5KGN1cnJlbnQpLCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gaXRlcmF0b3I7XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoQ29sbGVjdGlvbiBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiIsImltcG9ydCB0eXBlIHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgdHlwZSB7IExpc3RDaGFuZ2VkLCBMaXN0RWRpdE9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBjbGVhckFycmF5LFxuICAgIGFwcGVuZEFycmF5LFxuICAgIGluc2VydEFycmF5LFxuICAgIHJlb3JkZXJBcnJheSxcbiAgICByZW1vdmVBcnJheSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgdHlwZSB7IENvbGxlY3Rpb24gfSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiBFZGl0ZWQgY29sbGVjdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEg6KKr57eo6ZuGIENvbGxlY3Rpb24g44Gu5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIENvbGxlY3Rpb25FZGl0ZWU8TSBleHRlbmRzIG9iamVjdD4gPSBDb2xsZWN0aW9uPE0sIGFueSwgYW55PjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHByZXBhcmU8VCBleHRlbmRzIG9iamVjdD4oY29sbGVjdGlvbjogQ29sbGVjdGlvbjxUPik6IFRbXSB8IG5ldmVyIHtcbiAgICBpZiAoY29sbGVjdGlvbi5maWx0ZXJlZCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19FRElUX1BFUk1JU1NJT05fREVOSUVELCAnY29sbGVjdGlvbiBpcyBhcHBsaWVkIGFmdGVyLWZpbHRlci4nKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24ubW9kZWxzLnNsaWNlKCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmFzeW5jIGZ1bmN0aW9uIGV4ZWM8VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxUPixcbiAgICBvcHRpb25zOiBMaXN0RWRpdE9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgb3BlcmF0aW9uOiAodGFyZ2V0czogVFtdLCB0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpID0+IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4sXG4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBjb25zdCB0YXJnZXRzID0gcHJlcGFyZTxUPihjb2xsZWN0aW9uKTtcbiAgICBjb25zdCBjaGFuZ2UgPSBhd2FpdCBvcGVyYXRpb24odGFyZ2V0cywgb3B0aW9ucz8uY2FuY2VsKTtcbiAgICBjb2xsZWN0aW9uLnNldCh0YXJnZXRzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gY2hhbmdlO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBtaW4oaW5kaWNlczogbnVtYmVyW10pOiBudW1iZXIge1xuICAgIHJldHVybiBpbmRpY2VzLnJlZHVjZSgobGhzLCByaHMpID0+IE1hdGgubWluKGxocywgcmhzKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIG1ha2VMaXN0Q2hhbmdlZDxUPihcbiAgICB0eXBlOiAnYWRkJyB8ICdyZW1vdmUnIHwgJ3Jlb3JkZXInLFxuICAgIGNoYW5nZXM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10sXG4gICAgcmFuZ2VGcm9tOiBudW1iZXIsXG4gICAgcmFuZ2VUbzogbnVtYmVyLFxuICAgIGF0PzogbnVtYmVyLFxuKTogTGlzdENoYW5nZWQ8VD4ge1xuICAgIGNvbnN0IGNoYW5nZWQgPSAhIWNoYW5nZXMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIGxpc3Q6IGNoYW5nZXMsXG4gICAgICAgIHJhbmdlOiBjaGFuZ2VkID8geyBmcm9tOiByYW5nZUZyb20sIHRvOiByYW5nZVRvIH0gOiB1bmRlZmluZWQsXG4gICAgICAgIGluc2VydGVkVG86IGNoYW5nZWQgPyBhdCA6IHVuZGVmaW5lZCxcbiAgICB9IGFzIExpc3RDaGFuZ2VkPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgZWxlbWVudHMgb2Yge0BsaW5rIENvbGxlY3Rpb259LlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSDopoHntKDjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQge0BsaW5rIENvbGxlY3Rpb259XG4gKiAgLSBgamFgIOWvvuixoSB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IHJlZmVyZW5jZS5cbiAqICAtIGBqYWAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYXJDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlVG8gPSBjb2xsZWN0aW9uLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBjbGVhckFycmF5KHRhcmdldHMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVtb3ZlJywgY2hhbmdlcywgMCwgcmFuZ2VUbyk7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiB7QGxpbmsgQ29sbGVjdGlvbn0uXG4gKiBAamEge0BsaW5rIENvbGxlY3Rpb259IOOBruacq+WwvuOBq+i/veWKoFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqICAtIGBqYWAg5a++6LGhIHtAbGluayBDb2xsZWN0aW9ufVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZENvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBzcmM6IFRbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gY29sbGVjdGlvbi5sZW5ndGg7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBhcHBlbmRBcnJheSh0YXJnZXRzLCBzcmMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgnYWRkJywgY2hhbmdlcywgcmFuZ2VGcm9tLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIHJhbmdlRnJvbSk7XG59XG5cbi8qKlxuICogQGVuIEluc2VydCBzb3VyY2UgZWxlbWVudHMgdG8gc3BlY2lmaWVkIGluZGV4IG9mIHtAbGluayBDb2xsZWN0aW9ufS5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g44Gu5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydENvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBpbmRleDogbnVtYmVyLFxuICAgIHNyYzogVFtdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGluc2VydEFycmF5KHRhcmdldHMsIGluZGV4LCBzcmMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgnYWRkJywgY2hhbmdlcywgaW5kZXgsIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgaW5kZXgpO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIHtAbGluayBDb2xsZWN0aW9ufSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30gcmVmZXJlbmNlLlxuICogIC0gYGphYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIGluZGV4OiBudW1iZXIsXG4gICAgb3JkZXJzOiBudW1iZXJbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gbWluKFtpbmRleCwgLi4ub3JkZXJzXSk7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiByZW9yZGVyQXJyYXkodGFyZ2V0cywgaW5kZXgsIG9yZGVycywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW9yZGVyJywgY2hhbmdlcywgcmFuZ2VGcm9tLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIGluZGV4KTtcbn1cblxuLyoqXG4gKiBAZW4gUmVtb3ZlIHtAbGluayBDb2xsZWN0aW9ufSBlbGVtZW50cy5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZUNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBvcmRlcnM6IG51bWJlcltdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBtaW4ob3JkZXJzKTtcbiAgICBjb25zdCByYW5nZVRvID0gY29sbGVjdGlvbi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gcmVtb3ZlQXJyYXkodGFyZ2V0cywgb3JkZXJzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3JlbW92ZScsIGNoYW5nZXMsIHJhbmdlRnJvbSwgcmFuZ2VUbyk7XG59XG4iXSwibmFtZXMiOlsiZ2V0TGFuZ3VhZ2UiLCJ0cnVuYyIsIk9ic2VydmFibGVBcnJheSIsImNjIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwidW5pcXVlIiwiY29tcHV0ZURhdGUiLCJpc0Z1bmN0aW9uIiwic29ydCIsInNodWZmbGUiLCJpc1N0cmluZyIsIkV2ZW50U291cmNlIiwibHVpZCIsImlzTW9kZWwiLCJhdCIsImRlZmF1bHRTeW5jIiwibm9vcCIsImlzTnVsbGlzaCIsImlzQXJyYXkiLCJtb2RlbCIsIkV2ZW50QnJva2VyIiwicmVzdWx0IiwiRkFJTEVEIiwiRXZlbnRQdWJsaXNoZXIiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUxELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsd0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSx3QkFBaUQsQ0FBQTtZQUNqRCxXQUFtQyxDQUFBLFdBQUEsQ0FBQSwwQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsb0NBQTZCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBLEdBQUEsMEJBQUEsQ0FBQTtZQUM5SCxXQUFtQyxDQUFBLFdBQUEsQ0FBQSwrQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsb0NBQTZC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R0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3RyxJQUFBLE9BQU8sZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQW1CRztJQUNJLGVBQWUsaUJBQWlCLENBQ25DLFVBQStCLEVBQy9CLEtBQWEsRUFDYixNQUFnQixFQUNoQixPQUF5QixFQUFBO1FBRXpCLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDakgsSUFBQSxPQUFPLGVBQWUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQkc7SUFDSSxlQUFlLGdCQUFnQixDQUNsQyxVQUErQixFQUMvQixNQUFnQixFQUNoQixPQUF5QixFQUFBO0lBRXpCLElBQUEsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlCLElBQUEsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDdEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RyxPQUFPLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9jb2xsZWN0aW9uLyJ9