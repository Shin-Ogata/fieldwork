import { PlainObject } from '@cdp/core-utils';
import { RESULT_CODE, makeResult } from '@cdp/result';
import { IStorage, IStorageOptions } from '@cdp/core-storage';
import { webStorage } from '@cdp/web-storage';
import {
    IDataSyncOptions,
    IDataSync,
    SyncMethods,
    SyncContext,
    SyncResult,
} from './interfaces';
import { resolveURL } from './internal';

/**
 * @en [[IDataSync]] interface for [[IStorage]] accessor.
 * @ja [[IStorage]] アクセッサを備える [[IDataSync]] インターフェイス
 */
export interface IStorageDataSync<T extends {} = PlainObject> extends IDataSync<T> {
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
}

/**
 * @en Options interface for [[StorageDataSync]].
 * @ja [[StorageDataSync]] に指定するオプション
 */
export type StorageDataSyncOptions = IDataSyncOptions & IStorageOptions;

//__________________________________________________________________________________________________//

/**
 * @en The [[IDataSync]] implemant class which target is [[IStorage]]. Default storage is [[WebStorage]].
 * @ja [[IStorage]] を対象とした [[IDataSync]] 実装クラス. 既定値は [[WebStorage]]
 */
class StorageDataSync implements IStorageDataSync {
    private _storage: IStorage;

    /**
     * constructor
     */
    constructor() {
        this._storage = webStorage;
    }

///////////////////////////////////////////////////////////////////////
// implements: IStorageDataSync

    /**
     * @en Get current [[IStorage]] instance.
     * @ja 現在対象の [[IStorage]] インスタンスにアクセス
     */
    getStorage(): IStorage {
        return this._storage;
    }

    /**
     * @en Set new [[IStorage]] instance.
     * @ja 新しい [[IStorage]] インスタンスを設定
     */
    setStorage(newStorage: IStorage): this {
        this._storage = newStorage;
        return this;
    }

///////////////////////////////////////////////////////////////////////
// implements: IDataSync

    /**
     * @en [[IDataSync]] kind signature.
     * @ja [[IDataSync]] の種別を表す識別子
     */
    get kind(): string {
        return 'storage';
    }

    /**
     * @en Do data synchronization.
     * @ja データ同期
     *
     * @param method
     *  - `en` operation string
     *  - `ja` オペレーションを指定
     * @param context
     *  - `en` synchronized context object
     *  - `ja` 同期するコンテキストオブジェクト
     * @param options
     *  - `en` storage option object
     *  - `ja` ストレージオプション
     */
    sync<K extends SyncMethods>(method: K, context: SyncContext, options?: StorageDataSyncOptions): Promise<SyncResult<K>> {
        const id = resolveURL(context);
        if (!id) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
        }

        let responce: Promise<PlainObject | void | null>;
        switch (method) {
            case 'create':
            case 'update':
            case 'patch': {
                const { data } = options || {};
                const attrs = Object.assign(context.toJSON(), data);
                responce = this._storage.setItem(id, attrs, options);
                break;
            }
            case 'delete':
                responce = this._storage.removeItem(id, options);
                break;
            case 'read':
                responce = this._storage.getItem<PlainObject>(id, options);
                break;
            default:
                throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, `unknown method: ${method}`);
        }

        context.trigger('@request', context, responce as Promise<PlainObject>);
        return responce as Promise<SyncResult<K>>;
    }
}

export const dataSyncSTORAGE = new StorageDataSync() as IDataSync;
