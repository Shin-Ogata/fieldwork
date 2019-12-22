import { PlainObject, Keys, Types, KeyToType } from '@cdp/core-utils';
import { Subscription } from '@cdp/events';
import { Cancelable } from '@cdp/promise';
import { StorageDataTypeList, StorageInputDataTypeList, IStorageOptions, IStorageDataOptions, IStorageDataReturnType, IStorageEventCallback, IStorage } from './interfaces';
/** MemoryStorage I/O options */
export declare type MemoryStorageOptions<K extends Keys<StorageDataTypeList>> = IStorageDataOptions<StorageDataTypeList, K>;
/** MemoryStorage return value */
export declare type MemoryStorageResult<K extends Keys<StorageDataTypeList>> = KeyToType<StorageDataTypeList, K>;
/** MemoryStorage data type */
export declare type MemoryStorageDataTypes = Types<StorageDataTypeList>;
/** MemoryStorage return type */
export declare type MemoryStorageReturnType<D extends MemoryStorageDataTypes> = IStorageDataReturnType<StorageDataTypeList, D>;
/** MemoryStorage input data type */
export declare type MemoryStorageInputDataTypes = StorageInputDataTypeList<StorageDataTypeList>;
/** MemoryStorage event callback */
export declare type MemoryStorageEventCallback = IStorageEventCallback<StorageDataTypeList>;
/**
 * @en Memory storage class. This class doesn't support permaneciation data.
 * @ja メモリーストレージクラス. 本クラスはデータの永続化をサポートしない
 */
export declare class MemoryStorage implements IStorage {
    private readonly _broker;
    private _storage;
    /**
     * @en [[IStorage]] kind signature.
     * @ja [[IStorage]] の種別を表す識別子
     */
    get kind(): string;
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
    getItem<D extends MemoryStorageDataTypes = MemoryStorageDataTypes>(key: string, options?: MemoryStorageOptions<never>): Promise<MemoryStorageReturnType<D>>;
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
    getItem<K extends Keys<StorageDataTypeList>>(key: string, options?: MemoryStorageOptions<K>): Promise<MemoryStorageResult<K> | null>;
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
    setItem<V extends MemoryStorageInputDataTypes>(key: string, value: V, options?: MemoryStorageOptions<never>): Promise<void>;
    /**
     * @en Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     * @ja 指定されたキーに対応する値が存在すれば削除
     *
     * @param options
     *  - `en` storage options
     *  - `ja` ストレージオプション
     */
    removeItem(key: string, options?: IStorageOptions): Promise<void>;
    /**
     * @en Empties the list associated with the object of all key/value pairs, if there are any.
     * @ja すべてのキーに対応する値を削除
     *
     * @param options
     *  - `en` storage options
     *  - `ja` ストレージオプション
     */
    clear(options?: IStorageOptions): Promise<void>;
    /**
     * @en Returns all entry keys.
     * @ja すべてのキー一覧を返却
     *
     * @param options
     *  - `en` cancel options
     *  - `ja` キャンセルオプション
     */
    keys(options?: Cancelable): Promise<string[]>;
    /**
     * @en Subscrive event(s).
     * @ja イベント購読設定
     *
     * @param listener
     *  - `en` callback function.
     *  - `ja` コールバック関数
     */
    on(listener: MemoryStorageEventCallback): Subscription;
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
    off(listener?: MemoryStorageEventCallback): void;
    /**
     * @en Return a shallow copy of the storage's attributes for JSON stringification.
     * @ja JSON stringify のためにストレージプロパティのシャローコピー返却
     */
    get context(): PlainObject;
}
export declare const memoryStorage: MemoryStorage;
