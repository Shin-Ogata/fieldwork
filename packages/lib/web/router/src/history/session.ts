/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    Accessible,
    PlainObject,
    isObject,
    noop,
    $cdp,
} from '@cdp/core-utils';
import { Silenceable, EventPublisher } from '@cdp/events';
import { Deferred, CancelToken } from '@cdp/promise';
import { toUrl } from '@cdp/web-utils';
import { toRouterStackId as toId } from '../utils';
import { window } from '../ssr';
import type {
    IHistory,
    HistoryEvent,
    HistoryState,
    HistorySetStateOptions,
    HistoryDirectReturnType,
} from './interfaces';
import {
    HistoryStack,
    createData,
    createUncancellableDeferred,
    assignStateElement,
} from './internal';

/** @internal dispatch additional information */
interface DispatchInfo<T> {
    df: Deferred;
    newId: string;
    oldId: string;
    postproc: 'noop' | 'push' | 'replace' | 'seek';
    nextState?: HistoryState<T>;
    prevState?: HistoryState<T>;
}

/** @internal constant */
const enum Const {
    HASH_PREFIX = '#/',
}

//__________________________________________________________________________________________________//

/** @internal */
const setDispatchInfo = <T>(state: Accessible<T>, additional: DispatchInfo<T>): T => {
    (state[$cdp] as DispatchInfo<T>) = additional;
    return state;
};

/** @internal */
const parseDispatchInfo = <T>(state: Accessible<T>): [T, DispatchInfo<T>?] => {
    if (isObject(state) && state[$cdp]) {
        const additional = state[$cdp];
        delete state[$cdp];
        return [state, additional as DispatchInfo<T>];
    } else {
        return [state];
    }
};

/** @internal instance signature */
const $signature = Symbol('SessionHistory#signature');

//__________________________________________________________________________________________________//

/**
 * @en Browser session history management class.
 * @ja ブラウザセッション履歴管理クラス
 */
class SessionHistory<T = PlainObject> extends EventPublisher<HistoryEvent<T>> implements IHistory<T> {
    private readonly _window: Window;
    private readonly _mode: 'hash' | 'history';
    private readonly _popStateHandler: (ev: PopStateEvent) => void;
    private readonly _stack = new HistoryStack<T>();
    private _dfGo?: Deferred;

    /**
     * constructor
     */
    constructor(windowContxt: Window, mode: 'hash' | 'history', id?: string, state?: T) {
        super();
        (this as any)[$signature] = true;
        this._window = windowContxt;
        this._mode = mode;

        this._popStateHandler = this.onPopState.bind(this);
        this._window.addEventListener('popstate', this._popStateHandler);

        // initialize
        void this.replace(id ?? toId(this._window.location.href), state, { silent: true });
    }

    /**
     * dispose object
     */
    dispose(): void {
        this._window.removeEventListener('popstate', this._popStateHandler);
        this._stack.dispose();
        this.off();
        delete (this as any)[$signature];
    }

    /**
     * reset history
     */
    async reset(options?: Silenceable): Promise<void> {
        if (Number.isNaN(this.index) || this._stack.length <= 1) {
            return;
        }

        const { silent } = options ?? {};
        const { location } = this._window;
        const prevState = this._stack.state;
        const oldURL = location.href;

        this.setIndex(0);
        await this.clearForward();

        const newURL = location.href;

        if (!silent) {
            const additional: DispatchInfo<T> = {
                df: createUncancellableDeferred('SessionHistory#reset() is uncancellable method.'),
                newId: toId(newURL),
                oldId: toId(oldURL),
                postproc: 'noop',
                prevState,
            };
            await this.dispatchChangeInfo(this.state, additional);
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
        // if already called, no reaction.
        if (this._dfGo) {
            return this.index;
        }

        // if given 0, just reload.
        if (!delta) {
            await this.triggerEventAndWait('refresh', this.state, undefined);
            return this.index;
        }

        const oldIndex = this.index;

        try {
            this._dfGo = new Deferred();
            this._stack.distance(delta);
            this._window.history.go(delta);
            await this._dfGo;
        } catch (e) {
            console.warn(e);
            this.setIndex(oldIndex);
        } finally {
            this._dfGo = undefined;
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
        return this.updateState('push', id, state, options ?? {});
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
        return this.updateState('replace', id, state, options ?? {});
    }

    /**
     * @en Clear forward history from current index.
     * @ja 現在の履歴のインデックスより前方の履歴を削除
     */
    clearForward(): Promise<void> {
        this._stack.clearForward();
        return this.clearForwardHistory();
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
     * @ja 起点, 終点の ID を指定してスタック情報を返却
     */
    direct(toId: string, fromId?: string): HistoryDirectReturnType<T> {
        return this._stack.direct(toId, fromId);
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /** @internal set index */
    private setIndex(idx: number): void {
        this._stack.index = idx;
    }

    /** @internal convert to URL */
    private toUrl(id: string): string {
        return ('hash' === this._mode) ? `${Const.HASH_PREFIX}${id}` : toUrl(id);
    }

    /** @internal trigger event & wait process */
    private async triggerEventAndWait(
        event: 'refresh' | 'changing',
        arg1: HistoryState<T>,
        arg2: HistoryState<T> | undefined | ((reason?: unknown) => void),
    ): Promise<void> {
        const promises: Promise<unknown>[] = [];
        this.publish(event, arg1, arg2 as any, promises);
        await Promise.all(promises);
    }

    /** @internal update */
    private async updateState(method: 'push' | 'replace', id: string, state: T | undefined, options: HistorySetStateOptions): Promise<number> {
        const { silent, cancel } = options;
        const { location, history } = this._window;

        const data = createData(id, state);
        id = data['@id'];
        if ('replace' === method && 0 === this.index) {
            data['@origin'] = true;
        }

        const oldURL = location.href;
        history[`${method}State`](data, '', this.toUrl(id));
        const newURL = location.href;

        assignStateElement(data, this._stack as HistoryStack);

        if (!silent) {
            const additional: DispatchInfo<T> = {
                df: new Deferred(cancel),
                newId: toId(newURL),
                oldId: toId(oldURL),
                postproc: method,
                nextState: data,
            };
            await this.dispatchChangeInfo(data, additional);
        } else {
            this._stack[`${method}Stack`](data);
        }

        return this.index;
    }

    /** @internal dispatch `popstate` events */
    private async dispatchChangeInfo(newState: Accessible<T>, additional: DispatchInfo<T>): Promise<void> {
        const state = setDispatchInfo(newState, additional);
        this._window.dispatchEvent(new PopStateEvent('popstate', { state }));
        await additional.df;
    }

    /** @internal silent popstate event listner scope */
    private async suppressEventListenerScope(executor: (wait: () => Promise<unknown>) => Promise<void>): Promise<void> {
        try {
            this._window.removeEventListener('popstate', this._popStateHandler);
            const waitPopState = (): Promise<unknown> => {
                return new Promise(resolve => {
                    this._window.addEventListener('popstate', (ev: PopStateEvent) => {
                        resolve(ev.state);
                    });
                });
            };
            await executor(waitPopState);
        } finally {
            this._window.addEventListener('popstate', this._popStateHandler);
        }
    }

    /** @internal rollback history */
    private async rollbackHistory(method: string, newId: string): Promise<void> {
        const { history } = this._window;
        switch (method) {
            case 'replace':
                history.replaceState(this.state, '', this.toUrl(this.id));
                break;
            case 'push':
                await this.suppressEventListenerScope(async (wait: () => Promise<unknown>): Promise<void> => {
                    const promise = wait();
                    history.go(-1);
                    await promise;
                });
                break;
            default:
                await this.suppressEventListenerScope(async (wait: () => Promise<unknown>): Promise<void> => {
                    const delta = this.index - this.closest(newId)!;
                    if (0 !== delta) {
                        const promise = wait();
                        delta && history.go(delta);
                        await promise;
                    }
                });
                break;
        }
    }

    /** @internal clear forward session history from current index. */
    private async clearForwardHistory(): Promise<void> {
        await this.suppressEventListenerScope(async (wait: () => Promise<unknown>): Promise<void> => {
            const isOrigin = (st: Accessible<unknown>): boolean => {
                return st?.['@origin'] as boolean;
            };

            const { history } = this._window;
            let state = history.state;

            // back to session origin
            while (!isOrigin(state)) {
                const promise = wait();
                history.back();
                state = await promise;
            }

            const ensure = (src: Accessible<unknown>): unknown => {
                const ctx = { ...src };
                delete ctx['router'];
                delete ctx['@params'];
                return JSON.parse(JSON.stringify(ctx));
            };

            // forward from index 1 to current value
            for (let i = 1, n = this._stack.length; i < n; i++) {
                const st = this._stack.at(i);
                history.pushState(ensure(st), '', this.toUrl(st['@id']));
            }
        });
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    /** @internal receive `popstate` events */
    private async onPopState(ev: PopStateEvent): Promise<void> {
        const { location } = this._window;
        const [newState, additional] = parseDispatchInfo(ev.state);
        const newId   = additional?.newId ?? toId(location.href);
        const method  = additional?.postproc ?? 'seek';
        const df      = additional?.df ?? this._dfGo ?? new Deferred();
        const oldData = additional?.prevState || this.state;
        const newData = additional?.nextState || this.direct(newId).state || createData(newId, newState);
        const { cancel, token } = CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method

        try {
            // for fail safe
            df.catch(noop);

            await this.triggerEventAndWait('changing', newData, cancel);

            if (token.requested) {
                throw token.reason;
            }

            this._stack[`${method}Stack`](newData);
            await this.triggerEventAndWait('refresh', newData, oldData);

            df.resolve();
        } catch (e) {
            // history を元に戻す
            await this.rollbackHistory(method, newId);
            this.publish('error', e);
            df.reject(e);
        }
    }
}

//__________________________________________________________________________________________________//

/**
 * @en {@link createSessionHistory}() options.
 * @ja {@link createSessionHistory}() に渡すオプション
 * 
 */
export interface SessionHistoryCreateOptions {
    context?: Window;
    mode?: 'hash' | 'history';
}

/**
 * @en Create browser session history management object.
 * @ja ブラウザセッション管理オブジェクトを構築
 *
 * @param id
 *  - `en` Specified stack ID
 *  - `ja` スタックIDを指定
 * @param state
 *  - `en` State object associated with the stack
 *  - `ja` スタック に紐づく状態オブジェクト
 * @param options
 *  - `en` {@link SessionHistoryCreateOptions} object
 *  - `ja` {@link SessionHistoryCreateOptions} オブジェクト
 */
export function createSessionHistory<T = PlainObject>(id?: string, state?: T, options?: SessionHistoryCreateOptions): IHistory<T> {
    const { context, mode } = Object.assign({ mode: 'hash' }, options);
    return new SessionHistory(context ?? window, mode, id, state);
}

/**
 * @en Reset browser session history.
 * @ja ブラウザセッション履歴のリセット
 *
 * @param instance
 *  - `en` `SessionHistory` instance
 *  - `ja` `SessionHistory` インスタンスを指定
 */
export async function resetSessionHistory<T = PlainObject>(instance: IHistory<T>, options?: HistorySetStateOptions): Promise<void> {
    (instance as any)[$signature] && await (instance as SessionHistory<T>).reset(options);
}

/**
 * @en Dispose browser session history management object.
 * @ja ブラウザセッション管理オブジェクトの破棄
 *
 * @param instance
 *  - `en` `SessionHistory` instance
 *  - `ja` `SessionHistory` インスタンスを指定
 */
export function disposeSessionHistory<T = PlainObject>(instance: IHistory<T>): void {
    (instance as any)[$signature] && (instance as SessionHistory<T>).dispose();
}
