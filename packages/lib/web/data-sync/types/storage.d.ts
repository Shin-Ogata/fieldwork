import type { IStorage, IStorageOptions } from '@cdp/core-storage';
import type { IDataSyncOptions, IDataSync, SyncObject } from './interfaces';
/**
 * @en {@link IDataSync} interface for {@link IStorage} accessor.
 * @ja {@link IStorage} アクセッサを備える {@link IDataSync} インターフェイス
 */
export interface IStorageDataSync<T extends object = SyncObject> extends IDataSync<T> {
    /**
     * @en Get current {@link IStorage} instance.
     * @ja 現在対象の {@link IStorage} インスタンスにアクセス
     */
    getStorage(): IStorage;
    /**
     * @en Set new {@link IStorage} instance.
     * @ja 新しい {@link IStorage} インスタンスを設定
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
 * @en {@link StorageDataSync} construction options.
 * @ja {@link StorageDataSync} 構築に指定するオプション
 */
export interface StorageDataSyncConstructionOptions {
    separator?: string;
}
/**
 * @en Options interface for {@link StorageDataSync}.
 * @ja {@link StorageDataSync} に指定するオプション
 */
export type StorageDataSyncOptions = IDataSyncOptions & IStorageOptions;
/**
 * @en Create {@link IStorageDataSync} object with {@link IStorage}.
 * @ja {@link IStorage} を指定して, {@link IStorageDataSync} オブジェクトを構築
 *
 * @param storage
 *  - `en` {@link IStorage} object
 *  - `ja` {@link IStorage} オブジェクト
 * @param options
 *  - `en` construction options
 *  - `ja` 構築オプション
 */
export declare const createStorageDataSync: (storage: IStorage, options?: StorageDataSyncConstructionOptions) => IStorageDataSync;
export declare const dataSyncSTORAGE: IStorageDataSync<import("@cdp/core-utils").AnyObject>;
