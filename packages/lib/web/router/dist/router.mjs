/*!
 * @cdp/router 0.9.12
 *   generic router scheme
 */

import { path2regexp } from '@cdp/extension-path2regexp';
export * from '@cdp/extension-path2regexp';
import { safe, noop, at, sort, $cdp, isObject, post, isArray, isString, isFunction } from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import { Deferred, CancelToken } from '@cdp/promise';
import { toUrl, webRoot, toTemplateElement, loadTemplateSource } from '@cdp/web-utils';
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
     * @ja 拡張通エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["MVC_ROUTER_DECLARE"] = 9007199254740991] = "MVC_ROUTER_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 1, 'router element not found.')] = "ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 2, 'Route cannot be resolved.')] = "ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED";
        RESULT_CODE[RESULT_CODE["ERROR_MVC_ROUTER_NAVIGATE_FAILED"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 75 /* LOCAL_CODE_BASE.ROUTER */ + 3, 'Route navigate failed.')] = "ERROR_MVC_ROUTER_NAVIGATE_FAILED";
    })();
})();

/** @internal */ const window = safe(globalThis.window);
/** @internal */ const document = safe(globalThis.document);

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
    constructor() {
        this._stack = [];
        this._index = 0;
        /** noop stack */
        this.noopStack = noop; // eslint-disable-line @typescript-eslint/explicit-member-accessibility
    }
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
    /** return closet stack information by ID. */
    direct(id) {
        const index = this.closest(id);
        if (null == index) {
            return { direction: 'missing' };
        }
        else {
            const delta = index - this._index;
            const direction = 0 === delta
                ? 'none'
                : delta < 0 ? 'back' : 'forward';
            return { direction, index, state: this._stack[index] };
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

/** @internal constant */
var Const;
(function (Const) {
    Const["HASH_PREFIX"] = "#/";
})(Const || (Const = {}));
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
    /**
     * constructor
     */
    constructor(windowContxt, mode, id, state) {
        super();
        this._stack = new HistoryStack();
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
    async replace(id, state, options) {
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
     * @en Return closet stack information by ID.
     * @ja 指定された ID から最も近いスタック情報を返却
     */
    direct(id) {
        return this._stack.direct(id);
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
        return id ? (('hash' === this._mode) ? `${Const.HASH_PREFIX}${id}` : toUrl(id)) : '';
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
    const { context, mode } = Object.assign({ context: window, mode: 'hash' }, options);
    return new SessionHistory(context, mode, id, state);
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
    /**
     * constructor
     */
    constructor(id, state) {
        super();
        this._stack = new HistoryStack();
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
    async replace(id, state, options) {
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
     * @en Return closet stack information by ID.
     * @ja 指定された ID から最も近いスタック情報を返却
     */
    direct(id) {
        return this._stack.direct(id);
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
/** @internal ensure RouteContextParameters#$template */
const ensureRouterViewTemplate = async (params) => {
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
/** @internal ensure RouteContextParameters#instance */
const ensureRouterViewInstance = async (route) => {
    const { '@params': params } = route;
    if (params.instance) {
        return false; // already created
    }
    const { component } = params;
    if (isFunction(component)) {
        try {
            // eslint-disable-next-line @typescript-eslint/await-thenable
            params.instance = await new component(route);
        }
        catch {
            params.instance = await component(route);
        }
    }
    else if (isObject(component)) {
        params.instance = Object.assign({ '@route': route }, component);
    }
    else {
        params.instance = { '@route': route };
    }
    return true; // newly created
};

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
                route.params[param.key] = convertUrlParamType(param.value);
            }
        }
    }
};
//__________________________________________________________________________________________________//
/**
 * @en Router impliment class.
 * @ja Router 実装クラス
 */
class RouterContext extends EventPublisher {
    /**
     * constructor
     */
    constructor(selector, options) {
        super();
        this._routes = {};
        const { routes, start, el, window, history, initialPath, } = options;
        this._$document = dom(window?.document || document);
        this._$el = dom(selector, el);
        if (!this._$el.length) {
            throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
        }
        this._history = prepareHistory(history, initialPath, window);
        this._historyChangingHandler = this.onHistoryChanging.bind(this);
        this._historyRefreshHandler = this.onHistoryRefresh.bind(this);
        this._errorHandler = this.onHandleError.bind(this);
        this._history.on('changing', this._historyChangingHandler);
        this._history.on('refresh', this._historyRefreshHandler);
        this._history.on('error', this._errorHandler);
        // TODO: follow anchor
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
    /** Route registration */
    register(routes, refresh = false) {
        for (const context of toRouteContextParameters(routes)) {
            this._routes[context.path] = context;
        }
        refresh && void this.go();
        return this;
    }
    /** @en Navigate to new view. */
    async navigate(to, options) {
        try {
            const seed = this.findRouteContextParameter(to);
            if (!seed) {
                throw makeResult(RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
            }
            // TODO: default transition
            const opts = Object.assign({ transition: undefined, intent: undefined }, options);
            const url = buildNavigateUrl(to, opts);
            const route = toRouteContext(url, this, seed, opts);
            // TODO: subflow
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
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    /** @internal common `RouterEventArg` maker */
    makeRouterEventArg(newState, oldState) {
        return {
            router: this,
            from: oldState,
            to: newState,
            direction: this._history.direct(newState['@id']).direction,
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
    /** @internal change content main procedure */
    async changeConetnt(nextRoute, prevRoute) {
        parseUrlParams(nextRoute);
        await this.prepareChangeContext(nextRoute, prevRoute);
        // TODO:
    }
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    /** @internal */
    async prepareChangeContext(nextRoute, prevRoute) {
        const { '@params': params } = nextRoute;
        // view $template
        if (await ensureRouterViewTemplate(params)) {
            this.publish('loaded', this.makeRouterEventArg(nextRoute, prevRoute));
        }
        // view instance
        await ensureRouterViewInstance(nextRoute);
        // view $el
        if (!nextRoute.el) {
            // TODO: prevRoute から構築する方法も検討
            nextRoute.el = params.$template.clone()[0];
        }
        return [
            nextRoute['@params'].instance, dom(nextRoute.el),
            prevRoute?.['@params'].instance || {}, dom(prevRoute?.el), // prev
        ];
    }
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
    ///////////////////////////////////////////////////////////////////////
    // event handlers:
    /** @internal `history` `changing` handler */
    onHistoryChanging(nextState, cancel) {
        let handled = false;
        const callback = (reason) => {
            handled = true;
            cancel(reason);
        };
        this.publish('will-change', this.makeRouterEventArg(nextState, undefined), callback);
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
            promises.push(this.changeConetnt(ensure(newState), oldState));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLm1qcyIsInNvdXJjZXMiOlsicmVzdWx0LWNvZGUtZGVmcy50cyIsInNzci50cyIsImhpc3RvcnkvaW50ZXJuYWwudHMiLCJoaXN0b3J5L3Nlc3Npb24udHMiLCJoaXN0b3J5L21lbW9yeS50cyIsInJvdXRlci9pbnRlcm5hbC50cyIsInJvdXRlci9jb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L3Jlc3RyaWN0LXBsdXMtb3BlcmFuZHMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgUk9VVEVSID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMTUsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by16YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfUk9VVEVSX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMSwgJ3JvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAyLCAnUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDMsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4iLCJpbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGF0LFxuICAgIHNvcnQsXG4gICAgbm9vcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEhpc3RvcnlTdGF0ZSwgSGlzdG9yeURpcmVjdFJldHVyblR5cGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIG5vcm1hbHppZSBpZCBzdHJpbmcgKi9cbmV4cG9ydCBjb25zdCBub3JtYWxpemVJZCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgLy8gcmVtb3ZlIGhlYWQgb2YgXCIjXCIsIFwiL1wiLCBcIiMvXCIgYW5kIHRhaWwgb2YgXCIvXCJcbiAgICByZXR1cm4gc3JjLnJlcGxhY2UoL14oI1xcLyl8XlsjL118XFxzKyQvLCAnJykucmVwbGFjZSgvXlxccyskfChcXC8kKS8sICcnKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHN0YWNrICovXG5leHBvcnQgY29uc3QgY3JlYXRlRGF0YSA9IDxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IEhpc3RvcnlTdGF0ZTxUPiA9PiB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oeyAnQGlkJzogbm9ybWFsaXplSWQoaWQpIH0sIHN0YXRlKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY3JlYXRlIHVuY2FuY2VsbGFibGUgZGVmZXJyZWQgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQgPSAod2Fybjogc3RyaW5nKTogRGVmZXJyZWQgPT4ge1xuICAgIGNvbnN0IHVuY2FuY2VsbGFibGUgPSBuZXcgRGVmZXJyZWQoKSBhcyBXcml0YWJsZTxEZWZlcnJlZD47XG4gICAgdW5jYW5jZWxsYWJsZS5yZWplY3QgPSAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUud2Fybih3YXJuKTtcbiAgICAgICAgdW5jYW5jZWxsYWJsZS5yZXNvbHZlKCk7XG4gICAgfTtcbiAgICByZXR1cm4gdW5jYW5jZWxsYWJsZTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBpbnRlcm5hbCBzdGFjayBtYW5hZ2VtZW50IGNvbW1vbiBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgSGlzdG9yeVN0YWNrPFQgPSBQbGFpbk9iamVjdD4ge1xuICAgIHByaXZhdGUgX3N0YWNrOiBIaXN0b3J5U3RhdGU8VD5bXSA9IFtdO1xuICAgIHByaXZhdGUgX2luZGV4ID0gMDtcblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5kaXN0YW5jZSgwKTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZVsnQGlkJ107XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4O1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgc2V0IGluZGV4KGlkeDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTWF0aC50cnVuYyhpZHgpO1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IGFycmF5KCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnNsaWNlKCk7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX3N0YWNrLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIGNsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHVibGljIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5zbGljZSgwLCB0aGlzLl9pbmRleCArIDEpO1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELiAqL1xuICAgIHB1YmxpYyBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgICAgICAgY29uc3QgeyBfaW5kZXg6IGJhc2UgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLl9zdGFja1xuICAgICAgICAgICAgLm1hcCgocywgaW5kZXgpID0+IHsgcmV0dXJuIHsgaW5kZXgsIGRpc3RhbmNlOiBNYXRoLmFicyhiYXNlIC0gaW5kZXgpLCAuLi5zIH07IH0pXG4gICAgICAgICAgICAuZmlsdGVyKHMgPT4gc1snQGlkJ10gPT09IGlkKVxuICAgICAgICA7XG4gICAgICAgIHNvcnQoY2FuZGlkYXRlcywgKGwsIHIpID0+IChsLmRpc3RhbmNlID4gci5kaXN0YW5jZSA/IDEgOiAtMSksIHRydWUpO1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXT8uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgSUQuICovXG4gICAgcHVibGljIGRpcmVjdChpZDogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuY2xvc2VzdChpZCk7XG4gICAgICAgIGlmIChudWxsID09IGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb246ICdtaXNzaW5nJyB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSBpbmRleCAtIHRoaXMuX2luZGV4O1xuICAgICAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gMCA9PT0gZGVsdGFcbiAgICAgICAgICAgICAgICA/ICdub25lJ1xuICAgICAgICAgICAgICAgIDogZGVsdGEgPCAwID8gJ2JhY2snIDogJ2ZvcndhcmQnO1xuICAgICAgICAgICAgcmV0dXJuIHsgZGlyZWN0aW9uLCBpbmRleCwgc3RhdGU6IHRoaXMuX3N0YWNrW2luZGV4XSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGdldCBhY3RpdmUgZGF0YSBmcm9tIGN1cnJlbnQgaW5kZXggb3JpZ2luICovXG4gICAgcHVibGljIGRpc3RhbmNlKGRlbHRhOiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICBjb25zdCBwb3MgPSB0aGlzLl9pbmRleCArIGRlbHRhO1xuICAgICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoYGludmFsaWQgYXJyYXkgaW5kZXguIFtsZW5ndGg6ICR7dGhpcy5sZW5ndGh9LCBnaXZlbjogJHtwb3N9XWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmF0KHBvcyk7XG4gICAgfVxuXG4gICAgLyoqIG5vb3Agc3RhY2sgKi9cbiAgICBwdWJsaWMgbm9vcFN0YWNrID0gbm9vcDsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtbWVtYmVyLWFjY2Vzc2liaWxpdHlcblxuICAgIC8qKiBwdXNoIHN0YWNrICovXG4gICAgcHVibGljIHB1c2hTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbKyt0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiByZXBsYWNlIHN0YWNrICovXG4gICAgcHVibGljIHJlcGxhY2VTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2tbdGhpcy5faW5kZXhdID0gZGF0YTtcbiAgICB9XG5cbiAgICAvKiogc2VlayBzdGFjayAqL1xuICAgIHB1YmxpYyBzZWVrU3RhY2soZGF0YTogSGlzdG9yeVN0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jbG9zZXN0KGRhdGFbJ0BpZCddKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaFN0YWNrKGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBkaXNwb3NlIG9iamVjdCAqL1xuICAgIHB1YmxpYyBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLl9pbmRleCA9IE5hTjtcbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzT2JqZWN0LFxuICAgIG5vb3AsXG4gICAgJGNkcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCwgd2ViUm9vdCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgbm9ybWFsaXplSWQsXG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgSGlzdG9yeVN0YWNrLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBhZGRpdGlvbmFsIGluZm9ybWF0aW9uICovXG5pbnRlcmZhY2UgRGlzcGF0Y2hJbmZvPFQ+IHtcbiAgICBkZjogRGVmZXJyZWQ7XG4gICAgbmV3SWQ6IHN0cmluZztcbiAgICBvbGRJZDogc3RyaW5nO1xuICAgIHBvc3Rwcm9jOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2Vlayc7XG4gICAgbmV4dFN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xuICAgIHByZXZTdGF0ZT86IEhpc3RvcnlTdGF0ZTxUPjtcbn1cblxuLyoqIEBpbnRlcm5hbCBjb25zdGFudCAqL1xuZW51bSBDb25zdCB7XG4gICAgSEFTSF9QUkVGSVggPSAnIy8nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCByZW1vdmUgdXJsIHBhdGggc2VjdGlvbiAqL1xuY29uc3QgdG9IYXNoID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBpZCA9IC8jLiokLy5leGVjKHVybCk/LlswXTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiB1cmw7XG59O1xuXG4vKiogQGludGVybmFsIHJlbW92ZSB1cmwgcGF0aCBzZWN0aW9uICovXG5jb25zdCB0b1BhdGggPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IGlkID0gdXJsLnN1YnN0cmluZyh3ZWJSb290Lmxlbmd0aCk7XG4gICAgcmV0dXJuIGlkID8gbm9ybWFsaXplSWQoaWQpIDogdXJsO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc2V0RGlzcGF0Y2hJbmZvID0gPFQ+KHN0YXRlOiBULCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBUID0+IHtcbiAgICBzdGF0ZVskY2RwXSA9IGFkZGl0aW9uYWw7XG4gICAgcmV0dXJuIHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VEaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IFQpOiBbVCwgRGlzcGF0Y2hJbmZvPFQ+P10gPT4ge1xuICAgIGlmIChpc09iamVjdChzdGF0ZSkgJiYgc3RhdGVbJGNkcF0pIHtcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbCA9IHN0YXRlWyRjZHBdO1xuICAgICAgICBkZWxldGUgc3RhdGVbJGNkcF07XG4gICAgICAgIHJldHVybiBbc3RhdGUsIGFkZGl0aW9uYWxdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RhdGVdO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcbiAgICBwcml2YXRlIF9kZkdvPzogRGVmZXJyZWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBtb2RlOiAnaGFzaCcgfCAnaGlzdG9yeScsIGlkOiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fd2luZG93ID0gd2luZG93Q29udHh0O1xuICAgICAgICB0aGlzLl9tb2RlID0gbW9kZTtcblxuICAgICAgICB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIgPSB0aGlzLm9uUG9wU3RhdGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcblxuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHZvaWQgdGhpcy5yZXBsYWNlKGlkLCBzdGF0ZSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGlzcG9zZSBvYmplY3RcbiAgICAgKi9cbiAgICBkaXNwb3NlKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9zdGFjay5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMub2ZmKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzWyRzaWduYXR1cmVdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJlc2V0IGhpc3RvcnlcbiAgICAgKi9cbiAgICBhc3luYyByZXNldChvcHRpb25zPzogU2lsZW5jZWFibGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKE51bWJlci5pc05hTih0aGlzLmluZGV4KSB8fCB0aGlzLl9zdGFjay5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBzaWxlbnQgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24gfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgY29uc3QgcHJldlN0YXRlID0gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5iYWNrVG9TZXNzc2lvbk9yaWdpbigpO1xuXG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkKCdTZXNzaW9uSGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpLFxuICAgICAgICAgICAgICAgIG5ld0lkOiB0aGlzLnRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdGhpcy50b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6ICdub29wJyxcbiAgICAgICAgICAgICAgICBwcmV2U3RhdGUsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8odGhpcy5zdGF0ZSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICAvLyBpZiBhbHJlYWR5IGNhbGxlZCwgbm8gcmVhY3Rpb24uXG4gICAgICAgIGlmICh0aGlzLl9kZkdvKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICBpZiAoIWRlbHRhKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJSZWZyZXNoKHRoaXMuc3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fZGZHbztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBhc3luYyByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IHN0YWNrIGluZm9ybWF0aW9uIGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GE44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KGlkOiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QoaWQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgc2V0IGluZGV4ICovXG4gICAgcHJpdmF0ZSBzZXRJbmRleChpZHg6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5pbmRleCA9IGlkeDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbnZlcnQgdG8gSUQgKi9cbiAgICBwcml2YXRlIHRvSWQoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ2hhc2gnID09PSB0aGlzLl9tb2RlID8gdG9IYXNoKHNyYykgOiB0b1BhdGgoc3JjKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNvbnZlcnQgdG8gVVJMICovXG4gICAgcHJpdmF0ZSB0b1VybChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGlkID8gKCgnaGFzaCcgPT09IHRoaXMuX21vZGUpID8gYCR7Q29uc3QuSEFTSF9QUkVGSVh9JHtpZH1gIDogdG9VcmwoaWQpKSA6ICcnO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJpZ2dlciBldmVudCBgcmVmcmVzaGAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyaWdnZXJSZWZyZXNoKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUsIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uLCBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWQgPSBkYXRhWydAaWQnXTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIGRhdGFbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuICAgICAgICBoaXN0b3J5W2Ake21ldGhvZH1TdGF0ZWBdKGRhdGEsICcnLCB0aGlzLnRvVXJsKGlkKSk7XG4gICAgICAgIGNvbnN0IG5ld1VSTCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPiA9IHtcbiAgICAgICAgICAgICAgICBkZjogbmV3IERlZmVycmVkKGNhbmNlbCksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRoaXMudG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0aGlzLnRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogbWV0aG9kLFxuICAgICAgICAgICAgICAgIG5leHRTdGF0ZTogZGF0YSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyhkYXRhLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBkaXNwYXRjaCBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgZGlzcGF0Y2hDaGFuZ2VJbmZvKG5ld1N0YXRlOiBULCBhZGRpdGlvbmFsOiBEaXNwYXRjaEluZm88VD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzZXREaXNwYXRjaEluZm8obmV3U3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB0aGlzLl93aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnLCB7IHN0YXRlIH0pKTtcbiAgICAgICAgYXdhaXQgYWRkaXRpb25hbC5kZjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBwb3BzdGF0ZSBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pID0+IFByb21pc2U8dm9pZD4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgICAgICBjb25zdCB3YWl0UG9wU3RhdGUgPSAoKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoZXY6IFBvcFN0YXRlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZXYuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCBleGVjdXRvcih3YWl0UG9wU3RhdGUpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgcm9sbGJhY2sgaGlzdG9yeSAqL1xuICAgIHByaXZhdGUgYXN5bmMgcm9sbGJhY2tIaXN0b3J5KG1ldGhvZDogc3RyaW5nLCBuZXdJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgY2FzZSAncmVwbGFjZSc6XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUodGhpcy5zdGF0ZSwgJycsIHRoaXMudG9VcmwodGhpcy5pZCkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgICAgICBoaXN0b3J5LmdvKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShhc3luYyAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRoaXMuaW5kZXggLSAodGhpcy5jbG9zZXN0KG5ld0lkKSBhcyBudW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCAhPT0gZGVsdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWx0YSAmJiBoaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZm9sbG93IHRoZSBzZXNzaW9uIGhpc3RvcnkgdW50aWwgYG9yaWdpbmAgKGluIHNpbGVudCkgKi9cbiAgICBwcml2YXRlIGFzeW5jIGJhY2tUb1Nlc3NzaW9uT3JpZ2luKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc09yaWdpbiA9IChzdDogdW5rbm93bik6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdCAmJiAoc3QgYXMgb2JqZWN0KVsnQG9yaWdpbiddO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBoaXN0b3J5LnN0YXRlO1xuICAgICAgICAgICAgd2hpbGUgKCFpc09yaWdpbihzdGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gZXZlbnQgaGFuZGxlcnM6XG5cbiAgICAvKiogQGludGVybmFsIHJlY2VpdmUgYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIG9uUG9wU3RhdGUoZXY6IFBvcFN0YXRlRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBbbmV3U3RhdGUsIGFkZGl0aW9uYWxdID0gcGFyc2VEaXNwYXRjaEluZm8oZXYuc3RhdGUpO1xuICAgICAgICBjb25zdCBuZXdJZCAgID0gYWRkaXRpb25hbD8ubmV3SWQgfHwgdGhpcy50b0lkKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBjb25zdCBtZXRob2QgID0gYWRkaXRpb25hbD8ucG9zdHByb2MgfHwgJ3NlZWsnO1xuICAgICAgICBjb25zdCBkZiAgICAgID0gYWRkaXRpb25hbD8uZGYgfHwgdGhpcy5fZGZHbyB8fCBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgY29uc3Qgb2xkRGF0YSA9IGFkZGl0aW9uYWw/LnByZXZTdGF0ZSB8fCB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCBuZXdEYXRhID0gYWRkaXRpb25hbD8ubmV4dFN0YXRlIHx8IHRoaXMuZGlyZWN0KG5ld0lkKS5zdGF0ZSB8fCBjcmVhdGVEYXRhKG5ld0lkLCBuZXdTdGF0ZSk7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIGRmLmNhdGNoKG5vb3ApO1xuXG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5naW5nJywgbmV3RGF0YSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3RGF0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJSZWZyZXNoKG5ld0RhdGEsIG9sZERhdGEpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIGhpc3Rvcnkg44KS5YWD44Gr5oi744GZXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJvbGxiYWNrSGlzdG9yeShtZXRob2QsIG5ld0lkKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFtbY3JlYXRlU2Vzc2lvbkhpc3RvcnldXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tjcmVhdGVTZXNzaW9uSGlzdG9yeV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKiBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMge1xuICAgIGNvbnRleHQ/OiBXaW5kb3c7XG4gICAgbW9kZT86ICdoYXNoJyB8ICdoaXN0b3J5Jztcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW1Nlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc11dIG9iamVjdFxuICogIC0gYGphYCBbW1Nlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc11dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMpOiBJSGlzdG9yeTxUPiB7XG4gICAgY29uc3QgeyBjb250ZXh0LCBtb2RlIH0gPSBPYmplY3QuYXNzaWduKHsgY29udGV4dDogd2luZG93LCBtb2RlOiAnaGFzaCcgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBTZXNzaW9uSGlzdG9yeShjb250ZXh0LCBtb2RlLCBpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBicm93c2VyIHNlc3Npb24gaGlzdG9yeS5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgcG9zdCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgSGlzdG9yeVN0YWNrLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ01lbW9yeUhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpc1skc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlIHRoaXNbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIHRoaXMuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ01lbW9yeUhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ25vb3AnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJSGlzdG9yeTxUPlxuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpZCAqL1xuICAgIGdldCBpZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaWQ7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBnZXQgaW5kZXgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBzdGFjayBwb29sICovXG4gICAgZ2V0IHN0YWNrKCk6IHJlYWRvbmx5IEhpc3RvcnlTdGF0ZTxUPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmFycmF5O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSBkZWx0YSA/IHRoaXMuc3RhdGUgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhIHx8IDApO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ3NlZWsnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlZ2lzdGVyIG5ldyBoaXN0b3J5LlxuICAgICAqIEBqYSDmlrDopo/lsaXmrbTjga7nmbvpjLJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdXNoKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncHVzaCcsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlcGxhY2UgY3VycmVudCBoaXN0b3J5LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7nva7mj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpZFxuICAgICAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq9JROOCkuaMh+WumlxuICAgICAqIEBwYXJhbSBzdGF0ZVxuICAgICAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCryDjgavntJDjgaXjgY/nirbmhYvjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgU3RhdGUgbWFuYWdlbWVudCBvcHRpb25zXG4gICAgICogIC0gYGphYCDnirbmhYvnrqHnkIbnlKjjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBhc3luYyByZXBsYWNlKGlkOiBzdHJpbmcsIHN0YXRlPzogVCwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVTdGF0ZSgncmVwbGFjZScsIGlkLCBzdGF0ZSwgb3B0aW9ucyB8fCB7fSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBruOCpOODs+ODh+ODg+OCr+OCueOCiOOCiuWJjeaWueOBruWxpeattOOCkuWJiumZpFxuICAgICAqL1xuICAgIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suY2xlYXJGb3J3YXJkKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYQgaW5kZXgg44KS6L+U5Y20XG4gICAgICovXG4gICAgY2xvc2VzdChpZDogc3RyaW5nKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmNsb3Nlc3QoaWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IHN0YWNrIGluZm9ybWF0aW9uIGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GE44K544K/44OD44Kv5oOF5aCx44KS6L+U5Y20XG4gICAgICovXG4gICAgZGlyZWN0KGlkOiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QoaWQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgc2V0IGluZGV4ICovXG4gICAgcHJpdmF0ZSBzZXRJbmRleChpZHg6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5pbmRleCA9IGlkeDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgdXBkYXRlU3RhdGUobWV0aG9kOiAncHVzaCcgfCAncmVwbGFjZScsIGlkOiBzdHJpbmcsIHN0YXRlOiBUIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgY29uc3QgeyBzaWxlbnQsIGNhbmNlbCB9ID0gb3B0aW9ucztcblxuICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IGNyZWF0ZURhdGEoaWQsIHN0YXRlKTtcbiAgICAgICAgaWYgKCdyZXBsYWNlJyA9PT0gbWV0aG9kICYmIDAgPT09IHRoaXMuaW5kZXgpIHtcbiAgICAgICAgICAgIG5ld1N0YXRlWydAb3JpZ2luJ10gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKGNhbmNlbCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKG1ldGhvZCwgZGYsIG5ld1N0YXRlLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBzdGF0ZSBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNoYW5nZVN0YXRlKG1ldGhvZDogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnLCBkZjogRGVmZXJyZWQsIG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjaGFuZ2luZycsIG5ld1N0YXRlLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUsIHByb21pc2VzKTtcblxuICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IE1lbW9yeUhpc3RvcnkoaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgbWVtb3J5IGhpc3RvcnkuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaW5zdGFuY2VbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiXG5pbXBvcnQgeyBwYXRoMnJlZ2V4cCB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwJztcbmltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgQ2xhc3MsXG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBpc09iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IGxvYWRUZW1wbGF0ZVNvdXJjZSwgdG9UZW1wbGF0ZUVsZW1lbnQgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUge1xuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbiAgICBSb3V0ZXJWaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIGZsYXQgUm91dGVQYXJhbWV0ZXJzICovXG5leHBvcnQgdHlwZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzID0gT21pdDxSb3V0ZVBhcmFtZXRlcnMsICdyb3V0ZXMnPiAmIHtcbiAgICAvKiogcmVnZXhwIGZyb20gcGF0aCAqL1xuICAgIHJlZ2V4cDogUmVnRXhwO1xuICAgIC8qKiBrZXlzIG9mIHBhcmFtcyAqL1xuICAgIHBhcmFtS2V5czogc3RyaW5nW107XG4gICAgLyoqIERPTSB0ZW1wbGF0ZSBpbnN0YW5jZSB3aXRoIFZpZXcgZWxlbWVudCAqL1xuICAgICR0ZW1wbGF0ZT86IERPTTtcbiAgICAvKiogcm91dGVyIHZpZXcgaW5zdGFuY2UgZnJvbSBgY29tcG9uZW50YCBwcm9wZXJ0eSAqL1xuICAgIGluc3RhbmNlPzogUm91dGVyVmlldztcbn07XG5cbi8qKiBAaW50ZXJuYWwgUm91dGVDb250ZXh0ICovXG5leHBvcnQgdHlwZSBSb3V0ZUNvbnRleHQgPSBXcml0YWJsZTxSb3V0ZT4gJiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zICYge1xuICAgICdAcGFyYW1zJzogUm91dGVDb250ZXh0UGFyYW1ldGVycztcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgdG8gUm91dGVDb250ZXh0ICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZUNvbnRleHQgPSAodXJsOiBzdHJpbmcsIHJvdXRlcjogUm91dGVyLCBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsIG5hdk9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAvLyBvbWl0IHVuY2xvbmFibGUgcHJvcHNcbiAgICBjb25zdCBmcm9tTmF2aWdhdGUgPSAhIW5hdk9wdGlvbnM7XG4gICAgY29uc3QgZW5zdXJlQ2xvbmUgPSAoY3R4OiB1bmtub3duKTogUm91dGVDb250ZXh0ID0+IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY3R4KSk7XG4gICAgY29uc3QgY29udGV4dCA9IE9iamVjdC5hc3NpZ24oXG4gICAgICAgIHtcbiAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgIHJvdXRlcjogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcm91dGVyLFxuICAgICAgICB9LFxuICAgICAgICBuYXZPcHRpb25zLFxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBmb3JjZSBvdmVycmlkZVxuICAgICAgICAgICAgcXVlcnk6IHt9LFxuICAgICAgICAgICAgcGFyYW1zOiB7fSxcbiAgICAgICAgICAgIHBhdGg6IHBhcmFtcy5wYXRoLFxuICAgICAgICAgICAgJ0BwYXJhbXMnOiBmcm9tTmF2aWdhdGUgPyB1bmRlZmluZWQgOiBwYXJhbXMsXG4gICAgICAgIH0sXG4gICAgKTtcbiAgICByZXR1cm4gZnJvbU5hdmlnYXRlID8gZW5zdXJlQ2xvbmUoY29udGV4dCkgOiBjb250ZXh0IGFzIFJvdXRlQ29udGV4dDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgY29udmVydCBjb250ZXh0IHBhcmFtcyAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IChyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdIHwgdW5kZWZpbmVkKTogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0+IHtcbiAgICBjb25zdCBmbGF0dGVuID0gKHBhcmVudFBhdGg6IHN0cmluZywgbmVzdGVkOiBSb3V0ZVBhcmFtZXRlcnNbXSk6IFJvdXRlUGFyYW1ldGVyc1tdID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmVzdGVkKSB7XG4gICAgICAgICAgICBuLnBhdGggPSBgJHtwYXJlbnRQYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7bm9ybWFsaXplSWQobi5wYXRoKX1gO1xuICAgICAgICAgICAgcmV0dmFsLnB1c2gobik7XG4gICAgICAgICAgICBpZiAobi5yb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5mbGF0dGVuKG4ucGF0aCwgbi5yb3V0ZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmxhdHRlbignJywgaXNBcnJheShyb3V0ZXMpID8gcm91dGVzIDogcm91dGVzID8gW3JvdXRlc10gOiBbXSlcbiAgICAgICAgLm1hcCgoc2VlZDogUm91dGVDb250ZXh0UGFyYW1ldGVycykgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5czogcGF0aDJyZWdleHAuS2V5W10gPSBbXTtcbiAgICAgICAgICAgIHNlZWQucmVnZXhwID0gcGF0aDJyZWdleHAucGF0aFRvUmVnZXhwKHNlZWQucGF0aCwga2V5cyk7XG4gICAgICAgICAgICBzZWVkLnBhcmFtS2V5cyA9IGtleXMuZmlsdGVyKGsgPT4gaXNTdHJpbmcoay5uYW1lKSkubWFwKGsgPT4gay5uYW1lIGFzIHN0cmluZyk7XG4gICAgICAgICAgICByZXR1cm4gc2VlZDtcbiAgICAgICAgfSk7XG59O1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIyR0ZW1wbGF0ZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclZpZXdUZW1wbGF0ZSA9IGFzeW5jIChwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBpZiAocGFyYW1zLiR0ZW1wbGF0ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IHsgY29udGVudCB9ID0gcGFyYW1zO1xuICAgIGlmIChudWxsID09IGNvbnRlbnQpIHtcbiAgICAgICAgLy8gbm9vcCBlbGVtZW50XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSAkPEhUTUxFbGVtZW50PigpO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoY29udGVudFsnc2VsZWN0b3InXSkpIHtcbiAgICAgICAgLy8gZnJvbSBhamF4XG4gICAgICAgIGNvbnN0IHsgc2VsZWN0b3IsIHVybCB9ID0gY29udGVudCBhcyB7IHNlbGVjdG9yOiBzdHJpbmc7IHVybD86IHN0cmluZzsgfTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSB0b1RlbXBsYXRlRWxlbWVudChhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsIH0pKTtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoYHRlbXBsYXRlIGxvYWQgZmFpbGVkLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCB1cmw6ICR7dXJsfV1gKTtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gJChbLi4udGVtcGxhdGUuY29udGVudC5jaGlsZHJlbl0pIGFzIERPTTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMuJHRlbXBsYXRlID0gJChjb250ZW50IGFzIEhUTUxFbGVtZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgUm91dGVDb250ZXh0UGFyYW1ldGVycyNpbnN0YW5jZSAqL1xuZXhwb3J0IGNvbnN0IGVuc3VyZVJvdXRlclZpZXdJbnN0YW5jZSA9IGFzeW5jIChyb3V0ZTogUm91dGVDb250ZXh0KTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgY29uc3QgeyAnQHBhcmFtcyc6IHBhcmFtcyB9ID0gcm91dGU7XG5cbiAgICBpZiAocGFyYW1zLmluc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgeyBjb21wb25lbnQgfSA9IHBhcmFtcztcbiAgICBpZiAoaXNGdW5jdGlvbihjb21wb25lbnQpKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2F3YWl0LXRoZW5hYmxlXG4gICAgICAgICAgICBwYXJhbXMuaW5zdGFuY2UgPSBhd2FpdCBuZXcgKGNvbXBvbmVudCBhcyB1bmtub3duIGFzIENsYXNzKShyb3V0ZSk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgcGFyYW1zLmluc3RhbmNlID0gYXdhaXQgY29tcG9uZW50KHJvdXRlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoY29tcG9uZW50KSkge1xuICAgICAgICBwYXJhbXMuaW5zdGFuY2UgPSBPYmplY3QuYXNzaWduKHsgJ0Byb3V0ZSc6IHJvdXRlIH0sIGNvbXBvbmVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLmluc3RhbmNlID0geyAnQHJvdXRlJzogcm91dGUgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcbiIsImltcG9ydCB7IHBhdGgycmVnZXhwIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tcGF0aDJyZWdleHAnO1xuaW1wb3J0IHsgaXNTdHJpbmcgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIFJFU1VMVF9DT0RFLFxuICAgIGlzUmVzdWx0LFxuICAgIG1ha2VSZXN1bHQsXG59IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIHRvUXVlcnlTdHJpbmdzLFxuICAgIHBhcnNlVXJsUXVlcnksXG4gICAgY29udmVydFVybFBhcmFtVHlwZSxcbn0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi4vc3NyJztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB0eXBlIHtcbiAgICBSb3V0ZXJFdmVudEFyZyxcbiAgICBSb3V0ZXJFdmVudCxcbiAgICBSb3V0ZXJWaWV3LFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zLFxuICAgIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLFxuICAgIFJvdXRlQ29udGV4dCxcbiAgICB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgdG9Sb3V0ZUNvbnRleHQsXG4gICAgZW5zdXJlUm91dGVyVmlld1RlbXBsYXRlLFxuICAgIGVuc3VyZVJvdXRlclZpZXdJbnN0YW5jZSxcbn0gZnJvbSAnLi9pbnRlcm5hbCc7XG5cbi8qKiBAaW50ZXJuYWwgcHJlcGFyZSBJSGlzdG9yeSBvYmplY3QgKi9cbmNvbnN0IHByZXBhcmVIaXN0b3J5ID0gKHNlZWQ6ICdoYXNoJyB8ICdoaXN0b3J5JyB8ICdtZW1vcnknIHwgSUhpc3RvcnkgPSAnaGFzaCcsIGluaXRpYWxQYXRoPzogc3RyaW5nLCBjb250ZXh0PzogV2luZG93KTogSUhpc3Rvcnk8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgcmV0dXJuIChpc1N0cmluZyhzZWVkKVxuICAgICAgICA/ICdtZW1vcnknID09PSBzZWVkID8gY3JlYXRlTWVtb3J5SGlzdG9yeShpbml0aWFsUGF0aCB8fCAnJykgOiBjcmVhdGVTZXNzaW9uSGlzdG9yeShpbml0aWFsUGF0aCB8fCAnJywgdW5kZWZpbmVkLCB7IG1vZGU6IHNlZWQsIGNvbnRleHQgfSlcbiAgICAgICAgOiBzZWVkXG4gICAgKSBhcyBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgYnVpbGROYXZpZ2F0ZVVybCA9IChwYXRoOiBzdHJpbmcsIG9wdGlvbnM6IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBzdHJpbmcgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHBhdGggPSBgLyR7bm9ybWFsaXplSWQocGF0aCl9YDtcbiAgICAgICAgY29uc3QgeyBxdWVyeSwgcGFyYW1zIH0gPSBvcHRpb25zO1xuICAgICAgICBsZXQgdXJsID0gcGF0aDJyZWdleHAuY29tcGlsZShwYXRoKShwYXJhbXMgfHwge30pO1xuICAgICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MocXVlcnkpfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsXG4gICAgICAgICAgICBgQ29uc3RydWN0IHJvdXRlIGRlc3RpbmF0aW9uIGZhaWxlZC4gW3BhdGg6ICR7cGF0aH0sIGRldGFpbDogJHtlcnJvci50b1N0cmluZygpfV1gLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICk7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgcGFyc2VVcmxQYXJhbXMgPSAocm91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHsgdXJsIH0gPSByb3V0ZTtcbiAgICByb3V0ZS5xdWVyeSAgPSB1cmwuaW5jbHVkZXMoJz8nKSA/IHBhcnNlVXJsUXVlcnkobm9ybWFsaXplSWQodXJsKSkgOiB7fTtcbiAgICByb3V0ZS5wYXJhbXMgPSB7fTtcblxuICAgIGNvbnN0IHsgcmVnZXhwLCBwYXJhbUtleXMgfSA9IHJvdXRlWydAcGFyYW1zJ107XG4gICAgaWYgKHBhcmFtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gcmVnZXhwLmV4ZWModXJsKT8ubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHsgcmV0dXJuIHsgdmFsdWUsIGtleTogcGFyYW1LZXlzW2luZGV4IC0gMV0gfTsgfSk7XG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zISkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIGlmIChudWxsICE9IHBhcmFtLmtleSkge1xuICAgICAgICAgICAgICAgIHJvdXRlLnBhcmFtc1twYXJhbS5rZXldID0gY29udmVydFVybFBhcmFtVHlwZShwYXJhbS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUm91dGVyIGltcGxpbWVudCBjbGFzcy5cbiAqIEBqYSBSb3V0ZXIg5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJvdXRlckNvbnRleHQgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSb3V0ZXJFdmVudD4gaW1wbGVtZW50cyBSb3V0ZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlczogUmVjb3JkPHN0cmluZywgUm91dGVDb250ZXh0UGFyYW1ldGVycz4gPSB7fTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5OiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRlbDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRkb2N1bWVudDogRE9NPERvY3VtZW50PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5Q2hhbmdpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeVJlZnJlc2hIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5UmVmcmVzaDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9lcnJvckhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhhbmRsZUVycm9yO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdyxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgdGhpcy5fJGRvY3VtZW50ID0gJCh3aW5kb3c/LmRvY3VtZW50IHx8IGRvY3VtZW50KTtcbiAgICAgICAgdGhpcy5fJGVsID0gJChzZWxlY3RvciwgZWwpO1xuICAgICAgICBpZiAoIXRoaXMuXyRlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCwgYFJvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2hpc3RvcnkgPSBwcmVwYXJlSGlzdG9yeShoaXN0b3J5LCBpbml0aWFsUGF0aCwgd2luZG93IGFzIFdpbmRvdyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIgPSB0aGlzLm9uSGlzdG9yeUNoYW5naW5nLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlciAgPSB0aGlzLm9uSGlzdG9yeVJlZnJlc2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5fZXJyb3JIYW5kbGVyICAgICAgICAgICA9IHRoaXMub25IYW5kbGVFcnJvci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdlcnJvcicsIHRoaXMuX2Vycm9ySGFuZGxlcik7XG5cbiAgICAgICAgLy8gVE9ETzogZm9sbG93IGFuY2hvclxuXG4gICAgICAgIHRoaXMucmVnaXN0ZXIocm91dGVzIGFzIFJvdXRlUGFyYW1ldGVyc1tdLCBzdGFydCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUm91dGVyXG5cbiAgICAvKiogUm91dGVyJ3MgdmlldyBIVE1MIGVsZW1lbnQgKi9cbiAgICBnZXQgZWwoKTogSFRNTEVsZW1lbnQge1xuICAgICAgICByZXR1cm4gdGhpcy5fJGVsWzBdO1xuICAgIH1cblxuICAgIC8qKiBPYmplY3Qgd2l0aCBjdXJyZW50IHJvdXRlIGRhdGEgKi9cbiAgICBnZXQgY3VycmVudFJvdXRlKCk6IFJvdXRlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3Rvcnkuc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIFJvdXRlIHJlZ2lzdHJhdGlvbiAqL1xuICAgIHJlZ2lzdGVyKHJvdXRlczogUm91dGVQYXJhbWV0ZXJzIHwgUm91dGVQYXJhbWV0ZXJzW10sIHJlZnJlc2ggPSBmYWxzZSk6IHRoaXMge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKHJvdXRlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tjb250ZXh0LnBhdGhdID0gY29udGV4dDtcbiAgICAgICAgfVxuICAgICAgICByZWZyZXNoICYmIHZvaWQgdGhpcy5nbygpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQGVuIE5hdmlnYXRlIHRvIG5ldyB2aWV3LiAqL1xuICAgIGFzeW5jIG5hdmlnYXRlKHRvOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZU5hdmlnYXRpb25PcHRpb25zKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHRvKTtcbiAgICAgICAgICAgIGlmICghc2VlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsIGBSb3V0ZSBub3QgZm91bmQuIFt0bzogJHt0b31dYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRPRE86IGRlZmF1bHQgdHJhbnNpdGlvblxuICAgICAgICAgICAgY29uc3Qgb3B0cyAgPSBPYmplY3QuYXNzaWduKHsgdHJhbnNpdGlvbjogdW5kZWZpbmVkLCBpbnRlbnQ6IHVuZGVmaW5lZCB9LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCAgID0gYnVpbGROYXZpZ2F0ZVVybCh0bywgb3B0cyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSA9IHRvUm91dGVDb250ZXh0KHVybCwgdGhpcywgc2VlZCwgb3B0cyk7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IHN1YmZsb3dcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBleGVjIG5hdmlnYXRlXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5wdXNoKHVybCwgcm91dGUpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gYFJvdXRlckV2ZW50QXJnYCBtYWtlciAqL1xuICAgIHByaXZhdGUgbWFrZVJvdXRlckV2ZW50QXJnKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkKTogUm91dGVyRXZlbnRBcmcge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgZnJvbTogb2xkU3RhdGUsXG4gICAgICAgICAgICB0bzogbmV3U3RhdGUsXG4gICAgICAgICAgICBkaXJlY3Rpb246IHRoaXMuX2hpc3RvcnkuZGlyZWN0KG5ld1N0YXRlWydAaWQnXSkuZGlyZWN0aW9uLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCByb3V0ZSBieSB1cmwgKi9cbiAgICBwcml2YXRlIGZpbmRSb3V0ZUNvbnRleHRQYXJhbWV0ZXIodXJsOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZCh1cmwuc3BsaXQoJz8nKVswXSl9YDtcbiAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIE9iamVjdC5rZXlzKHRoaXMuX3JvdXRlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVnZXhwIH0gPSB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICBpZiAocmVnZXhwLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBjb250ZW50IG1haW4gcHJvY2VkdXJlICovXG4gICAgcHJpdmF0ZSBhc3luYyBjaGFuZ2VDb25ldG50KG5leHRSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIHByZXZSb3V0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcGFyc2VVcmxQYXJhbXMobmV4dFJvdXRlKTtcblxuICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICB2aWV3TmV4dCwgJGVsTmV4dCxcbiAgICAgICAgICAgIHZpZXdQcmV2LCAkZWxQcmV2LFxuICAgICAgICBdID0gYXdhaXQgdGhpcy5wcmVwYXJlQ2hhbmdlQ29udGV4dChuZXh0Um91dGUsIHByZXZSb3V0ZSk7XG5cbiAgICAgICAgLy8gVE9ETzpcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uICovXG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlQ2hhbmdlQ29udGV4dChcbiAgICAgICAgbmV4dFJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgcHJldlJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZFxuICAgICk6IFByb21pc2U8W1JvdXRlclZpZXcsIERPTSwgUm91dGVyVmlldywgRE9NXT4ge1xuICAgICAgICBjb25zdCB7ICdAcGFyYW1zJzogcGFyYW1zIH0gPSBuZXh0Um91dGU7XG5cbiAgICAgICAgLy8gdmlldyAkdGVtcGxhdGVcbiAgICAgICAgaWYgKGF3YWl0IGVuc3VyZVJvdXRlclZpZXdUZW1wbGF0ZShwYXJhbXMpKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2xvYWRlZCcsIHRoaXMubWFrZVJvdXRlckV2ZW50QXJnKG5leHRSb3V0ZSwgcHJldlJvdXRlKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB2aWV3IGluc3RhbmNlXG4gICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclZpZXdJbnN0YW5jZShuZXh0Um91dGUpO1xuXG4gICAgICAgIC8vIHZpZXcgJGVsXG4gICAgICAgIGlmICghbmV4dFJvdXRlLmVsKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBwcmV2Um91dGUg44GL44KJ5qeL56+J44GZ44KL5pa55rOV44KC5qSc6KiOXG4gICAgICAgICAgICBuZXh0Um91dGUuZWwgPSBwYXJhbXMuJHRlbXBsYXRlIS5jbG9uZSgpWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIG5leHRSb3V0ZVsnQHBhcmFtcyddLmluc3RhbmNlISwgJChuZXh0Um91dGUuZWwpLCAgICAgICAgICAgIC8vIG5leHRcbiAgICAgICAgICAgIHByZXZSb3V0ZT8uWydAcGFyYW1zJ10uaW5zdGFuY2UgfHwge30sICQocHJldlJvdXRlPy5lbCksICAgIC8vIHByZXZcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICAvKiBlc2xpbnQtZW5hYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24gKi9cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYGNoYW5naW5nYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlDaGFuZ2luZyhuZXh0U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBjYW5jZWw6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKTogYm9vbGVhbiB7XG4gICAgICAgIGxldCBoYW5kbGVkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKHJlYXNvbj86IHVua25vd24pOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgY2FuY2VsKHJlYXNvbik7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5wdWJsaXNoKCd3aWxsLWNoYW5nZScsIHRoaXMubWFrZVJvdXRlckV2ZW50QXJnKG5leHRTdGF0ZSwgdW5kZWZpbmVkKSwgY2FsbGJhY2spO1xuXG4gICAgICAgIHJldHVybiBoYW5kbGVkO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGByZWZyZXNoYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlSZWZyZXNoKG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8UGFydGlhbDxSb3V0ZUNvbnRleHQ+Piwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVuc3VyZSA9IChzdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4pOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiA9PiB7XG4gICAgICAgICAgICBjb25zdCB1cmwgID0gYC8ke3N0YXRlWydAaWQnXX1gO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHVybCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbdXJsOiAke3VybH1dYCwgc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgPT0gc3RhdGVbJ0BwYXJhbXMnXSkge1xuICAgICAgICAgICAgICAgIC8vIFJvdXRlQ29udGV4dFBhcmFtZXRlciDjgpIgYXNzaWduXG4gICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzdGF0ZSwgdG9Sb3V0ZUNvbnRleHQodXJsLCB0aGlzLCBwYXJhbXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdGF0ZSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjtcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gc2NoZWR1bGluZyBgcmVmcmVzaGAgZG9uZS5cbiAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5jaGFuZ2VDb25ldG50KGVuc3VyZShuZXdTdGF0ZSksIG9sZFN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZXJyb3IgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IYW5kbGVFcnJvcihlcnJvcjogdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLnB1Ymxpc2goXG4gICAgICAgICAgICAnZXJyb3InLFxuICAgICAgICAgICAgaXNSZXN1bHQoZXJyb3IpID8gZXJyb3IgOiBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicsIGVycm9yKVxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDcmVhdGUgW1tSb3V0ZXJdXSBvYmplY3QuXG4gKiBAamEgW1tSb3V0ZXJdXSDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgT2JqZWN0KHMpIG9yIHRoZSBzZWxlY3RvciBzdHJpbmcgd2hpY2ggYmVjb21lcyBvcmlnaW4gb2YgW1tET01dXS5cbiAqICAtIGBqYWAgW1tET01dXSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrko576kKeOBvuOBn+OBr+OCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgW1tSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zXV0gb2JqZWN0XG4gKiAgLSBgamFgIFtbUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc11dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyKHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM/OiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKTogUm91dGVyIHtcbiAgICByZXR1cm4gbmV3IFJvdXRlckNvbnRleHQoc2VsZWN0b3IsIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBzdGFydDogdHJ1ZSxcbiAgICB9LCBvcHRpb25zKSk7XG59XG4iXSwibmFtZXMiOlsiJHNpZ25hdHVyZSIsIiQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7O0FBSUc7QUFFSCxDQUFBLFlBQXFCO0FBTWpCOzs7QUFHRztBQUNILElBQUEsSUFLQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtBQUxELElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsb0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxvQkFBNkMsQ0FBQTtRQUM3QyxXQUE0QyxDQUFBLFdBQUEsQ0FBQSxvQ0FBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEVBQUEsZ0NBQXlCLENBQUMsRUFB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RSxRQUE0QixFQUFBO0FBQ2xKLFFBQUEsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUEwQyxLQUFnQztZQUN0RixNQUFNLEdBQUcsR0FBSSxDQUFJLENBQUEsRUFBQSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkQsSUFBSSxJQUFJLElBQUksTUFBTSxFQUFFO0FBQ2hCLGdCQUFBLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyx5Q0FBeUMsRUFBRSxDQUFtQyxnQ0FBQSxFQUFBLEdBQUcsQ0FBRyxDQUFBLENBQUEsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM3SCxhQUFBO0FBQ0QsWUFBQSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUU7O0FBRTFCLGdCQUFBLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDM0QsYUFBQTtBQUNELFlBQUEsT0FBTyxLQUFtQyxDQUFDO0FBQy9DLFNBQUMsQ0FBQztRQUVGLElBQUk7O0FBRUEsWUFBQSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDakUsU0FBQTtBQUFDLFFBQUEsT0FBTyxDQUFDLEVBQUU7QUFDUixZQUFBLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsU0FBQTtLQUNKOztBQUdPLElBQUEsYUFBYSxDQUFDLEtBQWMsRUFBQTtRQUNoQyxJQUFJLENBQUMsT0FBTyxDQUNSLE9BQU8sRUFDUCxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsZ0NBQWdDLEVBQUUsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQ3RILENBQUM7QUFDRixRQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDeEI7QUFDSixDQUFBO0FBRUQ7QUFFQTs7Ozs7Ozs7OztBQVVHO0FBQ2EsU0FBQSxZQUFZLENBQUMsUUFBZ0IsRUFBRSxPQUFtQyxFQUFBO0lBQzlFLE9BQU8sSUFBSSxhQUFhLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDN0MsUUFBQSxLQUFLLEVBQUUsSUFBSTtLQUNkLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNqQjs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvcm91dGVyLyJ9
