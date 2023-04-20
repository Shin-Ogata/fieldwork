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
        void this.replace(null != id ? id : this.toId(this._window.location.href), state, { silent: true });
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
        const { silent } = options || {};
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
    replace(id, state, options) {
        return this.updateState('replace', id, state, options || {});
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
                return (st && st['@origin']);
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
        const newId = additional?.newId || this.toId(location.href);
        const method = additional?.postproc || 'seek';
        const df = additional?.df || this._dfGo || new Deferred();
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
 *  - `en` [[SessionHistoryCreateOptions]] object
 *  - `ja` [[SessionHistoryCreateOptions]] オブジェクト
 */
function createSessionHistory(id, state, options) {
    const { context, mode } = Object.assign({ mode: 'hash' }, options);
    return new SessionHistory(context || window, mode, id, state);
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
        const { silent } = options || {};
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
            const newState = this._stack.distance(delta || 0);
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
    replace(id, state, options) {
        return this.updateState('replace', id, state, options || {});
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
        ? 'memory' === seed ? createMemoryHistory(initialPath || '') : createSessionHistory(initialPath, undefined, { mode: seed, context })
        : seed);
};
/** @internal */
const buildNavigateUrl = (path, options) => {
    try {
        path = `/${normalizeId(path)}`;
        const { query, params } = options;
        let url = path2regexp.compile(path)(params || {});
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
        for (const param of params) { // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
    else {
        const $el = dom(content);
        params.$template = ensureInstance($el[0]);
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

/* eslint-disable
    @typescript-eslint/no-non-null-assertion
 */
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
        this._raf = context?.requestAnimationFrame || window.requestAnimationFrame;
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
        this._cssPrefix = cssPrefix || "cdp" /* CssName.DEFAULT_PREFIX */;
        this._transitionSettings = Object.assign({ default: 'none', reload: 'none' }, transition);
        this._navigationSettings = Object.assign({ method: 'push' }, navigation);
        this.register(routes, start);
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
    register(routes, refresh = false) {
        for (const context of toRouteContextParameters(routes)) {
            this._routes[context.path] = context;
        }
        refresh && void this.go();
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
            const method = opts.method || this._navigationSettings.method;
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
            this.register(routes, false);
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
            const { transition, reverse } = options || {};
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
                for (const route of this._history.stack) {
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
    // private methods: transition
    /** @internal common `RouterEventArg` maker */
    makeRouteChangeInfo(newState, oldState) {
        const intent = newState.intent;
        delete newState.intent; // navigate 時に指定された intent は one time のみ有効にする
        const from = (oldState || this._lastRoute);
        const direction = this._history.direct(newState['@id'], from?.['@id']).direction;
        const asyncProcess = new RouteAyncProcessContext();
        const reload = newState.url === from?.url;
        const { transition, reverse } = this._tempTransitionParams || (reload
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
            this.publish('changed', changeInfo);
        }
        finally {
            this._inChangingPage = false;
        }
    }
    /** @internal */
    async prepareChangeContext(changeInfo) {
        const nextRoute = changeInfo.to;
        const prevRoute = changeInfo.from;
        const { '@params': nextParams } = nextRoute;
        const { '@params': prevParams } = prevRoute || {};
        // page instance
        await ensureRouterPageInstance(nextRoute);
        // page $template
        await ensureRouterPageTemplate(nextParams);
        changeInfo.samePageInstance = prevParams?.page && prevParams.page === nextParams.page;
        const { reload, samePageInstance, asyncProcess } = changeInfo;
        // page $el
        if (!nextRoute.el) {
            if (!reload && samePageInstance) {
                nextRoute.el = prevRoute.el;
                prevRoute.el = nextRoute.el?.cloneNode(true);
                dom(prevRoute.el).insertBefore(nextRoute.el);
                dom(nextRoute.el).attr('aria-hidden', true).removeClass([`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`, `${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`]);
                this.publish('cloned', changeInfo);
                this.triggerPageCallback('cloned', nextParams.page, changeInfo);
                await asyncProcess.complete();
            }
            else {
                if (nextParams.$template?.isConnected) {
                    nextRoute.el = nextParams.$template[0];
                    nextParams.$template = nextParams.$template.clone();
                }
                else {
                    nextRoute.el = nextParams.$template.clone()[0];
                }
                this.publish('loaded', changeInfo);
                await asyncProcess.complete();
                this.triggerPageCallback('init', nextParams.page, changeInfo);
                await asyncProcess.complete();
            }
        }
        const $elNext = dom(nextRoute.el);
        const pageNext = nextParams.page;
        // mount
        if (!$elNext.isConnected) {
            $elNext.attr('aria-hidden', true);
            this._$el.append($elNext);
            this.publish('mounted', changeInfo);
            this.triggerPageCallback('mounted', pageNext, changeInfo);
            await asyncProcess.complete();
        }
        return [
            pageNext, $elNext,
            (reload && {} || prevParams?.page || {}), (reload && dom(null) || dom(prevRoute?.el)), // prev
        ];
    }
    /** @internal */
    async transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo) {
        const transition = changeInfo.transition || this._transitionSettings.default;
        const { 'enter-from-class': customEnterFromClass, 'enter-active-class': customEnterActiveClass, 'enter-to-class': customEnterToClass, 'leave-from-class': customLeaveFromClass, 'leave-active-class': customLeaveActiveClass, 'leave-to-class': customLeaveToClass, } = this._transitionSettings;
        // enter-css-class
        const enterFromClass = customEnterFromClass || `${transition}-${"enter-from" /* CssName.ENTER_FROM_CLASS */}`;
        const enterActiveClass = customEnterActiveClass || `${transition}-${"enter-active" /* CssName.ENTER_ACTIVE_CLASS */}`;
        const enterToClass = customEnterToClass || `${transition}-${"enter-to" /* CssName.ENTER_TO_CLASS */}`;
        // leave-css-class
        const leaveFromClass = customLeaveFromClass || `${transition}-${"leave-from" /* CssName.LEAVE_FROM_CLASS */}`;
        const leaveActiveClass = customLeaveActiveClass || `${transition}-${"leave-active" /* CssName.LEAVE_ACTIVE_CLASS */}`;
        const leaveToClass = customLeaveToClass || `${transition}-${"leave-to" /* CssName.LEAVE_TO_CLASS */}`;
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
                const $el = dom(this._prevRoute.el);
                $el.removeClass(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
                if (this._prevRoute.el && this._prevRoute.el !== this.currentRoute.el) {
                    const cacheLv = $el.data("dom-cache" /* DomCache.DATA_NAME */);
                    if ("connect" /* DomCache.CACHE_LEVEL_CONNECT */ !== cacheLv) {
                        const page = this._prevRoute['@params'].page;
                        $el.detach();
                        const fireEvents = this._prevRoute['@params'].page !== nextRoute['@params'].page;
                        if (fireEvents) {
                            this.publish('unmounted', this._prevRoute);
                            this.triggerPageCallback('unmounted', page, this._prevRoute);
                        }
                        if ("memory" /* DomCache.CACHE_LEVEL_MEMORY */ !== cacheLv) {
                            this._prevRoute.el = null;
                            if (fireEvents) {
                                this.publish('unloaded', this._prevRoute);
                                this.triggerPageCallback('removed', page, this._prevRoute);
                            }
                        }
                    }
                }
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
 * @en Create [[Router]] object.
 * @ja [[Router]] オブジェクトを構築
 *
 * @param selector
 *  - `en` An object or the selector string which becomes origin of [[DOM]].
 *  - `ja` [[DOM]] のもとになるインスタンスまたはセレクタ文字列
 * @param options
 *  - `en` [[RouterConstructionOptions]] object
 *  - `ja` [[RouterConstructionOptions]] オブジェクト
 */
function createRouter(selector, options) {
    return new RouterContext(selector, Object.assign({
        start: true,
    }, options));
}

export { createMemoryHistory, createRouter, createSessionHistory, disposeMemoryHistory, disposeSessionHistory, resetMemoryHistory, resetSessionHistory };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImhpc3RvcnkvaW50ZXJuYWwudHMiLCJoaXN0b3J5L3Nlc3Npb24udHMiLCJoaXN0b3J5L21lbW9yeS50cyIsInJvdXRlci9pbnRlcm5hbC50cyIsInJvdXRlci9hc3luYy1wcm9jZXNzLnRzIiwicm91dGVyL2NvcmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBST1VURVIgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19ST1VURVJfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAxLCAncm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDIsICdSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVEICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMywgJ1JvdXRlIG5hdmlnYXRlIGZhaWxlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9JTlZBTElEX1NVQkZMT1dfQkFTRV9VUkwgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyA0LCAnSW52YWxpZCBzdWItZmxvdyBiYXNlIHVybC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9CVVNZICAgICAgICAgICAgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyA1LCAnSW4gY2hhbmdpbmcgcGFnZSBwcm9jZXNzIG5vdy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuIiwiaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBhdCxcbiAgICBzb3J0LFxuICAgIG5vb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBEZWZlcnJlZCB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBIaXN0b3J5U3RhdGUsIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBub3JtYWx6aWUgaWQgc3RyaW5nICovXG5leHBvcnQgY29uc3Qgbm9ybWFsaXplSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIC8vIHJlbW92ZSBoZWFkIG9mIFwiI1wiLCBcIi9cIiwgXCIjL1wiIGFuZCB0YWlsIG9mIFwiL1wiXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9eKCNcXC8pfF5bIy9dfFxccyskLywgJycpLnJlcGxhY2UoL15cXHMrJHwoXFwvJCkvLCAnJyk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSBzdGFjayAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZURhdGEgPSA8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBIaXN0b3J5U3RhdGU8VD4gPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHsgJ0BpZCc6IG5vcm1hbGl6ZUlkKGlkKSB9LCBzdGF0ZSk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSB1bmNhbmNlbGxhYmxlIGRlZmVycmVkICovXG5leHBvcnQgY29uc3QgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkID0gKHdhcm46IHN0cmluZyk6IERlZmVycmVkID0+IHtcbiAgICBjb25zdCB1bmNhbmNlbGxhYmxlID0gbmV3IERlZmVycmVkKCkgYXMgV3JpdGFibGU8RGVmZXJyZWQ+O1xuICAgIHVuY2FuY2VsbGFibGUucmVqZWN0ID0gKCkgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4od2Fybik7XG4gICAgICAgIHVuY2FuY2VsbGFibGUucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIHVuY2FuY2VsbGFibGU7XG59O1xuXG4vKiogQGludGVybmFsIGFzc2lnbiBzdGF0ZSBlbGVtZW50IGlmIGFscmVhZHkgZXhpc3RzICovXG5leHBvcnQgY29uc3QgYXNzaWduU3RhdGVFbGVtZW50ID0gKHN0YXRlOiBIaXN0b3J5U3RhdGUsIHN0YWNrOiBIaXN0b3J5U3RhY2spOiB2b2lkID0+IHtcbiAgICBjb25zdCBlbCA9IHN0YWNrLmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgKCFzdGF0ZS5lbCAmJiBlbCkgJiYgKHN0YXRlLmVsID0gZWwpO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsIHN0YWNrIG1hbmFnZW1lbnQgY29tbW9uIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhY2s8VCA9IFBsYWluT2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RhbmNlKDApO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlWydAaWQnXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBNYXRoLnRydW5jKGlkeCk7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgYXJyYXkoKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc2xpY2UoKTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgZmlyc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzRmlyc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAwID09PSB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgbGFzdCBvciBub3QgKi9cbiAgICBnZXQgaXNMYXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXggPT09IHRoaXMuX3N0YWNrLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX3N0YWNrLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIGNsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHVibGljIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5zbGljZSgwLCB0aGlzLl9pbmRleCArIDEpO1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELiAqL1xuICAgIHB1YmxpYyBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgICAgICAgY29uc3QgeyBfaW5kZXg6IGJhc2UgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLl9zdGFja1xuICAgICAgICAgICAgLm1hcCgocywgaW5kZXgpID0+IHsgcmV0dXJuIHsgaW5kZXgsIGRpc3RhbmNlOiBNYXRoLmFicyhiYXNlIC0gaW5kZXgpLCAuLi5zIH07IH0pXG4gICAgICAgICAgICAuZmlsdGVyKHMgPT4gc1snQGlkJ10gPT09IGlkKVxuICAgICAgICA7XG4gICAgICAgIHNvcnQoY2FuZGlkYXRlcywgKGwsIHIpID0+IChsLmRpc3RhbmNlID4gci5kaXN0YW5jZSA/IDEgOiAtMSksIHRydWUpO1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXT8uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgdG8gSUQgYW5kIGZyb20gSUQuICovXG4gICAgcHVibGljIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgY29uc3QgdG9JbmRleCAgID0gdGhpcy5jbG9zZXN0KHRvSWQpO1xuICAgICAgICBjb25zdCBmcm9tSW5kZXggPSBudWxsID09IGZyb21JZCA/IHRoaXMuX2luZGV4IDogdGhpcy5jbG9zZXN0KGZyb21JZCk7XG4gICAgICAgIGlmIChudWxsID09IGZyb21JbmRleCB8fCBudWxsID09IHRvSW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbjogJ21pc3NpbmcnIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRvSW5kZXggLSBmcm9tSW5kZXg7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSAwID09PSBkZWx0YVxuICAgICAgICAgICAgICAgID8gJ25vbmUnXG4gICAgICAgICAgICAgICAgOiBkZWx0YSA8IDAgPyAnYmFjaycgOiAnZm9yd2FyZCc7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb24sIGRlbHRhLCBpbmRleDogdG9JbmRleCwgc3RhdGU6IHRoaXMuX3N0YWNrW3RvSW5kZXhdIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IGFjdGl2ZSBkYXRhIGZyb20gY3VycmVudCBpbmRleCBvcmlnaW4gKi9cbiAgICBwdWJsaWMgZGlzdGFuY2UoZGVsdGE6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHt0aGlzLmxlbmd0aH0sIGdpdmVuOiAke3Bvc31dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXQocG9zKTtcbiAgICB9XG5cbiAgICAvKiogbm9vcCBzdGFjayAqL1xuICAgIHB1YmxpYyBub29wU3RhY2sgPSBub29wOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tZW1iZXItYWNjZXNzaWJpbGl0eVxuXG4gICAgLyoqIHB1c2ggc3RhY2sgKi9cbiAgICBwdWJsaWMgcHVzaFN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1srK3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHJlcGxhY2Ugc3RhY2sgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiBzZWVrIHN0YWNrICovXG4gICAgcHVibGljIHNlZWtTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNsb3Nlc3QoZGF0YVsnQGlkJ10pO1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhY2soZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGRpc3Bvc2Ugb2JqZWN0ICovXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTmFOO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgQWNjZXNzaWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc09iamVjdCxcbiAgICBub29wLFxuICAgICRjZHAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTaWxlbmNlYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgdG9VcmwsIHdlYlJvb3QgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB3aW5kb3cgfSBmcm9tICcuLi9zc3InO1xuaW1wb3J0IHR5cGUge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeVN0YWNrLFxuICAgIG5vcm1hbGl6ZUlkLFxuICAgIGNyZWF0ZURhdGEsXG4gICAgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkLFxuICAgIGFzc2lnblN0YXRlRWxlbWVudCxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgZGlzcGF0Y2ggYWRkaXRpb25hbCBpbmZvcm1hdGlvbiAqL1xuaW50ZXJmYWNlIERpc3BhdGNoSW5mbzxUPiB7XG4gICAgZGY6IERlZmVycmVkO1xuICAgIG5ld0lkOiBzdHJpbmc7XG4gICAgb2xkSWQ6IHN0cmluZztcbiAgICBwb3N0cHJvYzogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnO1xuICAgIG5leHRTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbiAgICBwcmV2U3RhdGU/OiBIaXN0b3J5U3RhdGU8VD47XG59XG5cbi8qKiBAaW50ZXJuYWwgY29uc3RhbnQgKi9cbmNvbnN0IGVudW0gQ29uc3Qge1xuICAgIEhBU0hfUFJFRklYID0gJyMvJyxcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgcmVtb3ZlIHVybCBwYXRoIHNlY3Rpb24gKi9cbmNvbnN0IHRvSGFzaCA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgaWQgPSAvIy4qJC8uZXhlYyh1cmwpPy5bMF07XG4gICAgcmV0dXJuIGlkID8gbm9ybWFsaXplSWQoaWQpIDogJyc7XG59O1xuXG4vKiogQGludGVybmFsIHJlbW92ZSB1cmwgcGF0aCBzZWN0aW9uICovXG5jb25zdCB0b1BhdGggPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IGlkID0gdXJsLnN1YnN0cmluZyh3ZWJSb290Lmxlbmd0aCk7XG4gICAgcmV0dXJuIGlkID8gbm9ybWFsaXplSWQoaWQpIDogdXJsO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc2V0RGlzcGF0Y2hJbmZvID0gPFQ+KHN0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICAoc3RhdGVbJGNkcF0gYXMgRGlzcGF0Y2hJbmZvPFQ+KSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4pOiBbVCwgRGlzcGF0Y2hJbmZvPFQ+P10gPT4ge1xuICAgIGlmIChpc09iamVjdChzdGF0ZSkgJiYgc3RhdGVbJGNkcF0pIHtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbCA9IHN0YXRlWyRjZHBdO1xuICAgICAgICBkZWxldGUgc3RhdGVbJGNkcF07XG4gICAgICAgIHJldHVybiBbc3RhdGUsIGFkZGl0aW9uYWwgYXMgRGlzcGF0Y2hJbmZvPFQ+XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW3N0YXRlXTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnU2Vzc2lvbkhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCcm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9tb2RlOiAnaGFzaCcgfCAnaGlzdG9yeSc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9wU3RhdGVIYW5kbGVyOiAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHZvaWQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG4gICAgcHJpdmF0ZSBfZGZHbz86IERlZmVycmVkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3aW5kb3dDb250eHQ6IFdpbmRvdywgbW9kZTogJ2hhc2gnIHwgJ2hpc3RvcnknLCBpZD86IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW5kb3dDb250eHQ7XG4gICAgICAgIHRoaXMuX21vZGUgPSBtb2RlO1xuXG4gICAgICAgIHRoaXMuX3BvcFN0YXRlSGFuZGxlciA9IHRoaXMub25Qb3BTdGF0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UobnVsbCAhPSBpZCA/IGlkIDogdGhpcy50b0lkKHRoaXMuX3dpbmRvdy5sb2NhdGlvbi5ocmVmKSwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IHByZXZTdGF0ZSA9IHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ1Nlc3Npb25IaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRoaXMudG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0aGlzLnRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogJ25vb3AnLFxuICAgICAgICAgICAgICAgIHByZXZTdGF0ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyh0aGlzLnN0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICAvLyBpZiBhbHJlYWR5IGNhbGxlZCwgbm8gcmVhY3Rpb24uXG4gICAgICAgIGlmICh0aGlzLl9kZkdvKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICBpZiAoIWRlbHRhKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCB0aGlzLnN0YXRlLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2RmR28gPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhKTtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2RmR287XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeSBieSBzdGFjayBJRC4gKi9cbiAgICB0cmF2ZXJzZVRvKGlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IGRpcmVjdGlvbiwgZGVsdGEgfSA9IHRoaXMuZGlyZWN0KGlkKTtcbiAgICAgICAgaWYgKCdtaXNzaW5nJyA9PT0gZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYHRyYXZlcnNlVG8oJHtpZH0pLCByZXR1cm5lZCBtaXNzaW5nLmApO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nbyhkZWx0YSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsZWFyRm9yd2FyZEhpc3RvcnkoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBkZXN0aW5hdGlvbiBzdGFjayBpbmZvcm1hdGlvbiBieSBgc3RhcnRgIGFuZCBgZW5kYCBJRC5cbiAgICAgKiBAamEg6LW354K5LCDntYLngrnjga4gSUQg44KS5oyH5a6a44GX44Gm44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KHRvSWQsIGZyb21JZCBhcyBzdHJpbmcpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgc2V0IGluZGV4ICovXG4gICAgcHJpdmF0ZSBzZXRJbmRleChpZHg6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5pbmRleCA9IGlkeDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbnZlcnQgdG8gSUQgKi9cbiAgICBwcml2YXRlIHRvSWQoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ2hhc2gnID09PSB0aGlzLl9tb2RlID8gdG9IYXNoKHNyYykgOiB0b1BhdGgoc3JjKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbnZlcnQgdG8gVVJMICovXG4gICAgcHJpdmF0ZSB0b1VybChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICgnaGFzaCcgPT09IHRoaXMuX21vZGUpID8gYCR7Q29uc3QuSEFTSF9QUkVGSVh9JHtpZH1gIDogdG9VcmwoaWQpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBldmVudCAmIHdhaXQgcHJvY2VzcyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJpZ2dlckV2ZW50QW5kV2FpdChcbiAgICAgICAgZXZlbnQ6ICdyZWZyZXNoJyB8ICdjaGFuZ2luZycsXG4gICAgICAgIGFyZzE6IEhpc3RvcnlTdGF0ZTxUPixcbiAgICAgICAgYXJnMjogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkIHwgKChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICB0aGlzLnB1Ymxpc2goZXZlbnQsIGFyZzEsIGFyZzIgYXMgYW55LCBwcm9taXNlcyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiwgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSBjcmVhdGVEYXRhKGlkLCBzdGF0ZSk7XG4gICAgICAgIGlkID0gZGF0YVsnQGlkJ107XG4gICAgICAgIGlmICgncmVwbGFjZScgPT09IG1ldGhvZCAmJiAwID09PSB0aGlzLmluZGV4KSB7XG4gICAgICAgICAgICBkYXRhWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcbiAgICAgICAgaGlzdG9yeVtgJHttZXRob2R9U3RhdGVgXShkYXRhLCAnJywgdGhpcy50b1VybChpZCkpO1xuICAgICAgICBjb25zdCBuZXdVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIGFzc2lnblN0YXRlRWxlbWVudChkYXRhLCB0aGlzLl9zdGFjayBhcyBIaXN0b3J5U3RhY2spO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4gPSB7XG4gICAgICAgICAgICAgICAgZGY6IG5ldyBEZWZlcnJlZChjYW5jZWwpLFxuICAgICAgICAgICAgICAgIG5ld0lkOiB0aGlzLnRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdGhpcy50b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6IG1ldGhvZCxcbiAgICAgICAgICAgICAgICBuZXh0U3RhdGU6IGRhdGEsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8oZGF0YSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGlzcGF0Y2ggYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRpc3BhdGNoQ2hhbmdlSW5mbyhuZXdTdGF0ZTogQWNjZXNzaWJsZTxUPiwgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gc2V0RGlzcGF0Y2hJbmZvKG5ld1N0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFBvcFN0YXRlRXZlbnQoJ3BvcHN0YXRlJywgeyBzdGF0ZSB9KSk7XG4gICAgICAgIGF3YWl0IGFkZGl0aW9uYWwuZGY7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgcG9wc3RhdGUgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KSA9PiBQcm9taXNlPHZvaWQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICAgICAgY29uc3Qgd2FpdFBvcFN0YXRlID0gKCk6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgKGV2OiBQb3BTdGF0ZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGV2LnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgZXhlY3V0b3Iod2FpdFBvcFN0YXRlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHJvbGxiYWNrIGhpc3RvcnkgKi9cbiAgICBwcml2YXRlIGFzeW5jIHJvbGxiYWNrSGlzdG9yeShtZXRob2Q6IHN0cmluZywgbmV3SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxuICAgICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsICcnLCB0aGlzLnRvVXJsKHRoaXMuaWQpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3B1c2gnOlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgaGlzdG9yeS5nbygtMSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0aGlzLmluZGV4IC0gKHRoaXMuY2xvc2VzdChuZXdJZCkgYXMgbnVtYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgIT09IGRlbHRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGEgJiYgaGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNsZWFyIGZvcndhcmQgc2Vzc2lvbiBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyRm9yd2FyZEhpc3RvcnkoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzT3JpZ2luID0gKHN0OiBBY2Nlc3NpYmxlPHVua25vd24+KTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChzdCAmJiBzdFsnQG9yaWdpbiddKSBhcyBib29sZWFuO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBoaXN0b3J5LnN0YXRlO1xuXG4gICAgICAgICAgICAvLyBiYWNrIHRvIHNlc3Npb24gb3JpZ2luXG4gICAgICAgICAgICB3aGlsZSAoIWlzT3JpZ2luKHN0YXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3JjOiBBY2Nlc3NpYmxlPHVua25vd24+KTogdW5rbm93biA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3R4ID0geyAuLi5zcmMgfTtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3R4Wydyb3V0ZXInXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgY3R4WydAcGFyYW1zJ107XG4gICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBmb3J3YXJkIGZyb20gaW5kZXggMSB0byBjdXJyZW50IHZhbHVlXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMSwgbiA9IHRoaXMuX3N0YWNrLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0ID0gdGhpcy5fc3RhY2suYXQoaSk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoZW5zdXJlKHN0KSwgJycsIHRoaXMudG9Vcmwoc3RbJ0BpZCddKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWNlaXZlIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBvblBvcFN0YXRlKGV2OiBQb3BTdGF0ZUV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgW25ld1N0YXRlLCBhZGRpdGlvbmFsXSA9IHBhcnNlRGlzcGF0Y2hJbmZvKGV2LnN0YXRlKTtcbiAgICAgICAgY29uc3QgbmV3SWQgICA9IGFkZGl0aW9uYWw/Lm5ld0lkIHx8IHRoaXMudG9JZChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgY29uc3QgbWV0aG9kICA9IGFkZGl0aW9uYWw/LnBvc3Rwcm9jIHx8ICdzZWVrJztcbiAgICAgICAgY29uc3QgZGYgICAgICA9IGFkZGl0aW9uYWw/LmRmIHx8IHRoaXMuX2RmR28gfHwgbmV3IERlZmVycmVkKCk7XG4gICAgICAgIGNvbnN0IG9sZERhdGEgPSBhZGRpdGlvbmFsPy5wcmV2U3RhdGUgfHwgdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IGFkZGl0aW9uYWw/Lm5leHRTdGF0ZSB8fCB0aGlzLmRpcmVjdChuZXdJZCkuc3RhdGUgfHwgY3JlYXRlRGF0YShuZXdJZCwgbmV3U3RhdGUpO1xuICAgICAgICBjb25zdCB7IGNhbmNlbCwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICBkZi5jYXRjaChub29wKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld0RhdGEsIGNhbmNlbCk7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0b2tlbi5yZWFzb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld0RhdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3RGF0YSwgb2xkRGF0YSk7XG5cbiAgICAgICAgICAgIGRmLnJlc29sdmUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gaGlzdG9yeSDjgpLlhYPjgavmiLvjgZlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbGJhY2tIaXN0b3J5KG1ldGhvZCwgbmV3SWQpO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdlcnJvcicsIGUpO1xuICAgICAgICAgICAgZGYucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gW1tjcmVhdGVTZXNzaW9uSGlzdG9yeV1dKCkgb3B0aW9ucy5cbiAqIEBqYSBbW2NyZWF0ZVNlc3Npb25IaXN0b3J5XV0oKSDjgavmuKHjgZnjgqrjg5fjgrfjg6fjg7NcbiAqIFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9ucyB7XG4gICAgY29udGV4dD86IFdpbmRvdztcbiAgICBtb2RlPzogJ2hhc2gnIHwgJ2hpc3RvcnknO1xufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zXV0gb2JqZWN0XG4gKiAgLSBgamFgIFtbU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zXV0g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkPzogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMpOiBJSGlzdG9yeTxUPiB7XG4gICAgY29uc3QgeyBjb250ZXh0LCBtb2RlIH0gPSBPYmplY3QuYXNzaWduKHsgbW9kZTogJ2hhc2gnIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgU2Vzc2lvbkhpc3RvcnkoY29udGV4dCB8fCB3aW5kb3csIG1vZGUsIGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikucmVzZXQob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIERpc3Bvc2UgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPik6IHZvaWQge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHsgUGxhaW5PYmplY3QsIHBvc3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU2lsZW5jZWFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnTWVtb3J5SGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEhpc3RvcnlFdmVudDxUPj4gaW1wbGVtZW50cyBJSGlzdG9yeTxUPiB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkOiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIGNvbnN0IG9sZFN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLnN0YXRlO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnTWVtb3J5SGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZSgnbm9vcCcsIGRmLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSBkZWx0YSA/IHRoaXMuc3RhdGUgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhIHx8IDApO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ3NlZWsnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zIHx8IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zIHx8IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXF1aXJlLWF3YWl0XG4gICAgICAgIHRoaXMuX3N0YWNrLmNsZWFyRm9yd2FyZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgYvjgonntYLngrnjga7jgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkIGFzIHN0cmluZyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBldmVudCAmIHdhaXQgcHJvY2VzcyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJpZ2dlckV2ZW50QW5kV2FpdChcbiAgICAgICAgZXZlbnQ6ICdyZWZyZXNoJyB8ICdjaGFuZ2luZycsXG4gICAgICAgIGFyZzE6IEhpc3RvcnlTdGF0ZTxUPixcbiAgICAgICAgYXJnMjogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkIHwgKChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICB0aGlzLnB1Ymxpc2goZXZlbnQsIGFyZzEsIGFyZzIgYXMgYW55LCBwcm9taXNlcyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcblxuICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIG5ld1N0YXRlWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgYXNzaWduU3RhdGVFbGVtZW50KG5ld1N0YXRlLCB0aGlzLl9zdGFjayBhcyBIaXN0b3J5U3RhY2spO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZChjYW5jZWwpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZShtZXRob2QsIGRmLCBuZXdTdGF0ZSwgdGhpcy5zdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2Ugc3RhdGUgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25DaGFuZ2VTdGF0ZShtZXRob2Q6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJywgZGY6IERlZmVycmVkLCBuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgnY2hhbmdpbmcnLCBuZXdTdGF0ZSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdyZWZyZXNoJywgbmV3U3RhdGUsIG9sZFN0YXRlKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgbWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBJSGlzdG9yeTxUPiB7XG4gICAgcmV0dXJuIG5ldyBNZW1vcnlIaXN0b3J5KGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IG1lbW9yeSBoaXN0b3J5LlxuICogQGphIOODoeODouODquWxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBNZW1vcnlIaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYE1lbW9yeUhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBNZW1vcnlIaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsImltcG9ydCB7IHBhdGgycmVnZXhwIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAnO1xuaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBDbGFzcyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgYXNzaWduVmFsdWUsXG4gICAgc2xlZXAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgdG9RdWVyeVN0cmluZ3MsXG4gICAgcGFyc2VVcmxRdWVyeSxcbiAgICBjb252ZXJ0VXJsUGFyYW1UeXBlLFxufSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7XG4gICAgdG9VcmwsXG4gICAgbG9hZFRlbXBsYXRlU291cmNlLFxuICAgIHRvVGVtcGxhdGVFbGVtZW50LFxufSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgSUhpc3RvcnksXG4gICAgY3JlYXRlU2Vzc2lvbkhpc3RvcnksXG4gICAgY3JlYXRlTWVtb3J5SGlzdG9yeSxcbn0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlQ2hhbmdlSW5mbyxcbiAgICBQYWdlLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXMsXG4gICAgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgREVGQVVMVF9QUkVGSVggICAgICAgPSAnY2RwJyxcbiAgICBUUkFOU0lUSU9OX0RJUkVDVElPTiA9ICd0cmFuc2l0aW9uLWRpcmVjdGlvbicsXG4gICAgVFJBTlNJVElPTl9SVU5OSU5HICAgPSAndHJhbnNpdGlvbi1ydW5uaW5nJyxcbiAgICBQQUdFX0NVUlJFTlQgICAgICAgICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgICAgICAgID0gJ3BhZ2UtcHJldmlvdXMnLFxuICAgIEVOVEVSX0ZST01fQ0xBU1MgICAgID0gJ2VudGVyLWZyb20nLFxuICAgIEVOVEVSX0FDVElWRV9DTEFTUyAgID0gJ2VudGVyLWFjdGl2ZScsXG4gICAgRU5URVJfVE9fQ0xBU1MgICAgICAgPSAnZW50ZXItdG8nLFxuICAgIExFQVZFX0ZST01fQ0xBU1MgICAgID0gJ2xlYXZlLWZyb20nLFxuICAgIExFQVZFX0FDVElWRV9DTEFTUyAgID0gJ2xlYXZlLWFjdGl2ZScsXG4gICAgTEVBVkVfVE9fQ0xBU1MgICAgICAgPSAnbGVhdmUtdG8nLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBEb21DYWNoZSB7XG4gICAgREFUQV9OQU1FICAgICAgICAgICA9ICdkb20tY2FjaGUnLFxuICAgIENBQ0hFX0xFVkVMX01FTU9SWSAgPSAnbWVtb3J5JyxcbiAgICBDQUNIRV9MRVZFTF9DT05ORUNUID0gJ2Nvbm5lY3QnLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBMaW5rRGF0YSB7XG4gICAgVFJBTlNJVElPTiAgICAgICA9ICd0cmFuc2l0aW9uJyxcbiAgICBOQVZJQUdBVEVfTUVUSE9EID0gJ25hdmlnYXRlLW1ldGhvZCcsXG4gICAgUFJFVkVOVF9ST1VURVIgICA9ICdwcmV2ZW50LXJvdXRlcicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENvbnN0IHtcbiAgICBXQUlUX1RSQU5TSVRJT05fTUFSR0lOID0gMTAwLCAvLyBtc2VjXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFBhZ2VFdmVudCA9ICdpbml0JyB8ICdtb3VudGVkJyB8ICdjbG9uZWQnIHwgJ2JlZm9yZS1lbnRlcicgfCAnYWZ0ZXItZW50ZXInIHwgJ2JlZm9yZS1sZWF2ZScgfCAnYWZ0ZXItbGVhdmUnIHwgJ3VubW91bnRlZCcgfCAncmVtb3ZlZCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCBleHRlbmRzIFJvdXRlQ2hhbmdlSW5mbyB7XG4gICAgcmVhZG9ubHkgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dDtcbiAgICBzYW1lUGFnZUluc3RhbmNlPzogYm9vbGVhbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZmxhdCBSb3V0ZVBhcmFtZXRlcnMgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSBPbWl0PFJvdXRlUGFyYW1ldGVycywgJ3JvdXRlcyc+ICYge1xuICAgIC8qKiByZWdleHAgZnJvbSBwYXRoICovXG4gICAgcmVnZXhwOiBSZWdFeHA7XG4gICAgLyoqIGtleXMgb2YgcGFyYW1zICovXG4gICAgcGFyYW1LZXlzOiBzdHJpbmdbXTtcbiAgICAvKiogRE9NIHRlbXBsYXRlIGluc3RhbmNlIHdpdGggUGFnZSBlbGVtZW50ICovXG4gICAgJHRlbXBsYXRlPzogRE9NO1xuICAgIC8qKiByb3V0ZXIgcGFnZSBpbnN0YW5jZSBmcm9tIGBjb21wb25lbnRgIHByb3BlcnR5ICovXG4gICAgcGFnZT86IFBhZ2U7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ID0gUm91dGVTdWJGbG93UGFyYW1zICYgUmVxdWlyZWQ8UGFnZVRyYW5zaXRpb25QYXJhbXM+ICYge1xuICAgIG9yaWdpbjogc3RyaW5nO1xufTtcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHQgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dCA9IFdyaXRhYmxlPFJvdXRlPiAmIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMgJiB7XG4gICAgJ0BwYXJhbXMnOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzO1xuICAgIHN1YmZsb3c/OiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0O1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgUm91dGVDb250ZXh0UGFyYW1ldGVycyB0byBSb3V0ZUNvbnRleHQgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dCA9ICh1cmw6IHN0cmluZywgcm91dGVyOiBSb3V0ZXIsIHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycywgbmF2T3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBSb3V0ZUNvbnRleHQgPT4ge1xuICAgIC8vIG9taXQgdW5jbG9uYWJsZSBwcm9wc1xuICAgIGNvbnN0IGZyb21OYXZpZ2F0ZSA9ICEhbmF2T3B0aW9ucztcbiAgICBjb25zdCBlbnN1cmVDbG9uZSA9IChjdHg6IHVua25vd24pOiBSb3V0ZUNvbnRleHQgPT4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjdHgpKTtcbiAgICBjb25zdCBjb250ZXh0ID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAge1xuICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgcm91dGVyOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiByb3V0ZXIsXG4gICAgICAgIH0sXG4gICAgICAgIG5hdk9wdGlvbnMsXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIGZvcmNlIG92ZXJyaWRlXG4gICAgICAgICAgICBxdWVyeToge30sXG4gICAgICAgICAgICBwYXJhbXM6IHt9LFxuICAgICAgICAgICAgcGF0aDogcGFyYW1zLnBhdGgsXG4gICAgICAgICAgICAnQHBhcmFtcyc6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHBhcmFtcyxcbiAgICAgICAgfSxcbiAgICApO1xuICAgIHJldHVybiBmcm9tTmF2aWdhdGUgPyBlbnN1cmVDbG9uZShjb250ZXh0KSA6IGNvbnRleHQgYXMgUm91dGVDb250ZXh0O1xufTtcblxuLyoqIEBpbnRlcm5hbCBjb252ZXJ0IGNvbnRleHQgcGFyYW1zICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzID0gKHJvdXRlczogUm91dGVQYXJhbWV0ZXJzIHwgUm91dGVQYXJhbWV0ZXJzW10gfCB1bmRlZmluZWQpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10gPT4ge1xuICAgIGNvbnN0IGZsYXR0ZW4gPSAocGFyZW50UGF0aDogc3RyaW5nLCBuZXN0ZWQ6IFJvdXRlUGFyYW1ldGVyc1tdKTogUm91dGVQYXJhbWV0ZXJzW10gPT4ge1xuICAgICAgICBjb25zdCByZXR2YWw6IFJvdXRlUGFyYW1ldGVyc1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgbiBvZiBuZXN0ZWQpIHtcbiAgICAgICAgICAgIG4ucGF0aCA9IGAke3BhcmVudFBhdGgucmVwbGFjZSgvXFwvJC8sICcnKX0vJHtub3JtYWxpemVJZChuLnBhdGgpfWA7XG4gICAgICAgICAgICByZXR2YWwucHVzaChuKTtcbiAgICAgICAgICAgIGlmIChuLnJvdXRlcykge1xuICAgICAgICAgICAgICAgIHJldHZhbC5wdXNoKC4uLmZsYXR0ZW4obi5wYXRoLCBuLnJvdXRlcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfTtcblxuICAgIHJldHVybiBmbGF0dGVuKCcnLCBpc0FycmF5KHJvdXRlcykgPyByb3V0ZXMgOiByb3V0ZXMgPyBbcm91dGVzXSA6IFtdKVxuICAgICAgICAubWFwKChzZWVkOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXlzOiBwYXRoMnJlZ2V4cC5LZXlbXSA9IFtdO1xuICAgICAgICAgICAgc2VlZC5yZWdleHAgPSBwYXRoMnJlZ2V4cC5wYXRoVG9SZWdleHAoc2VlZC5wYXRoLCBrZXlzKTtcbiAgICAgICAgICAgIHNlZWQucGFyYW1LZXlzID0ga2V5cy5maWx0ZXIoayA9PiBpc1N0cmluZyhrLm5hbWUpKS5tYXAoayA9PiBrLm5hbWUgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIHJldHVybiBzZWVkO1xuICAgICAgICB9KTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHByZXBhcmUgSUhpc3Rvcnkgb2JqZWN0ICovXG5leHBvcnQgY29uc3QgcHJlcGFyZUhpc3RvcnkgPSAoc2VlZDogJ2hhc2gnIHwgJ2hpc3RvcnknIHwgJ21lbW9yeScgfCBJSGlzdG9yeSA9ICdoYXNoJywgaW5pdGlhbFBhdGg/OiBzdHJpbmcsIGNvbnRleHQ/OiBXaW5kb3cpOiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICByZXR1cm4gKGlzU3RyaW5nKHNlZWQpXG4gICAgICAgID8gJ21lbW9yeScgPT09IHNlZWQgPyBjcmVhdGVNZW1vcnlIaXN0b3J5KGluaXRpYWxQYXRoIHx8ICcnKSA6IGNyZWF0ZVNlc3Npb25IaXN0b3J5KGluaXRpYWxQYXRoLCB1bmRlZmluZWQsIHsgbW9kZTogc2VlZCwgY29udGV4dCB9KVxuICAgICAgICA6IHNlZWRcbiAgICApIGFzIElIaXN0b3J5PFJvdXRlQ29udGV4dD47XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgYnVpbGROYXZpZ2F0ZVVybCA9IChwYXRoOiBzdHJpbmcsIG9wdGlvbnM6IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBzdHJpbmcgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHBhdGggPSBgLyR7bm9ybWFsaXplSWQocGF0aCl9YDtcbiAgICAgICAgY29uc3QgeyBxdWVyeSwgcGFyYW1zIH0gPSBvcHRpb25zO1xuICAgICAgICBsZXQgdXJsID0gcGF0aDJyZWdleHAuY29tcGlsZShwYXRoKShwYXJhbXMgfHwge30pO1xuICAgICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MocXVlcnkpfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsXG4gICAgICAgICAgICBgQ29uc3RydWN0IHJvdXRlIGRlc3RpbmF0aW9uIGZhaWxlZC4gW3BhdGg6ICR7cGF0aH0sIGRldGFpbDogJHtlcnJvci50b1N0cmluZygpfV1gLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICk7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUGFyYW1zID0gKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkID0+IHtcbiAgICBjb25zdCB7IHVybCB9ID0gcm91dGU7XG4gICAgcm91dGUucXVlcnkgID0gdXJsLmluY2x1ZGVzKCc/JykgPyBwYXJzZVVybFF1ZXJ5KG5vcm1hbGl6ZUlkKHVybCkpIDoge307XG4gICAgcm91dGUucGFyYW1zID0ge307XG5cbiAgICBjb25zdCB7IHJlZ2V4cCwgcGFyYW1LZXlzIH0gPSByb3V0ZVsnQHBhcmFtcyddO1xuICAgIGlmIChwYXJhbUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHJlZ2V4cC5leGVjKHVybCk/Lm1hcCgodmFsdWUsIGluZGV4KSA9PiB7IHJldHVybiB7IHZhbHVlLCBrZXk6IHBhcmFtS2V5c1tpbmRleCAtIDFdIH07IH0pO1xuICAgICAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIHBhcmFtcyEpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICBpZiAobnVsbCAhPSBwYXJhbS5rZXkgJiYgbnVsbCAhPSBwYXJhbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKHJvdXRlLnBhcmFtcywgcGFyYW0ua2V5LCBjb252ZXJ0VXJsUGFyYW1UeXBlKHBhcmFtLnZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyNpbnN0YW5jZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZSA9IGFzeW5jIChyb3V0ZTogUm91dGVDb250ZXh0KTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgY29uc3QgeyAnQHBhcmFtcyc6IHBhcmFtcyB9ID0gcm91dGU7XG5cbiAgICBpZiAocGFyYW1zLnBhZ2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCB7IGNvbXBvbmVudCwgY29tcG9uZW50T3B0aW9ucyB9ID0gcGFyYW1zO1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvYXdhaXQtdGhlbmFibGVcbiAgICAgICAgICAgIHBhcmFtcy5wYWdlID0gYXdhaXQgbmV3IChjb21wb25lbnQgYXMgdW5rbm93biBhcyBDbGFzcykocm91dGUsIGNvbXBvbmVudE9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHBhcmFtcy5wYWdlID0gYXdhaXQgY29tcG9uZW50KHJvdXRlLCBjb21wb25lbnRPcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY29tcG9uZW50KSkge1xuICAgICAgICBwYXJhbXMucGFnZSA9IE9iamVjdC5hc3NpZ24oeyAnQHJvdXRlJzogcm91dGUsICdAb3B0aW9ucyc6IGNvbXBvbmVudE9wdGlvbnMgfSwgY29tcG9uZW50KSBhcyBQYWdlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0geyAnQHJvdXRlJzogcm91dGUsICdAb3B0aW9ucyc6IGNvbXBvbmVudE9wdGlvbnMgfSBhcyBQYWdlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIyR0ZW1wbGF0ZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZSA9IGFzeW5jIChwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBpZiAocGFyYW1zLiR0ZW1wbGF0ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IGVuc3VyZUluc3RhbmNlID0gKGVsOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCk6IERPTSA9PiB7XG4gICAgICAgIHJldHVybiBlbCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyAkKFsuLi5lbC5jb250ZW50LmNoaWxkcmVuXSkgYXMgRE9NIDogJChlbCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHsgY29udGVudCB9ID0gcGFyYW1zO1xuICAgIGlmIChudWxsID09IGNvbnRlbnQpIHtcbiAgICAgICAgLy8gbm9vcCBlbGVtZW50XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSAkPEhUTUxFbGVtZW50PigpO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoKGNvbnRlbnQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pWydzZWxlY3RvciddKSkge1xuICAgICAgICAvLyBmcm9tIGFqYXhcbiAgICAgICAgY29uc3QgeyBzZWxlY3RvciwgdXJsIH0gPSBjb250ZW50IGFzIHsgc2VsZWN0b3I6IHN0cmluZzsgdXJsPzogc3RyaW5nOyB9O1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRvVGVtcGxhdGVFbGVtZW50KGF3YWl0IGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgeyB1cmw6IHVybCAmJiB0b1VybCh1cmwpIH0pKTtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoYHRlbXBsYXRlIGxvYWQgZmFpbGVkLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCB1cmw6ICR7dXJsfV1gKTtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gZW5zdXJlSW5zdGFuY2UodGVtcGxhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0ICRlbCA9ICQoY29udGVudCBhcyBET01TZWxlY3Rvcik7XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBlbnN1cmVJbnN0YW5jZSgkZWxbMF0pO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGRlY2lkZSB0cmFuc2l0aW9uIGRpcmVjdGlvbiAqL1xuZXhwb3J0IGNvbnN0IGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24gPSAoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvKTogSGlzdG9yeURpcmVjdGlvbiA9PiB7XG4gICAgaWYgKGNoYW5nZUluZm8ucmV2ZXJzZSkge1xuICAgICAgICBzd2l0Y2ggKGNoYW5nZUluZm8uZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdiYWNrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgY2FzZSAnZm9yd2FyZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdiYWNrJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZUluZm8uZGlyZWN0aW9uO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBFZmZlY3RUeXBlID0gJ2FuaW1hdGlvbicgfCAndHJhbnNpdGlvbic7XG5cbi8qKiBAaW50ZXJuYWwgcmV0cmlldmUgZWZmZWN0IGR1cmF0aW9uIHByb3BlcnR5ICovXG5jb25zdCBnZXRFZmZlY3REdXJhdGlvblNlYyA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlKTogbnVtYmVyID0+IHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKCRlbFswXSlbYCR7ZWZmZWN0fUR1cmF0aW9uYF0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCB3YWl0Rm9yRWZmZWN0ID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUsIGR1cmF0aW9uU2VjOiBudW1iZXIpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiAkZWxbYCR7ZWZmZWN0fUVuZGBdKHJlc29sdmUpKSxcbiAgICAgICAgc2xlZXAoZHVyYXRpb25TZWMgKiAxMDAwICsgQ29uc3QuV0FJVF9UUkFOU0lUSU9OX01BUkdJTiksXG4gICAgXSk7XG59O1xuXG4vKiogQGludGVybmFsIHRyYW5zaXRpb24gZXhlY3V0aW9uICovXG5leHBvcnQgY29uc3QgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uID0gYXN5bmMoJGVsOiBET00sIGZyb21DbGFzczogc3RyaW5nLCBhY3RpdmVDbGFzczogc3RyaW5nLCB0b0NsYXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAkZWwucmVtb3ZlQ2xhc3MoZnJvbUNsYXNzKTtcbiAgICAkZWwuYWRkQ2xhc3ModG9DbGFzcyk7XG5cbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgWydhbmltYXRpb24nLCAndHJhbnNpdGlvbiddIGFzIEVmZmVjdFR5cGVbXSkge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IGdldEVmZmVjdER1cmF0aW9uU2VjKCRlbCwgZWZmZWN0KTtcbiAgICAgICAgZHVyYXRpb24gJiYgcHJvbWlzZXMucHVzaCh3YWl0Rm9yRWZmZWN0KCRlbCwgZWZmZWN0LCBkdXJhdGlvbikpO1xuICAgIH1cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3MoW2FjdGl2ZUNsYXNzLCB0b0NsYXNzXSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBSb3V0ZUF5bmNQcm9jZXNzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUF5bmNQcm9jZXNzIGltcGxlbWVudGF0aW9uICovXG5leHBvcnQgY2xhc3MgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgaW1wbGVtZW50cyBSb3V0ZUF5bmNQcm9jZXNzIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZUF5bmNQcm9jZXNzXG5cbiAgICByZWdpc3Rlcihwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWwgbWV0aG9kczpcblxuICAgIGdldCBwcm9taXNlcygpOiByZWFkb25seSBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGNvbXBsZXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9wcm9taXNlcyk7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLmxlbmd0aCA9IDA7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gKi9cblxuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNhbWVsaXplLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBOYXRpdmVQcm9taXNlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgaXNSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlckV2ZW50LFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICBOYXZpZ2F0aW9uU2V0dGluZ3MsXG4gICAgUGFnZVN0YWNrLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgQ3NzTmFtZSxcbiAgICBEb21DYWNoZSxcbiAgICBMaW5rRGF0YSxcbiAgICBQYWdlRXZlbnQsXG4gICAgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0LFxuICAgIFJvdXRlQ29udGV4dCxcbiAgICBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICB0b1JvdXRlQ29udGV4dCxcbiAgICBwcmVwYXJlSGlzdG9yeSxcbiAgICBidWlsZE5hdmlnYXRlVXJsLFxuICAgIHBhcnNlVXJsUGFyYW1zLFxuICAgIGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZSxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUsXG4gICAgZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbixcbiAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgfSBmcm9tICcuL2FzeW5jLXByb2Nlc3MnO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUm91dGVyIGltcGxpbWVudCBjbGFzcy5cbiAqIEBqYSBSb3V0ZXIg5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJvdXRlckNvbnRleHQgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSb3V0ZXJFdmVudD4gaW1wbGVtZW50cyBSb3V0ZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlczogUmVjb3JkPHN0cmluZywgUm91dGVDb250ZXh0UGFyYW1ldGVycz4gPSB7fTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5OiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRlbDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JhZjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlDaGFuZ2luZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5UmVmcmVzaEhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlSZWZyZXNoO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Vycm9ySGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGFuZGxlRXJyb3I7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY3NzUHJlZml4OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdHJhbnNpdGlvblNldHRpbmdzOiBUcmFuc2l0aW9uU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBfbmF2aWdhdGlvblNldHRpbmdzOiBSZXF1aXJlZDxOYXZpZ2F0aW9uU2V0dGluZ3M+O1xuICAgIHByaXZhdGUgX2xhc3RSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9wcmV2Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfdGVtcFRyYW5zaXRpb25QYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcztcbiAgICBwcml2YXRlIF9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdzogY29udGV4dCxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgICAgIGNzc1ByZWZpeCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICBuYXZpZ2F0aW9uLFxuICAgICAgICB9ID0gb3B0aW9ucztcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgICAgIHRoaXMuX3JhZiA9IGNvbnRleHQ/LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgICAgIHRoaXMuXyRlbCA9ICQoc2VsZWN0b3IsIGVsKTtcbiAgICAgICAgaWYgKCF0aGlzLl8kZWwubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQsIGBSb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuIFtzZWxlY3RvcjogJHtzZWxlY3RvciBhcyBzdHJpbmd9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeSA9IHByZXBhcmVIaXN0b3J5KGhpc3RvcnksIGluaXRpYWxQYXRoLCBjb250ZXh0IGFzIFdpbmRvdyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIgPSB0aGlzLm9uSGlzdG9yeUNoYW5naW5nLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlciAgPSB0aGlzLm9uSGlzdG9yeVJlZnJlc2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fZXJyb3JIYW5kbGVyICAgICAgICAgICA9IHRoaXMub25IYW5kbGVFcnJvci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGZvbGxvdyBhbmNob3JcbiAgICAgICAgdGhpcy5fJGVsLm9uKCdjbGljaycsICdbaHJlZl0nLCB0aGlzLm9uQW5jaG9yQ2xpY2tlZC5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9jc3NQcmVmaXggPSBjc3NQcmVmaXggfHwgQ3NzTmFtZS5ERUZBVUxUX1BSRUZJWDtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IGRlZmF1bHQ6ICdub25lJywgcmVsb2FkOiAnbm9uZScgfSwgdHJhbnNpdGlvbik7XG4gICAgICAgIHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBtZXRob2Q6ICdwdXNoJyB9LCBuYXZpZ2F0aW9uKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyKHJvdXRlcyBhcyBSb3V0ZVBhcmFtZXRlcnNbXSwgc3RhcnQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuQmFjaztcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5Gb3J3YXJkO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyhyb3V0ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3V0ZXNbY29udGV4dC5wYXRoXSA9IGNvbnRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVmcmVzaCAmJiB2b2lkIHRoaXMuZ28oKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIE5hdmlnYXRlIHRvIG5ldyBwYWdlLiAqL1xuICAgIGFzeW5jIG5hdmlnYXRlKHRvOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHRvKTtcbiAgICAgICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsIGBSb3V0ZSBub3QgZm91bmQuIFt0bzogJHt0b31dYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG9wdHMgICA9IE9iamVjdC5hc3NpZ24oeyBpbnRlbnQ6IHVuZGVmaW5lZCB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgICA9IGJ1aWxkTmF2aWdhdGVVcmwodG8sIG9wdHMpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgID0gdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBzZWVkLCBvcHRzKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IG9wdHMubWV0aG9kIHx8IHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncy5tZXRob2Q7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gZXhlYyBuYXZpZ2F0ZVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnlbbWV0aG9kXSh1cmwsIHJvdXRlKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEFkZCBwYWdlIHN0YWNrIHN0YXJ0aW5nIGZyb20gdGhlIGN1cnJlbnQgaGlzdG9yeS4gKi9cbiAgICBhc3luYyBwdXNoUGFnZVN0YWNrKHN0YWNrOiBQYWdlU3RhY2sgfCBQYWdlU3RhY2tbXSwgbm9OYXZpZ2F0ZT86IGJvb2xlYW4pOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrcyA9IGlzQXJyYXkoc3RhY2spID8gc3RhY2sgOiBbc3RhY2tdO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gc3RhY2tzLmZpbHRlcihzID0+ICEhcy5yb3V0ZSkubWFwKHMgPT4gcy5yb3V0ZSBhcyBSb3V0ZVBhcmFtZXRlcnMpO1xuXG4gICAgICAgICAgICAvLyBlbnNydWUgUm91dGVcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXIocm91dGVzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIHB1c2ggaGlzdG9yeVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBzdGFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB1cmwsIHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHBhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFt1cmw6ICR7dXJsfV1gLCBwYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBzaWxlbnQgcmVnaXN0cnlcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHBhcmFtcywgeyBpbnRlbnQ6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUudHJhbnNpdGlvbiA9IHRyYW5zaXRpb247XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLnJldmVyc2UgICAgPSByZXZlcnNlO1xuICAgICAgICAgICAgICAgICAgICB2b2lkIHRoaXMuX2hpc3RvcnkucHVzaCh1cmwsIHJvdXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5nbygtMSAqIHN0YWNrcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIW5vTmF2aWdhdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmdvKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkgYnkgc3RhY2sgSUQuICovXG4gICAgYXN5bmMgdHJhdmVyc2VUbyhpZDogc3RyaW5nKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkudHJhdmVyc2VUbyhpZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBCZWdpbiBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBiZWdpblN1YkZsb3codG86IHN0cmluZywgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtcywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MuZGVmYXVsdCBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW46IHRoaXMuY3VycmVudFJvdXRlLnVybCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHN1YmZsb3csXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRlU3ViRmxvd1BhcmFtcyhwYXJhbXMpO1xuICAgICAgICAgICAgKHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dCkuc3ViZmxvdyA9IHBhcmFtcztcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubmF2aWdhdGUodG8sIG9wdGlvbnMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENvbW1pdCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjb21taXRTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGNvbnN0IHsgYWRkaXRpb25hbERpc3RhbmNlLCBhZGRpdGluYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW5hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKCgpID0+IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW5hbFN0YWNrcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogZGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENhbmNlbCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjYW5jZWxTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBzdWJmbG93LnBhcmFtcztcblxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0sIHBhcmFtcyk7XG4gICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBzdWJmbG93LmRpc3RhbmNlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogU2V0IGNvbW1vbiB0cmFuc2l0aW9uIHNldHRuaWdzLiAqL1xuICAgIHRyYW5zaXRpb25TZXR0aW5ncyhuZXdTZXR0aW5ncz86IFRyYW5zaXRpb25TZXR0aW5ncyk6IFRyYW5zaXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0geyAuLi50aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgfTtcbiAgICAgICAgbmV3U2V0dGluZ3MgJiYgT2JqZWN0LmFzc2lnbih0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MsIG5ld1NldHRpbmdzKTtcbiAgICAgICAgcmV0dXJuIG9sZFNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIG5hdmlnYXRpb24gc2V0dG5pZ3MuICovXG4gICAgbmF2aWdhdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogTmF2aWdhdGlvblNldHRpbmdzKTogTmF2aWdhdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX25hdmlnYXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX25hdmlnYXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFJlZnJlc2ggcm91dGVyIChzcGVjaWZ5IHVwZGF0ZSBsZXZlbCkuICovXG4gICAgYXN5bmMgcmVmcmVzaChsZXZlbCA9IFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSBSb3V0ZXJSZWZyZXNoTGV2ZWwuUkVMT0FEOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdvKCk7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5ET01fQ0xFQVI6IHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuX2hpc3Rvcnkuc3RhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGVsID0gJChyb3V0ZS5lbCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2UgPSByb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcm91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJvdXRlLmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVuc3VwcG9ydGVkIGxldmVsOiAke2xldmVsfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiBzdWItZmxvd1xuXG4gICAgLyoqIEBpbnRlcm5hbCBldmFsdWF0ZSBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBldmFsdWF0ZVN1YkZsb3dQYXJhbXMoc3ViZmxvdzogUm91dGVTdWJGbG93UGFyYW1zKTogdm9pZCB7XG4gICAgICAgIGxldCBhZGRpdGlvbmFsRGlzdGFuY2UgPSAwO1xuXG4gICAgICAgIGlmIChzdWJmbG93LmJhc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKHN1YmZsb3cuYmFzZSk7XG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IHsgaW5kZXgsIHN0YWNrIH0gPSB0aGlzLl9oaXN0b3J5O1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGktLSwgYWRkaXRpb25hbERpc3RhbmNlKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2tbaV1bJ0BpZCddID09PSBiYXNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCwgYEludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuIFt1cmw6ICR7c3ViZmxvdy5iYXNlfV1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1YmZsb3cuYmFzZSA9IHRoaXMuY3VycmVudFJvdXRlLnVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24oc3ViZmxvdywgeyBhZGRpdGlvbmFsRGlzdGFuY2UgfSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGZpbmRTdWJGbG93UGFyYW1zKGRldGFjaDogYm9vbGVhbik6IHsgZGlzdGFuY2U6IG51bWJlcjsgcGFyYW1zOiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ICYgeyBhZGRpdGlvbmFsRGlzdGFuY2U6IG51bWJlcjsgfTsgfSB8IHZvaWQge1xuICAgICAgICBjb25zdCBzdGFjayA9IHRoaXMuX2hpc3Rvcnkuc3RhY2s7XG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFjay5sZW5ndGggLSAxLCBkaXN0YW5jZSA9IDA7IGkgPj0gMDsgaS0tLCBkaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICBpZiAoc3RhY2tbaV0uc3ViZmxvdykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN0YWNrW2ldLnN1YmZsb3cgYXMgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgZGV0YWNoICYmIGRlbGV0ZSBzdGFja1tpXS5zdWJmbG93O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRpc3RhbmNlLCBwYXJhbXMgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvblxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gYFJvdXRlckV2ZW50QXJnYCBtYWtlciAqL1xuICAgIHByaXZhdGUgbWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQge1xuICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXdTdGF0ZS5pbnRlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdTdGF0ZS5pbnRlbnQ7IC8vIG5hdmlnYXRlIOaZguOBq+aMh+WumuOBleOCjOOBnyBpbnRlbnQg44GvIG9uZSB0aW1lIOOBruOBv+acieWKueOBq+OBmeOCi1xuXG4gICAgICAgIGNvbnN0IGZyb20gPSAob2xkU3RhdGUgfHwgdGhpcy5fbGFzdFJvdXRlKSBhcyBSb3V0ZUNvbnRleHQgJiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSB0aGlzLl9oaXN0b3J5LmRpcmVjdChuZXdTdGF0ZVsnQGlkJ10sIGZyb20/LlsnQGlkJ10pLmRpcmVjdGlvbjtcbiAgICAgICAgY29uc3QgYXN5bmNQcm9jZXNzID0gbmV3IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0KCk7XG4gICAgICAgIGNvbnN0IHJlbG9hZCA9IG5ld1N0YXRlLnVybCA9PT0gZnJvbT8udXJsO1xuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfVxuICAgICAgICAgICAgPSB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyB8fCAocmVsb2FkXG4gICAgICAgICAgICAgICAgPyB7IHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5yZWxvYWQsIHJldmVyc2U6IGZhbHNlIH1cbiAgICAgICAgICAgICAgICA6ICgnYmFjaycgIT09IGRpcmVjdGlvbiA/IG5ld1N0YXRlIDogZnJvbSBhcyBSb3V0ZUNvbnRleHQpKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgZnJvbSxcbiAgICAgICAgICAgIHRvOiBuZXdTdGF0ZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbixcbiAgICAgICAgICAgIGFzeW5jUHJvY2VzcyxcbiAgICAgICAgICAgIHJlbG9hZCxcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgaW50ZW50LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCByb3V0ZSBieSB1cmwgKi9cbiAgICBwcml2YXRlIGZpbmRSb3V0ZUNvbnRleHRQYXJhbXModXJsOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZCh1cmwuc3BsaXQoJz8nKVswXSl9YDtcbiAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIE9iamVjdC5rZXlzKHRoaXMuX3JvdXRlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVnZXhwIH0gPSB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICBpZiAocmVnZXhwLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgcGFnZSBldmVudCAqL1xuICAgIHByaXZhdGUgdHJpZ2dlclBhZ2VDYWxsYmFjayhldmVudDogUGFnZUV2ZW50LCB0YXJnZXQ6IFBhZ2UgfCB1bmRlZmluZWQsIGFyZzogUm91dGUgfCBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG1ldGhvZCA9IGNhbWVsaXplKGBwYWdlLSR7ZXZlbnR9YCk7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKCh0YXJnZXQgYXMgUGFnZSAmIFJlY29yZDxzdHJpbmcsIFVua25vd25GdW5jdGlvbj4gfCB1bmRlZmluZWQpPy5bbWV0aG9kXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHJldHZhbCA9ICh0YXJnZXQgYXMgUGFnZSAmIFJlY29yZDxzdHJpbmcsIFVua25vd25GdW5jdGlvbj4gfCB1bmRlZmluZWQpPy5bbWV0aG9kXShhcmcpO1xuICAgICAgICAgICAgaWYgKHJldHZhbCBpbnN0YW5jZW9mIE5hdGl2ZVByb21pc2UgJiYgKGFyZyBhcyBSb3V0ZSAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnYXN5bmNQcm9jZXNzJ10pIHtcbiAgICAgICAgICAgICAgICAoYXJnIGFzIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpLmFzeW5jUHJvY2Vzcy5yZWdpc3RlcihyZXR2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB3YWl0IGZyYW1lICovXG4gICAgcHJpdmF0ZSB3YWl0RnJhbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB3YWl0RnJhbWUoMSwgdGhpcy5fcmFmKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBwYWdlIG1haW4gcHJvY2VkdXJlICovXG4gICAgcHJpdmF0ZSBhc3luYyBjaGFuZ2VQYWdlKG5leHRSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIHByZXZSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2luQ2hhbmdpbmdQYWdlID0gdHJ1ZTtcblxuICAgICAgICAgICAgcGFyc2VVcmxQYXJhbXMobmV4dFJvdXRlKTtcblxuICAgICAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRoaXMubWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXh0Um91dGUsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgY29uc3QgW1xuICAgICAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LFxuICAgICAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LFxuICAgICAgICAgICAgXSA9IGF3YWl0IHRoaXMucHJlcGFyZUNoYW5nZUNvbnRleHQoY2hhbmdlSW5mbyk7XG5cbiAgICAgICAgICAgIC8vIHRyYW5zaXRpb24gY29yZVxuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGF3YWl0IHRoaXMudHJhbnNpdGlvblBhZ2UocGFnZU5leHQsICRlbE5leHQsIHBhZ2VQcmV2LCAkZWxQcmV2LCBjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgdGhpcy51cGRhdGVDaGFuZ2VDb250ZXh0KCRlbE5leHQsICRlbFByZXYsIGNoYW5nZUluZm8sIHRyYW5zaXRpb24pO1xuXG4gICAgICAgICAgICAvLyDpgbfnp7vlhYjjgYwgc3ViZmxvdyDplovlp4vngrnjgafjgYLjgovloLTlkIgsIHN1YmZsb3cg6Kej6ZmkXG4gICAgICAgICAgICBpZiAobmV4dFJvdXRlLnVybCA9PT0gdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk/LnBhcmFtcy5vcmlnaW4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHByZXBhcmVDaGFuZ2VDb250ZXh0KGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpOiBQcm9taXNlPFtQYWdlLCBET00sIFBhZ2UsIERPTV0+IHtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gY2hhbmdlSW5mby50byBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjtcbiAgICAgICAgY29uc3QgcHJldlJvdXRlID0gY2hhbmdlSW5mby5mcm9tIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBuZXh0UGFyYW1zIH0gPSBuZXh0Um91dGU7XG4gICAgICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBwcmV2UGFyYW1zIH0gPSBwcmV2Um91dGUgfHwge307XG5cbiAgICAgICAgLy8gcGFnZSBpbnN0YW5jZVxuICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UobmV4dFJvdXRlKTtcbiAgICAgICAgLy8gcGFnZSAkdGVtcGxhdGVcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlKG5leHRQYXJhbXMpO1xuXG4gICAgICAgIGNoYW5nZUluZm8uc2FtZVBhZ2VJbnN0YW5jZSA9IHByZXZQYXJhbXM/LnBhZ2UgJiYgcHJldlBhcmFtcy5wYWdlID09PSBuZXh0UGFyYW1zLnBhZ2U7XG4gICAgICAgIGNvbnN0IHsgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBhc3luY1Byb2Nlc3MgfSA9IGNoYW5nZUluZm87XG5cbiAgICAgICAgLy8gcGFnZSAkZWxcbiAgICAgICAgaWYgKCFuZXh0Um91dGUuZWwpIHtcbiAgICAgICAgICAgIGlmICghcmVsb2FkICYmIHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBuZXh0Um91dGUuZWwgID0gcHJldlJvdXRlIS5lbDtcbiAgICAgICAgICAgICAgICBwcmV2Um91dGUhLmVsID0gbmV4dFJvdXRlLmVsPy5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgJChwcmV2Um91dGUhLmVsKS5pbnNlcnRCZWZvcmUobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgICAgICAgICAkKG5leHRSb3V0ZS5lbCkuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKS5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWAsIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YF0pO1xuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2xvbmVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdjbG9uZWQnLCBuZXh0UGFyYW1zLnBhZ2UsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAobmV4dFBhcmFtcy4kdGVtcGxhdGU/LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRSb3V0ZS5lbCAgICAgICAgID0gbmV4dFBhcmFtcy4kdGVtcGxhdGVbMF07XG4gICAgICAgICAgICAgICAgICAgIG5leHRQYXJhbXMuJHRlbXBsYXRlID0gbmV4dFBhcmFtcy4kdGVtcGxhdGUuY2xvbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXh0Um91dGUuZWwgPSBuZXh0UGFyYW1zLiR0ZW1wbGF0ZSEuY2xvbmUoKVswXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdsb2FkZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2luaXQnLCBuZXh0UGFyYW1zLnBhZ2UsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGVsTmV4dCA9ICQobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgY29uc3QgcGFnZU5leHQgPSBuZXh0UGFyYW1zLnBhZ2UhO1xuXG4gICAgICAgIC8vIG1vdW50XG4gICAgICAgIGlmICghJGVsTmV4dC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgJGVsTmV4dC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fJGVsLmFwcGVuZCgkZWxOZXh0KTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbW91bnRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdtb3VudGVkJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dFxuICAgICAgICAgICAgKHJlbG9hZCAmJiB7fSB8fCBwcmV2UGFyYW1zPy5wYWdlIHx8IHt9KSwgKHJlbG9hZCAmJiAkKG51bGwpIHx8ICQocHJldlJvdXRlPy5lbCkpLCAgLy8gcHJldlxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyYW5zaXRpb25QYWdlKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBjaGFuZ2VJbmZvLnRyYW5zaXRpb24gfHwgdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLmRlZmF1bHQ7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgJ2VudGVyLWZyb20tY2xhc3MnOiBjdXN0b21FbnRlckZyb21DbGFzcyxcbiAgICAgICAgICAgICdlbnRlci1hY3RpdmUtY2xhc3MnOiBjdXN0b21FbnRlckFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgJ2VudGVyLXRvLWNsYXNzJzogY3VzdG9tRW50ZXJUb0NsYXNzLFxuICAgICAgICAgICAgJ2xlYXZlLWZyb20tY2xhc3MnOiBjdXN0b21MZWF2ZUZyb21DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1hY3RpdmUtY2xhc3MnOiBjdXN0b21MZWF2ZUFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgJ2xlYXZlLXRvLWNsYXNzJzogY3VzdG9tTGVhdmVUb0NsYXNzLFxuICAgICAgICB9ID0gdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzO1xuXG4gICAgICAgIC8vIGVudGVyLWNzcy1jbGFzc1xuICAgICAgICBjb25zdCBlbnRlckZyb21DbGFzcyAgID0gY3VzdG9tRW50ZXJGcm9tQ2xhc3MgICB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfRlJPTV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlckFjdGl2ZUNsYXNzID0gY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfQUNUSVZFX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGVudGVyVG9DbGFzcyAgICAgPSBjdXN0b21FbnRlclRvQ2xhc3MgICAgIHx8IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9UT19DTEFTU31gO1xuXG4gICAgICAgIC8vIGxlYXZlLWNzcy1jbGFzc1xuICAgICAgICBjb25zdCBsZWF2ZUZyb21DbGFzcyAgID0gY3VzdG9tTGVhdmVGcm9tQ2xhc3MgICB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfRlJPTV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZUFjdGl2ZUNsYXNzID0gY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfQUNUSVZFX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGxlYXZlVG9DbGFzcyAgICAgPSBjdXN0b21MZWF2ZVRvQ2xhc3MgICAgIHx8IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9UT19DTEFTU31gO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsIGVudGVyRnJvbUNsYXNzLCBlbnRlckFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsIGxlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgY2hhbmdlSW5mbyxcbiAgICAgICAgKTtcblxuICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgIC8vIHRyYW5zaXNpb24gZXhlY3V0aW9uXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIHByb2Nlc3NQYWdlVHJhbnNpdGlvbigkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcywgZW50ZXJUb0NsYXNzKSxcbiAgICAgICAgICAgIHByb2Nlc3NQYWdlVHJhbnNpdGlvbigkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcywgbGVhdmVUb0NsYXNzKSxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICBhd2FpdCB0aGlzLmVuZFRyYW5zaXRpb24oXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LFxuICAgICAgICAgICAgY2hhbmdlSW5mbyxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gdHJhbnNpdGlvbjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyYW5zaXRpb24gcHJvYyA6IGJlZ2luICovXG4gICAgcHJpdmF0ZSBhc3luYyBiZWdpblRyYW5zaXRpb24oXG4gICAgICAgIHBhZ2VOZXh0OiBQYWdlLCAkZWxOZXh0OiBET00sIGVudGVyRnJvbUNsYXNzOiBzdHJpbmcsIGVudGVyQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSwgbGVhdmVGcm9tQ2xhc3M6IHN0cmluZywgbGVhdmVBY3RpdmVDbGFzczogc3RyaW5nLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl8kZWwuYWRkQ2xhc3MoW1xuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWAsXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX0RJUkVDVElPTn0tJHtkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uKGNoYW5nZUluZm8pfWAsXG4gICAgICAgIF0pO1xuXG4gICAgICAgICRlbE5leHRcbiAgICAgICAgICAgIC5hZGRDbGFzcyhbZW50ZXJGcm9tQ2xhc3MsIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSlcbiAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbicpXG4gICAgICAgICAgICAucmVmbG93KClcbiAgICAgICAgICAgIC5hZGRDbGFzcyhlbnRlckFjdGl2ZUNsYXNzKVxuICAgICAgICA7XG4gICAgICAgICRlbFByZXYuYWRkQ2xhc3MoW2xlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogZW5kICovXG4gICAgcHJpdmF0ZSBhc3luYyBlbmRUcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAoJGVsTmV4dFswXSAhPT0gJGVsUHJldlswXSkgJiYgJGVsUHJldi5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuICAgICAgICAkZWxOZXh0LnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuICAgICAgICAkZWxQcmV2LnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMuXyRlbC5yZW1vdmVDbGFzcyhbXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YCxcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fRElSRUNUSU9OfS0ke2RlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24oY2hhbmdlSW5mbyl9YCxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1sZWF2ZScsIHBhZ2VQcmV2LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdhZnRlci10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgcGFnZSBzdGF0dXMgYWZ0ZXIgdHJhbnNpdGlvbiAqL1xuICAgIHByaXZhdGUgdXBkYXRlQ2hhbmdlQ29udGV4dChcbiAgICAgICAgJGVsTmV4dDogRE9NLFxuICAgICAgICAkZWxQcmV2OiBET00sXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgICAgIHRyYW5zaXRpb246IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICApOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBmcm9tLCByZWxvYWQsIHNhbWVQYWdlSW5zdGFuY2UsIGRpcmVjdGlvbiwgdG8gfSA9IGNoYW5nZUluZm87XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGZyb20gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCBuZXh0Um91dGUgPSB0byBhcyBSb3V0ZUNvbnRleHQ7XG4gICAgICAgIGNvbnN0IHVybENoYW5nZWQgPSAhcmVsb2FkO1xuXG5cbiAgICAgICAgaWYgKCRlbE5leHRbMF0gIT09ICRlbFByZXZbMF0pIHtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBjbGFzc1xuICAgICAgICAgICAgJGVsUHJldlxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgJGVsTmV4dC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YCk7XG5cbiAgICAgICAgICAgIGlmICh1cmxDaGFuZ2VkICYmIHRoaXMuX3ByZXZSb3V0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQodGhpcy5fcHJldlJvdXRlLmVsKTtcbiAgICAgICAgICAgICAgICAkZWwucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcHJldlJvdXRlLmVsICYmIHRoaXMuX3ByZXZSb3V0ZS5lbCAhPT0gdGhpcy5jdXJyZW50Um91dGUuZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FjaGVMdiA9ICRlbC5kYXRhKERvbUNhY2hlLkRBVEFfTkFNRSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9DT05ORUNUICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYWdlID0gdGhpcy5fcHJldlJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcmVFdmVudHMgPSB0aGlzLl9wcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlICE9PSBuZXh0Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpcmVFdmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubW91bnRlZCcsIHRoaXMuX3ByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERvbUNhY2hlLkNBQ0hFX0xFVkVMX01FTU9SWSAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5sb2FkZWQnLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1cmxDaGFuZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgPSBwcmV2Um91dGU7XG4gICAgICAgICAgICBpZiAoc2FtZVBhZ2VJbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgICRlbFByZXYuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgJGVsTmV4dC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWApO1xuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZSAmJiAodGhpcy5fcHJldlJvdXRlLmVsID0gbnVsbCEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbGFzdFJvdXRlID0gdGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0O1xuICAgICAgICAnZm9yd2FyZCcgPT09IGRpcmVjdGlvbiAmJiB0cmFuc2l0aW9uICYmICh0aGlzLl9sYXN0Um91dGUudHJhbnNpdGlvbiA9IHRyYW5zaXRpb24pO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYGNoYW5naW5nYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlDaGFuZ2luZyhuZXh0U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBjYW5jZWw6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9pbkNoYW5naW5nUGFnZSkge1xuICAgICAgICAgICAgY2FuY2VsKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9CVVNZKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRoaXMubWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXh0U3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1jaGFuZ2UnLCBjaGFuZ2VJbmZvLCBjYW5jZWwpO1xuICAgICAgICBwcm9taXNlcy5wdXNoKC4uLmNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLnByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgcmVmcmVzaGAgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5UmVmcmVzaChuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+KTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgdXJsICA9IGAvJHtzdGF0ZVsnQGlkJ119YDtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCwgYFJvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4gW3VybDogJHt1cmx9XWAsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsID09IHN0YXRlWydAcGFyYW1zJ10pIHtcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXIg44KSIGFzc2lnblxuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc3RhdGUsIHRvUm91dGVDb250ZXh0KHVybCwgdGhpcywgcGFyYW1zKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmVsKSB7XG4gICAgICAgICAgICAgICAgLy8gaWQg44Gr57SQ44Gl44GP6KaB57Sg44GM44GZ44Gn44Gr5a2Y5Zyo44GZ44KL5aC05ZCI44Gv5Ymy44KK5b2T44GmXG4gICAgICAgICAgICAgICAgc3RhdGUuZWwgPSB0aGlzLl9oaXN0b3J5LmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUgYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHNjaGVkdWxpbmcgYHJlZnJlc2hgIGRvbmUuXG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuY2hhbmdlUGFnZShlbnN1cmUobmV3U3RhdGUpLCBvbGRTdGF0ZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGVycm9yIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGFuZGxlRXJyb3IoZXJyb3I6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKFxuICAgICAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgICAgIGlzUmVzdWx0KGVycm9yKSA/IGVycm9yIDogbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgJ1JvdXRlIG5hdmlnYXRlIGZhaWxlZC4nLCBlcnJvcilcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhbmNob3IgY2xpY2sgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25BbmNob3JDbGlja2VkKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCBhcyBFbGVtZW50KS5jbG9zZXN0KCdbaHJlZl0nKTtcbiAgICAgICAgaWYgKCR0YXJnZXQuZGF0YShMaW5rRGF0YS5QUkVWRU5UX1JPVVRFUikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgY29uc3QgdXJsICAgICAgICA9ICR0YXJnZXQuYXR0cignaHJlZicpO1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gJHRhcmdldC5kYXRhKExpbmtEYXRhLlRSQU5TSVRJT04pIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbWV0aG9kICAgICA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5OQVZJQUdBVEVfTUVUSE9EKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZE9wdHMgPSAoJ3B1c2gnID09PSBtZXRob2QgfHwgJ3JlcGxhY2UnID09PSBtZXRob2QgPyB7IG1ldGhvZCB9IDoge30pIGFzIE5hdmlnYXRpb25TZXR0aW5ncztcblxuICAgICAgICBpZiAoJyMnID09PSB1cmwpIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5iYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMubmF2aWdhdGUodXJsIGFzIHN0cmluZywgeyB0cmFuc2l0aW9uLCAuLi5tZXRob2RPcHRzIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZXhlY3V0b3IoKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgW1tSb3V0ZXJdXSBvYmplY3QuXG4gKiBAamEgW1tSb3V0ZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc11dIG9iamVjdFxuICogIC0gYGphYCBbW1JvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnNdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvdXRlcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zPzogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyk6IFJvdXRlciB7XG4gICAgcmV0dXJuIG5ldyBSb3V0ZXJDb250ZXh0KHNlbGVjdG9yLCBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgc3RhcnQ6IHRydWUsXG4gICAgfSwgb3B0aW9ucykpO1xufVxuIl0sIm5hbWVzIjpbIiRzaWduYXR1cmUiLCIkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7O0FBR0c7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFPQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQVBELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsb0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxvQkFBNkMsQ0FBQTtRQUM3QyxXQUE0QyxDQUFBLFdBQUEsQ0FBQSxvQ0FBQSxDQUFB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QUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzFELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBSyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDcEQsU0FBQTtLQUNKO0FBQ0osQ0FBQTtBQUVEO0FBRUE7Ozs7Ozs7Ozs7QUFVRztBQUNhLFNBQUEsWUFBWSxDQUFDLFFBQTJDLEVBQUUsT0FBbUMsRUFBQTtJQUN6RyxPQUFPLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQzdDLFFBQUEsS0FBSyxFQUFFLElBQUk7S0FDZCxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDakI7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3JvdXRlci8ifQ==