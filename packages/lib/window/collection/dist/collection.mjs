/*!
 * @cdp/collection 0.9.5
 *   generic collection scheme
 */

import { getLanguage } from '@cdp/i18n';
import { unique, computeDate, isFunction, sort, shuffle, luid, isString, isNil, isArray, setMixClassAttribute } from '@cdp/core-utils';
import { checkCanceled } from '@cdp/promise';
import { ObservableArray } from '@cdp/observable';
import { makeResult, RESULT_CODE, FAILED } from '@cdp/result';
import { EventSource, EventBroker, EventPublisher } from '@cdp/events';
import { isModel } from '@cdp/model';

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
        RESULT_CODE[RESULT_CODE["MVC_COLLECTION_DECLARE"] = 9007199254740991] = "MVC_COLLECTION_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_ACCESS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 70 /* COLLECTION */ + 1, 'invalid access.')] = "ERROR_MVC_INVALID_ACCESS";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_INVALID_COMPARATORS"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 70 /* COLLECTION */ + 2, 'invalid comparators.')] = "ERROR_MVC_INVALID_COMPARATORS";
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
    if (index < 0 || target.length < index || Math.trunc(index) !== index) {
        throw makeResult(RESULT_CODE.NOT_SUPPORTED, `insertArray(), index is invalid. index: ${index}`);
    }
    else if (null == orders || orders.length <= 0) {
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
    if (null == orders || orders.length <= 0) {
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
    return (item) => -1 !== String(item[prop]).toLocaleLowerCase().indexOf(value.toLocaleLowerCase());
}
/** @internal DynamicPackageOperator.NOT_LIKE */
function notLike(prop, value) {
    return (item) => -1 === String(item[prop]).toLocaleLowerCase().indexOf(value.toLocaleLowerCase());
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
    let result = isFunction(filter) ? items.filter(filter) : items.slice();
    for (const comparator of comparators) {
        if (isFunction(comparator)) {
            result = sort(result, comparator);
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
        await checkCanceled(token);
        if (index < 0 || targets.length <= index || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        }
        else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${limit}`);
        }
        const opts = Object.assign(options, { index });
        const result = targets.slice(index, (null != limit) ? index + limit : undefined);
        const retval = {
            total: targets.length,
            items: result,
            options: { ...opts },
        };
        // 進捗通知
        if (isFunction(progress)) {
            progress({ ...retval });
        }
        if (auto && null != limit) {
            if (targets.length <= index + limit) {
                // 自動継続指定時には最後にすべての item を返却
                retval.items = targets;
            }
            else {
                index += result.length;
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
        await checkCanceled(token);
        if (index < 0 || trunc(index) !== index) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid index: ${index}`);
        }
        else if (null != limit && (limit <= 0 || trunc(limit) !== limit)) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_ACCESS, `invalid limit: ${limit}`);
        }
        const opts = Object.assign(options, { index });
        const result = await provider(opts);
        targets.push(...result.items);
        const retval = {
            total: result.total,
            items: result.items,
            options: Object.assign({}, opts, result.options),
        };
        // 進捗通知
        if (isFunction(progress)) {
            progress({ ...retval });
        }
        if (auto && null != limit) {
            if (result.total <= index + limit) {
                // 自動継続指定時には最後にすべての item を返却
                retval.items = targets;
            }
            else {
                index += result.items.length;
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
    const { sortKeys: keys, comparators: comps } = options || {};
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
const _setOptions = { add: true, remove: true, merge: true };
const _addOptions = { add: true, remove: false };
//__________________________________________________________________________________________________//
/**
 * @en Base class definition for object collection.
 * @ja オブジェクトの集合を扱う基底クラス定義
 *
 * TODO:
 */
class Collection extends EventSource {
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
        const opts = Object.assign({}, options);
        const { modelOptions, queryOptions } = opts;
        this[_properties] = {
            cid: luid('collection:', 8),
            defaultQueryOptions: queryOptions,
            queryInfo: {},
            defaultModelOptions: modelOptions,
            byId: new Map(),
            store: [],
        };
        this._queryInfo = this.initQueryInfo();
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
    ///////////////////////////////////////////////////////////////////////
    // accessor: public properties
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
        return this[_properties].store;
    }
    /**
     * @en number of models.
     * @ja 内包するモデル数
     */
    get length() {
        return this[_properties].store.length;
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
    ///////////////////////////////////////////////////////////////////////
    // accessor: protected query-info
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
     * @en Initialize [[CollectionQueryInfo]].
     * @ja [[CollectionQueryInfo]] の初期化
     *
     * @override
     */
    initQueryInfo() {
        return ensureSortOptions(this[_properties].defaultQueryOptions);
    }
    ///////////////////////////////////////////////////////////////////////
    // operation: general
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
    ///////////////////////////////////////////////////////////////////////
    // operations: collection setup
    /**
     * @en Access to sort comparators.
     * @ja ソート用比較関数へのアクセス
     */
    get _comparators() {
        return this[_properties].queryInfo.comparators;
    }
    /**
     * @en Force a collection to re-sort itself.
     * @ja コレクション要素の再ソート
     */
    sort(options) {
        const opts = options || {};
        const { sortKeys, comparators: comps } = ensureSortOptions(opts);
        const comparators = 0 < comps.length ? comps : this._comparators;
        if (comparators.length <= 0) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_COMPARATORS, 'Cannot sort a set without a comparator.');
        }
        this[_properties].store = searchItems(this[_properties].store, null, ...comparators);
        // update queryInfo
        this[_properties].queryInfo.comparators = comparators;
        if (0 < sortKeys.length) {
            this[_properties].queryInfo.sortKeys = sortKeys;
        }
        if (!opts.silent) {
            this.trigger('@sort', this, opts);
        }
        return this;
    }
    set(seeds, options) {
        if (isNil(seeds)) {
            return;
        }
        const opts = Object.assign({}, _setOptions, options);
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
    /** @internal model preparation */
    [_prepareModel](attrs, options) {
        if (isCollectionModel(attrs, this)) {
            return attrs;
        }
        const constructor = modelConstructor(this);
        const { defaultModelOptions } = this[_properties];
        if (constructor) {
            const opts = Object.assign({}, defaultModelOptions, options);
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
    /** @ineternal Internal method called by both remove and set. */
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
}
// mixin による `instanceof` は無効に設定
setMixClassAttribute(Collection, 'instanceOf', null);
/*
 ☆ id
 ☆ models/items
 ☆ length
 ★ release()
 ★ fetch()

 ★ - ListEditable<T> をどうするか?

 ★ url: string | (() => string);

 ★ without(...values: TModel[]): TModel[];

 ☆ add(model: {}|TModel, options?: AddOptions): TModel;
 ☆ add(models: ({}|TModel)[], options?: AddOptions): TModel[];
 ★ at(index: number): TModel;
 ☆ get(id: number | string | Model): TModel;
 ★ has(key: number | string | Model): boolean;
 ★ clone(): this;
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

 // mixins from underscore (基本やらない)

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
 ★ filter(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
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

export { ArrayCursor, Collection, DynamicCondition, appendArray, clearArray, conditionalFix, convertSortKeys, defaultCollatorProvider, getBooleanComparator, getDateComparator, getGenericComparator, getNumberComparator, getStringComparator, insertArray, queryItems, removeArray, reorderArray, searchItems, toComparator };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJ1dGlscy9jb21wYXJhdG9yLnRzIiwidXRpbHMvYXJyYXktY3Vyc29yLnRzIiwidXRpbHMvYXJyYXktZWRpdG9yLnRzIiwicXVlcnkvZHluYW1pYy1maWx0ZXJzLnRzIiwicXVlcnkvZHluYW1pYy1jb25kaXRpb24udHMiLCJxdWVyeS9xdWVyeS50cyIsImJhc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHNcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBDT0xMRUNUSU9OID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMTAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by16YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfQ09MTEVDVElPTl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAxLCAnaW52YWxpZCBhY2Nlc3MuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0NPTVBBUkFUT1JTID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDIsICdpbnZhbGlkIGNvbXBhcmF0b3JzLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgW1tDb2xsYXRvclByb3ZpZGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBbW0NvbGxhdG9yUHJvdmlkZXJdXSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRDb2xsYXRvclByb3ZpZGVyKG5ld1Byb3ZpZGVyPzogQ29sbGF0b3JQcm92aWRlcik6IENvbGxhdG9yUHJvdmlkZXIge1xuICAgIGlmIChudWxsID09IG5ld1Byb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiBfY29sbGF0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvdmlkZXIgPSBfY29sbGF0b3I7XG4gICAgICAgIF9jb2xsYXRvciA9IG5ld1Byb3ZpZGVyO1xuICAgICAgICByZXR1cm4gb2xkUHJvdmlkZXI7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBHZXQgc3RyaW5nIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5paH5a2X5YiX5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHJpbmdDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBULCByaHM6IFQpOiBudW1iZXIgPT4ge1xuICAgICAgICAvLyB1bmRlZmluZWQg44GvICcnIOOBqOWQjOetieOBq+aJseOBhlxuICAgICAgICBjb25zdCBsaHNQcm9wID0gKG51bGwgIT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkgPyBsaHNbcHJvcCBhcyBzdHJpbmddIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcCBhcyBzdHJpbmddKSA/IHJoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgcmV0dXJuIG9yZGVyICogX2NvbGxhdG9yKCkuY29tcGFyZShsaHNQcm9wLCByaHNQcm9wKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZGF0ZSBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaXpeaZguavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IGxoc0RhdGUgPSBsaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBjb25zdCByaHNEYXRlID0gcmhzW3Byb3AgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcCBhcyBzdHJpbmddID09PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAobGhzW3Byb3AgYXMgc3RyaW5nXSA8IHJoc1twcm9wIGFzIHN0cmluZ10gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSBbW1NvcnRLZXldXS5cbiAqIEBqYSBbW1NvcnRLZXldXSDjgpIgY29tcGFyYXRvciDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5OiBTb3J0S2V5PEs+KTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICBjb25zdCBwcm9wTmFtZSA9IHNvcnRLZXkubmFtZTtcbiAgICBzd2l0Y2ggKHNvcnRLZXkudHlwZSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSz4ocHJvcE5hbWUsIHNvcnRLZXkub3JkZXIpO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiBnZXRCb29sZWFuQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gZ2V0TnVtYmVyQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgcmV0dXJuIGdldERhdGVDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgYXJyYXkgZnJvbSBbW1NvcnRLZXldXSBhcnJheS5cbiAqIEBqYSBbW1NvcnRLZXldXSDphY3liJfjgpIgY29tcGFyYXRvciDphY3liJfjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTb3J0S2V5czxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5czogU29ydEtleTxLPltdKTogU29ydENhbGxiYWNrPFQ+W10ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VD5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc29ydEtleSBvZiBzb3J0S2V5cykge1xuICAgICAgICBjb21wYXJhdG9ycy5wdXNoKHRvQ29tcGFyYXRvcihzb3J0S2V5KSk7XG4gICAgfVxuICAgIHJldHVybiBjb21wYXJhdG9ycztcbn1cbiIsIi8qKlxuICogQGVuIEN1cnNvciBwb3NpdGlvbiBjb25zdGFudC5cbiAqIEBqYSDjgqvjg7zjgr3jg6vkvY3nva7lrprmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3Vyc29yUG9zIHtcbiAgICBPVVRfT0ZfUkFOR0UgICAgPSAtMSxcbiAgICBDVVJSRU5UICAgICAgICAgPSAtMixcbn1cblxuLyoqXG4gKiBAZW4gU2VlayBleHByZXNzaW9uIGZ1bmN0aW9uIHR5cGUuXG4gKiBAamEg44K344O844Kv5byP6Zai5pWw5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIFNlZWtFeHA8VD4gPSAodmFsdWU6IFQsIGluZGV4PzogbnVtYmVyLCBvYmo/OiBUW10pID0+IGJvb2xlYW47XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBwcm92aWRlcyBjdXJzb3IgaW50ZXJmYWNlIGZvciBBcnJheS4gPGJyPlxuICogICAgIEl0IGlzIGRpZmZlcmVudCBmcm9tIEl0ZXJhdG9yIGludGVyZmFjZSBvZiBlczIwMTUsIGFuZCB0aGF0IHByb3ZpZGVzIGludGVyZmFjZSB3aGljaCBpcyBzaW1pbGFyIHRvIERCIHJlY29yZHNldCdzIG9uZS5cbiAqIEBqYSBBcnJheSDnlKjjgqvjg7zjgr3jg6sgSS9GIOOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgZXMyMDE1IOOBriBJdGVyYXRvciBJL0Yg44Go44Gv55Ww44Gq44KK44CBREIgcmVjb3Jkc2V0IOOCquODluOCuOOCp+OCr+ODiOODqeOCpOOCr+OBqui1sOafuyBJL0Yg44KS5o+Q5L6b44GZ44KLXG4gKi9cbmV4cG9ydCBjbGFzcyBBcnJheUN1cnNvcjxUID0gYW55PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKiBAaW50ZXJuYWwg5a++6LGh44Gu6YWN5YiXICAqL1xuICAgIHByaXZhdGUgX2FycmF5OiBUW107XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7lhYjpoK3jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAgKi9cbiAgICBwcml2YXRlIF9ib2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7mnKvlsL7jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2VvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOePvuWcqOOBriBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IDBcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogMFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFycmF5OiBUW10sIGluaXRpYWxJbmRleCA9IDApIHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHRhcmdldCBhcnJheS5cbiAgICAgKiBAamEg5a++6LGh44Gu5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheS4gZGVmYXVsdDogZW1wdHkgYXJyYXkuXG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrpouICAgZGVmYXVsdDog56m66YWN5YiXXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KGFycmF5OiBUW10gPSBbXSwgaW5pdGlhbEluZGV4OiBudW1iZXIgPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBjdXJyZW50IGVsZW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBjdXJyZW50KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXlbdGhpcy5faW5kZXhdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo5oyH44GX56S644GX44Gm44GE44KLIGluZGV4IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0YXJnZXQgYXJyYXkgbGVuZ3RoLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjga7opoHntKDmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEJPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruWFiOmgreOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0JPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgRU9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5pyr5bC+44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRU9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcmF3IGFycmF5IGluc3RhbmNlLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgYXJyYXkoKTogVFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGN1cnNvciBvcGVyYXRpb246XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBmaXJzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUZpcnN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbGFzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUxhc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5Lmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBuZXh0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuasoeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTmV4dCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9ib2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBwcmV2aW91cyBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLliY3jgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZVByZXZpb3VzKCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2VvZikge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4LS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNlZWsgYnkgcGFzc2VkIGNyaXRlcmlhLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBvcGVyYXRpb24gZmFpbGVkLCB0aGUgY3Vyc29yIHBvc2l0aW9uIHNldCB0byBFT0YuXG4gICAgICogQGphIOaMh+WumuadoeS7tuOBp+OCt+ODvOOCryA8YnI+XG4gICAgICogICAgIOOCt+ODvOOCr+OBq+WkseaVl+OBl+OBn+WgtOWQiOOBryBFT0Yg54q25oWL44Gr44Gq44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY3JpdGVyaWFcbiAgICAgKiAgLSBgZW5gIGluZGV4IG9yIHNlZWsgZXhwcmVzc2lvblxuICAgICAqICAtIGBqYWAgaW5kZXggLyDmnaHku7blvI/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Vlayhjcml0ZXJpYTogbnVtYmVyIHwgU2Vla0V4cDxUPik6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKCdudW1iZXInID09PSB0eXBlb2YgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gY3JpdGVyaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5LmZpbmRJbmRleChjcml0ZXJpYSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiDjgqvjg7zjgr3jg6vjgYzmnInlirnjgarnr4Tlm7LjgpLnpLrjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHJldHVybnMgdHJ1ZTog5pyJ5Yq5IC8gZmFsc2U6IOeEoeWKuVxuICAgICAqL1xuICAgIHByaXZhdGUgdmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAoMCA8PSB0aGlzLl9pbmRleCAmJiB0aGlzLl9pbmRleCA8IHRoaXMuX2FycmF5Lmxlbmd0aCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5pcXVlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsVG9rZW4sXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IE9ic2VydmFibGVBcnJheSwgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5cbi8qKiBAaW50ZXJuYWwgd2FpdCBmb3IgY2hhbmdlIGRldGVjdGlvbiAqL1xuZnVuY3Rpb24gbWFrZVByb21pc2U8VD4oZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD4sIHJlbWFwPzogVFtdKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBlZGl0b3Iub2ZmKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgICAgIHJlbWFwLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgcmVtYXAucHVzaCguLi5lZGl0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZWNvcmRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLm9uKGNhbGxiYWNrKTtcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFtbT2JzZXJ2YWJsZUFycmF5XV0gaWYgbmVlZGVkLiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0RWRpdENvbnRleHQ8VD4oXG4gICAgdGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sXG4gICAgdG9rZW4/OiBDYW5jZWxUb2tlblxuKTogUHJvbWlzZTx7IGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+OyBwcm9taXNlOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+OyB9PiB8IG5ldmVyIHtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgT2JzZXJ2YWJsZUFycmF5KSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcjogdGFyZ2V0LFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UodGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCBlZGl0b3IgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbSh0YXJnZXQpO1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3IsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZShlZGl0b3IsIHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCAndGFyZ2V0IGlzIG5vdCBBcnJheSBvciBPYnNlcnZhYmxlQXJyYXkuJyk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5wdXNoKC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgYXJyYXkuXG4gKiBAamEg5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCBNYXRoLnRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgaW5zZXJ0QXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5zcGxpY2UoaW5kZXgsIDAsIC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVvcmRlciBhcnJheSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSDpoIXnm67jga7kvY3nva7jgpLlpInmm7RcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIGVkaXQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCBNYXRoLnRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgaW5zZXJ0QXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOS9nOalremFjeWIl+OBp+e3qOmbhlxuICAgIGxldCB3b3JrOiAoVCB8IG51bGwpW10gPSBBcnJheS5mcm9tKGVkaXRvcik7XG4gICAge1xuICAgICAgICBjb25zdCByZW9yZGVyczogVFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgb3JkZXIgb2YgdW5pcXVlKG9yZGVycykpIHtcbiAgICAgICAgICAgIHJlb3JkZXJzLnB1c2goZWRpdG9yW29yZGVyXSk7XG4gICAgICAgICAgICB3b3JrW29yZGVyXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB3b3JrLnNwbGljZShpbmRleCwgMCwgLi4ucmVvcmRlcnMpO1xuICAgICAgICB3b3JrID0gd29yay5maWx0ZXIoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g5YCk44KS5pu444GN5oi744GXXG4gICAgZm9yIChjb25zdCBpZHggb2Ygd29yay5rZXlzKCkpIHtcbiAgICAgICAgZWRpdG9yW2lkeF0gPSB3b3JrW2lkeF0gYXMgVDtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVtb3ZlIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmgheebruOBruWJiumZpFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCByZW1vdmVkIG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDpmY3poIbjgr3jg7zjg4hcbiAgICBvcmRlcnMuc29ydCgobGhzLCByaHMpID0+IHtcbiAgICAgICAgcmV0dXJuIChsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICBlZGl0b3Iuc3BsaWNlKG9yZGVyLCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbiIsImltcG9ydCB7IEtleXMsIGNvbXB1dGVEYXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEZpbHRlckNhbGxiYWNrLCBEeW5hbWljQ29tYmluYXRpb24gfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgVmFsdWVUeXBlQUxMPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBzdHJpbmcgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PG51bWJlciB8IERhdGUsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgVmFsdWVUeXBlU3RyaW5nPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxzdHJpbmcsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCB1bmRlZmluZWQ7XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdICE9PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVIgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTUyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3M8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDw9IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IC0xICE9PSBTdHJpbmcoaXRlbVtwcm9wXSkudG9Mb2NhbGVMb3dlckNhc2UoKS5pbmRleE9mKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0xJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RMaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAtMSA9PT0gU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5kZXhPZih2YWx1ZS50b0xvY2FsZUxvd2VyQ2FzZSgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuIGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGVMZXNzTm90RXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IG51bWJlciwgdW5pdDogRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBjb21wdXRlRGF0ZShuZXcgRGF0ZSgpLCAtMSAqIHZhbHVlLCB1bml0KTtcbiAgICAgICAgcmV0dXJuICEoZGF0ZSA8PSAoaXRlbVtwcm9wXSBhcyB1bmtub3duIGFzIERhdGUpKTtcbiAgICB9O1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuUkFOR0UgKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZTxUIGV4dGVuZHMgb2JqZWN0Pihwcm9wOiBrZXlvZiBULCBtaW46IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4sIG1heDogVmFsdWVUeXBlQ29tcGFyYWJsZTxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gY29tYmluYXRpb24oRHluYW1pY0NvbWJpbmF0aW9uLkFORCwgZ3JlYXRlckVxdWFsKHByb3AsIG1pbiksIGxlc3NFcXVhbChwcm9wLCBtYXgpKTtcbn1cblxuLyoqIEBpbnRlcm5hbCDjg5XjgqPjg6vjgr/jga7lkIjmiJAgKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5hdGlvbjxUIGV4dGVuZHMgb2JqZWN0Pih0eXBlOiBEeW5hbWljQ29tYmluYXRpb24sIGxoczogRmlsdGVyQ2FsbGJhY2s8VD4sIHJoczogRmlsdGVyQ2FsbGJhY2s8VD4gfCB1bmRlZmluZWQpOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuICFyaHMgPyBsaHMgOiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLkFORDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgICAgIGNhc2UgRHluYW1pY0NvbWJpbmF0aW9uLk9SOlxuICAgICAgICAgICAgICAgIHJldHVybiBsaHMoaXRlbSkgfHwgcmhzKGl0ZW0pO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gY29tYmluYXRpb246ICR7dHlwZX1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBmYWlsIHNhZmVcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pICYmIHJocyhpdGVtKTtcbiAgICAgICAgfVxuICAgIH07XG59XG4iLCJpbXBvcnQgeyBLZXlzIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNvbnZlcnRTb3J0S2V5cyB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7XG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIFNvcnRLZXksXG4gICAgRHluYW1pY0NvbmRpdGlvblNlZWQsXG4gICAgRHluYW1pY09wZXJhdG9yQ29udGV4dCxcbiAgICBEeW5hbWljTGltaXRDb25kaXRpb24sXG4gICAgRHluYW1pY09wZXJhdG9yLFxuICAgIER5bmFtaWNDb21iaW5hdGlvbixcbn0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFZhbHVlVHlwZUFMTCxcbiAgICBWYWx1ZVR5cGVDb21wYXJhYmxlLFxuICAgIFZhbHVlVHlwZVN0cmluZyxcbiAgICBlcXVhbCxcbiAgICBub3RFcXVhbCxcbiAgICBncmVhdGVyLFxuICAgIGxlc3MsXG4gICAgZ3JlYXRlckVxdWFsLFxuICAgIGxlc3NFcXVhbCxcbiAgICBsaWtlLFxuICAgIG5vdExpa2UsXG4gICAgZGF0ZUxlc3NFcXVhbCxcbiAgICBkYXRlTGVzc05vdEVxdWFsLFxuICAgIHJhbmdlLFxuICAgIGNvbWJpbmF0aW9uLFxufSBmcm9tICcuL2R5bmFtaWMtZmlsdGVycyc7XG5cbi8qKlxuICogQGVuIER5bmFtaWMgcXVlcnkgY29uZGl0aW9uIG1hbmFnZXIgY2xhc3MuXG4gKiBAamEg44OA44Kk44OK44Of44OD44Kv44Kv44Ko44Oq54q25oWL566h55CG44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBEeW5hbWljQ29uZGl0aW9uPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4gPSBLZXlzPFRJdGVtPj4gaW1wbGVtZW50cyBEeW5hbWljQ29uZGl0aW9uU2VlZDxUSXRlbSwgVEtleT4ge1xuXG4gICAgcHJpdmF0ZSBfb3BlcmF0b3JzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdO1xuICAgIHByaXZhdGUgX2NvbWJpbmF0aW9uOiBEeW5hbWljQ29tYmluYXRpb247XG4gICAgcHJpdmF0ZSBfc3VtS2V5czogS2V5czxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9saW1pdD86IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT47XG4gICAgcHJpdmF0ZSBfcmFuZG9tOiBib29sZWFuO1xuICAgIHByaXZhdGUgX3NvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIFtbRHluYW1pY0NvbmRpdGlvblNlZWRdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWVkczogRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+ID0geyBvcGVyYXRvcnM6IFtdIH0pIHtcbiAgICAgICAgY29uc3QgeyBvcGVyYXRvcnMsIGNvbWJpbmF0aW9uLCBzdW1LZXlzLCBsaW1pdCwgcmFuZG9tLCBzb3J0S2V5cyB9ID0gc2VlZHM7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyAgICAgPSBvcGVyYXRvcnM7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uICAgPSBudWxsICE9IGNvbWJpbmF0aW9uID8gY29tYmluYXRpb24gOiBEeW5hbWljQ29tYmluYXRpb24uQU5EO1xuICAgICAgICB0aGlzLl9zdW1LZXlzICAgICAgID0gbnVsbCAhPSBzdW1LZXlzID8gc3VtS2V5cyA6IFtdO1xuICAgICAgICB0aGlzLl9saW1pdCAgICAgICAgID0gbGltaXQ7XG4gICAgICAgIHRoaXMuX3JhbmRvbSAgICAgICAgPSAhIXJhbmRvbTtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgICAgICA9IHNvcnRLZXlzIHx8IFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IER5bmFtaWNDb25kaXRpb25TZWVkXG5cbiAgICBnZXQgb3BlcmF0b3JzKCk6IER5bmFtaWNPcGVyYXRvckNvbnRleHQ8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3BlcmF0b3JzO1xuICAgIH1cblxuICAgIHNldCBvcGVyYXRvcnModmFsdWVzOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdKSB7XG4gICAgICAgIHRoaXMuX29wZXJhdG9ycyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgc3VtS2V5cygpOiAoS2V5czxUSXRlbT4pW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3VtS2V5cztcbiAgICB9XG5cbiAgICBzZXQgc3VtS2V5cyh2YWx1ZXM6IChLZXlzPFRJdGVtPilbXSkge1xuICAgICAgICB0aGlzLl9zdW1LZXlzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIGdldCBjb21iaW5hdGlvbigpOiBEeW5hbWljQ29tYmluYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29tYmluYXRpb247XG4gICAgfVxuXG4gICAgc2V0IGNvbWJpbmF0aW9uKHZhbHVlOiBEeW5hbWljQ29tYmluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29tYmluYXRpb24gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgbGltaXQoKTogRHluYW1pY0xpbWl0Q29uZGl0aW9uPFRJdGVtPiB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9saW1pdDtcbiAgICB9XG5cbiAgICBzZXQgbGltaXQodmFsdWU6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fbGltaXQgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBnZXQgcmFuZG9tKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmFuZG9tO1xuICAgIH1cblxuICAgIHNldCByYW5kb20odmFsdWU6IGJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5fcmFuZG9tID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHNvcnRLZXlzKCk6IFNvcnRLZXk8VEtleT5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3J0S2V5cztcbiAgICB9XG5cbiAgICBzZXQgc29ydEtleXModmFsdWVzOiBTb3J0S2V5PFRLZXk+W10pIHtcbiAgICAgICAgdGhpcy5fc29ydEtleXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIGFjY2Vzc29yOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb21wYXJhdG9yIGZ1bmN0aW9ucy5cbiAgICAgKiBAamEg5q+U6LyD6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGNvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0U29ydEtleXModGhpcy5fc29ydEtleXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc3ludGhlc2lzIGZpbHRlciBmdW5jdGlvbi5cbiAgICAgKiBAamEg5ZCI5oiQ5riI44G/44OV44Kj44Or44K/6Zai5pWw5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IGZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4ge1xuICAgICAgICBsZXQgZmx0cjogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29uZCBvZiB0aGlzLl9vcGVyYXRvcnMpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoY29uZC5vcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkVRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90RXF1YWw8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVBTEw8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVI6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlcjxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1M6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzczxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkdSRUFURVJfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlckVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXNzRXF1YWw8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpa2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLk5PVF9MSUtFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdExpa2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVTdHJpbmc8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc0VxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuREFURV9MRVNTX05PVF9FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTGVzc05vdEVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgbnVtYmVyLCBjb25kLnVuaXQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuUkFOR0U6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiwgY29uZC5yYW5nZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVua25vd24gb3BlcmF0b3I6ICR7Y29uZC5vcGVyYXRvcn1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmx0ciB8fCAoKC8qIGl0ZW0gKi8pID0+IHRydWUpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIHNvcnQsXG4gICAgc2h1ZmZsZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGNoZWNrQ2FuY2VsZWQgYXMgY2MgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIFNvcnRLZXksXG4gICAgU29ydENhbGxiYWNrLFxuICAgIEZpbHRlckNhbGxiYWNrLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkZldGNoUmVzdWx0LFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBEeW5hbWljTGltaXQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMvY29tcGFyYXRvcic7XG5pbXBvcnQgeyBEeW5hbWljQ29uZGl0aW9uIH0gZnJvbSAnLi9keW5hbWljLWNvbmRpdGlvbic7XG5cbmNvbnN0IHsgdHJ1bmMgfSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwg5L2/55So44GZ44KL44OX44Ot44OR44OG44Kj44GM5L+d6Ki844GV44KM44GfIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMgKi9cbmludGVyZmFjZSBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+PiBleHRlbmRzIENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHtcbiAgICBzb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuICAgIGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W107XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBBcHBseSBgZmlsdGVyYCBhbmQgYHNvcnQga2V5YCB0byB0aGUgYGl0ZW1zYCBmcm9tIFtbcXVlcnlJdGVtc11dYCgpYCByZXN1bHQuXG4gKiBAamEgW1txdWVyeUl0ZW1zXV1gKClgIOOBl+OBnyBgaXRlbXNgIOOBq+WvvuOBl+OBpiBgZmlsdGVyYCDjgaggYHNvcnQga2V5YCDjgpLpgannlKhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEl0ZW1zPFRJdGVtPihpdGVtczogVEl0ZW1bXSwgZmlsdGVyPzogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHwgbnVsbCwgLi4uY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXSk6IFRJdGVtW10ge1xuICAgIGxldCByZXN1bHQgPSBpc0Z1bmN0aW9uKGZpbHRlcikgPyBpdGVtcy5maWx0ZXIoZmlsdGVyKSA6IGl0ZW1zLnNsaWNlKCk7XG4gICAgZm9yIChjb25zdCBjb21wYXJhdG9yIG9mIGNvbXBhcmF0b3JzKSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBhcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzb3J0KHJlc3VsdCwgY29tcGFyYXRvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwg44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL5a++6LGh44Gr5a++44GX44GmIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIHF1ZXJ5IOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tQ2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgY2FjaGVkOiBUSXRlbVtdLFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBmaWx0ZXIsXG4gICAgICAgIGNvbXBhcmF0b3JzLFxuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgICAgIG5vU2VhcmNoLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgLy8g44Kt44Oj44OD44K344Ol44Gr5a++44GX44Gm44OV44Kj44Or44K/44Oq44Oz44KwLCDjgr3jg7zjg4jjgpLlrp/ooYxcbiAgICBjb25zdCB0YXJnZXRzID0gbm9TZWFyY2ggPyBjYWNoZWQuc2xpY2UoKSA6IHNlYXJjaEl0ZW1zKGNhY2hlZCwgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldHMubGVuZ3RoIDw9IGluZGV4IHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7IGxpbWl0IH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKG9wdGlvbnMsIHsgaW5kZXggfSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRhcmdldHMuc2xpY2UoaW5kZXgsIChudWxsICE9IGxpbWl0KSA/IGluZGV4ICsgbGltaXQgOiB1bmRlZmluZWQpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zOiByZXN1bHQsXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLm9wdHMgfSBhcyBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtPixcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldHMubGVuZ3RoIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSB0YXJnZXRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSByZXN1bHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgYHByb3ZpZGVyYCDplqLmlbDjgpLkvb/nlKjjgZfjgaYgQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggYHF1ZXJ5YCDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbVByb3ZpZGVyPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+PiB7XG4gICAgY29uc3Qge1xuICAgICAgICBpbmRleDogYmFzZUluZGV4LFxuICAgICAgICBsaW1pdCxcbiAgICAgICAgY2FuY2VsOiB0b2tlbixcbiAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgIGF1dG8sXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCB0YXJnZXRzOiBUSXRlbVtdID0gW107XG5cbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7bGltaXR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcm92aWRlcihvcHRzKTtcblxuICAgICAgICB0YXJnZXRzLnB1c2goLi4ucmVzdWx0Lml0ZW1zKTtcblxuICAgICAgICBjb25zdCByZXR2YWwgPSB7XG4gICAgICAgICAgICB0b3RhbDogcmVzdWx0LnRvdGFsLFxuICAgICAgICAgICAgaXRlbXM6IHJlc3VsdC5pdGVtcyxcbiAgICAgICAgICAgIG9wdGlvbnM6IE9iamVjdC5hc3NpZ24oe30sIG9wdHMsIHJlc3VsdC5vcHRpb25zKSBhcyBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtPixcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHJlc3VsdC50b3RhbCA8PSBpbmRleCArIGxpbWl0KSB7XG4gICAgICAgICAgICAgICAgLy8g6Ieq5YuV57aZ57aa5oyH5a6a5pmC44Gr44Gv5pyA5b6M44Gr44GZ44G544Gm44GuIGl0ZW0g44KS6L+U5Y20XG4gICAgICAgICAgICAgICAgcmV0dmFsLml0ZW1zID0gdGFyZ2V0cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gcmVzdWx0Lml0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjb25kaXRpbmFsRml4IOOBq+S9v+eUqOOBmeOCiyBDcml0ZXJpYSBNYXAgKi9cbmNvbnN0IF9saW1pdENyaXRlcmlhID0ge1xuICAgIFtEeW5hbWljTGltaXQuQ09VTlRdOiBudWxsLFxuICAgIFtEeW5hbWljTGltaXQuU1VNXTogICAgIHsgY29lZmY6IDEgfSxcbiAgICBbRHluYW1pY0xpbWl0LlNFQ09ORF06ICB7IGNvZWZmOiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5NSU5VVEVdOiAgeyBjb2VmZjogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5IT1VSXTogICAgeyBjb2VmZjogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkRBWV06ICAgICB7IGNvZWZmOiAyNCAqIDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5LQl06ICAgICAgeyBjb2VmZjogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUJdOiAgICAgIHsgY29lZmY6IDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5HQl06ICAgICAgeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5UQl06ICAgICAgeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0ICogMTAyNCB9LFxufTtcblxuLyoqXG4gKiBAZW4gRml4IHRoZSB0YXJnZXQgaXRlbXMgYnkgW1tEeW5hbWljQ29uZGl0aW9uXV0uXG4gKiBAamEgW1tEeW5hbWljQ29uZGl0aW9uXV0g44Gr5b6T44GE5a++6LGh44KS5pW05b2iXG4gKlxuICogQHBhcmFtIGl0ZW1zXG4gKiAgLSBgZW5gIHRhcmdldCBpdGVtcyAoZGVzdHJ1Y3RpdmUpXG4gKiAgLSBgamFgIOWvvuixoeOBruOCouOCpOODhuODoCAo56C05aOK55qEKVxuICogQHBhcmFtIGNvbmRpdGlvblxuICogIC0gYGVuYCBjb25kaXRpb24gb2JqZWN0XG4gKiAgLSBgamFgIOadoeS7tuOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uZGl0aW9uYWxGaXg8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PihcbiAgICBpdGVtczogVEl0ZW1bXSxcbiAgICBjb25kaXRpb246IER5bmFtaWNDb25kaXRpb248VEl0ZW0sIFRLZXk+XG4pOiBDb2xsZWN0aW9uRmV0Y2hSZXN1bHQ8VEl0ZW0+IHtcbiAgICBjb25zdCB7IHJhbmRvbSwgbGltaXQsIHN1bUtleXMgfSA9IGNvbmRpdGlvbjtcblxuICAgIGlmIChyYW5kb20pIHtcbiAgICAgICAgc2h1ZmZsZShpdGVtcywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGxpbWl0KSB7XG4gICAgICAgIGNvbnN0IHsgdW5pdCwgdmFsdWUsIHByb3AgfSA9IGxpbWl0O1xuICAgICAgICBjb25zdCByZXNldDogVEl0ZW1bXSA9IFtdO1xuICAgICAgICBjb25zdCBjcml0ZXJpYSA9IF9saW1pdENyaXRlcmlhW3VuaXRdO1xuICAgICAgICBjb25zdCBsaW1pdENvdW50ID0gdmFsdWU7XG4gICAgICAgIGNvbnN0IGV4Y2VzcyA9ICEhbGltaXQuZXhjZXNzO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGlmICghY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIHtcbiAgICAgICAgICAgICAgICBjb3VudCArPSAoTnVtYmVyKGl0ZW1bcHJvcCBhcyBLZXlzPFRJdGVtPl0pIC8gY3JpdGVyaWEuY29lZmYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYGNhbm5vdCBhY2Nlc3MgcHJvcGVydHk6ICR7cHJvcH1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxpbWl0Q291bnQgPCBjb3VudCkge1xuICAgICAgICAgICAgICAgIGlmIChleGNlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzZXQucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXRlbXMgPSByZXNldDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIHRvdGFsOiBpdGVtcy5sZW5ndGgsXG4gICAgICAgIGl0ZW1zLFxuICAgIH0gYXMgQ29sbGVjdGlvbkZldGNoUmVzdWx0PFRJdGVtLCBLZXlzPFRJdGVtPj47XG5cbiAgICBpZiAoMCA8IHN1bUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2Ygc3VtS2V5cykge1xuICAgICAgICAgICAgICAgIGlmICghKGtleSBpbiByZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAocmVzdWx0W2tleV0gYXMgdW5rbm93biBhcyBudW1iZXIpICs9IE51bWJlcihpdGVtW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnMg44Gr5aSJ5o+bICovXG5mdW5jdGlvbiBlbnN1cmVPcHRpb25zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIG9wdGlvbnM6IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHwgdW5kZWZpbmVkXG4pOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgc29ydEtleXM6IFtdIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgbm9TZWFyY2gsIHNvcnRLZXlzIH0gPSBvcHRzO1xuXG4gICAgaWYgKCFub1NlYXJjaCAmJiAoIW9wdHMuY29tcGFyYXRvcnMgfHwgb3B0cy5jb21wYXJhdG9ycy5sZW5ndGggPD0gMCkpIHtcbiAgICAgICAgb3B0cy5jb21wYXJhdG9ycyA9IGNvbnZlcnRTb3J0S2V5cyhzb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHMgYXMgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+O1xufVxuXG4vKiogQGludGVybmFsIOOCreODo+ODg+OCt+ODpeWPr+iDveOBi+WIpOWumiAqL1xuZnVuY3Rpb24gY2FuQ2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3Q+KHJlc3VsdDogQ29sbGVjdGlvbkZldGNoUmVzdWx0PFRJdGVtPiwgb3B0aW9uczogQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbT4pOiBib29sZWFuIHtcbiAgICBjb25zdCB7IG5vQ2FjaGUsIG5vU2VhcmNoIH0gPSBvcHRpb25zO1xuICAgIHJldHVybiAhbm9DYWNoZSAmJiAhbm9TZWFyY2ggJiYgcmVzdWx0LnRvdGFsID09PSByZXN1bHQuaXRlbXMubGVuZ3RoO1xufVxuXG4vKipcbiAqIEBlbiBMb3cgbGV2ZWwgZnVuY3Rpb24gZm9yIFtbQ29sbGVjdGlvbl1dIHF1ZXJ5IGl0ZW1zLlxuICogQGphIFtbQ29sbGVjdGlvbl1dIEl0ZW0g44KS44Kv44Ko44Oq44GZ44KL5L2O44Os44OZ44Or6Zai5pWwXG4gKlxuICogQHBhcmFtIHF1ZXJ5SW5mb1xuICogIC0gYGVuYCBxdWVyeSBpbmZvcm1hdGlvblxuICogIC0gYGphYCDjgq/jgqjjg6rmg4XloLFcbiAqIEBwYXJhbSBwcm92aWRlclxuICogIC0gYGVuYCBwcm92aWRlciBmdW5jdGlvblxuICogIC0gYGphYCDjg5fjg63jg5DjgqTjg4DplqLmlbBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHF1ZXJ5IG9wdGlvbnNcbiAqICAtIGBqYWAg44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBxdWVyeUl0ZW1zPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHF1ZXJ5SW5mbzogQ29sbGVjdGlvblF1ZXJ5SW5mbzxUSXRlbSwgVEtleT4sXG4gICAgcHJvdmlkZXI6IENvbGxlY3Rpb25JdGVtUHJvdmlkZXI8VEl0ZW0sIFRLZXk+LFxuICAgIG9wdGlvbnM/OiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxUSXRlbVtdPiB7XG4gICAgY29uc3Qgb3B0cyA9IGVuc3VyZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gb3B0cztcblxuICAgIC8vIHF1ZXJ5IOOBq+S9v+eUqOOBl+OBnyBzb3J0LCBmaWx0ZXIg5oOF5aCx44KS44Kt44Oj44OD44K344OlXG4gICAgcXVlcnlJbmZvLnNvcnRLZXlzICAgID0gc29ydEtleXM7XG4gICAgcXVlcnlJbmZvLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnM7XG4gICAgcXVlcnlJbmZvLmZpbHRlciAgICAgID0gZmlsdGVyO1xuXG4gICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbUNhY2hlKHF1ZXJ5SW5mby5jYWNoZS5pdGVtcywgb3B0cykpLml0ZW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBxdWVyeUZyb21Qcm92aWRlcihwcm92aWRlciwgb3B0cyk7XG4gICAgICAgIGNvbnN0IG5leHRPcHRzID0gcmVzdWx0Lm9wdGlvbnMgYXMgQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbT47XG4gICAgICAgIGlmIChjYW5DYWNoZShyZXN1bHQsIG5leHRPcHRzKSkge1xuICAgICAgICAgICAgcXVlcnlJbmZvLmNhY2hlID0geyAuLi5yZXN1bHQgfTtcbiAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgbm9TZWFyY2gsIGNvbmRpdGlvbjogc2VlZCB9ID0gbmV4dE9wdHM7XG4gICAgICAgIGlmIChzZWVkKSB7XG4gICAgICAgICAgICBjb25zdCBjb25kaXRpb24gPSBuZXcgRHluYW1pY0NvbmRpdGlvbihzZWVkKTtcbiAgICAgICAgICAgIHJlc3VsdCA9IGNvbmRpdGlvbmFsRml4KHNlYXJjaEl0ZW1zKFxuICAgICAgICAgICAgICAgIHJlc3VsdC5pdGVtcyxcbiAgICAgICAgICAgICAgICBjb25kaXRpb24uZmlsdGVyLFxuICAgICAgICAgICAgICAgIC4uLmNvbmRpdGlvbi5jb21wYXJhdG9yc1xuICAgICAgICAgICAgKSwgY29uZGl0aW9uKTtcblxuICAgICAgICAgICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ocXVlcnlJbmZvLmNhY2hlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWVyeUluZm8uY2FjaGUub3B0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBub1NlYXJjaCA/IHJlc3VsdC5pdGVtcyA6IHNlYXJjaEl0ZW1zKHJlc3VsdC5pdGVtcywgZmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBDb25zdHJ1Y3RvcixcbiAgICBDbGFzcyxcbiAgICBVbmtub3duT2JqZWN0LFxuICAgIFBsYWluT2JqZWN0LFxuICAgIEtleXMsXG4gICAgaXNOaWwsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGx1aWQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmliYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFNvdXJjZSxcbiAgICBFdmVudFB1Ymxpc2hlcixcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgTW9kZWwsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIGlzTW9kZWwsXG59IGZyb20gJ0BjZHAvbW9kZWwnO1xuaW1wb3J0IHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvblNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkV2ZW50LFxuICAgIENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIENvbGxlY3Rpb25RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkFkZE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblNldE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblJlU29ydE9wdGlvbnMsXG4gICAgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IHNlYXJjaEl0ZW1zIH0gZnJvbSAnLi9xdWVyeSc7XG5cbmNvbnN0IF9wcm9wZXJ0aWVzICAgICAgICAgICAgID0gU3ltYm9sKCdwcm9wZXJ0aWVzJyk7XG5jb25zdCBfY3JlYXRlSXRlcmFibGVJdGVyYXRvciA9IFN5bWJvbCgnY3JlYXRlLWl0ZXJhYmxlLWl0ZXJhdG9yJyk7XG5jb25zdCBfcHJlcGFyZU1vZGVsICAgICAgICAgICA9IFN5bWJvbCgncHJlcGFyZS1tb2RlbCcpO1xuY29uc3QgX3JlbW92ZU1vZGVscyAgICAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1tb2RlbHMnKTtcbmNvbnN0IF9hZGRSZWZlcmVuY2UgICAgICAgICAgID0gU3ltYm9sKCdhZGQtcmVmZXJlbmNlJyk7XG5jb25zdCBfcmVtb3ZlUmVmZXJlbmNlICAgICAgICA9IFN5bWJvbCgncmVtb3ZlLXJlZmVyZW5jZScpO1xuY29uc3QgX29uTW9kZWxFdmVudCAgICAgICAgICAgPSBTeW1ib2woJ21vZGVsLWV2ZW50LWhhbmRsZXInKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFByb3BlcnR5PFQgZXh0ZW5kcyBvYmplY3QsIEsgZXh0ZW5kcyBLZXlzPFQ+PiB7XG4gICAgcmVhZG9ubHkgY2lkOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgZGVmYXVsdFF1ZXJ5T3B0aW9ucz86IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VCwgSz47XG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFQsIEs+O1xuICAgIHJlYWRvbmx5IGRlZmF1bHRNb2RlbE9wdGlvbnM/OiBNb2RlbENvbnN0cnVjdGlvbk9wdGlvbnM7XG4gICAgcmVhZG9ubHkgYnlJZDogTWFwPHN0cmluZywgVD47XG4gICAgc3RvcmU6IFRbXTtcbn1cblxuLyoqIEBpbnRlcm5hbCByZXNldCBtb2RlbCBjb250ZXh0ICovXG5jb25zdCByZXNldE1vZGVsU3RvcmUgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KGNvbnRleHQ6IFByb3BlcnR5PFQsIEs+KTogdm9pZCA9PiB7XG4gICAgY29udGV4dC5ieUlkLmNsZWFyKCk7XG4gICAgY29udGV4dC5zdG9yZS5sZW5ndGggPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW5zdXJlU29ydE9wdGlvbnMgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KG9wdGlvbnM/OiBDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4pOiBSZXF1aXJlZDxDb2xsZWN0aW9uU29ydE9wdGlvbnM8VCwgSz4+ID0+IHtcbiAgICBjb25zdCB7IHNvcnRLZXlzOiBrZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IG9wdGlvbnMgfHwge307XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc29ydEtleXM6IGtleXMgfHwgW10sXG4gICAgICAgIGNvbXBhcmF0b3JzOiBjb21wcyB8fCBjb252ZXJ0U29ydEtleXMoa2V5cyB8fCBbXSksXG4gICAgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsSWRBdHRyaWJ1dGUgPSA8VCBleHRlbmRzIG9iamVjdD4oY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBjdG9yPy5bJ2lkQXR0cmlidXRlJ10gfHwgJ2lkJztcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldE1vZGVsSWQgPSA8VCBleHRlbmRzIG9iamVjdD4oYXR0cnM6IFQsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gYXR0cnNbbW9kZWxJZEF0dHJpYnV0ZShjdG9yKV07XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBnZXRDaGFuZ2VkSWRzID0gPFQgZXh0ZW5kcyBvYmplY3Q+KG9iajogb2JqZWN0LCBjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHsgaWQ6IHN0cmluZzsgcHJldklkPzogc3RyaW5nOyB9IHwgdW5kZWZpbmVkID0+IHtcbiAgICB0eXBlIE1vZGVsTGlrZSA9IHsgcHJldmlvdXM6IChrZXk6IHN0cmluZykgPT4gc3RyaW5nOyB9O1xuICAgIGNvbnN0IG1vZGVsID0gb2JqIGFzIE1vZGVsTGlrZTtcblxuICAgIGNvbnN0IGlkQXR0cmlidXRlID0gbW9kZWxJZEF0dHJpYnV0ZShjdG9yKTtcbiAgICBjb25zdCBpZCA9IG1vZGVsW2lkQXR0cmlidXRlXTtcbiAgICBpZiAoIWlzU3RyaW5nKGlkKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB7IGlkOiBtb2RlbFtpZEF0dHJpYnV0ZV0sIHByZXZJZDogaXNGdW5jdGlvbihtb2RlbC5wcmV2aW91cykgPyBtb2RlbC5wcmV2aW91cyhpZEF0dHJpYnV0ZSkgOiB1bmRlZmluZWQgfTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1vZGVsQ29uc3RydWN0b3IgPSA8VCBleHRlbmRzIG9iamVjdCwgRSBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUPiwgSyBleHRlbmRzIEtleXM8VD4+KHNlbGY6IENvbGxlY3Rpb248VCwgRSwgSz4pOiBDbGFzcyB8IHVuZGVmaW5lZCA9PiB7XG4gICAgcmV0dXJuIHNlbGYuY29uc3RydWN0b3JbJ21vZGVsJ107XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBpc0NvbGxlY3Rpb25Nb2RlbCA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oeDogdW5rbm93biwgc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IHggaXMgVCA9PiB7XG4gICAgY29uc3QgY3RvciA9IG1vZGVsQ29uc3RydWN0b3Ioc2VsZik7XG4gICAgcmV0dXJuIGlzRnVuY3Rpb24oY3RvcikgPyB4IGluc3RhbmNlb2YgY3RvciA6IGZhbHNlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3BsaWNlQXJyYXkgPSA8VD4odGFyZ2V0OiBUW10sIGluc2VydDogVFtdLCBhdDogbnVtYmVyKTogdm9pZCA9PiB7XG4gICAgYXQgPSBNYXRoLm1pbihNYXRoLm1heChhdCwgMCksIHRhcmdldC5sZW5ndGgpO1xuICAgIHRhcmdldC5zcGxpY2UoYXQsIDAsIC4uLmluc2VydCk7XG59O1xuXG5jb25zdCBfc2V0T3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IHRydWUsIG1lcmdlOiB0cnVlIH07XG5jb25zdCBfYWRkT3B0aW9ucyA9IHsgYWRkOiB0cnVlLCByZW1vdmU6IGZhbHNlIH07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIG9iamVjdCBjb2xsZWN0aW9uLlxuICogQGphIOOCquODluOCuOOCp+OCr+ODiOOBrumbhuWQiOOCkuaJseOBhuWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIFRPRE86XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb2xsZWN0aW9uPFRNb2RlbCBleHRlbmRzIG9iamVjdCA9IG9iamVjdCwgRXZlbnQgZXh0ZW5kcyBDb2xsZWN0aW9uRXZlbnQ8VE1vZGVsPiA9IENvbGxlY3Rpb25FdmVudDxUTW9kZWw+LCBUS2V5IGV4dGVuZHMgS2V5czxUTW9kZWw+ID0gS2V5czxUTW9kZWw+PlxuICAgIGV4dGVuZHMgRXZlbnRTb3VyY2U8RXZlbnQ+XG4gICAgaW1wbGVtZW50cyBJdGVyYWJsZTxUTW9kZWw+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb2RlbCBjb25zdHJ1Y3Rvci4gPGJyPlxuICAgICAqICAgICBUaGUgY29uc3RydWN0b3IgaXMgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoaXMgW1tDb2xsZWN0aW9uXV0gY2xhc3MgZm9yIFtbVE1vZGVsXV0gY29uc3RydWN0aW9uLlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjgrPjg7Pjgrnjg4jjg6njgq/jgr8gPGJyPlxuICAgICAqICAgICBbW0NvbGxlY3Rpb25dXSDjgq/jg6njgrnjgYwgW1tUTW9kZWxdXSDjgpLmp4vnr4njgZnjgovjgZ/jgoHjgavkvb/nlKjjgZnjgotcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWw/OiBDbGFzcztcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzPzogVE1vZGVsW10gfCBQbGFpbk9iamVjdFtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsPikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMsIHF1ZXJ5T3B0aW9ucyB9ID0gb3B0cztcblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHtcbiAgICAgICAgICAgIGNpZDogbHVpZCgnY29sbGVjdGlvbjonLCA4KSxcbiAgICAgICAgICAgIGRlZmF1bHRRdWVyeU9wdGlvbnM6IHF1ZXJ5T3B0aW9ucyBhcyBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4sXG4gICAgICAgICAgICBxdWVyeUluZm86IHt9IGFzIENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5PixcbiAgICAgICAgICAgIGRlZmF1bHRNb2RlbE9wdGlvbnM6IG1vZGVsT3B0aW9ucyxcbiAgICAgICAgICAgIGJ5SWQ6IG5ldyBNYXA8c3RyaW5nLCBUTW9kZWw+KCksXG4gICAgICAgICAgICBzdG9yZTogW10sXG4gICAgICAgIH0gYXMgUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcbiAgICAgICAgdGhpcy5fcXVlcnlJbmZvID0gdGhpcy5pbml0UXVlcnlJbmZvKCk7XG5cblxuICAgICAgICAvKiBtb2RlbCBldmVudCBoYW5kbGVyICovXG4gICAgICAgIHRoaXNbX29uTW9kZWxFdmVudF0gPSAoZXZlbnQ6IHN0cmluZywgbW9kZWw6IFRNb2RlbCB8IHVuZGVmaW5lZCwgY29sbGVjdGlvbjogdGhpcywgb3B0aW9uczogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudC5zdGFydHNXaXRoKCdAJykgJiYgbW9kZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoKCdAYWRkJyA9PT0gZXZlbnQgfHwgJ0ByZW1vdmUnID09PSBldmVudCkgJiYgY29sbGVjdGlvbiAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgnQGRlc3Ryb3knID09PSBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtb2RlbCBldmVudCBhcmd1bWVudHMgYWRqdXN0bWVudC5cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IChjb2xsZWN0aW9uIGFzIGFueSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJ0BjaGFuZ2UnID09PSBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHMgPSBnZXRDaGFuZ2VkSWRzKG1vZGVsLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBpZCwgcHJldklkIH0gPSBpZHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldklkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnlJZC5zZXQoaWQsIG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBwcmV2SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnlJZC5kZWxldGUocHJldklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkZWxlZ2F0ZSBldmVudFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyLmNhbGwodGhpcywgZXZlbnQsIG1vZGVsLCBjb2xsZWN0aW9uLCBvcHRpb25zKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11c2VsZXNzLWNhbGxcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2VlZHMpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IHB1YmxpYyBwcm9wZXJ0aWVzXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGNvbnRlbnQgSUQuXG4gICAgICogQGphIOOCs+ODs+ODhuODs+ODiCBJRCDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNpZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IG1vZGVscy5cbiAgICAgKiBAamEg44Oi44OH44Or44Ki44Kv44K744K5XG4gICAgICovXG4gICAgZ2V0IG1vZGVscygpOiBUTW9kZWxbXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gbnVtYmVyIG9mIG1vZGVscy5cbiAgICAgKiBAamEg5YaF5YyF44GZ44KL44Oi44OH44Or5pWwXG4gICAgICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uc3RvcmUubGVuZ3RoO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEl0ZXJhYmxlPFRNb2RlbD5cblxuICAgIC8qKlxuICAgICAqIEBlbiBJdGVyYXRvciBvZiBbW0VsZW1lbnRCYXNlXV0gdmFsdWVzIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEg5qC857SN44GX44Gm44GE44KLIFtbRWxlbWVudEJhc2VdXSDjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUTW9kZWw+IHtcbiAgICAgICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFRNb2RlbD4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBvaW50ZXIgPCB0aGlzLmJhc2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmJhc2VbdGhpcy5wb2ludGVyKytdLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBpdGVyYXRvciBhcyBJdGVyYXRvcjxUTW9kZWw+O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleShpZCksIHZhbHVlKG1vZGVsKSBwYWlycyBmb3IgZXZlcnkgZW50cnkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSBrZXkoaWQpLCB2YWx1ZShtb2RlbCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtzdHJpbmcsIFRNb2RlbF0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gW2tleSwgdmFsdWVdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBrZXlzKGlkKSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpZCkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nKSA9PiBrZXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIHZhbHVlcyhbW0VsZW1lbnRCYXNlXV0pIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkg6YWN5YiX44Gr44Ki44Kv44K744K55Y+v6IO944Gq44Kk44OG44Os44O844K/44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VE1vZGVsPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcsIHZhbHVlOiBUTW9kZWwpID0+IHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBpdGVyYXRvciBjcmVhdGUgZnVuY3Rpb24gKi9cbiAgICBwcml2YXRlIFtfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl08Uj4odmFsdWVHZW5lcmF0b3I6IChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gUik6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0ge1xuICAgICAgICAgICAgYmFzZTogdGhpc1tfcHJvcGVydGllc10uc3RvcmUsXG4gICAgICAgICAgICBwb2ludGVyOiAwLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvczJrZXkgPSAocG9zOiBudW1iZXIpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGdldE1vZGVsSWQoY29udGV4dC5iYXNlW3Bvc10sIG1vZGVsQ29uc3RydWN0b3IodGhpcykpIHx8IFN0cmluZyhwb3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYWJsZUl0ZXJhdG9yPFI+ID0ge1xuICAgICAgICAgICAgbmV4dCgpOiBJdGVyYXRvclJlc3VsdDxSPiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IGNvbnRleHQucG9pbnRlcjtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCA8IGNvbnRleHQuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5wb2ludGVyKys7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZUdlbmVyYXRvcihwb3Mya2V5KGN1cnJlbnQpLCBjb250ZXh0LmJhc2VbY3VycmVudF0pLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb25lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCEsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFI+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGFjY2Vzc29yOiBwcm90ZWN0ZWQgcXVlcnktaW5mb1xuXG4gICAgLyoqXG4gICAgICogQGVuIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIGluc3RhbmNlXG4gICAgICogQGphIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5SW5mbygpOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc2V0IF9xdWVyeUluZm8odmFsOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvID0gdmFsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBJbml0aWFsaXplIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dLlxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSDjga7liJ3mnJ/ljJZcbiAgICAgKlxuICAgICAqIEBvdmVycmlkZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBpbml0UXVlcnlJbmZvKCk6IENvbGxlY3Rpb25RdWVyeUluZm88VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiBlbnN1cmVTb3J0T3B0aW9ucyh0aGlzW19wcm9wZXJ0aWVzXS5kZWZhdWx0UXVlcnlPcHRpb25zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb246IGdlbmVyYWxcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYSBtb2RlbCBmcm9tIGEgY29sbGVjdGlvbiwgc3BlY2lmaWVkIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJ44Oi44OH44Or44KS54m55a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGdldChzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHNlZWQpICYmIGJ5SWQuaGFzKHNlZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gYnlJZC5nZXQoc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpZCA9IGdldE1vZGVsSWQoaXNNb2RlbChzZWVkKSA/IHNlZWQudG9KU09OKCkgOiBzZWVkIGFzIG9iamVjdCwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSk7XG4gICAgICAgIGNvbnN0IGNpZCA9IChzZWVkIGFzIG9iamVjdCBhcyB7IF9jaWQ/OiBzdHJpbmc7IH0pLl9jaWQ7XG5cbiAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KGlkKSB8fCAoY2lkICYmIGJ5SWQuZ2V0KGNpZCkpIGFzIFRNb2RlbCB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIGNvbGxlY3Rpb24uIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IFBsYWluT2JqZWN0IHwgdm9pZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10gfCBQbGFpbk9iamVjdFtdIHwgdW5kZWZpbmVkIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFRNb2RlbFtdO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGNvbGxlY3Rpb24gc2V0dXBcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gc29ydCBjb21wYXJhdG9ycy5cbiAgICAgKiBAamEg44K944O844OI55So5q+U6LyD6Zai5pWw44G444Gu44Ki44Kv44K744K5XG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfY29tcGFyYXRvcnMoKTogU29ydENhbGxiYWNrPFRNb2RlbD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIGEgY29sbGVjdGlvbiB0byByZS1zb3J0IGl0c2VsZi5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz6KaB57Sg44Gu5YaN44K944O844OIXG4gICAgICovXG4gICAgcHVibGljIHNvcnQob3B0aW9ucz86IENvbGxlY3Rpb25SZVNvcnRPcHRpb25zPFRNb2RlbCwgVEtleT4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gZW5zdXJlU29ydE9wdGlvbnMob3B0cyk7XG4gICAgICAgIGNvbnN0IGNvbXBhcmF0b3JzID0gMCA8IGNvbXBzLmxlbmd0aCA/IGNvbXBzIDogdGhpcy5fY29tcGFyYXRvcnM7XG5cbiAgICAgICAgaWYgKGNvbXBhcmF0b3JzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0NPTVBBUkFUT1JTLCAnQ2Fubm90IHNvcnQgYSBzZXQgd2l0aG91dCBhIGNvbXBhcmF0b3IuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IHNlYXJjaEl0ZW1zKHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLCBudWxsLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHF1ZXJ5SW5mb1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycztcbiAgICAgICAgaWYgKDAgPCBzb3J0S2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5zb3J0S2V5cyA9IHNvcnRLZXlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgdHlwZSBDb250ZXh0ID0gQ29sbGVjdGlvbjxUTW9kZWw+O1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7Pjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBq+ODouODh+ODq+OBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GE44Oi44OH44Or44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBOaWwgdmFsdWUuXG4gICAgICogIC0gYGphYCBOaWwg6KaB57SgXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiB1bmRlZmluZWQsIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44Gr44Oi44OH44Or44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYTjg6Ljg4fjg6vjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6Kit5a6a44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNldChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gXCJTbWFydFwiIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGNvbGxlY3Rpb24gd2l0aCB0aGUgcGFzc2VkIGxpc3Qgb2YgbW9kZWxzLlxuICAgICAqICAgICAgIC0gaWYgdGhlIG1vZGVsIGlzIGFscmVhZHkgaW4gdGhlIGNvbGxlY3Rpb24gaXRzIGF0dHJpYnV0ZXMgd2lsbCBiZSBtZXJnZWQuXG4gICAgICogICAgICAgLSBpZiB0aGUgY29sbGVjdGlvbiBjb250YWlucyBhbnkgbW9kZWxzIHRoYXQgYXJlbid0IHByZXNlbnQgaW4gdGhlIGxpc3QsIHRoZXknbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiAgICAgICAtIEFsbCBvZiB0aGUgYXBwcm9wcmlhdGUgYEBhZGRgLCBgQHJlbW92ZWAsIGFuZCBgQHVwZGF0ZWAgZXZlbnRzIGFyZSBmaXJlZCBhcyB0aGlzIGhhcHBlbnMuXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBruaxjueUqOabtOaWsOWHpueQhlxuICAgICAqICAgICAgIC0g6L+95Yqg5pmC44Gr44GZ44Gn44Gr44Oi44OH44Or44GM5a2Y5Zyo44GZ44KL44Go44GN44Gv44CB5bGe5oCn44KS44Oe44O844K4XG4gICAgICogICAgICAgLSDmjIflrprjg6rjgrnjg4jjgavlrZjlnKjjgZfjgarjgYTjg6Ljg4fjg6vjga/liYrpmaRcbiAgICAgKiAgICAgICAtIOmBqeWIh+OBqiBgQGFkZGAsIGBAcmVtb3ZlYCwgYEB1cGRhdGVgIOOCpOODmeODs+ODiOOCkueZuueUn1xuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZHM6IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgc2V0KHNlZWRzPzogVE1vZGVsIHwgVW5rbm93bk9iamVjdCB8IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsIHwgVE1vZGVsW10gfCB2b2lkIHtcbiAgICAgICAgaWYgKGlzTmlsKHNlZWRzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIF9zZXRPcHRpb25zLCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBpZiAob3B0cy5wYXJzZSAmJiAhaXNDb2xsZWN0aW9uTW9kZWwoc2VlZHMsIHRoaXMpKSB7XG4gICAgICAgICAgICBzZWVkcyA9IHRoaXMucGFyc2Uoc2VlZHMsIG9wdGlvbnMpIHx8IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2luZ3VsYXIgPSAhaXNBcnJheShzZWVkcyk7XG4gICAgICAgIGNvbnN0IGl0ZW1zOiAoVE1vZGVsIHwgb2JqZWN0IHwgdW5kZWZpbmVkKVtdID0gc2luZ3VsYXIgPyBbc2VlZHNdIDogKHNlZWRzIGFzIG9iamVjdFtdKS5zbGljZSgpO1xuXG4gICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuXG4gICAgICAgIGNvbnN0IGF0ID0gKChjYW5kaWRhdGUpOiBudW1iZXIgfCB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPiBzdG9yZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlICs9IHN0b3JlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChjYW5kaWRhdGUgPCAwKSA/IDAgOiBjYW5kaWRhdGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKG9wdHMuYXQpO1xuXG4gICAgICAgIGNvbnN0IHNldDogb2JqZWN0W10gICAgICA9IFtdO1xuICAgICAgICBjb25zdCB0b0FkZDogVE1vZGVsW10gICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9NZXJnZTogVE1vZGVsW10gID0gW107XG4gICAgICAgIGNvbnN0IHRvUmVtb3ZlOiBUTW9kZWxbXSA9IFtdO1xuICAgICAgICBjb25zdCBtb2RlbFNldCA9IG5ldyBTZXQ8b2JqZWN0PigpO1xuXG4gICAgICAgIGNvbnN0IHsgYWRkLCBtZXJnZSwgcmVtb3ZlLCBwYXJzZSwgc2lsZW50IH0gPSBvcHRzO1xuXG4gICAgICAgIGxldCBzb3J0ID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHNvcnRhYmxlID0gdGhpcy5fY29tcGFyYXRvcnMubGVuZ3RoICYmIG51bGwgPT0gYXQgJiYgZmFsc2UgIT09IG9wdHMuc29ydDtcblxuICAgICAgICB0eXBlIE1vZGVsRmVhdHVyZSA9IHtcbiAgICAgICAgICAgIHBhcnNlOiAoYXRycj86IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gb2JqZWN0O1xuICAgICAgICAgICAgc2V0QXR0cmlidXRlczogKGF0cnI6IG9iamVjdCwgb3B0aW9ucz86IG9iamVjdCkgPT4gdm9pZDtcbiAgICAgICAgICAgIGhhc0NoYW5nZWQ6ICgpID0+IGJvb2xlYW47XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVHVybiBiYXJlIG9iamVjdHMgaW50byBtb2RlbCByZWZlcmVuY2VzLCBhbmQgcHJldmVudCBpbnZhbGlkIG1vZGVscyBmcm9tIGJlaW5nIGFkZGVkLlxuICAgICAgICBmb3IgKGNvbnN0IFtpLCBpdGVtXSBvZiBpdGVtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIC8vIElmIGEgZHVwbGljYXRlIGlzIGZvdW5kLCBwcmV2ZW50IGl0IGZyb20gYmVpbmcgYWRkZWQgYW5kIG9wdGlvbmFsbHkgbWVyZ2UgaXQgaW50byB0aGUgZXhpc3RpbmcgbW9kZWwuXG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuZ2V0KGl0ZW0pIGFzIE1vZGVsRmVhdHVyZTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICAgIGlmIChtZXJnZSAmJiBpdGVtICE9PSBleGlzdGluZykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cnMgPSBpc01vZGVsKGl0ZW0pID8gaXRlbS50b0pTT04oKSA6IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZSAmJiBpc0Z1bmN0aW9uKGV4aXN0aW5nLnBhcnNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMgPSBleGlzdGluZy5wYXJzZShhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihleGlzdGluZy5zZXRBdHRyaWJ1dGVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmcuc2V0QXR0cmlidXRlcyhhdHRycywgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0b01lcmdlLnB1c2goZXhpc3RpbmcgYXMgVE1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnRhYmxlICYmICFzb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0ID0gaXNGdW5jdGlvbihleGlzdGluZy5oYXNDaGFuZ2VkKSA/IGV4aXN0aW5nLmhhc0NoYW5nZWQoKSA6IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMoZXhpc3RpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKGV4aXN0aW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXRlbXNbaV0gPSBleGlzdGluZztcbiAgICAgICAgICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBicmFjZS1zdHlsZVxuXG4gICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmV3LCB2YWxpZCBtb2RlbCwgcHVzaCBpdCB0byB0aGUgYHRvQWRkYCBsaXN0LlxuICAgICAgICAgICAgZWxzZSBpZiAoYWRkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZWwgPSBpdGVtc1tpXSA9IHRoaXNbX3ByZXBhcmVNb2RlbF0oaXRlbSwgb3B0cyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQWRkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzW19hZGRSZWZlcmVuY2VdKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgbW9kZWxTZXQuYWRkKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBzdGFsZSBtb2RlbHMuXG4gICAgICAgIGlmIChyZW1vdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGVsU2V0Lmhhcyhtb2RlbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9SZW1vdmUucHVzaChtb2RlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXNbX3JlbW92ZU1vZGVsc10odG9SZW1vdmUsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2VlIGlmIHNvcnRpbmcgaXMgbmVlZGVkLCB1cGRhdGUgYGxlbmd0aGAgYW5kIHNwbGljZSBpbiBuZXcgbW9kZWxzLlxuICAgICAgICBsZXQgb3JkZXJDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHJlcGxhY2UgPSAhc29ydGFibGUgJiYgYWRkICYmIHJlbW92ZTtcbiAgICAgICAgaWYgKHNldC5sZW5ndGggJiYgcmVwbGFjZSkge1xuICAgICAgICAgICAgb3JkZXJDaGFuZ2VkID0gKHN0b3JlLmxlbmd0aCAhPT0gc2V0Lmxlbmd0aCkgfHwgc3RvcmUuc29tZSgobSwgaW5kZXgpID0+IG0gIT09IHNldFtpbmRleF0pO1xuICAgICAgICAgICAgc3RvcmUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHNwbGljZUFycmF5KHN0b3JlLCBzZXQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHRvQWRkLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHNvcnRhYmxlKSB7XG4gICAgICAgICAgICAgICAgc29ydCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgdG9BZGQsIG51bGwgPT0gYXQgPyBzdG9yZS5sZW5ndGggOiBhdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaWxlbnRseSBzb3J0IHRoZSBjb2xsZWN0aW9uIGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICBpZiAoc29ydCkge1xuICAgICAgICAgICAgdGhpcy5zb3J0KHsgc2lsZW50OiB0cnVlIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVW5sZXNzIHNpbGVuY2VkLCBpdCdzIHRpbWUgdG8gZmlyZSBhbGwgYXBwcm9wcmlhdGUgYWRkL3NvcnQvdXBkYXRlIGV2ZW50cy5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2ksIG1vZGVsXSBvZiB0b0FkZC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBhdCkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gYXQgKyBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRCcm9rZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIChtb2RlbCBhcyBNb2RlbCkudHJpZ2dlcignQGFkZCcsIG1vZGVsIGFzIE1vZGVsLCB0aGlzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAYWRkJywgbW9kZWwsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNvcnQgfHwgb3JkZXJDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQHNvcnQnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvQWRkLmxlbmd0aCB8fCB0b1JlbW92ZS5sZW5ndGggfHwgdG9NZXJnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmNoYW5nZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZGVkOiB0b0FkZCxcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZDogdG9SZW1vdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lcmdlZDogdG9NZXJnZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQHVwZGF0ZScsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkcm9wIHVuZGVmaW5lZFxuICAgICAgICBjb25zdCByZXR2YWwgPSBpdGVtcy5maWx0ZXIoaSA9PiBudWxsICE9IGkpIGFzIFRNb2RlbFtdO1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgYWRkZWQgKG9yIG1lcmdlZCkgbW9kZWwgKG9yIG1vZGVscykuXG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJldHZhbFswXSA6IChyZXR2YWwubGVuZ3RoID8gcmV0dmFsIDogdm9pZCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBhIGNvbGxlY3Rpb24gd2l0aCBhIG5ldyBsaXN0IG9mIG1vZGVscyAob3IgYXR0cmlidXRlIGhhc2hlcyksIHRyaWdnZXJpbmcgYSBzaW5nbGUgYHJlc2V0YCBldmVudCBvbiBjb21wbGV0aW9uLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PjgpLmlrDjgZfjgYTjg6Ljg4fjg6vkuIDopqfjgafnva7mj5suIOWujOS6huaZguOBqyBgcmVzZXRgIOOCpOODmeODs+ODiOOCkueZuuihjFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZXNldCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44K744OD44OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KHNlZWRzPzogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyAmIHsgcHJldmlvdXM6IFRNb2RlbFtdOyB9O1xuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBzdG9yZSkge1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLnByZXZpb3VzID0gc3RvcmUuc2xpY2UoKTtcbiAgICAgICAgcmVzZXRNb2RlbFN0b3JlKHRoaXNbX3Byb3BlcnRpZXNdKTtcblxuICAgICAgICBjb25zdCBtb2RlbHMgPSBzZWVkcyA/IHRoaXMuYWRkKHNlZWRzLCBPYmplY3QuYXNzaWduKHsgc2lsZW50OiB0cnVlIH0sIG9wdHMpKSA6IFtdO1xuXG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0ByZXNldCcsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9kZWxzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgbW9kZWwgdG8gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQGphIOOCs+ODrOOCr+OCt+ODp+ODs+OBuOOBruODouODh+ODq+OBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsLlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0LCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWw7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIHRvIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiBAamEg44Oi44OH44Or44Oq44K544OI5oyH5a6a44Gr44KI44KL44Kz44Os44Kv44K344On44Oz44G444Gu6L+95YqgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFkZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg6L+95Yqg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGFkZChzZWVkczogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyBhZGQoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uQWRkT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0KHNlZWRzIGFzIFVua25vd25PYmplY3QsIE9iamVjdC5hc3NpZ24oeyBtZXJnZTogZmFsc2UgfSwgb3B0aW9ucywgX2FkZE9wdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIGEgbW9kZWwgZnJvbSB0aGUgc2V0LlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7PjgYvjgonjg6Ljg4fjg6vjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIGxpc3Qgb2YgbW9kZWxzIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEg44Oi44OH44Or44Oq44K544OI5oyH5a6a44Gr44KI44KL44Kz44Os44Kv44K344On44Oz44GL44KJ44Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZHNcbiAgICAgKiAgLSBgZW5gIGdpdmVuIHRoZSBzZWVkIG9mIG1vZGVsIGFycmF5LlxuICAgICAqICAtIGBqYWAg44Oi44OH44Or6KaB57Sg44Gu6YWN5YiX44KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlbW92ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5YmK6Zmk44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlbW92ZShzZWVkczogKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWxbXTtcblxuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpIGFzIENvbGxlY3Rpb25VcGRhdGVPcHRpb25zPFRNb2RlbD47XG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHNpbmd1bGFyID8gW3NlZWRzIGFzIFRNb2RlbF0gOiAoc2VlZHMgYXMgVE1vZGVsW10pLnNsaWNlKCk7XG4gICAgICAgIGNvbnN0IHJlbW92ZWQgPSB0aGlzW19yZW1vdmVNb2RlbHNdKGl0ZW1zLCBvcHRzKTtcbiAgICAgICAgaWYgKCFvcHRzLnNpbGVudCAmJiByZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0geyBhZGRlZDogW10sIG1lcmdlZDogW10sIHJlbW92ZWQgfTtcbiAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzaW5ndWxhciA/IHJlbW92ZWRbMF0gOiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbW9kZWwgcHJlcGFyYXRpb24gKi9cbiAgICBwcml2YXRlIFtfcHJlcGFyZU1vZGVsXShhdHRyczogb2JqZWN0IHwgVE1vZGVsIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlmIChpc0NvbGxlY3Rpb25Nb2RlbChhdHRycywgdGhpcykpIHtcbiAgICAgICAgICAgIHJldHVybiBhdHRycztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKTtcbiAgICAgICAgY29uc3QgeyBkZWZhdWx0TW9kZWxPcHRpb25zIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE1vZGVsT3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IG5ldyBjb25zdHJ1Y3RvcihhdHRycywgb3B0cykgYXMgeyB2YWxpZGF0ZTogKCkgPT4gUmVzdWx0OyB9O1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24obW9kZWwudmFsaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gbW9kZWwudmFsaWRhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoRkFJTEVEKHJlc3VsdC5jb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlIENvbnRleHQgPSBDb2xsZWN0aW9uPFRNb2RlbD47XG4gICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0BpbnZhbGlkJywgYXR0cnMgYXMgVE1vZGVsLCB0aGlzIGFzIENvbnRleHQsIHJlc3VsdCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1vZGVsIGFzIFRNb2RlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBsYWluIG9iamVjdFxuICAgICAgICByZXR1cm4gYXR0cnMgYXMgVE1vZGVsO1xuICAgIH1cblxuICAgIC8qKiBAaW5ldGVybmFsIEludGVybmFsIG1ldGhvZCBjYWxsZWQgYnkgYm90aCByZW1vdmUgYW5kIHNldC4gKi9cbiAgICBwcml2YXRlIFtfcmVtb3ZlTW9kZWxzXShtb2RlbHM6IFRNb2RlbFtdLCBvcHRpb25zOiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCByZW1vdmVkOiBUTW9kZWxbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG1kbCBvZiBtb2RlbHMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gdGhpcy5nZXQobWRsKTtcbiAgICAgICAgICAgIGlmICghbW9kZWwpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IHN0b3JlLmluZGV4T2YobW9kZWwpO1xuICAgICAgICAgICAgc3RvcmUuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlZmVyZW5jZXMgYmVmb3JlIHRyaWdnZXJpbmcgJ3JlbW92ZScgZXZlbnQgdG8gcHJldmVudCBhbiBpbmZpbml0ZSBsb29wLlxuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50QnJva2VyKSkge1xuICAgICAgICAgICAgICAgICAgICAobW9kZWwgYXMgTW9kZWwpLnRyaWdnZXIoJ0ByZW1vdmUnLCBtb2RlbCBhcyBNb2RlbCwgdGhpcywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSBDb250ZXh0ID0gQ29sbGVjdGlvbjxUTW9kZWw+O1xuICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwsIHRoaXMgYXMgQ29udGV4dCwgb3B0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZW1vdmVkLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgdGhpc1tfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbCwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZW1vdmVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIGNyZWF0ZSBhIG1vZGVsJ3MgdGllcyB0byBhIGNvbGxlY3Rpb24uICovXG4gICAgcHJpdmF0ZSBbX2FkZFJlZmVyZW5jZV0obW9kZWw6IFRNb2RlbCk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoX2NpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLnNldChpZCwgbW9kZWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuVG8obW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsIHRoaXNbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBJbnRlcm5hbCBtZXRob2QgdG8gc2V2ZXIgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwsIHBhcnRpYWwgPSBmYWxzZSk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGJ5SWQgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICBjb25zdCB7IF9jaWQsIGlkIH0gPSBtb2RlbCBhcyB7IF9jaWQ6IHN0cmluZzsgaWQ6IHN0cmluZzsgfTtcbiAgICAgICAgaWYgKG51bGwgIT0gX2NpZCkge1xuICAgICAgICAgICAgYnlJZC5kZWxldGUoX2NpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG51bGwgIT0gaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKGlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcnRpYWwgJiYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50UHVibGlzaGVyKSkpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcExpc3RlbmluZyhtb2RlbCBhcyBTdWJzY3JpYmFibGUsICcqJywgdGhpc1tfb25Nb2RlbEV2ZW50XSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIG1peGluIOOBq+OCiOOCiyBgaW5zdGFuY2VvZmAg44Gv54Sh5Yq544Gr6Kit5a6aXG5zZXRNaXhDbGFzc0F0dHJpYnV0ZShDb2xsZWN0aW9uIGFzIENsYXNzLCAnaW5zdGFuY2VPZicsIG51bGwpO1xuXG4vKlxuIOKYhiBpZFxuIOKYhiBtb2RlbHMvaXRlbXNcbiDimIYgbGVuZ3RoXG4g4piFIHJlbGVhc2UoKVxuIOKYhSBmZXRjaCgpXG5cbiDimIUgLSBMaXN0RWRpdGFibGU8VD4g44KS44Gp44GG44GZ44KL44GLP1xuXG4g4piFIHVybDogc3RyaW5nIHwgKCgpID0+IHN0cmluZyk7XG5cbiDimIUgd2l0aG91dCguLi52YWx1ZXM6IFRNb2RlbFtdKTogVE1vZGVsW107XG5cbiDimIYgYWRkKG1vZGVsOiB7fXxUTW9kZWwsIG9wdGlvbnM/OiBBZGRPcHRpb25zKTogVE1vZGVsO1xuIOKYhiBhZGQobW9kZWxzOiAoe318VE1vZGVsKVtdLCBvcHRpb25zPzogQWRkT3B0aW9ucyk6IFRNb2RlbFtdO1xuIOKYhSBhdChpbmRleDogbnVtYmVyKTogVE1vZGVsO1xuIOKYhiBnZXQoaWQ6IG51bWJlciB8IHN0cmluZyB8IE1vZGVsKTogVE1vZGVsO1xuIOKYhSBoYXMoa2V5OiBudW1iZXIgfCBzdHJpbmcgfCBNb2RlbCk6IGJvb2xlYW47XG4g4piFIGNsb25lKCk6IHRoaXM7XG4g4piFIGNyZWF0ZShhdHRyaWJ1dGVzOiBhbnksIG9wdGlvbnMgPzogTW9kZWxTYXZlT3B0aW9ucyk6IFRNb2RlbDtcbiDimIUgcGx1Y2soYXR0cmlidXRlOiBzdHJpbmcpOiBhbnlbXTtcbiDimIUgcHVzaChtb2RlbDogVE1vZGVsLCBvcHRpb25zID86IEFkZE9wdGlvbnMpOiBUTW9kZWw7XG4g4piFIHBvcChvcHRpb25zID86IFNpbGVuY2VhYmxlKTogVE1vZGVsO1xuIOKYhiByZW1vdmUobW9kZWw6IHt9IHwgVE1vZGVsLCBvcHRpb25zID86IFNpbGVuY2VhYmxlKTogVE1vZGVsO1xuIOKYhiByZW1vdmUobW9kZWxzOiAoe30gfCBUTW9kZWwpW10sIG9wdGlvbnMgPzogU2lsZW5jZWFibGUpOiBUTW9kZWxbXTtcbiDimIYgcmVzZXQobW9kZWxzID86IFRNb2RlbFtdLCBvcHRpb25zID86IFNpbGVuY2VhYmxlKTogVE1vZGVsW107XG4g4piGIHNldChtb2RlbHMgPzogVE1vZGVsW10sIG9wdGlvbnMgPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiBUTW9kZWxbXTtcbiDimIUgc2hpZnQob3B0aW9ucyA/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbDtcbiDimIYgc29ydChvcHRpb25zID86IFNpbGVuY2VhYmxlKTogQ29sbGVjdGlvbjxUTW9kZWw+O1xuIOKYhSB1bnNoaWZ0KG1vZGVsOiBUTW9kZWwsIG9wdGlvbnMgPzogQWRkT3B0aW9ucyk6IFRNb2RlbDtcbiDimIUgd2hlcmUocHJvcGVydGllczogYW55KTogVE1vZGVsW107XG4g4piFIGZpbmRXaGVyZShwcm9wZXJ0aWVzOiBhbnkpOiBUTW9kZWw7XG4g4piFIG1vZGVsSWQoYXR0cnM6IGFueSkgOiBhbnlcbiDimIUgc2xpY2UobWluPzogbnVtYmVyLCBtYXg/OiBudW1iZXIpOiBUTW9kZWxbXTtcblxuIC8vIG1peGlucyBmcm9tIHVuZGVyc2NvcmUgKOWfuuacrOOChOOCieOBquOBhClcblxuIOKYhSBhbGwoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogYm9vbGVhbjtcbiDimIUgYW55KGl0ZXJhdG9yPzogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IGJvb2xlYW47XG4g4piFIGNoYWluKCk6IGFueTtcbiDimIUgY29sbGVjdDxUUmVzdWx0PihpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgY29udGV4dD86IGFueSk6IFRSZXN1bHRbXTtcbiDimIUgY29udGFpbnModmFsdWU6IFRNb2RlbCk6IGJvb2xlYW47XG4g4piFIGNvdW50QnkoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGFueT4pOiBfLkRpY3Rpb25hcnk8bnVtYmVyPjtcbiDimIUgY291bnRCeShpdGVyYXRvcjogc3RyaW5nKTogXy5EaWN0aW9uYXJ5PG51bWJlcj47XG4g4piFIGRldGVjdChpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IFRNb2RlbDtcbiDimIUgZGlmZmVyZW5jZShvdGhlcnM6IFRNb2RlbFtdKTogVE1vZGVsW107XG4g4piFIGRyb3Aobj86IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBlYWNoKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIHZvaWQ+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIGV2ZXJ5KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogYm9vbGVhbjtcbiDimIUgZmlsdGVyKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIGZpbmQoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWw7XG4g4piFIGZpbmRJbmRleChwcmVkaWNhdGU6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBudW1iZXI7XG4g4piFIGZpbmRMYXN0SW5kZXgocHJlZGljYXRlOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogbnVtYmVyO1xuIOKYhSBmaXJzdCgpOiBUTW9kZWw7XG4g4piFIGZpcnN0KG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBmb2xkbDxUUmVzdWx0PihpdGVyYXRvcjogXy5NZW1vSXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgbWVtbz86IFRSZXN1bHQsIGNvbnRleHQ/OiBhbnkpOiBUUmVzdWx0O1xuIOKYhSBmb2xkcjxUUmVzdWx0PihpdGVyYXRvcjogXy5NZW1vSXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgbWVtbz86IFRSZXN1bHQsIGNvbnRleHQ/OiBhbnkpOiBUUmVzdWx0O1xuIOKYhSBmb3JFYWNoKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIHZvaWQ+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIGdyb3VwQnkoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYW55PiwgY29udGV4dD86IGFueSk6IF8uRGljdGlvbmFyeTxUTW9kZWxbXT47XG4g4piFIGdyb3VwQnkoaXRlcmF0b3I6IHN0cmluZywgY29udGV4dD86IGFueSk6IF8uRGljdGlvbmFyeTxUTW9kZWxbXT47XG4g4piFIGhlYWQoKTogVE1vZGVsO1xuIOKYhSBoZWFkKG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBpbmNsdWRlKHZhbHVlOiBUTW9kZWwpOiBib29sZWFuO1xuIOKYhSBpbmNsdWRlcyh2YWx1ZTogVE1vZGVsKTogYm9vbGVhbjtcbiDimIUgaW5kZXhCeShpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBhbnk+LCBjb250ZXh0PzogYW55KTogXy5EaWN0aW9uYXJ5PFRNb2RlbD47XG4g4piFIGluZGV4QnkoaXRlcmF0b3I6IHN0cmluZywgY29udGV4dD86IGFueSk6IF8uRGljdGlvbmFyeTxUTW9kZWw+O1xuIOKYhSBpbmRleE9mKHZhbHVlOiBUTW9kZWwsIGlzU29ydGVkPzogYm9vbGVhbik6IG51bWJlcjtcbiDimIUgaW5pdGlhbCgpOiBUTW9kZWw7XG4g4piFIGluaXRpYWwobjogbnVtYmVyKTogVE1vZGVsW107XG4g4piFIGluamVjdDxUUmVzdWx0PihpdGVyYXRvcjogXy5NZW1vSXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgbWVtbz86IFRSZXN1bHQsIGNvbnRleHQ/OiBhbnkpOiBUUmVzdWx0O1xuIOKYhSBpbnZva2UobWV0aG9kTmFtZTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IGFueTtcbiDimIUgaXNFbXB0eSgpOiBib29sZWFuO1xuIOKYhSBsYXN0KCk6IFRNb2RlbDtcbiDimIUgbGFzdChuOiBudW1iZXIpOiBUTW9kZWxbXTtcbiDimIUgbGFzdEluZGV4T2YodmFsdWU6IFRNb2RlbCwgZnJvbT86IG51bWJlcik6IG51bWJlcjtcbiDimIUgbWFwPFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBjb250ZXh0PzogYW55KTogVFJlc3VsdFtdO1xuIOKYhSBtYXgoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGFueT4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWw7XG4g4piFIG1pbihpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYW55PiwgY29udGV4dD86IGFueSk6IFRNb2RlbDtcbiDimIUgcGFydGl0aW9uKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+KTogVE1vZGVsW11bXTtcbiDimIUgcmVkdWNlPFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLk1lbW9JdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBtZW1vPzogVFJlc3VsdCwgY29udGV4dD86IGFueSk6IFRSZXN1bHQ7XG4g4piFIHJlZHVjZVJpZ2h0PFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLk1lbW9JdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBtZW1vPzogVFJlc3VsdCwgY29udGV4dD86IGFueSk6IFRSZXN1bHQ7XG4g4piFIHJlamVjdChpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IFRNb2RlbFtdO1xuIOKYhSByZXN0KG4/OiBudW1iZXIpOiBUTW9kZWxbXTtcbiDimIUgc2FtcGxlKCk6IFRNb2RlbDtcbiDimIUgc2FtcGxlKG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBzZWxlY3QoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgc2h1ZmZsZSgpOiBUTW9kZWxbXTtcbiDimIUgc2l6ZSgpOiBudW1iZXI7XG4g4piFIHNvbWUoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogYm9vbGVhbjtcbiDimIUgc29ydEJ5PFRTb3J0PihpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgVFNvcnQ+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIHNvcnRCeShpdGVyYXRvcjogc3RyaW5nLCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIHRhaWwobj86IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSB0YWtlKCk6IFRNb2RlbDtcbiDimIUgdGFrZShuOiBudW1iZXIpOiBUTW9kZWxbXTtcbiDimIUgdG9BcnJheSgpOiBUTW9kZWxbXTtcblxu4piFIG1vZGVsIOOBruaJgOWxnuOBqyBjb2xsZWN0aW9uIOOBriBpZCDjgpLmm7jjgY3ovrzjgoDjgYvjgoJcbiAgIOOBneOBruWgtOWQiCBfcHJlcGFyZU1vZGVsLCBfcmVtb3ZlUmVmZXJlbmNlIOOBq+OCguWvvuW/nOOBjOW/heimgVxuXG4tIEV2ZW50OlxuICAgICdAYWRkJzogW1RJdGVtLCBDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvblNldE9wdGlvbnNdO1xuICAgICdAcmVtb3ZlJzogW1RJdGVtLCBDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvblNldE9wdGlvbnNdO1xuICAgICdAdXBkYXRlJzogW0NvbGxlY3Rpb24gPCBUSXRlbSA+LCBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uc107XG4gICAgJ0ByZXNldCc6IFtDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvbkFkZE9wdGlvbnNdO1xuICAgICdAc29ydCc6IFtDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvblNldE9wdGlvbnNdO1xuICAgICdAc3luYyc6IFtDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgUGxhaW5PYmplY3QsIENvbGxlY3Rpb25EYXRhU3luY09wdGlvbnNdO1xuICAgICdAZGVzdHJveSc6IFtUSXRlbSwgQ29sbGVjdGlvbiA8IFRJdGVtID4sIE1vZGVsRGVzdHJveU9wdGlvbnNdO1xuICAgICdAZXJyb3InOiBbQ29sbGVjdGlvbiA8IFRJdGVtID4sIEVycm9yLCBDb2xsZWN0aW9uRGF0YVN5bmNPcHRpb25zXTtcbiAqL1xuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7O0FBTUEsZ0RBZUM7QUFmRDs7Ozs7SUFVSTtJQUFBO1FBQ0ksZ0dBQWlELENBQUE7UUFDakQsc0RBQWdDLFlBQUEsa0JBQWtCLGdCQUF1QixzQkFBNkIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLDhCQUFBLENBQUE7UUFDM0gsMkRBQWdDLFlBQUEsa0JBQWtCLGdCQUF1QixzQkFBNkIsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLG1DQUFBLENBQUE7S0FDbkksSUFBQTtBQUNMLENBQUM7O0FDUkQ7QUFDQSxJQUFJLFNBQVMsR0FBcUI7SUFDOUIsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQztBQUVGOzs7Ozs7Ozs7O1NBVWdCLHVCQUF1QixDQUFDLFdBQThCO0lBQ2xFLElBQUksSUFBSSxJQUFJLFdBQVcsRUFBRTtRQUNyQixPQUFPLFNBQVMsQ0FBQztLQUNwQjtTQUFNO1FBQ0gsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDO1FBQzlCLFNBQVMsR0FBRyxXQUFXLENBQUM7UUFDeEIsT0FBTyxXQUFXLENBQUM7S0FDdEI7QUFDTCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O1NBV2dCLG1CQUFtQixDQUErQixJQUFPLEVBQUUsS0FBZ0I7SUFDdkYsT0FBTyxDQUFDLEdBQU0sRUFBRSxHQUFNOztRQUVsQixNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBYyxDQUFDLElBQUksR0FBRyxDQUFDLElBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN6RSxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsSUFBYyxDQUFDLElBQUksR0FBRyxDQUFDLElBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN6RSxPQUFPLEtBQUssR0FBRyxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ3hELENBQUM7QUFDTixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O1NBV2dCLGlCQUFpQixDQUErQixJQUFPLEVBQUUsS0FBZ0I7SUFDckYsT0FBTyxDQUFDLEdBQU0sRUFBRSxHQUFNO1FBQ2xCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFjLENBQUMsQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBYyxDQUFDLENBQUM7UUFDcEMsSUFBSSxPQUFPLEtBQUssT0FBTyxFQUFFOztZQUVyQixPQUFPLENBQUMsQ0FBQztTQUNaO2FBQU0sSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFOztZQUV4QixPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUNyQjthQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sRUFBRTs7WUFFeEIsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ3BCO2FBQU07WUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNDLElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtnQkFDdkIsT0FBTyxDQUFDLENBQUM7YUFDWjtpQkFBTTtnQkFDSCxRQUFRLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxLQUFLLEVBQUU7YUFDekQ7U0FDSjtLQUNKLENBQUM7QUFDTixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O1NBV2dCLG9CQUFvQixDQUErQixJQUFPLEVBQUUsS0FBZ0I7SUFDeEYsT0FBTyxDQUFDLEdBQU0sRUFBRSxHQUFNO1FBQ2xCLElBQUksR0FBRyxDQUFDLElBQWMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFjLENBQUMsRUFBRTtZQUM3QyxPQUFPLENBQUMsQ0FBQztTQUNaO2FBQU0sSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLElBQWMsQ0FBQyxFQUFFOztZQUVwQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUNyQjthQUFNLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFjLENBQUMsRUFBRTs7WUFFcEMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ3BCO2FBQU07WUFDSCxRQUFRLEdBQUcsQ0FBQyxJQUFjLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxLQUFLLEVBQUU7U0FDL0U7S0FDSixDQUFDO0FBQ04sQ0FBQztBQUVEOzs7O01BSWEsb0JBQW9CLEdBQUcscUJBQXFCO0FBRXpEOzs7O01BSWEsbUJBQW1CLEdBQUcscUJBQXFCO0FBRXhEOzs7O1NBSWdCLFlBQVksQ0FBK0IsT0FBbUI7SUFDMUUsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztJQUM5QixRQUFRLE9BQU8sQ0FBQyxJQUFJO1FBQ2hCLEtBQUssUUFBUTtZQUNULE9BQU8sbUJBQW1CLENBQU8sUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5RCxLQUFLLFNBQVM7WUFDVixPQUFPLG9CQUFvQixDQUFPLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0QsS0FBSyxRQUFRO1lBQ1QsT0FBTyxtQkFBbUIsQ0FBTyxRQUFRLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlELEtBQUssTUFBTTtZQUNQLE9BQU8saUJBQWlCLENBQU8sUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1RDtZQUNJLE9BQU8sb0JBQW9CLENBQU8sUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNsRTtBQUNMLENBQUM7QUFFRDs7OztTQUlnQixlQUFlLENBQStCLFFBQXNCO0lBQ2hGLE1BQU0sV0FBVyxHQUFzQixFQUFFLENBQUM7SUFDMUMsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUU7UUFDNUIsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUMzQztJQUNELE9BQU8sV0FBVyxDQUFDO0FBQ3ZCOztBQ3BKQTs7Ozs7O01BTWEsV0FBVzs7Ozs7Ozs7Ozs7SUFvQnBCLFlBQVksS0FBVSxFQUFFLFlBQVksR0FBRyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO1FBQzNCLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztTQUNqQzthQUFNO1lBQ0gsSUFBSSxDQUFDLE1BQU0seUJBQTBCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1NBQ3JCO0tBQ0o7Ozs7Ozs7Ozs7OztJQWFNLEtBQUssQ0FBQyxRQUFhLEVBQUUsRUFBRTtRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztRQUMzQixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNkLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7U0FDakM7YUFBTTtZQUNILElBQUksQ0FBQyxNQUFNLHlCQUEwQjtZQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztTQUNyQjtRQUNELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7Ozs7Ozs7SUFTRCxJQUFJLE9BQU87UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ25DOzs7OztJQU1ELElBQUksS0FBSztRQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztLQUN0Qjs7Ozs7SUFNRCxJQUFJLE1BQU07UUFDTixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0tBQzdCOzs7OztJQU1ELElBQUksS0FBSztRQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztLQUNwQjs7Ozs7SUFNRCxJQUFJLEtBQUs7UUFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7S0FDcEI7Ozs7O0lBTUQsSUFBSSxLQUFLO1FBQ0wsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0tBQ3RCOzs7Ozs7O0lBU00sU0FBUztRQUNaLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNmLElBQUksQ0FBQyxNQUFNLHlCQUEwQjtZQUNyQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztTQUNwQjtRQUNELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7Ozs7O0lBTU0sUUFBUTtRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNmLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7SUFNTSxRQUFRO1FBQ1gsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1gsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7WUFDbEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7U0FDbkI7YUFBTTtZQUNILElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNqQjtRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDZixJQUFJLENBQUMsTUFBTSx5QkFBMEI7WUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDcEI7UUFDRCxPQUFPLElBQUksQ0FBQztLQUNmOzs7OztJQU1NLFlBQVk7UUFDZixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztZQUNsQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1NBQ2pDO2FBQU07WUFDSCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDakI7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2YsSUFBSSxDQUFDLE1BQU0seUJBQTBCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7Ozs7Ozs7SUFZTSxJQUFJLENBQUMsUUFBNkI7UUFDckMsSUFBSSxRQUFRLEtBQUssT0FBTyxRQUFRLEVBQUU7WUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7U0FDMUI7YUFBTTtZQUNILElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDakQ7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2YsSUFBSSxDQUFDLE1BQU0seUJBQTBCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLENBQUM7S0FDZjs7Ozs7Ozs7OztJQVlPLEtBQUs7UUFDVCxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7S0FDakU7OztBQzlOTDtBQUNBLFNBQVMsV0FBVyxDQUFJLE1BQTBCLEVBQUUsS0FBVztJQUMzRCxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU87UUFDdEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUErQjtZQUM3QyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JCLElBQUksS0FBSyxFQUFFO2dCQUNQLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQixLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7YUFDekI7WUFDRCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDcEIsQ0FBQztRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdkIsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUVEO0FBQ0EsZUFBZSxjQUFjLENBQ3pCLE1BQWdDLEVBQ2hDLEtBQW1CO0lBRW5CLElBQUksTUFBTSxZQUFZLGVBQWUsRUFBRTtRQUNuQyxNQUFNQSxhQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEIsT0FBTztZQUNILE1BQU0sRUFBRSxNQUFNO1lBQ2QsT0FBTyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUM7U0FDL0IsQ0FBQztLQUNMO1NBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzlCLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsTUFBTUEsYUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hCLE9BQU87WUFDSCxNQUFNO1lBQ04sT0FBTyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1NBQ3ZDLENBQUM7S0FDTDtTQUFNO1FBQ0gsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO0tBQzFGO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7OztBQWNPLGVBQWUsVUFBVSxDQUFJLE1BQWdDLEVBQUUsS0FBbUI7SUFDckYsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtRQUNwQixPQUFPLEVBQUUsQ0FBQztLQUNiO0lBRUQsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFaEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRWhDLE9BQU8sT0FBTyxDQUFDO0FBQ25CLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQk8sZUFBZSxXQUFXLENBQUksTUFBZ0MsRUFBRSxHQUFRLEVBQUUsS0FBbUI7SUFDaEcsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQ2hDLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVoRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFcEIsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CTyxlQUFlLFdBQVcsQ0FBSSxNQUFnQyxFQUFFLEtBQWEsRUFBRSxHQUFRLEVBQUUsS0FBbUI7O0lBRS9HLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtRQUNuRSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLDJDQUEyQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQ25HO1NBQU0sSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQ3ZDLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVoRSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUVoQyxPQUFPLE9BQU8sQ0FBQztBQUNuQixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JPLGVBQWUsWUFBWSxDQUFJLE1BQWdDLEVBQUUsS0FBYSxFQUFFLE1BQWdCLEVBQUUsS0FBbUI7O0lBRXhILElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtRQUNuRSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLDJDQUEyQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQ25HO1NBQU0sSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQzdDLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQzs7SUFHaEUsSUFBSSxJQUFJLEdBQWlCLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUM7UUFDSSxNQUFNLFFBQVEsR0FBUSxFQUFFLENBQUM7UUFDekIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDO1NBQ3RCO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLO1lBQ3JCLE9BQU8sSUFBSSxJQUFJLEtBQUssQ0FBQztTQUN4QixDQUFDLENBQUM7S0FDTjs7SUFHRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUMzQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBTSxDQUFDO0tBQ2hDO0lBRUQsT0FBTyxPQUFPLENBQUM7QUFDbkIsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCTyxlQUFlLFdBQVcsQ0FBSSxNQUFnQyxFQUFFLE1BQWdCLEVBQUUsS0FBbUI7SUFDeEcsSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQ3RDLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQzs7SUFHaEUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHO1FBQ2pCLFFBQVEsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7S0FDL0IsQ0FBQyxDQUFDO0lBRUgsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDaEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDM0I7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNuQjs7QUNuTkE7U0FDZ0IsS0FBSyxDQUFtQixJQUFhLEVBQUUsS0FBc0I7SUFDekUsT0FBTyxDQUFDLElBQU8sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDO0FBQzdDLENBQUM7QUFFRDtTQUNnQixRQUFRLENBQW1CLElBQWEsRUFBRSxLQUFzQjtJQUM1RSxPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUM7QUFDN0MsQ0FBQztBQUVEO1NBQ2dCLE9BQU8sQ0FBbUIsSUFBYSxFQUFFLEtBQTZCO0lBQ2xGLE9BQU8sQ0FBQyxJQUFPLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztBQUMzQyxDQUFDO0FBRUQ7U0FDZ0IsSUFBSSxDQUFtQixJQUFhLEVBQUUsS0FBNkI7SUFDL0UsT0FBTyxDQUFDLElBQU8sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQzNDLENBQUM7QUFFRDtTQUNnQixZQUFZLENBQW1CLElBQWEsRUFBRSxLQUE2QjtJQUN2RixPQUFPLENBQUMsSUFBTyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7QUFDNUMsQ0FBQztBQUVEO1NBQ2dCLFNBQVMsQ0FBbUIsSUFBYSxFQUFFLEtBQTZCO0lBQ3BGLE9BQU8sQ0FBQyxJQUFPLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQztBQUM1QyxDQUFDO0FBRUQ7U0FDZ0IsSUFBSSxDQUFtQixJQUFhLEVBQUUsS0FBeUI7SUFDM0UsT0FBTyxDQUFDLElBQU8sS0FBSyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztBQUN6RyxDQUFDO0FBRUQ7U0FDZ0IsT0FBTyxDQUFtQixJQUFhLEVBQUUsS0FBeUI7SUFDOUUsT0FBTyxDQUFDLElBQU8sS0FBSyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztBQUN6RyxDQUFDO0FBRUQ7U0FDZ0IsYUFBYSxDQUFtQixJQUFhLEVBQUUsS0FBYSxFQUFFLElBQTZCO0lBQ3ZHLE9BQU8sQ0FBQyxJQUFPO1FBQ1gsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sSUFBSSxJQUFLLElBQUksQ0FBQyxJQUFJLENBQXFCLENBQUM7S0FDbEQsQ0FBQztBQUNOLENBQUM7QUFFRDtTQUNnQixnQkFBZ0IsQ0FBbUIsSUFBYSxFQUFFLEtBQWEsRUFBRSxJQUE2QjtJQUMxRyxPQUFPLENBQUMsSUFBTztRQUNYLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RCxPQUFPLEVBQUUsSUFBSSxJQUFLLElBQUksQ0FBQyxJQUFJLENBQXFCLENBQUMsQ0FBQztLQUNyRCxDQUFDO0FBQ04sQ0FBQztBQUVEO1NBQ2dCLEtBQUssQ0FBbUIsSUFBYSxFQUFFLEdBQTJCLEVBQUUsR0FBMkI7SUFDM0csT0FBTyxXQUFXLGNBQXlCLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzlGLENBQUM7QUFFRDtTQUNnQixXQUFXLENBQW1CLElBQXdCLEVBQUUsR0FBc0IsRUFBRSxHQUFrQztJQUM5SCxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQU87UUFDeEIsUUFBUSxJQUFJO1lBQ1I7Z0JBQ0ksT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDO2dCQUNJLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQztnQkFDSSxPQUFPLENBQUMsSUFBSSxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQyxDQUFDOztnQkFFN0MsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3JDO0tBQ0osQ0FBQztBQUNOOztBQ3pEQTs7OztNQUlhLGdCQUFnQjs7Ozs7Ozs7SUFnQnpCLFlBQVksUUFBMkMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFO1FBQ3BFLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUMzRSxJQUFJLENBQUMsVUFBVSxHQUFPLFNBQVMsQ0FBQztRQUNoQyxJQUFJLENBQUMsWUFBWSxHQUFLLElBQUksSUFBSSxXQUFXLEdBQUcsV0FBVyxlQUEwQjtRQUNqRixJQUFJLENBQUMsUUFBUSxHQUFTLElBQUksSUFBSSxPQUFPLEdBQUcsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsTUFBTSxHQUFXLEtBQUssQ0FBQztRQUM1QixJQUFJLENBQUMsT0FBTyxHQUFVLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDL0IsSUFBSSxDQUFDLFNBQVMsR0FBUSxRQUFRLElBQUksRUFBRSxDQUFDO0tBQ3hDOzs7SUFLRCxJQUFJLFNBQVM7UUFDVCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7S0FDMUI7SUFFRCxJQUFJLFNBQVMsQ0FBQyxNQUF1QztRQUNqRCxJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQztLQUM1QjtJQUVELElBQUksT0FBTztRQUNQLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztLQUN4QjtJQUVELElBQUksT0FBTyxDQUFDLE1BQXVCO1FBQy9CLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0tBQzFCO0lBRUQsSUFBSSxXQUFXO1FBQ1gsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0tBQzVCO0lBRUQsSUFBSSxXQUFXLENBQUMsS0FBeUI7UUFDckMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7S0FDN0I7SUFFRCxJQUFJLEtBQUs7UUFDTCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7S0FDdEI7SUFFRCxJQUFJLEtBQUssQ0FBQyxLQUErQztRQUNyRCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztLQUN2QjtJQUVELElBQUksTUFBTTtRQUNOLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztLQUN2QjtJQUVELElBQUksTUFBTSxDQUFDLEtBQWM7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7S0FDeEI7SUFFRCxJQUFJLFFBQVE7UUFDUixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7S0FDekI7SUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUF1QjtRQUNoQyxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztLQUMzQjs7Ozs7OztJQVNELElBQUksV0FBVztRQUNYLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUMxQzs7Ozs7SUFNRCxJQUFJLE1BQU07UUFDTixJQUFJLElBQXVDLENBQUM7UUFFNUMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2hDLFFBQVEsSUFBSSxDQUFDLFFBQVE7Z0JBQ2pCO29CQUNJLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsS0FBSyxDQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQTRCLENBQUMsRUFDMUQsSUFBSSxDQUNQLENBQUM7b0JBQ0YsTUFBTTtnQkFDVjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLFFBQVEsQ0FBUSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUE0QixDQUFDLEVBQzdELElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixPQUFPLENBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBbUMsQ0FBQyxFQUNuRSxJQUFJLENBQ1AsQ0FBQztvQkFDRixNQUFNO2dCQUNWO29CQUNJLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQW1DLENBQUMsRUFDaEUsSUFBSSxDQUNQLENBQUM7b0JBQ0YsTUFBTTtnQkFDVjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLFlBQVksQ0FBUSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFtQyxDQUFDLEVBQ3hFLElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixTQUFTLENBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBbUMsQ0FBQyxFQUNyRSxJQUFJLENBQ1AsQ0FBQztvQkFDRixNQUFNO2dCQUNWO29CQUNJLElBQUksR0FBRyxXQUFXLENBQ2QsSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQStCLENBQUMsRUFDNUQsSUFBSSxDQUNQLENBQUM7b0JBQ0YsTUFBTTtnQkFDVjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLE9BQU8sQ0FBUSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUErQixDQUFDLEVBQy9ELElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixhQUFhLENBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBZSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDaEUsSUFBSSxDQUNQLENBQUM7b0JBQ0YsTUFBTTtnQkFDVjtvQkFDSSxJQUFJLEdBQUcsV0FBVyxDQUNkLElBQUksQ0FBQyxZQUFZLEVBQ2pCLGdCQUFnQixDQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ25FLElBQUksQ0FDUCxDQUFDO29CQUNGLE1BQU07Z0JBQ1Y7b0JBQ0ksSUFBSSxHQUFHLFdBQVcsQ0FDZCxJQUFJLENBQUMsWUFBWSxFQUNqQixLQUFLLENBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBbUMsRUFBRSxJQUFJLENBQUMsS0FBbUMsQ0FBQyxFQUMzRyxJQUFJLENBQ1AsQ0FBQztvQkFDRixNQUFNO2dCQUNWO29CQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQXFCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUNuRCxNQUFNO2FBQ2I7U0FDSjtRQUVELE9BQU8sSUFBSSxLQUFLLGlCQUFnQixJQUFJLENBQUMsQ0FBQztLQUN6Qzs7O0FDbE1MLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFRdkI7QUFFQTs7OztTQUlnQixXQUFXLENBQVEsS0FBYyxFQUFFLE1BQXFDLEVBQUUsR0FBRyxXQUFrQztJQUMzSCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdkUsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7UUFDbEMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDeEIsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDckM7S0FDSjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFFRDtBQUVBO0FBQ0EsZUFBZSxjQUFjLENBQ3pCLE1BQWUsRUFDZixPQUFnRDtJQUVoRCxNQUFNLEVBQ0YsTUFBTSxFQUNOLFdBQVcsRUFDWCxLQUFLLEVBQUUsU0FBUyxFQUNoQixLQUFLLEVBQ0wsTUFBTSxFQUFFLEtBQUssRUFDYixRQUFRLEVBQ1IsSUFBSSxFQUNKLFFBQVEsR0FDWCxHQUFHLE9BQU8sQ0FBQzs7SUFHWixNQUFNLE9BQU8sR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFFeEYsSUFBSSxLQUFLLEdBQVcsQ0FBQyxJQUFJLElBQUksU0FBUyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFFeEQsT0FBTyxJQUFJLEVBQUU7UUFDVCxNQUFNQSxhQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUU7WUFDaEUsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ3JGO2FBQU0sSUFBSSxJQUFJLElBQUksS0FBSyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFO1lBQ2hFLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxrQkFBbUIsS0FBTSxFQUFFLENBQUMsQ0FBQztTQUN2RjtRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMvQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksSUFBSSxLQUFLLElBQUksS0FBSyxHQUFHLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQztRQUVqRixNQUFNLE1BQU0sR0FBRztZQUNYLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTTtZQUNyQixLQUFLLEVBQUUsTUFBTTtZQUNiLE9BQU8sRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFtQztTQUN4QixDQUFDOztRQUdsQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN0QixRQUFRLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUM7U0FDM0I7UUFFRCxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3ZCLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxLQUFLLEdBQUcsS0FBSyxFQUFFOztnQkFFakMsTUFBTSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7YUFDMUI7aUJBQU07Z0JBQ0gsS0FBSyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQ3ZCLFNBQVM7YUFDWjtTQUNKO1FBRUQsT0FBTyxNQUFNLENBQUM7S0FDakI7QUFDTCxDQUFDO0FBRUQ7QUFDQSxlQUFlLGlCQUFpQixDQUM1QixRQUE2QyxFQUM3QyxPQUE0QztJQUU1QyxNQUFNLEVBQ0YsS0FBSyxFQUFFLFNBQVMsRUFDaEIsS0FBSyxFQUNMLE1BQU0sRUFBRSxLQUFLLEVBQ2IsUUFBUSxFQUNSLElBQUksR0FDUCxHQUFHLE9BQU8sQ0FBQztJQUVaLE1BQU0sT0FBTyxHQUFZLEVBQUUsQ0FBQztJQUU1QixJQUFJLEtBQUssR0FBVyxDQUFDLElBQUksSUFBSSxTQUFTLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUV4RCxPQUFPLElBQUksRUFBRTtRQUNULE1BQU1BLGFBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRTtZQUNyQyxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDckY7YUFBTSxJQUFJLElBQUksSUFBSSxLQUFLLEtBQUssS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUU7WUFDaEUsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ3JGO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXBDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFOUIsTUFBTSxNQUFNLEdBQUc7WUFDWCxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDbkIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO1lBQ25CLE9BQU8sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBa0M7U0FDcEQsQ0FBQzs7UUFHbEMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDdEIsUUFBUSxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1NBQzNCO1FBRUQsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN2QixJQUFJLE1BQU0sQ0FBQyxLQUFLLElBQUksS0FBSyxHQUFHLEtBQUssRUFBRTs7Z0JBRS9CLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO2FBQzFCO2lCQUFNO2dCQUNILEtBQUssSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDN0IsU0FBUzthQUNaO1NBQ0o7UUFFRCxPQUFPLE1BQU0sQ0FBQztLQUNqQjtBQUNMLENBQUM7QUFFRDtBQUVBO0FBQ0EsTUFBTSxjQUFjLEdBQUc7SUFDbkIsaUJBQXNCLElBQUk7SUFDMUIsZUFBd0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO0lBQ3BDLGtCQUF3QixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7SUFDdkMsa0JBQXdCLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQUU7SUFDNUMsZ0JBQXdCLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO0lBQ2pELGVBQXdCLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRTtJQUN0RCxjQUF3QixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7SUFDdkMsY0FBd0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRTtJQUM5QyxjQUF3QixFQUFFLEtBQUssRUFBRSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRTtJQUNyRCxjQUF3QixFQUFFLEtBQUssRUFBRSxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEVBQUU7Q0FDL0QsQ0FBQztBQUVGOzs7Ozs7Ozs7OztTQVdnQixjQUFjLENBQzFCLEtBQWMsRUFDZCxTQUF3QztJQUV4QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFFN0MsSUFBSSxNQUFNLEVBQUU7UUFDUixPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3hCO0lBRUQsSUFBSSxLQUFLLEVBQUU7UUFDUCxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDcEMsTUFBTSxLQUFLLEdBQVksRUFBRSxDQUFDO1FBQzFCLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDekIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDdEIsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDWCxLQUFLLEVBQUUsQ0FBQzthQUNYO2lCQUFNLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFtQixDQUFDLEVBQUU7Z0JBQzFDLEtBQUssS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQW1CLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNqRTtpQkFBTTtnQkFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLDJCQUEyQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNoRCxTQUFTO2FBQ1o7WUFFRCxJQUFJLFVBQVUsR0FBRyxLQUFLLEVBQUU7Z0JBQ3BCLElBQUksTUFBTSxFQUFFO29CQUNSLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3BCO2dCQUNELE1BQU07YUFDVDtpQkFBTTtnQkFDSCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BCO1NBQ0o7UUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFDO0tBQ2pCO0lBRUQsTUFBTSxNQUFNLEdBQUc7UUFDWCxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU07UUFDbkIsS0FBSztLQUNxQyxDQUFDO0lBRS9DLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUU7UUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDdEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7Z0JBQ3ZCLElBQUksRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLEVBQUU7b0JBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQXVCLEdBQUcsQ0FBQyxDQUFDO2lCQUMxQztnQkFDQSxNQUFNLENBQUMsR0FBRyxDQUF1QixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUMzRDtTQUNKO0tBQ0o7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNsQixDQUFDO0FBRUQ7QUFFQTtBQUNBLFNBQVMsYUFBYSxDQUNsQixPQUF3RDtJQUV4RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3RELE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBRXBDLElBQUksQ0FBQyxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxFQUFFO1FBQ2xFLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ2hEO0lBRUQsT0FBTyxJQUErQyxDQUFDO0FBQzNELENBQUM7QUFFRDtBQUNBLFNBQVMsUUFBUSxDQUF1QixNQUFvQyxFQUFFLE9BQXNDO0lBQ2hILE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQ3RDLE9BQU8sQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztBQUN6RSxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0FBY08sZUFBZSxVQUFVLENBQzVCLFNBQTJDLEVBQzNDLFFBQTZDLEVBQzdDLE9BQTZDO0lBRTdDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7O0lBRy9DLFNBQVMsQ0FBQyxRQUFRLEdBQU0sUUFBUSxDQUFDO0lBQ2pDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ3BDLFNBQVMsQ0FBQyxNQUFNLEdBQVEsTUFBTSxDQUFDO0lBRS9CLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRTtRQUNqQixPQUFPLENBQUMsTUFBTSxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDO0tBQ3BFO1NBQU07UUFDSCxJQUFJLE1BQU0sR0FBRyxNQUFNLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBd0MsQ0FBQztRQUNqRSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQUU7WUFDNUIsU0FBUyxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztTQUNsQztRQUVELE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQztRQUMvQyxJQUFJLElBQUksRUFBRTtZQUNOLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsTUFBTSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQy9CLE1BQU0sQ0FBQyxLQUFLLEVBQ1osU0FBUyxDQUFDLE1BQU0sRUFDaEIsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUMzQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRWQsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFO2dCQUNqQixNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7YUFDbEM7U0FDSjtRQUVELE9BQU8sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7S0FDdEY7QUFDTDs7QUNsUkEsTUFBTSxXQUFXLEdBQWUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3JELE1BQU0sdUJBQXVCLEdBQUcsTUFBTSxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDbkUsTUFBTSxhQUFhLEdBQWEsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sYUFBYSxHQUFhLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4RCxNQUFNLGFBQWEsR0FBYSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEQsTUFBTSxnQkFBZ0IsR0FBVSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzRCxNQUFNLGFBQWEsR0FBYSxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQVk5RDtBQUNBLE1BQU0sZUFBZSxHQUFHLENBQXNDLE9BQXVCO0lBQ2pGLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQztBQUVGO0FBQ0EsTUFBTSxpQkFBaUIsR0FBRyxDQUFzQyxPQUFxQztJQUNqRyxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUM3RCxPQUFPO1FBQ0gsUUFBUSxFQUFFLElBQUksSUFBSSxFQUFFO1FBQ3BCLFdBQVcsRUFBRSxLQUFLLElBQUksZUFBZSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7S0FDcEQsQ0FBQztBQUNOLENBQUMsQ0FBQztBQUVGO0FBQ0EsTUFBTSxnQkFBZ0IsR0FBRyxDQUFtQixJQUFnQztJQUN4RSxPQUFPLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUM7QUFDekMsQ0FBQyxDQUFDO0FBRUY7QUFDQSxNQUFNLFVBQVUsR0FBRyxDQUFtQixLQUFRLEVBQUUsSUFBZ0M7SUFDNUUsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUM7QUFFRjtBQUNBLE1BQU0sYUFBYSxHQUFHLENBQW1CLEdBQVcsRUFBRSxJQUFnQztJQUVsRixNQUFNLEtBQUssR0FBRyxHQUFnQixDQUFDO0lBRS9CLE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ2YsT0FBTyxTQUFTLENBQUM7S0FDcEI7SUFFRCxPQUFPLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDO0FBQ3BILENBQUMsQ0FBQztBQUVGO0FBQ0EsTUFBTSxnQkFBZ0IsR0FBRyxDQUFvRSxJQUF5QjtJQUNsSCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDO0FBRUY7QUFDQSxNQUFNLGlCQUFpQixHQUFHLENBQW9FLENBQVUsRUFBRSxJQUF5QjtJQUMvSCxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxHQUFHLEtBQUssQ0FBQztBQUN4RCxDQUFDLENBQUM7QUFFRjtBQUNBLE1BQU0sV0FBVyxHQUFHLENBQUksTUFBVyxFQUFFLE1BQVcsRUFBRSxFQUFVO0lBQ3hELEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUM7QUFFRixNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDN0QsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUVqRDtBQUVBOzs7Ozs7TUFNc0IsVUFDbEIsU0FBUSxXQUFrQjs7Ozs7Ozs7Ozs7SUF3QjFCLFlBQVksS0FBZ0MsRUFBRSxPQUErQztRQUN6RixLQUFLLEVBQUUsQ0FBQztRQUNSLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXhDLE1BQU0sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTVDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRztZQUNoQixHQUFHLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFDM0IsbUJBQW1CLEVBQUUsWUFBb0Q7WUFDekUsU0FBUyxFQUFFLEVBQXVDO1lBQ2xELG1CQUFtQixFQUFFLFlBQVk7WUFDakMsSUFBSSxFQUFFLElBQUksR0FBRyxFQUFrQjtZQUMvQixLQUFLLEVBQUUsRUFBRTtTQUNjLENBQUM7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7O1FBSXZDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQWEsRUFBRSxLQUF5QixFQUFFLFVBQWdCLEVBQUUsT0FBbUM7WUFDbEgsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRTtnQkFDaEMsSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLElBQUksU0FBUyxLQUFLLEtBQUssS0FBSyxVQUFVLEtBQUssSUFBSSxFQUFFO29CQUNsRSxPQUFPO2lCQUNWO2dCQUNELElBQUksVUFBVSxLQUFLLEtBQUssRUFBRTs7b0JBRXRCLE9BQU8sR0FBSSxVQUFrQixDQUFDO29CQUM5QixVQUFVLEdBQUcsSUFBSSxDQUFDO29CQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztpQkFDL0I7Z0JBQ0QsSUFBSSxTQUFTLEtBQUssS0FBSyxFQUFFO29CQUNyQixNQUFNLEdBQUcsR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3pELElBQUksR0FBRyxFQUFFO3dCQUNMLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDO3dCQUMzQixJQUFJLE1BQU0sS0FBSyxFQUFFLEVBQUU7NEJBQ2YsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzs0QkFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ3BCLElBQUksSUFBSSxJQUFJLE1BQU0sRUFBRTtnQ0FDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzs2QkFDdkI7eUJBQ0o7cUJBQ0o7aUJBQ0o7YUFDSjs7WUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDOUQsQ0FBQztRQUVGLElBQUksS0FBSyxFQUFFO1lBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzVEO0tBQ0o7Ozs7Ozs7SUFTRCxJQUFJLEVBQUU7UUFDRixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUM7S0FDaEM7Ozs7O0lBTUQsSUFBSSxNQUFNO1FBQ04sT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQ2xDOzs7OztJQU1ELElBQUksTUFBTTtRQUNOLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7S0FDekM7Ozs7Ozs7SUFTRCxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDYixNQUFNLFFBQVEsR0FBRztZQUNiLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSztZQUM3QixPQUFPLEVBQUUsQ0FBQztZQUNWLElBQUk7Z0JBQ0EsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO29CQUNqQyxPQUFPO3dCQUNILElBQUksRUFBRSxLQUFLO3dCQUNYLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztxQkFDbkMsQ0FBQztpQkFDTDtxQkFBTTtvQkFDSCxPQUFPO3dCQUNILElBQUksRUFBRSxJQUFJO3dCQUNWLEtBQUssRUFBRSxTQUFVO3FCQUNwQixDQUFDO2lCQUNMO2FBQ0o7U0FDSixDQUFDO1FBQ0YsT0FBTyxRQUE0QixDQUFDO0tBQ3ZDOzs7OztJQU1ELE9BQU87UUFDSCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBVyxFQUFFLEtBQWEsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0tBQ3RGOzs7OztJQU1ELElBQUk7UUFDQSxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBVyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0tBQzlEOzs7OztJQU1ELE1BQU07UUFDRixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsR0FBVyxFQUFFLEtBQWEsS0FBSyxLQUFLLENBQUMsQ0FBQztLQUMvRTs7SUFHTyxDQUFDLHVCQUF1QixDQUFDLENBQUksY0FBaUQ7UUFDbEYsTUFBTSxPQUFPLEdBQUc7WUFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUs7WUFDN0IsT0FBTyxFQUFFLENBQUM7U0FDYixDQUFDO1FBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFXO1lBQ3hCLE9BQU8sVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDL0UsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUF3QjtZQUNsQyxJQUFJO2dCQUNBLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQ2hDLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO29CQUMvQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2xCLE9BQU87d0JBQ0gsSUFBSSxFQUFFLEtBQUs7d0JBQ1gsS0FBSyxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDakUsQ0FBQztpQkFDTDtxQkFBTTtvQkFDSCxPQUFPO3dCQUNILElBQUksRUFBRSxJQUFJO3dCQUNWLEtBQUssRUFBRSxTQUFVO3FCQUNwQixDQUFDO2lCQUNMO2FBQ0o7WUFDRCxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7Z0JBQ2IsT0FBTyxJQUFJLENBQUM7YUFDZjtTQUNKLENBQUM7UUFFRixPQUFPLFFBQVEsQ0FBQztLQUNuQjs7Ozs7OztJQVNELElBQWMsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUM7S0FDdEM7Ozs7O0lBTUQsSUFBYyxVQUFVLENBQUMsR0FBc0M7UUFDM0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUM7S0FDckM7Ozs7Ozs7SUFRUyxhQUFhO1FBQ25CLE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7S0FDbkU7Ozs7Ozs7Ozs7O0lBYU0sR0FBRyxDQUFDLElBQWlDO1FBQ3hDLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNkLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO1FBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QjtRQUVELE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sR0FBRyxHQUFJLElBQXFDLENBQUMsSUFBSSxDQUFDO1FBRXhELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBdUIsQ0FBQztLQUN2RTs7Ozs7Ozs7O0lBV1MsS0FBSyxDQUFDLFFBQTRCLEVBQUUsT0FBOEI7UUFDeEUsT0FBTyxRQUFvQixDQUFDO0tBQy9COzs7Ozs7O0lBU0QsSUFBYyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7S0FDbEQ7Ozs7O0lBTU0sSUFBSSxDQUFDLE9BQStDO1FBQ3ZELE1BQU0sSUFBSSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDM0IsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFFakUsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUN6QixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsNkJBQTZCLEVBQUUseUNBQXlDLENBQUMsQ0FBQztTQUMxRztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7O1FBR3JGLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUN0RCxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztTQUNuRDtRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBRWIsSUFBZ0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM3RDtRQUVELE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUEyRE0sR0FBRyxDQUFDLEtBQXlELEVBQUUsT0FBOEI7UUFDaEcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDZCxPQUFPO1NBQ1Y7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFvQyxDQUFDO1FBQ3hGLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRTtZQUMvQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQzVDO1FBRUQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxLQUFLLEdBQW9DLFFBQVEsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFJLEtBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFaEcsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUVwQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsU0FBUztZQUNsQixJQUFJLElBQUksSUFBSSxTQUFTLEVBQUU7Z0JBQ25CLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7b0JBQzFCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQztpQkFDdkI7Z0JBQ0QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFO29CQUNmLFNBQVMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO29CQUMxQixPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDO2lCQUMxQztnQkFDRCxPQUFPLFNBQVMsQ0FBQzthQUNwQjtTQUNKLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRVosTUFBTSxHQUFHLEdBQWtCLEVBQUUsQ0FBQztRQUM5QixNQUFNLEtBQUssR0FBZ0IsRUFBRSxDQUFDO1FBQzlCLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7UUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUVuQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztRQUVuRCxJQUFJLElBQUksR0FBRyxLQUFLLENBQUM7UUFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLEVBQUUsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQzs7UUFTL0UsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRTs7WUFFckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQWlCLENBQUM7WUFDaEQsSUFBSSxRQUFRLEVBQUU7Z0JBQ1YsSUFBSSxLQUFLLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtvQkFDNUIsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7b0JBQ2pELElBQUksS0FBSyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7d0JBQ3JDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztxQkFDdkM7b0JBRUQsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFO3dCQUNwQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztxQkFDdkM7eUJBQU07d0JBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7cUJBQ2xDO29CQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBa0IsQ0FBQyxDQUFDO29CQUNqQyxJQUFJLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTt3QkFDbkIsSUFBSSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsUUFBUSxDQUFDLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztxQkFDekU7aUJBQ0o7Z0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3pCLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3RCO2dCQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUM7YUFDdkI7O2lCQUdJLElBQUksR0FBRyxFQUFFO2dCQUNWLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLEtBQUssRUFBRTtvQkFDUCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNsQixJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQzNCLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3BCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ25CO2FBQ0o7U0FDSjs7UUFHRCxJQUFJLE1BQU0sRUFBRTtZQUNSLEtBQUssTUFBTSxLQUFLLElBQUksS0FBSyxFQUFFO2dCQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDeEI7YUFDSjtZQUNELElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDakIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUN2QztTQUNKOztRQUdELElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztRQUN6QixNQUFNLE9BQU8sR0FBRyxDQUFDLFFBQVEsSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDO1FBQzNDLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxPQUFPLEVBQUU7WUFDdkIsWUFBWSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUMzRixLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNqQixXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM5QjthQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRTtZQUNyQixJQUFJLFFBQVEsRUFBRTtnQkFDVixJQUFJLEdBQUcsSUFBSSxDQUFDO2FBQ2Y7WUFDRCxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDN0Q7O1FBR0QsSUFBSSxJQUFJLEVBQUU7WUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7U0FDL0I7O1FBR0QsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUVULEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksSUFBSSxJQUFJLEVBQUUsRUFBRTtvQkFDWixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQ3ZCO2dCQUNELElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssWUFBWSxXQUFXLENBQUMsRUFBRTtvQkFDakQsS0FBZSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDaEU7cUJBQU07b0JBQ0YsSUFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ25FO2FBQ0o7WUFDRCxJQUFJLElBQUksSUFBSSxZQUFZLEVBQUU7Z0JBQ3JCLElBQWdCLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDN0Q7WUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUNuRCxJQUFJLENBQUMsT0FBTyxHQUFHO29CQUNYLEtBQUssRUFBRSxLQUFLO29CQUNaLE9BQU8sRUFBRSxRQUFRO29CQUNqQixNQUFNLEVBQUUsT0FBTztpQkFDbEIsQ0FBQztnQkFDRCxJQUFnQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQy9EO1NBQ0o7O1FBR0QsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBYSxDQUFDOztRQUd4RCxPQUFPLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUNuRTs7Ozs7Ozs7Ozs7O0lBYU0sS0FBSyxDQUFDLEtBQWdDLEVBQUUsT0FBb0M7UUFDL0UsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUF5RCxDQUFDO1FBQ2hHLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDcEMsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLEVBQUU7WUFDdkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDakM7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM5QixlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFbkMsTUFBTSxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFbkYsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFFYixJQUFnQixDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQzlEO1FBRUQsT0FBTyxNQUFNLENBQUM7S0FDakI7SUE0Qk0sR0FBRyxDQUFDLEtBQXdELEVBQUUsT0FBOEI7UUFDL0YsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQXNCLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztLQUNsRztJQTRCTSxNQUFNLENBQUMsS0FBd0QsRUFBRSxPQUFvQztRQUN4RyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQW9DLENBQUM7UUFDM0UsTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxLQUFLLEdBQUcsUUFBUSxHQUFHLENBQUMsS0FBZSxDQUFDLEdBQUksS0FBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUVqRCxJQUFnQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQy9EO1FBQ0QsT0FBTyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztLQUMxQzs7SUFHTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQWtDLEVBQUUsT0FBbUM7UUFDM0YsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDaEMsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEQsSUFBSSxXQUFXLEVBQUU7WUFDYixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM3RCxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFnQyxDQUFDO1lBQzFFLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBRXBCLElBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFlLEVBQUUsSUFBZSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDdEYsT0FBTyxTQUFTLENBQUM7aUJBQ3BCO2FBQ0o7WUFDRCxPQUFPLEtBQWUsQ0FBQztTQUMxQjs7UUFHRCxPQUFPLEtBQWUsQ0FBQztLQUMxQjs7SUFHTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQWdCLEVBQUUsT0FBNkI7UUFDbkUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBQzdCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFO1lBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUIsSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDUixTQUFTO2FBQ1o7WUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7O1lBR3ZCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUVwQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDZCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDbkIsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxZQUFZLFdBQVcsQ0FBQyxFQUFFO29CQUNqRCxLQUFlLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxLQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNuRTtxQkFBTTtvQkFFRixJQUFnQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDdEU7YUFDSjtZQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3hDO1FBQ0QsT0FBTyxPQUFPLENBQUM7S0FDbEI7O0lBR08sQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFhO1FBQ2pDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxLQUFzQyxDQUFDO1FBQzVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsSUFBSSxJQUFJLElBQUksRUFBRSxFQUFFO1lBQ1osSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdkI7UUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLFlBQVksY0FBYyxDQUFDLEVBQUU7WUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFxQixFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztTQUNsRTtLQUNKOztJQUdPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFhLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFDckQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEtBQXNDLENBQUM7UUFDNUQsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNyQjtRQUNELElBQUksSUFBSSxJQUFJLEVBQUUsRUFBRTtZQUNaLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDbkI7UUFDRCxJQUFJLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLFlBQVksY0FBYyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQXFCLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1NBQ3ZFO0tBQ0o7Q0FDSjtBQUVEO0FBQ0Esb0JBQW9CLENBQUMsVUFBbUIsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFFOUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2NvbGxlY3Rpb24vIn0=
