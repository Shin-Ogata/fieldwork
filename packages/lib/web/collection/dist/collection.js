/*!
 * @cdp/collection 0.9.18
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
            } // eslint-disable-line @stylistic:js/brace-style
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
        return ctor?.idAttribute || 'id';
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
        return self.constructor.model;
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
                } // eslint-disable-line @stylistic:js/brace-style
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIiwiYmFzZS50cyIsImNvbGxlY3Rpb24tZWRpdG9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQ09MTEVDVElPTiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDEwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX0NPTExFQ1RJT05fREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMSwgJ2ludmFsaWQgYWNjZXNzLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUyAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAyLCAnaW52YWxpZCBjb21wYXJhdG9ycy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMywgJ2VkaXRpbmcgcGVybWlzc2lvbiBkZW5pZWQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBBY2Nlc3NpYmxlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyB7QGxpbmsgQ29sbGF0b3JQcm92aWRlcn0g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0Q29sbGF0b3JQcm92aWRlcihuZXdQcm92aWRlcj86IENvbGxhdG9yUHJvdmlkZXIpOiBDb2xsYXRvclByb3ZpZGVyIHtcbiAgICBpZiAobnVsbCA9PSBuZXdQcm92aWRlcikge1xuICAgICAgICByZXR1cm4gX2NvbGxhdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFByb3ZpZGVyID0gX2NvbGxhdG9yO1xuICAgICAgICBfY29sbGF0b3IgPSBuZXdQcm92aWRlcjtcbiAgICAgICAgcmV0dXJuIG9sZFByb3ZpZGVyO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gR2V0IHN0cmluZyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaWh+Wtl+WIl+avlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgLy8gdW5kZWZpbmVkIOOBryAnJyDjgajlkIznrYnjgavmibHjgYZcbiAgICAgICAgY29uc3QgbGhzUHJvcCA9IChudWxsICE9IGxoc1twcm9wXSkgPyBsaHNbcHJvcF0gYXMgc3RyaW5nIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcF0pID8gcmhzW3Byb3BdIGFzIHN0cmluZyA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wXTtcbiAgICAgICAgY29uc3QgcmhzRGF0ZSA9IHJoc1twcm9wXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IEFjY2Vzc2libGU8VD4sIHJoczogQWNjZXNzaWJsZTxUPik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcF0gPT09IHJoc1twcm9wXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBsaHNbcHJvcF0pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3BdKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcF0gPCByaHNbcHJvcF0gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSB7QGxpbmsgU29ydEtleX0uXG4gKiBAamEge0BsaW5rIFNvcnRLZXl9IOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdHlwZSwgb3JkZXIgfSA9IHNvcnRLZXk7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIHtAbGluayBTb3J0S2V5fSBhcnJheS5cbiAqIEBqYSB7QGxpbmsgU29ydEtleX0g6YWN5YiX44KSIGNvbXBhcmF0b3Ig6YWN5YiX44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U29ydEtleXM8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oc29ydEtleXM6IFNvcnRLZXk8Sz5bXSk6IFNvcnRDYWxsYmFjazxUPltdIHtcbiAgICBjb25zdCBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFQ+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNvcnRLZXkgb2Ygc29ydEtleXMpIHtcbiAgICAgICAgY29tcGFyYXRvcnMucHVzaCh0b0NvbXBhcmF0b3Ioc29ydEtleSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyYXRvcnM7XG59XG4iLCIvKipcbiAqIEBlbiBDdXJzb3IgcG9zaXRpb24gY29uc3RhbnQuXG4gKiBAamEg44Kr44O844K944Or5L2N572u5a6a5pWwXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIEN1cnNvclBvcyB7XG4gICAgT1VUX09GX1JBTkdFICAgID0gLTEsXG4gICAgQ1VSUkVOVCAgICAgICAgID0gLTIsXG59XG5cbi8qKlxuICogQGVuIFNlZWsgZXhwcmVzc2lvbiBmdW5jdGlvbiB0eXBlLlxuICogQGphIOOCt+ODvOOCr+W8j+mWouaVsOWumue+qVxuICovXG5leHBvcnQgdHlwZSBTZWVrRXhwPFQ+ID0gKHZhbHVlOiBULCBpbmRleD86IG51bWJlciwgb2JqPzogVFtdKSA9PiBib29sZWFuO1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgcHJvdmlkZXMgY3Vyc29yIGludGVyZmFjZSBmb3IgQXJyYXkuIDxicj5cbiAqICAgICBJdCBpcyBkaWZmZXJlbnQgZnJvbSBJdGVyYXRvciBpbnRlcmZhY2Ugb2YgZXMyMDE1LCBhbmQgdGhhdCBwcm92aWRlcyBpbnRlcmZhY2Ugd2hpY2ggaXMgc2ltaWxhciB0byBEQiByZWNvcmRzZXQncyBvbmUuXG4gKiBAamEgQXJyYXkg55So44Kr44O844K944OrIEkvRiDjgpLmj5DkvpvjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIGVzMjAxNSDjga4gSXRlcmF0b3IgSS9GIOOBqOOBr+eVsOOBquOCiuOAgURCIHJlY29yZHNldCDjgqrjg5bjgrjjgqfjgq/jg4jjg6njgqTjgq/jgarotbDmn7sgSS9GIOOCkuaPkOS+m+OBmeOCi1xuICovXG5leHBvcnQgY2xhc3MgQXJyYXlDdXJzb3I8VCA9IGFueT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvKiogQGludGVybmFsIOWvvuixoeOBrumFjeWIlyAgKi9cbiAgICBwcml2YXRlIF9hcnJheTogVFtdO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5YWI6aCt44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgICovXG4gICAgcHJpdmF0ZSBfYm9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5pyr5bC+44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9lb2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDnj77lnKjjga4gaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiAwXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IDBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhcnJheTogVFtdLCBpbml0aWFsSW5kZXggPSAwKSB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB0YXJnZXQgYXJyYXkuXG4gICAgICogQGphIOWvvuixoeOBruWGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXkuIGRlZmF1bHQ6IGVtcHR5IGFycmF5LlxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aLiAgIGRlZmF1bHQ6IOepuumFjeWIl1xuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqL1xuICAgIHB1YmxpYyByZXNldChhcnJheTogVFtdID0gW10sIGluaXRpYWxJbmRleDogbnVtYmVyID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRSk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gY3VycmVudCBlbGVtZW50LlxuICAgICAqIEBqYSDnj77lnKjjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgY3VycmVudCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5W3RoaXMuX2luZGV4XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOaMh+OBl+ekuuOBl+OBpuOBhOOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGFyZ2V0IGFycmF5IGxlbmd0aC5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gu6KaB57Sg5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBCT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7lhYjpoK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNCT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ib2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEVPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruacq+WwvuOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0VPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHJhdyBhcnJheSBpbnN0YW5jZS5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGFycmF5KCk6IFRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjdXJzb3Igb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gZmlyc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVGaXJzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGxhc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVMYXN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbmV4dCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLmrKHjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZU5leHQoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fYm9mKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gcHJldmlvdXMgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5YmN44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVQcmV2aW91cygpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9lb2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLmxlbmd0aCAtIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleC0tO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWVrIGJ5IHBhc3NlZCBjcml0ZXJpYS4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgb3BlcmF0aW9uIGZhaWxlZCwgdGhlIGN1cnNvciBwb3NpdGlvbiBzZXQgdG8gRU9GLlxuICAgICAqIEBqYSDmjIflrprmnaHku7bjgafjgrfjg7zjgq8gPGJyPlxuICAgICAqICAgICDjgrfjg7zjgq/jgavlpLHmlZfjgZfjgZ/loLTlkIjjga8gRU9GIOeKtuaFi+OBq+OBquOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGNyaXRlcmlhXG4gICAgICogIC0gYGVuYCBpbmRleCBvciBzZWVrIGV4cHJlc3Npb25cbiAgICAgKiAgLSBgamFgIGluZGV4IC8g5p2h5Lu25byP44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNlZWsoY3JpdGVyaWE6IG51bWJlciB8IFNlZWtFeHA8VD4pOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICgnbnVtYmVyJyA9PT0gdHlwZW9mIGNyaXRlcmlhKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGNyaXRlcmlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5maW5kSW5kZXgoY3JpdGVyaWEpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICog44Kr44O844K944Or44GM5pyJ5Yq544Gq56+E5Zuy44KS56S644GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHRydWU6IOacieWKuSAvIGZhbHNlOiDnhKHlirlcbiAgICAgKi9cbiAgICBwcml2YXRlIHZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKDAgPD0gdGhpcy5faW5kZXggJiYgdGhpcy5faW5kZXggPCB0aGlzLl9hcnJheS5sZW5ndGgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuaXF1ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIENhbmNlbFRva2VuLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlQXJyYXksIEFycmF5Q2hhbmdlUmVjb3JkIH0gZnJvbSAnQGNkcC9vYnNlcnZhYmxlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuXG5jb25zdCB7XG4gICAgLyoqIEBpbnRlcm5hbCAqLyB0cnVuY1xufSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwgd2FpdCBmb3IgY2hhbmdlIGRldGVjdGlvbiAqL1xuZnVuY3Rpb24gbWFrZVByb21pc2U8VD4oZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD4sIHJlbWFwPzogVFtdKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBlZGl0b3Iub2ZmKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgICAgIHJlbWFwLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgcmVtYXAucHVzaCguLi5lZGl0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZWNvcmRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLm9uKGNhbGxiYWNrKTtcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIHtAbGluayBPYnNlcnZhYmxlQXJyYXl9IGlmIG5lZWRlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldEVkaXRDb250ZXh0PFQ+KFxuICAgIHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLFxuICAgIHRva2VuPzogQ2FuY2VsVG9rZW5cbik6IFByb21pc2U8eyBlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPjsgcHJvbWlzZTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPjsgfT4gfCBuZXZlciB7XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIE9ic2VydmFibGVBcnJheSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3I6IHRhcmdldCxcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgY29uc3QgZWRpdG9yID0gT2JzZXJ2YWJsZUFycmF5LmZyb20odGFyZ2V0KTtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yLFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UoZWRpdG9yLCB0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgJ3RhcmdldCBpcyBub3QgQXJyYXkgb3IgT2JzZXJ2YWJsZUFycmF5LicpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBvcmRlcnMgaW5kZXggKi9cbmZ1bmN0aW9uIHZhbGlkT3JkZXJzKGxlbmd0aDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdKTogYm9vbGVhbiB8IG5ldmVyIHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGluZGV4IG9mIG9yZGVycykge1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IGxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBvcmRlcnNbXSBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbn0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKDAsIHRhcmdldC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3IucHVzaCguLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEluc2VydCBzb3VyY2UgZWxlbWVudHMgdG8gc3BlY2lmaWVkIGluZGV4IG9mIGFycmF5LlxuICogQGphIOaMh+WumuOBl+OBn+S9jee9ruOBq+aMv+WFpVxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYGluc2VydEFycmF5KCksIGluZGV4IGlzIGludmFsaWQuIGluZGV4OiAke2luZGV4fWApO1xuICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKGluZGV4LCAwLCAuLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIgYXJyYXkgZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEg6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYHJlb3JkZXJBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKCF2YWxpZE9yZGVycyh0YXJnZXQubGVuZ3RoLCBvcmRlcnMpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDkvZzmpa3phY3liJfjgafnt6jpm4ZcbiAgICBsZXQgd29yazogKFQgfCBudWxsKVtdID0gQXJyYXkuZnJvbShlZGl0b3IpO1xuICAgIHtcbiAgICAgICAgY29uc3QgcmVvcmRlcnM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgICAgICByZW9yZGVycy5wdXNoKGVkaXRvcltvcmRlcl0pO1xuICAgICAgICAgICAgd29ya1tvcmRlcl0gPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgd29yay5zcGxpY2UoaW5kZXgsIDAsIC4uLnJlb3JkZXJzKTtcbiAgICAgICAgd29yayA9IHdvcmsuZmlsdGVyKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG51bGwgIT0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIOWApOOCkuabuOOBjeaIu+OBl1xuICAgIGZvciAoY29uc3QgaWR4IG9mIHdvcmsua2V5cygpKSB7XG4gICAgICAgIGVkaXRvcltpZHhdID0gd29ya1tpZHhdIGFzIFQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlbW92ZSBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDpoIXnm67jga7liYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgcmVtb3ZlZCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAoIXZhbGlkT3JkZXJzKHRhcmdldC5sZW5ndGgsIG9yZGVycykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOmZjemghuOCveODvOODiFxuICAgIG9yZGVycy5zb3J0KChsaHMsIHJocykgPT4ge1xuICAgICAgICByZXR1cm4gKGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgIGVkaXRvci5zcGxpY2Uob3JkZXIsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuIiwiaW1wb3J0IHsgS2V5cywgY29tcHV0ZURhdGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRmlsdGVyQ2FsbGJhY2ssIER5bmFtaWNDb21iaW5hdGlvbiB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZUFMTDxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgc3RyaW5nIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PG51bWJlciB8IERhdGUsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgdHlwZSBWYWx1ZVR5cGVTdHJpbmc8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PHN0cmluZywgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIER5bmFtaWNPcGVyYXRvckRhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgdW5kZWZpbmVkO1xuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA9PT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSAhPT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlcjxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IChpdGVtW3Byb3BdIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pID4gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MRVNTICovXG5leHBvcnQgZnVuY3Rpb24gbGVzczxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IChpdGVtW3Byb3BdIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPj0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gbGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPD0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MSUtFICovXG5leHBvcnQgZnVuY3Rpb24gbGlrZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlU3RyaW5nPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5OT1RfTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdExpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+ICFTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmNsdWRlcyh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuIGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzTm90RXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuICEoZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuUkFOR0UgKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCBtaW46IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4sIG1heDogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gY29tYmluYXRpb24oRHluYW1pY0NvbWJpbmF0aW9uLkFORCwgZ3JlYXRlckVxdWFsKHByb3AsIG1pbiksIGxlc3NFcXVhbChwcm9wLCBtYXgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCDjg5XjgqPjg6vjgr/jga7lkIjmiJAgKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5hdGlvbjxUIGV4dGVuZHMgb2JqZWN0Pih0eXBlOiBEeW5hbWljQ29tYmluYXRpb24sIGxoczogRmlsdGVyQ2FsbGJhY2s8VD4sIHJoczogRmlsdGVyQ2FsbGJhY2s8VD4gfCB1bmRlZmluZWQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuICFyaHMgPyBsaHMgOiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLkFORDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLk9SOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgfHwgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gY29tYmluYXRpb246ICR7dHlwZX1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBmYWlsIHNhZmVcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG4iLCJpbXBvcnQgeyBLZXlzIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7XG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIFNvcnRLZXksXG4gICAgRHluYW1pY0NvbmRpdGlvblNlZWQsXG4gICAgRHluYW1pY09wZXJhdG9yQ29udGV4dCxcbiAgICBEeW5hbWljTGltaXRDb25kaXRpb24sXG4gICAgRHluYW1pY09wZXJhdG9yLFxuICAgIER5bmFtaWNDb21iaW5hdGlvbixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFZhbHVlVHlwZUFMTCxcbiAgICBWYWx1ZVR5cGVDb21wYXJhYmxlLFxuICAgIFZhbHVlVHlwZVN0cmluZyxcbiAgICBlcXVhbCxcbiAgICBub3RFcXVhbCxcbiAgICBncmVhdGVyLFxuICAgIGxlc3MsXG4gICAgZ3JlYXRlckVxdWFsLFxuICAgIGxlc3NFcXVhbCxcbiAgICBsaWtlLFxuICAgIG5vdExpa2UsXG4gICAgZGF0ZUxlc3NFcXVhbCxcbiAgICBkYXRlTGVzc05vdEVxdWFsLFxuICAgIHJhbmdlLFxuICAgIGNvbWJpbmF0aW9uLFxufSBmcm9tICcuL2R5bmFtaWMtZmlsdGVycyc7XG5cbi8qKlxuICogQGVuIER5bmFtaWMgcXVlcnkgY29uZGl0aW9uIG1hbmFnZXIgY2xhc3MuXG4gKiBAamEg44OA44Kk44OK44Of44OD44Kv44Kv44Ko44Oq54q25oWL566h55CG44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBEeW5hbWljQ29uZGl0aW9uPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4gaW1wbGVtZW50cyBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4ge1xuXG4gICAgcHJpdmF0ZSBfb3BlcmF0b3JzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdO1xuICAgIHByaXZhdGUgX2NvbWJpbmF0aW9uOiBEeW5hbWljQ29tYmluYXRpb247XG4gICAgcHJpdmF0ZSBfc3VtS2V5czogS2V5czxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9saW1pdD86IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT47XG4gICAgcHJpdmF0ZSBfcmFuZG9tOiBib29sZWFuO1xuICAgIHByaXZhdGUgX3NvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCB7QGxpbmsgRHluYW1pY0NvbmRpdGlvblNlZWR9IGluc3RhbmNlXG4gICAgICogIC0gYGphYCB7QGxpbmsgRHluYW1pY0NvbmRpdGlvblNlZWR9IOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4gPSB7IG9wZXJhdG9yczogW10gfSkge1xuICAgICAgICBjb25zdCB7IG9wZXJhdG9ycywgY29tYmluYXRpb24sIHN1bUtleXMsIGxpbWl0LCByYW5kb20sIHNvcnRLZXlzIH0gPSBzZWVkcztcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzICAgICA9IG9wZXJhdG9ycztcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gICA9IGNvbWJpbmF0aW9uID8/IER5bmFtaWNDb21iaW5hdGlvbi5BTkQ7XG4gICAgICAgIHRoaXMuX3N1bUtleXMgICAgICAgPSBzdW1LZXlzID8/IFtdO1xuICAgICAgICB0aGlzLl9saW1pdCAgICAgICAgID0gbGltaXQ7XG4gICAgICAgIHRoaXMuX3JhbmRvbSAgICAgICAgPSAhIXJhbmRvbTtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgICAgICA9IHNvcnRLZXlzID8/IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IER5bmFtaWNDb25kaXRpb25TZWVkXG5cbiAgICBnZXQgb3BlcmF0b3JzKCk6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0b3JzO1xuICAgIH1cblxuICAgIHNldCBvcGVyYXRvcnModmFsdWVzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgc3VtS2V5cygpOiAoS2V5czxUSXRlbT4pW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3VtS2V5cztcbiAgICB9XG5cbiAgICBzZXQgc3VtS2V5cyh2YWx1ZXM6IChLZXlzPFRJdGVtPilbXSkge1xuICAgICAgICB0aGlzLl9zdW1LZXlzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIGdldCBjb21iaW5hdGlvbigpOiBEeW5hbWljQ29tYmluYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29tYmluYXRpb247XG4gICAgfVxuXG4gICAgc2V0IGNvbWJpbmF0aW9uKHZhbHVlOiBEeW5hbWljQ29tYmluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgbGltaXQoKTogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9saW1pdDtcbiAgICB9XG5cbiAgICBzZXQgbGltaXQodmFsdWU6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fbGltaXQgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgcmFuZG9tKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmFuZG9tO1xuICAgIH1cblxuICAgIHNldCByYW5kb20odmFsdWU6IGJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5fcmFuZG9tID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHNvcnRLZXlzKCk6IFNvcnRLZXk8VEtleT5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3J0S2V5cztcbiAgICB9XG5cbiAgICBzZXQgc29ydEtleXModmFsdWVzOiBTb3J0S2V5PFRLZXk+W10pIHtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIGFjY2Vzc29yOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb21wYXJhdG9yIGZ1bmN0aW9ucy5cbiAgICAgKiBAamEg5q+U6LyD6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0U29ydEtleXModGhpcy5fc29ydEtleXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc3ludGhlc2lzIGZpbHRlciBmdW5jdGlvbi5cbiAgICAgKiBAamEg5ZCI5oiQ5riI44G/44OV44Kj44Or44K/6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4ge1xuICAgICAgICBsZXQgZmx0cjogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29uZCBvZiB0aGlzLl9vcGVyYXRvcnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgb3BlcmF0b3IsIHByb3AsIHZhbHVlIH0gPSBjb25kO1xuICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkVRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVBTEw8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXI8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1M6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzczxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuR1JFQVRFUl9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVyRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzc0VxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpa2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZVN0cmluZzxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTk9UX0xJS0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90TGlrZTxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc05vdEVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBudW1iZXIsIGNvbmQudW5pdCksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5SQU5HRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4sIGNvbmQucmFuZ2UgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdG9yOiAke29wZXJhdG9yfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmbHRyID8/ICgoLyogaXRlbSAqLykgPT4gdHJ1ZSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgc29ydCxcbiAgICBzaHVmZmxlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY2hlY2tDYW5jZWxlZCBhcyBjYyB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgU29ydEtleSxcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25JdGVtUHJvdmlkZXIsXG4gICAgRHluYW1pY0xpbWl0LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4uL3V0aWxzL2NvbXBhcmF0b3InO1xuaW1wb3J0IHsgRHluYW1pY0NvbmRpdGlvbiB9IGZyb20gJy4vZHluYW1pYy1jb25kaXRpb24nO1xuXG5jb25zdCB7XG4gICAgLyoqIEBpbnRlcm5hbCAqLyB0cnVuY1xufSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwg5L2/55So44GZ44KL44OX44Ot44OR44OG44Kj44GM5L+d6Ki844GV44KM44GfIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zICovXG5pbnRlcmZhY2UgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4gZXh0ZW5kcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIHNvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG4gICAgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEFwcGx5IGBmaWx0ZXJgIGFuZCBgc29ydCBrZXlgIHRvIHRoZSBgaXRlbXNgIGZyb20ge0BsaW5rIHF1ZXJ5SXRlbXN9KCkgcmVzdWx0LlxuICogQGphIHtAbGluayBxdWVyeUl0ZW1zfSgpIOOBl+OBnyBgaXRlbXNgIOOBq+WvvuOBl+OBpiBgZmlsdGVyYCDjgaggYHNvcnQga2V5YCDjgpLpgannlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEl0ZW1zPFRJdGVtPihpdGVtczogVEl0ZW1bXSwgZmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgbnVsbCwgLi4uY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSk6IFRJdGVtW10ge1xuICAgIGxldCByZXN1bHQgPSBpc0Z1bmN0aW9uKGZpbHRlcikgPyBpdGVtcy5maWx0ZXIoZmlsdGVyKSA6IGl0ZW1zLnNsaWNlKCk7XG4gICAgZm9yIChjb25zdCBjb21wYXJhdG9yIG9mIGNvbXBhcmF0b3JzKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBhcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzb3J0KHJlc3VsdCwgY29tcGFyYXRvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY29uZGl0aW5hbEZpeCDjgavkvb/nlKjjgZnjgosgQ3JpdGVyaWEgTWFwICovXG5jb25zdCBfbGltaXRDcml0ZXJpYSA9IHtcbiAgICBbRHluYW1pY0xpbWl0LkNPVU5UXTogbnVsbCxcbiAgICBbRHluYW1pY0xpbWl0LlNVTV06IHsgY29lZmY6IDEgfSxcbiAgICBbRHluYW1pY0xpbWl0LlNFQ09ORF06IHsgY29lZmY6IDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1JTlVURV06IHsgY29lZmY6IDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuSE9VUl06IHsgY29lZmY6IDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5EQVldOiB7IGNvZWZmOiAyNCAqIDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5LQl06IHsgY29lZmY6IDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1CXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LkdCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5UQl06IHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbn07XG5cbi8qKlxuICogQGVuIEZpeCB0aGUgdGFyZ2V0IGl0ZW1zIGJ5IHtAbGluayBEeW5hbWljQ29uZGl0aW9ufS5cbiAqIEBqYSB7QGxpbmsgRHluYW1pY0NvbmRpdGlvbn0g44Gr5b6T44GE5a++6LGh44KS5pW05b2iXG4gKlxuICogQHBhcmFtIGl0ZW1zXG4gKiAgLSBgZW5gIHRhcmdldCBpdGVtcyAoZGVzdHJ1Y3RpdmUpXG4gKiAgLSBgamFgIOWvvuixoeOBruOCouOCpOODhuODoCAo56C05aOK55qEKVxuICogQHBhcmFtIGNvbmRpdGlvblxuICogIC0gYGVuYCBjb25kaXRpb24gb2JqZWN0XG4gKiAgLSBgamFgIOadoeS7tuOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uZGl0aW9uYWxGaXg8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PihcbiAgICBpdGVtczogVEl0ZW1bXSxcbiAgICBjb25kaXRpb246IER5bmFtaWNDb25kaXRpb248VEl0ZW0sIFRLZXk+XG4pOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPiB7XG4gICAgY29uc3QgeyByYW5kb20sIGxpbWl0LCBzdW1LZXlzIH0gPSBjb25kaXRpb247XG5cbiAgICBpZiAocmFuZG9tKSB7XG4gICAgICAgIHNodWZmbGUoaXRlbXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChsaW1pdCkge1xuICAgICAgICBjb25zdCB7IHVuaXQsIHZhbHVlLCBwcm9wIH0gPSBsaW1pdDtcbiAgICAgICAgY29uc3QgcmVzZXQ6IFRJdGVtW10gPSBbXTtcbiAgICAgICAgY29uc3QgY3JpdGVyaWEgPSBfbGltaXRDcml0ZXJpYVt1bml0XTtcbiAgICAgICAgY29uc3QgbGltaXRDb3VudCA9IHZhbHVlO1xuICAgICAgICBjb25zdCBleGNlc3MgPSAhIWxpbWl0LmV4Y2VzcztcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoIWNyaXRlcmlhKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSB7XG4gICAgICAgICAgICAgICAgY291bnQgKz0gKE51bWJlcihpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSAvIGNyaXRlcmlhLmNvZWZmKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgYWNjZXNzIHByb3BlcnR5OiAke3Byb3B9YCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsaW1pdENvdW50IDwgY291bnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXhjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGl0ZW1zID0gcmVzZXQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICBpdGVtcyxcbiAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0sIEtleXM8VEl0ZW0+PjtcblxuICAgIGlmICgwIDwgc3VtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBzdW1LZXlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgKz0gTnVtYmVyKGl0ZW1ba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCDjgZnjgafjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgabjgYTjgovlr77osaHjgavlr77jgZfjgaYgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIHF1ZXJ5IOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tQ2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgY2FjaGVkOiBUSXRlbVtdLFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgZmlsdGVyLFxuICAgICAgICBjb21wYXJhdG9ycyxcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgICAgICBub1NlYXJjaCxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIC8vIOWvvuixoeOBquOBl1xuICAgIGlmICghY2FjaGVkLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IDAsXG4gICAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuICAgIH1cblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBq+WvvuOBl+OBpuODleOCo+ODq+OCv+ODquODs+OCsCwg44K944O844OI44KS5a6f6KGMXG4gICAgY29uc3QgdGFyZ2V0cyA9IG5vU2VhcmNoID8gY2FjaGVkLnNsaWNlKCkgOiBzZWFyY2hJdGVtcyhjYWNoZWQsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuICAgIGxldCBpbmRleDogbnVtYmVyID0gYmFzZUluZGV4ID8/IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHsgbGltaXQgfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgeyBpbmRleCB9KTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSB0YXJnZXRzLnNsaWNlKGluZGV4LCAobnVsbCAhPSBsaW1pdCkgPyBpbmRleCArIGxpbWl0IDogdW5kZWZpbmVkKTtcblxuICAgICAgICByZXN1bHRzLnB1c2goLi4uaXRlbXMpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi5vcHRzIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+LFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldHMubGVuZ3RoIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCDjg6zjgrnjg53jg7Pjgrnjga7jgq3jg6Pjg4Pjgrfjg6XjgpLoqabooYwgKi9cbmZ1bmN0aW9uIHRyeUNhY2hlPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcmVzdWx0OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPixcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT5cbik6IHZvaWQge1xuICAgIGNvbnN0IHsgbm9DYWNoZSwgbm9TZWFyY2ggfSA9IG9wdGlvbnM7XG4gICAgY29uc3QgY2FuQ2FjaGUgPSAhbm9DYWNoZSAmJiAhbm9TZWFyY2ggJiYgcmVzdWx0LnRvdGFsICYmIHJlc3VsdC50b3RhbCA9PT0gcmVzdWx0Lml0ZW1zLmxlbmd0aDtcbiAgICBpZiAoY2FuQ2FjaGUpIHtcbiAgICAgICAgcXVlcnlJbmZvLmNhY2hlID0geyAuLi5yZXN1bHQgfTtcbiAgICAgICAgZGVsZXRlIHF1ZXJ5SW5mby5jYWNoZS5vcHRpb25zO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBgcHJvdmlkZXJgIOmWouaVsOOCkuS9v+eUqOOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggYHF1ZXJ5YCDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbVByb3ZpZGVyPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuXG4gICAgY29uc3QgcmVjZWl2ZWRBbGwgPSAocmVzcDogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4pOiBib29sZWFuID0+IHtcbiAgICAgICAgY29uc3QgaGFzQ29uZCA9ICEhcmVzcC5vcHRpb25zPy5jb25kaXRpb247XG4gICAgICAgIHJldHVybiBoYXNDb25kIHx8IHJlc3AudG90YWwgPT09IHJlc3AuaXRlbXMubGVuZ3RoO1xuICAgIH07XG5cbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IGJhc2VJbmRleCA/PyAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7bGltaXR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBsZXQgcmVzcCA9IGF3YWl0IHByb3ZpZGVyKG9wdHMpO1xuICAgICAgICBjb25zdCBuZXh0T3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdHMsIHJlc3Aub3B0aW9ucyk7XG5cbiAgICAgICAgaWYgKHJlY2VpdmVkQWxsKHJlc3ApKSB7XG4gICAgICAgICAgICB0cnlDYWNoZShxdWVyeUluZm8sIHJlc3AsIG5leHRPcHRzKTtcblxuICAgICAgICAgICAgY29uc3QgeyBub1NlYXJjaCwgY29uZGl0aW9uOiBzZWVkIH0gPSBuZXh0T3B0cztcbiAgICAgICAgICAgIGlmIChzZWVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGl0aW9uID0gbmV3IER5bmFtaWNDb25kaXRpb24oc2VlZCk7XG4gICAgICAgICAgICAgICAgcmVzcCA9IGNvbmRpdGlvbmFsRml4KHNlYXJjaEl0ZW1zKFxuICAgICAgICAgICAgICAgICAgICByZXNwLml0ZW1zLFxuICAgICAgICAgICAgICAgICAgICBjb25kaXRpb24uZmlsdGVyLFxuICAgICAgICAgICAgICAgICAgICAuLi5jb25kaXRpb24uY29tcGFyYXRvcnNcbiAgICAgICAgICAgICAgICApLCBjb25kaXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mby5jYWNoZSwgcmVzcCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBxdWVyeUZyb21DYWNoZShyZXNwLml0ZW1zLCBPYmplY3QuYXNzaWduKG9wdHMsIHsgbm9TZWFyY2ggfSkpO1xuICAgICAgICB9Ly8gZXNsaW50LWRpc2FibGUtbGluZSBAc3R5bGlzdGljOmpzL2JyYWNlLXN0eWxlXG5cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goLi4ucmVzcC5pdGVtcyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgICAgICB0b3RhbDogcmVzcC50b3RhbCxcbiAgICAgICAgICAgICAgICBpdGVtczogcmVzcC5pdGVtcyxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBuZXh0T3B0cyxcbiAgICAgICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcC50b3RhbCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IHJlc3AuaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeUNhY2hlKHF1ZXJ5SW5mbywgcmV0dmFsLCBuZXh0T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavlpInmj5sgKi9cbmZ1bmN0aW9uIGVuc3VyZU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHwgdW5kZWZpbmVkXG4pOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgc29ydEtleXM6IFtdIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgbm9TZWFyY2gsIHNvcnRLZXlzIH0gPSBvcHRzO1xuXG4gICAgaWYgKCFub1NlYXJjaCAmJiAoIW9wdHMuY29tcGFyYXRvcnMgfHwgb3B0cy5jb21wYXJhdG9ycy5sZW5ndGggPD0gMCkpIHtcbiAgICAgICAgb3B0cy5jb21wYXJhdG9ycyA9IGNvbnZlcnRTb3J0S2V5cyhzb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHMgYXMgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+O1xufVxuXG4vKipcbiAqIEBlbiBMb3cgbGV2ZWwgZnVuY3Rpb24gZm9yIHtAbGluayBDb2xsZWN0aW9ufSBxdWVyeSBpdGVtcy5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0gSXRlbSDjgpLjgq/jgqjjg6rjgZnjgovkvY7jg6zjg5njg6vplqLmlbBcbiAqXG4gKiBAcGFyYW0gcXVlcnlJbmZvXG4gKiAgLSBgZW5gIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOOCr+OCqOODquaDheWgsVxuICogQHBhcmFtIHByb3ZpZGVyXG4gKiAgLSBgZW5gIHByb3ZpZGVyIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOODl+ODreODkOOCpOODgOmWouaVsFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5SXRlbXM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxUSXRlbVtdPiB7XG4gICAgY29uc3Qgb3B0cyA9IGVuc3VyZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gb3B0cztcblxuICAgIC8vIHF1ZXJ5IOOBq+S9v+eUqOOBl+OBnyBzb3J0LCBmaWx0ZXIg5oOF5aCx44KS44Kt44Oj44OD44K344OlXG4gICAgT2JqZWN0LmFzc2lnbihxdWVyeUluZm8sIHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSk7XG5cbiAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgcXVlcnlGcm9tQ2FjaGUocXVlcnlJbmZvLmNhY2hlLml0ZW1zLCBvcHRzKSkuaXRlbXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChhd2FpdCBxdWVyeUZyb21Qcm92aWRlcihxdWVyeUluZm8sIHByb3ZpZGVyLCBvcHRzKSkuaXRlbXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBBY2Nlc3NpYmxlLFxuICAgIENvbnN0cnVjdG9yLFxuICAgIENsYXNzLFxuICAgIEtleXMsXG4gICAgaXNOdWxsaXNoLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIGx1aWQsXG4gICAgYXQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFNpbGVuY2VhYmxlLFxuICAgIFN1YnNjcmliYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFNvdXJjZSxcbiAgICBFdmVudFB1Ymxpc2hlcixcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWwsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgaXNNb2RlbCxcbn0gZnJvbSAnQGNkcC9tb2RlbCc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uU29ydE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvblNlZWQsXG4gICAgQ29sbGVjdGlvbkV2ZW50LFxuICAgIENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZGRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25TZXRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZVNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHNlYXJjaEl0ZW1zLCBxdWVyeUl0ZW1zIH0gZnJvbSAnLi9xdWVyeSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgICAgICAgICAgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZS1pdGVyYWJsZS1pdGVyYXRvcicpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJlcGFyZU1vZGVsICAgICAgICAgICA9IFN5bWJvbCgncHJlcGFyZS1tb2RlbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVtb3ZlTW9kZWxzICAgICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLW1vZGVscycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkUmVmZXJlbmNlICAgICAgICAgICA9IFN5bWJvbCgnYWRkLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVtb3ZlUmVmZXJlbmNlICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb25Nb2RlbEV2ZW50ICAgICAgICAgICA9IFN5bWJvbCgnbW9kZWwtZXZlbnQtaGFuZGxlcicpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+IHtcbiAgICByZWFkb25seSBjb25zdHJ1Y3RPcHRpb25zOiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxULCBLPjtcbiAgICByZWFkb25seSBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxULCBLPjtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBxdWVyeU9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFQsIEs+O1xuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxULCBLPjtcbiAgICByZWFkb25seSBtb2RlbE9wdGlvbnM6IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucztcbiAgICByZWFkb25seSBieUlkOiBNYXA8c3RyaW5nLCBUPjtcbiAgICBzdG9yZTogVFtdO1xuICAgIGFmdGVyRmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVzZXQgbW9kZWwgY29udGV4dCAqL1xuY29uc3QgcmVzZXRNb2RlbFN0b3JlID0gPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+Pihjb250ZXh0OiBQcm9wZXJ0eTxULCBLPik6IHZvaWQgPT4ge1xuICAgIGNvbnRleHQuYnlJZC5jbGVhcigpO1xuICAgIGNvbnRleHQuc3RvcmUubGVuZ3RoID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVuc3VyZVNvcnRPcHRpb25zID0gPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PihvcHRpb25zOiBDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4pOiBSZXF1aXJlZDxDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4+ID0+IHtcbiAgICBjb25zdCB7IHNvcnRLZXlzOiBrZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IG9wdGlvbnM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc29ydEtleXM6IGtleXMgPz8gW10sXG4gICAgICAgIGNvbXBhcmF0b3JzOiBjb21wcyA/PyBjb252ZXJ0U29ydEtleXMoa2V5cyA/PyBbXSksXG4gICAgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsSWRBdHRyaWJ1dGUgPSA8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiAoY3RvciBhcyBhbnkpPy5pZEF0dHJpYnV0ZSB8fCAnaWQnO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0TW9kZWxJZCA9IDxUIGV4dGVuZHMgb2JqZWN0PihhdHRyczogQWNjZXNzaWJsZTxULCBzdHJpbmc+LCBjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGF0dHJzW21vZGVsSWRBdHRyaWJ1dGUoY3RvcildO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0Q2hhbmdlZElkcyA9IDxUIGV4dGVuZHMgb2JqZWN0PihvYmo6IG9iamVjdCwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiB7IGlkOiBzdHJpbmc7IHByZXZJZD86IHN0cmluZzsgfSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgdHlwZSBNb2RlbExpa2UgPSBBY2Nlc3NpYmxlPHsgcHJldmlvdXM6IChrZXk6IHN0cmluZykgPT4gc3RyaW5nOyB9PjtcbiAgICBjb25zdCBtb2RlbCA9IG9iaiBhcyBNb2RlbExpa2U7XG5cbiAgICBjb25zdCBpZEF0dHJpYnV0ZSA9IG1vZGVsSWRBdHRyaWJ1dGUoY3Rvcik7XG4gICAgY29uc3QgaWQgPSBtb2RlbFtpZEF0dHJpYnV0ZV07XG4gICAgaWYgKCFpc1N0cmluZyhpZCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4geyBpZDogbW9kZWxbaWRBdHRyaWJ1dGVdIGFzIHN0cmluZywgcHJldklkOiBpc0Z1bmN0aW9uKG1vZGVsLnByZXZpb3VzKSA/IG1vZGVsLnByZXZpb3VzKGlkQXR0cmlidXRlKSA6IHVuZGVmaW5lZCB9O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbW9kZWxDb25zdHJ1Y3RvciA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IENsYXNzIHwgdW5kZWZpbmVkID0+IHtcbiAgICByZXR1cm4gKHNlbGYuY29uc3RydWN0b3IgYXMgYW55KS5tb2RlbDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGlzQ29sbGVjdGlvbk1vZGVsID0gPFQgZXh0ZW5kcyBvYmplY3QsIEUgZXh0ZW5kcyBDb2xsZWN0aW9uRXZlbnQ8VD4sIEsgZXh0ZW5kcyBLZXlzPFQ+Pih4OiB1bmtub3duLCBzZWxmOiBDb2xsZWN0aW9uPFQsIEUsIEs+KTogeCBpcyBUID0+IHtcbiAgICBjb25zdCBjdG9yID0gbW9kZWxDb25zdHJ1Y3RvcihzZWxmKTtcbiAgICByZXR1cm4gaXNGdW5jdGlvbihjdG9yKSA/IHggaW5zdGFuY2VvZiBjdG9yIDogZmFsc2U7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzcGxpY2VBcnJheSA9IDxUPih0YXJnZXQ6IFRbXSwgaW5zZXJ0OiBUW10sIGF0OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICBhdCA9IE1hdGgubWluKE1hdGgubWF4KGF0LCAwKSwgdGFyZ2V0Lmxlbmd0aCk7XG4gICAgdGFyZ2V0LnNwbGljZShhdCwgMCwgLi4uaW5zZXJ0KTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHBhcnNlRmlsdGVyQXJnczxUIGV4dGVuZHMgb2JqZWN0PiguLi5hcmdzOiB1bmtub3duW10pOiBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+IHtcbiAgICBjb25zdCBbZmlsdGVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgaWYgKG51bGwgPT0gZmlsdGVyKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9IGVsc2UgaWYgKCFpc0Z1bmN0aW9uKGZpbHRlcikpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlciBhcyBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IGZpbHRlciB9KSBhcyBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+O1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfc2V0T3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IHRydWUsIG1lcmdlOiB0cnVlIH07XG4vKiogQGludGVybmFsICovIGNvbnN0IF9hZGRPcHRpb25zID0geyBhZGQ6IHRydWUsIHJlbW92ZTogZmFsc2UgfTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3IgY29sbGVjdGlvbiB0aGF0IGlzIG9yZGVyZWQgc2V0cyBvZiBtb2RlbHMuXG4gKiBAamEgTW9kZWwg44Gu6ZuG5ZCI44KS5omx44GGIENvbGxlY3Rpb24g44Gu5Z+65bqV44Kv44Op44K55a6a576pLlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgICBNb2RlbCxcbiAqICAgICBNb2RlbENvbnN0cnVjdG9yLFxuICogICAgIENvbGxlY3Rpb24sXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAqICAgICBDb2xsZWN0aW9uU2VlZCxcbiAqIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiAvLyBNb2RlbCBzY2hlbWFcbiAqIGludGVyZmFjZSBUcmFja0F0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICB0aXRsZTogc3RyaW5nO1xuICogICBhcnRpc3Q6IHN0cmluZztcbiAqICAgYWxidW06ICBzdHJpbmc7XG4gKiAgIHJlbGVhc2VEYXRlOiBEYXRlO1xuICogICA6XG4gKiB9XG4gKlxuICogLy8gTW9kZWwgZGVmaW5pdGlvblxuICogY29uc3QgVHJhY2tCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxUcmFja0F0dHJpYnV0ZT4sIFRyYWNrQXR0cmlidXRlPjtcbiAqIGNsYXNzIFRyYWNrIGV4dGVuZHMgVHJhY2tCYXNlIHtcbiAqICAgICBzdGF0aWMgaWRBdHRyaWJ1dGUgPSAndXJpJztcbiAqIH1cbiAqXG4gKiAvLyBDb2xsZWN0aW9uIGRlZmluaXRpb25cbiAqIGNsYXNzIFBsYXlsaXN0IGV4dGVuZHMgQ29sbGVjdGlvbjxUcmFjaz4ge1xuICogICAgIC8vIHNldCB0YXJnZXQgTW9kZWwgY29uc3RydWN0b3JcbiAqICAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWwgPSBUcmFjaztcbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gdXNlIGN1c3RvbSBjb250ZW50IHByb3ZpZGVyIGZvciBmZXRjaC5cbiAqICAgICBwcm90ZWN0ZWQgYXN5bmMgc3luYyhcbiAqICAgICAgICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRyYWNrPlxuICogICAgICk6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+PiB7XG4gKiAgICAgICAgIC8vIHNvbWUgc3BlY2lmaWMgaW1wbGVtZW50YXRpb24gaGVyZS5cbiAqICAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBjdXN0b21Qcm92aWRlcihvcHRpb25zKTtcbiAqICAgICAgICAgcmV0dXJuIHtcbiAqICAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gKiAgICAgICAgICAgICBpdGVtcyxcbiAqICAgICAgICAgICAgIG9wdGlvbnMsXG4gKiAgICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+O1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gY29udmVydCBhIHJlc3BvbnNlIGludG8gYSBsaXN0IG9mIG1vZGVscy5cbiAqICAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IENvbGxlY3Rpb25TZWVkW10pOiBUcmFja0F0dHJpYnV0ZVtdIHtcbiAqICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLm1hcChzZWVkID0+IHtcbiAqICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBzZWVkLnJlbGVhc2VEYXRlO1xuICogICAgICAgICAgICAgc2VlZC5yZWxlYXNlRGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICogICAgICAgICAgICAgcmV0dXJuIHNlZWQ7XG4gKiAgICAgICAgIH0pIGFzIFRyYWNrQXR0cmlidXRlW107XG4gKiAgICAgIH1cbiAqIH1cbiAqXG4gKiBsZXQgc2VlZHM6IFRyYWNrQXR0cmlidXRlW107XG4gKlxuICogY29uc3QgcGxheWxpc3QgPSBuZXcgUGxheWxpc3Qoc2VlZHMsIHtcbiAqICAgICAvLyBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnNcbiAqICAgICBxdWVyeU9wdGlvbnM6IHtcbiAqICAgICAgICAgc29ydEtleXM6IFtcbiAqICAgICAgICAgICAgIHsgbmFtZTogJ3RpdGxlJywgb3JkZXI6IFNvcnRPcmRlci5ERVNDLCB0eXBlOiAnc3RyaW5nJyB9LFxuICogICAgICAgICBdLFxuICogICAgIH1cbiAqIH0pO1xuICpcbiAqIGF3YWl0IHBsYXlsaXN0LnJlcXVlcnkoKTtcbiAqXG4gKiBmb3IgKGNvbnN0IHRyYWNrIG9mIHBsYXlsaXN0KSB7XG4gKiAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodHJhY2sudG9KU09OKCkpKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29sbGVjdGlvbjxcbiAgICBUTW9kZWwgZXh0ZW5kcyBvYmplY3QgPSBhbnksXG4gICAgVEV2ZW50IGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4gPSBDb2xsZWN0aW9uRXZlbnQ8VE1vZGVsPixcbiAgICBUS2V5IGV4dGVuZHMgS2V5czxUTW9kZWw+ID0gS2V5czxUTW9kZWw+XG4+IGV4dGVuZHMgRXZlbnRTb3VyY2U8VEV2ZW50PiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFRNb2RlbD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE1vZGVsIGNvbnN0cnVjdG9yLiA8YnI+XG4gICAgICogICAgIFRoZSBjb25zdHJ1Y3RvciBpcyB1c2VkIGludGVybmFsbHkgYnkgdGhpcyB7QGxpbmsgQ29sbGVjdGlvbn0gY2xhc3MgZm9yIGBUTW9kZWxgIGNvbnN0cnVjdGlvbi5cbiAgICAgKiBAamEgTW9kZWwg44Kz44Oz44K544OI44Op44Kv44K/IDxicj5cbiAgICAgKiAgICAge0BsaW5rIENvbGxlY3Rpb259IOOCr+ODqeOCueOBjCBgVE1vZGVsYCDjgpLmp4vnr4njgZnjgovjgZ/jgoHjgavkvb/nlKjjgZnjgotcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWw/OiBDbGFzcztcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjb25zdHJ1Y3Rpb24vZGVzdHJ1Y3Rpb246XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzPzogVE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsLCBUS2V5Pikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG1vZGVsT3B0aW9uczoge30sIHF1ZXJ5T3B0aW9uczoge30gfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMsIHF1ZXJ5T3B0aW9ucyB9ID0gb3B0cztcblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdE9wdGlvbnM6IG9wdHMsXG4gICAgICAgICAgICBwcm92aWRlcjogb3B0cy5wcm92aWRlciA/PyB0aGlzLnN5bmMuYmluZCh0aGlzKSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnY29sbGVjdGlvbjonLCA4KSxcbiAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucyxcbiAgICAgICAgICAgIHF1ZXJ5SW5mbzoge30sXG4gICAgICAgICAgICBtb2RlbE9wdGlvbnMsXG4gICAgICAgICAgICBieUlkOiBuZXcgTWFwPHN0cmluZywgVE1vZGVsPigpLFxuICAgICAgICAgICAgc3RvcmU6IFtdLFxuICAgICAgICB9IGFzIHVua25vd24gYXMgUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcblxuICAgICAgICB0aGlzLmluaXRRdWVyeUluZm8oKTtcblxuICAgICAgICAvKiBtb2RlbCBldmVudCBoYW5kbGVyICovXG4gICAgICAgICh0aGlzIGFzIGFueSlbX29uTW9kZWxFdmVudF0gPSAoZXZlbnQ6IHN0cmluZywgbW9kZWw6IFRNb2RlbCB8IHVuZGVmaW5lZCwgY29sbGVjdGlvbjogdGhpcywgb3B0aW9uczogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhldmVudCkgJiYgZXZlbnQuc3RhcnRzV2l0aCgnQCcpICYmIG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgaWYgKCgnQGFkZCcgPT09IGV2ZW50IHx8ICdAcmVtb3ZlJyA9PT0gZXZlbnQpICYmIGNvbGxlY3Rpb24gIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJ0BkZXN0cm95JyA9PT0gZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW9kZWwgZXZlbnQgYXJndW1lbnRzIGFkanVzdG1lbnQuXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSAoY29sbGVjdGlvbiBhcyBhbnkpO1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gdGhpczsgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZShtb2RlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChldmVudC5zdGFydHNXaXRoKCdAY2hhbmdlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW9kZWwgZXZlbnQgYXJndW1lbnRzIGFkanVzdG1lbnQuXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IHRoaXM7ICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCdAY2hhbmdlJyA9PT0gZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkcyA9IGdldENoYW5nZWRJZHMobW9kZWwsIG1vZGVsQ29uc3RydWN0b3IodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaWQsIHByZXZJZCB9ID0gaWRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2SWQgIT09IGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuc2V0KGlkLCBtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHByZXZJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnlJZC5kZWxldGUocHJldklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBkZWxlZ2F0ZSBldmVudFxuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlci5jYWxsKHRoaXMsIGV2ZW50LCBtb2RlbCwgY29sbGVjdGlvbiwgb3B0aW9ucyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdXNlbGVzcy1jYWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHNlZWRzKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0KHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBqYSBJbml0aWFsaXplIHF1ZXJ5IGluZm9cbiAgICAgKiBAamEg44Kv44Ko44Oq5oOF5aCx44Gu5Yid5pyf5YyWXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGluaXRRdWVyeUluZm8oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzIH0gPSBlbnN1cmVTb3J0T3B0aW9ucyh0aGlzLl9kZWZhdWx0UXVlcnlPcHRpb25zKTtcbiAgICAgICAgdGhpcy5fcXVlcnlJbmZvID0geyBzb3J0S2V5cywgY29tcGFyYXRvcnMgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZWQgYWxsIGluc3RhbmNlcyBhbmQgZXZlbnQgbGlzdGVuZXIgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOCkuegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgKHJlc2VydmVkKS5cbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODsyAo5LqI57SEKVxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IHRoaXMgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uc3RvcmUgPSBbXTtcbiAgICAgICAgdGhpcy5pbml0UXVlcnlJbmZvKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAamEgQ2xlYXIgY2FjaGUgaW5zdGFuY2UgbWV0aG9kXG4gICAgICogQGphIOOCreODo+ODg+OCt+ODpeOBruegtOajhFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBkZWxldGUgdGhpcy5fcXVlcnlJbmZvLmNhY2hlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODiCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG1vZGVscy5cbiAgICAgKiBAamEgTW9kZWwg44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IG1vZGVscygpOiByZWFkb25seSBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IHsgX3F1ZXJ5RmlsdGVyLCBfYWZ0ZXJGaWx0ZXIgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKF9hZnRlckZpbHRlciAmJiBfYWZ0ZXJGaWx0ZXIgIT09IF9xdWVyeUZpbHRlcikgPyBzdG9yZS5maWx0ZXIoX2FmdGVyRmlsdGVyKSA6IHN0b3JlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBudW1iZXIgb2YgbW9kZWxzLlxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgTW9kZWwg5pWwXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5tb2RlbHMubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBhcHBsaWVkIGFmdGVyLWZpbHRlci5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44GM6YGp55So44GV44KM44Gm44GE44KL44GL44KS5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcmVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIENvbGxlY3Rpb25RdWVyeUluZm99IGluc3RhbmNlXG4gICAgICogQGphIHtAbGluayBDb2xsZWN0aW9uUXVlcnlJbmZvfSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9xdWVyeUluZm8oKTogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIENvbGxlY3Rpb25RdWVyeUluZm99IGluc3RhbmNlXG4gICAgICogQGphIHtAbGluayBDb2xsZWN0aW9uUXVlcnlJbmZvfSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc2V0IF9xdWVyeUluZm8odmFsOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvID0gdmFsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3JlYXRpbmcgb3B0aW9ucy5cbiAgICAgKiBAamEg5qeL56+J5pmC44Gu44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfb3B0aW9ucygpOiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnN0cnVjdE9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHByb3ZpZGVyLlxuICAgICAqIEBqYSDml6Llrprjga7jg5fjg63jg5DjgqTjg4DjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9wcm92aWRlcigpOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJvdmlkZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHBhcnNlIGJlaGF2aW91ci5cbiAgICAgKiBAamEg5pei5a6a44GuIHBhcnNlIOWLleS9nOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRQYXJzZSgpOiBib29sZWFuIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnMucGFyc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOaXouWumuOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeU9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOacgOW+jOOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2xhc3RRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbztcbiAgICAgICAgY29uc3Qgb3B0czogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiA9IHt9O1xuXG4gICAgICAgIHNvcnRLZXlzLmxlbmd0aCAmJiAob3B0cy5zb3J0S2V5cyA9IHNvcnRLZXlzKTtcbiAgICAgICAgY29tcGFyYXRvcnMubGVuZ3RoICYmIChvcHRzLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnMpO1xuICAgICAgICBmaWx0ZXIgJiYgKG9wdHMuZmlsdGVyID0gZmlsdGVyKTtcblxuICAgICAgICByZXR1cm4gb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHNvcnQgY29tcGFyYXRvcnMuXG4gICAgICogQGphIOOCveODvOODiOeUqOavlOi8g+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUTW9kZWw+W10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmNvbXBhcmF0b3JzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcXVlcnktZmlsdGVyLlxuICAgICAqIEBqYSDjgq/jgqjjg6rnlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9xdWVyeUZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5maWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2FmdGVyRmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdXRpbHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYSBtb2RlbCBmcm9tIGEgY29sbGVjdGlvbiwgc3BlY2lmaWVkIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJIE1vZGVsIOOCkueJueWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoc2VlZDogc3RyaW5nIHwgb2JqZWN0IHwgdW5kZWZpbmVkKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gc2VlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGlmIChpc1N0cmluZyhzZWVkKSAmJiBieUlkLmhhcyhzZWVkKSkge1xuICAgICAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaWQgPSBnZXRNb2RlbElkKGlzTW9kZWwoc2VlZCkgPyBzZWVkLnRvSlNPTigpIDogc2VlZCBhcyBvYmplY3QsIG1vZGVsQ29uc3RydWN0b3IodGhpcykpO1xuICAgICAgICBjb25zdCBjaWQgPSAoc2VlZCBhcyBvYmplY3QgYXMgeyBfY2lkPzogc3RyaW5nOyB9KS5fY2lkO1xuXG4gICAgICAgIHJldHVybiBieUlkLmdldChpZCkgPz8gKGNpZCAmJiBieUlkLmdldChjaWQpKSBhcyBUTW9kZWwgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYHRydWVgIGlmIHRoZSBtb2RlbCBpcyBpbiB0aGUgY29sbGVjdGlvbiBieSBhbiBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2UuXG4gICAgICogQGphIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCueOBi+OCiSBNb2RlbCDjgpLmiYDmnInjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgICBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzKHNlZWQ6IHN0cmluZyB8IG9iamVjdCB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLmdldChzZWVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSBNb2RlbCDlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IG9iamVjdFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWxzLm1hcChtID0+IGlzTW9kZWwobSkgPyBtLnRvSlNPTigpIDogbSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVzIENsb25lIHRoaXMgaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOBruikh+ijveOCkui/lOWNtFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IGNvbnN0cnVjdG9yLCBfb3B0aW9ucyB9ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyAoY29uc3RydWN0b3IgYXMgQ29uc3RydWN0b3I8dGhpcz4pKHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLCBfb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIGEgY29sbGVjdGlvbiB0byByZS1zb3J0IGl0c2VsZi5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDopoHntKDjga7lho3jgr3jg7zjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzb3J0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjgr3jg7zjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc29ydChvcHRpb25zPzogQ29sbGVjdGlvblJlU29ydE9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRzID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3QgeyBub1Rocm93LCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gZW5zdXJlU29ydE9wdGlvbnMob3B0cyk7XG4gICAgICAgIGNvbnN0IGNvbXBhcmF0b3JzID0gMCA8IGNvbXBzLmxlbmd0aCA/IGNvbXBzIDogdGhpcy5fY29tcGFyYXRvcnM7XG5cbiAgICAgICAgaWYgKGNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpZiAobm9UaHJvdykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUywgJ0Nhbm5vdCBzb3J0IGEgc2V0IHdpdGhvdXQgYSBjb21wYXJhdG9yLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uc3RvcmUgPSBzZWFyY2hJdGVtcyh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgdGhpcy5fYWZ0ZXJGaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgICAgICAvLyB1cGRhdGUgcXVlcnlJbmZvXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzO1xuICAgICAgICBpZiAoMCA8IHNvcnRLZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLnNvcnRLZXlzID0gc29ydEtleXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGx5IGFmdGVyLWZpbHRlciB0byBjb2xsZWN0aW9uIGl0c2VsZi5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGZpbHRlciBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcihjYWxsYmFjazogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IFNpbGVuY2VhYmxlKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBseSBhZnRlci1maWx0ZXIgdG8gY29sbGVjdGlvbiBpdHNlbGYuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFmdGVyLWZpbHRlciBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg57We44KK6L6844G/44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcihvcHRpb25zOiBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFRNb2RlbD4pOiB0aGlzO1xuXG4gICAgcHVibGljIGZpbHRlciguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHBhcnNlRmlsdGVyQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3QgeyBmaWx0ZXIsIHNpbGVudCB9ID0gb3B0cztcbiAgICAgICAgaWYgKGZpbHRlciAhPT0gdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyID0gZmlsdGVyO1xuICAgICAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZmlsdGVyJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguIElmIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuLCB0aGUgdGFyZ2V0IHdpbGwgYmUgZm91bmQgZnJvbSB0aGUgbGFzdCBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44Gr44KI44KLIE1vZGVsIOOBuOOBruOCouOCr+OCu+OCuS4g6LKg5YCk44Gu5aC05ZCI44Gv5pyr5bC+5qSc57Si44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogVE1vZGVsIHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMubW9kZWxzIGFzIFRNb2RlbFtdLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgbW9kZWwuXG4gICAgICogQGphIE1vZGVsIOOBruacgOWIneOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdCgpOiBUTW9kZWwgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiBgY291bnRgIGVsZW1lbnRzIG9mIHRoZSBtb2RlbCBmcm9tIHRoZSBmaXJzdC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5YWI6aCt44GL44KJYGNvdW50YCDliIbjga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoY291bnQ6IG51bWJlcik6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIGZpcnN0KGNvdW50PzogbnVtYmVyKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5tb2RlbHM7XG4gICAgICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0c1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzLnNsaWNlKDAsIGNvdW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiB0aGUgbW9kZWwuXG4gICAgICogQGphIE1vZGVsIOOBruacgOWIneOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KCk6IFRNb2RlbCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIGBjb3VudGAgZWxlbWVudHMgb2YgdGhlIG1vZGVsIGZyb20gdGhlIGxhc3QuXG4gICAgICogQGphIE1vZGVsIOOBruWFiOmgreOBi+OCiWBjb3VudGAg5YiG44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoY291bnQ6IG51bWJlcik6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIGxhc3QoY291bnQ/OiBudW1iZXIpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLm1vZGVscztcbiAgICAgICAgaWYgKG51bGwgPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzW3RhcmdldHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0cy5zbGljZSgtMSAqIGNvdW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gdGhlIGhhc2ggb2YgYXR0cmlidXRlcyB0byBiZSBgc2V0YCBvbiB0aGUgY29sbGVjdGlvbi4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIHRoZSByZXNwb25zZSBhbG9uZy5cbiAgICAgKiBAamEg44Os44K544Od44Oz44K544Gu5aSJ5o+b44Oh44K944OD44OJLiDml6Llrprjgafjga/kvZXjgoLjgZfjgarjgYRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBwYXJzZShyZXNwb25zZTogQ29sbGVjdGlvblNlZWQgfCBDb2xsZWN0aW9uU2VlZFtdIHwgdm9pZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdIHwgdW5kZWZpbmVkIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFRNb2RlbFtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUge0BsaW5rIENvbGxlY3Rpb24uZmV0Y2h9IG1ldGhvZCBwcm94eSB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCB7QGxpbmsgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcn0gcmV0dXJucyBvbmUtc2hvdCByZXN1bHQuXG4gICAgICogQGphIHtAbGluayBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyfSDkupLmj5vjga7ljZjnmbrjga4ge0BsaW5rIENvbGxlY3Rpb24uZmV0Y2h9IOe1kOaenOOCkui/lOWNtC4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMob3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGRlZmF1bHRTeW5jKCkuc3luYygncmVhZCcsIHRoaXMgYXMgU3luY0NvbnRleHQsIG9wdGlvbnMpIGFzIFRNb2RlbFtdO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSB7QGxpbmsgTW9kZWx9IGZyb20gdGhlIHNlcnZlciwgbWVyZ2luZyB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgbW9kZWwncyBsb2NhbCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSB7QGxpbmsgTW9kZWx9IOWxnuaAp+OBruOCteODvOODkOODvOWQjOacny4g44Os44K544Od44Oz44K544Gu44Oe44O844K444KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZmV0Y2ggb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODleOCp+ODg+ODgeOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBmZXRjaChvcHRpb25zPzogQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogUHJvbWlzZTxvYmplY3RbXT4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHByb2dyZXNzOiBub29wIH0sIHRoaXMuX2RlZmF1bHRRdWVyeU9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHByb2dyZXNzOiBvcmlnaW5hbCwgbGltaXQsIHJlc2V0LCBub0NhY2hlIH0gPSBvcHRzO1xuICAgICAgICAgICAgY29uc3QgeyBfcXVlcnlJbmZvLCBfcHJvdmlkZXIgfSA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBmaW5hbGl6ZSA9IChudWxsID09IGxpbWl0KTtcblxuICAgICAgICAgICAgb3B0cy5wcm9ncmVzcyA9IChpbmZvOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRNb2RlbD4pID0+IHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbChpbmZvKTtcbiAgICAgICAgICAgICAgICAhZmluYWxpemUgJiYgdGhpcy5hZGQoaW5mby5pdGVtcywgb3B0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAobm9DYWNoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJDYWNoZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZpbmFsaXplICYmIHJlc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldCh1bmRlZmluZWQsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgcXVlcnlJdGVtcyhfcXVlcnlJbmZvLCBfcHJvdmlkZXIsIG9wdHMpO1xuXG4gICAgICAgICAgICBpZiAoZmluYWxpemUpIHtcbiAgICAgICAgICAgICAgICByZXNldCA/IHRoaXMucmVzZXQocmVzcCwgb3B0cykgOiB0aGlzLmFkZChyZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIENvbGxlY3Rpb24sIHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BlcnJvcicsIHVuZGVmaW5lZCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBgZmV0Y2goKWAgd2l0aCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOWJjeWbnuOBqOWQjOadoeS7tuOBpyBgZmV0Y2goKWAg44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVxdWVyeSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlcXVlcnkob3B0aW9ucz86IENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyk6IFByb21pc2U8b2JqZWN0W10+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2xhc3RRdWVyeU9wdGlvbnMsIG9wdGlvbnMsIHsgcmVzZXQ6IHRydWUgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoKG9wdHMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGNvbGxlY3Rpb24gc2V0dXBcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIE51bGxpc2ggdmFsdWUuXG4gICAgICogIC0gYGphYCBOdWxsaXNoIOimgee0oFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZDogdW5kZWZpbmVkLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44GrIE1vZGVsIOOBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GEIE1vZGVsIOOBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZHM6IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgc2V0KHNlZWRzPzogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10gfCB2b2lkIHtcbiAgICAgICAgaWYgKGlzTnVsbGlzaChzZWVkcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcGFyc2U6IHRoaXMuX2RlZmF1bHRQYXJzZSB9LCBfc2V0T3B0aW9ucywgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgaWYgKG9wdHMucGFyc2UgJiYgIWlzQ29sbGVjdGlvbk1vZGVsKHNlZWRzLCB0aGlzKSkge1xuICAgICAgICAgICAgc2VlZHMgPSB0aGlzLnBhcnNlKHNlZWRzLCBvcHRpb25zKSA/PyBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtczogKFRNb2RlbCB8IG9iamVjdCB8IHVuZGVmaW5lZClbXSA9IHNpbmd1bGFyID8gW3NlZWRzXSA6IChzZWVkcyBhcyBvYmplY3RbXSkuc2xpY2UoKTtcblxuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcblxuICAgICAgICBjb25zdCBhdCA9ICgoY2FuZGlkYXRlKTogbnVtYmVyIHwgdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlID4gc3RvcmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSArPSBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoY2FuZGlkYXRlIDwgMCkgPyAwIDogY2FuZGlkYXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KShvcHRzLmF0KTtcblxuICAgICAgICBjb25zdCBzZXQ6IG9iamVjdFtdICAgICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9BZGQ6IFRNb2RlbFtdICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvTWVyZ2U6IFRNb2RlbFtdICA9IFtdO1xuICAgICAgICBjb25zdCB0b1JlbW92ZTogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgY29uc3QgbW9kZWxTZXQgPSBuZXcgU2V0PG9iamVjdD4oKTtcblxuICAgICAgICBjb25zdCB7IGFkZCwgbWVyZ2UsIHJlbW92ZSwgcGFyc2UsIHNpbGVudCB9ID0gb3B0cztcblxuICAgICAgICBsZXQgc29ydCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBzb3J0YWJsZSA9IHRoaXMuX2NvbXBhcmF0b3JzLmxlbmd0aCAmJiBudWxsID09IGF0ICYmIGZhbHNlICE9PSBvcHRzLnNvcnQ7XG5cbiAgICAgICAgaW50ZXJmYWNlIE1vZGVsRmVhdHVyZSB7XG4gICAgICAgICAgICBwYXJzZTogKGF0cnI/OiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IG9iamVjdDtcbiAgICAgICAgICAgIHNldEF0dHJpYnV0ZXM6IChhdHJyOiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IHZvaWQ7XG4gICAgICAgICAgICBoYXNDaGFuZ2VkOiAoKSA9PiBib29sZWFuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHVybiBiYXJlIG9iamVjdHMgaW50byBtb2RlbCByZWZlcmVuY2VzLCBhbmQgcHJldmVudCBpbnZhbGlkIG1vZGVscyBmcm9tIGJlaW5nIGFkZGVkLlxuICAgICAgICBmb3IgKGNvbnN0IFtpLCBpdGVtXSBvZiBpdGVtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vIElmIGEgZHVwbGljYXRlIGlzIGZvdW5kLCBwcmV2ZW50IGl0IGZyb20gYmVpbmcgYWRkZWQgYW5kIG9wdGlvbmFsbHkgbWVyZ2UgaXQgaW50byB0aGUgZXhpc3RpbmcgbW9kZWwuXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZ2V0KGl0ZW0pIGFzIE1vZGVsRmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIGlmIChtZXJnZSAmJiBpdGVtICE9PSBleGlzdGluZykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cnMgPSBpc01vZGVsKGl0ZW0pID8gaXRlbS50b0pTT04oKSA6IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZSAmJiBpc0Z1bmN0aW9uKGV4aXN0aW5nLnBhcnNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMgPSBleGlzdGluZy5wYXJzZShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihleGlzdGluZy5zZXRBdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmcuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0b01lcmdlLnB1c2goZXhpc3RpbmcgYXMgVE1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRhYmxlICYmICFzb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0ID0gaXNGdW5jdGlvbihleGlzdGluZy5oYXNDaGFuZ2VkKSA/IGV4aXN0aW5nLmhhc0NoYW5nZWQoKSA6IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMoZXhpc3RpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXRlbXNbaV0gPSBleGlzdGluZztcbiAgICAgICAgICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAc3R5bGlzdGljOmpzL2JyYWNlLXN0eWxlXG5cbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBuZXcsIHZhbGlkIG1vZGVsLCBwdXNoIGl0IHRvIHRoZSBgdG9BZGRgIGxpc3QuXG4gICAgICAgICAgICBlbHNlIGlmIChhZGQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlbCA9IGl0ZW1zW2ldID0gdGhpc1tfcHJlcGFyZU1vZGVsXShpdGVtLCBvcHRzKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BZGQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX2FkZFJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIHN0YWxlIG1vZGVscy5cbiAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKG1vZGVsKSkge1xuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZS5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfcmVtb3ZlTW9kZWxzXSh0b1JlbW92ZSwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWUgaWYgc29ydGluZyBpcyBuZWVkZWQsIHVwZGF0ZSBgbGVuZ3RoYCBhbmQgc3BsaWNlIGluIG5ldyBtb2RlbHMuXG4gICAgICAgIGxldCBvcmRlckNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgcmVwbGFjZSA9ICFzb3J0YWJsZSAmJiBhZGQgJiYgcmVtb3ZlO1xuICAgICAgICBpZiAoc2V0Lmxlbmd0aCAmJiByZXBsYWNlKSB7XG4gICAgICAgICAgICBvcmRlckNoYW5nZWQgPSAoc3RvcmUubGVuZ3RoICE9PSBzZXQubGVuZ3RoKSB8fCBzdG9yZS5zb21lKChtLCBpbmRleCkgPT4gbSAhPT0gc2V0W2luZGV4XSk7XG4gICAgICAgICAgICBzdG9yZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgc3BsaWNlQXJyYXkoc3RvcmUsIHNldCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAodG9BZGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoc29ydGFibGUpIHtcbiAgICAgICAgICAgICAgICBzb3J0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCB0b0FkZCwgYXQgPz8gc3RvcmUubGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNpbGVudGx5IHNvcnQgdGhlIGNvbGxlY3Rpb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgIGlmIChzb3J0KSB7XG4gICAgICAgICAgICB0aGlzLnNvcnQoeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVbmxlc3Mgc2lsZW5jZWQsIGl0J3MgdGltZSB0byBmaXJlIGFsbCBhcHByb3ByaWF0ZSBhZGQvc29ydC91cGRhdGUgZXZlbnRzLlxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaSwgbW9kZWxdIG9mIHRvQWRkLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBhdCArIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAYWRkJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BhZGQnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc29ydCB8fCBvcmRlckNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc29ydCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9BZGQubGVuZ3RoIHx8IHRvUmVtb3ZlLmxlbmd0aCB8fCB0b01lcmdlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWQ6IHRvQWRkLFxuICAgICAgICAgICAgICAgICAgICByZW1vdmVkOiB0b1JlbW92ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VkOiB0b01lcmdlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRyb3AgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IGl0ZW1zLmZpbHRlcihpID0+IG51bGwgIT0gaSkgYXMgVE1vZGVsW107XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBhZGRlZCAob3IgbWVyZ2VkKSBtb2RlbCAob3IgbW9kZWxzKS5cbiAgICAgICAgcmV0dXJuIHNpbmd1bGFyID8gcmV0dmFsWzBdIDogKHJldHZhbC5sZW5ndGggPyByZXR2YWwgOiB2b2lkIDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGEgY29sbGVjdGlvbiB3aXRoIGEgbmV3IGxpc3Qgb2YgbW9kZWxzIChvciBhdHRyaWJ1dGUgaGFzaGVzKSwgdHJpZ2dlcmluZyBhIHNpbmdsZSBgcmVzZXRgIGV2ZW50IG9uIGNvbXBsZXRpb24uXG4gICAgICogQGphIENvbGxlY3Rpb24g44KS5paw44GX44GEIE1vZGVsIOS4gOimp+OBp+e9ruaPmy4g5a6M5LqG5pmC44GrIGByZXNldGAg44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgrvjg4Pjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoc2VlZHM/OiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zICYgeyBwcmV2aW91czogVE1vZGVsW107IH07XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIHN0b3JlKSB7XG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMucHJldmlvdXMgPSBzdG9yZS5zbGljZSgpO1xuICAgICAgICByZXNldE1vZGVsU3RvcmUodGhpc1tfcHJvcGVydGllc10pO1xuXG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHNlZWRzID8gdGhpcy5hZGQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpIDogW107XG5cbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHJlc2V0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb2RlbHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBtb2RlbCB0byB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjgbjjga4gTW9kZWwg44Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkKHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgdG8gdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqIEBqYSBNb2RlbCDjg6rjgrnjg4jmjIflrprjgavjgojjgosgQ29sbGVjdGlvbiDjgbjjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIGFkZChzZWVkczogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXQoc2VlZHMgYXMgVW5rbm93bk9iamVjdCwgT2JqZWN0LmFzc2lnbih7IG1lcmdlOiBmYWxzZSB9LCBvcHRpb25zLCBfYWRkT3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBzZXQuXG4gICAgICogQGphIENvbGxlY3Rpb24g44GL44KJIE1vZGVsIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbGlzdCBvZiBtb2RlbHMgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSBNb2RlbCDjg6rjgrnjg4jmjIflrprjgavjgojjgosgQ29sbGVjdGlvbiDjgYvjgonjga7liYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVtb3ZlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDliYrpmaTjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWRzOiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3Qgc2luZ3VsYXIgPSAhaXNBcnJheShzZWVkcyk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gc2luZ3VsYXIgPyBbc2VlZHMgYXMgVE1vZGVsXSA6IChzZWVkcyBhcyBUTW9kZWxbXSkuc2xpY2UoKTtcbiAgICAgICAgY29uc3QgcmVtb3ZlZCA9IHRoaXNbX3JlbW92ZU1vZGVsc10oaXRlbXMsIG9wdHMpO1xuICAgICAgICBpZiAoIW9wdHMuc2lsZW50ICYmIHJlbW92ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7IGFkZGVkOiBbXSwgbWVyZ2VkOiBbXSwgcmVtb3ZlZCB9O1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNpbmd1bGFyID8gcmVtb3ZlZFswXSA6IHJlbW92ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIG1vZGVsIHRvIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacq+WwvuOBqyBNb2RlbCDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBwdXNoKHNlZWQ6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNlZWQsIE9iamVjdC5hc3NpZ24oeyBhdDogc3RvcmUubGVuZ3RoIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7jga4gTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBwb3Aob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZShzdG9yZVtzdG9yZS5sZW5ndGggLSAxXSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIG1vZGVsIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOWFiOmgreOBqyBNb2RlbCDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bnNoaWZ0KHNlZWQ6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2VlZCwgT2JqZWN0LmFzc2lnbih7IGF0OiAwIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3jga4gTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzaGlmdChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHN0b3JlWzBdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIGEgbW9kZWwgaW4gdGhpcyBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgTW9kZWwg44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQ44GXLCBDb2xsZWN0aW9uIOOBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJzXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGVzIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWxnuaAp+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBtb2RlbCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjcmVhdGUoYXR0cnM6IG9iamVjdCwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHdhaXQgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzW19wcmVwYXJlTW9kZWxdKGF0dHJzLCBvcHRpb25zIGFzIFNpbGVuY2VhYmxlKTtcbiAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbW9kZWwgPSBpc01vZGVsKHNlZWQpID8gc2VlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCF3YWl0IHx8ICFtb2RlbCkge1xuICAgICAgICAgICAgdGhpcy5hZGQoc2VlZCwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb2RlbC5zYXZlKHVuZGVmaW5lZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGVycm9yJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbW9kZWwgcHJlcGFyYXRpb24gKi9cbiAgICBwcml2YXRlIFtfcHJlcGFyZU1vZGVsXShhdHRyczogb2JqZWN0IHwgVE1vZGVsIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChpc0NvbGxlY3Rpb25Nb2RlbChhdHRycywgdGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRycztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBtb2RlbE9wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBuZXcgY29uc3RydWN0b3IoYXR0cnMsIG9wdHMpIGFzIHsgdmFsaWRhdGU6ICgpID0+IFJlc3VsdDsgfTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKG1vZGVsLnZhbGlkYXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1vZGVsLnZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGludmFsaWQnLCBhdHRycyBhcyBNb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCByZXN1bHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb2RlbCBhcyBUTW9kZWw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwbGFpbiBvYmplY3RcbiAgICAgICAgcmV0dXJuIGF0dHJzIGFzIFRNb2RlbDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCBjYWxsZWQgYnkgYm90aCByZW1vdmUgYW5kIHNldC4gKi9cbiAgICBwcml2YXRlIFtfcmVtb3ZlTW9kZWxzXShtb2RlbHM6IFRNb2RlbFtdLCBvcHRpb25zOiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHJlbW92ZWQ6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgbWRsIG9mIG1vZGVscykge1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSB0aGlzLmdldChtZGwpO1xuICAgICAgICAgICAgaWYgKCFtb2RlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXhPZihtb2RlbCk7XG4gICAgICAgICAgICBzdG9yZS5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVmZXJlbmNlcyBiZWZvcmUgdHJpZ2dlcmluZyAncmVtb3ZlJyBldmVudCB0byBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AuXG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCB0cnVlKTtcblxuICAgICAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQHJlbW92ZScsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZW1vdmVkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIGNyZWF0ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX2FkZFJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoX2NpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsICh0aGlzIGFzIGFueSlbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gc2V2ZXIgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwsIHBhcnRpYWwgPSBmYWxzZSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoX2NpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcnRpYWwgJiYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcExpc3RlbmluZyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgKHRoaXMgYXMgYW55KVtfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUTW9kZWw+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2Yge0BsaW5rIEVsZW1lbnRCYXNlfSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosge0BsaW5rIEVsZW1lbnRCYXNlfSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUTW9kZWw+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLm1vZGVscyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFRNb2RlbD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yIGFzIEl0ZXJhdG9yPFRNb2RlbD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5KGlkKSwgdmFsdWUobW9kZWwpIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpZCksIHZhbHVlKG1vZGVsKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgVE1vZGVsXT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaWQpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKHtAbGluayBFbGVtZW50QmFzZX0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKHtAbGluayBFbGVtZW50QmFzZX0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMubW9kZWxzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwb3Mya2V5ID0gKHBvczogbnVtYmVyKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBnZXRNb2RlbElkKGNvbnRleHQuYmFzZVtwb3NdIGFzIEFjY2Vzc2libGU8VE1vZGVsLCBzdHJpbmc+LCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKSB8fCBTdHJpbmcocG9zKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IocG9zMmtleShjdXJyZW50KSwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yO1xuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKENvbGxlY3Rpb24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4iLCJpbXBvcnQgdHlwZSB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEFycmF5Q2hhbmdlUmVjb3JkIH0gZnJvbSAnQGNkcC9vYnNlcnZhYmxlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHR5cGUgeyBMaXN0Q2hhbmdlZCwgTGlzdEVkaXRPcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgY2xlYXJBcnJheSxcbiAgICBhcHBlbmRBcnJheSxcbiAgICBpbnNlcnRBcnJheSxcbiAgICByZW9yZGVyQXJyYXksXG4gICAgcmVtb3ZlQXJyYXksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0aW9uIH0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4gRWRpdGVkIGNvbGxlY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOiiq+e3qOmbhiBDb2xsZWN0aW9uIOOBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uRWRpdGVlPE0gZXh0ZW5kcyBvYmplY3Q+ID0gQ29sbGVjdGlvbjxNLCBhbnksIGFueT47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwcmVwYXJlPFQgZXh0ZW5kcyBvYmplY3Q+KGNvbGxlY3Rpb246IENvbGxlY3Rpb248VD4pOiBUW10gfCBuZXZlciB7XG4gICAgaWYgKGNvbGxlY3Rpb24uZmlsdGVyZWQpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfRURJVF9QRVJNSVNTSU9OX0RFTklFRCwgJ2NvbGxlY3Rpb24gaXMgYXBwbGllZCBhZnRlci1maWx0ZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBjb2xsZWN0aW9uLm1vZGVscy5zbGljZSgpO1xufVxuXG4vKiogQGludGVybmFsICovXG5hc3luYyBmdW5jdGlvbiBleGVjPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248VD4sXG4gICAgb3B0aW9uczogTGlzdEVkaXRPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAgIG9wZXJhdGlvbjogKHRhcmdldHM6IFRbXSwgdG9rZW46IENhbmNlbFRva2VuIHwgdW5kZWZpbmVkKSA9PiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+LFxuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgY29uc3QgdGFyZ2V0cyA9IHByZXBhcmU8VD4oY29sbGVjdGlvbik7XG4gICAgY29uc3QgY2hhbmdlID0gYXdhaXQgb3BlcmF0aW9uKHRhcmdldHMsIG9wdGlvbnM/LmNhbmNlbCk7XG4gICAgY29sbGVjdGlvbi5zZXQodGFyZ2V0cywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGNoYW5nZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gbWluKGluZGljZXM6IG51bWJlcltdKTogbnVtYmVyIHtcbiAgICByZXR1cm4gaW5kaWNlcy5yZWR1Y2UoKGxocywgcmhzKSA9PiBNYXRoLm1pbihsaHMsIHJocykpO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBtYWtlTGlzdENoYW5nZWQ8VD4oXG4gICAgdHlwZTogJ2FkZCcgfCAncmVtb3ZlJyB8ICdyZW9yZGVyJyxcbiAgICBjaGFuZ2VzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdLFxuICAgIHJhbmdlRnJvbTogbnVtYmVyLFxuICAgIHJhbmdlVG86IG51bWJlcixcbiAgICBhdD86IG51bWJlcixcbik6IExpc3RDaGFuZ2VkPFQ+IHtcbiAgICBjb25zdCBjaGFuZ2VkID0gISFjaGFuZ2VzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlLFxuICAgICAgICBsaXN0OiBjaGFuZ2VzLFxuICAgICAgICByYW5nZTogY2hhbmdlZCA/IHsgZnJvbTogcmFuZ2VGcm9tLCB0bzogcmFuZ2VUbyB9IDogdW5kZWZpbmVkLFxuICAgICAgICBpbnNlcnRlZFRvOiBjaGFuZ2VkID8gYXQgOiB1bmRlZmluZWQsXG4gICAgfSBhcyBMaXN0Q2hhbmdlZDxUPjtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXIgYWxsIGVsZW1lbnRzIG9mIHtAbGluayBDb2xsZWN0aW9ufS5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g6KaB57Sg44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZVRvID0gY29sbGVjdGlvbi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gY2xlYXJBcnJheSh0YXJnZXRzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3JlbW92ZScsIGNoYW5nZXMsIDAsIHJhbmdlVG8pO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2Yge0BsaW5rIENvbGxlY3Rpb259LlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSDjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQge0BsaW5rIENvbGxlY3Rpb259XG4gKiAgLSBgamFgIOWvvuixoSB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30gcmVmZXJlbmNlLlxuICogIC0gYGphYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgc3JjOiBUW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IGNvbGxlY3Rpb24ubGVuZ3RoO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gYXBwZW5kQXJyYXkodGFyZ2V0cywgc3JjLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ2FkZCcsIGNoYW5nZXMsIHJhbmdlRnJvbSwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCByYW5nZUZyb20pO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiB7QGxpbmsgQ29sbGVjdGlvbn0uXG4gKiBAamEge0BsaW5rIENvbGxlY3Rpb259IOOBruaMh+WumuOBl+OBn+S9jee9ruOBq+aMv+WFpVxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqICAtIGBqYWAg5a++6LGhIHtAbGluayBDb2xsZWN0aW9ufVxuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30gcmVmZXJlbmNlLlxuICogIC0gYGphYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgaW5kZXg6IG51bWJlcixcbiAgICBzcmM6IFRbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBpbnNlcnRBcnJheSh0YXJnZXRzLCBpbmRleCwgc3JjLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ2FkZCcsIGNoYW5nZXMsIGluZGV4LCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIGluZGV4KTtcbn1cblxuLyoqXG4gKiBAZW4gUmVvcmRlciB7QGxpbmsgQ29sbGVjdGlvbn0gZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEge0BsaW5rIENvbGxlY3Rpb259IOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqICAtIGBqYWAg5a++6LGhIHtAbGluayBDb2xsZWN0aW9ufVxuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IHJlZmVyZW5jZS5cbiAqICAtIGBqYWAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBpbmRleDogbnVtYmVyLFxuICAgIG9yZGVyczogbnVtYmVyW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IG1pbihbaW5kZXgsIC4uLm9yZGVyc10pO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gcmVvcmRlckFycmF5KHRhcmdldHMsIGluZGV4LCBvcmRlcnMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVvcmRlcicsIGNoYW5nZXMsIHJhbmdlRnJvbSwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCBpbmRleCk7XG59XG5cbi8qKlxuICogQGVuIFJlbW92ZSB7QGxpbmsgQ29sbGVjdGlvbn0gZWxlbWVudHMuXG4gKiBAamEge0BsaW5rIENvbGxlY3Rpb259IOmgheebruOBruWJiumZpFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqICAtIGBqYWAg5a++6LGhIHtAbGluayBDb2xsZWN0aW9ufVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCByZW1vdmVkIG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30gcmVmZXJlbmNlLlxuICogIC0gYGphYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgb3JkZXJzOiBudW1iZXJbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gbWluKG9yZGVycyk7XG4gICAgY29uc3QgcmFuZ2VUbyA9IGNvbGxlY3Rpb24ubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IHJlbW92ZUFycmF5KHRhcmdldHMsIG9yZGVycywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW1vdmUnLCBjaGFuZ2VzLCByYW5nZUZyb20sIHJhbmdlVG8pO1xufVxuIl0sIm5hbWVzIjpbImdldExhbmd1YWdlIiwidHJ1bmMiLCJPYnNlcnZhYmxlQXJyYXkiLCJjYyIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInVuaXF1ZSIsImNvbXB1dGVEYXRlIiwiaXNGdW5jdGlvbiIsInNvcnQiLCJzaHVmZmxlIiwiaXNTdHJpbmciLCJFdmVudFNvdXJjZSIsImx1aWQiLCJpc01vZGVsIiwiYXQiLCJkZWZhdWx0U3luYyIsIm5vb3AiLCJpc051bGxpc2giLCJpc0FycmF5IiwibW9kZWwiLCJFdmVudEJyb2tlciIsInJlc3VsdCIsIkZBSUxFRCIsIkV2ZW50UHVibGlzaGVyIiwic2V0TWl4Q2xhc3NBdHRyaWJ1dGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBS0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFMRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLHdCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsd0JBQWlELENBQUE7WUFDakQsV0FBbUMsQ0FBQSxXQUFBLENBQUEsMEJBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLG9DQUE2QixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQSxHQUFBLDBCQUFBLENBQUE7WUFDOUgsV0FBbUMsQ0FBQSxXQUFBLENBQUEsK0JBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLG9DQUE2QixDQUFDLEVBQUUsc0JBQXNC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