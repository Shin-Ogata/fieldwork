/*!
 * @cdp/router 0.9.19
 *   generic router scheme
 */

import { webRoot, toUrl, toTemplateElement, loadTemplateSource, waitFrame } from '@cdp/web-utils';
import { safe, at, sort, noop, $cdp, isObject, post, isString, isArray, assignValue, isFunction, sleep, camelize } from '@cdp/core-utils';
import { Deferred, CancelToken, NativePromise } from '@cdp/promise';
import { path2regexp } from '@cdp/extension-path2regexp';
export * from '@cdp/extension-path2regexp';
import { EventPublisher } from '@cdp/events';
import { makeResult, RESULT_CODE, isResult } from '@cdp/result';
import { dom } from '@cdp/dom';
import { toQueryStrings, parseUrlQuery, convertUrlParamType } from '@cdp/ajax';

/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["MVC_ROUTER_DECLARE"] = 9007199254740991] = "MVC_ROUTER_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 1, 'router element not found.')] = "ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 2, 'Route cannot be resolved.')] = "ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_NAVIGATE_FAILED"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 3, 'Route navigate failed.')] = "ERROR_MVC_ROUTER_NAVIGATE_FAILED";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_INVALID_SUBFLOW_BASE_URL"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 4, 'Invalid sub-flow base url.')] = "ERROR_MVC_ROUTER_INVALID_SUBFLOW_BASE_URL";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_BUSY"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 5, 'In changing page process now.')] = "ERROR_MVC_ROUTER_BUSY";
    })();
})();

/** @internal */ const window = safe(globalThis.window);
/** @internal */ const URL = safe(globalThis.URL);

/** @internal normalzie id string */
const normalizeId = (src) => {
    // remove head of "#", "/", "#/" and tail of "/"
    return src.replace(/^(#\/)|^[#/]|\s+$/, '').replace(/^\s+$|(\/$)/, '');
};
/** @internal create stack */
const createData = (id, state) => {
    return Object.assign({ '@id': normalizeId(id) }, state);
};
/** @internal create uncancellable deferred */
const createUncancellableDeferred = (warn) => {
    const uncancellable = new Deferred();
    uncancellable.reject = () => {
        console.warn(warn);
        uncancellable.resolve();
    };
    return uncancellable;
};
/** @internal assign state element if already exists */
const assignStateElement = (state, stack) => {
    const el = stack.direct(state['@id'])?.state?.el;
    (!state.el && el) && (state.el = el);
};
//__________________________________________________________________________________________________//
/**
 * @internal stack management common class
 */
class HistoryStack {
    _stack = [];
    _index = 0;
    /** history stack length */
    get length() {
        return this._stack.length;
    }
    /** current state */
    get state() {
        return this.distance(0);
    }
    /** current id */
    get id() {
        return this.state['@id'];
    }
    /** current index */
    get index() {
        return this._index;
    }
    /** current index */
    set index(idx) {
        this._index = Math.trunc(idx);
    }
    /** stack pool */
    get array() {
        return this._stack.slice();
    }
    /** check position in stack is first or not */
    get isFirst() {
        return 0 === this._index;
    }
    /** check position in stack is last or not */
    get isLast() {
        return this._index === this._stack.length - 1;
    }
    /** get data by index. */
    at(index) {
        return at(this._stack, index);
    }
    /** clear forward history from current index. */
    clearForward() {
        this._stack = this._stack.slice(0, this._index + 1);
    }
    /** return closet index by ID. */
    closest(id) {
        id = normalizeId(id);
        const { _index: base } = this;
        const candidates = this._stack
            .map((s, index) => { return { index, distance: Math.abs(base - index), ...s }; })
            .filter(s => s['@id'] === id);
        sort(candidates, (l, r) => (l.distance > r.distance ? 1 : -1), true);
        return candidates[0]?.index;
    }
    /** return closet stack information by to ID and from ID. */
    direct(toId, fromId) {
        const toIndex = this.closest(toId);
        const fromIndex = null == fromId ? this._index : this.closest(fromId);
        if (null == fromIndex || null == toIndex) {
            return { direction: 'missing' };
        }
        else {
            const delta = toIndex - fromIndex;
            const direction = 0 === delta
                ? 'none'
                : delta < 0 ? 'back' : 'forward';
            return { direction, delta, index: toIndex, state: this._stack[toIndex] };
        }
    }
    /** get active data from current index origin */
    distance(delta) {
        const pos = this._index + delta;
        if (pos < 0) {
            throw new RangeError(`invalid array index. [length: ${this.length}, given: ${pos}]`);
        }
        return this.at(pos);
    }
    /** noop stack */
    noopStack = noop; // eslint-disable-line @typescript-eslint/explicit-member-accessibility
    /** push stack */
    pushStack(data) {
        this._stack[++this._index] = data;
    }
    /** replace stack */
    replaceStack(data) {
        this._stack[this._index] = data;
    }
    /** seek stack */
    seekStack(data) {
        const index = this.closest(data['@id']);
        if (null == index) {
            this.pushStack(data);
        }
        else {
            this._index = index;
        }
    }
    /** dispose object */
    dispose() {
        this._stack.length = 0;
        this._index = NaN;
    }
}

/**
 * @en Generates an ID to be used by the stack inside the router.
 * @ja ルーター内部の stack が使用する ID を生成
 *
 * @param src
 *  - `en` specifies where the path string is created from [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 *  - `ja` path 文字列の作成元を指定 [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 */
const toRouterStackId = (src) => {
    if (URL.canParse(src)) {
        const { hash } = new URL(src);
        return hash ? normalizeId(hash) : normalizeId(src.substring(webRoot.length));
    }
    else {
        return normalizeId(src);
    }
};
/**
 * @en Get the normalized `/<id>` string from the url / path.
 * @ja url / path を指定して, 正規化した `/<stack id>` 文字列を取得
 *
 * @param src
 *  - `en` specifies where the path string is created from [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 *  - `ja` path 文字列の作成元を指定 [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 */
const toRouterPath = (src) => {
    return `/${toRouterStackId(src)}`;
};

/* eslint-disable
    @typescript-eslint/no-explicit-any
 */
//__________________________________________________________________________________________________//
/** @internal */
const setDispatchInfo = (state, additional) => {
    state[$cdp] = additional;
    return state;
};
/** @internal */
const parseDispatchInfo = (state) => {
    if (isObject(state) && state[$cdp]) {
        const additional = state[$cdp];
        delete state[$cdp];
        return [state, additional];
    }
    else {
        return [state];
    }
};
/** @internal instance signature */
const $signature$1 = Symbol('SessionHistory#signature');
//__________________________________________________________________________________________________//
/**
 * @en Browser session history management class.
 * @ja ブラウザセッション履歴管理クラス
 */
class SessionHistory extends EventPublisher {
    _window;
    _mode;
    _popStateHandler;
    _stack = new HistoryStack();
    _dfGo;
    /**
     * constructor
     */
    constructor(windowContxt, mode, id, state) {
        super();
        this[$signature$1] = true;
        this._window = windowContxt;
        this._mode = mode;
        this._popStateHandler = this.onPopState.bind(this);
        this._window.addEventListener('popstate', this._popStateHandler);
        // initialize
        void this.replace(id ?? toRouterStackId(this._window.location.href), state, { silent: true });
    }
    /**
     * dispose object
     */
    dispose() {
        this._window.removeEventListener('popstate', this._popStateHandler);
        this._stack.dispose();
        this.off();
        delete this[$signature$1];
    }
    /**
     * reset history
     */
    async reset(options) {
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
            const additional = {
                df: createUncancellableDeferred('SessionHistory#reset() is uncancellable method.'),
                newId: toRouterStackId(newURL),
                oldId: toRouterStackId(oldURL),
                postproc: 'noop',
                prevState,
            };
            await this.dispatchChangeInfo(this.state, additional);
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IHistory<T>
    /** history stack length */
    get length() {
        return this._stack.length;
    }
    /** current state */
    get state() {
        return this._stack.state;
    }
    /** current id */
    get id() {
        return this._stack.id;
    }
    /** current index */
    get index() {
        return this._stack.index;
    }
    /** stack pool */
    get stack() {
        return this._stack.array;
    }
    /** check it can go back in history */
    get canBack() {
        return !this._stack.isFirst;
    }
    /** check it can go forward in history */
    get canForward() {
        return !this._stack.isLast;
    }
    /** get data by index. */
    at(index) {
        return this._stack.at(index);
    }
    /** To move backward through history. */
    back() {
        return this.go(-1);
    }
    /** To move forward through history. */
    forward() {
        return this.go(1);
    }
    /** To move a specific point in history. */
    async go(delta) {
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
        }
        catch (e) {
            console.warn(e);
            this.setIndex(oldIndex);
        }
        finally {
            this._dfGo = undefined;
        }
        return this.index;
    }
    /** To move a specific point in history by stack ID. */
    traverseTo(id) {
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
    push(id, state, options) {
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
    replace(id, state, options) {
        return this.updateState('replace', id, state, options ?? {});
    }
    /**
     * @en Clear forward history from current index.
     * @ja 現在の履歴のインデックスより前方の履歴を削除
     */
    clearForward() {
        this._stack.clearForward();
        return this.clearForwardHistory();
    }
    /**
     * @en Return closet index by ID.
     * @ja 指定された ID から最も近い index を返却
     */
    closest(id) {
        return this._stack.closest(id);
    }
    /**
     * @en Return destination stack information by `start` and `end` ID.
     * @ja 起点, 終点の ID を指定してスタック情報を返却
     */
    direct(toId, fromId) {
        return this._stack.direct(toId, fromId);
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    /** @internal set index */
    setIndex(idx) {
        this._stack.index = idx;
    }
    /** @internal convert to URL */
    toUrl(id) {
        return ('hash' === this._mode) ? `${"#/" /* Const.HASH_PREFIX */}${id}` : toUrl(id);
    }
    /** @internal trigger event & wait process */
    async triggerEventAndWait(event, arg1, arg2) {
        const promises = [];
        this.publish(event, arg1, arg2, promises);
        await Promise.all(promises);
    }
    /** @internal update */
    async updateState(method, id, state, options) {
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
        assignStateElement(data, this._stack);
        if (!silent) {
            const additional = {
                df: new Deferred(cancel),
                newId: toRouterStackId(newURL),
                oldId: toRouterStackId(oldURL),
                postproc: method,
                nextState: data,
            };
            await this.dispatchChangeInfo(data, additional);
        }
        else {
            this._stack[`${method}Stack`](data);
        }
        return this.index;
    }
    /** @internal dispatch `popstate` events */
    async dispatchChangeInfo(newState, additional) {
        const state = setDispatchInfo(newState, additional);
        this._window.dispatchEvent(new PopStateEvent('popstate', { state }));
        await additional.df;
    }
    /** @internal silent popstate event listner scope */
    async suppressEventListenerScope(executor) {
        try {
            this._window.removeEventListener('popstate', this._popStateHandler);
            const waitPopState = () => {
                return new Promise(resolve => {
                    this._window.addEventListener('popstate', (ev) => {
                        resolve(ev.state);
                    });
                });
            };
            await executor(waitPopState);
        }
        finally {
            this._window.addEventListener('popstate', this._popStateHandler);
        }
    }
    /** @internal rollback history */
    async rollbackHistory(method, newId) {
        const { history } = this._window;
        switch (method) {
            case 'replace':
                history.replaceState(this.state, '', this.toUrl(this.id));
                break;
            case 'push':
                await this.suppressEventListenerScope(async (wait) => {
                    const promise = wait();
                    history.go(-1);
                    await promise;
                });
                break;
            default:
                await this.suppressEventListenerScope(async (wait) => {
                    const delta = this.index - this.closest(newId);
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
    async clearForwardHistory() {
        await this.suppressEventListenerScope(async (wait) => {
            const isOrigin = (st) => {
                return st?.['@origin'];
            };
            const { history } = this._window;
            let state = history.state;
            // back to session origin
            while (!isOrigin(state)) {
                const promise = wait();
                history.back();
                state = await promise;
            }
            const ensure = (src) => {
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
    async onPopState(ev) {
        const { location } = this._window;
        const [newState, additional] = parseDispatchInfo(ev.state);
        const newId = additional?.newId ?? toRouterStackId(location.href);
        const method = additional?.postproc ?? 'seek';
        const df = additional?.df ?? this._dfGo ?? new Deferred();
        const oldData = additional?.prevState ?? this.state;
        const newData = additional?.nextState ?? this.direct(newId).state ?? createData(newId, newState);
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
        }
        catch (e) {
            // history を元に戻す
            await this.rollbackHistory(method, newId);
            this.publish('error', e);
            df.reject(e);
        }
    }
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
function createSessionHistory(id, state, options) {
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
async function resetSessionHistory(instance, options) {
    instance[$signature$1] && await instance.reset(options);
}
/**
 * @en Dispose browser session history management object.
 * @ja ブラウザセッション管理オブジェクトの破棄
 *
 * @param instance
 *  - `en` `SessionHistory` instance
 *  - `ja` `SessionHistory` インスタンスを指定
 */
function disposeSessionHistory(instance) {
    instance[$signature$1] && instance.dispose();
}

/* eslint-disable
    @typescript-eslint/no-explicit-any
 */
/** @internal instance signature */
const $signature = Symbol('MemoryHistory#signature');
//__________________________________________________________________________________________________//
/**
 * @en Memory history management class.
 * @ja メモリ履歴管理クラス
 */
class MemoryHistory extends EventPublisher {
    _stack = new HistoryStack();
    /**
     * constructor
     */
    constructor(id, state) {
        super();
        this[$signature] = true;
        // initialize
        void this.replace(id, state, { silent: true });
    }
    /**
     * dispose object
     */
    dispose() {
        this._stack.dispose();
        this.off();
        delete this[$signature];
    }
    /**
     * reset history
     */
    async reset(options) {
        if (Number.isNaN(this.index) || this._stack.length <= 1) {
            return;
        }
        const { silent } = options ?? {};
        const oldState = this.state;
        this.setIndex(0);
        await this.clearForward();
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
    get length() {
        return this._stack.length;
    }
    /** current state */
    get state() {
        return this._stack.state;
    }
    /** current id */
    get id() {
        return this._stack.id;
    }
    /** current index */
    get index() {
        return this._stack.index;
    }
    /** stack pool */
    get stack() {
        return this._stack.array;
    }
    /** check it can go back in history */
    get canBack() {
        return !this._stack.isFirst;
    }
    /** check it can go forward in history */
    get canForward() {
        return !this._stack.isLast;
    }
    /** get data by index. */
    at(index) {
        return this._stack.at(index);
    }
    /** To move backward through history. */
    back() {
        return this.go(-1);
    }
    /** To move forward through history. */
    forward() {
        return this.go(1);
    }
    /** To move a specific point in history. */
    async go(delta) {
        const oldIndex = this.index;
        try {
            // if given 0, just reload.
            const oldState = delta ? this.state : undefined;
            const newState = this._stack.distance(delta ?? 0);
            const df = new Deferred();
            void post(() => {
                void this.onChangeState('seek', df, newState, oldState);
            });
            await df;
        }
        catch (e) {
            console.warn(e);
            this.setIndex(oldIndex);
        }
        return this.index;
    }
    /** To move a specific point in history by stack ID. */
    traverseTo(id) {
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
    push(id, state, options) {
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
    replace(id, state, options) {
        return this.updateState('replace', id, state, options ?? {});
    }
    /**
     * @en Clear forward history from current index.
     * @ja 現在の履歴のインデックスより前方の履歴を削除
     */
    async clearForward() {
        this._stack.clearForward();
    }
    /**
     * @en Return closet index by ID.
     * @ja 指定された ID から最も近い index を返却
     */
    closest(id) {
        return this._stack.closest(id);
    }
    /**
     * @en Return destination stack information by `start` and `end` ID.
     * @ja 起点, 終点の ID から終点のスタック情報を返却
     */
    direct(toId, fromId) {
        return this._stack.direct(toId, fromId);
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    /** @internal set index */
    setIndex(idx) {
        this._stack.index = idx;
    }
    /** @internal trigger event & wait process */
    async triggerEventAndWait(event, arg1, arg2) {
        const promises = [];
        this.publish(event, arg1, arg2, promises);
        await Promise.all(promises);
    }
    /** @internal update */
    async updateState(method, id, state, options) {
        const { silent, cancel } = options;
        const newState = createData(id, state);
        if ('replace' === method && 0 === this.index) {
            newState['@origin'] = true;
        }
        assignStateElement(newState, this._stack);
        if (!silent) {
            const df = new Deferred(cancel);
            void post(() => {
                void this.onChangeState(method, df, newState, this.state);
            });
            await df;
        }
        else {
            this._stack[`${method}Stack`](newState);
        }
        return this.index;
    }
    /** @internal change state handler */
    async onChangeState(method, df, newState, oldState) {
        const { cancel, token } = CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method
        try {
            await this.triggerEventAndWait('changing', newState, cancel);
            if (token.requested) {
                throw token.reason;
            }
            this._stack[`${method}Stack`](newState);
            await this.triggerEventAndWait('refresh', newState, oldState);
            df.resolve();
        }
        catch (e) {
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
function createMemoryHistory(id, state) {
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
async function resetMemoryHistory(instance, options) {
    instance[$signature] && await instance.reset(options);
}
/**
 * @en Dispose memory history management object.
 * @ja メモリ履歴管理オブジェクトの破棄
 *
 * @param instance
 *  - `en` `MemoryHistory` instance
 *  - `ja` `MemoryHistory` インスタンスを指定
 */
function disposeMemoryHistory(instance) {
    instance[$signature] && instance.dispose();
}

//__________________________________________________________________________________________________//
/** @internal built-in css */
const applyBuiltInCss = (context, prefix) => {
    const styleText = `
    .${prefix}-transition-running {
        pointer-events: none;
    }
    .${prefix}-hidden {
        visibility: hidden;
        pointer-events: none;
    }
    `;
    const sheet = new context.CSSStyleSheet();
    sheet.replaceSync(styleText);
    const { document: root } = context;
    const defaults = root.adoptedStyleSheets;
    root.adoptedStyleSheets = [...defaults, sheet];
};
//__________________________________________________________________________________________________//
/** @internal RouteContextParameters to RouteContext */
const toRouteContext = (url, router, params, navOptions) => {
    // omit unclonable props
    const fromNavigate = !!navOptions;
    const ensureClone = (ctx) => JSON.parse(JSON.stringify(ctx));
    const context = Object.assign({
        url,
        router: fromNavigate ? undefined : router,
    }, navOptions, {
        // force override
        query: {},
        params: {},
        path: params.path,
        '@params': fromNavigate ? undefined : params,
    });
    return fromNavigate ? ensureClone(context) : context;
};
/** @internal convert context params */
const toRouteContextParameters = (routes) => {
    const flatten = (parentPath, nested) => {
        const retval = [];
        for (const n of nested) {
            n.path = `${parentPath.replace(/\/$/, '')}/${normalizeId(n.path)}`;
            retval.push(n);
            if (n.routes) {
                retval.push(...flatten(n.path, n.routes));
            }
        }
        return retval;
    };
    return flatten('', isArray(routes) ? routes : routes ? [routes] : [])
        .map((seed) => {
        try {
            const { regexp, keys } = path2regexp.pathToRegexp(seed.path);
            seed.regexp = regexp;
            seed.paramKeys = keys.filter(k => isString(k.name)).map(k => k.name);
        }
        catch (e) {
            console.error(e);
        }
        return seed;
    });
};
//__________________________________________________________________________________________________//
/** @internal prepare IHistory object */
const prepareHistory = (seed = 'hash', initialPath, context) => {
    return (isString(seed)
        ? 'memory' === seed ? createMemoryHistory(initialPath ?? '') : createSessionHistory(initialPath, undefined, { mode: seed, context })
        : seed);
};
/** @internal */
const ensurePathParams = (params) => {
    const pathParams = {};
    if (params) {
        for (const key of Object.keys(params)) {
            pathParams[key] = String(params[key]);
        }
    }
    return pathParams;
};
/** @internal */
const buildNavigateUrl = (path, options) => {
    try {
        path = `/${normalizeId(path)}`;
        const { query, params } = options;
        let url = path2regexp.compile(path)(ensurePathParams(params));
        if (query) {
            url += `?${toQueryStrings(query)}`;
        }
        return url;
    }
    catch (error) {
        throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Construct route destination failed. [path: ${path}, detail: ${error.toString()}]`, error);
    }
};
/** @internal */
const parseUrlParams = (route) => {
    const { url } = route;
    route.query = url.includes('?') ? parseUrlQuery(normalizeId(url)) : {};
    route.params = {};
    const { regexp, paramKeys } = route['@params'];
    if (paramKeys.length) {
        const params = regexp.exec(url)?.map((value, index) => { return { value, key: paramKeys[index - 1] }; });
        for (const param of params) {
            if (null != param.key && null != param.value) {
                assignValue(route.params, param.key, convertUrlParamType(param.value));
            }
        }
    }
};
//__________________________________________________________________________________________________//
/** @internal ensure RouteContextParameters#instance */
const ensureRouterPageInstance = async (route) => {
    const { '@params': params } = route;
    if (params.page) {
        return false; // already created
    }
    const { component, componentOptions } = params;
    if (isFunction(component)) {
        try {
            params.page = new component(route, componentOptions);
        }
        catch {
            params.page = await component(route, componentOptions);
        }
    }
    else if (isObject(component)) {
        params.page = Object.assign({ '@route': route, '@options': componentOptions }, component);
    }
    else {
        params.page = { '@route': route, '@options': componentOptions };
    }
    return true; // newly created
};
/** @internal ensure RouteContextParameters#$template */
const ensureRouterPageTemplate = async (params) => {
    if (params.$template) {
        return false; // already created
    }
    const ensureInstance = (el) => {
        return el instanceof HTMLTemplateElement ? dom([...el.content.children]) : dom(el);
    };
    const { content } = params;
    if (null == content) {
        // noop element
        params.$template = dom();
    }
    else if (isString(content['selector'])) {
        // from ajax
        const { selector, url } = content;
        const template = toTemplateElement(await loadTemplateSource(selector, { url: url && toUrl(url) }));
        if (!template) {
            throw Error(`template load failed. [selector: ${selector}, url: ${url}]`);
        }
        params.$template = ensureInstance(template);
    }
    else if (isFunction(content)) {
        params.$template = ensureInstance(dom(await content())[0]);
    }
    else {
        params.$template = ensureInstance(dom(content)[0]);
    }
    return true; // newly created
};
/** @internal decide transition direction */
const decideTransitionDirection = (changeInfo) => {
    if (changeInfo.reverse) {
        switch (changeInfo.direction) {
            case 'back':
                return 'forward';
            case 'forward':
                return 'back';
        }
    }
    return changeInfo.direction;
};
/** @internal retrieve effect duration property */
const getEffectDurationSec = ($el, effect) => {
    try {
        return parseFloat(getComputedStyle($el[0])[`${effect}Duration`]);
    }
    catch {
        return 0;
    }
};
/** @internal */
const waitForEffect = ($el, effect, durationSec) => {
    return Promise.race([
        new Promise(resolve => $el[`${effect}End`](resolve)),
        sleep(durationSec * 1000 + 100 /* Const.WAIT_TRANSITION_MARGIN */),
    ]);
};
/** @internal transition execution */
const processPageTransition = async ($el, fromClass, activeClass, toClass) => {
    $el.removeClass(fromClass);
    $el.addClass(toClass);
    const promises = [];
    for (const effect of ['animation', 'transition']) {
        const duration = getEffectDurationSec($el, effect);
        duration && promises.push(waitForEffect($el, effect, duration));
    }
    await Promise.all(promises);
    $el.removeClass([activeClass, toClass]);
};

/** @internal RouteAyncProcess implementation */
class RouteAyncProcessContext {
    _promises = [];
    ///////////////////////////////////////////////////////////////////////
    // implements: RouteAyncProcess
    register(promise) {
        this._promises.push(promise);
    }
    ///////////////////////////////////////////////////////////////////////
    // internal methods:
    get promises() {
        return this._promises;
    }
    async complete() {
        await Promise.all(this._promises);
        this._promises.length = 0;
    }
}

//__________________________________________________________________________________________________//
/**
 * @en Router impliment class.
 * @ja Router 実装クラス
 */
class RouterContext extends EventPublisher {
    _routes = {};
    _history;
    _$el;
    _raf;
    _historyChangingHandler;
    _historyRefreshHandler;
    _errorHandler;
    _cssPrefix;
    _transitionSettings;
    _navigationSettings;
    _lastRoute;
    _prevRoute;
    _subflowTransitionParams;
    _inChangingPage = false;
    /**
     * constructor
     */
    constructor(selector, options) {
        super();
        const { routes, start, el, window: context, history, initialPath, additionalStacks, cssPrefix, transition, navigation, } = options;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this._raf = context?.requestAnimationFrame ?? window.requestAnimationFrame;
        this._$el = dom(selector, el);
        if (!this._$el.length) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
        }
        this._history = prepareHistory(history, initialPath, context);
        this._historyChangingHandler = this.onHistoryChanging.bind(this);
        this._historyRefreshHandler = this.onHistoryRefresh.bind(this);
        this._errorHandler = this.onHandleError.bind(this);
        this._history.on('changing', this._historyChangingHandler);
        this._history.on('refresh', this._historyRefreshHandler);
        this._history.on('error', this._errorHandler);
        // follow anchor
        this._$el.on('click', '[href]', this.onAnchorClicked.bind(this));
        this._cssPrefix = cssPrefix ?? "cdp" /* CssName.DEFAULT_PREFIX */;
        this._transitionSettings = Object.assign({ default: 'none', reload: 'none' }, transition);
        this._navigationSettings = Object.assign({ method: 'push' }, navigation);
        // built-in css
        applyBuiltInCss((context ?? window), this._cssPrefix);
        void (async () => {
            await this.register(routes, false);
            if (additionalStacks?.length) {
                await this.pushPageStack(additionalStacks, { noNavigate: true });
            }
            start && await this.refresh();
        })();
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: Router
    /** Router's view HTML element */
    get el() {
        return this._$el[0];
    }
    /** Object with current route data */
    get currentRoute() {
        return this._history.state;
    }
    /** Check state is in sub-flow */
    get isInSubFlow() {
        return !!this.findSubFlowParams(false);
    }
    /** Check it can go back in history */
    get canBack() {
        return this._history.canBack;
    }
    /** Check it can go forward in history */
    get canForward() {
        return this._history.canForward;
    }
    /** Route registration */
    async register(routes, refresh = false) {
        const prefetchParams = [];
        for (const context of toRouteContextParameters(routes)) {
            this._routes[context.path] = context;
            const { content, prefetch } = context;
            content && prefetch && prefetchParams.push(context);
        }
        prefetchParams.length && await this.setPrefetchContents(prefetchParams);
        refresh && await this.refresh();
        return this;
    }
    /** Navigate to new page. */
    async navigate(to, options) {
        try {
            const seed = this.findRouteContextParams(to);
            if (!seed) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
            }
            const opts = Object.assign({ intent: undefined }, options);
            const url = buildNavigateUrl(to, opts);
            const route = toRouteContext(url, this, seed, opts);
            const method = opts.method ?? this._navigationSettings.method;
            try {
                // exec navigate
                await this._history[method](url, route);
            }
            catch {
                // noop
            }
        }
        catch (e) {
            this.onHandleError(e);
        }
        return this;
    }
    /** Add page stack starting from the current history. */
    async pushPageStack(stack, options) {
        try {
            const { noNavigate, traverseTo } = options ?? {};
            const stacks = isArray(stack) ? stack : [stack];
            const routes = stacks.filter(s => !!s.route).map(s => s.route);
            // ensrue Route
            await this.register(routes, false);
            await this.suppressEventListenerScope(async () => {
                // push history
                for (const page of stacks) {
                    const { path: url, transition, reverse } = page;
                    const path = toRouterPath(url);
                    const params = this.findRouteContextParams(path);
                    if (null == params) {
                        throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [path: ${url}]`, page);
                    }
                    // silent registry
                    const route = toRouteContext(path, this, params, { intent: undefined });
                    route.transition = transition;
                    route.reverse = reverse;
                    void this._history.push(path, route, { silent: true });
                }
                await this.waitFrame();
                if (traverseTo) {
                    await this._history.traverseTo(toRouterPath(traverseTo));
                }
            });
            if (!noNavigate) {
                await this.refresh();
            }
        }
        catch (e) {
            this.onHandleError(e);
        }
        return this;
    }
    /** To move backward through history. */
    back() {
        return this.go(-1);
    }
    /** To move forward through history. */
    forward() {
        return this.go(1);
    }
    /** To move a specific point in history. */
    async go(delta) {
        await this._history.go(delta);
        return this;
    }
    /** To move a specific point in history by path string. */
    async traverseTo(src) {
        await this._history.traverseTo(toRouterPath(src));
        return this;
    }
    /** Begin sub-flow transaction. */
    async beginSubFlow(to, subflow, options) {
        try {
            const { transition, reverse } = options ?? {};
            const params = Object.assign({
                transition: this._transitionSettings.default,
                reverse: false,
                origin: this.currentRoute.url,
            }, subflow, {
                transition,
                reverse,
            });
            this.evaluateSubFlowParams(params);
            this.currentRoute.subflow = params;
            await this.navigate(to, options);
        }
        catch (e) {
            this.onHandleError(e);
        }
        return this;
    }
    /** Commit sub-flow transaction. */
    async commitSubFlow(params) {
        const subflow = this.findSubFlowParams(true);
        if (!subflow) {
            return this;
        }
        const { transition, reverse } = subflow.params;
        this._subflowTransitionParams = Object.assign({ transition, reverse }, params);
        const { additionalDistance, additionalStacks } = subflow.params;
        const distance = subflow.distance + additionalDistance;
        if (additionalStacks?.length) {
            await this.suppressEventListenerScope(() => this.go(-1 * distance));
            await this.pushPageStack(additionalStacks);
        }
        else {
            await this.go(-1 * distance);
        }
        await this._history.clearForward();
        return this;
    }
    /** Cancel sub-flow transaction. */
    async cancelSubFlow(params) {
        const subflow = this.findSubFlowParams(true);
        if (!subflow) {
            return this;
        }
        const { transition, reverse } = subflow.params;
        this._subflowTransitionParams = Object.assign({ transition, reverse }, params);
        await this.go(-1 * subflow.distance);
        await this._history.clearForward();
        return this;
    }
    /** Set common transition settnigs. */
    transitionSettings(newSettings) {
        const oldSettings = { ...this._transitionSettings };
        newSettings && Object.assign(this._transitionSettings, newSettings);
        return oldSettings;
    }
    /** Set common navigation settnigs. */
    navigationSettings(newSettings) {
        const oldSettings = { ...this._navigationSettings };
        newSettings && Object.assign(this._navigationSettings, newSettings);
        return oldSettings;
    }
    /** Refresh router (specify update level). */
    async refresh(level = 1 /* RouterRefreshLevel.RELOAD */) {
        switch (level) {
            case 1 /* RouterRefreshLevel.RELOAD */:
                return this.go();
            case 2 /* RouterRefreshLevel.DOM_CLEAR */: {
                this.releaseCacheContents(undefined);
                this._prevRoute && (this._prevRoute.el = null);
                return this.go();
            }
            default:
                console.warn(`unsupported level: ${level}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
                return this;
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: sub-flow
    /** @internal evaluate sub-flow parameters */
    evaluateSubFlowParams(subflow) {
        let additionalDistance = 0;
        if (subflow.base) {
            const baseId = normalizeId(subflow.base);
            let found = false;
            const { index, stack } = this._history;
            for (let i = index; i >= 0; i--, additionalDistance++) {
                if (stack[i]['@id'] === baseId) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_INVALID_SUBFLOW_BASE_URL, `Invalid sub-flow base url. [url: ${subflow.base}]`);
            }
        }
        else {
            subflow.base = this.currentRoute.url;
        }
        Object.assign(subflow, { additionalDistance });
    }
    /** @internal find sub-flow parameters */
    findSubFlowParams(detach) {
        const stack = this._history.stack;
        for (let i = stack.length - 1, distance = 0; i >= 0; i--, distance++) {
            if (stack[i].subflow) {
                const params = stack[i].subflow;
                detach && delete stack[i].subflow;
                return { distance, params };
            }
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: transition utils
    /** @internal common `RouterEventArg` maker */
    makeRouteChangeInfo(newState, oldState) {
        const intent = newState.intent;
        delete newState.intent; // navigate 時に指定された intent は one time のみ有効にする
        const from = (oldState ?? this._lastRoute);
        const direction = this._history.direct(newState['@id'], from?.['@id']).direction;
        const asyncProcess = new RouteAyncProcessContext();
        const reload = from ? newState.url === from.url : true;
        const { transition, reverse } = this._subflowTransitionParams ?? (reload
            ? { transition: this._transitionSettings.reload, reverse: false }
            : ('back' !== direction ? newState : from));
        return {
            router: this,
            from,
            to: newState,
            direction,
            asyncProcess,
            reload,
            transition,
            reverse,
            intent,
        };
    }
    /** @internal find route by url */
    findRouteContextParams(path) {
        const key = `/${normalizeId(path.split('?')[0])}`;
        for (const path of Object.keys(this._routes)) {
            const { regexp } = this._routes[path];
            if (regexp.test(key)) {
                return this._routes[path];
            }
        }
    }
    /** @internal trigger page event */
    triggerPageCallback(event, target, arg) {
        const method = camelize(`page-${event}`);
        if (isFunction(target?.[method])) {
            const retval = target[method](arg);
            if (retval instanceof NativePromise && arg['asyncProcess']) {
                arg.asyncProcess.register(retval);
            }
        }
    }
    /** @internal wait frame */
    waitFrame() {
        return waitFrame(1, this._raf);
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: transition entrance
    /** @internal change page main procedure */
    async changePage(nextRoute, prevRoute) {
        try {
            this._inChangingPage = true;
            parseUrlParams(nextRoute);
            const changeInfo = this.makeRouteChangeInfo(nextRoute, prevRoute);
            this._subflowTransitionParams = undefined;
            const [pageNext, $elNext, pagePrev, $elPrev,] = await this.prepareChangeContext(changeInfo);
            // transition core
            const transition = await this.transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo);
            this.updateChangeContext($elNext, $elPrev, changeInfo, transition);
            // 遷移先が subflow 開始点である場合, subflow 解除
            if (nextRoute.url === this.findSubFlowParams(false)?.params.origin) {
                this.findSubFlowParams(true);
                await this._history.clearForward();
            }
            // prefetch content のケア
            await this.treatPrefetchContents();
            this.publish('changed', changeInfo);
        }
        finally {
            this._inChangingPage = false;
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: transition prepare
    /** @internal */
    async prepareChangeContext(changeInfo) {
        const nextRoute = changeInfo.to;
        const prevRoute = changeInfo.from;
        const { '@params': nextParams } = nextRoute;
        const { '@params': prevParams } = prevRoute ?? {};
        // page instance
        await ensureRouterPageInstance(nextRoute);
        // page $template
        await ensureRouterPageTemplate(nextParams);
        changeInfo.samePageInstance = prevParams?.page && prevParams.page === nextParams.page;
        const { reload, samePageInstance, asyncProcess } = changeInfo;
        // page $el
        if (!reload && samePageInstance) {
            await this.cloneContent(nextRoute, nextParams, prevRoute, changeInfo, asyncProcess);
        }
        else if (!nextRoute.el) {
            await this.loadContent(nextRoute, nextParams, changeInfo, asyncProcess);
        }
        const $elNext = dom(nextRoute.el);
        const pageNext = nextParams.page;
        // mount
        if (!$elNext.isConnected) {
            await this.mountContent($elNext, pageNext, changeInfo, asyncProcess);
        }
        return [
            pageNext, $elNext, // next
            (reload && {} || (prevParams?.page ?? {})), (reload && dom(null) || dom(prevRoute?.el)), // prev
        ];
    }
    /** @internal */
    async cloneContent(nextRoute, nextParams, prevRoute, changeInfo, asyncProcess) {
        nextRoute.el = prevRoute.el;
        prevRoute.el = nextRoute.el?.cloneNode(true);
        dom(prevRoute.el).removeAttr('id').insertBefore(nextRoute.el);
        dom(nextRoute.el)
            .addClass(`${this._cssPrefix}-${"hidden" /* CssName.HIDDEN */}`)
            .removeClass([`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`, `${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`]);
        this.publish('cloned', changeInfo);
        this.triggerPageCallback('cloned', nextParams.page, changeInfo);
        await asyncProcess.complete();
    }
    /** @internal */
    async loadContent(route, params, changeInfo, asyncProcess) {
        let fireEvents = true;
        if (!route.el) {
            const elCache = this._routes[route.path]['@route']?.el;
            fireEvents = !elCache;
            if (elCache) { // dom-cache case
                route.el = elCache;
            }
            else if (params.$template?.isConnected) { // prefetch case
                route.el = params.$template[0];
                params.$template = params.$template.clone();
            }
            else {
                route.el = params.$template.clone()[0];
            }
        }
        // update master cache
        if (route !== this._routes[route.path]['@route']) {
            this._routes[route.path]['@route'] = route;
        }
        if (fireEvents) {
            this.publish('loaded', changeInfo);
            await asyncProcess.complete();
            this.triggerPageCallback('init', params.page, changeInfo);
            await asyncProcess.complete();
        }
    }
    /** @internal */
    async mountContent($el, page, changeInfo, asyncProcess) {
        $el.addClass(`${this._cssPrefix}-${"hidden" /* CssName.HIDDEN */}`);
        this._$el.append($el);
        this.publish('mounted', changeInfo);
        this.triggerPageCallback('mounted', page, changeInfo);
        await asyncProcess.complete();
    }
    /** @internal */
    unmountContent(route) {
        const $el = dom(route.el);
        const page = route['@params'].page;
        if ($el.isConnected) {
            $el.detach();
            this.publish('unmounted', route);
            this.triggerPageCallback('unmounted', page, route);
        }
        if (route.el) {
            route.el = null;
            this.publish('unloaded', route);
            this.triggerPageCallback('removed', page, route);
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: transition core
    /** @internal */
    async transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo) {
        const transition = changeInfo.transition ?? this._transitionSettings.default;
        const { 'enter-from-class': customEnterFromClass, 'enter-active-class': customEnterActiveClass, 'enter-to-class': customEnterToClass, 'leave-from-class': customLeaveFromClass, 'leave-active-class': customLeaveActiveClass, 'leave-to-class': customLeaveToClass, } = this._transitionSettings;
        // enter-css-class
        const enterFromClass = customEnterFromClass ?? `${transition}-${"enter-from" /* CssName.ENTER_FROM_CLASS */}`;
        const enterActiveClass = customEnterActiveClass ?? `${transition}-${"enter-active" /* CssName.ENTER_ACTIVE_CLASS */}`;
        const enterToClass = customEnterToClass ?? `${transition}-${"enter-to" /* CssName.ENTER_TO_CLASS */}`;
        // leave-css-class
        const leaveFromClass = customLeaveFromClass ?? `${transition}-${"leave-from" /* CssName.LEAVE_FROM_CLASS */}`;
        const leaveActiveClass = customLeaveActiveClass ?? `${transition}-${"leave-active" /* CssName.LEAVE_ACTIVE_CLASS */}`;
        const leaveToClass = customLeaveToClass ?? `${transition}-${"leave-to" /* CssName.LEAVE_TO_CLASS */}`;
        await this.beginTransition(pageNext, $elNext, enterFromClass, enterActiveClass, pagePrev, $elPrev, leaveFromClass, leaveActiveClass, changeInfo);
        await this.waitFrame();
        // transision execution
        await Promise.all([
            processPageTransition($elNext, enterFromClass, enterActiveClass, enterToClass),
            processPageTransition($elPrev, leaveFromClass, leaveActiveClass, leaveToClass),
        ]);
        await this.waitFrame();
        await this.endTransition(pageNext, $elNext, pagePrev, $elPrev, changeInfo);
        return transition;
    }
    /** @internal transition proc : begin */
    async beginTransition(pageNext, $elNext, enterFromClass, enterActiveClass, pagePrev, $elPrev, leaveFromClass, leaveActiveClass, changeInfo) {
        this._$el.addClass([
            `${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`,
            `${this._cssPrefix}-${"transition-direction" /* CssName.TRANSITION_DIRECTION */}-${decideTransitionDirection(changeInfo)}`,
        ]);
        $elNext
            .addClass([enterFromClass, `${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`])
            .removeClass(`${this._cssPrefix}-${"hidden" /* CssName.HIDDEN */}`)
            .reflow()
            .addClass(enterActiveClass);
        $elPrev.addClass([leaveFromClass, leaveActiveClass, `${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`]);
        this.publish('before-transition', changeInfo);
        this.triggerPageCallback('before-leave', pagePrev, changeInfo);
        this.triggerPageCallback('before-enter', pageNext, changeInfo);
        await changeInfo.asyncProcess.complete();
    }
    /** @internal transition proc : end */
    async endTransition(pageNext, $elNext, pagePrev, $elPrev, changeInfo) {
        ($elNext[0] !== $elPrev[0]) && $elPrev.addClass(`${this._cssPrefix}-${"hidden" /* CssName.HIDDEN */}`);
        $elNext.removeClass([`${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`]);
        $elPrev.removeClass([`${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`]);
        this._$el.removeClass([
            `${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`,
            `${this._cssPrefix}-${"transition-direction" /* CssName.TRANSITION_DIRECTION */}-${decideTransitionDirection(changeInfo)}`,
        ]);
        this.triggerPageCallback('after-leave', pagePrev, changeInfo);
        this.triggerPageCallback('after-enter', pageNext, changeInfo);
        this.publish('after-transition', changeInfo);
        await changeInfo.asyncProcess.complete();
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: transition finalize
    /** @internal update page status after transition */
    updateChangeContext($elNext, $elPrev, changeInfo, transition) {
        const { from, reload, samePageInstance, direction, to } = changeInfo;
        const prevRoute = from;
        const nextRoute = to;
        const urlChanged = !reload;
        if ($elNext[0] !== $elPrev[0]) {
            // update class
            $elPrev
                .removeClass(`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`)
                .addClass(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
            $elNext.addClass(`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`);
            if (urlChanged && this._prevRoute) {
                this._prevRoute.el?.classList.remove(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
                this.treatDomCacheContents(nextRoute, this._prevRoute);
            }
        }
        if (urlChanged) {
            this._prevRoute = prevRoute;
            if (samePageInstance) {
                $elPrev.detach();
                $elNext.addClass(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
                this._prevRoute && (this._prevRoute.el = null);
            }
        }
        this._lastRoute = this.currentRoute;
        'forward' === direction && transition && (this._lastRoute.transition = transition);
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: prefetch & dom cache
    /** @internal unset dom cached contents */
    releaseCacheContents(el) {
        for (const key of Object.keys(this._routes)) {
            const route = this._routes[key]['@route'];
            if (route) {
                if (null == el) {
                    this.unmountContent(route);
                }
                else if (route.el === el) {
                    route.el = null;
                }
            }
        }
        for (const route of this._history.stack) {
            if ((null == el && route.el) || route.el === el) {
                route.el = null;
            }
        }
    }
    /** @internal destruction of dom according to condition */
    treatDomCacheContents(nextRoute, prevRoute) {
        if (prevRoute.el && prevRoute.el !== this.currentRoute.el) {
            const $el = dom(prevRoute.el);
            const cacheLv = $el.data("dom-cache" /* DomCache.DATA_NAME */);
            if ("connect" /* DomCache.CACHE_LEVEL_CONNECT */ !== cacheLv) {
                const page = prevRoute['@params'].page;
                $el.detach();
                const fireEvents = prevRoute['@params'].page !== nextRoute['@params'].page;
                if (fireEvents) {
                    this.publish('unmounted', prevRoute);
                    this.triggerPageCallback('unmounted', page, prevRoute);
                }
                if ("memory" /* DomCache.CACHE_LEVEL_MEMORY */ !== cacheLv) {
                    this.releaseCacheContents(prevRoute.el);
                    prevRoute.el = null;
                    if (fireEvents) {
                        this.publish('unloaded', prevRoute);
                        this.triggerPageCallback('removed', page, prevRoute);
                    }
                }
            }
        }
    }
    /** @internal set dom prefetched contents */
    async setPrefetchContents(params) {
        const toRoute = (param, el) => {
            const ctx = toRouteContext(param.prefetch, this, param);
            ctx.el = el;
            return ctx;
        };
        const toRouteChangeInfo = (route) => {
            return {
                router: this,
                to: route,
                direction: 'none',
                asyncProcess: new RouteAyncProcessContext(),
                reload: false,
            };
        };
        for (const param of params) {
            const elRoute = param['@route']?.el;
            if (!elRoute || (this.currentRoute.el !== elRoute && this._lastRoute?.el !== elRoute && this._prevRoute?.el !== elRoute)) {
                await ensureRouterPageTemplate(param);
                const el = param.$template[0];
                if (!el.isConnected) {
                    const route = toRoute(param, el);
                    await ensureRouterPageInstance(route);
                    const changeInfo = toRouteChangeInfo(route);
                    const { asyncProcess } = changeInfo;
                    // load & init
                    await this.loadContent(route, param, changeInfo, asyncProcess);
                    // mount
                    await this.mountContent(dom(el), param.page, changeInfo, asyncProcess);
                }
            }
        }
    }
    /** @internal load prefetch dom contents */
    async treatPrefetchContents() {
        // 遷移先から prefetch content を検出
        const prefetchParams = [];
        const targets = this.currentRoute.el?.querySelectorAll(`[data-${"prefetch" /* LinkData.PREFETCH */}]`) ?? [];
        for (const el of targets) {
            const $el = dom(el);
            if (false !== $el.data("prefetch" /* LinkData.PREFETCH */)) {
                const url = $el.attr('href');
                const params = this.findRouteContextParams(url);
                if (params) {
                    params.prefetch = url;
                    prefetchParams.push(params);
                }
            }
        }
        await this.setPrefetchContents(prefetchParams);
    }
    ///////////////////////////////////////////////////////////////////////
    // event handlers:
    /** @internal `history` `changing` handler */
    onHistoryChanging(nextState, cancel, promises) {
        if (this._inChangingPage) {
            cancel(makeResult(RESULT_CODE.ERROR_MVC_ROUTER_BUSY));
            return;
        }
        const changeInfo = this.makeRouteChangeInfo(nextState, undefined);
        this.publish('will-change', changeInfo, cancel);
        promises.push(...changeInfo.asyncProcess.promises);
    }
    /** @internal `history` `refresh` handler */
    onHistoryRefresh(newState, oldState, promises) {
        const ensure = (state) => {
            const path = `/${state['@id']}`;
            const params = this.findRouteContextParams(path);
            if (null == params) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [path: ${path}]`, state);
            }
            if (null == state['@params']) {
                // RouteContextParameter を assign
                Object.assign(state, toRouteContext(path, this, params));
            }
            // id に紐づく要素がすでに存在する場合は割り当て
            state.el ??= this._history.direct(state['@id'])?.state?.el;
            return state;
        };
        try {
            // scheduling `refresh` done.
            promises.push(this.changePage(ensure(newState), oldState));
        }
        catch (e) {
            this.onHandleError(e);
        }
    }
    /** @internal error handler */
    onHandleError(error) {
        this.publish('error', isResult(error) ? error : makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, 'Route navigate failed.', error));
        console.error(error);
    }
    /** @internal anchor click handler */
    onAnchorClicked(event) {
        const $target = dom(event.target).closest('[href]');
        if ($target.data("prevent-router" /* LinkData.PREVENT_ROUTER */)) {
            return;
        }
        event.preventDefault();
        const url = $target.attr('href');
        const transition = $target.data("transition" /* LinkData.TRANSITION */);
        const method = $target.data("navigate-method" /* LinkData.NAVIAGATE_METHOD */);
        const methodOpts = ('push' === method || 'replace' === method ? { method } : {});
        if ('#' === url) {
            void this.back();
        }
        else {
            void this.navigate(url, { transition, ...methodOpts });
        }
    }
    /** @internal silent event listner scope */
    async suppressEventListenerScope(executor) {
        try {
            this._history.off('changing', this._historyChangingHandler);
            this._history.off('refresh', this._historyRefreshHandler);
            this._history.off('error', this._errorHandler);
            return await executor();
        }
        finally {
            this._history.on('changing', this._historyChangingHandler);
            this._history.on('refresh', this._historyRefreshHandler);
            this._history.on('error', this._errorHandler);
        }
    }
}
//__________________________________________________________________________________________________//
/**
 * @en Create {@link Router} object.
 * @ja {@link Router} オブジェクトを構築
 *
 * @param selector
 *  - `en` An object or the selector string which becomes origin of {@link DOM}.
 *  - `ja` {@link DOM} のもとになるインスタンスまたはセレクタ文字列
 * @param options
 *  - `en` {@link RouterConstructionOptions} object
 *  - `ja` {@link RouterConstructionOptions} オブジェクト
 */
function createRouter(selector, options) {
    return new RouterContext(selector, Object.assign({
        start: true,
    }, options));
}

export { createMemoryHistory, createRouter, createSessionHistory, disposeMemoryHistory, disposeSessionHistory, resetMemoryHistory, resetSessionHistory, toRouterPath, toRouterStackId };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImhpc3RvcnkvaW50ZXJuYWwudHMiLCJ1dGlscy50cyIsImhpc3Rvcnkvc2Vzc2lvbi50cyIsImhpc3RvcnkvbWVtb3J5LnRzIiwicm91dGVyL2ludGVybmFsLnRzIiwicm91dGVyL2FzeW5jLXByb2Nlc3MudHMiLCJyb3V0ZXIvY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFJPVVRFUiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDE1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1JPVVRFUl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5EICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDEsICdyb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMiwgJ1JvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAzLCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDQsICdJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0JVU1kgICAgICAgICAgICAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDUsICdJbiBjaGFuZ2luZyBwYWdlIHByb2Nlc3Mgbm93LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkwgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFBsYWluT2JqZWN0LFxuICAgIGF0LFxuICAgIHNvcnQsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHsgSGlzdG9yeVN0YXRlLCBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgbm9ybWFsemllIGlkIHN0cmluZyAqL1xuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZUlkID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAvLyByZW1vdmUgaGVhZCBvZiBcIiNcIiwgXCIvXCIsIFwiIy9cIiBhbmQgdGFpbCBvZiBcIi9cIlxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvXigjXFwvKXxeWyMvXXxcXHMrJC8sICcnKS5yZXBsYWNlKC9eXFxzKyR8KFxcLyQpLywgJycpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgc3RhY2sgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVEYXRhID0gPFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogSGlzdG9yeVN0YXRlPFQ+ID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7ICdAaWQnOiBub3JtYWxpemVJZChpZCkgfSwgc3RhdGUpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgdW5jYW5jZWxsYWJsZSBkZWZlcnJlZCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCA9ICh3YXJuOiBzdHJpbmcpOiBEZWZlcnJlZCA9PiB7XG4gICAgY29uc3QgdW5jYW5jZWxsYWJsZSA9IG5ldyBEZWZlcnJlZCgpIGFzIFdyaXRhYmxlPERlZmVycmVkPjtcbiAgICB1bmNhbmNlbGxhYmxlLnJlamVjdCA9ICgpID0+IHtcbiAgICAgICAgY29uc29sZS53YXJuKHdhcm4pO1xuICAgICAgICB1bmNhbmNlbGxhYmxlLnJlc29sdmUoKTtcbiAgICB9O1xuICAgIHJldHVybiB1bmNhbmNlbGxhYmxlO1xufTtcblxuLyoqIEBpbnRlcm5hbCBhc3NpZ24gc3RhdGUgZWxlbWVudCBpZiBhbHJlYWR5IGV4aXN0cyAqL1xuZXhwb3J0IGNvbnN0IGFzc2lnblN0YXRlRWxlbWVudCA9IChzdGF0ZTogSGlzdG9yeVN0YXRlLCBzdGFjazogSGlzdG9yeVN0YWNrKTogdm9pZCA9PiB7XG4gICAgY29uc3QgZWwgPSBzdGFjay5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICghc3RhdGUuZWwgJiYgZWwpICYmIChzdGF0ZS5lbCA9IGVsKTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBpbnRlcm5hbCBzdGFjayBtYW5hZ2VtZW50IGNvbW1vbiBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgSGlzdG9yeVN0YWNrPFQgPSBQbGFpbk9iamVjdD4ge1xuICAgIHByaXZhdGUgX3N0YWNrOiBIaXN0b3J5U3RhdGU8VD5bXSA9IFtdO1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5kaXN0YW5jZSgwKTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZVsnQGlkJ107XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgc2V0IGluZGV4KGlkeDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTWF0aC50cnVuYyhpZHgpO1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IGFycmF5KCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnNsaWNlKCk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIHBvc2l0aW9uIGluIHN0YWNrIGlzIGZpcnN0IG9yIG5vdCAqL1xuICAgIGdldCBpc0ZpcnN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gMCA9PT0gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIHBvc2l0aW9uIGluIHN0YWNrIGlzIGxhc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzTGFzdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4ID09PSB0aGlzLl9zdGFjay5sZW5ndGggLSAxO1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBwdWJsaWMgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLl9zdGFjaywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBjbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LiAqL1xuICAgIHB1YmxpYyBjbGVhckZvcndhcmQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrID0gdGhpcy5fc3RhY2suc2xpY2UoMCwgdGhpcy5faW5kZXggKyAxKTtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC4gKi9cbiAgICBwdWJsaWMgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWQgPSBub3JtYWxpemVJZChpZCk7XG4gICAgICAgIGNvbnN0IHsgX2luZGV4OiBiYXNlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gdGhpcy5fc3RhY2tcbiAgICAgICAgICAgIC5tYXAoKHMsIGluZGV4KSA9PiB7IHJldHVybiB7IGluZGV4LCBkaXN0YW5jZTogTWF0aC5hYnMoYmFzZSAtIGluZGV4KSwgLi4ucyB9OyB9KVxuICAgICAgICAgICAgLmZpbHRlcihzID0+IHNbJ0BpZCddID09PSBpZClcbiAgICAgICAgO1xuICAgICAgICBzb3J0KGNhbmRpZGF0ZXMsIChsLCByKSA9PiAobC5kaXN0YW5jZSA+IHIuZGlzdGFuY2UgPyAxIDogLTEpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZXNbMF0/LmluZGV4O1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IHN0YWNrIGluZm9ybWF0aW9uIGJ5IHRvIElEIGFuZCBmcm9tIElELiAqL1xuICAgIHB1YmxpYyBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIGNvbnN0IHRvSW5kZXggICA9IHRoaXMuY2xvc2VzdCh0b0lkKTtcbiAgICAgICAgY29uc3QgZnJvbUluZGV4ID0gbnVsbCA9PSBmcm9tSWQgPyB0aGlzLl9pbmRleCA6IHRoaXMuY2xvc2VzdChmcm9tSWQpO1xuICAgICAgICBpZiAobnVsbCA9PSBmcm9tSW5kZXggfHwgbnVsbCA9PSB0b0luZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb246ICdtaXNzaW5nJyB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0b0luZGV4IC0gZnJvbUluZGV4O1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gMCA9PT0gZGVsdGFcbiAgICAgICAgICAgICAgICA/ICdub25lJ1xuICAgICAgICAgICAgICAgIDogZGVsdGEgPCAwID8gJ2JhY2snIDogJ2ZvcndhcmQnO1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uLCBkZWx0YSwgaW5kZXg6IHRvSW5kZXgsIHN0YXRlOiB0aGlzLl9zdGFja1t0b0luZGV4XSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCBhY3RpdmUgZGF0YSBmcm9tIGN1cnJlbnQgaW5kZXggb3JpZ2luICovXG4gICAgcHVibGljIGRpc3RhbmNlKGRlbHRhOiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICBjb25zdCBwb3MgPSB0aGlzLl9pbmRleCArIGRlbHRhO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7dGhpcy5sZW5ndGh9LCBnaXZlbjogJHtwb3N9XWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmF0KHBvcyk7XG4gICAgfVxuXG4gICAgLyoqIG5vb3Agc3RhY2sgKi9cbiAgICBwdWJsaWMgbm9vcFN0YWNrID0gbm9vcDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbWVtYmVyLWFjY2Vzc2liaWxpdHlcblxuICAgIC8qKiBwdXNoIHN0YWNrICovXG4gICAgcHVibGljIHB1c2hTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbKyt0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiByZXBsYWNlIHN0YWNrICovXG4gICAgcHVibGljIHJlcGxhY2VTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogc2VlayBzdGFjayAqL1xuICAgIHB1YmxpYyBzZWVrU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jbG9zZXN0KGRhdGFbJ0BpZCddKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YWNrKGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBkaXNwb3NlIG9iamVjdCAqL1xuICAgIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbmRleCA9IE5hTjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB3ZWJSb290IH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHsgVVJMIH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgbm9ybWFsaXplSWQgfSBmcm9tICcuL2hpc3RvcnkvaW50ZXJuYWwnO1xuXG4vKiogcmUtZXhwb3J0ICovXG5leHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5cbi8qKlxuICogQGVuIEdlbmVyYXRlcyBhbiBJRCB0byBiZSB1c2VkIGJ5IHRoZSBzdGFjayBpbnNpZGUgdGhlIHJvdXRlci5cbiAqIEBqYSDjg6vjg7zjgr/jg7zlhoXpg6jjga4gc3RhY2sg44GM5L2/55So44GZ44KLIElEIOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc3BlY2lmaWVzIHdoZXJlIHRoZSBwYXRoIHN0cmluZyBpcyBjcmVhdGVkIGZyb20gW2V4OiBgbG9jYXRpb24uaGFzaGAsIGBsb2NhdGlvbi5ocmVmYCwgYCNwYXRoYCwgYHBhdGhgLCBgL3BhdGhgXVxuICogIC0gYGphYCBwYXRoIOaWh+Wtl+WIl+OBruS9nOaIkOWFg+OCkuaMh+WumiBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlclN0YWNrSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChVUkwuY2FuUGFyc2Uoc3JjKSkge1xuICAgICAgICBjb25zdCB7IGhhc2ggfSA9IG5ldyBVUkwoc3JjKTtcbiAgICAgICAgcmV0dXJuIGhhc2ggPyBub3JtYWxpemVJZChoYXNoKSA6IG5vcm1hbGl6ZUlkKHNyYy5zdWJzdHJpbmcod2ViUm9vdC5sZW5ndGgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplSWQoc3JjKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIG5vcm1hbGl6ZWQgYC88aWQ+YCBzdHJpbmcgZnJvbSB0aGUgdXJsIC8gcGF0aC5cbiAqIEBqYSB1cmwgLyBwYXRoIOOCkuaMh+WumuOBl+OBpiwg5q2j6KaP5YyW44GX44GfIGAvPHN0YWNrIGlkPmAg5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzcGVjaWZpZXMgd2hlcmUgdGhlIHBhdGggc3RyaW5nIGlzIGNyZWF0ZWQgZnJvbSBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKiAgLSBgamFgIHBhdGgg5paH5a2X5YiX44Gu5L2c5oiQ5YWD44KS5oyH5a6aIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVyUGF0aCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGAvJHt0b1JvdXRlclN0YWNrSWQoc3JjKX1gO1xufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgaXNPYmplY3QsXG4gICAgbm9vcCxcbiAgICAkY2RwLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBTaWxlbmNlYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB0b1JvdXRlclN0YWNrSWQgYXMgdG9JZCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc2V0RGlzcGF0Y2hJbmZvID0gPFQ+KHN0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICAoc3RhdGVbJGNkcF0gYXMgRGlzcGF0Y2hJbmZvPFQ+KSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4pOiBbVCwgRGlzcGF0Y2hJbmZvPFQ+P10gPT4ge1xuICAgIGlmIChpc09iamVjdChzdGF0ZSkgJiYgc3RhdGVbJGNkcF0pIHtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbCA9IHN0YXRlWyRjZHBdO1xuICAgICAgICBkZWxldGUgc3RhdGVbJGNkcF07XG4gICAgICAgIHJldHVybiBbc3RhdGUsIGFkZGl0aW9uYWwgYXMgRGlzcGF0Y2hJbmZvPFQ+XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW3N0YXRlXTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnU2Vzc2lvbkhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCcm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9tb2RlOiAnaGFzaCcgfCAnaGlzdG9yeSc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9wU3RhdGVIYW5kbGVyOiAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHZvaWQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG4gICAgcHJpdmF0ZSBfZGZHbz86IERlZmVycmVkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3aW5kb3dDb250eHQ6IFdpbmRvdywgbW9kZTogJ2hhc2gnIHwgJ2hpc3RvcnknLCBpZD86IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW5kb3dDb250eHQ7XG4gICAgICAgIHRoaXMuX21vZGUgPSBtb2RlO1xuXG4gICAgICAgIHRoaXMuX3BvcFN0YXRlSGFuZGxlciA9IHRoaXMub25Qb3BTdGF0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQgPz8gdG9JZCh0aGlzLl93aW5kb3cubG9jYXRpb24uaHJlZiksIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBwcmV2U3RhdGUgPSB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICB0aGlzLnNldEluZGV4KDApO1xuICAgICAgICBhd2FpdCB0aGlzLmNsZWFyRm9yd2FyZCgpO1xuXG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkKCdTZXNzaW9uSGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpLFxuICAgICAgICAgICAgICAgIG5ld0lkOiB0b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogJ25vb3AnLFxuICAgICAgICAgICAgICAgIHByZXZTdGF0ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyh0aGlzLnN0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICAvLyBpZiBhbHJlYWR5IGNhbGxlZCwgbm8gcmVhY3Rpb24uXG4gICAgICAgIGlmICh0aGlzLl9kZkdvKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICBpZiAoIWRlbHRhKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCB0aGlzLnN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2RmR28gPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2RmR287XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsZWFyRm9yd2FyZEhpc3RvcnkoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBkZXN0aW5hdGlvbiBzdGFjayBpbmZvcm1hdGlvbiBieSBgc3RhcnRgIGFuZCBgZW5kYCBJRC5cbiAgICAgKiBAamEg6LW354K5LCDntYLngrnjga4gSUQg44KS5oyH5a6a44GX44Gm44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KHRvSWQsIGZyb21JZCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBVUkwgKi9cbiAgICBwcml2YXRlIHRvVXJsKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gKCdoYXNoJyA9PT0gdGhpcy5fbW9kZSkgPyBgJHtDb25zdC5IQVNIX1BSRUZJWH0ke2lkfWAgOiB0b1VybChpZCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uLCBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWQgPSBkYXRhWydAaWQnXTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIGRhdGFbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuICAgICAgICBoaXN0b3J5W2Ake21ldGhvZH1TdGF0ZWBdKGRhdGEsICcnLCB0aGlzLnRvVXJsKGlkKSk7XG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KGRhdGEsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogbmV3IERlZmVycmVkKGNhbmNlbCksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgbmV4dFN0YXRlOiBkYXRhLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKGRhdGEsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0oZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRpc3BhdGNoIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBkaXNwYXRjaENoYW5nZUluZm8obmV3U3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHNldERpc3BhdGNoSW5mbyhuZXdTdGF0ZSwgYWRkaXRpb25hbCk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBQb3BTdGF0ZUV2ZW50KCdwb3BzdGF0ZScsIHsgc3RhdGUgfSkpO1xuICAgICAgICBhd2FpdCBhZGRpdGlvbmFsLmRmO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IHBvcHN0YXRlIGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPikgPT4gUHJvbWlzZTx2b2lkPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgICAgIGNvbnN0IHdhaXRQb3BTdGF0ZSA9ICgpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIChldjogUG9wU3RhdGVFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShldi5zdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IGV4ZWN1dG9yKHdhaXRQb3BTdGF0ZSk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCByb2xsYmFjayBoaXN0b3J5ICovXG4gICAgcHJpdmF0ZSBhc3luYyByb2xsYmFja0hpc3RvcnkobWV0aG9kOiBzdHJpbmcsIG5ld0lkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZSh0aGlzLnN0YXRlLCAnJywgdGhpcy50b1VybCh0aGlzLmlkKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwdXNoJzpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgIGhpc3RvcnkuZ28oLTEpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdGhpcy5pbmRleCAtIHRoaXMuY2xvc2VzdChuZXdJZCkhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCAhPT0gZGVsdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWx0YSAmJiBoaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY2xlYXIgZm9yd2FyZCBzZXNzaW9uIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LiAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJGb3J3YXJkSGlzdG9yeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNPcmlnaW4gPSAoc3Q6IEFjY2Vzc2libGU8dW5rbm93bj4pOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Q/LlsnQG9yaWdpbiddIGFzIGJvb2xlYW47XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IGhpc3Rvcnkuc3RhdGU7XG5cbiAgICAgICAgICAgIC8vIGJhY2sgdG8gc2Vzc2lvbiBvcmlnaW5cbiAgICAgICAgICAgIHdoaWxlICghaXNPcmlnaW4oc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGVuc3VyZSA9IChzcmM6IEFjY2Vzc2libGU8dW5rbm93bj4pOiB1bmtub3duID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdHggPSB7IC4uLnNyYyB9O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ3JvdXRlciddO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ0BwYXJhbXMnXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdHgpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGZvcndhcmQgZnJvbSBpbmRleCAxIHRvIGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAxLCBuID0gdGhpcy5fc3RhY2subGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3QgPSB0aGlzLl9zdGFjay5hdChpKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnB1c2hTdGF0ZShlbnN1cmUoc3QpLCAnJywgdGhpcy50b1VybChzdFsnQGlkJ10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIHJlY2VpdmUgYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIG9uUG9wU3RhdGUoZXY6IFBvcFN0YXRlRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBbbmV3U3RhdGUsIGFkZGl0aW9uYWxdID0gcGFyc2VEaXNwYXRjaEluZm8oZXYuc3RhdGUpO1xuICAgICAgICBjb25zdCBuZXdJZCAgID0gYWRkaXRpb25hbD8ubmV3SWQgPz8gdG9JZChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgY29uc3QgbWV0aG9kICA9IGFkZGl0aW9uYWw/LnBvc3Rwcm9jID8/ICdzZWVrJztcbiAgICAgICAgY29uc3QgZGYgICAgICA9IGFkZGl0aW9uYWw/LmRmID8/IHRoaXMuX2RmR28gPz8gbmV3IERlZmVycmVkKCk7XG4gICAgICAgIGNvbnN0IG9sZERhdGEgPSBhZGRpdGlvbmFsPy5wcmV2U3RhdGUgPz8gdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IGFkZGl0aW9uYWw/Lm5leHRTdGF0ZSA/PyB0aGlzLmRpcmVjdChuZXdJZCkuc3RhdGUgPz8gY3JlYXRlRGF0YShuZXdJZCwgbmV3U3RhdGUpO1xuICAgICAgICBjb25zdCB7IGNhbmNlbCwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICBkZi5jYXRjaChub29wKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld0RhdGEsIGNhbmNlbCk7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0b2tlbi5yZWFzb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld0RhdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3RGF0YSwgb2xkRGF0YSk7XG5cbiAgICAgICAgICAgIGRmLnJlc29sdmUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gaGlzdG9yeSDjgpLlhYPjgavmiLvjgZlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbGJhY2tIaXN0b3J5KG1ldGhvZCwgbmV3SWQpO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdlcnJvcicsIGUpO1xuICAgICAgICAgICAgZGYucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4ge0BsaW5rIGNyZWF0ZVNlc3Npb25IaXN0b3J5fSgpIG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIGNyZWF0ZVNlc3Npb25IaXN0b3J5fSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICpcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMge1xuICAgIGNvbnRleHQ/OiBXaW5kb3c7XG4gICAgbW9kZT86ICdoYXNoJyB8ICdoaXN0b3J5Jztcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zfSBvYmplY3RcbiAqICAtIGBqYWAge0BsaW5rIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkPzogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMpOiBJSGlzdG9yeTxUPiB7XG4gICAgY29uc3QgeyBjb250ZXh0LCBtb2RlIH0gPSBPYmplY3QuYXNzaWduKHsgbW9kZTogJ2hhc2gnIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgU2Vzc2lvbkhpc3RvcnkoY29udGV4dCA/PyB3aW5kb3csIG1vZGUsIGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikucmVzZXQob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIERpc3Bvc2UgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPik6IHZvaWQge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHsgdHlwZSBQbGFpbk9iamVjdCwgcG9zdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ01lbW9yeUhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyA/PyB7fTtcblxuICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ01lbW9yeUhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ25vb3AnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gYmFjayBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkJhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNGaXJzdDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzTGFzdDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hdChpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3Qgb2xkSW5kZXggPSB0aGlzLmluZGV4O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBpZiBnaXZlbiAwLCBqdXN0IHJlbG9hZC5cbiAgICAgICAgICAgIGNvbnN0IG9sZFN0YXRlID0gZGVsdGEgPyB0aGlzLnN0YXRlIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLl9zdGFjay5kaXN0YW5jZShkZWx0YSA/PyAwKTtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKCdzZWVrJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XG4gICAgICAgICAgICB0aGlzLnNldEluZGV4KG9sZEluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyRm9yd2FyZCgpOiBQcm9taXNlPHZvaWQ+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVxdWlyZS1hd2FpdFxuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBkZXN0aW5hdGlvbiBzdGFjayBpbmZvcm1hdGlvbiBieSBgc3RhcnRgIGFuZCBgZW5kYCBJRC5cbiAgICAgKiBAamEg6LW354K5LCDntYLngrnjga4gSUQg44GL44KJ57WC54K544Gu44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KHRvSWQsIGZyb21JZCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBldmVudCAmIHdhaXQgcHJvY2VzcyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJpZ2dlckV2ZW50QW5kV2FpdChcbiAgICAgICAgZXZlbnQ6ICdyZWZyZXNoJyB8ICdjaGFuZ2luZycsXG4gICAgICAgIGFyZzE6IEhpc3RvcnlTdGF0ZTxUPixcbiAgICAgICAgYXJnMjogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkIHwgKChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICB0aGlzLnB1Ymxpc2goZXZlbnQsIGFyZzEsIGFyZzIgYXMgYW55LCBwcm9taXNlcyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcblxuICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIG5ld1N0YXRlWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KG5ld1N0YXRlLCB0aGlzLl9zdGFjayBhcyBIaXN0b3J5U3RhY2spO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZChjYW5jZWwpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZShtZXRob2QsIGRmLCBuZXdTdGF0ZSwgdGhpcy5zdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2Ugc3RhdGUgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25DaGFuZ2VTdGF0ZShtZXRob2Q6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJywgZGY6IERlZmVycmVkLCBuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgnY2hhbmdpbmcnLCBuZXdTdGF0ZSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3U3RhdGUsIG9sZFN0YXRlKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgbWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBJSGlzdG9yeTxUPiB7XG4gICAgcmV0dXJuIG5ldyBNZW1vcnlIaXN0b3J5KGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IG1lbW9yeSBoaXN0b3J5LlxuICogQGphIOODoeODouODquWxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBNZW1vcnlIaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYE1lbW9yeUhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBNZW1vcnlIaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsImltcG9ydCB7IHBhdGgycmVnZXhwIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFdyaXRhYmxlLFxuICAgIHR5cGUgQ2xhc3MsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGFzc2lnblZhbHVlLFxuICAgIHNsZWVwLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIHRvUXVlcnlTdHJpbmdzLFxuICAgIHBhcnNlVXJsUXVlcnksXG4gICAgY29udmVydFVybFBhcmFtVHlwZSxcbn0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7XG4gICAgdHlwZSBET00sXG4gICAgdHlwZSBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHtcbiAgICB0b1VybCxcbiAgICBsb2FkVGVtcGxhdGVTb3VyY2UsXG4gICAgdG9UZW1wbGF0ZUVsZW1lbnQsXG59IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBIaXN0b3J5RGlyZWN0aW9uLFxuICAgIHR5cGUgSUhpc3RvcnksXG4gICAgY3JlYXRlU2Vzc2lvbkhpc3RvcnksXG4gICAgY3JlYXRlTWVtb3J5SGlzdG9yeSxcbn0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBQYWdlLFxuICAgIFJvdXRlUGF0aFBhcmFtcyxcbiAgICBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgUm91dGUsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCB9IGZyb20gJy4vYXN5bmMtcHJvY2Vzcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENzc05hbWUge1xuICAgIERFRkFVTFRfUFJFRklYICAgICAgID0gJ2NkcCcsXG4gICAgVFJBTlNJVElPTl9ESVJFQ1RJT04gPSAndHJhbnNpdGlvbi1kaXJlY3Rpb24nLFxuICAgIFRSQU5TSVRJT05fUlVOTklORyAgID0gJ3RyYW5zaXRpb24tcnVubmluZycsXG4gICAgUEFHRV9DVVJSRU5UICAgICAgICAgPSAncGFnZS1jdXJyZW50JyxcbiAgICBQQUdFX1BSRVZJT1VTICAgICAgICA9ICdwYWdlLXByZXZpb3VzJyxcbiAgICBISURERU4gICAgICAgICAgICAgICA9ICdoaWRkZW4nLFxuICAgIEVOVEVSX0ZST01fQ0xBU1MgICAgID0gJ2VudGVyLWZyb20nLFxuICAgIEVOVEVSX0FDVElWRV9DTEFTUyAgID0gJ2VudGVyLWFjdGl2ZScsXG4gICAgRU5URVJfVE9fQ0xBU1MgICAgICAgPSAnZW50ZXItdG8nLFxuICAgIExFQVZFX0ZST01fQ0xBU1MgICAgID0gJ2xlYXZlLWZyb20nLFxuICAgIExFQVZFX0FDVElWRV9DTEFTUyAgID0gJ2xlYXZlLWFjdGl2ZScsXG4gICAgTEVBVkVfVE9fQ0xBU1MgICAgICAgPSAnbGVhdmUtdG8nLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBEb21DYWNoZSB7XG4gICAgREFUQV9OQU1FICAgICAgICAgICA9ICdkb20tY2FjaGUnLFxuICAgIENBQ0hFX0xFVkVMX01FTU9SWSAgPSAnbWVtb3J5JyxcbiAgICBDQUNIRV9MRVZFTF9DT05ORUNUID0gJ2Nvbm5lY3QnLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBMaW5rRGF0YSB7XG4gICAgVFJBTlNJVElPTiAgICAgICA9ICd0cmFuc2l0aW9uJyxcbiAgICBOQVZJQUdBVEVfTUVUSE9EID0gJ25hdmlnYXRlLW1ldGhvZCcsXG4gICAgUFJFRkVUQ0ggICAgICAgICA9ICdwcmVmZXRjaCcsXG4gICAgUFJFVkVOVF9ST1VURVIgICA9ICdwcmV2ZW50LXJvdXRlcicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENvbnN0IHtcbiAgICBXQUlUX1RSQU5TSVRJT05fTUFSR0lOID0gMTAwLCAvLyBtc2VjXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFBhZ2VFdmVudCA9ICdpbml0JyB8ICdtb3VudGVkJyB8ICdjbG9uZWQnIHwgJ2JlZm9yZS1lbnRlcicgfCAnYWZ0ZXItZW50ZXInIHwgJ2JlZm9yZS1sZWF2ZScgfCAnYWZ0ZXItbGVhdmUnIHwgJ3VubW91bnRlZCcgfCAncmVtb3ZlZCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCBleHRlbmRzIFJvdXRlQ2hhbmdlSW5mbyB7XG4gICAgcmVhZG9ubHkgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dDtcbiAgICBzYW1lUGFnZUluc3RhbmNlPzogYm9vbGVhbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZmxhdCBSb3V0ZVBhcmFtZXRlcnMgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSBPbWl0PFJvdXRlUGFyYW1ldGVycywgJ3JvdXRlcyc+ICYge1xuICAgIC8qKiByZWdleHAgZnJvbSBwYXRoICovXG4gICAgcmVnZXhwOiBSZWdFeHA7XG4gICAgLyoqIGtleXMgb2YgcGFyYW1zICovXG4gICAgcGFyYW1LZXlzOiBzdHJpbmdbXTtcbiAgICAvKiogRE9NIHRlbXBsYXRlIGluc3RhbmNlIHdpdGggUGFnZSBlbGVtZW50ICovXG4gICAgJHRlbXBsYXRlPzogRE9NO1xuICAgIC8qKiByb3V0ZXIgcGFnZSBpbnN0YW5jZSBmcm9tIGBjb21wb25lbnRgIHByb3BlcnR5ICovXG4gICAgcGFnZT86IFBhZ2U7XG4gICAgLyoqIGxhdGVzdCByb3V0ZSBjb250ZXh0IGNhY2hlICovXG4gICAgJ0Byb3V0ZSc/OiBSb3V0ZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgPSBSb3V0ZVN1YkZsb3dQYXJhbXMgJiBSZXF1aXJlZDxQYWdlVHJhbnNpdGlvblBhcmFtcz4gJiB7XG4gICAgb3JpZ2luOiBzdHJpbmc7XG59O1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0ID0gV3JpdGFibGU8Um91dGU+ICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyAmIHtcbiAgICAnQHBhcmFtcyc6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQ7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBidWlsdC1pbiBjc3MgKi9cbmV4cG9ydCBjb25zdCBhcHBseUJ1aWx0SW5Dc3MgPSAoY29udGV4dDogdHlwZW9mIGdsb2JhbFRoaXMsIHByZWZpeDogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgY29uc3Qgc3R5bGVUZXh0ID0gYFxuICAgIC4ke3ByZWZpeH0tdHJhbnNpdGlvbi1ydW5uaW5nIHtcbiAgICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgfVxuICAgIC4ke3ByZWZpeH0taGlkZGVuIHtcbiAgICAgICAgdmlzaWJpbGl0eTogaGlkZGVuO1xuICAgICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB9XG4gICAgYDtcbiAgICBjb25zdCBzaGVldCA9IG5ldyBjb250ZXh0LkNTU1N0eWxlU2hlZXQoKTtcbiAgICBzaGVldC5yZXBsYWNlU3luYyhzdHlsZVRleHQpO1xuXG4gICAgY29uc3QgeyBkb2N1bWVudDogcm9vdCB9ID0gY29udGV4dDtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHJvb3QuYWRvcHRlZFN0eWxlU2hlZXRzO1xuICAgIHJvb3QuYWRvcHRlZFN0eWxlU2hlZXRzID0gWy4uLmRlZmF1bHRzLCBzaGVldF07XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHRvIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0ID0gKHVybDogc3RyaW5nLCByb3V0ZXI6IFJvdXRlciwgcGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBuYXZPcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFJvdXRlQ29udGV4dCA9PiB7XG4gICAgLy8gb21pdCB1bmNsb25hYmxlIHByb3BzXG4gICAgY29uc3QgZnJvbU5hdmlnYXRlID0gISFuYXZPcHRpb25zO1xuICAgIGNvbnN0IGVuc3VyZUNsb25lID0gKGN0eDogdW5rbm93bik6IFJvdXRlQ29udGV4dCA9PiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICB7XG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICByb3V0ZXI6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHJvdXRlcixcbiAgICAgICAgfSxcbiAgICAgICAgbmF2T3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICAgICAgICAgIHF1ZXJ5OiB7fSxcbiAgICAgICAgICAgIHBhcmFtczoge30sXG4gICAgICAgICAgICBwYXRoOiBwYXJhbXMucGF0aCxcbiAgICAgICAgICAgICdAcGFyYW1zJzogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcGFyYW1zLFxuICAgICAgICB9LFxuICAgICk7XG4gICAgcmV0dXJuIGZyb21OYXZpZ2F0ZSA/IGVuc3VyZUNsb25lKGNvbnRleHQpIDogY29udGV4dCBhcyBSb3V0ZUNvbnRleHQ7XG59O1xuXG4vKiogQGludGVybmFsIGNvbnZlcnQgY29udGV4dCBwYXJhbXMgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSAocm91dGVzOiBSb3V0ZVBhcmFtZXRlcnMgfCBSb3V0ZVBhcmFtZXRlcnNbXSB8IHVuZGVmaW5lZCk6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9PiB7XG4gICAgY29uc3QgZmxhdHRlbiA9IChwYXJlbnRQYXRoOiBzdHJpbmcsIG5lc3RlZDogUm91dGVQYXJhbWV0ZXJzW10pOiBSb3V0ZVBhcmFtZXRlcnNbXSA9PiB7XG4gICAgICAgIGNvbnN0IHJldHZhbDogUm91dGVQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBuIG9mIG5lc3RlZCkge1xuICAgICAgICAgICAgbi5wYXRoID0gYCR7cGFyZW50UGF0aC5yZXBsYWNlKC9cXC8kLywgJycpfS8ke25vcm1hbGl6ZUlkKG4ucGF0aCl9YDtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKG4pO1xuICAgICAgICAgICAgaWYgKG4ucm91dGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goLi4uZmxhdHRlbihuLnBhdGgsIG4ucm91dGVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZsYXR0ZW4oJycsIGlzQXJyYXkocm91dGVzKSA/IHJvdXRlcyA6IHJvdXRlcyA/IFtyb3V0ZXNdIDogW10pXG4gICAgICAgIC5tYXAoKHNlZWQ6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyByZWdleHAsIGtleXMgfSA9IHBhdGgycmVnZXhwLnBhdGhUb1JlZ2V4cChzZWVkLnBhdGgpO1xuICAgICAgICAgICAgICAgIHNlZWQucmVnZXhwID0gcmVnZXhwO1xuICAgICAgICAgICAgICAgIHNlZWQucGFyYW1LZXlzID0ga2V5cy5maWx0ZXIoayA9PiBpc1N0cmluZyhrLm5hbWUpKS5tYXAoayA9PiBrLm5hbWUpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VlZDtcbiAgICAgICAgfSk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBwcmVwYXJlIElIaXN0b3J5IG9iamVjdCAqL1xuZXhwb3J0IGNvbnN0IHByZXBhcmVIaXN0b3J5ID0gKHNlZWQ6ICdoYXNoJyB8ICdoaXN0b3J5JyB8ICdtZW1vcnknIHwgSUhpc3RvcnkgPSAnaGFzaCcsIGluaXRpYWxQYXRoPzogc3RyaW5nLCBjb250ZXh0PzogV2luZG93KTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgcmV0dXJuIChpc1N0cmluZyhzZWVkKVxuICAgICAgICA/ICdtZW1vcnknID09PSBzZWVkID8gY3JlYXRlTWVtb3J5SGlzdG9yeShpbml0aWFsUGF0aCA/PyAnJykgOiBjcmVhdGVTZXNzaW9uSGlzdG9yeShpbml0aWFsUGF0aCwgdW5kZWZpbmVkLCB7IG1vZGU6IHNlZWQsIGNvbnRleHQgfSlcbiAgICAgICAgOiBzZWVkXG4gICAgKSBhcyBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW5zdXJlUGF0aFBhcmFtcyA9IChwYXJhbXM6IFJvdXRlUGF0aFBhcmFtcyB8IHVuZGVmaW5lZCk6IHBhdGgycmVnZXhwLlBhcmFtRGF0YSA9PiB7XG4gICAgY29uc3QgcGF0aFBhcmFtczogcGF0aDJyZWdleHAuUGFyYW1EYXRhID0ge307XG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhwYXJhbXMpKSB7XG4gICAgICAgICAgICBwYXRoUGFyYW1zW2tleV0gPSBTdHJpbmcocGFyYW1zW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXRoUGFyYW1zO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGJ1aWxkTmF2aWdhdGVVcmwgPSAocGF0aDogc3RyaW5nLCBvcHRpb25zOiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogc3RyaW5nID0+IHtcbiAgICB0cnkge1xuICAgICAgICBwYXRoID0gYC8ke25vcm1hbGl6ZUlkKHBhdGgpfWA7XG4gICAgICAgIGNvbnN0IHsgcXVlcnksIHBhcmFtcyB9ID0gb3B0aW9ucztcbiAgICAgICAgbGV0IHVybCA9IHBhdGgycmVnZXhwLmNvbXBpbGUocGF0aCkoZW5zdXJlUGF0aFBhcmFtcyhwYXJhbXMpKTtcbiAgICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKHF1ZXJ5KX1gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELFxuICAgICAgICAgICAgYENvbnN0cnVjdCByb3V0ZSBkZXN0aW5hdGlvbiBmYWlsZWQuIFtwYXRoOiAke3BhdGh9LCBkZXRhaWw6ICR7ZXJyb3IudG9TdHJpbmcoKX1dYCxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICApO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBwYXJzZVVybFBhcmFtcyA9IChyb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCA9PiB7XG4gICAgY29uc3QgeyB1cmwgfSA9IHJvdXRlO1xuICAgIHJvdXRlLnF1ZXJ5ICA9IHVybC5pbmNsdWRlcygnPycpID8gcGFyc2VVcmxRdWVyeShub3JtYWxpemVJZCh1cmwpKSA6IHt9O1xuICAgIHJvdXRlLnBhcmFtcyA9IHt9O1xuXG4gICAgY29uc3QgeyByZWdleHAsIHBhcmFtS2V5cyB9ID0gcm91dGVbJ0BwYXJhbXMnXTtcbiAgICBpZiAocGFyYW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSByZWdleHAuZXhlYyh1cmwpPy5tYXAoKHZhbHVlLCBpbmRleCkgPT4geyByZXR1cm4geyB2YWx1ZSwga2V5OiBwYXJhbUtleXNbaW5kZXggLSAxXSB9OyB9KTtcbiAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMhKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwYXJhbS5rZXkgJiYgbnVsbCAhPSBwYXJhbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKHJvdXRlLnBhcmFtcywgcGFyYW0ua2V5LCBjb252ZXJ0VXJsUGFyYW1UeXBlKHBhcmFtLnZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyNpbnN0YW5jZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZSA9IGFzeW5jIChyb3V0ZTogUm91dGVDb250ZXh0KTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgY29uc3QgeyAnQHBhcmFtcyc6IHBhcmFtcyB9ID0gcm91dGU7XG5cbiAgICBpZiAocGFyYW1zLnBhZ2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCB7IGNvbXBvbmVudCwgY29tcG9uZW50T3B0aW9ucyB9ID0gcGFyYW1zO1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBhcmFtcy5wYWdlID0gbmV3IChjb21wb25lbnQgYXMgdW5rbm93biBhcyBDbGFzcykocm91dGUsIGNvbXBvbmVudE9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHBhcmFtcy5wYWdlID0gYXdhaXQgY29tcG9uZW50KHJvdXRlLCBjb21wb25lbnRPcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY29tcG9uZW50KSkge1xuICAgICAgICBwYXJhbXMucGFnZSA9IE9iamVjdC5hc3NpZ24oeyAnQHJvdXRlJzogcm91dGUsICdAb3B0aW9ucyc6IGNvbXBvbmVudE9wdGlvbnMgfSwgY29tcG9uZW50KSBhcyBQYWdlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0geyAnQHJvdXRlJzogcm91dGUsICdAb3B0aW9ucyc6IGNvbXBvbmVudE9wdGlvbnMgfSBhcyBQYWdlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIyR0ZW1wbGF0ZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZSA9IGFzeW5jIChwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBpZiAocGFyYW1zLiR0ZW1wbGF0ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IGVuc3VyZUluc3RhbmNlID0gKGVsOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCk6IERPTSA9PiB7XG4gICAgICAgIHJldHVybiBlbCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyAkKFsuLi5lbC5jb250ZW50LmNoaWxkcmVuXSkgYXMgRE9NIDogJChlbCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHsgY29udGVudCB9ID0gcGFyYW1zO1xuICAgIGlmIChudWxsID09IGNvbnRlbnQpIHtcbiAgICAgICAgLy8gbm9vcCBlbGVtZW50XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSAkPEhUTUxFbGVtZW50PigpO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoKGNvbnRlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydzZWxlY3RvciddKSkge1xuICAgICAgICAvLyBmcm9tIGFqYXhcbiAgICAgICAgY29uc3QgeyBzZWxlY3RvciwgdXJsIH0gPSBjb250ZW50IGFzIHsgc2VsZWN0b3I6IHN0cmluZzsgdXJsPzogc3RyaW5nOyB9O1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRvVGVtcGxhdGVFbGVtZW50KGF3YWl0IGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgeyB1cmw6IHVybCAmJiB0b1VybCh1cmwpIH0pKTtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoYHRlbXBsYXRlIGxvYWQgZmFpbGVkLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCB1cmw6ICR7dXJsfV1gKTtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UodGVtcGxhdGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbihjb250ZW50KSkge1xuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UoJChhd2FpdCBjb250ZW50KCkpWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UoJChjb250ZW50IGFzIERPTVNlbGVjdG9yKVswXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIG5ld2x5IGNyZWF0ZWRcbn07XG5cbi8qKiBAaW50ZXJuYWwgZGVjaWRlIHRyYW5zaXRpb24gZGlyZWN0aW9uICovXG5leHBvcnQgY29uc3QgZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbiA9IChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiBIaXN0b3J5RGlyZWN0aW9uID0+IHtcbiAgICBpZiAoY2hhbmdlSW5mby5yZXZlcnNlKSB7XG4gICAgICAgIHN3aXRjaCAoY2hhbmdlSW5mby5kaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2JhY2snOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZm9yd2FyZCc7XG4gICAgICAgICAgICBjYXNlICdmb3J3YXJkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2JhY2snO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlSW5mby5kaXJlY3Rpb247XG59O1xuXG4vKiogQGludGVybmFsICovXG50eXBlIEVmZmVjdFR5cGUgPSAnYW5pbWF0aW9uJyB8ICd0cmFuc2l0aW9uJztcblxuLyoqIEBpbnRlcm5hbCByZXRyaWV2ZSBlZmZlY3QgZHVyYXRpb24gcHJvcGVydHkgKi9cbmNvbnN0IGdldEVmZmVjdER1cmF0aW9uU2VjID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUpOiBudW1iZXIgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUoJGVsWzBdKVtgJHtlZmZlY3R9RHVyYXRpb25gXSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHdhaXRGb3JFZmZlY3QgPSAoJGVsOiBET00sIGVmZmVjdDogRWZmZWN0VHlwZSwgZHVyYXRpb25TZWM6IG51bWJlcik6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW1xuICAgICAgICBuZXcgUHJvbWlzZShyZXNvbHZlID0+ICRlbFtgJHtlZmZlY3R9RW5kYF0ocmVzb2x2ZSkpLFxuICAgICAgICBzbGVlcChkdXJhdGlvblNlYyAqIDEwMDAgKyBDb25zdC5XQUlUX1RSQU5TSVRJT05fTUFSR0lOKSxcbiAgICBdKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBleGVjdXRpb24gKi9cbmV4cG9ydCBjb25zdCBwcm9jZXNzUGFnZVRyYW5zaXRpb24gPSBhc3luYygkZWw6IERPTSwgZnJvbUNsYXNzOiBzdHJpbmcsIGFjdGl2ZUNsYXNzOiBzdHJpbmcsIHRvQ2xhc3M6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICRlbC5yZW1vdmVDbGFzcyhmcm9tQ2xhc3MpO1xuICAgICRlbC5hZGRDbGFzcyh0b0NsYXNzKTtcblxuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBbJ2FuaW1hdGlvbicsICd0cmFuc2l0aW9uJ10gYXMgRWZmZWN0VHlwZVtdKSB7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gZ2V0RWZmZWN0RHVyYXRpb25TZWMoJGVsLCBlZmZlY3QpO1xuICAgICAgICBkdXJhdGlvbiAmJiBwcm9taXNlcy5wdXNoKHdhaXRGb3JFZmZlY3QoJGVsLCBlZmZlY3QsIGR1cmF0aW9uKSk7XG4gICAgfVxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgICRlbC5yZW1vdmVDbGFzcyhbYWN0aXZlQ2xhc3MsIHRvQ2xhc3NdKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3MgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIFJvdXRlQXluY1Byb2Nlc3MgaW1wbGVtZW50YXRpb24gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCBpbXBsZW1lbnRzIFJvdXRlQXluY1Byb2Nlc3Mge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Byb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlQXluY1Byb2Nlc3NcblxuICAgIHJlZ2lzdGVyKHByb21pc2U6IFByb21pc2U8dW5rbm93bj4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcHJvbWlzZXMucHVzaChwcm9taXNlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbCBtZXRob2RzOlxuXG4gICAgZ2V0IHByb21pc2VzKCk6IHJlYWRvbmx5IFByb21pc2U8dW5rbm93bj5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcm9taXNlcztcbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgY29tcGxldGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHRoaXMuX3Byb21pc2VzKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZXMubGVuZ3RoID0gMDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgQWNjZXNzaWJsZSxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2FtZWxpemUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IE5hdGl2ZVByb21pc2UgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBpc1Jlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHRvUm91dGVyUGF0aCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIHR5cGUgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgdHlwZSBSb3V0ZXJFdmVudCxcbiAgICB0eXBlIFBhZ2UsXG4gICAgdHlwZSBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgdHlwZSBSb3V0ZSxcbiAgICB0eXBlIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICB0eXBlIE5hdmlnYXRpb25TZXR0aW5ncyxcbiAgICB0eXBlIFBhZ2VTdGFjayxcbiAgICB0eXBlIFB1c2hQYWdlU3RhY2tPcHRpb25zLFxuICAgIHR5cGUgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIHR5cGUgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICB0eXBlIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgdHlwZSBSb3V0ZXIsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBDc3NOYW1lLFxuICAgIERvbUNhY2hlLFxuICAgIExpbmtEYXRhLFxuICAgIHR5cGUgUGFnZUV2ZW50LFxuICAgIHR5cGUgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQsXG4gICAgdHlwZSBSb3V0ZUNvbnRleHQsXG4gICAgdHlwZSBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgIGFwcGx5QnVpbHRJbkNzcyxcbiAgICB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdG9Sb3V0ZUNvbnRleHQsXG4gICAgcHJlcGFyZUhpc3RvcnksXG4gICAgYnVpbGROYXZpZ2F0ZVVybCxcbiAgICBwYXJzZVVybFBhcmFtcyxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UsXG4gICAgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlLFxuICAgIGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24sXG4gICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFJvdXRlciBpbXBsaW1lbnQgY2xhc3MuXG4gKiBAamEgUm91dGVyIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSb3V0ZXJDb250ZXh0IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8Um91dGVyRXZlbnQ+IGltcGxlbWVudHMgUm91dGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXM6IFJlY29yZDxzdHJpbmcsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnM+ID0ge307XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kZWw6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yYWY6IFVua25vd25GdW5jdGlvbjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5Q2hhbmdpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeVJlZnJlc2hIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5UmVmcmVzaDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lcnJvckhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhhbmRsZUVycm9yO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Nzc1ByZWZpeDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RyYW5zaXRpb25TZXR0aW5nczogVHJhbnNpdGlvblNldHRpbmdzO1xuICAgIHByaXZhdGUgX25hdmlnYXRpb25TZXR0aW5nczogUmVxdWlyZWQ8TmF2aWdhdGlvblNldHRpbmdzPjtcbiAgICBwcml2YXRlIF9sYXN0Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfcHJldlJvdXRlPzogUm91dGVDb250ZXh0O1xuICAgIHByaXZhdGUgX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXM7XG4gICAgcHJpdmF0ZSBfaW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9uczogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgZWwsXG4gICAgICAgICAgICB3aW5kb3c6IGNvbnRleHQsXG4gICAgICAgICAgICBoaXN0b3J5LFxuICAgICAgICAgICAgaW5pdGlhbFBhdGgsXG4gICAgICAgICAgICBhZGRpdGlvbmFsU3RhY2tzLFxuICAgICAgICAgICAgY3NzUHJlZml4LFxuICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgICAgIG5hdmlnYXRpb24sXG4gICAgICAgIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgdGhpcy5fcmFmID0gY29udGV4dD8ucmVxdWVzdEFuaW1hdGlvbkZyYW1lID8/IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cbiAgICAgICAgdGhpcy5fJGVsID0gJChzZWxlY3RvciwgZWwpO1xuICAgICAgICBpZiAoIXRoaXMuXyRlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCwgYFJvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yIGFzIHN0cmluZ31dYCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9oaXN0b3J5ID0gcHJlcGFyZUhpc3RvcnkoaGlzdG9yeSwgaW5pdGlhbFBhdGgsIGNvbnRleHQhKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlciA9IHRoaXMub25IaXN0b3J5Q2hhbmdpbmcuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyICA9IHRoaXMub25IaXN0b3J5UmVmcmVzaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9lcnJvckhhbmRsZXIgICAgICAgICAgID0gdGhpcy5vbkhhbmRsZUVycm9yLmJpbmQodGhpcyk7XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG5cbiAgICAgICAgLy8gZm9sbG93IGFuY2hvclxuICAgICAgICB0aGlzLl8kZWwub24oJ2NsaWNrJywgJ1tocmVmXScsIHRoaXMub25BbmNob3JDbGlja2VkLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX2Nzc1ByZWZpeCA9IGNzc1ByZWZpeCA/PyBDc3NOYW1lLkRFRkFVTFRfUFJFRklYO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgZGVmYXVsdDogJ25vbmUnLCByZWxvYWQ6ICdub25lJyB9LCB0cmFuc2l0aW9uKTtcbiAgICAgICAgdGhpcy5fbmF2aWdhdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IG1ldGhvZDogJ3B1c2gnIH0sIG5hdmlnYXRpb24pO1xuXG4gICAgICAgIC8vIGJ1aWx0LWluIGNzc1xuICAgICAgICBhcHBseUJ1aWx0SW5Dc3MoKGNvbnRleHQgPz8gd2luZG93KSBhcyB1bmtub3duIGFzIHR5cGVvZiBnbG9iYWxUaGlzLCB0aGlzLl9jc3NQcmVmaXgpO1xuXG4gICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVnaXN0ZXIocm91dGVzISwgZmFsc2UpO1xuICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxTdGFja3M/Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucHVzaFBhZ2VTdGFjayhhZGRpdGlvbmFsU3RhY2tzLCB7IG5vTmF2aWdhdGU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFydCAmJiBhd2FpdCB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfSkoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZXJcblxuICAgIC8qKiBSb3V0ZXIncyB2aWV3IEhUTUwgZWxlbWVudCAqL1xuICAgIGdldCBlbCgpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kZWxbMF07XG4gICAgfVxuXG4gICAgLyoqIE9iamVjdCB3aXRoIGN1cnJlbnQgcm91dGUgZGF0YSAqL1xuICAgIGdldCBjdXJyZW50Um91dGUoKTogUm91dGUge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgc3RhdGUgaXMgaW4gc3ViLWZsb3cgKi9cbiAgICBnZXQgaXNJblN1YkZsb3coKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuZmluZFN1YkZsb3dQYXJhbXMoZmFsc2UpO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBpdCBjYW4gZ28gYmFjayBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkJhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LmNhbkJhY2s7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuRm9yd2FyZDtcbiAgICB9XG5cbiAgICAvKiogUm91dGUgcmVnaXN0cmF0aW9uICovXG4gICAgYXN5bmMgcmVnaXN0ZXIocm91dGVzOiBSb3V0ZVBhcmFtZXRlcnMgfCBSb3V0ZVBhcmFtZXRlcnNbXSwgcmVmcmVzaCA9IGZhbHNlKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHByZWZldGNoUGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyhyb3V0ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3V0ZXNbY29udGV4dC5wYXRoXSA9IGNvbnRleHQ7XG4gICAgICAgICAgICBjb25zdCB7IGNvbnRlbnQsIHByZWZldGNoIH0gPSBjb250ZXh0O1xuICAgICAgICAgICAgY29udGVudCAmJiBwcmVmZXRjaCAmJiBwcmVmZXRjaFBhcmFtcy5wdXNoKGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJlZmV0Y2hQYXJhbXMubGVuZ3RoICYmIGF3YWl0IHRoaXMuc2V0UHJlZmV0Y2hDb250ZW50cyhwcmVmZXRjaFBhcmFtcyk7XG4gICAgICAgIHJlZnJlc2ggJiYgYXdhaXQgdGhpcy5yZWZyZXNoKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIE5hdmlnYXRlIHRvIG5ldyBwYWdlLiAqL1xuICAgIGFzeW5jIG5hdmlnYXRlKHRvOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHRvKTtcbiAgICAgICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsIGBSb3V0ZSBub3QgZm91bmQuIFt0bzogJHt0b31dYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG9wdHMgICA9IE9iamVjdC5hc3NpZ24oeyBpbnRlbnQ6IHVuZGVmaW5lZCB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgICA9IGJ1aWxkTmF2aWdhdGVVcmwodG8sIG9wdHMpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgID0gdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBzZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMubWV0aG9kID8/IHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncy5tZXRob2Q7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gZXhlYyBuYXZpZ2F0ZVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnlbbWV0aG9kXSh1cmwsIHJvdXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEFkZCBwYWdlIHN0YWNrIHN0YXJ0aW5nIGZyb20gdGhlIGN1cnJlbnQgaGlzdG9yeS4gKi9cbiAgICBhc3luYyBwdXNoUGFnZVN0YWNrKHN0YWNrOiBQYWdlU3RhY2sgfCBQYWdlU3RhY2tbXSwgb3B0aW9ucz86IFB1c2hQYWdlU3RhY2tPcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IG5vTmF2aWdhdGUsIHRyYXZlcnNlVG8gfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgICAgICBjb25zdCBzdGFja3MgPSBpc0FycmF5KHN0YWNrKSA/IHN0YWNrIDogW3N0YWNrXTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlcyA9IHN0YWNrcy5maWx0ZXIocyA9PiAhIXMucm91dGUpLm1hcChzID0+IHMucm91dGUhKTtcblxuICAgICAgICAgICAgLy8gZW5zcnVlIFJvdXRlXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlZ2lzdGVyKHJvdXRlcywgZmFsc2UpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBwdXNoIGhpc3RvcnlcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhZ2Ugb2Ygc3RhY2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogdXJsLCB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBwYWdlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gdG9Sb3V0ZXJQYXRoKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbcGF0aDogJHt1cmx9XWAsIHBhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbGVudCByZWdpc3RyeVxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGVDb250ZXh0KHBhdGgsIHRoaXMsIHBhcmFtcywgeyBpbnRlbnQ6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUudHJhbnNpdGlvbiA9IHRyYW5zaXRpb247XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLnJldmVyc2UgICAgPSByZXZlcnNlO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMuX2hpc3RvcnkucHVzaChwYXRoLCByb3V0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAgICAgICAgIGlmICh0cmF2ZXJzZVRvKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkudHJhdmVyc2VUbyh0b1JvdXRlclBhdGgodHJhdmVyc2VUbykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIW5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBwYXRoIHN0cmluZy4gKi9cbiAgICBhc3luYyB0cmF2ZXJzZVRvKHNyYzogc3RyaW5nKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkudHJhdmVyc2VUbyh0b1JvdXRlclBhdGgoc3JjKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBCZWdpbiBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBiZWdpblN1YkZsb3codG86IHN0cmluZywgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtcywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdCEsXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW46IHRoaXMuY3VycmVudFJvdXRlLnVybCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN1YmZsb3csXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlU3ViRmxvd1BhcmFtcyhwYXJhbXMpO1xuICAgICAgICAgICAgKHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dCkuc3ViZmxvdyA9IHBhcmFtcztcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubmF2aWdhdGUodG8sIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENvbW1pdCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjb21taXRTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl9zdWJmbG93VHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGNvbnN0IHsgYWRkaXRpb25hbERpc3RhbmNlLCBhZGRpdGlvbmFsU3RhY2tzIH0gPSBzdWJmbG93LnBhcmFtcztcbiAgICAgICAgY29uc3QgZGlzdGFuY2UgPSBzdWJmbG93LmRpc3RhbmNlICsgYWRkaXRpb25hbERpc3RhbmNlO1xuXG4gICAgICAgIGlmIChhZGRpdGlvbmFsU3RhY2tzPy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoKCkgPT4gdGhpcy5nbygtMSAqIGRpc3RhbmNlKSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnB1c2hQYWdlU3RhY2soYWRkaXRpb25hbFN0YWNrcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogZGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENhbmNlbCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjYW5jZWxTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl9zdWJmbG93VHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBzdWJmbG93LmRpc3RhbmNlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogU2V0IGNvbW1vbiB0cmFuc2l0aW9uIHNldHRuaWdzLiAqL1xuICAgIHRyYW5zaXRpb25TZXR0aW5ncyhuZXdTZXR0aW5ncz86IFRyYW5zaXRpb25TZXR0aW5ncyk6IFRyYW5zaXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi50aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgfTtcbiAgICAgICAgbmV3U2V0dGluZ3MgJiYgT2JqZWN0LmFzc2lnbih0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MsIG5ld1NldHRpbmdzKTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIG5hdmlnYXRpb24gc2V0dG5pZ3MuICovXG4gICAgbmF2aWdhdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogTmF2aWdhdGlvblNldHRpbmdzKTogTmF2aWdhdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFJlZnJlc2ggcm91dGVyIChzcGVjaWZ5IHVwZGF0ZSBsZXZlbCkuICovXG4gICAgYXN5bmMgcmVmcmVzaChsZXZlbCA9IFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSBSb3V0ZXJSZWZyZXNoTGV2ZWwuUkVMT0FEOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdvKCk7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5ET01fQ0xFQVI6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbGVhc2VDYWNoZUNvbnRlbnRzKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlICYmICh0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsISk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bnN1cHBvcnRlZCBsZXZlbDogJHtsZXZlbH1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogc3ViLWZsb3dcblxuICAgIC8qKiBAaW50ZXJuYWwgZXZhbHVhdGUgc3ViLWZsb3cgcGFyYW1ldGVycyAqL1xuICAgIHByaXZhdGUgZXZhbHVhdGVTdWJGbG93UGFyYW1zKHN1YmZsb3c6IFJvdXRlU3ViRmxvd1BhcmFtcyk6IHZvaWQge1xuICAgICAgICBsZXQgYWRkaXRpb25hbERpc3RhbmNlID0gMDtcblxuICAgICAgICBpZiAoc3ViZmxvdy5iYXNlKSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlSWQgPSBub3JtYWxpemVJZChzdWJmbG93LmJhc2UpO1xuICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCB7IGluZGV4LCBzdGFjayB9ID0gdGhpcy5faGlzdG9yeTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBpbmRleDsgaSA+PSAwOyBpLS0sIGFkZGl0aW9uYWxEaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YWNrW2ldWydAaWQnXSA9PT0gYmFzZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9JTlZBTElEX1NVQkZMT1dfQkFTRV9VUkwsIGBJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLiBbdXJsOiAke3N1YmZsb3cuYmFzZX1dYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdWJmbG93LmJhc2UgPSB0aGlzLmN1cnJlbnRSb3V0ZS51cmw7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHN1YmZsb3csIHsgYWRkaXRpb25hbERpc3RhbmNlIH0pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBmaW5kU3ViRmxvd1BhcmFtcyhkZXRhY2g6IGJvb2xlYW4pOiB7IGRpc3RhbmNlOiBudW1iZXI7IHBhcmFtczogUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07IH0gfCB2b2lkIHtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSB0aGlzLl9oaXN0b3J5LnN0YWNrO1xuICAgICAgICBmb3IgKGxldCBpID0gc3RhY2subGVuZ3RoIC0gMSwgZGlzdGFuY2UgPSAwOyBpID49IDA7IGktLSwgZGlzdGFuY2UrKykge1xuICAgICAgICAgICAgaWYgKHN0YWNrW2ldLnN1YmZsb3cpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBzdGFja1tpXS5zdWJmbG93IGFzIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgJiB7IGFkZGl0aW9uYWxEaXN0YW5jZTogbnVtYmVyOyB9O1xuICAgICAgICAgICAgICAgIGRldGFjaCAmJiBkZWxldGUgc3RhY2tbaV0uc3ViZmxvdztcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkaXN0YW5jZSwgcGFyYW1zIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gdXRpbHNcblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGBSb3V0ZXJFdmVudEFyZ2AgbWFrZXIgKi9cbiAgICBwcml2YXRlIG1ha2VSb3V0ZUNoYW5nZUluZm8obmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IHtcbiAgICAgICAgY29uc3QgaW50ZW50ID0gbmV3U3RhdGUuaW50ZW50O1xuICAgICAgICBkZWxldGUgbmV3U3RhdGUuaW50ZW50OyAvLyBuYXZpZ2F0ZSDmmYLjgavmjIflrprjgZXjgozjgZ8gaW50ZW50IOOBryBvbmUgdGltZSDjga7jgb/mnInlirnjgavjgZnjgotcblxuICAgICAgICBjb25zdCBmcm9tID0gKG9sZFN0YXRlID8/IHRoaXMuX2xhc3RSb3V0ZSkgYXMgQWNjZXNzaWJsZTxSb3V0ZUNvbnRleHQsIHN0cmluZz4gfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHRoaXMuX2hpc3RvcnkuZGlyZWN0KG5ld1N0YXRlWydAaWQnXSwgZnJvbT8uWydAaWQnXSkuZGlyZWN0aW9uO1xuICAgICAgICBjb25zdCBhc3luY1Byb2Nlc3MgPSBuZXcgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQoKTtcbiAgICAgICAgY29uc3QgcmVsb2FkID0gZnJvbSA/IG5ld1N0YXRlLnVybCA9PT0gZnJvbS51cmwgOiB0cnVlO1xuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfVxuICAgICAgICAgICAgPSB0aGlzLl9zdWJmbG93VHJhbnNpdGlvblBhcmFtcyA/PyAocmVsb2FkXG4gICAgICAgICAgICAgICAgPyB7IHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5yZWxvYWQsIHJldmVyc2U6IGZhbHNlIH1cbiAgICAgICAgICAgICAgICA6ICgnYmFjaycgIT09IGRpcmVjdGlvbiA/IG5ld1N0YXRlIDogZnJvbSBhcyBSb3V0ZUNvbnRleHQpKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgZnJvbSxcbiAgICAgICAgICAgIHRvOiBuZXdTdGF0ZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbixcbiAgICAgICAgICAgIGFzeW5jUHJvY2VzcyxcbiAgICAgICAgICAgIHJlbG9hZCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgaW50ZW50LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCByb3V0ZSBieSB1cmwgKi9cbiAgICBwcml2YXRlIGZpbmRSb3V0ZUNvbnRleHRQYXJhbXMocGF0aDogc3RyaW5nKTogUm91dGVDb250ZXh0UGFyYW1ldGVycyB8IHZvaWQge1xuICAgICAgICBjb25zdCBrZXkgPSBgLyR7bm9ybWFsaXplSWQocGF0aC5zcGxpdCgnPycpWzBdKX1gO1xuICAgICAgICBmb3IgKGNvbnN0IHBhdGggb2YgT2JqZWN0LmtleXModGhpcy5fcm91dGVzKSkge1xuICAgICAgICAgICAgY29uc3QgeyByZWdleHAgfSA9IHRoaXMuX3JvdXRlc1twYXRoXTtcbiAgICAgICAgICAgIGlmIChyZWdleHAudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JvdXRlc1twYXRoXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBwYWdlIGV2ZW50ICovXG4gICAgcHJpdmF0ZSB0cmlnZ2VyUGFnZUNhbGxiYWNrKGV2ZW50OiBQYWdlRXZlbnQsIHRhcmdldDogUGFnZSB8IHVuZGVmaW5lZCwgYXJnOiBSb3V0ZSB8IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWV0aG9kID0gY2FtZWxpemUoYHBhZ2UtJHtldmVudH1gKTtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oKHRhcmdldCBhcyBBY2Nlc3NpYmxlPFBhZ2UsIFVua25vd25GdW5jdGlvbj4gfCB1bmRlZmluZWQpPy5bbWV0aG9kXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9ICh0YXJnZXQgYXMgQWNjZXNzaWJsZTxQYWdlLCBVbmtub3duRnVuY3Rpb24+KVttZXRob2RdKGFyZyk7XG4gICAgICAgICAgICBpZiAocmV0dmFsIGluc3RhbmNlb2YgTmF0aXZlUHJvbWlzZSAmJiAoYXJnIGFzIEFjY2Vzc2libGU8Um91dGU+KVsnYXN5bmNQcm9jZXNzJ10pIHtcbiAgICAgICAgICAgICAgICAoYXJnIGFzIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpLmFzeW5jUHJvY2Vzcy5yZWdpc3RlcihyZXR2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB3YWl0IGZyYW1lICovXG4gICAgcHJpdmF0ZSB3YWl0RnJhbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB3YWl0RnJhbWUoMSwgdGhpcy5fcmFmKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZW50cmFuY2VcblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHBhZ2UgbWFpbiBwcm9jZWR1cmUgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZVBhZ2UobmV4dFJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgcHJldlJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgICBwYXJzZVVybFBhcmFtcyhuZXh0Um91dGUpO1xuXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRSb3V0ZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgLy8gdHJhbnNpdGlvbiBjb3JlXG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gYXdhaXQgdGhpcy50cmFuc2l0aW9uUGFnZShwYWdlTmV4dCwgJGVsTmV4dCwgcGFnZVByZXYsICRlbFByZXYsIGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZUNvbnRleHQoJGVsTmV4dCwgJGVsUHJldiwgY2hhbmdlSW5mbywgdHJhbnNpdGlvbik7XG5cbiAgICAgICAgICAgIC8vIOmBt+enu+WFiOOBjCBzdWJmbG93IOmWi+Wni+eCueOBp+OBguOCi+WgtOWQiCwgc3ViZmxvdyDop6PpmaRcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUudXJsID09PSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKT8ucGFyYW1zLm9yaWdpbikge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHJlZmV0Y2ggY29udGVudCDjga7jgrHjgqJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJlYXRQcmVmZXRjaENvbnRlbnRzKCk7XG5cbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBwcmVwYXJlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogUHJvbWlzZTxbUGFnZSwgRE9NLCBQYWdlLCBET01dPiB7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IGNoYW5nZUluZm8udG8gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGNoYW5nZUluZm8uZnJvbSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogbmV4dFBhcmFtcyB9ID0gbmV4dFJvdXRlO1xuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcHJldlBhcmFtcyB9ID0gcHJldlJvdXRlID8/IHt9O1xuXG4gICAgICAgIC8vIHBhZ2UgaW5zdGFuY2VcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKG5leHRSb3V0ZSk7XG4gICAgICAgIC8vIHBhZ2UgJHRlbXBsYXRlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShuZXh0UGFyYW1zKTtcblxuICAgICAgICBjaGFuZ2VJbmZvLnNhbWVQYWdlSW5zdGFuY2UgPSBwcmV2UGFyYW1zPy5wYWdlICYmIHByZXZQYXJhbXMucGFnZSA9PT0gbmV4dFBhcmFtcy5wYWdlO1xuICAgICAgICBjb25zdCB7IHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuXG4gICAgICAgIC8vIHBhZ2UgJGVsXG4gICAgICAgIGlmICghcmVsb2FkICYmIHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xvbmVDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgcHJldlJvdXRlISwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmICghbmV4dFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRlbE5leHQgPSAkKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2VOZXh0ID0gbmV4dFBhcmFtcy5wYWdlITtcblxuICAgICAgICAvLyBtb3VudFxuICAgICAgICBpZiAoISRlbE5leHQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubW91bnRDb250ZW50KCRlbE5leHQsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0XG4gICAgICAgICAgICAocmVsb2FkICYmIHt9IHx8IChwcmV2UGFyYW1zPy5wYWdlID8/IHt9KSksIChyZWxvYWQgJiYgJChudWxsKSB8fCAkKHByZXZSb3V0ZT8uZWwpKSwgLy8gcHJldlxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsb25lQ29udGVudChcbiAgICAgICAgbmV4dFJvdXRlOiBSb3V0ZUNvbnRleHQsIG5leHRQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgICAgIHByZXZSb3V0ZTogUm91dGVDb250ZXh0LFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBuZXh0Um91dGUuZWwgPSBwcmV2Um91dGUuZWw7XG4gICAgICAgIHByZXZSb3V0ZS5lbCA9IG5leHRSb3V0ZS5lbD8uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAkKHByZXZSb3V0ZS5lbCkucmVtb3ZlQXR0cignaWQnKS5pbnNlcnRCZWZvcmUobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgJChuZXh0Um91dGUuZWwpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuSElEREVOfWApXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWBdKVxuICAgICAgICA7XG4gICAgICAgIHRoaXMucHVibGlzaCgnY2xvbmVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnY2xvbmVkJywgbmV4dFBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgbG9hZENvbnRlbnQoXG4gICAgICAgIHJvdXRlOiBSb3V0ZUNvbnRleHQsIHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgbGV0IGZpcmVFdmVudHMgPSB0cnVlO1xuXG4gICAgICAgIGlmICghcm91dGUuZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsQ2FjaGUgPSB0aGlzLl9yb3V0ZXNbcm91dGUucGF0aF1bJ0Byb3V0ZSddPy5lbDtcbiAgICAgICAgICAgIGZpcmVFdmVudHMgPSAhZWxDYWNoZTtcbiAgICAgICAgICAgIGlmIChlbENhY2hlKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG9tLWNhY2hlIGNhc2VcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IGVsQ2FjaGU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy4kdGVtcGxhdGU/LmlzQ29ubmVjdGVkKSB7IC8vIHByZWZldGNoIGNhc2VcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCAgICAgICAgID0gcGFyYW1zLiR0ZW1wbGF0ZVswXTtcbiAgICAgICAgICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gcGFyYW1zLiR0ZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IHBhcmFtcy4kdGVtcGxhdGUhLmNsb25lKClbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGUgbWFzdGVyIGNhY2hlXG4gICAgICAgIGlmIChyb3V0ZSAhPT0gdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSkge1xuICAgICAgICAgICAgdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSA9IHJvdXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpcmVFdmVudHMpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbG9hZGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnaW5pdCcsIHBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgbW91bnRDb250ZW50KFxuICAgICAgICAkZWw6IERPTSwgcGFnZTogUGFnZSB8IHVuZGVmaW5lZCxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgJGVsLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLkhJRERFTn1gKTtcbiAgICAgICAgdGhpcy5fJGVsLmFwcGVuZCgkZWwpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ21vdW50ZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdtb3VudGVkJywgcGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVubW91bnRDb250ZW50KHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgJGVsID0gJChyb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2UgPSByb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgIGlmICgkZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcm91dGUpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJvdXRlLmVsKSB7XG4gICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBjb3JlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gY2hhbmdlSW5mby50cmFuc2l0aW9uID8/IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0O1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICdlbnRlci1mcm9tLWNsYXNzJzogY3VzdG9tRW50ZXJGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItYWN0aXZlLWNsYXNzJzogY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdlbnRlci10by1jbGFzcyc6IGN1c3RvbUVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1mcm9tLWNsYXNzJzogY3VzdG9tTGVhdmVGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtYWN0aXZlLWNsYXNzJzogY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS10by1jbGFzcyc6IGN1c3RvbUxlYXZlVG9DbGFzcyxcbiAgICAgICAgfSA9IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncztcblxuICAgICAgICAvLyBlbnRlci1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgZW50ZXJGcm9tQ2xhc3MgICA9IGN1c3RvbUVudGVyRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJBY3RpdmVDbGFzcyA9IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlclRvQ2xhc3MgICAgID0gY3VzdG9tRW50ZXJUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfVE9fQ0xBU1N9YDtcblxuICAgICAgICAvLyBsZWF2ZS1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgbGVhdmVGcm9tQ2xhc3MgICA9IGN1c3RvbUxlYXZlRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVBY3RpdmVDbGFzcyA9IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZVRvQ2xhc3MgICAgID0gY3VzdG9tTGVhdmVUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfVE9fQ0xBU1N9YDtcblxuICAgICAgICBhd2FpdCB0aGlzLmJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAvLyB0cmFuc2lzaW9uIGV4ZWN1dGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsIGVudGVyVG9DbGFzcyksXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGxlYXZlVG9DbGFzcyksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5lbmRUcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRyYW5zaXRpb247XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBiZWdpbiAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLCBlbnRlckZyb21DbGFzczogc3RyaW5nLCBlbnRlckFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sIGxlYXZlRnJvbUNsYXNzOiBzdHJpbmcsIGxlYXZlQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fJGVsLmFkZENsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICAkZWxOZXh0XG4gICAgICAgICAgICAuYWRkQ2xhc3MoW2VudGVyRnJvbUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuSElEREVOfWApXG4gICAgICAgICAgICAucmVmbG93KClcbiAgICAgICAgICAgIC5hZGRDbGFzcyhlbnRlckFjdGl2ZUNsYXNzKVxuICAgICAgICA7XG4gICAgICAgICRlbFByZXYuYWRkQ2xhc3MoW2xlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogZW5kICovXG4gICAgcHJpdmF0ZSBhc3luYyBlbmRUcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAoJGVsTmV4dFswXSAhPT0gJGVsUHJldlswXSkgJiYgJGVsUHJldi5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5ISURERU59YCk7XG4gICAgICAgICRlbE5leHQucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG4gICAgICAgICRlbFByZXYucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG5cbiAgICAgICAgdGhpcy5fJGVsLnJlbW92ZUNsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2FmdGVyLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZmluYWxpemVcblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlIHBhZ2Ugc3RhdHVzIGFmdGVyIHRyYW5zaXRpb24gKi9cbiAgICBwcml2YXRlIHVwZGF0ZUNoYW5nZUNvbnRleHQoXG4gICAgICAgICRlbE5leHQ6IERPTSxcbiAgICAgICAgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICB0cmFuc2l0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBkaXJlY3Rpb24sIHRvIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBmcm9tIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gdG8gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCB1cmxDaGFuZ2VkID0gIXJlbG9hZDtcblxuXG4gICAgICAgIGlmICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgY2xhc3NcbiAgICAgICAgICAgICRlbFByZXZcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YClcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApO1xuXG4gICAgICAgICAgICBpZiAodXJsQ2hhbmdlZCAmJiB0aGlzLl9wcmV2Um91dGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWw/LmNsYXNzTGlzdC5yZW1vdmUoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGUsIHRoaXMuX3ByZXZSb3V0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXJsQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlID0gcHJldlJvdXRlO1xuICAgICAgICAgICAgaWYgKHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAkZWxQcmV2LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xhc3RSb3V0ZSA9IHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgJ2ZvcndhcmQnID09PSBkaXJlY3Rpb24gJiYgdHJhbnNpdGlvbiAmJiAodGhpcy5fbGFzdFJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHByZWZldGNoICYgZG9tIGNhY2hlXG5cbiAgICAvKiogQGludGVybmFsIHVuc2V0IGRvbSBjYWNoZWQgY29udGVudHMgKi9cbiAgICBwcml2YXRlIHJlbGVhc2VDYWNoZUNvbnRlbnRzKGVsOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRoaXMuX3JvdXRlc1trZXldWydAcm91dGUnXSBhcyBSb3V0ZUNvbnRleHQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAocm91dGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBlbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVubW91bnRDb250ZW50KHJvdXRlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJvdXRlLmVsID09PSBlbCkge1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuX2hpc3Rvcnkuc3RhY2spIHtcbiAgICAgICAgICAgIGlmICgobnVsbCA9PSBlbCAmJiByb3V0ZS5lbCkgfHwgcm91dGUuZWwgPT09IGVsKSB7XG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGVzdHJ1Y3Rpb24gb2YgZG9tIGFjY29yZGluZyB0byBjb25kaXRpb24gKi9cbiAgICBwcml2YXRlIHRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGU6IFJvdXRlQ29udGV4dCwgcHJldlJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgaWYgKHByZXZSb3V0ZS5lbCAmJiBwcmV2Um91dGUuZWwgIT09IHRoaXMuY3VycmVudFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKHByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICBjb25zdCBjYWNoZUx2ID0gJGVsLmRhdGEoRG9tQ2FjaGUuREFUQV9OQU1FKTtcbiAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9DT05ORUNUICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHByZXZSb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcmVFdmVudHMgPSBwcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlICE9PSBuZXh0Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfTUVNT1JZICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVsZWFzZUNhY2hlQ29udGVudHMocHJldlJvdXRlLmVsKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubG9hZGVkJywgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNldCBkb20gcHJlZmV0Y2hlZCBjb250ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJlZmV0Y2hDb250ZW50cyhwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0b1JvdXRlID0gKHBhcmFtOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBlbDogSFRNTEVsZW1lbnQpOiBSb3V0ZUNvbnRleHQgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdG9Sb3V0ZUNvbnRleHQocGFyYW0ucHJlZmV0Y2ghLCB0aGlzLCBwYXJhbSk7XG4gICAgICAgICAgICBjdHguZWwgPSBlbDtcbiAgICAgICAgICAgIHJldHVybiBjdHg7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdG9Sb3V0ZUNoYW5nZUluZm8gPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICAgICAgICAgICAgdG86IHJvdXRlLFxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogJ25vbmUnLFxuICAgICAgICAgICAgICAgIGFzeW5jUHJvY2VzczogbmV3IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0KCksXG4gICAgICAgICAgICAgICAgcmVsb2FkOiBmYWxzZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsUm91dGUgPSBwYXJhbVsnQHJvdXRlJ10/LmVsO1xuICAgICAgICAgICAgaWYgKCFlbFJvdXRlIHx8ICh0aGlzLmN1cnJlbnRSb3V0ZS5lbCAhPT0gZWxSb3V0ZSAmJiB0aGlzLl9sYXN0Um91dGU/LmVsICE9PSBlbFJvdXRlICYmIHRoaXMuX3ByZXZSb3V0ZT8uZWwgIT09IGVsUm91dGUpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlKHBhcmFtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHBhcmFtLiR0ZW1wbGF0ZSFbMF07XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGUocGFyYW0sIGVsKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRvUm91dGVDaGFuZ2VJbmZvKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhc3luY1Byb2Nlc3MgfSA9IGNoYW5nZUluZm87XG4gICAgICAgICAgICAgICAgICAgIC8vIGxvYWQgJiBpbml0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZENvbnRlbnQocm91dGUsIHBhcmFtLCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICAgICAgICAgICAgICAvLyBtb3VudFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm1vdW50Q29udGVudCgkKGVsKSwgcGFyYW0ucGFnZSwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGxvYWQgcHJlZmV0Y2ggZG9tIGNvbnRlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmVhdFByZWZldGNoQ29udGVudHMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIC8vIOmBt+enu+WFiOOBi+OCiSBwcmVmZXRjaCBjb250ZW50IOOCkuaknOWHulxuICAgICAgICBjb25zdCBwcmVmZXRjaFBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0gW107XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLmN1cnJlbnRSb3V0ZS5lbD8ucXVlcnlTZWxlY3RvckFsbChgW2RhdGEtJHtMaW5rRGF0YS5QUkVGRVRDSH1dYCkgPz8gW107XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGFyZ2V0cykge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICBpZiAoZmFsc2UgIT09ICRlbC5kYXRhKExpbmtEYXRhLlBSRUZFVENIKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9ICRlbC5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHVybCEpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnByZWZldGNoID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICBwcmVmZXRjaFBhcmFtcy5wdXNoKHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJlZmV0Y2hDb250ZW50cyhwcmVmZXRjaFBhcmFtcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgY2hhbmdpbmdgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeUNoYW5naW5nKG5leHRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIGNhbmNlbDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQsIHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2luQ2hhbmdpbmdQYWdlKSB7XG4gICAgICAgICAgICBjYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0JVU1kpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRTdGF0ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCd3aWxsLWNoYW5nZScsIGNoYW5nZUluZm8sIGNhbmNlbCk7XG4gICAgICAgIHByb21pc2VzLnB1c2goLi4uY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MucHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGByZWZyZXNoYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlSZWZyZXNoKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuc3VyZSA9IChzdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4pOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXRoICA9IGAvJHtzdGF0ZVsnQGlkJ119YDtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFtwYXRoOiAke3BhdGh9XWAsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsID09IHN0YXRlWydAcGFyYW1zJ10pIHtcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXIg44KSIGFzc2lnblxuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc3RhdGUsIHRvUm91dGVDb250ZXh0KHBhdGgsIHRoaXMsIHBhcmFtcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWQg44Gr57SQ44Gl44GP6KaB57Sg44GM44GZ44Gn44Gr5a2Y5Zyo44GZ44KL5aC05ZCI44Gv5Ymy44KK5b2T44GmXG4gICAgICAgICAgICBzdGF0ZS5lbCA/Pz0gdGhpcy5faGlzdG9yeS5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBzY2hlZHVsaW5nIGByZWZyZXNoYCBkb25lLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmNoYW5nZVBhZ2UoZW5zdXJlKG5ld1N0YXRlKSwgb2xkU3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBlcnJvciBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUVycm9yKGVycm9yOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaChcbiAgICAgICAgICAgICdlcnJvcicsXG4gICAgICAgICAgICBpc1Jlc3VsdChlcnJvcikgPyBlcnJvciA6IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJywgZXJyb3IpXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYW5jaG9yIGNsaWNrIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uQW5jaG9yQ2xpY2tlZChldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQgYXMgRWxlbWVudCkuY2xvc2VzdCgnW2hyZWZdJyk7XG4gICAgICAgIGlmICgkdGFyZ2V0LmRhdGEoTGlua0RhdGEuUFJFVkVOVF9ST1VURVIpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgPSAkdGFyZ2V0LmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5UUkFOU0lUSU9OKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgICAgPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuTkFWSUFHQVRFX01FVEhPRCkgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtZXRob2RPcHRzID0gKCdwdXNoJyA9PT0gbWV0aG9kIHx8ICdyZXBsYWNlJyA9PT0gbWV0aG9kID8geyBtZXRob2QgfSA6IHt9KSBhcyBOYXZpZ2F0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgaWYgKCcjJyA9PT0gdXJsKSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMuYmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdm9pZCB0aGlzLm5hdmlnYXRlKHVybCEsIHsgdHJhbnNpdGlvbiwgLi4ubWV0aG9kT3B0cyB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBSb3V0ZXJ9IG9iamVjdC5cbiAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnN9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb3V0ZXIoc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9ucz86IFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMpOiBSb3V0ZXIge1xuICAgIHJldHVybiBuZXcgUm91dGVyQ29udGV4dChzZWxlY3RvciwgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIHN0YXJ0OiB0cnVlLFxuICAgIH0sIG9wdGlvbnMpKTtcbn1cbiJdLCJuYW1lcyI6WyIk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