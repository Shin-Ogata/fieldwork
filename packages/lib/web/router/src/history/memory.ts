import {
    PlainObject,
    post,
} from '@cdp/core-utils';
import { Silenceable, EventPublisher } from '@cdp/events';
import { Deferred, CancelToken } from '@cdp/promise';
import {
    IHistory,
    HistoryEvent,
    HistoryState,
    HistorySetStateOptions,
    HistoryDirectReturnType,
} from './interfaces';
import {
    createData,
    createUncancellableDeferred,
    HistoryStack,
} from './internal';

/** @internal instance signature */
const $signature = Symbol('MemoryHistory#signature');

//__________________________________________________________________________________________________//

/**
 * @en Memory history management class.
 * @ja メモリ履歴管理クラス
 */
class MemoryHistory<T = PlainObject> extends EventPublisher<HistoryEvent<T>> implements IHistory<T> {
    private readonly _stack = new HistoryStack<T>();

    /**
     * constructor
     */
    constructor(id: string, state?: T) {
        super();
        this[$signature] = true;
        // initialize
        void this.replace(id, state, { silent: true });
    }

    /**
     * dispose object
     */
    dispose(): void {
        this._stack.dispose();
        this.off();
        delete this[$signature];
    }

    /**
     * reset history
     */
    async reset(options?: Silenceable): Promise<void> {
        if (Number.isNaN(this.index) || this._stack.length <= 1) {
            return;
        }

        const { silent } = options || {};

        const oldState = this.state;
        this.setIndex(0);
        this.clearForward();
        const newState = this.state;

        if (!silent) {
            const df = createUncancellableDeferred('MemoryHistory#reset() is uncancellable method.');
            void post(() => {
                this.onChangeState('noop', df, newState, oldState);
            });
            await df;
        }
    }

///////////////////////////////////////////////////////////////////////
// implements: IHistory<T>

    /** history stack length */
    get length(): number {
        return this._stack.length;
    }

    /** current state */
    get state(): HistoryState<T> {
        return this._stack.state;
    }

    /** current id */
    get id(): string {
        return this._stack.id;
    }

    /** current index */
    get index(): number {
        return this._stack.index;
    }

    /** stack pool */
    get stack(): readonly HistoryState<T>[] {
        return this._stack.array;
    }

    /** get data by index. */
    at(index: number): HistoryState<T> {
        return this._stack.at(index);
    }

    /** To move backward through history. */
    back(): Promise<number> {
        return this.go(-1);
    }

    /** To move forward through history. */
    forward(): Promise<number> {
        return this.go(1);
    }

    /** To move a specific point in history. */
    async go(delta?: number): Promise<number> {
        // if given 0, no reaction (not reload).
        if (!delta) {
            return this.index;
        }

        const oldIndex = this.index;

        try {
            const oldState = this.state;
            const newState = this._stack.distance(delta);
            const df = new Deferred();
            void post(() => {
                this.onChangeState('seek', df, newState, oldState);
            });
            await df;
        } catch (e) {
            console.warn(e);
            this.setIndex(oldIndex);
        }

        return this.index;
    }

    /**
     * @en Register new history.
     * @ja 新規履歴の登録
     *
     * @param id
     *  - `en` Specified stack ID
     *  - `ja` スタックIDを指定
     * @param state
     *  - `en` State object associated with the stack
     *  - `ja` スタック に紐づく状態オブジェクト
     * @param options
     *  - `en` State management options
     *  - `ja` 状態管理用オプションを指定
     */
    push(id: string, state?: T, options?: HistorySetStateOptions): Promise<number> {
        return this.updateState('push', id, state, options || {});
    }

    /**
     * @en Replace current history.
     * @ja 現在の履歴の置換
     *
     * @param id
     *  - `en` Specified stack ID
     *  - `ja` スタックIDを指定
     * @param state
     *  - `en` State object associated with the stack
     *  - `ja` スタック に紐づく状態オブジェクト
     * @param options
     *  - `en` State management options
     *  - `ja` 状態管理用オプションを指定
     */
    async replace(id: string, state?: T, options?: HistorySetStateOptions): Promise<number> {
        return this.updateState('replace', id, state, options || {});
    }

    /**
     * @en Clear forward history from current index.
     * @ja 現在の履歴のインデックスより前方の履歴を削除
     */
    clearForward(): void {
        this._stack.clearForward();
    }

    /**
     * @en Return closet index by ID.
     * @ja 指定された ID から最も近い index を返却
     */
    closest(id: string): number | undefined {
        return this._stack.closest(id);
    }

    /**
     * @en Return closet stack information by ID.
     * @ja 指定された ID から最も近いスタック情報を返却
     */
    direct(id: string): HistoryDirectReturnType<T> {
        return this._stack.direct(id);
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /** @internal set index */
    private setIndex(idx: number): void {
        this._stack.index = idx;
    }

    /** @internal update */
    private async updateState(method: 'push' | 'replace', id: string, state: T | undefined, options: HistorySetStateOptions): Promise<number> {
        const { silent, cancel } = options;

        const oldState = this._stack.length ? this.state : undefined;
        const newState = createData(id, state);
        if ('replace' === method && 0 === this.index) {
            newState['@origin'] = true;
        }

        if (!silent) {
            const df = new Deferred(cancel);
            void post(() => {
                this.onChangeState(method, df, newState, oldState as HistoryState<T>);
            });
            await df;
        } else {
            this._stack[`${method}Stack`](newState);
        }

        return this.index;
    }

    /** @internal change state handler */
    private onChangeState(method: 'noop' | 'push' | 'replace' | 'seek', df: Deferred, newState: HistoryState<T>, oldState: HistoryState<T>): void {
        const { cancel, token } = CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method

        try {
            this.publish('update', newState, cancel);

            if (token.requested) {
                throw token.reason;
            }

            this._stack[`${method}Stack`](newState);
            this.publish('change', newState, oldState);

            df.resolve();
        } catch (e) {
            df.reject(e);
        }
    }
}

//__________________________________________________________________________________________________//

/**
 * @en Create memory history management object.
 * @ja メモリ履歴管理オブジェクトを構築
 *
 * @param id
 *  - `en` Specified stack ID
 *  - `ja` スタックIDを指定
 * @param state
 *  - `en` State object associated with the stack
 *  - `ja` スタック に紐づく状態オブジェクト
 */
export function createMemoryHistory<T = PlainObject>(id: string, state?: T): IHistory<T> {
    return new MemoryHistory(id, state);
}

/**
 * @en Reset memory history.
 * @ja メモリ履歴のリセット
 *
 * @param instance
 *  - `en` `MemoryHistory` instance
 *  - `ja` `MemoryHistory` インスタンスを指定
 */
export async function resetMemoryHistory<T = PlainObject>(instance: IHistory<T>, options?: HistorySetStateOptions): Promise<void> {
    instance[$signature] && await (instance as MemoryHistory<T>).reset(options);
}

/**
 * @en Dispose memory history management object.
 * @ja メモリ履歴管理オブジェクトの破棄
 *
 * @param instance
 *  - `en` `MemoryHistory` instance
 *  - `ja` `MemoryHistory` インスタンスを指定
 */
export function disposeMemoryHistory<T = PlainObject>(instance: IHistory<T>): void {
    instance[$signature] && (instance as MemoryHistory<T>).dispose();
}
