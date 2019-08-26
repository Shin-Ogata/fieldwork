import { Writable } from '@cdp/core-utils';
import { ElementBase } from './utils';

/** @internal */
const _createIterableIterator = Symbol('createIterableIterator');

/** @internal */
export type ElementAccess<T extends ElementBase = Element> = Writable<DOMBase<T>>;

/**
 * @en Base abstraction class of [[DOMClass]]. This class provides iterator methods.
 * @ja [[DOMClass]] の基底抽象クラス. iterator を提供.
 */
export abstract class DOMBase<T extends ElementBase> implements ArrayLike<T>, Iterable<T> {
    /**
     * @en number of `Element`
     * @ja 内包する `Element` 数
     */
    readonly length: number;

    /**
     * @en `Element` accessor
     * @ja `Element` への添え字アクセス
     */
    readonly [n: number]: T;

    /**
     * constructor
     * 
     * @param elements
     *  - `en` operation targets `Element` array.
     *  - `ja` 操作対象の `Element` 配列
     */
    constructor(elements: T[]) {
        const self: ElementAccess<T> = this;
        for (const [index, elem] of elements.entries()) {
            self[index] = elem;
        }
        this.length = elements.length;
    }

///////////////////////////////////////////////////////////////////////
// implements: Iterable<T>

    /**
     * @en Iterator of [[ElementBase]] values in the array.
     * @ja 格納している [[ElementBase]] にアクセス可能なイテレータオブジェクトを返却
     */
    [Symbol.iterator](): Iterator<T> {
        const iterator = {
            base: this,
            pointer: 0,
            next(): IteratorResult<T> {
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
        return iterator as Iterator<T>;
    }

    /**
     * @en Returns an iterable of key(index), value([[ElementBase]]) pairs for every entry in the array.
     * @ja key(index), value([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    entries(): IterableIterator<[number, T]> {
        return this[_createIterableIterator]((key: number, value: T) => [key, value]);
    }

    /**
     * @en Returns an iterable of keys(index) in the array.
     * @ja key(index) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    keys(): IterableIterator<number> {
        return this[_createIterableIterator]((key: number) => key);
    }

    /**
     * @en Returns an iterable of values([[ElementBase]]) in the array.
     * @ja values([[ElementBase]]) 配列にアクセス可能なイテレータオブジェクトを返却
     */
    values(): IterableIterator<T> {
        return this[_createIterableIterator]((key: number, value: T) => value);
    }

    /** @internal common iterator create function */
    private [_createIterableIterator]<R>(valueGenerator: (key: number, value: T) => R): IterableIterator<R> {
        const context = {
            base: this,
            pointer: 0,
        };

        const iterator: IterableIterator<R> = {
            next(): IteratorResult<R> {
                const current = context.pointer;
                if (current < context.base.length) {
                    context.pointer++;
                    return {
                        done: false,
                        value: valueGenerator(current, context.base[current]),
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
