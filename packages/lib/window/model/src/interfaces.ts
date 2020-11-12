import { Constructor, PlainObject } from '@cdp/core-utils';
import { EventAll, Silenceable } from '@cdp/events';
import { Result } from '@cdp/result';
import {
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
 * @en [[Model]] attribute change event definition.
 * @ja [[Model]] 属性変更イベント定義
 */
export type ModelAttributeChangeEvent<T extends object> = { [K in keyof T]: [T[K], T[K], K]; }

/**
 * @en Default [[Model]] event definition.
 * @ja 既定の [[Model]] イベント定義
 */
export type ModelEvent<T extends object> = EventAll & SyncEvent<T> & ModelAttributeChangeEvent<T> & {
    /**
     * @en when a model is added to a collection.
     * @ja モデルがコレクションに追加されたときに発行
    */
    '@add': [Model<T>, unknown, Silenceable];

    /**
     * @en when a model is removed from a collection.
     * @ja モデルがコレクションから削除されたときに発行
     */
    '@remove': [Model<T>, unknown, Silenceable];

    /**
     * @en notified when some attribute changed.
     * @ja 属性が変更されたときに発行
     */
    '@change': Model<T>;

    /**
     * @en notified when a model has been successfully synced with the server.
     * @ja サーバー同期に成功したときに発行
     */
    '@sync': [Model<T>, PlainObject, ModelDataSyncOptions];

    /**
     * @en notified when a model is destroyed.
     * @ja モデルが破棄されたときに発行
     */
    '@destroy': [Model<T>, ModelDestroyOptions];

    /**
     * @en notified when some attribute failed.
     * @ja 属性が変更に失敗したときに発行
     */
    '@invalid': [Model<T>, T, Result];

    /**
     * @en notified when a model's request to the server has failed.
     * @ja サーバーリクエストに失敗したときに発行
     */
    '@error': [Model<T>, Error, ModelDataSyncOptions];
};

/**
 * @en [[Model]] attributes definition.
 * @ja [[Model]] が持つ属性の定義
 */
export type ModelAttributes<T extends object> = { [P in keyof T]: T[P] };

/**
 * @en [[Model]] base constructor definition.
 * @ja [[Model]] の基底コンストラクタの定義
 */
//export type ModelConstructor<C extends object, T extends object> = new (...args: ConstructorParameters<Constructor<C>>) => C & ModelAttributes<T>;
export interface ModelConstructor<C extends object, T extends object> {
    idAttribute: string;
    new(...args: ConstructorParameters<Constructor<C>>): C & ModelAttributes<T>;
}

/**
 * @en [[Model]] validate options.
 * @ja [[Model]] 検証オプション
 */
export interface ModelValidateAttributeOptions extends Silenceable {
    extend?: boolean;
}

/**
 * @en [[Model]] attributes argument type.
 * @ja [[Model]] 属性引数の型
 */
export type ModelAttributeInput<T> = Partial<T> & PlainObject;

/**
 * @en [[Model]] attributes setup options.
 * @ja [[Model]] 属性設定時に指定するオプション
 */
export interface ModelSetOptions extends Validable, ModelValidateAttributeOptions {
    syncMethod?: SyncMethods;
}

/**
 * @en [[Model]] construction options.
 * @ja [[Model]] 構築に指定するオプション
 */
export type ModelConstructionOptions = ModelSetOptions & Parseable;

/** re-exports */
export type ModelSyncMethods = SyncMethods;
export type ModelSyncResult<K extends SyncMethods, T extends object = PlainObject> = SyncResult<K, T>;
export type ModelDataSyncOptions = RestDataSyncOptions;

/**
 * @en [[Model]] fetch options.
 * @ja [[Model]] fetch に指定するオプション
 */
export type ModelFetchOptions = ModelDataSyncOptions & Omit<ModelSetOptions, 'noThrow'> & Parseable;

/**
 * @en [[Model]] save options.
 * @ja [[Model]] save に指定するオプション
 */
export interface ModelSaveOptions extends ModelFetchOptions, Waitable {
    patch?: boolean;
}

/**
 * @en [[Model]] destroy options.
 * @ja [[Model]] destroy に指定するオプション
 */
export type ModelDestroyOptions = ModelDataSyncOptions & Waitable;
