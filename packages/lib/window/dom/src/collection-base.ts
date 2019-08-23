/**
 */
export class CollectionBase<T extends Node | Document | Window> implements ArrayLike<T> {
    length: number;
    [n: number]: T;

    /** @internal itelator pointer */
    private _iterPointer = 0;

    /**
     * 
     * @param targets
     */
    constructor(targets: T[]) {
        for (const [index, elem] of targets.entries()) {
            this[index] = elem;
        }
        this.length = targets.length;
    }

    public next(): IteratorResult<T> {
        if (this._iterPointer < this.length) {
            return {
                done: false,
                value: this[this._iterPointer++],
            };
        } else {
            this._iterPointer = 0;
            return {
                done: true,
                value: undefined!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
            };
        }
    }

    /**
     */
    [Symbol.iterator](): IterableIterator<T> {
        return this;
    }
}

/*
// test
const check = new CollectionBase([document]);
for (const elem of check) {
    console.log(elem);
}

const check2 = new CollectionBase([document.body]);

const check3 = new CollectionBase([window]);
*/
