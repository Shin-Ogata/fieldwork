/*!
 * @cdp/collection 0.9.15
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
        @typescript-eslint/restrict-plus-operands,
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
                        options = collection; // eslint-disable-line @typescript-eslint/no-explicit-any
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIiwiYmFzZS50cyIsImNvbGxlY3Rpb24tZWRpdG9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQ09MTEVDVElPTiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDEwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX0NPTExFQ1RJT05fREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMSwgJ2ludmFsaWQgYWNjZXNzLicpLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUyAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAyLCAnaW52YWxpZCBjb21wYXJhdG9ycy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMywgJ2VkaXRpbmcgcGVybWlzc2lvbiBkZW5pZWQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZ2V0TGFuZ3VhZ2UgfSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBTb3J0T3JkZXIsXG4gICAgU29ydENhbGxiYWNrLFxuICAgIFNvcnRLZXksXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBgSW50bC5Db2xsYXRvcmAgZmFjdG9yeSBmdW5jdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEgYEludGwuQ29sbGF0b3JgIOOCkui/lOWNtOOBmeOCi+mWouaVsOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsYXRvclByb3ZpZGVyID0gKCkgPT4gSW50bC5Db2xsYXRvcjtcblxuLyoqIEBpbnRlcm5hbCBkZWZhdWx0IEludGwuQ29sbGF0b3IgcHJvdmlkZXIgKi9cbmxldCBfY29sbGF0b3I6IENvbGxhdG9yUHJvdmlkZXIgPSAoKTogSW50bC5Db2xsYXRvciA9PiB7XG4gICAgcmV0dXJuIG5ldyBJbnRsLkNvbGxhdG9yKGdldExhbmd1YWdlKCksIHsgc2Vuc2l0aXZpdHk6ICdiYXNlJywgbnVtZXJpYzogdHJ1ZSB9KTtcbn07XG5cbi8qKlxuICogQGphIOaXouWumuOBriBJbnRsLkNvbGxhdG9yIOOCkuioreWumlxuICpcbiAqIEBwYXJhbSBuZXdQcm92aWRlclxuICogIC0gYGVuYCBuZXcgW1tDb2xsYXRvclByb3ZpZGVyXV0gb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC5cbiAqICAtIGBqYWAg6Kit5a6a44GV44KM44Gm44GE44GfIFtbQ29sbGF0b3JQcm92aWRlcl1dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdENvbGxhdG9yUHJvdmlkZXIobmV3UHJvdmlkZXI/OiBDb2xsYXRvclByb3ZpZGVyKTogQ29sbGF0b3JQcm92aWRlciB7XG4gICAgaWYgKG51bGwgPT0gbmV3UHJvdmlkZXIpIHtcbiAgICAgICAgcmV0dXJuIF9jb2xsYXRvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRQcm92aWRlciA9IF9jb2xsYXRvcjtcbiAgICAgICAgX2NvbGxhdG9yID0gbmV3UHJvdmlkZXI7XG4gICAgICAgIHJldHVybiBvbGRQcm92aWRlcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEdldCBzdHJpbmcgY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDmloflrZfliJfmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCBwcm9wZXJ0eSBuYW1lXG4gKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICogQHBhcmFtIG9yZGVyXG4gKiAgLSBgZW5gIHNvcnQgb3JkZXIgY29kZVxuICogIC0gYGphYCDjgr3jg7zjg4jpoIbjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIC8vIHVuZGVmaW5lZCDjga8gJycg44Go5ZCM562J44Gr5omx44GGXG4gICAgICAgIGNvbnN0IGxoc1Byb3AgPSAobnVsbCAhPSBsaHNbcHJvcCBhcyBzdHJpbmddKSA/IGxoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgY29uc3QgcmhzUHJvcCA9IChudWxsICE9IHJoc1twcm9wIGFzIHN0cmluZ10pID8gcmhzW3Byb3AgYXMgc3RyaW5nXSA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wIGFzIHN0cmluZ107XG4gICAgICAgIGNvbnN0IHJoc0RhdGUgPSByaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobGhzRGF0ZSA9PT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gKHVuZGVmaW5lZCA9PT0gdW5kZWZpbmVkKSBvciDoh6rlt7Hlj4LnhadcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNEYXRlKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbGhzVmFsdWUgPSBPYmplY3QobGhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgY29uc3QgcmhzVmFsdWUgPSBPYmplY3QocmhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgaWYgKGxoc1ZhbHVlID09PSByaHNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGxoc1ZhbHVlIDwgcmhzVmFsdWUgPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBnZW5lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24gYnkgY29tcGFyYXRpdmUgb3BlcmF0b3IuXG4gKiBAamEg5q+U6LyD5ryU566X5a2Q44KS55So44GE44Gf5rGO55So5q+U6LyD6Zai5pWw44Gu5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGxoc1twcm9wIGFzIHN0cmluZ10gPT09IHJoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcCBhcyBzdHJpbmddIDwgcmhzW3Byb3AgYXMgc3RyaW5nXSA/IC0xICogb3JkZXIgOiAxICogb3JkZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGJvb2xlYW4gY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDnnJ/lgb3lgKTmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEJvb2xlYW5Db21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIEdldCBudW1lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pWw5YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXROdW1iZXJDb21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBmcm9tIFtbU29ydEtleV1dLlxuICogQGphIFtbU29ydEtleV1dIOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdHlwZSwgb3JkZXIgfSA9IHNvcnRLZXk7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIFtbU29ydEtleV1dIGFycmF5LlxuICogQGphIFtbU29ydEtleV1dIOmFjeWIl+OCkiBjb21wYXJhdG9yIOmFjeWIl+OBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNvcnRLZXlzPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXlzOiBTb3J0S2V5PEs+W10pOiBTb3J0Q2FsbGJhY2s8VD5bXSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUPltdID0gW107XG4gICAgZm9yIChjb25zdCBzb3J0S2V5IG9mIHNvcnRLZXlzKSB7XG4gICAgICAgIGNvbXBhcmF0b3JzLnB1c2godG9Db21wYXJhdG9yKHNvcnRLZXkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBhcmF0b3JzO1xufVxuIiwiLyoqXG4gKiBAZW4gQ3Vyc29yIHBvc2l0aW9uIGNvbnN0YW50LlxuICogQGphIOOCq+ODvOOCveODq+S9jee9ruWumuaVsFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDdXJzb3JQb3Mge1xuICAgIE9VVF9PRl9SQU5HRSAgICA9IC0xLFxuICAgIENVUlJFTlQgICAgICAgICA9IC0yLFxufVxuXG4vKipcbiAqIEBlbiBTZWVrIGV4cHJlc3Npb24gZnVuY3Rpb24gdHlwZS5cbiAqIEBqYSDjgrfjg7zjgq/lvI/plqLmlbDlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vla0V4cDxUPiA9ICh2YWx1ZTogVCwgaW5kZXg/OiBudW1iZXIsIG9iaj86IFRbXSkgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHByb3ZpZGVzIGN1cnNvciBpbnRlcmZhY2UgZm9yIEFycmF5LiA8YnI+XG4gKiAgICAgSXQgaXMgZGlmZmVyZW50IGZyb20gSXRlcmF0b3IgaW50ZXJmYWNlIG9mIGVzMjAxNSwgYW5kIHRoYXQgcHJvdmlkZXMgaW50ZXJmYWNlIHdoaWNoIGlzIHNpbWlsYXIgdG8gREIgcmVjb3Jkc2V0J3Mgb25lLlxuICogQGphIEFycmF5IOeUqOOCq+ODvOOCveODqyBJL0Yg44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBlczIwMTUg44GuIEl0ZXJhdG9yIEkvRiDjgajjga/nlbDjgarjgorjgIFEQiByZWNvcmRzZXQg44Kq44OW44K444Kn44Kv44OI44Op44Kk44Kv44Gq6LWw5p+7IEkvRiDjgpLmj5DkvpvjgZnjgotcbiAqL1xuZXhwb3J0IGNsYXNzIEFycmF5Q3Vyc29yPFQgPSBhbnk+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLyoqIEBpbnRlcm5hbCDlr77osaHjga7phY3liJcgICovXG4gICAgcHJpdmF0ZSBfYXJyYXk6IFRbXTtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruWFiOmgreOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICAqL1xuICAgIHByaXZhdGUgX2JvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruacq+WwvuOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfZW9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg54++5Zyo44GuIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogMFxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiAwXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXJyYXk6IFRbXSwgaW5pdGlhbEluZGV4ID0gMCkge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgdGFyZ2V0IGFycmF5LlxuICAgICAqIEBqYSDlr77osaHjga7lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5LiBkZWZhdWx0OiBlbXB0eSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+Wumi4gICBkZWZhdWx0OiDnqbrphY3liJdcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoYXJyYXk6IFRbXSA9IFtdLCBpbml0aWFsSW5kZXg6IG51bWJlciA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0UpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGN1cnJlbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheVt0aGlzLl9pbmRleF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjmjIfjgZfnpLrjgZfjgabjgYTjgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRhcmdldCBhcnJheSBsZW5ndGguXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBruimgee0oOaVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgQk9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5YWI6aCt44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQk9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBFT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7mnKvlsL7jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lb2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByYXcgYXJyYXkgaW5zdGFuY2UuXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBhcnJheSgpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY3Vyc29yIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGZpcnN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOWFiOmgreimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlRmlyc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBsYXN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOacq+Wwvuimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTGFzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIG5leHQgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5qyh44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVOZXh0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZikge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIHByZXZpb3VzIGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuWJjeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlUHJldmlvdXMoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fZW9mKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VlayBieSBwYXNzZWQgY3JpdGVyaWEuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG9wZXJhdGlvbiBmYWlsZWQsIHRoZSBjdXJzb3IgcG9zaXRpb24gc2V0IHRvIEVPRi5cbiAgICAgKiBAamEg5oyH5a6a5p2h5Lu244Gn44K344O844KvIDxicj5cbiAgICAgKiAgICAg44K344O844Kv44Gr5aSx5pWX44GX44Gf5aC05ZCI44GvIEVPRiDnirbmhYvjgavjgarjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjcml0ZXJpYVxuICAgICAqICAtIGBlbmAgaW5kZXggb3Igc2VlayBleHByZXNzaW9uXG4gICAgICogIC0gYGphYCBpbmRleCAvIOadoeS7tuW8j+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzZWVrKGNyaXRlcmlhOiBudW1iZXIgfCBTZWVrRXhwPFQ+KTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBjcml0ZXJpYSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBjcml0ZXJpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkuZmluZEluZGV4KGNyaXRlcmlhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIOOCq+ODvOOCveODq+OBjOacieWKueOBquevhOWbsuOCkuekuuOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0cnVlOiDmnInlirkgLyBmYWxzZTog54Sh5Yq5XG4gICAgICovXG4gICAgcHJpdmF0ZSB2YWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICgwIDw9IHRoaXMuX2luZGV4ICYmIHRoaXMuX2luZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmlxdWUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxUb2tlbixcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5LCBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gdHJ1bmNcbn0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIHdhaXQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gKi9cbmZ1bmN0aW9uIG1ha2VQcm9taXNlPFQ+KGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+LCByZW1hcD86IFRbXSk6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgZWRpdG9yLm9mZihjYWxsYmFjayk7XG4gICAgICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgICAgICByZW1hcC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIHJlbWFwLnB1c2goLi4uZWRpdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVjb3Jkcyk7XG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5vbihjYWxsYmFjayk7XG4gICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCB0byBbW09ic2VydmFibGVBcnJheV1dIGlmIG5lZWRlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldEVkaXRDb250ZXh0PFQ+KFxuICAgIHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLFxuICAgIHRva2VuPzogQ2FuY2VsVG9rZW5cbik6IFByb21pc2U8eyBlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPjsgcHJvbWlzZTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPjsgfT4gfCBuZXZlciB7XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIE9ic2VydmFibGVBcnJheSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3I6IHRhcmdldCxcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgY29uc3QgZWRpdG9yID0gT2JzZXJ2YWJsZUFycmF5LmZyb20odGFyZ2V0KTtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yLFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UoZWRpdG9yLCB0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgJ3RhcmdldCBpcyBub3QgQXJyYXkgb3IgT2JzZXJ2YWJsZUFycmF5LicpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBvcmRlcnMgaW5kZXggKi9cbmZ1bmN0aW9uIHZhbGlkT3JkZXJzKGxlbmd0aDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdKTogYm9vbGVhbiB8IG5ldmVyIHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGluZGV4IG9mIG9yZGVycykge1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IGxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBvcmRlcnNbXSBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5wdXNoKC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgYXJyYXkuXG4gKiBAamEg5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYGluc2VydEFycmF5KCksIGluZGV4IGlzIGludmFsaWQuIGluZGV4OiAke2luZGV4fWApO1xuICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKGluZGV4LCAwLCAuLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIgYXJyYXkgZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEg6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGByZW9yZGVyQXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g6ZmN6aCG44K944O844OIXG4gICAgb3JkZXJzLnNvcnQoKGxocywgcmhzKSA9PiB7XG4gICAgICAgIHJldHVybiAobGhzIDwgcmhzID8gMSA6IC0xKTtcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3Qgb3JkZXIgb2YgdW5pcXVlKG9yZGVycykpIHtcbiAgICAgICAgZWRpdG9yLnNwbGljZShvcmRlciwgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG4iLCJpbXBvcnQgeyBLZXlzLCBjb21wdXRlRGF0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBGaWx0ZXJDYWxsYmFjaywgRHluYW1pY0NvbWJpbmF0aW9uIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQUxMPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBzdHJpbmcgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQ29tcGFyYWJsZTxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZVN0cmluZzxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8c3RyaW5nLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCB1bmRlZmluZWQ7XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdICE9PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVIgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTUyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3M8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDw9IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IFN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0xJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RMaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAhU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiBkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc05vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiAhKGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLlJBTkdFICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgbWluOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+LCBtYXg6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIGNvbWJpbmF0aW9uKER5bmFtaWNDb21iaW5hdGlvbi5BTkQsIGdyZWF0ZXJFcXVhbChwcm9wLCBtaW4pLCBsZXNzRXF1YWwocHJvcCwgbWF4KSk7XG59XG5cbi8qKiBAaW50ZXJuYWwg44OV44Kj44Or44K/44Gu5ZCI5oiQICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluYXRpb248VCBleHRlbmRzIG9iamVjdD4odHlwZTogRHluYW1pY0NvbWJpbmF0aW9uLCBsaHM6IEZpbHRlckNhbGxiYWNrPFQ+LCByaHM6IEZpbHRlckNhbGxiYWNrPFQ+IHwgdW5kZWZpbmVkKTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAhcmhzID8gbGhzIDogKGl0ZW06IFQpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5BTkQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5PUjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pIHx8IHJocyhpdGVtKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIGNvbWJpbmF0aW9uOiAke3R5cGV9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgLy8gZmFpbCBzYWZlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwiaW1wb3J0IHsgS2V5cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxuICAgIER5bmFtaWNDb25kaXRpb25TZWVkLFxuICAgIER5bmFtaWNPcGVyYXRvckNvbnRleHQsXG4gICAgRHluYW1pY0xpbWl0Q29uZGl0aW9uLFxuICAgIER5bmFtaWNPcGVyYXRvcixcbiAgICBEeW5hbWljQ29tYmluYXRpb24sXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBWYWx1ZVR5cGVBTEwsXG4gICAgVmFsdWVUeXBlQ29tcGFyYWJsZSxcbiAgICBWYWx1ZVR5cGVTdHJpbmcsXG4gICAgZXF1YWwsXG4gICAgbm90RXF1YWwsXG4gICAgZ3JlYXRlcixcbiAgICBsZXNzLFxuICAgIGdyZWF0ZXJFcXVhbCxcbiAgICBsZXNzRXF1YWwsXG4gICAgbGlrZSxcbiAgICBub3RMaWtlLFxuICAgIGRhdGVMZXNzRXF1YWwsXG4gICAgZGF0ZUxlc3NOb3RFcXVhbCxcbiAgICByYW5nZSxcbiAgICBjb21iaW5hdGlvbixcbn0gZnJvbSAnLi9keW5hbWljLWZpbHRlcnMnO1xuXG4vKipcbiAqIEBlbiBEeW5hbWljIHF1ZXJ5IGNvbmRpdGlvbiBtYW5hZ2VyIGNsYXNzLlxuICogQGphIOODgOOCpOODiuODn+ODg+OCr+OCr+OCqOODqueKtuaFi+euoeeQhuOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY0NvbmRpdGlvbjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+IGltcGxlbWVudHMgRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+IHtcblxuICAgIHByaXZhdGUgX29wZXJhdG9yczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9jb21iaW5hdGlvbjogRHluYW1pY0NvbWJpbmF0aW9uO1xuICAgIHByaXZhdGUgX3N1bUtleXM6IEtleXM8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfbGltaXQ/OiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+O1xuICAgIHByaXZhdGUgX3JhbmRvbTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9zb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgW1tEeW5hbWljQ29uZGl0aW9uU2VlZF1dIGluc3RhbmNlXG4gICAgICogIC0gYGphYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM6IER5bmFtaWNDb25kaXRpb25TZWVkPFRJdGVtLCBUS2V5PiA9IHsgb3BlcmF0b3JzOiBbXSB9KSB7XG4gICAgICAgIGNvbnN0IHsgb3BlcmF0b3JzLCBjb21iaW5hdGlvbiwgc3VtS2V5cywgbGltaXQsIHJhbmRvbSwgc29ydEtleXMgfSA9IHNlZWRzO1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgICAgID0gb3BlcmF0b3JzO1xuICAgICAgICB0aGlzLl9jb21iaW5hdGlvbiAgID0gbnVsbCAhPSBjb21iaW5hdGlvbiA/IGNvbWJpbmF0aW9uIDogRHluYW1pY0NvbWJpbmF0aW9uLkFORDtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyAgICAgICA9IG51bGwgIT0gc3VtS2V5cyA/IHN1bUtleXMgOiBbXTtcbiAgICAgICAgdGhpcy5fbGltaXQgICAgICAgICA9IGxpbWl0O1xuICAgICAgICB0aGlzLl9yYW5kb20gICAgICAgID0gISFyYW5kb207XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzICAgICAgPSBzb3J0S2V5cyB8fCBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZFxuXG4gICAgZ2V0IG9wZXJhdG9ycygpOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG5cbiAgICBzZXQgb3BlcmF0b3JzKHZhbHVlczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSkge1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IHN1bUtleXMoKTogKEtleXM8VEl0ZW0+KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1bUtleXM7XG4gICAgfVxuXG4gICAgc2V0IHN1bUtleXModmFsdWVzOiAoS2V5czxUSXRlbT4pW10pIHtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgY29tYmluYXRpb24oKTogRHluYW1pY0NvbWJpbmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbWJpbmF0aW9uO1xuICAgIH1cblxuICAgIHNldCBjb21iaW5hdGlvbih2YWx1ZTogRHluYW1pY0NvbWJpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGxpbWl0KCk6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGltaXQ7XG4gICAgfVxuXG4gICAgc2V0IGxpbWl0KHZhbHVlOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2xpbWl0ID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHJhbmRvbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbTtcbiAgICB9XG5cbiAgICBzZXQgcmFuZG9tKHZhbHVlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3JhbmRvbSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBzb3J0S2V5cygpOiBTb3J0S2V5PFRLZXk+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc29ydEtleXM7XG4gICAgfVxuXG4gICAgc2V0IHNvcnRLZXlzKHZhbHVlczogU29ydEtleTxUS2V5PltdKSB7XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzID0gdmFsdWVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBhY2Nlc3NvcjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29tcGFyYXRvciBmdW5jdGlvbnMuXG4gICAgICogQGphIOavlOi8g+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBjb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gY29udmVydFNvcnRLZXlzKHRoaXMuX3NvcnRLZXlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHN5bnRoZXNpcyBmaWx0ZXIgZnVuY3Rpb24uXG4gICAgICogQGphIOWQiOaIkOa4iOOBv+ODleOCo+ODq+OCv+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBmaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHtcbiAgICAgICAgbGV0IGZsdHI6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbmQgb2YgdGhpcy5fb3BlcmF0b3JzKSB7XG4gICAgICAgICAgICBjb25zdCB7IG9wZXJhdG9yLCBwcm9wLCB2YWx1ZSB9ID0gY29uZDtcbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuR1JFQVRFUjpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVyPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3M8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3NFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWtlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZVN0cmluZzxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVMZXNzRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NOb3RFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+LCBjb25kLnJhbmdlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRvcjogJHtvcGVyYXRvcn1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciB8fCAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIHNvcnQsXG4gICAgc2h1ZmZsZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIFNvcnRLZXksXG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvblF1ZXJ5SW5mbyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIER5bmFtaWNMaW1pdCxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscy9jb21wYXJhdG9yJztcbmltcG9ydCB7IER5bmFtaWNDb25kaXRpb24gfSBmcm9tICcuL2R5bmFtaWMtY29uZGl0aW9uJztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gdHJ1bmNcbn0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIOS9v+eUqOOBmeOCi+ODl+ODreODkeODhuOCo+OBjOS/neiovOOBleOCjOOBnyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyAqL1xuaW50ZXJmYWNlIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+IGV4dGVuZHMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBzb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuICAgIGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W107XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBBcHBseSBgZmlsdGVyYCBhbmQgYHNvcnQga2V5YCB0byB0aGUgYGl0ZW1zYCBmcm9tIFtbcXVlcnlJdGVtc11dYCgpYCByZXN1bHQuXG4gKiBAamEgW1txdWVyeUl0ZW1zXV1gKClgIOOBl+OBnyBgaXRlbXNgIOOBq+WvvuOBl+OBpiBgZmlsdGVyYCDjgaggYHNvcnQga2V5YCDjgpLpgannlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEl0ZW1zPFRJdGVtPihpdGVtczogVEl0ZW1bXSwgZmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgbnVsbCwgLi4uY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSk6IFRJdGVtW10ge1xuICAgIGxldCByZXN1bHQgPSBpc0Z1bmN0aW9uKGZpbHRlcikgPyBpdGVtcy5maWx0ZXIoZmlsdGVyKSA6IGl0ZW1zLnNsaWNlKCk7XG4gICAgZm9yIChjb25zdCBjb21wYXJhdG9yIG9mIGNvbXBhcmF0b3JzKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBhcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzb3J0KHJlc3VsdCwgY29tcGFyYXRvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY29uZGl0aW5hbEZpeCDjgavkvb/nlKjjgZnjgosgQ3JpdGVyaWEgTWFwICovXG5jb25zdCBfbGltaXRDcml0ZXJpYSA9IHtcbiAgICBbRHluYW1pY0xpbWl0LkNPVU5UXTogbnVsbCxcbiAgICBbRHluYW1pY0xpbWl0LlNVTV06IHsgY29lZmY6IDEgfSxcbiAgICBbRHluYW1pY0xpbWl0LlNFQ09ORF06IHsgY29lZmY6IDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1JTlVURV06IHsgY29lZmY6IDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuSE9VUl06IHsgY29lZmY6IDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5EQVldOiB7IGNvZWZmOiAyNCAqIDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5LQl06IHsgY29lZmY6IDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1CXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LkdCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5UQl06IHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbn07XG5cbi8qKlxuICogQGVuIEZpeCB0aGUgdGFyZ2V0IGl0ZW1zIGJ5IFtbRHluYW1pY0NvbmRpdGlvbl1dLlxuICogQGphIFtbRHluYW1pY0NvbmRpdGlvbl1dIOOBq+W+k+OBhOWvvuixoeOCkuaVtOW9olxuICpcbiAqIEBwYXJhbSBpdGVtc1xuICogIC0gYGVuYCB0YXJnZXQgaXRlbXMgKGRlc3RydWN0aXZlKVxuICogIC0gYGphYCDlr77osaHjga7jgqLjgqTjg4bjg6AgKOegtOWjiueahClcbiAqIEBwYXJhbSBjb25kaXRpb25cbiAqICAtIGBlbmAgY29uZGl0aW9uIG9iamVjdFxuICogIC0gYGphYCDmnaHku7bjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbmRpdGlvbmFsRml4PFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4oXG4gICAgaXRlbXM6IFRJdGVtW10sXG4gICAgY29uZGl0aW9uOiBEeW5hbWljQ29uZGl0aW9uPFRJdGVtLCBUS2V5PlxuKTogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4ge1xuICAgIGNvbnN0IHsgcmFuZG9tLCBsaW1pdCwgc3VtS2V5cyB9ID0gY29uZGl0aW9uO1xuXG4gICAgaWYgKHJhbmRvbSkge1xuICAgICAgICBzaHVmZmxlKGl0ZW1zLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAobGltaXQpIHtcbiAgICAgICAgY29uc3QgeyB1bml0LCB2YWx1ZSwgcHJvcCB9ID0gbGltaXQ7XG4gICAgICAgIGNvbnN0IHJlc2V0OiBUSXRlbVtdID0gW107XG4gICAgICAgIGNvbnN0IGNyaXRlcmlhID0gX2xpbWl0Q3JpdGVyaWFbdW5pdF07XG4gICAgICAgIGNvbnN0IGxpbWl0Q291bnQgPSB2YWx1ZTtcbiAgICAgICAgY29uc3QgZXhjZXNzID0gISFsaW1pdC5leGNlc3M7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgaWYgKCFjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gaXRlbVtwcm9wIGFzIEtleXM8VEl0ZW0+XSkge1xuICAgICAgICAgICAgICAgIGNvdW50ICs9IChOdW1iZXIoaXRlbVtwcm9wIGFzIEtleXM8VEl0ZW0+XSkgLyBjcml0ZXJpYS5jb2VmZik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgY2Fubm90IGFjY2VzcyBwcm9wZXJ0eTogJHtwcm9wfWApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGltaXRDb3VudCA8IGNvdW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4Y2Vzcykge1xuICAgICAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpdGVtcyA9IHJlc2V0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAgICAgICAgaXRlbXMsXG4gICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtLCBLZXlzPFRJdGVtPj47XG5cbiAgICBpZiAoMCA8IHN1bUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2Ygc3VtS2V5cykge1xuICAgICAgICAgICAgICAgIGlmICghKGtleSBpbiByZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpICs9IE51bWJlcihpdGVtW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwg44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL5a++6LGh44Gr5a++44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBxdWVyeSDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbUNhY2hlPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIGNhY2hlZDogVEl0ZW1bXSxcbiAgICBvcHRpb25zOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGZpbHRlcixcbiAgICAgICAgY29tcGFyYXRvcnMsXG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICAgICAgbm9TZWFyY2gsXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICAvLyDlr77osaHjgarjgZdcbiAgICBpZiAoIWNhY2hlZC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsOiAwLFxuICAgICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcbiAgICB9XG5cbiAgICAvLyDjgq3jg6Pjg4Pjgrfjg6Xjgavlr77jgZfjgabjg5XjgqPjg6vjgr/jg6rjg7PjgrAsIOOCveODvOODiOOCkuWun+ihjFxuICAgIGNvbnN0IHRhcmdldHMgPSBub1NlYXJjaCA/IGNhY2hlZC5zbGljZSgpIDogc2VhcmNoSXRlbXMoY2FjaGVkLCBmaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgIGNvbnN0IHJlc3VsdHM6IFRJdGVtW10gPSBbXTtcbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldHMubGVuZ3RoIDw9IGluZGV4IHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7IGxpbWl0IH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gdGFyZ2V0cy5zbGljZShpbmRleCwgKG51bGwgIT0gbGltaXQpID8gaW5kZXggKyBsaW1pdCA6IHVuZGVmaW5lZCk7XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLml0ZW1zKTtcblxuICAgICAgICBjb25zdCByZXR2YWwgPSB7XG4gICAgICAgICAgICB0b3RhbDogdGFyZ2V0cy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgLi4ub3B0cyB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPixcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgcmV0dmFsLml0ZW1zID0gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwg44Os44K544Od44Oz44K544Gu44Kt44Oj44OD44K344Ol44KS6Kmm6KGMICovXG5mdW5jdGlvbiB0cnlDYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHJlc3VsdDogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4sXG4gICAgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+XG4pOiB2b2lkIHtcbiAgICBjb25zdCB7IG5vQ2FjaGUsIG5vU2VhcmNoIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IGNhbkNhY2hlID0gIW5vQ2FjaGUgJiYgIW5vU2VhcmNoICYmIHJlc3VsdC50b3RhbCAmJiByZXN1bHQudG90YWwgPT09IHJlc3VsdC5pdGVtcy5sZW5ndGg7XG4gICAgaWYgKGNhbkNhY2hlKSB7XG4gICAgICAgIHF1ZXJ5SW5mby5jYWNoZSA9IHsgLi4ucmVzdWx0IH07XG4gICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgYHByb3ZpZGVyYCDplqLmlbDjgpLkvb/nlKjjgZfjgaYgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIGBxdWVyeWAg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21Qcm92aWRlcjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IHJlc3VsdHM6IFRJdGVtW10gPSBbXTtcblxuICAgIGNvbnN0IHJlY2VpdmVkQWxsID0gKHJlc3A6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+KTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGNvbnN0IGhhc0NvbmQgPSAhIXJlc3Aub3B0aW9ucz8uY29uZGl0aW9uO1xuICAgICAgICByZXR1cm4gaGFzQ29uZCB8fCByZXNwLnRvdGFsID09PSByZXNwLml0ZW1zLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSAobnVsbCAhPSBiYXNlSW5kZXgpID8gYmFzZUluZGV4IDogMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAke2xpbWl0fWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgeyBpbmRleCB9KTtcbiAgICAgICAgbGV0IHJlc3AgPSBhd2FpdCBwcm92aWRlcihvcHRzKTtcbiAgICAgICAgY29uc3QgbmV4dE9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRzLCByZXNwLm9wdGlvbnMpO1xuXG4gICAgICAgIGlmIChyZWNlaXZlZEFsbChyZXNwKSkge1xuICAgICAgICAgICAgdHJ5Q2FjaGUocXVlcnlJbmZvLCByZXNwLCBuZXh0T3B0cyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgbm9TZWFyY2gsIGNvbmRpdGlvbjogc2VlZCB9ID0gbmV4dE9wdHM7XG4gICAgICAgICAgICBpZiAoc2VlZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IG5ldyBEeW5hbWljQ29uZGl0aW9uKHNlZWQpO1xuICAgICAgICAgICAgICAgIHJlc3AgPSBjb25kaXRpb25hbEZpeChzZWFyY2hJdGVtcyhcbiAgICAgICAgICAgICAgICAgICAgcmVzcC5pdGVtcyxcbiAgICAgICAgICAgICAgICAgICAgY29uZGl0aW9uLmZpbHRlcixcbiAgICAgICAgICAgICAgICAgICAgLi4uY29uZGl0aW9uLmNvbXBhcmF0b3JzXG4gICAgICAgICAgICAgICAgKSwgY29uZGl0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihxdWVyeUluZm8uY2FjaGUsIHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcXVlcnlGcm9tQ2FjaGUocmVzcC5pdGVtcywgT2JqZWN0LmFzc2lnbihvcHRzLCB7IG5vU2VhcmNoIH0pKTtcbiAgICAgICAgfS8vIGVzbGludC1kaXNhYmxlLWxpbmUgYnJhY2Utc3R5bGVcblxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCguLi5yZXNwLml0ZW1zKTtcblxuICAgICAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgICAgIHRvdGFsOiByZXNwLnRvdGFsLFxuICAgICAgICAgICAgICAgIGl0ZW1zOiByZXNwLml0ZW1zLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG5leHRPcHRzLFxuICAgICAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwLnRvdGFsIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5Q2FjaGUocXVlcnlJbmZvLCByZXR2YWwsIG5leHRPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+WkieaPmyAqL1xuZnVuY3Rpb24gZW5zdXJlT3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4gfCB1bmRlZmluZWRcbik6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBzb3J0S2V5czogW10gfSwgb3B0aW9ucyk7XG4gICAgY29uc3QgeyBub1NlYXJjaCwgc29ydEtleXMgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW5vU2VhcmNoICYmICghb3B0cy5jb21wYXJhdG9ycyB8fCBvcHRzLmNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSkge1xuICAgICAgICBvcHRzLmNvbXBhcmF0b3JzID0gY29udmVydFNvcnRLZXlzKHNvcnRLZXlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0cyBhcyBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT47XG59XG5cbi8qKlxuICogQGVuIExvdyBsZXZlbCBmdW5jdGlvbiBmb3IgW1tDb2xsZWN0aW9uXV0gcXVlcnkgaXRlbXMuXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0gSXRlbSDjgpLjgq/jgqjjg6rjgZnjgovkvY7jg6zjg5njg6vplqLmlbBcbiAqXG4gKiBAcGFyYW0gcXVlcnlJbmZvXG4gKiAgLSBgZW5gIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOOCr+OCqOODquaDheWgsVxuICogQHBhcmFtIHByb3ZpZGVyXG4gKiAgLSBgZW5gIHByb3ZpZGVyIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOODl+ODreODkOOCpOODgOmWouaVsFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5SXRlbXM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxUSXRlbVtdPiB7XG4gICAgY29uc3Qgb3B0cyA9IGVuc3VyZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gb3B0cztcblxuICAgIC8vIHF1ZXJ5IOOBq+S9v+eUqOOBl+OBnyBzb3J0LCBmaWx0ZXIg5oOF5aCx44KS44Kt44Oj44OD44K344OlXG4gICAgT2JqZWN0LmFzc2lnbihxdWVyeUluZm8sIHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSk7XG5cbiAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgcXVlcnlGcm9tQ2FjaGUocXVlcnlJbmZvLmNhY2hlLml0ZW1zLCBvcHRzKSkuaXRlbXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChhd2FpdCBxdWVyeUZyb21Qcm92aWRlcihxdWVyeUluZm8sIHByb3ZpZGVyLCBvcHRzKSkuaXRlbXM7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBDb25zdHJ1Y3RvcixcbiAgICBDbGFzcyxcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIEtleXMsXG4gICAgaXNOaWwsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIG5vb3AsXG4gICAgbHVpZCxcbiAgICBhdCxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU2lsZW5jZWFibGUsXG4gICAgU3Vic2NyaWJhYmxlLFxuICAgIEV2ZW50QnJva2VyLFxuICAgIEV2ZW50U291cmNlLFxuICAgIEV2ZW50UHVibGlzaGVyLFxufSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIFJlc3VsdCxcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBGQUlMRUQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgU3luY0NvbnRleHQsIGRlZmF1bHRTeW5jIH0gZnJvbSAnQGNkcC9kYXRhLXN5bmMnO1xuaW1wb3J0IHtcbiAgICBNb2RlbCxcbiAgICBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgTW9kZWxTYXZlT3B0aW9ucyxcbiAgICBpc01vZGVsLFxufSBmcm9tICdAY2RwL21vZGVsJztcbmltcG9ydCB7XG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIENvbGxlY3Rpb25Tb3J0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0LFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUHJvdmlkZXIsXG4gICAgQ29sbGVjdGlvblF1ZXJ5SW5mbyxcbiAgICBDb2xsZWN0aW9uU2VlZCxcbiAgICBDb2xsZWN0aW9uRXZlbnQsXG4gICAgQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkFkZE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblNldE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblJlU29ydE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUmVxdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9ucyxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgc2VhcmNoSXRlbXMsIHF1ZXJ5SXRlbXMgfSBmcm9tICcuL3F1ZXJ5JztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJvcGVydGllcyAgICAgICAgICAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfY3JlYXRlSXRlcmFibGVJdGVyYXRvciA9IFN5bWJvbCgnY3JlYXRlLWl0ZXJhYmxlLWl0ZXJhdG9yJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcmVwYXJlTW9kZWwgICAgICAgICAgID0gU3ltYm9sKCdwcmVwYXJlLW1vZGVsJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9yZW1vdmVNb2RlbHMgICAgICAgICAgID0gU3ltYm9sKCdyZW1vdmUtbW9kZWxzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9hZGRSZWZlcmVuY2UgICAgICAgICAgID0gU3ltYm9sKCdhZGQtcmVmZXJlbmNlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9yZW1vdmVSZWZlcmVuY2UgICAgICAgID0gU3ltYm9sKCdyZW1vdmUtcmVmZXJlbmNlJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9vbk1vZGVsRXZlbnQgICAgICAgICAgID0gU3ltYm9sKCdtb2RlbC1ldmVudC1oYW5kbGVyJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ge1xuICAgIHJlYWRvbmx5IGNvbnN0cnVjdE9wdGlvbnM6IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFQsIEs+O1xuICAgIHJlYWRvbmx5IHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFQsIEs+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IHF1ZXJ5T3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VCwgSz47XG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFQsIEs+O1xuICAgIHJlYWRvbmx5IG1vZGVsT3B0aW9uczogTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zO1xuICAgIHJlYWRvbmx5IGJ5SWQ6IE1hcDxzdHJpbmcsIFQ+O1xuICAgIHN0b3JlOiBUW107XG4gICAgYWZ0ZXJGaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCByZXNldCBtb2RlbCBjb250ZXh0ICovXG5jb25zdCByZXNldE1vZGVsU3RvcmUgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KGNvbnRleHQ6IFByb3BlcnR5PFQsIEs+KTogdm9pZCA9PiB7XG4gICAgY29udGV4dC5ieUlkLmNsZWFyKCk7XG4gICAgY29udGV4dC5zdG9yZS5sZW5ndGggPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW5zdXJlU29ydE9wdGlvbnMgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KG9wdGlvbnM6IENvbGxlY3Rpb25Tb3J0T3B0aW9uczxULCBLPik6IFJlcXVpcmVkPENvbGxlY3Rpb25Tb3J0T3B0aW9uczxULCBLPj4gPT4ge1xuICAgIGNvbnN0IHsgc29ydEtleXM6IGtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gb3B0aW9ucztcbiAgICByZXR1cm4ge1xuICAgICAgICBzb3J0S2V5czoga2V5cyB8fCBbXSxcbiAgICAgICAgY29tcGFyYXRvcnM6IGNvbXBzIHx8IGNvbnZlcnRTb3J0S2V5cyhrZXlzIHx8IFtdKSxcbiAgICB9O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbW9kZWxJZEF0dHJpYnV0ZSA9IDxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGN0b3I/LlsnaWRBdHRyaWJ1dGUnXSB8fCAnaWQnO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0TW9kZWxJZCA9IDxUIGV4dGVuZHMgb2JqZWN0PihhdHRyczogVCwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBhdHRyc1ttb2RlbElkQXR0cmlidXRlKGN0b3IpXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldENoYW5nZWRJZHMgPSA8VCBleHRlbmRzIG9iamVjdD4ob2JqOiBvYmplY3QsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogeyBpZDogc3RyaW5nOyBwcmV2SWQ/OiBzdHJpbmc7IH0gfCB1bmRlZmluZWQgPT4ge1xuICAgIHR5cGUgTW9kZWxMaWtlID0geyBwcmV2aW91czogKGtleTogc3RyaW5nKSA9PiBzdHJpbmc7IH07XG4gICAgY29uc3QgbW9kZWwgPSBvYmogYXMgTW9kZWxMaWtlO1xuXG4gICAgY29uc3QgaWRBdHRyaWJ1dGUgPSBtb2RlbElkQXR0cmlidXRlKGN0b3IpO1xuICAgIGNvbnN0IGlkID0gbW9kZWxbaWRBdHRyaWJ1dGVdO1xuICAgIGlmICghaXNTdHJpbmcoaWQpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaWQ6IG1vZGVsW2lkQXR0cmlidXRlXSwgcHJldklkOiBpc0Z1bmN0aW9uKG1vZGVsLnByZXZpb3VzKSA/IG1vZGVsLnByZXZpb3VzKGlkQXR0cmlidXRlKSA6IHVuZGVmaW5lZCB9O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbW9kZWxDb25zdHJ1Y3RvciA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IENsYXNzIHwgdW5kZWZpbmVkID0+IHtcbiAgICByZXR1cm4gc2VsZi5jb25zdHJ1Y3RvclsnbW9kZWwnXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGlzQ29sbGVjdGlvbk1vZGVsID0gPFQgZXh0ZW5kcyBvYmplY3QsIEUgZXh0ZW5kcyBDb2xsZWN0aW9uRXZlbnQ8VD4sIEsgZXh0ZW5kcyBLZXlzPFQ+Pih4OiB1bmtub3duLCBzZWxmOiBDb2xsZWN0aW9uPFQsIEUsIEs+KTogeCBpcyBUID0+IHtcbiAgICBjb25zdCBjdG9yID0gbW9kZWxDb25zdHJ1Y3RvcihzZWxmKTtcbiAgICByZXR1cm4gaXNGdW5jdGlvbihjdG9yKSA/IHggaW5zdGFuY2VvZiBjdG9yIDogZmFsc2U7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzcGxpY2VBcnJheSA9IDxUPih0YXJnZXQ6IFRbXSwgaW5zZXJ0OiBUW10sIGF0OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICBhdCA9IE1hdGgubWluKE1hdGgubWF4KGF0LCAwKSwgdGFyZ2V0Lmxlbmd0aCk7XG4gICAgdGFyZ2V0LnNwbGljZShhdCwgMCwgLi4uaW5zZXJ0KTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHBhcnNlRmlsdGVyQXJnczxUIGV4dGVuZHMgb2JqZWN0PiguLi5hcmdzOiB1bmtub3duW10pOiBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+IHtcbiAgICBjb25zdCBbZmlsdGVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgaWYgKG51bGwgPT0gZmlsdGVyKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9IGVsc2UgaWYgKCFpc0Z1bmN0aW9uKGZpbHRlcikpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlciBhcyBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IGZpbHRlciB9KSBhcyBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+O1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfc2V0T3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IHRydWUsIG1lcmdlOiB0cnVlIH07XG4vKiogQGludGVybmFsICovIGNvbnN0IF9hZGRPcHRpb25zID0geyBhZGQ6IHRydWUsIHJlbW92ZTogZmFsc2UgfTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3IgY29sbGVjdGlvbiB0aGF0IGlzIG9yZGVyZWQgc2V0cyBvZiBtb2RlbHMuXG4gKiBAamEgTW9kZWwg44Gu6ZuG5ZCI44KS5omx44GGIENvbGxlY3Rpb24g44Gu5Z+65bqV44Kv44Op44K55a6a576pLlxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgTW9kZWwsIE1vZGVsQ29uc3RydWN0b3IgfSBmcm9tICdAY2RwL21vZGVsJztcbiAqIGltcG9ydCB7XG4gKiAgICAgQ29sbGVjdGlvbixcbiAqICAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAqICAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0LFxuICogICAgIENvbGxlY3Rpb25TZWVkLFxuICogfSBmcm9tICdAY2RwL2NvbGxlY3Rpb24nO1xuICpcbiAqIC8vIE1vZGVsIHNjaGVtYVxuICogaW50ZXJmYWNlIFRyYWNrQXR0cmlidXRlIHtcbiAqICAgdXJpOiBzdHJpbmc7XG4gKiAgIHRpdGxlOiBzdHJpbmc7XG4gKiAgIGFydGlzdDogc3RyaW5nO1xuICogICBhbGJ1bTogIHN0cmluZztcbiAqICAgcmVsZWFzZURhdGU6IERhdGU7XG4gKiAgIDpcbiAqIH1cbiAqXG4gKiAvLyBNb2RlbCBkZWZpbml0aW9uXG4gKiBjb25zdCBUcmFja0Jhc2UgPSBNb2RlbCBhcyBNb2RlbENvbnN0cnVjdG9yPE1vZGVsPFRyYWNrQXR0cmlidXRlPiwgVHJhY2tBdHRyaWJ1dGU+O1xuICogY2xhc3MgVHJhY2sgZXh0ZW5kcyBUcmFja0Jhc2Uge1xuICogICAgIHN0YXRpYyBpZEF0dHJpYnV0ZSA9ICd1cmknO1xuICogfVxuICpcbiAqIC8vIENvbGxlY3Rpb24gZGVmaW5pdGlvblxuICogY2xhc3MgUGxheWxpc3QgZXh0ZW5kcyBDb2xsZWN0aW9uPFRyYWNrPiB7XG4gKiAgICAgLy8gc2V0IHRhcmdldCBNb2RlbCBjb25zdHJ1Y3RvclxuICogICAgIHN0YXRpYyByZWFkb25seSBtb2RlbCA9IFRyYWNrO1xuICpcbiAqICAgICAvLyBAb3ZlcnJpZGUgaWYgbmVlZCB0byB1c2UgY3VzdG9tIGNvbnRlbnQgcHJvdmlkZXIgZm9yIGZldGNoLlxuICogICAgIHByb3RlY3RlZCBhc3luYyBzeW5jKFxuICogICAgICAgICBvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VHJhY2s+XG4gKiAgICAgKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD4+IHtcbiAqICAgICAgICAgLy8gc29tZSBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvbiBoZXJlLlxuICogICAgICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGN1c3RvbVByb3ZpZGVyKG9wdGlvbnMpO1xuICogICAgICAgICByZXR1cm4ge1xuICogICAgICAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAqICAgICAgICAgICAgIGl0ZW1zLFxuICogICAgICAgICAgICAgb3B0aW9ucyxcbiAqICAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD47XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBAb3ZlcnJpZGUgaWYgbmVlZCB0byBjb252ZXJ0IGEgcmVzcG9uc2UgaW50byBhIGxpc3Qgb2YgbW9kZWxzLlxuICogICAgIHByb3RlY3RlZCBwYXJzZShyZXNwb25zZTogQ29sbGVjdGlvblNlZWRbXSk6IFRyYWNrQXR0cmlidXRlW10ge1xuICogICAgICAgICByZXR1cm4gcmVzcG9uc2UubWFwKHNlZWQgPT4ge1xuICogICAgICAgICAgICAgY29uc3QgZGF0ZSA9IHNlZWQucmVsZWFzZURhdGU7XG4gKiAgICAgICAgICAgICBzZWVkLnJlbGVhc2VEYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gKiAgICAgICAgICAgICByZXR1cm4gc2VlZDtcbiAqICAgICAgICAgfSkgYXMgVHJhY2tBdHRyaWJ1dGVbXTtcbiAqICAgICAgfVxuICogfVxuICpcbiAqIGxldCBzZWVkczogVHJhY2tBdHRyaWJ1dGVbXTtcbiAqXG4gKiBjb25zdCBwbGF5bGlzdCA9IG5ldyBQbGF5bGlzdChzZWVkcywge1xuICogICAgIC8vIGRlZmF1bHQgcXVlcnkgb3B0aW9uc1xuICogICAgIHF1ZXJ5T3B0aW9uczoge1xuICogICAgICAgICBzb3J0S2V5czogW1xuICogICAgICAgICAgICAgeyBuYW1lOiAndGl0bGUnLCBvcmRlcjogU29ydE9yZGVyLkRFU0MsIHR5cGU6ICdzdHJpbmcnIH0sXG4gKiAgICAgICAgIF0sXG4gKiAgICAgfVxuICogfSk7XG4gKlxuICogYXdhaXQgcGxheWxpc3QucmVxdWVyeSgpO1xuICpcbiAqIGZvciAoY29uc3QgdHJhY2sgb2YgcGxheWxpc3QpIHtcbiAqICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0cmFjay50b0pTT04oKSkpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb2xsZWN0aW9uPFxuICAgIFRNb2RlbCBleHRlbmRzIG9iamVjdCA9IGFueSwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgVEV2ZW50IGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4gPSBDb2xsZWN0aW9uRXZlbnQ8VE1vZGVsPixcbiAgICBUS2V5IGV4dGVuZHMgS2V5czxUTW9kZWw+ID0gS2V5czxUTW9kZWw+XG4+IGV4dGVuZHMgRXZlbnRTb3VyY2U8VEV2ZW50PiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFRNb2RlbD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE1vZGVsIGNvbnN0cnVjdG9yLiA8YnI+XG4gICAgICogICAgIFRoZSBjb25zdHJ1Y3RvciBpcyB1c2VkIGludGVybmFsbHkgYnkgdGhpcyBbW0NvbGxlY3Rpb25dXSBjbGFzcyBmb3IgW1tUTW9kZWxdXSBjb25zdHJ1Y3Rpb24uXG4gICAgICogQGphIE1vZGVsIOOCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gICAgICogICAgIFtbQ29sbGVjdGlvbl1dIOOCr+ODqeOCueOBjCBbW1RNb2RlbF1dIOOCkuani+evieOBmeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCi1xuICAgICAqL1xuICAgIHN0YXRpYyByZWFkb25seSBtb2RlbD86IENsYXNzO1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGNvbnN0cnVjdGlvbi9kZXN0cnVjdGlvbjpcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM/OiBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbW9kZWxPcHRpb25zOiB7fSwgcXVlcnlPcHRpb25zOiB7fSB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucywgcXVlcnlPcHRpb25zIH0gPSBvcHRzO1xuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0ge1xuICAgICAgICAgICAgY29uc3RydWN0T3B0aW9uczogb3B0cyxcbiAgICAgICAgICAgIHByb3ZpZGVyOiBvcHRzLnByb3ZpZGVyIHx8IHRoaXMuc3luYy5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdjb2xsZWN0aW9uOicsIDgpLFxuICAgICAgICAgICAgcXVlcnlPcHRpb25zLFxuICAgICAgICAgICAgcXVlcnlJbmZvOiB7fSxcbiAgICAgICAgICAgIG1vZGVsT3B0aW9ucyxcbiAgICAgICAgICAgIGJ5SWQ6IG5ldyBNYXA8c3RyaW5nLCBUTW9kZWw+KCksXG4gICAgICAgICAgICBzdG9yZTogW10sXG4gICAgICAgIH0gYXMgdW5rbm93biBhcyBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuXG4gICAgICAgIC8qIG1vZGVsIGV2ZW50IGhhbmRsZXIgKi9cbiAgICAgICAgdGhpc1tfb25Nb2RlbEV2ZW50XSA9IChldmVudDogc3RyaW5nLCBtb2RlbDogVE1vZGVsIHwgdW5kZWZpbmVkLCBjb2xsZWN0aW9uOiB0aGlzLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGV2ZW50KSAmJiBldmVudC5zdGFydHNXaXRoKCdAJykgJiYgbW9kZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoKCdAYWRkJyA9PT0gZXZlbnQgfHwgJ0ByZW1vdmUnID09PSBldmVudCkgJiYgY29sbGVjdGlvbiAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgnQGRlc3Ryb3knID09PSBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtb2RlbCBldmVudCBhcmd1bWVudHMgYWRqdXN0bWVudC5cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IChjb2xsZWN0aW9uIGFzIGFueSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gdGhpczsgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZShtb2RlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChldmVudC5zdGFydHNXaXRoKCdAY2hhbmdlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW9kZWwgZXZlbnQgYXJndW1lbnRzIGFkanVzdG1lbnQuXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IHRoaXM7ICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCdAY2hhbmdlJyA9PT0gZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkcyA9IGdldENoYW5nZWRJZHMobW9kZWwsIG1vZGVsQ29uc3RydWN0b3IodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaWQsIHByZXZJZCB9ID0gaWRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2SWQgIT09IGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuc2V0KGlkLCBtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHByZXZJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnlJZC5kZWxldGUocHJldklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBkZWxlZ2F0ZSBldmVudFxuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlci5jYWxsKHRoaXMsIGV2ZW50LCBtb2RlbCwgY29sbGVjdGlvbiwgb3B0aW9ucyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdXNlbGVzcy1jYWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHNlZWRzKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0KHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBqYSBJbml0aWFsaXplIHF1ZXJ5IGluZm9cbiAgICAgKiBAamEg44Kv44Ko44Oq5oOF5aCx44Gu5Yid5pyf5YyWXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGluaXRRdWVyeUluZm8oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzIH0gPSBlbnN1cmVTb3J0T3B0aW9ucyh0aGlzLl9kZWZhdWx0UXVlcnlPcHRpb25zKTtcbiAgICAgICAgdGhpcy5fcXVlcnlJbmZvID0geyBzb3J0S2V5cywgY29tcGFyYXRvcnMgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZWQgYWxsIGluc3RhbmNlcyBhbmQgZXZlbnQgbGlzdGVuZXIgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOCkuegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgKHJlc2VydmVkKS5cbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODsyAo5LqI57SEKVxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IHRoaXMgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uc3RvcmUgPSBbXTtcbiAgICAgICAgdGhpcy5pbml0UXVlcnlJbmZvKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAamEgQ2xlYXIgY2FjaGUgaW5zdGFuY2UgbWV0aG9kXG4gICAgICogQGphIOOCreODo+ODg+OCt+ODpeOBruegtOajhFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBkZWxldGUgdGhpcy5fcXVlcnlJbmZvLmNhY2hlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODiCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG1vZGVscy5cbiAgICAgKiBAamEgTW9kZWwg44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IG1vZGVscygpOiByZWFkb25seSBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IHsgX3F1ZXJ5RmlsdGVyLCBfYWZ0ZXJGaWx0ZXIgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKF9hZnRlckZpbHRlciAmJiBfYWZ0ZXJGaWx0ZXIgIT09IF9xdWVyeUZpbHRlcikgPyBzdG9yZS5maWx0ZXIoX2FmdGVyRmlsdGVyKSA6IHN0b3JlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBudW1iZXIgb2YgbW9kZWxzLlxuICAgICAqIEBqYSDlhoXljIXjgZnjgosgTW9kZWwg5pWwXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5tb2RlbHMubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBhcHBsaWVkIGFmdGVyLWZpbHRlci5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44GM6YGp55So44GV44KM44Gm44GE44KL44GL44KS5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcmVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0gaW5zdGFuY2VcbiAgICAgKiBAamEgW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlJbmZvKCk6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIGluc3RhbmNlXG4gICAgICogQGphIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBzZXQgX3F1ZXJ5SW5mbyh2YWw6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5Pikge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8gPSB2YWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjcmVhdGluZyBvcHRpb25zLlxuICAgICAqIEBqYSDmp4vnr4nmmYLjga7jgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9vcHRpb25zKCk6IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29uc3RydWN0T3B0aW9ucztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcHJvdmlkZXIuXG4gICAgICogQGphIOaXouWumuOBruODl+ODreODkOOCpOODgOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3Byb3ZpZGVyKCk6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5wcm92aWRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcGFyc2UgYmVoYXZpb3VyLlxuICAgICAqIEBqYSDml6Llrprjga4gcGFyc2Ug5YuV5L2c44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfZGVmYXVsdFBhcnNlKCk6IGJvb2xlYW4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9ucy5wYXJzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5pei5a6a44Gu44Kv44Ko44Oq44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfZGVmYXVsdFF1ZXJ5T3B0aW9ucygpOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5T3B0aW9ucztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGxhc3QgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5pyA5b6M44Gu44Kv44Ko44Oq44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfbGFzdFF1ZXJ5T3B0aW9ucygpOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgICAgICBjb25zdCBvcHRzOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+ID0ge307XG5cbiAgICAgICAgc29ydEtleXMubGVuZ3RoICYmIChvcHRzLnNvcnRLZXlzID0gc29ydEtleXMpO1xuICAgICAgICBjb21wYXJhdG9ycy5sZW5ndGggJiYgKG9wdHMuY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycyk7XG4gICAgICAgIGZpbHRlciAmJiAob3B0cy5maWx0ZXIgPSBmaWx0ZXIpO1xuXG4gICAgICAgIHJldHVybiBvcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gc29ydCBjb21wYXJhdG9ycy5cbiAgICAgKiBAamEg44K944O844OI55So5q+U6LyD6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY29tcGFyYXRvcnMoKTogU29ydENhbGxiYWNrPFRNb2RlbD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBxdWVyeS1maWx0ZXIuXG4gICAgICogQGphIOOCr+OCqOODqueUqOODleOCo+ODq+OCv+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5RmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmZpbHRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGFmdGVyLWZpbHRlci5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYWZ0ZXJGaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB1dGlsc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhIG1vZGVsIGZyb20gYSBjb2xsZWN0aW9uLCBzcGVjaWZpZWQgYnkgYW4gYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlLlxuICAgICAqIEBqYSBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrnjgYvjgokgTW9kZWwg44KS54m55a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGdldChzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHNlZWQpICYmIGJ5SWQuaGFzKHNlZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gYnlJZC5nZXQoc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpZCA9IGdldE1vZGVsSWQoaXNNb2RlbChzZWVkKSA/IHNlZWQudG9KU09OKCkgOiBzZWVkIGFzIG9iamVjdCwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSk7XG4gICAgICAgIGNvbnN0IGNpZCA9IChzZWVkIGFzIG9iamVjdCBhcyB7IF9jaWQ/OiBzdHJpbmc7IH0pLl9jaWQ7XG5cbiAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KGlkKSB8fCAoY2lkICYmIGJ5SWQuZ2V0KGNpZCkpIGFzIFRNb2RlbCB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG1vZGVsIGlzIGluIHRoZSBjb2xsZWN0aW9uIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJIE1vZGVsIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoc2VlZDogc3RyaW5nIHwgb2JqZWN0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuZ2V0KHNlZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIE1vZGVsIOWxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogb2JqZWN0W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5tb2RlbHMubWFwKG0gPT4gaXNNb2RlbChtKSA/IG0udG9KU09OKCkgOiBtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZXMgQ2xvbmUgdGhpcyBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Gu6KSH6KO944KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUoKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgY29uc3RydWN0b3IsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikodGhpc1tfcHJvcGVydGllc10uc3RvcmUsIF9vcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yY2UgYSBjb2xsZWN0aW9uIHRvIHJlLXNvcnQgaXRzZWxmLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOimgee0oOOBruWGjeOCveODvOODiFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNvcnQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOOCveODvOODiOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzb3J0KG9wdGlvbnM/OiBDb2xsZWN0aW9uUmVTb3J0T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCB7IG5vVGhyb3csIHNpbGVudCB9ID0gb3B0cztcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBlbnN1cmVTb3J0T3B0aW9ucyhvcHRzKTtcbiAgICAgICAgY29uc3QgY29tcGFyYXRvcnMgPSAwIDwgY29tcHMubGVuZ3RoID8gY29tcHMgOiB0aGlzLl9jb21wYXJhdG9ycztcblxuICAgICAgICBpZiAoY29tcGFyYXRvcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGlmIChub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0NPTVBBUkFUT1JTLCAnQ2Fubm90IHNvcnQgYSBzZXQgd2l0aG91dCBhIGNvbXBhcmF0b3IuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IHNlYXJjaEl0ZW1zKHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLCB0aGlzLl9hZnRlckZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBxdWVyeUluZm9cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnM7XG4gICAgICAgIGlmICgwIDwgc29ydEtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uc29ydEtleXMgPSBzb3J0S2V5cztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc29ydCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbHkgYWZ0ZXItZmlsdGVyIHRvIGNvbGxlY3Rpb24gaXRzZWxmLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgZmlsdGVyIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFNpbGVuY2VhYmxlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBTaWxlbmNlYWJsZSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyKGNhbGxiYWNrOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkLCBvcHRpb25zPzogU2lsZW5jZWFibGUpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGx5IGFmdGVyLWZpbHRlciB0byBjb2xsZWN0aW9uIGl0c2VsZi5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWZ0ZXItZmlsdGVyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDntZ7jgorovrzjgb/jgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyKG9wdGlvbnM6IENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnM8VE1vZGVsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgZmlsdGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRzID0gcGFyc2VGaWx0ZXJBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCB7IGZpbHRlciwgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBpZiAoZmlsdGVyICE9PSB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcikge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BmaWx0ZXInLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG1vZGVsIGF0IHRoZSBnaXZlbiBpbmRleC4gSWYgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4sIHRoZSB0YXJnZXQgd2lsbCBiZSBmb3VuZCBmcm9tIHRoZSBsYXN0IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgavjgojjgosgTW9kZWwg44G444Gu44Ki44Kv44K744K5LiDosqDlgKTjga7loLTlkIjjga/mnKvlsL7mpJzntKLjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBUTW9kZWwge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5tb2RlbHMgYXMgVE1vZGVsW10sIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBtb2RlbC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5pyA5Yid44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IFRNb2RlbCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIGBjb3VudGAgZWxlbWVudHMgb2YgdGhlIG1vZGVsIGZyb20gdGhlIGZpcnN0LlxuICAgICAqIEBqYSBNb2RlbCDjga7lhYjpoK3jgYvjgolgY291bnRgIOWIhuOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdChjb3VudDogbnVtYmVyKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgZmlyc3QoY291bnQ/OiBudW1iZXIpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLm1vZGVscztcbiAgICAgICAgaWYgKG51bGwgPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHMuc2xpY2UoMCwgY291bnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBtb2RlbC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5pyA5Yid44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoKTogVE1vZGVsIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdmFsdWUgb2YgYGNvdW50YCBlbGVtZW50cyBvZiB0aGUgbW9kZWwgZnJvbSB0aGUgbGFzdC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5YWI6aCt44GL44KJYGNvdW50YCDliIbjga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdChjb3VudDogbnVtYmVyKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgbGFzdChjb3VudD86IG51bWJlcik6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMubW9kZWxzO1xuICAgICAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHNbdGFyZ2V0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzLnNsaWNlKC0xICogY291bnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogc3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnZlcnRzIGEgcmVzcG9uc2UgaW50byB0aGUgaGFzaCBvZiBhdHRyaWJ1dGVzIHRvIGJlIGBzZXRgIG9uIHRoZSBjb2xsZWN0aW9uLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyBqdXN0IHRvIHBhc3MgdGhlIHJlc3BvbnNlIGFsb25nLlxuICAgICAqIEBqYSDjg6zjgrnjg53jg7Pjgrnjga7lpInmj5vjg6Hjgr3jg4Pjg4kuIOaXouWumuOBp+OBr+S9leOCguOBl+OBquOBhFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBDb2xsZWN0aW9uU2VlZCB8IENvbGxlY3Rpb25TZWVkW10gfCB2b2lkLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW10gfCB1bmRlZmluZWQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgVE1vZGVsW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBbW2ZldGNoXV0gbWV0aG9kIHByb3h5IHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIFtbQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcl1dIHJldHVybnMgb25lLXNob3QgcmVzdWx0LlxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25JdGVtUHJvdmlkZXJdXSDkupLmj5vjga7ljZjnmbrjga4gZmV0Y2gg57WQ5p6c44KS6L+U5Y20LiDlv4XopoHjgavlv5zjgZjjgabjgqrjg7zjg5Djg7zjg6njgqTjg4nlj6/og70uXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgYXN5bmMgc3luYyhvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgZGVmYXVsdFN5bmMoKS5zeW5jKCdyZWFkJywgdGhpcyBhcyBTeW5jQ29udGV4dCwgb3B0aW9ucykgYXMgVE1vZGVsW107XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmV0Y2ggdGhlIFtbTW9kZWxdXSBmcm9tIHRoZSBzZXJ2ZXIsIG1lcmdpbmcgdGhlIHJlc3BvbnNlIHdpdGggdGhlIG1vZGVsJ3MgbG9jYWwgYXR0cmlidXRlcy5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OBruOCteODvOODkOODvOWQjOacny4g44Os44K544Od44Oz44K544Gu44Oe44O844K444KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZmV0Y2ggb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODleOCp+ODg+ODgeOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBmZXRjaChvcHRpb25zPzogQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogUHJvbWlzZTxvYmplY3RbXT4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHByb2dyZXNzOiBub29wIH0sIHRoaXMuX2RlZmF1bHRRdWVyeU9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHByb2dyZXNzOiBvcmlnaW5hbCwgbGltaXQsIHJlc2V0LCBub0NhY2hlIH0gPSBvcHRzO1xuICAgICAgICAgICAgY29uc3QgeyBfcXVlcnlJbmZvLCBfcHJvdmlkZXIgfSA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBmaW5hbGl6ZSA9IChudWxsID09IGxpbWl0KTtcblxuICAgICAgICAgICAgb3B0cy5wcm9ncmVzcyA9IChpbmZvOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRNb2RlbD4pID0+IHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbChpbmZvKTtcbiAgICAgICAgICAgICAgICAhZmluYWxpemUgJiYgdGhpcy5hZGQoaW5mby5pdGVtcywgb3B0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAobm9DYWNoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJDYWNoZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZpbmFsaXplICYmIHJlc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldCh1bmRlZmluZWQsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgcXVlcnlJdGVtcyhfcXVlcnlJbmZvLCBfcHJvdmlkZXIsIG9wdHMpO1xuXG4gICAgICAgICAgICBpZiAoZmluYWxpemUpIHtcbiAgICAgICAgICAgICAgICByZXNldCA/IHRoaXMucmVzZXQocmVzcCwgb3B0cykgOiB0aGlzLmFkZChyZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIENvbGxlY3Rpb24sIHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BlcnJvcicsIHVuZGVmaW5lZCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBgZmV0Y2goKWAgd2l0aCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOWJjeWbnuOBqOWQjOadoeS7tuOBpyBgZmV0Y2goKWAg44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVxdWVyeSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlcXVlcnkob3B0aW9ucz86IENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyk6IFByb21pc2U8b2JqZWN0W10+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2xhc3RRdWVyeU9wdGlvbnMsIG9wdGlvbnMsIHsgcmVzZXQ6IHRydWUgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoKG9wdHMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGNvbGxlY3Rpb24gc2V0dXBcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIE5pbCB2YWx1ZS5cbiAgICAgKiAgLSBgamFgIE5pbCDopoHntKBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWQ6IHVuZGVmaW5lZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIENvbGxlY3Rpb24g44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgasgTW9kZWwg44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYQgTW9kZWwg44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWRzOiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIHNldChzZWVkcz86IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdm9pZCB7XG4gICAgICAgIGlmIChpc05pbChzZWVkcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcGFyc2U6IHRoaXMuX2RlZmF1bHRQYXJzZSB9LCBfc2V0T3B0aW9ucywgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgaWYgKG9wdHMucGFyc2UgJiYgIWlzQ29sbGVjdGlvbk1vZGVsKHNlZWRzLCB0aGlzKSkge1xuICAgICAgICAgICAgc2VlZHMgPSB0aGlzLnBhcnNlKHNlZWRzLCBvcHRpb25zKSB8fCBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtczogKFRNb2RlbCB8IG9iamVjdCB8IHVuZGVmaW5lZClbXSA9IHNpbmd1bGFyID8gW3NlZWRzXSA6IChzZWVkcyBhcyBvYmplY3RbXSkuc2xpY2UoKTtcblxuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcblxuICAgICAgICBjb25zdCBhdCA9ICgoY2FuZGlkYXRlKTogbnVtYmVyIHwgdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlID4gc3RvcmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSArPSBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoY2FuZGlkYXRlIDwgMCkgPyAwIDogY2FuZGlkYXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KShvcHRzLmF0KTtcblxuICAgICAgICBjb25zdCBzZXQ6IG9iamVjdFtdICAgICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9BZGQ6IFRNb2RlbFtdICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvTWVyZ2U6IFRNb2RlbFtdICA9IFtdO1xuICAgICAgICBjb25zdCB0b1JlbW92ZTogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgY29uc3QgbW9kZWxTZXQgPSBuZXcgU2V0PG9iamVjdD4oKTtcblxuICAgICAgICBjb25zdCB7IGFkZCwgbWVyZ2UsIHJlbW92ZSwgcGFyc2UsIHNpbGVudCB9ID0gb3B0cztcblxuICAgICAgICBsZXQgc29ydCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBzb3J0YWJsZSA9IHRoaXMuX2NvbXBhcmF0b3JzLmxlbmd0aCAmJiBudWxsID09IGF0ICYmIGZhbHNlICE9PSBvcHRzLnNvcnQ7XG5cbiAgICAgICAgdHlwZSBNb2RlbEZlYXR1cmUgPSB7XG4gICAgICAgICAgICBwYXJzZTogKGF0cnI/OiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IG9iamVjdDtcbiAgICAgICAgICAgIHNldEF0dHJpYnV0ZXM6IChhdHJyOiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IHZvaWQ7XG4gICAgICAgICAgICBoYXNDaGFuZ2VkOiAoKSA9PiBib29sZWFuO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFR1cm4gYmFyZSBvYmplY3RzIGludG8gbW9kZWwgcmVmZXJlbmNlcywgYW5kIHByZXZlbnQgaW52YWxpZCBtb2RlbHMgZnJvbSBiZWluZyBhZGRlZC5cbiAgICAgICAgZm9yIChjb25zdCBbaSwgaXRlbV0gb2YgaXRlbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAvLyBJZiBhIGR1cGxpY2F0ZSBpcyBmb3VuZCwgcHJldmVudCBpdCBmcm9tIGJlaW5nIGFkZGVkIGFuZCBvcHRpb25hbGx5IG1lcmdlIGl0IGludG8gdGhlIGV4aXN0aW5nIG1vZGVsLlxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmdldChpdGVtKSBhcyBNb2RlbEZlYXR1cmU7XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVyZ2UgJiYgaXRlbSAhPT0gZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJzID0gaXNNb2RlbChpdGVtKSA/IGl0ZW0udG9KU09OKCkgOiBpdGVtO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2UgJiYgaXNGdW5jdGlvbihleGlzdGluZy5wYXJzZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzID0gZXhpc3RpbmcucGFyc2UoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZXhpc3Rpbmcuc2V0QXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nLnNldEF0dHJpYnV0ZXMoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihleGlzdGluZywgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdG9NZXJnZS5wdXNoKGV4aXN0aW5nIGFzIFRNb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3J0YWJsZSAmJiAhc29ydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydCA9IGlzRnVuY3Rpb24oZXhpc3RpbmcuaGFzQ2hhbmdlZCkgPyBleGlzdGluZy5oYXNDaGFuZ2VkKCkgOiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKGV4aXN0aW5nKSkge1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQoZXhpc3RpbmcpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGl0ZW1zW2ldID0gZXhpc3Rpbmc7XG4gICAgICAgICAgICB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgYnJhY2Utc3R5bGVcblxuICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIG5ldywgdmFsaWQgbW9kZWwsIHB1c2ggaXQgdG8gdGhlIGB0b0FkZGAgbGlzdC5cbiAgICAgICAgICAgIGVsc2UgaWYgKGFkZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gaXRlbXNbaV0gPSB0aGlzW19wcmVwYXJlTW9kZWxdKGl0ZW0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgICAgICAgICB0b0FkZC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfYWRkUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgc3RhbGUgbW9kZWxzLlxuICAgICAgICBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIHN0b3JlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMobW9kZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvUmVtb3ZlLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b1JlbW92ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzW19yZW1vdmVNb2RlbHNdKHRvUmVtb3ZlLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlZSBpZiBzb3J0aW5nIGlzIG5lZWRlZCwgdXBkYXRlIGBsZW5ndGhgIGFuZCBzcGxpY2UgaW4gbmV3IG1vZGVscy5cbiAgICAgICAgbGV0IG9yZGVyQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCByZXBsYWNlID0gIXNvcnRhYmxlICYmIGFkZCAmJiByZW1vdmU7XG4gICAgICAgIGlmIChzZXQubGVuZ3RoICYmIHJlcGxhY2UpIHtcbiAgICAgICAgICAgIG9yZGVyQ2hhbmdlZCA9IChzdG9yZS5sZW5ndGggIT09IHNldC5sZW5ndGgpIHx8IHN0b3JlLnNvbWUoKG0sIGluZGV4KSA9PiBtICE9PSBzZXRbaW5kZXhdKTtcbiAgICAgICAgICAgIHN0b3JlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgc2V0LCAwKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b0FkZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChzb3J0YWJsZSkge1xuICAgICAgICAgICAgICAgIHNvcnQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3BsaWNlQXJyYXkoc3RvcmUsIHRvQWRkLCBudWxsID09IGF0ID8gc3RvcmUubGVuZ3RoIDogYXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2lsZW50bHkgc29ydCB0aGUgY29sbGVjdGlvbiBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgaWYgKHNvcnQpIHtcbiAgICAgICAgICAgIHRoaXMuc29ydCh7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVubGVzcyBzaWxlbmNlZCwgaXQncyB0aW1lIHRvIGZpcmUgYWxsIGFwcHJvcHJpYXRlIGFkZC9zb3J0L3VwZGF0ZSBldmVudHMuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtpLCBtb2RlbF0gb2YgdG9BZGQuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGF0ICsgaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50QnJva2VyKSkge1xuICAgICAgICAgICAgICAgICAgICAobW9kZWwgYXMgTW9kZWwpLnRyaWdnZXIoJ0BhZGQnLCBtb2RlbCBhcyBNb2RlbCwgdGhpcywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGFkZCcsIG1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzb3J0IHx8IG9yZGVyQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0Bzb3J0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b0FkZC5sZW5ndGggfHwgdG9SZW1vdmUubGVuZ3RoIHx8IHRvTWVyZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0ge1xuICAgICAgICAgICAgICAgICAgICBhZGRlZDogdG9BZGQsXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZWQ6IHRvUmVtb3ZlLFxuICAgICAgICAgICAgICAgICAgICBtZXJnZWQ6IHRvTWVyZ2VcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZHJvcCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgcmV0dmFsID0gaXRlbXMuZmlsdGVyKGkgPT4gbnVsbCAhPSBpKSBhcyBUTW9kZWxbXTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIGFkZGVkIChvciBtZXJnZWQpIG1vZGVsIChvciBtb2RlbHMpLlxuICAgICAgICByZXR1cm4gc2luZ3VsYXIgPyByZXR2YWxbMF0gOiAocmV0dmFsLmxlbmd0aCA/IHJldHZhbCA6IHZvaWQgMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgYSBjb2xsZWN0aW9uIHdpdGggYSBuZXcgbGlzdCBvZiBtb2RlbHMgKG9yIGF0dHJpYnV0ZSBoYXNoZXMpLCB0cmlnZ2VyaW5nIGEgc2luZ2xlIGByZXNldGAgZXZlbnQgb24gY29tcGxldGlvbi5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjgpLmlrDjgZfjgYQgTW9kZWwg5LiA6Kan44Gn572u5o+bLiDlrozkuobmmYLjgasgYHJlc2V0YCDjgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODquOCu+ODg+ODiOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNldChzZWVkcz86IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMgJiB7IHByZXZpb3VzOiBUTW9kZWxbXTsgfTtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cy5wcmV2aW91cyA9IHN0b3JlLnNsaWNlKCk7XG4gICAgICAgIHJlc2V0TW9kZWxTdG9yZSh0aGlzW19wcm9wZXJ0aWVzXSk7XG5cbiAgICAgICAgY29uc3QgbW9kZWxzID0gc2VlZHMgPyB0aGlzLmFkZChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSkgOiBbXTtcblxuICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAcmVzZXQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vZGVscztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG1vZGVsIHRvIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBuOOBriBNb2RlbCDjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGQoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB0byB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogQGphIE1vZGVsIOODquOCueODiOaMh+WumuOBq+OCiOOCiyBDb2xsZWN0aW9uIOOBuOOBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGQoc2VlZHM6IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldChzZWVkcyBhcyBVbmtub3duT2JqZWN0LCBPYmplY3QuYXNzaWduKHsgbWVyZ2U6IGZhbHNlIH0sIG9wdGlvbnMsIF9hZGRPcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjgYvjgokgTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVtb3ZlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDliYrpmaTjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBsaXN0IG9mIG1vZGVscyBmcm9tIHRoZSBzZXQuXG4gICAgICogQGphIE1vZGVsIOODquOCueODiOaMh+WumuOBq+OCiOOCiyBDb2xsZWN0aW9uIOOBi+OCieOBruWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBzaW5ndWxhciA/IFtzZWVkcyBhcyBUTW9kZWxdIDogKHNlZWRzIGFzIFRNb2RlbFtdKS5zbGljZSgpO1xuICAgICAgICBjb25zdCByZW1vdmVkID0gdGhpc1tfcmVtb3ZlTW9kZWxzXShpdGVtcywgb3B0cyk7XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHsgYWRkZWQ6IFtdLCBtZXJnZWQ6IFtdLCByZW1vdmVkIH07XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2luZ3VsYXIgPyByZW1vdmVkWzBdIDogcmVtb3ZlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgbW9kZWwgdG8gdGhlIGVuZCBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+44GrIE1vZGVsIOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHB1c2goc2VlZDogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2VlZCwgT2JqZWN0LmFzc2lnbih7IGF0OiBzdG9yZS5sZW5ndGggfSwgb3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacq+WwvuOBriBNb2RlbCDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHBvcChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHN0b3JlW3N0b3JlLmxlbmd0aCAtIDFdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgbW9kZWwgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt44GrIE1vZGVsIOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHVuc2hpZnQoc2VlZDogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZChzZWVkLCBPYmplY3QuYXNzaWduKHsgYXQ6IDAgfSwgb3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOWFiOmgreOBriBNb2RlbCDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNoaWZ0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc3RvcmVbMF0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgYSBtb2RlbCBpbiB0aGlzIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOaWsOOBl+OBhCBNb2RlbCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJDjgZcsIENvbGxlY3Rpb24g44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cnNcbiAgICAgKiAgLSBgZW5gIGF0dHJpYnV0ZXMgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5bGe5oCn44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG1vZGVsIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgTW9kZWwg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNyZWF0ZShhdHRyczogb2JqZWN0LCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3Qgc2VlZCA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oYXR0cnMsIG9wdGlvbnMgYXMgU2lsZW5jZWFibGUpO1xuICAgICAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtb2RlbCA9IGlzTW9kZWwoc2VlZCkgPyBzZWVkIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXdhaXQgfHwgIW1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vZGVsLnNhdmUodW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHNlZWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZXJyb3InLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBtb2RlbCBwcmVwYXJhdGlvbiAqL1xuICAgIHByaXZhdGUgW19wcmVwYXJlTW9kZWxdKGF0dHJzOiBvYmplY3QgfCBUTW9kZWwgfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKGlzQ29sbGVjdGlvbk1vZGVsKGF0dHJzLCB0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBtb2RlbENvbnN0cnVjdG9yKHRoaXMpO1xuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucyB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGlmIChjb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG1vZGVsT3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IG5ldyBjb25zdHJ1Y3RvcihhdHRycywgb3B0cykgYXMgeyB2YWxpZGF0ZTogKCkgPT4gUmVzdWx0OyB9O1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24obW9kZWwudmFsaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbW9kZWwudmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAaW52YWxpZCcsIGF0dHJzIGFzIE1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIHJlc3VsdCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsIGFzIFRNb2RlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBsYWluIG9iamVjdFxuICAgICAgICByZXR1cm4gYXR0cnMgYXMgVE1vZGVsO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIGNhbGxlZCBieSBib3RoIHJlbW92ZSBhbmQgc2V0LiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVNb2RlbHNdKG1vZGVsczogVE1vZGVsW10sIG9wdGlvbnM6IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBtZGwgb2YgbW9kZWxzKSB7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IHRoaXMuZ2V0KG1kbCk7XG4gICAgICAgICAgICBpZiAoIW1vZGVsKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzdG9yZS5pbmRleE9mKG1vZGVsKTtcbiAgICAgICAgICAgIHN0b3JlLnNwbGljZShpbmRleCwgMSk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSByZWZlcmVuY2VzIGJlZm9yZSB0cmlnZ2VyaW5nICdyZW1vdmUnIGV2ZW50IHRvIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcC5cbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwsIHRydWUpO1xuXG4gICAgICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0ByZW1vdmUnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlbW92ZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gY3JlYXRlIGEgbW9kZWwncyB0aWVzIHRvIGEgY29sbGVjdGlvbi4gKi9cbiAgICBwcml2YXRlIFtfYWRkUmVmZXJlbmNlXShtb2RlbDogVE1vZGVsKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLnNldChfY2lkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuc2V0KGlkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgdGhpc1tfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCB0byBzZXZlciBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCwgcGFydGlhbCA9IGZhbHNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLmRlbGV0ZShfY2lkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGFydGlhbCAmJiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRQdWJsaXNoZXIpKSkge1xuICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKG1vZGVsIGFzIFN1YnNjcmliYWJsZSwgJyonLCB0aGlzW19vbk1vZGVsRXZlbnRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFRNb2RlbD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRvciBvZiBbW0VsZW1lbnRCYXNlXV0gdmFsdWVzIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg5qC857SN44GX44Gm44GE44KLIFtbRWxlbWVudEJhc2VdXSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUTW9kZWw+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLm1vZGVscyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFRNb2RlbD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUTW9kZWw+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleShpZCksIHZhbHVlKG1vZGVsKSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpLCB2YWx1ZShtb2RlbCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtzdHJpbmcsIFRNb2RlbF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gW2tleSwgdmFsdWVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXlzKGlkKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpZCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nKSA9PiBrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcy5tb2RlbHMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvczJrZXkgPSAocG9zOiBudW1iZXIpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGdldE1vZGVsSWQoY29udGV4dC5iYXNlW3Bvc10sIG1vZGVsQ29uc3RydWN0b3IodGhpcykpIHx8IFN0cmluZyhwb3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihwb3Mya2V5KGN1cnJlbnQpLCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yO1xuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKENvbGxlY3Rpb24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4iLCJpbXBvcnQgdHlwZSB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEFycmF5Q2hhbmdlUmVjb3JkIH0gZnJvbSAnQGNkcC9vYnNlcnZhYmxlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHR5cGUgeyBMaXN0Q2hhbmdlZCwgTGlzdEVkaXRPcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgY2xlYXJBcnJheSxcbiAgICBhcHBlbmRBcnJheSxcbiAgICBpbnNlcnRBcnJheSxcbiAgICByZW9yZGVyQXJyYXksXG4gICAgcmVtb3ZlQXJyYXksXG59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0aW9uIH0gZnJvbSAnLi9iYXNlJztcblxuLyoqXG4gKiBAZW4gRWRpdGVkIGNvbGxlY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIOiiq+e3qOmbhiBDb2xsZWN0aW9uIOOBruWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsZWN0aW9uRWRpdGVlPE0gZXh0ZW5kcyBvYmplY3Q+ID0gQ29sbGVjdGlvbjxNLCBhbnksIGFueT47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwcmVwYXJlPFQgZXh0ZW5kcyBvYmplY3Q+KGNvbGxlY3Rpb246IENvbGxlY3Rpb248VD4pOiBUW10gfCBuZXZlciB7XG4gICAgaWYgKGNvbGxlY3Rpb24uZmlsdGVyZWQpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfRURJVF9QRVJNSVNTSU9OX0RFTklFRCwgJ2NvbGxlY3Rpb24gaXMgYXBwbGllZCBhZnRlci1maWx0ZXIuJyk7XG4gICAgfVxuICAgIHJldHVybiBjb2xsZWN0aW9uLm1vZGVscy5zbGljZSgpO1xufVxuXG4vKiogQGludGVybmFsICovXG5hc3luYyBmdW5jdGlvbiBleGVjPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248VD4sXG4gICAgb3B0aW9uczogTGlzdEVkaXRPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAgIG9wZXJhdGlvbjogKHRhcmdldHM6IFRbXSwgdG9rZW46IENhbmNlbFRva2VuIHwgdW5kZWZpbmVkKSA9PiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+LFxuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgY29uc3QgdGFyZ2V0cyA9IHByZXBhcmU8VD4oY29sbGVjdGlvbik7XG4gICAgY29uc3QgY2hhbmdlID0gYXdhaXQgb3BlcmF0aW9uKHRhcmdldHMsIG9wdGlvbnM/LmNhbmNlbCk7XG4gICAgY29sbGVjdGlvbi5zZXQodGFyZ2V0cywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGNoYW5nZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gbWluKGluZGljZXM6IG51bWJlcltdKTogbnVtYmVyIHtcbiAgICByZXR1cm4gaW5kaWNlcy5yZWR1Y2UoKGxocywgcmhzKSA9PiBNYXRoLm1pbihsaHMsIHJocykpO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBtYWtlTGlzdENoYW5nZWQ8VD4oXG4gICAgdHlwZTogJ2FkZCcgfCAncmVtb3ZlJyB8ICdyZW9yZGVyJyxcbiAgICBjaGFuZ2VzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdLFxuICAgIHJhbmdlRnJvbTogbnVtYmVyLFxuICAgIHJhbmdlVG86IG51bWJlcixcbiAgICBhdD86IG51bWJlcixcbik6IExpc3RDaGFuZ2VkPFQ+IHtcbiAgICBjb25zdCBjaGFuZ2VkID0gISFjaGFuZ2VzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlLFxuICAgICAgICBsaXN0OiBjaGFuZ2VzLFxuICAgICAgICByYW5nZTogY2hhbmdlZCA/IHsgZnJvbTogcmFuZ2VGcm9tLCB0bzogcmFuZ2VUbyB9IDogdW5kZWZpbmVkLFxuICAgICAgICBpbnNlcnRlZFRvOiBjaGFuZ2VkID8gYXQgOiB1bmRlZmluZWQsXG4gICAgfSBhcyBMaXN0Q2hhbmdlZDxUPjtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXIgYWxsIGVsZW1lbnRzIG9mIFtbQ29sbGVjdGlvbl1dLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIOimgee0oOOBruWFqOWJiumZpFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCBbW0NvbGxlY3Rpb25dXVxuICogIC0gYGphYCDlr77osaEgW1tDb2xsZWN0aW9uXV1cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0gcmVmZXJlbmNlLlxuICogIC0gYGphYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZVRvID0gY29sbGVjdGlvbi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gY2xlYXJBcnJheSh0YXJnZXRzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3JlbW92ZScsIGNoYW5nZXMsIDAsIHJhbmdlVG8pO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgW1tDb2xsZWN0aW9uXV0uXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgc3JjOiBUW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IGNvbGxlY3Rpb24ubGVuZ3RoO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gYXBwZW5kQXJyYXkodGFyZ2V0cywgc3JjLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ2FkZCcsIGNoYW5nZXMsIHJhbmdlRnJvbSwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCByYW5nZUZyb20pO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBbW0NvbGxlY3Rpb25dXS5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDjga7mjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgaW5kZXg6IG51bWJlcixcbiAgICBzcmM6IFRbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBpbnNlcnRBcnJheSh0YXJnZXRzLCBpbmRleCwgc3JjLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ2FkZCcsIGNoYW5nZXMsIGluZGV4LCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIGluZGV4KTtcbn1cblxuLyoqXG4gKiBAZW4gUmVvcmRlciBbW0NvbGxlY3Rpb25dXSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDpoIXnm67jga7kvY3nva7jgpLlpInmm7RcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBpbmRleDogbnVtYmVyLFxuICAgIG9yZGVyczogbnVtYmVyW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IG1pbihbaW5kZXgsIC4uLm9yZGVyc10pO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gcmVvcmRlckFycmF5KHRhcmdldHMsIGluZGV4LCBvcmRlcnMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVvcmRlcicsIGNoYW5nZXMsIHJhbmdlRnJvbSwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCBpbmRleCk7XG59XG5cbi8qKlxuICogQGVuIFJlbW92ZSBbW0NvbGxlY3Rpb25dXSBlbGVtZW50cy5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDpoIXnm67jga7liYrpmaRcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgb3JkZXJzOiBudW1iZXJbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gbWluKG9yZGVycyk7XG4gICAgY29uc3QgcmFuZ2VUbyA9IGNvbGxlY3Rpb24ubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IHJlbW92ZUFycmF5KHRhcmdldHMsIG9yZGVycywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW1vdmUnLCBjaGFuZ2VzLCByYW5nZUZyb20sIHJhbmdlVG8pO1xufVxuIl0sIm5hbWVzIjpbImdldExhbmd1YWdlIiwidHJ1bmMiLCJPYnNlcnZhYmxlQXJyYXkiLCJjYyIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInVuaXF1ZSIsImNvbXB1dGVEYXRlIiwiaXNGdW5jdGlvbiIsInNvcnQiLCJzaHVmZmxlIiwiaXNTdHJpbmciLCJFdmVudFNvdXJjZSIsImx1aWQiLCJpc01vZGVsIiwiYXQiLCJkZWZhdWx0U3luYyIsIm5vb3AiLCJpc05pbCIsImlzQXJyYXkiLCJtb2RlbCIsIkV2ZW50QnJva2VyIiwicmVzdWx0IiwiRkFJTEVEIiwiRXZlbnRQdWJsaXNoZXIiLCJzZXRNaXhDbGFzc0F0dHJpYnV0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7OztJQUlHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBS0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFMRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLHdCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsd0JBQWlELENBQUE7WUFDakQsV0FBbUMsQ0FBQSxXQUFBLENBQUEsMEJBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLG9DQUE2QixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQSxHQUFBLDBCQUFBLENBQUE7WUFDOUgsV0FBbUMsQ0FBQSxXQUFBLENBQUEsK0JBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLG9DQUE2QixDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQSxHQUFBLCtCQUFBLENBQUE7WUFDbkksV0FBbUMsQ0FBQSxXQUFBLENBQUEsa0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLG9DQUE2QixDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQSxHQUFBLGtDQUFBLENBQUE7SUFDN0ksS0FBQyxHQUFBLENBQUE7SUFDTCxDQUFDLEdBQUE7O0lDVEQ7SUFDQSxJQUFJLFNBQVMsR0FBcUIsTUFBb0I7SUFDbEQsSUFBQSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQ0EsZ0JBQVcsRUFBRSxFQUFF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