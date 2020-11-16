import { unique } from '@cdp/core-utils';
import {
    CancelToken,
    checkCanceled as cc,
} from '@cdp/promise';
import { ObservableArray, ArrayChangeRecord } from '@cdp/observable';
import { RESULT_CODE, makeResult } from '@cdp/result';

/** @internal */
const trunc = Math.trunc.bind(Math);

/** @internal wait for change detection */
function makePromise<T>(editor: ObservableArray<T>, remap?: T[]): Promise<ArrayChangeRecord<T>[]> {
    return new Promise(resolve => {
        const callback = (records: ArrayChangeRecord<T>[]): void => {
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
async function getEditContext<T>(
    target: ObservableArray<T> | T[],
    token?: CancelToken
): Promise<{ editor: ObservableArray<T>; promise: Promise<ArrayChangeRecord<T>[]>; }> | never {
    if (target instanceof ObservableArray) {
        await cc(token);
        return {
            editor: target,
            promise: makePromise(target),
        };
    } else if (Array.isArray(target)) {
        const editor = ObservableArray.from(target);
        await cc(token);
        return {
            editor,
            promise: makePromise(editor, target),
        };
    } else {
        throw makeResult(RESULT_CODE.NOT_SUPPORTED, 'target is not Array or ObservableArray.');
    }
}

/** @internal valid orders index */
function validOrders(length: number, orders: number[]): boolean | never {
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
export async function clearArray<T>(target: ObservableArray<T> | T[], token?: CancelToken): Promise<ArrayChangeRecord<T>[]> {
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
export async function appendArray<T>(target: ObservableArray<T> | T[], src: T[], token?: CancelToken): Promise<ArrayChangeRecord<T>[]> {
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
export async function insertArray<T>(target: ObservableArray<T> | T[], index: number, src: T[], token?: CancelToken): Promise<ArrayChangeRecord<T>[]> {
    // 最後の要素に追加するため index == target.length を許容
    if (index < 0 || target.length < index || trunc(index) !== index) {
        throw makeResult(RESULT_CODE.NOT_SUPPORTED, `insertArray(), index is invalid. index: ${index}`);
    } else if (null == src || src.length <= 0) {
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
export async function reorderArray<T>(target: ObservableArray<T> | T[], index: number, orders: number[], token?: CancelToken): Promise<ArrayChangeRecord<T>[]> {
    // 最後の要素に追加するため index == target.length を許容
    if (index < 0 || target.length < index || trunc(index) !== index) {
        throw makeResult(RESULT_CODE.NOT_SUPPORTED, `reorderArray(), index is invalid. index: ${index}`);
    } else if (!validOrders(target.length, orders)) {
        return [];
    }

    const { editor, promise } = await getEditContext(target, token);

    // 作業配列で編集
    let work: (T | null)[] = Array.from(editor);
    {
        const reorders: T[] = [];
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
        editor[idx] = work[idx] as T;
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
export async function removeArray<T>(target: ObservableArray<T> | T[], orders: number[], token?: CancelToken): Promise<ArrayChangeRecord<T>[]> {
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
