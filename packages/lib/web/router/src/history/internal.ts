import {
    Writable,
    PlainObject,
    at,
    sort,
    noop,
} from '@cdp/core-utils';
import { Deferred } from '@cdp/promise';
import { HistoryState, HistoryDirectReturnType } from './interfaces';

/** @internal normalzie id string */
export const normalizeId = (src: string): string => {
    // remove head of "#", "/", "#/" and tail of "/"
    return src.replace(/^(#\/)|^[#/]|\s+$/, '').replace(/^\s+$|(\/$)/, '');
};

/** @internal create stack */
export const createData = <T = PlainObject>(id: string, state?: T): HistoryState<T> => {
    return Object.assign({ '@id': normalizeId(id) }, state);
};

/** @internal create uncancellable deferred */
export const createUncancellableDeferred = (warn: string): Deferred => {
    const uncancellable = new Deferred() as Writable<Deferred>;
    uncancellable.reject = () => {
        console.warn(warn);
        uncancellable.resolve();
    };
    return uncancellable;
};

//__________________________________________________________________________________________________//

/**
 * @internal stack management common class
 */
export class HistoryStack<T = PlainObject> {
    private _stack: HistoryState<T>[] = [];
    private _index = 0;

    /** history stack length */
    get length(): number {
        return this._stack.length;
    }

    /** current state */
    get state(): HistoryState<T> {
        return this.distance(0);
    }

    /** current id */
    get id(): string {
        return this.state['@id'];
    }

    /** current index */
    get index(): number {
        return this._index;
    }

    /** current index */
    set index(idx: number) {
        this._index = Math.trunc(idx);
    }

    /** stack pool */
    get array(): readonly HistoryState<T>[] {
        return this._stack.slice();
    }

    /** get data by index. */
    public at(index: number): HistoryState<T> {
        return at(this._stack, index);
    }

    /** clear forward history from current index. */
    public clearForward(): void {
        this._stack = this._stack.slice(0, this._index + 1);
    }

    /** return closet index by ID. */
    public closest(id: string): number | undefined {
        id = normalizeId(id);
        const { _index: base } = this;
        const candidates = this._stack
            .map((s, index) => { return { index, distance: Math.abs(base - index), ...s }; })
            .filter(s => s['@id'] === id)
        ;
        sort(candidates, (l, r) => (l.distance > r.distance ? 1 : -1), true);
        return candidates[0]?.index;
    }

    /** return closet stack information by to ID and from ID. */
    public direct(toId: string, fromId?: string): HistoryDirectReturnType<T> {
        const toIndex   = this.closest(toId);
        const fromIndex = null == fromId ? this._index : this.closest(fromId);
        if (null == fromIndex || null == toIndex) {
            return { direction: 'missing' };
        } else {
            const delta = toIndex - fromIndex;
            const direction = 0 === delta
                ? 'none'
                : delta < 0 ? 'back' : 'forward';
            return { direction, index: toIndex, state: this._stack[toIndex] };
        }
    }

    /** get active data from current index origin */
    public distance(delta: number): HistoryState<T> {
        const pos = this._index + delta;
        if (pos < 0) {
            throw new RangeError(`invalid array index. [length: ${this.length}, given: ${pos}]`);
        }
        return this.at(pos);
    }

    /** noop stack */
    public noopStack = noop; // eslint-disable-line @typescript-eslint/explicit-member-accessibility

    /** push stack */
    public pushStack(data: HistoryState<T>): void {
        this._stack[++this._index] = data;
    }

    /** replace stack */
    public replaceStack(data: HistoryState<T>): void {
        this._stack[this._index] = data;
    }

    /** seek stack */
    public seekStack(data: HistoryState<T>): void {
        const index = this.closest(data['@id']);
        if (null == index) {
            this.pushStack(data);
        } else {
            this._index = index;
        }
    }

    /** dispose object */
    public dispose(): void {
        this._stack.length = 0;
        this._index = NaN;
    }
}
