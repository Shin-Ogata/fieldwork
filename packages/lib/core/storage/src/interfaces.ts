import {
    Keys,
    Types,
    KeyToType,
    TypeToKey,
} from '@cdp/core-utils';
import { Subscription, Silenceable } from '@cdp/events';
import { Cancelable } from '@cdp/promise';

/**
 * @en Storage data type set interface.
 * @ja Storage に格納可能な型の集合
 */
export interface StorageDataTypeList {
    string: string;
    number: number;
    boolean: boolean;
    object: object;
}

/**
 * @en The types by which designation is possible in [[setItem]]().
 * @ja [[setItem]]() に指定可能な型
 */
export type StorageInputDataTypeList<T> = Types<T> | null | undefined;

/**
 * @en [[IStorage]] common option interface.
 * @ja [[IStorage]] 操作に使用する共通のオプションインターフェイス
 */
export type IStorageOptions = Silenceable & Cancelable;

/**
 * @en [[IStorage]] common format option interface.
 * @ja [[IStorage]] フォーマットに関するオプションインターフェイス
 */
export interface IStorageFormatOptions {
    /** JSON space number */
    jsonSpace?: number;
}

/**
 * @en [[IStorage]] data I/O operation option interface.
 * @ja [[IStorage]] データ I/O 操作に使用するオプションインターフェイス
 */
export interface IStorageDataOptions<T extends StorageDataTypeList, K extends Keys<T>> extends IStorageOptions, IStorageFormatOptions {
    /**
     * @en set convert I/O data type.
     * @ja I/O 時に変換するデータ型を指定
     */
    dataType?: K;
}

/**
 * @en [[IStorage]]`#getItem<cast>()` return types.
 * @ja [[IStorage]]`#getItem<cast>()` の戻り値
 */
export type IStorageDataReturnType<T extends StorageDataTypeList, D extends Types<T>> = TypeToKey<T, D> extends never ? never : D | null;

/**
 * @en [[IStorage]] callback function definition.
 * @ja [[IStorage]] コールバック関数
 */
export type IStorageEventCallback<T extends StorageDataTypeList> = (key: string | null, newValue: Types<T> | null, oldValue: Types<T> | null) => void;

/**
 * @en Async Storage interface. This interface provides the similar to Web Storage API but all methods are promisified.
 * @ja 非同期ストレージインターフェイス. Promise 化した Web Storage API の類似メソッドを提供
 */
export interface IStorage<T extends StorageDataTypeList = StorageDataTypeList> {
    /**
     * @en [[IStorage]] kind signature.
     * @ja [[IStorage]] の種別を表す識別子
     */
    readonly kind: string;

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
    getItem<D extends Types<T> = Types<T>>(key: string, options?: IStorageDataOptions<T, never>): Promise<IStorageDataReturnType<T, D>>;

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
    getItem<K extends Keys<T>>(key: string, options?: IStorageDataOptions<T, K>): Promise<KeyToType<T, K> | null>;

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
    setItem<V extends StorageInputDataTypeList<T>, K extends Keys<T> = 'string'>(key: string, value: V, options?: IStorageDataOptions<T, K>): Promise<void>;

    /**
     * @en Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     * @ja 指定されたキーに対応する値が存在すれば削除
     *
     * @param options
     *  - `en` cancel options
     *  - `ja` キャンセルオプション
     */
    removeItem(key: string, options?: IStorageOptions): Promise<void>;

    /**
     * @en Empties the list associated with the object of all key/value pairs, if there are any.
     * @ja すべてのキーに対応する値を削除
     *
     * @param options
     *  - `en` cancel options
     *  - `ja` キャンセルオプション
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
    on(listener: IStorageEventCallback<T>): Subscription;

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
    off(listener?: IStorageEventCallback<T>): void;
}

//__________________________________________________________________________________________________//

/**
 * @en Registry schema common base interface definition.
 * @ja レジストリスキーマの共通ベースインターフェイス
 */
export interface RegistrySchemaBase {
    /**
     * @en Registry wildcard property.
     * @ja レジストリワイルドカードプロパティ
     */
    '*': void;
}

/**
 * @en Registry event definition
 * @ja レジストリイベント
 */
export interface RegistryEvent<T extends {} = any, K extends keyof T = keyof T> { // eslint-disable-line @typescript-eslint/no-explicit-any
    /**
     * @en Change event. (key, newValue, oldValue)
     * @ja 変更通知 (key, newValue, oldValue)
     */
    'change': [K | null, T[K] | null | undefined, T[K] | null | undefined];

    /**
     * @en Before save event.
     * @ja 永続化前に発行
     */
    'will-save': void;
}

/**
 * @en Registry read options.
 * @ja レジストリ読み取り用オプション
 */
export interface RegistryReadOptions {
    /**
     * @en When accessing as a registry key below the unique field value, it's designated. ex) 'private'
     * @ja 固有のフィールド値以下のレジストリキーとしてアクセスする場合に指定 ex) 'private'
     */
    field?: string;
}

/**
 * @en Registry write options.
 * @ja レジストリ書き込み用オプション
 */
export interface RegistryWriteOptions extends RegistryReadOptions, IStorageFormatOptions, Silenceable {
    /**
     * @en If `true` set, no call persistence method when a value is updated.
     * @ja 更新時に保存処理を呼び出したくない場合は `true` を指定
     */
    noSave?: boolean;
}

/**
 * @en Registry save options.
 * @ja レジストリ保存用オプション
 */
export type RegistrySaveOptions = IStorageOptions & IStorageFormatOptions;
