import type {
    PlainObject,
    AnyObject,
    KeyToType,
} from '@cdp/core-utils';
import type { EventBroker } from '@cdp/events';
import type { Cancelable } from '@cdp/promise';

/**
 * @en The event definition fired in {@link IDataSync}.
 * @ja {@link IDataSync} 内から発行されるイベント定義
 */
export interface SyncEvent<T extends object> {
    /** @args [context, response] */
    '@request': [EventBroker<SyncEvent<T>>, Promise<T | PlainObject>];
}

/**
 * @en List of the methods and the return value types {@link IDataSync} supports.
 * @ja {@link IDataSync} がサポートするメソッドと戻り値のリスト
 */
export interface SyncMethodList<T extends object = PlainObject> {
    create: PlainObject | void;
    update: PlainObject | void;
    patch: PlainObject | void;
    delete: PlainObject | void;
    read: T;
}

/**
 * @en {@link IDataSync.sync | IDataSync.sync}() method list.
 * @ja {@link IDataSync.sync | IDataSync.sync}() に指定するメソッド一覧
 */
export type SyncMethods<T extends object = PlainObject> = keyof SyncMethodList<T>;

/**
 * @en Return type of {@link IDataSync.sync | IDataSync.sync}().
 * @ja {@link IDataSync.sync | IDataSync.sync}() の戻り値の型
 */
export type SyncResult<T extends object = PlainObject, M extends SyncMethodList<object> = SyncMethodList<T>> = KeyToType<M, keyof M>;

/**
 * @en Default {@link SyncContext} type.
 * @ja {@link SyncContext} の既定型
 */
export type SyncObject = AnyObject;

/**
 * @en Context type of {@link IDataSync.sync | IDataSync.sync}().
 * @ja {@link IDataSync.sync | IDataSync.sync}() に指定するコンテキストの型
 */
export type SyncContext<T extends object = SyncObject> = EventBroker<SyncEvent<T>> & { id?: string; toJSON(): T; };

/**
 * @en {@link IDataSync.sync | IDataSync.sync}() options.
 * @ja {@link IDataSync.sync | IDataSync.sync}() に指定するオプション
 */
export interface IDataSyncOptions extends Cancelable {
    /**
     * @en Data to be sent to the server. {@link AjaxOptions} compatible. <br>
     *     If this property passed, the value is reflected as primary.
     * 
     * @ja サーバーに送信されるデータ. {@link AjaxOptions} 互換 <br>
     *     指定された場合, このオプションが優先される.
     */
    data?: PlainObject;
}

/**
 * @en The interface for during a data source to synchronize with a context. <br>
 *     The function is equivalent to `Backbone.sync()`.
 * @ja コンテキストとデータソース間の同期をとるためのインターフェイス <br>
 *     `Backbone.sync()` 相当の機能を提供
 */
export interface IDataSync<T extends object = SyncObject> {
    /**
     * @en {@link IDataSync} kind signature.
     * @ja {@link IDataSync} の種別を表す識別子
     */
    readonly kind: string;

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
     *  - `en` option object
     *  - `ja` オプション
     */
    sync(method: SyncMethods, context: SyncContext<T>, options?: IDataSyncOptions): Promise<SyncResult<T>>;
}
