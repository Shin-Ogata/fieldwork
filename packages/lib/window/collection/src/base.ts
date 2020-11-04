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
    luid,
    setMixClassAttribute,
} from '@cdp/core-utils';
import {
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
import {
    Model,
    ModelConstructionOptions,
    isModel,
} from '@cdp/model';
import {
    SortCallback,
    CollectionSortOptions,
    CollectionQueryInfo,
    CollectionEvent,
    CollectionConstructionOptions,
    CollectionQueryOptions,
    CollectionOperationOptions,
    CollectionAddOptions,
    CollectionSetOptions,
    CollectionReSortOptions,
    CollectionUpdateOptions,
} from './interfaces';
import { convertSortKeys } from './utils';
import { searchItems } from './query';

const _properties             = Symbol('properties');
const _createIterableIterator = Symbol('create-iterable-iterator');
const _prepareModel           = Symbol('prepare-model');
const _removeModels           = Symbol('remove-models');
const _addReference           = Symbol('add-reference');
const _removeReference        = Symbol('remove-reference');
const _onModelEvent           = Symbol('model-event-handler');

/** @internal */
interface Property<T extends object, K extends Keys<T>> {
    readonly cid: string;
    readonly defaultQueryOptions?: CollectionQueryOptions<T, K>;
    queryInfo: CollectionQueryInfo<T, K>;
    readonly defaultModelOptions?: ModelConstructionOptions;
    readonly byId: Map<string, T>;
    store: T[];
}

/** @internal reset model context */
const resetModelStore = <T extends object, K extends Keys<T>>(context: Property<T, K>): void => {
    context.byId.clear();
    context.store.length = 0;
};

/** @internal */
const ensureSortOptions = <T extends object, K extends Keys<T>>(options?: CollectionSortOptions<T, K>): Required<CollectionSortOptions<T, K>> => {
    const { sortKeys: keys, comparators: comps } = options || {};
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

const _setOptions = { add: true, remove: true, merge: true };
const _addOptions = { add: true, remove: false };

//__________________________________________________________________________________________________//

/**
 * @en Base class definition for object collection.
 * @ja オブジェクトの集合を扱う基底クラス定義
 *
 * TODO:
 */
export abstract class Collection<TModel extends object = object, Event extends CollectionEvent<TModel> = CollectionEvent<TModel>, TKey extends Keys<TModel> = Keys<TModel>>
    extends EventSource<Event>
    implements Iterable<TModel> {

    /**
     * @en Model constructor. <br>
     *     The constructor is used internally by this [[Collection]] class for [[TModel]] construction.
     * @ja モデルコンストラクタ <br>
     *     [[Collection]] クラスが [[TModel]] を構築するために使用する
     */
    static readonly model?: Class;

    /** @internal */
    private readonly [_properties]: Property<TModel, TKey>;

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
    constructor(seeds?: TModel[] | PlainObject[], options?: CollectionConstructionOptions<TModel>) {
        super();
        const opts = Object.assign({}, options);

        const { modelOptions, queryOptions } = opts;

        this[_properties] = {
            cid: luid('collection:', 8),
            defaultQueryOptions: queryOptions as CollectionQueryOptions<TModel, TKey>,
            queryInfo: {} as CollectionQueryInfo<TModel, TKey>,
            defaultModelOptions: modelOptions,
            byId: new Map<string, TModel>(),
            store: [],
        } as Property<TModel, TKey>;
        this._queryInfo = this.initQueryInfo();


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
            }
            // delegate event
            this.trigger.call(this, event, model, collection, options); // eslint-disable-line no-useless-call
        };

        if (seeds) {
            this.reset(seeds, Object.assign({ silent: true }, opts));
        }
    }

///////////////////////////////////////////////////////////////////////
// accessor: public properties

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
    get models(): TModel[] {
        return this[_properties].store;
    }

    /**
     * @en number of models.
     * @ja 内包するモデル数
     */
    get length(): number {
        return this[_properties].store.length;
    }

///////////////////////////////////////////////////////////////////////
// implements: Iterable<TModel>

    /**
     * @en Iterator of [[ElementBase]] values in the array.
     * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
     */
    [Symbol.iterator](): Iterator<TModel> {
        const iterator = {
            base: this[_properties].store,
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
            base: this[_properties].store,
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

///////////////////////////////////////////////////////////////////////
// accessor: protected query-info

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
     * @en Initialize [[CollectionQueryInfo]].
     * @ja [[CollectionQueryInfo]] の初期化
     *
     * @override
     */
    protected initQueryInfo(): CollectionQueryInfo<TModel, TKey> {
        return ensureSortOptions(this[_properties].defaultQueryOptions);
    }

///////////////////////////////////////////////////////////////////////
// operation: general

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

///////////////////////////////////////////////////////////////////////
// operations: collection setup

    /**
     * @en Access to sort comparators.
     * @ja ソート用比較関数へのアクセス
     */
    protected get _comparators(): SortCallback<TModel>[] {
        return this[_properties].queryInfo.comparators;
    }

    /**
     * @en Force a collection to re-sort itself.
     * @ja コレクション要素の再ソート
     */
    public sort(options?: CollectionReSortOptions<TModel, TKey>): this {
        const opts = options || {};
        const { sortKeys, comparators: comps } = ensureSortOptions(opts);
        const comparators = 0 < comps.length ? comps : this._comparators;

        if (comparators.length <= 0) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_COMPARATORS, 'Cannot sort a set without a comparator.');
        }

        this[_properties].store = searchItems(this[_properties].store, null, ...comparators);

        // update queryInfo
        this[_properties].queryInfo.comparators = comparators;
        if (0 < sortKeys.length) {
            this[_properties].queryInfo.sortKeys = sortKeys;
        }

        if (!opts.silent) {
            type Context = Collection<TModel>;
            (this as Context).trigger('@sort', this as Context, opts);
        }

        return this;
    }

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

        const opts = Object.assign({}, _setOptions, options) as CollectionUpdateOptions<TModel>;
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
            type Context = Collection<TModel>;
            for (const [i, model] of toAdd.entries()) {
                if (null != at) {
                    opts.index = at + i;
                }
                if (isModel(model) || (model instanceof EventBroker)) {
                    (model as Model).trigger('@add', model as Model, this, opts);
                } else {
                    (this as Context).trigger('@add', model, this as Context, opts);
                }
            }
            if (sort || orderChanged) {
                (this as Context).trigger('@sort', this as Context, opts);
            }
            if (toAdd.length || toRemove.length || toMerge.length) {
                opts.changes = {
                    added: toAdd,
                    removed: toRemove,
                    merged: toMerge
                };
                (this as Context).trigger('@update', this as Context, opts);
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
            type Context = Collection<TModel>;
            (this as Context).trigger('@reset', this as Context, opts);
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

    public remove(seeds: TModel | UnknownObject | (TModel | PlainObject)[], options?: CollectionOperationOptions): TModel | TModel[] {
        const opts = Object.assign({}, options) as CollectionUpdateOptions<TModel>;
        const singular = !isArray(seeds);
        const items = singular ? [seeds as TModel] : (seeds as TModel[]).slice();
        const removed = this[_removeModels](items, opts);
        if (!opts.silent && removed.length) {
            opts.changes = { added: [], merged: [], removed };
            type Context = Collection<TModel>;
            (this as Context).trigger('@update', this as Context, opts);
        }
        return singular ? removed[0] : removed;
    }

    /** @internal model preparation */
    private [_prepareModel](attrs: object | TModel | undefined, options: CollectionOperationOptions): TModel | undefined {
        if (isCollectionModel(attrs, this)) {
            return attrs;
        }

        const constructor = modelConstructor(this);
        const { defaultModelOptions } = this[_properties];
        if (constructor) {
            const opts = Object.assign({}, defaultModelOptions, options);
            const model = new constructor(attrs, opts) as { validate: () => Result; };
            if (isFunction(model.validate)) {
                const result = model.validate();
                if (FAILED(result.code)) {
                    type Context = Collection<TModel>;
                    (this as Context).trigger('@invalid', attrs as TModel, this as Context, result, opts);
                    return undefined;
                }
            }
            return model as TModel;
        }

        // plain object
        return attrs as TModel;
    }

    /** @ineternal Internal method called by both remove and set. */
    private [_removeModels](models: TModel[], options: CollectionSetOptions): TModel[] {
        const opts = Object.assign({}, options);
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
                    type Context = Collection<TModel>;
                    (this as Context).trigger('@remove', model, this as Context, opts);
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
}

// mixin による `instanceof` は無効に設定
setMixClassAttribute(Collection as Class, 'instanceOf', null);

/*
 ☆ id
 ☆ models/items
 ☆ length
 ★ release()
 ★ fetch()

 ★ - ListEditable<T> をどうするか?

 ★ url: string | (() => string);

 ★ without(...values: TModel[]): TModel[];

 ☆ add(model: {}|TModel, options?: AddOptions): TModel;
 ☆ add(models: ({}|TModel)[], options?: AddOptions): TModel[];
 ★ at(index: number): TModel;
 ☆ get(id: number | string | Model): TModel;
 ★ has(key: number | string | Model): boolean;
 ★ clone(): this;
 ★ create(attributes: any, options ?: ModelSaveOptions): TModel;
 ★ pluck(attribute: string): any[];
 ★ push(model: TModel, options ?: AddOptions): TModel;
 ★ pop(options ?: Silenceable): TModel;
 ☆ remove(model: {} | TModel, options ?: Silenceable): TModel;
 ☆ remove(models: ({} | TModel)[], options ?: Silenceable): TModel[];
 ☆ reset(models ?: TModel[], options ?: Silenceable): TModel[];
 ☆ set(models ?: TModel[], options ?: CollectionSetOptions): TModel[];
 ★ shift(options ?: Silenceable): TModel;
 ☆ sort(options ?: Silenceable): Collection<TModel>;
 ★ unshift(model: TModel, options ?: AddOptions): TModel;
 ★ where(properties: any): TModel[];
 ★ findWhere(properties: any): TModel;
 ★ modelId(attrs: any) : any
 ★ slice(min?: number, max?: number): TModel[];

 // mixins from underscore (基本やらない)

 ★ all(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
 ★ any(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
 ★ chain(): any;
 ★ collect<TResult>(iterator: _.ListIterator<TModel, TResult>, context?: any): TResult[];
 ★ contains(value: TModel): boolean;
 ★ countBy(iterator?: _.ListIterator<TModel, any>): _.Dictionary<number>;
 ★ countBy(iterator: string): _.Dictionary<number>;
 ★ detect(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel;
 ★ difference(others: TModel[]): TModel[];
 ★ drop(n?: number): TModel[];
 ★ each(iterator: _.ListIterator<TModel, void>, context?: any): TModel[];
 ★ every(iterator: _.ListIterator<TModel, boolean>, context?: any): boolean;
 ★ filter(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
 ★ find(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel;
 ★ findIndex(predicate: _.ListIterator<TModel, boolean>, context?: any): number;
 ★ findLastIndex(predicate: _.ListIterator<TModel, boolean>, context?: any): number;
 ★ first(): TModel;
 ★ first(n: number): TModel[];
 ★ foldl<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
 ★ foldr<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
 ★ forEach(iterator: _.ListIterator<TModel, void>, context?: any): TModel[];
 ★ groupBy(iterator: _.ListIterator<TModel, any>, context?: any): _.Dictionary<TModel[]>;
 ★ groupBy(iterator: string, context?: any): _.Dictionary<TModel[]>;
 ★ head(): TModel;
 ★ head(n: number): TModel[];
 ★ include(value: TModel): boolean;
 ★ includes(value: TModel): boolean;
 ★ indexBy(iterator: _.ListIterator<TModel, any>, context?: any): _.Dictionary<TModel>;
 ★ indexBy(iterator: string, context?: any): _.Dictionary<TModel>;
 ★ indexOf(value: TModel, isSorted?: boolean): number;
 ★ initial(): TModel;
 ★ initial(n: number): TModel[];
 ★ inject<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
 ★ invoke(methodName: string, ...args: any[]): any;
 ★ isEmpty(): boolean;
 ★ last(): TModel;
 ★ last(n: number): TModel[];
 ★ lastIndexOf(value: TModel, from?: number): number;
 ★ map<TResult>(iterator: _.ListIterator<TModel, TResult>, context?: any): TResult[];
 ★ max(iterator?: _.ListIterator<TModel, any>, context?: any): TModel;
 ★ min(iterator?: _.ListIterator<TModel, any>, context?: any): TModel;
 ★ partition(iterator: _.ListIterator<TModel, boolean>): TModel[][];
 ★ reduce<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
 ★ reduceRight<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
 ★ reject(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
 ★ rest(n?: number): TModel[];
 ★ sample(): TModel;
 ★ sample(n: number): TModel[];
 ★ select(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
 ★ shuffle(): TModel[];
 ★ size(): number;
 ★ some(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
 ★ sortBy<TSort>(iterator?: _.ListIterator<TModel, TSort>, context?: any): TModel[];
 ★ sortBy(iterator: string, context?: any): TModel[];
 ★ tail(n?: number): TModel[];
 ★ take(): TModel;
 ★ take(n: number): TModel[];
 ★ toArray(): TModel[];

★ model の所属に collection の id を書き込むかも
   その場合 _prepareModel, _removeReference にも対応が必要

- Event:
    '@add': [TItem, Collection < TItem >, CollectionSetOptions];
    '@remove': [TItem, Collection < TItem >, CollectionSetOptions];
    '@update': [Collection < TItem >, CollectionUpdateOptions];
    '@reset': [Collection < TItem >, CollectionAddOptions];
    '@sort': [Collection < TItem >, CollectionSetOptions];
    '@sync': [Collection < TItem >, PlainObject, CollectionDataSyncOptions];
    '@destroy': [TItem, Collection < TItem >, ModelDestroyOptions];
    '@error': [Collection < TItem >, Error, CollectionDataSyncOptions];
 */
