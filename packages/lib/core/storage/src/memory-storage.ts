import {
    Keys,
    Types,
    KeyToType,
    assignValue,
    deepEqual,
    isEmptyObject,
    fromTypedData,
    dropUndefined,
    restoreNil,
} from '@cdp/core-utils';
import { Subscription, EventBroker } from '@cdp/events';
import {
    Cancelable,
    checkCanceled as cc,
} from '@cdp/promise';
import {
    StorageData,
    StorageDataTypeList,
    StorageInputDataTypeList,
    IStorageOptions,
    IStorageDataOptions,
    IStorageDataReturnType,
    IStorageEventCallback,
    IStorage,
} from './interfaces';

/** MemoryStorage I/O options */
export type MemoryStorageOptions<K extends Keys<StorageDataTypeList> = Keys<StorageDataTypeList>> = IStorageDataOptions<StorageDataTypeList, K>;
/** MemoryStorage return value */
export type MemoryStorageResult<K extends Keys<StorageDataTypeList>> = KeyToType<StorageDataTypeList, K>;
/** MemoryStorage data type */
export type MemoryStorageDataTypes = Types<StorageDataTypeList>;
/** MemoryStorage return type */
export type MemoryStorageReturnType<D extends MemoryStorageDataTypes> = IStorageDataReturnType<StorageDataTypeList, D>;
/** MemoryStorage input data type */
export type MemoryStorageInputDataTypes = StorageInputDataTypeList<StorageDataTypeList>;
/** MemoryStorage event callback */
export type MemoryStorageEventCallback = IStorageEventCallback<StorageDataTypeList>;

/** @internal */
interface MemoryStorageEvent {
    '@': [string | null, MemoryStorageDataTypes | null, MemoryStorageDataTypes | null];
}

//__________________________________________________________________________________________________//

/**
 * @en Memory storage class. This class doesn't support permaneciation data.
 * @ja メモリーストレージクラス. 本クラスはデータの永続化をサポートしない
 */
export class MemoryStorage implements IStorage {

    /** @internal */
    private readonly _broker = new EventBroker<MemoryStorageEvent>();
    /** @internal */
    private _storage: StorageData = {};

///////////////////////////////////////////////////////////////////////
// implements: IStorage

    /**
     * @en [[IStorage]] kind signature.
     * @ja [[IStorage]] の種別を表す識別子
     */
    get kind(): string {
        return 'memory';
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
    getItem<D extends MemoryStorageDataTypes = MemoryStorageDataTypes>(
        key: string,
        options?: MemoryStorageOptions<never>
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
    getItem<K extends Keys<StorageDataTypeList>>(
        key: string,
        options?: MemoryStorageOptions<K>
    ): Promise<MemoryStorageResult<K> | null>;

    async getItem(key: string, options?: MemoryStorageOptions): Promise<MemoryStorageDataTypes | null> {
        options = options || {};
        await cc(options.cancel);

        // `undefined` → `null`
        const value = dropUndefined(this._storage[key]);
        switch (options.dataType) {
            case 'string':
                return fromTypedData(value) as string;
            case 'number':
                return Number(restoreNil(value));
            case 'boolean':
                return Boolean(restoreNil(value));
            case 'object':
                return Object(restoreNil(value));
            default:
                return restoreNil(value) as null;
        }
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
    async setItem<V extends MemoryStorageInputDataTypes>(key: string, value: V, options?: MemoryStorageOptions<never>): Promise<void> {
        options = options || {};
        await cc(options.cancel);
        const newVal = dropUndefined(value, true);         // `null` or `undefined` → 'null' or 'undefined'
        const oldVal = dropUndefined(this._storage[key]);  // `undefined` → `null`
        if (!deepEqual(oldVal, newVal)) {
            assignValue(this._storage, key, newVal);
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
        const oldVal = this._storage[key];
        if (undefined !== oldVal) {
            delete this._storage[key];
            !options.silent && this._broker.trigger('@', key, null, oldVal);
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
        if (!isEmptyObject(this._storage)) {
            this._storage = {};
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
     *  - `ja` コールバック関数
     */
    on(listener: MemoryStorageEventCallback): Subscription {
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
    off(listener?: MemoryStorageEventCallback): void {
        this._broker.off('@', listener);
    }

///////////////////////////////////////////////////////////////////////
// operations:

    /**
     * @en Return a storage-store object.
     * @ja ストレージストアオブジェクトを返却
     */
    get context(): StorageData {
        return this._storage;
    }
}

// default storage
export const memoryStorage = new MemoryStorage();
