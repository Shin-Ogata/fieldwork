/*!
 * @cdp/collection 0.9.21
 *   generic collection scheme
 */

import { getLanguage } from '@cdp/i18n';
import { unique, computeDate, isFunction, sort, shuffle, setMixClassAttribute, luid, isString, at, noop, isNullish, isArray } from '@cdp/core-utils';
import { checkCanceled } from '@cdp/promise';
import { ObservableArray } from '@cdp/observable';
import { makeResult, RESULT_CODE, FAILED } from '@cdp/result';
import { EventSource, EventBroker, EventPublisher } from '@cdp/events';
import { defaultSync } from '@cdp/data-sync';
import { isModel } from '@cdp/model';

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
    return new Intl.Collator(getLanguage(), { sensitivity: 'base', numeric: true });
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
    if (target instanceof ObservableArray) {
        await checkCanceled(token);
        return {
            editor: target,
            promise: makePromise(target),
        };
    }
    else if (Array.isArray(target)) {
        const editor = ObservableArray.from(target);
        await checkCanceled(token);
        return {
            editor,
            promise: makePromise(editor, target),
        };
    }
    else {
        throw makeResult(RESULT_CODE.NOT_SUPPORTED, 'target is not Array or ObservableArray.');
    }
}
/** @internal valid orders index */
function validOrders(length, orders) {
    if (null == orders || orders.length <= 0) {
        return false;
    }
    for (const index of orders) {
        if (index < 0 || length <= index || trunc$1(index) !== index) {
            throw makeResult(RESULT_CODE.NOT_SUPPORTED, `orders[] index is invalid. index: ${index}`);
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
        throw makeResult(RESULT_CODE.NOT_SUPPORTED, `insertArray(), index is invalid. index: ${index}`);
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
        throw makeResult(RESULT_CODE.NOT_SUPPORTED, `reorderArray(), index is invalid. index: ${index}`);
    }
    else if (!validOrders(target.length, orders)) {
        return [];
    }
    const { editor, promise } = await getEditContext(target, token);
    // 作業配列で編集
    let work = Array.from(editor);
    {
        const reorders = [];
        for (const order of unique(orders)) {
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
    for (const order of unique(orders)) {
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
        const date = computeDate(new Date(), -1 * value, unit);
        return date <= item[prop];
    };
}
/** @internal DynamicPackageOperator.DATE_LESS_NOT_EQUAL */
function dateLessNotEqual(prop, value, unit) {
    return (item) => {
        const date = computeDate(new Date(), -1 * value, unit);
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
    let result = isFunction(filter) ? items.filter(filter) : items.slice();
    for (const comparator of comparators) {
        if (isFunction(comparator)) {
            result = sort(result, comparator);
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
        shuffle(items, true);
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
        await checkCanceled(token);
        if (index < 0 || targets.length <= index || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        }
        else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${limit}`);
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
        if (isFunction(progress)) {
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
        await checkCanceled(token);
        if (index < 0 || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        }
        else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${limit}`);
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
        } // eslint-disable-line @stylistic/brace-style
        else {
            results.push(...resp.items);
            const retval = {
                total: resp.total,
                items: resp.items,
                options: nextOpts,
            };
            // 進捗通知
            if (isFunction(progress)) {
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
    return ctor?.idAttribute ?? 'id';
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
    if (!isString(id)) {
        return undefined;
    }
    return { id: model[idAttribute], prevId: isFunction(model.previous) ? model.previous(idAttribute) : undefined };
};
/** @internal */
const modelConstructor = (self) => {
    return self.constructor.model;
};
/** @internal */
const isCollectionModel = (x, self) => {
    const ctor = modelConstructor(self);
    return isFunction(ctor) ? x instanceof ctor : false;
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
    else if (!isFunction(filter)) {
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
class Collection extends EventSource {
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
            cid: luid('collection:', 8),
            queryOptions,
            queryInfo: {},
            modelOptions,
            byId: new Map(),
            store: [],
        };
        this.initQueryInfo();
        /* model event handler */
        this[_onModelEvent] = (event, model, collection, options) => {
            if (isString(event) && event.startsWith('@') && model) {
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
        if (isString(seed) && byId.has(seed)) {
            return byId.get(seed);
        }
        const id = getModelId(isModel(seed) ? seed.toJSON() : seed, modelConstructor(this));
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
        return this.models.map(m => isModel(m) ? m.toJSON() : m);
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
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_COMPARATORS, 'Cannot sort a set without a comparator.');
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
        return at(this.models, index);
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
        const items = await defaultSync().sync('read', this, options);
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
        const opts = Object.assign({ progress: noop, parse: this._defaultParse }, this._defaultQueryOptions, options);
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
        if (isNullish(seeds)) {
            return;
        }
        const opts = Object.assign({ parse: this._defaultParse }, _setOptions, options);
        if (opts.parse && !isCollectionModel(seeds, this)) {
            seeds = this.parse(seeds, options) ?? [];
        }
        const singular = !isArray(seeds);
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
                    let attrs = isModel(item) ? item.toJSON() : item;
                    if (parse && isFunction(existing.parse)) {
                        attrs = existing.parse(attrs, opts);
                    }
                    if (isFunction(existing.setAttributes)) {
                        existing.setAttributes(attrs, opts);
                    }
                    else {
                        Object.assign(existing, attrs);
                    }
                    toMerge.push(existing);
                    if (sortable && !sort) {
                        sort = isFunction(existing.hasChanged) ? existing.hasChanged() : true;
                    }
                }
                if (!modelSet.has(existing)) {
                    modelSet.add(existing);
                    set.push(existing);
                }
                items[i] = existing;
            } // eslint-disable-line @stylistic/brace-style
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
            for (const [i, model] of toAdd.entries()) {
                if (null != at) {
                    opts.index = at + i;
                }
                if (isModel(model) || (model instanceof EventBroker)) {
                    model.trigger('@add', model, this, opts);
                }
                else {
                    this.trigger('@add', model, this, opts);
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
        const singular = !isArray(seeds);
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
        const model = isModel(seed) ? seed : undefined;
        if (!wait || !model) {
            this.add(seed, options);
        }
        if (model) {
            void (async () => {
                try {
                    await model.save(undefined, options);
                    if (wait) {
                        this.add(seed, options);
                    }
                }
                catch (e) {
                    this.trigger('@error', model, this, e, options);
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
            if (isFunction(model.validate)) {
                const result = model.validate();
                if (FAILED(result.code)) {
                    this.trigger('@invalid', attrs, this, result, opts);
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
            const model = this.get(mdl);
            if (!model) {
                continue;
            }
            const { store } = this[_properties];
            const index = store.indexOf(model);
            store.splice(index, 1);
            // Remove references before triggering 'remove' event to prevent an infinite loop.
            this[_removeReference](model, true);
            if (!opts.silent) {
                opts.index = index;
                if (isModel(model) || (model instanceof EventBroker)) {
                    model.trigger('@remove', model, this, opts);
                }
                else {
                    this.trigger('@remove', model, this, opts);
                }
            }
            removed.push(model);
            this[_removeReference](model, false);
        }
        return removed;
    }
    /** @internal Internal method to create a model's ties to a collection. */
    [_addReference](model) {
        const { byId } = this[_properties];
        const { _cid, id } = model;
        if (null != _cid) {
            byId.set(_cid, model);
        }
        if (null != id) {
            byId.set(id, model);
        }
        if (isModel(model) || (model instanceof EventPublisher)) {
            this.listenTo(model, '*', this[_onModelEvent]);
        }
    }
    /** @internal Internal method to sever a model's ties to a collection. */
    [_removeReference](model, partial = false) {
        const { byId } = this[_properties];
        const { _cid, id } = model;
        if (null != _cid) {
            byId.delete(_cid);
        }
        if (null != id) {
            byId.delete(id);
        }
        if (!partial && (isModel(model) || (model instanceof EventPublisher))) {
            this.stopListening(model, '*', this[_onModelEvent]);
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
setMixClassAttribute(Collection, 'instanceOf', null);

/** @internal */
function prepare(collection) {
    if (collection.filtered) {
        throw makeResult(RESULT_CODE.ERROR_MVC_EDIT_PERMISSION_DENIED, 'collection is applied after-filter.');
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

export { ArrayCursor, Collection, DynamicCondition, appendArray, appendCollection, clearArray, clearCollection, conditionalFix, convertSortKeys, defaultCollatorProvider, getBooleanComparator, getDateComparator, getGenericComparator, getNumberComparator, getStringComparator, insertArray, insertCollection, queryItems, removeArray, removeCollection, reorderArray, reorderCollection, searchItems, toComparator };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJ1dGlscy9jb21wYXJhdG9yLnRzIiwidXRpbHMvYXJyYXktY3Vyc29yLnRzIiwidXRpbHMvYXJyYXktZWRpdG9yLnRzIiwicXVlcnkvZHluYW1pYy1maWx0ZXJzLnRzIiwicXVlcnkvZHluYW1pYy1jb25kaXRpb24udHMiLCJxdWVyeS9xdWVyeS50cyIsImJhc2UudHMiLCJjb2xsZWN0aW9uLWVkaXRvci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIENPTExFQ1RJT04gPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19DT0xMRUNUSU9OX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUyAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDEsICdpbnZhbGlkIGFjY2Vzcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMiwgJ2ludmFsaWQgY29tcGFyYXRvcnMuJyksXG4gICAgICAgIEVSUk9SX01WQ19FRElUX1BFUk1JU1NJT05fREVOSUVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDMsICdlZGl0aW5nIHBlcm1pc3Npb24gZGVuaWVkLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgQWNjZXNzaWJsZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBnZXRMYW5ndWFnZSB9IGZyb20gJ0BjZHAvaTE4bic7XG5pbXBvcnQgdHlwZSB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyB7QGxpbmsgQ29sbGF0b3JQcm92aWRlcn0g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0Q29sbGF0b3JQcm92aWRlcihuZXdQcm92aWRlcj86IENvbGxhdG9yUHJvdmlkZXIpOiBDb2xsYXRvclByb3ZpZGVyIHtcbiAgICBpZiAobnVsbCA9PSBuZXdQcm92aWRlcikge1xuICAgICAgICByZXR1cm4gX2NvbGxhdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFByb3ZpZGVyID0gX2NvbGxhdG9yO1xuICAgICAgICBfY29sbGF0b3IgPSBuZXdQcm92aWRlcjtcbiAgICAgICAgcmV0dXJuIG9sZFByb3ZpZGVyO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gR2V0IHN0cmluZyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaWh+Wtl+WIl+avlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgLy8gdW5kZWZpbmVkIOOBryAnJyDjgajlkIznrYnjgavmibHjgYZcbiAgICAgICAgY29uc3QgbGhzUHJvcCA9IChudWxsICE9IGxoc1twcm9wXSkgPyBsaHNbcHJvcF0gYXMgc3RyaW5nIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcF0pID8gcmhzW3Byb3BdIGFzIHN0cmluZyA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wXTtcbiAgICAgICAgY29uc3QgcmhzRGF0ZSA9IHJoc1twcm9wXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IEFjY2Vzc2libGU8VD4sIHJoczogQWNjZXNzaWJsZTxUPik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcF0gPT09IHJoc1twcm9wXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBsaHNbcHJvcF0pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3BdKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcF0gPCByaHNbcHJvcF0gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSB7QGxpbmsgU29ydEtleX0uXG4gKiBAamEge0BsaW5rIFNvcnRLZXl9IOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdHlwZSwgb3JkZXIgfSA9IHNvcnRLZXk7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIHtAbGluayBTb3J0S2V5fSBhcnJheS5cbiAqIEBqYSB7QGxpbmsgU29ydEtleX0g6YWN5YiX44KSIGNvbXBhcmF0b3Ig6YWN5YiX44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U29ydEtleXM8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oc29ydEtleXM6IFNvcnRLZXk8Sz5bXSk6IFNvcnRDYWxsYmFjazxUPltdIHtcbiAgICBjb25zdCBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFQ+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNvcnRLZXkgb2Ygc29ydEtleXMpIHtcbiAgICAgICAgY29tcGFyYXRvcnMucHVzaCh0b0NvbXBhcmF0b3Ioc29ydEtleSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyYXRvcnM7XG59XG4iLCIvKipcbiAqIEBlbiBDdXJzb3IgcG9zaXRpb24gY29uc3RhbnQuXG4gKiBAamEg44Kr44O844K944Or5L2N572u5a6a5pWwXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIEN1cnNvclBvcyB7XG4gICAgT1VUX09GX1JBTkdFICAgID0gLTEsXG4gICAgQ1VSUkVOVCAgICAgICAgID0gLTIsXG59XG5cbi8qKlxuICogQGVuIFNlZWsgZXhwcmVzc2lvbiBmdW5jdGlvbiB0eXBlLlxuICogQGphIOOCt+ODvOOCr+W8j+mWouaVsOWumue+qVxuICovXG5leHBvcnQgdHlwZSBTZWVrRXhwPFQ+ID0gKHZhbHVlOiBULCBpbmRleD86IG51bWJlciwgb2JqPzogVFtdKSA9PiBib29sZWFuO1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgcHJvdmlkZXMgY3Vyc29yIGludGVyZmFjZSBmb3IgQXJyYXkuIDxicj5cbiAqICAgICBJdCBpcyBkaWZmZXJlbnQgZnJvbSBJdGVyYXRvciBpbnRlcmZhY2Ugb2YgZXMyMDE1LCBhbmQgdGhhdCBwcm92aWRlcyBpbnRlcmZhY2Ugd2hpY2ggaXMgc2ltaWxhciB0byBEQiByZWNvcmRzZXQncyBvbmUuXG4gKiBAamEgQXJyYXkg55So44Kr44O844K944OrIEkvRiDjgpLmj5DkvpvjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIGVzMjAxNSDjga4gSXRlcmF0b3IgSS9GIOOBqOOBr+eVsOOBquOCiuOAgURCIHJlY29yZHNldCDjgqrjg5bjgrjjgqfjgq/jg4jjg6njgqTjgq/jgarotbDmn7sgSS9GIOOCkuaPkOS+m+OBmeOCi1xuICovXG5leHBvcnQgY2xhc3MgQXJyYXlDdXJzb3I8VCA9IGFueT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvKiogQGludGVybmFsIOWvvuixoeOBrumFjeWIlyAgKi9cbiAgICBwcml2YXRlIF9hcnJheTogVFtdO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5YWI6aCt44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgICovXG4gICAgcHJpdmF0ZSBfYm9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5pyr5bC+44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9lb2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDnj77lnKjjga4gaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiAwXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IDBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhcnJheTogVFtdLCBpbml0aWFsSW5kZXggPSAwKSB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB0YXJnZXQgYXJyYXkuXG4gICAgICogQGphIOWvvuixoeOBruWGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXkuIGRlZmF1bHQ6IGVtcHR5IGFycmF5LlxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aLiAgIGRlZmF1bHQ6IOepuumFjeWIl1xuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqL1xuICAgIHB1YmxpYyByZXNldChhcnJheTogVFtdID0gW10sIGluaXRpYWxJbmRleDogbnVtYmVyID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRSk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gY3VycmVudCBlbGVtZW50LlxuICAgICAqIEBqYSDnj77lnKjjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgY3VycmVudCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5W3RoaXMuX2luZGV4XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOaMh+OBl+ekuuOBl+OBpuOBhOOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGFyZ2V0IGFycmF5IGxlbmd0aC5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gu6KaB57Sg5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBCT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7lhYjpoK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNCT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ib2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEVPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruacq+WwvuOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0VPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHJhdyBhcnJheSBpbnN0YW5jZS5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGFycmF5KCk6IFRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjdXJzb3Igb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gZmlyc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVGaXJzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGxhc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVMYXN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbmV4dCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLmrKHjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZU5leHQoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fYm9mKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gcHJldmlvdXMgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5YmN44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVQcmV2aW91cygpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9lb2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLmxlbmd0aCAtIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleC0tO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWVrIGJ5IHBhc3NlZCBjcml0ZXJpYS4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgb3BlcmF0aW9uIGZhaWxlZCwgdGhlIGN1cnNvciBwb3NpdGlvbiBzZXQgdG8gRU9GLlxuICAgICAqIEBqYSDmjIflrprmnaHku7bjgafjgrfjg7zjgq8gPGJyPlxuICAgICAqICAgICDjgrfjg7zjgq/jgavlpLHmlZfjgZfjgZ/loLTlkIjjga8gRU9GIOeKtuaFi+OBq+OBquOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGNyaXRlcmlhXG4gICAgICogIC0gYGVuYCBpbmRleCBvciBzZWVrIGV4cHJlc3Npb25cbiAgICAgKiAgLSBgamFgIGluZGV4IC8g5p2h5Lu25byP44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNlZWsoY3JpdGVyaWE6IG51bWJlciB8IFNlZWtFeHA8VD4pOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICgnbnVtYmVyJyA9PT0gdHlwZW9mIGNyaXRlcmlhKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGNyaXRlcmlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5maW5kSW5kZXgoY3JpdGVyaWEpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICog44Kr44O844K944Or44GM5pyJ5Yq544Gq56+E5Zuy44KS56S644GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHRydWU6IOacieWKuSAvIGZhbHNlOiDnhKHlirlcbiAgICAgKi9cbiAgICBwcml2YXRlIHZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKDAgPD0gdGhpcy5faW5kZXggJiYgdGhpcy5faW5kZXggPCB0aGlzLl9hcnJheS5sZW5ndGgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuaXF1ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgQ2FuY2VsVG9rZW4sXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IHR5cGUgQXJyYXlDaGFuZ2VSZWNvcmQsIE9ic2VydmFibGVBcnJheSB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gdHJ1bmNcbn0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIHdhaXQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gKi9cbmZ1bmN0aW9uIG1ha2VQcm9taXNlPFQ+KGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+LCByZW1hcD86IFRbXSk6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgZWRpdG9yLm9mZihjYWxsYmFjayk7XG4gICAgICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgICAgICByZW1hcC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIHJlbWFwLnB1c2goLi4uZWRpdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVjb3Jkcyk7XG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5vbihjYWxsYmFjayk7XG4gICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCB0byB7QGxpbmsgT2JzZXJ2YWJsZUFycmF5fSBpZiBuZWVkZWQuICovXG5hc3luYyBmdW5jdGlvbiBnZXRFZGl0Q29udGV4dDxUPihcbiAgICB0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSxcbiAgICB0b2tlbj86IENhbmNlbFRva2VuXG4pOiBQcm9taXNlPHsgZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD47IHByb21pc2U6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT47IH0+IHwgbmV2ZXIge1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yOiB0YXJnZXQsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZSh0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvciA9IE9ic2VydmFibGVBcnJheS5mcm9tKHRhcmdldCk7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcixcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKGVkaXRvciwgdGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsICd0YXJnZXQgaXMgbm90IEFycmF5IG9yIE9ic2VydmFibGVBcnJheS4nKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgdmFsaWQgb3JkZXJzIGluZGV4ICovXG5mdW5jdGlvbiB2YWxpZE9yZGVycyhsZW5ndGg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSk6IGJvb2xlYW4gfCBuZXZlciB7XG4gICAgaWYgKG51bGwgPT0gb3JkZXJzIHx8IG9yZGVycy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBpbmRleCBvZiBvcmRlcnMpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBsZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgb3JkZXJzW10gaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXIgYWxsIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+OBruWFqOWJiumZpFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnB1c2goLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBhcnJheS5cbiAqIEBqYSDmjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zZXJ0QXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZShpbmRleCwgMCwgLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIGFycmF5IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGByZW9yZGVyQXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbn0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZUFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKCF2YWxpZE9yZGVycyh0YXJnZXQubGVuZ3RoLCBvcmRlcnMpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDpmY3poIbjgr3jg7zjg4hcbiAgICBvcmRlcnMuc29ydCgobGhzLCByaHMpID0+IHtcbiAgICAgICAgcmV0dXJuIChsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICBlZGl0b3Iuc3BsaWNlKG9yZGVyLCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbiIsImltcG9ydCB7IHR5cGUgS2V5cywgY29tcHV0ZURhdGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBGaWx0ZXJDYWxsYmFjaywgRHluYW1pY0NvbWJpbmF0aW9uIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQUxMPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBzdHJpbmcgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQ29tcGFyYWJsZTxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZVN0cmluZzxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8c3RyaW5nLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCB1bmRlZmluZWQ7XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdICE9PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVIgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPiB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1MgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPCB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVJfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAoaXRlbVtwcm9wXSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KSA+PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAoaXRlbVtwcm9wXSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KSA8PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmNsdWRlcyh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9MSUtFICovXG5leHBvcnQgZnVuY3Rpb24gbm90TGlrZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlU3RyaW5nPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gIVN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfTk9UX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NOb3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gIShkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSkpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5SQU5HRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIG1pbjogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPiwgbWF4OiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiBjb21iaW5hdGlvbihEeW5hbWljQ29tYmluYXRpb24uQU5ELCBncmVhdGVyRXF1YWwocHJvcCwgbWluKSwgbGVzc0VxdWFsKHByb3AsIG1heCkpO1xufVxuXG4vKiogQGludGVybmFsIOODleOCo+ODq+OCv+OBruWQiOaIkCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KHR5cGU6IER5bmFtaWNDb21iaW5hdGlvbiwgbGhzOiBGaWx0ZXJDYWxsYmFjazxUPiwgcmhzOiBGaWx0ZXJDYWxsYmFjazxUPiB8IHVuZGVmaW5lZCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gIXJocyA/IGxocyA6IChpdGVtOiBUKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uQU5EOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uT1I6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSB8fCByaHMoaXRlbSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBjb21iaW5hdGlvbjogJHt0eXBlfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIC8vIGZhaWwgc2FmZVxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsImltcG9ydCB0eXBlIHsgS2V5cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgU29ydENhbGxiYWNrLFxuICAgIHR5cGUgRmlsdGVyQ2FsbGJhY2ssXG4gICAgdHlwZSBTb3J0S2V5LFxuICAgIHR5cGUgRHluYW1pY0NvbmRpdGlvblNlZWQsXG4gICAgdHlwZSBEeW5hbWljT3BlcmF0b3JDb250ZXh0LFxuICAgIHR5cGUgRHluYW1pY0xpbWl0Q29uZGl0aW9uLFxuICAgIER5bmFtaWNPcGVyYXRvcixcbiAgICBEeW5hbWljQ29tYmluYXRpb24sXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFZhbHVlVHlwZUFMTCxcbiAgICB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGUsXG4gICAgdHlwZSBWYWx1ZVR5cGVTdHJpbmcsXG4gICAgZXF1YWwsXG4gICAgbm90RXF1YWwsXG4gICAgZ3JlYXRlcixcbiAgICBsZXNzLFxuICAgIGdyZWF0ZXJFcXVhbCxcbiAgICBsZXNzRXF1YWwsXG4gICAgbGlrZSxcbiAgICBub3RMaWtlLFxuICAgIGRhdGVMZXNzRXF1YWwsXG4gICAgZGF0ZUxlc3NOb3RFcXVhbCxcbiAgICByYW5nZSxcbiAgICBjb21iaW5hdGlvbixcbn0gZnJvbSAnLi9keW5hbWljLWZpbHRlcnMnO1xuXG4vKipcbiAqIEBlbiBEeW5hbWljIHF1ZXJ5IGNvbmRpdGlvbiBtYW5hZ2VyIGNsYXNzLlxuICogQGphIOODgOOCpOODiuODn+ODg+OCr+OCr+OCqOODqueKtuaFi+euoeeQhuOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY0NvbmRpdGlvbjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+IGltcGxlbWVudHMgRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+IHtcblxuICAgIHByaXZhdGUgX29wZXJhdG9yczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9jb21iaW5hdGlvbjogRHluYW1pY0NvbWJpbmF0aW9uO1xuICAgIHByaXZhdGUgX3N1bUtleXM6IEtleXM8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfbGltaXQ/OiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+O1xuICAgIHByaXZhdGUgX3JhbmRvbTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9zb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAge0BsaW5rIER5bmFtaWNDb25kaXRpb25TZWVkfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIER5bmFtaWNDb25kaXRpb25TZWVkfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkczogRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+ID0geyBvcGVyYXRvcnM6IFtdIH0pIHtcbiAgICAgICAgY29uc3QgeyBvcGVyYXRvcnMsIGNvbWJpbmF0aW9uLCBzdW1LZXlzLCBsaW1pdCwgcmFuZG9tLCBzb3J0S2V5cyB9ID0gc2VlZHM7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyAgICAgPSBvcGVyYXRvcnM7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uICAgPSBjb21iaW5hdGlvbiA/PyBEeW5hbWljQ29tYmluYXRpb24uQU5EO1xuICAgICAgICB0aGlzLl9zdW1LZXlzICAgICAgID0gc3VtS2V5cyA/PyBbXTtcbiAgICAgICAgdGhpcy5fbGltaXQgICAgICAgICA9IGxpbWl0O1xuICAgICAgICB0aGlzLl9yYW5kb20gICAgICAgID0gISFyYW5kb207XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzICAgICAgPSBzb3J0S2V5cyA/PyBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZFxuXG4gICAgZ2V0IG9wZXJhdG9ycygpOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG5cbiAgICBzZXQgb3BlcmF0b3JzKHZhbHVlczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSkge1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IHN1bUtleXMoKTogKEtleXM8VEl0ZW0+KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1bUtleXM7XG4gICAgfVxuXG4gICAgc2V0IHN1bUtleXModmFsdWVzOiAoS2V5czxUSXRlbT4pW10pIHtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgY29tYmluYXRpb24oKTogRHluYW1pY0NvbWJpbmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbWJpbmF0aW9uO1xuICAgIH1cblxuICAgIHNldCBjb21iaW5hdGlvbih2YWx1ZTogRHluYW1pY0NvbWJpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGxpbWl0KCk6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGltaXQ7XG4gICAgfVxuXG4gICAgc2V0IGxpbWl0KHZhbHVlOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2xpbWl0ID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHJhbmRvbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbTtcbiAgICB9XG5cbiAgICBzZXQgcmFuZG9tKHZhbHVlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3JhbmRvbSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBzb3J0S2V5cygpOiBTb3J0S2V5PFRLZXk+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc29ydEtleXM7XG4gICAgfVxuXG4gICAgc2V0IHNvcnRLZXlzKHZhbHVlczogU29ydEtleTxUS2V5PltdKSB7XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzID0gdmFsdWVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBhY2Nlc3NvcjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29tcGFyYXRvciBmdW5jdGlvbnMuXG4gICAgICogQGphIOavlOi8g+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBjb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gY29udmVydFNvcnRLZXlzKHRoaXMuX3NvcnRLZXlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHN5bnRoZXNpcyBmaWx0ZXIgZnVuY3Rpb24uXG4gICAgICogQGphIOWQiOaIkOa4iOOBv+ODleOCo+ODq+OCv+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBmaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHtcbiAgICAgICAgbGV0IGZsdHI6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbmQgb2YgdGhpcy5fb3BlcmF0b3JzKSB7XG4gICAgICAgICAgICBjb25zdCB7IG9wZXJhdG9yLCBwcm9wLCB2YWx1ZSB9ID0gY29uZDtcbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuR1JFQVRFUjpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVyPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3M8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3NFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWtlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZVN0cmluZzxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVMZXNzRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NOb3RFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+LCBjb25kLnJhbmdlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRvcjogJHtvcGVyYXRvcn1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciA/PyAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgc29ydCxcbiAgICBzaHVmZmxlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY2hlY2tDYW5jZWxlZCBhcyBjYyB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgdHlwZSBTb3J0S2V5LFxuICAgIHR5cGUgU29ydENhbGxiYWNrLFxuICAgIHR5cGUgRmlsdGVyQ2FsbGJhY2ssXG4gICAgdHlwZSBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICB0eXBlIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgdHlwZSBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIHR5cGUgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBEeW5hbWljTGltaXQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMvY29tcGFyYXRvcic7XG5pbXBvcnQgeyBEeW5hbWljQ29uZGl0aW9uIH0gZnJvbSAnLi9keW5hbWljLWNvbmRpdGlvbic7XG5cbmNvbnN0IHtcbiAgICAvKiogQGludGVybmFsICovIHRydW5jXG59ID0gTWF0aDtcblxuLyoqIEBpbnRlcm5hbCDkvb/nlKjjgZnjgovjg5fjg63jg5Hjg4bjgqPjgYzkv53oqLzjgZXjgozjgZ8gQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMgKi9cbmludGVyZmFjZSBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PiBleHRlbmRzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgc29ydEtleXM6IFNvcnRLZXk8VEtleT5bXTtcbiAgICBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQXBwbHkgYGZpbHRlcmAgYW5kIGBzb3J0IGtleWAgdG8gdGhlIGBpdGVtc2AgZnJvbSB7QGxpbmsgcXVlcnlJdGVtc30oKSByZXN1bHQuXG4gKiBAamEge0BsaW5rIHF1ZXJ5SXRlbXN9KCkg44GX44GfIGBpdGVtc2Ag44Gr5a++44GX44GmIGBmaWx0ZXJgIOOBqCBgc29ydCBrZXlgIOOCkumBqeeUqFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoSXRlbXM8VEl0ZW0+KGl0ZW1zOiBUSXRlbVtdLCBmaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4gfCBudWxsLCAuLi5jb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdKTogVEl0ZW1bXSB7XG4gICAgbGV0IHJlc3VsdCA9IGlzRnVuY3Rpb24oZmlsdGVyKSA/IGl0ZW1zLmZpbHRlcihmaWx0ZXIpIDogaXRlbXMuc2xpY2UoKTtcbiAgICBmb3IgKGNvbnN0IGNvbXBhcmF0b3Igb2YgY29tcGFyYXRvcnMpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29tcGFyYXRvcikpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHNvcnQocmVzdWx0LCBjb21wYXJhdG9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjb25kaXRpbmFsRml4IOOBq+S9v+eUqOOBmeOCiyBDcml0ZXJpYSBNYXAgKi9cbmNvbnN0IF9saW1pdENyaXRlcmlhID0ge1xuICAgIFtEeW5hbWljTGltaXQuQ09VTlRdOiBudWxsLFxuICAgIFtEeW5hbWljTGltaXQuU1VNXTogeyBjb2VmZjogMSB9LFxuICAgIFtEeW5hbWljTGltaXQuU0VDT05EXTogeyBjb2VmZjogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUlOVVRFXTogeyBjb2VmZjogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5IT1VSXTogeyBjb2VmZjogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkRBWV06IHsgY29lZmY6IDI0ICogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LktCXTogeyBjb2VmZjogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUJdOiB7IGNvZWZmOiAxMDI0ICogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuR0JdOiB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LlRCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0ICogMTAyNCB9LFxufTtcblxuLyoqXG4gKiBAZW4gRml4IHRoZSB0YXJnZXQgaXRlbXMgYnkge0BsaW5rIER5bmFtaWNDb25kaXRpb259LlxuICogQGphIHtAbGluayBEeW5hbWljQ29uZGl0aW9ufSDjgavlvpPjgYTlr77osaHjgpLmlbTlvaJcbiAqXG4gKiBAcGFyYW0gaXRlbXNcbiAqICAtIGBlbmAgdGFyZ2V0IGl0ZW1zIChkZXN0cnVjdGl2ZSlcbiAqICAtIGBqYWAg5a++6LGh44Gu44Ki44Kk44OG44OgICjnoLTlo4rnmoQpXG4gKiBAcGFyYW0gY29uZGl0aW9uXG4gKiAgLSBgZW5gIGNvbmRpdGlvbiBvYmplY3RcbiAqICAtIGBqYWAg5p2h5Lu244Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25kaXRpb25hbEZpeDxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+KFxuICAgIGl0ZW1zOiBUSXRlbVtdLFxuICAgIGNvbmRpdGlvbjogRHluYW1pY0NvbmRpdGlvbjxUSXRlbSwgVEtleT5cbik6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+IHtcbiAgICBjb25zdCB7IHJhbmRvbSwgbGltaXQsIHN1bUtleXMgfSA9IGNvbmRpdGlvbjtcblxuICAgIGlmIChyYW5kb20pIHtcbiAgICAgICAgc2h1ZmZsZShpdGVtcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIGNvbnN0IHsgdW5pdCwgdmFsdWUsIHByb3AgfSA9IGxpbWl0O1xuICAgICAgICBjb25zdCByZXNldDogVEl0ZW1bXSA9IFtdO1xuICAgICAgICBjb25zdCBjcml0ZXJpYSA9IF9saW1pdENyaXRlcmlhW3VuaXRdO1xuICAgICAgICBjb25zdCBsaW1pdENvdW50ID0gdmFsdWU7XG4gICAgICAgIGNvbnN0IGV4Y2VzcyA9ICEhbGltaXQuZXhjZXNzO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGlmICghY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIHtcbiAgICAgICAgICAgICAgICBjb3VudCArPSAoTnVtYmVyKGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIC8gY3JpdGVyaWEuY29lZmYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBhY2Nlc3MgcHJvcGVydHk6ICR7cHJvcH1gKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxpbWl0Q291bnQgPCBjb3VudCkge1xuICAgICAgICAgICAgICAgIGlmIChleGNlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXRlbXMgPSByZXNldDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgIGl0ZW1zLFxuICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbSwgS2V5czxUSXRlbT4+O1xuXG4gICAgaWYgKDAgPCBzdW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHN1bUtleXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgaW4gcmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSArPSBOdW1iZXIoaXRlbVtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIOOBmeOBp+OBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBpuOBhOOCi+WvvuixoeOBq+WvvuOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggcXVlcnkg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21DYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBjYWNoZWQ6IFRJdGVtW10sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBmaWx0ZXIsXG4gICAgICAgIGNvbXBhcmF0b3JzLFxuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgICAgIG5vU2VhcmNoLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgLy8g5a++6LGh44Gq44GXXG4gICAgaWYgKCFjYWNoZWQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogMCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG4gICAgfVxuXG4gICAgLy8g44Kt44Oj44OD44K344Ol44Gr5a++44GX44Gm44OV44Kj44Or44K/44Oq44Oz44KwLCDjgr3jg7zjg4jjgpLlrp/ooYxcbiAgICBjb25zdCB0YXJnZXRzID0gbm9TZWFyY2ggPyBjYWNoZWQuc2xpY2UoKSA6IHNlYXJjaEl0ZW1zKGNhY2hlZCwgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSBiYXNlSW5kZXggPz8gMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAkeyBsaW1pdCB9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHRhcmdldHMuc2xpY2UoaW5kZXgsIChudWxsICE9IGxpbWl0KSA/IGluZGV4ICsgbGltaXQgOiB1bmRlZmluZWQpO1xuXG4gICAgICAgIHJlc3VsdHMucHVzaCguLi5pdGVtcyk7XG5cbiAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgdG90YWw6IHRhcmdldHMubGVuZ3RoLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT4sXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0byAmJiBudWxsICE9IGxpbWl0KSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIOODrOOCueODneODs+OCueOBruOCreODo+ODg+OCt+ODpeOCkuippuihjCAqL1xuZnVuY3Rpb24gdHJ5Q2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICByZXN1bHQ6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+LFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPlxuKTogdm9pZCB7XG4gICAgY29uc3QgeyBub0NhY2hlLCBub1NlYXJjaCB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBjYW5DYWNoZSA9ICFub0NhY2hlICYmICFub1NlYXJjaCAmJiByZXN1bHQudG90YWwgJiYgcmVzdWx0LnRvdGFsID09PSByZXN1bHQuaXRlbXMubGVuZ3RoO1xuICAgIGlmIChjYW5DYWNoZSkge1xuICAgICAgICBxdWVyeUluZm8uY2FjaGUgPSB7IC4uLnJlc3VsdCB9O1xuICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGBwcm92aWRlcmAg6Zai5pWw44KS5L2/55So44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBgcXVlcnlgIOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tUHJvdmlkZXI8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG5cbiAgICBjb25zdCByZWNlaXZlZEFsbCA9IChyZXNwOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPik6IGJvb2xlYW4gPT4ge1xuICAgICAgICBjb25zdCBoYXNDb25kID0gISFyZXNwLm9wdGlvbnM/LmNvbmRpdGlvbjtcbiAgICAgICAgcmV0dXJuIGhhc0NvbmQgfHwgcmVzcC50b3RhbCA9PT0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgfTtcblxuICAgIGxldCBpbmRleDogbnVtYmVyID0gYmFzZUluZGV4ID8/IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHtsaW1pdH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGxldCByZXNwID0gYXdhaXQgcHJvdmlkZXIob3B0cyk7XG4gICAgICAgIGNvbnN0IG5leHRPcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cywgcmVzcC5vcHRpb25zKTtcblxuICAgICAgICBpZiAocmVjZWl2ZWRBbGwocmVzcCkpIHtcbiAgICAgICAgICAgIHRyeUNhY2hlKHF1ZXJ5SW5mbywgcmVzcCwgbmV4dE9wdHMpO1xuXG4gICAgICAgICAgICBjb25zdCB7IG5vU2VhcmNoLCBjb25kaXRpb246IHNlZWQgfSA9IG5leHRPcHRzO1xuICAgICAgICAgICAgaWYgKHNlZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kaXRpb24gPSBuZXcgRHluYW1pY0NvbmRpdGlvbihzZWVkKTtcbiAgICAgICAgICAgICAgICByZXNwID0gY29uZGl0aW9uYWxGaXgoc2VhcmNoSXRlbXMoXG4gICAgICAgICAgICAgICAgICAgIHJlc3AuaXRlbXMsXG4gICAgICAgICAgICAgICAgICAgIGNvbmRpdGlvbi5maWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIC4uLmNvbmRpdGlvbi5jb21wYXJhdG9yc1xuICAgICAgICAgICAgICAgICksIGNvbmRpdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLmNhY2hlLCByZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHF1ZXJ5SW5mby5jYWNoZS5vcHRpb25zO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5RnJvbUNhY2hlKHJlc3AuaXRlbXMsIE9iamVjdC5hc3NpZ24ob3B0cywgeyBub1NlYXJjaCB9KSk7XG4gICAgICAgIH0vLyBlc2xpbnQtZGlzYWJsZS1saW5lIEBzdHlsaXN0aWMvYnJhY2Utc3R5bGVcblxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCguLi5yZXNwLml0ZW1zKTtcblxuICAgICAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgICAgIHRvdGFsOiByZXNwLnRvdGFsLFxuICAgICAgICAgICAgICAgIGl0ZW1zOiByZXNwLml0ZW1zLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG5leHRPcHRzLFxuICAgICAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwLnRvdGFsIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5Q2FjaGUocXVlcnlJbmZvLCByZXR2YWwsIG5leHRPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+WkieaPmyAqL1xuZnVuY3Rpb24gZW5zdXJlT3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4gfCB1bmRlZmluZWRcbik6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBzb3J0S2V5czogW10gfSwgb3B0aW9ucyk7XG4gICAgY29uc3QgeyBub1NlYXJjaCwgc29ydEtleXMgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW5vU2VhcmNoICYmICghb3B0cy5jb21wYXJhdG9ycyB8fCBvcHRzLmNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSkge1xuICAgICAgICBvcHRzLmNvbXBhcmF0b3JzID0gY29udmVydFNvcnRLZXlzKHNvcnRLZXlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0cyBhcyBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT47XG59XG5cbi8qKlxuICogQGVuIExvdyBsZXZlbCBmdW5jdGlvbiBmb3Ige0BsaW5rIENvbGxlY3Rpb259IHF1ZXJ5IGl0ZW1zLlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSBJdGVtIOOCkuOCr+OCqOODquOBmeOCi+S9juODrOODmeODq+mWouaVsFxuICpcbiAqIEBwYXJhbSBxdWVyeUluZm9cbiAqICAtIGBlbmAgcXVlcnkgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg44Kv44Ko44Oq5oOF5aCxXG4gKiBAcGFyYW0gcHJvdmlkZXJcbiAqICAtIGBlbmAgcHJvdmlkZXIgZnVuY3Rpb25cbiAqICAtIGBqYWAg44OX44Ot44OQ44Kk44OA6Zai5pWwXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlJdGVtczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPFRJdGVtW10+IHtcbiAgICBjb25zdCBvcHRzID0gZW5zdXJlT3B0aW9ucyhvcHRpb25zKTtcbiAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSBvcHRzO1xuXG4gICAgLy8gcXVlcnkg44Gr5L2/55So44GX44GfIHNvcnQsIGZpbHRlciDmg4XloLHjgpLjgq3jg6Pjg4Pjgrfjg6VcbiAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mbywgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9KTtcblxuICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgcmV0dXJuIChhd2FpdCBxdWVyeUZyb21DYWNoZShxdWVyeUluZm8uY2FjaGUuaXRlbXMsIG9wdHMpKS5pdGVtcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbVByb3ZpZGVyKHF1ZXJ5SW5mbywgcHJvdmlkZXIsIG9wdHMpKS5pdGVtcztcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBBbnlPYmplY3QsXG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgQ29uc3RydWN0b3IsXG4gICAgdHlwZSBDbGFzcyxcbiAgICB0eXBlIEtleXMsXG4gICAgaXNOdWxsaXNoLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIGx1aWQsXG4gICAgYXQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgU2lsZW5jZWFibGUsXG4gICAgdHlwZSBTdWJzY3JpYmFibGUsXG4gICAgRXZlbnRCcm9rZXIsXG4gICAgRXZlbnRTb3VyY2UsXG4gICAgRXZlbnRQdWJsaXNoZXIsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgdHlwZSBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHR5cGUgU3luY0NvbnRleHQsIGRlZmF1bHRTeW5jIH0gZnJvbSAnQGNkcC9kYXRhLXN5bmMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIE1vZGVsLFxuICAgIHR5cGUgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIHR5cGUgTW9kZWxTYXZlT3B0aW9ucyxcbiAgICBpc01vZGVsLFxufSBmcm9tICdAY2RwL21vZGVsJztcbmltcG9ydCB0eXBlIHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvblNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25TZWVkLFxuICAgIENvbGxlY3Rpb25FdmVudCxcbiAgICBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWRkT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uU2V0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUmVTb3J0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uVXBkYXRlT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBzZWFyY2hJdGVtcywgcXVlcnlJdGVtcyB9IGZyb20gJy4vcXVlcnknO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgICAgICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yID0gU3ltYm9sKCdjcmVhdGUtaXRlcmFibGUtaXRlcmF0b3InKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3ByZXBhcmVNb2RlbCAgICAgICAgICAgPSBTeW1ib2woJ3ByZXBhcmUtbW9kZWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlbW92ZU1vZGVscyAgICAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1tb2RlbHMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2FkZFJlZmVyZW5jZSAgICAgICAgICAgPSBTeW1ib2woJ2FkZC1yZWZlcmVuY2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlbW92ZVJlZmVyZW5jZSAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1yZWZlcmVuY2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX29uTW9kZWxFdmVudCAgICAgICAgICAgPSBTeW1ib2woJ21vZGVsLWV2ZW50LWhhbmRsZXInKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PiB7XG4gICAgcmVhZG9ubHkgY29uc3RydWN0T3B0aW9uczogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VCwgSz47XG4gICAgcmVhZG9ubHkgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VCwgSz47XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgcXVlcnlPcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxULCBLPjtcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VCwgSz47XG4gICAgcmVhZG9ubHkgbW9kZWxPcHRpb25zOiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM7XG4gICAgcmVhZG9ubHkgYnlJZDogTWFwPHN0cmluZywgVD47XG4gICAgc3RvcmU6IFRbXTtcbiAgICBhZnRlckZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFQ+O1xufVxuXG4vKiogQGludGVybmFsIHJlc2V0IG1vZGVsIGNvbnRleHQgKi9cbmNvbnN0IHJlc2V0TW9kZWxTdG9yZSA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4oY29udGV4dDogUHJvcGVydHk8VCwgSz4pOiB2b2lkID0+IHtcbiAgICBjb250ZXh0LmJ5SWQuY2xlYXIoKTtcbiAgICBjb250ZXh0LnN0b3JlLmxlbmd0aCA9IDA7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVTb3J0T3B0aW9ucyA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ob3B0aW9uczogQ29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+KTogUmVxdWlyZWQ8Q29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+PiA9PiB7XG4gICAgY29uc3QgeyBzb3J0S2V5czoga2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBvcHRpb25zO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNvcnRLZXlzOiBrZXlzID8/IFtdLFxuICAgICAgICBjb21wYXJhdG9yczogY29tcHMgPz8gY29udmVydFNvcnRLZXlzKGtleXMgPz8gW10pLFxuICAgIH07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtb2RlbElkQXR0cmlidXRlID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gKGN0b3IgYXMgYW55KT8uaWRBdHRyaWJ1dGUgPz8gJ2lkJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldE1vZGVsSWQgPSA8VCBleHRlbmRzIG9iamVjdD4oYXR0cnM6IEFjY2Vzc2libGU8VCwgc3RyaW5nPiwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBhdHRyc1ttb2RlbElkQXR0cmlidXRlKGN0b3IpXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldENoYW5nZWRJZHMgPSA8VCBleHRlbmRzIG9iamVjdD4ob2JqOiBvYmplY3QsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogeyBpZDogc3RyaW5nOyBwcmV2SWQ/OiBzdHJpbmc7IH0gfCB1bmRlZmluZWQgPT4ge1xuICAgIHR5cGUgTW9kZWxMaWtlID0gQWNjZXNzaWJsZTx7IHByZXZpb3VzOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZzsgfT47XG4gICAgY29uc3QgbW9kZWwgPSBvYmogYXMgTW9kZWxMaWtlO1xuXG4gICAgY29uc3QgaWRBdHRyaWJ1dGUgPSBtb2RlbElkQXR0cmlidXRlKGN0b3IpO1xuICAgIGNvbnN0IGlkID0gbW9kZWxbaWRBdHRyaWJ1dGVdO1xuICAgIGlmICghaXNTdHJpbmcoaWQpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaWQ6IG1vZGVsW2lkQXR0cmlidXRlXSBhcyBzdHJpbmcsIHByZXZJZDogaXNGdW5jdGlvbihtb2RlbC5wcmV2aW91cykgPyBtb2RlbC5wcmV2aW91cyhpZEF0dHJpYnV0ZSkgOiB1bmRlZmluZWQgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsQ29uc3RydWN0b3IgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiBDbGFzcyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgcmV0dXJuIChzZWxmLmNvbnN0cnVjdG9yIGFzIGFueSkubW9kZWw7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBpc0NvbGxlY3Rpb25Nb2RlbCA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oeDogdW5rbm93biwgc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IHggaXMgVCA9PiB7XG4gICAgY29uc3QgY3RvciA9IG1vZGVsQ29uc3RydWN0b3Ioc2VsZik7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24oY3RvcikgPyB4IGluc3RhbmNlb2YgY3RvciA6IGZhbHNlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3BsaWNlQXJyYXkgPSA8VD4odGFyZ2V0OiBUW10sIGluc2VydDogVFtdLCBhdDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgYXQgPSBNYXRoLm1pbihNYXRoLm1heChhdCwgMCksIHRhcmdldC5sZW5ndGgpO1xuICAgIHRhcmdldC5zcGxpY2UoYXQsIDAsIC4uLmluc2VydCk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwYXJzZUZpbHRlckFyZ3M8VCBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogdW5rbm93bltdKTogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPiB7XG4gICAgY29uc3QgW2ZpbHRlciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChudWxsID09IGZpbHRlcikge1xuICAgICAgICByZXR1cm4ge307XG4gICAgfSBlbHNlIGlmICghaXNGdW5jdGlvbihmaWx0ZXIpKSB7XG4gICAgICAgIHJldHVybiBmaWx0ZXIgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywgeyBmaWx0ZXIgfSkgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3NldE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiB0cnVlLCBtZXJnZTogdHJ1ZSB9O1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkT3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlIH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIGNvbGxlY3Rpb24gdGhhdCBpcyBvcmRlcmVkIHNldHMgb2YgbW9kZWxzLlxuICogQGphIE1vZGVsIOOBrumbhuWQiOOCkuaJseOBhiBDb2xsZWN0aW9uIOOBruWfuuW6leOCr+ODqeOCueWumue+qS5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgICAgTW9kZWwsXG4gKiAgICAgTW9kZWxDb25zdHJ1Y3RvcixcbiAqICAgICBDb2xsZWN0aW9uLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gKiAgICAgQ29sbGVjdGlvblNlZWQsXG4gKiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gTW9kZWwgc2NoZW1hXG4gKiBpbnRlcmZhY2UgVHJhY2tBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgdGl0bGU6IHN0cmluZztcbiAqICAgYXJ0aXN0OiBzdHJpbmc7XG4gKiAgIGFsYnVtOiAgc3RyaW5nO1xuICogICByZWxlYXNlRGF0ZTogRGF0ZTtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIE1vZGVsIGRlZmluaXRpb25cbiAqIGNvbnN0IFRyYWNrQmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8VHJhY2tBdHRyaWJ1dGU+LCBUcmFja0F0dHJpYnV0ZT47XG4gKiBjbGFzcyBUcmFjayBleHRlbmRzIFRyYWNrQmFzZSB7XG4gKiAgICAgc3RhdGljIGlkQXR0cmlidXRlID0gJ3VyaSc7XG4gKiB9XG4gKlxuICogLy8gQ29sbGVjdGlvbiBkZWZpbml0aW9uXG4gKiBjbGFzcyBQbGF5bGlzdCBleHRlbmRzIENvbGxlY3Rpb248VHJhY2s+IHtcbiAqICAgICAvLyBzZXQgdGFyZ2V0IE1vZGVsIGNvbnN0cnVjdG9yXG4gKiAgICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsID0gVHJhY2s7XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIHVzZSBjdXN0b20gY29udGVudCBwcm92aWRlciBmb3IgZmV0Y2guXG4gKiAgICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMoXG4gKiAgICAgICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUcmFjaz5cbiAqICAgICApOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICogICAgICAgICAvLyBzb21lIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGhlcmUuXG4gKiAgICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgY3VzdG9tUHJvdmlkZXIob3B0aW9ucyk7XG4gKiAgICAgICAgIHJldHVybiB7XG4gKiAgICAgICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICogICAgICAgICAgICAgaXRlbXMsXG4gKiAgICAgICAgICAgICBvcHRpb25zLFxuICogICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0PjtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIGNvbnZlcnQgYSByZXNwb25zZSBpbnRvIGEgbGlzdCBvZiBtb2RlbHMuXG4gKiAgICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBDb2xsZWN0aW9uU2VlZFtdKTogVHJhY2tBdHRyaWJ1dGVbXSB7XG4gKiAgICAgICAgIHJldHVybiByZXNwb25zZS5tYXAoc2VlZCA9PiB7XG4gKiAgICAgICAgICAgICBjb25zdCBkYXRlID0gc2VlZC5yZWxlYXNlRGF0ZTtcbiAqICAgICAgICAgICAgIHNlZWQucmVsZWFzZURhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAqICAgICAgICAgICAgIHJldHVybiBzZWVkO1xuICogICAgICAgICB9KSBhcyBUcmFja0F0dHJpYnV0ZVtdO1xuICogICAgICB9XG4gKiB9XG4gKlxuICogbGV0IHNlZWRzOiBUcmFja0F0dHJpYnV0ZVtdO1xuICpcbiAqIGNvbnN0IHBsYXlsaXN0ID0gbmV3IFBsYXlsaXN0KHNlZWRzLCB7XG4gKiAgICAgLy8gZGVmYXVsdCBxdWVyeSBvcHRpb25zXG4gKiAgICAgcXVlcnlPcHRpb25zOiB7XG4gKiAgICAgICAgIHNvcnRLZXlzOiBbXG4gKiAgICAgICAgICAgICB7IG5hbWU6ICd0aXRsZScsIG9yZGVyOiBTb3J0T3JkZXIuREVTQywgdHlwZTogJ3N0cmluZycgfSxcbiAqICAgICAgICAgXSxcbiAqICAgICB9XG4gKiB9KTtcbiAqXG4gKiBhd2FpdCBwbGF5bGlzdC5yZXF1ZXJ5KCk7XG4gKlxuICogZm9yIChjb25zdCB0cmFjayBvZiBwbGF5bGlzdCkge1xuICogICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRyYWNrLnRvSlNPTigpKSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbGxlY3Rpb248XG4gICAgVE1vZGVsIGV4dGVuZHMgb2JqZWN0ID0gYW55LFxuICAgIFRFdmVudCBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUTW9kZWw+ID0gQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4sXG4gICAgVEtleSBleHRlbmRzIEtleXM8VE1vZGVsPiA9IEtleXM8VE1vZGVsPlxuPiBleHRlbmRzIEV2ZW50U291cmNlPFRFdmVudD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUTW9kZWw+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb2RlbCBjb25zdHJ1Y3Rvci4gPGJyPlxuICAgICAqICAgICBUaGUgY29uc3RydWN0b3IgaXMgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoaXMge0BsaW5rIENvbGxlY3Rpb259IGNsYXNzIGZvciBgVE1vZGVsYCBjb25zdHJ1Y3Rpb24uXG4gICAgICogQGphIE1vZGVsIOOCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gICAgICogICAgIHtAbGluayBDb2xsZWN0aW9ufSDjgq/jg6njgrnjgYwgYFRNb2RlbGAg44KS5qeL56+J44GZ44KL44Gf44KB44Gr5L2/55So44GZ44KLXG4gICAgICovXG4gICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsPzogQ2xhc3M7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY29uc3RydWN0aW9uL2Rlc3RydWN0aW9uOlxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkcz86IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBtb2RlbE9wdGlvbnM6IHt9LCBxdWVyeU9wdGlvbnM6IHt9IH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHsgbW9kZWxPcHRpb25zLCBxdWVyeU9wdGlvbnMgfSA9IG9wdHM7XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RPcHRpb25zOiBvcHRzLFxuICAgICAgICAgICAgcHJvdmlkZXI6IG9wdHMucHJvdmlkZXIgPz8gdGhpcy5zeW5jLmJpbmQodGhpcyksXG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ2NvbGxlY3Rpb246JywgOCksXG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMsXG4gICAgICAgICAgICBxdWVyeUluZm86IHt9LFxuICAgICAgICAgICAgbW9kZWxPcHRpb25zLFxuICAgICAgICAgICAgYnlJZDogbmV3IE1hcDxzdHJpbmcsIFRNb2RlbD4oKSxcbiAgICAgICAgICAgIHN0b3JlOiBbXSxcbiAgICAgICAgfSBhcyB1bmtub3duIGFzIFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbiAgICAgICAgdGhpcy5pbml0UXVlcnlJbmZvKCk7XG5cbiAgICAgICAgLyogbW9kZWwgZXZlbnQgaGFuZGxlciAqL1xuICAgICAgICAodGhpcyBhcyBhbnkpW19vbk1vZGVsRXZlbnRdID0gKGV2ZW50OiBzdHJpbmcsIG1vZGVsOiBUTW9kZWwgfCB1bmRlZmluZWQsIGNvbGxlY3Rpb246IHRoaXMsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoZXZlbnQpICYmIGV2ZW50LnN0YXJ0c1dpdGgoJ0AnKSAmJiBtb2RlbCkge1xuICAgICAgICAgICAgICAgIGlmICgoJ0BhZGQnID09PSBldmVudCB8fCAnQHJlbW92ZScgPT09IGV2ZW50KSAmJiBjb2xsZWN0aW9uICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdAZGVzdHJveScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0gKGNvbGxlY3Rpb24gYXMgYW55KTtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IHRoaXM7ICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnQGNoYW5nZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzOyAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICAgICAgICAgIGlmICgnQGNoYW5nZScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHMgPSBnZXRDaGFuZ2VkSWRzKG1vZGVsLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCBwcmV2SWQgfSA9IGlkcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldklkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBwcmV2SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuZGVsZXRlKHByZXZJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gZGVsZWdhdGUgZXZlbnRcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIuY2FsbCh0aGlzLCBldmVudCwgbW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVzZWxlc3MtY2FsbFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZWVkcykge1xuICAgICAgICAgICAgdGhpcy5yZXNldChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAamEgSW5pdGlhbGl6ZSBxdWVyeSBpbmZvXG4gICAgICogQGphIOOCr+OCqOODquaDheWgseOBruWIneacn+WMllxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpbml0UXVlcnlJbmZvKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9ID0gZW5zdXJlU29ydE9wdGlvbnModGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3F1ZXJ5SW5mbyA9IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgYW5kIGV2ZW50IGxpc3RlbmVyIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgpLnoLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIChyZXNlcnZlZCkuXG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7MgKOS6iOe0hClcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZShvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB0aGlzIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gW107XG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIENsZWFyIGNhY2hlIGluc3RhbmNlIG1ldGhvZFxuICAgICAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjga7noLTmo4RcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgY2xlYXJDYWNoZSgpOiB2b2lkIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3F1ZXJ5SW5mby5jYWNoZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4ggSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBtb2RlbHMuXG4gICAgICogQGphIE1vZGVsIOOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBtb2RlbHMoKTogcmVhZG9ubHkgVE1vZGVsW10ge1xuICAgICAgICBjb25zdCB7IF9xdWVyeUZpbHRlciwgX2FmdGVyRmlsdGVyIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChfYWZ0ZXJGaWx0ZXIgJiYgX2FmdGVyRmlsdGVyICE9PSBfcXVlcnlGaWx0ZXIpID8gc3RvcmUuZmlsdGVyKF9hZnRlckZpbHRlcikgOiBzdG9yZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIG1vZGVscy5cbiAgICAgKiBAamEg5YaF5YyF44GZ44KLIE1vZGVsIOaVsFxuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWxzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYXBwbGllZCBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBjOmBqeeUqOOBleOCjOOBpuOBhOOCi+OBi+OCkuWIpOWumlxuICAgICAqL1xuICAgIGdldCBmaWx0ZXJlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBDb2xsZWN0aW9uUXVlcnlJbmZvfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvblF1ZXJ5SW5mb30g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlJbmZvKCk6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIHtAbGluayBDb2xsZWN0aW9uUXVlcnlJbmZvfSBpbnN0YW5jZVxuICAgICAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvblF1ZXJ5SW5mb30g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIHNldCBfcXVlcnlJbmZvKHZhbDogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbyA9IHZhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNyZWF0aW5nIG9wdGlvbnMuXG4gICAgICogQGphIOani+evieaZguOBruOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX29wdGlvbnMoKTogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb25zdHJ1Y3RPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwcm92aWRlci5cbiAgICAgKiBAamEg5pei5a6a44Gu44OX44Ot44OQ44Kk44OA44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJvdmlkZXIoKTogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByb3ZpZGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwYXJzZSBiZWhhdmlvdXIuXG4gICAgICogQGphIOaXouWumuOBriBwYXJzZSDli5XkvZzjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UGFyc2UoKTogYm9vbGVhbiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zLnBhcnNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDml6Llrprjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDmnIDlvozjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9sYXN0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgICAgIGNvbnN0IG9wdHM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4gPSB7fTtcblxuICAgICAgICBzb3J0S2V5cy5sZW5ndGggJiYgKG9wdHMuc29ydEtleXMgPSBzb3J0S2V5cyk7XG4gICAgICAgIGNvbXBhcmF0b3JzLmxlbmd0aCAmJiAob3B0cy5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzKTtcbiAgICAgICAgZmlsdGVyICYmIChvcHRzLmZpbHRlciA9IGZpbHRlcik7XG5cbiAgICAgICAgcmV0dXJuIG9wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBzb3J0IGNvbXBhcmF0b3JzLlxuICAgICAqIEBqYSDjgr3jg7zjg4jnlKjmr5TovIPplqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VE1vZGVsPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHF1ZXJ5LWZpbHRlci5cbiAgICAgKiBAamEg44Kv44Ko44Oq55So44OV44Kj44Or44K/6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlGaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uZmlsdGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gYWZ0ZXItZmlsdGVyLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hZnRlckZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHV0aWxzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGEgbW9kZWwgZnJvbSBhIGNvbGxlY3Rpb24sIHNwZWNpZmllZCBieSBhbiBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2UuXG4gICAgICogQGphIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCueOBi+OCiSBNb2RlbCDjgpLnibnlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgICBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgZ2V0KHNlZWQ6IHN0cmluZyB8IG9iamVjdCB8IHVuZGVmaW5lZCk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChudWxsID09IHNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoaXNTdHJpbmcoc2VlZCkgJiYgYnlJZC5oYXMoc2VlZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBieUlkLmdldChzZWVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gZ2V0TW9kZWxJZChpc01vZGVsKHNlZWQpID8gc2VlZC50b0pTT04oKSA6IHNlZWQgYXMgb2JqZWN0LCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgY29uc3QgY2lkID0gKHNlZWQgYXMgb2JqZWN0IGFzIHsgX2NpZD86IHN0cmluZzsgfSkuX2NpZDtcblxuICAgICAgICByZXR1cm4gYnlJZC5nZXQoaWQpID8/IChjaWQgJiYgYnlJZC5nZXQoY2lkKSkgYXMgVE1vZGVsIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgbW9kZWwgaXMgaW4gdGhlIGNvbGxlY3Rpb24gYnkgYW4gYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlLlxuICAgICAqIEBqYSBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrnjgYvjgokgTW9kZWwg44KS5omA5pyJ44GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGhhcyhzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIG51bGwgIT0gdGhpcy5nZXQoc2VlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIGNvcHkgb2YgdGhlIG1vZGVsJ3MgYGF0dHJpYnV0ZXNgIG9iamVjdC5cbiAgICAgKiBAamEgTW9kZWwg5bGe5oCn5YCk44Gu44Kz44OU44O844KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHRvSlNPTigpOiBvYmplY3RbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVscy5tYXAobSA9PiBpc01vZGVsKG0pID8gbS50b0pTT04oKSA6IG0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlcyBDbG9uZSB0aGlzIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7opIfoo73jgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHB1YmxpYyBjbG9uZSgpOiB0aGlzIHtcbiAgICAgICAgY29uc3QgeyBjb25zdHJ1Y3RvciwgX29wdGlvbnMgfSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgKGNvbnN0cnVjdG9yIGFzIENvbnN0cnVjdG9yPHRoaXM+KSh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgX29wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3JjZSBhIGNvbGxlY3Rpb24gdG8gcmUtc29ydCBpdHNlbGYuXG4gICAgICogQGphIENvbGxlY3Rpb24g6KaB57Sg44Gu5YaN44K944O844OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc29ydCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44K944O844OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNvcnQob3B0aW9ucz86IENvbGxlY3Rpb25SZVNvcnRPcHRpb25zPFRNb2RlbCwgVEtleT4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IHsgbm9UaHJvdywgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKG9wdHMpO1xuICAgICAgICBjb25zdCBjb21wYXJhdG9ycyA9IDAgPCBjb21wcy5sZW5ndGggPyBjb21wcyA6IHRoaXMuX2NvbXBhcmF0b3JzO1xuXG4gICAgICAgIGlmIChjb21wYXJhdG9ycy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaWYgKG5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMsICdDYW5ub3Qgc29ydCBhIHNldCB3aXRob3V0IGEgY29tcGFyYXRvci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gc2VhcmNoSXRlbXModGhpc1tfcHJvcGVydGllc10uc3RvcmUsIHRoaXMuX2FmdGVyRmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHF1ZXJ5SW5mb1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycztcbiAgICAgICAgaWYgKDAgPCBzb3J0S2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5zb3J0S2V5cyA9IHNvcnRLZXlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0Bzb3J0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBseSBhZnRlci1maWx0ZXIgdG8gY29sbGVjdGlvbiBpdHNlbGYuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogIC0gYGVuYCBmaWx0ZXIgY2FsbGJhY2suXG4gICAgICogIC0gYGphYCDjg5XjgqPjg6vjgr/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXIoY2FsbGJhY2s6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbHkgYWZ0ZXItZmlsdGVyIHRvIGNvbGxlY3Rpb24gaXRzZWxmLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZnRlci1maWx0ZXIgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOe1nuOCiui+vOOBv+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBmaWx0ZXIob3B0aW9uczogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUTW9kZWw+KTogdGhpcztcblxuICAgIHB1YmxpYyBmaWx0ZXIoLi4uYXJnczogdW5rbm93bltdKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBwYXJzZUZpbHRlckFyZ3MoLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IHsgZmlsdGVyLCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGlmIChmaWx0ZXIgIT09IHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlciA9IGZpbHRlcjtcbiAgICAgICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGZpbHRlcicsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbW9kZWwgYXQgdGhlIGdpdmVuIGluZGV4LiBJZiBuZWdhdGl2ZSB2YWx1ZSBpcyBnaXZlbiwgdGhlIHRhcmdldCB3aWxsIGJlIGZvdW5kIGZyb20gdGhlIGxhc3QgaW5kZXguXG4gICAgICogQGphIOOCpOODs+ODh+ODg+OCr+OCueaMh+WumuOBq+OCiOOCiyBNb2RlbCDjgbjjga7jgqLjgq/jgrvjgrkuIOiyoOWApOOBruWgtOWQiOOBr+acq+WwvuaknOe0ouOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIGluZGV4XG4gICAgICogIC0gYGVuYCBBIHplcm8tYmFzZWQgaW50ZWdlciBpbmRpY2F0aW5nIHdoaWNoIGVsZW1lbnQgdG8gcmV0cmlldmUuIDxicj5cbiAgICAgKiAgICAgICAgIElmIG5lZ2F0aXZlIGluZGV4IGlzIGNvdW50ZWQgZnJvbSB0aGUgZW5kIG9mIHRoZSBtYXRjaGVkIHNldC5cbiAgICAgKiAgLSBgamFgIDAgYmFzZSDjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgpLmjIflrpogPGJyPlxuICAgICAqICAgICAgICAg6LKg5YCk44GM5oyH5a6a44GV44KM44Gf5aC05ZCILCDmnKvlsL7jgYvjgonjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgajjgZfjgabop6Pph4jjgZXjgozjgotcbiAgICAgKi9cbiAgICBwdWJsaWMgYXQoaW5kZXg6IG51bWJlcik6IFRNb2RlbCB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLm1vZGVscyBhcyBUTW9kZWxbXSwgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSBNb2RlbCDjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoKTogVE1vZGVsIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdmFsdWUgb2YgYGNvdW50YCBlbGVtZW50cyBvZiB0aGUgbW9kZWwgZnJvbSB0aGUgZmlyc3QuXG4gICAgICogQGphIE1vZGVsIOOBruWFiOmgreOBi+OCiWBjb3VudGAg5YiG44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBmaXJzdChjb3VudD86IG51bWJlcik6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMubW9kZWxzO1xuICAgICAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0cy5zbGljZSgwLCBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIG1vZGVsLlxuICAgICAqIEBqYSBNb2RlbCDjga7mnIDliJ3jga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdCgpOiBUTW9kZWwgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiBgY291bnRgIGVsZW1lbnRzIG9mIHRoZSBtb2RlbCBmcm9tIHRoZSBsYXN0LlxuICAgICAqIEBqYSBNb2RlbCDjga7lhYjpoK3jgYvjgolgY291bnRgIOWIhuOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KGNvdW50OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBsYXN0KGNvdW50PzogbnVtYmVyKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5tb2RlbHM7XG4gICAgICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0c1t0YXJnZXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHMuc2xpY2UoLTEgKiBjb3VudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIGNvbGxlY3Rpb24uIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IENvbGxlY3Rpb25TZWVkIHwgQ29sbGVjdGlvblNlZWRbXSB8IHZvaWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSB8IHVuZGVmaW5lZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUTW9kZWxbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIHtAbGluayBDb2xsZWN0aW9uLmZldGNofSBtZXRob2QgcHJveHkgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGgge0BsaW5rIENvbGxlY3Rpb25JdGVtUHJvdmlkZXJ9IHJldHVybnMgb25lLXNob3QgcmVzdWx0LlxuICAgICAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcn0g5LqS5o+b44Gu5Y2Y55m644GuIHtAbGluayBDb2xsZWN0aW9uLmZldGNofSDntZDmnpzjgpLov5TljbQuIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBhc3luYyBzeW5jKG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PEFueU9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBkZWZhdWx0U3luYygpLnN5bmMoJ3JlYWQnLCB0aGlzIGFzIFN5bmNDb250ZXh0LCBvcHRpb25zKSBhcyBUTW9kZWxbXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxBbnlPYmplY3Q+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGZXRjaCB0aGUge0BsaW5rIE1vZGVsfSBmcm9tIHRoZSBzZXJ2ZXIsIG1lcmdpbmcgdGhlIHJlc3BvbnNlIHdpdGggdGhlIG1vZGVsJ3MgbG9jYWwgYXR0cmlidXRlcy5cbiAgICAgKiBAamEge0BsaW5rIE1vZGVsfSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGZldGNoIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg5Xjgqfjg4Pjg4Hjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8VE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcHJvZ3Jlc3M6IG5vb3AsIHBhcnNlOiB0aGlzLl9kZWZhdWx0UGFyc2UgfSwgdGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcHJvZ3Jlc3M6IG9yaWdpbmFsLCBsaW1pdCwgcmVzZXQsIG5vQ2FjaGUgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCB7IF9xdWVyeUluZm8sIF9wcm92aWRlciB9ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsaXplID0gKG51bGwgPT0gbGltaXQpO1xuXG4gICAgICAgICAgICBvcHRzLnByb2dyZXNzID0gKGluZm86IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VE1vZGVsPikgPT4ge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsKGluZm8pO1xuICAgICAgICAgICAgICAgICFmaW5hbGl6ZSAmJiB0aGlzLmFkZChpbmZvLml0ZW1zLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChub0NhY2hlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZmluYWxpemUgJiYgcmVzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KHVuZGVmaW5lZCwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBxdWVyeUl0ZW1zKF9xdWVyeUluZm8sIF9wcm92aWRlciwgb3B0cyk7XG5cbiAgICAgICAgICAgIGlmIChmaW5hbGl6ZSkge1xuICAgICAgICAgICAgICAgIHJlc2V0ID8gdGhpcy5yZXNldChyZXNwLCBvcHRzKSA6IHRoaXMuYWRkKHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgQ29sbGVjdGlvbiwgcmVzcCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGVycm9yJywgdW5kZWZpbmVkLCB0aGlzIGFzIENvbGxlY3Rpb24sIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGBmZXRjaCgpYCB3aXRoIGxhc3QgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5YmN5Zue44Go5ZCM5p2h5Lu244GnIGBmZXRjaCgpYCDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXF1ZXJ5IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVxdWVyeShvcHRpb25zPzogQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zKTogUHJvbWlzZTxUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW10+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2xhc3RRdWVyeU9wdGlvbnMsIG9wdGlvbnMsIHsgcmVzZXQ6IHRydWUgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoKG9wdHMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGNvbGxlY3Rpb24gc2V0dXBcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIE51bGxpc2ggdmFsdWUuXG4gICAgICogIC0gYGphYCBOdWxsaXNoIOimgee0oFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZDogdW5kZWZpbmVkLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44GrIE1vZGVsIOOBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GEIE1vZGVsIOOBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44GrIE1vZGVsIOOBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GEIE1vZGVsIOOBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkczogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW107XG5cbiAgICBwdWJsaWMgc2V0KHNlZWRzPzogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQgfCBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW10gfCB2b2lkIHtcbiAgICAgICAgaWYgKGlzTnVsbGlzaChzZWVkcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcGFyc2U6IHRoaXMuX2RlZmF1bHRQYXJzZSB9LCBfc2V0T3B0aW9ucywgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgaWYgKG9wdHMucGFyc2UgJiYgIWlzQ29sbGVjdGlvbk1vZGVsKHNlZWRzLCB0aGlzKSkge1xuICAgICAgICAgICAgc2VlZHMgPSB0aGlzLnBhcnNlKHNlZWRzLCBvcHRpb25zKSA/PyBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtczogKFRNb2RlbCB8IG9iamVjdCB8IHVuZGVmaW5lZClbXSA9IHNpbmd1bGFyID8gW3NlZWRzXSA6IChzZWVkcyBhcyBvYmplY3RbXSkuc2xpY2UoKTtcblxuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcblxuICAgICAgICBjb25zdCBhdCA9ICgoY2FuZGlkYXRlKTogbnVtYmVyIHwgdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlID4gc3RvcmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSArPSBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoY2FuZGlkYXRlIDwgMCkgPyAwIDogY2FuZGlkYXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KShvcHRzLmF0KTtcblxuICAgICAgICBjb25zdCBzZXQ6IG9iamVjdFtdICAgICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9BZGQ6IFRNb2RlbFtdICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvTWVyZ2U6IFRNb2RlbFtdICA9IFtdO1xuICAgICAgICBjb25zdCB0b1JlbW92ZTogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgY29uc3QgbW9kZWxTZXQgPSBuZXcgU2V0PG9iamVjdD4oKTtcblxuICAgICAgICBjb25zdCB7IGFkZCwgbWVyZ2UsIHJlbW92ZSwgcGFyc2UsIHNpbGVudCB9ID0gb3B0cztcblxuICAgICAgICBsZXQgc29ydCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBzb3J0YWJsZSA9IHRoaXMuX2NvbXBhcmF0b3JzLmxlbmd0aCAmJiBudWxsID09IGF0ICYmIGZhbHNlICE9PSBvcHRzLnNvcnQ7XG5cbiAgICAgICAgaW50ZXJmYWNlIE1vZGVsRmVhdHVyZSB7XG4gICAgICAgICAgICBwYXJzZTogKGF0cnI/OiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IG9iamVjdDtcbiAgICAgICAgICAgIHNldEF0dHJpYnV0ZXM6IChhdHJyOiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IHZvaWQ7XG4gICAgICAgICAgICBoYXNDaGFuZ2VkOiAoKSA9PiBib29sZWFuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHVybiBiYXJlIG9iamVjdHMgaW50byBtb2RlbCByZWZlcmVuY2VzLCBhbmQgcHJldmVudCBpbnZhbGlkIG1vZGVscyBmcm9tIGJlaW5nIGFkZGVkLlxuICAgICAgICBmb3IgKGNvbnN0IFtpLCBpdGVtXSBvZiBpdGVtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vIElmIGEgZHVwbGljYXRlIGlzIGZvdW5kLCBwcmV2ZW50IGl0IGZyb20gYmVpbmcgYWRkZWQgYW5kIG9wdGlvbmFsbHkgbWVyZ2UgaXQgaW50byB0aGUgZXhpc3RpbmcgbW9kZWwuXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZ2V0KGl0ZW0pIGFzIE1vZGVsRmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIGlmIChtZXJnZSAmJiBpdGVtICE9PSBleGlzdGluZykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cnMgPSBpc01vZGVsKGl0ZW0pID8gaXRlbS50b0pTT04oKSA6IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZSAmJiBpc0Z1bmN0aW9uKGV4aXN0aW5nLnBhcnNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMgPSBleGlzdGluZy5wYXJzZShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihleGlzdGluZy5zZXRBdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmcuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0b01lcmdlLnB1c2goZXhpc3RpbmcgYXMgVE1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRhYmxlICYmICFzb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0ID0gaXNGdW5jdGlvbihleGlzdGluZy5oYXNDaGFuZ2VkKSA/IGV4aXN0aW5nLmhhc0NoYW5nZWQoKSA6IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMoZXhpc3RpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXRlbXNbaV0gPSBleGlzdGluZztcbiAgICAgICAgICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBAc3R5bGlzdGljL2JyYWNlLXN0eWxlXG5cbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBuZXcsIHZhbGlkIG1vZGVsLCBwdXNoIGl0IHRvIHRoZSBgdG9BZGRgIGxpc3QuXG4gICAgICAgICAgICBlbHNlIGlmIChhZGQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlbCA9IGl0ZW1zW2ldID0gdGhpc1tfcHJlcGFyZU1vZGVsXShpdGVtLCBvcHRzKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BZGQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX2FkZFJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIHN0YWxlIG1vZGVscy5cbiAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKG1vZGVsKSkge1xuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZS5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfcmVtb3ZlTW9kZWxzXSh0b1JlbW92ZSwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWUgaWYgc29ydGluZyBpcyBuZWVkZWQsIHVwZGF0ZSBgbGVuZ3RoYCBhbmQgc3BsaWNlIGluIG5ldyBtb2RlbHMuXG4gICAgICAgIGxldCBvcmRlckNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgcmVwbGFjZSA9ICFzb3J0YWJsZSAmJiBhZGQgJiYgcmVtb3ZlO1xuICAgICAgICBpZiAoc2V0Lmxlbmd0aCAmJiByZXBsYWNlKSB7XG4gICAgICAgICAgICBvcmRlckNoYW5nZWQgPSAoc3RvcmUubGVuZ3RoICE9PSBzZXQubGVuZ3RoKSB8fCBzdG9yZS5zb21lKChtLCBpbmRleCkgPT4gbSAhPT0gc2V0W2luZGV4XSk7XG4gICAgICAgICAgICBzdG9yZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgc3BsaWNlQXJyYXkoc3RvcmUsIHNldCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAodG9BZGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoc29ydGFibGUpIHtcbiAgICAgICAgICAgICAgICBzb3J0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCB0b0FkZCwgYXQgPz8gc3RvcmUubGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNpbGVudGx5IHNvcnQgdGhlIGNvbGxlY3Rpb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgIGlmIChzb3J0KSB7XG4gICAgICAgICAgICB0aGlzLnNvcnQoeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVbmxlc3Mgc2lsZW5jZWQsIGl0J3MgdGltZSB0byBmaXJlIGFsbCBhcHByb3ByaWF0ZSBhZGQvc29ydC91cGRhdGUgZXZlbnRzLlxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaSwgbW9kZWxdIG9mIHRvQWRkLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBhdCArIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAYWRkJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BhZGQnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc29ydCB8fCBvcmRlckNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc29ydCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9BZGQubGVuZ3RoIHx8IHRvUmVtb3ZlLmxlbmd0aCB8fCB0b01lcmdlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWQ6IHRvQWRkLFxuICAgICAgICAgICAgICAgICAgICByZW1vdmVkOiB0b1JlbW92ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VkOiB0b01lcmdlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRyb3AgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IGl0ZW1zLmZpbHRlcihpID0+IG51bGwgIT0gaSkgYXMgVE1vZGVsW107XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBhZGRlZCAob3IgbWVyZ2VkKSBtb2RlbCAob3IgbW9kZWxzKS5cbiAgICAgICAgcmV0dXJuIHNpbmd1bGFyID8gcmV0dmFsWzBdIDogKHJldHZhbC5sZW5ndGggPyByZXR2YWwgOiB2b2lkIDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGEgY29sbGVjdGlvbiB3aXRoIGEgbmV3IGxpc3Qgb2YgbW9kZWxzIChvciBhdHRyaWJ1dGUgaGFzaGVzKSwgdHJpZ2dlcmluZyBhIHNpbmdsZSBgcmVzZXRgIGV2ZW50IG9uIGNvbXBsZXRpb24uXG4gICAgICogQGphIENvbGxlY3Rpb24g44KS5paw44GX44GEIE1vZGVsIOS4gOimp+OBp+e9ruaPmy4g5a6M5LqG5pmC44GrIGByZXNldGAg44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgrvjg4Pjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoc2VlZHM/OiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyAmIHsgcHJldmlvdXM6IFRNb2RlbFtdOyB9O1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLnByZXZpb3VzID0gc3RvcmUuc2xpY2UoKTtcbiAgICAgICAgcmVzZXRNb2RlbFN0b3JlKHRoaXNbX3Byb3BlcnRpZXNdKTtcblxuICAgICAgICBjb25zdCBtb2RlbHMgPSBzZWVkcyA/IHRoaXMuYWRkKHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKSA6IFtdO1xuXG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0ByZXNldCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9kZWxzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgbW9kZWwgdG8gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIENvbGxlY3Rpb24g44G444GuIE1vZGVsIOOBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgdG8gdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqIEBqYSBNb2RlbCDjg6rjgrnjg4jmjIflrprjgavjgojjgosgQ29sbGVjdGlvbiDjgbjjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXTtcblxuICAgIHB1YmxpYyBhZGQoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkIHwgVE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0KHNlZWRzIGFzIFVua25vd25PYmplY3QsIE9iamVjdC5hc3NpZ24oeyBtZXJnZTogZmFsc2UgfSwgb3B0aW9ucywgX2FkZE9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBi+OCiSBNb2RlbCDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIGxpc3Qgb2YgbW9kZWxzIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEgTW9kZWwg44Oq44K544OI5oyH5a6a44Gr44KI44KLIENvbGxlY3Rpb24g44GL44KJ44Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHNpbmd1bGFyID8gW3NlZWRzIGFzIFRNb2RlbF0gOiAoc2VlZHMgYXMgVE1vZGVsW10pLnNsaWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSB0aGlzW19yZW1vdmVNb2RlbHNdKGl0ZW1zLCBvcHRzKTtcbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCAmJiByZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0geyBhZGRlZDogW10sIG1lcmdlZDogW10sIHJlbW92ZWQgfTtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJlbW92ZWRbMF0gOiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBtb2RlbCB0byB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7jgasgTW9kZWwg44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcHVzaChzZWVkOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNlZWQsIE9iamVjdC5hc3NpZ24oeyBhdDogc3RvcmUubGVuZ3RoIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7jga4gTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBwb3Aob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZShzdG9yZVtzdG9yZS5sZW5ndGggLSAxXSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIG1vZGVsIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOWFiOmgreOBqyBNb2RlbCDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bnNoaWZ0KHNlZWQ6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZCB7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZChzZWVkLCBPYmplY3QuYXNzaWduKHsgYXQ6IDAgfSwgb3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOWFiOmgreOBriBNb2RlbCDjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNoaWZ0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc3RvcmVbMF0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgYSBtb2RlbCBpbiB0aGlzIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOaWsOOBl+OBhCBNb2RlbCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJDjgZcsIENvbGxlY3Rpb24g44Gr6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXR0cnNcbiAgICAgKiAgLSBgZW5gIGF0dHJpYnV0ZXMgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5bGe5oCn44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG1vZGVsIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgTW9kZWwg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGNyZWF0ZShhdHRyczogb2JqZWN0LCBvcHRpb25zPzogTW9kZWxTYXZlT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgd2FpdCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc2VlZCA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oYXR0cnMsIG9wdGlvbnMgYXMgU2lsZW5jZWFibGUpO1xuICAgICAgICBpZiAoIXNlZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtb2RlbCA9IGlzTW9kZWwoc2VlZCkgPyBzZWVkIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXdhaXQgfHwgIW1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vZGVsLnNhdmUodW5kZWZpbmVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdhaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHNlZWQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZXJyb3InLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBtb2RlbCBwcmVwYXJhdGlvbiAqL1xuICAgIHByaXZhdGUgW19wcmVwYXJlTW9kZWxdKGF0dHJzOiBvYmplY3QgfCBUTW9kZWwgfCB1bmRlZmluZWQsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKGlzQ29sbGVjdGlvbk1vZGVsKGF0dHJzLCB0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF0dHJzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBtb2RlbENvbnN0cnVjdG9yKHRoaXMpO1xuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucyB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGlmIChjb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG1vZGVsT3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IG5ldyBjb25zdHJ1Y3RvcihhdHRycywgb3B0cykgYXMgeyB2YWxpZGF0ZTogKCkgPT4gUmVzdWx0OyB9O1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24obW9kZWwudmFsaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbW9kZWwudmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAaW52YWxpZCcsIGF0dHJzIGFzIE1vZGVsLCB0aGlzIGFzIENvbGxlY3Rpb24sIHJlc3VsdCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsIGFzIFRNb2RlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBsYWluIG9iamVjdFxuICAgICAgICByZXR1cm4gYXR0cnMgYXMgVE1vZGVsO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIGNhbGxlZCBieSBib3RoIHJlbW92ZSBhbmQgc2V0LiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVNb2RlbHNdKG1vZGVsczogVE1vZGVsW10sIG9wdGlvbnM6IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBtZGwgb2YgbW9kZWxzKSB7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IHRoaXMuZ2V0KG1kbCk7XG4gICAgICAgICAgICBpZiAoIW1vZGVsKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzdG9yZS5pbmRleE9mKG1vZGVsKTtcbiAgICAgICAgICAgIHN0b3JlLnNwbGljZShpbmRleCwgMSk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSByZWZlcmVuY2VzIGJlZm9yZSB0cmlnZ2VyaW5nICdyZW1vdmUnIGV2ZW50IHRvIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcC5cbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwsIHRydWUpO1xuXG4gICAgICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0ByZW1vdmUnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlbW92ZWQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlbW92ZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gY3JlYXRlIGEgbW9kZWwncyB0aWVzIHRvIGEgY29sbGVjdGlvbi4gKi9cbiAgICBwcml2YXRlIFtfYWRkUmVmZXJlbmNlXShtb2RlbDogVE1vZGVsKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLnNldChfY2lkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuc2V0KGlkLCBtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5Ubyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgKHRoaXMgYXMgYW55KVtfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCB0byBzZXZlciBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCwgcGFydGlhbCA9IGZhbHNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGNvbnN0IHsgX2NpZCwgaWQgfSA9IG1vZGVsIGFzIHsgX2NpZDogc3RyaW5nOyBpZDogc3RyaW5nOyB9O1xuICAgICAgICBpZiAobnVsbCAhPSBfY2lkKSB7XG4gICAgICAgICAgICBieUlkLmRlbGV0ZShfY2lkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGFydGlhbCAmJiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRQdWJsaXNoZXIpKSkge1xuICAgICAgICAgICAgdGhpcy5zdG9wTGlzdGVuaW5nKG1vZGVsIGFzIFN1YnNjcmliYWJsZSwgJyonLCAodGhpcyBhcyBhbnkpW19vbk1vZGVsRXZlbnRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFRNb2RlbD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRvciBvZiB7QGxpbmsgRWxlbWVudEJhc2V9IHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOagvOe0jeOBl+OBpuOBhOOCiyB7QGxpbmsgRWxlbWVudEJhc2V9IOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMubW9kZWxzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VE1vZGVsPiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRlciA8IHRoaXMuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYmFzZVt0aGlzLnBvaW50ZXIrK10sXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VE1vZGVsPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaWQpLCB2YWx1ZShtb2RlbCkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSwgdmFsdWUobW9kZWwpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBUTW9kZWxdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpZCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZykgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoe0BsaW5rIEVsZW1lbnRCYXNlfSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcy5tb2RlbHMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvczJrZXkgPSAocG9zOiBudW1iZXIpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGdldE1vZGVsSWQoY29udGV4dC5iYXNlW3Bvc10gYXMgQWNjZXNzaWJsZTxUTW9kZWwsIHN0cmluZz4sIG1vZGVsQ29uc3RydWN0b3IodGhpcykpIHx8IFN0cmluZyhwb3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihwb3Mya2V5KGN1cnJlbnQpLCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gaXRlcmF0b3I7XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoQ29sbGVjdGlvbiBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcbiIsImltcG9ydCB0eXBlIHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHR5cGUgeyBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB0eXBlIHsgTGlzdENoYW5nZWQsIExpc3RFZGl0T3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIGNsZWFyQXJyYXksXG4gICAgYXBwZW5kQXJyYXksXG4gICAgaW5zZXJ0QXJyYXksXG4gICAgcmVvcmRlckFycmF5LFxuICAgIHJlbW92ZUFycmF5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB0eXBlIHsgQ29sbGVjdGlvbiB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKlxuICogQGVuIEVkaXRlZCBjb2xsZWN0aW9uIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDooqvnt6jpm4YgQ29sbGVjdGlvbiDjga7lnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbkVkaXRlZTxNIGV4dGVuZHMgb2JqZWN0PiA9IENvbGxlY3Rpb248TSwgYW55LCBhbnk+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gcHJlcGFyZTxUIGV4dGVuZHMgb2JqZWN0Pihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uPFQ+KTogVFtdIHwgbmV2ZXIge1xuICAgIGlmIChjb2xsZWN0aW9uLmZpbHRlcmVkKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQsICdjb2xsZWN0aW9uIGlzIGFwcGxpZWQgYWZ0ZXItZmlsdGVyLicpO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGVjdGlvbi5tb2RlbHMuc2xpY2UoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuYXN5bmMgZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uPFQ+LFxuICAgIG9wdGlvbnM6IExpc3RFZGl0T3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBvcGVyYXRpb246ICh0YXJnZXRzOiBUW10sIHRva2VuOiBDYW5jZWxUb2tlbiB8IHVuZGVmaW5lZCkgPT4gUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPixcbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGNvbnN0IHRhcmdldHMgPSBwcmVwYXJlPFQ+KGNvbGxlY3Rpb24pO1xuICAgIGNvbnN0IGNoYW5nZSA9IGF3YWl0IG9wZXJhdGlvbih0YXJnZXRzLCBvcHRpb25zPy5jYW5jZWwpO1xuICAgIGNvbGxlY3Rpb24uc2V0KHRhcmdldHMsIG9wdGlvbnMpO1xuICAgIHJldHVybiBjaGFuZ2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIG1pbihpbmRpY2VzOiBudW1iZXJbXSk6IG51bWJlciB7XG4gICAgcmV0dXJuIGluZGljZXMucmVkdWNlKChsaHMsIHJocykgPT4gTWF0aC5taW4obGhzLCByaHMpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gbWFrZUxpc3RDaGFuZ2VkPFQ+KFxuICAgIHR5cGU6ICdhZGQnIHwgJ3JlbW92ZScgfCAncmVvcmRlcicsXG4gICAgY2hhbmdlczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSxcbiAgICByYW5nZUZyb206IG51bWJlcixcbiAgICByYW5nZVRvOiBudW1iZXIsXG4gICAgYXQ/OiBudW1iZXIsXG4pOiBMaXN0Q2hhbmdlZDxUPiB7XG4gICAgY29uc3QgY2hhbmdlZCA9ICEhY2hhbmdlcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZSxcbiAgICAgICAgbGlzdDogY2hhbmdlcyxcbiAgICAgICAgcmFuZ2U6IGNoYW5nZWQgPyB7IGZyb206IHJhbmdlRnJvbSwgdG86IHJhbmdlVG8gfSA6IHVuZGVmaW5lZCxcbiAgICAgICAgaW5zZXJ0ZWRUbzogY2hhbmdlZCA/IGF0IDogdW5kZWZpbmVkLFxuICAgIH0gYXMgTGlzdENoYW5nZWQ8VD47XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBlbGVtZW50cyBvZiB7QGxpbmsgQ29sbGVjdGlvbn0uXG4gKiBAamEge0BsaW5rIENvbGxlY3Rpb259IOimgee0oOOBruWFqOWJiumZpFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqICAtIGBqYWAg5a++6LGhIHtAbGluayBDb2xsZWN0aW9ufVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30gcmVmZXJlbmNlLlxuICogIC0gYGphYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VUbyA9IGNvbGxlY3Rpb24ubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGNsZWFyQXJyYXkodGFyZ2V0cywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW1vdmUnLCBjaGFuZ2VzLCAwLCByYW5nZVRvKTtcbn1cblxuLyoqXG4gKiBAZW4gQXBwZW5kIHNvdXJjZSBlbGVtZW50cyB0byB0aGUgZW5kIG9mIHtAbGluayBDb2xsZWN0aW9ufS5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IHJlZmVyZW5jZS5cbiAqICAtIGBqYWAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIHNyYzogVFtdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBjb2xsZWN0aW9uLmxlbmd0aDtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGFwcGVuZEFycmF5KHRhcmdldHMsIHNyYywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdhZGQnLCBjaGFuZ2VzLCByYW5nZUZyb20sIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgcmFuZ2VGcm9tKTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2Yge0BsaW5rIENvbGxlY3Rpb259LlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSDjga7mjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQge0BsaW5rIENvbGxlY3Rpb259XG4gKiAgLSBgamFgIOWvvuixoSB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IHJlZmVyZW5jZS5cbiAqICAtIGBqYWAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zZXJ0Q29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIGluZGV4OiBudW1iZXIsXG4gICAgc3JjOiBUW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gaW5zZXJ0QXJyYXkodGFyZ2V0cywgaW5kZXgsIHNyYywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdhZGQnLCBjaGFuZ2VzLCBpbmRleCwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCBpbmRleCk7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIge0BsaW5rIENvbGxlY3Rpb259IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSDpoIXnm67jga7kvY3nva7jgpLlpInmm7RcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQge0BsaW5rIENvbGxlY3Rpb259XG4gKiAgLSBgamFgIOWvvuixoSB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIGVkaXQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgaW5kZXg6IG51bWJlcixcbiAgICBvcmRlcnM6IG51bWJlcltdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBtaW4oW2luZGV4LCAuLi5vcmRlcnNdKTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IHJlb3JkZXJBcnJheSh0YXJnZXRzLCBpbmRleCwgb3JkZXJzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3Jlb3JkZXInLCBjaGFuZ2VzLCByYW5nZUZyb20sIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgaW5kZXgpO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUge0BsaW5rIENvbGxlY3Rpb259IGVsZW1lbnRzLlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSDpoIXnm67jga7liYrpmaRcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQge0BsaW5rIENvbGxlY3Rpb259XG4gKiAgLSBgamFgIOWvvuixoSB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgcmVtb3ZlZCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IHJlZmVyZW5jZS5cbiAqICAtIGBqYWAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIG9yZGVyczogbnVtYmVyW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IG1pbihvcmRlcnMpO1xuICAgIGNvbnN0IHJhbmdlVG8gPSBjb2xsZWN0aW9uLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiByZW1vdmVBcnJheSh0YXJnZXRzLCBvcmRlcnMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVtb3ZlJywgY2hhbmdlcywgcmFuZ2VGcm9tLCByYW5nZVRvKTtcbn1cbiJdLCJuYW1lcyI6WyJ0cnVuYyIsImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBOzs7QUFHRztBQUVILENBQUEsWUFBcUI7QUFNakI7OztBQUdHO0FBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtBQUFBLElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsd0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSx3QkFBaUQ7UUFDakQsV0FBQSxDQUFBLFdBQUEsQ0FBQSwwQkFBQSxDQUFBLEdBQW1DLFdBQUEsQ0FBQSxrQkFB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USxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJO1lBQ3RDLFFBQVEsUUFBUTtBQUNaLGdCQUFBLEtBQUEsQ0FBQTtBQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsS0FBSyxDQUFRLElBQUksRUFBRSxLQUE0QixDQUFDLEVBQ2hELElBQUksQ0FDUDtvQkFDRDtBQUNKLGdCQUFBLEtBQUEsQ0FBQTtBQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsUUFBUSxDQUFRLElBQUksRUFBRSxLQUE0QixDQUFDLEVBQ25ELElBQUksQ0FDUDtvQkFDRDtBQUNKLGdCQUFBLEtBQUEsQ0FBQTtBQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsT0FBTyxDQUFRLElBQUksRUFBRSxLQUFtQyxDQUFDLEVBQ3pELElBQUksQ0FDUDtvQkFDRDtBQUNKLGdCQUFBLEtBQUEsQ0FBQTtBQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFRLElBQUksRUFBRSxLQUFtQyxDQUFDLEVBQ3RELElBQUksQ0FDUDtvQkFDRDtBQUNKLGdCQUFBLEtBQUEsQ0FBQTtBQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsWUFBWSxDQUFRLElBQUksRUFBRSxLQUFtQyxDQUFDLEVBQzlELElBQUksQ0FDUDtvQkFDRDtBQUNKLGdCQUFBLEtBQUEsQ0FBQTtBQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsU0FBUyxDQUFRLElBQUksRUFBRSxLQUFtQyxDQUFDLEVBQzNELElBQUksQ0FDUDtvQkFDRDtBQUNKLGdCQUFBLEtBQUEsQ0FBQTtBQUNJLG9CQUFBLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFRLElBQUksRUFB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U0FBUyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQztBQUN2RjtBQUVBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JHO0FBQ0ksZUFBZSxnQkFBZ0IsQ0FDbEMsVUFBK0IsRUFDL0IsTUFBZ0IsRUFDaEIsT0FBeUIsRUFBQTtBQUV6QixJQUFBLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDN0IsSUFBQSxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUM7SUFDckMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDeEcsT0FBTyxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO0FBQ2pFOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9jb2xsZWN0aW9uLyJ9