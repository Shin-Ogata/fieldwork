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
     *  - `en` [[CancelToken]] reference. (enable `undefined`)
     *  - `ja` [[CancelToken]] を指定 (undefined 可)
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
         *  - `en` [[DynamicConditionSeed]] instance
         *  - `ja` [[DynamicConditionSeed]] インスタンス
         */
        constructor(seeds = { operators: [] }) {
            const { operators, combination, sumKeys, limit, random, sortKeys } = seeds;
            this._operators = operators;
            this._combination = null != combination ? combination : 0 /* DynamicCombination.AND */;
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
            return fltr || (( /* item */) => true);
        }
    }

    const { 
    /** @internal */ trunc } = Math;
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
        let index = (null != baseIndex) ? baseIndex : 0;
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
        let index = (null != baseIndex) ? baseIndex : 0;
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
     * import { Model, ModelConstructor } from '@cdp/model';
     * import {
     *     Collection,
     *     CollectionItemQueryOptions,
     *     CollectionItemQueryResult,
     *     CollectionSeed,
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
         *     The constructor is used internally by this [[Collection]] class for [[TModel]] construction.
         * @ja Model コンストラクタ <br>
         *     [[Collection]] クラスが [[TModel]] を構築するために使用する
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
            return byId.get(id) || (cid && byId.get(cid));
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
            if (coreUtils.isNullish(seeds)) {
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
                            value: undefined, // eslint-disable-line @typescript-eslint/no-non-null-assertion
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

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIiwiYmFzZS50cyIsImNvbGxlY3Rpb24tZWRpdG9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQ09MTEVDVElPTiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDEwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX0NPTExFQ1RJT05fREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMSwgJ2ludmFsaWQgYWNjZXNzLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUyAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAyLCAnaW52YWxpZCBjb21wYXJhdG9ycy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMywgJ2VkaXRpbmcgcGVybWlzc2lvbiBkZW5pZWQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgW1tDb2xsYXRvclByb3ZpZGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBbW0NvbGxhdG9yUHJvdmlkZXJdXSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRDb2xsYXRvclByb3ZpZGVyKG5ld1Byb3ZpZGVyPzogQ29sbGF0b3JQcm92aWRlcik6IENvbGxhdG9yUHJvdmlkZXIge1xuICAgIGlmIChudWxsID09IG5ld1Byb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiBfY29sbGF0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvdmlkZXIgPSBfY29sbGF0b3I7XG4gICAgICAgIF9jb2xsYXRvciA9IG5ld1Byb3ZpZGVyO1xuICAgICAgICByZXR1cm4gb2xkUHJvdmlkZXI7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBHZXQgc3RyaW5nIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5paH5a2X5YiX5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHJpbmdDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBUICYgVW5rbm93bk9iamVjdCwgcmhzOiBUICYgVW5rbm93bk9iamVjdCk6IG51bWJlciA9PiB7XG4gICAgICAgIC8vIHVuZGVmaW5lZCDjga8gJycg44Go5ZCM562J44Gr5omx44GGXG4gICAgICAgIGNvbnN0IGxoc1Byb3AgPSAobnVsbCAhPSBsaHNbcHJvcF0pID8gbGhzW3Byb3BdIGFzIHN0cmluZyA6ICcnO1xuICAgICAgICBjb25zdCByaHNQcm9wID0gKG51bGwgIT0gcmhzW3Byb3BdKSA/IHJoc1twcm9wXSBhcyBzdHJpbmcgOiAnJztcbiAgICAgICAgcmV0dXJuIG9yZGVyICogX2NvbGxhdG9yKCkuY29tcGFyZShsaHNQcm9wLCByaHNQcm9wKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZGF0ZSBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaXpeaZguavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQgJiBVbmtub3duT2JqZWN0LCByaHM6IFQgJiBVbmtub3duT2JqZWN0KTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wXTtcbiAgICAgICAgY29uc3QgcmhzRGF0ZSA9IHJoc1twcm9wXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQgJiBVbmtub3duT2JqZWN0LCByaHM6IFQgJiBVbmtub3duT2JqZWN0KTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGxoc1twcm9wXSA9PT0gcmhzW3Byb3BdKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc1twcm9wXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNbcHJvcF0pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAxICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKGxoc1twcm9wXSA8IHJoc1twcm9wXSA/IC0xICogb3JkZXIgOiAxICogb3JkZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGJvb2xlYW4gY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDnnJ/lgb3lgKTmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEJvb2xlYW5Db21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIEdldCBudW1lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pWw5YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXROdW1iZXJDb21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBmcm9tIFtbU29ydEtleV1dLlxuICogQGphIFtbU29ydEtleV1dIOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdHlwZSwgb3JkZXIgfSA9IHNvcnRLZXk7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIFtbU29ydEtleV1dIGFycmF5LlxuICogQGphIFtbU29ydEtleV1dIOmFjeWIl+OCkiBjb21wYXJhdG9yIOmFjeWIl+OBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNvcnRLZXlzPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXlzOiBTb3J0S2V5PEs+W10pOiBTb3J0Q2FsbGJhY2s8VD5bXSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUPltdID0gW107XG4gICAgZm9yIChjb25zdCBzb3J0S2V5IG9mIHNvcnRLZXlzKSB7XG4gICAgICAgIGNvbXBhcmF0b3JzLnB1c2godG9Db21wYXJhdG9yKHNvcnRLZXkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBhcmF0b3JzO1xufVxuIiwiLyoqXG4gKiBAZW4gQ3Vyc29yIHBvc2l0aW9uIGNvbnN0YW50LlxuICogQGphIOOCq+ODvOOCveODq+S9jee9ruWumuaVsFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDdXJzb3JQb3Mge1xuICAgIE9VVF9PRl9SQU5HRSAgICA9IC0xLFxuICAgIENVUlJFTlQgICAgICAgICA9IC0yLFxufVxuXG4vKipcbiAqIEBlbiBTZWVrIGV4cHJlc3Npb24gZnVuY3Rpb24gdHlwZS5cbiAqIEBqYSDjgrfjg7zjgq/lvI/plqLmlbDlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vla0V4cDxUPiA9ICh2YWx1ZTogVCwgaW5kZXg/OiBudW1iZXIsIG9iaj86IFRbXSkgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHByb3ZpZGVzIGN1cnNvciBpbnRlcmZhY2UgZm9yIEFycmF5LiA8YnI+XG4gKiAgICAgSXQgaXMgZGlmZmVyZW50IGZyb20gSXRlcmF0b3IgaW50ZXJmYWNlIG9mIGVzMjAxNSwgYW5kIHRoYXQgcHJvdmlkZXMgaW50ZXJmYWNlIHdoaWNoIGlzIHNpbWlsYXIgdG8gREIgcmVjb3Jkc2V0J3Mgb25lLlxuICogQGphIEFycmF5IOeUqOOCq+ODvOOCveODqyBJL0Yg44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBlczIwMTUg44GuIEl0ZXJhdG9yIEkvRiDjgajjga/nlbDjgarjgorjgIFEQiByZWNvcmRzZXQg44Kq44OW44K444Kn44Kv44OI44Op44Kk44Kv44Gq6LWw5p+7IEkvRiDjgpLmj5DkvpvjgZnjgotcbiAqL1xuZXhwb3J0IGNsYXNzIEFycmF5Q3Vyc29yPFQgPSBhbnk+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLyoqIEBpbnRlcm5hbCDlr77osaHjga7phY3liJcgICovXG4gICAgcHJpdmF0ZSBfYXJyYXk6IFRbXTtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruWFiOmgreOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICAqL1xuICAgIHByaXZhdGUgX2JvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruacq+WwvuOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfZW9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg54++5Zyo44GuIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogMFxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiAwXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXJyYXk6IFRbXSwgaW5pdGlhbEluZGV4ID0gMCkge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgdGFyZ2V0IGFycmF5LlxuICAgICAqIEBqYSDlr77osaHjga7lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5LiBkZWZhdWx0OiBlbXB0eSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+Wumi4gICBkZWZhdWx0OiDnqbrphY3liJdcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoYXJyYXk6IFRbXSA9IFtdLCBpbml0aWFsSW5kZXg6IG51bWJlciA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0UpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGN1cnJlbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheVt0aGlzLl9pbmRleF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjmjIfjgZfnpLrjgZfjgabjgYTjgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRhcmdldCBhcnJheSBsZW5ndGguXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBruimgee0oOaVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgQk9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5YWI6aCt44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQk9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBFT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7mnKvlsL7jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lb2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByYXcgYXJyYXkgaW5zdGFuY2UuXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBhcnJheSgpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY3Vyc29yIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGZpcnN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOWFiOmgreimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlRmlyc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBsYXN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOacq+Wwvuimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTGFzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIG5leHQgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5qyh44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVOZXh0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZikge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIHByZXZpb3VzIGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuWJjeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlUHJldmlvdXMoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fZW9mKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VlayBieSBwYXNzZWQgY3JpdGVyaWEuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG9wZXJhdGlvbiBmYWlsZWQsIHRoZSBjdXJzb3IgcG9zaXRpb24gc2V0IHRvIEVPRi5cbiAgICAgKiBAamEg5oyH5a6a5p2h5Lu244Gn44K344O844KvIDxicj5cbiAgICAgKiAgICAg44K344O844Kv44Gr5aSx5pWX44GX44Gf5aC05ZCI44GvIEVPRiDnirbmhYvjgavjgarjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjcml0ZXJpYVxuICAgICAqICAtIGBlbmAgaW5kZXggb3Igc2VlayBleHByZXNzaW9uXG4gICAgICogIC0gYGphYCBpbmRleCAvIOadoeS7tuW8j+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzZWVrKGNyaXRlcmlhOiBudW1iZXIgfCBTZWVrRXhwPFQ+KTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBjcml0ZXJpYSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBjcml0ZXJpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkuZmluZEluZGV4KGNyaXRlcmlhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIOOCq+ODvOOCveODq+OBjOacieWKueOBquevhOWbsuOCkuekuuOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0cnVlOiDmnInlirkgLyBmYWxzZTog54Sh5Yq5XG4gICAgICovXG4gICAgcHJpdmF0ZSB2YWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICgwIDw9IHRoaXMuX2luZGV4ICYmIHRoaXMuX2luZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmlxdWUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxUb2tlbixcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5LCBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gdHJ1bmNcbn0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIHdhaXQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gKi9cbmZ1bmN0aW9uIG1ha2VQcm9taXNlPFQ+KGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+LCByZW1hcD86IFRbXSk6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgZWRpdG9yLm9mZihjYWxsYmFjayk7XG4gICAgICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgICAgICByZW1hcC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIHJlbWFwLnB1c2goLi4uZWRpdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVjb3Jkcyk7XG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5vbihjYWxsYmFjayk7XG4gICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCB0byBbW09ic2VydmFibGVBcnJheV1dIGlmIG5lZWRlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldEVkaXRDb250ZXh0PFQ+KFxuICAgIHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLFxuICAgIHRva2VuPzogQ2FuY2VsVG9rZW5cbik6IFByb21pc2U8eyBlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPjsgcHJvbWlzZTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPjsgfT4gfCBuZXZlciB7XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIE9ic2VydmFibGVBcnJheSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3I6IHRhcmdldCxcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgY29uc3QgZWRpdG9yID0gT2JzZXJ2YWJsZUFycmF5LmZyb20odGFyZ2V0KTtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yLFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UoZWRpdG9yLCB0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgJ3RhcmdldCBpcyBub3QgQXJyYXkgb3IgT2JzZXJ2YWJsZUFycmF5LicpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBvcmRlcnMgaW5kZXggKi9cbmZ1bmN0aW9uIHZhbGlkT3JkZXJzKGxlbmd0aDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdKTogYm9vbGVhbiB8IG5ldmVyIHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGluZGV4IG9mIG9yZGVycykge1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IGxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBvcmRlcnNbXSBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5wdXNoKC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgYXJyYXkuXG4gKiBAamEg5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYGluc2VydEFycmF5KCksIGluZGV4IGlzIGludmFsaWQuIGluZGV4OiAke2luZGV4fWApO1xuICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKGluZGV4LCAwLCAuLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIgYXJyYXkgZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEg6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGByZW9yZGVyQXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g6ZmN6aCG44K944O844OIXG4gICAgb3JkZXJzLnNvcnQoKGxocywgcmhzKSA9PiB7XG4gICAgICAgIHJldHVybiAobGhzIDwgcmhzID8gMSA6IC0xKTtcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3Qgb3JkZXIgb2YgdW5pcXVlKG9yZGVycykpIHtcbiAgICAgICAgZWRpdG9yLnNwbGljZShvcmRlciwgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG4iLCJpbXBvcnQgeyBLZXlzLCBjb21wdXRlRGF0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBGaWx0ZXJDYWxsYmFjaywgRHluYW1pY0NvbWJpbmF0aW9uIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQUxMPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBzdHJpbmcgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQ29tcGFyYWJsZTxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZVN0cmluZzxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8c3RyaW5nLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCB1bmRlZmluZWQ7XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdICE9PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVIgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTUyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3M8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDw9IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IFN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0xJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RMaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAhU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiBkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc05vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiAhKGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLlJBTkdFICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgbWluOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+LCBtYXg6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIGNvbWJpbmF0aW9uKER5bmFtaWNDb21iaW5hdGlvbi5BTkQsIGdyZWF0ZXJFcXVhbChwcm9wLCBtaW4pLCBsZXNzRXF1YWwocHJvcCwgbWF4KSk7XG59XG5cbi8qKiBAaW50ZXJuYWwg44OV44Kj44Or44K/44Gu5ZCI5oiQICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluYXRpb248VCBleHRlbmRzIG9iamVjdD4odHlwZTogRHluYW1pY0NvbWJpbmF0aW9uLCBsaHM6IEZpbHRlckNhbGxiYWNrPFQ+LCByaHM6IEZpbHRlckNhbGxiYWNrPFQ+IHwgdW5kZWZpbmVkKTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAhcmhzID8gbGhzIDogKGl0ZW06IFQpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5BTkQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5PUjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pIHx8IHJocyhpdGVtKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIGNvbWJpbmF0aW9uOiAke3R5cGV9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgLy8gZmFpbCBzYWZlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwiaW1wb3J0IHsgS2V5cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxuICAgIER5bmFtaWNDb25kaXRpb25TZWVkLFxuICAgIER5bmFtaWNPcGVyYXRvckNvbnRleHQsXG4gICAgRHluYW1pY0xpbWl0Q29uZGl0aW9uLFxuICAgIER5bmFtaWNPcGVyYXRvcixcbiAgICBEeW5hbWljQ29tYmluYXRpb24sXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBWYWx1ZVR5cGVBTEwsXG4gICAgVmFsdWVUeXBlQ29tcGFyYWJsZSxcbiAgICBWYWx1ZVR5cGVTdHJpbmcsXG4gICAgZXF1YWwsXG4gICAgbm90RXF1YWwsXG4gICAgZ3JlYXRlcixcbiAgICBsZXNzLFxuICAgIGdyZWF0ZXJFcXVhbCxcbiAgICBsZXNzRXF1YWwsXG4gICAgbGlrZSxcbiAgICBub3RMaWtlLFxuICAgIGRhdGVMZXNzRXF1YWwsXG4gICAgZGF0ZUxlc3NOb3RFcXVhbCxcbiAgICByYW5nZSxcbiAgICBjb21iaW5hdGlvbixcbn0gZnJvbSAnLi9keW5hbWljLWZpbHRlcnMnO1xuXG4vKipcbiAqIEBlbiBEeW5hbWljIHF1ZXJ5IGNvbmRpdGlvbiBtYW5hZ2VyIGNsYXNzLlxuICogQGphIOODgOOCpOODiuODn+ODg+OCr+OCr+OCqOODqueKtuaFi+euoeeQhuOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY0NvbmRpdGlvbjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+IGltcGxlbWVudHMgRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+IHtcblxuICAgIHByaXZhdGUgX29wZXJhdG9yczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9jb21iaW5hdGlvbjogRHluYW1pY0NvbWJpbmF0aW9uO1xuICAgIHByaXZhdGUgX3N1bUtleXM6IEtleXM8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfbGltaXQ/OiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+O1xuICAgIHByaXZhdGUgX3JhbmRvbTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9zb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgW1tEeW5hbWljQ29uZGl0aW9uU2VlZF1dIGluc3RhbmNlXG4gICAgICogIC0gYGphYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM6IER5bmFtaWNDb25kaXRpb25TZWVkPFRJdGVtLCBUS2V5PiA9IHsgb3BlcmF0b3JzOiBbXSB9KSB7XG4gICAgICAgIGNvbnN0IHsgb3BlcmF0b3JzLCBjb21iaW5hdGlvbiwgc3VtS2V5cywgbGltaXQsIHJhbmRvbSwgc29ydEtleXMgfSA9IHNlZWRzO1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgICAgID0gb3BlcmF0b3JzO1xuICAgICAgICB0aGlzLl9jb21iaW5hdGlvbiAgID0gbnVsbCAhPSBjb21iaW5hdGlvbiA/IGNvbWJpbmF0aW9uIDogRHluYW1pY0NvbWJpbmF0aW9uLkFORDtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyAgICAgICA9IG51bGwgIT0gc3VtS2V5cyA/IHN1bUtleXMgOiBbXTtcbiAgICAgICAgdGhpcy5fbGltaXQgICAgICAgICA9IGxpbWl0O1xuICAgICAgICB0aGlzLl9yYW5kb20gICAgICAgID0gISFyYW5kb207XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzICAgICAgPSBzb3J0S2V5cyB8fCBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZFxuXG4gICAgZ2V0IG9wZXJhdG9ycygpOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG5cbiAgICBzZXQgb3BlcmF0b3JzKHZhbHVlczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSkge1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IHN1bUtleXMoKTogKEtleXM8VEl0ZW0+KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1bUtleXM7XG4gICAgfVxuXG4gICAgc2V0IHN1bUtleXModmFsdWVzOiAoS2V5czxUSXRlbT4pW10pIHtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgY29tYmluYXRpb24oKTogRHluYW1pY0NvbWJpbmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbWJpbmF0aW9uO1xuICAgIH1cblxuICAgIHNldCBjb21iaW5hdGlvbih2YWx1ZTogRHluYW1pY0NvbWJpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGxpbWl0KCk6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGltaXQ7XG4gICAgfVxuXG4gICAgc2V0IGxpbWl0KHZhbHVlOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2xpbWl0ID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHJhbmRvbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbTtcbiAgICB9XG5cbiAgICBzZXQgcmFuZG9tKHZhbHVlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3JhbmRvbSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBzb3J0S2V5cygpOiBTb3J0S2V5PFRLZXk+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc29ydEtleXM7XG4gICAgfVxuXG4gICAgc2V0IHNvcnRLZXlzKHZhbHVlczogU29ydEtleTxUS2V5PltdKSB7XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzID0gdmFsdWVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBhY2Nlc3NvcjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29tcGFyYXRvciBmdW5jdGlvbnMuXG4gICAgICogQGphIOavlOi8g+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBjb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gY29udmVydFNvcnRLZXlzKHRoaXMuX3NvcnRLZXlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHN5bnRoZXNpcyBmaWx0ZXIgZnVuY3Rpb24uXG4gICAgICogQGphIOWQiOaIkOa4iOOBv+ODleOCo+ODq+OCv+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBmaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHtcbiAgICAgICAgbGV0IGZsdHI6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbmQgb2YgdGhpcy5fb3BlcmF0b3JzKSB7XG4gICAgICAgICAgICBjb25zdCB7IG9wZXJhdG9yLCBwcm9wLCB2YWx1ZSB9ID0gY29uZDtcbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuR1JFQVRFUjpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVyPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3M8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3NFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWtlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZVN0cmluZzxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVMZXNzRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NOb3RFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+LCBjb25kLnJhbmdlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRvcjogJHtvcGVyYXRvcn1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciB8fCAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIHNvcnQsXG4gICAgc2h1ZmZsZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIFNvcnRLZXksXG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvblF1ZXJ5SW5mbyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIER5bmFtaWNMaW1pdCxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscy9jb21wYXJhdG9yJztcbmltcG9ydCB7IER5bmFtaWNDb25kaXRpb24gfSBmcm9tICcuL2R5bmFtaWMtY29uZGl0aW9uJztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gdHJ1bmNcbn0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIOS9v+eUqOOBmeOCi+ODl+ODreODkeODhuOCo+OBjOS/neiovOOBleOCjOOBnyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyAqL1xuaW50ZXJmYWNlIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+IGV4dGVuZHMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBzb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuICAgIGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W107XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBBcHBseSBgZmlsdGVyYCBhbmQgYHNvcnQga2V5YCB0byB0aGUgYGl0ZW1zYCBmcm9tIFtbcXVlcnlJdGVtc11dYCgpYCByZXN1bHQuXG4gKiBAamEgW1txdWVyeUl0ZW1zXV1gKClgIOOBl+OBnyBgaXRlbXNgIOOBq+WvvuOBl+OBpiBgZmlsdGVyYCDjgaggYHNvcnQga2V5YCDjgpLpgannlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEl0ZW1zPFRJdGVtPihpdGVtczogVEl0ZW1bXSwgZmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgbnVsbCwgLi4uY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSk6IFRJdGVtW10ge1xuICAgIGxldCByZXN1bHQgPSBpc0Z1bmN0aW9uKGZpbHRlcikgPyBpdGVtcy5maWx0ZXIoZmlsdGVyKSA6IGl0ZW1zLnNsaWNlKCk7XG4gICAgZm9yIChjb25zdCBjb21wYXJhdG9yIG9mIGNvbXBhcmF0b3JzKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBhcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzb3J0KHJlc3VsdCwgY29tcGFyYXRvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY29uZGl0aW5hbEZpeCDjgavkvb/nlKjjgZnjgosgQ3JpdGVyaWEgTWFwICovXG5jb25zdCBfbGltaXRDcml0ZXJpYSA9IHtcbiAgICBbRHluYW1pY0xpbWl0LkNPVU5UXTogbnVsbCxcbiAgICBbRHluYW1pY0xpbWl0LlNVTV06IHsgY29lZmY6IDEgfSxcbiAgICBbRHluYW1pY0xpbWl0LlNFQ09ORF06IHsgY29lZmY6IDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1JTlVURV06IHsgY29lZmY6IDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuSE9VUl06IHsgY29lZmY6IDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5EQVldOiB7IGNvZWZmOiAyNCAqIDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5LQl06IHsgY29lZmY6IDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1CXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LkdCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5UQl06IHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbn07XG5cbi8qKlxuICogQGVuIEZpeCB0aGUgdGFyZ2V0IGl0ZW1zIGJ5IFtbRHluYW1pY0NvbmRpdGlvbl1dLlxuICogQGphIFtbRHluYW1pY0NvbmRpdGlvbl1dIOOBq+W+k+OBhOWvvuixoeOCkuaVtOW9olxuICpcbiAqIEBwYXJhbSBpdGVtc1xuICogIC0gYGVuYCB0YXJnZXQgaXRlbXMgKGRlc3RydWN0aXZlKVxuICogIC0gYGphYCDlr77osaHjga7jgqLjgqTjg4bjg6AgKOegtOWjiueahClcbiAqIEBwYXJhbSBjb25kaXRpb25cbiAqICAtIGBlbmAgY29uZGl0aW9uIG9iamVjdFxuICogIC0gYGphYCDmnaHku7bjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbmRpdGlvbmFsRml4PFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4oXG4gICAgaXRlbXM6IFRJdGVtW10sXG4gICAgY29uZGl0aW9uOiBEeW5hbWljQ29uZGl0aW9uPFRJdGVtLCBUS2V5PlxuKTogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4ge1xuICAgIGNvbnN0IHsgcmFuZG9tLCBsaW1pdCwgc3VtS2V5cyB9ID0gY29uZGl0aW9uO1xuXG4gICAgaWYgKHJhbmRvbSkge1xuICAgICAgICBzaHVmZmxlKGl0ZW1zLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAobGltaXQpIHtcbiAgICAgICAgY29uc3QgeyB1bml0LCB2YWx1ZSwgcHJvcCB9ID0gbGltaXQ7XG4gICAgICAgIGNvbnN0IHJlc2V0OiBUSXRlbVtdID0gW107XG4gICAgICAgIGNvbnN0IGNyaXRlcmlhID0gX2xpbWl0Q3JpdGVyaWFbdW5pdF07XG4gICAgICAgIGNvbnN0IGxpbWl0Q291bnQgPSB2YWx1ZTtcbiAgICAgICAgY29uc3QgZXhjZXNzID0gISFsaW1pdC5leGNlc3M7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgaWYgKCFjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gaXRlbVtwcm9wIGFzIEtleXM8VEl0ZW0+XSkge1xuICAgICAgICAgICAgICAgIGNvdW50ICs9IChOdW1iZXIoaXRlbVtwcm9wIGFzIEtleXM8VEl0ZW0+XSkgLyBjcml0ZXJpYS5jb2VmZik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgY2Fubm90IGFjY2VzcyBwcm9wZXJ0eTogJHtwcm9wfWApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGltaXRDb3VudCA8IGNvdW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4Y2Vzcykge1xuICAgICAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpdGVtcyA9IHJlc2V0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAgICAgICAgaXRlbXMsXG4gICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtLCBLZXlzPFRJdGVtPj47XG5cbiAgICBpZiAoMCA8IHN1bUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2Ygc3VtS2V5cykge1xuICAgICAgICAgICAgICAgIGlmICghKGtleSBpbiByZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpICs9IE51bWJlcihpdGVtW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwg44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL5a++6LGh44Gr5a++44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBxdWVyeSDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbUNhY2hlPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIGNhY2hlZDogVEl0ZW1bXSxcbiAgICBvcHRpb25zOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGZpbHRlcixcbiAgICAgICAgY29tcGFyYXRvcnMsXG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICAgICAgbm9TZWFyY2gsXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICAvLyDlr77osaHjgarjgZdcbiAgICBpZiAoIWNhY2hlZC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsOiAwLFxuICAgICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcbiAgICB9XG5cbiAgICAvLyDjgq3jg6Pjg4Pjgrfjg6Xjgavlr77jgZfjgabjg5XjgqPjg6vjgr/jg6rjg7PjgrAsIOOCveODvOODiOOCkuWun+ihjFxuICAgIGNvbnN0IHRhcmdldHMgPSBub1NlYXJjaCA/IGNhY2hlZC5zbGljZSgpIDogc2VhcmNoSXRlbXMoY2FjaGVkLCBmaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgIGNvbnN0IHJlc3VsdHM6IFRJdGVtW10gPSBbXTtcbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldHMubGVuZ3RoIDw9IGluZGV4IHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7IGxpbWl0IH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gdGFyZ2V0cy5zbGljZShpbmRleCwgKG51bGwgIT0gbGltaXQpID8gaW5kZXggKyBsaW1pdCA6IHVuZGVmaW5lZCk7XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLml0ZW1zKTtcblxuICAgICAgICBjb25zdCByZXR2YWwgPSB7XG4gICAgICAgICAgICB0b3RhbDogdGFyZ2V0cy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgLi4ub3B0cyB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPixcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgcmV0dmFsLml0ZW1zID0gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwg44Os44K544Od44Oz44K544Gu44Kt44Oj44OD44K344Ol44KS6Kmm6KGMICovXG5mdW5jdGlvbiB0cnlDYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHJlc3VsdDogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4sXG4gICAgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+XG4pOiB2b2lkIHtcbiAgICBjb25zdCB7IG5vQ2FjaGUsIG5vU2VhcmNoIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IGNhbkNhY2hlID0gIW5vQ2FjaGUgJiYgIW5vU2VhcmNoICYmIHJlc3VsdC50b3RhbCAmJiByZXN1bHQudG90YWwgPT09IHJlc3VsdC5pdGVtcy5sZW5ndGg7XG4gICAgaWYgKGNhbkNhY2hlKSB7XG4gICAgICAgIHF1ZXJ5SW5mby5jYWNoZSA9IHsgLi4ucmVzdWx0IH07XG4gICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgYHByb3ZpZGVyYCDplqLmlbDjgpLkvb/nlKjjgZfjgaYgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIGBxdWVyeWAg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21Qcm92aWRlcjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IHJlc3VsdHM6IFRJdGVtW10gPSBbXTtcblxuICAgIGNvbnN0IHJlY2VpdmVkQWxsID0gKHJlc3A6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+KTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGNvbnN0IGhhc0NvbmQgPSAhIXJlc3Aub3B0aW9ucz8uY29uZGl0aW9uO1xuICAgICAgICByZXR1cm4gaGFzQ29uZCB8fCByZXNwLnRvdGFsID09PSByZXNwLml0ZW1zLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSAobnVsbCAhPSBiYXNlSW5kZXgpID8gYmFzZUluZGV4IDogMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAke2xpbWl0fWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgeyBpbmRleCB9KTtcbiAgICAgICAgbGV0IHJlc3AgPSBhd2FpdCBwcm92aWRlcihvcHRzKTtcbiAgICAgICAgY29uc3QgbmV4dE9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRzLCByZXNwLm9wdGlvbnMpO1xuXG4gICAgICAgIGlmIChyZWNlaXZlZEFsbChyZXNwKSkge1xuICAgICAgICAgICAgdHJ5Q2FjaGUocXVlcnlJbmZvLCByZXNwLCBuZXh0T3B0cyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgbm9TZWFyY2gsIGNvbmRpdGlvbjogc2VlZCB9ID0gbmV4dE9wdHM7XG4gICAgICAgICAgICBpZiAoc2VlZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IG5ldyBEeW5hbWljQ29uZGl0aW9uKHNlZWQpO1xuICAgICAgICAgICAgICAgIHJlc3AgPSBjb25kaXRpb25hbEZpeChzZWFyY2hJdGVtcyhcbiAgICAgICAgICAgICAgICAgICAgcmVzcC5pdGVtcyxcbiAgICAgICAgICAgICAgICAgICAgY29uZGl0aW9uLmZpbHRlcixcbiAgICAgICAgICAgICAgICAgICAgLi4uY29uZGl0aW9uLmNvbXBhcmF0b3JzXG4gICAgICAgICAgICAgICAgKSwgY29uZGl0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihxdWVyeUluZm8uY2FjaGUsIHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcXVlcnlGcm9tQ2FjaGUocmVzcC5pdGVtcywgT2JqZWN0LmFzc2lnbihvcHRzLCB7IG5vU2VhcmNoIH0pKTtcbiAgICAgICAgfS8vIGVzbGludC1kaXNhYmxlLWxpbmUgYnJhY2Utc3R5bGVcblxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCguLi5yZXNwLml0ZW1zKTtcblxuICAgICAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgICAgIHRvdGFsOiByZXNwLnRvdGFsLFxuICAgICAgICAgICAgICAgIGl0ZW1zOiByZXNwLml0ZW1zLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG5leHRPcHRzLFxuICAgICAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwLnRvdGFsIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5Q2FjaGUocXVlcnlJbmZvLCByZXR2YWwsIG5leHRPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+WkieaPmyAqL1xuZnVuY3Rpb24gZW5zdXJlT3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4gfCB1bmRlZmluZWRcbik6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBzb3J0S2V5czogW10gfSwgb3B0aW9ucyk7XG4gICAgY29uc3QgeyBub1NlYXJjaCwgc29ydEtleXMgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW5vU2VhcmNoICYmICghb3B0cy5jb21wYXJhdG9ycyB8fCBvcHRzLmNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSkge1xuICAgICAgICBvcHRzLmNvbXBhcmF0b3JzID0gY29udmVydFNvcnRLZXlzKHNvcnRLZXlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0cyBhcyBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT47XG59XG5cbi8qKlxuICogQGVuIExvdyBsZXZlbCBmdW5jdGlvbiBmb3IgW1tDb2xsZWN0aW9uXV0gcXVlcnkgaXRlbXMuXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0gSXRlbSDjgpLjgq/jgqjjg6rjgZnjgovkvY7jg6zjg5njg6vplqLmlbBcbiAqXG4gKiBAcGFyYW0gcXVlcnlJbmZvXG4gKiAgLSBgZW5gIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOOCr+OCqOODquaDheWgsVxuICogQHBhcmFtIHByb3ZpZGVyXG4gKiAgLSBgZW5gIHByb3ZpZGVyIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOODl+ODreODkOOCpOODgOmWouaVsFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5SXRlbXM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxUSXRlbVtdPiB7XG4gICAgY29uc3Qgb3B0cyA9IGVuc3VyZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gb3B0cztcblxuICAgIC8vIHF1ZXJ5IOOBq+S9v+eUqOOBl+OBnyBzb3J0LCBmaWx0ZXIg5oOF5aCx44KS44Kt44Oj44OD44K344OlXG4gICAgT2JqZWN0LmFzc2lnbihxdWVyeUluZm8sIHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSk7XG5cbiAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgcXVlcnlGcm9tQ2FjaGUocXVlcnlJbmZvLmNhY2hlLml0ZW1zLCBvcHRzKSkuaXRlbXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChhd2FpdCBxdWVyeUZyb21Qcm92aWRlcihxdWVyeUluZm8sIHByb3ZpZGVyLCBvcHRzKSkuaXRlbXM7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBDb25zdHJ1Y3RvcixcbiAgICBDbGFzcyxcbiAgICBLZXlzLFxuICAgIGlzTnVsbGlzaCxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgbm9vcCxcbiAgICBsdWlkLFxuICAgIGF0LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTaWxlbmNlYWJsZSxcbiAgICBTdWJzY3JpYmFibGUsXG4gICAgRXZlbnRCcm9rZXIsXG4gICAgRXZlbnRTb3VyY2UsXG4gICAgRXZlbnRQdWJsaXNoZXIsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgUmVzdWx0LFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIEZBSUxFRCxcbiAgICBtYWtlUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCwgZGVmYXVsdFN5bmMgfSBmcm9tICdAY2RwL2RhdGEtc3luYyc7XG5pbXBvcnQge1xuICAgIE1vZGVsLFxuICAgIE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBNb2RlbFNhdmVPcHRpb25zLFxuICAgIGlzTW9kZWwsXG59IGZyb20gJ0BjZHAvbW9kZWwnO1xuaW1wb3J0IHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvblNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25TZWVkLFxuICAgIENvbGxlY3Rpb25FdmVudCxcbiAgICBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWRkT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uU2V0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUmVTb3J0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uVXBkYXRlT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBzZWFyY2hJdGVtcywgcXVlcnlJdGVtcyB9IGZyb20gJy4vcXVlcnknO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgICAgICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yID0gU3ltYm9sKCdjcmVhdGUtaXRlcmFibGUtaXRlcmF0b3InKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3ByZXBhcmVNb2RlbCAgICAgICAgICAgPSBTeW1ib2woJ3ByZXBhcmUtbW9kZWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlbW92ZU1vZGVscyAgICAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1tb2RlbHMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2FkZFJlZmVyZW5jZSAgICAgICAgICAgPSBTeW1ib2woJ2FkZC1yZWZlcmVuY2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlbW92ZVJlZmVyZW5jZSAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1yZWZlcmVuY2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX29uTW9kZWxFdmVudCAgICAgICAgICAgPSBTeW1ib2woJ21vZGVsLWV2ZW50LWhhbmRsZXInKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PiB7XG4gICAgcmVhZG9ubHkgY29uc3RydWN0T3B0aW9uczogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VCwgSz47XG4gICAgcmVhZG9ubHkgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VCwgSz47XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgcXVlcnlPcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxULCBLPjtcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VCwgSz47XG4gICAgcmVhZG9ubHkgbW9kZWxPcHRpb25zOiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM7XG4gICAgcmVhZG9ubHkgYnlJZDogTWFwPHN0cmluZywgVD47XG4gICAgc3RvcmU6IFRbXTtcbiAgICBhZnRlckZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFQ+O1xufVxuXG4vKiogQGludGVybmFsIHJlc2V0IG1vZGVsIGNvbnRleHQgKi9cbmNvbnN0IHJlc2V0TW9kZWxTdG9yZSA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4oY29udGV4dDogUHJvcGVydHk8VCwgSz4pOiB2b2lkID0+IHtcbiAgICBjb250ZXh0LmJ5SWQuY2xlYXIoKTtcbiAgICBjb250ZXh0LnN0b3JlLmxlbmd0aCA9IDA7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVTb3J0T3B0aW9ucyA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ob3B0aW9uczogQ29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+KTogUmVxdWlyZWQ8Q29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+PiA9PiB7XG4gICAgY29uc3QgeyBzb3J0S2V5czoga2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBvcHRpb25zO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNvcnRLZXlzOiBrZXlzIHx8IFtdLFxuICAgICAgICBjb21wYXJhdG9yczogY29tcHMgfHwgY29udmVydFNvcnRLZXlzKGtleXMgfHwgW10pLFxuICAgIH07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtb2RlbElkQXR0cmlidXRlID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gKGN0b3IgYXMgYW55KT8uWydpZEF0dHJpYnV0ZSddIHx8ICdpZCc7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBnZXRNb2RlbElkID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGF0dHJzOiBULCBjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIChhdHRycyBhcyBhbnkpW21vZGVsSWRBdHRyaWJ1dGUoY3RvcildO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0Q2hhbmdlZElkcyA9IDxUIGV4dGVuZHMgb2JqZWN0PihvYmo6IG9iamVjdCwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiB7IGlkOiBzdHJpbmc7IHByZXZJZD86IHN0cmluZzsgfSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgdHlwZSBNb2RlbExpa2UgPSB7IHByZXZpb3VzOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZzsgfSAmIFVua25vd25PYmplY3Q7XG4gICAgY29uc3QgbW9kZWwgPSBvYmogYXMgTW9kZWxMaWtlO1xuXG4gICAgY29uc3QgaWRBdHRyaWJ1dGUgPSBtb2RlbElkQXR0cmlidXRlKGN0b3IpO1xuICAgIGNvbnN0IGlkID0gbW9kZWxbaWRBdHRyaWJ1dGVdO1xuICAgIGlmICghaXNTdHJpbmcoaWQpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaWQ6IG1vZGVsW2lkQXR0cmlidXRlXSBhcyBzdHJpbmcsIHByZXZJZDogaXNGdW5jdGlvbihtb2RlbC5wcmV2aW91cykgPyBtb2RlbC5wcmV2aW91cyhpZEF0dHJpYnV0ZSkgOiB1bmRlZmluZWQgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsQ29uc3RydWN0b3IgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiBDbGFzcyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgcmV0dXJuIChzZWxmLmNvbnN0cnVjdG9yIGFzIGFueSlbJ21vZGVsJ107XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBpc0NvbGxlY3Rpb25Nb2RlbCA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oeDogdW5rbm93biwgc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IHggaXMgVCA9PiB7XG4gICAgY29uc3QgY3RvciA9IG1vZGVsQ29uc3RydWN0b3Ioc2VsZik7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24oY3RvcikgPyB4IGluc3RhbmNlb2YgY3RvciA6IGZhbHNlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3BsaWNlQXJyYXkgPSA8VD4odGFyZ2V0OiBUW10sIGluc2VydDogVFtdLCBhdDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgYXQgPSBNYXRoLm1pbihNYXRoLm1heChhdCwgMCksIHRhcmdldC5sZW5ndGgpO1xuICAgIHRhcmdldC5zcGxpY2UoYXQsIDAsIC4uLmluc2VydCk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwYXJzZUZpbHRlckFyZ3M8VCBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogdW5rbm93bltdKTogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPiB7XG4gICAgY29uc3QgW2ZpbHRlciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChudWxsID09IGZpbHRlcikge1xuICAgICAgICByZXR1cm4ge307XG4gICAgfSBlbHNlIGlmICghaXNGdW5jdGlvbihmaWx0ZXIpKSB7XG4gICAgICAgIHJldHVybiBmaWx0ZXIgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywgeyBmaWx0ZXIgfSkgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3NldE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiB0cnVlLCBtZXJnZTogdHJ1ZSB9O1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkT3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlIH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIGNvbGxlY3Rpb24gdGhhdCBpcyBvcmRlcmVkIHNldHMgb2YgbW9kZWxzLlxuICogQGphIE1vZGVsIOOBrumbhuWQiOOCkuaJseOBhiBDb2xsZWN0aW9uIOOBruWfuuW6leOCr+ODqeOCueWumue+qS5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IE1vZGVsLCBNb2RlbENvbnN0cnVjdG9yIH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKiBpbXBvcnQge1xuICogICAgIENvbGxlY3Rpb24sXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAqICAgICBDb2xsZWN0aW9uU2VlZCxcbiAqIH0gZnJvbSAnQGNkcC9jb2xsZWN0aW9uJztcbiAqXG4gKiAvLyBNb2RlbCBzY2hlbWFcbiAqIGludGVyZmFjZSBUcmFja0F0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICB0aXRsZTogc3RyaW5nO1xuICogICBhcnRpc3Q6IHN0cmluZztcbiAqICAgYWxidW06ICBzdHJpbmc7XG4gKiAgIHJlbGVhc2VEYXRlOiBEYXRlO1xuICogICA6XG4gKiB9XG4gKlxuICogLy8gTW9kZWwgZGVmaW5pdGlvblxuICogY29uc3QgVHJhY2tCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxUcmFja0F0dHJpYnV0ZT4sIFRyYWNrQXR0cmlidXRlPjtcbiAqIGNsYXNzIFRyYWNrIGV4dGVuZHMgVHJhY2tCYXNlIHtcbiAqICAgICBzdGF0aWMgaWRBdHRyaWJ1dGUgPSAndXJpJztcbiAqIH1cbiAqXG4gKiAvLyBDb2xsZWN0aW9uIGRlZmluaXRpb25cbiAqIGNsYXNzIFBsYXlsaXN0IGV4dGVuZHMgQ29sbGVjdGlvbjxUcmFjaz4ge1xuICogICAgIC8vIHNldCB0YXJnZXQgTW9kZWwgY29uc3RydWN0b3JcbiAqICAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWwgPSBUcmFjaztcbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gdXNlIGN1c3RvbSBjb250ZW50IHByb3ZpZGVyIGZvciBmZXRjaC5cbiAqICAgICBwcm90ZWN0ZWQgYXN5bmMgc3luYyhcbiAqICAgICAgICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRyYWNrPlxuICogICAgICk6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+PiB7XG4gKiAgICAgICAgIC8vIHNvbWUgc3BlY2lmaWMgaW1wbGVtZW50YXRpb24gaGVyZS5cbiAqICAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBjdXN0b21Qcm92aWRlcihvcHRpb25zKTtcbiAqICAgICAgICAgcmV0dXJuIHtcbiAqICAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gKiAgICAgICAgICAgICBpdGVtcyxcbiAqICAgICAgICAgICAgIG9wdGlvbnMsXG4gKiAgICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+O1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gY29udmVydCBhIHJlc3BvbnNlIGludG8gYSBsaXN0IG9mIG1vZGVscy5cbiAqICAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IENvbGxlY3Rpb25TZWVkW10pOiBUcmFja0F0dHJpYnV0ZVtdIHtcbiAqICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLm1hcChzZWVkID0+IHtcbiAqICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBzZWVkLnJlbGVhc2VEYXRlO1xuICogICAgICAgICAgICAgc2VlZC5yZWxlYXNlRGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICogICAgICAgICAgICAgcmV0dXJuIHNlZWQ7XG4gKiAgICAgICAgIH0pIGFzIFRyYWNrQXR0cmlidXRlW107XG4gKiAgICAgIH1cbiAqIH1cbiAqXG4gKiBsZXQgc2VlZHM6IFRyYWNrQXR0cmlidXRlW107XG4gKlxuICogY29uc3QgcGxheWxpc3QgPSBuZXcgUGxheWxpc3Qoc2VlZHMsIHtcbiAqICAgICAvLyBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnNcbiAqICAgICBxdWVyeU9wdGlvbnM6IHtcbiAqICAgICAgICAgc29ydEtleXM6IFtcbiAqICAgICAgICAgICAgIHsgbmFtZTogJ3RpdGxlJywgb3JkZXI6IFNvcnRPcmRlci5ERVNDLCB0eXBlOiAnc3RyaW5nJyB9LFxuICogICAgICAgICBdLFxuICogICAgIH1cbiAqIH0pO1xuICpcbiAqIGF3YWl0IHBsYXlsaXN0LnJlcXVlcnkoKTtcbiAqXG4gKiBmb3IgKGNvbnN0IHRyYWNrIG9mIHBsYXlsaXN0KSB7XG4gKiAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodHJhY2sudG9KU09OKCkpKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29sbGVjdGlvbjxcbiAgICBUTW9kZWwgZXh0ZW5kcyBvYmplY3QgPSBhbnksXG4gICAgVEV2ZW50IGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4gPSBDb2xsZWN0aW9uRXZlbnQ8VE1vZGVsPixcbiAgICBUS2V5IGV4dGVuZHMgS2V5czxUTW9kZWw+ID0gS2V5czxUTW9kZWw+XG4+IGV4dGVuZHMgRXZlbnRTb3VyY2U8VEV2ZW50PiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFRNb2RlbD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE1vZGVsIGNvbnN0cnVjdG9yLiA8YnI+XG4gICAgICogICAgIFRoZSBjb25zdHJ1Y3RvciBpcyB1c2VkIGludGVybmFsbHkgYnkgdGhpcyBbW0NvbGxlY3Rpb25dXSBjbGFzcyBmb3IgW1tUTW9kZWxdXSBjb25zdHJ1Y3Rpb24uXG4gICAgICogQGphIE1vZGVsIOOCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gICAgICogICAgIFtbQ29sbGVjdGlvbl1dIOOCr+ODqeOCueOBjCBbW1RNb2RlbF1dIOOCkuani+evieOBmeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCi1xuICAgICAqL1xuICAgIHN0YXRpYyByZWFkb25seSBtb2RlbD86IENsYXNzO1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGNvbnN0cnVjdGlvbi9kZXN0cnVjdGlvbjpcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM/OiBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbW9kZWxPcHRpb25zOiB7fSwgcXVlcnlPcHRpb25zOiB7fSB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucywgcXVlcnlPcHRpb25zIH0gPSBvcHRzO1xuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0ge1xuICAgICAgICAgICAgY29uc3RydWN0T3B0aW9uczogb3B0cyxcbiAgICAgICAgICAgIHByb3ZpZGVyOiBvcHRzLnByb3ZpZGVyIHx8IHRoaXMuc3luYy5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdjb2xsZWN0aW9uOicsIDgpLFxuICAgICAgICAgICAgcXVlcnlPcHRpb25zLFxuICAgICAgICAgICAgcXVlcnlJbmZvOiB7fSxcbiAgICAgICAgICAgIG1vZGVsT3B0aW9ucyxcbiAgICAgICAgICAgIGJ5SWQ6IG5ldyBNYXA8c3RyaW5nLCBUTW9kZWw+KCksXG4gICAgICAgICAgICBzdG9yZTogW10sXG4gICAgICAgIH0gYXMgdW5rbm93biBhcyBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuXG4gICAgICAgIC8qIG1vZGVsIGV2ZW50IGhhbmRsZXIgKi9cbiAgICAgICAgKHRoaXMgYXMgYW55KVtfb25Nb2RlbEV2ZW50XSA9IChldmVudDogc3RyaW5nLCBtb2RlbDogVE1vZGVsIHwgdW5kZWZpbmVkLCBjb2xsZWN0aW9uOiB0aGlzLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGV2ZW50KSAmJiBldmVudC5zdGFydHNXaXRoKCdAJykgJiYgbW9kZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoKCdAYWRkJyA9PT0gZXZlbnQgfHwgJ0ByZW1vdmUnID09PSBldmVudCkgJiYgY29sbGVjdGlvbiAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgnQGRlc3Ryb3knID09PSBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtb2RlbCBldmVudCBhcmd1bWVudHMgYWRqdXN0bWVudC5cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IChjb2xsZWN0aW9uIGFzIGFueSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzOyAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKG1vZGVsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnN0YXJ0c1dpdGgoJ0BjaGFuZ2UnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtb2RlbCBldmVudCBhcmd1bWVudHMgYWRqdXN0bWVudC5cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gdGhpczsgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICAgICAgICAgICAgICBpZiAoJ0BjaGFuZ2UnID09PSBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaWRzID0gZ2V0Q2hhbmdlZElkcyhtb2RlbCwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBpZCwgcHJldklkIH0gPSBpZHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZJZCAhPT0gaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnlJZC5zZXQoaWQsIG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gcHJldklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLmRlbGV0ZShwcmV2SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGRlbGVnYXRlIGV2ZW50XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyLmNhbGwodGhpcywgZXZlbnQsIG1vZGVsLCBjb2xsZWN0aW9uLCBvcHRpb25zKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11c2VsZXNzLWNhbGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2VlZHMpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIEluaXRpYWxpemUgcXVlcnkgaW5mb1xuICAgICAqIEBqYSDjgq/jgqjjg6rmg4XloLHjga7liJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaW5pdFF1ZXJ5SW5mbygpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKHRoaXMuX2RlZmF1bHRRdWVyeU9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9xdWVyeUluZm8gPSB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlZCBhbGwgaW5zdGFuY2VzIGFuZCBldmVudCBsaXN0ZW5lciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44KS56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyAocmVzZXJ2ZWQpLlxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzICjkuojntIQpXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2Uob3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdGhpcyB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IFtdO1xuICAgICAgICB0aGlzLmluaXRRdWVyeUluZm8oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBqYSBDbGVhciBjYWNoZSBpbnN0YW5jZSBtZXRob2RcbiAgICAgKiBAamEg44Kt44Oj44OD44K344Ol44Gu56C05qOEXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9xdWVyeUluZm8uY2FjaGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OIIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbW9kZWxzLlxuICAgICAqIEBqYSBNb2RlbCDjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgbW9kZWxzKCk6IHJlYWRvbmx5IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3QgeyBfcXVlcnlGaWx0ZXIsIF9hZnRlckZpbHRlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAoX2FmdGVyRmlsdGVyICYmIF9hZnRlckZpbHRlciAhPT0gX3F1ZXJ5RmlsdGVyKSA/IHN0b3JlLmZpbHRlcihfYWZ0ZXJGaWx0ZXIpIDogc3RvcmU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG51bWJlciBvZiBtb2RlbHMuXG4gICAgICogQGphIOWGheWMheOBmeOCiyBNb2RlbCDmlbBcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVscy5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGFwcGxpZWQgYWZ0ZXItZmlsdGVyLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jgYzpgannlKjjgZXjgozjgabjgYTjgovjgYvjgpLliKTlrppcbiAgICAgKi9cbiAgICBnZXQgZmlsdGVyZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9xdWVyeUluZm8oKTogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0gaW5zdGFuY2VcbiAgICAgKiBAamEgW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIHNldCBfcXVlcnlJbmZvKHZhbDogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbyA9IHZhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNyZWF0aW5nIG9wdGlvbnMuXG4gICAgICogQGphIOani+evieaZguOBruOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX29wdGlvbnMoKTogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb25zdHJ1Y3RPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwcm92aWRlci5cbiAgICAgKiBAamEg5pei5a6a44Gu44OX44Ot44OQ44Kk44OA44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJvdmlkZXIoKTogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByb3ZpZGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwYXJzZSBiZWhhdmlvdXIuXG4gICAgICogQGphIOaXouWumuOBriBwYXJzZSDli5XkvZzjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UGFyc2UoKTogYm9vbGVhbiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zLnBhcnNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDml6Llrprjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDmnIDlvozjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9sYXN0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgICAgIGNvbnN0IG9wdHM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4gPSB7fTtcblxuICAgICAgICBzb3J0S2V5cy5sZW5ndGggJiYgKG9wdHMuc29ydEtleXMgPSBzb3J0S2V5cyk7XG4gICAgICAgIGNvbXBhcmF0b3JzLmxlbmd0aCAmJiAob3B0cy5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzKTtcbiAgICAgICAgZmlsdGVyICYmIChvcHRzLmZpbHRlciA9IGZpbHRlcik7XG5cbiAgICAgICAgcmV0dXJuIG9wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBzb3J0IGNvbXBhcmF0b3JzLlxuICAgICAqIEBqYSDjgr3jg7zjg4jnlKjmr5TovIPplqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VE1vZGVsPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHF1ZXJ5LWZpbHRlci5cbiAgICAgKiBAamEg44Kv44Ko44Oq55So44OV44Kj44Or44K/6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlGaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uZmlsdGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gYWZ0ZXItZmlsdGVyLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hZnRlckZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHV0aWxzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGEgbW9kZWwgZnJvbSBhIGNvbGxlY3Rpb24sIHNwZWNpZmllZCBieSBhbiBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2UuXG4gICAgICogQGphIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCueOBi+OCiSBNb2RlbCDjgpLnibnlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgICBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KHNlZWQ6IHN0cmluZyB8IG9iamVjdCB8IHVuZGVmaW5lZCk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChudWxsID09IHNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoaXNTdHJpbmcoc2VlZCkgJiYgYnlJZC5oYXMoc2VlZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBieUlkLmdldChzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gZ2V0TW9kZWxJZChpc01vZGVsKHNlZWQpID8gc2VlZC50b0pTT04oKSA6IHNlZWQgYXMgb2JqZWN0LCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgY29uc3QgY2lkID0gKHNlZWQgYXMgb2JqZWN0IGFzIHsgX2NpZD86IHN0cmluZzsgfSkuX2NpZDtcblxuICAgICAgICByZXR1cm4gYnlJZC5nZXQoaWQpIHx8IChjaWQgJiYgYnlJZC5nZXQoY2lkKSkgYXMgVE1vZGVsIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgbW9kZWwgaXMgaW4gdGhlIGNvbGxlY3Rpb24gYnkgYW4gYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlLlxuICAgICAqIEBqYSBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrnjgYvjgokgTW9kZWwg44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGhhcyhzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5nZXQoc2VlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIGNvcHkgb2YgdGhlIG1vZGVsJ3MgYGF0dHJpYnV0ZXNgIG9iamVjdC5cbiAgICAgKiBAamEgTW9kZWwg5bGe5oCn5YCk44Gu44Kz44OU44O844KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHRvSlNPTigpOiBvYmplY3RbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVscy5tYXAobSA9PiBpc01vZGVsKG0pID8gbS50b0pTT04oKSA6IG0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlcyBDbG9uZSB0aGlzIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7opIfoo73jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb25zdHJ1Y3RvciwgX29wdGlvbnMgfSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgKGNvbnN0cnVjdG9yIGFzIENvbnN0cnVjdG9yPHRoaXM+KSh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgX29wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBhIGNvbGxlY3Rpb24gdG8gcmUtc29ydCBpdHNlbGYuXG4gICAgICogQGphIENvbGxlY3Rpb24g6KaB57Sg44Gu5YaN44K944O844OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc29ydCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44K944O844OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNvcnQob3B0aW9ucz86IENvbGxlY3Rpb25SZVNvcnRPcHRpb25zPFRNb2RlbCwgVEtleT4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHsgbm9UaHJvdywgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKG9wdHMpO1xuICAgICAgICBjb25zdCBjb21wYXJhdG9ycyA9IDAgPCBjb21wcy5sZW5ndGggPyBjb21wcyA6IHRoaXMuX2NvbXBhcmF0b3JzO1xuXG4gICAgICAgIGlmIChjb21wYXJhdG9ycy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaWYgKG5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMsICdDYW5ub3Qgc29ydCBhIHNldCB3aXRob3V0IGEgY29tcGFyYXRvci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gc2VhcmNoSXRlbXModGhpc1tfcHJvcGVydGllc10uc3RvcmUsIHRoaXMuX2FmdGVyRmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHF1ZXJ5SW5mb1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycztcbiAgICAgICAgaWYgKDAgPCBzb3J0S2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5zb3J0S2V5cyA9IHNvcnRLZXlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0Bzb3J0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBseSBhZnRlci1maWx0ZXIgdG8gY29sbGVjdGlvbiBpdHNlbGYuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBmaWx0ZXIgY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXIoY2FsbGJhY2s6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbHkgYWZ0ZXItZmlsdGVyIHRvIGNvbGxlY3Rpb24gaXRzZWxmLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZnRlci1maWx0ZXIgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOe1nuOCiui+vOOBv+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXIob3B0aW9uczogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUTW9kZWw+KTogdGhpcztcblxuICAgIHB1YmxpYyBmaWx0ZXIoLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBwYXJzZUZpbHRlckFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IHsgZmlsdGVyLCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGlmIChmaWx0ZXIgIT09IHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlciA9IGZpbHRlcjtcbiAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGZpbHRlcicsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbW9kZWwgYXQgdGhlIGdpdmVuIGluZGV4LiBJZiBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiwgdGhlIHRhcmdldCB3aWxsIGJlIGZvdW5kIGZyb20gdGhlIGxhc3QgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBq+OCiOOCiyBNb2RlbCDjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXQoaW5kZXg6IG51bWJlcik6IFRNb2RlbCB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLm1vZGVscyBhcyBUTW9kZWxbXSwgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSBNb2RlbCDjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoKTogVE1vZGVsIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdmFsdWUgb2YgYGNvdW50YCBlbGVtZW50cyBvZiB0aGUgbW9kZWwgZnJvbSB0aGUgZmlyc3QuXG4gICAgICogQGphIE1vZGVsIOOBruWFiOmgreOBi+OCiWBjb3VudGAg5YiG44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBmaXJzdChjb3VudD86IG51bWJlcik6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMubW9kZWxzO1xuICAgICAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0cy5zbGljZSgwLCBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSBNb2RlbCDjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBUTW9kZWwgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiBgY291bnRgIGVsZW1lbnRzIG9mIHRoZSBtb2RlbCBmcm9tIHRoZSBsYXN0LlxuICAgICAqIEBqYSBNb2RlbCDjga7lhYjpoK3jgYvjgolgY291bnRgIOWIhuOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBsYXN0KGNvdW50PzogbnVtYmVyKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5tb2RlbHM7XG4gICAgICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0c1t0YXJnZXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHMuc2xpY2UoLTEgKiBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIGNvbGxlY3Rpb24uIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IENvbGxlY3Rpb25TZWVkIHwgQ29sbGVjdGlvblNlZWRbXSB8IHZvaWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSB8IHVuZGVmaW5lZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUTW9kZWxbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIFtbZmV0Y2hdXSBtZXRob2QgcHJveHkgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggW1tDb2xsZWN0aW9uSXRlbVByb3ZpZGVyXV0gcmV0dXJucyBvbmUtc2hvdCByZXN1bHQuXG4gICAgICogQGphIFtbQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcl1dIOS6kuaPm+OBruWNmOeZuuOBriBmZXRjaCDntZDmnpzjgpLov5TljbQuIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBhc3luYyBzeW5jKG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBkZWZhdWx0U3luYygpLnN5bmMoJ3JlYWQnLCB0aGlzIGFzIFN5bmNDb250ZXh0LCBvcHRpb25zKSBhcyBUTW9kZWxbXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGZXRjaCB0aGUgW1tNb2RlbF1dIGZyb20gdGhlIHNlcnZlciwgbWVyZ2luZyB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgbW9kZWwncyBsb2NhbCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSBbW01vZGVsXV0g5bGe5oCn44Gu44K144O844OQ44O85ZCM5pyfLiDjg6zjgrnjg53jg7Pjgrnjga7jg57jg7zjgrjjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBmZXRjaCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44OV44Kn44OD44OB44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGZldGNoKG9wdGlvbnM/OiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4pOiBQcm9taXNlPG9iamVjdFtdPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcHJvZ3Jlc3M6IG5vb3AgfSwgdGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcHJvZ3Jlc3M6IG9yaWdpbmFsLCBsaW1pdCwgcmVzZXQsIG5vQ2FjaGUgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCB7IF9xdWVyeUluZm8sIF9wcm92aWRlciB9ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsaXplID0gKG51bGwgPT0gbGltaXQpO1xuXG4gICAgICAgICAgICBvcHRzLnByb2dyZXNzID0gKGluZm86IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VE1vZGVsPikgPT4ge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsKGluZm8pO1xuICAgICAgICAgICAgICAgICFmaW5hbGl6ZSAmJiB0aGlzLmFkZChpbmZvLml0ZW1zLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChub0NhY2hlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZmluYWxpemUgJiYgcmVzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KHVuZGVmaW5lZCwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBxdWVyeUl0ZW1zKF9xdWVyeUluZm8sIF9wcm92aWRlciwgb3B0cyk7XG5cbiAgICAgICAgICAgIGlmIChmaW5hbGl6ZSkge1xuICAgICAgICAgICAgICAgIHJlc2V0ID8gdGhpcy5yZXNldChyZXNwLCBvcHRzKSA6IHRoaXMuYWRkKHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgQ29sbGVjdGlvbiwgcmVzcCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGVycm9yJywgdW5kZWZpbmVkLCB0aGlzIGFzIENvbGxlY3Rpb24sIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGBmZXRjaCgpYCB3aXRoIGxhc3QgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5YmN5Zue44Go5ZCM5p2h5Lu244GnIGBmZXRjaCgpYCDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXF1ZXJ5IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVxdWVyeShvcHRpb25zPzogQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zKTogUHJvbWlzZTxvYmplY3RbXT4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fbGFzdFF1ZXJ5T3B0aW9ucywgb3B0aW9ucywgeyByZXNldDogdHJ1ZSB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2gob3B0cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogY29sbGVjdGlvbiBzZXR1cFxuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44GrIE1vZGVsIOOBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GEIE1vZGVsIOOBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgTnVsbGlzaCB2YWx1ZS5cbiAgICAgKiAgLSBgamFgIE51bGxpc2gg6KaB57SgXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiB1bmRlZmluZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIENvbGxlY3Rpb24g44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgasgTW9kZWwg44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYQgTW9kZWwg44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44GrIE1vZGVsIOOBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GEIE1vZGVsIOOBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkczogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBzZXQoc2VlZHM/OiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHZvaWQge1xuICAgICAgICBpZiAoaXNOdWxsaXNoKHNlZWRzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwYXJzZTogdGhpcy5fZGVmYXVsdFBhcnNlIH0sIF9zZXRPcHRpb25zLCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBpZiAob3B0cy5wYXJzZSAmJiAhaXNDb2xsZWN0aW9uTW9kZWwoc2VlZHMsIHRoaXMpKSB7XG4gICAgICAgICAgICBzZWVkcyA9IHRoaXMucGFyc2Uoc2VlZHMsIG9wdGlvbnMpIHx8IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2luZ3VsYXIgPSAhaXNBcnJheShzZWVkcyk7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiAoVE1vZGVsIHwgb2JqZWN0IHwgdW5kZWZpbmVkKVtdID0gc2luZ3VsYXIgPyBbc2VlZHNdIDogKHNlZWRzIGFzIG9iamVjdFtdKS5zbGljZSgpO1xuXG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuXG4gICAgICAgIGNvbnN0IGF0ID0gKChjYW5kaWRhdGUpOiBudW1iZXIgfCB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPiBzdG9yZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlICs9IHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChjYW5kaWRhdGUgPCAwKSA/IDAgOiBjYW5kaWRhdGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKG9wdHMuYXQpO1xuXG4gICAgICAgIGNvbnN0IHNldDogb2JqZWN0W10gICAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b0FkZDogVE1vZGVsW10gICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9NZXJnZTogVE1vZGVsW10gID0gW107XG4gICAgICAgIGNvbnN0IHRvUmVtb3ZlOiBUTW9kZWxbXSA9IFtdO1xuICAgICAgICBjb25zdCBtb2RlbFNldCA9IG5ldyBTZXQ8b2JqZWN0PigpO1xuXG4gICAgICAgIGNvbnN0IHsgYWRkLCBtZXJnZSwgcmVtb3ZlLCBwYXJzZSwgc2lsZW50IH0gPSBvcHRzO1xuXG4gICAgICAgIGxldCBzb3J0ID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHNvcnRhYmxlID0gdGhpcy5fY29tcGFyYXRvcnMubGVuZ3RoICYmIG51bGwgPT0gYXQgJiYgZmFsc2UgIT09IG9wdHMuc29ydDtcblxuICAgICAgICB0eXBlIE1vZGVsRmVhdHVyZSA9IHtcbiAgICAgICAgICAgIHBhcnNlOiAoYXRycj86IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gb2JqZWN0O1xuICAgICAgICAgICAgc2V0QXR0cmlidXRlczogKGF0cnI6IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gdm9pZDtcbiAgICAgICAgICAgIGhhc0NoYW5nZWQ6ICgpID0+IGJvb2xlYW47XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVHVybiBiYXJlIG9iamVjdHMgaW50byBtb2RlbCByZWZlcmVuY2VzLCBhbmQgcHJldmVudCBpbnZhbGlkIG1vZGVscyBmcm9tIGJlaW5nIGFkZGVkLlxuICAgICAgICBmb3IgKGNvbnN0IFtpLCBpdGVtXSBvZiBpdGVtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vIElmIGEgZHVwbGljYXRlIGlzIGZvdW5kLCBwcmV2ZW50IGl0IGZyb20gYmVpbmcgYWRkZWQgYW5kIG9wdGlvbmFsbHkgbWVyZ2UgaXQgaW50byB0aGUgZXhpc3RpbmcgbW9kZWwuXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZ2V0KGl0ZW0pIGFzIE1vZGVsRmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIGlmIChtZXJnZSAmJiBpdGVtICE9PSBleGlzdGluZykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cnMgPSBpc01vZGVsKGl0ZW0pID8gaXRlbS50b0pTT04oKSA6IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZSAmJiBpc0Z1bmN0aW9uKGV4aXN0aW5nLnBhcnNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMgPSBleGlzdGluZy5wYXJzZShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihleGlzdGluZy5zZXRBdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmcuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0b01lcmdlLnB1c2goZXhpc3RpbmcgYXMgVE1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRhYmxlICYmICFzb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0ID0gaXNGdW5jdGlvbihleGlzdGluZy5oYXNDaGFuZ2VkKSA/IGV4aXN0aW5nLmhhc0NoYW5nZWQoKSA6IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMoZXhpc3RpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXRlbXNbaV0gPSBleGlzdGluZztcbiAgICAgICAgICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBicmFjZS1zdHlsZVxuXG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmV3LCB2YWxpZCBtb2RlbCwgcHVzaCBpdCB0byB0aGUgYHRvQWRkYCBsaXN0LlxuICAgICAgICAgICAgZWxzZSBpZiAoYWRkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBpdGVtc1tpXSA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oaXRlbSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQWRkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19hZGRSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxTZXQuYWRkKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBzdGFsZSBtb2RlbHMuXG4gICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGVsU2V0Lmhhcyhtb2RlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9SZW1vdmUucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXNbX3JlbW92ZU1vZGVsc10odG9SZW1vdmUsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2VlIGlmIHNvcnRpbmcgaXMgbmVlZGVkLCB1cGRhdGUgYGxlbmd0aGAgYW5kIHNwbGljZSBpbiBuZXcgbW9kZWxzLlxuICAgICAgICBsZXQgb3JkZXJDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHJlcGxhY2UgPSAhc29ydGFibGUgJiYgYWRkICYmIHJlbW92ZTtcbiAgICAgICAgaWYgKHNldC5sZW5ndGggJiYgcmVwbGFjZSkge1xuICAgICAgICAgICAgb3JkZXJDaGFuZ2VkID0gKHN0b3JlLmxlbmd0aCAhPT0gc2V0Lmxlbmd0aCkgfHwgc3RvcmUuc29tZSgobSwgaW5kZXgpID0+IG0gIT09IHNldFtpbmRleF0pO1xuICAgICAgICAgICAgc3RvcmUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCBzZXQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHRvQWRkLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHNvcnRhYmxlKSB7XG4gICAgICAgICAgICAgICAgc29ydCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgdG9BZGQsIG51bGwgPT0gYXQgPyBzdG9yZS5sZW5ndGggOiBhdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaWxlbnRseSBzb3J0IHRoZSBjb2xsZWN0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICBpZiAoc29ydCkge1xuICAgICAgICAgICAgdGhpcy5zb3J0KHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sZXNzIHNpbGVuY2VkLCBpdCdzIHRpbWUgdG8gZmlyZSBhbGwgYXBwcm9wcmlhdGUgYWRkL3NvcnQvdXBkYXRlIGV2ZW50cy5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2ksIG1vZGVsXSBvZiB0b0FkZC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBhdCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gYXQgKyBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQGFkZCcsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAYWRkJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvcnQgfHwgb3JkZXJDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvQWRkLmxlbmd0aCB8fCB0b1JlbW92ZS5sZW5ndGggfHwgdG9NZXJnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZGVkOiB0b0FkZCxcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZDogdG9SZW1vdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lcmdlZDogdG9NZXJnZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkcm9wIHVuZGVmaW5lZFxuICAgICAgICBjb25zdCByZXR2YWwgPSBpdGVtcy5maWx0ZXIoaSA9PiBudWxsICE9IGkpIGFzIFRNb2RlbFtdO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgYWRkZWQgKG9yIG1lcmdlZCkgbW9kZWwgKG9yIG1vZGVscykuXG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJldHZhbFswXSA6IChyZXR2YWwubGVuZ3RoID8gcmV0dmFsIDogdm9pZCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBhIGNvbGxlY3Rpb24gd2l0aCBhIG5ldyBsaXN0IG9mIG1vZGVscyAob3IgYXR0cmlidXRlIGhhc2hlcyksIHRyaWdnZXJpbmcgYSBzaW5nbGUgYHJlc2V0YCBldmVudCBvbiBjb21wbGV0aW9uLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOCkuaWsOOBl+OBhCBNb2RlbCDkuIDopqfjgafnva7mj5suIOWujOS6huaZguOBqyBgcmVzZXRgIOOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44K744OD44OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KHNlZWRzPzogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyAmIHsgcHJldmlvdXM6IFRNb2RlbFtdOyB9O1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLnByZXZpb3VzID0gc3RvcmUuc2xpY2UoKTtcbiAgICAgICAgcmVzZXRNb2RlbFN0b3JlKHRoaXNbX3Byb3BlcnRpZXNdKTtcblxuICAgICAgICBjb25zdCBtb2RlbHMgPSBzZWVkcyA/IHRoaXMuYWRkKHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKSA6IFtdO1xuXG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0ByZXNldCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9kZWxzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgbW9kZWwgdG8gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIENvbGxlY3Rpb24g44G444GuIE1vZGVsIOOBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHRvIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiBAamEgTW9kZWwg44Oq44K544OI5oyH5a6a44Gr44KI44KLIENvbGxlY3Rpb24g44G444Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkczogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBhZGQoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0KHNlZWRzIGFzIFVua25vd25PYmplY3QsIE9iamVjdC5hc3NpZ24oeyBtZXJnZTogZmFsc2UgfSwgb3B0aW9ucywgX2FkZE9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBi+OCiSBNb2RlbCDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIGxpc3Qgb2YgbW9kZWxzIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEgTW9kZWwg44Oq44K544OI5oyH5a6a44Gr44KI44KLIENvbGxlY3Rpb24g44GL44KJ44Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHNpbmd1bGFyID8gW3NlZWRzIGFzIFRNb2RlbF0gOiAoc2VlZHMgYXMgVE1vZGVsW10pLnNsaWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSB0aGlzW19yZW1vdmVNb2RlbHNdKGl0ZW1zLCBvcHRzKTtcbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCAmJiByZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0geyBhZGRlZDogW10sIG1lcmdlZDogW10sIHJlbW92ZWQgfTtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJlbW92ZWRbMF0gOiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBtb2RlbCB0byB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7jgasgTW9kZWwg44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcHVzaChzZWVkOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiB0aGlzLmFkZChzZWVkLCBPYmplY3QuYXNzaWduKHsgYXQ6IHN0b3JlLmxlbmd0aCB9LCBvcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIGVuZCBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+44GuIE1vZGVsIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFNpbGVuY2VhYmxlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBTaWxlbmNlYWJsZSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcG9wKG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc3RvcmVbc3RvcmUubGVuZ3RoIC0gMV0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBtb2RlbCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3jgasgTW9kZWwg44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5zaGlmdChzZWVkOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNlZWQsIE9iamVjdC5hc3NpZ24oeyBhdDogMCB9LCBvcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt44GuIE1vZGVsIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFNpbGVuY2VhYmxlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBTaWxlbmNlYWJsZSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2hpZnQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZShzdG9yZVswXSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiBhIG1vZGVsIGluIHRoaXMgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5paw44GX44GEIE1vZGVsIOOCpOODs+OCueOCv+ODs+OCueOCkuS9nOaIkOOBlywgQ29sbGVjdGlvbiDjgavov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhdHRyc1xuICAgICAqICAtIGBlbmAgYXR0cmlidXRlcyBvYmplY3QuXG4gICAgICogIC0gYGphYCDlsZ7mgKfjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgbW9kZWwgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBNb2RlbCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgY3JlYXRlKGF0dHJzOiBvYmplY3QsIG9wdGlvbnM/OiBNb2RlbFNhdmVPcHRpb25zKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgeyB3YWl0IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBzZWVkID0gdGhpc1tfcHJlcGFyZU1vZGVsXShhdHRycywgb3B0aW9ucyBhcyBTaWxlbmNlYWJsZSk7XG4gICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1vZGVsID0gaXNNb2RlbChzZWVkKSA/IHNlZWQgOiB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghd2FpdCB8fCAhbW9kZWwpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKHNlZWQsIG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbW9kZWwuc2F2ZSh1bmRlZmluZWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAod2FpdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGQoc2VlZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BlcnJvcicsIG1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2VlZDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIG1vZGVsIHByZXBhcmF0aW9uICovXG4gICAgcHJpdmF0ZSBbX3ByZXBhcmVNb2RlbF0oYXR0cnM6IG9iamVjdCB8IFRNb2RlbCB8IHVuZGVmaW5lZCwgb3B0aW9uczogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoaXNDb2xsZWN0aW9uTW9kZWwoYXR0cnMsIHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXR0cnM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb25zdHJ1Y3RvciA9IG1vZGVsQ29uc3RydWN0b3IodGhpcyk7XG4gICAgICAgIGNvbnN0IHsgbW9kZWxPcHRpb25zIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgbW9kZWxPcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gbmV3IGNvbnN0cnVjdG9yKGF0dHJzLCBvcHRzKSBhcyB7IHZhbGlkYXRlOiAoKSA9PiBSZXN1bHQ7IH07XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihtb2RlbC52YWxpZGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtb2RlbC52YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BpbnZhbGlkJywgYXR0cnMgYXMgTW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgcmVzdWx0LCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbW9kZWwgYXMgVE1vZGVsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcGxhaW4gb2JqZWN0XG4gICAgICAgIHJldHVybiBhdHRycyBhcyBUTW9kZWw7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgY2FsbGVkIGJ5IGJvdGggcmVtb3ZlIGFuZCBzZXQuICovXG4gICAgcHJpdmF0ZSBbX3JlbW92ZU1vZGVsc10obW9kZWxzOiBUTW9kZWxbXSwgb3B0aW9uczogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBjb25zdCByZW1vdmVkOiBUTW9kZWxbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG1kbCBvZiBtb2RlbHMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gdGhpcy5nZXQobWRsKTtcbiAgICAgICAgICAgIGlmICghbW9kZWwpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHN0b3JlLmluZGV4T2YobW9kZWwpO1xuICAgICAgICAgICAgc3RvcmUuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlZmVyZW5jZXMgYmVmb3JlIHRyaWdnZXJpbmcgJ3JlbW92ZScgZXZlbnQgdG8gcHJldmVudCBhbiBpbmZpbml0ZSBsb29wLlxuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50QnJva2VyKSkge1xuICAgICAgICAgICAgICAgICAgICAobW9kZWwgYXMgTW9kZWwpLnRyaWdnZXIoJ0ByZW1vdmUnLCBtb2RlbCBhcyBNb2RlbCwgdGhpcywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHJlbW92ZScsIG1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVtb3ZlZDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCB0byBjcmVhdGUgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19hZGRSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgY29uc3QgeyBfY2lkLCBpZCB9ID0gbW9kZWwgYXMgeyBfY2lkOiBzdHJpbmc7IGlkOiBzdHJpbmc7IH07XG4gICAgICAgIGlmIChudWxsICE9IF9jaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuc2V0KF9jaWQsIG1vZGVsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoaWQsIG1vZGVsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRQdWJsaXNoZXIpKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKG1vZGVsIGFzIFN1YnNjcmliYWJsZSwgJyonLCAodGhpcyBhcyBhbnkpW19vbk1vZGVsRXZlbnRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIHNldmVyIGEgbW9kZWwncyB0aWVzIHRvIGEgY29sbGVjdGlvbi4gKi9cbiAgICBwcml2YXRlIFtfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbDogVE1vZGVsLCBwYXJ0aWFsID0gZmFsc2UpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgY29uc3QgeyBfY2lkLCBpZCB9ID0gbW9kZWwgYXMgeyBfY2lkOiBzdHJpbmc7IGlkOiBzdHJpbmc7IH07XG4gICAgICAgIGlmIChudWxsICE9IF9jaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKF9jaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLmRlbGV0ZShpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXJ0aWFsICYmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcobW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsICh0aGlzIGFzIGFueSlbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSXRlcmFibGU8VE1vZGVsPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMubW9kZWxzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VE1vZGVsPiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRlciA8IHRoaXMuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYmFzZVt0aGlzLnBvaW50ZXIrK10sXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yIGFzIEl0ZXJhdG9yPFRNb2RlbD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5KGlkKSwgdmFsdWUobW9kZWwpIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpZCksIHZhbHVlKG1vZGVsKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgVE1vZGVsXT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaWQpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUTW9kZWw+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gdmFsdWUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGl0ZXJhdG9yIGNyZWF0ZSBmdW5jdGlvbiAqL1xuICAgIHByaXZhdGUgW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXTxSPih2YWx1ZUdlbmVyYXRvcjogKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLm1vZGVscyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcG9zMmtleSA9IChwb3M6IG51bWJlcik6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0TW9kZWxJZChjb250ZXh0LmJhc2VbcG9zXSwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSkgfHwgU3RyaW5nKHBvcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4gPSB7XG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFI+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY29udGV4dC5wb2ludGVyO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgY29udGV4dC5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBvaW50ZXIrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlR2VuZXJhdG9yKHBvczJrZXkoY3VycmVudCksIGNvbnRleHQuYmFzZVtjdXJyZW50XSksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gaXRlcmF0b3I7XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoQ29sbGVjdGlvbiBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiIsImltcG9ydCB0eXBlIHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgdHlwZSB7IExpc3RDaGFuZ2VkLCBMaXN0RWRpdE9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBjbGVhckFycmF5LFxuICAgIGFwcGVuZEFycmF5LFxuICAgIGluc2VydEFycmF5LFxuICAgIHJlb3JkZXJBcnJheSxcbiAgICByZW1vdmVBcnJheSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgdHlwZSB7IENvbGxlY3Rpb24gfSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiBFZGl0ZWQgY29sbGVjdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEg6KKr57eo6ZuGIENvbGxlY3Rpb24g44Gu5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIENvbGxlY3Rpb25FZGl0ZWU8TSBleHRlbmRzIG9iamVjdD4gPSBDb2xsZWN0aW9uPE0sIGFueSwgYW55PjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHByZXBhcmU8VCBleHRlbmRzIG9iamVjdD4oY29sbGVjdGlvbjogQ29sbGVjdGlvbjxUPik6IFRbXSB8IG5ldmVyIHtcbiAgICBpZiAoY29sbGVjdGlvbi5maWx0ZXJlZCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19FRElUX1BFUk1JU1NJT05fREVOSUVELCAnY29sbGVjdGlvbiBpcyBhcHBsaWVkIGFmdGVyLWZpbHRlci4nKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24ubW9kZWxzLnNsaWNlKCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmFzeW5jIGZ1bmN0aW9uIGV4ZWM8VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxUPixcbiAgICBvcHRpb25zOiBMaXN0RWRpdE9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgb3BlcmF0aW9uOiAodGFyZ2V0czogVFtdLCB0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpID0+IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4sXG4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBjb25zdCB0YXJnZXRzID0gcHJlcGFyZTxUPihjb2xsZWN0aW9uKTtcbiAgICBjb25zdCBjaGFuZ2UgPSBhd2FpdCBvcGVyYXRpb24odGFyZ2V0cywgb3B0aW9ucz8uY2FuY2VsKTtcbiAgICBjb2xsZWN0aW9uLnNldCh0YXJnZXRzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gY2hhbmdlO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBtaW4oaW5kaWNlczogbnVtYmVyW10pOiBudW1iZXIge1xuICAgIHJldHVybiBpbmRpY2VzLnJlZHVjZSgobGhzLCByaHMpID0+IE1hdGgubWluKGxocywgcmhzKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIG1ha2VMaXN0Q2hhbmdlZDxUPihcbiAgICB0eXBlOiAnYWRkJyB8ICdyZW1vdmUnIHwgJ3Jlb3JkZXInLFxuICAgIGNoYW5nZXM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10sXG4gICAgcmFuZ2VGcm9tOiBudW1iZXIsXG4gICAgcmFuZ2VUbzogbnVtYmVyLFxuICAgIGF0PzogbnVtYmVyLFxuKTogTGlzdENoYW5nZWQ8VD4ge1xuICAgIGNvbnN0IGNoYW5nZWQgPSAhIWNoYW5nZXMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIGxpc3Q6IGNoYW5nZXMsXG4gICAgICAgIHJhbmdlOiBjaGFuZ2VkID8geyBmcm9tOiByYW5nZUZyb20sIHRvOiByYW5nZVRvIH0gOiB1bmRlZmluZWQsXG4gICAgICAgIGluc2VydGVkVG86IGNoYW5nZWQgPyBhdCA6IHVuZGVmaW5lZCxcbiAgICB9IGFzIExpc3RDaGFuZ2VkPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgZWxlbWVudHMgb2YgW1tDb2xsZWN0aW9uXV0uXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g6KaB57Sg44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYXJDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlVG8gPSBjb2xsZWN0aW9uLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBjbGVhckFycmF5KHRhcmdldHMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVtb3ZlJywgY2hhbmdlcywgMCwgcmFuZ2VUbyk7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBbW0NvbGxlY3Rpb25dXS5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0gcmVmZXJlbmNlLlxuICogIC0gYGphYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZENvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBzcmM6IFRbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gY29sbGVjdGlvbi5sZW5ndGg7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBhcHBlbmRBcnJheSh0YXJnZXRzLCBzcmMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgnYWRkJywgY2hhbmdlcywgcmFuZ2VGcm9tLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIHJhbmdlRnJvbSk7XG59XG5cbi8qKlxuICogQGVuIEluc2VydCBzb3VyY2UgZWxlbWVudHMgdG8gc3BlY2lmaWVkIGluZGV4IG9mIFtbQ29sbGVjdGlvbl1dLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIOOBruaMh+WumuOBl+OBn+S9jee9ruOBq+aMv+WFpVxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCBbW0NvbGxlY3Rpb25dXVxuICogIC0gYGphYCDlr77osaEgW1tDb2xsZWN0aW9uXV1cbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0gcmVmZXJlbmNlLlxuICogIC0gYGphYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydENvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBpbmRleDogbnVtYmVyLFxuICAgIHNyYzogVFtdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGluc2VydEFycmF5KHRhcmdldHMsIGluZGV4LCBzcmMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgnYWRkJywgY2hhbmdlcywgaW5kZXgsIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgaW5kZXgpO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIFtbQ29sbGVjdGlvbl1dIGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCBbW0NvbGxlY3Rpb25dXVxuICogIC0gYGphYCDlr77osaEgW1tDb2xsZWN0aW9uXV1cbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIGVkaXQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIGluZGV4OiBudW1iZXIsXG4gICAgb3JkZXJzOiBudW1iZXJbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gbWluKFtpbmRleCwgLi4ub3JkZXJzXSk7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiByZW9yZGVyQXJyYXkodGFyZ2V0cywgaW5kZXgsIG9yZGVycywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW9yZGVyJywgY2hhbmdlcywgcmFuZ2VGcm9tLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIGluZGV4KTtcbn1cblxuLyoqXG4gKiBAZW4gUmVtb3ZlIFtbQ29sbGVjdGlvbl1dIGVsZW1lbnRzLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIOmgheebruOBruWJiumZpFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCBbW0NvbGxlY3Rpb25dXVxuICogIC0gYGphYCDlr77osaEgW1tDb2xsZWN0aW9uXV1cbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgcmVtb3ZlZCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0gcmVmZXJlbmNlLlxuICogIC0gYGphYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZUNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBvcmRlcnM6IG51bWJlcltdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBtaW4ob3JkZXJzKTtcbiAgICBjb25zdCByYW5nZVRvID0gY29sbGVjdGlvbi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gcmVtb3ZlQXJyYXkodGFyZ2V0cywgb3JkZXJzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3JlbW92ZScsIGNoYW5nZXMsIHJhbmdlRnJvbSwgcmFuZ2VUbyk7XG59XG4iXSwibmFtZXMiOlsiZ2V0TGFuZ3VhZ2UiLCJ0cnVuYyIsIk9ic2VydmFibGVBcnJheSIsImNjIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwidW5pcXVlIiwiY29tcHV0ZURhdGUiLCJpc0Z1bmN0aW9uIiwic29ydCIsInNodWZmbGUiLCJpc1N0cmluZyIsIkV2ZW50U291cmNlIiwibHVpZCIsImlzTW9kZWwiLCJhdCIsImRlZmF1bHRTeW5jIiwibm9vcCIsImlzTnVsbGlzaCIsImlzQXJyYXkiLCJtb2RlbCIsIkV2ZW50QnJva2VyIiwicmVzdWx0IiwiRkFJTEVEIiwiRXZlbnRQdWJsaXNoZXIiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBTWpCOzs7SUFHRztJQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUxELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsd0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSx3QkFBaUQsQ0FBQTtZQUNqRCxXQUFtQyxDQUFBLFdBQUEsQ0FBQSwwQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsb0NBQTZCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBLEdBQUEsMEJBQUEsQ0FBQTtZQUM5SCxXQUFtQyxDQUFBLFdBQUEsQ0FBQSwrQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsb0NBQTZCLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBLEdBQUEsK0JBQUEsQ0FBQTtZQUNuSSxXQUFtQyxDQUFBLFdBQUEsQ0FBQSxrQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsb0NBQTZCLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBLEdBQUEsa0NBQUEsQ0FBQTtJQUM3SSxLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQTs7SUNQRDtJQUNBLElBQUksU0FBUyxHQUFxQixNQUFvQjtJQUNsRCxJQUFBLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDQSxnQkFBVyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3BGLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7SUFTRztJQUNHLFNBQVUsdUJBQXVCLENBQUMsV0FBOEIsRUFBQTtRQUNsRSxJQUFJLElBQUksSUFBSSxXQUFXLEVBQUU7SUFDckIsUUFBQSxPQUFPLFNBQVMsQ0FBQztJQUNwQixLQUFBO0lBQU0sU0FBQTtZQUNILE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQztZQUM5QixTQUFTLEdBQUcsV0FBVyxDQUFDO0lBQ3hCLFFBQUEsT0FBTyxXQUFXLENBQUM7SUFDdEIsS0FBQTtJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ2EsU0FBQSxtQkFBbUIsQ0FBK0IsSUFBTyxFQUFFLEtBQWdCLEVBQUE7SUFDdkYsSUFBQSxPQUFPLENBQUMsR0FBc0IsRUFBRSxHQUFzQixLQUFZOztZQUU5RCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBVyxHQUFHLEVBQUUsQ0FBQztZQUMvRCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBVyxHQUFHLEVBQUUsQ0FBQztZQUMvRCxPQUFPLEtBQUssR0FBRyxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3pELEtBQUMsQ0FBQztJQUNOLENBQUM7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ2EsU0FBQSxpQkFBaUIsQ0FBK0IsSUFBTyxFQUFFLEtBQWdCLEVBQUE7SUFDckYsSUFBQSxPQUFPLENBQUMsR0FBc0IsRUFBRSxHQUFzQixLQUFZO0lBQzlELFFBQUEsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLFFBQUEsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLElBQUksT0FBTyxLQUFLLE9BQU8sRUFBRTs7SUFFckIsWUFBQSxPQUFPLENBQUMsQ0FBQztJQUNaLFNBQUE7aUJBQU0sSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFOztJQUV4QixZQUFBLE9BQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLFNBQUE7aUJBQU0sSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFOztnQkFFeEIsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQ3BCLFNBQUE7SUFBTSxhQUFBO2dCQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMzQyxJQUFJLFFBQVEsS0FBSyxRQUFRLEVBQUU7SUFDdkIsZ0JBQUEsT0FBTyxDQUFDLENBQUM7SUFDWixhQUFBO0lBQU0saUJBQUE7SUFDSCxnQkFBQSxRQUFRLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxLQUFLLEVBQUU7SUFDekQsYUFBQTtJQUNKLFNBQUE7SUFDTCxLQUFDLENBQUM7SUFDTixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7SUFVRztJQUNhLFNBQUEsb0JBQW9CLENBQStCLElBQU8sRUFBRSxLQUFnQixFQUFBO0lBQ3hGLElBQUEsT0FBTyxDQUFDLEdBQXNCLEVBQUUsR0FBc0IsS0FBWTtZQUM5RCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDekIsWUFBQSxPQUFPLENBQUMsQ0FBQztJQUNaLFNBQUE7SUFBTSxhQUFBLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTs7SUFFMUIsWUFBQSxPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUNyQixTQUFBO0lBQU0sYUFBQSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7O2dCQUUxQixPQUFPLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDcEIsU0FBQTtJQUFNLGFBQUE7Z0JBQ0gsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSyxFQUFFO0lBQzNELFNBQUE7SUFDTCxLQUFDLENBQUM7SUFDTixDQUFDO0lBRUQ7OztJQUdHO0FBQ0ksVUFBTSxvQkFBb0IsR0FBRyxxQkFBcUI7SUFFekQ7OztJQUdHO0FBQ0ksVUFBTSxtQkFBbUIsR0FBRyxxQkFBcUI7SUFFeEQ7OztJQUdHO0lBQ0csU0FBVSxZQUFZLENBQStCLE9BQW1CLEVBQUE7UUFDMUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQ3RDLElBQUEsUUFBUSxJQUFJO0lBQ1IsUUFBQSxLQUFLLFFBQVE7SUFDVCxZQUFBLE9BQU8sbUJBQW1CLENBQU8sSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xELFFBQUEsS0FBSyxTQUFTO0lBQ1YsWUFBQSxPQUFPLG9CQUFvQixDQUFPLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNuRCxRQUFBLEtBQUssUUFBUTtJQUNULFlBQUEsT0FBTyxtQkFBbUIsQ0FBTyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEQsUUFBQSxLQUFLLE1BQU07SUFDUCxZQUFBLE9BQU8saUJBQWlCLENBQU8sSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hELFFBQUE7SUFDSSxZQUFBLE9BQU8sb0JBQW9CLENBQU8sSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RELEtBQUE7SUFDTCxDQUFDO0lBRUQ7OztJQUdHO0lBQ0csU0FBVSxlQUFlLENBQStCLFFBQXNCLEVBQUE7UUFDaEYsTUFBTSxXQUFXLEdBQXNCLEVBQUUsQ0FBQztJQUMxQyxJQUFBLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO1lBQzVCLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDM0MsS0FBQTtJQUNELElBQUEsT0FBTyxXQUFXLENBQUM7SUFDdkI7O0lDckpBOzs7OztJQUtHO1VBQ1UsV0FBVyxDQUFBOztJQUVaLElBQUEsTUFBTSxDQUFNOztJQUVaLElBQUEsSUFBSSxDQUFVOztJQUVkLElBQUEsSUFBSSxDQUFVOztJQUVkLElBQUEsTUFBTSxDQUFTO0lBRXZCOzs7Ozs7Ozs7SUFTRztJQUNILElBQUEsV0FBQSxDQUFZLEtBQVUsRUFBRSxZQUFZLEdBQUcsQ0FBQyxFQUFBO0lBQ3BDLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDcEIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztJQUMzQixRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNkLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7SUFDakMsU0FBQTtJQUFNLGFBQUE7Z0JBQ0gsSUFBSSxDQUFDLE1BQU0sR0FBQSxDQUFBLENBQUEsOEJBQTBCO0lBQ3JDLFlBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDakIsWUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNyQixTQUFBO1NBQ0o7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ0ksSUFBQSxLQUFLLENBQUMsS0FBQSxHQUFhLEVBQUUsRUFBRSxZQUE2QyxHQUFBLENBQUEsQ0FBQSwrQkFBQTtJQUN2RSxRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBQ3BCLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7SUFDM0IsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDZCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ2pDLFNBQUE7SUFBTSxhQUFBO2dCQUNILElBQUksQ0FBQyxNQUFNLEdBQUEsQ0FBQSxDQUFBLDhCQUEwQjtJQUNyQyxZQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLFlBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7SUFDckIsU0FBQTtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjs7O0lBS0Q7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLE9BQU8sR0FBQTtZQUNQLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbkM7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksS0FBSyxHQUFBO1lBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3RCO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLE1BQU0sR0FBQTtJQUNOLFFBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztTQUM3QjtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBSSxLQUFLLEdBQUE7WUFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDcEI7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQUksS0FBSyxHQUFBO1lBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3BCO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLEtBQUssR0FBQTtZQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUN0Qjs7O0lBS0Q7OztJQUdHO1FBQ0ksU0FBUyxHQUFBO0lBQ1osUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQzlCLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDZixJQUFJLENBQUMsTUFBTSxHQUFBLENBQUEsQ0FBQSw4QkFBMEI7SUFDckMsWUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNwQixTQUFBO0lBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmO0lBRUQ7OztJQUdHO1FBQ0ksUUFBUSxHQUFBO1lBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUM5QixRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUU7SUFDZixZQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3BCLFNBQUE7SUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFFRDs7O0lBR0c7UUFDSSxRQUFRLEdBQUE7WUFDWCxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDWCxZQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLFlBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDbkIsU0FBQTtJQUFNLGFBQUE7Z0JBQ0gsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2pCLFNBQUE7SUFDRCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBQSxDQUFBLENBQUEsOEJBQTBCO0lBQ3JDLFlBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDcEIsU0FBQTtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7SUFHRztRQUNJLFlBQVksR0FBQTtZQUNmLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtJQUNYLFlBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDakMsU0FBQTtJQUFNLGFBQUE7Z0JBQ0gsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2pCLFNBQUE7SUFDRCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLE1BQU0sR0FBQSxDQUFBLENBQUEsOEJBQTBCO0lBQ3JDLFlBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDcEIsU0FBQTtJQUNELFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7Ozs7Ozs7SUFTRztJQUNJLElBQUEsSUFBSSxDQUFDLFFBQTZCLEVBQUE7SUFDckMsUUFBQSxJQUFJLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRTtJQUM5QixZQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO0lBQzFCLFNBQUE7SUFBTSxhQUFBO2dCQUNILElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakQsU0FBQTtJQUNELFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDZixJQUFJLENBQUMsTUFBTSxHQUFBLENBQUEsQ0FBQSw4QkFBMEI7SUFDckMsWUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNsQixZQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3BCLFNBQUE7SUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7OztJQUtEOzs7Ozs7SUFNRztRQUNLLEtBQUssR0FBQTtJQUNULFFBQUEsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1NBQ2pFO0lBQ0o7O0lDL05ELE1BQU07SUFDRix3QkFBaUJDLE9BQUssRUFDekIsR0FBRyxJQUFJLENBQUM7SUFFVDtJQUNBLFNBQVMsV0FBVyxDQUFJLE1BQTBCLEVBQUUsS0FBVyxFQUFBO0lBQzNELElBQUEsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUc7SUFDekIsUUFBQSxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQStCLEtBQVU7SUFDdkQsWUFBQSxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JCLFlBQUEsSUFBSSxLQUFLLEVBQUU7SUFDUCxnQkFBQSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNqQixnQkFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDekIsYUFBQTtnQkFDRCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckIsU0FBQyxDQUFDO0lBQ0YsUUFBQSxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hCLEtBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEO0lBQ0EsZUFBZSxjQUFjLENBQ3pCLE1BQWdDLEVBQ2hDLEtBQW1CLEVBQUE7UUFFbkIsSUFBSSxNQUFNLFlBQVlDLDBCQUFlLEVBQUU7SUFDbkMsUUFBQSxNQUFNQyxxQkFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLE9BQU87SUFDSCxZQUFBLE1BQU0sRUFBRSxNQUFNO0lBQ2QsWUFBQSxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQzthQUMvQixDQUFDO0lBQ0wsS0FBQTtJQUFNLFNBQUEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzlCLE1BQU0sTUFBTSxHQUFHRCwwQkFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1QyxRQUFBLE1BQU1DLHFCQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEIsT0FBTztnQkFDSCxNQUFNO0lBQ04sWUFBQSxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7YUFDdkMsQ0FBQztJQUNMLEtBQUE7SUFBTSxTQUFBO1lBQ0gsTUFBTUMsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyxhQUFhLEVBQUUseUNBQXlDLENBQUMsQ0FBQztJQUMxRixLQUFBO0lBQ0wsQ0FBQztJQUVEO0lBQ0EsU0FBUyxXQUFXLENBQUMsTUFBYyxFQUFFLE1BQWdCLEVBQUE7UUFDakQsSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0lBQ3RDLFFBQUEsT0FBTyxLQUFLLENBQUM7SUFDaEIsS0FBQTtJQUVELElBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7SUFDeEIsUUFBQSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksTUFBTSxJQUFJLEtBQUssSUFBSUosT0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtnQkFDeEQsTUFBTUcsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBcUMsa0NBQUEsRUFBQSxLQUFLLENBQUUsQ0FBQSxDQUFDLENBQUM7SUFDN0YsU0FBQTtJQUNKLEtBQUE7SUFFRCxJQUFBLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7OztJQWFHO0lBQ0ksZUFBZSxVQUFVLENBQUksTUFBZ0MsRUFBRSxLQUFtQixFQUFBO0lBQ3JGLElBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtJQUNwQixRQUFBLE9BQU8sRUFBRSxDQUFDO0lBQ2IsS0FBQTtJQUVELElBQUEsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFaEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRWhDLElBQUEsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7O0lBZ0JHO0lBQ0ksZUFBZSxXQUFXLENBQUksTUFBZ0MsRUFBRSxHQUFRLEVBQUUsS0FBbUIsRUFBQTtRQUNoRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7SUFDaEMsUUFBQSxPQUFPLEVBQUUsQ0FBQztJQUNiLEtBQUE7SUFFRCxJQUFBLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRWhFLElBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRXBCLElBQUEsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBbUJHO0lBQ0ksZUFBZSxXQUFXLENBQUksTUFBZ0MsRUFBRSxLQUFhLEVBQUUsR0FBUSxFQUFFLEtBQW1CLEVBQUE7O0lBRS9HLElBQUEsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsS0FBSyxJQUFJSixPQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxFQUFFO1lBQzlELE1BQU1HLGlCQUFVLENBQUNDLGtCQUFXLENBQUMsYUFBYSxFQUFFLENBQTJDLHdDQUFBLEVBQUEsS0FBSyxDQUFFLENBQUEsQ0FBQyxDQUFDO0lBQ25HLEtBQUE7YUFBTSxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7SUFDdkMsUUFBQSxPQUFPLEVBQUUsQ0FBQztJQUNiLEtBQUE7SUFFRCxJQUFBLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWhFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRWhDLElBQUEsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBbUJHO0lBQ0ksZUFBZSxZQUFZLENBQUksTUFBZ0MsRUFBRSxLQUFhLEVBQUUsTUFBZ0IsRUFBRSxLQUFtQixFQUFBOztJQUV4SCxJQUFBLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssSUFBSUosT0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtZQUM5RCxNQUFNRyxpQkFBVSxDQUFDQyxrQkFBVyxDQUFDLGFBQWEsRUFBRSxDQUE0Qyx5Q0FBQSxFQUFBLEtBQUssQ0FBRSxDQUFBLENBQUMsQ0FBQztJQUNwRyxLQUFBO2FBQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFO0lBQzVDLFFBQUEsT0FBTyxFQUFFLENBQUM7SUFDYixLQUFBO0lBRUQsSUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQzs7UUFHaEUsSUFBSSxJQUFJLEdBQWlCLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUMsSUFBQTtZQUNJLE1BQU0sUUFBUSxHQUFRLEVBQUUsQ0FBQztJQUN6QixRQUFBLEtBQUssTUFBTSxLQUFLLElBQUlDLGdCQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ2hDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDN0IsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3RCLFNBQUE7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztZQUNuQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssS0FBSTtnQkFDekIsT0FBTyxJQUFJLElBQUksS0FBSyxDQUFDO0lBQ3pCLFNBQUMsQ0FBQyxDQUFDO0lBQ04sS0FBQTs7SUFHRCxJQUFBLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzNCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFNLENBQUM7SUFDaEMsS0FBQTtJQUVELElBQUEsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7O0lBZ0JHO0lBQ0ksZUFBZSxXQUFXLENBQUksTUFBZ0MsRUFBRSxNQUFnQixFQUFFLEtBQW1CLEVBQUE7UUFDeEcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFO0lBQ3JDLFFBQUEsT0FBTyxFQUFFLENBQUM7SUFDYixLQUFBO0lBRUQsSUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQzs7UUFHaEUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUk7SUFDckIsUUFBQSxRQUFRLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0lBQ2hDLEtBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxLQUFLLE1BQU0sS0FBSyxJQUFJQSxnQkFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQ2hDLFFBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0IsS0FBQTtJQUVELElBQUEsT0FBTyxPQUFPLENBQUM7SUFDbkI7O0lDMU9BO0lBQ2dCLFNBQUEsS0FBSyxDQUFtQixJQUFhLEVBQUUsS0FBc0IsRUFBQTtRQUN6RSxPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUM7SUFDN0MsQ0FBQztJQUVEO0lBQ2dCLFNBQUEsUUFBUSxDQUFtQixJQUFhLEVBQUUsS0FBc0IsRUFBQTtRQUM1RSxPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUM7SUFDN0MsQ0FBQztJQUVEO0lBQ2dCLFNBQUEsT0FBTyxDQUFtQixJQUFhLEVBQUUsS0FBNkIsRUFBQTtRQUNsRixPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDM0MsQ0FBQztJQUVEO0lBQ2dCLFNBQUEsSUFBSSxDQUFtQixJQUFhLEVBQUUsS0FBNkIsRUFBQTtRQUMvRSxPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDM0MsQ0FBQztJQUVEO0lBQ2dCLFNBQUEsWUFBWSxDQUFtQixJQUFhLEVBQUUsS0FBNkIsRUFBQTtRQUN2RixPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7SUFDNUMsQ0FBQztJQUVEO0lBQ2dCLFNBQUEsU0FBUyxDQUFtQixJQUFhLEVBQUUsS0FBNkIsRUFBQTtRQUNwRixPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7SUFDNUMsQ0FBQztJQUVEO0lBQ2dCLFNBQUEsSUFBSSxDQUFtQixJQUFhLEVBQUUsS0FBeUIsRUFBQTtRQUMzRSxPQUFPLENBQUMsSUFBTyxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFFRDtJQUNnQixTQUFBLE9BQU8sQ0FBbUIsSUFBYSxFQUFFLEtBQXlCLEVBQUE7UUFDOUUsT0FBTyxDQUFDLElBQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFFRDthQUNnQixhQUFhLENBQW1CLElBQWEsRUFBRSxLQUFhLEVBQUUsSUFBNkIsRUFBQTtRQUN2RyxPQUFPLENBQUMsSUFBTyxLQUFJO0lBQ2YsUUFBQSxNQUFNLElBQUksR0FBR0MscUJBQVcsQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN2RCxRQUFBLE9BQU8sSUFBSSxJQUFLLElBQUksQ0FBQyxJQUFJLENBQXFCLENBQUM7SUFDbkQsS0FBQyxDQUFDO0lBQ04sQ0FBQztJQUVEO2FBQ2dCLGdCQUFnQixDQUFtQixJQUFhLEVBQUUsS0FBYSxFQUFFLElBQTZCLEVBQUE7UUFDMUcsT0FBTyxDQUFDLElBQU8sS0FBSTtJQUNmLFFBQUEsTUFBTSxJQUFJLEdBQUdBLHFCQUFXLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkQsT0FBTyxFQUFFLElBQUksSUFBSyxJQUFJLENBQUMsSUFBSSxDQUFxQixDQUFDLENBQUM7SUFDdEQsS0FBQyxDQUFDO0lBQ04sQ0FBQztJQUVEO2FBQ2dCLEtBQUssQ0FBbUIsSUFBYSxFQUFFLEdBQTJCLEVBQUUsR0FBMkIsRUFBQTtJQUMzRyxJQUFBLE9BQU8sV0FBVyxDQUF5QixDQUFBLCtCQUFBLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFFRDthQUNnQixXQUFXLENBQW1CLElBQXdCLEVBQUUsR0FBc0IsRUFBRSxHQUFrQyxFQUFBO0lBQzlILElBQUEsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFPLEtBQUk7SUFDNUIsUUFBQSxRQUFRLElBQUk7SUFDUixZQUFBLEtBQUEsQ0FBQTtvQkFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEMsWUFBQSxLQUFBLENBQUE7b0JBQ0ksT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLFlBQUE7b0JBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBLHFCQUFBLEVBQXdCLElBQUksQ0FBRSxDQUFBLENBQUMsQ0FBQzs7b0JBRTdDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxTQUFBO0lBQ0wsS0FBQyxDQUFDO0lBQ047O0lDckRBOzs7SUFHRztVQUNVLGdCQUFnQixDQUFBO0lBRWpCLElBQUEsVUFBVSxDQUFrQztJQUM1QyxJQUFBLFlBQVksQ0FBcUI7SUFDakMsSUFBQSxRQUFRLENBQWdCO0lBQ3hCLElBQUEsTUFBTSxDQUFnQztJQUN0QyxJQUFBLE9BQU8sQ0FBVTtJQUNqQixJQUFBLFNBQVMsQ0FBa0I7SUFFbkM7Ozs7OztJQU1HO0lBQ0gsSUFBQSxXQUFBLENBQVksS0FBMkMsR0FBQSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBQTtJQUNwRSxRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEtBQUssQ0FBQztJQUMzRSxRQUFBLElBQUksQ0FBQyxVQUFVLEdBQU8sU0FBUyxDQUFDO0lBQ2hDLFFBQUEsSUFBSSxDQUFDLFlBQVksR0FBSyxJQUFJLElBQUksV0FBVyxHQUFHLFdBQVcsa0NBQTBCO0lBQ2pGLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBUyxJQUFJLElBQUksT0FBTyxHQUFHLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDckQsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFXLEtBQUssQ0FBQztJQUM1QixRQUFBLElBQUksQ0FBQyxPQUFPLEdBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUMvQixRQUFBLElBQUksQ0FBQyxTQUFTLEdBQVEsUUFBUSxJQUFJLEVBQUUsQ0FBQztTQUN4Qzs7O0lBS0QsSUFBQSxJQUFJLFNBQVMsR0FBQTtZQUNULE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztTQUMxQjtRQUVELElBQUksU0FBUyxDQUFDLE1BQXVDLEVBQUE7SUFDakQsUUFBQSxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQztTQUM1QjtJQUVELElBQUEsSUFBSSxPQUFPLEdBQUE7WUFDUCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7U0FDeEI7UUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUF1QixFQUFBO0lBQy9CLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7U0FDMUI7SUFFRCxJQUFBLElBQUksV0FBVyxHQUFBO1lBQ1gsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1NBQzVCO1FBRUQsSUFBSSxXQUFXLENBQUMsS0FBeUIsRUFBQTtJQUNyQyxRQUFBLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO1NBQzdCO0lBRUQsSUFBQSxJQUFJLEtBQUssR0FBQTtZQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztTQUN0QjtRQUVELElBQUksS0FBSyxDQUFDLEtBQStDLEVBQUE7SUFDckQsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztTQUN2QjtJQUVELElBQUEsSUFBSSxNQUFNLEdBQUE7WUFDTixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDdkI7UUFFRCxJQUFJLE1BQU0sQ0FBQyxLQUFjLEVBQUE7SUFDckIsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztTQUN4QjtJQUVELElBQUEsSUFBSSxRQUFRLEdBQUE7WUFDUixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDekI7UUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUF1QixFQUFBO0lBQ2hDLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7U0FDM0I7OztJQUtEOzs7SUFHRztJQUNILElBQUEsSUFBSSxXQUFXLEdBQUE7SUFDWCxRQUFBLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUMxQztJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBSSxNQUFNLEdBQUE7SUFDTixRQUFBLElBQUksSUFBdUMsQ0FBQztJQUU1QyxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDaEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3ZDLFlBQUEsUUFBUSxRQUFRO0lBQ1osZ0JBQUEsS0FBQSxDQUFBO0lBQ0ksb0JBQUEsSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixLQUFLLENBQVEsSUFBSSxFQUFFLEtBQTRCLENBQUMsRUFDaEQsSUFBSSxDQUNQLENBQUM7d0JBQ0YsTUFBTTtJQUNWLGdCQUFBLEtBQUEsQ0FBQTtJQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsUUFBUSxDQUFRLElBQUksRUFBRSxLQUE0QixDQUFDLEVBQ25ELElBQUksQ0FDUCxDQUFDO3dCQUNGLE1BQU07SUFDVixnQkFBQSxLQUFBLENBQUE7SUFDSSxvQkFBQSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLE9BQU8sQ0FBUSxJQUFJLEVBQUUsS0FBbUMsQ0FBQyxFQUN6RCxJQUFJLENBQ1AsQ0FBQzt3QkFDRixNQUFNO0lBQ1YsZ0JBQUEsS0FBQSxDQUFBO0lBQ0ksb0JBQUEsSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixJQUFJLENBQVEsSUFBSSxFQUFFLEtBQW1DLENBQUMsRUFDdEQsSUFBSSxDQUNQLENBQUM7d0JBQ0YsTUFBTTtJQUNWLGdCQUFBLEtBQUEsQ0FBQTtJQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsWUFBWSxDQUFRLElBQUksRUFBRSxLQUFtQyxDQUFDLEVBQzlELElBQUksQ0FDUCxDQUFDO3dCQUNGLE1BQU07SUFDVixnQkFBQSxLQUFBLENBQUE7SUFDSSxvQkFBQSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLFNBQVMsQ0FBUSxJQUFJLEVBQUUsS0FBbUMsQ0FBQyxFQUMzRCxJQUFJLENBQ1AsQ0FBQzt3QkFDRixNQUFNO0lBQ1YsZ0JBQUEsS0FBQSxDQUFBO0lBQ0ksb0JBQUEsSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixJQUFJLENBQVEsSUFBSSxFQUFFLEtBQStCLENBQUMsRUFDbEQsSUFBSSxDQUNQLENBQUM7d0JBQ0YsTUFBTTtJQUNWLGdCQUFBLEtBQUEsQ0FBQTtJQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsT0FBTyxDQUFRLElBQUksRUFBRSxLQUErQixDQUFDLEVBQ3JELElBQUksQ0FDUCxDQUFDO3dCQUNGLE1BQU07SUFDVixnQkFBQSxLQUFBLENBQUE7d0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixhQUFhLENBQVEsSUFBSSxFQUFFLEtBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RELElBQUksQ0FDUCxDQUFDO3dCQUNGLE1BQU07SUFDVixnQkFBQSxLQUFBLENBQUE7d0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixnQkFBZ0IsQ0FBUSxJQUFJLEVBQUUsS0FBZSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDekQsSUFBSSxDQUNQLENBQUM7d0JBQ0YsTUFBTTtJQUNWLGdCQUFBLEtBQUEsRUFBQTt3QkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLEtBQUssQ0FBUSxJQUFJLEVBQUUsS0FBbUMsRUFBRSxJQUFJLENBQUMsS0FBbUMsQ0FBQyxFQUNqRyxJQUFJLENBQ1AsQ0FBQzt3QkFDRixNQUFNO0lBQ1YsZ0JBQUE7d0JBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBLGtCQUFBLEVBQXFCLFFBQVEsQ0FBRSxDQUFBLENBQUMsQ0FBQzt3QkFDOUMsTUFBTTtJQUNiLGFBQUE7SUFDSixTQUFBO1lBRUQsT0FBTyxJQUFJLEtBQUssaUJBQWdCLElBQUksQ0FBQyxDQUFDO1NBQ3pDO0lBQ0o7O0lDcE1ELE1BQU07SUFDRixpQkFBaUIsS0FBSyxFQUN6QixHQUFHLElBQUksQ0FBQztJQVFUO0lBRUE7OztJQUdHO0lBQ0csU0FBVSxXQUFXLENBQVEsS0FBYyxFQUFFLE1BQXFDLEVBQUUsR0FBRyxXQUFrQyxFQUFBO1FBQzNILElBQUksTUFBTSxHQUFHQyxvQkFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3ZFLElBQUEsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7SUFDbEMsUUFBQSxJQUFJQSxvQkFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0lBQ3hCLFlBQUEsTUFBTSxHQUFHQyxjQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3JDLFNBQUE7SUFDSixLQUFBO0lBQ0QsSUFBQSxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRUQ7SUFFQTtJQUNBLE1BQU0sY0FBYyxHQUFHO0lBQ25CLElBQUEsQ0FBQSxDQUFBLDRCQUFzQixJQUFJO0lBQzFCLElBQUEsQ0FBQSxDQUFBLDBCQUFvQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7SUFDaEMsSUFBQSxDQUFBLENBQUEsNkJBQXVCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtJQUN0QyxJQUFBLENBQUEsQ0FBQSw2QkFBdUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRTtRQUMzQyxDQUFtQixDQUFBLDJCQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO1FBQzlDLENBQWtCLENBQUEsMEJBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO0lBQ2xELElBQUEsQ0FBQSxDQUFBLHlCQUFtQixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7SUFDbEMsSUFBQSxDQUFBLENBQUEseUJBQW1CLEVBQUUsS0FBSyxFQUFFLElBQUksR0FBRyxJQUFJLEVBQUU7UUFDekMsQ0FBaUIsQ0FBQSx5QkFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRTtRQUNoRCxDQUFpQixDQUFBLHlCQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRTtLQUMxRCxDQUFDO0lBRUY7Ozs7Ozs7Ozs7SUFVRztJQUNhLFNBQUEsY0FBYyxDQUMxQixLQUFjLEVBQ2QsU0FBd0MsRUFBQTtRQUV4QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFFN0MsSUFBQSxJQUFJLE1BQU0sRUFBRTtJQUNSLFFBQUFDLGlCQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hCLEtBQUE7SUFFRCxJQUFBLElBQUksS0FBSyxFQUFFO1lBQ1AsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLE1BQU0sS0FBSyxHQUFZLEVBQUUsQ0FBQztJQUMxQixRQUFBLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUM7SUFDekIsUUFBQSxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM5QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDZCxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUN0QixJQUFJLENBQUMsUUFBUSxFQUFFO0lBQ1gsZ0JBQUEsS0FBSyxFQUFFLENBQUM7SUFDWCxhQUFBO0lBQU0saUJBQUEsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLElBQW1CLENBQUMsRUFBRTtJQUMxQyxnQkFBQSxLQUFLLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFtQixDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakUsYUFBQTtJQUFNLGlCQUFBO0lBQ0gsZ0JBQUEsT0FBTyxDQUFDLElBQUksQ0FBQywyQkFBMkIsSUFBSSxDQUFBLENBQUUsQ0FBQyxDQUFDO29CQUNoRCxTQUFTO0lBQ1osYUFBQTtnQkFFRCxJQUFJLFVBQVUsR0FBRyxLQUFLLEVBQUU7SUFDcEIsZ0JBQUEsSUFBSSxNQUFNLEVBQUU7SUFDUixvQkFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLGlCQUFBO29CQUNELE1BQU07SUFDVCxhQUFBO0lBQU0saUJBQUE7SUFDSCxnQkFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLGFBQUE7SUFDSixTQUFBO1lBQ0QsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNqQixLQUFBO0lBRUQsSUFBQSxNQUFNLE1BQU0sR0FBRztZQUNYLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNuQixLQUFLO1NBQ3lDLENBQUM7SUFFbkQsSUFBQSxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO0lBQ3BCLFFBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7SUFDdEIsWUFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtJQUN2QixnQkFBQSxJQUFJLEVBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFFO0lBQ2pCLG9CQUFBLE1BQU0sQ0FBQyxHQUFHLENBQXVCLEdBQUcsQ0FBQyxDQUFDO0lBQzFDLGlCQUFBO29CQUNBLE1BQU0sQ0FBQyxHQUFHLENBQXVCLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNELGFBQUE7SUFDSixTQUFBO0lBQ0osS0FBQTtJQUVELElBQUEsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVEO0lBRUE7SUFDQSxlQUFlLGNBQWMsQ0FDekIsTUFBZSxFQUNmLE9BQWdELEVBQUE7UUFFaEQsTUFBTSxFQUNGLE1BQU0sRUFDTixXQUFXLEVBQ1gsS0FBSyxFQUFFLFNBQVMsRUFDaEIsS0FBSyxFQUNMLE1BQU0sRUFBRSxLQUFLLEVBQ2IsUUFBUSxFQUNSLElBQUksRUFDSixRQUFRLEdBQ1gsR0FBRyxPQUFPLENBQUM7O0lBR1osSUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNoQixPQUFPO0lBQ0gsWUFBQSxLQUFLLEVBQUUsQ0FBQztJQUNSLFlBQUEsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsT0FBTzthQUMwQixDQUFDO0lBQ3pDLEtBQUE7O1FBR0QsTUFBTSxPQUFPLEdBQUcsUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBRXhGLE1BQU0sT0FBTyxHQUFZLEVBQUUsQ0FBQztJQUM1QixJQUFBLElBQUksS0FBSyxHQUFXLENBQUMsSUFBSSxJQUFJLFNBQVMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRXhELElBQUEsT0FBTyxJQUFJLEVBQUU7SUFDVCxRQUFBLE1BQU1QLHFCQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEIsUUFBQSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtnQkFDaEUsTUFBTUMsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFrQixlQUFBLEVBQUEsS0FBSyxDQUFFLENBQUEsQ0FBQyxDQUFDO0lBQ3JGLFNBQUE7SUFBTSxhQUFBLElBQUksSUFBSSxJQUFJLEtBQUssS0FBSyxLQUFLLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRTtnQkFDaEUsTUFBTUQsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFtQixlQUFBLEVBQUEsS0FBTSxDQUFFLENBQUEsQ0FBQyxDQUFDO0lBQ3ZGLFNBQUE7SUFFRCxRQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMvQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxHQUFHLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQztJQUVoRixRQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztJQUV2QixRQUFBLE1BQU0sTUFBTSxHQUFHO2dCQUNYLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDckIsS0FBSztJQUNMLFlBQUEsT0FBTyxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQXVDO2FBQ3hCLENBQUM7O0lBR3RDLFFBQUEsSUFBSUcsb0JBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtJQUN0QixZQUFBLFFBQVEsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUMzQixTQUFBO0lBRUQsUUFBQSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO0lBQ3ZCLFlBQUEsSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLEtBQUssR0FBRyxLQUFLLEVBQUU7O0lBRWpDLGdCQUFBLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0lBQzFCLGFBQUE7SUFBTSxpQkFBQTtJQUNILGdCQUFBLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO29CQUN0QixTQUFTO0lBQ1osYUFBQTtJQUNKLFNBQUE7SUFFRCxRQUFBLE9BQU8sTUFBTSxDQUFDO0lBQ2pCLEtBQUE7SUFDTCxDQUFDO0lBRUQ7SUFDQSxTQUFTLFFBQVEsQ0FDYixTQUEyQyxFQUMzQyxNQUF3QyxFQUN4QyxPQUEwQyxFQUFBO0lBRTFDLElBQUEsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDdEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQy9GLElBQUEsSUFBSSxRQUFRLEVBQUU7SUFDVixRQUFBLFNBQVMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO0lBQ2hDLFFBQUEsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztJQUNsQyxLQUFBO0lBQ0wsQ0FBQztJQUVEO0lBQ0EsZUFBZSxpQkFBaUIsQ0FDNUIsU0FBMkMsRUFDM0MsUUFBNkMsRUFDN0MsT0FBZ0QsRUFBQTtJQUVoRCxJQUFBLE1BQU0sRUFDRixLQUFLLEVBQUUsU0FBUyxFQUNoQixLQUFLLEVBQ0wsTUFBTSxFQUFFLEtBQUssRUFDYixRQUFRLEVBQ1IsSUFBSSxHQUNQLEdBQUcsT0FBTyxDQUFDO1FBRVosTUFBTSxPQUFPLEdBQVksRUFBRSxDQUFDO0lBRTVCLElBQUEsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFzQyxLQUFhO1lBQ3BFLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQztZQUMxQyxPQUFPLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3ZELEtBQUMsQ0FBQztJQUVGLElBQUEsSUFBSSxLQUFLLEdBQVcsQ0FBQyxJQUFJLElBQUksU0FBUyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFFeEQsSUFBQSxPQUFPLElBQUksRUFBRTtJQUNULFFBQUEsTUFBTUwscUJBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtnQkFDckMsTUFBTUMsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFrQixlQUFBLEVBQUEsS0FBSyxDQUFFLENBQUEsQ0FBQyxDQUFDO0lBQ3JGLFNBQUE7SUFBTSxhQUFBLElBQUksSUFBSSxJQUFJLEtBQUssS0FBSyxLQUFLLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRTtnQkFDaEUsTUFBTUQsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFrQixlQUFBLEVBQUEsS0FBSyxDQUFFLENBQUEsQ0FBQyxDQUFDO0lBQ3JGLFNBQUE7SUFFRCxRQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUMvQyxRQUFBLElBQUksSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLFFBQUEsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV2RCxRQUFBLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFO0lBQ25CLFlBQUEsUUFBUSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBRXBDLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQztJQUMvQyxZQUFBLElBQUksSUFBSSxFQUFFO0lBQ04sZ0JBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDN0MsSUFBSSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQzdCLElBQUksQ0FBQyxLQUFLLEVBQ1YsU0FBUyxDQUFDLE1BQU0sRUFDaEIsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUMzQixFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUVkLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRTt3QkFDakIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JDLG9CQUFBLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDbEMsaUJBQUE7SUFDSixhQUFBO0lBRUQsWUFBQSxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLFNBQUE7SUFFSSxhQUFBO2dCQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFNUIsWUFBQSxNQUFNLE1BQU0sR0FBRztvQkFDWCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7b0JBQ2pCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztJQUNqQixnQkFBQSxPQUFPLEVBQUUsUUFBUTtpQkFDZ0IsQ0FBQzs7SUFHdEMsWUFBQSxJQUFJRyxvQkFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0lBQ3RCLGdCQUFBLFFBQVEsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUMzQixhQUFBO0lBRUQsWUFBQSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO0lBQ3ZCLGdCQUFBLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLEdBQUcsS0FBSyxFQUFFOztJQUU3QixvQkFBQSxNQUFNLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztJQUMxQixpQkFBQTtJQUFNLHFCQUFBO0lBQ0gsb0JBQUEsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO3dCQUMzQixTQUFTO0lBQ1osaUJBQUE7SUFDSixhQUFBO0lBRUQsWUFBQSxRQUFRLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN0QyxZQUFBLE9BQU8sTUFBTSxDQUFDO0lBQ2pCLFNBQUE7SUFDSixLQUFBO0lBQ0wsQ0FBQztJQUVEO0lBRUE7SUFDQSxTQUFTLGFBQWEsQ0FDbEIsT0FBNEQsRUFBQTtJQUU1RCxJQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdEQsSUFBQSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztJQUVwQyxJQUFBLElBQUksQ0FBQyxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQ2xFLFFBQUEsSUFBSSxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEQsS0FBQTtJQUVELElBQUEsT0FBTyxJQUErQyxDQUFDO0lBQzNELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7OztJQWFHO0lBQ0ksZUFBZSxVQUFVLENBQzVCLFNBQTJDLEVBQzNDLFFBQTZDLEVBQzdDLE9BQWlELEVBQUE7SUFFakQsSUFBQSxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDOztJQUcvQyxJQUFBLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRTVELElBQUksU0FBUyxDQUFDLEtBQUssRUFBRTtJQUNqQixRQUFBLE9BQU8sQ0FBQyxNQUFNLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUM7SUFDcEUsS0FBQTtJQUFNLFNBQUE7SUFDSCxRQUFBLE9BQU8sQ0FBQyxNQUFNLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDO0lBQ3JFLEtBQUE7SUFDTDs7SUM3VkE7O0lBRUc7SUEyREgsaUJBQWlCLE1BQU0sV0FBVyxHQUFlLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN0RSxpQkFBaUIsTUFBTSx1QkFBdUIsR0FBRyxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUNwRixpQkFBaUIsTUFBTSxhQUFhLEdBQWEsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3pFLGlCQUFpQixNQUFNLGFBQWEsR0FBYSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDekUsaUJBQWlCLE1BQU0sYUFBYSxHQUFhLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN6RSxpQkFBaUIsTUFBTSxnQkFBZ0IsR0FBVSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM1RSxpQkFBaUIsTUFBTSxhQUFhLEdBQWEsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFlL0U7SUFDQSxNQUFNLGVBQWUsR0FBRyxDQUFzQyxPQUF1QixLQUFVO0lBQzNGLElBQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQixJQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUM7SUFFRjtJQUNBLE1BQU0saUJBQWlCLEdBQUcsQ0FBc0MsT0FBb0MsS0FBMkM7UUFDM0ksTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUN2RCxPQUFPO1lBQ0gsUUFBUSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3BCLFdBQVcsRUFBRSxLQUFLLElBQUksZUFBZSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7U0FDcEQsQ0FBQztJQUNOLENBQUMsQ0FBQztJQUVGO0lBQ0EsTUFBTSxnQkFBZ0IsR0FBRyxDQUFtQixJQUFnQyxLQUFZO0lBQ3BGLElBQUEsT0FBUSxJQUFZLEdBQUcsYUFBYSxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ2xELENBQUMsQ0FBQztJQUVGO0lBQ0EsTUFBTSxVQUFVLEdBQUcsQ0FBbUIsS0FBUSxFQUFFLElBQWdDLEtBQVk7SUFDeEYsSUFBQSxPQUFRLEtBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQztJQUVGO0lBQ0EsTUFBTSxhQUFhLEdBQUcsQ0FBbUIsR0FBVyxFQUFFLElBQWdDLEtBQWtEO1FBRXBJLE1BQU0sS0FBSyxHQUFHLEdBQWdCLENBQUM7SUFFL0IsSUFBQSxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQyxJQUFBLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM5QixJQUFBLElBQUksQ0FBQ0csa0JBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUNmLFFBQUEsT0FBTyxTQUFTLENBQUM7SUFDcEIsS0FBQTtJQUVELElBQUEsT0FBTyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFXLEVBQUUsTUFBTSxFQUFFSCxvQkFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDO0lBQzlILENBQUMsQ0FBQztJQUVGO0lBQ0EsTUFBTSxnQkFBZ0IsR0FBRyxDQUFvRSxJQUF5QixLQUF1QjtJQUN6SSxJQUFBLE9BQVEsSUFBSSxDQUFDLFdBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDO0lBRUY7SUFDQSxNQUFNLGlCQUFpQixHQUFHLENBQW9FLENBQVUsRUFBRSxJQUF5QixLQUFZO0lBQzNJLElBQUEsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsSUFBQSxPQUFPQSxvQkFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ3hELENBQUMsQ0FBQztJQUVGO0lBQ0EsTUFBTSxXQUFXLEdBQUcsQ0FBSSxNQUFXLEVBQUUsTUFBVyxFQUFFLEVBQVUsS0FBVTtJQUNsRSxJQUFBLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUM7SUFFRjtJQUNBLFNBQVMsZUFBZSxDQUFtQixHQUFHLElBQWUsRUFBQTtJQUN6RCxJQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQy9CLElBQUksSUFBSSxJQUFJLE1BQU0sRUFBRTtJQUNoQixRQUFBLE9BQU8sRUFBRSxDQUFDO0lBQ2IsS0FBQTtJQUFNLFNBQUEsSUFBSSxDQUFDQSxvQkFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQzVCLFFBQUEsT0FBTyxNQUF5QyxDQUFDO0lBQ3BELEtBQUE7SUFBTSxTQUFBO0lBQ0gsUUFBQSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFvQyxDQUFDO0lBQ3BGLEtBQUE7SUFDTCxDQUFDO0lBRUQsaUJBQWlCLE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUM5RSxpQkFBaUIsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUVsRTtJQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBNEVHO0lBQ0csTUFBZ0IsVUFJcEIsU0FBUUksa0JBQW1CLENBQUE7SUFFekI7Ozs7O0lBS0c7UUFDSCxPQUFnQixLQUFLLENBQVM7O1FBR2IsQ0FBQyxXQUFXLEVBQTBCOzs7SUFLdkQ7Ozs7Ozs7OztJQVNHO1FBQ0gsV0FBWSxDQUFBLEtBQW1DLEVBQUUsT0FBcUQsRUFBQTtJQUNsRyxRQUFBLEtBQUssRUFBRSxDQUFDO0lBQ1IsUUFBQSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFNUUsUUFBQSxNQUFNLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQztZQUU1QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUc7SUFDaEIsWUFBQSxnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLFlBQUEsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQy9DLFlBQUEsR0FBRyxFQUFFQyxjQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztnQkFDM0IsWUFBWTtJQUNaLFlBQUEsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsWUFBWTtnQkFDWixJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQWtCO0lBQy9CLFlBQUEsS0FBSyxFQUFFLEVBQUU7YUFDeUIsQ0FBQztZQUV2QyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7O0lBR3BCLFFBQUEsSUFBWSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQXlCLEVBQUUsVUFBZ0IsRUFBRSxPQUFtQyxLQUFVO0lBQ3JJLFlBQUEsSUFBSUYsa0JBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRTtJQUNuRCxnQkFBQSxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssSUFBSSxTQUFTLEtBQUssS0FBSyxLQUFLLFVBQVUsS0FBSyxJQUFJLEVBQUU7d0JBQ2xFLE9BQU87SUFDVixpQkFBQTtvQkFDRCxJQUFJLFVBQVUsS0FBSyxLQUFLLEVBQUU7O3dCQUV0QixPQUFPLEdBQUksVUFBa0IsQ0FBQztJQUM5QixvQkFBQSxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLG9CQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9CLGlCQUFBO0lBQ0QsZ0JBQUEsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFOzt3QkFFN0IsT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNiLG9CQUFBLFVBQVUsR0FBRyxJQUFJLENBQUM7d0JBQ2xCLElBQUksU0FBUyxLQUFLLEtBQUssRUFBRTs0QkFDckIsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pELHdCQUFBLElBQUksR0FBRyxFQUFFO0lBQ0wsNEJBQUEsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUM7Z0NBQzNCLElBQUksTUFBTSxLQUFLLEVBQUUsRUFBRTtvQ0FDZixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25DLGdDQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO29DQUNwQixJQUFJLElBQUksSUFBSSxNQUFNLEVBQUU7SUFDaEIsb0NBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN2QixpQ0FBQTtJQUNKLDZCQUFBO0lBQ0oseUJBQUE7SUFDSixxQkFBQTtJQUNKLGlCQUFBOztJQUVELGdCQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM5RCxhQUFBO0lBQ0wsU0FBQyxDQUFDO0lBRUYsUUFBQSxJQUFJLEtBQUssRUFBRTtJQUNQLFlBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzVELFNBQUE7U0FDSjtJQUVEOzs7SUFHRztRQUNPLGFBQWEsR0FBQTtJQUNuQixRQUFBLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDL0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQztTQUMvQztJQUVEOzs7Ozs7O0lBT0c7SUFDSSxJQUFBLE9BQU8sQ0FBQyxPQUFvQyxFQUFBO0lBQy9DLFFBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7SUFDMUMsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDckIsUUFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUMvQjtJQUVEOzs7SUFHRztRQUNPLFVBQVUsR0FBQTtJQUNoQixRQUFBLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7U0FDaEM7OztJQUtEOzs7SUFHRztJQUNILElBQUEsSUFBSSxFQUFFLEdBQUE7SUFDRixRQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztTQUNoQztJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBSSxNQUFNLEdBQUE7SUFDTixRQUFBLE1BQU0sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQzVDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLFlBQVksSUFBSSxZQUFZLEtBQUssWUFBWSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQy9GO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLE1BQU0sR0FBQTtJQUNOLFFBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztTQUM3QjtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBSSxRQUFRLEdBQUE7WUFDUixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsV0FBVyxDQUFDO1NBQzFDO0lBRUQ7OztJQUdHO0lBQ0gsSUFBQSxJQUFjLFVBQVUsR0FBQTtJQUNwQixRQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztTQUN0QztJQUVEOzs7SUFHRztRQUNILElBQWMsVUFBVSxDQUFDLEdBQXNDLEVBQUE7SUFDM0QsUUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQztTQUNyQztJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxRQUFRLEdBQUE7SUFDbEIsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztTQUM3QztJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxTQUFTLEdBQUE7SUFDbkIsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUM7U0FDckM7SUFFRDs7O0lBR0c7SUFDSCxJQUFBLElBQWMsYUFBYSxHQUFBO0lBQ3ZCLFFBQUEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztTQUM5QjtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxvQkFBb0IsR0FBQTtJQUM5QixRQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFlBQVksQ0FBQztTQUN6QztJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxpQkFBaUIsR0FBQTtJQUMzQixRQUFBLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDdEUsTUFBTSxJQUFJLEdBQTZDLEVBQUUsQ0FBQztZQUUxRCxRQUFRLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLENBQUM7WUFDOUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBRWpDLFFBQUEsT0FBTyxJQUFJLENBQUM7U0FDZjtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxZQUFZLEdBQUE7WUFDdEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztTQUNsRDtJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxZQUFZLEdBQUE7WUFDdEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUM3QztJQUVEOzs7SUFHRztJQUNILElBQUEsSUFBYyxZQUFZLEdBQUE7SUFDdEIsUUFBQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLENBQUM7U0FDeEM7OztJQUtEOzs7Ozs7O0lBT0c7SUFDSSxJQUFBLEdBQUcsQ0FBQyxJQUFpQyxFQUFBO1lBQ3hDLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtJQUNkLFlBQUEsT0FBTyxTQUFTLENBQUM7SUFDcEIsU0FBQTtZQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbkMsSUFBSUEsa0JBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO0lBQ2xDLFlBQUEsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLFNBQUE7WUFFRCxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUNHLGFBQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBYyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDOUYsUUFBQSxNQUFNLEdBQUcsR0FBSSxJQUFxQyxDQUFDLElBQUksQ0FBQztJQUV4RCxRQUFBLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBdUIsQ0FBQztTQUN2RTtJQUVEOzs7Ozs7O0lBT0c7SUFDSSxJQUFBLEdBQUcsQ0FBQyxJQUFpQyxFQUFBO1lBQ3hDLE9BQU8sSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7SUFFRDs7O0lBR0c7UUFDSSxNQUFNLEdBQUE7WUFDVCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSUEsYUFBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUM1RDtJQUVEOzs7OztJQUtHO1FBQ0ksS0FBSyxHQUFBO0lBQ1IsUUFBQSxNQUFNLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztJQUN2QyxRQUFBLE9BQU8sSUFBSyxXQUFpQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDcEY7SUFFRDs7Ozs7OztJQU9HO0lBQ0ksSUFBQSxJQUFJLENBQUMsT0FBK0MsRUFBQTtJQUN2RCxRQUFBLE1BQU0sSUFBSSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDM0IsUUFBQSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztJQUNqQyxRQUFBLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pFLFFBQUEsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7SUFFakUsUUFBQSxJQUFJLFdBQVcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0lBQ3pCLFlBQUEsSUFBSSxPQUFPLEVBQUU7SUFDVCxnQkFBQSxPQUFPLElBQUksQ0FBQztJQUNmLGFBQUE7Z0JBQ0QsTUFBTVYsaUJBQVUsQ0FBQ0Msa0JBQVcsQ0FBQyw2QkFBNkIsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO0lBQzFHLFNBQUE7WUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQzs7WUFHbEcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ3RELFFBQUEsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQ25ELFNBQUE7WUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNSLElBQW1CLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25FLFNBQUE7SUFFRCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUF5Qk0sTUFBTSxDQUFDLEdBQUcsSUFBZSxFQUFBO0lBQzVCLFFBQUEsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDdEMsUUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztZQUNoQyxJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsV0FBVyxFQUFFO0lBQzFDLFlBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ1IsSUFBbUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckUsYUFBQTtJQUNKLFNBQUE7SUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFFRDs7Ozs7Ozs7O0lBU0c7SUFDSSxJQUFBLEVBQUUsQ0FBQyxLQUFhLEVBQUE7WUFDbkIsT0FBT1UsWUFBRSxDQUFDLElBQUksQ0FBQyxNQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzdDO0lBY00sSUFBQSxLQUFLLENBQUMsS0FBYyxFQUFBO0lBQ3ZCLFFBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUM1QixJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7SUFDZixZQUFBLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLFNBQUE7SUFBTSxhQUFBO2dCQUNILE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEMsU0FBQTtTQUNKO0lBY00sSUFBQSxJQUFJLENBQUMsS0FBYyxFQUFBO0lBQ3RCLFFBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUM1QixJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN0QyxTQUFBO0lBQU0sYUFBQTtnQkFDSCxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7SUFDcEMsU0FBQTtTQUNKOzs7SUFLRDs7Ozs7SUFLRztRQUNPLEtBQUssQ0FBQyxRQUFrRCxFQUFFLE9BQThCLEVBQUE7SUFDOUYsUUFBQSxPQUFPLFFBQW9CLENBQUM7U0FDL0I7SUFFRDs7Ozs7Ozs7O0lBU0c7UUFDTyxNQUFNLElBQUksQ0FBQyxPQUFrRCxFQUFBO0lBQ25FLFFBQUEsTUFBTSxLQUFLLEdBQUcsTUFBTUMsb0JBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBbUIsRUFBRSxPQUFPLENBQWEsQ0FBQztZQUN6RixPQUFPO2dCQUNILEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTTtnQkFDbkIsS0FBSztnQkFDTCxPQUFPO2FBQzJCLENBQUM7U0FDMUM7SUFFRDs7Ozs7OztJQU9HO1FBQ0ksTUFBTSxLQUFLLENBQUMsT0FBOEMsRUFBQTtJQUM3RCxRQUFBLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUVDLGNBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUVuRixJQUFJO0lBQ0EsWUFBQSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztJQUMzRCxZQUFBLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3ZDLFlBQUEsTUFBTSxRQUFRLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDO0lBRWpDLFlBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQXVDLEtBQUk7b0JBQ3hELFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNmLGdCQUFBLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxhQUFDLENBQUM7SUFFRixZQUFBLElBQUksT0FBTyxFQUFFO29CQUNULElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNyQixhQUFBO0lBRUQsWUFBQSxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUssRUFBRTtvQkFDcEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMzQyxhQUFBO2dCQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFM0QsWUFBQSxJQUFJLFFBQVEsRUFBRTtvQkFDVixLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekQsYUFBQTtnQkFFQSxJQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBa0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEUsWUFBQSxPQUFPLElBQUksQ0FBQztJQUNmLFNBQUE7SUFBQyxRQUFBLE9BQU8sQ0FBQyxFQUFFO0lBQ1AsWUFBQSxJQUFtQixDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQWtCLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9FLFlBQUEsTUFBTSxDQUFDLENBQUM7SUFDWCxTQUFBO1NBQ0o7SUFFRDs7Ozs7OztJQU9HO0lBQ0ksSUFBQSxPQUFPLENBQUMsT0FBa0MsRUFBQTtZQUM3QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDakYsUUFBQSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0I7UUE4RE0sR0FBRyxDQUFDLEtBQTRELEVBQUUsT0FBOEIsRUFBQTtJQUNuRyxRQUFBLElBQUlDLG1CQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2xCLE9BQU87SUFDVixTQUFBO0lBRUQsUUFBQSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFvQyxDQUFDO1lBQ25ILElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDL0MsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM1QyxTQUFBO0lBRUQsUUFBQSxNQUFNLFFBQVEsR0FBRyxDQUFDQyxpQkFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLFFBQUEsTUFBTSxLQUFLLEdBQW9DLFFBQVEsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFJLEtBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFaEcsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUVwQyxRQUFBLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxTQUFTLEtBQW1CO2dCQUNyQyxJQUFJLElBQUksSUFBSSxTQUFTLEVBQUU7SUFDbkIsZ0JBQUEsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTt3QkFDMUIsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3ZCLGlCQUFBO29CQUNELElBQUksU0FBUyxHQUFHLENBQUMsRUFBRTtJQUNmLG9CQUFBLFNBQVMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQzFCLG9CQUFBLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUM7SUFDMUMsaUJBQUE7SUFDRCxnQkFBQSxPQUFPLFNBQVMsQ0FBQztJQUNwQixhQUFBO0lBQ0wsU0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVaLE1BQU0sR0FBRyxHQUFrQixFQUFFLENBQUM7WUFDOUIsTUFBTSxLQUFLLEdBQWdCLEVBQUUsQ0FBQztZQUM5QixNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUM7WUFDOUIsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFDO0lBQzlCLFFBQUEsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUVuQyxRQUFBLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBRW5ELElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNqQixRQUFBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxFQUFFLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUM7O1lBUy9FLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUU7O2dCQUVyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBaUIsQ0FBQztJQUNoRCxZQUFBLElBQUksUUFBUSxFQUFFO0lBQ1YsZ0JBQUEsSUFBSSxLQUFLLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtJQUM1QixvQkFBQSxJQUFJLEtBQUssR0FBR0wsYUFBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7d0JBQ2pELElBQUksS0FBSyxJQUFJTixvQkFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTs0QkFDckMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLHFCQUFBO0lBRUQsb0JBQUEsSUFBSUEsb0JBQVUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUU7SUFDcEMsd0JBQUEsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkMscUJBQUE7SUFBTSx5QkFBQTtJQUNILHdCQUFBLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLHFCQUFBO0lBRUQsb0JBQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFrQixDQUFDLENBQUM7SUFDakMsb0JBQUEsSUFBSSxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7SUFDbkIsd0JBQUEsSUFBSSxHQUFHQSxvQkFBVSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3pFLHFCQUFBO0lBQ0osaUJBQUE7SUFDRCxnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtJQUN6QixvQkFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZCLG9CQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEIsaUJBQUE7SUFDRCxnQkFBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3ZCLGFBQUE7O0lBR0ksaUJBQUEsSUFBSSxHQUFHLEVBQUU7SUFDVixnQkFBQSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6RCxnQkFBQSxJQUFJLEtBQUssRUFBRTtJQUNQLG9CQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEIsb0JBQUEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNCLG9CQUFBLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsb0JBQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQixpQkFBQTtJQUNKLGFBQUE7SUFDSixTQUFBOztJQUdELFFBQUEsSUFBSSxNQUFNLEVBQUU7SUFDUixZQUFBLEtBQUssTUFBTSxLQUFLLElBQUksS0FBSyxFQUFFO0lBQ3ZCLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQ3RCLG9CQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsaUJBQUE7SUFDSixhQUFBO2dCQUNELElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtvQkFDakIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN2QyxhQUFBO0lBQ0osU0FBQTs7WUFHRCxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7WUFDekIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxRQUFRLElBQUksR0FBRyxJQUFJLE1BQU0sQ0FBQztJQUMzQyxRQUFBLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxPQUFPLEVBQUU7SUFDdkIsWUFBQSxZQUFZLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNGLFlBQUEsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDakIsWUFBQSxXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5QixTQUFBO2lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRTtJQUNyQixZQUFBLElBQUksUUFBUSxFQUFFO29CQUNWLElBQUksR0FBRyxJQUFJLENBQUM7SUFDZixhQUFBO0lBQ0QsWUFBQSxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDN0QsU0FBQTs7SUFHRCxRQUFBLElBQUksSUFBSSxFQUFFO2dCQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMvQixTQUFBOztZQUdELElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ1QsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFWSxPQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQ3RDLElBQUksSUFBSSxJQUFJLEVBQUUsRUFBRTtJQUNaLG9CQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2QixpQkFBQTtvQkFDRCxJQUFJTixhQUFPLENBQUNNLE9BQUssQ0FBQyxLQUFLQSxPQUFLLFlBQVlDLGtCQUFXLENBQUMsRUFBRTt3QkFDakRELE9BQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFQSxPQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hFLGlCQUFBO0lBQU0scUJBQUE7d0JBQ0YsSUFBbUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFQSxPQUFLLEVBQUUsSUFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6RSxpQkFBQTtJQUNKLGFBQUE7Z0JBQ0QsSUFBSSxJQUFJLElBQUksWUFBWSxFQUFFO29CQUNyQixJQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRSxhQUFBO2dCQUNELElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7b0JBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUc7SUFDWCxvQkFBQSxLQUFLLEVBQUUsS0FBSztJQUNaLG9CQUFBLE9BQU8sRUFBRSxRQUFRO0lBQ2pCLG9CQUFBLE1BQU0sRUFBRSxPQUFPO3FCQUNsQixDQUFDO29CQUNELElBQW1CLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JFLGFBQUE7SUFDSixTQUFBOztJQUdELFFBQUEsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBYSxDQUFDOztZQUd4RCxPQUFPLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUNuRTtJQUVEOzs7Ozs7Ozs7O0lBVUc7UUFDSSxLQUFLLENBQUMsS0FBbUMsRUFBRSxPQUFvQyxFQUFBO1lBQ2xGLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBeUQsQ0FBQztZQUNoRyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3BDLFFBQUEsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLEVBQUU7SUFDdkIsWUFBQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQyxTQUFBO0lBRUQsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixRQUFBLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUVuQyxRQUFBLE1BQU0sTUFBTSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRW5GLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ2IsSUFBbUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDcEUsU0FBQTtJQUVELFFBQUEsT0FBTyxNQUFNLENBQUM7U0FDakI7UUE0Qk0sR0FBRyxDQUFDLEtBQTJELEVBQUUsT0FBOEIsRUFBQTtZQUNsRyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBc0IsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1NBQ2xHO1FBNEJNLE1BQU0sQ0FBQyxLQUEyRCxFQUFFLE9BQW9DLEVBQUE7WUFDM0csTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFvQyxDQUFDO0lBQzNFLFFBQUEsTUFBTSxRQUFRLEdBQUcsQ0FBQ0QsaUJBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQyxRQUFBLE1BQU0sS0FBSyxHQUFHLFFBQVEsR0FBRyxDQUFDLEtBQWUsQ0FBQyxHQUFJLEtBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDekUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO0lBQ2hDLFlBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDakQsSUFBbUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckUsU0FBQTtJQUNELFFBQUEsT0FBTyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztTQUMxQztJQUVEOzs7Ozs7Ozs7O0lBVUc7UUFDSSxJQUFJLENBQUMsSUFBNkIsRUFBRSxPQUE4QixFQUFBO1lBQ3JFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ3ZFO0lBRUQ7Ozs7Ozs7SUFPRztJQUNJLElBQUEsR0FBRyxDQUFDLE9BQXFCLEVBQUE7WUFDNUIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNwQyxRQUFBLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN4RDtJQUVEOzs7Ozs7Ozs7O0lBVUc7UUFDSSxPQUFPLENBQUMsSUFBNkIsRUFBRSxPQUE4QixFQUFBO0lBQ3hFLFFBQUEsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDNUQ7SUFFRDs7Ozs7OztJQU9HO0lBQ0ksSUFBQSxLQUFLLENBQUMsT0FBcUIsRUFBQTtZQUM5QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDekM7SUFFRDs7Ozs7Ozs7OztJQVVHO1FBQ0ksTUFBTSxDQUFDLEtBQWEsRUFBRSxPQUEwQixFQUFBO0lBQ25ELFFBQUEsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDL0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFzQixDQUFDLENBQUM7WUFDaEUsSUFBSSxDQUFDLElBQUksRUFBRTtJQUNQLFlBQUEsT0FBTyxTQUFTLENBQUM7SUFDcEIsU0FBQTtJQUVELFFBQUEsTUFBTUMsT0FBSyxHQUFHTixhQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUMvQyxRQUFBLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQ00sT0FBSyxFQUFFO0lBQ2pCLFlBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDM0IsU0FBQTtJQUVELFFBQUEsSUFBSUEsT0FBSyxFQUFFO2dCQUNQLEtBQUssQ0FBQyxZQUFXO29CQUNiLElBQUk7d0JBQ0EsTUFBTUEsT0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDckMsb0JBQUEsSUFBSSxJQUFJLEVBQUU7SUFDTix3QkFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzQixxQkFBQTtJQUNKLGlCQUFBO0lBQUMsZ0JBQUEsT0FBTyxDQUFDLEVBQUU7SUFDUCxvQkFBQSxJQUFtQixDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUVBLE9BQUssRUFBRSxJQUFrQixFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRixpQkFBQTtpQkFDSixHQUFHLENBQUM7SUFDUixTQUFBO0lBRUQsUUFBQSxPQUFPLElBQUksQ0FBQztTQUNmOztJQUdPLElBQUEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFrQyxFQUFFLE9BQW1DLEVBQUE7SUFDM0YsUUFBQSxJQUFJLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRTtJQUNoQyxZQUFBLE9BQU8sS0FBSyxDQUFDO0lBQ2hCLFNBQUE7SUFFRCxRQUFBLE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNDLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0MsUUFBQSxJQUFJLFdBQVcsRUFBRTtJQUNiLFlBQUEsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFnQyxDQUFDO0lBQzFFLFlBQUEsSUFBSVosb0JBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDNUIsZ0JBQUEsTUFBTWMsUUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNoQyxnQkFBQSxJQUFJQyxhQUFNLENBQUNELFFBQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtJQUNwQixvQkFBQSxJQUFtQixDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBYyxFQUFFLElBQWtCLEVBQUVBLFFBQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzRixvQkFBQSxPQUFPLFNBQVMsQ0FBQztJQUNwQixpQkFBQTtJQUNKLGFBQUE7SUFDRCxZQUFBLE9BQU8sS0FBZSxDQUFDO0lBQzFCLFNBQUE7O0lBR0QsUUFBQSxPQUFPLEtBQWUsQ0FBQztTQUMxQjs7SUFHTyxJQUFBLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBZ0IsRUFBRSxPQUE2QixFQUFBO1lBQ25FLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBb0MsQ0FBQztZQUMzRSxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7SUFDN0IsUUFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtnQkFDdEIsTUFBTUYsT0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzVCLElBQUksQ0FBQ0EsT0FBSyxFQUFFO29CQUNSLFNBQVM7SUFDWixhQUFBO2dCQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUNBLE9BQUssQ0FBQyxDQUFDO0lBQ25DLFlBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7O2dCQUd2QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQ0EsT0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRXBDLFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7SUFDZCxnQkFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztvQkFDbkIsSUFBSU4sYUFBTyxDQUFDTSxPQUFLLENBQUMsS0FBS0EsT0FBSyxZQUFZQyxrQkFBVyxDQUFDLEVBQUU7d0JBQ2pERCxPQUFlLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRUEsT0FBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRSxpQkFBQTtJQUFNLHFCQUFBO3dCQUNGLElBQW1CLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRUEsT0FBSyxFQUFFLElBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUUsaUJBQUE7SUFDSixhQUFBO0lBRUQsWUFBQSxPQUFPLENBQUMsSUFBSSxDQUFDQSxPQUFLLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUNBLE9BQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4QyxTQUFBO0lBQ0QsUUFBQSxPQUFPLE9BQU8sQ0FBQztTQUNsQjs7UUFHTyxDQUFDLGFBQWEsQ0FBQyxDQUFDQSxPQUFhLEVBQUE7WUFDakMsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuQyxRQUFBLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUdBLE9BQXNDLENBQUM7WUFDNUQsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO0lBQ2QsWUFBQSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRUEsT0FBSyxDQUFDLENBQUM7SUFDekIsU0FBQTtZQUNELElBQUksSUFBSSxJQUFJLEVBQUUsRUFBRTtJQUNaLFlBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUVBLE9BQUssQ0FBQyxDQUFDO0lBQ3ZCLFNBQUE7WUFDRCxJQUFJTixhQUFPLENBQUNNLE9BQUssQ0FBQyxLQUFLQSxPQUFLLFlBQVlJLHFCQUFjLENBQUMsRUFBRTtJQUNyRCxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUNKLE9BQXFCLEVBQUUsR0FBRyxFQUFHLElBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQzNFLFNBQUE7U0FDSjs7SUFHTyxJQUFBLENBQUMsZ0JBQWdCLENBQUMsQ0FBQ0EsT0FBYSxFQUFFLE9BQU8sR0FBRyxLQUFLLEVBQUE7WUFDckQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuQyxRQUFBLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUdBLE9BQXNDLENBQUM7WUFDNUQsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO0lBQ2QsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JCLFNBQUE7WUFDRCxJQUFJLElBQUksSUFBSSxFQUFFLEVBQUU7SUFDWixZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkIsU0FBQTtJQUNELFFBQUEsSUFBSSxDQUFDLE9BQU8sS0FBS04sYUFBTyxDQUFDTSxPQUFLLENBQUMsS0FBS0EsT0FBSyxZQUFZSSxxQkFBYyxDQUFDLENBQUMsRUFBRTtJQUNuRSxZQUFBLElBQUksQ0FBQyxhQUFhLENBQUNKLE9BQXFCLEVBQUUsR0FBRyxFQUFHLElBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLFNBQUE7U0FDSjs7O0lBS0Q7OztJQUdHO1FBQ0gsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUE7SUFDYixRQUFBLE1BQU0sUUFBUSxHQUFHO2dCQUNiLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTTtJQUNqQixZQUFBLE9BQU8sRUFBRSxDQUFDO2dCQUNWLElBQUksR0FBQTtvQkFDQSxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQ2pDLE9BQU87SUFDSCx3QkFBQSxJQUFJLEVBQUUsS0FBSzs0QkFDWCxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7eUJBQ25DLENBQUM7SUFDTCxpQkFBQTtJQUFNLHFCQUFBO3dCQUNILE9BQU87SUFDSCx3QkFBQSxJQUFJLEVBQUUsSUFBSTs0QkFDVixLQUFLLEVBQUUsU0FBVTt5QkFDcEIsQ0FBQztJQUNMLGlCQUFBO2lCQUNKO2FBQ0osQ0FBQztJQUNGLFFBQUEsT0FBTyxRQUE0QixDQUFDO1NBQ3ZDO0lBRUQ7OztJQUdHO1FBQ0gsT0FBTyxHQUFBO0lBQ0gsUUFBQSxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBVyxFQUFFLEtBQWEsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ3RGO0lBRUQ7OztJQUdHO1FBQ0gsSUFBSSxHQUFBO0lBQ0EsUUFBQSxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBVyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1NBQzlEO0lBRUQ7OztJQUdHO1FBQ0gsTUFBTSxHQUFBO0lBQ0YsUUFBQSxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBVyxFQUFFLEtBQWEsS0FBSyxLQUFLLENBQUMsQ0FBQztTQUMvRTs7UUFHTyxDQUFDLHVCQUF1QixDQUFDLENBQUksY0FBaUQsRUFBQTtJQUNsRixRQUFBLE1BQU0sT0FBTyxHQUFHO2dCQUNaLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTTtJQUNqQixZQUFBLE9BQU8sRUFBRSxDQUFDO2FBQ2IsQ0FBQztJQUVGLFFBQUEsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXLEtBQVk7SUFDcEMsWUFBQSxPQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hGLFNBQUMsQ0FBQztJQUVGLFFBQUEsTUFBTSxRQUFRLEdBQXdCO2dCQUNsQyxJQUFJLEdBQUE7SUFDQSxnQkFBQSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ2hDLGdCQUFBLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO3dCQUMvQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ2xCLE9BQU87SUFDSCx3QkFBQSxJQUFJLEVBQUUsS0FBSztJQUNYLHdCQUFBLEtBQUssRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7eUJBQ2pFLENBQUM7SUFDTCxpQkFBQTtJQUFNLHFCQUFBO3dCQUNILE9BQU87SUFDSCx3QkFBQSxJQUFJLEVBQUUsSUFBSTs0QkFDVixLQUFLLEVBQUUsU0FBVTt5QkFDcEIsQ0FBQztJQUNMLGlCQUFBO2lCQUNKO2dCQUNELENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFBO0lBQ2IsZ0JBQUEsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7YUFDSixDQUFDO0lBRUYsUUFBQSxPQUFPLFFBQVEsQ0FBQztTQUNuQjtJQUNKLENBQUE7SUFFRDtBQUNBSyxrQ0FBb0IsQ0FBQyxVQUFtQixFQUFFLFlBQVksRUFBRSxJQUFJLENBQUM7O0lDOXhDN0Q7SUFDQSxTQUFTLE9BQU8sQ0FBbUIsVUFBeUIsRUFBQTtRQUN4RCxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDckIsTUFBTXJCLGlCQUFVLENBQUNDLGtCQUFXLENBQUMsZ0NBQWdDLEVBQUUscUNBQXFDLENBQUMsQ0FBQztJQUN6RyxLQUFBO0lBQ0QsSUFBQSxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVEO0lBQ0EsZUFBZSxJQUFJLENBQ2YsVUFBeUIsRUFDekIsT0FBb0MsRUFDcEMsU0FBNEYsRUFBQTtJQUU1RixJQUFBLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBSSxVQUFVLENBQUMsQ0FBQztRQUN2QyxNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pELElBQUEsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakMsSUFBQSxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRUQ7SUFDQSxTQUFTLEdBQUcsQ0FBQyxPQUFpQixFQUFBO1FBQzFCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRUQ7SUFDQSxTQUFTLGVBQWUsQ0FDcEIsSUFBa0MsRUFDbEMsT0FBK0IsRUFDL0IsU0FBaUIsRUFDakIsT0FBZSxFQUNmLEVBQVcsRUFBQTtJQUVYLElBQUEsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDakMsT0FBTztZQUNILElBQUk7SUFDSixRQUFBLElBQUksRUFBRSxPQUFPO0lBQ2IsUUFBQSxLQUFLLEVBQUUsT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsU0FBUztZQUM3RCxVQUFVLEVBQUUsT0FBTyxHQUFHLEVBQUUsR0FBRyxTQUFTO1NBQ3JCLENBQUM7SUFDeEIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7O0lBYUc7SUFDSSxlQUFlLGVBQWUsQ0FDakMsVUFBK0IsRUFDL0IsT0FBeUIsRUFBQTtJQUV6QixJQUFBLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxLQUFLLFVBQVUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoRyxPQUFPLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQkc7SUFDSSxlQUFlLGdCQUFnQixDQUNsQyxVQUErQixFQUMvQixHQUFRLEVBQ1IsT0FBeUIsRUFBQTtJQUV6QixJQUFBLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDcEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN0RyxJQUFBLE9BQU8sZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQW1CRztJQUNJLGVBQWUsZ0JBQWdCLENBQ2xDLFVBQStCLEVBQy9CLEtBQWEsRUFDYixHQUFRLEVBQ1IsT0FBeUIsRUFBQTtRQUV6QixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3RyxJQUFBLE9BQU8sZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQW1CRztJQUNJLGVBQWUsaUJBQWlCLENBQ25DLFVBQStCLEVBQy9CLEtBQWEsRUFDYixNQUFnQixFQUNoQixPQUF5QixFQUFBO1FBRXpCLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDakgsSUFBQSxPQUFPLGVBQWUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQkc7SUFDSSxlQUFlLGdCQUFnQixDQUNsQyxVQUErQixFQUMvQixNQUFnQixFQUNoQixPQUF5QixFQUFBO0lBRXpCLElBQUEsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlCLElBQUEsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDdEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RyxPQUFPLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9jb2xsZWN0aW9uLyJ9