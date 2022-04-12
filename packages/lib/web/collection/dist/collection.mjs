/*!
 * @cdp/collection 0.9.11
 *   generic collection scheme
 */

import { getLanguage } from '@cdp/i18n';
import { unique, computeDate, isFunction, sort, shuffle, setMixClassAttribute, luid, isString, at, noop, isNil, isArray } from '@cdp/core-utils';
import { checkCanceled } from '@cdp/promise';
import { ObservableArray } from '@cdp/observable';
import { makeResult, RESULT_CODE, FAILED } from '@cdp/result';
import { EventSource, EventBroker, EventPublisher } from '@cdp/events';
import { defaultSync } from '@cdp/data-sync';
import { isModel } from '@cdp/model';

/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
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
    return new Intl.Collator(getLanguage(), { sensitivity: 'base', numeric: true });
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
 *  - `en` [[CancelToken]] reference. (enable `undefined`)
 *  - `ja` [[CancelToken]] を指定 (undefined 可)
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

const { 
/** @internal */ trunc } = Math;
//__________________________________________________________________________________________________//
/**
 * @en Apply `filter` and `sort key` to the `items` from [[queryItems]]`()` result.
 * @ja [[queryItems]]`()` した `items` に対して `filter` と `sort key` を適用
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
    let index = (null != baseIndex) ? baseIndex : 0;
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
    let index = (null != baseIndex) ? baseIndex : 0;
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
        } // eslint-disable-line brace-style
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
    if (!isString(id)) {
        return undefined;
    }
    return { id: model[idAttribute], prevId: isFunction(model.previous) ? model.previous(idAttribute) : undefined };
};
/** @internal */
const modelConstructor = (self) => {
    return self.constructor['model'];
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
class Collection extends EventSource {
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
        if (isString(seed) && byId.has(seed)) {
            return byId.get(seed);
        }
        const id = getModelId(isModel(seed) ? seed.toJSON() : seed, modelConstructor(this));
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
        const opts = options || {};
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
        const items = await defaultSync().sync('read', this, options);
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
        const opts = Object.assign({ progress: noop }, this._defaultQueryOptions, options);
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
        if (isNil(seeds)) {
            return;
        }
        const opts = Object.assign({ parse: this._defaultParse }, _setOptions, options);
        if (opts.parse && !isCollectionModel(seeds, this)) {
            seeds = this.parse(seeds, options) || [];
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
        const { wait } = options || {};
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

export { ArrayCursor, Collection, DynamicCondition, appendArray, appendCollection, clearArray, clearCollection, conditionalFix, convertSortKeys, defaultCollatorProvider, getBooleanComparator, getDateComparator, getGenericComparator, getNumberComparator, getStringComparator, insertArray, insertCollection, queryItems, removeArray, removeCollection, reorderArray, reorderCollection, searchItems, toComparator };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJ1dGlscy9jb21wYXJhdG9yLnRzIiwidXRpbHMvYXJyYXktY3Vyc29yLnRzIiwidXRpbHMvYXJyYXktZWRpdG9yLnRzIiwicXVlcnkvZHluYW1pYy1maWx0ZXJzLnRzIiwicXVlcnkvZHluYW1pYy1jb25kaXRpb24udHMiLCJxdWVyeS9xdWVyeS50cyIsImJhc2UudHMiLCJjb2xsZWN0aW9uLWVkaXRvci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIENPTExFQ1RJT04gPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19DT0xMRUNUSU9OX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUyAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDEsICdpbnZhbGlkIGFjY2Vzcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMiwgJ2ludmFsaWQgY29tcGFyYXRvcnMuJyksXG4gICAgICAgIEVSUk9SX01WQ19FRElUX1BFUk1JU1NJT05fREVOSUVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDMsICdlZGl0aW5nIHBlcm1pc3Npb24gZGVuaWVkLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgW1tDb2xsYXRvclByb3ZpZGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBbW0NvbGxhdG9yUHJvdmlkZXJdXSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRDb2xsYXRvclByb3ZpZGVyKG5ld1Byb3ZpZGVyPzogQ29sbGF0b3JQcm92aWRlcik6IENvbGxhdG9yUHJvdmlkZXIge1xuICAgIGlmIChudWxsID09IG5ld1Byb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiBfY29sbGF0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvdmlkZXIgPSBfY29sbGF0b3I7XG4gICAgICAgIF9jb2xsYXRvciA9IG5ld1Byb3ZpZGVyO1xuICAgICAgICByZXR1cm4gb2xkUHJvdmlkZXI7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBHZXQgc3RyaW5nIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5paH5a2X5YiX5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHJpbmdDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBULCByaHM6IFQpOiBudW1iZXIgPT4ge1xuICAgICAgICAvLyB1bmRlZmluZWQg44GvICcnIOOBqOWQjOetieOBq+aJseOBhlxuICAgICAgICBjb25zdCBsaHNQcm9wID0gKG51bGwgIT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkgPyBsaHNbcHJvcCBhcyBzdHJpbmddIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcCBhcyBzdHJpbmddKSA/IHJoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgcmV0dXJuIG9yZGVyICogX2NvbGxhdG9yKCkuY29tcGFyZShsaHNQcm9wLCByaHNQcm9wKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZGF0ZSBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaXpeaZguavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IGxoc0RhdGUgPSBsaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBjb25zdCByaHNEYXRlID0gcmhzW3Byb3AgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcCBhcyBzdHJpbmddID09PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAobGhzW3Byb3AgYXMgc3RyaW5nXSA8IHJoc1twcm9wIGFzIHN0cmluZ10gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSBbW1NvcnRLZXldXS5cbiAqIEBqYSBbW1NvcnRLZXldXSDjgpIgY29tcGFyYXRvciDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5OiBTb3J0S2V5PEs+KTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICBjb25zdCB7IG5hbWUsIHR5cGUsIG9yZGVyIH0gPSBzb3J0S2V5O1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiBnZXRCb29sZWFuQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gZ2V0TnVtYmVyQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgcmV0dXJuIGdldERhdGVDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgYXJyYXkgZnJvbSBbW1NvcnRLZXldXSBhcnJheS5cbiAqIEBqYSBbW1NvcnRLZXldXSDphY3liJfjgpIgY29tcGFyYXRvciDphY3liJfjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTb3J0S2V5czxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5czogU29ydEtleTxLPltdKTogU29ydENhbGxiYWNrPFQ+W10ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VD5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc29ydEtleSBvZiBzb3J0S2V5cykge1xuICAgICAgICBjb21wYXJhdG9ycy5wdXNoKHRvQ29tcGFyYXRvcihzb3J0S2V5KSk7XG4gICAgfVxuICAgIHJldHVybiBjb21wYXJhdG9ycztcbn1cbiIsIi8qKlxuICogQGVuIEN1cnNvciBwb3NpdGlvbiBjb25zdGFudC5cbiAqIEBqYSDjgqvjg7zjgr3jg6vkvY3nva7lrprmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3Vyc29yUG9zIHtcbiAgICBPVVRfT0ZfUkFOR0UgICAgPSAtMSxcbiAgICBDVVJSRU5UICAgICAgICAgPSAtMixcbn1cblxuLyoqXG4gKiBAZW4gU2VlayBleHByZXNzaW9uIGZ1bmN0aW9uIHR5cGUuXG4gKiBAamEg44K344O844Kv5byP6Zai5pWw5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIFNlZWtFeHA8VD4gPSAodmFsdWU6IFQsIGluZGV4PzogbnVtYmVyLCBvYmo/OiBUW10pID0+IGJvb2xlYW47XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBwcm92aWRlcyBjdXJzb3IgaW50ZXJmYWNlIGZvciBBcnJheS4gPGJyPlxuICogICAgIEl0IGlzIGRpZmZlcmVudCBmcm9tIEl0ZXJhdG9yIGludGVyZmFjZSBvZiBlczIwMTUsIGFuZCB0aGF0IHByb3ZpZGVzIGludGVyZmFjZSB3aGljaCBpcyBzaW1pbGFyIHRvIERCIHJlY29yZHNldCdzIG9uZS5cbiAqIEBqYSBBcnJheSDnlKjjgqvjg7zjgr3jg6sgSS9GIOOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgZXMyMDE1IOOBriBJdGVyYXRvciBJL0Yg44Go44Gv55Ww44Gq44KK44CBREIgcmVjb3Jkc2V0IOOCquODluOCuOOCp+OCr+ODiOODqeOCpOOCr+OBqui1sOafuyBJL0Yg44KS5o+Q5L6b44GZ44KLXG4gKi9cbmV4cG9ydCBjbGFzcyBBcnJheUN1cnNvcjxUID0gYW55PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKiBAaW50ZXJuYWwg5a++6LGh44Gu6YWN5YiXICAqL1xuICAgIHByaXZhdGUgX2FycmF5OiBUW107XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7lhYjpoK3jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAgKi9cbiAgICBwcml2YXRlIF9ib2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7mnKvlsL7jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2VvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOePvuWcqOOBriBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IDBcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogMFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFycmF5OiBUW10sIGluaXRpYWxJbmRleCA9IDApIHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHRhcmdldCBhcnJheS5cbiAgICAgKiBAamEg5a++6LGh44Gu5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheS4gZGVmYXVsdDogZW1wdHkgYXJyYXkuXG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrpouICAgZGVmYXVsdDog56m66YWN5YiXXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KGFycmF5OiBUW10gPSBbXSwgaW5pdGlhbEluZGV4OiBudW1iZXIgPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBjdXJyZW50IGVsZW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBjdXJyZW50KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXlbdGhpcy5faW5kZXhdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo5oyH44GX56S644GX44Gm44GE44KLIGluZGV4IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0YXJnZXQgYXJyYXkgbGVuZ3RoLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjga7opoHntKDmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEJPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruWFiOmgreOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0JPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgRU9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5pyr5bC+44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRU9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcmF3IGFycmF5IGluc3RhbmNlLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgYXJyYXkoKTogVFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGN1cnNvciBvcGVyYXRpb246XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBmaXJzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUZpcnN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbGFzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUxhc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5Lmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBuZXh0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuasoeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTmV4dCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9ib2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBwcmV2aW91cyBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLliY3jgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZVByZXZpb3VzKCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2VvZikge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4LS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNlZWsgYnkgcGFzc2VkIGNyaXRlcmlhLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBvcGVyYXRpb24gZmFpbGVkLCB0aGUgY3Vyc29yIHBvc2l0aW9uIHNldCB0byBFT0YuXG4gICAgICogQGphIOaMh+WumuadoeS7tuOBp+OCt+ODvOOCryA8YnI+XG4gICAgICogICAgIOOCt+ODvOOCr+OBq+WkseaVl+OBl+OBn+WgtOWQiOOBryBFT0Yg54q25oWL44Gr44Gq44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY3JpdGVyaWFcbiAgICAgKiAgLSBgZW5gIGluZGV4IG9yIHNlZWsgZXhwcmVzc2lvblxuICAgICAqICAtIGBqYWAgaW5kZXggLyDmnaHku7blvI/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Vlayhjcml0ZXJpYTogbnVtYmVyIHwgU2Vla0V4cDxUPik6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKCdudW1iZXInID09PSB0eXBlb2YgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gY3JpdGVyaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5LmZpbmRJbmRleChjcml0ZXJpYSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiDjgqvjg7zjgr3jg6vjgYzmnInlirnjgarnr4Tlm7LjgpLnpLrjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHJldHVybnMgdHJ1ZTog5pyJ5Yq5IC8gZmFsc2U6IOeEoeWKuVxuICAgICAqL1xuICAgIHByaXZhdGUgdmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAoMCA8PSB0aGlzLl9pbmRleCAmJiB0aGlzLl9pbmRleCA8IHRoaXMuX2FycmF5Lmxlbmd0aCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5pcXVlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsVG9rZW4sXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IE9ic2VydmFibGVBcnJheSwgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5cbmNvbnN0IHtcbiAgICAvKiogQGludGVybmFsICovIHRydW5jXG59ID0gTWF0aDtcblxuLyoqIEBpbnRlcm5hbCB3YWl0IGZvciBjaGFuZ2UgZGV0ZWN0aW9uICovXG5mdW5jdGlvbiBtYWtlUHJvbWlzZTxUPihlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPiwgcmVtYXA/OiBUW10pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKHJlY29yZHM6IEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGVkaXRvci5vZmYoY2FsbGJhY2spO1xuICAgICAgICAgICAgaWYgKHJlbWFwKSB7XG4gICAgICAgICAgICAgICAgcmVtYXAubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICByZW1hcC5wdXNoKC4uLmVkaXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHJlY29yZHMpO1xuICAgICAgICB9O1xuICAgICAgICBlZGl0b3Iub24oY2FsbGJhY2spO1xuICAgIH0pO1xufVxuXG4vKiogQGludGVybmFsIGNvbnZlcnQgdG8gW1tPYnNlcnZhYmxlQXJyYXldXSBpZiBuZWVkZWQuICovXG5hc3luYyBmdW5jdGlvbiBnZXRFZGl0Q29udGV4dDxUPihcbiAgICB0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSxcbiAgICB0b2tlbj86IENhbmNlbFRva2VuXG4pOiBQcm9taXNlPHsgZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD47IHByb21pc2U6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT47IH0+IHwgbmV2ZXIge1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yOiB0YXJnZXQsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZSh0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvciA9IE9ic2VydmFibGVBcnJheS5mcm9tKHRhcmdldCk7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcixcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKGVkaXRvciwgdGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsICd0YXJnZXQgaXMgbm90IEFycmF5IG9yIE9ic2VydmFibGVBcnJheS4nKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgdmFsaWQgb3JkZXJzIGluZGV4ICovXG5mdW5jdGlvbiB2YWxpZE9yZGVycyhsZW5ndGg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSk6IGJvb2xlYW4gfCBuZXZlciB7XG4gICAgaWYgKG51bGwgPT0gb3JkZXJzIHx8IG9yZGVycy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBpbmRleCBvZiBvcmRlcnMpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCBsZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgb3JkZXJzW10gaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXIgYWxsIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmFjeWIl+OBruWFqOWJiumZpFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYXJBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmICh0YXJnZXQubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5zcGxpY2UoMCwgdGFyZ2V0Lmxlbmd0aCk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gQXBwZW5kIHNvdXJjZSBlbGVtZW50cyB0byB0aGUgZW5kIG9mIGFycmF5LlxuICogQGphIOmFjeWIl+OBruacq+WwvuOBq+i/veWKoFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3IucHVzaCguLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIEluc2VydCBzb3VyY2UgZWxlbWVudHMgdG8gc3BlY2lmaWVkIGluZGV4IG9mIGFycmF5LlxuICogQGphIOaMh+WumuOBl+OBn+S9jee9ruOBq+aMv+WFpVxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zZXJ0QXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIHNyYzogVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBpbnNlcnRBcnJheSgpLCBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICB9IGVsc2UgaWYgKG51bGwgPT0gc3JjIHx8IHNyYy5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZShpbmRleCwgMCwgLi4uc3JjKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW9yZGVyIGFycmF5IGVsZW1lbnRzIHBvc2l0aW9uLlxuICogQGphIOmgheebruOBruS9jee9ruOCkuWkieabtFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIC8vIOacgOW+jOOBruimgee0oOOBq+i/veWKoOOBmeOCi+OBn+OCgSBpbmRleCA9PSB0YXJnZXQubGVuZ3RoIOOCkuioseWuuVxuICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0Lmxlbmd0aCA8IGluZGV4IHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgcmVvcmRlckFycmF5KCksIGluZGV4IGlzIGludmFsaWQuIGluZGV4OiAke2luZGV4fWApO1xuICAgIH0gZWxzZSBpZiAoIXZhbGlkT3JkZXJzKHRhcmdldC5sZW5ndGgsIG9yZGVycykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOS9nOalremFjeWIl+OBp+e3qOmbhlxuICAgIGxldCB3b3JrOiAoVCB8IG51bGwpW10gPSBBcnJheS5mcm9tKGVkaXRvcik7XG4gICAge1xuICAgICAgICBjb25zdCByZW9yZGVyczogVFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgb3JkZXIgb2YgdW5pcXVlKG9yZGVycykpIHtcbiAgICAgICAgICAgIHJlb3JkZXJzLnB1c2goZWRpdG9yW29yZGVyXSk7XG4gICAgICAgICAgICB3b3JrW29yZGVyXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB3b3JrLnNwbGljZShpbmRleCwgMCwgLi4ucmVvcmRlcnMpO1xuICAgICAgICB3b3JrID0gd29yay5maWx0ZXIoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g5YCk44KS5pu444GN5oi744GXXG4gICAgZm9yIChjb25zdCBpZHggb2Ygd29yay5rZXlzKCkpIHtcbiAgICAgICAgZWRpdG9yW2lkeF0gPSB3b3JrW2lkeF0gYXMgVDtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVtb3ZlIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmgheebruOBruWJiumZpFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCByZW1vdmVkIG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAoIXZhbGlkT3JkZXJzKHRhcmdldC5sZW5ndGgsIG9yZGVycykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOmZjemghuOCveODvOODiFxuICAgIG9yZGVycy5zb3J0KChsaHMsIHJocykgPT4ge1xuICAgICAgICByZXR1cm4gKGxocyA8IHJocyA/IDEgOiAtMSk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IG9yZGVyIG9mIHVuaXF1ZShvcmRlcnMpKSB7XG4gICAgICAgIGVkaXRvci5zcGxpY2Uob3JkZXIsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuIiwiaW1wb3J0IHsgS2V5cywgY29tcHV0ZURhdGUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRmlsdGVyQ2FsbGJhY2ssIER5bmFtaWNDb21iaW5hdGlvbiB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZUFMTDxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgc3RyaW5nIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PG51bWJlciB8IERhdGUsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgdHlwZSBWYWx1ZVR5cGVTdHJpbmc8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PHN0cmluZywgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIER5bmFtaWNPcGVyYXRvckRhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgdW5kZWZpbmVkO1xuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA9PT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSAhPT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlcjxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPiB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1MgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA8IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuR1JFQVRFUl9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyZWF0ZXJFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPj0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gbGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA8PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmNsdWRlcyh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9MSUtFICovXG5leHBvcnQgZnVuY3Rpb24gbm90TGlrZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlU3RyaW5nPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gIVN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfTk9UX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NOb3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gIShkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSkpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5SQU5HRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIG1pbjogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPiwgbWF4OiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiBjb21iaW5hdGlvbihEeW5hbWljQ29tYmluYXRpb24uQU5ELCBncmVhdGVyRXF1YWwocHJvcCwgbWluKSwgbGVzc0VxdWFsKHByb3AsIG1heCkpO1xufVxuXG4vKiogQGludGVybmFsIOODleOCo+ODq+OCv+OBruWQiOaIkCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KHR5cGU6IER5bmFtaWNDb21iaW5hdGlvbiwgbGhzOiBGaWx0ZXJDYWxsYmFjazxUPiwgcmhzOiBGaWx0ZXJDYWxsYmFjazxUPiB8IHVuZGVmaW5lZCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gIXJocyA/IGxocyA6IChpdGVtOiBUKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uQU5EOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uT1I6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSB8fCByaHMoaXRlbSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBjb21iaW5hdGlvbjogJHt0eXBlfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIC8vIGZhaWwgc2FmZVxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsImltcG9ydCB7IEtleXMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgU29ydEtleSxcbiAgICBEeW5hbWljQ29uZGl0aW9uU2VlZCxcbiAgICBEeW5hbWljT3BlcmF0b3JDb250ZXh0LFxuICAgIER5bmFtaWNMaW1pdENvbmRpdGlvbixcbiAgICBEeW5hbWljT3BlcmF0b3IsXG4gICAgRHluYW1pY0NvbWJpbmF0aW9uLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVmFsdWVUeXBlQUxMLFxuICAgIFZhbHVlVHlwZUNvbXBhcmFibGUsXG4gICAgVmFsdWVUeXBlU3RyaW5nLFxuICAgIGVxdWFsLFxuICAgIG5vdEVxdWFsLFxuICAgIGdyZWF0ZXIsXG4gICAgbGVzcyxcbiAgICBncmVhdGVyRXF1YWwsXG4gICAgbGVzc0VxdWFsLFxuICAgIGxpa2UsXG4gICAgbm90TGlrZSxcbiAgICBkYXRlTGVzc0VxdWFsLFxuICAgIGRhdGVMZXNzTm90RXF1YWwsXG4gICAgcmFuZ2UsXG4gICAgY29tYmluYXRpb24sXG59IGZyb20gJy4vZHluYW1pYy1maWx0ZXJzJztcblxuLyoqXG4gKiBAZW4gRHluYW1pYyBxdWVyeSBjb25kaXRpb24gbWFuYWdlciBjbGFzcy5cbiAqIEBqYSDjg4DjgqTjg4rjg5/jg4Pjgq/jgq/jgqjjg6rnirbmhYvnrqHnkIbjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIER5bmFtaWNDb25kaXRpb248VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PiBpbXBsZW1lbnRzIER5bmFtaWNDb25kaXRpb25TZWVkPFRJdGVtLCBUS2V5PiB7XG5cbiAgICBwcml2YXRlIF9vcGVyYXRvcnM6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfY29tYmluYXRpb246IER5bmFtaWNDb21iaW5hdGlvbjtcbiAgICBwcml2YXRlIF9zdW1LZXlzOiBLZXlzPFRJdGVtPltdO1xuICAgIHByaXZhdGUgX2xpbWl0PzogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPjtcbiAgICBwcml2YXRlIF9yYW5kb206IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBfc29ydEtleXM6IFNvcnRLZXk8VEtleT5bXTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIFtbRHluYW1pY0NvbmRpdGlvblNlZWRdXSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgW1tEeW5hbWljQ29uZGl0aW9uU2VlZF1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4gPSB7IG9wZXJhdG9yczogW10gfSkge1xuICAgICAgICBjb25zdCB7IG9wZXJhdG9ycywgY29tYmluYXRpb24sIHN1bUtleXMsIGxpbWl0LCByYW5kb20sIHNvcnRLZXlzIH0gPSBzZWVkcztcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzICAgICA9IG9wZXJhdG9ycztcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gICA9IG51bGwgIT0gY29tYmluYXRpb24gPyBjb21iaW5hdGlvbiA6IER5bmFtaWNDb21iaW5hdGlvbi5BTkQ7XG4gICAgICAgIHRoaXMuX3N1bUtleXMgICAgICAgPSBudWxsICE9IHN1bUtleXMgPyBzdW1LZXlzIDogW107XG4gICAgICAgIHRoaXMuX2xpbWl0ICAgICAgICAgPSBsaW1pdDtcbiAgICAgICAgdGhpcy5fcmFuZG9tICAgICAgICA9ICEhcmFuZG9tO1xuICAgICAgICB0aGlzLl9zb3J0S2V5cyAgICAgID0gc29ydEtleXMgfHwgW107XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogRHluYW1pY0NvbmRpdGlvblNlZWRcblxuICAgIGdldCBvcGVyYXRvcnMoKTogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRvcnM7XG4gICAgfVxuXG4gICAgc2V0IG9wZXJhdG9ycyh2YWx1ZXM6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W10pIHtcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIGdldCBzdW1LZXlzKCk6IChLZXlzPFRJdGVtPilbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdW1LZXlzO1xuICAgIH1cblxuICAgIHNldCBzdW1LZXlzKHZhbHVlczogKEtleXM8VEl0ZW0+KVtdKSB7XG4gICAgICAgIHRoaXMuX3N1bUtleXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IGNvbWJpbmF0aW9uKCk6IER5bmFtaWNDb21iaW5hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb21iaW5hdGlvbjtcbiAgICB9XG5cbiAgICBzZXQgY29tYmluYXRpb24odmFsdWU6IER5bmFtaWNDb21iaW5hdGlvbikge1xuICAgICAgICB0aGlzLl9jb21iaW5hdGlvbiA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBsaW1pdCgpOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xpbWl0O1xuICAgIH1cblxuICAgIHNldCBsaW1pdCh2YWx1ZTogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPiB8IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9saW1pdCA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCByYW5kb20oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yYW5kb207XG4gICAgfVxuXG4gICAgc2V0IHJhbmRvbSh2YWx1ZTogYm9vbGVhbikge1xuICAgICAgICB0aGlzLl9yYW5kb20gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgc29ydEtleXMoKTogU29ydEtleTxUS2V5PltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvcnRLZXlzO1xuICAgIH1cblxuICAgIHNldCBzb3J0S2V5cyh2YWx1ZXM6IFNvcnRLZXk8VEtleT5bXSkge1xuICAgICAgICB0aGlzLl9zb3J0S2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgYWNjZXNzb3I6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbXBhcmF0b3IgZnVuY3Rpb25zLlxuICAgICAqIEBqYSDmr5TovIPplqLmlbDlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY29tcGFyYXRvcnMoKTogU29ydENhbGxiYWNrPFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRTb3J0S2V5cyh0aGlzLl9zb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBzeW50aGVzaXMgZmlsdGVyIGZ1bmN0aW9uLlxuICAgICAqIEBqYSDlkIjmiJDmuIjjgb/jg5XjgqPjg6vjgr/plqLmlbDlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgZmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB7XG4gICAgICAgIGxldCBmbHRyOiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBjb25kIG9mIHRoaXMuX29wZXJhdG9ycykge1xuICAgICAgICAgICAgY29uc3QgeyBvcGVyYXRvciwgcHJvcCwgdmFsdWUgfSA9IGNvbmQ7XG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTk9UX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdEVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVBTEw8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVI6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlcjxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTEVTUzpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXNzPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXJFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXNzRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxJS0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGlrZTxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RMaWtlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc0VxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBudW1iZXIsIGNvbmQudW5pdCksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5EQVRFX0xFU1NfTk9UX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVMZXNzTm90RXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLlJBTkdFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiwgY29uZC5yYW5nZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0b3I6ICR7b3BlcmF0b3J9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZsdHIgfHwgKCgvKiBpdGVtICovKSA9PiB0cnVlKTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIEtleXMsXG4gICAgaXNGdW5jdGlvbixcbiAgICBzb3J0LFxuICAgIHNodWZmbGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBTb3J0S2V5LFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0LFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBEeW5hbWljTGltaXQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMvY29tcGFyYXRvcic7XG5pbXBvcnQgeyBEeW5hbWljQ29uZGl0aW9uIH0gZnJvbSAnLi9keW5hbWljLWNvbmRpdGlvbic7XG5cbmNvbnN0IHtcbiAgICAvKiogQGludGVybmFsICovIHRydW5jXG59ID0gTWF0aDtcblxuLyoqIEBpbnRlcm5hbCDkvb/nlKjjgZnjgovjg5fjg63jg5Hjg4bjgqPjgYzkv53oqLzjgZXjgozjgZ8gQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMgKi9cbmludGVyZmFjZSBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PiBleHRlbmRzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB7XG4gICAgc29ydEtleXM6IFNvcnRLZXk8VEtleT5bXTtcbiAgICBjb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQXBwbHkgYGZpbHRlcmAgYW5kIGBzb3J0IGtleWAgdG8gdGhlIGBpdGVtc2AgZnJvbSBbW3F1ZXJ5SXRlbXNdXWAoKWAgcmVzdWx0LlxuICogQGphIFtbcXVlcnlJdGVtc11dYCgpYCDjgZfjgZ8gYGl0ZW1zYCDjgavlr77jgZfjgaYgYGZpbHRlcmAg44GoIGBzb3J0IGtleWAg44KS6YGp55SoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZWFyY2hJdGVtczxUSXRlbT4oaXRlbXM6IFRJdGVtW10sIGZpbHRlcj86IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IG51bGwsIC4uLmNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10pOiBUSXRlbVtdIHtcbiAgICBsZXQgcmVzdWx0ID0gaXNGdW5jdGlvbihmaWx0ZXIpID8gaXRlbXMuZmlsdGVyKGZpbHRlcikgOiBpdGVtcy5zbGljZSgpO1xuICAgIGZvciAoY29uc3QgY29tcGFyYXRvciBvZiBjb21wYXJhdG9ycykge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbihjb21wYXJhdG9yKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gc29ydChyZXN1bHQsIGNvbXBhcmF0b3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGNvbmRpdGluYWxGaXgg44Gr5L2/55So44GZ44KLIENyaXRlcmlhIE1hcCAqL1xuY29uc3QgX2xpbWl0Q3JpdGVyaWEgPSB7XG4gICAgW0R5bmFtaWNMaW1pdC5DT1VOVF06IG51bGwsXG4gICAgW0R5bmFtaWNMaW1pdC5TVU1dOiB7IGNvZWZmOiAxIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5TRUNPTkRdOiB7IGNvZWZmOiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5NSU5VVEVdOiB7IGNvZWZmOiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkhPVVJdOiB7IGNvZWZmOiA2MCAqIDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuREFZXTogeyBjb2VmZjogMjQgKiA2MCAqIDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuS0JdOiB7IGNvZWZmOiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5NQl06IHsgY29lZmY6IDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5HQl06IHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuVEJdOiB7IGNvZWZmOiAxMDI0ICogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG59O1xuXG4vKipcbiAqIEBlbiBGaXggdGhlIHRhcmdldCBpdGVtcyBieSBbW0R5bmFtaWNDb25kaXRpb25dXS5cbiAqIEBqYSBbW0R5bmFtaWNDb25kaXRpb25dXSDjgavlvpPjgYTlr77osaHjgpLmlbTlvaJcbiAqXG4gKiBAcGFyYW0gaXRlbXNcbiAqICAtIGBlbmAgdGFyZ2V0IGl0ZW1zIChkZXN0cnVjdGl2ZSlcbiAqICAtIGBqYWAg5a++6LGh44Gu44Ki44Kk44OG44OgICjnoLTlo4rnmoQpXG4gKiBAcGFyYW0gY29uZGl0aW9uXG4gKiAgLSBgZW5gIGNvbmRpdGlvbiBvYmplY3RcbiAqICAtIGBqYWAg5p2h5Lu244Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25kaXRpb25hbEZpeDxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+KFxuICAgIGl0ZW1zOiBUSXRlbVtdLFxuICAgIGNvbmRpdGlvbjogRHluYW1pY0NvbmRpdGlvbjxUSXRlbSwgVEtleT5cbik6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+IHtcbiAgICBjb25zdCB7IHJhbmRvbSwgbGltaXQsIHN1bUtleXMgfSA9IGNvbmRpdGlvbjtcblxuICAgIGlmIChyYW5kb20pIHtcbiAgICAgICAgc2h1ZmZsZShpdGVtcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIGNvbnN0IHsgdW5pdCwgdmFsdWUsIHByb3AgfSA9IGxpbWl0O1xuICAgICAgICBjb25zdCByZXNldDogVEl0ZW1bXSA9IFtdO1xuICAgICAgICBjb25zdCBjcml0ZXJpYSA9IF9saW1pdENyaXRlcmlhW3VuaXRdO1xuICAgICAgICBjb25zdCBsaW1pdENvdW50ID0gdmFsdWU7XG4gICAgICAgIGNvbnN0IGV4Y2VzcyA9ICEhbGltaXQuZXhjZXNzO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGlmICghY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIHtcbiAgICAgICAgICAgICAgICBjb3VudCArPSAoTnVtYmVyKGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIC8gY3JpdGVyaWEuY29lZmYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBhY2Nlc3MgcHJvcGVydHk6ICR7cHJvcH1gKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxpbWl0Q291bnQgPCBjb3VudCkge1xuICAgICAgICAgICAgICAgIGlmIChleGNlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXRlbXMgPSByZXNldDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgIGl0ZW1zLFxuICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbSwgS2V5czxUSXRlbT4+O1xuXG4gICAgaWYgKDAgPCBzdW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHN1bUtleXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgaW4gcmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSArPSBOdW1iZXIoaXRlbVtrZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIOOBmeOBp+OBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBpuOBhOOCi+WvvuixoeOBq+WvvuOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggcXVlcnkg6Zai5pWwICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeUZyb21DYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBjYWNoZWQ6IFRJdGVtW10sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBmaWx0ZXIsXG4gICAgICAgIGNvbXBhcmF0b3JzLFxuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgICAgIG5vU2VhcmNoLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgLy8g5a++6LGh44Gq44GXXG4gICAgaWYgKCFjYWNoZWQubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogMCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG4gICAgfVxuXG4gICAgLy8g44Kt44Oj44OD44K344Ol44Gr5a++44GX44Gm44OV44Kj44Or44K/44Oq44Oz44KwLCDjgr3jg7zjg4jjgpLlrp/ooYxcbiAgICBjb25zdCB0YXJnZXRzID0gbm9TZWFyY2ggPyBjYWNoZWQuc2xpY2UoKSA6IHNlYXJjaEl0ZW1zKGNhY2hlZCwgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG4gICAgbGV0IGluZGV4OiBudW1iZXIgPSAobnVsbCAhPSBiYXNlSW5kZXgpID8gYmFzZUluZGV4IDogMDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBsaW1pdCAmJiAobGltaXQgPD0gMCB8fCB0cnVuYyhsaW1pdCkgIT09IGxpbWl0KSkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGxpbWl0OiAkeyBsaW1pdCB9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHRhcmdldHMuc2xpY2UoaW5kZXgsIChudWxsICE9IGxpbWl0KSA/IGluZGV4ICsgbGltaXQgOiB1bmRlZmluZWQpO1xuXG4gICAgICAgIHJlc3VsdHMucHVzaCguLi5pdGVtcyk7XG5cbiAgICAgICAgY29uc3QgcmV0dmFsID0ge1xuICAgICAgICAgICAgdG90YWw6IHRhcmdldHMubGVuZ3RoLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbT4sXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgLy8g6YCy5o2X6YCa55+lXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXV0byAmJiBudWxsICE9IGxpbWl0KSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgIHJldHZhbC5pdGVtcyA9IHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIOODrOOCueODneODs+OCueOBruOCreODo+ODg+OCt+ODpeOCkuippuihjCAqL1xuZnVuY3Rpb24gdHJ5Q2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICByZXN1bHQ6IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+LFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPlxuKTogdm9pZCB7XG4gICAgY29uc3QgeyBub0NhY2hlLCBub1NlYXJjaCB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBjYW5DYWNoZSA9ICFub0NhY2hlICYmICFub1NlYXJjaCAmJiByZXN1bHQudG90YWwgJiYgcmVzdWx0LnRvdGFsID09PSByZXN1bHQuaXRlbXMubGVuZ3RoO1xuICAgIGlmIChjYW5DYWNoZSkge1xuICAgICAgICBxdWVyeUluZm8uY2FjaGUgPSB7IC4uLnJlc3VsdCB9O1xuICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsIGBwcm92aWRlcmAg6Zai5pWw44KS5L2/55So44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBgcXVlcnlgIOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tUHJvdmlkZXI8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9uczogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCByZXN1bHRzOiBUSXRlbVtdID0gW107XG5cbiAgICBjb25zdCByZWNlaXZlZEFsbCA9IChyZXNwOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPik6IGJvb2xlYW4gPT4ge1xuICAgICAgICBjb25zdCBoYXNDb25kID0gISFyZXNwLm9wdGlvbnM/LmNvbmRpdGlvbjtcbiAgICAgICAgcmV0dXJuIGhhc0NvbmQgfHwgcmVzcC50b3RhbCA9PT0gcmVzcC5pdGVtcy5sZW5ndGg7XG4gICAgfTtcblxuICAgIGxldCBpbmRleDogbnVtYmVyID0gKG51bGwgIT0gYmFzZUluZGV4KSA/IGJhc2VJbmRleCA6IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHtsaW1pdH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGxldCByZXNwID0gYXdhaXQgcHJvdmlkZXIob3B0cyk7XG4gICAgICAgIGNvbnN0IG5leHRPcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0cywgcmVzcC5vcHRpb25zKTtcblxuICAgICAgICBpZiAocmVjZWl2ZWRBbGwocmVzcCkpIHtcbiAgICAgICAgICAgIHRyeUNhY2hlKHF1ZXJ5SW5mbywgcmVzcCwgbmV4dE9wdHMpO1xuXG4gICAgICAgICAgICBjb25zdCB7IG5vU2VhcmNoLCBjb25kaXRpb246IHNlZWQgfSA9IG5leHRPcHRzO1xuICAgICAgICAgICAgaWYgKHNlZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25kaXRpb24gPSBuZXcgRHluYW1pY0NvbmRpdGlvbihzZWVkKTtcbiAgICAgICAgICAgICAgICByZXNwID0gY29uZGl0aW9uYWxGaXgoc2VhcmNoSXRlbXMoXG4gICAgICAgICAgICAgICAgICAgIHJlc3AuaXRlbXMsXG4gICAgICAgICAgICAgICAgICAgIGNvbmRpdGlvbi5maWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIC4uLmNvbmRpdGlvbi5jb21wYXJhdG9yc1xuICAgICAgICAgICAgICAgICksIGNvbmRpdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAocXVlcnlJbmZvLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLmNhY2hlLCByZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHF1ZXJ5SW5mby5jYWNoZS5vcHRpb25zO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5RnJvbUNhY2hlKHJlc3AuaXRlbXMsIE9iamVjdC5hc3NpZ24ob3B0cywgeyBub1NlYXJjaCB9KSk7XG4gICAgICAgIH0vLyBlc2xpbnQtZGlzYWJsZS1saW5lIGJyYWNlLXN0eWxlXG5cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goLi4ucmVzcC5pdGVtcyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgICAgICB0b3RhbDogcmVzcC50b3RhbCxcbiAgICAgICAgICAgICAgICBpdGVtczogcmVzcC5pdGVtcyxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBuZXh0T3B0cyxcbiAgICAgICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT47XG5cbiAgICAgICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3MoeyAuLi5yZXR2YWwgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcC50b3RhbCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiHquWLlee2mee2muaMh+WumuaZguOBq+OBr+acgOW+jOOBq+OBmeOBueOBpuOBriBpdGVtIOOCkui/lOWNtFxuICAgICAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IHJlc3AuaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeUNhY2hlKHF1ZXJ5SW5mbywgcmV0dmFsLCBuZXh0T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavlpInmj5sgKi9cbmZ1bmN0aW9uIGVuc3VyZU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHwgdW5kZWZpbmVkXG4pOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgc29ydEtleXM6IFtdIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgbm9TZWFyY2gsIHNvcnRLZXlzIH0gPSBvcHRzO1xuXG4gICAgaWYgKCFub1NlYXJjaCAmJiAoIW9wdHMuY29tcGFyYXRvcnMgfHwgb3B0cy5jb21wYXJhdG9ycy5sZW5ndGggPD0gMCkpIHtcbiAgICAgICAgb3B0cy5jb21wYXJhdG9ycyA9IGNvbnZlcnRTb3J0S2V5cyhzb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHMgYXMgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+O1xufVxuXG4vKipcbiAqIEBlbiBMb3cgbGV2ZWwgZnVuY3Rpb24gZm9yIFtbQ29sbGVjdGlvbl1dIHF1ZXJ5IGl0ZW1zLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIEl0ZW0g44KS44Kv44Ko44Oq44GZ44KL5L2O44Os44OZ44Or6Zai5pWwXG4gKlxuICogQHBhcmFtIHF1ZXJ5SW5mb1xuICogIC0gYGVuYCBxdWVyeSBpbmZvcm1hdGlvblxuICogIC0gYGphYCDjgq/jgqjjg6rmg4XloLFcbiAqIEBwYXJhbSBwcm92aWRlclxuICogIC0gYGVuYCBwcm92aWRlciBmdW5jdGlvblxuICogIC0gYGphYCDjg5fjg63jg5DjgqTjg4DplqLmlbBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHF1ZXJ5IG9wdGlvbnNcbiAqICAtIGBqYWAg44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeUl0ZW1zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8VEl0ZW1bXT4ge1xuICAgIGNvbnN0IG9wdHMgPSBlbnN1cmVPcHRpb25zKG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IG9wdHM7XG5cbiAgICAvLyBxdWVyeSDjgavkvb/nlKjjgZfjgZ8gc29ydCwgZmlsdGVyIOaDheWgseOCkuOCreODo+ODg+OCt+ODpVxuICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0pO1xuXG4gICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbUNhY2hlKHF1ZXJ5SW5mby5jYWNoZS5pdGVtcywgb3B0cykpLml0ZW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoYXdhaXQgcXVlcnlGcm9tUHJvdmlkZXIocXVlcnlJbmZvLCBwcm92aWRlciwgb3B0cykpLml0ZW1zO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgQ29uc3RydWN0b3IsXG4gICAgQ2xhc3MsXG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBLZXlzLFxuICAgIGlzTmlsLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIGx1aWQsXG4gICAgYXQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFNpbGVuY2VhYmxlLFxuICAgIFN1YnNjcmliYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFNvdXJjZSxcbiAgICBFdmVudFB1Ymxpc2hlcixcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWwsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIE1vZGVsU2F2ZU9wdGlvbnMsXG4gICAgaXNNb2RlbCxcbn0gZnJvbSAnQGNkcC9tb2RlbCc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uU29ydE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyLFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvblNlZWQsXG4gICAgQ29sbGVjdGlvbkV2ZW50LFxuICAgIENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZGRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25TZXRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZVNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25BZnRlckZpbHRlck9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHNlYXJjaEl0ZW1zLCBxdWVyeUl0ZW1zIH0gZnJvbSAnLi9xdWVyeSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3Byb3BlcnRpZXMgICAgICAgICAgICAgPSBTeW1ib2woJ3Byb3BlcnRpZXMnKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZS1pdGVyYWJsZS1pdGVyYXRvcicpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcHJlcGFyZU1vZGVsICAgICAgICAgICA9IFN5bWJvbCgncHJlcGFyZS1tb2RlbCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVtb3ZlTW9kZWxzICAgICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLW1vZGVscycpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkUmVmZXJlbmNlICAgICAgICAgICA9IFN5bWJvbCgnYWRkLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfcmVtb3ZlUmVmZXJlbmNlICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfb25Nb2RlbEV2ZW50ICAgICAgICAgICA9IFN5bWJvbCgnbW9kZWwtZXZlbnQtaGFuZGxlcicpO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgUHJvcGVydHk8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+IHtcbiAgICByZWFkb25seSBjb25zdHJ1Y3RPcHRpb25zOiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxULCBLPjtcbiAgICByZWFkb25seSBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxULCBLPjtcbiAgICByZWFkb25seSBjaWQ6IHN0cmluZztcbiAgICByZWFkb25seSBxdWVyeU9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFQsIEs+O1xuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxULCBLPjtcbiAgICByZWFkb25seSBtb2RlbE9wdGlvbnM6IE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucztcbiAgICByZWFkb25seSBieUlkOiBNYXA8c3RyaW5nLCBUPjtcbiAgICBzdG9yZTogVFtdO1xuICAgIGFmdGVyRmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgcmVzZXQgbW9kZWwgY29udGV4dCAqL1xuY29uc3QgcmVzZXRNb2RlbFN0b3JlID0gPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+Pihjb250ZXh0OiBQcm9wZXJ0eTxULCBLPik6IHZvaWQgPT4ge1xuICAgIGNvbnRleHQuYnlJZC5jbGVhcigpO1xuICAgIGNvbnRleHQuc3RvcmUubGVuZ3RoID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVuc3VyZVNvcnRPcHRpb25zID0gPFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PihvcHRpb25zOiBDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4pOiBSZXF1aXJlZDxDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4+ID0+IHtcbiAgICBjb25zdCB7IHNvcnRLZXlzOiBrZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IG9wdGlvbnM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc29ydEtleXM6IGtleXMgfHwgW10sXG4gICAgICAgIGNvbXBhcmF0b3JzOiBjb21wcyB8fCBjb252ZXJ0U29ydEtleXMoa2V5cyB8fCBbXSksXG4gICAgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsSWRBdHRyaWJ1dGUgPSA8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBjdG9yPy5bJ2lkQXR0cmlidXRlJ10gfHwgJ2lkJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldE1vZGVsSWQgPSA8VCBleHRlbmRzIG9iamVjdD4oYXR0cnM6IFQsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gYXR0cnNbbW9kZWxJZEF0dHJpYnV0ZShjdG9yKV07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBnZXRDaGFuZ2VkSWRzID0gPFQgZXh0ZW5kcyBvYmplY3Q+KG9iajogb2JqZWN0LCBjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHsgaWQ6IHN0cmluZzsgcHJldklkPzogc3RyaW5nOyB9IHwgdW5kZWZpbmVkID0+IHtcbiAgICB0eXBlIE1vZGVsTGlrZSA9IHsgcHJldmlvdXM6IChrZXk6IHN0cmluZykgPT4gc3RyaW5nOyB9O1xuICAgIGNvbnN0IG1vZGVsID0gb2JqIGFzIE1vZGVsTGlrZTtcblxuICAgIGNvbnN0IGlkQXR0cmlidXRlID0gbW9kZWxJZEF0dHJpYnV0ZShjdG9yKTtcbiAgICBjb25zdCBpZCA9IG1vZGVsW2lkQXR0cmlidXRlXTtcbiAgICBpZiAoIWlzU3RyaW5nKGlkKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB7IGlkOiBtb2RlbFtpZEF0dHJpYnV0ZV0sIHByZXZJZDogaXNGdW5jdGlvbihtb2RlbC5wcmV2aW91cykgPyBtb2RlbC5wcmV2aW91cyhpZEF0dHJpYnV0ZSkgOiB1bmRlZmluZWQgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsQ29uc3RydWN0b3IgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiBDbGFzcyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgcmV0dXJuIHNlbGYuY29uc3RydWN0b3JbJ21vZGVsJ107XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBpc0NvbGxlY3Rpb25Nb2RlbCA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oeDogdW5rbm93biwgc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IHggaXMgVCA9PiB7XG4gICAgY29uc3QgY3RvciA9IG1vZGVsQ29uc3RydWN0b3Ioc2VsZik7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24oY3RvcikgPyB4IGluc3RhbmNlb2YgY3RvciA6IGZhbHNlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3BsaWNlQXJyYXkgPSA8VD4odGFyZ2V0OiBUW10sIGluc2VydDogVFtdLCBhdDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgYXQgPSBNYXRoLm1pbihNYXRoLm1heChhdCwgMCksIHRhcmdldC5sZW5ndGgpO1xuICAgIHRhcmdldC5zcGxpY2UoYXQsIDAsIC4uLmluc2VydCk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBwYXJzZUZpbHRlckFyZ3M8VCBleHRlbmRzIG9iamVjdD4oLi4uYXJnczogdW5rbm93bltdKTogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPiB7XG4gICAgY29uc3QgW2ZpbHRlciwgb3B0aW9uc10gPSBhcmdzO1xuICAgIGlmIChudWxsID09IGZpbHRlcikge1xuICAgICAgICByZXR1cm4ge307XG4gICAgfSBlbHNlIGlmICghaXNGdW5jdGlvbihmaWx0ZXIpKSB7XG4gICAgICAgIHJldHVybiBmaWx0ZXIgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywgeyBmaWx0ZXIgfSkgYXMgQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUPjtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3NldE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiB0cnVlLCBtZXJnZTogdHJ1ZSB9O1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYWRkT3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlIH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIGNvbGxlY3Rpb24gdGhhdCBpcyBvcmRlcmVkIHNldHMgb2YgbW9kZWxzLlxuICogQGphIE1vZGVsIOOBrumbhuWQiOOCkuaJseOBhiBDb2xsZWN0aW9uIOOBruWfuuW6leOCr+ODqeOCueWumue+qS5cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IE1vZGVsLCBNb2RlbENvbnN0cnVjdG9yIH0gZnJvbSAnQGNkcC9tb2RlbCc7XG4gKiBpbXBvcnQge1xuICogICAgIENvbGxlY3Rpb24sXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gKiAgICAgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdCxcbiAqICAgICBDb2xsZWN0aW9uU2VlZCxcbiAqIH0gZnJvbSAnQGNkcC9jb2xsZWN0aW9uJztcbiAqXG4gKiAvLyBNb2RlbCBzY2hlbWFcbiAqIGludGVyZmFjZSBUcmFja0F0dHJpYnV0ZSB7XG4gKiAgIHVyaTogc3RyaW5nO1xuICogICB0aXRsZTogc3RyaW5nO1xuICogICBhcnRpc3Q6IHN0cmluZztcbiAqICAgYWxidW06ICBzdHJpbmc7XG4gKiAgIHJlbGVhc2VEYXRlOiBEYXRlO1xuICogICA6XG4gKiB9XG4gKlxuICogLy8gTW9kZWwgZGVmaW5pdGlvblxuICogY29uc3QgVHJhY2tCYXNlID0gTW9kZWwgYXMgTW9kZWxDb25zdHJ1Y3RvcjxNb2RlbDxUcmFja0F0dHJpYnV0ZT4sIFRyYWNrQXR0cmlidXRlPjtcbiAqIGNsYXNzIFRyYWNrIGV4dGVuZHMgVHJhY2tCYXNlIHtcbiAqICAgICBzdGF0aWMgaWRBdHRyaWJ1dGUgPSAndXJpJztcbiAqIH1cbiAqXG4gKiAvLyBDb2xsZWN0aW9uIGRlZmluaXRpb25cbiAqIGNsYXNzIFBsYXlsaXN0IGV4dGVuZHMgQ29sbGVjdGlvbjxUcmFjaz4ge1xuICogICAgIC8vIHNldCB0YXJnZXQgTW9kZWwgY29uc3RydWN0b3JcbiAqICAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWwgPSBUcmFjaztcbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gdXNlIGN1c3RvbSBjb250ZW50IHByb3ZpZGVyIGZvciBmZXRjaC5cbiAqICAgICBwcm90ZWN0ZWQgYXN5bmMgc3luYyhcbiAqICAgICAgICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRyYWNrPlxuICogICAgICk6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+PiB7XG4gKiAgICAgICAgIC8vIHNvbWUgc3BlY2lmaWMgaW1wbGVtZW50YXRpb24gaGVyZS5cbiAqICAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBjdXN0b21Qcm92aWRlcihvcHRpb25zKTtcbiAqICAgICAgICAgcmV0dXJuIHtcbiAqICAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gKiAgICAgICAgICAgICBpdGVtcyxcbiAqICAgICAgICAgICAgIG9wdGlvbnMsXG4gKiAgICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+O1xuICogICAgIH1cbiAqXG4gKiAgICAgLy8gQG92ZXJyaWRlIGlmIG5lZWQgdG8gY29udmVydCBhIHJlc3BvbnNlIGludG8gYSBsaXN0IG9mIG1vZGVscy5cbiAqICAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IENvbGxlY3Rpb25TZWVkW10pOiBUcmFja0F0dHJpYnV0ZVtdIHtcbiAqICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLm1hcChzZWVkID0+IHtcbiAqICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBzZWVkLnJlbGVhc2VEYXRlO1xuICogICAgICAgICAgICAgc2VlZC5yZWxlYXNlRGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICogICAgICAgICAgICAgcmV0dXJuIHNlZWQ7XG4gKiAgICAgICAgIH0pIGFzIFRyYWNrQXR0cmlidXRlW107XG4gKiAgICAgIH1cbiAqIH1cbiAqXG4gKiBsZXQgc2VlZHM6IFRyYWNrQXR0cmlidXRlW107XG4gKlxuICogY29uc3QgcGxheWxpc3QgPSBuZXcgUGxheWxpc3Qoc2VlZHMsIHtcbiAqICAgICAvLyBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnNcbiAqICAgICBxdWVyeU9wdGlvbnM6IHtcbiAqICAgICAgICAgc29ydEtleXM6IFtcbiAqICAgICAgICAgICAgIHsgbmFtZTogJ3RpdGxlJywgb3JkZXI6IFNvcnRPcmRlci5ERVNDLCB0eXBlOiAnc3RyaW5nJyB9LFxuICogICAgICAgICBdLFxuICogICAgIH1cbiAqIH0pO1xuICpcbiAqIGF3YWl0IHBsYXlsaXN0LnJlcXVlcnkoKTtcbiAqXG4gKiBmb3IgKGNvbnN0IHRyYWNrIG9mIHBsYXlsaXN0KSB7XG4gKiAgICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodHJhY2sudG9KU09OKCkpKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29sbGVjdGlvbjxcbiAgICBUTW9kZWwgZXh0ZW5kcyBvYmplY3QgPSBhbnksIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIFRFdmVudCBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUTW9kZWw+ID0gQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4sXG4gICAgVEtleSBleHRlbmRzIEtleXM8VE1vZGVsPiA9IEtleXM8VE1vZGVsPlxuPiBleHRlbmRzIEV2ZW50U291cmNlPFRFdmVudD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUTW9kZWw+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb2RlbCBjb25zdHJ1Y3Rvci4gPGJyPlxuICAgICAqICAgICBUaGUgY29uc3RydWN0b3IgaXMgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoaXMgW1tDb2xsZWN0aW9uXV0gY2xhc3MgZm9yIFtbVE1vZGVsXV0gY29uc3RydWN0aW9uLlxuICAgICAqIEBqYSBNb2RlbCDjgrPjg7Pjgrnjg4jjg6njgq/jgr8gPGJyPlxuICAgICAqICAgICBbW0NvbGxlY3Rpb25dXSDjgq/jg6njgrnjgYwgW1tUTW9kZWxdXSDjgpLmp4vnr4njgZnjgovjgZ/jgoHjgavkvb/nlKjjgZnjgotcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWw/OiBDbGFzcztcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjb25zdHJ1Y3Rpb24vZGVzdHJ1Y3Rpb246XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzPzogVE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsLCBUS2V5Pikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG1vZGVsT3B0aW9uczoge30sIHF1ZXJ5T3B0aW9uczoge30gfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMsIHF1ZXJ5T3B0aW9ucyB9ID0gb3B0cztcblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdE9wdGlvbnM6IG9wdHMsXG4gICAgICAgICAgICBwcm92aWRlcjogb3B0cy5wcm92aWRlciB8fCB0aGlzLnN5bmMuYmluZCh0aGlzKSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnY29sbGVjdGlvbjonLCA4KSxcbiAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucyxcbiAgICAgICAgICAgIHF1ZXJ5SW5mbzoge30sXG4gICAgICAgICAgICBtb2RlbE9wdGlvbnMsXG4gICAgICAgICAgICBieUlkOiBuZXcgTWFwPHN0cmluZywgVE1vZGVsPigpLFxuICAgICAgICAgICAgc3RvcmU6IFtdLFxuICAgICAgICB9IGFzIHVua25vd24gYXMgUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcblxuICAgICAgICB0aGlzLmluaXRRdWVyeUluZm8oKTtcblxuICAgICAgICAvKiBtb2RlbCBldmVudCBoYW5kbGVyICovXG4gICAgICAgIHRoaXNbX29uTW9kZWxFdmVudF0gPSAoZXZlbnQ6IHN0cmluZywgbW9kZWw6IFRNb2RlbCB8IHVuZGVmaW5lZCwgY29sbGVjdGlvbjogdGhpcywgb3B0aW9uczogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhldmVudCkgJiYgZXZlbnQuc3RhcnRzV2l0aCgnQCcpICYmIG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgaWYgKCgnQGFkZCcgPT09IGV2ZW50IHx8ICdAcmVtb3ZlJyA9PT0gZXZlbnQpICYmIGNvbGxlY3Rpb24gIT09IHRoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJ0BkZXN0cm95JyA9PT0gZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW9kZWwgZXZlbnQgYXJndW1lbnRzIGFkanVzdG1lbnQuXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSAoY29sbGVjdGlvbiBhcyBhbnkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IHRoaXM7ICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc3RhcnRzV2l0aCgnQGNoYW5nZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzOyAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICAgICAgICAgIGlmICgnQGNoYW5nZScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHMgPSBnZXRDaGFuZ2VkSWRzKG1vZGVsLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCBwcmV2SWQgfSA9IGlkcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldklkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBwcmV2SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5SWQuZGVsZXRlKHByZXZJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gZGVsZWdhdGUgZXZlbnRcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIuY2FsbCh0aGlzLCBldmVudCwgbW9kZWwsIGNvbGxlY3Rpb24sIG9wdGlvbnMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVzZWxlc3MtY2FsbFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZWVkcykge1xuICAgICAgICAgICAgdGhpcy5yZXNldChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAamEgSW5pdGlhbGl6ZSBxdWVyeSBpbmZvXG4gICAgICogQGphIOOCr+OCqOODquaDheWgseOBruWIneacn+WMllxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpbml0UXVlcnlJbmZvKCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9ID0gZW5zdXJlU29ydE9wdGlvbnModGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX3F1ZXJ5SW5mbyA9IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbGVhc2VkIGFsbCBpbnN0YW5jZXMgYW5kIGV2ZW50IGxpc3RlbmVyIHVuZGVyIHRoZSBtYW5hZ2VtZW50LlxuICAgICAqIEBqYSDnrqHnkIblr77osaHjgpLnoLTmo4RcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBvcHRpb25zIChyZXNlcnZlZCkuXG4gICAgICogIC0gYGphYCDjgqrjg5fjgrfjg6fjg7MgKOS6iOe0hClcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVsZWFzZShvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB0aGlzIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gW107XG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuICAgICAgICByZXR1cm4gdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIENsZWFyIGNhY2hlIGluc3RhbmNlIG1ldGhvZFxuICAgICAqIEBqYSDjgq3jg6Pjg4Pjgrfjg6Xjga7noLTmo4RcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgY2xlYXJDYWNoZSgpOiB2b2lkIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3F1ZXJ5SW5mby5jYWNoZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBhY2Nlc3NvcjogYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb250ZW50IElELlxuICAgICAqIEBqYSDjgrPjg7Pjg4bjg7Pjg4ggSUQg44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jaWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBtb2RlbHMuXG4gICAgICogQGphIE1vZGVsIOOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBtb2RlbHMoKTogcmVhZG9ubHkgVE1vZGVsW10ge1xuICAgICAgICBjb25zdCB7IF9xdWVyeUZpbHRlciwgX2FmdGVyRmlsdGVyIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIChfYWZ0ZXJGaWx0ZXIgJiYgX2FmdGVyRmlsdGVyICE9PSBfcXVlcnlGaWx0ZXIpID8gc3RvcmUuZmlsdGVyKF9hZnRlckZpbHRlcikgOiBzdG9yZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIG1vZGVscy5cbiAgICAgKiBAamEg5YaF5YyF44GZ44KLIE1vZGVsIOaVsFxuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWxzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYXBwbGllZCBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBjOmBqeeUqOOBleOCjOOBpuOBhOOCi+OBi+OCkuWIpOWumlxuICAgICAqL1xuICAgIGdldCBmaWx0ZXJlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIGluc3RhbmNlXG4gICAgICogQGphIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5SW5mbygpOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc2V0IF9xdWVyeUluZm8odmFsOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvID0gdmFsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3JlYXRpbmcgb3B0aW9ucy5cbiAgICAgKiBAamEg5qeL56+J5pmC44Gu44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfb3B0aW9ucygpOiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnN0cnVjdE9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHByb3ZpZGVyLlxuICAgICAqIEBqYSDml6Llrprjga7jg5fjg63jg5DjgqTjg4DjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9wcm92aWRlcigpOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJvdmlkZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHBhcnNlIGJlaGF2aW91ci5cbiAgICAgKiBAamEg5pei5a6a44GuIHBhcnNlIOWLleS9nOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRQYXJzZSgpOiBib29sZWFuIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnMucGFyc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOaXouWumuOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeU9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOacgOW+jOOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2xhc3RRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbztcbiAgICAgICAgY29uc3Qgb3B0czogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiA9IHt9O1xuXG4gICAgICAgIHNvcnRLZXlzLmxlbmd0aCAmJiAob3B0cy5zb3J0S2V5cyA9IHNvcnRLZXlzKTtcbiAgICAgICAgY29tcGFyYXRvcnMubGVuZ3RoICYmIChvcHRzLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnMpO1xuICAgICAgICBmaWx0ZXIgJiYgKG9wdHMuZmlsdGVyID0gZmlsdGVyKTtcblxuICAgICAgICByZXR1cm4gb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHNvcnQgY29tcGFyYXRvcnMuXG4gICAgICogQGphIOOCveODvOODiOeUqOavlOi8g+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUTW9kZWw+W10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmNvbXBhcmF0b3JzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcXVlcnktZmlsdGVyLlxuICAgICAqIEBqYSDjgq/jgqjjg6rnlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9xdWVyeUZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5maWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2FmdGVyRmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdXRpbHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYSBtb2RlbCBmcm9tIGEgY29sbGVjdGlvbiwgc3BlY2lmaWVkIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJIE1vZGVsIOOCkueJueWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoc2VlZDogc3RyaW5nIHwgb2JqZWN0IHwgdW5kZWZpbmVkKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gc2VlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGlmIChpc1N0cmluZyhzZWVkKSAmJiBieUlkLmhhcyhzZWVkKSkge1xuICAgICAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaWQgPSBnZXRNb2RlbElkKGlzTW9kZWwoc2VlZCkgPyBzZWVkLnRvSlNPTigpIDogc2VlZCBhcyBvYmplY3QsIG1vZGVsQ29uc3RydWN0b3IodGhpcykpO1xuICAgICAgICBjb25zdCBjaWQgPSAoc2VlZCBhcyBvYmplY3QgYXMgeyBfY2lkPzogc3RyaW5nOyB9KS5fY2lkO1xuXG4gICAgICAgIHJldHVybiBieUlkLmdldChpZCkgfHwgKGNpZCAmJiBieUlkLmdldChjaWQpKSBhcyBUTW9kZWwgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYHRydWVgIGlmIHRoZSBtb2RlbCBpcyBpbiB0aGUgY29sbGVjdGlvbiBieSBhbiBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2UuXG4gICAgICogQGphIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCueOBi+OCiSBNb2RlbCDjgpLmiYDmnInjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgICBgaWRgLCBgY2lkYCDjgYrjgojjgbPjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwdWJsaWMgaGFzKHNlZWQ6IHN0cmluZyB8IG9iamVjdCB8IHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gbnVsbCAhPSB0aGlzLmdldChzZWVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSBNb2RlbCDlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IG9iamVjdFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWxzLm1hcChtID0+IGlzTW9kZWwobSkgPyBtLnRvSlNPTigpIDogbSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVzIENsb25lIHRoaXMgaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOBruikh+ijveOCkui/lOWNtFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IGNvbnN0cnVjdG9yLCBfb3B0aW9ucyB9ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyAoY29uc3RydWN0b3IgYXMgQ29uc3RydWN0b3I8dGhpcz4pKHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLCBfb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIGEgY29sbGVjdGlvbiB0byByZS1zb3J0IGl0c2VsZi5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDopoHntKDjga7lho3jgr3jg7zjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzb3J0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjgr3jg7zjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc29ydChvcHRpb25zPzogQ29sbGVjdGlvblJlU29ydE9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgeyBub1Rocm93LCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gZW5zdXJlU29ydE9wdGlvbnMob3B0cyk7XG4gICAgICAgIGNvbnN0IGNvbXBhcmF0b3JzID0gMCA8IGNvbXBzLmxlbmd0aCA/IGNvbXBzIDogdGhpcy5fY29tcGFyYXRvcnM7XG5cbiAgICAgICAgaWYgKGNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpZiAobm9UaHJvdykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUywgJ0Nhbm5vdCBzb3J0IGEgc2V0IHdpdGhvdXQgYSBjb21wYXJhdG9yLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uc3RvcmUgPSBzZWFyY2hJdGVtcyh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgdGhpcy5fYWZ0ZXJGaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgICAgICAvLyB1cGRhdGUgcXVlcnlJbmZvXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzO1xuICAgICAgICBpZiAoMCA8IHNvcnRLZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLnNvcnRLZXlzID0gc29ydEtleXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGx5IGFmdGVyLWZpbHRlciB0byBjb2xsZWN0aW9uIGl0c2VsZi5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGZpbHRlciBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcihjYWxsYmFjazogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IFNpbGVuY2VhYmxlKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBseSBhZnRlci1maWx0ZXIgdG8gY29sbGVjdGlvbiBpdHNlbGYuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFmdGVyLWZpbHRlciBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg57We44KK6L6844G/44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcihvcHRpb25zOiBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFRNb2RlbD4pOiB0aGlzO1xuXG4gICAgcHVibGljIGZpbHRlciguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHBhcnNlRmlsdGVyQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3QgeyBmaWx0ZXIsIHNpbGVudCB9ID0gb3B0cztcbiAgICAgICAgaWYgKGZpbHRlciAhPT0gdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyID0gZmlsdGVyO1xuICAgICAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZmlsdGVyJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguIElmIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuLCB0aGUgdGFyZ2V0IHdpbGwgYmUgZm91bmQgZnJvbSB0aGUgbGFzdCBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44Gr44KI44KLIE1vZGVsIOOBuOOBruOCouOCr+OCu+OCuS4g6LKg5YCk44Gu5aC05ZCI44Gv5pyr5bC+5qSc57Si44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5kZXhcbiAgICAgKiAgLSBgZW5gIEEgemVyby1iYXNlZCBpbnRlZ2VyIGluZGljYXRpbmcgd2hpY2ggZWxlbWVudCB0byByZXRyaWV2ZS4gPGJyPlxuICAgICAqICAgICAgICAgSWYgbmVnYXRpdmUgaW5kZXggaXMgY291bnRlZCBmcm9tIHRoZSBlbmQgb2YgdGhlIG1hdGNoZWQgc2V0LlxuICAgICAqICAtIGBqYWAgMCBiYXNlIOOBruOCpOODs+ODh+ODg+OCr+OCueOCkuaMh+WumiA8YnI+XG4gICAgICogICAgICAgICDosqDlgKTjgYzmjIflrprjgZXjgozjgZ/loLTlkIgsIOacq+WwvuOBi+OCieOBruOCpOODs+ODh+ODg+OCr+OCueOBqOOBl+OBpuino+mHiOOBleOCjOOCi1xuICAgICAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogVE1vZGVsIHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMubW9kZWxzIGFzIFRNb2RlbFtdLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgbW9kZWwuXG4gICAgICogQGphIE1vZGVsIOOBruacgOWIneOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdCgpOiBUTW9kZWwgfCB1bmRlZmluZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiBgY291bnRgIGVsZW1lbnRzIG9mIHRoZSBtb2RlbCBmcm9tIHRoZSBmaXJzdC5cbiAgICAgKiBAamEgTW9kZWwg44Gu5YWI6aCt44GL44KJYGNvdW50YCDliIbjga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgZmlyc3QoY291bnQ6IG51bWJlcik6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIGZpcnN0KGNvdW50PzogbnVtYmVyKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5tb2RlbHM7XG4gICAgICAgIGlmIChudWxsID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0c1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzLnNsaWNlKDAsIGNvdW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiB0aGUgbW9kZWwuXG4gICAgICogQGphIE1vZGVsIOOBruacgOWIneOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBsYXN0KCk6IFRNb2RlbCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIGBjb3VudGAgZWxlbWVudHMgb2YgdGhlIG1vZGVsIGZyb20gdGhlIGxhc3QuXG4gICAgICogQGphIE1vZGVsIOOBruWFiOmgreOBi+OCiWBjb3VudGAg5YiG44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoY291bnQ6IG51bWJlcik6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIGxhc3QoY291bnQ/OiBudW1iZXIpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLm1vZGVscztcbiAgICAgICAgaWYgKG51bGwgPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzW3RhcmdldHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0cy5zbGljZSgtMSAqIGNvdW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHN5bmNcblxuICAgIC8qKlxuICAgICAqIEBlbiBDb252ZXJ0cyBhIHJlc3BvbnNlIGludG8gdGhlIGhhc2ggb2YgYXR0cmlidXRlcyB0byBiZSBgc2V0YCBvbiB0aGUgY29sbGVjdGlvbi4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMganVzdCB0byBwYXNzIHRoZSByZXNwb25zZSBhbG9uZy5cbiAgICAgKiBAamEg44Os44K544Od44Oz44K544Gu5aSJ5o+b44Oh44K944OD44OJLiDml6Llrprjgafjga/kvZXjgoLjgZfjgarjgYRcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBwYXJzZShyZXNwb25zZTogQ29sbGVjdGlvblNlZWQgfCBDb2xsZWN0aW9uU2VlZFtdIHwgdm9pZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10gfCBDb2xsZWN0aW9uU2VlZFtdIHwgdW5kZWZpbmVkIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFRNb2RlbFtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgW1tmZXRjaF1dIG1ldGhvZCBwcm94eSB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCBbW0NvbGxlY3Rpb25JdGVtUHJvdmlkZXJdXSByZXR1cm5zIG9uZS1zaG90IHJlc3VsdC5cbiAgICAgKiBAamEgW1tDb2xsZWN0aW9uSXRlbVByb3ZpZGVyXV0g5LqS5o+b44Gu5Y2Y55m644GuIGZldGNoIOe1kOaenOOCkui/lOWNtC4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMob3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGRlZmF1bHRTeW5jKCkuc3luYygncmVhZCcsIHRoaXMgYXMgU3luY0NvbnRleHQsIG9wdGlvbnMpIGFzIFRNb2RlbFtdO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSBbW01vZGVsXV0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGZldGNoIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg5Xjgqfjg4Pjg4Hjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8b2JqZWN0W10+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwcm9ncmVzczogbm9vcCB9LCB0aGlzLl9kZWZhdWx0UXVlcnlPcHRpb25zLCBvcHRpb25zKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBwcm9ncmVzczogb3JpZ2luYWwsIGxpbWl0LCByZXNldCwgbm9DYWNoZSB9ID0gb3B0cztcbiAgICAgICAgICAgIGNvbnN0IHsgX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyIH0gPSB0aGlzO1xuICAgICAgICAgICAgY29uc3QgZmluYWxpemUgPSAobnVsbCA9PSBsaW1pdCk7XG5cbiAgICAgICAgICAgIG9wdHMucHJvZ3Jlc3MgPSAoaW5mbzogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUTW9kZWw+KSA9PiB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWwoaW5mbyk7XG4gICAgICAgICAgICAgICAgIWZpbmFsaXplICYmIHRoaXMuYWRkKGluZm8uaXRlbXMsIG9wdHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKG5vQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmaW5hbGl6ZSAmJiByZXNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQodW5kZWZpbmVkLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHF1ZXJ5SXRlbXMoX3F1ZXJ5SW5mbywgX3Byb3ZpZGVyLCBvcHRzKTtcblxuICAgICAgICAgICAgaWYgKGZpbmFsaXplKSB7XG4gICAgICAgICAgICAgICAgcmVzZXQgPyB0aGlzLnJlc2V0KHJlc3AsIG9wdHMpIDogdGhpcy5hZGQocmVzcCwgb3B0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BzeW5jJywgdGhpcyBhcyBDb2xsZWN0aW9uLCByZXNwLCBvcHRzKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZXJyb3InLCB1bmRlZmluZWQsIHRoaXMgYXMgQ29sbGVjdGlvbiwgZSwgb3B0cyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4ZWN1dGUgYGZldGNoKClgIHdpdGggbGFzdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDliY3lm57jgajlkIzmnaHku7bjgacgYGZldGNoKClgIOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlcXVlcnkgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODquOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXF1ZXJ5KG9wdGlvbnM/OiBDb2xsZWN0aW9uUmVxdWVyeU9wdGlvbnMpOiBQcm9taXNlPG9iamVjdFtdPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9sYXN0UXVlcnlPcHRpb25zLCBvcHRpb25zLCB7IHJlc2V0OiB0cnVlIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaChvcHRzKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBjb2xsZWN0aW9uIHNldHVwXG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIENvbGxlY3Rpb24g44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgasgTW9kZWwg44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYQgTW9kZWwg44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBOaWwgdmFsdWUuXG4gICAgICogIC0gYGphYCBOaWwg6KaB57SgXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiB1bmRlZmluZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIENvbGxlY3Rpb24g44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgasgTW9kZWwg44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYQgTW9kZWwg44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSBDb2xsZWN0aW9uIOOBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44GrIE1vZGVsIOOBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GEIE1vZGVsIOOBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkczogKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBzZXQoc2VlZHM/OiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkKVtdLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHZvaWQge1xuICAgICAgICBpZiAoaXNOaWwoc2VlZHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHBhcnNlOiB0aGlzLl9kZWZhdWx0UGFyc2UgfSwgX3NldE9wdGlvbnMsIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGlmIChvcHRzLnBhcnNlICYmICFpc0NvbGxlY3Rpb25Nb2RlbChzZWVkcywgdGhpcykpIHtcbiAgICAgICAgICAgIHNlZWRzID0gdGhpcy5wYXJzZShzZWVkcywgb3B0aW9ucykgfHwgW107XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXM6IChUTW9kZWwgfCBvYmplY3QgfCB1bmRlZmluZWQpW10gPSBzaW5ndWxhciA/IFtzZWVkc10gOiAoc2VlZHMgYXMgb2JqZWN0W10pLnNsaWNlKCk7XG5cbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG5cbiAgICAgICAgY29uc3QgYXQgPSAoKGNhbmRpZGF0ZSk6IG51bWJlciB8IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA+IHN0b3JlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgKz0gc3RvcmUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGNhbmRpZGF0ZSA8IDApID8gMCA6IGNhbmRpZGF0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkob3B0cy5hdCk7XG5cbiAgICAgICAgY29uc3Qgc2V0OiBvYmplY3RbXSAgICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvQWRkOiBUTW9kZWxbXSAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b01lcmdlOiBUTW9kZWxbXSAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9SZW1vdmU6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGNvbnN0IG1vZGVsU2V0ID0gbmV3IFNldDxvYmplY3Q+KCk7XG5cbiAgICAgICAgY29uc3QgeyBhZGQsIG1lcmdlLCByZW1vdmUsIHBhcnNlLCBzaWxlbnQgfSA9IG9wdHM7XG5cbiAgICAgICAgbGV0IHNvcnQgPSBmYWxzZTtcbiAgICAgICAgY29uc3Qgc29ydGFibGUgPSB0aGlzLl9jb21wYXJhdG9ycy5sZW5ndGggJiYgbnVsbCA9PSBhdCAmJiBmYWxzZSAhPT0gb3B0cy5zb3J0O1xuXG4gICAgICAgIHR5cGUgTW9kZWxGZWF0dXJlID0ge1xuICAgICAgICAgICAgcGFyc2U6IChhdHJyPzogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiBvYmplY3Q7XG4gICAgICAgICAgICBzZXRBdHRyaWJ1dGVzOiAoYXRycjogb2JqZWN0LCBvcHRpb25zPzogb2JqZWN0KSA9PiB2b2lkO1xuICAgICAgICAgICAgaGFzQ2hhbmdlZDogKCkgPT4gYm9vbGVhbjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUdXJuIGJhcmUgb2JqZWN0cyBpbnRvIG1vZGVsIHJlZmVyZW5jZXMsIGFuZCBwcmV2ZW50IGludmFsaWQgbW9kZWxzIGZyb20gYmVpbmcgYWRkZWQuXG4gICAgICAgIGZvciAoY29uc3QgW2ksIGl0ZW1dIG9mIGl0ZW1zLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgLy8gSWYgYSBkdXBsaWNhdGUgaXMgZm91bmQsIHByZXZlbnQgaXQgZnJvbSBiZWluZyBhZGRlZCBhbmQgb3B0aW9uYWxseSBtZXJnZSBpdCBpbnRvIHRoZSBleGlzdGluZyBtb2RlbC5cbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gdGhpcy5nZXQoaXRlbSkgYXMgTW9kZWxGZWF0dXJlO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1lcmdlICYmIGl0ZW0gIT09IGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBhdHRycyA9IGlzTW9kZWwoaXRlbSkgPyBpdGVtLnRvSlNPTigpIDogaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlICYmIGlzRnVuY3Rpb24oZXhpc3RpbmcucGFyc2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRycyA9IGV4aXN0aW5nLnBhcnNlKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGV4aXN0aW5nLnNldEF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZy5zZXRBdHRyaWJ1dGVzKGF0dHJzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIGF0dHJzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRvTWVyZ2UucHVzaChleGlzdGluZyBhcyBUTW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29ydGFibGUgJiYgIXNvcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvcnQgPSBpc0Z1bmN0aW9uKGV4aXN0aW5nLmhhc0NoYW5nZWQpID8gZXhpc3RpbmcuaGFzQ2hhbmdlZCgpIDogdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW1vZGVsU2V0LmhhcyhleGlzdGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxTZXQuYWRkKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnB1c2goZXhpc3RpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpdGVtc1tpXSA9IGV4aXN0aW5nO1xuICAgICAgICAgICAgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGJyYWNlLXN0eWxlXG5cbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBuZXcsIHZhbGlkIG1vZGVsLCBwdXNoIGl0IHRvIHRoZSBgdG9BZGRgIGxpc3QuXG4gICAgICAgICAgICBlbHNlIGlmIChhZGQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlbCA9IGl0ZW1zW2ldID0gdGhpc1tfcHJlcGFyZU1vZGVsXShpdGVtLCBvcHRzKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BZGQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbX2FkZFJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIHN0YWxlIG1vZGVscy5cbiAgICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKG1vZGVsKSkge1xuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZS5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9SZW1vdmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tfcmVtb3ZlTW9kZWxzXSh0b1JlbW92ZSwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWUgaWYgc29ydGluZyBpcyBuZWVkZWQsIHVwZGF0ZSBgbGVuZ3RoYCBhbmQgc3BsaWNlIGluIG5ldyBtb2RlbHMuXG4gICAgICAgIGxldCBvcmRlckNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgcmVwbGFjZSA9ICFzb3J0YWJsZSAmJiBhZGQgJiYgcmVtb3ZlO1xuICAgICAgICBpZiAoc2V0Lmxlbmd0aCAmJiByZXBsYWNlKSB7XG4gICAgICAgICAgICBvcmRlckNoYW5nZWQgPSAoc3RvcmUubGVuZ3RoICE9PSBzZXQubGVuZ3RoKSB8fCBzdG9yZS5zb21lKChtLCBpbmRleCkgPT4gbSAhPT0gc2V0W2luZGV4XSk7XG4gICAgICAgICAgICBzdG9yZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgc3BsaWNlQXJyYXkoc3RvcmUsIHNldCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAodG9BZGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoc29ydGFibGUpIHtcbiAgICAgICAgICAgICAgICBzb3J0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCB0b0FkZCwgbnVsbCA9PSBhdCA/IHN0b3JlLmxlbmd0aCA6IGF0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNpbGVudGx5IHNvcnQgdGhlIGNvbGxlY3Rpb24gaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgIGlmIChzb3J0KSB7XG4gICAgICAgICAgICB0aGlzLnNvcnQoeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVbmxlc3Mgc2lsZW5jZWQsIGl0J3MgdGltZSB0byBmaXJlIGFsbCBhcHByb3ByaWF0ZSBhZGQvc29ydC91cGRhdGUgZXZlbnRzLlxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbaSwgbW9kZWxdIG9mIHRvQWRkLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChudWxsICE9IGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBhdCArIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAYWRkJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0BhZGQnLCBtb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc29ydCB8fCBvcmRlckNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc29ydCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9BZGQubGVuZ3RoIHx8IHRvUmVtb3ZlLmxlbmd0aCB8fCB0b01lcmdlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgYWRkZWQ6IHRvQWRkLFxuICAgICAgICAgICAgICAgICAgICByZW1vdmVkOiB0b1JlbW92ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VkOiB0b01lcmdlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRyb3AgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IGl0ZW1zLmZpbHRlcihpID0+IG51bGwgIT0gaSkgYXMgVE1vZGVsW107XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBhZGRlZCAob3IgbWVyZ2VkKSBtb2RlbCAob3IgbW9kZWxzKS5cbiAgICAgICAgcmV0dXJuIHNpbmd1bGFyID8gcmV0dmFsWzBdIDogKHJldHZhbC5sZW5ndGggPyByZXR2YWwgOiB2b2lkIDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGEgY29sbGVjdGlvbiB3aXRoIGEgbmV3IGxpc3Qgb2YgbW9kZWxzIChvciBhdHRyaWJ1dGUgaGFzaGVzKSwgdHJpZ2dlcmluZyBhIHNpbmdsZSBgcmVzZXRgIGV2ZW50IG9uIGNvbXBsZXRpb24uXG4gICAgICogQGphIENvbGxlY3Rpb24g44KS5paw44GX44GEIE1vZGVsIOS4gOimp+OBp+e9ruaPmy4g5a6M5LqG5pmC44GrIGByZXNldGAg44Kk44OZ44Oz44OI44KS55m66KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgrvjg4Pjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVzZXQoc2VlZHM/OiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zICYgeyBwcmV2aW91czogVE1vZGVsW107IH07XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIHN0b3JlKSB7XG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMucHJldmlvdXMgPSBzdG9yZS5zbGljZSgpO1xuICAgICAgICByZXNldE1vZGVsU3RvcmUodGhpc1tfcHJvcGVydGllc10pO1xuXG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHNlZWRzID8gdGhpcy5hZGQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpIDogW107XG5cbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHJlc2V0JywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb2RlbHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBtb2RlbCB0byB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEgQ29sbGVjdGlvbiDjgbjjga4gTW9kZWwg44Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkKHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgdG8gdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqIEBqYSBNb2RlbCDjg6rjgrnjg4jmjIflrprjgavjgojjgosgQ29sbGVjdGlvbiDjgbjjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIGFkZChzZWVkczogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXQoc2VlZHMgYXMgVW5rbm93bk9iamVjdCwgT2JqZWN0LmFzc2lnbih7IG1lcmdlOiBmYWxzZSB9LCBvcHRpb25zLCBfYWRkT3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBtb2RlbCBmcm9tIHRoZSBzZXQuXG4gICAgICogQGphIENvbGxlY3Rpb24g44GL44KJIE1vZGVsIOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAgTW9kZWwg6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbGlzdCBvZiBtb2RlbHMgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSBNb2RlbCDjg6rjgrnjg4jmjIflrprjgavjgojjgosgQ29sbGVjdGlvbiDjgYvjgonjga7liYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCBNb2RlbCDopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVtb3ZlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDliYrpmaTjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWRzOiAoVE1vZGVsIHwgQ29sbGVjdGlvblNlZWQpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBDb2xsZWN0aW9uU2VlZClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10gfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3Qgc2luZ3VsYXIgPSAhaXNBcnJheShzZWVkcyk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gc2luZ3VsYXIgPyBbc2VlZHMgYXMgVE1vZGVsXSA6IChzZWVkcyBhcyBUTW9kZWxbXSkuc2xpY2UoKTtcbiAgICAgICAgY29uc3QgcmVtb3ZlZCA9IHRoaXNbX3JlbW92ZU1vZGVsc10oaXRlbXMsIG9wdHMpO1xuICAgICAgICBpZiAoIW9wdHMuc2lsZW50ICYmIHJlbW92ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7IGFkZGVkOiBbXSwgbWVyZ2VkOiBbXSwgcmVtb3ZlZCB9O1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNpbmd1bGFyID8gcmVtb3ZlZFswXSA6IHJlbW92ZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIG1vZGVsIHRvIHRoZSBlbmQgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOacq+WwvuOBqyBNb2RlbCDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBwdXNoKHNlZWQ6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNlZWQsIE9iamVjdC5hc3NpZ24oeyBhdDogc3RvcmUubGVuZ3RoIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7jga4gTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBwb3Aob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZShzdG9yZVtzdG9yZS5sZW5ndGggLSAxXSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBhIG1vZGVsIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOWFiOmgreOBqyBNb2RlbCDjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOimgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyB1bnNoaWZ0KHNlZWQ6IFRNb2RlbCB8IENvbGxlY3Rpb25TZWVkLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2VlZCwgT2JqZWN0LmFzc2lnbih7IGF0OiAwIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3jga4gTW9kZWwg44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzaGlmdChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHN0b3JlWzBdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIGEgbW9kZWwgaW4gdGhpcyBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmlrDjgZfjgYQgTW9kZWwg44Kk44Oz44K544K/44Oz44K544KS5L2c5oiQ44GXLCBDb2xsZWN0aW9uIOOBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJzXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGVzIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWxnuaAp+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBtb2RlbCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIE1vZGVsIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjcmVhdGUoYXR0cnM6IG9iamVjdCwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHdhaXQgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzW19wcmVwYXJlTW9kZWxdKGF0dHJzLCBvcHRpb25zIGFzIFNpbGVuY2VhYmxlKTtcbiAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbW9kZWwgPSBpc01vZGVsKHNlZWQpID8gc2VlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCF3YWl0IHx8ICFtb2RlbCkge1xuICAgICAgICAgICAgdGhpcy5hZGQoc2VlZCwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb2RlbC5zYXZlKHVuZGVmaW5lZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGVycm9yJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbW9kZWwgcHJlcGFyYXRpb24gKi9cbiAgICBwcml2YXRlIFtfcHJlcGFyZU1vZGVsXShhdHRyczogb2JqZWN0IHwgVE1vZGVsIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChpc0NvbGxlY3Rpb25Nb2RlbChhdHRycywgdGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRycztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBtb2RlbE9wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBuZXcgY29uc3RydWN0b3IoYXR0cnMsIG9wdHMpIGFzIHsgdmFsaWRhdGU6ICgpID0+IFJlc3VsdDsgfTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKG1vZGVsLnZhbGlkYXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1vZGVsLnZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGludmFsaWQnLCBhdHRycyBhcyBNb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCByZXN1bHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb2RlbCBhcyBUTW9kZWw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwbGFpbiBvYmplY3RcbiAgICAgICAgcmV0dXJuIGF0dHJzIGFzIFRNb2RlbDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCBjYWxsZWQgYnkgYm90aCByZW1vdmUgYW5kIHNldC4gKi9cbiAgICBwcml2YXRlIFtfcmVtb3ZlTW9kZWxzXShtb2RlbHM6IFRNb2RlbFtdLCBvcHRpb25zOiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHJlbW92ZWQ6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgbWRsIG9mIG1vZGVscykge1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSB0aGlzLmdldChtZGwpO1xuICAgICAgICAgICAgaWYgKCFtb2RlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXhPZihtb2RlbCk7XG4gICAgICAgICAgICBzdG9yZS5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVmZXJlbmNlcyBiZWZvcmUgdHJpZ2dlcmluZyAncmVtb3ZlJyBldmVudCB0byBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AuXG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCB0cnVlKTtcblxuICAgICAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQHJlbW92ZScsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZW1vdmVkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIGNyZWF0ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX2FkZFJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoX2NpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsIHRoaXNbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gc2V2ZXIgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwsIHBhcnRpYWwgPSBmYWxzZSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoX2NpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcnRpYWwgJiYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcExpc3RlbmluZyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgdGhpc1tfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUTW9kZWw+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2YgW1tFbGVtZW50QmFzZV1dIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOagvOe0jeOBl+OBpuOBhOOCiyBbW0VsZW1lbnRCYXNlXV0g44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcy5tb2RlbHMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxUTW9kZWw+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VE1vZGVsPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaWQpLCB2YWx1ZShtb2RlbCkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSwgdmFsdWUobW9kZWwpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBUTW9kZWxdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpZCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZykgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMubW9kZWxzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwb3Mya2V5ID0gKHBvczogbnVtYmVyKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBnZXRNb2RlbElkKGNvbnRleHQuYmFzZVtwb3NdLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKSB8fCBTdHJpbmcocG9zKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IocG9zMmtleShjdXJyZW50KSwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8vIG1peGluIOOBq+OCiOOCiyBgaW5zdGFuY2VvZmAg44Gv54Sh5Yq544Gr6Kit5a6aXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShDb2xsZWN0aW9uIGFzIENsYXNzLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuIiwiaW1wb3J0IHR5cGUgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB0eXBlIHsgTGlzdENoYW5nZWQsIExpc3RFZGl0T3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIGNsZWFyQXJyYXksXG4gICAgYXBwZW5kQXJyYXksXG4gICAgaW5zZXJ0QXJyYXksXG4gICAgcmVvcmRlckFycmF5LFxuICAgIHJlbW92ZUFycmF5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB0eXBlIHsgQ29sbGVjdGlvbiB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKlxuICogQGVuIEVkaXRlZCBjb2xsZWN0aW9uIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDooqvnt6jpm4YgQ29sbGVjdGlvbiDjga7lnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbkVkaXRlZTxNIGV4dGVuZHMgb2JqZWN0PiA9IENvbGxlY3Rpb248TSwgYW55LCBhbnk+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gcHJlcGFyZTxUIGV4dGVuZHMgb2JqZWN0Pihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uPFQ+KTogVFtdIHwgbmV2ZXIge1xuICAgIGlmIChjb2xsZWN0aW9uLmZpbHRlcmVkKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQsICdjb2xsZWN0aW9uIGlzIGFwcGxpZWQgYWZ0ZXItZmlsdGVyLicpO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGVjdGlvbi5tb2RlbHMuc2xpY2UoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuYXN5bmMgZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uPFQ+LFxuICAgIG9wdGlvbnM6IExpc3RFZGl0T3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBvcGVyYXRpb246ICh0YXJnZXRzOiBUW10sIHRva2VuOiBDYW5jZWxUb2tlbiB8IHVuZGVmaW5lZCkgPT4gUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPixcbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGNvbnN0IHRhcmdldHMgPSBwcmVwYXJlPFQ+KGNvbGxlY3Rpb24pO1xuICAgIGNvbnN0IGNoYW5nZSA9IGF3YWl0IG9wZXJhdGlvbih0YXJnZXRzLCBvcHRpb25zPy5jYW5jZWwpO1xuICAgIGNvbGxlY3Rpb24uc2V0KHRhcmdldHMsIG9wdGlvbnMpO1xuICAgIHJldHVybiBjaGFuZ2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIG1pbihpbmRpY2VzOiBudW1iZXJbXSk6IG51bWJlciB7XG4gICAgcmV0dXJuIGluZGljZXMucmVkdWNlKChsaHMsIHJocykgPT4gTWF0aC5taW4obGhzLCByaHMpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gbWFrZUxpc3RDaGFuZ2VkPFQ+KFxuICAgIHR5cGU6ICdhZGQnIHwgJ3JlbW92ZScgfCAncmVvcmRlcicsXG4gICAgY2hhbmdlczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSxcbiAgICByYW5nZUZyb206IG51bWJlcixcbiAgICByYW5nZVRvOiBudW1iZXIsXG4gICAgYXQ/OiBudW1iZXIsXG4pOiBMaXN0Q2hhbmdlZDxUPiB7XG4gICAgY29uc3QgY2hhbmdlZCA9ICEhY2hhbmdlcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZSxcbiAgICAgICAgbGlzdDogY2hhbmdlcyxcbiAgICAgICAgcmFuZ2U6IGNoYW5nZWQgPyB7IGZyb206IHJhbmdlRnJvbSwgdG86IHJhbmdlVG8gfSA6IHVuZGVmaW5lZCxcbiAgICAgICAgaW5zZXJ0ZWRUbzogY2hhbmdlZCA/IGF0IDogdW5kZWZpbmVkLFxuICAgIH0gYXMgTGlzdENoYW5nZWQ8VD47XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBlbGVtZW50cyBvZiBbW0NvbGxlY3Rpb25dXS5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDopoHntKDjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VUbyA9IGNvbGxlY3Rpb24ubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGNsZWFyQXJyYXkodGFyZ2V0cywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW1vdmUnLCBjaGFuZ2VzLCAwLCByYW5nZVRvKTtcbn1cblxuLyoqXG4gKiBAZW4gQXBwZW5kIHNvdXJjZSBlbGVtZW50cyB0byB0aGUgZW5kIG9mIFtbQ29sbGVjdGlvbl1dLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIOOBruacq+WwvuOBq+i/veWKoFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCBbW0NvbGxlY3Rpb25dXVxuICogIC0gYGphYCDlr77osaEgW1tDb2xsZWN0aW9uXV1cbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIHNyYzogVFtdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBjb2xsZWN0aW9uLmxlbmd0aDtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGFwcGVuZEFycmF5KHRhcmdldHMsIHNyYywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdhZGQnLCBjaGFuZ2VzLCByYW5nZUZyb20sIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgcmFuZ2VGcm9tKTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgW1tDb2xsZWN0aW9uXV0uXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g44Gu5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zZXJ0Q29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIGluZGV4OiBudW1iZXIsXG4gICAgc3JjOiBUW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gaW5zZXJ0QXJyYXkodGFyZ2V0cywgaW5kZXgsIHNyYywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdhZGQnLCBjaGFuZ2VzLCBpbmRleCwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCBpbmRleCk7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIgW1tDb2xsZWN0aW9uXV0gZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0gcmVmZXJlbmNlLlxuICogIC0gYGphYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgaW5kZXg6IG51bWJlcixcbiAgICBvcmRlcnM6IG51bWJlcltdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBtaW4oW2luZGV4LCAuLi5vcmRlcnNdKTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IHJlb3JkZXJBcnJheSh0YXJnZXRzLCBpbmRleCwgb3JkZXJzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3Jlb3JkZXInLCBjaGFuZ2VzLCByYW5nZUZyb20sIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgaW5kZXgpO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgW1tDb2xsZWN0aW9uXV0gZWxlbWVudHMuXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCByZW1vdmVkIG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIG9yZGVyczogbnVtYmVyW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IG1pbihvcmRlcnMpO1xuICAgIGNvbnN0IHJhbmdlVG8gPSBjb2xsZWN0aW9uLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiByZW1vdmVBcnJheSh0YXJnZXRzLCBvcmRlcnMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVtb3ZlJywgY2hhbmdlcywgcmFuZ2VGcm9tLCByYW5nZVRvKTtcbn1cbiJdLCJuYW1lcyI6WyJ0cnVuYyIsImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBOzs7O0FBSUc7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFB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
