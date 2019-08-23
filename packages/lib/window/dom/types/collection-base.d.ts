/**
 */
export declare class CollectionBase<T extends Node | Document | Window> implements ArrayLike<T> {
    length: number;
    [n: number]: T;
    /**
     *
     * @param targets
     */
    constructor(targets: T[]);
    next(): IteratorResult<T>;
    /**
     */
    [Symbol.iterator](): IterableIterator<T>;
}
