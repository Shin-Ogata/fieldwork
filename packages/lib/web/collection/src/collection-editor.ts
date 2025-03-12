import type { CancelToken } from '@cdp/promise';
import type { ArrayChangeRecord } from '@cdp/observable';
import { RESULT_CODE, makeResult } from '@cdp/result';
import type { ListChanged, ListEditOptions } from './interfaces';
import {
    clearArray,
    appendArray,
    insertArray,
    reorderArray,
    removeArray,
} from './utils';
import type { Collection } from './base';

/**
 * @en Edited collection type definition.
 * @ja 被編集 Collection の型定義
 */
export type CollectionEditee<M extends object> = Collection<M, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** @internal */
function prepare<T extends object>(collection: Collection<T>): T[] | never {
    if (collection.filtered) {
        throw makeResult(RESULT_CODE.ERROR_MVC_EDIT_PERMISSION_DENIED, 'collection is applied after-filter.');
    }
    return collection.models.slice();
}

/** @internal */
async function exec<T extends object>(
    collection: Collection<T>,
    options: ListEditOptions | undefined,
    operation: (targets: T[], token: CancelToken | undefined) => Promise<ArrayChangeRecord<T>[]>,
): Promise<ArrayChangeRecord<T>[]> {
    const targets = prepare<T>(collection);
    const change = await operation(targets, options?.cancel);
    collection.set(targets, options);
    return change;
}

/** @internal */
function min(indices: number[]): number {
    return indices.reduce((lhs, rhs) => Math.min(lhs, rhs));
}

/** @internal */
function makeListChanged<T>(
    type: 'add' | 'remove' | 'reorder',
    changes: ArrayChangeRecord<T>[],
    rangeFrom: number,
    rangeTo: number,
    at?: number,
): ListChanged<T> {
    const changed = !!changes.length;
    return {
        type,
        list: changes,
        range: changed ? { from: rangeFrom, to: rangeTo } : undefined,
        insertedTo: changed ? at : undefined,
    } as ListChanged<T>;
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
export async function clearCollection<T extends object>(
    collection: CollectionEditee<T>,
    options?: ListEditOptions
): Promise<ListChanged<T>> {
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
export async function appendCollection<T extends object>(
    collection: CollectionEditee<T>,
    src: T[],
    options?: ListEditOptions
): Promise<ListChanged<T>> {
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
export async function insertCollection<T extends object>(
    collection: CollectionEditee<T>,
    index: number,
    src: T[],
    options?: ListEditOptions
): Promise<ListChanged<T>> {
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
export async function reorderCollection<T extends object>(
    collection: CollectionEditee<T>,
    index: number,
    orders: number[],
    options?: ListEditOptions
): Promise<ListChanged<T>> {
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
export async function removeCollection<T extends object>(
    collection: CollectionEditee<T>,
    orders: number[],
    options?: ListEditOptions
): Promise<ListChanged<T>> {
    const rangeFrom = min(orders);
    const rangeTo = collection.length - 1;
    const changes = await exec(collection, options, (targets, token) => removeArray(targets, orders, token));
    return makeListChanged('remove', changes, rangeFrom, rangeTo);
}
