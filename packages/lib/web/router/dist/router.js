/*!
 * @cdp/router 0.9.12
 *   generic router scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-path2regexp'), require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/promise'), require('@cdp/web-utils'), require('@cdp/result'), require('@cdp/dom'), require('@cdp/ajax')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-path2regexp', '@cdp/core-utils', '@cdp/events', '@cdp/promise', '@cdp/web-utils', '@cdp/result', '@cdp/dom', '@cdp/ajax'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, extensionPath2regexp, coreUtils, events, promise, webUtils, result, dom, ajax) { 'use strict';

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

    /** @internal */ const window = coreUtils.safe(globalThis.window);
    /** @internal */ const document = coreUtils.safe(globalThis.document);

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
        const uncancellable = new promise.Deferred();
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
            this.noopStack = coreUtils.noop; // eslint-disable-line @typescript-eslint/explicit-member-accessibility
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
            return coreUtils.at(this._stack, index);
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
            coreUtils.sort(candidates, (l, r) => (l.distance > r.distance ? 1 : -1), true);
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
        const id = url.substring(webUtils.webRoot.length);
        return id ? normalizeId(id) : url;
    };
    /** @internal */
    const setDispatchInfo = (state, additional) => {
        state[coreUtils.$cdp] = additional;
        return state;
    };
    /** @internal */
    const parseDispatchInfo = (state) => {
        if (coreUtils.isObject(state) && state[coreUtils.$cdp]) {
            const additional = state[coreUtils.$cdp];
            delete state[coreUtils.$cdp];
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
    class SessionHistory extends events.EventPublisher {
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
            if (this._dfGo || !delta) {
                // if given 0, trigger `refresh`.
                !delta && this.publish('refresh', this.state);
                return this.index;
            }
            const oldIndex = this.index;
            try {
                this._dfGo = new promise.Deferred();
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
            return id ? (('hash' === this._mode) ? `${Const.HASH_PREFIX}${id}` : webUtils.toUrl(id)) : '';
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
                    df: new promise.Deferred(cancel),
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
            const df = additional?.df || this._dfGo || new promise.Deferred();
            const oldData = additional?.prevState || this.state;
            const newData = additional?.nextState || this.direct(newId).state || createData(newId, newState);
            const { cancel, token } = promise.CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method
            try {
                // for fail safe
                df.catch(coreUtils.noop);
                this.publish('changing', newData, cancel);
                if (token.requested) {
                    throw token.reason;
                }
                this._stack[`${method}Stack`](newData);
                this.publish('refresh', newData, oldData);
                df.resolve();
            }
            catch (e) {
                // history を元に戻す
                await this.rollbackHistory(method, newId);
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
    class MemoryHistory extends events.EventPublisher {
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
                void coreUtils.post(() => {
                    this.onChangeState('noop', df, newState, oldState);
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
            // if given 0, trigger `refresh`.
            if (!delta) {
                this.publish('refresh', this.state);
                return this.index;
            }
            const oldIndex = this.index;
            try {
                const oldState = this.state;
                const newState = this._stack.distance(delta);
                const df = new promise.Deferred();
                void coreUtils.post(() => {
                    this.onChangeState('seek', df, newState, oldState);
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
                const df = new promise.Deferred(cancel);
                void coreUtils.post(() => {
                    this.onChangeState(method, df, newState, this.state);
                });
                await df;
            }
            else {
                this._stack[`${method}Stack`](newState);
            }
            return this.index;
        }
        /** @internal change state handler */
        onChangeState(method, df, newState, oldState) {
            const { cancel, token } = promise.CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method
            try {
                this.publish('changing', newState, cancel);
                if (token.requested) {
                    throw token.reason;
                }
                this._stack[`${method}Stack`](newState);
                this.publish('refresh', newState, oldState);
                df.resolve();
            }
            catch (e) {
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
    /** @internal */
    const { pathToRegexp } = extensionPath2regexp.path2regexp;
    /** @internal RouteContextParameters to RouteContext */
    const toRouteContext = (url, params, navOptions) => {
        return Object.assign({
            url,
            query: {},
            params: {},
        }, navOptions, coreUtils.pick(params, 
        // RouteParameters
        'path', 'content', 'component', 
        // RouteContextParameters
        'instance'));
    };
    /** @internal prepare IHistory object */
    const prepareHistory = (seed = 'hash', initialPath, context) => {
        return (coreUtils.isString(seed)
            ? 'memory' === seed ? createMemoryHistory(initialPath || '') : createSessionHistory(initialPath || '', undefined, { mode: seed, context })
            : seed);
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
        return flatten('', coreUtils.isArray(routes) ? routes : routes ? [routes] : [])
            .map((seed) => {
            const keys = [];
            seed.regexp = pathToRegexp(seed.path, keys);
            seed.paramKeys = keys.filter(k => coreUtils.isString(k.name)).map(k => k.name);
            return seed;
        });
    };
    /** @internal */
    const buildNavigateUrl = (path, options) => {
        try {
            path = `/${normalizeId(path)}`;
            const { query, params } = options;
            let url = extensionPath2regexp.path2regexp.compile(path)(params || {});
            if (query) {
                url += `?${ajax.toQueryStrings(query)}`;
            }
            return url;
        }
        catch (error) {
            throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Construct route destination failed. [path: ${path}, detail: ${error.toString()}]`, error);
        }
    };
    /** @internal */
    const parseUrlParams = (ctxparams, route) => {
        const { url } = route;
        route.query = url.includes('?') ? ajax.parseUrlQuery(normalizeId(url)) : {};
        route.params = {};
        const { regexp, paramKeys } = ctxparams;
        if (paramKeys.length) {
            const params = regexp.exec(url)?.map((value, index) => { return { value, key: paramKeys[index - 1] }; });
            for (const param of params) { // eslint-disable-line @typescript-eslint/no-non-null-assertion
                if (null != param.key) {
                    route.params[param.key] = ajax.convertUrlParamType(param.value);
                }
            }
        }
    };
    //__________________________________________________________________________________________________//
    /**
     * @en Router impliment class.
     * @ja Router 実装クラス
     */
    class RouterContext extends events.EventPublisher {
        /**
         * constructor
         */
        constructor(selector, options) {
            super();
            this._routes = {};
            const { routes, start, el, window, history, initialPath, } = options;
            const { document: doc } = window || {};
            this._$el = dom.dom(selector, el);
            this._$document = dom.dom(doc || document);
            if (!this._$el.length) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
            }
            this._history = prepareHistory(history, initialPath, window);
            this._historyChangingHandler = this.onHistoryChanging.bind(this);
            this._historyRefreshHandler = this.onHistoryRefresh.bind(this);
            this._history.on('changing', this._historyChangingHandler);
            this._history.on('refresh', this._historyRefreshHandler);
            this.register(routes, start);
        }
        ///////////////////////////////////////////////////////////////////////
        // implements: Router
        /** Router's view HTML element */
        get el() {
            return this._$el[0];
        }
        /** `DOM` instance with router's view HTML element */
        get $el() {
            return this._$el;
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
            const seed = this.findRouteContextParameter(to);
            if (!seed) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
            }
            const url = buildNavigateUrl(to, options || {});
            const route = toRouteContext(url, seed, options);
            // TODO: subflow
            // exec navigate
            await this._history.push(url, route);
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
                from: oldState || this.currentRoute,
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
        changeConetnt(params, newRoute, oldRoute) {
            parseUrlParams(params, newRoute);
            // TODO:
            console.log(`[new: ${JSON.stringify(newRoute)}, old: ${null == oldRoute ? 'undefined' : JSON.stringify(oldRoute)}]`);
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
            this.publish('will-change', this.makeRouterEventArg(nextState), callback);
            return handled;
        }
        /** @internal `history` `refresh` handler */
        onHistoryRefresh(newState, oldState) {
            // `RouteContext` を保証する
            const find = (state) => {
                const url = `/${state['@id']}`;
                const params = this.findRouteContextParameter(url);
                if (null == params) {
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [url: ${url}]`, state);
                }
                if (null == state.path) {
                    Object.assign(state, toRouteContext(url, params));
                }
                return { params, route: state };
            };
            try {
                const { params, route } = find(newState);
                this.changeConetnt(params, route, oldState);
            }
            catch (e) {
                this.publish('error', e);
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

    exports.createMemoryHistory = createMemoryHistory;
    exports.createRouter = createRouter;
    exports.createSessionHistory = createSessionHistory;
    exports.disposeMemoryHistory = disposeMemoryHistory;
    exports.disposeSessionHistory = disposeSessionHistory;
    exports.resetMemoryHistory = resetMemoryHistory;
    exports.resetSessionHistory = resetSessionHistory;
    for (const k in extensionPath2regexp) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionPath2regexp[k]; }
        });
    }

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaGlzdG9yeS9pbnRlcm5hbC50cyIsImhpc3Rvcnkvc2Vzc2lvbi50cyIsImhpc3RvcnkvbWVtb3J5LnRzIiwicm91dGVyL2NvbnRleHQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvcmVzdHJpY3QtcGx1cy1vcGVyYW5kcyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBST1VURVIgPSBDRFBfS05PV05fTU9EVUxFLk1WQyAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04gKyAxNSxcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXpgJrjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIE1WQ19ST1VURVJfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCAgICAgICAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAxLCAncm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX1JPVVRFX0NBTk5PVF9CRV9SRVNPTFZFRCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDIsICdSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVEICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMywgJ1JvdXRlIG5hdmlnYXRlIGZhaWxlZC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHdpbmRvdyAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy53aW5kb3cpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZG9jdW1lbnQgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbiIsImltcG9ydCB7XG4gICAgV3JpdGFibGUsXG4gICAgUGxhaW5PYmplY3QsXG4gICAgYXQsXG4gICAgc29ydCxcbiAgICBub29wLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgSGlzdG9yeVN0YXRlLCBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgbm9ybWFsemllIGlkIHN0cmluZyAqL1xuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZUlkID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAvLyByZW1vdmUgaGVhZCBvZiBcIiNcIiwgXCIvXCIsIFwiIy9cIiBhbmQgdGFpbCBvZiBcIi9cIlxuICAgIHJldHVybiBzcmMucmVwbGFjZSgvXigjXFwvKXxeWyMvXXxcXHMrJC8sICcnKS5yZXBsYWNlKC9eXFxzKyR8KFxcLyQpLywgJycpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgc3RhY2sgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVEYXRhID0gPFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogSGlzdG9yeVN0YXRlPFQ+ID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7ICdAaWQnOiBub3JtYWxpemVJZChpZCkgfSwgc3RhdGUpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBjcmVhdGUgdW5jYW5jZWxsYWJsZSBkZWZlcnJlZCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCA9ICh3YXJuOiBzdHJpbmcpOiBEZWZlcnJlZCA9PiB7XG4gICAgY29uc3QgdW5jYW5jZWxsYWJsZSA9IG5ldyBEZWZlcnJlZCgpIGFzIFdyaXRhYmxlPERlZmVycmVkPjtcbiAgICB1bmNhbmNlbGxhYmxlLnJlamVjdCA9ICgpID0+IHtcbiAgICAgICAgY29uc29sZS53YXJuKHdhcm4pO1xuICAgICAgICB1bmNhbmNlbGxhYmxlLnJlc29sdmUoKTtcbiAgICB9O1xuICAgIHJldHVybiB1bmNhbmNlbGxhYmxlO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsIHN0YWNrIG1hbmFnZW1lbnQgY29tbW9uIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhY2s8VCA9IFBsYWluT2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RhbmNlKDApO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlWydAaWQnXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBNYXRoLnRydW5jKGlkeCk7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgYXJyYXkoKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc2xpY2UoKTtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgcHVibGljIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gYXQodGhpcy5fc3RhY2ssIGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogY2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC4gKi9cbiAgICBwdWJsaWMgY2xlYXJGb3J3YXJkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjayA9IHRoaXMuX3N0YWNrLnNsaWNlKDAsIHRoaXMuX2luZGV4ICsgMSk7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgaW5kZXggYnkgSUQuICovXG4gICAgcHVibGljIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGlkID0gbm9ybWFsaXplSWQoaWQpO1xuICAgICAgICBjb25zdCB7IF9pbmRleDogYmFzZSB9ID0gdGhpcztcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IHRoaXMuX3N0YWNrXG4gICAgICAgICAgICAubWFwKChzLCBpbmRleCkgPT4geyByZXR1cm4geyBpbmRleCwgZGlzdGFuY2U6IE1hdGguYWJzKGJhc2UgLSBpbmRleCksIC4uLnMgfTsgfSlcbiAgICAgICAgICAgIC5maWx0ZXIocyA9PiBzWydAaWQnXSA9PT0gaWQpXG4gICAgICAgIDtcbiAgICAgICAgc29ydChjYW5kaWRhdGVzLCAobCwgcikgPT4gKGwuZGlzdGFuY2UgPiByLmRpc3RhbmNlID8gMSA6IC0xKSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGVzWzBdPy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogcmV0dXJuIGNsb3NldCBzdGFjayBpbmZvcm1hdGlvbiBieSBJRC4gKi9cbiAgICBwdWJsaWMgZGlyZWN0KGlkOiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5jbG9zZXN0KGlkKTtcbiAgICAgICAgaWYgKG51bGwgPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbjogJ21pc3NpbmcnIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IGluZGV4IC0gdGhpcy5faW5kZXg7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSAwID09PSBkZWx0YVxuICAgICAgICAgICAgICAgID8gJ25vbmUnXG4gICAgICAgICAgICAgICAgOiBkZWx0YSA8IDAgPyAnYmFjaycgOiAnZm9yd2FyZCc7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb24sIGluZGV4LCBzdGF0ZTogdGhpcy5fc3RhY2tbaW5kZXhdIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IGFjdGl2ZSBkYXRhIGZyb20gY3VycmVudCBpbmRleCBvcmlnaW4gKi9cbiAgICBwdWJsaWMgZGlzdGFuY2UoZGVsdGE6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHt0aGlzLmxlbmd0aH0sIGdpdmVuOiAke3Bvc31dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXQocG9zKTtcbiAgICB9XG5cbiAgICAvKiogbm9vcCBzdGFjayAqL1xuICAgIHB1YmxpYyBub29wU3RhY2sgPSBub29wOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tZW1iZXItYWNjZXNzaWJpbGl0eVxuXG4gICAgLyoqIHB1c2ggc3RhY2sgKi9cbiAgICBwdWJsaWMgcHVzaFN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1srK3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHJlcGxhY2Ugc3RhY2sgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiBzZWVrIHN0YWNrICovXG4gICAgcHVibGljIHNlZWtTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNsb3Nlc3QoZGF0YVsnQGlkJ10pO1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhY2soZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGRpc3Bvc2Ugb2JqZWN0ICovXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTmFOO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgaXNPYmplY3QsXG4gICAgbm9vcCxcbiAgICAkY2RwLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU2lsZW5jZWFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IHRvVXJsLCB3ZWJSb290IH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi4vc3NyJztcbmltcG9ydCB7XG4gICAgSUhpc3RvcnksXG4gICAgSGlzdG9yeUV2ZW50LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBIaXN0b3J5U2V0U3RhdGVPcHRpb25zLFxuICAgIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBub3JtYWxpemVJZCxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBIaXN0b3J5U3RhY2ssXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGRpc3BhdGNoIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gKi9cbmludGVyZmFjZSBEaXNwYXRjaEluZm88VD4ge1xuICAgIGRmOiBEZWZlcnJlZDtcbiAgICBuZXdJZDogc3RyaW5nO1xuICAgIG9sZElkOiBzdHJpbmc7XG4gICAgcG9zdHByb2M6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJztcbiAgICBuZXh0U3RhdGU/OiBIaXN0b3J5U3RhdGU8VD47XG4gICAgcHJldlN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xufVxuXG4vKiogQGludGVybmFsIGNvbnN0YW50ICovXG5lbnVtIENvbnN0IHtcbiAgICBIQVNIX1BSRUZJWCA9ICcjLycsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHJlbW92ZSB1cmwgcGF0aCBzZWN0aW9uICovXG5jb25zdCB0b0hhc2ggPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IGlkID0gLyMuKiQvLmV4ZWModXJsKT8uWzBdO1xuICAgIHJldHVybiBpZCA/IG5vcm1hbGl6ZUlkKGlkKSA6IHVybDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgcmVtb3ZlIHVybCBwYXRoIHNlY3Rpb24gKi9cbmNvbnN0IHRvUGF0aCA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgaWQgPSB1cmwuc3Vic3RyaW5nKHdlYlJvb3QubGVuZ3RoKTtcbiAgICByZXR1cm4gaWQgPyBub3JtYWxpemVJZChpZCkgOiB1cmw7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzZXREaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IFQsIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFQgPT4ge1xuICAgIHN0YXRlWyRjZHBdID0gYWRkaXRpb25hbDtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBwYXJzZURpc3BhdGNoSW5mbyA9IDxUPihzdGF0ZTogVCk6IFtULCBEaXNwYXRjaEluZm88VD4/XSA9PiB7XG4gICAgaWYgKGlzT2JqZWN0KHN0YXRlKSAmJiBzdGF0ZVskY2RwXSkge1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsID0gc3RhdGVbJGNkcF07XG4gICAgICAgIGRlbGV0ZSBzdGF0ZVskY2RwXTtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZSwgYWRkaXRpb25hbF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZV07XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ1Nlc3Npb25IaXN0b3J5I3NpZ25hdHVyZScpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBjbGFzcy5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTnrqHnkIbjgq/jg6njgrlcbiAqL1xuY2xhc3MgU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEhpc3RvcnlFdmVudDxUPj4gaW1wbGVtZW50cyBJSGlzdG9yeTxUPiB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfd2luZG93OiBXaW5kb3c7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfbW9kZTogJ2hhc2gnIHwgJ2hpc3RvcnknO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3BvcFN0YXRlSGFuZGxlcjogKGV2OiBQb3BTdGF0ZUV2ZW50KSA9PiB2b2lkO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuICAgIHByaXZhdGUgX2RmR28/OiBEZWZlcnJlZDtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iod2luZG93Q29udHh0OiBXaW5kb3csIG1vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JywgaWQ6IHN0cmluZywgc3RhdGU/OiBUKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXNbJHNpZ25hdHVyZV0gPSB0cnVlO1xuICAgICAgICB0aGlzLl93aW5kb3cgPSB3aW5kb3dDb250eHQ7XG4gICAgICAgIHRoaXMuX21vZGUgPSBtb2RlO1xuXG4gICAgICAgIHRoaXMuX3BvcFN0YXRlSGFuZGxlciA9IHRoaXMub25Qb3BTdGF0ZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlIHRoaXNbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgeyBsb2NhdGlvbiB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICBjb25zdCBwcmV2U3RhdGUgPSB0aGlzLl9zdGFjay5zdGF0ZTtcbiAgICAgICAgY29uc3Qgb2xkVVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICB0aGlzLnNldEluZGV4KDApO1xuICAgICAgICB0aGlzLmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICBhd2FpdCB0aGlzLmJhY2tUb1Nlc3NzaW9uT3JpZ2luKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ1Nlc3Npb25IaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRoaXMudG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0aGlzLnRvSWQob2xkVVJMKSxcbiAgICAgICAgICAgICAgICBwb3N0cHJvYzogJ25vb3AnLFxuICAgICAgICAgICAgICAgIHByZXZTdGF0ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRpc3BhdGNoQ2hhbmdlSW5mbyh0aGlzLnN0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIC8vIGlmIGFscmVhZHkgY2FsbGVkLCBubyByZWFjdGlvbi5cbiAgICAgICAgaWYgKHRoaXMuX2RmR28gfHwgIWRlbHRhKSB7XG4gICAgICAgICAgICAvLyBpZiBnaXZlbiAwLCB0cmlnZ2VyIGByZWZyZXNoYC5cbiAgICAgICAgICAgICFkZWx0YSAmJiB0aGlzLnB1Ymxpc2goJ3JlZnJlc2gnLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb2xkSW5kZXggPSB0aGlzLmluZGV4O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gbmV3IERlZmVycmVkKCk7XG4gICAgICAgICAgICB0aGlzLl9zdGFjay5kaXN0YW5jZShkZWx0YSk7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuaGlzdG9yeS5nbyhkZWx0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9kZkdvO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XG4gICAgICAgICAgICB0aGlzLnNldEluZGV4KG9sZEluZGV4KTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2RmR28gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zIHx8IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIGFzeW5jIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zIHx8IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgY2xlYXJGb3J3YXJkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBpbmRleCBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhCBpbmRleCDjgpLov5TljbRcbiAgICAgKi9cbiAgICBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suY2xvc2VzdChpZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgSUQuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBnyBJRCDjgYvjgonmnIDjgoLov5HjgYTjgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QoaWQ6IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmRpcmVjdChpZCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgaW5kZXggKi9cbiAgICBwcml2YXRlIHNldEluZGV4KGlkeDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmluZGV4ID0gaWR4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBJRCAqL1xuICAgIHByaXZhdGUgdG9JZChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnaGFzaCcgPT09IHRoaXMuX21vZGUgPyB0b0hhc2goc3JjKSA6IHRvUGF0aChzcmMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY29udmVydCB0byBVUkwgKi9cbiAgICBwcml2YXRlIHRvVXJsKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gaWQgPyAoKCdoYXNoJyA9PT0gdGhpcy5fbW9kZSkgPyBgJHtDb25zdC5IQVNIX1BSRUZJWH0ke2lkfWAgOiB0b1VybChpZCkpIDogJyc7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24sIGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcblxuICAgICAgICBjb25zdCBkYXRhID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZCA9IGRhdGFbJ0BpZCddO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgZGF0YVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGhpc3RvcnlbYCR7bWV0aG9kfVN0YXRlYF0oZGF0YSwgJycsIHRoaXMudG9VcmwoaWQpKTtcbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBuZXcgRGVmZXJyZWQoY2FuY2VsKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdGhpcy50b0lkKG5ld1VSTCksXG4gICAgICAgICAgICAgICAgb2xkSWQ6IHRoaXMudG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgbmV4dFN0YXRlOiBkYXRhLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKGRhdGEsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0oZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRpc3BhdGNoIGBwb3BzdGF0ZWAgZXZlbnRzICovXG4gICAgcHJpdmF0ZSBhc3luYyBkaXNwYXRjaENoYW5nZUluZm8obmV3U3RhdGU6IFQsIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHNldERpc3BhdGNoSW5mbyhuZXdTdGF0ZSwgYWRkaXRpb25hbCk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBQb3BTdGF0ZUV2ZW50KCdwb3BzdGF0ZScsIHsgc3RhdGUgfSkpO1xuICAgICAgICBhd2FpdCBhZGRpdGlvbmFsLmRmO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgc2lsZW50IHBvcHN0YXRlIGV2ZW50IGxpc3RuZXIgc2NvcGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGV4ZWN1dG9yOiAod2FpdDogKCkgPT4gUHJvbWlzZTx1bmtub3duPikgPT4gUHJvbWlzZTx2b2lkPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgICAgIGNvbnN0IHdhaXRQb3BTdGF0ZSA9ICgpOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIChldjogUG9wU3RhdGVFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShldi5zdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IGV4ZWN1dG9yKHdhaXRQb3BTdGF0ZSk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCByb2xsYmFjayBoaXN0b3J5ICovXG4gICAgcHJpdmF0ZSBhc3luYyByb2xsYmFja0hpc3RvcnkobWV0aG9kOiBzdHJpbmcsIG5ld0lkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcbiAgICAgICAgICAgICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZSh0aGlzLnN0YXRlLCAnJywgdGhpcy50b1VybCh0aGlzLmlkKSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwdXNoJzpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgICAgIGhpc3RvcnkuZ28oLTEpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gdGhpcy5pbmRleCAtICh0aGlzLmNsb3Nlc3QobmV3SWQpIGFzIG51bWJlcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwICE9PSBkZWx0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbHRhICYmIGhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmb2xsb3cgdGhlIHNlc3Npb24gaGlzdG9yeSB1bnRpbCBgb3JpZ2luYCAoaW4gc2lsZW50KSAqL1xuICAgIHByaXZhdGUgYXN5bmMgYmFja1RvU2Vzc3Npb25PcmlnaW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzT3JpZ2luID0gKHN0OiB1bmtub3duKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0ICYmIChzdCBhcyBvYmplY3QpWydAb3JpZ2luJ107XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IGhpc3Rvcnkuc3RhdGU7XG4gICAgICAgICAgICB3aGlsZSAoIWlzT3JpZ2luKHN0YXRlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB3YWl0KCk7XG4gICAgICAgICAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgcmVjZWl2ZSBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25Qb3BTdGF0ZShldjogUG9wU3RhdGVFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IFtuZXdTdGF0ZSwgYWRkaXRpb25hbF0gPSBwYXJzZURpc3BhdGNoSW5mbyhldi5zdGF0ZSk7XG4gICAgICAgIGNvbnN0IG5ld0lkICAgPSBhZGRpdGlvbmFsPy5uZXdJZCB8fCB0aGlzLnRvSWQobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGNvbnN0IG1ldGhvZCAgPSBhZGRpdGlvbmFsPy5wb3N0cHJvYyB8fCAnc2Vlayc7XG4gICAgICAgIGNvbnN0IGRmICAgICAgPSBhZGRpdGlvbmFsPy5kZiB8fCB0aGlzLl9kZkdvIHx8IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICBjb25zdCBvbGREYXRhID0gYWRkaXRpb25hbD8ucHJldlN0YXRlIHx8IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBhZGRpdGlvbmFsPy5uZXh0U3RhdGUgfHwgdGhpcy5kaXJlY3QobmV3SWQpLnN0YXRlIHx8IGNyZWF0ZURhdGEobmV3SWQsIG5ld1N0YXRlKTtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZm9yIGZhaWwgc2FmZVxuICAgICAgICAgICAgZGYuY2F0Y2gobm9vcCk7XG5cbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdpbmcnLCBuZXdEYXRhLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdEYXRhKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgncmVmcmVzaCcsIG5ld0RhdGEsIG9sZERhdGEpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIGhpc3Rvcnkg44KS5YWD44Gr5oi744GZXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJvbGxiYWNrSGlzdG9yeShtZXRob2QsIG5ld0lkKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFtbY3JlYXRlU2Vzc2lvbkhpc3RvcnldXSgpIG9wdGlvbnMuXG4gKiBAamEgW1tjcmVhdGVTZXNzaW9uSGlzdG9yeV1dKCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKiBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMge1xuICAgIGNvbnRleHQ/OiBXaW5kb3c7XG4gICAgbW9kZT86ICdoYXNoJyB8ICdoaXN0b3J5Jztcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBbW1Nlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc11dIG9iamVjdFxuICogIC0gYGphYCBbW1Nlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc11dIOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMpOiBJSGlzdG9yeTxUPiB7XG4gICAgY29uc3QgeyBjb250ZXh0LCBtb2RlIH0gPSBPYmplY3QuYXNzaWduKHsgY29udGV4dDogd2luZG93LCBtb2RlOiAnaGFzaCcgfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIG5ldyBTZXNzaW9uSGlzdG9yeShjb250ZXh0LCBtb2RlLCBpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBicm93c2VyIHNlc3Npb24gaGlzdG9yeS5cbiAqIEBqYSDjg5bjg6njgqbjgrbjgrvjg4Pjgrfjg6fjg7PlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYFNlc3Npb25IaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgU2Vzc2lvbkhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzZXRTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlU2Vzc2lvbkhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgU2Vzc2lvbkhpc3Rvcnk8VD4pLmRpc3Bvc2UoKTtcbn1cbiIsImltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgcG9zdCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlFdmVudCxcbiAgICBIaXN0b3J5U3RhdGUsXG4gICAgSGlzdG9yeVNldFN0YXRlT3B0aW9ucyxcbiAgICBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgY3JlYXRlRGF0YSxcbiAgICBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQsXG4gICAgSGlzdG9yeVN0YWNrLFxufSBmcm9tICcuL2ludGVybmFsJztcblxuLyoqIEBpbnRlcm5hbCBpbnN0YW5jZSBzaWduYXR1cmUgKi9cbmNvbnN0ICRzaWduYXR1cmUgPSBTeW1ib2woJ01lbW9yeUhpc3Rvcnkjc2lnbmF0dXJlJyk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IGNsYXNzLlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCr+ODqeOCuVxuICovXG5jbGFzcyBNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YWNrID0gbmV3IEhpc3RvcnlTdGFjazxUPigpO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihpZDogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpc1skc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdm9pZCB0aGlzLnJlcGxhY2UoaWQsIHN0YXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkaXNwb3NlIG9iamVjdFxuICAgICAqL1xuICAgIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5vZmYoKTtcbiAgICAgICAgZGVsZXRlIHRoaXNbJHNpZ25hdHVyZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmVzZXQgaGlzdG9yeVxuICAgICAqL1xuICAgIGFzeW5jIHJlc2V0KG9wdGlvbnM/OiBTaWxlbmNlYWJsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoTnVtYmVyLmlzTmFOKHRoaXMuaW5kZXgpIHx8IHRoaXMuX3N0YWNrLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHNpbGVudCB9ID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIHRoaXMuY2xlYXJGb3J3YXJkKCk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgZGYgPSBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ01lbW9yeUhpc3RvcnkjcmVzZXQoKSBpcyB1bmNhbmNlbGxhYmxlIG1ldGhvZC4nKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkNoYW5nZVN0YXRlKCdub29wJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogZ2V0IGRhdGEgYnkgaW5kZXguICovXG4gICAgYXQoaW5kZXg6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hdChpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYmFja3dhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGJhY2soKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgLy8gaWYgZ2l2ZW4gMCwgdHJpZ2dlciBgcmVmcmVzaGAuXG4gICAgICAgIGlmICghZGVsdGEpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgncmVmcmVzaCcsIHRoaXMuc3RhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG9sZFN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkNoYW5nZVN0YXRlKCdzZWVrJywgZGYsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGF3YWl0IGRmO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XG4gICAgICAgICAgICB0aGlzLnNldEluZGV4KG9sZEluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWdpc3RlciBuZXcgaGlzdG9yeS5cbiAgICAgKiBAamEg5paw6KaP5bGl5q2044Gu55m76YyyXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVzaChpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3B1c2gnLCBpZCwgc3RhdGUsIG9wdGlvbnMgfHwge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXBsYWNlIGN1cnJlbnQgaGlzdG9yeS5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu572u5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaWRcbiAgICAgKiAgLSBgZW5gIFNwZWNpZmllZCBzdGFjayBJRFxuICAgICAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gc3RhdGVcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG9iamVjdCBhc3NvY2lhdGVkIHdpdGggdGhlIHN0YWNrXG4gICAgICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIFN0YXRlIG1hbmFnZW1lbnQgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg54q25oWL566h55CG55So44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgYXN5bmMgcmVwbGFjZShpZDogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlU3RhdGUoJ3JlcGxhY2UnLCBpZCwgc3RhdGUsIG9wdGlvbnMgfHwge30pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBmb3J3YXJkIGhpc3RvcnkgZnJvbSBjdXJyZW50IGluZGV4LlxuICAgICAqIEBqYSDnj77lnKjjga7lsaXmrbTjga7jgqTjg7Pjg4fjg4Pjgq/jgrnjgojjgorliY3mlrnjga7lsaXmrbTjgpLliYrpmaRcbiAgICAgKi9cbiAgICBjbGVhckZvcndhcmQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmNsZWFyRm9yd2FyZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGNsb3NldCBzdGFjayBpbmZvcm1hdGlvbiBieSBJRC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44GfIElEIOOBi+OCieacgOOCgui/keOBhOOCueOCv+ODg+OCr+aDheWgseOCkui/lOWNtFxuICAgICAqL1xuICAgIGRpcmVjdChpZDogc3RyaW5nKTogSGlzdG9yeURpcmVjdFJldHVyblR5cGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suZGlyZWN0KGlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSBjcmVhdGVEYXRhKGlkLCBzdGF0ZSk7XG4gICAgICAgIGlmICgncmVwbGFjZScgPT09IG1ldGhvZCAmJiAwID09PSB0aGlzLmluZGV4KSB7XG4gICAgICAgICAgICBuZXdTdGF0ZVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IG5ldyBEZWZlcnJlZChjYW5jZWwpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2hhbmdlU3RhdGUobWV0aG9kLCBkZiwgbmV3U3RhdGUsIHRoaXMuc3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld1N0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgY2hhbmdlIHN0YXRlIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uQ2hhbmdlU3RhdGUobWV0aG9kOiAnbm9vcCcgfCAncHVzaCcgfCAncmVwbGFjZScgfCAnc2VlaycsIGRmOiBEZWZlcnJlZCwgbmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxUPiwgb2xkU3RhdGU6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGNhbmNlbCwgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZSgpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5naW5nJywgbmV3U3RhdGUsIGNhbmNlbCk7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0b2tlbi5yZWFzb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX3N0YWNrW2Ake21ldGhvZH1TdGFja2BdKG5ld1N0YXRlKTtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgncmVmcmVzaCcsIG5ld1N0YXRlLCBvbGRTdGF0ZSk7XG5cbiAgICAgICAgICAgIGRmLnJlc29sdmUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgZGYucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNZW1vcnlIaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaWQ6IHN0cmluZywgc3RhdGU/OiBUKTogSUhpc3Rvcnk8VD4ge1xuICAgIHJldHVybiBuZXcgTWVtb3J5SGlzdG9yeShpZCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEBlbiBSZXNldCBtZW1vcnkgaGlzdG9yeS5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTjga7jg6rjgrvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gaW5zdGFuY2VcbiAqICAtIGBlbmAgYE1lbW9yeUhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBNZW1vcnlIaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc2V0TWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPiwgb3B0aW9ucz86IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpbnN0YW5jZVskc2lnbmF0dXJlXSAmJiBhd2FpdCAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikucmVzZXQob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIERpc3Bvc2UgbWVtb3J5IGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwb3NlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPik6IHZvaWQge1xuICAgIGluc3RhbmNlWyRzaWduYXR1cmVdICYmIChpbnN0YW5jZSBhcyBNZW1vcnlIaXN0b3J5PFQ+KS5kaXNwb3NlKCk7XG59XG4iLCJpbXBvcnQgeyBwYXRoMnJlZ2V4cCB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwJztcbmltcG9ydCB7XG4gICAgaXNTdHJpbmcsXG4gICAgaXNBcnJheSxcbiAgICBwaWNrLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7XG4gICAgRE9NLFxuICAgIGRvbSBhcyAkLFxufSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQge1xuICAgIHRvUXVlcnlTdHJpbmdzLFxuICAgIHBhcnNlVXJsUXVlcnksXG4gICAgY29udmVydFVybFBhcmFtVHlwZSxcbn0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi4vc3NyJztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQge1xuICAgIElIaXN0b3J5LFxuICAgIEhpc3RvcnlTdGF0ZSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB0eXBlIHtcbiAgICBSb3V0ZXJFdmVudEFyZyxcbiAgICBSb3V0ZXJFdmVudCxcbiAgICBSb3V0ZVBhcmFtZXRlcnMsXG4gICAgUm91dGUsXG4gICAgUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZU5hdmlnYXRpb25PcHRpb25zLFxuICAgIFJvdXRlcixcbiAgICBSb3V0ZXJWaWV3LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIGZsYXQgUm91dGVQYXJhbWV0ZXJzICovXG50eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSBPbWl0PFJvdXRlUGFyYW1ldGVycywgJ3JvdXRlcyc+ICYge1xuICAgIC8qKiByZWdleHAgZnJvbSBwYXRoICovXG4gICAgcmVnZXhwOiBSZWdFeHA7XG4gICAgLyoqIGtleXMgb2YgcGFyYW1zICovXG4gICAgcGFyYW1LZXlzOiBzdHJpbmdbXTtcbiAgICAvKiogRE9NIHRlbXBsYXRlIGluc3RhbmNlIHdpdGggVmlldyBlbGVtZW50ICovXG4gICAgJHRlbXBsYXRlPzogRE9NPEhUTUxUZW1wbGF0ZUVsZW1lbnQ+O1xuICAgIC8qKiByb3V0ZXIgdmlldyBpbnN0YW5jZSBmcm9tIGBjb21wb25lbnRgIHByb3BlcnR5ICovXG4gICAgaW5zdGFuY2U/OiBSb3V0ZXJWaWV3O1xufTtcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHQgKi9cbnR5cGUgUm91dGVDb250ZXh0XG4gICAgPSBSb3V0ZVxuICAgICYgUGljazxSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCAnaW5zdGFuY2UnPlxuICAgICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IHsgcGF0aFRvUmVnZXhwIH0gPSBwYXRoMnJlZ2V4cDtcblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHRvIFJvdXRlQ29udGV4dCAqL1xuY29uc3QgdG9Sb3V0ZUNvbnRleHQgPSAodXJsOiBzdHJpbmcsIHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycywgbmF2T3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBSb3V0ZUNvbnRleHQgPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgdXJsLFxuICAgICAgICBxdWVyeToge30sXG4gICAgICAgIHBhcmFtczoge30sXG4gICAgfSxcbiAgICBuYXZPcHRpb25zLFxuICAgIHBpY2soXG4gICAgICAgIHBhcmFtcyxcbiAgICAgICAgLy8gUm91dGVQYXJhbWV0ZXJzXG4gICAgICAgICdwYXRoJyxcbiAgICAgICAgJ2NvbnRlbnQnLFxuICAgICAgICAnY29tcG9uZW50JyxcbiAgICAgICAgLy8gUm91dGVDb250ZXh0UGFyYW1ldGVyc1xuICAgICAgICAnaW5zdGFuY2UnLFxuICAgICkpO1xufTtcblxuLyoqIEBpbnRlcm5hbCBwcmVwYXJlIElIaXN0b3J5IG9iamVjdCAqL1xuY29uc3QgcHJlcGFyZUhpc3RvcnkgPSAoc2VlZDogJ2hhc2gnIHwgJ2hpc3RvcnknIHwgJ21lbW9yeScgfCBJSGlzdG9yeSA9ICdoYXNoJywgaW5pdGlhbFBhdGg/OiBzdHJpbmcsIGNvbnRleHQ/OiBXaW5kb3cpOiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICByZXR1cm4gKGlzU3RyaW5nKHNlZWQpXG4gICAgICAgID8gJ21lbW9yeScgPT09IHNlZWQgPyBjcmVhdGVNZW1vcnlIaXN0b3J5KGluaXRpYWxQYXRoIHx8ICcnKSA6IGNyZWF0ZVNlc3Npb25IaXN0b3J5KGluaXRpYWxQYXRoIHx8ICcnLCB1bmRlZmluZWQsIHsgbW9kZTogc2VlZCwgY29udGV4dCB9KVxuICAgICAgICA6IHNlZWRcbiAgICApIGFzIElIaXN0b3J5PFJvdXRlQ29udGV4dD47XG59O1xuXG4vKiogQGludGVybmFsIGNvbnZlcnQgY29udGV4dCBwYXJhbXMgKi9cbmNvbnN0IHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyA9IChyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdIHwgdW5kZWZpbmVkKTogUm91dGVDb250ZXh0UGFyYW1ldGVyc1tdID0+IHtcbiAgICBjb25zdCBmbGF0dGVuID0gKHBhcmVudFBhdGg6IHN0cmluZywgbmVzdGVkOiBSb3V0ZVBhcmFtZXRlcnNbXSk6IFJvdXRlUGFyYW1ldGVyc1tdID0+IHtcbiAgICAgICAgY29uc3QgcmV0dmFsOiBSb3V0ZVBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IG4gb2YgbmVzdGVkKSB7XG4gICAgICAgICAgICBuLnBhdGggPSBgJHtwYXJlbnRQYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7bm9ybWFsaXplSWQobi5wYXRoKX1gO1xuICAgICAgICAgICAgcmV0dmFsLnB1c2gobik7XG4gICAgICAgICAgICBpZiAobi5yb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICByZXR2YWwucHVzaCguLi5mbGF0dGVuKG4ucGF0aCwgbi5yb3V0ZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH07XG5cbiAgICByZXR1cm4gZmxhdHRlbignJywgaXNBcnJheShyb3V0ZXMpID8gcm91dGVzIDogcm91dGVzID8gW3JvdXRlc10gOiBbXSlcbiAgICAgICAgLm1hcCgoc2VlZDogUm91dGVDb250ZXh0UGFyYW1ldGVycykgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5czogcGF0aDJyZWdleHAuS2V5W10gPSBbXTtcbiAgICAgICAgICAgIHNlZWQucmVnZXhwID0gcGF0aFRvUmVnZXhwKHNlZWQucGF0aCwga2V5cyk7XG4gICAgICAgICAgICBzZWVkLnBhcmFtS2V5cyA9IGtleXMuZmlsdGVyKGsgPT4gaXNTdHJpbmcoay5uYW1lKSkubWFwKGsgPT4gay5uYW1lIGFzIHN0cmluZyk7XG4gICAgICAgICAgICByZXR1cm4gc2VlZDtcbiAgICAgICAgfSk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBidWlsZE5hdmlnYXRlVXJsID0gKHBhdGg6IHN0cmluZywgb3B0aW9uczogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IHN0cmluZyA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcGF0aCA9IGAvJHtub3JtYWxpemVJZChwYXRoKX1gO1xuICAgICAgICBjb25zdCB7IHF1ZXJ5LCBwYXJhbXMgfSA9IG9wdGlvbnM7XG4gICAgICAgIGxldCB1cmwgPSBwYXRoMnJlZ2V4cC5jb21waWxlKHBhdGgpKHBhcmFtcyB8fCB7fSk7XG4gICAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhxdWVyeSl9YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoXG4gICAgICAgICAgICBSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCxcbiAgICAgICAgICAgIGBDb25zdHJ1Y3Qgcm91dGUgZGVzdGluYXRpb24gZmFpbGVkLiBbcGF0aDogJHtwYXRofSwgZGV0YWlsOiAke2Vycm9yLnRvU3RyaW5nKCl9XWAsXG4gICAgICAgICAgICBlcnJvcixcbiAgICAgICAgKTtcbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBwYXJzZVVybFBhcmFtcyA9IChjdHhwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsIHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkID0+IHtcbiAgICBjb25zdCB7IHVybCB9ID0gcm91dGU7XG4gICAgcm91dGUucXVlcnkgID0gdXJsLmluY2x1ZGVzKCc/JykgPyBwYXJzZVVybFF1ZXJ5KG5vcm1hbGl6ZUlkKHVybCkpIDoge307XG4gICAgcm91dGUucGFyYW1zID0ge307XG5cbiAgICBjb25zdCB7IHJlZ2V4cCwgcGFyYW1LZXlzIH0gPSBjdHhwYXJhbXM7XG4gICAgaWYgKHBhcmFtS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gcmVnZXhwLmV4ZWModXJsKT8ubWFwKCh2YWx1ZSwgaW5kZXgpID0+IHsgcmV0dXJuIHsgdmFsdWUsIGtleTogcGFyYW1LZXlzW2luZGV4IC0gMV0gfTsgfSk7XG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zISkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIGlmIChudWxsICE9IHBhcmFtLmtleSkge1xuICAgICAgICAgICAgICAgIHJvdXRlLnBhcmFtc1twYXJhbS5rZXldID0gY29udmVydFVybFBhcmFtVHlwZShwYXJhbS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUm91dGVyIGltcGxpbWVudCBjbGFzcy5cbiAqIEBqYSBSb3V0ZXIg5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJvdXRlckNvbnRleHQgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSb3V0ZXJFdmVudD4gaW1wbGVtZW50cyBSb3V0ZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlczogUmVjb3JkPHN0cmluZywgUm91dGVDb250ZXh0UGFyYW1ldGVycz4gPSB7fTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5OiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRlbDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRkb2N1bWVudDogRE9NPERvY3VtZW50PjtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5Q2hhbmdpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfaGlzdG9yeVJlZnJlc2hIYW5kbGVyOiB0eXBlb2YgUm91dGVyQ29udGV4dC5wcm90b3R5cGUub25IaXN0b3J5UmVmcmVzaDtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3I6IHN0cmluZywgb3B0aW9uczogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgZWwsXG4gICAgICAgICAgICB3aW5kb3csXG4gICAgICAgICAgICBoaXN0b3J5LFxuICAgICAgICAgICAgaW5pdGlhbFBhdGgsXG4gICAgICAgIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIGNvbnN0IHsgZG9jdW1lbnQ6IGRvYyB9ID0gd2luZG93IHx8IHt9O1xuXG4gICAgICAgIHRoaXMuXyRlbCA9ICQoc2VsZWN0b3IsIGVsKTtcbiAgICAgICAgdGhpcy5fJGRvY3VtZW50ID0gJChkb2MgYXMgRG9jdW1lbnQgfHwgZG9jdW1lbnQpO1xuICAgICAgICBpZiAoIXRoaXMuXyRlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9FTEVNRU5UX05PVF9GT1VORCwgYFJvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4gW3NlbGVjdG9yOiAke3NlbGVjdG9yfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2hpc3RvcnkgPSBwcmVwYXJlSGlzdG9yeShoaXN0b3J5LCBpbml0aWFsUGF0aCwgd2luZG93IGFzIFdpbmRvdyk7XG4gICAgICAgIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIgID0gdGhpcy5vbkhpc3RvcnlDaGFuZ2luZy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIgPSB0aGlzLm9uSGlzdG9yeVJlZnJlc2guYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyKHJvdXRlcyBhcyBSb3V0ZVBhcmFtZXRlcnNbXSwgc3RhcnQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogYERPTWAgaW5zdGFuY2Ugd2l0aCByb3V0ZXIncyB2aWV3IEhUTUwgZWxlbWVudCAqL1xuICAgIGdldCAkZWwoKTogRE9NIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbDtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiB0aGlzIHtcbiAgICAgICAgZm9yIChjb25zdCBjb250ZXh0IG9mIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyhyb3V0ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3V0ZXNbY29udGV4dC5wYXRoXSA9IGNvbnRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmVmcmVzaCAmJiB2b2lkIHRoaXMuZ28oKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEBlbiBOYXZpZ2F0ZSB0byBuZXcgdmlldy4gKi9cbiAgICBhc3luYyBuYXZpZ2F0ZSh0bzogc3RyaW5nLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBjb25zdCBzZWVkID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHRvKTtcbiAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELCBgUm91dGUgbm90IGZvdW5kLiBbdG86ICR7dG99XWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXJsICA9IGJ1aWxkTmF2aWdhdGVVcmwodG8sIG9wdGlvbnMgfHwge30gYXMgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHJvdXRlID0gdG9Sb3V0ZUNvbnRleHQodXJsLCBzZWVkLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBUT0RPOiBzdWJmbG93XG5cbiAgICAgICAgLy8gZXhlYyBuYXZpZ2F0ZVxuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LnB1c2godXJsLCByb3V0ZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIGdvKGRlbHRhPzogbnVtYmVyKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2hpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIGNvbW1vbiBgUm91dGVyRXZlbnRBcmdgIG1ha2VyICovXG4gICAgcHJpdmF0ZSBtYWtlUm91dGVyRXZlbnRBcmcobmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBvbGRTdGF0ZT86IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+KTogUm91dGVyRXZlbnRBcmcge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgZnJvbTogb2xkU3RhdGUgfHwgdGhpcy5jdXJyZW50Um91dGUsXG4gICAgICAgICAgICB0bzogbmV3U3RhdGUsXG4gICAgICAgICAgICBkaXJlY3Rpb246IHRoaXMuX2hpc3RvcnkuZGlyZWN0KG5ld1N0YXRlWydAaWQnXSkuZGlyZWN0aW9uLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZmluZCByb3V0ZSBieSB1cmwgKi9cbiAgICBwcml2YXRlIGZpbmRSb3V0ZUNvbnRleHRQYXJhbWV0ZXIodXJsOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZCh1cmwuc3BsaXQoJz8nKVswXSl9YDtcbiAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIE9iamVjdC5rZXlzKHRoaXMuX3JvdXRlcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVnZXhwIH0gPSB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICBpZiAocmVnZXhwLnRlc3Qoa2V5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZXNbcGF0aF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBjb250ZW50IG1haW4gcHJvY2VkdXJlICovXG4gICAgcHJpdmF0ZSBjaGFuZ2VDb25ldG50KHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycywgbmV3Um91dGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBvbGRSb3V0ZT86IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+KTogdm9pZCB7XG4gICAgICAgIHBhcnNlVXJsUGFyYW1zKHBhcmFtcywgbmV3Um91dGUpO1xuICAgICAgICAvLyBUT0RPOlxuICAgICAgICBjb25zb2xlLmxvZyhgW25ldzogJHtKU09OLnN0cmluZ2lmeShuZXdSb3V0ZSl9LCBvbGQ6ICR7bnVsbCA9PSBvbGRSb3V0ZSA/ICd1bmRlZmluZWQnIDogSlNPTi5zdHJpbmdpZnkob2xkUm91dGUpfV1gKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgYGhpc3RvcnlgIGBjaGFuZ2luZ2AgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5Q2hhbmdpbmcobmV4dFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiwgY2FuY2VsOiAocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCk6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgaGFuZGxlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBjYWxsYmFjayA9IChyZWFzb24/OiB1bmtub3duKTogdm9pZCA9PiB7XG4gICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNhbmNlbChyZWFzb24pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1jaGFuZ2UnLCB0aGlzLm1ha2VSb3V0ZXJFdmVudEFyZyhuZXh0U3RhdGUpLCBjYWxsYmFjayk7XG5cbiAgICAgICAgcmV0dXJuIGhhbmRsZWQ7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYHJlZnJlc2hgIGhhbmRsZXIgKi9cbiAgICBwcml2YXRlIG9uSGlzdG9yeVJlZnJlc2gobmV3U3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+LCBvbGRTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICAgICAgLy8gYFJvdXRlQ29udGV4dGAg44KS5L+d6Ki844GZ44KLXG4gICAgICAgIGNvbnN0IGZpbmQgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+KTogeyBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7IHJvdXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjsgfSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1cmwgID0gYC8ke3N0YXRlWydAaWQnXX1gO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1ldGVyKHVybCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbdXJsOiAke3VybH1dYCwgc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgPT0gc3RhdGUucGF0aCkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc3RhdGUsIHRvUm91dGVDb250ZXh0KHVybCwgcGFyYW1zKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBwYXJhbXMsIHJvdXRlOiBzdGF0ZSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHBhcmFtcywgcm91dGUgfSA9IGZpbmQobmV3U3RhdGUpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VDb25ldG50KHBhcmFtcywgcm91dGUsIG9sZFN0YXRlKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdlcnJvcicsIGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIFtbUm91dGVyXV0gb2JqZWN0LlxuICogQGphIFtbUm91dGVyXV0g44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIE9iamVjdChzKSBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIFtbRE9NXV0uXG4gKiAgLSBgamFgIFtbRE9NXV0g44Gu44KC44Go44Gr44Gq44KL44Kk44Oz44K544K/44Oz44K5KOe+pCnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIFtbUm91dGVyQ29uc3RydWN0aW9uT3B0aW9uc11dIG9iamVjdFxuICogIC0gYGphYCBbW1JvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnNdXSDjgqrjg5bjgrjjgqfjgq/jg4hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvdXRlcihzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogUm91dGVyQ29uc3RydWN0aW9uT3B0aW9ucyk6IFJvdXRlciB7XG4gICAgcmV0dXJuIG5ldyBSb3V0ZXJDb250ZXh0KHNlbGVjdG9yLCBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgc3RhcnQ6IHRydWUsXG4gICAgfSwgb3B0aW9ucykpO1xufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJEZWZlcnJlZCIsIm5vb3AiLCJhdCIsInNvcnQiLCJ3ZWJSb290IiwiJGNkcCIsImlzT2JqZWN0IiwiJHNpZ25hdHVyZSIsIkV2ZW50UHVibGlzaGVyIiwidG9VcmwiLCJDYW5jZWxUb2tlbiIsInBvc3QiLCJwYXRoMnJlZ2V4cCIsInBpY2siLCJpc1N0cmluZyIsImlzQXJyYXkiLCJ0b1F1ZXJ5U3RyaW5ncyIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsInBhcnNlVXJsUXVlcnkiLCJjb252ZXJ0VXJsUGFyYW1UeXBlIiwiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7OztJQUlHO0lBRUgsQ0FBQSxZQUFxQjtJQU1qQjs7O0lBR0c7SUFDSCxJQUFBLElBS0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFMRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLG9CQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsb0JBQTZDLENBQUE7WUFDN0MsV0FBNEMsQ0FBQSxXQUFBLENBQUEsb0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLGdDQUF5QixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSxHQUFBLG9DQUFBLENBQUE7WUFDN0ksV0FBNEMsQ0FBQSxXQUFBLENBQUEsMkNBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLGdDQUF5QixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSxHQUFBLDJDQUFBLENBQUE7WUFDN0ksV0FBNEMsQ0FBQSxXQUFBLENBQUEsa0NBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxFQUFBLGdDQUF5QixDQUFDLEVB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
