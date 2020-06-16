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
     ,  @typescript-eslint/no-unused-vars
     ,  @typescript-eslint/restrict-plus-operands
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
     ,  @typescript-eslint/ban-types
     ,  @typescript-eslint/restrict-template-expressions
     ,  @typescript-eslint/explicit-module-boundary-types
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

    /* eslint-disable
        @typescript-eslint/ban-types
     ,  @typescript-eslint/restrict-template-expressions
     ,  @typescript-eslint/explicit-module-boundary-types
     */
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

    /* eslint-disable
        @typescript-eslint/ban-types
     ,  @typescript-eslint/restrict-template-expressions
     */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICwgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQ09MTEVDVElPTiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDEwLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8temAmuOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX01PREVMX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUyA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAxLCAnaW52YWxpZCBhY2Nlc3MuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZ2V0TGFuZ3VhZ2UgfSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBTb3J0T3JkZXIsXG4gICAgU29ydENhbGxiYWNrLFxuICAgIFNvcnRLZXksXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBgSW50bC5Db2xsYXRvcmAgZmFjdG9yeSBmdW5jdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEgYEludGwuQ29sbGF0b3JgIOOCkui/lOWNtOOBmeOCi+mWouaVsOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsYXRvclByb3ZpZGVyID0gKCkgPT4gSW50bC5Db2xsYXRvcjtcblxuLyoqIEBpbnRlcm5hbCBkZWZhdWx0IEludGwuQ29sbGF0b3IgcHJvdmlkZXIgKi9cbmxldCBfY29sbGF0b3I6IENvbGxhdG9yUHJvdmlkZXIgPSAoKTogSW50bC5Db2xsYXRvciA9PiB7XG4gICAgcmV0dXJuIG5ldyBJbnRsLkNvbGxhdG9yKGdldExhbmd1YWdlKCksIHsgc2Vuc2l0aXZpdHk6ICdiYXNlJywgbnVtZXJpYzogdHJ1ZSB9KTtcbn07XG5cbi8qKlxuICogQGphIOaXouWumuOBriBJbnRsLkNvbGxhdG9yIOOCkuioreWumlxuICpcbiAqIEBwYXJhbSBuZXdQcm92aWRlclxuICogIC0gYGVuYCBuZXcgW1tDb2xsYXRvclByb3ZpZGVyXV0gb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC5cbiAqICAtIGBqYWAg6Kit5a6a44GV44KM44Gm44GE44GfIFtbQ29sbGF0b3JQcm92aWRlcl1dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdENvbGxhdG9yUHJvdmlkZXIobmV3UHJvdmlkZXI/OiBDb2xsYXRvclByb3ZpZGVyKTogQ29sbGF0b3JQcm92aWRlciB7XG4gICAgaWYgKG51bGwgPT0gbmV3UHJvdmlkZXIpIHtcbiAgICAgICAgcmV0dXJuIF9jb2xsYXRvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRQcm92aWRlciA9IF9jb2xsYXRvcjtcbiAgICAgICAgX2NvbGxhdG9yID0gbmV3UHJvdmlkZXI7XG4gICAgICAgIHJldHVybiBvbGRQcm92aWRlcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEdldCBzdHJpbmcgY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDmloflrZfliJfmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCBwcm9wZXJ0eSBuYW1lXG4gKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICogQHBhcmFtIG9yZGVyXG4gKiAgLSBgZW5gIHNvcnQgb3JkZXIgY29kZVxuICogIC0gYGphYCDjgr3jg7zjg4jpoIbjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIC8vIHVuZGVmaW5lZCDjga8gJycg44Go5ZCM562J44Gr5omx44GGXG4gICAgICAgIGNvbnN0IGxoc1Byb3AgPSAobnVsbCAhPSBsaHNbcHJvcCBhcyBzdHJpbmddKSA/IGxoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgY29uc3QgcmhzUHJvcCA9IChudWxsICE9IHJoc1twcm9wIGFzIHN0cmluZ10pID8gcmhzW3Byb3AgYXMgc3RyaW5nXSA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wIGFzIHN0cmluZ107XG4gICAgICAgIGNvbnN0IHJoc0RhdGUgPSByaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobGhzRGF0ZSA9PT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gKHVuZGVmaW5lZCA9PT0gdW5kZWZpbmVkKSBvciDoh6rlt7Hlj4LnhadcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNEYXRlKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbGhzVmFsdWUgPSBPYmplY3QobGhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgY29uc3QgcmhzVmFsdWUgPSBPYmplY3QocmhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgaWYgKGxoc1ZhbHVlID09PSByaHNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGxoc1ZhbHVlIDwgcmhzVmFsdWUgPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBnZW5lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24gYnkgY29tcGFyYXRpdmUgb3BlcmF0b3IuXG4gKiBAamEg5q+U6LyD5ryU566X5a2Q44KS55So44GE44Gf5rGO55So5q+U6LyD6Zai5pWw44Gu5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGxoc1twcm9wIGFzIHN0cmluZ10gPT09IHJoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcCBhcyBzdHJpbmddIDwgcmhzW3Byb3AgYXMgc3RyaW5nXSA/IC0xICogb3JkZXIgOiAxICogb3JkZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGJvb2xlYW4gY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDnnJ/lgb3lgKTmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEJvb2xlYW5Db21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIEdldCBudW1lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pWw5YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXROdW1iZXJDb21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBmcm9tIFtbU29ydEtleV1dLlxuICogQGphIFtbU29ydEtleV1dIOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHByb3BOYW1lID0gc29ydEtleS5uYW1lO1xuICAgIHN3aXRjaCAoc29ydEtleS50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4ocHJvcE5hbWUsIHNvcnRLZXkub3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIFtbU29ydEtleV1dIGFycmF5LlxuICogQGphIFtbU29ydEtleV1dIOmFjeWIl+OCkiBjb21wYXJhdG9yIOmFjeWIl+OBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNvcnRLZXlzPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXlzOiBTb3J0S2V5PEs+W10pOiBTb3J0Q2FsbGJhY2s8VD5bXSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUPltdID0gW107XG4gICAgZm9yIChjb25zdCBzb3J0S2V5IG9mIHNvcnRLZXlzKSB7XG4gICAgICAgIGNvbXBhcmF0b3JzLnB1c2godG9Db21wYXJhdG9yKHNvcnRLZXkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBhcmF0b3JzO1xufVxuIiwiLyoqXG4gKiBAZW4gQ3Vyc29yIHBvc2l0aW9uIGNvbnN0YW50LlxuICogQGphIOOCq+ODvOOCveODq+S9jee9ruWumuaVsFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDdXJzb3JQb3Mge1xuICAgIE9VVF9PRl9SQU5HRSAgICA9IC0xLFxuICAgIENVUlJFTlQgICAgICAgICA9IC0yLFxufVxuXG4vKipcbiAqIEBlbiBTZWVrIGV4cHJlc3Npb24gZnVuY3Rpb24gdHlwZS5cbiAqIEBqYSDjgrfjg7zjgq/lvI/plqLmlbDlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vla0V4cDxUPiA9ICh2YWx1ZTogVCwgaW5kZXg/OiBudW1iZXIsIG9iaj86IFRbXSkgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHByb3ZpZGVzIGN1cnNvciBpbnRlcmZhY2UgZm9yIEFycmF5LiA8YnI+XG4gKiAgICAgSXQgaXMgZGlmZmVyZW50IGZyb20gSXRlcmF0b3IgaW50ZXJmYWNlIG9mIGVzMjAxNSwgYW5kIHRoYXQgcHJvdmlkZXMgaW50ZXJmYWNlIHdoaWNoIGlzIHNpbWlsYXIgdG8gREIgcmVjb3Jkc2V0J3Mgb25lLlxuICogQGphIEFycmF5IOeUqOOCq+ODvOOCveODqyBJL0Yg44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBlczIwMTUg44GuIEl0ZXJhdG9yIEkvRiDjgajjga/nlbDjgarjgorjgIFEQiByZWNvcmRzZXQg44Kq44OW44K444Kn44Kv44OI44Op44Kk44Kv44Gq6LWw5p+7IEkvRiDjgpLmj5DkvpvjgZnjgotcbiAqL1xuZXhwb3J0IGNsYXNzIEFycmF5Q3Vyc29yPFQgPSBhbnk+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLyoqIEBpbnRlcm5hbCDlr77osaHjga7phY3liJcgICovXG4gICAgcHJpdmF0ZSBfYXJyYXk6IFRbXTtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruWFiOmgreOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICAqL1xuICAgIHByaXZhdGUgX2JvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruacq+WwvuOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfZW9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg54++5Zyo44GuIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogMFxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiAwXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXJyYXk6IFRbXSwgaW5pdGlhbEluZGV4ID0gMCkge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgdGFyZ2V0IGFycmF5LlxuICAgICAqIEBqYSDlr77osaHjga7lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5LiBkZWZhdWx0OiBlbXB0eSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+Wumi4gICBkZWZhdWx0OiDnqbrphY3liJdcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoYXJyYXk6IFRbXSA9IFtdLCBpbml0aWFsSW5kZXg6IG51bWJlciA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0UpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGN1cnJlbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheVt0aGlzLl9pbmRleF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjmjIfjgZfnpLrjgZfjgabjgYTjgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRhcmdldCBhcnJheSBsZW5ndGguXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBruimgee0oOaVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgQk9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5YWI6aCt44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQk9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBFT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7mnKvlsL7jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lb2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByYXcgYXJyYXkgaW5zdGFuY2UuXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBhcnJheSgpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY3Vyc29yIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGZpcnN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOWFiOmgreimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlRmlyc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBsYXN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOacq+Wwvuimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTGFzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIG5leHQgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5qyh44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVOZXh0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZikge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIHByZXZpb3VzIGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuWJjeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlUHJldmlvdXMoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fZW9mKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VlayBieSBwYXNzZWQgY3JpdGVyaWEuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG9wZXJhdGlvbiBmYWlsZWQsIHRoZSBjdXJzb3IgcG9zaXRpb24gc2V0IHRvIEVPRi5cbiAgICAgKiBAamEg5oyH5a6a5p2h5Lu244Gn44K344O844KvIDxicj5cbiAgICAgKiAgICAg44K344O844Kv44Gr5aSx5pWX44GX44Gf5aC05ZCI44GvIEVPRiDnirbmhYvjgavjgarjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjcml0ZXJpYVxuICAgICAqICAtIGBlbmAgaW5kZXggb3Igc2VlayBleHByZXNzaW9uXG4gICAgICogIC0gYGphYCBpbmRleCAvIOadoeS7tuW8j+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzZWVrKGNyaXRlcmlhOiBudW1iZXIgfCBTZWVrRXhwPFQ+KTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBjcml0ZXJpYSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBjcml0ZXJpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkuZmluZEluZGV4KGNyaXRlcmlhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIOOCq+ODvOOCveODq+OBjOacieWKueOBquevhOWbsuOCkuekuuOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0cnVlOiDmnInlirkgLyBmYWxzZTog54Sh5Yq5XG4gICAgICovXG4gICAgcHJpdmF0ZSB2YWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICgwIDw9IHRoaXMuX2luZGV4ICYmIHRoaXMuX2luZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmlxdWUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxUb2tlbixcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5LCBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuLyoqIEBpbnRlcm5hbCB3YWl0IGZvciBjaGFuZ2UgZGV0ZWN0aW9uICovXG5mdW5jdGlvbiBtYWtlUHJvbWlzZTxUPihlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPiwgcmVtYXA/OiBUW10pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGVkaXRvci5vZmYoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICAgICAgcmVtYXAubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICByZW1hcC5wdXNoKC4uLmVkaXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHJlY29yZHMpO1xuICAgICAgICB9O1xuICAgICAgICBlZGl0b3Iub24oY2FsbGJhY2spO1xuICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgdG8gW1tPYnNlcnZhYmxlQXJyYXldXSBpZiBuZWVkZWQuICovXG5hc3luYyBmdW5jdGlvbiBnZXRFZGl0Q29udGV4dDxUPihcbiAgICB0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSxcbiAgICB0b2tlbj86IENhbmNlbFRva2VuXG4pOiBQcm9taXNlPHsgZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD47IHByb21pc2U6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT47IH0+IHwgbmV2ZXIge1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yOiB0YXJnZXQsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZSh0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvciA9IE9ic2VydmFibGVBcnJheS5mcm9tKHRhcmdldCk7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcixcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKGVkaXRvciwgdGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsICd0YXJnZXQgaXMgbm90IEFycmF5IG9yIE9ic2VydmFibGVBcnJheS4nKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKDAsIHRhcmdldC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnB1c2goLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBhcnJheS5cbiAqIEBqYSDmjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZShpbmRleCwgMCwgLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIGFycmF5IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gb3JkZXJzIHx8IG9yZGVycy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOmZjemghuOCveODvOODiFxuICAgIG9yZGVycy5zb3J0KChsaHMsIHJocykgPT4ge1xuICAgICAgICByZXR1cm4gKGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgIGVkaXRvci5zcGxpY2Uob3JkZXIsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L2Jhbi10eXBlc1xuICwgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICwgIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXNcbiAqL1xuXG5pbXBvcnQgeyBLZXlzLCBjb21wdXRlRGF0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBGaWx0ZXJDYWxsYmFjaywgRHluYW1pY0NvbWJpbmF0aW9uIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZUFMTDxUPiA9IEV4dHJhY3Q8bnVtYmVyIHwgc3RyaW5nIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+ID0gRXh0cmFjdDxudW1iZXIgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZVN0cmluZzxUPiA9IEV4dHJhY3Q8c3RyaW5nLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIER5bmFtaWNPcGVyYXRvckRhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgdW5kZWZpbmVkO1xuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbDxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUFMTDxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gIT09IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuR1JFQVRFUiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyZWF0ZXI8VCBleHRlbmRzIHt9Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPiB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1MgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID49IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTU19FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3NFcXVhbDxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA8PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWtlPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IC0xICE9PSBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmRleE9mKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0xJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RMaWtlPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IC0xID09PSBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmRleE9mKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NFcXVhbDxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiBkYXRlIDw9IChpdGVtW3Byb3BdIGFzIGFueSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc05vdEVxdWFsPFQgZXh0ZW5kcyB7fT4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuICEoZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyBhbnkpKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuUkFOR0UgKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZTxUIGV4dGVuZHMge30+KHByb3A6IGtleW9mIFQsIG1pbjogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPiwgbWF4OiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiBjb21iaW5hdGlvbihEeW5hbWljQ29tYmluYXRpb24uQU5ELCBncmVhdGVyRXF1YWwocHJvcCwgbWluKSwgbGVzc0VxdWFsKHByb3AsIG1heCkpO1xufVxuXG4vKiogQGludGVybmFsIOODleOCo+ODq+OCv+OBruWQiOaIkCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQgZXh0ZW5kcyB7fT4odHlwZTogRHluYW1pY0NvbWJpbmF0aW9uLCBsaHM6IEZpbHRlckNhbGxiYWNrPFQ+LCByaHM6IEZpbHRlckNhbGxiYWNrPFQ+IHwgdW5kZWZpbmVkKTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAhcmhzID8gbGhzIDogKGl0ZW06IFQpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5BTkQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5PUjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pIHx8IHJocyhpdGVtKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIGNvbWJpbmF0aW9uOiAke3R5cGV9YCk7XG4gICAgICAgICAgICAgICAgLy8gZmFpbCBzYWZlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1vZHVsZS1ib3VuZGFyeS10eXBlc1xuICovXG5cbmltcG9ydCB7IEtleXMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgU29ydEtleSxcbiAgICBEeW5hbWljQ29uZGl0aW9uU2VlZCxcbiAgICBEeW5hbWljT3BlcmF0b3JDb250ZXh0LFxuICAgIER5bmFtaWNMaW1pdENvbmRpdGlvbixcbiAgICBEeW5hbWljT3BlcmF0b3IsXG4gICAgRHluYW1pY0NvbWJpbmF0aW9uLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVmFsdWVUeXBlQUxMLFxuICAgIFZhbHVlVHlwZUNvbXBhcmFibGUsXG4gICAgVmFsdWVUeXBlU3RyaW5nLFxuICAgIGVxdWFsLFxuICAgIG5vdEVxdWFsLFxuICAgIGdyZWF0ZXIsXG4gICAgbGVzcyxcbiAgICBncmVhdGVyRXF1YWwsXG4gICAgbGVzc0VxdWFsLFxuICAgIGxpa2UsXG4gICAgbm90TGlrZSxcbiAgICBkYXRlTGVzc0VxdWFsLFxuICAgIGRhdGVMZXNzTm90RXF1YWwsXG4gICAgcmFuZ2UsXG4gICAgY29tYmluYXRpb24sXG59IGZyb20gJy4vZHluYW1pYy1maWx0ZXJzJztcblxuLyoqXG4gKiBAZW4gRHluYW1pYyBxdWVyeSBjb25kaXRpb24gbWFuYWdlciBjbGFzcy5cbiAqIEBqYSDjg4DjgqTjg4rjg5/jg4Pjgq/jgq/jgqjjg6rnirbmhYvnrqHnkIbjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIER5bmFtaWNDb25kaXRpb248VEl0ZW0gZXh0ZW5kcyB7fSwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+IGltcGxlbWVudHMgRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+IHtcblxuICAgIHByaXZhdGUgX29wZXJhdG9yczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9jb21iaW5hdGlvbjogRHluYW1pY0NvbWJpbmF0aW9uO1xuICAgIHByaXZhdGUgX3N1bUtleXM6IEtleXM8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfbGltaXQ/OiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+O1xuICAgIHByaXZhdGUgX3JhbmRvbTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9zb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgW1tEeW5hbWljQ29uZGl0aW9uU2VlZF1dIGluc3RhbmNlXG4gICAgICogIC0gYGphYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM6IER5bmFtaWNDb25kaXRpb25TZWVkPFRJdGVtLCBUS2V5PiA9IHsgb3BlcmF0b3JzOiBbXSB9KSB7XG4gICAgICAgIGNvbnN0IHsgb3BlcmF0b3JzLCBjb21iaW5hdGlvbiwgc3VtS2V5cywgbGltaXQsIHJhbmRvbSwgc29ydEtleXMgfSA9IHNlZWRzO1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgICAgID0gb3BlcmF0b3JzO1xuICAgICAgICB0aGlzLl9jb21iaW5hdGlvbiAgID0gbnVsbCAhPSBjb21iaW5hdGlvbiA/IGNvbWJpbmF0aW9uIDogRHluYW1pY0NvbWJpbmF0aW9uLkFORDtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyAgICAgICA9IG51bGwgIT0gc3VtS2V5cyA/IHN1bUtleXMgOiBbXTtcbiAgICAgICAgdGhpcy5fbGltaXQgICAgICAgICA9IGxpbWl0O1xuICAgICAgICB0aGlzLl9yYW5kb20gICAgICAgID0gISFyYW5kb207XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzICAgICAgPSBzb3J0S2V5cyB8fCBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZFxuXG4gICAgZ2V0IG9wZXJhdG9ycygpOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG5cbiAgICBzZXQgb3BlcmF0b3JzKHZhbHVlczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSkge1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IHN1bUtleXMoKTogKEtleXM8VEl0ZW0+KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1bUtleXM7XG4gICAgfVxuXG4gICAgc2V0IHN1bUtleXModmFsdWVzOiAoS2V5czxUSXRlbT4pW10pIHtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgY29tYmluYXRpb24oKTogRHluYW1pY0NvbWJpbmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbWJpbmF0aW9uO1xuICAgIH1cblxuICAgIHNldCBjb21iaW5hdGlvbih2YWx1ZTogRHluYW1pY0NvbWJpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGxpbWl0KCk6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGltaXQ7XG4gICAgfVxuXG4gICAgc2V0IGxpbWl0KHZhbHVlOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2xpbWl0ID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHJhbmRvbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbTtcbiAgICB9XG5cbiAgICBzZXQgcmFuZG9tKHZhbHVlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3JhbmRvbSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBzb3J0S2V5cygpOiBTb3J0S2V5PFRLZXk+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc29ydEtleXM7XG4gICAgfVxuXG4gICAgc2V0IHNvcnRLZXlzKHZhbHVlczogU29ydEtleTxUS2V5PltdKSB7XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzID0gdmFsdWVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBhY2Nlc3NvcjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29tcGFyYXRvciBmdW5jdGlvbnMuXG4gICAgICogQGphIOavlOi8g+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBjb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gY29udmVydFNvcnRLZXlzKHRoaXMuX3NvcnRLZXlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHN5bnRoZXNpcyBmaWx0ZXIgZnVuY3Rpb24uXG4gICAgICogQGphIOWQiOaIkOa4iOOBv+ODleOCo+ODq+OCv+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBmaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHtcbiAgICAgICAgbGV0IGZsdHI6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbmQgb2YgdGhpcy5fb3BlcmF0b3JzKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGNvbmQub3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTk9UX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdEVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXI8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3M8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXJFcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzc0VxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWtlPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RMaWtlPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NFcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NOb3RFcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLlJBTkdFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4sIGNvbmQucmFuZ2UgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdG9yOiAke2NvbmQub3BlcmF0b3J9YCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZsdHIgfHwgKCgvKiBpdGVtICovKSA9PiB0cnVlKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9iYW4tdHlwZXNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAqL1xuXG5pbXBvcnQge1xuICAgIEtleXMsXG4gICAgaXNGdW5jdGlvbixcbiAgICBzb3J0LFxuICAgIHNodWZmbGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBTb3J0S2V5LFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25GZXRjaFJlc3VsdCxcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25JdGVtUHJvdmlkZXIsXG4gICAgRHluYW1pY0xpbWl0LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4uL3V0aWxzL2NvbXBhcmF0b3InO1xuaW1wb3J0IHsgRHluYW1pY0NvbmRpdGlvbiB9IGZyb20gJy4vZHluYW1pYy1jb25kaXRpb24nO1xuXG5jb25zdCB7IHRydW5jIH0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIOS9v+eUqOOBmeOCi+ODl+ODreODkeODhuOCo+OBjOS/neiovOOBleOCjOOBnyBDb2xsZWN0aW9uUXVlcnlPcHRpb25zICovXG5pbnRlcmZhY2UgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyB7fSwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PiBleHRlbmRzIENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBzb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuICAgIGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W107XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBBcHBseSBgZmlsdGVyYCBhbmQgYHNvcnQga2V5YCB0byB0aGUgYGl0ZW1zYCBmcm9tIFtbcXVlcnlJdGVtc11dYCgpYCByZXN1bHQuXG4gKiBAamEgW1txdWVyeUl0ZW1zXV1gKClgIOOBl+OBnyBgaXRlbXNgIOOBq+WvvuOBl+OBpiBgZmlsdGVyYCDjgaggYHNvcnQga2V5YCDjgpLpgannlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEl0ZW1zPFRJdGVtPihpdGVtczogVEl0ZW1bXSwgZmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgbnVsbCwgLi4uY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSk6IFRJdGVtW10ge1xuICAgIGxldCByZXN1bHQgPSBpc0Z1bmN0aW9uKGZpbHRlcikgPyBpdGVtcy5maWx0ZXIoZmlsdGVyKSA6IGl0ZW1zLnNsaWNlKCk7XG4gICAgZm9yIChjb25zdCBjb21wYXJhdG9yIG9mIGNvbXBhcmF0b3JzKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBhcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzb3J0KHJlc3VsdCwgY29tcGFyYXRvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwg44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL5a++6LGh44Gr5a++44GX44GmIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIHF1ZXJ5IOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tQ2FjaGU8VEl0ZW0gZXh0ZW5kcyB7fSwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBjYWNoZWQ6IFRJdGVtW10sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25GZXRjaFJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGZpbHRlcixcbiAgICAgICAgY29tcGFyYXRvcnMsXG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICAgICAgbm9TZWFyY2gsXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICAvLyDjgq3jg6Pjg4Pjgrfjg6Xjgavlr77jgZfjgabjg5XjgqPjg6vjgr/jg6rjg7PjgrAsIOOCveODvOODiOOCkuWun+ihjFxuICAgIGNvbnN0IHRhcmdldHMgPSBub1NlYXJjaCA/IGNhY2hlZC5zbGljZSgpIDogc2VhcmNoSXRlbXMoY2FjaGVkLCBmaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgIGxldCBpbmRleDogbnVtYmVyID0gKG51bGwgIT0gYmFzZUluZGV4KSA/IGJhc2VJbmRleCA6IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHsgb3B0aW9ucy5saW1pdCB9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0YXJnZXRzLnNsaWNlKGluZGV4LCAobnVsbCAhPSBsaW1pdCkgPyBpbmRleCArIGxpbWl0IDogdW5kZWZpbmVkKTtcblxuICAgICAgICBjb25zdCByZXR2YWwgPSB7XG4gICAgICAgICAgICB0b3RhbDogdGFyZ2V0cy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtczogcmVzdWx0LFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi5vcHRzIH0gYXMgQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbT4sXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkZldGNoUmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgcmV0dmFsLml0ZW1zID0gdGFyZ2V0cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gcmVzdWx0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGBwcm92aWRlcmAg6Zai5pWw44KS5L2/55So44GX44GmIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIGBxdWVyeWAg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21Qcm92aWRlcjxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCB0YXJnZXRzOiBUSXRlbVtdID0gW107XG5cbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7b3B0aW9ucy5saW1pdH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyKG9wdHMpO1xuXG4gICAgICAgIHRhcmdldHMucHVzaCguLi5yZXN1bHQuaXRlbXMpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiByZXN1bHQudG90YWwsXG4gICAgICAgICAgICBpdGVtczogcmVzdWx0Lml0ZW1zLFxuICAgICAgICAgICAgb3B0aW9uczogT2JqZWN0LmFzc2lnbih7fSwgb3B0cywgcmVzdWx0Lm9wdGlvbnMpIGFzIENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0+LFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25GZXRjaFJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0byAmJiBudWxsICE9IGxpbWl0KSB7XG4gICAgICAgICAgICBpZiAocmVzdWx0LnRvdGFsIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSB0YXJnZXRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSByZXN1bHQuaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNvbmRpdGluYWxGaXgg44Gr5L2/55So44GZ44KLIENyaXRlcmlhIE1hcCAqL1xuY29uc3QgX2xpbWl0Q3JpdGVyaWEgPSB7XG4gICAgW0R5bmFtaWNMaW1pdC5DT1VOVF06IG51bGwsXG4gICAgW0R5bmFtaWNMaW1pdC5TVU1dOiAgICAgeyBjb2VmZjogMSB9LFxuICAgIFtEeW5hbWljTGltaXQuU0VDT05EXTogIHsgY29lZmY6IDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1JTlVURV06ICB7IGNvZWZmOiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkhPVVJdOiAgICB7IGNvZWZmOiA2MCAqIDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuREFZXTogICAgIHsgY29lZmY6IDI0ICogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LktCXTogICAgICB7IGNvZWZmOiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5NQl06ICAgICAgeyBjb2VmZjogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LkdCXTogICAgICB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LlRCXTogICAgICB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG59O1xuXG4vKipcbiAqIEBlbiBGaXggdGhlIHRhcmdldCBpdGVtcyBieSBbW0R5bmFtaWNDb25kaXRpb25dXS5cbiAqIEBqYSBbW0R5bmFtaWNDb25kaXRpb25dXSDjgavlvpPjgYTlr77osaHjgpLmlbTlvaJcbiAqXG4gKiBAcGFyYW0gaXRlbXNcbiAqICAtIGBlbmAgdGFyZ2V0IGl0ZW1zIChkZXN0cnVjdGl2ZSlcbiAqICAtIGBqYWAg5a++6LGh44Gu44Ki44Kk44OG44OgICjnoLTlo4rnmoQpXG4gKiBAcGFyYW0gY29uZGl0aW9uXG4gKiAgLSBgZW5gIGNvbmRpdGlvbiBvYmplY3RcbiAqICAtIGBqYWAg5p2h5Lu244Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25kaXRpb25hbEZpeDxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4oXG4gICAgaXRlbXM6IFRJdGVtW10sXG4gICAgY29uZGl0aW9uOiBEeW5hbWljQ29uZGl0aW9uPFRJdGVtLCBUS2V5PlxuKTogQ29sbGVjdGlvbkZldGNoUmVzdWx0PFRJdGVtPiB7XG4gICAgY29uc3QgeyByYW5kb20sIGxpbWl0LCBzdW1LZXlzIH0gPSBjb25kaXRpb247XG5cbiAgICBpZiAocmFuZG9tKSB7XG4gICAgICAgIHNodWZmbGUoaXRlbXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChsaW1pdCkge1xuICAgICAgICBjb25zdCB7IHVuaXQsIHZhbHVlLCBwcm9wIH0gPSBsaW1pdDtcbiAgICAgICAgY29uc3QgcmVzZXQ6IFRJdGVtW10gPSBbXTtcbiAgICAgICAgY29uc3QgY3JpdGVyaWEgPSBfbGltaXRDcml0ZXJpYVt1bml0XTtcbiAgICAgICAgY29uc3QgbGltaXRDb3VudCA9IHZhbHVlO1xuICAgICAgICBjb25zdCBleGNlc3MgPSAhIWxpbWl0LmV4Y2VzcztcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoIWNyaXRlcmlhKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSB7XG4gICAgICAgICAgICAgICAgY291bnQgKz0gKE51bWJlcihpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSAvIGNyaXRlcmlhLmNvZWZmKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgYWNjZXNzIHByb3BlcnR5OiAke3Byb3B9YCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsaW1pdENvdW50IDwgY291bnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXhjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGl0ZW1zID0gcmVzZXQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICBpdGVtcyxcbiAgICB9IGFzIENvbGxlY3Rpb25GZXRjaFJlc3VsdDxUSXRlbSwgS2V5czxUSXRlbT4+O1xuXG4gICAgaWYgKDAgPCBzdW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHN1bUtleXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgaW4gcmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSArPSBOdW1iZXIoaXRlbVtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+WkieaPmyAqL1xuZnVuY3Rpb24gZW5zdXJlT3B0aW9uczxUSXRlbSBleHRlbmRzIHt9LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHwgdW5kZWZpbmVkXG4pOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgc29ydEtleXM6IFtdIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgbm9TZWFyY2gsIHNvcnRLZXlzIH0gPSBvcHRzO1xuXG4gICAgaWYgKCFub1NlYXJjaCAmJiAoIW9wdHMuY29tcGFyYXRvcnMgfHwgb3B0cy5jb21wYXJhdG9ycy5sZW5ndGggPD0gMCkpIHtcbiAgICAgICAgb3B0cy5jb21wYXJhdG9ycyA9IGNvbnZlcnRTb3J0S2V5cyhzb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHMgYXMgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+O1xufVxuXG4vKiogQGludGVybmFsIOOCreODo+ODg+OCt+ODpeWPr+iDveOBi+WIpOWumiAqL1xuZnVuY3Rpb24gY2FuQ2FjaGU8VEl0ZW0gZXh0ZW5kcyB7fT4ocmVzdWx0OiBDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+LCBvcHRpb25zOiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtPik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHsgbm9DYWNoZSwgbm9TZWFyY2ggfSA9IG9wdGlvbnM7XG4gICAgcmV0dXJuICFub0NhY2hlICYmICFub1NlYXJjaCAmJiByZXN1bHQudG90YWwgPT09IHJlc3VsdC5pdGVtcy5sZW5ndGg7XG59XG5cbi8qKlxuICogQGVuIExvdyBsZXZlbCBmdW5jdGlvbiBmb3IgW1tDb2xsZWN0aW9uXV0gcXVlcnkgaXRlbXMuXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0gSXRlbSDjgpLjgq/jgqjjg6rjgZnjgovkvY7jg6zjg5njg6vplqLmlbBcbiAqXG4gKiBAcGFyYW0gcXVlcnlJbmZvXG4gKiAgLSBgZW5gIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOOCr+OCqOODquaDheWgsVxuICogQHBhcmFtIHByb3ZpZGVyXG4gKiAgLSBgZW5gIHByb3ZpZGVyIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOODl+ODreODkOOCpOODgOmWouaVsFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5SXRlbXM8VEl0ZW0gZXh0ZW5kcyB7fSwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zPzogQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8VEl0ZW1bXT4ge1xuICAgIGNvbnN0IG9wdHMgPSBlbnN1cmVPcHRpb25zKG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IG9wdHM7XG5cbiAgICAvLyBxdWVyeSDjgavkvb/nlKjjgZfjgZ8gc29ydCwgZmlsdGVyIOaDheWgseOCkuOCreODo+ODg+OCt+ODpVxuICAgIHF1ZXJ5SW5mby5zb3J0S2V5cyAgICA9IHNvcnRLZXlzO1xuICAgIHF1ZXJ5SW5mby5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzO1xuICAgIHF1ZXJ5SW5mby5maWx0ZXIgICAgICA9IGZpbHRlcjtcblxuICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgcmV0dXJuIChhd2FpdCBxdWVyeUZyb21DYWNoZShxdWVyeUluZm8uY2FjaGUuaXRlbXMsIG9wdHMpKS5pdGVtcztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcXVlcnlGcm9tUHJvdmlkZXIocHJvdmlkZXIsIG9wdHMpO1xuICAgICAgICBjb25zdCBuZXh0T3B0cyA9IHJlc3VsdC5vcHRpb25zIGFzIENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0+O1xuICAgICAgICBpZiAoY2FuQ2FjaGUocmVzdWx0LCBuZXh0T3B0cykpIHtcbiAgICAgICAgICAgIHF1ZXJ5SW5mby5jYWNoZSA9IHsgLi4ucmVzdWx0IH07XG4gICAgICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IG5vU2VhcmNoLCBjb25kaXRpb246IHNlZWQgfSA9IG5leHRPcHRzO1xuICAgICAgICBpZiAoc2VlZCkge1xuICAgICAgICAgICAgY29uc3QgY29uZGl0aW9uID0gbmV3IER5bmFtaWNDb25kaXRpb24oc2VlZCk7XG4gICAgICAgICAgICByZXN1bHQgPSBjb25kaXRpb25hbEZpeChzZWFyY2hJdGVtcyhcbiAgICAgICAgICAgICAgICByZXN1bHQuaXRlbXMsXG4gICAgICAgICAgICAgICAgY29uZGl0aW9uLmZpbHRlcixcbiAgICAgICAgICAgICAgICAuLi5jb25kaXRpb24uY29tcGFyYXRvcnNcbiAgICAgICAgICAgICksIGNvbmRpdGlvbik7XG5cbiAgICAgICAgICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mby5jYWNoZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9TZWFyY2ggPyByZXN1bHQuaXRlbXMgOiBzZWFyY2hJdGVtcyhyZXN1bHQuaXRlbXMsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJnZXRMYW5ndWFnZSIsIk9ic2VydmFibGVBcnJheSIsImNjIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwidW5pcXVlIiwiY29tcHV0ZURhdGUiLCJpc0Z1bmN0aW9uIiwic29ydCIsInJlc3VsdCIsInNodWZmbGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7O0lBTUEsZ0RBY0M7SUFkRDs7Ozs7UUFVSTtRQUFBO1lBQ0ksc0ZBQTRDLENBQUE7WUFDNUMsc0RBQTJCLFlBQUEsa0JBQWtCLGdCQUF1QixzQkFBNkIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLDhCQUFBLENBQUE7U0FDekgsSUFBQTtJQUNMLENBQUM7O0lDUEQ7SUFDQSxJQUFJLFNBQVMsR0FBcUI7UUFDOUIsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUNBLGdCQUFXLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDcEYsQ0FBQyxDQUFDO0lBRUY7Ozs7Ozs7Ozs7YUFVZ0IsdUJBQXVCLENBQUMsV0FBOEI7UUFDbEUsSUFBSSxJQUFJLElBQUksV0FBVyxFQUFFO1lBQ3JCLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO2FBQU07WUFDSCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUM7WUFDOUIsU0FBUyxHQUFHLFdBQVcsQ0FBQztZQUN4QixPQUFPLFdBQVcsQ0FBQztTQUN0QjtJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7YUFXZ0IsbUJBQW1CLENBQStCLElBQU8sRUFBRSxLQUFnQjtRQUN2RixPQUFPLENBQUMsR0FBTSxFQUFFLEdBQU07O1lBRWxCLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFjLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBYyxD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LE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3pFLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7SUFjTyxlQUFlLFVBQVUsQ0FDNUIsU0FBMkMsRUFDM0MsUUFBNkMsRUFDN0MsT0FBNkM7UUFFN0MsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQzs7UUFHL0MsU0FBUyxDQUFDLFFBQVEsR0FBTSxRQUFRLENBQUM7UUFDakMsU0FBUyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDcEMsU0FBUyxDQUFDLE1BQU0sR0FBUSxNQUFNLENBQUM7UUFFL0IsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFO1lBQ2pCLE9BQU8sQ0FBQyxNQUFNLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUM7U0FDcEU7YUFBTTtZQUNILElBQUksTUFBTSxHQUFHLE1BQU0saUJBQWlCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUF3QyxDQUFDO1lBQ2pFLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsRUFBRTtnQkFDNUIsU0FBUyxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7YUFDbEM7WUFFRCxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUM7WUFDL0MsSUFBSSxJQUFJLEVBQUU7Z0JBQ04sTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQy9CLE1BQU0sQ0FBQyxLQUFLLEVBQ1osU0FBUyxDQUFDLE1BQU0sRUFDaEIsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUMzQixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVkLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRTtvQkFDakIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUN2QyxPQUFPLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO2lCQUNsQzthQUNKO1lBRUQsT0FBTyxRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQztTQUN0RjtJQUNMOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvY29sbGVjdGlvbi8ifQ==
