/*!
 * @cdp/router 0.9.22
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
        this._popStateHandler = (ev) => { void this.onPopState(ev); };
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
        this.publish(event, arg1, arg2, promises); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
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
        this.publish(event, arg1, arg2, promises); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
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
        throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Construct route destination failed. [path: ${path}, detail: ${String(error)}]`, error);
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
            : ('back' !== direction ? newState : from)); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImhpc3RvcnkvaW50ZXJuYWwudHMiLCJ1dGlscy50cyIsImhpc3Rvcnkvc2Vzc2lvbi50cyIsImhpc3RvcnkvbWVtb3J5LnRzIiwicm91dGVyL2ludGVybmFsLnRzIiwicm91dGVyL2FzeW5jLXByb2Nlc3MudHMiLCJyb3V0ZXIvY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFJPVVRFUiA9IENEUF9LTk9XTl9NT0RVTEUuTVZDICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTiArIDE1LFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgTVZDX1JPVVRFUl9ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5EICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDEsICdyb3V0ZXIgZWxlbWVudCBub3QgZm91bmQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVEID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMiwgJ1JvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQgICAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAzLCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDQsICdJbnZhbGlkIHN1Yi1mbG93IGJhc2UgdXJsLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX0JVU1kgICAgICAgICAgICAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDUsICdJbiBjaGFuZ2luZyBwYWdlIHByb2Nlc3Mgbm93LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3Qgd2luZG93ID0gc2FmZShnbG9iYWxUaGlzLndpbmRvdyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkwgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBXcml0YWJsZSxcbiAgICB0eXBlIFBsYWluT2JqZWN0LFxuICAgIGF0LFxuICAgIHNvcnQsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHsgSGlzdG9yeVN0YXRlLCBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgbm9ybWFsemllIGlkIHN0cmluZyAqL1xuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZUlkID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAvLyByZW1vdmUgaGVhZCBvZiBcIiNcIiwgXCIvXCIsIFwiIy9cIiBhbmQgdGFpbCBvZiBcIi9cIlxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvXigjXFwvKXxeWyMvXXxcXHMrJC8sICcnKS5yZXBsYWNlKC9eXFxzKyR8KFxcLyQpLywgJycpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgc3RhY2sgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVEYXRhID0gPFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogSGlzdG9yeVN0YXRlPFQ+ID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7ICdAaWQnOiBub3JtYWxpemVJZChpZCkgfSwgc3RhdGUpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgdW5jYW5jZWxsYWJsZSBkZWZlcnJlZCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCA9ICh3YXJuOiBzdHJpbmcpOiBEZWZlcnJlZCA9PiB7XG4gICAgY29uc3QgdW5jYW5jZWxsYWJsZSA9IG5ldyBEZWZlcnJlZCgpIGFzIFdyaXRhYmxlPERlZmVycmVkPjtcbiAgICB1bmNhbmNlbGxhYmxlLnJlamVjdCA9ICgpID0+IHtcbiAgICAgICAgY29uc29sZS53YXJuKHdhcm4pO1xuICAgICAgICB1bmNhbmNlbGxhYmxlLnJlc29sdmUoKTtcbiAgICB9O1xuICAgIHJldHVybiB1bmNhbmNlbGxhYmxlO1xufTtcblxuLyoqIEBpbnRlcm5hbCBhc3NpZ24gc3RhdGUgZWxlbWVudCBpZiBhbHJlYWR5IGV4aXN0cyAqL1xuZXhwb3J0IGNvbnN0IGFzc2lnblN0YXRlRWxlbWVudCA9IChzdGF0ZTogSGlzdG9yeVN0YXRlLCBzdGFjazogSGlzdG9yeVN0YWNrKTogdm9pZCA9PiB7XG4gICAgY29uc3QgZWwgPSBzdGFjay5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICghc3RhdGUuZWwgJiYgZWwpICYmIChzdGF0ZS5lbCA9IGVsKTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBpbnRlcm5hbCBzdGFjayBtYW5hZ2VtZW50IGNvbW1vbiBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgSGlzdG9yeVN0YWNrPFQgPSBQbGFpbk9iamVjdD4ge1xuICAgIHByaXZhdGUgX3N0YWNrOiBIaXN0b3J5U3RhdGU8VD5bXSA9IFtdO1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5kaXN0YW5jZSgwKTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZVsnQGlkJ107XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgc2V0IGluZGV4KGlkeDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTWF0aC50cnVuYyhpZHgpO1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IGFycmF5KCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnNsaWNlKCk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIHBvc2l0aW9uIGluIHN0YWNrIGlzIGZpcnN0IG9yIG5vdCAqL1xuICAgIGdldCBpc0ZpcnN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gMCA9PT0gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIHBvc2l0aW9uIGluIHN0YWNrIGlzIGxhc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzTGFzdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4ID09PSB0aGlzLl9zdGFjay5sZW5ndGggLSAxO1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBwdWJsaWMgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiBhdCh0aGlzLl9zdGFjaywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBjbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LiAqL1xuICAgIHB1YmxpYyBjbGVhckZvcndhcmQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrID0gdGhpcy5fc3RhY2suc2xpY2UoMCwgdGhpcy5faW5kZXggKyAxKTtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC4gKi9cbiAgICBwdWJsaWMgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgaWQgPSBub3JtYWxpemVJZChpZCk7XG4gICAgICAgIGNvbnN0IHsgX2luZGV4OiBiYXNlIH0gPSB0aGlzO1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gdGhpcy5fc3RhY2tcbiAgICAgICAgICAgIC5tYXAoKHMsIGluZGV4KSA9PiB7IHJldHVybiB7IGluZGV4LCBkaXN0YW5jZTogTWF0aC5hYnMoYmFzZSAtIGluZGV4KSwgLi4ucyB9OyB9KVxuICAgICAgICAgICAgLmZpbHRlcihzID0+IHNbJ0BpZCddID09PSBpZClcbiAgICAgICAgO1xuICAgICAgICBzb3J0KGNhbmRpZGF0ZXMsIChsLCByKSA9PiAobC5kaXN0YW5jZSA+IHIuZGlzdGFuY2UgPyAxIDogLTEpLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZXNbMF0/LmluZGV4O1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IHN0YWNrIGluZm9ybWF0aW9uIGJ5IHRvIElEIGFuZCBmcm9tIElELiAqL1xuICAgIHB1YmxpYyBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIGNvbnN0IHRvSW5kZXggICA9IHRoaXMuY2xvc2VzdCh0b0lkKTtcbiAgICAgICAgY29uc3QgZnJvbUluZGV4ID0gbnVsbCA9PSBmcm9tSWQgPyB0aGlzLl9pbmRleCA6IHRoaXMuY2xvc2VzdChmcm9tSWQpO1xuICAgICAgICBpZiAobnVsbCA9PSBmcm9tSW5kZXggfHwgbnVsbCA9PSB0b0luZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb246ICdtaXNzaW5nJyB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0b0luZGV4IC0gZnJvbUluZGV4O1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gMCA9PT0gZGVsdGFcbiAgICAgICAgICAgICAgICA/ICdub25lJ1xuICAgICAgICAgICAgICAgIDogZGVsdGEgPCAwID8gJ2JhY2snIDogJ2ZvcndhcmQnO1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uLCBkZWx0YSwgaW5kZXg6IHRvSW5kZXgsIHN0YXRlOiB0aGlzLl9zdGFja1t0b0luZGV4XSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCBhY3RpdmUgZGF0YSBmcm9tIGN1cnJlbnQgaW5kZXggb3JpZ2luICovXG4gICAgcHVibGljIGRpc3RhbmNlKGRlbHRhOiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICBjb25zdCBwb3MgPSB0aGlzLl9pbmRleCArIGRlbHRhO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7dGhpcy5sZW5ndGh9LCBnaXZlbjogJHtwb3N9XWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmF0KHBvcyk7XG4gICAgfVxuXG4gICAgLyoqIG5vb3Agc3RhY2sgKi9cbiAgICBwdWJsaWMgbm9vcFN0YWNrID0gbm9vcDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbWVtYmVyLWFjY2Vzc2liaWxpdHlcblxuICAgIC8qKiBwdXNoIHN0YWNrICovXG4gICAgcHVibGljIHB1c2hTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbKyt0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiByZXBsYWNlIHN0YWNrICovXG4gICAgcHVibGljIHJlcGxhY2VTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogc2VlayBzdGFjayAqL1xuICAgIHB1YmxpYyBzZWVrU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jbG9zZXN0KGRhdGFbJ0BpZCddKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YWNrKGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBkaXNwb3NlIG9iamVjdCAqL1xuICAgIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbmRleCA9IE5hTjtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB3ZWJSb290IH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHsgVVJMIH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgbm9ybWFsaXplSWQgfSBmcm9tICcuL2hpc3RvcnkvaW50ZXJuYWwnO1xuXG4vKiogcmUtZXhwb3J0ICovXG5leHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5cbi8qKlxuICogQGVuIEdlbmVyYXRlcyBhbiBJRCB0byBiZSB1c2VkIGJ5IHRoZSBzdGFjayBpbnNpZGUgdGhlIHJvdXRlci5cbiAqIEBqYSDjg6vjg7zjgr/jg7zlhoXpg6jjga4gc3RhY2sg44GM5L2/55So44GZ44KLIElEIOOCkueUn+aIkFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgc3BlY2lmaWVzIHdoZXJlIHRoZSBwYXRoIHN0cmluZyBpcyBjcmVhdGVkIGZyb20gW2V4OiBgbG9jYXRpb24uaGFzaGAsIGBsb2NhdGlvbi5ocmVmYCwgYCNwYXRoYCwgYHBhdGhgLCBgL3BhdGhgXVxuICogIC0gYGphYCBwYXRoIOaWh+Wtl+WIl+OBruS9nOaIkOWFg+OCkuaMh+WumiBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlclN0YWNrSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChVUkwuY2FuUGFyc2Uoc3JjKSkge1xuICAgICAgICBjb25zdCB7IGhhc2ggfSA9IG5ldyBVUkwoc3JjKTtcbiAgICAgICAgcmV0dXJuIGhhc2ggPyBub3JtYWxpemVJZChoYXNoKSA6IG5vcm1hbGl6ZUlkKHNyYy5zdWJzdHJpbmcod2ViUm9vdC5sZW5ndGgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplSWQoc3JjKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIG5vcm1hbGl6ZWQgYC88aWQ+YCBzdHJpbmcgZnJvbSB0aGUgdXJsIC8gcGF0aC5cbiAqIEBqYSB1cmwgLyBwYXRoIOOCkuaMh+WumuOBl+OBpiwg5q2j6KaP5YyW44GX44GfIGAvPHN0YWNrIGlkPmAg5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzcGVjaWZpZXMgd2hlcmUgdGhlIHBhdGggc3RyaW5nIGlzIGNyZWF0ZWQgZnJvbSBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKiAgLSBgamFgIHBhdGgg5paH5a2X5YiX44Gu5L2c5oiQ5YWD44KS5oyH5a6aIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVyUGF0aCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIGAvJHt0b1JvdXRlclN0YWNrSWQoc3JjKX1gO1xufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgdHlwZSBBY2Nlc3NpYmxlLFxuICAgIHR5cGUgUGxhaW5PYmplY3QsXG4gICAgaXNPYmplY3QsXG4gICAgbm9vcCxcbiAgICAkY2RwLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBTaWxlbmNlYWJsZSwgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBEZWZlcnJlZCwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyB0b1JvdXRlclN0YWNrSWQgYXMgdG9JZCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgdHlwZSB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBIaXN0b3J5U3RhY2ssXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgYXNzaWduU3RhdGVFbGVtZW50LFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc2V0RGlzcGF0Y2hJbmZvID0gPFQ+KHN0YXRlOiBBY2Nlc3NpYmxlPFQ+LCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICAoc3RhdGVbJGNkcF0gYXMgRGlzcGF0Y2hJbmZvPFQ+KSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4pOiBbVCwgRGlzcGF0Y2hJbmZvPFQ+P10gPT4ge1xuICAgIGlmIChpc09iamVjdChzdGF0ZSkgJiYgc3RhdGVbJGNkcF0pIHtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbCA9IHN0YXRlWyRjZHBdO1xuICAgICAgICBkZWxldGUgc3RhdGVbJGNkcF07XG4gICAgICAgIHJldHVybiBbc3RhdGUsIGFkZGl0aW9uYWwgYXMgRGlzcGF0Y2hJbmZvPFQ+XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW3N0YXRlXTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnU2Vzc2lvbkhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBCcm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8SGlzdG9yeUV2ZW50PFQ+PiBpbXBsZW1lbnRzIElIaXN0b3J5PFQ+IHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF93aW5kb3c6IFdpbmRvdztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9tb2RlOiAnaGFzaCcgfCAnaGlzdG9yeSc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcG9wU3RhdGVIYW5kbGVyOiAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHZvaWQ7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG4gICAgcHJpdmF0ZSBfZGZHbz86IERlZmVycmVkO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih3aW5kb3dDb250eHQ6IFdpbmRvdywgbW9kZTogJ2hhc2gnIHwgJ2hpc3RvcnknLCBpZD86IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgICh0aGlzIGFzIGFueSlbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW5kb3dDb250eHQ7XG4gICAgICAgIHRoaXMuX21vZGUgPSBtb2RlO1xuXG4gICAgICAgIHRoaXMuX3BvcFN0YXRlSGFuZGxlciA9IChldjogUG9wU3RhdGVFdmVudCk6IHZvaWQgPT4geyB2b2lkIHRoaXMub25Qb3BTdGF0ZShldik7IH07XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCA/PyB0b0lkKHRoaXMuX3dpbmRvdy5sb2NhdGlvbi5ocmVmKSwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IHByZXZTdGF0ZSA9IHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ1Nlc3Npb25IaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiAnbm9vcCcsXG4gICAgICAgICAgICAgICAgcHJldlN0YXRlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKHRoaXMuc3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzRmlyc3Q7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0xhc3Q7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIC8vIGlmIGFscmVhZHkgY2FsbGVkLCBubyByZWFjdGlvbi5cbiAgICAgICAgaWYgKHRoaXMuX2RmR28pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgZ2l2ZW4gMCwganVzdCByZWxvYWQuXG4gICAgICAgIGlmICghZGVsdGEpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIHRoaXMuc3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fZGZHbztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJGb3J3YXJkSGlzdG9yeSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgpLmjIflrprjgZfjgabjgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFVSTCAqL1xuICAgIHByaXZhdGUgdG9VcmwoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAoJ2hhc2gnID09PSB0aGlzLl9tb2RlKSA/IGAke0NvbnN0LkhBU0hfUFJFRklYfSR7aWR9YCA6IHRvVXJsKGlkKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgZXZlbnQgJiB3YWl0IHByb2Nlc3MgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyaWdnZXJFdmVudEFuZFdhaXQoXG4gICAgICAgIGV2ZW50OiAncmVmcmVzaCcgfCAnY2hhbmdpbmcnLFxuICAgICAgICBhcmcxOiBIaXN0b3J5U3RhdGU8VD4sXG4gICAgICAgIGFyZzI6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCB8ICgocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCksXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKGV2ZW50LCBhcmcxLCBhcmcyIGFzIGFueSwgcHJvbWlzZXMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS10eXBlLWFzc2VydGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24sIGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcblxuICAgICAgICBjb25zdCBkYXRhID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZCA9IGRhdGFbJ0BpZCddO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgZGF0YVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGhpc3RvcnlbYCR7bWV0aG9kfVN0YXRlYF0oZGF0YSwgJycsIHRoaXMudG9VcmwoaWQpKTtcbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQoZGF0YSwgdGhpcy5fc3RhY2sgYXMgSGlzdG9yeVN0YWNrKTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBuZXcgRGVmZXJyZWQoY2FuY2VsKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6IG1ldGhvZCxcbiAgICAgICAgICAgICAgICBuZXh0U3RhdGU6IGRhdGEsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8oZGF0YSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGlzcGF0Y2ggYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRpc3BhdGNoQ2hhbmdlSW5mbyhuZXdTdGF0ZTogQWNjZXNzaWJsZTxUPiwgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gc2V0RGlzcGF0Y2hJbmZvKG5ld1N0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFBvcFN0YXRlRXZlbnQoJ3BvcHN0YXRlJywgeyBzdGF0ZSB9KSk7XG4gICAgICAgIGF3YWl0IGFkZGl0aW9uYWwuZGY7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgcG9wc3RhdGUgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KSA9PiBQcm9taXNlPHZvaWQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICAgICAgY29uc3Qgd2FpdFBvcFN0YXRlID0gKCk6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgKGV2OiBQb3BTdGF0ZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGV2LnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgZXhlY3V0b3Iod2FpdFBvcFN0YXRlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHJvbGxiYWNrIGhpc3RvcnkgKi9cbiAgICBwcml2YXRlIGFzeW5jIHJvbGxiYWNrSGlzdG9yeShtZXRob2Q6IHN0cmluZywgbmV3SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxuICAgICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsICcnLCB0aGlzLnRvVXJsKHRoaXMuaWQpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3B1c2gnOlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgaGlzdG9yeS5nbygtMSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0aGlzLmluZGV4IC0gdGhpcy5jbG9zZXN0KG5ld0lkKSE7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwICE9PSBkZWx0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbHRhICYmIGhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjbGVhciBmb3J3YXJkIHNlc3Npb24gaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHJpdmF0ZSBhc3luYyBjbGVhckZvcndhcmRIaXN0b3J5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc09yaWdpbiA9IChzdDogQWNjZXNzaWJsZTx1bmtub3duPik6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdD8uWydAb3JpZ2luJ10gYXMgYm9vbGVhbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gaGlzdG9yeS5zdGF0ZTtcblxuICAgICAgICAgICAgLy8gYmFjayB0byBzZXNzaW9uIG9yaWdpblxuICAgICAgICAgICAgd2hpbGUgKCFpc09yaWdpbihzdGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZW5zdXJlID0gKHNyYzogQWNjZXNzaWJsZTx1bmtub3duPik6IHVua25vd24gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN0eCA9IHsgLi4uc3JjIH07XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN0eFsncm91dGVyJ107XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN0eFsnQHBhcmFtcyddO1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gZm9yd2FyZCBmcm9tIGluZGV4IDEgdG8gY3VycmVudCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDEsIG4gPSB0aGlzLl9zdGFjay5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdCA9IHRoaXMuX3N0YWNrLmF0KGkpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkucHVzaFN0YXRlKGVuc3VyZShzdCksICcnLCB0aGlzLnRvVXJsKHN0WydAaWQnXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgcmVjZWl2ZSBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25Qb3BTdGF0ZShldjogUG9wU3RhdGVFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IFtuZXdTdGF0ZSwgYWRkaXRpb25hbF0gPSBwYXJzZURpc3BhdGNoSW5mbyhldi5zdGF0ZSk7XG4gICAgICAgIGNvbnN0IG5ld0lkICAgPSBhZGRpdGlvbmFsPy5uZXdJZCA/PyB0b0lkKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBjb25zdCBtZXRob2QgID0gYWRkaXRpb25hbD8ucG9zdHByb2MgPz8gJ3NlZWsnO1xuICAgICAgICBjb25zdCBkZiAgICAgID0gYWRkaXRpb25hbD8uZGYgPz8gdGhpcy5fZGZHbyA/PyBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgY29uc3Qgb2xkRGF0YSA9IGFkZGl0aW9uYWw/LnByZXZTdGF0ZSA/PyB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCBuZXdEYXRhID0gYWRkaXRpb25hbD8ubmV4dFN0YXRlID8/IHRoaXMuZGlyZWN0KG5ld0lkKS5zdGF0ZSA/PyBjcmVhdGVEYXRhKG5ld0lkLCBuZXdTdGF0ZSk7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIGRmLmNhdGNoKG5vb3ApO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ2NoYW5naW5nJywgbmV3RGF0YSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3RGF0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdEYXRhLCBvbGREYXRhKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBoaXN0b3J5IOOCkuWFg+OBq+aIu+OBmVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsYmFja0hpc3RvcnkobWV0aG9kLCBuZXdJZCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSBhcyBFcnJvcik7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9ucyB7XG4gICAgY29udGV4dD86IFdpbmRvdztcbiAgICBtb2RlPzogJ2hhc2gnIHwgJ2hpc3RvcnknO1xufVxuXG4vKipcbiAqIEBlbiBDcmVhdGUgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnN9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zfSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaWQ/OiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9ucyk6IElIaXN0b3J5PFQ+IHtcbiAgICBjb25zdCB7IGNvbnRleHQsIG1vZGUgfSA9IE9iamVjdC5hc3NpZ24oeyBtb2RlOiAnaGFzaCcgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBTZXNzaW9uSGlzdG9yeShjb250ZXh0ID8/IHdpbmRvdywgbW9kZSwgaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc2V0U2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIFNlc3Npb25IaXN0b3J5PFQ+KS5kaXNwb3NlKCk7XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyB0eXBlIFBsYWluT2JqZWN0LCBwb3N0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgU2lsZW5jZWFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnTWVtb3J5SGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEhpc3RvcnlFdmVudDxUPj4gaW1wbGVtZW50cyBJSGlzdG9yeTxUPiB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkOiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuXG4gICAgICAgIGNvbnN0IG9sZFN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLnN0YXRlO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnTWVtb3J5SGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZSgnbm9vcCcsIGRmLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSBkZWx0YSA/IHRoaXMuc3RhdGUgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhID8/IDApO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ3NlZWsnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXF1aXJlLWF3YWl0XG4gICAgICAgIHRoaXMuX3N0YWNrLmNsZWFyRm9yd2FyZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgYvjgonntYLngrnjga7jgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1hc3NlcnRpb25cbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgbmV3U3RhdGVbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQobmV3U3RhdGUsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKGNhbmNlbCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKG1ldGhvZCwgZGYsIG5ld1N0YXRlLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBzdGF0ZSBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNoYW5nZVN0YXRlKG1ldGhvZDogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnLCBkZjogRGVmZXJyZWQsIG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld1N0YXRlLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlIGFzIEVycm9yKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IE1lbW9yeUhpc3RvcnkoaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgbWVtb3J5IGhpc3RvcnkuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiaW1wb3J0IHsgcGF0aDJyZWdleHAgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5pbXBvcnQge1xuICAgIHR5cGUgV3JpdGFibGUsXG4gICAgdHlwZSBDbGFzcyxcbiAgICBpc1N0cmluZyxcbiAgICBpc0FycmF5LFxuICAgIGlzT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgYXNzaWduVmFsdWUsXG4gICAgc2xlZXAsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgdG9RdWVyeVN0cmluZ3MsXG4gICAgcGFyc2VVcmxRdWVyeSxcbiAgICBjb252ZXJ0VXJsUGFyYW1UeXBlLFxufSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHtcbiAgICB0eXBlIERPTSxcbiAgICB0eXBlIERPTVNlbGVjdG9yLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIHRvVXJsLFxuICAgIGxvYWRUZW1wbGF0ZVNvdXJjZSxcbiAgICB0b1RlbXBsYXRlRWxlbWVudCxcbn0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEhpc3RvcnlEaXJlY3Rpb24sXG4gICAgdHlwZSBJSGlzdG9yeSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXRoUGFyYW1zLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXMsXG4gICAgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgREVGQVVMVF9QUkVGSVggICAgICAgPSAnY2RwJyxcbiAgICBUUkFOU0lUSU9OX0RJUkVDVElPTiA9ICd0cmFuc2l0aW9uLWRpcmVjdGlvbicsXG4gICAgVFJBTlNJVElPTl9SVU5OSU5HICAgPSAndHJhbnNpdGlvbi1ydW5uaW5nJyxcbiAgICBQQUdFX0NVUlJFTlQgICAgICAgICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgICAgICAgID0gJ3BhZ2UtcHJldmlvdXMnLFxuICAgIEhJRERFTiAgICAgICAgICAgICAgID0gJ2hpZGRlbicsXG4gICAgRU5URVJfRlJPTV9DTEFTUyAgICAgPSAnZW50ZXItZnJvbScsXG4gICAgRU5URVJfQUNUSVZFX0NMQVNTICAgPSAnZW50ZXItYWN0aXZlJyxcbiAgICBFTlRFUl9UT19DTEFTUyAgICAgICA9ICdlbnRlci10bycsXG4gICAgTEVBVkVfRlJPTV9DTEFTUyAgICAgPSAnbGVhdmUtZnJvbScsXG4gICAgTEVBVkVfQUNUSVZFX0NMQVNTICAgPSAnbGVhdmUtYWN0aXZlJyxcbiAgICBMRUFWRV9UT19DTEFTUyAgICAgICA9ICdsZWF2ZS10bycsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIERvbUNhY2hlIHtcbiAgICBEQVRBX05BTUUgICAgICAgICAgID0gJ2RvbS1jYWNoZScsXG4gICAgQ0FDSEVfTEVWRUxfTUVNT1JZICA9ICdtZW1vcnknLFxuICAgIENBQ0hFX0xFVkVMX0NPTk5FQ1QgPSAnY29ubmVjdCcsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIExpbmtEYXRhIHtcbiAgICBUUkFOU0lUSU9OICAgICAgID0gJ3RyYW5zaXRpb24nLFxuICAgIE5BVklBR0FURV9NRVRIT0QgPSAnbmF2aWdhdGUtbWV0aG9kJyxcbiAgICBQUkVGRVRDSCAgICAgICAgID0gJ3ByZWZldGNoJyxcbiAgICBQUkVWRU5UX1JPVVRFUiAgID0gJ3ByZXZlbnQtcm91dGVyJyxcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ29uc3Qge1xuICAgIFdBSVRfVFJBTlNJVElPTl9NQVJHSU4gPSAxMDAsIC8vIG1zZWNcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgUGFnZUV2ZW50ID0gJ2luaXQnIHwgJ21vdW50ZWQnIHwgJ2Nsb25lZCcgfCAnYmVmb3JlLWVudGVyJyB8ICdhZnRlci1lbnRlcicgfCAnYmVmb3JlLWxlYXZlJyB8ICdhZnRlci1sZWF2ZScgfCAndW5tb3VudGVkJyB8ICdyZW1vdmVkJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZUNoYW5nZUluZm9Db250ZXh0IGV4dGVuZHMgUm91dGVDaGFuZ2VJbmZvIHtcbiAgICByZWFkb25seSBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0O1xuICAgIHNhbWVQYWdlSW5zdGFuY2U/OiBib29sZWFuO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBmbGF0IFJvdXRlUGFyYW1ldGVycyAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IE9taXQ8Um91dGVQYXJhbWV0ZXJzLCAncm91dGVzJz4gJiB7XG4gICAgLyoqIHJlZ2V4cCBmcm9tIHBhdGggKi9cbiAgICByZWdleHA6IFJlZ0V4cDtcbiAgICAvKioga2V5cyBvZiBwYXJhbXMgKi9cbiAgICBwYXJhbUtleXM6IHN0cmluZ1tdO1xuICAgIC8qKiBET00gdGVtcGxhdGUgaW5zdGFuY2Ugd2l0aCBQYWdlIGVsZW1lbnQgKi9cbiAgICAkdGVtcGxhdGU/OiBET007XG4gICAgLyoqIHJvdXRlciBwYWdlIGluc3RhbmNlIGZyb20gYGNvbXBvbmVudGAgcHJvcGVydHkgKi9cbiAgICBwYWdlPzogUGFnZTtcbiAgICAvKiogbGF0ZXN0IHJvdXRlIGNvbnRleHQgY2FjaGUgKi9cbiAgICAnQHJvdXRlJz86IFJvdXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCA9IFJvdXRlU3ViRmxvd1BhcmFtcyAmIFJlcXVpcmVkPFBhZ2VUcmFuc2l0aW9uUGFyYW1zPiAmIHtcbiAgICBvcmlnaW46IHN0cmluZztcbn07XG5cbi8qKiBAaW50ZXJuYWwgUm91dGVDb250ZXh0ICovXG5leHBvcnQgdHlwZSBSb3V0ZUNvbnRleHQgPSBXcml0YWJsZTxSb3V0ZT4gJiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zICYge1xuICAgICdAcGFyYW1zJzogUm91dGVDb250ZXh0UGFyYW1ldGVycztcbiAgICBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dDtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGJ1aWx0LWluIGNzcyAqL1xuZXhwb3J0IGNvbnN0IGFwcGx5QnVpbHRJbkNzcyA9IChjb250ZXh0OiB0eXBlb2YgZ2xvYmFsVGhpcywgcHJlZml4OiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICBjb25zdCBzdHlsZVRleHQgPSBgXG4gICAgLiR7cHJlZml4fS10cmFuc2l0aW9uLXJ1bm5pbmcge1xuICAgICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB9XG4gICAgLiR7cHJlZml4fS1oaWRkZW4ge1xuICAgICAgICB2aXNpYmlsaXR5OiBoaWRkZW47XG4gICAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIH1cbiAgICBgO1xuICAgIGNvbnN0IHNoZWV0ID0gbmV3IGNvbnRleHQuQ1NTU3R5bGVTaGVldCgpO1xuICAgIHNoZWV0LnJlcGxhY2VTeW5jKHN0eWxlVGV4dCk7XG5cbiAgICBjb25zdCB7IGRvY3VtZW50OiByb290IH0gPSBjb250ZXh0O1xuICAgIGNvbnN0IGRlZmF1bHRzID0gcm9vdC5hZG9wdGVkU3R5bGVTaGVldHM7XG4gICAgcm9vdC5hZG9wdGVkU3R5bGVTaGVldHMgPSBbLi4uZGVmYXVsdHMsIHNoZWV0XTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgdG8gUm91dGVDb250ZXh0ICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHQgPSAodXJsOiBzdHJpbmcsIHJvdXRlcjogUm91dGVyLCBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsIG5hdk9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAvLyBvbWl0IHVuY2xvbmFibGUgcHJvcHNcbiAgICBjb25zdCBmcm9tTmF2aWdhdGUgPSAhIW5hdk9wdGlvbnM7XG4gICAgY29uc3QgZW5zdXJlQ2xvbmUgPSAoY3R4OiB1bmtub3duKTogUm91dGVDb250ZXh0ID0+IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgY29uc3QgY29udGV4dCA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIHJvdXRlcjogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcm91dGVyLFxuICAgICAgICB9LFxuICAgICAgICBuYXZPcHRpb25zLFxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBmb3JjZSBvdmVycmlkZVxuICAgICAgICAgICAgcXVlcnk6IHt9LFxuICAgICAgICAgICAgcGFyYW1zOiB7fSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcy5wYXRoLFxuICAgICAgICAgICAgJ0BwYXJhbXMnOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiBwYXJhbXMsXG4gICAgICAgIH0sXG4gICAgKTtcbiAgICByZXR1cm4gZnJvbU5hdmlnYXRlID8gZW5zdXJlQ2xvbmUoY29udGV4dCkgOiBjb250ZXh0IGFzIFJvdXRlQ29udGV4dDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBjb250ZXh0IHBhcmFtcyAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IChyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdIHwgdW5kZWZpbmVkKTogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0+IHtcbiAgICBjb25zdCBmbGF0dGVuID0gKHBhcmVudFBhdGg6IHN0cmluZywgbmVzdGVkOiBSb3V0ZVBhcmFtZXRlcnNbXSk6IFJvdXRlUGFyYW1ldGVyc1tdID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmVzdGVkKSB7XG4gICAgICAgICAgICBuLnBhdGggPSBgJHtwYXJlbnRQYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7bm9ybWFsaXplSWQobi5wYXRoKX1gO1xuICAgICAgICAgICAgcmV0dmFsLnB1c2gobik7XG4gICAgICAgICAgICBpZiAobi5yb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5mbGF0dGVuKG4ucGF0aCwgbi5yb3V0ZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmxhdHRlbignJywgaXNBcnJheShyb3V0ZXMpID8gcm91dGVzIDogcm91dGVzID8gW3JvdXRlc10gOiBbXSlcbiAgICAgICAgLm1hcCgoc2VlZDogUm91dGVQYXJhbWV0ZXJzKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcmVnZXhwLCBrZXlzIH0gPSBwYXRoMnJlZ2V4cC5wYXRoVG9SZWdleHAoc2VlZC5wYXRoKTtcbiAgICAgICAgICAgICAgICAoc2VlZCBhcyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKS5yZWdleHAgPSByZWdleHA7XG4gICAgICAgICAgICAgICAgKHNlZWQgYXMgUm91dGVDb250ZXh0UGFyYW1ldGVycykucGFyYW1LZXlzID0ga2V5cy5maWx0ZXIoayA9PiBpc1N0cmluZyhrLm5hbWUpKS5tYXAoayA9PiBrLm5hbWUpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2VlZCBhcyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzO1xuICAgICAgICB9KTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHByZXBhcmUgSUhpc3Rvcnkgb2JqZWN0ICovXG5leHBvcnQgY29uc3QgcHJlcGFyZUhpc3RvcnkgPSAoc2VlZDogJ2hhc2gnIHwgJ2hpc3RvcnknIHwgJ21lbW9yeScgfCBJSGlzdG9yeSA9ICdoYXNoJywgaW5pdGlhbFBhdGg/OiBzdHJpbmcsIGNvbnRleHQ/OiBXaW5kb3cpOiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICByZXR1cm4gKGlzU3RyaW5nKHNlZWQpXG4gICAgICAgID8gJ21lbW9yeScgPT09IHNlZWQgPyBjcmVhdGVNZW1vcnlIaXN0b3J5KGluaXRpYWxQYXRoID8/ICcnKSA6IGNyZWF0ZVNlc3Npb25IaXN0b3J5KGluaXRpYWxQYXRoLCB1bmRlZmluZWQsIHsgbW9kZTogc2VlZCwgY29udGV4dCB9KVxuICAgICAgICA6IHNlZWRcbiAgICApIGFzIElIaXN0b3J5PFJvdXRlQ29udGV4dD47XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVQYXRoUGFyYW1zID0gKHBhcmFtczogUm91dGVQYXRoUGFyYW1zIHwgdW5kZWZpbmVkKTogcGF0aDJyZWdleHAuUGFyYW1EYXRhID0+IHtcbiAgICBjb25zdCBwYXRoUGFyYW1zOiBwYXRoMnJlZ2V4cC5QYXJhbURhdGEgPSB7fTtcbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHBhcmFtcykpIHtcbiAgICAgICAgICAgIHBhdGhQYXJhbXNba2V5XSA9IFN0cmluZyhwYXJhbXNba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdGhQYXJhbXM7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgYnVpbGROYXZpZ2F0ZVVybCA9IChwYXRoOiBzdHJpbmcsIG9wdGlvbnM6IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBzdHJpbmcgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHBhdGggPSBgLyR7bm9ybWFsaXplSWQocGF0aCl9YDtcbiAgICAgICAgY29uc3QgeyBxdWVyeSwgcGFyYW1zIH0gPSBvcHRpb25zO1xuICAgICAgICBsZXQgdXJsID0gcGF0aDJyZWdleHAuY29tcGlsZShwYXRoKShlbnN1cmVQYXRoUGFyYW1zKHBhcmFtcykpO1xuICAgICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MocXVlcnkpfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsXG4gICAgICAgICAgICBgQ29uc3RydWN0IHJvdXRlIGRlc3RpbmF0aW9uIGZhaWxlZC4gW3BhdGg6ICR7cGF0aH0sIGRldGFpbDogJHtTdHJpbmcoZXJyb3IpfV1gLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICk7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUGFyYW1zID0gKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkID0+IHtcbiAgICBjb25zdCB7IHVybCB9ID0gcm91dGU7XG4gICAgcm91dGUucXVlcnkgID0gdXJsLmluY2x1ZGVzKCc/JykgPyBwYXJzZVVybFF1ZXJ5KG5vcm1hbGl6ZUlkKHVybCkpIDoge307XG4gICAgcm91dGUucGFyYW1zID0ge307XG5cbiAgICBjb25zdCB7IHJlZ2V4cCwgcGFyYW1LZXlzIH0gPSByb3V0ZVsnQHBhcmFtcyddO1xuICAgIGlmIChwYXJhbUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHJlZ2V4cC5leGVjKHVybCk/Lm1hcCgodmFsdWUsIGluZGV4KSA9PiB7IHJldHVybiB7IHZhbHVlLCBrZXk6IHBhcmFtS2V5c1tpbmRleCAtIDFdIH07IH0pO1xuICAgICAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIHBhcmFtcyEpIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHBhcmFtLmtleSAmJiBudWxsICE9IHBhcmFtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUocm91dGUucGFyYW1zLCBwYXJhbS5rZXksIGNvbnZlcnRVcmxQYXJhbVR5cGUocGFyYW0udmFsdWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzI2luc3RhbmNlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlID0gYXN5bmMgKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCB7ICdAcGFyYW1zJzogcGFyYW1zIH0gPSByb3V0ZTtcblxuICAgIGlmIChwYXJhbXMucGFnZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IHsgY29tcG9uZW50LCBjb21wb25lbnRPcHRpb25zIH0gPSBwYXJhbXM7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29tcG9uZW50KSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBuZXcgKGNvbXBvbmVudCBhcyB1bmtub3duIGFzIENsYXNzKShyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBjb21wb25lbnQocm91dGUsIGNvbXBvbmVudE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChjb21wb25lbnQpKSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0gT2JqZWN0LmFzc2lnbih7ICdAcm91dGUnOiByb3V0ZSwgJ0BvcHRpb25zJzogY29tcG9uZW50T3B0aW9ucyB9LCBjb21wb25lbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0geyAnQHJvdXRlJzogcm91dGUsICdAb3B0aW9ucyc6IGNvbXBvbmVudE9wdGlvbnMgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyMkdGVtcGxhdGUgKi9cbmV4cG9ydCBjb25zdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUgPSBhc3luYyAocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKHBhcmFtcy4kdGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBhbHJlYWR5IGNyZWF0ZWRcbiAgICB9XG5cbiAgICBjb25zdCBlbnN1cmVJbnN0YW5jZSA9IChlbDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQpOiBET00gPT4ge1xuICAgICAgICByZXR1cm4gZWwgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gJChbLi4uZWwuY29udGVudC5jaGlsZHJlbl0pIGFzIERPTSA6ICQoZWwpO1xuICAgIH07XG5cbiAgICBjb25zdCB7IGNvbnRlbnQgfSA9IHBhcmFtcztcbiAgICBpZiAobnVsbCA9PSBjb250ZW50KSB7XG4gICAgICAgIC8vIG5vb3AgZWxlbWVudFxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gJDxIVE1MRWxlbWVudD4oKTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKChjb250ZW50IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnc2VsZWN0b3InXSkpIHtcbiAgICAgICAgLy8gZnJvbSBhamF4XG4gICAgICAgIGNvbnN0IHsgc2VsZWN0b3IsIHVybCB9ID0gY29udGVudCBhcyB7IHNlbGVjdG9yOiBzdHJpbmc7IHVybD86IHN0cmluZzsgfTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0b1RlbXBsYXRlRWxlbWVudChhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsOiB1cmwgJiYgdG9VcmwodXJsKSB9KSk7XG4gICAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKGB0ZW1wbGF0ZSBsb2FkIGZhaWxlZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfSwgdXJsOiAke3VybH1dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKHRlbXBsYXRlKTtcbiAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb24oY29udGVudCkpIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoYXdhaXQgY29udGVudCgpKVswXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IGVuc3VyZUluc3RhbmNlKCQoY29udGVudCBhcyBET01TZWxlY3RvcilbMF0pO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGRlY2lkZSB0cmFuc2l0aW9uIGRpcmVjdGlvbiAqL1xuZXhwb3J0IGNvbnN0IGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24gPSAoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvKTogSGlzdG9yeURpcmVjdGlvbiA9PiB7XG4gICAgaWYgKGNoYW5nZUluZm8ucmV2ZXJzZSkge1xuICAgICAgICBzd2l0Y2ggKGNoYW5nZUluZm8uZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdiYWNrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgY2FzZSAnZm9yd2FyZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdiYWNrJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZUluZm8uZGlyZWN0aW9uO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBFZmZlY3RUeXBlID0gJ2FuaW1hdGlvbicgfCAndHJhbnNpdGlvbic7XG5cbi8qKiBAaW50ZXJuYWwgcmV0cmlldmUgZWZmZWN0IGR1cmF0aW9uIHByb3BlcnR5ICovXG5jb25zdCBnZXRFZmZlY3REdXJhdGlvblNlYyA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlKTogbnVtYmVyID0+IHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKCRlbFswXSlbYCR7ZWZmZWN0fUR1cmF0aW9uYF0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCB3YWl0Rm9yRWZmZWN0ID0gKCRlbDogRE9NLCBlZmZlY3Q6IEVmZmVjdFR5cGUsIGR1cmF0aW9uU2VjOiBudW1iZXIpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiAkZWxbYCR7ZWZmZWN0fUVuZGBdKHJlc29sdmUpKSxcbiAgICAgICAgc2xlZXAoZHVyYXRpb25TZWMgKiAxMDAwICsgQ29uc3QuV0FJVF9UUkFOU0lUSU9OX01BUkdJTiksXG4gICAgXSk7XG59O1xuXG4vKiogQGludGVybmFsIHRyYW5zaXRpb24gZXhlY3V0aW9uICovXG5leHBvcnQgY29uc3QgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uID0gYXN5bmMoJGVsOiBET00sIGZyb21DbGFzczogc3RyaW5nLCBhY3RpdmVDbGFzczogc3RyaW5nLCB0b0NsYXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAkZWwucmVtb3ZlQ2xhc3MoZnJvbUNsYXNzKTtcbiAgICAkZWwuYWRkQ2xhc3ModG9DbGFzcyk7XG5cbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgWydhbmltYXRpb24nLCAndHJhbnNpdGlvbiddIGFzIEVmZmVjdFR5cGVbXSkge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IGdldEVmZmVjdER1cmF0aW9uU2VjKCRlbCwgZWZmZWN0KTtcbiAgICAgICAgZHVyYXRpb24gJiYgcHJvbWlzZXMucHVzaCh3YWl0Rm9yRWZmZWN0KCRlbCwgZWZmZWN0LCBkdXJhdGlvbikpO1xuICAgIH1cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3MoW2FjdGl2ZUNsYXNzLCB0b0NsYXNzXSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBSb3V0ZUF5bmNQcm9jZXNzIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUF5bmNQcm9jZXNzIGltcGxlbWVudGF0aW9uICovXG5leHBvcnQgY2xhc3MgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgaW1wbGVtZW50cyBSb3V0ZUF5bmNQcm9jZXNzIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBSb3V0ZUF5bmNQcm9jZXNzXG5cbiAgICByZWdpc3Rlcihwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLnB1c2gocHJvbWlzZSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWwgbWV0aG9kczpcblxuICAgIGdldCBwcm9taXNlcygpOiByZWFkb25seSBQcm9taXNlPHVua25vd24+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGNvbXBsZXRlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9wcm9taXNlcyk7XG4gICAgICAgIHRoaXMuX3Byb21pc2VzLmxlbmd0aCA9IDA7XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIEFueUZ1bmN0aW9uLFxuICAgIHR5cGUgQWNjZXNzaWJsZSxcbiAgICBpc0FycmF5LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgY2FtZWxpemUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IE5hdGl2ZVByb21pc2UgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBpc1Jlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIHR5cGUgRE9NLFxuICAgIHR5cGUgRE9NU2VsZWN0b3IsXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHRvUm91dGVyUGF0aCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIHR5cGUgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgdHlwZSBSb3V0ZXJFdmVudCxcbiAgICB0eXBlIFBhZ2UsXG4gICAgdHlwZSBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgdHlwZSBSb3V0ZSxcbiAgICB0eXBlIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICB0eXBlIE5hdmlnYXRpb25TZXR0aW5ncyxcbiAgICB0eXBlIFBhZ2VTdGFjayxcbiAgICB0eXBlIFB1c2hQYWdlU3RhY2tPcHRpb25zLFxuICAgIHR5cGUgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIHR5cGUgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICB0eXBlIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgdHlwZSBSb3V0ZXIsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBDc3NOYW1lLFxuICAgIERvbUNhY2hlLFxuICAgIExpbmtEYXRhLFxuICAgIHR5cGUgUGFnZUV2ZW50LFxuICAgIHR5cGUgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQsXG4gICAgdHlwZSBSb3V0ZUNvbnRleHQsXG4gICAgdHlwZSBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgIGFwcGx5QnVpbHRJbkNzcyxcbiAgICB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdG9Sb3V0ZUNvbnRleHQsXG4gICAgcHJlcGFyZUhpc3RvcnksXG4gICAgYnVpbGROYXZpZ2F0ZVVybCxcbiAgICBwYXJzZVVybFBhcmFtcyxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UsXG4gICAgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlLFxuICAgIGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24sXG4gICAgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uLFxufSBmcm9tICcuL2ludGVybmFsJztcbmltcG9ydCB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFJvdXRlciBpbXBsaW1lbnQgY2xhc3MuXG4gKiBAamEgUm91dGVyIOWun+ijheOCr+ODqeOCuVxuICovXG5jbGFzcyBSb3V0ZXJDb250ZXh0IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8Um91dGVyRXZlbnQ+IGltcGxlbWVudHMgUm91dGVyIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb3V0ZXM6IFJlY29yZDxzdHJpbmcsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnM+ID0ge307XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF8kZWw6IERPTTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yYWY6IEFueUZ1bmN0aW9uO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlDaGFuZ2luZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5UmVmcmVzaEhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlSZWZyZXNoO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Vycm9ySGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGFuZGxlRXJyb3I7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY3NzUHJlZml4OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdHJhbnNpdGlvblNldHRpbmdzOiBUcmFuc2l0aW9uU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBfbmF2aWdhdGlvblNldHRpbmdzOiBSZXF1aXJlZDxOYXZpZ2F0aW9uU2V0dGluZ3M+O1xuICAgIHByaXZhdGUgX2xhc3RSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9wcmV2Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfc3ViZmxvd1RyYW5zaXRpb25QYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcztcbiAgICBwcml2YXRlIF9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdzogY29udGV4dCxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxTdGFja3MsXG4gICAgICAgICAgICBjc3NQcmVmaXgsXG4gICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgbmF2aWdhdGlvbixcbiAgICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICB0aGlzLl9yYWYgPSBjb250ZXh0Py5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPz8gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuICAgICAgICB0aGlzLl8kZWwgPSAkKHNlbGVjdG9yLCBlbCk7XG4gICAgICAgIGlmICghdGhpcy5fJGVsLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5ELCBgUm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3IgYXMgc3RyaW5nfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2hpc3RvcnkgPSBwcmVwYXJlSGlzdG9yeShoaXN0b3J5LCBpbml0aWFsUGF0aCwgY29udGV4dCEpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyID0gdGhpcy5vbkhpc3RvcnlDaGFuZ2luZy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIgID0gdGhpcy5vbkhpc3RvcnlSZWZyZXNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2Vycm9ySGFuZGxlciAgICAgICAgICAgPSB0aGlzLm9uSGFuZGxlRXJyb3IuYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcblxuICAgICAgICAvLyBmb2xsb3cgYW5jaG9yXG4gICAgICAgIHRoaXMuXyRlbC5vbignY2xpY2snLCAnW2hyZWZdJywgdGhpcy5vbkFuY2hvckNsaWNrZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fY3NzUHJlZml4ID0gY3NzUHJlZml4ID8/IENzc05hbWUuREVGQVVMVF9QUkVGSVg7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBkZWZhdWx0OiAnbm9uZScsIHJlbG9hZDogJ25vbmUnIH0sIHRyYW5zaXRpb24pO1xuICAgICAgICB0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbWV0aG9kOiAncHVzaCcgfSwgbmF2aWdhdGlvbik7XG5cbiAgICAgICAgLy8gYnVpbHQtaW4gY3NzXG4gICAgICAgIGFwcGx5QnVpbHRJbkNzcygoY29udGV4dCA/PyB3aW5kb3cpIGFzIHVua25vd24gYXMgdHlwZW9mIGdsb2JhbFRoaXMsIHRoaXMuX2Nzc1ByZWZpeCk7XG5cbiAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWdpc3Rlcihyb3V0ZXMhLCBmYWxzZSk7XG4gICAgICAgICAgICBpZiAoYWRkaXRpb25hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW9uYWxTdGFja3MsIHsgbm9OYXZpZ2F0ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXJ0ICYmIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9KSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuQmFjaztcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5Gb3J3YXJkO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICBhc3luYyByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3QgcHJlZmV0Y2hQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKHJvdXRlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tjb250ZXh0LnBhdGhdID0gY29udGV4dDtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGVudCwgcHJlZmV0Y2ggfSA9IGNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZW50ICYmIHByZWZldGNoICYmIHByZWZldGNoUGFyYW1zLnB1c2goY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcmVmZXRjaFBhcmFtcy5sZW5ndGggJiYgYXdhaXQgdGhpcy5zZXRQcmVmZXRjaENvbnRlbnRzKHByZWZldGNoUGFyYW1zKTtcbiAgICAgICAgcmVmcmVzaCAmJiBhd2FpdCB0aGlzLnJlZnJlc2goKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogTmF2aWdhdGUgdG8gbmV3IHBhZ2UuICovXG4gICAgYXN5bmMgbmF2aWdhdGUodG86IHN0cmluZywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXModG8pO1xuICAgICAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgYFJvdXRlIG5vdCBmb3VuZC4gW3RvOiAke3RvfV1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3B0cyAgID0gT2JqZWN0LmFzc2lnbih7IGludGVudDogdW5kZWZpbmVkIH0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgdXJsICAgID0gYnVpbGROYXZpZ2F0ZVVybCh0bywgb3B0cyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSAgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHNlZWQsIG9wdHMpO1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gb3B0cy5tZXRob2QgPz8gdGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLm1ldGhvZDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBleGVjIG5hdmlnYXRlXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeVttZXRob2RdKHVybCwgcm91dGUpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQWRkIHBhZ2Ugc3RhY2sgc3RhcnRpbmcgZnJvbSB0aGUgY3VycmVudCBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIHB1c2hQYWdlU3RhY2soc3RhY2s6IFBhZ2VTdGFjayB8IFBhZ2VTdGFja1tdLCBvcHRpb25zPzogUHVzaFBhZ2VTdGFja09wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgbm9OYXZpZ2F0ZSwgdHJhdmVyc2VUbyB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrcyA9IGlzQXJyYXkoc3RhY2spID8gc3RhY2sgOiBbc3RhY2tdO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gc3RhY2tzLmZpbHRlcihzID0+ICEhcy5yb3V0ZSkubWFwKHMgPT4gcy5yb3V0ZSEpO1xuXG4gICAgICAgICAgICAvLyBlbnNydWUgUm91dGVcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVnaXN0ZXIocm91dGVzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIHB1c2ggaGlzdG9yeVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBzdGFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoOiB1cmwsIHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHBhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSB0b1JvdXRlclBhdGgodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFtwYXRoOiAke3VybH1dYCwgcGFnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gc2lsZW50IHJlZ2lzdHJ5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gdG9Sb3V0ZUNvbnRleHQocGF0aCwgdGhpcywgcGFyYW1zLCB7IGludGVudDogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS50cmFuc2l0aW9uID0gdHJhbnNpdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUucmV2ZXJzZSAgICA9IHJldmVyc2U7XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5faGlzdG9yeS5wdXNoKHBhdGgsIHJvdXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRyYXZlcnNlVG8pIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKHRvUm91dGVyUGF0aCh0cmF2ZXJzZVRvKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghbm9OYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHBhdGggc3RyaW5nLiAqL1xuICAgIGFzeW5jIHRyYXZlcnNlVG8oc3JjOiBzdHJpbmcpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKHRvUm91dGVyUGF0aChzcmMpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEJlZ2luIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGJlZ2luU3ViRmxvdyh0bzogc3RyaW5nLCBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0ISxcbiAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbjogdGhpcy5jdXJyZW50Um91dGUudXJsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3ViZmxvdyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVTdWJGbG93UGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgICAodGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0KS5zdWJmbG93ID0gcGFyYW1zO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5uYXZpZ2F0ZSh0bywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ29tbWl0IHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNvbW1pdFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgY29uc3QgeyBhZGRpdGlvbmFsRGlzdGFuY2UsIGFkZGl0aW9uYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW9uYWxTdGFja3M/Lmxlbmd0aCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZSgoKSA9PiB0aGlzLmdvKC0xICogZGlzdGFuY2UpKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucHVzaFBhZ2VTdGFjayhhZGRpdGlvbmFsU3RhY2tzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ2FuY2VsIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNhbmNlbFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5nbygtMSAqIHN1YmZsb3cuZGlzdGFuY2UpO1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmNsZWFyRm9yd2FyZCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIHRyYW5zaXRpb24gc2V0dG5pZ3MuICovXG4gICAgdHJhbnNpdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogVHJhbnNpdGlvblNldHRpbmdzKTogVHJhbnNpdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFNldCBjb21tb24gbmF2aWdhdGlvbiBzZXR0bmlncy4gKi9cbiAgICBuYXZpZ2F0aW9uU2V0dGluZ3MobmV3U2V0dGluZ3M/OiBOYXZpZ2F0aW9uU2V0dGluZ3MpOiBOYXZpZ2F0aW9uU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4udGhpcy5fbmF2aWdhdGlvblNldHRpbmdzIH07XG4gICAgICAgIG5ld1NldHRpbmdzICYmIE9iamVjdC5hc3NpZ24odGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLCBuZXdTZXR0aW5ncyk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogUmVmcmVzaCByb3V0ZXIgKHNwZWNpZnkgdXBkYXRlIGxldmVsKS4gKi9cbiAgICBhc3luYyByZWZyZXNoKGxldmVsID0gUm91dGVyUmVmcmVzaExldmVsLlJFTE9BRCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIGNhc2UgUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUjoge1xuICAgICAgICAgICAgICAgIHRoaXMucmVsZWFzZUNhY2hlQ29udGVudHModW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVuc3VwcG9ydGVkIGxldmVsOiAke2xldmVsfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiBzdWItZmxvd1xuXG4gICAgLyoqIEBpbnRlcm5hbCBldmFsdWF0ZSBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBldmFsdWF0ZVN1YkZsb3dQYXJhbXMoc3ViZmxvdzogUm91dGVTdWJGbG93UGFyYW1zKTogdm9pZCB7XG4gICAgICAgIGxldCBhZGRpdGlvbmFsRGlzdGFuY2UgPSAwO1xuXG4gICAgICAgIGlmIChzdWJmbG93LmJhc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKHN1YmZsb3cuYmFzZSk7XG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IHsgaW5kZXgsIHN0YWNrIH0gPSB0aGlzLl9oaXN0b3J5O1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGktLSwgYWRkaXRpb25hbERpc3RhbmNlKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2tbaV1bJ0BpZCddID09PSBiYXNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCwgYEludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuIFt1cmw6ICR7c3ViZmxvdy5iYXNlfV1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1YmZsb3cuYmFzZSA9IHRoaXMuY3VycmVudFJvdXRlLnVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24oc3ViZmxvdywgeyBhZGRpdGlvbmFsRGlzdGFuY2UgfSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGZpbmRTdWJGbG93UGFyYW1zKGRldGFjaDogYm9vbGVhbik6IHsgZGlzdGFuY2U6IG51bWJlcjsgcGFyYW1zOiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ICYgeyBhZGRpdGlvbmFsRGlzdGFuY2U6IG51bWJlcjsgfTsgfSB8IHZvaWQge1xuICAgICAgICBjb25zdCBzdGFjayA9IHRoaXMuX2hpc3Rvcnkuc3RhY2s7XG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFjay5sZW5ndGggLSAxLCBkaXN0YW5jZSA9IDA7IGkgPj0gMDsgaS0tLCBkaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICBpZiAoc3RhY2tbaV0uc3ViZmxvdykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN0YWNrW2ldLnN1YmZsb3cgYXMgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgZGV0YWNoICYmIGRlbGV0ZSBzdGFja1tpXS5zdWJmbG93O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRpc3RhbmNlLCBwYXJhbXMgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiB1dGlsc1xuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gYFJvdXRlckV2ZW50QXJnYCBtYWtlciAqL1xuICAgIHByaXZhdGUgbWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQge1xuICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXdTdGF0ZS5pbnRlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdTdGF0ZS5pbnRlbnQ7IC8vIG5hdmlnYXRlIOaZguOBq+aMh+WumuOBleOCjOOBnyBpbnRlbnQg44GvIG9uZSB0aW1lIOOBruOBv+acieWKueOBq+OBmeOCi1xuXG4gICAgICAgIGNvbnN0IGZyb20gPSAob2xkU3RhdGUgPz8gdGhpcy5fbGFzdFJvdXRlKSBhcyBBY2Nlc3NpYmxlPFJvdXRlQ29udGV4dCwgc3RyaW5nPiB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gdGhpcy5faGlzdG9yeS5kaXJlY3QobmV3U3RhdGVbJ0BpZCddLCBmcm9tPy5bJ0BpZCddKS5kaXJlY3Rpb247XG4gICAgICAgIGNvbnN0IGFzeW5jUHJvY2VzcyA9IG5ldyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCgpO1xuICAgICAgICBjb25zdCByZWxvYWQgPSBmcm9tID8gbmV3U3RhdGUudXJsID09PSBmcm9tLnVybCA6IHRydWU7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9XG4gICAgICAgICAgICA9IHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID8/IChyZWxvYWRcbiAgICAgICAgICAgICAgICA/IHsgdHJhbnNpdGlvbjogdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLnJlbG9hZCwgcmV2ZXJzZTogZmFsc2UgfVxuICAgICAgICAgICAgICAgIDogKCdiYWNrJyAhPT0gZGlyZWN0aW9uID8gbmV3U3RhdGUgOiBmcm9tIGFzIFJvdXRlQ29udGV4dCkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS10eXBlLWFzc2VydGlvblxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICAgICAgICBmcm9tLFxuICAgICAgICAgICAgdG86IG5ld1N0YXRlLFxuICAgICAgICAgICAgZGlyZWN0aW9uLFxuICAgICAgICAgICAgYXN5bmNQcm9jZXNzLFxuICAgICAgICAgICAgcmVsb2FkLFxuICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICBpbnRlbnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHJvdXRlIGJ5IHVybCAqL1xuICAgIHByaXZhdGUgZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZChwYXRoLnNwbGl0KCc/JylbMF0pfWA7XG4gICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCB7IHJlZ2V4cCB9ID0gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgaWYgKHJlZ2V4cC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIHBhZ2UgZXZlbnQgKi9cbiAgICBwcml2YXRlIHRyaWdnZXJQYWdlQ2FsbGJhY2soZXZlbnQ6IFBhZ2VFdmVudCwgdGFyZ2V0OiBQYWdlIHwgdW5kZWZpbmVkLCBhcmc6IFJvdXRlIHwgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCk6IHZvaWQge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBjYW1lbGl6ZShgcGFnZS0ke2V2ZW50fWApO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbigodGFyZ2V0IGFzIEFjY2Vzc2libGU8UGFnZSwgQW55RnVuY3Rpb24+IHwgdW5kZWZpbmVkKT8uW21ldGhvZF0pKSB7XG4gICAgICAgICAgICBjb25zdCByZXR2YWwgPSAodGFyZ2V0IGFzIEFjY2Vzc2libGU8UGFnZSwgQW55RnVuY3Rpb24+KVttZXRob2RdKGFyZyk7XG4gICAgICAgICAgICBpZiAocmV0dmFsIGluc3RhbmNlb2YgTmF0aXZlUHJvbWlzZSAmJiAoYXJnIGFzIEFjY2Vzc2libGU8Um91dGU+KVsnYXN5bmNQcm9jZXNzJ10pIHtcbiAgICAgICAgICAgICAgICAoYXJnIGFzIFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpLmFzeW5jUHJvY2Vzcy5yZWdpc3RlcihyZXR2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB3YWl0IGZyYW1lICovXG4gICAgcHJpdmF0ZSB3YWl0RnJhbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB3YWl0RnJhbWUoMSwgdGhpcy5fcmFmKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZW50cmFuY2VcblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHBhZ2UgbWFpbiBwcm9jZWR1cmUgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZVBhZ2UobmV4dFJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgcHJldlJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSB0cnVlO1xuXG4gICAgICAgICAgICBwYXJzZVVybFBhcmFtcyhuZXh0Um91dGUpO1xuXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRSb3V0ZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsXG4gICAgICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvKTtcblxuICAgICAgICAgICAgLy8gdHJhbnNpdGlvbiBjb3JlXG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gYXdhaXQgdGhpcy50cmFuc2l0aW9uUGFnZShwYWdlTmV4dCwgJGVsTmV4dCwgcGFnZVByZXYsICRlbFByZXYsIGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZUNvbnRleHQoJGVsTmV4dCwgJGVsUHJldiwgY2hhbmdlSW5mbywgdHJhbnNpdGlvbik7XG5cbiAgICAgICAgICAgIC8vIOmBt+enu+WFiOOBjCBzdWJmbG93IOmWi+Wni+eCueOBp+OBguOCi+WgtOWQiCwgc3ViZmxvdyDop6PpmaRcbiAgICAgICAgICAgIGlmIChuZXh0Um91dGUudXJsID09PSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKGZhbHNlKT8ucGFyYW1zLm9yaWdpbikge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHJlZmV0Y2ggY29udGVudCDjga7jgrHjgqJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJlYXRQcmVmZXRjaENvbnRlbnRzKCk7XG5cbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faW5DaGFuZ2luZ1BhZ2UgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBwcmVwYXJlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0KTogUHJvbWlzZTxbUGFnZSwgRE9NLCBQYWdlLCBET01dPiB7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IGNoYW5nZUluZm8udG8gYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIGNvbnN0IHByZXZSb3V0ZSA9IGNoYW5nZUluZm8uZnJvbSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogbmV4dFBhcmFtcyB9ID0gbmV4dFJvdXRlO1xuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcHJldlBhcmFtcyB9ID0gcHJldlJvdXRlID8/IHt9O1xuXG4gICAgICAgIC8vIHBhZ2UgaW5zdGFuY2VcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKG5leHRSb3V0ZSk7XG4gICAgICAgIC8vIHBhZ2UgJHRlbXBsYXRlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShuZXh0UGFyYW1zKTtcblxuICAgICAgICBjaGFuZ2VJbmZvLnNhbWVQYWdlSW5zdGFuY2UgPSBwcmV2UGFyYW1zPy5wYWdlICYmIHByZXZQYXJhbXMucGFnZSA9PT0gbmV4dFBhcmFtcy5wYWdlO1xuICAgICAgICBjb25zdCB7IHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuXG4gICAgICAgIC8vIHBhZ2UgJGVsXG4gICAgICAgIGlmICghcmVsb2FkICYmIHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xvbmVDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgcHJldlJvdXRlISwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmICghbmV4dFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KG5leHRSb3V0ZSwgbmV4dFBhcmFtcywgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRlbE5leHQgPSAkKG5leHRSb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2VOZXh0ID0gbmV4dFBhcmFtcy5wYWdlITtcblxuICAgICAgICAvLyBtb3VudFxuICAgICAgICBpZiAoISRlbE5leHQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubW91bnRDb250ZW50KCRlbE5leHQsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0XG4gICAgICAgICAgICAocmVsb2FkICYmIHt9IHx8IChwcmV2UGFyYW1zPy5wYWdlID8/IHt9KSksIChyZWxvYWQgJiYgJChudWxsKSB8fCAkKHByZXZSb3V0ZT8uZWwpKSwgLy8gcHJldlxuICAgICAgICBdO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsb25lQ29udGVudChcbiAgICAgICAgbmV4dFJvdXRlOiBSb3V0ZUNvbnRleHQsIG5leHRQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgICAgIHByZXZSb3V0ZTogUm91dGVDb250ZXh0LFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICBhc3luY1Byb2Nlc3M6IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBuZXh0Um91dGUuZWwgPSBwcmV2Um91dGUuZWw7XG4gICAgICAgIHByZXZSb3V0ZS5lbCA9IG5leHRSb3V0ZS5lbD8uY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAkKHByZXZSb3V0ZS5lbCkucmVtb3ZlQXR0cignaWQnKS5pbnNlcnRCZWZvcmUobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgJChuZXh0Um91dGUuZWwpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuSElEREVOfWApXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWBdKVxuICAgICAgICA7XG4gICAgICAgIHRoaXMucHVibGlzaCgnY2xvbmVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnY2xvbmVkJywgbmV4dFBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgbG9hZENvbnRlbnQoXG4gICAgICAgIHJvdXRlOiBSb3V0ZUNvbnRleHQsIHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgbGV0IGZpcmVFdmVudHMgPSB0cnVlO1xuXG4gICAgICAgIGlmICghcm91dGUuZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsQ2FjaGUgPSB0aGlzLl9yb3V0ZXNbcm91dGUucGF0aF1bJ0Byb3V0ZSddPy5lbDtcbiAgICAgICAgICAgIGZpcmVFdmVudHMgPSAhZWxDYWNoZTtcbiAgICAgICAgICAgIGlmIChlbENhY2hlKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG9tLWNhY2hlIGNhc2VcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IGVsQ2FjaGU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcmFtcy4kdGVtcGxhdGU/LmlzQ29ubmVjdGVkKSB7IC8vIHByZWZldGNoIGNhc2VcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCAgICAgICAgID0gcGFyYW1zLiR0ZW1wbGF0ZVswXTtcbiAgICAgICAgICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gcGFyYW1zLiR0ZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IHBhcmFtcy4kdGVtcGxhdGUhLmNsb25lKClbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGUgbWFzdGVyIGNhY2hlXG4gICAgICAgIGlmIChyb3V0ZSAhPT0gdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSkge1xuICAgICAgICAgICAgdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXSA9IHJvdXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpcmVFdmVudHMpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbG9hZGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnaW5pdCcsIHBhcmFtcy5wYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgbW91bnRDb250ZW50KFxuICAgICAgICAkZWw6IERPTSwgcGFnZTogUGFnZSB8IHVuZGVmaW5lZCxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgJGVsLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLkhJRERFTn1gKTtcbiAgICAgICAgdGhpcy5fJGVsLmFwcGVuZCgkZWwpO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ21vdW50ZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdtb3VudGVkJywgcGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVubW91bnRDb250ZW50KHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgJGVsID0gJChyb3V0ZS5lbCk7XG4gICAgICAgIGNvbnN0IHBhZ2UgPSByb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgIGlmICgkZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcm91dGUpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCByb3V0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJvdXRlLmVsKSB7XG4gICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHJvdXRlKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBjb3JlXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gY2hhbmdlSW5mby50cmFuc2l0aW9uID8/IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0O1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICdlbnRlci1mcm9tLWNsYXNzJzogY3VzdG9tRW50ZXJGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItYWN0aXZlLWNsYXNzJzogY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdlbnRlci10by1jbGFzcyc6IGN1c3RvbUVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1mcm9tLWNsYXNzJzogY3VzdG9tTGVhdmVGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtYWN0aXZlLWNsYXNzJzogY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS10by1jbGFzcyc6IGN1c3RvbUxlYXZlVG9DbGFzcyxcbiAgICAgICAgfSA9IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncztcblxuICAgICAgICAvLyBlbnRlci1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgZW50ZXJGcm9tQ2xhc3MgICA9IGN1c3RvbUVudGVyRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJBY3RpdmVDbGFzcyA9IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlclRvQ2xhc3MgICAgID0gY3VzdG9tRW50ZXJUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfVE9fQ0xBU1N9YDtcblxuICAgICAgICAvLyBsZWF2ZS1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgbGVhdmVGcm9tQ2xhc3MgICA9IGN1c3RvbUxlYXZlRnJvbUNsYXNzICAgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVBY3RpdmVDbGFzcyA9IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MgPz8gYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZVRvQ2xhc3MgICAgID0gY3VzdG9tTGVhdmVUb0NsYXNzICAgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfVE9fQ0xBU1N9YDtcblxuICAgICAgICBhd2FpdCB0aGlzLmJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAvLyB0cmFuc2lzaW9uIGV4ZWN1dGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsIGVudGVyVG9DbGFzcyksXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGxlYXZlVG9DbGFzcyksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy5lbmRUcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsXG4gICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIHRyYW5zaXRpb247XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIHByb2MgOiBiZWdpbiAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLCBlbnRlckZyb21DbGFzczogc3RyaW5nLCBlbnRlckFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIHBhZ2VQcmV2OiBQYWdlLCAkZWxQcmV2OiBET00sIGxlYXZlRnJvbUNsYXNzOiBzdHJpbmcsIGxlYXZlQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5fJGVsLmFkZENsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICAkZWxOZXh0XG4gICAgICAgICAgICAuYWRkQ2xhc3MoW2VudGVyRnJvbUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuSElEREVOfWApXG4gICAgICAgICAgICAucmVmbG93KClcbiAgICAgICAgICAgIC5hZGRDbGFzcyhlbnRlckFjdGl2ZUNsYXNzKVxuICAgICAgICA7XG4gICAgICAgICRlbFByZXYuYWRkQ2xhc3MoW2xlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogZW5kICovXG4gICAgcHJpdmF0ZSBhc3luYyBlbmRUcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAoJGVsTmV4dFswXSAhPT0gJGVsUHJldlswXSkgJiYgJGVsUHJldi5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5ISURERU59YCk7XG4gICAgICAgICRlbE5leHQucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG4gICAgICAgICRlbFByZXYucmVtb3ZlQ2xhc3MoW2Ake3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSk7XG5cbiAgICAgICAgdGhpcy5fJGVsLnJlbW92ZUNsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcblxuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2FmdGVyLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2FmdGVyLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb24gZmluYWxpemVcblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlIHBhZ2Ugc3RhdHVzIGFmdGVyIHRyYW5zaXRpb24gKi9cbiAgICBwcml2YXRlIHVwZGF0ZUNoYW5nZUNvbnRleHQoXG4gICAgICAgICRlbE5leHQ6IERPTSxcbiAgICAgICAgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICAgICB0cmFuc2l0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZnJvbSwgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBkaXJlY3Rpb24sIHRvIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICBjb25zdCBwcmV2Um91dGUgPSBmcm9tIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gdG8gYXMgUm91dGVDb250ZXh0O1xuICAgICAgICBjb25zdCB1cmxDaGFuZ2VkID0gIXJlbG9hZDtcblxuXG4gICAgICAgIGlmICgkZWxOZXh0WzBdICE9PSAkZWxQcmV2WzBdKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgY2xhc3NcbiAgICAgICAgICAgICRlbFByZXZcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YClcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApO1xuXG4gICAgICAgICAgICBpZiAodXJsQ2hhbmdlZCAmJiB0aGlzLl9wcmV2Um91dGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWw/LmNsYXNzTGlzdC5yZW1vdmUoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGUsIHRoaXMuX3ByZXZSb3V0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXJsQ2hhbmdlZCkge1xuICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlID0gcHJldlJvdXRlO1xuICAgICAgICAgICAgaWYgKHNhbWVQYWdlSW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICAkZWxQcmV2LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9QUkVWSU9VU31gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xhc3RSb3V0ZSA9IHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgJ2ZvcndhcmQnID09PSBkaXJlY3Rpb24gJiYgdHJhbnNpdGlvbiAmJiAodGhpcy5fbGFzdFJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHByZWZldGNoICYgZG9tIGNhY2hlXG5cbiAgICAvKiogQGludGVybmFsIHVuc2V0IGRvbSBjYWNoZWQgY29udGVudHMgKi9cbiAgICBwcml2YXRlIHJlbGVhc2VDYWNoZUNvbnRlbnRzKGVsOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRoaXMuX3JvdXRlc1trZXldWydAcm91dGUnXSBhcyBSb3V0ZUNvbnRleHQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAocm91dGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBlbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVubW91bnRDb250ZW50KHJvdXRlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJvdXRlLmVsID09PSBlbCkge1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRoaXMuX2hpc3Rvcnkuc3RhY2spIHtcbiAgICAgICAgICAgIGlmICgobnVsbCA9PSBlbCAmJiByb3V0ZS5lbCkgfHwgcm91dGUuZWwgPT09IGVsKSB7XG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGVzdHJ1Y3Rpb24gb2YgZG9tIGFjY29yZGluZyB0byBjb25kaXRpb24gKi9cbiAgICBwcml2YXRlIHRyZWF0RG9tQ2FjaGVDb250ZW50cyhuZXh0Um91dGU6IFJvdXRlQ29udGV4dCwgcHJldlJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkIHtcbiAgICAgICAgaWYgKHByZXZSb3V0ZS5lbCAmJiBwcmV2Um91dGUuZWwgIT09IHRoaXMuY3VycmVudFJvdXRlLmVsKSB7XG4gICAgICAgICAgICBjb25zdCAkZWwgPSAkKHByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICBjb25zdCBjYWNoZUx2ID0gJGVsLmRhdGEoRG9tQ2FjaGUuREFUQV9OQU1FKTtcbiAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9DT05ORUNUICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZSA9IHByZXZSb3V0ZVsnQHBhcmFtcyddLnBhZ2U7XG4gICAgICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcmVFdmVudHMgPSBwcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlICE9PSBuZXh0Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCd1bm1vdW50ZWQnLCBwYWdlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfTUVNT1JZICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVsZWFzZUNhY2hlQ29udGVudHMocHJldlJvdXRlLmVsKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubG9hZGVkJywgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygncmVtb3ZlZCcsIHBhZ2UsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNldCBkb20gcHJlZmV0Y2hlZCBjb250ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJlZmV0Y2hDb250ZW50cyhwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0b1JvdXRlID0gKHBhcmFtOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBlbDogSFRNTEVsZW1lbnQpOiBSb3V0ZUNvbnRleHQgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdG9Sb3V0ZUNvbnRleHQocGFyYW0ucHJlZmV0Y2ghLCB0aGlzLCBwYXJhbSk7XG4gICAgICAgICAgICBjdHguZWwgPSBlbDtcbiAgICAgICAgICAgIHJldHVybiBjdHg7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdG9Sb3V0ZUNoYW5nZUluZm8gPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICAgICAgICAgICAgdG86IHJvdXRlLFxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogJ25vbmUnLFxuICAgICAgICAgICAgICAgIGFzeW5jUHJvY2VzczogbmV3IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0KCksXG4gICAgICAgICAgICAgICAgcmVsb2FkOiBmYWxzZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGVsUm91dGUgPSBwYXJhbVsnQHJvdXRlJ10/LmVsO1xuICAgICAgICAgICAgaWYgKCFlbFJvdXRlIHx8ICh0aGlzLmN1cnJlbnRSb3V0ZS5lbCAhPT0gZWxSb3V0ZSAmJiB0aGlzLl9sYXN0Um91dGU/LmVsICE9PSBlbFJvdXRlICYmIHRoaXMuX3ByZXZSb3V0ZT8uZWwgIT09IGVsUm91dGUpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlKHBhcmFtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbCA9IHBhcmFtLiR0ZW1wbGF0ZSFbMF07XG4gICAgICAgICAgICAgICAgaWYgKCFlbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGUocGFyYW0sIGVsKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRvUm91dGVDaGFuZ2VJbmZvKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBhc3luY1Byb2Nlc3MgfSA9IGNoYW5nZUluZm87XG4gICAgICAgICAgICAgICAgICAgIC8vIGxvYWQgJiBpbml0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZENvbnRlbnQocm91dGUsIHBhcmFtLCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICAgICAgICAgICAgICAvLyBtb3VudFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLm1vdW50Q29udGVudCgkKGVsKSwgcGFyYW0ucGFnZSwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGxvYWQgcHJlZmV0Y2ggZG9tIGNvbnRlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmVhdFByZWZldGNoQ29udGVudHMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIC8vIOmBt+enu+WFiOOBi+OCiSBwcmVmZXRjaCBjb250ZW50IOOCkuaknOWHulxuICAgICAgICBjb25zdCBwcmVmZXRjaFBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0gW107XG4gICAgICAgIGNvbnN0IHRhcmdldHMgPSB0aGlzLmN1cnJlbnRSb3V0ZS5lbD8ucXVlcnlTZWxlY3RvckFsbChgW2RhdGEtJHtMaW5rRGF0YS5QUkVGRVRDSH1dYCkgPz8gW107XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgdGFyZ2V0cykge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChlbCk7XG4gICAgICAgICAgICBpZiAoZmFsc2UgIT09ICRlbC5kYXRhKExpbmtEYXRhLlBSRUZFVENIKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9ICRlbC5hdHRyKCdocmVmJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHVybCEpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnByZWZldGNoID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICBwcmVmZXRjaFBhcmFtcy5wdXNoKHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJlZmV0Y2hDb250ZW50cyhwcmVmZXRjaFBhcmFtcyk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgY2hhbmdpbmdgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeUNoYW5naW5nKG5leHRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIGNhbmNlbDogKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQsIHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10pOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2luQ2hhbmdpbmdQYWdlKSB7XG4gICAgICAgICAgICBjYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0JVU1kpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRTdGF0ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCd3aWxsLWNoYW5nZScsIGNoYW5nZUluZm8sIGNhbmNlbCk7XG4gICAgICAgIHByb21pc2VzLnB1c2goLi4uY2hhbmdlSW5mby5hc3luY1Byb2Nlc3MucHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGByZWZyZXNoYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlSZWZyZXNoKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuc3VyZSA9IChzdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4pOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXRoICA9IGAvJHtzdGF0ZVsnQGlkJ119YDtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFtwYXRoOiAke3BhdGh9XWAsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsID09IHN0YXRlWydAcGFyYW1zJ10pIHtcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXIg44KSIGFzc2lnblxuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc3RhdGUsIHRvUm91dGVDb250ZXh0KHBhdGgsIHRoaXMsIHBhcmFtcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWQg44Gr57SQ44Gl44GP6KaB57Sg44GM44GZ44Gn44Gr5a2Y5Zyo44GZ44KL5aC05ZCI44Gv5Ymy44KK5b2T44GmXG4gICAgICAgICAgICBzdGF0ZS5lbCA/Pz0gdGhpcy5faGlzdG9yeS5kaXJlY3Qoc3RhdGVbJ0BpZCddKT8uc3RhdGU/LmVsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBzY2hlZHVsaW5nIGByZWZyZXNoYCBkb25lLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmNoYW5nZVBhZ2UoZW5zdXJlKG5ld1N0YXRlKSwgb2xkU3RhdGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5vbkhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBlcnJvciBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhhbmRsZUVycm9yKGVycm9yOiB1bmtub3duKTogdm9pZCB7XG4gICAgICAgIHRoaXMucHVibGlzaChcbiAgICAgICAgICAgICdlcnJvcicsXG4gICAgICAgICAgICBpc1Jlc3VsdChlcnJvcikgPyBlcnJvciA6IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJywgZXJyb3IpXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYW5jaG9yIGNsaWNrIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uQW5jaG9yQ2xpY2tlZChldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQgYXMgRWxlbWVudCkuY2xvc2VzdCgnW2hyZWZdJyk7XG4gICAgICAgIGlmICgkdGFyZ2V0LmRhdGEoTGlua0RhdGEuUFJFVkVOVF9ST1VURVIpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGNvbnN0IHVybCAgICAgICAgPSAkdGFyZ2V0LmF0dHIoJ2hyZWYnKTtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9ICR0YXJnZXQuZGF0YShMaW5rRGF0YS5UUkFOU0lUSU9OKSBhcyBzdHJpbmc7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgICAgPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuTkFWSUFHQVRFX01FVEhPRCkgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtZXRob2RPcHRzID0gKCdwdXNoJyA9PT0gbWV0aG9kIHx8ICdyZXBsYWNlJyA9PT0gbWV0aG9kID8geyBtZXRob2QgfSA6IHt9KSBhcyBOYXZpZ2F0aW9uU2V0dGluZ3M7XG5cbiAgICAgICAgaWYgKCcjJyA9PT0gdXJsKSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMuYmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdm9pZCB0aGlzLm5hdmlnYXRlKHVybCEsIHsgdHJhbnNpdGlvbiwgLi4ubWV0aG9kT3B0cyB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIHtAbGluayBSb3V0ZXJ9IG9iamVjdC5cbiAqIEBqYSB7QGxpbmsgUm91dGVyfSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgQW4gb2JqZWN0IG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2Yge0BsaW5rIERPTX0uXG4gKiAgLSBgamFgIHtAbGluayBET019IOOBruOCguOBqOOBq+OBquOCi+OCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAge0BsaW5rIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnN9IG9iamVjdFxuICogIC0gYGphYCB7QGxpbmsgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb3V0ZXIoc2VsZWN0b3I6IERPTVNlbGVjdG9yPHN0cmluZyB8IEhUTUxFbGVtZW50Piwgb3B0aW9ucz86IFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMpOiBSb3V0ZXIge1xuICAgIHJldHVybiBuZXcgUm91dGVyQ29udGV4dChzZWxlY3RvciwgT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIHN0YXJ0OiB0cnVlLFxuICAgIH0sIG9wdGlvbnMpKTtcbn1cbiJdLCJuYW1lcyI6WyIkc2lnbmF0dXJlIiwidG9JZCIsIiQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7QUFHRztBQUVILENBQUEsWUFBcUI7QUFNakI7OztBQUdHO0FBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtBQUFBLElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsb0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxvQkFBNkM7UUFDN0MsV0FBQSxDQUFBLFdBQUEsQ0FBQSxvQ0FBQSxDQUFBLEdBQTRDLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBQSxHQUFBLDZCQUF1QixFQUFBLGdDQUF5QixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSxHQUFBLG9DQUFBO1FBQzdJLFdBQUEsQ0FBQSxXQUFBLENBQUEsMkNBQUEsQ0FBQSxHQUE0QyxXQUFBLENBQUEsa0JBQWtCLENBQUEsR0FBQSw2QkFBdUIsRUFBQSxnQ0FBeUIsQ0FBQyxFQUFFLDJCQUEyQixDQUFDLENBQUEsR0FBQSwyQ0FBQTtRQUM3SSxXQUFBLENBQUEsV0FBQSxDQUFBLGtDQUFBLENBQUEsR0FBNEMsV0FBQSxDQUFBLGtCQUFrQixDQUFBLEdBQUEsNkJBQXVCLEVBQUEsZ0NBQXlCLENBQUMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBLEdB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Q3hCOztBQUdRLElBQUEsZUFBZSxDQUFDLEtBQWlCLEVBQUE7QUFDckMsUUFBQSxNQUFNLE9BQU8sR0FBR0EsR0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFpQixDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUM1RCxRQUFBLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQSxnQkFBQSwrQkFBeUIsRUFBRTtZQUN2QztRQUNKO1FBRUEsS0FBSyxDQUFDLGNBQWMsRUFBRTtRQUV0QixNQUFNLEdBQUcsR0FBVSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUN2QyxRQUFBLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLHdDQUErQjtBQUM5RCxRQUFBLE1BQU0sTUFBTSxHQUFPLE9BQU8sQ0FBQyxJQUFJLG1EQUFxQztRQUNwRSxNQUFNLFVBQVUsSUFBSSxNQUFNLEtBQUssTUFBTSxJQUFJLFNBQVMsS0FBSyxNQUFNLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQXVCO0FBRXRHLFFBQUEsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFO0FBQ2IsWUFBQSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDcEI7YUFBTztBQUNILFlBQUEsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLFVBQVUsRUFBRSxDQUFDO1FBQzNEO0lBQ0o7O0lBR1EsTUFBTSwwQkFBMEIsQ0FBQyxRQUFnQyxFQUFBO0FBQ3JFLFFBQUEsSUFBSTtZQUNBLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUM7WUFDM0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztZQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUNqRCxPQUFPLE1BQU0sUUFBUSxFQUFFO1FBQzNCO2dCQUFVO1lBQ04sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDO1lBQ3pELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBSyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQ3BEO0lBQ0o7QUFDSDtBQUVEO0FBRUE7Ozs7Ozs7Ozs7QUFVRztBQUNHLFNBQVUsWUFBWSxDQUFDLFFBQTJDLEVBQUUsT0FBbUMsRUFBQTtJQUN6RyxPQUFPLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQzdDLFFBQUEsS0FBSyxFQUFFLElBQUk7S0FDZCxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2hCOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9yb3V0ZXIvIn0=