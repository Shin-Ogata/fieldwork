import { type Keys, type Types, type KeyToType } from '@cdp/core-utils';
import { type Subscription } from '@cdp/events';
import { type Cancelable } from '@cdp/promise';
import type { StorageDataTypeList, StorageInputDataTypeList, IStorageOptions, IStorageDataOptions, IStorageDataReturnType, IStorageEventCallback, IStorage } from '@cdp/core-storage';
import { type Serializable } from '@cdp/binary';
/**
 * @en Web storage data type set interface.
 * @ja Web storage に格納可能な型の集合
 */
export type WebStorageDataTypeList = StorageDataTypeList & Serializable;
/** WebStorage I/O options */
export type WebStorageOptions<K extends Keys<WebStorageDataTypeList> = Keys<WebStorageDataTypeList>> = IStorageDataOptions<WebStorageDataTypeList, K>;
/** WebStorage return value */
export type WebStorageResult<K extends Keys<WebStorageDataTypeList>> = KeyToType<WebStorageDataTypeList, K>;
/** WebStorage data type */
export type WebStorageDataTypes = Types<WebStorageDataTypeList>;
/** MemoryStorage return type */
export type WebStorageReturnType<D extends WebStorageDataTypes> = IStorageDataReturnType<StorageDataTypeList, D>;
/** WebStorage input data type */
export type WebStorageInputDataTypes = StorageInputDataTypeList<WebStorageDataTypeList>;
/** WebStorage event callback */
export type WebStorageEventCallback = IStorageEventCallback<WebStorageDataTypeList>;
/**
 * @en Web storage class. This class implements `IStorage` interface by using `window.localStorage`.
 * @ja ウェブストレージクラス. 本クラスは `window.localStorage` を用いて `IStorage` を実装
 */
export declare class WebStorage implements IStorage<WebStorageDataTypeList> {
    /**
     * constructor
     *
     * @param storage
     *  - `en` Web {@link Storage} instance
     *  - `ja` Web {@link Storage} インスタンス
     */
    constructor(storage: Storage);
    /**
     * @en {@link IStorage} kind signature.
     * @ja {@link IStorage} の種別を表す識別子
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
    getItem<D extends WebStorageDataTypes = WebStorageDataTypes>(key: string, options?: WebStorageOptions<never>): Promise<WebStorageReturnType<D>>;
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
    getItem<K extends Keys<WebStorageDataTypeList>>(key: string, options?: WebStorageOptions<K>): Promise<WebStorageResult<K> | null>;
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
    setItem<V extends WebStorageInputDataTypes>(key: string, value: V, options?: WebStorageOptions<never>): Promise<void>;
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
     *  - `ja` たコールバック関数
     */
    on(listener: WebStorageEventCallback): Subscription;
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
    off(listener?: WebStorageEventCallback): void;
}
export declare const webStorage: WebStorage;
