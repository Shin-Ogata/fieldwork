/*!
 * @cdp/router 0.9.18
 *   generic router scheme
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/web-utils'), require('@cdp/core-utils'), require('@cdp/promise'), require('@cdp/extension-path2regexp'), require('@cdp/events'), require('@cdp/result'), require('@cdp/dom'), require('@cdp/ajax')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/web-utils', '@cdp/core-utils', '@cdp/promise', '@cdp/extension-path2regexp', '@cdp/events', '@cdp/result', '@cdp/dom', '@cdp/ajax'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP.Extension, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, webUtils, coreUtils, promise, extensionPath2regexp, events, result, dom, ajax) { 'use strict';

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

    /** @internal */ const window = coreUtils.safe(globalThis.window);
    /** @internal */ const URL = coreUtils.safe(globalThis.URL);

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
        noopStack = coreUtils.noop; // eslint-disable-line @typescript-eslint/explicit-member-accessibility
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
            return hash ? normalizeId(hash) : normalizeId(src.substring(webUtils.webRoot.length));
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
            return ('hash' === this._mode) ? `${"#/" /* Const.HASH_PREFIX */}${id}` : webUtils.toUrl(id);
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
                    df: new promise.Deferred(cancel),
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
            const df = additional?.df ?? this._dfGo ?? new promise.Deferred();
            const oldData = additional?.prevState || this.state;
            const newData = additional?.nextState || this.direct(newId).state || createData(newId, newState);
            const { cancel, token } = promise.CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method
            try {
                // for fail safe
                df.catch(coreUtils.noop);
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
    class MemoryHistory extends events.EventPublisher {
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
                void coreUtils.post(() => {
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
                const df = new promise.Deferred();
                void coreUtils.post(() => {
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
                const df = new promise.Deferred(cancel);
                void coreUtils.post(() => {
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
            const { cancel, token } = promise.CancelToken.source(); // eslint-disable-line @typescript-eslint/unbound-method
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
        return flatten('', coreUtils.isArray(routes) ? routes : routes ? [routes] : [])
            .map((seed) => {
            const regexp = extensionPath2regexp.path2regexp.pathToRegexp(seed.path);
            seed.regexp = regexp;
            seed.paramKeys = (regexp).keys.filter(k => coreUtils.isString(k.name)).map(k => k.name);
            return seed;
        });
    };
    //__________________________________________________________________________________________________//
    /** @internal prepare IHistory object */
    const prepareHistory = (seed = 'hash', initialPath, context) => {
        return (coreUtils.isString(seed)
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
            let url = extensionPath2regexp.path2regexp.compile(path)(ensurePathParams(params));
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
    const parseUrlParams = (route) => {
        const { url } = route;
        route.query = url.includes('?') ? ajax.parseUrlQuery(normalizeId(url)) : {};
        route.params = {};
        const { regexp, paramKeys } = route['@params'];
        if (paramKeys.length) {
            const params = regexp.exec(url)?.map((value, index) => { return { value, key: paramKeys[index - 1] }; });
            for (const param of params) {
                if (null != param.key && null != param.value) {
                    coreUtils.assignValue(route.params, param.key, ajax.convertUrlParamType(param.value));
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
        if (coreUtils.isFunction(component)) {
            try {
                params.page = new component(route, componentOptions);
            }
            catch {
                params.page = await component(route, componentOptions);
            }
        }
        else if (coreUtils.isObject(component)) {
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
            return el instanceof HTMLTemplateElement ? dom.dom([...el.content.children]) : dom.dom(el);
        };
        const { content } = params;
        if (null == content) {
            // noop element
            params.$template = dom.dom();
        }
        else if (coreUtils.isString(content['selector'])) {
            // from ajax
            const { selector, url } = content;
            const template = webUtils.toTemplateElement(await webUtils.loadTemplateSource(selector, { url: url && webUtils.toUrl(url) }));
            if (!template) {
                throw Error(`template load failed. [selector: ${selector}, url: ${url}]`);
            }
            params.$template = ensureInstance(template);
        }
        else if (coreUtils.isFunction(content)) {
            params.$template = ensureInstance(dom.dom(await content())[0]);
        }
        else {
            params.$template = ensureInstance(dom.dom(content)[0]);
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
            coreUtils.sleep(durationSec * 1000 + 100 /* Const.WAIT_TRANSITION_MARGIN */),
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
    class RouterContext extends events.EventPublisher {
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
            this._$el = dom.dom(selector, el);
            if (!this._$el.length) {
                throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_ELEMENT_NOT_FOUND, `Router element not found. [selector: ${selector}]`);
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
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, `Route not found. [to: ${to}]`);
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
                const stacks = coreUtils.isArray(stack) ? stack : [stack];
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
                            throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [path: ${url}]`, page);
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
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_INVALID_SUBFLOW_BASE_URL, `Invalid sub-flow base url. [url: ${subflow.base}]`);
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
            const method = coreUtils.camelize(`page-${event}`);
            if (coreUtils.isFunction(target?.[method])) {
                const retval = target[method](arg);
                if (retval instanceof promise.NativePromise && arg['asyncProcess']) {
                    arg.asyncProcess.register(retval);
                }
            }
        }
        /** @internal wait frame */
        waitFrame() {
            return webUtils.waitFrame(1, this._raf);
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
            const $elNext = dom.dom(nextRoute.el);
            const pageNext = nextParams.page;
            // mount
            if (!$elNext.isConnected) {
                await this.mountContent($elNext, pageNext, changeInfo, asyncProcess);
            }
            return [
                pageNext, $elNext, // next
                (reload && {} || (prevParams?.page ?? {})), (reload && dom.dom(null) || dom.dom(prevRoute?.el)), // prev
            ];
        }
        /** @internal */
        async cloneContent(nextRoute, nextParams, prevRoute, changeInfo, asyncProcess) {
            nextRoute.el = prevRoute.el;
            prevRoute.el = nextRoute.el?.cloneNode(true);
            dom.dom(prevRoute.el).removeAttr('id').insertBefore(nextRoute.el);
            dom.dom(nextRoute.el).attr('aria-hidden', true).removeClass([`${this._cssPrefix}-${"page-current" /* CssName.PAGE_CURRENT */}`, `${this._cssPrefix}-${"page-previous" /* CssName.PAGE_PREVIOUS */}`]);
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
            const $el = dom.dom(route.el);
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
                const $el = dom.dom(prevRoute.el);
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
                        await this.mountContent(dom.dom(el), param.page, changeInfo, asyncProcess);
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
                const $el = dom.dom(el);
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
                cancel(result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_BUSY));
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
                    throw result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_ROUTE_CANNOT_BE_RESOLVED, `Route cannot be resolved. [path: ${path}]`, state);
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
            this.publish('error', result.isResult(error) ? error : result.makeResult(result.RESULT_CODE.ERROR_MVC_ROUTER_NAVIGATE_FAILED, 'Route navigate failed.', error));
            console.error(error);
        }
        /** @internal anchor click handler */
        onAnchorClicked(event) {
            const $target = dom.dom(event.target).closest('[href]');
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

    exports.createMemoryHistory = createMemoryHistory;
    exports.createRouter = createRouter;
    exports.createSessionHistory = createSessionHistory;
    exports.disposeMemoryHistory = disposeMemoryHistory;
    exports.disposeSessionHistory = disposeSessionHistory;
    exports.resetMemoryHistory = resetMemoryHistory;
    exports.resetSessionHistory = resetSessionHistory;
    exports.toRouterPath = toRouterPath;
    exports.toRouterStackId = toRouterStackId;
    Object.keys(extensionPath2regexp).forEach(function (k) {
        if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionPath2regexp[k]; }
        });
    });

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiaGlzdG9yeS9pbnRlcm5hbC50cyIsInV0aWxzLnRzIiwiaGlzdG9yeS9zZXNzaW9uLnRzIiwiaGlzdG9yeS9tZW1vcnkudHMiLCJyb3V0ZXIvaW50ZXJuYWwudHMiLCJyb3V0ZXIvYXN5bmMtcHJvY2Vzcy50cyIsInJvdXRlci9jb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgUk9VVEVSID0gQ0RQX0tOT1dOX01PRFVMRS5NVkMgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OICsgMTUsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBNVkNfUk9VVEVSX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfRUxFTUVOVF9OT1RfRk9VTkQgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgMSwgJ3JvdXRlciBlbGVtZW50IG5vdCBmb3VuZC4nKSxcbiAgICAgICAgRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5ST1VURVIgKyAyLCAnUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLicpLFxuICAgICAgICBFUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCAgICAgICAgICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlJPVVRFUiArIDMsICdSb3V0ZSBuYXZpZ2F0ZSBmYWlsZWQuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfSU5WQUxJRF9TVUJGTE9XX0JBU0VfVVJMID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgNCwgJ0ludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuJyksXG4gICAgICAgIEVSUk9SX01WQ19ST1VURVJfQlVTWSAgICAgICAgICAgICAgICAgICAgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuUk9VVEVSICsgNSwgJ0luIGNoYW5naW5nIHBhZ2UgcHJvY2VzcyBub3cuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCB3aW5kb3cgPSBzYWZlKGdsb2JhbFRoaXMud2luZG93KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTCA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuIiwiaW1wb3J0IHtcbiAgICBXcml0YWJsZSxcbiAgICBQbGFpbk9iamVjdCxcbiAgICBhdCxcbiAgICBzb3J0LFxuICAgIG5vb3AsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBEZWZlcnJlZCB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBIaXN0b3J5U3RhdGUsIEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBub3JtYWx6aWUgaWQgc3RyaW5nICovXG5leHBvcnQgY29uc3Qgbm9ybWFsaXplSWQgPSAoc3JjOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIC8vIHJlbW92ZSBoZWFkIG9mIFwiI1wiLCBcIi9cIiwgXCIjL1wiIGFuZCB0YWlsIG9mIFwiL1wiXG4gICAgcmV0dXJuIHNyYy5yZXBsYWNlKC9eKCNcXC8pfF5bIy9dfFxccyskLywgJycpLnJlcGxhY2UoL15cXHMrJHwoXFwvJCkvLCAnJyk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSBzdGFjayAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZURhdGEgPSA8VCA9IFBsYWluT2JqZWN0PihpZDogc3RyaW5nLCBzdGF0ZT86IFQpOiBIaXN0b3J5U3RhdGU8VD4gPT4ge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHsgJ0BpZCc6IG5vcm1hbGl6ZUlkKGlkKSB9LCBzdGF0ZSk7XG59O1xuXG4vKiogQGludGVybmFsIGNyZWF0ZSB1bmNhbmNlbGxhYmxlIGRlZmVycmVkICovXG5leHBvcnQgY29uc3QgY3JlYXRlVW5jYW5jZWxsYWJsZURlZmVycmVkID0gKHdhcm46IHN0cmluZyk6IERlZmVycmVkID0+IHtcbiAgICBjb25zdCB1bmNhbmNlbGxhYmxlID0gbmV3IERlZmVycmVkKCkgYXMgV3JpdGFibGU8RGVmZXJyZWQ+O1xuICAgIHVuY2FuY2VsbGFibGUucmVqZWN0ID0gKCkgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4od2Fybik7XG4gICAgICAgIHVuY2FuY2VsbGFibGUucmVzb2x2ZSgpO1xuICAgIH07XG4gICAgcmV0dXJuIHVuY2FuY2VsbGFibGU7XG59O1xuXG4vKiogQGludGVybmFsIGFzc2lnbiBzdGF0ZSBlbGVtZW50IGlmIGFscmVhZHkgZXhpc3RzICovXG5leHBvcnQgY29uc3QgYXNzaWduU3RhdGVFbGVtZW50ID0gKHN0YXRlOiBIaXN0b3J5U3RhdGUsIHN0YWNrOiBIaXN0b3J5U3RhY2spOiB2b2lkID0+IHtcbiAgICBjb25zdCBlbCA9IHN0YWNrLmRpcmVjdChzdGF0ZVsnQGlkJ10pPy5zdGF0ZT8uZWw7XG4gICAgKCFzdGF0ZS5lbCAmJiBlbCkgJiYgKHN0YXRlLmVsID0gZWwpO1xufTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGludGVybmFsIHN0YWNrIG1hbmFnZW1lbnQgY29tbW9uIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhY2s8VCA9IFBsYWluT2JqZWN0PiB7XG4gICAgcHJpdmF0ZSBfc3RhY2s6IEhpc3RvcnlTdGF0ZTxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuXG4gICAgLyoqIGhpc3Rvcnkgc3RhY2sgbGVuZ3RoICovXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2subGVuZ3RoO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IHN0YXRlICovXG4gICAgZ2V0IHN0YXRlKCk6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RhbmNlKDApO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlWydAaWQnXTtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaW5kZXggKi9cbiAgICBzZXQgaW5kZXgoaWR4OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5faW5kZXggPSBNYXRoLnRydW5jKGlkeCk7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgYXJyYXkoKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc2xpY2UoKTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgZmlyc3Qgb3Igbm90ICovXG4gICAgZ2V0IGlzRmlyc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAwID09PSB0aGlzLl9pbmRleDtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgcG9zaXRpb24gaW4gc3RhY2sgaXMgbGFzdCBvciBub3QgKi9cbiAgICBnZXQgaXNMYXN0KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXggPT09IHRoaXMuX3N0YWNrLmxlbmd0aCAtIDE7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIHB1YmxpYyBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIGF0KHRoaXMuX3N0YWNrLCBpbmRleCk7XG4gICAgfVxuXG4gICAgLyoqIGNsZWFyIGZvcndhcmQgaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHVibGljIGNsZWFyRm9yd2FyZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2sgPSB0aGlzLl9zdGFjay5zbGljZSgwLCB0aGlzLl9pbmRleCArIDEpO1xuICAgIH1cblxuICAgIC8qKiByZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELiAqL1xuICAgIHB1YmxpYyBjbG9zZXN0KGlkOiBzdHJpbmcpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICBpZCA9IG5vcm1hbGl6ZUlkKGlkKTtcbiAgICAgICAgY29uc3QgeyBfaW5kZXg6IGJhc2UgfSA9IHRoaXM7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSB0aGlzLl9zdGFja1xuICAgICAgICAgICAgLm1hcCgocywgaW5kZXgpID0+IHsgcmV0dXJuIHsgaW5kZXgsIGRpc3RhbmNlOiBNYXRoLmFicyhiYXNlIC0gaW5kZXgpLCAuLi5zIH07IH0pXG4gICAgICAgICAgICAuZmlsdGVyKHMgPT4gc1snQGlkJ10gPT09IGlkKVxuICAgICAgICA7XG4gICAgICAgIHNvcnQoY2FuZGlkYXRlcywgKGwsIHIpID0+IChsLmRpc3RhbmNlID4gci5kaXN0YW5jZSA/IDEgOiAtMSksIHRydWUpO1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXT8uaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHJldHVybiBjbG9zZXQgc3RhY2sgaW5mb3JtYXRpb24gYnkgdG8gSUQgYW5kIGZyb20gSUQuICovXG4gICAgcHVibGljIGRpcmVjdCh0b0lkOiBzdHJpbmcsIGZyb21JZD86IHN0cmluZyk6IEhpc3RvcnlEaXJlY3RSZXR1cm5UeXBlPFQ+IHtcbiAgICAgICAgY29uc3QgdG9JbmRleCAgID0gdGhpcy5jbG9zZXN0KHRvSWQpO1xuICAgICAgICBjb25zdCBmcm9tSW5kZXggPSBudWxsID09IGZyb21JZCA/IHRoaXMuX2luZGV4IDogdGhpcy5jbG9zZXN0KGZyb21JZCk7XG4gICAgICAgIGlmIChudWxsID09IGZyb21JbmRleCB8fCBudWxsID09IHRvSW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGRpcmVjdGlvbjogJ21pc3NpbmcnIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBkZWx0YSA9IHRvSW5kZXggLSBmcm9tSW5kZXg7XG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSAwID09PSBkZWx0YVxuICAgICAgICAgICAgICAgID8gJ25vbmUnXG4gICAgICAgICAgICAgICAgOiBkZWx0YSA8IDAgPyAnYmFjaycgOiAnZm9yd2FyZCc7XG4gICAgICAgICAgICByZXR1cm4geyBkaXJlY3Rpb24sIGRlbHRhLCBpbmRleDogdG9JbmRleCwgc3RhdGU6IHRoaXMuX3N0YWNrW3RvSW5kZXhdIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogZ2V0IGFjdGl2ZSBkYXRhIGZyb20gY3VycmVudCBpbmRleCBvcmlnaW4gKi9cbiAgICBwdWJsaWMgZGlzdGFuY2UoZGVsdGE6IG51bWJlcik6IEhpc3RvcnlTdGF0ZTxUPiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHRoaXMuX2luZGV4ICsgZGVsdGE7XG4gICAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBhcnJheSBpbmRleC4gW2xlbmd0aDogJHt0aGlzLmxlbmd0aH0sIGdpdmVuOiAke3Bvc31dYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXQocG9zKTtcbiAgICB9XG5cbiAgICAvKiogbm9vcCBzdGFjayAqL1xuICAgIHB1YmxpYyBub29wU3RhY2sgPSBub29wOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tZW1iZXItYWNjZXNzaWJpbGl0eVxuXG4gICAgLyoqIHB1c2ggc3RhY2sgKi9cbiAgICBwdWJsaWMgcHVzaFN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1srK3RoaXMuX2luZGV4XSA9IGRhdGE7XG4gICAgfVxuXG4gICAgLyoqIHJlcGxhY2Ugc3RhY2sgKi9cbiAgICBwdWJsaWMgcmVwbGFjZVN0YWNrKGRhdGE6IEhpc3RvcnlTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGFja1t0aGlzLl9pbmRleF0gPSBkYXRhO1xuICAgIH1cblxuICAgIC8qKiBzZWVrIHN0YWNrICovXG4gICAgcHVibGljIHNlZWtTdGFjayhkYXRhOiBIaXN0b3J5U3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmNsb3Nlc3QoZGF0YVsnQGlkJ10pO1xuICAgICAgICBpZiAobnVsbCA9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhpcy5wdXNoU3RhY2soZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIGRpc3Bvc2Ugb2JqZWN0ICovXG4gICAgcHVibGljIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gTmFOO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHdlYlJvb3QgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4vaGlzdG9yeS9pbnRlcm5hbCc7XG5cbi8qKiByZS1leHBvcnQgKi9cbmV4cG9ydCAqIGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXBhdGgycmVnZXhwJztcblxuLyoqXG4gKiBAZW4gR2VuZXJhdGVzIGFuIElEIHRvIGJlIHVzZWQgYnkgdGhlIHN0YWNrIGluc2lkZSB0aGUgcm91dGVyLlxuICogQGphIOODq+ODvOOCv+ODvOWGhemDqOOBriBzdGFjayDjgYzkvb/nlKjjgZnjgosgSUQg44KS55Sf5oiQXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBzcGVjaWZpZXMgd2hlcmUgdGhlIHBhdGggc3RyaW5nIGlzIGNyZWF0ZWQgZnJvbSBbZXg6IGBsb2NhdGlvbi5oYXNoYCwgYGxvY2F0aW9uLmhyZWZgLCBgI3BhdGhgLCBgcGF0aGAsIGAvcGF0aGBdXG4gKiAgLSBgamFgIHBhdGgg5paH5a2X5YiX44Gu5L2c5oiQ5YWD44KS5oyH5a6aIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVyU3RhY2tJZCA9IChzcmM6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgaWYgKFVSTC5jYW5QYXJzZShzcmMpKSB7XG4gICAgICAgIGNvbnN0IHsgaGFzaCB9ID0gbmV3IFVSTChzcmMpO1xuICAgICAgICByZXR1cm4gaGFzaCA/IG5vcm1hbGl6ZUlkKGhhc2gpIDogbm9ybWFsaXplSWQoc3JjLnN1YnN0cmluZyh3ZWJSb290Lmxlbmd0aCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVJZChzcmMpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIEdldCB0aGUgbm9ybWFsaXplZCBgLzxpZD5gIHN0cmluZyBmcm9tIHRoZSB1cmwgLyBwYXRoLlxuICogQGphIHVybCAvIHBhdGgg44KS5oyH5a6a44GX44GmLCDmraPopo/ljJbjgZfjgZ8gYC88c3RhY2sgaWQ+YCDmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHNwZWNpZmllcyB3aGVyZSB0aGUgcGF0aCBzdHJpbmcgaXMgY3JlYXRlZCBmcm9tIFtleDogYGxvY2F0aW9uLmhhc2hgLCBgbG9jYXRpb24uaHJlZmAsIGAjcGF0aGAsIGBwYXRoYCwgYC9wYXRoYF1cbiAqICAtIGBqYWAgcGF0aCDmloflrZfliJfjga7kvZzmiJDlhYPjgpLmjIflrpogW2V4OiBgbG9jYXRpb24uaGFzaGAsIGBsb2NhdGlvbi5ocmVmYCwgYCNwYXRoYCwgYHBhdGhgLCBgL3BhdGhgXVxuICovXG5leHBvcnQgY29uc3QgdG9Sb3V0ZXJQYXRoID0gKHNyYzogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICByZXR1cm4gYC8ke3RvUm91dGVyU3RhY2tJZChzcmMpfWA7XG59O1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBBY2Nlc3NpYmxlLFxuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzT2JqZWN0LFxuICAgIG5vb3AsXG4gICAgJGNkcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFNpbGVuY2VhYmxlLCBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IERlZmVycmVkLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyB0b1VybCB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHRvUm91dGVyU3RhY2tJZCBhcyB0b0lkIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnLi4vc3NyJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGRpc3BhdGNoIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gKi9cbmludGVyZmFjZSBEaXNwYXRjaEluZm88VD4ge1xuICAgIGRmOiBEZWZlcnJlZDtcbiAgICBuZXdJZDogc3RyaW5nO1xuICAgIG9sZElkOiBzdHJpbmc7XG4gICAgcG9zdHByb2M6ICdub29wJyB8ICdwdXNoJyB8ICdyZXBsYWNlJyB8ICdzZWVrJztcbiAgICBuZXh0U3RhdGU/OiBIaXN0b3J5U3RhdGU8VD47XG4gICAgcHJldlN0YXRlPzogSGlzdG9yeVN0YXRlPFQ+O1xufVxuXG4vKiogQGludGVybmFsIGNvbnN0YW50ICovXG5jb25zdCBlbnVtIENvbnN0IHtcbiAgICBIQVNIX1BSRUZJWCA9ICcjLycsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzZXREaXNwYXRjaEluZm8gPSA8VD4oc3RhdGU6IEFjY2Vzc2libGU8VD4sIGFkZGl0aW9uYWw6IERpc3BhdGNoSW5mbzxUPik6IFQgPT4ge1xuICAgIChzdGF0ZVskY2RwXSBhcyBEaXNwYXRjaEluZm88VD4pID0gYWRkaXRpb25hbDtcbiAgICByZXR1cm4gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBwYXJzZURpc3BhdGNoSW5mbyA9IDxUPihzdGF0ZTogQWNjZXNzaWJsZTxUPik6IFtULCBEaXNwYXRjaEluZm88VD4/XSA9PiB7XG4gICAgaWYgKGlzT2JqZWN0KHN0YXRlKSAmJiBzdGF0ZVskY2RwXSkge1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsID0gc3RhdGVbJGNkcF07XG4gICAgICAgIGRlbGV0ZSBzdGF0ZVskY2RwXTtcbiAgICAgICAgcmV0dXJuIFtzdGF0ZSwgYWRkaXRpb25hbCBhcyBEaXNwYXRjaEluZm88VD5dO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbc3RhdGVdO1xuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgaW5zdGFuY2Ugc2lnbmF0dXJlICovXG5jb25zdCAkc2lnbmF0dXJlID0gU3ltYm9sKCdTZXNzaW9uSGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxIaXN0b3J5RXZlbnQ8VD4+IGltcGxlbWVudHMgSUhpc3Rvcnk8VD4ge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3dpbmRvdzogV2luZG93O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX21vZGU6ICdoYXNoJyB8ICdoaXN0b3J5JztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9wb3BTdGF0ZUhhbmRsZXI6IChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGFjayA9IG5ldyBIaXN0b3J5U3RhY2s8VD4oKTtcbiAgICBwcml2YXRlIF9kZkdvPzogRGVmZXJyZWQ7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHdpbmRvd0NvbnR4dDogV2luZG93LCBtb2RlOiAnaGFzaCcgfCAnaGlzdG9yeScsIGlkPzogc3RyaW5nLCBzdGF0ZT86IFQpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3dpbmRvdyA9IHdpbmRvd0NvbnR4dDtcbiAgICAgICAgdGhpcy5fbW9kZSA9IG1vZGU7XG5cbiAgICAgICAgdGhpcy5fcG9wU3RhdGVIYW5kbGVyID0gdGhpcy5vblBvcFN0YXRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCA/PyB0b0lkKHRoaXMuX3dpbmRvdy5sb2NhdGlvbi5ocmVmKSwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgdGhpcy5fcG9wU3RhdGVIYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IHByZXZTdGF0ZSA9IHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgICAgICBjb25zdCBvbGRVUkwgPSBsb2NhdGlvbi5ocmVmO1xuXG4gICAgICAgIHRoaXMuc2V0SW5kZXgoMCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2xlYXJGb3J3YXJkKCk7XG5cbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBjcmVhdGVVbmNhbmNlbGxhYmxlRGVmZXJyZWQoJ1Nlc3Npb25IaXN0b3J5I3Jlc2V0KCkgaXMgdW5jYW5jZWxsYWJsZSBtZXRob2QuJyksXG4gICAgICAgICAgICAgICAgbmV3SWQ6IHRvSWQobmV3VVJMKSxcbiAgICAgICAgICAgICAgICBvbGRJZDogdG9JZChvbGRVUkwpLFxuICAgICAgICAgICAgICAgIHBvc3Rwcm9jOiAnbm9vcCcsXG4gICAgICAgICAgICAgICAgcHJldlN0YXRlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGlzcGF0Y2hDaGFuZ2VJbmZvKHRoaXMuc3RhdGUsIGFkZGl0aW9uYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSUhpc3Rvcnk8VD5cblxuICAgIC8qKiBoaXN0b3J5IHN0YWNrIGxlbmd0aCAqL1xuICAgIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBzdGF0ZSAqL1xuICAgIGdldCBzdGF0ZSgpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suc3RhdGU7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgaWQgKi9cbiAgICBnZXQgaWQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmlkO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGluZGV4ICovXG4gICAgZ2V0IGluZGV4KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogc3RhY2sgcG9vbCAqL1xuICAgIGdldCBzdGFjaygpOiByZWFkb25seSBIaXN0b3J5U3RhdGU8VD5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5hcnJheTtcbiAgICB9XG5cbiAgICAvKiogY2hlY2sgaXQgY2FuIGdvIGJhY2sgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5CYWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuX3N0YWNrLmlzRmlyc3Q7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBmb3J3YXJkIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuRm9yd2FyZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0xhc3Q7XG4gICAgfVxuXG4gICAgLyoqIGdldCBkYXRhIGJ5IGluZGV4LiAqL1xuICAgIGF0KGluZGV4OiBudW1iZXIpOiBIaXN0b3J5U3RhdGU8VD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXQoaW5kZXgpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGJhY2t3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBiYWNrKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKC0xKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBmb3J3YXJkIHRocm91Z2ggaGlzdG9yeS4gKi9cbiAgICBmb3J3YXJkKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIC8vIGlmIGFscmVhZHkgY2FsbGVkLCBubyByZWFjdGlvbi5cbiAgICAgICAgaWYgKHRoaXMuX2RmR28pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgZ2l2ZW4gMCwganVzdCByZWxvYWQuXG4gICAgICAgIGlmICghZGVsdGEpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudHJpZ2dlckV2ZW50QW5kV2FpdCgncmVmcmVzaCcsIHRoaXMuc3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZGZHbyA9IG5ldyBEZWZlcnJlZCgpO1xuICAgICAgICAgICAgdGhpcy5fc3RhY2suZGlzdGFuY2UoZGVsdGEpO1xuICAgICAgICAgICAgdGhpcy5fd2luZG93Lmhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5fZGZHbztcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbmRleChvbGRJbmRleCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9kZkdvID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl9zdGFjay5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xlYXJGb3J3YXJkSGlzdG9yeSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgpLmjIflrprjgZfjgabjgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjb252ZXJ0IHRvIFVSTCAqL1xuICAgIHByaXZhdGUgdG9VcmwoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAoJ2hhc2gnID09PSB0aGlzLl9tb2RlKSA/IGAke0NvbnN0LkhBU0hfUFJFRklYfSR7aWR9YCA6IHRvVXJsKGlkKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyaWdnZXIgZXZlbnQgJiB3YWl0IHByb2Nlc3MgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyaWdnZXJFdmVudEFuZFdhaXQoXG4gICAgICAgIGV2ZW50OiAncmVmcmVzaCcgfCAnY2hhbmdpbmcnLFxuICAgICAgICBhcmcxOiBIaXN0b3J5U3RhdGU8VD4sXG4gICAgICAgIGFyZzI6IEhpc3RvcnlTdGF0ZTxUPiB8IHVuZGVmaW5lZCB8ICgocmVhc29uPzogdW5rbm93bikgPT4gdm9pZCksXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHVua25vd24+W10gPSBbXTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKGV2ZW50LCBhcmcxLCBhcmcyIGFzIGFueSwgcHJvbWlzZXMpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1cGRhdGUgKi9cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVN0YXRlKG1ldGhvZDogJ3B1c2gnIHwgJ3JlcGxhY2UnLCBpZDogc3RyaW5nLCBzdGF0ZTogVCB8IHVuZGVmaW5lZCwgb3B0aW9uczogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgc2lsZW50LCBjYW5jZWwgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHsgbG9jYXRpb24sIGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcblxuICAgICAgICBjb25zdCBkYXRhID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZCA9IGRhdGFbJ0BpZCddO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgZGF0YVsnQG9yaWdpbiddID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZFVSTCA9IGxvY2F0aW9uLmhyZWY7XG4gICAgICAgIGhpc3RvcnlbYCR7bWV0aG9kfVN0YXRlYF0oZGF0YSwgJycsIHRoaXMudG9VcmwoaWQpKTtcbiAgICAgICAgY29uc3QgbmV3VVJMID0gbG9jYXRpb24uaHJlZjtcblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQoZGF0YSwgdGhpcy5fc3RhY2sgYXMgSGlzdG9yeVN0YWNrKTtcblxuICAgICAgICBpZiAoIXNpbGVudCkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+ID0ge1xuICAgICAgICAgICAgICAgIGRmOiBuZXcgRGVmZXJyZWQoY2FuY2VsKSxcbiAgICAgICAgICAgICAgICBuZXdJZDogdG9JZChuZXdVUkwpLFxuICAgICAgICAgICAgICAgIG9sZElkOiB0b0lkKG9sZFVSTCksXG4gICAgICAgICAgICAgICAgcG9zdHByb2M6IG1ldGhvZCxcbiAgICAgICAgICAgICAgICBuZXh0U3RhdGU6IGRhdGEsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kaXNwYXRjaENoYW5nZUluZm8oZGF0YSwgYWRkaXRpb25hbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmluZGV4O1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZGlzcGF0Y2ggYHBvcHN0YXRlYCBldmVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIGRpc3BhdGNoQ2hhbmdlSW5mbyhuZXdTdGF0ZTogQWNjZXNzaWJsZTxUPiwgYWRkaXRpb25hbDogRGlzcGF0Y2hJbmZvPFQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gc2V0RGlzcGF0Y2hJbmZvKG5ld1N0YXRlLCBhZGRpdGlvbmFsKTtcbiAgICAgICAgdGhpcy5fd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFBvcFN0YXRlRXZlbnQoJ3BvcHN0YXRlJywgeyBzdGF0ZSB9KSk7XG4gICAgICAgIGF3YWl0IGFkZGl0aW9uYWwuZGY7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzaWxlbnQgcG9wc3RhdGUgZXZlbnQgbGlzdG5lciBzY29wZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoZXhlY3V0b3I6ICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KSA9PiBQcm9taXNlPHZvaWQ+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9wb3BTdGF0ZUhhbmRsZXIpO1xuICAgICAgICAgICAgY29uc3Qgd2FpdFBvcFN0YXRlID0gKCk6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgKGV2OiBQb3BTdGF0ZUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGV2LnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXdhaXQgZXhlY3V0b3Iod2FpdFBvcFN0YXRlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX3BvcFN0YXRlSGFuZGxlcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHJvbGxiYWNrIGhpc3RvcnkgKi9cbiAgICBwcml2YXRlIGFzeW5jIHJvbGxiYWNrSGlzdG9yeShtZXRob2Q6IHN0cmluZywgbmV3SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGhpc3RvcnkgfSA9IHRoaXMuX3dpbmRvdztcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxuICAgICAgICAgICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsICcnLCB0aGlzLnRvVXJsKHRoaXMuaWQpKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3B1c2gnOlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgaGlzdG9yeS5nbygtMSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKHdhaXQ6ICgpID0+IFByb21pc2U8dW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVsdGEgPSB0aGlzLmluZGV4IC0gdGhpcy5jbG9zZXN0KG5ld0lkKSE7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwICE9PSBkZWx0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvbWlzZSA9IHdhaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbHRhICYmIGhpc3RvcnkuZ28oZGVsdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjbGVhciBmb3J3YXJkIHNlc3Npb24gaGlzdG9yeSBmcm9tIGN1cnJlbnQgaW5kZXguICovXG4gICAgcHJpdmF0ZSBhc3luYyBjbGVhckZvcndhcmRIaXN0b3J5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLnN1cHByZXNzRXZlbnRMaXN0ZW5lclNjb3BlKGFzeW5jICh3YWl0OiAoKSA9PiBQcm9taXNlPHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc09yaWdpbiA9IChzdDogQWNjZXNzaWJsZTx1bmtub3duPik6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdD8uWydAb3JpZ2luJ10gYXMgYm9vbGVhbjtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHsgaGlzdG9yeSB9ID0gdGhpcy5fd2luZG93O1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gaGlzdG9yeS5zdGF0ZTtcblxuICAgICAgICAgICAgLy8gYmFjayB0byBzZXNzaW9uIG9yaWdpblxuICAgICAgICAgICAgd2hpbGUgKCFpc09yaWdpbihzdGF0ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gd2FpdCgpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICAgICAgICAgIHN0YXRlID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZW5zdXJlID0gKHNyYzogQWNjZXNzaWJsZTx1bmtub3duPik6IHVua25vd24gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN0eCA9IHsgLi4uc3JjIH07XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN0eFsncm91dGVyJ107XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN0eFsnQHBhcmFtcyddO1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gZm9yd2FyZCBmcm9tIGluZGV4IDEgdG8gY3VycmVudCB2YWx1ZVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDEsIG4gPSB0aGlzLl9zdGFjay5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdCA9IHRoaXMuX3N0YWNrLmF0KGkpO1xuICAgICAgICAgICAgICAgIGhpc3RvcnkucHVzaFN0YXRlKGVuc3VyZShzdCksICcnLCB0aGlzLnRvVXJsKHN0WydAaWQnXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBldmVudCBoYW5kbGVyczpcblxuICAgIC8qKiBAaW50ZXJuYWwgcmVjZWl2ZSBgcG9wc3RhdGVgIGV2ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgb25Qb3BTdGF0ZShldjogUG9wU3RhdGVFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGxvY2F0aW9uIH0gPSB0aGlzLl93aW5kb3c7XG4gICAgICAgIGNvbnN0IFtuZXdTdGF0ZSwgYWRkaXRpb25hbF0gPSBwYXJzZURpc3BhdGNoSW5mbyhldi5zdGF0ZSk7XG4gICAgICAgIGNvbnN0IG5ld0lkICAgPSBhZGRpdGlvbmFsPy5uZXdJZCA/PyB0b0lkKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBjb25zdCBtZXRob2QgID0gYWRkaXRpb25hbD8ucG9zdHByb2MgPz8gJ3NlZWsnO1xuICAgICAgICBjb25zdCBkZiAgICAgID0gYWRkaXRpb25hbD8uZGYgPz8gdGhpcy5fZGZHbyA/PyBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgY29uc3Qgb2xkRGF0YSA9IGFkZGl0aW9uYWw/LnByZXZTdGF0ZSB8fCB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCBuZXdEYXRhID0gYWRkaXRpb25hbD8ubmV4dFN0YXRlIHx8IHRoaXMuZGlyZWN0KG5ld0lkKS5zdGF0ZSB8fCBjcmVhdGVEYXRhKG5ld0lkLCBuZXdTdGF0ZSk7XG4gICAgICAgIGNvbnN0IHsgY2FuY2VsLCB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGZvciBmYWlsIHNhZmVcbiAgICAgICAgICAgIGRmLmNhdGNoKG5vb3ApO1xuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ2NoYW5naW5nJywgbmV3RGF0YSwgY2FuY2VsKTtcblxuICAgICAgICAgICAgaWYgKHRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRva2VuLnJlYXNvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fc3RhY2tbYCR7bWV0aG9kfVN0YWNrYF0obmV3RGF0YSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdEYXRhLCBvbGREYXRhKTtcblxuICAgICAgICAgICAgZGYucmVzb2x2ZSgpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBoaXN0b3J5IOOCkuWFg+OBq+aIu+OBmVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsYmFja0hpc3RvcnkobWV0aG9kLCBuZXdJZCk7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICBkZi5yZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkgb3B0aW9ucy5cbiAqIEBqYSB7QGxpbmsgY3JlYXRlU2Vzc2lvbkhpc3Rvcnl9KCkg44Gr5rih44GZ44Kq44OX44K344On44OzXG4gKiBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMge1xuICAgIGNvbnRleHQ/OiBXaW5kb3c7XG4gICAgbW9kZT86ICdoYXNoJyB8ICdoaXN0b3J5Jztcbn1cblxuLyoqXG4gKiBAZW4gQ3JlYXRlIGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+euoeeQhuOCquODluOCuOOCp+OCr+ODiOOCkuani+eviVxuICpcbiAqIEBwYXJhbSBpZFxuICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAqICAtIGBqYWAg44K544K/44OD44KvSUTjgpLmjIflrppcbiAqIEBwYXJhbSBzdGF0ZVxuICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICogIC0gYGphYCDjgrnjgr/jg4Pjgq8g44Gr57SQ44Gl44GP54q25oWL44Kq44OW44K444Kn44Kv44OIXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB7QGxpbmsgU2Vzc2lvbkhpc3RvcnlDcmVhdGVPcHRpb25zfSBvYmplY3RcbiAqICAtIGBqYWAge0BsaW5rIFNlc3Npb25IaXN0b3J5Q3JlYXRlT3B0aW9uc30g44Kq44OW44K444Kn44Kv44OIXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkPzogc3RyaW5nLCBzdGF0ZT86IFQsIG9wdGlvbnM/OiBTZXNzaW9uSGlzdG9yeUNyZWF0ZU9wdGlvbnMpOiBJSGlzdG9yeTxUPiB7XG4gICAgY29uc3QgeyBjb250ZXh0LCBtb2RlIH0gPSBPYmplY3QuYXNzaWduKHsgbW9kZTogJ2hhc2gnIH0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBuZXcgU2Vzc2lvbkhpc3RvcnkoY29udGV4dCA/PyB3aW5kb3csIG1vZGUsIGlkLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogQGVuIFJlc2V0IGJyb3dzZXIgc2Vzc2lvbiBoaXN0b3J5LlxuICogQGphIOODluODqeOCpuOCtuOCu+ODg+OCt+ODp+ODs+WxpeattOOBruODquOCu+ODg+ODiFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgU2Vzc2lvbkhpc3RvcnlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBTZXNzaW9uSGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldFNlc3Npb25IaXN0b3J5PFQgPSBQbGFpbk9iamVjdD4oaW5zdGFuY2U6IElIaXN0b3J5PFQ+LCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIGF3YWl0IChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikucmVzZXQob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIERpc3Bvc2UgYnJvd3NlciBzZXNzaW9uIGhpc3RvcnkgbWFuYWdlbWVudCBvYmplY3QuXG4gKiBAamEg44OW44Op44Km44K244K744OD44K344On44Oz566h55CG44Kq44OW44K444Kn44Kv44OI44Gu56C05qOEXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBTZXNzaW9uSGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFNlc3Npb25IaXN0b3J5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VTZXNzaW9uSGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGluc3RhbmNlOiBJSGlzdG9yeTxUPik6IHZvaWQge1xuICAgIChpbnN0YW5jZSBhcyBhbnkpWyRzaWduYXR1cmVdICYmIChpbnN0YW5jZSBhcyBTZXNzaW9uSGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHsgUGxhaW5PYmplY3QsIHBvc3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU2lsZW5jZWFibGUsIEV2ZW50UHVibGlzaGVyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgRGVmZXJyZWQsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBJSGlzdG9yeSxcbiAgICBIaXN0b3J5RXZlbnQsXG4gICAgSGlzdG9yeVN0YXRlLFxuICAgIEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMsXG4gICAgSGlzdG9yeURpcmVjdFJldHVyblR5cGUsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEhpc3RvcnlTdGFjayxcbiAgICBjcmVhdGVEYXRhLFxuICAgIGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCxcbiAgICBhc3NpZ25TdGF0ZUVsZW1lbnQsXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuXG4vKiogQGludGVybmFsIGluc3RhbmNlIHNpZ25hdHVyZSAqL1xuY29uc3QgJHNpZ25hdHVyZSA9IFN5bWJvbCgnTWVtb3J5SGlzdG9yeSNzaWduYXR1cmUnKTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIE1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgY2xhc3MuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q20566h55CG44Kv44Op44K5XG4gKi9cbmNsYXNzIE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PiBleHRlbmRzIEV2ZW50UHVibGlzaGVyPEhpc3RvcnlFdmVudDxUPj4gaW1wbGVtZW50cyBJSGlzdG9yeTxUPiB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhY2sgPSBuZXcgSGlzdG9yeVN0YWNrPFQ+KCk7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGlkOiBzdHJpbmcsIHN0YXRlPzogVCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICAodGhpcyBhcyBhbnkpWyRzaWduYXR1cmVdID0gdHJ1ZTtcbiAgICAgICAgLy8gaW5pdGlhbGl6ZVxuICAgICAgICB2b2lkIHRoaXMucmVwbGFjZShpZCwgc3RhdGUsIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRpc3Bvc2Ugb2JqZWN0XG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm9mZigpO1xuICAgICAgICBkZWxldGUgKHRoaXMgYXMgYW55KVskc2lnbmF0dXJlXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXNldCBoaXN0b3J5XG4gICAgICovXG4gICAgYXN5bmMgcmVzZXQob3B0aW9ucz86IFNpbGVuY2VhYmxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNOYU4odGhpcy5pbmRleCkgfHwgdGhpcy5fc3RhY2subGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgc2lsZW50IH0gPSBvcHRpb25zID8/IHt9O1xuXG4gICAgICAgIGNvbnN0IG9sZFN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgdGhpcy5zZXRJbmRleCgwKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jbGVhckZvcndhcmQoKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLnN0YXRlO1xuXG4gICAgICAgIGlmICghc2lsZW50KSB7XG4gICAgICAgICAgICBjb25zdCBkZiA9IGNyZWF0ZVVuY2FuY2VsbGFibGVEZWZlcnJlZCgnTWVtb3J5SGlzdG9yeSNyZXNldCgpIGlzIHVuY2FuY2VsbGFibGUgbWV0aG9kLicpO1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB2b2lkIHRoaXMub25DaGFuZ2VTdGF0ZSgnbm9vcCcsIGRmLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhd2FpdCBkZjtcbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElIaXN0b3J5PFQ+XG5cbiAgICAvKiogaGlzdG9yeSBzdGFjayBsZW5ndGggKi9cbiAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5sZW5ndGg7XG4gICAgfVxuXG4gICAgLyoqIGN1cnJlbnQgc3RhdGUgKi9cbiAgICBnZXQgc3RhdGUoKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBjdXJyZW50IGlkICovXG4gICAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5pZDtcbiAgICB9XG5cbiAgICAvKiogY3VycmVudCBpbmRleCAqL1xuICAgIGdldCBpbmRleCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIHN0YWNrIHBvb2wgKi9cbiAgICBnZXQgc3RhY2soKTogcmVhZG9ubHkgSGlzdG9yeVN0YXRlPFQ+W10ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2suYXJyYXk7XG4gICAgfVxuXG4gICAgLyoqIGNoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLl9zdGFjay5pc0ZpcnN0O1xuICAgIH1cblxuICAgIC8qKiBjaGVjayBpdCBjYW4gZ28gZm9yd2FyZCBpbiBoaXN0b3J5ICovXG4gICAgZ2V0IGNhbkZvcndhcmQoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhdGhpcy5fc3RhY2suaXNMYXN0O1xuICAgIH1cblxuICAgIC8qKiBnZXQgZGF0YSBieSBpbmRleC4gKi9cbiAgICBhdChpbmRleDogbnVtYmVyKTogSGlzdG9yeVN0YXRlPFQ+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0YWNrLmF0KGluZGV4KTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygtMSk7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgZm9yd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgZm9yd2FyZCgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICByZXR1cm4gdGhpcy5nbygxKTtcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBhIHNwZWNpZmljIHBvaW50IGluIGhpc3RvcnkuICovXG4gICAgYXN5bmMgZ28oZGVsdGE/OiBudW1iZXIpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCBvbGRJbmRleCA9IHRoaXMuaW5kZXg7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGlmIGdpdmVuIDAsIGp1c3QgcmVsb2FkLlxuICAgICAgICAgICAgY29uc3Qgb2xkU3RhdGUgPSBkZWx0YSA/IHRoaXMuc3RhdGUgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuX3N0YWNrLmRpc3RhbmNlKGRlbHRhID8/IDApO1xuICAgICAgICAgICAgY29uc3QgZGYgPSBuZXcgRGVmZXJyZWQoKTtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdm9pZCB0aGlzLm9uQ2hhbmdlU3RhdGUoJ3NlZWsnLCBkZiwgbmV3U3RhdGUsIG9sZFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5kZXgob2xkSW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHN0YWNrIElELiAqL1xuICAgIHRyYXZlcnNlVG8oaWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIGNvbnN0IHsgZGlyZWN0aW9uLCBkZWx0YSB9ID0gdGhpcy5kaXJlY3QoaWQpO1xuICAgICAgICBpZiAoJ21pc3NpbmcnID09PSBkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgdHJhdmVyc2VUbygke2lkfSksIHJldHVybmVkIG1pc3NpbmcuYCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdvKGRlbHRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVnaXN0ZXIgbmV3IGhpc3RvcnkuXG4gICAgICogQGphIOaWsOimj+WxpeattOOBrueZu+mMslxuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1c2goaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdwdXNoJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVwbGFjZSBjdXJyZW50IGhpc3RvcnkuXG4gICAgICogQGphIOePvuWcqOOBruWxpeattOOBrue9ruaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIGlkXG4gICAgICogIC0gYGVuYCBTcGVjaWZpZWQgc3RhY2sgSURcbiAgICAgKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gICAgICogQHBhcmFtIHN0YXRlXG4gICAgICogIC0gYGVuYCBTdGF0ZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzdGFja1xuICAgICAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBTdGF0ZSBtYW5hZ2VtZW50IG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOeKtuaFi+euoeeQhueUqOOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHJlcGxhY2UoaWQ6IHN0cmluZywgc3RhdGU/OiBULCBvcHRpb25zPzogSGlzdG9yeVNldFN0YXRlT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZVN0YXRlKCdyZXBsYWNlJywgaWQsIHN0YXRlLCBvcHRpb25zID8/IHt9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgZm9yd2FyZCBoaXN0b3J5IGZyb20gY3VycmVudCBpbmRleC5cbiAgICAgKiBAamEg54++5Zyo44Gu5bGl5q2044Gu44Kk44Oz44OH44OD44Kv44K544KI44KK5YmN5pa544Gu5bGl5q2044KS5YmK6ZmkXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXJGb3J3YXJkKCk6IFByb21pc2U8dm9pZD4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXF1aXJlLWF3YWl0XG4gICAgICAgIHRoaXMuX3N0YWNrLmNsZWFyRm9yd2FyZCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gY2xvc2V0IGluZGV4IGJ5IElELlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ8gSUQg44GL44KJ5pyA44KC6L+R44GEIGluZGV4IOOCkui/lOWNtFxuICAgICAqL1xuICAgIGNsb3Nlc3QoaWQ6IHN0cmluZyk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5jbG9zZXN0KGlkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGRlc3RpbmF0aW9uIHN0YWNrIGluZm9ybWF0aW9uIGJ5IGBzdGFydGAgYW5kIGBlbmRgIElELlxuICAgICAqIEBqYSDotbfngrksIOe1gueCueOBriBJRCDjgYvjgonntYLngrnjga7jgrnjgr/jg4Pjgq/mg4XloLHjgpLov5TljbRcbiAgICAgKi9cbiAgICBkaXJlY3QodG9JZDogc3RyaW5nLCBmcm9tSWQ/OiBzdHJpbmcpOiBIaXN0b3J5RGlyZWN0UmV0dXJuVHlwZTxUPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdGFjay5kaXJlY3QodG9JZCwgZnJvbUlkKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogQGludGVybmFsIHNldCBpbmRleCAqL1xuICAgIHByaXZhdGUgc2V0SW5kZXgoaWR4OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhY2suaW5kZXggPSBpZHg7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIGV2ZW50ICYgd2FpdCBwcm9jZXNzICovXG4gICAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyRXZlbnRBbmRXYWl0KFxuICAgICAgICBldmVudDogJ3JlZnJlc2gnIHwgJ2NoYW5naW5nJyxcbiAgICAgICAgYXJnMTogSGlzdG9yeVN0YXRlPFQ+LFxuICAgICAgICBhcmcyOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQgfCAoKHJlYXNvbj86IHVua25vd24pID0+IHZvaWQpLFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdID0gW107XG4gICAgICAgIHRoaXMucHVibGlzaChldmVudCwgYXJnMSwgYXJnMiBhcyBhbnksIHByb21pc2VzKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdXBkYXRlICovXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTdGF0ZShtZXRob2Q6ICdwdXNoJyB8ICdyZXBsYWNlJywgaWQ6IHN0cmluZywgc3RhdGU6IFQgfCB1bmRlZmluZWQsIG9wdGlvbnM6IEhpc3RvcnlTZXRTdGF0ZU9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgICAgICBjb25zdCB7IHNpbGVudCwgY2FuY2VsIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIGNvbnN0IG5ld1N0YXRlID0gY3JlYXRlRGF0YShpZCwgc3RhdGUpO1xuICAgICAgICBpZiAoJ3JlcGxhY2UnID09PSBtZXRob2QgJiYgMCA9PT0gdGhpcy5pbmRleCkge1xuICAgICAgICAgICAgbmV3U3RhdGVbJ0BvcmlnaW4nXSA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBhc3NpZ25TdGF0ZUVsZW1lbnQobmV3U3RhdGUsIHRoaXMuX3N0YWNrIGFzIEhpc3RvcnlTdGFjayk7XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGRmID0gbmV3IERlZmVycmVkKGNhbmNlbCk7XG4gICAgICAgICAgICB2b2lkIHBvc3QoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5vbkNoYW5nZVN0YXRlKG1ldGhvZCwgZGYsIG5ld1N0YXRlLCB0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXdhaXQgZGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5pbmRleDtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGNoYW5nZSBzdGF0ZSBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBhc3luYyBvbkNoYW5nZVN0YXRlKG1ldGhvZDogJ25vb3AnIHwgJ3B1c2gnIHwgJ3JlcGxhY2UnIHwgJ3NlZWsnLCBkZjogRGVmZXJyZWQsIG5ld1N0YXRlOiBIaXN0b3J5U3RhdGU8VD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8VD4gfCB1bmRlZmluZWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgeyBjYW5jZWwsIHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2UoKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmlnZ2VyRXZlbnRBbmRXYWl0KCdjaGFuZ2luZycsIG5ld1N0YXRlLCBjYW5jZWwpO1xuXG4gICAgICAgICAgICBpZiAodG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdG9rZW4ucmVhc29uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9zdGFja1tgJHttZXRob2R9U3RhY2tgXShuZXdTdGF0ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnRyaWdnZXJFdmVudEFuZFdhaXQoJ3JlZnJlc2gnLCBuZXdTdGF0ZSwgb2xkU3RhdGUpO1xuXG4gICAgICAgICAgICBkZi5yZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgIGRmLnJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSBtZW1vcnkgaGlzdG9yeSBtYW5hZ2VtZW50IG9iamVjdC5cbiAqIEBqYSDjg6Hjg6Ljg6rlsaXmrbTnrqHnkIbjgqrjg5bjgrjjgqfjgq/jg4jjgpLmp4vnr4lcbiAqXG4gKiBAcGFyYW0gaWRcbiAqICAtIGBlbmAgU3BlY2lmaWVkIHN0YWNrIElEXG4gKiAgLSBgamFgIOOCueOCv+ODg+OCr0lE44KS5oyH5a6aXG4gKiBAcGFyYW0gc3RhdGVcbiAqICAtIGBlbmAgU3RhdGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3RhY2tcbiAqICAtIGBqYWAg44K544K/44OD44KvIOOBq+e0kOOBpeOBj+eKtuaFi+OCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVtb3J5SGlzdG9yeTxUID0gUGxhaW5PYmplY3Q+KGlkOiBzdHJpbmcsIHN0YXRlPzogVCk6IElIaXN0b3J5PFQ+IHtcbiAgICByZXR1cm4gbmV3IE1lbW9yeUhpc3RvcnkoaWQsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBAZW4gUmVzZXQgbWVtb3J5IGhpc3RvcnkuXG4gKiBAamEg44Oh44Oi44Oq5bGl5q2044Gu44Oq44K744OD44OIXG4gKlxuICogQHBhcmFtIGluc3RhbmNlXG4gKiAgLSBgZW5gIGBNZW1vcnlIaXN0b3J5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgTWVtb3J5SGlzdG9yeWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNldE1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4sIG9wdGlvbnM/OiBIaXN0b3J5U2V0U3RhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgKGluc3RhbmNlIGFzIGFueSlbJHNpZ25hdHVyZV0gJiYgYXdhaXQgKGluc3RhbmNlIGFzIE1lbW9yeUhpc3Rvcnk8VD4pLnJlc2V0KG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBEaXNwb3NlIG1lbW9yeSBoaXN0b3J5IG1hbmFnZW1lbnQgb2JqZWN0LlxuICogQGphIOODoeODouODquWxpeattOeuoeeQhuOCquODluOCuOOCp+OCr+ODiOOBruegtOajhFxuICpcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICogIC0gYGVuYCBgTWVtb3J5SGlzdG9yeWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYE1lbW9yeUhpc3RvcnlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZU1lbW9yeUhpc3Rvcnk8VCA9IFBsYWluT2JqZWN0PihpbnN0YW5jZTogSUhpc3Rvcnk8VD4pOiB2b2lkIHtcbiAgICAoaW5zdGFuY2UgYXMgYW55KVskc2lnbmF0dXJlXSAmJiAoaW5zdGFuY2UgYXMgTWVtb3J5SGlzdG9yeTxUPikuZGlzcG9zZSgpO1xufVxuIiwiaW1wb3J0IHsgcGF0aDJyZWdleHAgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1wYXRoMnJlZ2V4cCc7XG5pbXBvcnQge1xuICAgIFdyaXRhYmxlLFxuICAgIENsYXNzLFxuICAgIGlzU3RyaW5nLFxuICAgIGlzQXJyYXksXG4gICAgaXNPYmplY3QsXG4gICAgaXNGdW5jdGlvbixcbiAgICBhc3NpZ25WYWx1ZSxcbiAgICBzbGVlcCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICB0b1F1ZXJ5U3RyaW5ncyxcbiAgICBwYXJzZVVybFF1ZXJ5LFxuICAgIGNvbnZlcnRVcmxQYXJhbVR5cGUsXG59IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQge1xuICAgIERPTSxcbiAgICBET01TZWxlY3RvcixcbiAgICBkb20gYXMgJCxcbn0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHtcbiAgICB0b1VybCxcbiAgICBsb2FkVGVtcGxhdGVTb3VyY2UsXG4gICAgdG9UZW1wbGF0ZUVsZW1lbnQsXG59IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSGlzdG9yeURpcmVjdGlvbixcbiAgICBJSGlzdG9yeSxcbiAgICBjcmVhdGVTZXNzaW9uSGlzdG9yeSxcbiAgICBjcmVhdGVNZW1vcnlIaXN0b3J5LFxufSBmcm9tICcuLi9oaXN0b3J5JztcbmltcG9ydCB7IG5vcm1hbGl6ZUlkIH0gZnJvbSAnLi4vaGlzdG9yeS9pbnRlcm5hbCc7XG5pbXBvcnQgdHlwZSB7XG4gICAgUGFnZVRyYW5zaXRpb25QYXJhbXMsXG4gICAgUm91dGVDaGFuZ2VJbmZvLFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXRoUGFyYW1zLFxuICAgIFJvdXRlUGFyYW1ldGVycyxcbiAgICBSb3V0ZSxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXMsXG4gICAgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyxcbiAgICBSb3V0ZXIsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7IFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IH0gZnJvbSAnLi9hc3luYy1wcm9jZXNzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGVudW0gQ3NzTmFtZSB7XG4gICAgREVGQVVMVF9QUkVGSVggICAgICAgPSAnY2RwJyxcbiAgICBUUkFOU0lUSU9OX0RJUkVDVElPTiA9ICd0cmFuc2l0aW9uLWRpcmVjdGlvbicsXG4gICAgVFJBTlNJVElPTl9SVU5OSU5HICAgPSAndHJhbnNpdGlvbi1ydW5uaW5nJyxcbiAgICBQQUdFX0NVUlJFTlQgICAgICAgICA9ICdwYWdlLWN1cnJlbnQnLFxuICAgIFBBR0VfUFJFVklPVVMgICAgICAgID0gJ3BhZ2UtcHJldmlvdXMnLFxuICAgIEVOVEVSX0ZST01fQ0xBU1MgICAgID0gJ2VudGVyLWZyb20nLFxuICAgIEVOVEVSX0FDVElWRV9DTEFTUyAgID0gJ2VudGVyLWFjdGl2ZScsXG4gICAgRU5URVJfVE9fQ0xBU1MgICAgICAgPSAnZW50ZXItdG8nLFxuICAgIExFQVZFX0ZST01fQ0xBU1MgICAgID0gJ2xlYXZlLWZyb20nLFxuICAgIExFQVZFX0FDVElWRV9DTEFTUyAgID0gJ2xlYXZlLWFjdGl2ZScsXG4gICAgTEVBVkVfVE9fQ0xBU1MgICAgICAgPSAnbGVhdmUtdG8nLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBEb21DYWNoZSB7XG4gICAgREFUQV9OQU1FICAgICAgICAgICA9ICdkb20tY2FjaGUnLFxuICAgIENBQ0hFX0xFVkVMX01FTU9SWSAgPSAnbWVtb3J5JyxcbiAgICBDQUNIRV9MRVZFTF9DT05ORUNUID0gJ2Nvbm5lY3QnLFxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZW51bSBMaW5rRGF0YSB7XG4gICAgVFJBTlNJVElPTiAgICAgICA9ICd0cmFuc2l0aW9uJyxcbiAgICBOQVZJQUdBVEVfTUVUSE9EID0gJ25hdmlnYXRlLW1ldGhvZCcsXG4gICAgUFJFRkVUQ0ggICAgICAgICA9ICdwcmVmZXRjaCcsXG4gICAgUFJFVkVOVF9ST1VURVIgICA9ICdwcmV2ZW50LXJvdXRlcicsXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlbnVtIENvbnN0IHtcbiAgICBXQUlUX1RSQU5TSVRJT05fTUFSR0lOID0gMTAwLCAvLyBtc2VjXG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFBhZ2VFdmVudCA9ICdpbml0JyB8ICdtb3VudGVkJyB8ICdjbG9uZWQnIHwgJ2JlZm9yZS1lbnRlcicgfCAnYWZ0ZXItZW50ZXInIHwgJ2JlZm9yZS1sZWF2ZScgfCAnYWZ0ZXItbGVhdmUnIHwgJ3VubW91bnRlZCcgfCAncmVtb3ZlZCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCBleHRlbmRzIFJvdXRlQ2hhbmdlSW5mbyB7XG4gICAgcmVhZG9ubHkgYXN5bmNQcm9jZXNzOiBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dDtcbiAgICBzYW1lUGFnZUluc3RhbmNlPzogYm9vbGVhbjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZmxhdCBSb3V0ZVBhcmFtZXRlcnMgKi9cbmV4cG9ydCB0eXBlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSBPbWl0PFJvdXRlUGFyYW1ldGVycywgJ3JvdXRlcyc+ICYge1xuICAgIC8qKiByZWdleHAgZnJvbSBwYXRoICovXG4gICAgcmVnZXhwOiBSZWdFeHA7XG4gICAgLyoqIGtleXMgb2YgcGFyYW1zICovXG4gICAgcGFyYW1LZXlzOiBzdHJpbmdbXTtcbiAgICAvKiogRE9NIHRlbXBsYXRlIGluc3RhbmNlIHdpdGggUGFnZSBlbGVtZW50ICovXG4gICAgJHRlbXBsYXRlPzogRE9NO1xuICAgIC8qKiByb3V0ZXIgcGFnZSBpbnN0YW5jZSBmcm9tIGBjb21wb25lbnRgIHByb3BlcnR5ICovXG4gICAgcGFnZT86IFBhZ2U7XG4gICAgLyoqIGxhdGVzdCByb3V0ZSBjb250ZXh0IGNhY2hlICovXG4gICAgJ0Byb3V0ZSc/OiBSb3V0ZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQgPSBSb3V0ZVN1YkZsb3dQYXJhbXMgJiBSZXF1aXJlZDxQYWdlVHJhbnNpdGlvblBhcmFtcz4gJiB7XG4gICAgb3JpZ2luOiBzdHJpbmc7XG59O1xuXG4vKiogQGludGVybmFsIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IHR5cGUgUm91dGVDb250ZXh0ID0gV3JpdGFibGU8Um91dGU+ICYgUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyAmIHtcbiAgICAnQHBhcmFtcyc6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnM7XG4gICAgc3ViZmxvdz86IFJvdXRlU3ViRmxvd1BhcmFtc0NvbnRleHQ7XG59O1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHRvIFJvdXRlQ29udGV4dCAqL1xuZXhwb3J0IGNvbnN0IHRvUm91dGVDb250ZXh0ID0gKHVybDogc3RyaW5nLCByb3V0ZXI6IFJvdXRlciwgcGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzLCBuYXZPcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFJvdXRlQ29udGV4dCA9PiB7XG4gICAgLy8gb21pdCB1bmNsb25hYmxlIHByb3BzXG4gICAgY29uc3QgZnJvbU5hdmlnYXRlID0gISFuYXZPcHRpb25zO1xuICAgIGNvbnN0IGVuc3VyZUNsb25lID0gKGN0eDogdW5rbm93bik6IFJvdXRlQ29udGV4dCA9PiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGN0eCkpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICB7XG4gICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICByb3V0ZXI6IGZyb21OYXZpZ2F0ZSA/IHVuZGVmaW5lZCA6IHJvdXRlcixcbiAgICAgICAgfSxcbiAgICAgICAgbmF2T3B0aW9ucyxcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICAgICAgICAgIHF1ZXJ5OiB7fSxcbiAgICAgICAgICAgIHBhcmFtczoge30sXG4gICAgICAgICAgICBwYXRoOiBwYXJhbXMucGF0aCxcbiAgICAgICAgICAgICdAcGFyYW1zJzogZnJvbU5hdmlnYXRlID8gdW5kZWZpbmVkIDogcGFyYW1zLFxuICAgICAgICB9LFxuICAgICk7XG4gICAgcmV0dXJuIGZyb21OYXZpZ2F0ZSA/IGVuc3VyZUNsb25lKGNvbnRleHQpIDogY29udGV4dCBhcyBSb3V0ZUNvbnRleHQ7XG59O1xuXG4vKiogQGludGVybmFsIGNvbnZlcnQgY29udGV4dCBwYXJhbXMgKi9cbmV4cG9ydCBjb25zdCB0b1JvdXRlQ29udGV4dFBhcmFtZXRlcnMgPSAocm91dGVzOiBSb3V0ZVBhcmFtZXRlcnMgfCBSb3V0ZVBhcmFtZXRlcnNbXSB8IHVuZGVmaW5lZCk6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9PiB7XG4gICAgY29uc3QgZmxhdHRlbiA9IChwYXJlbnRQYXRoOiBzdHJpbmcsIG5lc3RlZDogUm91dGVQYXJhbWV0ZXJzW10pOiBSb3V0ZVBhcmFtZXRlcnNbXSA9PiB7XG4gICAgICAgIGNvbnN0IHJldHZhbDogUm91dGVQYXJhbWV0ZXJzW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBuIG9mIG5lc3RlZCkge1xuICAgICAgICAgICAgbi5wYXRoID0gYCR7cGFyZW50UGF0aC5yZXBsYWNlKC9cXC8kLywgJycpfS8ke25vcm1hbGl6ZUlkKG4ucGF0aCl9YDtcbiAgICAgICAgICAgIHJldHZhbC5wdXNoKG4pO1xuICAgICAgICAgICAgaWYgKG4ucm91dGVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dmFsLnB1c2goLi4uZmxhdHRlbihuLnBhdGgsIG4ucm91dGVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZsYXR0ZW4oJycsIGlzQXJyYXkocm91dGVzKSA/IHJvdXRlcyA6IHJvdXRlcyA/IFtyb3V0ZXNdIDogW10pXG4gICAgICAgIC5tYXAoKHNlZWQ6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlZ2V4cCA9IHBhdGgycmVnZXhwLnBhdGhUb1JlZ2V4cChzZWVkLnBhdGgpO1xuICAgICAgICAgICAgc2VlZC5yZWdleHAgPSByZWdleHA7XG4gICAgICAgICAgICBzZWVkLnBhcmFtS2V5cyA9IChyZWdleHApLmtleXMuZmlsdGVyKGsgPT4gaXNTdHJpbmcoay5uYW1lKSkubWFwKGsgPT4gay5uYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBzZWVkO1xuICAgICAgICB9KTtcbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIHByZXBhcmUgSUhpc3Rvcnkgb2JqZWN0ICovXG5leHBvcnQgY29uc3QgcHJlcGFyZUhpc3RvcnkgPSAoc2VlZDogJ2hhc2gnIHwgJ2hpc3RvcnknIHwgJ21lbW9yeScgfCBJSGlzdG9yeSA9ICdoYXNoJywgaW5pdGlhbFBhdGg/OiBzdHJpbmcsIGNvbnRleHQ/OiBXaW5kb3cpOiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+ID0+IHtcbiAgICByZXR1cm4gKGlzU3RyaW5nKHNlZWQpXG4gICAgICAgID8gJ21lbW9yeScgPT09IHNlZWQgPyBjcmVhdGVNZW1vcnlIaXN0b3J5KGluaXRpYWxQYXRoID8/ICcnKSA6IGNyZWF0ZVNlc3Npb25IaXN0b3J5KGluaXRpYWxQYXRoLCB1bmRlZmluZWQsIHsgbW9kZTogc2VlZCwgY29udGV4dCB9KVxuICAgICAgICA6IHNlZWRcbiAgICApIGFzIElIaXN0b3J5PFJvdXRlQ29udGV4dD47XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnN1cmVQYXRoUGFyYW1zID0gKHBhcmFtczogUm91dGVQYXRoUGFyYW1zIHwgdW5kZWZpbmVkKTogcGF0aDJyZWdleHAuUGFyYW1EYXRhID0+IHtcbiAgICBjb25zdCBwYXRoUGFyYW1zOiBwYXRoMnJlZ2V4cC5QYXJhbURhdGEgPSB7fTtcbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHBhcmFtcykpIHtcbiAgICAgICAgICAgIHBhdGhQYXJhbXNba2V5XSA9IFN0cmluZyhwYXJhbXNba2V5XSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdGhQYXJhbXM7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgYnVpbGROYXZpZ2F0ZVVybCA9IChwYXRoOiBzdHJpbmcsIG9wdGlvbnM6IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBzdHJpbmcgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHBhdGggPSBgLyR7bm9ybWFsaXplSWQocGF0aCl9YDtcbiAgICAgICAgY29uc3QgeyBxdWVyeSwgcGFyYW1zIH0gPSBvcHRpb25zO1xuICAgICAgICBsZXQgdXJsID0gcGF0aDJyZWdleHAuY29tcGlsZShwYXRoKShlbnN1cmVQYXRoUGFyYW1zKHBhcmFtcykpO1xuICAgICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MocXVlcnkpfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFxuICAgICAgICAgICAgUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9OQVZJR0FURV9GQUlMRUQsXG4gICAgICAgICAgICBgQ29uc3RydWN0IHJvdXRlIGRlc3RpbmF0aW9uIGZhaWxlZC4gW3BhdGg6ICR7cGF0aH0sIGRldGFpbDogJHtlcnJvci50b1N0cmluZygpfV1gLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICk7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUGFyYW1zID0gKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiB2b2lkID0+IHtcbiAgICBjb25zdCB7IHVybCB9ID0gcm91dGU7XG4gICAgcm91dGUucXVlcnkgID0gdXJsLmluY2x1ZGVzKCc/JykgPyBwYXJzZVVybFF1ZXJ5KG5vcm1hbGl6ZUlkKHVybCkpIDoge307XG4gICAgcm91dGUucGFyYW1zID0ge307XG5cbiAgICBjb25zdCB7IHJlZ2V4cCwgcGFyYW1LZXlzIH0gPSByb3V0ZVsnQHBhcmFtcyddO1xuICAgIGlmIChwYXJhbUtleXMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHJlZ2V4cC5leGVjKHVybCk/Lm1hcCgodmFsdWUsIGluZGV4KSA9PiB7IHJldHVybiB7IHZhbHVlLCBrZXk6IHBhcmFtS2V5c1tpbmRleCAtIDFdIH07IH0pO1xuICAgICAgICBmb3IgKGNvbnN0IHBhcmFtIG9mIHBhcmFtcyEpIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9IHBhcmFtLmtleSAmJiBudWxsICE9IHBhcmFtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUocm91dGUucGFyYW1zLCBwYXJhbS5rZXksIGNvbnZlcnRVcmxQYXJhbVR5cGUocGFyYW0udmFsdWUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzI2luc3RhbmNlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZUluc3RhbmNlID0gYXN5bmMgKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCB7ICdAcGFyYW1zJzogcGFyYW1zIH0gPSByb3V0ZTtcblxuICAgIGlmIChwYXJhbXMucGFnZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGFscmVhZHkgY3JlYXRlZFxuICAgIH1cblxuICAgIGNvbnN0IHsgY29tcG9uZW50LCBjb21wb25lbnRPcHRpb25zIH0gPSBwYXJhbXM7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29tcG9uZW50KSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBuZXcgKGNvbXBvbmVudCBhcyB1bmtub3duIGFzIENsYXNzKShyb3V0ZSwgY29tcG9uZW50T3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgcGFyYW1zLnBhZ2UgPSBhd2FpdCBjb21wb25lbnQocm91dGUsIGNvbXBvbmVudE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc09iamVjdChjb21wb25lbnQpKSB7XG4gICAgICAgIHBhcmFtcy5wYWdlID0gT2JqZWN0LmFzc2lnbih7ICdAcm91dGUnOiByb3V0ZSwgJ0BvcHRpb25zJzogY29tcG9uZW50T3B0aW9ucyB9LCBjb21wb25lbnQpIGFzIFBhZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLnBhZ2UgPSB7ICdAcm91dGUnOiByb3V0ZSwgJ0BvcHRpb25zJzogY29tcG9uZW50T3B0aW9ucyB9IGFzIFBhZ2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIG5ld2x5IGNyZWF0ZWRcbn07XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIFJvdXRlQ29udGV4dFBhcmFtZXRlcnMjJHRlbXBsYXRlICovXG5leHBvcnQgY29uc3QgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlID0gYXN5bmMgKHBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGlmIChwYXJhbXMuJHRlbXBsYXRlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gYWxyZWFkeSBjcmVhdGVkXG4gICAgfVxuXG4gICAgY29uc3QgZW5zdXJlSW5zdGFuY2UgPSAoZWw6IEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkKTogRE9NID0+IHtcbiAgICAgICAgcmV0dXJuIGVsIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/ICQoWy4uLmVsLmNvbnRlbnQuY2hpbGRyZW5dKSBhcyBET00gOiAkKGVsKTtcbiAgICB9O1xuXG4gICAgY29uc3QgeyBjb250ZW50IH0gPSBwYXJhbXM7XG4gICAgaWYgKG51bGwgPT0gY29udGVudCkge1xuICAgICAgICAvLyBub29wIGVsZW1lbnRcbiAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9ICQ8SFRNTEVsZW1lbnQ+KCk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZygoY29udGVudCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ3NlbGVjdG9yJ10pKSB7XG4gICAgICAgIC8vIGZyb20gYWpheFxuICAgICAgICBjb25zdCB7IHNlbGVjdG9yLCB1cmwgfSA9IGNvbnRlbnQgYXMgeyBzZWxlY3Rvcjogc3RyaW5nOyB1cmw/OiBzdHJpbmc7IH07XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdG9UZW1wbGF0ZUVsZW1lbnQoYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybDogdXJsICYmIHRvVXJsKHVybCkgfSkpO1xuICAgICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihgdGVtcGxhdGUgbG9hZCBmYWlsZWQuIFtzZWxlY3RvcjogJHtzZWxlY3Rvcn0sIHVybDogJHt1cmx9XWApO1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBlbnN1cmVJbnN0YW5jZSh0ZW1wbGF0ZSk7XG4gICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKGNvbnRlbnQpKSB7XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBlbnN1cmVJbnN0YW5jZSgkKGF3YWl0IGNvbnRlbnQoKSlbMF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy4kdGVtcGxhdGUgPSBlbnN1cmVJbnN0YW5jZSgkKGNvbnRlbnQgYXMgRE9NU2VsZWN0b3IpWzBdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTsgLy8gbmV3bHkgY3JlYXRlZFxufTtcblxuLyoqIEBpbnRlcm5hbCBkZWNpZGUgdHJhbnNpdGlvbiBkaXJlY3Rpb24gKi9cbmV4cG9ydCBjb25zdCBkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uID0gKGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mbyk6IEhpc3RvcnlEaXJlY3Rpb24gPT4ge1xuICAgIGlmIChjaGFuZ2VJbmZvLnJldmVyc2UpIHtcbiAgICAgICAgc3dpdGNoIChjaGFuZ2VJbmZvLmRpcmVjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnYmFjayc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdmb3J3YXJkJztcbiAgICAgICAgICAgIGNhc2UgJ2ZvcndhcmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnYmFjayc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VJbmZvLmRpcmVjdGlvbjtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgRWZmZWN0VHlwZSA9ICdhbmltYXRpb24nIHwgJ3RyYW5zaXRpb24nO1xuXG4vKiogQGludGVybmFsIHJldHJpZXZlIGVmZmVjdCBkdXJhdGlvbiBwcm9wZXJ0eSAqL1xuY29uc3QgZ2V0RWZmZWN0RHVyYXRpb25TZWMgPSAoJGVsOiBET00sIGVmZmVjdDogRWZmZWN0VHlwZSk6IG51bWJlciA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZSgkZWxbMF0pW2Ake2VmZmVjdH1EdXJhdGlvbmBdKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgd2FpdEZvckVmZmVjdCA9ICgkZWw6IERPTSwgZWZmZWN0OiBFZmZlY3RUeXBlLCBkdXJhdGlvblNlYzogbnVtYmVyKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgcmV0dXJuIFByb21pc2UucmFjZShbXG4gICAgICAgIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gJGVsW2Ake2VmZmVjdH1FbmRgXShyZXNvbHZlKSksXG4gICAgICAgIHNsZWVwKGR1cmF0aW9uU2VjICogMTAwMCArIENvbnN0LldBSVRfVFJBTlNJVElPTl9NQVJHSU4pLFxuICAgIF0pO1xufTtcblxuLyoqIEBpbnRlcm5hbCB0cmFuc2l0aW9uIGV4ZWN1dGlvbiAqL1xuZXhwb3J0IGNvbnN0IHByb2Nlc3NQYWdlVHJhbnNpdGlvbiA9IGFzeW5jKCRlbDogRE9NLCBmcm9tQ2xhc3M6IHN0cmluZywgYWN0aXZlQ2xhc3M6IHN0cmluZywgdG9DbGFzczogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgJGVsLnJlbW92ZUNsYXNzKGZyb21DbGFzcyk7XG4gICAgJGVsLmFkZENsYXNzKHRvQ2xhc3MpO1xuXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIFsnYW5pbWF0aW9uJywgJ3RyYW5zaXRpb24nXSBhcyBFZmZlY3RUeXBlW10pIHtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBnZXRFZmZlY3REdXJhdGlvblNlYygkZWwsIGVmZmVjdCk7XG4gICAgICAgIGR1cmF0aW9uICYmIHByb21pc2VzLnB1c2god2FpdEZvckVmZmVjdCgkZWwsIGVmZmVjdCwgZHVyYXRpb24pKTtcbiAgICB9XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgJGVsLnJlbW92ZUNsYXNzKFthY3RpdmVDbGFzcywgdG9DbGFzc10pO1xufTtcbiIsImltcG9ydCB0eXBlIHsgUm91dGVBeW5jUHJvY2VzcyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgUm91dGVBeW5jUHJvY2VzcyBpbXBsZW1lbnRhdGlvbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQXluY1Byb2Nlc3NDb250ZXh0IGltcGxlbWVudHMgUm91dGVBeW5jUHJvY2VzcyB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSA9IFtdO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogUm91dGVBeW5jUHJvY2Vzc1xuXG4gICAgcmVnaXN0ZXIocHJvbWlzZTogUHJvbWlzZTx1bmtub3duPik6IHZvaWQge1xuICAgICAgICB0aGlzLl9wcm9taXNlcy5wdXNoKHByb21pc2UpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGludGVybmFsIG1ldGhvZHM6XG5cbiAgICBnZXQgcHJvbWlzZXMoKTogcmVhZG9ubHkgUHJvbWlzZTx1bmtub3duPltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb21pc2VzO1xuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBjb21wbGV0ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodGhpcy5fcHJvbWlzZXMpO1xuICAgICAgICB0aGlzLl9wcm9taXNlcy5sZW5ndGggPSAwO1xuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIEFjY2Vzc2libGUsXG4gICAgaXNBcnJheSxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGNhbWVsaXplLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBOYXRpdmVQcm9taXNlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgUkVTVUxUX0NPREUsXG4gICAgaXNSZXN1bHQsXG4gICAgbWFrZVJlc3VsdCxcbn0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBET00sXG4gICAgZG9tIGFzICQsXG4gICAgRE9NU2VsZWN0b3IsXG59IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IHdhaXRGcmFtZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7IHRvUm91dGVyUGF0aCB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7IHdpbmRvdyB9IGZyb20gJy4uL3Nzcic7XG5pbXBvcnQgeyBub3JtYWxpemVJZCB9IGZyb20gJy4uL2hpc3RvcnkvaW50ZXJuYWwnO1xuaW1wb3J0IHR5cGUgeyBJSGlzdG9yeSwgSGlzdG9yeVN0YXRlIH0gZnJvbSAnLi4vaGlzdG9yeSc7XG5pbXBvcnQge1xuICAgIFBhZ2VUcmFuc2l0aW9uUGFyYW1zLFxuICAgIFJvdXRlckV2ZW50LFxuICAgIFBhZ2UsXG4gICAgUm91dGVQYXJhbWV0ZXJzLFxuICAgIFJvdXRlLFxuICAgIFRyYW5zaXRpb25TZXR0aW5ncyxcbiAgICBOYXZpZ2F0aW9uU2V0dGluZ3MsXG4gICAgUGFnZVN0YWNrLFxuICAgIFB1c2hQYWdlU3RhY2tPcHRpb25zLFxuICAgIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnMsXG4gICAgUm91dGVTdWJGbG93UGFyYW1zLFxuICAgIFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMsXG4gICAgUm91dGVyUmVmcmVzaExldmVsLFxuICAgIFJvdXRlcixcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgQ3NzTmFtZSxcbiAgICBEb21DYWNoZSxcbiAgICBMaW5rRGF0YSxcbiAgICBQYWdlRXZlbnQsXG4gICAgUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0LFxuICAgIFJvdXRlQ29udGV4dCxcbiAgICBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgIHRvUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICB0b1JvdXRlQ29udGV4dCxcbiAgICBwcmVwYXJlSGlzdG9yeSxcbiAgICBidWlsZE5hdmlnYXRlVXJsLFxuICAgIHBhcnNlVXJsUGFyYW1zLFxuICAgIGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZSxcbiAgICBlbnN1cmVSb3V0ZXJQYWdlVGVtcGxhdGUsXG4gICAgZGVjaWRlVHJhbnNpdGlvbkRpcmVjdGlvbixcbiAgICBwcm9jZXNzUGFnZVRyYW5zaXRpb24sXG59IGZyb20gJy4vaW50ZXJuYWwnO1xuaW1wb3J0IHsgUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQgfSBmcm9tICcuL2FzeW5jLXByb2Nlc3MnO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gUm91dGVyIGltcGxpbWVudCBjbGFzcy5cbiAqIEBqYSBSb3V0ZXIg5a6f6KOF44Kv44Op44K5XG4gKi9cbmNsYXNzIFJvdXRlckNvbnRleHQgZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSb3V0ZXJFdmVudD4gaW1wbGVtZW50cyBSb3V0ZXIge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JvdXRlczogUmVjb3JkPHN0cmluZywgUm91dGVDb250ZXh0UGFyYW1ldGVycz4gPSB7fTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5OiBJSGlzdG9yeTxSb3V0ZUNvbnRleHQ+O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgXyRlbDogRE9NO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3JhZjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlDaGFuZ2luZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9oaXN0b3J5UmVmcmVzaEhhbmRsZXI6IHR5cGVvZiBSb3V0ZXJDb250ZXh0LnByb3RvdHlwZS5vbkhpc3RvcnlSZWZyZXNoO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Vycm9ySGFuZGxlcjogdHlwZW9mIFJvdXRlckNvbnRleHQucHJvdG90eXBlLm9uSGFuZGxlRXJyb3I7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfY3NzUHJlZml4OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBfdHJhbnNpdGlvblNldHRpbmdzOiBUcmFuc2l0aW9uU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBfbmF2aWdhdGlvblNldHRpbmdzOiBSZXF1aXJlZDxOYXZpZ2F0aW9uU2V0dGluZ3M+O1xuICAgIHByaXZhdGUgX2xhc3RSb3V0ZT86IFJvdXRlQ29udGV4dDtcbiAgICBwcml2YXRlIF9wcmV2Um91dGU/OiBSb3V0ZUNvbnRleHQ7XG4gICAgcHJpdmF0ZSBfc3ViZmxvd1RyYW5zaXRpb25QYXJhbXM/OiBQYWdlVHJhbnNpdGlvblBhcmFtcztcbiAgICBwcml2YXRlIF9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3RvcjogRE9NU2VsZWN0b3I8c3RyaW5nIHwgSFRNTEVsZW1lbnQ+LCBvcHRpb25zOiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgcm91dGVzLFxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIHdpbmRvdzogY29udGV4dCxcbiAgICAgICAgICAgIGhpc3RvcnksXG4gICAgICAgICAgICBpbml0aWFsUGF0aCxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxTdGFja3MsXG4gICAgICAgICAgICBjc3NQcmVmaXgsXG4gICAgICAgICAgICB0cmFuc2l0aW9uLFxuICAgICAgICAgICAgbmF2aWdhdGlvbixcbiAgICAgICAgfSA9IG9wdGlvbnM7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgICAgICB0aGlzLl9yYWYgPSBjb250ZXh0Py5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPz8gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuICAgICAgICB0aGlzLl8kZWwgPSAkKHNlbGVjdG9yLCBlbCk7XG4gICAgICAgIGlmICghdGhpcy5fJGVsLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0VMRU1FTlRfTk9UX0ZPVU5ELCBgUm91dGVyIGVsZW1lbnQgbm90IGZvdW5kLiBbc2VsZWN0b3I6ICR7c2VsZWN0b3IgYXMgc3RyaW5nfV1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2hpc3RvcnkgPSBwcmVwYXJlSGlzdG9yeShoaXN0b3J5LCBpbml0aWFsUGF0aCwgY29udGV4dCEpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyID0gdGhpcy5vbkhpc3RvcnlDaGFuZ2luZy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIgID0gdGhpcy5vbkhpc3RvcnlSZWZyZXNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuX2Vycm9ySGFuZGxlciAgICAgICAgICAgPSB0aGlzLm9uSGFuZGxlRXJyb3IuYmluZCh0aGlzKTtcblxuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdjaGFuZ2luZycsIHRoaXMuX2hpc3RvcnlDaGFuZ2luZ0hhbmRsZXIpO1xuICAgICAgICB0aGlzLl9oaXN0b3J5Lm9uKCdyZWZyZXNoJywgIHRoaXMuX2hpc3RvcnlSZWZyZXNoSGFuZGxlcik7XG4gICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcblxuICAgICAgICAvLyBmb2xsb3cgYW5jaG9yXG4gICAgICAgIHRoaXMuXyRlbC5vbignY2xpY2snLCAnW2hyZWZdJywgdGhpcy5vbkFuY2hvckNsaWNrZWQuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5fY3NzUHJlZml4ID0gY3NzUHJlZml4ID8/IENzc05hbWUuREVGQVVMVF9QUkVGSVg7XG4gICAgICAgIHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBkZWZhdWx0OiAnbm9uZScsIHJlbG9hZDogJ25vbmUnIH0sIHRyYW5zaXRpb24pO1xuICAgICAgICB0aGlzLl9uYXZpZ2F0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbWV0aG9kOiAncHVzaCcgfSwgbmF2aWdhdGlvbik7XG5cbiAgICAgICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWdpc3Rlcihyb3V0ZXMhLCBmYWxzZSk7XG4gICAgICAgICAgICBpZiAoYWRkaXRpb25hbFN0YWNrcz8ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wdXNoUGFnZVN0YWNrKGFkZGl0aW9uYWxTdGFja3MsIHsgbm9OYXZpZ2F0ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXJ0ICYmIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9KSgpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IFJvdXRlclxuXG4gICAgLyoqIFJvdXRlcidzIHZpZXcgSFRNTCBlbGVtZW50ICovXG4gICAgZ2V0IGVsKCk6IEhUTUxFbGVtZW50IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuXyRlbFswXTtcbiAgICB9XG5cbiAgICAvKiogT2JqZWN0IHdpdGggY3VycmVudCByb3V0ZSBkYXRhICovXG4gICAgZ2V0IGN1cnJlbnRSb3V0ZSgpOiBSb3V0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0b3J5LnN0YXRlO1xuICAgIH1cblxuICAgIC8qKiBDaGVjayBzdGF0ZSBpcyBpbiBzdWItZmxvdyAqL1xuICAgIGdldCBpc0luU3ViRmxvdygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5maW5kU3ViRmxvd1BhcmFtcyhmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqIENoZWNrIGl0IGNhbiBnbyBiYWNrIGluIGhpc3RvcnkgKi9cbiAgICBnZXQgY2FuQmFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3RvcnkuY2FuQmFjaztcbiAgICB9XG5cbiAgICAvKiogQ2hlY2sgaXQgY2FuIGdvIGZvcndhcmQgaW4gaGlzdG9yeSAqL1xuICAgIGdldCBjYW5Gb3J3YXJkKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5faGlzdG9yeS5jYW5Gb3J3YXJkO1xuICAgIH1cblxuICAgIC8qKiBSb3V0ZSByZWdpc3RyYXRpb24gKi9cbiAgICBhc3luYyByZWdpc3Rlcihyb3V0ZXM6IFJvdXRlUGFyYW1ldGVycyB8IFJvdXRlUGFyYW1ldGVyc1tdLCByZWZyZXNoID0gZmFsc2UpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3QgcHJlZmV0Y2hQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGNvbnRleHQgb2YgdG9Sb3V0ZUNvbnRleHRQYXJhbWV0ZXJzKHJvdXRlcykpIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tjb250ZXh0LnBhdGhdID0gY29udGV4dDtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGVudCwgcHJlZmV0Y2ggfSA9IGNvbnRleHQ7XG4gICAgICAgICAgICBjb250ZW50ICYmIHByZWZldGNoICYmIHByZWZldGNoUGFyYW1zLnB1c2goY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcmVmZXRjaFBhcmFtcy5sZW5ndGggJiYgYXdhaXQgdGhpcy5zZXRQcmVmZXRjaENvbnRlbnRzKHByZWZldGNoUGFyYW1zKTtcbiAgICAgICAgcmVmcmVzaCAmJiBhd2FpdCB0aGlzLnJlZnJlc2goKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogTmF2aWdhdGUgdG8gbmV3IHBhZ2UuICovXG4gICAgYXN5bmMgbmF2aWdhdGUodG86IHN0cmluZywgb3B0aW9ucz86IFJvdXRlTmF2aWdhdGlvbk9wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNlZWQgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXModG8pO1xuICAgICAgICAgICAgaWYgKCFzZWVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX05BVklHQVRFX0ZBSUxFRCwgYFJvdXRlIG5vdCBmb3VuZC4gW3RvOiAke3RvfV1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3B0cyAgID0gT2JqZWN0LmFzc2lnbih7IGludGVudDogdW5kZWZpbmVkIH0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgdXJsICAgID0gYnVpbGROYXZpZ2F0ZVVybCh0bywgb3B0cyk7XG4gICAgICAgICAgICBjb25zdCByb3V0ZSAgPSB0b1JvdXRlQ29udGV4dCh1cmwsIHRoaXMsIHNlZWQsIG9wdHMpO1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gb3B0cy5tZXRob2QgPz8gdGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLm1ldGhvZDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBleGVjIG5hdmlnYXRlXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeVttZXRob2RdKHVybCwgcm91dGUpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm9vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQWRkIHBhZ2Ugc3RhY2sgc3RhcnRpbmcgZnJvbSB0aGUgY3VycmVudCBoaXN0b3J5LiAqL1xuICAgIGFzeW5jIHB1c2hQYWdlU3RhY2soc3RhY2s6IFBhZ2VTdGFjayB8IFBhZ2VTdGFja1tdLCBvcHRpb25zPzogUHVzaFBhZ2VTdGFja09wdGlvbnMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgbm9OYXZpZ2F0ZSwgdHJhdmVyc2VUbyB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgICAgIGNvbnN0IHN0YWNrcyA9IGlzQXJyYXkoc3RhY2spID8gc3RhY2sgOiBbc3RhY2tdO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gc3RhY2tzLmZpbHRlcihzID0+ICEhcy5yb3V0ZSkubWFwKHMgPT4gcy5yb3V0ZSEpO1xuXG4gICAgICAgICAgICAvLyBlbnNydWUgUm91dGVcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVnaXN0ZXIocm91dGVzLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc3VwcHJlc3NFdmVudExpc3RlbmVyU2NvcGUoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIHB1c2ggaGlzdG9yeVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBzdGFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoOiB1cmwsIHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHBhZ2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSB0b1JvdXRlclBhdGgodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5maW5kUm91dGVDb250ZXh0UGFyYW1zKHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9ST1VURV9DQU5OT1RfQkVfUkVTT0xWRUQsIGBSb3V0ZSBjYW5ub3QgYmUgcmVzb2x2ZWQuIFtwYXRoOiAke3VybH1dYCwgcGFnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gc2lsZW50IHJlZ2lzdHJ5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gdG9Sb3V0ZUNvbnRleHQocGF0aCwgdGhpcywgcGFyYW1zLCB7IGludGVudDogdW5kZWZpbmVkIH0pO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS50cmFuc2l0aW9uID0gdHJhbnNpdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUucmV2ZXJzZSAgICA9IHJldmVyc2U7XG4gICAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5faGlzdG9yeS5wdXNoKHBhdGgsIHJvdXRlLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRyYXZlcnNlVG8pIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKHRvUm91dGVyUGF0aCh0cmF2ZXJzZVRvKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghbm9OYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aGlzLm9uSGFuZGxlRXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogVG8gbW92ZSBiYWNrd2FyZCB0aHJvdWdoIGhpc3RvcnkuICovXG4gICAgYmFjaygpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ28oLTEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGZvcndhcmQgdGhyb3VnaCBoaXN0b3J5LiAqL1xuICAgIGZvcndhcmQoKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmdvKDEpO1xuICAgIH1cblxuICAgIC8qKiBUbyBtb3ZlIGEgc3BlY2lmaWMgcG9pbnQgaW4gaGlzdG9yeS4gKi9cbiAgICBhc3luYyBnbyhkZWx0YT86IG51bWJlcik6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmdvKGRlbHRhKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIFRvIG1vdmUgYSBzcGVjaWZpYyBwb2ludCBpbiBoaXN0b3J5IGJ5IHBhdGggc3RyaW5nLiAqL1xuICAgIGFzeW5jIHRyYXZlcnNlVG8oc3JjOiBzdHJpbmcpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS50cmF2ZXJzZVRvKHRvUm91dGVyUGF0aChzcmMpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqIEJlZ2luIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGJlZ2luU3ViRmxvdyh0bzogc3RyaW5nLCBzdWJmbG93PzogUm91dGVTdWJGbG93UGFyYW1zLCBvcHRpb25zPzogUm91dGVOYXZpZ2F0aW9uT3B0aW9ucyk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyB0cmFuc2l0aW9uLCByZXZlcnNlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb246IHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncy5kZWZhdWx0ISxcbiAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbjogdGhpcy5jdXJyZW50Um91dGUudXJsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc3ViZmxvdyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVTdWJGbG93UGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgICAodGhpcy5jdXJyZW50Um91dGUgYXMgUm91dGVDb250ZXh0KS5zdWJmbG93ID0gcGFyYW1zO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5uYXZpZ2F0ZSh0bywgb3B0aW9ucyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ29tbWl0IHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNvbW1pdFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgY29uc3QgeyBhZGRpdGlvbmFsRGlzdGFuY2UsIGFkZGl0aW9uYWxTdGFja3MgfSA9IHN1YmZsb3cucGFyYW1zO1xuICAgICAgICBjb25zdCBkaXN0YW5jZSA9IHN1YmZsb3cuZGlzdGFuY2UgKyBhZGRpdGlvbmFsRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGFkZGl0aW9uYWxTdGFja3M/Lmxlbmd0aCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZSgoKSA9PiB0aGlzLmdvKC0xICogZGlzdGFuY2UpKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucHVzaFBhZ2VTdGFjayhhZGRpdGlvbmFsU3RhY2tzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZ28oLTEgKiBkaXN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5faGlzdG9yeS5jbGVhckZvcndhcmQoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKiogQ2FuY2VsIHN1Yi1mbG93IHRyYW5zYWN0aW9uLiAqL1xuICAgIGFzeW5jIGNhbmNlbFN1YkZsb3cocGFyYW1zPzogUGFnZVRyYW5zaXRpb25QYXJhbXMpOiBQcm9taXNlPHRoaXM+IHtcbiAgICAgICAgY29uc3Qgc3ViZmxvdyA9IHRoaXMuZmluZFN1YkZsb3dQYXJhbXModHJ1ZSk7XG4gICAgICAgIGlmICghc3ViZmxvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb24sIHJldmVyc2UgfSA9IHN1YmZsb3cucGFyYW1zO1xuXG4gICAgICAgIHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zaXRpb24sIHJldmVyc2UgfSwgcGFyYW1zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5nbygtMSAqIHN1YmZsb3cuZGlzdGFuY2UpO1xuICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmNsZWFyRm9yd2FyZCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKiBTZXQgY29tbW9uIHRyYW5zaXRpb24gc2V0dG5pZ3MuICovXG4gICAgdHJhbnNpdGlvblNldHRpbmdzKG5ld1NldHRpbmdzPzogVHJhbnNpdGlvblNldHRpbmdzKTogVHJhbnNpdGlvblNldHRpbmdzIHtcbiAgICAgICAgY29uc3Qgb2xkU2V0dGluZ3MgPSB7IC4uLnRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncyB9O1xuICAgICAgICBuZXdTZXR0aW5ncyAmJiBPYmplY3QuYXNzaWduKHRoaXMuX3RyYW5zaXRpb25TZXR0aW5ncywgbmV3U2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gb2xkU2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqIFNldCBjb21tb24gbmF2aWdhdGlvbiBzZXR0bmlncy4gKi9cbiAgICBuYXZpZ2F0aW9uU2V0dGluZ3MobmV3U2V0dGluZ3M/OiBOYXZpZ2F0aW9uU2V0dGluZ3MpOiBOYXZpZ2F0aW9uU2V0dGluZ3Mge1xuICAgICAgICBjb25zdCBvbGRTZXR0aW5ncyA9IHsgLi4udGhpcy5fbmF2aWdhdGlvblNldHRpbmdzIH07XG4gICAgICAgIG5ld1NldHRpbmdzICYmIE9iamVjdC5hc3NpZ24odGhpcy5fbmF2aWdhdGlvblNldHRpbmdzLCBuZXdTZXR0aW5ncyk7XG4gICAgICAgIHJldHVybiBvbGRTZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKiogUmVmcmVzaCByb3V0ZXIgKHNwZWNpZnkgdXBkYXRlIGxldmVsKS4gKi9cbiAgICBhc3luYyByZWZyZXNoKGxldmVsID0gUm91dGVyUmVmcmVzaExldmVsLlJFTE9BRCk6IFByb21pc2U8dGhpcz4ge1xuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlIFJvdXRlclJlZnJlc2hMZXZlbC5SRUxPQUQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ28oKTtcbiAgICAgICAgICAgIGNhc2UgUm91dGVyUmVmcmVzaExldmVsLkRPTV9DTEVBUjoge1xuICAgICAgICAgICAgICAgIHRoaXMucmVsZWFzZUNhY2hlQ29udGVudHModW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2Um91dGUgJiYgKHRoaXMuX3ByZXZSb3V0ZS5lbCA9IG51bGwhKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYHVuc3VwcG9ydGVkIGxldmVsOiAke2xldmVsfWApOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC10ZW1wbGF0ZS1leHByZXNzaW9uc1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiBzdWItZmxvd1xuXG4gICAgLyoqIEBpbnRlcm5hbCBldmFsdWF0ZSBzdWItZmxvdyBwYXJhbWV0ZXJzICovXG4gICAgcHJpdmF0ZSBldmFsdWF0ZVN1YkZsb3dQYXJhbXMoc3ViZmxvdzogUm91dGVTdWJGbG93UGFyYW1zKTogdm9pZCB7XG4gICAgICAgIGxldCBhZGRpdGlvbmFsRGlzdGFuY2UgPSAwO1xuXG4gICAgICAgIGlmIChzdWJmbG93LmJhc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VJZCA9IG5vcm1hbGl6ZUlkKHN1YmZsb3cuYmFzZSk7XG4gICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IHsgaW5kZXgsIHN0YWNrIH0gPSB0aGlzLl9oaXN0b3J5O1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpID49IDA7IGktLSwgYWRkaXRpb25hbERpc3RhbmNlKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhY2tbaV1bJ0BpZCddID09PSBiYXNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9NVkNfUk9VVEVSX0lOVkFMSURfU1VCRkxPV19CQVNFX1VSTCwgYEludmFsaWQgc3ViLWZsb3cgYmFzZSB1cmwuIFt1cmw6ICR7c3ViZmxvdy5iYXNlfV1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1YmZsb3cuYmFzZSA9IHRoaXMuY3VycmVudFJvdXRlLnVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5hc3NpZ24oc3ViZmxvdywgeyBhZGRpdGlvbmFsRGlzdGFuY2UgfSk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHN1Yi1mbG93IHBhcmFtZXRlcnMgKi9cbiAgICBwcml2YXRlIGZpbmRTdWJGbG93UGFyYW1zKGRldGFjaDogYm9vbGVhbik6IHsgZGlzdGFuY2U6IG51bWJlcjsgcGFyYW1zOiBSb3V0ZVN1YkZsb3dQYXJhbXNDb250ZXh0ICYgeyBhZGRpdGlvbmFsRGlzdGFuY2U6IG51bWJlcjsgfTsgfSB8IHZvaWQge1xuICAgICAgICBjb25zdCBzdGFjayA9IHRoaXMuX2hpc3Rvcnkuc3RhY2s7XG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFjay5sZW5ndGggLSAxLCBkaXN0YW5jZSA9IDA7IGkgPj0gMDsgaS0tLCBkaXN0YW5jZSsrKSB7XG4gICAgICAgICAgICBpZiAoc3RhY2tbaV0uc3ViZmxvdykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN0YWNrW2ldLnN1YmZsb3cgYXMgUm91dGVTdWJGbG93UGFyYW1zQ29udGV4dCAmIHsgYWRkaXRpb25hbERpc3RhbmNlOiBudW1iZXI7IH07XG4gICAgICAgICAgICAgICAgZGV0YWNoICYmIGRlbGV0ZSBzdGFja1tpXS5zdWJmbG93O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGRpc3RhbmNlLCBwYXJhbXMgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiB1dGlsc1xuXG4gICAgLyoqIEBpbnRlcm5hbCBjb21tb24gYFJvdXRlckV2ZW50QXJnYCBtYWtlciAqL1xuICAgIHByaXZhdGUgbWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCk6IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQge1xuICAgICAgICBjb25zdCBpbnRlbnQgPSBuZXdTdGF0ZS5pbnRlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdTdGF0ZS5pbnRlbnQ7IC8vIG5hdmlnYXRlIOaZguOBq+aMh+WumuOBleOCjOOBnyBpbnRlbnQg44GvIG9uZSB0aW1lIOOBruOBv+acieWKueOBq+OBmeOCi1xuXG4gICAgICAgIGNvbnN0IGZyb20gPSAob2xkU3RhdGUgPz8gdGhpcy5fbGFzdFJvdXRlKSBhcyBBY2Nlc3NpYmxlPFJvdXRlQ29udGV4dCwgc3RyaW5nPiB8IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgZGlyZWN0aW9uID0gdGhpcy5faGlzdG9yeS5kaXJlY3QobmV3U3RhdGVbJ0BpZCddLCBmcm9tPy5bJ0BpZCddKS5kaXJlY3Rpb247XG4gICAgICAgIGNvbnN0IGFzeW5jUHJvY2VzcyA9IG5ldyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCgpO1xuICAgICAgICBjb25zdCByZWxvYWQgPSBmcm9tID8gbmV3U3RhdGUudXJsID09PSBmcm9tLnVybCA6IHRydWU7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbiwgcmV2ZXJzZSB9XG4gICAgICAgICAgICA9IHRoaXMuX3N1YmZsb3dUcmFuc2l0aW9uUGFyYW1zID8/IChyZWxvYWRcbiAgICAgICAgICAgICAgICA/IHsgdHJhbnNpdGlvbjogdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLnJlbG9hZCwgcmV2ZXJzZTogZmFsc2UgfVxuICAgICAgICAgICAgICAgIDogKCdiYWNrJyAhPT0gZGlyZWN0aW9uID8gbmV3U3RhdGUgOiBmcm9tIGFzIFJvdXRlQ29udGV4dCkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByb3V0ZXI6IHRoaXMsXG4gICAgICAgICAgICBmcm9tLFxuICAgICAgICAgICAgdG86IG5ld1N0YXRlLFxuICAgICAgICAgICAgZGlyZWN0aW9uLFxuICAgICAgICAgICAgYXN5bmNQcm9jZXNzLFxuICAgICAgICAgICAgcmVsb2FkLFxuICAgICAgICAgICAgdHJhbnNpdGlvbixcbiAgICAgICAgICAgIHJldmVyc2UsXG4gICAgICAgICAgICBpbnRlbnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBmaW5kIHJvdXRlIGJ5IHVybCAqL1xuICAgIHByaXZhdGUgZmluZFJvdXRlQ29udGV4dFBhcmFtcyhwYXRoOiBzdHJpbmcpOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzIHwgdm9pZCB7XG4gICAgICAgIGNvbnN0IGtleSA9IGAvJHtub3JtYWxpemVJZChwYXRoLnNwbGl0KCc/JylbMF0pfWA7XG4gICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBPYmplY3Qua2V5cyh0aGlzLl9yb3V0ZXMpKSB7XG4gICAgICAgICAgICBjb25zdCB7IHJlZ2V4cCB9ID0gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgaWYgKHJlZ2V4cC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcm91dGVzW3BhdGhdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCB0cmlnZ2VyIHBhZ2UgZXZlbnQgKi9cbiAgICBwcml2YXRlIHRyaWdnZXJQYWdlQ2FsbGJhY2soZXZlbnQ6IFBhZ2VFdmVudCwgdGFyZ2V0OiBQYWdlIHwgdW5kZWZpbmVkLCBhcmc6IFJvdXRlIHwgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCk6IHZvaWQge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBjYW1lbGl6ZShgcGFnZS0ke2V2ZW50fWApO1xuICAgICAgICBpZiAoaXNGdW5jdGlvbigodGFyZ2V0IGFzIEFjY2Vzc2libGU8UGFnZSwgVW5rbm93bkZ1bmN0aW9uPiB8IHVuZGVmaW5lZCk/LlttZXRob2RdKSkge1xuICAgICAgICAgICAgY29uc3QgcmV0dmFsID0gKHRhcmdldCBhcyBBY2Nlc3NpYmxlPFBhZ2UsIFVua25vd25GdW5jdGlvbj4pW21ldGhvZF0oYXJnKTtcbiAgICAgICAgICAgIGlmIChyZXR2YWwgaW5zdGFuY2VvZiBOYXRpdmVQcm9taXNlICYmIChhcmcgYXMgQWNjZXNzaWJsZTxSb3V0ZT4pWydhc3luY1Byb2Nlc3MnXSkge1xuICAgICAgICAgICAgICAgIChhcmcgYXMgUm91dGVDaGFuZ2VJbmZvQ29udGV4dCkuYXN5bmNQcm9jZXNzLnJlZ2lzdGVyKHJldHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHdhaXQgZnJhbWUgKi9cbiAgICBwcml2YXRlIHdhaXRGcmFtZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIHdhaXRGcmFtZSgxLCB0aGlzLl9yYWYpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczogdHJhbnNpdGlvbiBlbnRyYW5jZVxuXG4gICAgLyoqIEBpbnRlcm5hbCBjaGFuZ2UgcGFnZSBtYWluIHByb2NlZHVyZSAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2hhbmdlUGFnZShuZXh0Um91dGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBwcmV2Um91dGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9pbkNoYW5naW5nUGFnZSA9IHRydWU7XG5cbiAgICAgICAgICAgIHBhcnNlVXJsUGFyYW1zKG5leHRSb3V0ZSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0aGlzLm1ha2VSb3V0ZUNoYW5nZUluZm8obmV4dFJvdXRlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgdGhpcy5fc3ViZmxvd1RyYW5zaXRpb25QYXJhbXMgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGNvbnN0IFtcbiAgICAgICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCxcbiAgICAgICAgICAgICAgICBwYWdlUHJldiwgJGVsUHJldixcbiAgICAgICAgICAgIF0gPSBhd2FpdCB0aGlzLnByZXBhcmVDaGFuZ2VDb250ZXh0KGNoYW5nZUluZm8pO1xuXG4gICAgICAgICAgICAvLyB0cmFuc2l0aW9uIGNvcmVcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBhd2FpdCB0aGlzLnRyYW5zaXRpb25QYWdlKHBhZ2VOZXh0LCAkZWxOZXh0LCBwYWdlUHJldiwgJGVsUHJldiwgY2hhbmdlSW5mbyk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlQ29udGV4dCgkZWxOZXh0LCAkZWxQcmV2LCBjaGFuZ2VJbmZvLCB0cmFuc2l0aW9uKTtcblxuICAgICAgICAgICAgLy8g6YG356e75YWI44GMIHN1YmZsb3cg6ZaL5aeL54K544Gn44GC44KL5aC05ZCILCBzdWJmbG93IOino+mZpFxuICAgICAgICAgICAgaWYgKG5leHRSb3V0ZS51cmwgPT09IHRoaXMuZmluZFN1YkZsb3dQYXJhbXMoZmFsc2UpPy5wYXJhbXMub3JpZ2luKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maW5kU3ViRmxvd1BhcmFtcyh0cnVlKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9oaXN0b3J5LmNsZWFyRm9yd2FyZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwcmVmZXRjaCBjb250ZW50IOOBruOCseOColxuICAgICAgICAgICAgYXdhaXQgdGhpcy50cmVhdFByZWZldGNoQ29udGVudHMoKTtcblxuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCdjaGFuZ2VkJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9pbkNoYW5naW5nUGFnZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiB0cmFuc2l0aW9uIHByZXBhcmVcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHByZXBhcmVDaGFuZ2VDb250ZXh0KGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQpOiBQcm9taXNlPFtQYWdlLCBET00sIFBhZ2UsIERPTV0+IHtcbiAgICAgICAgY29uc3QgbmV4dFJvdXRlID0gY2hhbmdlSW5mby50byBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjtcbiAgICAgICAgY29uc3QgcHJldlJvdXRlID0gY2hhbmdlSW5mby5mcm9tIGFzIEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBuZXh0UGFyYW1zIH0gPSBuZXh0Um91dGU7XG4gICAgICAgIGNvbnN0IHsgJ0BwYXJhbXMnOiBwcmV2UGFyYW1zIH0gPSBwcmV2Um91dGUgPz8ge307XG5cbiAgICAgICAgLy8gcGFnZSBpbnN0YW5jZVxuICAgICAgICBhd2FpdCBlbnN1cmVSb3V0ZXJQYWdlSW5zdGFuY2UobmV4dFJvdXRlKTtcbiAgICAgICAgLy8gcGFnZSAkdGVtcGxhdGVcbiAgICAgICAgYXdhaXQgZW5zdXJlUm91dGVyUGFnZVRlbXBsYXRlKG5leHRQYXJhbXMpO1xuXG4gICAgICAgIGNoYW5nZUluZm8uc2FtZVBhZ2VJbnN0YW5jZSA9IHByZXZQYXJhbXM/LnBhZ2UgJiYgcHJldlBhcmFtcy5wYWdlID09PSBuZXh0UGFyYW1zLnBhZ2U7XG4gICAgICAgIGNvbnN0IHsgcmVsb2FkLCBzYW1lUGFnZUluc3RhbmNlLCBhc3luY1Byb2Nlc3MgfSA9IGNoYW5nZUluZm87XG5cbiAgICAgICAgLy8gcGFnZSAkZWxcbiAgICAgICAgaWYgKCFyZWxvYWQgJiYgc2FtZVBhZ2VJbnN0YW5jZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jbG9uZUNvbnRlbnQobmV4dFJvdXRlLCBuZXh0UGFyYW1zLCBwcmV2Um91dGUhLCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICB9IGVsc2UgaWYgKCFuZXh0Um91dGUuZWwpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZENvbnRlbnQobmV4dFJvdXRlLCBuZXh0UGFyYW1zLCBjaGFuZ2VJbmZvLCBhc3luY1Byb2Nlc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGVsTmV4dCA9ICQobmV4dFJvdXRlLmVsKTtcbiAgICAgICAgY29uc3QgcGFnZU5leHQgPSBuZXh0UGFyYW1zLnBhZ2UhO1xuXG4gICAgICAgIC8vIG1vdW50XG4gICAgICAgIGlmICghJGVsTmV4dC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5tb3VudENvbnRlbnQoJGVsTmV4dCwgcGFnZU5leHQsIGNoYW5nZUluZm8sIGFzeW5jUHJvY2Vzcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHRcbiAgICAgICAgICAgIChyZWxvYWQgJiYge30gfHwgKHByZXZQYXJhbXM/LnBhZ2UgPz8ge30pKSwgKHJlbG9hZCAmJiAkKG51bGwpIHx8ICQocHJldlJvdXRlPy5lbCkpLCAvLyBwcmV2XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2xvbmVDb250ZW50KFxuICAgICAgICBuZXh0Um91dGU6IFJvdXRlQ29udGV4dCwgbmV4dFBhcmFtczogUm91dGVDb250ZXh0UGFyYW1ldGVycyxcbiAgICAgICAgcHJldlJvdXRlOiBSb3V0ZUNvbnRleHQsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgICAgIGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG5leHRSb3V0ZS5lbCA9IHByZXZSb3V0ZS5lbDtcbiAgICAgICAgcHJldlJvdXRlLmVsID0gbmV4dFJvdXRlLmVsPy5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICQocHJldlJvdXRlLmVsKS5yZW1vdmVBdHRyKCdpZCcpLmluc2VydEJlZm9yZShuZXh0Um91dGUuZWwpO1xuICAgICAgICAkKG5leHRSb3V0ZS5lbCkuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKS5yZW1vdmVDbGFzcyhbYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuUEFHRV9DVVJSRU5UfWAsIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YF0pO1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2Nsb25lZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2Nsb25lZCcsIG5leHRQYXJhbXMucGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIGxvYWRDb250ZW50KFxuICAgICAgICByb3V0ZTogUm91dGVDb250ZXh0LCBwYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnMsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgICAgIGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGxldCBmaXJlRXZlbnRzID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXJvdXRlLmVsKSB7XG4gICAgICAgICAgICBjb25zdCBlbENhY2hlID0gdGhpcy5fcm91dGVzW3JvdXRlLnBhdGhdWydAcm91dGUnXT8uZWw7XG4gICAgICAgICAgICBmaXJlRXZlbnRzID0gIWVsQ2FjaGU7XG4gICAgICAgICAgICBpZiAoZWxDYWNoZSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvbS1jYWNoZSBjYXNlXG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBlbENhY2hlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJhbXMuJHRlbXBsYXRlPy5pc0Nvbm5lY3RlZCkgeyAvLyBwcmVmZXRjaCBjYXNlXG4gICAgICAgICAgICAgICAgcm91dGUuZWwgICAgICAgICA9IHBhcmFtcy4kdGVtcGxhdGVbMF07XG4gICAgICAgICAgICAgICAgcGFyYW1zLiR0ZW1wbGF0ZSA9IHBhcmFtcy4kdGVtcGxhdGUuY2xvbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcm91dGUuZWwgPSBwYXJhbXMuJHRlbXBsYXRlIS5jbG9uZSgpWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXBkYXRlIG1hc3RlciBjYWNoZVxuICAgICAgICBpZiAocm91dGUgIT09IHRoaXMuX3JvdXRlc1tyb3V0ZS5wYXRoXVsnQHJvdXRlJ10pIHtcbiAgICAgICAgICAgIHRoaXMuX3JvdXRlc1tyb3V0ZS5wYXRoXVsnQHJvdXRlJ10gPSByb3V0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaXJlRXZlbnRzKSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2xvYWRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ2luaXQnLCBwYXJhbXMucGFnZSwgY2hhbmdlSW5mbyk7XG4gICAgICAgICAgICBhd2FpdCBhc3luY1Byb2Nlc3MuY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIG1vdW50Q29udGVudChcbiAgICAgICAgJGVsOiBET00sIHBhZ2U6IFBhZ2UgfCB1bmRlZmluZWQsXG4gICAgICAgIGNoYW5nZUluZm86IFJvdXRlQ2hhbmdlSW5mb0NvbnRleHQsXG4gICAgICAgIGFzeW5jUHJvY2VzczogUm91dGVBeW5jUHJvY2Vzc0NvbnRleHQsXG4gICAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgICRlbC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuICAgICAgICB0aGlzLl8kZWwuYXBwZW5kKCRlbCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnbW91bnRlZCcsIGNoYW5nZUluZm8pO1xuICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ21vdW50ZWQnLCBwYWdlLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgYXdhaXQgYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdW5tb3VudENvbnRlbnQocm91dGU6IFJvdXRlQ29udGV4dCk6IHZvaWQge1xuICAgICAgICBjb25zdCAkZWwgPSAkKHJvdXRlLmVsKTtcbiAgICAgICAgY29uc3QgcGFnZSA9IHJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgaWYgKCRlbC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgJGVsLmRldGFjaCgpO1xuICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bm1vdW50ZWQnLCByb3V0ZSk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3VubW91bnRlZCcsIHBhZ2UsIHJvdXRlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocm91dGUuZWwpIHtcbiAgICAgICAgICAgIHJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubG9hZGVkJywgcm91dGUpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdyZW1vdmVkJywgcGFnZSwgcm91dGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiB0cmFuc2l0aW9uIGNvcmVcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRyYW5zaXRpb25QYWdlKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBjaGFuZ2VJbmZvLnRyYW5zaXRpb24gPz8gdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzLmRlZmF1bHQ7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgJ2VudGVyLWZyb20tY2xhc3MnOiBjdXN0b21FbnRlckZyb21DbGFzcyxcbiAgICAgICAgICAgICdlbnRlci1hY3RpdmUtY2xhc3MnOiBjdXN0b21FbnRlckFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgJ2VudGVyLXRvLWNsYXNzJzogY3VzdG9tRW50ZXJUb0NsYXNzLFxuICAgICAgICAgICAgJ2xlYXZlLWZyb20tY2xhc3MnOiBjdXN0b21MZWF2ZUZyb21DbGFzcyxcbiAgICAgICAgICAgICdsZWF2ZS1hY3RpdmUtY2xhc3MnOiBjdXN0b21MZWF2ZUFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgJ2xlYXZlLXRvLWNsYXNzJzogY3VzdG9tTGVhdmVUb0NsYXNzLFxuICAgICAgICB9ID0gdGhpcy5fdHJhbnNpdGlvblNldHRpbmdzO1xuXG4gICAgICAgIC8vIGVudGVyLWNzcy1jbGFzc1xuICAgICAgICBjb25zdCBlbnRlckZyb21DbGFzcyAgID0gY3VzdG9tRW50ZXJGcm9tQ2xhc3MgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfRlJPTV9DTEFTU31gO1xuICAgICAgICBjb25zdCBlbnRlckFjdGl2ZUNsYXNzID0gY3VzdG9tRW50ZXJBY3RpdmVDbGFzcyA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuRU5URVJfQUNUSVZFX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGVudGVyVG9DbGFzcyAgICAgPSBjdXN0b21FbnRlclRvQ2xhc3MgICAgID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5FTlRFUl9UT19DTEFTU31gO1xuXG4gICAgICAgIC8vIGxlYXZlLWNzcy1jbGFzc1xuICAgICAgICBjb25zdCBsZWF2ZUZyb21DbGFzcyAgID0gY3VzdG9tTGVhdmVGcm9tQ2xhc3MgICA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfRlJPTV9DTEFTU31gO1xuICAgICAgICBjb25zdCBsZWF2ZUFjdGl2ZUNsYXNzID0gY3VzdG9tTGVhdmVBY3RpdmVDbGFzcyA/PyBgJHt0cmFuc2l0aW9ufS0ke0Nzc05hbWUuTEVBVkVfQUNUSVZFX0NMQVNTfWA7XG4gICAgICAgIGNvbnN0IGxlYXZlVG9DbGFzcyAgICAgPSBjdXN0b21MZWF2ZVRvQ2xhc3MgICAgID8/IGAke3RyYW5zaXRpb259LSR7Q3NzTmFtZS5MRUFWRV9UT19DTEFTU31gO1xuXG4gICAgICAgIGF3YWl0IHRoaXMuYmVnaW5UcmFuc2l0aW9uKFxuICAgICAgICAgICAgcGFnZU5leHQsICRlbE5leHQsIGVudGVyRnJvbUNsYXNzLCBlbnRlckFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgcGFnZVByZXYsICRlbFByZXYsIGxlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLFxuICAgICAgICAgICAgY2hhbmdlSW5mbyxcbiAgICAgICAgKTtcblxuICAgICAgICBhd2FpdCB0aGlzLndhaXRGcmFtZSgpO1xuXG4gICAgICAgIC8vIHRyYW5zaXNpb24gZXhlY3V0aW9uXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIHByb2Nlc3NQYWdlVHJhbnNpdGlvbigkZWxOZXh0LCBlbnRlckZyb21DbGFzcywgZW50ZXJBY3RpdmVDbGFzcywgZW50ZXJUb0NsYXNzKSxcbiAgICAgICAgICAgIHByb2Nlc3NQYWdlVHJhbnNpdGlvbigkZWxQcmV2LCBsZWF2ZUZyb21DbGFzcywgbGVhdmVBY3RpdmVDbGFzcywgbGVhdmVUb0NsYXNzKSxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgYXdhaXQgdGhpcy53YWl0RnJhbWUoKTtcblxuICAgICAgICBhd2FpdCB0aGlzLmVuZFRyYW5zaXRpb24oXG4gICAgICAgICAgICBwYWdlTmV4dCwgJGVsTmV4dCxcbiAgICAgICAgICAgIHBhZ2VQcmV2LCAkZWxQcmV2LFxuICAgICAgICAgICAgY2hhbmdlSW5mbyxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gdHJhbnNpdGlvbjtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHRyYW5zaXRpb24gcHJvYyA6IGJlZ2luICovXG4gICAgcHJpdmF0ZSBhc3luYyBiZWdpblRyYW5zaXRpb24oXG4gICAgICAgIHBhZ2VOZXh0OiBQYWdlLCAkZWxOZXh0OiBET00sIGVudGVyRnJvbUNsYXNzOiBzdHJpbmcsIGVudGVyQWN0aXZlQ2xhc3M6IHN0cmluZyxcbiAgICAgICAgcGFnZVByZXY6IFBhZ2UsICRlbFByZXY6IERPTSwgbGVhdmVGcm9tQ2xhc3M6IHN0cmluZywgbGVhdmVBY3RpdmVDbGFzczogc3RyaW5nLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLl8kZWwuYWRkQ2xhc3MoW1xuICAgICAgICAgICAgYCR7dGhpcy5fY3NzUHJlZml4fS0ke0Nzc05hbWUuVFJBTlNJVElPTl9SVU5OSU5HfWAsXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX0RJUkVDVElPTn0tJHtkZWNpZGVUcmFuc2l0aW9uRGlyZWN0aW9uKGNoYW5nZUluZm8pfWAsXG4gICAgICAgIF0pO1xuXG4gICAgICAgICRlbE5leHRcbiAgICAgICAgICAgIC5hZGRDbGFzcyhbZW50ZXJGcm9tQ2xhc3MsIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fUlVOTklOR31gXSlcbiAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbicpXG4gICAgICAgICAgICAucmVmbG93KClcbiAgICAgICAgICAgIC5hZGRDbGFzcyhlbnRlckFjdGl2ZUNsYXNzKVxuICAgICAgICA7XG4gICAgICAgICRlbFByZXYuYWRkQ2xhc3MoW2xlYXZlRnJvbUNsYXNzLCBsZWF2ZUFjdGl2ZUNsYXNzLCBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMucHVibGlzaCgnYmVmb3JlLXRyYW5zaXRpb24nLCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdiZWZvcmUtbGVhdmUnLCBwYWdlUHJldiwgY2hhbmdlSW5mbyk7XG4gICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygnYmVmb3JlLWVudGVyJywgcGFnZU5leHQsIGNoYW5nZUluZm8pO1xuICAgICAgICBhd2FpdCBjaGFuZ2VJbmZvLmFzeW5jUHJvY2Vzcy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgdHJhbnNpdGlvbiBwcm9jIDogZW5kICovXG4gICAgcHJpdmF0ZSBhc3luYyBlbmRUcmFuc2l0aW9uKFxuICAgICAgICBwYWdlTmV4dDogUGFnZSwgJGVsTmV4dDogRE9NLFxuICAgICAgICBwYWdlUHJldjogUGFnZSwgJGVsUHJldjogRE9NLFxuICAgICAgICBjaGFuZ2VJbmZvOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAoJGVsTmV4dFswXSAhPT0gJGVsUHJldlswXSkgJiYgJGVsUHJldi5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuICAgICAgICAkZWxOZXh0LnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuICAgICAgICAkZWxQcmV2LnJlbW92ZUNsYXNzKFtgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YF0pO1xuXG4gICAgICAgIHRoaXMuXyRlbC5yZW1vdmVDbGFzcyhbXG4gICAgICAgICAgICBgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5UUkFOU0lUSU9OX1JVTk5JTkd9YCxcbiAgICAgICAgICAgIGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlRSQU5TSVRJT05fRElSRUNUSU9OfS0ke2RlY2lkZVRyYW5zaXRpb25EaXJlY3Rpb24oY2hhbmdlSW5mbyl9YCxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1sZWF2ZScsIHBhZ2VQcmV2LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyUGFnZUNhbGxiYWNrKCdhZnRlci1lbnRlcicsIHBhZ2VOZXh0LCBjaGFuZ2VJbmZvKTtcbiAgICAgICAgdGhpcy5wdWJsaXNoKCdhZnRlci10cmFuc2l0aW9uJywgY2hhbmdlSW5mbyk7XG4gICAgICAgIGF3YWl0IGNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiB0cmFuc2l0aW9uIGZpbmFsaXplXG5cbiAgICAvKiogQGludGVybmFsIHVwZGF0ZSBwYWdlIHN0YXR1cyBhZnRlciB0cmFuc2l0aW9uICovXG4gICAgcHJpdmF0ZSB1cGRhdGVDaGFuZ2VDb250ZXh0KFxuICAgICAgICAkZWxOZXh0OiBET00sXG4gICAgICAgICRlbFByZXY6IERPTSxcbiAgICAgICAgY2hhbmdlSW5mbzogUm91dGVDaGFuZ2VJbmZvQ29udGV4dCxcbiAgICAgICAgdHJhbnNpdGlvbjogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICk6IHZvaWQge1xuICAgICAgICBjb25zdCB7IGZyb20sIHJlbG9hZCwgc2FtZVBhZ2VJbnN0YW5jZSwgZGlyZWN0aW9uLCB0byB9ID0gY2hhbmdlSW5mbztcbiAgICAgICAgY29uc3QgcHJldlJvdXRlID0gZnJvbSBhcyBSb3V0ZUNvbnRleHQ7XG4gICAgICAgIGNvbnN0IG5leHRSb3V0ZSA9IHRvIGFzIFJvdXRlQ29udGV4dDtcbiAgICAgICAgY29uc3QgdXJsQ2hhbmdlZCA9ICFyZWxvYWQ7XG5cblxuICAgICAgICBpZiAoJGVsTmV4dFswXSAhPT0gJGVsUHJldlswXSkge1xuICAgICAgICAgICAgLy8gdXBkYXRlIGNsYXNzXG4gICAgICAgICAgICAkZWxQcmV2XG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgJHt0aGlzLl9jc3NQcmVmaXh9LSR7Q3NzTmFtZS5QQUdFX1BSRVZJT1VTfWApXG4gICAgICAgICAgICA7XG4gICAgICAgICAgICAkZWxOZXh0LmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfQ1VSUkVOVH1gKTtcblxuICAgICAgICAgICAgaWYgKHVybENoYW5nZWQgJiYgdGhpcy5fcHJldlJvdXRlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlLmVsPy5jbGFzc0xpc3QucmVtb3ZlKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmVhdERvbUNhY2hlQ29udGVudHMobmV4dFJvdXRlLCB0aGlzLl9wcmV2Um91dGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVybENoYW5nZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZSb3V0ZSA9IHByZXZSb3V0ZTtcbiAgICAgICAgICAgIGlmIChzYW1lUGFnZUluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgJGVsUHJldi5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICAkZWxOZXh0LmFkZENsYXNzKGAke3RoaXMuX2Nzc1ByZWZpeH0tJHtDc3NOYW1lLlBBR0VfUFJFVklPVVN9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlJvdXRlICYmICh0aGlzLl9wcmV2Um91dGUuZWwgPSBudWxsISk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9sYXN0Um91dGUgPSB0aGlzLmN1cnJlbnRSb3V0ZSBhcyBSb3V0ZUNvbnRleHQ7XG4gICAgICAgICdmb3J3YXJkJyA9PT0gZGlyZWN0aW9uICYmIHRyYW5zaXRpb24gJiYgKHRoaXMuX2xhc3RSb3V0ZS50cmFuc2l0aW9uID0gdHJhbnNpdGlvbik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOiBwcmVmZXRjaCAmIGRvbSBjYWNoZVxuXG4gICAgLyoqIEBpbnRlcm5hbCB1bnNldCBkb20gY2FjaGVkIGNvbnRlbnRzICovXG4gICAgcHJpdmF0ZSByZWxlYXNlQ2FjaGVDb250ZW50cyhlbDogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModGhpcy5fcm91dGVzKSkge1xuICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0aGlzLl9yb3V0ZXNba2V5XVsnQHJvdXRlJ10gYXMgUm91dGVDb250ZXh0IHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHJvdXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG51bGwgPT0gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bm1vdW50Q29udGVudChyb3V0ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyb3V0ZS5lbCA9PT0gZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuZWwgPSBudWxsITtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiB0aGlzLl9oaXN0b3J5LnN0YWNrKSB7XG4gICAgICAgICAgICBpZiAoKG51bGwgPT0gZWwgJiYgcm91dGUuZWwpIHx8IHJvdXRlLmVsID09PSBlbCkge1xuICAgICAgICAgICAgICAgIHJvdXRlLmVsID0gbnVsbCE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGRlc3RydWN0aW9uIG9mIGRvbSBhY2NvcmRpbmcgdG8gY29uZGl0aW9uICovXG4gICAgcHJpdmF0ZSB0cmVhdERvbUNhY2hlQ29udGVudHMobmV4dFJvdXRlOiBSb3V0ZUNvbnRleHQsIHByZXZSb3V0ZTogUm91dGVDb250ZXh0KTogdm9pZCB7XG4gICAgICAgIGlmIChwcmV2Um91dGUuZWwgJiYgcHJldlJvdXRlLmVsICE9PSB0aGlzLmN1cnJlbnRSb3V0ZS5lbCkge1xuICAgICAgICAgICAgY29uc3QgJGVsID0gJChwcmV2Um91dGUuZWwpO1xuICAgICAgICAgICAgY29uc3QgY2FjaGVMdiA9ICRlbC5kYXRhKERvbUNhY2hlLkRBVEFfTkFNRSk7XG4gICAgICAgICAgICBpZiAoRG9tQ2FjaGUuQ0FDSEVfTEVWRUxfQ09OTkVDVCAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2UgPSBwcmV2Um91dGVbJ0BwYXJhbXMnXS5wYWdlO1xuICAgICAgICAgICAgICAgICRlbC5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaXJlRXZlbnRzID0gcHJldlJvdXRlWydAcGFyYW1zJ10ucGFnZSAhPT0gbmV4dFJvdXRlWydAcGFyYW1zJ10ucGFnZTtcbiAgICAgICAgICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ3VubW91bnRlZCcsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlclBhZ2VDYWxsYmFjaygndW5tb3VudGVkJywgcGFnZSwgcHJldlJvdXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKERvbUNhY2hlLkNBQ0hFX0xFVkVMX01FTU9SWSAhPT0gY2FjaGVMdikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbGVhc2VDYWNoZUNvbnRlbnRzKHByZXZSb3V0ZS5lbCk7XG4gICAgICAgICAgICAgICAgICAgIHByZXZSb3V0ZS5lbCA9IG51bGwhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlyZUV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoKCd1bmxvYWRlZCcsIHByZXZSb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJQYWdlQ2FsbGJhY2soJ3JlbW92ZWQnLCBwYWdlLCBwcmV2Um91dGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBzZXQgZG9tIHByZWZldGNoZWQgY29udGVudHMgKi9cbiAgICBwcml2YXRlIGFzeW5jIHNldFByZWZldGNoQ29udGVudHMocGFyYW1zOiBSb3V0ZUNvbnRleHRQYXJhbWV0ZXJzW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdG9Sb3V0ZSA9IChwYXJhbTogUm91dGVDb250ZXh0UGFyYW1ldGVycywgZWw6IEhUTUxFbGVtZW50KTogUm91dGVDb250ZXh0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRvUm91dGVDb250ZXh0KHBhcmFtLnByZWZldGNoISwgdGhpcywgcGFyYW0pO1xuICAgICAgICAgICAgY3R4LmVsID0gZWw7XG4gICAgICAgICAgICByZXR1cm4gY3R4O1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvUm91dGVDaGFuZ2VJbmZvID0gKHJvdXRlOiBSb3V0ZUNvbnRleHQpOiBSb3V0ZUNoYW5nZUluZm9Db250ZXh0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcm91dGVyOiB0aGlzLFxuICAgICAgICAgICAgICAgIHRvOiByb3V0ZSxcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb246ICdub25lJyxcbiAgICAgICAgICAgICAgICBhc3luY1Byb2Nlc3M6IG5ldyBSb3V0ZUF5bmNQcm9jZXNzQ29udGV4dCgpLFxuICAgICAgICAgICAgICAgIHJlbG9hZDogZmFsc2UsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1zKSB7XG4gICAgICAgICAgICBjb25zdCBlbFJvdXRlID0gcGFyYW1bJ0Byb3V0ZSddPy5lbDtcbiAgICAgICAgICAgIGlmICghZWxSb3V0ZSB8fCAodGhpcy5jdXJyZW50Um91dGUuZWwgIT09IGVsUm91dGUgJiYgdGhpcy5fbGFzdFJvdXRlPy5lbCAhPT0gZWxSb3V0ZSAmJiB0aGlzLl9wcmV2Um91dGU/LmVsICE9PSBlbFJvdXRlKSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VUZW1wbGF0ZShwYXJhbSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZWwgPSBwYXJhbS4kdGVtcGxhdGUhWzBdO1xuICAgICAgICAgICAgICAgIGlmICghZWwuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSB0b1JvdXRlKHBhcmFtLCBlbCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVuc3VyZVJvdXRlclBhZ2VJbnN0YW5jZShyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5nZUluZm8gPSB0b1JvdXRlQ2hhbmdlSW5mbyhyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYXN5bmNQcm9jZXNzIH0gPSBjaGFuZ2VJbmZvO1xuICAgICAgICAgICAgICAgICAgICAvLyBsb2FkICYgaW5pdFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRDb250ZW50KHJvdXRlLCBwYXJhbSwgY2hhbmdlSW5mbywgYXN5bmNQcm9jZXNzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gbW91bnRcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5tb3VudENvbnRlbnQoJChlbCksIHBhcmFtLnBhZ2UsIGNoYW5nZUluZm8sIGFzeW5jUHJvY2Vzcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqIEBpbnRlcm5hbCBsb2FkIHByZWZldGNoIGRvbSBjb250ZW50cyAqL1xuICAgIHByaXZhdGUgYXN5bmMgdHJlYXRQcmVmZXRjaENvbnRlbnRzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAvLyDpgbfnp7vlhYjjgYvjgokgcHJlZmV0Y2ggY29udGVudCDjgpLmpJzlh7pcbiAgICAgICAgY29uc3QgcHJlZmV0Y2hQYXJhbXM6IFJvdXRlQ29udGV4dFBhcmFtZXRlcnNbXSA9IFtdO1xuICAgICAgICBjb25zdCB0YXJnZXRzID0gdGhpcy5jdXJyZW50Um91dGUuZWw/LnF1ZXJ5U2VsZWN0b3JBbGwoYFtkYXRhLSR7TGlua0RhdGEuUFJFRkVUQ0h9XWApID8/IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsIG9mIHRhcmdldHMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoZWwpO1xuICAgICAgICAgICAgaWYgKGZhbHNlICE9PSAkZWwuZGF0YShMaW5rRGF0YS5QUkVGRVRDSCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSAkZWwuYXR0cignaHJlZicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZmluZFJvdXRlQ29udGV4dFBhcmFtcyh1cmwhKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5wcmVmZXRjaCA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgcHJlZmV0Y2hQYXJhbXMucHVzaChwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNldFByZWZldGNoQ29udGVudHMocHJlZmV0Y2hQYXJhbXMpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGV2ZW50IGhhbmRsZXJzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCBgaGlzdG9yeWAgYGNoYW5naW5nYCBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkhpc3RvcnlDaGFuZ2luZyhuZXh0U3RhdGU6IEhpc3RvcnlTdGF0ZTxSb3V0ZUNvbnRleHQ+LCBjYW5jZWw6IChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkLCBwcm9taXNlczogUHJvbWlzZTx1bmtub3duPltdKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9pbkNoYW5naW5nUGFnZSkge1xuICAgICAgICAgICAgY2FuY2VsKG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfTVZDX1JPVVRFUl9CVVNZKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2hhbmdlSW5mbyA9IHRoaXMubWFrZVJvdXRlQ2hhbmdlSW5mbyhuZXh0U3RhdGUsIHVuZGVmaW5lZCk7XG4gICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1jaGFuZ2UnLCBjaGFuZ2VJbmZvLCBjYW5jZWwpO1xuICAgICAgICBwcm9taXNlcy5wdXNoKC4uLmNoYW5nZUluZm8uYXN5bmNQcm9jZXNzLnByb21pc2VzKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGBoaXN0b3J5YCBgcmVmcmVzaGAgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IaXN0b3J5UmVmcmVzaChuZXdTdGF0ZTogSGlzdG9yeVN0YXRlPFBhcnRpYWw8Um91dGVDb250ZXh0Pj4sIG9sZFN0YXRlOiBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PiB8IHVuZGVmaW5lZCwgcHJvbWlzZXM6IFByb21pc2U8dW5rbm93bj5bXSk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbnN1cmUgPSAoc3RhdGU6IEhpc3RvcnlTdGF0ZTxQYXJ0aWFsPFJvdXRlQ29udGV4dD4+KTogSGlzdG9yeVN0YXRlPFJvdXRlQ29udGV4dD4gPT4ge1xuICAgICAgICAgICAgY29uc3QgcGF0aCAgPSBgLyR7c3RhdGVbJ0BpZCddfWA7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZpbmRSb3V0ZUNvbnRleHRQYXJhbXMocGF0aCk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfUk9VVEVfQ0FOTk9UX0JFX1JFU09MVkVELCBgUm91dGUgY2Fubm90IGJlIHJlc29sdmVkLiBbcGF0aDogJHtwYXRofV1gLCBzdGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBzdGF0ZVsnQHBhcmFtcyddKSB7XG4gICAgICAgICAgICAgICAgLy8gUm91dGVDb250ZXh0UGFyYW1ldGVyIOOCkiBhc3NpZ25cbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHN0YXRlLCB0b1JvdXRlQ29udGV4dChwYXRoLCB0aGlzLCBwYXJhbXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3RhdGUuZWwpIHtcbiAgICAgICAgICAgICAgICAvLyBpZCDjgavntJDjgaXjgY/opoHntKDjgYzjgZnjgafjgavlrZjlnKjjgZnjgovloLTlkIjjga/libLjgorlvZPjgaZcbiAgICAgICAgICAgICAgICBzdGF0ZS5lbCA9IHRoaXMuX2hpc3RvcnkuZGlyZWN0KHN0YXRlWydAaWQnXSk/LnN0YXRlPy5lbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdGF0ZSBhcyBIaXN0b3J5U3RhdGU8Um91dGVDb250ZXh0PjtcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gc2NoZWR1bGluZyBgcmVmcmVzaGAgZG9uZS5cbiAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5jaGFuZ2VQYWdlKGVuc3VyZShuZXdTdGF0ZSksIG9sZFN0YXRlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRoaXMub25IYW5kbGVFcnJvcihlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBAaW50ZXJuYWwgZXJyb3IgaGFuZGxlciAqL1xuICAgIHByaXZhdGUgb25IYW5kbGVFcnJvcihlcnJvcjogdW5rbm93bik6IHZvaWQge1xuICAgICAgICB0aGlzLnB1Ymxpc2goXG4gICAgICAgICAgICAnZXJyb3InLFxuICAgICAgICAgICAgaXNSZXN1bHQoZXJyb3IpID8gZXJyb3IgOiBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX01WQ19ST1VURVJfTkFWSUdBVEVfRkFJTEVELCAnUm91dGUgbmF2aWdhdGUgZmFpbGVkLicsIGVycm9yKVxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIGFuY2hvciBjbGljayBoYW5kbGVyICovXG4gICAgcHJpdmF0ZSBvbkFuY2hvckNsaWNrZWQoZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0IGFzIEVsZW1lbnQpLmNsb3Nlc3QoJ1tocmVmXScpO1xuICAgICAgICBpZiAoJHRhcmdldC5kYXRhKExpbmtEYXRhLlBSRVZFTlRfUk9VVEVSKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBjb25zdCB1cmwgICAgICAgID0gJHRhcmdldC5hdHRyKCdocmVmJyk7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSAkdGFyZ2V0LmRhdGEoTGlua0RhdGEuVFJBTlNJVElPTikgYXMgc3RyaW5nO1xuICAgICAgICBjb25zdCBtZXRob2QgICAgID0gJHRhcmdldC5kYXRhKExpbmtEYXRhLk5BVklBR0FURV9NRVRIT0QpIGFzIHN0cmluZztcbiAgICAgICAgY29uc3QgbWV0aG9kT3B0cyA9ICgncHVzaCcgPT09IG1ldGhvZCB8fCAncmVwbGFjZScgPT09IG1ldGhvZCA/IHsgbWV0aG9kIH0gOiB7fSkgYXMgTmF2aWdhdGlvblNldHRpbmdzO1xuXG4gICAgICAgIGlmICgnIycgPT09IHVybCkge1xuICAgICAgICAgICAgdm9pZCB0aGlzLmJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZvaWQgdGhpcy5uYXZpZ2F0ZSh1cmwhLCB7IHRyYW5zaXRpb24sIC4uLm1ldGhvZE9wdHMgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogQGludGVybmFsIHNpbGVudCBldmVudCBsaXN0bmVyIHNjb3BlICovXG4gICAgcHJpdmF0ZSBhc3luYyBzdXBwcmVzc0V2ZW50TGlzdGVuZXJTY29wZShleGVjdXRvcjogKCkgPT4gUHJvbWlzZTx1bmtub3duPik6IFByb21pc2U8dW5rbm93bj4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ2NoYW5naW5nJywgdGhpcy5faGlzdG9yeUNoYW5naW5nSGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLl9oaXN0b3J5Lm9mZigncmVmcmVzaCcsICB0aGlzLl9oaXN0b3J5UmVmcmVzaEhhbmRsZXIpO1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vZmYoJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBleGVjdXRvcigpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5faGlzdG9yeS5vbignY2hhbmdpbmcnLCB0aGlzLl9oaXN0b3J5Q2hhbmdpbmdIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ3JlZnJlc2gnLCAgdGhpcy5faGlzdG9yeVJlZnJlc2hIYW5kbGVyKTtcbiAgICAgICAgICAgIHRoaXMuX2hpc3Rvcnkub24oJ2Vycm9yJywgICAgdGhpcy5fZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENyZWF0ZSB7QGxpbmsgUm91dGVyfSBvYmplY3QuXG4gKiBAamEge0BsaW5rIFJvdXRlcn0g44Kq44OW44K444Kn44Kv44OI44KS5qeL56+JXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIEFuIG9iamVjdCBvciB0aGUgc2VsZWN0b3Igc3RyaW5nIHdoaWNoIGJlY29tZXMgb3JpZ2luIG9mIHtAbGluayBET019LlxuICogIC0gYGphYCB7QGxpbmsgRE9NfSDjga7jgoLjgajjgavjgarjgovjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga/jgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHtAbGluayBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zfSBvYmplY3RcbiAqICAtIGBqYWAge0BsaW5rIFJvdXRlckNvbnN0cnVjdGlvbk9wdGlvbnN9IOOCquODluOCuOOCp+OCr+ODiFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyKHNlbGVjdG9yOiBET01TZWxlY3RvcjxzdHJpbmcgfCBIVE1MRWxlbWVudD4sIG9wdGlvbnM/OiBSb3V0ZXJDb25zdHJ1Y3Rpb25PcHRpb25zKTogUm91dGVyIHtcbiAgICByZXR1cm4gbmV3IFJvdXRlckNvbnRleHQoc2VsZWN0b3IsIE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBzdGFydDogdHJ1ZSxcbiAgICB9LCBvcHRpb25zKSk7XG59XG4iXSwibmFtZXMiOlsic2FmZSIsIkRlZmVycmVkIiwiYXQiLCJzb3J0Iiwibm9vcCIsIndlYlJvb3QiLCIkY2RwIiwiaXNPYmplY3QiLCIkc2lnbmF0dXJlIiwiRXZlbnRQdWJsaXNoZXIiLCJ0b0lkIiwidG9VcmwiLCJDYW5jZWxUb2tlbiIsInBvc3QiLCJpc0FycmF5IiwicGF0aDJyZWdleHAiLCJpc1N0cmluZyIsInRvUXVlcnlTdHJpbmdzIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwicGFyc2VVcmxRdWVyeSIsImFzc2lnblZhbHVlIiwiY29udmVydFVybFBhcmFtVHlwZSIsImlzRnVuY3Rpb24iLCIkIiwidG9UZW1wbGF0ZUVsZW1lbnQiLCJsb2FkVGVtcGxhdGVT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