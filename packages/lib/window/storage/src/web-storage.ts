/* eslint-disable
    @typescript-eslint/no-explicit-any
 ,  @typescript-eslint/require-await
 */

import {
    Keys,
    Types,
    KeyToType,
    verify,
    deepEqual,
    dropUndefined,
} from '@cdp/core-utils';
import { Subscription, EventBroker } from '@cdp/events';
import {
    Cancelable,
    checkCanceled as cc,
} from '@cdp/promise';
import {
    StorageDataTypeList,
    StorageInputDataTypeList,
    IStorageOptions,
    IStorageDataOptions,
    IStorageDataReturnType,
    IStorageEventCallback,
    IStorage,
} from '@cdp/core-storage';
import {
    Serializable,
    serialize,
    deserialize,
} from '@cdp/binary';

/**
 * @en Web storage data type set interface.
 * @ja Web storage に格納可能な型の集合
 */
export type WebStorageDataTypeList = StorageDataTypeList & Serializable;
/** WebStorage I/O options */
export type WebStorageOptions<K extends Keys<WebStorageDataTypeList>> = IStorageDataOptions<WebStorageDataTypeList, K>;
/** WebStorage return value */
export type WebStorageResult<K extends Keys<WebStorageDataTypeList>> = KeyToType<WebStorageDataTypeList, K>;
/** WebStorage data type */
export type WebStorageDataTypes = Types<WebStorageDataTypeList>;
/** MemoryStorage return type */
export type MemoryStorageReturnType<D extends WebStorageDataTypes> = IStorageDataReturnType<StorageDataTypeList, D>;
/** WebStorage input data type */
export type WebStorageInputDataTypes = StorageInputDataTypeList<WebStorageDataTypeList>;
/** WebStorage event callback */
export type WebStorageEventCallback = IStorageEventCallback<WebStorageDataTypeList>;

/** @internal */
interface WebStorageEvent {
    '@': [string | null, WebStorageDataTypes | null, WebStorageDataTypes | null];
}

//__________________________________________________________________________________________________//

/**
 * @en Web storage class. This class implements `IStorage` interface by using `window.localStorage`.
 * @ja ウェブストレージクラス. 本クラスは `window.localStorage` を用いて `IStorage` を実装
 */
export class WebStorage implements IStorage<WebStorageDataTypeList> {

    private readonly _broker = new EventBroker<WebStorageEvent>();
    private readonly _storage: Storage;

    /**
     * constructor
     *
     * @param storage
     *  - `en` Web [[Storage]] instance
     *  - `ja` Web [[Storage]] インスタンス
     */
    constructor(storage: Storage) {
        verify('instanceOf', Storage, storage);
        this._storage = storage;
    }

///////////////////////////////////////////////////////////////////////
// implements: IStorage
    /**
     * @en [[IStorage]] kind signature.
     * @ja [[IStorage]] の種別を表す識別子
     */
    get kind(): string {
        const signature = localStorage === this._storage ? 'local-storage' : 'session-storage';
        return `web:${signature}`;
    }

    /**
     * @en Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     * @ja キーに対応する値を取得. 存在しない場合は null を返却
     *
     * @param key
     *  - `en` access key
     *  - `ja` アクセスキー
     * @param options
     *  - `en` I/O options
     *  - `ja` I/O オプション
     * @returns
     *  - `en` Returns the value which corresponds to a key with type change designated in `dataType`.
     *  - `ja` `dataType` で指定された型変換を行って, キーに対応する値を返却
     */
    getItem<D extends WebStorageDataTypes = WebStorageDataTypes>(
        key: string,
        options?: WebStorageOptions<never>
    ): Promise<MemoryStorageReturnType<D>>;

    /**
     * @en Returns the current value associated with the given key, or null if the given key does not exist in the list associated with the object.
     * @ja キーに対応する値を取得. 存在しない場合は null を返却
     *
     * @param key
     *  - `en` access key
     *  - `ja` アクセスキー
     * @param options
     *  - `en` I/O options
     *  - `ja` I/O オプション
     * @returns
     *  - `en` Returns the value which corresponds to a key with type change designated in `dataType`.
     *  - `ja` `dataType` で指定された型変換を行って, キーに対応する値を返却
     */
    getItem<K extends Keys<WebStorageDataTypeList>>(
        key: string,
        options?: WebStorageOptions<K>
    ): Promise<WebStorageResult<K> | null>;

    async getItem(key: string, options?: WebStorageOptions<any>): Promise<WebStorageDataTypes | null> {
        return dropUndefined(await deserialize(this._storage[key], options));
    }

    /**
     * @en Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     * @ja キーを指定して値を設定. 存在しない場合は新規に作成
     *
     * @param key
     *  - `en` access key
     *  - `ja` アクセスキー
     * @param options
     *  - `en` I/O options
     *  - `ja` I/O オプション
     */
    async setItem<V extends WebStorageInputDataTypes>(key: string, value: V, options?: WebStorageOptions<never>): Promise<void> {
        options = options || {};
        const newVal = dropUndefined(value, true);                                      // `null` or `undefined` → 'null' or 'undefined'
        const oldVal = dropUndefined(await deserialize(this._storage[key], options));   // `undefined` → `null`
        if (!deepEqual(oldVal, newVal)) {
            this._storage.setItem(key, await serialize(newVal, options));
            !options.silent && this._broker.trigger('@', key, newVal, oldVal);
        }
    }

    /**
     * @en Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     * @ja 指定されたキーに対応する値が存在すれば削除
     *
     * @param options
     *  - `en` storage options
     *  - `ja` ストレージオプション
     */
    async removeItem(key: string, options?: IStorageOptions): Promise<void> {
        options = options || {};
        await cc(options.cancel);
        const value = this._storage[key];
        if (undefined !== value) {
            this._storage.removeItem(key);
            !options.silent && this._broker.trigger('@', key, null, await deserialize(value, options));
        }
    }

    /**
     * @en Empties the list associated with the object of all key/value pairs, if there are any.
     * @ja すべてのキーに対応する値を削除
     *
     * @param options
     *  - `en` storage options
     *  - `ja` ストレージオプション
     */
    async clear(options?: IStorageOptions): Promise<void> {
        options = options || {};
        await cc(options.cancel);
        if (0 < this._storage.length) {
            this._storage.clear();
            !options.silent && this._broker.trigger('@', null, null, null);
        }
    }

    /**
     * @en Returns all entry keys.
     * @ja すべてのキー一覧を返却
     *
     * @param options
     *  - `en` cancel options
     *  - `ja` キャンセルオプション
     */
    async keys(options?: Cancelable): Promise<string[]> {
        await cc(options && options.cancel);
        return Object.keys(this._storage);
    }

    /**
     * @en Subscrive event(s).
     * @ja イベント購読設定
     *
     * @param listener
     *  - `en` callback function.
     *  - `ja` たコールバック関数
     */
    on(listener: WebStorageEventCallback): Subscription {
        return this._broker.on('@', listener);
    }

    /**
     * @en Unsubscribe event(s).
     * @ja イベント購読解除
     *
     * @param listener
     *  - `en` callback function.
     *         When not set this parameter, listeners are released.
     *  - `ja` コールバック関数
     *         指定しない場合はすべてを解除
     */
    off(listener?: WebStorageEventCallback): void {
        this._broker.off('@', listener);
    }
}

// default storage
export const webStorage = new WebStorage(localStorage);
