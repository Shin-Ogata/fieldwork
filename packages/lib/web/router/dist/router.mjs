/*!
 * @cdp/router 0.9.18
 *   generic router scheme
 */

import { webRoot, toUrl, toTemplateElement, loadTemplateSource, waitFrame } from '@cdp/web-utils';
import { safe, at, sort, noop, $cdp, isObject, post, isArray, isString, assignValue, isFunction, sleep, camelize } from '@cdp/core-utils';
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
        const regexp = path2regexp.pathToRegexp(seed.path);
        seed.regexp = regexp;
        seed.paramKeys = (regexp).keys.filter(k => isString(k.name)).map(k => k.name);
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
        dom(nextRoute.el).attr('aria-hidden', true).removeClass([`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`, `${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`]);
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
        $el.attr('aria-hidden', true);
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
            .removeAttr('aria-hidden')
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
        ($elNext[0] !== $elPrev[0]) && $elPrev.attr('aria-hidden', true);
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
            if (!state.el) {
                // id に紐づく要素がすでに存在する場合は割り当て
                state.el = this._history.direct(state['@id'])?.state?.el;
            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImhpc3RvcnkvaW50ZXJuYWwudHMiLCJ1dGlscy50cyIsImhpc3Rvcnkvc2Vzc2lvbi50cyIsImhpc3RvcnkvbWVtb3J5LnRzIiwicm91dGVyL2ludGVybmFsLnRzIiwicm91dGVyL2FzeW5jLXByb2Nlc3MudHMiLCJyb3V0ZXIvY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFJPVVRFUiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDE1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1JPVVRFUl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5EICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDEsICdyb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMiwgJ1JvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAzLCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDQsICdJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0JVU1kgICAgICAgICAgICAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDUsICdJbiBjaGFuZ2luZyBwYWdlIHByb2Nlc3Mgbm93LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkwgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbiIsImltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgYXQsXG4gICAgc29ydCxcbiAgICBub29wLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgSGlzdG9yeVN0YXRlLCBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgbm9ybWFsemllIGlkIHN0cmluZyAqL1xuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZUlkID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAvLyByZW1vdmUgaGVhZCBvZiBcIiNcIiwgXCIvXCIsIFwiIy9cIiBhbmQgdGFpbCBvZiBcIi9cIlxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvXigjXFwvKXxeWyMvXXxcXHMrJC8sICcnKS5yZXBsYWNlKC9eXFxzKyR8KFxcLyQpLywgJycpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgc3RhY2sgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVEYXRhID0gPFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogSGlzdG9yeVN0YXRlPFQ+ID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7ICdAaWQnOiBub3JtYWxpemVJZChpZCkgfSwgc3RhdGUpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgdW5jYW5jZWxsYWJsZSBkZWZlcnJlZCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCA9ICh3YXJuOiBzdHJpbmcpOiBEZWZlcnJlZCA9PiB7XG4gICAgY29uc3QgdW5jYW5jZWxsYWJsZSA9IG5ldyBEZWZlcnJlZCgpIGFzIFdyaXRhYmxlPERlZmVycmVkPjtcbiAgICB1bmNhbmNlbGxhYmxlLnJlamVjdCA9ICgpID0+IHtcbiAgICAgICAgY29uc29sZS53YXJuKHdhcm4pO1xuICAgICAgICB1bmNhbmNlbGxhYmxlLnJlc29sdmUoKTtcbiAgICB9O1xuICAgIHJldHVybiB1bmNhbmNlbGxhYmxlO1xufTtcblxuLyoqIEBpbnRlcm5hbCBhc3NpZ24gc3RhdGUgZWxlbWVudCBpZiBhbHJlYWR5IGV4aXN0cyAqL1xuZXhwb3J0IGNvbnN0IGFzc2lnblN0YXRlRWxlbWVudCA9IChzdGF0ZTogSGlzdG9yeVN0YXRlLCBzdGFjazogSGlzdG9yeVN0YWNrKTogdm9pZCA9PiB7XG4gICAgY29uc3QgZWwgPSBzdGFjay5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICghc3RhdGUuZWwgJiYgZWwpICYmIChzdGF0ZS5lbCA9IGVsKTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBpbnRlcm5hbCBzdGFjayBtYW5hZ2VtZW50IGNvbW1vbiBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgSGlzdG9yeVN0YWNrPFQgPSBQbGFpbk9iamVjdD4ge1xuICAgIHByaXZhdGUgX3N0YWNrOiBIaXN0b3J5U3RhdGU8VD5bXSA9IFtdO1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5kaXN0YW5jZSgwKTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZVsnQGlkJ107XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgc2V0IGluZGV4KGlkeDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTWF0aC50cnVuYyhpZHgpO1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IGFycmF5KCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnNsaWNlKCk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIHBvc2l0aW9uIGluIHN0YWNrIGlzIGZpcnN0IG9yIG5vdCAqL1xuICAgIGdldCBpc0ZpcnN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gMCA9PT0gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIHBvc2l0aW9uIGluIHN0YWNrIGlzIGxhc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzTGFzdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4ID09PSB0aGlzLl9zdGFjay5sZW5ndGggLSAxO1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBwdWJsaWMgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLl9zdGFjaywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBjbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LiAqL1xuICAgIHB1YmxpYyBjbGVhckZvcndhcmQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrID0gdGhpcy5fc3RhY2suc2xpY2UoMCwgdGhpcy5faW5kZXggKyAxKTtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC4gKi9cbiAgICBwdWJsaWMgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWQgPSBub3JtYWxpemVJZChpZCk7XG4gICAgICAgIGNvbnN0IHsgX2luZGV4OiBiYXNlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gdGhpcy5fc3RhY2tcbiAgICAgICAgICAgIC5tYXAoKHMsIGluZGV4KSA9PiB7IHJldHVybiB7IGluZGV4LCBkaXN0YW5jZTogTWF0aC5hYnMoYmFzZSAtIGluZGV4KSwgLi4ucyB9OyB9KVxuICAgICAgICAgICAgLmZpbHRlcihzID0+IHNbJ0BpZCddID09PSBpZClcbiAgICAgICAgO1xuICAgICAgICBzb3J0KGNhbmRpZGF0ZXMsIChsLCByKSA9PiAobC5kaXN0YW5jZSA+IHIuZGlzdGFuY2UgPyAxIDogLTEpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZXNbMF0/LmluZGV4O1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IHN0YWNrIGluZm9ybWF0aW9uIGJ5IHRvIElEIGFuZCBmcm9tIElELiAqL1xuICAgIHB1YmxpYyBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIGNvbnN0IHRvSW5kZXggICA9IHRoaXMuY2xvc2VzdCh0b0lkKTtcbiAgICAgICAgY29uc3QgZnJvbUluZGV4ID0gbnVsbCA9PSBmcm9tSWQgPyB0aGlzLl9pbmRleCA6IHRoaXMuY2xvc2VzdChmcm9tSWQpO1xuICAgICAgICBpZiAobnVsbCA9PSBmcm9tSW5kZXggfHwgbnVsbCA9PSB0b0luZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb246ICdtaXNzaW5nJyB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0b0luZGV4IC0gZnJvbUluZGV4O1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gMCA9PT0gZGVsdGFcbiAgICAgICAgICAgICAgICA/ICdub25lJ1xuICAgICAgICAgICAgICAgIDogZGVsdGEgPCAwID8gJ2JhY2snIDogJ2ZvcndhcmQnO1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uLCBkZWx0YSwgaW5kZXg6IHRvSW5kZXgsIHN0YXRlOiB0aGlzLl9zdGFja1t0b0luZGV4XSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCBhY3RpdmUgZGF0YSBmcm9tIGN1cnJlbnQgaW5kZXggb3JpZ2luICovXG4gICAgcHVibGljIGRpc3RhbmNlKGRlbHRhOiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICBjb25zdCBwb3MgPSB0aGlzLl9pbmRleCArIGRlbHRhO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7dGhpcy5sZW5ndGh9LCBnaXZlbjogJHtwb3N9XWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmF0KHBvcyk7XG4gICAgfVxuXG4gICAgLyoqIG5vb3Agc3RhY2sgKi9cbiAgICBwdWJsaWMgbm9vcFN0YWNrID0gbm9vcDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbWVtYmVyLWFjY2Vzc2liaWxpdHlcblxuICAgIC8qKiBwdXNoIHN0YWNrICovXG4gICAgcHVibGljIHB1c2hTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbKyt0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiByZXBsYWNlIHN0YWNrICovXG4gICAgcHVibGljIHJlcGxhY2VTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogc2VlayBzdGFjayAqL1xuICAgIHB1YmxpYyBzZWVrU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jbG9zZXN0KGRhdGFbJ0BpZCddKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YWNrKGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBkaXNwb3NlIG9iamVjdCAqL1xuICAgIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbmRleCA9IE5hTjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB3ZWJSb290IH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHsgVVJMIH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgbm9ybWFsaXplSWQgfSBmcm9tICcuL2hpc3RvcnkvaW50ZXJuYWwnO1xuXG4vKiogcmUtZXhwb3J0ICovXG5leHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5cbi8qKlxuICogQGVuIEdlbmVyYXRlcyBhbiBJRCB0byBiZSB1c2VkIGJ5IHRoZSBzdGFjayBpbnNpZGUgdGhlIHJvdXRlci5cbiAqIEBqYSDjg6vjg7zjgr/jg7zlhoXpg6jjga4gc3RhY2sg44GM5L2/55So44GZ44KLIElEIOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc3BlY2lmaWVzIHdoZXJlIHRoZSBwYXRoIHN0cmluZyBpcyBjcmVhdGVkIGZyb20gW2V4OiBgbG9jYXRpb24uaGFzaGAsIGBsb2NhdGlvbi5ocmVmYCwgYCNwYXRoYCwgYHBhdGhgLCBgL3BhdGhgXVxuICogIC0gYGphYCBwYXRoIOaWh+Wtl+WIl+OBruS9nOaIkOWFg+OCkuaMh+WumiBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlclN0YWNrSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChVUkwuY2FuUGFyc2Uoc3JjKSkge1xuICAgICAgICBjb25zdCB7IGhhc2ggfSA9IG5ldyBVUkwoc3JjKTtcbiAgICAgICAgcmV0dXJuIGhhc2ggPyBub3JtYWxpemVJZChoYXNoKSA6IG5vcm1hbGl6ZUlkKHNyYy5zdWJzdHJpbmcod2ViUm9vdC5sZW5ndGgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplSWQoc3JjKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIG5vcm1hbGl6ZWQgYC88aWQ+YCBzdHJpbmcgZnJvbSB0aGUgdXJsIC8gcGF0aC5cbiAqIEBqYSB1cmwgLyBwYXRoIOOCkuaMh+WumuOBl+OBpiwg5q2j6KaP5YyW44GX44GfIGAvPHN0YWNrIGlkPmAg5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzcGVjaWZpZXMgd2hlcmUgdGhlIHBhdGggc3RyaW5nIGlzIGNyZWF0ZWQgZnJvbSBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKiAgLSBgamFgIHBhdGgg5paH5a2X5YiX44Gu5L2c5oiQ5YWD44KS5oyH5a6aIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVyUGF0aCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGAvJHt0b1JvdXRlclN0YWNrSWQoc3JjKX1gO1xufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgQWNjZXNzaWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc09iamVjdCxcbiAgICBub29wLFxuICAgICRjZHAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTaWxlbmNlYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB0b1JvdXRlclN0YWNrSWQgYXMgdG9JZCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc2V0RGlzcGF0Y2hJbmZvID0gPFQ+KHN0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICAoc3RhdGVbJGNkcF0gYXMgRGlzcGF0Y2hJbmZvPFQ+KSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4pOiBbVCwgRGlzcGF0Y2hJbmZvPFQ+P10gPT4ge1xuICAgIGlmIChpc09iamVjdChzdGF0ZSkgJiYgc3RhdGVbJGNkcF0pIHtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbCA9IHN0YXRlWyRjZHBdO1xuICAgICAgICBkZWxldGUgc3RhdGVbJGNkcF07XG4gICAgICAgIHJldHVybiBbc3RhdGUsIGFkZGl0aW9uYWwgYXMgRGlzcGF0Y2hJbmZvPFQ+XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW3N0YXRlXTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnU2Vzc2lvbkhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCcm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9tb2RlOiAnaGFzaCcgfCAnaGlzdG9yeSc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9wU3RhdGVIYW5kbGVyOiAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHZvaWQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG4gICAgcHJpdmF0ZSBfZGZHbz86IERlZmVycmVkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3aW5kb3dDb250eHQ6IFdpbmRvdywgbW9kZTogJ2hhc2gnIHwgJ2hpc3RvcnknLCBpZD86IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW5kb3dDb250eHQ7XG4gICAgICAgIHRoaXMuX21vZGUgPSBtb2RlO1xuXG4gICAgICAgIHRoaXMuX3BvcFN0YXRlSGFuZGxlciA9IHRoaXMub25Qb3BTdGF0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQgPz8gdG9JZCh0aGlzLl93aW5kb3cubG9jYXRpb24uaHJlZiksIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBwcmV2U3RhdGUgPSB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICB0aGlzLnNldEluZGV4KDApO1xuICAgICAgICBhd2FpdCB0aGlzLmNsZWFyRm9yd2FyZCgpO1xuXG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkKCdTZXNzaW9uSGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpLFxuICAgICAgICAgICAgICAgIG5ld0lkOiB0b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogJ25vb3AnLFxuICAgICAgICAgICAgICAgIHByZXZTdGF0ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyh0aGlzLnN0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICAvLyBpZiBhbHJlYWR5IGNhbGxlZCwgbm8gcmVhY3Rpb24uXG4gICAgICAgIGlmICh0aGlzLl9kZkdvKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICBpZiAoIWRlbHRhKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCB0aGlzLnN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2RmR28gPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2RmR287XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsZWFyRm9yd2FyZEhpc3RvcnkoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBkZXN0aW5hdGlvbiBzdGFjayBpbmZvcm1hdGlvbiBieSBgc3RhcnRgIGFuZCBgZW5kYCBJRC5cbiAgICAgKiBAamEg6LW354K5LCDntYLngrnjga4gSUQg44KS5oyH5a6a44GX44Gm44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KHRvSWQsIGZyb21JZCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBVUkwgKi9cbiAgICBwcml2YXRlIHRvVXJsKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gKCdoYXNoJyA9PT0gdGhpcy5fbW9kZSkgPyBgJHtDb25zdC5IQVNIX1BSRUZJWH0ke2lkfWAgOiB0b1VybChpZCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uLCBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWQgPSBkYXRhWydAaWQnXTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIGRhdGFbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuICAgICAgICBoaXN0b3J5W2Ake21ldGhvZH1TdGF0ZWBdKGRhdGEsICcnLCB0aGlzLnRvVXJsKGlkKSk7XG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KGRhdGEsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogbmV3IERlZmVycmVkKGNhbmNlbCksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgbmV4dFN0YXRlOiBkYXRhLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKGRhdGEsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0oZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRpc3BhdGNoIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBkaXNwYXRjaENoYW5nZUluZm8obmV3U3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHNldERpc3BhdGNoSW5mbyhuZXdTdGF0ZSwgYWRkaXRpb25hbCk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBQb3BTdGF0ZUV2ZW50KCdwb3BzdGF0ZScsIHsgc3RhdGUgfSkpO1xuICAgICAgICBhd2FpdCBhZGRpdGlvbmFsLmRmO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IHBvcHN0YXRlIGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPikgPT4gUHJvbWlzZTx2b2lkPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgICAgIGNvbnN0IHdhaXRQb3BTdGF0ZSA9ICgpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIChldjogUG9wU3RhdGVFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShldi5zdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IGV4ZWN1dG9yKHdhaXRQb3BTdGF0ZSk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCByb2xsYmFjayBoaXN0b3J5ICovXG4gICAgcHJpdmF0ZSBhc3luYyByb2xsYmFja0hpc3RvcnkobWV0aG9kOiBzdHJpbmcsIG5ld0lkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZSh0aGlzLnN0YXRlLCAnJywgdGhpcy50b1VybCh0aGlzLmlkKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwdXNoJzpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgIGhpc3RvcnkuZ28oLTEpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdGhpcy5pbmRleCAtIHRoaXMuY2xvc2VzdChuZXdJZCkhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCAhPT0gZGVsdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWx0YSAmJiBoaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY2xlYXIgZm9yd2FyZCBzZXNzaW9uIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LiAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJGb3J3YXJkSGlzdG9yeSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNPcmlnaW4gPSAoc3Q6IEFjY2Vzc2libGU8dW5rbm93bj4pOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Q/LlsnQG9yaWdpbiddIGFzIGJvb2xlYW47XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IGhpc3Rvcnkuc3RhdGU7XG5cbiAgICAgICAgICAgIC8vIGJhY2sgdG8gc2Vzc2lvbiBvcmlnaW5cbiAgICAgICAgICAgIHdoaWxlICghaXNPcmlnaW4oc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGVuc3VyZSA9IChzcmM6IEFjY2Vzc2libGU8dW5rbm93bj4pOiB1bmtub3duID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdHggPSB7IC4uLnNyYyB9O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ3JvdXRlciddO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjdHhbJ0BwYXJhbXMnXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdHgpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGZvcndhcmQgZnJvbSBpbmRleCAxIHRvIGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAxLCBuID0gdGhpcy5fc3RhY2subGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3QgPSB0aGlzLl9zdGFjay5hdChpKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnB1c2hTdGF0ZShlbnN1cmUoc3QpLCAnJywgdGhpcy50b1VybChzdFsnQGlkJ10pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIHJlY2VpdmUgYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIG9uUG9wU3RhdGUoZXY6IFBvcFN0YXRlRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBbbmV3U3RhdGUsIGFkZGl0aW9uYWxdID0gcGFyc2VEaXNwYXRjaEluZm8oZXYuc3RhdGUpO1xuICAgICAgICBjb25zdCBuZXdJZCAgID0gYWRkaXRpb25hbD8ubmV3SWQgPz8gdG9JZChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgY29uc3QgbWV0aG9kICA9IGFkZGl0aW9uYWw/LnBvc3Rwcm9jID8/ICdzZWVrJztcbiAgICAgICAgY29uc3QgZGYgICAgICA9IGFkZGl0aW9uYWw/LmRmID8/IHRoaXMuX2RmR28gPz8gbmV3IERlZmVycmVkKCk7XG4gICAgICAgIGNvbnN0IG9sZERhdGEgPSBhZGRpdGlvbmFsPy5wcmV2U3RhdGUgfHwgdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IGFkZGl0aW9uYWw/Lm5leHRTdGF0ZSB8fCB0aGlzLmRpcmVjdChuZXdJZCkuc3RhdGUgfHwgY3JlYXRlRGF0YShuZXdJZCwgbmV3U3RhdGUpO1xuICAgICAgICBjb25zdCB7IGNhbmNlbCwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICBkZi5jYXRjaChub29wKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld0RhdGEsIGNhbmNlbCk7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0b2tlbi5yZWFzb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld0RhdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3RGF0YSwgb2xkRGF0YSk7XG5cbiAgICAgICAgICAgIGRmLnJlc29sdmUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gaGlzdG9yeSDjgpLlhYPjgavmiLvjgZlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbGJhY2tIaXN0b3J5KG1ldGhvZCwgbmV3SWQpO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdlcnJvcicsIGUpO1xuICAgICAgICAgICAgZGYucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4ge0BsaW5rIGNyZWF0ZVNlc3Npb25IaXN0b3J5fSgpIG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIGNyZWF0ZVNlc3Npb25IaXN0b3J5fSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICogXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zIHtcbiAgICBjb250ZXh0PzogV2luZG93O1xuICAgIG1vZGU/OiAnaGFzaCcgfCAnaGlzdG9yeSc7XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc30gb2JqZWN0XG4gKiAgLSBgamFgIHtAbGluayBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZD86IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zKTogSUhpc3Rvcnk8VD4ge1xuICAgIGNvbnN0IHsgY29udGV4dCwgbW9kZSB9ID0gT2JqZWN0LmFzc2lnbih7IG1vZGU6ICdoYXNoJyB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFNlc3Npb25IaXN0b3J5KGNvbnRleHQgPz8gd2luZG93LCBtb2RlLCBpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBicm93c2VyIHNlc3Npb24gaGlzdG9yeS5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7IFBsYWluT2JqZWN0LCBwb3N0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ01lbW9yeUhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyA/PyB7fTtcblxuICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ01lbW9yeUhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ25vb3AnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gYmFjayBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkJhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNGaXJzdDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzTGFzdDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hdChpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3Qgb2xkSW5kZXggPSB0aGlzLmluZGV4O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBpZiBnaXZlbiAwLCBqdXN0IHJlbG9hZC5cbiAgICAgICAgICAgIGNvbnN0IG9sZFN0YXRlID0gZGVsdGEgPyB0aGlzLnN0YXRlIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLl9zdGFjay5kaXN0YW5jZShkZWx0YSA/PyAwKTtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKCdzZWVrJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XG4gICAgICAgICAgICB0aGlzLnNldEluZGV4KG9sZEluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyRm9yd2FyZCgpOiBQcm9taXNlPHZvaWQ+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVxdWlyZS1hd2FpdFxuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBkZXN0aW5hdGlvbiBzdGFjayBpbmZvcm1hdGlvbiBieSBgc3RhcnRgIGFuZCBgZW5kYCBJRC5cbiAgICAgKiBAamEg6LW354K5LCDntYLngrnjga4gSUQg44GL44KJ57WC54K544Gu44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KHRvSWQsIGZyb21JZCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBldmVudCAmIHdhaXQgcHJvY2VzcyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJpZ2dlckV2ZW50QW5kV2FpdChcbiAgICAgICAgZXZlbnQ6ICdyZWZyZXNoJyB8ICdjaGFuZ2luZycsXG4gICAgICAgIGFyZzE6IEhpc3RvcnlTdGF0ZTxUPixcbiAgICAgICAgYXJnMjogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkIHwgKChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICB0aGlzLnB1Ymxpc2goZXZlbnQsIGFyZzEsIGFyZzIgYXMgYW55LCBwcm9taXNlcyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcblxuICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIG5ld1N0YXRlWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KG5ld1N0YXRlLCB0aGlzLl9zdGFjayBhcyBIaXN0b3J5U3RhY2spO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZChjYW5jZWwpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZShtZXRob2QsIGRmLCBuZXdTdGF0ZSwgdGhpcy5zdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2Ugc3RhdGUgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25DaGFuZ2VTdGF0ZShtZXRob2Q6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJywgZGY6IERlZmVycmVkLCBuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgnY2hhbmdpbmcnLCBuZXdTdGF0ZSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3U3RhdGUsIG9sZFN0YXRlKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgbWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBJSGlzdG9yeTxUPiB7XG4gICAgcmV0dXJuIG5ldyBNZW1vcnlIaXN0b3J5KGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IG1lbW9yeSBoaXN0b3J5LlxuICogQGphIOODoeODouODquWxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBNZW1vcnlIaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYE1lbW9yeUhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBNZW1vcnlIaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsImltcG9ydCB7IHBhdGgycmVnZXhwIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAnO1xuaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBDbGFzcyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgYXNzaWduVmFsdWUsXG4gICAgc2xlZXAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgdG9RdWVyeVN0cmluZ3MsXG4gICAgcGFyc2VVcmxRdWVyeSxcbiAgICBjb252ZXJ0VXJsUGFyYW1UeXBlLFxufSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgdG9VcmwsXG4gICAgbG9hZFRlbXBsYXRlU291cmNlLFxuICAgIHRvVGVtcGxhdGVFbGVtZW50LFxufSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgSUhpc3RvcnksXG4gICAgY3JlYXRlU2Vzc2lvbkhpc3RvcnksXG4gICAgY3JlYXRlTWVtb3J5SGlzdG9yeSxcbn0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBQYWdlLFxuICAgIFJvdXRlUGF0aFBhcmFtcyxcbiAgICBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgUm91dGUsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCB9IGZyb20gJy4vYXN5bmMtcHJvY2Vzcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENzc05hbWUge1xuICAgIERFRkFVTFRfUFJFRklYICAgICAgID0gJ2NkcCcsXG4gICAgVFJBTlNJVElPTl9ESVJFQ1RJT04gPSAndHJhbnNpdGlvbi1kaXJlY3Rpb24nLFxuICAgIFRSQU5TSVRJT05fUlVOTklORyAgID0gJ3RyYW5zaXRpb24tcnVubmluZycsXG4gICAgUEFHRV9DVVJSRU5UICAgICAgICAgPSAncGFnZS1jdXJyZW50JyxcbiAgICBQQUdFX1BSRVZJT1VTICAgICAgICA9ICdwYWdlLXByZXZpb3VzJyxcbiAgICBFTlRFUl9GUk9NX0NMQVNTICAgICA9ICdlbnRlci1mcm9tJyxcbiAgICBFTlRFUl9BQ1RJVkVfQ0xBU1MgICA9ICdlbnRlci1hY3RpdmUnLFxuICAgIEVOVEVSX1RPX0NMQVNTICAgICAgID0gJ2VudGVyLXRvJyxcbiAgICBMRUFWRV9GUk9NX0NMQVNTICAgICA9ICdsZWF2ZS1mcm9tJyxcbiAgICBMRUFWRV9BQ1RJVkVfQ0xBU1MgICA9ICdsZWF2ZS1hY3RpdmUnLFxuICAgIExFQVZFX1RPX0NMQVNTICAgICAgID0gJ2xlYXZlLXRvJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gRG9tQ2FjaGUge1xuICAgIERBVEFfTkFNRSAgICAgICAgICAgPSAnZG9tLWNhY2hlJyxcbiAgICBDQUNIRV9MRVZFTF9NRU1PUlkgID0gJ21lbW9yeScsXG4gICAgQ0FDSEVfTEVWRUxfQ09OTkVDVCA9ICdjb25uZWN0Jyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gTGlua0RhdGEge1xuICAgIFRSQU5TSVRJT04gICAgICAgPSAndHJhbnNpdGlvbicsXG4gICAgTkFWSUFHQVRFX01FVEhPRCA9ICduYXZpZ2F0ZS1tZXRob2QnLFxuICAgIFBSRUZFVENIICAgICAgICAgPSAncHJlZmV0Y2gnLFxuICAgIFBSRVZFTlRfUk9VVEVSICAgPSAncHJldmVudC1yb3V0ZXInLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDb25zdCB7XG4gICAgV0FJVF9UUkFOU0lUSU9OX01BUkdJTiA9IDEwMCwgLy8gbXNlY1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBQYWdlRXZlbnQgPSAnaW5pdCcgfCAnbW91bnRlZCcgfCAnY2xvbmVkJyB8ICdiZWZvcmUtZW50ZXInIHwgJ2FmdGVyLWVudGVyJyB8ICdiZWZvcmUtbGVhdmUnIHwgJ2FmdGVyLWxlYXZlJyB8ICd1bm1vdW50ZWQnIHwgJ3JlbW92ZWQnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQgZXh0ZW5kcyBSb3V0ZUNoYW5nZUluZm8ge1xuICAgIHJlYWRvbmx5IGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQ7XG4gICAgc2FtZVBhZ2VJbnN0YW5jZT86IGJvb2xlYW47XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGZsYXQgUm91dGVQYXJhbWV0ZXJzICovXG5leHBvcnQgdHlwZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzID0gT21pdDxSb3V0ZVBhcmFtZXRlcnMsICdyb3V0ZXMnPiAmIHtcbiAgICAvKiogcmVnZXhwIGZyb20gcGF0aCAqL1xuICAgIHJlZ2V4cDogUmVnRXhwO1xuICAgIC8qKiBrZXlzIG9mIHBhcmFtcyAqL1xuICAgIHBhcmFtS2V5czogc3RyaW5nW107XG4gICAgLyoqIERPTSB0ZW1wbGF0ZSBpbnN0YW5jZSB3aXRoIFBhZ2UgZWxlbWVudCAqL1xuICAgICR0ZW1wbGF0ZT86IERPTTtcbiAgICAvKiogcm91dGVyIHBhZ2UgaW5zdGFuY2UgZnJvbSBgY29tcG9uZW50YCBwcm9wZXJ0eSAqL1xuICAgIHBhZ2U/OiBQYWdlO1xuICAgIC8qKiBsYXRlc3Qgcm91dGUgY29udGV4dCBjYWNoZSAqL1xuICAgICdAcm91dGUnPzogUm91dGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ID0gUm91dGVTdWJGbG93UGFyYW1zICYgUmVxdWlyZWQ8UGFnZVRyYW5zaXRpb25QYXJhbXM+ICYge1xuICAgIG9yaWdpbjogc3RyaW5nO1xufTtcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHQgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dCA9IFdyaXRhYmxlPFJvdXRlPiAmIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMgJiB7XG4gICAgJ0BwYXJhbXMnOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzO1xuICAgIHN1YmZsb3c/OiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0O1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgUm91dGVDb250ZXh0UGFyYW1ldGVycyB0byBSb3V0ZUNvbnRleHQgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dCA9ICh1cmw6IHN0cmluZywgcm91dGVyOiBSb3V0ZXIsIHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycywgbmF2T3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBSb3V0ZUNvbnRleHQgPT4ge1xuICAgIC8vIG9taXQgdW5jbG9uYWJsZSBwcm9wc1xuICAgIGNvbnN0IGZyb21OYXZpZ2F0ZSA9ICEhbmF2T3B0aW9ucztcbiAgICBjb25zdCBlbnN1cmVDbG9uZSA9IChjdHg6IHVua25vd24pOiBSb3V0ZUNvbnRleHQgPT4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdHgpKTtcbiAgICBjb25zdCBjb250ZXh0ID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAge1xuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgcm91dGVyOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiByb3V0ZXIsXG4gICAgICAgIH0sXG4gICAgICAgIG5hdk9wdGlvbnMsXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIGZvcmNlIG92ZXJyaWRlXG4gICAgICAgICAgICBxdWVyeToge30sXG4gICAgICAgICAgICBwYXJhbXM6IHt9LFxuICAgICAgICAgICAgcGF0aDogcGFyYW1zLnBhdGgsXG4gICAgICAgICAgICAnQHBhcmFtcyc6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHBhcmFtcyxcbiAgICAgICAgfSxcbiAgICApO1xuICAgIHJldHVybiBmcm9tTmF2aWdhdGUgPyBlbnN1cmVDbG9uZShjb250ZXh0KSA6IGNvbnRleHQgYXMgUm91dGVDb250ZXh0O1xufTtcblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IGNvbnRleHQgcGFyYW1zICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzID0gKHJvdXRlczogUm91dGVQYXJhbWV0ZXJzIHwgUm91dGVQYXJhbWV0ZXJzW10gfCB1bmRlZmluZWQpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10gPT4ge1xuICAgIGNvbnN0IGZsYXR0ZW4gPSAocGFyZW50UGF0aDogc3RyaW5nLCBuZXN0ZWQ6IFJvdXRlUGFyYW1ldGVyc1tdKTogUm91dGVQYXJhbWV0ZXJzW10gPT4ge1xuICAgICAgICBjb25zdCByZXR2YWw6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgbiBvZiBuZXN0ZWQpIHtcbiAgICAgICAgICAgIG4ucGF0aCA9IGAke3BhcmVudFBhdGgucmVwbGFjZSgvXFwvJC8sICcnKX0vJHtub3JtYWxpemVJZChuLnBhdGgpfWA7XG4gICAgICAgICAgICByZXR2YWwucHVzaChuKTtcbiAgICAgICAgICAgIGlmIChuLnJvdXRlcykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKC4uLmZsYXR0ZW4obi5wYXRoLCBuLnJvdXRlcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfTtcblxuICAgIHJldHVybiBmbGF0dGVuKCcnLCBpc0FycmF5KHJvdXRlcykgPyByb3V0ZXMgOiByb3V0ZXMgPyBbcm91dGVzXSA6IFtdKVxuICAgICAgICAubWFwKChzZWVkOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWdleHAgPSBwYXRoMnJlZ2V4cC5wYXRoVG9SZWdleHAoc2VlZC5wYXRoKTtcbiAgICAgICAgICAgIHNlZWQucmVnZXhwID0gcmVnZXhwO1xuICAgICAgICAgICAgc2VlZC5wYXJhbUtleXMgPSAocmVnZXhwKS5rZXlzLmZpbHRlcihrID0+IGlzU3RyaW5nKGsubmFtZSkpLm1hcChrID0+IGsubmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gc2VlZDtcbiAgICAgICAgfSk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBwcmVwYXJlIElIaXN0b3J5IG9iamVjdCAqL1xuZXhwb3J0IGNvbnN0IHByZXBhcmVIaXN0b3J5ID0gKHNlZWQ6ICdoYXNoJyB8ICdoaXN0b3J5JyB8ICdtZW1vcnknIHwgSUhpc3RvcnkgPSAnaGFzaCcsIGluaXRpYWxQYXRoPzogc3RyaW5nLCBjb250ZXh0PzogV2luZG93KTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgcmV0dXJuIChpc1N0cmluZyhzZWVkKVxuICAgICAgICA/ICdtZW1vcnknID09PSBzZWVkID8gY3JlYXRlTWVtb3J5SGlzdG9yeShpbml0aWFsUGF0aCA/PyAnJykgOiBjcmVhdGVTZXNzaW9uSGlzdG9yeShpbml0aWFsUGF0aCwgdW5kZWZpbmVkLCB7IG1vZGU6IHNlZWQsIGNvbnRleHQgfSlcbiAgICAgICAgOiBzZWVkXG4gICAgKSBhcyBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW5zdXJlUGF0aFBhcmFtcyA9IChwYXJhbXM6IFJvdXRlUGF0aFBhcmFtcyB8IHVuZGVmaW5lZCk6IHBhdGgycmVnZXhwLlBhcmFtRGF0YSA9PiB7XG4gICAgY29uc3QgcGF0aFBhcmFtczogcGF0aDJyZWdleHAuUGFyYW1EYXRhID0ge307XG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhwYXJhbXMpKSB7XG4gICAgICAgICAgICBwYXRoUGFyYW1zW2tleV0gPSBTdHJpbmcocGFyYW1zW2tleV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXRoUGFyYW1zO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGJ1aWxkTmF2aWdhdGVVcmwgPSAocGF0aDogc3RyaW5nLCBvcHRpb25zOiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogc3RyaW5nID0+IHtcbiAgICB0cnkge1xuICAgICAgICBwYXRoID0gYC8ke25vcm1hbGl6ZUlkKHBhdGgpfWA7XG4gICAgICAgIGNvbnN0IHsgcXVlcnksIHBhcmFtcyB9ID0gb3B0aW9ucztcbiAgICAgICAgbGV0IHVybCA9IHBhdGgycmVnZXhwLmNvbXBpbGUocGF0aCkoZW5zdXJlUGF0aFBhcmFtcyhwYXJhbXMpKTtcbiAgICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKHF1ZXJ5KX1gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELFxuICAgICAgICAgICAgYENvbnN0cnVjdCByb3V0ZSBkZXN0aW5hdGlvbiBmYWlsZWQuIFtwYXRoOiAke3BhdGh9LCBkZXRhaWw6ICR7ZXJyb3IudG9TdHJpbmcoKX1dYCxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICApO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBwYXJzZVVybFBhcmFtcyA9IChyb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCA9PiB7XG4gICAgY29uc3QgeyB1cmwgfSA9IHJvdXRlO1xuICAgIHJvdXRlLnF1ZXJ5ICA9IHVybC5pbmNsdWRlcygnPycpID8gcGFyc2VVcmxRdWVyeShub3JtYWxpemVJZCh1cmwpKSA6IHt9O1xuICAgIHJvdXRlLnBhcmFtcyA9IHt9O1xuXG4gICAgY29uc3QgeyByZWdleHAsIHBhcmFtS2V5cyB9ID0gcm91dGVbJ0BwYXJhbXMnXTtcbiAgICBpZiAocGFyYW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSByZWdleHAuZXhlYyh1cmwpPy5tYXAoKHZhbHVlLCBpbmRleCkgPT4geyByZXR1cm4geyB2YWx1ZSwga2V5OiBwYXJhbUtleXNbaW5kZXggLSAxXSB9OyB9KTtcbiAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMhKSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwYXJhbS5rZXkgJiYgbnVsbCAhPSBwYXJhbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKHJvdXRlLnBhcmFtcywgcGFyYW0ua2V5LCBjb252ZXJ0VXJsUGFyYW1UeXBlKHBhcmFtLnZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyNpbnN0YW5jZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZSA9IGFzeW5jIChyb3V0ZTogUm91dGVDb250ZXh0KTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgY29uc3QgeyAnQHBhcmFtcyc6IHBhcmFtcyB9ID0gcm91dGU7XG5cbiAgICBpZiAocGFyYW1zLnBhZ2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCB7IGNvbXBvbmVudCwgY29tcG9uZW50T3B0aW9ucyB9ID0gcGFyYW1zO1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBhcmFtcy5wYWdlID0gbmV3IChjb21wb25lbnQgYXMgdW5rbm93biBhcyBDbGFzcykocm91dGUsIGNvbXBvbmVudE9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHBhcmFtcy5wYWdlID0gYXdhaXQgY29tcG9uZW50KHJvdXRlLCBjb21wb25lbnRPcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY29tcG9uZW50KSkge1xuICAgICAgICBwYXJhbXMucGFnZSA9IE9iamVjdC5hc3NpZ24oeyAnQHJvdXRlJzogcm91dGUsICdAb3B0aW9ucyc6IGNvbXBvbmVudE9wdGlvbnMgfSwgY29tcG9uZW50KSBhcyBQYWdlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0geyAnQHJvdXRlJzogcm91dGUsICdAb3B0aW9ucyc6IGNvbXBvbmVudE9wdGlvbnMgfSBhcyBQYWdlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIyR0ZW1wbGF0ZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZSA9IGFzeW5jIChwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBpZiAocGFyYW1zLiR0ZW1wbGF0ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IGVuc3VyZUluc3RhbmNlID0gKGVsOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCk6IERPTSA9PiB7XG4gICAgICAgIHJldHVybiBlbCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyAkKFsuLi5lbC5jb250ZW50LmNoaWxkcmVuXSkgYXMgRE9NIDogJChlbCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHsgY29udGVudCB9ID0gcGFyYW1zO1xuICAgIGlmIChudWxsID09IGNvbnRlbnQpIHtcbiAgICAgICAgLy8gbm9vcCBlbGVtZW50XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSAkPEhUTUxFbGVtZW50PigpO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoKGNvbnRlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydzZWxlY3RvciddKSkge1xuICAgICAgICAvLyBmcm9tIGFqYXhcbiAgICAgICAgY29uc3QgeyBzZWxlY3RvciwgdXJsIH0gPSBjb250ZW50IGFzIHsgc2VsZWN0b3I6IHN0cmluZzsgdXJsPzogc3RyaW5nOyB9O1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRvVGVtcGxhdGVFbGVtZW50KGF3YWl0IGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgeyB1cmw6IHVybCAmJiB0b1VybCh1cmwpIH0pKTtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoYHRlbXBsYXRlIGxvYWQgZmFpbGVkLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCB1cmw6ICR7dXJsfV1gKTtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UodGVtcGxhdGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbihjb250ZW50KSkge1xuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UoJChhd2FpdCBjb250ZW50KCkpWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UoJChjb250ZW50IGFzIERPTVNlbGVjdG9yKVswXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIG5ld2x5IGNyZWF0ZWRcbn07XG5cbi8qKiBAaW50ZXJuYWwgZGVjaWRlIHRyYW5zaXRpb24gZGlyZWN0aW9uICovXG5leHBvcnQgY29uc3QgZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbiA9IChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiBIaXN0b3J5RGlyZWN0aW9uID0+IHtcbiAgICBpZiAoY2hhbmdlSW5mby5yZXZlcnNlKSB7XG4gICAgICAgIHN3aXRjaCAoY2hhbmdlSW5mby5kaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2JhY2snOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZm9yd2FyZCc7XG4gICAgICAgICAgICBjYXNlICdmb3J3YXJkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2JhY2snO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlSW5mby5kaXJlY3Rpb247XG59O1xuXG4vKiogQGludGVybmFsICovXG50eXBlIEVmZmVjdFR5cGUgPSAnYW5pbWF0aW9uJyB8ICd0cmFuc2l0aW9uJztcblxuLyoqIEBpbnRlcm5hbCByZXRyaWV2ZSBlZmZlY3QgZHVyYXRpb24gcHJvcGVydHkgKi9cbmNvbnN0IGdldEVmZmVjdER1cmF0aW9uU2VjID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUpOiBudW1iZXIgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUoJGVsWzBdKVtgJHtlZmZlY3R9RHVyYXRpb25gXSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHdhaXRGb3JFZmZlY3QgPSAoJGVsOiBET00sIGVmZmVjdDogRWZmZWN0VHlwZSwgZHVyYXRpb25TZWM6IG51bWJlcik6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW1xuICAgICAgICBuZXcgUHJvbWlzZShyZXNvbHZlID0+ICRlbFtgJHtlZmZlY3R9RW5kYF0ocmVzb2x2ZSkpLFxuICAgICAgICBzbGVlcChkdXJhdGlvblNlYyAqIDEwMDAgKyBDb25zdC5XQUlUX1RSQU5TSVRJT05fTUFSR0lOKSxcbiAgICBdKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBleGVjdXRpb24gKi9cbmV4cG9ydCBjb25zdCBwcm9jZXNzUGFnZVRyYW5zaXRpb24gPSBhc3luYygkZWw6IERPTSwgZnJvbUNsYXNzOiBzdHJpbmcsIGFjdGl2ZUNsYXNzOiBzdHJpbmcsIHRvQ2xhc3M6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICRlbC5yZW1vdmVDbGFzcyhmcm9tQ2xhc3MpO1xuICAgICRlbC5hZGRDbGFzcyh0b0NsYXNzKTtcblxuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBbJ2FuaW1hdGlvbicsICd0cmFuc2l0aW9uJ10gYXMgRWZmZWN0VHlwZVtdKSB7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gZ2V0RWZmZWN0RHVyYXRpb25TZWMoJGVsLCBlZmZlY3QpO1xuICAgICAgICBkdXJhdGlvbiAmJiBwcm9taXNlcy5wdXNoKHdhaXRGb3JFZmZlY3QoJGVsLCBlZmZlY3QsIGR1cmF0aW9uKSk7XG4gICAgfVxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgICRlbC5yZW1vdmVDbGFzcyhbYWN0aXZlQ2xhc3MsIHRvQ2xhc3NdKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3MgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIFJvdXRlQXluY1Byb2Nlc3MgaW1wbGVtZW50YXRpb24gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCBpbXBsZW1lbnRzIFJvdXRlQXluY1Byb2Nlc3Mge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3Byb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlQXluY1Byb2Nlc3NcblxuICAgIHJlZ2lzdGVyKHByb21pc2U6IFByb21pc2U8dW5rbm93bj4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcHJvbWlzZXMucHVzaChwcm9taXNlKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbCBtZXRob2RzOlxuXG4gICAgZ2V0IHByb21pc2VzKCk6IHJlYWRvbmx5IFByb21pc2U8dW5rbm93bj5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wcm9taXNlcztcbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgY29tcGxldGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHRoaXMuX3Byb21pc2VzKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZXMubGVuZ3RoID0gMDtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBBY2Nlc3NpYmxlLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBjYW1lbGl6ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgTmF0aXZlUHJvbWlzZSB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIGlzUmVzdWx0LFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxuICAgIERPTVNlbGVjdG9yLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyB3YWl0RnJhbWUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB0b1JvdXRlclBhdGggfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuLi9zc3InO1xuaW1wb3J0IHsgbm9ybWFsaXplSWQgfSBmcm9tICcuLi9oaXN0b3J5L2ludGVybmFsJztcbmltcG9ydCB0eXBlIHsgSUhpc3RvcnksIEhpc3RvcnlTdGF0ZSB9IGZyb20gJy4uL2hpc3RvcnknO1xuaW1wb3J0IHtcbiAgICBQYWdlVHJhbnNpdGlvblBhcmFtcyxcbiAgICBSb3V0ZXJFdmVudCxcbiAgICBQYWdlLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBUcmFuc2l0aW9uU2V0dGluZ3MsXG4gICAgTmF2aWdhdGlvblNldHRpbmdzLFxuICAgIFBhZ2VTdGFjayxcbiAgICBQdXNoUGFnZVN0YWNrT3B0aW9ucyxcbiAgICBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlclJlZnJlc2hMZXZlbCxcbiAgICBSb3V0ZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIENzc05hbWUsXG4gICAgRG9tQ2FjaGUsXG4gICAgTGlua0RhdGEsXG4gICAgUGFnZUV2ZW50LFxuICAgIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCxcbiAgICBSb3V0ZUNvbnRleHQsXG4gICAgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdG9Sb3V0ZUNvbnRleHQsXG4gICAgcHJlcGFyZUhpc3RvcnksXG4gICAgYnVpbGROYXZpZ2F0ZVVybCxcbiAgICBwYXJzZVVybFBhcmFtcyxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UsXG4gICAgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlLFxuICAgIGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24sXG4gICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFJvdXRlciBpbXBsaW1lbnQgY2xhc3MuXG4gKiBAamEgUm91dGVyIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSb3V0ZXJDb250ZXh0IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8Um91dGVyRXZlbnQ+IGltcGxlbWVudHMgUm91dGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXM6IFJlY29yZDxzdHJpbmcsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnM+ID0ge307XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kZWw6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yYWY6IFVua25vd25GdW5jdGlvbjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5Q2hhbmdpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeVJlZnJlc2hIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5UmVmcmVzaDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lcnJvckhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhhbmRsZUVycm9yO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Nzc1ByZWZpeDogc3RyaW5nO1xuICAgIHByaXZhdGUgX3RyYW5zaXRpb25TZXR0aW5nczogVHJhbnNpdGlvblNldHRpbmdzO1xuICAgIHByaXZhdGUgX25hdmlnYXRpb25TZXR0aW5nczogUmVxdWlyZWQ8TmF2aWdhdGlvblNldHRpbmdzPjtcbiAgICBwcml2YXRlIF9sYXN0Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfcHJldlJvdXRlPzogUm91dGVDb250ZXh0O1xuICAgIHByaXZhdGUgX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXM7XG4gICAgcHJpdmF0ZSBfaW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9uczogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgZWwsXG4gICAgICAgICAgICB3aW5kb3c6IGNvbnRleHQsXG4gICAgICAgICAgICBoaXN0b3J5LFxuICAgICAgICAgICAgaW5pdGlhbFBhdGgsXG4gICAgICAgICAgICBhZGRpdGlvbmFsU3RhY2tzLFxuICAgICAgICAgICAgY3NzUHJlZml4LFxuICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgICAgIG5hdmlnYXRpb24sXG4gICAgICAgIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICAgICAgdGhpcy5fcmFmID0gY29udGV4dD8ucmVxdWVzdEFuaW1hdGlvbkZyYW1lID8/IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cbiAgICAgICAgdGhpcy5fJGVsID0gJChzZWxlY3RvciwgZWwpO1xuICAgICAgICBpZiAoIXRoaXMuXyRlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCwgYFJvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yIGFzIHN0cmluZ31dYCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9oaXN0b3J5ID0gcHJlcGFyZUhpc3RvcnkoaGlzdG9yeSwgaW5pdGlhbFBhdGgsIGNvbnRleHQhKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlciA9IHRoaXMub25IaXN0b3J5Q2hhbmdpbmcuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyICA9IHRoaXMub25IaXN0b3J5UmVmcmVzaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9lcnJvckhhbmRsZXIgICAgICAgICAgID0gdGhpcy5vbkhhbmRsZUVycm9yLmJpbmQodGhpcyk7XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG5cbiAgICAgICAgLy8gZm9sbG93IGFuY2hvclxuICAgICAgICB0aGlzLl8kZWwub24oJ2NsaWNrJywgJ1tocmVmXScsIHRoaXMub25BbmNob3JDbGlja2VkLmJpbmQodGhpcykpO1xuXG4gICAgICAgIHRoaXMuX2Nzc1ByZWZpeCA9IGNzc1ByZWZpeCA/PyBDc3NOYW1lLkRFRkFVTFRfUFJFRklYO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgZGVmYXVsdDogJ25vbmUnLCByZWxvYWQ6ICdub25lJyB9LCB0cmFuc2l0aW9uKTtcbiAgICAgICAgdGhpcy5fbmF2aWdhdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IG1ldGhvZDogJ3B1c2gnIH0sIG5hdmlnYXRpb24pO1xuXG4gICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVnaXN0ZXIocm91dGVzISwgZmFsc2UpO1xuICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxTdGFja3M/Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucHVzaFBhZ2VTdGFjayhhZGRpdGlvbmFsU3RhY2tzLCB7IG5vTmF2aWdhdGU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGFydCAmJiBhd2FpdCB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfSkoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZXJcblxuICAgIC8qKiBSb3V0ZXIncyB2aWV3IEhUTUwgZWxlbWVudCAqL1xuICAgIGdldCBlbCgpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIHJldHVybiB0aGlzLl8kZWxbMF07XG4gICAgfVxuXG4gICAgLyoqIE9iamVjdCB3aXRoIGN1cnJlbnQgcm91dGUgZGF0YSAqL1xuICAgIGdldCBjdXJyZW50Um91dGUoKTogUm91dGUge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgc3RhdGUgaXMgaW4gc3ViLWZsb3cgKi9cbiAgICBnZXQgaXNJblN1YkZsb3coKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuZmluZFN1YkZsb3dQYXJhbXMoZmFsc2UpO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBpdCBjYW4gZ28gYmFjayBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkJhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LmNhbkJhY2s7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuRm9yd2FyZDtcbiAgICB9XG5cbiAgICAvKiogUm91dGUgcmVnaXN0cmF0aW9uICovXG4gICAgYXN5bmMgcmVnaXN0ZXIocm91dGVzOiBSb3V0ZVBhcmFtZXRlcnMgfCBSb3V0ZVBhcmFtZXRlcnNbXSwgcmVmcmVzaCA9IGZhbHNlKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHByZWZldGNoUGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyhyb3V0ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3V0ZXNbY29udGV4dC5wYXRoXSA9IGNvbnRleHQ7XG4gICAgICAgICAgICBjb25zdCB7IGNvbnRlbnQsIHByZWZldGNoIH0gPSBjb250ZXh0O1xuICAgICAgICAgICAgY29udGVudCAmJiBwcmVmZXRjaCAmJiBwcmVmZXRjaFBhcmFtcy5wdXNoKGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJlZmV0Y2hQYXJhbXMubGVuZ3RoICYmIGF3YWl0IHRoaXMuc2V0UHJlZmV0Y2hDb250ZW50cyhwcmVmZXRjaFBhcmFtcyk7XG4gICAgICAgIHJlZnJlc2ggJiYgYXdhaXQgdGhpcy5yZWZyZXNoKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIE5hdmlnYXRlIHRvIG5ldyBwYWdlLiAqL1xuICAgIGFzeW5jIG5hdmlnYXRlKHRvOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHRvKTtcbiAgICAgICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsIGBSb3V0ZSBub3QgZm91bmQuIFt0bzogJHt0b31dYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG9wdHMgICA9IE9iamVjdC5hc3NpZ24oeyBpbnRlbnQ6IHVuZGVmaW5lZCB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgICA9IGJ1aWxkTmF2aWdhdGVVcmwodG8sIG9wdHMpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgID0gdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBzZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMubWV0aG9kID8/IHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncy5tZXRob2Q7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gZXhlYyBuYXZpZ2F0ZVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnlbbWV0aG9kXSh1cmwsIHJvdXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEFkZCBwYWdlIHN0YWNrIHN0YXJ0aW5nIGZyb20gdGhlIGN1cnJlbnQgaGlzdG9yeS4gKi9cbiAgICBhc3luYyBwdXNoUGFnZVN0YWNrKHN0YWNrOiBQYWdlU3RhY2sgfCBQYWdlU3RhY2tbXSwgb3B0aW9ucz86IFB1c2hQYWdlU3RhY2tPcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IG5vTmF2aWdhdGUsIHRyYXZlcnNlVG8gfSA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgICAgICBjb25zdCBzdGFja3MgPSBpc0FycmF5KHN0YWNrKSA/IHN0YWNrIDogW3N0YWNrXTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlcyA9IHN0YWNrcy5maWx0ZXIocyA9PiAhIXMucm91dGUpLm1hcChzID0+IHMucm91dGUhKTtcblxuICAgICAgICAgICAgLy8gZW5zcnVlIFJvdXRlXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlZ2lzdGVyKHJvdXRlcywgZmFsc2UpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBwdXNoIGhpc3RvcnlcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhZ2Ugb2Ygc3RhY2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogdXJsLCB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBwYWdlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gdG9Sb3V0ZXJQYXRoKHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbcGF0aDogJHt1cmx9XWAsIHBhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHNpbGVudCByZWdpc3RyeVxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGVDb250ZXh0KHBhdGgsIHRoaXMsIHBhcmFtcywgeyBpbnRlbnQ6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUudHJhbnNpdGlvbiA9IHRyYW5zaXRpb247XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLnJldmVyc2UgICAgPSByZXZlcnNlO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMuX2hpc3RvcnkucHVzaChwYXRoLCByb3V0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAgICAgICAgIGlmICh0cmF2ZXJzZVRvKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkudHJhdmVyc2VUbyh0b1JvdXRlclBhdGgodHJhdmVyc2VUbykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIW5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBwYXRoIHN0cmluZy4gKi9cbiAgICBhc3luYyB0cmF2ZXJzZVRvKHNyYzogc3RyaW5nKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkudHJhdmVyc2VUbyh0b1JvdXRlclBhdGgoc3JjKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBCZWdpbiBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBiZWdpblN1YkZsb3codG86IHN0cmluZywgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtcywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdCEsXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW46IHRoaXMuY3VycmVudFJvdXRlLnVybCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN1YmZsb3csXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlU3ViRmxvd1BhcmFtcyhwYXJhbXMpO1xuICAgICAgICAgICAgKHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dCkuc3ViZmxvdyA9IHBhcmFtcztcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubmF2aWdhdGUodG8sIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENvbW1pdCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjb21taXRTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl9zdWJmbG93VHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGNvbnN0IHsgYWRkaXRpb25hbERpc3RhbmNlLCBhZGRpdGlvbmFsU3RhY2tzIH0gPSBzdWJmbG93LnBhcmFtcztcbiAgICAgICAgY29uc3QgZGlzdGFuY2UgPSBzdWJmbG93LmRpc3RhbmNlICsgYWRkaXRpb25hbERpc3RhbmNlO1xuXG4gICAgICAgIGlmIChhZGRpdGlvbmFsU3RhY2tzPy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoKCkgPT4gdGhpcy5nbygtMSAqIGRpc3RhbmNlKSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnB1c2hQYWdlU3RhY2soYWRkaXRpb25hbFN0YWNrcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogZGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENhbmNlbCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjYW5jZWxTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl9zdWJmbG93VHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBzdWJmbG93LmRpc3RhbmNlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogU2V0IGNvbW1vbiB0cmFuc2l0aW9uIHNldHRuaWdzLiAqL1xuICAgIHRyYW5zaXRpb25TZXR0aW5ncyhuZXdTZXR0aW5ncz86IFRyYW5zaXRpb25TZXR0aW5ncyk6IFRyYW5zaXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi50aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgfTtcbiAgICAgICAgbmV3U2V0dGluZ3MgJiYgT2JqZWN0LmFzc2lnbih0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MsIG5ld1NldHRpbmdzKTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIG5hdmlnYXRpb24gc2V0dG5pZ3MuICovXG4gICAgbmF2aWdhdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogTmF2aWdhdGlvblNldHRpbmdzKTogTmF2aWdhdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFJlZnJlc2ggcm91dGVyIChzcGVjaWZ5IHVwZGF0ZSBsZXZlbCkuICovXG4gICAgYXN5bmMgcmVmcmVzaChsZXZlbCA9IFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSBSb3V0ZXJSZWZyZXNoTGV2ZWwuUkVMT0FEOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdvKCk7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5ET01fQ0xFQVI6IHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbGVhc2VDYWNoZUNvbnRlbnRzKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlICYmICh0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsISk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGB1bnN1cHBvcnRlZCBsZXZlbDogJHtsZXZlbH1gKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtdGVtcGxhdGUtZXhwcmVzc2lvbnNcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogc3ViLWZsb3dcblxuICAgIC8qKiBAaW50ZXJuYWwgZXZhbHVhdGUgc3ViLWZsb3cgcGFyYW1ldGVycyAqL1xuICAgIHByaXZhdGUgZXZhbHVhdGVTdWJGbG93UGFyYW1zKHN1YmZsb3c6IFJvdXRlU3ViRmxvd1BhcmFtcyk6IHZvaWQge1xuICAgICAgICBsZXQgYWRkaXRpb25hbERpc3RhbmNlID0gMDtcblxuICAgICAgICBpZiAoc3ViZmxvdy5iYXNlKSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlSWQgPSBub3JtYWxpemVJZChzdWJmbG93LmJhc2UpO1xuICAgICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCB7IGluZGV4LCBzdGFjayB9ID0gdGhpcy5faGlzdG9yeTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBpbmRleDsgaSA+PSAwOyBpLS0sIGFkZGl0aW9uYWxEaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YWNrW2ldWydAaWQnXSA9PT0gYmFzZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9JTlZBTElEX1NVQkZMT1dfQkFTRV9VUkwsIGBJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLiBbdXJsOiAke3N1YmZsb3cuYmFzZX1dYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdWJmbG93LmJhc2UgPSB0aGlzLmN1cnJlbnRSb3V0ZS51cmw7XG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3QuYXNzaWduKHN1YmZsb3csIHsgYWRkaXRpb25hbERpc3RhbmNlIH0pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBmaW5kU3ViRmxvd1BhcmFtcyhkZXRhY2g6IGJvb2xlYW4pOiB7IGRpc3RhbmNlOiBudW1iZXI7IHBhcmFtczogUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07IH0gfCB2b2lkIHtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSB0aGlzLl9oaXN0b3J5LnN0YWNrO1xuICAgICAgICBmb3IgKGxldCBpID0gc3RhY2subGVuZ3RoIC0gMSwgZGlzdGFuY2UgPSAwOyBpID49IDA7IGktLSwgZGlzdGFuY2UrKykge1xuICAgICAgICAgICAgaWYgKHN0YWNrW2ldLnN1YmZsb3cpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBzdGFja1tpXS5zdWJmbG93IGFzIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgJiB7IGFkZGl0aW9uYWxEaXN0YW5jZTogbnVtYmVyOyB9O1xuICAgICAgICAgICAgICAgIGRldGFjaCAmJiBkZWxldGUgc3RhY2tbaV0uc3ViZmxvdztcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkaXN0YW5jZSwgcGFyYW1zIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gdXRpbHNcblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGBSb3V0ZXJFdmVudEFyZ2AgbWFrZXIgKi9cbiAgICBwcml2YXRlIG1ha2VSb3V0ZUNoYW5nZUluZm8obmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IHtcbiAgICAgICAgY29uc3QgaW50ZW50ID0gbmV3U3RhdGUuaW50ZW50O1xuICAgICAgICBkZWxldGUgbmV3U3RhdGUuaW50ZW50OyAvLyBuYXZpZ2F0ZSDmmYLjgavmjIflrprjgZXjgozjgZ8gaW50ZW50IOOBryBvbmUgdGltZSDjga7jgb/mnInlirnjgavjgZnjgotcblxuICAgICAgICBjb25zdCBmcm9tID0gKG9sZFN0YXRlID8/IHRoaXMuX2xhc3RSb3V0ZSkgYXMgQWNjZXNzaWJsZTxSb3V0ZUNvbnRleHQsIHN0cmluZz4gfCB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHRoaXMuX2hpc3RvcnkuZGlyZWN0KG5ld1N0YXRlWydAaWQnXSwgZnJvbT8uWydAaWQnXSkuZGlyZWN0aW9uO1xuICAgICAgICBjb25zdCBhc3luY1Byb2Nlc3MgPSBuZXcgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQoKTtcbiAgICAgICAgY29uc3QgcmVsb2FkID0gZnJvbSA/IG5ld1N0YXRlLnVybCA9PT0gZnJvbS51cmwgOiB0cnVlO1xuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfVxuICAgICAgICAgICAgPSB0aGlzLl9zdWJmbG93VHJhbnNpdGlvblBhcmFtcyA/PyAocmVsb2FkXG4gICAgICAgICAgICAgICAgPyB7IHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5yZWxvYWQsIHJldmVyc2U6IGZhbHNlIH1cbiAgICAgICAgICAgICAgICA6ICgnYmFjaycgIT09IGRpcmVjdGlvbiA/IG5ld1N0YXRlIDogZnJvbSBhcyBSb3V0ZUNvbnRleHQpKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgZnJvbSxcbiAgICAgICAgICAgIHRvOiBuZXdTdGF0ZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbixcbiAgICAgICAgICAgIGFzeW5jUHJvY2VzcyxcbiAgICAgICAgICAgIHJlbG9hZCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgaW50ZW50LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCByb3V0ZSBieSB1cmwgKi9cbiAgICBwcml2YXRlIGZpbmRSb3V0ZUNvbnRleHRQYXJhbXMocGF0aDogc3RyaW5nKTogUm91dGVDb250ZXh0UGFyYW1ldGVycyB8IHZvaWQge1xuICAgICAgICBjb25zdCBrZXkgPSBgLyR7bm9ybWFsaXplSWQocGF0aC5zcGxpdCgnPycpWzBdKX1gO1xuICAgICAgICBmb3IgKGNvbnN0IHBhdGggb2YgT2JqZWN0LmtleXModGhpcy5fcm91dGVzKSkge1xuICAgICAgICAgICAgY29uc3QgeyByZWdleHAgfSA9IHRoaXMuX3JvdXRlc1twYXRoXTtcbiAgICAgICAgICAgIGlmIChyZWdleHAudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JvdXRlc1twYXRoXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBwYWdlIGV2ZW50ICovXG4gICAgcHJpdmF0ZSB0cmlnZ2VyUGFnZUNhbGxiYWNrKGV2ZW50OiBQYWdlRXZlbnQsIHRhcmdldDogUGFnZSB8IHVuZGVmaW5lZCwgYXJnOiBSb3V0ZSB8IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWV0aG9kID0gY2FtZWxpemUoYHBhZ2UtJHtldmVudH1gKTtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oKHRhcmdldCBhcyBBY2Nlc3NpYmxlPFBhZ2UsIFVua25vd25GdW5jdGlvbj4gfCB1bmRlZmluZWQpPy5bbWV0aG9kXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9ICh0YXJnZXQgYXMgQWNjZXNzaWJsZTxQYWdlLCBVbmtub3duRnVuY3Rpb24+KVttZXRob2RdKGFyZyk7XG4gICAgICAgICAgICBpZiAocmV0dmFsIGluc3RhbmNlb2YgTmF0aXZlUHJvbWlzZSAmJiAoYXJnIGFzIEFjY2Vzc2libGU8Um91dGU+KVsnYXN5bmNQcm9jZXNzJ10pIHtcbiAgICAgICAgICAgICAgICAoYXJnIGFzIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpLmFzeW5jUHJvY2Vzcy5yZWdpc3RlcihyZXR2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB3YWl0IGZyYW1lICovXG4gICAgcHJpdmF0ZSB3YWl0RnJhbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB3YWl0RnJhbWUoMSwgdGhpcy5fcmFmKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZW50cmFuY2VcblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHBhZ2UgbWFpbiBwcm9jZWR1cmUgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZVBhZ2UobmV4dFJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgcHJldlJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgICBwYXJzZVVybFBhcmFtcyhuZXh0Um91dGUpO1xuXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRSb3V0ZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgLy8gdHJhbnNpdGlvbiBjb3JlXG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gYXdhaXQgdGhpcy50cmFuc2l0aW9uUGFnZShwYWdlTmV4dCwgJGVsTmV4dCwgcGFnZVByZXYsICRlbFByZXYsIGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZUNvbnRleHQoJGVsTmV4dCwgJGVsUHJldiwgY2hhbmdlSW5mbywgdHJhbnNpdGlvbik7XG5cbiAgICAgICAgICAgIC8vIOmBt+enu+WFiOOBjCBzdWJmbG93IOmWi+Wni+eCueOBp+OBguOCi+WgtOWQiCwgc3ViZmxvdyDop6PpmaRcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUudXJsID09PSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKT8ucGFyYW1zLm9yaWdpbikge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHJlZmV0Y2ggY29udGVudCDjga7jgrHjgqJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJlYXRQcmVmZXRjaENvbnRlbnRzKCk7XG5cbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBwcmVwYXJlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogUHJvbWlzZTxbUGFnZSwgRE9NLCBQYWdlLCBET01dPiB7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IGNoYW5nZUluZm8udG8gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGNoYW5nZUluZm8uZnJvbSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogbmV4dFBhcmFtcyB9ID0gbmV4dFJvdXRlO1xuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcHJldlBhcmFtcyB9ID0gcHJldlJvdXRlID8/IHt9O1xuXG4gICAgICAgIC8vIHBhZ2UgaW5zdGFuY2VcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKG5leHRSb3V0ZSk7XG4gICAgICAgIC8vIHBhZ2UgJHRlbXBsYXRlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShuZXh0UGFyYW1zKTtcblxuICAgICAgICBjaGFuZ2VJbmZvLnNhbWVQYWdlSW5zdGFuY2UgPSBwcmV2UGFyYW1zPy5wYWdlICYmIHByZXZQYXJhbXMucGFnZSA9PT0gbmV4dFBhcmFtcy5wYWdlO1xuICAgICAgICBjb25zdCB7IHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuXG4gICAgICAgIC8vIHBhZ2UgJGVsXG4gICAgICAgIGlmICghcmVsb2FkICYmIHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xvbmVDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgcHJldlJvdXRlISwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmICghbmV4dFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRlbE5leHQgPSAkKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2VOZXh0ID0gbmV4dFBhcmFtcy5wYWdlITtcblxuICAgICAgICAvLyBtb3VudFxuICAgICAgICBpZiAoISRlbE5leHQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubW91bnRDb250ZW50KCRlbE5leHQsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0XG4gICAgICAgICAgICAocmVsb2FkICYmIHt9IHx8IChwcmV2UGFyYW1zPy5wYWdlID8/IHt9KSksIChyZWxvYWQgJiYgJChudWxsKSB8fCAkKHByZXZSb3V0ZT8uZWwpKSwgLy8gcHJldlxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsb25lQ29udGVudChcbiAgICAgICAgbmV4dFJvdXRlOiBSb3V0ZUNvbnRleHQsIG5leHRQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgICAgIHByZXZSb3V0ZTogUm91dGVDb250ZXh0LFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBuZXh0Um91dGUuZWwgPSBwcmV2Um91dGUuZWw7XG4gICAgICAgIHByZXZSb3V0ZS5lbCA9IG5leHRSb3V0ZS5lbD8uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAkKHByZXZSb3V0ZS5lbCkucmVtb3ZlQXR0cignaWQnKS5pbnNlcnRCZWZvcmUobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgJChuZXh0Um91dGUuZWwpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSkucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWBdKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdjbG9uZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdjbG9uZWQnLCBuZXh0UGFyYW1zLnBhZ2UsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkQ29udGVudChcbiAgICAgICAgcm91dGU6IFJvdXRlQ29udGV4dCwgcGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBsZXQgZmlyZUV2ZW50cyA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFyb3V0ZS5lbCkge1xuICAgICAgICAgICAgY29uc3QgZWxDYWNoZSA9IHRoaXMuX3JvdXRlc1tyb3V0ZS5wYXRoXVsnQHJvdXRlJ10/LmVsO1xuICAgICAgICAgICAgZmlyZUV2ZW50cyA9ICFlbENhY2hlO1xuICAgICAgICAgICAgaWYgKGVsQ2FjaGUpIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkb20tY2FjaGUgY2FzZVxuICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gZWxDYWNoZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLiR0ZW1wbGF0ZT8uaXNDb25uZWN0ZWQpIHsgLy8gcHJlZmV0Y2ggY2FzZVxuICAgICAgICAgICAgICAgIHJvdXRlLmVsICAgICAgICAgPSBwYXJhbXMuJHRlbXBsYXRlWzBdO1xuICAgICAgICAgICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBwYXJhbXMuJHRlbXBsYXRlLmNsb25lKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gcGFyYW1zLiR0ZW1wbGF0ZSEuY2xvbmUoKVswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBtYXN0ZXIgY2FjaGVcbiAgICAgICAgaWYgKHJvdXRlICE9PSB0aGlzLl9yb3V0ZXNbcm91dGUucGF0aF1bJ0Byb3V0ZSddKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3V0ZXNbcm91dGUucGF0aF1bJ0Byb3V0ZSddID0gcm91dGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdsb2FkZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdpbml0JywgcGFyYW1zLnBhZ2UsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBtb3VudENvbnRlbnQoXG4gICAgICAgICRlbDogRE9NLCBwYWdlOiBQYWdlIHwgdW5kZWZpbmVkLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAkZWwuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fJGVsLmFwcGVuZCgkZWwpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ21vdW50ZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdtb3VudGVkJywgcGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVubW91bnRDb250ZW50KHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgJGVsID0gJChyb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2UgPSByb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgIGlmICgkZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcm91dGUpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJvdXRlLmVsKSB7XG4gICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBjb3JlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gY2hhbmdlSW5mby50cmFuc2l0aW9uID8/IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0O1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICdlbnRlci1mcm9tLWNsYXNzJzogY3VzdG9tRW50ZXJGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItYWN0aXZlLWNsYXNzJzogY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdlbnRlci10by1jbGFzcyc6IGN1c3RvbUVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1mcm9tLWNsYXNzJzogY3VzdG9tTGVhdmVGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtYWN0aXZlLWNsYXNzJzogY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS10by1jbGFzcyc6IGN1c3RvbUxlYXZlVG9DbGFzcyxcbiAgICAgICAgfSA9IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncztcblxuICAgICAgICAvLyBlbnRlci1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgZW50ZXJGcm9tQ2xhc3MgICA9IGN1c3RvbUVudGVyRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJBY3RpdmVDbGFzcyA9IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlclRvQ2xhc3MgICAgID0gY3VzdG9tRW50ZXJUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfVE9fQ0xBU1N9YDtcblxuICAgICAgICAvLyBsZWF2ZS1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgbGVhdmVGcm9tQ2xhc3MgICA9IGN1c3RvbUxlYXZlRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVBY3RpdmVDbGFzcyA9IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZVRvQ2xhc3MgICAgID0gY3VzdG9tTGVhdmVUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfVE9fQ0xBU1N9YDtcblxuICAgICAgICBhd2FpdCB0aGlzLmJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAvLyB0cmFuc2lzaW9uIGV4ZWN1dGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsIGVudGVyVG9DbGFzcyksXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGxlYXZlVG9DbGFzcyksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5lbmRUcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRyYW5zaXRpb247XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBiZWdpbiAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLCBlbnRlckZyb21DbGFzczogc3RyaW5nLCBlbnRlckFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sIGxlYXZlRnJvbUNsYXNzOiBzdHJpbmcsIGxlYXZlQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fJGVsLmFkZENsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICAkZWxOZXh0XG4gICAgICAgICAgICAuYWRkQ2xhc3MoW2VudGVyRnJvbUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pXG4gICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKVxuICAgICAgICAgICAgLnJlZmxvdygpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoZW50ZXJBY3RpdmVDbGFzcylcbiAgICAgICAgO1xuICAgICAgICAkZWxQcmV2LmFkZENsYXNzKFtsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcywgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcblxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2JlZm9yZS10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2JlZm9yZS1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyYW5zaXRpb24gcHJvYyA6IGVuZCAqL1xuICAgIHByaXZhdGUgYXN5bmMgZW5kVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgKCRlbE5leHRbMF0gIT09ICRlbFByZXZbMF0pICYmICRlbFByZXYuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgJGVsTmV4dC5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcbiAgICAgICAgJGVsUHJldi5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKTtcblxuICAgICAgICB0aGlzLl8kZWwucmVtb3ZlQ2xhc3MoW1xuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWAsXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX0RJUkVDVElPTn0tJHtkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uKGNoYW5nZUluZm8pfWAsXG4gICAgICAgIF0pO1xuXG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYWZ0ZXItbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYWZ0ZXItZW50ZXInLCBwYWdlTmV4dCwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnYWZ0ZXItdHJhbnNpdGlvbicsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBmaW5hbGl6ZVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgcGFnZSBzdGF0dXMgYWZ0ZXIgdHJhbnNpdGlvbiAqL1xuICAgIHByaXZhdGUgdXBkYXRlQ2hhbmdlQ29udGV4dChcbiAgICAgICAgJGVsTmV4dDogRE9NLFxuICAgICAgICAkZWxQcmV2OiBET00sXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgICAgIHRyYW5zaXRpb246IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICApOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBmcm9tLCByZWxvYWQsIHNhbWVQYWdlSW5zdGFuY2UsIGRpcmVjdGlvbiwgdG8gfSA9IGNoYW5nZUluZm87XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGZyb20gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCBuZXh0Um91dGUgPSB0byBhcyBSb3V0ZUNvbnRleHQ7XG4gICAgICAgIGNvbnN0IHVybENoYW5nZWQgPSAhcmVsb2FkO1xuXG5cbiAgICAgICAgaWYgKCRlbE5leHRbMF0gIT09ICRlbFByZXZbMF0pIHtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBjbGFzc1xuICAgICAgICAgICAgJGVsUHJldlxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgJGVsTmV4dC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YCk7XG5cbiAgICAgICAgICAgIGlmICh1cmxDaGFuZ2VkICYmIHRoaXMuX3ByZXZSb3V0ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZS5lbD8uY2xhc3NMaXN0LnJlbW92ZShgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWApO1xuICAgICAgICAgICAgICAgIHRoaXMudHJlYXREb21DYWNoZUNvbnRlbnRzKG5leHRSb3V0ZSwgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1cmxDaGFuZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgPSBwcmV2Um91dGU7XG4gICAgICAgICAgICBpZiAoc2FtZVBhZ2VJbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgICRlbFByZXYuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgJGVsTmV4dC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWApO1xuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZSAmJiAodGhpcy5fcHJldlJvdXRlLmVsID0gbnVsbCEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbGFzdFJvdXRlID0gdGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0O1xuICAgICAgICAnZm9yd2FyZCcgPT09IGRpcmVjdGlvbiAmJiB0cmFuc2l0aW9uICYmICh0aGlzLl9sYXN0Um91dGUudHJhbnNpdGlvbiA9IHRyYW5zaXRpb24pO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogcHJlZmV0Y2ggJiBkb20gY2FjaGVcblxuICAgIC8qKiBAaW50ZXJuYWwgdW5zZXQgZG9tIGNhY2hlZCBjb250ZW50cyAqL1xuICAgIHByaXZhdGUgcmVsZWFzZUNhY2hlQ29udGVudHMoZWw6IEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuX3JvdXRlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gdGhpcy5fcm91dGVzW2tleV1bJ0Byb3V0ZSddIGFzIFJvdXRlQ29udGV4dCB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChyb3V0ZSkge1xuICAgICAgICAgICAgICAgIGlmIChudWxsID09IGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5tb3VudENvbnRlbnQocm91dGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocm91dGUuZWwgPT09IGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGhpcy5faGlzdG9yeS5zdGFjaykge1xuICAgICAgICAgICAgaWYgKChudWxsID09IGVsICYmIHJvdXRlLmVsKSB8fCByb3V0ZS5lbCA9PT0gZWwpIHtcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBkZXN0cnVjdGlvbiBvZiBkb20gYWNjb3JkaW5nIHRvIGNvbmRpdGlvbiAqL1xuICAgIHByaXZhdGUgdHJlYXREb21DYWNoZUNvbnRlbnRzKG5leHRSb3V0ZTogUm91dGVDb250ZXh0LCBwcmV2Um91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQge1xuICAgICAgICBpZiAocHJldlJvdXRlLmVsICYmIHByZXZSb3V0ZS5lbCAhPT0gdGhpcy5jdXJyZW50Um91dGUuZWwpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQocHJldlJvdXRlLmVsKTtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlTHYgPSAkZWwuZGF0YShEb21DYWNoZS5EQVRBX05BTUUpO1xuICAgICAgICAgICAgaWYgKERvbUNhY2hlLkNBQ0hFX0xFVkVMX0NPTk5FQ1QgIT09IGNhY2hlTHYpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlID0gcHJldlJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICAkZWwuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlyZUV2ZW50cyA9IHByZXZSb3V0ZVsnQHBhcmFtcyddLnBhZ2UgIT09IG5leHRSb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgaWYgKGZpcmVFdmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bm1vdW50ZWQnLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3VubW91bnRlZCcsIHBhZ2UsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9NRU1PUlkgIT09IGNhY2hlTHYpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWxlYXNlQ2FjaGVDb250ZW50cyhwcmV2Um91dGUuZWwpO1xuICAgICAgICAgICAgICAgICAgICBwcmV2Um91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpcmVFdmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5sb2FkZWQnLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdyZW1vdmVkJywgcGFnZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2V0IGRvbSBwcmVmZXRjaGVkIGNvbnRlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcmVmZXRjaENvbnRlbnRzKHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHRvUm91dGUgPSAocGFyYW06IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsIGVsOiBIVE1MRWxlbWVudCk6IFJvdXRlQ29udGV4dCA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0b1JvdXRlQ29udGV4dChwYXJhbS5wcmVmZXRjaCEsIHRoaXMsIHBhcmFtKTtcbiAgICAgICAgICAgIGN0eC5lbCA9IGVsO1xuICAgICAgICAgICAgcmV0dXJuIGN0eDtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB0b1JvdXRlQ2hhbmdlSW5mbyA9IChyb3V0ZTogUm91dGVDb250ZXh0KTogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCA9PiB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJvdXRlcjogdGhpcyxcbiAgICAgICAgICAgICAgICB0bzogcm91dGUsXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uOiAnbm9uZScsXG4gICAgICAgICAgICAgICAgYXN5bmNQcm9jZXNzOiBuZXcgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQoKSxcbiAgICAgICAgICAgICAgICByZWxvYWQ6IGZhbHNlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIHBhcmFtcykge1xuICAgICAgICAgICAgY29uc3QgZWxSb3V0ZSA9IHBhcmFtWydAcm91dGUnXT8uZWw7XG4gICAgICAgICAgICBpZiAoIWVsUm91dGUgfHwgKHRoaXMuY3VycmVudFJvdXRlLmVsICE9PSBlbFJvdXRlICYmIHRoaXMuX2xhc3RSb3V0ZT8uZWwgIT09IGVsUm91dGUgJiYgdGhpcy5fcHJldlJvdXRlPy5lbCAhPT0gZWxSb3V0ZSkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUocGFyYW0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsID0gcGFyYW0uJHRlbXBsYXRlIVswXTtcbiAgICAgICAgICAgICAgICBpZiAoIWVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gdG9Sb3V0ZShwYXJhbSwgZWwpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2Uocm91dGUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdG9Sb3V0ZUNoYW5nZUluZm8ocm91dGUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGFzeW5jUHJvY2VzcyB9ID0gY2hhbmdlSW5mbztcbiAgICAgICAgICAgICAgICAgICAgLy8gbG9hZCAmIGluaXRcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkQ29udGVudChyb3V0ZSwgcGFyYW0sIGNoYW5nZUluZm8sIGFzeW5jUHJvY2Vzcyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIG1vdW50XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMubW91bnRDb250ZW50KCQoZWwpLCBwYXJhbS5wYWdlLCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgbG9hZCBwcmVmZXRjaCBkb20gY29udGVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyZWF0UHJlZmV0Y2hDb250ZW50cygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgLy8g6YG356e75YWI44GL44KJIHByZWZldGNoIGNvbnRlbnQg44KS5qSc5Ye6XG4gICAgICAgIGNvbnN0IHByZWZldGNoUGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgY29uc3QgdGFyZ2V0cyA9IHRoaXMuY3VycmVudFJvdXRlLmVsPy5xdWVyeVNlbGVjdG9yQWxsKGBbZGF0YS0ke0xpbmtEYXRhLlBSRUZFVENIfV1gKSA/PyBbXTtcbiAgICAgICAgZm9yIChjb25zdCBlbCBvZiB0YXJnZXRzKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIGlmIChmYWxzZSAhPT0gJGVsLmRhdGEoTGlua0RhdGEuUFJFRkVUQ0gpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gJGVsLmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXModXJsISk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMucHJlZmV0Y2ggPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgIHByZWZldGNoUGFyYW1zLnB1c2gocGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcmVmZXRjaENvbnRlbnRzKHByZWZldGNoUGFyYW1zKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGBjaGFuZ2luZ2AgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5Q2hhbmdpbmcobmV4dFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgY2FuY2VsOiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5faW5DaGFuZ2luZ1BhZ2UpIHtcbiAgICAgICAgICAgIGNhbmNlbChtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfQlVTWSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0aGlzLm1ha2VSb3V0ZUNoYW5nZUluZm8obmV4dFN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3dpbGwtY2hhbmdlJywgY2hhbmdlSW5mbywgY2FuY2VsKTtcbiAgICAgICAgcHJvbWlzZXMucHVzaCguLi5jaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5wcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYHJlZnJlc2hgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeVJlZnJlc2gobmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQsIHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW5zdXJlID0gKHN0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Pik6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggID0gYC8ke3N0YXRlWydAaWQnXX1gO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHBhdGgpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCwgYFJvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4gW3BhdGg6ICR7cGF0aH1dYCwgc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgPT0gc3RhdGVbJ0BwYXJhbXMnXSkge1xuICAgICAgICAgICAgICAgIC8vIFJvdXRlQ29udGV4dFBhcmFtZXRlciDjgpIgYXNzaWduXG4gICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzdGF0ZSwgdG9Sb3V0ZUNvbnRleHQocGF0aCwgdGhpcywgcGFyYW1zKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmVsKSB7XG4gICAgICAgICAgICAgICAgLy8gaWQg44Gr57SQ44Gl44GP6KaB57Sg44GM44GZ44Gn44Gr5a2Y5Zyo44GZ44KL5aC05ZCI44Gv5Ymy44KK5b2T44GmXG4gICAgICAgICAgICAgICAgc3RhdGUuZWwgPSB0aGlzLl9oaXN0b3J5LmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUgYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHNjaGVkdWxpbmcgYHJlZnJlc2hgIGRvbmUuXG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuY2hhbmdlUGFnZShlbnN1cmUobmV3U3RhdGUpLCBvbGRTdGF0ZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGVycm9yIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGFuZGxlRXJyb3IoZXJyb3I6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKFxuICAgICAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgICAgIGlzUmVzdWx0KGVycm9yKSA/IGVycm9yIDogbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgJ1JvdXRlIG5hdmlnYXRlIGZhaWxlZC4nLCBlcnJvcilcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhbmNob3IgY2xpY2sgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25BbmNob3JDbGlja2VkKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCBhcyBFbGVtZW50KS5jbG9zZXN0KCdbaHJlZl0nKTtcbiAgICAgICAgaWYgKCR0YXJnZXQuZGF0YShMaW5rRGF0YS5QUkVWRU5UX1JPVVRFUikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgY29uc3QgdXJsICAgICAgICA9ICR0YXJnZXQuYXR0cignaHJlZicpO1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gJHRhcmdldC5kYXRhKExpbmtEYXRhLlRSQU5TSVRJT04pIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbWV0aG9kICAgICA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5OQVZJQUdBVEVfTUVUSE9EKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZE9wdHMgPSAoJ3B1c2gnID09PSBtZXRob2QgfHwgJ3JlcGxhY2UnID09PSBtZXRob2QgPyB7IG1ldGhvZCB9IDoge30pIGFzIE5hdmlnYXRpb25TZXR0aW5ncztcblxuICAgICAgICBpZiAoJyMnID09PSB1cmwpIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5iYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMubmF2aWdhdGUodXJsISwgeyB0cmFuc2l0aW9uLCAuLi5tZXRob2RPcHRzIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZXhlY3V0b3IoKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUge0BsaW5rIFJvdXRlcn0gb2JqZWN0LlxuICogQGphIHtAbGluayBSb3V0ZXJ9IOOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc30gb2JqZWN0XG4gKiAgLSBgamFgIHtAbGluayBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvdXRlcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zPzogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyk6IFJvdXRlciB7XG4gICAgcmV0dXJuIG5ldyBSb3V0ZXJDb250ZXh0KHNlbGVjdG9yLCBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgc3RhcnQ6IHRydWUsXG4gICAgfSwgb3B0aW9ucykpO1xufVxuIl0sIm5hbWVzIjpbIiRzaWduYXR1cmUiLCJ0b0lkIiwiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7OztBQUdHO0FBRUgsQ0FBQSxZQUFxQjtBQU1qQjs7O0FBR0c7QUFDSCxJQUFBLElBT0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7QUFQRCxJQUFBLENBQUEsWUFBdUI7QUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLG9CQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsb0JBQTZDLENBQUE7UUFDN0MsV0FBNEMsQ0FBQSxXQUFBLENBQUEsb0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxF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