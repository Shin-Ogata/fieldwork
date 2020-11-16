import {
    Constructor,
    Class,
    UnknownObject,
    PlainObject,
    Keys,
    isNil,
    isArray,
    isFunction,
    isString,
    noop,
    luid,
    at,
    setMixClassAttribute,
} from '@cdp/core-utils';
import {
    Silenceable,
    Subscribable,
    EventBroker,
    EventSource,
    EventPublisher,
} from '@cdp/events';
import {
    Result,
    RESULT_CODE,
    FAILED,
    makeResult,
} from '@cdp/result';
import { SyncContext, defaultSync } from '@cdp/data-sync';
import {
    Model,
    ModelConstructionOptions,
    ModelSaveOptions,
    isModel,
} from '@cdp/model';
import {
    SortCallback,
    FilterCallback,
    CollectionSortOptions,
    CollectionItemQueryResult,
    CollectionItemQueryOptions,
    CollectionItemProvider,
    CollectionQueryInfo,
    CollectionEvent,
    CollectionConstructionOptions,
    CollectionOperationOptions,
    CollectionAddOptions,
    CollectionSetOptions,
    CollectionReSortOptions,
    CollectionUpdateOptions,
    CollectionQueryOptions,
    CollectionRequeryOptions,
    CollectionAfterFilterOptions,
} from './interfaces';
import { convertSortKeys } from './utils';
import { searchItems, queryItems } from './query';

/** @internal */
const _properties             = Symbol('properties');
/** @internal */
const _createIterableIterator = Symbol('create-iterable-iterator');
/** @internal */
const _prepareModel           = Symbol('prepare-model');
/** @internal */
const _removeModels           = Symbol('remove-models');
/** @internal */
const _addReference           = Symbol('add-reference');
/** @internal */
const _removeReference        = Symbol('remove-reference');
/** @internal */
const _onModelEvent           = Symbol('model-event-handler');

/** @internal */
interface Property<T extends object, K extends Keys<T>> {
    readonly constructOptions: CollectionConstructionOptions<T, K>;
    readonly provider: CollectionItemProvider<T, K>;
    readonly cid: string;
    readonly queryOptions: CollectionItemQueryOptions<T, K>;
    queryInfo: CollectionQueryInfo<T, K>;
    readonly modelOptions: ModelConstructionOptions;
    readonly byId: Map<string, T>;
    store: T[];
    afterFilter?: FilterCallback<T>;
}

/** @internal reset model context */
const resetModelStore = <T extends object, K extends Keys<T>>(context: Property<T, K>): void => {
    context.byId.clear();
    context.store.length = 0;
};

/** @internal */
const ensureSortOptions = <T extends object, K extends Keys<T>>(options: CollectionSortOptions<T, K>): Required<CollectionSortOptions<T, K>> => {
    const { sortKeys: keys, comparators: comps } = options;
    return {
        sortKeys: keys || [],
        comparators: comps || convertSortKeys(keys || []),
    };
};

/** @internal */
const modelIdAttribute = <T extends object>(ctor: Constructor<T> | undefined): string => {
    return ctor?.['idAttribute'] || 'id';
};

/** @internal */
const getModelId = <T extends object>(attrs: T, ctor: Constructor<T> | undefined): string => {
    return attrs[modelIdAttribute(ctor)];
};

/** @internal */
const getChangedIds = <T extends object>(obj: object, ctor: Constructor<T> | undefined): { id: string; prevId?: string; } | undefined => {
    type ModelLike = { previous: (key: string) => string; };
    const model = obj as ModelLike;

    const idAttribute = modelIdAttribute(ctor);
    const id = model[idAttribute];
    if (!isString(id)) {
        return undefined;
    }

    return { id: model[idAttribute], prevId: isFunction(model.previous) ? model.previous(idAttribute) : undefined };
};

/** @internal */
const modelConstructor = <T extends object, E extends CollectionEvent<T>, K extends Keys<T>>(self: Collection<T, E, K>): Class | undefined => {
    return self.constructor['model'];
};

/** @internal */
const isCollectionModel = <T extends object, E extends CollectionEvent<T>, K extends Keys<T>>(x: unknown, self: Collection<T, E, K>): x is T => {
    const ctor = modelConstructor(self);
    return isFunction(ctor) ? x instanceof ctor : false;
};

/** @internal */
const spliceArray = <T>(target: T[], insert: T[], at: number): void => {
    at = Math.min(Math.max(at, 0), target.length);
    target.splice(at, 0, ...insert);
};

/** @internal */
function parseFilterArgs<T extends object>(...args: unknown[]): CollectionAfterFilterOptions<T> {
    const [filter, options] = args;
    if (null == filter) {
        return {};
    } else if (!isFunction(filter)) {
        return filter as CollectionAfterFilterOptions<T>;
    } else {
        return Object.assign({}, options, { filter }) as CollectionAfterFilterOptions<T>;
    }
}

/** @internal */
const _setOptions = { add: true, remove: true, merge: true };
/** @internal */
const _addOptions = { add: true, remove: false };

//__________________________________________________________________________________________________//

/**
 * @en Base class definition for collection that is ordered sets of models.
 * @ja モデルの集合を扱うコレクションの基底クラス定義.
 *
 * @example <br>
 *
 * ```ts
 * import { PlainObject } from '@cdp/core-utils';
 * import { Model, ModelConstructor } from '@cdp/model';
 * import {
 *     Collection,
 *     CollectionItemQueryOptions,
 *     CollectionItemQueryResult,
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
 *     protected parse(response: PlainObject[]): TrackAttribute[] {
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
export abstract class Collection<
    TModel extends object = any, // eslint-disable-line @typescript-eslint/no-explicit-any
    Event extends CollectionEvent<TModel> = CollectionEvent<TModel>,
    TKey extends Keys<TModel> = Keys<TModel>
> extends EventSource<Event> implements Iterable<TModel> {

    /**
     * @en Model constructor. <br>
     *     The constructor is used internally by this [[Collection]] class for [[TModel]] construction.
     * @ja モデルコンストラクタ <br>
     *     [[Collection]] クラスが [[TModel]] を構築するために使用する
     */
    static readonly model?: Class;

    /** @internal */
    private readonly [_properties]: Property<TModel, TKey>;

///////////////////////////////////////////////////////////////////////
// construction/destruction:

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
    constructor(seeds?: TModel[] | PlainObject[], options?: CollectionConstructionOptions<TModel, TKey>) {
        super();
        const opts = Object.assign({ modelOptions: {}, queryOptions: {} }, options);

        const { modelOptions, queryOptions } = opts;

        this[_properties] = {
            constructOptions: opts,
            provider: opts.provider || this.sync.bind(this),
            cid: luid('collection:', 8),
            queryOptions,
            queryInfo: {},
            modelOptions,
            byId: new Map<string, TModel>(),
            store: [],
        } as unknown as Property<TModel, TKey>;

        this.initQueryInfo();

        /* model event handler */
        this[_onModelEvent] = (event: string, model: TModel | undefined, collection: this, options: CollectionOperationOptions): void => {
            if (event.startsWith('@') && model) {
                if (('@add' === event || '@remove' === event) && collection !== this) {
                    return;
                }
                if ('@destroy' === event) {
                    // model event arguments adjustment.
                    options = (collection as any); // eslint-disable-line @typescript-eslint/no-explicit-any
                    collection = this;
                    this.remove(model, options);
                }
                if ('@change' === event) {
                    const ids = getChangedIds(model, modelConstructor(this));
                    if (ids) {
                        const { id, prevId } = ids;
                        if (prevId !== id) {
                            const { byId } = this[_properties];
                            byId.set(id, model);
                            if (null != prevId) {
                                byId.delete(prevId);
                            }
                        }
                    }
                }
                // delegate event
                this.trigger.call(this, event, model, collection, options); // eslint-disable-line no-useless-call
            }
        };

        if (seeds) {
            this.reset(seeds, Object.assign({ silent: true }, opts));
        }
    }

    /**
     * @ja Initialize query info
     * @ja クエリ情報の初期化
     */
    protected initQueryInfo(): void {
        const { sortKeys, comparators } = ensureSortOptions(this._defaultQueryOptions);
        this._queryInfo = { sortKeys, comparators };
    }

    /**
     * @en Released all instances and event listener under the management.
     * @ja 管理対象を破棄
     *
     * @param options
     *  - `en` options (reserved).
     *  - `ja` オプション (予約)
     */
    public release(options?: CollectionOperationOptions): this { // eslint-disable-line @typescript-eslint/no-unused-vars
        this[_properties].afterFilter = undefined;
        this[_properties].store = [];
        this.initQueryInfo();
        return this.stopListening();
    }

    /**
     * @ja Clear cache instance method
     * @ja キャッシュの破棄
     */
    protected clearCache(): void {
        delete this._queryInfo.cache;
    }

///////////////////////////////////////////////////////////////////////
// accessor: attributes

    /**
     * @en Get content ID.
     * @ja コンテント ID を取得
     */
    get id(): string {
        return this[_properties].cid;
    }

    /**
     * @en Get models.
     * @ja モデルアクセス
     */
    get models(): readonly TModel[] {
        const { _queryFilter, _afterFilter } = this;
        const { store } = this[_properties];
        return (_afterFilter && _afterFilter !== _queryFilter) ? store.filter(_afterFilter) : store;
    }

    /**
     * @en number of models.
     * @ja 内包するモデル数
     */
    get length(): number {
        return this.models.length;
    }

    /**
     * @en Check applied after-filter.
     * @ja 絞り込み用フィルタが適用されているかを判定
     */
    get filtered(): boolean {
        return !!this[_properties].afterFilter;
    }

    /**
     * @en [[CollectionQueryInfo]] instance
     * @ja [[CollectionQueryInfo]] を格納するインスタンス
     */
    protected get _queryInfo(): CollectionQueryInfo<TModel, TKey> {
        return this[_properties].queryInfo;
    }

    /**
     * @en [[CollectionQueryInfo]] instance
     * @ja [[CollectionQueryInfo]] を格納するインスタンス
     */
    protected set _queryInfo(val: CollectionQueryInfo<TModel, TKey>) {
        this[_properties].queryInfo = val;
    }

    /**
     * @en Get creating options.
     * @ja 構築時のオプションを取得
     */
    protected get _options(): CollectionConstructionOptions<TModel, TKey> {
        return this[_properties].constructOptions;
    }

    /**
     * @en Get default provider.
     * @ja 既定のプロバイダを取得
     */
    protected get _provider(): CollectionItemProvider<TModel, TKey> {
        return this[_properties].provider;
    }

    /**
     * @en Get default parse behaviour.
     * @ja 既定の parse 動作を取得
     */
    protected get _defaultParse(): boolean | undefined {
        return this._options.parse;
    }

    /**
     * @en Get default query options.
     * @ja 既定のクエリオプションを取得
     */
    protected get _defaultQueryOptions(): CollectionItemQueryOptions<TModel, TKey> {
        return this[_properties].queryOptions;
    }

    /**
     * @en Get last query options.
     * @ja 最後のクエリオプションを取得
     */
    protected get _lastQueryOptions(): CollectionItemQueryOptions<TModel, TKey> {
        const { sortKeys, comparators, filter } = this[_properties].queryInfo;
        const opts: CollectionItemQueryOptions<TModel, TKey> = {};

        sortKeys.length && (opts.sortKeys = sortKeys);
        comparators.length && (opts.comparators = comparators);
        filter && (opts.filter = filter);

        return opts;
    }

    /**
     * @en Access to sort comparators.
     * @ja ソート用比較関数へのアクセス
     */
    protected get _comparators(): SortCallback<TModel>[] {
        return this[_properties].queryInfo.comparators;
    }

    /**
     * @en Access to query-filter.
     * @ja クエリ用フィルタ関数へのアクセス
     */
    protected get _queryFilter(): FilterCallback<TModel> | undefined {
        return this[_properties].queryInfo.filter;
    }

    /**
     * @en Access to after-filter.
     * @ja 絞り込み用フィルタ関数へのアクセス
     */
    protected get _afterFilter(): FilterCallback<TModel> | undefined {
        return this[_properties].afterFilter;
    }

///////////////////////////////////////////////////////////////////////
// operations: utils

    /**
     * @en Get a model from a collection, specified by an `id`, a `cid`, or by passing in a model instance.
     * @ja `id`, `cid` およびインスタンスからモデルを特定
     *
     * @param seed
     *  - `en` `id`, a `cid`, or by passing in a model instance
     *  - `ja`  `id`, `cid` およびインスタンス
     */
    public get(seed: string | object | undefined): TModel | undefined {
        if (null == seed) {
            return undefined;
        }

        const { byId } = this[_properties];
        if (isString(seed) && byId.has(seed)) {
            return byId.get(seed);
        }

        const id = getModelId(isModel(seed) ? seed.toJSON() : seed as object, modelConstructor(this));
        const cid = (seed as object as { _cid?: string; })._cid;

        return byId.get(id) || (cid && byId.get(cid)) as TModel | undefined;
    }

    /**
     * @en Returns `true` if the model is in the collection by an `id`, a `cid`, or by passing in a model instance.
     * @ja `id`, `cid` およびインスタンスからモデルを所有しているか判定
     *
     * @param seed
     *  - `en` `id`, a `cid`, or by passing in a model instance
     *  - `ja`  `id`, `cid` およびインスタンス
     */
    public has(seed: string | object | undefined): boolean {
        return null != this.get(seed);
    }

    /**
     * @en Return a copy of the model's `attributes` object.
     * @ja モデル属性値のコピーを返却
     */
    public toJSON(): object[] {
        return this.models.map(m => isModel(m) ? m.toJSON() : m);
    }

    /**
     * @es Clone this instance.
     * @ja インスタンスの複製を返却
     *
     * @override
     */
    public clone(): this {
        const { constructor, _options } = this;
        return new (constructor as Constructor<this>)(this[_properties].store, _options);
    }

    /**
     * @en Force a collection to re-sort itself.
     * @ja コレクション要素の再ソート
     *
     * @param options
     *  - `en` sort options.
     *  - `ja` ソートオプション
     */
    public sort(options?: CollectionReSortOptions<TModel, TKey>): this {
        const opts = options || {};
        const { noThrow, silent } = opts;
        const { sortKeys, comparators: comps } = ensureSortOptions(opts);
        const comparators = 0 < comps.length ? comps : this._comparators;

        if (comparators.length <= 0) {
            if (noThrow) {
                return this;
            }
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_COMPARATORS, 'Cannot sort a set without a comparator.');
        }

        this[_properties].store = searchItems(this[_properties].store, this._afterFilter, ...comparators);

        // update queryInfo
        this[_properties].queryInfo.comparators = comparators;
        if (0 < sortKeys.length) {
            this[_properties].queryInfo.sortKeys = sortKeys;
        }

        if (!silent) {
            (this as Collection).trigger('@sort', this as Collection, opts);
        }

        return this;
    }

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
    public filter(callback: FilterCallback<TModel> | undefined, options?: Silenceable): this;

    /**
     * @en Apply after-filter to collection itself.
     * @ja 絞り込み用フィルタの適用
     *
     * @param options
     *  - `en` after-filter options.
     *  - `ja` 絞り込みオプション
     */
    public filter(options: CollectionAfterFilterOptions<TModel>): this;

    public filter(...args: unknown[]): this {
        const opts = parseFilterArgs(...args);
        const { filter, silent } = opts;
        if (filter !== this[_properties].afterFilter) {
            this[_properties].afterFilter = filter;
            if (!silent) {
                (this as Collection).trigger('@filter', this as Collection, opts);
            }
        }
        return this;
    }

    /**
     * @en Get the model at the given index. If negative value is given, the target will be found from the last index.
     * @ja インデックス指定によるモデルへのアクセス. 負値の場合は末尾検索を実行
     *
     * @param index
     *  - `en` A zero-based integer indicating which element to retrieve. <br>
     *         If negative index is counted from the end of the matched set.
     *  - `ja` 0 base のインデックスを指定 <br>
     *         負値が指定された場合, 末尾からのインデックスとして解釈される
     */
    public at(index: number): TModel {
        return at(this.models as TModel[], index);
    }

    /**
     * @en Get the first element of the model.
     * @ja モデルの最初の要素を取得
     */
    public first(): TModel | undefined;

    /**
     * @en Get the value of `count` elements of the model from the first.
     * @ja モデルの先頭から`count` 分の要素を取得
     */
    public first(count: number): TModel[];

    public first(count?: number): TModel | TModel[] | undefined {
        const targets = this.models;
        if (null == count) {
            return targets[0];
        } else {
            return targets.slice(0, count);
        }
    }

    /**
     * @en Get the last element of the model.
     * @ja モデルの最初の要素を取得
     */
    public last(): TModel | undefined;

    /**
     * @en Get the value of `count` elements of the model from the last.
     * @ja モデルの先頭から`count` 分の要素を取得
     */
    public last(count: number): TModel[];

    public last(count?: number): TModel | TModel[] | undefined {
        const targets = this.models;
        if (null == count) {
            return targets[targets.length - 1];
        } else {
            return targets.slice(-1 * count);
        }
    }

///////////////////////////////////////////////////////////////////////
// operations: sync

    /**
     * @en Converts a response into the hash of attributes to be `set` on the collection. The default implementation is just to pass the response along.
     * @ja レスポンスの変換メソッド. 既定では何もしない
     *
     * @override
     */
    protected parse(response: PlainObject | void, options?: CollectionSetOptions): TModel[] | PlainObject[] | undefined { // eslint-disable-line @typescript-eslint/no-unused-vars
        return response as TModel[];
    }

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
    protected async sync(options?: CollectionItemQueryOptions<TModel, TKey>): Promise<CollectionItemQueryResult<object>> {
        const items = await defaultSync().sync('read', this as SyncContext, options) as TModel[];
        return {
            total: items.length,
            items,
            options,
        } as CollectionItemQueryResult<object>;
    }

    /**
     * @en Fetch the [[Model]] from the server, merging the response with the model's local attributes.
     * @ja [[Model]] 属性のサーバー同期. レスポンスのマージを実行
     *
     * @param options
     *  - `en` fetch options.
     *  - `ja` フェッチオプション
     */
    public async fetch(options?: CollectionQueryOptions<TModel, TKey>): Promise<object[]> {
        const opts = Object.assign({ progress: noop }, this._defaultQueryOptions, options);

        try {
            const { progress: original, limit, reset, noCache } = opts;
            const { _queryInfo, _provider } = this;
            const finalize = (null == limit);

            opts.progress = (info: CollectionItemQueryResult<TModel>) => {
                original(info);
                !finalize && this.add(info.items, opts);
            };

            if (noCache) {
                this.clearCache();
            }

            if (!finalize && reset) {
                this.reset(undefined, { silent: true });
            }

            const resp = await queryItems(_queryInfo, _provider, opts);

            if (finalize) {
                reset ? this.reset(resp, opts) : this.add(resp, opts);
            }

            (this as Collection).trigger('@sync', this as Collection, resp, opts);
            return resp;
        } catch (e) {
            (this as Collection).trigger('@error', undefined, this as Collection, e, opts);
            throw e;
        }
    }

    /**
     * @en Execute `fetch()` with last query options.
     * @ja 前回と同条件で `fetch()` を実行
     *
     * @param options
     *  - `en` requery options.
     *  - `ja` リクエリオプション
     */
    public requery(options?: CollectionRequeryOptions): Promise<object[]> {
        const opts = Object.assign({}, this._lastQueryOptions, options, { reset: true });
        return this.fetch(opts);
    }

///////////////////////////////////////////////////////////////////////
// operations: collection setup

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
    public set(seed: undefined, options?: CollectionSetOptions): void;

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
    public set(seed: TModel | UnknownObject, options?: CollectionSetOptions): TModel;

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
    public set(seeds: (TModel | PlainObject)[], options?: CollectionSetOptions): TModel[];

    public set(seeds?: TModel | UnknownObject | (TModel | PlainObject)[], options?: CollectionSetOptions): TModel | TModel[] | void {
        if (isNil(seeds)) {
            return;
        }

        const opts = Object.assign({ parse: this._defaultParse }, _setOptions, options) as CollectionUpdateOptions<TModel>;
        if (opts.parse && !isCollectionModel(seeds, this)) {
            seeds = this.parse(seeds, options) || [];
        }

        const singular = !isArray(seeds);
        const items: (TModel | object | undefined)[] = singular ? [seeds] : (seeds as object[]).slice();

        const { store } = this[_properties];

        const at = ((candidate): number | void => {
            if (null != candidate) {
                if (candidate > store.length) {
                    return store.length;
                }
                if (candidate < 0) {
                    candidate += store.length;
                    return (candidate < 0) ? 0 : candidate;
                }
                return candidate;
            }
        })(opts.at);

        const set: object[]      = [];
        const toAdd: TModel[]    = [];
        const toMerge: TModel[]  = [];
        const toRemove: TModel[] = [];
        const modelSet = new Set<object>();

        const { add, merge, remove, parse, silent } = opts;

        let sort = false;
        const sortable = this._comparators.length && null == at && false !== opts.sort;

        type ModelFeature = {
            parse: (atrr?: object, options?: object) => object;
            setAttributes: (atrr: object, options?: object) => void;
            hasChanged: () => boolean;
        };

        // Turn bare objects into model references, and prevent invalid models from being added.
        for (const [i, item] of items.entries()) {
            // If a duplicate is found, prevent it from being added and optionally merge it into the existing model.
            const existing = this.get(item) as ModelFeature;
            if (existing) {
                if (merge && item !== existing) {
                    let attrs = isModel(item) ? item.toJSON() : item;
                    if (parse && isFunction(existing.parse)) {
                        attrs = existing.parse(attrs, opts);
                    }

                    if (isFunction(existing.setAttributes)) {
                        existing.setAttributes(attrs, opts);
                    } else {
                        Object.assign(existing, attrs);
                    }

                    toMerge.push(existing as TModel);
                    if (sortable && !sort) {
                        sort = isFunction(existing.hasChanged) ? existing.hasChanged() : true;
                    }
                }
                if (!modelSet.has(existing)) {
                    modelSet.add(existing);
                    set.push(existing);
                }
                items[i] = existing;
            } // eslint-disable-line brace-style

            // If this is a new, valid model, push it to the `toAdd` list.
            else if (add) {
                const model = items[i] = this[_prepareModel](item, opts);
                if (model) {
                    toAdd.push(model);
                    this[_addReference](model);
                    modelSet.add(model);
                    set.push(model);
                }
            }
        }

        // Remove stale models.
        if (remove) {
            for (const model of store) {
                if (!modelSet.has(model)) {
                    toRemove.push(model);
                }
            }
            if (toRemove.length) {
                this[_removeModels](toRemove, opts);
            }
        }

        // See if sorting is needed, update `length` and splice in new models.
        let orderChanged = false;
        const replace = !sortable && add && remove;
        if (set.length && replace) {
            orderChanged = (store.length !== set.length) || store.some((m, index) => m !== set[index]);
            store.length = 0;
            spliceArray(store, set, 0);
        } else if (toAdd.length) {
            if (sortable) {
                sort = true;
            }
            spliceArray(store, toAdd, null == at ? store.length : at);
        }

        // Silently sort the collection if appropriate.
        if (sort) {
            this.sort({ silent: true });
        }

        // Unless silenced, it's time to fire all appropriate add/sort/update events.
        if (!silent) {
            for (const [i, model] of toAdd.entries()) {
                if (null != at) {
                    opts.index = at + i;
                }
                if (isModel(model) || (model instanceof EventBroker)) {
                    (model as Model).trigger('@add', model as Model, this, opts);
                } else {
                    (this as Collection).trigger('@add', model, this as Collection, opts);
                }
            }
            if (sort || orderChanged) {
                (this as Collection).trigger('@sort', this as Collection, opts);
            }
            if (toAdd.length || toRemove.length || toMerge.length) {
                opts.changes = {
                    added: toAdd,
                    removed: toRemove,
                    merged: toMerge
                };
                (this as Collection).trigger('@update', this as Collection, opts);
            }
        }

        // drop undefined
        const retval = items.filter(i => null != i) as TModel[];

        // Return the added (or merged) model (or models).
        return singular ? retval[0] : (retval.length ? retval : void 0);
    }

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
    public reset(seeds?: (TModel | PlainObject)[], options?: CollectionOperationOptions): TModel[] {
        const opts = Object.assign({}, options) as CollectionOperationOptions & { previous: TModel[]; };
        const { store } = this[_properties];
        for (const model of store) {
            this[_removeReference](model);
        }

        opts.previous = store.slice();
        resetModelStore(this[_properties]);

        const models = seeds ? this.add(seeds, Object.assign({ silent: true }, opts)) : [];

        if (!opts.silent) {
            (this as Collection).trigger('@reset', this as Collection, opts);
        }

        return models;
    }

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
    public add(seed: TModel | UnknownObject, options?: CollectionAddOptions): TModel;

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
    public add(seeds: (TModel | PlainObject)[], options?: CollectionAddOptions): TModel[];

    public add(seeds: TModel | UnknownObject | (TModel | PlainObject)[], options?: CollectionAddOptions): TModel | TModel[] {
        return this.set(seeds as UnknownObject, Object.assign({ merge: false }, options, _addOptions));
    }

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
    public remove(seed: TModel | UnknownObject, options?: CollectionOperationOptions): TModel;

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
    public remove(seeds: (TModel | PlainObject)[], options?: CollectionOperationOptions): TModel[];

    public remove(seeds: TModel | UnknownObject | (TModel | PlainObject)[], options?: CollectionOperationOptions): TModel | TModel[] | undefined {
        const opts = Object.assign({}, options) as CollectionUpdateOptions<TModel>;
        const singular = !isArray(seeds);
        const items = singular ? [seeds as TModel] : (seeds as TModel[]).slice();
        const removed = this[_removeModels](items, opts);
        if (!opts.silent && removed.length) {
            opts.changes = { added: [], merged: [], removed };
            (this as Collection).trigger('@update', this as Collection, opts);
        }
        return singular ? removed[0] : removed;
    }

    /**
     * @en Add a model to the end of the collection.
     * @ja 末尾にモデルを追加
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` モデル要素を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    public push(seed: TModel | PlainObject, options?: CollectionAddOptions): TModel {
        const { store } = this[_properties];
        return this.add(seed, Object.assign({ at: store.length }, options));
    }

    /**
     * @en Remove a model from the end of the collection.
     * @ja 末尾のモデルを削除
     *
     * @param options
     *  - `en` Silenceable options.
     *  - `ja` Silenceable オプション
     */
    public pop(options?: Silenceable): TModel | undefined {
        const { store } = this[_properties];
        return this.remove(store[store.length - 1], options);
    }

    /**
     * @en Add a model to the beginning of the collection.
     * @ja 先頭にモデルを追加
     *
     * @param seed
     *  - `en` given the seed of model.
     *  - `ja` モデル要素を指定
     * @param options
     *  - `en` add options.
     *  - `ja` 追加オプション
     */
    public unshift(seed: TModel | PlainObject, options?: CollectionAddOptions): TModel {
        return this.add(seed, Object.assign({ at: 0 }, options));
    }

    /**
     * @en Remove a model from the beginning of the collection.
     * @ja 先頭のモデルを削除
     *
     * @param options
     *  - `en` Silenceable options.
     *  - `ja` Silenceable オプション
     */
    public shift(options?: Silenceable): TModel | undefined {
        const { store } = this[_properties];
        return this.remove(store[0], options);
    }

    /**
     * @en Create a new instance of a model in this collection.
     * @ja 新しいモデルインスタンスを作成し, コレクションに追加
     *
     * @param attrs
     *  - `en` attributes object.
     *  - `ja` 属性オブジェクトを指定
     * @param options
     *  - `en` model construction options.
     *  - `ja` モデル構築オプション
     */
    public create(attrs: object, options?: ModelSaveOptions): TModel | undefined {
        const { wait } = options || {};
        const seed = this[_prepareModel](attrs, options as Silenceable);
        if (!seed) {
            return undefined;
        }

        const model = isModel(seed) ? seed : undefined;
        if (!wait || !model) {
            this.add(seed, options);
        }

        if (model) {
            void (async () => {
                try {
                    await model.save(undefined, options);
                    if (wait) {
                        this.add(seed, options);
                    }
                } catch (e) {
                    (this as Collection).trigger('@error', model, this as Collection, e, options);
                }
            })();
        }

        return seed;
    }

    /** @internal model preparation */
    private [_prepareModel](attrs: object | TModel | undefined, options: CollectionOperationOptions): TModel | undefined {
        if (isCollectionModel(attrs, this)) {
            return attrs;
        }

        const constructor = modelConstructor(this);
        const { modelOptions } = this[_properties];
        if (constructor) {
            const opts = Object.assign({}, modelOptions, options);
            const model = new constructor(attrs, opts) as { validate: () => Result; };
            if (isFunction(model.validate)) {
                const result = model.validate();
                if (FAILED(result.code)) {
                    (this as Collection).trigger('@invalid', attrs as Model, this as Collection, result, opts);
                    return undefined;
                }
            }
            return model as TModel;
        }

        // plain object
        return attrs as TModel;
    }

    /** @internal Internal method called by both remove and set. */
    private [_removeModels](models: TModel[], options: CollectionSetOptions): TModel[] {
        const opts = Object.assign({}, options) as CollectionUpdateOptions<TModel>;
        const removed: TModel[] = [];
        for (const mdl of models) {
            const model = this.get(mdl);
            if (!model) {
                continue;
            }

            const { store } = this[_properties];
            const index = store.indexOf(model);
            store.splice(index, 1);

            // Remove references before triggering 'remove' event to prevent an infinite loop.
            this[_removeReference](model, true);

            if (!opts.silent) {
                opts.index = index;
                if (isModel(model) || (model instanceof EventBroker)) {
                    (model as Model).trigger('@remove', model as Model, this, opts);
                } else {
                    (this as Collection).trigger('@remove', model, this as Collection, opts);
                }
            }

            removed.push(model);
            this[_removeReference](model, false);
        }
        return removed;
    }

    /** @internal Internal method to create a model's ties to a collection. */
    private [_addReference](model: TModel): void {
        const { byId } = this[_properties];
        const { _cid, id } = model as { _cid: string; id: string; };
        if (null != _cid) {
            byId.set(_cid, model);
        }
        if (null != id) {
            byId.set(id, model);
        }
        if (isModel(model) || (model instanceof EventPublisher)) {
            this.listenTo(model as Subscribable, '*', this[_onModelEvent]);
        }
    }

    /** @internal Internal method to sever a model's ties to a collection. */
    private [_removeReference](model: TModel, partial = false): void {
        const { byId } = this[_properties];
        const { _cid, id } = model as { _cid: string; id: string; };
        if (null != _cid) {
            byId.delete(_cid);
        }
        if (null != id) {
            byId.delete(id);
        }
        if (!partial && (isModel(model) || (model instanceof EventPublisher))) {
            this.stopListening(model as Subscribable, '*', this[_onModelEvent]);
        }
    }

///////////////////////////////////////////////////////////////////////
// implements: Iterable<TModel>

    /**
     * @en Iterator of [[ElementBase]] values in the array.
     * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
     */
    [Symbol.iterator](): Iterator<TModel> {
        const iterator = {
            base: this.models,
            pointer: 0,
            next(): IteratorResult<TModel> {
                if (this.pointer < this.base.length) {
                    return {
                        done: false,
                        value: this.base[this.pointer++],
                    };
                } else {
                    return {
                        done: true,
                        value: undefined!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    };
                }
            },
        };
        return iterator as Iterator<TModel>;
    }

    /**
     * @en Returns an iterable of key(id), value(model) pairs for every entry in the array.
     * @ja key(id), value(model) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    entries(): IterableIterator<[string, TModel]> {
        return this[_createIterableIterator]((key: string, value: TModel) => [key, value]);
    }

    /**
     * @en Returns an iterable of keys(id) in the array.
     * @ja key(id) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    keys(): IterableIterator<string> {
        return this[_createIterableIterator]((key: string) => key);
    }

    /**
     * @en Returns an iterable of values([[ElementBase]]) in the array.
     * @ja values([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    values(): IterableIterator<TModel> {
        return this[_createIterableIterator]((key: string, value: TModel) => value);
    }

    /** @internal common iterator create function */
    private [_createIterableIterator]<R>(valueGenerator: (key: string, value: TModel) => R): IterableIterator<R> {
        const context = {
            base: this.models,
            pointer: 0,
        };

        const pos2key = (pos: number): string => {
            return getModelId(context.base[pos], modelConstructor(this)) || String(pos);
        };

        const iterator: IterableIterator<R> = {
            next(): IteratorResult<R> {
                const current = context.pointer;
                if (current < context.base.length) {
                    context.pointer++;
                    return {
                        done: false,
                        value: valueGenerator(pos2key(current), context.base[current]),
                    };
                } else {
                    return {
                        done: true,
                        value: undefined!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    };
                }
            },
            [Symbol.iterator](): IterableIterator<R> {
                return this;
            },
        };

        return iterator;
    }
}

// mixin による `instanceof` は無効に設定
setMixClassAttribute(Collection as Class, 'instanceOf', null);
