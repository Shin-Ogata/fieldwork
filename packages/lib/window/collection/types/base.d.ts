import { Class, UnknownObject, PlainObject, Keys } from '@cdp/core-utils';
import { EventSource } from '@cdp/events';
import { SortCallback, CollectionQueryInfo, CollectionEvent, CollectionConstructionOptions, CollectionOperationOptions, CollectionAddOptions, CollectionSetOptions, CollectionReSortOptions } from './interfaces';
declare const _removeModels: unique symbol;
/**
 * @en Base class definition for object collection.
 * @ja オブジェクトの集合を扱う基底クラス定義
 *
 * TODO:
 */
export declare abstract class Collection<TModel extends object = object, Event extends CollectionEvent<TModel> = CollectionEvent<TModel>, TKey extends Keys<TModel> = Keys<TModel>> extends EventSource<Event> implements Iterable<TModel> {
    /**
     * @en Model constructor. <br>
     *     The constructor is used internally by this [[Collection]] class for [[TModel]] construction.
     * @ja モデルコンストラクタ <br>
     *     [[Collection]] クラスが [[TModel]] を構築するために使用する
     */
    static readonly model?: Class;
    /**
     * constructor
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` モデル要素の配列を指定
     * @param options
     *  - `en` construction options.
     *  - `ja` 構築オプション
     */
    constructor(seeds?: TModel[] | PlainObject[], options?: CollectionConstructionOptions<TModel>);
    /**
     * @en Get content ID.
     * @ja コンテント ID を取得
     */
    get id(): string;
    /**
     * @en Get models.
     * @ja モデルアクセス
     */
    get models(): TModel[];
    /**
     * @en number of models.
     * @ja 内包するモデル数
     */
    get length(): number;
    /**
     * @en Iterator of [[ElementBase]] values in the array.
     * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
     */
    [Symbol.iterator](): Iterator<TModel>;
    /**
     * @en Returns an iterable of key(id), value(model) pairs for every entry in the array.
     * @ja key(id), value(model) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    entries(): IterableIterator<[string, TModel]>;
    /**
     * @en Returns an iterable of keys(id) in the array.
     * @ja key(id) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    keys(): IterableIterator<string>;
    /**
     * @en Returns an iterable of values([[ElementBase]]) in the array.
     * @ja values([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    values(): IterableIterator<TModel>;
    /**
     * @en [[CollectionQueryInfo]] instance
     * @ja [[CollectionQueryInfo]] を格納するインスタンス
     */
    protected get _queryInfo(): CollectionQueryInfo<TModel, TKey>;
    /**
     * @en [[CollectionQueryInfo]] instance
     * @ja [[CollectionQueryInfo]] を格納するインスタンス
     */
    protected set _queryInfo(val: CollectionQueryInfo<TModel, TKey>);
    /**
     * @en Initialize [[CollectionQueryInfo]].
     * @ja [[CollectionQueryInfo]] の初期化
     *
     * @override
     */
    protected initQueryInfo(): CollectionQueryInfo<TModel, TKey>;
    /**
     * @en Get a model from a collection, specified by an `id`, a `cid`, or by passing in a model instance.
     * @ja `id`, `cid` およびインスタンスからモデルを特定
     *
     * @param seed
     *  - `en` `id`, a `cid`, or by passing in a model instance
     *  - `ja`  `id`, `cid` およびインスタンス
     */
    get(seed: string | object | undefined): TModel | undefined;
    /**
     * @en Converts a response into the hash of attributes to be `set` on the collection. The default implementation is just to pass the response along.
     * @ja レスポンスの変換メソッド. 既定では何もしない
     *
     * @override
     */
    protected parse(response: PlainObject | void, options?: CollectionSetOptions): TModel[] | PlainObject[] | undefined;
    /**
     * @en Access to sort comparators.
     * @ja ソート用比較関数へのアクセス
     */
    protected get _comparators(): SortCallback<TModel>[];
    /**
     * @en Force a collection to re-sort itself.
     * @ja コレクション要素の再ソート
     */
    sort(options?: CollectionReSortOptions<TModel, TKey>): this;
    /**
     * @en "Smart" update method of the collection with the passed list of models.
     *       - if the model is already in the collection its attributes will be merged.
     *       - if the collection contains any models that aren't present in the list, they'll be removed.
     *       - All of the appropriate `@add`, `@remove`, and `@update` events are fired as this happens.
     * @ja コレクションの汎用更新処理
     *       - 追加時にすでにモデルが存在するときは、属性をマージ
     *       - 指定リストに存在しないモデルは削除
     *       - 適切な `@add`, `@remove`, `@update` イベントを発生
     *
     * @param seed
     *  - `en` Nil value.
     *  - `ja` Nil 要素
     * @param options
     *  - `en` set options.
     *  - `ja` 設定オプション
     */
    set(seed: undefined, options?: CollectionSetOptions): void;
    /**
     * @en "Smart" update method of the collection with the passed list of models.
     *       - if the model is already in the collection its attributes will be merged.
     *       - if the collection contains any models that aren't present in the list, they'll be removed.
     *       - All of the appropriate `@add`, `@remove`, and `@update` events are fired as this happens.
     * @ja コレクションの汎用更新処理
     *       - 追加時にすでにモデルが存在するときは、属性をマージ
     *       - 指定リストに存在しないモデルは削除
     *       - 適切な `@add`, `@remove`, `@update` イベントを発生
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` モデル要素を指定
     * @param options
     *  - `en` set options.
     *  - `ja` 設定オプション
     */
    set(seed: TModel | UnknownObject, options?: CollectionSetOptions): TModel;
    /**
     * @en "Smart" update method of the collection with the passed list of models.
     *       - if the model is already in the collection its attributes will be merged.
     *       - if the collection contains any models that aren't present in the list, they'll be removed.
     *       - All of the appropriate `@add`, `@remove`, and `@update` events are fired as this happens.
     * @ja コレクションの汎用更新処理
     *       - 追加時にすでにモデルが存在するときは、属性をマージ
     *       - 指定リストに存在しないモデルは削除
     *       - 適切な `@add`, `@remove`, `@update` イベントを発生
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` モデル要素の配列を指定
     * @param options
     *  - `en` set options.
     *  - `ja` 設定オプション
     */
    set(seeds: (TModel | PlainObject)[], options?: CollectionSetOptions): TModel[];
    /**
     * @en Replace a collection with a new list of models (or attribute hashes), triggering a single `reset` event on completion.
     * @ja コレクションを新しいモデル一覧で置換. 完了時に `reset` イベントを発行
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` モデル要素の配列を指定
     * @param options
     *  - `en` reset options.
     *  - `ja` リセットオプション
     */
    reset(seeds?: (TModel | PlainObject)[], options?: CollectionOperationOptions): TModel[];
    /**
     * @en Add model to the collection.
     * @ja コレクションへのモデルの追加
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` モデル要素を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    add(seed: TModel | UnknownObject, options?: CollectionAddOptions): TModel;
    /**
     * @en Add to the collection with the passed list of models.
     * @ja モデルリスト指定によるコレクションへの追加
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` モデル要素の配列を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    add(seeds: (TModel | PlainObject)[], options?: CollectionAddOptions): TModel[];
    /**
     * @en Remove a model from the set.
     * @ja コレクションからモデルを削除
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` モデル要素を指定
     * @param options
     *  - `en` remove options.
     *  - `ja` 削除オプション
     */
    remove(seed: TModel | UnknownObject, options?: CollectionOperationOptions): TModel;
    /**
     * @en Remove a list of models from the set.
     * @ja モデルリスト指定によるコレクションからの削除
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` モデル要素の配列を指定
     * @param options
     *  - `en` remove options.
     *  - `ja` 削除オプション
     */
    remove(seeds: (TModel | PlainObject)[], options?: CollectionOperationOptions): TModel[];
    /** @ineternal Internal method called by both remove and set. */
    private [_removeModels];
}
export {};
