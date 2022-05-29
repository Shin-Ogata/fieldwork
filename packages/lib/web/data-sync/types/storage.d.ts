import { IStorage, IStorageOptions } from '@cdp/core-storage';
import { IDataSyncOptions, IDataSync, SyncObject } from './interfaces';
/**
 * @en [[IDataSync]] interface for [[IStorage]] accessor.
 * @ja [[IStorage]] アクセッサを備える [[IDataSync]] インターフェイス
 */
export interface IStorageDataSync<T extends object = SyncObject> extends IDataSync<T> {
    /**
     * @en Get current [[IStorage]] instance.
     * @ja 現在対象の [[IStorage]] インスタンスにアクセス
     */
    getStorage(): IStorage;
    /**
     * @en Set new [[IStorage]] instance.
     * @ja 新しい [[IStorage]] インスタンスを設定
     */
    setStorage(newStorage: IStorage): this;
    /**
     * @en Set new id-separator.
     * @ja 新しい ID セパレータを設定
     *
     * @param newSeparator
     *  - `en` new separator string
     *  - `ja` 新しいセパレータ文字列
     * @returns
     *  - `en` old separator string
     *  - `ja` 以前い設定されていたセパレータ文字列
     */
    setIdSeparator(newSeparator: string): string;
}
/**
 * @en [[StorageDataSync]] construction options.
 * @ja [[StorageDataSync]] 構築に指定するオプション
 */
export interface StorageDataSyncConstructionOptions {
    separator?: string;
}
/**
 * @en Options interface for [[StorageDataSync]].
 * @ja [[StorageDataSync]] に指定するオプション
 */
export declare type StorageDataSyncOptions = IDataSyncOptions & IStorageOptions;
/**
 * @en Create [[IStorageDataSync]] object with [[IStorage]].
 * @ja [[IStorage]] を指定して, [[IStorageDataSync]] オブジェクトを構築
 *
 * @param storage
 *  - `en` [[IStorage]] object
 *  - `ja` [[IStorage]] オブジェクト
 * @param options
 *  - `en` construction options
 *  - `ja` 構築オプション
 */
export declare const createStorageDataSync: (storage: IStorage, options?: StorageDataSyncConstructionOptions) => IStorageDataSync;
export declare const dataSyncSTORAGE: IStorageDataSync<import("@cdp/core-utils").AnyObject>;
