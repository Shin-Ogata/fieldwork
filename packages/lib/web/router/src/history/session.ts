import {
    PlainObject,
    isObject,
    at,
    sort,
    $cdp,
} from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import {
    IHistory,
    HistoryEvent,
    HistoryState,
    HistorySetStateOptions,
    HistoryDirectReturnType,
} from './interfaces';
import { window } from './ssr';

/** @internal extends definition */
interface SessionHistorySetStateOptions extends HistorySetStateOptions {
    origin?: boolean;
}

/** @internal remove "#", "/" */
const cleanHash = (src: string): string => {
    return src.replace(/^[#/]|\s+$/g, '');
};

/** @internal remove url path section */
const toHash = (url: string): string => {
    const hash = /#.*$/.exec(url)?.[0];
    return hash ? cleanHash(hash) : url;
};

/** @internal */
const { abs } = Math;

/** @internal */
const treatOriginMark = <T>(state: T, options: SessionHistorySetStateOptions): T => {
    isObject(state) && options.origin && (state['@origin'] = true);
    return state;
};

/** @internal */
const dropOriginMark = <T>(state: T): T => {
    isObject(state) && delete state['@origin'];
    return state;
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
    private readonly _popStateHandler: typeof SessionHistory.prototype.onPopState;
    private readonly _hashChangeHandler: typeof SessionHistory.prototype.onHashChange;
    private _stack: HistoryState<T>[] = [];
    private _index = 0;
    private _cache?: HistoryState<T>;

    /**
     * constructor
     */
    constructor(windowContxt: Window, id: string, state?: T) {
        super();
        this[$signature] = true;
        this._window = windowContxt;

        this._popStateHandler   = this.onPopState.bind(this);
        this._hashChangeHandler = this.onHashChange.bind(this);
        this._window.addEventListener('popstate', this._popStateHandler);
        this._window.addEventListener('hashchange', this._hashChangeHandler);

        // initialize
        this.replace(id, state, { origin: true });
    }

    /**
     * dispose object
     */
    dispose(): void {
        this._window.removeEventListener('popstate', this._popStateHandler);
        this._window.removeEventListener('hashchange', this._hashChangeHandler);
        this._stack.length = 0;
        this._index = NaN;
    }

    /**
     * reset history
     */
    async reset(options?: HistorySetStateOptions): Promise<void> {
        if (Number.isNaN(this._index) || 1 === this._stack.length) {
            return;
        }
        const { silent } = options || {};
        this._prevState = this._stack[this._index];
        const oldURL = location.href;

        this._index = 0;
        this.clearForward();
        await this.backToSesssionOrigin();

        const newURL = location.href;
        if (!silent) {
            this.dispatchChangeInfo(this.state, newURL, oldURL);
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
        return this.seek(0);
    }

    /** current id */
    get id(): string {
        return this.state[$cdp];
    }

    /** current index */
    get index(): number {
        return this._index;
    }

    /** stack pool */
    get stack(): readonly HistoryState<T>[] {
        return this._stack;
    }

    /** get data by index. */
    at(index: number): HistoryState<T> {
        return at(this._stack, index);
    }

    /** To move backward through history. */
    back(): number {
        return this.go(-1);
    }

    /** To move forward through history. */
    forward(): number {
        return this.go(1);
    }

    /** To move a specific point in history. */
    go(delta?: number): number {
        try {
            // if given 0, no reaction (not reload).
            if (!delta) {
                return this._index;
            }
            this.seek(delta);
            this._window.history.go(delta);
            return this._index + delta;
        } catch (e) {
            console.warn(e);
            return this._index;
        }
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
    push(id: string, state?: T, options?: HistorySetStateOptions): number {
        const { id: cleanId, data } = this.pushStack(id, state);
        return this.updateState('pushState', cleanId, data, options || {});
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
    replace(id: string, state?: T, options?: SessionHistorySetStateOptions): number {
        id = cleanHash(id);
        const data = Object.assign({ [$cdp]: id }, state);
        this._prevState = this._stack[this._index];
        this._stack[this._index] = data;
        return this.updateState('replaceState', id, data, options || {});
    }

    /**
     * @en Clear forward history from current index.
     * @ja 現在の履歴のインデックスより前方の履歴を削除
     */
    clearForward(): void {
        this._stack = this._stack.slice(0, this._index + 1);
    }

    /**
     * @en Return closet index by ID.
     * @ja 指定された ID から最も近い index を返却
     */
    closest(id: string): number | undefined {
        id = cleanHash(id);
        const { _index: base } = this;
        const candidates = this._stack
            .map((s, index) => { return { index, distance: abs(base - index), ...s }; })
            .filter(s => s[$cdp] === id)
        ;
        sort(candidates, (l, r) => (l.distance > r.distance ? 1 : -1), true);
        return candidates[0]?.index;
    }

    /**
     * @en Return closet stack information by ID.
     * @ja 指定された ID から最も近いスタック情報を返却
     */
    direct(id: string): HistoryDirectReturnType<T> {
        const index = this.closest(id);
        if (null == index) {
            return { direction: 'missing' };
        } else {
            const delta = index - this._index;
            const direction = 0 === delta
                ? 'none'
                : delta < 0 ? 'back' : 'forward';
            return { direction, index, state: this._stack[index] };
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /** @internal previous state cache */
    private set _prevState(val: HistoryState<T> | undefined) {
        this._cache = val;
    }

    /** @internal previous state access */
    private get _prevState(): HistoryState<T> | undefined {
        const retval = this._cache;
        delete this._cache;
        return retval;
    }

    /** @internal get active data from current index origin */
    private seek(delta: number): HistoryState<T> {
        const pos = this._index + delta;
        if (pos < 0) {
            throw new RangeError(`invalid array index. [length: ${this.length}, given: ${pos}]`);
        }
        return this.at(pos);
    }

    /** @internal push stack */
    private pushStack(id: string, state?: T): { id: string; data: HistoryState<T>; } {
        id = cleanHash(id);
        const data = Object.assign({ [$cdp]: id }, state);
        this._prevState = this._stack[this._index];
        this._stack[++this._index] = data;
        return { id, data };
    }

    /** @internal update */
    private updateState(method: 'pushState' | 'replaceState', id: string, state: T | null, options: SessionHistorySetStateOptions): number {
        const { silent, title } = options;
        const { document, history, location } = this._window;
        const unused = null != title ? title : document.title;

        const oldURL = location.href;
        history[method](treatOriginMark(state, options), unused, id ? `#${id}` : '');
        const newURL = location.href;

        if (!silent) {
            this.dispatchChangeInfo(state, newURL, oldURL);
        }

        return this._index;
    }

    /** @internal dispatch `popstate` and `hashchange` events */
    private dispatchChangeInfo(state: T | null, newURL: string, oldURL: string): void {
        this._window.dispatchEvent(new PopStateEvent('popstate', { state }));
        if (newURL !== oldURL) {
            this._window.dispatchEvent(new HashChangeEvent('hashchange', { newURL, oldURL }));
        }
    }

    /** @internal receive `popstate` events */
    private onPopState(ev: PopStateEvent): void {
        this.publish('update', dropOriginMark(ev.state));
    }

    /** @internal receive `hasuchange` events */
    private onHashChange(ev: HashChangeEvent): void {
        const newId = toHash(ev.newURL);
        const oldId = toHash(ev.oldURL);
        const next  = this.closest(newId);
        if (null == next) {
            this.pushStack(newId, undefined);
        } else {
            this._index = next;
        }
        if (newId !== oldId) {
            const oldData = this._prevState || this.direct(oldId).state;
            const newData = this.state;
            this.publish('change', newData, oldData);
        }
    }

    /** @internal follow the session history until `origin` (in silent) */
    private async backToSesssionOrigin(): Promise<void> {
        try {
            this._window.removeEventListener('popstate', this._popStateHandler);
            this._window.removeEventListener('hashchange', this._hashChangeHandler);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const waitPopState = (): Promise<any> => {
                return new Promise(resolve => {
                    this._window.addEventListener('popstate', (ev: PopStateEvent) => {
                        resolve(ev.state);
                    });
                });
            };

            const isOrigin = (st: unknown): boolean => {
                return st && (st as object)['@origin'];
            };

            let state = this._window.history.state;
            while (!isOrigin(state)) {
                const promise = waitPopState();
                this._window.history.back();
                state = await promise;
                console.log(`state: ${JSON.stringify(state, null, 4)}`);
            }
        } finally {
            this._window.addEventListener('popstate', this._popStateHandler);
            this._window.addEventListener('hashchange', this._hashChangeHandler);
        }
    }
}

//__________________________________________________________________________________________________//

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
 * @param windowContxt
 *  - `en` History owner window object
 *  - `ja` 履歴を所有しているウィンドウオブジェクト
 */
export function createSessionHistory<T = PlainObject>(id: string, state?: T, windowContxt: Window = window): IHistory<T> {
    return new SessionHistory(windowContxt, id, state);
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
    instance[$signature] && await (instance as SessionHistory<T>).reset(options);
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
    instance[$signature] && (instance as SessionHistory<T>).dispose();
}
