import type {
    PlainObject,
    AnyObject,
    KeyToType,
} from '@cdp/core-utils';
import type { EventBroker } from '@cdp/events';
import type { Cancelable } from '@cdp/promise';

/**
 * @en The event definition fired in [[IDataSync]].
 * @ja [[IDataSync]] 内から発行されるイベント定義
 */
export interface SyncEvent<T extends object> {
    /** @args [context, response] */
    '@request': [EventBroker<SyncEvent<T>>, Promise<T | PlainObject>];
}

/**
 * @en List of the methods and the return value types [[IDataSync]] supports.
 * @ja [[IDataSync]] がサポートするメソッドと戻り値のリスト
 */
export interface SyncMethodList<T extends object = PlainObject> {
    create: PlainObject | void;
    update: PlainObject | void;
    patch: PlainObject | void;
    delete: PlainObject | void;
    read: T;
}

/**
 * @en [[IDataSync]]`#sync()` method list.
 * @ja [[IDataSync]]`#sync()` に指定するメソッド一覧
 */
export type SyncMethods = keyof SyncMethodList;

/**
 * @en Return type of [[IDataSync]]`#sync()`.
 * @ja [[IDataSync]]`#sync()` の戻り値の型
 */
export type SyncResult<K extends SyncMethods, T extends object = PlainObject> = KeyToType<SyncMethodList<T>, K>;

/**
 * @en Default [[SyncContext]] type.
 * @ja [[SyncContext]] の既定型
 */
export type SyncObject = AnyObject;

/**
 * @en Context type of [[IDataSync]]`#sync()`.
 * @ja [[IDataSync]]`#sync()` に指定するコンテキストの型
 */
export type SyncContext<T extends object = SyncObject> = EventBroker<SyncEvent<T>> & { id?: string; toJSON(): T; };

/**
 * @en [[IDataSync]] sync() options.
 * @ja [[IDataSync]] sync() に指定するオプション
 */
export interface IDataSyncOptions extends Cancelable {
    /**
     * @en Data to be sent to the server. [[AjaxOptions]] compatible. <br>
     *     If this property passed, the value is reflected as primary.
     * 
     * @ja サーバーに送信されるデータ. [[AjaxOptions]] 互換 <br>
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
     * @en [[IDataSync]] kind signature.
     * @ja [[IDataSync]] の種別を表す識別子
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
    sync<K extends SyncMethods>(method: K, context: SyncContext<T>, options?: IDataSyncOptions): Promise<SyncResult<K, T>>;
}
