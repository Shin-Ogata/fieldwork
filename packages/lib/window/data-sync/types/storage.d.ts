import { PlainObject } from '@cdp/core-utils';
import { IStorage } from '@cdp/core-storage';
import { IDataSync } from './interfaces';
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
export declare const dataSyncSTORAGE: IDataSync<PlainObject<any>>;
