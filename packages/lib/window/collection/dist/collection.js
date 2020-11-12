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
                        console.warn(`unknown operator: ${cond.operator}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
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
    /** @internal すでにキャッシュされている対象に対して CollectionItemQueryOptions に指定された振る舞いを行う内部 query 関数 */
    async function queryFromCache(cached, options) {
        const { filter, comparators, index: baseIndex, limit, cancel: token, progress, auto, noSearch, } = options;
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
    /** @internal `provider` 関数を使用して CollectionItemQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
    async function queryFromProvider(provider, options) {
        const { index: baseIndex, limit, cancel: token, progress, auto, } = options;
        const results = [];
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
            const resp = await provider(opts);
            results.push(...resp.items);
            const retval = {
                total: resp.total,
                items: resp.items,
                options: Object.assign({}, opts, resp.options),
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

    const _properties = Symbol('properties');
    const _createIterableIterator = Symbol('create-iterable-iterator');
    const _prepareModel = Symbol('prepare-model');
    const _removeModels = Symbol('remove-models');
    const _addReference = Symbol('add-reference');
    const _removeReference = Symbol('remove-reference');
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
    const _setOptions = { add: true, remove: true, merge: true };
    const _addOptions = { add: true, remove: false };
    //__________________________________________________________________________________________________//
    /**
     * @en Base class definition for object collection.
     * @ja オブジェクトの集合を扱う基底クラス定義
     *
     * TODO:
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
                }
                // delegate event
                this.trigger.call(this, event, model, collection, options); // eslint-disable-line no-useless-call
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
            return this[_properties].store.length;
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
        /**
         * @en Apply after-filter to collection itself.
         * @ja 絞り込み用フィルタの適用
         *
         * @param options
         *  - `en` after-filter options.
         *  - `ja` 絞り込みオプション
         */
        filter(options) {
            const opts = options || {};
            const { filter, silent } = opts;
            if (filter !== this[_properties].afterFilter) {
                this[_properties].afterFilter = filter;
                if (!silent) {
                    this.trigger('@filter', this, opts);
                }
            }
            return this;
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
                this.trigger('@error', this, e, opts);
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
        /** @ineternal Internal method called by both remove and set. */
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
                base: this[_properties].store,
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
                base: this[_properties].store,
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
    /*
     ☆ id
     ☆ models/items
     ☆ length
     ☆ release()
     ☆ fetch()
     ☆ requery()

     ★ - ListEditable<T> をどうするか?

     ★ url: string | (() => string);

     ★ without(...values: TModel[]): TModel[];

     ☆ add(model: {}|TModel, options?: AddOptions): TModel;
     ☆ add(models: ({}|TModel)[], options?: AddOptions): TModel[];
     ★ at(index: number): TModel;
     ☆ get(id: number | string | Model): TModel;
     ★ has(key: number | string | Model): boolean;
     ☆ clone(): this;
     ★ create(attributes: any, options ?: ModelSaveOptions): TModel;
     ★ pluck(attribute: string): any[];
     ★ push(model: TModel, options ?: AddOptions): TModel;
     ★ pop(options ?: Silenceable): TModel;
     ☆ remove(model: {} | TModel, options ?: Silenceable): TModel;
     ☆ remove(models: ({} | TModel)[], options ?: Silenceable): TModel[];
     ☆ reset(models ?: TModel[], options ?: Silenceable): TModel[];
     ☆ set(models ?: TModel[], options ?: CollectionSetOptions): TModel[];
     ★ shift(options ?: Silenceable): TModel;
     ☆ sort(options ?: Silenceable): Collection<TModel>;
     ★ unshift(model: TModel, options ?: AddOptions): TModel;
     ★ where(properties: any): TModel[];
     ★ findWhere(properties: any): TModel;
     ★ modelId(attrs: any) : any
     ★ slice(min?: number, max?: number): TModel[];

     // mixins from underscore (基本やらない includes だけやる. + filter を afterFilter で実現する)

     ★ all(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
     ★ any(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
     ★ chain(): any;
     ★ collect<TResult>(iterator: _.ListIterator<TModel, TResult>, context?: any): TResult[];
     ★ contains(value: TModel): boolean;
     ★ countBy(iterator?: _.ListIterator<TModel, any>): _.Dictionary<number>;
     ★ countBy(iterator: string): _.Dictionary<number>;
     ★ detect(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel;
     ★ difference(others: TModel[]): TModel[];
     ★ drop(n?: number): TModel[];
     ★ each(iterator: _.ListIterator<TModel, void>, context?: any): TModel[];
     ★ every(iterator: _.ListIterator<TModel, boolean>, context?: any): boolean;
     ☆ filter(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
     ★ find(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel;
     ★ findIndex(predicate: _.ListIterator<TModel, boolean>, context?: any): number;
     ★ findLastIndex(predicate: _.ListIterator<TModel, boolean>, context?: any): number;
     ★ first(): TModel;
     ★ first(n: number): TModel[];
     ★ foldl<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
     ★ foldr<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
     ★ forEach(iterator: _.ListIterator<TModel, void>, context?: any): TModel[];
     ★ groupBy(iterator: _.ListIterator<TModel, any>, context?: any): _.Dictionary<TModel[]>;
     ★ groupBy(iterator: string, context?: any): _.Dictionary<TModel[]>;
     ★ head(): TModel;
     ★ head(n: number): TModel[];
     ★ include(value: TModel): boolean;
     ★ includes(value: TModel): boolean;
     ★ indexBy(iterator: _.ListIterator<TModel, any>, context?: any): _.Dictionary<TModel>;
     ★ indexBy(iterator: string, context?: any): _.Dictionary<TModel>;
     ★ indexOf(value: TModel, isSorted?: boolean): number;
     ★ initial(): TModel;
     ★ initial(n: number): TModel[];
     ★ inject<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
     ★ invoke(methodName: string, ...args: any[]): any;
     ★ isEmpty(): boolean;
     ★ last(): TModel;
     ★ last(n: number): TModel[];
     ★ lastIndexOf(value: TModel, from?: number): number;
     ★ map<TResult>(iterator: _.ListIterator<TModel, TResult>, context?: any): TResult[];
     ★ max(iterator?: _.ListIterator<TModel, any>, context?: any): TModel;
     ★ min(iterator?: _.ListIterator<TModel, any>, context?: any): TModel;
     ★ partition(iterator: _.ListIterator<TModel, boolean>): TModel[][];
     ★ reduce<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
     ★ reduceRight<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
     ★ reject(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
     ★ rest(n?: number): TModel[];
     ★ sample(): TModel;
     ★ sample(n: number): TModel[];
     ★ select(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
     ★ shuffle(): TModel[];
     ★ size(): number;
     ★ some(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
     ★ sortBy<TSort>(iterator?: _.ListIterator<TModel, TSort>, context?: any): TModel[];
     ★ sortBy(iterator: string, context?: any): TModel[];
     ★ tail(n?: number): TModel[];
     ★ take(): TModel;
     ★ take(n: number): TModel[];
     ★ toArray(): TModel[];

    ★ model の所属に collection の id を書き込むかも
       その場合 _prepareModel, _removeReference にも対応が必要

    - Event:
        '@add': [TItem, Collection < TItem >, CollectionSetOptions];
        '@remove': [TItem, Collection < TItem >, CollectionSetOptions];
        '@update': [Collection < TItem >, CollectionUpdateOptions];
        '@reset': [Collection < TItem >, CollectionAddOptions];
        '@sort': [Collection < TItem >, CollectionSetOptions];
        '@sync': [Collection < TItem >, PlainObject, CollectionDataSyncOptions];
        '@destroy': [TItem, Collection < TItem >, ModelDestroyOptions];
        '@error': [Collection < TItem >, Error, CollectionDataSyncOptions];
     */

    exports.ArrayCursor = ArrayCursor;
    exports.Collection = Collection;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiLCJxdWVyeS9keW5hbWljLWZpbHRlcnMudHMiLCJxdWVyeS9keW5hbWljLWNvbmRpdGlvbi50cyIsInF1ZXJ5L3F1ZXJ5LnRzIiwiYmFzZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIENPTExFQ1RJT04gPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19DT0xMRUNUSU9OX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUyAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDEsICdpbnZhbGlkIGFjY2Vzcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMiwgJ2ludmFsaWQgY29tcGFyYXRvcnMuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgZ2V0TGFuZ3VhZ2UgfSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHtcbiAgICBTb3J0T3JkZXIsXG4gICAgU29ydENhbGxiYWNrLFxuICAgIFNvcnRLZXksXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBgSW50bC5Db2xsYXRvcmAgZmFjdG9yeSBmdW5jdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEgYEludGwuQ29sbGF0b3JgIOOCkui/lOWNtOOBmeOCi+mWouaVsOWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBDb2xsYXRvclByb3ZpZGVyID0gKCkgPT4gSW50bC5Db2xsYXRvcjtcblxuLyoqIEBpbnRlcm5hbCBkZWZhdWx0IEludGwuQ29sbGF0b3IgcHJvdmlkZXIgKi9cbmxldCBfY29sbGF0b3I6IENvbGxhdG9yUHJvdmlkZXIgPSAoKTogSW50bC5Db2xsYXRvciA9PiB7XG4gICAgcmV0dXJuIG5ldyBJbnRsLkNvbGxhdG9yKGdldExhbmd1YWdlKCksIHsgc2Vuc2l0aXZpdHk6ICdiYXNlJywgbnVtZXJpYzogdHJ1ZSB9KTtcbn07XG5cbi8qKlxuICogQGphIOaXouWumuOBriBJbnRsLkNvbGxhdG9yIOOCkuioreWumlxuICpcbiAqIEBwYXJhbSBuZXdQcm92aWRlclxuICogIC0gYGVuYCBuZXcgW1tDb2xsYXRvclByb3ZpZGVyXV0gb2JqZWN0LiBpZiBgdW5kZWZpbmVkYCBwYXNzZWQsIG9ubHkgcmV0dXJucyB0aGUgY3VycmVudCBvYmplY3QuXG4gKiAgLSBgamFgIOaWsOOBl+OBhCBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC5cbiAqICAtIGBqYWAg6Kit5a6a44GV44KM44Gm44GE44GfIFtbQ29sbGF0b3JQcm92aWRlcl1dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdENvbGxhdG9yUHJvdmlkZXIobmV3UHJvdmlkZXI/OiBDb2xsYXRvclByb3ZpZGVyKTogQ29sbGF0b3JQcm92aWRlciB7XG4gICAgaWYgKG51bGwgPT0gbmV3UHJvdmlkZXIpIHtcbiAgICAgICAgcmV0dXJuIF9jb2xsYXRvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBvbGRQcm92aWRlciA9IF9jb2xsYXRvcjtcbiAgICAgICAgX2NvbGxhdG9yID0gbmV3UHJvdmlkZXI7XG4gICAgICAgIHJldHVybiBvbGRQcm92aWRlcjtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIEdldCBzdHJpbmcgY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDmloflrZfliJfmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCBwcm9wZXJ0eSBuYW1lXG4gKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICogQHBhcmFtIG9yZGVyXG4gKiAgLSBgZW5gIHNvcnQgb3JkZXIgY29kZVxuICogIC0gYGphYCDjgr3jg7zjg4jpoIbjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIC8vIHVuZGVmaW5lZCDjga8gJycg44Go5ZCM562J44Gr5omx44GGXG4gICAgICAgIGNvbnN0IGxoc1Byb3AgPSAobnVsbCAhPSBsaHNbcHJvcCBhcyBzdHJpbmddKSA/IGxoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgY29uc3QgcmhzUHJvcCA9IChudWxsICE9IHJoc1twcm9wIGFzIHN0cmluZ10pID8gcmhzW3Byb3AgYXMgc3RyaW5nXSA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wIGFzIHN0cmluZ107XG4gICAgICAgIGNvbnN0IHJoc0RhdGUgPSByaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBpZiAobGhzRGF0ZSA9PT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gKHVuZGVmaW5lZCA9PT0gdW5kZWZpbmVkKSBvciDoh6rlt7Hlj4LnhadcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNEYXRlKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbGhzVmFsdWUgPSBPYmplY3QobGhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgY29uc3QgcmhzVmFsdWUgPSBPYmplY3QocmhzRGF0ZSkudmFsdWVPZigpO1xuICAgICAgICAgICAgaWYgKGxoc1ZhbHVlID09PSByaHNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGxoc1ZhbHVlIDwgcmhzVmFsdWUgPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBnZW5lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24gYnkgY29tcGFyYXRpdmUgb3BlcmF0b3IuXG4gKiBAamEg5q+U6LyD5ryU566X5a2Q44KS55So44GE44Gf5rGO55So5q+U6LyD6Zai5pWw44Gu5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGxoc1twcm9wIGFzIHN0cmluZ10gPT09IHJoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIC0xICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcCBhcyBzdHJpbmddIDwgcmhzW3Byb3AgYXMgc3RyaW5nXSA/IC0xICogb3JkZXIgOiAxICogb3JkZXIpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGJvb2xlYW4gY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDnnJ/lgb3lgKTmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGNvbnN0IGdldEJvb2xlYW5Db21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIEdldCBudW1lcmljIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pWw5YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXROdW1iZXJDb21wYXJhdG9yID0gZ2V0R2VuZXJpY0NvbXBhcmF0b3I7XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBmcm9tIFtbU29ydEtleV1dLlxuICogQGphIFtbU29ydEtleV1dIOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHByb3BOYW1lID0gc29ydEtleS5uYW1lO1xuICAgIHN3aXRjaCAoc29ydEtleS50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4ocHJvcE5hbWUsIHNvcnRLZXkub3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIFtbU29ydEtleV1dIGFycmF5LlxuICogQGphIFtbU29ydEtleV1dIOmFjeWIl+OCkiBjb21wYXJhdG9yIOmFjeWIl+OBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNvcnRLZXlzPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXlzOiBTb3J0S2V5PEs+W10pOiBTb3J0Q2FsbGJhY2s8VD5bXSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUPltdID0gW107XG4gICAgZm9yIChjb25zdCBzb3J0S2V5IG9mIHNvcnRLZXlzKSB7XG4gICAgICAgIGNvbXBhcmF0b3JzLnB1c2godG9Db21wYXJhdG9yKHNvcnRLZXkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBhcmF0b3JzO1xufVxuIiwiLyoqXG4gKiBAZW4gQ3Vyc29yIHBvc2l0aW9uIGNvbnN0YW50LlxuICogQGphIOOCq+ODvOOCveODq+S9jee9ruWumuaVsFxuICovXG5leHBvcnQgY29uc3QgZW51bSBDdXJzb3JQb3Mge1xuICAgIE9VVF9PRl9SQU5HRSAgICA9IC0xLFxuICAgIENVUlJFTlQgICAgICAgICA9IC0yLFxufVxuXG4vKipcbiAqIEBlbiBTZWVrIGV4cHJlc3Npb24gZnVuY3Rpb24gdHlwZS5cbiAqIEBqYSDjgrfjg7zjgq/lvI/plqLmlbDlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgU2Vla0V4cDxUPiA9ICh2YWx1ZTogVCwgaW5kZXg/OiBudW1iZXIsIG9iaj86IFRbXSkgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBAZW4gVGhlIGNsYXNzIHByb3ZpZGVzIGN1cnNvciBpbnRlcmZhY2UgZm9yIEFycmF5LiA8YnI+XG4gKiAgICAgSXQgaXMgZGlmZmVyZW50IGZyb20gSXRlcmF0b3IgaW50ZXJmYWNlIG9mIGVzMjAxNSwgYW5kIHRoYXQgcHJvdmlkZXMgaW50ZXJmYWNlIHdoaWNoIGlzIHNpbWlsYXIgdG8gREIgcmVjb3Jkc2V0J3Mgb25lLlxuICogQGphIEFycmF5IOeUqOOCq+ODvOOCveODqyBJL0Yg44KS5o+Q5L6b44GZ44KL44Kv44Op44K5IDxicj5cbiAqICAgICBlczIwMTUg44GuIEl0ZXJhdG9yIEkvRiDjgajjga/nlbDjgarjgorjgIFEQiByZWNvcmRzZXQg44Kq44OW44K444Kn44Kv44OI44Op44Kk44Kv44Gq6LWw5p+7IEkvRiDjgpLmj5DkvpvjgZnjgotcbiAqL1xuZXhwb3J0IGNsYXNzIEFycmF5Q3Vyc29yPFQgPSBhbnk+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgLyoqIEBpbnRlcm5hbCDlr77osaHjga7phY3liJcgICovXG4gICAgcHJpdmF0ZSBfYXJyYXk6IFRbXTtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruWFiOmgreOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICAqL1xuICAgIHByaXZhdGUgX2JvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOimgee0oOWkluOBruacq+WwvuOCkuekuuOBl+OBpuOBhOOCi+OBqOOBjeOBqyB0cnVlICovXG4gICAgcHJpdmF0ZSBfZW9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg54++5Zyo44GuIGluZGV4ICovXG4gICAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlcjtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogMFxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiAwXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoYXJyYXk6IFRbXSwgaW5pdGlhbEluZGV4ID0gMCkge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVzZXQgdGFyZ2V0IGFycmF5LlxuICAgICAqIEBqYSDlr77osaHjga7lho3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5LiBkZWZhdWx0OiBlbXB0eSBhcnJheS5cbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+Wumi4gICBkZWZhdWx0OiDnqbrphY3liJdcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoYXJyYXk6IFRbXSA9IFtdLCBpbml0aWFsSW5kZXg6IG51bWJlciA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0UpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGN1cnJlbnQgZWxlbWVudC5cbiAgICAgKiBAamEg54++5Zyo44Gu6KaB57Sg44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGN1cnJlbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheVt0aGlzLl9pbmRleF07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjmjIfjgZfnpLrjgZfjgabjgYTjgosgaW5kZXgg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRhcmdldCBhcnJheSBsZW5ndGguXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBruimgee0oOaVsOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgQk9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5YWI6aCt44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzQk9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYm9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBFT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7mnKvlsL7jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNFT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lb2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByYXcgYXJyYXkgaW5zdGFuY2UuXG4gICAgICogQGphIOi1sOafu+WvvuixoeOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBhcnJheSgpOiBUW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY3Vyc29yIG9wZXJhdGlvbjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGZpcnN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOWFiOmgreimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlRmlyc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBsYXN0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOacq+Wwvuimgee0oOOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTGFzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIG5leHQgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5qyh44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVOZXh0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZikge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIHByZXZpb3VzIGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuWJjeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlUHJldmlvdXMoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fZW9mKSB7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2VlayBieSBwYXNzZWQgY3JpdGVyaWEuIDxicj5cbiAgICAgKiAgICAgSWYgdGhlIG9wZXJhdGlvbiBmYWlsZWQsIHRoZSBjdXJzb3IgcG9zaXRpb24gc2V0IHRvIEVPRi5cbiAgICAgKiBAamEg5oyH5a6a5p2h5Lu244Gn44K344O844KvIDxicj5cbiAgICAgKiAgICAg44K344O844Kv44Gr5aSx5pWX44GX44Gf5aC05ZCI44GvIEVPRiDnirbmhYvjgavjgarjgotcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjcml0ZXJpYVxuICAgICAqICAtIGBlbmAgaW5kZXggb3Igc2VlayBleHByZXNzaW9uXG4gICAgICogIC0gYGphYCBpbmRleCAvIOadoeS7tuW8j+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBzZWVrKGNyaXRlcmlhOiBudW1iZXIgfCBTZWVrRXhwPFQ+KTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAoJ251bWJlcicgPT09IHR5cGVvZiBjcml0ZXJpYSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBjcml0ZXJpYTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gdGhpcy5fYXJyYXkuZmluZEluZGV4KGNyaXRlcmlhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIOOCq+ODvOOCveODq+OBjOacieWKueOBquevhOWbsuOCkuekuuOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQGludGVybmFsXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB0cnVlOiDmnInlirkgLyBmYWxzZTog54Sh5Yq5XG4gICAgICovXG4gICAgcHJpdmF0ZSB2YWxpZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICgwIDw9IHRoaXMuX2luZGV4ICYmIHRoaXMuX2luZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmlxdWUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxUb2tlbixcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5LCBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuLyoqIEBpbnRlcm5hbCB3YWl0IGZvciBjaGFuZ2UgZGV0ZWN0aW9uICovXG5mdW5jdGlvbiBtYWtlUHJvbWlzZTxUPihlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPiwgcmVtYXA/OiBUW10pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGVkaXRvci5vZmYoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICAgICAgcmVtYXAubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICByZW1hcC5wdXNoKC4uLmVkaXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHJlY29yZHMpO1xuICAgICAgICB9O1xuICAgICAgICBlZGl0b3Iub24oY2FsbGJhY2spO1xuICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgdG8gW1tPYnNlcnZhYmxlQXJyYXldXSBpZiBuZWVkZWQuICovXG5hc3luYyBmdW5jdGlvbiBnZXRFZGl0Q29udGV4dDxUPihcbiAgICB0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSxcbiAgICB0b2tlbj86IENhbmNlbFRva2VuXG4pOiBQcm9taXNlPHsgZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD47IHByb21pc2U6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT47IH0+IHwgbmV2ZXIge1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yOiB0YXJnZXQsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZSh0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvciA9IE9ic2VydmFibGVBcnJheS5mcm9tKHRhcmdldCk7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcixcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKGVkaXRvciwgdGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsICd0YXJnZXQgaXMgbm90IEFycmF5IG9yIE9ic2VydmFibGVBcnJheS4nKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBhcnJheSBlbGVtZW50cy5cbiAqIEBqYSDphY3liJfjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAodGFyZ2V0Lmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKDAsIHRhcmdldC5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiBhcnJheS5cbiAqIEBqYSDphY3liJfjga7mnKvlsL7jgavov73liqBcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnB1c2goLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBhcnJheS5cbiAqIEBqYSDmjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZShpbmRleCwgMCwgLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIGFycmF5IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IE1hdGgudHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gb3JkZXJzIHx8IG9yZGVycy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOmZjemghuOCveODvOODiFxuICAgIG9yZGVycy5zb3J0KChsaHMsIHJocykgPT4ge1xuICAgICAgICByZXR1cm4gKGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgIGVkaXRvci5zcGxpY2Uob3JkZXIsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuIiwiaW1wb3J0IHsgS2V5cywgY29tcHV0ZURhdGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRmlsdGVyQ2FsbGJhY2ssIER5bmFtaWNDb21iaW5hdGlvbiB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBWYWx1ZVR5cGVBTEw8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PG51bWJlciB8IHN0cmluZyB8IERhdGUsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgVmFsdWVUeXBlQ29tcGFyYWJsZTxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBWYWx1ZVR5cGVTdHJpbmc8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PHN0cmluZywgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCA9ICd5ZWFyJyB8ICdtb250aCcgfCAnZGF5JyB8IHVuZGVmaW5lZDtcblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkVRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUFMTDxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPT09IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gbm90RXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUFMTDxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gIT09IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuR1JFQVRFUiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyZWF0ZXI8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID4gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MRVNTICovXG5leHBvcnQgZnVuY3Rpb24gbGVzczxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPCB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVJfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID49IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTU19FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3NFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPD0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MSUtFICovXG5leHBvcnQgZnVuY3Rpb24gbGlrZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlU3RyaW5nPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5OT1RfTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdExpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+ICFTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmNsdWRlcyh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuIGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzTm90RXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuICEoZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuUkFOR0UgKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCBtaW46IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4sIG1heDogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gY29tYmluYXRpb24oRHluYW1pY0NvbWJpbmF0aW9uLkFORCwgZ3JlYXRlckVxdWFsKHByb3AsIG1pbiksIGxlc3NFcXVhbChwcm9wLCBtYXgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCDjg5XjgqPjg6vjgr/jga7lkIjmiJAgKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5hdGlvbjxUIGV4dGVuZHMgb2JqZWN0Pih0eXBlOiBEeW5hbWljQ29tYmluYXRpb24sIGxoczogRmlsdGVyQ2FsbGJhY2s8VD4sIHJoczogRmlsdGVyQ2FsbGJhY2s8VD4gfCB1bmRlZmluZWQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuICFyaHMgPyBsaHMgOiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLkFORDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLk9SOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgfHwgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gY29tYmluYXRpb246ICR7dHlwZX1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBmYWlsIHNhZmVcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG4iLCJpbXBvcnQgeyBLZXlzIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7XG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIFNvcnRLZXksXG4gICAgRHluYW1pY0NvbmRpdGlvblNlZWQsXG4gICAgRHluYW1pY09wZXJhdG9yQ29udGV4dCxcbiAgICBEeW5hbWljTGltaXRDb25kaXRpb24sXG4gICAgRHluYW1pY09wZXJhdG9yLFxuICAgIER5bmFtaWNDb21iaW5hdGlvbixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFZhbHVlVHlwZUFMTCxcbiAgICBWYWx1ZVR5cGVDb21wYXJhYmxlLFxuICAgIFZhbHVlVHlwZVN0cmluZyxcbiAgICBlcXVhbCxcbiAgICBub3RFcXVhbCxcbiAgICBncmVhdGVyLFxuICAgIGxlc3MsXG4gICAgZ3JlYXRlckVxdWFsLFxuICAgIGxlc3NFcXVhbCxcbiAgICBsaWtlLFxuICAgIG5vdExpa2UsXG4gICAgZGF0ZUxlc3NFcXVhbCxcbiAgICBkYXRlTGVzc05vdEVxdWFsLFxuICAgIHJhbmdlLFxuICAgIGNvbWJpbmF0aW9uLFxufSBmcm9tICcuL2R5bmFtaWMtZmlsdGVycyc7XG5cbi8qKlxuICogQGVuIER5bmFtaWMgcXVlcnkgY29uZGl0aW9uIG1hbmFnZXIgY2xhc3MuXG4gKiBAamEg44OA44Kk44OK44Of44OD44Kv44Kv44Ko44Oq54q25oWL566h55CG44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBEeW5hbWljQ29uZGl0aW9uPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4gaW1wbGVtZW50cyBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4ge1xuXG4gICAgcHJpdmF0ZSBfb3BlcmF0b3JzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdO1xuICAgIHByaXZhdGUgX2NvbWJpbmF0aW9uOiBEeW5hbWljQ29tYmluYXRpb247XG4gICAgcHJpdmF0ZSBfc3VtS2V5czogS2V5czxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9saW1pdD86IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT47XG4gICAgcHJpdmF0ZSBfcmFuZG9tOiBib29sZWFuO1xuICAgIHByaXZhdGUgX3NvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIFtbRHluYW1pY0NvbmRpdGlvblNlZWRdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkczogRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+ID0geyBvcGVyYXRvcnM6IFtdIH0pIHtcbiAgICAgICAgY29uc3QgeyBvcGVyYXRvcnMsIGNvbWJpbmF0aW9uLCBzdW1LZXlzLCBsaW1pdCwgcmFuZG9tLCBzb3J0S2V5cyB9ID0gc2VlZHM7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyAgICAgPSBvcGVyYXRvcnM7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uICAgPSBudWxsICE9IGNvbWJpbmF0aW9uID8gY29tYmluYXRpb24gOiBEeW5hbWljQ29tYmluYXRpb24uQU5EO1xuICAgICAgICB0aGlzLl9zdW1LZXlzICAgICAgID0gbnVsbCAhPSBzdW1LZXlzID8gc3VtS2V5cyA6IFtdO1xuICAgICAgICB0aGlzLl9saW1pdCAgICAgICAgID0gbGltaXQ7XG4gICAgICAgIHRoaXMuX3JhbmRvbSAgICAgICAgPSAhIXJhbmRvbTtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgICAgICA9IHNvcnRLZXlzIHx8IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IER5bmFtaWNDb25kaXRpb25TZWVkXG5cbiAgICBnZXQgb3BlcmF0b3JzKCk6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0b3JzO1xuICAgIH1cblxuICAgIHNldCBvcGVyYXRvcnModmFsdWVzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgc3VtS2V5cygpOiAoS2V5czxUSXRlbT4pW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3VtS2V5cztcbiAgICB9XG5cbiAgICBzZXQgc3VtS2V5cyh2YWx1ZXM6IChLZXlzPFRJdGVtPilbXSkge1xuICAgICAgICB0aGlzLl9zdW1LZXlzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIGdldCBjb21iaW5hdGlvbigpOiBEeW5hbWljQ29tYmluYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29tYmluYXRpb247XG4gICAgfVxuXG4gICAgc2V0IGNvbWJpbmF0aW9uKHZhbHVlOiBEeW5hbWljQ29tYmluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgbGltaXQoKTogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9saW1pdDtcbiAgICB9XG5cbiAgICBzZXQgbGltaXQodmFsdWU6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fbGltaXQgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgcmFuZG9tKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmFuZG9tO1xuICAgIH1cblxuICAgIHNldCByYW5kb20odmFsdWU6IGJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5fcmFuZG9tID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHNvcnRLZXlzKCk6IFNvcnRLZXk8VEtleT5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3J0S2V5cztcbiAgICB9XG5cbiAgICBzZXQgc29ydEtleXModmFsdWVzOiBTb3J0S2V5PFRLZXk+W10pIHtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIGFjY2Vzc29yOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb21wYXJhdG9yIGZ1bmN0aW9ucy5cbiAgICAgKiBAamEg5q+U6LyD6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0U29ydEtleXModGhpcy5fc29ydEtleXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc3ludGhlc2lzIGZpbHRlciBmdW5jdGlvbi5cbiAgICAgKiBAamEg5ZCI5oiQ5riI44G/44OV44Kj44Or44K/6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4ge1xuICAgICAgICBsZXQgZmx0cjogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29uZCBvZiB0aGlzLl9vcGVyYXRvcnMpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoY29uZC5vcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkVRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVBTEw8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVI6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlcjxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1M6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzczxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXNzRXF1YWw8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpa2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc0VxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc05vdEVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiwgY29uZC5yYW5nZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0b3I6ICR7Y29uZC5vcGVyYXRvcn1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciB8fCAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIHNvcnQsXG4gICAgc2h1ZmZsZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIFNvcnRLZXksXG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvblF1ZXJ5SW5mbyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIER5bmFtaWNMaW1pdCxcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscy9jb21wYXJhdG9yJztcbmltcG9ydCB7IER5bmFtaWNDb25kaXRpb24gfSBmcm9tICcuL2R5bmFtaWMtY29uZGl0aW9uJztcblxuY29uc3QgeyB0cnVuYyB9ID0gTWF0aDtcblxuLyoqIEBpbnRlcm5hbCDkvb/nlKjjgZnjgovjg5fjg63jg5Hjg4bjgqPjgYzkv53oqLzjgZXjgozjgZ8gQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMgKi9cbmludGVyZmFjZSBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PiBleHRlbmRzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgc29ydEtleXM6IFNvcnRLZXk8VEtleT5bXTtcbiAgICBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQXBwbHkgYGZpbHRlcmAgYW5kIGBzb3J0IGtleWAgdG8gdGhlIGBpdGVtc2AgZnJvbSBbW3F1ZXJ5SXRlbXNdXWAoKWAgcmVzdWx0LlxuICogQGphIFtbcXVlcnlJdGVtc11dYCgpYCDjgZfjgZ8gYGl0ZW1zYCDjgavlr77jgZfjgaYgYGZpbHRlcmAg44GoIGBzb3J0IGtleWAg44KS6YGp55SoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZWFyY2hJdGVtczxUSXRlbT4oaXRlbXM6IFRJdGVtW10sIGZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IG51bGwsIC4uLmNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10pOiBUSXRlbVtdIHtcbiAgICBsZXQgcmVzdWx0ID0gaXNGdW5jdGlvbihmaWx0ZXIpID8gaXRlbXMuZmlsdGVyKGZpbHRlcikgOiBpdGVtcy5zbGljZSgpO1xuICAgIGZvciAoY29uc3QgY29tcGFyYXRvciBvZiBjb21wYXJhdG9ycykge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihjb21wYXJhdG9yKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gc29ydChyZXN1bHQsIGNvbXBhcmF0b3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIOOBmeOBp+OBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBpuOBhOOCi+WvvuixoeOBq+WvvuOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggcXVlcnkg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21DYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBjYWNoZWQ6IFRJdGVtW10sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBmaWx0ZXIsXG4gICAgICAgIGNvbXBhcmF0b3JzLFxuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgICAgIG5vU2VhcmNoLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgLy8g44Kt44Oj44OD44K344Ol44Gr5a++44GX44Gm44OV44Kj44Or44K/44Oq44Oz44KwLCDjgr3jg7zjg4jjgpLlrp/ooYxcbiAgICBjb25zdCB0YXJnZXRzID0gbm9TZWFyY2ggPyBjYWNoZWQuc2xpY2UoKSA6IHNlYXJjaEl0ZW1zKGNhY2hlZCwgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSAobnVsbCAhPSBiYXNlSW5kZXgpID8gYmFzZUluZGV4IDogMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAkeyBsaW1pdCB9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHRhcmdldHMuc2xpY2UoaW5kZXgsIChudWxsICE9IGxpbWl0KSA/IGluZGV4ICsgbGltaXQgOiB1bmRlZmluZWQpO1xuXG4gICAgICAgIHJlc3VsdHMucHVzaCguLi5pdGVtcyk7XG5cbiAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgdG90YWw6IHRhcmdldHMubGVuZ3RoLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT4sXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0byAmJiBudWxsICE9IGxpbWl0KSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGBwcm92aWRlcmAg6Zai5pWw44KS5L2/55So44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBgcXVlcnlgIOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tUHJvdmlkZXI8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuICAgIGxldCBpbmRleDogbnVtYmVyID0gKG51bGwgIT0gYmFzZUluZGV4KSA/IGJhc2VJbmRleCA6IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHtsaW1pdH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBwcm92aWRlcihvcHRzKTtcblxuICAgICAgICByZXN1bHRzLnB1c2goLi4ucmVzcC5pdGVtcyk7XG5cbiAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgdG90YWw6IHJlc3AudG90YWwsXG4gICAgICAgICAgICBpdGVtczogcmVzcC5pdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IE9iamVjdC5hc3NpZ24oe30sIG9wdHMsIHJlc3Aub3B0aW9ucykgYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+LFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHJlc3AudG90YWwgPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IHJlc3AuaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNvbmRpdGluYWxGaXgg44Gr5L2/55So44GZ44KLIENyaXRlcmlhIE1hcCAqL1xuY29uc3QgX2xpbWl0Q3JpdGVyaWEgPSB7XG4gICAgW0R5bmFtaWNMaW1pdC5DT1VOVF06IG51bGwsXG4gICAgW0R5bmFtaWNMaW1pdC5TVU1dOiAgICAgeyBjb2VmZjogMSB9LFxuICAgIFtEeW5hbWljTGltaXQuU0VDT05EXTogIHsgY29lZmY6IDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1JTlVURV06ICB7IGNvZWZmOiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkhPVVJdOiAgICB7IGNvZWZmOiA2MCAqIDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuREFZXTogICAgIHsgY29lZmY6IDI0ICogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LktCXTogICAgICB7IGNvZWZmOiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5NQl06ICAgICAgeyBjb2VmZjogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LkdCXTogICAgICB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LlRCXTogICAgICB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG59O1xuXG4vKipcbiAqIEBlbiBGaXggdGhlIHRhcmdldCBpdGVtcyBieSBbW0R5bmFtaWNDb25kaXRpb25dXS5cbiAqIEBqYSBbW0R5bmFtaWNDb25kaXRpb25dXSDjgavlvpPjgYTlr77osaHjgpLmlbTlvaJcbiAqXG4gKiBAcGFyYW0gaXRlbXNcbiAqICAtIGBlbmAgdGFyZ2V0IGl0ZW1zIChkZXN0cnVjdGl2ZSlcbiAqICAtIGBqYWAg5a++6LGh44Gu44Ki44Kk44OG44OgICjnoLTlo4rnmoQpXG4gKiBAcGFyYW0gY29uZGl0aW9uXG4gKiAgLSBgZW5gIGNvbmRpdGlvbiBvYmplY3RcbiAqICAtIGBqYWAg5p2h5Lu244Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25kaXRpb25hbEZpeDxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+KFxuICAgIGl0ZW1zOiBUSXRlbVtdLFxuICAgIGNvbmRpdGlvbjogRHluYW1pY0NvbmRpdGlvbjxUSXRlbSwgVEtleT5cbik6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+IHtcbiAgICBjb25zdCB7IHJhbmRvbSwgbGltaXQsIHN1bUtleXMgfSA9IGNvbmRpdGlvbjtcblxuICAgIGlmIChyYW5kb20pIHtcbiAgICAgICAgc2h1ZmZsZShpdGVtcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIGNvbnN0IHsgdW5pdCwgdmFsdWUsIHByb3AgfSA9IGxpbWl0O1xuICAgICAgICBjb25zdCByZXNldDogVEl0ZW1bXSA9IFtdO1xuICAgICAgICBjb25zdCBjcml0ZXJpYSA9IF9saW1pdENyaXRlcmlhW3VuaXRdO1xuICAgICAgICBjb25zdCBsaW1pdENvdW50ID0gdmFsdWU7XG4gICAgICAgIGNvbnN0IGV4Y2VzcyA9ICEhbGltaXQuZXhjZXNzO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGlmICghY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIHtcbiAgICAgICAgICAgICAgICBjb3VudCArPSAoTnVtYmVyKGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIC8gY3JpdGVyaWEuY29lZmYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBhY2Nlc3MgcHJvcGVydHk6ICR7cHJvcH1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxpbWl0Q291bnQgPCBjb3VudCkge1xuICAgICAgICAgICAgICAgIGlmIChleGNlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXRlbXMgPSByZXNldDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgIGl0ZW1zLFxuICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbSwgS2V5czxUSXRlbT4+O1xuXG4gICAgaWYgKDAgPCBzdW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHN1bUtleXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgaW4gcmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSArPSBOdW1iZXIoaXRlbVtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+WkieaPmyAqL1xuZnVuY3Rpb24gZW5zdXJlT3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4gfCB1bmRlZmluZWRcbik6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBzb3J0S2V5czogW10gfSwgb3B0aW9ucyk7XG4gICAgY29uc3QgeyBub1NlYXJjaCwgc29ydEtleXMgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW5vU2VhcmNoICYmICghb3B0cy5jb21wYXJhdG9ycyB8fCBvcHRzLmNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSkge1xuICAgICAgICBvcHRzLmNvbXBhcmF0b3JzID0gY29udmVydFNvcnRLZXlzKHNvcnRLZXlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0cyBhcyBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT47XG59XG5cbi8qKiBAaW50ZXJuYWwg44Kt44Oj44OD44K344Ol5Y+v6IO944GL5Yik5a6aICovXG5mdW5jdGlvbiBjYW5DYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdD4ocmVzdWx0OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPiwgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+KTogYm9vbGVhbiB7XG4gICAgY29uc3QgeyBub0NhY2hlLCBub1NlYXJjaCB9ID0gb3B0aW9ucztcbiAgICByZXR1cm4gIW5vQ2FjaGUgJiYgIW5vU2VhcmNoICYmIHJlc3VsdC50b3RhbCA9PT0gcmVzdWx0Lml0ZW1zLmxlbmd0aDtcbn1cblxuLyoqXG4gKiBAZW4gTG93IGxldmVsIGZ1bmN0aW9uIGZvciBbW0NvbGxlY3Rpb25dXSBxdWVyeSBpdGVtcy5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSBJdGVtIOOCkuOCr+OCqOODquOBmeOCi+S9juODrOODmeODq+mWouaVsFxuICpcbiAqIEBwYXJhbSBxdWVyeUluZm9cbiAqICAtIGBlbmAgcXVlcnkgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg44Kv44Ko44Oq5oOF5aCxXG4gKiBAcGFyYW0gcHJvdmlkZXJcbiAqICAtIGBlbmAgcHJvdmlkZXIgZnVuY3Rpb25cbiAqICAtIGBqYWAg44OX44Ot44OQ44Kk44OA6Zai5pWwXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlJdGVtczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPFRJdGVtW10+IHtcbiAgICBjb25zdCBvcHRzID0gZW5zdXJlT3B0aW9ucyhvcHRpb25zKTtcbiAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSBvcHRzO1xuXG4gICAgLy8gcXVlcnkg44Gr5L2/55So44GX44GfIHNvcnQsIGZpbHRlciDmg4XloLHjgpLjgq3jg6Pjg4Pjgrfjg6VcbiAgICBxdWVyeUluZm8uc29ydEtleXMgICAgPSBzb3J0S2V5cztcbiAgICBxdWVyeUluZm8uY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycztcbiAgICBxdWVyeUluZm8uZmlsdGVyICAgICAgPSBmaWx0ZXI7XG5cbiAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgcXVlcnlGcm9tQ2FjaGUocXVlcnlJbmZvLmNhY2hlLml0ZW1zLCBvcHRzKSkuaXRlbXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHF1ZXJ5RnJvbVByb3ZpZGVyKHByb3ZpZGVyLCBvcHRzKTtcbiAgICAgICAgY29uc3QgbmV4dE9wdHMgPSByZXN1bHQub3B0aW9ucyBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT47XG4gICAgICAgIGlmIChjYW5DYWNoZShyZXN1bHQsIG5leHRPcHRzKSkge1xuICAgICAgICAgICAgcXVlcnlJbmZvLmNhY2hlID0geyAuLi5yZXN1bHQgfTtcbiAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgbm9TZWFyY2gsIGNvbmRpdGlvbjogc2VlZCB9ID0gbmV4dE9wdHM7XG4gICAgICAgIGlmIChzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBjb25kaXRpb24gPSBuZXcgRHluYW1pY0NvbmRpdGlvbihzZWVkKTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGNvbmRpdGlvbmFsRml4KHNlYXJjaEl0ZW1zKFxuICAgICAgICAgICAgICAgIHJlc3VsdC5pdGVtcyxcbiAgICAgICAgICAgICAgICBjb25kaXRpb24uZmlsdGVyLFxuICAgICAgICAgICAgICAgIC4uLmNvbmRpdGlvbi5jb21wYXJhdG9yc1xuICAgICAgICAgICAgKSwgY29uZGl0aW9uKTtcblxuICAgICAgICAgICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLmNhY2hlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBub1NlYXJjaCA/IHJlc3VsdC5pdGVtcyA6IHNlYXJjaEl0ZW1zKHJlc3VsdC5pdGVtcywgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBDb25zdHJ1Y3RvcixcbiAgICBDbGFzcyxcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIFBsYWluT2JqZWN0LFxuICAgIEtleXMsXG4gICAgaXNOaWwsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIG5vb3AsXG4gICAgbHVpZCxcbiAgICBzZXRNaXhDbGFzc0F0dHJpYnV0ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgU3Vic2NyaWJhYmxlLFxuICAgIEV2ZW50QnJva2VyLFxuICAgIEV2ZW50U291cmNlLFxuICAgIEV2ZW50UHVibGlzaGVyLFxufSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIFJlc3VsdCxcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBGQUlMRUQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgU3luY0NvbnRleHQsIGRlZmF1bHRTeW5jIH0gZnJvbSAnQGNkcC9kYXRhLXN5bmMnO1xuaW1wb3J0IHtcbiAgICBNb2RlbCxcbiAgICBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgaXNNb2RlbCxcbn0gZnJvbSAnQGNkcC9tb2RlbCc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uU29ydE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkV2ZW50LFxuICAgIENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZGRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25TZXRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZVNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHNlYXJjaEl0ZW1zLCBxdWVyeUl0ZW1zIH0gZnJvbSAnLi9xdWVyeSc7XG5cbmNvbnN0IF9wcm9wZXJ0aWVzICAgICAgICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5jb25zdCBfY3JlYXRlSXRlcmFibGVJdGVyYXRvciA9IFN5bWJvbCgnY3JlYXRlLWl0ZXJhYmxlLWl0ZXJhdG9yJyk7XG5jb25zdCBfcHJlcGFyZU1vZGVsICAgICAgICAgICA9IFN5bWJvbCgncHJlcGFyZS1tb2RlbCcpO1xuY29uc3QgX3JlbW92ZU1vZGVscyAgICAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1tb2RlbHMnKTtcbmNvbnN0IF9hZGRSZWZlcmVuY2UgICAgICAgICAgID0gU3ltYm9sKCdhZGQtcmVmZXJlbmNlJyk7XG5jb25zdCBfcmVtb3ZlUmVmZXJlbmNlICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLXJlZmVyZW5jZScpO1xuY29uc3QgX29uTW9kZWxFdmVudCAgICAgICAgICAgPSBTeW1ib2woJ21vZGVsLWV2ZW50LWhhbmRsZXInKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PiB7XG4gICAgcmVhZG9ubHkgY29uc3RydWN0T3B0aW9uczogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VCwgSz47XG4gICAgcmVhZG9ubHkgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VCwgSz47XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgcXVlcnlPcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxULCBLPjtcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VCwgSz47XG4gICAgcmVhZG9ubHkgbW9kZWxPcHRpb25zOiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM7XG4gICAgcmVhZG9ubHkgYnlJZDogTWFwPHN0cmluZywgVD47XG4gICAgc3RvcmU6IFRbXTtcbiAgICBhZnRlckZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFQ+O1xufVxuXG4vKiogQGludGVybmFsIHJlc2V0IG1vZGVsIGNvbnRleHQgKi9cbmNvbnN0IHJlc2V0TW9kZWxTdG9yZSA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4oY29udGV4dDogUHJvcGVydHk8VCwgSz4pOiB2b2lkID0+IHtcbiAgICBjb250ZXh0LmJ5SWQuY2xlYXIoKTtcbiAgICBjb250ZXh0LnN0b3JlLmxlbmd0aCA9IDA7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVTb3J0T3B0aW9ucyA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ob3B0aW9uczogQ29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+KTogUmVxdWlyZWQ8Q29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+PiA9PiB7XG4gICAgY29uc3QgeyBzb3J0S2V5czoga2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBvcHRpb25zO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNvcnRLZXlzOiBrZXlzIHx8IFtdLFxuICAgICAgICBjb21wYXJhdG9yczogY29tcHMgfHwgY29udmVydFNvcnRLZXlzKGtleXMgfHwgW10pLFxuICAgIH07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtb2RlbElkQXR0cmlidXRlID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gY3Rvcj8uWydpZEF0dHJpYnV0ZSddIHx8ICdpZCc7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBnZXRNb2RlbElkID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGF0dHJzOiBULCBjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGF0dHJzW21vZGVsSWRBdHRyaWJ1dGUoY3RvcildO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0Q2hhbmdlZElkcyA9IDxUIGV4dGVuZHMgb2JqZWN0PihvYmo6IG9iamVjdCwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiB7IGlkOiBzdHJpbmc7IHByZXZJZD86IHN0cmluZzsgfSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgdHlwZSBNb2RlbExpa2UgPSB7IHByZXZpb3VzOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZzsgfTtcbiAgICBjb25zdCBtb2RlbCA9IG9iaiBhcyBNb2RlbExpa2U7XG5cbiAgICBjb25zdCBpZEF0dHJpYnV0ZSA9IG1vZGVsSWRBdHRyaWJ1dGUoY3Rvcik7XG4gICAgY29uc3QgaWQgPSBtb2RlbFtpZEF0dHJpYnV0ZV07XG4gICAgaWYgKCFpc1N0cmluZyhpZCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4geyBpZDogbW9kZWxbaWRBdHRyaWJ1dGVdLCBwcmV2SWQ6IGlzRnVuY3Rpb24obW9kZWwucHJldmlvdXMpID8gbW9kZWwucHJldmlvdXMoaWRBdHRyaWJ1dGUpIDogdW5kZWZpbmVkIH07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtb2RlbENvbnN0cnVjdG9yID0gPFQgZXh0ZW5kcyBvYmplY3QsIEUgZXh0ZW5kcyBDb2xsZWN0aW9uRXZlbnQ8VD4sIEsgZXh0ZW5kcyBLZXlzPFQ+PihzZWxmOiBDb2xsZWN0aW9uPFQsIEUsIEs+KTogQ2xhc3MgfCB1bmRlZmluZWQgPT4ge1xuICAgIHJldHVybiBzZWxmLmNvbnN0cnVjdG9yWydtb2RlbCddO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgaXNDb2xsZWN0aW9uTW9kZWwgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHg6IHVua25vd24sIHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiB4IGlzIFQgPT4ge1xuICAgIGNvbnN0IGN0b3IgPSBtb2RlbENvbnN0cnVjdG9yKHNlbGYpO1xuICAgIHJldHVybiBpc0Z1bmN0aW9uKGN0b3IpID8geCBpbnN0YW5jZW9mIGN0b3IgOiBmYWxzZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHNwbGljZUFycmF5ID0gPFQ+KHRhcmdldDogVFtdLCBpbnNlcnQ6IFRbXSwgYXQ6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgIGF0ID0gTWF0aC5taW4oTWF0aC5tYXgoYXQsIDApLCB0YXJnZXQubGVuZ3RoKTtcbiAgICB0YXJnZXQuc3BsaWNlKGF0LCAwLCAuLi5pbnNlcnQpO1xufTtcblxuY29uc3QgX3NldE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiB0cnVlLCBtZXJnZTogdHJ1ZSB9O1xuY29uc3QgX2FkZE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiBmYWxzZSB9O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIGZvciBvYmplY3QgY29sbGVjdGlvbi5cbiAqIEBqYSDjgqrjg5bjgrjjgqfjgq/jg4jjga7pm4blkIjjgpLmibHjgYbln7rlupXjgq/jg6njgrnlrprnvqlcbiAqXG4gKiBUT0RPOlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29sbGVjdGlvbjxUTW9kZWwgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3QsIEV2ZW50IGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4gPSBDb2xsZWN0aW9uRXZlbnQ8VE1vZGVsPiwgVEtleSBleHRlbmRzIEtleXM8VE1vZGVsPiA9IEtleXM8VE1vZGVsPj5cbiAgICBleHRlbmRzIEV2ZW50U291cmNlPEV2ZW50PiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFRNb2RlbD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE1vZGVsIGNvbnN0cnVjdG9yLiA8YnI+XG4gICAgICogICAgIFRoZSBjb25zdHJ1Y3RvciBpcyB1c2VkIGludGVybmFsbHkgYnkgdGhpcyBbW0NvbGxlY3Rpb25dXSBjbGFzcyBmb3IgW1tUTW9kZWxdXSBjb25zdHJ1Y3Rpb24uXG4gICAgICogQGphIOODouODh+ODq+OCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gICAgICogICAgIFtbQ29sbGVjdGlvbl1dIOOCr+ODqeOCueOBjCBbW1RNb2RlbF1dIOOCkuani+evieOBmeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCi1xuICAgICAqL1xuICAgIHN0YXRpYyByZWFkb25seSBtb2RlbD86IENsYXNzO1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGNvbnN0cnVjdGlvbi9kZXN0cnVjdGlvbjpcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM/OiBUTW9kZWxbXSB8IFBsYWluT2JqZWN0W10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbW9kZWxPcHRpb25zOiB7fSwgcXVlcnlPcHRpb25zOiB7fSB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucywgcXVlcnlPcHRpb25zIH0gPSBvcHRzO1xuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0ge1xuICAgICAgICAgICAgY29uc3RydWN0T3B0aW9uczogb3B0cyxcbiAgICAgICAgICAgIHByb3ZpZGVyOiBvcHRzLnByb3ZpZGVyIHx8IHRoaXMuc3luYy5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdjb2xsZWN0aW9uOicsIDgpLFxuICAgICAgICAgICAgcXVlcnlPcHRpb25zLFxuICAgICAgICAgICAgcXVlcnlJbmZvOiB7fSxcbiAgICAgICAgICAgIG1vZGVsT3B0aW9ucyxcbiAgICAgICAgICAgIGJ5SWQ6IG5ldyBNYXA8c3RyaW5nLCBUTW9kZWw+KCksXG4gICAgICAgICAgICBzdG9yZTogW10sXG4gICAgICAgIH0gYXMgdW5rbm93biBhcyBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuXG4gICAgICAgIC8qIG1vZGVsIGV2ZW50IGhhbmRsZXIgKi9cbiAgICAgICAgdGhpc1tfb25Nb2RlbEV2ZW50XSA9IChldmVudDogc3RyaW5nLCBtb2RlbDogVE1vZGVsIHwgdW5kZWZpbmVkLCBjb2xsZWN0aW9uOiB0aGlzLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnN0YXJ0c1dpdGgoJ0AnKSAmJiBtb2RlbCkge1xuICAgICAgICAgICAgICAgIGlmICgoJ0BhZGQnID09PSBldmVudCB8fCAnQHJlbW92ZScgPT09IGV2ZW50KSAmJiBjb2xsZWN0aW9uICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdAZGVzdHJveScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0gKGNvbGxlY3Rpb24gYXMgYW55KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZShtb2RlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgnQGNoYW5nZScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkcyA9IGdldENoYW5nZWRJZHMobW9kZWwsIG1vZGVsQ29uc3RydWN0b3IodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCBwcmV2SWQgfSA9IGlkcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2SWQgIT09IGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHByZXZJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLmRlbGV0ZShwcmV2SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGRlbGVnYXRlIGV2ZW50XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIuY2FsbCh0aGlzLCBldmVudCwgbW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVzZWxlc3MtY2FsbFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZWVkcykge1xuICAgICAgICAgICAgdGhpcy5yZXNldChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAamEgSW5pdGlhbGl6ZSBxdWVyeSBpbmZvXG4gICAgICogQGphIOOCr+OCqOODquaDheWgseOBruWIneacn+WMllxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpbml0UXVlcnlJbmZvKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9ID0gZW5zdXJlU29ydE9wdGlvbnModGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3F1ZXJ5SW5mbyA9IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgYW5kIGV2ZW50IGxpc3RlbmVyIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgpLnoLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIChyZXNlcnZlZCkuXG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7MgKOS6iOe0hClcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZShvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB0aGlzIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gW107XG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIENsZWFyIGNhY2hlIGluc3RhbmNlIG1ldGhvZFxuICAgICAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjga7noLTmo4RcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgY2xlYXJDYWNoZSgpOiB2b2lkIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3F1ZXJ5SW5mby5jYWNoZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4ggSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBtb2RlbHMuXG4gICAgICogQGphIOODouODh+ODq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBtb2RlbHMoKTogcmVhZG9ubHkgVE1vZGVsW10ge1xuICAgICAgICBjb25zdCB7IF9xdWVyeUZpbHRlciwgX2FmdGVyRmlsdGVyIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChfYWZ0ZXJGaWx0ZXIgJiYgX2FmdGVyRmlsdGVyICE9PSBfcXVlcnlGaWx0ZXIpID8gc3RvcmUuZmlsdGVyKF9hZnRlckZpbHRlcikgOiBzdG9yZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIG1vZGVscy5cbiAgICAgKiBAamEg5YaF5YyF44GZ44KL44Oi44OH44Or5pWwXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uc3RvcmUubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBhcHBsaWVkIGFmdGVyLWZpbHRlci5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44GM6YGp55So44GV44KM44Gm44GE44KL44GL44KS5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcmVkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISF0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0gaW5zdGFuY2VcbiAgICAgKiBAamEgW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlJbmZvKCk6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIGluc3RhbmNlXG4gICAgICogQGphIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBzZXQgX3F1ZXJ5SW5mbyh2YWw6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5Pikge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8gPSB2YWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjcmVhdGluZyBvcHRpb25zLlxuICAgICAqIEBqYSDmp4vnr4nmmYLjga7jgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9vcHRpb25zKCk6IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29uc3RydWN0T3B0aW9ucztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcHJvdmlkZXIuXG4gICAgICogQGphIOaXouWumuOBruODl+ODreODkOOCpOODgOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3Byb3ZpZGVyKCk6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5wcm92aWRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcGFyc2UgYmVoYXZpb3VyLlxuICAgICAqIEBqYSDml6Llrprjga4gcGFyc2Ug5YuV5L2c44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfZGVmYXVsdFBhcnNlKCk6IGJvb2xlYW4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9ucy5wYXJzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5pei5a6a44Gu44Kv44Ko44Oq44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfZGVmYXVsdFF1ZXJ5T3B0aW9ucygpOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5T3B0aW9ucztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGxhc3QgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5pyA5b6M44Gu44Kv44Ko44Oq44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfbGFzdFF1ZXJ5T3B0aW9ucygpOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgICAgICBjb25zdCBvcHRzOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+ID0ge307XG5cbiAgICAgICAgc29ydEtleXMubGVuZ3RoICYmIChvcHRzLnNvcnRLZXlzID0gc29ydEtleXMpO1xuICAgICAgICBjb21wYXJhdG9ycy5sZW5ndGggJiYgKG9wdHMuY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycyk7XG4gICAgICAgIGZpbHRlciAmJiAob3B0cy5maWx0ZXIgPSBmaWx0ZXIpO1xuXG4gICAgICAgIHJldHVybiBvcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gc29ydCBjb21wYXJhdG9ycy5cbiAgICAgKiBAamEg44K944O844OI55So5q+U6LyD6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY29tcGFyYXRvcnMoKTogU29ydENhbGxiYWNrPFRNb2RlbD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBxdWVyeS1maWx0ZXIuXG4gICAgICogQGphIOOCr+OCqOODqueUqOODleOCo+ODq+OCv+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5RmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmZpbHRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGFmdGVyLWZpbHRlci5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYWZ0ZXJGaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB1dGlsc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhIG1vZGVsIGZyb20gYSBjb2xsZWN0aW9uLCBzcGVjaWZpZWQgYnkgYW4gYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlLlxuICAgICAqIEBqYSBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrnjgYvjgonjg6Ljg4fjg6vjgpLnibnlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgICBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KHNlZWQ6IHN0cmluZyB8IG9iamVjdCB8IHVuZGVmaW5lZCk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChudWxsID09IHNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoaXNTdHJpbmcoc2VlZCkgJiYgYnlJZC5oYXMoc2VlZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBieUlkLmdldChzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gZ2V0TW9kZWxJZChpc01vZGVsKHNlZWQpID8gc2VlZC50b0pTT04oKSA6IHNlZWQgYXMgb2JqZWN0LCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgY29uc3QgY2lkID0gKHNlZWQgYXMgb2JqZWN0IGFzIHsgX2NpZD86IHN0cmluZzsgfSkuX2NpZDtcblxuICAgICAgICByZXR1cm4gYnlJZC5nZXQoaWQpIHx8IChjaWQgJiYgYnlJZC5nZXQoY2lkKSkgYXMgVE1vZGVsIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIOODouODh+ODq+WxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogb2JqZWN0W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5tb2RlbHMubWFwKG0gPT4gaXNNb2RlbChtKSA/IG0udG9KU09OKCkgOiBtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZXMgQ2xvbmUgdGhpcyBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Gu6KSH6KO944KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUoKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgY29uc3RydWN0b3IsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikodGhpc1tfcHJvcGVydGllc10uc3RvcmUsIF9vcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yY2UgYSBjb2xsZWN0aW9uIHRvIHJlLXNvcnQgaXRzZWxmLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PopoHntKDjga7lho3jgr3jg7zjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzb3J0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjgr3jg7zjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc29ydChvcHRpb25zPzogQ29sbGVjdGlvblJlU29ydE9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgeyBub1Rocm93LCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gZW5zdXJlU29ydE9wdGlvbnMob3B0cyk7XG4gICAgICAgIGNvbnN0IGNvbXBhcmF0b3JzID0gMCA8IGNvbXBzLmxlbmd0aCA/IGNvbXBzIDogdGhpcy5fY29tcGFyYXRvcnM7XG5cbiAgICAgICAgaWYgKGNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpZiAobm9UaHJvdykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUywgJ0Nhbm5vdCBzb3J0IGEgc2V0IHdpdGhvdXQgYSBjb21wYXJhdG9yLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uc3RvcmUgPSBzZWFyY2hJdGVtcyh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgdGhpcy5fYWZ0ZXJGaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgICAgICAvLyB1cGRhdGUgcXVlcnlJbmZvXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzO1xuICAgICAgICBpZiAoMCA8IHNvcnRLZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLnNvcnRLZXlzID0gc29ydEtleXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgdHlwZSBDb250ZXh0ID0gQ29sbGVjdGlvbjxUTW9kZWw+O1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGx5IGFmdGVyLWZpbHRlciB0byBjb2xsZWN0aW9uIGl0c2VsZi5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWZ0ZXItZmlsdGVyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDntZ7jgorovrzjgb/jgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyKG9wdGlvbnM/OiBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFRNb2RlbD4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHsgZmlsdGVyLCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGlmIChmaWx0ZXIgIT09IHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlciA9IGZpbHRlcjtcbiAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgdHlwZSBDb250ZXh0ID0gQ29sbGVjdGlvbjxUTW9kZWw+O1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0BmaWx0ZXInLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gdGhlIGhhc2ggb2YgYXR0cmlidXRlcyB0byBiZSBgc2V0YCBvbiB0aGUgY29sbGVjdGlvbi4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIHRoZSByZXNwb25zZSBhbG9uZy5cbiAgICAgKiBAamEg44Os44K544Od44Oz44K544Gu5aSJ5o+b44Oh44K944OD44OJLiDml6Llrprjgafjga/kvZXjgoLjgZfjgarjgYRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBwYXJzZShyZXNwb25zZTogUGxhaW5PYmplY3QgfCB2b2lkLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXSB8IFBsYWluT2JqZWN0W10gfCB1bmRlZmluZWQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgVE1vZGVsW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSBbW2ZldGNoXV0gbWV0aG9kIHByb3h5IHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIFtbQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcl1dIHJldHVybnMgb25lLXNob3QgcmVzdWx0LlxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25JdGVtUHJvdmlkZXJdXSDkupLmj5vjga7ljZjnmbrjga4gZmV0Y2gg57WQ5p6c44KS6L+U5Y20LiDlv4XopoHjgavlv5zjgZjjgabjgqrjg7zjg5Djg7zjg6njgqTjg4nlj6/og70uXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgYXN5bmMgc3luYyhvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgZGVmYXVsdFN5bmMoKS5zeW5jKCdyZWFkJywgdGhpcyBhcyBTeW5jQ29udGV4dCwgb3B0aW9ucykgYXMgVE1vZGVsW107XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmV0Y2ggdGhlIFtbTW9kZWxdXSBmcm9tIHRoZSBzZXJ2ZXIsIG1lcmdpbmcgdGhlIHJlc3BvbnNlIHdpdGggdGhlIG1vZGVsJ3MgbG9jYWwgYXR0cmlidXRlcy5cbiAgICAgKiBAamEgW1tNb2RlbF1dIOWxnuaAp+OBruOCteODvOODkOODvOWQjOacny4g44Os44K544Od44Oz44K544Gu44Oe44O844K444KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgZmV0Y2ggb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODleOCp+ODg+ODgeOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBmZXRjaChvcHRpb25zPzogQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogUHJvbWlzZTxvYmplY3RbXT4ge1xuICAgICAgICB0eXBlIENvbnRleHQgPSBDb2xsZWN0aW9uPFRNb2RlbD47XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwcm9ncmVzczogbm9vcCB9LCB0aGlzLl9kZWZhdWx0UXVlcnlPcHRpb25zLCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBwcm9ncmVzczogb3JpZ2luYWwsIGxpbWl0LCByZXNldCwgbm9DYWNoZSB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IHsgX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyIH0gPSB0aGlzO1xuICAgICAgICAgICAgY29uc3QgZmluYWxpemUgPSAobnVsbCA9PSBsaW1pdCk7XG5cbiAgICAgICAgICAgIG9wdHMucHJvZ3Jlc3MgPSAoaW5mbzogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUTW9kZWw+KSA9PiB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWwoaW5mbyk7XG4gICAgICAgICAgICAgICAgIWZpbmFsaXplICYmIHRoaXMuYWRkKGluZm8uaXRlbXMsIG9wdHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKG5vQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmaW5hbGl6ZSAmJiByZXNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQodW5kZWZpbmVkLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHF1ZXJ5SXRlbXMoX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyLCBvcHRzKTtcblxuICAgICAgICAgICAgaWYgKGZpbmFsaXplKSB7XG4gICAgICAgICAgICAgICAgcmVzZXQgPyB0aGlzLnJlc2V0KHJlc3AsIG9wdHMpIDogdGhpcy5hZGQocmVzcCwgb3B0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBDb250ZXh0LCByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAZXJyb3InLCB0aGlzIGFzIENvbnRleHQsIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGBmZXRjaCgpYCB3aXRoIGxhc3QgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5YmN5Zue44Go5ZCM5p2h5Lu244GnIGBmZXRjaCgpYCDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXF1ZXJ5IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVxdWVyeShvcHRpb25zPzogQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zKTogUHJvbWlzZTxvYmplY3RbXT4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fbGFzdFF1ZXJ5T3B0aW9ucywgb3B0aW9ucywgeyByZXNldDogdHJ1ZSB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2gob3B0cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogY29sbGVjdGlvbiBzZXR1cFxuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7Pjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBq+ODouODh+ODq+OBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GE44Oi44OH44Or44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBOaWwgdmFsdWUuXG4gICAgICogIC0gYGphYCBOaWwg6KaB57SgXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiB1bmRlZmluZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44Gr44Oi44OH44Or44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYTjg6Ljg4fjg6vjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44Gr44Oi44OH44Or44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYTjg6Ljg4fjg6vjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZHM6IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgc2V0KHNlZWRzPzogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10gfCB2b2lkIHtcbiAgICAgICAgaWYgKGlzTmlsKHNlZWRzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwYXJzZTogdGhpcy5fZGVmYXVsdFBhcnNlIH0sIF9zZXRPcHRpb25zLCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBpZiAob3B0cy5wYXJzZSAmJiAhaXNDb2xsZWN0aW9uTW9kZWwoc2VlZHMsIHRoaXMpKSB7XG4gICAgICAgICAgICBzZWVkcyA9IHRoaXMucGFyc2Uoc2VlZHMsIG9wdGlvbnMpIHx8IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2luZ3VsYXIgPSAhaXNBcnJheShzZWVkcyk7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiAoVE1vZGVsIHwgb2JqZWN0IHwgdW5kZWZpbmVkKVtdID0gc2luZ3VsYXIgPyBbc2VlZHNdIDogKHNlZWRzIGFzIG9iamVjdFtdKS5zbGljZSgpO1xuXG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuXG4gICAgICAgIGNvbnN0IGF0ID0gKChjYW5kaWRhdGUpOiBudW1iZXIgfCB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPiBzdG9yZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlICs9IHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChjYW5kaWRhdGUgPCAwKSA/IDAgOiBjYW5kaWRhdGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKG9wdHMuYXQpO1xuXG4gICAgICAgIGNvbnN0IHNldDogb2JqZWN0W10gICAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b0FkZDogVE1vZGVsW10gICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9NZXJnZTogVE1vZGVsW10gID0gW107XG4gICAgICAgIGNvbnN0IHRvUmVtb3ZlOiBUTW9kZWxbXSA9IFtdO1xuICAgICAgICBjb25zdCBtb2RlbFNldCA9IG5ldyBTZXQ8b2JqZWN0PigpO1xuXG4gICAgICAgIGNvbnN0IHsgYWRkLCBtZXJnZSwgcmVtb3ZlLCBwYXJzZSwgc2lsZW50IH0gPSBvcHRzO1xuXG4gICAgICAgIGxldCBzb3J0ID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHNvcnRhYmxlID0gdGhpcy5fY29tcGFyYXRvcnMubGVuZ3RoICYmIG51bGwgPT0gYXQgJiYgZmFsc2UgIT09IG9wdHMuc29ydDtcblxuICAgICAgICB0eXBlIE1vZGVsRmVhdHVyZSA9IHtcbiAgICAgICAgICAgIHBhcnNlOiAoYXRycj86IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gb2JqZWN0O1xuICAgICAgICAgICAgc2V0QXR0cmlidXRlczogKGF0cnI6IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gdm9pZDtcbiAgICAgICAgICAgIGhhc0NoYW5nZWQ6ICgpID0+IGJvb2xlYW47XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVHVybiBiYXJlIG9iamVjdHMgaW50byBtb2RlbCByZWZlcmVuY2VzLCBhbmQgcHJldmVudCBpbnZhbGlkIG1vZGVscyBmcm9tIGJlaW5nIGFkZGVkLlxuICAgICAgICBmb3IgKGNvbnN0IFtpLCBpdGVtXSBvZiBpdGVtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vIElmIGEgZHVwbGljYXRlIGlzIGZvdW5kLCBwcmV2ZW50IGl0IGZyb20gYmVpbmcgYWRkZWQgYW5kIG9wdGlvbmFsbHkgbWVyZ2UgaXQgaW50byB0aGUgZXhpc3RpbmcgbW9kZWwuXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZ2V0KGl0ZW0pIGFzIE1vZGVsRmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIGlmIChtZXJnZSAmJiBpdGVtICE9PSBleGlzdGluZykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cnMgPSBpc01vZGVsKGl0ZW0pID8gaXRlbS50b0pTT04oKSA6IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZSAmJiBpc0Z1bmN0aW9uKGV4aXN0aW5nLnBhcnNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMgPSBleGlzdGluZy5wYXJzZShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihleGlzdGluZy5zZXRBdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmcuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0b01lcmdlLnB1c2goZXhpc3RpbmcgYXMgVE1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRhYmxlICYmICFzb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0ID0gaXNGdW5jdGlvbihleGlzdGluZy5oYXNDaGFuZ2VkKSA/IGV4aXN0aW5nLmhhc0NoYW5nZWQoKSA6IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMoZXhpc3RpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXRlbXNbaV0gPSBleGlzdGluZztcbiAgICAgICAgICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBicmFjZS1zdHlsZVxuXG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmV3LCB2YWxpZCBtb2RlbCwgcHVzaCBpdCB0byB0aGUgYHRvQWRkYCBsaXN0LlxuICAgICAgICAgICAgZWxzZSBpZiAoYWRkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBpdGVtc1tpXSA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oaXRlbSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQWRkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19hZGRSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxTZXQuYWRkKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBzdGFsZSBtb2RlbHMuXG4gICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGVsU2V0Lmhhcyhtb2RlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9SZW1vdmUucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXNbX3JlbW92ZU1vZGVsc10odG9SZW1vdmUsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2VlIGlmIHNvcnRpbmcgaXMgbmVlZGVkLCB1cGRhdGUgYGxlbmd0aGAgYW5kIHNwbGljZSBpbiBuZXcgbW9kZWxzLlxuICAgICAgICBsZXQgb3JkZXJDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHJlcGxhY2UgPSAhc29ydGFibGUgJiYgYWRkICYmIHJlbW92ZTtcbiAgICAgICAgaWYgKHNldC5sZW5ndGggJiYgcmVwbGFjZSkge1xuICAgICAgICAgICAgb3JkZXJDaGFuZ2VkID0gKHN0b3JlLmxlbmd0aCAhPT0gc2V0Lmxlbmd0aCkgfHwgc3RvcmUuc29tZSgobSwgaW5kZXgpID0+IG0gIT09IHNldFtpbmRleF0pO1xuICAgICAgICAgICAgc3RvcmUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCBzZXQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHRvQWRkLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHNvcnRhYmxlKSB7XG4gICAgICAgICAgICAgICAgc29ydCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgdG9BZGQsIG51bGwgPT0gYXQgPyBzdG9yZS5sZW5ndGggOiBhdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaWxlbnRseSBzb3J0IHRoZSBjb2xsZWN0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICBpZiAoc29ydCkge1xuICAgICAgICAgICAgdGhpcy5zb3J0KHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sZXNzIHNpbGVuY2VkLCBpdCdzIHRpbWUgdG8gZmlyZSBhbGwgYXBwcm9wcmlhdGUgYWRkL3NvcnQvdXBkYXRlIGV2ZW50cy5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2ksIG1vZGVsXSBvZiB0b0FkZC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBhdCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gYXQgKyBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQGFkZCcsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAYWRkJywgbW9kZWwsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvcnQgfHwgb3JkZXJDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvQWRkLmxlbmd0aCB8fCB0b1JlbW92ZS5sZW5ndGggfHwgdG9NZXJnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZGVkOiB0b0FkZCxcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZDogdG9SZW1vdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lcmdlZDogdG9NZXJnZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkcm9wIHVuZGVmaW5lZFxuICAgICAgICBjb25zdCByZXR2YWwgPSBpdGVtcy5maWx0ZXIoaSA9PiBudWxsICE9IGkpIGFzIFRNb2RlbFtdO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgYWRkZWQgKG9yIG1lcmdlZCkgbW9kZWwgKG9yIG1vZGVscykuXG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJldHZhbFswXSA6IChyZXR2YWwubGVuZ3RoID8gcmV0dmFsIDogdm9pZCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBhIGNvbGxlY3Rpb24gd2l0aCBhIG5ldyBsaXN0IG9mIG1vZGVscyAob3IgYXR0cmlidXRlIGhhc2hlcyksIHRyaWdnZXJpbmcgYSBzaW5nbGUgYHJlc2V0YCBldmVudCBvbiBjb21wbGV0aW9uLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PjgpLmlrDjgZfjgYTjg6Ljg4fjg6vkuIDopqfjgafnva7mj5suIOWujOS6huaZguOBqyBgcmVzZXRgIOOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44K744OD44OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KHNlZWRzPzogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyAmIHsgcHJldmlvdXM6IFRNb2RlbFtdOyB9O1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLnByZXZpb3VzID0gc3RvcmUuc2xpY2UoKTtcbiAgICAgICAgcmVzZXRNb2RlbFN0b3JlKHRoaXNbX3Byb3BlcnRpZXNdKTtcblxuICAgICAgICBjb25zdCBtb2RlbHMgPSBzZWVkcyA/IHRoaXMuYWRkKHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKSA6IFtdO1xuXG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0ByZXNldCcsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9kZWxzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgbW9kZWwgdG8gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBuOOBruODouODh+ODq+OBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHRvIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiBAamEg44Oi44OH44Or44Oq44K544OI5oyH5a6a44Gr44KI44KL44Kz44Os44Kv44K344On44Oz44G444Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkczogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBhZGQoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0KHNlZWRzIGFzIFVua25vd25PYmplY3QsIE9iamVjdC5hc3NpZ24oeyBtZXJnZTogZmFsc2UgfSwgb3B0aW9ucywgX2FkZE9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PjgYvjgonjg6Ljg4fjg6vjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIGxpc3Qgb2YgbW9kZWxzIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEg44Oi44OH44Or44Oq44K544OI5oyH5a6a44Gr44KI44KL44Kz44Os44Kv44K344On44Oz44GL44KJ44Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHNpbmd1bGFyID8gW3NlZWRzIGFzIFRNb2RlbF0gOiAoc2VlZHMgYXMgVE1vZGVsW10pLnNsaWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSB0aGlzW19yZW1vdmVNb2RlbHNdKGl0ZW1zLCBvcHRzKTtcbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCAmJiByZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0geyBhZGRlZDogW10sIG1lcmdlZDogW10sIHJlbW92ZWQgfTtcbiAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJlbW92ZWRbMF0gOiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbW9kZWwgcHJlcGFyYXRpb24gKi9cbiAgICBwcml2YXRlIFtfcHJlcGFyZU1vZGVsXShhdHRyczogb2JqZWN0IHwgVE1vZGVsIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChpc0NvbGxlY3Rpb25Nb2RlbChhdHRycywgdGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRycztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBtb2RlbE9wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBuZXcgY29uc3RydWN0b3IoYXR0cnMsIG9wdHMpIGFzIHsgdmFsaWRhdGU6ICgpID0+IFJlc3VsdDsgfTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKG1vZGVsLnZhbGlkYXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1vZGVsLnZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSBDb250ZXh0ID0gQ29sbGVjdGlvbjxUTW9kZWw+O1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAaW52YWxpZCcsIGF0dHJzIGFzIFRNb2RlbCwgdGhpcyBhcyBDb250ZXh0LCByZXN1bHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb2RlbCBhcyBUTW9kZWw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwbGFpbiBvYmplY3RcbiAgICAgICAgcmV0dXJuIGF0dHJzIGFzIFRNb2RlbDtcbiAgICB9XG5cbiAgICAvKiogQGluZXRlcm5hbCBJbnRlcm5hbCBtZXRob2QgY2FsbGVkIGJ5IGJvdGggcmVtb3ZlIGFuZCBzZXQuICovXG4gICAgcHJpdmF0ZSBbX3JlbW92ZU1vZGVsc10obW9kZWxzOiBUTW9kZWxbXSwgb3B0aW9uczogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBjb25zdCByZW1vdmVkOiBUTW9kZWxbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG1kbCBvZiBtb2RlbHMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gdGhpcy5nZXQobWRsKTtcbiAgICAgICAgICAgIGlmICghbW9kZWwpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHN0b3JlLmluZGV4T2YobW9kZWwpO1xuICAgICAgICAgICAgc3RvcmUuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlZmVyZW5jZXMgYmVmb3JlIHRyaWdnZXJpbmcgJ3JlbW92ZScgZXZlbnQgdG8gcHJldmVudCBhbiBpbmZpbml0ZSBsb29wLlxuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50QnJva2VyKSkge1xuICAgICAgICAgICAgICAgICAgICAobW9kZWwgYXMgTW9kZWwpLnRyaWdnZXIoJ0ByZW1vdmUnLCBtb2RlbCBhcyBNb2RlbCwgdGhpcywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSBDb250ZXh0ID0gQ29sbGVjdGlvbjxUTW9kZWw+O1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZW1vdmVkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIGNyZWF0ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX2FkZFJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoX2NpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsIHRoaXNbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gc2V2ZXIgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwsIHBhcnRpYWwgPSBmYWxzZSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoX2NpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcnRpYWwgJiYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcExpc3RlbmluZyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgdGhpc1tfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUTW9kZWw+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2YgW1tFbGVtZW50QmFzZV1dIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOagvOe0jeOBl+OBpuOBhOOCiyBbW0VsZW1lbnRCYXNlXV0g44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpc1tfcHJvcGVydGllc10uc3RvcmUsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxUTW9kZWw+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VE1vZGVsPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaWQpLCB2YWx1ZShtb2RlbCkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSwgdmFsdWUobW9kZWwpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBUTW9kZWxdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpZCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZykgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwb3Mya2V5ID0gKHBvczogbnVtYmVyKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBnZXRNb2RlbElkKGNvbnRleHQuYmFzZVtwb3NdLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKSB8fCBTdHJpbmcocG9zKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IocG9zMmtleShjdXJyZW50KSwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8vIG1peGluIOOBq+OCiOOCiyBgaW5zdGFuY2VvZmAg44Gv54Sh5Yq544Gr6Kit5a6aXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShDb2xsZWN0aW9uIGFzIENsYXNzLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuXG4vKlxuIOKYhiBpZFxuIOKYhiBtb2RlbHMvaXRlbXNcbiDimIYgbGVuZ3RoXG4g4piGIHJlbGVhc2UoKVxuIOKYhiBmZXRjaCgpXG4g4piGIHJlcXVlcnkoKVxuXG4g4piFIC0gTGlzdEVkaXRhYmxlPFQ+IOOCkuOBqeOBhuOBmeOCi+OBiz9cblxuIOKYhSB1cmw6IHN0cmluZyB8ICgoKSA9PiBzdHJpbmcpO1xuXG4g4piFIHdpdGhvdXQoLi4udmFsdWVzOiBUTW9kZWxbXSk6IFRNb2RlbFtdO1xuXG4g4piGIGFkZChtb2RlbDoge318VE1vZGVsLCBvcHRpb25zPzogQWRkT3B0aW9ucyk6IFRNb2RlbDtcbiDimIYgYWRkKG1vZGVsczogKHt9fFRNb2RlbClbXSwgb3B0aW9ucz86IEFkZE9wdGlvbnMpOiBUTW9kZWxbXTtcbiDimIUgYXQoaW5kZXg6IG51bWJlcik6IFRNb2RlbDtcbiDimIYgZ2V0KGlkOiBudW1iZXIgfCBzdHJpbmcgfCBNb2RlbCk6IFRNb2RlbDtcbiDimIUgaGFzKGtleTogbnVtYmVyIHwgc3RyaW5nIHwgTW9kZWwpOiBib29sZWFuO1xuIOKYhiBjbG9uZSgpOiB0aGlzO1xuIOKYhSBjcmVhdGUoYXR0cmlidXRlczogYW55LCBvcHRpb25zID86IE1vZGVsU2F2ZU9wdGlvbnMpOiBUTW9kZWw7XG4g4piFIHBsdWNrKGF0dHJpYnV0ZTogc3RyaW5nKTogYW55W107XG4g4piFIHB1c2gobW9kZWw6IFRNb2RlbCwgb3B0aW9ucyA/OiBBZGRPcHRpb25zKTogVE1vZGVsO1xuIOKYhSBwb3Aob3B0aW9ucyA/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbDtcbiDimIYgcmVtb3ZlKG1vZGVsOiB7fSB8IFRNb2RlbCwgb3B0aW9ucyA/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbDtcbiDimIYgcmVtb3ZlKG1vZGVsczogKHt9IHwgVE1vZGVsKVtdLCBvcHRpb25zID86IFNpbGVuY2VhYmxlKTogVE1vZGVsW107XG4g4piGIHJlc2V0KG1vZGVscyA/OiBUTW9kZWxbXSwgb3B0aW9ucyA/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbFtdO1xuIOKYhiBzZXQobW9kZWxzID86IFRNb2RlbFtdLCBvcHRpb25zID86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW107XG4g4piFIHNoaWZ0KG9wdGlvbnMgPzogU2lsZW5jZWFibGUpOiBUTW9kZWw7XG4g4piGIHNvcnQob3B0aW9ucyA/OiBTaWxlbmNlYWJsZSk6IENvbGxlY3Rpb248VE1vZGVsPjtcbiDimIUgdW5zaGlmdChtb2RlbDogVE1vZGVsLCBvcHRpb25zID86IEFkZE9wdGlvbnMpOiBUTW9kZWw7XG4g4piFIHdoZXJlKHByb3BlcnRpZXM6IGFueSk6IFRNb2RlbFtdO1xuIOKYhSBmaW5kV2hlcmUocHJvcGVydGllczogYW55KTogVE1vZGVsO1xuIOKYhSBtb2RlbElkKGF0dHJzOiBhbnkpIDogYW55XG4g4piFIHNsaWNlKG1pbj86IG51bWJlciwgbWF4PzogbnVtYmVyKTogVE1vZGVsW107XG5cbiAvLyBtaXhpbnMgZnJvbSB1bmRlcnNjb3JlICjln7rmnKzjgoTjgonjgarjgYQgaW5jbHVkZXMg44Gg44GR44KE44KLLiArIGZpbHRlciDjgpIgYWZ0ZXJGaWx0ZXIg44Gn5a6f54++44GZ44KLKVxuXG4g4piFIGFsbChpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBib29sZWFuO1xuIOKYhSBhbnkoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogYm9vbGVhbjtcbiDimIUgY2hhaW4oKTogYW55O1xuIOKYhSBjb2xsZWN0PFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBjb250ZXh0PzogYW55KTogVFJlc3VsdFtdO1xuIOKYhSBjb250YWlucyh2YWx1ZTogVE1vZGVsKTogYm9vbGVhbjtcbiDimIUgY291bnRCeShpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYW55Pik6IF8uRGljdGlvbmFyeTxudW1iZXI+O1xuIOKYhSBjb3VudEJ5KGl0ZXJhdG9yOiBzdHJpbmcpOiBfLkRpY3Rpb25hcnk8bnVtYmVyPjtcbiDimIUgZGV0ZWN0KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogVE1vZGVsO1xuIOKYhSBkaWZmZXJlbmNlKG90aGVyczogVE1vZGVsW10pOiBUTW9kZWxbXTtcbiDimIUgZHJvcChuPzogbnVtYmVyKTogVE1vZGVsW107XG4g4piFIGVhY2goaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgdm9pZD4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgZXZlcnkoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBib29sZWFuO1xuIOKYhiBmaWx0ZXIoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgZmluZChpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IFRNb2RlbDtcbiDimIUgZmluZEluZGV4KHByZWRpY2F0ZTogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IG51bWJlcjtcbiDimIUgZmluZExhc3RJbmRleChwcmVkaWNhdGU6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBudW1iZXI7XG4g4piFIGZpcnN0KCk6IFRNb2RlbDtcbiDimIUgZmlyc3QobjogbnVtYmVyKTogVE1vZGVsW107XG4g4piFIGZvbGRsPFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLk1lbW9JdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBtZW1vPzogVFJlc3VsdCwgY29udGV4dD86IGFueSk6IFRSZXN1bHQ7XG4g4piFIGZvbGRyPFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLk1lbW9JdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBtZW1vPzogVFJlc3VsdCwgY29udGV4dD86IGFueSk6IFRSZXN1bHQ7XG4g4piFIGZvckVhY2goaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgdm9pZD4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgZ3JvdXBCeShpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBhbnk+LCBjb250ZXh0PzogYW55KTogXy5EaWN0aW9uYXJ5PFRNb2RlbFtdPjtcbiDimIUgZ3JvdXBCeShpdGVyYXRvcjogc3RyaW5nLCBjb250ZXh0PzogYW55KTogXy5EaWN0aW9uYXJ5PFRNb2RlbFtdPjtcbiDimIUgaGVhZCgpOiBUTW9kZWw7XG4g4piFIGhlYWQobjogbnVtYmVyKTogVE1vZGVsW107XG4g4piFIGluY2x1ZGUodmFsdWU6IFRNb2RlbCk6IGJvb2xlYW47XG4g4piFIGluY2x1ZGVzKHZhbHVlOiBUTW9kZWwpOiBib29sZWFuO1xuIOKYhSBpbmRleEJ5KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGFueT4sIGNvbnRleHQ/OiBhbnkpOiBfLkRpY3Rpb25hcnk8VE1vZGVsPjtcbiDimIUgaW5kZXhCeShpdGVyYXRvcjogc3RyaW5nLCBjb250ZXh0PzogYW55KTogXy5EaWN0aW9uYXJ5PFRNb2RlbD47XG4g4piFIGluZGV4T2YodmFsdWU6IFRNb2RlbCwgaXNTb3J0ZWQ/OiBib29sZWFuKTogbnVtYmVyO1xuIOKYhSBpbml0aWFsKCk6IFRNb2RlbDtcbiDimIUgaW5pdGlhbChuOiBudW1iZXIpOiBUTW9kZWxbXTtcbiDimIUgaW5qZWN0PFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLk1lbW9JdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBtZW1vPzogVFJlc3VsdCwgY29udGV4dD86IGFueSk6IFRSZXN1bHQ7XG4g4piFIGludm9rZShtZXRob2ROYW1lOiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKTogYW55O1xuIOKYhSBpc0VtcHR5KCk6IGJvb2xlYW47XG4g4piFIGxhc3QoKTogVE1vZGVsO1xuIOKYhSBsYXN0KG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBsYXN0SW5kZXhPZih2YWx1ZTogVE1vZGVsLCBmcm9tPzogbnVtYmVyKTogbnVtYmVyO1xuIOKYhSBtYXA8VFJlc3VsdD4oaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgVFJlc3VsdD4sIGNvbnRleHQ/OiBhbnkpOiBUUmVzdWx0W107XG4g4piFIG1heChpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYW55PiwgY29udGV4dD86IGFueSk6IFRNb2RlbDtcbiDimIUgbWluKGl0ZXJhdG9yPzogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBhbnk+LCBjb250ZXh0PzogYW55KTogVE1vZGVsO1xuIOKYhSBwYXJ0aXRpb24oaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4pOiBUTW9kZWxbXVtdO1xuIOKYhSByZWR1Y2U8VFJlc3VsdD4oaXRlcmF0b3I6IF8uTWVtb0l0ZXJhdG9yPFRNb2RlbCwgVFJlc3VsdD4sIG1lbW8/OiBUUmVzdWx0LCBjb250ZXh0PzogYW55KTogVFJlc3VsdDtcbiDimIUgcmVkdWNlUmlnaHQ8VFJlc3VsdD4oaXRlcmF0b3I6IF8uTWVtb0l0ZXJhdG9yPFRNb2RlbCwgVFJlc3VsdD4sIG1lbW8/OiBUUmVzdWx0LCBjb250ZXh0PzogYW55KTogVFJlc3VsdDtcbiDimIUgcmVqZWN0KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIHJlc3Qobj86IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBzYW1wbGUoKTogVE1vZGVsO1xuIOKYhSBzYW1wbGUobjogbnVtYmVyKTogVE1vZGVsW107XG4g4piFIHNlbGVjdChpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IFRNb2RlbFtdO1xuIOKYhSBzaHVmZmxlKCk6IFRNb2RlbFtdO1xuIOKYhSBzaXplKCk6IG51bWJlcjtcbiDimIUgc29tZShpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBib29sZWFuO1xuIOKYhSBzb3J0Qnk8VFNvcnQ+KGl0ZXJhdG9yPzogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBUU29ydD4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgc29ydEJ5KGl0ZXJhdG9yOiBzdHJpbmcsIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgdGFpbChuPzogbnVtYmVyKTogVE1vZGVsW107XG4g4piFIHRha2UoKTogVE1vZGVsO1xuIOKYhSB0YWtlKG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSB0b0FycmF5KCk6IFRNb2RlbFtdO1xuXG7imIUgbW9kZWwg44Gu5omA5bGe44GrIGNvbGxlY3Rpb24g44GuIGlkIOOCkuabuOOBjei+vOOCgOOBi+OCglxuICAg44Gd44Gu5aC05ZCIIF9wcmVwYXJlTW9kZWwsIF9yZW1vdmVSZWZlcmVuY2Ug44Gr44KC5a++5b+c44GM5b+F6KaBXG5cbi0gRXZlbnQ6XG4gICAgJ0BhZGQnOiBbVEl0ZW0sIENvbGxlY3Rpb24gPCBUSXRlbSA+LCBDb2xsZWN0aW9uU2V0T3B0aW9uc107XG4gICAgJ0ByZW1vdmUnOiBbVEl0ZW0sIENvbGxlY3Rpb24gPCBUSXRlbSA+LCBDb2xsZWN0aW9uU2V0T3B0aW9uc107XG4gICAgJ0B1cGRhdGUnOiBbQ29sbGVjdGlvbiA8IFRJdGVtID4sIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zXTtcbiAgICAnQHJlc2V0JzogW0NvbGxlY3Rpb24gPCBUSXRlbSA+LCBDb2xsZWN0aW9uQWRkT3B0aW9uc107XG4gICAgJ0Bzb3J0JzogW0NvbGxlY3Rpb24gPCBUSXRlbSA+LCBDb2xsZWN0aW9uU2V0T3B0aW9uc107XG4gICAgJ0BzeW5jJzogW0NvbGxlY3Rpb24gPCBUSXRlbSA+LCBQbGFpbk9iamVjdCwgQ29sbGVjdGlvbkRhdGFTeW5jT3B0aW9uc107XG4gICAgJ0BkZXN0cm95JzogW1RJdGVtLCBDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgTW9kZWxEZXN0cm95T3B0aW9uc107XG4gICAgJ0BlcnJvcic6IFtDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgRXJyb3IsIENvbGxlY3Rpb25EYXRhU3luY09wdGlvbnNdO1xuICovXG4iXSwibmFtZXMiOlsiZ2V0TGFuZ3VhZ2UiLCJPYnNlcnZhYmxlQXJyYXkiLCJjYyIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInVuaXF1ZSIsImNvbXB1dGVEYXRlIiwiaXNGdW5jdGlvbiIsInNvcnQiLCJzaHVmZmxlIiwiaXNTdHJpbmciLCJFdmVudFNvdXJjZSIsImx1aWQiLCJpc01vZGVsIiwiZGVmYXVsdFN5bmMiLCJub29wIiwiaXNOaWwiLCJpc0FycmF5IiwibW9kZWwiLCJFdmVudEJyb2tlciIsInJlc3VsdCIsIkZBSUxFRCIsIkV2ZW50UHVibGlzaGVyIiwic2V0TWl4Q2xhc3NBdHRyaWJ1dGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7O0lBTUE7Ozs7O1FBVUk7UUFBQTtZQUNJLGdHQUFpRCxDQUFBO1lBQ2pELHNEQUFnQyxZQUFBLGtCQUFrQixnQkFBdUIsc0JBQTZCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyw4QkFBQSxDQUFBO1lBQzNILDJEQUFnQyxZQUFBLGtCQUFrQixnQkFBdUIsc0JBQTZCLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxtQ0FBQSxDQUFBO1NBQ25JLElBQUE7SUFDTCxDQUFDOztJQ1JEO0lBQ0EsSUFBSSxTQUFTLEdBQXFCO1FBQzlCLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDQSxnQkFBVyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3BGLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7O2FBVWdCLHVCQUF1QixDQUFDLFdBQThCO1FBQ2xFLElBQUksSUFBSSxJQUFJLFdBQVcsRUFBRTtZQUNyQixPQUFPLFNBQVMsQ0FBQztTQUNwQjthQUFNO1lBQ0gsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDO1lBQzlCLFNBQVMsR0FBRyxXQUFXLENBQUM7WUFDeEIsT0FBTyxXQUFXLENBQUM7U0FDdEI7SUFDTCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O2FBV2dCLG1CQUFtQixDQUErQixJQUFPLEVBQUUsS0FBZ0I7UUFDdkYsT0FBTyxDQUFDLEdBQU0sRUFBRSxHQUFNOztZQUVsQixNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBYyxDQUFDLElBQUksR0FBRyxDQUFDLElBQWMsQ0FBQyxHQUFHLEVBQUUs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
