import { PlainObject, KeyToType } from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';
import { Cancelable } from '@cdp/promise';

/**
 * @en The event definition fired in [[IDataSync]].
 * @ja [[IDataSync]] 内から発行されるイベント定義
 */
export interface SyncEvent<T extends {}> {
    '@request': [EventBroker<SyncEvent<T>>, Promise<T | PlainObject>];
}

/**
 * @en List of the methods and the return value types [[IDataSync]] supports.
 * @ja [[IDataSync]] がサポートするメソッドと戻り値のリスト
 */
export interface SyncMethodList<T extends {} = PlainObject> {
    create: PlainObject;
    update: PlainObject;
    patch: PlainObject;
    delete: PlainObject;
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
export type SyncResult<K extends SyncMethods, T extends {} = PlainObject> = KeyToType<SyncMethodList<T>, K>;

/**
 * @en Context type of [[IDataSync]]`#sync()`.
 * @ja [[IDataSync]]`#sync()` に指定するコンテキストの型
 */
export type SyncContext<T extends {} = PlainObject> = EventBroker<SyncEvent<T>> & { toJSON(): T; };

/**
 * @en The interface for during a data source to synchronize with a context. <br>
 *     The function is equivalent to `Backbone.sync()`.
 * @ja コンテキストとデータソース間の同期をとるためのインターフェイス <br>
 *     `Backbone.sync()` 相当の機能を提供
 */
export interface IDataSync<T extends {} = PlainObject> {
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
    sync<K extends SyncMethods>(method: K, context: SyncContext<T>, options?: Cancelable): Promise<SyncResult<K, T>>;
}
