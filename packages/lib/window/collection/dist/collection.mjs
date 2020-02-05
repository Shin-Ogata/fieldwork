/*!
 * @cdp/collection 0.9.0
 *   generic collection scheme
 */

import { getLanguage } from '@cdp/i18n';
import { unique } from '@cdp/core-utils';
import { checkCanceled } from '@cdp/promise';
import { ObservableArray } from '@cdp/observable';
import { makeResult, RESULT_CODE } from '@cdp/result';

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
    if (index < 0 || target.length < index || Math.floor(index) !== index) {
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
    if (index < 0 || target.length < index || Math.floor(index) !== index) {
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

export { ArrayCursor, appendArray, clearArray, defaultCollatorProvider, getBooleanComparator, getDateComparator, getGenericComparator, getNumberComparator, getStringComparator, insertArray, removeArray, reorderArray };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5tanMiLCJzb3VyY2VzIjpbInV0aWxzL2NvbXBhcmF0b3IudHMiLCJ1dGlscy9hcnJheS1jdXJzb3IudHMiLCJ1dGlscy9hcnJheS1lZGl0b3IudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZ2V0TGFuZ3VhZ2UgfSBmcm9tICdAY2RwL2kxOG4nO1xuaW1wb3J0IHsgU29ydE9yZGVyLCBTb3J0Q2FsbGJhY2sgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBAZW4gW1tJbnRsLkNvbGxhdG9yXV0gZmFjdG9yeSBmdW5jdGlvbiB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEgW1tJbnRsLkNvbGxhdG9yXV0g44KS6L+U5Y2044GZ44KL6Zai5pWw5Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIENvbGxhdG9yUHJvdmlkZXIgPSAoKSA9PiBJbnRsLkNvbGxhdG9yO1xuXG4vKiogQGludGVybmFsIGRlZmF1bHQgSW50bC5Db2xsYXRvciBwcm92aWRlciAqL1xubGV0IF9jb2xsYXRvcjogQ29sbGF0b3JQcm92aWRlciA9ICgpOiBJbnRsLkNvbGxhdG9yID0+IHtcbiAgICByZXR1cm4gbmV3IEludGwuQ29sbGF0b3IoZ2V0TGFuZ3VhZ2UoKSwgeyBzZW5zaXRpdml0eTogJ2Jhc2UnLCBudW1lcmljOiB0cnVlIH0pO1xufTtcblxuLyoqXG4gKiBAamEg5pei5a6a44GuIEludGwuQ29sbGF0b3Ig44KS6Kit5a6aXG4gKlxuICogQHBhcmFtIG5ld1Byb3ZpZGVyXG4gKiAgLSBgZW5gIG5ldyBbW0NvbGxhdG9yUHJvdmlkZXJdXSBvYmplY3QuIGlmIGB1bmRlZmluZWRgIHBhc3NlZCwgb25seSByZXR1cm5zIHRoZSBjdXJyZW50IG9iamVjdC5cbiAqICAtIGBqYWAg5paw44GX44GEIFtbQ29sbGF0b3JQcm92aWRlcl1dIOOCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi4gYHVuZGVmaW5lZGAg44GM5rih44GV44KM44KL5aC05ZCI44Gv54++5Zyo6Kit5a6a44GV44KM44Gm44GE44KL44Kq44OW44K444Kn44Kv44OI44Gu6L+U5Y2044Gu44G/6KGM44GGXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBvbGQgW1tDb2xsYXRvclByb3ZpZGVyXV0gb2JqZWN0LlxuICogIC0gYGphYCDoqK3lrprjgZXjgozjgabjgYTjgZ8gW1tDb2xsYXRvclByb3ZpZGVyXV0g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0Q29sbGF0b3JQcm92aWRlcihuZXdQcm92aWRlcj86IENvbGxhdG9yUHJvdmlkZXIpOiBDb2xsYXRvclByb3ZpZGVyIHtcbiAgICBpZiAobnVsbCA9PSBuZXdQcm92aWRlcikge1xuICAgICAgICByZXR1cm4gX2NvbGxhdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9sZFByb3ZpZGVyID0gX2NvbGxhdG9yO1xuICAgICAgICBfY29sbGF0b3IgPSBuZXdQcm92aWRlcjtcbiAgICAgICAgcmV0dXJuIG9sZFByb3ZpZGVyO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gR2V0IHN0cmluZyBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOaWh+Wtl+WIl+avlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHByb3BlcnR5IG5hbWVcbiAqICAtIGBqYWAg44OX44Ot44OR44OG44Kj5ZCN44KS5oyH5a6aXG4gKiBAcGFyYW0gb3JkZXJcbiAqICAtIGBlbmAgc29ydCBvcmRlciBjb2RlXG4gKiAgLSBgamFgIOOCveODvOODiOmghuOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RyaW5nQ29tcGFyYXRvcjxULCBLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPihwcm9wOiBLLCBvcmRlcjogU29ydE9yZGVyKTogU29ydENhbGxiYWNrPFQ+IHtcbiAgICByZXR1cm4gKGxoczogVCwgcmhzOiBUKTogbnVtYmVyID0+IHtcbiAgICAgICAgLy8gdW5kZWZpbmVkIOOBryAnJyDjgajlkIznrYnjgavmibHjgYZcbiAgICAgICAgY29uc3QgbGhzUHJvcCA9IChudWxsICE9IGxoc1twcm9wIGFzIHN0cmluZ10pID8gbGhzW3Byb3AgYXMgc3RyaW5nXSA6ICcnO1xuICAgICAgICBjb25zdCByaHNQcm9wID0gKG51bGwgIT0gcmhzW3Byb3AgYXMgc3RyaW5nXSkgPyByaHNbcHJvcCBhcyBzdHJpbmddIDogJyc7XG4gICAgICAgIHJldHVybiBvcmRlciAqIF9jb2xsYXRvcigpLmNvbXBhcmUobGhzUHJvcCwgcmhzUHJvcCk7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGRhdGUgY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDml6XmmYLmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCBwcm9wZXJ0eSBuYW1lXG4gKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICogQHBhcmFtIG9yZGVyXG4gKiAgLSBgZW5gIHNvcnQgb3JkZXIgY29kZVxuICogIC0gYGphYCDjgr3jg7zjg4jpoIbjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERhdGVDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBULCByaHM6IFQpOiBudW1iZXIgPT4ge1xuICAgICAgICBjb25zdCBsaHNEYXRlID0gbGhzW3Byb3AgYXMgc3RyaW5nXTtcbiAgICAgICAgY29uc3QgcmhzRGF0ZSA9IHJoc1twcm9wIGFzIHN0cmluZ107XG4gICAgICAgIGlmIChsaHNEYXRlID09PSByaHNEYXRlKSB7XG4gICAgICAgICAgICAvLyAodW5kZWZpbmVkID09PSB1bmRlZmluZWQpIG9yIOiHquW3seWPgueFp1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBsaHNEYXRlKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gLTEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IHJoc0RhdGUpIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAxICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBsaHNWYWx1ZSA9IE9iamVjdChsaHNEYXRlKS52YWx1ZU9mKCk7XG4gICAgICAgICAgICBjb25zdCByaHNWYWx1ZSA9IE9iamVjdChyaHNEYXRlKS52YWx1ZU9mKCk7XG4gICAgICAgICAgICBpZiAobGhzVmFsdWUgPT09IHJoc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAobGhzVmFsdWUgPCByaHNWYWx1ZSA/IC0xICogb3JkZXIgOiAxICogb3JkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGdlbmVyaWMgY29tcGFyYXRvciBmdW5jdGlvbiBieSBjb21wYXJhdGl2ZSBvcGVyYXRvci5cbiAqIEBqYSDmr5TovIPmvJTnrpflrZDjgpLnlKjjgYTjgZ/msY7nlKjmr5TovIPplqLmlbDjga7lj5blvpdcbiAqXG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCBwcm9wZXJ0eSBuYW1lXG4gKiAgLSBgamFgIOODl+ODreODkeODhuOCo+WQjeOCkuaMh+WumlxuICogQHBhcmFtIG9yZGVyXG4gKiAgLSBgZW5gIHNvcnQgb3JkZXIgY29kZVxuICogIC0gYGphYCDjgr3jg7zjg4jpoIbjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdlbmVyaWNDb21wYXJhdG9yPFQsIEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+KHByb3A6IEssIG9yZGVyOiBTb3J0T3JkZXIpOiBTb3J0Q2FsbGJhY2s8VD4ge1xuICAgIHJldHVybiAobGhzOiBULCByaHM6IFQpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAobGhzW3Byb3AgYXMgc3RyaW5nXSA9PT0gcmhzW3Byb3AgYXMgc3RyaW5nXSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSBpZiAobnVsbCA9PSBsaHNbcHJvcCBhcyBzdHJpbmddKSB7XG4gICAgICAgICAgICAvLyB1bmRlZmluZWQg44Gv5pyA5L2O5YCk5omx44GEICjmmIfpoIbmmYLjgavlhYjpoK3jgbgpXG4gICAgICAgICAgICByZXR1cm4gLTEgKiBvcmRlcjtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IHJoc1twcm9wIGFzIHN0cmluZ10pIHtcbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCDjga/mnIDkvY7lgKTmibHjgYQgKOaYh+mghuaZguOBq+WFiOmgreOBuClcbiAgICAgICAgICAgIHJldHVybiAxICogb3JkZXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKGxoc1twcm9wIGFzIHN0cmluZ10gPCByaHNbcHJvcCBhcyBzdHJpbmddID8gLTEgKiBvcmRlciA6IDEgKiBvcmRlcik7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgYm9vbGVhbiBjb21wYXJhdG9yIGZ1bmN0aW9uLlxuICogQGphIOecn+WBveWApOavlOi8g+eUqOmWouaVsOOCkuWPluW+l1xuICovXG5leHBvcnQgY29uc3QgZ2V0Qm9vbGVhbkNvbXBhcmF0b3IgPSBnZXRHZW5lcmljQ29tcGFyYXRvcjtcblxuLyoqXG4gKiBAZW4gR2V0IG51bWVyaWMgY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqIEBqYSDmlbDlgKTmr5TovIPnlKjplqLmlbDjgpLlj5blvpdcbiAqL1xuZXhwb3J0IGNvbnN0IGdldE51bWJlckNvbXBhcmF0b3IgPSBnZXRHZW5lcmljQ29tcGFyYXRvcjtcbiIsIi8qKlxuICogQGVuIEN1cnNvciBwb3NpdGlvbiBjb25zdGFudC5cbiAqIEBqYSDjgqvjg7zjgr3jg6vkvY3nva7lrprmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3Vyc29yUG9zIHtcbiAgICBPVVRfT0ZfUkFOR0UgICAgPSAtMSxcbiAgICBDVVJSRU5UICAgICAgICAgPSAtMixcbn1cblxuLyoqXG4gKiBAZW4gU2VlayBleHByZXNzaW9uIGZ1bmN0aW9uIHR5cGUuXG4gKiBAamEg44K344O844Kv5byP6Zai5pWw5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIFNlZWtFeHA8VD4gPSAodmFsdWU6IFQsIGluZGV4PzogbnVtYmVyLCBvYmo/OiBUW10pID0+IGJvb2xlYW47XG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBwcm92aWRlcyBjdXJzb3IgaW50ZXJmYWNlIGZvciBBcnJheS4gPGJyPlxuICogICAgIEl0IGlzIGRpZmZlcmVudCBmcm9tIEl0ZXJhdG9yIGludGVyZmFjZSBvZiBlczIwMTUsIGFuZCB0aGF0IHByb3ZpZGVzIGludGVyZmFjZSB3aGljaCBpcyBzaW1pbGFyIHRvIERCIHJlY29yZHNldCdzIG9uZS5cbiAqIEBqYSBBcnJheSDnlKjjgqvjg7zjgr3jg6sgSS9GIOOCkuaPkOS+m+OBmeOCi+OCr+ODqeOCuSA8YnI+XG4gKiAgICAgZXMyMDE1IOOBriBJdGVyYXRvciBJL0Yg44Go44Gv55Ww44Gq44KK44CBREIgcmVjb3Jkc2V0IOOCquODluOCuOOCp+OCr+ODiOODqeOCpOOCr+OBqui1sOafuyBJL0Yg44KS5o+Q5L6b44GZ44KLXG4gKi9cbmV4cG9ydCBjbGFzcyBBcnJheUN1cnNvcjxUID0gYW55PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIC8qKiBAaW50ZXJuYWwg5a++6LGh44Gu6YWN5YiXICAqL1xuICAgIHByaXZhdGUgX2FycmF5OiBUW107XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7lhYjpoK3jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAgKi9cbiAgICBwcml2YXRlIF9ib2Y6IGJvb2xlYW47XG4gICAgLyoqIEBpbnRlcm5hbCDopoHntKDlpJbjga7mnKvlsL7jgpLnpLrjgZfjgabjgYTjgovjgajjgY3jgasgdHJ1ZSAqL1xuICAgIHByaXZhdGUgX2VvZjogYm9vbGVhbjtcbiAgICAvKiogQGludGVybmFsIOePvuWcqOOBriBpbmRleCAqL1xuICAgIHByaXZhdGUgX2luZGV4OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIGFycmF5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAgICAgKiAgLSBgamFgIOi1sOafu+WvvuixoeOBrumFjeWIl+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0aWFsSW5kZXhcbiAgICAgKiAgLSBgZW5gIGluaXRpYWwgaW5kZXguIGRlZmF1bHQ6IDBcbiAgICAgKiAgLSBgamFgIOWIneacn+WMluOBmeOCiyBpbmRleCDjgpLmjIflrpogZGVmYXVsdDogMFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGFycmF5OiBUW10sIGluaXRpYWxJbmRleCA9IDApIHtcbiAgICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgICAgdGhpcy5faW5kZXggPSBpbml0aWFsSW5kZXg7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlc2V0IHRhcmdldCBhcnJheS5cbiAgICAgKiBAamEg5a++6LGh44Gu5YaN6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYXJyYXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCBhcnJheS4gZGVmYXVsdDogZW1wdHkgYXJyYXkuXG4gICAgICogIC0gYGphYCDotbDmn7vlr77osaHjga7phY3liJfjgpLmjIflrpouICAgZGVmYXVsdDog56m66YWN5YiXXG4gICAgICogQHBhcmFtIGluaXRpYWxJbmRleFxuICAgICAqICAtIGBlbmAgaW5pdGlhbCBpbmRleC4gZGVmYXVsdDogQ1VSU09SLk9VVF9PRl9SQU5HRVxuICAgICAqICAtIGBqYWAg5Yid5pyf5YyW44GZ44KLIGluZGV4IOOCkuaMh+WumiBkZWZhdWx0OiBDVVJTT1IuT1VUX09GX1JBTkdFXG4gICAgICovXG4gICAgcHVibGljIHJlc2V0KGFycmF5OiBUW10gPSBbXSwgaW5pdGlhbEluZGV4OiBudW1iZXIgPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9hcnJheSA9IGFycmF5O1xuICAgICAgICB0aGlzLl9pbmRleCA9IGluaXRpYWxJbmRleDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fYm9mID0gdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IEN1cnNvclBvcy5PVVRfT0ZfUkFOR0U7XG4gICAgICAgICAgICB0aGlzLl9ib2YgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gYWNjZXNzb3JzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBjdXJyZW50IGVsZW1lbnQuXG4gICAgICogQGphIOePvuWcqOOBruimgee0oOOBq+OCouOCr+OCu+OCuVxuICAgICAqL1xuICAgIGdldCBjdXJyZW50KCk6IFQgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXJyYXlbdGhpcy5faW5kZXhdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo5oyH44GX56S644GX44Gm44GE44KLIGluZGV4IOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB0YXJnZXQgYXJyYXkgbGVuZ3RoLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjga7opoHntKDmlbDjgpLlj5blvpdcbiAgICAgKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hcnJheS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEp1ZGdlIEJPRiBvciBub3QuXG4gICAgICogQGphIOimgee0oOWkluOBruWFiOmgreOBi+WIpOWumlxuICAgICAqL1xuICAgIGdldCBpc0JPRigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JvZjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSnVkZ2UgRU9GIG9yIG5vdC5cbiAgICAgKiBAamEg6KaB57Sg5aSW44Gu5pyr5bC+44GL5Yik5a6aXG4gICAgICovXG4gICAgZ2V0IGlzRU9GKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW9mO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcmF3IGFycmF5IGluc3RhbmNlLlxuICAgICAqIEBqYSDotbDmn7vlr77osaHjgavjgqLjgq/jgrvjgrlcbiAgICAgKi9cbiAgICBnZXQgYXJyYXkoKTogVFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FycmF5O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGN1cnNvciBvcGVyYXRpb246XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBmaXJzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDlhYjpoK3opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUZpcnN0KCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9ib2YgPSB0aGlzLl9lb2YgPSBmYWxzZTtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIE1vdmUgdG8gbGFzdCBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDmnKvlsL7opoHntKDjgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZUxhc3QoKTogQXJyYXlDdXJzb3I8VD4ge1xuICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5Lmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMuX2JvZiA9IHRoaXMuX2VvZiA9IGZhbHNlO1xuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBuZXh0IGVsZW1lbnQgcG9zaXRpb24uXG4gICAgICogQGphIOOCq+ODvOOCveODq+OCkuasoeOBuOenu+WLlVxuICAgICAqL1xuICAgIHB1YmxpYyBtb3ZlTmV4dCgpOiBBcnJheUN1cnNvcjxUPiB7XG4gICAgICAgIGlmICh0aGlzLl9ib2YpIHtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudmFsaWQoKSkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBDdXJzb3JQb3MuT1VUX09GX1JBTkdFO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTW92ZSB0byBwcmV2aW91cyBlbGVtZW50IHBvc2l0aW9uLlxuICAgICAqIEBqYSDjgqvjg7zjgr3jg6vjgpLliY3jgbjnp7vli5VcbiAgICAgKi9cbiAgICBwdWJsaWMgbW92ZVByZXZpb3VzKCk6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKHRoaXMuX2VvZikge1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4LS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNlZWsgYnkgcGFzc2VkIGNyaXRlcmlhLiA8YnI+XG4gICAgICogICAgIElmIHRoZSBvcGVyYXRpb24gZmFpbGVkLCB0aGUgY3Vyc29yIHBvc2l0aW9uIHNldCB0byBFT0YuXG4gICAgICogQGphIOaMh+WumuadoeS7tuOBp+OCt+ODvOOCryA8YnI+XG4gICAgICogICAgIOOCt+ODvOOCr+OBq+WkseaVl+OBl+OBn+WgtOWQiOOBryBFT0Yg54q25oWL44Gr44Gq44KLXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY3JpdGVyaWFcbiAgICAgKiAgLSBgZW5gIGluZGV4IG9yIHNlZWsgZXhwcmVzc2lvblxuICAgICAqICAtIGBqYWAgaW5kZXggLyDmnaHku7blvI/jgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc2Vlayhjcml0ZXJpYTogbnVtYmVyIHwgU2Vla0V4cDxUPik6IEFycmF5Q3Vyc29yPFQ+IHtcbiAgICAgICAgaWYgKCdudW1iZXInID09PSB0eXBlb2YgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gY3JpdGVyaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IHRoaXMuX2FycmF5LmZpbmRJbmRleChjcml0ZXJpYSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gQ3Vyc29yUG9zLk9VVF9PRl9SQU5HRTtcbiAgICAgICAgICAgIHRoaXMuX2JvZiA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZW9mID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiDjgqvjg7zjgr3jg6vjgYzmnInlirnjgarnr4Tlm7LjgpLnpLrjgZfjgabjgYTjgovjgYvliKTlrppcbiAgICAgKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqXG4gICAgICogQHJldHVybnMgdHJ1ZTog5pyJ5Yq5IC8gZmFsc2U6IOeEoeWKuVxuICAgICAqL1xuICAgIHByaXZhdGUgdmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAoMCA8PSB0aGlzLl9pbmRleCAmJiB0aGlzLl9pbmRleCA8IHRoaXMuX2FycmF5Lmxlbmd0aCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5pcXVlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsVG9rZW4sXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IE9ic2VydmFibGVBcnJheSwgQXJyYXlDaGFuZ2VSZWNvcmQgfSBmcm9tICdAY2RwL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5cbi8qKiBAaW50ZXJuYWwgd2FpdCBmb3IgY2hhbmdlIGRldGVjdGlvbiAqL1xuZnVuY3Rpb24gbWFrZVByb21pc2U8VD4oZWRpdG9yOiBPYnNlcnZhYmxlQXJyYXk8VD4sIHJlbWFwPzogVFtdKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IChyZWNvcmRzOiBBcnJheUNoYW5nZVJlY29yZDxUPltdKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBlZGl0b3Iub2ZmKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGlmIChyZW1hcCkge1xuICAgICAgICAgICAgICAgIHJlbWFwLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgcmVtYXAucHVzaCguLi5lZGl0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShyZWNvcmRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWRpdG9yLm9uKGNhbGxiYWNrKTtcbiAgICB9KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFtbT2JzZXJ2YWJsZUFycmF5XV0gaWYgbmVlZGVkLiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0RWRpdENvbnRleHQ8VD4oXG4gICAgdGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sXG4gICAgdG9rZW4/OiBDYW5jZWxUb2tlblxuKTogUHJvbWlzZTx7IGVkaXRvcjogT2JzZXJ2YWJsZUFycmF5PFQ+OyBwcm9taXNlOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+OyB9PiB8IG5ldmVyIHtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgT2JzZXJ2YWJsZUFycmF5KSB7XG4gICAgICAgIGF3YWl0IGNjKHRva2VuKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVkaXRvcjogdGFyZ2V0LFxuICAgICAgICAgICAgcHJvbWlzZTogbWFrZVByb21pc2UodGFyZ2V0KSxcbiAgICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCBlZGl0b3IgPSBPYnNlcnZhYmxlQXJyYXkuZnJvbSh0YXJnZXQpO1xuICAgICAgICBhd2FpdCBjYyh0b2tlbik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBlZGl0b3IsXG4gICAgICAgICAgICBwcm9taXNlOiBtYWtlUHJvbWlzZShlZGl0b3IsIHRhcmdldCksXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCAndGFyZ2V0IGlzIG5vdCBBcnJheSBvciBPYnNlcnZhYmxlQXJyYXkuJyk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDbGVhciBhbGwgYXJyYXkgZWxlbWVudHMuXG4gKiBAamEg6YWN5YiX44Gu5YWo5YmK6ZmkXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCB0b2tlbj86IENhbmNlbFRva2VuKTogUHJvbWlzZTxBcnJheUNoYW5nZVJlY29yZDxUPltdPiB7XG4gICAgaWYgKHRhcmdldC5sZW5ndGggPD0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgeyBlZGl0b3IsIHByb21pc2UgfSA9IGF3YWl0IGdldEVkaXRDb250ZXh0KHRhcmdldCwgdG9rZW4pO1xuXG4gICAgZWRpdG9yLnNwbGljZSgwLCB0YXJnZXQubGVuZ3RoKTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG4vKipcbiAqIEBlbiBBcHBlbmQgc291cmNlIGVsZW1lbnRzIHRvIHRoZSBlbmQgb2YgYXJyYXkuXG4gKiBAamEg6YWN5YiX44Gu5pyr5bC+44Gr6L+95YqgXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNvdXJjZSBlbGVtZW50c1xuICogIC0gYGphYCDov73liqDlhYPopoHntKBcbiAqIEBwYXJhbSB0b2tlblxuICogIC0gYGVuYCBbW0NhbmNlbFRva2VuXV0gcmVmZXJlbmNlLiAoZW5hYmxlIGB1bmRlZmluZWRgKVxuICogIC0gYGphYCBbW0NhbmNlbFRva2VuXV0g44KS5oyH5a6aICh1bmRlZmluZWQg5Y+vKVxuICogQHJldHVybnNcbiAqICAtIGBlbmAgQ2hhbmdlZCBpbmZvcm1hdGlvblxuICogIC0gYGphYCDlpInmm7Tmg4XloLFcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZEFycmF5PFQ+KHRhcmdldDogT2JzZXJ2YWJsZUFycmF5PFQ+IHwgVFtdLCBzcmM6IFRbXSwgdG9rZW4/OiBDYW5jZWxUb2tlbik6IFByb21pc2U8QXJyYXlDaGFuZ2VSZWNvcmQ8VD5bXT4ge1xuICAgIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5wdXNoKC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gSW5zZXJ0IHNvdXJjZSBlbGVtZW50cyB0byBzcGVjaWZpZWQgaW5kZXggb2YgYXJyYXkuXG4gKiBAamEg5oyH5a6a44GX44Gf5L2N572u44Gr5oy/5YWlXG4gKlxuICogQHBhcmFtIHRhcmdldFxuICogIC0gYGVuYCB0YXJnZXQgYXJyYXlcbiAqICAtIGBqYWAg5a++6LGh6YWN5YiXXG4gKiBAcGFyYW0gaW5kZXhcbiAqICAtIGBqYWAgdGFyZ2V0IGFycmF5IHBvc2l0aW9uIGluZGV4XG4gKiAgLSBgamFgIOi/veWKoOWFiOOBruOCpOODs+ODh+ODg+OCr+OCuVxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzb3VyY2UgZWxlbWVudHNcbiAqICAtIGBqYWAg6L+95Yqg5YWD6KaB57SgXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnNlcnRBcnJheTxUPih0YXJnZXQ6IE9ic2VydmFibGVBcnJheTxUPiB8IFRbXSwgaW5kZXg6IG51bWJlciwgc3JjOiBUW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCBNYXRoLmZsb29yKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgaW5zZXJ0QXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmIChudWxsID09IHNyYyB8fCBzcmMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIGVkaXRvci5zcGxpY2UoaW5kZXgsIDAsIC4uLnNyYyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVvcmRlciBhcnJheSBlbGVtZW50cyBwb3NpdGlvbi5cbiAqIEBqYSDpoIXnm67jga7kvY3nva7jgpLlpInmm7RcbiAqXG4gKiBAcGFyYW0gdGFyZ2V0XG4gKiAgLSBgZW5gIHRhcmdldCBhcnJheVxuICogIC0gYGphYCDlr77osaHphY3liJdcbiAqIEBwYXJhbSBpbmRleFxuICogIC0gYGphYCB0YXJnZXQgYXJyYXkgcG9zaXRpb24gaW5kZXhcbiAqICAtIGBqYWAg6L+95Yqg5YWI44Gu44Kk44Oz44OH44OD44Kv44K5XG4gKiBAcGFyYW0gb3JkZXJzXG4gKiAgLSBgZW5gIGVkaXQgb3JkZXIgaW5kZXggYXJyYXlcbiAqICAtIGBqYWAg44Kk44Oz44OH44OD44Kv44K56YWN5YiXXG4gKiBAcGFyYW0gdG9rZW5cbiAqICAtIGBlbmAgW1tDYW5jZWxUb2tlbl1dIHJlZmVyZW5jZS4gKGVuYWJsZSBgdW5kZWZpbmVkYClcbiAqICAtIGBqYWAgW1tDYW5jZWxUb2tlbl1dIOOCkuaMh+WumiAodW5kZWZpbmVkIOWPrylcbiAqIEByZXR1cm5zXG4gKiAgLSBgZW5gIENoYW5nZWQgaW5mb3JtYXRpb25cbiAqICAtIGBqYWAg5aSJ5pu05oOF5aCxXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW9yZGVyQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIGluZGV4OiBudW1iZXIsIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICAvLyDmnIDlvozjga7opoHntKDjgavov73liqDjgZnjgovjgZ/jgoEgaW5kZXggPT0gdGFyZ2V0Lmxlbmd0aCDjgpLoqLHlrrlcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRhcmdldC5sZW5ndGggPCBpbmRleCB8fCBNYXRoLmZsb29yKGluZGV4KSAhPT0gaW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5OT1RfU1VQUE9SVEVELCBgaW5zZXJ0QXJyYXkoKSwgaW5kZXggaXMgaW52YWxpZC4gaW5kZXg6ICR7aW5kZXh9YCk7XG4gICAgfSBlbHNlIGlmIChudWxsID09IG9yZGVycyB8fCBvcmRlcnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZWRpdG9yLCBwcm9taXNlIH0gPSBhd2FpdCBnZXRFZGl0Q29udGV4dCh0YXJnZXQsIHRva2VuKTtcblxuICAgIC8vIOS9nOalremFjeWIl+OBp+e3qOmbhlxuICAgIGxldCB3b3JrOiAoVCB8IG51bGwpW10gPSBBcnJheS5mcm9tKGVkaXRvcik7XG4gICAge1xuICAgICAgICBjb25zdCByZW9yZGVyczogVFtdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgb3JkZXIgb2YgdW5pcXVlKG9yZGVycykpIHtcbiAgICAgICAgICAgIHJlb3JkZXJzLnB1c2goZWRpdG9yW29yZGVyXSk7XG4gICAgICAgICAgICB3b3JrW29yZGVyXSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB3b3JrLnNwbGljZShpbmRleCwgMCwgLi4ucmVvcmRlcnMpO1xuICAgICAgICB3b3JrID0gd29yay5maWx0ZXIoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbCAhPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g5YCk44KS5pu444GN5oi744GXXG4gICAgZm9yIChjb25zdCBpZHggb2Ygd29yay5rZXlzKCkpIHtcbiAgICAgICAgZWRpdG9yW2lkeF0gPSB3b3JrW2lkeF0gYXMgVDtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAZW4gUmVtb3ZlIGFycmF5IGVsZW1lbnRzLlxuICogQGphIOmgheebruOBruWJiumZpFxuICpcbiAqIEBwYXJhbSB0YXJnZXRcbiAqICAtIGBlbmAgdGFyZ2V0IGFycmF5XG4gKiAgLSBgamFgIOWvvuixoemFjeWIl1xuICogQHBhcmFtIG9yZGVyc1xuICogIC0gYGVuYCByZW1vdmVkIG9yZGVyIGluZGV4IGFycmF5XG4gKiAgLSBgamFgIOOCpOODs+ODh+ODg+OCr+OCuemFjeWIl1xuICogQHBhcmFtIHRva2VuXG4gKiAgLSBgZW5gIFtbQ2FuY2VsVG9rZW5dXSByZWZlcmVuY2UuIChlbmFibGUgYHVuZGVmaW5lZGApXG4gKiAgLSBgamFgIFtbQ2FuY2VsVG9rZW5dXSDjgpLmjIflrpogKHVuZGVmaW5lZCDlj68pXG4gKiBAcmV0dXJuc1xuICogIC0gYGVuYCBDaGFuZ2VkIGluZm9ybWF0aW9uXG4gKiAgLSBgamFgIOWkieabtOaDheWgsVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQXJyYXk8VD4odGFyZ2V0OiBPYnNlcnZhYmxlQXJyYXk8VD4gfCBUW10sIG9yZGVyczogbnVtYmVyW10sIHRva2VuPzogQ2FuY2VsVG9rZW4pOiBQcm9taXNlPEFycmF5Q2hhbmdlUmVjb3JkPFQ+W10+IHtcbiAgICBpZiAobnVsbCA9PSBvcmRlcnMgfHwgb3JkZXJzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVkaXRvciwgcHJvbWlzZSB9ID0gYXdhaXQgZ2V0RWRpdENvbnRleHQodGFyZ2V0LCB0b2tlbik7XG5cbiAgICAvLyDpmY3poIbjgr3jg7zjg4hcbiAgICBvcmRlcnMuc29ydCgobGhzLCByaHMpID0+IHtcbiAgICAgICAgcmV0dXJuIChsaHMgPCByaHMgPyAxIDogLTEpO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBvcmRlciBvZiB1bmlxdWUob3JkZXJzKSkge1xuICAgICAgICBlZGl0b3Iuc3BsaWNlKG9yZGVyLCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cbiJdLCJuYW1lcyI6WyJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFTQTtBQUNBLElBQUksU0FBUyxHQUFxQjtJQUM5QixPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUks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
