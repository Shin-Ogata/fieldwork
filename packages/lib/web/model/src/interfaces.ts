import type {
    Constructor,
    PlainObject,
    NonFunctionPropertyNames,
} from '@cdp/core-utils';
import type {
    Subscribable,
    EventAll,
    Silenceable,
} from '@cdp/events';
import type { Result } from '@cdp/result';
import type {
    SyncObject,
    SyncEvent,
    SyncMethods,
    SyncResult,
    RestDataSyncOptions,
} from '@cdp/data-sync';
import type { Model } from './base';

/**
 * @en Validable base interface.
 * @ja 検証可否の定義
 */
export interface Validable {
    validate?: boolean;
    noThrow?: boolean;
}

/**
 * @en Parseable base interface.
 * @ja パース可否の定義
 */
export interface Parseable {
    parse?: boolean;
}

/**
 * @en Waitable base interface.
 * @ja 遅延更新可否の定義
 */
export interface Waitable {
    wait?: boolean;
}

/**
 * @en Default {@link Model} seed type.
 * @ja 既定の {@link Model} シードデータ型
 */
export type ModelSeed = PlainObject;

/** helper for {@link ModelAttributeChangeEvent} */
export type ChangedAttributeEvent<T extends object> = `@change:${string & NonFunctionPropertyNames<T>}`;
/** helper for {@link ModelAttributeChangeEvent} */
export type MakeEventArg<T extends object, K> = K extends `@change:${infer A}` ? A extends keyof T ? [Model<T>, T[A], T[A], A] : never : never;

/**
 * @en {@link Model} attribute change event definition.
 * @ja {@link Model} 属性変更イベント定義
 */
export type ModelAttributeChangeEvent<T extends object> = { [K in ChangedAttributeEvent<T>]: MakeEventArg<T, K>; }

/**
 * @en Default {@link Model} event definition.
 * @ja 既定の {@link Model} イベント定義
 */
export type ModelEvent<T extends object> = EventAll & SyncEvent<T> & ModelAttributeChangeEvent<T> & {
    /**
     * @en when a model is added to a collection.
     * @ja Model が  Collection に追加されたときに発行
     *
     * @args [model, collection, options]
     */
    '@add': [Model<T>, unknown, Silenceable];

    /**
     * @en when a model is removed from a collection.
     * @ja Model が Collection から削除されたときに発行
     *
     * @args [model, collection, options]
     */
    '@remove': [Model<T>, unknown, Silenceable];

    /**
     * @en notified when some attribute changed.
     * @ja 属性が変更されたときに発行
     *
     * @args [model]
     */
    '@change': Model<T>;

    /**
     * @en notified when a model has been successfully synced with the server.
     * @ja サーバー同期に成功したときに発行
     *
     * @args [model, seed, options]
     */
    '@sync': [Model<T>, ModelSeed, ModelDataSyncOptions];

    /**
     * @en notified when a model is destroyed.
     * @ja Model が破棄されたときに発行
     *
     * @args [model, options]
     */
    '@destroy': [Model<T>, ModelDestroyOptions];

    /**
     * @en notified when some attribute failed.
     * @ja 属性が変更に失敗したときに発行
     *
     * @args [model, attributes, errorInfo]
     */
    '@invalid': [Model<T>, T, Result];

    /**
     * @en notified when a model's request to the server has failed.
     * @ja サーバーリクエストに失敗したときに発行
     *
     * @args [model, errorInfo, options]
     */
    '@error': [Model<T>, Error, ModelDataSyncOptions];
};

/**
 * @en {@link Model} attributes definition.
 * @ja {@link Model} が持つ属性の定義
 */
export type ModelAttributes<T extends object> = { [P in keyof T]: T[P] };

/**
 * @en {@link Model} base constructor definition.
 * @ja {@link Model} の基底コンストラクタの定義
 */
export interface ModelConstructor<C extends object, T extends object> {
    idAttribute: string;
    new(...args: ConstructorParameters<Constructor<C>>): C & ModelAttributes<T>;
}

/**
 * @en {@link Model}'s `EventSource` definition from attributes.
 * @ja 属性から {@link Model} の `EventSource` 定義抽出
 */
export type ModelEventSource<T extends object> = Subscribable<ModelEvent<T>>;

/**
 * @en {@link Model} validate options.
 * @ja {@link Model} 検証オプション
 */
export interface ModelValidateAttributeOptions extends Silenceable {
    extend?: boolean;
}

/**
 * @en {@link Model} attributes argument type.
 * @ja {@link Model} 属性引数の型
 */
export type ModelAttributeInput<T> = Partial<T> & SyncObject;

/**
 * @en {@link Model} attributes setup options.
 * @ja {@link Model} 属性設定時に指定するオプション
 */
export interface ModelSetOptions extends Validable, ModelValidateAttributeOptions {
    syncMethod?: SyncMethods;
}

/**
 * @en {@link Model} construction options.
 * @ja {@link Model} 構築に指定するオプション
 */
export type ModelConstructionOptions = ModelSetOptions & Parseable;

/** re-exports */
export type ModelSyncMethods = SyncMethods;
export type ModelSyncResult<T extends object = ModelSeed> = SyncResult<T>;
export type ModelDataSyncOptions = RestDataSyncOptions;

/**
 * @en {@link Model} fetch options.
 * @ja {@link Model} fetch に指定するオプション
 */
export type ModelFetchOptions = ModelDataSyncOptions & Omit<ModelSetOptions, 'noThrow'> & Parseable;

/**
 * @en {@link Model} save options.
 * @ja {@link Model} save に指定するオプション
 */
export interface ModelSaveOptions extends ModelFetchOptions, Waitable {
    patch?: boolean;
}

/**
 * @en {@link Model} destroy options.
 * @ja {@link Model} destroy に指定するオプション
 */
export type ModelDestroyOptions = ModelDataSyncOptions & Waitable;
