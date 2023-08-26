/*!
 * @cdp/router 0.9.17
 *   generic router scheme
 */

import { path2regexp } from '@cdp/extension-path2regexp';
export * from '@cdp/extension-path2regexp';
import { safe, at, sort, noop, $cdp, isObject, post, isArray, isString, assignValue, isFunction, sleep, camelize } from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { Deferred, CancelToken, NativePromise } from '@cdp/promise';
import { toUrl, webRoot, toTemplateElement, loadTemplateSource, waitFrame } from '@cdp/web-utils';
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

/* eslint-disable
    @typescript-eslint/no-explicit-any
 */
//__________________________________________________________________________________________________//
/** @internal remove url path section */
const toHash = (url) => {
    const id = /#.*$/.exec(url)?.[0];
    return id ? normalizeId(id) : '';
};
/** @internal remove url path section */
const toPath = (url) => {
    const id = url.substring(webRoot.length);
    return id ? normalizeId(id) : url;
};
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
        void this.replace(id ?? this.toId(this._window.location.href), state, { silent: true });
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
                newId: this.toId(newURL),
                oldId: this.toId(oldURL),
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
    /** @internal convert to ID */
    toId(src) {
        return 'hash' === this._mode ? toHash(src) : toPath(src);
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
                newId: this.toId(newURL),
                oldId: this.toId(oldURL),
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
        const newId = additional?.newId ?? this.toId(location.href);
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
        const keys = [];
        seed.regexp = path2regexp.pathToRegexp(seed.path, keys);
        seed.paramKeys = keys.filter(k => isString(k.name)).map(k => k.name);
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
const buildNavigateUrl = (path, options) => {
    try {
        path = `/${normalizeId(path)}`;
        const { query, params } = options;
        let url = path2regexp.compile(path)(params ?? {});
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
            // eslint-disable-next-line @typescript-eslint/await-thenable
            params.page = await new component(route, componentOptions);
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
    _tempTransitionParams;
    _inChangingPage = false;
    /**
     * constructor
     */
    constructor(selector, options) {
        super();
        const { routes, start, el, window: context, history, initialPath, cssPrefix, transition, navigation, } = options;
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
        void this.register(routes, start);
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
        refresh && await this.go();
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
    async pushPageStack(stack, noNavigate) {
        try {
            const stacks = isArray(stack) ? stack : [stack];
            const routes = stacks.filter(s => !!s.route).map(s => s.route);
            // ensrue Route
            await this.register(routes, false);
            await this.suppressEventListenerScope(async () => {
                // push history
                for (const page of stacks) {
                    const { url, transition, reverse } = page;
                    const params = this.findRouteContextParams(url);
                    if (null == params) {
                        throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, page);
                    }
                    // silent registry
                    const route = toRouteContext(url, this, params, { intent: undefined });
                    route.transition = transition;
                    route.reverse = reverse;
                    void this._history.push(url, route, { silent: true });
                }
                await this.waitFrame();
                if (noNavigate) {
                    await this._history.go(-1 * stacks.length);
                }
            });
            if (!noNavigate) {
                await this.go();
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
    /** To move a specific point in history by stack ID. */
    async traverseTo(id) {
        await this._history.traverseTo(id);
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
        this._tempTransitionParams = Object.assign({ transition, reverse }, params);
        const { additionalDistance, additinalStacks } = subflow.params;
        const distance = subflow.distance + additionalDistance;
        if (additinalStacks?.length) {
            await this.suppressEventListenerScope(() => this.go(-1 * distance));
            await this.pushPageStack(additinalStacks);
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
        this._tempTransitionParams = Object.assign({ transition, reverse }, params);
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
                this.destructCachedContents();
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
        const reload = newState.url === from?.url;
        const { transition, reverse } = this._tempTransitionParams ?? (reload
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
    findRouteContextParams(url) {
        const key = `/${normalizeId(url.split('?')[0])}`;
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
            const retval = target?.[method](arg);
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
            this._tempTransitionParams = undefined;
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
        if (!nextRoute.el) {
            if (!reload && samePageInstance) {
                await this.cloneContent(nextRoute, nextParams, prevRoute, changeInfo, asyncProcess);
            }
            else {
                await this.loadContent(nextRoute, nextParams, changeInfo, asyncProcess);
            }
        }
        const $elNext = dom(nextRoute.el);
        const pageNext = nextParams.page;
        // mount
        if (!$elNext.isConnected) {
            await this.mountContent($elNext, pageNext, changeInfo, asyncProcess);
        }
        return [
            pageNext, $elNext,
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
    /** @internal unset dom prefetched contents */
    destructCachedContents() {
        for (const key of Object.keys(this._routes)) {
            const route = this._routes[key]['@route'];
            route && this.unmountContent(route);
        }
        for (const route of this._history.stack) {
            if (route.el) {
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
            const url = `/${state['@id']}`;
            const params = this.findRouteContextParams(url);
            if (null == params) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, state);
            }
            if (null == state['@params']) {
                // RouteContextParameter を assign
                Object.assign(state, toRouteContext(url, this, params));
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

export { createMemoryHistory, createRouter, createSessionHistory, disposeMemoryHistory, disposeSessionHistory, resetMemoryHistory, resetSessionHistory };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImhpc3RvcnkvaW50ZXJuYWwudHMiLCJoaXN0b3J5L3Nlc3Npb24udHMiLCJoaXN0b3J5L21lbW9yeS50cyIsInJvdXRlci9pbnRlcm5hbC50cyIsInJvdXRlci9hc3luYy1wcm9jZXNzLnRzIiwicm91dGVyL2NvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBST1VURVIgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19ST1VURVJfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAxLCAncm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDIsICdSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVEICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMywgJ1JvdXRlIG5hdmlnYXRlIGZhaWxlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9JTlZBTElEX1NVQkZMT1dfQkFTRV9VUkwgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyA0LCAnSW52YWxpZCBzdWItZmxvdyBiYXNlIHVybC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9CVVNZICAgICAgICAgICAgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyA1LCAnSW4gY2hhbmdpbmcgcGFnZSBwcm9jZXNzIG5vdy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuIiwiaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBhdCxcbiAgICBzb3J0LFxuICAgIG5vb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBEZWZlcnJlZCB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBIaXN0b3J5U3RhdGUsIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBub3JtYWx6aWUgaWQgc3RyaW5nICovXG5leHBvcnQgY29uc3Qgbm9ybWFsaXplSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIC8vIHJlbW92ZSBoZWFkIG9mIFwiI1wiLCBcIi9cIiwgXCIjL1wiIGFuZCB0YWlsIG9mIFwiL1wiXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9eKCNcXC8pfF5bIy9dfFxccyskLywgJycpLnJlcGxhY2UoL15cXHMrJHwoXFwvJCkvLCAnJyk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSBzdGFjayAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZURhdGEgPSA8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBIaXN0b3J5U3RhdGU8VD4gPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHsgJ0BpZCc6IG5vcm1hbGl6ZUlkKGlkKSB9LCBzdGF0ZSk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSB1bmNhbmNlbGxhYmxlIGRlZmVycmVkICovXG5leHBvcnQgY29uc3QgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkID0gKHdhcm46IHN0cmluZyk6IERlZmVycmVkID0+IHtcbiAgICBjb25zdCB1bmNhbmNlbGxhYmxlID0gbmV3IERlZmVycmVkKCkgYXMgV3JpdGFibGU8RGVmZXJyZWQ+O1xuICAgIHVuY2FuY2VsbGFibGUucmVqZWN0ID0gKCkgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4od2Fybik7XG4gICAgICAgIHVuY2FuY2VsbGFibGUucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIHVuY2FuY2VsbGFibGU7XG59O1xuXG4vKiogQGludGVybmFsIGFzc2lnbiBzdGF0ZSBlbGVtZW50IGlmIGFscmVhZHkgZXhpc3RzICovXG5leHBvcnQgY29uc3QgYXNzaWduU3RhdGVFbGVtZW50ID0gKHN0YXRlOiBIaXN0b3J5U3RhdGUsIHN0YWNrOiBIaXN0b3J5U3RhY2spOiB2b2lkID0+IHtcbiAgICBjb25zdCBlbCA9IHN0YWNrLmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgKCFzdGF0ZS5lbCAmJiBlbCkgJiYgKHN0YXRlLmVsID0gZWwpO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsIHN0YWNrIG1hbmFnZW1lbnQgY29tbW9uIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhY2s8VCA9IFBsYWluT2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RhbmNlKDApO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlWydAaWQnXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBNYXRoLnRydW5jKGlkeCk7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgYXJyYXkoKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc2xpY2UoKTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgZmlyc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzRmlyc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAwID09PSB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgbGFzdCBvciBub3QgKi9cbiAgICBnZXQgaXNMYXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXggPT09IHRoaXMuX3N0YWNrLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX3N0YWNrLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIGNsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHVibGljIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5zbGljZSgwLCB0aGlzLl9pbmRleCArIDEpO1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELiAqL1xuICAgIHB1YmxpYyBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgICAgICAgY29uc3QgeyBfaW5kZXg6IGJhc2UgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLl9zdGFja1xuICAgICAgICAgICAgLm1hcCgocywgaW5kZXgpID0+IHsgcmV0dXJuIHsgaW5kZXgsIGRpc3RhbmNlOiBNYXRoLmFicyhiYXNlIC0gaW5kZXgpLCAuLi5zIH07IH0pXG4gICAgICAgICAgICAuZmlsdGVyKHMgPT4gc1snQGlkJ10gPT09IGlkKVxuICAgICAgICA7XG4gICAgICAgIHNvcnQoY2FuZGlkYXRlcywgKGwsIHIpID0+IChsLmRpc3RhbmNlID4gci5kaXN0YW5jZSA/IDEgOiAtMSksIHRydWUpO1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXT8uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgdG8gSUQgYW5kIGZyb20gSUQuICovXG4gICAgcHVibGljIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgY29uc3QgdG9JbmRleCAgID0gdGhpcy5jbG9zZXN0KHRvSWQpO1xuICAgICAgICBjb25zdCBmcm9tSW5kZXggPSBudWxsID09IGZyb21JZCA/IHRoaXMuX2luZGV4IDogdGhpcy5jbG9zZXN0KGZyb21JZCk7XG4gICAgICAgIGlmIChudWxsID09IGZyb21JbmRleCB8fCBudWxsID09IHRvSW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbjogJ21pc3NpbmcnIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRvSW5kZXggLSBmcm9tSW5kZXg7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSAwID09PSBkZWx0YVxuICAgICAgICAgICAgICAgID8gJ25vbmUnXG4gICAgICAgICAgICAgICAgOiBkZWx0YSA8IDAgPyAnYmFjaycgOiAnZm9yd2FyZCc7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb24sIGRlbHRhLCBpbmRleDogdG9JbmRleCwgc3RhdGU6IHRoaXMuX3N0YWNrW3RvSW5kZXhdIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IGFjdGl2ZSBkYXRhIGZyb20gY3VycmVudCBpbmRleCBvcmlnaW4gKi9cbiAgICBwdWJsaWMgZGlzdGFuY2UoZGVsdGE6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHt0aGlzLmxlbmd0aH0sIGdpdmVuOiAke3Bvc31dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXQocG9zKTtcbiAgICB9XG5cbiAgICAvKiogbm9vcCBzdGFjayAqL1xuICAgIHB1YmxpYyBub29wU3RhY2sgPSBub29wOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tZW1iZXItYWNjZXNzaWJpbGl0eVxuXG4gICAgLyoqIHB1c2ggc3RhY2sgKi9cbiAgICBwdWJsaWMgcHVzaFN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1srK3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHJlcGxhY2Ugc3RhY2sgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiBzZWVrIHN0YWNrICovXG4gICAgcHVibGljIHNlZWtTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNsb3Nlc3QoZGF0YVsnQGlkJ10pO1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhY2soZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGRpc3Bvc2Ugb2JqZWN0ICovXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTmFOO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgQWNjZXNzaWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc09iamVjdCxcbiAgICBub29wLFxuICAgICRjZHAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTaWxlbmNlYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgdG9VcmwsIHdlYlJvb3QgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuLi9zc3InO1xuaW1wb3J0IHR5cGUge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeVN0YWNrLFxuICAgIG5vcm1hbGl6ZUlkLFxuICAgIGNyZWF0ZURhdGEsXG4gICAgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkLFxuICAgIGFzc2lnblN0YXRlRWxlbWVudCxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgZGlzcGF0Y2ggYWRkaXRpb25hbCBpbmZvcm1hdGlvbiAqL1xuaW50ZXJmYWNlIERpc3BhdGNoSW5mbzxUPiB7XG4gICAgZGY6IERlZmVycmVkO1xuICAgIG5ld0lkOiBzdHJpbmc7XG4gICAgb2xkSWQ6IHN0cmluZztcbiAgICBwb3N0cHJvYzogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnO1xuICAgIG5leHRTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbiAgICBwcmV2U3RhdGU/OiBIaXN0b3J5U3RhdGU8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgY29uc3RhbnQgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIEhBU0hfUFJFRklYID0gJyMvJyxcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcmVtb3ZlIHVybCBwYXRoIHNlY3Rpb24gKi9cbmNvbnN0IHRvSGFzaCA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgaWQgPSAvIy4qJC8uZXhlYyh1cmwpPy5bMF07XG4gICAgcmV0dXJuIGlkID8gbm9ybWFsaXplSWQoaWQpIDogJyc7XG59O1xuXG4vKiogQGludGVybmFsIHJlbW92ZSB1cmwgcGF0aCBzZWN0aW9uICovXG5jb25zdCB0b1BhdGggPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IGlkID0gdXJsLnN1YnN0cmluZyh3ZWJSb290Lmxlbmd0aCk7XG4gICAgcmV0dXJuIGlkID8gbm9ybWFsaXplSWQoaWQpIDogdXJsO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc2V0RGlzcGF0Y2hJbmZvID0gPFQ+KHN0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICAoc3RhdGVbJGNkcF0gYXMgRGlzcGF0Y2hJbmZvPFQ+KSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4pOiBbVCwgRGlzcGF0Y2hJbmZvPFQ+P10gPT4ge1xuICAgIGlmIChpc09iamVjdChzdGF0ZSkgJiYgc3RhdGVbJGNkcF0pIHtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbCA9IHN0YXRlWyRjZHBdO1xuICAgICAgICBkZWxldGUgc3RhdGVbJGNkcF07XG4gICAgICAgIHJldHVybiBbc3RhdGUsIGFkZGl0aW9uYWwgYXMgRGlzcGF0Y2hJbmZvPFQ+XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW3N0YXRlXTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnU2Vzc2lvbkhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCcm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9tb2RlOiAnaGFzaCcgfCAnaGlzdG9yeSc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9wU3RhdGVIYW5kbGVyOiAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHZvaWQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG4gICAgcHJpdmF0ZSBfZGZHbz86IERlZmVycmVkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3aW5kb3dDb250eHQ6IFdpbmRvdywgbW9kZTogJ2hhc2gnIHwgJ2hpc3RvcnknLCBpZD86IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW5kb3dDb250eHQ7XG4gICAgICAgIHRoaXMuX21vZGUgPSBtb2RlO1xuXG4gICAgICAgIHRoaXMuX3BvcFN0YXRlSGFuZGxlciA9IHRoaXMub25Qb3BTdGF0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQgPz8gdGhpcy50b0lkKHRoaXMuX3dpbmRvdy5sb2NhdGlvbi5ocmVmKSwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IHByZXZTdGF0ZSA9IHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ1Nlc3Npb25IaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRoaXMudG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0aGlzLnRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogJ25vb3AnLFxuICAgICAgICAgICAgICAgIHByZXZTdGF0ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyh0aGlzLnN0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICAvLyBpZiBhbHJlYWR5IGNhbGxlZCwgbm8gcmVhY3Rpb24uXG4gICAgICAgIGlmICh0aGlzLl9kZkdvKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICBpZiAoIWRlbHRhKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCB0aGlzLnN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2RmR28gPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2RmR287XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsZWFyRm9yd2FyZEhpc3RvcnkoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBkZXN0aW5hdGlvbiBzdGFjayBpbmZvcm1hdGlvbiBieSBgc3RhcnRgIGFuZCBgZW5kYCBJRC5cbiAgICAgKiBAamEg6LW354K5LCDntYLngrnjga4gSUQg44KS5oyH5a6a44GX44Gm44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KHRvSWQsIGZyb21JZCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBJRCAqL1xuICAgIHByaXZhdGUgdG9JZChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnaGFzaCcgPT09IHRoaXMuX21vZGUgPyB0b0hhc2goc3JjKSA6IHRvUGF0aChzcmMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBVUkwgKi9cbiAgICBwcml2YXRlIHRvVXJsKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gKCdoYXNoJyA9PT0gdGhpcy5fbW9kZSkgPyBgJHtDb25zdC5IQVNIX1BSRUZJWH0ke2lkfWAgOiB0b1VybChpZCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uLCBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWQgPSBkYXRhWydAaWQnXTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIGRhdGFbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuICAgICAgICBoaXN0b3J5W2Ake21ldGhvZH1TdGF0ZWBdKGRhdGEsICcnLCB0aGlzLnRvVXJsKGlkKSk7XG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KGRhdGEsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogbmV3IERlZmVycmVkKGNhbmNlbCksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRoaXMudG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0aGlzLnRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogbWV0aG9kLFxuICAgICAgICAgICAgICAgIG5leHRTdGF0ZTogZGF0YSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyhkYXRhLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgZGlzcGF0Y2hDaGFuZ2VJbmZvKG5ld1N0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzZXREaXNwYXRjaEluZm8obmV3U3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB0aGlzLl93aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnLCB7IHN0YXRlIH0pKTtcbiAgICAgICAgYXdhaXQgYWRkaXRpb25hbC5kZjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBwb3BzdGF0ZSBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pID0+IFByb21pc2U8dm9pZD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgICAgICBjb25zdCB3YWl0UG9wU3RhdGUgPSAoKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXYuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCBleGVjdXRvcih3YWl0UG9wU3RhdGUpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcm9sbGJhY2sgaGlzdG9yeSAqL1xuICAgIHByaXZhdGUgYXN5bmMgcm9sbGJhY2tIaXN0b3J5KG1ldGhvZDogc3RyaW5nLCBuZXdJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAncmVwbGFjZSc6XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUodGhpcy5zdGF0ZSwgJycsIHRoaXMudG9VcmwodGhpcy5pZCkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICBoaXN0b3J5LmdvKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRoaXMuaW5kZXggLSB0aGlzLmNsb3Nlc3QobmV3SWQpITtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgIT09IGRlbHRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGEgJiYgaGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNsZWFyIGZvcndhcmQgc2Vzc2lvbiBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyRm9yd2FyZEhpc3RvcnkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzT3JpZ2luID0gKHN0OiBBY2Nlc3NpYmxlPHVua25vd24+KTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0Py5bJ0BvcmlnaW4nXSBhcyBib29sZWFuO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBoaXN0b3J5LnN0YXRlO1xuXG4gICAgICAgICAgICAvLyBiYWNrIHRvIHNlc3Npb24gb3JpZ2luXG4gICAgICAgICAgICB3aGlsZSAoIWlzT3JpZ2luKHN0YXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3JjOiBBY2Nlc3NpYmxlPHVua25vd24+KTogdW5rbm93biA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3R4ID0geyAuLi5zcmMgfTtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3R4Wydyb3V0ZXInXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3R4WydAcGFyYW1zJ107XG4gICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBmb3J3YXJkIGZyb20gaW5kZXggMSB0byBjdXJyZW50IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMSwgbiA9IHRoaXMuX3N0YWNrLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0ID0gdGhpcy5fc3RhY2suYXQoaSk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoZW5zdXJlKHN0KSwgJycsIHRoaXMudG9Vcmwoc3RbJ0BpZCddKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWNlaXZlIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBvblBvcFN0YXRlKGV2OiBQb3BTdGF0ZUV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgW25ld1N0YXRlLCBhZGRpdGlvbmFsXSA9IHBhcnNlRGlzcGF0Y2hJbmZvKGV2LnN0YXRlKTtcbiAgICAgICAgY29uc3QgbmV3SWQgICA9IGFkZGl0aW9uYWw/Lm5ld0lkID8/IHRoaXMudG9JZChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgY29uc3QgbWV0aG9kICA9IGFkZGl0aW9uYWw/LnBvc3Rwcm9jID8/ICdzZWVrJztcbiAgICAgICAgY29uc3QgZGYgICAgICA9IGFkZGl0aW9uYWw/LmRmID8/IHRoaXMuX2RmR28gPz8gbmV3IERlZmVycmVkKCk7XG4gICAgICAgIGNvbnN0IG9sZERhdGEgPSBhZGRpdGlvbmFsPy5wcmV2U3RhdGUgfHwgdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IGFkZGl0aW9uYWw/Lm5leHRTdGF0ZSB8fCB0aGlzLmRpcmVjdChuZXdJZCkuc3RhdGUgfHwgY3JlYXRlRGF0YShuZXdJZCwgbmV3U3RhdGUpO1xuICAgICAgICBjb25zdCB7IGNhbmNlbCwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICBkZi5jYXRjaChub29wKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld0RhdGEsIGNhbmNlbCk7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0b2tlbi5yZWFzb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld0RhdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3RGF0YSwgb2xkRGF0YSk7XG5cbiAgICAgICAgICAgIGRmLnJlc29sdmUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gaGlzdG9yeSDjgpLlhYPjgavmiLvjgZlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbGJhY2tIaXN0b3J5KG1ldGhvZCwgbmV3SWQpO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdlcnJvcicsIGUpO1xuICAgICAgICAgICAgZGYucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4ge0BsaW5rIGNyZWF0ZVNlc3Npb25IaXN0b3J5fSgpIG9wdGlvbnMuXG4gKiBAamEge0BsaW5rIGNyZWF0ZVNlc3Npb25IaXN0b3J5fSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICogXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zIHtcbiAgICBjb250ZXh0PzogV2luZG93O1xuICAgIG1vZGU/OiAnaGFzaCcgfCAnaGlzdG9yeSc7XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc30gb2JqZWN0XG4gKiAgLSBgamFgIHtAbGluayBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZD86IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zKTogSUhpc3Rvcnk8VD4ge1xuICAgIGNvbnN0IHsgY29udGV4dCwgbW9kZSB9ID0gT2JqZWN0LmFzc2lnbih7IG1vZGU6ICdoYXNoJyB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFNlc3Npb25IaXN0b3J5KGNvbnRleHQgPz8gd2luZG93LCBtb2RlLCBpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBicm93c2VyIHNlc3Npb24gaGlzdG9yeS5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7IFBsYWluT2JqZWN0LCBwb3N0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ01lbW9yeUhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyA/PyB7fTtcblxuICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ01lbW9yeUhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ25vb3AnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gYmFjayBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkJhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNGaXJzdDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzTGFzdDtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hdChpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3Qgb2xkSW5kZXggPSB0aGlzLmluZGV4O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBpZiBnaXZlbiAwLCBqdXN0IHJlbG9hZC5cbiAgICAgICAgICAgIGNvbnN0IG9sZFN0YXRlID0gZGVsdGEgPyB0aGlzLnN0YXRlIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLl9zdGFjay5kaXN0YW5jZShkZWx0YSA/PyAwKTtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKCdzZWVrJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XG4gICAgICAgICAgICB0aGlzLnNldEluZGV4KG9sZEluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyA/PyB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyRm9yd2FyZCgpOiBQcm9taXNlPHZvaWQ+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcmVxdWlyZS1hd2FpdFxuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBkZXN0aW5hdGlvbiBzdGFjayBpbmZvcm1hdGlvbiBieSBgc3RhcnRgIGFuZCBgZW5kYCBJRC5cbiAgICAgKiBAamEg6LW354K5LCDntYLngrnjga4gSUQg44GL44KJ57WC54K544Gu44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KHRvSWQsIGZyb21JZCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBldmVudCAmIHdhaXQgcHJvY2VzcyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJpZ2dlckV2ZW50QW5kV2FpdChcbiAgICAgICAgZXZlbnQ6ICdyZWZyZXNoJyB8ICdjaGFuZ2luZycsXG4gICAgICAgIGFyZzE6IEhpc3RvcnlTdGF0ZTxUPixcbiAgICAgICAgYXJnMjogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkIHwgKChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICB0aGlzLnB1Ymxpc2goZXZlbnQsIGFyZzEsIGFyZzIgYXMgYW55LCBwcm9taXNlcyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcblxuICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIG5ld1N0YXRlWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KG5ld1N0YXRlLCB0aGlzLl9zdGFjayBhcyBIaXN0b3J5U3RhY2spO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZChjYW5jZWwpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZShtZXRob2QsIGRmLCBuZXdTdGF0ZSwgdGhpcy5zdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2Ugc3RhdGUgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25DaGFuZ2VTdGF0ZShtZXRob2Q6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJywgZGY6IERlZmVycmVkLCBuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgnY2hhbmdpbmcnLCBuZXdTdGF0ZSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3U3RhdGUsIG9sZFN0YXRlKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgbWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBJSGlzdG9yeTxUPiB7XG4gICAgcmV0dXJuIG5ldyBNZW1vcnlIaXN0b3J5KGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IG1lbW9yeSBoaXN0b3J5LlxuICogQGphIOODoeODouODquWxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBNZW1vcnlIaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYE1lbW9yeUhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBNZW1vcnlIaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsImltcG9ydCB7IHBhdGgycmVnZXhwIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAnO1xuaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBDbGFzcyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgYXNzaWduVmFsdWUsXG4gICAgc2xlZXAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgdG9RdWVyeVN0cmluZ3MsXG4gICAgcGFyc2VVcmxRdWVyeSxcbiAgICBjb252ZXJ0VXJsUGFyYW1UeXBlLFxufSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgdG9VcmwsXG4gICAgbG9hZFRlbXBsYXRlU291cmNlLFxuICAgIHRvVGVtcGxhdGVFbGVtZW50LFxufSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgSUhpc3RvcnksXG4gICAgY3JlYXRlU2Vzc2lvbkhpc3RvcnksXG4gICAgY3JlYXRlTWVtb3J5SGlzdG9yeSxcbn0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBQYWdlLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXMsXG4gICAgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgREVGQVVMVF9QUkVGSVggICAgICAgPSAnY2RwJyxcbiAgICBUUkFOU0lUSU9OX0RJUkVDVElPTiA9ICd0cmFuc2l0aW9uLWRpcmVjdGlvbicsXG4gICAgVFJBTlNJVElPTl9SVU5OSU5HICAgPSAndHJhbnNpdGlvbi1ydW5uaW5nJyxcbiAgICBQQUdFX0NVUlJFTlQgICAgICAgICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgICAgICAgID0gJ3BhZ2UtcHJldmlvdXMnLFxuICAgIEVOVEVSX0ZST01fQ0xBU1MgICAgID0gJ2VudGVyLWZyb20nLFxuICAgIEVOVEVSX0FDVElWRV9DTEFTUyAgID0gJ2VudGVyLWFjdGl2ZScsXG4gICAgRU5URVJfVE9fQ0xBU1MgICAgICAgPSAnZW50ZXItdG8nLFxuICAgIExFQVZFX0ZST01fQ0xBU1MgICAgID0gJ2xlYXZlLWZyb20nLFxuICAgIExFQVZFX0FDVElWRV9DTEFTUyAgID0gJ2xlYXZlLWFjdGl2ZScsXG4gICAgTEVBVkVfVE9fQ0xBU1MgICAgICAgPSAnbGVhdmUtdG8nLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBEb21DYWNoZSB7XG4gICAgREFUQV9OQU1FICAgICAgICAgICA9ICdkb20tY2FjaGUnLFxuICAgIENBQ0hFX0xFVkVMX01FTU9SWSAgPSAnbWVtb3J5JyxcbiAgICBDQUNIRV9MRVZFTF9DT05ORUNUID0gJ2Nvbm5lY3QnLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBMaW5rRGF0YSB7XG4gICAgVFJBTlNJVElPTiAgICAgICA9ICd0cmFuc2l0aW9uJyxcbiAgICBOQVZJQUdBVEVfTUVUSE9EID0gJ25hdmlnYXRlLW1ldGhvZCcsXG4gICAgUFJFRkVUQ0ggICAgICAgICA9ICdwcmVmZXRjaCcsXG4gICAgUFJFVkVOVF9ST1VURVIgICA9ICdwcmV2ZW50LXJvdXRlcicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENvbnN0IHtcbiAgICBXQUlUX1RSQU5TSVRJT05fTUFSR0lOID0gMTAwLCAvLyBtc2VjXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFBhZ2VFdmVudCA9ICdpbml0JyB8ICdtb3VudGVkJyB8ICdjbG9uZWQnIHwgJ2JlZm9yZS1lbnRlcicgfCAnYWZ0ZXItZW50ZXInIHwgJ2JlZm9yZS1sZWF2ZScgfCAnYWZ0ZXItbGVhdmUnIHwgJ3VubW91bnRlZCcgfCAncmVtb3ZlZCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCBleHRlbmRzIFJvdXRlQ2hhbmdlSW5mbyB7XG4gICAgcmVhZG9ubHkgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dDtcbiAgICBzYW1lUGFnZUluc3RhbmNlPzogYm9vbGVhbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZmxhdCBSb3V0ZVBhcmFtZXRlcnMgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSBPbWl0PFJvdXRlUGFyYW1ldGVycywgJ3JvdXRlcyc+ICYge1xuICAgIC8qKiByZWdleHAgZnJvbSBwYXRoICovXG4gICAgcmVnZXhwOiBSZWdFeHA7XG4gICAgLyoqIGtleXMgb2YgcGFyYW1zICovXG4gICAgcGFyYW1LZXlzOiBzdHJpbmdbXTtcbiAgICAvKiogRE9NIHRlbXBsYXRlIGluc3RhbmNlIHdpdGggUGFnZSBlbGVtZW50ICovXG4gICAgJHRlbXBsYXRlPzogRE9NO1xuICAgIC8qKiByb3V0ZXIgcGFnZSBpbnN0YW5jZSBmcm9tIGBjb21wb25lbnRgIHByb3BlcnR5ICovXG4gICAgcGFnZT86IFBhZ2U7XG4gICAgLyoqIGxhdGVzdCByb3V0ZSBjb250ZXh0IGNhY2hlICovXG4gICAgJ0Byb3V0ZSc/OiBSb3V0ZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgPSBSb3V0ZVN1YkZsb3dQYXJhbXMgJiBSZXF1aXJlZDxQYWdlVHJhbnNpdGlvblBhcmFtcz4gJiB7XG4gICAgb3JpZ2luOiBzdHJpbmc7XG59O1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0ID0gV3JpdGFibGU8Um91dGU+ICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyAmIHtcbiAgICAnQHBhcmFtcyc6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQ7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHRvIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0ID0gKHVybDogc3RyaW5nLCByb3V0ZXI6IFJvdXRlciwgcGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBuYXZPcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFJvdXRlQ29udGV4dCA9PiB7XG4gICAgLy8gb21pdCB1bmNsb25hYmxlIHByb3BzXG4gICAgY29uc3QgZnJvbU5hdmlnYXRlID0gISFuYXZPcHRpb25zO1xuICAgIGNvbnN0IGVuc3VyZUNsb25lID0gKGN0eDogdW5rbm93bik6IFJvdXRlQ29udGV4dCA9PiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICB7XG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICByb3V0ZXI6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHJvdXRlcixcbiAgICAgICAgfSxcbiAgICAgICAgbmF2T3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICAgICAgICAgIHF1ZXJ5OiB7fSxcbiAgICAgICAgICAgIHBhcmFtczoge30sXG4gICAgICAgICAgICBwYXRoOiBwYXJhbXMucGF0aCxcbiAgICAgICAgICAgICdAcGFyYW1zJzogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcGFyYW1zLFxuICAgICAgICB9LFxuICAgICk7XG4gICAgcmV0dXJuIGZyb21OYXZpZ2F0ZSA/IGVuc3VyZUNsb25lKGNvbnRleHQpIDogY29udGV4dCBhcyBSb3V0ZUNvbnRleHQ7XG59O1xuXG4vKiogQGludGVybmFsIGNvbnZlcnQgY29udGV4dCBwYXJhbXMgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSAocm91dGVzOiBSb3V0ZVBhcmFtZXRlcnMgfCBSb3V0ZVBhcmFtZXRlcnNbXSB8IHVuZGVmaW5lZCk6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9PiB7XG4gICAgY29uc3QgZmxhdHRlbiA9IChwYXJlbnRQYXRoOiBzdHJpbmcsIG5lc3RlZDogUm91dGVQYXJhbWV0ZXJzW10pOiBSb3V0ZVBhcmFtZXRlcnNbXSA9PiB7XG4gICAgICAgIGNvbnN0IHJldHZhbDogUm91dGVQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBuIG9mIG5lc3RlZCkge1xuICAgICAgICAgICAgbi5wYXRoID0gYCR7cGFyZW50UGF0aC5yZXBsYWNlKC9cXC8kLywgJycpfS8ke25vcm1hbGl6ZUlkKG4ucGF0aCl9YDtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKG4pO1xuICAgICAgICAgICAgaWYgKG4ucm91dGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goLi4uZmxhdHRlbihuLnBhdGgsIG4ucm91dGVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZsYXR0ZW4oJycsIGlzQXJyYXkocm91dGVzKSA/IHJvdXRlcyA6IHJvdXRlcyA/IFtyb3V0ZXNdIDogW10pXG4gICAgICAgIC5tYXAoKHNlZWQ6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleXM6IHBhdGgycmVnZXhwLktleVtdID0gW107XG4gICAgICAgICAgICBzZWVkLnJlZ2V4cCA9IHBhdGgycmVnZXhwLnBhdGhUb1JlZ2V4cChzZWVkLnBhdGgsIGtleXMpO1xuICAgICAgICAgICAgc2VlZC5wYXJhbUtleXMgPSBrZXlzLmZpbHRlcihrID0+IGlzU3RyaW5nKGsubmFtZSkpLm1hcChrID0+IGsubmFtZSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgICAgIH0pO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcHJlcGFyZSBJSGlzdG9yeSBvYmplY3QgKi9cbmV4cG9ydCBjb25zdCBwcmVwYXJlSGlzdG9yeSA9IChzZWVkOiAnaGFzaCcgfCAnaGlzdG9yeScgfCAnbWVtb3J5JyB8IElIaXN0b3J5ID0gJ2hhc2gnLCBpbml0aWFsUGF0aD86IHN0cmluZywgY29udGV4dD86IFdpbmRvdyk6IElIaXN0b3J5PFJvdXRlQ29udGV4dD4gPT4ge1xuICAgIHJldHVybiAoaXNTdHJpbmcoc2VlZClcbiAgICAgICAgPyAnbWVtb3J5JyA9PT0gc2VlZCA/IGNyZWF0ZU1lbW9yeUhpc3RvcnkoaW5pdGlhbFBhdGggPz8gJycpIDogY3JlYXRlU2Vzc2lvbkhpc3RvcnkoaW5pdGlhbFBhdGgsIHVuZGVmaW5lZCwgeyBtb2RlOiBzZWVkLCBjb250ZXh0IH0pXG4gICAgICAgIDogc2VlZFxuICAgICkgYXMgSUhpc3Rvcnk8Um91dGVDb250ZXh0Pjtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBidWlsZE5hdmlnYXRlVXJsID0gKHBhdGg6IHN0cmluZywgb3B0aW9uczogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IHN0cmluZyA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcGF0aCA9IGAvJHtub3JtYWxpemVJZChwYXRoKX1gO1xuICAgICAgICBjb25zdCB7IHF1ZXJ5LCBwYXJhbXMgfSA9IG9wdGlvbnM7XG4gICAgICAgIGxldCB1cmwgPSBwYXRoMnJlZ2V4cC5jb21waWxlKHBhdGgpKHBhcmFtcyA/PyB7fSk7XG4gICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhxdWVyeSl9YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCxcbiAgICAgICAgICAgIGBDb25zdHJ1Y3Qgcm91dGUgZGVzdGluYXRpb24gZmFpbGVkLiBbcGF0aDogJHtwYXRofSwgZGV0YWlsOiAke2Vycm9yLnRvU3RyaW5nKCl9XWAsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxQYXJhbXMgPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHsgdXJsIH0gPSByb3V0ZTtcbiAgICByb3V0ZS5xdWVyeSAgPSB1cmwuaW5jbHVkZXMoJz8nKSA/IHBhcnNlVXJsUXVlcnkobm9ybWFsaXplSWQodXJsKSkgOiB7fTtcbiAgICByb3V0ZS5wYXJhbXMgPSB7fTtcblxuICAgIGNvbnN0IHsgcmVnZXhwLCBwYXJhbUtleXMgfSA9IHJvdXRlWydAcGFyYW1zJ107XG4gICAgaWYgKHBhcmFtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gcmVnZXhwLmV4ZWModXJsKT8ubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHsgcmV0dXJuIHsgdmFsdWUsIGtleTogcGFyYW1LZXlzW2luZGV4IC0gMV0gfTsgfSk7XG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zISkge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gcGFyYW0ua2V5ICYmIG51bGwgIT0gcGFyYW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhc3NpZ25WYWx1ZShyb3V0ZS5wYXJhbXMsIHBhcmFtLmtleSwgY29udmVydFVybFBhcmFtVHlwZShwYXJhbS52YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjaW5zdGFuY2UgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UgPSBhc3luYyAocm91dGU6IFJvdXRlQ29udGV4dCk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBwYXJhbXMgfSA9IHJvdXRlO1xuXG4gICAgaWYgKHBhcmFtcy5wYWdlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgeyBjb21wb25lbnQsIGNvbXBvbmVudE9wdGlvbnMgfSA9IHBhcmFtcztcbiAgICBpZiAoaXNGdW5jdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2F3YWl0LXRoZW5hYmxlXG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IGF3YWl0IG5ldyAoY29tcG9uZW50IGFzIHVua25vd24gYXMgQ2xhc3MpKHJvdXRlLCBjb21wb25lbnRPcHRpb25zKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICBwYXJhbXMucGFnZSA9IGF3YWl0IGNvbXBvbmVudChyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGNvbXBvbmVudCkpIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSBPYmplY3QuYXNzaWduKHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0sIGNvbXBvbmVudCkgYXMgUGFnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMucGFnZSA9IHsgJ0Byb3V0ZSc6IHJvdXRlLCAnQG9wdGlvbnMnOiBjb21wb25lbnRPcHRpb25zIH0gYXMgUGFnZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyMkdGVtcGxhdGUgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUgPSBhc3luYyAocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKHBhcmFtcy4kdGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCBlbnN1cmVJbnN0YW5jZSA9IChlbDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQpOiBET00gPT4ge1xuICAgICAgICByZXR1cm4gZWwgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gJChbLi4uZWwuY29udGVudC5jaGlsZHJlbl0pIGFzIERPTSA6ICQoZWwpO1xuICAgIH07XG5cbiAgICBjb25zdCB7IGNvbnRlbnQgfSA9IHBhcmFtcztcbiAgICBpZiAobnVsbCA9PSBjb250ZW50KSB7XG4gICAgICAgIC8vIG5vb3AgZWxlbWVudFxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gJDxIVE1MRWxlbWVudD4oKTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKChjb250ZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnc2VsZWN0b3InXSkpIHtcbiAgICAgICAgLy8gZnJvbSBhamF4XG4gICAgICAgIGNvbnN0IHsgc2VsZWN0b3IsIHVybCB9ID0gY29udGVudCBhcyB7IHNlbGVjdG9yOiBzdHJpbmc7IHVybD86IHN0cmluZzsgfTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0b1RlbXBsYXRlRWxlbWVudChhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsOiB1cmwgJiYgdG9VcmwodXJsKSB9KSk7XG4gICAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGB0ZW1wbGF0ZSBsb2FkIGZhaWxlZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfSwgdXJsOiAke3VybH1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKHRlbXBsYXRlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oY29udGVudCkpIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoYXdhaXQgY29udGVudCgpKVswXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoY29udGVudCBhcyBET01TZWxlY3RvcilbMF0pO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGRlY2lkZSB0cmFuc2l0aW9uIGRpcmVjdGlvbiAqL1xuZXhwb3J0IGNvbnN0IGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24gPSAoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvKTogSGlzdG9yeURpcmVjdGlvbiA9PiB7XG4gICAgaWYgKGNoYW5nZUluZm8ucmV2ZXJzZSkge1xuICAgICAgICBzd2l0Y2ggKGNoYW5nZUluZm8uZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdiYWNrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgY2FzZSAnZm9yd2FyZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdiYWNrJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZUluZm8uZGlyZWN0aW9uO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBFZmZlY3RUeXBlID0gJ2FuaW1hdGlvbicgfCAndHJhbnNpdGlvbic7XG5cbi8qKiBAaW50ZXJuYWwgcmV0cmlldmUgZWZmZWN0IGR1cmF0aW9uIHByb3BlcnR5ICovXG5jb25zdCBnZXRFZmZlY3REdXJhdGlvblNlYyA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlKTogbnVtYmVyID0+IHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKCRlbFswXSlbYCR7ZWZmZWN0fUR1cmF0aW9uYF0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCB3YWl0Rm9yRWZmZWN0ID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUsIGR1cmF0aW9uU2VjOiBudW1iZXIpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiAkZWxbYCR7ZWZmZWN0fUVuZGBdKHJlc29sdmUpKSxcbiAgICAgICAgc2xlZXAoZHVyYXRpb25TZWMgKiAxMDAwICsgQ29uc3QuV0FJVF9UUkFOU0lUSU9OX01BUkdJTiksXG4gICAgXSk7XG59O1xuXG4vKiogQGludGVybmFsIHRyYW5zaXRpb24gZXhlY3V0aW9uICovXG5leHBvcnQgY29uc3QgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uID0gYXN5bmMoJGVsOiBET00sIGZyb21DbGFzczogc3RyaW5nLCBhY3RpdmVDbGFzczogc3RyaW5nLCB0b0NsYXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAkZWwucmVtb3ZlQ2xhc3MoZnJvbUNsYXNzKTtcbiAgICAkZWwuYWRkQ2xhc3ModG9DbGFzcyk7XG5cbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgWydhbmltYXRpb24nLCAndHJhbnNpdGlvbiddIGFzIEVmZmVjdFR5cGVbXSkge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IGdldEVmZmVjdER1cmF0aW9uU2VjKCRlbCwgZWZmZWN0KTtcbiAgICAgICAgZHVyYXRpb24gJiYgcHJvbWlzZXMucHVzaCh3YWl0Rm9yRWZmZWN0KCRlbCwgZWZmZWN0LCBkdXJhdGlvbikpO1xuICAgIH1cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3MoW2FjdGl2ZUNsYXNzLCB0b0NsYXNzXSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBSb3V0ZUF5bmNQcm9jZXNzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUF5bmNQcm9jZXNzIGltcGxlbWVudGF0aW9uICovXG5leHBvcnQgY2xhc3MgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgaW1wbGVtZW50cyBSb3V0ZUF5bmNQcm9jZXNzIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZUF5bmNQcm9jZXNzXG5cbiAgICByZWdpc3Rlcihwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWwgbWV0aG9kczpcblxuICAgIGdldCBwcm9taXNlcygpOiByZWFkb25seSBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGNvbXBsZXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9wcm9taXNlcyk7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLmxlbmd0aCA9IDA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNhbWVsaXplLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBOYXRpdmVQcm9taXNlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgaXNSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlckV2ZW50LFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICBOYXZpZ2F0aW9uU2V0dGluZ3MsXG4gICAgUGFnZVN0YWNrLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgQ3NzTmFtZSxcbiAgICBEb21DYWNoZSxcbiAgICBMaW5rRGF0YSxcbiAgICBQYWdlRXZlbnQsXG4gICAgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0LFxuICAgIFJvdXRlQ29udGV4dCxcbiAgICBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICB0b1JvdXRlQ29udGV4dCxcbiAgICBwcmVwYXJlSGlzdG9yeSxcbiAgICBidWlsZE5hdmlnYXRlVXJsLFxuICAgIHBhcnNlVXJsUGFyYW1zLFxuICAgIGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZSxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUsXG4gICAgZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbixcbiAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgfSBmcm9tICcuL2FzeW5jLXByb2Nlc3MnO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUm91dGVyIGltcGxpbWVudCBjbGFzcy5cbiAqIEBqYSBSb3V0ZXIg5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJvdXRlckNvbnRleHQgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSb3V0ZXJFdmVudD4gaW1wbGVtZW50cyBSb3V0ZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlczogUmVjb3JkPHN0cmluZywgUm91dGVDb250ZXh0UGFyYW1ldGVycz4gPSB7fTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5OiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRlbDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JhZjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlDaGFuZ2luZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5UmVmcmVzaEhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlSZWZyZXNoO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Vycm9ySGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGFuZGxlRXJyb3I7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY3NzUHJlZml4OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdHJhbnNpdGlvblNldHRpbmdzOiBUcmFuc2l0aW9uU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBfbmF2aWdhdGlvblNldHRpbmdzOiBSZXF1aXJlZDxOYXZpZ2F0aW9uU2V0dGluZ3M+O1xuICAgIHByaXZhdGUgX2xhc3RSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9wcmV2Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfdGVtcFRyYW5zaXRpb25QYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcztcbiAgICBwcml2YXRlIF9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdzogY29udGV4dCxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgICAgIGNzc1ByZWZpeCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICBuYXZpZ2F0aW9uLFxuICAgICAgICB9ID0gb3B0aW9ucztcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIHRoaXMuX3JhZiA9IGNvbnRleHQ/LnJlcXVlc3RBbmltYXRpb25GcmFtZSA/PyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgICAgIHRoaXMuXyRlbCA9ICQoc2VsZWN0b3IsIGVsKTtcbiAgICAgICAgaWYgKCF0aGlzLl8kZWwubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQsIGBSb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuIFtzZWxlY3RvcjogJHtzZWxlY3RvciBhcyBzdHJpbmd9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeSA9IHByZXBhcmVIaXN0b3J5KGhpc3RvcnksIGluaXRpYWxQYXRoLCBjb250ZXh0ISk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIgPSB0aGlzLm9uSGlzdG9yeUNoYW5naW5nLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlciAgPSB0aGlzLm9uSGlzdG9yeVJlZnJlc2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fZXJyb3JIYW5kbGVyICAgICAgICAgICA9IHRoaXMub25IYW5kbGVFcnJvci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGZvbGxvdyBhbmNob3JcbiAgICAgICAgdGhpcy5fJGVsLm9uKCdjbGljaycsICdbaHJlZl0nLCB0aGlzLm9uQW5jaG9yQ2xpY2tlZC5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9jc3NQcmVmaXggPSBjc3NQcmVmaXggPz8gQ3NzTmFtZS5ERUZBVUxUX1BSRUZJWDtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IGRlZmF1bHQ6ICdub25lJywgcmVsb2FkOiAnbm9uZScgfSwgdHJhbnNpdGlvbik7XG4gICAgICAgIHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBtZXRob2Q6ICdwdXNoJyB9LCBuYXZpZ2F0aW9uKTtcblxuICAgICAgICB2b2lkIHRoaXMucmVnaXN0ZXIocm91dGVzISwgc3RhcnQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuQmFjaztcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5Gb3J3YXJkO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICBhc3luYyByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3QgcHJlZmV0Y2hQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKHJvdXRlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tjb250ZXh0LnBhdGhdID0gY29udGV4dDtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGVudCwgcHJlZmV0Y2ggfSA9IGNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZW50ICYmIHByZWZldGNoICYmIHByZWZldGNoUGFyYW1zLnB1c2goY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcmVmZXRjaFBhcmFtcy5sZW5ndGggJiYgYXdhaXQgdGhpcy5zZXRQcmVmZXRjaENvbnRlbnRzKHByZWZldGNoUGFyYW1zKTtcbiAgICAgICAgcmVmcmVzaCAmJiBhd2FpdCB0aGlzLmdvKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIE5hdmlnYXRlIHRvIG5ldyBwYWdlLiAqL1xuICAgIGFzeW5jIG5hdmlnYXRlKHRvOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHRvKTtcbiAgICAgICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsIGBSb3V0ZSBub3QgZm91bmQuIFt0bzogJHt0b31dYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG9wdHMgICA9IE9iamVjdC5hc3NpZ24oeyBpbnRlbnQ6IHVuZGVmaW5lZCB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgICA9IGJ1aWxkTmF2aWdhdGVVcmwodG8sIG9wdHMpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgID0gdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBzZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMubWV0aG9kID8/IHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncy5tZXRob2Q7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gZXhlYyBuYXZpZ2F0ZVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnlbbWV0aG9kXSh1cmwsIHJvdXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEFkZCBwYWdlIHN0YWNrIHN0YXJ0aW5nIGZyb20gdGhlIGN1cnJlbnQgaGlzdG9yeS4gKi9cbiAgICBhc3luYyBwdXNoUGFnZVN0YWNrKHN0YWNrOiBQYWdlU3RhY2sgfCBQYWdlU3RhY2tbXSwgbm9OYXZpZ2F0ZT86IGJvb2xlYW4pOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrcyA9IGlzQXJyYXkoc3RhY2spID8gc3RhY2sgOiBbc3RhY2tdO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gc3RhY2tzLmZpbHRlcihzID0+ICEhcy5yb3V0ZSkubWFwKHMgPT4gcy5yb3V0ZSEpO1xuXG4gICAgICAgICAgICAvLyBlbnNydWUgUm91dGVcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVnaXN0ZXIocm91dGVzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIHB1c2ggaGlzdG9yeVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBzdGFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB1cmwsIHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHBhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFt1cmw6ICR7dXJsfV1gLCBwYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBzaWxlbnQgcmVnaXN0cnlcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHBhcmFtcywgeyBpbnRlbnQ6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUudHJhbnNpdGlvbiA9IHRyYW5zaXRpb247XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLnJldmVyc2UgICAgPSByZXZlcnNlO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMuX2hpc3RvcnkucHVzaCh1cmwsIHJvdXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5nbygtMSAqIHN0YWNrcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIW5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmdvKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkgYnkgc3RhY2sgSUQuICovXG4gICAgYXN5bmMgdHJhdmVyc2VUbyhpZDogc3RyaW5nKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkudHJhdmVyc2VUbyhpZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBCZWdpbiBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBiZWdpblN1YkZsb3codG86IHN0cmluZywgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtcywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdCEsXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW46IHRoaXMuY3VycmVudFJvdXRlLnVybCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN1YmZsb3csXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlU3ViRmxvd1BhcmFtcyhwYXJhbXMpO1xuICAgICAgICAgICAgKHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dCkuc3ViZmxvdyA9IHBhcmFtcztcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubmF2aWdhdGUodG8sIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENvbW1pdCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjb21taXRTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGNvbnN0IHsgYWRkaXRpb25hbERpc3RhbmNlLCBhZGRpdGluYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW5hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKCgpID0+IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW5hbFN0YWNrcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogZGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENhbmNlbCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjYW5jZWxTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBzdWJmbG93LmRpc3RhbmNlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogU2V0IGNvbW1vbiB0cmFuc2l0aW9uIHNldHRuaWdzLiAqL1xuICAgIHRyYW5zaXRpb25TZXR0aW5ncyhuZXdTZXR0aW5ncz86IFRyYW5zaXRpb25TZXR0aW5ncyk6IFRyYW5zaXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi50aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgfTtcbiAgICAgICAgbmV3U2V0dGluZ3MgJiYgT2JqZWN0LmFzc2lnbih0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MsIG5ld1NldHRpbmdzKTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIG5hdmlnYXRpb24gc2V0dG5pZ3MuICovXG4gICAgbmF2aWdhdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogTmF2aWdhdGlvblNldHRpbmdzKTogTmF2aWdhdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFJlZnJlc2ggcm91dGVyIChzcGVjaWZ5IHVwZGF0ZSBsZXZlbCkuICovXG4gICAgYXN5bmMgcmVmcmVzaChsZXZlbCA9IFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSBSb3V0ZXJSZWZyZXNoTGV2ZWwuUkVMT0FEOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdvKCk7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5ET01fQ0xFQVI6IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3RydWN0Q2FjaGVkQ29udGVudHMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVuc3VwcG9ydGVkIGxldmVsOiAke2xldmVsfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiBzdWItZmxvd1xuXG4gICAgLyoqIEBpbnRlcm5hbCBldmFsdWF0ZSBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBldmFsdWF0ZVN1YkZsb3dQYXJhbXMoc3ViZmxvdzogUm91dGVTdWJGbG93UGFyYW1zKTogdm9pZCB7XG4gICAgICAgIGxldCBhZGRpdGlvbmFsRGlzdGFuY2UgPSAwO1xuXG4gICAgICAgIGlmIChzdWJmbG93LmJhc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKHN1YmZsb3cuYmFzZSk7XG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IHsgaW5kZXgsIHN0YWNrIH0gPSB0aGlzLl9oaXN0b3J5O1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGktLSwgYWRkaXRpb25hbERpc3RhbmNlKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2tbaV1bJ0BpZCddID09PSBiYXNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCwgYEludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuIFt1cmw6ICR7c3ViZmxvdy5iYXNlfV1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1YmZsb3cuYmFzZSA9IHRoaXMuY3VycmVudFJvdXRlLnVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24oc3ViZmxvdywgeyBhZGRpdGlvbmFsRGlzdGFuY2UgfSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGZpbmRTdWJGbG93UGFyYW1zKGRldGFjaDogYm9vbGVhbik6IHsgZGlzdGFuY2U6IG51bWJlcjsgcGFyYW1zOiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ICYgeyBhZGRpdGlvbmFsRGlzdGFuY2U6IG51bWJlcjsgfTsgfSB8IHZvaWQge1xuICAgICAgICBjb25zdCBzdGFjayA9IHRoaXMuX2hpc3Rvcnkuc3RhY2s7XG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFjay5sZW5ndGggLSAxLCBkaXN0YW5jZSA9IDA7IGkgPj0gMDsgaS0tLCBkaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICBpZiAoc3RhY2tbaV0uc3ViZmxvdykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN0YWNrW2ldLnN1YmZsb3cgYXMgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgZGV0YWNoICYmIGRlbGV0ZSBzdGFja1tpXS5zdWJmbG93O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRpc3RhbmNlLCBwYXJhbXMgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiB1dGlsc1xuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gYFJvdXRlckV2ZW50QXJnYCBtYWtlciAqL1xuICAgIHByaXZhdGUgbWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQge1xuICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXdTdGF0ZS5pbnRlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdTdGF0ZS5pbnRlbnQ7IC8vIG5hdmlnYXRlIOaZguOBq+aMh+WumuOBleOCjOOBnyBpbnRlbnQg44GvIG9uZSB0aW1lIOOBruOBv+acieWKueOBq+OBmeOCi1xuXG4gICAgICAgIGNvbnN0IGZyb20gPSAob2xkU3RhdGUgPz8gdGhpcy5fbGFzdFJvdXRlKSBhcyBSb3V0ZUNvbnRleHQgJiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aGlzLl9oaXN0b3J5LmRpcmVjdChuZXdTdGF0ZVsnQGlkJ10sIGZyb20/LlsnQGlkJ10pLmRpcmVjdGlvbjtcbiAgICAgICAgY29uc3QgYXN5bmNQcm9jZXNzID0gbmV3IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0KCk7XG4gICAgICAgIGNvbnN0IHJlbG9hZCA9IG5ld1N0YXRlLnVybCA9PT0gZnJvbT8udXJsO1xuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfVxuICAgICAgICAgICAgPSB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA/PyAocmVsb2FkXG4gICAgICAgICAgICAgICAgPyB7IHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5yZWxvYWQsIHJldmVyc2U6IGZhbHNlIH1cbiAgICAgICAgICAgICAgICA6ICgnYmFjaycgIT09IGRpcmVjdGlvbiA/IG5ld1N0YXRlIDogZnJvbSBhcyBSb3V0ZUNvbnRleHQpKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgZnJvbSxcbiAgICAgICAgICAgIHRvOiBuZXdTdGF0ZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbixcbiAgICAgICAgICAgIGFzeW5jUHJvY2VzcyxcbiAgICAgICAgICAgIHJlbG9hZCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgaW50ZW50LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCByb3V0ZSBieSB1cmwgKi9cbiAgICBwcml2YXRlIGZpbmRSb3V0ZUNvbnRleHRQYXJhbXModXJsOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZCh1cmwuc3BsaXQoJz8nKVswXSl9YDtcbiAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIE9iamVjdC5rZXlzKHRoaXMuX3JvdXRlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVnZXhwIH0gPSB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICBpZiAocmVnZXhwLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgcGFnZSBldmVudCAqL1xuICAgIHByaXZhdGUgdHJpZ2dlclBhZ2VDYWxsYmFjayhldmVudDogUGFnZUV2ZW50LCB0YXJnZXQ6IFBhZ2UgfCB1bmRlZmluZWQsIGFyZzogUm91dGUgfCBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGNhbWVsaXplKGBwYWdlLSR7ZXZlbnR9YCk7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKCh0YXJnZXQgYXMgUGFnZSAmIFJlY29yZDxzdHJpbmcsIFVua25vd25GdW5jdGlvbj4gfCB1bmRlZmluZWQpPy5bbWV0aG9kXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9ICh0YXJnZXQgYXMgUGFnZSAmIFJlY29yZDxzdHJpbmcsIFVua25vd25GdW5jdGlvbj4gfCB1bmRlZmluZWQpPy5bbWV0aG9kXShhcmcpO1xuICAgICAgICAgICAgaWYgKHJldHZhbCBpbnN0YW5jZW9mIE5hdGl2ZVByb21pc2UgJiYgKGFyZyBhcyBSb3V0ZSAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnYXN5bmNQcm9jZXNzJ10pIHtcbiAgICAgICAgICAgICAgICAoYXJnIGFzIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpLmFzeW5jUHJvY2Vzcy5yZWdpc3RlcihyZXR2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB3YWl0IGZyYW1lICovXG4gICAgcHJpdmF0ZSB3YWl0RnJhbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB3YWl0RnJhbWUoMSwgdGhpcy5fcmFmKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZW50cmFuY2VcblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHBhZ2UgbWFpbiBwcm9jZWR1cmUgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZVBhZ2UobmV4dFJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgcHJldlJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgICBwYXJzZVVybFBhcmFtcyhuZXh0Um91dGUpO1xuXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRSb3V0ZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgLy8gdHJhbnNpdGlvbiBjb3JlXG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gYXdhaXQgdGhpcy50cmFuc2l0aW9uUGFnZShwYWdlTmV4dCwgJGVsTmV4dCwgcGFnZVByZXYsICRlbFByZXYsIGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZUNvbnRleHQoJGVsTmV4dCwgJGVsUHJldiwgY2hhbmdlSW5mbywgdHJhbnNpdGlvbik7XG5cbiAgICAgICAgICAgIC8vIOmBt+enu+WFiOOBjCBzdWJmbG93IOmWi+Wni+eCueOBp+OBguOCi+WgtOWQiCwgc3ViZmxvdyDop6PpmaRcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUudXJsID09PSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKT8ucGFyYW1zLm9yaWdpbikge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHJlZmV0Y2ggY29udGVudCDjga7jgrHjgqJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJlYXRQcmVmZXRjaENvbnRlbnRzKCk7XG5cbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBwcmVwYXJlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogUHJvbWlzZTxbUGFnZSwgRE9NLCBQYWdlLCBET01dPiB7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IGNoYW5nZUluZm8udG8gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGNoYW5nZUluZm8uZnJvbSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogbmV4dFBhcmFtcyB9ID0gbmV4dFJvdXRlO1xuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcHJldlBhcmFtcyB9ID0gcHJldlJvdXRlID8/IHt9O1xuXG4gICAgICAgIC8vIHBhZ2UgaW5zdGFuY2VcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKG5leHRSb3V0ZSk7XG4gICAgICAgIC8vIHBhZ2UgJHRlbXBsYXRlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShuZXh0UGFyYW1zKTtcblxuICAgICAgICBjaGFuZ2VJbmZvLnNhbWVQYWdlSW5zdGFuY2UgPSBwcmV2UGFyYW1zPy5wYWdlICYmIHByZXZQYXJhbXMucGFnZSA9PT0gbmV4dFBhcmFtcy5wYWdlO1xuICAgICAgICBjb25zdCB7IHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuXG4gICAgICAgIC8vIHBhZ2UgJGVsXG4gICAgICAgIGlmICghbmV4dFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBpZiAoIXJlbG9hZCAmJiBzYW1lUGFnZUluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jbG9uZUNvbnRlbnQobmV4dFJvdXRlLCBuZXh0UGFyYW1zLCBwcmV2Um91dGUhLCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRlbE5leHQgPSAkKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2VOZXh0ID0gbmV4dFBhcmFtcy5wYWdlITtcblxuICAgICAgICAvLyBtb3VudFxuICAgICAgICBpZiAoISRlbE5leHQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubW91bnRDb250ZW50KCRlbE5leHQsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0XG4gICAgICAgICAgICAocmVsb2FkICYmIHt9IHx8IChwcmV2UGFyYW1zPy5wYWdlID8/IHt9KSksIChyZWxvYWQgJiYgJChudWxsKSB8fCAkKHByZXZSb3V0ZT8uZWwpKSwgLy8gcHJldlxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsb25lQ29udGVudChcbiAgICAgICAgbmV4dFJvdXRlOiBSb3V0ZUNvbnRleHQsIG5leHRQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgICAgIHByZXZSb3V0ZTogUm91dGVDb250ZXh0LFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBuZXh0Um91dGUuZWwgPSBwcmV2Um91dGUuZWw7XG4gICAgICAgIHByZXZSb3V0ZS5lbCA9IG5leHRSb3V0ZS5lbD8uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAkKHByZXZSb3V0ZS5lbCkucmVtb3ZlQXR0cignaWQnKS5pbnNlcnRCZWZvcmUobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgJChuZXh0Um91dGUuZWwpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSkucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWBdKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdjbG9uZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdjbG9uZWQnLCBuZXh0UGFyYW1zLnBhZ2UsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBsb2FkQ29udGVudChcbiAgICAgICAgcm91dGU6IFJvdXRlQ29udGV4dCwgcGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBsZXQgZmlyZUV2ZW50cyA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFyb3V0ZS5lbCkge1xuICAgICAgICAgICAgY29uc3QgZWxDYWNoZSA9IHRoaXMuX3JvdXRlc1tyb3V0ZS5wYXRoXVsnQHJvdXRlJ10/LmVsO1xuICAgICAgICAgICAgZmlyZUV2ZW50cyA9ICFlbENhY2hlO1xuICAgICAgICAgICAgaWYgKGVsQ2FjaGUpIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkb20tY2FjaGUgY2FzZVxuICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gZWxDYWNoZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFyYW1zLiR0ZW1wbGF0ZT8uaXNDb25uZWN0ZWQpIHsgLy8gcHJlZmV0Y2ggY2FzZVxuICAgICAgICAgICAgICAgIHJvdXRlLmVsICAgICAgICAgPSBwYXJhbXMuJHRlbXBsYXRlWzBdO1xuICAgICAgICAgICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBwYXJhbXMuJHRlbXBsYXRlLmNsb25lKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gcGFyYW1zLiR0ZW1wbGF0ZSEuY2xvbmUoKVswXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyb3V0ZSAhPT0gdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSkge1xuICAgICAgICAgICAgdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSA9IHJvdXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpcmVFdmVudHMpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbG9hZGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnaW5pdCcsIHBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgbW91bnRDb250ZW50KFxuICAgICAgICAkZWw6IERPTSwgcGFnZTogUGFnZSB8IHVuZGVmaW5lZCxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgJGVsLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG4gICAgICAgIHRoaXMuXyRlbC5hcHBlbmQoJGVsKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdtb3VudGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnbW91bnRlZCcsIHBhZ2UsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSB1bm1vdW50Q29udGVudChyb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCB7XG4gICAgICAgIGNvbnN0ICRlbCA9ICQocm91dGUuZWwpO1xuICAgICAgICBjb25zdCBwYWdlID0gcm91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICBpZiAoJGVsLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAkZWwuZGV0YWNoKCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubW91bnRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgcm91dGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyb3V0ZS5lbCkge1xuICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5sb2FkZWQnLCByb3V0ZSk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gY29yZVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJhbnNpdGlvblBhZ2UoXG4gICAgICAgIHBhZ2VOZXh0OiBQYWdlLCAkZWxOZXh0OiBET00sXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGNoYW5nZUluZm8udHJhbnNpdGlvbiA/PyB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdDtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICAnZW50ZXItZnJvbS1jbGFzcyc6IGN1c3RvbUVudGVyRnJvbUNsYXNzLFxuICAgICAgICAgICAgJ2VudGVyLWFjdGl2ZS1jbGFzcyc6IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItdG8tY2xhc3MnOiBjdXN0b21FbnRlclRvQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtZnJvbS1jbGFzcyc6IGN1c3RvbUxlYXZlRnJvbUNsYXNzLFxuICAgICAgICAgICAgJ2xlYXZlLWFjdGl2ZS1jbGFzcyc6IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtdG8tY2xhc3MnOiBjdXN0b21MZWF2ZVRvQ2xhc3MsXG4gICAgICAgIH0gPSB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgLy8gZW50ZXItY3NzLWNsYXNzXG4gICAgICAgIGNvbnN0IGVudGVyRnJvbUNsYXNzICAgPSBjdXN0b21FbnRlckZyb21DbGFzcyAgID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9GUk9NX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGVudGVyQWN0aXZlQ2xhc3MgPSBjdXN0b21FbnRlckFjdGl2ZUNsYXNzID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9BQ1RJVkVfQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJUb0NsYXNzICAgICA9IGN1c3RvbUVudGVyVG9DbGFzcyAgICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX1RPX0NMQVNTfWA7XG5cbiAgICAgICAgLy8gbGVhdmUtY3NzLWNsYXNzXG4gICAgICAgIGNvbnN0IGxlYXZlRnJvbUNsYXNzICAgPSBjdXN0b21MZWF2ZUZyb21DbGFzcyAgID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9GUk9NX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGxlYXZlQWN0aXZlQ2xhc3MgPSBjdXN0b21MZWF2ZUFjdGl2ZUNsYXNzID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9BQ1RJVkVfQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVUb0NsYXNzICAgICA9IGN1c3RvbUxlYXZlVG9DbGFzcyAgICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX1RPX0NMQVNTfWA7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5iZWdpblRyYW5zaXRpb24oXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsXG4gICAgICAgICAgICBjaGFuZ2VJbmZvLFxuICAgICAgICApO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgLy8gdHJhbnNpc2lvbiBleGVjdXRpb25cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uKCRlbE5leHQsIGVudGVyRnJvbUNsYXNzLCBlbnRlckFjdGl2ZUNsYXNzLCBlbnRlclRvQ2xhc3MpLFxuICAgICAgICAgICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uKCRlbFByZXYsIGxlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBsZWF2ZVRvQ2xhc3MpLFxuICAgICAgICBdKTtcblxuICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuZW5kVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LFxuICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBjaGFuZ2VJbmZvLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiB0cmFuc2l0aW9uO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogYmVnaW4gKi9cbiAgICBwcml2YXRlIGFzeW5jIGJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSwgZW50ZXJGcm9tQ2xhc3M6IHN0cmluZywgZW50ZXJBY3RpdmVDbGFzczogc3RyaW5nLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLCBsZWF2ZUZyb21DbGFzczogc3RyaW5nLCBsZWF2ZUFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRoaXMuXyRlbC5hZGRDbGFzcyhbXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YCxcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fRElSRUNUSU9OfS0ke2RlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24oY2hhbmdlSW5mbyl9YCxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgJGVsTmV4dFxuICAgICAgICAgICAgLmFkZENsYXNzKFtlbnRlckZyb21DbGFzcywgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWBdKVxuICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuJylcbiAgICAgICAgICAgIC5yZWZsb3coKVxuICAgICAgICAgICAgLmFkZENsYXNzKGVudGVyQWN0aXZlQ2xhc3MpXG4gICAgICAgIDtcbiAgICAgICAgJGVsUHJldi5hZGRDbGFzcyhbbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG5cbiAgICAgICAgdGhpcy5wdWJsaXNoKCdiZWZvcmUtdHJhbnNpdGlvbicsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2JlZm9yZS1sZWF2ZScsIHBhZ2VQcmV2LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtZW50ZXInLCBwYWdlTmV4dCwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBlbmQgKi9cbiAgICBwcml2YXRlIGFzeW5jIGVuZFRyYW5zaXRpb24oXG4gICAgICAgIHBhZ2VOZXh0OiBQYWdlLCAkZWxOZXh0OiBET00sXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSAmJiAkZWxQcmV2LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG4gICAgICAgICRlbE5leHQucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG4gICAgICAgICRlbFByZXYucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG5cbiAgICAgICAgdGhpcy5fJGVsLnJlbW92ZUNsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2FmdGVyLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZmluYWxpemVcblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlIHBhZ2Ugc3RhdHVzIGFmdGVyIHRyYW5zaXRpb24gKi9cbiAgICBwcml2YXRlIHVwZGF0ZUNoYW5nZUNvbnRleHQoXG4gICAgICAgICRlbE5leHQ6IERPTSxcbiAgICAgICAgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICB0cmFuc2l0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBkaXJlY3Rpb24sIHRvIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBmcm9tIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gdG8gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCB1cmxDaGFuZ2VkID0gIXJlbG9hZDtcblxuXG4gICAgICAgIGlmICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgY2xhc3NcbiAgICAgICAgICAgICRlbFByZXZcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YClcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApO1xuXG4gICAgICAgICAgICBpZiAodXJsQ2hhbmdlZCAmJiB0aGlzLl9wcmV2Um91dGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWw/LmNsYXNzTGlzdC5yZW1vdmUoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGUsIHRoaXMuX3ByZXZSb3V0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXJsQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlID0gcHJldlJvdXRlO1xuICAgICAgICAgICAgaWYgKHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAkZWxQcmV2LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xhc3RSb3V0ZSA9IHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgJ2ZvcndhcmQnID09PSBkaXJlY3Rpb24gJiYgdHJhbnNpdGlvbiAmJiAodGhpcy5fbGFzdFJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHByZWZldGNoICYgZG9tIGNhY2hlXG5cbiAgICAvKiogQGludGVybmFsIHVuc2V0IGRvbSBwcmVmZXRjaGVkIGNvbnRlbnRzICovXG4gICAgcHJpdmF0ZSBkZXN0cnVjdENhY2hlZENvbnRlbnRzKCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRoaXMuX3JvdXRlc1trZXldWydAcm91dGUnXTtcbiAgICAgICAgICAgIHJvdXRlICYmIHRoaXMudW5tb3VudENvbnRlbnQocm91dGUgYXMgUm91dGVDb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGhpcy5faGlzdG9yeS5zdGFjaykge1xuICAgICAgICAgICAgaWYgKHJvdXRlLmVsKSB7XG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGVzdHJ1Y3Rpb24gb2YgZG9tIGFjY29yZGluZyB0byBjb25kaXRpb24gKi9cbiAgICBwcml2YXRlIHRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGU6IFJvdXRlQ29udGV4dCwgcHJldlJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgaWYgKHByZXZSb3V0ZS5lbCAmJiBwcmV2Um91dGUuZWwgIT09IHRoaXMuY3VycmVudFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKHByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICBjb25zdCBjYWNoZUx2ID0gJGVsLmRhdGEoRG9tQ2FjaGUuREFUQV9OQU1FKTtcbiAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9DT05ORUNUICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHByZXZSb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcmVFdmVudHMgPSBwcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlICE9PSBuZXh0Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfTUVNT1JZICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZSb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgZG9tIHByZWZldGNoZWQgY29udGVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIHNldFByZWZldGNoQ29udGVudHMocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdG9Sb3V0ZSA9IChwYXJhbTogUm91dGVDb250ZXh0UGFyYW1ldGVycywgZWw6IEhUTUxFbGVtZW50KTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRvUm91dGVDb250ZXh0KHBhcmFtLnByZWZldGNoISwgdGhpcywgcGFyYW0pO1xuICAgICAgICAgICAgY3R4LmVsID0gZWw7XG4gICAgICAgICAgICByZXR1cm4gY3R4O1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvUm91dGVDaGFuZ2VJbmZvID0gKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgICAgIHRvOiByb3V0ZSxcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb246ICdub25lJyxcbiAgICAgICAgICAgICAgICBhc3luY1Byb2Nlc3M6IG5ldyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCgpLFxuICAgICAgICAgICAgICAgIHJlbG9hZDogZmFsc2UsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zKSB7XG4gICAgICAgICAgICBjb25zdCBlbFJvdXRlID0gcGFyYW1bJ0Byb3V0ZSddPy5lbDtcbiAgICAgICAgICAgIGlmICghZWxSb3V0ZSB8fCAodGhpcy5jdXJyZW50Um91dGUuZWwgIT09IGVsUm91dGUgJiYgdGhpcy5fbGFzdFJvdXRlPy5lbCAhPT0gZWxSb3V0ZSAmJiB0aGlzLl9wcmV2Um91dGU/LmVsICE9PSBlbFJvdXRlKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShwYXJhbSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSBwYXJhbS4kdGVtcGxhdGUhWzBdO1xuICAgICAgICAgICAgICAgIGlmICghZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlKHBhcmFtLCBlbCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZShyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0b1JvdXRlQ2hhbmdlSW5mbyhyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICAgICAgICAgICAgICAvLyBsb2FkICYgaW5pdFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KHJvdXRlLCBwYXJhbSwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW91bnRcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5tb3VudENvbnRlbnQoJChlbCksIHBhcmFtLnBhZ2UsIGNoYW5nZUluZm8sIGFzeW5jUHJvY2Vzcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBsb2FkIHByZWZldGNoIGRvbSBjb250ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJlYXRQcmVmZXRjaENvbnRlbnRzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAvLyDpgbfnp7vlhYjjgYvjgokgcHJlZmV0Y2ggY29udGVudCDjgpLmpJzlh7pcbiAgICAgICAgY29uc3QgcHJlZmV0Y2hQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5jdXJyZW50Um91dGUuZWw/LnF1ZXJ5U2VsZWN0b3JBbGwoYFtkYXRhLSR7TGlua0RhdGEuUFJFRkVUQ0h9XWApID8/IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRhcmdldHMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgaWYgKGZhbHNlICE9PSAkZWwuZGF0YShMaW5rRGF0YS5QUkVGRVRDSCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSAkZWwuYXR0cignaHJlZicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwhKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5wcmVmZXRjaCA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgcHJlZmV0Y2hQYXJhbXMucHVzaChwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNldFByZWZldGNoQ29udGVudHMocHJlZmV0Y2hQYXJhbXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYGNoYW5naW5nYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlDaGFuZ2luZyhuZXh0U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBjYW5jZWw6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9pbkNoYW5naW5nUGFnZSkge1xuICAgICAgICAgICAgY2FuY2VsKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9CVVNZKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRoaXMubWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXh0U3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1jaGFuZ2UnLCBjaGFuZ2VJbmZvLCBjYW5jZWwpO1xuICAgICAgICBwcm9taXNlcy5wdXNoKC4uLmNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLnByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgcmVmcmVzaGAgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5UmVmcmVzaChuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+KTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgdXJsICA9IGAvJHtzdGF0ZVsnQGlkJ119YDtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCwgYFJvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4gW3VybDogJHt1cmx9XWAsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsID09IHN0YXRlWydAcGFyYW1zJ10pIHtcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXIg44KSIGFzc2lnblxuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc3RhdGUsIHRvUm91dGVDb250ZXh0KHVybCwgdGhpcywgcGFyYW1zKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmVsKSB7XG4gICAgICAgICAgICAgICAgLy8gaWQg44Gr57SQ44Gl44GP6KaB57Sg44GM44GZ44Gn44Gr5a2Y5Zyo44GZ44KL5aC05ZCI44Gv5Ymy44KK5b2T44GmXG4gICAgICAgICAgICAgICAgc3RhdGUuZWwgPSB0aGlzLl9oaXN0b3J5LmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUgYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHNjaGVkdWxpbmcgYHJlZnJlc2hgIGRvbmUuXG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuY2hhbmdlUGFnZShlbnN1cmUobmV3U3RhdGUpLCBvbGRTdGF0ZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGVycm9yIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGFuZGxlRXJyb3IoZXJyb3I6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKFxuICAgICAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgICAgIGlzUmVzdWx0KGVycm9yKSA/IGVycm9yIDogbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgJ1JvdXRlIG5hdmlnYXRlIGZhaWxlZC4nLCBlcnJvcilcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhbmNob3IgY2xpY2sgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25BbmNob3JDbGlja2VkKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCBhcyBFbGVtZW50KS5jbG9zZXN0KCdbaHJlZl0nKTtcbiAgICAgICAgaWYgKCR0YXJnZXQuZGF0YShMaW5rRGF0YS5QUkVWRU5UX1JPVVRFUikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgY29uc3QgdXJsICAgICAgICA9ICR0YXJnZXQuYXR0cignaHJlZicpO1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gJHRhcmdldC5kYXRhKExpbmtEYXRhLlRSQU5TSVRJT04pIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbWV0aG9kICAgICA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5OQVZJQUdBVEVfTUVUSE9EKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZE9wdHMgPSAoJ3B1c2gnID09PSBtZXRob2QgfHwgJ3JlcGxhY2UnID09PSBtZXRob2QgPyB7IG1ldGhvZCB9IDoge30pIGFzIE5hdmlnYXRpb25TZXR0aW5ncztcblxuICAgICAgICBpZiAoJyMnID09PSB1cmwpIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5iYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMubmF2aWdhdGUodXJsISwgeyB0cmFuc2l0aW9uLCAuLi5tZXRob2RPcHRzIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZXhlY3V0b3IoKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUge0BsaW5rIFJvdXRlcn0gb2JqZWN0LlxuICogQGphIHtAbGluayBSb3V0ZXJ9IOOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBBbiBvYmplY3Qgb3IgdGhlIHNlbGVjdG9yIHN0cmluZyB3aGljaCBiZWNvbWVzIG9yaWdpbiBvZiB7QGxpbmsgRE9NfS5cbiAqICAtIGBqYWAge0BsaW5rIERPTX0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K544G+44Gf44Gv44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc30gb2JqZWN0XG4gKiAgLSBgamFgIHtAbGluayBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvdXRlcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zPzogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyk6IFJvdXRlciB7XG4gICAgcmV0dXJuIG5ldyBSb3V0ZXJDb250ZXh0KHNlbGVjdG9yLCBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgc3RhcnQ6IHRydWUsXG4gICAgfSwgb3B0aW9ucykpO1xufVxuIl0sIm5hbWVzIjpbIiRzaWduYXR1cmUiLCIkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7O0FBR0c7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFPQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQVBELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsb0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxvQkFBNkMsQ0FBQTtRQUM3QyxXQUE0QyxDQUFBLFdBQUEsQ0FBQSxvQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsZ0NBQXlCLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBLEdBQUEsb0NBQUEsQ0FBQTtRQUM3SSxXQUE0QyxDQUFBLFdBQUEsQ0FBQSwyQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsZ0NBQXlCLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBLEdBQUEsMkNBQUEsQ0FBQTtRQUM3SSxXQUE0QyxDQUFBLFdBQUEsQ0FBQSxrQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixH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VSxHQUFHLE9BQU8sQ0FBQyxJQUFJLHdDQUErQixDQUFDO0FBQy9ELFFBQUEsTUFBTSxNQUFNLEdBQU8sT0FBTyxDQUFDLElBQUksbURBQXFDLENBQUM7UUFDckUsTUFBTSxVQUFVLElBQUksTUFBTSxLQUFLLE1BQU0sSUFBSSxTQUFTLEtBQUssTUFBTSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUF1QixDQUFDO1FBRXZHLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRTtBQUNiLFlBQUEsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDcEIsU0FBQTtBQUFNLGFBQUE7QUFDSCxZQUFBLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQzNELFNBQUE7S0FDSjs7SUFHTyxNQUFNLDBCQUEwQixDQUFDLFFBQWdDLEVBQUE7UUFDckUsSUFBSTtZQUNBLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFLLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNsRCxPQUFPLE1BQU0sUUFBUSxFQUFFLENBQUM7QUFDM0IsU0FBQTtBQUFTLGdCQUFBO1lBQ04sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3BELFNBQUE7S0FDSjtBQUNKLENBQUE7QUFFRDtBQUVBOzs7Ozs7Ozs7O0FBVUc7QUFDYSxTQUFBLFlBQVksQ0FBQyxRQUEyQyxFQUFFLE9BQW1DLEVBQUE7SUFDekcsT0FBTyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUM3QyxRQUFBLEtBQUssRUFBRSxJQUFJO0tBQ2QsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2pCOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9yb3V0ZXIvIn0=