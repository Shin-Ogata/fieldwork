/*!
 * @cdp/collection 0.9.5
 *   generic collection scheme
 */

import { getLanguage } from '@cdp/i18n';
import { unique, computeDate, isFunction, sort, shuffle, luid, isString, noop, isNil, isArray, setMixClassAttribute } from '@cdp/core-utils';
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
/** @internal すでにキャッシュされている対象に対して CollectionItemQueryOptions に指定された振る舞いを行う内部 query 関数 */
async function queryFromCache(cached, options) {
    const { filter, comparators, index: baseIndex, limit, cancel: token, progress, auto, noSearch, } = options;
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
/** @internal `provider` 関数を使用して CollectionItemQueryOptions に指定された振る舞いを行う内部 `query` 関数 */
async function queryFromProvider(provider, options) {
    const { index: baseIndex, limit, cancel: token, progress, auto, } = options;
    const results = [];
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
        const resp = await provider(opts);
        results.push(...resp.items);
        const retval = {
            total: resp.total,
            items: resp.items,
            options: Object.assign({}, opts, resp.options),
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
        if (isString(seed) && byId.has(seed)) {
            return byId.get(seed);
        }
        const id = getModelId(isModel(seed) ? seed.toJSON() : seed, modelConstructor(this));
        const cid = seed._cid;
        return byId.get(id) || (cid && byId.get(cid));
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
setMixClassAttribute(Collection, 'instanceOf', null);
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

export { ArrayCursor, Collection, DynamicCondition, appendArray, clearArray, conditionalFix, convertSortKeys, defaultCollatorProvider, getBooleanComparator, getDateComparator, getGenericComparator, getNumberComparator, getStringComparator, insertArray, queryItems, removeArray, reorderArray, searchItems, toComparator };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5tanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJ1dGlscy9jb21wYXJhdG9yLnRzIiwidXRpbHMvYXJyYXktY3Vyc29yLnRzIiwidXRpbHMvYXJyYXktZWRpdG9yLnRzIiwicXVlcnkvZHluYW1pYy1maWx0ZXJzLnRzIiwicXVlcnkvZHluYW1pYy1jb25kaXRpb24udHMiLCJxdWVyeS9xdWVyeS50cyIsImJhc2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHNcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBDT0xMRUNUSU9OID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMTAsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by16YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfQ09MTEVDVElPTl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkNPTExFQ1RJT04gKyAxLCAnaW52YWxpZCBhY2Nlc3MuJyksXG4gICAgICAgIEVSUk9SX01WQ19JTlZBTElEX0NPTVBBUkFUT1JTID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQ09MTEVDVElPTiArIDIsICdpbnZhbGlkIGNvbXBhcmF0b3JzLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IGdldExhbmd1YWdlIH0gZnJvbSAnQGNkcC9pMThuJztcbmltcG9ydCB7XG4gICAgU29ydE9yZGVyLFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxufSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gYEludGwuQ29sbGF0b3JgIGZhY3RvcnkgZnVuY3Rpb24gdHlwZSBkZWZpbml0aW9uLlxuICogQGphIGBJbnRsLkNvbGxhdG9yYCDjgpLov5TljbTjgZnjgovplqLmlbDlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGF0b3JQcm92aWRlciA9ICgpID0+IEludGwuQ29sbGF0b3I7XG5cbi8qKiBAaW50ZXJuYWwgZGVmYXVsdCBJbnRsLkNvbGxhdG9yIHByb3ZpZGVyICovXG5sZXQgX2NvbGxhdG9yOiBDb2xsYXRvclByb3ZpZGVyID0gKCk6IEludGwuQ29sbGF0b3IgPT4ge1xuICAgIHJldHVybiBuZXcgSW50bC5Db2xsYXRvcihnZXRMYW5ndWFnZSgpLCB7IHNlbnNpdGl2aXR5OiAnYmFzZScsIG51bWVyaWM6IHRydWUgfSk7XG59O1xuXG4vKipcbiAqIEBqYSDml6Llrprjga4gSW50bC5Db2xsYXRvciDjgpLoqK3lrppcbiAqXG4gKiBAcGFyYW0gbmV3UHJvdmlkZXJcbiAqICAtIGBlbmAgbmV3IFtbQ29sbGF0b3JQcm92aWRlcl1dIG9iamVjdC4gaWYgYHVuZGVmaW5lZGAgcGFzc2VkLCBvbmx5IHJldHVybnMgdGhlIGN1cnJlbnQgb2JqZWN0LlxuICogIC0gYGphYCDmlrDjgZfjgYQgW1tDb2xsYXRvclByb3ZpZGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLiBgdW5kZWZpbmVkYCDjgYzmuKHjgZXjgozjgovloLTlkIjjga/nj77lnKjoqK3lrprjgZXjgozjgabjgYTjgovjgqrjg5bjgrjjgqfjgq/jg4jjga7ov5TljbTjga7jgb/ooYzjgYZcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIG9sZCBbW0NvbGxhdG9yUHJvdmlkZXJdXSBvYmplY3QuXG4gKiAgLSBgamFgIOioreWumuOBleOCjOOBpuOBhOOBnyBbW0NvbGxhdG9yUHJvdmlkZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRDb2xsYXRvclByb3ZpZGVyKG5ld1Byb3ZpZGVyPzogQ29sbGF0b3JQcm92aWRlcik6IENvbGxhdG9yUHJvdmlkZXIge1xuICAgIGlmIChudWxsID09IG5ld1Byb3ZpZGVyKSB7XG4gICAgICAgIHJldHVybiBfY29sbGF0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgb2xkUHJvdmlkZXIgPSBfY29sbGF0b3I7XG4gICAgICAgIF9jb2xsYXRvciA9IG5ld1Byb3ZpZGVyO1xuICAgICAgICByZXR1cm4gb2xkUHJvdmlkZXI7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBHZXQgc3RyaW5nIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg5paH5a2X5YiX5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgcHJvcGVydHkgbmFtZVxuICogIC0gYGphYCDjg5fjg63jg5Hjg4bjgqPlkI3jgpLmjIflrppcbiAqIEBwYXJhbSBvcmRlclxuICogIC0gYGVuYCBzb3J0IG9yZGVyIGNvZGVcbiAqICAtIGBqYWAg44K944O844OI6aCG44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHJpbmdDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBULCByaHM6IFQpOiBudW1iZXIgPT4ge1xuICAgICAgICAvLyB1bmRlZmluZWQg44GvICcnIOOBqOWQjOetieOBq+aJseOBhlxuICAgICAgICBjb25zdCBsaHNQcm9wID0gKG51bGwgIT0gbGhzW3Byb3AgYXMgc3RyaW5nXSkgPyBsaHNbcHJvcCBhcyBzdHJpbmddIDogJyc7XG4gICAgICAgIGNvbnN0IHJoc1Byb3AgPSAobnVsbCAhPSByaHNbcHJvcCBhcyBzdHJpbmddKSA/IHJoc1twcm9wIGFzIHN0cmluZ10gOiAnJztcbiAgICAgICAgcmV0dXJuIG9yZGVyICogX2NvbGxhdG9yKCkuY29tcGFyZShsaHNQcm9wLCByaHNQcm9wKTtcbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZGF0ZSBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaXpeaZguavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0ZUNvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGNvbnN0IGxoc0RhdGUgPSBsaHNbcHJvcCBhcyBzdHJpbmddO1xuICAgICAgICBjb25zdCByaHNEYXRlID0gcmhzW3Byb3AgYXMgc3RyaW5nXTtcbiAgICAgICAgaWYgKGxoc0RhdGUgPT09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vICh1bmRlZmluZWQgPT09IHVuZGVmaW5lZCkgb3Ig6Ieq5bex5Y+C54WnXG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzRGF0ZSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxoc1ZhbHVlID0gT2JqZWN0KGxoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGNvbnN0IHJoc1ZhbHVlID0gT2JqZWN0KHJoc0RhdGUpLnZhbHVlT2YoKTtcbiAgICAgICAgICAgIGlmIChsaHNWYWx1ZSA9PT0gcmhzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChsaHNWYWx1ZSA8IHJoc1ZhbHVlID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgZ2VuZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uIGJ5IGNvbXBhcmF0aXZlIG9wZXJhdG9yLlxuICogQGphIOavlOi8g+a8lOeul+WtkOOCkueUqOOBhOOBn+axjueUqOavlOi8g+mWouaVsOOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2VuZXJpY0NvbXBhcmF0b3I8VCwgSyBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4ocHJvcDogSywgb3JkZXI6IFNvcnRPcmRlcik6IFNvcnRDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChsaHM6IFQsIHJoczogVCk6IG51bWJlciA9PiB7XG4gICAgICAgIGlmIChsaHNbcHJvcCBhcyBzdHJpbmddID09PSByaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IGxoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAtMSAqIG9yZGVyO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gcmhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgLy8gdW5kZWZpbmVkIOOBr+acgOS9juWApOaJseOBhCAo5piH6aCG5pmC44Gr5YWI6aCt44G4KVxuICAgICAgICAgICAgcmV0dXJuIDEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAobGhzW3Byb3AgYXMgc3RyaW5nXSA8IHJoc1twcm9wIGFzIHN0cmluZ10gPyAtMSAqIG9yZGVyIDogMSAqIG9yZGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbi8qKlxuICogQGVuIEdldCBib29sZWFuIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAamEg55yf5YG95YCk5q+U6LyD55So6Zai5pWw44KS5Y+W5b6XXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRCb29sZWFuQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBHZXQgbnVtZXJpYyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaVsOWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0TnVtYmVyQ29tcGFyYXRvciA9IGdldEdlbmVyaWNDb21wYXJhdG9yO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgZnJvbSBbW1NvcnRLZXldXS5cbiAqIEBqYSBbW1NvcnRLZXldXSDjgpIgY29tcGFyYXRvciDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5OiBTb3J0S2V5PEs+KTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICBjb25zdCBwcm9wTmFtZSA9IHNvcnRLZXkubmFtZTtcbiAgICBzd2l0Y2ggKHNvcnRLZXkudHlwZSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGdldFN0cmluZ0NvbXBhcmF0b3I8VCwgSz4ocHJvcE5hbWUsIHNvcnRLZXkub3JkZXIpO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiBnZXRCb29sZWFuQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gZ2V0TnVtYmVyQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgcmV0dXJuIGdldERhdGVDb21wYXJhdG9yPFQsIEs+KHByb3BOYW1lLCBzb3J0S2V5Lm9yZGVyKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBnZXRHZW5lcmljQ29tcGFyYXRvcjxULCBLPihwcm9wTmFtZSwgc29ydEtleS5vcmRlcik7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGNvbXBhcmF0b3IgYXJyYXkgZnJvbSBbW1NvcnRLZXldXSBhcnJheS5cbiAqIEBqYSBbW1NvcnRLZXldXSDphY3liJfjgpIgY29tcGFyYXRvciDphY3liJfjgavlpInmj5tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTb3J0S2V5czxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihzb3J0S2V5czogU29ydEtleTxLPltdKTogU29ydENhbGxiYWNrPFQ+W10ge1xuICAgIGNvbnN0IGNvbXBhcmF0b3JzOiBTb3J0Q2FsbGJhY2s8VD5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc29ydEtleSBvZiBzb3J0S2V5cykge1xuICAgICAgICBjb21wYXJhdG9ycy5wdXNoKHRvQ29tcGFyYXRvcihzb3J0S2V5KSk7XG4gICAgfVxuICAgIHJldHVybiBjb21wYXJhdG9ycztcbn1cbiIsIi8qKlxuICogQGVuIEN1cnNvciBwb3NpdGlvbiBjb25zdGFudC5cbiAqIEBqYSDjgqvjg7zjgr3jg6vkvY3nva7lrprmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3Vyc29yUG9zIHtcbiAgICBPVVRfT0ZfUkFOR0UgICAgPSAtMSxcbiAgICBDVVJSRU5UICAgICAgICAgPSAtMixcbn1cblxuLyoqXG4gKiBAZW4gU2VlayBleHByZXNzaW9uIGZ1bmN0aW9uIHR5cGUuXG4gKiBAamEg44K344O844Kv5byP6Zai5pWw5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIFNlZWtFeHA8VD4gPSAodmFsdWU6IFQsIGluZGV4PzogbnVtYmVyLCBvYmo/OiBUW10pID0+IGJvb2xlYW47XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBwcm92aWRlcyBjdXJzb3IgaW50ZXJmYWNlIGZvciBBcnJheS4gPGJyPlxuICogICAgIEl0IGlzIGRpZmZlcmVudCBmcm9tIEl0ZXJhdG9yIGludGVyZmFjZSBvZiBlczIwMTUsIGFuZCB0aGF0IHByb3ZpZGVzIGludGVyZmFjZSB3aGljaCBpcyBzaW1pbGFyIHRvIERCIHJlY29yZHNldCdzIG9uZS5cbiAqIEBqYSBBcnJheSDnlKjjgqvjg7zjgr3jg6sgSS9GIOOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgZXMyMDE1IOOBriBJdGVyYXRvciBJL0Yg44Go44Gv55Ww44Gq44KK44CBREIgcmVjb3Jkc2V0IOOCquODluOCuOOCp+OCr+ODiOODqeOCpOOCr+OBqui1sOafuyBJL0Yg44KS5o+Q5L6b44GZ44KLXG4gKi9cbmV4cG9ydCBjbGFzcyBBcnJheUN1cnNvcjxUID0gYW55PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKiBAaW50ZXJuYWwg5a++6LGh44Gu6YWN5YiXICAqL1xuICAgIHByaXZhdGUgX2FycmF5OiBUW107XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7lhYjpoK3jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAgKi9cbiAgICBwcml2YXRlIF9ib2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7mnKvlsL7jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2VvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOePvuWcqOOBriBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IDBcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogMFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFycmF5OiBUW10sIGluaXRpYWxJbmRleCA9IDApIHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHRhcmdldCBhcnJheS5cbiAgICAgKiBAamEg5a++6LGh44Gu5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheS4gZGVmYXVsdDogZW1wdHkgYXJyYXkuXG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrpouICAgZGVmYXVsdDog56m66YWN5YiXXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KGFycmF5OiBUW10gPSBbXSwgaW5pdGlhbEluZGV4OiBudW1iZXIgPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBjdXJyZW50IGVsZW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBjdXJyZW50KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXlbdGhpcy5faW5kZXhdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo5oyH44GX56S644GX44Gm44GE44KLIGluZGV4IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0YXJnZXQgYXJyYXkgbGVuZ3RoLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjga7opoHntKDmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEJPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruWFiOmgreOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0JPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgRU9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5pyr5bC+44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRU9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcmF3IGFycmF5IGluc3RhbmNlLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgYXJyYXkoKTogVFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGN1cnNvciBvcGVyYXRpb246XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBmaXJzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUZpcnN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbGFzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUxhc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5Lmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBuZXh0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuasoeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTmV4dCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9ib2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBwcmV2aW91cyBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLliY3jgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZVByZXZpb3VzKCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2VvZikge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4LS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNlZWsgYnkgcGFzc2VkIGNyaXRlcmlhLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBvcGVyYXRpb24gZmFpbGVkLCB0aGUgY3Vyc29yIHBvc2l0aW9uIHNldCB0byBFT0YuXG4gICAgICogQGphIOaMh+WumuadoeS7tuOBp+OCt+ODvOOCryA8YnI+XG4gICAgICogICAgIOOCt+ODvOOCr+OBq+WkseaVl+OBl+OBn+WgtOWQiOOBryBFT0Yg54q25oWL44Gr44Gq44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY3JpdGVyaWFcbiAgICAgKiAgLSBgZW5gIGluZGV4IG9yIHNlZWsgZXhwcmVzc2lvblxuICAgICAqICAtIGBqYWAgaW5kZXggLyDmnaHku7blvI/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Vlayhjcml0ZXJpYTogbnVtYmVyIHwgU2Vla0V4cDxUPik6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKCdudW1iZXInID09PSB0eXBlb2YgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gY3JpdGVyaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5LmZpbmRJbmRleChjcml0ZXJpYSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiDjgqvjg7zjgr3jg6vjgYzmnInlirnjgarnr4Tlm7LjgpLnpLrjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHJldHVybnMgdHJ1ZTog5pyJ5Yq5IC8gZmFsc2U6IOeEoeWKuVxuICAgICAqL1xuICAgIHByaXZhdGUgdmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAoMCA8PSB0aGlzLl9pbmRleCAmJiB0aGlzLl9pbmRleCA8IHRoaXMuX2FycmF5Lmxlbmd0aCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5pcXVlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsVG9rZW4sXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IE9ic2VydmFibGVBcnJheSwgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5cbi8qKiBAaW50ZXJuYWwgd2FpdCBmb3IgY2hhbmdlIGRldGVjdGlvbiAqL1xuZnVuY3Rpb24gbWFrZVByb21pc2U8VD4oZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD4sIHJlbWFwPzogVFtdKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBlZGl0b3Iub2ZmKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgICAgIHJlbWFwLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgcmVtYXAucHVzaCguLi5lZGl0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZWNvcmRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLm9uKGNhbGxiYWNrKTtcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFtbT2JzZXJ2YWJsZUFycmF5XV0gaWYgbmVlZGVkLiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0RWRpdENvbnRleHQ8VD4oXG4gICAgdGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sXG4gICAgdG9rZW4/OiBDYW5jZWxUb2tlblxuKTogUHJvbWlzZTx7IGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+OyBwcm9taXNlOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+OyB9PiB8IG5ldmVyIHtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgT2JzZXJ2YWJsZUFycmF5KSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcjogdGFyZ2V0LFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UodGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCBlZGl0b3IgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbSh0YXJnZXQpO1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3IsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZShlZGl0b3IsIHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCAndGFyZ2V0IGlzIG5vdCBBcnJheSBvciBPYnNlcnZhYmxlQXJyYXkuJyk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5wdXNoKC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgYXJyYXkuXG4gKiBAamEg5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCBNYXRoLnRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgaW5zZXJ0QXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5zcGxpY2UoaW5kZXgsIDAsIC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVvcmRlciBhcnJheSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSDpoIXnm67jga7kvY3nva7jgpLlpInmm7RcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIGVkaXQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCBNYXRoLnRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgaW5zZXJ0QXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOS9nOalremFjeWIl+OBp+e3qOmbhlxuICAgIGxldCB3b3JrOiAoVCB8IG51bGwpW10gPSBBcnJheS5mcm9tKGVkaXRvcik7XG4gICAge1xuICAgICAgICBjb25zdCByZW9yZGVyczogVFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgb3JkZXIgb2YgdW5pcXVlKG9yZGVycykpIHtcbiAgICAgICAgICAgIHJlb3JkZXJzLnB1c2goZWRpdG9yW29yZGVyXSk7XG4gICAgICAgICAgICB3b3JrW29yZGVyXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB3b3JrLnNwbGljZShpbmRleCwgMCwgLi4ucmVvcmRlcnMpO1xuICAgICAgICB3b3JrID0gd29yay5maWx0ZXIoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g5YCk44KS5pu444GN5oi744GXXG4gICAgZm9yIChjb25zdCBpZHggb2Ygd29yay5rZXlzKCkpIHtcbiAgICAgICAgZWRpdG9yW2lkeF0gPSB3b3JrW2lkeF0gYXMgVDtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVtb3ZlIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmgheebruOBruWJiumZpFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCByZW1vdmVkIG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDpmY3poIbjgr3jg7zjg4hcbiAgICBvcmRlcnMuc29ydCgobGhzLCByaHMpID0+IHtcbiAgICAgICAgcmV0dXJuIChsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICBlZGl0b3Iuc3BsaWNlKG9yZGVyLCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbiIsImltcG9ydCB7IEtleXMsIGNvbXB1dGVEYXRlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEZpbHRlckNhbGxiYWNrLCBEeW5hbWljQ29tYmluYXRpb24gfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgVmFsdWVUeXBlQUxMPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxudW1iZXIgfCBzdHJpbmcgfCBEYXRlLCBUW0tleXM8VD5dPjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFZhbHVlVHlwZUNvbXBhcmFibGU8VCBleHRlbmRzIG9iamVjdD4gPSBFeHRyYWN0PG51bWJlciB8IERhdGUsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgVmFsdWVUeXBlU3RyaW5nPFQgZXh0ZW5kcyBvYmplY3Q+ID0gRXh0cmFjdDxzdHJpbmcsIFRbS2V5czxUPl0+O1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRHluYW1pY09wZXJhdG9yRGF0ZVVuaXQgPSAneWVhcicgfCAnbW9udGgnIHwgJ2RheScgfCB1bmRlZmluZWQ7XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdID09PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLk5PVF9FUVVBTCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVBTEw8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdICE9PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkdSRUFURVIgKi9cbmV4cG9ydCBmdW5jdGlvbiBncmVhdGVyPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTEVTUyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxlc3M8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDwgdmFsdWU7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5HUkVBVEVSX0VRVUFMICovXG5leHBvcnQgZnVuY3Rpb24gZ3JlYXRlckVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4gaXRlbVtwcm9wXSA+PSB2YWx1ZTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkxFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXNzRXF1YWw8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiBpdGVtW3Byb3BdIDw9IHZhbHVlO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTElLRSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpa2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgdmFsdWU6IFZhbHVlVHlwZVN0cmluZzxUPik6IEZpbHRlckNhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGl0ZW06IFQpID0+IFN0cmluZyhpdGVtW3Byb3BdKS50b0xvY2FsZUxvd2VyQ2FzZSgpLmluY2x1ZGVzKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xufVxuXG4vKiogQGludGVybmFsIER5bmFtaWNQYWNrYWdlT3BlcmF0b3IuTk9UX0xJS0UgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RMaWtlPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBWYWx1ZVR5cGVTdHJpbmc8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIChpdGVtOiBUKSA9PiAhU3RyaW5nKGl0ZW1bcHJvcF0pLnRvTG9jYWxlTG93ZXJDYXNlKCkuaW5jbHVkZXModmFsdWUudG9Mb2NhbGVMb3dlckNhc2UoKSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgRHluYW1pY1BhY2thZ2VPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc0VxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiBkYXRlIDw9IChpdGVtW3Byb3BdIGFzIHVua25vd24gYXMgRGF0ZSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUwgKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRlTGVzc05vdEVxdWFsPFQgZXh0ZW5kcyBvYmplY3Q+KHByb3A6IGtleW9mIFQsIHZhbHVlOiBudW1iZXIsIHVuaXQ6IER5bmFtaWNPcGVyYXRvckRhdGVVbml0KTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAoaXRlbTogVCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRlID0gY29tcHV0ZURhdGUobmV3IERhdGUoKSwgLTEgKiB2YWx1ZSwgdW5pdCk7XG4gICAgICAgIHJldHVybiAhKGRhdGUgPD0gKGl0ZW1bcHJvcF0gYXMgdW5rbm93biBhcyBEYXRlKSk7XG4gICAgfTtcbn1cblxuLyoqIEBpbnRlcm5hbCBEeW5hbWljUGFja2FnZU9wZXJhdG9yLlJBTkdFICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2U8VCBleHRlbmRzIG9iamVjdD4ocHJvcDoga2V5b2YgVCwgbWluOiBWYWx1ZVR5cGVDb21wYXJhYmxlPFQ+LCBtYXg6IFZhbHVlVHlwZUNvbXBhcmFibGU8VD4pOiBGaWx0ZXJDYWxsYmFjazxUPiB7XG4gICAgcmV0dXJuIGNvbWJpbmF0aW9uKER5bmFtaWNDb21iaW5hdGlvbi5BTkQsIGdyZWF0ZXJFcXVhbChwcm9wLCBtaW4pLCBsZXNzRXF1YWwocHJvcCwgbWF4KSk7XG59XG5cbi8qKiBAaW50ZXJuYWwg44OV44Kj44Or44K/44Gu5ZCI5oiQICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluYXRpb248VCBleHRlbmRzIG9iamVjdD4odHlwZTogRHluYW1pY0NvbWJpbmF0aW9uLCBsaHM6IEZpbHRlckNhbGxiYWNrPFQ+LCByaHM6IEZpbHRlckNhbGxiYWNrPFQ+IHwgdW5kZWZpbmVkKTogRmlsdGVyQ2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAhcmhzID8gbGhzIDogKGl0ZW06IFQpID0+IHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5BTkQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgICAgICBjYXNlIER5bmFtaWNDb21iaW5hdGlvbi5PUjpcbiAgICAgICAgICAgICAgICByZXR1cm4gbGhzKGl0ZW0pIHx8IHJocyhpdGVtKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIGNvbWJpbmF0aW9uOiAke3R5cGV9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgLy8gZmFpbCBzYWZlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxocyhpdGVtKSAmJiByaHMoaXRlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwiaW1wb3J0IHsgS2V5cyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb252ZXJ0U29ydEtleXMgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1xuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBTb3J0S2V5LFxuICAgIER5bmFtaWNDb25kaXRpb25TZWVkLFxuICAgIER5bmFtaWNPcGVyYXRvckNvbnRleHQsXG4gICAgRHluYW1pY0xpbWl0Q29uZGl0aW9uLFxuICAgIER5bmFtaWNPcGVyYXRvcixcbiAgICBEeW5hbWljQ29tYmluYXRpb24sXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBWYWx1ZVR5cGVBTEwsXG4gICAgVmFsdWVUeXBlQ29tcGFyYWJsZSxcbiAgICBWYWx1ZVR5cGVTdHJpbmcsXG4gICAgZXF1YWwsXG4gICAgbm90RXF1YWwsXG4gICAgZ3JlYXRlcixcbiAgICBsZXNzLFxuICAgIGdyZWF0ZXJFcXVhbCxcbiAgICBsZXNzRXF1YWwsXG4gICAgbGlrZSxcbiAgICBub3RMaWtlLFxuICAgIGRhdGVMZXNzRXF1YWwsXG4gICAgZGF0ZUxlc3NOb3RFcXVhbCxcbiAgICByYW5nZSxcbiAgICBjb21iaW5hdGlvbixcbn0gZnJvbSAnLi9keW5hbWljLWZpbHRlcnMnO1xuXG4vKipcbiAqIEBlbiBEeW5hbWljIHF1ZXJ5IGNvbmRpdGlvbiBtYW5hZ2VyIGNsYXNzLlxuICogQGphIOODgOOCpOODiuODn+ODg+OCr+OCr+OCqOODqueKtuaFi+euoeeQhuOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY0NvbmRpdGlvbjxUSXRlbSBleHRlbmRzIG9iamVjdCwgVEtleSBleHRlbmRzIEtleXM8VEl0ZW0+ID0gS2V5czxUSXRlbT4+IGltcGxlbWVudHMgRHluYW1pY0NvbmRpdGlvblNlZWQ8VEl0ZW0sIFRLZXk+IHtcblxuICAgIHByaXZhdGUgX29wZXJhdG9yczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXTtcbiAgICBwcml2YXRlIF9jb21iaW5hdGlvbjogRHluYW1pY0NvbWJpbmF0aW9uO1xuICAgIHByaXZhdGUgX3N1bUtleXM6IEtleXM8VEl0ZW0+W107XG4gICAgcHJpdmF0ZSBfbGltaXQ/OiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+O1xuICAgIHByaXZhdGUgX3JhbmRvbTogYm9vbGVhbjtcbiAgICBwcml2YXRlIF9zb3J0S2V5czogU29ydEtleTxUS2V5PltdO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgW1tEeW5hbWljQ29uZGl0aW9uU2VlZF1dIGluc3RhbmNlXG4gICAgICogIC0gYGphYCBbW0R5bmFtaWNDb25kaXRpb25TZWVkXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VlZHM6IER5bmFtaWNDb25kaXRpb25TZWVkPFRJdGVtLCBUS2V5PiA9IHsgb3BlcmF0b3JzOiBbXSB9KSB7XG4gICAgICAgIGNvbnN0IHsgb3BlcmF0b3JzLCBjb21iaW5hdGlvbiwgc3VtS2V5cywgbGltaXQsIHJhbmRvbSwgc29ydEtleXMgfSA9IHNlZWRzO1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgICAgID0gb3BlcmF0b3JzO1xuICAgICAgICB0aGlzLl9jb21iaW5hdGlvbiAgID0gbnVsbCAhPSBjb21iaW5hdGlvbiA/IGNvbWJpbmF0aW9uIDogRHluYW1pY0NvbWJpbmF0aW9uLkFORDtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyAgICAgICA9IG51bGwgIT0gc3VtS2V5cyA/IHN1bUtleXMgOiBbXTtcbiAgICAgICAgdGhpcy5fbGltaXQgICAgICAgICA9IGxpbWl0O1xuICAgICAgICB0aGlzLl9yYW5kb20gICAgICAgID0gISFyYW5kb207XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzICAgICAgPSBzb3J0S2V5cyB8fCBbXTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBEeW5hbWljQ29uZGl0aW9uU2VlZFxuXG4gICAgZ2V0IG9wZXJhdG9ycygpOiBEeW5hbWljT3BlcmF0b3JDb250ZXh0PFRJdGVtPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wZXJhdG9ycztcbiAgICB9XG5cbiAgICBzZXQgb3BlcmF0b3JzKHZhbHVlczogRHluYW1pY09wZXJhdG9yQ29udGV4dDxUSXRlbT5bXSkge1xuICAgICAgICB0aGlzLl9vcGVyYXRvcnMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgZ2V0IHN1bUtleXMoKTogKEtleXM8VEl0ZW0+KVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1bUtleXM7XG4gICAgfVxuXG4gICAgc2V0IHN1bUtleXModmFsdWVzOiAoS2V5czxUSXRlbT4pW10pIHtcbiAgICAgICAgdGhpcy5fc3VtS2V5cyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICBnZXQgY29tYmluYXRpb24oKTogRHluYW1pY0NvbWJpbmF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbWJpbmF0aW9uO1xuICAgIH1cblxuICAgIHNldCBjb21iaW5hdGlvbih2YWx1ZTogRHluYW1pY0NvbWJpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IGxpbWl0KCk6IER5bmFtaWNMaW1pdENvbmRpdGlvbjxUSXRlbT4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGltaXQ7XG4gICAgfVxuXG4gICAgc2V0IGxpbWl0KHZhbHVlOiBEeW5hbWljTGltaXRDb25kaXRpb248VEl0ZW0+IHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2xpbWl0ID0gdmFsdWU7XG4gICAgfVxuXG4gICAgZ2V0IHJhbmRvbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JhbmRvbTtcbiAgICB9XG5cbiAgICBzZXQgcmFuZG9tKHZhbHVlOiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3JhbmRvbSA9IHZhbHVlO1xuICAgIH1cblxuICAgIGdldCBzb3J0S2V5cygpOiBTb3J0S2V5PFRLZXk+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc29ydEtleXM7XG4gICAgfVxuXG4gICAgc2V0IHNvcnRLZXlzKHZhbHVlczogU29ydEtleTxUS2V5PltdKSB7XG4gICAgICAgIHRoaXMuX3NvcnRLZXlzID0gdmFsdWVzO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBhY2Nlc3NvcjpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29tcGFyYXRvciBmdW5jdGlvbnMuXG4gICAgICogQGphIOavlOi8g+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBjb21wYXJhdG9ycygpOiBTb3J0Q2FsbGJhY2s8VEl0ZW0+W10ge1xuICAgICAgICByZXR1cm4gY29udmVydFNvcnRLZXlzKHRoaXMuX3NvcnRLZXlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHN5bnRoZXNpcyBmaWx0ZXIgZnVuY3Rpb24uXG4gICAgICogQGphIOWQiOaIkOa4iOOBv+ODleOCo+ODq+OCv+mWouaVsOWPluW+l1xuICAgICAqL1xuICAgIGdldCBmaWx0ZXIoKTogRmlsdGVyQ2FsbGJhY2s8VEl0ZW0+IHtcbiAgICAgICAgbGV0IGZsdHI6IEZpbHRlckNhbGxiYWNrPFRJdGVtPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbmQgb2YgdGhpcy5fb3BlcmF0b3JzKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGNvbmQub3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5FUVVBTDpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUFMTDxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTk9UX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdEVxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQUxMPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXI8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5MRVNTOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlc3M8VEl0ZW0+KGNvbmQucHJvcCwgY29uZC52YWx1ZSBhcyBWYWx1ZVR5cGVDb21wYXJhYmxlPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5HUkVBVEVSX0VRVUFMOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXJFcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIFZhbHVlVHlwZUNvbXBhcmFibGU8VEl0ZW0+KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkxFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVzc0VxdWFsPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBEeW5hbWljT3BlcmF0b3IuTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaWtlPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5OT1RfTElLRTpcbiAgICAgICAgICAgICAgICAgICAgZmx0ciA9IGNvbWJpbmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY29tYmluYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RMaWtlPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlU3RyaW5nPFRJdGVtPiksXG4gICAgICAgICAgICAgICAgICAgICAgICBmbHRyLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIER5bmFtaWNPcGVyYXRvci5EQVRFX0xFU1NfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NFcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLkRBVEVfTEVTU19OT1RfRVFVQUw6XG4gICAgICAgICAgICAgICAgICAgIGZsdHIgPSBjb21iaW5hdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NvbWJpbmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUxlc3NOb3RFcXVhbDxUSXRlbT4oY29uZC5wcm9wLCBjb25kLnZhbHVlIGFzIG51bWJlciwgY29uZC51bml0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsdHIsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgRHluYW1pY09wZXJhdG9yLlJBTkdFOlxuICAgICAgICAgICAgICAgICAgICBmbHRyID0gY29tYmluYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jb21iaW5hdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlPFRJdGVtPihjb25kLnByb3AsIGNvbmQudmFsdWUgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4sIGNvbmQucmFuZ2UgYXMgVmFsdWVUeXBlQ29tcGFyYWJsZTxUSXRlbT4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmx0cixcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bmtub3duIG9wZXJhdG9yOiAke2NvbmQub3BlcmF0b3J9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZsdHIgfHwgKCgvKiBpdGVtICovKSA9PiB0cnVlKTtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIEtleXMsXG4gICAgaXNGdW5jdGlvbixcbiAgICBzb3J0LFxuICAgIHNodWZmbGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjaGVja0NhbmNlbGVkIGFzIGNjIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBTb3J0S2V5LFxuICAgIFNvcnRDYWxsYmFjayxcbiAgICBGaWx0ZXJDYWxsYmFjayxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0LFxuICAgIENvbGxlY3Rpb25RdWVyeUluZm8sXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBEeW5hbWljTGltaXQsXG59IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi4vdXRpbHMvY29tcGFyYXRvcic7XG5pbXBvcnQgeyBEeW5hbWljQ29uZGl0aW9uIH0gZnJvbSAnLi9keW5hbWljLWNvbmRpdGlvbic7XG5cbmNvbnN0IHsgdHJ1bmMgfSA9IE1hdGg7XG5cbi8qKiBAaW50ZXJuYWwg5L2/55So44GZ44KL44OX44Ot44OR44OG44Kj44GM5L+d6Ki844GV44KM44GfIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zICovXG5pbnRlcmZhY2UgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4gZXh0ZW5kcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIHNvcnRLZXlzOiBTb3J0S2V5PFRLZXk+W107XG4gICAgY29tcGFyYXRvcnM6IFNvcnRDYWxsYmFjazxUSXRlbT5bXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEFwcGx5IGBmaWx0ZXJgIGFuZCBgc29ydCBrZXlgIHRvIHRoZSBgaXRlbXNgIGZyb20gW1txdWVyeUl0ZW1zXV1gKClgIHJlc3VsdC5cbiAqIEBqYSBbW3F1ZXJ5SXRlbXNdXWAoKWAg44GX44GfIGBpdGVtc2Ag44Gr5a++44GX44GmIGBmaWx0ZXJgIOOBqCBgc29ydCBrZXlgIOOCkumBqeeUqFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VhcmNoSXRlbXM8VEl0ZW0+KGl0ZW1zOiBUSXRlbVtdLCBmaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUSXRlbT4gfCBudWxsLCAuLi5jb21wYXJhdG9yczogU29ydENhbGxiYWNrPFRJdGVtPltdKTogVEl0ZW1bXSB7XG4gICAgbGV0IHJlc3VsdCA9IGlzRnVuY3Rpb24oZmlsdGVyKSA/IGl0ZW1zLmZpbHRlcihmaWx0ZXIpIDogaXRlbXMuc2xpY2UoKTtcbiAgICBmb3IgKGNvbnN0IGNvbXBhcmF0b3Igb2YgY29tcGFyYXRvcnMpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY29tcGFyYXRvcikpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHNvcnQocmVzdWx0LCBjb21wYXJhdG9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCDjgZnjgafjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgabjgYTjgovlr77osaHjgavlr77jgZfjgaYgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMg44Gr5oyH5a6a44GV44KM44Gf5oyv44KL6Iie44GE44KS6KGM44GG5YaF6YOoIHF1ZXJ5IOmWouaVsCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlGcm9tQ2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgY2FjaGVkOiBUSXRlbVtdLFxuICAgIG9wdGlvbnM6IFNhZmVDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPj4ge1xuICAgIGNvbnN0IHtcbiAgICAgICAgZmlsdGVyLFxuICAgICAgICBjb21wYXJhdG9ycyxcbiAgICAgICAgaW5kZXg6IGJhc2VJbmRleCxcbiAgICAgICAgbGltaXQsXG4gICAgICAgIGNhbmNlbDogdG9rZW4sXG4gICAgICAgIHByb2dyZXNzLFxuICAgICAgICBhdXRvLFxuICAgICAgICBub1NlYXJjaCxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBq+WvvuOBl+OBpuODleOCo+ODq+OCv+ODquODs+OCsCwg44K944O844OI44KS5a6f6KGMXG4gICAgY29uc3QgdGFyZ2V0cyA9IG5vU2VhcmNoID8gY2FjaGVkLnNsaWNlKCkgOiBzZWFyY2hJdGVtcyhjYWNoZWQsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuXG4gICAgY29uc3QgcmVzdWx0czogVEl0ZW1bXSA9IFtdO1xuICAgIGxldCBpbmRleDogbnVtYmVyID0gKG51bGwgIT0gYmFzZUluZGV4KSA/IGJhc2VJbmRleCA6IDA7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIGlmIChpbmRleCA8IDAgfHwgdGFyZ2V0cy5sZW5ndGggPD0gaW5kZXggfHwgdHJ1bmMoaW5kZXgpICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfSU5WQUxJRF9BQ0NFU1MsIGBpbnZhbGlkIGluZGV4OiAke2luZGV4fWApO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gbGltaXQgJiYgKGxpbWl0IDw9IDAgfHwgdHJ1bmMobGltaXQpICE9PSBsaW1pdCkpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBsaW1pdDogJHsgbGltaXQgfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24ob3B0aW9ucywgeyBpbmRleCB9KTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSB0YXJnZXRzLnNsaWNlKGluZGV4LCAobnVsbCAhPSBsaW1pdCkgPyBpbmRleCArIGxpbWl0IDogdW5kZWZpbmVkKTtcblxuICAgICAgICByZXN1bHRzLnB1c2goLi4uaXRlbXMpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiB0YXJnZXRzLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi5vcHRzIH0gYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+LFxuICAgICAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0+O1xuXG4gICAgICAgIC8vIOmAsuaNl+mAmuefpVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwcm9ncmVzcykpIHtcbiAgICAgICAgICAgIHByb2dyZXNzKHsgLi4ucmV0dmFsIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF1dG8gJiYgbnVsbCAhPSBsaW1pdCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldHMubGVuZ3RoIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCBgcHJvdmlkZXJgIOmWouaVsOOCkuS9v+eUqOOBl+OBpiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9ucyDjgavmjIflrprjgZXjgozjgZ/mjK/jgovoiJ7jgYTjgpLooYzjgYblhoXpg6ggYHF1ZXJ5YCDplqLmlbAgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5RnJvbVByb3ZpZGVyPFRJdGVtIGV4dGVuZHMgb2JqZWN0LCBUS2V5IGV4dGVuZHMgS2V5czxUSXRlbT4+KFxuICAgIHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRJdGVtLCBUS2V5PixcbiAgICBvcHRpb25zOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT5cbik6IFByb21pc2U8Q29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4+IHtcbiAgICBjb25zdCB7XG4gICAgICAgIGluZGV4OiBiYXNlSW5kZXgsXG4gICAgICAgIGxpbWl0LFxuICAgICAgICBjYW5jZWw6IHRva2VuLFxuICAgICAgICBwcm9ncmVzcyxcbiAgICAgICAgYXV0byxcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IHJlc3VsdHM6IFRJdGVtW10gPSBbXTtcbiAgICBsZXQgaW5kZXg6IG51bWJlciA9IChudWxsICE9IGJhc2VJbmRleCkgPyBiYXNlSW5kZXggOiAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgYXdhaXQgY2ModG9rZW4pO1xuICAgICAgICBpZiAoaW5kZXggPCAwIHx8IHRydW5jKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQUNDRVNTLCBgaW52YWxpZCBpbmRleDogJHtpbmRleH1gKTtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGxpbWl0ICYmIChsaW1pdCA8PSAwIHx8IHRydW5jKGxpbWl0KSAhPT0gbGltaXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19JTlZBTElEX0FDQ0VTUywgYGludmFsaWQgbGltaXQ6ICR7bGltaXR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbihvcHRpb25zLCB7IGluZGV4IH0pO1xuICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgcHJvdmlkZXIob3B0cyk7XG5cbiAgICAgICAgcmVzdWx0cy5wdXNoKC4uLnJlc3AuaXRlbXMpO1xuXG4gICAgICAgIGNvbnN0IHJldHZhbCA9IHtcbiAgICAgICAgICAgIHRvdGFsOiByZXNwLnRvdGFsLFxuICAgICAgICAgICAgaXRlbXM6IHJlc3AuaXRlbXMsXG4gICAgICAgICAgICBvcHRpb25zOiBPYmplY3QuYXNzaWduKHt9LCBvcHRzLCByZXNwLm9wdGlvbnMpIGFzIENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPixcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPjtcblxuICAgICAgICAvLyDpgLLmjZfpgJrnn6VcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24ocHJvZ3Jlc3MpKSB7XG4gICAgICAgICAgICBwcm9ncmVzcyh7IC4uLnJldHZhbCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdXRvICYmIG51bGwgIT0gbGltaXQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwLnRvdGFsIDw9IGluZGV4ICsgbGltaXQpIHtcbiAgICAgICAgICAgICAgICAvLyDoh6rli5XntpnntprmjIflrprmmYLjgavjga/mnIDlvozjgavjgZnjgbnjgabjga4gaXRlbSDjgpLov5TljbRcbiAgICAgICAgICAgICAgICByZXR2YWwuaXRlbXMgPSByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSByZXNwLml0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBjb25kaXRpbmFsRml4IOOBq+S9v+eUqOOBmeOCiyBDcml0ZXJpYSBNYXAgKi9cbmNvbnN0IF9saW1pdENyaXRlcmlhID0ge1xuICAgIFtEeW5hbWljTGltaXQuQ09VTlRdOiBudWxsLFxuICAgIFtEeW5hbWljTGltaXQuU1VNXTogICAgIHsgY29lZmY6IDEgfSxcbiAgICBbRHluYW1pY0xpbWl0LlNFQ09ORF06ICB7IGNvZWZmOiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5NSU5VVEVdOiAgeyBjb2VmZjogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5IT1VSXTogICAgeyBjb2VmZjogNjAgKiA2MCAqIDEwMDAgfSxcbiAgICBbRHluYW1pY0xpbWl0LkRBWV06ICAgICB7IGNvZWZmOiAyNCAqIDYwICogNjAgKiAxMDAwIH0sXG4gICAgW0R5bmFtaWNMaW1pdC5LQl06ICAgICAgeyBjb2VmZjogMTAyNCB9LFxuICAgIFtEeW5hbWljTGltaXQuTUJdOiAgICAgIHsgY29lZmY6IDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5HQl06ICAgICAgeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0IH0sXG4gICAgW0R5bmFtaWNMaW1pdC5UQl06ICAgICAgeyBjb2VmZjogMTAyNCAqIDEwMjQgKiAxMDI0ICogMTAyNCB9LFxufTtcblxuLyoqXG4gKiBAZW4gRml4IHRoZSB0YXJnZXQgaXRlbXMgYnkgW1tEeW5hbWljQ29uZGl0aW9uXV0uXG4gKiBAamEgW1tEeW5hbWljQ29uZGl0aW9uXV0g44Gr5b6T44GE5a++6LGh44KS5pW05b2iXG4gKlxuICogQHBhcmFtIGl0ZW1zXG4gKiAgLSBgZW5gIHRhcmdldCBpdGVtcyAoZGVzdHJ1Y3RpdmUpXG4gKiAgLSBgamFgIOWvvuixoeOBruOCouOCpOODhuODoCAo56C05aOK55qEKVxuICogQHBhcmFtIGNvbmRpdGlvblxuICogIC0gYGVuYCBjb25kaXRpb24gb2JqZWN0XG4gKiAgLSBgamFgIOadoeS7tuOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uZGl0aW9uYWxGaXg8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPiA9IEtleXM8VEl0ZW0+PihcbiAgICBpdGVtczogVEl0ZW1bXSxcbiAgICBjb25kaXRpb246IER5bmFtaWNDb25kaXRpb248VEl0ZW0sIFRLZXk+XG4pOiBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PFRJdGVtPiB7XG4gICAgY29uc3QgeyByYW5kb20sIGxpbWl0LCBzdW1LZXlzIH0gPSBjb25kaXRpb247XG5cbiAgICBpZiAocmFuZG9tKSB7XG4gICAgICAgIHNodWZmbGUoaXRlbXMsIHRydWUpO1xuICAgIH1cblxuICAgIGlmIChsaW1pdCkge1xuICAgICAgICBjb25zdCB7IHVuaXQsIHZhbHVlLCBwcm9wIH0gPSBsaW1pdDtcbiAgICAgICAgY29uc3QgcmVzZXQ6IFRJdGVtW10gPSBbXTtcbiAgICAgICAgY29uc3QgY3JpdGVyaWEgPSBfbGltaXRDcml0ZXJpYVt1bml0XTtcbiAgICAgICAgY29uc3QgbGltaXRDb3VudCA9IHZhbHVlO1xuICAgICAgICBjb25zdCBleGNlc3MgPSAhIWxpbWl0LmV4Y2VzcztcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBpZiAoIWNyaXRlcmlhKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSB7XG4gICAgICAgICAgICAgICAgY291bnQgKz0gKE51bWJlcihpdGVtW3Byb3AgYXMgS2V5czxUSXRlbT5dKSAvIGNyaXRlcmlhLmNvZWZmKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBjYW5ub3QgYWNjZXNzIHByb3BlcnR5OiAke3Byb3B9YCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXRlbXBsYXRlLWV4cHJlc3Npb25zXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsaW1pdENvdW50IDwgY291bnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXhjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc2V0LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNldC5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGl0ZW1zID0gcmVzZXQ7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICB0b3RhbDogaXRlbXMubGVuZ3RoLFxuICAgICAgICBpdGVtcyxcbiAgICB9IGFzIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VEl0ZW0sIEtleXM8VEl0ZW0+PjtcblxuICAgIGlmICgwIDwgc3VtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBzdW1LZXlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5IGluIHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdFtrZXldIGFzIHVua25vd24gYXMgbnVtYmVyKSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChyZXN1bHRba2V5XSBhcyB1bmtub3duIGFzIG51bWJlcikgKz0gTnVtYmVyKGl0ZW1ba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9ucyDjgavlpInmj5sgKi9cbmZ1bmN0aW9uIGVuc3VyZU9wdGlvbnM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgb3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+IHwgdW5kZWZpbmVkXG4pOiBTYWZlQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUSXRlbSwgVEtleT4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgc29ydEtleXM6IFtdIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgbm9TZWFyY2gsIHNvcnRLZXlzIH0gPSBvcHRzO1xuXG4gICAgaWYgKCFub1NlYXJjaCAmJiAoIW9wdHMuY29tcGFyYXRvcnMgfHwgb3B0cy5jb21wYXJhdG9ycy5sZW5ndGggPD0gMCkpIHtcbiAgICAgICAgb3B0cy5jb21wYXJhdG9ycyA9IGNvbnZlcnRTb3J0S2V5cyhzb3J0S2V5cyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHMgYXMgU2FmZUNvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VEl0ZW0sIFRLZXk+O1xufVxuXG4vKiogQGludGVybmFsIOOCreODo+ODg+OCt+ODpeWPr+iDveOBi+WIpOWumiAqL1xuZnVuY3Rpb24gY2FuQ2FjaGU8VEl0ZW0gZXh0ZW5kcyBvYmplY3Q+KHJlc3VsdDogQ29sbGVjdGlvbkl0ZW1RdWVyeVJlc3VsdDxUSXRlbT4sIG9wdGlvbnM6IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtPik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHsgbm9DYWNoZSwgbm9TZWFyY2ggfSA9IG9wdGlvbnM7XG4gICAgcmV0dXJuICFub0NhY2hlICYmICFub1NlYXJjaCAmJiByZXN1bHQudG90YWwgPT09IHJlc3VsdC5pdGVtcy5sZW5ndGg7XG59XG5cbi8qKlxuICogQGVuIExvdyBsZXZlbCBmdW5jdGlvbiBmb3IgW1tDb2xsZWN0aW9uXV0gcXVlcnkgaXRlbXMuXG4gKiBAamEgW1tDb2xsZWN0aW9uXV0gSXRlbSDjgpLjgq/jgqjjg6rjgZnjgovkvY7jg6zjg5njg6vplqLmlbBcbiAqXG4gKiBAcGFyYW0gcXVlcnlJbmZvXG4gKiAgLSBgZW5gIHF1ZXJ5IGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOOCr+OCqOODquaDheWgsVxuICogQHBhcmFtIHByb3ZpZGVyXG4gKiAgLSBgZW5gIHByb3ZpZGVyIGZ1bmN0aW9uXG4gKiAgLSBgamFgIOODl+ODreODkOOCpOODgOmWouaVsFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5SXRlbXM8VEl0ZW0gZXh0ZW5kcyBvYmplY3QsIFRLZXkgZXh0ZW5kcyBLZXlzPFRJdGVtPj4oXG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRJdGVtLCBUS2V5PixcbiAgICBwcm92aWRlcjogQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcjxUSXRlbSwgVEtleT4sXG4gICAgb3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRJdGVtLCBUS2V5PlxuKTogUHJvbWlzZTxUSXRlbVtdPiB7XG4gICAgY29uc3Qgb3B0cyA9IGVuc3VyZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMsIGZpbHRlciB9ID0gb3B0cztcblxuICAgIC8vIHF1ZXJ5IOOBq+S9v+eUqOOBl+OBnyBzb3J0LCBmaWx0ZXIg5oOF5aCx44KS44Kt44Oj44OD44K344OlXG4gICAgcXVlcnlJbmZvLnNvcnRLZXlzICAgID0gc29ydEtleXM7XG4gICAgcXVlcnlJbmZvLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnM7XG4gICAgcXVlcnlJbmZvLmZpbHRlciAgICAgID0gZmlsdGVyO1xuXG4gICAgaWYgKHF1ZXJ5SW5mby5jYWNoZSkge1xuICAgICAgICByZXR1cm4gKGF3YWl0IHF1ZXJ5RnJvbUNhY2hlKHF1ZXJ5SW5mby5jYWNoZS5pdGVtcywgb3B0cykpLml0ZW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBxdWVyeUZyb21Qcm92aWRlcihwcm92aWRlciwgb3B0cyk7XG4gICAgICAgIGNvbnN0IG5leHRPcHRzID0gcmVzdWx0Lm9wdGlvbnMgYXMgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VEl0ZW0+O1xuICAgICAgICBpZiAoY2FuQ2FjaGUocmVzdWx0LCBuZXh0T3B0cykpIHtcbiAgICAgICAgICAgIHF1ZXJ5SW5mby5jYWNoZSA9IHsgLi4ucmVzdWx0IH07XG4gICAgICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IG5vU2VhcmNoLCBjb25kaXRpb246IHNlZWQgfSA9IG5leHRPcHRzO1xuICAgICAgICBpZiAoc2VlZCkge1xuICAgICAgICAgICAgY29uc3QgY29uZGl0aW9uID0gbmV3IER5bmFtaWNDb25kaXRpb24oc2VlZCk7XG4gICAgICAgICAgICByZXN1bHQgPSBjb25kaXRpb25hbEZpeChzZWFyY2hJdGVtcyhcbiAgICAgICAgICAgICAgICByZXN1bHQuaXRlbXMsXG4gICAgICAgICAgICAgICAgY29uZGl0aW9uLmZpbHRlcixcbiAgICAgICAgICAgICAgICAuLi5jb25kaXRpb24uY29tcGFyYXRvcnNcbiAgICAgICAgICAgICksIGNvbmRpdGlvbik7XG5cbiAgICAgICAgICAgIGlmIChxdWVyeUluZm8uY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHF1ZXJ5SW5mby5jYWNoZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgcXVlcnlJbmZvLmNhY2hlLm9wdGlvbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9TZWFyY2ggPyByZXN1bHQuaXRlbXMgOiBzZWFyY2hJdGVtcyhyZXN1bHQuaXRlbXMsIGZpbHRlciwgLi4uY29tcGFyYXRvcnMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgQ29uc3RydWN0b3IsXG4gICAgQ2xhc3MsXG4gICAgVW5rbm93bk9iamVjdCxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBLZXlzLFxuICAgIGlzTmlsLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBub29wLFxuICAgIGx1aWQsXG4gICAgc2V0TWl4Q2xhc3NBdHRyaWJ1dGUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIFN1YnNjcmliYWJsZSxcbiAgICBFdmVudEJyb2tlcixcbiAgICBFdmVudFNvdXJjZSxcbiAgICBFdmVudFB1Ymxpc2hlcixcbn0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBSZXN1bHQsXG4gICAgUkVTVUxUX0NPREUsXG4gICAgRkFJTEVELFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IFN5bmNDb250ZXh0LCBkZWZhdWx0U3luYyB9IGZyb20gJ0BjZHAvZGF0YS1zeW5jJztcbmltcG9ydCB7XG4gICAgTW9kZWwsXG4gICAgTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIGlzTW9kZWwsXG59IGZyb20gJ0BjZHAvbW9kZWwnO1xuaW1wb3J0IHtcbiAgICBTb3J0Q2FsbGJhY2ssXG4gICAgRmlsdGVyQ2FsbGJhY2ssXG4gICAgQ29sbGVjdGlvblNvcnRPcHRpb25zLFxuICAgIENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQsXG4gICAgQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnMsXG4gICAgQ29sbGVjdGlvbkl0ZW1Qcm92aWRlcixcbiAgICBDb2xsZWN0aW9uUXVlcnlJbmZvLFxuICAgIENvbGxlY3Rpb25FdmVudCxcbiAgICBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWRkT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uU2V0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUmVTb3J0T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uVXBkYXRlT3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uUXVlcnlPcHRpb25zLFxuICAgIENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyxcbiAgICBDb2xsZWN0aW9uQWZ0ZXJGaWx0ZXJPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY29udmVydFNvcnRLZXlzIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBzZWFyY2hJdGVtcywgcXVlcnlJdGVtcyB9IGZyb20gJy4vcXVlcnknO1xuXG5jb25zdCBfcHJvcGVydGllcyAgICAgICAgICAgICA9IFN5bWJvbCgncHJvcGVydGllcycpO1xuY29uc3QgX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3IgPSBTeW1ib2woJ2NyZWF0ZS1pdGVyYWJsZS1pdGVyYXRvcicpO1xuY29uc3QgX3ByZXBhcmVNb2RlbCAgICAgICAgICAgPSBTeW1ib2woJ3ByZXBhcmUtbW9kZWwnKTtcbmNvbnN0IF9yZW1vdmVNb2RlbHMgICAgICAgICAgID0gU3ltYm9sKCdyZW1vdmUtbW9kZWxzJyk7XG5jb25zdCBfYWRkUmVmZXJlbmNlICAgICAgICAgICA9IFN5bWJvbCgnYWRkLXJlZmVyZW5jZScpO1xuY29uc3QgX3JlbW92ZVJlZmVyZW5jZSAgICAgICAgPSBTeW1ib2woJ3JlbW92ZS1yZWZlcmVuY2UnKTtcbmNvbnN0IF9vbk1vZGVsRXZlbnQgICAgICAgICAgID0gU3ltYm9sKCdtb2RlbC1ldmVudC1oYW5kbGVyJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBQcm9wZXJ0eTxUIGV4dGVuZHMgb2JqZWN0LCBLIGV4dGVuZHMgS2V5czxUPj4ge1xuICAgIHJlYWRvbmx5IGNvbnN0cnVjdE9wdGlvbnM6IENvbGxlY3Rpb25Db25zdHJ1Y3Rpb25PcHRpb25zPFQsIEs+O1xuICAgIHJlYWRvbmx5IHByb3ZpZGVyOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFQsIEs+O1xuICAgIHJlYWRvbmx5IGNpZDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IHF1ZXJ5T3B0aW9uczogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VCwgSz47XG4gICAgcXVlcnlJbmZvOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFQsIEs+O1xuICAgIHJlYWRvbmx5IG1vZGVsT3B0aW9uczogTW9kZWxDb25zdHJ1Y3Rpb25PcHRpb25zO1xuICAgIHJlYWRvbmx5IGJ5SWQ6IE1hcDxzdHJpbmcsIFQ+O1xuICAgIHN0b3JlOiBUW107XG4gICAgYWZ0ZXJGaWx0ZXI/OiBGaWx0ZXJDYWxsYmFjazxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCByZXNldCBtb2RlbCBjb250ZXh0ICovXG5jb25zdCByZXNldE1vZGVsU3RvcmUgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KGNvbnRleHQ6IFByb3BlcnR5PFQsIEs+KTogdm9pZCA9PiB7XG4gICAgY29udGV4dC5ieUlkLmNsZWFyKCk7XG4gICAgY29udGV4dC5zdG9yZS5sZW5ndGggPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW5zdXJlU29ydE9wdGlvbnMgPSA8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIEtleXM8VD4+KG9wdGlvbnM6IENvbGxlY3Rpb25Tb3J0T3B0aW9uczxULCBLPik6IFJlcXVpcmVkPENvbGxlY3Rpb25Tb3J0T3B0aW9uczxULCBLPj4gPT4ge1xuICAgIGNvbnN0IHsgc29ydEtleXM6IGtleXMsIGNvbXBhcmF0b3JzOiBjb21wcyB9ID0gb3B0aW9ucztcbiAgICByZXR1cm4ge1xuICAgICAgICBzb3J0S2V5czoga2V5cyB8fCBbXSxcbiAgICAgICAgY29tcGFyYXRvcnM6IGNvbXBzIHx8IGNvbnZlcnRTb3J0S2V5cyhrZXlzIHx8IFtdKSxcbiAgICB9O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbW9kZWxJZEF0dHJpYnV0ZSA9IDxUIGV4dGVuZHMgb2JqZWN0PihjdG9yOiBDb25zdHJ1Y3RvcjxUPiB8IHVuZGVmaW5lZCk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGN0b3I/LlsnaWRBdHRyaWJ1dGUnXSB8fCAnaWQnO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZ2V0TW9kZWxJZCA9IDxUIGV4dGVuZHMgb2JqZWN0PihhdHRyczogVCwgY3RvcjogQ29uc3RydWN0b3I8VD4gfCB1bmRlZmluZWQpOiBzdHJpbmcgPT4ge1xuICAgIHJldHVybiBhdHRyc1ttb2RlbElkQXR0cmlidXRlKGN0b3IpXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGdldENoYW5nZWRJZHMgPSA8VCBleHRlbmRzIG9iamVjdD4ob2JqOiBvYmplY3QsIGN0b3I6IENvbnN0cnVjdG9yPFQ+IHwgdW5kZWZpbmVkKTogeyBpZDogc3RyaW5nOyBwcmV2SWQ/OiBzdHJpbmc7IH0gfCB1bmRlZmluZWQgPT4ge1xuICAgIHR5cGUgTW9kZWxMaWtlID0geyBwcmV2aW91czogKGtleTogc3RyaW5nKSA9PiBzdHJpbmc7IH07XG4gICAgY29uc3QgbW9kZWwgPSBvYmogYXMgTW9kZWxMaWtlO1xuXG4gICAgY29uc3QgaWRBdHRyaWJ1dGUgPSBtb2RlbElkQXR0cmlidXRlKGN0b3IpO1xuICAgIGNvbnN0IGlkID0gbW9kZWxbaWRBdHRyaWJ1dGVdO1xuICAgIGlmICghaXNTdHJpbmcoaWQpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaWQ6IG1vZGVsW2lkQXR0cmlidXRlXSwgcHJldklkOiBpc0Z1bmN0aW9uKG1vZGVsLnByZXZpb3VzKSA/IG1vZGVsLnByZXZpb3VzKGlkQXR0cmlidXRlKSA6IHVuZGVmaW5lZCB9O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgbW9kZWxDb25zdHJ1Y3RvciA9IDxUIGV4dGVuZHMgb2JqZWN0LCBFIGV4dGVuZHMgQ29sbGVjdGlvbkV2ZW50PFQ+LCBLIGV4dGVuZHMgS2V5czxUPj4oc2VsZjogQ29sbGVjdGlvbjxULCBFLCBLPik6IENsYXNzIHwgdW5kZWZpbmVkID0+IHtcbiAgICByZXR1cm4gc2VsZi5jb25zdHJ1Y3RvclsnbW9kZWwnXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGlzQ29sbGVjdGlvbk1vZGVsID0gPFQgZXh0ZW5kcyBvYmplY3QsIEUgZXh0ZW5kcyBDb2xsZWN0aW9uRXZlbnQ8VD4sIEsgZXh0ZW5kcyBLZXlzPFQ+Pih4OiB1bmtub3duLCBzZWxmOiBDb2xsZWN0aW9uPFQsIEUsIEs+KTogeCBpcyBUID0+IHtcbiAgICBjb25zdCBjdG9yID0gbW9kZWxDb25zdHJ1Y3RvcihzZWxmKTtcbiAgICByZXR1cm4gaXNGdW5jdGlvbihjdG9yKSA/IHggaW5zdGFuY2VvZiBjdG9yIDogZmFsc2U7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzcGxpY2VBcnJheSA9IDxUPih0YXJnZXQ6IFRbXSwgaW5zZXJ0OiBUW10sIGF0OiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICBhdCA9IE1hdGgubWluKE1hdGgubWF4KGF0LCAwKSwgdGFyZ2V0Lmxlbmd0aCk7XG4gICAgdGFyZ2V0LnNwbGljZShhdCwgMCwgLi4uaW5zZXJ0KTtcbn07XG5cbmNvbnN0IF9zZXRPcHRpb25zID0geyBhZGQ6IHRydWUsIHJlbW92ZTogdHJ1ZSwgbWVyZ2U6IHRydWUgfTtcbmNvbnN0IF9hZGRPcHRpb25zID0geyBhZGQ6IHRydWUsIHJlbW92ZTogZmFsc2UgfTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3Igb2JqZWN0IGNvbGxlY3Rpb24uXG4gKiBAamEg44Kq44OW44K444Kn44Kv44OI44Gu6ZuG5ZCI44KS5omx44GG5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogVE9ETzpcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbGxlY3Rpb248VE1vZGVsIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0LCBFdmVudCBleHRlbmRzIENvbGxlY3Rpb25FdmVudDxUTW9kZWw+ID0gQ29sbGVjdGlvbkV2ZW50PFRNb2RlbD4sIFRLZXkgZXh0ZW5kcyBLZXlzPFRNb2RlbD4gPSBLZXlzPFRNb2RlbD4+XG4gICAgZXh0ZW5kcyBFdmVudFNvdXJjZTxFdmVudD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUTW9kZWw+IHtcblxuICAgIC8qKlxuICAgICAqIEBlbiBNb2RlbCBjb25zdHJ1Y3Rvci4gPGJyPlxuICAgICAqICAgICBUaGUgY29uc3RydWN0b3IgaXMgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoaXMgW1tDb2xsZWN0aW9uXV0gY2xhc3MgZm9yIFtbVE1vZGVsXV0gY29uc3RydWN0aW9uLlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjgrPjg7Pjgrnjg4jjg6njgq/jgr8gPGJyPlxuICAgICAqICAgICBbW0NvbGxlY3Rpb25dXSDjgq/jg6njgrnjgYwgW1tUTW9kZWxdXSDjgpLmp4vnr4njgZnjgovjgZ/jgoHjgavkvb/nlKjjgZnjgotcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVhZG9ubHkgbW9kZWw/OiBDbGFzcztcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IFtfcHJvcGVydGllc106IFByb3BlcnR5PFRNb2RlbCwgVEtleT47XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBjb25zdHJ1Y3Rpb24vZGVzdHJ1Y3Rpb246XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb25zdHJ1Y3Rpb24gb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOani+evieOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlZWRzPzogVE1vZGVsW10gfCBQbGFpbk9iamVjdFtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkNvbnN0cnVjdGlvbk9wdGlvbnM8VE1vZGVsLCBUS2V5Pikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG1vZGVsT3B0aW9uczoge30sIHF1ZXJ5T3B0aW9uczoge30gfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgY29uc3QgeyBtb2RlbE9wdGlvbnMsIHF1ZXJ5T3B0aW9ucyB9ID0gb3B0cztcblxuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXSA9IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdE9wdGlvbnM6IG9wdHMsXG4gICAgICAgICAgICBwcm92aWRlcjogb3B0cy5wcm92aWRlciB8fCB0aGlzLnN5bmMuYmluZCh0aGlzKSxcbiAgICAgICAgICAgIGNpZDogbHVpZCgnY29sbGVjdGlvbjonLCA4KSxcbiAgICAgICAgICAgIHF1ZXJ5T3B0aW9ucyxcbiAgICAgICAgICAgIHF1ZXJ5SW5mbzoge30sXG4gICAgICAgICAgICBtb2RlbE9wdGlvbnMsXG4gICAgICAgICAgICBieUlkOiBuZXcgTWFwPHN0cmluZywgVE1vZGVsPigpLFxuICAgICAgICAgICAgc3RvcmU6IFtdLFxuICAgICAgICB9IGFzIHVua25vd24gYXMgUHJvcGVydHk8VE1vZGVsLCBUS2V5PjtcblxuICAgICAgICB0aGlzLmluaXRRdWVyeUluZm8oKTtcblxuICAgICAgICAvKiBtb2RlbCBldmVudCBoYW5kbGVyICovXG4gICAgICAgIHRoaXNbX29uTW9kZWxFdmVudF0gPSAoZXZlbnQ6IHN0cmluZywgbW9kZWw6IFRNb2RlbCB8IHVuZGVmaW5lZCwgY29sbGVjdGlvbjogdGhpcywgb3B0aW9uczogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudC5zdGFydHNXaXRoKCdAJykgJiYgbW9kZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoKCdAYWRkJyA9PT0gZXZlbnQgfHwgJ0ByZW1vdmUnID09PSBldmVudCkgJiYgY29sbGVjdGlvbiAhPT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgnQGRlc3Ryb3knID09PSBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtb2RlbCBldmVudCBhcmd1bWVudHMgYWRqdXN0bWVudC5cbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IChjb2xsZWN0aW9uIGFzIGFueSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoJ0BjaGFuZ2UnID09PSBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHMgPSBnZXRDaGFuZ2VkSWRzKG1vZGVsLCBtb2RlbENvbnN0cnVjdG9yKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBpZCwgcHJldklkIH0gPSBpZHM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJldklkICE9PSBpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYnlJZCB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnlJZC5zZXQoaWQsIG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCAhPSBwcmV2SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnlJZC5kZWxldGUocHJldklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBkZWxlZ2F0ZSBldmVudFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyLmNhbGwodGhpcywgZXZlbnQsIG1vZGVsLCBjb2xsZWN0aW9uLCBvcHRpb25zKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11c2VsZXNzLWNhbGxcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2VlZHMpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoc2VlZHMsIE9iamVjdC5hc3NpZ24oeyBzaWxlbnQ6IHRydWUgfSwgb3B0cykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGphIEluaXRpYWxpemUgcXVlcnkgaW5mb1xuICAgICAqIEBqYSDjgq/jgqjjg6rmg4XloLHjga7liJ3mnJ/ljJZcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgaW5pdFF1ZXJ5SW5mbygpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBzb3J0S2V5cywgY29tcGFyYXRvcnMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKHRoaXMuX2RlZmF1bHRRdWVyeU9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9xdWVyeUluZm8gPSB7IHNvcnRLZXlzLCBjb21wYXJhdG9ycyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWxlYXNlZCBhbGwgaW5zdGFuY2VzIGFuZCBldmVudCBsaXN0ZW5lciB1bmRlciB0aGUgbWFuYWdlbWVudC5cbiAgICAgKiBAamEg566h55CG5a++6LGh44KS56C05qOEXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9ucyAocmVzZXJ2ZWQpLlxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzICjkuojntIQpXG4gICAgICovXG4gICAgcHVibGljIHJlbGVhc2Uob3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogdGhpcyB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLmFmdGVyRmlsdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSA9IFtdO1xuICAgICAgICB0aGlzLmluaXRRdWVyeUluZm8oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcExpc3RlbmluZygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBqYSBDbGVhciBjYWNoZSBpbnN0YW5jZSBtZXRob2RcbiAgICAgKiBAamEg44Kt44Oj44OD44K344Ol44Gu56C05qOEXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGNsZWFyQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9xdWVyeUluZm8uY2FjaGU7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3I6IGF0dHJpYnV0ZXNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY29udGVudCBJRC5cbiAgICAgKiBAamEg44Kz44Oz44OG44Oz44OIIElEIOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uY2lkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgbW9kZWxzLlxuICAgICAqIEBqYSDjg6Ljg4fjg6vjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgbW9kZWxzKCk6IHJlYWRvbmx5IFRNb2RlbFtdIHtcbiAgICAgICAgY29uc3QgeyBfcXVlcnlGaWx0ZXIsIF9hZnRlckZpbHRlciB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIHJldHVybiAoX2FmdGVyRmlsdGVyICYmIF9hZnRlckZpbHRlciAhPT0gX3F1ZXJ5RmlsdGVyKSA/IHN0b3JlLmZpbHRlcihfYWZ0ZXJGaWx0ZXIpIDogc3RvcmU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIG51bWJlciBvZiBtb2RlbHMuXG4gICAgICogQGphIOWGheWMheOBmeOCi+ODouODh+ODq+aVsFxuICAgICAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYXBwbGllZCBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBjOmBqeeUqOOBleOCjOOBpuOBhOOCi+OBi+OCkuWIpOWumlxuICAgICAqL1xuICAgIGdldCBmaWx0ZXJlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIGluc3RhbmNlXG4gICAgICogQGphIFtbQ29sbGVjdGlvblF1ZXJ5SW5mb11dIOOCkuagvOe0jeOBmeOCi+OCpOODs+OCueOCv+ODs+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX3F1ZXJ5SW5mbygpOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSBpbnN0YW5jZVxuICAgICAqIEBqYSBbW0NvbGxlY3Rpb25RdWVyeUluZm9dXSDjgpLmoLzntI3jgZnjgovjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgc2V0IF9xdWVyeUluZm8odmFsOiBDb2xsZWN0aW9uUXVlcnlJbmZvPFRNb2RlbCwgVEtleT4pIHtcbiAgICAgICAgdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvID0gdmFsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3JlYXRpbmcgb3B0aW9ucy5cbiAgICAgKiBAamEg5qeL56+J5pmC44Gu44Kq44OX44K344On44Oz44KS5Y+W5b6XXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGdldCBfb3B0aW9ucygpOiBDb2xsZWN0aW9uQ29uc3RydWN0aW9uT3B0aW9uczxUTW9kZWwsIFRLZXk+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLmNvbnN0cnVjdE9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHByb3ZpZGVyLlxuICAgICAqIEBqYSDml6Llrprjga7jg5fjg63jg5DjgqTjg4DjgpLlj5blvpdcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9wcm92aWRlcigpOiBDb2xsZWN0aW9uSXRlbVByb3ZpZGVyPFRNb2RlbCwgVEtleT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucHJvdmlkZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHBhcnNlIGJlaGF2aW91ci5cbiAgICAgKiBAamEg5pei5a6a44GuIHBhcnNlIOWLleS9nOOCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRQYXJzZSgpOiBib29sZWFuIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnMucGFyc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBkZWZhdWx0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOaXouWumuOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2RlZmF1bHRRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIHJldHVybiB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeU9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOacgOW+jOOBruOCr+OCqOODquOCquODl+OCt+ODp+ODs+OCkuWPluW+l1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2xhc3RRdWVyeU9wdGlvbnMoKTogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiB7XG4gICAgICAgIGNvbnN0IHsgc29ydEtleXMsIGNvbXBhcmF0b3JzLCBmaWx0ZXIgfSA9IHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mbztcbiAgICAgICAgY29uc3Qgb3B0czogQ29sbGVjdGlvbkl0ZW1RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5PiA9IHt9O1xuXG4gICAgICAgIHNvcnRLZXlzLmxlbmd0aCAmJiAob3B0cy5zb3J0S2V5cyA9IHNvcnRLZXlzKTtcbiAgICAgICAgY29tcGFyYXRvcnMubGVuZ3RoICYmIChvcHRzLmNvbXBhcmF0b3JzID0gY29tcGFyYXRvcnMpO1xuICAgICAgICBmaWx0ZXIgJiYgKG9wdHMuZmlsdGVyID0gZmlsdGVyKTtcblxuICAgICAgICByZXR1cm4gb3B0cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXNzIHRvIHNvcnQgY29tcGFyYXRvcnMuXG4gICAgICogQGphIOOCveODvOODiOeUqOavlOi8g+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2NvbXBhcmF0b3JzKCk6IFNvcnRDYWxsYmFjazxUTW9kZWw+W10ge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10ucXVlcnlJbmZvLmNvbXBhcmF0b3JzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcXVlcnktZmlsdGVyLlxuICAgICAqIEBqYSDjgq/jgqjjg6rnlKjjg5XjgqPjg6vjgr/plqLmlbDjgbjjga7jgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2V0IF9xdWVyeUZpbHRlcigpOiBGaWx0ZXJDYWxsYmFjazxUTW9kZWw+IHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5maWx0ZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBhZnRlci1maWx0ZXIuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+mWouaVsOOBuOOBruOCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZXQgX2FmdGVyRmlsdGVyKCk6IEZpbHRlckNhbGxiYWNrPFRNb2RlbD4gfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXI7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczogdXRpbHNcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYSBtb2RlbCBmcm9tIGEgY29sbGVjdGlvbiwgc3BlY2lmaWVkIGJ5IGFuIGBpZGAsIGEgYGNpZGAsIG9yIGJ5IHBhc3NpbmcgaW4gYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiBAamEgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K544GL44KJ44Oi44OH44Or44KS54m55a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgYGlkYCwgYSBgY2lkYCwgb3IgYnkgcGFzc2luZyBpbiBhIG1vZGVsIGluc3RhbmNlXG4gICAgICogIC0gYGphYCAgYGlkYCwgYGNpZGAg44GK44KI44Gz44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgcHVibGljIGdldChzZWVkOiBzdHJpbmcgfCBvYmplY3QgfCB1bmRlZmluZWQpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAobnVsbCA9PSBzZWVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGlzU3RyaW5nKHNlZWQpICYmIGJ5SWQuaGFzKHNlZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gYnlJZC5nZXQoc2VlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpZCA9IGdldE1vZGVsSWQoaXNNb2RlbChzZWVkKSA/IHNlZWQudG9KU09OKCkgOiBzZWVkIGFzIG9iamVjdCwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSk7XG4gICAgICAgIGNvbnN0IGNpZCA9IChzZWVkIGFzIG9iamVjdCBhcyB7IF9jaWQ/OiBzdHJpbmc7IH0pLl9jaWQ7XG5cbiAgICAgICAgcmV0dXJuIGJ5SWQuZ2V0KGlkKSB8fCAoY2lkICYmIGJ5SWQuZ2V0KGNpZCkpIGFzIFRNb2RlbCB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgY29weSBvZiB0aGUgbW9kZWwncyBgYXR0cmlidXRlc2Agb2JqZWN0LlxuICAgICAqIEBqYSDjg6Ljg4fjg6vlsZ7mgKflgKTjga7jgrPjg5Tjg7zjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgdG9KU09OKCk6IG9iamVjdFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZWxzLm1hcChtID0+IGlzTW9kZWwobSkgPyBtLnRvSlNPTigpIDogbSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVzIENsb25lIHRoaXMgaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOBruikh+ijveOCkui/lOWNtFxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICovXG4gICAgcHVibGljIGNsb25lKCk6IHRoaXMge1xuICAgICAgICBjb25zdCB7IGNvbnN0cnVjdG9yLCBfb3B0aW9ucyB9ID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyAoY29uc3RydWN0b3IgYXMgQ29uc3RydWN0b3I8dGhpcz4pKHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLCBfb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvcmNlIGEgY29sbGVjdGlvbiB0byByZS1zb3J0IGl0c2VsZi5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz6KaB57Sg44Gu5YaN44K944O844OIXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc29ydCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44K944O844OI44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHNvcnQob3B0aW9ucz86IENvbGxlY3Rpb25SZVNvcnRPcHRpb25zPFRNb2RlbCwgVEtleT4pOiB0aGlzIHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHsgbm9UaHJvdywgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBjb25zdCB7IHNvcnRLZXlzLCBjb21wYXJhdG9yczogY29tcHMgfSA9IGVuc3VyZVNvcnRPcHRpb25zKG9wdHMpO1xuICAgICAgICBjb25zdCBjb21wYXJhdG9ycyA9IDAgPCBjb21wcy5sZW5ndGggPyBjb21wcyA6IHRoaXMuX2NvbXBhcmF0b3JzO1xuXG4gICAgICAgIGlmIChjb21wYXJhdG9ycy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgaWYgKG5vVGhyb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX0lOVkFMSURfQ09NUEFSQVRPUlMsICdDYW5ub3Qgc29ydCBhIHNldCB3aXRob3V0IGEgY29tcGFyYXRvci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlID0gc2VhcmNoSXRlbXModGhpc1tfcHJvcGVydGllc10uc3RvcmUsIHRoaXMuX2FmdGVyRmlsdGVyLCAuLi5jb21wYXJhdG9ycyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHF1ZXJ5SW5mb1xuICAgICAgICB0aGlzW19wcm9wZXJ0aWVzXS5xdWVyeUluZm8uY29tcGFyYXRvcnMgPSBjb21wYXJhdG9ycztcbiAgICAgICAgaWYgKDAgPCBzb3J0S2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXNbX3Byb3BlcnRpZXNdLnF1ZXJ5SW5mby5zb3J0S2V5cyA9IHNvcnRLZXlzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0Bzb3J0JywgdGhpcyBhcyBDb250ZXh0LCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBcHBseSBhZnRlci1maWx0ZXIgdG8gY29sbGVjdGlvbiBpdHNlbGYuXG4gICAgICogQGphIOe1nuOCiui+vOOBv+eUqOODleOCo+ODq+OCv+OBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGFmdGVyLWZpbHRlciBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg57We44KK6L6844G/44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIGZpbHRlcihvcHRpb25zPzogQ29sbGVjdGlvbkFmdGVyRmlsdGVyT3B0aW9uczxUTW9kZWw+KTogdGhpcyB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCB7IGZpbHRlciwgc2lsZW50IH0gPSBvcHRzO1xuICAgICAgICBpZiAoZmlsdGVyICE9PSB0aGlzW19wcm9wZXJ0aWVzXS5hZnRlckZpbHRlcikge1xuICAgICAgICAgICAgdGhpc1tfcHJvcGVydGllc10uYWZ0ZXJGaWx0ZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAZmlsdGVyJywgdGhpcyBhcyBDb250ZXh0LCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvcGVyYXRpb25zOiBzeW5jXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ29udmVydHMgYSByZXNwb25zZSBpbnRvIHRoZSBoYXNoIG9mIGF0dHJpYnV0ZXMgdG8gYmUgYHNldGAgb24gdGhlIGNvbGxlY3Rpb24uIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIGp1c3QgdG8gcGFzcyB0aGUgcmVzcG9uc2UgYWxvbmcuXG4gICAgICogQGphIOODrOOCueODneODs+OCueOBruWkieaPm+ODoeOCveODg+ODiS4g5pei5a6a44Gn44Gv5L2V44KC44GX44Gq44GEXG4gICAgICpcbiAgICAgKiBAb3ZlcnJpZGVcbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgcGFyc2UocmVzcG9uc2U6IFBsYWluT2JqZWN0IHwgdm9pZCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10gfCBQbGFpbk9iamVjdFtdIHwgdW5kZWZpbmVkIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIFRNb2RlbFtdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgW1tmZXRjaF1dIG1ldGhvZCBwcm94eSB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCBbW0NvbGxlY3Rpb25JdGVtUHJvdmlkZXJdXSByZXR1cm5zIG9uZS1zaG90IHJlc3VsdC5cbiAgICAgKiBAamEgW1tDb2xsZWN0aW9uSXRlbVByb3ZpZGVyXV0g5LqS5o+b44Gu5Y2Y55m644GuIGZldGNoIOe1kOaenOOCkui/lOWNtC4g5b+F6KaB44Gr5b+c44GY44Gm44Kq44O844OQ44O844Op44Kk44OJ5Y+v6IO9LlxuICAgICAqXG4gICAgICogQG92ZXJyaWRlXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgb3B0aW9uIG9iamVjdFxuICAgICAqICAtIGBqYWAg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHJvdGVjdGVkIGFzeW5jIHN5bmMob3B0aW9ucz86IENvbGxlY3Rpb25JdGVtUXVlcnlPcHRpb25zPFRNb2RlbCwgVEtleT4pOiBQcm9taXNlPENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8b2JqZWN0Pj4ge1xuICAgICAgICBjb25zdCBpdGVtcyA9IGF3YWl0IGRlZmF1bHRTeW5jKCkuc3luYygncmVhZCcsIHRoaXMgYXMgU3luY0NvbnRleHQsIG9wdGlvbnMpIGFzIFRNb2RlbFtdO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGl0ZW1zLmxlbmd0aCxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgfSBhcyBDb2xsZWN0aW9uSXRlbVF1ZXJ5UmVzdWx0PG9iamVjdD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEZldGNoIHRoZSBbW01vZGVsXV0gZnJvbSB0aGUgc2VydmVyLCBtZXJnaW5nIHRoZSByZXNwb25zZSB3aXRoIHRoZSBtb2RlbCdzIGxvY2FsIGF0dHJpYnV0ZXMuXG4gICAgICogQGphIFtbTW9kZWxdXSDlsZ7mgKfjga7jgrXjg7zjg5Djg7zlkIzmnJ8uIOODrOOCueODneODs+OCueOBruODnuODvOOCuOOCkuWun+ihjFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGZldGNoIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDjg5Xjgqfjg4Pjg4Hjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgZmV0Y2gob3B0aW9ucz86IENvbGxlY3Rpb25RdWVyeU9wdGlvbnM8VE1vZGVsLCBUS2V5Pik6IFByb21pc2U8b2JqZWN0W10+IHtcbiAgICAgICAgdHlwZSBDb250ZXh0ID0gQ29sbGVjdGlvbjxUTW9kZWw+O1xuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcHJvZ3Jlc3M6IG5vb3AgfSwgdGhpcy5fZGVmYXVsdFF1ZXJ5T3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcHJvZ3Jlc3M6IG9yaWdpbmFsLCBsaW1pdCwgcmVzZXQsIG5vQ2FjaGUgfSA9IG9wdHM7XG4gICAgICAgICAgICBjb25zdCB7IF9xdWVyeUluZm8sIF9wcm92aWRlciB9ID0gdGhpcztcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsaXplID0gKG51bGwgPT0gbGltaXQpO1xuXG4gICAgICAgICAgICBvcHRzLnByb2dyZXNzID0gKGluZm86IENvbGxlY3Rpb25JdGVtUXVlcnlSZXN1bHQ8VE1vZGVsPikgPT4ge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsKGluZm8pO1xuICAgICAgICAgICAgICAgICFmaW5hbGl6ZSAmJiB0aGlzLmFkZChpbmZvLml0ZW1zLCBvcHRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChub0NhY2hlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckNhY2hlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZmluYWxpemUgJiYgcmVzZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0KHVuZGVmaW5lZCwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBxdWVyeUl0ZW1zKF9xdWVyeUluZm8sIF9wcm92aWRlciwgb3B0cyk7XG5cbiAgICAgICAgICAgIGlmIChmaW5hbGl6ZSkge1xuICAgICAgICAgICAgICAgIHJlc2V0ID8gdGhpcy5yZXNldChyZXNwLCBvcHRzKSA6IHRoaXMuYWRkKHJlc3AsIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAc3luYycsIHRoaXMgYXMgQ29udGV4dCwgcmVzcCwgb3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQGVycm9yJywgdGhpcyBhcyBDb250ZXh0LCBlLCBvcHRzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXhlY3V0ZSBgZmV0Y2goKWAgd2l0aCBsYXN0IHF1ZXJ5IG9wdGlvbnMuXG4gICAgICogQGphIOWJjeWbnuOBqOWQjOadoeS7tuOBpyBgZmV0Y2goKWAg44KS5a6f6KGMXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVxdWVyeSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg44Oq44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHJlcXVlcnkob3B0aW9ucz86IENvbGxlY3Rpb25SZXF1ZXJ5T3B0aW9ucyk6IFByb21pc2U8b2JqZWN0W10+IHtcbiAgICAgICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2xhc3RRdWVyeU9wdGlvbnMsIG9wdGlvbnMsIHsgcmVzZXQ6IHRydWUgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoKG9wdHMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6IGNvbGxlY3Rpb24gc2V0dXBcblxuICAgIC8qKlxuICAgICAqIEBlbiBcIlNtYXJ0XCIgdXBkYXRlIG1ldGhvZCBvZiB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogICAgICAgLSBpZiB0aGUgbW9kZWwgaXMgYWxyZWFkeSBpbiB0aGUgY29sbGVjdGlvbiBpdHMgYXR0cmlidXRlcyB3aWxsIGJlIG1lcmdlZC5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBjb2xsZWN0aW9uIGNvbnRhaW5zIGFueSBtb2RlbHMgdGhhdCBhcmVuJ3QgcHJlc2VudCBpbiB0aGUgbGlzdCwgdGhleSdsbCBiZSByZW1vdmVkLlxuICAgICAqICAgICAgIC0gQWxsIG9mIHRoZSBhcHByb3ByaWF0ZSBgQGFkZGAsIGBAcmVtb3ZlYCwgYW5kIGBAdXBkYXRlYCBldmVudHMgYXJlIGZpcmVkIGFzIHRoaXMgaGFwcGVucy5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz44Gu5rGO55So5pu05paw5Yem55CGXG4gICAgICogICAgICAgLSDov73liqDmmYLjgavjgZnjgafjgavjg6Ljg4fjg6vjgYzlrZjlnKjjgZnjgovjgajjgY3jga/jgIHlsZ7mgKfjgpLjg57jg7zjgrhcbiAgICAgKiAgICAgICAtIOaMh+WumuODquOCueODiOOBq+WtmOWcqOOBl+OBquOBhOODouODh+ODq+OBr+WJiumZpFxuICAgICAqICAgICAgIC0g6YGp5YiH44GqIGBAYWRkYCwgYEByZW1vdmVgLCBgQHVwZGF0ZWAg44Kk44OZ44Oz44OI44KS55m655SfXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgTmlsIHZhbHVlLlxuICAgICAqICAtIGBqYWAgTmlsIOimgee0oFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZDogdW5kZWZpbmVkLCBvcHRpb25zPzogQ29sbGVjdGlvblNldE9wdGlvbnMpOiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7Pjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBq+ODouODh+ODq+OBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GE44Oi44OH44Or44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOioreWumuOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzZXQoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFwiU21hcnRcIiB1cGRhdGUgbWV0aG9kIG9mIHRoZSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBsaXN0IG9mIG1vZGVscy5cbiAgICAgKiAgICAgICAtIGlmIHRoZSBtb2RlbCBpcyBhbHJlYWR5IGluIHRoZSBjb2xsZWN0aW9uIGl0cyBhdHRyaWJ1dGVzIHdpbGwgYmUgbWVyZ2VkLlxuICAgICAqICAgICAgIC0gaWYgdGhlIGNvbGxlY3Rpb24gY29udGFpbnMgYW55IG1vZGVscyB0aGF0IGFyZW4ndCBwcmVzZW50IGluIHRoZSBsaXN0LCB0aGV5J2xsIGJlIHJlbW92ZWQuXG4gICAgICogICAgICAgLSBBbGwgb2YgdGhlIGFwcHJvcHJpYXRlIGBAYWRkYCwgYEByZW1vdmVgLCBhbmQgYEB1cGRhdGVgIGV2ZW50cyBhcmUgZmlyZWQgYXMgdGhpcyBoYXBwZW5zLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7Pjga7msY7nlKjmm7TmlrDlh6bnkIZcbiAgICAgKiAgICAgICAtIOi/veWKoOaZguOBq+OBmeOBp+OBq+ODouODh+ODq+OBjOWtmOWcqOOBmeOCi+OBqOOBjeOBr+OAgeWxnuaAp+OCkuODnuODvOOCuFxuICAgICAqICAgICAgIC0g5oyH5a6a44Oq44K544OI44Gr5a2Y5Zyo44GX44Gq44GE44Oi44OH44Or44Gv5YmK6ZmkXG4gICAgICogICAgICAgLSDpganliIfjgaogYEBhZGRgLCBgQHJlbW92ZWAsIGBAdXBkYXRlYCDjgqTjg5njg7Pjg4jjgpLnmbrnlJ9cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc2V0IG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDoqK3lrprjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc2V0KHNlZWRzOiAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdO1xuXG4gICAgcHVibGljIHNldChzZWVkcz86IFRNb2RlbCB8IFVua25vd25PYmplY3QgfCAoVE1vZGVsIHwgUGxhaW5PYmplY3QpW10sIG9wdGlvbnM/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbCB8IFRNb2RlbFtdIHwgdm9pZCB7XG4gICAgICAgIGlmIChpc05pbChzZWVkcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHsgcGFyc2U6IHRoaXMuX2RlZmF1bHRQYXJzZSB9LCBfc2V0T3B0aW9ucywgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgaWYgKG9wdHMucGFyc2UgJiYgIWlzQ29sbGVjdGlvbk1vZGVsKHNlZWRzLCB0aGlzKSkge1xuICAgICAgICAgICAgc2VlZHMgPSB0aGlzLnBhcnNlKHNlZWRzLCBvcHRpb25zKSB8fCBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNpbmd1bGFyID0gIWlzQXJyYXkoc2VlZHMpO1xuICAgICAgICBjb25zdCBpdGVtczogKFRNb2RlbCB8IG9iamVjdCB8IHVuZGVmaW5lZClbXSA9IHNpbmd1bGFyID8gW3NlZWRzXSA6IChzZWVkcyBhcyBvYmplY3RbXSkuc2xpY2UoKTtcblxuICAgICAgICBjb25zdCB7IHN0b3JlIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcblxuICAgICAgICBjb25zdCBhdCA9ICgoY2FuZGlkYXRlKTogbnVtYmVyIHwgdm9pZCA9PiB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlID4gc3RvcmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSArPSBzdG9yZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoY2FuZGlkYXRlIDwgMCkgPyAwIDogY2FuZGlkYXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KShvcHRzLmF0KTtcblxuICAgICAgICBjb25zdCBzZXQ6IG9iamVjdFtdICAgICAgPSBbXTtcbiAgICAgICAgY29uc3QgdG9BZGQ6IFRNb2RlbFtdICAgID0gW107XG4gICAgICAgIGNvbnN0IHRvTWVyZ2U6IFRNb2RlbFtdICA9IFtdO1xuICAgICAgICBjb25zdCB0b1JlbW92ZTogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgY29uc3QgbW9kZWxTZXQgPSBuZXcgU2V0PG9iamVjdD4oKTtcblxuICAgICAgICBjb25zdCB7IGFkZCwgbWVyZ2UsIHJlbW92ZSwgcGFyc2UsIHNpbGVudCB9ID0gb3B0cztcblxuICAgICAgICBsZXQgc29ydCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBzb3J0YWJsZSA9IHRoaXMuX2NvbXBhcmF0b3JzLmxlbmd0aCAmJiBudWxsID09IGF0ICYmIGZhbHNlICE9PSBvcHRzLnNvcnQ7XG5cbiAgICAgICAgdHlwZSBNb2RlbEZlYXR1cmUgPSB7XG4gICAgICAgICAgICBwYXJzZTogKGF0cnI/OiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IG9iamVjdDtcbiAgICAgICAgICAgIHNldEF0dHJpYnV0ZXM6IChhdHJyOiBvYmplY3QsIG9wdGlvbnM/OiBvYmplY3QpID0+IHZvaWQ7XG4gICAgICAgICAgICBoYXNDaGFuZ2VkOiAoKSA9PiBib29sZWFuO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFR1cm4gYmFyZSBvYmplY3RzIGludG8gbW9kZWwgcmVmZXJlbmNlcywgYW5kIHByZXZlbnQgaW52YWxpZCBtb2RlbHMgZnJvbSBiZWluZyBhZGRlZC5cbiAgICAgICAgZm9yIChjb25zdCBbaSwgaXRlbV0gb2YgaXRlbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAvLyBJZiBhIGR1cGxpY2F0ZSBpcyBmb3VuZCwgcHJldmVudCBpdCBmcm9tIGJlaW5nIGFkZGVkIGFuZCBvcHRpb25hbGx5IG1lcmdlIGl0IGludG8gdGhlIGV4aXN0aW5nIG1vZGVsLlxuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSB0aGlzLmdldChpdGVtKSBhcyBNb2RlbEZlYXR1cmU7XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAobWVyZ2UgJiYgaXRlbSAhPT0gZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJzID0gaXNNb2RlbChpdGVtKSA/IGl0ZW0udG9KU09OKCkgOiBpdGVtO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2UgJiYgaXNGdW5jdGlvbihleGlzdGluZy5wYXJzZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzID0gZXhpc3RpbmcucGFyc2UoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24oZXhpc3Rpbmcuc2V0QXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nLnNldEF0dHJpYnV0ZXMoYXR0cnMsIG9wdHMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihleGlzdGluZywgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdG9NZXJnZS5wdXNoKGV4aXN0aW5nIGFzIFRNb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3J0YWJsZSAmJiAhc29ydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydCA9IGlzRnVuY3Rpb24oZXhpc3RpbmcuaGFzQ2hhbmdlZCkgPyBleGlzdGluZy5oYXNDaGFuZ2VkKCkgOiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbW9kZWxTZXQuaGFzKGV4aXN0aW5nKSkge1xuICAgICAgICAgICAgICAgICAgICBtb2RlbFNldC5hZGQoZXhpc3RpbmcpO1xuICAgICAgICAgICAgICAgICAgICBzZXQucHVzaChleGlzdGluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGl0ZW1zW2ldID0gZXhpc3Rpbmc7XG4gICAgICAgICAgICB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgYnJhY2Utc3R5bGVcblxuICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIG5ldywgdmFsaWQgbW9kZWwsIHB1c2ggaXQgdG8gdGhlIGB0b0FkZGAgbGlzdC5cbiAgICAgICAgICAgIGVsc2UgaWYgKGFkZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gaXRlbXNbaV0gPSB0aGlzW19wcmVwYXJlTW9kZWxdKGl0ZW0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgICAgICAgICAgICB0b0FkZC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tfYWRkUmVmZXJlbmNlXShtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIG1vZGVsU2V0LmFkZChtb2RlbCk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgc3RhbGUgbW9kZWxzLlxuICAgICAgICBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIHN0b3JlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RlbFNldC5oYXMobW9kZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvUmVtb3ZlLnB1c2gobW9kZWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b1JlbW92ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzW19yZW1vdmVNb2RlbHNdKHRvUmVtb3ZlLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlZSBpZiBzb3J0aW5nIGlzIG5lZWRlZCwgdXBkYXRlIGBsZW5ndGhgIGFuZCBzcGxpY2UgaW4gbmV3IG1vZGVscy5cbiAgICAgICAgbGV0IG9yZGVyQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCByZXBsYWNlID0gIXNvcnRhYmxlICYmIGFkZCAmJiByZW1vdmU7XG4gICAgICAgIGlmIChzZXQubGVuZ3RoICYmIHJlcGxhY2UpIHtcbiAgICAgICAgICAgIG9yZGVyQ2hhbmdlZCA9IChzdG9yZS5sZW5ndGggIT09IHNldC5sZW5ndGgpIHx8IHN0b3JlLnNvbWUoKG0sIGluZGV4KSA9PiBtICE9PSBzZXRbaW5kZXhdKTtcbiAgICAgICAgICAgIHN0b3JlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBzcGxpY2VBcnJheShzdG9yZSwgc2V0LCAwKTtcbiAgICAgICAgfSBlbHNlIGlmICh0b0FkZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChzb3J0YWJsZSkge1xuICAgICAgICAgICAgICAgIHNvcnQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3BsaWNlQXJyYXkoc3RvcmUsIHRvQWRkLCBudWxsID09IGF0ID8gc3RvcmUubGVuZ3RoIDogYXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2lsZW50bHkgc29ydCB0aGUgY29sbGVjdGlvbiBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgaWYgKHNvcnQpIHtcbiAgICAgICAgICAgIHRoaXMuc29ydCh7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVubGVzcyBzaWxlbmNlZCwgaXQncyB0aW1lIHRvIGZpcmUgYWxsIGFwcHJvcHJpYXRlIGFkZC9zb3J0L3VwZGF0ZSBldmVudHMuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICB0eXBlIENvbnRleHQgPSBDb2xsZWN0aW9uPFRNb2RlbD47XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtpLCBtb2RlbF0gb2YgdG9BZGQuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgIT0gYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGF0ICsgaTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzTW9kZWwobW9kZWwpIHx8IChtb2RlbCBpbnN0YW5jZW9mIEV2ZW50QnJva2VyKSkge1xuICAgICAgICAgICAgICAgICAgICAobW9kZWwgYXMgTW9kZWwpLnRyaWdnZXIoJ0BhZGQnLCBtb2RlbCBhcyBNb2RlbCwgdGhpcywgb3B0cyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQGFkZCcsIG1vZGVsLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzb3J0IHx8IG9yZGVyQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0Bzb3J0JywgdGhpcyBhcyBDb250ZXh0LCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b0FkZC5sZW5ndGggfHwgdG9SZW1vdmUubGVuZ3RoIHx8IHRvTWVyZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb3B0cy5jaGFuZ2VzID0ge1xuICAgICAgICAgICAgICAgICAgICBhZGRlZDogdG9BZGQsXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZWQ6IHRvUmVtb3ZlLFxuICAgICAgICAgICAgICAgICAgICBtZXJnZWQ6IHRvTWVyZ2VcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICh0aGlzIGFzIENvbnRleHQpLnRyaWdnZXIoJ0B1cGRhdGUnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZHJvcCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgcmV0dmFsID0gaXRlbXMuZmlsdGVyKGkgPT4gbnVsbCAhPSBpKSBhcyBUTW9kZWxbXTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIGFkZGVkIChvciBtZXJnZWQpIG1vZGVsIChvciBtb2RlbHMpLlxuICAgICAgICByZXR1cm4gc2luZ3VsYXIgPyByZXR2YWxbMF0gOiAocmV0dmFsLmxlbmd0aCA/IHJldHZhbCA6IHZvaWQgMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgYSBjb2xsZWN0aW9uIHdpdGggYSBuZXcgbGlzdCBvZiBtb2RlbHMgKG9yIGF0dHJpYnV0ZSBoYXNoZXMpLCB0cmlnZ2VyaW5nIGEgc2luZ2xlIGByZXNldGAgZXZlbnQgb24gY29tcGxldGlvbi5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz44KS5paw44GX44GE44Oi44OH44Or5LiA6Kan44Gn572u5o+bLiDlrozkuobmmYLjgasgYHJlc2V0YCDjgqTjg5njg7Pjg4jjgpLnmbrooYxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkc1xuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwgYXJyYXkuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjga7phY3liJfjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVzZXQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOODquOCu+ODg+ODiOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZXNldChzZWVkcz86IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMgJiB7IHByZXZpb3VzOiBUTW9kZWxbXTsgfTtcbiAgICAgICAgY29uc3QgeyBzdG9yZSB9ID0gdGhpc1tfcHJvcGVydGllc107XG4gICAgICAgIGZvciAoY29uc3QgbW9kZWwgb2Ygc3RvcmUpIHtcbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0cy5wcmV2aW91cyA9IHN0b3JlLnNsaWNlKCk7XG4gICAgICAgIHJlc2V0TW9kZWxTdG9yZSh0aGlzW19wcm9wZXJ0aWVzXSk7XG5cbiAgICAgICAgY29uc3QgbW9kZWxzID0gc2VlZHMgPyB0aGlzLmFkZChzZWVkcywgT2JqZWN0LmFzc2lnbih7IHNpbGVudDogdHJ1ZSB9LCBvcHRzKSkgOiBbXTtcblxuICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICB0eXBlIENvbnRleHQgPSBDb2xsZWN0aW9uPFRNb2RlbD47XG4gICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAcmVzZXQnLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vZGVscztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIG1vZGVsIHRvIHRoZSBjb2xsZWN0aW9uLlxuICAgICAqIEBqYSDjgrPjg6zjgq/jgrfjg6fjg7Pjgbjjga7jg6Ljg4fjg6vjga7ov73liqBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzZWVkXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbC5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGQoc2VlZDogVE1vZGVsIHwgVW5rbm93bk9iamVjdCwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCB0byB0aGUgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbGlzdCBvZiBtb2RlbHMuXG4gICAgICogQGphIOODouODh+ODq+ODquOCueODiOaMh+WumuOBq+OCiOOCi+OCs+ODrOOCr+OCt+ODp+ODs+OBuOOBrui/veWKoFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBhZGQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOi/veWKoOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBhZGQoc2VlZHM6IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25BZGRPcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgYWRkKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbkFkZE9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldChzZWVkcyBhcyBVbmtub3duT2JqZWN0LCBPYmplY3QuYXNzaWduKHsgbWVyZ2U6IGZhbHNlIH0sIG9wdGlvbnMsIF9hZGRPcHRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBhIG1vZGVsIGZyb20gdGhlIHNldC5cbiAgICAgKiBAamEg44Kz44Os44Kv44K344On44Oz44GL44KJ44Oi44OH44Or44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2VlZFxuICAgICAqICAtIGBlbmAgZ2l2ZW4gdGhlIHNlZWQgb2YgbW9kZWwuXG4gICAgICogIC0gYGphYCDjg6Ljg4fjg6vopoHntKDjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVtb3ZlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDliYrpmaTjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWQ6IFRNb2RlbCB8IFVua25vd25PYmplY3QsIG9wdGlvbnM/OiBDb2xsZWN0aW9uT3BlcmF0aW9uT3B0aW9ucyk6IFRNb2RlbDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgYSBsaXN0IG9mIG1vZGVscyBmcm9tIHRoZSBzZXQuXG4gICAgICogQGphIOODouODh+ODq+ODquOCueODiOaMh+WumuOBq+OCiOOCi+OCs+ODrOOCr+OCt+ODp+ODs+OBi+OCieOBruWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIHNlZWRzXG4gICAgICogIC0gYGVuYCBnaXZlbiB0aGUgc2VlZCBvZiBtb2RlbCBhcnJheS5cbiAgICAgKiAgLSBgamFgIOODouODh+ODq+imgee0oOOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZW1vdmUgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOWJiumZpOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyByZW1vdmUoc2VlZHM6IChUTW9kZWwgfCBQbGFpbk9iamVjdClbXSwgb3B0aW9ucz86IENvbGxlY3Rpb25PcGVyYXRpb25PcHRpb25zKTogVE1vZGVsW107XG5cbiAgICBwdWJsaWMgcmVtb3ZlKHNlZWRzOiBUTW9kZWwgfCBVbmtub3duT2JqZWN0IHwgKFRNb2RlbCB8IFBsYWluT2JqZWN0KVtdLCBvcHRpb25zPzogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWwgfCBUTW9kZWxbXSB7XG4gICAgICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKSBhcyBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uczxUTW9kZWw+O1xuICAgICAgICBjb25zdCBzaW5ndWxhciA9ICFpc0FycmF5KHNlZWRzKTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBzaW5ndWxhciA/IFtzZWVkcyBhcyBUTW9kZWxdIDogKHNlZWRzIGFzIFRNb2RlbFtdKS5zbGljZSgpO1xuICAgICAgICBjb25zdCByZW1vdmVkID0gdGhpc1tfcmVtb3ZlTW9kZWxzXShpdGVtcywgb3B0cyk7XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIG9wdHMuY2hhbmdlcyA9IHsgYWRkZWQ6IFtdLCBtZXJnZWQ6IFtdLCByZW1vdmVkIH07XG4gICAgICAgICAgICB0eXBlIENvbnRleHQgPSBDb2xsZWN0aW9uPFRNb2RlbD47XG4gICAgICAgICAgICAodGhpcyBhcyBDb250ZXh0KS50cmlnZ2VyKCdAdXBkYXRlJywgdGhpcyBhcyBDb250ZXh0LCBvcHRzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2luZ3VsYXIgPyByZW1vdmVkWzBdIDogcmVtb3ZlZDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIG1vZGVsIHByZXBhcmF0aW9uICovXG4gICAgcHJpdmF0ZSBbX3ByZXBhcmVNb2RlbF0oYXR0cnM6IG9iamVjdCB8IFRNb2RlbCB8IHVuZGVmaW5lZCwgb3B0aW9uczogQ29sbGVjdGlvbk9wZXJhdGlvbk9wdGlvbnMpOiBUTW9kZWwgfCB1bmRlZmluZWQge1xuICAgICAgICBpZiAoaXNDb2xsZWN0aW9uTW9kZWwoYXR0cnMsIHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXR0cnM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb25zdHJ1Y3RvciA9IG1vZGVsQ29uc3RydWN0b3IodGhpcyk7XG4gICAgICAgIGNvbnN0IHsgbW9kZWxPcHRpb25zIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgaWYgKGNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgbW9kZWxPcHRpb25zLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IG1vZGVsID0gbmV3IGNvbnN0cnVjdG9yKGF0dHJzLCBvcHRzKSBhcyB7IHZhbGlkYXRlOiAoKSA9PiBSZXN1bHQ7IH07XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihtb2RlbC52YWxpZGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBtb2RlbC52YWxpZGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChGQUlMRUQocmVzdWx0LmNvZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQGludmFsaWQnLCBhdHRycyBhcyBUTW9kZWwsIHRoaXMgYXMgQ29udGV4dCwgcmVzdWx0LCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbW9kZWwgYXMgVE1vZGVsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcGxhaW4gb2JqZWN0XG4gICAgICAgIHJldHVybiBhdHRycyBhcyBUTW9kZWw7XG4gICAgfVxuXG4gICAgLyoqIEBpbmV0ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIGNhbGxlZCBieSBib3RoIHJlbW92ZSBhbmQgc2V0LiAqL1xuICAgIHByaXZhdGUgW19yZW1vdmVNb2RlbHNdKG1vZGVsczogVE1vZGVsW10sIG9wdGlvbnM6IENvbGxlY3Rpb25TZXRPcHRpb25zKTogVE1vZGVsW10ge1xuICAgICAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucykgYXMgQ29sbGVjdGlvblVwZGF0ZU9wdGlvbnM8VE1vZGVsPjtcbiAgICAgICAgY29uc3QgcmVtb3ZlZDogVE1vZGVsW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBtZGwgb2YgbW9kZWxzKSB7XG4gICAgICAgICAgICBjb25zdCBtb2RlbCA9IHRoaXMuZ2V0KG1kbCk7XG4gICAgICAgICAgICBpZiAoIW1vZGVsKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgc3RvcmUgfSA9IHRoaXNbX3Byb3BlcnRpZXNdO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzdG9yZS5pbmRleE9mKG1vZGVsKTtcbiAgICAgICAgICAgIHN0b3JlLnNwbGljZShpbmRleCwgMSk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSByZWZlcmVuY2VzIGJlZm9yZSB0cmlnZ2VyaW5nICdyZW1vdmUnIGV2ZW50IHRvIHByZXZlbnQgYW4gaW5maW5pdGUgbG9vcC5cbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwsIHRydWUpO1xuXG4gICAgICAgICAgICBpZiAoIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgb3B0cy5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGlmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudEJyb2tlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgKG1vZGVsIGFzIE1vZGVsKS50cmlnZ2VyKCdAcmVtb3ZlJywgbW9kZWwgYXMgTW9kZWwsIHRoaXMsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgQ29udGV4dCA9IENvbGxlY3Rpb248VE1vZGVsPjtcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMgQ29udGV4dCkudHJpZ2dlcignQHJlbW92ZScsIG1vZGVsLCB0aGlzIGFzIENvbnRleHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKG1vZGVsKTtcbiAgICAgICAgICAgIHRoaXNbX3JlbW92ZVJlZmVyZW5jZV0obW9kZWwsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVtb3ZlZDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIEludGVybmFsIG1ldGhvZCB0byBjcmVhdGUgYSBtb2RlbCdzIHRpZXMgdG8gYSBjb2xsZWN0aW9uLiAqL1xuICAgIHByaXZhdGUgW19hZGRSZWZlcmVuY2VdKG1vZGVsOiBUTW9kZWwpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgY29uc3QgeyBfY2lkLCBpZCB9ID0gbW9kZWwgYXMgeyBfY2lkOiBzdHJpbmc7IGlkOiBzdHJpbmc7IH07XG4gICAgICAgIGlmIChudWxsICE9IF9jaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuc2V0KF9jaWQsIG1vZGVsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobnVsbCAhPSBpZCkge1xuICAgICAgICAgICAgYnlJZC5zZXQoaWQsIG1vZGVsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNNb2RlbChtb2RlbCkgfHwgKG1vZGVsIGluc3RhbmNlb2YgRXZlbnRQdWJsaXNoZXIpKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlblRvKG1vZGVsIGFzIFN1YnNjcmliYWJsZSwgJyonLCB0aGlzW19vbk1vZGVsRXZlbnRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgSW50ZXJuYWwgbWV0aG9kIHRvIHNldmVyIGEgbW9kZWwncyB0aWVzIHRvIGEgY29sbGVjdGlvbi4gKi9cbiAgICBwcml2YXRlIFtfcmVtb3ZlUmVmZXJlbmNlXShtb2RlbDogVE1vZGVsLCBwYXJ0aWFsID0gZmFsc2UpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBieUlkIH0gPSB0aGlzW19wcm9wZXJ0aWVzXTtcbiAgICAgICAgY29uc3QgeyBfY2lkLCBpZCB9ID0gbW9kZWwgYXMgeyBfY2lkOiBzdHJpbmc7IGlkOiBzdHJpbmc7IH07XG4gICAgICAgIGlmIChudWxsICE9IF9jaWQpIHtcbiAgICAgICAgICAgIGJ5SWQuZGVsZXRlKF9jaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChudWxsICE9IGlkKSB7XG4gICAgICAgICAgICBieUlkLmRlbGV0ZShpZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXJ0aWFsICYmIChpc01vZGVsKG1vZGVsKSB8fCAobW9kZWwgaW5zdGFuY2VvZiBFdmVudFB1Ymxpc2hlcikpKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3BMaXN0ZW5pbmcobW9kZWwgYXMgU3Vic2NyaWJhYmxlLCAnKicsIHRoaXNbX29uTW9kZWxFdmVudF0pO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSXRlcmFibGU8VE1vZGVsPlxuXG4gICAgLyoqXG4gICAgICogQGVuIEl0ZXJhdG9yIG9mIFtbRWxlbWVudEJhc2VdXSB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSDmoLzntI3jgZfjgabjgYTjgosgW1tFbGVtZW50QmFzZV1dIOOBq+OCouOCr+OCu+OCueWPr+iDveOBquOCpOODhuODrOODvOOCv+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFRNb2RlbD4ge1xuICAgICAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgICAgICAgIGJhc2U6IHRoaXNbX3Byb3BlcnRpZXNdLnN0b3JlLFxuICAgICAgICAgICAgcG9pbnRlcjogMCxcbiAgICAgICAgICAgIG5leHQoKTogSXRlcmF0b3JSZXN1bHQ8VE1vZGVsPiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRlciA8IHRoaXMuYmFzZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYmFzZVt0aGlzLnBvaW50ZXIrK10sXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yIGFzIEl0ZXJhdG9yPFRNb2RlbD47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2Yga2V5KGlkKSwgdmFsdWUobW9kZWwpIHBhaXJzIGZvciBldmVyeSBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAgICogQGphIGtleShpZCksIHZhbHVlKG1vZGVsKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W3N0cmluZywgVE1vZGVsXT4ge1xuICAgICAgICByZXR1cm4gdGhpc1tfY3JlYXRlSXRlcmFibGVJdGVyYXRvcl0oKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiBba2V5LCB2YWx1ZV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGtleXMoaWQpIGluIHRoZSBhcnJheS5cbiAgICAgKiBAamEga2V5KGlkKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiB0aGlzW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXSgoa2V5OiBzdHJpbmcpID0+IGtleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYW4gaXRlcmFibGUgb2YgdmFsdWVzKFtbRWxlbWVudEJhc2VdXSkgaW4gdGhlIGFycmF5LlxuICAgICAqIEBqYSB2YWx1ZXMoW1tFbGVtZW50QmFzZV1dKSDphY3liJfjgavjgqLjgq/jgrvjgrnlj6/og73jgarjgqTjg4bjg6zjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxUTW9kZWw+IHtcbiAgICAgICAgcmV0dXJuIHRoaXNbX2NyZWF0ZUl0ZXJhYmxlSXRlcmF0b3JdKChrZXk6IHN0cmluZywgdmFsdWU6IFRNb2RlbCkgPT4gdmFsdWUpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGl0ZXJhdG9yIGNyZWF0ZSBmdW5jdGlvbiAqL1xuICAgIHByaXZhdGUgW19jcmVhdGVJdGVyYWJsZUl0ZXJhdG9yXTxSPih2YWx1ZUdlbmVyYXRvcjogKGtleTogc3RyaW5nLCB2YWx1ZTogVE1vZGVsKSA9PiBSKTogSXRlcmFibGVJdGVyYXRvcjxSPiB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSB7XG4gICAgICAgICAgICBiYXNlOiB0aGlzW19wcm9wZXJ0aWVzXS5zdG9yZSxcbiAgICAgICAgICAgIHBvaW50ZXI6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcG9zMmtleSA9IChwb3M6IG51bWJlcik6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0TW9kZWxJZChjb250ZXh0LmJhc2VbcG9zXSwgbW9kZWxDb25zdHJ1Y3Rvcih0aGlzKSkgfHwgU3RyaW5nKHBvcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4gPSB7XG4gICAgICAgICAgICBuZXh0KCk6IEl0ZXJhdG9yUmVzdWx0PFI+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY29udGV4dC5wb2ludGVyO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgY29udGV4dC5iYXNlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnBvaW50ZXIrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlR2VuZXJhdG9yKHBvczJrZXkoY3VycmVudCksIGNvbnRleHQuYmFzZVtjdXJyZW50XSksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkISwgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Uj4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gaXRlcmF0b3I7XG4gICAgfVxufVxuXG4vLyBtaXhpbiDjgavjgojjgosgYGluc3RhbmNlb2ZgIOOBr+eEoeWKueOBq+ioreWumlxuc2V0TWl4Q2xhc3NBdHRyaWJ1dGUoQ29sbGVjdGlvbiBhcyBDbGFzcywgJ2luc3RhbmNlT2YnLCBudWxsKTtcblxuLypcbiDimIYgaWRcbiDimIYgbW9kZWxzL2l0ZW1zXG4g4piGIGxlbmd0aFxuIOKYhiByZWxlYXNlKClcbiDimIYgZmV0Y2goKVxuIOKYhiByZXF1ZXJ5KClcblxuIOKYhSAtIExpc3RFZGl0YWJsZTxUPiDjgpLjganjgYbjgZnjgovjgYs/XG5cbiDimIUgdXJsOiBzdHJpbmcgfCAoKCkgPT4gc3RyaW5nKTtcblxuIOKYhSB3aXRob3V0KC4uLnZhbHVlczogVE1vZGVsW10pOiBUTW9kZWxbXTtcblxuIOKYhiBhZGQobW9kZWw6IHt9fFRNb2RlbCwgb3B0aW9ucz86IEFkZE9wdGlvbnMpOiBUTW9kZWw7XG4g4piGIGFkZChtb2RlbHM6ICh7fXxUTW9kZWwpW10sIG9wdGlvbnM/OiBBZGRPcHRpb25zKTogVE1vZGVsW107XG4g4piFIGF0KGluZGV4OiBudW1iZXIpOiBUTW9kZWw7XG4g4piGIGdldChpZDogbnVtYmVyIHwgc3RyaW5nIHwgTW9kZWwpOiBUTW9kZWw7XG4g4piFIGhhcyhrZXk6IG51bWJlciB8IHN0cmluZyB8IE1vZGVsKTogYm9vbGVhbjtcbiDimIYgY2xvbmUoKTogdGhpcztcbiDimIUgY3JlYXRlKGF0dHJpYnV0ZXM6IGFueSwgb3B0aW9ucyA/OiBNb2RlbFNhdmVPcHRpb25zKTogVE1vZGVsO1xuIOKYhSBwbHVjayhhdHRyaWJ1dGU6IHN0cmluZyk6IGFueVtdO1xuIOKYhSBwdXNoKG1vZGVsOiBUTW9kZWwsIG9wdGlvbnMgPzogQWRkT3B0aW9ucyk6IFRNb2RlbDtcbiDimIUgcG9wKG9wdGlvbnMgPzogU2lsZW5jZWFibGUpOiBUTW9kZWw7XG4g4piGIHJlbW92ZShtb2RlbDoge30gfCBUTW9kZWwsIG9wdGlvbnMgPzogU2lsZW5jZWFibGUpOiBUTW9kZWw7XG4g4piGIHJlbW92ZShtb2RlbHM6ICh7fSB8IFRNb2RlbClbXSwgb3B0aW9ucyA/OiBTaWxlbmNlYWJsZSk6IFRNb2RlbFtdO1xuIOKYhiByZXNldChtb2RlbHMgPzogVE1vZGVsW10sIG9wdGlvbnMgPzogU2lsZW5jZWFibGUpOiBUTW9kZWxbXTtcbiDimIYgc2V0KG1vZGVscyA/OiBUTW9kZWxbXSwgb3B0aW9ucyA/OiBDb2xsZWN0aW9uU2V0T3B0aW9ucyk6IFRNb2RlbFtdO1xuIOKYhSBzaGlmdChvcHRpb25zID86IFNpbGVuY2VhYmxlKTogVE1vZGVsO1xuIOKYhiBzb3J0KG9wdGlvbnMgPzogU2lsZW5jZWFibGUpOiBDb2xsZWN0aW9uPFRNb2RlbD47XG4g4piFIHVuc2hpZnQobW9kZWw6IFRNb2RlbCwgb3B0aW9ucyA/OiBBZGRPcHRpb25zKTogVE1vZGVsO1xuIOKYhSB3aGVyZShwcm9wZXJ0aWVzOiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgZmluZFdoZXJlKHByb3BlcnRpZXM6IGFueSk6IFRNb2RlbDtcbiDimIUgbW9kZWxJZChhdHRyczogYW55KSA6IGFueVxuIOKYhSBzbGljZShtaW4/OiBudW1iZXIsIG1heD86IG51bWJlcik6IFRNb2RlbFtdO1xuXG4gLy8gbWl4aW5zIGZyb20gdW5kZXJzY29yZSAo5Z+65pys44KE44KJ44Gq44GEIGluY2x1ZGVzIOOBoOOBkeOChOOCiy4gKyBmaWx0ZXIg44KSIGFmdGVyRmlsdGVyIOOBp+Wun+ePvuOBmeOCiylcblxuIOKYhSBhbGwoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogYm9vbGVhbjtcbiDimIUgYW55KGl0ZXJhdG9yPzogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IGJvb2xlYW47XG4g4piFIGNoYWluKCk6IGFueTtcbiDimIUgY29sbGVjdDxUUmVzdWx0PihpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgY29udGV4dD86IGFueSk6IFRSZXN1bHRbXTtcbiDimIUgY29udGFpbnModmFsdWU6IFRNb2RlbCk6IGJvb2xlYW47XG4g4piFIGNvdW50QnkoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGFueT4pOiBfLkRpY3Rpb25hcnk8bnVtYmVyPjtcbiDimIUgY291bnRCeShpdGVyYXRvcjogc3RyaW5nKTogXy5EaWN0aW9uYXJ5PG51bWJlcj47XG4g4piFIGRldGVjdChpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IFRNb2RlbDtcbiDimIUgZGlmZmVyZW5jZShvdGhlcnM6IFRNb2RlbFtdKTogVE1vZGVsW107XG4g4piFIGRyb3Aobj86IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBlYWNoKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIHZvaWQ+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIGV2ZXJ5KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogYm9vbGVhbjtcbiDimIYgZmlsdGVyKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIGZpbmQoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWw7XG4g4piFIGZpbmRJbmRleChwcmVkaWNhdGU6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBudW1iZXI7XG4g4piFIGZpbmRMYXN0SW5kZXgocHJlZGljYXRlOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogbnVtYmVyO1xuIOKYhSBmaXJzdCgpOiBUTW9kZWw7XG4g4piFIGZpcnN0KG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBmb2xkbDxUUmVzdWx0PihpdGVyYXRvcjogXy5NZW1vSXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgbWVtbz86IFRSZXN1bHQsIGNvbnRleHQ/OiBhbnkpOiBUUmVzdWx0O1xuIOKYhSBmb2xkcjxUUmVzdWx0PihpdGVyYXRvcjogXy5NZW1vSXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgbWVtbz86IFRSZXN1bHQsIGNvbnRleHQ/OiBhbnkpOiBUUmVzdWx0O1xuIOKYhSBmb3JFYWNoKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIHZvaWQ+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIGdyb3VwQnkoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYW55PiwgY29udGV4dD86IGFueSk6IF8uRGljdGlvbmFyeTxUTW9kZWxbXT47XG4g4piFIGdyb3VwQnkoaXRlcmF0b3I6IHN0cmluZywgY29udGV4dD86IGFueSk6IF8uRGljdGlvbmFyeTxUTW9kZWxbXT47XG4g4piFIGhlYWQoKTogVE1vZGVsO1xuIOKYhSBoZWFkKG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBpbmNsdWRlKHZhbHVlOiBUTW9kZWwpOiBib29sZWFuO1xuIOKYhSBpbmNsdWRlcyh2YWx1ZTogVE1vZGVsKTogYm9vbGVhbjtcbiDimIUgaW5kZXhCeShpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBhbnk+LCBjb250ZXh0PzogYW55KTogXy5EaWN0aW9uYXJ5PFRNb2RlbD47XG4g4piFIGluZGV4QnkoaXRlcmF0b3I6IHN0cmluZywgY29udGV4dD86IGFueSk6IF8uRGljdGlvbmFyeTxUTW9kZWw+O1xuIOKYhSBpbmRleE9mKHZhbHVlOiBUTW9kZWwsIGlzU29ydGVkPzogYm9vbGVhbik6IG51bWJlcjtcbiDimIUgaW5pdGlhbCgpOiBUTW9kZWw7XG4g4piFIGluaXRpYWwobjogbnVtYmVyKTogVE1vZGVsW107XG4g4piFIGluamVjdDxUUmVzdWx0PihpdGVyYXRvcjogXy5NZW1vSXRlcmF0b3I8VE1vZGVsLCBUUmVzdWx0PiwgbWVtbz86IFRSZXN1bHQsIGNvbnRleHQ/OiBhbnkpOiBUUmVzdWx0O1xuIOKYhSBpbnZva2UobWV0aG9kTmFtZTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IGFueTtcbiDimIUgaXNFbXB0eSgpOiBib29sZWFuO1xuIOKYhSBsYXN0KCk6IFRNb2RlbDtcbiDimIUgbGFzdChuOiBudW1iZXIpOiBUTW9kZWxbXTtcbiDimIUgbGFzdEluZGV4T2YodmFsdWU6IFRNb2RlbCwgZnJvbT86IG51bWJlcik6IG51bWJlcjtcbiDimIUgbWFwPFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBjb250ZXh0PzogYW55KTogVFJlc3VsdFtdO1xuIOKYhSBtYXgoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGFueT4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWw7XG4g4piFIG1pbihpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYW55PiwgY29udGV4dD86IGFueSk6IFRNb2RlbDtcbiDimIUgcGFydGl0aW9uKGl0ZXJhdG9yOiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+KTogVE1vZGVsW11bXTtcbiDimIUgcmVkdWNlPFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLk1lbW9JdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBtZW1vPzogVFJlc3VsdCwgY29udGV4dD86IGFueSk6IFRSZXN1bHQ7XG4g4piFIHJlZHVjZVJpZ2h0PFRSZXN1bHQ+KGl0ZXJhdG9yOiBfLk1lbW9JdGVyYXRvcjxUTW9kZWwsIFRSZXN1bHQ+LCBtZW1vPzogVFJlc3VsdCwgY29udGV4dD86IGFueSk6IFRSZXN1bHQ7XG4g4piFIHJlamVjdChpdGVyYXRvcjogXy5MaXN0SXRlcmF0b3I8VE1vZGVsLCBib29sZWFuPiwgY29udGV4dD86IGFueSk6IFRNb2RlbFtdO1xuIOKYhSByZXN0KG4/OiBudW1iZXIpOiBUTW9kZWxbXTtcbiDimIUgc2FtcGxlKCk6IFRNb2RlbDtcbiDimIUgc2FtcGxlKG46IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSBzZWxlY3QoaXRlcmF0b3I6IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgYm9vbGVhbj4sIGNvbnRleHQ/OiBhbnkpOiBUTW9kZWxbXTtcbiDimIUgc2h1ZmZsZSgpOiBUTW9kZWxbXTtcbiDimIUgc2l6ZSgpOiBudW1iZXI7XG4g4piFIHNvbWUoaXRlcmF0b3I/OiBfLkxpc3RJdGVyYXRvcjxUTW9kZWwsIGJvb2xlYW4+LCBjb250ZXh0PzogYW55KTogYm9vbGVhbjtcbiDimIUgc29ydEJ5PFRTb3J0PihpdGVyYXRvcj86IF8uTGlzdEl0ZXJhdG9yPFRNb2RlbCwgVFNvcnQ+LCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIHNvcnRCeShpdGVyYXRvcjogc3RyaW5nLCBjb250ZXh0PzogYW55KTogVE1vZGVsW107XG4g4piFIHRhaWwobj86IG51bWJlcik6IFRNb2RlbFtdO1xuIOKYhSB0YWtlKCk6IFRNb2RlbDtcbiDimIUgdGFrZShuOiBudW1iZXIpOiBUTW9kZWxbXTtcbiDimIUgdG9BcnJheSgpOiBUTW9kZWxbXTtcblxu4piFIG1vZGVsIOOBruaJgOWxnuOBqyBjb2xsZWN0aW9uIOOBriBpZCDjgpLmm7jjgY3ovrzjgoDjgYvjgoJcbiAgIOOBneOBruWgtOWQiCBfcHJlcGFyZU1vZGVsLCBfcmVtb3ZlUmVmZXJlbmNlIOOBq+OCguWvvuW/nOOBjOW/heimgVxuXG4tIEV2ZW50OlxuICAgICdAYWRkJzogW1RJdGVtLCBDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvblNldE9wdGlvbnNdO1xuICAgICdAcmVtb3ZlJzogW1RJdGVtLCBDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvblNldE9wdGlvbnNdO1xuICAgICdAdXBkYXRlJzogW0NvbGxlY3Rpb24gPCBUSXRlbSA+LCBDb2xsZWN0aW9uVXBkYXRlT3B0aW9uc107XG4gICAgJ0ByZXNldCc6IFtDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvbkFkZE9wdGlvbnNdO1xuICAgICdAc29ydCc6IFtDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgQ29sbGVjdGlvblNldE9wdGlvbnNdO1xuICAgICdAc3luYyc6IFtDb2xsZWN0aW9uIDwgVEl0ZW0gPiwgUGxhaW5PYmplY3QsIENvbGxlY3Rpb25EYXRhU3luY09wdGlvbnNdO1xuICAgICdAZGVzdHJveSc6IFtUSXRlbSwgQ29sbGVjdGlvbiA8IFRJdGVtID4sIE1vZGVsRGVzdHJveU9wdGlvbnNdO1xuICAgICdAZXJyb3InOiBbQ29sbGVjdGlvbiA8IFRJdGVtID4sIEVycm9yLCBDb2xsZWN0aW9uRGF0YVN5bmNPcHRpb25zXTtcbiAqL1xuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBOzs7OztBQU1BOzs7OztJQVVJO0lBQUE7UUFDSSxnR0FBaUQsQ0FBQTtRQUNqRCxzREFBZ0MsWUFBQSxrQkFBa0IsZ0JBQXVCLHNCQUE2QixDQUFDLEVBQUUsaUJB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
