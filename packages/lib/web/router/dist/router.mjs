/*!
 * @cdp/router 0.9.13
 *   generic router scheme
 */

import { path2regexp } from '@cdp/extension-path2regexp';
export * from '@cdp/extension-path2regexp';
import { safe, at, sort, noop, $cdp, isObject, post, isString, isArray, assignValue, isFunction, sleep, camelize } from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { Deferred, CancelToken } from '@cdp/promise';
import { toUrl, webRoot, toTemplateElement, loadTemplateSource, waitFrame } from '@cdp/web-utils';
import { makeResult, RESULT_CODE, isResult } from '@cdp/result';
import { dom } from '@cdp/dom';
import { toQueryStrings, parseUrlQuery, convertUrlParamType } from '@cdp/ajax';

/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
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
            return { direction, index: toIndex, state: this._stack[toIndex] };
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

//__________________________________________________________________________________________________//
/** @internal remove url path section */
const toHash = (url) => {
    const id = /#.*$/.exec(url)?.[0];
    return id ? normalizeId(id) : url;
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
        void this.replace(id, state, { silent: true });
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
        this.clearForward();
        await this.backToSesssionOrigin();
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
            await this.triggerRefresh(this.state, undefined);
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
    /** @internal convert to ID */
    toId(src) {
        return 'hash' === this._mode ? toHash(src) : toPath(src);
    }
    /** @internal convert to URL */
    toUrl(id) {
        return id ? (('hash' === this._mode) ? `${"#/" /* Const.HASH_PREFIX */}${id}` : toUrl(id)) : '';
    }
    /** @internal trigger event `refresh` */
    async triggerRefresh(newState, oldState) {
        const promises = [];
        this.publish('refresh', newState, oldState, promises);
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
    /** @internal follow the session history until `origin` (in silent) */
    async backToSesssionOrigin() {
        await this.suppressEventListenerScope(async (wait) => {
            const isOrigin = (st) => {
                return st && st['@origin'];
            };
            const { history } = this._window;
            let state = history.state;
            while (!isOrigin(state)) {
                const promise = wait();
                history.back();
                state = await promise;
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
            this.publish('changing', newData, cancel);
            if (token.requested) {
                throw token.reason;
            }
            this._stack[`${method}Stack`](newData);
            await this.triggerRefresh(newData, oldData);
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
    /** @internal update */
    async updateState(method, id, state, options) {
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
            this.publish('changing', newState, cancel);
            if (token.requested) {
                throw token.reason;
            }
            const promises = [];
            this._stack[`${method}Stack`](newState);
            this.publish('refresh', newState, oldState, promises);
            await Promise.all(promises);
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
        ? 'memory' === seed ? createMemoryHistory(initialPath || '') : createSessionHistory(initialPath || '', undefined, { mode: seed, context })
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
            if (null != param.key) {
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
    const { component } = params;
    if (isFunction(component)) {
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            params.page = await new component(route);
        }
        catch {
            params.page = await component(route);
        }
    }
    else if (isObject(component)) {
        params.page = Object.assign({ '@route': route }, component);
    }
    else {
        params.page = { '@route': route };
    }
    return true; // newly created
};
/** @internal ensure RouteContextParameters#$template */
const ensureRouterPageTemplate = async (params) => {
    if (params.$template) {
        return false; // already created
    }
    const { content } = params;
    if (null == content) {
        // noop element
        params.$template = dom();
    }
    else if (isString(content['selector'])) {
        // from ajax
        const { selector, url } = content;
        const template = toTemplateElement(await loadTemplateSource(selector, { url }));
        if (!template) {
            throw Error(`template load failed. [selector: ${selector}, url: ${url}]`);
        }
        params.$template = dom([...template.content.children]);
    }
    else {
        params.$template = dom(content);
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
/** @internal check animation property */
const getAnimationSec = ($el) => {
    try {
        return parseFloat(getComputedStyle($el[0]).animationDuration);
    }
    catch {
        return 0;
    }
};
/** @internal check transition property */
const getTransitionSec = ($el) => {
    try {
        return parseFloat(getComputedStyle($el[0]).transitionDuration);
    }
    catch {
        return 0;
    }
};
/** @internal */
const waitForEffect = ($el, method, durationSec) => {
    return Promise.race([
        new Promise(resolve => $el[method](resolve)),
        sleep(durationSec * 1000 + 100 /* Const.WAIT_TRANSITION_MARGIN */),
    ]);
};
/** @internal transition execution */
const processPageTransition = async ($el, fromClass, activeClass, toClass) => {
    $el.removeClass(fromClass);
    $el.addClass(toClass);
    /* eslint-disable no-cond-assign */
    let duration;
    if (duration = getAnimationSec($el)) {
        await waitForEffect($el, 'animationEnd', duration);
    }
    else if (duration = getTransitionSec($el)) {
        await waitForEffect($el, 'transitionEnd', duration);
    }
    /* eslint-enable no-cond-assign */
    $el.removeClass(activeClass);
};

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
    _lastRoute;
    _prevRoute;
    _tempTransitionParams;
    /**
     * constructor
     */
    constructor(selector, options) {
        super();
        const { routes, start, el, window: context, history, initialPath, cssPrefix, transition, } = options;
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
        this._transitionSettings = Object.assign({ default: 'none' }, transition);
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
            const seed = this.findRouteContextParameter(to);
            if (!seed) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
            }
            const opts = Object.assign({ intent: undefined }, options);
            const url = buildNavigateUrl(to, opts);
            const route = toRouteContext(url, this, seed, opts);
            try {
                // exec navigate
                await this._history.push(url, route);
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
                    const params = this.findRouteContextParameter(url);
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
    /** Begin sub-flow transaction. */
    async beginSubFlow(to, subflow, options) {
        try {
            const params = Object.assign({}, subflow || {});
            this.evaluationSubFlowParams(params);
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
        // `reverse`: 履歴上は `back` 方向になるため, I/F 指定方向と反転するように調整
        this._tempTransitionParams = Object.assign({}, params, { reverse: !params?.reverse });
        const { additionalDistance, additinalStacks } = subflow.params;
        const distance = subflow.distance + additionalDistance;
        if (additinalStacks?.length) {
            await this.suppressEventListenerScope(() => this.go(-1 * distance));
            await this.pushPageStack(additinalStacks);
        }
        else {
            await this.go(-1 * distance);
        }
        this._history.clearForward();
        return this;
    }
    /** Cancel sub-flow transaction. */
    async cancelSubFlow(params) {
        const subflow = this.findSubFlowParams(true);
        if (!subflow) {
            return this;
        }
        // `reverse`: 履歴上は `back` 方向になるため, I/F 指定方向と反転するように調整. default: true
        this._tempTransitionParams = Object.assign({}, params, { reverse: !Object.assign({ reverse: true }, params).reverse });
        await this.go(-1 * subflow.distance);
        this._history.clearForward();
        return this;
    }
    /** Set common transition settnigs. */
    setTransitionSettings(newSettings) {
        const oldSettings = this._transitionSettings;
        this._transitionSettings = { ...newSettings };
        return oldSettings;
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods: sub-flow
    /** @internal evaluation sub-flow parameters */
    evaluationSubFlowParams(subflow) {
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
        const from = oldState || this._lastRoute;
        const direction = this._history.direct(newState['@id'], from?.['@id']).direction;
        const { transition, reverse } = this._tempTransitionParams || ('back' !== direction ? newState : from);
        this._tempTransitionParams = undefined;
        return {
            router: this,
            from,
            to: newState,
            direction,
            transition,
            reverse,
            intent,
        };
    }
    /** @internal find route by url */
    findRouteContextParameter(url) {
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
        isFunction(target?.[method]) && target?.[method](arg);
    }
    /** @internal wait frame */
    waitFrame() {
        return waitFrame(1, this._raf);
    }
    /** @internal change page main procedure */
    async changePage(nextRoute, prevRoute) {
        parseUrlParams(nextRoute);
        const changeInfo = this.makeRouteChangeInfo(nextRoute, prevRoute);
        const [pageNext, $elNext, pagePrev, $elPrev,] = await this.prepareChangeContext(changeInfo);
        // transition core
        await this.transitionPage(pageNext, $elNext, pagePrev, $elPrev, changeInfo);
        this.updateChangeContext($elNext, $elPrev, changeInfo.from);
        this.publish('changed', changeInfo);
    }
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    /** @internal */
    async prepareChangeContext(changeInfo) {
        const nextRoute = changeInfo.to;
        const prevRoute = changeInfo.from;
        const { '@params': params } = nextRoute;
        // page instance
        await ensureRouterPageInstance(nextRoute);
        // page $template
        await ensureRouterPageTemplate(params);
        // page $el
        if (!nextRoute.el) {
            nextRoute.el = params.$template.clone()[0];
            this.publish('loaded', changeInfo);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            this.triggerPageCallback('init', nextRoute['@params'].page, changeInfo);
        }
        const $elNext = dom(nextRoute.el);
        const pageNext = nextRoute['@params'].page;
        // mount
        if (!$elNext.isConnected) {
            $elNext.attr('aria-hidden', true);
            this._$el.append($elNext);
            this.publish('mounted', changeInfo);
            this.triggerPageCallback('mounted', pageNext, changeInfo);
        }
        return [
            pageNext, $elNext,
            prevRoute?.['@params']?.page || {}, dom(prevRoute?.el), // prev
        ];
    }
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
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
        this.beginTransition(pageNext, $elNext, enterFromClass, enterActiveClass, pagePrev, $elPrev, leaveFromClass, leaveActiveClass, changeInfo);
        await this.waitFrame();
        // transision execution
        await Promise.all([
            processPageTransition($elNext, enterFromClass, enterActiveClass, enterToClass),
            processPageTransition($elPrev, leaveFromClass, leaveActiveClass, leaveToClass),
        ]);
        await this.waitFrame();
        this.endTransition(pageNext, $elNext, enterToClass, pagePrev, $elPrev, leaveToClass, changeInfo);
    }
    /** @internal transition proc : begin */
    beginTransition(pageNext, $elNext, enterFromClass, enterActiveClass, pagePrev, $elPrev, leaveFromClass, leaveActiveClass, changeInfo) {
        this._$el.addClass([
            `${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`,
            `${this._cssPrefix}-${"transition-direction" /* CssName.TRANSITION_DIRECTION */}-${decideTransitionDirection(changeInfo)}`,
        ]);
        $elNext.removeAttr('aria-hidden');
        $elNext.addClass([enterFromClass, enterActiveClass]);
        $elPrev.addClass([leaveFromClass, leaveActiveClass]);
        this.publish('before-transition', changeInfo);
        this.triggerPageCallback('before-enter', pageNext, changeInfo);
        this.triggerPageCallback('before-leave', pagePrev, changeInfo);
    }
    /** @internal transition proc : end */
    endTransition(pageNext, $elNext, enterToClass, pagePrev, $elPrev, leaveToClass, changeInfo) {
        $elNext.removeClass(enterToClass);
        $elPrev.removeClass(leaveToClass);
        $elPrev.attr('aria-hidden', true);
        this._$el.removeClass([
            `${this._cssPrefix}-${"transition-running" /* CssName.TRANSITION_RUNNING */}`,
            `${this._cssPrefix}-${"transition-direction" /* CssName.TRANSITION_DIRECTION */}-${changeInfo.direction}`,
        ]);
        this.publish('after-transition', changeInfo);
        this.triggerPageCallback('after-enter', pageNext, changeInfo);
        this.triggerPageCallback('after-leave', pagePrev, changeInfo);
    }
    /** @internal update page status after transition */
    updateChangeContext($elNext, $elPrev, prevRoute) {
        // update class
        $elPrev.removeClass(`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`);
        $elNext.addClass(`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`);
        $elPrev.addClass(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
        if (this._prevRoute) {
            const $el = dom(this._prevRoute.el);
            $el.removeClass(`${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`);
            const cacheLv = $el.data("dom-cache" /* DomCache.DATA_NAME */);
            if ("connect" /* DomCache.CACHE_LEVEL_CONNECT */ !== cacheLv) {
                $el.detach();
                const page = this._prevRoute['@params'].page;
                this.publish('unmounted', this._prevRoute);
                this.triggerPageCallback('unmounted', page, this._prevRoute);
                if ("memory" /* DomCache.CACHE_LEVEL_MEMORY */ !== cacheLv) {
                    this._prevRoute.el = null; // eslint-disable-line @typescript-eslint/no-non-null-assertion
                    this.publish('unloaded', this._prevRoute);
                    this.triggerPageCallback('removed', page, this._prevRoute);
                }
            }
        }
        this._lastRoute = this.currentRoute;
        this._prevRoute = prevRoute;
    }
    ///////////////////////////////////////////////////////////////////////
    // event handlers:
    /** @internal `history` `changing` handler */
    onHistoryChanging(nextState, cancel) {
        let handled = false;
        const callback = (reason) => {
            handled = true;
            cancel(reason);
        };
        this.publish('will-change', this.makeRouteChangeInfo(nextState, undefined), callback);
        return handled;
    }
    /** @internal `history` `refresh` handler */
    onHistoryRefresh(newState, oldState, promises) {
        const ensure = (state) => {
            const url = `/${state['@id']}`;
            const params = this.findRouteContextParameter(url);
            if (null == params) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, state);
            }
            if (null == state['@params']) {
                // RouteContextParameter を assign
                Object.assign(state, toRouteContext(url, this, params));
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
        if ('#' === url) {
            void this.back();
        }
        else {
            void this.navigate(url, { transition });
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
 *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
 *  - `ja` [[DOM]] のもとになるインスタンス(群)またはセレクタ文字列
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImhpc3RvcnkvaW50ZXJuYWwudHMiLCJoaXN0b3J5L3Nlc3Npb24udHMiLCJoaXN0b3J5L21lbW9yeS50cyIsInJvdXRlci9pbnRlcm5hbC50cyIsInJvdXRlci9jb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgUk9VVEVSID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMTUsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfUk9VVEVSX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMSwgJ3JvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAyLCAnUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDMsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfSU5WQUxJRF9TVUJGTE9XX0JBU0VfVVJMID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgNCwgJ0ludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbiIsImltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgYXQsXG4gICAgc29ydCxcbiAgICBub29wLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgSGlzdG9yeVN0YXRlLCBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgbm9ybWFsemllIGlkIHN0cmluZyAqL1xuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZUlkID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAvLyByZW1vdmUgaGVhZCBvZiBcIiNcIiwgXCIvXCIsIFwiIy9cIiBhbmQgdGFpbCBvZiBcIi9cIlxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvXigjXFwvKXxeWyMvXXxcXHMrJC8sICcnKS5yZXBsYWNlKC9eXFxzKyR8KFxcLyQpLywgJycpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgc3RhY2sgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVEYXRhID0gPFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogSGlzdG9yeVN0YXRlPFQ+ID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7ICdAaWQnOiBub3JtYWxpemVJZChpZCkgfSwgc3RhdGUpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgdW5jYW5jZWxsYWJsZSBkZWZlcnJlZCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCA9ICh3YXJuOiBzdHJpbmcpOiBEZWZlcnJlZCA9PiB7XG4gICAgY29uc3QgdW5jYW5jZWxsYWJsZSA9IG5ldyBEZWZlcnJlZCgpIGFzIFdyaXRhYmxlPERlZmVycmVkPjtcbiAgICB1bmNhbmNlbGxhYmxlLnJlamVjdCA9ICgpID0+IHtcbiAgICAgICAgY29uc29sZS53YXJuKHdhcm4pO1xuICAgICAgICB1bmNhbmNlbGxhYmxlLnJlc29sdmUoKTtcbiAgICB9O1xuICAgIHJldHVybiB1bmNhbmNlbGxhYmxlO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsIHN0YWNrIG1hbmFnZW1lbnQgY29tbW9uIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhY2s8VCA9IFBsYWluT2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RhbmNlKDApO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlWydAaWQnXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBNYXRoLnRydW5jKGlkeCk7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgYXJyYXkoKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc2xpY2UoKTtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5fc3RhY2ssIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogY2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwdWJsaWMgY2xlYXJGb3J3YXJkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjayA9IHRoaXMuX3N0YWNrLnNsaWNlKDAsIHRoaXMuX2luZGV4ICsgMSk7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuICovXG4gICAgcHVibGljIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICAgICAgICBjb25zdCB7IF9pbmRleDogYmFzZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMuX3N0YWNrXG4gICAgICAgICAgICAubWFwKChzLCBpbmRleCkgPT4geyByZXR1cm4geyBpbmRleCwgZGlzdGFuY2U6IE1hdGguYWJzKGJhc2UgLSBpbmRleCksIC4uLnMgfTsgfSlcbiAgICAgICAgICAgIC5maWx0ZXIocyA9PiBzWydAaWQnXSA9PT0gaWQpXG4gICAgICAgIDtcbiAgICAgICAgc29ydChjYW5kaWRhdGVzLCAobCwgcikgPT4gKGwuZGlzdGFuY2UgPiByLmRpc3RhbmNlID8gMSA6IC0xKSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGVzWzBdPy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBzdGFjayBpbmZvcm1hdGlvbiBieSB0byBJRCBhbmQgZnJvbSBJRC4gKi9cbiAgICBwdWJsaWMgZGlyZWN0KHRvSWQ6IHN0cmluZywgZnJvbUlkPzogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICBjb25zdCB0b0luZGV4ICAgPSB0aGlzLmNsb3Nlc3QodG9JZCk7XG4gICAgICAgIGNvbnN0IGZyb21JbmRleCA9IG51bGwgPT0gZnJvbUlkID8gdGhpcy5faW5kZXggOiB0aGlzLmNsb3Nlc3QoZnJvbUlkKTtcbiAgICAgICAgaWYgKG51bGwgPT0gZnJvbUluZGV4IHx8IG51bGwgPT0gdG9JbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uOiAnbWlzc2luZycgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdG9JbmRleCAtIGZyb21JbmRleDtcbiAgICAgICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IDAgPT09IGRlbHRhXG4gICAgICAgICAgICAgICAgPyAnbm9uZSdcbiAgICAgICAgICAgICAgICA6IGRlbHRhIDwgMCA/ICdiYWNrJyA6ICdmb3J3YXJkJztcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbiwgaW5kZXg6IHRvSW5kZXgsIHN0YXRlOiB0aGlzLl9zdGFja1t0b0luZGV4XSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCBhY3RpdmUgZGF0YSBmcm9tIGN1cnJlbnQgaW5kZXggb3JpZ2luICovXG4gICAgcHVibGljIGRpc3RhbmNlKGRlbHRhOiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICBjb25zdCBwb3MgPSB0aGlzLl9pbmRleCArIGRlbHRhO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7dGhpcy5sZW5ndGh9LCBnaXZlbjogJHtwb3N9XWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmF0KHBvcyk7XG4gICAgfVxuXG4gICAgLyoqIG5vb3Agc3RhY2sgKi9cbiAgICBwdWJsaWMgbm9vcFN0YWNrID0gbm9vcDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbWVtYmVyLWFjY2Vzc2liaWxpdHlcblxuICAgIC8qKiBwdXNoIHN0YWNrICovXG4gICAgcHVibGljIHB1c2hTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbKyt0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiByZXBsYWNlIHN0YWNrICovXG4gICAgcHVibGljIHJlcGxhY2VTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogc2VlayBzdGFjayAqL1xuICAgIHB1YmxpYyBzZWVrU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jbG9zZXN0KGRhdGFbJ0BpZCddKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YWNrKGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBkaXNwb3NlIG9iamVjdCAqL1xuICAgIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbmRleCA9IE5hTjtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzT2JqZWN0LFxuICAgIG5vb3AsXG4gICAgJGNkcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCwgd2ViUm9vdCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgbm9ybWFsaXplSWQsXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgSGlzdG9yeVN0YWNrLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuY29uc3QgZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCByZW1vdmUgdXJsIHBhdGggc2VjdGlvbiAqL1xuY29uc3QgdG9IYXNoID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBpZCA9IC8jLiokLy5leGVjKHVybCk/LlswXTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiB1cmw7XG59O1xuXG4vKiogQGludGVybmFsIHJlbW92ZSB1cmwgcGF0aCBzZWN0aW9uICovXG5jb25zdCB0b1BhdGggPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IGlkID0gdXJsLnN1YnN0cmluZyh3ZWJSb290Lmxlbmd0aCk7XG4gICAgcmV0dXJuIGlkID8gbm9ybWFsaXplSWQoaWQpIDogdXJsO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc2V0RGlzcGF0Y2hJbmZvID0gPFQ+KHN0YXRlOiBULCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICBzdGF0ZVskY2RwXSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IFQpOiBbVCwgRGlzcGF0Y2hJbmZvPFQ+P10gPT4ge1xuICAgIGlmIChpc09iamVjdChzdGF0ZSkgJiYgc3RhdGVbJGNkcF0pIHtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbCA9IHN0YXRlWyRjZHBdO1xuICAgICAgICBkZWxldGUgc3RhdGVbJGNkcF07XG4gICAgICAgIHJldHVybiBbc3RhdGUsIGFkZGl0aW9uYWxdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RhdGVdO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcbiAgICBwcml2YXRlIF9kZkdvPzogRGVmZXJyZWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBtb2RlOiAnaGFzaCcgfCAnaGlzdG9yeScsIGlkOiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fd2luZG93ID0gd2luZG93Q29udHh0O1xuICAgICAgICB0aGlzLl9tb2RlID0gbW9kZTtcblxuICAgICAgICB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIgPSB0aGlzLm9uUG9wU3RhdGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcblxuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHZvaWQgdGhpcy5yZXBsYWNlKGlkLCBzdGF0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zdGFjay5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzWyRzaWduYXR1cmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTih0aGlzLmluZGV4KSB8fCB0aGlzLl9zdGFjay5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBzaWxlbnQgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgcHJldlN0YXRlID0gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5iYWNrVG9TZXNzc2lvbk9yaWdpbigpO1xuXG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkKCdTZXNzaW9uSGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpLFxuICAgICAgICAgICAgICAgIG5ld0lkOiB0aGlzLnRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdGhpcy50b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6ICdub29wJyxcbiAgICAgICAgICAgICAgICBwcmV2U3RhdGUsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8odGhpcy5zdGF0ZSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICAvLyBpZiBhbHJlYWR5IGNhbGxlZCwgbm8gcmVhY3Rpb24uXG4gICAgICAgIGlmICh0aGlzLl9kZkdvKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICBpZiAoIWRlbHRhKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJSZWZyZXNoKHRoaXMuc3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fZGZHbztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gZGVzdGluYXRpb24gc3RhY2sgaW5mb3JtYXRpb24gYnkgYHN0YXJ0YCBhbmQgYGVuZGAgSUQuXG4gICAgICogQGphIOi1t+eCuSwg57WC54K544GuIElEIOOBi+OCiee1gueCueOBruOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdCh0b0lkLCBmcm9tSWQgYXMgc3RyaW5nKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIElEICovXG4gICAgcHJpdmF0ZSB0b0lkKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdoYXNoJyA9PT0gdGhpcy5fbW9kZSA/IHRvSGFzaChzcmMpIDogdG9QYXRoKHNyYyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFVSTCAqL1xuICAgIHByaXZhdGUgdG9VcmwoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBpZCA/ICgoJ2hhc2gnID09PSB0aGlzLl9tb2RlKSA/IGAke0NvbnN0LkhBU0hfUFJFRklYfSR7aWR9YCA6IHRvVXJsKGlkKSkgOiAnJztcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgZXZlbnQgYHJlZnJlc2hgICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyUmVmcmVzaChuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdyZWZyZXNoJywgbmV3U3RhdGUsIG9sZFN0YXRlLCBwcm9taXNlcyk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiwgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSBjcmVhdGVEYXRhKGlkLCBzdGF0ZSk7XG4gICAgICAgIGlkID0gZGF0YVsnQGlkJ107XG4gICAgICAgIGlmICgncmVwbGFjZScgPT09IG1ldGhvZCAmJiAwID09PSB0aGlzLmluZGV4KSB7XG4gICAgICAgICAgICBkYXRhWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcbiAgICAgICAgaGlzdG9yeVtgJHttZXRob2R9U3RhdGVgXShkYXRhLCAnJywgdGhpcy50b1VybChpZCkpO1xuICAgICAgICBjb25zdCBuZXdVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4gPSB7XG4gICAgICAgICAgICAgICAgZGY6IG5ldyBEZWZlcnJlZChjYW5jZWwpLFxuICAgICAgICAgICAgICAgIG5ld0lkOiB0aGlzLnRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdGhpcy50b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6IG1ldGhvZCxcbiAgICAgICAgICAgICAgICBuZXh0U3RhdGU6IGRhdGEsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8oZGF0YSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGlzcGF0Y2ggYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRpc3BhdGNoQ2hhbmdlSW5mbyhuZXdTdGF0ZTogVCwgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gc2V0RGlzcGF0Y2hJbmZvKG5ld1N0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFBvcFN0YXRlRXZlbnQoJ3BvcHN0YXRlJywgeyBzdGF0ZSB9KSk7XG4gICAgICAgIGF3YWl0IGFkZGl0aW9uYWwuZGY7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgcG9wc3RhdGUgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KSA9PiBQcm9taXNlPHZvaWQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICAgICAgY29uc3Qgd2FpdFBvcFN0YXRlID0gKCk6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgKGV2OiBQb3BTdGF0ZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGV2LnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgZXhlY3V0b3Iod2FpdFBvcFN0YXRlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHJvbGxiYWNrIGhpc3RvcnkgKi9cbiAgICBwcml2YXRlIGFzeW5jIHJvbGxiYWNrSGlzdG9yeShtZXRob2Q6IHN0cmluZywgbmV3SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxuICAgICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsICcnLCB0aGlzLnRvVXJsKHRoaXMuaWQpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3B1c2gnOlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgaGlzdG9yeS5nbygtMSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0aGlzLmluZGV4IC0gKHRoaXMuY2xvc2VzdChuZXdJZCkgYXMgbnVtYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgIT09IGRlbHRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGEgJiYgaGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGZvbGxvdyB0aGUgc2Vzc2lvbiBoaXN0b3J5IHVudGlsIGBvcmlnaW5gIChpbiBzaWxlbnQpICovXG4gICAgcHJpdmF0ZSBhc3luYyBiYWNrVG9TZXNzc2lvbk9yaWdpbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNPcmlnaW4gPSAoc3Q6IHVua25vd24pOiBib29sZWFuID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3QgJiYgKHN0IGFzIG9iamVjdClbJ0BvcmlnaW4nXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gaGlzdG9yeS5zdGF0ZTtcbiAgICAgICAgICAgIHdoaWxlICghaXNPcmlnaW4oc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCByZWNlaXZlIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBvblBvcFN0YXRlKGV2OiBQb3BTdGF0ZUV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgW25ld1N0YXRlLCBhZGRpdGlvbmFsXSA9IHBhcnNlRGlzcGF0Y2hJbmZvKGV2LnN0YXRlKTtcbiAgICAgICAgY29uc3QgbmV3SWQgICA9IGFkZGl0aW9uYWw/Lm5ld0lkIHx8IHRoaXMudG9JZChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgY29uc3QgbWV0aG9kICA9IGFkZGl0aW9uYWw/LnBvc3Rwcm9jIHx8ICdzZWVrJztcbiAgICAgICAgY29uc3QgZGYgICAgICA9IGFkZGl0aW9uYWw/LmRmIHx8IHRoaXMuX2RmR28gfHwgbmV3IERlZmVycmVkKCk7XG4gICAgICAgIGNvbnN0IG9sZERhdGEgPSBhZGRpdGlvbmFsPy5wcmV2U3RhdGUgfHwgdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IGFkZGl0aW9uYWw/Lm5leHRTdGF0ZSB8fCB0aGlzLmRpcmVjdChuZXdJZCkuc3RhdGUgfHwgY3JlYXRlRGF0YShuZXdJZCwgbmV3U3RhdGUpO1xuICAgICAgICBjb25zdCB7IGNhbmNlbCwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBmb3IgZmFpbCBzYWZlXG4gICAgICAgICAgICBkZi5jYXRjaChub29wKTtcblxuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjaGFuZ2luZycsIG5ld0RhdGEsIGNhbmNlbCk7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0b2tlbi5yZWFzb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld0RhdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyUmVmcmVzaChuZXdEYXRhLCBvbGREYXRhKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBoaXN0b3J5IOOCkuWFg+OBq+aIu+OBmVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsYmFja0hpc3RvcnkobWV0aG9kLCBuZXdJZCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBbW2NyZWF0ZVNlc3Npb25IaXN0b3J5XV0oKSBvcHRpb25zLlxuICogQGphIFtbY3JlYXRlU2Vzc2lvbkhpc3RvcnldXSgpIOOBq+a4oeOBmeOCquODl+OCt+ODp+ODs1xuICogXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zIHtcbiAgICBjb250ZXh0PzogV2luZG93O1xuICAgIG1vZGU/OiAnaGFzaCcgfCAnaGlzdG9yeSc7XG59XG5cbi8qKlxuICogQGVuIENyZWF0ZSBicm93c2VyIHNlc3Npb24gaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnNdXSBvYmplY3RcbiAqICAtIGBqYWAgW1tTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnNdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zKTogSUhpc3Rvcnk8VD4ge1xuICAgIGNvbnN0IHsgY29udGV4dCwgbW9kZSB9ID0gT2JqZWN0LmFzc2lnbih7IG1vZGU6ICdoYXNoJyB9LCBvcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFNlc3Npb25IaXN0b3J5KGNvbnRleHQgfHwgd2luZG93LCBtb2RlLCBpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBicm93c2VyIHNlc3Npb24gaGlzdG9yeS5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsImltcG9ydCB7IFBsYWluT2JqZWN0LCBwb3N0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgSGlzdG9yeVN0YWNrLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ01lbW9yeUhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpc1skc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlIHRoaXNbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIHRoaXMuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ01lbW9yeUhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ25vb3AnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSBkZWx0YSA/IHRoaXMuc3RhdGUgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhIHx8IDApO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ3NlZWsnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gZGVzdGluYXRpb24gc3RhY2sgaW5mb3JtYXRpb24gYnkgYHN0YXJ0YCBhbmQgYGVuZGAgSUQuXG4gICAgICogQGphIOi1t+eCuSwg57WC54K544GuIElEIOOBi+OCiee1gueCueOBruOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdCh0b0lkLCBmcm9tSWQgYXMgc3RyaW5nKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSBjcmVhdGVEYXRhKGlkLCBzdGF0ZSk7XG4gICAgICAgIGlmICgncmVwbGFjZScgPT09IG1ldGhvZCAmJiAwID09PSB0aGlzLmluZGV4KSB7XG4gICAgICAgICAgICBuZXdTdGF0ZVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZChjYW5jZWwpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZShtZXRob2QsIGRmLCBuZXdTdGF0ZSwgdGhpcy5zdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2Ugc3RhdGUgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25DaGFuZ2VTdGF0ZShtZXRob2Q6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJywgZGY6IERlZmVycmVkLCBuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdpbmcnLCBuZXdTdGF0ZSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3U3RhdGUpO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdyZWZyZXNoJywgbmV3U3RhdGUsIG9sZFN0YXRlLCBwcm9taXNlcyk7XG5cbiAgICAgICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgbWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIGlkXG4gKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICogQHBhcmFtIHN0YXRlXG4gKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBJSGlzdG9yeTxUPiB7XG4gICAgcmV0dXJuIG5ldyBNZW1vcnlIaXN0b3J5KGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IG1lbW9yeSBoaXN0b3J5LlxuICogQGphIOODoeODouODquWxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGluc3RhbmNlWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBNZW1vcnlIaXN0b3J5PFQ+KS5yZXNldChvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gRGlzcG9zZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjga7noLTmo4RcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYE1lbW9yeUhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBNZW1vcnlIaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+KTogdm9pZCB7XG4gICAgaW5zdGFuY2VbJHNpZ25hdHVyZV0gJiYgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsIlxuaW1wb3J0IHsgcGF0aDJyZWdleHAgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5pbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIENsYXNzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBzbGVlcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICB0b1F1ZXJ5U3RyaW5ncyxcbiAgICBwYXJzZVVybFF1ZXJ5LFxuICAgIGNvbnZlcnRVcmxQYXJhbVR5cGUsXG59IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgbG9hZFRlbXBsYXRlU291cmNlLCB0b1RlbXBsYXRlRWxlbWVudCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBJSGlzdG9yeSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgREVGQVVMVF9QUkVGSVggICAgICAgPSAnY2RwJyxcbiAgICBUUkFOU0lUSU9OX0RJUkVDVElPTiA9ICd0cmFuc2l0aW9uLWRpcmVjdGlvbicsXG4gICAgVFJBTlNJVElPTl9SVU5OSU5HICAgPSAndHJhbnNpdGlvbi1ydW5uaW5nJyxcbiAgICBQQUdFX0NVUlJFTlQgICAgICAgICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgICAgICAgID0gJ3BhZ2UtcHJldmlvdXMnLFxuICAgIEVOVEVSX0ZST01fQ0xBU1MgICAgID0gJ2VudGVyLWZyb20nLFxuICAgIEVOVEVSX0FDVElWRV9DTEFTUyAgID0gJ2VudGVyLWFjdGl2ZScsXG4gICAgRU5URVJfVE9fQ0xBU1MgICAgICAgPSAnZW50ZXItdG8nLFxuICAgIExFQVZFX0ZST01fQ0xBU1MgICAgID0gJ2xlYXZlLWZyb20nLFxuICAgIExFQVZFX0FDVElWRV9DTEFTUyAgID0gJ2xlYXZlLWFjdGl2ZScsXG4gICAgTEVBVkVfVE9fQ0xBU1MgICAgICAgPSAnbGVhdmUtdG8nLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBEb21DYWNoZSB7XG4gICAgREFUQV9OQU1FICAgICAgICAgICA9ICdkb20tY2FjaGUnLFxuICAgIENBQ0hFX0xFVkVMX01FTU9SWSAgPSAnbWVtb3J5JyxcbiAgICBDQUNIRV9MRVZFTF9DT05ORUNUID0gJ2Nvbm5lY3QnLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBMaW5rRGF0YSB7XG4gICAgVFJBTlNJVElPTiAgICAgPSAndHJhbnNpdGlvbicsXG4gICAgUFJFVkVOVF9ST1VURVIgPSAncHJldmVudC1yb3V0ZXInLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBDb25zdCB7XG4gICAgV0FJVF9UUkFOU0lUSU9OX01BUkdJTiA9IDEwMCwgLy8gbXNlY1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBQYWdlRXZlbnQgPSAnaW5pdCcgfCAnbW91bnRlZCcgfCAnYmVmb3JlLWVudGVyJyB8ICdhZnRlci1lbnRlcicgfCAnYmVmb3JlLWxlYXZlJyB8ICdhZnRlci1sZWF2ZScgfCAndW5tb3VudGVkJyB8ICdyZW1vdmVkJztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZmxhdCBSb3V0ZVBhcmFtZXRlcnMgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSBPbWl0PFJvdXRlUGFyYW1ldGVycywgJ3JvdXRlcyc+ICYge1xuICAgIC8qKiByZWdleHAgZnJvbSBwYXRoICovXG4gICAgcmVnZXhwOiBSZWdFeHA7XG4gICAgLyoqIGtleXMgb2YgcGFyYW1zICovXG4gICAgcGFyYW1LZXlzOiBzdHJpbmdbXTtcbiAgICAvKiogRE9NIHRlbXBsYXRlIGluc3RhbmNlIHdpdGggUGFnZSBlbGVtZW50ICovXG4gICAgJHRlbXBsYXRlPzogRE9NO1xuICAgIC8qKiByb3V0ZXIgcGFnZSBpbnN0YW5jZSBmcm9tIGBjb21wb25lbnRgIHByb3BlcnR5ICovXG4gICAgcGFnZT86IFBhZ2U7XG59O1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0ID0gV3JpdGFibGU8Um91dGU+ICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyAmIHtcbiAgICAnQHBhcmFtcyc6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtcztcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgdG8gUm91dGVDb250ZXh0ICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHQgPSAodXJsOiBzdHJpbmcsIHJvdXRlcjogUm91dGVyLCBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsIG5hdk9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAvLyBvbWl0IHVuY2xvbmFibGUgcHJvcHNcbiAgICBjb25zdCBmcm9tTmF2aWdhdGUgPSAhIW5hdk9wdGlvbnM7XG4gICAgY29uc3QgZW5zdXJlQ2xvbmUgPSAoY3R4OiB1bmtub3duKTogUm91dGVDb250ZXh0ID0+IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgY29uc3QgY29udGV4dCA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIHJvdXRlcjogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcm91dGVyLFxuICAgICAgICB9LFxuICAgICAgICBuYXZPcHRpb25zLFxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBmb3JjZSBvdmVycmlkZVxuICAgICAgICAgICAgcXVlcnk6IHt9LFxuICAgICAgICAgICAgcGFyYW1zOiB7fSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcy5wYXRoLFxuICAgICAgICAgICAgJ0BwYXJhbXMnOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiBwYXJhbXMsXG4gICAgICAgIH0sXG4gICAgKTtcbiAgICByZXR1cm4gZnJvbU5hdmlnYXRlID8gZW5zdXJlQ2xvbmUoY29udGV4dCkgOiBjb250ZXh0IGFzIFJvdXRlQ29udGV4dDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBjb250ZXh0IHBhcmFtcyAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IChyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdIHwgdW5kZWZpbmVkKTogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0+IHtcbiAgICBjb25zdCBmbGF0dGVuID0gKHBhcmVudFBhdGg6IHN0cmluZywgbmVzdGVkOiBSb3V0ZVBhcmFtZXRlcnNbXSk6IFJvdXRlUGFyYW1ldGVyc1tdID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmVzdGVkKSB7XG4gICAgICAgICAgICBuLnBhdGggPSBgJHtwYXJlbnRQYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7bm9ybWFsaXplSWQobi5wYXRoKX1gO1xuICAgICAgICAgICAgcmV0dmFsLnB1c2gobik7XG4gICAgICAgICAgICBpZiAobi5yb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5mbGF0dGVuKG4ucGF0aCwgbi5yb3V0ZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmxhdHRlbignJywgaXNBcnJheShyb3V0ZXMpID8gcm91dGVzIDogcm91dGVzID8gW3JvdXRlc10gOiBbXSlcbiAgICAgICAgLm1hcCgoc2VlZDogUm91dGVDb250ZXh0UGFyYW1ldGVycykgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5czogcGF0aDJyZWdleHAuS2V5W10gPSBbXTtcbiAgICAgICAgICAgIHNlZWQucmVnZXhwID0gcGF0aDJyZWdleHAucGF0aFRvUmVnZXhwKHNlZWQucGF0aCwga2V5cyk7XG4gICAgICAgICAgICBzZWVkLnBhcmFtS2V5cyA9IGtleXMuZmlsdGVyKGsgPT4gaXNTdHJpbmcoay5uYW1lKSkubWFwKGsgPT4gay5uYW1lIGFzIHN0cmluZyk7XG4gICAgICAgICAgICByZXR1cm4gc2VlZDtcbiAgICAgICAgfSk7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBwcmVwYXJlIElIaXN0b3J5IG9iamVjdCAqL1xuZXhwb3J0IGNvbnN0IHByZXBhcmVIaXN0b3J5ID0gKHNlZWQ6ICdoYXNoJyB8ICdoaXN0b3J5JyB8ICdtZW1vcnknIHwgSUhpc3RvcnkgPSAnaGFzaCcsIGluaXRpYWxQYXRoPzogc3RyaW5nLCBjb250ZXh0PzogV2luZG93KTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgcmV0dXJuIChpc1N0cmluZyhzZWVkKVxuICAgICAgICA/ICdtZW1vcnknID09PSBzZWVkID8gY3JlYXRlTWVtb3J5SGlzdG9yeShpbml0aWFsUGF0aCB8fCAnJykgOiBjcmVhdGVTZXNzaW9uSGlzdG9yeShpbml0aWFsUGF0aCB8fCAnJywgdW5kZWZpbmVkLCB7IG1vZGU6IHNlZWQsIGNvbnRleHQgfSlcbiAgICAgICAgOiBzZWVkXG4gICAgKSBhcyBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGJ1aWxkTmF2aWdhdGVVcmwgPSAocGF0aDogc3RyaW5nLCBvcHRpb25zOiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogc3RyaW5nID0+IHtcbiAgICB0cnkge1xuICAgICAgICBwYXRoID0gYC8ke25vcm1hbGl6ZUlkKHBhdGgpfWA7XG4gICAgICAgIGNvbnN0IHsgcXVlcnksIHBhcmFtcyB9ID0gb3B0aW9ucztcbiAgICAgICAgbGV0IHVybCA9IHBhdGgycmVnZXhwLmNvbXBpbGUocGF0aCkocGFyYW1zIHx8IHt9KTtcbiAgICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgICAgICB1cmwgKz0gYD8ke3RvUXVlcnlTdHJpbmdzKHF1ZXJ5KX1gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChcbiAgICAgICAgICAgIFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELFxuICAgICAgICAgICAgYENvbnN0cnVjdCByb3V0ZSBkZXN0aW5hdGlvbiBmYWlsZWQuIFtwYXRoOiAke3BhdGh9LCBkZXRhaWw6ICR7ZXJyb3IudG9TdHJpbmcoKX1dYCxcbiAgICAgICAgICAgIGVycm9yLFxuICAgICAgICApO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBwYXJzZVVybFBhcmFtcyA9IChyb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCA9PiB7XG4gICAgY29uc3QgeyB1cmwgfSA9IHJvdXRlO1xuICAgIHJvdXRlLnF1ZXJ5ICA9IHVybC5pbmNsdWRlcygnPycpID8gcGFyc2VVcmxRdWVyeShub3JtYWxpemVJZCh1cmwpKSA6IHt9O1xuICAgIHJvdXRlLnBhcmFtcyA9IHt9O1xuXG4gICAgY29uc3QgeyByZWdleHAsIHBhcmFtS2V5cyB9ID0gcm91dGVbJ0BwYXJhbXMnXTtcbiAgICBpZiAocGFyYW1LZXlzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSByZWdleHAuZXhlYyh1cmwpPy5tYXAoKHZhbHVlLCBpbmRleCkgPT4geyByZXR1cm4geyB2YWx1ZSwga2V5OiBwYXJhbUtleXNbaW5kZXggLSAxXSB9OyB9KTtcbiAgICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMhKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgaWYgKG51bGwgIT0gcGFyYW0ua2V5KSB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUocm91dGUucGFyYW1zLCBwYXJhbS5rZXksIGNvbnZlcnRVcmxQYXJhbVR5cGUocGFyYW0udmFsdWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzI2luc3RhbmNlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlID0gYXN5bmMgKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCB7ICdAcGFyYW1zJzogcGFyYW1zIH0gPSByb3V0ZTtcblxuICAgIGlmIChwYXJhbXMucGFnZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IHsgY29tcG9uZW50IH0gPSBwYXJhbXM7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29tcG9uZW50KSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9hd2FpdC10aGVuYWJsZVxuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBuZXcgKGNvbXBvbmVudCBhcyB1bmtub3duIGFzIENsYXNzKShyb3V0ZSk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBjb21wb25lbnQocm91dGUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChjb21wb25lbnQpKSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0gT2JqZWN0LmFzc2lnbih7ICdAcm91dGUnOiByb3V0ZSB9LCBjb21wb25lbnQpIGFzIFBhZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSB7ICdAcm91dGUnOiByb3V0ZSB9IGFzIFBhZ2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIG5ld2x5IGNyZWF0ZWRcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjJHRlbXBsYXRlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlID0gYXN5bmMgKHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGlmIChwYXJhbXMuJHRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgeyBjb250ZW50IH0gPSBwYXJhbXM7XG4gICAgaWYgKG51bGwgPT0gY29udGVudCkge1xuICAgICAgICAvLyBub29wIGVsZW1lbnRcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9ICQ8SFRNTEVsZW1lbnQ+KCk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhjb250ZW50WydzZWxlY3RvciddKSkge1xuICAgICAgICAvLyBmcm9tIGFqYXhcbiAgICAgICAgY29uc3QgeyBzZWxlY3RvciwgdXJsIH0gPSBjb250ZW50IGFzIHsgc2VsZWN0b3I6IHN0cmluZzsgdXJsPzogc3RyaW5nOyB9O1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRvVGVtcGxhdGVFbGVtZW50KGF3YWl0IGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgeyB1cmwgfSkpO1xuICAgICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihgdGVtcGxhdGUgbG9hZCBmYWlsZWQuIFtzZWxlY3RvcjogJHtzZWxlY3Rvcn0sIHVybDogJHt1cmx9XWApO1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSAkKFsuLi50ZW1wbGF0ZS5jb250ZW50LmNoaWxkcmVuXSkgYXMgRE9NO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSAkKGNvbnRlbnQgYXMgSFRNTEVsZW1lbnQpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlOyAvLyBuZXdseSBjcmVhdGVkXG59O1xuXG4vKiogQGludGVybmFsIGRlY2lkZSB0cmFuc2l0aW9uIGRpcmVjdGlvbiAqL1xuZXhwb3J0IGNvbnN0IGRlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24gPSAoY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvKTogSGlzdG9yeURpcmVjdGlvbiA9PiB7XG4gICAgaWYgKGNoYW5nZUluZm8ucmV2ZXJzZSkge1xuICAgICAgICBzd2l0Y2ggKGNoYW5nZUluZm8uZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdiYWNrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2ZvcndhcmQnO1xuICAgICAgICAgICAgY2FzZSAnZm9yd2FyZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdiYWNrJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZUluZm8uZGlyZWN0aW9uO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjaGVjayBhbmltYXRpb24gcHJvcGVydHkgKi9cbmNvbnN0IGdldEFuaW1hdGlvblNlYyA9ICgkZWw6IERPTSk6IG51bWJlciA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZSgkZWxbMF0pLmFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCBjaGVjayB0cmFuc2l0aW9uIHByb3BlcnR5ICovXG5jb25zdCBnZXRUcmFuc2l0aW9uU2VjID0gKCRlbDogRE9NKTogbnVtYmVyID0+IHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKCRlbFswXSkudHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgd2FpdEZvckVmZmVjdCA9ICgkZWw6IERPTSwgbWV0aG9kOiAnYW5pbWF0aW9uRW5kJyB8ICd0cmFuc2l0aW9uRW5kJywgZHVyYXRpb25TZWM6IG51bWJlcik6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW1xuICAgICAgICBuZXcgUHJvbWlzZShyZXNvbHZlID0+ICRlbFttZXRob2RdKHJlc29sdmUpKSxcbiAgICAgICAgc2xlZXAoZHVyYXRpb25TZWMgKiAxMDAwICsgQ29uc3QuV0FJVF9UUkFOU0lUSU9OX01BUkdJTiksXG4gICAgXSk7XG59O1xuXG4vKiogQGludGVybmFsIHRyYW5zaXRpb24gZXhlY3V0aW9uICovXG5leHBvcnQgY29uc3QgcHJvY2Vzc1BhZ2VUcmFuc2l0aW9uID0gYXN5bmMoJGVsOiBET00sIGZyb21DbGFzczogc3RyaW5nLCBhY3RpdmVDbGFzczogc3RyaW5nLCB0b0NsYXNzOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAkZWwucmVtb3ZlQ2xhc3MoZnJvbUNsYXNzKTtcbiAgICAkZWwuYWRkQ2xhc3ModG9DbGFzcyk7XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25kLWFzc2lnbiAqL1xuICAgIGxldCBkdXJhdGlvbjogbnVtYmVyO1xuICAgIGlmIChkdXJhdGlvbiA9IGdldEFuaW1hdGlvblNlYygkZWwpKSB7XG4gICAgICAgIGF3YWl0IHdhaXRGb3JFZmZlY3QoJGVsLCAnYW5pbWF0aW9uRW5kJywgZHVyYXRpb24pO1xuICAgIH0gZWxzZSBpZiAoZHVyYXRpb24gPSBnZXRUcmFuc2l0aW9uU2VjKCRlbCkpIHtcbiAgICAgICAgYXdhaXQgd2FpdEZvckVmZmVjdCgkZWwsICd0cmFuc2l0aW9uRW5kJywgZHVyYXRpb24pO1xuICAgIH1cbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbmQtYXNzaWduICovXG5cbiAgICAkZWwucmVtb3ZlQ2xhc3MoYWN0aXZlQ2xhc3MpO1xufTtcbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIGlzQXJyYXksXG4gICAgaXNGdW5jdGlvbixcbiAgICBjYW1lbGl6ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBSRVNVTFRfQ09ERSxcbiAgICBpc1Jlc3VsdCxcbiAgICBtYWtlUmVzdWx0LFxufSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgd2FpdEZyYW1lIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi4vc3NyJztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7IElIaXN0b3J5LCBIaXN0b3J5U3RhdGUgfSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB0eXBlIHtcbiAgICBQYWdlVHJhbnNpdGlvblBhcmFtcyxcbiAgICBSb3V0ZUNoYW5nZUluZm8sXG4gICAgUm91dGVyRXZlbnQsXG4gICAgUGFnZSxcbiAgICBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgUm91dGUsXG4gICAgVHJhbnNpdGlvblNldHRpbmdzLFxuICAgIFBhZ2VTdGFjayxcbiAgICBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFJvdXRlU3ViRmxvd1BhcmFtcyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgQ3NzTmFtZSxcbiAgICBEb21DYWNoZSxcbiAgICBMaW5rRGF0YSxcbiAgICBQYWdlRXZlbnQsXG4gICAgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICBSb3V0ZUNvbnRleHQsXG4gICAgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLFxuICAgIHRvUm91dGVDb250ZXh0LFxuICAgIHByZXBhcmVIaXN0b3J5LFxuICAgIGJ1aWxkTmF2aWdhdGVVcmwsXG4gICAgcGFyc2VVcmxQYXJhbXMsXG4gICAgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlLFxuICAgIGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZSxcbiAgICBkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uLFxuICAgIHByb2Nlc3NQYWdlVHJhbnNpdGlvbixcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBSb3V0ZXIgaW1wbGltZW50IGNsYXNzLlxuICogQGphIFJvdXRlciDlrp/oo4Xjgq/jg6njgrlcbiAqL1xuY2xhc3MgUm91dGVyQ29udGV4dCBleHRlbmRzIEV2ZW50UHVibGlzaGVyPFJvdXRlckV2ZW50PiBpbXBsZW1lbnRzIFJvdXRlciB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm91dGVzOiBSZWNvcmQ8c3RyaW5nLCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzPiA9IHt9O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3Rvcnk6IElIaXN0b3J5PFJvdXRlQ29udGV4dD47XG4gICAgcHJpdmF0ZSByZWFkb25seSBfJGVsOiBET007XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcmFmOiBVbmtub3duRnVuY3Rpb247XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeUNoYW5naW5nSGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGlzdG9yeUNoYW5naW5nO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlSZWZyZXNoSGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGlzdG9yeVJlZnJlc2g7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfZXJyb3JIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IYW5kbGVFcnJvcjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9jc3NQcmVmaXg6IHN0cmluZztcbiAgICBwcml2YXRlIF90cmFuc2l0aW9uU2V0dGluZ3M6IFRyYW5zaXRpb25TZXR0aW5ncztcbiAgICBwcml2YXRlIF9sYXN0Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfcHJldlJvdXRlPzogUm91dGVDb250ZXh0O1xuICAgIHByaXZhdGUgX3RlbXBUcmFuc2l0aW9uUGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXM7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM6IFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICByb3V0ZXMsXG4gICAgICAgICAgICBzdGFydCxcbiAgICAgICAgICAgIGVsLFxuICAgICAgICAgICAgd2luZG93OiBjb250ZXh0LFxuICAgICAgICAgICAgaGlzdG9yeSxcbiAgICAgICAgICAgIGluaXRpYWxQYXRoLFxuICAgICAgICAgICAgY3NzUHJlZml4LFxuICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICB0aGlzLl9yYWYgPSBjb250ZXh0Py5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuICAgICAgICB0aGlzLl8kZWwgPSAkKHNlbGVjdG9yLCBlbCk7XG4gICAgICAgIGlmICghdGhpcy5fJGVsLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5ELCBgUm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3J9XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faGlzdG9yeSA9IHByZXBhcmVIaXN0b3J5KGhpc3RvcnksIGluaXRpYWxQYXRoLCBjb250ZXh0IGFzIFdpbmRvdyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIgPSB0aGlzLm9uSGlzdG9yeUNoYW5naW5nLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlciAgPSB0aGlzLm9uSGlzdG9yeVJlZnJlc2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fZXJyb3JIYW5kbGVyICAgICAgICAgICA9IHRoaXMub25IYW5kbGVFcnJvci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5vbignZXJyb3InLCAgICB0aGlzLl9lcnJvckhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGZvbGxvdyBhbmNob3JcbiAgICAgICAgdGhpcy5fJGVsLm9uKCdjbGljaycsICdbaHJlZl0nLCB0aGlzLm9uQW5jaG9yQ2xpY2tlZC5iaW5kKHRoaXMpKTtcblxuICAgICAgICB0aGlzLl9jc3NQcmVmaXggPSBjc3NQcmVmaXggfHwgQ3NzTmFtZS5ERUZBVUxUX1BSRUZJWDtcbiAgICAgICAgdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7IGRlZmF1bHQ6ICdub25lJyB9LCB0cmFuc2l0aW9uKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyKHJvdXRlcyBhcyBSb3V0ZVBhcmFtZXRlcnNbXSwgc3RhcnQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIFJvdXRlIHJlZ2lzdHJhdGlvbiAqL1xuICAgIHJlZ2lzdGVyKHJvdXRlczogUm91dGVQYXJhbWV0ZXJzIHwgUm91dGVQYXJhbWV0ZXJzW10sIHJlZnJlc2ggPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKHJvdXRlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tjb250ZXh0LnBhdGhdID0gY29udGV4dDtcbiAgICAgICAgfVxuICAgICAgICByZWZyZXNoICYmIHZvaWQgdGhpcy5nbygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogTmF2aWdhdGUgdG8gbmV3IHBhZ2UuICovXG4gICAgYXN5bmMgbmF2aWdhdGUodG86IHN0cmluZywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbWV0ZXIodG8pO1xuICAgICAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgYFJvdXRlIG5vdCBmb3VuZC4gW3RvOiAke3RvfV1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3B0cyAgPSBPYmplY3QuYXNzaWduKHsgaW50ZW50OiB1bmRlZmluZWQgfSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCB1cmwgICA9IGJ1aWxkTmF2aWdhdGVVcmwodG8sIG9wdHMpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHNlZWQsIG9wdHMpO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIGV4ZWMgbmF2aWdhdGVcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LnB1c2godXJsLCByb3V0ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBub29wXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBBZGQgcGFnZSBzdGFjayBzdGFydGluZyBmcm9tIHRoZSBjdXJyZW50IGhpc3RvcnkuICovXG4gICAgYXN5bmMgcHVzaFBhZ2VTdGFjayhzdGFjazogUGFnZVN0YWNrIHwgUGFnZVN0YWNrW10sIG5vTmF2aWdhdGU/OiBib29sZWFuKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzdGFja3MgPSBpc0FycmF5KHN0YWNrKSA/IHN0YWNrIDogW3N0YWNrXTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlcyA9IHN0YWNrcy5maWx0ZXIocyA9PiAhIXMucm91dGUpLm1hcChzID0+IHMucm91dGUgYXMgUm91dGVQYXJhbWV0ZXJzKTtcblxuICAgICAgICAgICAgLy8gZW5zcnVlIFJvdXRlXG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyKHJvdXRlcywgZmFsc2UpO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBwdXNoIGhpc3RvcnlcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhZ2Ugb2Ygc3RhY2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdXJsLCB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBwYWdlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbWV0ZXIodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbdXJsOiAke3VybH1dYCwgcGFnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gc2lsZW50IHJlZ2lzdHJ5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBwYXJhbXMsIHsgaW50ZW50OiB1bmRlZmluZWQgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLnRyYW5zaXRpb24gPSB0cmFuc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5yZXZlcnNlICAgID0gcmV2ZXJzZTtcbiAgICAgICAgICAgICAgICAgICAgdm9pZCB0aGlzLl9oaXN0b3J5LnB1c2godXJsLCByb3V0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAgICAgICAgIGlmIChub05hdmlnYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuZ28oLTEgKiBzdGFja3MubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFub05hdmlnYXRlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5nbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEJlZ2luIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGJlZ2luU3ViRmxvdyh0bzogc3RyaW5nLCBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7fSwgc3ViZmxvdyB8fCB7fSk7XG4gICAgICAgICAgICB0aGlzLmV2YWx1YXRpb25TdWJGbG93UGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgICAodGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0KS5zdWJmbG93ID0gcGFyYW1zO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5uYXZpZ2F0ZSh0bywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ29tbWl0IHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNvbW1pdFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBgcmV2ZXJzZWA6IOWxpeattOS4iuOBryBgYmFja2Ag5pa55ZCR44Gr44Gq44KL44Gf44KBLCBJL0Yg5oyH5a6a5pa55ZCR44Go5Y+N6Lui44GZ44KL44KI44GG44Gr6Kq/5pW0XG4gICAgICAgIHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7fSwgcGFyYW1zLCB7IHJldmVyc2U6ICFwYXJhbXM/LnJldmVyc2UgfSk7XG4gICAgICAgIGNvbnN0IHsgYWRkaXRpb25hbERpc3RhbmNlLCBhZGRpdGluYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW5hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKCgpID0+IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW5hbFN0YWNrcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogZGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIENhbmNlbCBzdWItZmxvdyB0cmFuc2FjdGlvbi4gKi9cbiAgICBhc3luYyBjYW5jZWxTdWJGbG93KHBhcmFtcz86IFBhZ2VUcmFuc2l0aW9uUGFyYW1zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGNvbnN0IHN1YmZsb3cgPSB0aGlzLmZpbmRTdWJGbG93UGFyYW1zKHRydWUpO1xuICAgICAgICBpZiAoIXN1YmZsb3cpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYHJldmVyc2VgOiDlsaXmrbTkuIrjga8gYGJhY2tgIOaWueWQkeOBq+OBquOCi+OBn+OCgSwgSS9GIOaMh+WumuaWueWQkeOBqOWPjei7ouOBmeOCi+OCiOOBhuOBq+iqv+aVtC4gZGVmYXVsdDogdHJ1ZVxuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIHBhcmFtcywgeyByZXZlcnNlOiAhT2JqZWN0LmFzc2lnbih7IHJldmVyc2U6IHRydWUgfSwgcGFyYW1zKS5yZXZlcnNlIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmdvKC0xICogc3ViZmxvdy5kaXN0YW5jZSk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnkuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFNldCBjb21tb24gdHJhbnNpdGlvbiBzZXR0bmlncy4gKi9cbiAgICBzZXRUcmFuc2l0aW9uU2V0dGluZ3MobmV3U2V0dGluZ3M6IFRyYW5zaXRpb25TZXR0aW5ncyk6IFRyYW5zaXRpb25TZXR0aW5ncyB7XG4gICAgICAgIGNvbnN0IG9sZFNldHRpbmdzID0gdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzO1xuICAgICAgICB0aGlzLl90cmFuc2l0aW9uU2V0dGluZ3MgPSB7IC4uLm5ld1NldHRpbmdzIH07XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHN1Yi1mbG93XG5cbiAgICAvKiogQGludGVybmFsIGV2YWx1YXRpb24gc3ViLWZsb3cgcGFyYW1ldGVycyAqL1xuICAgIHByaXZhdGUgZXZhbHVhdGlvblN1YkZsb3dQYXJhbXMoc3ViZmxvdzogUm91dGVTdWJGbG93UGFyYW1zKTogdm9pZCB7XG4gICAgICAgIGxldCBhZGRpdGlvbmFsRGlzdGFuY2UgPSAwO1xuXG4gICAgICAgIGlmIChzdWJmbG93LmJhc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKHN1YmZsb3cuYmFzZSk7XG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IHsgaW5kZXgsIHN0YWNrIH0gPSB0aGlzLl9oaXN0b3J5O1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGktLSwgYWRkaXRpb25hbERpc3RhbmNlKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2tbaV1bJ0BpZCddID09PSBiYXNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCwgYEludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuIFt1cmw6ICR7c3ViZmxvdy5iYXNlfV1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1YmZsb3cuYmFzZSA9IHRoaXMuY3VycmVudFJvdXRlLnVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24oc3ViZmxvdywgeyBhZGRpdGlvbmFsRGlzdGFuY2UgfSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGZpbmRTdWJGbG93UGFyYW1zKGRldGFjaDogYm9vbGVhbik6IHsgZGlzdGFuY2U6IG51bWJlcjsgcGFyYW1zOiBSb3V0ZVN1YkZsb3dQYXJhbXMgJiB7IGFkZGl0aW9uYWxEaXN0YW5jZTogbnVtYmVyOyB9OyB9IHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IHN0YWNrID0gdGhpcy5faGlzdG9yeS5zdGFjaztcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YWNrLmxlbmd0aCAtIDEsIGRpc3RhbmNlID0gMDsgaSA+PSAwOyBpLS0sIGRpc3RhbmNlKyspIHtcbiAgICAgICAgICAgIGlmIChzdGFja1tpXS5zdWJmbG93KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gc3RhY2tbaV0uc3ViZmxvdyBhcyBSb3V0ZVN1YkZsb3dQYXJhbXMgJiB7IGFkZGl0aW9uYWxEaXN0YW5jZTogbnVtYmVyOyB9O1xuICAgICAgICAgICAgICAgIGRldGFjaCAmJiBkZWxldGUgc3RhY2tbaV0uc3ViZmxvdztcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkaXN0YW5jZSwgcGFyYW1zIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6IHRyYW5zaXRpb25cblxuICAgIC8qKiBAaW50ZXJuYWwgY29tbW9uIGBSb3V0ZXJFdmVudEFyZ2AgbWFrZXIgKi9cbiAgICBwcml2YXRlIG1ha2VSb3V0ZUNoYW5nZUluZm8obmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBSb3V0ZUNoYW5nZUluZm8ge1xuICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXdTdGF0ZS5pbnRlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdTdGF0ZS5pbnRlbnQ7IC8vIG5hdmlnYXRlIOaZguOBq+aMh+WumuOBleOCjOOBnyBpbnRlbnQg44GvIG9uZSB0aW1lIOOBruOBv+acieWKueOBq+OBmeOCi1xuXG4gICAgICAgIGNvbnN0IGZyb20gPSBvbGRTdGF0ZSB8fCB0aGlzLl9sYXN0Um91dGU7XG4gICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHRoaXMuX2hpc3RvcnkuZGlyZWN0KG5ld1N0YXRlWydAaWQnXSwgZnJvbT8uWydAaWQnXSkuZGlyZWN0aW9uO1xuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHRoaXMuX3RlbXBUcmFuc2l0aW9uUGFyYW1zIHx8ICgnYmFjaycgIT09IGRpcmVjdGlvbiA/IG5ld1N0YXRlIDogZnJvbSBhcyBSb3V0ZUNvbnRleHQpO1xuICAgICAgICB0aGlzLl90ZW1wVHJhbnNpdGlvblBhcmFtcyA9IHVuZGVmaW5lZDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgZnJvbSxcbiAgICAgICAgICAgIHRvOiBuZXdTdGF0ZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbixcbiAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICByZXZlcnNlLFxuICAgICAgICAgICAgaW50ZW50LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCByb3V0ZSBieSB1cmwgKi9cbiAgICBwcml2YXRlIGZpbmRSb3V0ZUNvbnRleHRQYXJhbWV0ZXIodXJsOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZCh1cmwuc3BsaXQoJz8nKVswXSl9YDtcbiAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIE9iamVjdC5rZXlzKHRoaXMuX3JvdXRlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVnZXhwIH0gPSB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICBpZiAocmVnZXhwLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgcGFnZSBldmVudCAqL1xuICAgIHByaXZhdGUgdHJpZ2dlclBhZ2VDYWxsYmFjayhldmVudDogUGFnZUV2ZW50LCB0YXJnZXQ6IFBhZ2UgfCB1bmRlZmluZWQsIGFyZzogUm91dGUgfCBSb3V0ZUNoYW5nZUluZm8pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbWV0aG9kID0gY2FtZWxpemUoYHBhZ2UtJHtldmVudH1gKTtcbiAgICAgICAgaXNGdW5jdGlvbih0YXJnZXQ/LlttZXRob2RdKSAmJiB0YXJnZXQ/LlttZXRob2RdKGFyZyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB3YWl0IGZyYW1lICovXG4gICAgcHJpdmF0ZSB3YWl0RnJhbWUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiB3YWl0RnJhbWUoMSwgdGhpcy5fcmFmKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBwYWdlIG1haW4gcHJvY2VkdXJlICovXG4gICAgcHJpdmF0ZSBhc3luYyBjaGFuZ2VQYWdlKG5leHRSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIHByZXZSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcGFyc2VVcmxQYXJhbXMobmV4dFJvdXRlKTtcblxuICAgICAgICBjb25zdCBjaGFuZ2VJbmZvID0gdGhpcy5tYWtlUm91dGVDaGFuZ2VJbmZvKG5leHRSb3V0ZSwgcHJldlJvdXRlKTtcblxuICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LFxuICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvKTtcblxuICAgICAgICAvLyB0cmFuc2l0aW9uIGNvcmVcbiAgICAgICAgYXdhaXQgdGhpcy50cmFuc2l0aW9uUGFnZShwYWdlTmV4dCwgJGVsTmV4dCwgcGFnZVByZXYsICRlbFByZXYsIGNoYW5nZUluZm8pO1xuXG4gICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlQ29udGV4dCgkZWxOZXh0LCAkZWxQcmV2LCBjaGFuZ2VJbmZvLmZyb20gYXMgUm91dGVDb250ZXh0KTtcblxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZWQnLCBjaGFuZ2VJbmZvKTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm8pOiBQcm9taXNlPFtQYWdlLCBET00sIFBhZ2UsIERPTV0+IHtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gY2hhbmdlSW5mby50byBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjtcbiAgICAgICAgY29uc3QgcHJldlJvdXRlID0gY2hhbmdlSW5mby5mcm9tIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBwYXJhbXMgfSA9IG5leHRSb3V0ZTtcblxuICAgICAgICAvLyBwYWdlIGluc3RhbmNlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZShuZXh0Um91dGUpO1xuICAgICAgICAvLyBwYWdlICR0ZW1wbGF0ZVxuICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUocGFyYW1zKTtcblxuICAgICAgICAvLyBwYWdlICRlbFxuICAgICAgICBpZiAoIW5leHRSb3V0ZS5lbCkge1xuICAgICAgICAgICAgbmV4dFJvdXRlLmVsID0gcGFyYW1zLiR0ZW1wbGF0ZSEuY2xvbmUoKVswXTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbG9hZGVkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtYXNzZXJ0aW9uXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2luaXQnLCBuZXh0Um91dGVbJ0BwYXJhbXMnXS5wYWdlISwgY2hhbmdlSW5mbyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZWxOZXh0ID0gJChuZXh0Um91dGUuZWwpO1xuICAgICAgICBjb25zdCBwYWdlTmV4dCA9IG5leHRSb3V0ZVsnQHBhcmFtcyddLnBhZ2UhO1xuXG4gICAgICAgIC8vIG1vdW50XG4gICAgICAgIGlmICghJGVsTmV4dC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgJGVsTmV4dC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5fJGVsLmFwcGVuZCgkZWxOZXh0KTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnbW91bnRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdtb3VudGVkJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dFxuICAgICAgICAgICAgcHJldlJvdXRlPy5bJ0BwYXJhbXMnXT8ucGFnZSB8fCB7fSwgJChwcmV2Um91dGU/LmVsKSwgICAvLyBwcmV2XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmFuc2l0aW9uUGFnZShcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gY2hhbmdlSW5mby50cmFuc2l0aW9uIHx8IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0O1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICdlbnRlci1mcm9tLWNsYXNzJzogY3VzdG9tRW50ZXJGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnZW50ZXItYWN0aXZlLWNsYXNzJzogY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdlbnRlci10by1jbGFzcyc6IGN1c3RvbUVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1mcm9tLWNsYXNzJzogY3VzdG9tTGVhdmVGcm9tQ2xhc3MsXG4gICAgICAgICAgICAnbGVhdmUtYWN0aXZlLWNsYXNzJzogY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS10by1jbGFzcyc6IGN1c3RvbUxlYXZlVG9DbGFzcyxcbiAgICAgICAgfSA9IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncztcblxuICAgICAgICAvLyBlbnRlci1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgZW50ZXJGcm9tQ2xhc3MgICA9IGN1c3RvbUVudGVyRnJvbUNsYXNzICAgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgZW50ZXJBY3RpdmVDbGFzcyA9IGN1c3RvbUVudGVyQWN0aXZlQ2xhc3MgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkVOVEVSX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlclRvQ2xhc3MgICAgID0gY3VzdG9tRW50ZXJUb0NsYXNzICAgICB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfVE9fQ0xBU1N9YDtcblxuICAgICAgICAvLyBsZWF2ZS1jc3MtY2xhc3NcbiAgICAgICAgY29uc3QgbGVhdmVGcm9tQ2xhc3MgICA9IGN1c3RvbUxlYXZlRnJvbUNsYXNzICAgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0ZST01fQ0xBU1N9YDtcbiAgICAgICAgY29uc3QgbGVhdmVBY3RpdmVDbGFzcyA9IGN1c3RvbUxlYXZlQWN0aXZlQ2xhc3MgfHwgYCR7dHJhbnNpdGlvbn0tJHtDc3NOYW1lLkxFQVZFX0FDVElWRV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZVRvQ2xhc3MgICAgID0gY3VzdG9tTGVhdmVUb0NsYXNzICAgICB8fCBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfVE9fQ0xBU1N9YDtcblxuICAgICAgICB0aGlzLmJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgICAgIHBhZ2VOZXh0LCAkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcyxcbiAgICAgICAgICAgIGNoYW5nZUluZm8sXG4gICAgICAgICk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICAvLyB0cmFuc2lzaW9uIGV4ZWN1dGlvblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsTmV4dCwgZW50ZXJGcm9tQ2xhc3MsIGVudGVyQWN0aXZlQ2xhc3MsIGVudGVyVG9DbGFzcyksXG4gICAgICAgICAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24oJGVsUHJldiwgbGVhdmVGcm9tQ2xhc3MsIGxlYXZlQWN0aXZlQ2xhc3MsIGxlYXZlVG9DbGFzcyksXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdEZyYW1lKCk7XG5cbiAgICAgICAgdGhpcy5lbmRUcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsIGVudGVyVG9DbGFzcyxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LCBsZWF2ZVRvQ2xhc3MsXG4gICAgICAgICAgICBjaGFuZ2VJbmZvLFxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogYmVnaW4gKi9cbiAgICBwcml2YXRlIGJlZ2luVHJhbnNpdGlvbihcbiAgICAgICAgcGFnZU5leHQ6IFBhZ2UsICRlbE5leHQ6IERPTSwgZW50ZXJGcm9tQ2xhc3M6IHN0cmluZywgZW50ZXJBY3RpdmVDbGFzczogc3RyaW5nLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLCBsZWF2ZUZyb21DbGFzczogc3RyaW5nLCBsZWF2ZUFjdGl2ZUNsYXNzOiBzdHJpbmcsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mbyxcbiAgICApOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fJGVsLmFkZENsYXNzKFtcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gLFxuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9ESVJFQ1RJT059LSR7ZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbihjaGFuZ2VJbmZvKX1gLFxuICAgICAgICBdKTtcbiAgICAgICAgJGVsTmV4dC5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbicpO1xuICAgICAgICAkZWxOZXh0LmFkZENsYXNzKFtlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzc10pO1xuICAgICAgICAkZWxQcmV2LmFkZENsYXNzKFtsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzc10pO1xuXG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtZW50ZXInLCBwYWdlTmV4dCwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWxlYXZlJywgcGFnZVByZXYsIGNoYW5nZUluZm8pO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogZW5kICovXG4gICAgcHJpdmF0ZSBlbmRUcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLCBlbnRlclRvQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSwgbGVhdmVUb0NsYXNzOiBzdHJpbmcsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mbyxcbiAgICApOiB2b2lkIHtcbiAgICAgICAgJGVsTmV4dC5yZW1vdmVDbGFzcyhlbnRlclRvQ2xhc3MpO1xuICAgICAgICAkZWxQcmV2LnJlbW92ZUNsYXNzKGxlYXZlVG9DbGFzcyk7XG4gICAgICAgICRlbFByZXYuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcblxuICAgICAgICB0aGlzLl8kZWwucmVtb3ZlQ2xhc3MoW1xuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWAsXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX0RJUkVDVElPTn0tJHtjaGFuZ2VJbmZvLmRpcmVjdGlvbn1gLFxuICAgICAgICBdKTtcblxuICAgICAgICB0aGlzLnB1Ymxpc2goJ2FmdGVyLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1sZWF2ZScsIHBhZ2VQcmV2LCBjaGFuZ2VJbmZvKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSBwYWdlIHN0YXR1cyBhZnRlciB0cmFuc2l0aW9uICovXG4gICAgcHJpdmF0ZSB1cGRhdGVDaGFuZ2VDb250ZXh0KCRlbE5leHQ6IERPTSwgJGVsUHJldjogRE9NLCBwcmV2Um91dGU6IFJvdXRlQ29udGV4dCB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgICAgICAvLyB1cGRhdGUgY2xhc3NcbiAgICAgICAgJGVsUHJldi5yZW1vdmVDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX0NVUlJFTlR9YCk7XG4gICAgICAgICRlbE5leHQuYWRkQ2xhc3MoYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWApO1xuICAgICAgICAkZWxQcmV2LmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3ByZXZSb3V0ZSkge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJCh0aGlzLl9wcmV2Um91dGUuZWwpO1xuICAgICAgICAgICAgJGVsLnJlbW92ZUNsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICBjb25zdCBjYWNoZUx2ID0gJGVsLmRhdGEoRG9tQ2FjaGUuREFUQV9OQU1FKTtcbiAgICAgICAgICAgIGlmIChEb21DYWNoZS5DQUNIRV9MRVZFTF9DT05ORUNUICE9PSBjYWNoZUx2KSB7XG4gICAgICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2UgPSB0aGlzLl9wcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5tb3VudGVkJywgdGhpcy5fcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3VubW91bnRlZCcsIHBhZ2UsIHRoaXMuX3ByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKERvbUNhY2hlLkNBQ0hFX0xFVkVMX01FTU9SWSAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsITsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaCgndW5sb2FkZWQnLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xhc3RSb3V0ZSA9IHRoaXMuY3VycmVudFJvdXRlIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgdGhpcy5fcHJldlJvdXRlID0gcHJldlJvdXRlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYGNoYW5naW5nYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlDaGFuZ2luZyhuZXh0U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBjYW5jZWw6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKTogYm9vbGVhbiB7XG4gICAgICAgIGxldCBoYW5kbGVkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKHJlYXNvbj86IHVua25vd24pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgY2FuY2VsKHJlYXNvbik7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5wdWJsaXNoKCd3aWxsLWNoYW5nZScsIHRoaXMubWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXh0U3RhdGUsIHVuZGVmaW5lZCksIGNhbGxiYWNrKTtcblxuICAgICAgICByZXR1cm4gaGFuZGxlZDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgcmVmcmVzaGAgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5UmVmcmVzaChuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+KTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgdXJsICA9IGAvJHtzdGF0ZVsnQGlkJ119YDtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtZXRlcih1cmwpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCwgYFJvdXRlIGNhbm5vdCBiZSByZXNvbHZlZC4gW3VybDogJHt1cmx9XWAsIHN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsID09IHN0YXRlWydAcGFyYW1zJ10pIHtcbiAgICAgICAgICAgICAgICAvLyBSb3V0ZUNvbnRleHRQYXJhbWV0ZXIg44KSIGFzc2lnblxuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc3RhdGUsIHRvUm91dGVDb250ZXh0KHVybCwgdGhpcywgcGFyYW1zKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUgYXMgSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD47XG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHNjaGVkdWxpbmcgYHJlZnJlc2hgIGRvbmUuXG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuY2hhbmdlUGFnZShlbnN1cmUobmV3U3RhdGUpLCBvbGRTdGF0ZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGVycm9yIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGFuZGxlRXJyb3IoZXJyb3I6IHVua25vd24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wdWJsaXNoKFxuICAgICAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgICAgIGlzUmVzdWx0KGVycm9yKSA/IGVycm9yIDogbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgJ1JvdXRlIG5hdmlnYXRlIGZhaWxlZC4nLCBlcnJvcilcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBhbmNob3IgY2xpY2sgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25BbmNob3JDbGlja2VkKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCBhcyBFbGVtZW50KS5jbG9zZXN0KCdbaHJlZl0nKTtcbiAgICAgICAgaWYgKCR0YXJnZXQuZGF0YShMaW5rRGF0YS5QUkVWRU5UX1JPVVRFUikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgY29uc3QgdXJsICAgICAgICA9ICR0YXJnZXQuYXR0cignaHJlZicpO1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gJHRhcmdldC5kYXRhKExpbmtEYXRhLlRSQU5TSVRJT04pIGFzIHN0cmluZztcblxuICAgICAgICBpZiAoJyMnID09PSB1cmwpIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5iYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2b2lkIHRoaXMubmF2aWdhdGUodXJsIGFzIHN0cmluZywgeyB0cmFuc2l0aW9uIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub2ZmKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZXhlY3V0b3IoKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsICAgIHRoaXMuX2Vycm9ySGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgW1tSb3V0ZXJdXSBvYmplY3QuXG4gKiBAamEgW1tSb3V0ZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zXV0gb2JqZWN0XG4gKiAgLSBgamFgIFtbUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc11dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyKHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKTogUm91dGVyIHtcbiAgICByZXR1cm4gbmV3IFJvdXRlckNvbnRleHQoc2VsZWN0b3IsIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBzdGFydDogdHJ1ZSxcbiAgICB9LCBvcHRpb25zKSk7XG59XG4iXSwibmFtZXMiOlsiJHNpZ25hdHVyZSIsIiQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFB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
