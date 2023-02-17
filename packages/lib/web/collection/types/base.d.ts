import { Class, UnknownObject, Keys } from '@cdp/core-utils';
import { Silenceable, EventSource } from '@cdp/events';
import { ModelSaveOptions } from '@cdp/model';
import { SortCallback, FilterCallback, CollectionItemQueryResult, CollectionItemQueryOptions, CollectionItemProvider, CollectionQueryInfo, CollectionSeed, CollectionEvent, CollectionConstructionOptions, CollectionOperationOptions, CollectionAddOptions, CollectionSetOptions, CollectionReSortOptions, CollectionQueryOptions, CollectionRequeryOptions, CollectionAfterFilterOptions } from './interfaces';
/**
 * @en Base class definition for collection that is ordered sets of models.
 * @ja Model の集合を扱う Collection の基底クラス定義.
 *
 * @example <br>
 *
 * ```ts
 * import { Model, ModelConstructor } from '@cdp/model';
 * import {
 *     Collection,
 *     CollectionItemQueryOptions,
 *     CollectionItemQueryResult,
 *     CollectionSeed,
 * } from '@cdp/collection';
 *
 * // Model schema
 * interface TrackAttribute {
 *   uri: string;
 *   title: string;
 *   artist: string;
 *   album:  string;
 *   releaseDate: Date;
 *   :
 * }
 *
 * // Model definition
 * const TrackBase = Model as ModelConstructor<Model<TrackAttribute>, TrackAttribute>;
 * class Track extends TrackBase {
 *     static idAttribute = 'uri';
 * }
 *
 * // Collection definition
 * class Playlist extends Collection<Track> {
 *     // set target Model constructor
 *     static readonly model = Track;
 *
 *     // @override if need to use custom content provider for fetch.
 *     protected async sync(
 *         options?: CollectionItemQueryOptions<Track>
 *     ): Promise<CollectionItemQueryResult<object>> {
 *         // some specific implementation here.
 *         const items = await customProvider(options);
 *         return {
 *             total: items.length,
 *             items,
 *             options,
 *         } as CollectionItemQueryResult<object>;
 *     }
 *
 *     // @override if need to convert a response into a list of models.
 *     protected parse(response: CollectionSeed[]): TrackAttribute[] {
 *         return response.map(seed => {
 *             const date = seed.releaseDate;
 *             seed.releaseDate = new Date(date);
 *             return seed;
 *         }) as TrackAttribute[];
 *      }
 * }
 *
 * let seeds: TrackAttribute[];
 *
 * const playlist = new Playlist(seeds, {
 *     // default query options
 *     queryOptions: {
 *         sortKeys: [
 *             { name: 'title', order: SortOrder.DESC, type: 'string' },
 *         ],
 *     }
 * });
 *
 * await playlist.requery();
 *
 * for (const track of playlist) {
 *     console.log(JSON.stringify(track.toJSON()));
 * }
 * ```
 */
export declare abstract class Collection<TModel extends object = any, // eslint-disable-line @typescript-eslint/no-explicit-any
TEvent extends CollectionEvent<TModel> = CollectionEvent<TModel>, TKey extends Keys<TModel> = Keys<TModel>> extends EventSource<TEvent> implements Iterable<TModel> {
    /**
     * @en Model constructor. <br>
     *     The constructor is used internally by this [[Collection]] class for [[TModel]] construction.
     * @ja Model コンストラクタ <br>
     *     [[Collection]] クラスが [[TModel]] を構築するために使用する
     */
    static readonly model?: Class;
    /**
     * constructor
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` Model 要素の配列を指定
     * @param options
     *  - `en` construction options.
     *  - `ja` 構築オプション
     */
    constructor(seeds?: TModel[] | CollectionSeed[], options?: CollectionConstructionOptions<TModel, TKey>);
    /**
     * @ja Initialize query info
     * @ja クエリ情報の初期化
     */
    protected initQueryInfo(): void;
    /**
     * @en Released all instances and event listener under the management.
     * @ja 管理対象を破棄
     *
     * @param options
     *  - `en` options (reserved).
     *  - `ja` オプション (予約)
     */
    release(options?: CollectionOperationOptions): this;
    /**
     * @ja Clear cache instance method
     * @ja キャッシュの破棄
     */
    protected clearCache(): void;
    /**
     * @en Get content ID.
     * @ja コンテント ID を取得
     */
    get id(): string;
    /**
     * @en Get models.
     * @ja Model アクセス
     */
    get models(): readonly TModel[];
    /**
     * @en number of models.
     * @ja 内包する Model 数
     */
    get length(): number;
    /**
     * @en Check applied after-filter.
     * @ja 絞り込み用フィルタが適用されているかを判定
     */
    get filtered(): boolean;
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
     * @en Get creating options.
     * @ja 構築時のオプションを取得
     */
    protected get _options(): CollectionConstructionOptions<TModel, TKey>;
    /**
     * @en Get default provider.
     * @ja 既定のプロバイダを取得
     */
    protected get _provider(): CollectionItemProvider<TModel, TKey>;
    /**
     * @en Get default parse behaviour.
     * @ja 既定の parse 動作を取得
     */
    protected get _defaultParse(): boolean | undefined;
    /**
     * @en Get default query options.
     * @ja 既定のクエリオプションを取得
     */
    protected get _defaultQueryOptions(): CollectionItemQueryOptions<TModel, TKey>;
    /**
     * @en Get last query options.
     * @ja 最後のクエリオプションを取得
     */
    protected get _lastQueryOptions(): CollectionItemQueryOptions<TModel, TKey>;
    /**
     * @en Access to sort comparators.
     * @ja ソート用比較関数へのアクセス
     */
    protected get _comparators(): SortCallback<TModel>[];
    /**
     * @en Access to query-filter.
     * @ja クエリ用フィルタ関数へのアクセス
     */
    protected get _queryFilter(): FilterCallback<TModel> | undefined;
    /**
     * @en Access to after-filter.
     * @ja 絞り込み用フィルタ関数へのアクセス
     */
    protected get _afterFilter(): FilterCallback<TModel> | undefined;
    /**
     * @en Get a model from a collection, specified by an `id`, a `cid`, or by passing in a model instance.
     * @ja `id`, `cid` およびインスタンスから Model を特定
     *
     * @param seed
     *  - `en` `id`, a `cid`, or by passing in a model instance
     *  - `ja`  `id`, `cid` およびインスタンス
     */
    get(seed: string | object | undefined): TModel | undefined;
    /**
     * @en Returns `true` if the model is in the collection by an `id`, a `cid`, or by passing in a model instance.
     * @ja `id`, `cid` およびインスタンスから Model を所有しているか判定
     *
     * @param seed
     *  - `en` `id`, a `cid`, or by passing in a model instance
     *  - `ja`  `id`, `cid` およびインスタンス
     */
    has(seed: string | object | undefined): boolean;
    /**
     * @en Return a copy of the model's `attributes` object.
     * @ja Model 属性値のコピーを返却
     */
    toJSON(): object[];
    /**
     * @es Clone this instance.
     * @ja インスタンスの複製を返却
     *
     * @override
     */
    clone(): this;
    /**
     * @en Force a collection to re-sort itself.
     * @ja Collection 要素の再ソート
     *
     * @param options
     *  - `en` sort options.
     *  - `ja` ソートオプション
     */
    sort(options?: CollectionReSortOptions<TModel, TKey>): this;
    /**
     * @en Apply after-filter to collection itself.
     * @ja 絞り込み用フィルタの適用
     *
     * @param callback
     *  - `en` filter callback.
     *  - `ja` フィルタコールバック関数
     * @param options
     *  - `en` Silenceable options.
     *  - `ja` Silenceable オプション
     */
    filter(callback: FilterCallback<TModel> | undefined, options?: Silenceable): this;
    /**
     * @en Apply after-filter to collection itself.
     * @ja 絞り込み用フィルタの適用
     *
     * @param options
     *  - `en` after-filter options.
     *  - `ja` 絞り込みオプション
     */
    filter(options: CollectionAfterFilterOptions<TModel>): this;
    /**
     * @en Get the model at the given index. If negative value is given, the target will be found from the last index.
     * @ja インデックス指定による Model へのアクセス. 負値の場合は末尾検索を実行
     *
     * @param index
     *  - `en` A zero-based integer indicating which element to retrieve. <br>
     *         If negative index is counted from the end of the matched set.
     *  - `ja` 0 base のインデックスを指定 <br>
     *         負値が指定された場合, 末尾からのインデックスとして解釈される
     */
    at(index: number): TModel;
    /**
     * @en Get the first element of the model.
     * @ja Model の最初の要素を取得
     */
    first(): TModel | undefined;
    /**
     * @en Get the value of `count` elements of the model from the first.
     * @ja Model の先頭から`count` 分の要素を取得
     */
    first(count: number): TModel[];
    /**
     * @en Get the last element of the model.
     * @ja Model の最初の要素を取得
     */
    last(): TModel | undefined;
    /**
     * @en Get the value of `count` elements of the model from the last.
     * @ja Model の先頭から`count` 分の要素を取得
     */
    last(count: number): TModel[];
    /**
     * @en Converts a response into the hash of attributes to be `set` on the collection. The default implementation is just to pass the response along.
     * @ja レスポンスの変換メソッド. 既定では何もしない
     *
     * @override
     */
    protected parse(response: CollectionSeed | CollectionSeed[] | void, options?: CollectionSetOptions): TModel[] | CollectionSeed[] | undefined;
    /**
     * @en The [[fetch]] method proxy that is compatible with [[CollectionItemProvider]] returns one-shot result.
     * @ja [[CollectionItemProvider]] 互換の単発の fetch 結果を返却. 必要に応じてオーバーライド可能.
     *
     * @override
     *
     * @param options
     *  - `en` option object
     *  - `ja` オプション
     */
    protected sync(options?: CollectionItemQueryOptions<TModel, TKey>): Promise<CollectionItemQueryResult<object>>;
    /**
     * @en Fetch the [[Model]] from the server, merging the response with the model's local attributes.
     * @ja [[Model]] 属性のサーバー同期. レスポンスのマージを実行
     *
     * @param options
     *  - `en` fetch options.
     *  - `ja` フェッチオプション
     */
    fetch(options?: CollectionQueryOptions<TModel, TKey>): Promise<object[]>;
    /**
     * @en Execute `fetch()` with last query options.
     * @ja 前回と同条件で `fetch()` を実行
     *
     * @param options
     *  - `en` requery options.
     *  - `ja` リクエリオプション
     */
    requery(options?: CollectionRequeryOptions): Promise<object[]>;
    /**
     * @en "Smart" update method of the collection with the passed list of models.
     *       - if the model is already in the collection its attributes will be merged.
     *       - if the collection contains any models that aren't present in the list, they'll be removed.
     *       - All of the appropriate `@add`, `@remove`, and `@update` events are fired as this happens.
     * @ja Collection の汎用更新処理
     *       - 追加時にすでに Model が存在するときは、属性をマージ
     *       - 指定リストに存在しない Model は削除
     *       - 適切な `@add`, `@remove`, `@update` イベントを発生
     *
     * @param seed
     *  - `en` Nullish value.
     *  - `ja` Nullish 要素
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
     * @ja Collection の汎用更新処理
     *       - 追加時にすでに Model が存在するときは、属性をマージ
     *       - 指定リストに存在しない Model は削除
     *       - 適切な `@add`, `@remove`, `@update` イベントを発生
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` Model 要素を指定
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
     * @ja Collection の汎用更新処理
     *       - 追加時にすでに Model が存在するときは、属性をマージ
     *       - 指定リストに存在しない Model は削除
     *       - 適切な `@add`, `@remove`, `@update` イベントを発生
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` Model 要素の配列を指定
     * @param options
     *  - `en` set options.
     *  - `ja` 設定オプション
     */
    set(seeds: (TModel | CollectionSeed)[], options?: CollectionSetOptions): TModel[];
    /**
     * @en Replace a collection with a new list of models (or attribute hashes), triggering a single `reset` event on completion.
     * @ja Collection を新しい Model 一覧で置換. 完了時に `reset` イベントを発行
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` Model 要素の配列を指定
     * @param options
     *  - `en` reset options.
     *  - `ja` リセットオプション
     */
    reset(seeds?: (TModel | CollectionSeed)[], options?: CollectionOperationOptions): TModel[];
    /**
     * @en Add model to the collection.
     * @ja Collection への Model の追加
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` Model 要素を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    add(seed: TModel | UnknownObject, options?: CollectionAddOptions): TModel;
    /**
     * @en Add to the collection with the passed list of models.
     * @ja Model リスト指定による Collection への追加
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` Model 要素の配列を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    add(seeds: (TModel | CollectionSeed)[], options?: CollectionAddOptions): TModel[];
    /**
     * @en Remove a model from the set.
     * @ja Collection から Model を削除
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` Model 要素を指定
     * @param options
     *  - `en` remove options.
     *  - `ja` 削除オプション
     */
    remove(seed: TModel | UnknownObject, options?: CollectionOperationOptions): TModel;
    /**
     * @en Remove a list of models from the set.
     * @ja Model リスト指定による Collection からの削除
     *
     * @param seeds
     *  - `en` given the seed of model array.
     *  - `ja` Model 要素の配列を指定
     * @param options
     *  - `en` remove options.
     *  - `ja` 削除オプション
     */
    remove(seeds: (TModel | CollectionSeed)[], options?: CollectionOperationOptions): TModel[];
    /**
     * @en Add a model to the end of the collection.
     * @ja 末尾に Model を追加
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` Model 要素を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    push(seed: TModel | CollectionSeed, options?: CollectionAddOptions): TModel;
    /**
     * @en Remove a model from the end of the collection.
     * @ja 末尾の Model を削除
     *
     * @param options
     *  - `en` Silenceable options.
     *  - `ja` Silenceable オプション
     */
    pop(options?: Silenceable): TModel | undefined;
    /**
     * @en Add a model to the beginning of the collection.
     * @ja 先頭に Model を追加
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` Model 要素を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    unshift(seed: TModel | CollectionSeed, options?: CollectionAddOptions): TModel;
    /**
     * @en Remove a model from the beginning of the collection.
     * @ja 先頭の Model を削除
     *
     * @param options
     *  - `en` Silenceable options.
     *  - `ja` Silenceable オプション
     */
    shift(options?: Silenceable): TModel | undefined;
    /**
     * @en Create a new instance of a model in this collection.
     * @ja 新しい Model インスタンスを作成し, Collection に追加
     *
     * @param attrs
     *  - `en` attributes object.
     *  - `ja` 属性オブジェクトを指定
     * @param options
     *  - `en` model construction options.
     *  - `ja` Model 構築オプション
     */
    create(attrs: object, options?: ModelSaveOptions): TModel | undefined;
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
}
