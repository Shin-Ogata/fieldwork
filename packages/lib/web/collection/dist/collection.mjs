/*!
 * @cdp/collection 0.9.22
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
                this.trigger(event, model, collection, options);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJ1dGlscy9jb21wYXJhdG9yLnRzIiwidXRpbHMvYXJyYXktY3Vyc29yLnRzIiwidXRpbHMvYXJyYXktZWRpdG9yLnRzIiwicXVlcnkvZHluYW1pYy1maWx0ZXJzLnRzIiwicXVlcnkvZHluYW1pYy1jb25kaXRpb24udHMiLCJxdWVyeS9xdWVyeS50cyIsImJhc2UudHMiLCJjb2xsZWN0aW9uLWVkaXRvci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIENPTExFQ1RJT04gPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19DT0xMRUNUSU9OX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUyAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDEsICdpbnZhbGlkIGFjY2Vzcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMiwgJ2ludmFsaWQgY29tcGFyYXRvcnMuJyksXG4gICAgICAgIEVSUk9SX01WQ19FRElUX1BFUk1JU1NJT05fREVOSUVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDMsICdlZGl0aW5nIHBlcm1pc3Npb24gZGVuaWVkLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgQWNjZXNzaWJsZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBnZXRMYW5ndWFnZSB9IGZyb20gJ0BjZHAvaTE4bic7XG5pbXBvcnQgdHlwZSB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouIGB1bmRlZmluZWRgIOOBjOa4oeOBleOCjOOCi+WgtOWQiOOBr+ePvuWcqOioreWumuOBleOCjOOBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiOOBrui/lOWNtOOBruOBv+ihjOOBhlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgb2xkIHtAbGluayBDb2xsYXRvclByb3ZpZGVyfSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyB7QGxpbmsgQ29sbGF0b3JQcm92aWRlcn0g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0Q29sbGF0b3JQcm92aWRlcihuZXdQcm92aWRlcj86IENvbGxhdG9yUHJvdmlkZXIpOiBDb2xsYXRvclByb3ZpZGVyIHtcbiAgICBpZiAobnVsbCA9PSBuZXdQcm92aWRlcikge1xuICAgICAgICByZXR1cm4gX2NvbGxhdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFByb3ZpZGVyID0gX2NvbGxhdG9yO1xuICAgICAgICBfY29sbGF0b3IgPSBuZXdQcm92aWRlcjtcbiAgICAgICAgcmV0dXJuIG9sZFByb3ZpZGVyO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gR2V0IHN0cmluZyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaWh+Wtl+WIl+avlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgLy8gdW5kZWZpbmVkIOOBryAnJyDjgajlkIznrYnjgavmibHjgYZcbiAgICAgICAgY29uc3QgbGhzUHJvcCA9IChudWxsICE9IGxoc1twcm9wXSkgPyBsaHNbcHJvcF0gYXMgc3RyaW5nIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcF0pID8gcmhzW3Byb3BdIGFzIHN0cmluZyA6ICcnO1xuICAgICAgICByZXR1cm4gb3JkZXIgKiBfY29sbGF0b3IoKS5jb21wYXJlKGxoc1Byb3AsIHJoc1Byb3ApO1xuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBkYXRlIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5pel5pmC5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREYXRlQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogQWNjZXNzaWJsZTxUPiwgcmhzOiBBY2Nlc3NpYmxlPFQ+KTogbnVtYmVyID0+IHtcbiAgICAgICAgY29uc3QgbGhzRGF0ZSA9IGxoc1twcm9wXTtcbiAgICAgICAgY29uc3QgcmhzRGF0ZSA9IHJoc1twcm9wXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IEFjY2Vzc2libGU8VD4sIHJoczogQWNjZXNzaWJsZTxUPik6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcF0gPT09IHJoc1twcm9wXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBsaHNbcHJvcF0pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3BdKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChsaHNbcHJvcF0gPCByaHNbcHJvcF0gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSB7QGxpbmsgU29ydEtleX0uXG4gKiBAamEge0BsaW5rIFNvcnRLZXl9IOOCkiBjb21wYXJhdG9yIOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHNvcnRLZXk6IFNvcnRLZXk8Sz4pOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIGNvbnN0IHsgbmFtZSwgdHlwZSwgb3JkZXIgfSA9IHNvcnRLZXk7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIGdldEJvb2xlYW5Db21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBnZXROdW1iZXJDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICByZXR1cm4gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdG8gY29tcGFyYXRvciBhcnJheSBmcm9tIHtAbGluayBTb3J0S2V5fSBhcnJheS5cbiAqIEBqYSB7QGxpbmsgU29ydEtleX0g6YWN5YiX44KSIGNvbXBhcmF0b3Ig6YWN5YiX44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U29ydEtleXM8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4oc29ydEtleXM6IFNvcnRLZXk8Sz5bXSk6IFNvcnRDYWxsYmFjazxUPltdIHtcbiAgICBjb25zdCBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFQ+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNvcnRLZXkgb2Ygc29ydEtleXMpIHtcbiAgICAgICAgY29tcGFyYXRvcnMucHVzaCh0b0NvbXBhcmF0b3Ioc29ydEtleSkpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyYXRvcnM7XG59XG4iLCIvKipcbiAqIEBlbiBDdXJzb3IgcG9zaXRpb24gY29uc3RhbnQuXG4gKiBAamEg44Kr44O844K944Or5L2N572u5a6a5pWwXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIEN1cnNvclBvcyB7XG4gICAgT1VUX09GX1JBTkdFICAgID0gLTEsXG4gICAgQ1VSUkVOVCAgICAgICAgID0gLTIsXG59XG5cbi8qKlxuICogQGVuIFNlZWsgZXhwcmVzc2lvbiBmdW5jdGlvbiB0eXBlLlxuICogQGphIOOCt+ODvOOCr+W8j+mWouaVsOWumue+qVxuICovXG5leHBvcnQgdHlwZSBTZWVrRXhwPFQ+ID0gKHZhbHVlOiBULCBpbmRleD86IG51bWJlciwgb2JqPzogVFtdKSA9PiBib29sZWFuO1xuXG4vKipcbiAqIEBlbiBUaGUgY2xhc3MgcHJvdmlkZXMgY3Vyc29yIGludGVyZmFjZSBmb3IgQXJyYXkuIDxicj5cbiAqICAgICBJdCBpcyBkaWZmZXJlbnQgZnJvbSBJdGVyYXRvciBpbnRlcmZhY2Ugb2YgZXMyMDE1LCBhbmQgdGhhdCBwcm92aWRlcyBpbnRlcmZhY2Ugd2hpY2ggaXMgc2ltaWxhciB0byBEQiByZWNvcmRzZXQncyBvbmUuXG4gKiBAamEgQXJyYXkg55So44Kr44O844K944OrIEkvRiDjgpLmj5DkvpvjgZnjgovjgq/jg6njgrkgPGJyPlxuICogICAgIGVzMjAxNSDjga4gSXRlcmF0b3IgSS9GIOOBqOOBr+eVsOOBquOCiuOAgURCIHJlY29yZHNldCDjgqrjg5bjgrjjgqfjgq/jg4jjg6njgqTjgq/jgarotbDmn7sgSS9GIOOCkuaPkOS+m+OBmeOCi1xuICovXG5leHBvcnQgY2xhc3MgQXJyYXlDdXJzb3I8VCA9IGFueT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAvKiogQGludGVybmFsIOWvvuixoeOBrumFjeWIlyAgKi9cbiAgICBwcml2YXRlIF9hcnJheTogVFtdO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5YWI6aCt44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgICovXG4gICAgcHJpdmF0ZSBfYm9mOiBib29sZWFuO1xuICAgIC8qKiBAaW50ZXJuYWwg6KaB57Sg5aSW44Gu5pyr5bC+44KS56S644GX44Gm44GE44KL44Go44GN44GrIHRydWUgKi9cbiAgICBwcml2YXRlIF9lb2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDnj77lnKjjga4gaW5kZXggKi9cbiAgICBwcml2YXRlIF9pbmRleDogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBhcnJheVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdGlhbEluZGV4XG4gICAgICogIC0gYGVuYCBpbml0aWFsIGluZGV4LiBkZWZhdWx0OiAwXG4gICAgICogIC0gYGphYCDliJ3mnJ/ljJbjgZnjgosgaW5kZXgg44KS5oyH5a6aIGRlZmF1bHQ6IDBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihhcnJheTogVFtdLCBpbml0aWFsSW5kZXggPSAwKSB7XG4gICAgICAgIHRoaXMuX2FycmF5ID0gYXJyYXk7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaW5pdGlhbEluZGV4O1xuICAgICAgICBpZiAodGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXNldCB0YXJnZXQgYXJyYXkuXG4gICAgICogQGphIOWvvuixoeOBruWGjeioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXkuIGRlZmF1bHQ6IGVtcHR5IGFycmF5LlxuICAgICAqICAtIGBqYWAg6LWw5p+75a++6LGh44Gu6YWN5YiX44KS5oyH5a6aLiAgIGRlZmF1bHQ6IOepuumFjeWIl1xuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IENVUlNPUi5PVVRfT0ZfUkFOR0VcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqL1xuICAgIHB1YmxpYyByZXNldChhcnJheTogVFtdID0gW10sIGluaXRpYWxJbmRleDogbnVtYmVyID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRSk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gY3VycmVudCBlbGVtZW50LlxuICAgICAqIEBqYSDnj77lnKjjga7opoHntKDjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgY3VycmVudCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5W3RoaXMuX2luZGV4XTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOaMh+OBl+ekuuOBl+OBpuOBhOOCiyBpbmRleCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGFyZ2V0IGFycmF5IGxlbmd0aC5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gu6KaB57Sg5pWw44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXkubGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBKdWRnZSBCT0Ygb3Igbm90LlxuICAgICAqIEBqYSDopoHntKDlpJbjga7lhYjpoK3jgYvliKTlrppcbiAgICAgKi9cbiAgICBnZXQgaXNCT0YoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ib2Y7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEVPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruacq+WwvuOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0VPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHJhdyBhcnJheSBpbnN0YW5jZS5cbiAgICAgKiBAamEg6LWw5p+75a++6LGh44Gr44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IGFycmF5KCk6IFRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjdXJzb3Igb3BlcmF0aW9uOlxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gZmlyc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVGaXJzdCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBNb3ZlIHRvIGxhc3QgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+6KaB57Sg44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVMYXN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5sZW5ndGggLSAxO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbmV4dCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLmrKHjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZU5leHQoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICBpZiAodGhpcy5fYm9mKSB7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gcHJldmlvdXMgZWxlbWVudCBwb3NpdGlvbi5cbiAgICAgKiBAamEg44Kr44O844K944Or44KS5YmN44G456e75YuVXG4gICAgICovXG4gICAgcHVibGljIG1vdmVQcmV2aW91cygpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9lb2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLmxlbmd0aCAtIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleC0tO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZWVrIGJ5IHBhc3NlZCBjcml0ZXJpYS4gPGJyPlxuICAgICAqICAgICBJZiB0aGUgb3BlcmF0aW9uIGZhaWxlZCwgdGhlIGN1cnNvciBwb3NpdGlvbiBzZXQgdG8gRU9GLlxuICAgICAqIEBqYSDmjIflrprmnaHku7bjgafjgrfjg7zjgq8gPGJyPlxuICAgICAqICAgICDjgrfjg7zjgq/jgavlpLHmlZfjgZfjgZ/loLTlkIjjga8gRU9GIOeKtuaFi+OBq+OBquOCi1xuICAgICAqXG4gICAgICogQHBhcmFtIGNyaXRlcmlhXG4gICAgICogIC0gYGVuYCBpbmRleCBvciBzZWVrIGV4cHJlc3Npb25cbiAgICAgKiAgLSBgamFgIGluZGV4IC8g5p2h5Lu25byP44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHNlZWsoY3JpdGVyaWE6IG51bWJlciB8IFNlZWtFeHA8VD4pOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICgnbnVtYmVyJyA9PT0gdHlwZW9mIGNyaXRlcmlhKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGNyaXRlcmlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSB0aGlzLl9hcnJheS5maW5kSW5kZXgoY3JpdGVyaWEpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy52YWxpZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICog44Kr44O844K944Or44GM5pyJ5Yq544Gq56+E5Zuy44KS56S644GX44Gm44GE44KL44GL5Yik5a6aXG4gICAgICpcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHRydWU6IOacieWKuSAvIGZhbHNlOiDnhKHlirlcbiAgICAgKi9cbiAgICBwcml2YXRlIHZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKDAgPD0gdGhpcy5faW5kZXggJiYgdGhpcy5faW5kZXggPCB0aGlzLl9hcnJheS5sZW5ndGgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuaXF1ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgQ2FuY2VsVG9rZW4sXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IHR5cGUgQXJyYXlDaGFuZ2VSZWNvcmQsIE9ic2VydmFibGVBcnJheSB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcblxuY29uc3Qge1xuICAgIC8qKiBAaW50ZXJuYWwgKi8gdHJ1bmNcbn0gPSBNYXRoO1xuXG4vKiogQGludGVybmFsIHdhaXQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gKi9cbmZ1bmN0aW9uIG1ha2VQcm9taXNlPFQ+KGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+LCByZW1hcD86IFRbXSk6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgZWRpdG9yLm9mZihjYWxsYmFjayk7XG4gICAgICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgICAgICByZW1hcC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIHJlbWFwLnB1c2goLi4uZWRpdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVjb3Jkcyk7XG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5vbihjYWxsYmFjayk7XG4gICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCB0byB7QGxpbmsgT2JzZXJ2YWJsZUFycmF5fSBpZiBuZWVkZWQuICovXG5hc3luYyBmdW5jdGlvbiBnZXRFZGl0Q29udGV4dDxUPihcbiAgICB0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSxcbiAgICB0b2tlbj86IENhbmNlbFRva2VuXG4pOiBQcm9taXNlPHsgZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD47IHByb21pc2U6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT47IH0+IHwgbmV2ZXIge1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yOiB0YXJnZXQsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZSh0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvciA9IE9ic2VydmFibGVBcnJheS5mcm9tKHRhcmdldCk7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcixcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKGVkaXRvciwgdGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsICd0YXJnZXQgaXMgbm90IEFycmF5IG9yIE9ic2VydmFibGVBcnJheS4nKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgdmFsaWQgb3JkZXJzIGluZGV4ICovXG5mdW5jdGlvbiB2YWxpZE9yZGVycyhsZW5ndGg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSk6IGJvb2xlYW4gfCBuZXZlciB7XG4gICAgaWYgKG51bGwgPT0gb3JkZXJzIHx8IG9yZGVycy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBpbmRleCBvZiBvcmRlcnMpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBsZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgb3JkZXJzW10gaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXIgYWxsIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+OBruWFqOWJiumZpFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIHtAbGluayBDYW5jZWxUb2tlbn0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCB7QGxpbmsgQ2FuY2VsVG9rZW59IOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnB1c2goLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBJbnNlcnQgc291cmNlIGVsZW1lbnRzIHRvIHNwZWNpZmllZCBpbmRleCBvZiBhcnJheS5cbiAqIEBqYSDmjIflrprjgZfjgZ/kvY3nva7jgavmjL/lhaVcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zZXJ0QXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZShpbmRleCwgMCwgLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIGFycmF5IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCB7QGxpbmsgQ2FuY2VsVG9rZW59IHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAge0BsaW5rIENhbmNlbFRva2VufSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGByZW9yZGVyQXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAge0BsaW5rIENhbmNlbFRva2VufSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIHtAbGluayBDYW5jZWxUb2tlbn0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZUFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKCF2YWxpZE9yZGVycyh0YXJnZXQubGVuZ3RoLCBvcmRlcnMpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDpmY3poIbjgr3jg7zjg4hcbiAgICBvcmRlcnMuc29ydCgobGhzLCByaHMpID0+IHtcbiAgICAgICAgcmV0dXJuIChsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICBlZGl0b3Iuc3BsaWNlKG9yZGVyLCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbiIsImltcG9ydCB7IHR5cGUgS2V5cywgY29tcHV0ZURhdGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBGaWx0ZXJDYWxsYmFjaywgRHluYW1pY0NvbWJpbmF0aW9uIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQUxMPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBzdHJpbmcgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgVmFsdWVUeXBlQ29tcGFyYWJsZTxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZVN0cmluZzxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8c3RyaW5nLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCB1bmRlZmluZWQ7XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdICE9PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVIgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPiB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1MgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gKGl0ZW1bcHJvcF0gYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUPikgPCB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVJfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAoaXRlbVtwcm9wXSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KSA+PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAoaXRlbVtwcm9wXSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KSA8PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmNsdWRlcyh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9MSUtFICovXG5leHBvcnQgZnVuY3Rpb24gbm90TGlrZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlU3RyaW5nPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gIVN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfTk9UX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NOb3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gIShkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSkpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5SQU5HRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIG1pbjogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPiwgbWF4OiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiBjb21iaW5hdGlvbihEeW5hbWljQ29tYmluYXRpb24uQU5ELCBncmVhdGVyRXF1YWwocHJvcCwgbWluKSwgbGVzc0VxdWFsKHByb3AsIG1heCkpO1xufVxuXG4vKiogQGludGVybmFsIOODleOCo+ODq+OCv+OBruWQiOaIkCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KHR5cGU6IER5bmFtaWNDb21iaW5hdGlvbiwgbGhzOiBGaWx0ZXJDYWxsYmFjazxUPiwgcmhzOiBGaWx0ZXJDYWxsYmFjazxUPiB8IHVuZGVmaW5lZCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gIXJocyA/IGxocyA6IChpdGVtOiBUKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uQU5EOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uT1I6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSB8fCByaHMoaXRlbSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBjb21iaW5hdGlvbjogJHt0eXBlfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIC8vIGZhaWwgc2FmZVxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsImltcG9ydCB0eXBlIHsgS2V5cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgU29ydENhbGxiYWNrLFxuICAgIHR5cGUgRmlsdGVyQ2FsbGJhY2ssXG4gICAgdHlwZSBTb3J0S2V5LFxuICAgIHR5cGUgRHluYW1pY0NvbmRpdGlvblNlZWQsXG4gICAgdHlwZSBEeW5hbWljT3BlcmF0b3JDb250ZXh0LFxuICAgIHR5cGUgRHluYW1pY0xpbWl0Q29uZGl0aW9uLFxuICAgIER5bmFtaWNPcGVyYXRvcixcbiAgICBEeW5hbWljQ29tYmluYXRpb24sXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFZhbHVlVHlwZUFMTCxcbiAgICB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGUsXG4gICAgdHlwZSBWYWx1ZVR5cGVTdHJpbmcsXG4gICAgZXF1YWwsXG4gICAgbm90RXF1YWwsXG4gICAgZ3JlYXRlcixcbiAgICBsZXNzLFxuICAgIGdyZWF0ZXJFcXVhbCxcbiAgICBsZXNzRXF1YWwsXG4gICAgbGlrZSxcbiAgICBub3RMaWtlLFxuICAgIGRhdGVMZXNzRXF1YWwsXG4gICAgZGF0ZUxlc3NOb3RFcXVhbCxcbiAgICByYW5nZSxcbiAgICBjb21iaW5hdGlvbixcbn0gZnJvbSAnLi9keW5hbWljLWZpbHRlcnMnO1xuXG4vKipcbiAqIEBlbiBEeW5hbWljIHF1ZXJ5IGNvbmRpdGlvbiBtYW5hZ2VyIGNsYXNzLlxuICogQGphIOODgOOCpOODiuODn+ODg+OCr+OCr+OCqOODqueKtuaFi+euoeeQhuOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY0NvbmRpdGlvbjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+IGltcGxlbWVudHMgRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+IHtcblxuICAgIHByaXZhdGUgX29wZXJhdG9yczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9jb21iaW5hdGlvbjogRHluYW1pY0NvbWJpbmF0aW9uO1xuICAgIHByaXZhdGUgX3N1bUtleXM6IEtleXM8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfbGltaXQ/OiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+O1xuICAgIHByaXZhdGUgX3JhbmRvbTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9zb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAge0BsaW5rIER5bmFtaWNDb25kaXRpb25TZWVkfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAge0BsaW5rIER5bmFtaWNDb25kaXRpb25TZWVkfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkczogRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+ID0geyBvcGVyYXRvcnM6IFtdIH0pIHtcbiAgICAgICAgY29uc3QgeyBvcGVyYXRvcnMsIGNvbWJpbmF0aW9uLCBzdW1LZXlzLCBsaW1pdCwgcmFuZG9tLCBzb3J0S2V5cyB9ID0gc2VlZHM7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyAgICAgPSBvcGVyYXRvcnM7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uICAgPSBjb21iaW5hdGlvbiA/PyBEeW5hbWljQ29tYmluYXRpb24uQU5EO1xuICAgICAgICB0aGlzLl9zdW1LZXlzICAgICAgID0gc3VtS2V5cyA/PyBbXTtcbiAgICAgICAgdGhpcy5fbGltaXQgICAgICAgICA9IGxpbWl0O1xuICAgICAgICB0aGlzLl9yYW5kb20gICAgICAgID0gISFyYW5kb207XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzICAgICAgPSBzb3J0S2V5cyA/PyBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZFxuXG4gICAgZ2V0IG9wZXJhdG9ycygpOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG5cbiAgICBzZXQgb3BlcmF0b3JzKHZhbHVlczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSkge1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IHN1bUtleXMoKTogKEtleXM8VEl0ZW0+KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1bUtleXM7XG4gICAgfVxuXG4gICAgc2V0IHN1bUtleXModmFsdWVzOiAoS2V5czxUSXRlbT4pW10pIHtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgY29tYmluYXRpb24oKTogRHluYW1pY0NvbWJpbmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbWJpbmF0aW9uO1xuICAgIH1cblxuICAgIHNldCBjb21iaW5hdGlvbih2YWx1ZTogRHluYW1pY0NvbWJpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGxpbWl0KCk6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGltaXQ7XG4gICAgfVxuXG4gICAgc2V0IGxpbWl0KHZhbHVlOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2xpbWl0ID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHJhbmRvbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbTtcbiAgICB9XG5cbiAgICBzZXQgcmFuZG9tKHZhbHVlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3JhbmRvbSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBzb3J0S2V5cygpOiBTb3J0S2V5PFRLZXk+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc29ydEtleXM7XG4gICAgfVxuXG4gICAgc2V0IHNvcnRLZXlzKHZhbHVlczogU29ydEtleTxUS2V5PltdKSB7XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzID0gdmFsdWVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBhY2Nlc3NvcjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29tcGFyYXRvciBmdW5jdGlvbnMuXG4gICAgICogQGphIOavlOi8g+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBjb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gY29udmVydFNvcnRLZXlzKHRoaXMuX3NvcnRLZXlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHN5bnRoZXNpcyBmaWx0ZXIgZnVuY3Rpb24uXG4gICAgICogQGphIOWQiOaIkOa4iOOBv+ODleOCo+ODq+OCv+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBmaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHtcbiAgICAgICAgbGV0IGZsdHI6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbmQgb2YgdGhpcy5fb3BlcmF0b3JzKSB7XG4gICAgICAgICAgICBjb25zdCB7IG9wZXJhdG9yLCBwcm9wLCB2YWx1ZSB9ID0gY29uZDtcbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuR1JFQVRFUjpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVyPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3M8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3NFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWtlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZVN0cmluZzxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVMZXNzRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NOb3RFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+LCBjb25kLnJhbmdlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBvcGVyYXRvcjogJHtvcGVyYXRvcn1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciA/PyAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG4gICAgc29ydCxcbiAgICBzaHVmZmxlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY2hlY2tDYW5jZWxlZCBhcyBjYyB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgdHlwZSBTb3J0S2V5LFxuICAgIHR5cGUgU29ydENhbGxiYWNrLFxuICAgIHR5cGUgRmlsdGVyQ2FsbGJhY2ssXG4gICAgdHlwZSBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICB0eXBlIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgdHlwZSBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIHR5cGUgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBEeW5hbWljTGltaXQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMvY29tcGFyYXRvcic7XG5pbXBvcnQgeyBEeW5hbWljQ29uZGl0aW9uIH0gZnJvbSAnLi9keW5hbWljLWNvbmRpdGlvbic7XG5cbmNvbnN0IHtcbiAgICAvKiogQGludGVybmFsICovIHRydW5jXG59ID0gTWF0aDtcblxuLyoqIEBpbnRlcm5hbCDkvb/nlKjjgZnjgovjg5fjg63jg5Hjg4bjgqPjgYzkv53oqLzjgZXjgozjgZ8gQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMgKi9cbmludGVyZmFjZSBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PiBleHRlbmRzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgc29ydEtleXM6IFNvcnRLZXk8VEtleT5bXTtcbiAgICBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQXBwbHkgYGZpbHRlcmAgYW5kIGBzb3J0IGtleWAgdG8gdGhlIGBpdGVtc2AgZnJvbSB7QGxpbmsgcXVlcnlJdGVtc30oKSByZXN1bHQuXG4gKiBAamEge0BsaW5rIHF1ZXJ5SXRlbXN9KCkg44GX44GfIGBpdGVtc2Ag44Gr5a++44GX44GmIGBmaWx0ZXJgIOOBqCBgc29ydCBrZXlgIOOCkumBqeeUqFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoSXRlbXM8VEl0ZW0+KGl0ZW1zOiBUSXRlbVtdLCBmaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4gfCBudWxsLCAuLi5jb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdKTogVEl0ZW1bXSB7XG4gICAgbGV0IHJlc3VsdCA9IGlzRnVuY3Rpb24oZmlsdGVyKSA/IGl0ZW1zLmZpbHRlcihmaWx0ZXIpIDogaXRlbXMuc2xpY2UoKTtcbiAgICBmb3IgKGNvbnN0IGNvbXBhcmF0b3Igb2YgY29tcGFyYXRvcnMpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29tcGFyYXRvcikpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHNvcnQocmVzdWx0LCBjb21wYXJhdG9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjb25kaXRpbmFsRml4IOOBq+S9v+eUqOOBmeOCiyBDcml0ZXJpYSBNYXAgKi9cbmNvbnN0IF9saW1pdENyaXRlcmlhID0ge1xuICAgIFtEeW5hbWljTGltaXQuQ09VTlRdOiBudWxsLFxuICAgIFtEeW5hbWljTGltaXQuU1VNXTogeyBjb2VmZjogMSB9LFxuICAgIFtEeW5hbWljTGltaXQuU0VDT05EXTogeyBjb2VmZjogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUlOVVRFXTogeyBjb2VmZjogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5IT1VSXTogeyBjb2VmZjogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkRBWV06IHsgY29lZmY6IDI0ICogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LktCXTogeyBjb2VmZjogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUJdOiB7IGNvZWZmOiAxMDI0ICogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuR0JdOiB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LlRCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0ICogMTAyNCB9LFxufTtcblxuLyoqXG4gKiBAZW4gRml4IHRoZSB0YXJnZXQgaXRlbXMgYnkge0BsaW5rIER5bmFtaWNDb25kaXRpb259LlxuICogQGphIHtAbGluayBEeW5hbWljQ29uZGl0aW9ufSDjgavlvpPjgYTlr77osaHjgpLmlbTlvaJcbiAqXG4gKiBAcGFyYW0gaXRlbXNcbiAqICAtIGBlbmAgdGFyZ2V0IGl0ZW1zIChkZXN0cnVjdGl2ZSlcbiAqICAtIGBqYWAg5a++6LGh44Gu44Ki44Kk44OG44OgICjnoLTlo4rnmoQpXG4gKiBAcGFyYW0gY29uZGl0aW9uXG4gKiAgLSBgZW5gIGNvbmRpdGlvbiBvYmplY3RcbiAqICAtIGBqYWAg5p2h5Lu244Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25kaXRpb25hbEZpeDxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+KFxuICAgIGl0ZW1zOiBUSXRlbVtdLFxuICAgIGNvbmRpdGlvbjogRHluYW1pY0NvbmRpdGlvbjxUSXRlbSwgVEtleT5cbik6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+IHtcbiAgICBjb25zdCB7IHJhbmRvbSwgbGltaXQsIHN1bUtleXMgfSA9IGNvbmRpdGlvbjtcblxuICAgIGlmIChyYW5kb20pIHtcbiAgICAgICAgc2h1ZmZsZShpdGVtcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIGNvbnN0IHsgdW5pdCwgdmFsdWUsIHByb3AgfSA9IGxpbWl0O1xuICAgICAgICBjb25zdCByZXNldDogVEl0ZW1bXSA9IFtdO1xuICAgICAgICBjb25zdCBjcml0ZXJpYSA9IF9saW1pdENyaXRlcmlhW3VuaXRdO1xuICAgICAgICBjb25zdCBsaW1pdENvdW50ID0gdmFsdWU7XG4gICAgICAgIGNvbnN0IGV4Y2VzcyA9ICEhbGltaXQuZXhjZXNzO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGlmICghY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIHtcbiAgICAgICAgICAgICAgICBjb3VudCArPSAoTnVtYmVyKGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIC8gY3JpdGVyaWEuY29lZmYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBhY2Nlc3MgcHJvcGVydHk6ICR7cHJvcH1gKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxpbWl0Q291bnQgPCBjb3VudCkge1xuICAgICAgICAgICAgICAgIGlmIChleGNlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXRlbXMgPSByZXNldDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgIGl0ZW1zLFxuICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbSwgS2V5czxUSXRlbT4+O1xuXG4gICAgaWYgKDAgPCBzdW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHN1bUtleXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgaW4gcmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSArPSBOdW1iZXIoaXRlbVtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIOOBmeOBp+OBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBpuOBhOOCi+WvvuixoeOBq+WvvuOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggcXVlcnkg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21DYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBjYWNoZWQ6IFRJdGVtW10sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBmaWx0ZXIsXG4gICAgICAgIGNvbXBhcmF0b3JzLFxuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgICAgIG5vU2VhcmNoLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgLy8g5a++6LGh44Gq44GXXG4gICAgaWYgKCFjYWNoZWQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogMCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG4gICAgfVxuXG4gICAgLy8g44Kt44Oj44OD44K344Ol44Gr5a++44GX44Gm44OV44Kj44Or44K/44Oq44Oz44KwLCDjgr3jg7zjg4jjgpLlrp/ooYxcbiAgICBjb25zdCB0YXJnZXRzID0gbm9TZWFyY2ggPyBjYWNoZWQuc2xpY2UoKSA6IHNlYXJjaEl0ZW1zKGNhY2hlZCwgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSBiYXNlSW5kZXggPz8gMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAkeyBsaW1pdCB9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHRhcmdldHMuc2xpY2UoaW5kZXgsIChudWxsICE9IGxpbWl0KSA/IGluZGV4ICsgbGltaXQgOiB1bmRlZmluZWQpO1xuXG4gICAgICAgIHJlc3VsdHMucHVzaCguLi5pdGVtcyk7XG5cbiAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgdG90YWw6IHRhcmdldHMubGVuZ3RoLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT4sXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0byAmJiBudWxsICE9IGxpbWl0KSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIOODrOOCueODneODs+OCueOBruOCreODo+ODg+OCt+ODpeOCkuippuihjCAqL1xuZnVuY3Rpb24gdHJ5Q2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICByZXN1bHQ6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+LFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPlxuKTogdm9pZCB7XG4gICAgY29uc3QgeyBub0NhY2hlLCBub1NlYXJjaCB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBjYW5DYWNoZSA9ICFub0NhY2hlICYmICFub1NlYXJjaCAmJiByZXN1bHQudG90YWwgJiYgcmVzdWx0LnRvdGFsID09PSByZXN1bHQuaXRlbXMubGVuZ3RoO1xuICAgIGlmIChjYW5DYWNoZSkge1xuICAgICAgICBxdWVyeUluZm8uY2FjaGUgPSB7IC4uLnJlc3VsdCB9O1xuICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGBwcm92aWRlcmAg6Zai5pWw44KS5L2/55So44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBgcXVlcnlgIOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tUHJvdmlkZXI8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG5cbiAgICBjb25zdCByZWNlaXZlZEFsbCA9IChyZXNwOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPik6IGJvb2xlYW4gPT4ge1xuICAgICAgICBjb25zdCBoYXNDb25kID0gISFyZXNwLm9wdGlvbnM/LmNvbmRpdGlvbjtcbiAgICAgICAgcmV0dXJuIGhhc0NvbmQgfHwgcmVzcC50b3RhbCA9PT0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgfTtcblxuICAgIGxldCBpbmRleDogbnVtYmVyID0gYmFzZUluZGV4ID8/IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHtsaW1pdH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGxldCByZXNwID0gYXdhaXQgcHJvdmlkZXIob3B0cyk7XG4gICAgICAgIGNvbnN0IG5leHRPcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cywgcmVzcC5vcHRpb25zKTtcblxuICAgICAgICBpZiAocmVjZWl2ZWRBbGwocmVzcCkpIHtcbiAgICAgICAgICAgIHRyeUNhY2hlKHF1ZXJ5SW5mbywgcmVzcCwgbmV4dE9wdHMpO1xuXG4gICAgICAgICAgICBjb25zdCB7IG5vU2VhcmNoLCBjb25kaXRpb246IHNlZWQgfSA9IG5leHRPcHRzO1xuICAgICAgICAgICAgaWYgKHNlZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kaXRpb24gPSBuZXcgRHluYW1pY0NvbmRpdGlvbihzZWVkKTtcbiAgICAgICAgICAgICAgICByZXNwID0gY29uZGl0aW9uYWxGaXgoc2VhcmNoSXRlbXMoXG4gICAgICAgICAgICAgICAgICAgIHJlc3AuaXRlbXMsXG4gICAgICAgICAgICAgICAgICAgIGNvbmRpdGlvbi5maWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIC4uLmNvbmRpdGlvbi5jb21wYXJhdG9yc1xuICAgICAgICAgICAgICAgICksIGNvbmRpdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLmNhY2hlLCByZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHF1ZXJ5SW5mby5jYWNoZS5vcHRpb25zO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5RnJvbUNhY2hlKHJlc3AuaXRlbXMsIE9iamVjdC5hc3NpZ24ob3B0cywgeyBub1NlYXJjaCB9KSk7XG4gICAgICAgIH0vLyBlc2xpbnQtZGlzYWJsZS1saW5lIEBzdHlsaXN0aWMvYnJhY2Utc3R5bGVcblxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCguLi5yZXNwLml0ZW1zKTtcblxuICAgICAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgICAgIHRvdGFsOiByZXNwLnRvdGFsLFxuICAgICAgICAgICAgICAgIGl0ZW1zOiByZXNwLml0ZW1zLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IG5leHRPcHRzLFxuICAgICAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwLnRvdGFsIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5Q2FjaGUocXVlcnlJbmZvLCByZXR2YWwsIG5leHRPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zIOOBq+WkieaPmyAqL1xuZnVuY3Rpb24gZW5zdXJlT3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4gfCB1bmRlZmluZWRcbik6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBzb3J0S2V5czogW10gfSwgb3B0aW9ucyk7XG4gICAgY29uc3QgeyBub1NlYXJjaCwgc29ydEtleXMgfSA9IG9wdHM7XG5cbiAgICBpZiAoIW5vU2VhcmNoICYmICghb3B0cy5jb21wYXJhdG9ycyB8fCBvcHRzLmNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSkge1xuICAgICAgICBvcHRzLmNvbXBhcmF0b3JzID0gY29udmVydFNvcnRLZXlzKHNvcnRLZXlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0cyBhcyBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT47XG59XG5cbi8qKlxuICogQGVuIExvdyBsZXZlbCBmdW5jdGlvbiBmb3Ige0BsaW5rIENvbGxlY3Rpb259IHF1ZXJ5IGl0ZW1zLlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSBJdGVtIOOCkuOCr+OCqOODquOBmeOCi+S9juODrOODmeODq+mWouaVsFxuICpcbiAqIEBwYXJhbSBxdWVyeUluZm9cbiAqICAtIGBlbmAgcXVlcnkgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg44Kv44Ko44Oq5oOF5aCxXG4gKiBAcGFyYW0gcHJvdmlkZXJcbiAqICAtIGBlbmAgcHJvdmlkZXIgZnVuY3Rpb25cbiAqICAtIGBqYWAg44OX44Ot44OQ44Kk44OA6Zai5pWwXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlJdGVtczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPFRJdGVtW10+IHtcbiAgICBjb25zdCBvcHRzID0gZW5zdXJlT3B0aW9ucyhvcHRpb25zKTtcbiAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSBvcHRzO1xuXG4gICAgLy8gcXVlcnkg44Gr5L2/55So44GX44GfIHNvcnQsIGZpbHRlciDmg4XloLHjgpLjgq3jg6Pjg4Pjgrfjg6VcbiAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mbywgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9KTtcblxuICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgcmV0dXJuIChhd2FpdCBxdWVyeUZyb21DYWNoZShxdWVyeUluZm8uY2FjaGUuaXRlbXMsIG9wdHMpKS5pdGVtcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbVByb3ZpZGVyKHF1ZXJ5SW5mbywgcHJvdmlkZXIsIG9wdHMpKS5pdGVtcztcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25PYmplY3QsXG4gICAgdHlwZSBBbnlPYmplY3QsXG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgQ29uc3RydWN0b3IsXG4gICAgdHlwZSBDbGFzcyxcbiAgICB0eXBlIEtleXMsXG4gICAgaXNOdWxsaXNoLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIGx1aWQsXG4gICAgYXQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgU2lsZW5jZWFibGUsXG4gICAgdHlwZSBTdWJzY3JpYmFibGUsXG4gICAgRXZlbnRCcm9rZXIsXG4gICAgRXZlbnRTb3VyY2UsXG4gICAgRXZlbnRQdWJsaXNoZXIsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgdHlwZSBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHR5cGUgU3luY0NvbnRleHQsIGRlZmF1bHRTeW5jIH0gZnJvbSAnQGNkcC9kYXRhLXN5bmMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIE1vZGVsLFxuICAgIHR5cGUgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIHR5cGUgTW9kZWxTYXZlT3B0aW9ucyxcbiAgICBpc01vZGVsLFxufSBmcm9tICdAY2RwL21vZGVsJztcbmltcG9ydCB0eXBlIHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvblNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25TZWVkLFxuICAgIENvbGxlY3Rpb25FdmVudCxcbiAgICBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWRkT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uU2V0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUmVTb3J0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uVXBkYXRlT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBzZWFyY2hJdGVtcywgcXVlcnlJdGVtcyB9IGZyb20gJy4vcXVlcnknO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9wcm9wZXJ0aWVzICAgICAgICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yID0gU3ltYm9sKCdjcmVhdGUtaXRlcmFibGUtaXRlcmF0b3InKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3ByZXBhcmVNb2RlbCAgICAgICAgICAgPSBTeW1ib2woJ3ByZXBhcmUtbW9kZWwnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlbW92ZU1vZGVscyAgICAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1tb2RlbHMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2FkZFJlZmVyZW5jZSAgICAgICAgICAgPSBTeW1ib2woJ2FkZC1yZWZlcmVuY2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3JlbW92ZVJlZmVyZW5jZSAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1yZWZlcmVuY2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX29uTW9kZWxFdmVudCAgICAgICAgICAgPSBTeW1ib2woJ21vZGVsLWV2ZW50LWhhbmRsZXInKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PiB7XG4gICAgcmVhZG9ubHkgY29uc3RydWN0T3B0aW9uczogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VCwgSz47XG4gICAgcmVhZG9ubHkgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VCwgSz47XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgcXVlcnlPcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxULCBLPjtcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VCwgSz47XG4gICAgcmVhZG9ubHkgbW9kZWxPcHRpb25zOiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM7XG4gICAgcmVhZG9ubHkgYnlJZDogTWFwPHN0cmluZywgVD47XG4gICAgc3RvcmU6IFRbXTtcbiAgICBhZnRlckZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFQ+O1xufVxuXG4vKiogQGludGVybmFsIHJlc2V0IG1vZGVsIGNvbnRleHQgKi9cbmNvbnN0IHJlc2V0TW9kZWxTdG9yZSA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4oY29udGV4dDogUHJvcGVydHk8VCwgSz4pOiB2b2lkID0+IHtcbiAgICBjb250ZXh0LmJ5SWQuY2xlYXIoKTtcbiAgICBjb250ZXh0LnN0b3JlLmxlbmd0aCA9IDA7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVTb3J0T3B0aW9ucyA9IDxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ob3B0aW9uczogQ29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+KTogUmVxdWlyZWQ8Q29sbGVjdGlvblNvcnRPcHRpb25zPFQsIEs+PiA9PiB7XG4gICAgY29uc3QgeyBzb3J0S2V5czoga2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBvcHRpb25zO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNvcnRLZXlzOiBrZXlzID8/IFtdLFxuICAgICAgICBjb21wYXJhdG9yczogY29tcHMgPz8gY29udmVydFNvcnRLZXlzKGtleXMgPz8gW10pLFxuICAgIH07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtb2RlbElkQXR0cmlidXRlID0gPFQgZXh0ZW5kcyBvYmplY3Q+KGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gKGN0b3IgYXMgYW55KT8uaWRBdHRyaWJ1dGUgPz8gJ2lkJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldE1vZGVsSWQgPSA8VCBleHRlbmRzIG9iamVjdD4oYXR0cnM6IEFjY2Vzc2libGU8VCwgc3RyaW5nPiwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBhdHRyc1ttb2RlbElkQXR0cmlidXRlKGN0b3IpXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldENoYW5nZWRJZHMgPSA8VCBleHRlbmRzIG9iamVjdD4ob2JqOiBvYmplY3QsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogeyBpZDogc3RyaW5nOyBwcmV2SWQ/OiBzdHJpbmc7IH0gfCB1bmRlZmluZWQgPT4ge1xuICAgIHR5cGUgTW9kZWxMaWtlID0gQWNjZXNzaWJsZTx7IHByZXZpb3VzOiAoa2V5OiBzdHJpbmcpID0+IHN0cmluZzsgfT47XG4gICAgY29uc3QgbW9kZWwgPSBvYmogYXMgTW9kZWxMaWtlO1xuXG4gICAgY29uc3QgaWRBdHRyaWJ1dGUgPSBtb2RlbElkQXR0cmlidXRlKGN0b3IpO1xuICAgIGNvbnN0IGlkID0gbW9kZWxbaWRBdHRyaWJ1dGVdO1xuICAgIGlmICghaXNTdHJpbmcoaWQpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaWQ6IG1vZGVsW2lkQXR0cmlidXRlXSBhcyBzdHJpbmcsIHByZXZJZDogaXNGdW5jdGlvbihtb2RlbC5wcmV2aW91cykgPyBtb2RlbC5wcmV2aW91cyhpZEF0dHJpYnV0ZSkgOiB1bmRlZmluZWQgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsQ29uc3RydWN0b3IgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiBDbGFzcyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgcmV0dXJuIChzZWxmLmNvbnN0cnVjdG9yIGFzIGFueSkubW9kZWw7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBpc0NvbGxlY3Rpb25Nb2RlbCA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oeDogdW5rbm93biwgc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IHggaXMgVCA9PiB7XG4gICAgY29uc3QgY3RvciA9IG1vZGVsQ29uc3RydWN0b3Ioc2VsZik7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24oY3RvcikgPyB4IGluc3RhbmNlb2YgY3RvciA6IGZhbHNlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3BsaWNlQXJyYXkgPSA8VD4odGFyZ2V0OiBUW10sIGluc2VydDogVFtdLCBhdDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgYXQgPSBNYXRoLm1pbihNYXRoLm1heChhdCwgMCksIHRhcmdldC5sZW5ndGgpO1xuICAgIHRhcmdldC5zcGxpY2UoYXQsIDAsIC4uLmluc2VydCk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwYXJzZUZpbHRlckFyZ3M8VCBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogdW5rbm93bltdKTogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPiB7XG4gICAgY29uc3QgW2ZpbHRlciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChudWxsID09IGZpbHRlcikge1xuICAgICAgICByZXR1cm4ge307XG4gICAgfSBlbHNlIGlmICghaXNGdW5jdGlvbihmaWx0ZXIpKSB7XG4gICAgICAgIHJldHVybiBmaWx0ZXIgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywgeyBmaWx0ZXIgfSkgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3NldE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiB0cnVlLCBtZXJnZTogdHJ1ZSB9O1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkT3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlIH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIGNvbGxlY3Rpb24gdGhhdCBpcyBvcmRlcmVkIHNldHMgb2YgbW9kZWxzLlxuICogQGphIE1vZGVsIOOBrumbhuWQiOOCkuaJseOBhiBDb2xsZWN0aW9uIOOBruWfuuW6leOCr+ODqeOCueWumue+qS5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7XG4gKiAgICAgTW9kZWwsXG4gKiAgICAgTW9kZWxDb25zdHJ1Y3RvcixcbiAqICAgICBDb2xsZWN0aW9uLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gKiAgICAgQ29sbGVjdGlvblNlZWQsXG4gKiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogLy8gTW9kZWwgc2NoZW1hXG4gKiBpbnRlcmZhY2UgVHJhY2tBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgdGl0bGU6IHN0cmluZztcbiAqICAgYXJ0aXN0OiBzdHJpbmc7XG4gKiAgIGFsYnVtOiAgc3RyaW5nO1xuICogICByZWxlYXNlRGF0ZTogRGF0ZTtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIE1vZGVsIGRlZmluaXRpb25cbiAqIGNvbnN0IFRyYWNrQmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8VHJhY2tBdHRyaWJ1dGU+LCBUcmFja0F0dHJpYnV0ZT47XG4gKiBjbGFzcyBUcmFjayBleHRlbmRzIFRyYWNrQmFzZSB7XG4gKiAgICAgc3RhdGljIGlkQXR0cmlidXRlID0gJ3VyaSc7XG4gKiB9XG4gKlxuICogLy8gQ29sbGVjdGlvbiBkZWZpbml0aW9uXG4gKiBjbGFzcyBQbGF5bGlzdCBleHRlbmRzIENvbGxlY3Rpb248VHJhY2s+IHtcbiAqICAgICAvLyBzZXQgdGFyZ2V0IE1vZGVsIGNvbnN0cnVjdG9yXG4gKiAgICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsID0gVHJhY2s7XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIHVzZSBjdXN0b20gY29udGVudCBwcm92aWRlciBmb3IgZmV0Y2guXG4gKiAgICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMoXG4gKiAgICAgICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUcmFjaz5cbiAqICAgICApOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICogICAgICAgICAvLyBzb21lIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGhlcmUuXG4gKiAgICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgY3VzdG9tUHJvdmlkZXIob3B0aW9ucyk7XG4gKiAgICAgICAgIHJldHVybiB7XG4gKiAgICAgICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICogICAgICAgICAgICAgaXRlbXMsXG4gKiAgICAgICAgICAgICBvcHRpb25zLFxuICogICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0PjtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIGNvbnZlcnQgYSByZXNwb25zZSBpbnRvIGEgbGlzdCBvZiBtb2RlbHMuXG4gKiAgICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBDb2xsZWN0aW9uU2VlZFtdKTogVHJhY2tBdHRyaWJ1dGVbXSB7XG4gKiAgICAgICAgIHJldHVybiByZXNwb25zZS5tYXAoc2VlZCA9PiB7XG4gKiAgICAgICAgICAgICBjb25zdCBkYXRlID0gc2VlZC5yZWxlYXNlRGF0ZTtcbiAqICAgICAgICAgICAgIHNlZWQucmVsZWFzZURhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAqICAgICAgICAgICAgIHJldHVybiBzZWVkO1xuICogICAgICAgICB9KSBhcyBUcmFja0F0dHJpYnV0ZVtdO1xuICogICAgICB9XG4gKiB9XG4gKlxuICogbGV0IHNlZWRzOiBUcmFja0F0dHJpYnV0ZVtdO1xuICpcbiAqIGNvbnN0IHBsYXlsaXN0ID0gbmV3IFBsYXlsaXN0KHNlZWRzLCB7XG4gKiAgICAgLy8gZGVmYXVsdCBxdWVyeSBvcHRpb25zXG4gKiAgICAgcXVlcnlPcHRpb25zOiB7XG4gKiAgICAgICAgIHNvcnRLZXlzOiBbXG4gKiAgICAgICAgICAgICB7IG5hbWU6ICd0aXRsZScsIG9yZGVyOiBTb3J0T3JkZXIuREVTQywgdHlwZTogJ3N0cmluZycgfSxcbiAqICAgICAgICAgXSxcbiAqICAgICB9XG4gKiB9KTtcbiAqXG4gKiBhd2FpdCBwbGF5bGlzdC5yZXF1ZXJ5KCk7XG4gKlxuICogZm9yIChjb25zdCB0cmFjayBvZiBwbGF5bGlzdCkge1xuICogICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRyYWNrLnRvSlNPTigpKSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbGxlY3Rpb248XG4gICAgVE1vZGVsIGV4dGVuZHMgb2JqZWN0ID0gYW55LFxuICAgIFRFdmVudCBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUTW9kZWw+ID0gQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4sXG4gICAgVEtleSBleHRlbmRzIEtleXM8VE1vZGVsPiA9IEtleXM8VE1vZGVsPlxuPiBleHRlbmRzIEV2ZW50U291cmNlPFRFdmVudD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUTW9kZWw+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb2RlbCBjb25zdHJ1Y3Rvci4gPGJyPlxuICAgICAqICAgICBUaGUgY29uc3RydWN0b3IgaXMgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoaXMge0BsaW5rIENvbGxlY3Rpb259IGNsYXNzIGZvciBgVE1vZGVsYCBjb25zdHJ1Y3Rpb24uXG4gICAgICogQGphIE1vZGVsIOOCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gICAgICogICAgIHtAbGluayBDb2xsZWN0aW9ufSDjgq/jg6njgrnjgYwgYFRNb2RlbGAg44KS5qeL56+J44GZ44KL44Gf44KB44Gr5L2/55So44GZ44KLXG4gICAgICovXG4gICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsPzogQ2xhc3M7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBbX3Byb3BlcnRpZXNdOiBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gY29uc3RydWN0aW9uL2Rlc3RydWN0aW9uOlxuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29uc3RydWN0aW9uIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmp4vnr4njgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkcz86IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBtb2RlbE9wdGlvbnM6IHt9LCBxdWVyeU9wdGlvbnM6IHt9IH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIGNvbnN0IHsgbW9kZWxPcHRpb25zLCBxdWVyeU9wdGlvbnMgfSA9IG9wdHM7XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10gPSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RPcHRpb25zOiBvcHRzLFxuICAgICAgICAgICAgcHJvdmlkZXI6IG9wdHMucHJvdmlkZXIgPz8gdGhpcy5zeW5jLmJpbmQodGhpcyksXG4gICAgICAgICAgICBjaWQ6IGx1aWQoJ2NvbGxlY3Rpb246JywgOCksXG4gICAgICAgICAgICBxdWVyeU9wdGlvbnMsXG4gICAgICAgICAgICBxdWVyeUluZm86IHt9LFxuICAgICAgICAgICAgbW9kZWxPcHRpb25zLFxuICAgICAgICAgICAgYnlJZDogbmV3IE1hcDxzdHJpbmcsIFRNb2RlbD4oKSxcbiAgICAgICAgICAgIHN0b3JlOiBbXSxcbiAgICAgICAgfSBhcyB1bmtub3duIGFzIFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbiAgICAgICAgdGhpcy5pbml0UXVlcnlJbmZvKCk7XG5cbiAgICAgICAgLyogbW9kZWwgZXZlbnQgaGFuZGxlciAqL1xuICAgICAgICAodGhpcyBhcyBhbnkpW19vbk1vZGVsRXZlbnRdID0gKGV2ZW50OiBzdHJpbmcsIG1vZGVsOiBUTW9kZWwgfCB1bmRlZmluZWQsIGNvbGxlY3Rpb246IHRoaXMsIG9wdGlvbnM6IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoZXZlbnQpICYmIGV2ZW50LnN0YXJ0c1dpdGgoJ0AnKSAmJiBtb2RlbCkge1xuICAgICAgICAgICAgICAgIGlmICgoJ0BhZGQnID09PSBldmVudCB8fCAnQHJlbW92ZScgPT09IGV2ZW50KSAmJiBjb2xsZWN0aW9uICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdAZGVzdHJveScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0gKGNvbGxlY3Rpb24gYXMgYW55KTtcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IHRoaXM7ICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnQGNoYW5nZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzOyAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICAgICAgICAgIGlmICgnQGNoYW5nZScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHMgPSBnZXRDaGFuZ2VkSWRzKG1vZGVsLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCBwcmV2SWQgfSA9IGlkcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldklkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBwcmV2SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuZGVsZXRlKHByZXZJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gZGVsZWdhdGUgZXZlbnRcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBhbnkpLnRyaWdnZXIoZXZlbnQsIG1vZGVsLCBjb2xsZWN0aW9uLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2VlZHMpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIEluaXRpYWxpemUgcXVlcnkgaW5mb1xuICAgICAqIEBqYSDjgq/jgqjjg6rmg4XloLHjga7liJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaW5pdFF1ZXJ5SW5mbygpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKHRoaXMuX2RlZmF1bHRRdWVyeU9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9xdWVyeUluZm8gPSB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlZCBhbGwgaW5zdGFuY2VzIGFuZCBldmVudCBsaXN0ZW5lciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44KS56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyAocmVzZXJ2ZWQpLlxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzICjkuojntIQpXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2Uob3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdGhpcyB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IFtdO1xuICAgICAgICB0aGlzLmluaXRRdWVyeUluZm8oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBqYSBDbGVhciBjYWNoZSBpbnN0YW5jZSBtZXRob2RcbiAgICAgKiBAamEg44Kt44Oj44OD44K344Ol44Gu56C05qOEXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9xdWVyeUluZm8uY2FjaGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OIIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbW9kZWxzLlxuICAgICAqIEBqYSBNb2RlbCDjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgbW9kZWxzKCk6IHJlYWRvbmx5IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3QgeyBfcXVlcnlGaWx0ZXIsIF9hZnRlckZpbHRlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAoX2FmdGVyRmlsdGVyICYmIF9hZnRlckZpbHRlciAhPT0gX3F1ZXJ5RmlsdGVyKSA/IHN0b3JlLmZpbHRlcihfYWZ0ZXJGaWx0ZXIpIDogc3RvcmU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG51bWJlciBvZiBtb2RlbHMuXG4gICAgICogQGphIOWGheWMheOBmeOCiyBNb2RlbCDmlbBcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVscy5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGFwcGxpZWQgYWZ0ZXItZmlsdGVyLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jgYzpgannlKjjgZXjgozjgabjgYTjgovjgYvjgpLliKTlrppcbiAgICAgKi9cbiAgICBnZXQgZmlsdGVyZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgQ29sbGVjdGlvblF1ZXJ5SW5mb30gaW5zdGFuY2VcbiAgICAgKiBAamEge0BsaW5rIENvbGxlY3Rpb25RdWVyeUluZm99IOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5SW5mbygpOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgQ29sbGVjdGlvblF1ZXJ5SW5mb30gaW5zdGFuY2VcbiAgICAgKiBAamEge0BsaW5rIENvbGxlY3Rpb25RdWVyeUluZm99IOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBzZXQgX3F1ZXJ5SW5mbyh2YWw6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5Pikge1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8gPSB2YWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjcmVhdGluZyBvcHRpb25zLlxuICAgICAqIEBqYSDmp4vnr4nmmYLjga7jgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9vcHRpb25zKCk6IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY29uc3RydWN0T3B0aW9ucztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcHJvdmlkZXIuXG4gICAgICogQGphIOaXouWumuOBruODl+ODreODkOOCpOODgOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3Byb3ZpZGVyKCk6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5wcm92aWRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcGFyc2UgYmVoYXZpb3VyLlxuICAgICAqIEBqYSDml6Llrprjga4gcGFyc2Ug5YuV5L2c44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfZGVmYXVsdFBhcnNlKCk6IGJvb2xlYW4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3B0aW9ucy5wYXJzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGRlZmF1bHQgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5pei5a6a44Gu44Kv44Ko44Oq44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfZGVmYXVsdFF1ZXJ5T3B0aW9ucygpOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5T3B0aW9ucztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGxhc3QgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5pyA5b6M44Gu44Kv44Ko44Oq44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfbGFzdFF1ZXJ5T3B0aW9ucygpOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgICAgICBjb25zdCBvcHRzOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+ID0ge307XG5cbiAgICAgICAgc29ydEtleXMubGVuZ3RoICYmIChvcHRzLnNvcnRLZXlzID0gc29ydEtleXMpO1xuICAgICAgICBjb21wYXJhdG9ycy5sZW5ndGggJiYgKG9wdHMuY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycyk7XG4gICAgICAgIGZpbHRlciAmJiAob3B0cy5maWx0ZXIgPSBmaWx0ZXIpO1xuXG4gICAgICAgIHJldHVybiBvcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gc29ydCBjb21wYXJhdG9ycy5cbiAgICAgKiBAamEg44K944O844OI55So5q+U6LyD6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY29tcGFyYXRvcnMoKTogU29ydENhbGxiYWNrPFRNb2RlbD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBxdWVyeS1maWx0ZXIuXG4gICAgICogQGphIOOCr+OCqOODqueUqOODleOCo+ODq+OCv+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5RmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmZpbHRlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIGFmdGVyLWZpbHRlci5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfYWZ0ZXJGaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcjtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiB1dGlsc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBhIG1vZGVsIGZyb20gYSBjb2xsZWN0aW9uLCBzcGVjaWZpZWQgYnkgYW4gYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlLlxuICAgICAqIEBqYSBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrnjgYvjgokgTW9kZWwg44KS54m55a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGdldChzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHNlZWQpICYmIGJ5SWQuaGFzKHNlZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gYnlJZC5nZXQoc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpZCA9IGdldE1vZGVsSWQoaXNNb2RlbChzZWVkKSA/IHNlZWQudG9KU09OKCkgOiBzZWVkIGFzIG9iamVjdCwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSk7XG4gICAgICAgIGNvbnN0IGNpZCA9IChzZWVkIGFzIG9iamVjdCBhcyB7IF9jaWQ/OiBzdHJpbmc7IH0pLl9jaWQ7XG5cbiAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KGlkKSA/PyAoY2lkICYmIGJ5SWQuZ2V0KGNpZCkpIGFzIFRNb2RlbCB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIG1vZGVsIGlzIGluIHRoZSBjb2xsZWN0aW9uIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJIE1vZGVsIOOCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoc2VlZDogc3RyaW5nIHwgb2JqZWN0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuZ2V0KHNlZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIE1vZGVsIOWxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogb2JqZWN0W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5tb2RlbHMubWFwKG0gPT4gaXNNb2RlbChtKSA/IG0udG9KU09OKCkgOiBtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZXMgQ2xvbmUgdGhpcyBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Gu6KSH6KO944KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUoKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgY29uc3RydWN0b3IsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikodGhpc1tfcHJvcGVydGllc10uc3RvcmUsIF9vcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yY2UgYSBjb2xsZWN0aW9uIHRvIHJlLXNvcnQgaXRzZWxmLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOimgee0oOOBruWGjeOCveODvOODiFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNvcnQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOOCveODvOODiOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzb3J0KG9wdGlvbnM/OiBDb2xsZWN0aW9uUmVTb3J0T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCB7IG5vVGhyb3csIHNpbGVudCB9ID0gb3B0cztcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnM6IGNvbXBzIH0gPSBlbnN1cmVTb3J0T3B0aW9ucyhvcHRzKTtcbiAgICAgICAgY29uc3QgY29tcGFyYXRvcnMgPSAwIDwgY29tcHMubGVuZ3RoID8gY29tcHMgOiB0aGlzLl9jb21wYXJhdG9ycztcblxuICAgICAgICBpZiAoY29tcGFyYXRvcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgIGlmIChub1Rocm93KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0NPTVBBUkFUT1JTLCAnQ2Fubm90IHNvcnQgYSBzZXQgd2l0aG91dCBhIGNvbXBhcmF0b3IuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IHNlYXJjaEl0ZW1zKHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLCB0aGlzLl9hZnRlckZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBxdWVyeUluZm9cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnM7XG4gICAgICAgIGlmICgwIDwgc29ydEtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uc29ydEtleXMgPSBzb3J0S2V5cztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc29ydCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQXBwbHkgYWZ0ZXItZmlsdGVyIHRvIGNvbGxlY3Rpb24gaXRzZWxmLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqICAtIGBlbmAgZmlsdGVyIGNhbGxiYWNrLlxuICAgICAqICAtIGBqYWAg44OV44Kj44Or44K/44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFNpbGVuY2VhYmxlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBTaWxlbmNlYWJsZSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyKGNhbGxiYWNrOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkLCBvcHRpb25zPzogU2lsZW5jZWFibGUpOiB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGx5IGFmdGVyLWZpbHRlciB0byBjb2xsZWN0aW9uIGl0c2VsZi5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWZ0ZXItZmlsdGVyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDntZ7jgorovrzjgb/jgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlsdGVyKG9wdGlvbnM6IENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnM8VE1vZGVsPik6IHRoaXM7XG5cbiAgICBwdWJsaWMgZmlsdGVyKC4uLmFyZ3M6IHVua25vd25bXSk6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRzID0gcGFyc2VGaWx0ZXJBcmdzKC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCB7IGZpbHRlciwgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBpZiAoZmlsdGVyICE9PSB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcikge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BmaWx0ZXInLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIG1vZGVsIGF0IHRoZSBnaXZlbiBpbmRleC4gSWYgbmVnYXRpdmUgdmFsdWUgaXMgZ2l2ZW4sIHRoZSB0YXJnZXQgd2lsbCBiZSBmb3VuZCBmcm9tIHRoZSBsYXN0IGluZGV4LlxuICAgICAqIEBqYSDjgqTjg7Pjg4fjg4Pjgq/jgrnmjIflrprjgavjgojjgosgTW9kZWwg44G444Gu44Ki44Kv44K744K5LiDosqDlgKTjga7loLTlkIjjga/mnKvlsL7mpJzntKLjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBUTW9kZWwge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5tb2RlbHMgYXMgVE1vZGVsW10sIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBtb2RlbC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5pyA5Yid44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IFRNb2RlbCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIGBjb3VudGAgZWxlbWVudHMgb2YgdGhlIG1vZGVsIGZyb20gdGhlIGZpcnN0LlxuICAgICAqIEBqYSBNb2RlbCDjga7lhYjpoK3jgYvjgolgY291bnRgIOWIhuOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdChjb3VudDogbnVtYmVyKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgZmlyc3QoY291bnQ/OiBudW1iZXIpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLm1vZGVscztcbiAgICAgICAgaWYgKG51bGwgPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHMuc2xpY2UoMCwgY291bnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBtb2RlbC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5pyA5Yid44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoKTogVE1vZGVsIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdmFsdWUgb2YgYGNvdW50YCBlbGVtZW50cyBvZiB0aGUgbW9kZWwgZnJvbSB0aGUgbGFzdC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5YWI6aCt44GL44KJYGNvdW50YCDliIbjga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdChjb3VudDogbnVtYmVyKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgbGFzdChjb3VudD86IG51bWJlcik6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMubW9kZWxzO1xuICAgICAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHNbdGFyZ2V0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzLnNsaWNlKC0xICogY291bnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogc3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnZlcnRzIGEgcmVzcG9uc2UgaW50byB0aGUgaGFzaCBvZiBhdHRyaWJ1dGVzIHRvIGJlIGBzZXRgIG9uIHRoZSBjb2xsZWN0aW9uLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyBqdXN0IHRvIHBhc3MgdGhlIHJlc3BvbnNlIGFsb25nLlxuICAgICAqIEBqYSDjg6zjgrnjg53jg7Pjgrnjga7lpInmj5vjg6Hjgr3jg4Pjg4kuIOaXouWumuOBp+OBr+S9leOCguOBl+OBquOBhFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBDb2xsZWN0aW9uU2VlZCB8IENvbGxlY3Rpb25TZWVkW10gfCB2b2lkLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW10gfCB1bmRlZmluZWQgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgVE1vZGVsW107XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFRoZSB7QGxpbmsgQ29sbGVjdGlvbi5mZXRjaH0gbWV0aG9kIHByb3h5IHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIHtAbGluayBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyfSByZXR1cm5zIG9uZS1zaG90IHJlc3VsdC5cbiAgICAgKiBAamEge0BsaW5rIENvbGxlY3Rpb25JdGVtUHJvdmlkZXJ9IOS6kuaPm+OBruWNmOeZuuOBriB7QGxpbmsgQ29sbGVjdGlvbi5mZXRjaH0g57WQ5p6c44KS6L+U5Y20LiDlv4XopoHjgavlv5zjgZjjgabjgqrjg7zjg5Djg7zjg6njgqTjg4nlj6/og70uXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb24gb2JqZWN0XG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgYXN5bmMgc3luYyhvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxBbnlPYmplY3Q+PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgZGVmYXVsdFN5bmMoKS5zeW5jKCdyZWFkJywgdGhpcyBhcyBTeW5jQ29udGV4dCwgb3B0aW9ucykgYXMgVE1vZGVsW107XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8QW55T2JqZWN0PjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRmV0Y2ggdGhlIHtAbGluayBNb2RlbH0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIHtAbGluayBNb2RlbH0g5bGe5oCn44Gu44K144O844OQ44O85ZCM5pyfLiDjg6zjgrnjg53jg7Pjgrnjga7jg57jg7zjgrjjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBmZXRjaCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44OV44Kn44OD44OB44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGZldGNoKG9wdGlvbnM/OiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4pOiBQcm9taXNlPFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXT4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHByb2dyZXNzOiBub29wLCBwYXJzZTogdGhpcy5fZGVmYXVsdFBhcnNlIH0sIHRoaXMuX2RlZmF1bHRRdWVyeU9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHByb2dyZXNzOiBvcmlnaW5hbCwgbGltaXQsIHJlc2V0LCBub0NhY2hlIH0gPSBvcHRzO1xuICAgICAgICAgICAgY29uc3QgeyBfcXVlcnlJbmZvLCBfcHJvdmlkZXIgfSA9IHRoaXM7XG4gICAgICAgICAgICBjb25zdCBmaW5hbGl6ZSA9IChudWxsID09IGxpbWl0KTtcblxuICAgICAgICAgICAgb3B0cy5wcm9ncmVzcyA9IChpbmZvOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRNb2RlbD4pID0+IHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbChpbmZvKTtcbiAgICAgICAgICAgICAgICAhZmluYWxpemUgJiYgdGhpcy5hZGQoaW5mby5pdGVtcywgb3B0cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAobm9DYWNoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJDYWNoZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZpbmFsaXplICYmIHJlc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldCh1bmRlZmluZWQsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgcXVlcnlJdGVtcyhfcXVlcnlJbmZvLCBfcHJvdmlkZXIsIG9wdHMpO1xuXG4gICAgICAgICAgICBpZiAoZmluYWxpemUpIHtcbiAgICAgICAgICAgICAgICByZXNldCA/IHRoaXMucmVzZXQocmVzcCwgb3B0cykgOiB0aGlzLmFkZChyZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHN5bmMnLCB0aGlzIGFzIENvbGxlY3Rpb24sIHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BlcnJvcicsIHVuZGVmaW5lZCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBlIGFzIEVycm9yLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBgZmV0Y2goKWAgd2l0aCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOWJjeWbnuOBqOWQjOadoeS7tuOBpyBgZmV0Y2goKWAg44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVxdWVyeSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlcXVlcnkob3B0aW9ucz86IENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyk6IFByb21pc2U8VE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9sYXN0UXVlcnlPcHRpb25zLCBvcHRpb25zLCB7IHJlc2V0OiB0cnVlIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaChvcHRzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBjb2xsZWN0aW9uIHNldHVwXG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIENvbGxlY3Rpb24g44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgasgTW9kZWwg44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYQgTW9kZWwg44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBOdWxsaXNoIHZhbHVlLlxuICAgICAqICAtIGBqYWAgTnVsbGlzaCDopoHntKBcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWQ6IHVuZGVmaW5lZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBqyBNb2RlbCDjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhCBNb2RlbCDjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZHM6IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdO1xuXG4gICAgcHVibGljIHNldChzZWVkcz86IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkIHwgVE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdIHwgdm9pZCB7XG4gICAgICAgIGlmIChpc051bGxpc2goc2VlZHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHBhcnNlOiB0aGlzLl9kZWZhdWx0UGFyc2UgfSwgX3NldE9wdGlvbnMsIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGlmIChvcHRzLnBhcnNlICYmICFpc0NvbGxlY3Rpb25Nb2RlbChzZWVkcywgdGhpcykpIHtcbiAgICAgICAgICAgIHNlZWRzID0gdGhpcy5wYXJzZShzZWVkcywgb3B0aW9ucykgPz8gW107XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXM6IChUTW9kZWwgfCBvYmplY3QgfCB1bmRlZmluZWQpW10gPSBzaW5ndWxhciA/IFtzZWVkc10gOiAoc2VlZHMgYXMgb2JqZWN0W10pLnNsaWNlKCk7XG5cbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG5cbiAgICAgICAgY29uc3QgYXQgPSAoKGNhbmRpZGF0ZSk6IG51bWJlciB8IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA+IHN0b3JlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgKz0gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGNhbmRpZGF0ZSA8IDApID8gMCA6IGNhbmRpZGF0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkob3B0cy5hdCk7XG5cbiAgICAgICAgY29uc3Qgc2V0OiBvYmplY3RbXSAgICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvQWRkOiBUTW9kZWxbXSAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b01lcmdlOiBUTW9kZWxbXSAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9SZW1vdmU6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGNvbnN0IG1vZGVsU2V0ID0gbmV3IFNldDxvYmplY3Q+KCk7XG5cbiAgICAgICAgY29uc3QgeyBhZGQsIG1lcmdlLCByZW1vdmUsIHBhcnNlLCBzaWxlbnQgfSA9IG9wdHM7XG5cbiAgICAgICAgbGV0IHNvcnQgPSBmYWxzZTtcbiAgICAgICAgY29uc3Qgc29ydGFibGUgPSB0aGlzLl9jb21wYXJhdG9ycy5sZW5ndGggJiYgbnVsbCA9PSBhdCAmJiBmYWxzZSAhPT0gb3B0cy5zb3J0O1xuXG4gICAgICAgIGludGVyZmFjZSBNb2RlbEZlYXR1cmUge1xuICAgICAgICAgICAgcGFyc2U6IChhdHJyPzogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiBvYmplY3Q7XG4gICAgICAgICAgICBzZXRBdHRyaWJ1dGVzOiAoYXRycjogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiB2b2lkO1xuICAgICAgICAgICAgaGFzQ2hhbmdlZDogKCkgPT4gYm9vbGVhbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFR1cm4gYmFyZSBvYmplY3RzIGludG8gbW9kZWwgcmVmZXJlbmNlcywgYW5kIHByZXZlbnQgaW52YWxpZCBtb2RlbHMgZnJvbSBiZWluZyBhZGRlZC5cbiAgICAgICAgZm9yIChjb25zdCBbaSwgaXRlbV0gb2YgaXRlbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAvLyBJZiBhIGR1cGxpY2F0ZSBpcyBmb3VuZCwgcHJldmVudCBpdCBmcm9tIGJlaW5nIGFkZGVkIGFuZCBvcHRpb25hbGx5IG1lcmdlIGl0IGludG8gdGhlIGV4aXN0aW5nIG1vZGVsLlxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmdldChpdGVtKSBhcyBNb2RlbEZlYXR1cmU7XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVyZ2UgJiYgaXRlbSAhPT0gZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJzID0gaXNNb2RlbChpdGVtKSA/IGl0ZW0udG9KU09OKCkgOiBpdGVtO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2UgJiYgaXNGdW5jdGlvbihleGlzdGluZy5wYXJzZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzID0gZXhpc3RpbmcucGFyc2UoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZXhpc3Rpbmcuc2V0QXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nLnNldEF0dHJpYnV0ZXMoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihleGlzdGluZywgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdG9NZXJnZS5wdXNoKGV4aXN0aW5nIGFzIFRNb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3J0YWJsZSAmJiAhc29ydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydCA9IGlzRnVuY3Rpb24oZXhpc3RpbmcuaGFzQ2hhbmdlZCkgPyBleGlzdGluZy5oYXNDaGFuZ2VkKCkgOiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKGV4aXN0aW5nKSkge1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQoZXhpc3RpbmcpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGl0ZW1zW2ldID0gZXhpc3Rpbmc7XG4gICAgICAgICAgICB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHN0eWxpc3RpYy9icmFjZS1zdHlsZVxuXG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmV3LCB2YWxpZCBtb2RlbCwgcHVzaCBpdCB0byB0aGUgYHRvQWRkYCBsaXN0LlxuICAgICAgICAgICAgZWxzZSBpZiAoYWRkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBpdGVtc1tpXSA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oaXRlbSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQWRkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19hZGRSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxTZXQuYWRkKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBzdGFsZSBtb2RlbHMuXG4gICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGVsU2V0Lmhhcyhtb2RlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9SZW1vdmUucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXNbX3JlbW92ZU1vZGVsc10odG9SZW1vdmUsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2VlIGlmIHNvcnRpbmcgaXMgbmVlZGVkLCB1cGRhdGUgYGxlbmd0aGAgYW5kIHNwbGljZSBpbiBuZXcgbW9kZWxzLlxuICAgICAgICBsZXQgb3JkZXJDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHJlcGxhY2UgPSAhc29ydGFibGUgJiYgYWRkICYmIHJlbW92ZTtcbiAgICAgICAgaWYgKHNldC5sZW5ndGggJiYgcmVwbGFjZSkge1xuICAgICAgICAgICAgb3JkZXJDaGFuZ2VkID0gKHN0b3JlLmxlbmd0aCAhPT0gc2V0Lmxlbmd0aCkgfHwgc3RvcmUuc29tZSgobSwgaW5kZXgpID0+IG0gIT09IHNldFtpbmRleF0pO1xuICAgICAgICAgICAgc3RvcmUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCBzZXQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHRvQWRkLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHNvcnRhYmxlKSB7XG4gICAgICAgICAgICAgICAgc29ydCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgdG9BZGQsIGF0ID8/IHN0b3JlLmxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaWxlbnRseSBzb3J0IHRoZSBjb2xsZWN0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICBpZiAoc29ydCkge1xuICAgICAgICAgICAgdGhpcy5zb3J0KHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sZXNzIHNpbGVuY2VkLCBpdCdzIHRpbWUgdG8gZmlyZSBhbGwgYXBwcm9wcmlhdGUgYWRkL3NvcnQvdXBkYXRlIGV2ZW50cy5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2ksIG1vZGVsXSBvZiB0b0FkZC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBhdCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gYXQgKyBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQGFkZCcsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAYWRkJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvcnQgfHwgb3JkZXJDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvQWRkLmxlbmd0aCB8fCB0b1JlbW92ZS5sZW5ndGggfHwgdG9NZXJnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZGVkOiB0b0FkZCxcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZDogdG9SZW1vdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lcmdlZDogdG9NZXJnZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkcm9wIHVuZGVmaW5lZFxuICAgICAgICBjb25zdCByZXR2YWwgPSBpdGVtcy5maWx0ZXIoaSA9PiBudWxsICE9IGkpIGFzIFRNb2RlbFtdO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgYWRkZWQgKG9yIG1lcmdlZCkgbW9kZWwgKG9yIG1vZGVscykuXG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJldHZhbFswXSA6IChyZXR2YWwubGVuZ3RoID8gcmV0dmFsIDogdm9pZCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBhIGNvbGxlY3Rpb24gd2l0aCBhIG5ldyBsaXN0IG9mIG1vZGVscyAob3IgYXR0cmlidXRlIGhhc2hlcyksIHRyaWdnZXJpbmcgYSBzaW5nbGUgYHJlc2V0YCBldmVudCBvbiBjb21wbGV0aW9uLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOCkuaWsOOBl+OBhCBNb2RlbCDkuIDopqfjgafnva7mj5suIOWujOS6huaZguOBqyBgcmVzZXRgIOOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44K744OD44OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KHNlZWRzPzogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMgJiB7IHByZXZpb3VzOiBUTW9kZWxbXTsgfTtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cy5wcmV2aW91cyA9IHN0b3JlLnNsaWNlKCk7XG4gICAgICAgIHJlc2V0TW9kZWxTdG9yZSh0aGlzW19wcm9wZXJ0aWVzXSk7XG5cbiAgICAgICAgY29uc3QgbW9kZWxzID0gc2VlZHMgPyB0aGlzLmFkZChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSkgOiBbXTtcblxuICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAcmVzZXQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vZGVscztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG1vZGVsIHRvIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBuOOBriBNb2RlbCDjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGQoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHRvIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiBAamEgTW9kZWwg44Oq44K544OI5oyH5a6a44Gr44KI44KLIENvbGxlY3Rpb24g44G444Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkczogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWxbXSB8IENvbGxlY3Rpb25TZWVkW107XG5cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZCB8IFRNb2RlbFtdIHwgQ29sbGVjdGlvblNlZWRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldChzZWVkcyBhcyBVbmtub3duT2JqZWN0LCBPYmplY3QuYXNzaWduKHsgbWVyZ2U6IGZhbHNlIH0sIG9wdGlvbnMsIF9hZGRPcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjgYvjgokgTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVtb3ZlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDliYrpmaTjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBsaXN0IG9mIG1vZGVscyBmcm9tIHRoZSBzZXQuXG4gICAgICogQGphIE1vZGVsIOODquOCueODiOaMh+WumuOBq+OCiOOCiyBDb2xsZWN0aW9uIOOBi+OCieOBruWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBzaW5ndWxhciA/IFtzZWVkcyBhcyBUTW9kZWxdIDogKHNlZWRzIGFzIFRNb2RlbFtdKS5zbGljZSgpO1xuICAgICAgICBjb25zdCByZW1vdmVkID0gdGhpc1tfcmVtb3ZlTW9kZWxzXShpdGVtcywgb3B0cyk7XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHsgYWRkZWQ6IFtdLCBtZXJnZWQ6IFtdLCByZW1vdmVkIH07XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2luZ3VsYXIgPyByZW1vdmVkWzBdIDogcmVtb3ZlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgbW9kZWwgdG8gdGhlIGVuZCBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+44GrIE1vZGVsIOOCkui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHB1c2goc2VlZDogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkIHtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiB0aGlzLmFkZChzZWVkLCBPYmplY3QuYXNzaWduKHsgYXQ6IHN0b3JlLmxlbmd0aCB9LCBvcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIGVuZCBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5pyr5bC+44GuIE1vZGVsIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFNpbGVuY2VhYmxlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBTaWxlbmNlYWJsZSDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcG9wKG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoc3RvcmVbc3RvcmUubGVuZ3RoIC0gMV0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBtb2RlbCB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3jgasgTW9kZWwg44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5zaGlmdChzZWVkOiBUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2VlZCwgT2JqZWN0LmFzc2lnbih7IGF0OiAwIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3jga4gTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzaGlmdChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHN0b3JlWzBdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIGEgbW9kZWwgaW4gdGhpcyBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgTW9kZWwg44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQ44GXLCBDb2xsZWN0aW9uIOOBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJzXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGVzIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWxnuaAp+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBtb2RlbCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjcmVhdGUoYXR0cnM6IG9iamVjdCwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHdhaXQgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzW19wcmVwYXJlTW9kZWxdKGF0dHJzLCBvcHRpb25zIGFzIFNpbGVuY2VhYmxlKTtcbiAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbW9kZWwgPSBpc01vZGVsKHNlZWQpID8gc2VlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCF3YWl0IHx8ICFtb2RlbCkge1xuICAgICAgICAgICAgdGhpcy5hZGQoc2VlZCwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb2RlbC5zYXZlKHVuZGVmaW5lZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGVycm9yJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgZSBhcyBFcnJvciwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbW9kZWwgcHJlcGFyYXRpb24gKi9cbiAgICBwcml2YXRlIFtfcHJlcGFyZU1vZGVsXShhdHRyczogb2JqZWN0IHwgVE1vZGVsIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChpc0NvbGxlY3Rpb25Nb2RlbChhdHRycywgdGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRycztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBtb2RlbE9wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBuZXcgY29uc3RydWN0b3IoYXR0cnMsIG9wdHMpIGFzIHsgdmFsaWRhdGU6ICgpID0+IFJlc3VsdDsgfTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKG1vZGVsLnZhbGlkYXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1vZGVsLnZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGludmFsaWQnLCBhdHRycyBhcyBNb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCByZXN1bHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb2RlbCBhcyBUTW9kZWw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwbGFpbiBvYmplY3RcbiAgICAgICAgcmV0dXJuIGF0dHJzIGFzIFRNb2RlbDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCBjYWxsZWQgYnkgYm90aCByZW1vdmUgYW5kIHNldC4gKi9cbiAgICBwcml2YXRlIFtfcmVtb3ZlTW9kZWxzXShtb2RlbHM6IFRNb2RlbFtdLCBvcHRpb25zOiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHJlbW92ZWQ6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgbWRsIG9mIG1vZGVscykge1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSB0aGlzLmdldChtZGwpO1xuICAgICAgICAgICAgaWYgKCFtb2RlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXhPZihtb2RlbCk7XG4gICAgICAgICAgICBzdG9yZS5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVmZXJlbmNlcyBiZWZvcmUgdHJpZ2dlcmluZyAncmVtb3ZlJyBldmVudCB0byBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AuXG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCB0cnVlKTtcblxuICAgICAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQHJlbW92ZScsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZW1vdmVkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIGNyZWF0ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX2FkZFJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoX2NpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsICh0aGlzIGFzIGFueSlbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gc2V2ZXIgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwsIHBhcnRpYWwgPSBmYWxzZSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoX2NpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcnRpYWwgJiYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcExpc3RlbmluZyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgKHRoaXMgYXMgYW55KVtfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUTW9kZWw+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2Yge0BsaW5rIEVsZW1lbnRCYXNlfSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosge0BsaW5rIEVsZW1lbnRCYXNlfSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUTW9kZWw+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzLm1vZGVscyxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFRNb2RlbD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yIGFzIEl0ZXJhdG9yPFRNb2RlbD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5KGlkKSwgdmFsdWUobW9kZWwpIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpZCksIHZhbHVlKG1vZGVsKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgVE1vZGVsXT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaWQpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKHtAbGluayBFbGVtZW50QmFzZX0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKHtAbGluayBFbGVtZW50QmFzZX0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMubW9kZWxzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwb3Mya2V5ID0gKHBvczogbnVtYmVyKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBnZXRNb2RlbElkKGNvbnRleHQuYmFzZVtwb3NdIGFzIEFjY2Vzc2libGU8VE1vZGVsLCBzdHJpbmc+LCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKSB8fCBTdHJpbmcocG9zKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IocG9zMmtleShjdXJyZW50KSwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yO1xuICAgIH1cbn1cblxuLy8gbWl4aW4g44Gr44KI44KLIGBpbnN0YW5jZW9mYCDjga/nhKHlirnjgavoqK3lrppcbnNldE1peENsYXNzQXR0cmlidXRlKENvbGxlY3Rpb24gYXMgQ2xhc3MsICdpbnN0YW5jZU9mJywgbnVsbCk7XG4iLCJpbXBvcnQgdHlwZSB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHsgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgdHlwZSB7IExpc3RDaGFuZ2VkLCBMaXN0RWRpdE9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBjbGVhckFycmF5LFxuICAgIGFwcGVuZEFycmF5LFxuICAgIGluc2VydEFycmF5LFxuICAgIHJlb3JkZXJBcnJheSxcbiAgICByZW1vdmVBcnJheSxcbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgdHlwZSB7IENvbGxlY3Rpb24gfSBmcm9tICcuL2Jhc2UnO1xuXG4vKipcbiAqIEBlbiBFZGl0ZWQgY29sbGVjdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEg6KKr57eo6ZuGIENvbGxlY3Rpb24g44Gu5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIENvbGxlY3Rpb25FZGl0ZWU8TSBleHRlbmRzIG9iamVjdD4gPSBDb2xsZWN0aW9uPE0sIGFueSwgYW55PjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHByZXBhcmU8VCBleHRlbmRzIG9iamVjdD4oY29sbGVjdGlvbjogQ29sbGVjdGlvbjxUPik6IFRbXSB8IG5ldmVyIHtcbiAgICBpZiAoY29sbGVjdGlvbi5maWx0ZXJlZCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19FRElUX1BFUk1JU1NJT05fREVOSUVELCAnY29sbGVjdGlvbiBpcyBhcHBsaWVkIGFmdGVyLWZpbHRlci4nKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24ubW9kZWxzLnNsaWNlKCk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmFzeW5jIGZ1bmN0aW9uIGV4ZWM8VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxUPixcbiAgICBvcHRpb25zOiBMaXN0RWRpdE9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgb3BlcmF0aW9uOiAodGFyZ2V0czogVFtdLCB0b2tlbjogQ2FuY2VsVG9rZW4gfCB1bmRlZmluZWQpID0+IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4sXG4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBjb25zdCB0YXJnZXRzID0gcHJlcGFyZTxUPihjb2xsZWN0aW9uKTtcbiAgICBjb25zdCBjaGFuZ2UgPSBhd2FpdCBvcGVyYXRpb24odGFyZ2V0cywgb3B0aW9ucz8uY2FuY2VsKTtcbiAgICBjb2xsZWN0aW9uLnNldCh0YXJnZXRzLCBvcHRpb25zKTtcbiAgICByZXR1cm4gY2hhbmdlO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBtaW4oaW5kaWNlczogbnVtYmVyW10pOiBudW1iZXIge1xuICAgIHJldHVybiBpbmRpY2VzLnJlZHVjZSgobGhzLCByaHMpID0+IE1hdGgubWluKGxocywgcmhzKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIG1ha2VMaXN0Q2hhbmdlZDxUPihcbiAgICB0eXBlOiAnYWRkJyB8ICdyZW1vdmUnIHwgJ3Jlb3JkZXInLFxuICAgIGNoYW5nZXM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10sXG4gICAgcmFuZ2VGcm9tOiBudW1iZXIsXG4gICAgcmFuZ2VUbzogbnVtYmVyLFxuICAgIGF0PzogbnVtYmVyLFxuKTogTGlzdENoYW5nZWQ8VD4ge1xuICAgIGNvbnN0IGNoYW5nZWQgPSAhIWNoYW5nZXMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIGxpc3Q6IGNoYW5nZXMsXG4gICAgICAgIHJhbmdlOiBjaGFuZ2VkID8geyBmcm9tOiByYW5nZUZyb20sIHRvOiByYW5nZVRvIH0gOiB1bmRlZmluZWQsXG4gICAgICAgIGluc2VydGVkVG86IGNoYW5nZWQgPyBhdCA6IHVuZGVmaW5lZCxcbiAgICB9IGFzIExpc3RDaGFuZ2VkPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgZWxlbWVudHMgb2Yge0BsaW5rIENvbGxlY3Rpb259LlxuICogQGphIHtAbGluayBDb2xsZWN0aW9ufSDopoHntKDjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQge0BsaW5rIENvbGxlY3Rpb259XG4gKiAgLSBgamFgIOWvvuixoSB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IHJlZmVyZW5jZS5cbiAqICAtIGBqYWAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYXJDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlVG8gPSBjb2xsZWN0aW9uLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBjbGVhckFycmF5KHRhcmdldHMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVtb3ZlJywgY2hhbmdlcywgMCwgcmFuZ2VUbyk7XG59XG5cbi8qKlxuICogQGVuIEFwcGVuZCBzb3VyY2UgZWxlbWVudHMgdG8gdGhlIGVuZCBvZiB7QGxpbmsgQ29sbGVjdGlvbn0uXG4gKiBAamEge0BsaW5rIENvbGxlY3Rpb259IOOBruacq+WwvuOBq+i/veWKoFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCB7QGxpbmsgQ29sbGVjdGlvbn1cbiAqICAtIGBqYWAg5a++6LGhIHtAbGluayBDb2xsZWN0aW9ufVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZENvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBzcmM6IFRbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gY29sbGVjdGlvbi5sZW5ndGg7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiBhcHBlbmRBcnJheSh0YXJnZXRzLCBzcmMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgnYWRkJywgY2hhbmdlcywgcmFuZ2VGcm9tLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIHJhbmdlRnJvbSk7XG59XG5cbi8qKlxuICogQGVuIEluc2VydCBzb3VyY2UgZWxlbWVudHMgdG8gc3BlY2lmaWVkIGluZGV4IG9mIHtAbGluayBDb2xsZWN0aW9ufS5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g44Gu5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc2VydENvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBpbmRleDogbnVtYmVyLFxuICAgIHNyYzogVFtdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGluc2VydEFycmF5KHRhcmdldHMsIGluZGV4LCBzcmMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgnYWRkJywgY2hhbmdlcywgaW5kZXgsIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgaW5kZXgpO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIHtAbGluayBDb2xsZWN0aW9ufSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIENvbGxlY3Rpb25FZGl0T3B0aW9uc30gcmVmZXJlbmNlLlxuICogIC0gYGphYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIGluZGV4OiBudW1iZXIsXG4gICAgb3JkZXJzOiBudW1iZXJbXSxcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VGcm9tID0gbWluKFtpbmRleCwgLi4ub3JkZXJzXSk7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiByZW9yZGVyQXJyYXkodGFyZ2V0cywgaW5kZXgsIG9yZGVycywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW9yZGVyJywgY2hhbmdlcywgcmFuZ2VGcm9tLCBjb2xsZWN0aW9uLmxlbmd0aCAtIDEsIGluZGV4KTtcbn1cblxuLyoqXG4gKiBAZW4gUmVtb3ZlIHtAbGluayBDb2xsZWN0aW9ufSBlbGVtZW50cy5cbiAqIEBqYSB7QGxpbmsgQ29sbGVjdGlvbn0g6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IHtAbGluayBDb2xsZWN0aW9ufVxuICogIC0gYGphYCDlr77osaEge0BsaW5rIENvbGxlY3Rpb259XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgQ29sbGVjdGlvbkVkaXRPcHRpb25zfSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIHtAbGluayBDb2xsZWN0aW9uRWRpdE9wdGlvbnN9IOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZUNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBvcmRlcnM6IG51bWJlcltdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBtaW4ob3JkZXJzKTtcbiAgICBjb25zdCByYW5nZVRvID0gY29sbGVjdGlvbi5sZW5ndGggLSAxO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gcmVtb3ZlQXJyYXkodGFyZ2V0cywgb3JkZXJzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3JlbW92ZScsIGNoYW5nZXMsIHJhbmdlRnJvbSwgcmFuZ2VUbyk7XG59XG4iXSwibmFtZXMiOlsidHJ1bmMiLCJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7O0FBR0c7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFBQSxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUE7QUFBQSxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLHdCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsd0JBQWlEO1FBQ2pELFdBQUEsQ0FBQSxXQUFBLENBQUEsMEJBQUEsQ0FBQSxHQUFtQyxXQUFBLENBQUEsa0JBQWtCLENBQUEsR0FBQSw2QkFBdUIsRUFB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QyxPQUFPLEVBQUUsS0FBSyxLQUFLLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3JHLElBQUEsT0FBTyxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDO0FBQ3ZGO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtQkc7QUFDSSxlQUFlLGdCQUFnQixDQUNsQyxVQUErQixFQUMvQixLQUFhLEVBQ2IsR0FBUSxFQUNSLE9BQXlCLEVBQUE7SUFFekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzVHLElBQUEsT0FBTyxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDO0FBQy9FO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtQkc7QUFDSSxlQUFlLGlCQUFpQixDQUNuQyxVQUErQixFQUMvQixLQUFhLEVBQ2IsTUFBZ0IsRUFDaEIsT0FBeUIsRUFBQTtJQUV6QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztJQUN6QyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDaEgsSUFBQSxPQUFPLGVBQWUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUM7QUFDdkY7QUFFQTs7Ozs7Ozs7Ozs7Ozs7OztBQWdCRztBQUNJLGVBQWUsZ0JBQWdCLENBQ2xDLFVBQStCLEVBQy9CLE1BQWdCLEVBQ2hCLE9BQXlCLEVBQUE7QUFFekIsSUFBQSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQzdCLElBQUEsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDO0lBQ3JDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxLQUFLLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3hHLE9BQU8sZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQztBQUNqRTs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvY29sbGVjdGlvbi8ifQ==