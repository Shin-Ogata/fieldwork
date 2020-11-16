/*!
 * @cdp/collection 0.9.5
 *   generic collection scheme
 */

import { getLanguage } from '@cdp/i18n';
import { unique, computeDate, isFunction, sort, shuffle, luid, isString, at, noop, isNil, isArray, setMixClassAttribute } from '@cdp/core-utils';
import { checkCanceled } from '@cdp/promise';
import { ObservableArray } from '@cdp/observable';
import { makeResult, RESULT_CODE, FAILED } from '@cdp/result';
import { EventSource, EventBroker, EventPublisher } from '@cdp/events';
import { defaultSync } from '@cdp/data-sync';
import { isModel } from '@cdp/model';

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
        if (index < 0 || length <= index || trunc(index) !== index) {
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
    if (index < 0 || target.length < index || trunc(index) !== index) {
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
    if (index < 0 || target.length < index || trunc(index) !== index) {
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

/** @internal */
const trunc$1 = Math.trunc.bind(Math);
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
        await checkCanceled(token);
        if (index < 0 || targets.length <= index || trunc$1(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        }
        else if (null != limit && (limit <= 0 || trunc$1(limit) !== limit)) {
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
        await checkCanceled(token);
        if (index < 0 || trunc$1(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        }
        else if (null != limit && (limit <= 0 || trunc$1(limit) !== limit)) {
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
class Collection extends EventSource {
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
        if (isString(seed) && byId.has(seed)) {
            return byId.get(seed);
        }
        const id = getModelId(isModel(seed) ? seed.toJSON() : seed, modelConstructor(this));
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
     * @ja インデックス指定によるモデルへのアクセス. 負値の場合は末尾検索を実行
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJ1dGlscy9jb21wYXJhdG9yLnRzIiwidXRpbHMvYXJyYXktY3Vyc29yLnRzIiwidXRpbHMvYXJyYXktZWRpdG9yLnRzIiwicXVlcnkvZHluYW1pYy1maWx0ZXJzLnRzIiwicXVlcnkvZHluYW1pYy1jb25kaXRpb24udHMiLCJxdWVyeS9xdWVyeS50cyIsImJhc2UudHMiLCJjb2xsZWN0aW9uLWVkaXRvci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAsICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kc1xuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIENPTExFQ1RJT04gPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxMCxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19DT0xMRUNUSU9OX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUyAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDEsICdpbnZhbGlkIGFjY2Vzcy4nKSxcbiAgICAgICAgRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5DT0xMRUNUSU9OICsgMiwgJ2ludmFsaWQgY29tcGFyYXRvcnMuJyksXG4gICAgICAgIEVSUk9SX01WQ19FRElUX1BFUk1JU1NJT05fREVOSUVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDMsICdlZGl0aW5nIHBlcm1pc3Npb24gZGVuaWVkLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgW1tDb2xsYXRvclByb3ZpZGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBbW0NvbGxhdG9yUHJvdmlkZXJdXSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRDb2xsYXRvclByb3ZpZGVyKG5ld1Byb3ZpZGVyPzogQ29sbGF0b3JQcm92aWRlcik6IENvbGxhdG9yUHJvdmlkZXIge1xuICAgIGlmIChudWxsID09IG5ld1Byb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiBfY29sbGF0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvdmlkZXIgPSBfY29sbGF0b3I7XG4gICAgICAgIF9jb2xsYXRvciA9IG5ld1Byb3ZpZGVyO1xuICAgICAgICByZXR1cm4gb2xkUHJvdmlkZXI7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBHZXQgc3RyaW5nIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5paH5a2X5YiX5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHJpbmdDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBULCByaHM6IFQpOiBudW1iZXIgPT4ge1xuICAgICAgICAvLyB1bmRlZmluZWQg44GvICcnIOOBqOWQjOetieOBq+aJseOBhlxuICAgICAgICBjb25zdCBsaHNQcm9wID0gKG51bGwgIT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkgPyBsaHNbcHJvcCBhcyBzdHJpbmddIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcCBhcyBzdHJpbmddKSA/IHJoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgcmV0dXJuIG9yZGVyICogX2NvbGxhdG9yKCkuY29tcGFyZShsaHNQcm9wLCByaHNQcm9wKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZGF0ZSBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaXpeaZguavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IGxoc0RhdGUgPSBsaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBjb25zdCByaHNEYXRlID0gcmhzW3Byb3AgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcCBhcyBzdHJpbmddID09PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAobGhzW3Byb3AgYXMgc3RyaW5nXSA8IHJoc1twcm9wIGFzIHN0cmluZ10gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSBbW1NvcnRLZXldXS5cbiAqIEBqYSBbW1NvcnRLZXldXSDjgpIgY29tcGFyYXRvciDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5OiBTb3J0S2V5PEs+KTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICBjb25zdCB7IG5hbWUsIHR5cGUsIG9yZGVyIH0gPSBzb3J0S2V5O1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSz4obmFtZSwgb3JkZXIpO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiBnZXRCb29sZWFuQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gZ2V0TnVtYmVyQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgcmV0dXJuIGdldERhdGVDb21wYXJhdG9yPFQsIEs+KG5hbWUsIG9yZGVyKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLPihuYW1lLCBvcmRlcik7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgYXJyYXkgZnJvbSBbW1NvcnRLZXldXSBhcnJheS5cbiAqIEBqYSBbW1NvcnRLZXldXSDphY3liJfjgpIgY29tcGFyYXRvciDphY3liJfjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTb3J0S2V5czxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5czogU29ydEtleTxLPltdKTogU29ydENhbGxiYWNrPFQ+W10ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VD5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc29ydEtleSBvZiBzb3J0S2V5cykge1xuICAgICAgICBjb21wYXJhdG9ycy5wdXNoKHRvQ29tcGFyYXRvcihzb3J0S2V5KSk7XG4gICAgfVxuICAgIHJldHVybiBjb21wYXJhdG9ycztcbn1cbiIsIi8qKlxuICogQGVuIEN1cnNvciBwb3NpdGlvbiBjb25zdGFudC5cbiAqIEBqYSDjgqvjg7zjgr3jg6vkvY3nva7lrprmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3Vyc29yUG9zIHtcbiAgICBPVVRfT0ZfUkFOR0UgICAgPSAtMSxcbiAgICBDVVJSRU5UICAgICAgICAgPSAtMixcbn1cblxuLyoqXG4gKiBAZW4gU2VlayBleHByZXNzaW9uIGZ1bmN0aW9uIHR5cGUuXG4gKiBAamEg44K344O844Kv5byP6Zai5pWw5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIFNlZWtFeHA8VD4gPSAodmFsdWU6IFQsIGluZGV4PzogbnVtYmVyLCBvYmo/OiBUW10pID0+IGJvb2xlYW47XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBwcm92aWRlcyBjdXJzb3IgaW50ZXJmYWNlIGZvciBBcnJheS4gPGJyPlxuICogICAgIEl0IGlzIGRpZmZlcmVudCBmcm9tIEl0ZXJhdG9yIGludGVyZmFjZSBvZiBlczIwMTUsIGFuZCB0aGF0IHByb3ZpZGVzIGludGVyZmFjZSB3aGljaCBpcyBzaW1pbGFyIHRvIERCIHJlY29yZHNldCdzIG9uZS5cbiAqIEBqYSBBcnJheSDnlKjjgqvjg7zjgr3jg6sgSS9GIOOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgZXMyMDE1IOOBriBJdGVyYXRvciBJL0Yg44Go44Gv55Ww44Gq44KK44CBREIgcmVjb3Jkc2V0IOOCquODluOCuOOCp+OCr+ODiOODqeOCpOOCr+OBqui1sOafuyBJL0Yg44KS5o+Q5L6b44GZ44KLXG4gKi9cbmV4cG9ydCBjbGFzcyBBcnJheUN1cnNvcjxUID0gYW55PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKiBAaW50ZXJuYWwg5a++6LGh44Gu6YWN5YiXICAqL1xuICAgIHByaXZhdGUgX2FycmF5OiBUW107XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7lhYjpoK3jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAgKi9cbiAgICBwcml2YXRlIF9ib2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7mnKvlsL7jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2VvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOePvuWcqOOBriBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IDBcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogMFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFycmF5OiBUW10sIGluaXRpYWxJbmRleCA9IDApIHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHRhcmdldCBhcnJheS5cbiAgICAgKiBAamEg5a++6LGh44Gu5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheS4gZGVmYXVsdDogZW1wdHkgYXJyYXkuXG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrpouICAgZGVmYXVsdDog56m66YWN5YiXXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KGFycmF5OiBUW10gPSBbXSwgaW5pdGlhbEluZGV4OiBudW1iZXIgPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBjdXJyZW50IGVsZW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBjdXJyZW50KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXlbdGhpcy5faW5kZXhdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo5oyH44GX56S644GX44Gm44GE44KLIGluZGV4IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0YXJnZXQgYXJyYXkgbGVuZ3RoLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjga7opoHntKDmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEJPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruWFiOmgreOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0JPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgRU9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5pyr5bC+44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRU9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcmF3IGFycmF5IGluc3RhbmNlLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgYXJyYXkoKTogVFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGN1cnNvciBvcGVyYXRpb246XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBmaXJzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUZpcnN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbGFzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUxhc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5Lmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBuZXh0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuasoeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTmV4dCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9ib2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBwcmV2aW91cyBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLliY3jgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZVByZXZpb3VzKCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2VvZikge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4LS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNlZWsgYnkgcGFzc2VkIGNyaXRlcmlhLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBvcGVyYXRpb24gZmFpbGVkLCB0aGUgY3Vyc29yIHBvc2l0aW9uIHNldCB0byBFT0YuXG4gICAgICogQGphIOaMh+WumuadoeS7tuOBp+OCt+ODvOOCryA8YnI+XG4gICAgICogICAgIOOCt+ODvOOCr+OBq+WkseaVl+OBl+OBn+WgtOWQiOOBryBFT0Yg54q25oWL44Gr44Gq44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY3JpdGVyaWFcbiAgICAgKiAgLSBgZW5gIGluZGV4IG9yIHNlZWsgZXhwcmVzc2lvblxuICAgICAqICAtIGBqYWAgaW5kZXggLyDmnaHku7blvI/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Vlayhjcml0ZXJpYTogbnVtYmVyIHwgU2Vla0V4cDxUPik6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKCdudW1iZXInID09PSB0eXBlb2YgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gY3JpdGVyaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5LmZpbmRJbmRleChjcml0ZXJpYSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiDjgqvjg7zjgr3jg6vjgYzmnInlirnjgarnr4Tlm7LjgpLnpLrjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHJldHVybnMgdHJ1ZTog5pyJ5Yq5IC8gZmFsc2U6IOeEoeWKuVxuICAgICAqL1xuICAgIHByaXZhdGUgdmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAoMCA8PSB0aGlzLl9pbmRleCAmJiB0aGlzLl9pbmRleCA8IHRoaXMuX2FycmF5Lmxlbmd0aCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5pcXVlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsVG9rZW4sXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IE9ic2VydmFibGVBcnJheSwgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHRydW5jID0gTWF0aC50cnVuYy5iaW5kKE1hdGgpO1xuXG4vKiogQGludGVybmFsIHdhaXQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gKi9cbmZ1bmN0aW9uIG1ha2VQcm9taXNlPFQ+KGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+LCByZW1hcD86IFRbXSk6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgY2FsbGJhY2sgPSAocmVjb3JkczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgZWRpdG9yLm9mZihjYWxsYmFjayk7XG4gICAgICAgICAgICBpZiAocmVtYXApIHtcbiAgICAgICAgICAgICAgICByZW1hcC5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgIHJlbWFwLnB1c2goLi4uZWRpdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUocmVjb3Jkcyk7XG4gICAgICAgIH07XG4gICAgICAgIGVkaXRvci5vbihjYWxsYmFjayk7XG4gICAgfSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCB0byBbW09ic2VydmFibGVBcnJheV1dIGlmIG5lZWRlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldEVkaXRDb250ZXh0PFQ+KFxuICAgIHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLFxuICAgIHRva2VuPzogQ2FuY2VsVG9rZW5cbik6IFByb21pc2U8eyBlZGl0b3I6IE9ic2VydmFibGVBcnJheTxUPjsgcHJvbWlzZTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPjsgfT4gfCBuZXZlciB7XG4gICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIE9ic2VydmFibGVBcnJheSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3I6IHRhcmdldCxcbiAgICAgICAgICAgIHByb21pc2U6IG1ha2VQcm9taXNlKHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgY29uc3QgZWRpdG9yID0gT2JzZXJ2YWJsZUFycmF5LmZyb20odGFyZ2V0KTtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZWRpdG9yLFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UoZWRpdG9yLCB0YXJnZXQpLFxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgJ3RhcmdldCBpcyBub3QgQXJyYXkgb3IgT2JzZXJ2YWJsZUFycmF5LicpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCB2YWxpZCBvcmRlcnMgaW5kZXggKi9cbmZ1bmN0aW9uIHZhbGlkT3JkZXJzKGxlbmd0aDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdKTogYm9vbGVhbiB8IG5ldmVyIHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGluZGV4IG9mIG9yZGVycykge1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IGxlbmd0aCA8PSBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGBvcmRlcnNbXSBpbmRleCBpcyBpbnZhbGlkLiBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5wdXNoKC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgYXJyYXkuXG4gKiBAamEg5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCB0cnVuYyhpbmRleCkgIT09IGluZGV4KSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuTk9UX1NVUFBPUlRFRCwgYGluc2VydEFycmF5KCksIGluZGV4IGlzIGludmFsaWQuIGluZGV4OiAke2luZGV4fWApO1xuICAgIH0gZWxzZSBpZiAobnVsbCA9PSBzcmMgfHwgc3JjLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICBlZGl0b3Iuc3BsaWNlKGluZGV4LCAwLCAuLi5zcmMpO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIgYXJyYXkgZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEg6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCBlZGl0IG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVvcmRlckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBpbmRleDogbnVtYmVyLCBvcmRlcnM6IG51bWJlcltdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgLy8g5pyA5b6M44Gu6KaB57Sg44Gr6L+95Yqg44GZ44KL44Gf44KBIGluZGV4ID09IHRhcmdldC5sZW5ndGgg44KS6Kix5a65XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0YXJnZXQubGVuZ3RoIDwgaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLk5PVF9TVVBQT1JURUQsIGByZW9yZGVyQXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g5L2c5qWt6YWN5YiX44Gn57eo6ZuGXG4gICAgbGV0IHdvcms6IChUIHwgbnVsbClbXSA9IEFycmF5LmZyb20oZWRpdG9yKTtcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlb3JkZXJzOiBUW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICAgICAgcmVvcmRlcnMucHVzaChlZGl0b3Jbb3JkZXJdKTtcbiAgICAgICAgICAgIHdvcmtbb3JkZXJdID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHdvcmsuc3BsaWNlKGluZGV4LCAwLCAuLi5yZW9yZGVycyk7XG4gICAgICAgIHdvcmsgPSB3b3JrLmZpbHRlcigodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBudWxsICE9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyDlgKTjgpLmm7jjgY3miLvjgZdcbiAgICBmb3IgKGNvbnN0IGlkeCBvZiB3b3JrLmtleXMoKSkge1xuICAgICAgICBlZGl0b3JbaWR4XSA9IHdvcmtbaWR4XSBhcyBUO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIHJlbW92ZWQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgb3JkZXJzOiBudW1iZXJbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmICghdmFsaWRPcmRlcnModGFyZ2V0Lmxlbmd0aCwgb3JkZXJzKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgLy8g6ZmN6aCG44K944O844OIXG4gICAgb3JkZXJzLnNvcnQoKGxocywgcmhzKSA9PiB7XG4gICAgICAgIHJldHVybiAobGhzIDwgcmhzID8gMSA6IC0xKTtcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3Qgb3JkZXIgb2YgdW5pcXVlKG9yZGVycykpIHtcbiAgICAgICAgZWRpdG9yLnNwbGljZShvcmRlciwgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG4iLCJpbXBvcnQgeyBLZXlzLCBjb21wdXRlRGF0ZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBGaWx0ZXJDYWxsYmFjaywgRHluYW1pY0NvbWJpbmF0aW9uIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZUFMTDxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8bnVtYmVyIHwgc3RyaW5nIHwgRGF0ZSwgVFtLZXlzPFQ+XT47XG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBWYWx1ZVR5cGVDb21wYXJhYmxlPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZVN0cmluZzxUIGV4dGVuZHMgb2JqZWN0PiA9IEV4dHJhY3Q8c3RyaW5nLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIER5bmFtaWNPcGVyYXRvckRhdGVVbml0ID0gJ3llYXInIHwgJ21vbnRoJyB8ICdkYXknIHwgdW5kZWZpbmVkO1xuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA9PT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQUxMPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSAhPT0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlcjxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPiB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1MgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA8IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuR1JFQVRFUl9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyZWF0ZXJFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IGl0ZW1bcHJvcF0gPj0gdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gbGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA8PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBsaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmNsdWRlcyh2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9MSUtFICovXG5leHBvcnQgZnVuY3Rpb24gbm90TGlrZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogVmFsdWVUeXBlU3RyaW5nPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gIVN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfTk9UX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZGF0ZUxlc3NOb3RFcXVhbDxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCB2YWx1ZTogbnVtYmVyLCB1bml0OiBEeW5hbWljT3BlcmF0b3JEYXRlVW5pdCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IGNvbXB1dGVEYXRlKG5ldyBEYXRlKCksIC0xICogdmFsdWUsIHVuaXQpO1xuICAgICAgICByZXR1cm4gIShkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSkpO1xuICAgIH07XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5SQU5HRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIG1pbjogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPiwgbWF4OiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiBjb21iaW5hdGlvbihEeW5hbWljQ29tYmluYXRpb24uQU5ELCBncmVhdGVyRXF1YWwocHJvcCwgbWluKSwgbGVzc0VxdWFsKHByb3AsIG1heCkpO1xufVxuXG4vKiogQGludGVybmFsIOODleOCo+ODq+OCv+OBruWQiOaIkCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmF0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KHR5cGU6IER5bmFtaWNDb21iaW5hdGlvbiwgbGhzOiBGaWx0ZXJDYWxsYmFjazxUPiwgcmhzOiBGaWx0ZXJDYWxsYmFjazxUPiB8IHVuZGVmaW5lZCk6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gIXJocyA/IGxocyA6IChpdGVtOiBUKSA9PiB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uQU5EOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgY2FzZSBEeW5hbWljQ29tYmluYXRpb24uT1I6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSB8fCByaHMoaXRlbSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgdW5rbm93biBjb21iaW5hdGlvbjogJHt0eXBlfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIC8vIGZhaWwgc2FmZVxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgJiYgcmhzKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiIsImltcG9ydCB7IEtleXMgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgU29ydEtleSxcbiAgICBEeW5hbWljQ29uZGl0aW9uU2VlZCxcbiAgICBEeW5hbWljT3BlcmF0b3JDb250ZXh0LFxuICAgIER5bmFtaWNMaW1pdENvbmRpdGlvbixcbiAgICBEeW5hbWljT3BlcmF0b3IsXG4gICAgRHluYW1pY0NvbWJpbmF0aW9uLFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVmFsdWVUeXBlQUxMLFxuICAgIFZhbHVlVHlwZUNvbXBhcmFibGUsXG4gICAgVmFsdWVUeXBlU3RyaW5nLFxuICAgIGVxdWFsLFxuICAgIG5vdEVxdWFsLFxuICAgIGdyZWF0ZXIsXG4gICAgbGVzcyxcbiAgICBncmVhdGVyRXF1YWwsXG4gICAgbGVzc0VxdWFsLFxuICAgIGxpa2UsXG4gICAgbm90TGlrZSxcbiAgICBkYXRlTGVzc0VxdWFsLFxuICAgIGRhdGVMZXNzTm90RXF1YWwsXG4gICAgcmFuZ2UsXG4gICAgY29tYmluYXRpb24sXG59IGZyb20gJy4vZHluYW1pYy1maWx0ZXJzJztcblxuLyoqXG4gKiBAZW4gRHluYW1pYyBxdWVyeSBjb25kaXRpb24gbWFuYWdlciBjbGFzcy5cbiAqIEBqYSDjg4DjgqTjg4rjg5/jg4Pjgq/jgq/jgqjjg6rnirbmhYvnrqHnkIbjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIER5bmFtaWNDb25kaXRpb248VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PiBpbXBsZW1lbnRzIER5bmFtaWNDb25kaXRpb25TZWVkPFRJdGVtLCBUS2V5PiB7XG5cbiAgICBwcml2YXRlIF9vcGVyYXRvcnM6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfY29tYmluYXRpb246IER5bmFtaWNDb21iaW5hdGlvbjtcbiAgICBwcml2YXRlIF9zdW1LZXlzOiBLZXlzPFRJdGVtPltdO1xuICAgIHByaXZhdGUgX2xpbWl0PzogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPjtcbiAgICBwcml2YXRlIF9yYW5kb206IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBfc29ydEtleXM6IFNvcnRLZXk8VEtleT5bXTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIFtbRHluYW1pY0NvbmRpdGlvblNlZWRdXSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgW1tEeW5hbWljQ29uZGl0aW9uU2VlZF1dIOOCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4gPSB7IG9wZXJhdG9yczogW10gfSkge1xuICAgICAgICBjb25zdCB7IG9wZXJhdG9ycywgY29tYmluYXRpb24sIHN1bUtleXMsIGxpbWl0LCByYW5kb20sIHNvcnRLZXlzIH0gPSBzZWVkcztcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzICAgICA9IG9wZXJhdG9ycztcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gICA9IG51bGwgIT0gY29tYmluYXRpb24gPyBjb21iaW5hdGlvbiA6IER5bmFtaWNDb21iaW5hdGlvbi5BTkQ7XG4gICAgICAgIHRoaXMuX3N1bUtleXMgICAgICAgPSBudWxsICE9IHN1bUtleXMgPyBzdW1LZXlzIDogW107XG4gICAgICAgIHRoaXMuX2xpbWl0ICAgICAgICAgPSBsaW1pdDtcbiAgICAgICAgdGhpcy5fcmFuZG9tICAgICAgICA9ICEhcmFuZG9tO1xuICAgICAgICB0aGlzLl9zb3J0S2V5cyAgICAgID0gc29ydEtleXMgfHwgW107XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogRHluYW1pY0NvbmRpdGlvblNlZWRcblxuICAgIGdldCBvcGVyYXRvcnMoKTogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcGVyYXRvcnM7XG4gICAgfVxuXG4gICAgc2V0IG9wZXJhdG9ycyh2YWx1ZXM6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W10pIHtcbiAgICAgICAgdGhpcy5fb3BlcmF0b3JzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIGdldCBzdW1LZXlzKCk6IChLZXlzPFRJdGVtPilbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdW1LZXlzO1xuICAgIH1cblxuICAgIHNldCBzdW1LZXlzKHZhbHVlczogKEtleXM8VEl0ZW0+KVtdKSB7XG4gICAgICAgIHRoaXMuX3N1bUtleXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IGNvbWJpbmF0aW9uKCk6IER5bmFtaWNDb21iaW5hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb21iaW5hdGlvbjtcbiAgICB9XG5cbiAgICBzZXQgY29tYmluYXRpb24odmFsdWU6IER5bmFtaWNDb21iaW5hdGlvbikge1xuICAgICAgICB0aGlzLl9jb21iaW5hdGlvbiA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBsaW1pdCgpOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xpbWl0O1xuICAgIH1cblxuICAgIHNldCBsaW1pdCh2YWx1ZTogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPiB8IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9saW1pdCA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCByYW5kb20oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yYW5kb207XG4gICAgfVxuXG4gICAgc2V0IHJhbmRvbSh2YWx1ZTogYm9vbGVhbikge1xuICAgICAgICB0aGlzLl9yYW5kb20gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgc29ydEtleXMoKTogU29ydEtleTxUS2V5PltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvcnRLZXlzO1xuICAgIH1cblxuICAgIHNldCBzb3J0S2V5cyh2YWx1ZXM6IFNvcnRLZXk8VEtleT5bXSkge1xuICAgICAgICB0aGlzLl9zb3J0S2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgYWNjZXNzb3I6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbXBhcmF0b3IgZnVuY3Rpb25zLlxuICAgICAqIEBqYSDmr5TovIPplqLmlbDlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgY29tcGFyYXRvcnMoKTogU29ydENhbGxiYWNrPFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRTb3J0S2V5cyh0aGlzLl9zb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBzeW50aGVzaXMgZmlsdGVyIGZ1bmN0aW9uLlxuICAgICAqIEBqYSDlkIjmiJDmuIjjgb/jg5XjgqPjg6vjgr/plqLmlbDlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgZmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB7XG4gICAgICAgIGxldCBmbHRyOiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBjb25kIG9mIHRoaXMuX29wZXJhdG9ycykge1xuICAgICAgICAgICAgY29uc3QgeyBvcGVyYXRvciwgcHJvcCwgdmFsdWUgfSA9IGNvbmQ7XG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTk9UX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdEVxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVBTEw8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVI6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlcjxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTEVTUzpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXNzPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXJFcXVhbDxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXNzRXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxJS0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGlrZTxUSXRlbT4ocHJvcCwgdmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RMaWtlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc0VxdWFsPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBudW1iZXIsIGNvbmQudW5pdCksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5EQVRFX0xFU1NfTk9UX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGVMZXNzTm90RXF1YWw8VEl0ZW0+KHByb3AsIHZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLlJBTkdFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlPFRJdGVtPihwcm9wLCB2YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiwgY29uZC5yYW5nZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0b3I6ICR7b3BlcmF0b3J9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZsdHIgfHwgKCgvKiBpdGVtICovKSA9PiB0cnVlKTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIEtleXMsXG4gICAgaXNGdW5jdGlvbixcbiAgICBzb3J0LFxuICAgIHNodWZmbGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBTb3J0S2V5LFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0LFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBEeW5hbWljTGltaXQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMvY29tcGFyYXRvcic7XG5pbXBvcnQgeyBEeW5hbWljQ29uZGl0aW9uIH0gZnJvbSAnLi9keW5hbWljLWNvbmRpdGlvbic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHRydW5jID0gTWF0aC50cnVuYy5iaW5kKE1hdGgpO1xuXG4vKiogQGludGVybmFsIOS9v+eUqOOBmeOCi+ODl+ODreODkeODhuOCo+OBjOS/neiovOOBleOCjOOBnyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyAqL1xuaW50ZXJmYWNlIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+IGV4dGVuZHMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBzb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuICAgIGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W107XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBBcHBseSBgZmlsdGVyYCBhbmQgYHNvcnQga2V5YCB0byB0aGUgYGl0ZW1zYCBmcm9tIFtbcXVlcnlJdGVtc11dYCgpYCByZXN1bHQuXG4gKiBAamEgW1txdWVyeUl0ZW1zXV1gKClgIOOBl+OBnyBgaXRlbXNgIOOBq+WvvuOBl+OBpiBgZmlsdGVyYCDjgaggYHNvcnQga2V5YCDjgpLpgannlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEl0ZW1zPFRJdGVtPihpdGVtczogVEl0ZW1bXSwgZmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgbnVsbCwgLi4uY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSk6IFRJdGVtW10ge1xuICAgIGxldCByZXN1bHQgPSBpc0Z1bmN0aW9uKGZpbHRlcikgPyBpdGVtcy5maWx0ZXIoZmlsdGVyKSA6IGl0ZW1zLnNsaWNlKCk7XG4gICAgZm9yIChjb25zdCBjb21wYXJhdG9yIG9mIGNvbXBhcmF0b3JzKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBhcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzb3J0KHJlc3VsdCwgY29tcGFyYXRvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgY29uZGl0aW5hbEZpeCDjgavkvb/nlKjjgZnjgosgQ3JpdGVyaWEgTWFwICovXG5jb25zdCBfbGltaXRDcml0ZXJpYSA9IHtcbiAgICBbRHluYW1pY0xpbWl0LkNPVU5UXTogbnVsbCxcbiAgICBbRHluYW1pY0xpbWl0LlNVTV06IHsgY29lZmY6IDEgfSxcbiAgICBbRHluYW1pY0xpbWl0LlNFQ09ORF06IHsgY29lZmY6IDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1JTlVURV06IHsgY29lZmY6IDYwICogMTAwMCB9LFxuICAgIFtEeW5hbWljTGltaXQuSE9VUl06IHsgY29lZmY6IDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5EQVldOiB7IGNvZWZmOiAyNCAqIDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5LQl06IHsgY29lZmY6IDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0Lk1CXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgfSxcbiAgICBbRHluYW1pY0xpbWl0LkdCXTogeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5UQl06IHsgY29lZmY6IDEwMjQgKiAxMDI0ICogMTAyNCAqIDEwMjQgfSxcbn07XG5cbi8qKlxuICogQGVuIEZpeCB0aGUgdGFyZ2V0IGl0ZW1zIGJ5IFtbRHluYW1pY0NvbmRpdGlvbl1dLlxuICogQGphIFtbRHluYW1pY0NvbmRpdGlvbl1dIOOBq+W+k+OBhOWvvuixoeOCkuaVtOW9olxuICpcbiAqIEBwYXJhbSBpdGVtc1xuICogIC0gYGVuYCB0YXJnZXQgaXRlbXMgKGRlc3RydWN0aXZlKVxuICogIC0gYGphYCDlr77osaHjga7jgqLjgqTjg4bjg6AgKOegtOWjiueahClcbiAqIEBwYXJhbSBjb25kaXRpb25cbiAqICAtIGBlbmAgY29uZGl0aW9uIG9iamVjdFxuICogIC0gYGphYCDmnaHku7bjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbmRpdGlvbmFsRml4PFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4oXG4gICAgaXRlbXM6IFRJdGVtW10sXG4gICAgY29uZGl0aW9uOiBEeW5hbWljQ29uZGl0aW9uPFRJdGVtLCBUS2V5PlxuKTogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4ge1xuICAgIGNvbnN0IHsgcmFuZG9tLCBsaW1pdCwgc3VtS2V5cyB9ID0gY29uZGl0aW9uO1xuXG4gICAgaWYgKHJhbmRvbSkge1xuICAgICAgICBzaHVmZmxlKGl0ZW1zLCB0cnVlKTtcbiAgICB9XG5cbiAgICBpZiAobGltaXQpIHtcbiAgICAgICAgY29uc3QgeyB1bml0LCB2YWx1ZSwgcHJvcCB9ID0gbGltaXQ7XG4gICAgICAgIGNvbnN0IHJlc2V0OiBUSXRlbVtdID0gW107XG4gICAgICAgIGNvbnN0IGNyaXRlcmlhID0gX2xpbWl0Q3JpdGVyaWFbdW5pdF07XG4gICAgICAgIGNvbnN0IGxpbWl0Q291bnQgPSB2YWx1ZTtcbiAgICAgICAgY29uc3QgZXhjZXNzID0gISFsaW1pdC5leGNlc3M7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgaWYgKCFjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gaXRlbVtwcm9wIGFzIEtleXM8VEl0ZW0+XSkge1xuICAgICAgICAgICAgICAgIGNvdW50ICs9IChOdW1iZXIoaXRlbVtwcm9wIGFzIEtleXM8VEl0ZW0+XSkgLyBjcml0ZXJpYS5jb2VmZik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgY2Fubm90IGFjY2VzcyBwcm9wZXJ0eTogJHtwcm9wfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGltaXRDb3VudCA8IGNvdW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4Y2Vzcykge1xuICAgICAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpdGVtcyA9IHJlc2V0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAgICAgICAgaXRlbXMsXG4gICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtLCBLZXlzPFRJdGVtPj47XG5cbiAgICBpZiAoMCA8IHN1bUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2Ygc3VtS2V5cykge1xuICAgICAgICAgICAgICAgIGlmICghKGtleSBpbiByZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpICs9IE51bWJlcihpdGVtW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwg44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL5a++6LGh44Gr5a++44GX44GmIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zIOOBq+aMh+WumuOBleOCjOOBn+aMr+OCi+iInuOBhOOCkuihjOOBhuWGhemDqCBxdWVyeSDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbUNhY2hlPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIGNhY2hlZDogVEl0ZW1bXSxcbiAgICBvcHRpb25zOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGZpbHRlcixcbiAgICAgICAgY29tcGFyYXRvcnMsXG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICAgICAgbm9TZWFyY2gsXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICAvLyDjgq3jg6Pjg4Pjgrfjg6Xjgavlr77jgZfjgabjg5XjgqPjg6vjgr/jg6rjg7PjgrAsIOOCveODvOODiOOCkuWun+ihjFxuICAgIGNvbnN0IHRhcmdldHMgPSBub1NlYXJjaCA/IGNhY2hlZC5zbGljZSgpIDogc2VhcmNoSXRlbXMoY2FjaGVkLCBmaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgIGNvbnN0IHJlc3VsdHM6IFRJdGVtW10gPSBbXTtcbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldHMubGVuZ3RoIDw9IGluZGV4IHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7IGxpbWl0IH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gdGFyZ2V0cy5zbGljZShpbmRleCwgKG51bGwgIT0gbGltaXQpID8gaW5kZXggKyBsaW1pdCA6IHVuZGVmaW5lZCk7XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLml0ZW1zKTtcblxuICAgICAgICBjb25zdCByZXR2YWwgPSB7XG4gICAgICAgICAgICB0b3RhbDogdGFyZ2V0cy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgLi4ub3B0cyB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPixcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXRzLmxlbmd0aCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgcmV0dmFsLml0ZW1zID0gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwg44Os44K544Od44Oz44K544Gu44Kt44Oj44OD44K344Ol44KS6Kmm6KGMICovXG5mdW5jdGlvbiB0cnlDYWNoZTxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHJlc3VsdDogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4sXG4gICAgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+XG4pOiB2b2lkIHtcbiAgICBjb25zdCB7IG5vQ2FjaGUsIG5vU2VhcmNoIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IGNhbkNhY2hlID0gIW5vQ2FjaGUgJiYgIW5vU2VhcmNoICYmIHJlc3VsdC50b3RhbCA9PT0gcmVzdWx0Lml0ZW1zLmxlbmd0aDtcbiAgICBpZiAoY2FuQ2FjaGUpIHtcbiAgICAgICAgcXVlcnlJbmZvLmNhY2hlID0geyAuLi5yZXN1bHQgfTtcbiAgICAgICAgZGVsZXRlIHF1ZXJ5SW5mby5jYWNoZS5vcHRpb25zO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBgcHJvdmlkZXJgIOmWouaVsOOCkuS9v+eUqOOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggYHF1ZXJ5YCDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbVByb3ZpZGVyPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuXG4gICAgY29uc3QgcmVjZWl2ZWRBbGwgPSAocmVzcDogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4pOiBib29sZWFuID0+IHtcbiAgICAgICAgY29uc3QgaGFzQ29uZCA9ICEhcmVzcC5vcHRpb25zPy5jb25kaXRpb247XG4gICAgICAgIHJldHVybiBoYXNDb25kIHx8IHJlc3AudG90YWwgPT09IHJlc3AuaXRlbXMubGVuZ3RoO1xuICAgIH07XG5cbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7bGltaXR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBsZXQgcmVzcCA9IGF3YWl0IHByb3ZpZGVyKG9wdHMpO1xuICAgICAgICBjb25zdCBuZXh0T3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdHMsIHJlc3Aub3B0aW9ucyk7XG5cbiAgICAgICAgaWYgKHJlY2VpdmVkQWxsKHJlc3ApKSB7XG4gICAgICAgICAgICB0cnlDYWNoZShxdWVyeUluZm8sIHJlc3AsIG5leHRPcHRzKTtcblxuICAgICAgICAgICAgY29uc3QgeyBub1NlYXJjaCwgY29uZGl0aW9uOiBzZWVkIH0gPSBuZXh0T3B0cztcbiAgICAgICAgICAgIGlmIChzZWVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZGl0aW9uID0gbmV3IER5bmFtaWNDb25kaXRpb24oc2VlZCk7XG4gICAgICAgICAgICAgICAgcmVzcCA9IGNvbmRpdGlvbmFsRml4KHNlYXJjaEl0ZW1zKFxuICAgICAgICAgICAgICAgICAgICByZXNwLml0ZW1zLFxuICAgICAgICAgICAgICAgICAgICBjb25kaXRpb24uZmlsdGVyLFxuICAgICAgICAgICAgICAgICAgICAuLi5jb25kaXRpb24uY29tcGFyYXRvcnNcbiAgICAgICAgICAgICAgICApLCBjb25kaXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mby5jYWNoZSwgcmVzcCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBxdWVyeUZyb21DYWNoZShyZXNwLml0ZW1zLCBPYmplY3QuYXNzaWduKG9wdHMsIHsgbm9TZWFyY2ggfSkpO1xuICAgICAgICB9Ly8gZXNsaW50LWRpc2FibGUtbGluZSBicmFjZS1zdHlsZVxuXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnJlc3AuaXRlbXMpO1xuXG4gICAgICAgICAgICBjb25zdCByZXR2YWwgPSB7XG4gICAgICAgICAgICAgICAgdG90YWw6IHJlc3AudG90YWwsXG4gICAgICAgICAgICAgICAgaXRlbXM6IHJlc3AuaXRlbXMsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogbmV4dE9wdHMsXG4gICAgICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKHByb2dyZXNzKSkge1xuICAgICAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXV0byAmJiBudWxsICE9IGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3AudG90YWwgPD0gaW5kZXggKyBsaW1pdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICAgICAgcmV0dmFsLml0ZW1zID0gcmVzdWx0cztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSByZXNwLml0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnlDYWNoZShxdWVyeUluZm8sIHJldHZhbCwgbmV4dE9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnMg44Gr5aSJ5o+bICovXG5mdW5jdGlvbiBlbnN1cmVPcHRpb25zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PiB8IHVuZGVmaW5lZFxuKTogU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IHNvcnRLZXlzOiBbXSB9LCBvcHRpb25zKTtcbiAgICBjb25zdCB7IG5vU2VhcmNoLCBzb3J0S2V5cyB9ID0gb3B0cztcblxuICAgIGlmICghbm9TZWFyY2ggJiYgKCFvcHRzLmNvbXBhcmF0b3JzIHx8IG9wdHMuY29tcGFyYXRvcnMubGVuZ3RoIDw9IDApKSB7XG4gICAgICAgIG9wdHMuY29tcGFyYXRvcnMgPSBjb252ZXJ0U29ydEtleXMoc29ydEtleXMpO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRzIGFzIFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5Pjtcbn1cblxuLyoqXG4gKiBAZW4gTG93IGxldmVsIGZ1bmN0aW9uIGZvciBbW0NvbGxlY3Rpb25dXSBxdWVyeSBpdGVtcy5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSBJdGVtIOOCkuOCr+OCqOODquOBmeOCi+S9juODrOODmeODq+mWouaVsFxuICpcbiAqIEBwYXJhbSBxdWVyeUluZm9cbiAqICAtIGBlbmAgcXVlcnkgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg44Kv44Ko44Oq5oOF5aCxXG4gKiBAcGFyYW0gcHJvdmlkZXJcbiAqICAtIGBlbmAgcHJvdmlkZXIgZnVuY3Rpb25cbiAqICAtIGBqYWAg44OX44Ot44OQ44Kk44OA6Zai5pWwXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcXVlcnlJdGVtczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PihcbiAgICBxdWVyeUluZm86IENvbGxlY3Rpb25RdWVyeUluZm88VEl0ZW0sIFRLZXk+LFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zPzogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+XG4pOiBQcm9taXNlPFRJdGVtW10+IHtcbiAgICBjb25zdCBvcHRzID0gZW5zdXJlT3B0aW9ucyhvcHRpb25zKTtcbiAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSBvcHRzO1xuXG4gICAgLy8gcXVlcnkg44Gr5L2/55So44GX44GfIHNvcnQsIGZpbHRlciDmg4XloLHjgpLjgq3jg6Pjg4Pjgrfjg6VcbiAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mbywgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9KTtcblxuICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgcmV0dXJuIChhd2FpdCBxdWVyeUZyb21DYWNoZShxdWVyeUluZm8uY2FjaGUuaXRlbXMsIG9wdHMpKS5pdGVtcztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbVByb3ZpZGVyKHF1ZXJ5SW5mbywgcHJvdmlkZXIsIG9wdHMpKS5pdGVtcztcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIENvbnN0cnVjdG9yLFxuICAgIENsYXNzLFxuICAgIFVua25vd25PYmplY3QsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgS2V5cyxcbiAgICBpc05pbCxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgbm9vcCxcbiAgICBsdWlkLFxuICAgIGF0LFxuICAgIHNldE1peENsYXNzQXR0cmlidXRlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBTaWxlbmNlYWJsZSxcbiAgICBTdWJzY3JpYmFibGUsXG4gICAgRXZlbnRCcm9rZXIsXG4gICAgRXZlbnRTb3VyY2UsXG4gICAgRXZlbnRQdWJsaXNoZXIsXG59IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgUmVzdWx0LFxuICAgIFJFU1VMVF9DT0RFLFxuICAgIEZBSUxFRCxcbiAgICBtYWtlUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBTeW5jQ29udGV4dCwgZGVmYXVsdFN5bmMgfSBmcm9tICdAY2RwL2RhdGEtc3luYyc7XG5pbXBvcnQge1xuICAgIE1vZGVsLFxuICAgIE1vZGVsQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBNb2RlbFNhdmVPcHRpb25zLFxuICAgIGlzTW9kZWwsXG59IGZyb20gJ0BjZHAvbW9kZWwnO1xuaW1wb3J0IHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvblNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25FdmVudCxcbiAgICBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWRkT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uU2V0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUmVTb3J0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uVXBkYXRlT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBzZWFyY2hJdGVtcywgcXVlcnlJdGVtcyB9IGZyb20gJy4vcXVlcnknO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfcHJvcGVydGllcyAgICAgICAgICAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZS1pdGVyYWJsZS1pdGVyYXRvcicpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3ByZXBhcmVNb2RlbCAgICAgICAgICAgPSBTeW1ib2woJ3ByZXBhcmUtbW9kZWwnKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9yZW1vdmVNb2RlbHMgICAgICAgICAgID0gU3ltYm9sKCdyZW1vdmUtbW9kZWxzJyk7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfYWRkUmVmZXJlbmNlICAgICAgICAgICA9IFN5bWJvbCgnYWRkLXJlZmVyZW5jZScpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3JlbW92ZVJlZmVyZW5jZSAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1yZWZlcmVuY2UnKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9vbk1vZGVsRXZlbnQgICAgICAgICAgID0gU3ltYm9sKCdtb2RlbC1ldmVudC1oYW5kbGVyJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ge1xuICAgIHJlYWRvbmx5IGNvbnN0cnVjdE9wdGlvbnM6IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFQsIEs+O1xuICAgIHJlYWRvbmx5IHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFQsIEs+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IHF1ZXJ5T3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VCwgSz47XG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFQsIEs+O1xuICAgIHJlYWRvbmx5IG1vZGVsT3B0aW9uczogTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zO1xuICAgIHJlYWRvbmx5IGJ5SWQ6IE1hcDxzdHJpbmcsIFQ+O1xuICAgIHN0b3JlOiBUW107XG4gICAgYWZ0ZXJGaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCByZXNldCBtb2RlbCBjb250ZXh0ICovXG5jb25zdCByZXNldE1vZGVsU3RvcmUgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KGNvbnRleHQ6IFByb3BlcnR5PFQsIEs+KTogdm9pZCA9PiB7XG4gICAgY29udGV4dC5ieUlkLmNsZWFyKCk7XG4gICAgY29udGV4dC5zdG9yZS5sZW5ndGggPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW5zdXJlU29ydE9wdGlvbnMgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KG9wdGlvbnM6IENvbGxlY3Rpb25Tb3J0T3B0aW9uczxULCBLPik6IFJlcXVpcmVkPENvbGxlY3Rpb25Tb3J0T3B0aW9uczxULCBLPj4gPT4ge1xuICAgIGNvbnN0IHsgc29ydEtleXM6IGtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gb3B0aW9ucztcbiAgICByZXR1cm4ge1xuICAgICAgICBzb3J0S2V5czoga2V5cyB8fCBbXSxcbiAgICAgICAgY29tcGFyYXRvcnM6IGNvbXBzIHx8IGNvbnZlcnRTb3J0S2V5cyhrZXlzIHx8IFtdKSxcbiAgICB9O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbW9kZWxJZEF0dHJpYnV0ZSA9IDxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGN0b3I/LlsnaWRBdHRyaWJ1dGUnXSB8fCAnaWQnO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0TW9kZWxJZCA9IDxUIGV4dGVuZHMgb2JqZWN0PihhdHRyczogVCwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBhdHRyc1ttb2RlbElkQXR0cmlidXRlKGN0b3IpXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldENoYW5nZWRJZHMgPSA8VCBleHRlbmRzIG9iamVjdD4ob2JqOiBvYmplY3QsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogeyBpZDogc3RyaW5nOyBwcmV2SWQ/OiBzdHJpbmc7IH0gfCB1bmRlZmluZWQgPT4ge1xuICAgIHR5cGUgTW9kZWxMaWtlID0geyBwcmV2aW91czogKGtleTogc3RyaW5nKSA9PiBzdHJpbmc7IH07XG4gICAgY29uc3QgbW9kZWwgPSBvYmogYXMgTW9kZWxMaWtlO1xuXG4gICAgY29uc3QgaWRBdHRyaWJ1dGUgPSBtb2RlbElkQXR0cmlidXRlKGN0b3IpO1xuICAgIGNvbnN0IGlkID0gbW9kZWxbaWRBdHRyaWJ1dGVdO1xuICAgIGlmICghaXNTdHJpbmcoaWQpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaWQ6IG1vZGVsW2lkQXR0cmlidXRlXSwgcHJldklkOiBpc0Z1bmN0aW9uKG1vZGVsLnByZXZpb3VzKSA/IG1vZGVsLnByZXZpb3VzKGlkQXR0cmlidXRlKSA6IHVuZGVmaW5lZCB9O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbW9kZWxDb25zdHJ1Y3RvciA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IENsYXNzIHwgdW5kZWZpbmVkID0+IHtcbiAgICByZXR1cm4gc2VsZi5jb25zdHJ1Y3RvclsnbW9kZWwnXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGlzQ29sbGVjdGlvbk1vZGVsID0gPFQgZXh0ZW5kcyBvYmplY3QsIEUgZXh0ZW5kcyBDb2xsZWN0aW9uRXZlbnQ8VD4sIEsgZXh0ZW5kcyBLZXlzPFQ+Pih4OiB1bmtub3duLCBzZWxmOiBDb2xsZWN0aW9uPFQsIEUsIEs+KTogeCBpcyBUID0+IHtcbiAgICBjb25zdCBjdG9yID0gbW9kZWxDb25zdHJ1Y3RvcihzZWxmKTtcbiAgICByZXR1cm4gaXNGdW5jdGlvbihjdG9yKSA/IHggaW5zdGFuY2VvZiBjdG9yIDogZmFsc2U7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzcGxpY2VBcnJheSA9IDxUPih0YXJnZXQ6IFRbXSwgaW5zZXJ0OiBUW10sIGF0OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICBhdCA9IE1hdGgubWluKE1hdGgubWF4KGF0LCAwKSwgdGFyZ2V0Lmxlbmd0aCk7XG4gICAgdGFyZ2V0LnNwbGljZShhdCwgMCwgLi4uaW5zZXJ0KTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHBhcnNlRmlsdGVyQXJnczxUIGV4dGVuZHMgb2JqZWN0PiguLi5hcmdzOiB1bmtub3duW10pOiBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+IHtcbiAgICBjb25zdCBbZmlsdGVyLCBvcHRpb25zXSA9IGFyZ3M7XG4gICAgaWYgKG51bGwgPT0gZmlsdGVyKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9IGVsc2UgaWYgKCFpc0Z1bmN0aW9uKGZpbHRlcikpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlciBhcyBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7IGZpbHRlciB9KSBhcyBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFQ+O1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3NldE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiB0cnVlLCBtZXJnZTogdHJ1ZSB9O1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FkZE9wdGlvbnMgPSB7IGFkZDogdHJ1ZSwgcmVtb3ZlOiBmYWxzZSB9O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQmFzZSBjbGFzcyBkZWZpbml0aW9uIGZvciBjb2xsZWN0aW9uIHRoYXQgaXMgb3JkZXJlZCBzZXRzIG9mIG1vZGVscy5cbiAqIEBqYSDjg6Ljg4fjg6vjga7pm4blkIjjgpLmibHjgYbjgrPjg6zjgq/jgrfjg6fjg7Pjga7ln7rlupXjgq/jg6njgrnlrprnvqkuXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4gKiBpbXBvcnQgeyBNb2RlbCwgTW9kZWxDb25zdHJ1Y3RvciB9IGZyb20gJ0BjZHAvbW9kZWwnO1xuICogaW1wb3J0IHtcbiAqICAgICBDb2xsZWN0aW9uLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zLFxuICogICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gKiB9IGZyb20gJ0BjZHAvY29sbGVjdGlvbic7XG4gKlxuICogLy8gTW9kZWwgc2NoZW1hXG4gKiBpbnRlcmZhY2UgVHJhY2tBdHRyaWJ1dGUge1xuICogICB1cmk6IHN0cmluZztcbiAqICAgdGl0bGU6IHN0cmluZztcbiAqICAgYXJ0aXN0OiBzdHJpbmc7XG4gKiAgIGFsYnVtOiAgc3RyaW5nO1xuICogICByZWxlYXNlRGF0ZTogRGF0ZTtcbiAqICAgOlxuICogfVxuICpcbiAqIC8vIE1vZGVsIGRlZmluaXRpb25cbiAqIGNvbnN0IFRyYWNrQmFzZSA9IE1vZGVsIGFzIE1vZGVsQ29uc3RydWN0b3I8TW9kZWw8VHJhY2tBdHRyaWJ1dGU+LCBUcmFja0F0dHJpYnV0ZT47XG4gKiBjbGFzcyBUcmFjayBleHRlbmRzIFRyYWNrQmFzZSB7XG4gKiAgICAgc3RhdGljIGlkQXR0cmlidXRlID0gJ3VyaSc7XG4gKiB9XG4gKlxuICogLy8gQ29sbGVjdGlvbiBkZWZpbml0aW9uXG4gKiBjbGFzcyBQbGF5bGlzdCBleHRlbmRzIENvbGxlY3Rpb248VHJhY2s+IHtcbiAqICAgICAvLyBzZXQgdGFyZ2V0IE1vZGVsIGNvbnN0cnVjdG9yXG4gKiAgICAgc3RhdGljIHJlYWRvbmx5IG1vZGVsID0gVHJhY2s7XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIHVzZSBjdXN0b20gY29udGVudCBwcm92aWRlciBmb3IgZmV0Y2guXG4gKiAgICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMoXG4gKiAgICAgICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUcmFjaz5cbiAqICAgICApOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICogICAgICAgICAvLyBzb21lIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGhlcmUuXG4gKiAgICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgY3VzdG9tUHJvdmlkZXIob3B0aW9ucyk7XG4gKiAgICAgICAgIHJldHVybiB7XG4gKiAgICAgICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICogICAgICAgICAgICAgaXRlbXMsXG4gKiAgICAgICAgICAgICBvcHRpb25zLFxuICogICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0PjtcbiAqICAgICB9XG4gKlxuICogICAgIC8vIEBvdmVycmlkZSBpZiBuZWVkIHRvIGNvbnZlcnQgYSByZXNwb25zZSBpbnRvIGEgbGlzdCBvZiBtb2RlbHMuXG4gKiAgICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBQbGFpbk9iamVjdFtdKTogVHJhY2tBdHRyaWJ1dGVbXSB7XG4gKiAgICAgICAgIHJldHVybiByZXNwb25zZS5tYXAoc2VlZCA9PiB7XG4gKiAgICAgICAgICAgICBjb25zdCBkYXRlID0gc2VlZC5yZWxlYXNlRGF0ZTtcbiAqICAgICAgICAgICAgIHNlZWQucmVsZWFzZURhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAqICAgICAgICAgICAgIHJldHVybiBzZWVkO1xuICogICAgICAgICB9KSBhcyBUcmFja0F0dHJpYnV0ZVtdO1xuICogICAgICB9XG4gKiB9XG4gKlxuICogbGV0IHNlZWRzOiBUcmFja0F0dHJpYnV0ZVtdO1xuICpcbiAqIGNvbnN0IHBsYXlsaXN0ID0gbmV3IFBsYXlsaXN0KHNlZWRzLCB7XG4gKiAgICAgLy8gZGVmYXVsdCBxdWVyeSBvcHRpb25zXG4gKiAgICAgcXVlcnlPcHRpb25zOiB7XG4gKiAgICAgICAgIHNvcnRLZXlzOiBbXG4gKiAgICAgICAgICAgICB7IG5hbWU6ICd0aXRsZScsIG9yZGVyOiBTb3J0T3JkZXIuREVTQywgdHlwZTogJ3N0cmluZycgfSxcbiAqICAgICAgICAgXSxcbiAqICAgICB9XG4gKiB9KTtcbiAqXG4gKiBhd2FpdCBwbGF5bGlzdC5yZXF1ZXJ5KCk7XG4gKlxuICogZm9yIChjb25zdCB0cmFjayBvZiBwbGF5bGlzdCkge1xuICogICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRyYWNrLnRvSlNPTigpKSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbGxlY3Rpb248XG4gICAgVE1vZGVsIGV4dGVuZHMgb2JqZWN0ID0gYW55LCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBFdmVudCBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUTW9kZWw+ID0gQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4sXG4gICAgVEtleSBleHRlbmRzIEtleXM8VE1vZGVsPiA9IEtleXM8VE1vZGVsPlxuPiBleHRlbmRzIEV2ZW50U291cmNlPEV2ZW50PiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFRNb2RlbD4ge1xuXG4gICAgLyoqXG4gICAgICogQGVuIE1vZGVsIGNvbnN0cnVjdG9yLiA8YnI+XG4gICAgICogICAgIFRoZSBjb25zdHJ1Y3RvciBpcyB1c2VkIGludGVybmFsbHkgYnkgdGhpcyBbW0NvbGxlY3Rpb25dXSBjbGFzcyBmb3IgW1tUTW9kZWxdXSBjb25zdHJ1Y3Rpb24uXG4gICAgICogQGphIOODouODh+ODq+OCs+ODs+OCueODiOODqeOCr+OCvyA8YnI+XG4gICAgICogICAgIFtbQ29sbGVjdGlvbl1dIOOCr+ODqeOCueOBjCBbW1RNb2RlbF1dIOOCkuani+evieOBmeOCi+OBn+OCgeOBq+S9v+eUqOOBmeOCi1xuICAgICAqL1xuICAgIHN0YXRpYyByZWFkb25seSBtb2RlbD86IENsYXNzO1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgW19wcm9wZXJ0aWVzXTogUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGNvbnN0cnVjdGlvbi9kZXN0cnVjdGlvbjpcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbnN0cnVjdGlvbiBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5qeL56+J44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM/OiBUTW9kZWxbXSB8IFBsYWluT2JqZWN0W10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgbW9kZWxPcHRpb25zOiB7fSwgcXVlcnlPcHRpb25zOiB7fSB9LCBvcHRpb25zKTtcblxuICAgICAgICBjb25zdCB7IG1vZGVsT3B0aW9ucywgcXVlcnlPcHRpb25zIH0gPSBvcHRzO1xuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdID0ge1xuICAgICAgICAgICAgY29uc3RydWN0T3B0aW9uczogb3B0cyxcbiAgICAgICAgICAgIHByb3ZpZGVyOiBvcHRzLnByb3ZpZGVyIHx8IHRoaXMuc3luYy5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgY2lkOiBsdWlkKCdjb2xsZWN0aW9uOicsIDgpLFxuICAgICAgICAgICAgcXVlcnlPcHRpb25zLFxuICAgICAgICAgICAgcXVlcnlJbmZvOiB7fSxcbiAgICAgICAgICAgIG1vZGVsT3B0aW9ucyxcbiAgICAgICAgICAgIGJ5SWQ6IG5ldyBNYXA8c3RyaW5nLCBUTW9kZWw+KCksXG4gICAgICAgICAgICBzdG9yZTogW10sXG4gICAgICAgIH0gYXMgdW5rbm93biBhcyBQcm9wZXJ0eTxUTW9kZWwsIFRLZXk+O1xuXG4gICAgICAgIHRoaXMuaW5pdFF1ZXJ5SW5mbygpO1xuXG4gICAgICAgIC8qIG1vZGVsIGV2ZW50IGhhbmRsZXIgKi9cbiAgICAgICAgdGhpc1tfb25Nb2RlbEV2ZW50XSA9IChldmVudDogc3RyaW5nLCBtb2RlbDogVE1vZGVsIHwgdW5kZWZpbmVkLCBjb2xsZWN0aW9uOiB0aGlzLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnN0YXJ0c1dpdGgoJ0AnKSAmJiBtb2RlbCkge1xuICAgICAgICAgICAgICAgIGlmICgoJ0BhZGQnID09PSBldmVudCB8fCAnQHJlbW92ZScgPT09IGV2ZW50KSAmJiBjb2xsZWN0aW9uICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCdAZGVzdHJveScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vZGVsIGV2ZW50IGFyZ3VtZW50cyBhZGp1c3RtZW50LlxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zID0gKGNvbGxlY3Rpb24gYXMgYW55KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZShtb2RlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgnQGNoYW5nZScgPT09IGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkcyA9IGdldENoYW5nZWRJZHMobW9kZWwsIG1vZGVsQ29uc3RydWN0b3IodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCBwcmV2SWQgfSA9IGlkcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2SWQgIT09IGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChudWxsICE9IHByZXZJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieUlkLmRlbGV0ZShwcmV2SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBkZWxlZ2F0ZSBldmVudFxuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlci5jYWxsKHRoaXMsIGV2ZW50LCBtb2RlbCwgY29sbGVjdGlvbiwgb3B0aW9ucyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdXNlbGVzcy1jYWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHNlZWRzKSB7XG4gICAgICAgICAgICB0aGlzLnJlc2V0KHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBqYSBJbml0aWFsaXplIHF1ZXJ5IGluZm9cbiAgICAgKiBAamEg44Kv44Ko44Oq5oOF5aCx44Gu5Yid5pyf5YyWXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGluaXRRdWVyeUluZm8oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzIH0gPSBlbnN1cmVTb3J0T3B0aW9ucyh0aGlzLl9kZWZhdWx0UXVlcnlPcHRpb25zKTtcbiAgICAgICAgdGhpcy5fcXVlcnlJbmZvID0geyBzb3J0S2V5cywgY29tcGFyYXRvcnMgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVsZWFzZWQgYWxsIGluc3RhbmNlcyBhbmQgZXZlbnQgbGlzdGVuZXIgdW5kZXIgdGhlIG1hbmFnZW1lbnQuXG4gICAgICogQGphIOeuoeeQhuWvvuixoeOCkuegtOajhFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbnMgKHJlc2VydmVkKS5cbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODsyAo5LqI57SEKVxuICAgICAqL1xuICAgIHB1YmxpYyByZWxlYXNlKG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IHRoaXMgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uc3RvcmUgPSBbXTtcbiAgICAgICAgdGhpcy5pbml0UXVlcnlJbmZvKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnN0b3BMaXN0ZW5pbmcoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAamEgQ2xlYXIgY2FjaGUgaW5zdGFuY2UgbWV0aG9kXG4gICAgICogQGphIOOCreODo+ODg+OCt+ODpeOBruegtOajhFxuICAgICAqL1xuICAgIHByb3RlY3RlZCBjbGVhckNhY2hlKCk6IHZvaWQge1xuICAgICAgICBkZWxldGUgdGhpcy5fcXVlcnlJbmZvLmNhY2hlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBhdHRyaWJ1dGVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODiCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG1vZGVscy5cbiAgICAgKiBAamEg44Oi44OH44Or44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IG1vZGVscygpOiByZWFkb25seSBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IHsgX3F1ZXJ5RmlsdGVyLCBfYWZ0ZXJGaWx0ZXIgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICByZXR1cm4gKF9hZnRlckZpbHRlciAmJiBfYWZ0ZXJGaWx0ZXIgIT09IF9xdWVyeUZpbHRlcikgPyBzdG9yZS5maWx0ZXIoX2FmdGVyRmlsdGVyKSA6IHN0b3JlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBudW1iZXIgb2YgbW9kZWxzLlxuICAgICAqIEBqYSDlhoXljIXjgZnjgovjg6Ljg4fjg6vmlbBcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVscy5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGFwcGxpZWQgYWZ0ZXItZmlsdGVyLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/jgYzpgannlKjjgZXjgozjgabjgYTjgovjgYvjgpLliKTlrppcbiAgICAgKi9cbiAgICBnZXQgZmlsdGVyZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9xdWVyeUluZm8oKTogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0gaW5zdGFuY2VcbiAgICAgKiBAamEgW1tDb2xsZWN0aW9uUXVlcnlJbmZvXV0g44KS5qC857SN44GZ44KL44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIHNldCBfcXVlcnlJbmZvKHZhbDogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUTW9kZWwsIFRLZXk+KSB7XG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbyA9IHZhbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNyZWF0aW5nIG9wdGlvbnMuXG4gICAgICogQGphIOani+evieaZguOBruOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX29wdGlvbnMoKTogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5jb25zdHJ1Y3RPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwcm92aWRlci5cbiAgICAgKiBAamEg5pei5a6a44Gu44OX44Ot44OQ44Kk44OA44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcHJvdmlkZXIoKTogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnByb3ZpZGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBwYXJzZSBiZWhhdmlvdXIuXG4gICAgICogQGphIOaXouWumuOBriBwYXJzZSDli5XkvZzjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UGFyc2UoKTogYm9vbGVhbiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zLnBhcnNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgZGVmYXVsdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDml6Llrprjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9kZWZhdWx0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlPcHRpb25zO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbGFzdCBxdWVyeSBvcHRpb25zLlxuICAgICAqIEBqYSDmnIDlvozjga7jgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7PjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9sYXN0UXVlcnlPcHRpb25zKCk6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycywgZmlsdGVyIH0gPSB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm87XG4gICAgICAgIGNvbnN0IG9wdHM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4gPSB7fTtcblxuICAgICAgICBzb3J0S2V5cy5sZW5ndGggJiYgKG9wdHMuc29ydEtleXMgPSBzb3J0S2V5cyk7XG4gICAgICAgIGNvbXBhcmF0b3JzLmxlbmd0aCAmJiAob3B0cy5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzKTtcbiAgICAgICAgZmlsdGVyICYmIChvcHRzLmZpbHRlciA9IGZpbHRlcik7XG5cbiAgICAgICAgcmV0dXJuIG9wdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBzb3J0IGNvbXBhcmF0b3JzLlxuICAgICAqIEBqYSDjgr3jg7zjg4jnlKjmr5TovIPplqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9jb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VE1vZGVsPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHF1ZXJ5LWZpbHRlci5cbiAgICAgKiBAamEg44Kv44Ko44Oq55So44OV44Kj44Or44K/6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfcXVlcnlGaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uZmlsdGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gYWZ0ZXItZmlsdGVyLlxuICAgICAqIEBqYSDntZ7jgorovrzjgb/nlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9hZnRlckZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IHV0aWxzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGEgbW9kZWwgZnJvbSBhIGNvbGxlY3Rpb24sIHNwZWNpZmllZCBieSBhbiBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2UuXG4gICAgICogQGphIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCueOBi+OCieODouODh+ODq+OCkueJueWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBnZXQoc2VlZDogc3RyaW5nIHwgb2JqZWN0IHwgdW5kZWZpbmVkKTogVE1vZGVsIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWYgKG51bGwgPT0gc2VlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGlmIChpc1N0cmluZyhzZWVkKSAmJiBieUlkLmhhcyhzZWVkKSkge1xuICAgICAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KHNlZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaWQgPSBnZXRNb2RlbElkKGlzTW9kZWwoc2VlZCkgPyBzZWVkLnRvSlNPTigpIDogc2VlZCBhcyBvYmplY3QsIG1vZGVsQ29uc3RydWN0b3IodGhpcykpO1xuICAgICAgICBjb25zdCBjaWQgPSAoc2VlZCBhcyBvYmplY3QgYXMgeyBfY2lkPzogc3RyaW5nOyB9KS5fY2lkO1xuXG4gICAgICAgIHJldHVybiBieUlkLmdldChpZCkgfHwgKGNpZCAmJiBieUlkLmdldChjaWQpKSBhcyBUTW9kZWwgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYHRydWVgIGlmIHRoZSBtb2RlbCBpcyBpbiB0aGUgY29sbGVjdGlvbiBieSBhbiBgaWRgLCBhIGBjaWRgLCBvciBieSBwYXNzaW5nIGluIGEgbW9kZWwgaW5zdGFuY2UuXG4gICAgICogQGphIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCueOBi+OCieODouODh+ODq+OCkuaJgOacieOBl+OBpuOBhOOCi+OBi+WIpOWumlxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgIGBpZGAsIGBjaWRgIOOBiuOCiOOBs+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHB1YmxpYyBoYXMoc2VlZDogc3RyaW5nIHwgb2JqZWN0IHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBudWxsICE9IHRoaXMuZ2V0KHNlZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBjb3B5IG9mIHRoZSBtb2RlbCdzIGBhdHRyaWJ1dGVzYCBvYmplY3QuXG4gICAgICogQGphIOODouODh+ODq+WxnuaAp+WApOOBruOCs+ODlOODvOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0pTT04oKTogb2JqZWN0W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5tb2RlbHMubWFwKG0gPT4gaXNNb2RlbChtKSA/IG0udG9KU09OKCkgOiBtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZXMgQ2xvbmUgdGhpcyBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544Gu6KSH6KO944KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xvbmUoKTogdGhpcyB7XG4gICAgICAgIGNvbnN0IHsgY29uc3RydWN0b3IsIF9vcHRpb25zIH0gPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IChjb25zdHJ1Y3RvciBhcyBDb25zdHJ1Y3Rvcjx0aGlzPikodGhpc1tfcHJvcGVydGllc10uc3RvcmUsIF9vcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yY2UgYSBjb2xsZWN0aW9uIHRvIHJlLXNvcnQgaXRzZWxmLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PopoHntKDjga7lho3jgr3jg7zjg4hcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzb3J0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjgr3jg7zjg4jjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc29ydChvcHRpb25zPzogQ29sbGVjdGlvblJlU29ydE9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IHRoaXMge1xuICAgICAgICBjb25zdCBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgeyBub1Rocm93LCBzaWxlbnQgfSA9IG9wdHM7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gZW5zdXJlU29ydE9wdGlvbnMob3B0cyk7XG4gICAgICAgIGNvbnN0IGNvbXBhcmF0b3JzID0gMCA8IGNvbXBzLmxlbmd0aCA/IGNvbXBzIDogdGhpcy5fY29tcGFyYXRvcnM7XG5cbiAgICAgICAgaWYgKGNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICBpZiAobm9UaHJvdykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9DT01QQVJBVE9SUywgJ0Nhbm5vdCBzb3J0IGEgc2V0IHdpdGhvdXQgYSBjb21wYXJhdG9yLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10uc3RvcmUgPSBzZWFyY2hJdGVtcyh0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSwgdGhpcy5fYWZ0ZXJGaWx0ZXIsIC4uLmNvbXBhcmF0b3JzKTtcblxuICAgICAgICAvLyB1cGRhdGUgcXVlcnlJbmZvXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5jb21wYXJhdG9ycyA9IGNvbXBhcmF0b3JzO1xuICAgICAgICBpZiAoMCA8IHNvcnRLZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLnNvcnRLZXlzID0gc29ydEtleXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFwcGx5IGFmdGVyLWZpbHRlciB0byBjb2xsZWN0aW9uIGl0c2VsZi5cbiAgICAgKiBAamEg57We44KK6L6844G/55So44OV44Kj44Or44K/44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiAgLSBgZW5gIGZpbHRlciBjYWxsYmFjay5cbiAgICAgKiAgLSBgamFgIOODleOCo+ODq+OCv+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcihjYWxsYmFjazogRmlsdGVyQ2FsbGJhY2s8VE1vZGVsPiB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IFNpbGVuY2VhYmxlKTogdGhpcztcblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBseSBhZnRlci1maWx0ZXIgdG8gY29sbGVjdGlvbiBpdHNlbGYuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFmdGVyLWZpbHRlciBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg57We44KK6L6844G/44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcihvcHRpb25zOiBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zPFRNb2RlbD4pOiB0aGlzO1xuXG4gICAgcHVibGljIGZpbHRlciguLi5hcmdzOiB1bmtub3duW10pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IHBhcnNlRmlsdGVyQXJncyguLi5hcmdzKTtcbiAgICAgICAgY29uc3QgeyBmaWx0ZXIsIHNpbGVudCB9ID0gb3B0cztcbiAgICAgICAgaWYgKGZpbHRlciAhPT0gdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyID0gZmlsdGVyO1xuICAgICAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAZmlsdGVyJywgdGhpcyBhcyBDb2xsZWN0aW9uLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBtb2RlbCBhdCB0aGUgZ2l2ZW4gaW5kZXguIElmIG5lZ2F0aXZlIHZhbHVlIGlzIGdpdmVuLCB0aGUgdGFyZ2V0IHdpbGwgYmUgZm91bmQgZnJvbSB0aGUgbGFzdCBpbmRleC5cbiAgICAgKiBAamEg44Kk44Oz44OH44OD44Kv44K55oyH5a6a44Gr44KI44KL44Oi44OH44Or44G444Gu44Ki44Kv44K744K5LiDosqDlgKTjga7loLTlkIjjga/mnKvlsL7mpJzntKLjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbmRleFxuICAgICAqICAtIGBlbmAgQSB6ZXJvLWJhc2VkIGludGVnZXIgaW5kaWNhdGluZyB3aGljaCBlbGVtZW50IHRvIHJldHJpZXZlLiA8YnI+XG4gICAgICogICAgICAgICBJZiBuZWdhdGl2ZSBpbmRleCBpcyBjb3VudGVkIGZyb20gdGhlIGVuZCBvZiB0aGUgbWF0Y2hlZCBzZXQuXG4gICAgICogIC0gYGphYCAwIGJhc2Ug44Gu44Kk44Oz44OH44OD44Kv44K544KS5oyH5a6aIDxicj5cbiAgICAgKiAgICAgICAgIOiyoOWApOOBjOaMh+WumuOBleOCjOOBn+WgtOWQiCwg5pyr5bC+44GL44KJ44Gu44Kk44Oz44OH44OD44Kv44K544Go44GX44Gm6Kej6YeI44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBUTW9kZWwge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5tb2RlbHMgYXMgVE1vZGVsW10sIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBtb2RlbC5cbiAgICAgKiBAamEg44Oi44OH44Or44Gu5pyA5Yid44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGZpcnN0KCk6IFRNb2RlbCB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIGBjb3VudGAgZWxlbWVudHMgb2YgdGhlIG1vZGVsIGZyb20gdGhlIGZpcnN0LlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjga7lhYjpoK3jgYvjgolgY291bnRgIOWIhuOBruimgee0oOOCkuWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBmaXJzdChjb3VudDogbnVtYmVyKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgZmlyc3QoY291bnQ/OiBudW1iZXIpOiBUTW9kZWwgfCBUTW9kZWxbXSB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLm1vZGVscztcbiAgICAgICAgaWYgKG51bGwgPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHMuc2xpY2UoMCwgY291bnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBtb2RlbC5cbiAgICAgKiBAamEg44Oi44OH44Or44Gu5pyA5Yid44Gu6KaB57Sg44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIGxhc3QoKTogVE1vZGVsIHwgdW5kZWZpbmVkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0aGUgdmFsdWUgb2YgYGNvdW50YCBlbGVtZW50cyBvZiB0aGUgbW9kZWwgZnJvbSB0aGUgbGFzdC5cbiAgICAgKiBAamEg44Oi44OH44Or44Gu5YWI6aCt44GL44KJYGNvdW50YCDliIbjga7opoHntKDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgbGFzdChjb3VudDogbnVtYmVyKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgbGFzdChjb3VudD86IG51bWJlcik6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMubW9kZWxzO1xuICAgICAgICBpZiAobnVsbCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldHNbdGFyZ2V0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRzLnNsaWNlKC0xICogY291bnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogc3luY1xuXG4gICAgLyoqXG4gICAgICogQGVuIENvbnZlcnRzIGEgcmVzcG9uc2UgaW50byB0aGUgaGFzaCBvZiBhdHRyaWJ1dGVzIHRvIGJlIGBzZXRgIG9uIHRoZSBjb2xsZWN0aW9uLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyBqdXN0IHRvIHBhc3MgdGhlIHJlc3BvbnNlIGFsb25nLlxuICAgICAqIEBqYSDjg6zjgrnjg53jg7Pjgrnjga7lpInmj5vjg6Hjgr3jg4Pjg4kuIOaXouWumuOBp+OBr+S9leOCguOBl+OBquOBhFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHBhcnNlKHJlc3BvbnNlOiBQbGFpbk9iamVjdCB8IHZvaWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHwgUGxhaW5PYmplY3RbXSB8IHVuZGVmaW5lZCB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHJldHVybiByZXNwb25zZSBhcyBUTW9kZWxbXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIFtbZmV0Y2hdXSBtZXRob2QgcHJveHkgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggW1tDb2xsZWN0aW9uSXRlbVByb3ZpZGVyXV0gcmV0dXJucyBvbmUtc2hvdCByZXN1bHQuXG4gICAgICogQGphIFtbQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcl1dIOS6kuaPm+OBruWNmOeZuuOBriBmZXRjaCDntZDmnpzjgpLov5TljbQuIOW/heimgeOBq+W/nOOBmOOBpuOCquODvOODkOODvOODqeOCpOODieWPr+iDvS5cbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIG9wdGlvbiBvYmplY3RcbiAgICAgKiAgLSBgamFgIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBhc3luYyBzeW5jKG9wdGlvbnM/OiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUTW9kZWwsIFRLZXk+KTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD4+IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBkZWZhdWx0U3luYygpLnN5bmMoJ3JlYWQnLCB0aGlzIGFzIFN5bmNDb250ZXh0LCBvcHRpb25zKSBhcyBUTW9kZWxbXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgICAgICBpdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxvYmplY3Q+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBGZXRjaCB0aGUgW1tNb2RlbF1dIGZyb20gdGhlIHNlcnZlciwgbWVyZ2luZyB0aGUgcmVzcG9uc2Ugd2l0aCB0aGUgbW9kZWwncyBsb2NhbCBhdHRyaWJ1dGVzLlxuICAgICAqIEBqYSBbW01vZGVsXV0g5bGe5oCn44Gu44K144O844OQ44O85ZCM5pyfLiDjg6zjgrnjg53jg7Pjgrnjga7jg57jg7zjgrjjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBmZXRjaCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44OV44Kn44OD44OB44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGZldGNoKG9wdGlvbnM/OiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4pOiBQcm9taXNlPG9iamVjdFtdPiB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcHJvZ3Jlc3M6IG5vb3AgfSwgdGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcHJvZ3Jlc3M6IG9yaWdpbmFsLCBsaW1pdCwgcmVzZXQsIG5vQ2FjaGUgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCB7IF9xdWVyeUluZm8sIF9wcm92aWRlciB9ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsaXplID0gKG51bGwgPT0gbGltaXQpO1xuXG4gICAgICAgICAgICBvcHRzLnByb2dyZXNzID0gKGluZm86IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VE1vZGVsPikgPT4ge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsKGluZm8pO1xuICAgICAgICAgICAgICAgICFmaW5hbGl6ZSAmJiB0aGlzLmFkZChpbmZvLml0ZW1zLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChub0NhY2hlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZmluYWxpemUgJiYgcmVzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KHVuZGVmaW5lZCwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBxdWVyeUl0ZW1zKF9xdWVyeUluZm8sIF9wcm92aWRlciwgb3B0cyk7XG5cbiAgICAgICAgICAgIGlmIChmaW5hbGl6ZSkge1xuICAgICAgICAgICAgICAgIHJlc2V0ID8gdGhpcy5yZXNldChyZXNwLCBvcHRzKSA6IHRoaXMuYWRkKHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgQ29sbGVjdGlvbiwgcmVzcCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGVycm9yJywgdW5kZWZpbmVkLCB0aGlzIGFzIENvbGxlY3Rpb24sIGUsIG9wdHMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeGVjdXRlIGBmZXRjaCgpYCB3aXRoIGxhc3QgcXVlcnkgb3B0aW9ucy5cbiAgICAgKiBAamEg5YmN5Zue44Go5ZCM5p2h5Lu244GnIGBmZXRjaCgpYCDjgpLlrp/ooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXF1ZXJ5IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg6rjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVxdWVyeShvcHRpb25zPzogQ29sbGVjdGlvblJlcXVlcnlPcHRpb25zKTogUHJvbWlzZTxvYmplY3RbXT4ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fbGFzdFF1ZXJ5T3B0aW9ucywgb3B0aW9ucywgeyByZXNldDogdHJ1ZSB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2gob3B0cyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogY29sbGVjdGlvbiBzZXR1cFxuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7Pjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBq+ODouODh+ODq+OBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GE44Oi44OH44Or44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBOaWwgdmFsdWUuXG4gICAgICogIC0gYGphYCBOaWwg6KaB57SgXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiB1bmRlZmluZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44Gr44Oi44OH44Or44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYTjg6Ljg4fjg6vjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44Gr44Oi44OH44Or44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYTjg6Ljg4fjg6vjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZHM6IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgc2V0KHNlZWRzPzogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10gfCB2b2lkIHtcbiAgICAgICAgaWYgKGlzTmlsKHNlZWRzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oeyBwYXJzZTogdGhpcy5fZGVmYXVsdFBhcnNlIH0sIF9zZXRPcHRpb25zLCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBpZiAob3B0cy5wYXJzZSAmJiAhaXNDb2xsZWN0aW9uTW9kZWwoc2VlZHMsIHRoaXMpKSB7XG4gICAgICAgICAgICBzZWVkcyA9IHRoaXMucGFyc2Uoc2VlZHMsIG9wdGlvbnMpIHx8IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2luZ3VsYXIgPSAhaXNBcnJheShzZWVkcyk7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiAoVE1vZGVsIHwgb2JqZWN0IHwgdW5kZWZpbmVkKVtdID0gc2luZ3VsYXIgPyBbc2VlZHNdIDogKHNlZWRzIGFzIG9iamVjdFtdKS5zbGljZSgpO1xuXG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuXG4gICAgICAgIGNvbnN0IGF0ID0gKChjYW5kaWRhdGUpOiBudW1iZXIgfCB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPiBzdG9yZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlICs9IHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChjYW5kaWRhdGUgPCAwKSA/IDAgOiBjYW5kaWRhdGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKG9wdHMuYXQpO1xuXG4gICAgICAgIGNvbnN0IHNldDogb2JqZWN0W10gICAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b0FkZDogVE1vZGVsW10gICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9NZXJnZTogVE1vZGVsW10gID0gW107XG4gICAgICAgIGNvbnN0IHRvUmVtb3ZlOiBUTW9kZWxbXSA9IFtdO1xuICAgICAgICBjb25zdCBtb2RlbFNldCA9IG5ldyBTZXQ8b2JqZWN0PigpO1xuXG4gICAgICAgIGNvbnN0IHsgYWRkLCBtZXJnZSwgcmVtb3ZlLCBwYXJzZSwgc2lsZW50IH0gPSBvcHRzO1xuXG4gICAgICAgIGxldCBzb3J0ID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHNvcnRhYmxlID0gdGhpcy5fY29tcGFyYXRvcnMubGVuZ3RoICYmIG51bGwgPT0gYXQgJiYgZmFsc2UgIT09IG9wdHMuc29ydDtcblxuICAgICAgICB0eXBlIE1vZGVsRmVhdHVyZSA9IHtcbiAgICAgICAgICAgIHBhcnNlOiAoYXRycj86IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gb2JqZWN0O1xuICAgICAgICAgICAgc2V0QXR0cmlidXRlczogKGF0cnI6IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gdm9pZDtcbiAgICAgICAgICAgIGhhc0NoYW5nZWQ6ICgpID0+IGJvb2xlYW47XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVHVybiBiYXJlIG9iamVjdHMgaW50byBtb2RlbCByZWZlcmVuY2VzLCBhbmQgcHJldmVudCBpbnZhbGlkIG1vZGVscyBmcm9tIGJlaW5nIGFkZGVkLlxuICAgICAgICBmb3IgKGNvbnN0IFtpLCBpdGVtXSBvZiBpdGVtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vIElmIGEgZHVwbGljYXRlIGlzIGZvdW5kLCBwcmV2ZW50IGl0IGZyb20gYmVpbmcgYWRkZWQgYW5kIG9wdGlvbmFsbHkgbWVyZ2UgaXQgaW50byB0aGUgZXhpc3RpbmcgbW9kZWwuXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZ2V0KGl0ZW0pIGFzIE1vZGVsRmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIGlmIChtZXJnZSAmJiBpdGVtICE9PSBleGlzdGluZykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cnMgPSBpc01vZGVsKGl0ZW0pID8gaXRlbS50b0pTT04oKSA6IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZSAmJiBpc0Z1bmN0aW9uKGV4aXN0aW5nLnBhcnNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMgPSBleGlzdGluZy5wYXJzZShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihleGlzdGluZy5zZXRBdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmcuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0b01lcmdlLnB1c2goZXhpc3RpbmcgYXMgVE1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRhYmxlICYmICFzb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0ID0gaXNGdW5jdGlvbihleGlzdGluZy5oYXNDaGFuZ2VkKSA/IGV4aXN0aW5nLmhhc0NoYW5nZWQoKSA6IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMoZXhpc3RpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXRlbXNbaV0gPSBleGlzdGluZztcbiAgICAgICAgICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBicmFjZS1zdHlsZVxuXG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmV3LCB2YWxpZCBtb2RlbCwgcHVzaCBpdCB0byB0aGUgYHRvQWRkYCBsaXN0LlxuICAgICAgICAgICAgZWxzZSBpZiAoYWRkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBpdGVtc1tpXSA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oaXRlbSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQWRkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19hZGRSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxTZXQuYWRkKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBzdGFsZSBtb2RlbHMuXG4gICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGVsU2V0Lmhhcyhtb2RlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9SZW1vdmUucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXNbX3JlbW92ZU1vZGVsc10odG9SZW1vdmUsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2VlIGlmIHNvcnRpbmcgaXMgbmVlZGVkLCB1cGRhdGUgYGxlbmd0aGAgYW5kIHNwbGljZSBpbiBuZXcgbW9kZWxzLlxuICAgICAgICBsZXQgb3JkZXJDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHJlcGxhY2UgPSAhc29ydGFibGUgJiYgYWRkICYmIHJlbW92ZTtcbiAgICAgICAgaWYgKHNldC5sZW5ndGggJiYgcmVwbGFjZSkge1xuICAgICAgICAgICAgb3JkZXJDaGFuZ2VkID0gKHN0b3JlLmxlbmd0aCAhPT0gc2V0Lmxlbmd0aCkgfHwgc3RvcmUuc29tZSgobSwgaW5kZXgpID0+IG0gIT09IHNldFtpbmRleF0pO1xuICAgICAgICAgICAgc3RvcmUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCBzZXQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHRvQWRkLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHNvcnRhYmxlKSB7XG4gICAgICAgICAgICAgICAgc29ydCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgdG9BZGQsIG51bGwgPT0gYXQgPyBzdG9yZS5sZW5ndGggOiBhdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaWxlbnRseSBzb3J0IHRoZSBjb2xsZWN0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICBpZiAoc29ydCkge1xuICAgICAgICAgICAgdGhpcy5zb3J0KHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sZXNzIHNpbGVuY2VkLCBpdCdzIHRpbWUgdG8gZmlyZSBhbGwgYXBwcm9wcmlhdGUgYWRkL3NvcnQvdXBkYXRlIGV2ZW50cy5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2ksIG1vZGVsXSBvZiB0b0FkZC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBhdCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gYXQgKyBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQGFkZCcsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAYWRkJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvcnQgfHwgb3JkZXJDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvQWRkLmxlbmd0aCB8fCB0b1JlbW92ZS5sZW5ndGggfHwgdG9NZXJnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZGVkOiB0b0FkZCxcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZDogdG9SZW1vdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lcmdlZDogdG9NZXJnZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkcm9wIHVuZGVmaW5lZFxuICAgICAgICBjb25zdCByZXR2YWwgPSBpdGVtcy5maWx0ZXIoaSA9PiBudWxsICE9IGkpIGFzIFRNb2RlbFtdO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgYWRkZWQgKG9yIG1lcmdlZCkgbW9kZWwgKG9yIG1vZGVscykuXG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJldHZhbFswXSA6IChyZXR2YWwubGVuZ3RoID8gcmV0dmFsIDogdm9pZCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBhIGNvbGxlY3Rpb24gd2l0aCBhIG5ldyBsaXN0IG9mIG1vZGVscyAob3IgYXR0cmlidXRlIGhhc2hlcyksIHRyaWdnZXJpbmcgYSBzaW5nbGUgYHJlc2V0YCBldmVudCBvbiBjb21wbGV0aW9uLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PjgpLmlrDjgZfjgYTjg6Ljg4fjg6vkuIDopqfjgafnva7mj5suIOWujOS6huaZguOBqyBgcmVzZXRgIOOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44K744OD44OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KHNlZWRzPzogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyAmIHsgcHJldmlvdXM6IFRNb2RlbFtdOyB9O1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLnByZXZpb3VzID0gc3RvcmUuc2xpY2UoKTtcbiAgICAgICAgcmVzZXRNb2RlbFN0b3JlKHRoaXNbX3Byb3BlcnRpZXNdKTtcblxuICAgICAgICBjb25zdCBtb2RlbHMgPSBzZWVkcyA/IHRoaXMuYWRkKHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKSA6IFtdO1xuXG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0ByZXNldCcsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9kZWxzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgbW9kZWwgdG8gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBuOOBruODouODh+ODq+OBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHRvIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiBAamEg44Oi44OH44Or44Oq44K544OI5oyH5a6a44Gr44KI44KL44Kz44Os44Kv44K344On44Oz44G444Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkczogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBhZGQoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0KHNlZWRzIGFzIFVua25vd25PYmplY3QsIE9iamVjdC5hc3NpZ24oeyBtZXJnZTogZmFsc2UgfSwgb3B0aW9ucywgX2FkZE9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PjgYvjgonjg6Ljg4fjg6vjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIGxpc3Qgb2YgbW9kZWxzIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEg44Oi44OH44Or44Oq44K544OI5oyH5a6a44Gr44KI44KL44Kz44Os44Kv44K344On44Oz44GL44KJ44Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHNpbmd1bGFyID8gW3NlZWRzIGFzIFRNb2RlbF0gOiAoc2VlZHMgYXMgVE1vZGVsW10pLnNsaWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSB0aGlzW19yZW1vdmVNb2RlbHNdKGl0ZW1zLCBvcHRzKTtcbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCAmJiByZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0geyBhZGRlZDogW10sIG1lcmdlZDogW10sIHJlbW92ZWQgfTtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbGxlY3Rpb24pLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbGxlY3Rpb24sIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJlbW92ZWRbMF0gOiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgYSBtb2RlbCB0byB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7jgavjg6Ljg4fjg6vjgpLov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBwdXNoKHNlZWQ6IFRNb2RlbCB8IFBsYWluT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNlZWQsIE9iamVjdC5hc3NpZ24oeyBhdDogc3RvcmUubGVuZ3RoIH0sIG9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgZW5kIG9mIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7jga7jg6Ljg4fjg6vjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTaWxlbmNlYWJsZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgU2lsZW5jZWFibGUg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHBvcChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHN0b3JlW3N0b3JlLmxlbmd0aCAtIDFdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIGEgbW9kZWwgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt44Gr44Oi44OH44Or44KS6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgYWRkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDov73liqDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgdW5zaGlmdChzZWVkOiBUTW9kZWwgfCBQbGFpbk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNlZWQsIE9iamVjdC5hc3NpZ24oeyBhdDogMCB9LCBvcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgY29sbGVjdGlvbi5cbiAgICAgKiBAamEg5YWI6aCt44Gu44Oi44OH44Or44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU2lsZW5jZWFibGUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFNpbGVuY2VhYmxlIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzaGlmdChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlKHN0b3JlWzBdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIGEgbW9kZWwgaW4gdGhpcyBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDmlrDjgZfjgYTjg6Ljg4fjg6vjgqTjg7Pjgrnjgr/jg7PjgrnjgpLkvZzmiJDjgZcsIOOCs+ODrOOCr+OCt+ODp+ODs+OBq+i/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIGF0dHJzXG4gICAgICogIC0gYGVuYCBhdHRyaWJ1dGVzIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWxnuaAp+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBtb2RlbCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+ani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBjcmVhdGUoYXR0cnM6IG9iamVjdCwgb3B0aW9ucz86IE1vZGVsU2F2ZU9wdGlvbnMpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCB7IHdhaXQgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzW19wcmVwYXJlTW9kZWxdKGF0dHJzLCBvcHRpb25zIGFzIFNpbGVuY2VhYmxlKTtcbiAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbW9kZWwgPSBpc01vZGVsKHNlZWQpID8gc2VlZCA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCF3YWl0IHx8ICFtb2RlbCkge1xuICAgICAgICAgICAgdGhpcy5hZGQoc2VlZCwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb2RlbC5zYXZlKHVuZGVmaW5lZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChzZWVkLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGVycm9yJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbW9kZWwgcHJlcGFyYXRpb24gKi9cbiAgICBwcml2YXRlIFtfcHJlcGFyZU1vZGVsXShhdHRyczogb2JqZWN0IHwgVE1vZGVsIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChpc0NvbGxlY3Rpb25Nb2RlbChhdHRycywgdGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRycztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBpZiAoY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBtb2RlbE9wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBuZXcgY29uc3RydWN0b3IoYXR0cnMsIG9wdHMpIGFzIHsgdmFsaWRhdGU6ICgpID0+IFJlc3VsdDsgfTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKG1vZGVsLnZhbGlkYXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IG1vZGVsLnZhbGlkYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKEZBSUxFRChyZXN1bHQuY29kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29sbGVjdGlvbikudHJpZ2dlcignQGludmFsaWQnLCBhdHRycyBhcyBNb2RlbCwgdGhpcyBhcyBDb2xsZWN0aW9uLCByZXN1bHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb2RlbCBhcyBUTW9kZWw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwbGFpbiBvYmplY3RcbiAgICAgICAgcmV0dXJuIGF0dHJzIGFzIFRNb2RlbDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCBjYWxsZWQgYnkgYm90aCByZW1vdmUgYW5kIHNldC4gKi9cbiAgICBwcml2YXRlIFtfcmVtb3ZlTW9kZWxzXShtb2RlbHM6IFRNb2RlbFtdLCBvcHRpb25zOiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHJlbW92ZWQ6IFRNb2RlbFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgbWRsIG9mIG1vZGVscykge1xuICAgICAgICAgICAgY29uc3QgbW9kZWwgPSB0aGlzLmdldChtZGwpO1xuICAgICAgICAgICAgaWYgKCFtb2RlbCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gc3RvcmUuaW5kZXhPZihtb2RlbCk7XG4gICAgICAgICAgICBzdG9yZS5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVmZXJlbmNlcyBiZWZvcmUgdHJpZ2dlcmluZyAncmVtb3ZlJyBldmVudCB0byBwcmV2ZW50IGFuIGluZmluaXRlIGxvb3AuXG4gICAgICAgICAgICB0aGlzW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsLCB0cnVlKTtcblxuICAgICAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgICAgIG9wdHMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQHJlbW92ZScsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb2xsZWN0aW9uKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwsIHRoaXMgYXMgQ29sbGVjdGlvbiwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZW1vdmVkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIGNyZWF0ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX2FkZFJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoX2NpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsIHRoaXNbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gc2V2ZXIgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwsIHBhcnRpYWwgPSBmYWxzZSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoX2NpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcnRpYWwgJiYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcExpc3RlbmluZyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgdGhpc1tfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJdGVyYWJsZTxUTW9kZWw+XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSXRlcmF0b3Igb2YgW1tFbGVtZW50QmFzZV1dIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIOagvOe0jeOBl+OBpuOBhOOCiyBbW0VsZW1lbnRCYXNlXV0g44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpcy5tb2RlbHMsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxUTW9kZWw+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5iYXNlW3RoaXMucG9pbnRlcisrXSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IgYXMgSXRlcmF0b3I8VE1vZGVsPjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXkoaWQpLCB2YWx1ZShtb2RlbCkgcGFpcnMgZm9yIGV2ZXJ5IGVudHJ5IGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSwgdmFsdWUobW9kZWwpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBUTW9kZWxdPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFtrZXksIHZhbHVlXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5cyhpZCkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZykgPT4ga2V5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIOmFjeWIl+OBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gaXRlcmF0b3IgY3JlYXRlIGZ1bmN0aW9uICovXG4gICAgcHJpdmF0ZSBbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdPFI+KHZhbHVlR2VuZXJhdG9yOiAoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IFIpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXMubW9kZWxzLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwb3Mya2V5ID0gKHBvczogbnVtYmVyKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgIHJldHVybiBnZXRNb2RlbElkKGNvbnRleHQuYmFzZVtwb3NdLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKSB8fCBTdHJpbmcocG9zKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBpdGVyYXRvcjogSXRlcmFibGVJdGVyYXRvcjxSPiA9IHtcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8Uj4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBjb250ZXh0LnBvaW50ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgPCBjb250ZXh0LmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQucG9pbnRlcisrO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVHZW5lcmF0b3IocG9zMmtleShjdXJyZW50KSwgY29udGV4dC5iYXNlW2N1cnJlbnRdKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQhLCAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBpdGVyYXRvcjtcbiAgICB9XG59XG5cbi8vIG1peGluIOOBq+OCiOOCiyBgaW5zdGFuY2VvZmAg44Gv54Sh5Yq544Gr6Kit5a6aXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShDb2xsZWN0aW9uIGFzIENsYXNzLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuIiwiaW1wb3J0IHR5cGUgeyBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBBcnJheUNoYW5nZVJlY29yZCB9IGZyb20gJ0BjZHAvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB0eXBlIHsgTGlzdENoYW5nZWQsIExpc3RFZGl0T3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIGNsZWFyQXJyYXksXG4gICAgYXBwZW5kQXJyYXksXG4gICAgaW5zZXJ0QXJyYXksXG4gICAgcmVvcmRlckFycmF5LFxuICAgIHJlbW92ZUFycmF5LFxufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB0eXBlIHsgQ29sbGVjdGlvbiB9IGZyb20gJy4vYmFzZSc7XG5cbi8qKlxuICogQGVuIEVkaXRlZCBjb2xsZWN0aW9uIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSDooqvnt6jpm4bjgrPjg6zjgq/jgrfjg6fjg7Pjga7lnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbkVkaXRlZTxNIGV4dGVuZHMgb2JqZWN0PiA9IENvbGxlY3Rpb248TSwgYW55LCBhbnk+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gcHJlcGFyZTxUIGV4dGVuZHMgb2JqZWN0Pihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uKTogVFtdIHwgbmV2ZXIge1xuICAgIGlmIChjb2xsZWN0aW9uLmZpbHRlcmVkKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0VESVRfUEVSTUlTU0lPTl9ERU5JRUQsICdjb2xsZWN0aW9uIGlzIGFwcGxpZWQgYWZ0ZXItZmlsdGVyLicpO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGVjdGlvbi5tb2RlbHMuc2xpY2UoKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuYXN5bmMgZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uPFQ+LFxuICAgIG9wdGlvbnM6IExpc3RFZGl0T3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBvcGVyYXRpb246ICh0YXJnZXRzOiBUW10sIHRva2VuOiBDYW5jZWxUb2tlbiB8IHVuZGVmaW5lZCkgPT4gUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPixcbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGNvbnN0IHRhcmdldHMgPSBwcmVwYXJlPFQ+KGNvbGxlY3Rpb24pO1xuICAgIGNvbnN0IGNoYW5nZSA9IGF3YWl0IG9wZXJhdGlvbih0YXJnZXRzLCBvcHRpb25zPy5jYW5jZWwpO1xuICAgIGNvbGxlY3Rpb24uc2V0KHRhcmdldHMsIG9wdGlvbnMpO1xuICAgIHJldHVybiBjaGFuZ2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIG1pbihpbmRpY2VzOiBudW1iZXJbXSk6IG51bWJlciB7XG4gICAgcmV0dXJuIGluZGljZXMucmVkdWNlKChsaHMsIHJocykgPT4gTWF0aC5taW4obGhzLCByaHMpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gbWFrZUxpc3RDaGFuZ2VkPFQ+KFxuICAgIHR5cGU6ICdhZGQnIHwgJ3JlbW92ZScgfCAncmVvcmRlcicsXG4gICAgY2hhbmdlczogQXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXSxcbiAgICByYW5nZUZyb206IG51bWJlcixcbiAgICByYW5nZVRvOiBudW1iZXIsXG4gICAgYXQ/OiBudW1iZXIsXG4pOiBMaXN0Q2hhbmdlZDxUPiB7XG4gICAgY29uc3QgY2hhbmdlZCA9ICEhY2hhbmdlcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZSxcbiAgICAgICAgbGlzdDogY2hhbmdlcyxcbiAgICAgICAgcmFuZ2U6IGNoYW5nZWQgPyB7IGZyb206IHJhbmdlRnJvbSwgdG86IHJhbmdlVG8gfSA6IHVuZGVmaW5lZCxcbiAgICAgICAgaW5zZXJ0ZWRUbzogY2hhbmdlZCA/IGF0IDogdW5kZWZpbmVkLFxuICAgIH0gYXMgTGlzdENoYW5nZWQ8VD47XG59XG5cbi8qKlxuICogQGVuIENsZWFyIGFsbCBlbGVtZW50cyBvZiBbW0NvbGxlY3Rpb25dXS5cbiAqIEBqYSBbW0NvbGxlY3Rpb25dXSDopoHntKDjga7lhajliYrpmaRcbiAqXG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogIC0gYGVuYCB0YXJnZXQgW1tDb2xsZWN0aW9uXV1cbiAqICAtIGBqYWAg5a++6LGhIFtbQ29sbGVjdGlvbl1dXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIHJlZmVyZW5jZS5cbiAqICAtIGBqYWAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSDjgpLmjIflrppcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckNvbGxlY3Rpb248VCBleHRlbmRzIG9iamVjdD4oXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbkVkaXRlZTxUPixcbiAgICBvcHRpb25zPzogTGlzdEVkaXRPcHRpb25zXG4pOiBQcm9taXNlPExpc3RDaGFuZ2VkPFQ+PiB7XG4gICAgY29uc3QgcmFuZ2VUbyA9IGNvbGxlY3Rpb24ubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGNsZWFyQXJyYXkodGFyZ2V0cywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdyZW1vdmUnLCBjaGFuZ2VzLCAwLCByYW5nZVRvKTtcbn1cblxuLyoqXG4gKiBAZW4gQXBwZW5kIHNvdXJjZSBlbGVtZW50cyB0byB0aGUgZW5kIG9mIFtbQ29sbGVjdGlvbl1dLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIOOBruacq+WwvuOBq+i/veWKoFxuICpcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiAgLSBgZW5gIHRhcmdldCBbW0NvbGxlY3Rpb25dXVxuICogIC0gYGphYCDlr77osaEgW1tDb2xsZWN0aW9uXV1cbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIHNyYzogVFtdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBjb2xsZWN0aW9uLmxlbmd0aDtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IGFwcGVuZEFycmF5KHRhcmdldHMsIHNyYywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdhZGQnLCBjaGFuZ2VzLCByYW5nZUZyb20sIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgcmFuZ2VGcm9tKTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgW1tDb2xsZWN0aW9uXV0uXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g44Gu5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc291cmNlIGVsZW1lbnRzXG4gKiAgLSBgamFgIOi/veWKoOWFg+imgee0oFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zZXJ0Q29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIGluZGV4OiBudW1iZXIsXG4gICAgc3JjOiBUW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhd2FpdCBleGVjKGNvbGxlY3Rpb24sIG9wdGlvbnMsICh0YXJnZXRzLCB0b2tlbikgPT4gaW5zZXJ0QXJyYXkodGFyZ2V0cywgaW5kZXgsIHNyYywgdG9rZW4pKTtcbiAgICByZXR1cm4gbWFrZUxpc3RDaGFuZ2VkKCdhZGQnLCBjaGFuZ2VzLCBpbmRleCwgY29sbGVjdGlvbi5sZW5ndGggLSAxLCBpbmRleCk7XG59XG5cbi8qKlxuICogQGVuIFJlb3JkZXIgW1tDb2xsZWN0aW9uXV0gZWxlbWVudHMgcG9zaXRpb24uXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g6aCF55uu44Gu5L2N572u44KS5aSJ5pu0XG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIGluZGV4XG4gKiAgLSBgamFgIHRhcmdldCBhcnJheSBwb3NpdGlvbiBpbmRleFxuICogIC0gYGphYCDov73liqDlhYjjga7jgqTjg7Pjg4fjg4Pjgq/jgrlcbiAqIEBwYXJhbSBvcmRlcnNcbiAqICAtIGBlbmAgZWRpdCBvcmRlciBpbmRleCBhcnJheVxuICogIC0gYGphYCDjgqTjg7Pjg4fjg4Pjgq/jgrnphY3liJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0gcmVmZXJlbmNlLlxuICogIC0gYGphYCBbW0NvbGxlY3Rpb25FZGl0T3B0aW9uc11dIOOCkuaMh+WumlxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlb3JkZXJDb2xsZWN0aW9uPFQgZXh0ZW5kcyBvYmplY3Q+KFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25FZGl0ZWU8VD4sXG4gICAgaW5kZXg6IG51bWJlcixcbiAgICBvcmRlcnM6IG51bWJlcltdLFxuICAgIG9wdGlvbnM/OiBMaXN0RWRpdE9wdGlvbnNcbik6IFByb21pc2U8TGlzdENoYW5nZWQ8VD4+IHtcbiAgICBjb25zdCByYW5nZUZyb20gPSBtaW4oW2luZGV4LCAuLi5vcmRlcnNdKTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYXdhaXQgZXhlYyhjb2xsZWN0aW9uLCBvcHRpb25zLCAodGFyZ2V0cywgdG9rZW4pID0+IHJlb3JkZXJBcnJheSh0YXJnZXRzLCBpbmRleCwgb3JkZXJzLCB0b2tlbikpO1xuICAgIHJldHVybiBtYWtlTGlzdENoYW5nZWQoJ3Jlb3JkZXInLCBjaGFuZ2VzLCByYW5nZUZyb20sIGNvbGxlY3Rpb24ubGVuZ3RoIC0gMSwgaW5kZXgpO1xufVxuXG4vKipcbiAqIEBlbiBSZW1vdmUgW1tDb2xsZWN0aW9uXV0gZWxlbWVudHMuXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0g6aCF55uu44Gu5YmK6ZmkXG4gKlxuICogQHBhcmFtIGNvbGxlY3Rpb25cbiAqICAtIGBlbmAgdGFyZ2V0IFtbQ29sbGVjdGlvbl1dXG4gKiAgLSBgamFgIOWvvuixoSBbW0NvbGxlY3Rpb25dXVxuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCByZW1vdmVkIG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tDb2xsZWN0aW9uRWRpdE9wdGlvbnNdXSByZWZlcmVuY2UuXG4gKiAgLSBgamFgIFtbQ29sbGVjdGlvbkVkaXRPcHRpb25zXV0g44KS5oyH5a6aXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQ29sbGVjdGlvbjxUIGV4dGVuZHMgb2JqZWN0PihcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uRWRpdGVlPFQ+LFxuICAgIG9yZGVyczogbnVtYmVyW10sXG4gICAgb3B0aW9ucz86IExpc3RFZGl0T3B0aW9uc1xuKTogUHJvbWlzZTxMaXN0Q2hhbmdlZDxUPj4ge1xuICAgIGNvbnN0IHJhbmdlRnJvbSA9IG1pbihvcmRlcnMpO1xuICAgIGNvbnN0IHJhbmdlVG8gPSBjb2xsZWN0aW9uLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgY2hhbmdlcyA9IGF3YWl0IGV4ZWMoY29sbGVjdGlvbiwgb3B0aW9ucywgKHRhcmdldHMsIHRva2VuKSA9PiByZW1vdmVBcnJheSh0YXJnZXRzLCBvcmRlcnMsIHRva2VuKSk7XG4gICAgcmV0dXJuIG1ha2VMaXN0Q2hhbmdlZCgncmVtb3ZlJywgY2hhbmdlcywgcmFuZ2VGcm9tLCByYW5nZVRvKTtcbn1cbiJdLCJuYW1lcyI6WyJjYyIsInRydW5jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBOzs7OztBQU1BOzs7OztJQVVJO0lBQUE7UUFDSSxnR0FBaUQsQ0FBQTtRQUNqRCxzREFBbUMsWUFBQSxrQkFBa0IsZ0JBQXVCLHNCQUE2QixDQUFDLEVBQUUsaUJBQWlCLENBQUMsOEJBQUEsQ0FBQTtRQUM5SCwyREFBbUMsWUFBQSxrQkFBa0IsZ0JBQXVCLHNCQUE2QixDQUFDLEVBQUUsc0JBQXNCLENBQUMsbUNBQUEsQ0FBQTtRQUNuSSw4REFBbUMsWUFBQSxrQkFBa0IsZ0JBQXVCLHNCQUE2QixDQUFDLEVBQUUsNEJBQTRCLENBQUMsc0NBQUEsQ0FBQTtLQUM1SSxJQUFBO0FBQ0wsQ0FBQzs7QUNURDtBQUNBLElBQUksU0FBUyxHQUFxQjtJQUM5QixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDcEYsQ0FBQyxDQUFDO0FBRUY7Ozs7Ozs7Ozs7U0FVZ0IsdUJBQXVCLENBQUMsV0FBOEI7SUFDbEUsSUFBSSxJQUFJLElBQUksV0FBVyxFQUFFO1FBQ3JCLE9BQU8sU0FBUyxDQUFDO0tBQ3BCO1NBQU07UUFDSCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDOUIsU0FBUyxHQUFHLFdBQVcsQ0FBQztRQUN4QixPQUFPLFdBQVcsQ0FBQztLQUN0QjtBQUNMLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7U0FXZ0IsbUJBQW1CLENBQStCLElBQU8sRUFBRSxLQUFnQjtJQUN2RixPQUFPLENBQUMsR0FBTSxFQUFFLEdBQU07O1FBRWxCLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFjLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3pFLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFjLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3pFLE9BQU8sS0FBSyxHQUFHLFNBQVMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDeEQsQ0FBQztBQUNOLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7U0FXZ0IsaUJBQWlCLENBQStCLElBQU8sRUFBRSxLQUFnQjtJQUNyRixPQUFPLENBQUMsR0FBTSxFQUFFLEdBQU07UUFDbEIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQWMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFjLENBQUMsQ0FBQztRQUNwQyxJQUFJLE9BQU8sS0FBSyxPQUFPLEVBQUU7O1lBRXJCLE9BQU8sQ0FBQyxDQUFDO1NBQ1o7YUFBTSxJQUFJLElBQUksSUFBSSxPQUFPLEVBQUU7O1lBRXhCLE9BQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ3JCO2FBQU0sSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFOztZQUV4QixPQUFPLENBQUMsR0FBRyxLQUFLLENBQUM7U0FDcEI7YUFBTTtZQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0MsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFO2dCQUN2QixPQUFPLENBQUMsQ0FBQzthQUNaO2lCQUFNO2dCQUNILFFBQVEsUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEtBQUssRUFBRTthQUN6RDtTQUNKO0tBQ0osQ0FBQztBQUNOLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7U0FXZ0Isb0JBQW9CLENBQStCLElBQU8sRUFBRSxLQUFnQjtJQUN4RixPQUFPLENBQUMsR0FBTSxFQUFFLEdBQU07UUFDbEIsSUFBSSxHQUFHLENBQUMsSUFBYyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQWMsQ0FBQyxFQUFFO1lBQzdDLE9BQU8sQ0FBQyxDQUFDO1NBQ1o7YUFBTSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsSUFBYyxDQUFDLEVBQUU7O1lBRXBDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ3JCO2FBQU0sSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLElBQWMsQ0FBQyxFQUFFOztZQUVwQyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUM7U0FDcEI7YUFBTTtZQUNILFFBQVEsR0FBRyxDQUFDLElBQWMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEtBQUssRUFBRTtTQUMvRTtLQUNKLENBQUM7QUFDTixDQUFDO0FBRUQ7Ozs7TUFJYSxvQkFBb0IsR0FBRyxxQkFBcUI7QUFFekQ7Ozs7TUFJYSxtQkFBbUIsR0FBRyxxQkFBcUI7QUFFeEQ7Ozs7U0FJZ0IsWUFBWSxDQUErQixPQUFtQjtJQUMxRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDdEMsUUFBUSxJQUFJO1FBQ1IsS0FBSyxRQUFRO1lBQ1QsT0FBTyxtQkFBbUIsQ0FBTyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsS0FBSyxTQUFTO1lBQ1YsT0FBTyxvQkFBb0IsQ0FBTyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsS0FBSyxRQUFRO1lBQ1QsT0FBTyxtQkFBbUIsQ0FBTyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsS0FBSyxNQUFNO1lBQ1AsT0FBTyxpQkFBaUIsQ0FBTyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQ7WUFDSSxPQUFPLG9CQUFvQixDQUFPLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztLQUN0RDtBQUNMLENBQUM7QUFFRDs7OztTQUlnQixlQUFlLENBQStCLFFBQXNCO0lBQ2hGLE1BQU0sV0FBVyxHQUFzQixFQUFFLENBQUM7SUFDMUMsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUU7UUFDNUIsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUMzQztJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3ZCOztBQ3BKQTs7Ozs7O01BTWEsV0FBVzs7Ozs7Ozs7Ozs7SUFvQnBCLFlBQVksS0FBVSxFQUFFLFlBQVksR0FBRyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO1FBQzNCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztTQUNqQzthQUFNO1lBQ0gsSUFBSSxDQUFDLE1BQU0seUJBQTBCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1NBQ3JCO0tBQ0o7Ozs7Ozs7Ozs7OztJQWFNLEtBQUssQ0FBQyxRQUFhLEVBQUUsRUFBRTtRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztRQUMzQixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNkLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7U0FDakM7YUFBTTtZQUNILElBQUksQ0FBQyxNQUFNLHlCQUEwQjtZQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztTQUNyQjtRQUNELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7Ozs7Ozs7SUFTRCxJQUFJLE9BQU87UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ25DOzs7OztJQU1ELElBQUksS0FBSztRQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztLQUN0Qjs7Ozs7SUFNRCxJQUFJLE1BQU07UUFDTixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0tBQzdCOzs7OztJQU1ELElBQUksS0FBSztRQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztLQUNwQjs7Ozs7SUFNRCxJQUFJLEtBQUs7UUFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7S0FDcEI7Ozs7O0lBTUQsSUFBSSxLQUFLO1FBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0tBQ3RCOzs7Ozs7O0lBU00sU0FBUztRQUNaLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNmLElBQUksQ0FBQyxNQUFNLHlCQUEwQjtZQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztTQUNwQjtRQUNELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7Ozs7O0lBTU0sUUFBUTtRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNmLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7SUFNTSxRQUFRO1FBQ1gsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1gsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7WUFDbEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7U0FDbkI7YUFBTTtZQUNILElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNqQjtRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSx5QkFBMEI7WUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDcEI7UUFDRCxPQUFPLElBQUksQ0FBQztLQUNmOzs7OztJQU1NLFlBQVk7UUFDZixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNsQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1NBQ2pDO2FBQU07WUFDSCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDakI7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2YsSUFBSSxDQUFDLE1BQU0seUJBQTBCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7Ozs7Ozs7SUFZTSxJQUFJLENBQUMsUUFBNkI7UUFDckMsSUFBSSxRQUFRLEtBQUssT0FBTyxRQUFRLEVBQUU7WUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7U0FDMUI7YUFBTTtZQUNILElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDakQ7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2YsSUFBSSxDQUFDLE1BQU0seUJBQTBCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7Ozs7OztJQVlPLEtBQUs7UUFDVCxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7S0FDakU7OztBQzlOTDtBQUNBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRXBDO0FBQ0EsU0FBUyxXQUFXLENBQUksTUFBMEIsRUFBRSxLQUFXO0lBQzNELE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTztRQUN0QixNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQStCO1lBQzdDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckIsSUFBSSxLQUFLLEVBQUU7Z0JBQ1AsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQ2pCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQzthQUN6QjtZQUNELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNwQixDQUFDO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN2QixDQUFDLENBQUM7QUFDUCxDQUFDO0FBRUQ7QUFDQSxlQUFlLGNBQWMsQ0FDekIsTUFBZ0MsRUFDaEMsS0FBbUI7SUFFbkIsSUFBSSxNQUFNLFlBQVksZUFBZSxFQUFFO1FBQ25DLE1BQU1BLGFBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQixPQUFPO1lBQ0gsTUFBTSxFQUFFLE1BQU07WUFDZCxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQztTQUMvQixDQUFDO0tBQ0w7U0FBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDOUIsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxNQUFNQSxhQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEIsT0FBTztZQUNILE1BQU07WUFDTixPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7U0FDdkMsQ0FBQztLQUNMO1NBQU07UUFDSCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLHlDQUF5QyxDQUFDLENBQUM7S0FDMUY7QUFDTCxDQUFDO0FBRUQ7QUFDQSxTQUFTLFdBQVcsQ0FBQyxNQUFjLEVBQUUsTUFBZ0I7SUFDakQsSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQ3RDLE9BQU8sS0FBSyxDQUFDO0tBQ2hCO0lBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDeEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE1BQU0sSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtZQUN4RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLHFDQUFxQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQzdGO0tBQ0o7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0FBY08sZUFBZSxVQUFVLENBQUksTUFBZ0MsRUFBRSxLQUFtQjtJQUNyRixJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQ3BCLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVoRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFaEMsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCTyxlQUFlLFdBQVcsQ0FBSSxNQUFnQyxFQUFFLEdBQVEsRUFBRSxLQUFtQjtJQUNoRyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7UUFDaEMsT0FBTyxFQUFFLENBQUM7S0FDYjtJQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRWhFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUVwQixPQUFPLE9BQU8sQ0FBQztBQUNuQixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JPLGVBQWUsV0FBVyxDQUFJLE1BQWdDLEVBQUUsS0FBYSxFQUFFLEdBQVEsRUFBRSxLQUFtQjs7SUFFL0csSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUU7UUFDOUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSwyQ0FBMkMsS0FBSyxFQUFFLENBQUMsQ0FBQztLQUNuRztTQUFNLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtRQUN2QyxPQUFPLEVBQUUsQ0FBQztLQUNiO0lBRUQsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFaEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFaEMsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CTyxlQUFlLFlBQVksQ0FBSSxNQUFnQyxFQUFFLEtBQWEsRUFBRSxNQUFnQixFQUFFLEtBQW1COztJQUV4SCxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtRQUM5RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLDRDQUE0QyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQ3BHO1NBQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQzVDLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQzs7SUFHaEUsSUFBSSxJQUFJLEdBQWlCLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUM7UUFDSSxNQUFNLFFBQVEsR0FBUSxFQUFFLENBQUM7UUFDekIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDO1NBQ3RCO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLO1lBQ3JCLE9BQU8sSUFBSSxJQUFJLEtBQUssQ0FBQztTQUN4QixDQUFDLENBQUM7S0FDTjs7SUFHRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUMzQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBTSxDQUFDO0tBQ2hDO0lBRUQsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCTyxlQUFlLFdBQVcsQ0FBSSxNQUFnQyxFQUFFLE1BQWdCLEVBQUUsS0FBbUI7SUFDeEcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1FBQ3JDLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQzs7SUFHaEUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHO1FBQ2pCLFFBQVEsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7S0FDL0IsQ0FBQyxDQUFDO0lBRUgsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDaEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDM0I7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNuQjs7QUNyT0E7U0FDZ0IsS0FBSyxDQUFtQixJQUFhLEVBQUUsS0FBc0I7SUFDekUsT0FBTyxDQUFDLElBQU8sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDO0FBQzdDLENBQUM7QUFFRDtTQUNnQixRQUFRLENBQW1CLElBQWEsRUFBRSxLQUFzQjtJQUM1RSxPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUM7QUFDN0MsQ0FBQztBQUVEO1NBQ2dCLE9BQU8sQ0FBbUIsSUFBYSxFQUFFLEtBQTZCO0lBQ2xGLE9BQU8sQ0FBQyxJQUFPLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztBQUMzQyxDQUFDO0FBRUQ7U0FDZ0IsSUFBSSxDQUFtQixJQUFhLEVBQUUsS0FBNkI7SUFDL0UsT0FBTyxDQUFDLElBQU8sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQzNDLENBQUM7QUFFRDtTQUNnQixZQUFZLENBQW1CLElBQWEsRUFBRSxLQUE2QjtJQUN2RixPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7QUFDNUMsQ0FBQztBQUVEO1NBQ2dCLFNBQVMsQ0FBbUIsSUFBYSxFQUFFLEtBQTZCO0lBQ3BGLE9BQU8sQ0FBQyxJQUFPLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQztBQUM1QyxDQUFDO0FBRUQ7U0FDZ0IsSUFBSSxDQUFtQixJQUFhLEVBQUUsS0FBeUI7SUFDM0UsT0FBTyxDQUFDLElBQU8sS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztBQUNuRyxDQUFDO0FBRUQ7U0FDZ0IsT0FBTyxDQUFtQixJQUFhLEVBQUUsS0FBeUI7SUFDOUUsT0FBTyxDQUFDLElBQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBQ3BHLENBQUM7QUFFRDtTQUNnQixhQUFhLENBQW1CLElBQWEsRUFBRSxLQUFhLEVBQUUsSUFBNkI7SUFDdkcsT0FBTyxDQUFDLElBQU87UUFDWCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsT0FBTyxJQUFJLElBQUssSUFBSSxDQUFDLElBQUksQ0FBcUIsQ0FBQztLQUNsRCxDQUFDO0FBQ04sQ0FBQztBQUVEO1NBQ2dCLGdCQUFnQixDQUFtQixJQUFhLEVBQUUsS0FBYSxFQUFFLElBQTZCO0lBQzFHLE9BQU8sQ0FBQyxJQUFPO1FBQ1gsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxJQUFJLElBQUssSUFBSSxDQUFDLElBQUksQ0FBcUIsQ0FBQyxDQUFDO0tBQ3JELENBQUM7QUFDTixDQUFDO0FBRUQ7U0FDZ0IsS0FBSyxDQUFtQixJQUFhLEVBQUUsR0FBMkIsRUFBRSxHQUEyQjtJQUMzRyxPQUFPLFdBQVcsY0FBeUIsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDOUYsQ0FBQztBQUVEO1NBQ2dCLFdBQVcsQ0FBbUIsSUFBd0IsRUFBRSxHQUFzQixFQUFFLEdBQWtDO0lBQzlILE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBTztRQUN4QixRQUFRLElBQUk7WUFDUjtnQkFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEM7Z0JBQ0ksT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDO2dCQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDLENBQUM7O2dCQUU3QyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDckM7S0FDSixDQUFDO0FBQ047O0FDekRBOzs7O01BSWEsZ0JBQWdCOzs7Ozs7OztJQWdCekIsWUFBWSxRQUEyQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7UUFDcEUsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQzNFLElBQUksQ0FBQyxVQUFVLEdBQU8sU0FBUyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxZQUFZLEdBQUssSUFBSSxJQUFJLFdBQVcsR0FBRyxXQUFXLGVBQTBCO1FBQ2pGLElBQUksQ0FBQyxRQUFRLEdBQVMsSUFBSSxJQUFJLE9BQU8sR0FBRyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ3JELElBQUksQ0FBQyxNQUFNLEdBQVcsS0FBSyxDQUFDO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvQixJQUFJLENBQUMsU0FBUyxHQUFRLFFBQVEsSUFBSSxFQUFFLENBQUM7S0FDeEM7OztJQUtELElBQUksU0FBUztRQUNULE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztLQUMxQjtJQUVELElBQUksU0FBUyxDQUFDLE1BQXVDO1FBQ2pELElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDO0tBQzVCO0lBRUQsSUFBSSxPQUFPO1FBQ1AsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0tBQ3hCO0lBRUQsSUFBSSxPQUFPLENBQUMsTUFBdUI7UUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7S0FDMUI7SUFFRCxJQUFJLFdBQVc7UUFDWCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7S0FDNUI7SUFFRCxJQUFJLFdBQVcsQ0FBQyxLQUF5QjtRQUNyQyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztLQUM3QjtJQUVELElBQUksS0FBSztRQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztLQUN0QjtJQUVELElBQUksS0FBSyxDQUFDLEtBQStDO1FBQ3JELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0tBQ3ZCO0lBRUQsSUFBSSxNQUFNO1FBQ04sT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0tBQ3ZCO0lBRUQsSUFBSSxNQUFNLENBQUMsS0FBYztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztLQUN4QjtJQUVELElBQUksUUFBUTtRQUNSLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUN6QjtJQUVELElBQUksUUFBUSxDQUFDLE1BQXVCO1FBQ2hDLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO0tBQzNCOzs7Ozs7O0lBU0QsSUFBSSxXQUFXO1FBQ1gsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQzFDOzs7OztJQU1ELElBQUksTUFBTTtRQUNOLElBQUksSUFBdUMsQ0FBQztRQUU1QyxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDaEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQ3ZDLFFBQVEsUUFBUTtnQkFDWjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLEtBQUssQ0FBUSxJQUFJLEVBQUUsS0FBNEIsQ0FBQyxFQUNoRCxJQUFJLENBQ1AsQ0FBQztvQkFDRixNQUFNO2dCQUNWO29CQUNJLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsUUFBUSxDQUFRLElBQUksRUFBRSxLQUE0QixDQUFDLEVBQ25ELElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixPQUFPLENBQVEsSUFBSSxFQUFFLEtBQW1DLENBQUMsRUFDekQsSUFBSSxDQUNQLENBQUM7b0JBQ0YsTUFBTTtnQkFDVjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBUSxJQUFJLEVBQUUsS0FBbUMsQ0FBQyxFQUN0RCxJQUFJLENBQ1AsQ0FBQztvQkFDRixNQUFNO2dCQUNWO29CQUNJLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsWUFBWSxDQUFRLElBQUksRUFBRSxLQUFtQyxDQUFDLEVBQzlELElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixTQUFTLENBQVEsSUFBSSxFQUFFLEtBQW1DLENBQUMsRUFDM0QsSUFBSSxDQUNQLENBQUM7b0JBQ0YsTUFBTTtnQkFDVjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBUSxJQUFJLEVBQUUsS0FBK0IsQ0FBQyxFQUNsRCxJQUFJLENBQ1AsQ0FBQztvQkFDRixNQUFNO2dCQUNWO29CQUNJLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsT0FBTyxDQUFRLElBQUksRUFBRSxLQUErQixDQUFDLEVBQ3JELElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixhQUFhLENBQVEsSUFBSSxFQUFFLEtBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RELElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixnQkFBZ0IsQ0FBUSxJQUFJLEVBQUUsS0FBZSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDekQsSUFBSSxDQUNQLENBQUM7b0JBQ0YsTUFBTTtnQkFDVjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLEtBQUssQ0FBUSxJQUFJLEVBQUUsS0FBbUMsRUFBRSxJQUFJLENBQUMsS0FBbUMsQ0FBQyxFQUNqRyxJQUFJLENBQ1AsQ0FBQztvQkFDRixNQUFNO2dCQUNWO29CQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQXFCLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQzlDLE1BQU07YUFDYjtTQUNKO1FBRUQsT0FBTyxJQUFJLEtBQUssaUJBQWdCLElBQUksQ0FBQyxDQUFDO0tBQ3pDOzs7QUNuTUw7QUFDQSxNQUFNQyxPQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFRcEM7QUFFQTs7OztTQUlnQixXQUFXLENBQVEsS0FBYyxFQUFFLE1BQXFDLEVBQUUsR0FBRyxXQUFrQztJQUMzSCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdkUsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7UUFDbEMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDeEIsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDckM7S0FDSjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFFRDtBQUVBO0FBQ0EsTUFBTSxjQUFjLEdBQUc7SUFDbkIsaUJBQXNCLElBQUk7SUFDMUIsZUFBb0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0lBQ2hDLGtCQUF1QixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7SUFDdEMsa0JBQXVCLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQUU7SUFDM0MsZ0JBQXFCLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO0lBQzlDLGVBQW9CLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRTtJQUNsRCxjQUFtQixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7SUFDbEMsY0FBbUIsRUFBRSxLQUFLLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRTtJQUN6QyxjQUFtQixFQUFFLEtBQUssRUFBRSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRTtJQUNoRCxjQUFtQixFQUFFLEtBQUssRUFBRSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEVBQUU7Q0FDMUQsQ0FBQztBQUVGOzs7Ozs7Ozs7OztTQVdnQixjQUFjLENBQzFCLEtBQWMsRUFDZCxTQUF3QztJQUV4QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFFN0MsSUFBSSxNQUFNLEVBQUU7UUFDUixPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3hCO0lBRUQsSUFBSSxLQUFLLEVBQUU7UUFDUCxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDcEMsTUFBTSxLQUFLLEdBQVksRUFBRSxDQUFDO1FBQzFCLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDekIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDdEIsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDWCxLQUFLLEVBQUUsQ0FBQzthQUNYO2lCQUFNLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFtQixDQUFDLEVBQUU7Z0JBQzFDLEtBQUssS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQW1CLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNqRTtpQkFBTTtnQkFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLDJCQUEyQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRCxTQUFTO2FBQ1o7WUFFRCxJQUFJLFVBQVUsR0FBRyxLQUFLLEVBQUU7Z0JBQ3BCLElBQUksTUFBTSxFQUFFO29CQUNSLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3BCO2dCQUNELE1BQU07YUFDVDtpQkFBTTtnQkFDSCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BCO1NBQ0o7UUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFDO0tBQ2pCO0lBRUQsTUFBTSxNQUFNLEdBQUc7UUFDWCxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU07UUFDbkIsS0FBSztLQUN5QyxDQUFDO0lBRW5ELElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUU7UUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDdEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7Z0JBQ3ZCLElBQUksRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLEVBQUU7b0JBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQXVCLEdBQUcsQ0FBQyxDQUFDO2lCQUMxQztnQkFDQSxNQUFNLENBQUMsR0FBRyxDQUF1QixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUMzRDtTQUNKO0tBQ0o7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDO0FBRUQ7QUFFQTtBQUNBLGVBQWUsY0FBYyxDQUN6QixNQUFlLEVBQ2YsT0FBZ0Q7SUFFaEQsTUFBTSxFQUNGLE1BQU0sRUFDTixXQUFXLEVBQ1gsS0FBSyxFQUFFLFNBQVMsRUFDaEIsS0FBSyxFQUNMLE1BQU0sRUFBRSxLQUFLLEVBQ2IsUUFBUSxFQUNSLElBQUksRUFDSixRQUFRLEdBQ1gsR0FBRyxPQUFPLENBQUM7O0lBR1osTUFBTSxPQUFPLEdBQUcsUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBRXhGLE1BQU0sT0FBTyxHQUFZLEVBQUUsQ0FBQztJQUM1QixJQUFJLEtBQUssR0FBVyxDQUFDLElBQUksSUFBSSxTQUFTLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUV4RCxPQUFPLElBQUksRUFBRTtRQUNULE1BQU1ELGFBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxLQUFLLElBQUlDLE9BQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUU7WUFDaEUsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ3JGO2FBQU0sSUFBSSxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUlBLE9BQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRTtZQUNoRSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsa0JBQW1CLEtBQU0sRUFBRSxDQUFDLENBQUM7U0FDdkY7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDL0MsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLElBQUksS0FBSyxJQUFJLEtBQUssR0FBRyxLQUFLLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFFaEYsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRXZCLE1BQU0sTUFBTSxHQUFHO1lBQ1gsS0FBSyxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3JCLEtBQUs7WUFDTCxPQUFPLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBdUM7U0FDeEIsQ0FBQzs7UUFHdEMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDdEIsUUFBUSxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1NBQzNCO1FBRUQsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN2QixJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksS0FBSyxHQUFHLEtBQUssRUFBRTs7Z0JBRWpDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO2FBQzFCO2lCQUFNO2dCQUNILEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO2dCQUN0QixTQUFTO2FBQ1o7U0FDSjtRQUVELE9BQU8sTUFBTSxDQUFDO0tBQ2pCO0FBQ0wsQ0FBQztBQUVEO0FBQ0EsU0FBUyxRQUFRLENBQ2IsU0FBMkMsRUFDM0MsTUFBd0MsRUFDeEMsT0FBMEM7SUFFMUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDdEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUMvRSxJQUFJLFFBQVEsRUFBRTtRQUNWLFNBQVMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ2hDLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7S0FDbEM7QUFDTCxDQUFDO0FBRUQ7QUFDQSxlQUFlLGlCQUFpQixDQUM1QixTQUEyQyxFQUMzQyxRQUE2QyxFQUM3QyxPQUFnRDtJQUVoRCxNQUFNLEVBQ0YsS0FBSyxFQUFFLFNBQVMsRUFDaEIsS0FBSyxFQUNMLE1BQU0sRUFBRSxLQUFLLEVBQ2IsUUFBUSxFQUNSLElBQUksR0FDUCxHQUFHLE9BQU8sQ0FBQztJQUVaLE1BQU0sT0FBTyxHQUFZLEVBQUUsQ0FBQztJQUU1QixNQUFNLFdBQVcsR0FBRyxDQUFDLElBQXNDO1FBQ3ZELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQztRQUMxQyxPQUFPLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0tBQ3RELENBQUM7SUFFRixJQUFJLEtBQUssR0FBVyxDQUFDLElBQUksSUFBSSxTQUFTLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUV4RCxPQUFPLElBQUksRUFBRTtRQUNULE1BQU1ELGFBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUlDLE9BQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUU7WUFDckMsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ3JGO2FBQU0sSUFBSSxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUlBLE9BQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRTtZQUNoRSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDckY7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDL0MsSUFBSSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV2RCxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQixRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVwQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUM7WUFDL0MsSUFBSSxJQUFJLEVBQUU7Z0JBQ04sTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQzdCLElBQUksQ0FBQyxLQUFLLEVBQ1YsU0FBUyxDQUFDLE1BQU0sRUFDaEIsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUMzQixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVkLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRTtvQkFDakIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNyQyxPQUFPLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO2lCQUNsQzthQUNKO1lBRUQsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN4RTthQUVJO1lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUU1QixNQUFNLE1BQU0sR0FBRztnQkFDWCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsT0FBTyxFQUFFLFFBQVE7YUFDZ0IsQ0FBQzs7WUFHdEMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3RCLFFBQVEsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQzthQUMzQjtZQUVELElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ3ZCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLEdBQUcsS0FBSyxFQUFFOztvQkFFN0IsTUFBTSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7aUJBQzFCO3FCQUFNO29CQUNILEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztvQkFDM0IsU0FBUztpQkFDWjthQUNKO1lBRUQsUUFBUSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdEMsT0FBTyxNQUFNLENBQUM7U0FDakI7S0FDSjtBQUNMLENBQUM7QUFFRDtBQUVBO0FBQ0EsU0FBUyxhQUFhLENBQ2xCLE9BQTREO0lBRTVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdEQsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFFcEMsSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUU7UUFDbEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDaEQ7SUFFRCxPQUFPLElBQStDLENBQUM7QUFDM0QsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7OztBQWNPLGVBQWUsVUFBVSxDQUM1QixTQUEyQyxFQUMzQyxRQUE2QyxFQUM3QyxPQUFpRDtJQUVqRCxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDcEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDOztJQUcvQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUU1RCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUU7UUFDakIsT0FBTyxDQUFDLE1BQU0sY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQztLQUNwRTtTQUFNO1FBQ0gsT0FBTyxDQUFDLE1BQU0saUJBQWlCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUM7S0FDckU7QUFDTDs7QUMxUkE7QUFDQSxNQUFNLFdBQVcsR0FBZSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDckQ7QUFDQSxNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ25FO0FBQ0EsTUFBTSxhQUFhLEdBQWEsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hEO0FBQ0EsTUFBTSxhQUFhLEdBQWEsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hEO0FBQ0EsTUFBTSxhQUFhLEdBQWEsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hEO0FBQ0EsTUFBTSxnQkFBZ0IsR0FBVSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzRDtBQUNBLE1BQU0sYUFBYSxHQUFhLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBZTlEO0FBQ0EsTUFBTSxlQUFlLEdBQUcsQ0FBc0MsT0FBdUI7SUFDakYsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQixPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDO0FBRUY7QUFDQSxNQUFNLGlCQUFpQixHQUFHLENBQXNDLE9BQW9DO0lBQ2hHLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDdkQsT0FBTztRQUNILFFBQVEsRUFBRSxJQUFJLElBQUksRUFBRTtRQUNwQixXQUFXLEVBQUUsS0FBSyxJQUFJLGVBQWUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0tBQ3BELENBQUM7QUFDTixDQUFDLENBQUM7QUFFRjtBQUNBLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBbUIsSUFBZ0M7SUFDeEUsT0FBTyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksSUFBSSxDQUFDO0FBQ3pDLENBQUMsQ0FBQztBQUVGO0FBQ0EsTUFBTSxVQUFVLEdBQUcsQ0FBbUIsS0FBUSxFQUFFLElBQWdDO0lBQzVFLE9BQU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDO0FBRUY7QUFDQSxNQUFNLGFBQWEsR0FBRyxDQUFtQixHQUFXLEVBQUUsSUFBZ0M7SUFFbEYsTUFBTSxLQUFLLEdBQUcsR0FBZ0IsQ0FBQztJQUUvQixNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUNmLE9BQU8sU0FBUyxDQUFDO0tBQ3BCO0lBRUQsT0FBTyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQztBQUNwSCxDQUFDLENBQUM7QUFFRjtBQUNBLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBb0UsSUFBeUI7SUFDbEgsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQztBQUVGO0FBQ0EsTUFBTSxpQkFBaUIsR0FBRyxDQUFvRSxDQUFVLEVBQUUsSUFBeUI7SUFDL0gsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksR0FBRyxLQUFLLENBQUM7QUFDeEQsQ0FBQyxDQUFDO0FBRUY7QUFDQSxNQUFNLFdBQVcsR0FBRyxDQUFJLE1BQVcsRUFBRSxNQUFXLEVBQUUsRUFBVTtJQUN4RCxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDO0FBRUY7QUFDQSxTQUFTLGVBQWUsQ0FBbUIsR0FBRyxJQUFlO0lBQ3pELE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9CLElBQUksSUFBSSxJQUFJLE1BQU0sRUFBRTtRQUNoQixPQUFPLEVBQUUsQ0FBQztLQUNiO1NBQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUM1QixPQUFPLE1BQXlDLENBQUM7S0FDcEQ7U0FBTTtRQUNILE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQW9DLENBQUM7S0FDcEY7QUFDTCxDQUFDO0FBRUQ7QUFDQSxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDN0Q7QUFDQSxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBRWpEO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BNkVzQixVQUlwQixTQUFRLFdBQWtCOzs7Ozs7Ozs7Ozs7O0lBMEJ4QixZQUFZLEtBQWdDLEVBQUUsT0FBcUQ7UUFDL0YsS0FBSyxFQUFFLENBQUM7UUFDUixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFNUUsTUFBTSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHO1lBQ2hCLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQy9DLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztZQUMzQixZQUFZO1lBQ1osU0FBUyxFQUFFLEVBQUU7WUFDYixZQUFZO1lBQ1osSUFBSSxFQUFFLElBQUksR0FBRyxFQUFrQjtZQUMvQixLQUFLLEVBQUUsRUFBRTtTQUN5QixDQUFDO1FBRXZDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzs7UUFHckIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQXlCLEVBQUUsVUFBZ0IsRUFBRSxPQUFtQztZQUNsSCxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFO2dCQUNoQyxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssSUFBSSxTQUFTLEtBQUssS0FBSyxLQUFLLFVBQVUsS0FBSyxJQUFJLEVBQUU7b0JBQ2xFLE9BQU87aUJBQ1Y7Z0JBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFOztvQkFFdEIsT0FBTyxHQUFJLFVBQWtCLENBQUM7b0JBQzlCLFVBQVUsR0FBRyxJQUFJLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUMvQjtnQkFDRCxJQUFJLFNBQVMsS0FBSyxLQUFLLEVBQUU7b0JBQ3JCLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDekQsSUFBSSxHQUFHLEVBQUU7d0JBQ0wsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUM7d0JBQzNCLElBQUksTUFBTSxLQUFLLEVBQUUsRUFBRTs0QkFDZixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzRCQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQzs0QkFDcEIsSUFBSSxJQUFJLElBQUksTUFBTSxFQUFFO2dDQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDOzZCQUN2Qjt5QkFDSjtxQkFDSjtpQkFDSjs7Z0JBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQzlEO1NBQ0osQ0FBQztRQUVGLElBQUksS0FBSyxFQUFFO1lBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzVEO0tBQ0o7Ozs7O0lBTVMsYUFBYTtRQUNuQixNQUFNLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLENBQUM7S0FDL0M7Ozs7Ozs7OztJQVVNLE9BQU8sQ0FBQyxPQUFvQztRQUMvQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDckIsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7S0FDL0I7Ozs7O0lBTVMsVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO0tBQ2hDOzs7Ozs7O0lBU0QsSUFBSSxFQUFFO1FBQ0YsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDO0tBQ2hDOzs7OztJQU1ELElBQUksTUFBTTtRQUNOLE1BQU0sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzVDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDcEMsT0FBTyxDQUFDLFlBQVksSUFBSSxZQUFZLEtBQUssWUFBWSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsS0FBSyxDQUFDO0tBQy9GOzs7OztJQU1ELElBQUksTUFBTTtRQUNOLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7S0FDN0I7Ozs7O0lBTUQsSUFBSSxRQUFRO1FBQ1IsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztLQUMxQzs7Ozs7SUFNRCxJQUFjLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDO0tBQ3RDOzs7OztJQU1ELElBQWMsVUFBVSxDQUFDLEdBQXNDO1FBQzNELElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO0tBQ3JDOzs7OztJQU1ELElBQWMsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztLQUM3Qzs7Ozs7SUFNRCxJQUFjLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDO0tBQ3JDOzs7OztJQU1ELElBQWMsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0tBQzlCOzs7OztJQU1ELElBQWMsb0JBQW9CO1FBQzlCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFlBQVksQ0FBQztLQUN6Qzs7Ozs7SUFNRCxJQUFjLGlCQUFpQjtRQUMzQixNQUFNLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3RFLE1BQU0sSUFBSSxHQUE2QyxFQUFFLENBQUM7UUFFMUQsUUFBUSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLFdBQVcsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQztRQUN2RCxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztRQUVqQyxPQUFPLElBQUksQ0FBQztLQUNmOzs7OztJQU1ELElBQWMsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO0tBQ2xEOzs7OztJQU1ELElBQWMsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0tBQzdDOzs7OztJQU1ELElBQWMsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLENBQUM7S0FDeEM7Ozs7Ozs7Ozs7O0lBYU0sR0FBRyxDQUFDLElBQWlDO1FBQ3hDLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNkLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO1FBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QjtRQUVELE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sR0FBRyxHQUFJLElBQXFDLENBQUMsSUFBSSxDQUFDO1FBRXhELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBdUIsQ0FBQztLQUN2RTs7Ozs7Ozs7O0lBVU0sR0FBRyxDQUFDLElBQWlDO1FBQ3hDLE9BQU8sSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDakM7Ozs7O0lBTU0sTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDNUQ7Ozs7Ozs7SUFRTSxLQUFLO1FBQ1IsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDdkMsT0FBTyxJQUFLLFdBQWlDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztLQUNwRjs7Ozs7Ozs7O0lBVU0sSUFBSSxDQUFDLE9BQStDO1FBQ3ZELE1BQU0sSUFBSSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDM0IsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDakMsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFFakUsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUN6QixJQUFJLE9BQU8sRUFBRTtnQkFDVCxPQUFPLElBQUksQ0FBQzthQUNmO1lBQ0QsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLDZCQUE2QixFQUFFLHlDQUF5QyxDQUFDLENBQUM7U0FDMUc7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQzs7UUFHbEcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQ3RELElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1NBQ25EO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNSLElBQW1CLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ25FO1FBRUQsT0FBTyxJQUFJLENBQUM7S0FDZjtJQXlCTSxNQUFNLENBQUMsR0FBRyxJQUFlO1FBQzVCLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLEVBQUU7WUFDMUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUM7WUFDdkMsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDUixJQUFtQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNyRTtTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7Ozs7Ozs7SUFZTSxFQUFFLENBQUMsS0FBYTtRQUNuQixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM3QztJQWNNLEtBQUssQ0FBQyxLQUFjO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDNUIsSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ2YsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckI7YUFBTTtZQUNILE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDbEM7S0FDSjtJQWNNLElBQUksQ0FBQyxLQUFjO1FBQ3RCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDNUIsSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ2YsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN0QzthQUFNO1lBQ0gsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO1NBQ3BDO0tBQ0o7Ozs7Ozs7OztJQVdTLEtBQUssQ0FBQyxRQUE0QixFQUFFLE9BQThCO1FBQ3hFLE9BQU8sUUFBb0IsQ0FBQztLQUMvQjs7Ozs7Ozs7Ozs7SUFZUyxNQUFNLElBQUksQ0FBQyxPQUFrRDtRQUNuRSxNQUFNLEtBQUssR0FBRyxNQUFNLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBbUIsRUFBRSxPQUFPLENBQWEsQ0FBQztRQUN6RixPQUFPO1lBQ0gsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ25CLEtBQUs7WUFDTCxPQUFPO1NBQzJCLENBQUM7S0FDMUM7Ozs7Ozs7OztJQVVNLE1BQU0sS0FBSyxDQUFDLE9BQThDO1FBQzdELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRW5GLElBQUk7WUFDQSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztZQUMzRCxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztZQUN2QyxNQUFNLFFBQVEsSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLENBQUM7WUFFakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQXVDO2dCQUNwRCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2YsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzNDLENBQUM7WUFFRixJQUFJLE9BQU8sRUFBRTtnQkFDVCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7YUFDckI7WUFFRCxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUssRUFBRTtnQkFDcEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzthQUMzQztZQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFM0QsSUFBSSxRQUFRLEVBQUU7Z0JBQ1YsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3pEO1lBRUEsSUFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQWtCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3RFLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNQLElBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBa0IsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0UsTUFBTSxDQUFDLENBQUM7U0FDWDtLQUNKOzs7Ozs7Ozs7SUFVTSxPQUFPLENBQUMsT0FBa0M7UUFDN0MsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUMzQjtJQThETSxHQUFHLENBQUMsS0FBeUQsRUFBRSxPQUE4QjtRQUNoRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNkLE9BQU87U0FDVjtRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQW9DLENBQUM7UUFDbkgsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQy9DLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDNUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxNQUFNLEtBQUssR0FBb0MsUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUksS0FBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVoRyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxTQUFTO1lBQ2xCLElBQUksSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFDbkIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRTtvQkFDMUIsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDO2lCQUN2QjtnQkFDRCxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUU7b0JBQ2YsU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7b0JBQzFCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUM7aUJBQzFDO2dCQUNELE9BQU8sU0FBUyxDQUFDO2FBQ3BCO1NBQ0osRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFWixNQUFNLEdBQUcsR0FBa0IsRUFBRSxDQUFDO1FBQzlCLE1BQU0sS0FBSyxHQUFnQixFQUFFLENBQUM7UUFDOUIsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFDO1FBQzlCLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBRW5DLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRW5ELElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQztRQUNqQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksRUFBRSxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDOztRQVMvRSxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFOztZQUVyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBaUIsQ0FBQztZQUNoRCxJQUFJLFFBQVEsRUFBRTtnQkFDVixJQUFJLEtBQUssSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUM1QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztvQkFDakQsSUFBSSxLQUFLLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTt3QkFDckMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUN2QztvQkFFRCxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUU7d0JBQ3BDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUN2Qzt5QkFBTTt3QkFDSCxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztxQkFDbEM7b0JBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFrQixDQUFDLENBQUM7b0JBQ2pDLElBQUksUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFO3dCQUNuQixJQUFJLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDO3FCQUN6RTtpQkFDSjtnQkFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDekIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDdEI7Z0JBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQzthQUN2Qjs7aUJBR0ksSUFBSSxHQUFHLEVBQUU7Z0JBQ1YsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELElBQUksS0FBSyxFQUFFO29CQUNQLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDM0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDbkI7YUFDSjtTQUNKOztRQUdELElBQUksTUFBTSxFQUFFO1lBQ1IsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLEVBQUU7Z0JBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUN0QixRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUN4QjthQUNKO1lBQ0QsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNqQixJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3ZDO1NBQ0o7O1FBR0QsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLENBQUMsUUFBUSxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUM7UUFDM0MsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLE9BQU8sRUFBRTtZQUN2QixZQUFZLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzNGLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzlCO2FBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ3JCLElBQUksUUFBUSxFQUFFO2dCQUNWLElBQUksR0FBRyxJQUFJLENBQUM7YUFDZjtZQUNELFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztTQUM3RDs7UUFHRCxJQUFJLElBQUksRUFBRTtZQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUMvQjs7UUFHRCxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1QsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDdEMsSUFBSSxJQUFJLElBQUksRUFBRSxFQUFFO29CQUNaLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDdkI7Z0JBQ0QsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxZQUFZLFdBQVcsQ0FBQyxFQUFFO29CQUNqRCxLQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNoRTtxQkFBTTtvQkFDRixJQUFtQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ3pFO2FBQ0o7WUFDRCxJQUFJLElBQUksSUFBSSxZQUFZLEVBQUU7Z0JBQ3JCLElBQW1CLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ25FO1lBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDbkQsSUFBSSxDQUFDLE9BQU8sR0FBRztvQkFDWCxLQUFLLEVBQUUsS0FBSztvQkFDWixPQUFPLEVBQUUsUUFBUTtvQkFDakIsTUFBTSxFQUFFLE9BQU87aUJBQ2xCLENBQUM7Z0JBQ0QsSUFBbUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDckU7U0FDSjs7UUFHRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFhLENBQUM7O1FBR3hELE9BQU8sUUFBUSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO0tBQ25FOzs7Ozs7Ozs7Ozs7SUFhTSxLQUFLLENBQUMsS0FBZ0MsRUFBRSxPQUFvQztRQUMvRSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQXlELENBQUM7UUFDaEcsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNwQyxLQUFLLE1BQU0sS0FBSyxJQUFJLEtBQUssRUFBRTtZQUN2QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNqQztRQUVELElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzlCLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUVuQyxNQUFNLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVuRixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNiLElBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3BFO1FBRUQsT0FBTyxNQUFNLENBQUM7S0FDakI7SUE0Qk0sR0FBRyxDQUFDLEtBQXdELEVBQUUsT0FBOEI7UUFDL0YsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQXNCLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztLQUNsRztJQTRCTSxNQUFNLENBQUMsS0FBd0QsRUFBRSxPQUFvQztRQUN4RyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQW9DLENBQUM7UUFDM0UsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxLQUFLLEdBQUcsUUFBUSxHQUFHLENBQUMsS0FBZSxDQUFDLEdBQUksS0FBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNqRCxJQUFtQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNyRTtRQUNELE9BQU8sUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7S0FDMUM7Ozs7Ozs7Ozs7OztJQWFNLElBQUksQ0FBQyxJQUEwQixFQUFFLE9BQThCO1FBQ2xFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDcEMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ3ZFOzs7Ozs7Ozs7SUFVTSxHQUFHLENBQUMsT0FBcUI7UUFDNUIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNwQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDeEQ7Ozs7Ozs7Ozs7OztJQWFNLE9BQU8sQ0FBQyxJQUEwQixFQUFFLE9BQThCO1FBQ3JFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQzVEOzs7Ozs7Ozs7SUFVTSxLQUFLLENBQUMsT0FBcUI7UUFDOUIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNwQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ3pDOzs7Ozs7Ozs7Ozs7SUFhTSxNQUFNLENBQUMsS0FBYSxFQUFFLE9BQTBCO1FBQ25ELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1FBQy9CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLEVBQUUsT0FBc0IsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDUCxPQUFPLFNBQVMsQ0FBQztTQUNwQjtRQUVELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBQy9DLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDM0I7UUFFRCxJQUFJLEtBQUssRUFBRTtZQUNQLEtBQUssQ0FBQztnQkFDRixJQUFJO29CQUNBLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ3JDLElBQUksSUFBSSxFQUFFO3dCQUNOLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO3FCQUMzQjtpQkFDSjtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDUCxJQUFtQixDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQWtCLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUNqRjthQUNKLEdBQUcsQ0FBQztTQUNSO1FBRUQsT0FBTyxJQUFJLENBQUM7S0FDZjs7SUFHTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQWtDLEVBQUUsT0FBbUM7UUFDM0YsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDaEMsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNDLElBQUksV0FBVyxFQUFFO1lBQ2IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3RELE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQWdDLENBQUM7WUFDMUUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM1QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2hDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDcEIsSUFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQWMsRUFBRSxJQUFrQixFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDM0YsT0FBTyxTQUFTLENBQUM7aUJBQ3BCO2FBQ0o7WUFDRCxPQUFPLEtBQWUsQ0FBQztTQUMxQjs7UUFHRCxPQUFPLEtBQWUsQ0FBQztLQUMxQjs7SUFHTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQWdCLEVBQUUsT0FBNkI7UUFDbkUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFvQyxDQUFDO1FBQzNFLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztRQUM3QixLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRTtZQUN0QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLElBQUksQ0FBQyxLQUFLLEVBQUU7Z0JBQ1IsU0FBUzthQUNaO1lBRUQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNwQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDOztZQUd2QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ25CLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssWUFBWSxXQUFXLENBQUMsRUFBRTtvQkFDakQsS0FBZSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDbkU7cUJBQU07b0JBQ0YsSUFBbUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUM1RTthQUNKO1lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDeEM7UUFDRCxPQUFPLE9BQU8sQ0FBQztLQUNsQjs7SUFHTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQWE7UUFDakMsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEtBQXNDLENBQUM7UUFDNUQsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDekI7UUFDRCxJQUFJLElBQUksSUFBSSxFQUFFLEVBQUU7WUFDWixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN2QjtRQUNELElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssWUFBWSxjQUFjLENBQUMsRUFBRTtZQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQXFCLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1NBQ2xFO0tBQ0o7O0lBR08sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQWEsRUFBRSxPQUFPLEdBQUcsS0FBSztRQUNyRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsS0FBc0MsQ0FBQztRQUM1RCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3JCO1FBQ0QsSUFBSSxJQUFJLElBQUksRUFBRSxFQUFFO1lBQ1osSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNuQjtRQUNELElBQUksQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssWUFBWSxjQUFjLENBQUMsQ0FBQyxFQUFFO1lBQ25FLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBcUIsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7U0FDdkU7S0FDSjs7Ozs7OztJQVNELENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNiLE1BQU0sUUFBUSxHQUFHO1lBQ2IsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ2pCLE9BQU8sRUFBRSxDQUFDO1lBQ1YsSUFBSTtnQkFDQSxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ2pDLE9BQU87d0JBQ0gsSUFBSSxFQUFFLEtBQUs7d0JBQ1gsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3FCQUNuQyxDQUFDO2lCQUNMO3FCQUFNO29CQUNILE9BQU87d0JBQ0gsSUFBSSxFQUFFLElBQUk7d0JBQ1YsS0FBSyxFQUFFLFNBQVU7cUJBQ3BCLENBQUM7aUJBQ0w7YUFDSjtTQUNKLENBQUM7UUFDRixPQUFPLFFBQTRCLENBQUM7S0FDdkM7Ozs7O0lBTUQsT0FBTztRQUNILE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxHQUFXLEVBQUUsS0FBYSxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDdEY7Ozs7O0lBTUQsSUFBSTtRQUNBLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxHQUFXLEtBQUssR0FBRyxDQUFDLENBQUM7S0FDOUQ7Ozs7O0lBTUQsTUFBTTtRQUNGLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxHQUFXLEVBQUUsS0FBYSxLQUFLLEtBQUssQ0FBQyxDQUFDO0tBQy9FOztJQUdPLENBQUMsdUJBQXVCLENBQUMsQ0FBSSxjQUFpRDtRQUNsRixNQUFNLE9BQU8sR0FBRztZQUNaLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNqQixPQUFPLEVBQUUsQ0FBQztTQUNiLENBQUM7UUFFRixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQVc7WUFDeEIsT0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUMvRSxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQXdCO1lBQ2xDLElBQUk7Z0JBQ0EsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFDaEMsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQy9CLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbEIsT0FBTzt3QkFDSCxJQUFJLEVBQUUsS0FBSzt3QkFDWCxLQUFLLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3FCQUNqRSxDQUFDO2lCQUNMO3FCQUFNO29CQUNILE9BQU87d0JBQ0gsSUFBSSxFQUFFLElBQUk7d0JBQ1YsS0FBSyxFQUFFLFNBQVU7cUJBQ3BCLENBQUM7aUJBQ0w7YUFDSjtZQUNELENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztnQkFDYixPQUFPLElBQUksQ0FBQzthQUNmO1NBQ0osQ0FBQztRQUVGLE9BQU8sUUFBUSxDQUFDO0tBQ25CO0NBQ0o7QUFFRDtBQUNBLG9CQUFvQixDQUFDLFVBQW1CLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQzs7QUM5eEM3RDtBQUNBLFNBQVMsT0FBTyxDQUFtQixVQUFzQjtJQUNyRCxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUU7UUFDckIsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLGdDQUFnQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7S0FDekc7SUFDRCxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDckMsQ0FBQztBQUVEO0FBQ0EsZUFBZSxJQUFJLENBQ2YsVUFBeUIsRUFDekIsT0FBb0MsRUFDcEMsU0FBNEY7SUFFNUYsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFJLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekQsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDakMsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQztBQUVEO0FBQ0EsU0FBUyxHQUFHLENBQUMsT0FBaUI7SUFDMUIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUM7QUFFRDtBQUNBLFNBQVMsZUFBZSxDQUNwQixJQUFrQyxFQUNsQyxPQUErQixFQUMvQixTQUFpQixFQUNqQixPQUFlLEVBQ2YsRUFBVztJQUVYLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBQ2pDLE9BQU87UUFDSCxJQUFJO1FBQ0osSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUUsT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsU0FBUztRQUM3RCxVQUFVLEVBQUUsT0FBTyxHQUFHLEVBQUUsR0FBRyxTQUFTO0tBQ3JCLENBQUM7QUFDeEIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7OztBQWNPLGVBQWUsZUFBZSxDQUNqQyxVQUErQixFQUMvQixPQUF5QjtJQUV6QixNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN0QyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxVQUFVLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEcsT0FBTyxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCTyxlQUFlLGdCQUFnQixDQUNsQyxVQUErQixFQUMvQixHQUFRLEVBQ1IsT0FBeUI7SUFFekIsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUNwQyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxXQUFXLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3RHLE9BQU8sZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3hGLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQk8sZUFBZSxnQkFBZ0IsQ0FDbEMsVUFBK0IsRUFDL0IsS0FBYSxFQUNiLEdBQVEsRUFDUixPQUF5QjtJQUV6QixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssS0FBSyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3RyxPQUFPLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNoRixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JPLGVBQWUsaUJBQWlCLENBQ25DLFVBQStCLEVBQy9CLEtBQWEsRUFDYixNQUFnQixFQUNoQixPQUF5QjtJQUV6QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxLQUFLLFlBQVksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2pILE9BQU8sZUFBZSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3hGLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQk8sZUFBZSxnQkFBZ0IsQ0FDbEMsVUFBK0IsRUFDL0IsTUFBZ0IsRUFDaEIsT0FBeUI7SUFFekIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxLQUFLLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDekcsT0FBTyxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDbEU7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2NvbGxlY3Rpb24vIn0=
