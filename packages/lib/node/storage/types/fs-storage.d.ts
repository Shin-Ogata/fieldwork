import { Keys } from '@cdp/core-utils';
import { Subscription } from '@cdp/events';
import { Cancelable } from '@cdp/promise';
import { IStorage, IStorageOptions, StorageDataTypeList, MemoryStorageOptions, MemoryStorageResult, MemoryStorageDataTypes, MemoryStorageReturnType, MemoryStorageInputDataTypes, MemoryStorageEventCallback } from '@cdp/core-storage';
/** FsStorage I/O options */
export declare type FsStorageOptions<K extends Keys<StorageDataTypeList> = Keys<StorageDataTypeList>> = MemoryStorageOptions<K>;
/** FsStorage return value */
export declare type FsStorageResult<K extends Keys<StorageDataTypeList>> = MemoryStorageResult<K>;
/** FsStorage data type */
export declare type FsStorageDataTypes = MemoryStorageDataTypes;
/** FsStorage return type */
export declare type FsStorageReturnType<D extends FsStorageDataTypes> = MemoryStorageReturnType<D>;
/** FsStorage input data type */
export declare type FsStorageInputDataTypes = MemoryStorageInputDataTypes;
/** FsStorage event callback */
export declare type FsStorageEventCallback = MemoryStorageEventCallback;
/**
 * @en File System (node fs) storage class.
 * @ja ファイルシステムストレージクラス
 */
export declare class FsStorage implements IStorage {
    private readonly _location;
    private readonly _storage;
    /**
     * constructor
     *
     * @param location
     *  - `en` storage file path.
     *  - `ja` ストレージファイルパスを指定
     */
    constructor(location: string);
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
    getItem<D extends FsStorageDataTypes = FsStorageDataTypes>(key: string, options?: FsStorageOptions<never>): Promise<FsStorageReturnType<D>>;
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
    getItem<K extends Keys<StorageDataTypeList>>(key: string, options?: FsStorageOptions<K>): Promise<FsStorageResult<K> | null>;
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
    setItem<V extends FsStorageInputDataTypes>(key: string, value: V, options?: FsStorageOptions<never>): Promise<void>;
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
    on(listener: FsStorageEventCallback): Subscription;
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
    off(listener?: FsStorageEventCallback): void;
    /**
     * @en Remove storage file.
     * @ja 保存ファイルの完全削除
     */
    destroy(): void;
}
