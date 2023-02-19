import { PlainObject, post } from '@cdp/core-utils';
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
                void this.onChangeState('noop', df, newState, oldState);
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

    /** check it can go back in history */
    get canBack(): boolean {
        return !this._stack.isFirst;
    }

    /** check it can go forward in history */
    get canForward(): boolean {
        return !this._stack.isLast;
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
        const oldIndex = this.index;

        try {
            // if given 0, just reload.
            const oldState = delta ? this.state : undefined;
            const newState = this._stack.distance(delta || 0);
            const df = new Deferred();
            void post(() => {
                void this.onChangeState('seek', df, newState, oldState);
            });
            await df;
        } catch (e) {
            console.warn(e);
            this.setIndex(oldIndex);
        }

        return this.index;
    }

    /** To move a specific point in history by stack ID. */
    traverseTo(id: string): Promise<number> {
        const { direction, delta } = this.direct(id);
        if ('missing' === direction) {
            console.warn(`traverseTo(${id}), returned missing.`);
            return Promise.resolve(this.index);
        }
        return this.go(delta);
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
    replace(id: string, state?: T, options?: HistorySetStateOptions): Promise<number> {
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
     * @en Return destination stack information by `start` and `end` ID.
     * @ja 起点, 終点の ID から終点のスタック情報を返却
     */
    direct(toId: string, fromId?: string): HistoryDirectReturnType<T> {
        return this._stack.direct(toId, fromId as string);
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /** @internal set index */
    private setIndex(idx: number): void {
        this._stack.index = idx;
    }

    /** @internal trigger event & wait process */
    private async triggerEventAndWait(
        event: 'refresh' | 'changing',
        arg1: HistoryState<T>,
        arg2: HistoryState<T> | undefined | ((reason?: unknown) => void),
    ): Promise<void> {
        const promises: Promise<unknown>[] = [];
        this.publish(event, arg1, arg2 as any, promises); // eslint-disable-line @typescript-eslint/no-explicit-any
        await Promise.all(promises);
    }

    /** @internal update */
    private async updateState(method: 'push' | 'replace', id: string, state: T | undefined, options: HistorySetStateOptions): Promise<number> {
        const { silent, cancel } = options;

        const newState = createData(id, state);
        if ('replace' === method && 0 === this.index) {
            newState['@origin'] = true;
        }

        if (!silent) {
            const df = new Deferred(cancel);
            void post(() => {
                void this.onChangeState(method, df, newState, this.state);
            });
            await df;
        } else {
            this._stack[`${method}Stack`](newState);
        }

        return this.index;
    }

    /** @internal change state handler */
    private async onChangeState(method: 'noop' | 'push' | 'replace' | 'seek', df: Deferred, newState: HistoryState<T>, oldState: HistoryState<T> | undefined): Promise<void> {
        const { cancel, token } = CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method

        try {
            await this.triggerEventAndWait('changing', newState, cancel);

            if (token.requested) {
                throw token.reason;
            }

            this._stack[`${method}Stack`](newState);
            await this.triggerEventAndWait('refresh', newState, oldState);

            df.resolve();
        } catch (e) {
            this.publish('error', e);
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
