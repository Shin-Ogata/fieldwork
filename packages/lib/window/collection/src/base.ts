export { };

/*
 * - id
 * - items
 * - length
 * - release()
 * - fetch()
 *
 * 
    url: string | (() => string);

    without(...values: TModel[]): TModel[];

    add(model: {}|TModel, options?: AddOptions): TModel;
    add(models: ({}|TModel)[], options?: AddOptions): TModel[];
    at(index: number): TModel;
    get(id: number | string | Model): TModel;
    has(key: number | string | Model): boolean;
    clone(): this;
    create(attributes: any, options ?: ModelSaveOptions): TModel;
    pluck(attribute: string): any[];
    push(model: TModel, options ?: AddOptions): TModel;
    pop(options ?: Silenceable): TModel;
    remove(model: {} | TModel, options ?: Silenceable): TModel;
    remove(models: ({} | TModel)[], options ?: Silenceable): TModel[];
    reset(models ?: TModel[], options ?: Silenceable): TModel[];
    set(models ?: TModel[], options ?: CollectionSetOptions): TModel[];
    shift(options ?: Silenceable): TModel;
    sort(options ?: Silenceable): Collection<TModel>;
    unshift(model: TModel, options ?: AddOptions): TModel;
    where(properties: any): TModel[];
    findWhere(properties: any): TModel;
    modelId(attrs: any) : any
    slice(min?: number, max?: number): TModel[];

    // mixins from underscore

    all(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
    any(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
    chain(): any;
    collect<TResult>(iterator: _.ListIterator<TModel, TResult>, context?: any): TResult[];
    contains(value: TModel): boolean;
    countBy(iterator?: _.ListIterator<TModel, any>): _.Dictionary<number>;
    countBy(iterator: string): _.Dictionary<number>;
    detect(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel;
    difference(others: TModel[]): TModel[];
    drop(n?: number): TModel[];
    each(iterator: _.ListIterator<TModel, void>, context?: any): TModel[];
    every(iterator: _.ListIterator<TModel, boolean>, context?: any): boolean;
    filter(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
    find(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel;
    findIndex(predicate: _.ListIterator<TModel, boolean>, context?: any): number;
    findLastIndex(predicate: _.ListIterator<TModel, boolean>, context?: any): number;
    first(): TModel;
    first(n: number): TModel[];
    foldl<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
    foldr<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
    forEach(iterator: _.ListIterator<TModel, void>, context?: any): TModel[];
    groupBy(iterator: _.ListIterator<TModel, any>, context?: any): _.Dictionary<TModel[]>;
    groupBy(iterator: string, context?: any): _.Dictionary<TModel[]>;
    head(): TModel;
    head(n: number): TModel[];
    include(value: TModel): boolean;
    includes(value: TModel): boolean;
    indexBy(iterator: _.ListIterator<TModel, any>, context?: any): _.Dictionary<TModel>;
    indexBy(iterator: string, context?: any): _.Dictionary<TModel>;
    indexOf(value: TModel, isSorted?: boolean): number;
    initial(): TModel;
    initial(n: number): TModel[];
    inject<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
    invoke(methodName: string, ...args: any[]): any;
    isEmpty(): boolean;
    last(): TModel;
    last(n: number): TModel[];
    lastIndexOf(value: TModel, from?: number): number;
    map<TResult>(iterator: _.ListIterator<TModel, TResult>, context?: any): TResult[];
    max(iterator?: _.ListIterator<TModel, any>, context?: any): TModel;
    min(iterator?: _.ListIterator<TModel, any>, context?: any): TModel;
    partition(iterator: _.ListIterator<TModel, boolean>): TModel[][];
    reduce<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
    reduceRight<TResult>(iterator: _.MemoIterator<TModel, TResult>, memo?: TResult, context?: any): TResult;
    reject(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
    rest(n?: number): TModel[];
    sample(): TModel;
    sample(n: number): TModel[];
    select(iterator: _.ListIterator<TModel, boolean>, context?: any): TModel[];
    shuffle(): TModel[];
    size(): number;
    some(iterator?: _.ListIterator<TModel, boolean>, context?: any): boolean;
    sortBy<TSort>(iterator?: _.ListIterator<TModel, TSort>, context?: any): TModel[];
    sortBy(iterator: string, context?: any): TModel[];
    tail(n?: number): TModel[];
    take(): TModel;
    take(n: number): TModel[];
    toArray(): TModel[];

 */
